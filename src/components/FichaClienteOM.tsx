import React, { useState, useMemo } from 'react'
import {
  ShieldCheck,
  Calendar,
  FileText,
  User,
  Zap,
  Activity,
  MapPin,
  CalendarClock,
  Sparkles,
  Pencil,
  Check,
  X,
  Loader2,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import {
  formatCurrency,
  formatDate,
  maskCurrencyBRL,
  parseCurrencyBRL,
  formatCurrencyBRL,
} from '@/lib/formatters'
import type { OMPlanoTipo, OMStatusPlano, PropostaOM } from '@/types/crm'
import { ModalGerarProcuracaoOM } from './ModalGerarProcuracaoOM'
import { ModalGerarContratoOM } from './ModalGerarContratoOM'
import { toast } from 'sonner'

interface FichaClienteOMProps {
  clienteId: string
  onNavigateToTab?: (tab: 'historico' | 'projeto' | 'om' | 'usinas' | 'whatsapp') => void
}

export const FichaClienteOM: React.FC<FichaClienteOMProps> = ({ clienteId, onNavigateToTab }) => {
  const {
    clientes,
    sistemas,
    contratosOM,
    propostasOM,
    addContratoOM,
    updateContratoOM,
    updatePropostaOM,
    addAtividade,
  } = useClientes()

  // Modais de Procuração e Contrato O&M
  const [modalProcuracaoOpen, setModalProcuracaoOpen] = useState(false)
  const [modalContratoOpen, setModalContratoOpen] = useState(false)

  // Edição inline do Valor Mensal
  const [isEditingValorMensal, setIsEditingValorMensal] = useState(false)
  const [editValorMensalInput, setEditValorMensalInput] = useState('')
  const [isSavingValorMensal, setIsSavingValorMensal] = useState(false)

  // Edição inline do Plano
  const [isEditingPlano, setIsEditingPlano] = useState(false)
  const [editPlanoSelecionado, setEditPlanoSelecionado] = useState<OMPlanoTipo>('Essencial')
  const [isSavingPlano, setIsSavingPlano] = useState(false)

  // Modal Oferecer / Criar Contrato de Plano
  const [modalOferecerPlano, setModalOferecerPlano] = useState(false)
  const [novoPlanoTipo, setNovoPlanoTipo] = useState<OMPlanoTipo>('Essencial')
  const [novoPlanoValorMensal, setNovoPlanoValorMensal] = useState<number>(190)
  const [novoPlanoObs, setNovoPlanoObs] = useState('')

  const cliente = useMemo(() => {
    return clientes.find((c) => c.id === clienteId) || null
  }, [clientes, clienteId])

  const sistema = useMemo(() => {
    return sistemas.find((s) => s.cliente_id === clienteId) || null
  }, [sistemas, clienteId])

  const todosContratosCliente = useMemo(() => {
    return contratosOM.filter((c) => c.cliente_id === clienteId)
  }, [contratosOM, clienteId])

  // Propostas O&M do cliente
  const propostasCliente = useMemo(() => {
    return (propostasOM || [])
      .filter((p) => p.cliente_id === clienteId)
      .sort(
        (a, b) =>
          new Date(b.data_proposta || b.created).getTime() -
          new Date(a.data_proposta || a.created).getTime(),
      )
  }, [propostasOM, clienteId])

  // Proposta O&M aprovada / fechada
  const propostaAprovada = useMemo<PropostaOM | null>(() => {
    return (
      propostasCliente.find((p) => {
        const s = (p.status || '').toLowerCase().trim()
        return s === 'aprovado' || s === 'aprovada' || s === 'fechado' || s === 'fechada'
      }) || null
    )
  }, [propostasCliente])

  // Proposta O&M ativa de referência (aprovada/fechada tem prioridade, com fallback para mais recente)
  const propostaAtiva = useMemo<PropostaOM | null>(() => {
    return propostaAprovada || propostasCliente[0] || null
  }, [propostaAprovada, propostasCliente])

  const contrato = useMemo(() => {
    return (
      todosContratosCliente.find(
        (c) =>
          c.status !== 'Encerrado' &&
          c.status !== 'Cancelado' &&
          c.status_encerramento !== 'encerrado',
      ) || null
    )
  }, [todosContratosCliente])

  const contratosHistorico = useMemo(() => {
    return todosContratosCliente.filter((c) => c.id !== contrato?.id)
  }, [todosContratosCliente, contrato?.id])

  if (!cliente) return null

  // Cálculos de dias até vencimento
  const diasAteVencimento = contrato?.data_vencimento
    ? Math.ceil(
        (new Date(contrato.data_vencimento).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0

  const getPlanoColor = (plano?: OMPlanoTipo) => {
    switch (plano) {
      case 'Completo':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Prevenção':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Essencial':
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    }
  }

  // Contratar / Oferecer Plano
  const handleOferecerPlano = async (e: React.FormEvent) => {
    e.preventDefault()
    const hoje = new Date()
    const vencimento = new Date()
    vencimento.setFullYear(vencimento.getFullYear() + 1)

    const valorMensal = Number(novoPlanoValorMensal) || 190
    const valorAnual = valorMensal * 12

    await addContratoOM({
      cliente_id: cliente.id,
      plano: novoPlanoTipo,
      status: 'Ativo',
      valor_mensal: valorMensal,
      valor_anual: valorAnual,
      data_inicio: hoje.toISOString(),
      data_vencimento: vencimento.toISOString(),
      servicos_realizados: [],
      servicos_agendados: [
        'Monitoramento da geração em horários comerciais',
        'Relatório mensal de desempenho',
      ],
      proxima_atividade_titulo: `Inspeção e monitoramento inicial - Plano ${novoPlanoTipo}`,
      proxima_atividade_data: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      observacoes: novoPlanoObs.trim(),
    })

    try {
      await addAtividade({
        cliente_id: cliente.id,
        tipo: 'proposta',
        titulo: `Contratação do Plano O&M ${novoPlanoTipo}`,
        descricao: `Plano ativado no valor de ${formatCurrency(valorMensal)}/mês (${formatCurrency(
          valorAnual,
        )}/ano) com vigência de 12 meses.`,
        data: hoje.toISOString(),
        status: 'concluida',
        autor: 'Equipe Comercial O&M',
      })
    } catch {
      /* intentionally ignored */
    }

    setModalOferecerPlano(false)
  }

  const potenciaExibida = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0
  const dataInstalacaoExibida = sistema?.data_instalacao || cliente.data_instalacao || ''

  // Valores financeiros sincronizados (Proposta O&M ativa com fallback para Contrato O&M)
  const valorMensalExibido = propostaAtiva?.valor_mensal_plano ?? contrato?.valor_mensal ?? 0

  const valorAnualExibido =
    propostaAtiva?.valor_anual_plano ??
    (propostaAtiva?.valor_mensal_plano
      ? Math.round(propostaAtiva.valor_mensal_plano * 12 * 100) / 100
      : (contrato?.valor_anual ?? 0))

  // Plano atualmente exibido (Proposta O&M ativa com fallback para Contrato O&M)
  const planoExibido: OMPlanoTipo =
    (propostaAtiva?.plano_escolhido as OMPlanoTipo) || contrato?.plano || 'Essencial'

  // Iniciar edição inline do Plano
  const handleStartEditPlano = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditPlanoSelecionado(planoExibido)
    setIsEditingPlano(true)
  }

  // Cancelar edição inline do Plano
  const handleCancelEditPlano = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setIsEditingPlano(false)
    setEditPlanoSelecionado(planoExibido)
  }

  // Salvar novo plano com sincronização entre proposta e contrato
  const handleSavePlano = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (isSavingPlano) return

    const novoPlano = editPlanoSelecionado

    try {
      setIsSavingPlano(true)

      const promises: Promise<unknown>[] = []

      // 1. Atualizar propostaAtiva se existir
      if (propostaAtiva) {
        promises.push(
          updatePropostaOM(propostaAtiva.id, {
            plano_escolhido: novoPlano,
          }),
        )
      }

      // 2. Sincronizar contrato ativo se existir
      if (contrato) {
        promises.push(
          updateContratoOM(contrato.id, {
            plano: novoPlano,
          }),
        )
      }

      if (promises.length === 0) {
        toast.info('Nenhuma proposta ou contrato ativo para atualizar.')
        setIsEditingPlano(false)
        return
      }

      await Promise.all(promises)
      toast.success(`Plano O&M atualizado para ${novoPlano}.`)
      setIsEditingPlano(false)
    } catch (err: unknown) {
      console.error('Erro ao atualizar plano O&M:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar novo plano O&M.')
    } finally {
      setIsSavingPlano(false)
    }
  }

  // Iniciar edição inline do Valor Mensal
  const handleStartEditValorMensal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setEditValorMensalInput(formatCurrencyBRL(valorMensalExibido))
    setIsEditingValorMensal(true)
  }

  // Cancelar edição inline
  const handleCancelEditValorMensal = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setIsEditingValorMensal(false)
    setEditValorMensalInput('')
  }

  // Salvar novo valor mensal com sincronização
  const handleSaveValorMensal = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (isSavingValorMensal) return

    const novoValor = parseCurrencyBRL(editValorMensalInput)
    const novoValorAnual = Math.round(novoValor * 12 * 100) / 100

    try {
      setIsSavingValorMensal(true)

      const promises: Promise<unknown>[] = []

      // 1. Atualizar propostaAtiva se existir
      if (propostaAtiva) {
        promises.push(
          updatePropostaOM(propostaAtiva.id, {
            valor_mensal_plano: novoValor,
            valor_anual_plano: novoValorAnual,
          }),
        )
      }

      // 2. Sincronizar contrato ativo se existir
      if (contrato) {
        promises.push(
          updateContratoOM(contrato.id, {
            valor_mensal: novoValor,
            valor_anual: novoValorAnual,
          }),
        )
      }

      if (promises.length === 0) {
        toast.info('Nenhuma proposta ou contrato ativo para atualizar.')
        setIsEditingValorMensal(false)
        return
      }

      await Promise.all(promises)
      toast.success(
        `Valor mensal atualizado para ${formatCurrencyBRL(novoValor)} (${formatCurrencyBRL(novoValorAnual)}/ano).`,
      )
      setIsEditingValorMensal(false)
    } catch (err: unknown) {
      console.error('Erro ao atualizar valor mensal O&M:', err)
      toast.error(
        err instanceof Error ? err.message : 'Erro ao salvar novo valor mensal do plano O&M.',
      )
    } finally {
      setIsSavingValorMensal(false)
    }
  }

  // Determinar status do plano
  type StatusExibicao = OMStatusPlano | 'Sem contrato'
  const statusPlano: StatusExibicao = contrato
    ? diasAteVencimento < 0
      ? 'Vencido'
      : diasAteVencimento <= 30
        ? 'Vencendo em 30 dias'
        : 'Ativo'
    : 'Sem contrato'

  const getStatusPlanoBadge = (status: StatusExibicao) => {
    switch (status) {
      case 'Ativo':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Ativo
          </span>
        )
      case 'Vencendo em 30 dias':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            Vencendo em 30 dias
          </span>
        )
      case 'Vencido':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            Vencido
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            Sem contrato
          </span>
        )
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* 1. DADOS INICIAIS DO CLIENTE */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <User className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                Ficha O&M do Cliente
              </span>
              <h3 className="text-base font-bold text-gray-900">{cliente.nome}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusPlanoBadge(statusPlano)}
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('historico')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors shadow-2xs"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Editar Dados</span>
              </button>
            )}
          </div>
        </div>

        {/* Grade com dados cadastrais e técnicos iniciais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200/70 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-gray-400" />
              Cidade
            </span>
            <div className="font-semibold text-gray-800 truncate">
              {cliente.cidade || 'Não informada'}
            </div>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200/70 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3 text-gray-400" />
              Telefone
            </span>
            <div className="font-semibold text-gray-800 truncate">
              {cliente.telefone || 'Não informado'}
            </div>
          </div>

          <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200/70 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-600" />
              Potência do Sistema
            </span>
            <div className="font-bold text-emerald-900 text-sm">
              {potenciaExibida > 0
                ? `${potenciaExibida.toLocaleString('pt-BR')} kWp`
                : 'Não informada'}
            </div>
          </div>

          <div className="p-3 bg-gray-50/70 rounded-xl border border-gray-200/70 space-y-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              Data de Instalação
            </span>
            <div className="font-semibold text-gray-800">
              {dataInstalacaoExibida ? formatDate(dataInstalacaoExibida) : 'Não informada'}
            </div>
          </div>
        </div>
      </div>

      {/* 1.1 BLOCO DE DOCUMENTAÇÃO O&M (PROCURAÇÃO E CONTRATO) */}
      <div className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 shadow-xs space-y-4">
        <div className="flex items-start sm:items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm sm:text-base font-bold text-gray-900">
                  {propostaAprovada
                    ? 'Documentos O&M — Proposta Fechada'
                    : 'Documentação O&M — Procuração'}
                </h4>
                {propostaAprovada && (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Status: {propostaAprovada.status || 'Aprovado'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                {propostaAprovada
                  ? `Proposta O&M Plano ${propostaAprovada.plano_escolhido || 'Padrão'} (${propostaAprovada.potencia_kwp} kWp) aprovada. Gere a procuração e o contrato com os dados do cliente.`
                  : 'Emita a Procuração Particular para representação perante a concessionária de energia.'}
              </p>
            </div>
          </div>

          {propostaAprovada && (
            <span className="text-xs font-bold text-emerald-800 bg-white px-3 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
              {formatCurrency(propostaAprovada.valor_mensal_plano || 0)}/mês •{' '}
              {formatCurrency(propostaAprovada.valor_anual_plano || 0)}/ano
            </span>
          )}
        </div>

        {/* Botões de Ação: Gerar Procuração (sempre disponível) e Gerar Contrato */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModalProcuracaoOpen(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all hover:scale-[1.01]"
          >
            <FileText className="w-4 h-4" />
            <span>Gerar Procuração</span>
          </button>

          {propostaAprovada && (
            <button
              type="button"
              onClick={() => setModalContratoOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-emerald-50/60 active:bg-emerald-100/60 text-emerald-800 border-2 border-emerald-300 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-all hover:scale-[1.01]"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Gerar Contrato</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. CONTRATO VIGENTE E STATUS DO PLANO O&M */}
      {!contrato ? (
        <div className="p-6 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 rounded-2xl border-2 border-dashed border-amber-300 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Oportunidade O&M
              </div>
              <h3 className="text-base font-bold text-gray-900">
                Este cliente não possui plano O&M contratado
              </h3>
              <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
                Planos de operação e manutenção preventiva garantem performance máxima, limpeza
                periódica e inspeções preventivas contínuas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-amber-200/60">
            <button
              type="button"
              onClick={() => setModalOferecerPlano(true)}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Contratar Plano O&M</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-teal-50/30 space-y-4 shadow-xs">
          {/* Header do Contrato */}
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Contrato Vigente
                </span>
                <h4 className="text-base font-bold text-gray-900">Plano {planoExibido}</h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusPlanoBadge(statusPlano)}

              {isEditingPlano ? (
                <div
                  className="inline-flex items-center gap-1.5 p-1 bg-white rounded-lg border border-emerald-400 shadow-2xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <select
                    autoFocus
                    disabled={isSavingPlano}
                    value={editPlanoSelecionado}
                    onChange={(e) => setEditPlanoSelecionado(e.target.value as OMPlanoTipo)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSavePlano()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        handleCancelEditPlano()
                      }
                    }}
                    className="text-xs font-bold py-0.5 px-2 rounded border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  >
                    <option value="Essencial">Essencial</option>
                    <option value="Prevenção">Prevenção</option>
                    <option value="Completo">Completo</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleSavePlano}
                    disabled={isSavingPlano}
                    className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-2xs transition-colors disabled:opacity-50"
                    title="Confirmar (Enter)"
                    aria-label="Confirmar plano"
                  >
                    {isSavingPlano ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelEditPlano}
                    disabled={isSavingPlano}
                    className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold transition-colors disabled:opacity-50"
                    title="Cancelar (Esc)"
                    aria-label="Cancelar alteração de plano"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartEditPlano}
                  className={`group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold border transition-all cursor-pointer hover:shadow-2xs ${getPlanoColor(
                    planoExibido,
                  )} hover:scale-[1.02]`}
                  title="Clique para editar o tipo de plano"
                >
                  <span>{planoExibido}</span>
                  <Pencil className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </div>

          {/* Métricas do Contrato: Plano, Início, Vencimento, Valor Mensal e Anual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div
              className={`p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1 group relative transition-colors ${
                !isEditingValorMensal
                  ? 'hover:border-emerald-300 hover:bg-emerald-50/20 cursor-pointer'
                  : ''
              }`}
              onClick={() => {
                if (!isEditingValorMensal) handleStartEditValorMensal()
              }}
              title={!isEditingValorMensal ? 'Clique para editar o valor mensal' : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                  Valor Mensal
                </span>
                {!isEditingValorMensal && (
                  <button
                    type="button"
                    onClick={handleStartEditValorMensal}
                    className="p-1 rounded text-gray-400 hover:text-emerald-700 hover:bg-emerald-100/60 opacity-60 group-hover:opacity-100 transition-opacity"
                    title="Editar valor mensal"
                    aria-label="Editar valor mensal"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>

              {isEditingValorMensal ? (
                <div className="space-y-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    disabled={isSavingValorMensal}
                    value={editValorMensalInput}
                    onChange={(e) => setEditValorMensalInput(maskCurrencyBRL(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleSaveValorMensal()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        handleCancelEditValorMensal()
                      }
                    }}
                    placeholder="R$ 0,00"
                    className="w-full text-xs font-bold px-2 py-1 rounded border border-emerald-500 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSaveValorMensal}
                      disabled={isSavingValorMensal}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-2xs transition-colors disabled:opacity-50"
                      title="Confirmar (Enter)"
                    >
                      {isSavingValorMensal ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Salvar</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditValorMensal}
                      disabled={isSavingValorMensal}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold transition-colors disabled:opacity-50"
                      title="Cancelar (Esc)"
                    >
                      <X className="w-3 h-3" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <span className="font-bold text-emerald-700 text-sm block">
                  {formatCurrency(valorMensalExibido)}/mês
                </span>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                Valor Total Anual
              </span>
              <span className="font-bold text-gray-800 text-sm">
                {formatCurrency(valorAnualExibido)}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                Início da Vigência
              </span>
              <span className="font-semibold text-gray-800">
                {contrato.data_inicio ? formatDate(contrato.data_inicio) : 'n/d'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                Vencimento da Vigência
              </span>
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-gray-800">
                  {contrato.data_vencimento ? formatDate(contrato.data_vencimento) : 'n/d'}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    diasAteVencimento < 0
                      ? 'text-rose-600'
                      : diasAteVencimento <= 30
                        ? 'text-amber-600'
                        : 'text-emerald-700'
                  }`}
                >
                  {diasAteVencimento < 0
                    ? `(${Math.abs(diasAteVencimento)}d vencido)`
                    : `(${diasAteVencimento}d)`}
                </span>
              </div>
            </div>
          </div>

          {/* 3. PRÓXIMO ATENDIMENTO AGENDADO COM SEU TIPO */}
          <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 flex items-start gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
              <CalendarClock className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-bold text-blue-950 uppercase text-[10px] tracking-wider">
                  Próximo Atendimento Agendado
                </span>
                {contrato.proxima_atividade_data && (
                  <span className="text-blue-800 font-bold bg-blue-100/70 px-2 py-0.5 rounded text-[11px]">
                    {formatDate(contrato.proxima_atividade_data)}
                  </span>
                )}
              </div>
              <div className="text-gray-900 font-semibold text-sm">
                {contrato.proxima_atividade_titulo || 'Aguardando agendamento técnico'}
              </div>
              <div className="text-[11px] text-blue-800">
                Tipo do atendimento:{' '}
                <span className="font-semibold">
                  {contrato.proxima_atividade_titulo?.toLowerCase().includes('limpeza')
                    ? 'Limpeza e Lavagem'
                    : contrato.proxima_atividade_titulo?.toLowerCase().includes('inspe')
                      ? 'Inspeção e Termografia'
                      : 'Manutenção Preventiva Periódica'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2.1 HISTÓRICO DE CONTRATOS ANTERIORES / ENCERRADOS */}
      {contratosHistorico.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl border border-gray-200 bg-gray-50/60 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200/80">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span>Histórico de Contratos O&M ({contratosHistorico.length})</span>
            </span>
            <span className="text-[11px] text-gray-500 font-medium">
              Contratos anteriores e encerrados
            </span>
          </div>

          <div className="space-y-2.5">
            {contratosHistorico.map((cAntigo) => (
              <div
                key={cAntigo.id}
                className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-xs">Plano {cAntigo.plano}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        cAntigo.status_encerramento === 'encerrado' ||
                        cAntigo.status === 'Encerrado'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {cAntigo.status_encerramento === 'encerrado' || cAntigo.status === 'Encerrado'
                        ? 'Encerrado'
                        : cAntigo.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(cAntigo.valor_mensal)}/mês • Vigência:{' '}
                    {formatDate(cAntigo.data_inicio)} até {formatDate(cAntigo.data_vencimento)}
                  </div>
                </div>

                {/* Detalhes do Encerramento se houver */}
                {(cAntigo.status_encerramento === 'encerrado' ||
                  cAntigo.motivo_encerramento ||
                  cAntigo.data_encerramento) && (
                  <div className="p-2.5 bg-rose-50/60 rounded-lg border border-rose-200/70 text-xs space-y-1">
                    <div className="flex items-center justify-between flex-wrap gap-1 text-[11px]">
                      <span className="font-bold text-rose-900">
                        Motivo:{' '}
                        <span className="font-normal">
                          {cAntigo.motivo_encerramento || 'Não informado'}
                        </span>
                      </span>
                      {cAntigo.data_encerramento && (
                        <span className="text-rose-700 font-medium">
                          Data do encerramento: {formatDate(cAntigo.data_encerramento)}
                        </span>
                      )}
                    </div>
                    {cAntigo.observacoes_encerramento && (
                      <p className="text-[11px] text-gray-700 italic">
                        "{cAntigo.observacoes_encerramento}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal para Oferecer/Contratar Plano */}
      {modalOferecerPlano && (
        <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Contratar / Oferecer Plano O&M para {cliente.nome}
            </span>
            <button
              type="button"
              onClick={() => setModalOferecerPlano(false)}
              className="text-gray-400 hover:text-gray-600 text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleOferecerPlano} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Tipo de Plano O&M</label>
                <select
                  value={novoPlanoTipo}
                  onChange={(e) => {
                    const val = e.target.value as OMPlanoTipo
                    setNovoPlanoTipo(val)
                    if (val === 'Essencial') setNovoPlanoValorMensal(190)
                    if (val === 'Prevenção') setNovoPlanoValorMensal(450)
                    if (val === 'Completo') setNovoPlanoValorMensal(1450)
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                >
                  <option value="Essencial">Essencial (R$ 190/mês)</option>
                  <option value="Prevenção">Prevenção (R$ 450/mês)</option>
                  <option value="Completo">Completo (R$ 1.450/mês)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Valor Mensal (R$)</label>
                <input
                  type="number"
                  step="1"
                  required
                  value={novoPlanoValorMensal}
                  onChange={(e) => setNovoPlanoValorMensal(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Observações do Contrato
              </label>
              <textarea
                rows={2}
                value={novoPlanoObs}
                onChange={(e) => setNovoPlanoObs(e.target.value)}
                placeholder="Condições especiais negociadas, número de visitas anuais..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-xs bg-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOferecerPlano(false)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-600 text-xs hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#16A34A] text-white rounded-lg text-xs font-bold hover:bg-[#15803D]"
              >
                Ativar Contrato O&M
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal / Tela de Pré-Revisão e Pré-Visualização da Procuração Particular */}
      {cliente && (
        <ModalGerarProcuracaoOM
          open={modalProcuracaoOpen}
          onOpenChange={setModalProcuracaoOpen}
          cliente={cliente}
          propostaOM={propostaAprovada}
          onDocumentoGerado={async (dados) => {
            try {
              const { upsertDocumentoCliente } = await import('@/services/crmService')
              await upsertDocumentoCliente({
                cliente_id: cliente.id,
                tipo: 'procuracao',
                status_assinatura: 'aguardando_assinatura',
                data_envio: new Date().toISOString(),
                telefone_envio: dados.telefone || cliente.telefone || cliente.whatsapp,
                canal_envio: 'sistema',
                autor: 'CRM Delfos Solar',
                observacoes: `Procuração Particular O&M emitida para ${dados.nome} (CPF ${dados.cpf}).`,
                dados_documento: dados as any,
              })
            } catch (err) {
              console.error('Erro ao salvar documento procuracao:', err)
            }

            // Registra a atividade da procuração na linha do tempo
            try {
              await addAtividade({
                cliente_id: cliente.id,
                tipo: 'gerar_procuracao',
                titulo: 'Procuração Particular O&M Gerada',
                descricao: `Procuração gerada para ${dados.nome} (CPF ${dados.cpf}) para atos junto à concessionária de energia.`,
                data: new Date().toISOString(),
                status: 'concluida',
                autor: 'CRM Delfos Solar',
              })
            } catch {
              /* intentionally ignored */
            }
          }}
        />
      )}

      {/* Modal / Tela de Pré-Revisão e Pré-Visualização do Contrato de Prestação de Serviços O&M */}
      {cliente && (
        <ModalGerarContratoOM
          open={modalContratoOpen}
          onOpenChange={setModalContratoOpen}
          cliente={cliente}
          propostaOM={propostaAprovada}
          onDocumentoGerado={async (dados) => {
            try {
              const { upsertDocumentoCliente } = await import('@/services/crmService')
              await upsertDocumentoCliente({
                cliente_id: cliente.id,
                tipo: 'contrato',
                status_assinatura: 'aguardando_assinatura',
                data_envio: new Date().toISOString(),
                telefone_envio: dados.telefone || cliente.telefone || cliente.whatsapp,
                canal_envio: 'sistema',
                autor: 'CRM Delfos Solar',
                observacoes: `Contrato de Prestação de Serviços O&M (Plano ${dados.planoSelecionado}) emitido para ${dados.nomeRazaoSocial} (${dados.cpfCnpj}). Valor: ${formatCurrency(dados.valorMensal)}/mês.`,
                dados_documento: dados as any,
              })
            } catch (err) {
              console.error('Erro ao salvar documento contrato:', err)
            }

            // Registra a atividade do contrato na linha do tempo
            try {
              await addAtividade({
                cliente_id: cliente.id,
                tipo: 'gerar_contrato',
                titulo: 'Contrato de Prestação de Serviços O&M Gerado',
                descricao: `Contrato O&M gerado no Plano ${dados.planoSelecionado} (${formatCurrency(dados.valorMensal)}/mês - total ${formatCurrency(dados.valorTotal)}) para ${dados.nomeRazaoSocial}.`,
                data: new Date().toISOString(),
                status: 'concluida',
                autor: 'CRM Delfos Solar',
              })
            } catch {
              /* intentionally ignored */
            }
          }}
        />
      )}
    </div>
  )
}

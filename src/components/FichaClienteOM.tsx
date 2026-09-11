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
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import type { OMPlanoTipo, OMStatusPlano } from '@/types/crm'

interface FichaClienteOMProps {
  clienteId: string
  onNavigateToTab?: (tab: 'historico' | 'projeto' | 'om') => void
}

export const FichaClienteOM: React.FC<FichaClienteOMProps> = ({ clienteId, onNavigateToTab }) => {
  const { clientes, sistemas, contratosOM, addContratoOM, addAtividade } = useClientes()

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

  const contrato = useMemo(() => {
    return contratosOM.find((c) => c.cliente_id === clienteId) || null
  }, [contratosOM, clienteId])

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
                <h4 className="text-base font-bold text-gray-900">Plano {contrato.plano}</h4>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusPlanoBadge(statusPlano)}
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${getPlanoColor(
                  contrato.plano,
                )}`}
              >
                {contrato.plano}
              </span>
            </div>
          </div>

          {/* Métricas do Contrato: Plano, Início, Vencimento, Valor Mensal e Anual */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                Valor Mensal
              </span>
              <span className="font-bold text-emerald-700 text-sm">
                {formatCurrency(contrato.valor_mensal)}/mês
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                Valor Total Anual
              </span>
              <span className="font-bold text-gray-800 text-sm">
                {formatCurrency(contrato.valor_anual)}
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
    </div>
  )
}

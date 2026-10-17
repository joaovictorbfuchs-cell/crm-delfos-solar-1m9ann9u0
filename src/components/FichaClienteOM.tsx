import React, { useState, useMemo, useEffect } from 'react'
import {
  ShieldCheck,
  CalendarClock,
  Sparkles,
  Pencil,
  Check,
  X,
  Loader2,
  FileText,
  FileCheck,
  ArrowRight,
  ExternalLink,
  Plus,
  Eye,
  ScrollText,
  AlertCircle,
  CheckCircle2,
  FileSignature,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useClientes } from '@/contexts/ClientesContext'
import {
  formatCurrency,
  formatDate,
  maskCurrencyBRL,
  parseCurrencyBRL,
  formatCurrencyBRL,
} from '@/lib/formatters'
import { calcularDiasRestantesDefensivo } from '@/lib/omCategorizacao'
import { calcularTodosPlanosOM } from '@/lib/planosOM'
import type { OMPlanoTipo, OMStatusPlano, PropostaOM, UsinaCliente, ContratoOM } from '@/types/crm'
import { ModalGerarProcuracaoOM } from './ModalGerarProcuracaoOM'
import { ModalGerarContratoOM } from './ModalGerarContratoOM'
import { BotaoBaixarPropostaOMPDF } from './BotaoBaixarPropostaOMPDF'
import { InlineEditField } from './InlineEditField'
import { SecaoContratoUsinas } from './SecaoContratoUsinas'
import { BlocoDocumentosContratoOM } from './BlocoDocumentosContratoOM'
import { fetchUsinasByClienteId, updateUsina } from '@/services/crmService'
import { vincularUsinaAoContrato } from '@/services/contratosUsinasService'
import { toast } from 'sonner'

interface FichaClienteOMProps {
  clienteId: string
  usinasDoCliente?: UsinaCliente[]
  onNavigateToTab?: (tab: 'historico' | 'projeto' | 'om' | 'usinas' | 'whatsapp') => void
  onDispararGerarContrato?: (
    proposta?: PropostaOM | null,
    plano?: string,
    valorMensal?: number,
    valorTotal?: number,
  ) => void
  onDispararGerarProcuracao?: (proposta?: PropostaOM | null) => void
}

export const FichaClienteOM: React.FC<FichaClienteOMProps> = ({
  clienteId,
  usinasDoCliente: usinasDoClienteProp,
  onNavigateToTab,
  onDispararGerarContrato,
  onDispararGerarProcuracao,
}) => {
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

  // Salvar datas de vigência do Contrato O&M
  const handleSaveDataInicio = async (val: string | number) => {
    if (!contrato) {
      toast.info('Nenhum contrato O&M ativo para atualizar a data de início.')
      return
    }
    const strVal = String(val).trim()
    let isoValue = ''
    if (strVal) {
      const match = strVal.match(/^\d{4}-\d{2}-\d{2}/)
      if (match) {
        // Criar data local a meio-dia UTC para evitar deslocamento de fuso
        isoValue = new Date(`${match[0]}T12:00:00.000Z`).toISOString()
      } else {
        const parsed = new Date(strVal)
        isoValue = isNaN(parsed.getTime()) ? '' : parsed.toISOString()
      }
    }
    try {
      await updateContratoOM(contrato.id, {
        data_inicio: isoValue,
      })
      toast.success(
        isoValue
          ? `Início da vigência atualizado para ${formatDate(isoValue)}.`
          : 'Início da vigência limpo com sucesso.',
      )
    } catch (err: unknown) {
      console.error('Erro ao atualizar início da vigência O&M:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar início da vigência.')
      throw err
    }
  }

  const handleSaveDataVencimento = async (val: string | number) => {
    if (!contrato) {
      toast.info('Nenhum contrato O&M ativo para atualizar o vencimento da vigência.')
      return
    }
    const strVal = String(val).trim()
    let isoValue = ''
    if (strVal) {
      const match = strVal.match(/^\d{4}-\d{2}-\d{2}/)
      if (match) {
        isoValue = new Date(`${match[0]}T12:00:00.000Z`).toISOString()
      } else {
        const parsed = new Date(strVal)
        isoValue = isNaN(parsed.getTime()) ? '' : parsed.toISOString()
      }
    }
    try {
      await updateContratoOM(contrato.id, {
        data_vencimento: isoValue,
      })
      toast.success(
        isoValue
          ? `Vencimento da vigência atualizado para ${formatDate(isoValue)}.`
          : 'Vencimento da vigência limpo com sucesso.',
      )
    } catch (err: unknown) {
      console.error('Erro ao atualizar vencimento da vigência O&M:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar vencimento da vigência.')
      throw err
    }
  }

  // Modal Oferecer / Criar Contrato de Plano
  const [modalOferecerPlano, setModalOferecerPlano] = useState(false)
  const [novoPlanoTipo, setNovoPlanoTipo] = useState<OMPlanoTipo>('Essencial')
  const [novoPlanoValorMensal, setNovoPlanoValorMensal] = useState<number>(190)
  const [novoPlanoObs, setNovoPlanoObs] = useState('')

  // Modal Seletor de Contratação O&M a partir da Proposta do Cliente
  const [modalContratarPropostaOpen, setModalContratarPropostaOpen] = useState(false)
  const [planoContratacaoEscolhido, setPlanoContratacaoEscolhido] = useState<
    'Essencial' | 'Inspeção' | 'Completo'
  >('Inspeção')
  const [modalAvisoSemPropostaOpen, setModalAvisoSemPropostaOpen] = useState(false)
  const [modalAvisoSemPropostaAprovadaOpen, setModalAvisoSemPropostaAprovadaOpen] = useState(false)

  // Disparar Gerar Contrato preenchido com a proposta e o plano selecionado
  const handleAcaoGerarContrato = () => {
    if (!ultimaPropostaOM || !opcoesPlanosUltimaProposta) {
      if (onDispararGerarContrato) {
        onDispararGerarContrato()
      } else {
        setModalContratoOpen(true)
      }
      setModalContratarPropostaOpen(false)
      return
    }

    const infoPlano = opcoesPlanosUltimaProposta[planoContratacaoEscolhido]
    const valorMensal = infoPlano?.mensal || 190
    const valorTotal = infoPlano?.anual || valorMensal * 12

    if (onDispararGerarContrato) {
      onDispararGerarContrato(ultimaPropostaOM, planoContratacaoEscolhido, valorMensal, valorTotal)
    } else {
      setModalContratoOpen(true)
    }

    setModalContratarPropostaOpen(false)
  }

  // Disparar Gerar Procuração preenchida com os dados da proposta/cliente
  const handleAcaoGerarProcuracao = () => {
    if (onDispararGerarProcuracao) {
      onDispararGerarProcuracao(ultimaPropostaOM)
    } else {
      setModalProcuracaoOpen(true)
    }
    setModalContratarPropostaOpen(false)
  }

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
          new Date(b.data_emissao || b.data_proposta || b.created).getTime() -
          new Date(a.data_emissao || a.data_proposta || a.created).getTime(),
      )
  }, [propostasOM, clienteId])

  // Última proposta O&M do cliente (referência para contratação)
  const ultimaPropostaOM = useMemo(() => {
    return propostasCliente[0] || null
  }, [propostasCliente])

  // Detalhes calculados dos 3 planos da última proposta O&M (com valores negociados se houver)
  const opcoesPlanosUltimaProposta = useMemo(() => {
    if (!ultimaPropostaOM) return null

    let negociados: Record<string, number | null> | undefined = undefined
    if (ultimaPropostaOM.valores_negociados_json) {
      try {
        negociados =
          typeof ultimaPropostaOM.valores_negociados_json === 'string'
            ? JSON.parse(ultimaPropostaOM.valores_negociados_json)
            : ultimaPropostaOM.valores_negociados_json
      } catch (e) {
        console.warn('Erro ao decodificar valores_negociados_json na FichaClienteOM:', e)
      }
    }

    const res = calcularTodosPlanosOM({
      distanciaKm: Number(ultimaPropostaOM.distancia_km || 0),
      valorKm: Number(ultimaPropostaOM.valor_km || 0),
      numeroModulos: Number(ultimaPropostaOM.numero_modulos || 0),
      geracaoMensalKwh: Number(ultimaPropostaOM.geracao_mensal_kwh || 0),
      valorKwh: Number(ultimaPropostaOM.valor_kwh || 0),
      valorPorPlaca: Number(ultimaPropostaOM.valor_por_placa || 9),
      valoresNegociados: negociados as any,
    })

    return res
  }, [ultimaPropostaOM])

  // Handler de clique em "Contratar Plano O&M"
  const handleIniciarContratacaoPlano = () => {
    if (!propostasCliente || propostasCliente.length === 0) {
      setModalAvisoSemPropostaOpen(true)
      return
    }

    // Se a proposta já tem um plano sugerido/escolhido, inicia com ele selecionado
    if (
      ultimaPropostaOM?.plano_escolhido &&
      (ultimaPropostaOM.plano_escolhido === 'Essencial' ||
        ultimaPropostaOM.plano_escolhido === 'Inspeção' ||
        ultimaPropostaOM.plano_escolhido === 'Completo')
    ) {
      setPlanoContratacaoEscolhido(
        ultimaPropostaOM.plano_escolhido as 'Essencial' | 'Inspeção' | 'Completo',
      )
    } else {
      setPlanoContratacaoEscolhido('Inspeção')
    }

    setModalContratarPropostaOpen(true)
  }

  // Proposta O&M aprovada / fechada (mais recente pela ordenação de data de propostasCliente)
  const propostaAprovada = useMemo<PropostaOM | null>(() => {
    return (
      propostasCliente.find((p) => {
        const s = (p.status || '').toLowerCase().trim()
        return s === 'aprovado' || s === 'aprovada' || s === 'fechado' || s === 'fechada'
      }) || null
    )
  }, [propostasCliente])

  // Handler canônico para "+ Adicionar Contrato O&M"
  const handleAdicionarContratoOM = () => {
    // 1. Se houver proposta O&M aprovada, dispara o fluxo canônico (revisão -> Anexo II -> pré-visualização A4)
    if (propostaAprovada) {
      const plano =
        (propostaAprovada.plano_escolhido as 'Essencial' | 'Inspeção' | 'Completo') || 'Inspeção'
      let valorMensal = propostaAprovada.valor_mensal_plano
      if (!valorMensal) {
        if (plano === 'Essencial') valorMensal = propostaAprovada.valor_plano_essencial || 190
        else if (plano === 'Inspeção' || (plano as string) === 'Prevenção')
          valorMensal = propostaAprovada.valor_plano_inspecao || 450
        else if (plano === 'Completo') valorMensal = propostaAprovada.valor_plano_completo || 1450
        else valorMensal = 190
      }
      const valorTotal = propostaAprovada.valor_anual_plano || valorMensal * 12

      if (onDispararGerarContrato) {
        onDispararGerarContrato(propostaAprovada, plano, valorMensal, valorTotal)
      } else {
        setModalContratoOpen(true)
      }
      return
    }

    // 2. Se NÃO houver proposta aprovada, abre o aviso orientador elegante (sem gerar contrato avulso nem atividades)
    setModalAvisoSemPropostaAprovadaOpen(true)
  }

  // Proposta O&M ativa de referência (aprovada/fechada tem prioridade, com fallback para mais recente)
  const propostaAtiva = useMemo<PropostaOM | null>(() => {
    return propostaAprovada || propostasCliente[0] || null
  }, [propostaAprovada, propostasCliente])

  // Carregar usinas do cliente para exibição e vinculação de múltiplos contratos
  const [usinasLocais, setUsinasLocais] = useState<UsinaCliente[]>([])
  useEffect(() => {
    if (usinasDoClienteProp && usinasDoClienteProp.length > 0) {
      setUsinasLocais(usinasDoClienteProp)
    } else if (clienteId) {
      fetchUsinasByClienteId(clienteId).then((res) => setUsinasLocais(res))
    }
  }, [clienteId, usinasDoClienteProp])

  // Lista de TODOS os contratos vigentes/ativos do cliente
  const contratosVigentes = useMemo(() => {
    return todosContratosCliente.filter(
      (c) =>
        c.status !== 'Encerrado' &&
        c.status !== 'Cancelado' &&
        c.status_encerramento !== 'encerrado',
    )
  }, [todosContratosCliente])

  // Contrato ativo selecionado/principal
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState<string | null>(null)

  useEffect(() => {
    if (contratosVigentes.length > 0) {
      if (
        !contratoSelecionadoId ||
        !contratosVigentes.some((c) => c.id === contratoSelecionadoId)
      ) {
        setContratoSelecionadoId(contratosVigentes[0].id)
      }
    } else {
      setContratoSelecionadoId(null)
    }
  }, [contratosVigentes, contratoSelecionadoId])

  const contrato = useMemo(() => {
    if (contratosVigentes.length === 0) return null
    if (contratoSelecionadoId) {
      const match = contratosVigentes.find((c) => c.id === contratoSelecionadoId)
      if (match) return match
    }
    return contratosVigentes[0]
  }, [contratosVigentes, contratoSelecionadoId])

  const contratosHistorico = useMemo(() => {
    const idsVigentes = new Set(contratosVigentes.map((c) => c.id))
    return todosContratosCliente.filter((c) => !idsVigentes.has(c.id))
  }, [todosContratosCliente, contratosVigentes])

  if (!cliente) return null

  // Cálculos de dias até vencimento
  const diasAteVencimento = calcularDiasRestantesDefensivo(contrato?.data_vencimento) ?? 0

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
      {/* BARRA SUPERIOR DE CONTRATOS O&M: Ações e Botão "+ Adicionar Contrato O&M" (100% aditivo) */}
      <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-white rounded-2xl border border-gray-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Contratos O&M ({contratosVigentes.length}{' '}
              {contratosVigentes.length === 1 ? 'vigente' : 'vigentes'})
            </h3>
            <p className="text-[11px] text-gray-500">
              Gerencie contratos vigentes e crie novos contratos (um por usina ou geral).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão Oficial: "+ Adicionar Contrato O&M" — SEMPRE visível mesmo com contratos existentes */}
          <button
            type="button"
            onClick={handleAdicionarContratoOM}
            className="px-3.5 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Adicionar novo contrato O&M via fluxo canônico da proposta aprovada"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Adicionar Contrato O&M</span>
          </button>

          {/* Botão de Contratação via Proposta (se houver proposta aprovada/emitida) */}
          <button
            type="button"
            onClick={handleIniciarContratacaoPlano}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xl shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            title="Contratar a partir das propostas O&M"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contratar via Proposta</span>
          </button>

          {/* Botão de Inserção Manual Rápida */}
          <button
            type="button"
            onClick={() => setModalOferecerPlano(true)}
            className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-medium rounded-xl shadow-2xs transition-colors inline-flex items-center gap-1 cursor-pointer"
            title="Inserir manualmente registro direto"
          >
            <span>Inserir Manual</span>
          </button>
        </div>
      </div>

      {/* SELETOR DE ABAS/CARDS QUANDO EXISTEM MÚLTIPLOS CONTRATOS VIGENTES */}
      {contratosVigentes.length > 1 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Contratos Vigentes deste Cliente ({contratosVigentes.length}):</span>
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              Clique em um contrato para visualizar e editar seus detalhes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {contratosVigentes.map((cItem, idx) => {
              const isSel = contrato?.id === cItem.id
              const dias = calcularDiasRestantesDefensivo(cItem.data_vencimento) ?? 0

              // Identificar usinas vinculadas a este contrato da lista de usinas do cliente
              const usinasDesteContrato = usinasLocais.filter(
                (u) => (u as any).contrato_id === cItem.id,
              )
              const nomeUsinaVinculada =
                usinasDesteContrato.length > 0
                  ? usinasDesteContrato.map((u) => u.nome).join(', ')
                  : null

              return (
                <button
                  key={cItem.id}
                  type="button"
                  onClick={() => setContratoSelecionadoId(cItem.id)}
                  className={`p-3 rounded-xl text-left border transition-all cursor-pointer relative ${
                    isSel
                      ? 'bg-white border-emerald-500 ring-2 ring-emerald-500 shadow-xs'
                      : 'bg-white/80 border-gray-200 hover:border-gray-300 hover:bg-white shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-gray-900">
                      Contrato #{idx + 1} • {cItem.plano}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                        dias < 0
                          ? 'bg-rose-100 text-rose-800'
                          : dias <= 30
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {dias < 0 ? 'Vencido' : dias <= 30 ? 'Vencendo' : 'Ativo'}
                    </span>
                  </div>

                  <div className="text-xs font-extrabold text-emerald-700">
                    {formatCurrency(cItem.valor_mensal)}/mês
                  </div>

                  {nomeUsinaVinculada ? (
                    <div className="text-[10px] text-gray-600 mt-1 truncate">
                      🏢 <strong>Usina:</strong> {nomeUsinaVinculada}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-400 mt-1">
                      (Sem usina específica vinculada)
                    </div>
                  )}

                  {cItem.data_vencimento && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Vence em: {formatDate(cItem.data_vencimento)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

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

          <div className="flex items-center gap-3 pt-2 border-t border-amber-200/60 flex-wrap">
            <button
              type="button"
              onClick={handleAdicionarContratoOM}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Contrato O&M</span>
            </button>

            <button
              type="button"
              onClick={handleIniciarContratacaoPlano}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Contratar via Proposta O&M</span>
            </button>

            {/* Acesso rápido alternativo mantido para flexibilidade operacional */}
            <button
              type="button"
              onClick={() => setModalOferecerPlano(true)}
              className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors inline-flex items-center gap-1.5"
              title="Cadastro manual direto de contrato"
            >
              <Plus className="w-3.5 h-3.5 text-gray-500" />
              <span>Inserir Manualmente</span>
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
                  Contrato Vigente{' '}
                  {contratosVigentes.length > 1
                    ? `(${contratosVigentes.findIndex((c) => c.id === contrato.id) + 1} de ${contratosVigentes.length})`
                    : ''}
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
              <div className="min-h-[24px] flex items-center">
                <InlineEditField
                  value={contrato.data_inicio || ''}
                  displayValue={
                    <span className="font-semibold text-gray-800">
                      {contrato.data_inicio ? formatDate(contrato.data_inicio) : 'Não informada'}
                    </span>
                  }
                  type="date"
                  placeholder="DD/MM/AAAA"
                  onSave={handleSaveDataInicio}
                />
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-1">
              <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                Vencimento da Vigência
              </span>
              <div className="min-h-[24px] flex items-center justify-between gap-1">
                <InlineEditField
                  value={contrato.data_vencimento || ''}
                  displayValue={
                    <span className="font-semibold text-gray-800">
                      {contrato.data_vencimento
                        ? formatDate(contrato.data_vencimento)
                        : 'Não informada'}
                    </span>
                  }
                  type="date"
                  placeholder="DD/MM/AAAA"
                  onSave={handleSaveDataVencimento}
                />
                <span
                  className={`text-[10px] font-bold shrink-0 ${
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

          {/* 2.5 SEÇÃO ADITIVA: USINAS COBERTAS PELO CONTRATO (RELAÇÃO N:N COM HISTÓRICO) */}
          <SecaoContratoUsinas
            contratoId={contrato.id}
            clienteId={cliente.id}
            numeroContrato={contrato.numero_contrato}
            plano={contrato.plano}
            onUsinaSelecionada={() => {
              if (onNavigateToTab) onNavigateToTab('usinas')
            }}
          />

          {/* DOCUMENTOS DO CONTRATO (ANEXOS, PROCURAÇÃO ASSINADA, CONTRATO ASSINADO, OUTROS) */}
          <BlocoDocumentosContratoOM contratoId={contrato.id} clienteNome={cliente.nome} />

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

      {/* HISTÓRICO DE PROPOSTAS O&M DO CLIENTE (ADITIVO E ACIONÁVEL) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between pb-2 border-b border-blue-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
              <ScrollText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-gray-900 uppercase tracking-wider block">
                Histórico de Propostas O&M ({propostasCliente.length})
              </span>
              <span className="text-[11px] text-gray-500 font-normal">
                Orçamentos gerados, status e ações de contratação
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/propostas?aba=om"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-blue-900 hover:bg-blue-100/60 rounded-lg transition-colors border border-blue-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Proposta</span>
            </a>
          </div>
        </div>

        {propostasCliente.length === 0 ? (
          <div className="p-4 bg-white/80 rounded-xl border border-dashed border-gray-300 text-center space-y-2">
            <p className="text-xs text-gray-600">
              Nenhuma proposta O&M gerada para este cliente até o momento.
            </p>
            <a
              href="/propostas?aba=om"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <span>Criar a primeira Proposta O&M no Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        ) : (
          <div className="space-y-2.5">
            {propostasCliente.map((p, idx) => {
              const dataExibicao = p.data_emissao || p.data_proposta || p.created
              const statusCor =
                p.status === 'aprovada'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : p.status === 'rejeitada'
                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200'

              return (
                <div
                  key={p.id}
                  className={`p-3.5 bg-white rounded-xl border transition-all ${
                    idx === 0
                      ? 'border-blue-300 shadow-xs ring-1 ring-blue-100'
                      : 'border-gray-200 shadow-2xs hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-xs">
                          {p.titulo || `Proposta O&M #${p.id.slice(-6)}`}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-blue-600 text-white tracking-wide">
                            Última / Ativa
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${statusCor}`}
                        >
                          {p.status || 'Pendente'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-wrap">
                        <span>Emissão: {dataExibicao ? formatDate(dataExibicao) : 'Data n/d'}</span>
                        {p.plano_escolhido && (
                          <span>
                            Plano indicado:{' '}
                            <strong className="text-gray-800 font-semibold">
                              {p.plano_escolhido}
                            </strong>
                          </span>
                        )}
                        {p.valor_mensal_plano ? (
                          <span className="text-emerald-700 font-bold">
                            {formatCurrency(p.valor_mensal_plano)}/mês
                          </span>
                        ) : null}
                        {p.numero_modulos ? <span>{p.numero_modulos} placas</span> : null}
                        {p.potencia_kwp ? <span>{p.potencia_kwp} kWp</span> : null}
                      </div>
                    </div>

                    {/* Ações da proposta */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            p.plano_escolhido === 'Essencial' ||
                            p.plano_escolhido === 'Inspeção' ||
                            p.plano_escolhido === 'Completo'
                          ) {
                            setPlanoContratacaoEscolhido(p.plano_escolhido)
                          } else {
                            setPlanoContratacaoEscolhido('Inspeção')
                          }
                          setModalContratarPropostaOpen(true)
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors inline-flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Contratar</span>
                      </button>

                      <a
                        href={`/propostas?aba=om&id=${p.id}`}
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                        title="Ver ou editar proposta no Hub"
                      >
                        <ExternalLink className="w-3 h-3 text-gray-500" />
                        <span>Abrir</span>
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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
                telefone_envio: dados.telefone || cliente.whatsapp || cliente.telefone,
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
          usinasDoCliente={usinasLocais}
          onDocumentoGerado={async (dados, usinaId) => {
            try {
              const { upsertDocumentoCliente } = await import('@/services/crmService')
              await upsertDocumentoCliente({
                cliente_id: cliente.id,
                tipo: 'contrato',
                status_assinatura: 'aguardando_assinatura',
                data_envio: new Date().toISOString(),
                telefone_envio: dados.telefone || cliente.whatsapp || cliente.telefone,
                canal_envio: 'sistema',
                autor: 'CRM Delfos Solar',
                observacoes: `Contrato de Prestação de Serviços O&M (Plano ${dados.planoSelecionado}) emitido para ${dados.nomeRazaoSocial} (${dados.cpfCnpj}). Valor: ${formatCurrency(dados.valorMensal)}/mês.`,
                dados_documento: dados as any,
              })
            } catch (err) {
              console.error('Erro ao salvar documento contrato:', err)
            }

            // 1. Cria o registro oficial do contrato O&M na base de dados
            try {
              const hoje = new Date()
              const vencimento = new Date()
              vencimento.setFullYear(vencimento.getFullYear() + 1)

              const novoContrato = await addContratoOM({
                cliente_id: cliente.id,
                plano: (dados.planoSelecionado as OMPlanoTipo) || 'Essencial',
                status: 'Ativo',
                valor_mensal: dados.valorMensal || 190,
                valor_anual: dados.valorTotal || (dados.valorMensal || 190) * 12,
                data_inicio: hoje.toISOString(),
                data_vencimento: vencimento.toISOString(),
                servicos_realizados: [],
                servicos_agendados: [
                  'Monitoramento da geração em horários comerciais',
                  'Relatório mensal de desempenho',
                ],
                observacoes: usinaId ? `Contrato vinculado à usina ID ${usinaId}` : '',
              })

              // Se uma usina foi selecionada (caso de uso: 1 contrato por usina), vincula N:N e atualiza usina.contrato_id
              if (usinaId && novoContrato?.id) {
                try {
                  await vincularUsinaAoContrato({
                    contrato_id: novoContrato.id,
                    usina_id: usinaId,
                  })
                } catch (vErr) {
                  console.warn('Erro ao vincular tabela relacional contratos_usinas:', vErr)
                }
                try {
                  await updateUsina(usinaId, { contrato_id: novoContrato.id })
                } catch (uErr) {
                  console.warn('Erro ao atualizar usina.contrato_id:', uErr)
                }
              }

              if (novoContrato?.id) {
                setContratoSelecionadoId(novoContrato.id)
              }
              toast.success('Novo Contrato O&M adicionado e ativado com sucesso!')
            } catch (errContrato) {
              console.error('Erro ao salvar contrato na coleção contratos_om:', errContrato)
            }

            // 2. Registra a atividade do contrato na linha do tempo
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

      {/* MODAL ORIENTADOR: QUANDO NÃO HÁ PROPOSTA O&M APROVADA */}
      <Dialog
        open={modalAvisoSemPropostaAprovadaOpen}
        onOpenChange={setModalAvisoSemPropostaAprovadaOpen}
      >
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border border-amber-200">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Nenhuma Proposta O&amp;M Aprovada
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-600 leading-relaxed pt-1">
              Para gerar o Contrato O&amp;M oficial (fluxo canônico: revisão → Anexo II →
              pré-visualização A4), é necessário que o cliente tenha uma{' '}
              <strong>proposta O&amp;M aprovada</strong>. O contrato utiliza os dimensionamentos
              técnicos e valores homologados na proposta.
            </DialogDescription>
          </DialogHeader>

          {propostasCliente.length > 0 ? (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-900">
              <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Propostas O&amp;M cadastradas deste cliente ({propostasCliente.length}):
                </span>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {propostasCliente.map((prop) => (
                  <div
                    key={prop.id}
                    className="flex items-center justify-between text-xs p-2 rounded-md bg-white border border-amber-200/80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-gray-900 truncate">
                        {prop.numero_proposta || `#${prop.id.slice(-6)}`}
                      </span>
                      <span className="text-[11px] text-gray-500">
                        Plano {prop.plano_escolhido || 'Essencial'}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        {prop.status || 'Enviada'}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {formatDate(prop.data_proposta || prop.data_emissao || prop.created)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-amber-900 font-medium pt-1">
                💡 Para emitir o contrato agora, altere o status de uma proposta para{' '}
                <strong>"Aprovada"</strong> na tabela ou no Hub de Propostas O&amp;M.
              </p>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1 text-amber-900">
              <p className="font-semibold">
                Nenhuma proposta O&amp;M cadastrada para este cliente.
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Crie e aprove uma proposta O&amp;M no Hub antes de gerar o contrato oficial.
              </p>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalAvisoSemPropostaAprovadaOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Fechar
            </button>
            <a
              href="/propostas?aba=om"
              className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ir para Hub de Propostas O&amp;M</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 1: AVISO EDUCATIVO QUANDO NÃO HÁ PROPOSTA O&M */}
      <Dialog open={modalAvisoSemPropostaOpen} onOpenChange={setModalAvisoSemPropostaOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-2xl border border-amber-200">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-amber-700" />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Nenhuma Proposta O&M Encontrada
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-gray-600 leading-relaxed pt-1">
              Para contratar um Plano O&M com os valores dimensionados (potência, número de módulos
              e deslocamento calculados pela fórmula ou negociados), é recomendado primeiro gerar
              uma Proposta O&M no Hub de Propostas.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5 text-amber-900">
            <p className="font-semibold flex items-center gap-1.5">
              <span>Como você prefere prosseguir?</span>
            </p>
            <p className="text-[11px] text-amber-800">
              Você pode criar a proposta agora no Hub de Propostas ou gerar o contrato O&M
              diretamente com preenchimento manual dos valores.
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalAvisoSemPropostaOpen(false)
                if (onDispararGerarContrato) {
                  onDispararGerarContrato()
                } else {
                  setModalContratoOpen(true)
                }
              }}
              className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Gerar Contrato Direto
            </button>
            <a
              href="/propostas?aba=om"
              className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Ir para Hub de Propostas O&M</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SELETOR DE CONTRATAÇÃO COM AS 3 OPÇÕES DA PROPOSTA O&M */}
      <Dialog open={modalContratarPropostaOpen} onOpenChange={setModalContratarPropostaOpen}>
        <DialogContent className="max-w-2xl p-6 bg-[#F9FAFB] rounded-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900">
                  Contratar Plano O&M — {cliente?.nome}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  {ultimaPropostaOM
                    ? `Opções baseadas na proposta mais recente (#${ultimaPropostaOM.id.slice(-6)} - ${
                        ultimaPropostaOM.data_emissao
                          ? formatDate(ultimaPropostaOM.data_emissao)
                          : 'recente'
                      })`
                    : 'Selecione o plano desejado para gerar contrato e procuração'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Cards dos 3 Planos com valores efetivos */}
          {opcoesPlanosUltimaProposta && (
            <div className="space-y-3 py-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block">
                Selecione um dos 3 Planos Calculados:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['Essencial', 'Inspeção', 'Completo'] as const).map((planoKey) => {
                  const info = opcoesPlanosUltimaProposta[planoKey]
                  const isSelected = planoContratacaoEscolhido === planoKey

                  return (
                    <div
                      key={planoKey}
                      onClick={() => setPlanoContratacaoEscolhido(planoKey)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-extrabold text-gray-900 uppercase">
                            {planoKey}
                          </span>
                          {isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-gray-300" />
                          )}
                        </div>

                        <div className="text-base font-extrabold text-emerald-800">
                          {formatCurrency(info.mensal)}
                          <span className="text-[10px] font-medium text-gray-500">/mês</span>
                        </div>

                        <div className="text-[11px] text-gray-600 mt-0.5">
                          Total anual: <strong>{formatCurrency(info.anual)}</strong>
                        </div>

                        {info.isNegociado && (
                          <span className="inline-block mt-1.5 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 bg-amber-100 rounded border border-amber-200">
                            Valor Negociado
                          </span>
                        )}

                        <p className="text-[10px] text-gray-500 mt-2 line-clamp-3 leading-relaxed">
                          {planoKey === 'Essencial' &&
                            'Monitoramento contínuo, suporte técnico prioritário e acompanhamento de geração.'}
                          {planoKey === 'Inspeção' &&
                            'Monitoramento completo + 1 visita anual de inspeção técnica termográfica e conferência preventiva.'}
                          {planoKey === 'Completo' &&
                            'Plano integral com limpeza semestral de módulos, vistorias técnicas e relatórios detalhados.'}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
                        {planoKey === 'Inspeção' ? 'Recomendado Delfos' : 'Opção disponível'}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Resumo da seleção */}
              <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Plano Selecionado:</span>
                  <span className="font-bold text-gray-900">{planoContratacaoEscolhido}</span>
                  <span className="font-extrabold text-emerald-700">
                    {formatCurrency(opcoesPlanosUltimaProposta[planoContratacaoEscolhido].mensal)}
                    /mês
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {ultimaPropostaOM?.numero_modulos
                    ? `${ultimaPropostaOM.numero_modulos} placas`
                    : ''}{' '}
                  {ultimaPropostaOM?.potencia_kwp ? `• ${ultimaPropostaOM.potencia_kwp} kWp` : ''}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setModalContratarPropostaOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleAcaoGerarProcuracao}
              className="px-3.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSignature className="w-4 h-4 text-blue-600" />
              <span>Gerar Procuração</span>
            </button>

            <button
              type="button"
              onClick={handleAcaoGerarContrato}
              className="px-4 py-2 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Gerar Contrato O&M</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

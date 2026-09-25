import React, { useMemo, useState } from 'react'
import {
  Clock,
  Sun,
  FileCheck,
  Calendar,
  FileText,
  MessageSquare,
  HardHat,
  Droplets,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock3,
  XCircle,
  ExternalLink,
  Pencil,
  ChevronRight,
  Sparkles,
  Trash2,
  Loader2,
  Download,
} from 'lucide-react'
import { ModalGerarProcuracaoOM } from '@/components/ModalGerarProcuracaoOM'
import { ModalGerarContratoOM } from '@/components/ModalGerarContratoOM'
import type { DadosProcuracaoOM } from '@/lib/procuracaoGenerator'
import type { DadosContratoOM } from '@/lib/contratoGenerator'
import type { TimelineUnifiedItem, TimelineFilterTipo } from '@/types/timelineUnified'
import type { Cliente, Atividade, OrcamentoSolar, PropostaOM, ClienteStatus } from '@/types/crm'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getTipoAtividadeConfig, buildCustomTipoDef } from '@/constants/atividadesTipos'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { calcularPropostaOM, PLANOS_OM_VALORES } from '@/lib/propostaOMGenerator'
import { StatusBadge } from '@/components/StatusBadge'
import { ArrowLeft, RotateCcw } from 'lucide-react'

// Ordem estrita do funil comercial Delfos Solar
export const ORDEM_FUNIL_CLIENTE: ClienteStatus[] = [
  'Novo Lead',
  'Levantamento',
  'Orçamento',
  'Negociação',
  'Fechado',
  'Perdido',
]

interface LinhaDoTempoUnificadaProps {
  cliente: Cliente
  atividades: Atividade[]
  orcamentosSolar: OrcamentoSolar[]
  propostasOM: PropostaOM[]
  onItemClick: (item: TimelineUnifiedItem) => void
  onToggleAtividadeStatus?: (id: string, current: string) => Promise<void>
  onNovaAtividadeClick?: () => void
  onNovoOrcamentoSolarClick?: () => void
  onNovaPropostaOMClick?: () => void
}

export const LinhaDoTempoUnificada: React.FC<LinhaDoTempoUnificadaProps> = ({
  cliente,
  atividades,
  orcamentosSolar,
  propostasOM,
  onItemClick,
  onToggleAtividadeStatus,
  onNovaAtividadeClick,
  onNovoOrcamentoSolarClick,
  onNovaPropostaOMClick,
}) => {
  const {
    tiposAtividadesCustom,
    removeAtividade,
    contratosOM,
    documentosCliente,
    updateClienteStatus,
  } = useClientes()
  const { isAdmin, userProfile, user } = useAuth()
  const [activeFilter, setActiveFilter] = useState<TimelineFilterTipo>('todas')
  const [atividadeParaExcluir, setAtividadeParaExcluir] = useState<{
    id: string
    titulo: string
  } | null>(null)
  const [isDeletingAtividade, setIsDeletingAtividade] = useState(false)
  const [isUpdatingEstagio, setIsUpdatingEstagio] = useState(false)
  const [modalProcuracaoViewOpen, setModalProcuracaoViewOpen] = useState(false)
  const [procuracaoViewDados, setProcuracaoViewDados] = useState<Partial<DadosProcuracaoOM> | null>(
    null,
  )
  const [modalContratoViewOpen, setModalContratoViewOpen] = useState(false)
  const [contratoViewDados, setContratoViewDados] = useState<Partial<DadosContratoOM> | null>(null)

  // Etapa atual do cliente no funil
  const estagioAtual = cliente.status || 'Novo Lead'
  const indexEstagioAtual = ORDEM_FUNIL_CLIENTE.indexOf(estagioAtual)
  const etapaAnterior = indexEstagioAtual > 0 ? ORDEM_FUNIL_CLIENTE[indexEstagioAtual - 1] : null

  // Nome do usuário logado para auditoria
  const operadorNome = userProfile?.name || (user as any)?.name || 'Administrador'

  // Handler para alterar etapa com registro detalhado de atividade
  const handleMudarEtapa = async (novoEstagio: ClienteStatus) => {
    if (novoEstagio === estagioAtual || isUpdatingEstagio) return
    try {
      setIsUpdatingEstagio(true)
      await updateClienteStatus(cliente.id, novoEstagio, {
        autor: operadorNome,
        customTitulo: `Etapa alterada de ${estagioAtual} para ${novoEstagio}`,
        customDescricao: `Etapa alterada de "${estagioAtual}" para "${novoEstagio}" por ${operadorNome}.`,
      })
    } catch (err) {
      console.error('Erro ao atualizar estágio do cliente na timeline:', err)
      alert('Não foi possível alterar a etapa do cliente. Tente novamente.')
    } finally {
      setIsUpdatingEstagio(false)
    }
  }

  // Handler para voltar etapa anterior da ordem do funil
  const handleVoltarEtapaAnterior = async () => {
    if (!etapaAnterior) return
    await handleMudarEtapa(etapaAnterior)
  }

  const customDefs = useMemo(() => {
    return (tiposAtividadesCustom || []).map((t) => buildCustomTipoDef(t))
  }, [tiposAtividadesCustom])

  // Agrega todos os eventos das coleções existentes em uma única linha cronológica
  const todosEventos = useMemo<TimelineUnifiedItem[]>(() => {
    const items: TimelineUnifiedItem[] = []

    // 1. Propostas Solares (e suas revisões)
    for (const orc of orcamentosSolar) {
      if (orc.cliente_id !== cliente.id) continue
      const revNum = orc.numero_revisao || 1
      const revStatus = orc.status_revisao || 'em análise'
      const dataIso = orc.data_orcamento || orc.created

      let statusVar: TimelineUnifiedItem['statusVariant'] = 'warning'
      if (revStatus === 'aprovada') statusVar = 'success'
      else if (revStatus === 'rejeitada') statusVar = 'danger'
      else if (revStatus === 'enviada ao cliente') statusVar = 'info'

      const equipParts: string[] = []
      if (orc.potencia_kwp) equipParts.push(`${orc.potencia_kwp.toFixed(2)} kWp`)
      if (orc.numero_placas) equipParts.push(`${orc.numero_placas} placas`)
      if (orc.geracao_mensal_kwh) equipParts.push(`${orc.geracao_mensal_kwh} kWh/mês`)
      if (orc.marca_painel) equipParts.push(`Módulos ${orc.marca_painel}`)
      if (orc.marca_inversor) equipParts.push(`Inv: ${orc.marca_inversor}`)

      const equipDesc = equipParts.join(' • ')

      items.push({
        id: `solar-${orc.id}`,
        categoria: 'proposta_solar',
        tipoFiltro: 'propostas',
        titulo: `Proposta Solar Fotovoltaica — Revisão ${revNum}`,
        subtitulo: equipDesc || 'Dimensionamento Fotovoltaico',
        descricao:
          orc.observacoes ||
          `Orçamento solar elaborado para ${cliente.nome}. Potência calculada de ${orc.potencia_kwp?.toFixed(2)} kWp (${orc.numero_placas || 0} placas) com geração estimada de ${orc.geracao_mensal_kwh ? `${orc.geracao_mensal_kwh} kWh/mês` : 'alto rendimento'}.`,
        data: dataIso,
        autor: orc.autor || 'Delfos Solar',
        responsavelNome: orc.autor || 'Engenharia Solar Delfos',
        status: revStatus,
        statusVariant: statusVar,
        valorPrincipal: orc.valor_investimento,
        valorSecundario: orc.geracao_mensal_kwh
          ? `${orc.geracao_mensal_kwh} kWh/mês estimados`
          : undefined,
        dadosTecnicos: {
          potenciaKwp: orc.potencia_kwp,
          numeroPlacas: orc.numero_placas,
          placasMarca: orc.marca_painel,
          inversorMarca: orc.marca_inversor,
          geracaoMensalKwh: orc.geracao_mensal_kwh,
          paybackMeses: orc.payback_anos ? Math.round(orc.payback_anos * 12) : undefined,
          tipoEstrutura: orc.tipo_estrutura,
          revisaoNumero: revNum,
        },
        rawOrcamentoSolar: orc,
      })
    }

    // 2. Propostas O&M
    for (const prop of propostasOM) {
      if (prop.cliente_id !== cliente.id) continue
      const dataIso = prop.data_proposta || prop.created
      const planoNome = prop.plano_escolhido || prop.plano_recomendado || 'Completo'

      // Se valor mensal ou ativo protegido não estiverem gravados diretamente no registro, calcula a partir dos dados técnicos
      let valorMensal = prop.valor_mensal_plano || 0
      let valorAnual = prop.valor_anual_plano || (valorMensal ? valorMensal * 12 : 0)
      let ativoProtegido = prop.valor_ativo_protegido || 0

      // Se ativoProtegido ou valorMensal estiver zerado mas há geracao e tarifa, calcula via calcularPropostaOM
      if ((!ativoProtegido || !valorMensal) && prop.geracao_mensal_kwh && prop.valor_kwh) {
        const calc = calcularPropostaOM({
          geracaoMensalKwh: prop.geracao_mensal_kwh,
          valorKwh: prop.valor_kwh,
          planoEscolhido: planoNome as any,
        })
        if (!ativoProtegido && calc.valorAtivoProtegido) {
          ativoProtegido = calc.valorAtivoProtegido
        }
        if (!valorMensal && calc.valorMensalEscolhido) {
          valorMensal = calc.valorMensalEscolhido
          valorAnual = calc.valorAnualEscolhido || valorMensal * 12
        }
      }

      // Se valorMensal ainda for 0, usa o valor padrão do catálogo para o plano
      if (!valorMensal && PLANOS_OM_VALORES[planoNome as keyof typeof PLANOS_OM_VALORES]) {
        valorMensal = PLANOS_OM_VALORES[planoNome as keyof typeof PLANOS_OM_VALORES].mensal
        valorAnual = PLANOS_OM_VALORES[planoNome as keyof typeof PLANOS_OM_VALORES].anual
      }

      let statusVar: TimelineUnifiedItem['statusVariant'] = 'info'
      if (prop.status === 'Aceita' || prop.status === 'Fechado' || prop.status === 'Aprovado') {
        statusVar = 'success'
      } else if (prop.status === 'Recusada' || prop.status === 'Rejeitado') {
        statusVar = 'danger'
      }

      const equipDesc = [
        prop.potencia_kwp ? `${prop.potencia_kwp} kWp` : '',
        prop.tipo_instalacao ? prop.tipo_instalacao : '',
        prop.marca_inversores ? `Inv: ${prop.marca_inversores}` : '',
      ]
        .filter(Boolean)
        .join(' • ')

      items.push({
        id: `om-${prop.id}`,
        categoria: 'proposta_om',
        tipoFiltro: 'propostas',
        titulo: `Proposta O&M: Plano ${planoNome}${prop.potencia_kwp ? ` (${prop.potencia_kwp} kWp)` : ''}`,
        subtitulo: equipDesc || 'Operação & Manutenção Preventiva • 3 Planos Comparados',
        descricao:
          prop.observacoes ||
          `Proposta formal de gestão e manutenção continuada para sistema solar de ${prop.potencia_kwp || 0} kWp. Inclui vistorias técnicas periódicas, ativo protegido de ${formatCurrency(ativoProtegido)}/mês e comparativo dos planos Essencial, Prevenção e Completo.`,
        data: dataIso,
        autor: prop.autor || 'Equipe O&M Delfos',
        responsavelNome: prop.autor || 'Equipe O&M Delfos',
        status: prop.status || 'Proposta Enviada',
        statusVariant: statusVar,
        valorPrincipal: valorMensal,
        valorSecundario:
          ativoProtegido > 0 ? `Ativo protegido: ${formatCurrency(ativoProtegido)}/mês` : undefined,
        dadosTecnicos: {
          potenciaKwp: prop.potencia_kwp,
          numeroPlacas: prop.numero_modulos,
          planoEscolhido: planoNome,
          inversorMarca: prop.marca_inversores,
          geracaoMensalKwh: prop.geracao_mensal_kwh,
          tipoEstrutura: prop.tipo_instalacao,
          valorMensal,
          valorAnual,
          valorAtivoProtegido: ativoProtegido,
          valorKwh: prop.valor_kwh,
        },
        rawPropostaOM: prop,
      })
    }

    // 2.5 Contratos O&M (vigentes e histórico/encerrados)
    for (const cont of contratosOM) {
      if (cont.cliente_id !== cliente.id) continue
      const isEncerrado = cont.status_encerramento === 'encerrado' || cont.status === 'Encerrado'
      const dataIso = cont.data_encerramento || cont.updated || cont.created

      let statusVar: TimelineUnifiedItem['statusVariant'] = 'info'
      if (isEncerrado) {
        statusVar = 'danger'
      } else if (cont.status === 'Ativo') {
        statusVar = 'success'
      } else if (cont.status === 'Vencendo em 30 dias') {
        statusVar = 'warning'
      }

      const descEncerramento = isEncerrado
        ? `Contrato encerrado. Motivo: ${cont.motivo_encerramento || 'Não informado'}.${cont.observacoes_encerramento ? ` Obs: ${cont.observacoes_encerramento}` : ''}`
        : `Contrato O&M em vigência (até ${formatDate(cont.data_vencimento)}). ${cont.observacoes || ''}`

      items.push({
        id: `contrato-${cont.id}`,
        categoria: 'proposta_om',
        tipoFiltro: 'outras',
        titulo: isEncerrado
          ? `Contrato O&M Encerrado: Plano ${cont.plano}`
          : `Contrato O&M Ativo: Plano ${cont.plano}`,
        subtitulo: `Vigência: ${formatDate(cont.data_inicio)} até ${formatDate(cont.data_vencimento)}`,
        descricao: descEncerramento,
        data: dataIso,
        autor: 'Equipe Delfos Solar',
        responsavelNome: 'Equipe Delfos Solar',
        status: isEncerrado ? 'Encerrado' : cont.status,
        statusVariant: statusVar,
        valorPrincipal: cont.valor_mensal,
        valorSecundario: `Total anual: ${formatCurrency(cont.valor_anual)}`,
      })
    }

    // 3. Atividades & Anotações
    for (const atv of atividades) {
      if (atv.cliente_id !== cliente.id) continue
      const dataIso = atv.data || atv.created
      const isAnotacao = atv.tipo === 'anotacao'
      const isOutras = atv.tipo === 'mudanca_estagio' || (atv.tipo as string) === 'outro'

      let cat: TimelineUnifiedItem['categoria'] = 'atividade'
      let filtro: TimelineUnifiedItem['tipoFiltro'] = 'atividades'

      if (isAnotacao) {
        cat = 'anotacao'
        filtro = 'outras'
      } else if (isOutras) {
        cat = 'outras'
        filtro = 'outras'
      }

      let statusVar: TimelineUnifiedItem['statusVariant'] = 'info'
      if (atv.status === 'concluida') statusVar = 'success'
      else if (atv.status === 'cancelada') statusVar = 'danger'
      else if (atv.status === 'pendente') statusVar = 'warning'

      const configTipo = getTipoAtividadeConfig(atv.tipo, customDefs)

      items.push({
        id: `atv-${atv.id}`,
        categoria: cat,
        tipoFiltro: filtro,
        titulo: atv.titulo || configTipo.tituloPadrao,
        subtitulo: configTipo.tituloPadrao,
        descricao: atv.descricao || undefined,
        data: dataIso,
        autor: atv.autor || atv.responsavel_nome,
        responsavelNome: atv.responsavel_nome || atv.autor,
        status: isAnotacao ? 'Anotação' : atv.status,
        statusVariant: statusVar,
        rawAtividade: atv,
      })
    }

    // Ordenação estritamente cronológica: mais recente primeiro
    return items.sort((a, b) => {
      const timeA = new Date(a.data).getTime()
      const timeB = new Date(b.data).getTime()
      return timeB - timeA
    })
  }, [cliente.id, cliente.nome, orcamentosSolar, propostasOM, contratosOM, atividades, customDefs])

  // Contagens para os chips de filtro
  const counts = useMemo(() => {
    let atvCount = 0
    let propCount = 0
    let outrasCount = 0

    for (const item of todosEventos) {
      if (item.tipoFiltro === 'atividades') atvCount++
      else if (item.tipoFiltro === 'propostas') propCount++
      else if (item.tipoFiltro === 'outras') outrasCount++
    }

    return {
      todas: todosEventos.length,
      atividades: atvCount,
      propostas: propCount,
      outras: outrasCount,
    }
  }, [todosEventos])

  // Filtragem dos eventos de acordo com o chip selecionado
  const eventosFiltrados = useMemo(() => {
    if (activeFilter === 'todas') return todosEventos
    return todosEventos.filter((i) => i.tipoFiltro === activeFilter)
  }, [todosEventos, activeFilter])

  const renderIcon = (item: TimelineUnifiedItem) => {
    switch (item.categoria) {
      case 'proposta_solar':
        return (
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs group-hover:scale-105 transition-transform">
            <Sun className="w-4 h-4 text-amber-600" />
          </div>
        )
      case 'proposta_om':
        return (
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs group-hover:scale-105 transition-transform">
            <FileCheck className="w-4 h-4 text-emerald-700" />
          </div>
        )
      case 'anotacao':
        return (
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
        )
      case 'atividade':
        return (
          <div className="p-2 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs group-hover:scale-105 transition-transform">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
        )
      default:
        return (
          <div className="p-2 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 shadow-2xs group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
        )
    }
  }

  const renderCategoryBadge = (item: TimelineUnifiedItem) => {
    switch (item.categoria) {
      case 'proposta_solar':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
            Proposta Solar
          </span>
        )
      case 'proposta_om':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
            Proposta O&M
          </span>
        )
      case 'anotacao':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
            Anotação
          </span>
        )
      case 'atividade':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
            Atividade
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
            Outras Ações
          </span>
        )
    }
  }

  return (
    <div className="space-y-3 pt-2">
      {/* ========================================================================= */}
      {/* BARRA CONTEXTUAL DE CONTROLE DE ETAPA DO FUNIL (APENAS ADMIN / GESTORES)    */}
      {/* ========================================================================= */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-emerald-50/90 via-white to-emerald-50/40 rounded-xl border border-emerald-200 p-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                Estágio no Funil:
              </span>
              <StatusBadge status={estagioAtual} />
              {etapaAnterior && (
                <span className="text-[11px] text-gray-400 hidden md:inline">
                  (Anterior: <strong className="text-gray-600 font-medium">{etapaAnterior}</strong>)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Voltar Etapa (ordem estrita: Lead → Orçamento Enviado → Proposta → Negociação → Fechado → Perdido) */}
              <button
                type="button"
                onClick={handleVoltarEtapaAnterior}
                disabled={!etapaAnterior || isUpdatingEstagio}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                  etapaAnterior && !isUpdatingEstagio
                    ? 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs hover:scale-[1.02] cursor-pointer'
                    : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60'
                }`}
                title={
                  etapaAnterior
                    ? `Voltar etapa para "${etapaAnterior}"`
                    : 'Já está na primeira etapa do funil'
                }
              >
                {isUpdatingEstagio ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                ) : (
                  <ArrowLeft className="w-3.5 h-3.5 text-emerald-700" />
                )}
                <span>Voltar etapa</span>
                {etapaAnterior && (
                  <span className="hidden lg:inline text-[11px] font-normal text-emerald-700/80">
                    ({etapaAnterior})
                  </span>
                )}
              </button>

              {/* Seletor de etapa direta (dropdown) */}
              <div className="flex items-center gap-1">
                <select
                  value={estagioAtual}
                  disabled={isUpdatingEstagio}
                  onChange={(e) => handleMudarEtapa(e.target.value as ClienteStatus)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-white text-gray-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#16A34A] focus:border-[#16A34A] cursor-pointer"
                  title="Selecionar qualquer etapa do funil diretamente"
                >
                  {ORDEM_FUNIL_CLIENTE.map((statusOpcao) => (
                    <option key={statusOpcao} value={statusOpcao}>
                      {statusOpcao} {statusOpcao === estagioAtual ? '(Atual)' : ''}
                    </option>
                  ))}
                  {/* Inclui qualquer outro status legado se houver fora do padrão */}
                  {!ORDEM_FUNIL_CLIENTE.includes(estagioAtual) && (
                    <option value={estagioAtual}>{estagioAtual} (Atual)</option>
                  )}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho com Filtros por Tipo */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Clock className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>Linha do Tempo Unificada</span>
                <span className="text-[11px] font-normal text-gray-400">
                  ({eventosFiltrados.length} de {todosEventos.length})
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">
                Ordem cronológica (mais recente primeiro): propostas solares, O&M, atividades e
                anotações.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {onNovoOrcamentoSolarClick && (
              <button
                type="button"
                onClick={onNovoOrcamentoSolarClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                title="Criar novo orçamento solar ou nova revisão"
              >
                <Sun className="w-3.5 h-3.5 text-white" />
                <span>+ Novo Orçamento</span>
              </button>
            )}

            {onNovaPropostaOMClick && (
              <button
                type="button"
                onClick={onNovaPropostaOMClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                title="Criar nova proposta de O&M"
              >
                <FileCheck className="w-3.5 h-3.5 text-white" />
                <span>+ Proposta O&M</span>
              </button>
            )}

            {onNovaAtividadeClick && (
              <button
                type="button"
                onClick={onNovaAtividadeClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors"
                title="Registrar nova atividade ou follow-up"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-600" />
                <span>+ Atividade</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumo rápido de propostas solares e O&M quando houver */}
        {counts.propostas > 0 && (
          <div className="space-y-1 pt-1 border-t border-gray-100 text-[11px] text-gray-600">
            {todosEventos.some((ev) => ev.categoria === 'proposta_solar') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-700 flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Proposta Solar:
                </span>
                {todosEventos
                  .filter((ev) => ev.categoria === 'proposta_solar')
                  .map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onItemClick(ev)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold transition-colors text-[11px]"
                      title={`Ver detalhes da Revisão ${ev.dadosTecnicos?.revisaoNumero || 1}`}
                    >
                      <span className="font-bold">
                        Rev. {ev.dadosTecnicos?.revisaoNumero || 1}:
                      </span>
                      <span>{formatCurrency(ev.valorPrincipal || 0)}</span>
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          ev.statusVariant === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.statusVariant === 'danger'
                              ? 'bg-red-100 text-red-800'
                              : ev.statusVariant === 'warning'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </button>
                  ))}
              </div>
            )}

            {todosEventos.some((ev) => ev.categoria === 'proposta_om') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-700 flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Propostas O&M (
                  {todosEventos.filter((ev) => ev.categoria === 'proposta_om').length}):
                </span>
                {todosEventos
                  .filter((ev) => ev.categoria === 'proposta_om')
                  .map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onItemClick(ev)}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-semibold transition-colors text-[11px]"
                      title={`Ver proposta O&M - Plano ${ev.dadosTecnicos?.planoEscolhido || 'Completo'}`}
                    >
                      <span className="font-bold">
                        {ev.dadosTecnicos?.planoEscolhido || 'O&M'}:
                      </span>
                      <span>{formatCurrency(ev.valorPrincipal || 0)}/mês</span>
                      {ev.dadosTecnicos?.valorAtivoProtegido ? (
                        <span className="text-[10px] text-gray-500 font-normal">
                          (Protegido: {formatCurrency(ev.dadosTecnicos.valorAtivoProtegido)}/mês)
                        </span>
                      ) : null}
                      <span
                        className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          ev.statusVariant === 'success'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.statusVariant === 'danger'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {ev.status}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Chips de Filtro */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setActiveFilter('todas')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'todas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <span>Todas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'todas'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.todas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('atividades')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'atividades'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Atividades</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'atividades'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.atividades}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('propostas')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'propostas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Propostas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'propostas'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.propostas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('outras')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'outras'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Outras Ações</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'outras'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.outras}
            </span>
          </button>
        </div>
      </div>

      {/* Lista da Linha do Tempo */}
      {eventosFiltrados.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">
            Nenhum evento encontrado para o filtro "{activeFilter}".
          </p>
          <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
            Alterne o filtro acima para "Todas" ou registre uma nova atividade/proposta.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {eventosFiltrados.map((item) => {
            const hasValor = item.valorPrincipal !== undefined && item.valorPrincipal > 0
            const isAtividade = item.rawAtividade && item.categoria === 'atividade'
            const isConcluida = item.rawAtividade?.status === 'concluida'

            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-xs ${
                  item.categoria === 'proposta_solar'
                    ? 'bg-gradient-to-r from-amber-50/60 via-white to-amber-50/20 border-amber-200/90 hover:border-amber-400 hover:shadow-xs'
                    : item.categoria === 'proposta_om'
                      ? 'bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/20 border-emerald-200/90 hover:border-emerald-400 hover:shadow-xs'
                      : item.categoria === 'anotacao'
                        ? 'bg-gradient-to-r from-indigo-50/40 via-white to-indigo-50/10 border-indigo-200/90 hover:border-indigo-400 hover:shadow-xs'
                        : 'bg-white border-gray-200 hover:border-emerald-400 hover:shadow-xs'
                }`}
              >
                {/* Ícone por tipo */}
                <div className="shrink-0 mt-0.5">{renderIcon(item)}</div>

                {/* Conteúdo do Registro */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderCategoryBadge(item)}

                      {item.dadosTecnicos?.revisaoNumero && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-700 text-white">
                          Rev. {item.dadosTecnicos.revisaoNumero}
                        </span>
                      )}

                      {item.status && item.categoria !== 'anotacao' && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            if (item.rawAtividade && onToggleAtividadeStatus) {
                              e.stopPropagation()
                              await onToggleAtividadeStatus(
                                item.rawAtividade.id,
                                item.rawAtividade.status || 'pendente',
                              )
                            }
                          }}
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border transition-all ${
                            item.rawAtividade && onToggleAtividadeStatus
                              ? 'cursor-pointer hover:opacity-80'
                              : ''
                          } ${
                            item.statusVariant === 'success'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.statusVariant === 'danger'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : item.statusVariant === 'warning'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                          title={
                            item.rawAtividade && onToggleAtividadeStatus
                              ? 'Clique para alternar status'
                              : undefined
                          }
                        >
                          {item.status}
                        </button>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                      <Clock3 className="w-3 h-3 text-gray-400" />
                      <span>{formatDateTime(item.data)}</span>
                    </div>
                  </div>

                  {/* Título, Subtítulo e Etiqueta da Usina */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-800 transition-colors">
                        {item.titulo}
                      </h4>
                      {item.rawAtividade?.expand?.usina_id?.nome && (
                        <span
                          className="inline-flex items-center gap-1 font-bold text-[#0F2038] bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] shadow-2xs"
                          title={`Vinculada à usina: ${item.rawAtividade.expand.usina_id.nome}`}
                        >
                          <Sun className="w-3 h-3 text-[#E0A838] shrink-0" />
                          <span>{item.rawAtividade.expand.usina_id.nome}</span>
                        </span>
                      )}
                    </div>
                    {item.subtitulo && (
                      <p className="text-[11px] text-gray-500 font-medium">{item.subtitulo}</p>
                    )}
                  </div>

                  {/* Descrição resumida */}
                  {item.descricao && (
                    <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed pt-0.5">
                      {item.descricao}
                    </p>
                  )}

                  {/* Pílulas de resumo detalhado para O&M */}
                  {item.categoria === 'proposta_om' && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
                      {item.dadosTecnicos?.planoEscolhido && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
                          Plano: <strong>{item.dadosTecnicos.planoEscolhido}</strong>
                        </span>
                      )}
                      {item.dadosTecnicos?.valorAtivoProtegido !== undefined &&
                        item.dadosTecnicos.valorAtivoProtegido > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50/70 text-emerald-800 border border-emerald-200 font-medium">
                            Ativo Protegido:{' '}
                            <strong>
                              {formatCurrency(item.dadosTecnicos.valorAtivoProtegido)}/mês
                            </strong>
                          </span>
                        )}
                      {item.dadosTecnicos?.valorAnual !== undefined &&
                        item.dadosTecnicos.valorAnual > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                            Anual:{' '}
                            <strong>{formatCurrency(item.dadosTecnicos.valorAnual)}/ano</strong>
                          </span>
                        )}
                      <span className="text-[10px] text-gray-400 font-medium">
                        • 3 Planos Comparados
                      </span>
                    </div>
                  )}

                  {/* Rodapé do card: autor, valor financeiro e botão de detalhes */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100/90 text-[11px] flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-gray-500">
                      {(item.responsavelNome || item.autor) && (
                        <span className="font-medium">
                          Por:{' '}
                          <strong className="text-gray-700">
                            {item.responsavelNome || item.autor}
                          </strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {hasValor && (
                        <div className="text-right">
                          <span className="font-black text-gray-900 text-xs sm:text-sm">
                            {formatCurrency(item.valorPrincipal!)}
                          </span>
                          {item.categoria === 'proposta_om' && (
                            <span className="text-[10px] text-gray-400 block font-normal">
                              /mês
                            </span>
                          )}
                        </div>
                      )}

                      {/* Ação rápida "Voltar para [etapa anterior]" em atividades de mudança de estágio para admins */}
                      {isAdmin &&
                        item.rawAtividade?.tipo === 'mudanca_estagio' &&
                        (() => {
                          // Extrair etapa anterior de padrões conhecidos no título ou descrição
                          // Formatos comuns: "Mudança de estágio: {ant} → {novo}", "Etapa alterada de {ant} para {novo}"
                          const tit = item.titulo || item.rawAtividade?.titulo || ''
                          const desc = item.descricao || item.rawAtividade?.descricao || ''
                          let estagioAntEncontrado: ClienteStatus | null = null

                          // Tentativa 1: "Etapa alterada de {ant} para {novo}"
                          const match1 = (tit + ' ' + desc).match(
                            /(?:Etapa|estágio)\s+alterad[ao]\s+de\s+["']?([^"'→\n\r]+?)["']?\s+para/i,
                          )
                          if (match1 && match1[1]) {
                            const cand = match1[1].trim() as ClienteStatus
                            if (ORDEM_FUNIL_CLIENTE.includes(cand)) {
                              estagioAntEncontrado = cand
                            }
                          }

                          // Tentativa 2: "{ant} → {novo}"
                          if (!estagioAntEncontrado) {
                            const match2 = (tit + ' ' + desc).match(
                              /(?:Mudança de estágio:?\s*|Projeto:?\s*)?["']?([^"'→\n\r]+?)["']?\s*→\s*["']?([^"'→\n\r]+?)["']?/i,
                            )
                            if (match2 && match2[1]) {
                              const cand = match2[1].trim() as ClienteStatus
                              if (ORDEM_FUNIL_CLIENTE.includes(cand)) {
                                estagioAntEncontrado = cand
                              }
                            }
                          }

                          // Se não encontrou etapa explícita no texto, usa o fallback de etapaAnterior da ordem
                          const targetEtapa = estagioAntEncontrado || etapaAnterior
                          if (!targetEtapa || targetEtapa === estagioAtual) return null

                          return (
                            <button
                              type="button"
                              disabled={isUpdatingEstagio}
                              onClick={async (e) => {
                                e.stopPropagation()
                                await handleMudarEtapa(targetEtapa)
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors shadow-2xs"
                              title={`Ação rápida: voltar cliente para "${targetEtapa}"`}
                            >
                              <RotateCcw className="w-3 h-3 text-amber-700" />
                              <span>Voltar para {targetEtapa}</span>
                            </button>
                          )
                        })()}

                      {/* Botão de abrir detalhes com efeito hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onItemClick(item)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3 h-3 text-emerald-600" />
                        <span>Detalhes / Editar</span>
                        <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>

                      {/* Botão Ver PDF com Download para Procuração Particular O&M */}
                      {(item.titulo === 'Procuração Particular O&M Gerada' ||
                        item.rawAtividade?.tipo === 'gerar_procuracao' ||
                        item.subtitulo === 'Gerar Procuração O&M') && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const docProcuracao = documentosCliente.find(
                              (d) => d.cliente_id === cliente.id && d.tipo === 'procuracao',
                            )
                            const dadosSalvos =
                              (docProcuracao?.dados_documento as DadosProcuracaoOM) || {
                                nome: cliente.titular_nome || cliente.nome,
                                cpf: cliente.titular_cpf || cliente.cpf,
                                endereco: cliente.endereco,
                                municipio: cliente.cidade,
                                telefone:
                                  cliente.titular_telefone || cliente.telefone || cliente.whatsapp,
                              }
                            setProcuracaoViewDados(dadosSalvos)
                            setModalProcuracaoViewOpen(true)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors shadow-2xs"
                          title="Visualizar Procuração A4 e Rebaixar PDF"
                        >
                          <Download className="w-3 h-3 text-white" />
                          <span>Ver PDF</span>
                        </button>
                      )}

                      {/* Botão Ver PDF com Download para Contrato de Prestação de Serviços O&M */}
                      {(item.titulo === 'Contrato de Prestação de Serviços O&M Gerado' ||
                        item.rawAtividade?.tipo === 'gerar_contrato' ||
                        item.subtitulo === 'Gerar Contrato O&M' ||
                        item.titulo?.startsWith('Contrato de Prestação de Serviços O&M')) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            const docContrato = documentosCliente.find(
                              (d) => d.cliente_id === cliente.id && d.tipo === 'contrato',
                            )
                            const dadosSalvos =
                              (docContrato?.dados_documento as DadosContratoOM) || {
                                nomeRazaoSocial:
                                  cliente.razao_social ||
                                  cliente.nome ||
                                  cliente.titular_nome ||
                                  '',
                                cpfCnpj: cliente.cnpj || cliente.cpf || cliente.titular_cpf || '',
                                enderecoInstalacao: cliente.endereco || '',
                                municipio: cliente.cidade || 'Erechim/RS',
                                telefone:
                                  cliente.titular_telefone ||
                                  cliente.telefone ||
                                  cliente.whatsapp ||
                                  '',
                                email: cliente.email || '',
                              }
                            setContratoViewDados(dadosSalvos)
                            setModalContratoViewOpen(true)
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-lg transition-colors shadow-2xs"
                          title="Visualizar Contrato A4 e Rebaixar PDF"
                        >
                          <Download className="w-3 h-3 text-white" />
                          <span>Ver PDF</span>
                        </button>
                      )}

                      {/* Botão de excluir para itens que são atividades */}
                      {item.rawAtividade && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAtividadeParaExcluir({
                              id: item.rawAtividade!.id,
                              titulo: item.titulo || item.rawAtividade!.titulo || 'Atividade',
                            })
                          }}
                          className="inline-flex items-center p-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 hover:text-red-700"
                          title={`Excluir atividade ${item.titulo}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Excluir atividade</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Visualização da Procuração com rebaixar PDF */}
      {cliente && modalProcuracaoViewOpen && (
        <ModalGerarProcuracaoOM
          open={modalProcuracaoViewOpen}
          onOpenChange={setModalProcuracaoViewOpen}
          cliente={cliente}
          initialDados={procuracaoViewDados}
          modoVisualizacaoDireta={true}
        />
      )}

      {/* Modal de Visualização do Contrato com rebaixar PDF */}
      {cliente && modalContratoViewOpen && (
        <ModalGerarContratoOM
          open={modalContratoViewOpen}
          onOpenChange={setModalContratoViewOpen}
          cliente={cliente}
          initialDados={contratoViewDados}
          modoVisualizacaoDireta={true}
        />
      )}

      {/* Confirmação Segura de Exclusão de Atividade */}
      <AlertDialog
        open={Boolean(atividadeParaExcluir)}
        onOpenChange={(open) => {
          if (!open && !isDeletingAtividade) {
            setAtividadeParaExcluir(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir a atividade{' '}
              <strong className="text-gray-900 font-semibold">
                {atividadeParaExcluir?.titulo}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAtividade}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingAtividade}
              onClick={async (e) => {
                e.preventDefault()
                if (!atividadeParaExcluir) return
                try {
                  setIsDeletingAtividade(true)
                  await removeAtividade(atividadeParaExcluir.id)
                  setAtividadeParaExcluir(null)
                } catch (err) {
                  console.error('Erro ao excluir atividade:', err)
                  alert('Ocorreu um erro ao excluir a atividade. Tente novamente.')
                } finally {
                  setIsDeletingAtividade(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {isDeletingAtividade ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

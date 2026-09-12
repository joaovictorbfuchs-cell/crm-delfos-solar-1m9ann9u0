import React, { useState, useMemo, useRef } from 'react'
import {
  X,
  MapPin,
  Phone,
  Home,
  FileText,
  Calendar,
  Zap,
  Cpu,
  Layers,
  Clock,
  Wrench,
  Droplets,
  Settings,
  Mail,
  User,
  Building,
  Hash,
  Compass,
  Activity,
  Gauge,
  Sun,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  CalendarCheck2,
  Sparkles,
  FolderKanban,
  HardHat,
  UserCheck,
  Plus,
  MessageSquare,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getTelhadoLabel,
  formatWhatsAppPhone,
} from '@/lib/formatters'
import { StatusBadge, ProductBadge } from './StatusBadge'
import { InlineEditField } from './InlineEditField'
import { AtividadeItem } from './AtividadeItem'
import { QuickAddAtividade } from './QuickAddAtividade'
import { FichaClienteOM } from './FichaClienteOM'
import { FichaClienteWhatsApp } from './FichaClienteWhatsApp'
import { ModalGerenciarWhatsAppTemplates } from './ModalGerenciarWhatsAppTemplates'
import { ModalNovaPropostaOM } from './ModalNovaPropostaOM'
import { ModalOrcamentoSolar } from './ModalOrcamentoSolar'
import { ModalEnviarDocumentoWhatsApp } from './ModalEnviarDocumentoWhatsApp'
import { ImportarDadosDocumento } from './ImportarDadosDocumento'
import type { OrcamentoSolar } from '@/types/crm'
import {
  ShieldCheck,
  FileCheck,
  ExternalLink,
  Download,
  UploadCloud,
  Send,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { formatarCNPJ } from '@/lib/orcamentoParser'
import {
  abrirPropostaEmNovaAba,
  baixarPropostaHTML,
  calcularPropostaOM,
} from '@/lib/propostaOMGenerator'
import type { PropostaOM } from '@/types/crm'
import type {
  Cliente,
  Sistema,
  ClienteStatus,
  ProdutoTipo,
  TelhadoTipo,
  TipoAtendimento,
  NumeroFases,
  Atividade,
  ProjetoEtapa,
} from '@/types/crm'

const PRODUTOS: ProdutoTipo[] = [
  'Energia Solar',
  'Plano de O&M',
  'Sistemas Híbridos',
  'Carregadores veiculares',
  'Manutenção avulsa',
]

const ETAPAS_STATUS: { value: ClienteStatus; label: string }[] = [
  { value: 'Novo Lead', label: '1 - Novo Lead' },
  { value: 'Levantamento', label: '2 - Levantamento' },
  { value: 'Orçamento', label: '3 - Orçamento' },
  { value: 'Negociação', label: '4 - Negociação' },
  { value: 'Fechado', label: '5 - Fechado' },
  { value: 'Contato Futuro', label: '6 - Contato Futuro' },
]

const TELHADOS: { value: TelhadoTipo; label: string }[] = [
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'metalico', label: 'Metálico' },
  { value: 'laje', label: 'Laje' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
]

const ATENDIMENTOS: { value: TipoAtendimento; label: string }[] = [
  { value: 'aéreo', label: 'Aéreo' },
  { value: 'subterrâneo', label: 'Subterrâneo' },
]

const FASES: { value: NumeroFases; label: string }[] = [
  { value: 'monofásico', label: 'Monofásico' },
  { value: 'bifásico', label: 'Bifásico' },
  { value: 'trifásico', label: 'Trifásico' },
]

export const FichaClienteDrawer: React.FC = () => {
  const {
    selectedCliente,
    selectedClienteId,
    selectedSistema,
    selectedClienteProjeto,
    activeClientTab,
    setActiveClientTab,
    closeFichaCliente,
    manutencoes,
    atividades,
    profissionais,
    projetoEventos,
    updateCliente,
    updateClienteStatus,
    updateSistema,
    addAtividade,
    updateAtividadeStatus,
    removeAtividade,
    addProjeto,
    updateProjetoEtapa,
    assignProjetoProfissional,
    propostasOM,
    orcamentosSolar,
    whatsAppMensagens,
  } = useClientes()

  // Modal de Proposta O&M
  const [isModalPropostaOpen, setIsModalPropostaOpen] = useState(false)
  const [propostaVisualizar, setPropostaVisualizar] = useState<PropostaOM | null>(null)
  const [isModalOrcamentoSolarOpen, setIsModalOrcamentoSolarOpen] = useState(false)
  const [orcamentoSolarVisualizar, setOrcamentoSolarVisualizar] = useState<OrcamentoSolar | null>(
    null,
  )
  const [modalWhatsAppTemplatesOpen, setModalWhatsAppTemplatesOpen] = useState(false)

  // Modal para envio de Documento (Orçamento Solar / Proposta O&M) por WhatsApp
  const [modalEnviarDocWhatsAppOpen, setModalEnviarDocWhatsAppOpen] = useState(false)
  const [docParaEnviarWhatsApp, setDocParaEnviarWhatsApp] = useState<{
    tipo: 'orcamento_solar' | 'proposta_om'
    referenciaId?: string
    dadosSolar?: any
    dadosOM?: any
  } | null>(null)

  // Seção expansível de detalhes cadastrais/técnicos dentro do painel esquerdo
  const [detalhesOpen, setDetalhesOpen] = useState(false)
  // Seção de Importar dados por documento
  const [importDocOpen, setImportDocOpen] = useState(false)
  const [isCreatingProjeto, setIsCreatingProjeto] = useState(false)

  // Consulta de CNPJ na Ficha do Cliente
  const [isCnpjBuscandoReceita, setIsCnpjBuscandoReceita] = useState(false)
  const [conflitosCnpjCliente, setConflitosCnpjCliente] = useState<
    {
      campo: string
      label: string
      valorAtual: string
      valorReceita: string
    }[]
  >([])
  const [pendenteDadosReceitaCliente, setPendenteDadosReceitaCliente] = useState<any | null>(null)

  // Ref para o container com scroll da coluna esquerda
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  // Ref para a seção de detalhes cadastrais e técnicos
  const detalhesSectionRef = useRef<HTMLDivElement>(null)

  // Ação robusta para alternar/abrir a seção e rolar suavemente até ela
  const handleToggleDetalhes = () => {
    if (activeClientTab === 'historico' && detalhesOpen) {
      // Já está aberta e visível na aba histórico: recolhe
      setDetalhesOpen(false)
      return
    }

    // Se estiver em outra aba ou fechada: garante aba histórico e abre detalhes
    setActiveClientTab('historico')
    setDetalhesOpen(true)

    const scrollParaSecao = (tentativa = 0) => {
      const container = scrollContainerRef.current
      const el =
        detalhesSectionRef.current || document.getElementById('secao-detalhes-cadastrais-tecnicos')

      if (el && container) {
        // Calcula a posição do elemento relativa ao container com scroll
        const containerRect = container.getBoundingClientRect()
        const elRect = el.getBoundingClientRect()
        const relativeTop = elRect.top - containerRect.top + container.scrollTop

        container.scrollTo({
          top: Math.max(0, relativeTop - 12),
          behavior: 'smooth',
        })
      } else if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (tentativa < 10) {
        // Se ainda não montou no DOM (troca de aba/estado React), tenta novamente com rAF
        requestAnimationFrame(() => scrollParaSecao(tentativa + 1))
      }
    }

    // Inicia após a renderização do React
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollParaSecao()
      })
    })
  }

  // Memoized: Todos os registros do cliente em UMA linha do tempo única cronológica (mais recente -> mais antigo)
  // Integrando anotações, atividades normais e propostas O&M da collection propostas_om
  const timelineAtividades = useMemo(() => {
    if (!selectedCliente) return []

    // Atividades normais
    const atvs = atividades.filter((a) => a.cliente_id === selectedCliente.id)

    // Converter propostas O&M em itens da timeline unificada
    const propsOMAsAtividades = (propostasOM || [])
      .filter((p) => p.cliente_id === selectedCliente.id)
      .map((p) => {
        const dataProp = p.data_proposta || p.created
        const valorMensalExibido = p.valor_mensal_plano
          ? formatCurrency(p.valor_mensal_plano)
          : p.valor_ativo_protegido
            ? `${formatCurrency(p.valor_ativo_protegido)}/mês (ativo)`
            : ''

        const planoTexto = p.plano_recomendado || (p.potencia_kwp ? `${p.potencia_kwp} kWp` : 'O&M')
        const descricaoTexto = [
          `Plano oferecido: ${planoTexto}`,
          valorMensalExibido ? `Valor: ${valorMensalExibido}` : '',
          p.potencia_kwp ? `Potência: ${p.potencia_kwp} kWp` : '',
        ]
          .filter(Boolean)
          .join(' • ')

        return {
          id: `prop-om-${p.id}`,
          cliente_id: selectedCliente.id,
          tipo: 'proposta' as const,
          titulo: `Proposta O&M Emitida: Plano ${planoTexto}`,
          descricao: descricaoTexto,
          data: dataProp,
          status: 'concluida' as const,
          created: p.created,
          updated: p.updated || p.created,
          responsavel_nome: p.autor || 'Equipe O&M Delfos',
          _propostaOM: p,
        } as Atividade & { _propostaOM?: PropostaOM }
      })

    return [...atvs, ...propsOMAsAtividades].sort((a, b) => {
      const timeA = new Date(a.data || a.created).getTime()
      const timeB = new Date(b.data || b.created).getTime()
      return timeB - timeA
    })
  }, [atividades, propostasOM, selectedCliente])

  // Próxima atividade agendada: atividade pendente com data futura mais próxima (ou a pendente mais próxima de agora)
  const proximaAtividade = useMemo<Atividade | null>(() => {
    if (!selectedCliente) return null
    const pendentes = atividades.filter(
      (a) =>
        a.cliente_id === selectedCliente.id &&
        a.status === 'pendente' &&
        a.tipo !== 'mudanca_estagio',
    )
    if (pendentes.length === 0) return null

    const now = Date.now()
    // Prioriza atividades futuras ordenadas pela data mais próxima; se não houver futuras, pega a pendente mais recente
    const futuras = pendentes
      .filter((a) => new Date(a.data || a.created).getTime() >= now - 60 * 60 * 1000)
      .sort(
        (a, b) => new Date(a.data || a.created).getTime() - new Date(b.data || b.created).getTime(),
      )

    if (futuras.length > 0) return futuras[0]

    // Se só tem pendentes atrasadas, pega a mais recente entre elas
    return pendentes.sort(
      (a, b) => new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
    )[0]
  }, [atividades, selectedCliente])

  // Manutenções do cliente
  const clientManutencoes = useMemo(() => {
    if (!selectedCliente) return []
    return manutencoes
      .filter((m) => m.cliente_id === selectedCliente.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [manutencoes, selectedCliente])

  // Eventos de projeto do cliente
  const clientProjetoEventos = useMemo(() => {
    if (!selectedClienteProjeto) return []
    return projetoEventos
      .filter((ev) => ev.projeto_id === selectedClienteProjeto.id)
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
  }, [projetoEventos, selectedClienteProjeto])

  // Orçamentos Solares do cliente (ordenados cronologicamente / por número de revisão)
  const clientOrcamentosSolar = useMemo(() => {
    if (!selectedCliente) return []
    return orcamentosSolar
      .filter((o) => o.cliente_id === selectedCliente.id)
      .sort(
        (a, b) =>
          (b.numero_revisao || 1) - (a.numero_revisao || 1) ||
          new Date(b.data_orcamento || b.created).getTime() -
            new Date(a.data_orcamento || a.created).getTime(),
      )
  }, [orcamentosSolar, selectedCliente])

  // Propostas O&M do cliente
  const clientPropostasOM = useMemo(() => {
    if (!selectedCliente) return []
    return propostasOM
      .filter((p) => p.cliente_id === selectedCliente.id)
      .sort(
        (a, b) =>
          new Date(b.data_proposta || b.created).getTime() -
          new Date(a.data_proposta || a.created).getTime(),
      )
  }, [propostasOM, selectedCliente])

  if (!selectedClienteId || !selectedCliente) {
    return null
  }

  const handleCreateProjeto = async () => {
    if (!selectedCliente) return
    setIsCreatingProjeto(true)
    try {
      await addProjeto({
        cliente_id: selectedCliente.id,
        etapa: 'Levantamento de Informações',
        potencia_kwp: selectedSistema?.potencia_total_kwp ?? selectedCliente.potencia_kwp ?? 0,
        cidade: selectedCliente.cidade || '',
      })
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      alert('Falha ao criar projeto para o cliente.')
    } finally {
      setIsCreatingProjeto(false)
    }
  }

  const handleUpdateClienteField = async (field: keyof Cliente, value: unknown) => {
    await updateCliente(selectedCliente.id, { [field]: value } as Partial<Cliente>)
  }

  const handleUpdateSistemaField = async (field: keyof Sistema, value: unknown) => {
    await updateSistema(selectedCliente.id, { [field]: value } as Partial<Sistema>)
    if (field === 'potencia_total_kwp') {
      await updateCliente(selectedCliente.id, { potencia_kwp: Number(value) || 0 })
    } else if (field === 'numero_uc') {
      await updateCliente(selectedCliente.id, { uc: String(value || '') })
    } else if (field === 'data_instalacao') {
      await updateCliente(selectedCliente.id, { data_instalacao: String(value || '') })
    } else if (field === 'tipo_telhado') {
      await updateCliente(selectedCliente.id, { telhado_tipo: value as TelhadoTipo })
    }
  }

  const getServiceIcon = (tipo: string) => {
    switch (tipo) {
      case 'Limpeza':
        return <Droplets className="w-4 h-4 text-blue-500" />
      case 'Revisão Elétrica':
        return <Zap className="w-4 h-4 text-amber-500" />
      case 'Troca de Inversor':
        return <Settings className="w-4 h-4 text-purple-500" />
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />
    }
  }

  const potenciaExibida = selectedSistema?.potencia_total_kwp ?? selectedCliente.potencia_kwp ?? 0
  const geracaoExibida =
    selectedSistema?.geracao_media_mensal_kwh ??
    (potenciaExibida > 0 ? Math.round(potenciaExibida * 125) : 0)
  const dataInstalacaoExibida =
    selectedSistema?.data_instalacao || selectedCliente.data_instalacao || ''
  const ucExibida = selectedSistema?.numero_uc || selectedCliente.uc || ''
  const telhadoExibido = selectedSistema?.tipo_telhado || selectedCliente.telhado_tipo || 'ceramico'
  const concessionariaExibida =
    selectedCliente.concessionaria || selectedSistema?.concessionaria || ''
  const classeConsumoExibida =
    selectedCliente.classe_consumo || selectedSistema?.classe_consumo || ''
  const tarifaExibida = selectedCliente.tarifa ?? selectedSistema?.tarifa ?? 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={closeFichaCliente}
        aria-hidden="true"
      />

      {/* Drawer panel: ocupa quase toda a largura da tela no desktop (~calc(100vw - 68px)), deixando a sidebar visível; tela cheia no mobile */}
      <div className="relative z-50 w-full lg:w-[calc(100vw-68px)] max-w-full bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* Top Header unificado com dados essenciais e fechar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0 pr-2">
            <InlineEditField
              value={selectedCliente.nome}
              displayValue={
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">
                  {selectedCliente.nome}
                </h2>
              }
              type="text"
              placeholder="Nome do cliente"
              onSave={async (val) => {
                const str = String(val).trim()
                if (!str) throw new Error('O nome não pode ficar vazio')
                await handleUpdateClienteField('nome', str)
              }}
            />
            <StatusBadge status={selectedCliente.status} />
            <InlineEditField
              value={selectedCliente.produto || 'Energia Solar'}
              displayValue={
                <ProductBadge produto={selectedCliente.produto || 'Energia Solar'} size="sm" />
              }
              type="select"
              options={PRODUTOS.map((p) => ({ value: p, label: p }))}
              onSave={async (val) => handleUpdateClienteField('produto', val as ProdutoTipo)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setImportDocOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02] ${
                importDocOpen
                  ? 'bg-emerald-800 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300'
              }`}
              title="Importar dados automaticamente por documento (Conta de Luz, CNH, RG, Planilha)"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Importar por Documento</span>
              <span className="sm:hidden">Importar Doc</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setOrcamentoSolarVisualizar(null)
                setIsModalOrcamentoSolarOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02]"
              title="Gerar Orçamento Técnico de Energia Solar Fotovoltaica"
            >
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">Gerar Orçamento Solar</span>
              <span className="sm:hidden">Orçamento</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPropostaVisualizar(null)
                setIsModalPropostaOpen(true)
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02]"
              title="Criar proposta formal de Operação e Manutenção"
            >
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Gerar Proposta O&M</span>
              <span className="sm:hidden">Proposta O&M</span>
            </button>

            <button
              onClick={closeFichaCliente}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              title="Fechar ficha"
              aria-label="Fechar ficha do cliente"
            >
              <X className="w-5 h-5" />
            </button>
          </div>{' '}
        </div>

        {/* Layout Pipedrive em 2 Colunas:
            - Desktop: Flex horizontal (painel principal à esquerda 65-70%, resumo fixo à direita 30-35%)
            - Mobile: Flex vertical (empilhado)
        */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#F8FAF9]/70">
          {/* ================================================================ */}
          {/* COLUNA ESQUERDA: PAINEL PRINCIPAL — ABA ÚNICA "HISTÓRICO"        */}
          {/* ================================================================ */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-gray-200/80 bg-white"
          >
            {/* Header com Abas: "Histórico" e "Projeto" */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveClientTab('historico')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-2 transition-colors ${
                    activeClientTab === 'historico'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Clock className="w-4 h-4 text-[#16A34A]" />
                  <span>Histórico</span>
                  {timelineAtividades.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {timelineAtividades.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('projeto')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-2 transition-colors ${
                    activeClientTab === 'projeto'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 text-emerald-600" />
                  <span>Projeto</span>
                  {selectedClienteProjeto && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {selectedClienteProjeto.etapa}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('om')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-2 transition-colors ${
                    activeClientTab === 'om'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>O&M (Manutenção)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveClientTab('whatsapp')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 rounded-t-md flex items-center gap-2 transition-colors ${
                    activeClientTab === 'whatsapp'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/60'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>WhatsApp</span>
                  {selectedCliente && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {whatsAppMensagens.filter((m) => m.cliente_id === selectedCliente.id).length}
                    </span>
                  )}
                </button>
              </div>

              {/* Botão de alternar visualização dos Dados Completos / Técnicos */}
              <button
                type="button"
                onClick={handleToggleDetalhes}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                  detalhesOpen && activeClientTab === 'historico'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {detalhesOpen && activeClientTab === 'historico'
                    ? 'Ocultar Detalhes Cadastrais'
                    : 'Ver Detalhes Cadastrais & Técnicos'}
                </span>
                {detalhesOpen && activeClientTab === 'historico' ? (
                  <ChevronUp className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-emerald-700" />
                )}
              </button>
            </div>

            {/* Conteúdo do Painel Principal */}
            <div className="p-4 space-y-4 flex-1">
              {/* ======================================================== */}
              {/* SEÇÃO IMPORTAR DADOS POR DOCUMENTO (IA NATIVA SKIP CLOUD) */}
              {/* ======================================================== */}
              {importDocOpen && (
                <ImportarDadosDocumento
                  cliente={selectedCliente}
                  sistema={selectedSistema}
                  onClose={() => setImportDocOpen(false)}
                  onApplyImport={async ({
                    clienteUpdates,
                    sistemaUpdates,
                    fileName,
                    resumoCampos,
                  }) => {
                    // 1. Atualizar cliente
                    if (Object.keys(clienteUpdates).length > 0) {
                      await updateCliente(selectedCliente.id, clienteUpdates)
                    }

                    // 2. Atualizar sistema
                    if (Object.keys(sistemaUpdates).length > 0) {
                      await updateSistema(selectedCliente.id, sistemaUpdates)
                    }

                    // 3. Registrar evento na timeline / histórico do cliente
                    const detalhesTexto =
                      resumoCampos.length > 0
                        ? `Campos atualizados:\n• ${resumoCampos.slice(0, 10).join('\n• ')}${
                            resumoCampos.length > 10
                              ? `\n...e mais ${resumoCampos.length - 10} campos.`
                              : ''
                          }`
                        : 'Dados extraídos e atualizados com sucesso.'

                    await addAtividade({
                      cliente_id: selectedCliente.id,
                      tipo: 'anotacao',
                      titulo: `Dados importados de documento: ${fileName}`,
                      descricao: detalhesTexto,
                      data: new Date().toISOString(),
                      status: 'concluida',
                      responsavel_nome: 'IA Extrator Delfos',
                    })
                  }}
                />
              )}

              {/* ======================================================== */}
              {/* ABA O&M: Plano, Serviços Avulsos e Anomalias             */}
              {/* ======================================================== */}
              {activeClientTab === 'om' && (
                <FichaClienteOM
                  clienteId={selectedCliente.id}
                  onNavigateToTab={(tab) => setActiveClientTab(tab)}
                />
              )}

              {/* ======================================================== */}
              {/* ABA WHATSAPP: Mensagens, Envio Manual, Templates, Fila   */}
              {/* ======================================================== */}
              {activeClientTab === 'whatsapp' && (
                <FichaClienteWhatsApp
                  cliente={selectedCliente}
                  onOpenTemplatesModal={() => setModalWhatsAppTemplatesOpen(true)}
                />
              )}

              {/* ======================================================== */}
              {/* ABA PROJETO: Funil Operacional, Responsável e Histórico  */}
              {/* ======================================================== */}
              {activeClientTab === 'projeto' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {!selectedClienteProjeto ? (
                    <div className="p-8 text-center bg-gray-50/70 rounded-2xl border-2 border-dashed border-gray-200 space-y-3">
                      <FolderKanban className="w-10 h-10 text-emerald-600 mx-auto opacity-70" />
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">
                          Nenhum projeto operacional cadastrado
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                          Este cliente ainda não está no funil de engenharia e execução solar.
                          Inicie o projeto na etapa de Levantamento de Informações.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCreateProjeto}
                        disabled={isCreatingProjeto}
                        className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {isCreatingProjeto ? 'Criando Projeto...' : 'Criar Projeto Solar'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Card de Status do Projeto */}
                      <div className="p-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-emerald-100">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                              <FolderKanban className="w-5 h-5 text-emerald-700" />
                            </div>
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                                Projeto em Execução
                              </div>
                              <h3 className="text-base font-bold text-gray-900">
                                {selectedCliente.nome}
                              </h3>
                            </div>
                          </div>

                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Etapa: {selectedClienteProjeto.etapa}
                          </span>
                        </div>

                        {/* Grade com Seletor de Etapa e Profissional */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* Seletor de Etapa */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                              Mudar Etapa do Projeto:
                            </label>
                            <select
                              value={selectedClienteProjeto.etapa}
                              onChange={async (e) => {
                                const nextEtapa = e.target.value as ProjetoEtapa
                                await updateProjetoEtapa(selectedClienteProjeto.id, nextEtapa)
                              }}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                            >
                              {[
                                'Levantamento de Informações',
                                'Elaboração de Projeto',
                                'Pedido de Compra',
                                'Aguardando Material',
                                'Instalação',
                                'Concluído',
                              ].map((et) => (
                                <option key={et} value={et}>
                                  {et}
                                </option>
                              ))}
                            </select>
                            <p className="text-[10px] text-gray-400">
                              Atualiza o kanban de projetos e registra a mudança com data.
                            </p>
                          </div>

                          {/* Seletor de Profissional Responsável */}
                          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1">
                                <HardHat className="w-3.5 h-3.5 text-emerald-600" />
                                Profissional Responsável:
                              </label>
                              {['Instalação', 'Manutenção', 'Limpeza'].some((s) =>
                                selectedClienteProjeto.etapa.includes(s),
                              ) && (
                                <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-1.5 py-0.2 rounded">
                                  Obrigatório / Serviço
                                </span>
                              )}
                            </div>

                            <select
                              value={selectedClienteProjeto.profissional_id || ''}
                              onChange={async (e) => {
                                const profId = e.target.value
                                const prof = profissionais.find((p) => p.id === profId)
                                await assignProjetoProfissional(
                                  selectedClienteProjeto.id,
                                  prof ? prof.id : null,
                                  prof ? prof.nome : null,
                                )
                              }}
                              className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                            >
                              <option value="">Nenhum profissional selecionado</option>
                              {profissionais.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.nome} ({p.especialidade})
                                </option>
                              ))}
                            </select>

                            <div className="text-[11px] text-gray-600 pt-0.5 flex items-center justify-between">
                              {selectedClienteProjeto.profissional_nome ? (
                                <span className="font-semibold text-emerald-800 flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  {selectedClienteProjeto.profissional_nome}
                                </span>
                              ) : (
                                <span className="text-amber-700 italic">
                                  Nenhum profissional atribuído no momento
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Dados rápidos do projeto */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                              Potência
                            </span>
                            <span className="font-bold text-emerald-700">
                              {selectedClienteProjeto.potencia_kwp || potenciaExibida} kWp
                            </span>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                              Cidade / Região
                            </span>
                            <span className="font-semibold text-gray-800 truncate block">
                              {selectedClienteProjeto.cidade || selectedCliente.cidade || 'N/A'}
                            </span>
                          </div>

                          <div className="p-2 bg-white rounded-lg border border-gray-200 col-span-2 sm:col-span-1">
                            <span className="text-[10px] text-gray-400 font-semibold uppercase block">
                              Início do Projeto
                            </span>
                            <span className="font-semibold text-gray-800">
                              {formatDate(selectedClienteProjeto.created)}
                            </span>
                          </div>
                        </div>

                        {selectedClienteProjeto.observacoes && (
                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200 text-xs text-gray-600">
                            <strong className="text-gray-700 block mb-0.5 text-[11px]">
                              Observações:
                            </strong>
                            <p className="italic">"{selectedClienteProjeto.observacoes}"</p>
                          </div>
                        )}
                      </div>

                      {/* Histórico de Mudanças de Etapa com Datas */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-emerald-600" />
                            <span>Histórico de Mudanças de Etapa</span>
                            <span className="text-[11px] font-normal text-gray-400">
                              ({clientProjetoEventos.length} registros)
                            </span>
                          </div>
                        </div>

                        {clientProjetoEventos.length === 0 ? (
                          <div className="text-center py-8 text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            Nenhuma mudança de etapa registrada até o momento.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {clientProjetoEventos.map((ev) => (
                              <div
                                key={ev.id}
                                className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-emerald-300 transition-colors space-y-1.5"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                                    <span className="text-gray-500">
                                      {ev.etapa_anterior ? `${ev.etapa_anterior} → ` : ''}
                                    </span>
                                    <span className="text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                                      {ev.etapa_nova}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                    <Calendar className="w-3 h-3 text-gray-400" />
                                    <span>{formatDateTime(ev.data || ev.created)}</span>
                                  </div>
                                </div>

                                {ev.profissional_nome && (
                                  <div className="text-xs text-gray-700 flex items-center gap-1.5 pt-0.5">
                                    <HardHat className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                    <span>
                                      Profissional responsável:{' '}
                                      <strong className="text-gray-900 font-semibold">
                                        {ev.profissional_nome}
                                      </strong>
                                    </span>
                                  </div>
                                )}

                                {ev.descricao && (
                                  <p className="text-xs text-gray-600 italic bg-gray-50/70 p-2 rounded-lg border border-gray-100">
                                    "{ev.descricao}"
                                  </p>
                                )}

                                {ev.autor && (
                                  <div className="text-[10px] text-gray-400 text-right">
                                    Registrado por: {ev.autor}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* ABA HISTÓRICO: Linha do tempo, anotações e atividades     */}
              {/* ======================================================== */}
              {activeClientTab === 'historico' && (
                <>
                  {/* ======================================================== */}
                  {/* SEÇÃO EXPANSÍVEL: DADOS CADASTRAIS E TÉCNICOS COMPLETOS  */}
                  {/* Preserva edição inline completa e todos os campos       */}
                  {/* ======================================================== */}
                  {detalhesOpen && (
                    <div
                      ref={detalhesSectionRef}
                      id="secao-detalhes-cadastrais-tecnicos"
                      className="rounded-2xl border border-emerald-200/90 bg-emerald-50/20 p-4 space-y-4 animate-in fade-in duration-200"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                              Dados Completos Cadastrais e Técnicos
                            </h3>
                            <p className="text-[11px] text-gray-500">
                              Edite os campos diretamente com um clique no lápis de edição.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDetalhesOpen(false)}
                          className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 font-medium"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                          Recolher
                        </button>
                      </div>

                      {/* Destaque Inicial: Geração Média Mensal */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium text-emerald-100">
                          <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
                            <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
                            Geração Média Mensal (kWh)
                          </span>
                          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                            Estimativa Solar
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 pt-1">
                          <InlineEditField
                            value={selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida}
                            displayValue={
                              <span className="text-2xl font-black tracking-tight text-white">
                                {(
                                  selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida
                                ).toLocaleString('pt-BR')}
                              </span>
                            }
                            type="number"
                            unit="kWh/mês"
                            step="1"
                            min={0}
                            className="text-white"
                            inputClassName="text-gray-900"
                            onSave={async (val) =>
                              handleUpdateSistemaField('geracao_media_mensal_kwh', Number(val))
                            }
                          />
                          <span className="text-sm font-semibold text-emerald-100">kWh / mês</span>
                        </div>
                        <p className="text-[11px] text-emerald-100/90 pt-0.5">
                          Baseado na irradiação da região e potência instalada ({potenciaExibida}{' '}
                          kWp).
                        </p>
                      </div>

                      {/* Dados Cadastrais */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-emerald-600" />
                            Identificação da Pessoa / Empresa
                          </h4>
                          <span className="text-[10px] uppercase font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            PF / PJ
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Nome completo:</span>
                            <InlineEditField
                              value={selectedCliente.nome}
                              displayValue={
                                <span className="font-semibold text-gray-800">
                                  {selectedCliente.nome}
                                </span>
                              }
                              type="text"
                              placeholder="Nome do cliente"
                              onSave={async (val) => handleUpdateClienteField('nome', String(val))}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Nome fantasia:</span>
                            <InlineEditField
                              value={selectedCliente.nome_fantasia}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.nome_fantasia || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="Nome comercial ou fazenda"
                              onSave={async (val) =>
                                handleUpdateClienteField('nome_fantasia', String(val))
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Razão social:</span>
                            <InlineEditField
                              value={selectedCliente.razao_social}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.razao_social || 'Não informada'}
                                </span>
                              }
                              type="text"
                              placeholder="Razão social completa"
                              onSave={async (val) =>
                                handleUpdateClienteField('razao_social', String(val))
                              }
                            />
                          </div>

                          {/* Banner de conflito se a consulta via Ficha encontrar divergências */}
                          {conflitosCnpjCliente.length > 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 my-2">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                <span className="font-bold">
                                  A Receita Federal retornou dados diferentes dos atuais (
                                  {conflitosCnpjCliente.length} campos):
                                </span>
                              </div>
                              <div className="bg-white/80 rounded-lg p-2 border border-amber-200 divide-y divide-amber-100 max-h-36 overflow-y-auto">
                                {conflitosCnpjCliente.map((c) => (
                                  <div
                                    key={c.campo}
                                    className="py-1 text-[11px] grid grid-cols-1 sm:grid-cols-3 gap-1"
                                  >
                                    <span className="font-semibold text-gray-700">{c.label}:</span>
                                    <span className="text-gray-500 line-through truncate">
                                      Atual: {c.valorAtual || '(vazio)'}
                                    </span>
                                    <span className="text-emerald-800 font-medium truncate sm:text-right">
                                      Receita: {c.valorReceita}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConflitosCnpjCliente([])
                                    setPendenteDadosReceitaCliente(null)
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold text-[11px]"
                                >
                                  Manter meus dados
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (pendenteDadosReceitaCliente) {
                                      const d = pendenteDadosReceitaCliente
                                      const payload: any = {}
                                      if (d.razao_social) payload.razao_social = d.razao_social
                                      if (d.nome_fantasia) payload.nome_fantasia = d.nome_fantasia
                                      if (d.logradouro) payload.endereco = d.logradouro
                                      if (d.numero) payload.numero = d.numero
                                      if (d.complemento) payload.complemento = d.complemento
                                      if (d.bairro) payload.bairro = d.bairro
                                      if (d.municipio) payload.cidade = d.municipio
                                      if (d.uf) payload.estado = d.uf
                                      if (d.cep) payload.cep = d.cep
                                      if (d.telefone) payload.telefone = d.telefone
                                      if (d.email) payload.email = d.email
                                      if (d.situacao_cadastral)
                                        payload.situacao_cadastral = d.situacao_cadastral
                                      if (d.cnae_principal)
                                        payload.cnae_principal = d.cnae_principal
                                      if (d.data_abertura)
                                        payload.data_nascimento_fundacao = d.data_abertura
                                      await updateCliente(selectedCliente.id, payload)
                                      setConflitosCnpjCliente([])
                                      setPendenteDadosReceitaCliente(null)
                                      alert(
                                        'Dados atualizados com sucesso a partir da Receita Federal!',
                                      )
                                    }
                                  }}
                                  className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg font-bold text-[11px] shadow-xs"
                                >
                                  Usar dados da Receita
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">CNPJ:</span>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <InlineEditField
                                  value={selectedCliente.cnpj}
                                  displayValue={
                                    <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                      {selectedCliente.cnpj || 'Não inf.'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="00.000.000/0000-00"
                                  onSave={async (val) => {
                                    const rawVal = String(val)
                                    const digits = rawVal.replace(/\D/g, '')
                                    const formatted = formatarCNPJ(rawVal)
                                    await handleUpdateClienteField('cnpj', formatted)

                                    if (digits.length === 14) {
                                      setIsCnpjBuscandoReceita(true)
                                      try {
                                        const { consultarCNPJReceita } =
                                          await import('@/services/cnpjLookupService')
                                        const res = await consultarCNPJReceita(digits)
                                        if (res.success && res.data) {
                                          const d = res.data
                                          const conflitos: any[] = []
                                          if (
                                            selectedCliente.razao_social &&
                                            selectedCliente.razao_social.trim().toLowerCase() !==
                                              d.razao_social.toLowerCase()
                                          ) {
                                            conflitos.push({
                                              campo: 'razao_social',
                                              label: 'Razão Social',
                                              valorAtual: selectedCliente.razao_social,
                                              valorReceita: d.razao_social,
                                            })
                                          }
                                          if (
                                            selectedCliente.endereco &&
                                            selectedCliente.endereco.trim().toLowerCase() !==
                                              d.logradouro.toLowerCase()
                                          ) {
                                            conflitos.push({
                                              campo: 'endereco',
                                              label: 'Logradouro',
                                              valorAtual: selectedCliente.endereco,
                                              valorReceita: d.logradouro,
                                            })
                                          }
                                          if (
                                            selectedCliente.cidade &&
                                            selectedCliente.cidade.trim().toLowerCase() !==
                                              d.municipio.toLowerCase()
                                          ) {
                                            conflitos.push({
                                              campo: 'cidade',
                                              label: 'Cidade',
                                              valorAtual: selectedCliente.cidade,
                                              valorReceita: d.municipio,
                                            })
                                          }
                                          if (conflitos.length > 0) {
                                            setConflitosCnpjCliente(conflitos)
                                            setPendenteDadosReceitaCliente(d)
                                          } else {
                                            const payload: any = {}
                                            if (!selectedCliente.razao_social && d.razao_social)
                                              payload.razao_social = d.razao_social
                                            if (!selectedCliente.nome_fantasia && d.nome_fantasia)
                                              payload.nome_fantasia = d.nome_fantasia
                                            if (!selectedCliente.endereco && d.logradouro)
                                              payload.endereco = d.logradouro
                                            if (!selectedCliente.numero && d.numero)
                                              payload.numero = d.numero
                                            if (!selectedCliente.complemento && d.complemento)
                                              payload.complemento = d.complemento
                                            if (!selectedCliente.bairro && d.bairro)
                                              payload.bairro = d.bairro
                                            if (!selectedCliente.cidade && d.municipio)
                                              payload.cidade = d.municipio
                                            if (!selectedCliente.estado && d.uf)
                                              payload.estado = d.uf
                                            if (!selectedCliente.cep && d.cep) payload.cep = d.cep
                                            if (!selectedCliente.telefone && d.telefone)
                                              payload.telefone = d.telefone
                                            if (!selectedCliente.email && d.email)
                                              payload.email = d.email
                                            if (d.situacao_cadastral)
                                              payload.situacao_cadastral = d.situacao_cadastral
                                            if (d.cnae_principal)
                                              payload.cnae_principal = d.cnae_principal
                                            if (
                                              !selectedCliente.data_nascimento_fundacao &&
                                              d.data_abertura
                                            )
                                              payload.data_nascimento_fundacao = d.data_abertura
                                            await updateCliente(selectedCliente.id, payload)
                                          }
                                        }
                                      } catch (e) {
                                        console.error('Erro na busca CNPJ:', e)
                                      } finally {
                                        setIsCnpjBuscandoReceita(false)
                                      }
                                    }
                                  }}
                                />
                                {isCnpjBuscandoReceita && (
                                  <span title="Buscando na Receita Federal...">
                                    <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin shrink-0" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-12 shrink-0">CPF:</span>
                              <InlineEditField
                                value={selectedCliente.cpf}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                    {selectedCliente.cpf || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="000.000.000-00"
                                onSave={async (val) => handleUpdateClienteField('cpf', String(val))}
                              />
                            </div>
                          </div>

                          {/* Situação Cadastral e CNAE */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Situação:</span>
                              <InlineEditField
                                value={selectedCliente.situacao_cadastral}
                                displayValue={
                                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200">
                                    {selectedCliente.situacao_cadastral || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="Ex: ATIVA"
                                onSave={async (val) =>
                                  handleUpdateClienteField('situacao_cadastral', String(val))
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-12 shrink-0">CNAE:</span>
                              <InlineEditField
                                value={selectedCliente.cnae_principal}
                                displayValue={
                                  <span
                                    className="text-gray-800 text-[11px] truncate block max-w-[180px]"
                                    title={selectedCliente.cnae_principal}
                                  >
                                    {selectedCliente.cnae_principal || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="CNAE Principal"
                                onSave={async (val) =>
                                  handleUpdateClienteField('cnae_principal', String(val))
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Inscr. Est.:</span>
                              <InlineEditField
                                value={selectedCliente.inscricao_estadual}
                                displayValue={
                                  <span className="text-gray-800">
                                    {selectedCliente.inscricao_estadual || 'Não informada'}
                                  </span>
                                }
                                type="text"
                                placeholder="039/0129482 ou Isento"
                                onSave={async (val) =>
                                  handleUpdateClienteField('inscricao_estadual', String(val))
                                }
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-12 shrink-0">RG:</span>
                              <InlineEditField
                                value={selectedCliente.rg}
                                displayValue={
                                  <span className="text-gray-800">
                                    {selectedCliente.rg || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="RG"
                                onSave={async (val) => handleUpdateClienteField('rg', String(val))}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Nasc./Fund.:</span>
                            <InlineEditField
                              value={selectedCliente.data_nascimento_fundacao}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.data_nascimento_fundacao
                                    ? formatDate(selectedCliente.data_nascimento_fundacao)
                                    : 'Não informada'}
                                </span>
                              }
                              type="date"
                              placeholder="DD/MM/AAAA"
                              onSave={async (val) =>
                                handleUpdateClienteField('data_nascimento_fundacao', String(val))
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Contato resp.:</span>
                            <InlineEditField
                              value={selectedCliente.contato}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.contato || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="Nome do responsável ou sócio"
                              onSave={async (val) =>
                                handleUpdateClienteField('contato', String(val))
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Email:</span>
                            <InlineEditField
                              value={selectedCliente.email}
                              displayValue={
                                <span className="text-emerald-700 font-medium">
                                  {selectedCliente.email || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="email@exemplo.com.br"
                              onSave={async (val) => handleUpdateClienteField('email', String(val))}
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-gray-500 w-24 shrink-0">Telefone:</span>
                            <InlineEditField
                              value={selectedCliente.telefone}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedCliente.telefone || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="(00) 00000-0000"
                              onSave={async (val) =>
                                handleUpdateClienteField(
                                  'telefone',
                                  formatWhatsAppPhone(String(val)),
                                )
                              }
                            />
                          </div>

                          <div className="flex items-center gap-2 bg-emerald-50/50 p-1.5 rounded-lg border border-emerald-100">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-900 font-semibold w-24 shrink-0">
                              WhatsApp:
                            </span>
                            <InlineEditField
                              value={selectedCliente.whatsapp || selectedCliente.telefone || ''}
                              displayValue={
                                <span className="font-bold text-emerald-700">
                                  {selectedCliente.whatsapp ||
                                    selectedCliente.telefone ||
                                    'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="(00) 00000-0000"
                              onSave={async (val) =>
                                handleUpdateClienteField(
                                  'whatsapp',
                                  formatWhatsAppPhone(String(val)),
                                )
                              }
                            />
                          </div>

                          {/* Endereço detalhado */}
                          <div className="pt-2 border-t border-gray-100 space-y-2">
                            <div className="flex items-center gap-2">
                              <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-24 shrink-0">Logradouro:</span>
                              <InlineEditField
                                value={selectedCliente.endereco}
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedCliente.endereco || 'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="Rua, Av..."
                                className="flex-1"
                                onSave={async (val) =>
                                  handleUpdateClienteField('endereco', String(val))
                                }
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0 pl-5">Número:</span>
                                <InlineEditField
                                  value={selectedCliente.numero}
                                  displayValue={
                                    <span className="text-gray-800">
                                      {selectedCliente.numero || 'S/N'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="Nº"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('numero', String(val))
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0">Bairro:</span>
                                <InlineEditField
                                  value={selectedCliente.bairro}
                                  displayValue={
                                    <span className="text-gray-800">
                                      {selectedCliente.bairro || 'Não inf.'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="Bairro"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('bairro', String(val))
                                  }
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0 pl-5">CEP:</span>
                                <InlineEditField
                                  value={selectedCliente.cep}
                                  displayValue={
                                    <span className="font-mono text-gray-800 text-[11px]">
                                      {selectedCliente.cep || '00000-000'}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="00000-000"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('cep', String(val))
                                  }
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500 w-16 shrink-0">Estado:</span>
                                <InlineEditField
                                  value={
                                    selectedCliente.estado ||
                                    (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')
                                  }
                                  displayValue={
                                    <span className="font-bold text-gray-800 uppercase">
                                      {selectedCliente.estado ||
                                        (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')}
                                    </span>
                                  }
                                  type="text"
                                  placeholder="RS / SC"
                                  onSave={async (val) =>
                                    handleUpdateClienteField('estado', String(val))
                                  }
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0 pl-5">Complemento:</span>
                              <InlineEditField
                                value={selectedCliente.complemento}
                                displayValue={
                                  <span className="text-gray-700 italic">
                                    {selectedCliente.complemento || 'Nenhum'}
                                  </span>
                                }
                                type="text"
                                placeholder="Sala, bloco..."
                                className="flex-1"
                                onSave={async (val) =>
                                  handleUpdateClienteField('complemento', String(val))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Localização da Instalação */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2.5">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          Localização da Instalação
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Cidade / UF:</span>
                            <InlineEditField
                              value={selectedCliente.cidade}
                              displayValue={
                                <span className="font-semibold text-gray-800">
                                  {selectedCliente.cidade || 'Não informada'}
                                </span>
                              }
                              type="text"
                              placeholder="Cidade/UF"
                              onSave={async (val) =>
                                handleUpdateClienteField('cidade', String(val))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Latitude:</span>
                              <InlineEditField
                                value={selectedSistema?.latitude ?? 0}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px]">
                                    {selectedSistema?.latitude
                                      ? `${selectedSistema.latitude}°`
                                      : 'Não inf.'}
                                  </span>
                                }
                                type="number"
                                step="0.0001"
                                unit="°"
                                placeholder="-27.6341"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('latitude', Number(val))
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Longitude:</span>
                              <InlineEditField
                                value={selectedSistema?.longitude ?? 0}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px]">
                                    {selectedSistema?.longitude
                                      ? `${selectedSistema.longitude}°`
                                      : 'Não inf.'}
                                  </span>
                                }
                                type="number"
                                step="0.0001"
                                unit="°"
                                placeholder="-52.2739"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('longitude', Number(val))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Concessionária de Energia */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2.5">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-emerald-600" />
                          Concessionária de Energia
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Nº da UC:</span>
                            <InlineEditField
                              value={ucExibida}
                              displayValue={
                                <span className="font-mono font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs">
                                  {ucExibida || 'Não informada'}
                                </span>
                              }
                              type="text"
                              placeholder="Ex: 3012847561"
                              onSave={async (val) =>
                                handleUpdateSistemaField('numero_uc', String(val))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0">Concessionária:</span>
                              <InlineEditField
                                value={concessionariaExibida}
                                displayValue={
                                  <span className="font-bold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {concessionariaExibida || 'Não informada'}
                                  </span>
                                }
                                type="text"
                                placeholder="RGE, CPFL, Celesc..."
                                onSave={async (val) => {
                                  await handleUpdateClienteField('concessionaria', String(val))
                                  await handleUpdateSistemaField('concessionaria', String(val))
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Classe:</span>
                              <InlineEditField
                                value={classeConsumoExibida}
                                displayValue={
                                  <span className="font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {classeConsumoExibida || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                placeholder="Residencial, Comercial..."
                                onSave={async (val) => {
                                  await handleUpdateClienteField('classe_consumo', String(val))
                                  await handleUpdateSistemaField('classe_consumo', String(val))
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-24 shrink-0">Consumo médio:</span>
                              <InlineEditField
                                value={selectedCliente.consumo_kwh_mes || 0}
                                displayValue={
                                  <span className="font-bold text-gray-800">
                                    {selectedCliente.consumo_kwh_mes
                                      ? `${selectedCliente.consumo_kwh_mes} kWh/mês`
                                      : 'Não informado'}
                                  </span>
                                }
                                type="number"
                                unit="kWh"
                                placeholder="Ex: 650"
                                onSave={async (val) =>
                                  handleUpdateClienteField('consumo_kwh_mes', Number(val) || 0)
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Tarifa:</span>
                              <InlineEditField
                                value={tarifaExibida}
                                displayValue={
                                  <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                                    {tarifaExibida > 0
                                      ? `R$ ${Number(tarifaExibida).toFixed(2)}`
                                      : 'Não inf.'}
                                  </span>
                                }
                                type="number"
                                step="0.01"
                                placeholder="0.95"
                                onSave={async (val) => {
                                  const num = Number(val) || 0
                                  await handleUpdateClienteField('tarifa', num)
                                  await handleUpdateSistemaField('tarifa', num)
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-24 shrink-0">Padrão entrada:</span>
                            <InlineEditField
                              value={selectedSistema?.padrao_entrada ?? 'RIC BT Categoria A2'}
                              displayValue={
                                <span className="font-medium text-gray-800">
                                  {selectedSistema?.padrao_entrada || 'Não informado'}
                                </span>
                              }
                              type="text"
                              placeholder="Ex: RIC BT Categoria A2"
                              onSave={async (val) =>
                                handleUpdateSistemaField('padrao_entrada', String(val))
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Atendimento:</span>
                              <InlineEditField
                                value={selectedSistema?.tipo_atendimento || 'aéreo'}
                                displayValue={
                                  <span className="capitalize font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {selectedSistema?.tipo_atendimento || 'aéreo'}
                                  </span>
                                }
                                type="select"
                                options={ATENDIMENTOS}
                                onSave={async (val) =>
                                  handleUpdateSistemaField(
                                    'tipo_atendimento',
                                    val as TipoAtendimento,
                                  )
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">Fases:</span>
                              <InlineEditField
                                value={selectedSistema?.numero_fases || 'trifásico'}
                                displayValue={
                                  <span className="capitalize font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {selectedSistema?.numero_fases || 'trifásico'}
                                  </span>
                                }
                                type="select"
                                options={FASES}
                                onSave={async (val) =>
                                  handleUpdateSistemaField('numero_fases', val as NumeroFases)
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-20 shrink-0">Seção cabos:</span>
                              <InlineEditField
                                value={selectedSistema?.secao_cabos || '16 mm²'}
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedSistema?.secao_cabos || 'Não informada'}
                                  </span>
                                }
                                type="text"
                                unit="mm²"
                                placeholder="Ex: 16 mm²"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('secao_cabos', String(val))
                                }
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <Gauge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-gray-500 w-16 shrink-0">Disjuntor:</span>
                              <InlineEditField
                                value={selectedSistema?.amperagem_disjuntor || '40 A'}
                                displayValue={
                                  <span className="font-semibold text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                    {selectedSistema?.amperagem_disjuntor || 'Não inf.'}
                                  </span>
                                }
                                type="text"
                                unit="A"
                                placeholder="Ex: 40 A"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('amperagem_disjuntor', String(val))
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Instalação Elétrica e Telhado */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-2.5">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-emerald-600" />
                          Instalação Elétrica e Telhado
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200">
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                              <Calendar className="w-3 h-3" />
                              Data Instalação
                            </div>
                            <InlineEditField
                              value={dataInstalacaoExibida}
                              displayValue={
                                <span className="font-bold text-gray-800">
                                  {dataInstalacaoExibida
                                    ? formatDate(dataInstalacaoExibida)
                                    : 'Não definida'}
                                </span>
                              }
                              type="date"
                              placeholder="DD/MM/AAAA"
                              onSave={async (val) =>
                                handleUpdateSistemaField('data_instalacao', String(val))
                              }
                            />
                          </div>

                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200">
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                              <Zap className="w-3 h-3 text-emerald-600" />
                              Potência Total
                            </div>
                            <InlineEditField
                              value={potenciaExibida}
                              displayValue={
                                <span className="font-black text-emerald-700 text-sm">
                                  {potenciaExibida} kWp
                                </span>
                              }
                              type="number"
                              step="0.1"
                              min={0}
                              unit="kWp"
                              placeholder="0"
                              onSave={async (val) =>
                                handleUpdateSistemaField('potencia_total_kwp', Number(val))
                              }
                            />
                          </div>

                          <div className="p-2.5 bg-gray-50/70 rounded-lg border border-gray-200">
                            <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                              <Home className="w-3 h-3" />
                              Tipo Telhado
                            </div>
                            <InlineEditField
                              value={telhadoExibido}
                              displayValue={
                                <span className="font-semibold text-gray-800 text-xs">
                                  {getTelhadoLabel(telhadoExibido)}
                                </span>
                              }
                              type="select"
                              options={TELHADOS}
                              onSave={async (val) =>
                                handleUpdateSistemaField('tipo_telhado', val as TelhadoTipo)
                              }
                            />
                          </div>
                        </div>
                      </div>

                      {/* Equipamentos Fotovoltaicos */}
                      <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                        <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-emerald-600" />
                          Equipamentos Fotovoltaicos
                        </div>

                        {/* Módulos */}
                        <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-gray-200/70 pb-1.5">
                            <span className="font-bold text-gray-800 flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-blue-600" />
                              Módulos Fotovoltaicos
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 uppercase font-semibold">
                                Qtd:
                              </span>
                              <InlineEditField
                                value={
                                  selectedSistema?.quantidade_modulos ??
                                  selectedSistema?.quantidade_placas ??
                                  selectedCliente.placas_qtd ??
                                  0
                                }
                                displayValue={
                                  <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-xs border border-blue-200">
                                    {selectedSistema?.quantidade_modulos ??
                                      selectedSistema?.quantidade_placas ??
                                      selectedCliente.placas_qtd ??
                                      0}{' '}
                                    un
                                  </span>
                                }
                                type="number"
                                step="1"
                                min={0}
                                unit="un"
                                placeholder="0"
                                onSave={async (val) => {
                                  const num = Number(val)
                                  await handleUpdateSistemaField('quantidade_modulos', num)
                                  await handleUpdateSistemaField('quantidade_placas', num)
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">Fabricante:</span>
                              <InlineEditField
                                value={
                                  selectedSistema?.fabricante_modulos ||
                                  selectedSistema?.marca_placas ||
                                  selectedCliente.placas_marca ||
                                  'Canadian Solar'
                                }
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedSistema?.fabricante_modulos ||
                                      selectedSistema?.marca_placas ||
                                      selectedCliente.placas_marca ||
                                      'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="Canadian Solar, Trina Solar"
                                onSave={async (val) => {
                                  const s = String(val)
                                  await handleUpdateSistemaField('fabricante_modulos', s)
                                  await handleUpdateSistemaField('marca_placas', s)
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">Pot. Pico:</span>
                              <InlineEditField
                                value={
                                  selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida
                                }
                                displayValue={
                                  <span className="font-semibold text-emerald-800">
                                    {selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida}{' '}
                                    kWp
                                  </span>
                                }
                                type="number"
                                step="0.01"
                                min={0}
                                unit="kWp"
                                placeholder="0"
                                onSave={async (val) =>
                                  handleUpdateSistemaField('potencia_pico_modulos_kwp', Number(val))
                                }
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                            <span className="text-gray-500 w-16 shrink-0">Modelo:</span>
                            <InlineEditField
                              value={
                                selectedSistema?.modelo_modulos || 'CS3W-455MS MONOCRISTAL 455Wp'
                              }
                              displayValue={
                                <span className="font-mono text-gray-800 text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200">
                                  {selectedSistema?.modelo_modulos ||
                                    'CS3W-455MS MONOCRISTAL 455Wp'}
                                </span>
                              }
                              type="text"
                              placeholder="Modelo do módulo"
                              className="flex-1"
                              onSave={async (val) =>
                                handleUpdateSistemaField('modelo_modulos', String(val))
                              }
                            />
                          </div>
                        </div>

                        {/* Inversores */}
                        <div className="p-3 bg-gray-50/50 rounded-lg border border-gray-200 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-gray-200/70 pb-1.5">
                            <span className="font-bold text-gray-800 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 text-purple-600" />
                              Inversor Solar
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400 uppercase font-semibold">
                                Potência:
                              </span>
                              <InlineEditField
                                value={
                                  selectedSistema?.potencia_pico_inversores_kwp ?? potenciaExibida
                                }
                                displayValue={
                                  <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded text-xs border border-purple-200">
                                    {selectedSistema?.potencia_pico_inversores_kwp ??
                                      potenciaExibida}{' '}
                                    kWp
                                  </span>
                                }
                                type="number"
                                step="0.1"
                                min={0}
                                unit="kWp"
                                placeholder="0"
                                onSave={async (val) =>
                                  handleUpdateSistemaField(
                                    'potencia_pico_inversores_kwp',
                                    Number(val),
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">Fabricante:</span>
                              <InlineEditField
                                value={
                                  selectedSistema?.fabricante_inversores ||
                                  selectedCliente.inversor_marca ||
                                  'Fronius'
                                }
                                displayValue={
                                  <span className="font-medium text-gray-800">
                                    {selectedSistema?.fabricante_inversores ||
                                      selectedCliente.inversor_marca ||
                                      'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="Fronius, Huawei, Growatt"
                                onSave={async (val) => {
                                  const s = String(val)
                                  await handleUpdateSistemaField('fabricante_inversores', s)
                                  await handleUpdateClienteField('inversor_marca', s)
                                }}
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 w-16 shrink-0">Modelo:</span>
                              <InlineEditField
                                value={
                                  selectedSistema?.modelo_inversores ||
                                  selectedCliente.inversor_modelo ||
                                  'Fronius Symo 12.0-3-M'
                                }
                                displayValue={
                                  <span className="font-semibold text-gray-800 truncate">
                                    {selectedSistema?.modelo_inversores ||
                                      selectedCliente.inversor_modelo ||
                                      'Não informado'}
                                  </span>
                                }
                                type="text"
                                placeholder="Modelo do inversor"
                                className="flex-1"
                                onSave={async (val) => {
                                  const s = String(val)
                                  await handleUpdateSistemaField('modelo_inversores', s)
                                  await handleUpdateClienteField('inversor_modelo', s)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Histórico de Manutenções na seção de Detalhes */}
                      {clientManutencoes.length > 0 && (
                        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs space-y-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                            Histórico de Ordens de Manutenção ({clientManutencoes.length})
                          </h4>
                          <div className="space-y-2.5">
                            {clientManutencoes.map((m) => (
                              <div
                                key={m.id}
                                className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 space-y-2 text-xs"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    {getServiceIcon(m.tipo)}
                                    <span className="font-semibold text-gray-900">{m.tipo}</span>
                                  </div>
                                  <StatusBadge status={m.status} />
                                </div>
                                <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                  <span>{formatDate(m.data)}</span>
                                  {m.tecnico && <span>• Técnico: {m.tecnico}</span>}
                                </div>
                                {m.descricao && <p className="text-gray-600">{m.descricao}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* SEÇÃO: HISTÓRICO DE PROPOSTAS & CONTROLE DE REVISÕES      */}
                  {/* ======================================================== */}
                  {clientOrcamentosSolar.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 rounded-xl p-3.5 border border-emerald-200/90 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                          <Sun className="w-4 h-4 text-emerald-600" />
                          <span>Propostas Solares & Revisões ({clientOrcamentosSolar.length})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setOrcamentoSolarVisualizar(null)
                            setIsModalOrcamentoSolarOpen(true)
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 hover:bg-emerald-50 transition-colors"
                        >
                          + Novo Orçamento
                        </button>
                      </div>

                      <div className="space-y-2">
                        {clientOrcamentosSolar.map((o) => {
                          const revNumero = o.numero_revisao || 1
                          const revStatus = o.status_revisao || 'em análise'

                          // Estilo de status colorido conforme especificação:
                          // em análise: cinza/âmbar, enviada ao cliente: azul, aprovada: verde, rejeitada: vermelha
                          let statusClasses = 'bg-amber-100 text-amber-800 border-amber-200'
                          if (revStatus === 'aprovada') {
                            statusClasses = 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          } else if (revStatus === 'enviada ao cliente') {
                            statusClasses = 'bg-blue-100 text-blue-800 border-blue-300'
                          } else if (revStatus === 'rejeitada') {
                            statusClasses = 'bg-red-100 text-red-800 border-red-300'
                          }

                          return (
                            <div
                              key={o.id}
                              className="bg-white p-3 rounded-xl border border-gray-200 hover:border-emerald-300 shadow-2xs transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-start sm:items-center gap-3">
                                {/* Badge de Revisão */}
                                <div className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-black text-xs shrink-0 shadow-2xs">
                                  Revisão {revNumero}
                                </div>

                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-extrabold text-gray-900 text-sm">
                                      {formatCurrency(o.valor_investimento)}
                                    </span>
                                    {/* Status Colorido */}
                                    <span
                                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusClasses}`}
                                    >
                                      {revStatus}
                                    </span>
                                    {o.revisao_de && (
                                      <span className="text-[10px] text-gray-400">(derivada)</span>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-gray-500 flex items-center gap-2 flex-wrap">
                                    <span>
                                      <strong>Data de emissão:</strong>{' '}
                                      {formatDate(o.data_orcamento || o.created)}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {o.potencia_kwp.toFixed(2)} kWp ({o.numero_placas} placas)
                                    </span>
                                    {o.geracao_mensal_kwh ? (
                                      <>
                                        <span>•</span>
                                        <span className="text-emerald-700 font-semibold">
                                          {o.geracao_mensal_kwh} kWh/mês
                                        </span>
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {/* Ações: Visualizar Documento (reutiliza gerador), Editar/Gerar Revisão, WhatsApp */}
                              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const { abrirOrcamentoEmNovaAba } =
                                      await import('@/lib/orcamentoGenerator')
                                    const { calcularOrcamentoSolar } =
                                      await import('@/lib/energiaSolar')
                                    const calc = calcularOrcamentoSolar({
                                      consumoKwhMes: o.consumo_kwh_mes,
                                      tipoCliente: o.tipo_cliente || 'residencial',
                                      tarifaKwh: o.tarifa_kwh,
                                      potenciaKwp: o.potencia_kwp,
                                      orientacaoTelhado: o.orientacao_telhado,
                                      valorInvestimentoInformado: o.valor_investimento,
                                      custos: {
                                        maoDeObra: o.custo_mao_de_obra || 0,
                                        materiaisExtras: o.custo_materiais_extras || 0,
                                        freteGuincho: o.custo_frete_guincho || 0,
                                        subestacao: o.custo_subestacao || 0,
                                        terceirizacao: o.custo_terceirizacao || 0,
                                        administracao: o.custo_administracao || 0,
                                        marketingCombustivel: o.custo_marketing_combustivel || 0,
                                        riscoEngenharia: o.custo_risco_engenharia || 0,
                                        comissaoComercial: o.custo_comissao_comercial || 0,
                                        indicacao: o.custo_indicacao || 0,
                                        impostos: o.custo_impostos || 0,
                                      },
                                    })
                                    abrirOrcamentoEmNovaAba({
                                      cliente: {
                                        nome: selectedCliente.nome,
                                        cpfOuCnpj:
                                          selectedCliente.cnpj || selectedCliente.cpf || '',
                                        endereco: [
                                          selectedCliente.endereco,
                                          selectedCliente.numero,
                                          selectedCliente.bairro,
                                        ]
                                          .filter(Boolean)
                                          .join(', '),
                                        municipio: selectedCliente.cidade || 'Erechim / RS',
                                        email: selectedCliente.email || '',
                                        telefone: selectedCliente.telefone || '',
                                        tipoCliente: o.tipo_cliente,
                                      },
                                      representanteComercial: o.autor || 'Delfos Solar',
                                      sistema: {
                                        potenciaKwp: o.potencia_kwp,
                                        consumoKwhMes: o.consumo_kwh_mes,
                                        numeroPlacas: o.numero_placas,
                                        potenciaPlacaWp: o.potencia_placa_wp,
                                        marcaPlacas: o.marca_painel,
                                        marcaInversor: o.marca_inversor,
                                        quantidadeInversores: o.quantidade_inversores,
                                        tipoEstrutura: o.tipo_estrutura,
                                        orientacaoTelhado: o.orientacao_telhado,
                                        areaNecessariaM2: o.area_necessaria_m2,
                                        codigoFiname: o.codigo_finame,
                                        prazoEntregaDias: 30,
                                      },
                                      calculos: calc,
                                      dataEmissao: o.data_orcamento || o.created,
                                      validadeDias: o.validade_dias || 5,
                                      observacoes: o.observacoes,
                                    })
                                  }}
                                  className="text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                  title={`Visualizar Proposta (Revisão ${revNumero})`}
                                >
                                  <FileText className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Visualizar Proposta</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOrcamentoSolarVisualizar(o)
                                    setIsModalOrcamentoSolarOpen(true)
                                  }}
                                  className="text-[11px] font-bold text-gray-700 hover:text-emerald-800 hover:bg-gray-100 px-2 py-1 rounded-lg border border-gray-200 transition-colors"
                                  title="Editar parâmetros e gerar nova revisão"
                                >
                                  Alterar / Nova Rev.
                                </button>

                                <button
                                  type="button"
                                  disabled={!selectedCliente.whatsapp && !selectedCliente.telefone}
                                  title={
                                    !selectedCliente.whatsapp && !selectedCliente.telefone
                                      ? 'Cadastre o WhatsApp do cliente para enviar'
                                      : 'Enviar orçamento solar por WhatsApp'
                                  }
                                  onClick={async () => {
                                    const { calcularOrcamentoSolar } =
                                      await import('@/lib/energiaSolar')
                                    const calc = calcularOrcamentoSolar({
                                      consumoKwhMes: o.consumo_kwh_mes,
                                      tipoCliente: o.tipo_cliente || 'residencial',
                                      tarifaKwh: o.tarifa_kwh,
                                      potenciaKwp: o.potencia_kwp,
                                      orientacaoTelhado: o.orientacao_telhado,
                                      valorInvestimentoInformado: o.valor_investimento,
                                      custos: {
                                        maoDeObra: o.custo_mao_de_obra || 0,
                                        materiaisExtras: o.custo_materiais_extras || 0,
                                        freteGuincho: o.custo_frete_guincho || 0,
                                        subestacao: o.custo_subestacao || 0,
                                        terceirizacao: o.custo_terceirizacao || 0,
                                        administracao: o.custo_administracao || 0,
                                        marketingCombustivel: o.custo_marketing_combustivel || 0,
                                        riscoEngenharia: o.custo_risco_engenharia || 0,
                                        comissaoComercial: o.custo_comissao_comercial || 0,
                                        indicacao: o.custo_indicacao || 0,
                                        impostos: o.custo_impostos || 0,
                                      },
                                    })
                                    setDocParaEnviarWhatsApp({
                                      tipo: 'orcamento_solar',
                                      referenciaId: o.id,
                                      dadosSolar: {
                                        cliente: {
                                          nome: selectedCliente.nome,
                                          cpfOuCnpj:
                                            selectedCliente.cnpj || selectedCliente.cpf || '',
                                          endereco: [
                                            selectedCliente.endereco,
                                            selectedCliente.numero,
                                            selectedCliente.bairro,
                                          ]
                                            .filter(Boolean)
                                            .join(', '),
                                          municipio: selectedCliente.cidade || 'Erechim / RS',
                                          email: selectedCliente.email || '',
                                          telefone: selectedCliente.telefone || '',
                                          tipoCliente: o.tipo_cliente,
                                        },
                                        representanteComercial: o.autor || 'Delfos Solar',
                                        sistema: {
                                          potenciaKwp: o.potencia_kwp,
                                          consumoKwhMes: o.consumo_kwh_mes,
                                          numeroPlacas: o.numero_placas,
                                          potenciaPlacaWp: o.potencia_placa_wp,
                                          marcaPlacas: o.marca_painel,
                                          marcaInversor: o.marca_inversor,
                                          quantidadeInversores: o.quantidade_inversores,
                                          tipoEstrutura: o.tipo_estrutura,
                                          orientacaoTelhado: o.orientacao_telhado,
                                          areaNecessariaM2: o.area_necessaria_m2,
                                          codigoFiname: o.codigo_finame,
                                          prazoEntregaDias: 30,
                                        },
                                        calculos: calc,
                                        dataEmissao: o.data_orcamento || o.created,
                                        validadeDias: o.validade_dias || 5,
                                        observacoes: o.observacoes,
                                      },
                                    })
                                    setModalEnviarDocWhatsAppOpen(true)
                                  }}
                                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Send className="w-3 h-3 text-emerald-600" />
                                  <span className="hidden sm:inline">WhatsApp</span>
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* SEÇÃO: PROPOSTAS O&M GERADAS DO CLIENTE                   */}
                  {/* Lista propostas anteriores com opção de abrir/regenerar   */}
                  {/* ======================================================== */}
                  {clientPropostasOM.length > 0 && (
                    <div className="bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/40 rounded-xl p-3.5 border border-emerald-200/90 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span>Propostas O&M Geradas ({clientPropostasOM.length})</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPropostaVisualizar(null)
                            setIsModalPropostaOpen(true)
                          }}
                          className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-300 hover:bg-emerald-50 transition-colors"
                        >
                          + Nova Proposta
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {clientPropostasOM.map((p) => {
                          return (
                            <div
                              key={p.id}
                              className="bg-white p-3 rounded-lg border border-emerald-100 hover:border-emerald-300 shadow-2xs space-y-1.5 transition-all text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-emerald-800">
                                  Proposta O&M {p.potencia_kwp ? `(${p.potencia_kwp} kWp)` : ''}
                                </span>
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                                  {p.status || 'Proposta Enviada'}
                                </span>
                              </div>

                              <div className="flex items-baseline justify-between text-[11px]">
                                <span className="text-gray-500">
                                  Ativo Protegido: {formatCurrency(p.valor_ativo_protegido || 0)}
                                  /mês
                                </span>
                                <span className="font-semibold text-emerald-700">
                                  3 Planos Comparados
                                </span>
                              </div>

                              <div className="text-[10px] text-gray-400 flex items-center justify-between pt-1 border-t border-gray-100">
                                <span>{formatDate(p.data_proposta || p.created)}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPropostaVisualizar(p)
                                      setIsModalPropostaOpen(true)
                                    }}
                                    className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                                    title="Visualizar parâmetros e regenerar"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const calc = calcularPropostaOM({
                                        geracaoMensalKwh: p.geracao_mensal_kwh,
                                        valorKwh: p.valor_kwh,
                                      })
                                      abrirPropostaEmNovaAba({
                                        cliente: {
                                          nome: selectedCliente.nome,
                                          cpfOuCnpj: selectedCliente.cnpj || selectedCliente.cpf,
                                          endereco: selectedCliente.endereco,
                                          municipio: selectedCliente.cidade,
                                          email: selectedCliente.email,
                                          telefone: selectedCliente.telefone,
                                        },
                                        tecnico: {
                                          potenciaKwp: p.potencia_kwp,
                                          geracaoMediaKwh: p.geracao_mensal_kwh,
                                          marcaInversores: p.marca_inversores,
                                          tipoInstalacao: p.tipo_instalacao,
                                          numeroModulos: p.numero_modulos,
                                        },
                                        parametros: {
                                          valorKwh: p.valor_kwh,
                                          distanciaKm: p.distancia_km,
                                          valorKm: p.valor_km,
                                        },
                                        calculos: calc,
                                        dataEmissao: p.data_proposta || p.created,
                                        autor: p.autor,
                                      })
                                    }}
                                    className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-0.5"
                                  >
                                    <span>Ver PDF</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      !selectedCliente.whatsapp && !selectedCliente.telefone
                                    }
                                    title={
                                      !selectedCliente.whatsapp && !selectedCliente.telefone
                                        ? 'Cadastre o WhatsApp do cliente para enviar'
                                        : 'Enviar proposta O&M por WhatsApp'
                                    }
                                    onClick={() => {
                                      const calc = calcularPropostaOM({
                                        geracaoMensalKwh: p.geracao_mensal_kwh,
                                        valorKwh: p.valor_kwh,
                                      })
                                      setDocParaEnviarWhatsApp({
                                        tipo: 'proposta_om',
                                        referenciaId: p.id,
                                        dadosOM: {
                                          cliente: {
                                            nome: selectedCliente.nome,
                                            cpfOuCnpj: selectedCliente.cnpj || selectedCliente.cpf,
                                            endereco: selectedCliente.endereco,
                                            municipio: selectedCliente.cidade,
                                            email: selectedCliente.email,
                                            telefone: selectedCliente.telefone,
                                          },
                                          tecnico: {
                                            potenciaKwp: p.potencia_kwp,
                                            geracaoMediaKwh: p.geracao_mensal_kwh,
                                            marcaInversores: p.marca_inversores,
                                            tipoInstalacao: p.tipo_instalacao,
                                            numeroModulos: p.numero_modulos,
                                          },
                                          parametros: {
                                            valorKwh: p.valor_kwh,
                                            distanciaKm: p.distancia_km,
                                            valorKm: p.valor_km,
                                          },
                                          calculos: calc,
                                          dataEmissao: p.data_proposta || p.created,
                                          autor: p.autor,
                                        },
                                      })
                                      setModalEnviarDocWhatsAppOpen(true)
                                    }}
                                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    <Send className="w-3 h-3 text-emerald-600" />
                                    <span>WhatsApp</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* TOPO DA ABA HISTÓRICO: ÁREA RÁPIDA DE NOVA ENTRADA       */}
                  {/* Alterna Anotação vs Agendar Atividade (12 tipos)         */}
                  {/* ======================================================== */}
                  <QuickAddAtividade
                    clienteId={selectedCliente.id}
                    onAdd={addAtividade}
                    defaultMode="atividade"
                  />

                  {/* ======================================================== */}
                  {/* LINHA DO TEMPO CRONOLÓGICA ÚNICA (SEM SEPARAÇÃO POR TIPO)*/}
                  {/* Anotações, Atividades, Ligações, Reuniões, Estágios...   */}
                  {/* ======================================================== */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5 text-[#16A34A]" />
                        <span>Linha do Tempo Unificada</span>
                        <span className="text-[11px] font-normal text-gray-400 capitalize">
                          ({timelineAtividades.length}{' '}
                          {timelineAtividades.length === 1 ? 'registro' : 'registros'})
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">
                        Do mais recente para o mais antigo
                      </span>
                    </div>

                    {timelineAtividades.length === 0 ? (
                      <div className="text-center py-12 px-4 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
                        <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-gray-700">
                          Nenhum registro no histórico deste cliente
                        </p>
                        <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
                          Use a área rápida acima para registrar anotações ou agendar ligações,
                          reuniões, propostas e tarefas.
                        </p>
                      </div>
                    ) : (
                      <div className="pt-2">
                        {timelineAtividades.map((atv) => {
                          const propOM = (atv as any)._propostaOM as PropostaOM | undefined

                          if (propOM) {
                            return (
                              <div
                                key={atv.id}
                                className="group relative flex items-start gap-3 p-3.5 rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/30 hover:border-emerald-400 hover:shadow-xs transition-all my-2 text-xs"
                              >
                                {/* Ícone próprio de Proposta O&M */}
                                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5 border border-emerald-200">
                                  <FileCheck className="w-4 h-4 text-emerald-700" />
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center justify-between flex-wrap gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-emerald-950 text-sm">
                                        Proposta O&M{' '}
                                        {propOM.potencia_kwp ? `(${propOM.potencia_kwp} kWp)` : ''}
                                      </span>
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        {propOM.status || 'Emitida'}
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-gray-500 font-medium">
                                      {formatDate(propOM.data_proposta || propOM.created)}
                                    </div>
                                  </div>

                                  <div className="flex items-baseline justify-between text-xs text-gray-700 pt-0.5">
                                    <div>
                                      Plano oferecido:{' '}
                                      <span className="font-bold text-gray-900">
                                        {propOM.plano_recomendado ||
                                          (propOM.potencia_kwp
                                            ? `${propOM.potencia_kwp} kWp`
                                            : 'Essencial / Prevenção / Completo')}
                                      </span>
                                    </div>
                                    <div className="font-bold text-emerald-800 text-sm">
                                      {propOM.valor_mensal_plano
                                        ? `${formatCurrency(propOM.valor_mensal_plano)}/mês`
                                        : propOM.valor_ativo_protegido
                                          ? `${formatCurrency(propOM.valor_ativo_protegido)}/mês (ativo)`
                                          : 'Consulte opções'}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between pt-2 border-t border-emerald-100/70 text-[11px]">
                                    <span className="text-gray-400">
                                      Emitido por: {propOM.autor || 'Equipe O&M Delfos'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setPropostaVisualizar(propOM)
                                          setIsModalPropostaOpen(true)
                                        }}
                                        className="text-emerald-700 hover:text-emerald-900 font-semibold inline-flex items-center gap-1 hover:underline"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        <span>Editar</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const calc = calcularPropostaOM({
                                            geracaoMensalKwh: propOM.geracao_mensal_kwh,
                                            valorKwh: propOM.valor_kwh,
                                          })
                                          abrirPropostaEmNovaAba({
                                            cliente: {
                                              nome: selectedCliente.nome,
                                              cpfOuCnpj:
                                                selectedCliente.cnpj || selectedCliente.cpf,
                                              endereco: selectedCliente.endereco,
                                              municipio: selectedCliente.cidade,
                                              email: selectedCliente.email,
                                              telefone: selectedCliente.telefone,
                                            },
                                            tecnico: {
                                              potenciaKwp: propOM.potencia_kwp,
                                              geracaoMediaKwh: propOM.geracao_mensal_kwh,
                                              marcaInversores: propOM.marca_inversores,
                                              tipoInstalacao: propOM.tipo_instalacao,
                                              numeroModulos: propOM.numero_modulos,
                                            },
                                            parametros: {
                                              valorKwh: propOM.valor_kwh,
                                              distanciaKm: propOM.distancia_km,
                                              valorKm: propOM.valor_km,
                                            },
                                            calculos: calc,
                                            dataEmissao: propOM.data_proposta || propOM.created,
                                            autor: propOM.autor,
                                          })
                                        }}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs transition-colors"
                                      >
                                        <FileText className="w-3 h-3" />
                                        <span>Ver Proposta</span>
                                      </button>

                                      <button
                                        type="button"
                                        disabled={
                                          !selectedCliente.whatsapp && !selectedCliente.telefone
                                        }
                                        title={
                                          !selectedCliente.whatsapp && !selectedCliente.telefone
                                            ? 'Cadastre o WhatsApp do cliente para enviar'
                                            : 'Enviar proposta O&M por WhatsApp'
                                        }
                                        onClick={() => {
                                          const calc = calcularPropostaOM({
                                            geracaoMensalKwh: propOM.geracao_mensal_kwh,
                                            valorKwh: propOM.valor_kwh,
                                          })
                                          setDocParaEnviarWhatsApp({
                                            tipo: 'proposta_om',
                                            referenciaId: propOM.id,
                                            dadosOM: {
                                              cliente: {
                                                nome: selectedCliente.nome,
                                                cpfOuCnpj:
                                                  selectedCliente.cnpj || selectedCliente.cpf,
                                                endereco: selectedCliente.endereco,
                                                municipio: selectedCliente.cidade,
                                                email: selectedCliente.email,
                                                telefone: selectedCliente.telefone,
                                              },
                                              tecnico: {
                                                potenciaKwp: propOM.potencia_kwp,
                                                geracaoMediaKwh: propOM.geracao_mensal_kwh,
                                                marcaInversores: propOM.marca_inversores,
                                                tipoInstalacao: propOM.tipo_instalacao,
                                                numeroModulos: propOM.numero_modulos,
                                              },
                                              parametros: {
                                                valorKwh: propOM.valor_kwh,
                                                distanciaKm: propOM.distancia_km,
                                                valorKm: propOM.valor_km,
                                              },
                                              calculos: calc,
                                              dataEmissao: propOM.data_proposta || propOM.created,
                                              autor: propOM.autor,
                                            },
                                          })
                                          setModalEnviarDocWhatsAppOpen(true)
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg shadow-2xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      >
                                        <Send className="w-3 h-3 text-emerald-600" />
                                        <span>Enviar WhatsApp</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          }

                          return (
                            <AtividadeItem
                              key={atv.id}
                              atividade={atv}
                              onDelete={removeAtividade}
                              onToggleStatus={async (id, current) => {
                                const next = current === 'concluida' ? 'pendente' : 'concluida'
                                await updateAtividadeStatus(id, next)
                              }}
                            />
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* COLUNA DIREITA: PAINEL FIXO DE RESUMO (PIPEDRIVE SIDEBAR)        */}
          {/* Nome, telefone, cidade, potência, valor, estágio e próxima ativ. */}
          {/* ================================================================ */}
          <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 bg-[#F8FAF9] p-4 sm:p-5 space-y-4 overflow-y-auto border-t md:border-t-0">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                Resumo do Cliente
              </span>
              <span className="text-[10px] text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200 font-semibold">
                Pipedrive CRM
              </span>
            </div>

            {/* Card 1: Próxima Atividade Agendada (NOVO REQUISITO) */}
            <div className="bg-white rounded-xl p-3.5 border border-emerald-200/80 shadow-xs space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1">
                  <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  Próxima Atividade Agendada
                </span>
                {proximaAtividade && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                    Pendente
                  </span>
                )}
              </div>

              {proximaAtividade ? (
                <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-1.5 text-xs">
                  <div className="font-bold text-gray-900 leading-tight">
                    {proximaAtividade.titulo || 'Atividade Agendada'}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                    <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>{formatDateTime(proximaAtividade.data || proximaAtividade.created)}</span>
                  </div>
                  {proximaAtividade.responsavel_nome && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-600">
                      <User className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">Resp: {proximaAtividade.responsavel_nome}</span>
                    </div>
                  )}
                  {proximaAtividade.descricao && (
                    <p className="text-[11px] text-gray-600 italic line-clamp-2 pt-0.5">
                      "{proximaAtividade.descricao}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-3 px-2.5 text-center bg-gray-50/70 rounded-lg border border-dashed border-gray-200 space-y-1">
                  <Calendar className="w-5 h-5 text-gray-300 mx-auto" />
                  <p className="text-xs font-semibold text-gray-600">Nenhuma atividade pendente</p>
                  <p className="text-[11px] text-gray-400">
                    Agende uma ligação, visita ou follow-up na área rápida à esquerda.
                  </p>
                </div>
              )}
            </div>

            {/* Card 2: Estágio Atual no Funil (com seletor rápido) */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Estágio Atual no Funil
              </span>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={selectedCliente.status} />
              </div>
              <div className="pt-1 border-t border-gray-100">
                <label className="text-[10px] text-gray-400 block mb-1 font-semibold uppercase">
                  Mudar estágio rapidamente:
                </label>
                <select
                  value={selectedCliente.status}
                  onChange={async (e) =>
                    updateClienteStatus(selectedCliente.id, e.target.value as ClienteStatus)
                  }
                  className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                >
                  {ETAPAS_STATUS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Card 3: Valor Estimado */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <span>Valor Estimado</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <InlineEditField
                value={selectedCliente.valor_estimado || 0}
                displayValue={
                  <span className="text-xl font-black text-gray-900 tracking-tight block">
                    {formatCurrency(selectedCliente.valor_estimado || 0)}
                  </span>
                }
                type="number"
                unit="R$"
                step="500"
                min={0}
                placeholder="0,00"
                onSave={async (val) => handleUpdateClienteField('valor_estimado', Number(val) || 0)}
              />
              <span className="text-[11px] text-gray-400 block">Receita potencial do negócio</span>
            </div>

            {/* Card 4: Potência do Sistema */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <span>Potência do Sistema</span>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <InlineEditField
                value={potenciaExibida}
                displayValue={
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-700">{potenciaExibida}</span>
                    <span className="text-xs font-bold text-gray-500">kWp</span>
                  </div>
                }
                type="number"
                step="0.1"
                min={0}
                unit="kWp"
                placeholder="0"
                onSave={async (val) => handleUpdateSistemaField('potencia_total_kwp', Number(val))}
              />
              {geracaoExibida > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1">
                  <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{geracaoExibida.toLocaleString('pt-BR')} kWh/mês estimado</span>
                </div>
              )}
            </div>

            {/* Card 5: Contato Rápido & Cidade */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-2.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block border-b border-gray-100 pb-1.5">
                Contato & Cidade
              </span>

              {/* Nome */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Nome:</span>
                <div className="font-semibold text-gray-800 truncate">{selectedCliente.nome}</div>
              </div>

              {/* Telefone */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Telefone:</span>
                <InlineEditField
                  value={selectedCliente.telefone}
                  displayValue={
                    <div className="flex items-center gap-1 font-medium text-gray-800">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedCliente.telefone || 'Não informado'}</span>
                    </div>
                  }
                  type="text"
                  placeholder="(00) 00000-0000"
                  onSave={async (val) =>
                    handleUpdateClienteField('telefone', formatWhatsAppPhone(String(val)))
                  }
                />
              </div>

              {/* WhatsApp */}
              <div className="space-y-0.5 bg-emerald-50/70 p-2 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900">WhatsApp Oficial:</span>
                  <button
                    type="button"
                    onClick={() => setActiveClientTab('whatsapp')}
                    className="text-[10px] text-emerald-700 hover:text-emerald-900 font-semibold underline"
                  >
                    Abrir conversa
                  </button>
                </div>
                <InlineEditField
                  value={selectedCliente.whatsapp || selectedCliente.telefone || ''}
                  displayValue={
                    <div className="flex items-center gap-1 font-bold text-emerald-800">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        {selectedCliente.whatsapp || selectedCliente.telefone || 'Definir WhatsApp'}
                      </span>
                    </div>
                  }
                  type="text"
                  placeholder="(00) 00000-0000"
                  onSave={async (val) =>
                    handleUpdateClienteField('whatsapp', formatWhatsAppPhone(String(val)))
                  }
                />
              </div>

              {/* Cidade */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Cidade:</span>
                <InlineEditField
                  value={selectedCliente.cidade}
                  displayValue={
                    <div className="flex items-center gap-1 font-medium text-gray-800">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedCliente.cidade || 'Não informada'}</span>
                    </div>
                  }
                  type="text"
                  placeholder="Cidade/UF"
                  onSave={async (val) => handleUpdateClienteField('cidade', String(val))}
                />
              </div>

              {/* Email */}
              {selectedCliente.email && (
                <div className="space-y-0.5 pt-1 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400">Email:</span>
                  <div className="flex items-center gap-1 text-emerald-700 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{selectedCliente.email}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 6: Dica Pipedrive */}
            <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                Histórico Pipedrive
              </div>
              <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                Todas as anotações, ligações, reuniões e mudanças de estágio estão unificadas em
                ordem cronológica na timeline à esquerda.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nova Proposta O&M */}
      <ModalNovaPropostaOM
        isOpen={isModalPropostaOpen}
        onClose={() => {
          setIsModalPropostaOpen(false)
          setPropostaVisualizar(null)
        }}
        initialClienteId={selectedCliente?.id}
        initialProposta={propostaVisualizar}
      />

      {/* Modal Novo / Editar Orçamento Solar */}
      <ModalOrcamentoSolar
        isOpen={isModalOrcamentoSolarOpen}
        onClose={() => {
          setIsModalOrcamentoSolarOpen(false)
          setOrcamentoSolarVisualizar(null)
        }}
        initialClienteId={selectedCliente?.id}
        initialOrcamento={orcamentoSolarVisualizar}
      />

      {/* Modal Gerenciar Templates & Configuração do Gateway WhatsApp */}
      <ModalGerenciarWhatsAppTemplates
        isOpen={modalWhatsAppTemplatesOpen}
        onClose={() => setModalWhatsAppTemplatesOpen(false)}
      />

      {/* Modal Enviar Orçamento Solar ou Proposta O&M por WhatsApp */}
      {selectedCliente && docParaEnviarWhatsApp && (
        <ModalEnviarDocumentoWhatsApp
          isOpen={modalEnviarDocWhatsAppOpen}
          onClose={() => {
            setModalEnviarDocWhatsAppOpen(false)
            setDocParaEnviarWhatsApp(null)
          }}
          cliente={selectedCliente}
          tipo={docParaEnviarWhatsApp.tipo}
          referenciaId={docParaEnviarWhatsApp.referenciaId}
          dadosSolar={docParaEnviarWhatsApp.dadosSolar}
          dadosOM={docParaEnviarWhatsApp.dadosOM}
        />
      )}
    </div>
  )
}

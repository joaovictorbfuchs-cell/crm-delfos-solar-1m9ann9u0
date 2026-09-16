import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type {
  Cliente,
  Sistema,
  Manutencao,
  Atividade,
  AtividadeStatus,
  SistemaUsuario,
  ManutencaoTipo,
  ManutencaoStatus,
  Profissional,
  Projeto,
  ProjetoEvento,
  ProjetoEtapa,
  ContratoOM,
  AnomaliaOM,
  ServicoAdicionalOM,
  TimelineOM,
} from '@/types/crm'
import {
  fetchClientes,
  fetchSistemas,
  fetchManutencoes,
  fetchAtividades,
  fetchUsuarios,
  fetchProfissionais,
  fetchProjetos,
  fetchProjetoEventos,
  fetchContratosOM,
  fetchAnomaliasOM,
  fetchServicosAdicionaisOM,
  fetchTimelineOM,
  fetchServicosAvulsos,
  createServicoAvulso as apiCreateServicoAvulso,
  updateServicoAvulso as apiUpdateServicoAvulso,
  deleteServicoAvulso as apiDeleteServicoAvulso,
  createAtividade as apiCreateAtividade,
  updateAtividade as apiUpdateAtividade,
  deleteAtividade as apiDeleteAtividade,
  createManutencao as apiCreateManutencao,
  deleteManutencao as apiDeleteManutencao,
  createCliente as apiCreateCliente,
  updateCliente as apiUpdateCliente,
  updateClienteStatus as apiUpdateClienteStatus,
  bulkUpdateClientesEtapa as apiBulkUpdateClientesEtapa,
  bulkUpdateClientesResponsavel as apiBulkUpdateClientesResponsavel,
  bulkMarcarClientesFechado as apiBulkMarcarClientesFechado,
  bulkTransferirFechadosParaPosVendas as apiBulkTransferirFechadosParaPosVendas,
  bulkArquivarClientes as apiBulkArquivarClientes,
  deleteCliente as apiDeleteCliente,
  bulkDeleteClientes as apiBulkDeleteClientes,
  mesclarClientes as apiMesclarClientes,
  MesclagemOpcoes,
  upsertSistemaForCliente,
  createProfissional as apiCreateProfissional,
  updateProfissional as apiUpdateProfissional,
  deleteProfissional as apiDeleteProfissional,
  createProjeto as apiCreateProjeto,
  updateProjeto as apiUpdateProjeto,
  deleteProjeto as apiDeleteProjeto,
  createProjetoEvento as apiCreateProjetoEvento,
  createContratoOM as apiCreateContratoOM,
  updateContratoOM as apiUpdateContratoOM,
  deleteContratoOM as apiDeleteContratoOM,
  createAnomaliaOM as apiCreateAnomaliaOM,
  updateAnomaliaOM as apiUpdateAnomaliaOM,
  deleteAnomaliaOM as apiDeleteAnomaliaOM,
  createServicoAdicionalOM as apiCreateServicoAdicionalOM,
  updateServicoAdicionalOM as apiUpdateServicoAdicionalOM,
  deleteServicoAdicionalOM as apiDeleteServicoAdicionalOM,
  createTimelineOM as apiCreateTimelineOM,
  fetchPropostasOM,
  createPropostaOM as apiCreatePropostaOM,
  updatePropostaOM as apiUpdatePropostaOM,
  deletePropostaOM as apiDeletePropostaOM,
  fetchOrcamentosSolar,
  createOrcamentoSolar as apiCreateOrcamentoSolar,
  updateOrcamentoSolar as apiUpdateOrcamentoSolar,
  deleteOrcamentoSolar as apiDeleteOrcamentoSolar,
  fetchWhatsAppTemplates,
  createWhatsAppTemplate as apiCreateWhatsAppTemplate,
  updateWhatsAppTemplate as apiUpdateWhatsAppTemplate,
  deleteWhatsAppTemplate as apiDeleteWhatsAppTemplate,
  fetchWhatsAppMensagens,
  sendWhatsAppMensagem as apiSendWhatsAppMensagem,
  sendWhatsAppDocumento as apiSendWhatsAppDocumento,
  sendWhatsAppAudio as apiSendWhatsAppAudio,
  fetchWhatsAppConfigStatus,
  fetchWhatsAppConversas,
  vincularConversaCliente as apiVincularConversaCliente,
  assumirConversa as apiAssumirConversa,
  finalizarConversa as apiFinalizarConversa,
  updateWhatsAppConversa as apiUpdateWhatsAppConversa,
} from '@/services/crmService'
import type {
  OrcamentoSolar,
  PropostaOM,
  ServicoAvulso,
  WhatsAppTemplate,
  WhatsAppMensagem,
  WhatsAppConversa,
  WhatsAppConfigStatus,
} from '@/types/crm'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/contexts/AuthContext'

export type ClientTabType = 'historico' | 'projeto' | 'om' | 'whatsapp' | 'usinas'

interface ClientesContextType {
  clientes: Cliente[]
  sistemas: Sistema[]
  manutencoes: Manutencao[]
  atividades: Atividade[]
  usuarios: SistemaUsuario[]
  profissionais: Profissional[]
  projetos: Projeto[]
  projetoEventos: ProjetoEvento[]
  contratosOM: ContratoOM[]
  anomaliasOM: AnomaliaOM[]
  servicosAdicionaisOM: ServicoAdicionalOM[]
  servicosAvulsos: ServicoAvulso[]
  transferenciasCreditos: import('@/types/crm').TransferenciaCredito[]
  addTransferenciaCredito: (
    data: Parameters<typeof import('@/services/crmService').createTransferenciaCredito>[0],
  ) => Promise<import('@/types/crm').TransferenciaCredito>
  updateTransferenciaCredito: (
    id: string,
    data: Partial<import('@/types/crm').TransferenciaCredito>,
  ) => Promise<import('@/types/crm').TransferenciaCredito>
  removeTransferenciaCredito: (id: string) => Promise<void>
  refreshTransferenciasCreditos: () => Promise<void>
  documentosCliente: import('@/types/crm').DocumentoCliente[]
  addOrUpdateDocumentoCliente: (
    data: Parameters<typeof import('@/services/crmService').upsertDocumentoCliente>[0],
  ) => Promise<import('@/types/crm').DocumentoCliente>
  getDocumentoCliente: (
    clienteId: string,
    tipo: import('@/types/crm').DocumentoClienteTipo,
  ) => import('@/types/crm').DocumentoCliente | undefined
  updateDocumentoClienteStatus: (
    id: string,
    status: import('@/types/crm').DocumentoClienteStatusAssinatura,
    dataAssinatura?: string,
  ) => Promise<import('@/types/crm').DocumentoCliente>
  removeDocumentoCliente: (id: string) => Promise<void>
  refreshDocumentosCliente: () => Promise<void>
  timelineOM: TimelineOM[]
  propostasOM: PropostaOM[]
  orcamentosSolar: OrcamentoSolar[]
  fornecedores: import('@/types/crm').Fornecedor[]
  fornecedoresOrcamentos: import('@/types/crm').FornecedorOrcamento[]
  contatosAdicionais: import('@/types/crm').ContatoAdicional[]
  addContatoAdicional: (data: {
    cliente: string
    nome: string
    cargo?: string
    telefone?: string
    email?: string
  }) => Promise<import('@/types/crm').ContatoAdicional>
  updateContatoAdicional: (
    id: string,
    data: Partial<{
      nome: string
      cargo: string
      telefone: string
      email: string
    }>,
  ) => Promise<import('@/types/crm').ContatoAdicional>
  removeContatoAdicional: (id: string) => Promise<void>
  refreshContatosAdicionais: () => Promise<void>
  whatsAppTemplates: WhatsAppTemplate[]
  whatsAppMensagens: WhatsAppMensagem[]
  whatsAppConversas: WhatsAppConversa[]
  whatsAppConfig: WhatsAppConfigStatus | null
  isLoading: boolean
  error: string | null
  selectedClienteId: string | null
  selectedCliente: Cliente | null
  selectedSistema: Sistema | null
  selectedClienteProjeto: Projeto | null
  selectedContratoOM: ContratoOM | null
  activeClientTab: ClientTabType
  selectedOMClienteId: string | null
  openFichaOM: (clienteId: string) => void
  closeFichaOM: () => void
  setActiveClientTab: (tab: ClientTabType) => void
  openFichaCliente: (id: string, initialTab?: ClientTabType) => void
  closeFichaCliente: () => void
  addCliente: (data: Partial<Cliente> & { nome: string }) => Promise<Cliente>
  removeCliente: (id: string) => Promise<void>
  bulkRemoveClientes: (ids: string[]) => Promise<void>
  mesclarClientes: (opcoes: MesclagemOpcoes) => Promise<Cliente>
  addManutencao: (data: {
    cliente_id: string
    data: string
    tipo: ManutencaoTipo
    status: ManutencaoStatus
    tecnico?: string
    descricao?: string
  }) => Promise<Manutencao>
  removeManutencao: (id: string) => Promise<void>
  addAtividade: (data: {
    cliente_id: string
    tipo: import('@/types/crm').AtividadeTipo
    titulo?: string
    descricao?: string
    data?: string
    autor?: string
    status?: AtividadeStatus
    responsavel_id?: string
    responsavel_nome?: string
  }) => Promise<Atividade>
  updateAtividade: (id: string, data: Partial<Atividade>) => Promise<Atividade>
  updateAtividadeStatus: (id: string, status: AtividadeStatus) => Promise<void>
  removeAtividade: (id: string) => Promise<void>
  // Tipos de atividades personalizados
  tiposAtividadesCustom: import('@/types/crm').TipoAtividadeCustomItem[]
  addTipoAtividadeCustom: (data: {
    nome: string
    categoria: import('@/types/crm').AtividadeCategoriaId
    cor?: string
    icone?: string
    descricao?: string
  }) => Promise<import('@/types/crm').TipoAtividadeCustomItem>
  removeTipoAtividadeCustom: (id: string) => Promise<void>
  refreshTiposAtividadesCustom: () => Promise<void>
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<Cliente>
  updateClienteStatus: (
    id: string,
    status: Cliente['status'],
    options?: {
      skipActivityLog?: boolean
      autor?: string
      customTitulo?: string
      customDescricao?: string
    },
  ) => Promise<void>
  bulkUpdateEtapa: (ids: string[], status: Cliente['status']) => Promise<void>
  bulkUpdateResponsavel: (
    ids: string[],
    responsavelId: string,
    responsavelNome: string,
  ) => Promise<void>
  bulkMarcarFechado: (ids: string[]) => Promise<void>
  bulkTransferirFechadosPosVendas: (
    clientesParaTransferir: { id: string; data_fechamento?: string }[] | string[],
    areaDestino?: 'projetos' | 'manutencoes' | 'om',
  ) => Promise<Cliente[]>
  marcarComoGanho: (clienteId: string, areaDestino: 'projetos' | 'om') => Promise<Cliente>
  marcarComoPerdido: (
    clienteId: string,
    motivoPerda: 'preco' | 'concorrente' | 'desistiu' | 'outro' | string,
    observacaoTexto?: string,
  ) => Promise<Cliente>
  bulkArquivar: (ids: string[]) => Promise<void>
  updateSistema: (clienteId: string, data: Partial<Sistema>) => Promise<Sistema>
  // Profissionais
  addProfissional: (data: {
    nome: string
    telefone: string
    especialidade: Profissional['especialidade']
  }) => Promise<Profissional>
  updateProfissional: (id: string, data: Partial<Profissional>) => Promise<Profissional>
  removeProfissional: (id: string) => Promise<void>
  // Projetos
  addProjeto: (data: {
    cliente_id: string
    etapa?: ProjetoEtapa
    potencia_kwp?: number
    cidade?: string
    profissional_id?: string
    profissional_nome?: string
    observacoes?: string
  }) => Promise<Projeto>
  updateProjeto: (id: string, data: Partial<Projeto>) => Promise<Projeto>
  updateProjetoEtapa: (
    projetoId: string,
    novaEtapa: ProjetoEtapa,
    options?: {
      profissional_id?: string
      profissional_nome?: string
      descricao?: string
    },
  ) => Promise<Projeto>
  assignProjetoProfissional: (
    projetoId: string,
    profissionalId: string | null,
    profissionalNome: string | null,
  ) => Promise<Projeto>
  removeProjeto: (id: string) => Promise<void>
  // O&M Methods
  addContratoOM: (data: Parameters<typeof apiCreateContratoOM>[0]) => Promise<ContratoOM>
  updateContratoOM: (id: string, data: Partial<ContratoOM>) => Promise<ContratoOM>
  removeContratoOM: (id: string) => Promise<void>
  encerrarContratoOM: (
    contratoId: string,
    dadosEncerramento: {
      motivo_encerramento: import('@/types/crm').OMMotivoEncerramento
      data_encerramento: string
      observacoes_encerramento?: string
    },
  ) => Promise<ContratoOM>
  renovarContratoOM: (contratoId: string, mesesAdicionais?: number) => Promise<ContratoOM>
  addAnomaliaOM: (data: Parameters<typeof apiCreateAnomaliaOM>[0]) => Promise<AnomaliaOM>
  updateAnomaliaOM: (id: string, data: Partial<AnomaliaOM>) => Promise<AnomaliaOM>
  removeAnomaliaOM: (id: string) => Promise<void>
  addServicoAdicionalOM: (
    data: Parameters<typeof apiCreateServicoAdicionalOM>[0],
  ) => Promise<ServicoAdicionalOM>
  updateServicoAdicionalOM: (
    id: string,
    data: Partial<ServicoAdicionalOM>,
  ) => Promise<ServicoAdicionalOM>
  removeServicoAdicionalOM: (id: string) => Promise<void>
  addServicoAvulso: (data: Parameters<typeof apiCreateServicoAvulso>[0]) => Promise<ServicoAvulso>
  updateServicoAvulso: (id: string, data: Partial<ServicoAvulso>) => Promise<ServicoAvulso>
  removeServicoAvulso: (id: string) => Promise<void>
  addTimelineOM: (data: Parameters<typeof apiCreateTimelineOM>[0]) => Promise<TimelineOM>
  addPropostaOM: (data: Parameters<typeof apiCreatePropostaOM>[0]) => Promise<PropostaOM>
  updatePropostaOM: (id: string, data: Partial<PropostaOM>) => Promise<PropostaOM>
  removePropostaOM: (id: string) => Promise<void>
  // Orçamentos Solares
  addOrcamentoSolar: (data: Partial<OrcamentoSolar>) => Promise<OrcamentoSolar>
  updateOrcamentoSolar: (id: string, data: Partial<OrcamentoSolar>) => Promise<OrcamentoSolar>
  removeOrcamentoSolar: (id: string) => Promise<void>
  // Fornecedores
  addFornecedor: (
    data: Partial<import('@/types/crm').Fornecedor>,
  ) => Promise<import('@/types/crm').Fornecedor>
  updateFornecedor: (
    id: string,
    data: Partial<import('@/types/crm').Fornecedor>,
  ) => Promise<import('@/types/crm').Fornecedor>
  removeFornecedor: (id: string) => Promise<void>
  addFornecedorOrcamento: (
    data: Partial<import('@/types/crm').FornecedorOrcamento>,
    file?: File,
  ) => Promise<import('@/types/crm').FornecedorOrcamento>
  updateFornecedorOrcamento: (
    id: string,
    data: Partial<import('@/types/crm').FornecedorOrcamento>,
    file?: File,
  ) => Promise<import('@/types/crm').FornecedorOrcamento>
  selecionarFornecedorOrcamento: (
    id: string,
    options?: { orcamentoSolarId?: string; clienteId?: string },
  ) => Promise<import('@/types/crm').FornecedorOrcamento>
  removeFornecedorOrcamento: (id: string) => Promise<void>
  refreshFornecedores: () => Promise<void>
  // WhatsApp
  addWhatsAppTemplate: (data: Partial<WhatsAppTemplate>) => Promise<WhatsAppTemplate>
  updateWhatsAppTemplate: (id: string, data: Partial<WhatsAppTemplate>) => Promise<WhatsAppTemplate>
  removeWhatsAppTemplate: (id: string) => Promise<void>
  vincularConversa: (
    conversaId: string,
    clienteId: string,
    atendenteNome?: string,
  ) => Promise<WhatsAppConversa>
  assumirAtendimento: (
    conversaId: string,
    atendenteNome: string,
    atendenteId?: string,
  ) => Promise<WhatsAppConversa>
  finalizarAtendimento: (conversaId: string) => Promise<WhatsAppConversa>
  cadastrarLeadDeConversa: (
    conversaId: string,
    leadData: {
      nome: string
      telefone: string
      email?: string
      cpf?: string
      endereco?: string
      produto?: import('@/types/crm').ProdutoTipo
      tipo_cliente?: import('@/types/crm').ClienteTipo
      origem_lead?: import('@/types/crm').OrigemLeadTipo
    },
    atendenteNome?: string,
    atendenteId?: string,
  ) => Promise<{ cliente: Cliente; conversa: WhatsAppConversa }>
  cadastrarOutroContatoDeConversa: (
    conversaId: string,
    contatoData: {
      nome: string
      telefone: string
      tipo_contato: import('@/types/crm').OutroContatoTipo
      observacao?: string
    },
  ) => Promise<{ contato: import('@/types/crm').OutroContato; conversa: WhatsAppConversa }>
  refreshConversas: () => Promise<WhatsAppConversa[]>
  sendWhatsAppMessage: (data: {
    cliente_id?: string
    conversa_id?: string
    telefone_destino: string
    conteudo_final: string
    template_id?: string
    agendado_para?: string | null
    tipo_disparo?: string
    referencia_id?: string
  }) => Promise<{
    ok: boolean
    scheduled?: boolean
    sent?: boolean
    gatewayConfigured?: boolean
    status?: string
    message: string
    data?: WhatsAppMensagem
  }>
  sendWhatsAppDocument: (data: {
    cliente_id: string
    telefone_destino: string
    tipo: 'orcamento_solar' | 'proposta_om' | 'documento'
    referencia_id?: string
    legenda?: string
    nome_arquivo?: string
    base64?: string
    documento_url?: string
  }) => Promise<{
    ok: boolean
    sent?: boolean
    gatewayConfigured?: boolean
    status?: string
    message: string
    data?: WhatsAppMensagem
  }>
  sendWhatsAppAudioMessage: (data: {
    cliente_id?: string
    conversa_id?: string
    telefone_destino: string
    audio: string
    duracao_segundos?: number
    referencia_id?: string
  }) => Promise<{
    ok: boolean
    sent?: boolean
    gatewayConfigured?: boolean
    status?: string
    message: string
    data?: WhatsAppMensagem
  }>
  refreshWhatsAppConfig: () => Promise<void>
  refreshData: () => Promise<void>
}

const ClientesContext = createContext<ClientesContextType | undefined>(undefined)

export const ClientesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [sistemas, setSistemas] = useState<Sistema[]>([])
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [usuarios, setUsuarios] = useState<SistemaUsuario[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [projetoEventos, setProjetoEventos] = useState<ProjetoEvento[]>([])
  const [contratosOM, setContratosOM] = useState<ContratoOM[]>([])
  const [anomaliasOM, setAnomaliasOM] = useState<AnomaliaOM[]>([])
  const [servicosAdicionaisOM, setServicosAdicionaisOM] = useState<ServicoAdicionalOM[]>([])
  const [servicosAvulsos, setServicosAvulsos] = useState<ServicoAvulso[]>([])
  const [transferenciasCreditos, setTransferenciasCreditos] = useState<
    import('@/types/crm').TransferenciaCredito[]
  >([])
  const [documentosCliente, setDocumentosCliente] = useState<
    import('@/types/crm').DocumentoCliente[]
  >([])
  const [tiposAtividadesCustom, setTiposAtividadesCustom] = useState<
    import('@/types/crm').TipoAtividadeCustomItem[]
  >([])
  const [timelineOM, setTimelineOM] = useState<TimelineOM[]>([])
  const [propostasOM, setPropostasOM] = useState<PropostaOM[]>([])
  const [orcamentosSolar, setOrcamentosSolar] = useState<OrcamentoSolar[]>([])
  const [fornecedores, setFornecedores] = useState<import('@/types/crm').Fornecedor[]>([])
  const [fornecedoresOrcamentos, setFornecedoresOrcamentos] = useState<
    import('@/types/crm').FornecedorOrcamento[]
  >([])
  const [contatosAdicionais, setContatosAdicionais] = useState<
    import('@/types/crm').ContatoAdicional[]
  >([])
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>([])
  const [whatsAppMensagens, setWhatsAppMensagens] = useState<WhatsAppMensagem[]>([])
  const [whatsAppConversas, setWhatsAppConversas] = useState<WhatsAppConversa[]>([])
  const [whatsAppConfig, setWhatsAppConfig] = useState<WhatsAppConfigStatus | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)
  const [selectedOMClienteId, setSelectedOMClienteId] = useState<string | null>(null)
  const [activeClientTab, setActiveClientTab] = useState<ClientTabType>('historico')

  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)

      const getValue = <T,>(res: PromiseSettledResult<T>, fallback: T): T =>
        res.status === 'fulfilled' ? res.value : fallback

      const [
        cRes,
        sRes,
        mRes,
        aRes,
        uRes,
        pRes,
        projRes,
        evRes,
        contRes,
        anomRes,
        adicRes,
        timeRes,
        propRes,
        orcRes,
        tplRes,
        msgRes,
        cfgRes,
        convRes,
        fornRes,
        fornOrcRes,
        avulsosRes,
        transfRes,
        docsRes,
        customAtivRes,
        contAdicRes,
      ] = await Promise.allSettled([
        fetchClientes(),
        fetchSistemas(),
        fetchManutencoes(),
        fetchAtividades(),
        fetchUsuarios(),
        fetchProfissionais(),
        fetchProjetos(),
        fetchProjetoEventos(),
        fetchContratosOM(),
        fetchAnomaliasOM(),
        fetchServicosAdicionaisOM(),
        fetchTimelineOM(),
        fetchPropostasOM(),
        fetchOrcamentosSolar(),
        fetchWhatsAppTemplates(),
        fetchWhatsAppMensagens(),
        fetchWhatsAppConfigStatus(),
        fetchWhatsAppConversas(),
        import('@/services/crmService').then((s) => s.fetchFornecedores()),
        import('@/services/crmService').then((s) => s.fetchFornecedoresOrcamentos()),
        fetchServicosAvulsos(),
        import('@/services/crmService').then((s) => s.fetchTransferenciasCreditos()),
        import('@/services/crmService').then((s) => s.fetchDocumentosCliente()),
        import('@/services/crmService').then((s) => s.fetchTiposAtividadesCustom()),
        import('@/services/crmService').then((s) => s.fetchContatosAdicionais()),
      ])

      const cList = getValue(cRes, [])
      const sList = getValue(sRes, [])
      const mList = getValue(mRes, [])
      const aList = getValue(aRes, [])
      const uList = getValue(uRes, [])
      const pList = getValue(pRes, [])
      const projList = getValue(projRes, [])
      const evList = getValue(evRes, [])
      const contList = getValue(contRes, [])
      const anomList = getValue(anomRes, [])
      const adicList = getValue(adicRes, [])
      const timeList = getValue(timeRes, [])
      const propList = getValue(propRes, [])
      const orcList = getValue(orcRes, [])
      const tplList = getValue(tplRes, [])
      const msgList = getValue(msgRes, [])
      const cfgStatus = getValue(cfgRes, {
        ok: false,
        configured: false,
        hasApiUrl: false,
        hasApiKey: false,
        secretsRequired: ['WHATSAPP_API_URL', 'WHATSAPP_API_KEY', 'WHATSAPP_ORIGIN_NUMBER'],
      })
      const convList = getValue(convRes, [])
      const fornList = getValue(fornRes, [])
      const fornOrcList = getValue(fornOrcRes, [])
      const avulsosList = getValue(avulsosRes, [])
      const transfList = getValue(transfRes, [])
      const docsList = getValue(docsRes, [])
      const customAtivList = getValue(customAtivRes, [])
      const contAdicList = getValue(contAdicRes, [])

      setClientes(cList)
      setSistemas(sList)
      setManutencoes(mList)
      setAtividades(aList)
      setUsuarios(uList)
      setProfissionais(pList)
      setProjetos(projList)
      setProjetoEventos(evList)
      setContratosOM(contList)
      setAnomaliasOM(anomList)
      setServicosAdicionaisOM(adicList)
      setServicosAvulsos(avulsosList)
      setTransferenciasCreditos(transfList)
      setDocumentosCliente(docsList)
      setTiposAtividadesCustom(customAtivList)
      setTimelineOM(timeList)
      setPropostasOM(propList)
      setOrcamentosSolar(orcList)
      setWhatsAppTemplates(tplList)
      setWhatsAppMensagens(msgList)
      setWhatsAppConversas(convList)
      setWhatsAppConfig(cfgStatus)
      setFornecedores(fornList)
      setFornecedoresOrcamentos(fornOrcList)
      setContatosAdicionais(contAdicList)
    } catch (err) {
      console.error('Error loading CRM data:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do CRM')
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Realtime updates for clientes
  useRealtime<Cliente>(
    'clientes',
    (data) => {
      if (data.action === 'create') {
        setClientes((prev) => [...prev, data.record])
      } else if (data.action === 'update') {
        setClientes((prev) => prev.map((c) => (c.id === data.record.id ? data.record : c)))
      } else if (data.action === 'delete') {
        setClientes((prev) => prev.filter((c) => c.id !== data.record.id))
      }
    },
    isAuthenticated,
  )

  // Realtime updates for sistemas
  useRealtime<Sistema>(
    'sistemas',
    (data) => {
      if (data.action === 'create') {
        setSistemas((prev) => [data.record, ...prev])
      } else if (data.action === 'update') {
        setSistemas((prev) => prev.map((s) => (s.id === data.record.id ? data.record : s)))
      } else if (data.action === 'delete') {
        setSistemas((prev) => prev.filter((s) => s.id !== data.record.id))
      }
    },
    isAuthenticated,
  )

  // Realtime updates for manutencoes
  useRealtime<Manutencao>(
    'manutencoes',
    () => {
      // Refresh to ensure expand relation is populated
      fetchManutencoes().then(setManutencoes).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for servicos_avulsos
  useRealtime<ServicoAvulso>(
    'servicos_avulsos',
    () => {
      fetchServicosAvulsos().then(setServicosAvulsos).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for atividades
  useRealtime<Atividade>(
    'atividades',
    () => {
      fetchAtividades().then(setAtividades).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for tipos_atividades_custom
  useRealtime<import('@/types/crm').TipoAtividadeCustomItem>(
    'tipos_atividades_custom',
    () => {
      import('@/services/crmService')
        .then((s) => s.fetchTiposAtividadesCustom().then(setTiposAtividadesCustom))
        .catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for profissionais
  useRealtime<Profissional>(
    'profissionais',
    () => {
      fetchProfissionais().then(setProfissionais).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for projetos
  useRealtime<Projeto>(
    'projetos',
    () => {
      fetchProjetos().then(setProjetos).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for projeto_eventos
  useRealtime<ProjetoEvento>(
    'projeto_eventos',
    () => {
      fetchProjetoEventos().then(setProjetoEventos).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for contratos_om
  useRealtime<ContratoOM>(
    'contratos_om',
    () => {
      fetchContratosOM().then(setContratosOM).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for anomalias_om
  useRealtime<AnomaliaOM>(
    'anomalias_om',
    () => {
      fetchAnomaliasOM().then(setAnomaliasOM).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for servicos_adicionais_om
  useRealtime<ServicoAdicionalOM>(
    'servicos_adicionais_om',
    () => {
      fetchServicosAdicionaisOM().then(setServicosAdicionaisOM).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for timeline_om
  useRealtime<TimelineOM>(
    'timeline_om',
    () => {
      fetchTimelineOM().then(setTimelineOM).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for propostas_om
  useRealtime<PropostaOM>(
    'propostas_om',
    () => {
      fetchPropostasOM().then(setPropostasOM).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for orcamentos_solar
  useRealtime<OrcamentoSolar>(
    'orcamentos_solar',
    () => {
      fetchOrcamentosSolar().then(setOrcamentosSolar).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for fornecedores
  useRealtime<import('@/types/crm').Fornecedor>(
    'fornecedores',
    () => {
      import('@/services/crmService')
        .then((s) => s.fetchFornecedores().then(setFornecedores))
        .catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for fornecedores_orcamentos
  useRealtime<import('@/types/crm').FornecedorOrcamento>(
    'fornecedores_orcamentos',
    () => {
      import('@/services/crmService')
        .then((s) => s.fetchFornecedoresOrcamentos().then(setFornecedoresOrcamentos))
        .catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for whatsapp_templates
  useRealtime<WhatsAppTemplate>(
    'whatsapp_templates',
    () => {
      fetchWhatsAppTemplates().then(setWhatsAppTemplates).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for whatsapp_mensagens
  useRealtime<WhatsAppMensagem>(
    'whatsapp_mensagens',
    () => {
      fetchWhatsAppMensagens().then(setWhatsAppMensagens).catch(console.error)
      fetchWhatsAppConversas().then(setWhatsAppConversas).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for whatsapp_conversas
  useRealtime<WhatsAppConversa>(
    'whatsapp_conversas',
    () => {
      fetchWhatsAppConversas().then(setWhatsAppConversas).catch(console.error)
    },
    isAuthenticated,
  )

  // Realtime updates for contatos_adicionais
  useRealtime<import('@/types/crm').ContatoAdicional>(
    'contatos_adicionais',
    () => {
      import('@/services/crmService')
        .then((s) => s.fetchContatosAdicionais().then(setContatosAdicionais))
        .catch(console.error)
    },
    isAuthenticated,
  )

  const addCliente = async (data: Partial<Cliente> & { nome: string }) => {
    const created = await apiCreateCliente(data)
    // Atualiza estado local imediatamente caso o realtime demore
    setClientes((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev
      return [created, ...prev]
    })
    return created
  }

  const removeCliente = async (id: string) => {
    // Se o cliente a ser removido for o atualmente aberto na ficha, fecha a ficha
    if (selectedClienteId === id) {
      setSelectedClienteId(null)
    }
    if (selectedOMClienteId === id) {
      setSelectedOMClienteId(null)
    }

    // Optimistic update para lista de clientes e dados diretamente associados em tela
    setClientes((prev) => prev.filter((c) => c.id !== id))
    setAtividades((prev) => prev.filter((a) => a.cliente_id !== id))
    setSistemas((prev) => prev.filter((s) => s.cliente_id !== id))
    setManutencoes((prev) => prev.filter((m) => m.cliente_id !== id))
    setProjetos((prev) => prev.filter((p) => p.cliente_id !== id))
    setContratosOM((prev) => prev.filter((c) => c.cliente_id !== id))
    setAnomaliasOM((prev) => prev.filter((a) => a.cliente_id !== id))
    setServicosAdicionaisOM((prev) => prev.filter((s) => s.cliente_id !== id))
    setTimelineOM((prev) => prev.filter((t) => t.cliente_id !== id))
    setPropostasOM((prev) => prev.filter((p) => p.cliente_id !== id))
    setOrcamentosSolar((prev) => prev.filter((o) => o.cliente_id !== id))
    setServicosAvulsos((prev) => prev.filter((s) => s.cliente_id !== id))
    setDocumentosCliente((prev) => prev.filter((d) => d.cliente_id !== id))

    try {
      await apiDeleteCliente(id)
    } catch (err) {
      console.error('Erro ao excluir cliente:', err)
      await loadAllData()
      throw err
    }
  }

  const bulkRemoveClientes = async (ids: string[]) => {
    if (ids.length === 0) return

    if (selectedClienteId && ids.includes(selectedClienteId)) {
      setSelectedClienteId(null)
    }
    if (selectedOMClienteId && ids.includes(selectedOMClienteId)) {
      setSelectedOMClienteId(null)
    }

    const idsSet = new Set(ids)
    setClientes((prev) => prev.filter((c) => !idsSet.has(c.id)))
    setAtividades((prev) => prev.filter((a) => !idsSet.has(a.cliente_id)))
    setSistemas((prev) => prev.filter((s) => !idsSet.has(s.cliente_id)))
    setManutencoes((prev) => prev.filter((m) => !idsSet.has(m.cliente_id)))
    setProjetos((prev) => prev.filter((p) => !idsSet.has(p.cliente_id)))
    setContratosOM((prev) => prev.filter((c) => !idsSet.has(c.cliente_id)))
    setAnomaliasOM((prev) => prev.filter((a) => !idsSet.has(a.cliente_id)))
    setServicosAdicionaisOM((prev) => prev.filter((s) => !idsSet.has(s.cliente_id)))
    setTimelineOM((prev) => prev.filter((t) => !idsSet.has(t.cliente_id)))
    setPropostasOM((prev) => prev.filter((p) => !idsSet.has(p.cliente_id)))
    setOrcamentosSolar((prev) => prev.filter((o) => !idsSet.has(o.cliente_id)))
    setServicosAvulsos((prev) => prev.filter((s) => !idsSet.has(s.cliente_id)))
    setDocumentosCliente((prev) => prev.filter((d) => !idsSet.has(d.cliente_id)))

    try {
      await apiBulkDeleteClientes(ids)
    } catch (err) {
      console.error('Erro ao excluir clientes em lote:', err)
      await loadAllData()
      throw err
    }
  }

  const mesclarClientes = async (opcoes: MesclagemOpcoes): Promise<Cliente> => {
    const { clienteMestreId, clienteSecundarioId, camposSobrescritos } = opcoes

    if (selectedClienteId === clienteSecundarioId) {
      setSelectedClienteId(clienteMestreId)
    }
    if (selectedOMClienteId === clienteSecundarioId) {
      setSelectedOMClienteId(clienteMestreId)
    }

    // Optimistic update: atualiza mestre e remove secundário
    setClientes((prev) => {
      return prev
        .filter((c) => c.id !== clienteSecundarioId)
        .map((c) => (c.id === clienteMestreId ? { ...c, ...camposSobrescritos } : c))
    })

    // Reatribuir relacionamentos localmente no state
    setAtividades((prev) =>
      prev.map((a) =>
        a.cliente_id === clienteSecundarioId ? { ...a, cliente_id: clienteMestreId } : a,
      ),
    )
    setProjetos((prev) =>
      prev.map((p) =>
        p.cliente_id === clienteSecundarioId ? { ...p, cliente_id: clienteMestreId } : p,
      ),
    )
    setContratosOM((prev) =>
      prev.map((c) =>
        c.cliente_id === clienteSecundarioId ? { ...c, cliente_id: clienteMestreId } : c,
      ),
    )
    setAnomaliasOM((prev) =>
      prev.map((a) =>
        a.cliente_id === clienteSecundarioId ? { ...a, cliente_id: clienteMestreId } : a,
      ),
    )
    setServicosAdicionaisOM((prev) =>
      prev.map((s) =>
        s.cliente_id === clienteSecundarioId ? { ...s, cliente_id: clienteMestreId } : s,
      ),
    )
    setTimelineOM((prev) =>
      prev.map((t) =>
        t.cliente_id === clienteSecundarioId ? { ...t, cliente_id: clienteMestreId } : t,
      ),
    )
    setPropostasOM((prev) =>
      prev.map((p) =>
        p.cliente_id === clienteSecundarioId ? { ...p, cliente_id: clienteMestreId } : p,
      ),
    )
    setOrcamentosSolar((prev) =>
      prev.map((o) =>
        o.cliente_id === clienteSecundarioId ? { ...o, cliente_id: clienteMestreId } : o,
      ),
    )
    setManutencoes((prev) =>
      prev.map((m) =>
        m.cliente_id === clienteSecundarioId ? { ...m, cliente_id: clienteMestreId } : m,
      ),
    )
    setServicosAvulsos((prev) =>
      prev.map((s) =>
        s.cliente_id === clienteSecundarioId ? { ...s, cliente_id: clienteMestreId } : s,
      ),
    )
    setDocumentosCliente((prev) =>
      prev.map((d) =>
        d.cliente_id === clienteSecundarioId ? { ...d, cliente_id: clienteMestreId } : d,
      ),
    )

    try {
      const clienteFinal = await apiMesclarClientes(opcoes)
      setClientes((prev) => prev.map((c) => (c.id === clienteMestreId ? clienteFinal : c)))
      // Recarregar histórico de atividades para refletir a nota de auditoria
      fetchAtividades().then(setAtividades).catch(console.error)
      return clienteFinal
    } catch (err) {
      console.error('Erro ao mesclar clientes:', err)
      await loadAllData()
      throw err
    }
  }

  const openFichaCliente = (id: string, initialTab: ClientTabType = 'historico') => {
    const existe = clientes.some((c) => c.id === id)
    if (!existe) {
      import('sonner').then(({ toast }) => {
        toast.error('Cliente não encontrado', {
          description: 'Este registro pertence a um cliente que não consta na base de dados.',
        })
      })
      return
    }
    setSelectedClienteId(id)
    setActiveClientTab(initialTab)
  }

  const closeFichaCliente = () => {
    setSelectedClienteId(null)
  }

  const addManutencao = async (data: {
    cliente_id: string
    data: string
    tipo: ManutencaoTipo
    status: ManutencaoStatus
    tecnico?: string
    descricao?: string
  }) => {
    const created = await apiCreateManutencao(data)
    const updated = await fetchManutencoes()
    setManutencoes(updated)
    return created
  }

  const removeManutencao = async (id: string) => {
    setManutencoes((prev) => prev.filter((m) => m.id !== id))
    try {
      await apiDeleteManutencao(id)
    } catch (err) {
      console.error('Erro ao excluir manutenção:', err)
      const updated = await fetchManutencoes()
      setManutencoes(updated)
      throw err
    }
  }

  const addAtividade = async (data: {
    cliente_id: string
    tipo: import('@/types/crm').AtividadeTipo
    titulo?: string
    descricao?: string
    data?: string
    autor?: string
    status?: AtividadeStatus
    responsavel_id?: string
    responsavel_nome?: string
  }) => {
    const created = await apiCreateAtividade(data)
    setAtividades((prev) => [created, ...prev.filter((a) => a.id !== created.id)])
    return created
  }

  const updateAtividade = async (id: string, data: Partial<Atividade>): Promise<Atividade> => {
    // Optimistic update
    setAtividades((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a
        const updatedObj: Atividade = { ...a, ...data }
        // Se cliente_id mudou e temos o objeto cliente em cache, manter expand coerente
        if (data.cliente_id && data.cliente_id !== a.cliente_id) {
          const matchingCliente = clientes.find((c) => c.id === data.cliente_id)
          if (matchingCliente) {
            updatedObj.expand = {
              ...updatedObj.expand,
              cliente_id: matchingCliente,
            }
          }
        }
        if (data.responsavel_id && data.responsavel_id !== a.responsavel_id) {
          const matchingUser = usuarios.find((u) => u.id === data.responsavel_id)
          if (matchingUser) {
            updatedObj.expand = {
              ...updatedObj.expand,
              responsavel_id: matchingUser,
            }
          }
        }
        return updatedObj
      }),
    )

    try {
      const updated = await apiUpdateAtividade(id, data)
      setAtividades((prev) => prev.map((a) => (a.id === id ? updated : a)))
      return updated
    } catch (err) {
      console.error('Erro ao atualizar atividade:', err)
      fetchAtividades().then(setAtividades).catch(console.error)
      throw err
    }
  }

  const updateAtividadeStatus = async (id: string, status: AtividadeStatus) => {
    // Optimistic update
    setAtividades((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
    try {
      await apiUpdateAtividade(id, { status })
    } catch (err) {
      console.error('Erro ao atualizar status da atividade:', err)
      fetchAtividades().then(setAtividades).catch(console.error)
      throw err
    }
  }

  const removeAtividade = async (id: string) => {
    setAtividades((prev) => prev.filter((a) => a.id !== id))
    try {
      await apiDeleteAtividade(id)
    } catch (err) {
      console.error('Erro ao excluir atividade:', err)
      fetchAtividades().then(setAtividades).catch(console.error)
      throw err
    }
  }

  const addTipoAtividadeCustom = async (data: {
    nome: string
    categoria: import('@/types/crm').AtividadeCategoriaId
    cor?: string
    icone?: string
    descricao?: string
  }) => {
    const s = await import('@/services/crmService')
    const created = await s.createTipoAtividadeCustom(data)
    setTiposAtividadesCustom((prev) => {
      if (prev.some((item) => item.id === created.id)) return prev
      return [...prev, created]
    })
    return created
  }

  const removeTipoAtividadeCustom = async (id: string) => {
    setTiposAtividadesCustom((prev) => prev.filter((t) => t.id !== id))
    const s = await import('@/services/crmService')
    await s.deleteTipoAtividadeCustom(id)
  }

  const refreshTiposAtividadesCustom = async () => {
    const s = await import('@/services/crmService')
    const list = await s.fetchTiposAtividadesCustom()
    setTiposAtividadesCustom(list)
  }

  const updateCliente = async (id: string, data: Partial<Cliente>): Promise<Cliente> => {
    // Optimistic update
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    try {
      const updated = await apiUpdateCliente(id, data)
      setClientes((prev) => prev.map((c) => (c.id === id ? updated : c)))
      return updated
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err)
      // Reverter recarregando dados
      await loadAllData()
      throw err
    }
  }

  const updateClienteStatus = async (
    id: string,
    status: Cliente['status'],
    options?: {
      skipActivityLog?: boolean
      autor?: string
      customTitulo?: string
      customDescricao?: string
    },
  ) => {
    const previous = clientes.find((c) => c.id === id)
    const oldStatus = previous?.status

    // Optimistic update
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)))

    try {
      const updated = await apiUpdateClienteStatus(id, status)
      setClientes((prev) => prev.map((c) => (c.id === id ? updated : c)))

      // Se mudou de estágio, registrar evento automático na timeline de atividades
      if (!options?.skipActivityLog && oldStatus && oldStatus !== status) {
        try {
          const autorNome = options?.autor || 'Administrador'
          const tituloAtividade =
            options?.customTitulo || `Mudança de estágio: ${oldStatus} → ${status}`
          const descricaoAtividade =
            options?.customDescricao ||
            `Etapa alterada de "${oldStatus}" para "${status}" por ${autorNome}.`

          const act = await apiCreateAtividade({
            cliente_id: id,
            tipo: 'mudanca_estagio',
            titulo: tituloAtividade,
            descricao: descricaoAtividade,
            data: new Date().toISOString(),
            status: 'concluida',
            autor: autorNome,
            responsavel_nome: autorNome,
          })
          setAtividades((prev) => [act, ...prev])
        } catch (actErr) {
          console.warn('Falha ao registrar atividade de mudança de estágio:', actErr)
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar status do cliente:', err)
      // Reverter recarregando dados
      await loadAllData()
      throw err
    }
  }

  const bulkUpdateEtapa = async (ids: string[], status: Cliente['status']) => {
    setClientes((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, status } : c)))
    try {
      const updatedList = await apiBulkUpdateClientesEtapa(ids, status)
      const mapUpdated = new Map(updatedList.map((u) => [u.id, u]))
      setClientes((prev) => prev.map((c) => mapUpdated.get(c.id) || c))
    } catch (err) {
      console.error('Erro ao atualizar etapas em lote:', err)
      await loadAllData()
      throw err
    }
  }

  const bulkUpdateResponsavel = async (
    ids: string[],
    responsavelId: string,
    responsavelNome: string,
  ) => {
    setClientes((prev) =>
      prev.map((c) =>
        ids.includes(c.id)
          ? { ...c, responsavel_id: responsavelId, responsavel_nome: responsavelNome }
          : c,
      ),
    )
    try {
      const updatedList = await apiBulkUpdateClientesResponsavel(
        ids,
        responsavelId,
        responsavelNome,
      )
      const mapUpdated = new Map(updatedList.map((u) => [u.id, u]))
      setClientes((prev) => prev.map((c) => mapUpdated.get(c.id) || c))
    } catch (err) {
      console.error('Erro ao atribuir responsável em lote:', err)
      await loadAllData()
      throw err
    }
  }

  const bulkMarcarFechado = async (ids: string[]) => {
    const agora = new Date().toISOString()
    setClientes((prev) =>
      prev.map((c) =>
        ids.includes(c.id)
          ? { ...c, status: 'Fechado', data_fechamento: c.data_fechamento || agora }
          : c,
      ),
    )
    try {
      const updatedList = await apiBulkMarcarClientesFechado(ids)
      const mapUpdated = new Map(updatedList.map((u) => [u.id, u]))
      setClientes((prev) => prev.map((c) => mapUpdated.get(c.id) || c))
    } catch (err) {
      console.error('Erro ao marcar como fechado em lote:', err)
      await loadAllData()
      throw err
    }
  }

  const bulkTransferirFechadosPosVendas = async (
    clientesParaTransferir: { id: string; data_fechamento?: string }[] | string[],
    areaDestino?: 'projetos' | 'manutencoes' | 'om',
  ): Promise<Cliente[]> => {
    const agora = new Date().toISOString()
    const normalizedList: { id: string; data_fechamento?: string }[] = clientesParaTransferir.map(
      (item) => (typeof item === 'string' ? { id: item, data_fechamento: agora } : item),
    )
    const ids = normalizedList.map((c) => c.id)

    // Determinar destino normalizado ('projetos' ou 'om')
    const finalDestino: 'projetos' | 'om' =
      areaDestino === 'manutencoes' || areaDestino === 'om' ? 'om' : 'projetos'

    // Optimistic update: marca status Fechado, transferido_pos_vendas e área destino
    setClientes((prev) =>
      prev.map((c) => {
        if (!ids.includes(c.id)) return c
        const match = normalizedList.find((item) => item.id === c.id)
        return {
          ...c,
          status: 'Fechado',
          transferido_pos_vendas: true,
          data_transferencia_pos_vendas: agora,
          origem_pos_vendas: 'funil_comercial',
          data_fechamento: match?.data_fechamento || c.data_fechamento || agora,
          area_destino: finalDestino,
        }
      }),
    )

    try {
      // Se tiver área de destino explícita, chama marcarClienteComoGanho para cada um
      // garantindo que projeto ou O&M sejam criados/vinculados
      const s = await import('@/services/crmService')
      const updatedList: Cliente[] = []

      for (const item of normalizedList) {
        try {
          const cli = await s.marcarClienteComoGanho(item.id, finalDestino)
          updatedList.push(cli)
        } catch (e) {
          console.warn(`Erro ao transferir cliente ${item.id} para pós-vendas:`, e)
        }
      }

      if (updatedList.length > 0) {
        const mapUpdated = new Map(updatedList.map((u) => [u.id, u]))
        setClientes((prev) => prev.map((c) => mapUpdated.get(c.id) || c))
      }

      if (finalDestino === 'projetos') {
        fetchProjetos().then(setProjetos).catch(console.error)
      } else {
        fetchManutencoes().then(setManutencoes).catch(console.error)
      }
      fetchAtividades().then(setAtividades).catch(console.error)

      return updatedList
    } catch (err) {
      console.error('Erro ao transferir fechados para pós-vendas em lote:', err)
      await loadAllData()
      throw err
    }
  }

  const marcarComoGanho = async (
    clienteId: string,
    areaDestino: 'projetos' | 'om',
  ): Promise<Cliente> => {
    const agora = new Date().toISOString()

    // Optimistic update no estado clientes
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId
          ? {
              ...c,
              status: 'Fechado',
              transferido_pos_vendas: true,
              data_transferencia_pos_vendas: agora,
              origem_pos_vendas: 'funil_comercial',
              data_fechamento: agora,
              area_destino: areaDestino,
            }
          : c,
      ),
    )

    try {
      const s = await import('@/services/crmService')
      const clienteAtualizado = await s.marcarClienteComoGanho(clienteId, areaDestino)
      setClientes((prev) => prev.map((c) => (c.id === clienteId ? clienteAtualizado : c)))

      // Se área de destino for projetos, recarregar projetos para atualizar Kanban de Projetos e abas
      if (areaDestino === 'projetos') {
        fetchProjetos().then(setProjetos).catch(console.error)
      }
      fetchAtividades().then(setAtividades).catch(console.error)

      return clienteAtualizado
    } catch (err) {
      console.error('Erro ao marcar cliente como ganho:', err)
      await loadAllData()
      throw err
    }
  }

  const marcarComoPerdido = async (
    clienteId: string,
    motivoPerda: 'preco' | 'concorrente' | 'desistiu' | 'outro' | string,
    observacaoTexto?: string,
  ): Promise<Cliente> => {
    // Optimistic update no estado clientes
    setClientes((prev) =>
      prev.map((c) =>
        c.id === clienteId
          ? {
              ...c,
              status: 'Perdido',
              motivo_perda: motivoPerda,
              observacoes:
                observacaoTexto && observacaoTexto.trim() ? observacaoTexto.trim() : c.observacoes,
            }
          : c,
      ),
    )

    try {
      const s = await import('@/services/crmService')
      const clienteAtualizado = await s.marcarClienteComoPerdido(
        clienteId,
        motivoPerda,
        observacaoTexto,
      )
      setClientes((prev) => prev.map((c) => (c.id === clienteId ? clienteAtualizado : c)))
      fetchAtividades().then(setAtividades).catch(console.error)
      return clienteAtualizado
    } catch (err) {
      console.error('Erro ao marcar cliente como perdido:', err)
      await loadAllData()
      throw err
    }
  }

  const bulkArquivar = async (ids: string[]) => {
    setClientes((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, arquivado: true } : c)))
    try {
      const updatedList = await apiBulkArquivarClientes(ids)
      const mapUpdated = new Map(updatedList.map((u) => [u.id, u]))
      setClientes((prev) => prev.map((c) => mapUpdated.get(c.id) || c))
    } catch (err) {
      console.error('Erro ao arquivar clientes em lote:', err)
      await loadAllData()
      throw err
    }
  }

  const updateSistema = async (clienteId: string, data: Partial<Sistema>): Promise<Sistema> => {
    const existing = sistemas.find((s) => s.cliente_id === clienteId)
    // Optimistic update
    if (existing) {
      setSistemas((prev) => prev.map((s) => (s.id === existing.id ? { ...s, ...data } : s)))
    }
    try {
      const saved = await upsertSistemaForCliente(clienteId, data, existing?.id)
      setSistemas((prev) => {
        const found = prev.some((s) => s.id === saved.id)
        if (found) {
          return prev.map((s) => (s.id === saved.id ? saved : s))
        }
        return [saved, ...prev]
      })
      return saved
    } catch (err) {
      console.error('Erro ao salvar sistema:', err)
      await loadAllData()
      throw err
    }
  }

  // Gerenciamento de Profissionais
  const addProfissional = async (data: {
    nome: string
    telefone: string
    especialidade: Profissional['especialidade']
  }) => {
    const created = await apiCreateProfissional(data)
    setProfissionais((prev) => [...prev, created])
    return created
  }

  const updateProfissional = async (id: string, data: Partial<Profissional>) => {
    const updated = await apiUpdateProfissional(id, data)
    setProfissionais((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }

  const removeProfissional = async (id: string) => {
    await apiDeleteProfissional(id)
    setProfissionais((prev) => prev.filter((p) => p.id !== id))
  }

  // Gerenciamento de Projetos
  const addProjeto = async (data: {
    cliente_id: string
    etapa?: ProjetoEtapa
    potencia_kwp?: number
    cidade?: string
    profissional_id?: string
    profissional_nome?: string
    observacoes?: string
  }) => {
    const client = clientes.find((c) => c.id === data.cliente_id)
    const initialEtapa: ProjetoEtapa = data.etapa || 'Levantamento de Informações'
    const payload = {
      cliente_id: data.cliente_id,
      etapa: initialEtapa,
      potencia_kwp: data.potencia_kwp ?? client?.potencia_kwp ?? 0,
      cidade: data.cidade ?? client?.cidade ?? '',
      profissional_id: data.profissional_id,
      profissional_nome: data.profissional_nome,
      observacoes: data.observacoes || '',
    }
    const created = await apiCreateProjeto(payload)
    setProjetos((prev) => [created, ...prev])

    // Registrar evento de criação do projeto
    try {
      const ev = await apiCreateProjetoEvento({
        projeto_id: created.id,
        etapa_anterior: '',
        etapa_nova: initialEtapa,
        profissional_nome: created.profissional_nome || '',
        autor: 'João Silva',
        descricao: `Projeto solar iniciado na etapa "${initialEtapa}".`,
      })
      setProjetoEventos((prev) => [ev, ...prev])
    } catch (e) {
      console.warn('Erro ao criar evento inicial do projeto:', e)
    }

    // Registrar na timeline de atividades do cliente
    try {
      const ativ = await apiCreateAtividade({
        cliente_id: data.cliente_id,
        tipo: 'mudanca_estagio',
        titulo: `Projeto: ${initialEtapa}`,
        descricao: `Novo projeto iniciado na etapa "${initialEtapa}".${created.profissional_nome ? ` Profissional responsável: ${created.profissional_nome}.` : ''}`,
        data: new Date().toISOString(),
        autor: 'João Silva',
        status: 'concluida',
      })
      setAtividades((prev) => [ativ, ...prev])
    } catch (e) {
      console.warn('Erro ao registrar atividade inicial do projeto:', e)
    }

    return created
  }

  const updateProjeto = async (id: string, data: Partial<Projeto>) => {
    const updated = await apiUpdateProjeto(id, data)
    setProjetos((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }

  const updateProjetoEtapa = async (
    projetoId: string,
    novaEtapa: ProjetoEtapa,
    options?: {
      profissional_id?: string
      profissional_nome?: string
      descricao?: string
    },
  ) => {
    const prevProj = projetos.find((p) => p.id === projetoId)
    const etapaAnterior = prevProj?.etapa || ''
    if (etapaAnterior === novaEtapa && !options?.profissional_id) {
      return prevProj!
    }

    const payload: Partial<Projeto> = {
      etapa: novaEtapa,
    }
    if (options?.profissional_id !== undefined) {
      payload.profissional_id = options.profissional_id
      payload.profissional_nome = options.profissional_nome || ''
    }

    // Optimistic update
    setProjetos((prev) => prev.map((p) => (p.id === projetoId ? { ...p, ...payload } : p)))

    try {
      const updated = await apiUpdateProjeto(projetoId, payload)
      setProjetos((prev) => prev.map((p) => (p.id === projetoId ? updated : p)))

      // Registrar evento no histórico de projeto_eventos
      try {
        const ev = await apiCreateProjetoEvento({
          projeto_id: projetoId,
          etapa_anterior: etapaAnterior,
          etapa_nova: novaEtapa,
          profissional_nome: updated.profissional_nome || '',
          autor: 'João Silva',
          descricao:
            options?.descricao ||
            `Projeto avançou de "${etapaAnterior}" para "${novaEtapa}".${updated.profissional_nome ? ` Profissional: ${updated.profissional_nome}.` : ''}`,
        })
        setProjetoEventos((prev) => [ev, ...prev])
      } catch (evErr) {
        console.warn('Erro ao registrar projeto_evento:', evErr)
      }

      // Registrar entrada na timeline do cliente (aba Histórico)
      if (updated.cliente_id) {
        try {
          const ativ = await apiCreateAtividade({
            cliente_id: updated.cliente_id,
            tipo: 'mudanca_estagio',
            titulo: `Projeto: ${etapaAnterior ? `${etapaAnterior} → ` : ''}${novaEtapa}`,
            descricao: `Projeto de energia solar avançou para a etapa "${novaEtapa}".${updated.profissional_nome ? ` Responsável: ${updated.profissional_nome}.` : ''}`,
            data: new Date().toISOString(),
            autor: 'João Silva',
            status: 'concluida',
          })
          setAtividades((prev) => [ativ, ...prev])
        } catch (ativErr) {
          console.warn('Erro ao registrar atividade de projeto:', ativErr)
        }
      }

      return updated
    } catch (err) {
      console.error('Erro ao atualizar etapa do projeto:', err)
      fetchProjetos().then(setProjetos).catch(console.error)
      throw err
    }
  }

  const assignProjetoProfissional = async (
    projetoId: string,
    profissionalId: string | null,
    profissionalNome: string | null,
  ) => {
    const payload: Partial<Projeto> = {
      profissional_id: profissionalId || '',
      profissional_nome: profissionalNome || '',
    }
    const updated = await apiUpdateProjeto(projetoId, payload)
    setProjetos((prev) => prev.map((p) => (p.id === projetoId ? updated : p)))

    // Registrar evento no projeto_eventos
    try {
      const ev = await apiCreateProjetoEvento({
        projeto_id: projetoId,
        etapa_nova: updated.etapa,
        profissional_nome: updated.profissional_nome || '',
        autor: 'João Silva',
        descricao: updated.profissional_nome
          ? `Profissional ${updated.profissional_nome} atribuído à etapa ${updated.etapa}.`
          : `Profissional desatribuído da etapa ${updated.etapa}.`,
      })
      setProjetoEventos((prev) => [ev, ...prev])
    } catch (e) {
      console.warn('Erro ao registrar evento de atribuição:', e)
    }

    // Registrar no histórico do cliente
    if (updated.cliente_id && updated.profissional_nome) {
      try {
        const ativ = await apiCreateAtividade({
          cliente_id: updated.cliente_id,
          tipo: 'mudanca_estagio',
          titulo: `Profissional atribuído: ${updated.profissional_nome}`,
          descricao: `Profissional ${updated.profissional_nome} foi designado para a etapa de "${updated.etapa}".`,
          data: new Date().toISOString(),
          autor: 'João Silva',
          status: 'concluida',
        })
        setAtividades((prev) => [ativ, ...prev])
      } catch (e) {
        console.warn('Erro ao registrar atividade de profissional:', e)
      }
    }

    return updated
  }

  const removeProjeto = async (id: string) => {
    await apiDeleteProjeto(id)
    setProjetos((prev) => prev.filter((p) => p.id !== id))
  }

  // Funções O&M
  const openFichaOM = (clienteId: string) => {
    // Abrir diretamente a FichaClienteDrawer na aba 'om'
    setSelectedClienteId(clienteId)
    setActiveClientTab('om')
    setSelectedOMClienteId(clienteId)
  }

  const closeFichaOM = () => {
    setSelectedOMClienteId(null)
  }

  const addContratoOM = async (data: Parameters<typeof apiCreateContratoOM>[0]) => {
    const created = await apiCreateContratoOM(data)
    setContratosOM((prev) => [created, ...prev.filter((c) => c.id !== created.id)])
    return created
  }

  const updateContratoOM = async (id: string, data: Partial<ContratoOM>) => {
    setContratosOM((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)))
    const updated = await apiUpdateContratoOM(id, data)
    setContratosOM((prev) => prev.map((c) => (c.id === id ? updated : c)))
    return updated
  }

  const removeContratoOM = async (id: string) => {
    await apiDeleteContratoOM(id)
    setContratosOM((prev) => prev.filter((c) => c.id !== id))
  }

  const encerrarContratoOM = async (
    contratoId: string,
    dadosEncerramento: {
      motivo_encerramento: import('@/types/crm').OMMotivoEncerramento
      data_encerramento: string
      observacoes_encerramento?: string
    },
  ) => {
    const contratoAtual = contratosOM.find((c) => c.id === contratoId)
    const updatePayload: Partial<ContratoOM> = {
      status: 'Encerrado',
      status_encerramento: 'encerrado',
      motivo_encerramento: dadosEncerramento.motivo_encerramento,
      data_encerramento: dadosEncerramento.data_encerramento,
      observacoes_encerramento: dadosEncerramento.observacoes_encerramento || '',
    }

    const updated = await updateContratoOM(contratoId, updatePayload)

    // Registrar na timeline do cliente e O&M para manter histórico auditável
    if (contratoAtual?.cliente_id) {
      try {
        const obsFormatada = dadosEncerramento.observacoes_encerramento
          ? ` Obs: ${dadosEncerramento.observacoes_encerramento}`
          : ''
        const timeEv = await apiCreateTimelineOM({
          cliente_id: contratoAtual.cliente_id,
          contrato_id: contratoId,
          tipo: 'interacao',
          titulo: `Encerramento de Contrato O&M (${contratoAtual.plano})`,
          descricao: `Motivo: ${dadosEncerramento.motivo_encerramento}. Data: ${new Date(dadosEncerramento.data_encerramento).toLocaleDateString('pt-BR')}.${obsFormatada}`,
          data: dadosEncerramento.data_encerramento || new Date().toISOString(),
          autor: 'Equipe Delfos Solar',
          status_tag: 'Encerrado',
        })
        setTimelineOM((prev) => [timeEv, ...prev])
      } catch (e) {
        console.warn('Erro ao registrar encerramento na timeline:', e)
      }
    }

    return updated
  }

  const renovarContratoOM = async (contratoId: string, mesesAdicionais = 12) => {
    const contratoAtual = contratosOM.find((c) => c.id === contratoId)
    if (!contratoAtual) {
      throw new Error('Contrato não encontrado')
    }

    // Calcular nova data de vencimento a partir da data de vencimento atual ou de hoje
    let baseDate = new Date()
    if (contratoAtual.data_vencimento) {
      const parsed = new Date(contratoAtual.data_vencimento)
      if (!isNaN(parsed.getTime())) {
        // Se a data de vencimento ainda for futura, prorroga a partir dela. Se já venceu, a partir de hoje
        baseDate = parsed.getTime() > Date.now() ? parsed : new Date()
      }
    }

    const novoVencimento = new Date(baseDate)
    novoVencimento.setMonth(novoVencimento.getMonth() + mesesAdicionais)

    const updatePayload: Partial<ContratoOM> = {
      status: 'Ativo',
      status_encerramento: 'vigente',
      motivo_encerramento: undefined,
      data_encerramento: undefined,
      observacoes_encerramento: undefined,
      data_vencimento: novoVencimento.toISOString(),
      proxima_atividade_titulo: `Revisão preventiva semestral - Renovação Plano ${contratoAtual.plano}`,
      proxima_atividade_data: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    const updated = await updateContratoOM(contratoId, updatePayload)

    // Registrar na timeline do cliente
    if (contratoAtual.cliente_id) {
      try {
        const timeEv = await apiCreateTimelineOM({
          cliente_id: contratoAtual.cliente_id,
          contrato_id: contratoId,
          tipo: 'interacao',
          titulo: `Renovação de Contrato O&M (${contratoAtual.plano})`,
          descricao: `Contrato renovado por mais ${mesesAdicionais} meses. Nova vigência até ${novoVencimento.toLocaleDateString('pt-BR')}. Alerta de vencimento limpo.`,
          data: new Date().toISOString(),
          autor: 'Equipe Delfos Solar',
          status_tag: 'Ativo',
        })
        setTimelineOM((prev) => [timeEv, ...prev])
      } catch (e) {
        console.warn('Erro ao registrar renovação na timeline:', e)
      }
    }

    return updated
  }

  const addAnomaliaOM = async (data: Parameters<typeof apiCreateAnomaliaOM>[0]) => {
    const created = await apiCreateAnomaliaOM(data)
    setAnomaliasOM((prev) => [created, ...prev.filter((a) => a.id !== created.id)])
    // Adicionar à timeline também
    try {
      const timeEv = await apiCreateTimelineOM({
        cliente_id: data.cliente_id,
        contrato_id: data.contrato_id,
        tipo: 'anomalia',
        titulo: `Nova Anomalia: ${data.titulo}`,
        descricao: data.descricao || `Anomalia registrada na etapa ${data.etapa}.`,
        data: data.data_abertura || new Date().toISOString(),
        autor: data.tecnico_nome || 'Sistema Delfos',
        status_tag: data.status,
      })
      setTimelineOM((prev) => [timeEv, ...prev])
    } catch (e) {
      console.warn('Erro ao registrar timeline para anomalia:', e)
    }
    return created
  }

  const updateAnomaliaOM = async (id: string, data: Partial<AnomaliaOM>) => {
    setAnomaliasOM((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)))
    const updated = await apiUpdateAnomaliaOM(id, data)
    setAnomaliasOM((prev) => prev.map((a) => (a.id === id ? updated : a)))
    // Se mudou etapa ou status, logar na timeline
    if (data.etapa || data.status) {
      try {
        const timeEv = await apiCreateTimelineOM({
          cliente_id: updated.cliente_id,
          contrato_id: updated.contrato_id,
          tipo: 'anomalia',
          titulo: `Anomalia atualizada: ${updated.titulo}`,
          descricao: `Etapa: ${updated.etapa} | Status: ${updated.status}`,
          data: new Date().toISOString(),
          autor: updated.tecnico_nome || 'Sistema Delfos',
          status_tag: updated.status,
        })
        setTimelineOM((prev) => [timeEv, ...prev])
      } catch (e) {
        console.warn('Erro ao registrar timeline de update de anomalia:', e)
      }
    }
    return updated
  }

  const removeAnomaliaOM = async (id: string) => {
    await apiDeleteAnomaliaOM(id)
    setAnomaliasOM((prev) => prev.filter((a) => a.id !== id))
  }

  const addServicoAdicionalOM = async (data: Parameters<typeof apiCreateServicoAdicionalOM>[0]) => {
    const created = await apiCreateServicoAdicionalOM(data)
    setServicosAdicionaisOM((prev) => [created, ...prev.filter((s) => s.id !== created.id)])
    // Registrar na timeline
    try {
      const timeEv = await apiCreateTimelineOM({
        cliente_id: data.cliente_id,
        contrato_id: data.contrato_id,
        tipo: 'servico_adicional',
        titulo: `Serviço Extra: ${data.descricao}`,
        descricao: `Valor: R$ ${data.valor.toFixed(2)} | Status: ${data.status}`,
        data: data.data || new Date().toISOString(),
        autor: data.tecnico_nome || 'João Silva',
        status_tag: data.status,
      })
      setTimelineOM((prev) => [timeEv, ...prev])
    } catch (e) {
      console.warn('Erro ao registrar timeline para servico adicional:', e)
    }
    return created
  }

  const updateServicoAdicionalOM = async (id: string, data: Partial<ServicoAdicionalOM>) => {
    setServicosAdicionaisOM((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))
    const updated = await apiUpdateServicoAdicionalOM(id, data)
    setServicosAdicionaisOM((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  const removeServicoAdicionalOM = async (id: string) => {
    await apiDeleteServicoAdicionalOM(id)
    setServicosAdicionaisOM((prev) => prev.filter((s) => s.id !== id))
  }

  const addServicoAvulso = async (data: Parameters<typeof apiCreateServicoAvulso>[0]) => {
    const created = await apiCreateServicoAvulso(data)
    setServicosAvulsos((prev) => [created, ...prev.filter((s) => s.id !== created.id)])
    // Log na timeline
    try {
      const tipoLabels: Record<string, string> = {
        limpeza: 'Limpeza dos módulos',
        troca_equipamento: 'Troca de equipamento',
        visita_tecnica: 'Visita técnica',
        reaperto: 'Reaperto conexões/fixações',
        outro: 'Serviço técnico avulso',
      }
      const label = tipoLabels[data.tipo_servico] || data.tipo_servico
      const timeEv = await apiCreateTimelineOM({
        cliente_id: data.cliente_id,
        tipo: 'servico_adicional',
        titulo: `Serviço Avulso: ${label}`,
        descricao: `Valor: R$ ${(data.valor_cobrado || 0).toFixed(2)} | Status: ${data.status}${data.observacoes_tecnicas ? ` | Obs: ${data.observacoes_tecnicas}` : ''}`,
        data: data.data_servico || new Date().toISOString(),
        autor: 'Equipe Delfos Solar',
        status_tag: data.status,
      })
      setTimelineOM((prev) => [timeEv, ...prev])
    } catch (e) {
      console.warn('Erro ao registrar timeline para servico avulso:', e)
    }
    return created
  }

  const updateServicoAvulso = async (id: string, data: Partial<ServicoAvulso>) => {
    setServicosAvulsos((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)))
    const updated = await apiUpdateServicoAvulso(id, data)
    setServicosAvulsos((prev) => prev.map((s) => (s.id === id ? updated : s)))
    return updated
  }

  const removeServicoAvulso = async (id: string) => {
    await apiDeleteServicoAvulso(id)
    setServicosAvulsos((prev) => prev.filter((s) => s.id !== id))
  }

  const addTransferenciaCredito = async (
    data: Parameters<typeof import('@/services/crmService').createTransferenciaCredito>[0],
  ) => {
    const s = await import('@/services/crmService')
    const created = await s.createTransferenciaCredito(data)
    setTransferenciasCreditos((prev) => [created, ...prev.filter((t) => t.id !== created.id)])
    return created
  }

  const updateTransferenciaCredito = async (
    id: string,
    data: Partial<import('@/types/crm').TransferenciaCredito>,
  ) => {
    const s = await import('@/services/crmService')
    const updated = await s.updateTransferenciaCredito(id, data)
    setTransferenciasCreditos((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }

  const removeTransferenciaCredito = async (id: string) => {
    const s = await import('@/services/crmService')
    await s.deleteTransferenciaCredito(id)
    setTransferenciasCreditos((prev) => prev.filter((t) => t.id !== id))
  }

  const refreshTransferenciasCreditos = async () => {
    const s = await import('@/services/crmService')
    const list = await s.fetchTransferenciasCreditos()
    setTransferenciasCreditos(list)
  }

  const addOrUpdateDocumentoCliente = async (
    data: Parameters<typeof import('@/services/crmService').upsertDocumentoCliente>[0],
  ) => {
    const s = await import('@/services/crmService')
    const saved = await s.upsertDocumentoCliente(data)
    setDocumentosCliente((prev) => [saved, ...prev.filter((d) => d.id !== saved.id)])
    return saved
  }

  const updateDocumentoClienteStatus = async (
    id: string,
    status: import('@/types/crm').DocumentoClienteStatusAssinatura,
    dataAssinatura?: string,
  ) => {
    const s = await import('@/services/crmService')
    const updated = await s.updateDocumentoClienteStatus(id, status, dataAssinatura)
    setDocumentosCliente((prev) => prev.map((d) => (d.id === id ? updated : d)))
    return updated
  }

  const removeDocumentoCliente = async (id: string) => {
    const s = await import('@/services/crmService')
    await s.deleteDocumentoCliente(id)
    setDocumentosCliente((prev) => prev.filter((d) => d.id !== id))
  }

  const refreshDocumentosCliente = async () => {
    const s = await import('@/services/crmService')
    const list = await s.fetchDocumentosCliente()
    setDocumentosCliente(list)
  }

  const getDocumentoCliente = (
    clienteId: string,
    tipo: import('@/types/crm').DocumentoClienteTipo,
  ) => {
    return documentosCliente.find((d) => d.cliente_id === clienteId && d.tipo === tipo)
  }

  const addTimelineOM = async (data: Parameters<typeof apiCreateTimelineOM>[0]) => {
    const created = await apiCreateTimelineOM(data)
    setTimelineOM((prev) => [created, ...prev])
    return created
  }

  const addPropostaOM = async (data: Parameters<typeof apiCreatePropostaOM>[0]) => {
    const created = await apiCreatePropostaOM(data)
    setPropostasOM((prev) => [created, ...prev])
    return created
  }

  const updatePropostaOM = async (id: string, data: Partial<PropostaOM>): Promise<PropostaOM> => {
    const updated = await apiUpdatePropostaOM(id, data)
    setPropostasOM((prev) => prev.map((p) => (p.id === id ? updated : p)))
    return updated
  }

  const removePropostaOM = async (id: string) => {
    await apiDeletePropostaOM(id)
    setPropostasOM((prev) => prev.filter((p) => p.id !== id))
  }

  const addOrcamentoSolar = async (data: Partial<OrcamentoSolar>): Promise<OrcamentoSolar> => {
    const created = await apiCreateOrcamentoSolar(data)
    setOrcamentosSolar((prev) => [created, ...prev.filter((o) => o.id !== created.id)])
    return created
  }

  const updateOrcamentoSolar = async (
    id: string,
    data: Partial<OrcamentoSolar>,
  ): Promise<OrcamentoSolar> => {
    const updated = await apiUpdateOrcamentoSolar(id, data)
    setOrcamentosSolar((prev) => prev.map((o) => (o.id === id ? updated : o)))
    return updated
  }

  const removeOrcamentoSolar = async (id: string): Promise<void> => {
    await apiDeleteOrcamentoSolar(id)
    setOrcamentosSolar((prev) => prev.filter((o) => o.id !== id))
  }

  const addWhatsAppTemplate = async (
    data: Partial<WhatsAppTemplate>,
  ): Promise<WhatsAppTemplate> => {
    const created = await apiCreateWhatsAppTemplate(data)
    setWhatsAppTemplates((prev) => [...prev, created])
    return created
  }

  const updateWhatsAppTemplate = async (
    id: string,
    data: Partial<WhatsAppTemplate>,
  ): Promise<WhatsAppTemplate> => {
    const updated = await apiUpdateWhatsAppTemplate(id, data)
    setWhatsAppTemplates((prev) => prev.map((t) => (t.id === id ? updated : t)))
    return updated
  }

  const removeWhatsAppTemplate = async (id: string): Promise<void> => {
    await apiDeleteWhatsAppTemplate(id)
    setWhatsAppTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  const refreshConversas = async () => {
    const refreshed = await fetchWhatsAppConversas()
    setWhatsAppConversas(refreshed)
    return refreshed
  }

  const vincularConversa = async (
    conversaId: string,
    clienteId: string,
    atendenteNome?: string,
  ) => {
    const updated = await apiVincularConversaCliente(conversaId, clienteId, atendenteNome)
    setWhatsAppConversas((prev) => prev.map((c) => (c.id === conversaId ? updated : c)))
    const [cRes, mRes] = await Promise.allSettled([fetchClientes(), fetchWhatsAppMensagens()])
    if (cRes.status === 'fulfilled') {
      setClientes(cRes.value)
    }
    if (mRes.status === 'fulfilled') {
      setWhatsAppMensagens(mRes.value)
    }
    return updated
  }

  const assumirAtendimento = async (
    conversaId: string,
    atendenteNome: string,
    atendenteId?: string,
  ) => {
    const updated = await apiAssumirConversa(conversaId, atendenteNome, atendenteId)
    setWhatsAppConversas((prev) => prev.map((c) => (c.id === conversaId ? updated : c)))
    return updated
  }

  const finalizarAtendimento = async (conversaId: string) => {
    const updated = await apiFinalizarConversa(conversaId)
    setWhatsAppConversas((prev) => prev.map((c) => (c.id === conversaId ? updated : c)))
    return updated
  }

  const cadastrarLeadDeConversa = async (
    conversaId: string,
    leadData: {
      nome: string
      telefone: string
      email?: string
      cpf?: string
      endereco?: string
      produto?: import('@/types/crm').ProdutoTipo
      tipo_cliente?: import('@/types/crm').ClienteTipo
      origem_lead?: import('@/types/crm').OrigemLeadTipo
    },
    atendenteNome?: string,
    atendenteId?: string,
  ) => {
    // 1. Criar novo cliente
    const rawTelefone = leadData.telefone.trim()
    const tipoClienteFinal: import('@/types/crm').ClienteTipo =
      leadData.tipo_cliente ||
      ((leadData.produto &&
      ['residencial', 'comercial', 'industrial', 'rural', 'investidor'].includes(
        leadData.produto as string,
      )
        ? leadData.produto
        : 'residencial') as import('@/types/crm').ClienteTipo)

    const novoCliente = await apiCreateCliente({
      nome: leadData.nome.trim(),
      telefone: rawTelefone,
      whatsapp: rawTelefone,
      email: leadData.email?.trim() || '',
      cpf: leadData.cpf?.trim() || '',
      endereco: leadData.endereco?.trim() || '',
      usina_endereco: leadData.endereco?.trim() || '',
      tipo_cliente: tipoClienteFinal,
      produto: leadData.produto || tipoClienteFinal,
      origem_lead: leadData.origem_lead || 'WhatsApp',
      status: 'Novo Lead',
    })

    // 2. Vincular conversa ao novo cliente e passar para em_atendimento
    const updatedConversa = await apiVincularConversaCliente(
      conversaId,
      novoCliente.id,
      atendenteNome,
    )

    // Se tiver atendenteId ou quiser assegurar atendente_id
    if (atendenteId) {
      await apiUpdateWhatsAppConversa(conversaId, {
        atendente_id: atendenteId,
      })
      updatedConversa.atendente_id = atendenteId
    }

    // 3. Atualizar estados locais e recarregar
    setClientes((prev) => [novoCliente, ...prev.filter((c) => c.id !== novoCliente.id)])
    setWhatsAppConversas((prev) => prev.map((c) => (c.id === conversaId ? updatedConversa : c)))
    const [cRes, mRes] = await Promise.allSettled([fetchClientes(), fetchWhatsAppMensagens()])
    if (cRes.status === 'fulfilled') {
      setClientes(cRes.value)
    }
    if (mRes.status === 'fulfilled') {
      setWhatsAppMensagens(mRes.value)
    }

    return { cliente: novoCliente, conversa: updatedConversa }
  }

  const cadastrarOutroContatoDeConversa = async (
    conversaId: string,
    contatoData: {
      nome: string
      telefone: string
      tipo_contato: import('@/types/crm').OutroContatoTipo
      observacao?: string
    },
  ) => {
    // 1. Criar registro na collection outros_contatos
    const { createOutroContato } = await import('@/services/crmService')
    const novoContato = await createOutroContato({
      nome: contatoData.nome,
      telefone: contatoData.telefone,
      tipo_contato: contatoData.tipo_contato,
      observacao: contatoData.observacao || '',
      conversa_id: conversaId,
    })

    // 2. Finalizar/resolver conversa para remover da fila de novos
    const updatedConversa = await apiFinalizarConversa(conversaId)

    // 3. Atualizar estado local
    setWhatsAppConversas((prev) => prev.map((c) => (c.id === conversaId ? updatedConversa : c)))

    return { contato: novoContato, conversa: updatedConversa }
  }

  const sendWhatsAppMessage = async (data: {
    cliente_id?: string
    conversa_id?: string
    telefone_destino: string
    conteudo_final: string
    template_id?: string
    agendado_para?: string | null
    tipo_disparo?: string
    referencia_id?: string
  }) => {
    const res = await apiSendWhatsAppMensagem(data)
    // Atualiza mensagens e conversas
    const [msgsRes, convsRes] = await Promise.allSettled([
      fetchWhatsAppMensagens(),
      fetchWhatsAppConversas(),
    ])
    if (msgsRes.status === 'fulfilled') {
      setWhatsAppMensagens(msgsRes.value)
    }
    if (convsRes.status === 'fulfilled') {
      setWhatsAppConversas(convsRes.value)
    }
    return res
  }

  const sendWhatsAppDocument = async (data: {
    cliente_id: string
    telefone_destino: string
    tipo: 'orcamento_solar' | 'proposta_om' | 'documento'
    referencia_id?: string
    legenda?: string
    nome_arquivo?: string
    base64?: string
    documento_url?: string
  }) => {
    const res = await apiSendWhatsAppDocumento(data)
    // Atualiza mensagens e atividades da timeline
    const refreshed = await fetchWhatsAppMensagens()
    setWhatsAppMensagens(refreshed)
    try {
      const atvs = await fetchAtividades()
      setAtividades(atvs)
    } catch {
      /* intentionally ignored */
    }
    return res
  }

  const sendWhatsAppAudioMessage = async (data: {
    cliente_id?: string
    conversa_id?: string
    telefone_destino: string
    audio: string
    duracao_segundos?: number
    referencia_id?: string
  }) => {
    const res = await apiSendWhatsAppAudio(data)
    // Atualiza mensagens, conversas e atividades do histórico
    const [msgsRes, convsRes] = await Promise.allSettled([
      fetchWhatsAppMensagens(),
      fetchWhatsAppConversas(),
    ])
    if (msgsRes.status === 'fulfilled') {
      setWhatsAppMensagens(msgsRes.value)
    }
    if (convsRes.status === 'fulfilled') {
      setWhatsAppConversas(convsRes.value)
    }
    try {
      const atvs = await fetchAtividades()
      setAtividades(atvs)
    } catch {
      /* intentionally ignored */
    }
    return res
  }

  const refreshWhatsAppConfig = async () => {
    const cfg = await fetchWhatsAppConfigStatus()
    setWhatsAppConfig(cfg)
  }

  const selectedCliente = clientes.find((c) => c.id === selectedClienteId) || null
  const selectedSistema = sistemas.find((s) => s.cliente_id === selectedClienteId) || null
  const selectedClienteProjeto = projetos.find((p) => p.cliente_id === selectedClienteId) || null
  const selectedContratoOM =
    contratosOM.find((c) => c.cliente_id === (selectedOMClienteId || selectedClienteId)) || null

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        sistemas,
        manutencoes,
        atividades,
        usuarios,
        profissionais,
        projetos,
        projetoEventos,
        contratosOM,
        anomaliasOM,
        servicosAdicionaisOM,
        servicosAvulsos,
        addServicoAvulso,
        updateServicoAvulso,
        removeServicoAvulso,
        transferenciasCreditos,
        addTransferenciaCredito,
        updateTransferenciaCredito,
        removeTransferenciaCredito,
        refreshTransferenciasCreditos,
        documentosCliente,
        addOrUpdateDocumentoCliente,
        updateDocumentoClienteStatus,
        removeDocumentoCliente,
        refreshDocumentosCliente,
        getDocumentoCliente,
        timelineOM,
        isLoading,
        error,
        selectedClienteId,
        selectedCliente,
        selectedSistema,
        selectedClienteProjeto,
        selectedContratoOM,
        activeClientTab,
        selectedOMClienteId,
        openFichaOM,
        closeFichaOM,
        setActiveClientTab,
        openFichaCliente,
        closeFichaCliente,
        addCliente,
        removeCliente,
        bulkRemoveClientes,
        mesclarClientes,
        addManutencao,
        removeManutencao,
        addAtividade,
        updateAtividade,
        updateAtividadeStatus,
        removeAtividade,
        tiposAtividadesCustom,
        addTipoAtividadeCustom,
        removeTipoAtividadeCustom,
        refreshTiposAtividadesCustom,
        updateCliente,
        updateClienteStatus,
        bulkUpdateEtapa,
        bulkUpdateResponsavel,
        bulkMarcarFechado,
        bulkTransferirFechadosPosVendas,
        marcarComoGanho,
        marcarComoPerdido,
        bulkArquivar,
        updateSistema,
        addProfissional,
        updateProfissional,
        removeProfissional,
        addProjeto,
        updateProjeto,
        updateProjetoEtapa,
        assignProjetoProfissional,
        removeProjeto,
        addContratoOM,
        updateContratoOM,
        removeContratoOM,
        encerrarContratoOM,
        renovarContratoOM,
        addAnomaliaOM,
        updateAnomaliaOM,
        removeAnomaliaOM,
        addServicoAdicionalOM,
        updateServicoAdicionalOM,
        removeServicoAdicionalOM,
        addTimelineOM,
        propostasOM,
        addPropostaOM,
        updatePropostaOM,
        removePropostaOM,
        orcamentosSolar,
        addOrcamentoSolar,
        updateOrcamentoSolar,
        removeOrcamentoSolar,
        fornecedores,
        fornecedoresOrcamentos,
        addFornecedor: async (data) => {
          const s = await import('@/services/crmService')
          const created = await s.createFornecedor(data)
          setFornecedores((prev) => [...prev, created])
          return created
        },
        updateFornecedor: async (id, data) => {
          const s = await import('@/services/crmService')
          const updated = await s.updateFornecedor(id, data)
          setFornecedores((prev) => prev.map((f) => (f.id === id ? updated : f)))
          return updated
        },
        removeFornecedor: async (id) => {
          const s = await import('@/services/crmService')
          await s.deleteFornecedor(id)
          setFornecedores((prev) => prev.filter((f) => f.id !== id))
        },
        addFornecedorOrcamento: async (data, file) => {
          const s = await import('@/services/crmService')
          const created = await s.createFornecedorOrcamento(data, file)
          setFornecedoresOrcamentos((prev) => [created, ...prev])
          return created
        },
        updateFornecedorOrcamento: async (id, data, file) => {
          const s = await import('@/services/crmService')
          const updated = await s.updateFornecedorOrcamento(id, data, file)
          setFornecedoresOrcamentos((prev) => prev.map((o) => (o.id === id ? updated : o)))
          return updated
        },
        selecionarFornecedorOrcamento: async (id, options) => {
          const s = await import('@/services/crmService')
          const updated = await s.selecionarFornecedorOrcamento(id, options)
          setFornecedoresOrcamentos((prev) =>
            prev.map((o) => {
              if (o.id === id) return updated
              // Se pertencer ao mesmo projeto/cliente, desmarcar selecionado
              const mesmoProjeto =
                (options?.orcamentoSolarId && o.orcamento_solar_id === options.orcamentoSolarId) ||
                (options?.clienteId && o.cliente_id === options.clienteId)
              if (mesmoProjeto && o.selecionado) {
                return { ...o, selecionado: false }
              }
              return o
            }),
          )
          return updated
        },
        removeFornecedorOrcamento: async (id) => {
          const s = await import('@/services/crmService')
          await s.deleteFornecedorOrcamento(id)
          setFornecedoresOrcamentos((prev) => prev.filter((o) => o.id !== id))
        },
        refreshFornecedores: async () => {
          const s = await import('@/services/crmService')
          const [fList, foList] = await Promise.all([
            s.fetchFornecedores(),
            s.fetchFornecedoresOrcamentos(),
          ])
          setFornecedores(fList)
          setFornecedoresOrcamentos(foList)
        },
        contatosAdicionais,
        addContatoAdicional: async (data) => {
          const s = await import('@/services/crmService')
          const created = await s.createContatoAdicional(data)
          setContatosAdicionais((prev) => [...prev, created])
          return created
        },
        updateContatoAdicional: async (id, data) => {
          const s = await import('@/services/crmService')
          const updated = await s.updateContatoAdicional(id, data)
          setContatosAdicionais((prev) => prev.map((c) => (c.id === id ? updated : c)))
          return updated
        },
        removeContatoAdicional: async (id) => {
          const s = await import('@/services/crmService')
          await s.deleteContatoAdicional(id)
          setContatosAdicionais((prev) => prev.filter((c) => c.id !== id))
        },
        refreshContatosAdicionais: async () => {
          const s = await import('@/services/crmService')
          const list = await s.fetchContatosAdicionais()
          setContatosAdicionais(list)
        },
        whatsAppTemplates,
        whatsAppMensagens,
        whatsAppConversas,
        whatsAppConfig,
        addWhatsAppTemplate,
        updateWhatsAppTemplate,
        removeWhatsAppTemplate,
        vincularConversa,
        assumirAtendimento,
        finalizarAtendimento,
        cadastrarLeadDeConversa,
        cadastrarOutroContatoDeConversa,
        refreshConversas,
        sendWhatsAppMessage,
        sendWhatsAppDocument,
        sendWhatsAppAudioMessage,
        refreshWhatsAppConfig,
        refreshData: loadAllData,
      }}
    >
      {children}
    </ClientesContext.Provider>
  )
}

export function useClientes(): ClientesContextType {
  const context = useContext(ClientesContext)
  if (!context) {
    throw new Error('useClientes must be used within a ClientesProvider')
  }
  return context
}

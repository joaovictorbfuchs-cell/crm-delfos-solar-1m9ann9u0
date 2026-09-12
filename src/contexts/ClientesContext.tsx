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
  createAtividade as apiCreateAtividade,
  updateAtividade as apiUpdateAtividade,
  deleteAtividade as apiDeleteAtividade,
  createManutencao as apiCreateManutencao,
  createCliente as apiCreateCliente,
  updateCliente as apiUpdateCliente,
  updateClienteStatus as apiUpdateClienteStatus,
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
  WhatsAppTemplate,
  WhatsAppMensagem,
  WhatsAppConversa,
  WhatsAppConfigStatus,
} from '@/types/crm'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/contexts/AuthContext'

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
  timelineOM: TimelineOM[]
  propostasOM: PropostaOM[]
  orcamentosSolar: OrcamentoSolar[]
  fornecedores: import('@/types/crm').Fornecedor[]
  fornecedoresOrcamentos: import('@/types/crm').FornecedorOrcamento[]
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
  activeClientTab: 'historico' | 'projeto' | 'om' | 'whatsapp'
  selectedOMClienteId: string | null
  openFichaOM: (clienteId: string) => void
  closeFichaOM: () => void
  setActiveClientTab: (tab: 'historico' | 'projeto' | 'om' | 'whatsapp') => void
  openFichaCliente: (id: string, initialTab?: 'historico' | 'projeto' | 'om' | 'whatsapp') => void
  closeFichaCliente: () => void
  addCliente: (data: Partial<Cliente> & { nome: string }) => Promise<Cliente>
  addManutencao: (data: {
    cliente_id: string
    data: string
    tipo: ManutencaoTipo
    status: ManutencaoStatus
    tecnico?: string
    descricao?: string
  }) => Promise<Manutencao>
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
  updateCliente: (id: string, data: Partial<Cliente>) => Promise<Cliente>
  updateClienteStatus: (
    id: string,
    status: Cliente['status'],
    options?: { skipActivityLog?: boolean },
  ) => Promise<void>
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
  addTimelineOM: (data: Parameters<typeof apiCreateTimelineOM>[0]) => Promise<TimelineOM>
  addPropostaOM: (data: Parameters<typeof apiCreatePropostaOM>[0]) => Promise<PropostaOM>
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
  const [timelineOM, setTimelineOM] = useState<TimelineOM[]>([])
  const [propostasOM, setPropostasOM] = useState<PropostaOM[]>([])
  const [orcamentosSolar, setOrcamentosSolar] = useState<OrcamentoSolar[]>([])
  const [fornecedores, setFornecedores] = useState<import('@/types/crm').Fornecedor[]>([])
  const [fornecedoresOrcamentos, setFornecedoresOrcamentos] = useState<
    import('@/types/crm').FornecedorOrcamento[]
  >([])
  const [whatsAppTemplates, setWhatsAppTemplates] = useState<WhatsAppTemplate[]>([])
  const [whatsAppMensagens, setWhatsAppMensagens] = useState<WhatsAppMensagem[]>([])
  const [whatsAppConversas, setWhatsAppConversas] = useState<WhatsAppConversa[]>([])
  const [whatsAppConfig, setWhatsAppConfig] = useState<WhatsAppConfigStatus | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)
  const [selectedOMClienteId, setSelectedOMClienteId] = useState<string | null>(null)
  const [activeClientTab, setActiveClientTab] = useState<
    'historico' | 'projeto' | 'om' | 'whatsapp'
  >('historico')

  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false)
      return
    }
    try {
      setIsLoading(true)
      setError(null)
      const [
        cList,
        sList,
        mList,
        aList,
        uList,
        pList,
        projList,
        evList,
        contList,
        anomList,
        adicList,
        timeList,
        propList,
        orcList,
        tplList,
        msgList,
        cfgStatus,
        convList,
        fornList,
        fornOrcList,
      ] = await Promise.all([
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
      ])
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
      setTimelineOM(timeList)
      setPropostasOM(propList)
      setOrcamentosSolar(orcList)
      setWhatsAppTemplates(tplList)
      setWhatsAppMensagens(msgList)
      setWhatsAppConversas(convList)
      setWhatsAppConfig(cfgStatus)
      setFornecedores(fornList)
      setFornecedoresOrcamentos(fornOrcList)
    } catch (err: unknown) {
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

  // Realtime updates for atividades
  useRealtime<Atividade>(
    'atividades',
    () => {
      fetchAtividades().then(setAtividades).catch(console.error)
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

  const addCliente = async (data: Partial<Cliente> & { nome: string }) => {
    const created = await apiCreateCliente(data)
    // Atualiza estado local imediatamente caso o realtime demore
    setClientes((prev) => {
      if (prev.some((c) => c.id === created.id)) return prev
      return [created, ...prev]
    })
    return created
  }

  const openFichaCliente = (
    id: string,
    initialTab: 'historico' | 'projeto' | 'om' | 'whatsapp' = 'historico',
  ) => {
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
    options?: { skipActivityLog?: boolean },
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
          const act = await apiCreateAtividade({
            cliente_id: id,
            tipo: 'mudanca_estagio',
            titulo: `Mudança de estágio: ${oldStatus} → ${status}`,
            descricao: `O lead ${previous?.nome || ''} avançou no funil de vendas de "${oldStatus}" para "${status}".`,
            data: new Date().toISOString(),
            autor: 'João Silva',
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
    const [cList, mList] = await Promise.all([fetchClientes(), fetchWhatsAppMensagens()])
    setClientes(cList)
    setWhatsAppMensagens(mList)
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
    const [cList, mList] = await Promise.all([fetchClientes(), fetchWhatsAppMensagens()])
    setClientes(cList)
    setWhatsAppMensagens(mList)

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
    const [refreshedMsgs, refreshedConvs] = await Promise.all([
      fetchWhatsAppMensagens(),
      fetchWhatsAppConversas(),
    ])
    setWhatsAppMensagens(refreshedMsgs)
    setWhatsAppConversas(refreshedConvs)
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
        addManutencao,
        addAtividade,
        updateAtividade,
        updateAtividadeStatus,
        removeAtividade,
        updateCliente,
        updateClienteStatus,
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
        addAnomaliaOM,
        updateAnomaliaOM,
        removeAnomaliaOM,
        addServicoAdicionalOM,
        updateServicoAdicionalOM,
        removeServicoAdicionalOM,
        addTimelineOM,
        propostasOM,
        addPropostaOM,
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

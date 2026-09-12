import pb from '@/lib/pocketbase/client'
import type {
  Cliente,
  Sistema,
  Manutencao,
  Atividade,
  AtividadeTipo,
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

export async function fetchClientes(): Promise<Cliente[]> {
  const records = await pb.collection('clientes').getFullList<Cliente>({
    sort: 'nome',
  })
  return records
}

export async function fetchSistemas(): Promise<Sistema[]> {
  const records = await pb.collection('sistemas').getFullList<Sistema>({
    sort: '-created',
  })
  return records
}

export async function fetchSistemaByClienteId(clienteId: string): Promise<Sistema | null> {
  try {
    const record = await pb
      .collection('sistemas')
      .getFirstListItem<Sistema>(`cliente_id='${clienteId}'`)
    return record
  } catch (_) {
    return null
  }
}

export async function fetchManutencoes(): Promise<Manutencao[]> {
  const records = await pb.collection('manutencoes').getFullList<Manutencao>({
    sort: '-data',
    expand: 'cliente_id',
  })
  return records
}

export async function fetchAtividades(): Promise<Atividade[]> {
  const records = await pb.collection('atividades').getFullList<Atividade>({
    sort: '-data',
    expand: 'cliente_id,responsavel_id',
  })
  return records
}

export async function fetchUsuarios(): Promise<SistemaUsuario[]> {
  try {
    const records = await pb.collection('users').getFullList<SistemaUsuario>({
      sort: 'name',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar usuários:', err)
    return []
  }
}

export async function createAtividade(data: {
  cliente_id: string
  tipo: AtividadeTipo
  titulo?: string
  descricao?: string
  data?: string
  autor?: string
  status?: AtividadeStatus
  responsavel_id?: string
  responsavel_nome?: string
}): Promise<Atividade> {
  const payload = {
    ...data,
    descricao: data.descricao || '',
    status: data.status || 'pendente',
    data: data.data || new Date().toISOString(),
    autor: data.autor || 'João Delfos',
  }
  const record = await pb.collection('atividades').create<Atividade>(payload, {
    expand: 'cliente_id,responsavel_id',
  })
  return record
}

export async function updateAtividade(id: string, data: Partial<Atividade>): Promise<Atividade> {
  const record = await pb.collection('atividades').update<Atividade>(id, data, {
    expand: 'cliente_id,responsavel_id',
  })
  return record
}

export async function deleteAtividade(id: string): Promise<boolean> {
  await pb.collection('atividades').delete(id)
  return true
}

export async function createManutencao(data: {
  cliente_id: string
  data: string
  tipo: ManutencaoTipo
  status: ManutencaoStatus
  tecnico?: string
  descricao?: string
}): Promise<Manutencao> {
  const record = await pb.collection('manutencoes').create<Manutencao>(data)
  return record
}

export async function createCliente(data: Partial<Cliente> & { nome: string }): Promise<Cliente> {
  const record = await pb.collection('clientes').create<Cliente>(data)
  return record
}

export async function updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente> {
  const record = await pb.collection('clientes').update<Cliente>(id, data)
  return record
}

export async function updateClienteStatus(id: string, status: Cliente['status']): Promise<Cliente> {
  return updateCliente(id, { status })
}

export async function createSistema(
  data: Partial<Sistema> & { cliente_id: string },
): Promise<Sistema> {
  const record = await pb.collection('sistemas').create<Sistema>(data)
  return record
}

export async function updateSistema(id: string, data: Partial<Sistema>): Promise<Sistema> {
  const record = await pb.collection('sistemas').update<Sistema>(id, data)
  return record
}

export async function upsertSistemaForCliente(
  clienteId: string,
  data: Partial<Sistema>,
  existingSistemaId?: string,
): Promise<Sistema> {
  if (existingSistemaId) {
    return updateSistema(existingSistemaId, data)
  }
  const existing = await fetchSistemaByClienteId(clienteId)
  if (existing) {
    return updateSistema(existing.id, data)
  }
  return createSistema({ ...data, cliente_id: clienteId })
}

// -------------------------------------------------------------
// Profissionais & Projetos Services
// -------------------------------------------------------------

export async function fetchProfissionais(): Promise<Profissional[]> {
  const records = await pb.collection('profissionais').getFullList<Profissional>({
    sort: 'nome',
  })
  return records
}

export async function createProfissional(
  data: Omit<Partial<Profissional>, 'id'> & {
    nome: string
    especialidade: Profissional['especialidade']
  },
): Promise<Profissional> {
  const record = await pb.collection('profissionais').create<Profissional>(data)
  return record
}

export async function updateProfissional(
  id: string,
  data: Partial<Profissional>,
): Promise<Profissional> {
  const record = await pb.collection('profissionais').update<Profissional>(id, data)
  return record
}

export async function deleteProfissional(id: string): Promise<boolean> {
  await pb.collection('profissionais').delete(id)
  return true
}

export async function fetchProjetos(): Promise<Projeto[]> {
  const records = await pb.collection('projetos').getFullList<Projeto>({
    sort: '-updated',
    expand: 'cliente_id,profissional_id',
  })
  return records
}

export async function fetchProjetoByClienteId(clienteId: string): Promise<Projeto | null> {
  try {
    const record = await pb
      .collection('projetos')
      .getFirstListItem<Projeto>(`cliente_id='${clienteId}'`, {
        expand: 'cliente_id,profissional_id',
      })
    return record
  } catch (_) {
    return null
  }
}

export async function createProjeto(data: {
  cliente_id: string
  etapa: ProjetoEtapa
  potencia_kwp?: number
  cidade?: string
  profissional_id?: string
  profissional_nome?: string
  observacoes?: string
}): Promise<Projeto> {
  const record = await pb.collection('projetos').create<Projeto>(data, {
    expand: 'cliente_id,profissional_id',
  })
  return record
}

export async function updateProjeto(id: string, data: Partial<Projeto>): Promise<Projeto> {
  const record = await pb.collection('projetos').update<Projeto>(id, data, {
    expand: 'cliente_id,profissional_id',
  })
  return record
}

export async function deleteProjeto(id: string): Promise<boolean> {
  await pb.collection('projetos').delete(id)
  return true
}

export async function fetchProjetoEventos(projetoId?: string): Promise<ProjetoEvento[]> {
  const filter = projetoId ? `projeto_id='${projetoId}'` : ''
  const records = await pb.collection('projeto_eventos').getFullList<ProjetoEvento>({
    filter,
    sort: '-data',
  })
  return records
}

export async function createProjetoEvento(data: {
  projeto_id: string
  etapa_anterior?: string
  etapa_nova: string
  profissional_nome?: string
  autor?: string
  data?: string
  descricao?: string
}): Promise<ProjetoEvento> {
  const payload = {
    ...data,
    data: data.data || new Date().toISOString(),
    autor: data.autor || 'João Silva',
  }
  const record = await pb.collection('projeto_eventos').create<ProjetoEvento>(payload)
  return record
}

// -------------------------------------------------------------
// O&M (Operação e Manutenção) Services
// -------------------------------------------------------------

export async function fetchContratosOM(): Promise<ContratoOM[]> {
  try {
    const records = await pb.collection('contratos_om').getFullList<ContratoOM>({
      sort: '-created',
      expand: 'cliente_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar contratos O&M:', err)
    return []
  }
}

export async function fetchContratoOMByClienteId(clienteId: string): Promise<ContratoOM | null> {
  try {
    const record = await pb
      .collection('contratos_om')
      .getFirstListItem<ContratoOM>(`cliente_id='${clienteId}'`, {
        expand: 'cliente_id',
      })
    return record
  } catch (_) {
    return null
  }
}

export async function createContratoOM(data: {
  cliente_id: string
  plano: ContratoOM['plano']
  status: ContratoOM['status']
  valor_mensal: number
  valor_anual: number
  data_inicio: string
  data_vencimento: string
  proxima_atividade_data?: string
  proxima_atividade_titulo?: string
  servicos_realizados?: string[]
  servicos_agendados?: string[]
  observacoes?: string
}): Promise<ContratoOM> {
  const record = await pb.collection('contratos_om').create<ContratoOM>(data, {
    expand: 'cliente_id',
  })
  return record
}

export async function updateContratoOM(id: string, data: Partial<ContratoOM>): Promise<ContratoOM> {
  const record = await pb.collection('contratos_om').update<ContratoOM>(id, data, {
    expand: 'cliente_id',
  })
  return record
}

export async function deleteContratoOM(id: string): Promise<boolean> {
  await pb.collection('contratos_om').delete(id)
  return true
}

export async function fetchAnomaliasOM(clienteId?: string): Promise<AnomaliaOM[]> {
  try {
    const filter = clienteId ? `cliente_id='${clienteId}'` : ''
    const records = await pb.collection('anomalias_om').getFullList<AnomaliaOM>({
      filter,
      sort: '-data_abertura',
      expand: 'cliente_id,tecnico_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar anomalias O&M:', err)
    return []
  }
}

export async function createAnomaliaOM(data: {
  cliente_id: string
  contrato_id?: string
  codigo?: string
  titulo: string
  descricao?: string
  etapa: AnomaliaOM['etapa']
  status: AnomaliaOM['status']
  severidade?: AnomaliaOM['severidade']
  data_abertura: string
  data_resolucao?: string
  tecnico_id?: string
  tecnico_nome?: string
  solucao_adotada?: string
  valor_faturamento?: number
}): Promise<AnomaliaOM> {
  const record = await pb.collection('anomalias_om').create<AnomaliaOM>(data, {
    expand: 'cliente_id,tecnico_id',
  })
  return record
}

export async function updateAnomaliaOM(id: string, data: Partial<AnomaliaOM>): Promise<AnomaliaOM> {
  const record = await pb.collection('anomalias_om').update<AnomaliaOM>(id, data, {
    expand: 'cliente_id,tecnico_id',
  })
  return record
}

export async function deleteAnomaliaOM(id: string): Promise<boolean> {
  await pb.collection('anomalias_om').delete(id)
  return true
}

export async function fetchServicosAdicionaisOM(clienteId?: string): Promise<ServicoAdicionalOM[]> {
  try {
    const filter = clienteId ? `cliente_id='${clienteId}'` : ''
    const records = await pb.collection('servicos_adicionais_om').getFullList<ServicoAdicionalOM>({
      filter,
      sort: '-data',
      expand: 'cliente_id,tecnico_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar serviços adicionais O&M:', err)
    return []
  }
}

export async function createServicoAdicionalOM(data: {
  cliente_id: string
  contrato_id?: string
  data: string
  tipo: ServicoAdicionalOM['tipo']
  descricao: string
  valor: number
  status: ServicoAdicionalOM['status']
  tecnico_id?: string
  tecnico_nome?: string
}): Promise<ServicoAdicionalOM> {
  const record = await pb.collection('servicos_adicionais_om').create<ServicoAdicionalOM>(data, {
    expand: 'cliente_id,tecnico_id',
  })
  return record
}

export async function updateServicoAdicionalOM(
  id: string,
  data: Partial<ServicoAdicionalOM>,
): Promise<ServicoAdicionalOM> {
  const record = await pb
    .collection('servicos_adicionais_om')
    .update<ServicoAdicionalOM>(id, data, {
      expand: 'cliente_id,tecnico_id',
    })
  return record
}

export async function deleteServicoAdicionalOM(id: string): Promise<boolean> {
  await pb.collection('servicos_adicionais_om').delete(id)
  return true
}

export async function fetchTimelineOM(clienteId?: string): Promise<TimelineOM[]> {
  try {
    const filter = clienteId ? `cliente_id='${clienteId}'` : ''
    const records = await pb.collection('timeline_om').getFullList<TimelineOM>({
      filter,
      sort: '-data',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar timeline O&M:', err)
    return []
  }
}

export async function createTimelineOM(data: {
  cliente_id: string
  contrato_id?: string
  tipo: TimelineOM['tipo']
  titulo: string
  descricao?: string
  data: string
  autor?: string
  status_tag?: string
  referencia_id?: string
}): Promise<TimelineOM> {
  const payload = {
    ...data,
    data: data.data || new Date().toISOString(),
    autor: data.autor || 'João Silva',
  }
  const record = await pb.collection('timeline_om').create<TimelineOM>(payload)
  return record
}

// -------------------------------------------------------------
// Propostas O&M Services
// -------------------------------------------------------------

export async function fetchPropostasOM(
  clienteId?: string,
): Promise<import('@/types/crm').PropostaOM[]> {
  try {
    const filter = clienteId ? `cliente_id='${clienteId}'` : ''
    const records = await pb
      .collection('propostas_om')
      .getFullList<import('@/types/crm').PropostaOM>({
        filter,
        sort: '-data_proposta',
        expand: 'cliente_id',
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar propostas O&M:', err)
    return []
  }
}

export async function createPropostaOM(data: {
  cliente_id: string
  plano_escolhido?: import('@/types/crm').OMPlanoTipo | ''
  potencia_kwp: number
  geracao_mensal_kwh: number
  marca_inversores?: string
  tipo_instalacao?: string
  numero_modulos?: number
  valor_kwh: number
  distancia_km?: number
  valor_km?: number
  valor_ativo_protegido: number
  perda_15_ano: number
  perda_20_ano: number
  prejuizo_20_dias: number
  prejuizo_30_dias: number
  valor_mensal_plano?: number
  valor_anual_plano?: number
  data_proposta?: string
  autor?: string
  status?: string
  observacoes?: string
}): Promise<import('@/types/crm').PropostaOM> {
  const payload = {
    ...data,
    status: data.status || 'Proposta Enviada',
    data_proposta: data.data_proposta || new Date().toISOString(),
    autor: data.autor || 'Delfos Solar O&M',
  }
  const record = await pb
    .collection('propostas_om')
    .create<import('@/types/crm').PropostaOM>(payload, {
      expand: 'cliente_id',
    })
  return record
}

export async function updatePropostaOM(
  id: string,
  data: Partial<import('@/types/crm').PropostaOM>,
): Promise<import('@/types/crm').PropostaOM> {
  const record = await pb
    .collection('propostas_om')
    .update<import('@/types/crm').PropostaOM>(id, data, {
      expand: 'cliente_id',
    })
  return record
}

export async function deletePropostaOM(id: string): Promise<boolean> {
  await pb.collection('propostas_om').delete(id)
  return true
}

// ============================================================================
// ORÇAMENTOS DE ENERGIA SOLAR FOTOVOLTAICA
// ============================================================================

export async function fetchOrcamentosSolar(): Promise<import('@/types/crm').OrcamentoSolar[]> {
  const records = await pb
    .collection('orcamentos_solar')
    .getFullList<import('@/types/crm').OrcamentoSolar>({
      sort: '-data_orcamento,-created',
      expand: 'cliente_id',
    })
  return records
}

export async function createOrcamentoSolar(
  data: Partial<import('@/types/crm').OrcamentoSolar>,
): Promise<import('@/types/crm').OrcamentoSolar> {
  const payload = {
    ...data,
    status: data.status || 'Em elaboração',
    data_orcamento: data.data_orcamento || new Date().toISOString(),
    validade_dias: data.validade_dias || 5,
    autor: data.autor || 'Delfos Solar',
  }
  const record = await pb
    .collection('orcamentos_solar')
    .create<import('@/types/crm').OrcamentoSolar>(payload, {
      expand: 'cliente_id',
    })
  return record
}

export async function updateOrcamentoSolar(
  id: string,
  data: Partial<import('@/types/crm').OrcamentoSolar>,
): Promise<import('@/types/crm').OrcamentoSolar> {
  const record = await pb
    .collection('orcamentos_solar')
    .update<import('@/types/crm').OrcamentoSolar>(id, data, {
      expand: 'cliente_id',
    })
  return record
}

export async function deleteOrcamentoSolar(id: string): Promise<boolean> {
  await pb.collection('orcamentos_solar').delete(id)
  return true
}

// -------------------------------------------------------------
// WhatsApp Services (Templates, Mensagens, Disparo e Config)
// -------------------------------------------------------------

export async function fetchWhatsAppTemplates(): Promise<import('@/types/crm').WhatsAppTemplate[]> {
  try {
    const records = await pb
      .collection('whatsapp_templates')
      .getFullList<import('@/types/crm').WhatsAppTemplate>({
        sort: 'titulo',
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar templates WhatsApp:', err)
    return []
  }
}

export async function createWhatsAppTemplate(
  data: Partial<import('@/types/crm').WhatsAppTemplate>,
): Promise<import('@/types/crm').WhatsAppTemplate> {
  const record = await pb
    .collection('whatsapp_templates')
    .create<import('@/types/crm').WhatsAppTemplate>(data)
  return record
}

export async function updateWhatsAppTemplate(
  id: string,
  data: Partial<import('@/types/crm').WhatsAppTemplate>,
): Promise<import('@/types/crm').WhatsAppTemplate> {
  const record = await pb
    .collection('whatsapp_templates')
    .update<import('@/types/crm').WhatsAppTemplate>(id, data)
  return record
}

export async function deleteWhatsAppTemplate(id: string): Promise<boolean> {
  await pb.collection('whatsapp_templates').delete(id)
  return true
}

// -------------------------------------------------------------
// WhatsApp Conversas (Central de Atendimento)
// -------------------------------------------------------------

export async function fetchWhatsAppConversas(): Promise<import('@/types/crm').WhatsAppConversa[]> {
  try {
    return await pb
      .collection('whatsapp_conversas')
      .getFullList<import('@/types/crm').WhatsAppConversa>({
        sort: '-ultima_mensagem_em,-updated',
        expand: 'cliente_id',
      })
  } catch (err) {
    console.error('Erro ao buscar conversas WhatsApp:', err)
    return []
  }
}

export async function createWhatsAppConversa(
  data: Partial<import('@/types/crm').WhatsAppConversa>,
): Promise<import('@/types/crm').WhatsAppConversa> {
  return pb.collection('whatsapp_conversas').create<import('@/types/crm').WhatsAppConversa>(data)
}

export async function updateWhatsAppConversa(
  id: string,
  data: Partial<import('@/types/crm').WhatsAppConversa>,
): Promise<import('@/types/crm').WhatsAppConversa> {
  return pb
    .collection('whatsapp_conversas')
    .update<import('@/types/crm').WhatsAppConversa>(id, data, {
      expand: 'cliente_id',
    })
}

export async function deleteWhatsAppConversa(id: string): Promise<boolean> {
  await pb.collection('whatsapp_conversas').delete(id)
  return true
}

export async function vincularConversaCliente(
  conversaId: string,
  clienteId: string,
  atendenteNome?: string,
): Promise<import('@/types/crm').WhatsAppConversa> {
  const cliente = await pb.collection('clientes').getOne<Cliente>(clienteId)
  const conversa = await pb
    .collection('whatsapp_conversas')
    .getOne<import('@/types/crm').WhatsAppConversa>(conversaId)

  // Se o cliente não tiver whatsapp preenchido ou for diferente, atualizar
  const clienteWhats = cliente.whatsapp || cliente.telefone || ''
  if (!clienteWhats || !cliente.whatsapp) {
    try {
      await pb.collection('clientes').update(clienteId, {
        whatsapp: conversa.numero,
      })
    } catch {
      /* intentionally ignored */
    }
  }

  // Atualizar todas as mensagens dessa conversa para vincular ao cliente
  try {
    const msgs = await pb
      .collection('whatsapp_mensagens')
      .getFullList<import('@/types/crm').WhatsAppMensagem>({
        filter: `conversa_id = '${conversaId}' && (cliente_id = '' || cliente_id = null)`,
      })
    for (const m of msgs) {
      await pb.collection('whatsapp_mensagens').update(m.id, { cliente_id: clienteId })
    }
  } catch {
    /* intentionally ignored */
  }

  return updateWhatsAppConversa(conversaId, {
    cliente_id: clienteId,
    status: 'em_atendimento',
    vinculada_em: new Date().toISOString(),
    ...(atendenteNome ? { atendente: atendenteNome } : {}),
  })
}

export async function assumirConversa(
  conversaId: string,
  atendenteNome: string,
  atendenteId?: string,
): Promise<import('@/types/crm').WhatsAppConversa> {
  return updateWhatsAppConversa(conversaId, {
    status: 'em_atendimento',
    atendente: atendenteNome,
    atendente_id: atendenteId || '',
  })
}

export async function finalizarConversa(
  conversaId: string,
): Promise<import('@/types/crm').WhatsAppConversa> {
  return updateWhatsAppConversa(conversaId, {
    status: 'resolvido',
    resolvida_em: new Date().toISOString(),
    nao_lidas: 0,
  })
}

export async function fetchWhatsAppMensagens(options?: {
  clienteId?: string
  conversaId?: string
}): Promise<import('@/types/crm').WhatsAppMensagem[]> {
  try {
    const filters: string[] = []
    if (options?.clienteId) filters.push(`cliente_id='${options.clienteId}'`)
    if (options?.conversaId) filters.push(`conversa_id='${options.conversaId}'`)
    const filter = filters.join(' && ')

    const records = await pb
      .collection('whatsapp_mensagens')
      .getFullList<import('@/types/crm').WhatsAppMensagem>({
        filter: filter || undefined,
        sort: 'created',
        expand: 'cliente_id,template_id,conversa_id',
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar mensagens WhatsApp:', err)
    return []
  }
}

export async function sendWhatsAppMensagem(data: {
  cliente_id?: string
  conversa_id?: string
  telefone_destino: string
  conteudo_final: string
  template_id?: string
  agendado_para?: string | null
  tipo_disparo?: string
  referencia_id?: string
}): Promise<{
  ok: boolean
  scheduled?: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message: string
  data?: import('@/types/crm').WhatsAppMensagem
}> {
  return pb.send('/backend/v1/whatsapp/send', {
    method: 'POST',
    body: data,
  })
}

export async function sendWhatsAppDocumento(data: {
  cliente_id: string
  telefone_destino: string
  tipo: 'orcamento_solar' | 'proposta_om' | 'documento'
  referencia_id?: string
  legenda?: string
  nome_arquivo?: string
  base64?: string
  documento_url?: string
}): Promise<{
  ok: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message: string
  data?: import('@/types/crm').WhatsAppMensagem
}> {
  return pb.send('/backend/v1/whatsapp/enviar-documento', {
    method: 'POST',
    body: data,
  })
}

export async function fetchWhatsAppConfigStatus(): Promise<
  import('@/types/crm').WhatsAppConfigStatus
> {
  try {
    return await pb.send('/backend/v1/whatsapp/config-status', {
      method: 'GET',
    })
  } catch (_) {
    return {
      ok: false,
      configured: false,
      hasApiUrl: false,
      hasApiKey: false,
      secretsRequired: ['WHATSAPP_API_URL', 'WHATSAPP_API_KEY', 'WHATSAPP_ORIGIN_NUMBER'],
    }
  }
}

// -------------------------------------------------------------
// Outros Contatos Services
// -------------------------------------------------------------

export async function createOutroContato(data: {
  nome: string
  telefone: string
  tipo_contato: import('@/types/crm').OutroContatoTipo
  observacao?: string
  conversa_id?: string
}): Promise<import('@/types/crm').OutroContato> {
  return pb.collection('outros_contatos').create<import('@/types/crm').OutroContato>(data)
}

export async function fetchOutrosContatos(): Promise<import('@/types/crm').OutroContato[]> {
  try {
    return await pb.collection('outros_contatos').getFullList<import('@/types/crm').OutroContato>({
      sort: '-created',
    })
  } catch (err) {
    console.error('Erro ao buscar outros contatos:', err)
    return []
  }
}

export async function arquivarConversaComoOutroContato(
  conversaId: string,
): Promise<import('@/types/crm').WhatsAppConversa> {
  return updateWhatsAppConversa(conversaId, {
    status: 'resolvido',
    resolvida_em: new Date().toISOString(),
    nao_lidas: 0,
  })
}

// -------------------------------------------------------------
// Fornecedores & Orçamentos de Fornecedores
// -------------------------------------------------------------

export async function fetchFornecedores(): Promise<import('@/types/crm').Fornecedor[]> {
  try {
    const records = await pb
      .collection('fornecedores')
      .getFullList<import('@/types/crm').Fornecedor>({
        sort: 'nome_empresa',
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar fornecedores:', err)
    return []
  }
}

export async function createFornecedor(
  data: Partial<import('@/types/crm').Fornecedor>,
): Promise<import('@/types/crm').Fornecedor> {
  return pb.collection('fornecedores').create<import('@/types/crm').Fornecedor>(data)
}

export async function updateFornecedor(
  id: string,
  data: Partial<import('@/types/crm').Fornecedor>,
): Promise<import('@/types/crm').Fornecedor> {
  return pb.collection('fornecedores').update<import('@/types/crm').Fornecedor>(id, data)
}

export async function deleteFornecedor(id: string): Promise<boolean> {
  await pb.collection('fornecedores').delete(id)
  return true
}

export async function fetchFornecedoresOrcamentos(options?: {
  fornecedorId?: string
  clienteId?: string
  orcamentoSolarId?: string
}): Promise<import('@/types/crm').FornecedorOrcamento[]> {
  try {
    const filters: string[] = []
    if (options?.fornecedorId) filters.push(`fornecedor_id = '${options.fornecedorId}'`)
    if (options?.clienteId) filters.push(`cliente_id = '${options.clienteId}'`)
    if (options?.orcamentoSolarId)
      filters.push(`orcamento_solar_id = '${options.orcamentoSolarId}'`)
    const filter = filters.join(' && ')

    const records = await pb
      .collection('fornecedores_orcamentos')
      .getFullList<import('@/types/crm').FornecedorOrcamento>({
        filter: filter || undefined,
        sort: '-data,-created',
        expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar orçamentos de fornecedores:', err)
    return []
  }
}

export async function createFornecedorOrcamento(
  data: Partial<import('@/types/crm').FornecedorOrcamento>,
  file?: File,
): Promise<import('@/types/crm').FornecedorOrcamento> {
  if (file) {
    const formData = new FormData()
    formData.append('arquivo', file)
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      }
    })
    return pb
      .collection('fornecedores_orcamentos')
      .create<import('@/types/crm').FornecedorOrcamento>(formData, {
        expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
      })
  }
  return pb
    .collection('fornecedores_orcamentos')
    .create<import('@/types/crm').FornecedorOrcamento>(data, {
      expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
    })
}

export async function updateFornecedorOrcamento(
  id: string,
  data: Partial<import('@/types/crm').FornecedorOrcamento>,
  file?: File,
): Promise<import('@/types/crm').FornecedorOrcamento> {
  if (file) {
    const formData = new FormData()
    formData.append('arquivo', file)
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      }
    })
    return pb
      .collection('fornecedores_orcamentos')
      .update<import('@/types/crm').FornecedorOrcamento>(id, formData, {
        expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
      })
  }
  return pb
    .collection('fornecedores_orcamentos')
    .update<import('@/types/crm').FornecedorOrcamento>(id, data, {
      expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
    })
}

export async function deleteFornecedorOrcamento(id: string): Promise<boolean> {
  await pb.collection('fornecedores_orcamentos').delete(id)
  return true
}

export async function selecionarFornecedorOrcamento(
  id: string,
  options?: { orcamentoSolarId?: string; clienteId?: string },
): Promise<import('@/types/crm').FornecedorOrcamento> {
  // Desmarcar outros orçamentos deste mesmo projeto/cliente para garantir único selecionado por projeto
  try {
    const filters: string[] = [`id != '${id}'`, `selecionado = true`]
    if (options?.orcamentoSolarId) {
      filters.push(`orcamento_solar_id = '${options.orcamentoSolarId}'`)
    } else if (options?.clienteId) {
      filters.push(`cliente_id = '${options.clienteId}'`)
    }
    const outrosAtivos = await pb
      .collection('fornecedores_orcamentos')
      .getFullList<import('@/types/crm').FornecedorOrcamento>({
        filter: filters.join(' && '),
      })
    for (const outro of outrosAtivos) {
      await pb.collection('fornecedores_orcamentos').update(outro.id, { selecionado: false })
    }
  } catch (err) {
    console.error('Erro ao desmarcar outros orçamentos ativos:', err)
  }

  // Marcar o orçamento indicado como selecionado: true
  return pb.collection('fornecedores_orcamentos').update<import('@/types/crm').FornecedorOrcamento>(
    id,
    { selecionado: true },
    {
      expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
    },
  )
}

import pb from '@/lib/pocketbase/client'
import type {
  Cliente,
  ClienteStatus,
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

async function withNetworkRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 600,
  contextName = 'requisição',
): Promise<T> {
  let attempt = 0
  while (attempt <= retries) {
    try {
      return await fn()
    } catch (err: any) {
      attempt++
      const isNetworkError =
        err?.status === 0 ||
        !err?.status ||
        err?.name === 'TypeError' ||
        String(err?.message || '')
          .toLowerCase()
          .includes('failed to fetch') ||
        String(err?.message || '')
          .toLowerCase()
          .includes('network')
      if (attempt > retries || !isNetworkError) throw err
      await new Promise((res) => setTimeout(res, delayMs * attempt))
    }
  }
  throw new Error(`Falha após ${retries} tentativas em ${contextName}`)
}

export async function fetchClientes(): Promise<Cliente[]> {
  return withNetworkRetry(
    () => pb.collection('clientes').getFullList<Cliente>({ sort: 'nome', requestKey: null }),
    2,
    600,
    'fetchClientes',
  )
}

function mapUsinaToSistema(usina: import('@/types/crm').UsinaCliente): Sistema {
  return {
    id: usina.id,
    collectionId: usina.collectionId,
    collectionName: usina.collectionName,
    cliente_id: usina.cliente_id,
    geracao_media_mensal_kwh: usina.geracao_media_mensal_kwh ?? usina.geracao_estimada_kwh,
    data_instalacao: usina.data_instalacao,
    potencia_total_kwp: usina.potencia_kwp,
    quantidade_placas: usina.quantidade_placas ?? usina.qtd_modulos,
    marca_placas: usina.marca_placas,
    tipo_telhado: usina.tipo_telhado,
    numero_uc: usina.numero_uc,
    latitude: usina.latitude,
    longitude: usina.longitude,
    concessionaria: usina.concessionaria,
    tarifa: usina.tarifa,
    classe_consumo: usina.classe_consumo,
    padrao_entrada: usina.padrao_entrada,
    tipo_atendimento: usina.tipo_atendimento,
    numero_fases: usina.numero_fases,
    secao_cabos: usina.secao_cabos,
    tipo_caixa_medicao: usina.tipo_caixa_medicao,
    amperagem_disjuntor: usina.amperagem_disjuntor,
    quantidade_modulos: usina.qtd_modulos ?? usina.quantidade_placas,
    fabricante_modulos: usina.fabricante_modulos,
    modelo_modulos: usina.modelo_modulos,
    fabricante_inversores: usina.fabricante_inversores,
    modelo_inversores: usina.modelo_inversores,
    potencia_pico_modulos_kwp: usina.potencia_pico_modulos_kwp ?? usina.potencia_kwp,
    potencia_pico_inversores_kwp: usina.potencia_pico_inversores_kwp ?? usina.potencia_kwp,
    monitoramento_app_nome: usina.monitoramento_app_nome,
    monitoramento_login: usina.monitoramento_login,
    monitoramento_senha: usina.monitoramento_senha,
    monitoramento_datalogger_url: usina.monitoramento_datalogger_url,
    solarview_login: usina.solarview_login,
    solarview_senha: usina.solarview_senha,
    solarview_link_ios: usina.solarview_link_ios,
    solarview_link_android: usina.solarview_link_android,
    solarview_link_texto: usina.solarview_link_texto,
    created: usina.created,
    updated: usina.updated,
    expand: usina.expand,
  }
}

function mapSistemaPayloadToUsina(
  data: Partial<Sistema>,
): Partial<import('@/types/crm').UsinaCliente> {
  const result: Record<string, any> = { ...data }

  if (data.potencia_total_kwp !== undefined) {
    result.potencia_kwp = data.potencia_total_kwp
  }
  if (data.quantidade_modulos !== undefined) {
    result.qtd_modulos = data.quantidade_modulos
    result.quantidade_placas = data.quantidade_modulos
  }
  if (data.quantidade_placas !== undefined && result.qtd_modulos === undefined) {
    result.qtd_modulos = data.quantidade_placas
    result.quantidade_placas = data.quantidade_placas
  }
  if (data.geracao_media_mensal_kwh !== undefined) {
    result.geracao_media_mensal_kwh = data.geracao_media_mensal_kwh
    if (result.geracao_estimada_kwh === undefined) {
      result.geracao_estimada_kwh = data.geracao_media_mensal_kwh
    }
  }

  // Se atualizou fabricante/modelo inversor, atualiza também inversores_info
  if (data.fabricante_inversores || data.modelo_inversores) {
    result.inversores_info = [data.fabricante_inversores, data.modelo_inversores]
      .filter(Boolean)
      .join(' ')
  }

  return result as Partial<import('@/types/crm').UsinaCliente>
}

export async function fetchSistemas(): Promise<Sistema[]> {
  try {
    const usinas = await pb.collection('usinas').getFullList<import('@/types/crm').UsinaCliente>({
      sort: 'created',
      requestKey: null,
    })
    return usinas.map(mapUsinaToSistema)
  } catch (err) {
    console.warn('Erro ao buscar usinas em fetchSistemas:', err)
    return []
  }
}

export async function fetchSistemaByClienteId(clienteId: string): Promise<Sistema | null> {
  if (!clienteId) return null
  try {
    const usina = await pb
      .collection('usinas')
      .getFirstListItem<import('@/types/crm').UsinaCliente>(`cliente_id='${clienteId}'`, {
        sort: 'created',
      })
    return mapUsinaToSistema(usina)
  } catch (_) {
    return null
  }
}

export async function fetchManutencoes(): Promise<Manutencao[]> {
  return withNetworkRetry(
    () =>
      pb.collection('manutencoes').getFullList<Manutencao>({
        sort: '-data',
        expand: 'cliente_id',
        requestKey: null,
      }),
    2,
    600,
    'fetchManutencoes',
  )
}

export async function fetchAtividades(): Promise<Atividade[]> {
  return withNetworkRetry(
    () =>
      pb.collection('atividades').getFullList<Atividade>({
        sort: '-data',
        expand: 'cliente_id,responsavel_id,usina_id,fornecedor_id',
        requestKey: null,
      }),
    2,
    600,
    'fetchAtividades',
  )
}

export async function fetchAtividadesByCliente(clienteId: string): Promise<Atividade[]> {
  try {
    const records = await pb.collection('atividades').getFullList<Atividade>({
      filter: `cliente_id='${clienteId}'`,
      sort: '-data,-created',
      expand: 'cliente_id,responsavel_id,usina_id,fornecedor_id',
      requestKey: null,
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar atividades do cliente:', err)
    return []
  }
}

export async function fetchUsuarios(): Promise<SistemaUsuario[]> {
  try {
    const records = await pb.collection('users').getFullList<SistemaUsuario>({
      sort: 'name',
      requestKey: null,
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar usuários:', err)
    return []
  }
}

/**
 * Normaliza valores de data para o padrão datetime do PocketBase (espaço em vez de 'T' ISO).
 * O formato do PocketBase é "YYYY-MM-DD HH:mm:ss.sssZ" ou "YYYY-MM-DD HH:mm:ss".
 */
function normalizeDateForPocketBase(val?: string | null): string | undefined {
  if (!val || typeof val !== 'string') return undefined
  const trimmed = val.trim()
  if (!trimmed) return undefined
  return trimmed.replace('T', ' ').replace(/\.\d{3}Z?$/, '')
}

export async function createAtividade(data: {
  cliente_id: string
  usina_id?: string
  tipo: AtividadeTipo
  titulo?: string
  descricao?: string
  data?: string
  autor?: string
  status?: AtividadeStatus
  responsavel_id?: string
  responsavel_nome?: string
  valor_servico?: number
  valor_por_placa?: number
  qtd_modulos?: number
  cobrar_deslocamento?: boolean
  distancia_km?: number
  valor_km?: number
  custo_deslocamento?: number
  custo_placas?: number
  custo_total?: number
  fornecedor_id?: string
  equipe_nome?: string
  leituras_programadas_distribuidora?:
    | Array<{ data: string; responsavel: 'Cliente' | 'Distribuidora' }>
    | unknown
  [key: string]: any
}): Promise<Atividade> {
  const descTrim = typeof data.descricao === 'string' ? data.descricao.trim() : ''
  const fallbackDescricao =
    descTrim || (data.titulo && data.titulo.trim()) || 'Atividade registrada'

  // Normalização de data obrigatória da atividade
  const rawData =
    data.data && typeof data.data === 'string' && data.data.trim()
      ? data.data
      : new Date().toISOString()
  const dataNormalizada = normalizeDateForPocketBase(rawData) || rawData.replace('T', ' ')

  // Construir payload base
  const payload: Record<string, any> = {
    ...data,
    descricao: fallbackDescricao,
    status: data.status || 'pendente',
    data: dataNormalizada,
    autor: data.autor || 'João Delfos',
  }

  // Sanitização defensiva de relations conhecidas (PocketBase rejeita string vazia em relation)
  const relationFields = [
    'cliente_id',
    'usina_id',
    'responsavel_id',
    'fornecedor_id',
    'parent_id',
    'negocio_id',
    'tipo_custom_id',
  ]
  for (const field of relationFields) {
    if (field in payload) {
      const val = payload[field]
      if (typeof val === 'string' && !val.trim()) {
        delete payload[field]
      } else if (val === null || val === undefined) {
        delete payload[field]
      }
    }
  }

  // Sanitização e normalização de campos opcionais do tipo data
  const dateFields = [
    'data_leitura',
    'data_lembrete',
    'lembrete_whatsapp_enviado_em',
    'email_enviado_em',
    'prazo_conclusao_rge',
  ]
  for (const field of dateFields) {
    if (field in payload) {
      const val = payload[field]
      if (typeof val === 'string') {
        const trimmed = val.trim()
        if (!trimmed) {
          delete payload[field]
        } else {
          payload[field] = normalizeDateForPocketBase(trimmed) || trimmed.replace('T', ' ')
        }
      } else if (val === null || val === undefined) {
        delete payload[field]
      }
    }
  }

  // Validação preventiva: cliente_id é campo obrigatório no PocketBase
  if (
    !payload.cliente_id ||
    (typeof payload.cliente_id === 'string' && !payload.cliente_id.trim())
  ) {
    throw new Error(
      'Não é possível criar atividade sem vincular um cliente (cliente_id obrigatório).',
    )
  }

  const record = await pb.collection('atividades').create<Atividade>(payload as any, {
    expand: 'cliente_id,responsavel_id,usina_id,fornecedor_id',
  })
  return record
}

export async function updateAtividade(id: string, data: Partial<Atividade>): Promise<Atividade> {
  const record = await pb.collection('atividades').update<Atividade>(id, data, {
    expand: 'cliente_id,responsavel_id,usina_id,fornecedor_id',
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

export async function deleteManutencao(id: string): Promise<boolean> {
  await pb.collection('manutencoes').delete(id)
  return true
}

// -------------------------------------------------------------
// Serviços Avulsos Services
// -------------------------------------------------------------

export async function fetchServicosAvulsos(
  clienteId?: string,
): Promise<import('@/types/crm').ServicoAvulso[]> {
  try {
    const filter = clienteId ? `cliente_id='${clienteId}'` : ''
    const records = await pb
      .collection('servicos_avulsos')
      .getFullList<import('@/types/crm').ServicoAvulso>({
        filter: filter || undefined,
        sort: '-data_servico,-created',
        expand: 'cliente_id',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar serviços avulsos:', err)
    return []
  }
}

export async function createServicoAvulso(data: {
  cliente_id: string
  data_servico: string
  tipo_servico: import('@/types/crm').ServicoAvulsoTipo
  valor_cobrado?: number
  observacoes_tecnicas?: string
  status: import('@/types/crm').ServicoAvulsoStatus
  observacoes_equipe?: string
  fotos?: File[] | string[]
}): Promise<import('@/types/crm').ServicoAvulso> {
  const hasFiles = Array.isArray(data.fotos) && data.fotos.some((f) => f instanceof File)
  if (hasFiles) {
    const formData = new FormData()
    formData.append('cliente_id', data.cliente_id)
    formData.append('data_servico', data.data_servico)
    formData.append('tipo_servico', data.tipo_servico)
    if (data.valor_cobrado !== undefined && data.valor_cobrado !== null) {
      formData.append('valor_cobrado', String(data.valor_cobrado))
    }
    if (data.observacoes_tecnicas) {
      formData.append('observacoes_tecnicas', data.observacoes_tecnicas)
    }
    formData.append('status', data.status)
    if (data.observacoes_equipe) {
      formData.append('observacoes_equipe', data.observacoes_equipe)
    }
    for (const foto of data.fotos || []) {
      if (foto instanceof File) {
        formData.append('fotos', foto)
      }
    }
    const record = await pb
      .collection('servicos_avulsos')
      .create<import('@/types/crm').ServicoAvulso>(formData, {
        expand: 'cliente_id',
      })
    return record
  }

  const payload = {
    cliente_id: data.cliente_id,
    data_servico: data.data_servico,
    tipo_servico: data.tipo_servico,
    valor_cobrado: data.valor_cobrado || 0,
    observacoes_tecnicas: data.observacoes_tecnicas || '',
    status: data.status,
    observacoes_equipe: data.observacoes_equipe || '',
  }

  const record = await pb
    .collection('servicos_avulsos')
    .create<import('@/types/crm').ServicoAvulso>(payload, {
      expand: 'cliente_id',
    })
  return record
}

export async function updateServicoAvulso(
  id: string,
  data: Partial<import('@/types/crm').ServicoAvulso>,
): Promise<import('@/types/crm').ServicoAvulso> {
  const record = await pb
    .collection('servicos_avulsos')
    .update<import('@/types/crm').ServicoAvulso>(id, data, {
      expand: 'cliente_id',
    })
  return record
}

export async function deleteServicoAvulso(id: string): Promise<boolean> {
  await pb.collection('servicos_avulsos').delete(id)
  return true
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

export async function bulkUpdateClientesEtapa(
  ids: string[],
  status: Cliente['status'],
): Promise<Cliente[]> {
  const promises = ids.map((id) => updateCliente(id, { status }))
  return Promise.all(promises)
}

export async function bulkUpdateClientesResponsavel(
  ids: string[],
  responsavelId: string,
  responsavelNome: string,
): Promise<Cliente[]> {
  const promises = ids.map((id) =>
    updateCliente(id, {
      responsavel_id: responsavelId,
      responsavel_nome: responsavelNome,
    }),
  )
  return Promise.all(promises)
}

export async function bulkMarcarClientesFechado(ids: string[]): Promise<Cliente[]> {
  const agora = new Date().toISOString()
  const promises = ids.map((id) =>
    updateCliente(id, {
      status: 'Fechado',
      data_fechamento: agora,
    }),
  )
  return Promise.all(promises)
}

export interface ReabrirOportunidadeDados {
  motivo_reabertura: string
  descricao_reabertura?: string
  valor_estimado?: number
  responsavel_id?: string
  responsavel_nome?: string
  etapa_destino?: string
}

export async function reabrirOportunidadeComercial(
  clienteId: string,
  dados: ReabrirOportunidadeDados,
): Promise<Cliente> {
  const agora = new Date().toISOString()
  const etapa = (dados.etapa_destino || 'Novo Lead') as ClienteStatus

  const payloadUpdate: Partial<Cliente> = {
    status: etapa,
    reabertura: true,
    motivo_reabertura: dados.motivo_reabertura,
    descricao_reabertura: dados.descricao_reabertura || '',
    valor_reabertura: dados.valor_estimado !== undefined ? dados.valor_estimado : 0,
    data_reabertura: agora,
    transferido_pos_vendas: false,
    status_pos_vendas: '',
    data_fechamento: '',
    motivo_perda: '',
    observacoes_perda: '',
  }

  if (dados.valor_estimado !== undefined && dados.valor_estimado > 0) {
    payloadUpdate.valor_estimado = dados.valor_estimado
  }

  if (dados.responsavel_id !== undefined) {
    payloadUpdate.responsavel_id = dados.responsavel_id
  }
  if (dados.responsavel_nome !== undefined) {
    payloadUpdate.responsavel_nome = dados.responsavel_nome
  }

  const clienteAtualizado = await updateCliente(clienteId, payloadUpdate)

  // Registrar atividade na timeline unificada do cliente
  try {
    const valorFmt =
      dados.valor_estimado && dados.valor_estimado > 0
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            dados.valor_estimado,
          )
        : ''

    const respFmt = dados.responsavel_nome ? ` • Consultor: ${dados.responsavel_nome}` : ''
    const descFmt = dados.descricao_reabertura ? ` • Detalhes: "${dados.descricao_reabertura}"` : ''
    const valorStr = valorFmt ? ` • Valor estimado: ${valorFmt}` : ''

    await createAtividade({
      cliente_id: clienteId,
      tipo: 'mudanca_estagio',
      titulo: `Reabertura Comercial • ${dados.motivo_reabertura}`,
      descricao: `Oportunidade comercial reaberta na etapa "${etapa}". Motivo: ${dados.motivo_reabertura}${descFmt}${valorStr}${respFmt}.`,
      data: agora,
      status: 'concluida',
      autor: dados.responsavel_nome || 'CRM Delfos Solar',
      responsavel_nome: dados.responsavel_nome || 'CRM Delfos Solar',
    })
  } catch (ativErr) {
    console.warn('Erro ao registrar atividade de reabertura comercial:', ativErr)
  }

  return clienteAtualizado
}

export async function marcarClienteComoPerdido(
  clienteId: string,
  motivoPerda: 'preco' | 'concorrente' | 'desistiu' | 'nao_respondeu' | 'outro' | string,
  observacaoTexto?: string,
): Promise<Cliente> {
  const agora = new Date().toISOString()
  // Se o cliente for de reabertura, ao perder ele volta para Pós-Vendas sem perder seus dados/usinas
  const clienteAtual = await pb
    .collection('clientes')
    .getOne<Cliente>(clienteId)
    .catch(() => null)
  const ehReabertura = Boolean(clienteAtual?.reabertura)

  const payloadUpdate: Partial<Cliente> = {
    status: 'Perdido',
    motivo_perda: motivoPerda,
    observacoes_perda:
      observacaoTexto && observacaoTexto.trim() ? observacaoTexto.trim() : undefined,
  }
  if (observacaoTexto && observacaoTexto.trim()) {
    payloadUpdate.observacoes = observacaoTexto.trim()
  }

  if (ehReabertura) {
    // Restaura elegibilidade em Pós-Vendas: status_pos_vendas ativo e transferido_pos_vendas
    payloadUpdate.status_pos_vendas = 'Ativo'
    payloadUpdate.transferido_pos_vendas = true
  }

  const clienteAtualizado = await updateCliente(clienteId, payloadUpdate)

  // Registrar atividade na timeline com motivo
  try {
    const rotulos: Record<string, string> = {
      preco: 'Preço elevado / fora do orçamento',
      concorrente: 'Optou por concorrente',
      desistiu: 'Desistiu do projeto',
      nao_respondeu: 'Não respondeu / Sem contato',
      outro: 'Outro motivo',
    }
    const labelMotivo = rotulos[motivoPerda] || motivoPerda
    const textoMotivo =
      motivoPerda === 'outro' && observacaoTexto ? `Outro: ${observacaoTexto}` : labelMotivo

    await createAtividade({
      cliente_id: clienteId,
      tipo: 'mudanca_estagio',
      titulo: 'Negócio marcado como Perdido',
      descricao: `Negócio marcado como Perdido no funil comercial. Motivo: ${textoMotivo}.${
        observacaoTexto && motivoPerda !== 'outro' ? ` Observações: ${observacaoTexto}` : ''
      }`,
      data: agora,
      status: 'concluida',
      autor: 'CRM Delfos Solar',
      responsavel_nome: 'CRM Delfos Solar',
    })
  } catch (ativErr) {
    console.warn('Erro ao registrar atividade de perda:', ativErr)
  }

  return clienteAtualizado
}

export async function bulkArquivarClientes(ids: string[]): Promise<Cliente[]> {
  const promises = ids.map((id) => updateCliente(id, { arquivado: true }))
  return Promise.all(promises)
}

export async function deleteCliente(id: string): Promise<boolean> {
  // Cascata defensiva de registros vinculados ao cliente
  const collectionsWithClienteId = [
    'atividades',
    'propostas_om',
    'orcamentos_solar',
    'manutencoes',
    'sistemas',
    'contratos_om',
    'anomalias_om',
    'servicos_adicionais_om',
    'timeline_om',
    'servicos_avulsos',
    'documentos_cliente',
    'fornecedores_orcamentos',
    'whatsapp_mensagens',
    'whatsapp_conversas',
    'ordens_servico',
    'cliente_inversores',
    'usinas',
  ]

  for (const colName of collectionsWithClienteId) {
    try {
      const records = await pb.collection(colName).getFullList({
        filter: `cliente_id = '${id}'`,
        fields: 'id',
      })
      for (const rec of records) {
        try {
          await pb.collection(colName).delete(rec.id)
        } catch (delErr) {
          console.warn(`Falha ao excluir registro ${rec.id} em ${colName}:`, delErr)
        }
      }
    } catch (err) {
      // Ignora erro se a coleção não existir ou não tiver registros
      console.warn(`Erro ao consultar ${colName} para exclusão em cascata:`, err)
    }
  }

  // Projetos vinculados (e seus projeto_eventos)
  try {
    const projetos = await pb.collection('projetos').getFullList({
      filter: `cliente_id = '${id}'`,
      fields: 'id',
    })
    for (const proj of projetos) {
      try {
        const eventos = await pb.collection('projeto_eventos').getFullList({
          filter: `projeto_id = '${proj.id}'`,
          fields: 'id',
        })
        for (const ev of eventos) {
          try {
            await pb.collection('projeto_eventos').delete(ev.id)
          } catch {
            /* ignore */
          }
        }
        await pb.collection('projetos').delete(proj.id)
      } catch (projErr) {
        console.warn(`Falha ao excluir projeto ${proj.id}:`, projErr)
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar projetos para cascata:', err)
  }

  // Transferências de créditos (origem ou destino)
  try {
    const transferencias = await pb.collection('transferencias_creditos').getFullList({
      filter: `cliente_origem_id = '${id}' || cliente_destino_id = '${id}'`,
      fields: 'id',
    })
    for (const t of transferencias) {
      try {
        await pb.collection('transferencias_creditos').delete(t.id)
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar transferencias_creditos para cascata:', err)
  }

  // Contatos adicionais (campo `cliente` em vez de `cliente_id`)
  try {
    const contatos = await pb.collection('contatos_adicionais').getFullList({
      filter: `cliente = '${id}'`,
      fields: 'id',
    })
    for (const ca of contatos) {
      try {
        await pb.collection('contatos_adicionais').delete(ca.id)
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar contatos_adicionais para cascata:', err)
  }

  // Exclui o registro principal da collection clientes
  await pb.collection('clientes').delete(id)
  return true
}

export async function bulkDeleteClientes(ids: string[]): Promise<boolean> {
  for (const id of ids) {
    await deleteCliente(id)
  }
  return true
}

export interface ProgressoMesclagemInfo {
  etapa: string
  colecao?: string
  concluidos: number
  total: number
  porcentagem?: number
  detalhe?: string
}

export type ProgressoMesclagemCallback = (progresso: ProgressoMesclagemInfo) => void

export interface MesclagemOpcoes {
  clienteMestreId: string
  clienteSecundarioId?: string
  // Suporte a N clientes secundários mesclados
  clientesSecundariosIds?: string[]
  camposSobrescritos: Partial<Cliente>
  modo?: 'unificar_cliente' | 'converter_contato_adicional'
  contatoAdicionalConfig?: {
    papel?: 'principal' | 'financeiro' | 'tecnico' | 'responsavel' | 'outro'
    is_whatsapp?: boolean
    is_principal?: boolean
    cargo?: string
  }
  onProgresso?: ProgressoMesclagemCallback
}

export interface MesclagemMultiplaOpcoes {
  clientePrincipalId: string
  clientesSecundariosIds: string[]
  camposSobrescritos: Partial<Cliente>
  modo?: 'unificar_cliente' | 'converter_contato_adicional'
  contatosAdicionaisConfig?: Record<
    string,
    {
      papel?: 'principal' | 'financeiro' | 'tecnico' | 'responsavel' | 'outro'
      is_whatsapp?: boolean
      is_principal?: boolean
      cargo?: string
    }
  >
  onProgresso?: ProgressoMesclagemCallback
}

export interface VinculosClienteSumario {
  negocios: number
  atividades: number
  usinas: number
  orcamentos: number
  contratosOM: number
  projetos: number
  ordensServico: number
  conversasWhatsApp: number
  contatosAdicionais: number
  total: number
}

/**
 * Conta os vínculos existentes de um cliente para exibir no sumário pré-conversão/mesclagem
 */
export async function contarVinculosCliente(clienteId: string): Promise<VinculosClienteSumario> {
  const sumario: VinculosClienteSumario = {
    negocios: 0,
    atividades: 0,
    usinas: 0,
    orcamentos: 0,
    contratosOM: 0,
    projetos: 0,
    ordensServico: 0,
    conversasWhatsApp: 0,
    contatosAdicionais: 0,
    total: 0,
  }

  if (!clienteId) return sumario

  const safeCount = async (collection: string, filterField: string): Promise<number> => {
    try {
      const res = await pb.collection(collection).getList(1, 1, {
        filter: `${filterField} = '${clienteId}'`,
        requestKey: null,
      })
      return res.totalItems
    } catch {
      return 0
    }
  }

  const [
    negocios,
    atividades,
    usinas,
    orcamentos,
    contratosOM,
    projetos,
    ordensServico,
    conversasWhatsApp,
    contatosAdicionais,
  ] = await Promise.all([
    safeCount('negocios', 'cliente_id'),
    safeCount('atividades', 'cliente_id'),
    safeCount('usinas', 'cliente_id'),
    safeCount('orcamentos_solar', 'cliente_id'),
    safeCount('contratos_om', 'cliente_id'),
    safeCount('projetos', 'cliente_id'),
    safeCount('ordens_servico', 'cliente_id'),
    safeCount('whatsapp_conversas', 'cliente_id'),
    safeCount('contatos_adicionais', 'cliente'),
  ])

  sumario.negocios = negocios
  sumario.atividades = atividades
  sumario.usinas = usinas
  sumario.orcamentos = orcamentos
  sumario.contratosOM = contratosOM
  sumario.projetos = projetos
  sumario.ordensServico = ordensServico
  sumario.conversasWhatsApp = conversasWhatsApp
  sumario.contatosAdicionais = contatosAdicionais
  sumario.total =
    negocios +
    atividades +
    usinas +
    orcamentos +
    contratosOM +
    projetos +
    ordensServico +
    conversasWhatsApp +
    contatosAdicionais

  return sumario
}

/**
 * Utilitário para executar tarefas em lotes com concorrência controlada (chunks).
 */
export async function executeInChunks<T, R>(
  items: T[],
  chunkSize: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const chunkResults = await Promise.all(chunk.map((item, localIdx) => task(item, i + localIdx)))
    results.push(...chunkResults)
  }
  return results
}

/**
 * Nomes amigáveis em português para cada coleção do CRM durante o progresso de mesclagem.
 */
export const NOMES_COLECOES_CRM: Record<string, string> = {
  negocios: 'Negócios e Oportunidades',
  atividades: 'Atividades e Tarefas',
  propostas_om: 'Propostas de O&M',
  orcamentos_solar: 'Orçamentos Fotovoltaicos',
  manutencoes: 'Manutenções Preventivas/Corretivas',
  sistemas: 'Sistemas e Usinas',
  contratos_om: 'Contratos O&M',
  anomalias_om: 'Anomalias de Operação',
  servicos_adicionais_om: 'Serviços Adicionais O&M',
  timeline_om: 'Histórico da Timeline',
  servicos_avulsos: 'Serviços Avulsos',
  documentos_cliente: 'Documentos Anexados',
  fornecedores_orcamentos: 'Cotações de Fornecedores',
  whatsapp_mensagens: 'Mensagens de WhatsApp',
  whatsapp_conversas: 'Conversas de WhatsApp',
  ordens_servico: 'Ordens de Serviço de Campo',
  cliente_inversores: 'Inversores Vinculados',
  usinas: 'Usinas Fotovoltaicas',
  projetos: 'Projetos Técnicos',
  analises_fatura: 'Análises de Fatura RGE',
  notificacoes_internas: 'Notificações Internas',
  contatos_adicionais: 'Contatos Adicionais',
  transferencias_creditos: 'Transferências de Créditos',
  contatos: 'Vínculos de Contatos',
}

/**
 * Reatribui em lote todos os vínculos de um cliente de origem para um cliente destino.
 * Otimizado: atualizações paralelizadas em chunks concorrentes de 8 a 10 requisições simultâneas.
 */
export async function reatribuirTodosVinculosCliente(
  clienteOrigemId: string,
  clienteDestinoId: string,
  onProgresso?: (info: {
    colecao: string
    concluidos: number
    total: number
    detalhe?: string
  }) => void,
): Promise<number> {
  if (clienteOrigemId === clienteDestinoId) return 0

  const CHUNK_SIZE = 8
  let totalTransferidos = 0

  // 1. Coleções com cliente_id
  const collectionsComClienteId = [
    'negocios',
    'atividades',
    'propostas_om',
    'orcamentos_solar',
    'manutencoes',
    'sistemas',
    'contratos_om',
    'anomalias_om',
    'servicos_adicionais_om',
    'timeline_om',
    'servicos_avulsos',
    'documentos_cliente',
    'fornecedores_orcamentos',
    'whatsapp_mensagens',
    'whatsapp_conversas',
    'ordens_servico',
    'cliente_inversores',
    'usinas',
    'projetos',
    'analises_fatura',
    'notificacoes_internas',
  ]

  for (const col of collectionsComClienteId) {
    try {
      const records = await pb.collection(col).getFullList({
        filter: `cliente_id = '${clienteOrigemId}'`,
        fields: 'id',
        requestKey: null,
      })

      if (records.length > 0) {
        let concluidosNaColecao = 0
        const nomeAmigavel = NOMES_COLECOES_CRM[col] || col

        await executeInChunks(records, CHUNK_SIZE, async (rec) => {
          try {
            await pb.collection(col).update(rec.id, { cliente_id: clienteDestinoId })
            totalTransferidos++
            concluidosNaColecao++
            onProgresso?.({
              colecao: col,
              concluidos: concluidosNaColecao,
              total: records.length,
              detalhe: `${nomeAmigavel}... ${concluidosNaColecao}/${records.length}`,
            })
          } catch (err) {
            console.warn(
              `Falha ao reatribuir ${col} ${rec.id} para cliente ${clienteDestinoId}:`,
              err,
            )
          }
        })
      }
    } catch (err) {
      console.warn(`Erro ao consultar ${col} para reatribuição:`, err)
    }
  }

  // 2. Contatos adicionais existentes no cliente origem (campo: `cliente`)
  try {
    const contatos = await pb.collection('contatos_adicionais').getFullList({
      filter: `cliente = '${clienteOrigemId}'`,
      fields: 'id',
      requestKey: null,
    })
    if (contatos.length > 0) {
      let concluidos = 0
      await executeInChunks(contatos, CHUNK_SIZE, async (c) => {
        try {
          await pb.collection('contatos_adicionais').update(c.id, { cliente: clienteDestinoId })
          totalTransferidos++
          concluidos++
          onProgresso?.({
            colecao: 'contatos_adicionais',
            concluidos,
            total: contatos.length,
            detalhe: `Contatos adicionais... ${concluidos}/${contatos.length}`,
          })
        } catch (err) {
          console.warn(`Falha ao reatribuir contato_adicional ${c.id}:`, err)
        }
      })
    }
  } catch (err) {
    console.warn('Erro ao reatribuir contatos_adicionais:', err)
  }

  // 3. Transferências de créditos (cliente_origem_id e cliente_destino_id)
  try {
    const transfOrigem = await pb.collection('transferencias_creditos').getFullList({
      filter: `cliente_origem_id = '${clienteOrigemId}'`,
      fields: 'id',
      requestKey: null,
    })
    if (transfOrigem.length > 0) {
      await executeInChunks(transfOrigem, CHUNK_SIZE, async (t) => {
        try {
          await pb
            .collection('transferencias_creditos')
            .update(t.id, { cliente_origem_id: clienteDestinoId })
          totalTransferidos++
        } catch {
          /* ignore */
        }
      })
    }

    const transfDestino = await pb.collection('transferencias_creditos').getFullList({
      filter: `cliente_destino_id = '${clienteOrigemId}'`,
      fields: 'id',
      requestKey: null,
    })
    if (transfDestino.length > 0) {
      await executeInChunks(transfDestino, CHUNK_SIZE, async (t) => {
        try {
          await pb
            .collection('transferencias_creditos')
            .update(t.id, { cliente_destino_id: clienteDestinoId })
          totalTransferidos++
        } catch {
          /* ignore */
        }
      })
    }
  } catch (err) {
    console.warn('Erro ao reatribuir transferencias_creditos:', err)
  }

  // 4. Coleção `contatos` (relação contatos com clientes_vinculados)
  try {
    const contatosRel = await pb.collection('contatos').getFullList({
      filter: `clientes_vinculados ~ '${clienteOrigemId}'`,
      requestKey: null,
    })
    if (contatosRel.length > 0) {
      await executeInChunks(contatosRel, CHUNK_SIZE, async (c) => {
        const vinculados: string[] = Array.isArray(c.clientes_vinculados)
          ? c.clientes_vinculados
          : []
        const novosVinculados = Array.from(
          new Set(vinculados.filter((id) => id !== clienteOrigemId).concat(clienteDestinoId)),
        )
        try {
          await pb.collection('contatos').update(c.id, { clientes_vinculados: novosVinculados })
          totalTransferidos++
        } catch {
          /* ignore */
        }
      })
    }
  } catch {
    /* ignore se coleção não tiver registros */
  }

  return totalTransferidos
}

/**
 * Converte um cliente em Contato Adicional de outro cliente:
 * - Cria um novo contato adicional no cliente destino com os dados do cliente origem
 * - Transfere todos os vínculos (negócios, usinas, atividades, orçamentos, etc.) para o destino
 * - Transfere os contatos adicionais que já estavam no cliente origem
 * - Registra nota de auditoria na timeline
 * - Exclui o cadastro do cliente convertido
 */
export async function converterClienteEmContatoAdicional({
  clientePrincipalId,
  clienteConvertidoId,
  papel = 'outro',
  cargo,
  is_principal = false,
  is_whatsapp,
}: {
  clientePrincipalId: string
  clienteConvertidoId: string
  papel?: 'principal' | 'financeiro' | 'tecnico' | 'responsavel' | 'outro'
  cargo?: string
  is_principal?: boolean
  is_whatsapp?: boolean
}): Promise<{ clientePrincipal: Cliente; contatoAdicionalId: string }> {
  if (clientePrincipalId === clienteConvertidoId) {
    throw new Error('Não é possível converter um cliente nele mesmo.')
  }

  const [clientePrincipal, clienteOrigem] = await Promise.all([
    pb.collection('clientes').getOne<Cliente>(clientePrincipalId),
    pb.collection('clientes').getOne<Cliente>(clienteConvertidoId),
  ])

  // Se for marcado como principal, desmarcar qualquer outro contato principal existente
  if (is_principal || papel === 'principal') {
    try {
      const anteriores = await pb.collection('contatos_adicionais').getFullList({
        filter: `cliente = '${clientePrincipalId}' && (is_principal = true || papel = 'principal')`,
        fields: 'id,papel',
        requestKey: null,
      })
      for (const ant of anteriores) {
        await pb.collection('contatos_adicionais').update(ant.id, {
          is_principal: false,
          papel: ant.papel === 'principal' ? 'outro' : ant.papel,
        })
      }
    } catch (e) {
      console.warn('Aviso ao desmarcar contato principal anterior:', e)
    }
  }

  // 1. Criar o registro em contatos_adicionais no cliente principal
  const telContato = clienteOrigem.whatsapp || clienteOrigem.telefone || undefined
  const novoContato = await pb
    .collection('contatos_adicionais')
    .create<import('@/types/crm').ContatoAdicional>({
      cliente: clientePrincipalId,
      nome: clienteOrigem.nome || 'Contato Adicional',
      cargo:
        cargo || (clienteOrigem.tipo_pessoa === 'juridica' ? 'Representante Legal' : 'Contato'),
      papel: is_principal ? 'principal' : papel,
      telefone: telContato,
      email: clienteOrigem.email || undefined,
      is_whatsapp: typeof is_whatsapp === 'boolean' ? is_whatsapp : Boolean(clienteOrigem.whatsapp),
      is_principal: Boolean(is_principal || papel === 'principal'),
    })

  // 2. Reatribuir todos os vínculos (negócios, atividades, orçamentos, etc.) da origem para o destino
  await reatribuirTodosVinculosCliente(clienteConvertidoId, clientePrincipalId)

  // 3. Fundir anotações / histórico
  let novasObservacoes = clientePrincipal.observacoes || ''
  if (clienteOrigem.observacoes && clienteOrigem.observacoes.trim()) {
    const obsOrigem = clienteOrigem.observacoes.trim()
    if (!novasObservacoes.includes(obsOrigem)) {
      novasObservacoes = novasObservacoes
        ? `${novasObservacoes}\n\n[Histórico do cadastro convertido (${clienteOrigem.nome})]: ${obsOrigem}`
        : `[Histórico de ${clienteOrigem.nome}]: ${obsOrigem}`
    }
  }

  const clienteAtualizado = await updateCliente(clientePrincipalId, {
    observacoes: novasObservacoes || undefined,
  })

  // 4. Registrar atividade de auditoria
  try {
    await createAtividade({
      cliente_id: clientePrincipalId,
      tipo: 'anotacao',
      titulo: 'Cliente convertido em contato adicional',
      descricao: `O cliente "${clienteOrigem.nome}" (ID: ${clienteConvertidoId}) foi convertido em contato adicional deste cliente em ${new Date().toLocaleString('pt-BR')}. Todas as oportunidades, negócios, usinas, atividades e orçamentos vinculados foram transferidos para este cadastro com sucesso.`,
      data: new Date().toISOString(),
      status: 'concluida',
      autor: 'Sistema Delfos',
    })
  } catch (e) {
    console.warn('Falha ao registrar atividade de conversão em contato adicional:', e)
  }

  // 5. Excluir o cadastro de cliente de origem
  try {
    await pb.collection('clientes').delete(clienteConvertidoId)
  } catch (err) {
    console.warn(`Falha ao excluir cliente convertido ${clienteConvertidoId}:`, err)
  }

  return {
    clientePrincipal: clienteAtualizado,
    contatoAdicionalId: novoContato.id,
  }
}

/**
 * Mescla com segurança o clienteSecundario no clienteMestre:
 * Pode ser:
 * - 'unificar_cliente': funde dados e campos no cliente mestre e exclui o secundário (padrão)
 * - 'converter_contato_adicional': transforma o clienteSecundario em contato adicional do clienteMestre, transferindo tudo e excluindo o cadastro secundário
 */
/**
 * Mescla com segurança múltiplos clientes secundários no cliente principal (N clientes):
 * - Reatribui todos os relacionamentos (negócios, atividades, usinas, orçamentos, contratos O&M, etc.)
 * - Atualiza o cliente principal com os campos selecionados pelo usuário
 * - Se em modo converter_contato_adicional, cria registros em contatos_adicionais
 * - Registra nota de auditoria detalhada no histórico do cliente principal
 * - Exclui apenas os registros dos clientes secundários mesclados (nunca os registros vinculados)
 */
export async function mesclarMultiplosClientes({
  clientePrincipalId,
  clientesSecundariosIds,
  camposSobrescritos,
  modo = 'unificar_cliente',
  contatosAdicionaisConfig = {},
  onProgresso,
}: MesclagemMultiplaOpcoes): Promise<Cliente> {
  const secundariosLimpos = Array.from(
    new Set((clientesSecundariosIds || []).filter((id) => id && id !== clientePrincipalId)),
  )

  if (secundariosLimpos.length === 0) {
    // Se nenhum secundário, apenas aplica os campos no principal se houver
    if (camposSobrescritos && Object.keys(camposSobrescritos).length > 0) {
      return await updateCliente(clientePrincipalId, camposSobrescritos)
    }
    return await pb.collection('clientes').getOne<Cliente>(clientePrincipalId)
  }

  // Notificar início
  onProgresso?.({
    etapa: 'preparando',
    concluidos: 0,
    total: 100,
    porcentagem: 5,
    detalhe: 'Verificando cadastros dos clientes participantes...',
  })

  // Buscar dados dos clientes secundários em paralelo para auditoria e histórico
  const clientesSecundarios: Cliente[] = []
  const buscaResultados = await Promise.allSettled(
    secundariosLimpos.map((secId) => pb.collection('clientes').getOne<Cliente>(secId)),
  )
  buscaResultados.forEach((res, i) => {
    if (res.status === 'fulfilled') {
      clientesSecundarios.push(res.value)
    } else {
      console.warn(`Aviso ao buscar cliente secundário ${secundariosLimpos[i]}:`, res.reason)
    }
  })

  // 1. Se modo converter_contato_adicional, criar contatos adicionais em paralelo
  if (modo === 'converter_contato_adicional' && clientesSecundarios.length > 0) {
    onProgresso?.({
      etapa: 'contatos_adicionais',
      concluidos: 0,
      total: clientesSecundarios.length,
      porcentagem: 15,
      detalhe: 'Convertendo clientes em contatos adicionais...',
    })

    await Promise.allSettled(
      clientesSecundarios.map(async (sec) => {
        const cfg = contatosAdicionaisConfig[sec.id] || {}
        const telContato = sec.whatsapp || sec.telefone || undefined
        try {
          await pb
            .collection('contatos_adicionais')
            .create<import('@/types/crm').ContatoAdicional>({
              cliente: clientePrincipalId,
              nome: sec.nome || 'Contato Adicional',
              cargo:
                cfg.cargo || (sec.tipo_pessoa === 'juridica' ? 'Representante Legal' : 'Contato'),
              papel: cfg.papel || 'outro',
              telefone: telContato,
              email: sec.email || undefined,
              is_whatsapp:
                typeof cfg.is_whatsapp === 'boolean' ? cfg.is_whatsapp : Boolean(sec.whatsapp),
              is_principal: Boolean(cfg.is_principal),
            })
        } catch (err) {
          console.warn(`Falha ao converter ${sec.id} em contato_adicional:`, err)
        }
      }),
    )
  }

  // 2. Reatribuir TODOS os vínculos de TODOS os clientes secundários em paralelo
  // Cada secundário é repontado de forma independente para o clientePrincipalId
  onProgresso?.({
    etapa: 'reatribuindo',
    concluidos: 0,
    total: 100,
    porcentagem: 25,
    detalhe: 'Transferindo vínculos e histórico em paralelo...',
  })

  let totalTransferidosGeral = 0

  // Cada cliente secundário roda sua reatribuição concorrentemente
  const reatribuicaoPromises = secundariosLimpos.map(async (secId, secIdx) => {
    const nomeSec = clientesSecundarios.find((c) => c.id === secId)?.nome || `Cliente ${secIdx + 1}`
    const qtd = await reatribuirTodosVinculosCliente(secId, clientePrincipalId, (info) => {
      onProgresso?.({
        etapa: 'transferindo_registros',
        colecao: info.colecao,
        concluidos: info.concluidos,
        total: info.total,
        porcentagem: 30 + Math.min(50, Math.round((totalTransferidosGeral + info.concluidos) * 2)),
        detalhe: `[${nomeSec}] Transferindo ${info.detalhe || info.colecao}...`,
      })
    })
    totalTransferidosGeral += qtd
    return qtd
  })

  await Promise.all(reatribuicaoPromises)

  // 3. Atualizar o cliente principal com os campos sobrescritos escolhidos pelo usuário (executado uma única vez)
  onProgresso?.({
    etapa: 'atualizando_principal',
    concluidos: 85,
    total: 100,
    porcentagem: 85,
    detalhe: 'Atualizando dados e campos no cliente principal...',
  })

  const clienteAtualizado = await updateCliente(clientePrincipalId, camposSobrescritos)

  // 4. Registrar atividade informativa de auditoria detalhada no cliente principal (uma única vez)
  onProgresso?.({
    etapa: 'auditoria',
    concluidos: 90,
    total: 100,
    porcentagem: 90,
    detalhe: 'Registrando auditoria da mesclagem no histórico...',
  })

  try {
    const nomesSecundarios = clientesSecundarios.map((c) => `"${c.nome}" (ID: ${c.id})`).join(', ')
    await createAtividade({
      cliente_id: clientePrincipalId,
      tipo: 'anotacao',
      titulo: `Mesclagem de ${secundariosLimpos.length + 1} clientes realizada`,
      descricao: `Mesclagem de múltiplos clientes realizada com sucesso em ${new Date().toLocaleString('pt-BR')}. ${secundariosLimpos.length} cadastro(s) foram absorvidos neste registro: ${nomesSecundarios || secundariosLimpos.join(', ')}. ${totalTransferidosGeral} vínculo(s) foram repontados. Todos os negócios/oportunidades, usinas, atividades, orçamentos, contratos e histórico foram unificados com segurança no cadastro principal.`,
      data: new Date().toISOString(),
      status: 'concluida',
      autor: 'Sistema Delfos',
    })
  } catch (e) {
    console.warn('Falha ao registrar atividade de mesclagem múltipla:', e)
  }

  // 5. Excluir os registros dos clientes secundários em paralelo
  onProgresso?.({
    etapa: 'limpeza',
    concluidos: 95,
    total: 100,
    porcentagem: 95,
    detalhe: 'Removendo cadastros secundários absorvidos...',
  })

  await Promise.allSettled(
    secundariosLimpos.map(async (secId) => {
      try {
        await pb.collection('clientes').delete(secId)
      } catch (err) {
        console.warn(`Falha ao excluir cliente secundário ${secId} após mesclagem múltipla:`, err)
      }
    }),
  )

  onProgresso?.({
    etapa: 'concluido',
    concluidos: 100,
    total: 100,
    porcentagem: 100,
    detalhe: `Mesclagem concluída com sucesso! ${totalTransferidosGeral} vínculos transferidos.`,
  })

  return clienteAtualizado
}

/**
 * Mescla com segurança o clienteSecundario no clienteMestre:
 * Mantido para retrocompatibilidade com chamadas existentes de 2 clientes.
 */
export async function mesclarClientes(opcoes: MesclagemOpcoes): Promise<Cliente> {
  const {
    clienteMestreId,
    clienteSecundarioId,
    clientesSecundariosIds,
    camposSobrescritos,
    modo = 'unificar_cliente',
    contatoAdicionalConfig,
    onProgresso,
  } = opcoes

  // Suporte unificado tanto para clienteSecundarioId quanto para clientesSecundariosIds
  const listaSecundarios = [
    ...(clienteSecundarioId ? [clienteSecundarioId] : []),
    ...(clientesSecundariosIds || []),
  ].filter((id) => id && id !== clienteMestreId)

  const secundariosUnicos = Array.from(new Set(listaSecundarios))

  if (secundariosUnicos.length === 0) {
    throw new Error('Nenhum cliente secundário informado para mesclagem.')
  }

  const contatosAdicionaisConfig: Record<string, any> = {}
  if (contatoAdicionalConfig && clienteSecundarioId) {
    contatosAdicionaisConfig[clienteSecundarioId] = contatoAdicionalConfig
  }

  return await mesclarMultiplosClientes({
    clientePrincipalId: clienteMestreId,
    clientesSecundariosIds: secundariosUnicos,
    camposSobrescritos,
    modo,
    contatosAdicionaisConfig,
    onProgresso,
  })
}

export async function createSistema(
  data: Partial<Sistema> & { cliente_id: string },
): Promise<Sistema> {
  const usinaData = mapSistemaPayloadToUsina(data)
  let nomeUsina = 'Usina Principal'
  try {
    const cli = await pb.collection('clientes').getOne<Cliente>(data.cliente_id)
    if (cli?.nome) {
      nomeUsina = `Usina Principal - ${cli.nome}`
    }
  } catch {
    /* intentionally ignored */
  }

  const record = await pb.collection('usinas').create<import('@/types/crm').UsinaCliente>({
    nome: nomeUsina,
    status: 'ativo',
    tipo_estrutura: 'telhado',
    tipo_usina: 'residencial',
    ...usinaData,
    cliente_id: data.cliente_id,
  })
  return mapUsinaToSistema(record)
}

export async function updateSistema(
  idOrClienteId: string,
  data: Partial<Sistema>,
): Promise<Sistema> {
  const usinaData = mapSistemaPayloadToUsina(data)
  let usinaId = idOrClienteId
  try {
    // Tenta carregar direto por id da usina
    const existingUsina = await pb
      .collection('usinas')
      .getOne<import('@/types/crm').UsinaCliente>(idOrClienteId)
    usinaId = existingUsina.id
  } catch {
    // Se não encontrou por ID de usina, procura usina do cliente com este cliente_id
    try {
      const usinaCliente = await pb
        .collection('usinas')
        .getFirstListItem<import('@/types/crm').UsinaCliente>(`cliente_id='${idOrClienteId}'`, {
          sort: 'created',
        })
      usinaId = usinaCliente.id
    } catch {
      // Se não existir usina ainda, cria uma nova
      return createSistema({ ...data, cliente_id: idOrClienteId })
    }
  }

  const record = await pb
    .collection('usinas')
    .update<import('@/types/crm').UsinaCliente>(usinaId, usinaData)
  return mapUsinaToSistema(record)
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
  return withNetworkRetry(
    () =>
      pb.collection('profissionais').getFullList<Profissional>({
        sort: 'nome',
        requestKey: null,
      }),
    2,
    600,
    'fetchProfissionais',
  )
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
  return withNetworkRetry(
    () =>
      pb.collection('projetos').getFullList<Projeto>({
        sort: '-updated',
        expand: 'cliente_id,profissional_id',
        requestKey: null,
      }),
    2,
    600,
    'fetchProjetos',
  )
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
  status?: import('@/types/crm').ProjetoStatus
  potencia_kwp?: number
  cidade?: string
  profissional_id?: string
  profissional_nome?: string
  observacoes?: string
}): Promise<Projeto> {
  const payload = {
    status: 'ativo',
    ...data,
  }
  const record = await pb.collection('projetos').create<Projeto>(payload, {
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
    requestKey: null,
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
  return withNetworkRetry(
    async () => {
      try {
        const records = await pb.collection('contratos_om').getFullList<ContratoOM>({
          sort: '-created',
          expand: 'cliente_id',
          requestKey: null,
        })
        return records
      } catch (err: any) {
        // Se for erro de rede, relança para o withNetworkRetry tentar novamente
        const isNetworkError =
          err?.status === 0 ||
          !err?.status ||
          err?.name === 'TypeError' ||
          String(err?.message || '')
            .toLowerCase()
            .includes('failed to fetch') ||
          String(err?.message || '')
            .toLowerCase()
            .includes('network')
        if (isNetworkError) throw err
        console.error('Erro ao buscar contratos O&M:', err)
        return []
      }
    },
    2,
    600,
    'fetchContratosOM',
  )
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
  numero_contrato?: string
  plano?: ContratoOM['plano']
  status?: ContratoOM['status']
  valor_mensal?: number
  valor_anual?: number
  data_inicio?: string
  data_vencimento?: string
  proxima_atividade_data?: string
  proxima_atividade_titulo?: string
  servicos_realizados?: string[]
  servicos_agendados?: string[]
  observacoes?: string
  status_encerramento?: ContratoOM['status_encerramento']
  motivo_encerramento?: ContratoOM['motivo_encerramento']
  data_encerramento?: string
  observacoes_encerramento?: string
}): Promise<ContratoOM> {
  // Limpar campos undefined / strings vazias desnecessárias para evitar 400 do PocketBase
  const payload: Record<string, any> = {
    cliente_id: data.cliente_id,
    plano: data.plano || 'Essencial',
    status: data.status || 'Ativo',
    valor_mensal: typeof data.valor_mensal === 'number' ? data.valor_mensal : 0,
    valor_anual:
      typeof data.valor_anual === 'number'
        ? data.valor_anual
        : typeof data.valor_mensal === 'number'
          ? data.valor_mensal * 12
          : 0,
    data_inicio: data.data_inicio || new Date().toISOString(),
    data_vencimento:
      data.data_vencimento || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }

  if (data.numero_contrato?.trim()) payload.numero_contrato = data.numero_contrato.trim()
  if (data.proxima_atividade_data) payload.proxima_atividade_data = data.proxima_atividade_data
  if (data.proxima_atividade_titulo?.trim())
    payload.proxima_atividade_titulo = data.proxima_atividade_titulo.trim()
  if (data.servicos_realizados && data.servicos_realizados.length > 0)
    payload.servicos_realizados = data.servicos_realizados
  if (data.servicos_agendados && data.servicos_agendados.length > 0)
    payload.servicos_agendados = data.servicos_agendados
  if (data.observacoes?.trim()) payload.observacoes = data.observacoes.trim()
  if (data.status_encerramento) payload.status_encerramento = data.status_encerramento
  if (data.motivo_encerramento) payload.motivo_encerramento = data.motivo_encerramento
  if (data.data_encerramento) payload.data_encerramento = data.data_encerramento
  if (data.observacoes_encerramento?.trim())
    payload.observacoes_encerramento = data.observacoes_encerramento.trim()

  const record = await pb.collection('contratos_om').create<ContratoOM>(payload, {
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
      requestKey: null,
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
      requestKey: null,
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
      requestKey: null,
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
        requestKey: null,
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
  try {
    const records = await pb
      .collection('orcamentos_solar')
      .getFullList<import('@/types/crm').OrcamentoSolar>({
        sort: '-data_orcamento,-created',
        expand: 'cliente_id',
        requestKey: null,
      })
    return records
  } catch (err: any) {
    // Se for erro de autenticação/sessão expirada, relança imediatamente para não engolir o 401/403
    if (
      err?.status === 401 ||
      err?.status === 403 ||
      err?.response?.status === 401 ||
      err?.response?.status === 403
    ) {
      throw err
    }

    console.warn(
      'Falha na consulta primária de orçamentos com expand (ex: relação órfã ou erro 400). Tentando fallback defensivo sem expand...',
      err,
    )
    // Fallback defensivo: se houver relação cliente_id quebrada ou campo nulo causando erro 400 no expand,
    // refaz a requisição sem o expand e com ordenação segura por created para garantir que a lista nunca
    // fique zerada por causa de registros órfãos. O frontend faz a correspondência por cliente_id localmente.
    const fallbackRecords = await pb
      .collection('orcamentos_solar')
      .getFullList<import('@/types/crm').OrcamentoSolar>({
        sort: '-created',
        requestKey: null,
      })
    return fallbackRecords
  }
}

export async function createOrcamentoSolar(
  data: Partial<import('@/types/crm').OrcamentoSolar> | FormData,
): Promise<import('@/types/crm').OrcamentoSolar> {
  let body: any = data
  if (!(data instanceof FormData)) {
    body = {
      ...data,
      status: data.status || 'Em elaboração',
      data_orcamento: data.data_orcamento || new Date().toISOString(),
      validade_dias: data.validade_dias || 5,
      autor: data.autor || 'Delfos Solar',
    }
  }
  const record = await pb
    .collection('orcamentos_solar')
    .create<import('@/types/crm').OrcamentoSolar>(body, {
      expand: 'cliente_id',
    })
  return record
}

export async function updateOrcamentoSolar(
  id: string,
  data: Partial<import('@/types/crm').OrcamentoSolar> | FormData,
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
        requestKey: null,
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
        requestKey: null,
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
        filter: `conversa_id = '${conversaId}' && cliente_id = ''`,
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
  numero?: string
  telefone_destino?: string
}): Promise<import('@/types/crm').WhatsAppMensagem[]> {
  try {
    const filters: string[] = []
    if (options?.clienteId) filters.push(`cliente_id='${options.clienteId}'`)
    if (options?.conversaId) filters.push(`conversa_id='${options.conversaId}'`)
    // O campo 'numero' não existe em whatsapp_mensagens; o campo correto é 'telefone_destino'
    const telefoneDestino = options?.telefone_destino || options?.numero
    if (telefoneDestino) filters.push(`telefone_destino='${telefoneDestino}'`)
    const filter = filters.join(' && ')

    const records = await pb
      .collection('whatsapp_mensagens')
      .getFullList<import('@/types/crm').WhatsAppMensagem>({
        filter: filter || undefined,
        sort: 'created',
        expand: 'cliente_id,template_id,conversa_id',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar mensagens WhatsApp:', err)
    return []
  }
}

export async function sendWhatsAppMensagem(data: {
  cliente_id?: string
  clienteId?: string
  conversa_id?: string
  telefone?: string
  telefone_destino?: string
  mensagem?: string
  conteudo_final?: string
  template_id?: string
  agendado_para?: string | null
  tipo_disparo?: string
  origem?: string
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
  // Salvaguarda central: se for envio manual ou não especificado e não tiver o prefixo [Nome]:, garante a aplicação
  let conteudoTratado = (data.conteudo_final || data.mensagem || '').trim()
  const tipoFinal = data.tipo_disparo || data.origem || 'manual'
  const isAuto =
    tipoFinal === 'webhook' ||
    tipoFinal === 'gatilho_automatico' ||
    tipoFinal === 'automacao_sistema'
  if (!isAuto && conteudoTratado) {
    try {
      const { jaPossuiPrefixoManual, aplicarPrefixoMensagemManual } =
        await import('@/lib/whatsappPrefixo')
      if (!jaPossuiPrefixoManual(conteudoTratado)) {
        conteudoTratado = aplicarPrefixoMensagemManual(conteudoTratado)
      }
    } catch (_) {
      // Se não carregar módulo dinâmico, mantém intacto
    }
  }

  const payload = {
    cliente_id: data.cliente_id || data.clienteId,
    conversa_id: data.conversa_id,
    telefone_destino: data.telefone_destino || data.telefone || '',
    conteudo_final: conteudoTratado,
    template_id: data.template_id,
    agendado_para: data.agendado_para,
    tipo_disparo: tipoFinal,
    referencia_id: data.referencia_id,
  }

  return pb.send('/backend/v1/whatsapp/send', {
    method: 'POST',
    body: payload,
  })
}

export async function sendLembreteAutoLeituraWhatsApp(
  atividadeId: string,
  opcoes?: {
    mensagem_personalizada?: string
    telefone_destino?: string
  },
): Promise<{
  ok: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  mensagem?: string
  telefone_destino?: string
  lembrete_whatsapp_enviado_em?: string
  message: string
  error?: string
  atividade?: import('@/types/crm').Atividade
}> {
  return pb.send('/backend/v1/whatsapp/enviar-lembrete-auto-leitura', {
    method: 'POST',
    body: {
      atividade_id: atividadeId,
      mensagem_personalizada: opcoes?.mensagem_personalizada,
      telefone_destino: opcoes?.telefone_destino,
    },
  })
}

export async function sendOSWhatsAppManual(
  osId: string,
  opcoes?: {
    mensagem_personalizada?: string
    telefone_destino?: string
  },
): Promise<{
  ok: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message: string
  error?: string
  code?: string
  destinatario?: {
    nome: string
    telefone: string
  }
  data?: import('@/types/crm').WhatsAppMensagem
}> {
  return pb.send('/backend/v1/whatsapp/enviar-os', {
    method: 'POST',
    body: {
      os_id: osId,
      mensagem_personalizada: opcoes?.mensagem_personalizada,
      telefone_destino: opcoes?.telefone_destino,
    },
  })
}

export async function sendWhatsAppDocumento(data: {
  cliente_id?: string
  conversa_id?: string
  telefone_destino: string
  tipo: 'orcamento_solar' | 'proposta_om' | 'documento'
  referencia_id?: string
  legenda?: string
  nome_arquivo?: string
  base64?: string
  documento_url?: string
  record_id?: string
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

export async function sendWhatsAppAudio(data: {
  cliente_id?: string
  conversa_id?: string
  telefone_destino: string
  audio: string // base64 (data:audio/ogg;codecs=opus;base64,...) ou URL
  duracao_segundos?: number
  referencia_id?: string
}): Promise<{
  ok: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message: string
  data?: import('@/types/crm').WhatsAppMensagem
}> {
  return pb.send('/backend/v1/whatsapp/enviar-audio', {
    method: 'POST',
    body: data,
  })
}

export async function sendWhatsAppImage(data: {
  cliente_id?: string
  conversa_id?: string
  telefone_destino: string
  imagem?: string
  image?: string
  base64?: string
  imagem_url?: string
  legenda?: string
  caption?: string
  nome_arquivo?: string
  fileName?: string
  record_id?: string
  referencia_id?: string
}): Promise<{
  ok: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message: string
  data?: import('@/types/crm').WhatsAppMensagem
}> {
  return pb.send('/backend/v1/whatsapp/enviar-imagem', {
    method: 'POST',
    body: data,
  })
}

export async function sendWhatsAppVideo(data: {
  cliente_id?: string
  conversa_id?: string
  telefone_destino: string
  video?: string
  base64?: string
  video_url?: string
  legenda?: string
  caption?: string
  nome_arquivo?: string
  fileName?: string
  record_id?: string
  referencia_id?: string
}): Promise<{
  ok: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message: string
  data?: import('@/types/crm').WhatsAppMensagem
}> {
  return pb.send('/backend/v1/whatsapp/enviar-video', {
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

/**
 * Move um lead/cliente do funil para a lista de Outros Contatos:
 * 1. Cria um registro na collection `outros_contatos` com nome, telefone/WhatsApp (fallback se vazio),
 *    tipo_contato "outro" e observação consolidando data/hora, status anterior no funil e dados preservados
 *    (e-mail, endereço/cidade/estado, CPF/CNPJ, observações originais).
 * 2. Em seguida, exclui o cliente do CRM via `deleteCliente` (com sua cascata limpa).
 */
export async function moverClienteParaOutrosContatos(
  cliente: Cliente,
): Promise<import('@/types/crm').OutroContato> {
  const nomeContato = (cliente.nome || '').trim() || 'Contato sem nome'
  const telefoneContato =
    (cliente.whatsapp || cliente.telefone || cliente.telefone_secundario || '').trim() ||
    '00000000000'

  const dataHoraFormatada = new Date().toLocaleString('pt-BR')
  const linhasObs: string[] = [`[Origem: Movido do Funil de Vendas em ${dataHoraFormatada}]`]

  if (cliente.status) {
    linhasObs.push(`Etapa anterior: ${cliente.status}`)
  }
  if (cliente.email) {
    linhasObs.push(`E-mail: ${cliente.email}`)
  }
  if (cliente.cpf) {
    linhasObs.push(`CPF: ${cliente.cpf}`)
  }
  if (cliente.cnpj) {
    linhasObs.push(`CNPJ: ${cliente.cnpj}`)
  }
  if (cliente.cidade || cliente.estado) {
    const loc = [cliente.cidade, cliente.estado].filter(Boolean).join(' - ')
    linhasObs.push(`Cidade/UF: ${loc}`)
  }
  if (cliente.endereco) {
    linhasObs.push(`Endereço: ${cliente.endereco}`)
  }
  if (cliente.valor_estimado) {
    linhasObs.push(`Valor estimado lead: R$ ${cliente.valor_estimado.toLocaleString('pt-BR')}`)
  }
  if (cliente.potencia_kwp) {
    linhasObs.push(`Potência: ${cliente.potencia_kwp} kWp`)
  }
  if (cliente.observacoes && cliente.observacoes.trim()) {
    linhasObs.push(`Observações originais: ${cliente.observacoes.trim()}`)
  }

  const observacaoFinal = linhasObs.join('\n')

  const outroContatoCriado = await createOutroContato({
    nome: nomeContato,
    telefone: telefoneContato,
    tipo_contato: 'outro',
    observacao: observacaoFinal,
  })

  // Criar também no cadastro único 'contatos' de forma aditiva
  try {
    const isTelValido = telefoneContato && telefoneContato !== '00000000000'
    const telWpp = isTelValido ? telefoneContato : ''
    await pb.collection('contatos').create({
      nome: nomeContato,
      telefone: telWpp,
      whatsapp: telWpp,
      email: cliente.email || '',
      papel: 'lead',
      observacoes: observacaoFinal,
      origem_registro: 'movido_funil_vendas',
    })
  } catch (syncErr) {
    console.warn('Registro em contatos unificados omitido/falhou:', syncErr)
  }

  // Exclui o cliente e suas coleções dependentes
  await deleteCliente(cliente.id)

  return outroContatoCriado
}

export async function fetchOutrosContatos(): Promise<import('@/types/crm').OutroContato[]> {
  try {
    return await pb.collection('outros_contatos').getFullList<import('@/types/crm').OutroContato>({
      sort: '-created',
      requestKey: null,
    })
  } catch (err) {
    console.error('Erro ao buscar outros contatos:', err)
    return []
  }
}

export async function deleteOutroContato(id: string): Promise<boolean> {
  await pb.collection('outros_contatos').delete(id)
  return true
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
// Contatos Adicionais Services
// -------------------------------------------------------------

export async function fetchContatosAdicionais(
  clienteId?: string,
): Promise<import('@/types/crm').ContatoAdicional[]> {
  try {
    const filter = clienteId ? `cliente = '${clienteId}'` : undefined
    return await pb
      .collection('contatos_adicionais')
      .getFullList<import('@/types/crm').ContatoAdicional>({
        filter,
        sort: 'created',
        requestKey: null,
      })
  } catch (err) {
    console.error('Erro ao buscar contatos adicionais:', err)
    return []
  }
}

export async function createContatoAdicional(data: {
  cliente: string
  nome: string
  cargo?: string
  papel?: string
  telefone?: string
  email?: string
  is_whatsapp?: boolean
}): Promise<import('@/types/crm').ContatoAdicional> {
  return await pb
    .collection('contatos_adicionais')
    .create<import('@/types/crm').ContatoAdicional>(data)
}

export async function updateContatoAdicional(
  id: string,
  data: Partial<{
    nome: string
    cargo: string
    papel: string
    telefone: string
    email: string
    is_whatsapp: boolean
    is_principal: boolean
  }>,
): Promise<import('@/types/crm').ContatoAdicional> {
  return await pb
    .collection('contatos_adicionais')
    .update<import('@/types/crm').ContatoAdicional>(id, data)
}

/**
 * Define um contato como o Contato Principal do cliente.
 * Se contatoAdicionalId for fornecido, marca ele com is_principal=true (e papel='principal')
 * e desmarca todos os outros contatos adicionais deste cliente.
 * Se contatoAdicionalId for null, significa que o contato direto do cliente foi escolhido como principal,
 * então desmarca todos os contatos adicionais como principal.
 */
export async function definirContatoPrincipal({
  clienteId,
  contatoAdicionalId,
}: {
  clienteId: string
  contatoAdicionalId: string | null
}): Promise<void> {
  const todos = await pb
    .collection('contatos_adicionais')
    .getFullList<import('@/types/crm').ContatoAdicional>({
      filter: `cliente = '${clienteId}'`,
      requestKey: null,
    })

  for (const c of todos) {
    const deveSerPrincipal = Boolean(contatoAdicionalId && c.id === contatoAdicionalId)
    const jaEraPrincipal = Boolean(c.is_principal || c.papel === 'principal')

    if (deveSerPrincipal !== jaEraPrincipal || (deveSerPrincipal && !c.is_principal)) {
      try {
        await pb.collection('contatos_adicionais').update(c.id, {
          is_principal: deveSerPrincipal,
          papel: deveSerPrincipal ? 'principal' : c.papel === 'principal' ? 'outro' : c.papel,
        })
      } catch (err) {
        console.warn(`Falha ao atualizar contato principal ${c.id}:`, err)
      }
    }
  }
}

export async function deleteContatoAdicional(id: string): Promise<boolean> {
  await pb.collection('contatos_adicionais').delete(id)
  return true
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
        requestKey: null,
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
        requestKey: null,
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
  // Limpar chaves com valores vazios/indefinidos para evitar erros de validação
  const cleanedData: Record<string, any> = {}
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      cleanedData[key] = val
    }
  })

  if (file) {
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      Object.entries(cleanedData).forEach(([key, val]) => {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      })
      return await pb
        .collection('fornecedores_orcamentos')
        .create<import('@/types/crm').FornecedorOrcamento>(formData, {
          expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
        })
    } catch (uploadErr) {
      console.warn(
        'Falha no upload do anexo do orçamento de fornecedor. Tentando salvar sem o arquivo (graceful degradation)...',
        uploadErr,
      )
      // Graceful degradation: se falhou por restrição de arquivo/rede, salvar os dados sem o arquivo
      const recordSemArquivo = await pb
        .collection('fornecedores_orcamentos')
        .create<import('@/types/crm').FornecedorOrcamento>(cleanedData, {
          expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
        })
      return recordSemArquivo
    }
  }

  return pb
    .collection('fornecedores_orcamentos')
    .create<import('@/types/crm').FornecedorOrcamento>(cleanedData, {
      expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
    })
}

export async function updateFornecedorOrcamento(
  id: string,
  data: Partial<import('@/types/crm').FornecedorOrcamento>,
  file?: File,
): Promise<import('@/types/crm').FornecedorOrcamento> {
  const cleanedData: Record<string, any> = {}
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      cleanedData[key] = val
    }
  })

  if (file) {
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      Object.entries(cleanedData).forEach(([key, val]) => {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      })
      return await pb
        .collection('fornecedores_orcamentos')
        .update<import('@/types/crm').FornecedorOrcamento>(id, formData, {
          expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
        })
    } catch (uploadErr) {
      console.warn(
        'Falha no upload do anexo ao atualizar orçamento de fornecedor. Tentando atualizar sem o arquivo...',
        uploadErr,
      )
      return pb
        .collection('fornecedores_orcamentos')
        .update<import('@/types/crm').FornecedorOrcamento>(id, cleanedData, {
          expand: 'fornecedor_id,cliente_id,orcamento_solar_id',
        })
    }
  }

  return pb
    .collection('fornecedores_orcamentos')
    .update<import('@/types/crm').FornecedorOrcamento>(id, cleanedData, {
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
        requestKey: null,
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

// -------------------------------------------------------------
// Transferências de Créditos Services
// -------------------------------------------------------------

export async function fetchTransferenciasCreditos(
  clienteId?: string,
): Promise<import('@/types/crm').TransferenciaCredito[]> {
  try {
    const filter = clienteId
      ? `cliente_origem_id='${clienteId}' || cliente_destino_id='${clienteId}'`
      : ''
    const records = await pb
      .collection('transferencias_creditos')
      .getFullList<import('@/types/crm').TransferenciaCredito>({
        filter: filter || undefined,
        sort: '-data_solicitacao,-created',
        expand: 'cliente_origem_id,cliente_destino_id',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar transferências de créditos:', err)
    return []
  }
}

export async function createTransferenciaCredito(data: {
  cliente_origem_id: string
  cliente_origem_nome?: string
  cliente_destino_id?: string
  cliente_destino_nome: string
  uc_destino?: string
  quantidade_creditos: number
  data_solicitacao: string
  status: import('@/types/crm').TransferenciaCreditoStatus
  observacoes?: string
  protocolo_concessionaria?: string
}): Promise<import('@/types/crm').TransferenciaCredito> {
  const record = await pb
    .collection('transferencias_creditos')
    .create<import('@/types/crm').TransferenciaCredito>(data, {
      expand: 'cliente_origem_id,cliente_destino_id',
    })
  return record
}

export async function updateTransferenciaCredito(
  id: string,
  data: Partial<import('@/types/crm').TransferenciaCredito>,
): Promise<import('@/types/crm').TransferenciaCredito> {
  const record = await pb
    .collection('transferencias_creditos')
    .update<import('@/types/crm').TransferenciaCredito>(id, data, {
      expand: 'cliente_origem_id,cliente_destino_id',
    })
  return record
}

export async function deleteTransferenciaCredito(id: string): Promise<boolean> {
  await pb.collection('transferencias_creditos').delete(id)
  return true
}

// -------------------------------------------------------------
// Documentos do Cliente & Controle de Assinatura Services
// -------------------------------------------------------------

export async function fetchDocumentosCliente(
  clienteId?: string,
): Promise<import('@/types/crm').DocumentoCliente[]> {
  try {
    const filter = clienteId ? `cliente_id='${clienteId}'` : ''
    const records = await pb
      .collection('documentos_cliente')
      .getFullList<import('@/types/crm').DocumentoCliente>({
        filter: filter || undefined,
        sort: '-updated,-created',
        expand: 'cliente_id',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar documentos do cliente:', err)
    return []
  }
}

export async function upsertDocumentoCliente(data: {
  cliente_id: string
  tipo: import('@/types/crm').DocumentoClienteTipo
  status_assinatura: import('@/types/crm').DocumentoClienteStatusAssinatura
  data_envio?: string
  data_assinatura?: string
  canal_envio?: string
  telefone_envio?: string
  observacoes?: string
  autor?: string
  dados_documento?: Record<string, any> | null
}): Promise<import('@/types/crm').DocumentoCliente> {
  // Procura se já existe um registro deste tipo para este cliente
  try {
    const existing = await pb
      .collection('documentos_cliente')
      .getFirstListItem<import('@/types/crm').DocumentoCliente>(
        `cliente_id='${data.cliente_id}' && tipo='${data.tipo}'`,
      )
    if (existing) {
      const updated = await pb
        .collection('documentos_cliente')
        .update<import('@/types/crm').DocumentoCliente>(existing.id, data, {
          expand: 'cliente_id',
        })
      return updated
    }
  } catch {
    // Se não encontrou, prossegue para criar novo
  }

  const created = await pb
    .collection('documentos_cliente')
    .create<import('@/types/crm').DocumentoCliente>(data, {
      expand: 'cliente_id',
    })
  return created
}

export async function updateDocumentoClienteStatus(
  id: string,
  status_assinatura: import('@/types/crm').DocumentoClienteStatusAssinatura,
  data_assinatura?: string,
): Promise<import('@/types/crm').DocumentoCliente> {
  const payload: Partial<import('@/types/crm').DocumentoCliente> = {
    status_assinatura,
  }
  if (status_assinatura === 'assinado') {
    payload.data_assinatura = data_assinatura || new Date().toISOString()
  } else {
    payload.data_assinatura = ''
  }

  const updated = await pb
    .collection('documentos_cliente')
    .update<import('@/types/crm').DocumentoCliente>(id, payload, {
      expand: 'cliente_id',
    })
  return updated
}

export async function deleteDocumentoCliente(id: string): Promise<boolean> {
  await pb.collection('documentos_cliente').delete(id)
  return true
}

// -------------------------------------------------------------
// Tipos de Atividades Customizadas Services
// -------------------------------------------------------------

export async function fetchTiposAtividadesCustom(): Promise<
  import('@/types/crm').TipoAtividadeCustomItem[]
> {
  try {
    const records = await pb
      .collection('tipos_atividades_custom')
      .getFullList<import('@/types/crm').TipoAtividadeCustomItem>({
        sort: 'nome',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar tipos de atividades customizados:', err)
    return []
  }
}

export async function createTipoAtividadeCustom(data: {
  nome: string
  categoria: import('@/types/crm').AtividadeCategoriaId
  cor?: string
  icone?: string
  descricao?: string
  is_padrao?: boolean
  valor_base?: number
  valor_por_placa?: number
  frequencia_meses?: number
  tipo_execucao?: import('@/types/crm').CatalogoTipoExecucao
  orientacoes_tecnicas?: string
  links_uteis?: string
  checklist?: import('@/types/crm').TipoAtividadeChecklistItem[]
  ativo?: boolean
  documento_modelo?: File | null
}): Promise<import('@/types/crm').TipoAtividadeCustomItem> {
  if (data.documento_modelo) {
    const formData = new FormData()
    formData.append('nome', data.nome.trim())
    formData.append('categoria', data.categoria)
    formData.append('cor', data.cor || '')
    formData.append('icone', data.icone || '')
    formData.append('descricao', data.descricao || '')
    formData.append('is_padrao', String(Boolean(data.is_padrao)))
    formData.append('valor_base', String(data.valor_base ?? 0))
    if (data.valor_por_placa !== undefined) {
      formData.append('valor_por_placa', String(data.valor_por_placa ?? 0))
    }
    formData.append('frequencia_meses', String(data.frequencia_meses ?? 0))
    formData.append('tipo_execucao', data.tipo_execucao || 'equipe_interna')
    formData.append('orientacoes_tecnicas', data.orientacoes_tecnicas || '')
    formData.append('links_uteis', data.links_uteis || '')
    if (data.checklist) {
      formData.append('checklist', JSON.stringify(data.checklist))
    }
    formData.append('ativo', String(data.ativo ?? true))
    formData.append('documento_modelo', data.documento_modelo)

    const record = await pb
      .collection('tipos_atividades_custom')
      .create<import('@/types/crm').TipoAtividadeCustomItem>(formData)
    return record
  }

  const payload: Record<string, any> = {
    nome: data.nome.trim(),
    categoria: data.categoria,
    cor: data.cor || '',
    icone: data.icone || '',
    descricao: data.descricao || '',
    is_padrao: Boolean(data.is_padrao),
    valor_base: data.valor_base ?? 0,
    valor_por_placa: data.valor_por_placa ?? 0,
    frequencia_meses: data.frequencia_meses ?? 0,
    tipo_execucao: data.tipo_execucao || 'equipe_interna',
    orientacoes_tecnicas: data.orientacoes_tecnicas || '',
    links_uteis: data.links_uteis || '',
    ativo: data.ativo ?? true,
  }
  if (data.checklist !== undefined) {
    payload.checklist = data.checklist
  }

  const record = await pb
    .collection('tipos_atividades_custom')
    .create<import('@/types/crm').TipoAtividadeCustomItem>(payload)
  return record
}

export async function updateTipoAtividadeCustom(
  id: string,
  data: Partial<{
    nome: string
    categoria: import('@/types/crm').AtividadeCategoriaId
    cor: string
    icone: string
    descricao: string
    is_padrao: boolean
    valor_base: number
    valor_por_placa: number
    frequencia_meses: number
    tipo_execucao: import('@/types/crm').CatalogoTipoExecucao
    orientacoes_tecnicas: string
    links_uteis: string
    checklist: import('@/types/crm').TipoAtividadeChecklistItem[]
    ativo: boolean
    documento_modelo?: File | null
  }>,
): Promise<import('@/types/crm').TipoAtividadeCustomItem> {
  if (data.documento_modelo instanceof File) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null && key !== 'documento_modelo') {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      }
    })
    formData.append('documento_modelo', data.documento_modelo)
    const record = await pb
      .collection('tipos_atividades_custom')
      .update<import('@/types/crm').TipoAtividadeCustomItem>(id, formData)
    return record
  }

  const payload: Record<string, any> = { ...data }
  delete payload.documento_modelo
  if (data.checklist !== undefined) {
    payload.checklist = data.checklist
  }

  const record = await pb
    .collection('tipos_atividades_custom')
    .update<import('@/types/crm').TipoAtividadeCustomItem>(id, payload)
  return record
}

export async function deleteTipoAtividadeCustom(id: string): Promise<boolean> {
  await pb.collection('tipos_atividades_custom').delete(id)
  return true
}

// -------------------------------------------------------------
// Envio Manual de Notificação de OS via WhatsApp (Z-API)
// -------------------------------------------------------------

export interface EnviarNotificacaoOSManualResult {
  ok: boolean
  sent?: boolean
  gatewayConfigured?: boolean
  status?: string
  message: string
  code?: 'SEM_RESPONSAVEL' | 'SEM_TELEFONE' | 'USUARIO_NAO_ENCONTRADO' | string
  destinatario?: {
    nome: string
    telefone: string
  }
  data?: import('@/types/crm').WhatsAppMensagem
}

export async function enviarNotificacaoOSManual(
  osId: string,
  opcoes?: {
    mensagem_personalizada?: string
    telefone_destino?: string
  },
): Promise<EnviarNotificacaoOSManualResult> {
  return pb.send('/backend/v1/whatsapp/enviar-os', {
    method: 'POST',
    body: {
      os_id: osId,
      mensagem_personalizada: opcoes?.mensagem_personalizada,
      telefone_destino: opcoes?.telefone_destino,
    },
  })
}

// -------------------------------------------------------------
// Ordens de Serviço (OS) & Templates de Execução Services
// -------------------------------------------------------------

export async function fetchOSTemplates(): Promise<import('@/types/crm').OSTemplate[]> {
  try {
    const records = await pb
      .collection('os_templates')
      .getFullList<import('@/types/crm').OSTemplate>({
        sort: 'tipo_servico',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar templates de OS:', err)
    return []
  }
}

export async function saveOSTemplate(
  tipo_servico: import('@/types/crm').OSTipoServico,
  instrucoes: string,
): Promise<import('@/types/crm').OSTemplate> {
  try {
    const existing = await pb
      .collection('os_templates')
      .getFirstListItem<import('@/types/crm').OSTemplate>(`tipo_servico='${tipo_servico}'`)
    return await pb
      .collection('os_templates')
      .update<import('@/types/crm').OSTemplate>(existing.id, {
        instrucoes,
      })
  } catch (_) {
    return await pb.collection('os_templates').create<import('@/types/crm').OSTemplate>({
      tipo_servico,
      instrucoes,
    })
  }
}

export async function fetchOrdensServico(
  filterStatus?: import('@/types/crm').OSStatus,
  responsavelUsuarioId?: string,
): Promise<import('@/types/crm').OrdemServico[]> {
  try {
    const conditions: string[] = []
    if (filterStatus) {
      conditions.push(`status='${filterStatus}'`)
    }
    if (responsavelUsuarioId) {
      conditions.push(`responsavel_usuario_id='${responsavelUsuarioId}'`)
    }
    const filter = conditions.join(' && ')

    const records = await pb
      .collection('ordens_servico')
      .getFullList<import('@/types/crm').OrdemServico>({
        filter: filter || undefined,
        sort: 'data_agendada,-created',
        expand: 'cliente_id,usina_id,profissional_id,responsavel_usuario_id',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar ordens de serviço:', err)
    return []
  }
}

export async function fetchOrdemServicoById(
  id: string,
): Promise<import('@/types/crm').OrdemServico | null> {
  try {
    const record = await pb
      .collection('ordens_servico')
      .getOne<import('@/types/crm').OrdemServico>(id, {
        expand: 'cliente_id,usina_id,profissional_id,responsavel_usuario_id',
      })
    return record
  } catch (err) {
    // Se não encontrou na coleção ordens_servico, tentar na coleção atividades (Serviços de Campo suporta atividades de manutenção)
    try {
      const atv: any = await pb.collection('atividades').getOne(id, {
        expand: 'cliente_id,usina_id,responsavel_id,fornecedor_id',
      })
      if (atv) {
        const cli = atv.expand?.cliente_id
        const usina = atv.expand?.usina_id
        const resp = atv.expand?.responsavel_id
        const forn = atv.expand?.fornecedor_id

        const endereco = atv.endereco_uc || usina?.endereco || cli?.endereco || cli?.cidade || ''
        const atribuidaA =
          atv.responsavel_nome ||
          resp?.name ||
          atv.equipe_nome ||
          forn?.nome_empresa ||
          forn?.contato_nome ||
          atv.autor ||
          ''

        const instrucoesPartes = [atv.titulo, atv.descricao].filter(Boolean)
        const instrucoes = instrucoesPartes.length > 0 ? instrucoesPartes.join('\n\n') : undefined

        return {
          id: atv.id,
          collectionId: atv.collectionId || 'atividades',
          collectionName: atv.collectionName || 'atividades',
          cliente_id: atv.cliente_id,
          usina_id: atv.usina_id || undefined,
          tipo_servico: atv.titulo || 'Manutenção',
          endereco,
          data_agendada: atv.data || atv.created,
          status:
            atv.status === 'concluida'
              ? 'concluida'
              : atv.status === 'cancelada'
                ? 'cancelada'
                : 'pendente',
          atribuida_a: atribuidaA,
          responsavel_usuario_id: atv.responsavel_id || undefined,
          profissional_id: undefined,
          instrucoes,
          detalhes_execucao: atv.descricao || '',
          concluida_em: atv.status === 'concluida' ? atv.updated || atv.data : undefined,
          origem: 'atividades',
          created: atv.created,
          updated: atv.updated,
          expand: {
            cliente_id: cli,
            usina_id: usina,
            responsavel_usuario_id: resp,
          },
        } as import('@/types/crm').OrdemServico
      }
    } catch (_) {
      /* não encontrado em atividades também */
    }

    console.error('Erro ao obter ordem de serviço ou atividade de campo:', err)
    return null
  }
}

export async function createOrdemServico(data: {
  cliente_id: string
  usina_id?: string
  tipo_servico: import('@/types/crm').OSTipoServico
  endereco?: string
  data_agendada: string
  status?: import('@/types/crm').OSStatus
  atribuida_a?: string
  responsavel_usuario_id?: string
  profissional_id?: string
  instrucoes?: string
  checklist?: import('@/types/crm').OSChecklistItem[]
  detalhes_execucao?: string
}): Promise<import('@/types/crm').OrdemServico> {
  const payload = {
    ...data,
    status: data.status || 'pendente',
    checklist: data.checklist || [],
    detalhes_execucao: data.detalhes_execucao || '',
  }
  const record = await pb
    .collection('ordens_servico')
    .create<import('@/types/crm').OrdemServico>(payload, {
      expand: 'cliente_id,usina_id,profissional_id,responsavel_usuario_id',
    })
  return record
}

/**
 * Helper para atualizar registro na coleção `atividades` mapeando os campos de execução de campo
 * e retornando a projeção em formato OrdemServico compatível com a UI.
 */
async function updateAtividadeComoOrdemServico(
  id: string,
  data: Partial<import('@/types/crm').OrdemServico>,
  newPhotos?: File[],
  relatorioPdfFile?: File,
): Promise<import('@/types/crm').OrdemServico> {
  const payloadAtividade: Record<string, unknown> = {}

  // Mapear status: OSStatus ('pendente' | 'concluida' | 'cancelada') para select de atividades
  if (data.status) {
    payloadAtividade.status =
      data.status === 'concluida'
        ? 'concluida'
        : data.status === 'cancelada'
          ? 'cancelada'
          : 'em_execucao'
  }

  // Descrição / detalhes de execução: anexa ou atualiza
  if (data.detalhes_execucao !== undefined) {
    payloadAtividade.descricao = data.detalhes_execucao
  }

  // Responsável
  if (data.responsavel_usuario_id !== undefined) {
    payloadAtividade.responsavel_id = data.responsavel_usuario_id || null
  }
  if (data.atribuida_a !== undefined) {
    payloadAtividade.responsavel_nome = data.atribuida_a || ''
  }

  // Horários e Duração de manutenção
  if (data.horario_inicio !== undefined) {
    payloadAtividade.horario_inicio = data.horario_inicio || ''
  }
  if (data.horario_fim !== undefined) {
    payloadAtividade.horario_fim = data.horario_fim || ''
  }
  if (data.duracao_minutos !== undefined || (data as any).tempo_previsto_minutos !== undefined) {
    const dur =
      typeof data.duracao_minutos === 'number'
        ? data.duracao_minutos
        : typeof (data as any).tempo_previsto_minutos === 'number'
          ? (data as any).tempo_previsto_minutos
          : 0
    payloadAtividade.duracao_minutos = dur
  }
  if (data.data_agendada) {
    payloadAtividade.data = data.data_agendada
  }

  // Arquivo de cronograma ou medidor se vier arquivo
  const fileToUpload = relatorioPdfFile || (newPhotos && newPhotos[0])
  let atvRecord: any
  if (fileToUpload) {
    const formData = new FormData()
    Object.entries(payloadAtividade).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        if (typeof v === 'object') formData.append(k, JSON.stringify(v))
        else formData.append(k, String(v))
      }
    })
    if (relatorioPdfFile) {
      formData.append('cronograma_arquivo', relatorioPdfFile)
    } else if (newPhotos && newPhotos[0]) {
      formData.append('foto_medidor', newPhotos[0])
    }
    atvRecord = await pb.collection('atividades').update(id, formData, {
      expand: 'cliente_id,usina_id,responsavel_id,fornecedor_id',
    })
  } else {
    atvRecord = await pb.collection('atividades').update(id, payloadAtividade, {
      expand: 'cliente_id,usina_id,responsavel_id,fornecedor_id',
    })
  }

  const cli = atvRecord.expand?.cliente_id
  const usina = atvRecord.expand?.usina_id
  const resp = atvRecord.expand?.responsavel_id
  const forn = atvRecord.expand?.fornecedor_id
  const endereco = atvRecord.endereco_uc || usina?.endereco || cli?.endereco || cli?.cidade || ''
  const atribuidaA =
    atvRecord.responsavel_nome ||
    resp?.name ||
    atvRecord.equipe_nome ||
    forn?.nome_empresa ||
    atvRecord.autor ||
    data.atribuida_a ||
    ''

  const instrucoesPartes = [atvRecord.titulo, atvRecord.descricao].filter(Boolean)
  const instrucoes =
    data.instrucoes !== undefined
      ? data.instrucoes
      : instrucoesPartes.length > 0
        ? instrucoesPartes.join('\n\n')
        : undefined

  const osStatus: import('@/types/crm').OSStatus =
    atvRecord.status === 'concluida'
      ? 'concluida'
      : atvRecord.status === 'cancelada'
        ? 'cancelada'
        : 'pendente'

  // Normalização do tipo_servico para não sobrescrever o tipo real com "Limpeza"
  let tipoServicoResolvido: string = data.tipo_servico || ''
  if (!tipoServicoResolvido) {
    const rawTitulo = (atvRecord.titulo || '').trim()
    if (rawTitulo === 'Limpeza e Manutenção') {
      const desc = (atvRecord.descricao || '').toLowerCase()
      if (desc.includes('corretiva')) {
        tipoServicoResolvido = 'Manutenção Corretiva'
      } else if (desc.includes('preventiva')) {
        tipoServicoResolvido = 'Manutenção Preventiva'
      } else if (
        desc.includes('lavagem') &&
        !desc.includes('reaperto') &&
        !desc.includes('preventiva')
      ) {
        tipoServicoResolvido = 'Limpeza'
      } else {
        tipoServicoResolvido = 'Manutenção'
      }
    } else if (rawTitulo) {
      tipoServicoResolvido = rawTitulo
    } else {
      switch (atvRecord.tipo) {
        case 'limpeza_manutencao':
          tipoServicoResolvido = 'Limpeza dos Módulos'
          break
        case 'instalacao':
          tipoServicoResolvido = 'Instalação'
          break
        case 'visita_tecnica':
          tipoServicoResolvido = 'Manutenção'
          break
        case 'garantia_equipamento':
          tipoServicoResolvido = 'Garantia'
          break
        case 'configuracao_datalogger':
          tipoServicoResolvido = 'Configuração de Datalogger'
          break
        default:
          tipoServicoResolvido = 'Manutenção'
      }
    }
  }

  // Previne que "Limpeza e Manutenção" reverta para visual azul de Limpeza no refetch
  if (tipoServicoResolvido === 'Limpeza e Manutenção') {
    tipoServicoResolvido = 'Manutenção'
  }

  return {
    id: atvRecord.id,
    collectionId: atvRecord.collectionId || 'atividades',
    collectionName: atvRecord.collectionName || 'atividades',
    cliente_id: atvRecord.cliente_id,
    usina_id: atvRecord.usina_id || undefined,
    tipo_servico: tipoServicoResolvido || 'Manutenção',
    horario_inicio:
      atvRecord.horario_inicio ||
      (atvRecord.data && atvRecord.data.length >= 16
        ? atvRecord.data.replace(' ', 'T').slice(11, 16)
        : undefined),
    horario_fim: atvRecord.horario_fim || undefined,
    duracao_minutos:
      typeof atvRecord.duracao_minutos === 'number'
        ? atvRecord.duracao_minutos
        : (data.duracao_minutos ?? (data as any).tempo_previsto_minutos ?? undefined),
    endereco,
    data_agendada: atvRecord.data || atvRecord.created,
    status: osStatus,
    atribuida_a: atribuidaA,
    responsavel_usuario_id: atvRecord.responsavel_id || undefined,
    profissional_id: undefined,
    instrucoes,
    checklist: data.checklist,
    detalhes_execucao: atvRecord.descricao || data.detalhes_execucao || '',
    concluida_em: osStatus === 'concluida' ? atvRecord.updated || atvRecord.data : undefined,
    origem: 'atividades',
    created: atvRecord.created,
    updated: atvRecord.updated,
    expand: {
      cliente_id: cli,
      usina_id: usina,
      responsavel_usuario_id: resp,
    },
  } as import('@/types/crm').OrdemServico
}

export async function updateOrdemServico(
  id: string,
  data: Partial<import('@/types/crm').OrdemServico>,
  newPhotos?: File[],
  relatorioPdfFile?: File,
): Promise<import('@/types/crm').OrdemServico> {
  // Se o objeto explicitamente indicar origem 'atividades', direcionar diretamente
  if (data.origem === 'atividades') {
    return await updateAtividadeComoOrdemServico(id, data, newPhotos, relatorioPdfFile)
  }

  const hasFiles = (newPhotos && newPhotos.length > 0) || Boolean(relatorioPdfFile)

  try {
    if (hasFiles) {
      const formData = new FormData()
      Object.entries(data).forEach(([key, val]) => {
        if (
          val !== undefined &&
          val !== null &&
          key !== 'fotos' &&
          key !== 'relatorio_pdf' &&
          key !== 'origem'
        ) {
          if (typeof val === 'object') {
            formData.append(key, JSON.stringify(val))
          } else {
            formData.append(key, String(val))
          }
        }
      })
      if (newPhotos) {
        for (const file of newPhotos) {
          formData.append('fotos', file)
        }
      }
      if (relatorioPdfFile) {
        formData.append('relatorio_pdf', relatorioPdfFile)
      }
      const record = await pb
        .collection('ordens_servico')
        .update<import('@/types/crm').OrdemServico>(id, formData, {
          expand: 'cliente_id,usina_id,profissional_id,responsavel_usuario_id',
        })
      return record
    }

    const payloadSemOrigem = { ...data }
    delete (payloadSemOrigem as Record<string, unknown>).origem

    const record = await pb
      .collection('ordens_servico')
      .update<import('@/types/crm').OrdemServico>(id, payloadSemOrigem, {
        expand: 'cliente_id,usina_id,profissional_id,responsavel_usuario_id',
      })
    return record
  } catch (err: any) {
    // Se recebeu 404 (recurso não encontrado em ordens_servico), tentar na coleção atividades (fallback defensivo)
    const is404 =
      err?.status === 404 ||
      err?.statusCode === 404 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes("wasn't found"))

    if (is404) {
      try {
        return await updateAtividadeComoOrdemServico(id, data, newPhotos, relatorioPdfFile)
      } catch (errAtividade) {
        console.error('Falha ao atualizar em atividades após 404 em ordens_servico:', errAtividade)
      }
    }

    throw err
  }
}

/**
 * Salva o arquivo PDF do relatório na ordem de serviço existente
 */
export async function salvarRelatorioPdfOrdemServico(
  id: string,
  pdfFile: File,
): Promise<import('@/types/crm').OrdemServico> {
  try {
    const formData = new FormData()
    formData.append('relatorio_pdf', pdfFile)
    return await pb
      .collection('ordens_servico')
      .update<import('@/types/crm').OrdemServico>(id, formData, {
        expand: 'cliente_id,usina_id,profissional_id,responsavel_usuario_id',
      })
  } catch (err: any) {
    const is404 =
      err?.status === 404 ||
      err?.statusCode === 404 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes("wasn't found"))
    if (is404) {
      return await updateAtividadeComoOrdemServico(id, {}, undefined, pdfFile)
    }
    throw err
  }
}

export async function deleteOrdemServico(id: string): Promise<boolean> {
  try {
    await pb.collection('ordens_servico').delete(id)
    return true
  } catch (err: any) {
    const is404 =
      err?.status === 404 ||
      err?.statusCode === 404 ||
      (typeof err?.message === 'string' && err.message.toLowerCase().includes("wasn't found"))
    if (is404) {
      await pb.collection('atividades').delete(id)
      return true
    }
    throw err
  }
}

export async function finalizarOrdemServico(
  id: string,
  dadosFinalizacao: {
    checklist?: import('@/types/crm').OSChecklistItem[]
    detalhes_execucao: string
    newPhotos?: File[]
    relatorioPdfFile?: File
    cliente_id?: string
    tipo_servico?: string
    tecnico_nome?: string
    origem?: string
  },
): Promise<import('@/types/crm').OrdemServico> {
  const concluida_em = new Date().toISOString()
  const payload: Partial<import('@/types/crm').OrdemServico> = {
    status: 'concluida',
    concluida_em,
    detalhes_execucao: dadosFinalizacao.detalhes_execucao,
  }
  if (dadosFinalizacao.checklist) {
    payload.checklist = dadosFinalizacao.checklist
  }
  if (dadosFinalizacao.origem) {
    payload.origem = dadosFinalizacao.origem
  }

  const updatedOS = await updateOrdemServico(
    id,
    payload,
    dadosFinalizacao.newPhotos,
    dadosFinalizacao.relatorioPdfFile,
  )

  // Registrar atividade na timeline/histórico do cliente se for OS original
  // (se já for da coleção atividades, o próprio registro da atividade já foi marcado como concluído)
  if (dadosFinalizacao.cliente_id && updatedOS.origem !== 'atividades') {
    try {
      const tipoAtividade =
        dadosFinalizacao.tipo_servico === 'Instalação'
          ? 'instalacao'
          : dadosFinalizacao.tipo_servico === 'Configuração de Datalogger'
            ? 'configuracao_datalogger'
            : dadosFinalizacao.tipo_servico === 'Garantia'
              ? 'garantia_equipamento'
              : 'limpeza'

      await createAtividade({
        cliente_id: dadosFinalizacao.cliente_id,
        tipo: tipoAtividade,
        titulo: `OS Finalizada: ${dadosFinalizacao.tipo_servico || 'Serviço em Campo'}`,
        descricao:
          `Ordem de Serviço #${id} finalizada com sucesso.\n` +
          `Técnico / Instalador: ${dadosFinalizacao.tecnico_nome || updatedOS.atribuida_a || 'Instalador em campo'}\n` +
          `Observações e detalhes técnicos:\n${dadosFinalizacao.detalhes_execucao || 'Nenhum detalhe adicional informado.'}`,
        status: 'concluida',
        data: concluida_em,
        autor: dadosFinalizacao.tecnico_nome || updatedOS.atribuida_a || 'Instalador Campo',
      })
    } catch (ativErr) {
      console.warn('Não foi possível registrar atividade de conclusão da OS:', ativErr)
    }
  }

  return updatedOS
}

// -------------------------------------------------------------
// Monitoramento & Padrões por Marca de Inversor
// -------------------------------------------------------------

export async function fetchMonitoramentoMarcas(): Promise<
  import('@/types/crm').MonitoramentoMarca[]
> {
  try {
    const records = await pb
      .collection('monitoramento_marcas')
      .getFullList<import('@/types/crm').MonitoramentoMarca>({
        sort: 'marca',
        requestKey: null,
      })
    return records
  } catch (err) {
    console.warn('Erro ao consultar monitoramento_marcas:', err)
    return []
  }
}

export async function fetchMonitoramentoMarcaByNome(
  marcaNome: string,
): Promise<import('@/types/crm').MonitoramentoMarca | null> {
  if (!marcaNome || !marcaNome.trim()) return null
  const trimmed = marcaNome.trim()
  try {
    const list = await pb
      .collection('monitoramento_marcas')
      .getFullList<import('@/types/crm').MonitoramentoMarca>({
        filter: `marca ~ '${trimmed}' || marca = '${trimmed}'`,
        limit: 1,
      })
    if (list.length > 0) return list[0]
  } catch (err) {
    console.warn(`Erro ao buscar monitoramento_marcas para marca "${marcaNome}":`, err)
  }
  return null
}

export async function saveOrUpdateMonitoramentoMarca(data: {
  marca: string
  app_nome?: string
  login_padrao?: string
  senha_padrao?: string
  datalogger_url?: string
  instrucoes?: string
}): Promise<import('@/types/crm').MonitoramentoMarca> {
  const marcaKey = data.marca.trim()
  let existing: import('@/types/crm').MonitoramentoMarca | null = null

  try {
    const records = await pb
      .collection('monitoramento_marcas')
      .getFullList<import('@/types/crm').MonitoramentoMarca>({
        filter: `marca ~ '${marcaKey}'`,
      })
    existing =
      records.find((r) => r.marca.trim().toLowerCase() === marcaKey.toLowerCase()) ||
      records[0] ||
      null
  } catch (_) {
    existing = null
  }

  const payload = {
    marca: marcaKey,
    app_nome: data.app_nome ?? '',
    login_padrao: data.login_padrao ?? '',
    senha_padrao: data.senha_padrao ?? '',
    datalogger_url: data.datalogger_url ?? '',
    instrucoes: data.instrucoes ?? '',
  }

  if (existing) {
    const updated = await pb
      .collection('monitoramento_marcas')
      .update<import('@/types/crm').MonitoramentoMarca>(existing.id, payload)
    return updated
  } else {
    const created = await pb
      .collection('monitoramento_marcas')
      .create<import('@/types/crm').MonitoramentoMarca>(payload)
    return created
  }
}

// -------------------------------------------------------------
// Helpers para Links e Acesso Solarview
// -------------------------------------------------------------

// -------------------------------------------------------------
// Inversores do Cliente (Múltiplos Inversores & Monitoramento)
// -------------------------------------------------------------

export async function fetchAllInversores(): Promise<import('@/types/crm').ClienteInversor[]> {
  try {
    const list = await pb
      .collection('cliente_inversores')
      .getFullList<import('@/types/crm').ClienteInversor>({
        sort: 'cliente_id,ordem,created',
        requestKey: null,
      })
    return list
  } catch (err) {
    console.warn('Erro ao buscar todos cliente_inversores:', err)
    return []
  }
}

export async function fetchInversoresByClienteId(
  clienteId: string,
): Promise<import('@/types/crm').ClienteInversor[]> {
  if (!clienteId) return []
  try {
    const list = await pb
      .collection('cliente_inversores')
      .getFullList<import('@/types/crm').ClienteInversor>({
        filter: `cliente_id = '${clienteId}'`,
        sort: 'ordem,created',
        requestKey: null,
      })
    return list
  } catch (err) {
    console.warn(`Erro ao buscar cliente_inversores do cliente ${clienteId}:`, err)
    return []
  }
}

export async function createClienteInversor(
  data: Partial<import('@/types/crm').ClienteInversor> & { cliente_id: string },
): Promise<import('@/types/crm').ClienteInversor> {
  const created = await pb
    .collection('cliente_inversores')
    .create<import('@/types/crm').ClienteInversor>(data)
  return created
}

export async function updateClienteInversor(
  id: string,
  data: Partial<import('@/types/crm').ClienteInversor>,
): Promise<import('@/types/crm').ClienteInversor> {
  const updated = await pb
    .collection('cliente_inversores')
    .update<import('@/types/crm').ClienteInversor>(id, data)
  return updated
}

export async function deleteClienteInversor(id: string): Promise<boolean> {
  try {
    await pb.collection('cliente_inversores').delete(id)
    return true
  } catch (err) {
    console.error(`Erro ao excluir inversor ${id}:`, err)
    throw err
  }
}

// -------------------------------------------------------------
// Usinas do Cliente (Múltiplas Usinas e Contratos O&M Vinculados)
// -------------------------------------------------------------

export async function fetchAllUsinas(): Promise<import('@/types/crm').UsinaCliente[]> {
  try {
    const list = await pb.collection('usinas').getFullList<import('@/types/crm').UsinaCliente>({
      sort: 'cliente_id,created',
      expand: 'contrato_id',
      requestKey: null,
    })
    return list
  } catch (err) {
    console.warn('Erro ao buscar todas as usinas:', err)
    return []
  }
}

export async function fetchUsinaById(
  id: string,
): Promise<import('@/types/crm').UsinaCliente | null> {
  if (!id) return null
  try {
    const usina = await pb.collection('usinas').getOne<import('@/types/crm').UsinaCliente>(id, {
      expand: 'contrato_id,cliente_id',
      requestKey: null,
    })
    return usina
  } catch (err) {
    console.warn(`Erro ao buscar usina por id ${id}:`, err)
    return null
  }
}

export async function fetchUsinasByClienteId(
  clienteId: string,
): Promise<import('@/types/crm').UsinaCliente[]> {
  if (!clienteId) return []
  try {
    const list = await pb.collection('usinas').getFullList<import('@/types/crm').UsinaCliente>({
      filter: `cliente_id = '${clienteId}'`,
      sort: 'created',
      expand: 'contrato_id',
      requestKey: null,
    })
    return list
  } catch (err) {
    console.warn(`Erro ao buscar usinas do cliente ${clienteId}:`, err)
    return []
  }
}

export async function sincronizarUsinaComCliente(
  clienteId: string,
  dadosUsina: {
    cidade?: string | null
    latitude?: number | string | null
    longitude?: number | string | null
    usina_endereco?: string | null
    endereco?: string | null
  },
  opcoes?: {
    isUsinaPrincipal?: boolean
    forcar?: boolean
  },
): Promise<Cliente | null> {
  if (!clienteId) return null
  try {
    const clienteAtual = await pb.collection('clientes').getOne<Cliente>(clienteId, {
      requestKey: null,
    })

    const payload: Partial<Cliente> = {}
    const isPrincipal = Boolean(opcoes?.isUsinaPrincipal || opcoes?.forcar)

    // Sincronizar cidade se cliente não tiver ou for a usina principal
    const cidadeNova = dadosUsina.cidade ? String(dadosUsina.cidade).trim() : ''
    if (cidadeNova && (!clienteAtual.cidade || isPrincipal)) {
      payload.cidade = cidadeNova
    }

    // Sincronizar usina_endereco se cliente não tiver ou for a usina principal
    const enderecoNovo = (dadosUsina.usina_endereco || dadosUsina.endereco || '').trim()
    if (enderecoNovo && (!clienteAtual.usina_endereco || isPrincipal)) {
      payload.usina_endereco = enderecoNovo
      if (!clienteAtual.endereco) {
        payload.endereco = enderecoNovo
      }
    }

    // Sincronizar latitude e longitude
    const latNum =
      dadosUsina.latitude !== undefined &&
      dadosUsina.latitude !== null &&
      dadosUsina.latitude !== ''
        ? Number(dadosUsina.latitude)
        : NaN
    const lngNum =
      dadosUsina.longitude !== undefined &&
      dadosUsina.longitude !== null &&
      dadosUsina.longitude !== ''
        ? Number(dadosUsina.longitude)
        : NaN

    if (!isNaN(latNum) && latNum !== 0) {
      const cliLat =
        clienteAtual.latitude !== undefined && clienteAtual.latitude !== null
          ? Number(clienteAtual.latitude)
          : NaN
      if (isNaN(cliLat) || cliLat === 0 || isPrincipal) {
        payload.latitude = latNum
      }
    }

    if (!isNaN(lngNum) && lngNum !== 0) {
      const cliLng =
        clienteAtual.longitude !== undefined && clienteAtual.longitude !== null
          ? Number(clienteAtual.longitude)
          : NaN
      if (isNaN(cliLng) || cliLng === 0 || isPrincipal) {
        payload.longitude = lngNum
      }
    }

    if (Object.keys(payload).length > 0) {
      const updated = await pb.collection('clientes').update<Cliente>(clienteId, payload, {
        requestKey: null,
      })
      return updated
    }
    return clienteAtual
  } catch (err) {
    console.warn(
      `[sincronizarUsinaComCliente] Falha não bloqueante ao sincronizar cliente ${clienteId}:`,
      err,
    )
    return null
  }
}

export async function createUsina(
  data: Partial<import('@/types/crm').UsinaCliente> & { cliente_id: string; nome: string },
): Promise<import('@/types/crm').UsinaCliente> {
  const created = await pb.collection('usinas').create<import('@/types/crm').UsinaCliente>(data, {
    expand: 'contrato_id',
  })

  // Sincronização automática usina -> ficha do cliente (aditivo)
  if (created.cliente_id) {
    try {
      const outrasUsinas = await fetchUsinasByClienteId(created.cliente_id)
      const isPrimeiraUsina = outrasUsinas.length <= 1
      await sincronizarUsinaComCliente(
        created.cliente_id,
        {
          cidade: created.cidade,
          latitude: created.latitude,
          longitude: created.longitude,
          usina_endereco: created.endereco,
          endereco: created.endereco,
        },
        { isUsinaPrincipal: isPrimeiraUsina },
      )
    } catch (syncErr) {
      console.warn('Erro na sincronização pós createUsina:', syncErr)
    }
  }

  return created
}

export async function updateUsina(
  id: string,
  data: Partial<import('@/types/crm').UsinaCliente>,
): Promise<import('@/types/crm').UsinaCliente> {
  const updated = await pb
    .collection('usinas')
    .update<import('@/types/crm').UsinaCliente>(id, data, {
      expand: 'contrato_id',
    })

  // Sincronização automática usina -> ficha do cliente quando endereço/coordenadas/cidade forem alterados
  if (
    updated.cliente_id &&
    (data.cidade !== undefined ||
      data.latitude !== undefined ||
      data.longitude !== undefined ||
      data.endereco !== undefined)
  ) {
    try {
      const todas = await fetchUsinasByClienteId(updated.cliente_id)
      const isPrincipal = todas.length === 0 || todas[0].id === updated.id
      await sincronizarUsinaComCliente(
        updated.cliente_id,
        {
          cidade: updated.cidade,
          latitude: updated.latitude,
          longitude: updated.longitude,
          usina_endereco: updated.endereco,
          endereco: updated.endereco,
        },
        { isUsinaPrincipal: isPrincipal },
      )
    } catch (syncErr) {
      console.warn('Erro na sincronização pós updateUsina:', syncErr)
    }
  }

  return updated
}

export async function deleteUsina(id: string): Promise<boolean> {
  try {
    await pb.collection('usinas').delete(id)
    return true
  } catch (err) {
    console.error(`Erro ao excluir usina ${id}:`, err)
    throw err
  }
}

export {
  fetchNegociosByClienteId,
  fetchAllNegocios,
  getNegocioById,
  createNegocio,
  updateNegocio,
  deleteNegocio,
  executarVarreduraELimpezaNegocios,
  ETAPAS_FUNIL_EM_ANDAMENTO,
  isNegocioDentroDoFunil,
  filtrarNegociosDentroDoFunil,
  reativarClienteAoCriarNegocio,
} from './negociosService'

export const DEFAULT_SOLARVIEW_CONFIG = {
  nome: 'Solarview',
  link_ios: 'https://apps.apple.com/br/app/solarview/id1453416568',
  link_android: 'https://play.google.com/store/apps/details?id=com.solarview.smartview',
  link_texto:
    'Baixe o app Solarview para acompanhar a geração do seu sistema em tempo real na palma da mão!',
}

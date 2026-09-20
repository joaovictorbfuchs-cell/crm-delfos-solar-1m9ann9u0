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
    requestKey: null,
  })
  return records
}

export async function fetchSistemas(): Promise<Sistema[]> {
  const records = await pb.collection('sistemas').getFullList<Sistema>({
    sort: '-created',
    requestKey: null,
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
    requestKey: null,
  })
  return records
}

export async function fetchAtividades(): Promise<Atividade[]> {
  const records = await pb.collection('atividades').getFullList<Atividade>({
    sort: '-data',
    expand: 'cliente_id,responsavel_id,usina_id',
    requestKey: null,
  })
  return records
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
}): Promise<Atividade> {
  const payload = {
    ...data,
    descricao: data.descricao || '',
    status: data.status || 'pendente',
    data: data.data || new Date().toISOString(),
    autor: data.autor || 'João Delfos',
  }
  const record = await pb.collection('atividades').create<Atividade>(payload, {
    expand: 'cliente_id,responsavel_id,usina_id',
  })
  return record
}

export async function updateAtividade(id: string, data: Partial<Atividade>): Promise<Atividade> {
  const record = await pb.collection('atividades').update<Atividade>(id, data, {
    expand: 'cliente_id,responsavel_id,usina_id',
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

export interface MarcarGanhoDados {
  valor_final?: number
  condicao_pagamento?: string
  data_instalacao?: string
  observacoes?: string
  contratou_om?: boolean
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

export async function marcarClienteComoGanho(
  clienteId: string,
  areaDestinoOuDados?: 'projetos' | 'om' | MarcarGanhoDados,
  dadosExtras?: MarcarGanhoDados,
): Promise<Cliente> {
  const agora = new Date().toISOString()

  let areaDestino: 'projetos' | 'om' = 'projetos'
  let dados: MarcarGanhoDados = {}

  if (typeof areaDestinoOuDados === 'string') {
    areaDestino = areaDestinoOuDados
    dados = dadosExtras || {}
  } else if (areaDestinoOuDados && typeof areaDestinoOuDados === 'object') {
    dados = areaDestinoOuDados
    areaDestino = dados.contratou_om ? 'om' : 'projetos'
  }

  const contratouOM = Boolean(dados.contratou_om || areaDestino === 'om')

  const payloadUpdate: Partial<Cliente> = {
    status: 'Fechado',
    data_fechamento: agora,
    area_destino: contratouOM ? 'om' : 'projetos',
  }

  if (contratouOM) {
    // Mover para Monitoramento / O&M: status_pos_vendas ativo, não transferido_pos_vendas (não vai para Clientes Pós-Vendas)
    payloadUpdate.status_pos_vendas = 'Ativo'
    payloadUpdate.transferido_pos_vendas = false
    payloadUpdate.contratou_om = true
  } else {
    // Senão: transferido_pos_vendas = true (vai para Clientes Pós-Vendas)
    payloadUpdate.transferido_pos_vendas = true
    payloadUpdate.data_transferencia_pos_vendas = agora
    payloadUpdate.origem_pos_vendas = 'funil_comercial'
    payloadUpdate.contratou_om = false
  }

  if (dados.valor_final !== undefined) {
    payloadUpdate.valor_final = dados.valor_final
    payloadUpdate.valor_estimado = dados.valor_final
  }

  if (dados.condicao_pagamento) {
    payloadUpdate.condicao_pagamento = dados.condicao_pagamento
  }

  if (dados.data_instalacao) {
    payloadUpdate.data_instalacao = dados.data_instalacao
  }

  if (dados.observacoes && dados.observacoes.trim()) {
    payloadUpdate.observacoes = dados.observacoes.trim()
  }

  const clienteAtualizado = await updateCliente(clienteId, payloadUpdate)

  // Se contratou plano O&M, garantir contrato O&M ativo vinculado
  if (contratouOM) {
    try {
      const contratos = await fetchContratosOM()
      const contratoExistente = contratos.find(
        (c) => c.cliente_id === clienteId && c.status === 'Ativo',
      )
      if (!contratoExistente) {
        const dataInicio = agora
        const dataVenc = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        const proximaAtiv = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        await createContratoOM({
          cliente_id: clienteId,
          plano: 'Essencial',
          status: 'Ativo',
          status_encerramento: 'vigente',
          valor_mensal: 99.9,
          valor_anual: 1198.8,
          data_inicio: dataInicio,
          data_vencimento: dataVenc,
          proxima_atividade_data: proximaAtiv,
          proxima_atividade_titulo: 'Inspeção preventiva semestral',
          observacoes: 'Contrato O&M ativo criado na confirmação de fechamento do negócio.',
          servicos_agendados: ['Monitoramento contínuo', 'Inspeção preventiva semestral'],
          servicos_realizados: ['Venda concretizada com plano O&M'],
        })
      }
    } catch (omErr) {
      console.warn('Erro ao criar contrato O&M na conversão:', omErr)
    }
  } else {
    // Área de Projetos / Pós-Vendas: garantir projeto de engenharia se não existir
    try {
      const existing = await fetchProjetoByClienteId(clienteId)
      if (!existing) {
        await createProjeto({
          cliente_id: clienteId,
          etapa: 'Levantamento de Informações',
          potencia_kwp: clienteAtualizado.potencia_kwp || 0,
          cidade: clienteAtualizado.cidade || '',
          observacoes:
            'Negócio ganho no funil comercial enviado para Projetos (energia solar fotovoltaica).',
        })
      }
    } catch (projErr) {
      console.warn('Erro ao criar/verificar projeto para cliente ganho:', projErr)
    }
  }

  // Registrar na timeline de atividades
  try {
    const valorFmt = dados.valor_final
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          dados.valor_final,
        )
      : clienteAtualizado.valor_estimado
        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            clienteAtualizado.valor_estimado,
          )
        : ''

    const detalheDestino = contratouOM
      ? 'Destino: Monitoramento & O&M (Contrato Ativo)'
      : 'Destino: Clientes Pós-Vendas (Levantamento / Homologação)'

    const condFmt = dados.condicao_pagamento ? ` • Condição: ${dados.condicao_pagamento}` : ''
    const dataInstFmt = dados.data_instalacao
      ? ` • Previsão Instalação: ${new Date(dados.data_instalacao).toLocaleDateString('pt-BR')}`
      : ''
    const obsFmt = dados.observacoes ? ` • Obs: ${dados.observacoes}` : ''

    await createAtividade({
      cliente_id: clienteId,
      tipo: 'mudanca_estagio',
      titulo: 'Negócio Ganho • Fechamento Comercial',
      descricao: `Negócio fechado com sucesso.${valorFmt ? ` Valor final: ${valorFmt}.` : ''} ${detalheDestino}${condFmt}${dataInstFmt}${obsFmt}.`,
      data: agora,
      status: 'concluida',
      autor: 'CRM Delfos Solar',
      responsavel_nome: 'CRM Delfos Solar',
    })
  } catch (ativErr) {
    console.warn('Erro ao registrar atividade de ganho:', ativErr)
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

export async function bulkTransferirFechadosParaPosVendas(
  fechados: { id: string; data_fechamento?: string }[],
): Promise<Cliente[]> {
  const agora = new Date().toISOString()
  const promises = fechados.map((item) =>
    updateCliente(item.id, {
      transferido_pos_vendas: true,
      data_transferencia_pos_vendas: agora,
      origem_pos_vendas: 'funil_comercial',
      data_fechamento: item.data_fechamento || agora,
    }),
  )
  return Promise.all(promises)
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

export interface MesclagemOpcoes {
  clienteMestreId: string
  clienteSecundarioId: string
  camposSobrescritos: Partial<Cliente>
}

/**
 * Mescla com segurança o clienteSecundario no clienteMestre:
 * 1. Reatribui todas as relações (atividades, propostas, orçamentos, contratos O&M, manutenções,
 *    conversas WhatsApp, mensagens, projetos, usinas, inversores, etc.) do cliente secundário para o mestre.
 * 2. Atualiza o cadastro do cliente mestre com os campos selecionados e funde observações/histórico.
 * 3. Registra atividade no histórico do cliente mestre informando sobre a fusão.
 * 4. Exclui o cliente secundário com segurança após a reatribuição.
 */
export async function mesclarClientes({
  clienteMestreId,
  clienteSecundarioId,
  camposSobrescritos,
}: MesclagemOpcoes): Promise<Cliente> {
  if (clienteMestreId === clienteSecundarioId) {
    throw new Error('Não é possível mesclar um cliente nele mesmo.')
  }

  // 1. Reatribuir coleções que usam `cliente_id`
  const collectionsComClienteId = [
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
  ]

  for (const col of collectionsComClienteId) {
    try {
      const records = await pb.collection(col).getFullList({
        filter: `cliente_id = '${clienteSecundarioId}'`,
        fields: 'id',
      })
      for (const rec of records) {
        try {
          await pb.collection(col).update(rec.id, { cliente_id: clienteMestreId })
        } catch (err) {
          console.warn(`Falha ao reatribuir ${col} ${rec.id} para cliente ${clienteMestreId}:`, err)
        }
      }
    } catch (err) {
      console.warn(`Erro ao consultar ${col} para reatribuição na mesclagem:`, err)
    }
  }

  // 2. Reatribuir contatos_adicionais (campo se chama `cliente`)
  try {
    const contatos = await pb.collection('contatos_adicionais').getFullList({
      filter: `cliente = '${clienteSecundarioId}'`,
      fields: 'id',
    })
    for (const c of contatos) {
      try {
        await pb.collection('contatos_adicionais').update(c.id, { cliente: clienteMestreId })
      } catch (err) {
        console.warn(`Falha ao reatribuir contato_adicional ${c.id}:`, err)
      }
    }
  } catch (err) {
    console.warn('Erro ao reatribuir contatos_adicionais na mesclagem:', err)
  }

  // 3. Reatribuir transferencias_creditos (origem ou destino)
  try {
    const transfOrigem = await pb.collection('transferencias_creditos').getFullList({
      filter: `cliente_origem_id = '${clienteSecundarioId}'`,
      fields: 'id',
    })
    for (const t of transfOrigem) {
      try {
        await pb
          .collection('transferencias_creditos')
          .update(t.id, { cliente_origem_id: clienteMestreId })
      } catch {
        /* ignore */
      }
    }

    const transfDestino = await pb.collection('transferencias_creditos').getFullList({
      filter: `cliente_destino_id = '${clienteSecundarioId}'`,
      fields: 'id',
    })
    for (const t of transfDestino) {
      try {
        await pb
          .collection('transferencias_creditos')
          .update(t.id, { cliente_destino_id: clienteMestreId })
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.warn('Erro ao reatribuir transferencias_creditos na mesclagem:', err)
  }

  // 4. Atualizar o cliente mestre com os campos definidos
  const clienteAtualizado = await updateCliente(clienteMestreId, camposSobrescritos)

  // 5. Registrar atividade informativa de auditoria no cliente mestre
  try {
    await createAtividade({
      cliente_id: clienteMestreId,
      tipo: 'anotacao',
      titulo: 'Clientes mesclados',
      descricao: `Mesclagem de clientes realizada com sucesso em ${new Date().toLocaleString('pt-BR')}. O cliente duplicado (ID: ${clienteSecundarioId}) foi fundido neste cadastro e todos os relacionamentos e históricos foram transferidos.`,
      data: new Date().toISOString(),
      status: 'concluida',
      autor: 'Sistema Delfos',
    })
  } catch (e) {
    console.warn('Falha ao registrar atividade de mesclagem:', e)
  }

  // 6. Agora que todos os relacionamentos foram migrados, excluir o registro do cliente secundário
  try {
    await pb.collection('clientes').delete(clienteSecundarioId)
  } catch (err) {
    console.warn(`Falha ao excluir cliente secundário ${clienteSecundarioId} após mesclagem:`, err)
  }

  return clienteAtualizado
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
    requestKey: null,
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
    requestKey: null,
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
  try {
    const records = await pb.collection('contratos_om').getFullList<ContratoOM>({
      sort: '-created',
      expand: 'cliente_id',
      requestKey: null,
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
  numero_contrato?: string
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
  status_encerramento?: ContratoOM['status_encerramento']
  motivo_encerramento?: ContratoOM['motivo_encerramento']
  data_encerramento?: string
  observacoes_encerramento?: string
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
  const records = await pb
    .collection('orcamentos_solar')
    .getFullList<import('@/types/crm').OrcamentoSolar>({
      sort: '-data_orcamento,-created',
      expand: 'cliente_id',
      requestKey: null,
    })
  return records
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
  const payload = {
    cliente_id: data.cliente_id || data.clienteId,
    conversa_id: data.conversa_id,
    telefone_destino: data.telefone_destino || data.telefone || '',
    conteudo_final: data.conteudo_final || data.mensagem || '',
    template_id: data.template_id,
    agendado_para: data.agendado_para,
    tipo_disparo: data.tipo_disparo || data.origem || 'manual',
    referencia_id: data.referencia_id,
  }

  return pb.send('/backend/v1/whatsapp/send', {
    method: 'POST',
    body: payload,
  })
}

export async function sendOSWhatsAppManual(osId: string): Promise<{
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
    body: { os_id: osId },
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
  telefone?: string
  email?: string
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
    telefone: string
    email: string
  }>,
): Promise<import('@/types/crm').ContatoAdicional> {
  return await pb
    .collection('contatos_adicionais')
    .update<import('@/types/crm').ContatoAdicional>(id, data)
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
}): Promise<import('@/types/crm').TipoAtividadeCustomItem> {
  const payload = {
    nome: data.nome.trim(),
    categoria: data.categoria,
    cor: data.cor || '',
    icone: data.icone || '',
    descricao: data.descricao || '',
    is_padrao: Boolean(data.is_padrao),
  }
  const record = await pb
    .collection('tipos_atividades_custom')
    .create<import('@/types/crm').TipoAtividadeCustomItem>(payload)
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
): Promise<EnviarNotificacaoOSManualResult> {
  return pb.send('/backend/v1/whatsapp/enviar-os', {
    method: 'POST',
    body: { os_id: osId },
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
        expand: 'cliente_id,profissional_id,responsavel_usuario_id',
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
        expand: 'cliente_id,profissional_id',
      })
    return record
  } catch (err) {
    console.error('Erro ao obter ordem de serviço:', err)
    return null
  }
}

export async function createOrdemServico(data: {
  cliente_id: string
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
      expand: 'cliente_id,profissional_id,responsavel_usuario_id',
    })
  return record
}

export async function updateOrdemServico(
  id: string,
  data: Partial<import('@/types/crm').OrdemServico>,
  newPhotos?: File[],
): Promise<import('@/types/crm').OrdemServico> {
  if (newPhotos && newPhotos.length > 0) {
    const formData = new FormData()
    Object.entries(data).forEach(([key, val]) => {
      if (val !== undefined && val !== null && key !== 'fotos') {
        if (typeof val === 'object') {
          formData.append(key, JSON.stringify(val))
        } else {
          formData.append(key, String(val))
        }
      }
    })
    for (const file of newPhotos) {
      formData.append('fotos', file)
    }
    const record = await pb
      .collection('ordens_servico')
      .update<import('@/types/crm').OrdemServico>(id, formData, {
        expand: 'cliente_id,profissional_id,responsavel_usuario_id',
      })
    return record
  }

  const record = await pb
    .collection('ordens_servico')
    .update<import('@/types/crm').OrdemServico>(id, data, {
      expand: 'cliente_id,profissional_id,responsavel_usuario_id',
    })
  return record
}

export async function finalizarOrdemServico(
  id: string,
  dadosFinalizacao: {
    checklist?: import('@/types/crm').OSChecklistItem[]
    detalhes_execucao: string
    newPhotos?: File[]
    cliente_id?: string
    tipo_servico?: string
    tecnico_nome?: string
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

  const updatedOS = await updateOrdemServico(id, payload, dadosFinalizacao.newPhotos)

  // Registrar atividade na timeline/histórico do cliente
  if (dadosFinalizacao.cliente_id) {
    try {
      const tipoAtividade =
        dadosFinalizacao.tipo_servico === 'Instalação'
          ? 'instalacao'
          : dadosFinalizacao.tipo_servico === 'Configuração de Datalogger'
            ? 'configuracao_datalogger'
            : dadosFinalizacao.tipo_servico === 'Garantia'
              ? 'garantia_equipamento'
              : 'limpeza_manutencao'

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

export async function createUsina(
  data: Partial<import('@/types/crm').UsinaCliente> & { cliente_id: string; nome: string },
): Promise<import('@/types/crm').UsinaCliente> {
  const created = await pb.collection('usinas').create<import('@/types/crm').UsinaCliente>(data, {
    expand: 'contrato_id',
  })
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

export const DEFAULT_SOLARVIEW_CONFIG = {
  nome: 'Solarview',
  link_ios: 'https://apps.apple.com/br/app/solarview/id1453416568',
  link_android: 'https://play.google.com/store/apps/details?id=com.solarview.smartview',
  link_texto:
    'Baixe o app Solarview para acompanhar a geração do seu sistema em tempo real na palma da mão!',
}

import pb from '@/lib/pocketbase/client'
import type {
  Atividade,
  Manutencao,
  OrdemServico,
  ServicoAvulso,
  TimelineOM,
  AnomaliaOM,
  Cliente,
  UsinaCliente,
} from '@/types/crm'

export type CentralAtividadeFonte =
  | 'atividade'
  | 'ordem_servico'
  | 'manutencao'
  | 'servico_avulso'
  | 'timeline_om'
  | 'anomalia_om'

export interface CentralAtividadeItem {
  id: string
  origemId: string
  fonte: CentralAtividadeFonte
  tipoAtividade: string
  subtipo?: string
  origem?: string
  chaveImportacao?: string
  clienteId?: string
  clienteNome: string
  usinaId?: string
  usinaNome?: string
  status: string
  statusRaw: string
  responsavel: string
  responsavelId?: string
  data: string // ISO string para ordenação e filtro
  titulo: string
  descricao?: string
  rotaOriginal?: string
  metadata?: Record<string, unknown>
}

export interface CentralAtividadesFiltros {
  tipoFonte?: CentralAtividadeFonte | 'todos'
  status?: string | 'todos'
  responsavel?: string | 'todos'
  dataInicio?: string // YYYY-MM-DD
  dataFim?: string // YYYY-MM-DD
  buscaTexto?: string
}

export interface CentralAtividadesData {
  items: CentralAtividadeItem[]
  responsaveisDisponiveis: string[]
  statusDisponiveis: string[]
  tiposDisponiveis: { id: CentralAtividadeFonte; label: string; count: number }[]
}

/**
 * Normaliza e consolida dados de atividades de manutenção, ordens de serviço,
 * serviços avulsos, linha do tempo O&M e anomalias em uma única lista padronizada.
 */
export async function carregarCentralAtividades(
  clientesMap?: Map<string, Cliente>,
  usinasMap?: Map<string, UsinaCliente>,
): Promise<CentralAtividadesData> {
  // 1. Carregar coleções em paralelo
  const [
    atividadesRes,
    manutencoesRes,
    ordensServicoRes,
    servicosAvulsosRes,
    timelineOMRes,
    anomaliasOMRes,
    clientesRes,
    usinasRes,
  ] = await Promise.allSettled([
    pb.collection('atividades').getFullList<Atividade>({
      sort: '-data,-created',
      requestKey: null,
    }),
    pb.collection('manutencoes').getFullList<Manutencao>({
      sort: '-data,-created',
      requestKey: null,
    }),
    pb.collection('ordens_servico').getFullList<OrdemServico>({
      sort: '-data_agendada,-created',
      requestKey: null,
    }),
    pb.collection('servicos_avulsos').getFullList<ServicoAvulso>({
      sort: '-data_servico,-created',
      requestKey: null,
    }),
    pb.collection('timeline_om').getFullList<TimelineOM>({
      sort: '-data,-created',
      requestKey: null,
    }),
    pb.collection('anomalias_om').getFullList<AnomaliaOM>({
      sort: '-data_abertura,-created',
      requestKey: null,
    }),
    clientesMap
      ? Promise.resolve([])
      : pb.collection('clientes').getFullList<Cliente>({
          fields: 'id,nome,cidade',
          requestKey: null,
        }),
    usinasMap
      ? Promise.resolve([])
      : pb.collection('usinas').getFullList<UsinaCliente>({
          fields: 'id,nome,cliente_id',
          requestKey: null,
        }),
  ])

  // Mapas de resolução rápida de cliente e usina
  const cMap = new Map<string, Cliente>()
  if (clientesMap) {
    clientesMap.forEach((v, k) => cMap.set(k, v))
  } else if (clientesRes.status === 'fulfilled') {
    clientesRes.value.forEach((c) => cMap.set(c.id, c))
  }

  const uMap = new Map<string, UsinaCliente>()
  if (usinasMap) {
    usinasMap.forEach((v, k) => uMap.set(k, v))
  } else if (usinasRes.status === 'fulfilled') {
    usinasRes.value.forEach((u) => uMap.set(u.id, u))
  }

  const items: CentralAtividadeItem[] = []

  // Helper para obter nome do cliente
  const getClienteNome = (clienteId?: string): string => {
    if (!clienteId) return 'Sem cliente vinculado'
    const cli = cMap.get(clienteId)
    return cli?.nome || 'Cliente não identificado'
  }

  // Helper para obter nome da usina
  const getUsinaNome = (usinaId?: string, clienteId?: string): string | undefined => {
    if (usinaId && uMap.has(usinaId)) {
      return uMap.get(usinaId)?.nome
    }
    if (clienteId) {
      // Procura usina do cliente se não tiver usinaId direto
      for (const u of uMap.values()) {
        if (u.cliente_id === clienteId) return u.nome
      }
    }
    return undefined
  }

  // Conjunto de chaves de importação já presentes na coleção unificada 'atividades'
  // Chave de importação segue o padrão `${origem}_${id}` (ex: "ordem_servico_xyz", "timeline_om_abc", etc.)
  const chavesUnificadasSet = new Set<string>()

  // A. Atividades (coleção unificada 'atividades')
  // Se o registro possuir 'origem' e 'chave_importacao', ele foi migrado/unificado.
  // Caso contrário, é uma atividade CRM nativa padrão.
  if (atividadesRes.status === 'fulfilled') {
    for (const atv of atividadesRes.value) {
      const dataStr = atv.data || atv.created
      const cliNome = getClienteNome(atv.cliente_id)
      const usinaNome = getUsinaNome(atv.usina_id, atv.cliente_id)
      const responsavel = atv.responsavel_nome || atv.autor || 'Não atribuído'

      if (atv.chave_importacao) {
        chavesUnificadasSet.add(atv.chave_importacao)
      }

      // Se possui origem explícita mapeada, respeita a fonte unificada
      const origemExplicta = atv.origem as CentralAtividadeFonte | undefined
      const isUnificadaComOrigem = Boolean(origemExplicta && origemExplicta !== 'atividade')

      let fonte: CentralAtividadeFonte = 'atividade'
      if (
        origemExplicta &&
        [
          'atividade',
          'ordem_servico',
          'manutencao',
          'servico_avulso',
          'timeline_om',
          'anomalia_om',
        ].includes(origemExplicta)
      ) {
        fonte = origemExplicta
      }

      let tipoLabel = 'Atividade'
      if (atv.tipo_unificado) {
        tipoLabel = atv.tipo_unificado
      } else if (atv.tipo) {
        tipoLabel = formatarTipoAtividade(atv.tipo)
      }

      // Rota original conforme a fonte
      let rotaOriginal = atv.cliente_id
        ? `/clientes?openId=${atv.cliente_id}&tab=historico`
        : '/atividades'
      if (fonte === 'ordem_servico') {
        rotaOriginal = '/servicos-campo'
      } else if (fonte === 'servico_avulso' || fonte === 'timeline_om' || fonte === 'anomalia_om') {
        rotaOriginal = atv.cliente_id ? `/clientes?openId=${atv.cliente_id}&tab=om` : '/manutencoes'
      } else if (fonte === 'manutencao') {
        rotaOriginal = '/manutencoes'
      }

      items.push({
        id: isUnificadaComOrigem ? `unif_${atv.id}` : `atv_${atv.id}`,
        origemId: atv.id,
        fonte,
        tipoAtividade: tipoLabel,
        subtipo: atv.subtipo || atv.tipo,
        origem: atv.origem,
        chaveImportacao: atv.chave_importacao,
        clienteId: atv.cliente_id,
        clienteNome: cliNome,
        usinaId: atv.usina_id,
        usinaNome,
        status: formatarStatus(atv.status || 'pendente'),
        statusRaw: atv.status || 'pendente',
        responsavel,
        responsavelId: atv.responsavel_id,
        data: dataStr,
        titulo: atv.titulo || tipoLabel,
        descricao: atv.descricao,
        rotaOriginal,
        metadata: {
          valorServico: atv.valor_servico,
          numeroUc: atv.numero_uc,
        },
      })
    }
  }

  // B. Ordens de Serviço (coleção 'ordens_servico') com FALLBACK de leitura
  // Se já existir na estrutura unificada (por chave_importacao `ordem_servico_${os.id}`), não duplica.
  if (ordensServicoRes.status === 'fulfilled') {
    for (const os of ordensServicoRes.value) {
      const chaveImportacao = `ordem_servico_${os.id}`
      if (chavesUnificadasSet.has(chaveImportacao)) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = os.data_agendada || os.created
      const cliNome = getClienteNome(os.cliente_id)
      const usinaNome = getUsinaNome(undefined, os.cliente_id)
      const responsavel = os.atribuida_a || 'Não atribuído'

      items.push({
        id: `os_${os.id}`,
        origemId: os.id,
        fonte: 'ordem_servico',
        tipoAtividade: `OS: ${os.tipo_servico || 'Serviço de Campo'}`,
        subtipo: os.tipo_servico,
        origem: 'ordem_servico',
        chaveImportacao,
        clienteId: os.cliente_id,
        clienteNome: cliNome,
        usinaNome,
        status: formatarStatus(os.status || 'pendente'),
        statusRaw: os.status || 'pendente',
        responsavel,
        responsavelId: os.responsavel_usuario_id || os.profissional_id,
        data: dataStr,
        titulo: `OS #${os.id.slice(-6).toUpperCase()} — ${os.tipo_servico || 'Serviço'}`,
        descricao: os.instrucoes || os.detalhes_execucao || os.endereco,
        rotaOriginal: '/servicos-campo',
        metadata: {
          endereco: os.endereco,
          concluidaEm: os.concluida_em,
        },
      })
    }
  }

  // C. Manutenções (coleção 'manutencoes') com FALLBACK de leitura
  if (manutencoesRes.status === 'fulfilled') {
    for (const m of manutencoesRes.value) {
      const chaveImportacao = `manutencao_${m.id}`
      if (chavesUnificadasSet.has(chaveImportacao)) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = m.data || m.created
      const cliNome = getClienteNome(m.cliente_id)
      const usinaNome = getUsinaNome(undefined, m.cliente_id)
      const responsavel = m.tecnico || 'Não atribuído'

      items.push({
        id: `manut_${m.id}`,
        origemId: m.id,
        fonte: 'manutencao',
        tipoAtividade: `Manutenção: ${m.tipo || 'Geral'}`,
        subtipo: m.tipo,
        origem: 'manutencao',
        chaveImportacao,
        clienteId: m.cliente_id,
        clienteNome: cliNome,
        usinaNome,
        status: formatarStatus(m.status || 'Agendado'),
        statusRaw: m.status || 'Agendado',
        responsavel,
        data: dataStr,
        titulo: `Manutenção: ${m.tipo || 'Preventiva'}`,
        descricao: m.descricao,
        rotaOriginal: '/manutencoes',
      })
    }
  }

  // D. Serviços Avulsos (coleção 'servicos_avulsos') com FALLBACK de leitura
  if (servicosAvulsosRes.status === 'fulfilled') {
    for (const s of servicosAvulsosRes.value) {
      const chaveImportacao = `servico_avulso_${s.id}`
      if (chavesUnificadasSet.has(chaveImportacao)) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = s.data_servico || s.created
      const cliNome = getClienteNome(s.cliente_id)
      const usinaNome = getUsinaNome(undefined, s.cliente_id)
      const responsavel = s.observacoes_equipe ? 'Equipe de Campo' : 'Não atribuído'

      items.push({
        id: `avulso_${s.id}`,
        origemId: s.id,
        fonte: 'servico_avulso',
        tipoAtividade: `Serviço Avulso: ${formatarTipoServicoAvulso(s.tipo_servico)}`,
        subtipo: s.tipo_servico,
        origem: 'servico_avulso',
        chaveImportacao,
        clienteId: s.cliente_id,
        clienteNome: cliNome,
        usinaNome,
        status: formatarStatus(s.status || 'agendado'),
        statusRaw: s.status || 'agendado',
        responsavel,
        data: dataStr,
        titulo: `Serviço Avulso: ${formatarTipoServicoAvulso(s.tipo_servico)}`,
        descricao: s.observacoes_tecnicas || s.observacoes_equipe,
        rotaOriginal: s.cliente_id ? `/clientes?openId=${s.cliente_id}&tab=om` : '/manutencoes',
        metadata: {
          valorCobrado: s.valor_cobrado,
        },
      })
    }
  }

  // E. Linha do Tempo O&M (coleção 'timeline_om') com FALLBACK de leitura
  if (timelineOMRes.status === 'fulfilled') {
    for (const t of timelineOMRes.value) {
      const chaveImportacao = `timeline_om_${t.id}`
      if (chavesUnificadasSet.has(chaveImportacao)) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = t.data || t.created
      const cliNome = getClienteNome(t.cliente_id)
      const usinaNome = getUsinaNome(undefined, t.cliente_id)
      const responsavel = t.autor || 'Equipe Delfos'

      items.push({
        id: `timeline_${t.id}`,
        origemId: t.id,
        fonte: 'timeline_om',
        tipoAtividade: `Linha do Tempo O&M: ${t.tipo || 'Registro'}`,
        subtipo: t.tipo,
        origem: 'timeline_om',
        chaveImportacao,
        clienteId: t.cliente_id,
        clienteNome: cliNome,
        usinaNome,
        status: formatarStatus(t.status_tag || 'registrado'),
        statusRaw: t.status_tag || 'registrado',
        responsavel,
        data: dataStr,
        titulo: t.titulo || 'Registro da Linha do Tempo O&M',
        descricao: t.descricao,
        rotaOriginal: t.cliente_id ? `/clientes?openId=${t.cliente_id}&tab=om` : '/manutencoes',
      })
    }
  }

  // F. Anomalias O&M (coleção 'anomalias_om') com FALLBACK de leitura
  if (anomaliasOMRes.status === 'fulfilled') {
    for (const anom of anomaliasOMRes.value) {
      const chaveImportacao = `anomalia_om_${anom.id}`
      if (chavesUnificadasSet.has(chaveImportacao)) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = anom.data_abertura || anom.created
      const cliNome = getClienteNome(anom.cliente_id)
      const usinaNome = getUsinaNome(undefined, anom.cliente_id)
      const responsavel = anom.tecnico_nome || 'Não atribuído'

      items.push({
        id: `anomalia_${anom.id}`,
        origemId: anom.id,
        fonte: 'anomalia_om',
        tipoAtividade: `Anomalia O&M [${anom.severidade || 'Média'}]`,
        subtipo: anom.severidade,
        origem: 'anomalia_om',
        chaveImportacao,
        clienteId: anom.cliente_id,
        clienteNome: cliNome,
        usinaNome,
        status: formatarStatus(anom.status || 'Aberto'),
        statusRaw: anom.status || 'Aberto',
        responsavel,
        data: dataStr,
        titulo: anom.titulo
          ? `${anom.codigo ? `[${anom.codigo}] ` : ''}${anom.titulo}`
          : 'Anomalia Detectada',
        descricao: anom.descricao || anom.solucao_adotada,
        rotaOriginal: anom.cliente_id
          ? `/clientes?openId=${anom.cliente_id}&tab=om`
          : '/manutencoes',
        metadata: {
          severidade: anom.severidade,
          etapa: anom.etapa,
          valorFaturamento: anom.valor_faturamento,
        },
      })
    }
  }

  // Ordenação padrão: mais recentes primeiro (decrescente de data)
  items.sort((a, b) => {
    const timeA = a.data ? new Date(a.data).getTime() : 0
    const timeB = b.data ? new Date(b.data).getTime() : 0
    return timeB - timeA
  })

  // Extrair lista de responsáveis únicos para o filtro
  const respSet = new Set<string>()
  items.forEach((item) => {
    if (item.responsavel && item.responsavel.trim() !== '') {
      respSet.add(item.responsavel.trim())
    }
  })
  const responsaveisDisponiveis = Array.from(respSet).sort()

  // Extrair lista de status únicos normalizados
  const statusSet = new Set<string>()
  items.forEach((item) => {
    if (item.status && item.status.trim() !== '') {
      statusSet.add(item.status.trim())
    }
  })
  const statusDisponiveis = Array.from(statusSet).sort()

  // Contagem por tipo de fonte
  const countsByFonte = items.reduce(
    (acc, curr) => {
      acc[curr.fonte] = (acc[curr.fonte] || 0) + 1
      return acc
    },
    {} as Record<CentralAtividadeFonte, number>,
  )

  const tiposDisponiveis: { id: CentralAtividadeFonte; label: string; count: number }[] = [
    { id: 'atividade', label: 'Atividades do CRM', count: countsByFonte.atividade || 0 },
    {
      id: 'ordem_servico',
      label: 'Ordens de Serviço (OS)',
      count: countsByFonte.ordem_servico || 0,
    },
    {
      id: 'manutencao',
      label: 'Manutenções Preventivas/Corretivas',
      count: countsByFonte.manutencao || 0,
    },
    { id: 'servico_avulso', label: 'Serviços Avulsos', count: countsByFonte.servico_avulso || 0 },
    {
      id: 'linha_do_tempo' as any,
      label: 'Linha do Tempo O&M',
      count: countsByFonte.timeline_om || 0,
    },
    { id: 'anomalia_om', label: 'Anomalias O&M', count: countsByFonte.anomalia_om || 0 },
  ].filter((t) => (t.id === ('linha_do_tempo' as any) ? true : true)) as any

  // Corrige 'timeline_om' como chave real
  const tiposCorrigidos: { id: CentralAtividadeFonte; label: string; count: number }[] = [
    { id: 'atividade', label: 'Atividades do CRM', count: countsByFonte.atividade || 0 },
    {
      id: 'ordem_servico',
      label: 'Ordens de Serviço (OS)',
      count: countsByFonte.ordem_servico || 0,
    },
    { id: 'manutencao', label: 'Manutenções', count: countsByFonte.manutencao || 0 },
    { id: 'servico_avulso', label: 'Serviços Avulsos', count: countsByFonte.servico_avulso || 0 },
    { id: 'timeline_om', label: 'Linha do Tempo O&M', count: countsByFonte.timeline_om || 0 },
    { id: 'anomalia_om', label: 'Anomalias O&M', count: countsByFonte.anomalia_om || 0 },
  ]

  return {
    items,
    responsaveisDisponiveis,
    statusDisponiveis,
    tiposDisponiveis: tiposCorrigidos,
  }
}

/**
 * Normaliza os status para apresentação e filtro consistente
 */
export function formatarStatus(statusRaw: string): string {
  const s = statusRaw.toLowerCase().trim()
  if (['concluida', 'concluido', 'resolvido', 'faturado', 'finalizada'].includes(s)) {
    return 'Concluído'
  }
  if (['pendente', 'aberto', 'agendado', 'agendada'].includes(s)) {
    return 'Pendente / Agendado'
  }
  if (
    [
      'em_andamento',
      'em andamento',
      'em execução',
      'em_execucao',
      'em análise',
      'em analise',
    ].includes(s)
  ) {
    return 'Em Execução'
  }
  if (['cancelada', 'cancelado', 'rejeitada', 'rejeitado'].includes(s)) {
    return 'Cancelado'
  }
  if (['enviado', 'dados_registrados', 'registrado'].includes(s)) {
    return 'Registrado / Enviado'
  }
  // Fallback capitalizado
  return statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1)
}

function formatarTipoAtividade(tipo: string): string {
  const map: Record<string, string> = {
    contato_ligacao: 'Ligação Telefônica',
    ligacao: 'Ligação Telefônica',
    reuniao_presencial: 'Reunião Presencial',
    reuniao: 'Reunião',
    visita_tecnica: 'Visita Técnica',
    follow_up: 'Follow-up Comercial',
    instalacao: 'Instalação Solar',
    proposta: 'Proposta Comercial',
    limpeza_manutencao: 'Limpeza & Manutenção',
    auto_leitura_rge: 'Auto Leitura RGE',
    lembrete_auto_leitura: 'Lembrete Auto Leitura',
    solicitar_contas_rge: 'Solicitar Contas RGE',
    analise_fatura: 'Análise de Fatura RGE',
    mudanca_estagio: 'Mudança de Estágio',
    anotacao: 'Anotação Interna',
    garantia_equipamento: 'Garantia de Equipamento',
    configuracao_datalogger: 'Configuração de Datalogger',
    relatorio_solarview: 'Relatório SolarView',
    mensagem_enviada: 'Mensagem Enviada',
    oferecer_limpeza_avulsa: 'Oferta Limpeza Avulsa',
    gerar_contrato: 'Gerar Contrato',
    gerar_procuracao: 'Gerar Procuração',
  }
  return map[tipo] || tipo.replace(/_/g, ' ')
}

function formatarTipoServicoAvulso(tipo?: string): string {
  if (!tipo) return 'Geral'
  const map: Record<string, string> = {
    limpeza: 'Limpeza e Lavagem de Módulos',
    troca_equipamento: 'Troca de Equipamento / Inversor',
    visita_tecnica: 'Visita Técnica Especializada',
    reaperto: 'Reaperto Elétrico e Termografia',
    outro: 'Outro Serviço Técnico',
  }
  return map[tipo] || tipo
}

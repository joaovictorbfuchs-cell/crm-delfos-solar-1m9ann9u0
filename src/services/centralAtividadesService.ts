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

import type { AtividadeCategoriaId } from '@/types/crm'
import { CATEGORIAS_ATIVIDADES } from '@/constants/atividadesTipos'

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
  registroOriginalId?: string
  fonte: CentralAtividadeFonte
  categoriaId: AtividadeCategoriaId
  categoriaNome: string
  tipoAtividade: string
  tipoId?: string
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
  categoriaId?: AtividadeCategoriaId | 'todos'
  tipoFonte?: CentralAtividadeFonte | 'todos'
  tipoEspecifico?: string | 'todos'
  status?: string | 'todos'
  responsavel?: string | 'todos'
  dataInicio?: string // YYYY-MM-DD
  dataFim?: string // YYYY-MM-DD
  buscaTexto?: string
}

export interface CategoriaContagemItem {
  id: AtividadeCategoriaId
  nome: string
  count: number
}

export interface CentralAtividadesData {
  items: CentralAtividadeItem[]
  responsaveisDisponiveis: string[]
  statusDisponiveis: string[]
  categoriasDisponiveis: CategoriaContagemItem[]
  /** @deprecated Mantido para retrocompatibilidade caso algum teste ainda acesse tiposDisponiveis */
  tiposDisponiveis: { id: CentralAtividadeFonte; label: string; count: number }[]
}

/**
 * Mapeia qualquer atividade, ordem de serviço, manutenção, serviço avulso ou anomalia
 * para exatamente uma das 3 categorias oficiais do CRM:
 * 1. 'comercial' -> Atividades Comerciais
 * 2. 'manutencao' -> Atividades de Manutenção
 * 3. 'administrativo_pos_venda' -> Atividades Administrativas
 */
/**
 * Helper com critério estrutural (por campos, nunca por texto de título) para determinar
 * se um registro da coleção 'atividades' é válido para exibição na Central de Atividades.
 *
 * Regras:
 * a) Excluir qualquer registro onde tipo, subtipo ou tipo_unificado seja 'mudanca_estagio'.
 * b) Excluir tipo='anotacao' com autor='Sistema Delfos' e status='concluida' sem data agendada
 *    (registros automáticos de mesclagem de clientes).
 * c) Excluir tipo='anotacao' com autor OU responsavel_nome='IA Extrator Delfos' sem data
 *    (dados importados por extração de documento).
 * d) Excluir QUALQUER registro sem o campo atv.data preenchido — regra do usuário:
 *    "somente as que têm prazo". Por isso, a extração de data NUNCA deve usar fallback
 *    para atv.created: dataStr = atv.data apenas.
 */
export function isRegistroValidoCentral(atv: Atividade): boolean {
  if (!atv) return false

  // a) Excluir registros de mudança de etapa do funil
  const tipoStr = (atv.tipo || '').toString().toLowerCase().trim()
  const subtipoStr = (atv.subtipo || '').toString().toLowerCase().trim()
  const tipoUnificadoStr = (atv.tipo_unificado || '').toString().toLowerCase().trim()
  if (
    tipoStr === 'mudanca_estagio' ||
    subtipoStr === 'mudanca_estagio' ||
    tipoUnificadoStr === 'mudanca_estagio'
  ) {
    return false
  }

  // d) Excluir QUALQUER registro sem o campo atv.data preenchido ("somente as que têm prazo")
  const dataPreenchida = typeof atv.data === 'string' && atv.data.trim() !== ''
  if (!dataPreenchida) {
    return false
  }

  // b) Excluir mesclagem de clientes: anotacao + Sistema Delfos + concluída sem data agendada
  const autorStr = (atv.autor || '').trim()
  const statusStr = (atv.status || '').toString().toLowerCase().trim()
  if (
    tipoStr === 'anotacao' &&
    autorStr === 'Sistema Delfos' &&
    (statusStr === 'concluida' || statusStr === 'concluido')
  ) {
    return false
  }

  // c) Excluir importação/extração de documentos: anotacao + IA Extrator Delfos
  const respStr = (atv.responsavel_nome || '').trim()
  if (
    tipoStr === 'anotacao' &&
    (autorStr === 'IA Extrator Delfos' || respStr === 'IA Extrator Delfos')
  ) {
    return false
  }

  return true
}

export function determinarCategoriaAtividade(
  fonte: CentralAtividadeFonte,
  tipo?: string,
  subtipo?: string,
): AtividadeCategoriaId {
  // Se for OS, Manutenção O&M, Serviço Avulso ou Anomalia O&M -> Categoria Manutenção
  if (
    fonte === 'ordem_servico' ||
    fonte === 'manutencao' ||
    fonte === 'servico_avulso' ||
    fonte === 'anomalia_om'
  ) {
    return 'manutencao'
  }

  const t = (tipo || '').toLowerCase().trim()
  const st = (subtipo || '').toLowerCase().trim()

  // Atividades de Manutenção explícitas
  if (
    [
      'instalacao',
      'limpeza',
      'manutencao_preventiva',
      'manutencao_corretiva',
      'limpeza_manutencao',
      'configuracao_datalogger',
      'garantia_equipamento',
      'visita_tecnica',
    ].includes(t) ||
    st.includes('limpeza') ||
    st.includes('manuten') ||
    st.includes('garantia') ||
    st.includes('instal') ||
    st.includes('datalogger')
  ) {
    return 'manutencao'
  }

  // Atividades Administrativas / RGE / Pós-Venda
  if (
    [
      'analise_fatura',
      'auto_leitura_rge',
      'lembrete_auto_leitura',
      'relatorio_solarview',
      'anexo_g',
      'troca_titularidade',
      'transferencia_creditos',
      'gerar_procuracao',
      'gerar_contrato',
      'solicitar_contas_rge',
      'anotacao',
    ].includes(t) ||
    t.includes('auto_leitura') ||
    t.includes('fatura') ||
    t.includes('solarview') ||
    t.includes('procuracao') ||
    t.includes('contrato') ||
    t.includes('titularidade') ||
    fonte === 'timeline_om'
  ) {
    return 'administrativo_pos_venda'
  }

  // Atividades Comerciais (contato, reuniao, proposta, follow-up, ligar indicacao, reativacao, etc.)
  return 'comercial'
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
      // Filtrar registros automáticos de sistema e sem prazo para a Central de Atividades
      if (!isRegistroValidoCentral(atv)) {
        continue
      }

      const dataStr = atv.data
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

      // Determinar categoria unificada oficial
      const catId =
        (atv.categoria_unificada as AtividadeCategoriaId) ||
        determinarCategoriaAtividade(fonte, atv.tipo, atv.subtipo)
      const catDef = CATEGORIAS_ATIVIDADES.find((c) => c.id === catId)
      const catNome = catDef?.nome || 'Comercial'

      // Rota original conforme a fonte
      let rotaOriginal = atv.cliente_id
        ? `/clientes?openId=${atv.cliente_id}&tab=historico`
        : '/central-atividades'
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
        registroOriginalId: atv.registro_original_id || atv.id,
        fonte,
        categoriaId: catId,
        categoriaNome: catNome,
        tipoAtividade: tipoLabel,
        tipoId: atv.tipo,
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
  // Se já existir na estrutura unificada (por chave_importacao `ordem_servico_${os.id}`, `piloto-ordem_servico-${os.id}`, `piloto2-ordem_servico-${os.id}` ou `lote*-ordem_servico-${os.id}`), não duplica.
  if (ordensServicoRes.status === 'fulfilled') {
    for (const os of ordensServicoRes.value) {
      const chaveImportacao = `ordem_servico_${os.id}`
      const chavePiloto = `piloto-ordem_servico-${os.id}`
      const chavePiloto2 = `piloto2-ordem_servico-${os.id}`
      const chaveSuffix = `ordem_servico-${os.id}`
      const jaExiste =
        chavesUnificadasSet.has(chaveImportacao) ||
        chavesUnificadasSet.has(chavePiloto) ||
        chavesUnificadasSet.has(chavePiloto2) ||
        Array.from(chavesUnificadasSet).some((k) => k.endsWith(chaveSuffix))
      if (jaExiste) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = os.data_agendada || os.created
      const cliNome = getClienteNome(os.cliente_id)
      const usinaNome = getUsinaNome(undefined, os.cliente_id)
      const responsavel = os.atribuida_a || 'Não atribuído'

      items.push({
        id: `os_${os.id}`,
        origemId: os.id,
        registroOriginalId: os.id,
        fonte: 'ordem_servico',
        categoriaId: 'manutencao',
        categoriaNome: 'Manutenção',
        tipoAtividade: `OS: ${os.tipo_servico || 'Serviço de Campo'}`,
        tipoId: 'ordem_servico',
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
      const chavePiloto = `piloto-manutencao-${m.id}`
      const chavePiloto2 = `piloto2-manutencao-${m.id}`
      const chaveSuffix = `manutencao-${m.id}`
      const jaExiste =
        chavesUnificadasSet.has(chaveImportacao) ||
        chavesUnificadasSet.has(chavePiloto) ||
        chavesUnificadasSet.has(chavePiloto2) ||
        Array.from(chavesUnificadasSet).some((k) => k.endsWith(chaveSuffix))
      if (jaExiste) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = m.data || m.created
      const cliNome = getClienteNome(m.cliente_id)
      const usinaNome = getUsinaNome(undefined, m.cliente_id)
      const responsavel = m.tecnico || 'Não atribuído'

      items.push({
        id: `manut_${m.id}`,
        origemId: m.id,
        registroOriginalId: m.id,
        fonte: 'manutencao',
        categoriaId: 'manutencao',
        categoriaNome: 'Manutenção',
        tipoAtividade: `Manutenção: ${m.tipo || 'Geral'}`,
        tipoId: 'manutencao',
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
      const chavePiloto = `piloto-servico_avulso-${s.id}`
      const chavePiloto2 = `piloto2-servico_avulso-${s.id}`
      const chaveSuffix = `servico_avulso-${s.id}`
      const jaExiste =
        chavesUnificadasSet.has(chaveImportacao) ||
        chavesUnificadasSet.has(chavePiloto) ||
        chavesUnificadasSet.has(chavePiloto2) ||
        Array.from(chavesUnificadasSet).some((k) => k.endsWith(chaveSuffix))
      if (jaExiste) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = s.data_servico || s.created
      const cliNome = getClienteNome(s.cliente_id)
      const usinaNome = getUsinaNome(undefined, s.cliente_id)
      const responsavel = s.observacoes_equipe ? 'Equipe de Campo' : 'Não atribuído'

      items.push({
        id: `avulso_${s.id}`,
        origemId: s.id,
        registroOriginalId: s.id,
        fonte: 'servico_avulso',
        categoriaId: 'manutencao',
        categoriaNome: 'Manutenção',
        tipoAtividade: `Serviço Avulso: ${formatarTipoServicoAvulso(s.tipo_servico)}`,
        tipoId: 'servico_avulso',
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
      const chavePiloto = `piloto-timeline_om-${t.id}`
      const chavePiloto2 = `piloto2-timeline_om-${t.id}`
      const chaveSuffix = `timeline_om-${t.id}`
      const jaExiste =
        chavesUnificadasSet.has(chaveImportacao) ||
        chavesUnificadasSet.has(chavePiloto) ||
        chavesUnificadasSet.has(chavePiloto2) ||
        Array.from(chavesUnificadasSet).some((k) => k.endsWith(chaveSuffix))
      if (jaExiste) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = t.data || t.created
      const cliNome = getClienteNome(t.cliente_id)
      const usinaNome = getUsinaNome(undefined, t.cliente_id)
      const responsavel = t.autor || 'Equipe Delfos'

      items.push({
        id: `timeline_${t.id}`,
        origemId: t.id,
        registroOriginalId: t.id,
        fonte: 'timeline_om',
        categoriaId: 'administrativo_pos_venda',
        categoriaNome: 'Administrativas',
        tipoAtividade: `Linha do Tempo O&M: ${t.tipo || 'Registro'}`,
        tipoId: 'timeline_om',
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
      const chavePiloto = `piloto-anomalia_om-${anom.id}`
      const chavePiloto2 = `piloto2-anomalia_om-${anom.id}`
      const chaveSuffix = `anomalia_om-${anom.id}`
      const jaExiste =
        chavesUnificadasSet.has(chaveImportacao) ||
        chavesUnificadasSet.has(chavePiloto) ||
        chavesUnificadasSet.has(chavePiloto2) ||
        Array.from(chavesUnificadasSet).some((k) => k.endsWith(chaveSuffix))
      if (jaExiste) {
        continue // Já lido da estrutura unificada
      }

      const dataStr = anom.data_abertura || anom.created
      const cliNome = getClienteNome(anom.cliente_id)
      const usinaNome = getUsinaNome(undefined, anom.cliente_id)
      const responsavel = anom.tecnico_nome || 'Não atribuído'

      items.push({
        id: `anomalia_${anom.id}`,
        origemId: anom.id,
        registroOriginalId: anom.id,
        fonte: 'anomalia_om',
        categoriaId: 'manutencao',
        categoriaNome: 'Manutenção',
        tipoAtividade: `Anomalia O&M [${anom.severidade || 'Média'}]`,
        tipoId: 'anomalia_om',
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
    if (item.statusRaw && item.statusRaw.trim() !== '') {
      statusSet.add(item.statusRaw.trim())
    }
    if (item.status && item.status.trim() !== '') {
      statusSet.add(item.status.trim())
    }
  })
  // Garante os status padrões mais comuns mesmo se a base estiver vazia
  ;['pendente', 'concluida', 'em_execucao', 'cancelada', 'agendada'].forEach((st) =>
    statusSet.add(st),
  )
  const statusDisponiveis = Array.from(statusSet).sort()

  // Contagem por Categoria Oficial (Comerciais, Manutenção, Administrativas)
  const countsByCategoria: Record<AtividadeCategoriaId, number> = {
    comercial: 0,
    manutencao: 0,
    administrativo_pos_venda: 0,
  }
  for (const it of items) {
    if (it.categoriaId && countsByCategoria[it.categoriaId] !== undefined) {
      countsByCategoria[it.categoriaId]++
    } else {
      countsByCategoria.comercial++
    }
  }

  const categoriasDisponiveis: CategoriaContagemItem[] = [
    {
      id: 'comercial',
      nome: 'Comerciais',
      count: countsByCategoria.comercial,
    },
    {
      id: 'manutencao',
      nome: 'Manutenção',
      count: countsByCategoria.manutencao,
    },
    {
      id: 'administrativo_pos_venda',
      nome: 'Administrativas',
      count: countsByCategoria.administrativo_pos_venda,
    },
  ]

  // Contagem por tipo de fonte (para retrocompatibilidade)
  const countsByFonte = items.reduce(
    (acc, curr) => {
      acc[curr.fonte] = (acc[curr.fonte] || 0) + 1
      return acc
    },
    {} as Record<CentralAtividadeFonte, number>,
  )

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
    categoriasDisponiveis,
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
    limpeza: 'Limpeza dos Módulos',
    manutencao_preventiva: 'Manutenção Preventiva',
    manutencao_corretiva: 'Manutenção Corretiva',
    limpeza_manutencao: 'Limpeza dos Módulos',
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

/**
 * Aplica os filtros na lista de itens da Central de Atividades
 */
export function filtrarCentralAtividades(
  items: CentralAtividadeItem[],
  filtros: CentralAtividadesFiltros,
): CentralAtividadeItem[] {
  return items.filter((item) => {
    // 1. Filtro por categoria unificada (Comerciais, Manutenção, Administrativas)
    if (filtros.categoriaId && filtros.categoriaId !== 'todos') {
      if (item.categoriaId !== filtros.categoriaId) {
        return false
      }
    }

    // 2. Filtro por fonte (retrocompatibilidade)
    if (filtros.tipoFonte && filtros.tipoFonte !== 'todos') {
      if (item.fonte !== filtros.tipoFonte) {
        return false
      }
    }

    // 2.1. Filtro por tipo específico de atividade (se selecionado)
    if (filtros.tipoEspecifico && filtros.tipoEspecifico !== 'todos') {
      const matchTipoId = item.tipoId === filtros.tipoEspecifico
      const matchSubtipo = item.subtipo === filtros.tipoEspecifico
      const matchTipoAtv = item.tipoAtividade === filtros.tipoEspecifico
      if (!matchTipoId && !matchSubtipo && !matchTipoAtv) {
        return false
      }
    }

    // 3. Filtro por status / etapa
    if (filtros.status && filtros.status !== 'todos') {
      const sFiltro = filtros.status.toLowerCase().trim()
      const sItem = (item.status || '').toLowerCase().trim()
      const sRaw = (item.statusRaw || '').toLowerCase().trim()
      const sFmt = formatarStatus(item.statusRaw || '')
        .toLowerCase()
        .trim()

      const matchExato = sItem === sFiltro || sRaw === sFiltro || sFmt === sFiltro

      // Compatibilidade semântica: pendente engloba agendado/aberto
      const matchPendente =
        (sFiltro === 'pendente' ||
          sFiltro === 'pendente / agendado' ||
          sFiltro === 'agendada' ||
          sFiltro === 'agendado') &&
        ['pendente', 'aberto', 'agendado', 'agendada', 'pendente / agendado'].includes(
          sRaw || sItem,
        )

      // Compatibilidade semântica: concluído engloba resolvido/faturado
      const matchConcluido =
        (sFiltro === 'concluida' || sFiltro === 'concluido' || sFiltro === 'concluído') &&
        ['concluida', 'concluido', 'concluído', 'resolvido', 'faturado', 'finalizada'].includes(
          sRaw || sItem,
        )

      // Compatibilidade semântica: em execução engloba andamento/análise
      const matchExecucao =
        (sFiltro === 'em_execucao' || sFiltro === 'em execução' || sFiltro === 'em andamento') &&
        [
          'em_andamento',
          'em andamento',
          'em execução',
          'em_execucao',
          'em análise',
          'em analise',
        ].includes(sRaw || sItem)

      // Compatibilidade semântica: cancelado
      const matchCancelado =
        (sFiltro === 'cancelada' || sFiltro === 'cancelado') &&
        ['cancelada', 'cancelado', 'rejeitada', 'rejeitado'].includes(sRaw || sItem)

      if (!matchExato && !matchPendente && !matchConcluido && !matchExecucao && !matchCancelado) {
        return false
      }
    }

    // 4. Filtro por responsável
    if (filtros.responsavel && filtros.responsavel !== 'todos') {
      if (item.responsavel !== filtros.responsavel) {
        return false
      }
    }

    // 5. Filtro por intervalo de datas
    if (filtros.dataInicio && item.data) {
      const dataItem = item.data.slice(0, 10)
      if (dataItem < filtros.dataInicio) return false
    }
    if (filtros.dataFim && item.data) {
      const dataItem = item.data.slice(0, 10)
      if (dataItem > filtros.dataFim) return false
    }

    // 6. Busca textual
    if (filtros.buscaTexto && filtros.buscaTexto.trim() !== '') {
      const q = filtros.buscaTexto.toLowerCase().trim()
      const matchTitulo = (item.titulo || '').toLowerCase().includes(q)
      const matchDesc = (item.descricao || '').toLowerCase().includes(q)
      const matchCli = (item.clienteNome || '').toLowerCase().includes(q)
      const matchTipo = (item.tipoAtividade || '').toLowerCase().includes(q)
      const matchResp = (item.responsavel || '').toLowerCase().includes(q)
      const matchUsina = (item.usinaNome || '').toLowerCase().includes(q)
      if (!matchTitulo && !matchDesc && !matchCli && !matchTipo && !matchResp && !matchUsina) {
        return false
      }
    }

    return true
  })
}

/**
 * Atualiza o responsável de múltiplos itens da Central de Atividades em lote.
 * Suporta atividades unificadas ('atividades') e fontes legadas ('ordens_servico', 'manutencoes', etc.).
 */
export async function bulkAtualizarResponsavelCentral(
  items: CentralAtividadeItem[],
  responsavelId: string,
  responsavelNome: string,
): Promise<{ sucessos: number; falhas: number }> {
  let sucessos = 0
  let falhas = 0

  await Promise.all(
    items.map(async (item) => {
      try {
        if (item.fonte === 'ordem_servico') {
          // Atualiza na coleção de ordens de serviço
          await pb.collection('ordens_servico').update(item.origemId, {
            atribuida_a: responsavelNome,
            responsavel_usuario_id: responsavelId || null,
          })
          // Se houver cópia unificada com chave de importação ou id unificado, tenta sincronizar também
          if (item.id.startsWith('unif_')) {
            const atvId = item.id.replace('unif_', '')
            await pb
              .collection('atividades')
              .update(atvId, {
                responsavel_id: responsavelId || null,
                responsavel_nome: responsavelNome,
              })
              .catch(() => null)
          }
        } else if (item.fonte === 'manutencao') {
          await pb.collection('manutencoes').update(item.origemId, {
            tecnico: responsavelNome,
          })
          if (item.id.startsWith('unif_')) {
            const atvId = item.id.replace('unif_', '')
            await pb
              .collection('atividades')
              .update(atvId, {
                responsavel_id: responsavelId || null,
                responsavel_nome: responsavelNome,
              })
              .catch(() => null)
          }
        } else if (item.fonte === 'timeline_om') {
          await pb.collection('timeline_om').update(item.origemId, {
            autor: responsavelNome,
          })
        } else if (item.fonte === 'anomalia_om') {
          await pb.collection('anomalias_om').update(item.origemId, {
            tecnico_nome: responsavelNome,
          })
        } else {
          // Atividade padrão do CRM (coleção 'atividades')
          await pb.collection('atividades').update(item.origemId, {
            responsavel_id: responsavelId || null,
            responsavel_nome: responsavelNome,
            autor: responsavelNome,
          })
        }
        sucessos++
      } catch (err) {
        console.warn(`Erro ao atualizar responsável do item ${item.id}:`, err)
        falhas++
      }
    }),
  )

  return { sucessos, falhas }
}

/**
 * Exclui múltiplos itens da Central de Atividades em lote.
 * Remove da coleção correta (atividades, ordens_servico, manutencoes, etc.) e
 * limpa também a cópia unificada caso exista.
 */
export async function bulkExcluirItensCentral(
  items: CentralAtividadeItem[],
): Promise<{ sucessos: number; falhas: number }> {
  let sucessos = 0
  let falhas = 0

  await Promise.all(
    items.map(async (item) => {
      try {
        if (item.fonte === 'ordem_servico') {
          await pb
            .collection('ordens_servico')
            .delete(item.origemId)
            .catch(() => null)
          if (item.id.startsWith('unif_')) {
            const atvId = item.id.replace('unif_', '')
            await pb
              .collection('atividades')
              .delete(atvId)
              .catch(() => null)
          }
        } else if (item.fonte === 'manutencao') {
          await pb
            .collection('manutencoes')
            .delete(item.origemId)
            .catch(() => null)
          if (item.id.startsWith('unif_')) {
            const atvId = item.id.replace('unif_', '')
            await pb
              .collection('atividades')
              .delete(atvId)
              .catch(() => null)
          }
        } else if (item.fonte === 'servico_avulso') {
          await pb
            .collection('servicos_avulsos')
            .delete(item.origemId)
            .catch(() => null)
          if (item.id.startsWith('unif_')) {
            const atvId = item.id.replace('unif_', '')
            await pb
              .collection('atividades')
              .delete(atvId)
              .catch(() => null)
          }
        } else if (item.fonte === 'timeline_om') {
          await pb
            .collection('timeline_om')
            .delete(item.origemId)
            .catch(() => null)
        } else if (item.fonte === 'anomalia_om') {
          await pb
            .collection('anomalias_om')
            .delete(item.origemId)
            .catch(() => null)
        } else {
          // Atividade padrão do CRM
          await pb.collection('atividades').delete(item.origemId)
        }
        sucessos++
      } catch (err) {
        console.warn(`Erro ao excluir item ${item.id}:`, err)
        falhas++
      }
    }),
  )

  return { sucessos, falhas }
}

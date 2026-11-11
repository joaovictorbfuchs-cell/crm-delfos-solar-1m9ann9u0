import type { OrdemServico, Cliente, Sistema, OSChecklistItem } from '@/types/crm'

export interface FotoRegistroRelatorio {
  id: string
  url: string
  titulo: string
  subtitulo: string
  descricao: string
  dataHora: string
  item_checklist_id?: string
  item_checklist_texto?: string
  numeroGlobal?: number
}

export interface GrupoFotosEtapaRelatorio {
  itemChecklistId?: string
  itemChecklistTexto: string
  fotos: FotoRegistroRelatorio[]
}

export interface ServicoExecutadoRelatorio {
  atividade: string
  descricaoCliente?: string
  localAtivo: string
  quantidade: string
  situacao: string
  evidencia: string
}

export interface ComponenteCondicaoRelatorio {
  componente: string
  abrangencia: string
  condicao: string
  evidencia: string
}

export interface RelatorioOSCanonicalData {
  // Identificação do documento
  numeroRelatorio: string // REL-{ano}-{num}
  osCodigo: string // #95SPBG ou #XXXXXX
  osIdReal: string
  revisao: string // 01
  dataEmissao: string // DD/MM/AAAA

  // Resumo do atendimento
  clienteNome: string
  clienteDoc: string
  clienteTelefone: string
  enderecoUsina: string
  dataAtendimento: string // DD/MM/AAAA
  horarioInicioTermino: string // ex: 13:30 às 14:42 (Duração: 01h12min)
  tipoServico: string // ex: Manutenção preventiva — Limpeza de módulos
  concessionariaUc: string // ex: RGE • UC: 4004280183
  dadosSistemaGerador: string // ex: Potência: 2,00 kWp • 5 módulos TSUN • Inversor Solis • Estrutura: Telhado cerâmico

  // Badges de status
  situacaoAtendimento: 'CONCLUÍDO' | 'EM ANDAMENTO'
  condicaoSistema: 'EM OPERAÇÃO' | 'EM AVALIAÇÃO' | 'PARALISADO'

  // Serviços executados
  servicosExecutados: ServicoExecutadoRelatorio[]

  // Detalhes da limpeza
  modulosPrevistosAtendidos: string
  metodoExecutado: string
  manualFabricante: string
  ressalvasObservadas: string

  // Condição do sistema por componente
  componentes: ComponenteCondicaoRelatorio[]

  // Registro fotográfico
  fotos: FotoRegistroRelatorio[]
  fotosPorEtapa?: GrupoFotosEtapaRelatorio[]
  fotosGeraisSemEtapa?: FotoRegistroRelatorio[]

  // Pendências e recomendações
  conformidadeTecnica: string
  proximaManutencao: string // DD/MM/AAAA (data real da próxima manutenção ou fallback)
  proximaManutencaoPeriodicidade: string // periodicidade conforme plano (anual, semestral ou conforme plano)
  pendenciasRecomendacoes?: string

  // Conclusão técnica
  conclusaoNarrativa: string
  conclusaoSituacao: string
  conclusaoCondicao: string
  conclusaoDesempenho: string

  // Próximos passos
  proximosPassosTexto: string
  temContratoOMAtivo?: boolean
  exibirPlanoOM?: boolean
  planoOmTitulo: string
  planoOmTexto: string
  planoOmContato: string

  // Recebimento do cliente
  formaEDataEnvio: string
  recebidoPor: string

  // Solicitação de Avaliação no Google
  solicitarAvaliacaoGoogle?: boolean
  avaliacaoGoogleTitulo?: string
  avaliacaoGoogleTexto?: string
  avaliacaoGoogleLink?: string

  // Equipamentos da Usina (Inversores e Módulos fotovoltaicos da usina vinculada à OS)
  equipamentosUsina?: EquipamentosUsinaRelatorio
}

/**
 * Normaliza e compila os dados reais da OS, Cliente e Sistema para o modelo canônico Delfos Solar.
 */
import {
  resolverEquipamentosUsina,
  type EquipamentosUsinaRelatorio,
  type InversorEquipamentoRelatorio,
  type ModuloEquipamentoRelatorio,
} from './usinaEquipamentosResolver'

export type { EquipamentosUsinaRelatorio, InversorEquipamentoRelatorio, ModuloEquipamentoRelatorio }

export interface CompilarDadosRelatorioOSOptions {
  clientePossuiContratoOMAtivo?: boolean
  contratoOM?: any
  contrato?: any
  proximaAtividadeData?: string
  proximaManutencaoData?: string
  atividadesCliente?: any[]
  atividades?: any[]
  equipamentosUsina?: any[]
  ativosUsina?: any[]
  inversoresLista?: any[]
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

export function compilarDadosRelatorioOS(
  os: any,
  cliente: any,
  sistema: any,
  fotosDataUrls: string[] = [],
  opcoes?: CompilarDadosRelatorioOSOptions,
): RelatorioOSCanonicalData {
  const osId = String(os?.id || '')
  const osIdCurto = osId ? osId.slice(-6).toUpperCase() : '000000'
  const osCodigo = `#${osIdCurto}`

  // Ano de referência da emissão
  const dataRef = os?.concluida_em || os?.updated || os?.created || new Date().toISOString()
  const dObj = new Date(dataRef)
  const ano = isNaN(dObj.getFullYear()) ? new Date().getFullYear() : dObj.getFullYear()
  const numeroRelatorio = `REL-${ano}-${osIdCurto}`
  const revisao = '01'

  const hoje = new Date()
  const dataEmissao = hoje.toLocaleDateString('pt-BR')

  // Cliente
  const clienteNome = cliente?.nome || cliente?.razao_social || os?.cliente_nome || '—'
  const clienteDoc = cliente?.cpf || cliente?.cnpj || ''
  const clienteTelefone = cliente?.whatsapp || cliente?.telefone || '—'

  // Endereço da usina
  const cidadeEstado = cliente?.cidade
    ? `${cliente.cidade}/${cliente.estado || 'RS'}`
    : sistema?.cidade
      ? `${sistema.cidade}/RS`
      : '—'
  let enderecoClienteFormatado = ''
  if (cliente?.endereco) {
    const rawNum = (cliente.numero || '').trim()
    const numFmt = rawNum && rawNum.toUpperCase() !== 'S/N' ? `nº ${rawNum}` : ''
    const partesEnd = [cliente.endereco, numFmt, cliente.bairro].filter(Boolean)
    enderecoClienteFormatado = partesEnd.join(', ')
  }

  const enderecoBase =
    os?.endereco ||
    os?.endereco_uc ||
    sistema?.endereco ||
    enderecoClienteFormatado ||
    cliente?.endereco ||
    ''
  const enderecoUsina = enderecoBase
    ? cidadeEstado && cidadeEstado !== '—' && !enderecoBase.includes(cidadeEstado)
      ? `${enderecoBase} – ${cidadeEstado}`
      : enderecoBase
    : cidadeEstado && cidadeEstado !== '—'
      ? cidadeEstado
      : 'Não informado'

  // Data do atendimento: priorizar data_finalizacao manual (admin), seguida pela data agendada ou created,
  // convertendo de UTC para São Paulo (UTC-3). NUNCA usar dataEmissao como fallback da data do atendimento.
  const dataAtendimentoRaw =
    (os as any)?.data_finalizacao || (os as any)?.data || os?.data_agendada || os?.created
  let dataAtendimento = 'Não informada'
  if (dataAtendimentoRaw) {
    try {
      const d = new Date(dataAtendimentoRaw)
      if (!isNaN(d.getTime())) {
        // Deslocamento determinístico para UTC-3 (São Paulo)
        const spMs = d.getTime() - 3 * 60 * 60 * 1000
        const spDate = new Date(spMs)
        const dia = String(spDate.getUTCDate()).padStart(2, '0')
        const mes = String(spDate.getUTCMonth() + 1).padStart(2, '0')
        const ano = spDate.getUTCFullYear()
        dataAtendimento = `${dia}/${mes}/${ano}`
      }
    } catch {
      /* ignore */
    }
  }

  // Horários e duração
  let horarioInicio: string | null = null
  let horarioFim: string | null = null
  let duracaoStr: string | null = null
  let dataInicioRealObj: Date | null = null

  // 1. Ler PRIMEIRO os campos nativos do registro (os.horario_inicio, os.horario_fim, os.duracao_minutos)
  if (os?.horario_inicio && typeof os.horario_inicio === 'string' && os.horario_inicio.trim()) {
    const rawIni = os.horario_inicio.trim()
    const m = rawIni.match(/(\d{1,2}:\d{2})/)
    if (m) {
      horarioInicio = m[1].padStart(5, '0')
    }
  }

  if (os?.horario_fim && typeof os.horario_fim === 'string' && os.horario_fim.trim()) {
    const rawFim = os.horario_fim.trim()
    const m = rawFim.match(/(\d{1,2}:\d{2})/)
    if (m) {
      horarioFim = m[1].padStart(5, '0')
    }
  }

  if (
    typeof os?.duracao_minutos === 'number' &&
    !isNaN(os.duracao_minutos) &&
    os.duracao_minutos > 0
  ) {
    const durMinTotal = Math.floor(os.duracao_minutos)
    const horas = Math.floor(durMinTotal / 60)
    const minutos = durMinTotal % 60
    duracaoStr = `${String(horas).padStart(2, '0')}h${String(minutos).padStart(2, '0')}min`
  } else if (horarioInicio && horarioFim) {
    // Se não houver duracao_minutos preenchida manualmente, recalcula a partir de horarioInicio e horarioFim
    const [hIni, mIni] = horarioInicio.split(':').map((v) => parseInt(v, 10))
    const [hFim, mFim] = horarioFim.split(':').map((v) => parseInt(v, 10))
    if (!isNaN(hIni) && !isNaN(mIni) && !isNaN(hFim) && !isNaN(mFim)) {
      const minIni = hIni * 60 + mIni
      const minFim = hFim * 60 + mFim
      const diffMin = minFim >= minIni ? minFim - minIni : 24 * 60 - minIni + minFim
      if (diffMin > 0) {
        const horas = Math.floor(diffMin / 60)
        const minutos = diffMin % 60
        duracaoStr = `${String(horas).padStart(2, '0')}h${String(minutos).padStart(2, '0')}min`
      }
    }
  }

  // 2. Fallbacks secundários se não preenchidos nativamente:
  // Tenta extrair do texto detalhes_execucao se houver "[INÍCIO DO ATENDIMENTO: ...]"
  const detalhesRaw = String(os?.detalhes_execucao || os?.observacoes || os?.descricao || '')
  const matchInicio = detalhesRaw.match(/\[INÍCIO DO ATENDIMENTO:\s*([^\]]+)\]/i)

  if (!horarioInicio && matchInicio && matchInicio[1]) {
    const rawInicio = matchInicio[1].trim()
    const matchHora = rawInicio.match(/(\d{1,2}:\d{2})/)
    if (matchHora) {
      horarioInicio = matchHora[1].padStart(5, '0')
    }
    // Tenta montar Date para início se houver data/hora completa no match
    try {
      const dMatch = new Date(rawInicio)
      if (!isNaN(dMatch.getTime())) {
        dataInicioRealObj = dMatch
      }
    } catch {
      /* ignore */
    }
  }

  if (!horarioInicio && os?.data_agendada) {
    try {
      const d = new Date(os.data_agendada)
      if (!isNaN(d.getTime())) {
        // Formatar em UTC-3 determinístico
        const spMs = d.getTime() - 3 * 60 * 60 * 1000
        const spDate = new Date(spMs)
        const hh = String(spDate.getUTCHours()).padStart(2, '0')
        const mm = String(spDate.getUTCMinutes()).padStart(2, '0')
        horarioInicio = `${hh}:${mm}`
        dataInicioRealObj = d
      }
    } catch {
      /* ignore */
    }
  }

  if (!horarioFim && os?.concluida_em) {
    try {
      const dFim = new Date(os.concluida_em)
      if (!isNaN(dFim.getTime())) {
        const spMs = dFim.getTime() - 3 * 60 * 60 * 1000
        const spDate = new Date(spMs)
        const hh = String(spDate.getUTCHours()).padStart(2, '0')
        const mm = String(spDate.getUTCMinutes()).padStart(2, '0')
        horarioFim = `${hh}:${mm}`
        // Se houver data real para início e duracaoStr ainda não foi resolvida, calcula a duração real
        if (!duracaoStr) {
          const dIniParaCalculo =
            dataInicioRealObj || (os.data_agendada ? new Date(os.data_agendada) : null)
          if (dIniParaCalculo && !isNaN(dIniParaCalculo.getTime())) {
            const diffMs = Math.max(0, dFim.getTime() - dIniParaCalculo.getTime())
            const diffMinTotal = Math.floor(diffMs / 60000)
            const horas = Math.floor(diffMinTotal / 60)
            const minutos = diffMinTotal % 60
            duracaoStr = `${String(horas).padStart(2, '0')}h${String(minutos).padStart(2, '0')}min`
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Montagem da string de horário de início, término e duração (independentes)
  let horarioInicioTermino = 'Não informado'
  if (horarioInicio && horarioFim) {
    horarioInicioTermino = duracaoStr
      ? `${horarioInicio} às ${horarioFim} (Duração: ${duracaoStr})`
      : `${horarioInicio} às ${horarioFim}`
  } else if (horarioInicio) {
    horarioInicioTermino = `Início: ${horarioInicio} (Término não informado)`
  } else if (horarioFim) {
    horarioInicioTermino = `Término: ${horarioFim} (Início não informado)`
  }

  // Tipo de serviço canônico (sem heurística de os.titulo)
  const tipoCanonicoRaw = String(os?.tipo_custom_id || os?.tipo || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')

  let rotuloTipo = os?.tipo_servico || ''
  if (!rotuloTipo) {
    if (tipoCanonicoRaw === 'limpeza') {
      rotuloTipo = 'Manutenção preventiva — Limpeza de módulos'
    } else if (tipoCanonicoRaw === 'manutencao_preventiva') {
      rotuloTipo = 'Manutenção preventiva técnica'
    } else if (tipoCanonicoRaw === 'manutencao_corretiva') {
      rotuloTipo = 'Manutenção corretiva'
    } else if (
      tipoCanonicoRaw === 'limpeza_manutencao' ||
      tipoCanonicoRaw === 'limpeza_e_manutencao'
    ) {
      rotuloTipo = 'Limpeza e Manutenção Preventiva'
    } else if (tipoCanonicoRaw) {
      rotuloTipo = safeStr(os?.tipo_custom_id || os?.tipo)
    } else {
      rotuloTipo = 'Não informado'
    }
  }

  // Título real do registro (os.titulo ou atividade.titulo) para exibição aditiva
  const tituloRegistro = safeStr(os?.titulo || os?.atividade_titulo || os?.nome)

  // Formato: "Rotulo do Tipo — {titulo}". Sem título -> só o rótulo do tipo; sem tipo -> 'Não informado'
  let tipoServico = rotuloTipo
  if (rotuloTipo && rotuloTipo !== 'Não informado') {
    if (tituloRegistro && tituloRegistro.toLowerCase() !== rotuloTipo.toLowerCase()) {
      tipoServico = `${rotuloTipo} — ${tituloRegistro}`
    } else {
      tipoServico = rotuloTipo
    }
  } else if (tituloRegistro) {
    tipoServico = tituloRegistro
  } else {
    tipoServico = 'Não informado'
  }

  // Concessionária & UC
  const concessionaria = sistema?.concessionaria || cliente?.concessionaria || '—'
  const uc = sistema?.numero_uc || cliente?.uc || '—'
  const concessionariaUc =
    concessionaria === '—' && uc === '—'
      ? '—'
      : concessionaria !== '—' && uc !== '—'
        ? `${concessionaria} • UC: ${uc}`
        : concessionaria !== '—'
          ? concessionaria
          : `UC: ${uc}`

  // Dados do sistema gerador (vêm EXCLUSIVAMENTE da usina vinculada e do cliente real)
  const potenciaRaw = sistema?.potencia_total_kwp ?? cliente?.potencia_kwp ?? null
  const potenciaFormatada =
    potenciaRaw !== null && potenciaRaw !== undefined && potenciaRaw !== ''
      ? typeof potenciaRaw === 'number'
        ? potenciaRaw.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : String(potenciaRaw).replace('.', ',')
      : null

  const qtdModulosRaw = sistema?.quantidade_modulos ?? cliente?.placas_qtd ?? null
  const qtdModulos =
    qtdModulosRaw !== null && qtdModulosRaw !== undefined && qtdModulosRaw !== ''
      ? String(qtdModulosRaw)
      : '—'

  const marcaModulos =
    sistema?.fabricante_modulos ||
    sistema?.marca_placas ||
    cliente?.marca_placas ||
    cliente?.fabricante_modulos ||
    '—'

  const inversor =
    sistema?.fabricante_inversores || sistema?.inversor_marca || cliente?.inversor_marca || '—'

  const tipoEstruturaRaw = sistema?.tipo_telhado || cliente?.telhado_tipo || ''
  const tipoEstruturaNorm = tipoEstruturaRaw.toLowerCase().trim()
  const estruturaFormatada = !tipoEstruturaNorm
    ? '—'
    : tipoEstruturaNorm.includes('solo')
      ? 'Solo'
      : tipoEstruturaNorm.includes('metal')
        ? 'Telhado metálico'
        : tipoEstruturaNorm.includes('fibrocimento')
          ? 'Fibrocimento'
          : tipoEstruturaNorm.includes('ceramico') || tipoEstruturaNorm.includes('cerâmica')
            ? 'Telhado cerâmico'
            : tipoEstruturaRaw

  // Montagem de dadosSistemaGerador omitindo partes sem dado
  const partesSistema: string[] = []
  if (potenciaFormatada) {
    partesSistema.push(`Potência: ${potenciaFormatada} kWp`)
  }
  if (qtdModulos !== '—' && marcaModulos !== '—') {
    partesSistema.push(`${qtdModulos} módulos ${marcaModulos}`)
  } else if (qtdModulos !== '—') {
    partesSistema.push(`${qtdModulos} módulos`)
  } else if (marcaModulos !== '—') {
    partesSistema.push(`Módulos ${marcaModulos}`)
  }

  if (inversor !== '—') {
    partesSistema.push(`Inversor ${inversor}`)
  }
  if (estruturaFormatada !== '—') {
    partesSistema.push(`Estrutura: ${estruturaFormatada}`)
  }

  const dadosSistemaGerador = partesSistema.length > 0 ? partesSistema.join(' • ') : '—'

  // Situação do atendimento e condição do sistema
  const isConcluida =
    os?.status === 'concluida' || os?.status === 'finalizada' || Boolean(os?.concluida)
  const situacaoAtendimento: 'CONCLUÍDO' | 'EM ANDAMENTO' = isConcluida
    ? 'CONCLUÍDO'
    : 'EM ANDAMENTO'
  const condicaoSistema: 'EM OPERAÇÃO' | 'EM AVALIAÇÃO' | 'PARALISADO' = isConcluida
    ? 'EM OPERAÇÃO'
    : 'EM AVALIAÇÃO'

  // Limpa o texto de detalhes
  const observacoesLimpas = detalhesRaw.replace(/\[INÍCIO DO ATENDIMENTO:[^\]]+\]\s*/gi, '').trim()

  // Normalizador de texto para comparação tolerante a acentos, pontuação, múltiplos espaços e caixa alta/baixa
  const normalizarTexto = (txt?: any): string => {
    if (!txt) return ''
    return String(txt)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove diacríticos/acentos
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ') // substitui pontuação por espaço
      .replace(/\s+/g, ' ')
      .trim()
  }

  // Metadados persistidos das fotos (vínculo com etapas do checklist)
  const fotosMetadadosRaw: any[] = Array.isArray(os?.fotos_metadados)
    ? os.fotos_metadados
    : typeof os?.fotos_metadados === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(os.fotos_metadados)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      : []

  // Checklist da OS normalizado PRESERVANDO o id original se fornecido
  let checklistItens: OSChecklistItem[] = []
  if (Array.isArray(os?.checklist)) {
    checklistItens = os.checklist
  } else if (typeof os?.checklist === 'string' && os.checklist.trim()) {
    try {
      const parsed = JSON.parse(os.checklist)
      if (Array.isArray(parsed)) checklistItens = parsed
    } catch {
      /* ignore */
    }
  }

  // Itens marcados como excluídos são omitidos do relatório (id permanece nos dados para fotos vinculadas)
  checklistItens = checklistItens
    .filter((item) => !(item as any)?.excluido)
    .map((item, idx) => {
      const rawId =
        item?.id !== undefined && item?.id !== null && String(item.id).trim() !== ''
          ? String(item.id).trim()
          : undefined
      const rawDescCliente =
        (item as any)?.descricao_cliente || (item as any)?.descricaoCliente || undefined
      const descCliente =
        rawDescCliente && String(rawDescCliente).trim() ? String(rawDescCliente).trim() : undefined
      const itemTexto = String(
        item?.item ||
          (item as any)?.texto ||
          (item as any)?.descricao ||
          (item as any)?.nome ||
          `Item ${idx + 1}`,
      ).trim()

      return {
        ...item,
        id: rawId || `chk_${idx + 1}`,
        item: itemTexto,
        concluido: Boolean(item?.concluido),
        ...(descCliente ? { descricao_cliente: descCliente } : {}),
      }
    })

  // Registro fotográfico: lista de fotos na mesma ordem em que aparecem no Registro Fotográfico
  const fotosUrls = fotosDataUrls || []
  const fotos: FotoRegistroRelatorio[] = []

  // Contadores para numeração sequencial dentro de cada atividade e fotos gerais
  const contagemPorEtapa = new Map<string, number>()
  let contadorGeralFotos = 0
  const metadadosUsados = new Set<number>()

  if (fotosUrls.length > 0) {
    fotosUrls.forEach((url, i) => {
      // Extrair o nome do arquivo da URL (ex: 'https://.../api/files/.../nome_do_arquivo.jpg?token=...' -> 'nome_do_arquivo.jpg')
      const extrairNomeArquivoDaUrl = (u: string): string => {
        try {
          const limpo = u.split('?')[0].split('#')[0]
          const partes = limpo.split('/')
          const ultimo = partes[partes.length - 1] || ''
          return decodeURIComponent(ultimo).toLowerCase().trim()
        } catch {
          return ''
        }
      }

      const nomeUrl = extrairNomeArquivoDaUrl(url)

      // Casamento foto→metadado em cascata:
      // (a) Igualdade exata de m.arquivo === nomeUrl (ou m.arquivo contido na URL decodificada)
      let metaIndex = fotosMetadadosRaw.findIndex((m: any, mIdx: number) => {
        if (!m || metadadosUsados.has(mIdx)) return false
        const nomeM = String(m.arquivo || m.nome_arquivo || m.nome || '')
          .trim()
          .toLowerCase()
        if (!nomeM) return false
        if (nomeUrl && nomeUrl === nomeM) return true
        try {
          const decoded = decodeURIComponent(url).toLowerCase()
          if (decoded.includes(nomeM)) return true
        } catch {
          if (url.toLowerCase().includes(nomeM)) return true
        }
        return false
      })

      // (b) Sufixo/terminação comum (PocketBase costuma prefixar hash aleatório no upload: [hash]_[nome_original].ext)
      if (metaIndex < 0) {
        metaIndex = fotosMetadadosRaw.findIndex((m: any, mIdx: number) => {
          if (!m || metadadosUsados.has(mIdx)) return false
          const nomeM = String(m.arquivo || m.nome_arquivo || m.nome || '')
            .trim()
            .toLowerCase()
          if (!nomeM || nomeM.length < 3) return false
          const baseM = nomeM.replace(/\.[a-z0-9]+$/, '')
          const baseU = nomeUrl ? nomeUrl.replace(/\.[a-z0-9]+$/, '') : ''

          if (nomeUrl && (nomeUrl.endsWith(nomeM) || nomeM.endsWith(nomeUrl))) return true
          if (baseM.length >= 3 && baseU && (baseU.endsWith(baseM) || baseM.endsWith(baseU)))
            return true
          try {
            const decoded = decodeURIComponent(url).toLowerCase()
            if (baseM.length >= 3 && decoded.includes(baseM)) return true
          } catch {
            /* ignore */
          }
          return false
        })
      }

      // (c) Alinhamento posicional: se mesma quantidade ou se o índice i está livre
      if (
        metaIndex < 0 &&
        fotosMetadadosRaw.length === fotosUrls.length &&
        fotosMetadadosRaw[i] &&
        !metadadosUsados.has(i)
      ) {
        metaIndex = i
      } else if (metaIndex < 0 && fotosMetadadosRaw[i] && !metadadosUsados.has(i)) {
        metaIndex = i
      }

      // (d) Primeiro metadado livre ainda não consumido
      if (metaIndex < 0) {
        metaIndex = fotosMetadadosRaw.findIndex((_, mIdx) => !metadadosUsados.has(mIdx))
      }

      let meta: any = {}
      if (metaIndex >= 0) {
        metadadosUsados.add(metaIndex)
        meta = fotosMetadadosRaw[metaIndex] || {}
      } else {
        meta = fotosMetadadosRaw[i] || {}
      }

      // Fonte primária do vínculo é SEMPRE o item_checklist_id / etapa dos metadados
      let itemChecklistId: string | undefined = meta.item_checklist_id
        ? String(meta.item_checklist_id).trim()
        : meta.etapa
          ? String(meta.etapa).trim()
          : undefined
      let itemChecklistTexto: string | undefined = meta.item_checklist_texto
        ? String(meta.item_checklist_texto).trim()
        : meta.etapa_texto
          ? String(meta.etapa_texto).trim()
          : undefined
      const legendaCustom = meta.legenda ? String(meta.legenda).trim() : ''
      const numeroGlobal = i + 1

      // Determinar a qual atividade do checklist este item se refere (índice 1-based)
      let atividadeNum: number | null = null
      let matchedChecklistIdx = -1

      if (checklistItens.length > 0) {
        const idMetaNorm = normalizarTexto(itemChecklistId)
        const textoMetaNorm = normalizarTexto(itemChecklistTexto)

        // 1. Por ID exato
        if (itemChecklistId) {
          matchedChecklistIdx = checklistItens.findIndex(
            (chk) => String(chk.id).trim() === itemChecklistId,
          )
        }

        // 2. Por prefixo coincidente + ordinal numérico
        // Ex: meta "chk_limp_1" só casa com chk "chk_limp_1" (ou mesmo prefixo 'chk_limp_').
        // NUNCA casar "chk_insp_1" com "chk_limp_1" apenas pelo ordinal final '1'!
        if (matchedChecklistIdx < 0 && itemChecklistId) {
          const matchMetaPrefixo = itemChecklistId.match(/^(.*?)_?(\d+)$/)
          if (matchMetaPrefixo) {
            const prefixoMeta = matchMetaPrefixo[1].toLowerCase()
            const ordinalMeta = parseInt(matchMetaPrefixo[2], 10)

            matchedChecklistIdx = checklistItens.findIndex((chk) => {
              const chkIdStr = String(chk.id || '').trim()
              const matchChkPrefixo = chkIdStr.match(/^(.*?)_?(\d+)$/)
              if (!matchChkPrefixo) return false
              const prefixoChk = matchChkPrefixo[1].toLowerCase()
              const ordinalChk = parseInt(matchChkPrefixo[2], 10)

              // Só compara ordinal se os prefixos forem equivalentes (ou ambos genéricos tipo 'chk' / 'item')
              const prefixosIguais =
                prefixoMeta === prefixoChk ||
                (prefixoMeta.startsWith('chk_') &&
                  prefixoChk.startsWith('chk_') &&
                  prefixoMeta === prefixoChk) ||
                ((prefixoMeta === 'chk' || prefixoMeta === 'item' || prefixoMeta === '') &&
                  (prefixoChk === 'chk' || prefixoChk === 'item' || prefixoChk === ''))

              return prefixosIguais && ordinalMeta === ordinalChk
            })
          }
        }

        // 3. Casamento textual bidirecional:
        // O texto do metadado pode ser a variante cliente (descricao_cliente) ou técnica (item.item).
        // Normaliza e testa contido/contém em AMBAS as variantes.
        if (matchedChecklistIdx < 0 && textoMetaNorm) {
          // 3a. Igualdade total com item ou descricao_cliente
          matchedChecklistIdx = checklistItens.findIndex((chk) => {
            const tItemNorm = normalizarTexto(chk.item)
            const tDescNorm = normalizarTexto((chk as any).descricao_cliente)
            return (
              (tItemNorm && tItemNorm === textoMetaNorm) ||
              (tDescNorm && tDescNorm === textoMetaNorm)
            )
          })

          // 3b. Contido / contém bidirecional
          if (matchedChecklistIdx < 0 && textoMetaNorm.length >= 4) {
            matchedChecklistIdx = checklistItens.findIndex((chk) => {
              const tItemNorm = normalizarTexto(chk.item)
              const tDescNorm = normalizarTexto((chk as any).descricao_cliente)
              const matchItem =
                tItemNorm &&
                tItemNorm.length >= 4 &&
                (tItemNorm.includes(textoMetaNorm) || textoMetaNorm.includes(tItemNorm))
              const matchDesc =
                tDescNorm &&
                tDescNorm.length >= 4 &&
                (tDescNorm.includes(textoMetaNorm) || textoMetaNorm.includes(tDescNorm))
              return Boolean(matchItem || matchDesc)
            })
          }
        }

        // 4. Se itemChecklistId for na verdade o texto do item ou da descrição
        if (matchedChecklistIdx < 0 && idMetaNorm && idMetaNorm.length >= 4) {
          matchedChecklistIdx = checklistItens.findIndex((chk) => {
            const tItemNorm = normalizarTexto(chk.item)
            const tDescNorm = normalizarTexto((chk as any).descricao_cliente)
            return (
              tItemNorm === idMetaNorm ||
              tDescNorm === idMetaNorm ||
              (tItemNorm && (tItemNorm.includes(idMetaNorm) || idMetaNorm.includes(tItemNorm))) ||
              (tDescNorm && (tDescNorm.includes(idMetaNorm) || idMetaNorm.includes(tDescNorm)))
            )
          })
        }

        // 5. Por propriedade item_index / etapa_index no metadado
        if (matchedChecklistIdx < 0) {
          const rawIdx = (meta as any).item_index ?? (meta as any).etapa_index
          if (typeof rawIdx === 'number' && rawIdx >= 0 && rawIdx < checklistItens.length) {
            matchedChecklistIdx = rawIdx
          }
        }
      }

      if (matchedChecklistIdx >= 0) {
        atividadeNum = matchedChecklistIdx + 1
        itemChecklistId = checklistItens[matchedChecklistIdx].id
        itemChecklistTexto = checklistItens[matchedChecklistIdx].item
      }

      let titulo = `Foto ${numeroGlobal}`
      let subtitulo = itemChecklistTexto
        ? `Etapa: ${itemChecklistTexto}`
        : `Registro da OS ${osCodigo}`
      let desc =
        legendaCustom ||
        'Registro fotográfico das condições de campo durante a execução dos serviços.'

      if (atividadeNum !== null) {
        const chaveAtiv = itemChecklistId || `ativ-${atividadeNum}`
        const proxM = (contagemPorEtapa.get(chaveAtiv) || 0) + 1
        contagemPorEtapa.set(chaveAtiv, proxM)
        titulo = `Atividade ${atividadeNum} — Foto ${proxM}`
        subtitulo = itemChecklistTexto || `Atividade ${atividadeNum}`
      } else if (itemChecklistTexto) {
        const proxM = (contagemPorEtapa.get(itemChecklistTexto) || 0) + 1
        contagemPorEtapa.set(itemChecklistTexto, proxM)
        titulo = `${itemChecklistTexto} — Foto ${proxM}`
        subtitulo = itemChecklistTexto
      } else {
        contadorGeralFotos += 1
        titulo = `Foto ${contadorGeralFotos}`
        subtitulo = `Registro da OS ${osCodigo}`
      }

      const dataHoraStr = meta.data_hora
        ? new Date(meta.data_hora).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }) + ' • Técnico executor'
        : `${dataAtendimento} às ${horarioInicio} • Técnico executor`

      fotos.push({
        id: meta.id || String(numeroGlobal),
        url,
        titulo,
        subtitulo,
        descricao: desc,
        dataHora: dataHoraStr,
        item_checklist_id: itemChecklistId,
        item_checklist_texto: itemChecklistTexto,
        numeroGlobal,
      })
    })
  } else {
    // 3 registros padrão com placeholder ilustrativo elegante
    const subtituloFoto1 =
      marcaModulos !== '—' && estruturaFormatada !== '—'
        ? `Módulos ${marcaModulos} (${estruturaFormatada})`
        : marcaModulos !== '—'
          ? `Módulos ${marcaModulos}`
          : estruturaFormatada !== '—'
            ? `Módulos (${estruturaFormatada})`
            : 'Módulos fotovoltaicos'

    const subtituloFoto2 =
      marcaModulos !== '—' ? `Módulos ${marcaModulos} — Conclusão` : 'Módulos — Conclusão'

    const subtituloFoto3 =
      estruturaFormatada !== '—'
        ? `Estrutura (${estruturaFormatada}) e Conexões MC4`
        : 'Estrutura e Conexões MC4'

    const descFoto1 =
      qtdModulos !== '—' && marcaModulos !== '—'
        ? `Vista geral dos ${qtdModulos} módulos ${marcaModulos} antes do procedimento de manutenção. Presença de camada de poeira e sujidade superficial pré-intervenção.`
        : qtdModulos !== '—'
          ? `Vista geral dos ${qtdModulos} módulos antes do procedimento de manutenção. Presença de camada de poeira e sujidade superficial pré-intervenção.`
          : 'Vista geral dos módulos antes do procedimento de manutenção. Presença de camada de poeira e sujidade superficial pré-intervenção.'

    const descFoto3 =
      estruturaFormatada !== '—'
        ? `Inspeção detalhada de fixadores no ${estruturaFormatada.toLowerCase()} e integridade do chicote elétrico acessível do arranjo.`
        : 'Inspeção detalhada de fixadores na estrutura e integridade do chicote elétrico acessível do arranjo.'

    const horaFoto1 = horarioInicio
      ? `${dataAtendimento} às ${horarioInicio} • Técnico executor`
      : `${dataAtendimento} • Técnico executor`
    const horaFotoFim = horarioFim
      ? `${dataAtendimento} às ${horarioFim} • Técnico executor`
      : `${dataAtendimento} • Técnico executor`

    fotos.push(
      {
        id: '1',
        url: '',
        titulo: 'Atividade 1 — Foto 1',
        subtitulo: subtituloFoto1,
        descricao: descFoto1,
        dataHora: horaFoto1,
        item_checklist_id: checklistItens[0]?.id,
        item_checklist_texto: checklistItens[0]?.item,
        numeroGlobal: 1,
      },
      {
        id: '2',
        url: '',
        titulo: 'Atividade 1 — Foto 2',
        subtitulo: subtituloFoto2,
        descricao:
          'Superfície dos módulos após lavagem e escovação técnica com cerdas macias e água limpa. Remoção completa de impurezas conforme manual técnico.',
        dataHora: horaFotoFim,
        item_checklist_id: checklistItens[0]?.id,
        item_checklist_texto: checklistItens[0]?.item,
        numeroGlobal: 2,
      },
      {
        id: '3',
        url: '',
        titulo: 'Atividade 2 — Foto 1',
        subtitulo: subtituloFoto3,
        descricao: descFoto3,
        dataHora: horaFotoFim,
        item_checklist_id: checklistItens[1]?.id,
        item_checklist_texto: checklistItens[1]?.item,
        numeroGlobal: 3,
      },
    )
  }

  // Mapear números das fotos vinculadas para cada etapa (1-based no registro fotográfico geral)
  const formatarEvidenciaEtapa = (
    itemId?: string,
    itemTexto?: string,
    itemIdx?: number,
    itemDescCliente?: string,
    fallbackEvidencia = 'Registro no checklist',
  ): string => {
    const indicesFotos: number[] = []
    const tNorm = normalizarTexto(itemTexto)
    const dNorm = normalizarTexto(itemDescCliente)
    const idNorm = itemId ? String(itemId).trim() : ''

    // Prefixo e ordinal numérico deste item se houver
    let prefixoEsperado = ''
    let ordinalEsperado: number | null = null
    if (idNorm) {
      const matchP = idNorm.match(/^(.*?)_?(\d+)$/)
      if (matchP) {
        prefixoEsperado = matchP[1].toLowerCase()
        ordinalEsperado = parseInt(matchP[2], 10)
      }
    }
    if (ordinalEsperado === null && itemIdx !== undefined) {
      prefixoEsperado = 'chk'
      ordinalEsperado = itemIdx + 1
    }

    fotos.forEach((f, idx) => {
      const numFoto = f.numeroGlobal || idx + 1
      let pertence = false

      const fIdNorm = f.item_checklist_id ? String(f.item_checklist_id).trim() : ''
      const fTextoNorm = normalizarTexto(f.item_checklist_texto)

      // 1. Igualdade direta por ID
      if (idNorm && fIdNorm && fIdNorm === idNorm) {
        pertence = true
      }

      // 2. Por prefixo coincidente + ordinal do ID (ex: chk_limp_2 casando com chk_limp_2, mas NÃO chk_insp_2)
      if (!pertence && ordinalEsperado !== null && fIdNorm) {
        const matchF = fIdNorm.match(/^(.*?)_?(\d+)$/)
        if (matchF) {
          const prefixoF = matchF[1].toLowerCase()
          const ordF = parseInt(matchF[2], 10)
          const prefixosCompativeis =
            prefixoEsperado === prefixoF ||
            (prefixoEsperado.startsWith('chk_') &&
              prefixoF.startsWith('chk_') &&
              prefixoEsperado === prefixoF) ||
            ((prefixoEsperado === 'chk' || prefixoEsperado === 'item' || prefixoEsperado === '') &&
              (prefixoF === 'chk' || prefixoF === 'item' || prefixoF === ''))

          if (prefixosCompativeis && ordF === ordinalEsperado) {
            pertence = true
          }
        }
      }

      // 3. Por texto do item técnico ou descrição do cliente (bidirecional)
      if (!pertence && fTextoNorm) {
        if (
          tNorm &&
          (fTextoNorm === tNorm ||
            (fTextoNorm.length >= 4 &&
              tNorm.length >= 4 &&
              (fTextoNorm.includes(tNorm) || tNorm.includes(fTextoNorm))))
        ) {
          pertence = true
        } else if (
          dNorm &&
          (fTextoNorm === dNorm ||
            (fTextoNorm.length >= 4 &&
              dNorm.length >= 4 &&
              (fTextoNorm.includes(dNorm) || dNorm.includes(fTextoNorm))))
        ) {
          pertence = true
        }
      }

      // 4. Por f.item_checklist_id contendo texto da etapa ou descrição
      if (!pertence && fIdNorm) {
        const fIdTextNorm = normalizarTexto(fIdNorm)
        if (
          tNorm &&
          fIdTextNorm &&
          (fIdTextNorm === tNorm ||
            (fIdTextNorm.length >= 4 &&
              tNorm.length >= 4 &&
              (fIdTextNorm.includes(tNorm) || tNorm.includes(fIdTextNorm))))
        ) {
          pertence = true
        } else if (
          dNorm &&
          fIdTextNorm &&
          (fIdTextNorm === dNorm ||
            (fIdTextNorm.length >= 4 &&
              dNorm.length >= 4 &&
              (fIdTextNorm.includes(dNorm) || dNorm.includes(fIdTextNorm))))
        ) {
          pertence = true
        }
      }

      // 5. Fallback por chave ordinal se o fIdNorm for genérico tipo chk_X ou X
      if (!pertence && itemIdx !== undefined) {
        const chaveIdx = `chk_${itemIdx + 1}`
        if (
          fIdNorm === chaveIdx ||
          (fIdNorm === String(itemIdx + 1) && (!prefixoEsperado || prefixoEsperado === 'chk'))
        ) {
          pertence = true
        }
      }

      if (pertence && !indicesFotos.includes(numFoto)) {
        indicesFotos.push(numFoto)
      }
    })

    if (indicesFotos.length === 0) {
      return fallbackEvidencia
    }
    // Ordenar numericamente os índices das fotos
    indicesFotos.sort((a, b) => a - b)
    if (indicesFotos.length === 1) {
      return `Foto ${indicesFotos[0]}`
    }
    if (indicesFotos.length === 2) {
      return `Fotos ${indicesFotos[0]} e ${indicesFotos[1]}`
    }
    const ult = indicesFotos[indicesFotos.length - 1]
    const ant = indicesFotos.slice(0, -1).join(', ')
    return `Fotos ${ant} e ${ult}`
  }

  // Serviços executados: baseados no checklist da OS ou nos padrões do modelo
  let servicosExecutados: ServicoExecutadoRelatorio[] = []
  if (checklistItens.length > 0) {
    servicosExecutados = checklistItens.map((item, itemIdx) => {
      const text = item.item || ''
      const rawDescCliente =
        (item as any).descricao_cliente || (item as any).descricaoCliente || undefined
      const descCliente =
        rawDescCliente && String(rawDescCliente).trim() ? String(rawDescCliente).trim() : undefined
      const isLimpeza =
        text.toLowerCase().includes('limpeza') || text.toLowerCase().includes('lavagem')
      const isConectores =
        text.toLowerCase().includes('conector') ||
        text.toLowerCase().includes('fixador') ||
        text.toLowerCase().includes('estrutura')
      const isQuadro =
        text.toLowerCase().includes('quadro') ||
        text.toLowerCase().includes('disjuntor') ||
        text.toLowerCase().includes('aperto') ||
        text.toLowerCase().includes('inversor')

      let localAtivo = estruturaFormatada
      let qtd = `${qtdModulos} módulos`

      if (isQuadro) {
        localAtivo = 'Quadro DC/CA'
        qtd = '1 quadro'
      } else if (isConectores) {
        localAtivo = 'Estrutura de fixação'
        qtd = `${qtdModulos} módulos`
      } else if (isLimpeza) {
        localAtivo = estruturaFormatada
        qtd = `${qtdModulos} módulos`
      }

      const isConcluido = Boolean(item.concluido)

      return {
        // No relatório ao cliente, o descritivo para o cliente substitui a instrução interna quando preenchido
        atividade: descCliente || text,
        descricaoCliente: descCliente,
        localAtivo,
        quantidade: qtd,
        situacao: isConcluido ? 'Executado' : 'Pendente',
        evidencia: formatarEvidenciaEtapa(item.id, text, itemIdx, descCliente),
      }
    })
  }

  // Se não houver itens cadastrados no checklist da OS, preenche com a tríade canônica do modelo
  if (servicosExecutados.length === 0) {
    servicosExecutados = [
      {
        atividade: 'Limpeza dos módulos',
        descricaoCliente:
          'Lavagem técnica dos módulos fotovoltaicos com água desmineralizada/filtrada e escova macia.',
        localAtivo: estruturaFormatada,
        quantidade: `${qtdModulos} módulos`,
        situacao: 'Executado',
        evidencia: formatarEvidenciaEtapa(undefined, 'Fotos 1 e 2'),
      },
      {
        atividade: 'Verificação de conectores MC4 e fixadores',
        descricaoCliente:
          'Inspeção mecânica dos pontos de fixação e integridade dos conectores elétricos da usina.',
        localAtivo: 'Estrutura de fixação',
        quantidade: `${qtdModulos} módulos`,
        situacao: 'Executado',
        evidencia: formatarEvidenciaEtapa(undefined, 'Foto 3'),
      },
      {
        atividade: 'Verificação de conexões e reaperto de disjuntores',
        descricaoCliente:
          'Reaperto preventivo de bornes, terminais e disjuntores do quadro de proteção.',
        localAtivo: 'Quadro DC/CA',
        quantidade: '1 quadro',
        situacao: 'Executado',
        evidencia: 'Registro no checklist',
      },
    ]
  }

  // Detalhes da limpeza
  const modulosPrevistosAtendidos = `${qtdModulos} / ${qtdModulos} módulos`
  const metodoExecutado = 'Escova macia e água (sem produtos abrasivos)'
  const manualFabricante = `Procedimento padrão ${marcaModulos} / ${inversor}`
  const ressalvasObservadas = 'Nenhuma sujidade remanescente identificada'

  const pendenciasRecomendacoes =
    typeof os?.pendencias_recomendacoes === 'string' &&
    os.pendencias_recomendacoes.trim().length > 0
      ? os.pendencias_recomendacoes.trim()
      : undefined

  // Condição do sistema por componente
  const componentes: ComponenteCondicaoRelatorio[] = [
    {
      componente: 'Módulos fotovoltaicos',
      abrangencia: 'Inspeção visual + limpeza',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Fotos 1–3',
    },
    {
      componente: 'Estruturas e fixações',
      abrangencia: 'Inspeção visual',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Foto 3',
    },
    {
      componente: 'Cabos e conectores acessíveis',
      abrangencia: 'Inspeção visual',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Foto 3',
    },
    {
      componente: 'Inversor e sinalizações',
      abrangencia: 'Verificação de status no display',
      condicao: 'Em operação no horário verificado',
      evidencia: 'Registro no checklist',
    },
    {
      componente: 'Proteções e aterramento',
      abrangencia: 'Inspeção visual dos disjuntores',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Registro no checklist',
    },
    {
      componente: 'Monitoramento e comunicação',
      abrangencia: 'Verificação no aplicativo',
      condicao: 'Comunicação ativa no horário verificado',
      evidencia: 'Registro no checklist',
    },
  ]

  // Agrupamento de fotos por etapa do checklist:
  // Inicializa o mapa com as etapas do checklist na ordem de execução
  const fotosPorEtapaMap = new Map<
    string,
    { itemChecklistId?: string; itemChecklistTexto: string; fotos: FotoRegistroRelatorio[] }
  >()
  const fotosGeraisSemEtapa: FotoRegistroRelatorio[] = []

  // Inicializa com as etapas conhecidas do checklist para preservar a ordem
  checklistItens.forEach((chk, idx) => {
    const chave = chk.id || `chk_${idx + 1}`
    const texto = chk.item || `Atividade ${idx + 1}`
    fotosPorEtapaMap.set(chave, {
      itemChecklistId: chk.id,
      itemChecklistTexto: texto,
      fotos: [],
    })
  })

  // Distribui TODAS as fotos em seus respectivos grupos sem parar cedo e sem sobrescrever
  fotos.forEach((f, fIdx) => {
    let grupoDestino:
      | { itemChecklistId?: string; itemChecklistTexto: string; fotos: FotoRegistroRelatorio[] }
      | undefined

    const fId = f.item_checklist_id ? String(f.item_checklist_id).trim() : ''
    const fTextoNorm = normalizarTexto(f.item_checklist_texto)

    // 1. Tenta casar com grupo pelo item_checklist_id exato
    if (fId && fotosPorEtapaMap.has(fId)) {
      grupoDestino = fotosPorEtapaMap.get(fId)
    }

    // 2. Tenta casar por prefixo coincidente + ordinal numérico
    if (!grupoDestino && fId) {
      const mF = fId.match(/^(.*?)_?(\d+)$/)
      if (mF) {
        const prefixoF = mF[1].toLowerCase()
        const ordF = parseInt(mF[2], 10)
        for (const [chave, g] of fotosPorEtapaMap.entries()) {
          const mChave = chave.match(/^(.*?)_?(\d+)$/)
          if (mChave) {
            const prefixoChave = mChave[1].toLowerCase()
            const ordChave = parseInt(mChave[2], 10)
            const prefixosCompativeis =
              prefixoF === prefixoChave ||
              (prefixoF.startsWith('chk_') &&
                prefixoChave.startsWith('chk_') &&
                prefixoF === prefixoChave) ||
              ((prefixoF === 'chk' || prefixoF === 'item' || prefixoF === '') &&
                (prefixoChave === 'chk' || prefixoChave === 'item' || prefixoChave === ''))
            if (prefixosCompativeis && ordF === ordChave) {
              grupoDestino = g
              break
            }
          }
        }
      }
    }

    // 3. Tenta casar por texto da etapa (com normalização tolerante a acentos e caixa, bidirecional)
    if (!grupoDestino && fTextoNorm) {
      for (const g of fotosPorEtapaMap.values()) {
        const gTextoNorm = normalizarTexto(g.itemChecklistTexto)
        if (
          gTextoNorm &&
          (gTextoNorm === fTextoNorm ||
            (gTextoNorm.length >= 4 &&
              fTextoNorm.length >= 4 &&
              (gTextoNorm.includes(fTextoNorm) || fTextoNorm.includes(gTextoNorm))))
        ) {
          grupoDestino = g
          break
        }
      }
    }

    // 4. Tenta casar se f.item_checklist_id contiver o texto de algum grupo
    if (!grupoDestino && fId) {
      const fIdTextNorm = normalizarTexto(fId)
      if (fIdTextNorm && fIdTextNorm.length >= 4) {
        for (const g of fotosPorEtapaMap.values()) {
          const gTextoNorm = normalizarTexto(g.itemChecklistTexto)
          if (
            gTextoNorm &&
            (gTextoNorm === fIdTextNorm ||
              gTextoNorm.includes(fIdTextNorm) ||
              fIdTextNorm.includes(gTextoNorm))
          ) {
            grupoDestino = g
            break
          }
        }
      }
    }

    if (grupoDestino) {
      grupoDestino.fotos.push(f)
    } else if (f.item_checklist_id || f.item_checklist_texto) {
      // Cria novo grupo com chave única composta para nunca sobrescrever nem perder fotos
      const chaveNova = f.item_checklist_id || `etapa_${fIdx + 1}`
      const textoNovo = f.item_checklist_texto || `Etapa ${fotosPorEtapaMap.size + 1}`
      if (!fotosPorEtapaMap.has(chaveNova)) {
        fotosPorEtapaMap.set(chaveNova, {
          itemChecklistId: f.item_checklist_id,
          itemChecklistTexto: textoNovo,
          fotos: [],
        })
      }
      fotosPorEtapaMap.get(chaveNova)!.fotos.push(f)
    } else {
      fotosGeraisSemEtapa.push(f)
    }
  })

  // Mantém apenas os grupos que de fato contêm fotos
  const fotosPorEtapa: GrupoFotosEtapaRelatorio[] = Array.from(fotosPorEtapaMap.values()).filter(
    (g) => g.fotos.length > 0,
  )

  // Formatação segura de datas para pt-BR sem distorção de fuso horário
  const formatarDataBrManut = (val: any): string | null => {
    if (!val) return null
    if (val instanceof Date) {
      if (isNaN(val.getTime())) return null
      return val.toLocaleDateString('pt-BR')
    }
    const s = String(val).trim()
    if (!s) return null
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s
    const matchIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (matchIso) {
      return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`
    }
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('pt-BR')
      }
    } catch {
      /* ignore */
    }
    return null
  }

  // Identificação do contrato O&M do cliente
  const contratoOM =
    opcoes?.contratoOM ||
    opcoes?.contrato ||
    cliente?.contrato_om ||
    cliente?.expand?.contratos_om ||
    cliente?.expand?.contrato_om ||
    os?.contrato_om ||
    os?.expand?.contrato_om ||
    null

  // Helper estrito: verifica se o tipo/categoria corresponde a uma atividade real de manutenção
  // Tipos canônicos de manutenção do Delfos Solar:
  // 'limpeza', 'manutencao_preventiva', 'manutencao_corretiva', 'limpeza_manutencao'
  // (proibidas heurísticas arbitrárias de título — regra canônica da memória do projeto)
  const isTipoManutencaoCanonico = (tipoVal?: any, categoriaVal?: any): boolean => {
    const t = String(tipoVal || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_')

    const tiposValidos = [
      'limpeza',
      'manutencao_preventiva',
      'manutencao_corretiva',
      'limpeza_manutencao',
      'limpeza_e_manutencao',
      'limpeza_dos_modulos',
      'limpeza_de_modulos',
      'lavagem',
      'lavagem_dos_modulos',
      'lavagem_de_placas',
      'revisao_preventiva',
      'inspecao_preventiva',
      'reparo_corretivo',
    ]

    if (tiposValidos.includes(t)) return true

    const c = String(categoriaVal || '')
      .trim()
      .toLowerCase()
    if (c === 'manutencao') {
      // Se a categoria for explicitamente manutenção, valida se não é um tipo divergente genérico
      if (
        t === 'visita_tecnica' ||
        t === 'monitoramento' ||
        t === 'administrativo' ||
        t === 'pos_venda' ||
        t === 'auto_leitura'
      ) {
        return false
      }
      return true
    }

    return false
  }

  // Resolução da próxima manutenção prevista — fontes ordenadas rigorosamente:
  // (1) Contrato O&M do cliente (campo proxima_atividade_data)
  // (2) Próxima atividade agendada de manutenção real (tipos canônicos: limpeza, manutencao_preventiva, manutencao_corretiva, limpeza_manutencao)
  // (3) data_proxima_atividade do cadastro do cliente SOMENTE se tipo_proxima_atividade for de manutenção
  // (4) Fallback: data da visita + 6 meses
  let dataRealManutencao: string | null = null
  let origemDataManutencao: 'contrato' | 'atividade_agendada' | 'cliente' | 'fallback' = 'fallback'

  // (1) Contrato O&M do cliente
  const dataContratoRaw =
    contratoOM?.proxima_atividade_data ||
    opcoes?.proximaManutencaoData ||
    cliente?.proxima_atividade_data ||
    os?.expand?.cliente_id?.proxima_atividade_data

  if (dataContratoRaw) {
    const formatted = formatarDataBrManut(dataContratoRaw)
    if (formatted) {
      dataRealManutencao = formatted
      origemDataManutencao = 'contrato'
    }
  }

  // (2) Próxima atividade agendada de manutenção real do cliente
  // Filtra rigorosamente por status 'agendada' (ou pendente agendada com data) e tipos canônicos de manutenção
  if (!dataRealManutencao) {
    const listaAtivs = opcoes?.atividadesCliente || opcoes?.atividades || cliente?.atividades
    if (Array.isArray(listaAtivs) && listaAtivs.length > 0) {
      const ativsAgendadasManut = listaAtivs.filter((a: any) => {
        const st = String(a?.status || '').toLowerCase()
        if (st !== 'agendada') return false
        const t = a?.tipo || a?.tipo_custom_id || ''
        const c = a?.categoria || ''
        return isTipoManutencaoCanonico(t, c)
      })

      if (ativsAgendadasManut.length > 0) {
        // Ordena para pegar a atividade agendada mais futura
        ativsAgendadasManut.sort((a: any, b: any) => {
          const da = new Date(a.data_prevista || a.data_agendada || a.data || 0).getTime()
          const db = new Date(b.data_prevista || b.data_agendada || b.data || 0).getTime()
          return db - da
        })
        const maisFutura = ativsAgendadasManut[0]
        const rawDate = maisFutura?.data_prevista || maisFutura?.data_agendada || maisFutura?.data
        const formatted = formatarDataBrManut(rawDate)
        if (formatted) {
          dataRealManutencao = formatted
          origemDataManutencao = 'atividade_agendada'
        }
      }
    }
  }

  // (3) data_proxima_atividade do cadastro do cliente SOMENTE se tipo_proxima_atividade for de manutenção
  if (!dataRealManutencao) {
    const tipoProximaAtividadeCli =
      cliente?.tipo_proxima_atividade ||
      os?.expand?.cliente_id?.tipo_proxima_atividade ||
      (opcoes as any)?.tipoProximaAtividade ||
      ''

    const ehManutencaoCli = isTipoManutencaoCanonico(tipoProximaAtividadeCli)

    if (ehManutencaoCli) {
      const dataAtivDirect =
        opcoes?.proximaAtividadeData ||
        cliente?.data_proxima_atividade ||
        os?.expand?.cliente_id?.data_proxima_atividade

      if (dataAtivDirect) {
        const formatted = formatarDataBrManut(dataAtivDirect)
        if (formatted) {
          dataRealManutencao = formatted
          origemDataManutencao = 'cliente'
        }
      }
    }
  }

  // (4) Fallback: data da visita + 6 meses
  let proximaManutencao = dataRealManutencao || ''
  if (!proximaManutencao) {
    origemDataManutencao = 'fallback'
    try {
      const dManut = new Date(dataAtendimentoRaw || Date.now())
      if (!isNaN(dManut.getTime())) {
        dManut.setMonth(dManut.getMonth() + 6)
        proximaManutencao = dManut.toLocaleDateString('pt-BR')
      } else {
        proximaManutencao = '15/04/2027'
      }
    } catch {
      proximaManutencao = '15/04/2027'
    }
  }

  // Periodicidade exibida baseada no plano de manutenção do contrato
  // Inspeção e Manutenção Preventiva = anual; Plano Completo = semestral; Sem plano / fallback = neutro
  const planoRaw = String(
    contratoOM?.plano || contratoOM?.nome_plano || cliente?.plano_om || '',
  ).toLowerCase()

  let proximaManutencaoPeriodicidade = '(conforme plano de manutenção).'
  if (planoRaw.includes('insp') || planoRaw.includes('prev')) {
    proximaManutencaoPeriodicidade = '(anual, conforme plano de manutenção).'
  } else if (planoRaw.includes('completo')) {
    proximaManutencaoPeriodicidade = '(semestral, conforme plano de manutenção).'
  } else if (
    origemDataManutencao === 'fallback' &&
    !contratoOM &&
    !opcoes?.clientePossuiContratoOMAtivo
  ) {
    proximaManutencaoPeriodicidade = '(conforme plano de manutenção).'
  }

  const conformidadeTecnica =
    'Não foram identificadas pendências no escopo verificado nesta visita.'

  // Conclusão técnica narrativa
  const conclusaoNarrativa = `Em ${dataAtendimento}, realizamos o atendimento de ${tipoServico.toLowerCase()} na unidade ${cidadeEstado}, conforme a OS ${osCodigo}. Foram executadas a limpeza integral dos ${qtdModulos} módulos, a verificação de conectores MC4 e fixadores e o reaperto das conexões do quadro, sem limitações. O resultado observado foi inversor em operação normal e comunicação de monitoramento ativa no horário verificado, conforme registros e fotos anexas. Não foram identificadas pendências no escopo verificado. Recomenda-se manter a próxima manutenção preventiva prevista para ${proximaManutencao}. Esta conclusão se restringe às atividades e verificações descritas neste relatório; o efeito da limpeza sobre a geração não foi quantificado neste atendimento.`

  // Próximos passos e Plano O&M
  const proximosPassosTexto =
    'Manter a rotina de acompanhamento garante que quedas de geração sejam identificadas e corrigidas antes de comprometerem sua economia.'
  const planoOmTitulo = 'Plano Delfos de Manutenção Preventiva & O&M'
  const planoOmTexto =
    'Proteja seu investimento: limpeza periódica, revisão técnica completa, verificação de conexões e estrutura, e atendimento ágil em Erechim e região — mantendo sua usina com geração máxima e segurança durante toda a vida útil do sistema.'
  const planoOmContato = 'Solicite uma avaliação: (54) 99129-2121 • contato@delfos.eng.br'

  // Recebimento
  const formaEDataEnvio = `Enviado em ${dataEmissao} por WhatsApp / E-mail`
  const recebidoPor = '____________________________________'

  const clientePossuiContratoOMAtivo = opcoes?.clientePossuiContratoOMAtivo ?? false
  const exibirPlanoOM = !clientePossuiContratoOMAtivo

  // Solicitação de Avaliação no Google (100% aditivo, ativado apenas se explicitamente marcado como true)
  const rawSolicitarAvaliacao: unknown =
    (os as any)?.solicitar_avaliacao_google ?? (os as any)?.solicitarAvaliacaoGoogle
  const solicitarAvaliacaoGoogle =
    rawSolicitarAvaliacao === true ||
    rawSolicitarAvaliacao === 'true' ||
    rawSolicitarAvaliacao === 1 ||
    rawSolicitarAvaliacao === '1'
  const linkAvaliacaoPadrao = 'https://g.page/r/CTsVOsKTsWCTEBM/review'
  const tituloAvaliacaoPadrao = 'Sua opinião vale muito para nós'
  const textoAvaliacaoPadrao =
    'Ficamos felizes em atender você! Se o serviço foi do seu agrado, reserve 15 segundos para avaliar nossa equipe no Google — isso é muito importante para continuarmos entregando um atendimento de qualidade.'

  const avaliacaoGoogleTitulo = safeStr(os?.avaliacao_google_titulo) || tituloAvaliacaoPadrao
  const avaliacaoGoogleTexto = safeStr(os?.avaliacao_google_texto) || textoAvaliacaoPadrao
  const avaliacaoGoogleLink = safeStr(os?.avaliacao_google_link) || linkAvaliacaoPadrao

  // Resolução canônica de equipamentos da usina vinculada à OS (inversores e módulos)
  const equipamentosUsinaRelatorio = resolverEquipamentosUsina({
    os,
    usina: sistema,
    cliente,
    equipamentosUsina: opcoes?.equipamentosUsina || [],
    ativosUsina: opcoes?.ativosUsina || [],
    inversoresLista: opcoes?.inversoresLista || [],
  })

  return {
    numeroRelatorio,
    osCodigo,
    osIdReal: osId,
    revisao,
    dataEmissao,
    clienteNome,
    clienteDoc,
    clienteTelefone,
    enderecoUsina,
    dataAtendimento,
    horarioInicioTermino,
    tipoServico,
    concessionariaUc,
    dadosSistemaGerador,
    situacaoAtendimento,
    condicaoSistema,
    servicosExecutados,
    modulosPrevistosAtendidos,
    metodoExecutado,
    manualFabricante,
    ressalvasObservadas,
    componentes,
    fotos,
    fotosPorEtapa,
    fotosGeraisSemEtapa,
    conformidadeTecnica,
    proximaManutencao,
    proximaManutencaoPeriodicidade,
    pendenciasRecomendacoes,
    conclusaoNarrativa,
    conclusaoSituacao: 'Concluído',
    conclusaoCondicao: 'Em operação',
    conclusaoDesempenho: 'Não avaliado neste atendimento',
    proximosPassosTexto,
    temContratoOMAtivo: clientePossuiContratoOMAtivo,
    exibirPlanoOM,
    planoOmTitulo,
    planoOmTexto,
    planoOmContato,
    formaEDataEnvio,
    recebidoPor,
    solicitarAvaliacaoGoogle,
    avaliacaoGoogleTitulo,
    avaliacaoGoogleTexto,
    avaliacaoGoogleLink,
    equipamentosUsina: equipamentosUsinaRelatorio,
  }
}

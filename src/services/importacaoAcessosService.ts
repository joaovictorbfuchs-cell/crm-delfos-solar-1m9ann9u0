/**
 * Serviço de Mapeamento, Normalização e Deduplicação Inteligente
 * para Importação de Acessos aos Apps de Monitoramento de Inversores.
 *
 * REGRA: Nenhum dado real da planilha é embutido no código.
 * Apenas regras heurísticas, sanitização e mapeamento de marcas.
 */

import { Cliente, ClienteInversor, MonitoramentoMarca } from '@/types/crm'

export interface ColunasDetectadasAcessos {
  clienteCol: string
  tipoAcessoCol: string
  loginCol: string
  senhaCol: string
  linkCol: string
  segundoLoginCol?: string
  segundoSenhaCol?: string
}

export interface LinhaPlanilhaAcesso {
  linhaOriginalIndex: number
  clienteNomePlanilha: string
  tipoAcessoOriginal: string
  loginOriginal: string
  senhaOriginal: string
  linkOriginal: string
}

export interface MatchClienteResultado {
  clienteId: string | null
  clienteNome: string | null
  confianca: 'alta' | 'media' | 'baixa' | 'nenhuma'
  motivoMatch: string
  scoreSimilaridade: number
}

export interface MarcaMapeadaResultado {
  marcaIdentificada: string
  appNomeSugerido: string
  ehDesconhecida: boolean
}

export type ModoImportacaoAcessos = 'atualizar_todos' | 'somente_faltam'

export interface ItemImportacaoAcesso {
  idTemp: string
  linhaNum: number
  nomePlanilha: string
  tipoAcessoPlanilha: string
  loginPlanilha: string
  senhaPlanilha: string
  linkPlanilha: string

  // Mapeamento de Marca
  marcaMapeada: string
  appNome: string

  // Correspondência com Cliente
  clienteSelecionadoId: string | null
  clienteSelecionadoNome: string | null
  confiancaMatch: 'alta' | 'media' | 'baixa' | 'nenhuma'
  motivoMatch: string
  scoreMatch: number

  // Informações de credenciais já cadastradas no CRM
  clienteJaPossuiCredenciais?: boolean
  motivoJaCadastrado?: string

  // Decisão do Usuário na Prévia
  ignorado: boolean
  ignoradoPorJaCadastrado?: boolean
  acao: 'criar' | 'atualizar' | 'ignorar'
  inversorExistenteId?: string
}

export interface RelatorioImportacaoAcessos {
  totalLidos: number
  importadosCriados: number
  atualizados: number
  ignorados: number
  ignoradosJaCadastrados: number
  semCliente: number
  erros: { linha: number; mensagem: string }[]
}

/**
 * Remove termos sufixos corporativos, parênteses e anotações comuns.
 * Ex: "(Ampliação)", "(Usina)", "(Casa)", "(Aviário)", "(inversor novo)", "(Cristiane Fatima Rampi)", "LTDA", "ME", "EIRELI"
 */
export function limparNomeClienteParaMatching(nome: string | undefined | null): string {
  if (!nome) return ''
  let limpo = nome

  // Remove conteúdo entre parênteses: (Ampliação), (Usina), (Casa), (Aviário), etc.
  limpo = limpo.replace(/\s*\([^)]*\)/g, ' ')

  // Remove sufixos jurídicos e de empresa comuns
  limpo = limpo.replace(/\b(ltda|me|epp|eireli|s\/a|sa|s\.a\.|eir|ss|cia)\b/gi, ' ')

  // Remove títulos e sufixos numéricos de potência ex: "- 75K", "75k", "- Usina 02", "Invsor de 12kw", "Microinversor"
  limpo = limpo.replace(
    /[-–—]\s*(?:inversor|invsor|usina|loja|rua|cd|centro|microinversor).*$/i,
    ' ',
  )
  limpo = limpo.replace(/\b\d+\s*k(?:w|wp)?\b/gi, ' ')

  return limpo.trim()
}

/**
 * Normaliza strings com remoção de acentos, pontuação, múltiplos espaços e caixa baixa
 */
export function normalizarStringParaComparacao(str: string | undefined | null): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Coeficiente de Similaridade Dice / Bigramas
 */
export function calcularSimilaridadeDice(strA: string, strB: string): number {
  const a = normalizarStringParaComparacao(strA)
  const b = normalizarStringParaComparacao(strB)

  if (!a && !b) return 1
  if (!a || !b) return 0
  if (a === b) return 1

  // Inclusão direta com alta taxa de cobertura
  if (a.includes(b) && b.length >= 4) {
    const ratio = b.length / a.length
    if (ratio >= 0.75) return Math.max(0.85, ratio)
  }
  if (b.includes(a) && a.length >= 4) {
    const ratio = a.length / b.length
    if (ratio >= 0.75) return Math.max(0.85, ratio)
  }

  // Verificação de palavras-chave compartilhadas
  const wordsA = a.split(' ').filter((w) => w.length >= 3)
  const wordsB = b.split(' ').filter((w) => w.length >= 3)

  if (wordsA.length > 0 && wordsB.length > 0) {
    const intersection = wordsA.filter((w) => wordsB.includes(w))
    const minWords = Math.min(wordsA.length, wordsB.length)
    if (intersection.length >= 2 && intersection.length === minWords) {
      return 0.92
    }
    if (intersection.length >= 1 && minWords === 1 && wordsA[0] === wordsB[0]) {
      return 0.88
    }
  }

  const getBigrams = (str: string): string[] => {
    const bigrams: string[] = []
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.slice(i, i + 2))
    }
    return bigrams
  }

  const bigramsA = getBigrams(a)
  const bigramsB = getBigrams(b)
  if (bigramsA.length === 0 || bigramsB.length === 0) return 0

  let matches = 0
  const bCopy = [...bigramsB]
  for (const bg of bigramsA) {
    const idx = bCopy.indexOf(bg)
    if (idx !== -1) {
      matches++
      bCopy.splice(idx, 1)
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length)
}

/**
 * Casa um nome ou e-mail da planilha com um cliente existente no CRM
 */
export function casarClienteComBase(
  nomeOuEmailPlanilha: string,
  clientesBase: Cliente[],
): MatchClienteResultado {
  const raw = (nomeOuEmailPlanilha || '').trim()
  if (!raw) {
    return {
      clienteId: null,
      clienteNome: null,
      confianca: 'nenhuma',
      motivoMatch: 'Nome/e-mail vazio na planilha',
      scoreSimilaridade: 0,
    }
  }

  const isEmail = raw.includes('@') && raw.includes('.')

  // 1. Se for e-mail na planilha (ex.: cervejariaguri@hotmail.com), buscar por e-mail exato
  if (isEmail) {
    const emailLower = raw.toLowerCase().trim()
    const matchEmail = clientesBase.find(
      (c) =>
        (c.email && c.email.toLowerCase().trim() === emailLower) ||
        (c.titular_email && c.titular_email.toLowerCase().trim() === emailLower),
    )
    if (matchEmail) {
      return {
        clienteId: matchEmail.id,
        clienteNome: matchEmail.nome,
        confianca: 'alta',
        motivoMatch: `E-mail exato correspondente (${matchEmail.email || matchEmail.titular_email})`,
        scoreSimilaridade: 1,
      }
    }
  }

  // 2. Normalização de nome para matching
  const nomeLimpoPlanilha = limparNomeClienteParaMatching(raw)
  const normPlanilha = normalizarStringParaComparacao(nomeLimpoPlanilha)
  const normOriginal = normalizarStringParaComparacao(raw)

  // 2.1 Match Exato Normalizado
  for (const c of clientesBase) {
    const cNomeNorm = normalizarStringParaComparacao(c.nome)
    const cRazaoNorm = normalizarStringParaComparacao(c.razao_social)
    const cFantasiaNorm = normalizarStringParaComparacao(c.nome_fantasia)

    if (
      normPlanilha === cNomeNorm ||
      normOriginal === cNomeNorm ||
      (cRazaoNorm && normPlanilha === cRazaoNorm) ||
      (cFantasiaNorm && normPlanilha === cFantasiaNorm)
    ) {
      return {
        clienteId: c.id,
        clienteNome: c.nome,
        confianca: 'alta',
        motivoMatch: 'Nome idêntico no CRM',
        scoreSimilaridade: 1,
      }
    }
  }

  // 2.2 Match por Substring / Inclusão Rígida (um nome contém o outro)
  for (const c of clientesBase) {
    const cLimpo = limparNomeClienteParaMatching(c.nome)
    const cNorm = normalizarStringParaComparacao(cLimpo)

    if (cNorm.length >= 4 && normPlanilha.length >= 4) {
      if (normPlanilha.startsWith(cNorm) || cNorm.startsWith(normPlanilha)) {
        return {
          clienteId: c.id,
          clienteNome: c.nome,
          confianca: 'alta',
          motivoMatch: `Início de nome coincidente ("${c.nome}")`,
          scoreSimilaridade: 0.95,
        }
      }
      if (normPlanilha.includes(cNorm) || cNorm.includes(normPlanilha)) {
        const ratio =
          Math.min(normPlanilha.length, cNorm.length) / Math.max(normPlanilha.length, cNorm.length)
        if (ratio >= 0.5) {
          return {
            clienteId: c.id,
            clienteNome: c.nome,
            confianca: ratio >= 0.7 ? 'alta' : 'media',
            motivoMatch: `Nome contido no cadastro ("${c.nome}")`,
            scoreSimilaridade: ratio >= 0.7 ? 0.9 : 0.8,
          }
        }
      }
    }
  }

  // 2.3 Comparação Fuzzy Dice
  let melhorScore = 0
  let melhorCliente: Cliente | null = null

  for (const c of clientesBase) {
    const cLimpo = limparNomeClienteParaMatching(c.nome)
    const scoreLimpo = calcularSimilaridadeDice(nomeLimpoPlanilha, cLimpo)
    const scoreOriginal = calcularSimilaridadeDice(raw, c.nome)
    const scoreRazao = c.razao_social
      ? calcularSimilaridadeDice(nomeLimpoPlanilha, c.razao_social)
      : 0
    const maxScore = Math.max(scoreLimpo, scoreOriginal, scoreRazao)

    if (maxScore > melhorScore) {
      melhorScore = maxScore
      melhorCliente = c
    }
  }

  if (melhorCliente) {
    if (melhorScore >= 0.82) {
      return {
        clienteId: melhorCliente.id,
        clienteNome: melhorCliente.nome,
        confianca: melhorScore >= 0.88 ? 'alta' : 'media',
        motivoMatch: `Similaridade de ${Math.round(melhorScore * 100)}% com "${melhorCliente.nome}"`,
        scoreSimilaridade: melhorScore,
      }
    } else if (melhorScore >= 0.68) {
      return {
        clienteId: melhorCliente.id,
        clienteNome: melhorCliente.nome,
        confianca: 'baixa',
        motivoMatch: `Possível correspondência (${Math.round(melhorScore * 100)}%) com "${melhorCliente.nome}" - Verifique`,
        scoreSimilaridade: melhorScore,
      }
    }
  }

  return {
    clienteId: null,
    clienteNome: null,
    confianca: 'nenhuma',
    motivoMatch: 'Nenhum cliente similar encontrado',
    scoreSimilaridade: melhorScore,
  }
}

/**
 * Mapeia "TIPO DE ACESSO" para a marca canônica do inversor e aplicativo padrão.
 * Exemplos da planilha:
 * - Growatt / ShinePhone → Growatt
 * - SolarMAN / Solarman 2 / SOLARMAN Smart / Solarman busines - Smart → Solarman
 * - Solis / SolisCloud / Solis Cloud / SloisCloud → Solis
 * - Goodwe / GoodWe / SEMS Portal / Sems Portal / Goodwe - semsportal.com → Goodwe
 * - CSI CLOUD / CSI SOLAR / CSI Canadian / Csi canadian / GINLONG MONITORING (CSI) / Canadian → CSI
 * - WiseSolarPlus / WiseSolar Plus / Wise Solar Plus → WiseSolar
 * - Fronius / SOLARWEB / Solarweb / Solar web → Fronius
 * - Sungrow / Isolarcloud / Isolarcloud - Sungrow / ISOLARCLOUD → Sungrow
 * - SMA → SMA
 * - ABB → ABB
 * - Hoymiles → Hoymiles
 * - Renovigi portal / Renovigi.solar / Shine monitor - Renovigi / Reno Client / Renovigiportal.com → Renovigi
 * - Refulog → Refulog
 */
export function mapearTipoAcessoParaMarca(
  tipoAcessoOriginal: string | undefined | null,
  marcasCadastradas: MonitoramentoMarca[] = [],
): MarcaMapeadaResultado {
  const texto = (tipoAcessoOriginal || '').trim()
  if (!texto) {
    return {
      marcaIdentificada: '',
      appNomeSugerido: '',
      ehDesconhecida: true,
    }
  }

  const tNorm = normalizarStringParaComparacao(texto)

  // 1. Growatt / ShinePhone
  if (tNorm.includes('growatt') || tNorm.includes('shinephone') || tNorm.includes('shine phone')) {
    return {
      marcaIdentificada: 'Growatt',
      appNomeSugerido: 'ShinePhone',
      ehDesconhecida: false,
    }
  }

  // 2. Solis / SolisCloud / SloisCloud
  if (
    tNorm.includes('solis') ||
    tNorm.includes('slois') ||
    tNorm.includes('soliscloud') ||
    tNorm.includes('solis cloud')
  ) {
    return {
      marcaIdentificada: 'Solis',
      appNomeSugerido: 'SolisCloud',
      ehDesconhecida: false,
    }
  }

  // 3. SolarMAN / Solarman
  if (tNorm.includes('solarman') || tNorm.includes('solar man')) {
    return {
      marcaIdentificada: 'Solarman',
      appNomeSugerido: 'SOLARMAN Smart',
      ehDesconhecida: false,
    }
  }

  // 4. Goodwe / SEMS Portal
  if (
    tNorm.includes('goodwe') ||
    tNorm.includes('sems') ||
    tNorm.includes('semsportal') ||
    tNorm.includes('sems portal')
  ) {
    return {
      marcaIdentificada: 'Goodwe',
      appNomeSugerido: 'SEMS Portal',
      ehDesconhecida: false,
    }
  }

  // 5. CSI / Canadian Solar / Ginlong (CSI)
  if (tNorm.includes('csi') || tNorm.includes('canadian') || tNorm.includes('ginlong')) {
    return {
      marcaIdentificada: 'CSI',
      appNomeSugerido: 'CSI Cloud',
      ehDesconhecida: false,
    }
  }

  // 6. WiseSolar / WiseSolarPlus
  if (tNorm.includes('wisesolar') || tNorm.includes('wise solar')) {
    return {
      marcaIdentificada: 'WiseSolar',
      appNomeSugerido: 'WiseSolarPlus',
      ehDesconhecida: false,
    }
  }

  // 7. Fronius / Solarweb / Solar.web
  if (tNorm.includes('fronius') || tNorm.includes('solarweb') || tNorm.includes('solar web')) {
    return {
      marcaIdentificada: 'Fronius',
      appNomeSugerido: 'Fronius Solar.web',
      ehDesconhecida: false,
    }
  }

  // 8. Sungrow / Isolarcloud / iSolarCloud
  if (
    tNorm.includes('sungrow') ||
    tNorm.includes('isolarcloud') ||
    tNorm.includes('isolar cloud')
  ) {
    return {
      marcaIdentificada: 'Sungrow',
      appNomeSugerido: 'iSolarCloud',
      ehDesconhecida: false,
    }
  }

  // 9. SMA / Sunny Portal
  if (tNorm.includes('sma') || tNorm.includes('sunny')) {
    return {
      marcaIdentificada: 'SMA',
      appNomeSugerido: 'Sunny Portal',
      ehDesconhecida: false,
    }
  }

  // 10. ABB / Aurora Vision
  if (tNorm.includes('abb') || tNorm.includes('aurora vision')) {
    return {
      marcaIdentificada: 'ABB',
      appNomeSugerido: 'Aurora Vision',
      ehDesconhecida: false,
    }
  }

  // 11. Hoymiles / S-miles
  if (tNorm.includes('hoymiles') || tNorm.includes('miles')) {
    return {
      marcaIdentificada: 'Hoymiles',
      appNomeSugerido: 'S-Miles Enduser',
      ehDesconhecida: false,
    }
  }

  // 12. Renovigi / Reno Client
  if (tNorm.includes('renovigi') || tNorm.includes('reno client')) {
    return {
      marcaIdentificada: 'Renovigi',
      appNomeSugerido: 'Renovigi Portal',
      ehDesconhecida: false,
    }
  }

  // 13. Deye
  if (tNorm.includes('deye')) {
    return {
      marcaIdentificada: 'Deye',
      appNomeSugerido: 'SOLARMAN Smart',
      ehDesconhecida: false,
    }
  }

  // 14. SolarEdge
  if (tNorm.includes('solaredge') || tNorm.includes('solar edge')) {
    return {
      marcaIdentificada: 'SolarEdge',
      appNomeSugerido: 'mySolarEdge',
      ehDesconhecida: false,
    }
  }

  // 15. Huawei
  if (tNorm.includes('huawei') || tNorm.includes('fusionsolar')) {
    return {
      marcaIdentificada: 'Huawei',
      appNomeSugerido: 'FusionSolar',
      ehDesconhecida: false,
    }
  }

  // 16. Checar contra marcas já existentes no banco de monitoramento
  for (const m of marcasCadastradas) {
    const mNorm = normalizarStringParaComparacao(m.marca)
    if (mNorm && (tNorm.includes(mNorm) || mNorm.includes(tNorm))) {
      return {
        marcaIdentificada: m.marca,
        appNomeSugerido: m.app_nome || texto,
        ehDesconhecida: false,
      }
    }
  }

  // Desconhecido: manter texto livre como app e marca
  return {
    marcaIdentificada: texto,
    appNomeSugerido: texto,
    ehDesconhecida: true,
  }
}

/**
 * Detecta cabeçalhos da planilha tolerando variações de caixa, espaços e nomes parciais
 */
export function detectarCabecalhoAcessos(headers: string[]): ColunasDetectadasAcessos | null {
  if (!headers || headers.length === 0) return null

  let clienteCol = ''
  let tipoAcessoCol = ''
  let loginCol = ''
  let senhaCol = ''
  let linkCol = ''
  let segundoLoginCol = ''
  let segundoSenhaCol = ''

  let loginEncontradosCount = 0
  let senhaEncontradosCount = 0

  headers.forEach((h) => {
    const hNorm = normalizarStringParaComparacao(h)

    // Cliente
    if (
      !clienteCol &&
      (hNorm === 'cliente' ||
        hNorm.includes('cliente') ||
        hNorm.includes('razao') ||
        hNorm.includes('nome'))
    ) {
      clienteCol = h
      return
    }

    // Tipo de Acesso / Plataforma / App
    if (
      !tipoAcessoCol &&
      (hNorm.includes('tipo de acesso') ||
        hNorm.includes('tipo acesso') ||
        hNorm.includes('acesso') ||
        hNorm.includes('app') ||
        hNorm.includes('plataforma') ||
        hNorm.includes('monitoramento'))
    ) {
      tipoAcessoCol = h
      return
    }

    // Link de Acesso / URL / Portal
    if (
      !linkCol &&
      (hNorm.includes('link') ||
        hNorm.includes('url') ||
        hNorm.includes('portal') ||
        hNorm.includes('site') ||
        hNorm.includes('datalogger'))
    ) {
      linkCol = h
      return
    }

    // Login (pode haver mais de uma coluna: Login 1 e Login 2)
    if (hNorm.includes('login') || hNorm.includes('usuario') || hNorm.includes('user')) {
      loginEncontradosCount++
      if (loginEncontradosCount === 1) {
        loginCol = h
      } else if (loginEncontradosCount === 2) {
        segundoLoginCol = h
      }
      return
    }

    // Senha (pode haver mais de uma coluna: Senha 1 e Senha 2)
    if (hNorm.includes('senha') || hNorm.includes('password') || hNorm.includes('pass')) {
      senhaEncontradosCount++
      if (senhaEncontradosCount === 1) {
        senhaCol = h
      } else if (senhaEncontradosCount === 2) {
        segundoSenhaCol = h
      }
      return
    }
  })

  // Fallback por índice posicional caso os nomes não tenham batido diretamente
  if (!clienteCol && headers.length > 0) clienteCol = headers[0]
  if (!tipoAcessoCol && headers.length > 1) tipoAcessoCol = headers[1]
  if (!loginCol && headers.length > 2) loginCol = headers[2]
  if (!senhaCol && headers.length > 3) senhaCol = headers[3]
  if (!linkCol && headers.length > 4) linkCol = headers[4]

  if (!clienteCol && !tipoAcessoCol) {
    return null
  }

  return {
    clienteCol,
    tipoAcessoCol,
    loginCol,
    senhaCol,
    linkCol,
    segundoLoginCol,
    segundoSenhaCol,
  }
}

/**
 * Extrai e normaliza linhas brutas da planilha de acessos usando mapeamento de colunas
 */
/**
 * Verifica se um cliente casado já possui algum inversor cadastrado com credenciais
 * preenchidas (login OU senha preenchidos).
 * Também checa dados legados no registro do cliente se aplicável.
 */
export function clientePossuiCredenciaisCadastradas(
  clienteId: string | null | undefined,
  inversoresExistentesPorCliente: Map<string, ClienteInversor[]>,
  clientesBase?: Cliente[],
): { possui: boolean; motivo?: string } {
  if (!clienteId) return { possui: false }

  const inversores = inversoresExistentesPorCliente.get(clienteId) || []
  const inversorComCredenciais = inversores.find((inv) =>
    Boolean((inv.login && inv.login.trim()) || (inv.senha && inv.senha.trim())),
  )

  if (inversorComCredenciais) {
    const marcaInfo = inversorComCredenciais.marca_inversor
      ? ` (${inversorComCredenciais.marca_inversor})`
      : ''
    return {
      possui: true,
      motivo: `Já possui inversor${marcaInfo} com credenciais cadastradas no banco`,
    }
  }

  // Checagem defensiva de campos legados no próprio cliente (ex.: monitoramento_login / monitoramento_senha)
  if (clientesBase && clientesBase.length > 0) {
    const clienteObj = clientesBase.find((c) => c.id === clienteId)
    if (clienteObj) {
      const loginLegado = (clienteObj as any).monitoramento_login?.trim()
      const senhaLegada = (clienteObj as any).monitoramento_senha?.trim()
      if (loginLegado || senhaLegada) {
        return {
          possui: true,
          motivo: 'Já possui login/senha de monitoramento registrado no cadastro do cliente',
        }
      }
    }
  }

  return { possui: false }
}

/**
 * Aplica ou recalcula o modo de importação sobre uma lista de itens de importação.
 * - 'atualizar_todos': comportamento padrão. Linhas mantêm sua ação original (criar/atualizar)
 *    e só são ignoradas se estavam vazias ou o usuário marcou manualmente.
 * - 'somente_faltam': linhas cujo cliente casado já tem credenciais cadastradas
 *    são marcadas como ignoradas automaticamente (ignorado = true, ignoradoPorJaCadastrado = true).
 *    Linhas sem cliente casado ou de clientes sem nenhum acesso continuam normalmente para criação.
 */
export function aplicarModoImportacao(
  itens: ItemImportacaoAcesso[],
  modo: ModoImportacaoAcessos,
  inversoresExistentesPorCliente: Map<string, ClienteInversor[]>,
  clientesBase?: Cliente[],
): ItemImportacaoAcesso[] {
  return itens.map((item) => {
    const checagem = clientePossuiCredenciaisCadastradas(
      item.clienteSelecionadoId,
      inversoresExistentesPorCliente,
      clientesBase,
    )

    const clienteJaPossuiCredenciais = checagem.possui
    const motivoJaCadastrado = checagem.motivo

    if (modo === 'somente_faltam') {
      if (clienteJaPossuiCredenciais) {
        return {
          ...item,
          clienteJaPossuiCredenciais,
          motivoJaCadastrado,
          ignorado: true,
          ignoradoPorJaCadastrado: true,
        }
      } else {
        // Se não possui credenciais, desfaz a marcação automática de "ignorado por já cadastrado"
        const estavaIgnoradoSoPorJaCadastrado = item.ignoradoPorJaCadastrado
        return {
          ...item,
          clienteJaPossuiCredenciais: false,
          motivoJaCadastrado: undefined,
          ignoradoPorJaCadastrado: false,
          ignorado: estavaIgnoradoSoPorJaCadastrado ? false : item.ignorado,
        }
      }
    } else {
      // Modo 'atualizar_todos'
      const estavaIgnoradoSoPorJaCadastrado = item.ignoradoPorJaCadastrado
      return {
        ...item,
        clienteJaPossuiCredenciais,
        motivoJaCadastrado,
        ignoradoPorJaCadastrado: false,
        ignorado: estavaIgnoradoSoPorJaCadastrado ? false : item.ignorado,
      }
    }
  })
}

/**
 * Extrai e normaliza linhas brutas da planilha de acessos usando mapeamento de colunas
 */
export function extrairLinhasAcessos(
  rows: Record<string, string>[],
  colunas: ColunasDetectadasAcessos,
  clientesBase: Cliente[],
  marcasCadastradas: MonitoramentoMarca[] = [],
  inversoresExistentesPorCliente: Map<string, ClienteInversor[]> = new Map(),
  modoImportacao: ModoImportacaoAcessos = 'atualizar_todos',
): ItemImportacaoAcesso[] {
  const itensIniciais = rows.map((row, index) => {
    const rawCliente = (row[colunas.clienteCol] || '').trim()
    const rawTipoAcesso = (row[colunas.tipoAcessoCol] || '').trim()

    let rawLogin = (row[colunas.loginCol] || '').trim()
    let rawSenha = (row[colunas.senhaCol] || '').trim()
    const rawLink = (row[colunas.linkCol] || '').trim()

    // Fallback para segunda coluna de login/senha se a primeira estiver vazia
    if (!rawLogin && colunas.segundoLoginCol && row[colunas.segundoLoginCol]) {
      rawLogin = row[colunas.segundoLoginCol].trim()
    }
    if (!rawSenha && colunas.segundoSenhaCol && row[colunas.segundoSenhaCol]) {
      rawSenha = row[colunas.segundoSenhaCol].trim()
    }

    // 1. Mapeamento de Marca
    const mapeamentoMarca = mapearTipoAcessoParaMarca(rawTipoAcesso, marcasCadastradas)

    // 2. Matching de Cliente
    const match = casarClienteComBase(rawCliente, clientesBase)

    // 3. Deduplicação e Detecção de Inversor Existente
    let acaoSugerida: 'criar' | 'atualizar' | 'ignorar' = 'criar'
    let inversorExistenteId: string | undefined = undefined

    if (match.clienteId) {
      const inversoresDoCliente = inversoresExistentesPorCliente.get(match.clienteId) || []
      const marcaAlvoNorm = normalizarStringParaComparacao(mapeamentoMarca.marcaIdentificada)

      // Procura inversor existente do cliente com mesma marca
      const inversorMesmaMarca = inversoresDoCliente.find((inv) => {
        const invMarcaNorm = normalizarStringParaComparacao(inv.marca_inversor)
        return (
          invMarcaNorm === marcaAlvoNorm ||
          (invMarcaNorm &&
            marcaAlvoNorm &&
            (invMarcaNorm.includes(marcaAlvoNorm) || marcaAlvoNorm.includes(invMarcaNorm)))
        )
      })

      if (inversorMesmaMarca) {
        // Se já existe e as credenciais são exatamente as mesmas -> atualizar
        const mesmoLogin = (inversorMesmaMarca.login || '').trim() === rawLogin
        const mesmaSenha = (inversorMesmaMarca.senha || '').trim() === rawSenha
        const mesmoLink = (inversorMesmaMarca.datalogger_url || '').trim() === rawLink

        if (mesmoLogin && mesmaSenha && mesmoLink && (rawLogin || rawSenha || rawLink)) {
          acaoSugerida = 'atualizar'
          inversorExistenteId = inversorMesmaMarca.id
        } else if (
          !inversorMesmaMarca.login &&
          !inversorMesmaMarca.senha &&
          !inversorMesmaMarca.datalogger_url
        ) {
          // Se o existente estava vazio e a planilha traz credenciais, atualizar o existente em vez de duplicar
          acaoSugerida = 'atualizar'
          inversorExistenteId = inversorMesmaMarca.id
        } else {
          // Se o existente já tem credenciais diferentes, criar como novo sistema/inversor
          acaoSugerida = 'criar'
        }
      }
    }

    const estaLinhaVazia = !rawCliente && !rawTipoAcesso && !rawLogin && !rawSenha

    return {
      idTemp: `acesso-item-${index + 1}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      linhaNum: index + 2, // Considerando linha 1 como cabeçalho
      nomePlanilha: rawCliente,
      tipoAcessoPlanilha: rawTipoAcesso,
      loginPlanilha: rawLogin,
      senhaPlanilha: rawSenha,
      linkPlanilha: rawLink,

      marcaMapeada: mapeamentoMarca.marcaIdentificada,
      appNome: mapeamentoMarca.appNomeSugerido || rawTipoAcesso,

      clienteSelecionadoId: match.clienteId,
      clienteSelecionadoNome: match.clienteNome,
      confiancaMatch: match.confianca,
      motivoMatch: match.motivoMatch,
      scoreMatch: match.scoreSimilaridade,

      ignorado: estaLinhaVazia,
      acao: acaoSugerida,
      inversorExistenteId,
    }
  })

  // Aplica a lógica do modo de importação (caso seja 'somente_faltam' ou 'atualizar_todos')
  return aplicarModoImportacao(
    itensIniciais,
    modoImportacao,
    inversoresExistentesPorCliente,
    clientesBase,
  )
}

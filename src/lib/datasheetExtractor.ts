import * as pdfjsLib from 'pdfjs-dist'
import type { TipoEquipamento } from '@/types/equipamentos'

// Configurar worker do pdfjs-dist via CDN confiável para compatibilidade com Vite sem worker inline complexo
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  // Configuração segura do worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`
}

export interface ExtractedDatasheetData {
  marca?: string
  modelo?: string
  potencia_w?: number
  garantia_anos?: number
  eficiencia?: string
  descricao_padrao?: string
  tipo?: TipoEquipamento
  rawTextPreview?: string
  paginasLidas?: number
  linhasTabela?: number
  totalCaracteres?: number
  camposDetectados?: string[]
  isScanSemTexto?: boolean
}

interface TextItemWithPosition {
  str: string
  x: number
  y: number
  width: number
  height: number
}

const MARCAS_CONHECIDAS: { nome: string; aliases: string[]; tipoPadrao?: TipoEquipamento }[] = [
  {
    nome: 'RONMA',
    aliases: ['ronma solar', 'ronma', 'ronmasolar'],
    tipoPadrao: 'modulo_fv',
  },
  {
    nome: 'Canadian Solar',
    aliases: ['canadian solar', 'canadiansolar', 'canadian'],
    tipoPadrao: 'modulo_fv',
  },
  { nome: 'Trina Solar', aliases: ['trina solar', 'trinasolar', 'trina'], tipoPadrao: 'modulo_fv' },
  { nome: 'JA Solar', aliases: ['ja solar', 'jasolar'], tipoPadrao: 'modulo_fv' },
  { nome: 'Jinko Solar', aliases: ['jinko solar', 'jinkosolar', 'jinko'], tipoPadrao: 'modulo_fv' },
  { nome: 'Longi Solar', aliases: ['longi solar', 'longisolar', 'longi'], tipoPadrao: 'modulo_fv' },
  { nome: 'Growatt', aliases: ['growatt'], tipoPadrao: 'inversor' },
  { nome: 'Deye', aliases: ['deye'], tipoPadrao: 'inversor' },
  { nome: 'Huawei', aliases: ['huawei'], tipoPadrao: 'inversor' },
  { nome: 'Solis', aliases: ['solis', 'ginlong'], tipoPadrao: 'inversor' },
  { nome: 'Sungrow', aliases: ['sungrow'], tipoPadrao: 'inversor' },
  { nome: 'Fronius', aliases: ['fronius'], tipoPadrao: 'inversor' },
  { nome: 'SolarEdge', aliases: ['solaredge', 'solar edge'], tipoPadrao: 'inversor' },
  { nome: 'GoodWe', aliases: ['goodwe', 'good we'], tipoPadrao: 'inversor' },
  { nome: 'SMA', aliases: ['sma solar', 'sma'], tipoPadrao: 'inversor' },
  { nome: 'Risen', aliases: ['risen energy', 'risen'], tipoPadrao: 'modulo_fv' },
  { nome: 'Astronergy', aliases: ['astronergy', 'chint'], tipoPadrao: 'modulo_fv' },
  { nome: 'DAH Solar', aliases: ['dah solar', 'dahsolar', 'dah'], tipoPadrao: 'modulo_fv' },
  { nome: 'BYD', aliases: ['byd'], tipoPadrao: 'modulo_fv' },
  { nome: 'Talesun', aliases: ['talesun'], tipoPadrao: 'modulo_fv' },
  { nome: 'Osda', aliases: ['osda solar', 'osda'], tipoPadrao: 'modulo_fv' },
  { nome: 'AE Solar', aliases: ['ae solar'], tipoPadrao: 'modulo_fv' },
  { nome: 'Sunova Solar', aliases: ['sunova solar', 'sunova'], tipoPadrao: 'modulo_fv' },
  { nome: 'Suntech', aliases: ['suntech'], tipoPadrao: 'modulo_fv' },
]

/**
 * Lê até as 3 primeiras páginas do PDF usando pdfjs-dist e reconstrói as linhas
 * de texto agrupando itens por coordenadas Y (para manter a coerência de tabelas técnicas).
 */
export async function extractDatasheetFromPdf(file: File): Promise<ExtractedDatasheetData> {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
  const pdf = await loadingTask.promise

  const maxPages = Math.min(pdf.numPages, 3)
  const lines: string[] = []
  const fullTextPieces: string[] = []

  // Tolerância vertical aumentada para 5.5 unidades (acomoda pequenas oscilações de baseline entre colunas)
  const TOLERANCIA_Y = 5.5

  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    // Itens com posição
    const items: TextItemWithPosition[] = []

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const tx = item.transform // [scaleX, skewY, skewX, scaleY, posX, posY]
        items.push({
          str: item.str,
          x: tx[4],
          y: tx[5],
          width: item.width || 0,
          height: item.height || 0,
        })
        fullTextPieces.push(item.str)
      }
    }

    // Agrupar itens por linha usando coordenada Y com tolerância de ~5.5 unidades (mesma linha da tabela)
    // No PDF, coordenadas Y crescem de baixo para cima.
    // Ordenamos primeiro por Y decrescente (topo para base) e depois por X crescente (esquerda para direita).
    const sorted = [...items].sort((a, b) => {
      const yDiff = b.y - a.y
      if (Math.abs(yDiff) > TOLERANCIA_Y) {
        return yDiff
      }
      return a.x - b.x
    })

    let currentY: number | null = null
    let currentLine: TextItemWithPosition[] = []

    for (const item of sorted) {
      if (currentY === null) {
        currentY = item.y
        currentLine.push(item)
      } else if (Math.abs(item.y - currentY) <= TOLERANCIA_Y) {
        currentLine.push(item)
      } else {
        // Nova linha: ordena os itens da linha anterior por X e junta com pipe
        currentLine.sort((a, b) => a.x - b.x)
        const lineStr = currentLine
          .map((i) => i.str.trim())
          .filter(Boolean)
          .join(' | ')
        if (lineStr) lines.push(lineStr)

        currentY = item.y
        currentLine = [item]
      }
    }

    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x)
      const lineStr = currentLine
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(' | ')
      if (lineStr) lines.push(lineStr)
    }
  }

  // Também podemos derivar informações úteis do nome do arquivo (ex.: RONMA 585W BIFACIAL N-TopCon RM-585W-182M144TB.pdf)
  const fileNameInfo = parseFileNameHints(file.name)

  const allText = fullTextPieces.join(' ')
  const linesJoined = lines.join('\n')

  const parsed = parseDatasheetText(lines, linesJoined, allText, fileNameInfo)
  parsed.paginasLidas = maxPages
  parsed.linhasTabela = lines.length
  parsed.totalCaracteres = allText.trim().length
  parsed.isScanSemTexto = parsed.totalCaracteres < 30

  // Diagnóstico estruturado no console para auditoria e troubleshooting
  const camposEncontrados: string[] = []
  if (parsed.marca) camposEncontrados.push(`marca: "${parsed.marca}"`)
  if (parsed.modelo) camposEncontrados.push(`modelo: "${parsed.modelo}"`)
  if (parsed.potencia_w) camposEncontrados.push(`potência: ${parsed.potencia_w}W`)
  if (parsed.garantia_anos) camposEncontrados.push(`garantia: ${parsed.garantia_anos} anos`)
  if (parsed.eficiencia) camposEncontrados.push(`eficiência: ${parsed.eficiencia}`)
  if (parsed.tipo) camposEncontrados.push(`tipo: ${parsed.tipo}`)
  parsed.camposDetectados = camposEncontrados

  console.info('[datasheetExtractor] Resumo da extração:', {
    arquivo: file.name,
    tamanhoBytes: file.size,
    paginasLidas: parsed.paginasLidas,
    totalCaracteres: parsed.totalCaracteres,
    linhasDetectadas: parsed.linhasTabela,
    isScanSemTexto: parsed.isScanSemTexto,
    camposDetectados: camposEncontrados,
  })

  return parsed
}

/**
 * Extrai pistas do nome do arquivo quando disponível
 * Ex.: "RONMA 585W BIFACIAL N-TopCon RM-585W-182M144TB.pdf"
 */
export function parseFileNameHints(fileName?: string): Partial<ExtractedDatasheetData> {
  if (!fileName) return {}
  const hints: Partial<ExtractedDatasheetData> = {}
  const clean = fileName.replace(/\.[a-zA-Z0-9]+$/, '')

  // Marca no nome do arquivo
  for (const m of MARCAS_CONHECIDAS) {
    for (const alias of m.aliases) {
      const reg = new RegExp(
        `(^|[^a-zA-Z0-9])${alias.replace(/\s+/g, '[\\s_-]*')}([^a-zA-Z0-9]|$)`,
        'i',
      )
      if (reg.test(clean)) {
        hints.marca = m.nome
        if (m.tipoPadrao) hints.tipo = m.tipoPadrao
        break
      }
    }
    if (hints.marca) break
  }

  // Modelo específico no nome do arquivo (ex.: RM-585W-182M144TB, CS6W-550MB-AG)
  const modeloMatch =
    clean.match(/\b(RM-[0-9]{3,4}W?-[0-9A-Z]+)\b/i) ||
    clean.match(/\b(CS[0-9][A-Z]-[0-9]{3}[A-Z0-9-]*)\b/i) ||
    clean.match(/\b(LR[0-9]-[0-9]{2}[A-Z0-9-]*)\b/i) ||
    clean.match(/\b(JAM[0-9]{2}[A-Z0-9-]*)\b/i) ||
    clean.match(/\b(TSM-[A-Z0-9-]+)\b/i) ||
    clean.match(/\b(JKM[0-9]{3}[A-Z0-9-]*)\b/i) ||
    clean.match(/\b(SUN2000-[0-9A-Z-]+)\b/i) ||
    clean.match(/\b((?:MIN|MOD|MID|MAC|MAX)\s*[0-9]{3,5}[A-Z0-9-]*)\b/i) ||
    clean.match(/\b(SUN-[0-9A-Z.-]+)\b/i)
  if (modeloMatch) {
    hints.modelo = modeloMatch[1].trim()
  }

  // Potência no nome do arquivo (ex.: 585W, 585 Wp, 585Wp)
  const potMatch = clean.match(/\b([3-7][0-9]{2}|[1-9][0-9]{3,4})\s*W(?:p)?\b/i)
  if (potMatch) {
    const p = parseInt(potMatch[1], 10)
    if (p >= 200 && p <= 100000) {
      hints.potencia_w = p
    }
  }

  if (/(?:bifacial|topcon|n-topcon|n-type|half-cell|painel|m[óo]dulo)/i.test(clean)) {
    hints.tipo = 'modulo_fv'
  } else if (/(?:inversor|inverter|mppt|grid-tied)/i.test(clean)) {
    hints.tipo = 'inversor'
  }

  return hints
}

/**
 * Analisa as linhas estruturadas priorizando tabelas técnicas
 */
export function parseDatasheetText(
  lines: string[],
  tableText: string,
  fullText: string,
  hints?: Partial<ExtractedDatasheetData>,
): ExtractedDatasheetData {
  const result: ExtractedDatasheetData = {}

  // 1. Marca
  let marcaEncontrada: string | undefined
  let tipoSugeridoPorMarca: TipoEquipamento | undefined

  for (const marcaObj of MARCAS_CONHECIDAS) {
    for (const alias of marcaObj.aliases) {
      // Aceita variações de espaçamento e pontuação
      const regex = new RegExp(
        `(^|[^a-zA-Z0-9])${alias.replace(/\s+/g, '[\\s_-]*')}([^a-zA-Z0-9]|$)`,
        'i',
      )
      if (regex.test(tableText) || regex.test(fullText)) {
        marcaEncontrada = marcaObj.nome
        tipoSugeridoPorMarca = marcaObj.tipoPadrao
        break
      }
    }
    if (marcaEncontrada) break
  }

  // Fallback de marca pelo hint (nome do arquivo ou pré-detecção)
  if (!marcaEncontrada && hints?.marca) {
    marcaEncontrada = hints.marca
    tipoSugeridoPorMarca = hints.tipo
  }

  if (marcaEncontrada) {
    result.marca = marcaEncontrada
  }

  // 2. Modelo
  // Padrões específicos de fabricantes conhecidos + famílias TOPCon / PERC
  const modeloPatterns = [
    // RONMA Solar: RM-585W-182M144TB, RM-xxx, RMxxx
    /\b(RM-[0-9]{3,4}W?-[0-9A-Z]+)\b/i,
    /\b(RM-[0-9]{3,4}[A-Z0-9-]*)\b/i,
    // Canadian Solar CS6W / CS3W / CS7N
    /\b(CS[0-9][A-Z]-[0-9]{3}[A-Z0-9-]*)\b/i,
    // Longi LR5-72HPH / LR4 / LR5-54
    /\b(LR[0-9]-[0-9]{2}[A-Z0-9-]*)\b/i,
    // JA Solar JAM66D / JAM72S / JAM54D
    /\b(JAM[0-9]{2}[A-Z0-9-]*)\b/i,
    // Trina TSM-NEG9RC / TSM-xxx
    /\b(TSM-[A-Z0-9-]+)\b/i,
    // Jinko JKMxxxN / Tiger Neo
    /\b(JKM[0-9]{3}[A-Z0-9-]*)\b/i,
    // Talesun
    /\b(TD[0-9][A-Z0-9-]*|TP[0-9][A-Z0-9-]*)\b/i,
    // Risen
    /\b(RSM[0-9]{2,3}-[A-Z0-9-]*)\b/i,
    // DAH Solar
    /\b(DHM-[0-9]{2,3}[A-Z0-9-]*)\b/i,
    // Huawei SUN2000
    /\b(SUN2000-[0-9A-Z-]+)\b/i,
    // Growatt MIN / MOD / MID / MAC / MAX
    /\b((?:MIN|MOD|MID|MAC|MAX)\s*[0-9]{3,5}[A-Z0-9-]*)\b/i,
    // Deye SUN-xxx
    /\b(SUN-[0-9A-Z.-]+)\b/i,
    // Fronius Primo / Symo
    /\b((?:Primo|Symo)\s+[0-9.]+(?:-[0-9]+)?)\b/i,
    // GoodWe GWxxx
    /\b(GW[0-9]{3,5}[A-Z0-9-]*)\b/i,
    // Solis
    /\b(S5-[A-Z0-9-]+|S6-[A-Z0-9-]+)\b/i,
    // Padrão genérico de código de módulo TOPCon/Half-Cell (ex.: ABC-585W-144, 182M144TB)
    /\b([A-Z]{2,4}-[0-9]{3,4}W?-[0-9A-Z]{4,15})\b/i,
  ]

  // Primeiro tentar em linhas que pareçam ser de tabela ou cabeçalho de modelo
  for (const line of lines) {
    if (/(?:model|modelo|type|tipo|código|module type|product code|designation)\b/i.test(line)) {
      for (const pat of modeloPatterns) {
        const m = line.match(pat)
        if (m) {
          result.modelo = m[1].trim()
          break
        }
      }
      if (result.modelo) break

      // Se a linha tem "Model:" seguido de palavra com letras, números e hífens
      const genMatch = line.match(
        /(?:model|modelo|type|tipo|código)[:\s|]+([A-Z0-9][A-Z0-9.-]{4,30})/i,
      )
      if (genMatch) {
        const candid = genMatch[1].trim()
        // Ignora palavras genéricas como "BIFACIAL", "MONO", "TOPCON", "PERC" se vierem sozinhas
        if (!/^(bifacial|monocrystalline|topcon|module|inverter|solar)$/i.test(candid)) {
          result.modelo = candid
          break
        }
      }
    }
  }

  // Se não achou na linha do rótulo, busca nas linhas completas de tabela e no texto corrido
  if (!result.modelo) {
    for (const pat of modeloPatterns) {
      const m = tableText.match(pat) || fullText.match(pat)
      if (m) {
        result.modelo = m[1].trim()
        break
      }
    }
  }

  // Fallback do modelo pelo hint do nome do arquivo (ex.: RM-585W-182M144TB)
  if (!result.modelo && hints?.modelo) {
    result.modelo = hints.modelo
  }

  // 3. Potência em Watts
  // Priorizar tabela técnica: Pmax, Nominal Power, STC, Potência Nominal, Rated Maximum Power, Maximum Power
  let potenciaAchada: number | undefined

  for (const line of lines) {
    const isPotenciaLine =
      /(?:pmax|nominal(?:\s+max(?:imum)?)?\s+power|rated\s+(?:max(?:imum)?\s+)?power|max(?:imum)?\s+power\s*(?:\(pmax\))?|pot[êe]ncia\s+nominal|stc\s*[:|]|pot[êe]ncia\s+m[áa]xima|peak\s+power)/i.test(
        line,
      )
    if (isPotenciaLine) {
      // Extrair números seguidos de W ou soltos se na tabela
      const wattMatch = line.match(/(\d{2,4})\s*(?:W(?:p)?\b|Watts?\b)/i)
      if (wattMatch) {
        const val = parseInt(wattMatch[1], 10)
        if (val >= 200 && val <= 100000) {
          potenciaAchada = val
          break
        }
      }

      // Se a linha tiver lista de valores ex: 565 | 570 | 575 | 580 | 585
      const numMatches = line.match(/\b([3-7][0-9]{2}|[1-9][0-9]{3,4})\b/g)
      if (numMatches && numMatches.length > 0) {
        // Se temos um modelo como RM-585W-182M144TB ou CS6W-550MB-AG, tenta casar com o sufixo numérico
        if (result.modelo) {
          const modNum = result.modelo.match(/[-_](\d{3,4})(?:W|[A-Z]|$)/i)?.[1]
          if (modNum && numMatches.includes(modNum)) {
            potenciaAchada = parseInt(modNum, 10)
            break
          }
        }
        // Se temos hint de potência pelo nome do arquivo
        if (hints?.potencia_w && numMatches.includes(String(hints.potencia_w))) {
          potenciaAchada = hints.potencia_w
          break
        }
        // Se não casou com modelo, pega o maior ou o correspondente
        const numbers = numMatches
          .map((n) => parseInt(n, 10))
          .filter((n) => n >= 250 && n <= 100000)
        if (numbers.length > 0) {
          potenciaAchada = numbers[numbers.length - 1]
          break
        }
      }
    }
  }

  // Fallback para potência: se não achou em linha técnica, tentar pelo código do modelo (ex: -585 no RM-585W-182M144TB ou -550 no CS6W-550MB-AG)
  if (!potenciaAchada && result.modelo) {
    const matchPotModelo = result.modelo.match(/[-_](\d{3,4})(?:W|[A-Z]|$)/i)
    if (matchPotModelo) {
      const val = parseInt(matchPotModelo[1], 10)
      if (val >= 250 && val <= 1000) {
        potenciaAchada = val
      }
    }
  }

  // Fallback: procurar "585 W", "585W", "585 Wp", "585Wp" no texto
  if (!potenciaAchada) {
    const wattMatch =
      tableText.match(/\b(\d{3,4})\s*W(?:p)?\b/i) || fullText.match(/\b(\d{3,4})\s*W(?:p)?\b/i)
    if (wattMatch) {
      const val = parseInt(wattMatch[1], 10)
      if (val >= 250 && val <= 100000) {
        potenciaAchada = val
      }
    }
  }

  // Fallback pelo hint do nome do arquivo
  if (!potenciaAchada && hints?.potencia_w) {
    potenciaAchada = hints.potencia_w
  }

  if (potenciaAchada) {
    result.potencia_w = potenciaAchada
  }

  // 4. Garantia em anos
  // Priorizar "Product Warranty" / "Garantia de Produto" (ex: 12, 15 ou 25 anos)
  // Módulos bifaciais TOPCon costumam ter "15 years product warranty" e "30 years performance/linear warranty"
  for (const line of lines) {
    if (
      /(?:product\s+warranty|garantia\s+(?:de\s+)?produto|materials?\s*(?:&|and)\s*workmanship|warranty\s+years?|garantia\s+legal)/i.test(
        line,
      )
    ) {
      const matchAnos =
        line.match(/\b(\d{1,2})\s*(?:years?|anos?)\b/i) || line.match(/(\d{1,2})\s*-\s*year/i)
      if (matchAnos) {
        const anos = parseInt(matchAnos[1], 10)
        if (anos >= 1 && anos <= 35) {
          result.garantia_anos = anos
          break
        }
      }
    }
  }

  if (!result.garantia_anos) {
    // Busca no texto geral: "15 years product warranty", "12 anos de garantia", "15-year materials"
    const matchGen =
      tableText.match(
        /(\d{1,2})\s*(?:years?|anos?)\s*(?:of\s+)?(?:product\s+warranty|garantia\s+de\s+produto|materials?)/i,
      ) ||
      fullText.match(
        /(\d{1,2})\s*(?:years?|anos?)\s*(?:of\s+)?(?:product\s+warranty|garantia\s+de\s+produto|materials?)/i,
      ) ||
      fullText.match(
        /(?:product\s+warranty|garantia\s+de\s+produto)[^0-9\n]{1,30}(\d{1,2})\s*(?:years?|anos?)/i,
      ) ||
      tableText.match(/(\d{1,2})\s*-\s*year\s*(?:product|workmanship|warranty)/i) ||
      fullText.match(/(\d{1,2})\s*-\s*year\s*(?:product|workmanship|warranty)/i)
    if (matchGen) {
      const anos = parseInt(matchGen[1], 10)
      if (anos >= 1 && anos <= 35) {
        result.garantia_anos = anos
      }
    }
  }

  // Se não achou garantia de produto específica, busca qualquer garantia razoável (10 a 30 anos)
  if (!result.garantia_anos) {
    const matchAnyWarranty =
      tableText.match(/\b(10|12|15|25|30)\s*(?:years?|anos?)\s*(?:linear\s+power\s+)?warranty/i) ||
      fullText.match(/\b(10|12|15|25|30)\s*(?:years?|anos?)\s*(?:linear\s+power\s+)?warranty/i)
    if (matchAnyWarranty) {
      result.garantia_anos = parseInt(matchAnyWarranty[1], 10)
    }
  }

  // 5. Eficiência (%)
  for (const line of lines) {
    if (
      /(?:module\s+efficiency|efici[êe]ncia(?:\s+do\s+m[óo]dulo)?|max(?:\s+module)?\s+efficiency|stc\s+efficiency)/i.test(
        line,
      )
    ) {
      // Extrair todas as eficiências da linha (ex.: 21.5% | 21.8% | 22.0% | 22.4% | 22.6%)
      const matches = Array.from(line.matchAll(/(\d{1,2}[.,]\d{1,2})\s*%/g))
      if (matches.length > 0) {
        // Se temos várias potências em tabela e achamos a potência correspondente, tenta a maior ou última
        const lastMatch = matches[matches.length - 1][1].replace(',', '.')
        result.eficiencia = `${lastMatch}%`
        break
      }
    }
  }
  if (!result.eficiencia) {
    const matchPct =
      tableText.match(/(?:efficiency|efici[êe]ncia)[^0-9%]{1,25}(\d{1,2}[.,]\d{1,2})\s*%/i) ||
      fullText.match(/(?:efficiency|efici[êe]ncia)[^0-9%]{1,25}(\d{1,2}[.,]\d{1,2})\s*%/i)
    if (matchPct) {
      result.eficiencia = `${matchPct[1].replace(',', '.')}%`
    }
  }

  // 6. Tipo de Equipamento (modulo_fv vs inversor)
  // Detectar por palavras-chave técnicas
  const isInversor =
    /(?:inversor|inverter|mppt|grid-tied|on-grid|string\s+inverter|hybrid\s+inverter)\b/i.test(
      tableText,
    ) || /(?:inversor|inverter|mppt|grid-tied)\b/i.test(fullText)
  const isModulo =
    /(?:m[óo]dulo|module|pv\s+module|photovoltaic|bifacial|monocrystalline|monocristalino|perc|topcon|n-topcon|n-type|cell\s+type|half-cut|half-cell)\b/i.test(
      tableText,
    ) || /(?:bifacial|topcon|monocrystalline|m[óo]dulo|photovoltaic)\b/i.test(fullText)

  if (isModulo && !isInversor) {
    result.tipo = 'modulo_fv'
  } else if (isInversor && !isModulo) {
    result.tipo = 'inversor'
  } else if (tipoSugeridoPorMarca) {
    result.tipo = tipoSugeridoPorMarca
  } else if (hints?.tipo) {
    result.tipo = hints.tipo
  } else if (result.potencia_w && result.potencia_w > 1500) {
    // Inversores costumam ter potência nominal > 1500W, módulos < 800W
    result.tipo = 'inversor'
  } else if (result.potencia_w && result.potencia_w <= 800) {
    result.tipo = 'modulo_fv'
  }

  // 7. Descrição técnica padronizada montada a partir dos dados achados
  const descPartes: string[] = []
  if (result.tipo === 'modulo_fv') {
    const isTopcon =
      /topcon|n-topcon|n-type/i.test(tableText) || /topcon|n-topcon|n-type/i.test(fullText)
    const isBifacial = /bifacial/i.test(tableText) || /bifacial/i.test(fullText)

    const qualificadores: string[] = []
    if (isTopcon) qualificadores.push('TOPCon N-Type')
    if (isBifacial) qualificadores.push('Bifacial')

    const baseNome =
      qualificadores.length > 0
        ? `Módulo fotovoltaico ${qualificadores.join(' ')}`
        : 'Módulo fotovoltaico'

    const partesModulo: string[] = [baseNome]
    if (result.marca) partesModulo.push(result.marca)
    if (result.modelo) partesModulo.push(result.modelo)
    if (result.potencia_w) partesModulo.push(`de ${result.potencia_w}W`)
    if (result.eficiencia) partesModulo.push(`com eficiência de até ${result.eficiencia}`)
    if (result.garantia_anos)
      partesModulo.push(`e garantia de produto de ${result.garantia_anos} anos`)
    descPartes.push(partesModulo.join(' '))
  } else if (result.tipo === 'inversor') {
    const partesInversor: string[] = ['Inversor']
    if (result.marca) partesInversor.push(result.marca)
    if (result.modelo) partesInversor.push(result.modelo)
    if (result.potencia_w) {
      const kw = (result.potencia_w / 1000).toFixed(1).replace('.0', '')
      partesInversor.push(`com potência nominal de ${result.potencia_w}W (${kw} kW)`)
    }
    if (result.garantia_anos)
      partesInversor.push(`e garantia de fábrica de ${result.garantia_anos} anos`)
    descPartes.push(partesInversor.join(' '))
  }

  if (descPartes.length > 0) {
    result.descricao_padrao = descPartes.join('. ') + '.'
  }

  result.rawTextPreview = lines.slice(0, 30).join('\n')

  return result
}

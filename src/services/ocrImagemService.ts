/**
 * Serviço de OCR e análise visual no navegador para orçamentos de fornecedores solares.
 * Utiliza Tesseract.js carregado dinamicamente com suporte para português ('por') e inglês ('eng').
 * Extrai linhas de texto, números, modelos, quantidades e valores nos padrões brasileiros.
 */

import { extrairValorEmReais } from '@/lib/orcamentoParser'
import type { Fornecedor, FornecedorItemOrcamento } from '@/types/crm'

export interface LinhaDetectadaOCR {
  id: string
  textoOriginal: string
  textoLimpo: string
  tipoDetectado: 'modulo' | 'inversor' | 'acessorio' | 'valor' | 'cabecalho' | 'outro'
  quantidadeSugerida: number
  potenciaWpSugerida?: number
  marcaSugerida?: string
  modeloSugerido?: string
  valorDetectado?: number
  confianca?: number
}

export interface AnaliseImagemResultado {
  textoCompleto: string
  linhas: LinhaDetectadaOCR[]
  fornecedorDetectado?: string
  fornecedorIdDetectado?: string
  numeroRevisaoDetectado?: string
  valoresDetectados: number[]
  valorTotalSugerido: number
  modulosSugeridos: FornecedorItemOrcamento[]
  inversoresSugeridos: FornecedorItemOrcamento[]
  acessoriosSugeridos: FornecedorItemOrcamento[]
}

const MARCAS_MODULOS = [
  'Canadian Solar',
  'JA Solar',
  'Jinko Solar',
  'Trina Solar',
  'Longi Solar',
  'Risen Energy',
  'Osda Solar',
  'BYD',
  'Ahn-Solar',
  'Dah Solar',
  'Talesun',
  'Suntech',
  'GCL',
  'Leapton',
  'Astronergy',
  'Chint',
  'WEG',
]

const MARCAS_INVERSORES = [
  'Growatt',
  'Deye',
  'Huawei',
  'Solis',
  'Sungrow',
  'Fronius',
  'GoodWe',
  'Hoymiles',
  'SAJ',
  'WEG',
  'Sofar',
  'APsystems',
  'ABB',
  'SMA',
  'Chint',
  'Kehua',
]

const PALAVRAS_CHAVE_ACESSORIOS = [
  'string box',
  'stringbox',
  'cabo solar',
  'cabo 4mm',
  'cabo 6mm',
  'conector mc4',
  'mc4',
  'dps',
  'disjuntor',
  'estrutura',
  'trilho',
  'gancho',
  'grampo',
  'terminal',
  'aterramento',
  'smart meter',
  'dongle',
  'fusível',
  'fusivel',
  'perfil',
  'suporte fixação',
  'modulo de comunicacao',
]

// Carregador assíncrono do Tesseract.js (via CDN com fallback)
declare global {
  interface Window {
    Tesseract?: {
      createWorker: (
        langs?: string | string[],
        oem?: number,
        options?: Record<string, unknown>,
      ) => Promise<any>
    }
  }
}

let tesseractScriptPromise: Promise<void> | null = null

export function carregarTesseract(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Tesseract.js só pode rodar no navegador.'))
  }

  if (window.Tesseract) {
    return Promise.resolve()
  }

  if (tesseractScriptPromise) {
    return tesseractScriptPromise
  }

  tesseractScriptPromise = new Promise<void>((resolve, reject) => {
    // Verificar se já existe tag script injetada
    const existing = document.querySelector('script[data-tesseract="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () =>
        reject(new Error('Falha ao carregar Tesseract.js via script existente.')),
      )
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.async = true
    script.setAttribute('data-tesseract', 'true')

    script.onload = () => {
      if (window.Tesseract) {
        resolve()
      } else {
        reject(new Error('Tesseract carregado porém objeto não encontrado no escopo global.'))
      }
    }

    script.onerror = () => {
      // Fallback para cdn unpkg
      console.warn('Falha no jsDelivr do Tesseract.js, tentando unpkg...')
      const fallbackScript = document.createElement('script')
      fallbackScript.src = 'https://unpkg.com/tesseract.js@5.1.0/dist/tesseract.min.js'
      fallbackScript.async = true
      fallbackScript.onload = () => {
        if (window.Tesseract) resolve()
        else reject(new Error('Falha ao instanciar Tesseract.js via fallback.'))
      }
      fallbackScript.onerror = () => {
        reject(new Error('Não foi possível carregar a biblioteca Tesseract.js para OCR.'))
      }
      document.head.appendChild(fallbackScript)
    }

    document.head.appendChild(script)
  })

  return tesseractScriptPromise
}

/**
 * Pré-processa uma imagem para melhorar o contraste do OCR
 */
export async function preprocessImage(imageFile: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(e.target?.result as string)
            return
          }

          // Manter proporção mas assegurar tamanho adequado (mínimo 1400px na maior dimensão para OCR nítido)
          let width = img.width
          let height = img.height
          const maxDim = Math.max(width, height)
          if (maxDim < 1400) {
            const scale = 1400 / maxDim
            width = Math.round(width * scale)
            height = Math.round(height * scale)
          }

          canvas.width = width
          canvas.height = height

          // Desenhar imagem
          ctx.drawImage(img, 0, 0, width, height)

          // Obter dados de pixels para melhorar nitidez e binarização leve
          const imgData = ctx.getImageData(0, 0, width, height)
          const data = imgData.data

          // Escala de cinza com contraste melhorado
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            // Luminância padrão
            const gray = 0.299 * r + 0.587 * g + 0.114 * b
            // Aumentar contraste
            const contrast = 1.15
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
            const newGray = Math.min(255, Math.max(0, factor * (gray - 128) + 128))

            data[i] = newGray
            data[i + 1] = newGray
            data[i + 2] = newGray
          }

          ctx.putImageData(imgData, 0, 0)
          resolve(canvas.toDataURL('image/png'))
        } catch {
          // Se der qualquer falha de canvas/CORS, usar a URL data original
          resolve(e.target?.result as string)
        }
      }
      img.onerror = () => resolve(e.target?.result as string)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(URL.createObjectURL(imageFile))
    reader.readAsDataURL(imageFile)
  })
}

/**
 * Extrai quantidade de uma linha de texto nos mais variados formatos brasileiros
 * Ex: "10x 550W", "Qtd: 12", "52 un", "12 peças", "3 PÇ", "(10) Módulos"
 */
export function extrairQuantidadeDaLinha(line: string): number {
  const lineLower = line.toLowerCase()

  // 1. Qtd: 12 ou Quantidade: 12
  const mQtd = lineLower.match(/(?:qtd|quantidade|quant\.?|quant|unid|unidades?)[:\s=]*(\d+)/)
  if (mQtd && mQtd[1]) {
    const q = parseInt(mQtd[1], 10)
    if (q > 0 && q < 5000) return q
  }

  // 2. 10x ou 10X no início ou meio
  const mX = line.match(/(?:^|\s|\()(\d+)\s*[xX]\b/)
  if (mX && mX[1]) {
    const q = parseInt(mX[1], 10)
    if (q > 0 && q < 5000) return q
  }

  // 3. 52 un, 12 pcs, 10 peças
  const mUn = lineLower.match(/\b(\d+)\s*(?:unidades?|peças?|pçs?|pcs|unid\.?|un\b|pç\b)/)
  if (mUn && mUn[1]) {
    const q = parseInt(mUn[1], 10)
    if (q > 0 && q < 5000) return q
  }

  // 4. Número no início da linha seguido de descrição "12 Modulo Solar..."
  const mInicio = line.match(/^(\d+)\s*[-.)]\s+[A-Za-z]/)
  if (mInicio && mInicio[1]) {
    const q = parseInt(mInicio[1], 10)
    if (q > 0 && q < 5000) return q
  }

  return 1
}

/**
 * Extrai potência em Wp de uma linha (ex: "550W", "550 Wp", "600W", "450 W")
 */
export function extrairPotenciaWpDaLinha(line: string): number | undefined {
  const m = line.match(/\b(\d{3,4})\s*Wp?\b/i)
  if (m && m[1]) {
    const pot = parseInt(m[1], 10)
    if (pot >= 150 && pot <= 900) return pot
  }
  return undefined
}

/**
 * Detecta marca conhecida no texto
 */
export function detectarMarca(line: string, listaMarcas: string[]): string | undefined {
  const lineLower = line.toLowerCase()
  for (const marca of listaMarcas) {
    if (lineLower.includes(marca.toLowerCase())) {
      return marca
    }
  }
  return undefined
}

/**
 * Executa OCR na imagem e realiza análise heurística especializada no mercado fotovoltaico brasileiro
 */
export async function analisarImagemOrcamento(
  imageFile: File,
  fornecedoresCadastrados: Fornecedor[] = [],
  onProgress?: (progresso: { status: string; percent: number }) => void,
): Promise<AnaliseImagemResultado> {
  await carregarTesseract()

  if (!window.Tesseract) {
    throw new Error('Falha ao inicializar o motor Tesseract.js de OCR.')
  }

  onProgress?.({ status: 'Otimizando contraste da imagem...', percent: 10 })
  const processedDataUrl = await preprocessImage(imageFile)

  onProgress?.({ status: 'Inicializando OCR (Português + Inglês)...', percent: 25 })

  // Tesseract v5 createWorker aceita 'por+eng' ou ['por', 'eng']
  const worker = await window.Tesseract.createWorker(['por', 'eng'], 1, {
    logger: (m: any) => {
      if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
        const p = Math.round(30 + m.progress * 60)
        onProgress?.({
          status: `Reconhecendo caracteres (${Math.round(m.progress * 100)}%)...`,
          percent: p,
        })
      }
    },
  })

  let rawText = ''
  try {
    const res = await worker.recognize(processedDataUrl)
    rawText = res?.data?.text || ''
  } finally {
    try {
      await worker.terminate()
    } catch {
      // noop
    }
  }

  onProgress?.({ status: 'Analisando e classificando itens fotovoltaicos...', percent: 95 })

  return parsearTextoOCR(rawText, imageFile.name, fornecedoresCadastrados)
}

/**
 * Parser do texto extraído pelo OCR
 */
export function parsearTextoOCR(
  rawText: string,
  fileName: string,
  fornecedoresCadastrados: Fornecedor[] = [],
): AnaliseImagemResultado {
  const rawLines = rawText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 2)

  // 1. Identificar Fornecedor
  let fornecedorDetectado: string | undefined = undefined
  let fornecedorIdDetectado: string | undefined = undefined

  for (const forn of fornecedoresCadastrados) {
    if (forn.nome_empresa && rawText.toLowerCase().includes(forn.nome_empresa.toLowerCase())) {
      fornecedorDetectado = forn.nome_empresa
      fornecedorIdDetectado = forn.id
      break
    }
  }

  if (!fornecedorDetectado) {
    // Buscar nomes típicos no texto
    const regexesForn = [
      /(?:Distribuidora|Fornecedor|Razão Social|Empresa|Distribuidor)[:\s]+([A-Z0-9À-Úa-z\s]{3,45})/i,
      /([A-Z0-9À-Úa-z\s]{3,35}(?:Distribuidora|Solar|Distribuição|Fotovoltaic[oa]|Comercial|Elétrica))/i,
    ]
    for (const rx of regexesForn) {
      const m = rawText.match(rx)
      if (m && m[1] && m[1].trim().length > 3) {
        fornecedorDetectado = m[1].trim()
        break
      }
    }
  }

  // 2. Identificar Revisão / Cotação
  let numeroRevisaoDetectado: string | undefined = undefined
  const revMatch = rawText.match(
    /(?:Revisão|Rev\.?|Proposta Nº|Cotação Nº|Orçamento Nº)[:\s]*([A-Z0-9\-_./]{2,25})/i,
  )
  if (revMatch && revMatch[1]) {
    numeroRevisaoDetectado = revMatch[1].trim()
  } else {
    const revCode = rawText.match(/\b(REV[-_ ]?\d+|ST[-_0-9A-Z]+|COT[-_0-9A-Z]+)\b/i)
    if (revCode) numeroRevisaoDetectado = revCode[0].trim()
  }

  // 3. Identificar Todos os Valores Monetários (R$)
  const valoresDetectadosSet = new Set<number>()
  // Padrões monetários
  const matchesValor = rawText.matchAll(
    /(?:R\$\s*|TOTAL\s*:?\s*R?\$?\s*)([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]{2,6}(?:,[0-9]{2}))/gi,
  )
  for (const m of matchesValor) {
    const v = extrairValorEmReais(m[1])
    if (v >= 100 && v <= 5000000) {
      valoresDetectadosSet.add(v)
    }
  }

  // Também procurar por valores com "Total:" ou "Total Geral:"
  const totalGeralMatch = rawText.match(
    /(?:TOTAL GERAL|VALOR TOTAL|TOTAL DO ORÇAMENTO|TOTAL PROPOSTA|INVESTIMENTO TOTAL|VALOR LÍQUIDO|VALOR FINAL)[:\s]*R?\$?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2}))/i,
  )

  let valorTotalSugerido = 0
  if (totalGeralMatch && totalGeralMatch[1]) {
    valorTotalSugerido = extrairValorEmReais(totalGeralMatch[1])
  } else if (valoresDetectadosSet.size > 0) {
    // Escolher o maior valor encontrado
    valorTotalSugerido = Math.max(...Array.from(valoresDetectadosSet))
  }

  const valoresDetectados = Array.from(valoresDetectadosSet).sort((a, b) => b - a)

  // 4. Analisar Linhas e Classificar
  const linhas: LinhaDetectadaOCR[] = []
  const modulosSugeridos: FornecedorItemOrcamento[] = []
  const inversoresSugeridos: FornecedorItemOrcamento[] = []
  const acessoriosSugeridos: FornecedorItemOrcamento[] = []

  rawLines.forEach((textoLinha, index) => {
    const lLower = textoLinha.toLowerCase()

    // Ignorar linhas muito curtas ou puramente ruído
    if (textoLinha.length < 3 || /^[^\w\d]+$/.test(textoLinha)) return

    const id = `ocr-line-${index}-${Date.now()}`
    const qtd = extrairQuantidadeDaLinha(textoLinha)
    const potWp = extrairPotenciaWpDaLinha(textoLinha)
    const marcaModulo = detectarMarca(textoLinha, MARCAS_MODULOS)
    const marcaInversor = detectarMarca(textoLinha, MARCAS_INVERSORES)
    const valorLinha = extrairValorEmReais(textoLinha)

    // Limpar prefixos numéricos de quantidade ("10x ", "12 - ", etc.) para a descrição
    const textoLimpo = textoLinha
      .replace(/^(\d+)\s*(?:x|un|pç|unidades?|-|\*|\.)\s*/i, '')
      .replace(/(?:qtd|quantidade)[:\s]*\d+/i, '')
      .trim()

    let tipo: LinhaDetectadaOCR['tipoDetectado'] = 'outro'

    // Classificação de Módulo
    const isModulo =
      lLower.includes('módulo') ||
      lLower.includes('modulo') ||
      lLower.includes('painel') ||
      lLower.includes('placa solar') ||
      lLower.includes('fotovoltaico') ||
      Boolean(marcaModulo) ||
      (potWp !== undefined &&
        (lLower.includes('w') || lLower.includes('mono') || lLower.includes('bifacial')))

    const isAcessorioKeyword = PALAVRAS_CHAVE_ACESSORIOS.some((kw) => lLower.includes(kw))

    // Classificação de Inversor
    const isInversor =
      (lLower.includes('inversor') ||
        lLower.includes('microinversor') ||
        Boolean(marcaInversor) ||
        lLower.includes('invers.')) &&
      !lLower.includes('cabo') &&
      !lLower.includes('conector') &&
      !lLower.includes('dongle')

    if (
      isModulo &&
      !lLower.includes('cabo') &&
      !lLower.includes('conector') &&
      !lLower.includes('estrutura') &&
      !isInversor
    ) {
      tipo = 'modulo'
      modulosSugeridos.push({
        descricao: textoLimpo || textoLinha,
        quantidade: qtd,
      })
    } else if (isInversor) {
      tipo = 'inversor'
      inversoresSugeridos.push({
        descricao: textoLimpo || textoLinha,
        quantidade: qtd,
      })
    } else if (isAcessorioKeyword) {
      tipo = 'acessorio'
      acessoriosSugeridos.push({
        descricao: textoLimpo || textoLinha,
        quantidade: qtd,
      })
    } else if (
      lLower.includes('total') ||
      lLower.includes('valor') ||
      lLower.includes('r$') ||
      (valorLinha > 0 && valorLinha === valorTotalSugerido)
    ) {
      tipo = 'valor'
    } else if (
      lLower.includes('orçamento') ||
      lLower.includes('cotação') ||
      lLower.includes('proposta') ||
      lLower.includes('fornecedor') ||
      lLower.includes('cliente')
    ) {
      tipo = 'cabecalho'
    }

    linhas.push({
      id,
      textoOriginal: textoLinha,
      textoLimpo: textoLimpo || textoLinha,
      tipoDetectado: tipo,
      quantidadeSugerida: qtd,
      potenciaWpSugerida: potWp,
      marcaSugerida: marcaModulo || marcaInversor,
      modeloSugerido: textoLimpo || textoLinha,
      valorDetectado: valorLinha > 0 ? valorLinha : undefined,
    })
  })

  return {
    textoCompleto: rawText,
    linhas,
    fornecedorDetectado,
    fornecedorIdDetectado,
    numeroRevisaoDetectado,
    valoresDetectados,
    valorTotalSugerido,
    modulosSugeridos,
    inversoresSugeridos,
    acessoriosSugeridos,
  }
}

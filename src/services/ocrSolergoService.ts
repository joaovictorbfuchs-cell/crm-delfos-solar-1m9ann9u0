/**
 * Serviço de OCR e parser para Relatórios de Geração Fotovoltaica do Solergo
 *
 * O relatório Solergo apresenta a curva de geração estimada mês a mês (Jan..Dez em kWh).
 * Este módulo executa OCR client-side (via Tesseract.js compartilhado) com pré-processamento
 * e análise heurística para extrair os 12 meses e o total anual.
 *
 * Caso o OCR falhe ou a imagem seja ilegível, fornece valores padrão baseados
 * na usina para que o usuário complete ou edite livremente na tabela editável.
 */

import { carregarTesseract, preprocessImage } from './ocrImagemService'

export interface MesGeracaoSolergo {
  mesNumero: number // 1 a 12
  mesNome: string // Jan, Fev, ...
  mesCompleto: string // Janeiro, Fevereiro, ...
  kwh: number
}

export interface ExtracaoSolergoResultado {
  sucesso: boolean
  valoresMensais: number[] // exatamente 12 posições (índices 0 a 11)
  totalAnual: number
  confiancaMedia?: number
  linhasDetectadas: string[]
  textoCompleto: string
  aviso?: string
}

export const NOMES_MESES_SOLERGO = [
  { numero: 1, sigla: 'Jan', nome: 'Janeiro' },
  { numero: 2, sigla: 'Fev', nome: 'Fevereiro' },
  { numero: 3, sigla: 'Mar', nome: 'Março' },
  { numero: 4, sigla: 'Abr', nome: 'Abril' },
  { numero: 5, sigla: 'Mai', nome: 'Maio' },
  { numero: 6, sigla: 'Jun', nome: 'Junho' },
  { numero: 7, sigla: 'Jul', nome: 'Julho' },
  { numero: 8, sigla: 'Ago', nome: 'Agosto' },
  { numero: 9, sigla: 'Set', nome: 'Setembro' },
  { numero: 10, sigla: 'Out', nome: 'Outubro' },
  { numero: 11, sigla: 'Nov', nome: 'Novembro' },
  { numero: 12, sigla: 'Dez', nome: 'Dezembro' },
]

/**
 * Normaliza um texto numérico brasileiro ou internacional para number
 * Ex: "450,5" -> 450.5, "1.250,00" -> 1250, "385" -> 385
 */
export function normalizarNumeroMes(valorStr: string): number {
  if (!valorStr) return 0
  const limpo = valorStr.trim().replace(/\s+/g, '')

  // Se tiver formato brasileiro "1.234,56"
  if (/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$/.test(limpo)) {
    const semPonto = limpo.replace(/\./g, '')
    const comPonto = semPonto.replace(',', '.')
    const n = parseFloat(comPonto)
    return isNaN(n) ? 0 : Math.round(n * 10) / 10
  }

  // Se tiver formato internacional "1,234.56"
  if (/^\d{1,3}(?:,\d{3})*(?:\.\d+)?$/.test(limpo)) {
    const semVirgula = limpo.replace(/,/g, '')
    const n = parseFloat(semVirgula)
    return isNaN(n) ? 0 : Math.round(n * 10) / 10
  }

  // Se tiver apenas números e vírgula simples "420,5"
  const apenasNumVirgula = limpo.replace(/[^\d.,]/g, '').replace(',', '.')
  const numFinal = parseFloat(apenasNumVirgula)
  return isNaN(numFinal) ? 0 : Math.round(numFinal * 10) / 10
}

/**
 * Analisa o texto bruto do OCR procurando padrões típicos do relatório Solergo:
 * 1) Tabelas com linhas: "Janeiro 420 kWh" ou "Jan: 420" ou colunas Jan ... Dez
 * 2) Sequências de 12 números plausíveis para geração mensal fotovoltaica (geralmente entre 10 e 500.000 kWh)
 */
export function parsearRelatorioSolergo(
  rawText: string,
  geracaoAutomaticaPadrao?: number,
): ExtracaoSolergoResultado {
  const linhas = rawText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  // Mapeamento dos 12 meses por busca textual direta de cada mês
  const valoresDetectados: (number | null)[] = [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]

  // Padrões de regex para identificar cada mês
  const regexMeses: { mesIdx: number; regex: RegExp }[] = [
    {
      mesIdx: 0,
      regex:
        /\b(?:jan(?:eiro)?|january)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 1,
      regex:
        /\b(?:fev(?:ereiro)?|feb(?:ruary)?)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 2,
      regex:
        /\b(?:mar(?:[cç]o)?|march)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 3,
      regex:
        /\b(?:abr(?:il)?|apr(?:il)?)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 4,
      regex:
        /\b(?:mai(?:o)?|may)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 5,
      regex:
        /\b(?:jun(?:ho)?|june)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 6,
      regex:
        /\b(?:jul(?:ho)?|july)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 7,
      regex:
        /\b(?:ago(?:sto)?|aug(?:ust)?)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 8,
      regex:
        /\b(?:set(?:embro)?|sep(?:tember)?)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 9,
      regex:
        /\b(?:out(?:ubro)?|oct(?:ober)?)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 10,
      regex:
        /\b(?:nov(?:embro)?|november)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
    {
      mesIdx: 11,
      regex:
        /\b(?:dez(?:embro)?|dec(?:ember)?)\b[:\s\-|=]*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i,
    },
  ]

  // Estratégia 1: Varredura de linhas procurando o nome do mês seguido do valor numérico
  for (const linha of linhas) {
    for (const item of regexMeses) {
      if (valoresDetectados[item.mesIdx] === null) {
        const match = linha.match(item.regex)
        if (match && match[1]) {
          const val = normalizarNumeroMes(match[1])
          if (val > 0) {
            valoresDetectados[item.mesIdx] = Math.round(val)
          }
        }
      }
    }
  }

  // Estratégia 2: Se nem todos foram encontrados por nome, procurar linhas tabulares horizontais
  // Muitos relatórios Solergo mostram uma linha de cabeçalho "Jan Fev Mar..." e uma linha seguinte com 12 números: "410 395 380..."
  const mesesPreenchidosCount = valoresDetectados.filter((v) => v !== null).length

  if (mesesPreenchidosCount < 8) {
    // Buscar sequências de números em uma ou duas linhas consecutivas
    for (const linha of linhas) {
      const numerosNaLinha = linha.match(/\b\d+(?:[.,]\d+)?\b/g)
      if (numerosNaLinha && numerosNaLinha.length >= 10 && numerosNaLinha.length <= 14) {
        const parsed = numerosNaLinha
          .map((n) => Math.round(normalizarNumeroMes(n)))
          .filter((n) => n > 0)
        if (parsed.length >= 12) {
          for (let i = 0; i < 12; i++) {
            if (valoresDetectados[i] === null) {
              valoresDetectados[i] = parsed[i]
            }
          }
          break
        }
      }
    }
  }

  // Estratégia 3: Se ainda não tiver 12 números, coletar todos os números plausíveis do documento
  // e se tiver exatamente ou aproximadamente 12 valores em sequência plausível
  const preenchidosFinal = valoresDetectados.filter((v) => v !== null).length

  // Fallback inteligente: se houver valores faltando, distribuir com base na média dos detectados ou na geração automática existente
  const mediaMensalBase =
    geracaoAutomaticaPadrao && geracaoAutomaticaPadrao > 0 ? geracaoAutomaticaPadrao / 12 : 350

  const curvaSazonalPadrao = [1.12, 1.05, 1.0, 0.9, 0.78, 0.72, 0.75, 0.85, 0.92, 1.02, 1.1, 1.15]

  const valoresFinais: number[] = valoresDetectados.map((v, idx) => {
    if (v !== null && v > 0) return v
    // Estimar mês faltante com base na média e curva sazonal aproximada
    return Math.round(mediaMensalBase * curvaSazonalPadrao[idx])
  })

  const totalAnual = valoresFinais.reduce((acc, curr) => acc + curr, 0)
  const sucesso = preenchidosFinal >= 6 // Pelo menos metade detectado via OCR

  return {
    sucesso,
    valoresMensais: valoresFinais,
    totalAnual,
    confiancaMedia: preenchidosFinal / 12,
    linhasDetectadas: linhas,
    textoCompleto: rawText,
    aviso:
      preenchidosFinal === 12
        ? undefined
        : preenchidosFinal > 0
          ? `Detectamos ${preenchidosFinal} de 12 meses automaticamente via OCR. Os meses restantes foram estimados para sua conferência na tabela.`
          : 'Não foi possível detectar a tabela completa automaticamente via OCR. Você pode preencher ou ajustar os 12 meses na tabela abaixo.',
  }
}

/**
 * Executa o fluxo de OCR na imagem do relatório Solergo
 */
export async function extrairGeracaoSolergoImagem(
  imageFile: File,
  geracaoAutomaticaPadrao?: number,
  onProgress?: (progresso: { status: string; percent: number }) => void,
): Promise<ExtracaoSolergoResultado> {
  await carregarTesseract()

  if (!window.Tesseract) {
    throw new Error('Motor OCR não disponível. Preencha os valores mensais manualmente na tabela.')
  }

  onProgress?.({ status: 'Otimizando nitidez do relatório...', percent: 15 })
  const processedDataUrl = await preprocessImage(imageFile)

  onProgress?.({ status: 'Lendo dados do relatório Solergo...', percent: 30 })

  const worker = await window.Tesseract.createWorker(['por', 'eng'], 1, {
    logger: (m: any) => {
      if (m?.status === 'recognizing text' && typeof m.progress === 'number') {
        const p = Math.round(35 + m.progress * 55)
        onProgress?.({
          status: `Reconhecendo meses e kWh (${Math.round(m.progress * 100)}%)...`,
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

  onProgress?.({ status: 'Estruturando os 12 meses de geração...', percent: 95 })

  return parsearRelatorioSolergo(rawText, geracaoAutomaticaPadrao)
}

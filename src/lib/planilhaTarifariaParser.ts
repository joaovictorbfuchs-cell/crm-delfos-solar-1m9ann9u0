import type { TipoClienteProjecao } from '@/data/planilhaBaseProjecao'
import type { ProjecaoTarifariaItemInput } from '@/services/projecaoTarifariaService'

export interface BlocoDetectado {
  tipo: TipoClienteProjecao
  nome: string
  linhas: ProjecaoTarifariaItemInput[]
}

export interface ResultadoParsePlanilhaTarifaria {
  sucesso: boolean
  erro?: string
  blocos: BlocoDetectado[]
  totalLinhasValidas: number
}

/**
 * Converte qualquer representação numérica textual (ex: "1.1979", "1,1979", "30%", "R$ 1.200,50") em número.
 */
export function normalizarNumero(val: unknown): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (!val) return 0
  let str = String(val).trim()
  if (!str) return 0

  // Se tem %, converter percentual
  const isPercent = str.includes('%')
  str = str.replace(/[^\d,.-]/g, '')

  // Se tem vírgula e ponto, ex: "1.200,50" -> "1200.50"
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.includes(',')) {
    str = str.replace(',', '.')
  }

  const num = parseFloat(str)
  if (isNaN(num)) return 0
  return isPercent ? num / 100 : num
}

function normalizarTexto(txt: unknown): string {
  if (!txt) return ''
  return String(txt)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Analisa a matriz de strings extraída do XLSX ou CSV e detecta as linhas de projeção.
 *
 * A planilha do usuário pode ter:
 * 1) Dois blocos verticais ou horizontais na mesma aba (ex: aba "Orçamento" com "Residencial: Ano"
 *    e depois "Comercial: Ano", ou blocos separados por títulos "Residencial" e "Comercial").
 * 2) Uma tabela plana com colunas "Ano", "Tarifa", "FioB", "FS", "GD Eco Líquida", etc.
 * 3) Uma coluna indicando o tipo ("tipo_cliente" ou "Residencial" / "Comercial").
 *
 * @param rawMatrix matriz bidimensional com todas as células da planilha
 * @param tipoClienteForcado se informado, força todos os dados para esse tipo
 */
export function extrairLinhasTarifarias(
  rawMatrix: string[][],
  tipoClienteForcado?: TipoClienteProjecao,
): ResultadoParsePlanilhaTarifaria {
  if (!rawMatrix || rawMatrix.length === 0) {
    return {
      sucesso: false,
      erro: 'A planilha enviada está vazia.',
      blocos: [],
      totalLinhasValidas: 0,
    }
  }

  const linhasResidencial: ProjecaoTarifariaItemInput[] = []
  const linhasComercial: ProjecaoTarifariaItemInput[] = []

  // Estratégia 1: Varredura procurando cabeçalhos de bloco
  // Na planilha real do usuário, temos colunas como:
  // "Residencial: Ano" (ou "Ano"), "Tarifa (R$/kWh)", "FioB (R$/kWh)", "FS", "GD Eco Líquida (R$/kWh)", "Economia Acum.", "Gasto acum."
  // E mais abaixo ou em outra coluna temos o bloco "Comercial".

  // Vamos procurar linhas onde aparece uma coluna com "ano" e "tarifa"
  let modoBlocoAtual: TipoClienteProjecao | null = tipoClienteForcado ?? null

  for (let r = 0; r < rawMatrix.length; r++) {
    const row = rawMatrix[r]
    if (!row || row.length === 0) continue

    // Checar se a linha atual anuncia uma mudança de bloco (ex: célula com "Residencial" ou "Comercial")
    if (!tipoClienteForcado) {
      for (const cell of row) {
        const norm = normalizarTexto(cell)
        if (
          norm === 'residencial' ||
          norm.startsWith('residencial:') ||
          norm.includes('autoconsumo residencial')
        ) {
          modoBlocoAtual = 'residencial'
        } else if (
          norm === 'comercial' ||
          norm.startsWith('comercial:') ||
          norm.includes('autoconsumo comercial')
        ) {
          modoBlocoAtual = 'comercial'
        }
      }
    }

    // Procurar nas células desta linha por colunas de Projeção Tarifária
    // Procura uma sequência de colunas: Ano (2025..2060), Tarifa (~0.5 a 50), Fio B (~0.05 a 20), FS (~0.1 a 1), etc.
    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c]?.trim() || ''
      const anoNum = parseInt(cellVal, 10)

      // Ano plausível da projeção (entre 2024 e 2060)
      if (anoNum >= 2024 && anoNum <= 2060 && String(anoNum) === cellVal.slice(0, 4)) {
        // Encontramos uma linha com ano! Vamos buscar as colunas adjacentes
        const tarifaRaw = row[c + 1]
        const fioBRaw = row[c + 2]
        const fsRaw = row[c + 3]
        const gdEcoRaw = row[c + 4]
        const ecoAcumRaw = row[c + 5]
        const gastoAcumRaw = row[c + 6]

        const tarifa = normalizarNumero(tarifaRaw)
        const fioB = normalizarNumero(fioBRaw)
        const fs = normalizarNumero(fsRaw)
        const gdEco = normalizarNumero(gdEcoRaw)
        const ecoAcum = normalizarNumero(ecoAcumRaw)
        const gastoAcum = normalizarNumero(gastoAcumRaw)

        // Validação: Tarifa deve ser um valor razoável em R$/kWh (entre 0.1 e 50.0)
        if (tarifa > 0.05 && tarifa < 100) {
          // Determinar se esta linha é Residencial ou Comercial:
          // Se FS for ~30% ou 0.3 -> residencial
          // Se FS for ~70% ou 0.7 -> comercial
          // Caso contrário, usa modoBlocoAtual ou tipoClienteForcado
          let tipo: TipoClienteProjecao = tipoClienteForcado || modoBlocoAtual || 'residencial'
          if (!tipoClienteForcado) {
            if (Math.abs(fs - 0.7) <= 0.05) {
              tipo = 'comercial'
            } else if (Math.abs(fs - 0.3) <= 0.05) {
              tipo = 'residencial'
            }
          }

          const item: ProjecaoTarifariaItemInput = {
            ano: anoNum,
            tipo_cliente: tipo,
            tarifa_kwh: Number(tarifa.toFixed(4)),
            fio_b_kwh: Number(fioB.toFixed(4)),
            fs: fs > 0 ? Number(fs.toFixed(2)) : tipo === 'residencial' ? 0.3 : 0.7,
            gd_eco_liquida: gdEco > 0 ? Number(gdEco.toFixed(4)) : 0,
            economia_acumulada: ecoAcum > 0 ? Number(ecoAcum.toFixed(2)) : undefined,
            gasto_acumulado: gastoAcum > 0 ? Number(gastoAcum.toFixed(2)) : undefined,
          }

          if (tipo === 'residencial') {
            // Evitar duplicata do mesmo ano no bloco
            if (!linhasResidencial.some((l) => l.ano === item.ano)) {
              linhasResidencial.push(item)
            }
          } else {
            if (!linhasComercial.some((l) => l.ano === item.ano)) {
              linhasComercial.push(item)
            }
          }
        }
      }
    }
  }

  // Ordenar por ano
  linhasResidencial.sort((a, b) => a.ano - b.ano)
  linhasComercial.sort((a, b) => a.ano - b.ano)

  const blocos: BlocoDetectado[] = []
  if (linhasResidencial.length > 0) {
    blocos.push({
      tipo: 'residencial',
      nome: 'Residencial (FS 30%)',
      linhas: linhasResidencial,
    })
  }
  if (linhasComercial.length > 0) {
    blocos.push({
      tipo: 'comercial',
      nome: 'Comercial (FS 70%)',
      linhas: linhasComercial,
    })
  }

  const totalLinhasValidas = linhasResidencial.length + linhasComercial.length

  if (totalLinhasValidas === 0) {
    return {
      sucesso: false,
      erro: 'Nenhuma linha tarifária válida foi encontrada na planilha. Verifique se o arquivo possui colunas "Ano", "Tarifa (R$/kWh)", "FioB (R$/kWh)", "FS" e "GD Eco Líquida (R$/kWh)".',
      blocos: [],
      totalLinhasValidas: 0,
    }
  }

  return {
    sucesso: true,
    blocos,
    totalLinhasValidas,
  }
}

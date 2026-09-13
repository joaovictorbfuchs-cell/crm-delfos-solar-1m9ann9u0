/**
 * Parser leve e robusto para planilhas Excel (.xlsx) e arquivos delimitados (.csv)
 * Sem dependências externas pesadas, usando a descompressão nativa DecompressionStream
 * do navegador para extrair as planilhas XML do .xlsx e strings compartilhadas.
 */

export interface ParsedTableData {
  headers: string[]
  rows: Record<string, string>[]
  rawMatrix: string[][]
}

/**
 * Converte File em ArrayBuffer
 */
function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Converte File em Texto com fallback de encoding (UTF-8 ou ISO-8859-1)
 */
async function readFileAsText(file: File): Promise<string> {
  const buffer = await readFileAsArrayBuffer(file)
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return decoder.decode(buffer)
  } catch {
    const latinDecoder = new TextDecoder('iso-8859-1')
    return latinDecoder.decode(buffer)
  }
}

/**
 * Extrai entradas de um arquivo ZIP (.xlsx) em memória
 */
async function extractZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const entries = new Map<string, Uint8Array>()
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  let offset = 0
  const length = bytes.length

  while (offset + 30 <= length) {
    const signature = view.getUint32(offset, true)
    if (signature !== 0x04034b50) break

    const compressionMethod = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraFieldLength = view.getUint16(offset + 28, true)

    const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength)
    const fileName = new TextDecoder().decode(fileNameBytes)

    const dataStart = offset + 30 + fileNameLength + extraFieldLength
    const compressedData = bytes.subarray(dataStart, dataStart + compressedSize)

    try {
      if (compressionMethod === 0) {
        entries.set(fileName, compressedData)
      } else if (compressionMethod === 8 && typeof DecompressionStream !== 'undefined') {
        const ds = new DecompressionStream('deflate-raw')
        const writer = ds.writable.getWriter()
        writer.write(compressedData as unknown as BufferSource)
        writer.close()
        const chunks: Uint8Array[] = []
        const reader = ds.readable.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) chunks.push(value)
        }
        const totalLen = chunks.reduce((acc, c) => acc + c.length, 0)
        const decompressed = new Uint8Array(totalLen)
        let cur = 0
        for (const c of chunks) {
          decompressed.set(c, cur)
          cur += c.length
        }
        entries.set(fileName, decompressed)
      }
    } catch (e) {
      console.warn(`Erro ao descompactar entrada XLSX ${fileName}:`, e)
    }

    offset = dataStart + compressedSize
  }

  return entries
}

/**
 * Converte referência de coluna (ex: "A", "Z", "AA", "AB") para índice baseado em 0
 */
function colRefToIndex(colRef: string): number {
  let index = 0
  const clean = colRef.toUpperCase().replace(/[^A-Z]/g, '')
  for (let i = 0; i < clean.length; i++) {
    index = index * 26 + (clean.charCodeAt(i) - 64)
  }
  return index - 1
}

/**
 * Lê arquivo XLSX nativamente e devolve matriz de strings
 */
export async function parseXlsxFile(file: File): Promise<ParsedTableData> {
  const buffer = await readFileAsArrayBuffer(file)
  const entries = await extractZipEntries(buffer)

  // 1. Carregar sharedStrings.xml
  const sharedStrings: string[] = []
  const sharedStringsBytes = entries.get('xl/sharedStrings.xml')
  if (sharedStringsBytes) {
    const sharedXml = new TextDecoder('utf-8').decode(sharedStringsBytes)
    const parser = new DOMParser()
    const doc = parser.parseFromString(sharedXml, 'application/xml')
    const siElements = Array.from(doc.getElementsByTagName('si'))
    for (const si of siElements) {
      const tNodes = si.getElementsByTagName('t')
      let text = ''
      for (let i = 0; i < tNodes.length; i++) {
        text += tNodes[i].textContent || ''
      }
      sharedStrings.push(text)
    }
  }

  // 2. Encontrar a primeira planilha em xl/worksheets/sheet1.xml ou similar
  let sheetBytes: Uint8Array | undefined = entries.get('xl/worksheets/sheet1.xml')
  if (!sheetBytes) {
    for (const [key, val] of entries.entries()) {
      if (key.startsWith('xl/worksheets/sheet') && key.endsWith('.xml')) {
        sheetBytes = val
        break
      }
    }
  }

  if (!sheetBytes) {
    throw new Error('Nenhuma planilha válida foi encontrada dentro do arquivo Excel (.xlsx).')
  }

  const sheetXml = new TextDecoder('utf-8').decode(sheetBytes)
  const parser = new DOMParser()
  const doc = parser.parseFromString(sheetXml, 'application/xml')
  const rowElements = Array.from(doc.getElementsByTagName('row'))

  const rawMatrix: string[][] = []

  for (const row of rowElements) {
    const cells = Array.from(row.getElementsByTagName('c'))
    const rowValues: string[] = []

    for (const cell of cells) {
      const rAttr = cell.getAttribute('r') || ''
      const colLetters = rAttr.replace(/[0-9]/g, '')
      const targetColIdx = colLetters ? colRefToIndex(colLetters) : rowValues.length

      const type = cell.getAttribute('t')
      const vElem = cell.getElementsByTagName('v')[0]
      let cellText = ''

      if (vElem) {
        const raw = vElem.textContent || ''
        if (type === 's') {
          const idx = parseInt(raw, 10)
          cellText = sharedStrings[idx] !== undefined ? sharedStrings[idx] : raw
        } else {
          cellText = raw
        }
      } else {
        const isElem = cell.getElementsByTagName('is')[0]
        if (isElem) {
          cellText = isElem.textContent || ''
        }
      }

      // Preencher eventuais colunas vazias intermediárias
      while (rowValues.length < targetColIdx) {
        rowValues.push('')
      }
      rowValues[targetColIdx] = cellText.trim()
    }

    if (rowValues.some((v) => v && v.trim() !== '')) {
      rawMatrix.push(rowValues)
    }
  }

  if (rawMatrix.length === 0) {
    throw new Error('A planilha está vazia ou sem linhas legíveis.')
  }

  // Identificar cabeçalho (primeira linha não vazia)
  const headers = rawMatrix[0].map((h, i) => (h && h.trim() ? h.trim() : `Coluna ${i + 1}`))
  const dataRows = rawMatrix.slice(1)

  const rows: Record<string, string>[] = dataRows.map((cols) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx].trim() : ''
    })
    return obj
  })

  return {
    headers,
    rows,
    rawMatrix,
  }
}

/**
 * Parser de CSV com suporte a delimitadores comuns (; , tabulação) e aspas
 */
export async function parseCsvFile(file: File): Promise<ParsedTableData> {
  const content = await readFileAsText(file)
  return parseCsvString(content)
}

export function parseCsvString(content: string): ParsedTableData {
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) {
    throw new Error('O arquivo de dados está vazio.')
  }

  // Detectar delimitador: ponto e vírgula, vírgula ou tab
  const firstLine = lines[0]
  const countSemicolon = (firstLine.match(/;/g) || []).length
  const countComma = (firstLine.match(/,/g) || []).length
  const countTab = (firstLine.match(/\t/g) || []).length

  let delimiter = ','
  if (countSemicolon > countComma && countSemicolon >= countTab) {
    delimiter = ';'
  } else if (countTab > countComma && countTab > countSemicolon) {
    delimiter = '\t'
  }

  const rawMatrix: string[][] = []

  for (const line of lines) {
    const row: string[] = []
    let inQuotes = false
    let currentCell = ''

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(currentCell.trim())
        currentCell = ''
      } else {
        currentCell += char
      }
    }
    row.push(currentCell.trim())

    if (row.some((val) => val.trim().length > 0)) {
      rawMatrix.push(row)
    }
  }

  if (rawMatrix.length === 0) {
    throw new Error('Nenhum dado encontrado no arquivo CSV.')
  }

  const headers = rawMatrix[0].map((h, i) => (h && h.trim() ? h.trim() : `Coluna ${i + 1}`))
  const dataRows = rawMatrix.slice(1)

  const rows: Record<string, string>[] = dataRows.map((cols) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      obj[h] = cols[idx] !== undefined ? cols[idx].trim() : ''
    })
    return obj
  })

  return {
    headers,
    rows,
    rawMatrix,
  }
}

/**
 * Lê qualquer arquivo (XLSX, XLS ou CSV/TXT) escolhendo a estratégia adequada
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedTableData> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (ext === 'xlsx') {
    try {
      return await parseXlsxFile(file)
    } catch (err) {
      console.warn('Falha no parser XLSX nativo, tentando fallback CSV:', err)
      return await parseCsvFile(file)
    }
  }
  // CSV, TXT ou fallback para planilhas exportadas como TSV/CSV
  return await parseCsvFile(file)
}

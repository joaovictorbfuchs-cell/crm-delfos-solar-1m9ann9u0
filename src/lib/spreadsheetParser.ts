/**
 * Parser leve e robusto para planilhas Excel (.xlsx, .xls) e arquivos delimitados (.csv, .txt)
 * Sem dependências externas pesadas, usando descompressão nativa DecompressionStream
 * do navegador com suporte completo a arquivos ZIP (leitura de Local File Headers e Central Directory),
 * resolução de sharedStrings, inline strings e detecção estrita de magic bytes.
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
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo selecionado.'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Converte File ou Uint8Array em Texto com fallback de encoding (UTF-8 ou ISO-8859-1)
 */
export async function readFileAsText(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  const buffer =
    fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await readFileAsArrayBuffer(fileOrBuffer)
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    return decoder.decode(buffer)
  } catch {
    const latinDecoder = new TextDecoder('iso-8859-1')
    return latinDecoder.decode(buffer)
  }
}

/**
 * Descomprime um chunk de dados DEFLATE bruto usando DecompressionStream nativo
 */
async function inflateRaw(compressedData: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Seu navegador não suporta descompressão nativa (DecompressionStream).')
  }

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
  const result = new Uint8Array(totalLen)
  let pos = 0
  for (const chunk of chunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  return result
}

interface ZipEntryMeta {
  fileName: string
  compressionMethod: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
  flags: number
}

/**
 * Localiza o End of Central Directory (EOCD) buscando de trás para frente a assinatura 0x06054b50
 */
function findEndOfCentralDirectory(bytes: Uint8Array, view: DataView): number {
  const maxSearch = Math.min(bytes.length, 65535 + 22)
  const start = bytes.length - 22

  for (let i = start; i >= bytes.length - maxSearch; i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      return i
    }
  }
  return -1
}

/**
 * Extrai entradas de um arquivo ZIP (.xlsx) em memória com suporte a Central Directory e Local Headers
 */
async function extractZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const entries = new Map<string, Uint8Array>()
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const length = bytes.length

  // Estratégia 1: Ler via Central Directory (muito mais robusto para Excel / LibreOffice / Google Sheets)
  const eocdOffset = findEndOfCentralDirectory(bytes, view)
  if (eocdOffset !== -1) {
    try {
      const cdCount = view.getUint16(eocdOffset + 10, true)
      const cdOffset = view.getUint32(eocdOffset + 16, true)

      let cdCur = cdOffset
      const cdEntries: ZipEntryMeta[] = []

      for (let i = 0; i < cdCount && cdCur + 46 <= eocdOffset; i++) {
        const sig = view.getUint32(cdCur, true)
        if (sig !== 0x02014b50) break

        const flags = view.getUint16(cdCur + 8, true)
        const compressionMethod = view.getUint16(cdCur + 10, true)
        const compressedSize = view.getUint32(cdCur + 20, true)
        const uncompressedSize = view.getUint32(cdCur + 24, true)
        const fileNameLen = view.getUint16(cdCur + 28, true)
        const extraLen = view.getUint16(cdCur + 30, true)
        const commentLen = view.getUint16(cdCur + 32, true)
        const localHeaderOffset = view.getUint32(cdCur + 42, true)

        const fnBytes = bytes.subarray(cdCur + 46, cdCur + 46 + fileNameLen)
        const fileName = new TextDecoder('utf-8').decode(fnBytes)

        cdEntries.push({
          fileName,
          compressionMethod,
          compressedSize,
          uncompressedSize,
          localHeaderOffset,
          flags,
        })

        cdCur += 46 + fileNameLen + extraLen + commentLen
      }

      // Agora descompactar cada entrada a partir de seu localHeaderOffset
      for (const item of cdEntries) {
        if (item.localHeaderOffset + 30 > length) continue
        const localSig = view.getUint32(item.localHeaderOffset, true)
        if (localSig !== 0x04034b50) continue

        const localFnLen = view.getUint16(item.localHeaderOffset + 26, true)
        const localExtraLen = view.getUint16(item.localHeaderOffset + 28, true)
        const dataStart = item.localHeaderOffset + 30 + localFnLen + localExtraLen

        const dataBytes = bytes.subarray(dataStart, dataStart + item.compressedSize)

        if (item.compressionMethod === 0) {
          entries.set(item.fileName, dataBytes)
        } else if (item.compressionMethod === 8) {
          try {
            const decomp = await inflateRaw(dataBytes)
            entries.set(item.fileName, decomp)
          } catch (e) {
            console.warn(`Falha ao descompactar entrada ${item.fileName}:`, e)
          }
        }
      }

      if (entries.size > 0) {
        return entries
      }
    } catch (e) {
      console.warn(
        'Falha na leitura pelo Central Directory do ZIP, tentando fallback local headers:',
        e,
      )
    }
  }

  // Estratégia 2: Varredura sequencial dos Local File Headers (0x04034b50)
  let offset = 0
  while (offset + 30 <= length) {
    const signature = view.getUint32(offset, true)
    if (signature !== 0x04034b50) {
      // Buscar próximo cabeçalho 0x04034b50 se estiver desalinhado
      let foundNext = -1
      for (let j = offset + 1; j + 30 <= length; j++) {
        if (
          bytes[j] === 0x50 &&
          bytes[j + 1] === 0x4b &&
          bytes[j + 2] === 0x03 &&
          bytes[j + 3] === 0x04
        ) {
          foundNext = j
          break
        }
      }
      if (foundNext === -1) break
      offset = foundNext
      continue
    }

    const compressionMethod = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraFieldLength = view.getUint16(offset + 28, true)

    const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength)
    const fileName = new TextDecoder('utf-8').decode(fileNameBytes)

    const dataStart = offset + 30 + fileNameLength + extraFieldLength
    if (compressedSize > 0 && dataStart + compressedSize <= length) {
      const compressedData = bytes.subarray(dataStart, dataStart + compressedSize)

      try {
        if (compressionMethod === 0) {
          entries.set(fileName, compressedData)
        } else if (compressionMethod === 8) {
          const decompressed = await inflateRaw(compressedData)
          entries.set(fileName, decompressed)
        }
      } catch (e) {
        console.warn(`Erro ao descompactar entrada XLSX ${fileName}:`, e)
      }
      offset = dataStart + compressedSize
    } else {
      offset = dataStart
    }
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
 * Checa se o buffer começa com a assinatura ZIP PK\x03\x04
 */
export function isZipBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false
  const bytes = new Uint8Array(buffer)
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
}

/**
 * Lê arquivo XLSX nativamente e devolve matriz de strings
 */
export async function parseXlsxFile(fileOrBuffer: File | ArrayBuffer): Promise<ParsedTableData> {
  const buffer =
    fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await readFileAsArrayBuffer(fileOrBuffer)

  if (!isZipBuffer(buffer)) {
    throw new Error(
      'O arquivo selecionado não é uma planilha Excel (.xlsx) válida (assinatura ZIP não encontrada). Verifique o formato do arquivo.',
    )
  }

  const entries = await extractZipEntries(buffer)

  // 1. Carregar sharedStrings.xml se existir
  const sharedStrings: string[] = []
  let sharedStringsBytes = entries.get('xl/sharedStrings.xml')
  if (!sharedStringsBytes) {
    for (const [key, val] of entries.entries()) {
      if (key.toLowerCase().endsWith('sharedstrings.xml')) {
        sharedStringsBytes = val
        break
      }
    }
  }

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

  // 2. Encontrar a primeira planilha em xl/worksheets/sheet1.xml ou qualquer sheet válida
  let sheetBytes: Uint8Array | undefined = entries.get('xl/worksheets/sheet1.xml')
  if (!sheetBytes) {
    for (const [key, val] of entries.entries()) {
      const lower = key.toLowerCase()
      if (lower.includes('worksheets/sheet') && lower.endsWith('.xml')) {
        sheetBytes = val
        break
      }
    }
  }

  if (!sheetBytes) {
    throw new Error(
      'Não foi possível encontrar as planilhas de dados dentro deste arquivo Excel (.xlsx). O arquivo pode estar protegido por senha ou corrompido.',
    )
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
        } else if (type === 'b') {
          cellText = raw === '1' ? 'SIM' : 'NÃO'
        } else {
          cellText = raw
        }
      } else {
        const isElem = cell.getElementsByTagName('is')[0]
        if (isElem) {
          const tElem = isElem.getElementsByTagName('t')[0]
          cellText = (tElem ? tElem.textContent : isElem.textContent) || ''
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
  // Se o conteúdo começar com magic bytes de ZIP "PK\x03\x04" ou tiver caracteres nulos binários, recusar!
  if (content.startsWith('PK\x03\x04') || content.includes('\u0000') || content.startsWith('PK')) {
    throw new Error(
      'Não foi possível ler este arquivo Excel como texto simples. O arquivo é um binário compactado (.xlsx).',
    )
  }

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
 * Lê qualquer arquivo (XLSX, XLS ou CSV/TXT) escolhendo a estratégia adequada.
 * Garante que arquivos com extensão .xlsx/.xls OU magic bytes PK\x03\x04 SEMPRE passem pelo
 * parser real de planilhas e NUNCA caiam no caminho de texto/CSV se falharem.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedTableData> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const buffer = await readFileAsArrayBuffer(file)
  const isZip = isZipBuffer(buffer)

  // Se tem extensão .xlsx ou .xls, OU possui magic bytes de ZIP (PK\x03\x04)
  if (ext === 'xlsx' || ext === 'xls' || isZip) {
    try {
      return await parseXlsxFile(buffer)
    } catch (err: any) {
      console.error('Falha no parser XLSX nativo:', err)
      // NUNCA fazer fallback para parseCsvFile se for um arquivo binário ZIP/XLSX!
      throw new Error(
        err?.message ||
          'Não foi possível ler este arquivo Excel. Verifique se o arquivo está corrompido ou protegido por senha.',
      )
    }
  }

  // Apenas arquivos .csv, .txt ou outros sem magic bytes binários vão para o parser CSV
  return parseCsvString(await readFileAsText(buffer))
}

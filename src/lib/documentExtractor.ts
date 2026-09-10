/**
 * Extração de conteúdo de documentos no frontend (PDF, DOCX, XLSX, CSV, Imagens)
 * Converte arquivos para texto ou dados tabulares adequados para envio ao agente nativo Skip Cloud.
 */

export interface DocumentContentResult {
  fileName: string
  fileSize: number
  fileType: string
  textContent?: string
  imageBase64?: string
  mimeType: string
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
 * Converte File em Base64 (sem o prefixo data:...;base64,)
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const commaIndex = result.indexOf(',')
      if (commaIndex !== -1) {
        resolve(result.substring(commaIndex + 1))
      } else {
        resolve(result)
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Extrai texto de arquivos .csv ou .txt
 */
export async function extractTextFromCsvOrTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file, 'UTF-8')
  })
}

/**
 * Descompactador leve baseado na API nativa do navegador (DecompressionStream)
 * para extrair arquivos XML de dentro de contêineres ZIP (.docx e .xlsx)
 * sem precisar de pacotes externos pesados.
 */
async function extractZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const entries = new Map<string, Uint8Array>()
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  let offset = 0
  const length = bytes.length

  // Iterar pelas assinaturas de cabeçalho de arquivo local do ZIP (0x04034b50)
  while (offset + 30 <= length) {
    const signature = view.getUint32(offset, true)
    if (signature !== 0x04034b50) {
      break
    }

    const compressionMethod = view.getUint16(offset + 8, true)
    const compressedSize = view.getUint32(offset + 18, true)
    const uncompressedSize = view.getUint32(offset + 22, true)
    const fileNameLength = view.getUint16(offset + 26, true)
    const extraFieldLength = view.getUint16(offset + 28, true)

    const fileNameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLength)
    const fileName = new TextDecoder().decode(fileNameBytes)

    const dataStart = offset + 30 + fileNameLength + extraFieldLength
    const compressedData = bytes.subarray(dataStart, dataStart + compressedSize)

    try {
      if (compressionMethod === 0) {
        // Sem compressão
        entries.set(fileName, compressedData)
      } else if (compressionMethod === 8) {
        // DEFLATE (usar DecompressionStream do browser)
        if (typeof DecompressionStream !== 'undefined') {
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
          const totalLength = chunks.reduce((acc, c) => acc + c.length, 0)
          const decompressed = new Uint8Array(totalLength)
          let currentPos = 0
          for (const c of chunks) {
            decompressed.set(c, currentPos)
            currentPos += c.length
          }
          entries.set(fileName, decompressed)
        }
      }
    } catch (e) {
      console.warn(`Não foi possível descompactar entrada ZIP ${fileName}:`, e)
    }

    offset = dataStart + compressedSize
  }

  return entries
}

/**
 * Extrai texto legível de um documento Word (.docx)
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const buffer = await readFileAsArrayBuffer(file)
    const entries = await extractZipEntries(buffer)
    const documentXmlBytes = entries.get('word/document.xml')
    if (!documentXmlBytes) {
      // Fallback: extrair strings de texto do buffer bruto
      return extractStringsFromBinary(buffer)
    }

    const xmlText = new TextDecoder('utf-8').decode(documentXmlBytes)
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'application/xml')

    // Coletar parágrafos e células de tabela
    const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p'))
    const lines: string[] = []

    for (const p of paragraphs) {
      const textNodes = p.getElementsByTagName('w:t')
      let pText = ''
      for (let i = 0; i < textNodes.length; i++) {
        pText += textNodes[i].textContent || ''
      }
      if (pText.trim()) {
        lines.push(pText.trim())
      }
    }

    if (lines.length > 0) {
      return lines.join('\n')
    }

    // Se a extração por parágrafo não achar nada, limpar todas as tags XML
    return xmlText
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } catch (err) {
    console.warn('Erro ao processar DOCX nativamente:', err)
    const buffer = await readFileAsArrayBuffer(file)
    return extractStringsFromBinary(buffer)
  }
}

/**
 * Extrai texto e dados tabulares de uma planilha Excel (.xlsx)
 */
export async function extractTextFromXlsx(file: File): Promise<string> {
  try {
    const buffer = await readFileAsArrayBuffer(file)
    const entries = await extractZipEntries(buffer)

    // 1. Obter sharedStrings.xml (strings compartilhadas)
    const sharedStrings: string[] = []
    const sharedStringsBytes = entries.get('xl/sharedStrings.xml')
    if (sharedStringsBytes) {
      const sharedXml = new TextDecoder('utf-8').decode(sharedStringsBytes)
      const parser = new DOMParser()
      const doc = parser.parseFromString(sharedXml, 'application/xml')
      const siElements = Array.from(doc.getElementsByTagName('si'))
      for (const si of siElements) {
        const tNodes = si.getElementsByTagName('t')
        let val = ''
        for (let i = 0; i < tNodes.length; i++) {
          val += tNodes[i].textContent || ''
        }
        sharedStrings.push(val)
      }
    }

    // 2. Coletar dados da sheet1 (ou sheets)
    const sheetLines: string[] = []
    for (const [name, bytes] of entries.entries()) {
      if (name.startsWith('xl/worksheets/sheet') && name.endsWith('.xml')) {
        const sheetXml = new TextDecoder('utf-8').decode(bytes)
        const parser = new DOMParser()
        const doc = parser.parseFromString(sheetXml, 'application/xml')
        const rows = Array.from(doc.getElementsByTagName('row'))

        for (const row of rows) {
          const cells = Array.from(row.getElementsByTagName('c'))
          const cellValues: string[] = []

          for (const cell of cells) {
            const type = cell.getAttribute('t')
            const vElem = cell.getElementsByTagName('v')[0]
            if (vElem) {
              const rawVal = vElem.textContent || ''
              if (type === 's') {
                const idx = parseInt(rawVal, 10)
                cellValues.push(sharedStrings[idx] || rawVal)
              } else {
                cellValues.push(rawVal)
              }
            } else {
              const inlineStr = cell.getElementsByTagName('is')[0]
              if (inlineStr) {
                cellValues.push(inlineStr.textContent || '')
              }
            }
          }

          if (cellValues.length > 0 && cellValues.some((v) => v.trim())) {
            sheetLines.push(cellValues.join('\t'))
          }
        }
      }
    }

    if (sheetLines.length > 0) {
      return sheetLines.join('\n')
    }

    return extractStringsFromBinary(buffer)
  } catch (err) {
    console.warn('Erro ao processar XLSX nativamente:', err)
    const buffer = await readFileAsArrayBuffer(file)
    return extractStringsFromBinary(buffer)
  }
}

/**
 * Extrai texto de PDF via parser de streams e texto do formato PDF
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const buffer = await readFileAsArrayBuffer(file)
    const textDecoder = new TextDecoder('latin1')
    const rawPdf = textDecoder.decode(buffer)

    const textPieces: string[] = []

    // 1. Procurar blocos BT ... ET no PDF
    const textBlockRegex = /BT[\s\S]*?ET/g
    let match: RegExpExecArray | null

    while ((match = textBlockRegex.exec(rawPdf)) !== null) {
      const block = match[0]
      // Procurar literais de texto (string)
      const tjRegex = /\(([^)]*)\)\s*T[jd]/g
      let tjMatch: RegExpExecArray | null
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        const decoded = tjMatch[1].replace(/\\([0-9]{3})/g, (_, oct) =>
          String.fromCharCode(parseInt(oct, 8)),
        )
        if (decoded.trim()) {
          textPieces.push(decoded)
        }
      }

      // Procurar arrays TJ [(...)...]
      const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g
      let tjArrMatch: RegExpExecArray | null
      while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
        const arrContent = tjArrMatch[1]
        const innerStrRegex = /\(([^)]*)\)/g
        let innerMatch: RegExpExecArray | null
        let word = ''
        while ((innerMatch = innerStrRegex.exec(arrContent)) !== null) {
          word += innerMatch[1]
        }
        if (word.trim()) {
          textPieces.push(word)
        }
      }
    }

    if (textPieces.length > 15) {
      return textPieces.join(' ')
    }

    // 2. Se a extração de blocos BT/ET resultou em pouco texto (por exemplo, PDF com encoding diferente),
    // procurar por strings legíveis de 3+ caracteres dentro do PDF
    const fallbackText = extractStringsFromBinary(buffer)
    return fallbackText
  } catch (err) {
    console.warn('Erro ao extrair texto do PDF:', err)
    const buffer = await readFileAsArrayBuffer(file)
    return extractStringsFromBinary(buffer)
  }
}

/**
 * Extrai sequências de caracteres imprimíveis de um ArrayBuffer
 */
function extractStringsFromBinary(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const strings: string[] = []
  let current: number[] = []

  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]
    // Caracteres imprimíveis ASCII e acentuações UTF-8 básicas
    if ((b >= 32 && b <= 126) || b >= 160) {
      current.push(b)
    } else {
      if (current.length >= 4) {
        try {
          const str = new TextDecoder('utf-8').decode(new Uint8Array(current))
          if (/[a-zA-Z0-9]/.test(str)) {
            strings.push(str.trim())
          }
        } catch {
          /* intentionally ignored */
        }
      }
      current = []
    }
  }

  if (current.length >= 4) {
    try {
      const str = new TextDecoder('utf-8').decode(new Uint8Array(current))
      strings.push(str.trim())
    } catch {
      /* intentionally ignored */
    }
  }

  // Filtrar fragmentos muito curtos ou com palavras-chave de PDF
  const filtered = strings
    .filter(
      (s) =>
        s.length >= 3 &&
        !s.startsWith('/Filter') &&
        !s.startsWith('/Length') &&
        !s.startsWith('obj') &&
        !s.startsWith('endobj'),
    )
    .slice(0, 1500)

  return filtered.join(' ')
}

/**
 * Função principal que processa qualquer arquivo aceito e prepara o payload
 * para envio ao agente nativo Skip Cloud.
 */
export async function prepareDocumentForExtraction(file: File): Promise<DocumentContentResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const mime = file.type || ''

  // Imagens (JPG, PNG, WEBP)
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'bmp'].includes(ext)) {
    const base64 = await readFileAsBase64(file)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'image',
      imageBase64: base64,
      mimeType: mime || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    }
  }

  // Planilhas CSV ou texto puro
  if (ext === 'csv' || ext === 'txt' || mime === 'text/csv' || mime === 'text/plain') {
    const text = await extractTextFromCsvOrTxt(file)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'csv',
      textContent: text,
      mimeType: mime || (ext === 'csv' ? 'text/csv' : 'text/plain'),
    }
  }

  // Documentos Word (.docx)
  if (
    ext === 'docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const text = await extractTextFromDocx(file)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'docx',
      textContent: text,
      mimeType: mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
  }

  // Planilhas Excel (.xlsx)
  if (
    ext === 'xlsx' ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const text = await extractTextFromXlsx(file)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'xlsx',
      textContent: text,
      mimeType: mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  }

  // Documentos PDF (.pdf)
  if (ext === 'pdf' || mime === 'application/pdf') {
    const text = await extractTextFromPdf(file)
    // Se o PDF tiver texto extraído, enviar o texto
    if (text && text.trim().length > 30) {
      return {
        fileName: file.name,
        fileSize: file.size,
        fileType: 'pdf',
        textContent: text,
        mimeType: 'application/pdf',
      }
    }
    // Caso contrário (ex: PDF digitalizado/escaneado em imagem), enviar como base64
    const base64 = await readFileAsBase64(file)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'pdf_image',
      imageBase64: base64,
      textContent: text,
      mimeType: 'application/pdf',
    }
  }

  // Fallback genérico: tentar ler como texto
  try {
    const text = await extractTextFromCsvOrTxt(file)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'text',
      textContent: text,
      mimeType: mime || 'text/plain',
    }
  } catch (_) {
    const base64 = await readFileAsBase64(file)
    return {
      fileName: file.name,
      fileSize: file.size,
      fileType: 'binary',
      imageBase64: base64,
      mimeType: mime || 'application/octet-stream',
    }
  }
}

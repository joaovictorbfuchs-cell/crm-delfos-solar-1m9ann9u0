// Client-side pure TypeScript OpenXML (.xlsx) builder
// Generates standard OpenXML (.xlsx) file as a valid PKZIP ArrayBuffer/Blob in browser & Node.js

export interface XlsxSheet {
  name: string
  rows: (string | number | boolean | null | undefined)[][]
  colWidths?: number[]
}

// CRC32 table
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  data: Uint8Array
}

interface FileRecord {
  nameBytes: Uint8Array
  fileCrc: number
  size: number
  offset: number
  dosTime: number
  dosDate: number
}

function stringToUtf8ByteArray(str: string): Uint8Array {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(str)
  }
  // Fallback
  const utf8: number[] = []
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i)
    if (charcode < 0x80) utf8.push(charcode)
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f))
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f))
    } else {
      // surrogate pair
      i++
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff))
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f),
      )
    }
  }
  return new Uint8Array(utf8)
}

function createZipBuffer(files: ZipEntry[]): Uint8Array {
  const fileRecords: FileRecord[] = []
  const localChunks: Uint8Array[] = []
  let offset = 0

  // DOS date/time: 2026-03-30 12:00:00
  const dosTime = 0x6000
  const dosDate = 0x5c7e

  for (const f of files) {
    const dataBytes = f.data
    const nameBytes = stringToUtf8ByteArray(f.name)
    const fileCrc = crc32(dataBytes)
    const size = dataBytes.length

    const header = new Uint8Array(30)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x04034b50, true) // Local header signature
    view.setUint16(4, 20, true) // Version 2.0
    view.setUint16(6, 0, true) // Flags
    view.setUint16(8, 0, true) // Compression: 0 (STORE)
    view.setUint16(10, dosTime, true)
    view.setUint16(12, dosDate, true)
    view.setUint32(14, fileCrc, true)
    view.setUint32(18, size, true) // Compressed
    view.setUint32(22, size, true) // Uncompressed
    view.setUint16(26, nameBytes.length, true)
    view.setUint16(28, 0, true) // Extra field length

    fileRecords.push({
      nameBytes,
      fileCrc,
      size,
      offset,
      dosTime,
      dosDate,
    })

    localChunks.push(header, nameBytes, dataBytes)
    offset += header.length + nameBytes.length + dataBytes.length
  }

  // Central Directory
  const cdOffset = offset
  const cdChunks: Uint8Array[] = []
  let cdSize = 0

  for (const r of fileRecords) {
    const cdHeader = new Uint8Array(46)
    const view = new DataView(cdHeader.buffer)
    view.setUint32(0, 0x02014b50, true) // Central directory header
    view.setUint16(4, 20, true) // Made by
    view.setUint16(6, 20, true) // Needed
    view.setUint16(8, 0, true) // Bit flag
    view.setUint16(10, 0, true) // Method 0
    view.setUint16(12, r.dosTime, true)
    view.setUint16(14, r.dosDate, true)
    view.setUint32(16, r.fileCrc, true)
    view.setUint32(20, r.size, true)
    view.setUint32(24, r.size, true)
    view.setUint16(28, r.nameBytes.length, true)
    view.setUint16(30, 0, true) // Extra
    view.setUint16(32, 0, true) // Comment
    view.setUint16(34, 0, true) // Disk start
    view.setUint16(36, 0, true) // Int attrs
    view.setUint32(38, 0, true) // Ext attrs
    view.setUint32(42, r.offset, true) // Relative offset

    cdChunks.push(cdHeader, r.nameBytes)
    cdSize += cdHeader.length + r.nameBytes.length
  }

  // End of Central Directory (EOCD)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(4, 0, true)
  eocdView.setUint16(6, 0, true)
  eocdView.setUint16(8, fileRecords.length, true)
  eocdView.setUint16(10, fileRecords.length, true)
  eocdView.setUint32(12, cdSize, true)
  eocdView.setUint32(16, cdOffset, true)
  eocdView.setUint16(20, 0, true)

  const allChunks = [...localChunks, ...cdChunks, eocd]
  const totalLength = allChunks.reduce((acc, c) => acc + c.length, 0)
  const result = new Uint8Array(totalLength)
  let pos = 0
  for (const chunk of allChunks) {
    result.set(chunk, pos)
    pos += chunk.length
  }
  return result
}

function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colName(index: number): string {
  let name = ''
  let num = index
  while (num >= 0) {
    name = String.fromCharCode((num % 26) + 65) + name
    num = Math.floor(num / 26) - 1
  }
  return name
}

function generateSheetXml(
  rows: (string | number | boolean | null | undefined)[][],
  colWidths: number[] = [],
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  xml += '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'

  if (colWidths.length > 0) {
    xml += '  <cols>\n'
    colWidths.forEach((w, i) => {
      xml += `    <col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>\n`
    })
    xml += '  </cols>\n'
  }

  xml += '  <sheetData>\n'

  rows.forEach((row, rIdx) => {
    const rowNum = rIdx + 1
    const isHeader = rIdx === 0
    xml += `    <row r="${rowNum}">\n`

    row.forEach((cellVal, cIdx) => {
      const cellRef = `${colName(cIdx)}${rowNum}`
      const styleId = isHeader ? 1 : 2

      if (cellVal === null || cellVal === undefined || cellVal === '') {
        xml += `      <c r="${cellRef}" s="${styleId}"/>\n`
      } else if (typeof cellVal === 'number') {
        xml += `      <c r="${cellRef}" s="${styleId}"><v>${cellVal}</v></c>\n`
      } else if (typeof cellVal === 'boolean') {
        xml += `      <c r="${cellRef}" t="b" s="${styleId}"><v>${cellVal ? 1 : 0}</v></c>\n`
      } else {
        xml += `      <c r="${cellRef}" t="inlineStr" s="${styleId}"><is><t xml:space="preserve">${escapeXml(cellVal)}</t></is></c>\n`
      }
    })

    xml += '    </row>\n'
  })

  xml += '  </sheetData>\n'
  xml += '</worksheet>'
  return xml
}

function generateWorkbookXml(sheetNames: string[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  xml +=
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n'
  xml += '  <sheets>\n'
  sheetNames.forEach((name, i) => {
    xml += `    <sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>\n`
  })
  xml += '  </sheets>\n'
  xml += '</workbook>'
  return xml
}

function generateWorkbookRelsXml(sheetNames: string[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  xml += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
  sheetNames.forEach((_, i) => {
    xml += `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>\n`
  })
  xml += `  <Relationship Id="rId${sheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n`
  xml += '</Relationships>'
  return xml
}

function generateStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font>
      <sz val="10"/>
      <name val="Calibri"/>
      <color rgb="FF1F2937"/>
    </font>
    <font>
      <b/>
      <sz val="11"/>
      <name val="Calibri"/>
      <color rgb="FFFFFFFF"/>
    </font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill>
      <patternFill patternType="solid">
        <fgColor rgb="FF166534"/>
      </patternFill>
    </fill>
  </fills>
  <borders count="2">
    <border>
      <left/><right/><top/><bottom/><diagonal/>
    </border>
    <border>
      <left style="thin"><color rgb="FFE5E7EB"/></left>
      <right style="thin"><color rgb="FFE5E7EB"/></right>
      <top style="thin"><color rgb="FFE5E7EB"/></top>
      <bottom style="thin"><color rgb="FFE5E7EB"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="3">
    <!-- 0: Default -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <!-- 1: Header (Bold, white on emerald green, thin border) -->
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <!-- 2: Body cell with subtle border -->
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">
      <alignment vertical="center"/>
    </xf>
  </cellXfs>
</styleSheet>`
}

function generateContentTypesXml(sheetCount: number): string {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  xml += '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
  xml +=
    '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
  xml += '  <Default Extension="xml" ContentType="application/xml"/>\n'
  xml +=
    '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n'
  xml +=
    '  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>\n'
  for (let i = 1; i <= sheetCount; i++) {
    xml += `  <Override PartName="/xl/worksheets/sheet${i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n`
  }
  xml += '</Types>'
  return xml
}

function generateRootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
}

/**
 * Constrói o buffer de arquivo .xlsx binário a partir de uma lista de abas (sheets).
 * Totalmente compatível com navegadores e ambientes JS/TS sem node buffer.
 */
export function buildXlsxBuffer(sheets: XlsxSheet[]): Uint8Array {
  const sheetNames = sheets.map((s) => s.name)
  const files: ZipEntry[] = [
    {
      name: '[Content_Types].xml',
      data: stringToUtf8ByteArray(generateContentTypesXml(sheets.length)),
    },
    {
      name: '_rels/.rels',
      data: stringToUtf8ByteArray(generateRootRelsXml()),
    },
    {
      name: 'xl/workbook.xml',
      data: stringToUtf8ByteArray(generateWorkbookXml(sheetNames)),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: stringToUtf8ByteArray(generateWorkbookRelsXml(sheetNames)),
    },
    {
      name: 'xl/styles.xml',
      data: stringToUtf8ByteArray(generateStylesXml()),
    },
  ]

  sheets.forEach((sheet, idx) => {
    files.push({
      name: `xl/worksheets/sheet${idx + 1}.xml`,
      data: stringToUtf8ByteArray(generateSheetXml(sheet.rows, sheet.colWidths)),
    })
  })

  return createZipBuffer(files)
}

/**
 * Dispara o download de um buffer como arquivo no navegador
 */
export function downloadFileInBrowser(
  buffer: Uint8Array,
  filename: string,
  mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
): void {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer
  const blob = new Blob([arrayBuffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

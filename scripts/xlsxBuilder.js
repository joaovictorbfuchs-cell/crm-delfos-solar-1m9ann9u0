import fs from 'fs'
import path from 'path'

// Pure JS Minimal XLSX builder
// Generates standard OpenXML (.xlsx) file as a valid PKZIP buffer

// CRC32 table
const CRC_TABLE = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  }
  CRC_TABLE[i] = c >>> 0
}

function crc32(buf) {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Build ZIP archive with STORE (uncompressed, compression method 0)
// Microsoft Excel, LibreOffice, Google Sheets fully support STORE in .xlsx
function createZip(files) {
  const fileRecords = []
  let offset = 0

  // 1. Local headers & data
  const localChunks = []
  for (const f of files) {
    const dataBuf = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, 'utf8')
    const nameBuf = Buffer.from(f.name, 'utf8')
    const fileCrc = crc32(dataBuf)
    const size = dataBuf.length

    // DOS date/time: 2026-03-30 12:00:00
    // Time: (12 << 11) | (0 << 5) | (0 >> 1) = 0x6000
    // Date: ((2026 - 1980) << 9) | (3 << 5) | 30 = (46 << 9) | (3 << 5) | 30 = 0x5C7E
    const dosTime = 0x6000
    const dosDate = 0x5c7e

    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0) // Local file header signature
    header.writeUInt16LE(20, 4) // Version needed (2.0)
    header.writeUInt16LE(0, 6) // General purpose bit flag
    header.writeUInt16LE(0, 8) // Compression method: 0 (STORE)
    header.writeUInt16LE(dosTime, 10) // Last mod time
    header.writeUInt16LE(dosDate, 12) // Last mod date
    header.writeUInt32LE(fileCrc, 14) // CRC-32
    header.writeUInt32LE(size, 18) // Compressed size
    header.writeUInt32LE(size, 22) // Uncompressed size
    header.writeUInt16LE(nameBuf.length, 26) // File name length
    header.writeUInt16LE(0, 28) // Extra field length

    fileRecords.push({
      nameBuf,
      fileCrc,
      size,
      offset,
      dosTime,
      dosDate,
    })

    localChunks.push(header, nameBuf, dataBuf)
    offset += header.length + nameBuf.length + dataBuf.length
  }

  // 2. Central Directory
  const cdOffset = offset
  const cdChunks = []
  let cdSize = 0

  for (const r of fileRecords) {
    const cdHeader = Buffer.alloc(46)
    cdHeader.writeUInt32LE(0x02014b50, 0) // Central directory header signature
    cdHeader.writeUInt16LE(20, 4) // Version made by
    cdHeader.writeUInt16LE(20, 6) // Version needed
    cdHeader.writeUInt16LE(0, 8) // Bit flag
    cdHeader.writeUInt16LE(0, 10) // Compression method (0)
    cdHeader.writeUInt16LE(r.dosTime, 12) // Last mod time
    cdHeader.writeUInt16LE(r.dosDate, 14) // Last mod date
    cdHeader.writeUInt32LE(r.fileCrc, 16) // CRC-32
    cdHeader.writeUInt32LE(r.size, 20) // Compressed size
    cdHeader.writeUInt32LE(r.size, 24) // Uncompressed size
    cdHeader.writeUInt16LE(r.nameBuf.length, 28) // Name length
    cdHeader.writeUInt16LE(0, 30) // Extra field length
    cdHeader.writeUInt16LE(0, 32) // Comment length
    cdHeader.writeUInt16LE(0, 34) // Disk start
    cdHeader.writeUInt16LE(0, 36) // Internal file attributes
    cdHeader.writeUInt32LE(0, 38) // External file attributes
    cdHeader.writeUInt32LE(r.offset, 42) // Relative offset of local header

    cdChunks.push(cdHeader, r.nameBuf)
    cdSize += cdHeader.length + r.nameBuf.length
  }

  // 3. End of Central Directory (EOCD)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0) // EOCD signature
  eocd.writeUInt16LE(0, 4) // Disk number
  eocd.writeUInt16LE(0, 6) // Disk with CD
  eocd.writeUInt16LE(fileRecords.length, 8) // Num entries on disk
  eocd.writeUInt16LE(fileRecords.length, 10) // Num entries total
  eocd.writeUInt32LE(cdSize, 12) // Size of CD
  eocd.writeUInt32LE(cdOffset, 16) // Offset of CD
  eocd.writeUInt16LE(0, 20) // Comment length

  return Buffer.concat([...localChunks, ...cdChunks, eocd])
}

function escapeXml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function colName(index) {
  let name = ''
  let num = index
  while (num >= 0) {
    name = String.fromCharCode((num % 26) + 65) + name
    num = Math.floor(num / 26) - 1
  }
  return name
}

// Generates Sheet XML
// rows: array of array of cell values
function generateSheetXml(rows, colWidths = []) {
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

// Generate Workbook XML
function generateWorkbookXml(sheetNames) {
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

function generateWorkbookRelsXml(sheetNames) {
  let xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
  xml += '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
  sheetNames.forEach((_, i) => {
    xml += `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>\n`
  })
  xml += `  <Relationship Id="rId${sheetNames.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>\n`
  xml += '</Relationships>'
  return xml
}

function generateStylesXml() {
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

function generateContentTypesXml(sheetCount) {
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

function generateRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
}

export function buildXlsx(sheets) {
  // sheets = [{ name: 'Aba', rows: [...], colWidths: [...] }]
  const sheetNames = sheets.map((s) => s.name)
  const files = [
    { name: '[Content_Types].xml', data: generateContentTypesXml(sheets.length) },
    { name: '_rels/.rels', data: generateRootRelsXml() },
    { name: 'xl/workbook.xml', data: generateWorkbookXml(sheetNames) },
    { name: 'xl/_rels/workbook.xml.rels', data: generateWorkbookRelsXml(sheetNames) },
    { name: 'xl/styles.xml', data: generateStylesXml() },
  ]

  sheets.forEach((sheet, idx) => {
    files.push({
      name: `xl/worksheets/sheet${idx + 1}.xml`,
      data: generateSheetXml(sheet.rows, sheet.colWidths),
    })
  })

  return createZip(files)
}

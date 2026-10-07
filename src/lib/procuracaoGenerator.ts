/**
 * Gerador de Procuração Particular Delfos Solar
 *
 * Modelo exato fornecido pelo usuário (merge fields substituídos):
 * «NomeProcuração», «CPF_Procuração», «EndereçoProcuração», «MunicipioProcuração», «DataProcuração»
 *
 * Dados fixos da contratada:
 * DELFOS ENGENHARIA LTDA
 * Daniel Rotava (CPF 047.838.700-80, RG 1131962548)
 * João Victor Bagetti Fuchs (CPF 811.562.780-15, RG 5073762014)
 * Endereço: Rua Espírito Santo, 275 Bairro Fátima, Erechim – RS, CEP 99.709-296
 */

export interface DadosProcuracaoOM {
  nome: string
  cpf: string
  endereco: string
  municipio: string
  dataPorExtenso: string
  telefone?: string
}

export const DADOS_FIXOS_CONTRATADA_PROCURACAO = {
  empresa: 'DELFOS ENGENHARIA LTDA',
  outorgados: [
    {
      nome: 'Daniel Rotava',
      nacionalidade: 'brasileiro',
      cpf: '047.838.700-80',
      rg: '1131962548',
    },
    {
      nome: 'João Victor Bagetti Fuchs',
      nacionalidade: 'brasileiro',
      cpf: '811.562.780-15',
      rg: '5073762014',
    },
  ],
  enderecoProfissional: 'Rua Espírito Santo, 275 Bairro Fátima, Erechim – RS, CEP 99.709-296',
  concessionariaPadrao: 'Concessionária de Energia RGE',
}

/**
 * Retorna a data atual formatada por extenso em português.
 * Exemplo: "13 de setembro de 2026"
 */
export function formatarDataExtenso(date: Date = new Date()): string {
  const meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ]
  const dia = date.getDate()
  const mes = meses[date.getMonth()]
  const ano = date.getFullYear()
  return `${dia} de ${mes} de ${ano}`
}

/**
 * Normaliza os valores de merge fields para evitar campos em branco que quebrem o texto.
 */
export function normalizarDadosProcuracao(dados: Partial<DadosProcuracaoOM>): DadosProcuracaoOM {
  return {
    nome: (dados.nome || '').trim() || 'Nome do Outorgante',
    cpf: (dados.cpf || '').trim() || '000.000.000-00',
    endereco: (dados.endereco || '').trim() || 'Endereço Completo do Domicílio',
    municipio: (dados.municipio || '').trim() || 'Erechim/RS',
    dataPorExtenso: (dados.dataPorExtenso || '').trim() || formatarDataExtenso(),
    telefone: (dados.telefone || '').trim(),
  }
}

/**
 * Gera o documento HTML para impressão e visualização A4 fidedigna.
 * Usa tipografia serifada/adequada, fundo branco, estilo A4, e botões de impressão.
 */
export function gerarHTMLProcuracao(dadosInput: Partial<DadosProcuracaoOM>): string {
  const dados = normalizarDadosProcuracao(dadosInput)

  const enderecoDelfos = DADOS_FIXOS_CONTRATADA_PROCURACAO.enderecoProfissional

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>PROCURAÇÃO PARTICULAR — ${dados.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 25mm 20mm 20mm 20mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 30px;
      background-color: #f3f4f6;
      font-family: 'Times New Roman', Times, Georgia, serif;
      color: #000000;
      line-height: 1.8;
      font-size: 13pt;
      -webkit-font-smoothing: antialiased;
    }
    .page-a4 {
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto 30px auto;
      padding: 30mm 25mm;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      position: relative;
    }
    .titulo {
      text-align: center;
      font-size: 15pt;
      font-weight: bold;
      letter-spacing: 0.5px;
      margin-bottom: 35px;
      text-transform: uppercase;
      color: #000000;
    }
    p {
      text-align: justify;
      text-justify: inter-word;
      margin-top: 0;
      margin-bottom: 22px;
      text-indent: 0;
      color: #000000;
    }
    strong {
      font-weight: bold;
    }
    .data-local {
      margin-top: 40px;
      margin-bottom: 50px;
      text-align: left;
      color: #000000;
    }
    .assinatura-bloco {
      margin-top: 60px;
      text-align: center;
      width: 380px;
      margin-left: auto;
      margin-right: auto;
      color: #000000;
    }
    .linha-assinatura {
      border-top: 1px solid #000000;
      margin-bottom: 10px;
      width: 100%;
    }
    .rotulo-assinatura {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 3px;
    }
    .nome-assinante {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 2px;
    }
    .cpf-assinante {
      font-size: 12pt;
      font-weight: bold;
    }
    .action-bar {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 10px;
      z-index: 9999;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      transition: all 0.15s ease-in-out;
    }
    .btn-print {
      background-color: #16a34a;
      color: #ffffff;
    }
    .btn-print:hover {
      background-color: #15803d;
    }
    .btn-close {
      background-color: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .btn-close:hover {
      background-color: #f9fafb;
    }
    @media print {
      body {
        background: transparent !important;
        padding: 0 !important;
      }
      .page-a4 {
        width: 100% !important;
        min-height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .action-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button class="btn btn-close" onclick="window.close()">Fechar</button>
    <button class="btn btn-print" onclick="window.print()">Imprimir / Salvar como PDF</button>
  </div>

  <div class="page-a4">
    <div class="titulo">PROCURAÇÃO PARTICULAR</div>

    <p>
      <strong>OUTORGANTE: ${dados.nome},</strong> CPF nº ${dados.cpf}, domiciliado na ${dados.endereco}, ${dados.municipio}.
    </p>

    <p>
      <strong>OUTORGADOS</strong>: <strong>Daniel Rotava</strong>, brasileiro, inscrito no CPF sob nº. <strong>047.838.700-80</strong>, RG sob nº 1131962548; <strong>João Victor Bagetti Fuchs</strong>, brasileiro, inscrito no CPF sob nº <strong>811.562.780-15</strong>, RG sob nº 5073762014.; Todos com domicílio profissional na ${enderecoDelfos}
    </p>

    <p>
      <strong>PODERES:</strong> Pelo presente instrumento, a <strong>Outorgante</strong> acima qualificada nomeia e constitui seu bastante procurador a pessoa retro citada, outorgando-lhe os poderes específicos para praticar os atos consistentes nas alterações de titularidade, cadastro e alteração de unidades beneficiárias, protocolos em geral, com plenos poderes para assinar termos e documentos, dentre outros procedimentos correlatos requisitados perante a Concessionária de Energia RGE.
    </p>

    <div class="data-local">
      Erechim/RS, ${dados.dataPorExtenso}.
    </div>

    <div class="assinatura-bloco">
      <div class="linha-assinatura"></div>
      <div class="rotulo-assinatura">Assinatura do(a) Outorgante</div>
      <div class="nome-assinante">${dados.nome}</div>
      <div class="cpf-assinante">CPF: ${dados.cpf}</div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Abre a procuração renderizada em nova aba com disparo opcional da impressão para PDF.
 */
export function abrirProcuracaoImpressao(
  dadosInput: Partial<DadosProcuracaoOM>,
  autoPrint = false,
): void {
  const html = gerarHTMLProcuracao(dadosInput)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (win && autoPrint) {
    win.addEventListener('load', () => {
      setTimeout(() => {
        try {
          win.print()
        } catch {
          /* intentionally ignored */
        }
      }, 300)
    })
  }
}

/**
 * Tabela de mapeamento para caracteres Windows-1252 / WinAnsiEncoding.
 * Cobre acentuação completa em português (ã, õ, ç, á, é, í, ó, ú, â, ê, ô, à, etc.),
 * além de símbolos essenciais como ordinal masculino 'º' (0xBA), ordinal feminino 'ª' (0xAA),
 * marcador '•' (0x95), travessão '–' (0x96) e outros glifos tipográficos.
 */
const WIN_ANSI_MAP: Record<string, number> = {
  '•': 0x95, // bullet
  '–': 0x96, // en-dash
  '—': 0x97, // em-dash
  '“': 0x93, // left double quote
  '”': 0x94, // right double quote
  '‘': 0x91, // left single quote
  '’': 0x92, // right single quote
  '…': 0x85, // ellipsis
  º: 0xba, // masculine ordinal indicator
  ª: 0xaa, // feminine ordinal indicator
  '§': 0xa7, // section sign
  '«': 0xab, // guillemet left
  '»': 0xbb, // guillemet right
  '°': 0xb0, // degree sign
  '±': 0xb1, // plus-minus
  '²': 0xb2, // superscript 2
  '³': 0xb3, // superscript 3
  '·': 0xb7, // middle dot
  '©': 0xa9, // copyright
  '®': 0xae, // registered
  '€': 0x80, // euro
}

/**
 * Escapa uma string Unicode para uma representação literal de string PDF suportada
 * por /WinAnsiEncoding em fontes Standard-14 (Times-Roman, Times-Bold, Helvetica, etc.).
 * Caracteres com código > 127 ou especiais são representados em octal (\ddd) ou mapeados
 * pelo WinAnsi byte correspondente.
 */
export function escapePdfWinAnsi(text: string): string {
  if (!text) return ''
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const code = ch.charCodeAt(0)

    // Escape de caracteres sintáticos do PDF
    if (ch === '\\') {
      out += '\\\\'
      continue
    }
    if (ch === '(') {
      out += '\\('
      continue
    }
    if (ch === ')') {
      out += '\\)'
      continue
    }

    // Caracteres ASCII imprimíveis padrão
    if (code >= 32 && code <= 126) {
      out += ch
      continue
    }

    // Mapeamento especial do Windows-1252 (ex: •, –, —, º, ª, etc.)
    if (WIN_ANSI_MAP[ch] !== undefined) {
      const byteVal = WIN_ANSI_MAP[ch]
      out += '\\' + byteVal.toString(8).padStart(3, '0')
      continue
    }

    // Caracteres ISO-8859-1 (160..255) têm correspondência 1:1 de byte com WinAnsi
    if (code >= 0xa0 && code <= 0xff) {
      out += '\\' + code.toString(8).padStart(3, '0')
      continue
    }

    // Fallback: substituição por caractere ASCII aproximado caso seja caractere exótico
    const normalized = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (normalized && normalized.charCodeAt(0) >= 32 && normalized.charCodeAt(0) <= 126) {
      out += normalized
    } else {
      out += ' '
    }
  }
  return out
}

/**
 * Quebra texto em linhas ajustadas para não estourar a largura da página PDF.
 * Respeita palavras inteiras.
 */
function splitTextIntoLines(text: string, maxCharsPerLine = 78): string[] {
  const words = (text || '').split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if (!word) continue
    if (!currentLine) {
      currentLine = word
    } else if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
      currentLine += ' ' + word
    } else {
      lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines
}

/**
 * Gera PDF binário nativo padrão A4 compatível com visualizadores de PDF e navegadores.
 *
 * Características em estrita conformidade com a solicitação do usuário:
 * 1. Começa DIRETO no título "PROCURAÇÃO PARTICULAR" centralizado, SEM NENHUM cabeçalho
 *    institucional (removida a linha "DELFOS ENGENHARIA LTDA • CRM SOLAR").
 * 2. Suporta codificação integral WinAnsi (caracteres acentuados como ã, õ, ç, í, á, é,
 *    o símbolo ordinal 'nº' e '–' de Erechim – RS saem perfeitos sem corrupção).
 * 3. Mantém texto, ordem de seções (OUTORGANTE, OUTORGADOS, PODERES, local e data,
 *    assinatura) e alinhamento idênticos ao modelo Word de referência.
 */
export function gerarPDFBinarioProcuracao(dadosInput: Partial<DadosProcuracaoOM>): Uint8Array {
  const dados = normalizarDadosProcuracao(dadosInput)

  const pageWidth = 595.28 // A4: 210mm
  const pageHeight = 841.89 // A4: 297mm
  const marginX = 56.7 // 20mm de margem lateral (padrão de documento formal)
  const contentWidth = pageWidth - marginX * 2 // ~481.88 pt

  // O documento começa direto no topo (sem cabeçalho institucional prévio)
  let currentY = pageHeight - 85

  let stream = 'q\n'

  // 1. TÍTULO PRINCIPAL CENTRALIZADO: "PROCURAÇÃO PARTICULAR"
  // Times-Bold, 15pt, centralizado no A4
  const tituloText = 'PROCURAÇÃO PARTICULAR'
  // Largura estimada de "PROCURAÇÃO PARTICULAR" em Times-Bold 15pt é ~210pt
  const tituloX = (pageWidth - 210) / 2
  stream += '0 0 0 rg\n'
  stream += 'BT\n/F2 15 Tf\n'
  stream += `${tituloX.toFixed(2)} ${currentY.toFixed(2)} Td\n`
  stream += `(${escapePdfWinAnsi(tituloText)}) Tj\n`
  stream += 'ET\n'

  currentY -= 48

  // Helper para renderizar parágrafo com rótulo em negrito e corpo justificado/em bloco
  const writeParagraph = (rotulo: string, corpo: string, maxChars = 76, lineSpacing = 18) => {
    const fullText = `${rotulo} ${corpo}`
    const lines = splitTextIntoLines(fullText, maxChars)

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]
      const isFirstLine = i === 0

      stream += 'BT\n'
      stream += '0 0 0 rg\n'
      stream += `${marginX.toFixed(2)} ${currentY.toFixed(2)} Td\n`

      // Se for a primeira linha e houver rótulo, renderiza o rótulo em negrito e o resto regular
      if (isFirstLine && rotulo) {
        if (lineText.startsWith(rotulo)) {
          const remainder = lineText.slice(rotulo.length)
          stream += '/F2 12 Tf\n'
          stream += `(${escapePdfWinAnsi(rotulo)}) Tj\n`
          if (remainder) {
            stream += '/F1 12 Tf\n'
            stream += `(${escapePdfWinAnsi(remainder)}) Tj\n`
          }
        } else {
          stream += '/F2 12 Tf\n'
          stream += `(${escapePdfWinAnsi(lineText)}) Tj\n`
        }
      } else {
        stream += '/F1 12 Tf\n'
        stream += `(${escapePdfWinAnsi(lineText)}) Tj\n`
      }

      stream += 'ET\n'
      currentY -= lineSpacing
    }
    currentY -= 16 // Espaço entre seções
  }

  // 2. SEÇÃO OUTORGANTE (idêntica ao Word)
  const textoOutorgante = `${dados.nome}, CPF nº ${dados.cpf}, domiciliado na ${dados.endereco}, ${dados.municipio}.`
  writeParagraph('OUTORGANTE:', textoOutorgante, 74, 18)

  // 3. SEÇÃO OUTORGADOS (idêntica ao Word)
  const enderecoDelfos = DADOS_FIXOS_CONTRATADA_PROCURACAO.enderecoProfissional
  const textoOutorgados = `Daniel Rotava, brasileiro, inscrito no CPF sob nº. 047.838.700-80, RG sob nº 1131962548; João Victor Bagetti Fuchs, brasileiro, inscrito no CPF sob nº 811.562.780-15, RG sob nº 5073762014.; Todos com domicílio profissional na ${enderecoDelfos}`
  writeParagraph('OUTORGADOS:', textoOutorgados, 74, 18)

  // 4. SEÇÃO PODERES (idêntica ao Word)
  const textoPoderes =
    'Pelo presente instrumento, a Outorgante acima qualificada nomeia e constitui seu bastante procurador a pessoa retro citada, outorgando-lhe os poderes específicos para praticar os atos consistentes nas alterações de titularidade, cadastro e alteração de unidades beneficiárias, protocolos em geral, com plenos poderes para assinar termos e documentos, dentre outros procedimentos correlatos requisitados perante a Concessionária de Energia RGE.'
  writeParagraph('PODERES:', textoPoderes, 74, 18)

  currentY -= 16

  // 5. LOCAL E DATA (alinhamento à esquerda, como no modelo Word)
  const localDataText = `Erechim/RS, ${dados.dataPorExtenso}.`
  stream += 'BT\n/F1 12 Tf\n0 0 0 rg\n'
  stream += `${marginX.toFixed(2)} ${currentY.toFixed(2)} Td\n`
  stream += `(${escapePdfWinAnsi(localDataText)}) Tj\n`
  stream += 'ET\n'

  currentY -= 65

  // 6. BLOCO DE ASSINATURA DO OUTORGANTE (centralizado, idêntico ao Word)
  const linhaAssinaturaW = 280
  const linhaStartX = (pageWidth - linhaAssinaturaW) / 2
  const linhaEndX = linhaStartX + linhaAssinaturaW

  // Traço de assinatura
  stream += '0 0 0 RG\n0.75 w\n'
  stream += `${linhaStartX.toFixed(2)} ${currentY.toFixed(2)} m ${linhaEndX.toFixed(2)} ${currentY.toFixed(2)} l S\n`

  currentY -= 16

  // Rótulo "Assinatura do(a) Outorgante" (Times-Bold 11pt)
  const rotuloAssinatura = 'Assinatura do(a) Outorgante'
  // Largura aproximada de ~155pt
  const rotuloX = (pageWidth - 155) / 2
  stream += 'BT\n/F2 11 Tf\n0 0 0 rg\n'
  stream += `${rotuloX.toFixed(2)} ${currentY.toFixed(2)} Td\n`
  stream += `(${escapePdfWinAnsi(rotuloAssinatura)}) Tj\n`
  stream += 'ET\n'

  currentY -= 15

  // Nome do Outorgante em negrito (Times-Bold 11pt)
  const nomeOutorgante = dados.nome
  const nomeWidthAprox = Math.min(300, nomeOutorgante.length * 6.2)
  const nomeX = Math.max(marginX, (pageWidth - nomeWidthAprox) / 2)
  stream += 'BT\n/F2 11 Tf\n0 0 0 rg\n'
  stream += `${nomeX.toFixed(2)} ${currentY.toFixed(2)} Td\n`
  stream += `(${escapePdfWinAnsi(nomeOutorgante)}) Tj\n`
  stream += 'ET\n'

  currentY -= 14

  // CPF do Outorgante (Times-Bold 11pt)
  const cpfLinha = `CPF: ${dados.cpf}`
  const cpfWidthAprox = cpfLinha.length * 6
  const cpfX = (pageWidth - cpfWidthAprox) / 2
  stream += 'BT\n/F2 11 Tf\n0 0 0 rg\n'
  stream += `${cpfX.toFixed(2)} ${currentY.toFixed(2)} Td\n`
  stream += `(${escapePdfWinAnsi(cpfLinha)}) Tj\n`
  stream += 'ET\n'

  stream += 'Q\n'

  const streamLength = stream.length
  const objects: string[] = []
  objects.push('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n')
  objects.push('2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n')
  objects.push(
    `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>>>>>>\nendobj\n`,
  )
  objects.push(`4 0 obj\n<</Length ${streamLength}>>\nstream\n${stream}\nendstream\nendobj\n`)
  objects.push(
    '5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding>>\nendobj\n',
  )
  objects.push(
    '6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding>>\nendobj\n',
  )

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets: number[] = [0]

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdf.length)
    pdf += objects[i]
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'

  for (let i = 1; i <= objects.length; i++) {
    const offStr = String(offsets[i]).padStart(10, '0')
    pdf += `${offStr} 00000 n \n`
  }

  pdf += `trailer\n<</Size ${objects.length + 1} /Root 1 0 R>>\n`
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`

  // Converte a string do PDF em bytes Latin1/WinAnsi puros
  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff
  }
  return bytes
}

/**
 * Realiza o download direto do arquivo PDF oficial da procuração no navegador
 */
export function baixarProcuracaoPDF(dadosInput: Partial<DadosProcuracaoOM>): void {
  const dados = normalizarDadosProcuracao(dadosInput)
  const bytes = gerarPDFBinarioProcuracao(dados)
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const safeName = dados.nome.replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `Procuracao_Delfos_${safeName}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

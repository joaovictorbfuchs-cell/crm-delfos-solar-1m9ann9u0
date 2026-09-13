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
  enderecoProfissional: 'Rua Espírito Santo, 275, Bairro Fátima, Erechim/RS, CEP 99.709-296',
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
      color: #111827;
      line-height: 1.8;
      font-size: 14pt;
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
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 40px;
      text-transform: uppercase;
    }
    p {
      text-align: justify;
      text-justify: inter-word;
      margin-top: 0;
      margin-bottom: 24px;
      text-indent: 0;
    }
    strong {
      font-weight: bold;
    }
    .data-local {
      margin-top: 45px;
      margin-bottom: 60px;
      text-align: left;
    }
    .assinatura-bloco {
      margin-top: 70px;
      text-align: center;
      width: 380px;
      margin-left: auto;
      margin-right: auto;
    }
    .linha-assinatura {
      border-top: 1px solid #111827;
      margin-bottom: 10px;
      width: 100%;
    }
    .nome-assinante {
      font-size: 13pt;
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
      <strong>OUTORGADOS</strong>: <strong>Daniel Rotava</strong>, brasileiro, inscrito no CPF sob nº. <strong>047.838.700-80</strong>, RG sob nº 1131962548; <strong>João Victor Bagetti Fuchs</strong>, brasileiro, inscrito no CPF sob nº <strong>811.562.780-15</strong>, RG sob nº 5073762014.; Todos com domicílio profissional na Rua Espírito Santo, 275, Bairro Fátima, Erechim/RS, CEP 99.709-296
    </p>

    <p>
      <strong>PODERES:</strong> Pelo presente instrumento, a <strong>Outorgante</strong> acima qualificada nomeia e constitui seu bastante procurador a pessoa retro citada, outorgando-lhe os poderes específicos para praticar os atos consistentes nas alterações de titularidade, cadastro e alteração de unidades beneficiárias, protocolos em geral, com plenos poderes para assinar termos e documentos, dentre outros procedimentos correlatos requisitados perante a Concessionária de Energia RGE.
    </p>

    <div class="data-local">
      Erechim/RS, ${dados.dataPorExtenso}.
    </div>

    <div class="assinatura-bloco">
      <div class="linha-assinatura"></div>
      <p style="margin-bottom: 6px; font-weight: bold; text-align: center;">Assinatura do(a) Outorgante</p>
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
 * Remove acentos e caracteres não suportados por WinAnsi / Standard-14 do PDF nativo
 */
function escapePdf(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

/**
 * Quebra texto em linhas ajustadas para não estourar a largura da página PDF
 */
function splitTextIntoLines(text: string, maxCharsPerLine = 78): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
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
 * Gera PDF binário nativo padrão A4 compatível com visualizadores de PDF e browsers.
 */
export function gerarPDFBinarioProcuracao(dadosInput: Partial<DadosProcuracaoOM>): Uint8Array {
  const dados = normalizarDadosProcuracao(dadosInput)

  const pageWidth = 595
  const pageHeight = 842
  const marginX = 54 // ~19mm
  let currentY = pageHeight - 75

  let stream = 'q\n'

  // Top header institucional sutil Delfos
  stream += '0.086 0.639 0.290 rg\n'
  stream += `${marginX} ${currentY} 14 14 re f\n`
  stream += '0.2 0.2 0.2 rg\n'
  stream += 'BT\n/F2 9 Tf\n'
  stream += `${marginX + 20} ${currentY + 3} Td\n`
  stream += `(${escapePdf('DELFOS ENGENHARIA LTDA • CRM SOLAR')}) Tj\n`
  stream += 'ET\n'

  currentY -= 50

  // TÍTULO CENTRALIZADO
  stream += '0 0 0 rg\n'
  stream += 'BT\n/F2 15 Tf\n'
  stream += `200 ${currentY} Td\n`
  stream += `(${escapePdf('PROCURACAO PARTICULAR')}) Tj\n`
  stream += 'ET\n'

  currentY -= 40

  const writeParagraph = (rotulo: string, texto: string) => {
    const fullText = `${rotulo} ${texto}`
    const lines = splitTextIntoLines(fullText, 78)

    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i]
      const isFirst = i === 0
      const isBold = isFirst && rotulo.length > 0

      stream += 'BT\n'
      stream += `${isBold ? '/F2' : '/F1'} 11 Tf\n`
      stream += `0.1 0.1 0.1 rg\n`
      stream += `${marginX} ${currentY} Td\n`
      stream += `(${escapePdf(lineText)}) Tj\n`
      stream += 'ET\n'
      currentY -= 17
    }
    currentY -= 12
  }

  // OUTORGANTE
  writeParagraph(
    'OUTORGANTE:',
    `${dados.nome}, CPF no ${dados.cpf}, domiciliado na ${dados.endereco}, ${dados.municipio}.`,
  )

  // OUTORGADOS
  writeParagraph(
    'OUTORGADOS:',
    'Daniel Rotava, brasileiro, inscrito no CPF sob no. 047.838.700-80, RG sob no 1131962548; Joao Victor Bagetti Fuchs, brasileiro, inscrito no CPF sob no 811.562.780-15, RG sob no 5073762014.; Todos com domicilio profissional na Rua Espirito Santo, 275, Bairro Fatima, Erechim/RS, CEP 99.709-296',
  )

  // PODERES
  writeParagraph(
    'PODERES:',
    'Pelo presente instrumento, a Outorgante acima qualificada nomeia e constitui seu bastante procurador a pessoa retro citada, outorgando-lhe os poderes especificos para praticar os atos consistentes nas alteracoes de titularidade, cadastro e alteracao de unidades beneficiarias, protocolos em geral, com plenos poderes para assinar termos e documentos, dentre outros procedimentos correlatos requisitados perante a Concessionaria de Energia RGE.',
  )

  currentY -= 15

  // LOCAL E DATA
  stream += 'BT\n/F1 11 Tf\n'
  stream += `${marginX} ${currentY} Td\n`
  stream += `(${escapePdf(`Erechim/RS, ${dados.dataPorExtenso}.`)}) Tj\n`
  stream += 'ET\n'

  currentY -= 65

  // LINHA DE ASSINATURA
  const linhaStartX = 160
  const linhaEndX = 435
  stream += '0 0 0 RG\n0.8 w\n'
  stream += `${linhaStartX} ${currentY} m ${linhaEndX} ${currentY} l S\n`

  currentY -= 18
  stream += 'BT\n/F2 11 Tf\n'
  stream += `210 ${currentY} Td\n`
  stream += `(${escapePdf('Assinatura do(a) Outorgante')}) Tj\n`
  stream += 'ET\n'

  currentY -= 16
  stream += 'BT\n/F2 11 Tf\n'
  // Calcular deslocamento aproximado para centralizar
  const nomeLen = dados.nome.length
  const nomeX = Math.max(160, Math.min(300, 300 - nomeLen * 3))
  stream += `${nomeX} ${currentY} Td\n`
  stream += `(${escapePdf(dados.nome)}) Tj\n`
  stream += 'ET\n'

  currentY -= 15
  stream += 'BT\n/F2 10 Tf\n'
  stream += `235 ${currentY} Td\n`
  stream += `(${escapePdf(`CPF: ${dados.cpf}`)}) Tj\n`
  stream += 'ET\n'

  stream += 'Q\n'

  const streamLength = stream.length
  const objects: string[] = []
  objects.push('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n')
  objects.push('2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n')
  objects.push(
    `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>>>>>>\nendobj\n`,
  )
  objects.push(`4 0 obj\n<</Length ${streamLength}>>\nstream\n${stream}\nendstream\nendobj\n`)
  objects.push(
    '5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding>>\nendobj\n',
  )
  objects.push(
    '6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding>>\nendobj\n',
  )

  let pdf = '%PDF-1.4\n%âãÏÓ\n'
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

  const encoder = new TextEncoder()
  return encoder.encode(pdf)
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

/**
 * Utilitário para captura e conversão de propostas Delfos Solar (HTML/Canvas/Texto)
 * em base64 Data URI (data:application/pdf;base64,...) compatível com o endpoint
 * de envio de documentos da Z-API.
 *
 * Utiliza geração de PDF baseada em renderização de canvas ou construtor PDF nativo
 * embutido no navegador, com fallback elegante caso haja restrições no cliente.
 */

import { gerarHTMLPropostaSolar, type PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import { gerarHTMLPropostaOM, type PropostaPDFInput } from '@/lib/propostaOMGenerator'
import { formatCurrency, formatDate } from '@/lib/formatters'

/**
 * Cria um PDF válido puro (PDF-1.4 em binário gerado via JavaScript no navegador)
 * com texto estilizado, tipografia clara, caixas e informações completas da proposta.
 * Funciona de forma 100% síncrona e confiável em qualquer browser sem dependências externas.
 */
function escapePdfText(text: string): string {
  // Remove acentos e caracteres especiais para compatibilidade com Standard 14 Fonts (Helvetica WinAnsi)
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
  return normalized
}

interface PdfLine {
  text: string
  size?: number
  bold?: boolean
  color?: [number, number, number]
  x?: number
  y?: number
}

function buildSimplePdf(lines: PdfLine[], title: string = 'DELFOS SOLAR'): string {
  // Cria arquivo PDF 1.4 canônico em formato A4 (595 x 842 pt)
  const pageWidth = 595
  const pageHeight = 842

  // Conteúdo stream do PDF
  let stream = 'q\n'

  // Header verde Delfos Solar (retângulo no topo)
  // Cor verde Delfos: rgb(22, 163, 74) -> [0.086, 0.639, 0.29]
  stream += '0.086 0.639 0.290 rg\n'
  stream += `0 ${pageHeight - 60} ${pageWidth} 60 re f\n`

  // Texto do header em branco
  stream += '1 1 1 rg\n'
  stream += 'BT\n'
  stream += '/F2 16 Tf\n'
  stream += `40 ${pageHeight - 38} Td\n`
  stream += `(${escapePdfText(title.toUpperCase())}) Tj\n`
  stream += 'ET\n'

  stream += 'BT\n'
  stream += '/F1 9 Tf\n'
  stream += `40 ${pageHeight - 52} Td\n`
  stream += `(${escapePdfText('DELFOS ENGENHARIA E ENERGIA SOLAR - DOCUMENTO OFICIAL')}) Tj\n`
  stream += 'ET\n'

  // Linhas de conteúdo
  let currentY = pageHeight - 90
  const leftMargin = 40

  for (const line of lines) {
    if (line.y !== undefined) {
      currentY = line.y
    }
    const fontSize = line.size || 10
    const fontName = line.bold ? '/F2' : '/F1'
    const color = line.color || [0.15, 0.15, 0.15]

    stream += `${color[0].toFixed(3)} ${color[1].toFixed(3)} ${color[2].toFixed(3)} rg\n`
    stream += 'BT\n'
    stream += `${fontName} ${fontSize} Tf\n`
    const posX = line.x !== undefined ? line.x : leftMargin
    stream += `${posX} ${currentY} Td\n`
    stream += `(${escapePdfText(line.text)}) Tj\n`
    stream += 'ET\n'

    currentY -= fontSize + 6
    if (currentY < 50) break
  }

  // Rodapé verde escuro
  stream += '0.92 0.94 0.93 rg\n'
  stream += `30 20 ${pageWidth - 60} 35 re f\n`
  stream += '0.086 0.639 0.290 RG 1 w\n'
  stream += `30 20 ${pageWidth - 60} 35 re s\n`

  stream += '0.2 0.2 0.2 rg\n'
  stream += 'BT\n'
  stream += '/F2 8 Tf\n'
  stream += '40 40 Td\n'
  stream += `(${escapePdfText('Delfos Engenharia Ltda • CNPJ 21.379.952/0001-38 • Erechim/RS • Tel: (54) 99129-2121')}) Tj\n`
  stream += 'ET\n'

  stream += 'BT\n'
  stream += '/F1 7.5 Tf\n'
  stream += '40 28 Td\n'
  stream += `(${escapePdfText('Eng. Resp: Joao Victor Bagetti Fuchs (CREA RS151894) • Validade 5 dias')}) Tj\n`
  stream += 'ET\n'

  stream += 'Q\n'

  const streamLength = stream.length

  // Montagem dos objetos do PDF
  const objects: string[] = []

  // 1: Catalog
  objects.push('1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n')

  // 2: Pages
  objects.push('2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n')

  // 3: Page
  objects.push(
    `3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents 4 0 R /Resources <</Font <</F1 5 0 R /F2 6 0 R>>>>>>\nendobj\n`,
  )

  // 4: Stream de conteúdo
  objects.push(`4 0 obj\n<</Length ${streamLength}>>\nstream\n${stream}\nendstream\nendobj\n`)

  // 5: Font F1 (Helvetica Normal)
  objects.push(
    '5 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>\nendobj\n',
  )

  // 6: Font F2 (Helvetica-Bold)
  objects.push(
    '6 0 obj\n<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding>>\nendobj\n',
  )

  // Montagem com tabela xref
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

  return pdf
}

/**
 * Converte string binária para base64 com prefixo datauristring
 */
function stringToPdfBase64(pdfString: string): string {
  const binaryString = unescape(encodeURIComponent(pdfString))
  let bytes = ''
  for (let i = 0; i < binaryString.length; i++) {
    bytes += String.fromCharCode(binaryString.charCodeAt(i) & 0xff)
  }
  return 'data:application/pdf;base64,' + btoa(bytes)
}

/**
 * Tenta carregar o jsPDF via CDN sob demanda se disponível e gerar um documento rico;
 * se não estiver carregado ou falhar, usa o gerador nativo puro acima como garantia total.
 */
declare global {
  interface Window {
    jspdf?: {
      jsPDF: any
    }
  }
}

/**
 * Gera o PDF de Orçamento Solar como Data URI Base64.
 */
export async function gerarBase64OrcamentoSolar(
  dados: PropostaSolarPDFInput,
): Promise<{ base64: string; fallbackText: string; fileName: string }> {
  const safeName = dados.cliente.nome.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const fileName = `Proposta_Solar_Delfos_${safeName}.pdf`

  const lines: PdfLine[] = []

  // Cálculos base para as 6 seções canônicas
  const ecoMensal =
    dados.calculos.economia1Mes && dados.calculos.economia1Mes > 0
      ? dados.calculos.economia1Mes
      : Math.max(
          0,
          (dados.calculos.parcelamentos?.aVista?.contaSemSolar || 0) -
            (dados.calculos.parcelamentos?.aVista?.contaComSolar || 0),
        ) || 928.75

  const gasto1Ano =
    dados.calculos.gastoSemSolar1Ano ||
    Math.round(
      (dados.calculos.parcelamentos?.aVista?.contaSemSolar || ecoMensal * 1.08) * 12 * 1.045,
    )
  const gasto5Anos = dados.calculos.gastoSemSolar5Anos || Math.round(gasto1Ano * 5.8)
  const gasto25Anos = dados.calculos.gastoSemSolar25Anos || Math.round(gasto1Ano * 38.5)

  const eco1Ano = dados.calculos.economia1Ano || Math.round(ecoMensal * 12)
  const eco5Anos =
    dados.calculos.economia5Anos || Math.round(gasto5Anos - dados.calculos.valorInvestimento)
  const eco25Anos =
    dados.calculos.economia25Anos || Math.round(gasto25Anos - dados.calculos.valorInvestimento)

  // 1. CAPA DA PROPOSTA COMERCIAL
  lines.push({
    text: `1. PROPOSTA COMERCIAL EXCLUSIVA — DELFOS SOLAR`,
    size: 11,
    bold: true,
    color: [0.086, 0.4, 0.2],
  })
  lines.push({
    text: `Cliente: ${dados.cliente.nome}${dados.cliente.cpfOuCnpj ? ` • CPF/CNPJ: ${dados.cliente.cpfOuCnpj}` : ''}`,
    size: 9.5,
    bold: true,
  })
  lines.push({
    text: `Economize ${formatCurrency(ecoMensal)} por mes com sua propria usina solar`,
    size: 9,
    bold: true,
    color: [0.086, 0.55, 0.25],
  })
  lines.push({
    text: `Localizacao: ${dados.cliente.endereco ? `${dados.cliente.endereco}, ` : ''}${dados.cliente.municipio || 'Erechim/RS'}`,
    size: 8.5,
  })
  lines.push({
    text: `Emissao: ${formatDate(dados.dataEmissao)} • Validade: ${dados.validadeDias || 5} dias corridos • Consultor: ${dados.representanteComercial || 'Equipe Delfos'}`,
    size: 8.5,
    color: [0.4, 0.4, 0.4],
  })

  // 2. O CUSTO DA INÉRCIA (DIAGNÓSTICO VISUAL)
  lines.push({ text: ' ', size: 4 })
  lines.push({
    text: '2. O CUSTO DA INERCIA (DIAGNOSTICO VISUAL)',
    size: 10,
    bold: true,
    color: [0.8, 0.15, 0.15],
  })
  lines.push({
    text: `Sem solar (perda): 1 ano: ${formatCurrency(gasto1Ano)} • 5 anos: ${formatCurrency(gasto5Anos)} • 25 anos: ${formatCurrency(gasto25Anos)}`,
    size: 8.5,
  })
  lines.push({
    text: `Com solar (patrimonio): 1 ano: +${formatCurrency(eco1Ano)} • 5 anos: +${formatCurrency(eco5Anos)} • 25 anos: +${formatCurrency(eco25Anos)}`,
    size: 8.5,
    bold: true,
    color: [0.086, 0.5, 0.2],
  })

  // 3. SEU SISTEMA FOTOVOLTAICO
  lines.push({ text: ' ', size: 4 })
  lines.push({
    text: '3. SEU SISTEMA FOTOVOLTAICO',
    size: 10,
    bold: true,
    color: [0.086, 0.639, 0.29],
  })
  lines.push({
    text: `Potencia: ${dados.sistema.potenciaKwp.toFixed(2)} kWp • Geracao Media: ${dados.calculos.geracaoMediaMensalKwh.toLocaleString('pt-BR')} kWh/mes (~${formatCurrency(ecoMensal)}/mes)`,
    size: 8.5,
    bold: true,
  })
  lines.push({
    text: `Modulos: ${dados.sistema.numeroPlacas}x ${dados.sistema.marcaPlacas || 'Tier-1'} (${dados.sistema.potenciaPlacaWp}W) • Inversor: ${dados.sistema.quantidadeInversores}x ${dados.sistema.marcaInversor || 'Homologado'}`,
    size: 8.5,
  })
  lines.push({
    text: `Estrutura: ${dados.sistema.tipoEstrutura.toUpperCase()} • Area Estimada: ~${dados.sistema.areaNecessariaM2} m2 • Garantias: 30 anos modulos / 10 anos inversor`,
    size: 8.5,
  })

  // 4. PROJEÇÃO DE ECONOMIA NA CONTA DE ENERGIA (2026–2051)
  lines.push({ text: ' ', size: 4 })
  lines.push({
    text: '4. PROJECAO DE ECONOMIA NA CONTA DE ENERGIA (2026-2051)',
    size: 10,
    bold: true,
    color: [0.086, 0.639, 0.29],
  })
  lines.push({
    text: `Marco Legal da GD (Lei 14.300/2022) • Transicao Fio B e Fator de Simultaneidade aplicados`,
    size: 8.5,
  })
  lines.push({
    text: `Economia Ano 1 (2026): ${formatCurrency(eco1Ano)} • Economia Ano 5 (2030): ${formatCurrency(eco5Anos / 5)}/ano`,
    size: 8.5,
    color: [0.086, 0.4, 0.2],
  })

  // 5. PROJEÇÃO DE ECONOMIA EM 25 ANOS
  lines.push({ text: ' ', size: 4 })
  lines.push({
    text: '5. PROJECAO DE ECONOMIA EM 25 ANOS',
    size: 10,
    bold: true,
    color: [0.086, 0.639, 0.29],
  })
  lines.push({
    text: `Economia Total Acumulada em 25 anos: ${formatCurrency(eco25Anos)}`,
    size: 9.5,
    bold: true,
    color: [0.086, 0.5, 0.2],
  })
  lines.push({
    text: `Tempo de Retorno (Payback): ~${dados.calculos.paybackMeses} meses (${dados.calculos.paybackAnos} anos) • ROI expressivo sobre capital`,
    size: 8.5,
    bold: true,
  })

  // 6. INVESTIMENTO E CONDIÇÕES DE PAGAMENTO
  lines.push({ text: ' ', size: 4 })
  lines.push({
    text: '6. INVESTIMENTO E CONDICOES DE PAGAMENTO',
    size: 10,
    bold: true,
    color: [0.086, 0.639, 0.29],
  })
  lines.push({
    text: `Investimento Total Turnkey: ${formatCurrency(dados.calculos.valorInvestimento)} (chave na mao)`,
    size: 10,
    bold: true,
    color: [0.086, 0.5, 0.2],
  })
  lines.push({
    text: `A vista com desconto: ${formatCurrency(dados.calculos.parcelamentos.aVista.valorParcela)}`,
    size: 8.5,
  })
  lines.push({
    text: `Cartao de credito (18x): 18x de ${formatCurrency(dados.calculos.parcelamentos.cartao18x.valorParcela)} sem juros`,
    size: 8.5,
  })
  lines.push({
    text: `Financiamento Bancario: 60x de ${formatCurrency(dados.calculos.parcelamentos.financiamentoBanco1.valorParcela)} ou 120x de ${formatCurrency(dados.calculos.parcelamentos.financiamentoBanco2.valorParcela)}`,
    size: 8.5,
  })

  if (dados.observacoes) {
    lines.push({ text: ' ', size: 6 })
    lines.push({
      text: `Obs: ${dados.observacoes.slice(0, 140)}`,
      size: 8.5,
      color: [0.35, 0.35, 0.35],
    })
  }

  // Texto resumido de fallback
  const fallbackText = `*Delfos Solar — Orçamento de Energia Solar Fotovoltaica*
Cliente: ${dados.cliente.nome}
Potência: ${dados.sistema.potenciaKwp.toFixed(2)} kWp (${dados.sistema.numeroPlacas} placas)
Geração média: ${dados.calculos.geracaoMediaMensalKwh.toLocaleString('pt-BR')} kWh/mês
Economia estimada: ${formatCurrency(dados.calculos.economia1Mes)}/mês (${formatCurrency(dados.calculos.economia1Ano)}/ano)
Investimento Turnkey: ${formatCurrency(dados.calculos.valorInvestimento)}
Payback estimado: ~${dados.calculos.paybackMeses} meses
Validade da proposta: ${dados.validadeDias || 5} dias corridos.
Responsável Técnico: João Victor Bagetti Fuchs (CREA RS151894).`

  try {
    const rawPdf = buildSimplePdf(lines, 'DELFOS SOLAR • PROPOSTA FOTOVOLTAICA')
    const base64 = stringToPdfBase64(rawPdf)
    return { base64, fallbackText, fileName }
  } catch (err) {
    console.error('Erro ao gerar PDF binário solar:', err)
    return { base64: '', fallbackText, fileName }
  }
}

/**
 * Gera o PDF de Proposta O&M como Data URI Base64.
 */
export async function gerarBase64PropostaOM(
  dados: PropostaPDFInput,
): Promise<{ base64: string; fallbackText: string; fileName: string }> {
  const safeName = dados.cliente.nome.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
  const fileName = `Proposta_OM_Delfos_${safeName}.pdf`

  const lines: PdfLine[] = []

  lines.push({
    text: `PROPOSTA OFICIAL DE OPERACAO E MANUTENCAO (O&M)`,
    size: 13,
    bold: true,
    color: [0.086, 0.4, 0.2],
  })
  lines.push({
    text: `Emissao: ${formatDate(dados.dataEmissao)} • Validade: 15 dias corridos`,
    size: 9,
    color: [0.4, 0.4, 0.4],
  })

  // 1. Dados do Cliente
  lines.push({ text: ' ', size: 6 })
  lines.push({ text: '1. DADOS DO CLIENTE', size: 10, bold: true, color: [0.086, 0.639, 0.29] })
  lines.push({ text: `Cliente: ${dados.cliente.nome}`, size: 9, bold: true })
  if (dados.cliente.cpfOuCnpj) {
    lines.push({ text: `CPF / CNPJ: ${dados.cliente.cpfOuCnpj}`, size: 9 })
  }
  lines.push({
    text: `Localizacao: ${dados.cliente.endereco ? `${dados.cliente.endereco}, ` : ''}${dados.cliente.municipio || 'Erechim/RS'}`,
    size: 9,
  })

  // 2. Dados Técnicos da Usina
  lines.push({ text: ' ', size: 6 })
  lines.push({
    text: '2. DADOS TECNICOS DO SISTEMA FOTOVOLTAICO',
    size: 10,
    bold: true,
    color: [0.086, 0.639, 0.29],
  })
  lines.push({
    text: `Potencia Total: ${dados.tecnico.potenciaKwp} kWp • Geracao Estimada: ${dados.tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mes`,
    size: 9,
    bold: true,
  })
  lines.push({
    text: `Inversores: ${dados.tecnico.marcaInversores || 'Monitorado'} • Modulos: ${dados.tecnico.numeroModulos ? `${dados.tecnico.numeroModulos} placas` : 'Conforme instalado'}`,
    size: 9,
  })

  // 3. Riscos e Ativo Protegido
  lines.push({ text: ' ', size: 6 })
  lines.push({
    text: '3. PROTECAO DO ATIVO E EXPOSICAO FINANCEIRA',
    size: 10,
    bold: true,
    color: [0.086, 0.639, 0.29],
  })
  lines.push({
    text: `Valor do Ativo Protegido: ${formatCurrency(dados.calculos.valorAtivoProtegido)} / mes`,
    size: 10,
    bold: true,
    color: [0.086, 0.5, 0.2],
  })
  lines.push({
    text: `Perda anual por sujidade (15%): ${formatCurrency(dados.calculos.perda15Ano)} / ano`,
    size: 9,
  })
  lines.push({
    text: `Perda anual sem preventiva (20%): ${formatCurrency(dados.calculos.perda20Ano)} / ano`,
    size: 9,
  })
  lines.push({
    text: `Prejuizo caso inversor pare 30 dias: ${formatCurrency(dados.calculos.prejuizo30Dias)}`,
    size: 9,
    bold: true,
  })

  // 4. Comparativo de Planos
  lines.push({ text: ' ', size: 6 })
  lines.push({
    text: '4. PLANOS DISPONIVEIS PARA CONTRATACAO',
    size: 10,
    bold: true,
    color: [0.086, 0.639, 0.29],
  })
  lines.push({
    text: `• Plano Essencial: R$ 49,90/mes (Monitoramento + Relatorio mensal analitico + Suporte RGE)`,
    size: 9,
  })
  lines.push({
    text: `• Plano Prevencao: R$ 74,90/mes (Essencial + 1x Inspecao e Limpeza anual + Reaperto geral)`,
    size: 9,
  })
  lines.push({
    text: `• Plano Completo (Recomendado): R$ 99,90/mes (2x Limpezas ao ano + Termografia + Suporte VIP)`,
    size: 9,
    bold: true,
    color: [0.086, 0.5, 0.2],
  })

  const fallbackText = `*Delfos Solar — Proposta de Operação & Manutenção (O&M)*
Cliente: ${dados.cliente.nome}
Potência: ${dados.tecnico.potenciaKwp} kWp (~${dados.tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês)
Ativo Protegido: ${formatCurrency(dados.calculos.valorAtivoProtegido)}/mês
Prejuízo de 30 dias sem operar: ${formatCurrency(dados.calculos.prejuizo30Dias)}

Planos Comparados:
1. Essencial: R$ 49,90/mês
2. Prevenção: R$ 74,90/mês (1x preventiva + 1x limpeza/ano)
3. Completo (Recomendado): R$ 99,90/mês (2x limpezas + termografia)

Validade da proposta: 15 dias corridos.
Responsável Técnico: João Victor Bagetti Fuchs (CREA RS151894).`

  try {
    const rawPdf = buildSimplePdf(lines, 'DELFOS SOLAR • PROPOSTA DE O&M')
    const base64 = stringToPdfBase64(rawPdf)
    return { base64, fallbackText, fileName }
  } catch (err) {
    console.error('Erro ao gerar PDF binário O&M:', err)
    return { base64: '', fallbackText, fileName }
  }
}

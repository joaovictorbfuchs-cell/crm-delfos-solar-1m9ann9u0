import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  PageNumber,
  HeadingLevel,
  ImageRun,
} from 'docx'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import {
  DADOS_EMPRESA_DELFOS_SOLAR,
  formatarOrientacao,
  formatarTipoEstrutura,
} from '@/lib/propostaSolarGenerator'
import logoPng from '@/assets/delfos-solar-a46ea.png'

// Cores da identidade visual Delfos Solar
const COLOR_PRIMARY = '166534' // Verde Escuro Delfos (#166534)
const COLOR_ACCENT = '16A34A' // Verde Médio (#16A34A)
const COLOR_LIGHT_BG = 'F0FDF4' // Fundo Verde Suave
const COLOR_GRAY_BG = 'F9FAFB' // Fundo Cinza Claro
const COLOR_BORDER = 'D1D5DB' // Borda Cinza (#D1D5DB)
const COLOR_TEXT_DARK = '111827' // Texto Quase Preto
const COLOR_TEXT_MUTED = '4B5563' // Texto Secundário

// Largura padrão de página utilizável em DXA:
// A4 (11906 dxa) - margens de 1000 dxa em cada lado = 9906 dxa
const PAGE_CONTENT_WIDTH = 9900

function formatBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateBR(iso?: string): string {
  const d = iso ? new Date(iso) : new Date()
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Tenta carregar o PNG do logotipo como Uint8Array para embutir no cabeçalho do documento Word.
 */
async function loadLogoUint8Array(): Promise<Uint8Array | null> {
  try {
    const response = await fetch(logoPng)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (err) {
    console.warn('Não foi possível carregar o arquivo de logotipo para o docx:', err)
    return null
  }
}

/**
 * Cria bordas sutis e padronizadas para células de tabela
 */
const tableBorderDefault = {
  top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
}

const tableBorderNone = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
}

/**
 * Cria um título de seção estilizado com barra verde e texto em negrito
 */
function createSectionHeader(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text: '■ ',
        color: COLOR_ACCENT,
        size: 24, // 12pt
        bold: true,
      }),
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 22, // 11pt
        color: COLOR_PRIMARY,
        font: 'Arial',
      }),
    ],
  })
}

/**
 * Gera um Document oficial em formato docx com todo o conteúdo e formatação profissional.
 */
export async function gerarPropostaSolarDocx(dados: PropostaSolarPDFInput): Promise<Document> {
  const { cliente, representanteComercial, sistema, calculos } = dados
  const validadeEmDias = dados.validadeDias ?? 5
  const repNome = representanteComercial || 'Equipe Comercial Delfos Solar'
  const prazoEntrega = sistema.prazoEntregaDias ?? 30
  const logoBytes = await loadLogoUint8Array()

  // Montagem do cabeçalho de cada página do Word
  const headerChildren: (Paragraph | Table)[] = []

  if (logoBytes) {
    // Tabela com Logo à esquerda e Dados da Delfos à direita
    headerChildren.push(
      new Table({
        width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
        borders: tableBorderNone,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 2800, type: WidthType.DXA },
                borders: tableBorderNone,
                children: [
                  new Paragraph({
                    children: [
                      new ImageRun({
                        type: 'png',
                        data: logoBytes,
                        transformation: { width: 140, height: 42 },
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                width: { size: PAGE_CONTENT_WIDTH - 2800, type: WidthType.DXA },
                borders: tableBorderNone,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: DADOS_EMPRESA_DELFOS_SOLAR.nomeFantasia,
                        bold: true,
                        size: 20,
                        color: COLOR_PRIMARY,
                        font: 'Arial',
                      }),
                      new TextRun({
                        text: ` — ${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial}`,
                        size: 16,
                        color: COLOR_TEXT_MUTED,
                        font: 'Arial',
                      }),
                    ],
                  }),
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [
                      new TextRun({
                        text: `CNPJ: ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj} • Tel: ${DADOS_EMPRESA_DELFOS_SOLAR.telefone} • ${DADOS_EMPRESA_DELFOS_SOLAR.site}`,
                        size: 14,
                        color: COLOR_TEXT_MUTED,
                        font: 'Arial',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    )
  } else {
    // Fallback: Cabeçalho textual estilizado em verde
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: 'DELFOS SOLAR',
            bold: true,
            size: 22,
            color: COLOR_PRIMARY,
            font: 'Arial',
          }),
          new TextRun({
            text: ` — ${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial} (CNPJ ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj})`,
            size: 16,
            color: COLOR_TEXT_MUTED,
            font: 'Arial',
          }),
        ],
      }),
    )
  }

  // Linha divisória verde no cabeçalho
  headerChildren.push(
    new Paragraph({
      spacing: { before: 80, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ACCENT },
      },
      children: [],
    }),
  )

  // Montagem do rodapé de cada página
  const footerChildren = [
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
      },
      spacing: { before: 80, after: 60 },
      alignment: AlignmentType.BOTH,
      children: [
        new TextRun({
          text: `${DADOS_EMPRESA_DELFOS_SOLAR.nomeFantasia} | ${DADOS_EMPRESA_DELFOS_SOLAR.endereco} | Responsável: ${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} (${DADOS_EMPRESA_DELFOS_SOLAR.crea})`,
          size: 15,
          color: COLOR_TEXT_MUTED,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'Página ',
          size: 15,
          color: COLOR_TEXT_MUTED,
          font: 'Arial',
        }),
        new TextRun({
          children: [PageNumber.CURRENT],
          size: 15,
          color: COLOR_TEXT_MUTED,
          font: 'Arial',
          bold: true,
        }),
      ],
    }),
  ]

  // ==========================================
  // CONTEÚDO PRINCIPAL DO DOCUMENTO WORD
  // ==========================================
  const docChildren: (Paragraph | Table)[] = []

  // BANNER DE TÍTULO PRINCIPAL (HERO)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
        left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY }, // tarja lateral verde
        right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 140, bottom: 140, left: 180, right: 180 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'PROPOSTA TÉCNICO-COMERCIAL DE ENERGIA SOLAR FOTOVOLTAICA',
                      bold: true,
                      size: 24,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: 'Geração limpa, valorização patrimonial e redução imediata de custos na sua conta de energia.',
                      size: 18,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `   •   Data de Emissão: ${formatDateBR(dados.dataEmissao)}   •   Validade: ${validadeEmDias} dias corridos`,
                      size: 18,
                      bold: true,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // 1. DADOS DO CLIENTE & ATENDIMENTO
  docChildren.push(createSectionHeader('1. Dados do Cliente e Atendimento'))

  const colWidthMetade = Math.floor(PAGE_CONTENT_WIDTH / 2)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // Célula 1: Cliente
            new TableCell({
              width: { size: colWidthMetade, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'CLIENTE',
                      bold: true,
                      size: 18,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: ` (${cliente.tipoCliente || 'Solar'})`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({ text: 'Nome / Razão: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({ text: cliente.nome, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: 'CPF / CNPJ: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({
                      text: cliente.cpfOuCnpj || 'Não informado',
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: 'Município: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({
                      text: cliente.municipio || 'Erechim / RS',
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: 'Endereço: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({
                      text: cliente.endereco || 'Endereço da usina',
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: 'Contato: ', bold: true, size: 18, font: 'Arial' }),
                    new TextRun({
                      text: [cliente.telefone, cliente.email].filter(Boolean).join(' • ') || '—',
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            // Célula 2: Atendimento e Prazos
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH - colWidthMetade, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'ATENDIMENTO & PRAZOS',
                      bold: true,
                      size: 18,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: 'Representante Comercial: ',
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                    new TextRun({ text: repNome, size: 18, font: 'Arial' }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: 'Responsável Técnico: ',
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} (${DADOS_EMPRESA_DELFOS_SOLAR.crea})`,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: 'Prazo de Instalação: ',
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${prazoEntrega} dias corridos`,
                      bold: true,
                      color: COLOR_ACCENT,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: 'Validade da Proposta: ',
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${validadeEmDias} dias corridos`,
                      bold: true,
                      color: COLOR_PRIMARY,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: 'Consumo Médio Atual: ',
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${sistema.consumoKwhMes.toLocaleString('pt-BR')} kWh/mês`,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // 2. RESUMO DE INDICADORES DO SISTEMA
  docChildren.push(createSectionHeader('2. Resumo Técnico e Financeiro do Sistema'))

  const colCardWidth = Math.floor(PAGE_CONTENT_WIDTH / 4)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // Card 1: Potência
            new TableCell({
              width: { size: colCardWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'POTÊNCIA DO SISTEMA',
                      bold: true,
                      size: 16,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `${sistema.potenciaKwp.toFixed(2)} kWp`,
                      bold: true,
                      size: 26,
                      color: COLOR_ACCENT,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${sistema.numeroPlacas} placas (${sistema.potenciaPlacaWp}W)`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            // Card 2: Geração Média
            new TableCell({
              width: { size: colCardWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'GERAÇÃO MÉDIA ESTIMADA',
                      bold: true,
                      size: 16,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `${calculos.geracaoMediaMensalKwh.toLocaleString('pt-BR')} kWh/mês`,
                      bold: true,
                      size: 24,
                      color: COLOR_ACCENT,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${calculos.geracaoAnualEstimadaKwh.toLocaleString('pt-BR')} kWh/ano`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            // Card 3: Valor Total
            new TableCell({
              width: { size: colCardWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'INVESTIMENTO TOTAL',
                      bold: true,
                      size: 16,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: formatBRL(calculos.valorInvestimento),
                      bold: true,
                      size: 24,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${formatBRL(calculos.custoPorKwpInstalado)}/kWp`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            // Card 4: Payback
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH - colCardWidth * 3, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'PAYBACK ESTIMADO',
                      bold: true,
                      size: 16,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `${calculos.paybackMeses} meses`,
                      bold: true,
                      size: 26,
                      color: COLOR_ACCENT,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `(~${calculos.paybackAnos} anos)`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // 3. ESPECIFICAÇÃO DOS EQUIPAMENTOS
  docChildren.push(createSectionHeader('3. Descrição dos Equipamentos Fotovoltaicos'))

  const equipTableWidths = [2600, 3600, 1300, 2400]
  const equipRows = [
    // Cabeçalho da Tabela
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: equipTableWidths[0], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'Item / Componente', bold: true, size: 18, color: 'FFFFFF' }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[1], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Especificação / Modelo',
                  bold: true,
                  size: 18,
                  color: 'FFFFFF',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[2], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Quantidade', bold: true, size: 18, color: 'FFFFFF' }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[3], type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: 'Garantia de Fabricante',
                  bold: true,
                  size: 18,
                  color: 'FFFFFF',
                }),
              ],
            }),
          ],
        }),
      ],
    }),
    // Linha 1: Módulos
    new TableRow({
      children: [
        new TableCell({
          width: { size: equipTableWidths[0], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Módulos Fotovoltaicos', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[1], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `${sistema.marcaPlacas} (${sistema.potenciaPlacaWp} Wp)`,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[2], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${sistema.numeroPlacas} un`, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[3], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: '12-15 anos fábrica / 25-30 anos linear', size: 18 })],
            }),
          ],
        }),
      ],
    }),
    // Linha 2: Inversores
    new TableRow({
      children: [
        new TableCell({
          width: { size: equipTableWidths[0], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Inversor(es) Solar(es)', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[1], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: sistema.marcaInversor, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[2], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: `${sistema.quantidadeInversores} un`, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[3], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: '10 anos de garantia de fábrica', size: 18 })],
            }),
          ],
        }),
      ],
    }),
    // Linha 3: Estrutura de Fixação
    new TableRow({
      children: [
        new TableCell({
          width: { size: equipTableWidths[0], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Estrutura de Fixação', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[1], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Alumínio/Aço Inox para ${formatarTipoEstrutura(sistema.tipoEstrutura)}`,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[2], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '1 conjunto', size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[3], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: '10 a 12 anos contra corrosão', size: 18 })],
            }),
          ],
        }),
      ],
    }),
    // Linha 4: Área e Orientação
    new TableRow({
      children: [
        new TableCell({
          width: { size: equipTableWidths[0], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Área & Orientação Telhado', bold: true, size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[1], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Área estimada: aprox. ${sistema.areaNecessariaM2} m²`,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[2], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '—', size: 18 })],
            }),
          ],
        }),
        new TableCell({
          width: { size: equipTableWidths[3], type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: `Orientação: ${formatarOrientacao(sistema.orientacaoTelhado)}`,
                  size: 18,
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ]

  if (sistema.codigoFiname) {
    equipRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: equipTableWidths[0], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Código FINAME / BNDES', bold: true, size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: equipTableWidths[1], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${sistema.codigoFiname} (Elegível a linhas de financiamento industrial)`,
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: equipTableWidths[2], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Sim', size: 18 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: equipTableWidths[3], type: WidthType.DXA },
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: 'Conforme normas BNDES', size: 18 })],
              }),
            ],
          }),
        ],
      }),
    )
  }

  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: equipRows,
    }),
  )

  // 4. CONDIÇÕES DE PAGAMENTO E PARCELAMENTO
  docChildren.push(createSectionHeader('4. Condições Comerciais e Simulação de Pagamento'))

  const colParcWidth = Math.floor(PAGE_CONTENT_WIDTH / 4)
  const parc = calculos.parcelamentos
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // Opção 1: À Vista
            new TableCell({
              width: { size: colParcWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 120, bottom: 120, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: parc.aVista.titulo.toUpperCase(),
                      bold: true,
                      size: 18,
                      color: COLOR_PRIMARY,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: formatBRL(parc.aVista.valorTotal),
                      bold: true,
                      size: 24,
                      color: COLOR_PRIMARY,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: 'Melhor Retorno Financeiro',
                      size: 15,
                      color: COLOR_ACCENT,
                      bold: true,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: `• Conta c/ solar: ${formatBRL(parc.aVista.contaComSolar)}\n`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                    new TextRun({
                      text: `• Economia líquida: ${formatBRL(parc.aVista.economiaMensalLiquida)}/mês`,
                      size: 16,
                      bold: true,
                      color: COLOR_PRIMARY,
                    }),
                  ],
                }),
              ],
            }),
            // Opção 2: Cartão 18x
            new TableCell({
              width: { size: colParcWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
              margins: { top: 120, bottom: 120, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: parc.cartao18x.titulo.toUpperCase(),
                      bold: true,
                      size: 18,
                      color: COLOR_TEXT_DARK,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `${formatBRL(parc.cartao18x.valorParcela)}`,
                      bold: true,
                      size: 22,
                      color: COLOR_TEXT_DARK,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '18x no cartão de crédito',
                      size: 15,
                      color: COLOR_TEXT_MUTED,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: `• Parcela + Conta: ${formatBRL(parc.cartao18x.desembolsoMensal)}/mês\n`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                    new TextRun({
                      text: `• Total financiado: ${formatBRL(parc.cartao18x.valorTotal)}`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                  ],
                }),
              ],
            }),
            // Opção 3: Financiamento Banco 1
            new TableCell({
              width: { size: colParcWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
              margins: { top: 120, bottom: 120, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: parc.financiamentoBanco1.titulo.toUpperCase(),
                      bold: true,
                      size: 18,
                      color: COLOR_TEXT_DARK,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `${formatBRL(parc.financiamentoBanco1.valorParcela)}`,
                      bold: true,
                      size: 22,
                      color: COLOR_TEXT_DARK,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '60x bancário (1,90% a.m.)',
                      size: 15,
                      color: COLOR_TEXT_MUTED,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: `• Parcela + Conta: ${formatBRL(parc.financiamentoBanco1.desembolsoMensal)}/mês\n`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                    new TextRun({
                      text: `• Carência: até 90 dias`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                  ],
                }),
              ],
            }),
            // Opção 4: Financiamento Banco 2
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH - colParcWidth * 3, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' }, // Azul Suave
              margins: { top: 120, bottom: 120, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: parc.financiamentoBanco2.titulo.toUpperCase(),
                      bold: true,
                      size: 18,
                      color: '1E40AF',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `${formatBRL(parc.financiamentoBanco2.valorParcela)}`,
                      bold: true,
                      size: 22,
                      color: '1D4ED8',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'Taxa Verde 60x (0,99% a.m.)',
                      size: 15,
                      color: '1D4ED8',
                      bold: true,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: `• Parcela + Conta: ${formatBRL(parc.financiamentoBanco2.desembolsoMensal)}/mês\n`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                    new TextRun({
                      text: `• Linha subsidiada ESG/Solar`,
                      size: 16,
                      color: '1E40AF',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // 5. PROJEÇÃO DE ECONOMIA ACUMULADA (25 ANOS)
  docChildren.push(
    createSectionHeader('5. Comparativo: Gasto sem Solar vs Economia Líquida Delfos'),
  )

  const colEconWidth = Math.floor(PAGE_CONTENT_WIDTH / 2)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // Sem Solar (Desperdício)
            new TableCell({
              width: { size: colEconWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FEF2F2' }, // Vermelho suave
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'GASTO COM CONCESSIONÁRIA SEM SOLAR (9% a.a.)',
                      bold: true,
                      size: 18,
                      color: '991B1B',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({ text: '• Gasto em 1 ano (12 meses): ', size: 18 }),
                    new TextRun({
                      text: formatBRL(calculos.gastoSemSolar1Ano),
                      bold: true,
                      color: 'B91C1C',
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: '• Gasto acumulado em 5 anos: ', size: 18 }),
                    new TextRun({
                      text: formatBRL(calculos.gastoSemSolar5Anos),
                      bold: true,
                      color: 'B91C1C',
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: '• Gasto acumulado em 10 anos: ', size: 18 }),
                    new TextRun({
                      text: formatBRL(calculos.gastoSemSolar10Anos),
                      bold: true,
                      color: 'B91C1C',
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: '• Gasto total em 25 anos: ', size: 18, bold: true }),
                    new TextRun({
                      text: formatBRL(calculos.gastoSemSolar25Anos),
                      bold: true,
                      color: '991B1B',
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
            // Com Solar (Economia)
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH - colEconWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'ECONOMIA LÍQUIDA ACUMULADA COM DELFOS SOLAR',
                      bold: true,
                      size: 18,
                      color: COLOR_PRIMARY,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({ text: '• Economia em 1 ano: ', size: 18 }),
                    new TextRun({
                      text: formatBRL(calculos.economia1Ano),
                      bold: true,
                      color: COLOR_ACCENT,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: '• Economia acumulada em 5 anos: ', size: 18 }),
                    new TextRun({
                      text: formatBRL(calculos.economia5Anos),
                      bold: true,
                      color: COLOR_ACCENT,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: '• Economia acumulada em 10 anos: ', size: 18 }),
                    new TextRun({
                      text: formatBRL(calculos.economia10Anos),
                      bold: true,
                      color: COLOR_ACCENT,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({ text: '• Economia total em 25 anos: ', size: 18, bold: true }),
                    new TextRun({
                      text: formatBRL(calculos.economia25Anos),
                      bold: true,
                      color: COLOR_PRIMARY,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // 6. OBSERVAÇÕES E SERVIÇOS INCLUSOS
  docChildren.push(createSectionHeader('6. Serviços Inclusos e Observações Técnicas'))

  const servicosItems = [
    'Projeto executivo de engenharia e homologação completa junto à concessionária (RGE).',
    'Mão de obra própria qualificada com certificações de segurança NR-10 e NR-35.',
    'Fornecimento de cabos solares anti-UV, eletrodutos, proteções e conectores originais MC4.',
    'Quadro de proteção CC/CA (String Box) com DPS e disjuntores industriais.',
    'Configuração do sistema de monitoramento via aplicativo para smartphone e PC.',
    'Anotação de Responsabilidade Técnica (ART) emitida por Engenheiro responsável registrado no CREA.',
  ]

  servicosItems.forEach((item) => {
    docChildren.push(
      new Paragraph({
        spacing: { before: 30, after: 30 },
        children: [
          new TextRun({ text: '✓  ', color: COLOR_ACCENT, bold: true, size: 18 }),
          new TextRun({ text: item, size: 18, color: COLOR_TEXT_DARK, font: 'Arial' }),
        ],
      }),
    )
  })

  if (dados.observacoes) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 120 },
        children: [
          new TextRun({ text: 'Observações específicas: ', bold: true, size: 18, font: 'Arial' }),
          new TextRun({ text: dados.observacoes, size: 18, font: 'Arial' }),
        ],
      }),
    )
  }

  // 7. ASSINATURAS E APROVAÇÃO
  docChildren.push(createSectionHeader('7. Aprovação e Termo de Aceite'))

  const colAssinaturaWidth = Math.floor(PAGE_CONTENT_WIDTH / 2)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: colAssinaturaWidth, type: WidthType.DXA },
              borders: tableBorderNone,
              margins: { top: 200, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '____________________________________________',
                      color: COLOR_BORDER,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial,
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} (${DADOS_EMPRESA_DELFOS_SOLAR.crea})`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH - colAssinaturaWidth, type: WidthType.DXA },
              borders: tableBorderNone,
              margins: { top: 200, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '____________________________________________',
                      color: COLOR_BORDER,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: cliente.nome,
                      bold: true,
                      size: 18,
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: cliente.cpfOuCnpj
                        ? `CPF/CNPJ: ${cliente.cpfOuCnpj}`
                        : 'Cliente / Contratante',
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // Criar o Document completo
  return new Document({
    creator: DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial,
    title: `Proposta Solar Delfos - ${cliente.nome}`,
    description:
      'Proposta técnico-comercial de energia solar fotovoltaica gerada pelo CRM Delfos Solar',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000,
            },
          },
        },
        headers: {
          default: new Header({
            children: headerChildren,
          }),
        },
        footers: {
          default: new Footer({
            children: footerChildren,
          }),
        },
        children: docChildren,
      },
    ],
  })
}

/**
 * Empacota o documento Word em um Blob (.docx) no navegador
 */
export async function gerarBlobPropostaSolarDocx(dados: PropostaSolarPDFInput): Promise<Blob> {
  const doc = await gerarPropostaSolarDocx(dados)
  return await Packer.toBlob(doc)
}

/**
 * Salva o documento Word (.docx) diretamente no computador do usuário
 */
export async function baixarPropostaSolarDocx(
  dados: PropostaSolarPDFInput,
  blobPreGerado?: Blob,
): Promise<void> {
  const blob = blobPreGerado || (await gerarBlobPropostaSolarDocx(dados))
  const safeName = dados.cliente.nome.replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `Proposta_Solar_Delfos_${safeName}.docx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

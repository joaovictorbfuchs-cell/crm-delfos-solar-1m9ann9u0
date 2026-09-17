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
  PageBreak,
} from 'docx'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import { fetchInstalacoesGaleria } from '@/services/instalacoesGaleriaService'
import type { InstalacaoGaleria } from '@/types/instalacoesGaleria'
import {
  DADOS_EMPRESA_DELFOS_SOLAR,
  formatarOrientacao,
  formatarTipoEstrutura,
} from '@/lib/propostaSolarGenerator'
import { calcularProjecaoEconomia } from '@/lib/calculoProjecaoEconomia'
import { CONSUMO_EXEMPLO_PADRAO_KWH_ANO } from '@/data/planilhaBaseProjecao'
import logoPng from '@/assets/delfos-solar-09ea2.png'
import { getFotoUrl } from '@/services/instalacoesGaleriaService'
import { onGridPngAsset, monitoramentoPngAsset } from './propostaIlustracoesAssets'

// Cores da identidade visual Delfos Solar
const COLOR_PRIMARY = '065F46' // Verde Escuro Delfos (#065F46)
const COLOR_ACCENT = '16A34A' // Verde Médio (#16A34A)
const COLOR_LIGHT_BG = 'F0FDF4' // Fundo Verde Suave
const COLOR_GRAY_BG = 'F9FAFB' // Fundo Cinza Claro
const COLOR_BORDER = 'D1D5DB' // Borda Cinza (#D1D5DB)
const COLOR_TEXT_DARK = '111827' // Texto Quase Preto
const COLOR_TEXT_MUTED = '4B5563' // Texto Secundário
const COLOR_RED = 'DC2626' // Vermelho Alerta (#DC2626)
const COLOR_RED_BG = 'FEF2F2' // Fundo Vermelho Suave

// Largura padrão de página utilizável em DXA:
// A4 (11906 dxa) - margens de 1000 dxa em cada lado = 9906 dxa
const PAGE_CONTENT_WIDTH = 9900

function formatBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatNumBR(val: number, decimals: number = 0): string {
  return (val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
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
 * Tenta carregar uma imagem (URL remota ou data-URI base64) para Uint8Array para embutir no docx
 */
async function loadImageUint8Array(urlOrDataUri?: string | null): Promise<Uint8Array | null> {
  if (!urlOrDataUri || !urlOrDataUri.trim()) return null
  try {
    if (urlOrDataUri.startsWith('data:')) {
      const parts = urlOrDataUri.split(',')
      if (parts.length < 2) return null
      const base64 = parts[1]
      const binaryString = atob(base64)
      const len = binaryString.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    }
    const response = await fetch(urlOrDataUri)
    if (!response.ok) return null
    const arrayBuffer = await response.arrayBuffer()
    return new Uint8Array(arrayBuffer)
  } catch (err) {
    console.warn('Não foi possível carregar imagem para o docx:', err)
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
function createSectionHeader(title: string, sub?: string): Paragraph[] {
  const paras: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: sub ? 40 : 100 },
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
    }),
  ]

  if (sub) {
    paras.push(
      new Paragraph({
        spacing: { before: 0, after: 100 },
        children: [
          new TextRun({
            text: sub,
            size: 16,
            color: COLOR_TEXT_MUTED,
            font: 'Arial',
            italics: true,
          }),
        ],
      }),
    )
  }

  return paras
}

/**
 * Gera um Document oficial em formato docx com as 6 SEÇÕES CANÔNICAS:
 * 1. Capa
 * 2. Situação Atual (Consumo & Custos + Gastos Acumulados)
 * 3. Seu Sistema Fotovoltaico
 * 4. Projeção de Economia na Conta de Energia (2026–2051)
 * 5. Projeção de Economia em 25 Anos
 * 6. Investimento e Condições de Pagamento
 */
export async function gerarPropostaSolarDocx(dados: PropostaSolarPDFInput): Promise<Document> {
  const { cliente, representanteComercial, sistema, calculos } = dados
  const validadeEmDias = dados.validadeDias ?? 5
  const repNome = representanteComercial || 'Equipe Comercial Delfos Solar'
  const prazoEntrega = sistema.prazoEntregaDias ?? 30
  const logoBytes = await loadLogoUint8Array()

  const dataFormatada = formatDateBR(dados.dataEmissao)
  const potenciaKwp = sistema.potenciaKwp || 0
  const investimentoTotal = calculos.valorInvestimento || 45000

  // Economia mensal
  const economiaMensal =
    calculos.economia1Mes && calculos.economia1Mes > 0
      ? calculos.economia1Mes
      : Math.max(
          0,
          (calculos.parcelamentos?.aVista?.contaSemSolar || 0) -
            (calculos.parcelamentos?.aVista?.contaComSolar || 0),
        ) || 928.75

  const contaHoje =
    calculos.parcelamentos?.aVista?.contaSemSolar && calculos.parcelamentos.aVista.contaSemSolar > 0
      ? calculos.parcelamentos.aVista.contaSemSolar
      : Math.round(economiaMensal * 1.08)

  // Inércia
  const contaAnualDocx =
    calculos.contaAtualSemSolarAno && calculos.contaAtualSemSolarAno > 0
      ? calculos.contaAtualSemSolarAno
      : Math.round(contaHoje * 12)
  const gasto1Ano = calculos.gastoSemSolar1Ano || Math.round(contaHoje * 12 * 1.045)
  const gasto5Anos = calculos.gastoSemSolar5Anos || Math.round(gasto1Ano * 5.8)
  const gasto25Anos = calculos.gastoSemSolar25Anos || Math.round(gasto1Ano * 38.5)

  const eco1Ano = calculos.economia1Ano || Math.round(economiaMensal * 12)
  const eco5Anos = calculos.economia5Anos || Math.round(gasto5Anos - investimentoTotal)
  const eco25Anos = calculos.economia25Anos || Math.round(gasto25Anos - investimentoTotal)

  // Projeção Lei 14.300
  const consumoKwhAnoEstimado =
    sistema.consumoKwhMes && sistema.consumoKwhMes > 0
      ? Math.round(sistema.consumoKwhMes * 12)
      : calculos.geracaoAnualEstimadaKwh > 0
        ? calculos.geracaoAnualEstimadaKwh
        : CONSUMO_EXEMPLO_PADRAO_KWH_ANO

  const tipoClienteProj = cliente.tipoCliente === 'comercial' ? 'comercial' : 'residencial'
  const projecaoOficial = calcularProjecaoEconomia({
    tipoCliente: tipoClienteProj,
    consumoKwhAno: consumoKwhAnoEstimado,
  })

  // Payback & ROI
  const paybackMesesCalculado = calculos.paybackMeses || 50
  const paybackAnosInt = Math.floor(paybackMesesCalculado / 12)
  const paybackMesesInt = Math.round(paybackMesesCalculado % 12)
  const paybackTextoFinal = `${paybackAnosInt} anos e ${paybackMesesInt} meses`
  const anoPayback = 2026 + Math.ceil(paybackMesesCalculado / 12)

  // Período de payback arredondado PARA CIMA até fechar um ano inteiro (ex.: 22 meses -> 2 anos; 25 meses -> 3 anos)
  const anosPaybackArredondado =
    calculos.anosPaybackArredondado ||
    (paybackMesesCalculado > 0 ? Math.max(1, Math.ceil(paybackMesesCalculado / 12)) : 5)

  // Gasto acumulado no período do payback arredondado (card do meio)
  const gastoCardMeio = (() => {
    if (calculos.gastoSemSolarPaybackAnos && calculos.gastoSemSolarPaybackAnos > 0) {
      return calculos.gastoSemSolarPaybackAnos
    }
    if (anosPaybackArredondado === 5 && gasto5Anos > 0) {
      return gasto5Anos
    }
    if (anosPaybackArredondado === 1 && gasto1Ano > 0) {
      return gasto1Ano
    }
    let acumulado = 0
    for (let ano = 0; ano < anosPaybackArredondado; ano++) {
      acumulado += contaAnualDocx * Math.pow(1 + 0.09, ano)
    }
    return Math.round(acumulado)
  })()

  const rotuloPeriodoCardMeio =
    anosPaybackArredondado === 1 ? '1 Ano' : `${anosPaybackArredondado} Anos`
  const tituloCardMeio = `GASTO EM ${rotuloPeriodoCardMeio.toUpperCase()}`
  const totalMesesCardMeio = anosPaybackArredondado * 12
  const mediaMensalCardMeio = Math.round(gastoCardMeio / totalMesesCardMeio)

  const roiCalculado =
    investimentoTotal > 0
      ? Math.round(((eco25Anos - investimentoTotal) / investimentoTotal) * 100)
      : 840

  // Pagamento
  const parcelamentos = calculos.parcelamentos
  const aVistaValor = parcelamentos.aVista.valorParcela || Math.round(investimentoTotal * 0.95)
  const aVistaDesconto = Math.max(0, investimentoTotal - aVistaValor)

  const cartaoParcelas = parcelamentos.cartao18x.numeroParcelas || 18
  const cartaoValor =
    parcelamentos.cartao18x.valorParcela || Math.round(investimentoTotal / cartaoParcelas)

  const finanANome = parcelamentos.financiamentoBanco1.titulo || 'Financiamento A'
  const finanAParcelas = parcelamentos.financiamentoBanco1.numeroParcelas || 60
  const finanAValor =
    parcelamentos.financiamentoBanco1.valorParcela || Math.round(investimentoTotal * 0.023)
  const finanAEntrada = Math.round(investimentoTotal * 0.2)

  const finanBNome = parcelamentos.financiamentoBanco2.titulo || 'Financiamento B'
  const finanBParcelas = parcelamentos.financiamentoBanco2.numeroParcelas || 120
  const finanBValor =
    parcelamentos.financiamentoBanco2.valorParcela || Math.round(investimentoTotal * 0.02)
  const finanBEntrada = Math.round(investimentoTotal * 0.1)

  // Montagem do cabeçalho de cada página do Word
  const headerChildren: (Paragraph | Table)[] = []

  if (logoBytes) {
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
  // CONTEÚDO PRINCIPAL DO DOCUMENTO (6 SEÇÕES)
  // ==========================================
  const docChildren: (Paragraph | Table)[] = []

  // ----------------------------------------------------
  // SEÇÃO 1: CAPA DA PROPOSTA COMERCIAL (ESTILO MODERNO ESPELHADO DO SecaoCapaProposta)
  // ----------------------------------------------------
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ACCENT },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ACCENT },
        left: { style: BorderStyle.SINGLE, size: 36, color: COLOR_PRIMARY },
        right: { style: BorderStyle.SINGLE, size: 12, color: COLOR_ACCENT },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: '071A15' },
              margins: { top: 200, bottom: 200, left: 220, right: 220 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '✦ PROPOSTA COMERCIAL EXCLUSIVA • ',
                      bold: true,
                      size: 20,
                      color: '6EE7B7',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatNumBR(potenciaKwp, 2)} kWp`,
                      bold: true,
                      size: 20,
                      color: 'FCD34D',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 100 },
                  children: [
                    new TextRun({
                      text: 'PROPOSTA PREPARADA PARA\n',
                      bold: true,
                      size: 16,
                      color: '34D399',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: cliente.nome,
                      bold: true,
                      size: 32,
                      color: 'FFFFFF',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 100 },
                  children: [
                    new TextRun({
                      text: `Economize ${formatBRL(economiaMensal)} por mês com sua própria usina solar.`,
                      bold: true,
                      size: 22,
                      color: '22C55E',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: 'Independência energética projetada exclusivamente para você com tecnologia de ponta.',
                      size: 16,
                      color: 'D1FAE5',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 120 },
                  children: [
                    new TextRun({
                      text: `⚡ Potência: ${formatNumBR(potenciaKwp, 2)} kWp   |   📈 Geração: ${formatNumBR(calculos.geracaoMediaMensalKwh, 0)} kWh/mês   |   ⏳ Payback: ${paybackTextoFinal}`,
                      size: 16,
                      color: 'FFFFFF',
                      font: 'Arial',
                      bold: true,
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 120 },
                  border: { top: { style: BorderStyle.SINGLE, size: 6, color: '065F46' } },
                  children: [
                    new TextRun({
                      text: `👤 Consultor: ${repNome}   •   📅 Data: ${dataFormatada}   •   ⏰ Validade: ${validadeEmDias} dias corridos`,
                      size: 15,
                      color: 'A7F3D0',
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

  // Quebra de página após a Capa
  docChildren.push(
    new Paragraph({
      children: [new PageBreak()],
    }),
  )

  // ----------------------------------------------------
  // SEÇÃO: APRESENTAÇÃO INSTITUCIONAL & ENGENHARIA
  // ----------------------------------------------------
  docChildren.push(
    ...createSectionHeader(
      'Apresentação Institucional & Engenharia',
      'Delfos Engenharia Solar — Projetos fotovoltaicos de alta eficiência e homologação completa.',
    ),
  )

  // Card institucional com dados da Delfos Engenharia e Engenheiro Responsável
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
        left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY },
        right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Delfos Engenharia Ltda (Delfos Solar)\n',
                      bold: true,
                      size: 22,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'CNPJ: 21.379.952/0001-38  •  Erechim / RS\n',
                      bold: true,
                      size: 16,
                      color: COLOR_TEXT_DARK,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Responsável Técnico: Eng. João Victor Bagetti Fuchs — CREA RS151894\n',
                      bold: true,
                      size: 16,
                      color: COLOR_ACCENT,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: 'Engenharia própria especializada em projetos fotovoltaicos, homologação e garantia de desempenho. Atuação completa Turnkey com equipe de engenharia habilitada e suporte contínuo.',
                      size: 15,
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

  // Portfólio / Tabela de usinas da galeria
  let usinasGaleria: InstalacaoGaleria[] = []
  try {
    usinasGaleria = (await fetchInstalacoesGaleria()) || []
  } catch (err) {
    console.warn('Erro ao carregar galeria de usinas para o docx:', err)
  }

  const usinasDocx =
    usinasGaleria.length > 0
      ? usinasGaleria.slice(0, 3)
      : [
          {
            id: '1',
            titulo: 'Usina Solar Residencial',
            cidade: 'Erechim / RS',
            potencia_kwp: 10.5,
          },
          {
            id: '2',
            titulo: 'Usina Solar Comercial',
            cidade: 'Passo Fundo / RS',
            potencia_kwp: 35.0,
          },
          {
            id: '3',
            titulo: 'Usina Solar Agropecuária',
            cidade: 'Getúlio Vargas / RS',
            potencia_kwp: 50.0,
          },
        ]

  docChildren.push(
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: 'PORTFÓLIO DE USINAS INSTALADAS',
          bold: true,
          size: 16,
          color: COLOR_PRIMARY,
          font: 'Arial',
        }),
      ],
    }),
  )

  const colWidthGaleria = Math.floor(PAGE_CONTENT_WIDTH / 3)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: usinasDocx.map((u) => {
            const pot = u.potencia_kwp ? `${formatNumBR(Number(u.potencia_kwp), 1)} kWp` : 'Turnkey'
            const cid = u.cidade || 'Erechim / RS'
            const tit = u.titulo || 'Usina Solar Delfos'
            return new TableCell({
              width: { size: colWidthGaleria, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '☀️ ',
                      size: 20,
                    }),
                    new TextRun({
                      text: `${tit}\n`,
                      bold: true,
                      size: 16,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Localização: ${cid}\n`,
                      size: 14,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Potência: ${pot}`,
                      bold: true,
                      size: 15,
                      color: COLOR_ACCENT,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            })
          }),
        }),
      ],
    }),
  )

  // ----------------------------------------------------
  // SEÇÃO 2: SITUAÇÃO ATUAL
  // ----------------------------------------------------
  docChildren.push(
    ...createSectionHeader(
      '2. Situação Atual',
      'Diagnóstico do padrão de consumo e despesas recorrentes pagas à concessionária sem retorno, seguido do comparativo acumulado sem solar.',
    ),
  )

  // 1. Grid Visual em 2 Cards Grandes de Situação Atual (Consumo mensal/anual empilhados e Custo mensal/anual empilhados)
  const colWidth2 = Math.floor(PAGE_CONTENT_WIDTH / 2)
  const consumoKwhMesDocx =
    sistema.consumoKwhMes && sistema.consumoKwhMes > 0
      ? sistema.consumoKwhMes
      : Math.round(contaHoje / 0.95)
  const consumoKwhAnoDocx =
    consumoKwhAnoEstimado > 0 ? consumoKwhAnoEstimado : Math.round(consumoKwhMesDocx * 12)

  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // Card 1 — Consumo de Energia: Mensal em cima e Anual logo abaixo
            new TableCell({
              width: { size: colWidth2, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
              margins: { top: 100, bottom: 100, left: 110, right: 110 },
              children: [
                // Topo do card: Consumo
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: '⚡ CONSUMO DE ENERGIA\n',
                      bold: true,
                      color: '1D4ED8',
                      size: 16,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Volume consumido da concessionária',
                      color: '6B7280',
                      size: 13,
                      font: 'Arial',
                    }),
                  ],
                }),
                // Bloco 1: Consumo Mensal
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: '• Consumo Mensal (Média):\n',
                      bold: true,
                      color: '4B5563',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatNumBR(consumoKwhMesDocx, 0)} `,
                      bold: true,
                      color: '111827',
                      size: 22,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'kWh/mês\n',
                      bold: true,
                      color: '2563EB',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Média mensal de energia consumida da rede',
                      color: '6B7280',
                      size: 13,
                      font: 'Arial',
                    }),
                  ],
                }),
                // Bloco 2: Consumo no Ano (logo abaixo)
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: '• Consumo no Ano (12 meses):\n',
                      bold: true,
                      color: '4B5563',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatNumBR(consumoKwhAnoDocx, 0)} `,
                      bold: true,
                      color: '111827',
                      size: 22,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'kWh/ano\n',
                      bold: true,
                      color: '4F46E5',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Volume total faturado em 12 faturas',
                      color: '6B7280',
                      size: 13,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),

            // Card 2 — Custos com Concessionária: Mensal em cima e Anual logo abaixo
            new TableCell({
              width: { size: colWidth2, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
              margins: { top: 100, bottom: 100, left: 110, right: 110 },
              children: [
                // Topo do card: Custos
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: '💲 CUSTOS COM CONCESSIONÁRIA\n',
                      bold: true,
                      color: 'B91C1C',
                      size: 16,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Desembolso financeiro sem retorno',
                      color: '6B7280',
                      size: 13,
                      font: 'Arial',
                    }),
                  ],
                }),
                // Bloco 1: Custo Mensal (Conta Atual)
                new Paragraph({
                  spacing: { after: 60 },
                  children: [
                    new TextRun({
                      text: '• Custo Mensal (Conta Atual):\n',
                      bold: true,
                      color: '4B5563',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatBRL(contaHoje)}\n`,
                      bold: true,
                      color: COLOR_RED,
                      size: 22,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Despesa média paga todo mês à concessionária',
                      color: '6B7280',
                      size: 13,
                      font: 'Arial',
                    }),
                  ],
                }),
                // Bloco 2: Custo no Ano (logo abaixo)
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: '• Custo no Ano (Gasto Anual):\n',
                      bold: true,
                      color: '4B5563',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatBRL(contaAnualDocx)}\n`,
                      bold: true,
                      color: 'B45309',
                      size: 22,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Total desembolsado em 12 faturas sem retorno',
                      color: '6B7280',
                      size: 13,
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

  docChildren.push(
    new Paragraph({
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: `📈 Gastos Acumulados Sem Solar: 1, ${rotuloPeriodoCardMeio} e 25 Anos`,
          bold: true,
          size: 18,
          color: COLOR_RED,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: 'Total faturado pela concessionária ao longo do tempo considerando o reajuste tarifário histórico da rede elétrica (sem geração própria).',
          size: 15,
          color: COLOR_TEXT_MUTED,
          font: 'Arial',
        }),
      ],
    }),
  )

  const colWidthInercia = Math.floor(PAGE_CONTENT_WIDTH / 3)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // Card 1: 1 Ano
            new TableCell({
              width: { size: colWidthInercia, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FFFBEB' },
              margins: { top: 90, bottom: 90, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'GASTO EM 1 ANO',
                      bold: true,
                      size: 15,
                      color: '78350F',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: 'Curto Prazo (12 faturas)',
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: `${formatBRL(gasto1Ano)}`,
                      bold: true,
                      color: '78350F',
                      size: 24,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `≈ ${formatBRL(Math.round(gasto1Ano / 12))}/mês`,
                      bold: true,
                      size: 14,
                      color: COLOR_TEXT_DARK,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: 'Sem retorno patrimonial',
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),

            // Card 2: Período de Payback Arredondado para Cima (ex: 2 Anos)
            new TableCell({
              width: { size: colWidthInercia, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FFF7ED' },
              margins: { top: 90, bottom: 90, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: tituloCardMeio,
                      bold: true,
                      size: 15,
                      color: '9A3412',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: `Médio Prazo (${totalMesesCardMeio} faturas)`,
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: `${formatBRL(gastoCardMeio)}`,
                      bold: true,
                      color: '9A3412',
                      size: 24,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `≈ ${formatBRL(mediaMensalCardMeio)}/mês`,
                      bold: true,
                      size: 14,
                      color: COLOR_TEXT_DARK,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: 'Supera o valor de uma usina',
                      size: 13,
                      color: 'C2410C',
                      bold: true,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            // Card 3: 25 Anos
            new TableCell({
              width: { size: colWidthInercia, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_RED_BG },
              margins: { top: 90, bottom: 90, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'GASTO EM 25 ANOS',
                      bold: true,
                      size: 15,
                      color: COLOR_RED,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: 'Longo Prazo (300 faturas)',
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: `${formatBRL(gasto25Anos)}`,
                      bold: true,
                      color: COLOR_RED,
                      size: 24,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `≈ ${formatBRL(Math.round(gasto25Anos / 300))}/mês`,
                      bold: true,
                      size: 14,
                      color: COLOR_TEXT_DARK,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: 'Desembolso com inflação da rede',
                      size: 13,
                      color: COLOR_RED,
                      bold: true,
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

  // ----------------------------------------------------
  // SEÇÃO 3: SEU SISTEMA FOTOVOLTAICO
  // ----------------------------------------------------
  docChildren.push(
    ...createSectionHeader(
      '3. Seu Sistema Fotovoltaico',
      'Conheça sua usina solar: equipamentos homologados Tier-1 com engenharia própria Delfos Solar.',
    ),
  )

  const colWidthHalf = Math.floor(PAGE_CONTENT_WIDTH / 2)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: colWidthHalf, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Potência Nominal: ',
                      bold: true,
                      size: 17,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatNumBR(potenciaKwp, 2)} kWp`,
                      bold: true,
                      color: COLOR_PRIMARY,
                      size: 17,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: colWidthHalf, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Geração Média Estimada: ',
                      bold: true,
                      size: 17,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatNumBR(calculos.geracaoMediaMensalKwh, 0)} kWh/mês (${formatBRL(economiaMensal)}/mês)`,
                      bold: true,
                      color: COLOR_ACCENT,
                      size: 17,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: colWidthHalf, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Módulos Fotovoltaicos: ',
                      bold: true,
                      size: 17,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${sistema.numeroPlacas}x ${sistema.marcaPlacas || 'Módulos Tier-1'} (${sistema.potenciaPlacaWp}W bifacial N-type)`,
                      size: 17,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 30 },
                  children: [
                    new TextRun({
                      text: '• Garantia de performance (degradação): ',
                      bold: true,
                      color: '065F46',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${(sistema as any)?.garantias?.paineisAnosDesempenho || (dados as any)?.garantias?.paineisAnosDesempenho || 30} anos`,
                      bold: true,
                      color: '065F46',
                      size: 14,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 20 },
                  children: [
                    new TextRun({
                      text: '• Garantia contra defeitos de fabricação: ',
                      bold: true,
                      color: '92400E',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${(sistema as any)?.garantias?.paineisAnosFabricacao || (dados as any)?.garantias?.paineisAnosFabricacao || 15} anos`,
                      bold: true,
                      color: '92400E',
                      size: 14,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: colWidthHalf, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Inversor Solar: ', bold: true, size: 17, font: 'Arial' }),
                    new TextRun({
                      text: `${sistema.quantidadeInversores}x ${sistema.marcaInversor || 'Inversor Homologado'} com WiFi e telemetria`,
                      size: 17,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 30 },
                  children: [
                    new TextRun({
                      text: '• Garantia do inversor: ',
                      bold: true,
                      color: '0F766E',
                      size: 14,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${(sistema as any)?.garantias?.inversorAnosFabricacao || (dados as any)?.garantias?.inversorAnosFabricacao || 10} anos`,
                      bold: true,
                      color: '0F766E',
                      size: 14,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: colWidthHalf, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Estrutura de Fixação: ',
                      bold: true,
                      size: 17,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: formatarTipoEstrutura(sistema.tipoEstrutura),
                      size: 17,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: colWidthHalf, type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Área Necessária / Orientação: ',
                      bold: true,
                      size: 17,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `~${sistema.areaNecessariaM2} m² • ${formatarOrientacao(sistema.orientacaoTelhado)}`,
                      size: 17,
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

  // Faixa verde de monitoramento 24/7 com smartphone
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: '065F46' },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '📱 MONITORAMENTO INTELIGENTE 24/7 PELO SMARTPHONE (iOS & ANDROID): ',
                      bold: true,
                      size: 16,
                      color: 'FFFFFF',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Acompanhe geração diária, curva solar em kWh e economia acumulada em tempo real direto na tela do seu celular.',
                      size: 15,
                      color: 'D1FAE5',
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

  // ----------------------------------------------------
  // BLOCOS: COMO FUNCIONA O SISTEMA SOLAR (ON-GRID) & MONITORAMENTO INTELIGENTE 24/7
  // Utiliza as ilustrações oficiais da proposta (onGridPngAsset e monitoramentoPngAsset)
  // Fundo #F0FDF4, borda #BBF7D0 e acentos verdes (#16A34A / #166534)
  // ----------------------------------------------------
  const [imgOnGridBytes, imgMonitoramentoBytes] = await Promise.all([
    loadImageUint8Array(onGridPngAsset),
    loadImageUint8Array(monitoramentoPngAsset),
  ])

  const colWidthBlocos = Math.floor(PAGE_CONTENT_WIDTH / 2)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: 'BBF7D0' },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: 'BBF7D0' },
        left: { style: BorderStyle.SINGLE, size: 8, color: 'BBF7D0' },
        right: { style: BorderStyle.SINGLE, size: 8, color: 'BBF7D0' },
        insideVertical: { style: BorderStyle.SINGLE, size: 8, color: 'BBF7D0' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [
        new TableRow({
          children: [
            // Bloco 1: Como Funciona o Sistema Solar (On-Grid)
            new TableCell({
              width: { size: colWidthBlocos, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F0FDF4' },
              margins: { top: 100, bottom: 100, left: 110, right: 110 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '⚡ ENGENHARIA ON-GRID • CONEXÃO À REDE\n',
                      bold: true,
                      size: 13,
                      color: '166534',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Como funciona o sistema solar (On-Grid)\n',
                      bold: true,
                      size: 16,
                      color: '166534',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Módulos solares convertem luz em energia contínua e o inversor transforma em corrente alternada para seu imóvel. O excedente gera créditos no medidor bidirecional.',
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...(imgOnGridBytes
                  ? [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        alignment: AlignmentType.CENTER,
                        children: [
                          new ImageRun({
                            type: 'png',
                            data: imgOnGridBytes,
                            transformation: { width: 230, height: 110 },
                          }),
                        ],
                      }),
                    ]
                  : []),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '✓ Homologação e ART Inclusa • Turnkey Delfos',
                      bold: true,
                      size: 12,
                      color: '166534',
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),

            // Bloco 2: Monitoramento Inteligente 24/7
            new TableCell({
              width: { size: colWidthBlocos, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'F0FDF4' },
              margins: { top: 100, bottom: 100, left: 110, right: 110 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '📱 TELEMETRIA EM TEMPO REAL • APP MOBILE\n',
                      bold: true,
                      size: 13,
                      color: '166534',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Monitoramento Inteligente 24/7\n',
                      bold: true,
                      size: 16,
                      color: '166534',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: 'Acompanhe sua geração diária em tempo real na palma da mão: gráficos em kWh, economia acumulada em reais e histórico completo de performance.',
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                ...(imgMonitoramentoBytes
                  ? [
                      new Paragraph({
                        spacing: { before: 80, after: 60 },
                        alignment: AlignmentType.CENTER,
                        children: [
                          new ImageRun({
                            type: 'png',
                            data: imgMonitoramentoBytes,
                            transformation: { width: 230, height: 110 },
                          }),
                        ],
                      }),
                    ]
                  : []),
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '✓ Suporte e Acesso Vitalício • iOS & Android',
                      bold: true,
                      size: 12,
                      color: '166534',
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

  // ----------------------------------------------------
  // SEÇÃO 4: PROJEÇÃO DE ECONOMIA NA CONTA DE ENERGIA
  // Cards de resumo + Card do Payback abaixo
  // ----------------------------------------------------
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_PRIMARY },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '⚖️ MARCO LEGAL DA GD (LEI 14.300/2022) • FATOR DE SIMULTANEIDADE: ',
                      bold: true,
                      size: 15,
                      color: 'A7F3D0',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${Math.round(projecaoOficial.fatorSimultaneidade * 100)}%`,
                      bold: true,
                      size: 18,
                      color: 'FDE047',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: '4. Projeção de Economia na Conta de Energia (2026–2051)',
                      bold: true,
                      size: 20,
                      color: 'FFFFFF',
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

  // 3 Cards Grandes de Resumo da Projeção de Economia
  const colWidthResumo = Math.floor(PAGE_CONTENT_WIDTH / 3)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // Card 1: Economia Total em 25 Anos
            new TableCell({
              width: { size: colWidthResumo, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'ECFDF5' },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'ECONOMIA TOTAL EM 25 ANOS\n',
                      bold: true,
                      size: 14,
                      color: '065F46',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: formatBRL(projecaoOficial.economiaTotal25Anos),
                      bold: true,
                      size: 20,
                      color: '15803D',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '\nCiclo de 25 anos com degradação',
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            // Card 2: Gasto Total Sem Solar (25 Anos)
            new TableCell({
              width: { size: colWidthResumo, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FEF2F2' },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'GASTO TOTAL SEM SOLAR (25 ANOS)\n',
                      bold: true,
                      size: 14,
                      color: '991B1B',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: formatBRL(projecaoOficial.gastoTotalSemSolar25Anos),
                      bold: true,
                      size: 20,
                      color: 'B91C1C',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '\nDesembolso sem retorno concessionária',
                      size: 13,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            // Card 3: Custo de Postergação
            new TableCell({
              width: { size: colWidthResumo, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FFF7ED' },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'CUSTO DE POSTERGAÇÃO\n',
                      bold: true,
                      size: 14,
                      color: 'C2410C',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatBRL(projecaoOficial.valorPerdidoPorMesPostergacao)} /mês`,
                      bold: true,
                      size: 20,
                      color: 'EA580C',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '\nPerda a cada mês sem energia solar',
                      size: 13,
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

  // Card do Payback Abaixo dos Cards de Resumo
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 12, color: 'F59E0B' },
        bottom: { style: BorderStyle.SINGLE, size: 12, color: 'F59E0B' },
        left: { style: BorderStyle.SINGLE, size: 12, color: 'F59E0B' },
        right: { style: BorderStyle.SINGLE, size: 12, color: 'F59E0B' },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FFFBEB' },
              margins: { top: 120, bottom: 120, left: 140, right: 140 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: '⏱️ TEMPO DE RETORNO DO INVESTIMENTO (PAYBACK): ',
                      bold: true,
                      size: 15,
                      color: '92400E',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: paybackTextoFinal,
                      bold: true,
                      size: 20,
                      color: 'B45309',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: ` (Ano de quitação: ~${anoPayback})`,
                      bold: true,
                      size: 15,
                      color: '78350F',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: 'Tempo necessário para a economia na conta pagar 100% do sistema. A partir daí, toda a geração torna-se patrimônio e lucro líquido.',
                      size: 14,
                      color: '92400E',
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

  // ----------------------------------------------------
  // SEÇÃO 5: PROJEÇÃO DE ECONOMIA EM 25 ANOS
  // ----------------------------------------------------
  docChildren.push(
    ...createSectionHeader(
      '5. Projeção de Economia em 25 Anos',
      'Curva de retorno patrimonial: multiplicação do capital, tempo de retorno e eliminação do gasto tarifário.',
    ),
  )

  const colWidthMetricas = Math.floor(PAGE_CONTENT_WIDTH / 3)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: colWidthMetricas, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'ECONOMIA EM 1 ANO\n',
                      bold: true,
                      size: 15,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: formatBRL(eco1Ano),
                      bold: true,
                      size: 22,
                      color: COLOR_ACCENT,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '\nPrimeiro ano de geração',
                      size: 14,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: colWidthMetricas, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'ECONOMIA EM 5 ANOS\n',
                      bold: true,
                      size: 15,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: formatBRL(eco5Anos),
                      bold: true,
                      size: 22,
                      color: 'B45309',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '\nConsolidação em 5 anos',
                      size: 14,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: colWidthMetricas, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'ECONOMIA EM 25 ANOS\n',
                      bold: true,
                      size: 15,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: formatBRL(eco25Anos),
                      bold: true,
                      size: 22,
                      color: '1E40AF',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '\nTotal poupado na vida útil',
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

  // ----------------------------------------------------
  // SEÇÃO 6: INVESTIMENTO E CONDIÇÕES DE PAGAMENTO (LAYOUT 4 CARDS)
  // ----------------------------------------------------
  docChildren.push(
    ...createSectionHeader(
      '6. Investimento e Condições de Pagamento',
      'Valores transparentes no modelo Turnkey (chave na mão) com homologação completa inclusa.',
    ),
  )

  // Banner do Investimento Total com fundo escuro/esmeralda e valor dourado
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
        left: { style: BorderStyle.SINGLE, size: 24, color: COLOR_PRIMARY },
        right: { style: BorderStyle.SINGLE, size: 8, color: COLOR_ACCENT },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: '064E3B' },
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'INVESTIMENTO TOTAL TURNKEY (SISTEMA COMPLETO): ',
                      bold: true,
                      size: 17,
                      color: 'A7F3D0',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: formatBRL(investimentoTotal),
                      bold: true,
                      size: 28,
                      color: 'FDE047',
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: 'Investimento único — o sistema é seu. Equipamentos Tier-1, projeto, ART, instalação e homologação inclusos.',
                      size: 15,
                      color: 'D1FAE5',
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

  // Grade 4 modalidades de pagamento com destaques estilizados idênticos ao React
  const colWidthPgto = Math.floor(PAGE_CONTENT_WIDTH / 4)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            // À Vista (Destaque Verde)
            new TableCell({
              width: { size: colWidthPgto, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'ECFDF5' },
              borders: {
                top: { style: BorderStyle.SINGLE, size: 16, color: '16A34A' },
                bottom: { style: BorderStyle.SINGLE, size: 16, color: '16A34A' },
                left: { style: BorderStyle.SINGLE, size: 16, color: '16A34A' },
                right: { style: BorderStyle.SINGLE, size: 16, color: '16A34A' },
              },
              margins: { top: 90, bottom: 90, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '[MELHOR CONDIÇÃO]\n',
                      bold: true,
                      size: 13,
                      color: '16A34A',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '💵 À VISTA\n',
                      bold: true,
                      size: 15,
                      color: '065F46',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${formatBRL(aVistaValor)}\n`,
                      bold: true,
                      size: 18,
                      color: '15803D',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Desconto de ${formatBRL(aVistaDesconto)}`,
                      size: 13,
                      color: '166534',
                      font: 'Arial',
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            // Cartão
            new TableCell({
              width: { size: colWidthPgto, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'EFF6FF' },
              margins: { top: 90, bottom: 90, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '[SEM BUROCRACIA]\n',
                      bold: true,
                      size: 13,
                      color: '2563EB',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: '💳 CARTÃO\n',
                      bold: true,
                      size: 15,
                      color: '1E40AF',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${cartaoParcelas}x ${formatBRL(cartaoValor)}\n`,
                      bold: true,
                      size: 17,
                      color: '1E3A8A',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Fatura c/ solar + parcela: ${formatBRL((parcelamentos?.cartao18x?.contaComSolar !== undefined ? parcelamentos.cartao18x.contaComSolar : 70) + cartaoValor)}/mês\n`,
                      size: 12,
                      bold: true,
                      color: '1E40AF',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Custo atual: ${formatBRL(contaHoje)}/mês`,
                      size: 12,
                      color: 'DC2626',
                      font: 'Arial',
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            // Financiamento A (Menor Parcela)
            new TableCell({
              width: { size: colWidthPgto, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FFFBEB' },
              margins: { top: 90, bottom: 90, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '[MENOR PARCELA]\n',
                      bold: true,
                      size: 13,
                      color: 'D97706',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `🏦 ${finanANome.toUpperCase()}\n`,
                      bold: true,
                      size: 15,
                      color: '92400E',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${finanAParcelas}x ${formatBRL(finanAValor)}\n`,
                      bold: true,
                      size: 17,
                      color: '78350F',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Entrada: ${formatBRL(finanAEntrada)}\n`,
                      size: 12,
                      color: 'B45309',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Fatura c/ solar + parcela: ${formatBRL((parcelamentos?.financiamentoBanco1?.contaComSolar !== undefined ? parcelamentos.financiamentoBanco1.contaComSolar : 70) + finanAValor)}/mês\n`,
                      size: 12,
                      bold: true,
                      color: '92400E',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Custo atual: ${formatBRL(contaHoje)}/mês`,
                      size: 12,
                      color: 'DC2626',
                      font: 'Arial',
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            // Financiamento B (Maior Prazo)
            new TableCell({
              width: { size: colWidthPgto, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: 'FAF5FF' },
              margins: { top: 90, bottom: 90, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: '[MAIOR PRAZO]\n',
                      bold: true,
                      size: 13,
                      color: '9333EA',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `⏳ ${finanBNome.toUpperCase()}\n`,
                      bold: true,
                      size: 15,
                      color: '6B21A8',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `${finanBParcelas}x ${formatBRL(finanBValor)}\n`,
                      bold: true,
                      size: 17,
                      color: '581C87',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Entrada: ${formatBRL(finanBEntrada)}\n`,
                      size: 12,
                      color: '7E22CE',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Fatura c/ solar + parcela: ${formatBRL((parcelamentos?.financiamentoBanco2?.contaComSolar !== undefined ? parcelamentos.financiamentoBanco2.contaComSolar : 70) + finanBValor)}/mês\n`,
                      size: 12,
                      bold: true,
                      color: '6B21A8',
                      font: 'Arial',
                    }),
                    new TextRun({
                      text: `Custo atual: ${formatBRL(contaHoje)}/mês`,
                      size: 12,
                      color: 'DC2626',
                      font: 'Arial',
                      bold: true,
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

  // Linha reflexiva de troca de despesa por patrimônio
  const menorParcela = Math.min(
    finanAValor > 0 ? finanAValor : Infinity,
    finanBValor > 0 ? finanBValor : Infinity,
  )
  const parcelaComp = menorParcela !== Infinity ? menorParcela : finanBValor

  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_LIGHT_BG },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Hoje você paga ${formatBRL(contaHoje)} de energia para a concessionária. Com solar, sua parcela de financiamento é ${formatBRL(parcelaComp)} — troque despesa por patrimônio!`,
                      bold: true,
                      size: 16,
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

  if (dados.observacoes) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 100 },
        children: [
          new TextRun({ text: 'Observações Comerciais: ', bold: true, size: 16, font: 'Arial' }),
          new TextRun({
            text: dados.observacoes,
            size: 16,
            font: 'Arial',
            color: COLOR_TEXT_MUTED,
          }),
        ],
      }),
    )
  }

  // Bloco de Assinaturas & Aprovação
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
    description: 'Proposta técnico-comercial oficial de 6 seções gerada pelo CRM Delfos Solar',
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

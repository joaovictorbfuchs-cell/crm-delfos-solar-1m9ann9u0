/**
 * Gerador de Documentos Operacionais e Regulatórios de Energia Solar Delfos:
 * - Procuração para Homologação junto à Concessionária
 * - Contrato de Prestação de Serviços e Fornecimento de Sistema Fotovoltaico
 * - Anexo E: Formulário de Solicitação de Acesso / Parecer (Microgeração Distribuída)
 * - Anexo F: Termo de Responsabilidade Técnica e Dados do Ponto de Conexão
 * - Anexo G: Termo de Adesão ao Sistema de Compensação de Energia Elétrica
 * - Troca de Titularidade: Termo de Solicitação de Troca de Titularidade da UC
 */

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
} from 'docx'
import { DADOS_EMPRESA_DELFOS_SOLAR } from '@/lib/propostaSolarGenerator'

export type TipoDocumentoProjeto =
  | 'procuracao'
  | 'contrato'
  | 'anexo_e'
  | 'anexo_f'
  | 'anexo_g'
  | 'troca_titularidade'

export interface DadosDocumentoProjetoInput {
  tipo: TipoDocumentoProjeto
  clienteNome: string
  clienteCpfCnpj: string
  clienteEndereco: string
  clienteTelefone: string
  clienteEmail: string
  // Dados do Titular (quando aplicável)
  titularNome?: string
  titularCpf?: string
  titularTelefone?: string
  titularEmail?: string
  numeroUC?: string
  concessionaria?: string
  // Dados Técnicos do Sistema
  potenciaKwp: number
  quantidadeModulos: number
  marcaModeloModulos: string
  marcaModeloInversor: string
  potenciaInversorKw: number
  // Dados Comerciais
  valorTotal: number
  condicoesPagamento?: string
  dataDocumento?: string
  cidade?: string
  // Dados específicos pós-venda (se aplicável)
  ucDestino?: string
  percentualRateio?: string
  novoTitularNome?: string
  novoTitularCpf?: string
}

export const TITULOS_DOCUMENTOS: Record<TipoDocumentoProjeto, string> = {
  procuracao: 'PROCURAÇÃO ESPECÍFICA — HOMOLOGAÇÃO DE ENERGIA SOLAR',
  contrato: 'CONTRATO DE FORNECIMENTO E INSTALAÇÃO DE SISTEMA FOTOVOLTAICO',
  anexo_e: 'ANEXO E — SOLICITAÇÃO DE ACESSO PARA MICROGERAÇÃO DISTRIBUÍDA',
  anexo_f: 'ANEXO F — TERMO DE RESPONSABILIDADE TÉCNICA E DADOS DA CONEXÃO',
  anexo_g: 'ANEXO G — ADESÃO AO SISTEMA DE COMPENSAÇÃO DE ENERGIA (CRÉDITOS)',
  troca_titularidade: 'TERMO DE SOLICITAÇÃO DE TROCA DE TITULARIDADE DA UNIDADE CONSUMIDORA',
}

const COLOR_PRIMARY = '166534' // Verde Delfos (#166534)
const COLOR_ACCENT = '16A34A'
const COLOR_LIGHT_BG = 'F0FDF4'
const COLOR_GRAY_BG = 'F9FAFB'
const COLOR_BORDER = 'D1D5DB'
const COLOR_TEXT_DARK = '111827'
const COLOR_TEXT_MUTED = '4B5563'
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

function pHeader(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    children: [
      new TextRun({
        text: '■ ',
        color: COLOR_ACCENT,
        size: 22,
        bold: true,
      }),
      new TextRun({
        text: title.toUpperCase(),
        bold: true,
        size: 20,
        color: COLOR_PRIMARY,
        font: 'Arial',
      }),
    ],
  })
}

function pBody(text: string, options?: { bold?: boolean; spacingAfter?: number }): Paragraph {
  return new Paragraph({
    spacing: { before: 40, after: options?.spacingAfter ?? 80 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        size: 20, // 10pt
        font: 'Arial',
        bold: options?.bold,
        color: COLOR_TEXT_DARK,
      }),
    ],
  })
}

function pLabelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    spacing: { before: 30, after: 40 },
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 19,
        font: 'Arial',
        color: COLOR_PRIMARY,
      }),
      new TextRun({ text: value || '—', size: 19, font: 'Arial', color: COLOR_TEXT_DARK }),
    ],
  })
}

export async function gerarDocumentoProjetoDocx(
  dados: DadosDocumentoProjetoInput,
): Promise<Document> {
  const dataHoje = formatDateBR(dados.dataDocumento)
  const cidade = dados.cidade || 'Erechim - RS'
  const concessionaria = dados.concessionaria || 'RGE (Rio Grande Energia)'
  const uc = dados.numeroUC || '4091823719'

  const titularEfetivoNome = dados.titularNome || dados.clienteNome
  const titularEfetivoCpf = dados.titularCpf || dados.clienteCpfCnpj
  const titularEfetivoTelefone = dados.titularTelefone || dados.clienteTelefone
  const titularEfetivoEmail = dados.titularEmail || dados.clienteEmail

  const headerChildren = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: 'DELFOS ENERGIA SOLAR',
          bold: true,
          size: 20,
          color: COLOR_PRIMARY,
          font: 'Arial',
        }),
        new TextRun({
          text: ` — ${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial} | CNPJ: ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}`,
          size: 15,
          color: COLOR_TEXT_MUTED,
          font: 'Arial',
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 60, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 10, color: COLOR_ACCENT },
      },
      children: [],
    }),
  ]

  const footerChildren = [
    new Paragraph({
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: COLOR_BORDER },
      },
      spacing: { before: 80, after: 40 },
      children: [
        new TextRun({
          text: `${DADOS_EMPRESA_DELFOS_SOLAR.nomeFantasia} • CREA Responsável: ${DADOS_EMPRESA_DELFOS_SOLAR.crea} • ${DADOS_EMPRESA_DELFOS_SOLAR.telefone} • ${DADOS_EMPRESA_DELFOS_SOLAR.site}`,
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

  const docChildren: (Paragraph | Table)[] = []

  // Banner Header
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
              margins: { top: 120, bottom: 120, left: 160, right: 160 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: TITULOS_DOCUMENTOS[dados.tipo],
                      bold: true,
                      size: 22,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 40 },
                  children: [
                    new TextRun({
                      text: `Documento gerado em ${dataHoje} • Concessionária: ${concessionaria} • UC: ${uc}`,
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

  // 1. DADOS DAS PARTES E UNIDADE CONSUMIDORA
  docChildren.push(pHeader('1. Qualificação das Partes e Unidade Consumidora'))

  const colWidth = Math.floor(PAGE_CONTENT_WIDTH / 2)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: colWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'CLIENTE CONTRATANTE',
                      bold: true,
                      size: 18,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                pLabelValue('Nome / Razão Social', dados.clienteNome),
                pLabelValue('CPF / CNPJ', dados.clienteCpfCnpj),
                pLabelValue('Endereço', dados.clienteEndereco),
                pLabelValue('Telefone', dados.clienteTelefone),
                pLabelValue('Email', dados.clienteEmail),
              ],
            }),
            new TableCell({
              width: { size: colWidth, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: COLOR_GRAY_BG },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'TITULAR DA CONTA DE ENERGIA (UC)',
                      bold: true,
                      size: 18,
                      color: COLOR_PRIMARY,
                      font: 'Arial',
                    }),
                  ],
                }),
                pLabelValue('Nome do Titular', titularEfetivoNome),
                pLabelValue('CPF do Titular', titularEfetivoCpf),
                pLabelValue('Telefone', titularEfetivoTelefone),
                pLabelValue('Email', titularEfetivoEmail),
                pLabelValue('Nº da UC', uc),
                pLabelValue('Concessionária', concessionaria),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // 2. ESPECIFICAÇÕES TÉCNICAS E COMERCIAIS
  docChildren.push(pHeader('2. Especificações do Sistema Solar e Valores'))

  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderDefault,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
              margins: { top: 100, bottom: 100, left: 120, right: 120 },
              children: [
                pLabelValue(
                  'Potência do Gerador Fotovoltaico',
                  `${dados.potenciaKwp.toFixed(2)} kWp`,
                ),
                pLabelValue(
                  'Módulos Fotovoltaicos',
                  `${dados.quantidadeModulos}x módulos ${dados.marcaModeloModulos || 'Tier-1 Mono PERC'}`,
                ),
                pLabelValue(
                  'Inversor / Microinversores',
                  `${dados.marcaModeloInversor || 'Inversor Solar On-Grid'} (${dados.potenciaInversorKw || dados.potenciaKwp} kW)`,
                ),
                pLabelValue('Valor Total do Investimento', formatBRL(dados.valorTotal)),
                pLabelValue(
                  'Condições Comerciais',
                  dados.condicoesPagamento ||
                    'Conforme proposta aprovada (à vista com sinal + saldo na entrega/homologação ou financiamento bancário).',
                ),
              ],
            }),
          ],
        }),
      ],
    }),
  )

  // 3. CONTEÚDO ESPECÍFICO DE ACORDO COM O TIPO
  if (dados.tipo === 'procuracao') {
    docChildren.push(pHeader('3. Instrumento Particular de Procuração'))
    docChildren.push(
      pBody(
        `OUTORGANTE: ${titularEfetivoNome}, brasileiro(a), inscrito(a) no CPF nº ${titularEfetivoCpf}, residente e domiciliado(a) no endereço ${dados.clienteEndereco}, titular da Unidade Consumidora nº ${uc} junto à concessionária ${concessionaria}.`,
      ),
    )
    docChildren.push(
      pBody(
        `OUTORGADA: ${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ sob nº ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}, com sede em ${DADOS_EMPRESA_DELFOS_SOLAR.endereco}, representada neste ato por seus engenheiros e responsáveis técnicos credenciados no CREA/RS sob nº ${DADOS_EMPRESA_DELFOS_SOLAR.crea}.`,
      ),
    )
    docChildren.push(
      pBody(
        `PODERES: Pelo presente instrumento, o(a) OUTORGANTE confere à OUTORGADA amplos e específicos poderes para representá-lo(a) perante a referida Concessionária de Distribuição de Energia Elétrica (${concessionaria}), com o exclusivo objetivo de instruir, protocolar, acompanhar, solicitar vistoria, aprovar projetos elétricos, assinar termos de adesão e homologação do Sistema de Microgeração Distribuída Fotovoltaica com potência de ${dados.potenciaKwp.toFixed(2)} kWp para a Unidade Consumidora nº ${uc}, podendo juntar e desentranhar documentos, requerer certidões, interpor recursos e praticar todos os atos estritamente necessários ao fiel cumprimento deste mandato.`,
      ),
    )
    docChildren.push(
      pBody(
        `VALIDADE: Esta procuração possui validade pelo prazo de 12 (doze) meses a contar de sua assinatura ou até a efetiva homologação e troca do medidor bidirecional pela concessionária.`,
      ),
    )
  } else if (dados.tipo === 'contrato') {
    docChildren.push(pHeader('3. Cláusulas Contratuais do Fornecimento e Instalação'))
    docChildren.push(
      pBody(
        `CLÁUSULA PRIMEIRA — DO OBJETO: O presente contrato tem por objeto o fornecimento, projeto executivo de engenharia, montagem mecânica, comissionamento elétrico e acompanhamento do processo de homologação de um Sistema Gerador Fotovoltaico de ${dados.potenciaKwp.toFixed(2)} kWp junto à concessionária ${concessionaria}, a ser instalado no imóvel localizado em ${dados.clienteEndereco}.`,
      ),
    )
    docChildren.push(
      pBody(
        `CLÁUSULA SEGUNDA — DAS ESPECIFICAÇÕES DOS EQUIPAMENTOS: O sistema é composto por ${dados.quantidadeModulos} módulos fotovoltaicos (${dados.marcaModeloModulos}), 01 inversor de frequência compatível (${dados.marcaModeloInversor}), estruturas de suporte em alumínio, cabos solares com proteção UV e string box de proteção CC/CA conforme normas NBR 5410 e NBR 16690.`,
      ),
    )
    docChildren.push(
      pBody(
        `CLÁUSULA TERCEIRA — DO VALOR E FORMA DE PAGAMENTO: Pela aquisição e implantação do sistema, o CONTRATANTE pagará à CONTRATADA o montante global de ${formatBRL(dados.valorTotal)}, segundo as condições de pagamento pactuadas: ${dados.condicoesPagamento || 'Entrada contratual e saldo na homologação/entrega técnica'}.`,
      ),
    )
    docChildren.push(
      pBody(
        `CLÁUSULA QUARTA — DOS PRAZOS: O prazo estimado para entrega de materiais é de até 30 (trinta) dias após a confirmação do pagamento inicial, e a instalação em até 10 (dez) dias úteis após a chegada dos módulos e inversores ao local da obra.`,
      ),
    )
    docChildren.push(
      pBody(
        `CLÁUSULA QUINTA — DAS GARANTIAS: A CONTRATADA oferece garantia técnica de instalação de 12 (doze) meses, sem prejuízo das garantias de fábrica dos componentes: 10 a 12 anos para inversores, 12 a 15 anos para defeitos de fabricação dos painéis solares e 25 anos de eficiência linear de geração (mínimo 80%).`,
      ),
    )
    docChildren.push(
      pBody(
        `CLÁUSULA SEXTA — DO FORO: Fica eleito o Foro da Comarca de Erechim/RS para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro.`,
      ),
    )
  } else if (dados.tipo === 'anexo_e') {
    docChildren.push(pHeader('3. Formulação do Anexo E — Solicitação de Acesso Microgeração'))
    docChildren.push(
      pBody(
        `1. DADOS DA SOLICITAÇÃO: Solicitação de parecer de acesso para microgeração distribuída conectada em baixa tensão, enquadrada na Resolução Normativa ANEEL nº 1.000/2021 e Lei 14.300/2022. Concessionária: ${concessionaria}.`,
      ),
    )
    docChildren.push(
      pBody(
        `2. UNIDADE CONSUMIDORA: UC nº ${uc} | Titular: ${titularEfetivoNome} | CPF: ${titularEfetivoCpf} | Endereço: ${dados.clienteEndereco}. Tipo de Conexão: Bifásica/Trifásica com disjuntor compatível.`,
      ),
    )
    docChildren.push(
      pBody(
        `3. GERADOR SOLAR FOTOVOLTAICO: Potência Total dos Módulos: ${dados.potenciaKwp.toFixed(2)} kWp | Potência Nominal do Inversor: ${dados.potenciaInversorKw || dados.potenciaKwp} kW. Tensão de Atendimento: 220V/380V. Frequência nominal: 60 Hz.`,
      ),
    )
    docChildren.push(
      pBody(
        `4. RESPONSÁVEL TÉCNICO PELO PROJETO: ${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} | CREA: ${DADOS_EMPRESA_DELFOS_SOLAR.crea} | ART de Projeto e Execução devidamente recolhida junto ao CREA/RS.`,
      ),
    )
  } else if (dados.tipo === 'anexo_f') {
    docChildren.push(pHeader('3. Formulação do Anexo F — Termo de Responsabilidade Técnica'))
    docChildren.push(
      pBody(
        `DECLARAÇÃO DO RESPONSÁVEL TÉCNICO: Declaramos, sob as penas da lei e em cumprimento aos padrões técnicos da concessionária ${concessionaria} e da ANEEL, que as instalações elétricas internas e o sistema fotovoltaico de ${dados.potenciaKwp.toFixed(2)} kWp referente à UC nº ${uc} foram projetados e executados em estrita observância às normas ABNT NBR 5410, NBR 16690 e NBR IEC 62116.`,
      ),
    )
    docChildren.push(
      pBody(
        `PROTEÇÃO ANTI-ILHAMENTO: Certificamos que o inversor instalado possui proteção ativa anti-ilhamento, desconectando automaticamente o gerador da rede em caso de falta de energia no alimentador da distribuidora, garantindo segurança total dos operadores e técnicos da concessionária.`,
      ),
    )
    docChildren.push(
      pBody(
        `PONTO DE ENTREGA: O padrão de entrada e a caixa de medição atendem integralmente ao Regulamento de Instalações Consumidoras da Concessionária, estando aptos para o recebimento do medidor eletrônico bidirecional.`,
      ),
    )
  } else if (dados.tipo === 'anexo_g') {
    docChildren.push(pHeader('3. Anexo G — Termo de Adesão ao Sistema de Compensação (SCEE)'))
    docChildren.push(
      pBody(
        `TERMO DE COMPENSAÇÃO DE ENERGIA: Pelo presente termo, o(a) titular ${titularEfetivoNome} (CPF ${titularEfetivoCpf}), da UC Geradora nº ${uc}, solicita formalmente a adesão ao Sistema de Compensação de Energia Elétrica (SCEE), nos termos da Lei 14.300/2022 e Resoluções ANEEL vigentes.`,
      ),
    )
    docChildren.push(
      pBody(
        `MODALIDADE DE COMPENSAÇÃO: Microgeração Distribuída na própria unidade consumidora / Autoconsumo remoto com transferência de excedentes para as unidades beneficiárias cadastradas junto à ${concessionaria}.`,
      ),
    )
    docChildren.push(
      pBody(
        `UNIDADE CONSUMIDORA BENEFICIÁRIA INDICADA: UC Destino: ${dados.ucDestino || 'Conforme cadastro de beneficiárias'} | Percentual de Rateio do Excedente: ${dados.percentualRateio || '100%'} da energia injetada excedente após o consumo da UC geradora.`,
      ),
    )
  } else if (dados.tipo === 'troca_titularidade') {
    docChildren.push(pHeader('3. Solicitação de Troca de Titularidade da UC'))
    docChildren.push(
      pBody(
        `SOLICITAÇÃO DE ALTERAÇÃO CADASTRAL: Solicita-se à concessionária ${concessionaria} a alteração da responsabilidade e titularidade da Unidade Consumidora nº ${uc}, situada em ${dados.clienteEndereco}.`,
      ),
    )
    docChildren.push(
      pBody(
        `TITULAR ATUAL: ${dados.titularNome || dados.clienteNome} | CPF/CNPJ: ${dados.titularCpf || dados.clienteCpfCnpj}.`,
      ),
    )
    docChildren.push(
      pBody(
        `NOVO TITULAR SOLICITADO: ${dados.novoTitularNome || dados.clienteNome} | CPF/CNPJ: ${dados.novoTitularCpf || dados.clienteCpfCnpj} | Telefone: ${titularEfetivoTelefone} | Email: ${titularEfetivoEmail}.`,
      ),
    )
    docChildren.push(
      pBody(
        `MOTIVAÇÃO: Regularização para fins de homologação e enquadramento de usina solar fotovoltaica de ${dados.potenciaKwp.toFixed(2)} kWp vinculada à nova pessoa física/jurídica responsável pelo ponto de medição.`,
      ),
    )
  }

  // 4. ESPAÇO PARA ASSINATURAS
  docChildren.push(pHeader('4. Local, Data e Assinaturas'))
  docChildren.push(pBody(`${cidade}, ${dataHoje}.`, { bold: true, spacingAfter: 200 }))

  const sigColWidth = Math.floor(PAGE_CONTENT_WIDTH / 2)
  docChildren.push(
    new Table({
      width: { size: PAGE_CONTENT_WIDTH, type: WidthType.DXA },
      borders: tableBorderNone,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: sigColWidth, type: WidthType.DXA },
              borders: tableBorderNone,
              margins: { top: 180, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_TEXT_DARK },
                  },
                  children: [],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: titularEfetivoNome.toUpperCase(),
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `CPF: ${titularEfetivoCpf}`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'Titular / Responsável pela UC',
                      size: 15,
                      font: 'Arial',
                      color: COLOR_PRIMARY,
                      bold: true,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: sigColWidth, type: WidthType.DXA },
              borders: tableBorderNone,
              margins: { top: 180, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: {
                    bottom: { style: BorderStyle.SINGLE, size: 8, color: COLOR_TEXT_DARK },
                  },
                  children: [],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 60 },
                  children: [
                    new TextRun({
                      text: DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico.toUpperCase(),
                      bold: true,
                      size: 18,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: `CREA/RS: ${DADOS_EMPRESA_DELFOS_SOLAR.crea}`,
                      size: 16,
                      color: COLOR_TEXT_MUTED,
                      font: 'Arial',
                    }),
                  ],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'DELFOS ENERGIA SOLAR — Responsável Técnico',
                      size: 15,
                      font: 'Arial',
                      color: COLOR_PRIMARY,
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

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 },
          },
        },
        headers: {
          default: new Header({ children: headerChildren }),
        },
        footers: {
          default: new Footer({ children: footerChildren }),
        },
        children: docChildren,
      },
    ],
  })
}

export async function baixarDocumentoProjetoDocx(dados: DadosDocumentoProjetoInput): Promise<void> {
  const doc = await gerarDocumentoProjetoDocx(dados)
  const blob = await Packer.toBlob(doc)
  const safeClient = dados.clienteNome.replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `Delfos_${dados.tipo.toUpperCase()}_${safeClient}.docx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Gera versão HTML completa e pronta para impressão ou exportação em PDF pelo navegador.
 */
export function gerarHTMLDocumentoProjeto(dados: DadosDocumentoProjetoInput): string {
  const dataHoje = formatDateBR(dados.dataDocumento)
  const titularEfetivoNome = dados.titularNome || dados.clienteNome
  const titularEfetivoCpf = dados.titularCpf || dados.clienteCpfCnpj
  const titularEfetivoTelefone = dados.titularTelefone || dados.clienteTelefone
  const titularEfetivoEmail = dados.titularEmail || dados.clienteEmail
  const uc = dados.numeroUC || '4091823719'
  const concessionaria = dados.concessionaria || 'RGE (Rio Grande Energia)'
  const titulo = TITULOS_DOCUMENTOS[dados.tipo]

  let conteudoEspecifico = ''
  if (dados.tipo === 'procuracao') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Instrumento Particular de Procuração</h3>
        <p><strong>OUTORGANTE:</strong> ${titularEfetivoNome}, portador(a) do CPF nº ${titularEfetivoCpf}, residente e domiciliado(a) no endereço ${dados.clienteEndereco}, titular da Unidade Consumidora nº ${uc} junto à concessionária ${concessionaria}.</p>
        <p><strong>OUTORGADA:</strong> ${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial}, CNPJ nº ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}, com sede em ${DADOS_EMPRESA_DELFOS_SOLAR.endereco}, representada neste ato por seus engenheiros e técnicos habilitados (CREA/RS ${DADOS_EMPRESA_DELFOS_SOLAR.crea}).</p>
        <p><strong>PODERES:</strong> Confere plenos poderes para requerer parecer de acesso, protocolar documentos, solicitar vistorias, aprovar projetos elétricos e assinar todos os formulários e termos de adesão da Microgeração Distribuída de ${dados.potenciaKwp.toFixed(2)} kWp para a UC nº ${uc}.</p>
        <p><strong>VALIDADE:</strong> 12 (doze) meses a contar desta data ou até a efetiva ligação do medidor bidirecional.</p>
      </div>
    `
  } else if (dados.tipo === 'contrato') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Cláusulas Principais de Fornecimento e Instalação</h3>
        <p><strong>CLÁUSULA 1ª — OBJETO:</strong> Fornecimento de equipamentos, montagem mecânica, ligação elétrica e homologação de sistema fotovoltaico com potência de ${dados.potenciaKwp.toFixed(2)} kWp.</p>
        <p><strong>CLÁUSULA 2ª — EQUIPAMENTOS:</strong> ${dados.quantidadeModulos} módulos fotovoltaicos (${dados.marcaModeloModulos || 'Mono PERC'}), inversor solar (${dados.marcaModeloInversor || 'On-Grid'}), cabeamento solar e proteções elétricas.</p>
        <p><strong>CLÁUSULA 3ª — INVESTIMENTO:</strong> ${formatBRL(dados.valorTotal)}, nas condições aprovadas: ${dados.condicoesPagamento || 'Entrada e saldo conforme medição/homologação'}.</p>
        <p><strong>CLÁUSULA 4ª — GARANTIAS:</strong> 12 meses para serviços de instalação; 10 a 12 anos para inversor e 25 anos de performance para os módulos solares.</p>
      </div>
    `
  } else if (dados.tipo === 'anexo_e') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Formulação do Anexo E — Solicitação de Acesso Microgeração</h3>
        <p><strong>Normativa:</strong> Resolução Normativa ANEEL nº 1.000/2021 e Lei 14.300/2022 junto à ${concessionaria}.</p>
        <p><strong>Dados Técnicos:</strong> Potência dos Módulos: ${dados.potenciaKwp.toFixed(2)} kWp | Inversor Nominal: ${dados.potenciaInversorKw || dados.potenciaKwp} kW. Conexão em Baixa Tensão na UC nº ${uc}.</p>
        <p><strong>Responsável Técnico:</strong> ${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} (CREA/RS: ${DADOS_EMPRESA_DELFOS_SOLAR.crea}).</p>
      </div>
    `
  } else if (dados.tipo === 'anexo_f') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Formulação do Anexo F — Termo de Responsabilidade Técnica</h3>
        <p>Declaração formal de conformidade com as normas ABNT NBR 5410, NBR 16690 e normas técnicas da concessionária ${concessionaria}.</p>
        <p>Proteção anti-ilhamento ativa com desligamento automático em caso de falta de rede da distribuidora.</p>
        <p>Padrão de entrada adequado para recebimento de medidor bidirecional.</p>
      </div>
    `
  } else if (dados.tipo === 'anexo_g') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Formulação do Anexo G — Adesão ao Sistema de Compensação</h3>
        <p>Termo de adesão ao SCEE (Sistema de Compensação de Energia Elétrica) da UC Geradora ${uc}.</p>
        <p>Compensação de excedentes de geração para a unidade beneficiária nº ${dados.ucDestino || 'Indicada pelo cliente'} com percentual de rateio de ${dados.percentualRateio || '100%'}.</p>
      </div>
    `
  } else if (dados.tipo === 'troca_titularidade') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Solicitação de Troca de Titularidade da UC</h3>
        <p>Solicitação expressa de transferência de responsabilidade da Unidade Consumidora nº ${uc} perante a ${concessionaria}.</p>
        <p><strong>Titular Anterior:</strong> ${dados.titularNome || dados.clienteNome} (CPF: ${dados.titularCpf || dados.clienteCpfCnpj})</p>
        <p><strong>Novo Titular:</strong> ${dados.novoTitularNome || dados.clienteNome} (CPF: ${dados.novoTitularCpf || dados.clienteCpfCnpj})</p>
      </div>
    `
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo} — ${dados.clienteNome}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.5; font-size: 13px; margin: 0; padding: 20px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 18px; font-weight: bold; color: #166534; }
    .brand-sub { font-size: 11px; color: #6b7280; }
    .banner { background: #f0fdf4; border-left: 6px solid #166534; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 6px; margin-bottom: 18px; }
    .banner h1 { margin: 0 0 6px 0; font-size: 17px; color: #166534; text-transform: uppercase; }
    .banner p { margin: 0; font-size: 12px; color: #4b5563; }
    .grid-duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; }
    .card h4 { margin: 0 0 8px 0; font-size: 13px; color: #166534; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .card p { margin: 4px 0; font-size: 12px; }
    .secao { margin-bottom: 16px; }
    .secao h3 { font-size: 14px; color: #166534; border-left: 4px solid #16a34a; padding-left: 8px; margin: 14px 0 8px 0; }
    .secao p { font-size: 12.5px; text-align: justify; margin: 6px 0; }
    .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
    .linha-assinatura { border-top: 1px solid #111827; text-align: center; padding-top: 6px; }
    .linha-assinatura strong { display: block; font-size: 12px; }
    .linha-assinatura span { font-size: 11px; color: #4b5563; }
    .btn-print { position: fixed; top: 15px; right: 15px; background: #166534; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    @media print { .btn-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>

  <div class="header">
    <div>
      <div class="brand">DELFOS ENERGIA SOLAR</div>
      <div class="brand-sub">${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial} | CNPJ: ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #6b7280;">
      Resp. Técnico: ${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} (CREA ${DADOS_EMPRESA_DELFOS_SOLAR.crea})<br>
      ${DADOS_EMPRESA_DELFOS_SOLAR.telefone} • ${DADOS_EMPRESA_DELFOS_SOLAR.site}
    </div>
  </div>

  <div class="banner">
    <h1>${titulo}</h1>
    <p>Emissão: ${dataHoje} &bull; Concessionária: ${concessionaria} &bull; Unidade Consumidora (UC): ${uc}</p>
  </div>

  <div class="grid-duas-colunas">
    <div class="card">
      <h4>CLIENTE CONTRATANTE</h4>
      <p><strong>Nome:</strong> ${dados.clienteNome}</p>
      <p><strong>CPF/CNPJ:</strong> ${dados.clienteCpfCnpj || 'Não informado'}</p>
      <p><strong>Endereço:</strong> ${dados.clienteEndereco || '—'}</p>
      <p><strong>Telefone:</strong> ${dados.clienteTelefone || '—'}</p>
      <p><strong>Email:</strong> ${dados.clienteEmail || '—'}</p>
    </div>
    <div class="card">
      <h4>TITULAR DA UNIDADE CONSUMIDORA (UC)</h4>
      <p><strong>Nome Titular:</strong> ${titularEfetivoNome}</p>
      <p><strong>CPF Titular:</strong> ${titularEfetivoCpf || 'Não informado'}</p>
      <p><strong>Telefone:</strong> ${titularEfetivoTelefone || '—'}</p>
      <p><strong>Email:</strong> ${titularEfetivoEmail || '—'}</p>
      <p><strong>Nº UC:</strong> ${uc} &bull; <strong>Distribuidora:</strong> ${concessionaria}</p>
    </div>
  </div>

  <div class="secao">
    <h3>2. Dados Técnicos e Comerciais do Sistema</h3>
    <div class="card">
      <p><strong>Potência Total:</strong> ${dados.potenciaKwp.toFixed(2)} kWp &bull; <strong>Módulos:</strong> ${dados.quantidadeModulos}x ${dados.marcaModeloModulos || 'Mono PERC'}</p>
      <p><strong>Inversor:</strong> ${dados.marcaModeloInversor || 'On-Grid'} (${dados.potenciaInversorKw || dados.potenciaKwp} kW)</p>
      <p><strong>Investimento Total:</strong> ${formatBRL(dados.valorTotal)} &bull; <strong>Condições:</strong> ${dados.condicoesPagamento || 'Conforme proposta comercial'}</p>
    </div>
  </div>

  ${conteudoEspecifico}

  <p style="margin-top: 25px; text-align: right; font-weight: bold;">${dados.cidade || 'Erechim - RS'}, ${dataHoje}.</p>

  <div class="assinaturas">
    <div class="linha-assinatura">
      <strong>${titularEfetivoNome.toUpperCase()}</strong>
      <span>CPF: ${titularEfetivoCpf}</span><br>
      <span style="color:#166534; font-weight:600;">Titular / Responsável pela UC</span>
    </div>
    <div class="linha-assinatura">
      <strong>${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico.toUpperCase()}</strong>
      <span>CREA/RS: ${DADOS_EMPRESA_DELFOS_SOLAR.crea}</span><br>
      <span style="color:#166534; font-weight:600;">DELFOS ENERGIA SOLAR</span>
    </div>
  </div>
</body>
</html>`
}

/**
* Faz o download do documento gerado em formato HTML / PDF estilizado para impressão direta.
*/
export function baixarDocumentoProjetoHTML(dados: DadosDocumentoProjetoInput): void {
const html = gerarHTMLDocumentoProjeto(dados)
const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
const url = URL.createObjectURL(blob)
const safeCliente = (dados.clienteNome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
const a = document.createElement('a')
a.href = url
a.download = `${dados.tipo.toUpperCase()}_Delfos_${safeCliente}.html`
document.body.appendChild(a)
a.click()
document.body.removeChild(a)
URL.revokeObjectURL(url)
}

/**
* Abre versão para visualização e impressão nativa em PDF pelo navegador.
*/
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
const html = gerarHTMLDocumentoProjeto(dados)
const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
const url = URL.createObjectURL(blob)
window.open(url, '_blank')
}=======
export function baixarDocumentoProjetoHTML(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeCliente = (dados.clienteNome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `${dados.tipo.toUpperCase()}_Delfos_${safeCliente}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Abre versão para visualização e impressão nativa em PDF pelo navegador.
 */
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
=======
/**
 * Abre versão para visualização e impressão nativa em PDF pelo navegador.
 */
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
=======
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
=======
/**
 * Abre versão para visualização e impressão nativa em PDF pelo navegador.
 */
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
=======
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const dataHoje = formatDateBR(dados.dataDocumento)
  const titularEfetivoNome = dados.titularNome || dados.clienteNome
  const titularEfetivoCpf = dados.titularCpf || dados.clienteCpfCnpj
  const titularEfetivoTelefone = dados.titularTelefone || dados.clienteTelefone
  const titularEfetivoEmail = dados.titularEmail || dados.clienteEmail
  const uc = dados.numeroUC || '4091823719'
  const concessionaria = dados.concessionaria || 'RGE (Rio Grande Energia)'
  const titulo = TITULOS_DOCUMENTOS[dados.tipo]
=======
/**
 * Abre versão para visualização e impressão nativa em PDF pelo navegador.
 */
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
=======
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const dataHoje = formatDateBR(dados.dataDocumento)
  const titularEfetivoNome = dados.titularNome || dados.clienteNome
=======
/**
 * Abre versão para visualização e impressão nativa em PDF pelo navegador.
 */
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
=======
/**
 * Abre versão para visualização e impressão nativa em PDF pelo navegador.
 */
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const html = gerarHTMLDocumentoProjeto(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
=======
export function abrirDocumentoProjetoEmNovaAba(dados: DadosDocumentoProjetoInput): void {
  const dataHoje = formatDateBR(dados.dataDocumento)
  const titularEfetivoNome = dados.titularNome || dados.clienteNome
  const titularEfetivoCpf = dados.titularCpf || dados.clienteCpfCnpj
  const titularEfetivoTelefone = dados.titularTelefone || dados.clienteTelefone
  const titularEfetivoEmail = dados.titularEmail || dados.clienteEmail
  const uc = dados.numeroUC || '4091823719'
  const concessionaria = dados.concessionaria || 'RGE (Rio Grande Energia)'
  const titulo = TITULOS_DOCUMENTOS[dados.tipo]

  let conteudoEspecifico = ''
  if (dados.tipo === 'procuracao') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Instrumento Particular de Procuração</h3>
        <p><strong>OUTORGANTE:</strong> ${titularEfetivoNome}, portador(a) do CPF nº ${titularEfetivoCpf}, residente e domiciliado(a) no endereço ${dados.clienteEndereco}, titular da Unidade Consumidora nº ${uc} junto à concessionária ${concessionaria}.</p>
        <p><strong>OUTORGADA:</strong> ${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial}, CNPJ nº ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}, com sede em ${DADOS_EMPRESA_DELFOS_SOLAR.endereco}, representada neste ato por seus engenheiros e técnicos habilitados (CREA/RS ${DADOS_EMPRESA_DELFOS_SOLAR.crea}).</p>
        <p><strong>PODERES:</strong> Confere plenos poderes para requerer parecer de acesso, protocolar documentos, solicitar vistorias, aprovar projetos elétricos e assinar todos os formulários e termos de adesão da Microgeração Distribuída de ${dados.potenciaKwp.toFixed(2)} kWp para a UC nº ${uc}.</p>
        <p><strong>VALIDADE:</strong> 12 (doze) meses a contar desta data ou até a efetiva ligação do medidor bidirecional.</p>
      </div>
    `
  } else if (dados.tipo === 'contrato') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Cláusulas Principais de Fornecimento e Instalação</h3>
        <p><strong>CLÁUSULA 1ª — OBJETO:</strong> Fornecimento de equipamentos, montagem mecânica, ligação elétrica e homologação de sistema fotovoltaico com potência de ${dados.potenciaKwp.toFixed(2)} kWp.</p>
        <p><strong>CLÁUSULA 2ª — EQUIPAMENTOS:</strong> ${dados.quantidadeModulos} módulos fotovoltaicos (${dados.marcaModeloModulos || 'Mono PERC'}), inversor solar (${dados.marcaModeloInversor || 'On-Grid'}), cabeamento solar e proteções elétricas.</p>
        <p><strong>CLÁUSULA 3ª — INVESTIMENTO:</strong> ${formatBRL(dados.valorTotal)}, nas condições aprovadas: ${dados.condicoesPagamento || 'Entrada e saldo conforme medição/homologação'}.</p>
        <p><strong>CLÁUSULA 4ª — GARANTIAS:</strong> 12 meses para serviços de instalação; 10 a 12 anos para inversor e 25 anos de performance para os módulos solares.</p>
      </div>
    `
  } else if (dados.tipo === 'anexo_e') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Formulação do Anexo E — Solicitação de Acesso Microgeração</h3>
        <p><strong>Normativa:</strong> Resolução Normativa ANEEL nº 1.000/2021 e Lei 14.300/2022 junto à ${concessionaria}.</p>
        <p><strong>Dados Técnicos:</strong> Potência dos Módulos: ${dados.potenciaKwp.toFixed(2)} kWp | Inversor Nominal: ${dados.potenciaInversorKw || dados.potenciaKwp} kW. Conexão em Baixa Tensão na UC nº ${uc}.</p>
        <p><strong>Responsável Técnico:</strong> ${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} (CREA/RS: ${DADOS_EMPRESA_DELFOS_SOLAR.crea}).</p>
      </div>
    `
  } else if (dados.tipo === 'anexo_f') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Formulação do Anexo F — Termo de Responsabilidade Técnica</h3>
        <p>Declaração formal de conformidade com as normas ABNT NBR 5410, NBR 16690 e normas técnicas da concessionária ${concessionaria}.</p>
        <p>Proteção anti-ilhamento ativa com desligamento automático em caso de falta de rede da distribuidora.</p>
        <p>Padrão de entrada adequado para recebimento de medidor bidirecional.</p>
      </div>
    `
  } else if (dados.tipo === 'anexo_g') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Formulação do Anexo G — Adesão ao Sistema de Compensação</h3>
        <p>Termo de adesão ao SCEE (Sistema de Compensação de Energia Elétrica) da UC Geradora ${uc}.</p>
        <p>Compensação de excedentes de geração para a unidade beneficiária nº ${dados.ucDestino || 'Indicada pelo cliente'} com percentual de rateio de ${dados.percentualRateio || '100%'}.</p>
      </div>
    `
  } else if (dados.tipo === 'troca_titularidade') {
    conteudoEspecifico = `
      <div class="secao">
        <h3>3. Solicitação de Troca de Titularidade da UC</h3>
        <p>Solicitação expressa de transferência de responsabilidade da Unidade Consumidora nº ${uc} perante a ${concessionaria}.</p>
        <p><strong>Titular Anterior:</strong> ${dados.titularNome || dados.clienteNome} (CPF: ${dados.titularCpf || dados.clienteCpfCnpj})</p>
        <p><strong>Novo Titular:</strong> ${dados.novoTitularNome || dados.clienteNome} (CPF: ${dados.novoTitularCpf || dados.clienteCpfCnpj})</p>
      </div>
    `
  }

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo} — ${dados.clienteNome}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.5; font-size: 13px; margin: 0; padding: 20px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #16a34a; padding-bottom: 12px; margin-bottom: 16px; }
    .brand { font-size: 18px; font-weight: bold; color: #166534; }
    .brand-sub { font-size: 11px; color: #6b7280; }
    .banner { background: #f0fdf4; border-left: 6px solid #166534; border: 1px solid #bbf7d0; padding: 14px 18px; border-radius: 6px; margin-bottom: 18px; }
    .banner h1 { margin: 0 0 6px 0; font-size: 17px; color: #166534; text-transform: uppercase; }
    .banner p { margin: 0; font-size: 12px; color: #4b5563; }
    .grid-duas-colunas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
    .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 14px; }
    .card h4 { margin: 0 0 8px 0; font-size: 13px; color: #166534; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
    .card p { margin: 4px 0; font-size: 12px; }
    .secao { margin-bottom: 16px; }
    .secao h3 { font-size: 14px; color: #166534; border-left: 4px solid #16a34a; padding-left: 8px; margin: 14px 0 8px 0; }
    .secao p { font-size: 12.5px; text-align: justify; margin: 6px 0; }
    .assinaturas { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
    .linha-assinatura { border-top: 1px solid #111827; text-align: center; padding-top: 6px; }
    .linha-assinatura strong { display: block; font-size: 12px; }
    .linha-assinatura span { font-size: 11px; color: #4b5563; }
    .btn-print { position: fixed; top: 15px; right: 15px; background: #166534; color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    @media print { .btn-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <button class="btn-print" onclick="window.print()">Imprimir / Salvar PDF</button>

  <div class="header">
    <div>
      <div class="brand">DELFOS ENERGIA SOLAR</div>
      <div class="brand-sub">${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial} | CNPJ: ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #6b7280;">
      Resp. Técnico: ${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico} (CREA ${DADOS_EMPRESA_DELFOS_SOLAR.crea})<br>
      ${DADOS_EMPRESA_DELFOS_SOLAR.telefone} • ${DADOS_EMPRESA_DELFOS_SOLAR.site}
    </div>
  </div>

  <div class="banner">
    <h1>${titulo}</h1>
    <p>Emissão: ${dataHoje} &bull; Concessionária: ${concessionaria} &bull; Unidade Consumidora (UC): ${uc}</p>
  </div>

  <div class="grid-duas-colunas">
    <div class="card">
      <h4>CLIENTE CONTRATANTE</h4>
      <p><strong>Nome:</strong> ${dados.clienteNome}</p>
      <p><strong>CPF/CNPJ:</strong> ${dados.clienteCpfCnpj || 'Não informado'}</p>
      <p><strong>Endereço:</strong> ${dados.clienteEndereco || '—'}</p>
      <p><strong>Telefone:</strong> ${dados.clienteTelefone || '—'}</p>
      <p><strong>Email:</strong> ${dados.clienteEmail || '—'}</p>
    </div>
    <div class="card">
      <h4>TITULAR DA UNIDADE CONSUMIDORA (UC)</h4>
      <p><strong>Nome Titular:</strong> ${titularEfetivoNome}</p>
      <p><strong>CPF Titular:</strong> ${titularEfetivoCpf || 'Não informado'}</p>
      <p><strong>Telefone:</strong> ${titularEfetivoTelefone || '—'}</p>
      <p><strong>Email:</strong> ${titularEfetivoEmail || '—'}</p>
      <p><strong>Nº UC:</strong> ${uc} &bull; <strong>Distribuidora:</strong> ${concessionaria}</p>
    </div>
  </div>

  <div class="secao">
    <h3>2. Dados Técnicos e Comerciais do Sistema</h3>
    <div class="card">
      <p><strong>Potência Total:</strong> ${dados.potenciaKwp.toFixed(2)} kWp &bull; <strong>Módulos:</strong> ${dados.quantidadeModulos}x ${dados.marcaModeloModulos || 'Mono PERC'}</p>
      <p><strong>Inversor:</strong> ${dados.marcaModeloInversor || 'On-Grid'} (${dados.potenciaInversorKw || dados.potenciaKwp} kW)</p>
      <p><strong>Investimento Total:</strong> ${formatBRL(dados.valorTotal)} &bull; <strong>Condições:</strong> ${dados.condicoesPagamento || 'Conforme proposta comercial'}</p>
    </div>
  </div>

  ${conteudoEspecifico}

  <p style="margin-top: 25px; text-align: right; font-weight: bold;">${dados.cidade || 'Erechim - RS'}, ${dataHoje}.</p>

  <div class="assinaturas">
    <div class="linha-assinatura">
      <strong>${titularEfetivoNome.toUpperCase()}</strong>
      <span>CPF: ${titularEfetivoCpf}</span><br>
      <span style="color:#166534; font-weight:600;">Titular / Responsável pela UC</span>
    </div>
    <div class="linha-assinatura">
      <strong>${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico.toUpperCase()}</strong>
      <span>CREA/RS: ${DADOS_EMPRESA_DELFOS_SOLAR.crea}</span><br>
      <span style="color:#166534; font-weight:600;">DELFOS ENERGIA SOLAR</span>
    </div>
  </div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}

// Componente de documento de Proposta de Energia Solar para renderização via @react-pdf/renderer
import React from 'react'
import { Document, Page, Text, View, StyleSheet, type DocumentProps } from '@react-pdf/renderer'
import {
  type PropostaSolarPDFInput,
  converterInputParaTemplateComercial,
} from '@/lib/propostaSolarGenerator'
import {
  type PropostaTecnicoComercialDados,
  DADOS_FIXOS_EMPRESA_DELFOS,
} from '@/lib/propostaTecnicoComercialGenerator'
import { formatCurrency } from '@/lib/formatters'

// Margens do documento:
// Superior e inferior: 25mm em pontos = ~70.87pt
// Laterais: 0,07cm (0.7mm) em pontos: 0.7 * 72 / 25.4 = ~1.98pt
export const MARGIN_VERTICAL_25MM = 70.87
export const MARGIN_HORIZONTAL_007CM = 1.98

const styles = StyleSheet.create({
  page: {
    paddingTop: MARGIN_VERTICAL_25MM,
    paddingBottom: MARGIN_VERTICAL_25MM,
    paddingLeft: MARGIN_HORIZONTAL_007CM,
    paddingRight: MARGIN_HORIZONTAL_007CM,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.5,
    color: '#000000',
    backgroundColor: '#ffffff',
  },
  headerInstitucional: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#16a34a',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 14,
  },
  headerLogo: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    color: '#15803d',
    letterSpacing: 0.5,
  },
  headerSubLogo: {
    fontFamily: 'Times-Roman',
    fontSize: 7.5,
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  headerRight: {
    textAlign: 'right',
    fontSize: 8,
    color: '#4b5563',
  },
  tituloPrincipal: {
    fontFamily: 'Times-Bold',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtituloPrincipal: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    textAlign: 'center',
    color: '#374151',
    marginBottom: 14,
  },
  paragrafo: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    lineHeight: 1.55,
    textAlign: 'justify',
    marginBottom: 10,
    color: '#000000',
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  italic: {
    fontFamily: 'Times-Italic',
  },
  // Blocos em destaque
  blocoCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    borderStyle: 'solid',
    padding: 8,
    marginTop: 6,
    marginBottom: 10,
    fontSize: 9,
    lineHeight: 1.45,
  },
  blocoCardTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    color: '#166534',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  secaoTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 10.5,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
    color: '#166534',
    borderBottomWidth: 0.8,
    borderBottomColor: '#d1d5db',
    paddingBottom: 2,
  },
  // Tabela Genérica com quebra correta
  tabela: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderStyle: 'solid',
    marginTop: 6,
    marginBottom: 10,
  },
  tabelaLinhaHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    borderBottomStyle: 'solid',
    alignItems: 'center',
  },
  tabelaLinha: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  tabelaLinhaDestaque: {
    flexDirection: 'row',
    backgroundColor: '#ecfdf5',
    borderBottomWidth: 0.5,
    borderBottomColor: '#a7f3d0',
    borderBottomStyle: 'solid',
  },
  colHeader: {
    padding: 4.5,
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: '#1f2937',
  },
  colCell: {
    padding: 4.5,
    fontSize: 8,
    fontFamily: 'Times-Roman',
    color: '#000000',
  },
  colCellBold: {
    padding: 4.5,
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: '#166534',
  },
  // Bloco de Assinaturas
  assinaturasLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 22,
    gap: 16,
  },
  assinaturaBloco: {
    flex: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  linhaAssinatura: {
    borderTopWidth: 1,
    borderTopColor: '#000000',
    borderTopStyle: 'solid',
    width: '100%',
    marginBottom: 4,
  },
  rotuloAssinatura: {
    fontFamily: 'Times-Bold',
    fontSize: 9,
    marginBottom: 1,
    textAlign: 'center',
  },
  subAssinatura: {
    fontFamily: 'Times-Roman',
    fontSize: 8,
    textAlign: 'center',
    color: '#374151',
  },
  dataLocal: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    marginTop: 14,
    marginBottom: 10,
    textAlign: 'left',
    color: '#000000',
  },
  rodapeNota: {
    fontSize: 7.5,
    fontFamily: 'Times-Italic',
    color: '#4b5563',
    marginTop: 8,
    textAlign: 'justify',
  },
})

export interface PropostaSolarPDFDocumentProps extends DocumentProps {
  dados: PropostaSolarPDFInput | PropostaTecnicoComercialDados
}

export function isPropostaSolarPDFInput(dados: any): dados is PropostaSolarPDFInput {
  return dados && typeof dados === 'object' && 'sistema' in dados && 'calculos' in dados
}

export const PropostaSolarPDFDocument: React.FC<PropostaSolarPDFDocumentProps> = ({
  dados: dadosInput,
  ...docProps
}) => {
  // Normaliza os dados para PropostaTecnicoComercialDados unificada
  const dados: PropostaTecnicoComercialDados = isPropostaSolarPDFInput(dadosInput)
    ? converterInputParaTemplateComercial(dadosInput)
    : (dadosInput as PropostaTecnicoComercialDados)

  const cliente = dados.cliente || { nome: 'Cliente' }
  const sistema = dados.sistema || ({} as any)
  const producao = dados.producao || ({} as any)
  const economia = dados.economia || ({} as any)
  const parcelamento = dados.parcelamento || ({} as any)
  const projecao = dados.projecao || ({} as any)
  const garantias = dados.garantias || ({} as any)
  const empresa = dados.empresa || DADOS_FIXOS_EMPRESA_DELFOS

  const potenciaStr = Number(sistema.potenciaKwp || 0).toFixed(2)
  const geracaoMediaStr = Math.round(Number(producao.mediaMensalKwh || 0)).toLocaleString('pt-BR')
  const geracaoAnualStr = Math.round(Number(producao.anualKwh || 0)).toLocaleString('pt-BR')
  const valorInvestimentoNum = Number(economia.investimentoTotal || 0)
  const valorInvestimentoStr = formatCurrency(valorInvestimentoNum)
  const paybackStr =
    economia.paybackTexto || `${Math.round(Number(economia.paybackMeses || 0))} meses`
  const prazoEntrega = economia.prazoEntregaDias || 30
  const dataHojeStr = dados.dataProposta || new Date().toLocaleDateString('pt-BR')

  // Projeções
  const eco1AnoStr = formatCurrency(Number(projecao.economia1Ano || 0))
  const eco5AnosStr = formatCurrency(Number(projecao.economia5Anos || 0))
  const eco25AnosStr = formatCurrency(Number(projecao.economia25Anos || 0))
  const gasto1AnoStr = formatCurrency(Number(projecao.gastoSemSolar1Ano || 0))
  const gasto5AnosStr = formatCurrency(Number(projecao.gastoSemSolar5Anos || 0))
  const gasto25AnosStr = formatCurrency(Number(projecao.gastoSemSolar25Anos || 0))

  return (
    <Document
      title={`PROPOSTA DE ENERGIA SOLAR — ${cliente.nome || 'Cliente'}`}
      author={empresa.razaoSocial || 'DELFOS ENGENHARIA LTDA'}
      subject="Proposta Técnico-Comercial de Energia Solar Fotovoltaica"
      {...docProps}
    >
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho Institucional Delfos */}
        <View style={styles.headerInstitucional}>
          <View>
            <Text style={styles.headerLogo}>DELFOS ENGENHARIA SOLAR</Text>
            <Text style={styles.headerSubLogo}>
              Engenharia, Homologação &amp; Instalação Fotovoltaica Turnkey
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text>CNPJ: {empresa.cnpj || DADOS_FIXOS_EMPRESA_DELFOS.cnpj}</Text>
            <Text>Rua Espírito Santo, 275 – Erechim/RS</Text>
          </View>
        </View>

        {/* Título Principal */}
        <Text style={styles.tituloPrincipal}>PROPOSTA TÉCNICO-COMERCIAL</Text>
        <Text style={styles.subtituloPrincipal}>
          Sistema de Geração de Energia Solar Fotovoltaica Conectado à Rede (On-Grid)
        </Text>

        {/* 1. DADOS DO CLIENTE & DESTINATÁRIO */}
        <View style={styles.blocoCard} wrap={false}>
          <Text style={styles.blocoCardTitulo}>1. DADOS DO CLIENTE / TITULAR DA UC</Text>
          <Text style={styles.paragrafo}>
            <Text style={styles.bold}>Cliente:</Text> {cliente.nome || 'Não informado'}
            {cliente.cpfOuCnpj ? ` • CPF/CNPJ: ${cliente.cpfOuCnpj}` : ''}
          </Text>
          <Text style={styles.paragrafo}>
            <Text style={styles.bold}>Endereço:</Text>{' '}
            {[cliente.endereco, cliente.municipio || cliente.cidade].filter(Boolean).join(', ') ||
              'Erechim / RS'}
            {cliente.telefone ? ` • Telefone: ${cliente.telefone}` : ''}
            {cliente.email ? ` • E-mail: ${cliente.email}` : ''}
          </Text>
          <Text style={styles.paragrafo}>
            <Text style={styles.bold}>Enquadramento / Tipo:</Text>{' '}
            {cliente.tipoCliente || 'Residencial'} •{' '}
            <Text style={styles.bold}>Validade da Proposta:</Text> {dados.validadeDias || 5} dias
            corridos.
          </Text>
        </View>

        {/* 2. SISTEMA FOTOVOLTAICO PROPOSTO (Tabela protegida para não quebrar no meio da linha) */}
        <Text style={styles.secaoTitulo}>2. ESPECIFICAÇÕES DO SISTEMA PROPOSTO</Text>
        <Text style={styles.paragrafo}>
          Dimensionamento de engenharia sob medida com equipamentos Tier-1 de alta eficiência:
        </Text>

        <View style={styles.tabela} wrap={true}>
          <View style={styles.tabelaLinhaHeader} wrap={false}>
            <Text style={[styles.colHeader, { width: '40%' }]}>Item / Equipamento</Text>
            <Text style={[styles.colHeader, { width: '20%', textAlign: 'center' }]}>
              Quantidade
            </Text>
            <Text style={[styles.colHeader, { width: '40%' }]}>Especificação Técnica</Text>
          </View>

          <View style={styles.tabelaLinhaDestaque} wrap={false}>
            <Text style={[styles.colCellBold, { width: '40%' }]}>Potência Total Instalada</Text>
            <Text style={[styles.colCellBold, { width: '20%', textAlign: 'center' }]}>
              {potenciaStr} kWp
            </Text>
            <Text style={[styles.colCell, { width: '40%' }]}>
              Geração média estimada de {geracaoMediaStr} kWh/mês
            </Text>
          </View>

          <View style={styles.tabelaLinha} wrap={false}>
            <Text style={[styles.colCell, { width: '40%', fontFamily: 'Times-Bold' }]}>
              Módulos Fotovoltaicos
            </Text>
            <Text style={[styles.colCell, { width: '20%', textAlign: 'center' }]}>
              {sistema.qtdPaineis || 0} unidades
            </Text>
            <Text style={[styles.colCell, { width: '40%' }]}>
              {sistema.descricaoPaineis || 'Módulos Tier-1 monocristalinos'}
            </Text>
          </View>

          <View style={styles.tabelaLinha} wrap={false}>
            <Text style={[styles.colCell, { width: '40%', fontFamily: 'Times-Bold' }]}>
              Inversor Solar On-Grid
            </Text>
            <Text style={[styles.colCell, { width: '20%', textAlign: 'center' }]}>
              {sistema.qtdInversores || 1} {sistema.qtdInversores > 1 ? 'unidades' : 'unidade'}
            </Text>
            <Text style={[styles.colCell, { width: '40%' }]}>
              {sistema.descricaoInversores || 'Inversor homologado com monitoramento WiFi'}
            </Text>
          </View>

          <View style={styles.tabelaLinha} wrap={false}>
            <Text style={[styles.colCell, { width: '40%', fontFamily: 'Times-Bold' }]}>
              Estrutura de Fixação
            </Text>
            <Text style={[styles.colCell, { width: '20%', textAlign: 'center' }]}>Conjunto</Text>
            <Text style={[styles.colCell, { width: '40%' }]}>
              {sistema.estruturaFixacao || 'Estrutura em alumínio/inox'}
            </Text>
          </View>

          <View style={styles.tabelaLinha} wrap={false}>
            <Text style={[styles.colCell, { width: '40%', fontFamily: 'Times-Bold' }]}>
              Área Estimada / Finame
            </Text>
            <Text style={[styles.colCell, { width: '20%', textAlign: 'center' }]}>
              {sistema.areaNecessariaM2 || 0} m²
            </Text>
            <Text style={[styles.colCell, { width: '40%' }]}>
              Código FINAME: {sistema.codigoFiname || 'Sob consulta'}
            </Text>
          </View>
        </View>

        {/* Garantias do Sistema */}
        <View style={styles.blocoCard} wrap={false}>
          <Text style={styles.blocoCardTitulo}>GARANTIAS DE FÁBRICA &amp; ENGENHARIA</Text>
          <Text style={styles.paragrafo}>
            • <Text style={styles.bold}>Módulos (Geração/Degradação):</Text>{' '}
            {garantias.paineisAnosDesempenho || 30} anos com tolerância positiva (
            {garantias.paineisPercentualDesempenho || '84,8%'}).
          </Text>
          <Text style={styles.paragrafo}>
            • <Text style={styles.bold}>Módulos (Fabricação):</Text>{' '}
            {garantias.paineisAnosFabricacao || 15} anos contra defeitos de fabricação.
          </Text>
          <Text style={styles.paragrafo}>
            • <Text style={styles.bold}>Inversores:</Text> {garantias.inversorAnosFabricacao || 10}{' '}
            anos de garantia padrão de fábrica.
          </Text>
          <Text style={styles.paragrafo}>
            • <Text style={styles.bold}>Montagem e Instalação:</Text>{' '}
            {garantias.instalacaoTexto || '1 ano de garantia direta Delfos Engenharia'}.
          </Text>
        </View>

        {/* 3. INVESTIMENTO E CONDIÇÕES DE PAGAMENTO */}
        <Text style={styles.secaoTitulo}>3. INVESTIMENTO E CONDIÇÕES DE PAGAMENTO</Text>
        <Text style={styles.paragrafo}>
          Modalidade Turnkey Completa: projeto executivo, homologação perante a concessionária
          (RGE), fornecimento dos equipamentos, frete, montagem técnica e conexão à rede.
        </Text>

        <View style={styles.tabela} wrap={true}>
          <View style={styles.tabelaLinhaHeader} wrap={false}>
            <Text style={[styles.colHeader, { width: '30%' }]}>Modalidade</Text>
            <Text style={[styles.colHeader, { width: '25%', textAlign: 'right' }]}>
              Valor da Parcela
            </Text>
            <Text style={[styles.colHeader, { width: '45%' }]}>Condições</Text>
          </View>

          {/* À Vista */}
          <View style={styles.tabelaLinhaDestaque} wrap={false}>
            <Text style={[styles.colCellBold, { width: '30%' }]}>À Vista (Turnkey)</Text>
            <Text style={[styles.colCellBold, { width: '25%', textAlign: 'right' }]}>
              {parcelamento.aVista?.valorTotal
                ? formatCurrency(parcelamento.aVista.valorTotal)
                : valorInvestimentoStr}
            </Text>
            <Text style={[styles.colCell, { width: '45%' }]}>
              Desconto exclusivo para pagamento à vista • Maior rentabilidade
            </Text>
          </View>

          {/* Cartão de Crédito */}
          {parcelamento.cartao18x && (
            <View style={styles.tabelaLinha} wrap={false}>
              <Text style={[styles.colCell, { width: '30%', fontFamily: 'Times-Bold' }]}>
                Cartão de Crédito {parcelamento.cartao18x.numeroParcelas || 18}x
              </Text>
              <Text style={[styles.colCell, { width: '25%', textAlign: 'right' }]}>
                {formatCurrency(Number(parcelamento.cartao18x.valorParcela || 0))}
              </Text>
              <Text style={[styles.colCell, { width: '45%' }]}>
                {parcelamento.cartao18x.entrada > 0
                  ? `Entrada de ${formatCurrency(parcelamento.cartao18x.entrada)} + `
                  : ''}
                {parcelamento.cartao18x.numeroParcelas || 18} parcelas mensais fixas
              </Text>
            </View>
          )}

          {/* Financiamento Banco 1 */}
          {parcelamento.financiamentoA && (
            <View style={styles.tabelaLinha} wrap={false}>
              <Text style={[styles.colCell, { width: '30%', fontFamily: 'Times-Bold' }]}>
                {parcelamento.financiamentoA.nome || 'Financiamento 60x'}
              </Text>
              <Text style={[styles.colCell, { width: '25%', textAlign: 'right' }]}>
                {formatCurrency(Number(parcelamento.financiamentoA.valorParcela || 0))}
              </Text>
              <Text style={[styles.colCell, { width: '45%' }]}>
                {parcelamento.financiamentoA.numeroParcelas || 60} meses • Parcela paga com a
                própria economia
              </Text>
            </View>
          )}

          {/* Financiamento Banco 2 */}
          {parcelamento.financiamentoB && (
            <View style={styles.tabelaLinha} wrap={false}>
              <Text style={[styles.colCell, { width: '30%', fontFamily: 'Times-Bold' }]}>
                {parcelamento.financiamentoB.nome || 'Financiamento 120x'}
              </Text>
              <Text style={[styles.colCell, { width: '25%', textAlign: 'right' }]}>
                {formatCurrency(Number(parcelamento.financiamentoB.valorParcela || 0))}
              </Text>
              <Text style={[styles.colCell, { width: '45%' }]}>
                {parcelamento.financiamentoB.numeroParcelas || 120} meses • Prazo estendido
              </Text>
            </View>
          )}
        </View>

        {/* 4. PROJEÇÃO DE ECONOMIA & RETORNO */}
        <Text style={styles.secaoTitulo}>4. PROJEÇÃO DE ECONOMIA &amp; PAYBACK</Text>
        <Text style={styles.paragrafo}>
          Estimativa de geração anual de {geracaoAnualStr} kWh/ano com retorno do investimento em
          aproximadamente <Text style={styles.bold}>{paybackStr}</Text>:
        </Text>

        <View style={styles.tabela} wrap={true}>
          <View style={styles.tabelaLinhaHeader} wrap={false}>
            <Text style={[styles.colHeader, { width: '30%' }]}>Período</Text>
            <Text style={[styles.colHeader, { width: '35%', textAlign: 'right' }]}>
              Economia Estimada Acumulada
            </Text>
            <Text style={[styles.colHeader, { width: '35%', textAlign: 'right' }]}>
              Gasto Sem Solar (Concessionária)
            </Text>
          </View>

          <View style={styles.tabelaLinha} wrap={false}>
            <Text style={[styles.colCell, { width: '30%', fontFamily: 'Times-Bold' }]}>
              Primeiro Ano (12 meses)
            </Text>
            <Text
              style={[styles.colCellBold, { width: '35%', textAlign: 'right', color: '#166534' }]}
            >
              {eco1AnoStr}
            </Text>
            <Text style={[styles.colCell, { width: '35%', textAlign: 'right', color: '#991b1b' }]}>
              {gasto1AnoStr}
            </Text>
          </View>

          <View style={styles.tabelaLinha} wrap={false}>
            <Text style={[styles.colCell, { width: '30%', fontFamily: 'Times-Bold' }]}>
              5 Anos (Médio Prazo)
            </Text>
            <Text
              style={[styles.colCellBold, { width: '35%', textAlign: 'right', color: '#166534' }]}
            >
              {eco5AnosStr}
            </Text>
            <Text style={[styles.colCell, { width: '35%', textAlign: 'right', color: '#991b1b' }]}>
              {gasto5AnosStr}
            </Text>
          </View>

          <View style={styles.tabelaLinhaDestaque} wrap={false}>
            <Text style={[styles.colCellBold, { width: '30%' }]}>25 Anos (Vida Útil)</Text>
            <Text
              style={[styles.colCellBold, { width: '35%', textAlign: 'right', color: '#166534' }]}
            >
              {eco25AnosStr}
            </Text>
            <Text style={[styles.colCell, { width: '35%', textAlign: 'right', color: '#991b1b' }]}>
              {gasto25AnosStr}
            </Text>
          </View>
        </View>

        {/* 5. PRAZO, TERMO DE ACEITE E ASSINATURAS */}
        <View wrap={false}>
          <Text style={styles.secaoTitulo}>5. PRAZO DE EXECUÇÃO E ACEITE DA PROPOSTA</Text>
          <Text style={styles.paragrafo}>
            <Text style={styles.bold}>Prazo de Entrega e Comissionamento:</Text> Aproximadamente{' '}
            {prazoEntrega} dias corridos após a emissão do parecer de acesso pela concessionária.
            {dados.observacoes ? ` Observações: ${dados.observacoes}` : ''}
          </Text>

          <Text style={styles.dataLocal}>Erechim/RS, {dataHojeStr}.</Text>

          <View style={styles.assinaturasLinha}>
            {/* Assinatura Contratada */}
            <View style={styles.assinaturaBloco}>
              <View style={styles.linhaAssinatura} />
              <Text style={styles.rotuloAssinatura}>
                {empresa.razaoSocial || 'DELFOS ENGENHARIA LTDA'}
              </Text>
              <Text style={styles.subAssinatura}>
                {empresa.responsavelTecnico || 'João Victor Bagetti Fuchs'} —{' '}
                {empresa.crea || 'CREA RS151894'}
              </Text>
            </View>

            {/* Assinatura Contratante */}
            <View style={styles.assinaturaBloco}>
              <View style={styles.linhaAssinatura} />
              <Text style={styles.rotuloAssinatura}>{cliente.nome || 'Cliente / Contratante'}</Text>
              <Text style={styles.subAssinatura}>CPF/CNPJ: {cliente.cpfOuCnpj || 'De acordo'}</Text>
            </View>
          </View>

          <Text style={styles.rodapeNota}>
            Proposta válida por {dados.validadeDias || 5} dias. Documento com valor pré-contratual
            elaborado por Delfos Engenharia Ltda (CNPJ{' '}
            {empresa.cnpj || DADOS_FIXOS_EMPRESA_DELFOS.cnpj}).
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export default PropostaSolarPDFDocument

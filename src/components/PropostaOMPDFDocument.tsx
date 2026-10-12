// Componente de documento de Proposta O&M para renderização via @react-pdf/renderer
// Utiliza a tipografia serifada Times-Roman/Times-Bold padrão das propostas e contratos Delfos,
// com margens laterais de 0,07cm e 25mm superior/inferior, wrap={false} para evitar quebras
// indesejadas em blocos técnicos, cenários e tabelas.
import React from 'react'
import { Document, Page, Text, View, StyleSheet, type DocumentProps } from '@react-pdf/renderer'
import { type PropostaPDFInput, DADOS_EMPRESA_DELFOS } from '@/lib/propostaOMGenerator'
import { formatCurrency } from '@/lib/formatters'

// Margens do documento:
// Superior e inferior: 25mm em pontos: 25 * 72 / 25.4 = ~70.87pt
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
    fontSize: 9.5,
    lineHeight: 1.45,
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
    marginBottom: 12,
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
    fontSize: 7.5,
    color: '#4b5563',
    lineHeight: 1.3,
  },
  tituloPrincipal: {
    fontFamily: 'Times-Bold',
    fontSize: 12.5,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtituloPrincipal: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    textAlign: 'center',
    color: '#374151',
    marginBottom: 10,
  },
  badgeDataEmissao: {
    fontFamily: 'Times-Roman',
    fontSize: 8.5,
    textAlign: 'center',
    color: '#166534',
    marginBottom: 10,
  },
  paragrafo: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    lineHeight: 1.5,
    textAlign: 'justify',
    marginBottom: 6,
    color: '#000000',
  },
  bold: {
    fontFamily: 'Times-Bold',
  },
  italic: {
    fontFamily: 'Times-Italic',
  },
  // Blocos 2 colunas: Cliente e Usina
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  cardColuna: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    borderStyle: 'solid',
    padding: 7,
  },
  cardTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 9,
    color: '#166534',
    marginBottom: 5,
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#d1d5db',
    paddingBottom: 2,
  },
  cardLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2.5,
    fontSize: 8.5,
  },
  cardLabel: {
    fontFamily: 'Times-Roman',
    color: '#4b5563',
    width: '42%',
  },
  cardValor: {
    fontFamily: 'Times-Bold',
    color: '#111827',
    textAlign: 'right',
    width: '58%',
  },
  cardValorDestaque: {
    fontFamily: 'Times-Bold',
    color: '#15803d',
    textAlign: 'right',
    width: '58%',
  },
  // Box de Cenários de Exposição Financeira
  scenariosBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderLeftWidth: 3,
    borderLeftColor: '#d97706',
    borderStyle: 'solid',
    padding: 8,
    marginBottom: 10,
  },
  scenariosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scenariosTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 9,
    color: '#92400e',
    textTransform: 'uppercase',
  },
  scenariosSub: {
    fontFamily: 'Times-Roman',
    fontSize: 8,
    color: '#b45309',
  },
  scenariosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  scenarioItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 0.8,
    borderColor: '#fcd34d',
    borderRadius: 3,
    padding: 5,
    alignItems: 'center',
    textAlign: 'center',
  },
  scenarioItemDestaque: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  scenarioItemPerigo: {
    borderColor: '#fca5a5',
    backgroundColor: '#fef2f2',
  },
  scenarioLabel: {
    fontFamily: 'Times-Bold',
    fontSize: 7.5,
    color: '#78350f',
    textAlign: 'center',
    marginBottom: 3,
    height: 18,
  },
  scenarioValor: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    color: '#b45309',
  },
  scenarioValorVerde: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    color: '#15803d',
  },
  scenarioValorVermelho: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    color: '#dc2626',
  },
  scenarioNota: {
    fontFamily: 'Times-Italic',
    fontSize: 7.5,
    color: '#78350f',
    marginTop: 5,
    lineHeight: 1.3,
  },
  // Título da Seção
  secaoTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 8,
    marginBottom: 5,
    color: '#166534',
    borderBottomWidth: 0.8,
    borderBottomColor: '#d1d5db',
    paddingBottom: 2,
  },
  // Grid de Cards de Planos (3 cards lado a lado)
  planCardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 7,
    marginTop: 6,
    marginBottom: 10,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 7,
    position: 'relative',
  },
  planCardRec: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#16a34a',
    borderRadius: 6,
    padding: 7,
    position: 'relative',
  },
  planBadgeRec: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: '#047857',
    borderRadius: 4,
    paddingVertical: 1.5,
    paddingHorizontal: 5,
  },
  planBadgeRecText: {
    fontFamily: 'Times-Bold',
    fontSize: 6,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  planNome: {
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    color: '#111827',
    marginBottom: 2,
  },
  planPreco: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    color: '#0d7a3e',
  },
  planPrecoUnidade: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
    color: '#0d7a3e',
  },
  planFaturamentoAnual: {
    fontFamily: 'Times-Roman',
    fontSize: 6.8,
    color: '#6b7280',
    marginTop: 1,
    marginBottom: 5,
  },
  planBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2.5,
  },
  planBulletDot: {
    fontFamily: 'Times-Bold',
    fontSize: 7,
    color: '#9ca3af',
    width: 8,
  },
  planBulletTexto: {
    fontFamily: 'Times-Roman',
    fontSize: 7,
    color: '#4b5563',
    flex: 1,
    lineHeight: 1.25,
  },
  // Condições Gerais / Vigência
  condicoesBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    borderStyle: 'solid',
    padding: 6,
    marginBottom: 8,
  },
  condicoesTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    color: '#111827',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  condicoesItem: {
    fontFamily: 'Times-Roman',
    fontSize: 7.5,
    color: '#374151',
    lineHeight: 1.35,
    marginBottom: 1.5,
  },
  // Observações adicionais
  observacoesBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 0.8,
    borderColor: '#86efac',
    borderRadius: 3,
    padding: 6,
    marginBottom: 8,
  },
  observacoesTitulo: {
    fontFamily: 'Times-Bold',
    fontSize: 8,
    color: '#166534',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  observacoesTexto: {
    fontFamily: 'Times-Roman',
    fontSize: 7.5,
    color: '#14532d',
    lineHeight: 1.3,
  },
  // Rodapé do Documento
  docFooter: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderTopStyle: 'solid',
    paddingTop: 6,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  docFooterCompany: {
    fontFamily: 'Times-Roman',
    fontSize: 7.5,
    color: '#4b5563',
    lineHeight: 1.3,
  },
  docFooterValidade: {
    fontFamily: 'Times-Bold',
    fontSize: 7.5,
    color: '#059669',
    textAlign: 'right',
    lineHeight: 1.3,
  },
})

export interface PropostaOMPDFDocumentProps extends DocumentProps {
  dados: PropostaPDFInput
  observacoesAdicionais?: string
}

export const PropostaOMPDFDocument: React.FC<PropostaOMPDFDocumentProps> = ({
  dados,
  observacoesAdicionais,
  ...docProps
}) => {
  const { cliente, tecnico, parametros, calculos } = dados

  const dataFormatada = dados.dataEmissao
    ? new Date(dados.dataEmissao).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR')

  const formatBRL = (val: number) => formatCurrency(val || 0)

  return (
    <Document
      title={`PROPOSTA O&M — ${cliente.nome || 'Cliente'}`}
      author={DADOS_EMPRESA_DELFOS.razaoSocial}
      subject="Proposta de Gestão e Manutenção de Usinas Fotovoltaicas (O&M)"
      {...docProps}
    >
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho Institucional Delfos */}
        <View style={styles.headerInstitucional} wrap={false}>
          <View>
            <Text style={styles.headerLogo}>DELFOS SOLAR</Text>
            <Text style={styles.headerSubLogo}>
              Engenharia e Gestão de Usinas Solares • O&amp;M Fotovoltaico
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.bold}>{DADOS_EMPRESA_DELFOS.razaoSocial}</Text>
            <Text>CNPJ: {DADOS_EMPRESA_DELFOS.cnpj}</Text>
            <Text>{DADOS_EMPRESA_DELFOS.endereco}</Text>
            <Text>
              Tel: {DADOS_EMPRESA_DELFOS.telefone} • {DADOS_EMPRESA_DELFOS.site}
            </Text>
          </View>
        </View>

        {/* Título Principal do Documento */}
        <View wrap={false}>
          <Text style={styles.tituloPrincipal}>
            PROPOSTA DE GESTÃO E MANUTENÇÃO DE USINAS (O&amp;M)
          </Text>
          <Text style={styles.subtituloPrincipal}>
            Prevenção ativa, aumento de geração e proteção integral do seu investimento solar
            fotovoltaico
          </Text>
          <Text style={styles.badgeDataEmissao}>
            Data de Emissão: {dataFormatada} • Válida por 15 dias corridos
          </Text>
        </View>

        {/* 1. DADOS DO CLIENTE & DADOS TÉCNICOS DA USINA (2 colunas protegidas) */}
        <View style={styles.cardsGrid} wrap={false}>
          {/* Coluna 1: Cliente */}
          <View style={styles.cardColuna}>
            <Text style={styles.cardTitulo}>1. DADOS DO CLIENTE</Text>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Nome/Razão:</Text>
              <Text style={styles.cardValor}>{cliente.nome || 'Não informado'}</Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>CPF/CNPJ:</Text>
              <Text style={styles.cardValor}>{cliente.cpfOuCnpj || 'Não informado'}</Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Município:</Text>
              <Text style={styles.cardValor}>{cliente.municipio || 'Erechim / RS'}</Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Endereço:</Text>
              <Text style={styles.cardValor}>{cliente.endereco || 'Endereço da usina'}</Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Telefone:</Text>
              <Text style={styles.cardValor}>{cliente.telefone || '(54) 99129-2121'}</Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>E-mail:</Text>
              <Text style={styles.cardValor}>{cliente.email || 'contato@cliente.com'}</Text>
            </View>
          </View>

          {/* Coluna 2: Dados Técnicos */}
          <View style={styles.cardColuna}>
            <Text style={styles.cardTitulo}>2. DADOS TÉCNICOS DA USINA</Text>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Potência Total:</Text>
              <Text style={styles.cardValorDestaque}>
                {tecnico.potenciaKwp > 0
                  ? `${tecnico.potenciaKwp.toLocaleString('pt-BR')} kWp`
                  : '5,00 kWp'}
              </Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Geração Estimada:</Text>
              <Text style={styles.cardValor}>
                {tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês
              </Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Inversor(es):</Text>
              <Text style={styles.cardValor}>
                {tecnico.marcaInversores || 'Inversores homologados'}
              </Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Módulos:</Text>
              <Text style={styles.cardValor}>
                {tecnico.numeroModulos ? `${tecnico.numeroModulos} unidades` : 'Conforme projeto'}
              </Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Instalação:</Text>
              <Text style={styles.cardValor}>{tecnico.tipoInstalacao || 'Telhado'}</Text>
            </View>
            <View style={styles.cardLinha}>
              <Text style={styles.cardLabel}>Tarifa Base:</Text>
              <Text style={styles.cardValorDestaque}>{formatBRL(parametros.valorKwh)} / kWh</Text>
            </View>
          </View>
        </View>

        {/* 2. CENÁRIOS DE EXPOSIÇÃO FINANCEIRA (wrap={false}) */}
        <View style={styles.scenariosBox} wrap={false}>
          <View style={styles.scenariosHeader}>
            <Text style={styles.scenariosTitulo}>
              Cenários de Exposição Financeira sem O&amp;M Especializado
            </Text>
            <Text style={styles.scenariosSub}>
              Produção mensal: {tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh ×{' '}
              {formatBRL(parametros.valorKwh)}
            </Text>
          </View>

          <View style={styles.scenariosGrid}>
            <View style={[styles.scenarioItem, styles.scenarioItemDestaque]}>
              <Text style={styles.scenarioLabel}>Ativo Protegido (Mês)</Text>
              <Text style={styles.scenarioValorVerde}>
                {formatBRL(calculos.valorAtivoProtegido)}
              </Text>
            </View>
            <View style={styles.scenarioItem}>
              <Text style={styles.scenarioLabel}>Perda 15% ao ano (Sujidade/Poeira)</Text>
              <Text style={styles.scenarioValor}>{formatBRL(calculos.perda15Ano)}</Text>
            </View>
            <View style={styles.scenarioItem}>
              <Text style={styles.scenarioLabel}>Perda 20% ao ano (Sem Preventiva)</Text>
              <Text style={styles.scenarioValor}>{formatBRL(calculos.perda20Ano)}</Text>
            </View>
            <View style={[styles.scenarioItem, styles.scenarioItemPerigo]}>
              <Text style={styles.scenarioLabel}>Prejuízo 30 dias (Falha não vista)</Text>
              <Text style={styles.scenarioValorVermelho}>{formatBRL(calculos.prejuizo30Dias)}</Text>
            </View>
          </View>

          <Text style={styles.scenarioNota}>
            * Prejuízo por 20 dias de falha ou inversor desarmado sem alerta de monitoramento:{' '}
            <Text style={styles.bold}>{formatBRL(calculos.prejuizo20Dias)}</Text>. Um plano de
            O&amp;M se paga integralmente ao evitar apenas alguns dias de perda de geração ao ano.
          </Text>
        </View>

        {/* 3. COMPARATIVO DE PLANOS DE GESTÃO E MANUTENÇÃO (Cards com wrap={false}) */}
        <View wrap={false}>
          <Text style={styles.secaoTitulo}>3. COMPARATIVO DE PLANOS DE GESTÃO E MANUTENÇÃO</Text>

          <View style={styles.planCardsGrid}>
            {/* Card 1: Plano Essencial */}
            <View style={styles.planCard}>
              <Text style={styles.planNome}>Plano Essencial</Text>
              <Text style={styles.planPreco}>
                R$ 49,90<Text style={styles.planPrecoUnidade}>/mês</Text>
              </Text>
              <Text style={styles.planFaturamentoAnual}>Faturamento Anual: R$ 598,80/ano</Text>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Monitoramento comercial</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Relatório mensal analítico</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Suporte técnico e RGE</Text>
              </View>
            </View>

            {/* Card 2: Plano Prevenção */}
            <View style={styles.planCard}>
              <Text style={styles.planNome}>Plano Prevenção</Text>
              <Text style={styles.planPreco}>
                R$ 74,90<Text style={styles.planPrecoUnidade}>/mês</Text>
              </Text>
              <Text style={styles.planFaturamentoAnual}>Faturamento Anual: R$ 898,80/ano</Text>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Tudo do plano Essencial</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>1x Inspeção preventiva anual</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>1x Limpeza de placas anual</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Reaperto geral de conexões</Text>
              </View>
            </View>

            {/* Card 3: Plano Completo (Recomendado Delfos) */}
            <View style={styles.planCardRec}>
              <View style={styles.planBadgeRec}>
                <Text style={styles.planBadgeRecText}>RECOMENDADO DELFOS</Text>
              </View>
              <Text style={styles.planNome}>Plano Completo</Text>
              <Text style={styles.planPreco}>
                R$ 99,90<Text style={styles.planPrecoUnidade}>/mês</Text>
              </Text>
              <Text style={styles.planFaturamentoAnual}>Faturamento Anual: R$ 1.198,80/ano</Text>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Tudo do plano Prevenção</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>2x Limpezas de placas ao ano</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Verificação semestral de anomalias</Text>
              </View>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Suporte técnico ilimitado VIP</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. CONDIÇÕES GERAIS E VIGÊNCIA (wrap={false}) */}
        <View style={styles.condicoesBox} wrap={false}>
          <Text style={styles.condicoesTitulo}>Condições Gerais e Vigência:</Text>
          <Text style={styles.condicoesItem}>
            • <Text style={styles.bold}>Escolha flexível:</Text> O cliente escolhe livremente a
            modalidade mais adequada após a apresentação dos cenários de proteção.
          </Text>
          <Text style={styles.condicoesItem}>
            • <Text style={styles.bold}>Vigência contratual:</Text> 12 meses renováveis, garantindo
            atendimento contínuo, preventivo e laudos periódicos da usina.
          </Text>
          <Text style={styles.condicoesItem}>
            • <Text style={styles.bold}>Forma de pagamento:</Text> Mensalidades via boleto bancário
            ou PIX corporativo Delfos Engenharia.
          </Text>
          <Text style={styles.condicoesItem}>
            • <Text style={styles.bold}>Equipe técnica qualificada:</Text> Técnicos certificados
            NR-10 e NR-35 com equipamentos e instrumentos de medição calibrados.
          </Text>
          <Text style={styles.condicoesItem}>
            • <Text style={styles.bold}>Garantia de segurança:</Text> Produtos específicos e água
            desmineralizada/filtrada homologados, preservando as garantias dos fabricantes.
          </Text>
        </View>

        {/* Observações Complementares (quando informadas) */}
        {observacoesAdicionais && (
          <View style={styles.observacoesBox} wrap={false}>
            <Text style={styles.observacoesTitulo}>Observações Complementares:</Text>
            <Text style={styles.observacoesTexto}>{observacoesAdicionais}</Text>
          </View>
        )}

        {/* Rodapé da Proposta */}
        <View style={styles.docFooter} wrap={false}>
          <View style={styles.docFooterCompany}>
            <Text style={styles.bold}>{DADOS_EMPRESA_DELFOS.razaoSocial}</Text>
            <Text>
              CNPJ {DADOS_EMPRESA_DELFOS.cnpj} • {DADOS_EMPRESA_DELFOS.endereco}
            </Text>
            <Text>{DADOS_EMPRESA_DELFOS.site}</Text>
          </View>
          <View style={styles.docFooterValidade}>
            <Text>Proposta válida por 15 dias corridos.</Text>
            <Text>
              Responsável:{' '}
              <Text style={styles.bold}>{dados.autor || 'Equipe Comercial Delfos Solar'}</Text>
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default PropostaOMPDFDocument

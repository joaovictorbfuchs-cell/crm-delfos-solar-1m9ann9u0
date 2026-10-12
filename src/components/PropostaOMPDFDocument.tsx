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
  // Tabela Comparativa de Planos O&M
  tabela: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderStyle: 'solid',
    marginTop: 4,
    marginBottom: 8,
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
    alignItems: 'center',
  },
  tabelaLinhaZebra: {
    backgroundColor: '#fafafa',
  },
  tabelaLinhaDestaqueTotal: {
    flexDirection: 'row',
    backgroundColor: '#dcfce7',
    borderTopWidth: 1.5,
    borderTopColor: '#16a34a',
    borderBottomWidth: 1.5,
    borderBottomColor: '#16a34a',
    borderBottomStyle: 'solid',
    alignItems: 'center',
  },
  colEscopoHeader: {
    width: '46%',
    padding: 4,
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: '#1f2937',
    borderRightWidth: 0.5,
    borderRightColor: '#9ca3af',
  },
  colPlanoHeader: {
    width: '18%',
    padding: 4,
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: '#1f2937',
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#9ca3af',
  },
  colPlanoHeaderRec: {
    width: '18%',
    padding: 4,
    fontSize: 8,
    fontFamily: 'Times-Bold',
    color: '#14532d',
    backgroundColor: '#dcfce7',
    textAlign: 'center',
  },
  colEscopoCell: {
    width: '46%',
    padding: 3.5,
    fontSize: 7.5,
    fontFamily: 'Times-Roman',
    color: '#1f2937',
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
  },
  colPlanoCell: {
    width: '18%',
    padding: 3.5,
    fontSize: 7.5,
    fontFamily: 'Times-Roman',
    color: '#374151',
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
  },
  colPlanoCellRec: {
    width: '18%',
    padding: 3.5,
    fontSize: 7.5,
    fontFamily: 'Times-Bold',
    color: '#166534',
    backgroundColor: '#f0fdf4',
    textAlign: 'center',
  },
  colEscopoTotal: {
    width: '46%',
    padding: 5,
    fontSize: 8.5,
    fontFamily: 'Times-Bold',
    color: '#064e3b',
    textTransform: 'uppercase',
    borderRightWidth: 0.5,
    borderRightColor: '#16a34a',
  },
  colPlanoTotal: {
    width: '18%',
    padding: 4,
    textAlign: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#16a34a',
  },
  colPlanoTotalRec: {
    width: '18%',
    padding: 4,
    textAlign: 'center',
    backgroundColor: '#bbf7d0',
  },
  precoMensal: {
    fontFamily: 'Times-Bold',
    fontSize: 8.5,
    color: '#14532d',
  },
  precoMensalRec: {
    fontFamily: 'Times-Bold',
    fontSize: 9,
    color: '#064e3b',
  },
  precoAnual: {
    fontFamily: 'Times-Roman',
    fontSize: 7,
    color: '#047857',
    marginTop: 1,
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

  // Itens da tabela comparativa dos 3 planos O&M
  const itensTabela = [
    {
      escopo: 'Monitoramento diário da geração em horários comerciais',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Sim',
    },
    {
      escopo: 'Relatório mensal analítico de desempenho e compensação',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Sim',
    },
    {
      escopo: 'Suporte técnico especializado direto com engenharia',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Ilimitado VIP',
    },
    {
      escopo: 'Intermediação e suporte com a concessionária (RGE)',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Prioritário',
    },
    {
      escopo: 'Configuração e suporte remoto ao datalogger/Wi-Fi',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Sim',
    },
    {
      escopo: 'Inspeção preventiva anual in loco e ensaios elétricos',
      essencial: 'Sob demanda',
      prevencao: '✓ 1x ao ano',
      completo: '✓ 1x ao ano',
    },
    {
      escopo: 'Reaperto de conexões, quadros e integridade dos grampos',
      essencial: '—',
      prevencao: '✓ Incluso',
      completo: '✓ Incluso',
    },
    {
      escopo: 'Verificação de desempenho, detecção de sombreamento e falhas',
      essencial: '—',
      prevencao: '✓ Anual',
      completo: '✓ Semestral',
    },
    {
      escopo: 'Limpeza técnica dos módulos solares com produto homologado',
      essencial: 'Avulso',
      prevencao: '✓ 1x ao ano',
      completo: '✓ 2x ao ano',
    },
  ]

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

        {/* 3. COMPARATIVO DE PLANOS DE GESTÃO E MANUTENÇÃO (Tabela com wrap={false}) */}
        <View wrap={false}>
          <Text style={styles.secaoTitulo}>3. COMPARATIVO DE PLANOS DE GESTÃO E MANUTENÇÃO</Text>

          <View style={styles.tabela}>
            {/* Header da Tabela */}
            <View style={styles.tabelaLinhaHeader} wrap={false}>
              <Text style={styles.colEscopoHeader}>Escopo do Serviço de O&amp;M</Text>
              <Text style={styles.colPlanoHeader}>Essencial</Text>
              <Text style={styles.colPlanoHeader}>Prevenção</Text>
              <Text style={styles.colPlanoHeaderRec}>Completo{'\n'}(Recomendado)</Text>
            </View>

            {/* Linhas de Escopo */}
            {itensTabela.map((item, idx) => (
              <View
                key={idx}
                style={[styles.tabelaLinha, idx % 2 === 1 ? styles.tabelaLinhaZebra : {}]}
                wrap={false}
              >
                <Text style={styles.colEscopoCell}>{item.escopo}</Text>
                <Text style={styles.colPlanoCell}>{item.essencial}</Text>
                <Text style={styles.colPlanoCell}>{item.prevencao}</Text>
                <Text style={styles.colPlanoCellRec}>{item.completo}</Text>
              </View>
            ))}

            {/* Linha Final de Valores de Investimento */}
            <View style={styles.tabelaLinhaDestaqueTotal} wrap={false}>
              <Text style={styles.colEscopoTotal}>Investimento Mensal</Text>
              <View style={styles.colPlanoTotal}>
                <Text style={styles.precoMensal}>{formatBRL(49.9)}/mês</Text>
                <Text style={styles.precoAnual}>({formatBRL(49.9 * 12)}/ano)</Text>
              </View>
              <View style={styles.colPlanoTotal}>
                <Text style={styles.precoMensal}>{formatBRL(74.9)}/mês</Text>
                <Text style={styles.precoAnual}>({formatBRL(74.9 * 12)}/ano)</Text>
              </View>
              <View style={styles.colPlanoTotalRec}>
                <Text style={styles.precoMensalRec}>{formatBRL(99.9)}/mês</Text>
                <Text style={styles.precoAnual}>({formatBRL(99.9 * 12)}/ano)</Text>
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

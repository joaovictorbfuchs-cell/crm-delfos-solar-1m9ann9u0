// Componente de documento de Proposta O&M para renderização via @react-pdf/renderer
// Utiliza estética limpa com margens alinhadas com o preview, fontes serif/sans harmônicas,
// cabeçalho com a logo correta da Delfos ao lado do título (sem cabeçalho antigo) e rodapé
// com faixa cinza clara centralizada em duas linhas + validade de 5 dias em verde.
import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  type DocumentProps,
} from '@react-pdf/renderer'
import { type PropostaPDFInput, DADOS_EMPRESA_DELFOS } from '@/lib/propostaOMGenerator'
import { formatCurrency } from '@/lib/formatters'
import logoDelfosCorreta from '@/assets/delfos-solar-1368d.png'

// Margens alinhadas com a visualização/preview da proposta O&M em tela (sem excesso de estreiteza)
export const MARGIN_VERTICAL_PROPOSTA = 24
export const MARGIN_HORIZONTAL_PROPOSTA = 26

// Compatibilidade retroativa para imports externos existentes
export const MARGIN_VERTICAL_25MM = MARGIN_VERTICAL_PROPOSTA
export const MARGIN_HORIZONTAL_007CM = MARGIN_HORIZONTAL_PROPOSTA

const styles = StyleSheet.create({
  page: {
    paddingTop: MARGIN_VERTICAL_PROPOSTA,
    paddingBottom: MARGIN_VERTICAL_PROPOSTA,
    paddingLeft: MARGIN_HORIZONTAL_PROPOSTA,
    paddingRight: MARGIN_HORIZONTAL_PROPOSTA,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    lineHeight: 1.35,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  // Título e Cabeçalho: logo da Delfos correta ao lado do título
  headerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  logoDelfos: {
    width: 64,
    height: 38,
    objectFit: 'contain',
  },
  tituloBox: {
    flex: 1,
  },
  tituloPrincipal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: '#064e3b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  subtituloPrincipal: {
    fontFamily: 'Helvetica',
    fontSize: 7.2,
    color: '#047857',
    lineHeight: 1.25,
  },
  badgeDataEmissao: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 5,
    paddingVertical: 3,
    paddingHorizontal: 7,
    alignSelf: 'center',
  },
  badgeDataTexto: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#166534',
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  // Blocos 2 colunas: Cliente e Usina
  cardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  cardColuna: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 7,
  },
  cardTitulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#065f46',
    marginBottom: 4,
    textTransform: 'uppercase',
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 2,
  },
  cardLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
    fontSize: 7.5,
  },
  cardLabel: {
    fontFamily: 'Helvetica',
    color: '#64748b',
    width: '38%',
  },
  cardValor: {
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    textAlign: 'right',
    width: '62%',
  },
  cardValorDestaque: {
    fontFamily: 'Helvetica-Bold',
    color: '#047857',
    textAlign: 'right',
    width: '62%',
  },
  // Box de Cenários de Exposição Financeira
  scenariosBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    padding: 7,
    marginBottom: 8,
  },
  scenariosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  scenariosTitulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.8,
    color: '#92400e',
    textTransform: 'uppercase',
  },
  scenariosSub: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#b45309',
  },
  scenariosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 5,
  },
  scenarioItem: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 0.8,
    borderColor: '#fcd34d',
    borderRadius: 5,
    padding: 4.5,
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
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#78350f',
    textAlign: 'center',
    marginBottom: 2,
    height: 15,
  },
  scenarioValor: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#b45309',
  },
  scenarioValorVerde: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#15803d',
  },
  scenarioValorVermelho: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#dc2626',
  },
  scenarioNota: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#78350f',
    marginTop: 4,
    lineHeight: 1.25,
  },
  // Título da Seção
  secaoTituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 4,
  },
  secaoTitulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    textTransform: 'uppercase',
    color: '#1f2937',
  },
  secaoBadgePlanos: {
    backgroundColor: '#ecfdf5',
    borderWidth: 0.5,
    borderColor: '#a7f3d0',
    borderRadius: 3,
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  secaoBadgePlanosText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#047857',
  },
  // Grid de Cards de Planos (3 cards lado a lado)
  planCardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 7,
    marginTop: 2,
    marginBottom: 8,
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
    fontFamily: 'Helvetica-Bold',
    fontSize: 5.8,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  planNome: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#111827',
    marginBottom: 2,
  },
  planPreco: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11.5,
    color: '#0d7a3e',
  },
  planPrecoUnidade: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0d7a3e',
  },
  planFaturamentoAnual: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#6b7280',
    marginTop: 1,
    marginBottom: 4,
  },
  planBulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  planBulletDot: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#9ca3af',
    width: 7,
  },
  planBulletTexto: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#4b5563',
    flex: 1,
    lineHeight: 1.25,
  },
  // Condições Gerais / Vigência
  condicoesBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    borderRadius: 5,
    padding: 6,
    marginBottom: 6,
  },
  condicoesTitulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0f172a',
    marginBottom: 2.5,
    textTransform: 'uppercase',
  },
  condicoesItem: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#334155',
    lineHeight: 1.3,
    marginBottom: 1,
  },
  // Observações adicionais
  observacoesBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 0.8,
    borderColor: '#86efac',
    borderRadius: 5,
    padding: 5,
    marginBottom: 6,
  },
  observacoesTitulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.2,
    color: '#166534',
    marginBottom: 1.5,
    textTransform: 'uppercase',
  },
  observacoesTexto: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#14532d',
    lineHeight: 1.25,
  },
  // Rodapé Oficial conforme modelo anexo
  footerContainer: {
    borderTopWidth: 0.8,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
    marginTop: 4,
  },
  footerStrip: {
    backgroundColor: '#f3f4f6',
    borderWidth: 0.8,
    borderColor: '#e5e7eb',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerLinha1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
    gap: 4,
  },
  footerLogoSmall: {
    width: 22,
    height: 12,
    objectFit: 'contain',
    marginRight: 2,
  },
  footerTextoEmpresa: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#0f172a',
  },
  footerTextoDivisor: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#94a3b8',
  },
  footerTextoDados: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#334155',
  },
  footerTextoLink: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.8,
    color: '#047857',
  },
  footerLinha2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  footerEndereco: {
    fontFamily: 'Helvetica',
    fontSize: 6.6,
    color: '#475569',
  },
  footerValidade: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.8,
    color: '#0d7a3e',
    marginTop: 1,
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
        {/* Cabeçalho com a logo correta da Delfos ao lado do Título (cabeçalho antigo removido) */}
        <View style={styles.headerBanner} wrap={false}>
          <View style={styles.headerLeftGroup}>
            <Image src={logoDelfosCorreta} style={styles.logoDelfos} />
            <View style={styles.tituloBox}>
              <Text style={styles.tituloPrincipal}>
                PROPOSTA DE GESTÃO E MANUTENÇÃO DE USINAS (O&amp;M)
              </Text>
              <Text style={styles.subtituloPrincipal}>
                Prevenção ativa, aumento de geração e proteção integral do seu investimento solar
                fotovoltaico
              </Text>
            </View>
          </View>
          <View style={styles.badgeDataEmissao}>
            <Text style={styles.badgeDataTexto}>Emissão: {dataFormatada}</Text>
          </View>
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
              <Text style={styles.scenarioLabel}>Perda 15% ao ano (Sujidade)</Text>
              <Text style={styles.scenarioValor}>{formatBRL(calculos.perda15Ano)}</Text>
            </View>
            <View style={styles.scenarioItem}>
              <Text style={styles.scenarioLabel}>Perda 20% ao ano (Sem Prev.)</Text>
              <Text style={styles.scenarioValor}>{formatBRL(calculos.perda20Ano)}</Text>
            </View>
            <View style={[styles.scenarioItem, styles.scenarioItemPerigo]}>
              <Text style={styles.scenarioLabel}>Prejuízo 30 dias (Falha)</Text>
              <Text style={styles.scenarioValorVermelho}>{formatBRL(calculos.prejuizo30Dias)}</Text>
            </View>
          </View>

          <Text style={styles.scenarioNota}>
            * Prejuízo por 20 dias de falha ou inversor desarmado sem alerta de monitoramento:{' '}
            <Text style={styles.bold}>{formatBRL(calculos.prejuizo20Dias)}</Text>. Um plano de
            O&amp;M se paga integralmente ao evitar apenas alguns dias de perda de geração ao ano.
          </Text>
        </View>

        {/* 3. PLANOS DE GESTÃO E MANUTENÇÃO (Contrato Anual) (Cards com wrap={false}) */}
        <View wrap={false}>
          <View style={styles.secaoTituloRow}>
            <Text style={styles.secaoTitulo}>PLANOS DE GESTÃO E MANUTENÇÃO (Contrato Anual)</Text>
            <View style={styles.secaoBadgePlanos}>
              <Text style={styles.secaoBadgePlanosText}>3 Modalidades Inclusas</Text>
            </View>
          </View>

          <View style={styles.planCardsGrid}>
            {/* Card 1: Plano Essencial */}
            <View style={styles.planCard}>
              <Text style={styles.planNome}>Plano Essencial</Text>
              <Text style={styles.planPreco}>
                {formatBRL(calculos.planos.Essencial.mensal)}
                <Text style={styles.planPrecoUnidade}>/mês</Text>
              </Text>
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

            {/* Card 2: Plano Inspeção */}
            <View style={styles.planCard}>
              <Text style={styles.planNome}>Plano Inspeção</Text>
              <Text style={styles.planPreco}>
                {formatBRL(calculos.planos.Inspeção.mensal)}
                <Text style={styles.planPrecoUnidade}>/mês</Text>
              </Text>
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
                {formatBRL(calculos.planos.Completo.mensal)}
                <Text style={styles.planPrecoUnidade}>/mês</Text>
              </Text>
              <View style={styles.planBulletItem}>
                <Text style={styles.planBulletDot}>•</Text>
                <Text style={styles.planBulletTexto}>Tudo do plano Inspeção</Text>
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
                <Text style={styles.planBulletTexto}>Suporte técnico limitado VIP</Text>
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
            NR-10 e NR-35 com equipamentos e instrumentos calibrados.
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

        {/* Rodapé Oficial conforme modelo anexo:
            Faixa cinza clara com as informações centradas em duas linhas:
            Linha 1: logo pequena Delfos + Delfos Engenharia Solar | CNPJ 21.379.952/0001-38 • (54) 99129-2121 • www.delfos.eng.br
            Linha 2: Rua Espírito Santo, 275 – Centro, Erechim/RS
            Abaixo: Proposta válida por 5 dias. (em verde escuro) */}
        <View style={styles.footerContainer} wrap={false}>
          <View style={styles.footerStrip}>
            {/* Linha 1 */}
            <View style={styles.footerLinha1}>
              <Image src={logoDelfosCorreta} style={styles.footerLogoSmall} />
              <Text style={styles.footerTextoEmpresa}>Delfos Engenharia Solar</Text>
              <Text style={styles.footerTextoDivisor}>|</Text>
              <Text style={styles.footerTextoDados}>CNPJ 21.379.952/0001-38</Text>
              <Text style={styles.footerTextoDivisor}>•</Text>
              <Text style={styles.footerTextoDados}>☎ (54) 99129-2121</Text>
              <Text style={styles.footerTextoDivisor}>•</Text>
              <Text style={styles.footerTextoLink}>🌐 www.delfos.eng.br</Text>
            </View>

            {/* Linha 2 */}
            <View style={styles.footerLinha2}>
              <Text style={styles.footerEndereco}>
                📍 Rua Espírito Santo, 275 – Centro, Erechim/RS
              </Text>
            </View>

            {/* Linha 3: Proposta válida por 5 dias. */}
            <Text style={styles.footerValidade}>Proposta válida por 5 dias.</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default PropostaOMPDFDocument

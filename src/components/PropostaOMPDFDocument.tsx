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
import {
  DADOS_EMPRESA_DELFOS,
  type PropostaPDFInput,
  type PropostaCalculos,
} from '@/lib/propostaOMGenerator'
import { formatCurrency } from '@/lib/formatters'
import { normalizarConteudoPropostaOM, type ConteudoOMSecao5Item } from '@/lib/conteudoPropostaOM'
import { normalizarNomePlanoOM, type PlanoOMChave } from '@/lib/planosOM'
import { OMPlanoTipo } from '@/types/crm'
import logoDelfosCorreta from '@/assets/delfos-solar-09ea2.png'

const styles = StyleSheet.create({
  page: {
    // Espaço reservado: cabeçalho e rodapé são fixos/repetidos em cada página.
    paddingTop: 94,
    paddingBottom: 62,
    paddingHorizontal: 32,
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    lineHeight: 1.35,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  header: {
    position: 'absolute',
    top: 18,
    left: 32,
    right: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#16a34a',
    paddingBottom: 7,
    gap: 10,
  },
  logo: { width: 70, height: 44, objectFit: 'contain' },
  headerText: { flex: 1 },
  title: { fontFamily: 'Helvetica-Bold', fontSize: 11, color: '#064e3b', marginBottom: 3 },
  subtitle: { fontSize: 7.5, color: '#047857' },
  meta: { alignItems: 'flex-end', maxWidth: 120 },
  badge: { color: '#166534', fontFamily: 'Helvetica-Bold', fontSize: 7, textAlign: 'right' },
  metaText: { fontSize: 6.8, color: '#475569', textAlign: 'right', marginTop: 2 },
  section: { marginBottom: 9 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.7,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 3,
    marginBottom: 5,
  },
  sectionNumber: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    width: 16,
    height: 16,
    textAlign: 'center',
    paddingTop: 4,
    borderRadius: 4,
    marginRight: 6,
  },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 8.3, color: '#111827' },
  sectionSubtitle: { fontSize: 6.7, color: '#64748b', marginTop: 1 },
  headingText: { flex: 1 },
  cards: { flexDirection: 'row', gap: 7 },
  card: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 0.7,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 7,
  },
  cardTitle: {
    fontFamily: 'Helvetica-Bold',
    color: '#065f46',
    fontSize: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
    paddingBottom: 3,
    marginBottom: 4,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  infoLabel: { color: '#64748b', fontSize: 6.8, width: '38%' },
  infoValue: {
    color: '#0f172a',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.8,
    textAlign: 'right',
    width: '62%',
  },
  highlight: {
    marginTop: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1.2,
    borderColor: '#86efac',
    borderRadius: 7,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  highlightText: { fontSize: 7.5, color: '#166534', lineHeight: 1.35 },
  highlightValue: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: '#064e3b' },
  scenarios: { flexDirection: 'row', gap: 6 },
  scenarioCard: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    borderRadius: 5,
    padding: 6,
    alignItems: 'center',
    minHeight: 45,
  },
  scenarioDanger: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  scenarioLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.3,
    textAlign: 'center',
    color: '#78350f',
    marginBottom: 3,
  },
  scenarioValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#92400e',
    textAlign: 'center',
  },
  dangerValue: { color: '#b91c1c' },
  noteBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 0.6,
    borderColor: '#fde68a',
    borderRadius: 5,
    padding: 7,
    marginTop: 6,
  },
  note: { fontSize: 6.7, color: '#78350f', marginBottom: 3, lineHeight: 1.35 },
  planGrid: { flexDirection: 'row', gap: 6 },
  planCard: { flex: 1, borderWidth: 0.8, borderColor: '#d1d5db', borderRadius: 5, padding: 7 },
  planRecommended: { borderWidth: 1.5, borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  recommendedBadge: {
    color: '#047857',
    fontSize: 5.8,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    marginBottom: 2,
  },
  planName: { fontFamily: 'Helvetica-Bold', fontSize: 7.7, color: '#111827', marginBottom: 3 },
  planPrice: { fontFamily: 'Helvetica-Bold', fontSize: 10, color: '#047857' },
  planAnnual: { fontSize: 6.5, color: '#64748b', marginTop: 1, marginBottom: 4 },
  bulletRow: { flexDirection: 'row', marginBottom: 2 },
  bullet: { color: '#16a34a', fontFamily: 'Helvetica-Bold', width: 8, fontSize: 6.7 },
  bulletText: { flex: 1, fontSize: 6.5, color: '#374151', lineHeight: 1.25 },
  selectedPlan: { marginTop: 4, fontFamily: 'Helvetica-Bold', color: '#047857', fontSize: 6.5 },
  listBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 0.7,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 7,
  },
  listRow: { flexDirection: 'row', marginBottom: 3 },
  listBullet: { color: '#16a34a', fontFamily: 'Helvetica-Bold', width: 9, fontSize: 7 },
  listText: { flex: 1, fontSize: 7, color: '#374151', lineHeight: 1.3 },
  trustGrid: { flexDirection: 'row', gap: 6 },
  trustCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 0.7,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 7,
  },
  trustTitle: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#111827', marginBottom: 3 },
  trustText: { fontSize: 6.5, color: '#4b5563', lineHeight: 1.3 },
  conditionRow: { flexDirection: 'row', marginBottom: 3 },
  conditionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.8, color: '#111827' },
  conditionText: { fontSize: 6.8, color: '#374151', lineHeight: 1.3 },
  stepsGrid: { flexDirection: 'row', gap: 5, marginBottom: 6 },
  stepCard: {
    flex: 1,
    backgroundColor: '#ecfdf5',
    borderWidth: 0.6,
    borderColor: '#bbf7d0',
    borderRadius: 5,
    padding: 6,
  },
  stepTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: '#047857', marginBottom: 2 },
  stepText: { fontSize: 6.2, color: '#4b5563', lineHeight: 1.25 },
  acceptance: {
    backgroundColor: '#f8fafc',
    borderWidth: 0.7,
    borderColor: '#e2e8f0',
    borderRadius: 5,
    padding: 7,
  },
  acceptanceText: { fontSize: 6.8, color: '#374151', lineHeight: 1.35, marginBottom: 4 },
  acceptanceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    padding: 5,
    marginBottom: 5,
  },
  signatureGrid: { flexDirection: 'row', gap: 12, marginTop: 16 },
  signature: {
    flex: 1,
    borderTopWidth: 0.6,
    borderTopColor: '#6b7280',
    paddingTop: 3,
    alignItems: 'center',
  },
  signatureName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.7,
    color: '#111827',
    textAlign: 'center',
  },
  signatureRole: { fontSize: 6.2, color: '#64748b', textAlign: 'center', marginTop: 2 },
  footer: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 15,
    borderTopWidth: 0.6,
    borderTopColor: '#e5e7eb',
    paddingTop: 4,
  },
  footerBox: {
    backgroundColor: '#f3f4f6',
    borderWidth: 0.6,
    borderColor: '#e5e7eb',
    borderRadius: 5,
    padding: 6,
    alignItems: 'center',
  },
  footerLine: { fontSize: 6.2, color: '#334155', textAlign: 'center', marginBottom: 2 },
  footerCompany: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: '#0f172a' },
  footerValidity: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#047857',
    marginTop: 2,
    textAlign: 'center',
  },
})

export interface PropostaOMPDFDocumentProps extends DocumentProps {
  dados: PropostaPDFInput
  observacoesAdicionais?: string
}

type PlanoComAlias = PlanoOMChave | 'Prevenção'

export const PropostaOMPDFDocument: React.FC<PropostaOMPDFDocumentProps> = ({
  dados,
  observacoesAdicionais,
  ...docProps
}) => {
  const { cliente, tecnico, parametros, calculos } = dados
  const conteudo = normalizarConteudoPropostaOM(dados.conteudo)
  const planoAtivo = normalizarNomePlanoOM(parametros.planoEscolhido || 'Completo') as OMPlanoTipo
  const dataEmissao = dados.dataEmissao || new Date().toISOString()
  const dataDate = new Date(dataEmissao)
  const dataValidade = new Date(dataDate)
  dataValidade.setDate(dataValidade.getDate() + (conteudo.rodape.validadeDias || 5))
  const formatDate = (date: Date) =>
    Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
  const money = (value?: number) => formatCurrency(Number(value) || 0)
  const geracaoAnual = (Number(tecnico.geracaoMediaKwh) || 0) * 12
  const valorAnualBruto = geracaoAnual * (Number(parametros.valorKwh) || 0)
  const planoKeys: Array<{ key: PlanoComAlias; benefits: string[]; recommended?: boolean }> = [
    { key: 'Essencial', benefits: conteudo.secao4.beneficiosEssencial },
    { key: 'Inspeção', benefits: conteudo.secao4.beneficiosInspecao },
    { key: 'Completo', benefits: conteudo.secao4.beneficiosCompleto, recommended: true },
  ]
  const getPlan = (key: PlanoComAlias) => {
    const calcKey: PlanoOMChave = key === 'Prevenção' ? 'Inspeção' : key
    return calculos.planos[calcKey]
  }
  const benefitsWithModules = (items: string[]) =>
    items.map((item) =>
      item.replace(
        '{numeroModulos}',
        tecnico.numeroModulos ? String(tecnico.numeroModulos) : 'conforme projeto',
      ),
    )
  const heading = (number: number, title: string, subtitle?: string) => (
    <View style={styles.sectionHeading} wrap={false}>
      <Text style={styles.sectionNumber}>{number}</Text>
      <View style={styles.headingText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  )
  const info = (label: string, value?: string | number, green = false) => (
    <View style={styles.infoRow} key={label}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, ...(green ? [{ color: '#047857' }] : [])]}>
        {value || 'Não informado'}
      </Text>
    </View>
  )

  return (
    <Document
      title={`Proposta O&M — ${cliente.nome || 'Cliente'}`}
      author={DADOS_EMPRESA_DELFOS.razaoSocial}
      subject="Proposta de Gestão e Manutenção de Usinas Fotovoltaicas (O&M)"
      {...docProps}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed wrap={false}>
          <Image src={logoDelfosCorreta} style={styles.logo} />
          <View style={styles.headerText}>
            <Text style={styles.title}>
              Proposta de Gestão e Manutenção de Usinas Fotovoltaicas (O&amp;M)
            </Text>
            <Text style={styles.subtitle}>
              Prevenção ativa, aumento de geração e proteção do investimento solar.
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.badge}>{conteudo.secao1.badgeEmissao}</Text>
            <Text style={styles.metaText}>
              Proposta nº {dados.referenciaProposta || 'Em elaboração'}
            </Text>
            <Text style={styles.metaText}>Emissão: {formatDate(dataDate)}</Text>
            <Text style={styles.metaText}>Válida até: {formatDate(dataValidade)}</Text>
            {dados.autor ? <Text style={styles.metaText}>Elaborado por: {dados.autor}</Text> : null}
          </View>
        </View>

        <View style={styles.section}>
          {heading(1, conteudo.secao1.titulo, conteudo.secao1.subtitulo)}
          <View style={styles.cards}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dados do Cliente</Text>
              {info('Razão social:', cliente.nome)}
              {info('CPF/CNPJ:', cliente.cpfOuCnpj)}
              {info('Município:', cliente.municipio || tecnico.municipio)}
              {info('Endereço:', cliente.endereco)}
              {info('Telefone:', cliente.telefone)}
              {info('E-mail:', cliente.email)}
            </View>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dados Técnicos da Usina</Text>
              {info(
                'Potência:',
                `${(Number(tecnico.potenciaKwp) || 0).toLocaleString('pt-BR')} kWp`,
                true,
              )}
              {info(
                'Geração estimada:',
                `${(Number(tecnico.geracaoMediaKwh) || 0).toLocaleString('pt-BR')} kWh/mês`,
              )}
              {info('Inversor:', tecnico.marcaInversores)}
              {info(
                'Módulos:',
                tecnico.numeroModulos ? `${tecnico.numeroModulos} unidades` : 'Conforme projeto',
              )}
              {info('Instalação:', tecnico.tipoInstalacao)}
              {info('Tarifa base:', `${money(parametros.valorKwh)} / kWh`, true)}
            </View>
          </View>
          <View style={styles.highlight}>
            <Text style={styles.highlightText}>
              {conteudo.secao1.cardAnualDestaquePrefixo}{' '}
              <Text style={styles.highlightValue}>{money(valorAnualBruto)}/ano</Text>{' '}
              {conteudo.secao1.cardAnualDestaqueSufixo}
            </Text>
            <Text style={styles.highlightText}>
              Base estimada: {geracaoAnual.toLocaleString('pt-BR')} kWh/ano ×{' '}
              {money(parametros.valorKwh)}/kWh.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          {heading(2, conteudo.secao2.titulo, conteudo.secao2.subtitulo)}
          <View style={styles.scenarios}>
            <View style={styles.scenarioCard} wrap>
              <Text style={styles.scenarioLabel}>{conteudo.secao2.tituloCardPerda20}</Text>
              <Text style={styles.scenarioValue}>{money(calculos.perda20Ano)}</Text>
              <Text style={styles.scenarioLabel}>{conteudo.secao2.subtituloCardPerda20}</Text>
            </View>
            <View style={[styles.scenarioCard, styles.scenarioDanger]} wrap>
              <Text style={[styles.scenarioLabel, { color: '#991b1b' }]}>
                {conteudo.secao2.tituloCardFalha30}
              </Text>
              <Text style={[styles.scenarioValue, styles.dangerValue]}>
                {money(calculos.prejuizo30Dias)}
              </Text>
              <Text style={[styles.scenarioLabel, { color: '#991b1b' }]}>
                {conteudo.secao2.subtituloCardFalha30}
              </Text>
            </View>
          </View>
          <View style={styles.noteBox}>
            <Text style={styles.note}>{conteudo.secao2.textoRiscoGarantia}</Text>
            <Text style={styles.note}>{conteudo.secao2.textoEvidenciaSujidade}</Text>
            <Text style={[styles.note, { color: '#047857' }]}>
              {conteudo.secao2.fonteEvidenciaSujidade}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          {heading(3, conteudo.secao4.titulo, 'Escolha a modalidade ideal para sua usina')}
          <View style={styles.planGrid}>
            {planoKeys.map((plano) => {
              const dadosPlano = getPlan(plano.key)
              const selecionado = planoAtivo === plano.key
              return (
                <View
                  key={plano.key}
                  style={[styles.planCard, ...(plano.recommended ? [styles.planRecommended] : [])]}
                  wrap={false}
                >
                  {plano.recommended ? (
                    <Text style={styles.recommendedBadge}>{conteudo.secao4.seloRecomendado}</Text>
                  ) : null}
                  <Text style={styles.planName}>Plano {plano.key}</Text>
                  <Text style={styles.planPrice}>{money(dadosPlano?.mensal)} /mês</Text>
                  <Text style={styles.planAnnual}>
                    Investimento anual: {money(dadosPlano?.anual)}
                  </Text>
                  {benefitsWithModules(plano.benefits).map((beneficio, idx) => (
                    <View key={`${plano.key}-${idx}`} style={styles.bulletRow}>
                      <Text style={styles.bullet}>✓</Text>
                      <Text style={styles.bulletText}>{beneficio}</Text>
                    </View>
                  ))}
                  {selecionado ? (
                    <Text style={styles.selectedPlan}>Plano selecionado ✓</Text>
                  ) : null}
                </View>
              )
            })}
          </View>
        </View>

        <View break style={styles.section} wrap={false}>
          {heading(4, conteudo.secaoEscopoTecnico.titulo, conteudo.secaoEscopoTecnico.subtitulo)}
          <View style={styles.listBox}>
            {conteudo.secaoEscopoTecnico.itens.map((item) => (
              <View key={item.id} style={styles.listRow}>
                <Text style={styles.listBullet}>✓</Text>
                <Text style={styles.listText}>{item.texto}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          {heading(5, conteudo.secao5.titulo)}
          <View style={styles.trustGrid}>
            {conteudo.secao5.itens.map((item: ConteudoOMSecao5Item) => (
              <View key={item.id} style={styles.trustCard}>
                <Text style={styles.trustTitle}>{item.titulo}</Text>
                <Text style={styles.trustText}>{item.descricao}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          {heading(6, conteudo.secao7.titulo)}
          <View style={styles.listBox}>
            {conteudo.secao7.itens.map((item) => (
              <View key={item.id} style={styles.conditionRow}>
                <Text style={styles.listBullet}>•</Text>
                <Text style={styles.conditionText}>
                  <Text style={styles.conditionTitle}>{item.titulo}: </Text>
                  {item.descricao}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          {heading(7, conteudo.secao8.titulo, 'Seleção do plano e aceite preliminar')}
          <View style={styles.stepsGrid}>
            {conteudo.secao8.passos.map((passo) => (
              <View key={passo.numero} style={styles.stepCard}>
                <Text style={styles.stepTitle}>
                  {passo.numero}. {passo.titulo}
                </Text>
                <Text style={styles.stepText}>{passo.descricao}</Text>
              </View>
            ))}
          </View>
          <View style={styles.acceptance}>
            <View style={styles.acceptanceSummary}>
              <Text style={styles.conditionText}>Plano selecionado: Plano {planoAtivo}</Text>
              <Text style={styles.conditionTitle}>
                {money(getPlan(planoAtivo)?.mensal)}/mês • {money(getPlan(planoAtivo)?.anual)}/ano
              </Text>
            </View>
            <Text style={styles.acceptanceText}>{conteudo.secao8.textoTermoAceite}</Text>
            <Text style={styles.acceptanceText}>{conteudo.secao8.termoAutorizacao}</Text>
            <View style={styles.signatureGrid}>
              <View style={styles.signature}>
                <Text style={styles.signatureName}>{cliente.nome}</Text>
                <Text style={styles.signatureRole}>Responsável • CPF • Data</Text>
              </View>
              <View style={styles.signature}>
                <Text style={styles.signatureName}>DELFOS ENGENHARIA SOLAR</Text>
                <Text style={styles.signatureRole}>
                  {conteudo.secao8.responsavelDelfosCargo} • CNPJ {conteudo.secao8.cnpjDelfos}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {observacoesAdicionais ? (
          <View style={styles.noteBox}>
            <Text style={styles.conditionTitle}>Observações comerciais</Text>
            <Text style={styles.note}>{observacoesAdicionais}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed wrap={false}>
          <View style={styles.footerBox}>
            <Text style={styles.footerLine}>
              <Text style={styles.footerCompany}>{conteudo.rodape.empresaNome}</Text>
              {'  •  '}CNPJ {conteudo.rodape.cnpj}
              {'  •  '}
              {conteudo.rodape.telefone}
              {'  •  '}
              {conteudo.rodape.site}
            </Text>
            <Text style={styles.footerLine}>{conteudo.rodape.endereco}</Text>
            <Text style={styles.footerValidity}>
              {conteudo.rodape.textoValidade} Válida até {formatDate(dataValidade)}.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default PropostaOMPDFDocument

import React from 'react'
import logoDelfosPng from '@/assets/delfos-solar-5b5ce.png'
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  type DocumentProps,
} from '@react-pdf/renderer'
import type { OrdemServico, Cliente, Sistema } from '@/types/crm'
import { compilarDadosRelatorioOS, type RelatorioOSCanonicalData } from '@/lib/relatorioOSCanonical'

export interface RelatorioOSRodapeComercial {
  titulo?: string
  descricao?: string
  indicacao?: string
  contato?: string
}

// Margem interna de ~15mm em pontos: 15 * 72 / 25.4 = ~42.5pt
const MARGIN_PAGE = 36

export interface RelatorioOSPDFDados {
  os: OrdemServico
  cliente?: Cliente | null
  sistema?: Sistema | null
  fotosDataUrls?: string[]
  inversoresInfo?: string
  assinaturaBase64?: string
  rodapeComercial?: RelatorioOSRodapeComercial | null
}

export interface RelatorioOSPDFDocumentProps extends DocumentProps {
  dados: RelatorioOSPDFDados
}

const styles = StyleSheet.create({
  page: {
    padding: MARGIN_PAGE,
    fontFamily: 'Helvetica',
    fontSize: 9,
    lineHeight: 1.45,
    color: '#1A2332',
    backgroundColor: '#FFFFFF',
  },

  // 1. Cabeçalho Timbrado Azul-marinho #0E2A47
  timbradoHeader: {
    backgroundColor: '#0E2A47',
    color: '#FFFFFF',
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
  },
  timbradoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomStyle: 'solid',
    paddingBottom: 8,
    marginBottom: 8,
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoImage: {
    width: 58,
    height: 34,
    objectFit: 'contain',
    marginRight: 10,
  },
  brandLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C9A227',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  brandLogoLetter: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 16,
    color: '#0E2A47',
  },
  brandTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  brandSub: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#E2E8F0',
    marginTop: 1,
  },
  timbradoMeta: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#C2D3E8',
    lineHeight: 1.4,
  },

  // 2. Título & Meta Pills
  titleCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4EE',
    borderTopWidth: 3,
    borderTopColor: '#0E2A47',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  docMainTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#0E2A47',
    marginBottom: 6,
  },
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: '#DDE4EE',
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
  metaPillItem: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#536377',
    marginRight: 14,
  },
  metaPillStrong: {
    fontFamily: 'Helvetica-Bold',
    color: '#0E2A47',
  },

  // Cards de Seção
  repCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4EE',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: '#0E2A47',
    borderBottomWidth: 1.5,
    borderBottomColor: '#EBF0F7',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
    marginBottom: 8,
  },

  // Grid de Resumo
  grid2Cols: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  gridCell: {
    flex: 1,
    marginRight: 6,
  },
  gridCellLast: {
    flex: 1,
    marginRight: 0,
  },
  gridLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#536377',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  gridValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#0E2A47',
  },

  // 4. Card Destaque Dourado
  highlightCard: {
    backgroundColor: '#FCF8EB',
    borderWidth: 1,
    borderColor: '#E8D388',
    borderLeftWidth: 4,
    borderLeftColor: '#C9A227',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  highlightTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: '#5D4300',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D388',
    borderBottomStyle: 'solid',
    paddingBottom: 4,
    marginBottom: 6,
  },
  highlightText: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#272109',
    lineHeight: 1.5,
    textAlign: 'justify',
  },

  // 5. Badges de Status
  badgesRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  statusPillBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F9F4',
    borderWidth: 1,
    borderColor: '#B8E4C7',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 6,
    marginRight: 6,
  },
  statusPillBoxLast: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F9F4',
    borderWidth: 1,
    borderColor: '#B8E4C7',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 6,
    marginRight: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B8342',
    marginRight: 6,
  },
  statusContentTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#2C6B40',
    textTransform: 'uppercase',
  },
  statusContentVal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#0E5325',
  },
  statusNote: {
    fontFamily: 'Helvetica-Oblique',
    fontSize: 6.8,
    color: '#536377',
    marginTop: 2,
  },

  // Tabelas
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1.5,
    borderBottomColor: '#DDE4EE',
    borderBottomStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4EE',
    borderBottomStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: '#FAFCFE',
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4EE',
    borderBottomStyle: 'solid',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  thText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#0E2A47',
    textTransform: 'uppercase',
  },
  tdText: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#1A2332',
  },
  badgeDone: {
    backgroundColor: '#E8F7EE',
    borderWidth: 1,
    borderColor: '#B8E4C7',
    borderStyle: 'solid',
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    color: '#126330',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textAlign: 'center',
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderStyle: 'solid',
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    color: '#92400E',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textAlign: 'center',
  },
  badgeNormal: {
    backgroundColor: '#EBF3FC',
    borderWidth: 1,
    borderColor: '#B9D5F5',
    borderStyle: 'solid',
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    color: '#0F5195',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textAlign: 'center',
  },

  // Sub-box da limpeza
  subBox: {
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 7,
    marginTop: 8,
  },
  subBoxTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0E2A47',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subBoxGridRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  subBoxItem: {
    flex: 1,
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#536377',
  },
  subBoxStrong: {
    fontFamily: 'Helvetica-Bold',
    color: '#0E2A47',
  },

  // Fotos
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  photoGroupBlock: {
    backgroundColor: '#F8FAFD',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 6,
    marginBottom: 8,
  },
  photoGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderBottomStyle: 'solid',
    paddingBottom: 3,
    marginBottom: 5,
  },
  photoGroupTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0E2A47',
    textTransform: 'uppercase',
  },
  photoGroupCount: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#536377',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDE4EE',
    borderStyle: 'solid',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  photoCard: {
    width: '31.3%',
    backgroundColor: '#F4F7FA',
    borderWidth: 1,
    borderColor: '#DDE4EE',
    borderStyle: 'solid',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: '3%',
    marginBottom: 6,
  },
  photoCardLastInRow: {
    width: '31.3%',
    backgroundColor: '#F4F7FA',
    borderWidth: 1,
    borderColor: '#DDE4EE',
    borderStyle: 'solid',
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 0,
    marginBottom: 6,
  },
  photoThumbBox: {
    height: 110,
    backgroundColor: '#163e68',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  photoThumbImage: {
    width: '100%',
    height: 110,
    objectFit: 'cover',
  },
  photoThumbTag: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  photoCaption: {
    padding: 5,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EAEFF5',
    borderTopStyle: 'solid',
  },
  photoCaptionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#0E2A47',
    marginBottom: 1,
  },
  photoCaptionDesc: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#536377',
    lineHeight: 1.3,
  },

  // Avisos & Conclusão
  boxSuccess: {
    backgroundColor: '#F1F9F4',
    borderWidth: 1,
    borderColor: '#B8E4C7',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 7,
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#0E5325',
    marginBottom: 6,
  },
  boxInfo: {
    backgroundColor: '#F0F6FC',
    borderLeftWidth: 3,
    borderLeftColor: '#0E2A47',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 8,
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#1A314E',
    lineHeight: 1.45,
  },
  conclusionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F5F8FC',
    borderWidth: 1,
    borderColor: '#D7E2F0',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 6,
    marginTop: 6,
  },
  conclusionMetaItem: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#1A2332',
    marginRight: 10,
  },

  // Plano O&M
  planCard: {
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: '#E5D38A',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    marginBottom: 6,
  },
  planTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#5D4300',
    marginBottom: 3,
  },
  planBody: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#2F2A14',
    lineHeight: 1.4,
    marginBottom: 4,
  },
  planContact: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0E2A47',
  },
  referralNote: {
    backgroundColor: '#FCF5DF',
    borderRadius: 4,
    padding: 5,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#5D4300',
  },

  // Recebimento
  receiptGrid: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  receiptCell: {
    flex: 1,
    marginRight: 6,
  },
  receiptCellLast: {
    flex: 1,
    marginRight: 0,
  },

  // Rodapé Timbrado Azul-marinho #0E2A47
  timbradoFooter: {
    backgroundColor: '#0E2A47',
    color: '#FFFFFF',
    borderRadius: 6,
    padding: 10,
    marginTop: 6,
  },
  footerText: {
    fontFamily: 'Helvetica',
    fontSize: 6.8,
    color: '#D2DFEE',
    lineHeight: 1.35,
    marginBottom: 2,
  },
  footerDivider: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderTopStyle: 'solid',
    marginVertical: 4,
  },
  footerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerBottomText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#A9C2DF',
  },
})

export const RelatorioOSPDFDocument: React.FC<RelatorioOSPDFDocumentProps> = ({
  dados,
  ...docProps
}) => {
  const os = dados.os || ({} as any)
  const cliente = dados.cliente || os.expand?.cliente_id || null
  const sistema = dados.sistema || null
  const clientePossuiContratoOMAtivo = (dados as any)?.clientePossuiContratoOMAtivo ?? false
  const fotosDataUrls = Array.isArray(dados.fotosDataUrls) ? dados.fotosDataUrls : []

  const relatorio: RelatorioOSCanonicalData = compilarDadosRelatorioOS(
    os,
    cliente,
    sistema,
    fotosDataUrls,
    { clientePossuiContratoOMAtivo },
  )

  return (
    <Document
      title={`Relatório de Atendimento — ${relatorio.osCodigo}`}
      author="DELFOS ENGENHARIA SOLAR"
      subject="Relatório de Atendimento e Condição do Sistema"
      {...docProps}
    >
      <Page size="A4" style={styles.page}>
        {/* 1. Cabeçalho Timbrado */}
        <View style={styles.timbradoHeader} wrap={false}>
          <View style={styles.timbradoTop}>
            <View style={styles.brandGroup}>
              <Image src={logoDelfosPng} style={styles.brandLogoImage} />
              <View>
                <Text style={styles.brandTitle}>DELFOS ENGENHARIA SOLAR</Text>
                <Text style={styles.brandSub}>
                  Engenharia &amp; Operação de Usinas Fotovoltaicas
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.timbradoMeta}>
            Delfos Engenharia Ltda • CNPJ 21.379.952/0001-38 • Rua Espírito Santo, 275 – Erechim/RS,
            CEP 99709-296
          </Text>
          <Text style={styles.timbradoMeta}>
            Telefone: (54) 99129-2121 • E-mail: solar@updates.delfos.eng.br • Web: www.delfos.eng.br
          </Text>
        </View>

        {/* 2. Título & Meta Pills */}
        <View style={styles.titleCard} wrap={false}>
          <Text style={styles.docMainTitle}>Relatório de Atendimento e Condição do Sistema</Text>
          <View style={styles.metaPillsRow}>
            <Text style={styles.metaPillItem}>
              <Text style={styles.metaPillStrong}>Relatório nº: </Text>
              {relatorio.numeroRelatorio}
            </Text>
            <Text style={styles.metaPillItem}>
              <Text style={styles.metaPillStrong}>OS vinculada: </Text>
              {relatorio.osCodigo}
            </Text>
            <Text style={styles.metaPillItem}>
              <Text style={styles.metaPillStrong}>Revisão: </Text>
              {relatorio.revisao}
            </Text>
            <Text style={styles.metaPillItem}>
              <Text style={styles.metaPillStrong}>Data de emissão: </Text>
              {relatorio.dataEmissao}
            </Text>
          </View>
        </View>

        {/* 3. Resumo do Atendimento */}
        <View style={styles.repCard} wrap={false}>
          <Text style={styles.sectionTitle}>Resumo do atendimento</Text>
          <View style={styles.grid2Cols}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Cliente</Text>
              <Text style={styles.gridValue}>{relatorio.clienteNome}</Text>
            </View>
            <View style={styles.gridCellLast}>
              <Text style={styles.gridLabel}>Endereço da usina</Text>
              <Text style={styles.gridValue}>{relatorio.enderecoUsina}</Text>
            </View>
          </View>

          <View style={styles.grid2Cols}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Data do atendimento</Text>
              <Text style={styles.gridValue}>{relatorio.dataAtendimento}</Text>
            </View>
            <View style={styles.gridCellLast}>
              <Text style={styles.gridLabel}>Horários (Início / Término)</Text>
              <Text style={styles.gridValue}>{relatorio.horarioInicioTermino}</Text>
            </View>
          </View>

          <View style={styles.grid2Cols}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Tipo de serviço</Text>
              <Text style={styles.gridValue}>{relatorio.tipoServico}</Text>
            </View>
            <View style={styles.gridCellLast}>
              <Text style={styles.gridLabel}>Concessionária &amp; UC</Text>
              <Text style={styles.gridValue}>{relatorio.concessionariaUc}</Text>
            </View>
          </View>

          <View style={{ marginTop: 2 }}>
            <Text style={styles.gridLabel}>Dados do sistema gerador</Text>
            <Text style={styles.gridValue}>{relatorio.dadosSistemaGerador}</Text>
          </View>
        </View>

        {/* 4. Badges de Status */}
        <View style={styles.repCard} wrap={false}>
          <View style={styles.badgesRow}>
            <View style={styles.statusPillBox}>
              <View style={styles.statusDot} />
              <View>
                <Text style={styles.statusContentTitle}>Situação do atendimento</Text>
                <Text style={styles.statusContentVal}>{relatorio.situacaoAtendimento}</Text>
              </View>
            </View>
            <View style={styles.statusPillBoxLast}>
              <View style={styles.statusDot} />
              <View>
                <Text style={styles.statusContentTitle}>Condição do sistema ao término</Text>
                <Text style={styles.statusContentVal}>{relatorio.condicaoSistema}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 5. Serviços Executados e Condição do Sistema por Componente (Unificados) */}
        <View style={styles.repCard} wrap={false}>
          <Text style={styles.sectionTitle}>
            Serviços executados e condição do sistema por componente
          </Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.thText, { flex: 4 }]}>Atividade</Text>
            <Text style={[styles.thText, { flex: 2, textAlign: 'center' }]}>Situação</Text>
            <Text style={[styles.thText, { flex: 2 }]}>Evidência</Text>
          </View>
          {relatorio.servicosExecutados.map((item, idx) => (
            <View key={idx} style={idx % 2 === 1 ? styles.tableRowAlt : styles.tableRow}>
              <Text style={[styles.tdText, { flex: 4, fontFamily: 'Helvetica-Bold' }]}>
                {item.atividade}
              </Text>
              <View style={{ flex: 2, alignItems: 'center' }}>
                <Text
                  style={
                    item.situacao === 'Executado' || item.situacao === 'Executado integralmente'
                      ? styles.badgeDone
                      : styles.badgePending
                  }
                >
                  {item.situacao === 'Executado' || item.situacao === 'Executado integralmente'
                    ? 'Executado'
                    : 'Pendente'}
                </Text>
              </View>
              <Text style={[styles.tdText, { flex: 2, color: '#536377' }]}>{item.evidencia}</Text>
            </View>
          ))}
        </View>

        {/* 6. Registro Fotográfico — Agrupado por etapa do checklist com todas as fotos e badges únicos */}
        <View style={styles.repCard} wrap={false}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Registro fotográfico</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: '#536377' }}>
              {relatorio.fotos.length}{' '}
              {relatorio.fotos.length === 1 ? 'foto registrada' : 'fotos registradas'}
            </Text>
          </View>

          {Array.isArray(relatorio.fotosPorEtapa) && relatorio.fotosPorEtapa.length > 0 ? (
            <View>
              {relatorio.fotosPorEtapa.map((grupo, gIdx) => (
                <View
                  key={grupo.itemChecklistId || `pdf-grupo-${gIdx}`}
                  style={styles.photoGroupBlock}
                >
                  <View style={styles.photoGroupHeader}>
                    <Text style={styles.photoGroupTitle}>{grupo.itemChecklistTexto}</Text>
                    <Text style={styles.photoGroupCount}>
                      {grupo.fotos.length} {grupo.fotos.length === 1 ? 'foto' : 'fotos'}
                    </Text>
                  </View>
                  <View style={styles.photosGrid}>
                    {grupo.fotos.map((foto, idx) => {
                      const isLastInRow = (idx + 1) % 3 === 0
                      const fotoNumGeral = foto.numeroGlobal || idx + 1
                      return (
                        <View
                          key={foto.id || `pdf-foto-${gIdx}-${idx}`}
                          style={isLastInRow ? styles.photoCardLastInRow : styles.photoCard}
                        >
                          {foto.url ? (
                            <View style={{ position: 'relative' }}>
                              <Image src={foto.url} style={styles.photoThumbImage} />
                              <View
                                style={{
                                  position: 'absolute',
                                  top: 2,
                                  left: 2,
                                  backgroundColor: 'rgba(14, 42, 71, 0.85)',
                                  borderRadius: 2,
                                  paddingHorizontal: 3,
                                  paddingVertical: 1,
                                }}
                              >
                                <Text
                                  style={{
                                    fontFamily: 'Helvetica-Bold',
                                    fontSize: 5.5,
                                    color: '#FFFFFF',
                                  }}
                                >
                                  Foto {fotoNumGeral}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={styles.photoThumbBox}>
                              <Text style={styles.photoThumbTag}>{foto.titulo}</Text>
                            </View>
                          )}
                        </View>
                      )
                    })}
                  </View>
                </View>
              ))}

              {Array.isArray(relatorio.fotosGeraisSemEtapa) &&
                relatorio.fotosGeraisSemEtapa.length > 0 && (
                  <View style={styles.photoGroupBlock}>
                    <View style={styles.photoGroupHeader}>
                      <Text style={styles.photoGroupTitle}>Outros registros fotográficos</Text>
                      <Text style={styles.photoGroupCount}>
                        {relatorio.fotosGeraisSemEtapa.length}{' '}
                        {relatorio.fotosGeraisSemEtapa.length === 1 ? 'foto' : 'fotos'}
                      </Text>
                    </View>
                    <View style={styles.photosGrid}>
                      {relatorio.fotosGeraisSemEtapa.map((foto, idx) => {
                        const isLastInRow = (idx + 1) % 3 === 0
                        const fotoNumGeral = foto.numeroGlobal || idx + 1
                        return (
                          <View
                            key={foto.id || `pdf-foto-geral-${idx}`}
                            style={isLastInRow ? styles.photoCardLastInRow : styles.photoCard}
                          >
                            {foto.url ? (
                              <View style={{ position: 'relative' }}>
                                <Image src={foto.url} style={styles.photoThumbImage} />
                                <View
                                  style={{
                                    position: 'absolute',
                                    top: 2,
                                    left: 2,
                                    backgroundColor: 'rgba(14, 42, 71, 0.85)',
                                    borderRadius: 2,
                                    paddingHorizontal: 3,
                                    paddingVertical: 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontFamily: 'Helvetica-Bold',
                                      fontSize: 5.5,
                                      color: '#FFFFFF',
                                    }}
                                  >
                                    Foto {fotoNumGeral}
                                  </Text>
                                </View>
                              </View>
                            ) : (
                              <View style={styles.photoThumbBox}>
                                <Text style={styles.photoThumbTag}>{foto.titulo}</Text>
                              </View>
                            )}
                          </View>
                        )
                      })}
                    </View>
                  </View>
                )}
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {relatorio.fotos.map((foto, idx) => {
                const isLastInRow = (idx + 1) % 3 === 0
                const fotoNumGeral = foto.numeroGlobal || idx + 1
                return (
                  <View
                    key={foto.id || `pdf-foto-${idx}`}
                    style={isLastInRow ? styles.photoCardLastInRow : styles.photoCard}
                  >
                    {foto.url ? (
                      <View style={{ position: 'relative' }}>
                        <Image src={foto.url} style={styles.photoThumbImage} />
                        <View
                          style={{
                            position: 'absolute',
                            top: 2,
                            left: 2,
                            backgroundColor: 'rgba(14, 42, 71, 0.85)',
                            borderRadius: 2,
                            paddingHorizontal: 3,
                            paddingVertical: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'Helvetica-Bold',
                              fontSize: 5.5,
                              color: '#FFFFFF',
                            }}
                          >
                            Foto {fotoNumGeral}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.photoThumbBox}>
                        <Text style={styles.photoThumbTag}>{foto.titulo}</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>

        {/* 7. Pendências e Recomendações */}
        <View style={styles.repCard} wrap={false}>
          <Text style={styles.sectionTitle}>Pendências e recomendações</Text>
          {relatorio.pendenciasRecomendacoes ? (
            <View
              style={{
                backgroundColor: '#F8FAFD',
                borderWidth: 1,
                borderColor: '#DDE4EE',
                borderRadius: 4,
                padding: 6,
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Helvetica',
                  fontSize: 7.5,
                  color: '#1A2332',
                  lineHeight: 1.4,
                }}
              >
                {relatorio.pendenciasRecomendacoes}
              </Text>
            </View>
          ) : (
            <View style={styles.boxSuccess}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                ✓ Conformidade técnica: {relatorio.conformidadeTecnica}
              </Text>
            </View>
          )}
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: '#0E2A47' }}>
            📅 Próxima manutenção prevista: {relatorio.proximaManutencao} (semestral, conforme plano
            de manutenção).
          </Text>
        </View>

        {/* 9. Próximos Passos */}
        <View style={styles.repCard} wrap={false}>
          <Text style={styles.sectionTitle}>Próximos passos</Text>
          <Text
            style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: '#2C3E50', marginBottom: 4 }}
          >
            {relatorio.proximosPassosTexto}
          </Text>
          {relatorio.exibirPlanoOM && (
            <View style={styles.planCard}>
              <Text style={styles.planTitle}>{relatorio.planoOmTitulo}</Text>
              <Text style={styles.planBody}>{relatorio.planoOmTexto}</Text>
              <Text style={styles.planContact}>{relatorio.planoOmContato}</Text>
            </View>
          )}
        </View>

        {/* 10. Recebimento do Cliente */}
        <View style={styles.repCard} wrap={false}>
          <Text style={styles.sectionTitle}>Recebimento do cliente</Text>
          <View style={styles.receiptGrid}>
            <View style={styles.receiptCell}>
              <Text style={styles.gridLabel}>Forma e data de envio</Text>
              <Text style={styles.gridValue}>{relatorio.formaEDataEnvio}</Text>
            </View>
            <View style={styles.receiptCellLast}>
              <Text style={styles.gridLabel}>Recebido por</Text>
              <Text style={styles.gridValue}>{relatorio.recebidoPor}</Text>
            </View>
          </View>
          <Text
            style={{
              fontFamily: 'Helvetica',
              fontSize: 6.5,
              color: '#536377',
              borderTopWidth: 1,
              borderTopColor: '#DDE4EE',
              borderTopStyle: 'dashed',
              paddingTop: 4,
            }}
          >
            * Nota: A confirmação registra o recebimento deste documento e das recomendações nele
            descritas. Não representa certificação técnica da instalação pelo cliente.
          </Text>
        </View>

        {/* 14. Rodapé Timbrado */}
        <View style={styles.timbradoFooter} wrap={false}>
          <Text style={styles.footerText}>
            <Text style={{ fontFamily: 'Helvetica-Bold', color: '#FFFFFF' }}>
              Documento oficial Delfos Solar
            </Text>{' '}
            — Atendimento técnico autorizado em estrita conformidade com as normas ABNT NBR 16690 e
            NR-10 (Segurança em Instalações e Serviços em Eletricidade).
          </Text>
          <Text style={styles.footerText}>
            Central de Operação e Suporte: (54) 99129-2121 • solar@updates.delfos.eng.br • Rua
            Espírito Santo, 275 – Erechim/RS
          </Text>
          <View style={styles.footerDivider} />
          <View style={styles.footerBottomRow}>
            <Text style={styles.footerBottomText}>
              Relatório {relatorio.numeroRelatorio} • OS {relatorio.osCodigo} • Revisão{' '}
              {relatorio.revisao}
            </Text>
            <Text style={styles.footerBottomText}>
              Delfos Engenharia Solar © {new Date().getFullYear()}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default RelatorioOSPDFDocument

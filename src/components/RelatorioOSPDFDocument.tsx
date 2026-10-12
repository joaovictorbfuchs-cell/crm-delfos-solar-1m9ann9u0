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
import type { OrdemServico, Cliente, Sistema, OSChecklistItem } from '@/types/crm'

export interface RelatorioOSRodapeComercial {
  titulo?: string
  descricao?: string
  indicacao?: string
  contato?: string
}

// Margem interna de 25mm em pontos: 25 * 72 / 25.4 = ~70.87pt (idêntico à Procuração e Contrato O&M)
const MARGIN_25MM = 70.87

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
    padding: MARGIN_25MM,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.45,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  // Cabeçalho Institucional
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#16A34A',
    borderBottomStyle: 'solid',
    paddingBottom: 10,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'column',
    maxWidth: '68%',
  },
  headerLogoBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerBrandTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: '#0A539E',
    letterSpacing: 0.5,
  },
  headerBrandSub: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#16A34A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  headerBrandExtra: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#64748B',
    marginTop: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
    maxWidth: '30%',
  },
  badgeOsNum: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderStyle: 'solid',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: '#166534',
    textAlign: 'center',
  },
  badgeOsTipo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#047857',
    textTransform: 'uppercase',
    marginTop: 3,
    textAlign: 'right',
  },

  // Barra de Título Principal
  titleBanner: {
    backgroundColor: '#0F172A',
    borderLeftWidth: 4,
    borderLeftColor: '#16A34A',
    borderLeftStyle: 'solid',
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleBannerMain: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10.5,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  titleBannerSub: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#94A3B8',
    marginTop: 1,
  },
  statusConcluidaPill: {
    backgroundColor: '#16A34A',
    borderRadius: 3,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },

  // Seções em Cards com proteção break-inside avoid
  secaoCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'solid',
    borderRadius: 6,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  secaoCardHeader: {
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderBottomStyle: 'solid',
    paddingVertical: 5,
    paddingHorizontal: 9,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secaoTitleText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  secaoHeaderExtra: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#64748B',
  },
  secaoCardBody: {
    padding: 8,
  },

  // Tabela e Grid de Dados
  gridRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  gridCol2: {
    flex: 1,
    marginRight: 4,
  },
  gridCol2Last: {
    flex: 1,
    marginRight: 0,
  },
  gridCol3: {
    flex: 1,
    marginRight: 4,
  },
  gridCol3Last: {
    flex: 1,
    marginRight: 0,
  },

  fieldBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 5,
  },
  fieldBoxHighlight: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 5,
  },
  fieldLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 1.5,
    letterSpacing: 0.2,
  },
  fieldValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#0F172A',
  },
  fieldValueAccent: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#15803D',
  },

  // Período de Atendimento
  datasBoxRow: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 7,
  },
  dataCol: {
    flex: 1,
    paddingRight: 6,
  },
  dataColBorder: {
    flex: 1,
    paddingLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#BBF7D0',
    borderLeftStyle: 'solid',
  },
  dataRotulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#166534',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  dataValor: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#0F172A',
  },

  // Checklist e Serviços Executados
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3.5,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'solid',
    marginBottom: 3,
  },
  checklistItemDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  checklistItemPending: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  checkItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  checkPillOk: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  checkPillOkText: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
  },
  checkPillGray: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  checkPillGrayText: {
    color: '#94A3B8',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
  },
  checkItemText: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#334155',
    flex: 1,
  },
  checkItemTextDone: {
    fontFamily: 'Helvetica-Bold',
    color: '#0F172A',
  },
  statusPillOk: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderStyle: 'solid',
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
  },
  statusPillOkText: {
    color: '#166534',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textTransform: 'uppercase',
  },
  statusPillGray: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'solid',
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
  },
  statusPillGrayText: {
    color: '#64748B',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    textTransform: 'uppercase',
  },

  // Observações Técnicas com texto justificado
  observacoesBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
    borderStyle: 'solid',
    borderRadius: 5,
    padding: 8,
  },
  observacoesTexto: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: '#1E293B',
    lineHeight: 1.5,
    textAlign: 'justify',
  },

  // Fotos
  fotosRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  fotoCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  fotoCardLast: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'solid',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: 0,
  },
  fotoImage: {
    width: '100%',
    height: 130,
    objectFit: 'cover',
    backgroundColor: '#0F172A',
  },
  fotoLegendaBar: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderTopStyle: 'solid',
    paddingVertical: 3,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fotoTag: {
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 6.5,
    borderRadius: 2,
    paddingVertical: 1,
    paddingHorizontal: 4,
    marginRight: 4,
  },
  fotoDesc: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: '#334155',
  },
  semFotosBox: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#F8FAFC',
    textAlign: 'center',
  },
  semFotosText: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
  },

  // Bloco de Assinatura e Responsável
  assinaturaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  responsavelInfoCol: {
    flex: 1.3,
    paddingRight: 8,
  },
  assinaturaBoxCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 5,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    minHeight: 65,
  },
  assinaturaImg: {
    maxHeight: 40,
    maxWidth: 160,
    marginBottom: 4,
    objectFit: 'contain',
  },
  linhaAssinaturaPlaceholder: {
    borderBottomWidth: 1,
    borderBottomColor: '#94A3B8',
    borderBottomStyle: 'solid',
    width: '80%',
    marginTop: 24,
    marginBottom: 4,
  },
  assinaturaNome: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#0F172A',
    textAlign: 'center',
  },
  assinaturaCargo: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#64748B',
    textTransform: 'uppercase',
    textAlign: 'center',
    marginTop: 1,
  },

  // Bloco Comercial Opcional
  comercialBox: {
    backgroundColor: '#047857',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
    color: '#FFFFFF',
  },
  comercialTitulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  comercialDesc: {
    fontFamily: 'Helvetica',
    fontSize: 7.5,
    color: '#D1FAE5',
    lineHeight: 1.4,
    textAlign: 'justify',
  },
  comercialIndicacao: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#FEF08A',
    marginTop: 3,
  },
  comercialContato: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#A7F3D0',
    marginTop: 2,
  },

  // Rodapé Institucional
  footerCard: {
    borderTopWidth: 2,
    borderTopColor: '#16A34A',
    borderTopStyle: 'solid',
    backgroundColor: '#F8FAFC',
    borderRadius: 4,
    padding: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  footerLeft: {
    flex: 1,
    paddingRight: 8,
  },
  footerBrandTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: '#0A539E',
  },
  footerContact: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: '#475569',
    marginTop: 1,
  },
  footerAddress: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#64748B',
    marginTop: 1,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerBadgeSelo: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderStyle: 'solid',
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    color: '#166534',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  footerDataEmissao: {
    fontFamily: 'Helvetica',
    fontSize: 6.5,
    color: '#64748B',
  },
})

function formatarDataHora(isoString?: string | null): string {
  if (!isoString) return 'Não registrada'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return String(isoString)
    return (
      d.toLocaleDateString('pt-BR') +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    )
  } catch {
    return String(isoString)
  }
}

function normalizarChecklist(rawChecklist: any): OSChecklistItem[] {
  if (!rawChecklist) return []
  const mapear = (it: any, idx: number): OSChecklistItem => ({
    id: it?.id ? String(it.id) : `chk_${idx + 1}`,
    item: String(it?.item || it?.texto || it?.descricao || it?.nome || `Item ${idx + 1}`).trim(),
    concluido: Boolean(it?.concluido),
  })

  if (Array.isArray(rawChecklist)) {
    return rawChecklist
      .filter((it) => it !== null && it !== undefined && typeof it === 'object')
      .map(mapear)
  }
  if (typeof rawChecklist === 'string') {
    const trimmed = rawChecklist.trim()
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((it) => it !== null && it !== undefined && typeof it === 'object')
          .map(mapear)
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.values(parsed)
          .filter((it: any) => it !== null && typeof it === 'object')
          .map(mapear)
      }
    } catch {
      return []
    }
  }
  if (typeof rawChecklist === 'object') {
    try {
      const vals = Object.values(rawChecklist)
      if (Array.isArray(vals)) {
        return vals.filter((it: any) => it !== null && typeof it === 'object').map(mapear)
      }
    } catch {
      return []
    }
  }
  return []
}

export const RelatorioOSPDFDocument: React.FC<RelatorioOSPDFDocumentProps> = ({
  dados,
  ...docProps
}) => {
  const os = dados.os || ({} as any)
  const cliente = dados.cliente || os.expand?.cliente_id || null
  const sistema = dados.sistema || null
  const fotosDataUrls = Array.isArray(dados.fotosDataUrls) ? dados.fotosDataUrls : []
  const rodapeComercial = dados.rodapeComercial

  const osIdCurto = os?.id ? String(os.id).slice(-6).toUpperCase() : '000000'
  const osIdFormatado = `OS #${osIdCurto}`
  const tipoServico = os?.tipo_servico || (os as any)?.titulo || 'Serviço em Campo'

  const clienteNome = cliente?.nome || cliente?.razao_social || 'Cliente Solar'
  const clienteDoc = cliente?.cpf || cliente?.cnpj || ''
  const clienteTelefone = cliente?.whatsapp || cliente?.telefone || 'Não informado'
  const enderecoUsina = os?.endereco || cliente?.endereco || '-'
  const cidadeUsina = cliente?.cidade ? `${cliente.cidade} - ${cliente.estado || 'RS'}` : ''

  const concessionaria = sistema?.concessionaria || (cliente as any)?.concessionaria || 'RGE Sul'
  const telhadoTipo = (sistema as any)?.tipo_telhado || (cliente as any)?.telhado_tipo || '-'
  const placasMarca = (sistema as any)?.fabricante_modulos || (cliente as any)?.marca_placas || '-'
  const inversorCompleto =
    dados.inversoresInfo ||
    sistema?.fabricante_inversores ||
    (cliente as any)?.inversor_marca ||
    '-'
  const potenciaUsina =
    sistema?.potencia_total_kwp || cliente?.potencia_kwp
      ? `${sistema?.potencia_total_kwp || cliente?.potencia_kwp} kWp`
      : '-'
  const placasUsina =
    sistema?.quantidade_modulos || cliente?.placas_qtd
      ? `${sistema?.quantidade_modulos || cliente?.placas_qtd} módulos`
      : '-'
  const ucUsina = sistema?.numero_uc || cliente?.uc || '-'

  const prestadorNome =
    os?.atribuida_a ||
    os?.responsavel_nome ||
    os?.expand?.responsavel_usuario_id?.name ||
    os?.expand?.responsavel_id?.name ||
    os?.expand?.profissional_id?.nome ||
    'Técnico Autorizado Delfos'
  const prestadorTelefone = os?.expand?.responsavel_usuario_id?.phone || ''

  const dataInicioStr = os?.data_agendada
    ? formatarDataHora(os.data_agendada)
    : 'Conforme agendamento'
  const dataConclusaoStr = formatarDataHora(os?.concluida_em || os?.updated)

  const checklistItens = normalizarChecklist(os?.checklist)
  const itensConcluidosCount = checklistItens.filter((c) => c.concluido).length
  const totalItensCount = checklistItens.length

  const observacoes =
    os?.detalhes_execucao ||
    os?.observacoes ||
    os?.descricao ||
    'Serviço executado e validado conforme especificações técnicas Delfos Solar.'

  const agoraData = new Date().toLocaleDateString('pt-BR')
  const agoraHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // Agrupa fotos de 2 em 2
  const fotosPares: [string, string | null][] = []
  for (let i = 0; i < fotosDataUrls.length; i += 2) {
    fotosPares.push([fotosDataUrls[i], fotosDataUrls[i + 1] || null])
  }

  return (
    <Document
      title={`Relatório Técnico de Execução — ${osIdFormatado}`}
      author="DELFOS ENGENHARIA LTDA"
      subject="Relatório Técnico de Execução de Ordem de Serviço Delfos Solar"
      {...docProps}
    >
      <Page size="A4" style={styles.page}>
        {/* CABEÇALHO INSTITUCIONAL */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerLogoBrand}>
              <Text style={styles.headerBrandTitle}>DELFOS SOLAR</Text>
            </View>
            <Text style={styles.headerBrandSub}>
              Engenharia &amp; Operação de Usinas Fotovoltaicas
            </Text>
            <Text style={styles.headerBrandExtra}>
              Delfos Engenharia Ltda • CNPJ 21.379.952/0001-38
            </Text>
          </View>

          <View style={styles.headerRight}>
            <Text style={styles.badgeOsNum}>{osIdFormatado}</Text>
            <Text style={styles.badgeOsTipo}>{tipoServico}</Text>
          </View>
        </View>

        {/* BARRA DE TÍTULO PRINCIPAL */}
        <View style={styles.titleBanner}>
          <View>
            <Text style={styles.titleBannerMain}>Relatório Técnico de Serviço Executado</Text>
            <Text style={styles.titleBannerSub}>
              Comprovação técnica de atendimento e encerramento de ordem de serviço em campo
            </Text>
          </View>
          <View style={styles.statusConcluidaPill}>
            <Text style={{ color: '#FFFFFF', fontFamily: 'Helvetica-Bold', fontSize: 7.5 }}>
              ✓ CONCLUÍDA
            </Text>
          </View>
        </View>

        {/* 1. DADOS DO CLIENTE & CADASTRO TÉCNICO DA USINA */}
        <View style={styles.secaoCard} wrap={false}>
          <View style={styles.secaoCardHeader}>
            <Text style={styles.secaoTitleText}>
              ■ 1. Dados do Cliente &amp; Cadastro Técnico da Usina
            </Text>
            <Text style={styles.secaoHeaderExtra}>
              Concessionária: {concessionaria} • UC: {ucUsina}
            </Text>
          </View>

          <View style={styles.secaoCardBody}>
            <View style={styles.gridRow}>
              <View style={styles.gridCol2}>
                <View style={styles.fieldBoxHighlight}>
                  <Text style={styles.fieldLabel}>Cliente / Razão Social</Text>
                  <Text style={styles.fieldValueAccent}>{clienteNome}</Text>
                </View>
              </View>
              <View style={styles.gridCol2Last}>
                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Endereço da Instalação / Usina</Text>
                  <Text style={styles.fieldValue}>
                    {enderecoUsina}
                    {cidadeUsina ? ` • ${cidadeUsina}` : ''}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol2}>
                <View style={{ flexDirection: 'row' }}>
                  {clienteDoc ? (
                    <View style={{ flex: 1, marginRight: 4 }}>
                      <View style={styles.fieldBox}>
                        <Text style={styles.fieldLabel}>CPF / CNPJ</Text>
                        <Text style={styles.fieldValue}>{clienteDoc}</Text>
                      </View>
                    </View>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>Telefone / WhatsApp</Text>
                      <Text style={styles.fieldValue}>{clienteTelefone}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.gridCol2Last}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>Potência Nominal</Text>
                      <Text style={styles.fieldValue}>{potenciaUsina}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>Estrutura / Telhado</Text>
                      <Text style={styles.fieldValue}>{telhadoTipo}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol2}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{ flex: 1, marginRight: 4 }}>
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>Qtd. Módulos</Text>
                      <Text style={styles.fieldValue}>{placasUsina}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.fieldBox}>
                      <Text style={styles.fieldLabel}>Marca Módulos</Text>
                      <Text style={styles.fieldValue}>{placasMarca}</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.gridCol2Last}>
                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Inversor(es) Instalado(s)</Text>
                  <Text style={styles.fieldValue}>{inversorCompleto}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 2. PERÍODO DE ATENDIMENTO EM CAMPO */}
        <View style={styles.secaoCard} wrap={false}>
          <View style={styles.secaoCardHeader}>
            <Text style={styles.secaoTitleText}>■ 2. Período de Atendimento em Campo</Text>
            <Text style={styles.secaoHeaderExtra}>Horários Registrados</Text>
          </View>
          <View style={styles.secaoCardBody}>
            <View style={styles.datasBoxRow}>
              <View style={styles.dataCol}>
                <Text style={styles.dataRotulo}>Início do Atendimento</Text>
                <Text style={styles.dataValor}>{dataInicioStr}</Text>
              </View>
              <View style={styles.dataColBorder}>
                <Text style={styles.dataRotulo}>Conclusão Efetiva</Text>
                <Text style={[styles.dataValor, { color: '#166534' }]}>{dataConclusaoStr}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 3. CHECKLIST TÉCNICO DE EXECUÇÃO */}
        {checklistItens.length > 0 && (
          <View style={styles.secaoCard} wrap={true}>
            <View style={styles.secaoCardHeader}>
              <Text style={styles.secaoTitleText}>■ 3. Checklist Técnico de Execução</Text>
              <Text style={[styles.secaoHeaderExtra, { color: '#166534' }]}>
                {itensConcluidosCount}/{totalItensCount} Concluídos
              </Text>
            </View>
            <View style={styles.secaoCardBody}>
              {checklistItens.map((item, idx) => (
                <View
                  key={item.id || idx}
                  style={[
                    styles.checklistItem,
                    item.concluido ? styles.checklistItemDone : styles.checklistItemPending,
                  ]}
                  wrap={false}
                >
                  <View style={styles.checkItemLeft}>
                    <View style={item.concluido ? styles.checkPillOk : styles.checkPillGray}>
                      <Text
                        style={item.concluido ? styles.checkPillOkText : styles.checkPillGrayText}
                      >
                        {item.concluido ? '✓' : '–'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.checkItemText,
                        item.concluido ? styles.checkItemTextDone : undefined,
                      ]}
                    >
                      {item.item}
                    </Text>
                  </View>
                  <View style={item.concluido ? styles.statusPillOk : styles.statusPillGray}>
                    <Text
                      style={item.concluido ? styles.statusPillOkText : styles.statusPillGrayText}
                    >
                      {item.concluido ? 'CONCLUÍDO' : 'PENDENTE'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 4. OBSERVAÇÕES TÉCNICAS E DETALHES DE EXECUÇÃO (TEXTO JUSTIFICADO) */}
        <View style={styles.secaoCard} wrap={false}>
          <View style={styles.secaoCardHeader}>
            <Text style={styles.secaoTitleText}>
              ■ 4. Observações Técnicas &amp; Detalhes da Execução
            </Text>
            <Text style={styles.secaoHeaderExtra}>Registro de Campo</Text>
          </View>
          <View style={styles.secaoCardBody}>
            <View style={styles.observacoesBox}>
              <Text style={styles.observacoesTexto}>{observacoes}</Text>
            </View>
          </View>
        </View>

        {/* 5. REGISTROS FOTOGRÁFICOS DE CAMPO */}
        {fotosDataUrls.length > 0 && (
          <View style={styles.secaoCard} wrap={true}>
            <View style={styles.secaoCardHeader}>
              <Text style={styles.secaoTitleText}>■ 5. Registros Fotográficos de Campo</Text>
              <Text style={styles.secaoHeaderExtra}>
                {fotosDataUrls.length} {fotosDataUrls.length === 1 ? 'registro' : 'registros'}
              </Text>
            </View>
            <View style={styles.secaoCardBody}>
              {fotosPares.map((par, pIdx) => (
                <View key={`par_${pIdx}`} style={styles.fotosRow} wrap={false}>
                  <View style={par[1] ? styles.fotoCard : styles.fotoCardLast}>
                    <Image src={par[0]} style={styles.fotoImage} />
                    <View style={styles.fotoLegendaBar}>
                      <Text style={styles.fotoTag}>FOTO #{pIdx * 2 + 1}</Text>
                      <Text style={styles.fotoDesc}>Registro #{pIdx * 2 + 1}</Text>
                    </View>
                  </View>
                  {par[1] ? (
                    <View style={styles.fotoCardLast}>
                      <Image src={par[1]} style={styles.fotoImage} />
                      <View style={styles.fotoLegendaBar}>
                        <Text style={styles.fotoTag}>FOTO #{pIdx * 2 + 2}</Text>
                        <Text style={styles.fotoDesc}>Registro #{pIdx * 2 + 2}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 6. RESPONSÁVEL TÉCNICO & ASSINATURA (BREAK-INSIDE AVOID) */}
        <View style={styles.secaoCard} wrap={false}>
          <View style={styles.secaoCardHeader}>
            <Text style={styles.secaoTitleText}>
              ■ 6. Responsável Técnico &amp; Validação de Conclusão
            </Text>
            <Text style={styles.secaoHeaderExtra}>Identificação &amp; Assinatura</Text>
          </View>
          <View style={styles.secaoCardBody}>
            <View style={styles.assinaturaRow}>
              <View style={styles.responsavelInfoCol}>
                <View style={[styles.fieldBoxHighlight, { marginBottom: 4 }]}>
                  <Text style={styles.fieldLabel}>Técnico / Prestador Executante</Text>
                  <Text style={styles.fieldValueAccent}>{prestadorNome}</Text>
                </View>
                {prestadorTelefone ? (
                  <View style={[styles.fieldBox, { marginBottom: 4 }]}>
                    <Text style={styles.fieldLabel}>Contato do Técnico</Text>
                    <Text style={styles.fieldValue}>{prestadorTelefone}</Text>
                  </View>
                ) : null}
                <View style={styles.fieldBox}>
                  <Text style={styles.fieldLabel}>Empresa Responsável</Text>
                  <Text style={styles.fieldValue}>
                    Delfos Engenharia Solar • CNPJ 21.379.952/0001-38
                  </Text>
                </View>
              </View>

              <View style={styles.assinaturaBoxCol}>
                {dados.assinaturaBase64 ? (
                  <Image src={dados.assinaturaBase64} style={styles.assinaturaImg} />
                ) : (
                  <View style={styles.linhaAssinaturaPlaceholder} />
                )}
                <Text style={styles.assinaturaNome}>{prestadorNome}</Text>
                <Text style={styles.assinaturaCargo}>Prestador Autorizado Delfos</Text>
              </View>
            </View>
          </View>
        </View>

        {/* BLOCO COMERCIAL E INDICAÇÃO CONFIGURÁVEL */}
        {rodapeComercial && (rodapeComercial.titulo || rodapeComercial.descricao) && (
          <View style={styles.comercialBox} wrap={false}>
            <Text style={styles.comercialTitulo}>★ {rodapeComercial.titulo}</Text>
            {rodapeComercial.descricao ? (
              <Text style={styles.comercialDesc}>{rodapeComercial.descricao}</Text>
            ) : null}
            {rodapeComercial.indicacao ? (
              <Text style={styles.comercialIndicacao}>🎁 {rodapeComercial.indicacao}</Text>
            ) : null}
            {rodapeComercial.contato ? (
              <Text style={styles.comercialContato}>{rodapeComercial.contato}</Text>
            ) : null}
          </View>
        )}

        {/* RODAPÉ INSTITUCIONAL CANÔNICO DELFOS SOLAR */}
        <View style={styles.footerCard} wrap={false}>
          <View style={styles.footerLeft}>
            <Text style={styles.footerBrandTitle}>
              Delfos Engenharia Solar • Excelência Técnica em Energia Fotovoltaica
            </Text>
            <Text style={styles.footerContact}>
              Rua Espírito Santo, 275 – Erechim/RS, CEP 99709-296 • (54) 99129-2121 •
              www.delfos.eng.br
            </Text>
            <Text style={styles.footerAddress}>
              Atendimento técnico autorizado em conformidade com as normas ABNT NBR 16690 e NR-10.
            </Text>
          </View>
          <View style={styles.footerRight}>
            <View style={styles.footerBadgeSelo}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: '#166534' }}>
                ✓ DOCUMENTO OFICIAL
              </Text>
            </View>
            <Text style={styles.footerDataEmissao}>
              Emitido em {agoraData} às {agoraHora}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export default RelatorioOSPDFDocument

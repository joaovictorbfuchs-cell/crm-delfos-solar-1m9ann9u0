import { OrdemServico, Cliente, Sistema, OSChecklistItem } from '@/types/crm'
import { otimizarImagemParaImpressao } from '@/lib/propostaImageOptimizer'
import { renderizarHTMLParaPdfBase64 } from '@/lib/pdfWhatsAppService'
import pb from '@/lib/pocketbase/client'

export interface RelatorioOSDadosInput {
  os: OrdemServico
  cliente?: Cliente
  sistema?: Sistema | null
  fotosDataUrls?: string[] // Data URLs ou URLs diretas otimizadas
  inversoresInfo?: string
  assinaturaBase64?: string
}

/**
 * Converte um Data URI (ex: data:application/pdf;base64,...) em objeto File nativo.
 */
export function dataUriToFile(dataUri: string, fileName: string): File {
  const parts = dataUri.split(',')
  const mimeMatch = parts[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/pdf'
  const bstr = atob(parts[1] || '')
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], fileName, { type: mime })
}

/**
 * Logotipo oficial vetorial Delfos Solar com degradê característico azul/verde/amarelo.
 * Idêntico ao padrão oficial da Proposta Técnico-Comercial.
 */
function renderLogoSvg(idSuffix: string = 'os-rel'): string {
  return `<svg viewBox="0 0 520 280" fill="none" class="brand-logo-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="delfos-os-top-${idSuffix}" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0B5AA8" />
        <stop offset="18%" stop-color="#12789E" />
        <stop offset="42%" stop-color="#2E9E43" />
        <stop offset="68%" stop-color="#7EBE32" />
        <stop offset="88%" stop-color="#DECA09" />
        <stop offset="100%" stop-color="#FCD200" />
      </linearGradient>
      <linearGradient id="delfos-os-bottom-${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCD200" />
        <stop offset="14%" stop-color="#DECA09" />
        <stop offset="36%" stop-color="#7EBE32" />
        <stop offset="62%" stop-color="#2E9E43" />
        <stop offset="84%" stop-color="#12789E" />
        <stop offset="100%" stop-color="#0B5AA8" />
      </linearGradient>
    </defs>
    <path d="M 10 96 C 45 42, 135 12, 260 12 C 390 12, 475 46, 514 88 C 450 42, 360 26, 260 26 C 145 26, 55 56, 10 96 Z" fill="url(#delfos-os-top-${idSuffix})" />
    <path d="M 12 96 C 40 48, 130 16, 260 16 C 395 16, 480 50, 514 88 C 455 42, 365 28, 260 28 C 145 28, 55 58, 12 96 Z" fill="url(#delfos-os-top-${idSuffix})" opacity="0.95" />
    <path d="M 10 184 C 55 226, 145 258, 260 258 C 375 258, 465 228, 514 192 C 480 228, 395 268, 260 268 C 130 268, 45 232, 10 184 Z" fill="url(#delfos-os-bottom-${idSuffix})" />
    <path d="M 12 184 C 52 214, 135 246, 260 246 C 385 246, 470 224, 514 192 C 480 226, 390 264, 260 264 C 105 264, 35 218, 12 184 Z" fill="url(#delfos-os-bottom-${idSuffix})" opacity="0.95" />
    <g fill="#0A539E">
      <text x="260" y="160" text-anchor="middle" font-family="Arial, -apple-system, BlinkMacSystemFont, sans-serif" font-size="94" font-weight="900" letter-spacing="0.22em">delfos</text>
      <text x="264" y="200" text-anchor="middle" font-family="Arial, -apple-system, BlinkMacSystemFont, sans-serif" font-size="25" font-weight="800" letter-spacing="0.68em">solar</text>
    </g>
  </svg>`
}

/**
 * Extrai data e hora amigável
 */
function formatarDataHoraRelatorio(isoString?: string | null): string {
  if (!isoString) return 'Não registrada'
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return isoString
    return (
      d.toLocaleDateString('pt-BR') +
      ' às ' +
      d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    )
  } catch {
    return isoString
  }
}

/**
 * Tenta extrair a data de início da execução a partir do campo detalhes_execucao
 */
export function extrairInicioAtendimentoOS(detalhes?: string, dataAgendada?: string): string {
  if (detalhes) {
    const match = detalhes.match(/\[INÍCIO DO ATENDIMENTO:\s*([^\]]+)\]/i)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  if (dataAgendada) {
    return formatarDataHoraRelatorio(dataAgendada)
  }
  return 'Conforme agendamento'
}

/**
 * Limpa o texto de detalhes removendo o marcador inicial para não duplicar na seção de observações
 */
export function limparTextoDetalhesExecucao(detalhes?: string): string {
  if (!detalhes) return 'Nenhuma observação adicional informada pelo prestador.'
  return (
    detalhes.replace(/\[INÍCIO DO ATENDIMENTO:[^\]]+\]\s*/gi, '').trim() ||
    'Serviço executado e validado conforme especificações técnicas.'
  )
}

/**
 * Monta o HTML completo do Relatório Técnico de Execução de OS
 * Layout A4 premium institucional corporativo com CSS compatível com html2canvas
 */
export function gerarHTMLRelatorioOS(dados: RelatorioOSDadosInput): string {
  const {
    os,
    cliente = os.expand?.cliente_id,
    sistema,
    fotosDataUrls = [],
    inversoresInfo,
    assinaturaBase64,
  } = dados

  const osIdCurto = os.id ? os.id.slice(-6).toUpperCase() : '000000'
  const osIdFormatado = `OS #${osIdCurto}`
  const tipoServico = os.tipo_servico || 'Serviço em Campo'
  const prestadorNome =
    os.atribuida_a ||
    os.expand?.responsavel_usuario_id?.name ||
    os.expand?.profissional_id?.nome ||
    'Técnico Autorizado Delfos'
  const prestadorTelefone = os.expand?.responsavel_usuario_id?.phone || ''

  const clienteNome = cliente?.nome || cliente?.razao_social || 'Cliente Solar'
  const clienteDoc = cliente?.cpf || cliente?.cnpj || ''
  const clienteTelefone = cliente?.whatsapp || cliente?.telefone || ''
  const enderecoUsina = os.endereco || cliente?.endereco || 'Endereço da usina não informado'
  const cidadeUsina = cliente?.cidade ? `${cliente.cidade} - ${cliente.estado || 'RS'}` : ''
  const potenciaUsina =
    sistema?.potencia_total_kwp || cliente?.potencia_kwp
      ? `${sistema?.potencia_total_kwp || cliente?.potencia_kwp} kWp`
      : '—'
  const placasUsina =
    sistema?.quantidade_modulos || cliente?.placas_qtd
      ? `${sistema?.quantidade_modulos || cliente?.placas_qtd} módulos`
      : '—'
  const inversorUsina =
    inversoresInfo || sistema?.fabricante_inversores || cliente?.inversor_marca || '—'
  const ucUsina = sistema?.numero_uc || cliente?.uc || '—'

  const dataInicioStr = extrairInicioAtendimentoOS(os.detalhes_execucao, os.data_agendada)
  const dataConclusaoStr = formatarDataHoraRelatorio(os.concluida_em || os.updated)

  const checklistItens: OSChecklistItem[] = Array.isArray(os.checklist) ? os.checklist : []
  const itensConcluidos = checklistItens.filter((c) => c.concluido).length
  const totalItens = checklistItens.length

  const observacoesLimpas = limparTextoDetalhesExecucao(os.detalhes_execucao)

  // Montagem da galeria de fotos em grade de 2 colunas com table para compatibilidade 100% no html2canvas
  let fotosHtml = ''
  if (fotosDataUrls.length > 0) {
    const rows: string[] = []
    for (let i = 0; i < fotosDataUrls.length; i += 2) {
      const url1 = fotosDataUrls[i]
      const url2 = fotosDataUrls[i + 1]
      rows.push(`
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 5px;">
            <div class="foto-card-rel">
              <div class="foto-img-container">
                <img src="${url1}" alt="Registro Fotográfico #${i + 1}" class="foto-img" />
              </div>
              <div class="foto-legenda-bar">
                <span class="foto-tag">FOTO #${i + 1}</span>
                <span class="foto-desc">Registro Fotográfico #${i + 1}</span>
              </div>
            </div>
          </td>
          ${
            url2
              ? `
          <td style="width: 50%; vertical-align: top; padding: 5px;">
            <div class="foto-card-rel">
              <div class="foto-img-container">
                <img src="${url2}" alt="Registro Fotográfico #${i + 2}" class="foto-img" />
              </div>
              <div class="foto-legenda-bar">
                <span class="foto-tag">FOTO #${i + 2}</span>
                <span class="foto-desc">Registro Fotográfico #${i + 2}</span>
              </div>
            </div>
          </td>`
              : `
          <td style="width: 50%; vertical-align: top; padding: 5px;"></td>`
          }
        </tr>
      `)
    }
    fotosHtml = `<table class="fotos-table-grid" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
      <tbody>${rows.join('')}</tbody>
    </table>`
  } else {
    fotosHtml = `<div class="sem-fotos-box">Nenhuma fotografia anexada à Ordem de Serviço.</div>`
  }

  // Checklist em tabela estilizada (2 colunas se houver mais de 4 itens, ou lista estilizada)
  let checklistHtml = ''
  if (checklistItens.length > 0) {
    const checkRows: string[] = []
    for (let i = 0; i < checklistItens.length; i += 2) {
      const it1 = checklistItens[i]
      const it2 = checklistItens[i + 1]

      const renderCheckCell = (item?: OSChecklistItem) => {
        if (!item) return ''
        const ok = item.concluido
        return `
          <div class="check-item-box ${ok ? 'check-done' : 'check-pending'}">
            <table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 24px; vertical-align: middle; text-align: center;">
                  <span class="check-pill ${ok ? 'check-pill-ok' : 'check-pill-gray'}">
                    ${ok ? '&#10003;' : '&#8211;'}
                  </span>
                </td>
                <td style="vertical-align: middle; padding-left: 8px;">
                  <span class="check-text ${ok ? 'check-text-ok' : ''}">${item.item}</span>
                </td>
                <td style="width: 72px; text-align: right; vertical-align: middle;">
                  <span class="status-pill ${ok ? 'status-pill-ok' : 'status-pill-gray'}">
                    ${ok ? 'CONCLUÍDO' : 'PENDENTE'}
                  </span>
                </td>
              </tr>
            </table>
          </div>
        `
      }

      checkRows.push(`
        <tr>
          <td style="width: 50%; vertical-align: top; padding: 3px 4px 3px 0;">
            ${renderCheckCell(it1)}
          </td>
          <td style="width: 50%; vertical-align: top; padding: 3px 0 3px 4px;">
            ${renderCheckCell(it2)}
          </td>
        </tr>
      `)
    }

    checklistHtml = `<table cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
      <tbody>${checkRows.join('')}</tbody>
    </table>`
  } else {
    checklistHtml = `<div class="sem-fotos-box">Nenhum item de checklist registrado para esta OS.</div>`
  }

  const agoraData = new Date().toLocaleDateString('pt-BR')
  const agoraHora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Técnico de Serviço - ${osIdFormatado}</title>
  <style>
    /* Reset básico e tipografia de alto padrão */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: #FFFFFF;
      color: #1E293B;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.45;
      padding: 0;
      margin: 0;
    }
    .proposta-container {
      width: 794px;
      margin: 0 auto;
      background: #FFFFFF;
      padding: 24px 28px 24px 28px;
    }

    /* HEADER INSTITUCIONAL */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 3px solid #16A34A;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-logo-cell {
      width: 110px;
      vertical-align: middle;
    }
    .logo-box {
      width: 104px;
      height: 52px;
      display: block;
    }
    .brand-logo-svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .header-brand-cell {
      vertical-align: middle;
      padding-left: 12px;
    }
    .brand-company-title {
      font-size: 15pt;
      font-weight: 900;
      color: #0A539E;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .brand-company-sub {
      font-size: 8pt;
      font-weight: 800;
      color: #16A34A;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .brand-company-extra {
      font-size: 7.5pt;
      color: #64748B;
      margin-top: 1px;
    }
    .header-badge-cell {
      text-align: right;
      vertical-align: middle;
    }
    .badge-os-num {
      display: inline-block;
      background: #DCFCE7;
      color: #166534;
      border: 1.5px solid #86EFAC;
      font-size: 11pt;
      font-weight: 900;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.04em;
    }
    .badge-os-tipo {
      font-size: 8.5pt;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
      margin-top: 4px;
      letter-spacing: 0.05em;
    }

    /* BARRA DE TÍTULO PRINCIPAL */
    .title-banner {
      background: #0F172A;
      border-left: 5px solid #16A34A;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
    }
    .title-banner-table {
      width: 100%;
      border-collapse: collapse;
    }
    .title-banner-main {
      font-size: 12pt;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .title-banner-sub {
      font-size: 8pt;
      color: #94A3B8;
      margin-top: 2px;
      font-weight: 500;
    }
    .title-banner-tag {
      text-align: right;
      vertical-align: middle;
    }
    .status-concluida-pill {
      display: inline-block;
      background: #16A34A;
      color: #FFFFFF;
      font-size: 8pt;
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    /* SEÇÕES EM CARDS */
    .secao-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      margin-bottom: 12px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .secao-card-header {
      background: #F8FAFC;
      border-bottom: 1.5px solid #E2E8F0;
      padding: 8px 12px;
    }
    .secao-header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .secao-title-text {
      font-size: 9pt;
      font-weight: 900;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .secao-title-icon {
      color: #16A34A;
      font-weight: 900;
      margin-right: 4px;
    }
    .secao-header-extra {
      text-align: right;
      font-size: 8pt;
      font-weight: 700;
      color: #64748B;
    }
    .secao-card-body {
      padding: 12px;
    }

    /* CAMPOS DE DADOS */
    .field-table {
      width: 100%;
      border-collapse: collapse;
    }
    .field-cell {
      vertical-align: top;
      padding: 4px 6px;
    }
    .field-box {
      background: #F8FAFC;
      border: 1px solid #F1F5F9;
      border-left: 3px solid #CBD5E1;
      border-radius: 4px;
      padding: 6px 8px;
    }
    .field-box.highlight {
      background: #F0FDF4;
      border-color: #DCFCE7;
      border-left: 3px solid #16A34A;
    }
    .field-label {
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #64748B;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }
    .field-value {
      font-size: 9pt;
      font-weight: 700;
      color: #0F172A;
      word-break: break-word;
    }
    .field-value.accent {
      color: #15803D;
      font-weight: 800;
    }

    /* DATAS DE ATENDIMENTO */
    .datas-table {
      width: 100%;
      border-collapse: collapse;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 6px;
    }
    .data-box-cell {
      padding: 8px 12px;
      vertical-align: top;
    }
    .data-rotulo {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #166534;
      letter-spacing: 0.04em;
    }
    .data-valor {
      font-size: 10pt;
      font-weight: 800;
      color: #0F172A;
      margin-top: 2px;
    }

    /* CHECKLIST */
    .check-item-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 5px;
      padding: 5px 8px;
    }
    .check-item-box.check-done {
      background: #F0FDF4;
      border-color: #BBF7D0;
    }
    .check-pill {
      display: inline-block;
      width: 16px;
      height: 16px;
      line-height: 16px;
      border-radius: 3px;
      font-size: 9pt;
      font-weight: 900;
    }
    .check-pill-ok {
      background: #16A34A;
      color: #FFFFFF;
    }
    .check-pill-gray {
      background: #E2E8F0;
      color: #94A3B8;
    }
    .check-text {
      font-size: 8.5pt;
      color: #334155;
      font-weight: 600;
      line-height: 1.3;
    }
    .check-text-ok {
      color: #0F172A;
    }
    .status-pill {
      display: inline-block;
      font-size: 6.5pt;
      font-weight: 800;
      padding: 2px 5px;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .status-pill-ok {
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #86EFAC;
    }
    .status-pill-gray {
      background: #F1F5F9;
      color: #64748B;
      border: 1px solid #CBD5E1;
    }

    /* OBSERVAÇÕES */
    .observacoes-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-left: 3px solid #16A34A;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 8.5pt;
      color: #1E293B;
      line-height: 1.5;
      white-space: pre-line;
    }

    /* GALERIA DE FOTOS */
    .foto-card-rel {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .foto-img-container {
      width: 100%;
      height: 190px;
      background: #0F172A;
      text-align: center;
      display: table-cell;
      vertical-align: middle;
      overflow: hidden;
    }
    .foto-img {
      max-width: 100%;
      max-height: 190px;
      width: auto;
      height: auto;
      display: block;
      margin: 0 auto;
      object-fit: cover;
    }
    .foto-legenda-bar {
      background: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 5px 8px;
    }
    .foto-tag {
      display: inline-block;
      background: #0F172A;
      color: #FFFFFF;
      font-size: 6.5pt;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      margin-right: 4px;
      letter-spacing: 0.04em;
    }
    .foto-desc {
      font-size: 7.5pt;
      font-weight: 700;
      color: #334155;
    }
    .sem-fotos-box {
      font-size: 8.5pt;
      color: #94A3B8;
      font-style: italic;
      text-align: center;
      padding: 16px;
      background: #F8FAFC;
      border: 1px dashed #CBD5E1;
      border-radius: 6px;
    }

    /* PRESTADOR E ASSINATURA */
    .assinatura-wrap {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .responsavel-card-table {
      width: 100%;
      border-collapse: collapse;
    }
    .assinatura-box {
      border: 1px dashed #CBD5E1;
      border-radius: 6px;
      background: #FFFFFF;
      padding: 8px;
      text-align: center;
      min-height: 70px;
    }
    .assinatura-img {
      max-height: 52px;
      max-width: 180px;
      display: block;
      margin: 0 auto 4px auto;
    }
    .assinatura-linha-placeholder {
      border-bottom: 1px solid #94A3B8;
      width: 80%;
      margin: 32px auto 6px auto;
    }
    .assinatura-nome {
      font-size: 8pt;
      font-weight: 800;
      color: #0F172A;
    }
    .assinatura-cargo {
      font-size: 7pt;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* RODAPÉ CANÔNICO DELFOS SOLAR */
    .footer-card {
      border-top: 2px solid #16A34A;
      background: #F8FAFC;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-table {
      width: 100%;
      border-collapse: collapse;
    }
    .footer-brand-title {
      font-size: 8pt;
      font-weight: 800;
      color: #0A539E;
    }
    .footer-contact {
      font-size: 7.5pt;
      color: #475569;
      margin-top: 1px;
    }
    .footer-address {
      font-size: 7pt;
      color: #64748B;
      margin-top: 1px;
    }
    .footer-meta-right {
      text-align: right;
      vertical-align: middle;
      font-size: 7pt;
      color: #64748B;
      line-height: 1.35;
    }
    .footer-badge-selo {
      display: inline-block;
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #86EFAC;
      font-size: 6.5pt;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 3px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }

    @media print {
      body {
        background: #FFFFFF !important;
      }
      .proposta-container {
        width: 100% !important;
        padding: 0 !important;
      }
      .secao-card, .foto-card-rel, .title-banner, .footer-card {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="proposta-container">

    <!-- CABEÇALHO INSTITUCIONAL DELFOS SOLAR -->
    <table class="header-table" cellpadding="0" cellspacing="0">
      <tr>
        <td class="header-logo-cell">
          <div class="logo-box">
            ${renderLogoSvg('rel-head')}
          </div>
        </td>
        <td class="header-brand-cell">
          <div class="brand-company-title">DELFOS SOLAR</div>
          <div class="brand-company-sub">Engenharia &amp; Operação de Usinas Fotovoltaicas</div>
          <div class="brand-company-extra">Delfos Engenharia Ltda • CNPJ 21.379.952/0001-38</div>
        </td>
        <td class="header-badge-cell">
          <div class="badge-os-num">${osIdFormatado}</div>
          <div class="badge-os-tipo">${tipoServico}</div>
        </td>
      </tr>
    </table>

    <!-- BARRA DE TÍTULO PRINCIPAL -->
    <div class="title-banner">
      <table class="title-banner-table" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div class="title-banner-main">Relatório Técnico de Serviço Executado</div>
            <div class="title-banner-sub">Comprovação técnica de atendimento e encerramento de ordem de serviço em campo</div>
          </td>
          <td class="title-banner-tag">
            <span class="status-concluida-pill">&#10003; CONCLUÍDA</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- 1. DADOS DO CLIENTE & LOCAL DA INSTALAÇÃO -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 1. Dados do Cliente &amp; Local da Usina
            </td>
            <td class="secao-header-extra">
              UC: <strong style="color: #0F172A;">${ucUsina}</strong>
            </td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        <table class="field-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="field-cell" style="width: 50%;">
              <div class="field-box highlight">
                <div class="field-label">Cliente / Razão Social</div>
                <div class="field-value accent">${clienteNome}</div>
              </div>
            </td>
            <td class="field-cell" style="width: 50%;">
              <div class="field-box">
                <div class="field-label">Endereço da Instalação / Usina</div>
                <div class="field-value">${enderecoUsina}${cidadeUsina ? ` • ${cidadeUsina}` : ''}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td class="field-cell" style="width: 50%;">
              <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  ${
                    clienteDoc
                      ? `<td style="width: 50%; padding-right: 4px;">
                    <div class="field-box">
                      <div class="field-label">CPF / CNPJ</div>
                      <div class="field-value">${clienteDoc}</div>
                    </div>
                  </td>`
                      : ''
                  }
                  <td style="width: ${clienteDoc ? '50%' : '100%'}; padding-left: ${clienteDoc ? '4px' : '0'};">
                    <div class="field-box">
                      <div class="field-label">Telefone / WhatsApp</div>
                      <div class="field-value">${clienteTelefone || 'Não informado'}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td class="field-cell" style="width: 50%;">
              <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="width: 50%; padding-right: 4px;">
                    <div class="field-box">
                      <div class="field-label">Potência &amp; Módulos</div>
                      <div class="field-value">${potenciaUsina} (${placasUsina})</div>
                    </div>
                  </td>
                  <td style="width: 50%; padding-left: 4px;">
                    <div class="field-box">
                      <div class="field-label">Inversor / Equipamento</div>
                      <div class="field-value">${inversorUsina}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 2. PERÍODO DE ATENDIMENTO EM CAMPO -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 2. Período de Atendimento em Campo
            </td>
            <td class="secao-header-extra">Horários Registrados</td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        <table class="datas-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="data-box-cell" style="width: 50%; border-right: 1px solid #BBF7D0;">
              <div class="data-rotulo">Início do Atendimento</div>
              <div class="data-valor">${dataInicioStr}</div>
            </td>
            <td class="data-box-cell" style="width: 50%;">
              <div class="data-rotulo">Conclusão Efetiva do Atendimento</div>
              <div class="data-valor" style="color: #166534;">${dataConclusaoStr}</div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 3. CHECKLIST TÉCNICO DE EXECUÇÃO -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 3. Checklist Técnico de Execução
            </td>
            <td class="secao-header-extra">
              <span style="color: #166534; font-weight: 800;">${itensConcluidos}/${totalItens} Concluídos</span>
            </td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        ${checklistHtml}
      </div>
    </div>

    <!-- 4. OBSERVAÇÕES TÉCNICAS DO PRESTADOR -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 4. Observações Técnicas &amp; Detalhes da Execução
            </td>
            <td class="secao-header-extra">Registro de Campo</td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        <div class="observacoes-box">${observacoesLimpas}</div>
      </div>
    </div>

    <!-- 5. REGISTROS FOTOGRÁFICOS -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 5. Registros Fotográficos do Trabalho Realizado
            </td>
            <td class="secao-header-extra">
              ${fotosDataUrls.length} ${fotosDataUrls.length === 1 ? 'registro' : 'registros'}
            </td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        ${fotosHtml}
      </div>
    </div>

    <!-- 6. RESPONSÁVEL TÉCNICO & ASSINATURA -->
    <div class="secao-card assinatura-wrap">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 6. Responsável Técnico &amp; Validação de Conclusão
            </td>
            <td class="secao-header-extra">Identificação &amp; Assinatura</td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        <table class="responsavel-card-table" cellpadding="0" cellspacing="0">
          <tr>
            <td style="width: 58%; vertical-align: top; padding-right: 12px;">
              <div class="field-box highlight" style="margin-bottom: 6px;">
                <div class="field-label">Técnico / Prestador Executante</div>
                <div class="field-value accent">${prestadorNome}</div>
              </div>
              ${
                prestadorTelefone
                  ? `
              <div class="field-box" style="margin-bottom: 6px;">
                <div class="field-label">Contato do Técnico</div>
                <div class="field-value">${prestadorTelefone}</div>
              </div>`
                  : ''
              }
              <div class="field-box">
                <div class="field-label">Empresa Responsável</div>
                <div class="field-value">Delfos Engenharia Solar • CNPJ 21.379.952/0001-38</div>
              </div>
            </td>
            <td style="width: 42%; vertical-align: bottom;">
              <div class="assinatura-box">
                ${
                  assinaturaBase64
                    ? `<img src="${assinaturaBase64}" alt="Assinatura" class="assinatura-img" />`
                    : `<div class="assinatura-linha-placeholder"></div>`
                }
                <div class="assinatura-nome">${prestadorNome}</div>
                <div class="assinatura-cargo">Prestador Autorizado Delfos</div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- RODAPÉ INSTITUCIONAL CANÔNICO DELFOS SOLAR -->
    <div class="footer-card">
      <table class="footer-table" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align: middle;">
            <div class="footer-brand-title">Delfos Engenharia Solar • Excelência Técnica em Energia Fotovoltaica</div>
            <div class="footer-contact">Rua Espírito Santo, 275 – Centro, Erechim/RS • Telefone / WhatsApp: (54) 99129-2121 • www.delfos.eng.br</div>
            <div class="footer-address">Atendimento técnico autorizado em conformidade com as normas ABNT NBR 16690 e NR-10.</div>
          </td>
          <td class="footer-meta-right">
            <div><span class="footer-badge-selo">&#10003; DOCUMENTO OFICIAL</span></div>
            <div>Emitido em ${agoraData} às ${agoraHora}</div>
          </td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>`
}

/**
 * Prepara e otimiza as fotos da OS para o relatório (comprimindo em JPEG para manter o PDF leve < 3 MB)
 */
export async function prepararFotosRelatorio(
  os: OrdemServico,
  newPhotos?: File[],
): Promise<string[]> {
  const urlsParaOtimizar: string[] = []

  // 1. Fotos já salvas no PocketBase
  if (Array.isArray(os.fotos) && os.fotos.length > 0) {
    for (const fotoNome of os.fotos) {
      if (fotoNome) {
        try {
          const url = pb.files.getURL(os, fotoNome)
          if (url) urlsParaOtimizar.push(url)
        } catch (e) {
          console.warn('Erro ao obter URL da foto da OS:', e)
        }
      }
    }
  }

  // 2. Novas fotos passadas como File (converte temporariamente em Data URI)
  if (Array.isArray(newPhotos) && newPhotos.length > 0) {
    for (const file of newPhotos) {
      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => resolve('')
          reader.readAsDataURL(file)
        })
        if (dataUrl) urlsParaOtimizar.push(dataUrl)
      } catch (err) {
        console.warn('Erro ao ler nova foto para relatório:', err)
      }
    }
  }

  // 3. Comprimir via canvas (máximo 600x450 JPEG 0.75 para manter o arquivo bem abaixo de 3 MB)
  const fotosOtimizadas: string[] = []
  for (const src of urlsParaOtimizar) {
    try {
      const otimizada = await otimizarImagemParaImpressao(src, {
        maxWidth: 600,
        maxHeight: 450,
        mimeType: 'image/jpeg',
        quality: 0.75,
      })
      fotosOtimizadas.push(otimizada || src)
    } catch {
      fotosOtimizadas.push(src)
    }
  }

  return fotosOtimizadas
}

/**
 * Pipeline completo de geração do PDF de Relatório da OS:
 * 1. Otimiza fotos
 * 2. Monta HTML oficial premium
 * 3. Renderiza via html2pdf.js com scale 1.5, imageQuality 0.80 e compressJsPdf: true
 * 4. Retorna { base64, file, fileName, html }
 */
export async function gerarPdfRelatorioOS(
  os: OrdemServico,
  opcoes: {
    cliente?: Cliente
    sistema?: Sistema | null
    newPhotos?: File[]
    inversoresInfo?: string
  } = {},
): Promise<{ base64: string; file: File; fileName: string; html: string }> {
  const osIdCurto = os.id ? os.id.slice(-6).toUpperCase() : '000000'
  const clienteNomeLimpo = (opcoes.cliente?.nome || os.expand?.cliente_id?.nome || 'Cliente')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 25)
  const fileName = `Relatorio_OS_${osIdCurto}_${clienteNomeLimpo}.pdf`

  // 1. Otimização de fotos
  const fotosDataUrls = await prepararFotosRelatorio(os, opcoes.newPhotos)

  // 2. Montagem do HTML
  const html = gerarHTMLRelatorioOS({
    os,
    cliente: opcoes.cliente || os.expand?.cliente_id,
    sistema: opcoes.sistema,
    fotosDataUrls,
    inversoresInfo: opcoes.inversoresInfo,
  })

  // 3. Renderização para PDF A4 Base64
  const base64 = await renderizarHTMLParaPdfBase64(html, fileName, {
    scale: 1.5,
    imageQuality: 0.8,
    compressJsPdf: true,
    timeoutMs: 25000,
  })

  if (!base64) {
    throw new Error('Falha na renderização do PDF pelo html2pdf.')
  }

  // 4. Criação do objeto File
  const file = dataUriToFile(base64, fileName)

  return { base64, file, fileName, html }
}

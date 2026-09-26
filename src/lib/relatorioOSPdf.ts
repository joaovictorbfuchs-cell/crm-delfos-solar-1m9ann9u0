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
 * Logotipo oficial vetorial Delfos Solar
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

  const osIdFormatado = `#${os.id.slice(-6).toUpperCase()}`
  const tipoServico = os.tipo_servico || 'Serviço em Campo'
  const prestadorNome =
    os.atribuida_a ||
    os.expand?.responsavel_usuario_id?.name ||
    os.expand?.profissional_id?.nome ||
    'Instalador Delfos Solar'
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

  // Galeria de fotos
  const fotosHtml =
    fotosDataUrls.length > 0
      ? `<div class="fotos-grid">
        ${fotosDataUrls
          .map(
            (url, i) => `
          <div class="foto-card">
            <img src="${url}" alt="Foto ${i + 1}" />
            <div class="foto-legenda">Registro Fotográfico #${i + 1}</div>
          </div>
        `,
          )
          .join('')}
       </div>`
      : `<div class="sem-fotos">Nenhuma fotografia anexada à Ordem de Serviço.</div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Execução de OS ${osIdFormatado}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #FFFFFF;
      color: #1F2937;
      font-size: 11pt;
      line-height: 1.45;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .proposta-container {
      width: 100%;
      max-width: 794px;
      margin: 0 auto;
      padding: 28px 32px 32px 32px;
      background: #FFFFFF;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #166534;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 110px;
      height: 48px;
      display: flex;
      align-items: center;
    }
    .brand-logo-svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .brand-text h1 {
      font-size: 14pt;
      font-weight: 900;
      color: #0F172A;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }
    .brand-text p {
      font-size: 7.5pt;
      font-weight: 700;
      color: #166534;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .header-badge {
      text-align: right;
    }
    .os-numero {
      display: inline-block;
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #86EFAC;
      font-size: 9.5pt;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .os-tipo {
      font-size: 8.5pt;
      color: #64748B;
      font-weight: 700;
      margin-top: 4px;
      text-transform: uppercase;
    }

    .doc-title-bar {
      background: linear-gradient(135deg, #166534 0%, #15803D 100%);
      color: #FFFFFF;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-title-bar h2 {
      font-size: 12pt;
      font-weight: 800;
      letter-spacing: -0.01em;
    }
    .doc-title-bar span {
      font-size: 8.5pt;
      font-weight: 600;
      background: rgba(255,255,255,0.2);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .secao-box {
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      margin-bottom: 14px;
      background: #FFFFFF;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .secao-header {
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .secao-header h3 {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .secao-body {
      padding: 12px 14px;
    }

    .grid-dupla {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .grid-quatro {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .info-item {
      margin-bottom: 6px;
    }
    .info-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748B;
      letter-spacing: 0.03em;
    }
    .info-valor {
      font-size: 9.5pt;
      font-weight: 700;
      color: #1E293B;
      margin-top: 1px;
    }
    .info-valor-destaque {
      color: #166534;
      font-weight: 800;
    }

    .datas-bar {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      padding: 10px 14px;
      border-radius: 6px;
    }

    /* Checklist */
    .checklist-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .checklist-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 9pt;
      color: #334155;
      padding: 4px 6px;
      border-radius: 4px;
      background: #F8FAFC;
    }
    .checklist-item.concluido {
      background: #F0FDF4;
      color: #14532D;
      font-weight: 600;
    }
    .check-icon {
      width: 15px;
      height: 15px;
      border-radius: 3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      font-weight: 900;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .check-icon.checked {
      background: #166534;
      color: #FFFFFF;
    }
    .check-icon.unchecked {
      border: 1px solid #CBD5E1;
      background: #FFFFFF;
      color: transparent;
    }

    /* Observações */
    .observacoes-texto {
      font-size: 9pt;
      color: #1F2937;
      white-space: pre-line;
      line-height: 1.5;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px 12px;
    }

    /* Fotos */
    .fotos-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      page-break-inside: avoid;
    }
    .foto-card {
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      overflow: hidden;
      background: #F8FAFC;
      page-break-inside: avoid;
    }
    .foto-card img {
      width: 100%;
      height: 140px;
      object-fit: cover;
      display: block;
    }
    .foto-legenda {
      font-size: 7.5pt;
      font-weight: 700;
      color: #475569;
      text-align: center;
      padding: 4px;
      background: #FFFFFF;
      border-top: 1px solid #E2E8F0;
    }
    .sem-fotos {
      font-size: 8.5pt;
      color: #94A3B8;
      font-style: italic;
      text-align: center;
      padding: 12px;
      background: #F8FAFC;
      border-radius: 6px;
    }

    /* Assinatura / Prestador */
    .prestador-box {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      align-items: center;
    }
    .assinatura-box {
      text-align: center;
      border-top: 1px solid #94A3B8;
      padding-top: 6px;
      margin-top: 24px;
    }
    .assinatura-box img {
      max-height: 48px;
      max-width: 180px;
      margin-bottom: 4px;
    }

    /* Rodapé do Relatório */
    .doc-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 10px;
      margin-top: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.5pt;
      color: #64748B;
    }
    .footer-left {
      font-weight: 600;
    }
    .footer-right {
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="proposta-container">
    <!-- Cabeçalho -->
    <header class="doc-header">
      <div class="header-brand">
        <div class="logo-box">${renderLogoSvg('os-top')}</div>
        <div class="brand-text">
          <h1>DELFOS SOLAR</h1>
          <p>Engenharia &amp; Serviços Técnicos de Campo</p>
        </div>
      </div>
      <div class="header-badge">
        <span class="os-numero">OS ${osIdFormatado}</span>
        <div class="os-tipo">${tipoServico}</div>
      </div>
    </header>

    <!-- Barra de Título -->
    <div class="doc-title-bar">
      <h2>RELATÓRIO TÉCNICO DE EXECUÇÃO DE SERVIÇO</h2>
      <span>STATUS: CONCLUÍDA</span>
    </div>

    <!-- 1. Dados do Cliente e Usina -->
    <div class="secao-box">
      <div class="secao-header">
        <h3>1. Dados do Cliente &amp; Local da Usina</h3>
        <span style="font-size: 7.5pt; color: #64748B; font-weight: 700;">UC: ${ucUsina}</span>
      </div>
      <div class="secao-body">
        <div class="grid-dupla">
          <div>
            <div class="info-item">
              <div class="info-label">Cliente / Razão Social</div>
              <div class="info-valor info-valor-destaque">${clienteNome}</div>
            </div>
            ${clienteDoc ? `<div class="info-item"><div class="info-label">CPF / CNPJ</div><div class="info-valor">${clienteDoc}</div></div>` : ''}
            ${clienteTelefone ? `<div class="info-item"><div class="info-label">Telefone / WhatsApp</div><div class="info-valor">${clienteTelefone}</div></div>` : ''}
          </div>
          <div>
            <div class="info-item">
              <div class="info-label">Endereço da Instalação / Usina</div>
              <div class="info-valor">${enderecoUsina}${cidadeUsina ? ` • ${cidadeUsina}` : ''}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Potência &amp; Módulos</div>
              <div class="info-valor">${potenciaUsina} (${placasUsina})</div>
            </div>
            <div class="info-item">
              <div class="info-label">Inversor / Equipamento</div>
              <div class="info-valor">${inversorUsina}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Datas de Execução & Atendimento -->
    <div class="secao-box">
      <div class="secao-header">
        <h3>2. Período de Atendimento em Campo</h3>
      </div>
      <div class="secao-body">
        <div class="datas-bar">
          <div>
            <div class="info-label">Início da Execução</div>
            <div class="info-valor">${dataInicioStr}</div>
          </div>
          <div>
            <div class="info-label">Conclusão Efetiva do Serviço</div>
            <div class="info-valor info-valor-destaque">${dataConclusaoStr}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. Checklist Concluído -->
    <div class="secao-box">
      <div class="secao-header">
        <h3>3. Checklist Técnico de Execução (${itensConcluidos}/${totalItens} Concluídos)</h3>
      </div>
      <div class="secao-body">
        ${
          checklistItens.length > 0
            ? `
          <ul class="checklist-list">
            ${checklistItens
              .map(
                (item) => `
              <li class="checklist-item ${item.concluido ? 'concluido' : ''}">
                <span class="check-icon ${item.concluido ? 'checked' : 'unchecked'}">
                  ${item.concluido ? '✓' : ''}
                </span>
                <span>${item.item}</span>
              </li>
            `,
              )
              .join('')}
          </ul>
        `
            : `<div style="font-size: 8.5pt; color: #64748B;">Nenhum item de checklist registrado para esta OS.</div>`
        }
      </div>
    </div>

    <!-- 4. Observações Técnicas do Prestador -->
    <div class="secao-box">
      <div class="secao-header">
        <h3>4. Observações Técnicas &amp; Detalhes da Execução</h3>
      </div>
      <div class="secao-body">
        <div class="observacoes-texto">${observacoesLimpas}</div>
      </div>
    </div>

    <!-- 5. Registros Fotográficos -->
    <div class="secao-box">
      <div class="secao-header">
        <h3>5. Registros Fotográficos do Trabalho em Campo (${fotosDataUrls.length})</h3>
      </div>
      <div class="secao-body">
        ${fotosHtml}
      </div>
    </div>

    <!-- 6. Identificação do Prestador & Assinatura -->
    <div class="secao-box">
      <div class="secao-header">
        <h3>6. Responsável Técnico &amp; Prestador</h3>
      </div>
      <div class="secao-body">
        <div class="prestador-box">
          <div>
            <div class="info-item">
              <div class="info-label">Técnico / Prestador Executante</div>
              <div class="info-valor info-valor-destaque">${prestadorNome}</div>
            </div>
            ${prestadorTelefone ? `<div class="info-item"><div class="info-label">Contato do Técnico</div><div class="info-valor">${prestadorTelefone}</div></div>` : ''}
            <div class="info-item">
              <div class="info-label">Empresa Responsável</div>
              <div class="info-valor">Delfos Engenharia Solar • CNPJ 21.379.952/0001-38</div>
            </div>
          </div>
          <div class="assinatura-box">
            ${assinaturaBase64 ? `<img src="${assinaturaBase64}" alt="Assinatura" />` : ''}
            <div style="font-size: 8pt; font-weight: 700; color: #334155;">${prestadorNome}</div>
            <div style="font-size: 7pt; color: #64748B;">Prestador Autorizado Delfos</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Rodapé -->
    <footer class="doc-footer">
      <div class="footer-left">
        Delfos Engenharia Solar • Rua Espírito Santo, 275 – Centro, Erechim/RS • (54) 99129-2121
      </div>
      <div class="footer-right">
        Relatório gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </footer>
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
 * 2. Monta HTML oficial
 * 3. Renderiza via html2pdf.js com scale 1.5, imageQuality 0.80 e compressJsPdf: true
 * 4. Retorna { base64, file, fileName }
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
  const osIdCurto = os.id.slice(-6).toUpperCase()
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

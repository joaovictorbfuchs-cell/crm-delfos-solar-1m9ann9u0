import logoDelfosPngInline from '@/assets/delfos-solar-5b5ce.png?inline'
import { OrdemServico, Cliente, Sistema, OSChecklistItem } from '@/types/crm'
import { otimizarImagemParaImpressao } from '@/lib/propostaImageOptimizer'
import {
  getRodapeComercialRelatorioOS,
  getRodapeComercialCacheSync,
} from '@/services/configuracoesService'
import pb from '@/lib/pocketbase/client'

export interface RelatorioOSRodapeComercial {
  titulo?: string
  descricao?: string
  indicacao?: string
  contato?: string
}

export interface RelatorioOSDadosInput {
  os: OrdemServico
  cliente?: Cliente
  sistema?: Sistema | null
  fotosDataUrls?: string[] // Data URLs ou URLs diretas otimizadas
  inversoresInfo?: string
  assinaturaBase64?: string
  rodapeComercial?: RelatorioOSRodapeComercial | null
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
export const FOTO_FALLBACK_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450" fill="%230F172A"><rect width="100%" height="100%" fill="%230F172A"/><circle cx="300" cy="200" r="44" fill="%231E293B"/><path d="M280 200h40M300 180v40" stroke="%2364748B" stroke-width="4" stroke-linecap="round"/><text x="300" y="280" fill="%2394A3B8" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">Registro Fotogr%C3%A1fico</text><text x="300" y="306" fill="%2364748B" font-family="sans-serif" font-size="12" text-anchor="middle">Delfos Solar %E2%80%A2 Opera%C3%A7%C3%A3o e Manuten%C3%A7%C3%A3o</text></svg>'

function normalizarChecklistArray(checklistRaw: any): OSChecklistItem[] {
  if (!checklistRaw) return []
  const mapearItem = (item: any, idx: number): OSChecklistItem => ({
    id: item?.id ? String(item.id) : `chk_${idx + 1}`,
    item: String(
      item?.item || item?.texto || item?.descricao || item?.nome || `Item ${idx + 1}`,
    ).trim(),
    concluido: Boolean(item?.concluido),
  })

  if (Array.isArray(checklistRaw)) {
    return checklistRaw
      .filter((item) => item !== null && item !== undefined && typeof item === 'object')
      .map(mapearItem)
  }
  if (typeof checklistRaw === 'string') {
    const trimmed = checklistRaw.trim()
    if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item !== null && item !== undefined && typeof item === 'object')
          .map(mapearItem)
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return Object.values(parsed)
          .filter((item: any) => item !== null && typeof item === 'object')
          .map(mapearItem)
      }
    } catch {
      return []
    }
  }
  if (typeof checklistRaw === 'object') {
    try {
      const vals = Object.values(checklistRaw)
      if (Array.isArray(vals)) {
        return vals.filter((item: any) => item !== null && typeof item === 'object').map(mapearItem)
      }
    } catch {
      return []
    }
  }
  return []
}

import { compilarDadosRelatorioOS } from './relatorioOSCanonical'

export function gerarHTMLRelatorioOS(dados: RelatorioOSDadosInput): string {
  const os = dados?.os || ({} as any)
  const cliente = dados?.cliente || os.expand?.cliente_id || null
  const sistema = dados?.sistema || null
  const rawFotos = Array.isArray(dados?.fotosDataUrls) ? dados.fotosDataUrls : []
  const fotosDataUrls: string[] = rawFotos.filter((f) => f && typeof f === 'string' && f.trim())

  const rel = compilarDadosRelatorioOS(os, cliente, sistema, fotosDataUrls)

  const servicosRowsHtml = rel.servicosExecutados
    .map(
      (s) => `
    <tr>
      <td data-label="Atividade" style="padding: 10px 12px; border-bottom: 1px solid #DDE4EE; font-weight: 600; color: #1A2332;">${s.atividade}</td>
      <td data-label="Local / Ativo" style="padding: 10px 12px; border-bottom: 1px solid #DDE4EE; color: #536377;">${s.localAtivo}</td>
      <td data-label="Quantidade" style="padding: 10px 12px; border-bottom: 1px solid #DDE4EE; color: #536377;">${s.quantidade}</td>
      <td data-label="Situação" style="padding: 10px 12px; border-bottom: 1px solid #DDE4EE;">
        <span style="display: inline-block; background: #E8F7EE; color: #126330; border: 1px solid #B8E4C7; font-weight: 700; font-size: 0.75rem; padding: 2px 8px; border-radius: 6px; white-space: nowrap;">${s.situacao}</span>
      </td>
      <td data-label="Evidência" style="padding: 10px 12px; border-bottom: 1px solid #DDE4EE; color: #536377;">${s.evidencia}</td>
    </tr>
  `,
    )
    .join('')

  const fotosCardsHtml = rel.fotos
    .slice(0, 3)
    .map(
      (f) => `
    <div style="background: #F4F7FA; border: 1px solid #DDE4EE; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column;">
      ${
        f.url
          ? `<div style="height: 140px; background: #0E2A47; overflow: hidden;"><img src="${f.url}" alt="${f.titulo}" style="width:100%; height:100%; object-fit:cover;" /></div>`
          : `<div style="height: 140px; background: linear-gradient(135deg, #224364 0%, #0E2A47 100%); color: #FFF; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; text-align: center;">
              <div style="font-size: 1.5rem; margin-bottom: 4px;">📷</div>
              <div style="font-size: 0.8rem; font-weight: 700; color: #FFFFFF;">${f.titulo}</div>
            </div>`
      }
      <div style="padding: 10px 12px; font-size: 0.75rem; color: #536377; background: #FFFFFF; border-top: 1px solid #EAEFF5; flex-grow: 1;">
        <strong style="display: block; color: #0E2A47; font-size: 0.8rem; margin-bottom: 2px;">${f.subtitulo}</strong>
        ${f.descricao}
        <div style="margin-top: 6px; font-size: 0.7rem; color: #8896A6;">${f.dataHora}</div>
      </div>
    </div>
  `,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Atendimento — Delfos Solar</title>
  <style>
    :root {
      --navy-dark: #0E2A47;
      --gold-primary: #C9A227;
      --gold-surface: #FCF8EB;
      --gold-border: #E8D388;
      --bg-page: #F7F9FC;
      --text-main: #1A2332;
      --text-muted: #536377;
      --border-color: #DDE4EE;
      --card-bg: #FFFFFF;
      --radius: 12px;
    }
    * { box-sizing: border-box; }
    body {
      background-color: var(--bg-page);
      color: var(--text-main);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .doc-container {
      max-width: 900px;
      margin: 20px auto 40px;
      padding: 0 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .rep-card {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--radius);
      padding: 20px 24px;
      box-shadow: 0 2px 8px rgba(14, 42, 71, 0.04);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .timbrado-header {
      background: var(--navy-dark) !important;
      color: #FFFFFF !important;
      border-radius: var(--radius) var(--radius) 0 0;
      padding: 24px 28px;
      box-shadow: 0 4px 16px rgba(14, 42, 71, 0.12);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .timbrado-top {
      display: flex;
      align-items: center;
      gap: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 14px;
      margin-bottom: 12px;
    }
    .brand-logo-img {
      height: 46px;
      max-width: 140px;
      width: auto;
      object-fit: contain;
      display: block;
      flex-shrink: 0;
    }
    .brand-logo-circle {
      width: 46px;
      height: 46px;
      border-radius: 50%;
      background: var(--gold-primary) !important;
      color: #0E2A47 !important;
      font-weight: 900;
      font-size: 1.6rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .brand-text h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      color: #FFFFFF !important;
      line-height: 1.2;
    }
    .brand-text p {
      margin: 2px 0 0;
      font-size: 0.78rem;
      color: #E2E8F0;
      font-weight: 500;
    }
    .timbrado-meta {
      font-size: 0.75rem;
      color: #C2D3E8;
      line-height: 1.5;
    }
    .section-title {
      margin: 0 0 14px;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--navy-dark);
      border-bottom: 2px solid #EBF0F7;
      padding-bottom: 6px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px 20px;
    }
    .grid-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      font-weight: 600;
      display: block;
      margin-bottom: 2px;
    }
    .grid-value {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--navy-dark);
    }
    .highlight-card {
      border-left: 6px solid var(--gold-primary) !important;
      background: var(--gold-surface) !important;
      border-color: var(--gold-border) var(--gold-border) var(--gold-border) var(--gold-primary);
    }
    .status-pill {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid #B8E4C7;
      background: #F1F9F4 !important;
    }
    .status-icon-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #1B8342 !important;
      box-shadow: 0 0 0 4px #D0EED9;
      flex-shrink: 0;
    }
    .timbrado-footer {
      background: var(--navy-dark) !important;
      color: #FFFFFF !important;
      border-radius: 0 0 var(--radius) var(--radius);
      padding: 20px 24px;
      font-size: 0.75rem;
      line-height: 1.55;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      body { background: #FFFFFF !important; color: #000000 !important; }
      .doc-container { max-width: 100% !important; margin: 0 !important; padding: 0 !important; gap: 10px !important; }
      .rep-card { box-shadow: none !important; border: 1px solid #D0D0D0 !important; border-radius: 6px !important; padding: 14px 18px !important; }
      .timbrado-header { border-radius: 6px 6px 0 0 !important; padding: 16px 20px !important; }
      .timbrado-footer { border-radius: 0 0 6px 6px !important; padding: 14px 20px !important; }
    }
  </style>
</head>
<body>
  <div class="doc-container">
    <!-- 1. Cabeçalho Timbrado -->
    <header class="timbrado-header">
      <div class="timbrado-top">
        <img src="${logoDelfosPngInline}" alt="Delfos Solar" class="brand-logo-img" />
        <div class="brand-text">
          <h1>DELFOS ENGENHARIA SOLAR</h1>
          <p>Engenharia &amp; Operação de Usinas Fotovoltaicas</p>
        </div>
      </div>
      <div class="timbrado-meta">
        Delfos Engenharia Ltda • CNPJ 21.379.952/0001-38 • Rua Espírito Santo, 275 – Erechim/RS, CEP 99709-296<br />
        Telefone: (54) 99129-2121 • E-mail: solar@updates.delfos.eng.br • Web: www.delfos.eng.br
      </div>
    </header>

    <!-- 2. Título & Meta Pills -->
    <section class="rep-card" style="border-top: 4px solid var(--navy-dark);">
      <h2 style="margin: 0 0 8px; font-size: 1.35rem; font-weight: 800; color: var(--navy-dark);">Relatório de Atendimento e Condição do Sistema</h2>
      <div style="display: flex; flex-wrap: wrap; gap: 10px 16px; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 8px;">
        <span><strong style="color: var(--navy-dark);">Relatório nº:</strong> ${rel.numeroRelatorio}</span>
        <span><strong style="color: var(--navy-dark);">OS vinculada:</strong> ${rel.osCodigo}</span>
        <span><strong style="color: var(--navy-dark);">Revisão:</strong> ${rel.revisao}</span>
        <span><strong style="color: var(--navy-dark);">Data de emissão:</strong> ${rel.dataEmissao}</span>
      </div>
    </section>

    <!-- 3. Resumo do Atendimento -->
    <section class="rep-card">
      <h3 class="section-title">Resumo do atendimento</h3>
      <div class="details-grid">
        <div><span class="grid-label">Cliente</span><span class="grid-value">${rel.clienteNome}</span></div>
        <div><span class="grid-label">Endereço da usina</span><span class="grid-value">${rel.enderecoUsina}</span></div>
        <div><span class="grid-label">Data do atendimento</span><span class="grid-value">${rel.dataAtendimento}</span></div>
        <div><span class="grid-label">Horários (Início / Término)</span><span class="grid-value">${rel.horarioInicioTermino}</span></div>
        <div><span class="grid-label">Tipo de serviço</span><span class="grid-value">${rel.tipoServico}</span></div>
        <div><span class="grid-label">OS Vinculada</span><span class="grid-value">${rel.osCodigo}</span></div>
        <div><span class="grid-label">Concessionária &amp; UC</span><span class="grid-value">${rel.concessionariaUc}</span></div>
        <div style="grid-column: 1 / -1;"><span class="grid-label">Dados do sistema gerador</span><span class="grid-value">${rel.dadosSistemaGerador}</span></div>
      </div>
    </section>

    <!-- 4. Badges de Status -->
    <section class="rep-card">
      <div style="display: flex; gap: 14px; flex-wrap: wrap;">
        <div class="status-pill">
          <div class="status-icon-dot"></div>
          <div>
            <div style="font-size: 0.72rem; color: #2C6B40; font-weight: 600; text-transform: uppercase;">Situação do atendimento</div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0E5325;">${rel.situacaoAtendimento}</div>
          </div>
        </div>
        <div class="status-pill">
          <div class="status-icon-dot"></div>
          <div>
            <div style="font-size: 0.72rem; color: #2C6B40; font-weight: 600; text-transform: uppercase;">Condição do sistema ao término</div>
            <div style="font-size: 0.95rem; font-weight: 800; color: #0E5325;">${rel.condicaoSistema}</div>
          </div>
        </div>
      </div>
      <p style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4; font-style: italic; margin: 10px 0 0;">
        * Nota técnica: Situação do atendimento refere-se ao escopo da visita. Condição do sistema refere-se ao estado operacional observado. São avaliações independentes.
      </p>
    </section>

    <!-- 5. Serviços executados -->
    <section class="rep-card">
      <h3 class="section-title">Serviços executados</h3>
      <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.85rem; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #F1F5F9; color: var(--navy-dark); font-weight: 700;">
            <th style="padding: 9px 12px; text-align: left; font-size: 0.78rem; border-bottom: 2px solid var(--border-color);">Atividade</th>
            <th style="padding: 9px 12px; text-align: left; font-size: 0.78rem; border-bottom: 2px solid var(--border-color);">Local / Ativo</th>
            <th style="padding: 9px 12px; text-align: left; font-size: 0.78rem; border-bottom: 2px solid var(--border-color);">Quantidade</th>
            <th style="padding: 9px 12px; text-align: left; font-size: 0.78rem; border-bottom: 2px solid var(--border-color);">Situação</th>
            <th style="padding: 9px 12px; text-align: left; font-size: 0.78rem; border-bottom: 2px solid var(--border-color);">Evidência</th>
          </tr>
        </thead>
        <tbody>${servicosRowsHtml}</tbody>
      </table>

      <!-- Detalhes da Limpeza -->
      <div style="margin-top: 14px; padding: 12px 14px; background: #F8FAFD; border: 1px solid #E2E8F0; border-radius: 8px;">
        <div style="font-size: 0.8rem; font-weight: 700; color: var(--navy-dark); text-transform: uppercase; margin-bottom: 6px;">Detalhes da limpeza</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 16px; font-size: 0.8rem;">
          <div><strong style="color: var(--navy-dark);">Módulos previstos / atendidos:</strong> ${rel.modulosPrevistosAtendidos}</div>
          <div><strong style="color: var(--navy-dark);">Método executado:</strong> ${rel.metodoExecutado}</div>
          <div><strong style="color: var(--navy-dark);">Manual do fabricante:</strong> ${rel.manualFabricante}</div>
          <div><strong style="color: var(--navy-dark);">Ressalvas observadas:</strong> ${rel.ressalvasObservadas}</div>
        </div>
      </div>
    </section>

    <!-- 6. Registro Fotográfico -->
    <section class="rep-card">
      <h3 class="section-title">Registro fotográfico</h3>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">${fotosCardsHtml}</div>
    </section>

    <!-- 7. Pendências e Recomendações -->
    <section class="rep-card">
      <h3 class="section-title">Pendências e recomendações</h3>
      ${
        rel.pendenciasRecomendacoes
          ? `<div style="background: #F8FAFD; border: 1px solid #DDE4EE; border-radius: 8px; padding: 12px 14px; color: #1A2332; font-size: 0.88rem; line-height: 1.5; white-space: pre-wrap; margin-bottom: 8px;">
        ${rel.pendenciasRecomendacoes}
      </div>`
          : `<div style="background: #F1F9F4; border: 1px solid #B8E4C7; border-radius: 8px; padding: 12px 14px; color: #0E5325; font-size: 0.88rem;">
        <strong>✓ Conformidade técnica:</strong> ${rel.conformidadeTecnica}
      </div>`
      }
      <div style="margin-top: 10px; font-size: 0.88rem; font-weight: 600; color: var(--navy-dark);">
        📅 Próxima manutenção prevista: <strong>${rel.proximaManutencao}</strong> (semestral, conforme plano de manutenção).
      </div>
    </section>

    <!-- 8. Conclusão Técnica -->
    <section class="rep-card">
      <h3 class="section-title">Conclusão técnica</h3>
      <p style="margin: 0 0 10px; font-size: 0.9rem; line-height: 1.6;">${rel.conclusaoNarrativa}</p>
      <div style="display: flex; flex-wrap: wrap; gap: 10px 16px; background: #F5F8FC; border: 1px solid #D7E2F0; border-radius: 8px; padding: 10px 14px; font-size: 0.8rem;">
        <div><strong style="color: var(--navy-dark);">Situação do serviço:</strong> ${rel.conclusaoSituacao}</div>
        <div><strong style="color: var(--navy-dark);">• Condição no escopo avaliado:</strong> ${rel.conclusaoCondicao}</div>
        <div><strong style="color: var(--navy-dark);">• Desempenho energético:</strong> ${rel.conclusaoDesempenho}</div>
      </div>
    </section>

    <!-- 9. Próximos Passos -->
    <section class="rep-card">
      <h3 class="section-title">Próximos passos</h3>
      <p style="margin: 0 0 10px; font-size: 0.88rem; color: #2C3E50;">${rel.proximosPassosTexto}</p>
      ${
        rel.exibirPlanoOM
          ? `<div style="background: #FFFDF5; border: 1px solid #E5D38A; border-radius: 10px; padding: 14px 18px; margin-bottom: 6px;">
        <div style="color: #5D4300; font-size: 0.95rem; font-weight: 800; margin-bottom: 4px;">${rel.planoOmTitulo}</div>
        <p style="font-size: 0.85rem; color: #2F2A14; line-height: 1.5; margin: 0 0 8px;">${rel.planoOmTexto}</p>
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--navy-dark);">${rel.planoOmContato}</div>
      </div>`
          : ''
      }
    </section>

    <!-- 10. Recebimento do Cliente -->
    <section class="rep-card">
      <h3 class="section-title">Recebimento do cliente</h3>
      <div class="details-grid" style="margin-bottom: 8px;">
        <div><span class="grid-label">Forma e data de envio</span><span class="grid-value">${rel.formaEDataEnvio}</span></div>
        <div><span class="grid-label">Recebido por</span><span class="grid-value">${rel.recebidoPor}</span></div>
      </div>
      <p style="margin: 0; font-size: 0.72rem; color: var(--text-muted); line-height: 1.4; border-top: 1px dashed var(--border-color); padding-top: 8px;">
        * Nota: A confirmação registra o recebimento deste documento e das recomendações nele descritas. Não representa certificação técnica da instalação pelo cliente.
      </p>
    </section>

    <!-- 14. Rodapé Timbrado -->
    <footer class="timbrado-footer">
      <p style="margin: 0 0 4px; color: #D2DFEE;"><strong style="color: #FFFFFF;">Documento oficial Delfos Solar</strong> — Atendimento técnico autorizado em estrita conformidade com as normas ABNT NBR 16690 e NR-10 (Segurança em Instalações e Serviços em Eletricidade).</p>
      <p style="margin: 0 0 8px; color: #D2DFEE;">Central de Operação e Suporte: (54) 99129-2121 • solar@updates.delfos.eng.br • Rua Espírito Santo, 275 – Erechim/RS</p>
      <div style="border-top: 1px solid rgba(255, 255, 255, 0.15); margin-bottom: 8px;"></div>
      <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; color: #A9C2DF; font-weight: 600; font-size: 0.72rem;">
        <span>Relatório ${rel.numeroRelatorio} • OS ${rel.osCodigo} • Revisão ${rel.revisao}</span>
        <span>Delfos Engenharia Solar © ${new Date().getFullYear()}</span>
      </div>
    </footer>
  </div>
</body>
</html>`
}

/**
 * HTML anterior para fallback legado quando necessário
 */
function _gerarHTMLRelatorioOSLegado(
  osIdFormatado: string,
  tipoServico: string,
  concessionaria: string,
  ucUsina: string,
  clienteNome: string,
  enderecoUsina: string,
  cidadeUsina: string,
  clienteDoc: string,
  clienteTelefone: string,
  potenciaUsina: string,
  telhadoTipo: string,
  placasUsina: string,
  placasMarca: string,
  inversorCompleto: string,
  dataInicioStr: string,
  dataConclusaoStr: string,
  checklistHtml: string,
  servicosExecutadosHtml: string,
  observacoesLimpas: string,
  fotoMedidorDataUrl: string | null,
  fotosHtml: string,
  prestadorNome: string,
  prestadorTelefone: string,
  assinaturaBase64: string | undefined,
  rodapeComercial: any,
  itensConcluidos: number,
  totalItens: number,
  agoraData: string,
  agoraHora: string,
  fotosDataUrls: string[] = [],
): string {
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

    <!-- 1. DADOS DO CLIENTE & DADOS TÉCNICOS DA USINA -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 1. Dados do Cliente &amp; Cadastro Técnico da Usina
            </td>
            <td class="secao-header-extra">
              Concessionária: <strong style="color: #0F172A;">${concessionaria}</strong> • UC: <strong style="color: #0F172A;">${ucUsina}</strong>
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
                      <div class="field-label">Potência Nominal da Usina</div>
                      <div class="field-value">${potenciaUsina}</div>
                    </div>
                  </td>
                  <td style="width: 50%; padding-left: 4px;">
                    <div class="field-box">
                      <div class="field-label">Estrutura / Telhado</div>
                      <div class="field-value">${telhadoTipo}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="field-cell" style="width: 50%;">
              <table cellpadding="0" cellspacing="0" style="width: 100%;">
                <tr>
                  <td style="width: 50%; padding-right: 4px;">
                    <div class="field-box">
                      <div class="field-label">Qtd. Módulos / Placas</div>
                      <div class="field-value">${placasUsina}</div>
                    </div>
                  </td>
                  <td style="width: 50%; padding-left: 4px;">
                    <div class="field-box">
                      <div class="field-label">Marca dos Módulos</div>
                      <div class="field-value">${placasMarca}</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
            <td class="field-cell" style="width: 50%;">
              <div class="field-box">
                <div class="field-label">Inversor(es) Instalado(s)</div>
                <div class="field-value">${inversorCompleto}</div>
              </div>
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

    <!-- 4. SERVIÇOS E PROCEDIMENTOS EXECUTADOS NO LOCAL JUNTO AOS DETALHES DE EXECUÇÃO -->
    <div class="secao-card" style="border: 1.5px solid #86EFAC; background: #F0FDF4;">
      <div class="secao-card-header" style="background: #DCFCE7; border-bottom: 1.5px solid #86EFAC;">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text" style="color: #166534;">
              <span class="secao-title-icon" style="color: #15803D;">&#9632;</span> 4. Serviços e Procedimentos Executados no Local
            </td>
            <td class="secao-header-extra" style="color: #166534; font-weight: 800;">
              ${itensConcluidos} de ${totalItens} procedimentos validados
            </td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        <div style="background: #FFFFFF; border: 1px solid #BBF7D0; border-radius: 6px; padding: 10px 12px; margin-bottom: 10px;">
          <div style="font-size: 7.5pt; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.04em;">Procedimentos Técnicos Realizados em Campo</div>
          ${servicosExecutadosHtml}
        </div>
        ${
          observacoesLimpas && observacoesLimpas !== 'Sem observações adicionais.'
            ? `<div style="background: #FFFFFF; border: 1px solid #BBF7D0; border-radius: 6px; padding: 10px 12px;">
                <div style="font-size: 7.5pt; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.04em;">Detalhes e Observações de Execução</div>
                <div style="font-size: 8.5pt; color: #1E293B; line-height: 1.5; white-space: pre-line;">${observacoesLimpas}</div>
              </div>`
            : ''
        }
      </div>
    </div>

    <!-- 5. OBSERVAÇÕES TÉCNICAS DO PRESTADOR -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 5. Observações Técnicas &amp; Detalhes da Execução
            </td>
            <td class="secao-header-extra">Registro de Campo</td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        <div class="observacoes-box">${observacoesLimpas}</div>
      </div>
    </div>

    <!-- 6. REGISTROS FOTOGRÁFICOS & LEITURA DO MEDIDOR -->
    <div class="secao-card">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 6. Registros Fotográficos do Trabalho Realizado
            </td>
            <td class="secao-header-extra">
              ${fotosDataUrls.length + (fotoMedidorDataUrl ? 1 : 0)} ${fotosDataUrls.length + (fotoMedidorDataUrl ? 1 : 0) === 1 ? 'registro' : 'registros'}
            </td>
          </tr>
        </table>
      </div>
      <div class="secao-card-body">
        ${
          fotoMedidorDataUrl
            ? `
        <!-- FOTO DO MEDIDOR EM DESTAQUE -->
        <div class="medidor-box">
          <table class="medidor-table" cellpadding="0" cellspacing="0">
            <tr>
              <td class="medidor-img-cell">
                <img src="${fotoMedidorDataUrl}" alt="Leitura do Medidor" class="medidor-img" />
              </td>
              <td class="medidor-info-cell">
                <div class="medidor-badge">DESTAQUE • MEDIÇÃO DE CONCESSIONÁRIA</div>
                <div class="medidor-titulo">Leitura do medidor</div>
                <div class="medidor-desc">Registro fotográfico do medidor bidirecional da concessionária aferido in loco durante a execução do serviço.</div>
              </td>
            </tr>
          </table>
        </div>`
            : ''
        }
        ${fotosHtml}
      </div>
    </div>

    <!-- 7. RESPONSÁVEL TÉCNICO & ASSINATURA -->
    <div class="secao-card assinatura-wrap">
      <div class="secao-card-header">
        <table class="secao-header-table" cellpadding="0" cellspacing="0">
          <tr>
            <td class="secao-title-text">
              <span class="secao-title-icon">&#9632;</span> 7. Responsável Técnico &amp; Validação de Conclusão
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

    <!-- BLOCO COMERCIAL E INDICAÇÃO CONFIGURÁVEL -->
    ${
      rodapeComercial && (rodapeComercial.titulo || rodapeComercial.descricao)
        ? `
    <div class="comercial-box">
      <div class="comercial-titulo">&#9733; ${rodapeComercial.titulo}</div>
      <div class="comercial-desc">${rodapeComercial.descricao}</div>
      ${
        rodapeComercial.indicacao
          ? `<div class="comercial-indicacao">&#127873; ${rodapeComercial.indicacao}</div>`
          : ''
      }
      ${
        rodapeComercial.contato
          ? `<div class="comercial-contato">${rodapeComercial.contato}</div>`
          : ''
      }
    </div>`
        : ''
    }

    <!-- RODAPÉ INSTITUCIONAL CANÔNICO DELFOS SOLAR -->
    <div class="footer-card">
      <table class="footer-table" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align: middle;">
            <div class="footer-brand-title">Delfos Engenharia Solar • Excelência Técnica em Energia Fotovoltaica</div>
            <div class="footer-contact">Rua Espírito Santo, 275 – Erechim/RS, CEP 99709-296 • Telefone / WhatsApp: (54) 99129-2121 • www.delfos.eng.br</div>
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
  if (Array.isArray(os?.fotos) && os.fotos.length > 0) {
    for (const fotoNome of os.fotos) {
      if (fotoNome) {
        try {
          const url = pb.files.getURL(os, fotoNome)
          if (url) urlsParaOtimizar.push(url)
        } catch (e) {
          console.warn('Erro ao obter URL da foto da OS, usando placeholder:', e)
          urlsParaOtimizar.push(FOTO_FALLBACK_PLACEHOLDER)
        }
      }
    }
  }

  // 2. Novas fotos passadas como File (converte temporariamente em Data URI com fallback defensivo)
  if (Array.isArray(newPhotos) && newPhotos.length > 0) {
    for (const file of newPhotos) {
      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ''))
          reader.onerror = () => resolve(FOTO_FALLBACK_PLACEHOLDER)
          reader.readAsDataURL(file)
        })
        urlsParaOtimizar.push(dataUrl || FOTO_FALLBACK_PLACEHOLDER)
      } catch (err) {
        console.warn('Erro ao ler nova foto para relatório, usando placeholder:', err)
        urlsParaOtimizar.push(FOTO_FALLBACK_PLACEHOLDER)
      }
    }
  }

  // 3. Comprimir via canvas (máximo 600x450 JPEG 0.75 para manter o arquivo leve)
  // Se alguma foto falhar ao virar dataUrl, usar placeholder embutido em vez de quebrar o HTML inteiro
  const fotosOtimizadas: string[] = []
  for (const src of urlsParaOtimizar) {
    try {
      if (!src || src.startsWith('data:image/svg+xml')) {
        fotosOtimizadas.push(src || FOTO_FALLBACK_PLACEHOLDER)
        continue
      }
      const otimizada = await otimizarImagemParaImpressao(src, {
        maxWidth: 600,
        maxHeight: 450,
        mimeType: 'image/jpeg',
        quality: 0.75,
      })
      fotosOtimizadas.push(otimizada || src || FOTO_FALLBACK_PLACEHOLDER)
    } catch (errOtimizacao) {
      console.warn(
        'Falha na otimização de imagem para o relatório, usando placeholder:',
        errOtimizacao,
      )
      fotosOtimizadas.push(FOTO_FALLBACK_PLACEHOLDER)
    }
  }

  return fotosOtimizadas
}

/**
 * Pipeline completo de geração do PDF de Relatório da OS:
 * 1. Otimiza fotos
 * 2. Renderiza via @react-pdf/renderer (RelatorioOSPDFDocument) para garantir
 *    formatação perfeita, tipografia institucional, margem interna de 25mm e
 *    mesmo binário/base64 tanto para o download quanto para o WhatsApp.
 * 3. Fallback transparente com HTML oficial caso ambiente não suporte canvas/@react-pdf.
 * 4. Retorna { base64, file, fileName, html }
 */
export async function gerarPdfRelatorioOS(
  os: OrdemServico,
  opcoes: {
    cliente?: Cliente
    sistema?: Sistema | null
    newPhotos?: File[]
    inversoresInfo?: string
    rodapeComercial?: RelatorioOSRodapeComercial | null
  } = {},
): Promise<{ base64: string; file: File; fileName: string; html: string }> {
  const osIdCurto = os.id ? os.id.slice(-6).toUpperCase() : '000000'
  const clienteNomeLimpo = (opcoes.cliente?.nome || os.expand?.cliente_id?.nome || 'Cliente')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 25)
  const fileName = `Relatorio_OS_${osIdCurto}_${clienteNomeLimpo}.pdf`

  // 1. Carrega configuração de rodapé se não fornecida explicitamente
  const rodape = opcoes.rodapeComercial ?? (await getRodapeComercialRelatorioOS())

  // 2. Otimização de fotos
  const fotosDataUrls = await prepararFotosRelatorio(os, opcoes.newPhotos)

  // 3. Montagem do HTML oficial (mantido para compatibilidade e visualização web)
  const html = gerarHTMLRelatorioOS({
    os,
    cliente: opcoes.cliente || os.expand?.cliente_id,
    sistema: opcoes.sistema,
    fotosDataUrls,
    inversoresInfo: opcoes.inversoresInfo,
    rodapeComercial: rodape,
  })

  // 4. Renderização canônica 100% via @react-pdf/renderer (mesmo gerador para Download e WhatsApp)
  const [{ pdf }, { RelatorioOSPDFDocument }, { blobParaDataUriBase64 }, React] = await Promise.all(
    [
      import('@react-pdf/renderer'),
      import('@/components/RelatorioOSPDFDocument'),
      import('@/lib/pdfBlobUtils'),
      import('react'),
    ],
  )

  const docElement = React.createElement(RelatorioOSPDFDocument, {
    dados: {
      os,
      cliente: opcoes.cliente || os.expand?.cliente_id,
      sistema: opcoes.sistema,
      fotosDataUrls,
      inversoresInfo: opcoes.inversoresInfo,
      rodapeComercial: rodape,
    },
  })
  const instance = pdf(docElement)
  const blob = await instance.toBlob()
  const base64 = await blobParaDataUriBase64(blob)

  if (!base64) {
    throw new Error('Falha na renderização do PDF do relatório técnico.')
  }

  // 5. Criação do objeto File
  const file = dataUriToFile(base64, fileName)

  return { base64, file, fileName, html }
}

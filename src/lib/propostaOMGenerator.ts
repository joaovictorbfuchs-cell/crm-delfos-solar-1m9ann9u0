import type { Cliente, Sistema, OMPlanoTipo } from '@/types/crm'
import {
  calcularTodosPlanosOM,
  normalizarNomePlanoOM,
  PLANOS_OM_VALORES_BASE,
  type PlanoOMChave,
  type ValoresCalculadosPlanoOM,
} from '@/lib/planosOM'
import { normalizarConteudoPropostaOM, type ConteudoPropostaOM } from '@/lib/conteudoPropostaOM'

export interface PropostaCalculos {
  valorAtivoProtegido: number
  perda15Ano: number
  perda20Ano: number
  prejuizo20Dias: number
  prejuizo30Dias: number
  planos: {
    Essencial: {
      mensal: number
      anual: number
      mensalCalculadoFormula?: number
      anualCalculadoFormula?: number
      isNegociado?: boolean
    }
    Inspeção: {
      mensal: number
      anual: number
      mensalCalculadoFormula?: number
      anualCalculadoFormula?: number
      isNegociado?: boolean
    }
    Completo: {
      mensal: number
      anual: number
      mensalCalculadoFormula?: number
      anualCalculadoFormula?: number
      isNegociado?: boolean
    }
    /** Alias de compatibilidade com versões anteriores */
    Prevenção?: {
      mensal: number
      anual: number
      mensalCalculadoFormula?: number
      anualCalculadoFormula?: number
      isNegociado?: boolean
    }
  }
  detalhesPlanos?: Record<PlanoOMChave, ValoresCalculadosPlanoOM>
  planoEscolhido?: OMPlanoTipo
  valorMensalEscolhido?: number
  valorAnualEscolhido?: number
}

/**
 * Fonte canônica de valores base (compatibilidade retroativa).
 * Novos códigos devem preferir o cálculo dinâmico via calcularPropostaOM ou calcularTodosPlanosOM.
 */
export const PLANOS_OM_VALORES: Record<string, { mensal: number; anual: number }> = {
  Essencial: { ...PLANOS_OM_VALORES_BASE.Essencial },
  Inspeção: { ...PLANOS_OM_VALORES_BASE.Inspeção },
  Prevenção: { ...PLANOS_OM_VALORES_BASE.Inspeção },
  Completo: { ...PLANOS_OM_VALORES_BASE.Completo },
}

export function calcularPropostaOM(params: {
  geracaoMensalKwh: number
  valorKwh: number
  distanciaKm?: number
  valorKm?: number
  numeroModulos?: number
  valorPorPlaca?: number
  planoEscolhido?: OMPlanoTipo
  valoresNegociados?: Partial<Record<PlanoOMChave, number | null>>
}): PropostaCalculos {
  const geracao = Math.max(0, Number(params.geracaoMensalKwh) || 0)
  const tarifa = Math.max(0, Number(params.valorKwh) || 0)

  // Cálculos obrigatórios
  const valorAtivoProtegido = geracao * tarifa
  const perda15Ano = valorAtivoProtegido * 12 * 0.15
  const perda20Ano = valorAtivoProtegido * 12 * 0.2
  const prejuizo20Dias = (valorAtivoProtegido * 20) / 30
  const prejuizo30Dias = (valorAtivoProtegido * 30) / 30 // equivalente a 1 mês

  // Cálculo dinâmico dos 3 planos com base nas variáveis informadas e eventuais valores negociados
  const detalhesPlanos = calcularTodosPlanosOM({
    distanciaKm: params.distanciaKm,
    valorKm: params.valorKm,
    numeroModulos: params.numeroModulos,
    geracaoMensalKwh: geracao,
    valorKwh: tarifa,
    valorPorPlaca: params.valorPorPlaca,
    valoresNegociados: params.valoresNegociados,
  })

  const planos = {
    Essencial: {
      mensal: detalhesPlanos.Essencial.mensal,
      anual: detalhesPlanos.Essencial.anual,
      mensalCalculadoFormula: detalhesPlanos.Essencial.mensalCalculadoFormula,
      anualCalculadoFormula: detalhesPlanos.Essencial.anualCalculadoFormula,
      isNegociado: detalhesPlanos.Essencial.isNegociado,
    },
    Inspeção: {
      mensal: detalhesPlanos.Inspeção.mensal,
      anual: detalhesPlanos.Inspeção.anual,
      mensalCalculadoFormula: detalhesPlanos.Inspeção.mensalCalculadoFormula,
      anualCalculadoFormula: detalhesPlanos.Inspeção.anualCalculadoFormula,
      isNegociado: detalhesPlanos.Inspeção.isNegociado,
    },
    Completo: {
      mensal: detalhesPlanos.Completo.mensal,
      anual: detalhesPlanos.Completo.anual,
      mensalCalculadoFormula: detalhesPlanos.Completo.mensalCalculadoFormula,
      anualCalculadoFormula: detalhesPlanos.Completo.anualCalculadoFormula,
      isNegociado: detalhesPlanos.Completo.isNegociado,
    },
    // Alias para manter compatibilidade com leituras antigas de planos.Prevenção
    Prevenção: {
      mensal: detalhesPlanos.Inspeção.mensal,
      anual: detalhesPlanos.Inspeção.anual,
      mensalCalculadoFormula: detalhesPlanos.Inspeção.mensalCalculadoFormula,
      anualCalculadoFormula: detalhesPlanos.Inspeção.anualCalculadoFormula,
      isNegociado: detalhesPlanos.Inspeção.isNegociado,
    },
  }

  const planoRaw = params.planoEscolhido
  const chaveNormalizada = planoRaw ? normalizarNomePlanoOM(planoRaw) : undefined
  const valorMensalEscolhido = chaveNormalizada ? planos[chaveNormalizada]?.mensal : undefined
  const valorAnualEscolhido = chaveNormalizada ? planos[chaveNormalizada]?.anual : undefined

  return {
    valorAtivoProtegido,
    perda15Ano,
    perda20Ano,
    prejuizo20Dias,
    prejuizo30Dias,
    planos,
    detalhesPlanos,
    planoEscolhido: planoRaw,
    valorMensalEscolhido,
    valorAnualEscolhido,
  }
}

export interface DadosEmpresaDelfos {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  endereco: string
  telefone: string
  email: string
  site: string
}

export const DADOS_EMPRESA_DELFOS: DadosEmpresaDelfos = {
  razaoSocial: 'Delfos Engenharia Ltda',
  nomeFantasia: 'Delfos Solar',
  cnpj: '21.379.952/0001-38',
  endereco: 'Rua Espírito Santo 275, Centro, Erechim - RS',
  telefone: '(54) 99129-2121',
  email: 'contato@delfos.eng.br',
  site: 'www.delfos.eng.br',
}

export interface PropostaPDFInput {
  cliente: {
    nome: string
    cpfOuCnpj?: string
    endereco?: string
    municipio?: string
    email?: string
    telefone?: string
  }
  tecnico: {
    potenciaKwp: number
    geracaoMediaKwh: number
    marcaInversores?: string
    tipoInstalacao?: string
    numeroModulos?: number
    municipio?: string
  }
  parametros: {
    valorKwh: number
    distanciaKm?: number
    valorKm?: number
    valorPorPlaca?: number
    planoEscolhido?: OMPlanoTipo
    valoresNegociados?: Partial<Record<PlanoOMChave, number | null>>
  }
  calculos: PropostaCalculos
  dataEmissao?: string
  autor?: string
  referenciaProposta?: string
  conteudo?: Partial<ConteudoPropostaOM> | null
}

export function gerarHTMLPropostaOM(dados: PropostaPDFInput): string {
  const { cliente, tecnico, parametros, calculos } = dados
  const c = normalizarConteudoPropostaOM(dados.conteudo)

  const formatBRL = (val?: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatDateBR = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date()
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const planoAtivo: OMPlanoTipo = (parametros.planoEscolhido || 'Completo') as OMPlanoTipo
  const geracaoAnual = (tecnico.geracaoMediaKwh || 0) * 12
  const valorAnualBruto = geracaoAnual * (parametros.valorKwh || 0)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta O&M - Delfos Solar - ${cliente.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .page-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 16px;
    }
    .doc-hero {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #16A34A;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .doc-hero-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
    }
    .doc-hero-logo {
      width: 80px;
      height: 44px;
      flex-shrink: 0;
    }
    .doc-hero-logo svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .doc-hero-text h1 {
      font-size: 14px;
      font-weight: 900;
      color: #064E3B;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .doc-hero-text p {
      margin: 0;
      font-size: 10px;
      color: #047857;
      font-weight: 600;
    }
    .doc-badge-date {
      font-size: 10px;
      font-weight: 700;
      color: #065F46;
      background: #FFFFFF;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #86EFAC;
      white-space: nowrap;
      text-align: right;
    }
    .section-block {
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E5E7EB;
    }
    .section-num {
      width: 20px;
      height: 20px;
      border-radius: 5px;
      background: #DCFCE7;
      color: #166534;
      font-weight: 800;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin: 0;
    }
    .cards-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 8px;
    }
    .info-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .info-card-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0F172A;
      margin-bottom: 6px;
      padding-bottom: 3px;
      border-bottom: 1px dashed #CBD5E1;
      display: flex;
      justify-content: space-between;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 10px;
    }
    .info-label { color: #64748B; }
    .info-val { font-weight: 600; color: #1E293B; text-align: right; }
    .highlight-green { color: #15803D; font-weight: 700; }
    .banner-anual {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      font-size: 10.5px;
    }
    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .scenario-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .scenario-card.active { border: 2px solid #22C55E; background: #F0FDF4; }
    .scenario-card.danger { border: 1.5px solid #FCA5A5; background: #FEF2F2; }
    .scenario-card.warning { border: 1px solid #FCD34D; background: #FFFBEB; }
    .scenario-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #475569; }
    .scenario-val { font-size: 13px; font-weight: 900; margin: 3px 0; color: #0F172A; }
    .scenario-sub { font-size: 8.5px; color: #64748B; }
    .banner-risco {
      background: #FFFBEB;
      border-left: 4px solid #F59E0B;
      border-radius: 0 6px 6px 0;
      padding: 8px 10px;
      font-size: 9.5px;
      color: #78350F;
      line-height: 1.4;
    }
    table.tabela-om {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-top: 6px;
    }
    table.tabela-om th {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 6px 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #334155;
    }
    table.tabela-om td {
      border: 1px solid #E2E8F0;
      padding: 6px 8px;
      color: #334155;
    }
    .selo-tabela {
      background: #DCFCE7;
      color: #14532D;
      border: 1px solid #86EFAC;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 6px;
    }
    .plan-card {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .plan-card.selected {
      border: 2px solid #16A34A;
      background: #F0FDF4;
      box-shadow: 0 2px 8px rgba(22, 163, 74, 0.15);
    }
    .plan-badge-rec {
      position: absolute;
      top: -9px;
      right: 10px;
      background: #15803D;
      color: #FFFFFF;
      font-size: 7.5px;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 8px;
      letter-spacing: 0.05em;
    }
    .plan-title { font-size: 11px; font-weight: 800; color: #0F172A; text-transform: uppercase; }
    .plan-price-box { margin: 4px 0 6px 0; }
    .plan-price-num { font-size: 16px; font-weight: 900; color: #166534; }
    .plan-price-unit { font-size: 9.5px; color: #64748B; font-weight: 700; }
    .plan-anual { font-size: 8.5px; color: #64748B; }
    .plan-benefits { list-style: none; padding: 0; margin: 6px 0 0 0; font-size: 9px; color: #334155; }
    .plan-benefits li { margin-bottom: 3px; display: flex; align-items: flex-start; gap: 4px; }
    .plan-btn {
      margin-top: 8px;
      padding: 5px;
      border-radius: 6px;
      font-size: 9.5px;
      font-weight: 800;
      text-align: center;
      border: none;
      cursor: pointer;
      display: block;
      width: 100%;
    }
    .plan-btn.selected { background: #16A34A; color: #FFFFFF; }
    .plan-btn.unselected { background: #E2E8F0; color: #475569; }
    .grid-3-boxes {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 6px;
    }
    .item-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 10px;
    }
    .item-box-title { font-size: 10px; font-weight: 800; color: #0F172A; margin-bottom: 3px; }
    .item-box-desc { font-size: 9px; color: #475569; line-height: 1.35; margin: 0; }
    .terms-box {
      background: #F8FAFC;
      border-left: 4px solid #16A34A;
      border-radius: 0 8px 8px 0;
      padding: 8px 12px;
      font-size: 9.5px;
      color: #334155;
    }
    .terms-box ul { margin: 0; padding-left: 14px; }
    .terms-box li { margin-bottom: 3px; }
    .aceite-steps {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 8px;
    }
    .step-box {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 6px;
      padding: 6px 8px;
      font-size: 9px;
    }
    .step-num { font-size: 8px; font-weight: 800; text-transform: uppercase; color: #166534; }
    .step-title { font-weight: 800; color: #0F172A; }
    .step-desc { color: #475569; margin: 2px 0 0 0; }
    .aceite-card {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 9.5px;
      color: #334155;
      margin-bottom: 12px;
    }
    .assinaturas-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 14px;
      text-align: center;
      font-size: 9.5px;
    }
    .linha-assinatura {
      border-bottom: 1px solid #94A3B8;
      width: 80%;
      margin: 0 auto 4px auto;
      height: 32px;
    }
    .doc-footer {
      border-top: 1px solid #E2E8F0;
      padding-top: 8px;
      margin-top: 14px;
      text-align: center;
      font-size: 9.5px;
      color: #475569;
    }
    .doc-footer-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .no-print {
      margin-bottom: 14px;
      padding: 8px 14px;
      background: #0F172A;
      color: #F8FAFC;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-btn {
      background: #16A34A;
      color: #FFFFFF;
      border: none;
      padding: 6px 14px;
      font-size: 11px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
    }
    @media print {
      .no-print { display: none !important; }
      body { background: #FFFFFF; }
      .page-container { max-width: 100%; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="no-print">
      <div>
        <strong>Delfos Engenharia Solar — Proposta O&M</strong>
        <span style="font-size: 10px; color: #94A3B8; margin-left: 8px;">Documento Oficial</span>
      </div>
      <button class="print-btn" onclick="window.print()">Salvar como PDF / Imprimir</button>
    </div>

    <!-- CABEÇALHO HERO COM LOGO DELFOS -->
    <div class="doc-hero">
      <div class="doc-hero-left">
        <div class="doc-hero-logo">
          <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="om-top" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0B5AA8" />
                <stop offset="18%" stop-color="#12789E" />
                <stop offset="42%" stop-color="#2E9E43" />
                <stop offset="68%" stop-color="#7EBE32" />
                <stop offset="88%" stop-color="#DECA09" />
                <stop offset="100%" stop-color="#FCD200" />
              </linearGradient>
              <linearGradient id="om-bot" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FCD200" />
                <stop offset="14%" stop-color="#DECA09" />
                <stop offset="36%" stop-color="#7EBE32" />
                <stop offset="62%" stop-color="#2E9E43" />
                <stop offset="84%" stop-color="#12789E" />
                <stop offset="100%" stop-color="#0B5AA8" />
              </linearGradient>
            </defs>
            <path d="M 10 96 C 45 42, 135 12, 260 12 C 390 12, 475 46, 514 88 C 450 42, 360 26, 260 26 C 145 26, 55 56, 10 96 Z" fill="url(#om-top)" />
            <path d="M 10 184 C 55 226, 145 258, 260 258 C 375 258, 465 228, 514 192 C 480 228, 395 268, 260 268 C 130 268, 45 232, 10 184 Z" fill="url(#om-bot)" />
            <g fill="#0A539E">
              <text x="260" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="94" font-weight="900" letter-spacing="0.22em">delfos</text>
              <text x="264" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="0.68em">solar</text>
            </g>
          </svg>
        </div>
        <div class="doc-hero-text">
          <h1>Proposta de Gestão e Manutenção (O&amp;M)</h1>
          <p>Delfos Engenharia Solar • Prevenção ativa, aumento de geração e proteção de usinas</p>
        </div>
      </div>
      <div class="doc-badge-date">
        Emissão: ${formatDateBR(dados.dataEmissao)}<br/>
        <span style="font-size: 8.5px; font-weight: 500; color: #047857;">${c.secao1.badgeEmissao}</span>
      </div>
    </div>

    <!-- SEÇÃO 1: DADOS GERAIS E IDENTIFICAÇÃO TÉCNICA -->
    <div id="secao-1-dados" class="section-block">
      <div class="section-header">
        <div class="section-num">1</div>
        <h2 class="section-title">${c.secao1.titulo}</h2>
      </div>
      <p class="subtitulo" style="display:none;">${c.secao1.subtitulo}</p>
      <span class="badge-emissao" style="display:none;">${c.secao1.badgeEmissao}</span>

      <div class="cards-grid-2">
        <!-- Dados Cliente -->
        <div class="info-card">
          <div class="info-card-title">
            <span>Dados do Cliente</span>
            <span style="color:#16A34A;font-size:8.5px;">● Cadastrado</span>
          </div>
          <div class="info-row"><span class="info-label">Razão Social:</span><span class="info-val"><strong>${cliente.nome}</strong></span></div>
          <div class="info-row"><span class="info-label">CNPJ / CPF:</span><span class="info-val">${cliente.cpfOuCnpj || 'Não informado'}</span></div>
          <div class="info-row"><span class="info-label">Município:</span><span class="info-val">${cliente.municipio || 'Erechim / RS'}</span></div>
          <div class="info-row"><span class="info-label">Endereço:</span><span class="info-val">${cliente.endereco || 'Endereço da usina'}</span></div>
          <div class="info-row"><span class="info-label">Telefone:</span><span class="info-val">${cliente.telefone || '(54) 99129-2121'}</span></div>
          <div class="info-row"><span class="info-label">E-mail:</span><span class="info-val">${cliente.email || 'contato@cliente.com'}</span></div>
        </div>

        <!-- Dados Usina -->
        <div class="info-card">
          <div class="info-card-title">
            <span>Dados Técnicos da Usina</span>
            <span style="color:#16A34A;font-size:8.5px;">● Ativo em Operação</span>
          </div>
          <div class="info-row"><span class="info-label">Potência Total:</span><span class="info-val highlight-green"><strong>${tecnico.potenciaKwp.toFixed(2)} kWp</strong></span></div>
          <div class="info-row"><span class="info-label">Geração Estimada:</span><span class="info-val"><strong>${tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês</strong></span></div>
          <div class="info-row"><span class="info-label">Inversor:</span><span class="info-val">${tecnico.marcaInversores || 'Inversores homologados'}</span></div>
          <div class="info-row"><span class="info-label">Módulos:</span><span class="info-val">${tecnico.numeroModulos ? `${tecnico.numeroModulos} unidades` : 'Conforme projeto'}</span></div>
          <div class="info-row"><span class="info-label">Tipo de Instalação:</span><span class="info-val">${tecnico.tipoInstalacao || 'Telhado'}</span></div>
          <div class="info-row"><span class="info-label">Tarifa Base:</span><span class="info-val highlight-green">${formatBRL(parametros.valorKwh)} / kWh</span></div>
        </div>
      </div>

      <!-- Destaque Anual e Citação -->
      <div class="banner-anual">
        <div>
          <span>${c.secao1.cardAnualDestaquePrefixo} <strong style="color:#064E3B;font-size:12px;">${formatBRL(valorAnualBruto)}</strong> ${c.secao1.cardAnualDestaqueSufixo}</span>
        </div>
        <div class="citacao-destaque" style="background:#FFFFFF;border:1px solid #BBF7D0;padding:6px 10px;border-radius:6px;font-style:italic;color:#065F46;max-width:380px;">
          ${c.secao1.citacaoDestaque}
        </div>
      </div>
    </div>

    <!-- SEÇÃO 2: CENÁRIOS DE EXPOSIÇÃO FINANCEIRA -->
    <div id="secao-2-cenarios" class="section-block">
      <div class="section-header">
        <div class="section-num">2</div>
        <h2 class="section-title">${c.secao2.titulo}</h2>
      </div>
      <p class="subtitulo" style="font-size:9.5px;color:#64748B;margin:0 0 6px 0;">${c.secao2.subtitulo}</p>

      <div class="scenarios-grid">
        <div class="scenario-card danger">
          <div class="scenario-label" style="color:#991B1B;">${c.secao2.tituloCardFalha30}</div>
          <div class="scenario-val" style="color:#DC2626;">- ${formatBRL(calculos.prejuizo30Dias)}</div>
          <div class="scenario-sub">${c.secao2.subtituloCardFalha30}</div>
        </div>
        <div class="scenario-card warning">
          <div class="scenario-label" style="color:#92400E;">${c.secao2.tituloCardPerda20}</div>
          <div class="scenario-val" style="color:#B45309;">- ${formatBRL(calculos.perda20Ano)}</div>
          <div class="scenario-sub">${c.secao2.subtituloCardPerda20}</div>
        </div>
      </div>
      <div class="faixa-risco-oculto banner-risco">
        <p style="margin:0;">${c.secao2.avisoRiscoOculto}</p>
      </div>
    </div>

    <!-- SEÇÃO 3: QUAL PLANO ELIMINA CADA CENÁRIO -->
    <div id="secao-3-tabela" class="section-block">
      <div class="section-header">
        <div class="section-num">3</div>
        <h2 class="section-title">${c.secao3.titulo}</h2>
      </div>

      <table class="tabela-om">
        <thead>
          <tr>
            <th style="width:30%;">${c.secao3.colunaCenario}</th>
            <th style="width:25%;text-align:center;">Plano Recomendado</th>
            <th>${c.secao3.colunaCobertura}</th>
          </tr>
        </thead>
        <tbody>
          ${c.secao3.linhas
            .map(
              (l: any) => `
            <tr>
              <td class="col-cenario"><strong>${l.cenario}</strong></td>
              <td style="text-align:center;"><span class="selo-tabela">${l.planoSelo}</span></td>
              <td class="col-cobertura">${l.cobertura}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <!-- SEÇÃO 4: MODALIDADES DE PLANOS DE O&M -->
    <div id="secao-4-planos" class="section-block">
      <div class="section-header">
        <div class="section-num">4</div>
        <h2 class="section-title">${c.secao4.titulo}</h2>
      </div>

      <div class="plans-grid">
        <!-- Essencial -->
        <div class="plan-card ${planoAtivo === 'Essencial' ? 'selected' : ''}">
          <div>
            <div class="plan-title">Plano Essencial</div>
            <div class="plan-price-box">
              <span class="plan-price-num">${formatBRL(calculos.planos.Essencial?.mensal)}</span>
              <span class="plan-price-unit">/mês</span>
            </div>
            <div class="plan-anual">Anual: ${formatBRL(calculos.planos.Essencial?.anual)}</div>
            <ul class="plan-benefits">
              ${c.secao4.beneficiosEssencial.map((b: string) => `<li><span style="color:#16A34A;">✓</span> ${b}</li>`).join('')}
            </ul>
          </div>
          <button type="button" class="plan-btn ${planoAtivo === 'Essencial' ? 'selected' : 'unselected'}" data-selecionar-plano="Essencial">
            ${planoAtivo === 'Essencial' ? c.secao4.botaoTextoSelecionado : c.secao4.botaoTextoSelecionar}
          </button>
        </div>

        <!-- Inspeção -->
        <div class="plan-card ${planoAtivo === 'Inspeção' ? 'selected' : ''}">
          <div>
            <div class="plan-title">Plano Inspeção</div>
            <div class="plan-price-box">
              <span class="plan-price-num">${formatBRL(calculos.planos.Inspeção?.mensal)}</span>
              <span class="plan-price-unit">/mês</span>
            </div>
            <div class="plan-anual">Anual: ${formatBRL(calculos.planos.Inspeção?.anual)}</div>
            <ul class="plan-benefits">
              ${c.secao4.beneficiosInspecao.map((b: string) => `<li><span style="color:#16A34A;">✓</span> ${b}</li>`).join('')}
            </ul>
          </div>
          <button type="button" class="plan-btn ${planoAtivo === 'Inspeção' ? 'selected' : 'unselected'}" data-selecionar-plano="Inspeção">
            ${planoAtivo === 'Inspeção' ? c.secao4.botaoTextoSelecionado : c.secao4.botaoTextoSelecionar}
          </button>
        </div>

        <!-- Completo -->
        <div class="plan-card ${planoAtivo === 'Completo' ? 'selected' : ''}">
          <span class="plan-badge-rec selo-recomendado">${c.secao4.seloRecomendado}</span>
          <div>
            <div class="plan-title" style="color:#064E3B;">Plano Completo</div>
            <div class="plan-price-box">
              <span class="plan-price-num" style="color:#064E3B;">${formatBRL(calculos.planos.Completo?.mensal)}</span>
              <span class="plan-price-unit">/mês</span>
            </div>
            <div class="plan-anual">Anual: ${formatBRL(calculos.planos.Completo?.anual)}</div>
            <ul class="plan-benefits">
              ${c.secao4.beneficiosCompleto.map((b: string) => `<li><span style="color:#16A34A;font-weight:bold;">✓</span> ${b}</li>`).join('')}
            </ul>
          </div>
          <button type="button" class="plan-btn ${planoAtivo === 'Completo' ? 'selected' : 'unselected'}" data-selecionar-plano="Completo">
            ${planoAtivo === 'Completo' ? c.secao4.botaoTextoSelecionado : c.secao4.botaoTextoSelecionar}
          </button>
        </div>
      </div>
    </div>

    <!-- SEÇÃO 5: PADRÕES TÉCNICOS E CREDIBILIDADE -->
    <div id="secao-5-padroes" class="section-block">
      <div class="section-header">
        <div class="section-num">5</div>
        <h2 class="section-title">${c.secao5.titulo}</h2>
      </div>

      <div class="grid-padroes grid-3-boxes">
        ${c.secao5.itens
          .map(
            (it: any) => `
          <div class="card-padrao item-box">
            <h4 class="item-box-title">🛡️ ${it.titulo}</h4>
            <p class="item-box-desc">${it.descricao}</p>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>

    <!-- SEÇÃO 6: NÍVEIS DE SERVIÇO (SLA) & COMPROMISSOS -->
    <div id="secao-6-sla" class="section-block">
      <div class="section-header">
        <div class="section-num">6</div>
        <h2 class="section-title">${c.secao6.titulo}</h2>
      </div>

      <div class="grid-sla grid-3-boxes">
        ${c.secao6.itens
          .map(
            (it: any) => `
          <div class="card-sla item-box">
            <h4 class="item-box-title">⏱️ ${it.titulo}</h4>
            <p class="item-box-desc">${it.descricao}</p>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>

    <!-- SEÇÃO 7: CONDIÇÕES CONTRATUAIS & VIGÊNCIA -->
    <div id="secao-7-condicoes" class="section-block">
      <div class="section-header">
        <div class="section-num">7</div>
        <h2 class="section-title">${c.secao7.titulo}</h2>
      </div>

      <div class="terms-box">
        <ul class="lista-condicoes">
          ${c.secao7.itens
            .map(
              (it: any) => `
            <li class="item-condicao">
              <strong>${it.titulo}:</strong> <span class="desc">${it.descricao}</span>
            </li>
          `,
            )
            .join('')}
        </ul>
      </div>
    </div>

    <!-- SEÇÃO 8: ACEITE COMERCIAL E CONTRATAÇÃO -->
    <div id="secao-8-aceite" class="section-block">
      <div class="section-header">
        <div class="section-num">8</div>
        <h2 class="section-title">${c.secao8.titulo}</h2>
      </div>

      <div class="grid-passos aceite-steps">
        ${c.secao8.passos
          .map(
            (p: any) => `
          <div class="passo-item step-box">
            <div class="step-num">Passo ${p.numero}</div>
            <strong class="step-title">${p.titulo}</strong>
            <p class="step-desc">${p.descricao}</p>
          </div>
        `,
          )
          .join('')}
      </div>

      <div class="aceite-card">
        <strong style="display:block;margin-bottom:3px;color:#0F172A;">Termo de Aceite Comercial:</strong>
        <p class="termo-aceite-texto" style="margin:0 0 6px 0;">${c.secao8.textoTermoAceite}</p>
        <div style="background:#FFFFFF;border:1px solid #E2E8F0;padding:6px 10px;border-radius:6px;display:flex;justify-content:space-between;">
          <span>Plano Escolhido: <strong style="color:#166534;text-transform:uppercase;">${planoAtivo}</strong></span>
          <span>Mensalidade: <strong>${formatBRL(calculos.planos[planoAtivo]?.mensal)}/mês</strong></span>
          <span>Anual: <strong>${formatBRL(calculos.planos[planoAtivo]?.anual)}</strong></span>
        </div>
      </div>

      <div class="assinaturas-row">
        <div>
          <div class="linha-assinatura"></div>
          <strong>${cliente.nome}</strong><br/>
          <span>CPF/CNPJ: ${cliente.cpfOuCnpj || 'De acordo'}</span><br/>
          <span style="font-size:8px;color:#94A3B8;">Data: ____/____/________</span>
        </div>
        <div>
          <div class="linha-assinatura"></div>
          <strong style="color:#064E3B;">DELFOS ENGENHARIA SOLAR</strong><br/>
          <span class="cargo-delfos">${c.secao8.responsavelDelfosCargo}</span><br/>
          <span style="font-size:8px;color:#94A3B8;">CNPJ ${c.secao8.cnpjDelfos}</span>
        </div>
      </div>
    </div>

    <!-- RODAPÉ OFICIAL DELFOS SOLAR (Mesmo da proposta de energia solar) -->
    <div id="rodape-oficial" class="doc-footer">
      <div class="doc-footer-box">
        <div style="font-weight:800;color:#0F172A;margin-bottom:2px;">
          ${c.rodape.empresaNome} • CNPJ ${c.rodape.cnpj} • 📞 ${c.rodape.telefone} • <span style="color:#15803D;">🌐 ${c.rodape.site}</span>
        </div>
        <div style="font-size:9px;color:#64748B;">
          📍 ${c.rodape.endereco}
        </div>
        <div class="rodape-validade" style="font-weight:700;color:#16A34A;margin-top:2px;">
          ${c.rodape.textoValidade}
        </div>
      </div>
    </div>

    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.45;
    }
    .page-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }
    /* Main Document Title & Header unificado com Logo da Delfos ao lado do Título */
    .doc-hero {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #16A34A;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .doc-hero-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
    }
    .doc-hero-logo {
      width: 72px;
      height: 42px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .doc-hero-logo svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .doc-hero-text h1 {
      font-size: 14.5px;
      font-weight: 900;
      color: #064E3B;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      line-height: 1.2;
    }
    .doc-hero-text p {
      margin: 0;
      font-size: 10px;
      color: #047857;
      font-weight: 500;
    }
    .doc-badge-date {
      font-size: 10px;
      font-weight: 700;
      color: #065F46;
      background: #FFFFFF;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #86EFAC;
      white-space: nowrap;
    }
    /* Info Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .info-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .info-card h3 {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #111827;
      margin: 0 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1px dashed #D1D5DB;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3.5px;
      font-size: 10.5px;
    }
    .info-label {
      color: #6B7280;
    }
    .info-value {
      font-weight: 600;
      color: #1F2937;
      text-align: right;
    }
    .highlight-val {
      color: #15803D;
      font-weight: 700;
    }
    /* Section Headers */
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 14px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 3px;
      height: 12px;
      background: #16A34A;
      border-radius: 2px;
    }
    /* Scenarios Banner */
    .scenarios-box {
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
    }
    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-top: 6px;
    }
    .scenario-item {
      background: #FFFFFF;
      border: 1px solid #FCD34D;
      border-radius: 6px;
      padding: 8px;
      text-align: center;
    }
    .scenario-label {
      font-size: 9px;
      font-weight: 600;
      color: #92400E;
      text-transform: uppercase;
      line-height: 1.2;
      min-height: 22px;
    }
    .scenario-value {
      font-size: 13px;
      font-weight: 800;
      color: #B45309;
      margin-top: 3px;
    }
    .scenario-item.danger {
      border-color: #FECACA;
      background: #FEF2F2;
    }
    .scenario-item.danger .scenario-label {
      color: #991B1B;
    }
    .scenario-item.danger .scenario-value {
      color: #DC2626;
    }
    .scenario-item.success {
      border-color: #BBF7D0;
      background: #F0FDF4;
    }
    .scenario-item.success .scenario-label {
      color: #166534;
    }
    .scenario-item.success .scenario-value {
      color: #15803D;
    }
    /* Plan Cards Grid (3 cards side-by-side) */
    .plans-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 8px;
      margin-bottom: 14px;
    }
    .plan-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .plan-card.recommended {
      border: 2px solid #16A34A;
    }
    .plan-badge-recommended {
      position: absolute;
      top: -10px;
      right: 14px;
      background: #047857;
      color: #FFFFFF;
      font-size: 8px;
      font-weight: 900;
      padding: 3px 8px;
      border-radius: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    .plan-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .plan-name {
      font-size: 12px;
      font-weight: 700;
      color: #111827;
    }
    .badge-negociado {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FCD34D;
      padding: 1px 5px;
      border-radius: 4px;
    }
    .plan-price {
      font-size: 18px;
      font-weight: 800;
      color: #0D7A3E;
      line-height: 1.2;
    }
    .plan-price-unit {
      font-size: 11px;
      font-weight: 700;
    }
    .plan-annual {
      font-size: 9px;
      color: #6B7280;
      margin-top: 2px;
      margin-bottom: 8px;
    }
    .plan-bullets {
      list-style: none;
      padding: 0;
      margin: 8px 0 0 0;
      font-size: 9.5px;
      color: #4B5563;
      line-height: 1.45;
    }
    .plan-bullets li {
      margin-bottom: 4px;
      display: flex;
      align-items: flex-start;
      gap: 5px;
    }
    .plan-bullet-dot {
      color: #9CA3AF;
      font-weight: bold;
      line-height: 1;
    }
    /* Condições Gerais e Vigência */
    .terms-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-left: 4px solid #16A34A;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 9.5px;
      color: #4B5563;
      margin-bottom: 14px;
    }
    .terms-card ul {
      margin: 4px 0 0 0;
      padding-left: 16px;
    }
    .terms-card li {
      margin-bottom: 2px;
    }
    /* Footer Oficial Faixa Cinza Clara */
    .doc-footer {
      border-top: 1px solid #E5E7EB;
      padding-top: 10px;
      margin-top: 14px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .doc-footer-box {
      background: #F3F4F6;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 10px 14px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      color: #334155;
    }
    .doc-footer-line1 {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .doc-footer-logo-small {
      width: 24px;
      height: 14px;
      display: inline-block;
      vertical-align: middle;
      margin-right: 2px;
    }
    .doc-footer-logo-small svg {
      width: 100%;
      height: 100%;
    }
    .doc-footer-company-name {
      font-weight: 800;
      color: #0F172A;
    }
    .doc-footer-link {
      font-weight: 700;
      color: #047857;
      text-decoration: none;
    }
    .doc-footer-line2 {
      font-size: 9.5px;
      color: #475569;
    }
    .doc-footer-validade {
      font-weight: 800;
      color: #0D7A3E;
      font-size: 10px;
      margin-top: 2px;
    }
    /* Print Button & Controls for Browser Preview */
    .no-print {
      margin-bottom: 14px;
      padding: 10px 14px;
      background: #111827;
      color: #F9FAFB;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .print-btn {
      background: #16A34A;
      color: #FFFFFF;
      border: none;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .print-btn:hover {
      background: #15803D;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background: #FFFFFF;
      }
      .page-container {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Non-print action bar if opened in preview tab -->
    <div class="no-print">
      <div>
        <strong style="font-size: 13px;">Delfos Solar — Proposta de Gestão e Manutenção O&M</strong>
        <div style="font-size: 11px; color: #9CA3AF;">Visualização para impressão / geração de PDF</div>
      </div>
      <button class="print-btn" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Salvar como PDF / Imprimir
      </button>
    </div>

    <!-- Hero Title com Logo da Delfos correta ao lado do Título (cabeçalho antigo removido) -->
    <div class="doc-hero">
      <div class="doc-hero-left">
        <div class="doc-hero-logo">
          <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="om-hero-grad-top" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#0B5AA8" />
                <stop offset="18%" stop-color="#12789E" />
                <stop offset="42%" stop-color="#2E9E43" />
                <stop offset="68%" stop-color="#7EBE32" />
                <stop offset="88%" stop-color="#DECA09" />
                <stop offset="100%" stop-color="#FCD200" />
              </linearGradient>
              <linearGradient id="om-hero-grad-bottom" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FCD200" />
                <stop offset="14%" stop-color="#DECA09" />
                <stop offset="36%" stop-color="#7EBE32" />
                <stop offset="62%" stop-color="#2E9E43" />
                <stop offset="84%" stop-color="#12789E" />
                <stop offset="100%" stop-color="#0B5AA8" />
              </linearGradient>
            </defs>
            <path d="M 10 96 C 45 42, 135 12, 260 12 C 390 12, 475 46, 514 88 C 450 42, 360 26, 260 26 C 145 26, 55 56, 10 96 Z" fill="url(#om-hero-grad-top)" />
            <path d="M 12 96 C 40 48, 130 16, 260 16 C 395 16, 480 50, 514 88 C 455 42, 365 28, 260 28 C 145 28, 55 58, 12 96 Z" fill="url(#om-hero-grad-top)" opacity="0.95" />
            <path d="M 10 184 C 55 226, 145 258, 260 258 C 375 258, 465 228, 514 192 C 480 228, 395 268, 260 268 C 130 268, 45 232, 10 184 Z" fill="url(#om-hero-grad-bottom)" />
            <path d="M 12 184 C 52 214, 135 246, 260 246 C 385 246, 470 224, 514 192 C 480 226, 390 264, 260 264 C 105 264, 35 218, 12 184 Z" fill="url(#om-hero-grad-bottom)" opacity="0.95" />
            <g fill="#0A539E">
              <text x="260" y="160" text-anchor="middle" font-family="Arial, -apple-system, BlinkMacSystemFont, sans-serif" font-size="94" font-weight="900" letter-spacing="0.22em">delfos</text>
              <text x="264" y="200" text-anchor="middle" font-family="Arial, -apple-system, BlinkMacSystemFont, sans-serif" font-size="25" font-weight="800" letter-spacing="0.68em">solar</text>
            </g>
          </svg>
        </div>
        <div class="doc-hero-text">
          <h1>Proposta de Gestão e Manutenção de Usinas (O&M)</h1>
          <p>Prevenção ativa, aumento de geração e proteção integral do seu investimento solar fotovoltaico</p>
        </div>
      </div>
      <div class="doc-badge-date">
        Emissão: ${formatDateBR(dados.dataEmissao)}
      </div>
    </div>

    <!-- 2 Colunas: Cliente & Dados Técnicos -->
    <div class="cards-grid">
      <!-- Card Cliente -->
      <div class="info-card">
        <h3>
          <span>1. Dados do Cliente</span>
          <span style="font-size: 9px; color: #16A34A;">● Cadastrado</span>
        </h3>
        <div class="info-row">
          <span class="info-label">Nome / Razão:</span>
          <span class="info-value"><strong>${cliente.nome}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">CPF / CNPJ:</span>
          <span class="info-value">${cliente.cpfOuCnpj || 'Não informado'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Município:</span>
          <span class="info-value">${cliente.municipio || 'Erechim / RS'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Endereço:</span>
          <span class="info-value">${cliente.endereco || 'Endereço da usina'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Telefone:</span>
          <span class="info-value">${cliente.telefone || '(54) 99129-2121'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${cliente.email || 'contato@cliente.com'}</span>
        </div>
      </div>

      <!-- Card Técnico -->
      <div class="info-card">
        <h3>
          <span>2. Dados Técnicos da Usina</span>
          <span style="font-size: 9px; color: #16A34A;">● Sistema Ativo</span>
        </h3>
        <div class="info-row">
          <span class="info-label">Potência Instalada:</span>
          <span class="info-value highlight-val"><strong>${tecnico.potenciaKwp.toLocaleString('pt-BR')} kWp</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Geração Média Estimada:</span>
          <span class="info-value"><strong>${tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Inversor(es):</span>
          <span class="info-value">${tecnico.marcaInversores || 'Inversores homologados'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Módulos Fotovoltaicos:</span>
          <span class="info-value">${tecnico.numeroModulos ? `${tecnico.numeroModulos} unidades` : 'Conforme projeto'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tipo de Instalação:</span>
          <span class="info-value">${tecnico.tipoInstalacao || 'Telhado'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tarifa Base Concessionária:</span>
          <span class="info-value highlight-val">${formatBRL(parametros.valorKwh)} / kWh</span>
        </div>
      </div>
    </div>

    <!-- Cenários de Exposição Financeira -->
    <div class="scenarios-box">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 11px; font-weight: 800; color: #92400E; text-transform: uppercase; letter-spacing: 0.05em;">
          ⚠️ Cenários de Exposição Financeira sem O&M Especializado
        </span>
        <span style="font-size: 9.5px; font-weight: 700; color: #B45309;">
          Produção mensal: ${tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh × ${formatBRL(parametros.valorKwh)}
        </span>
      </div>

      <div class="scenarios-grid">
        <div class="scenario-item success">
          <div class="scenario-label">Ativo Protegido (Mês)</div>
          <div class="scenario-value">${formatBRL(calculos.valorAtivoProtegido)}</div>
        </div>
        <div class="scenario-item">
          <div class="scenario-label">Perda 15% ao ano (Sujidade/Poeira)</div>
          <div class="scenario-value">${formatBRL(calculos.perda15Ano)}</div>
        </div>
        <div class="scenario-item">
          <div class="scenario-label">Perda 20% ao ano (Sem Preventiva)</div>
          <div class="scenario-value">${formatBRL(calculos.perda20Ano)}</div>
        </div>
        <div class="scenario-item danger">
          <div class="scenario-label">Prejuízo 30 dias parado (Falha não vista)</div>
          <div class="scenario-value">${formatBRL(calculos.prejuizo30Dias)}</div>
        </div>
      </div>

      <div style="font-size: 9px; color: #78350F; margin-top: 6px; line-height: 1.35;">
        * Prejuízo por 20 dias de falha ou inversor desarmado sem alerta de monitoramento: <strong>${formatBRL(calculos.prejuizo20Dias)}</strong>. Um plano de O&M se paga integralmente ao evitar apenas alguns dias de perda de geração ao ano.
      </div>
    </div>

    <!-- Comparativo de Planos de Gestão e Manutenção (Cards de Planos) -->
    <div class="section-title">PLANOS DE GESTÃO E MANUTENÇÃO (Contrato Anual)</div>

    <div class="plans-cards-grid">
      <!-- 1. Plano Essencial -->
      <div class="plan-card">
        <div>
          <div class="plan-header">
            <span class="plan-name">Plano Essencial</span>
            ${calculos.planos.Essencial.isNegociado ? '<span class="badge-negociado">Negociado</span>' : ''}
          </div>
          <div class="plan-price">${formatBRL(calculos.planos.Essencial.mensal)}<span class="plan-price-unit">/mês</span></div>
          <ul class="plan-bullets">
            <li><span class="plan-bullet-dot">•</span> <span>Monitoramento comercial</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>Relatório mensal analítico</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>Suporte técnico e RGE</span></li>
          </ul>
        </div>
      </div>

      <!-- 2. Plano Inspeção -->
      <div class="plan-card">
        <div>
          <div class="plan-header">
            <span class="plan-name">Plano Inspeção</span>
            ${calculos.planos.Inspeção.isNegociado ? '<span class="badge-negociado">Negociado</span>' : ''}
          </div>
          <div class="plan-price">${formatBRL(calculos.planos.Inspeção.mensal)}<span class="plan-price-unit">/mês</span></div>
          <ul class="plan-bullets">
            <li><span class="plan-bullet-dot">•</span> <span>Tudo do plano Essencial</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>1x Inspeção preventiva anual</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>1x Limpeza de placas anual</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>Reaperto geral de conexões</span></li>
          </ul>
        </div>
      </div>

      <!-- 3. Plano Completo (Recomendado Delfos) -->
      <div class="plan-card recommended">
        <span class="plan-badge-recommended">RECOMENDADO DELFOS</span>
        <div>
          <div class="plan-header">
            <span class="plan-name">Plano Completo</span>
            ${calculos.planos.Completo.isNegociado ? '<span class="badge-negociado">Negociado</span>' : ''}
          </div>
          <div class="plan-price">${formatBRL(calculos.planos.Completo.mensal)}<span class="plan-price-unit">/mês</span></div>
          <ul class="plan-bullets">
            <li><span class="plan-bullet-dot">•</span> <span>Tudo do plano Inspeção</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>2x Limpezas de placas ao ano</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>Verificação semestral de anomalias</span></li>
            <li><span class="plan-bullet-dot">•</span> <span>Suporte técnico limitado VIP</span></li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Condições Gerais e Vigência -->
    <div class="terms-card">
      <strong style="color: #111827; font-size: 10.5px; margin-bottom: 3px; display: block;">Condições Gerais e Vigência:</strong>
      <ul>
        <li><strong>Escolha flexível:</strong> O cliente escolhe livremente a modalidade após a apresentação dos cenários.</li>
        <li><strong>Vigência contratual:</strong> 12 meses renováveis, garantindo atendimento contínuo e preventivo.</li>
        <li><strong>Forma de pagamento:</strong> Mensalidades via boleto bancário ou PIX corporativo Delfos.</li>
        <li><strong>Equipe técnica qualificada:</strong> Técnicos certificados NR-10 e NR-35 com equipamentos calibrados.</li>
        <li><strong>Garantia de segurança:</strong> Produtos específicos para fotovoltaico, preservando a garantia dos fabricantes.</li>
      </ul>
    </div>

    <!-- Footer da Proposta conforme modelo anexo -->
    <div class="doc-footer">
      <div class="doc-footer-box">
        <div class="doc-footer-line1">
          <span class="doc-footer-logo-small">
            <svg viewBox="0 0 520 280" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="om-footer-grad-top" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#0B5AA8" />
                  <stop offset="50%" stop-color="#2E9E43" />
                  <stop offset="100%" stop-color="#FCD200" />
                </linearGradient>
                <linearGradient id="om-footer-grad-bot" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FCD200" />
                  <stop offset="50%" stop-color="#2E9E43" />
                  <stop offset="100%" stop-color="#0B5AA8" />
                </linearGradient>
              </defs>
              <path d="M 10 96 C 45 42, 135 12, 260 12 C 390 12, 475 46, 514 88 C 450 42, 360 26, 260 26 C 145 26, 55 56, 10 96 Z" fill="url(#om-footer-grad-top)" />
              <path d="M 10 184 C 55 226, 145 258, 260 258 C 375 258, 465 228, 514 192 C 480 228, 395 268, 260 268 C 130 268, 45 232, 10 184 Z" fill="url(#om-footer-grad-bot)" />
              <g fill="#0A539E">
                <text x="260" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="94" font-weight="900" letter-spacing="0.22em">delfos</text>
                <text x="264" y="200" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="800" letter-spacing="0.68em">solar</text>
              </g>
            </svg>
          </span>
          <span class="doc-footer-company-name">Delfos Engenharia Solar</span>
          <span style="color: #94A3B8;">|</span>
          <span>CNPJ 21.379.952/0001-38</span>
          <span style="color: #16A34A; font-weight: bold;">•</span>
          <span>📞 (54) 99129-2121</span>
          <span style="color: #16A34A; font-weight: bold;">•</span>
          <span class="doc-footer-link">🌐 www.delfos.eng.br</span>
        </div>
        <div class="doc-footer-line2">
          📍 Rua Espírito Santo, 275 – Centro, Erechim/RS
        </div>
        <div class="doc-footer-validade">
          Proposta válida por 5 dias.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Abre o PDF gerado em uma nova aba do navegador com renderização nativa de impressão/PDF.
 */
export function abrirPropostaEmNovaAba(dados: PropostaPDFInput): void {
  const html = gerarHTMLPropostaOM(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

/**
 * Faz download do arquivo HTML estilizado da proposta pronto para impressão/PDF.
 */
export function baixarPropostaHTML(dados: PropostaPDFInput): void {
  const html = gerarHTMLPropostaOM(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeName = dados.cliente.nome.replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `Proposta_OM_Delfos_${safeName}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

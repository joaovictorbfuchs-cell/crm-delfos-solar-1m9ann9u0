import type { Cliente, Sistema, OMPlanoTipo } from '@/types/crm'

export interface PropostaCalculos {
  valorAtivoProtegido: number
  perda15Ano: number
  perda20Ano: number
  prejuizo20Dias: number
  prejuizo30Dias: number
  planos: {
    Essencial: { mensal: number; anual: number }
    Prevenção: { mensal: number; anual: number }
    Completo: { mensal: number; anual: number }
  }
  planoEscolhido?: OMPlanoTipo
  valorMensalEscolhido?: number
  valorAnualEscolhido?: number
}

export const PLANOS_OM_VALORES: Record<OMPlanoTipo, { mensal: number; anual: number }> = {
  Essencial: { mensal: 49.9, anual: 49.9 * 12 },
  Prevenção: { mensal: 74.9, anual: 74.9 * 12 },
  Completo: { mensal: 99.9, anual: 99.9 * 12 },
}

export function calcularPropostaOM(params: {
  geracaoMensalKwh: number
  valorKwh: number
  planoEscolhido?: OMPlanoTipo
}): PropostaCalculos {
  const geracao = Math.max(0, Number(params.geracaoMensalKwh) || 0)
  const tarifa = Math.max(0, Number(params.valorKwh) || 0)

  // Cálculos obrigatórios
  const valorAtivoProtegido = geracao * tarifa
  const perda15Ano = valorAtivoProtegido * 12 * 0.15
  const perda20Ano = valorAtivoProtegido * 12 * 0.2
  const prejuizo20Dias = (valorAtivoProtegido * 20) / 30
  const prejuizo30Dias = (valorAtivoProtegido * 30) / 30 // equivalente a 1 mês

  const planos = {
    Essencial: { ...PLANOS_OM_VALORES.Essencial },
    Prevenção: { ...PLANOS_OM_VALORES.Prevenção },
    Completo: { ...PLANOS_OM_VALORES.Completo },
  }

  const plano = params.planoEscolhido
  const valorMensalEscolhido = plano ? planos[plano]?.mensal : undefined
  const valorAnualEscolhido = plano ? planos[plano]?.anual : undefined

  return {
    valorAtivoProtegido,
    perda15Ano,
    perda20Ano,
    prejuizo20Dias,
    prejuizo30Dias,
    planos,
    planoEscolhido: plano,
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
  }
  parametros: {
    valorKwh: number
    distanciaKm?: number
    valorKm?: number
  }
  calculos: PropostaCalculos
  dataEmissao?: string
  autor?: string
}

export function gerarHTMLPropostaOM(dados: PropostaPDFInput): string {
  const { cliente, tecnico, parametros, calculos } = dados

  const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatDateBR = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date()
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta O&M - Delfos Solar - ${cliente.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 14mm 12mm 14mm;
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
    /* Header */
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #16A34A;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #166534, #16A34A, #F59E0B);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 24px;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);
    }
    .company-title {
      font-size: 18px;
      font-weight: 800;
      color: #064E3B;
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.1;
    }
    .company-subtitle {
      font-size: 10px;
      font-weight: 600;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-top: 2px;
    }
    .header-contact {
      text-align: right;
      font-size: 9.5px;
      color: #4B5563;
      line-height: 1.35;
    }
    .header-contact strong {
      color: #111827;
      font-weight: 700;
    }
    /* Main Document Title */
    .doc-hero {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #16A34A;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .doc-hero-left h1 {
      font-size: 15px;
      font-weight: 800;
      color: #065F46;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .doc-hero-left p {
      margin: 0;
      font-size: 10.5px;
      color: #047857;
    }
    .doc-badge-date {
      font-size: 10px;
      font-weight: 700;
      color: #065F46;
      background: #DCFCE7;
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
    /* Comparative Table */
    .plans-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9.5px;
    }
    .plans-table th {
      background: #F3F4F6;
      border: 1px solid #E5E7EB;
      padding: 7px 6px;
      font-weight: 700;
      color: #374151;
      text-align: center;
    }
    .plans-table th:first-child {
      text-align: left;
      width: 46%;
    }
    .plans-table th.col-rec {
      background: #DCFCE7;
      color: #14532D;
      border-color: #86EFAC;
      position: relative;
    }
    .plans-table th.col-chosen {
      background: #EFF6FF;
      color: #1E40AF;
      border-color: #BFDBFE;
    }
    .plans-table td {
      border: 1px solid #E5E7EB;
      padding: 6px 6px;
      text-align: center;
      color: #4B5563;
    }
    .plans-table td:first-child {
      text-align: left;
      font-weight: 500;
      color: #1F2937;
    }
    .plans-table tr:nth-child(even) td {
      background: #FAFAFA;
    }
    .plans-table td.col-rec {
      background: #F0FDF4;
      font-weight: 600;
    }
    .plans-table td.col-chosen {
      background: #F8FAFC;
    }
    .check-yes {
      color: #16A34A;
      font-weight: 800;
      font-size: 12px;
    }
    .check-no {
      color: #9CA3AF;
      font-size: 11px;
    }
    .badge-tag {
      display: inline-block;
      font-size: 8px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .tag-rec {
      background: #16A34A;
      color: #FFFFFF;
    }
    .tag-chosen {
      background: #2563EB;
      color: #FFFFFF;
    }
    /* Price Summary Cards */
    .pricing-summary {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }
    .chosen-card {
      background: linear-gradient(135deg, #F0FDF4, #DCFCE7);
      border: 2px solid #16A34A;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
      position: relative;
    }
    .chosen-card-tag {
      position: absolute;
      top: -9px;
      left: 50%;
      transform: translateX(-50%);
      background: #16A34A;
      color: #FFFFFF;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 10px;
      border-radius: 10px;
      letter-spacing: 0.05em;
    }
    .chosen-plano-name {
      font-size: 15px;
      font-weight: 800;
      color: #065F46;
      margin-top: 4px;
      margin-bottom: 2px;
    }
    .chosen-price-mensal {
      font-size: 26px;
      font-weight: 900;
      color: #15803D;
      line-height: 1;
      margin: 4px 0;
    }
    .chosen-price-sub {
      font-size: 10.5px;
      font-weight: 600;
      color: #047857;
    }
    .terms-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 9.5px;
      color: #4B5563;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .terms-card ul {
      margin: 4px 0 0 0;
      padding-left: 16px;
    }
    .terms-card li {
      margin-bottom: 2px;
    }
    /* Footer */
    .doc-footer {
      border-top: 1px solid #E5E7EB;
      padding-top: 10px;
      margin-top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 9px;
      color: #6B7280;
    }
    .doc-footer-company strong {
      color: #111827;
    }
    .doc-footer-validade {
      text-align: right;
      font-weight: 600;
      color: #059669;
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

    <!-- Header Delfos -->
    <div class="header-bar">
      <div class="brand-section">
        <div class="logo-badge">☀️</div>
        <div>
          <div class="company-title">DELFOS SOLAR</div>
          <div class="company-subtitle">Engenharia e Gestão de Usinas Solares</div>
        </div>
      </div>
      <div class="header-contact">
        <strong>${DADOS_EMPRESA_DELFOS.razaoSocial}</strong> • CNPJ ${DADOS_EMPRESA_DELFOS.cnpj}<br />
        ${DADOS_EMPRESA_DELFOS.endereco}<br />
        Tel: <strong>${DADOS_EMPRESA_DELFOS.telefone}</strong> • Email: ${DADOS_EMPRESA_DELFOS.email}<br />
        <strong>${DADOS_EMPRESA_DELFOS.site}</strong>
      </div>
    </div>

    <!-- Hero Title -->
    <div class="doc-hero">
      <div class="doc-hero-left">
        <h1>Proposta de Gestão e Manutenção de Usinas (O&M)</h1>
        <p>Prevenção ativa, aumento de geração e proteção integral do seu investimento solar fotovoltaico</p>
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

    <!-- Tabela Comparativa de Planos O&M -->
    <div class="section-title">3. Comparativo de Planos de Gestão e Manutenção</div>

    <table class="plans-table">
      <thead>
        <tr>
          <th>Escopo do Serviço de O&M</th>
          <th style="width: 18%;">
            Essencial
          </th>
          <th style="width: 18%;">
            Prevenção
          </th>
          <th class="col-rec" style="width: 18%;">
            Completo
            <br /><span class="badge-tag tag-rec">Recomendado</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Monitoramento diário da geração em horários comerciais</td>
          <td><span class="check-yes">✓</span></td>
          <td><span class="check-yes">✓</span></td>
          <td class="col-rec"><span class="check-yes">✓</span></td>
        </tr>
        <tr>
          <td>Relatório mensal analítico de desempenho e compensação</td>
          <td><span class="check-yes">✓</span></td>
          <td><span class="check-yes">✓</span></td>
          <td class="col-rec"><span class="check-yes">✓</span></td>
        </tr>
        <tr>
          <td>Suporte técnico especializado direto com engenharia</td>
          <td><span class="check-yes">✓</span></td>
          <td><span class="check-yes">✓</span></td>
          <td class="col-rec"><span class="check-yes">✓ Ilimitado</span></td>
        </tr>
        <tr>
          <td>Intermediação e suporte com a concessionária (RGE)</td>
          <td><span class="check-yes">✓</span></td>
          <td><span class="check-yes">✓</span></td>
          <td class="col-rec"><span class="check-yes">✓ Prioritário</span></td>
        </tr>
        <tr>
          <td>Configuração e suporte remoto ao datalogger/Wi-Fi</td>
          <td><span class="check-yes">✓</span></td>
          <td><span class="check-yes">✓</span></td>
          <td class="col-rec"><span class="check-yes">✓</span></td>
        </tr>
        <tr>
          <td>Inspeção preventiva anual in loco e ensaios elétricos</td>
          <td><span class="check-no">Sob demanda</span></td>
          <td><span class="check-yes">✓ 1x ao ano</span></td>
          <td class="col-rec"><span class="check-yes">✓ 1x ao ano</span></td>
        </tr>
        <tr>
          <td>Reaperto de conexões, quadros e integridade dos grampos</td>
          <td><span class="check-no">—</span></td>
          <td><span class="check-yes">✓ Incluso</span></td>
          <td class="col-rec"><span class="check-yes">✓ Incluso</span></td>
        </tr>
        <tr>
          <td>Verificação de desempenho, detecção de sombreamento e falhas</td>
          <td><span class="check-no">—</span></td>
          <td><span class="check-yes">✓ Anual</span></td>
          <td class="col-rec"><span class="check-yes">✓ Semestral</span></td>
        </tr>
        <tr>
          <td>Limpeza técnica dos módulos solares com produto homologado</td>
          <td><span class="check-no">Avulso</span></td>
          <td><span class="check-yes">✓ 1x ao ano</span></td>
          <td class="col-rec"><span class="check-yes">✓ 2x ao ano</span></td>
        </tr>
        <tr style="background: #F9FAFB; font-weight: 700;">
          <td style="font-weight: 700;">Investimento Mensal (Faturamento Anual)</td>
          <td><strong>${formatBRL(49.9)}/mês</strong><br /><span style="font-size: 8.5px; color: #6B7280;">(${formatBRL(49.9 * 12)}/ano)</span></td>
          <td><strong>${formatBRL(74.9)}/mês</strong><br /><span style="font-size: 8.5px; color: #6B7280;">(${formatBRL(74.9 * 12)}/ano)</span></td>
          <td class="col-rec" style="font-size: 10.5px; color: #065F46;">
            <strong>${formatBRL(99.9)}/mês</strong><br /><span style="font-size: 8.5px; color: #047857;">(${formatBRL(99.9 * 12)}/ano)</span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Resumo dos Planos O&M & Condições -->
    <div class="pricing-summary">
      <div class="chosen-card">
        <div class="chosen-card-tag">Opções para Escolha do Cliente</div>
        <div class="chosen-plano-name">3 OPÇÕES DE PLANOS O&M</div>
        <p style="font-size: 10.5px; color: #065F46; font-weight: 600; margin: 10px 0 0 0; line-height: 1.45; padding: 0 8px;">
          As três opções de plano apresentadas acima ficam à disposição do cliente para escolha após a apresentação.
        </p>
      </div>

      <div class="terms-card">
        <strong style="color: #111827; font-size: 10.5px; margin-bottom: 3px;">Condições Gerais e Vigência:</strong>
        <ul>
          <li><strong>Escolha flexível:</strong> O cliente escolhe livremente a modalidade após a apresentação dos cenários.</li>
          <li><strong>Vigência contratual:</strong> 12 meses renováveis, garantindo atendimento contínuo e preventivo.</li>
          <li><strong>Forma de pagamento:</strong> Mensalidades via boleto bancário ou PIX corporativo Delfos.</li>
          <li><strong>Equipe técnica qualificada:</strong> Técnicos certificados NR-10 e NR-35 com equipamentos calibrados.</li>
          <li><strong>Garantia de segurança:</strong> Produtos específicos para fotovoltaico, preservando a garantia dos fabricantes.</li>
        </ul>
      </div>
    </div>

    <!-- Footer da Proposta -->
    <div class="doc-footer">
      <div class="doc-footer-company">
        <strong>${DADOS_EMPRESA_DELFOS.razaoSocial}</strong> • CNPJ ${DADOS_EMPRESA_DELFOS.cnpj}<br />
        ${DADOS_EMPRESA_DELFOS.endereco} • ${DADOS_EMPRESA_DELFOS.site}
      </div>
      <div class="doc-footer-validade">
        Proposta válida por 15 dias corridos.<br />
        Responsável: <strong>${dados.autor || 'Equipe Comercial Delfos Solar'}</strong>
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

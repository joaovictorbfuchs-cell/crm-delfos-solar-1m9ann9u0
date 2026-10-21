import type { SalvarPropostaCarregadorInput } from '@/services/propostasCarregadorService'
import { formatCurrency } from '@/lib/formatters'

/**
 * Formata data no padrão DD/MM/YYYY
 */
export function formatarDataBr(dataStr?: string | Date): string {
  if (!dataStr) return ''
  const d =
    typeof dataStr === 'string'
      ? new Date(dataStr.includes('T') ? dataStr : `${dataStr}T12:00:00`)
      : dataStr
  if (isNaN(d.getTime())) return ''
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  const ano = d.getFullYear()
  return `${dia}/${mes}/${ano}`
}

/**
 * Calcula a data de validade somando N dias corridos (padrão 10)
 */
export function calcularDataValidade(dataEmissaoStr?: string, validadeDias: number = 10): string {
  const d = dataEmissaoStr
    ? new Date(dataEmissaoStr.includes('T') ? dataEmissaoStr : `${dataEmissaoStr}T12:00:00`)
    : new Date()
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + validadeDias)
  return formatarDataBr(d)
}

/**
 * Gera o documento HTML completo fiel ao modelo do anexo:
 * "Modelo de Proposta — Carregador Veicular Delfos"
 * Perfeito para impressão A4, exportação em PDF e envio em anexo por e-mail.
 */
export interface GerarHTMLPropostaCarregadorOpcoes {
  /**
   * Data URL do logo Delfos Solar já otimizado/comprimido.
   * Quando ausente, é renderizado um fallback vetorial leve do logo.
   */
  logoDataUrl?: string
}

export function gerarHTMLPropostaCarregador(
  dados: SalvarPropostaCarregadorInput,
  opcoes?: GerarHTMLPropostaCarregadorOpcoes,
): string {
  const dataEmissaoFormatada = formatarDataBr(dados.data_emissao) || formatarDataBr(new Date())
  const validadeCalculada = calcularDataValidade(dados.data_emissao, dados.validade_dias || 10)

  const numProposta = dados.numero_proposta || 'PROP-2025-084'
  const clienteNome = dados.cliente_nome || '[Nome do Cliente / Empresa Ltda]'
  const clienteDoc = dados.cliente_documento || '[00.000.000/0001-00]'
  const clienteContato = dados.cliente_contato || '[Nome do Contato — (54) 99999-0000]'
  const endereco = dados.endereco_instalacao || '[Rua Exemplo, nº 123 — Bairro, Erechim/RS]'
  const respAcomp = dados.responsavel_acompanhante || '[Engº ou Gestor Responsável]'
  const tipoLocal = dados.tipo_local || 'Residencial / Condomínio / Comercial'

  const cPropMin = dados.custo_proprio_min ?? 18
  const cPropMax = dados.custo_proprio_max ?? 25
  const cPubMin = dados.custo_publico_min ?? 70
  const cPubMax = dados.custo_publico_max ?? 90

  const op1Titulo = dados.opcao1_titulo || 'Opção 01: Wallbox AC 7,4 kW'
  const op1Potencia = dados.opcao1_potencia || '7,4 kW (32A)'
  const op1Tensao = dados.opcao1_tensao || 'Monofásico / Bifásico 220V'
  const op1Tempo = dados.opcao1_tempo_recarga || '~7h a 8h (bateria 50–60 kWh)'
  const op1Valor = formatCurrency(dados.opcao1_valor ?? 6890)

  const op2Titulo = dados.opcao2_titulo || 'Opção 02: Wallbox AC 22 kW'
  const op2Potencia = dados.opcao2_potencia || '22 kW (32A trifásico)'
  const op2Tensao = dados.opcao2_tensao || 'Trifásico 380V (ou 11kW em 220V)'
  const op2Tempo = dados.opcao2_tempo_recarga || '~3h a 4h (bateria 50–60 kWh)'
  const op2Valor = formatCurrency(dados.opcao2_valor ?? 9450)

  // Opção única: carregador já adquirido pelo cliente
  const isAdquirido = Boolean(dados.carregador_adquirido || dados.modo_carregador === 'adquirido')
  const carregadorModelo =
    dados.carregador_modelo || dados.opcao2_titulo || 'Wallbox AC 22 kW Inteligente'
  const carregadorPotencia = dados.carregador_potencia || dados.opcao2_potencia || '22 kW (32A)'
  const carregadorValorNum = isAdquirido
    ? 0
    : Number(dados.carregador_valor ?? dados.opcao2_valor ?? 9450)

  // Materiais da infraestrutura de instalação
  const mats = Array.isArray(dados.materiais_infraestrutura) ? dados.materiais_infraestrutura : []
  const subtotalMateriaisNum =
    typeof dados.subtotal_materiais === 'number'
      ? dados.subtotal_materiais
      : mats.reduce(
          (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0),
          0,
        )

  // Serviços unificados (instalação e engenharia consolidados em um item só)
  const vServicosNum = Number(
    dados.valor_servicos ??
      (dados.valor_servicos_instalacao !== undefined ||
      dados.valor_servicos_engenharia !== undefined
        ? (Number(dados.valor_servicos_instalacao) || 0) +
          (Number(dados.valor_servicos_engenharia) || 0)
        : 3050),
  )

  // Total consolidado: Carregador (0 se adquirido) + Materiais + Serviços
  const vTotalNum = Number(
    dados.valor_total ?? carregadorValorNum + subtotalMateriaisNum + vServicosNum,
  )

  const vCarregador = isAdquirido ? 'Adquirido' : formatCurrency(carregadorValorNum)
  const subtotalMateriais = formatCurrency(subtotalMateriaisNum)
  const vServicos = formatCurrency(vServicosNum)
  const vTotal = formatCurrency(vTotalNum)

  const linhasMateriaisHtml = mats
    .map((mat, idx) => {
      const itemTotal = (Number(mat.quantidade) || 0) * (Number(mat.valor_unitario) || 0)
      return `<tr>
            <td style="padding-left: 1.6rem; font-size: 0.8rem;">• ${mat.descricao || 'Material de infraestrutura'}</td>
            <td style="text-align: center; font-size: 0.8rem;">${mat.quantidade} un</td>
            <td style="text-align: right; font-size: 0.8rem;">${formatCurrency(mat.valor_unitario)}</td>
            <td style="text-align: right; font-size: 0.8rem; font-weight: 600;">${formatCurrency(itemTotal)}</td>
          </tr>`
    })
    .join('\n          ')

  const condicoes =
    dados.condicoes_pagamento ||
    '50% de sinal no aceite desta proposta e 50% no comissionamento e entrega técnica operacional. Opção de parcelamento via cartão em até 12x (consulte taxas) ou faturamento direto PJ sob análise prévia.'

  const prazoExec =
    dados.prazo_execucao ||
    'Instalação concluída em até 5 dias úteis após a assinatura e liberação do local de passagem. Instalação física realizada em 1 único dia útil com mínimo impacto na rotina.'

  const garantias =
    dados.garantias ||
    '1 ano integral de garantia da Delfos Engenharia para toda a mão de obra e infraestrutura elétrica. Equipamento carregador com garantia de fábrica (12 a 24 meses).'

  const sobOrcamento =
    dados.premissas_orcamento_previo ||
    'Disponível sob orçamento prévio após vistoria: obras civis de alvenaria/abertura de piso, acréscimo de potência junto à concessionária e cabeamentos excedentes a 15 metros.'

  const engNome = dados.engenheiro_nome || 'Eng. Eletricista João Victor Bagetti Fuchs'
  const engCrea = dados.engenheiro_crea || 'CREA-RS 151894'

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposta Comercial — Carregador Veicular | DELFOS ENGENHARIA</title>
  <style>
    :root {
      --accent: #047857;
      --accent-hover: #065f46;
      --accent-soft: #ecfdf5;
      --accent-border: #a7f3d0;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-600: #475569;
      --slate-100: #f1f5f9;
      --amber-soft: #fef3c7;
      --amber-dark: #92400e;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      color: var(--slate-900);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .proposal-paper {
      max-width: 960px;
      margin: 1.5rem auto 3rem auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
      padding: 2.75rem 3rem;
    }

    .proposal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--slate-900);
      padding-bottom: 1.75rem;
      margin-bottom: 1.75rem;
      gap: 1.5rem;
    }

    .company-brand {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .logo-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--slate-900);
    }

    .logo-badge svg {
      width: 32px;
      height: 32px;
      color: var(--accent);
    }

    .company-meta {
      font-size: 0.8125rem;
      color: var(--slate-600);
      line-height: 1.4;
    }

    .proposal-meta {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.35rem;
    }

    .doc-tag {
      background: var(--slate-900);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.3rem 0.65rem;
      border-radius: 4px;
      display: inline-block;
    }

    .proposal-number {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--slate-900);
    }

    .proposal-dates {
      font-size: 0.8125rem;
      color: var(--slate-600);
    }

    .prop-section {
      margin-bottom: 2rem;
      page-break-inside: avoid;
    }

    .prop-section-title {
      font-size: 1rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--slate-900);
      display: flex;
      align-items: center;
      gap: 0.6rem;
      margin-bottom: 0.875rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid #e2e8f0;
    }

    .prop-section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 1.1em;
      background: var(--accent);
      border-radius: 2px;
    }

    .client-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1rem 1.25rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 0.85rem 1.5rem;
      font-size: 0.875rem;
    }

    .client-field-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      font-weight: 600;
      color: var(--slate-600);
      letter-spacing: 0.03em;
      margin-bottom: 0.2rem;
    }

    .client-field-val {
      color: var(--slate-900);
      font-weight: 600;
    }

    .persuasive-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
      border: 1px solid var(--accent-border);
      border-left: 4px solid var(--accent);
      border-radius: 6px;
      padding: 1.15rem 1.35rem;
      margin-bottom: 1.75rem;
    }

    .persuasive-box h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--slate-900);
      margin: 0 0 0.4rem 0;
    }

    .persuasive-box p {
      font-size: 0.9rem;
      color: var(--slate-600);
      line-height: 1.55;
      margin: 0;
    }

    .economy-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 0.75rem;
    }

    .economy-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 1rem 1.25rem;
      background: #ffffff;
      position: relative;
    }

    .economy-card.highlight {
      border-color: var(--accent-border);
      background: #f0fdf4;
    }

    .economy-card-tag {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--slate-600);
      margin-bottom: 0.35rem;
    }

    .economy-card.highlight .economy-card-tag {
      color: var(--accent);
    }

    .economy-price {
      font-size: 1.5rem;
      font-weight: 800;
      color: var(--slate-900);
      letter-spacing: -0.02em;
    }

    .economy-card.highlight .economy-price {
      color: var(--accent);
    }

    .economy-sub {
      font-size: 0.8125rem;
      color: var(--slate-600);
      margin-top: 0.25rem;
    }

    .callout-badge {
      grid-column: 1 / -1;
      background: #ecfdf5;
      border: 1px dashed var(--accent);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--accent);
    }

    .custom-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }

    .custom-table th {
      background: var(--slate-100);
      color: var(--slate-900);
      font-weight: 700;
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.7rem 0.85rem;
      border: 1px solid #e2e8f0;
      text-align: left;
    }

    .custom-table td {
      padding: 0.75rem 0.85rem;
      border: 1px solid #e2e8f0;
      color: var(--slate-900);
      vertical-align: middle;
    }

    .custom-table tr:nth-child(even) td {
      background: #fbfcfe;
    }

    .tag-rec {
      display: inline-block;
      background: var(--accent);
      color: #ffffff;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
      margin-left: 0.4rem;
    }

    .scope-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.85rem;
      margin-bottom: 0.85rem;
    }

    @media (max-width: 768px) {
      .scope-grid { grid-template-columns: 1fr; }
      .economy-grid { grid-template-columns: 1fr; }
    }

    .scope-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #fbfcfd;
      padding: 1rem;
    }

    .scope-box h4 {
      font-size: 0.875rem;
      font-weight: 700;
      color: var(--slate-900);
      margin: 0 0 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .scope-box h4 svg {
      width: 18px;
      height: 18px;
      color: var(--accent);
      flex-shrink: 0;
    }

    .scope-box ul {
      margin: 0;
      padding-left: 1.15rem;
      font-size: 0.8125rem;
      color: var(--slate-600);
      line-height: 1.5;
    }

    .scope-box ul li {
      margin-bottom: 0.35rem;
    }

    .legal-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.85rem 1.15rem;
      display: flex;
      align-items: center;
      gap: 0.85rem;
      font-size: 0.8125rem;
      color: var(--slate-800);
    }

    .legal-box svg {
      width: 24px;
      height: 24px;
      color: var(--accent);
      flex-shrink: 0;
    }

    .terms-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.85rem;
      margin-top: 0.75rem;
    }

    @media (max-width: 768px) {
      .terms-grid { grid-template-columns: 1fr; }
    }

    .term-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #ffffff;
      padding: 1rem;
    }

    .term-title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--slate-600);
      margin-bottom: 0.45rem;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .term-desc {
      font-size: 0.8125rem;
      color: var(--slate-800);
      line-height: 1.45;
      margin: 0;
    }

    .steps-container {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 0.65rem;
      margin-top: 0.75rem;
    }

    @media (max-width: 820px) {
      .steps-container { grid-template-columns: 1fr; }
    }

    .step-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 0.75rem 0.65rem;
      text-align: center;
    }

    .step-num {
      width: 24px;
      height: 24px;
      background: var(--accent);
      color: #ffffff;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 0.45rem auto;
    }

    .step-title {
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--slate-900);
      margin-bottom: 0.2rem;
    }

    .step-text {
      font-size: 0.72rem;
      color: var(--slate-600);
      line-height: 1.35;
    }

    .urgency-badge {
      background: var(--amber-soft);
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin-top: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.65rem;
      font-size: 0.84rem;
      color: var(--amber-dark);
      font-weight: 600;
    }

    .signatures-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2.5rem;
      margin-top: 2.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }

    .sign-block { text-align: center; }
    .sign-line {
      border-top: 1.5px solid var(--slate-900);
      margin-bottom: 0.5rem;
      padding-top: 0.5rem;
    }
    .sign-name {
      font-weight: 700;
      font-size: 0.875rem;
      color: var(--slate-900);
    }
    .sign-role {
      font-size: 0.78rem;
      color: var(--slate-600);
    }

    .proposal-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
      margin-top: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.75rem;
      color: var(--slate-600);
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    @media print {
      body {
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 11pt;
      }
      .proposal-paper {
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        max-width: 100% !important;
      }
      .prop-section {
        page-break-inside: avoid;
        margin-bottom: 1.35rem;
      }
      .signatures-section {
        page-break-inside: avoid;
        margin-top: 1.5rem;
        padding-top: 1rem;
      }
      .custom-table th {
        background-color: #f1f5f9 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .persuasive-box,
      .economy-card.highlight,
      .callout-badge,
      .doc-tag,
      .step-num {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      @page {
        size: A4;
        margin: 1.4cm 1.5cm 1.4cm 1.5cm;
      }
    }
  </style>
</head>
<body>

  <main class="proposal-paper" id="proposal-content">

    <!-- 1. CABEÇALHO -->
    <header class="proposal-header">
      <div class="company-brand">
        <div class="logo-badge">
          ${
            opcoes?.logoDataUrl
              ? `<img src="${opcoes.logoDataUrl}" alt="Delfos Solar" style="height: 56px; width: auto; object-fit: contain; display: block;" />`
              : `<svg viewBox="0 0 300 180" style="height: 56px; width: auto; display: block;" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="delfos-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#1d4ed8"></stop>
                <stop offset="0.35" stop-color="#0d9488"></stop>
                <stop offset="0.6" stop-color="#65a30d"></stop>
                <stop offset="0.85" stop-color="#eab308"></stop>
                <stop offset="1" stop-color="#facc15"></stop>
              </linearGradient>
            </defs>
            <ellipse cx="150" cy="90" rx="138" ry="68" fill="none" stroke="url(#delfos-grad)" stroke-width="16"></ellipse>
            <text x="150" y="106" text-anchor="middle" font-size="60" font-weight="700" fill="#1e3a8a" font-family="Arial, sans-serif">delfos</text>
            <text x="150" y="140" text-anchor="middle" font-size="18" letter-spacing="10" fill="#1e3a8a" font-family="Arial, sans-serif">solar</text>
          </svg>`
          }
          <span style="font-size: 1.05rem; font-weight: 800; color: var(--slate-900);">DELFOS ENGENHARIA</span>
        </div>
        <div class="company-meta">
          <strong>Delfos Engenharia Ltda</strong> • CNPJ: 21.379.952/0001-38<br>
          Rua Espírito Santo, 275 • Erechim – RS • CEP 99709-296
        </div>
      </div>

      <div class="proposal-meta">
        <span class="doc-tag">Proposta Comercial</span>
        <div class="proposal-number">
          Nº <span>${numProposta}</span>
        </div>
        <div class="proposal-dates">
          Emissão: <strong>${dataEmissaoFormatada}</strong><br>
          Validade: <strong>10 dias corridos</strong> (até <span>${validadeCalculada}</span>)
        </div>
      </div>
    </header>

    <div style="margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.01em; color: var(--slate-900); margin: 0 0 0.25rem 0;">
        PROPOSTA COMERCIAL — Infraestrutura de Recarga Wallbox
      </h1>
      <p style="font-size: 0.875rem; color: var(--slate-600); margin: 0;">
        Fornecimento e instalação técnica especializada de ponto de recarga veicular conforme normas ABNT NBR 5410 e ABNT NBR 17019.
      </p>
    </div>

    <!-- 2. DADOS DO CLIENTE -->
    <section class="prop-section" aria-labelledby="sec-client">
      <h2 id="sec-client" class="prop-section-title">1. Dados do Cliente &amp; Local de Instalação</h2>
      <div class="client-card">
        <div>
          <div class="client-field-label">Cliente / Razão Social</div>
          <div class="client-field-val">${clienteNome}</div>
        </div>
        <div>
          <div class="client-field-label">CNPJ / CPF</div>
          <div class="client-field-val">${clienteDoc}</div>
        </div>
        <div>
          <div class="client-field-label">Contato / Telefone / E-mail</div>
          <div class="client-field-val">${clienteContato}</div>
        </div>
        <div>
          <div class="client-field-label">Endereço da Instalação</div>
          <div class="client-field-val">${endereco}</div>
        </div>
        <div>
          <div class="client-field-label">Responsável Acompanhante</div>
          <div class="client-field-val">${respAcomp}</div>
        </div>
        <div>
          <div class="client-field-label">Tipo de Local</div>
          <div class="client-field-val">${tipoLocal}</div>
        </div>
      </div>
    </section>

    <!-- 3. ABERTURA PERSUASIVA -->
    <section class="prop-section" aria-labelledby="sec-value">
      <div class="persuasive-box">
        <h3>Por que estruturar seu próprio ponto de recarga veicular?</h3>
        <p>
          A mobilidade elétrica é um caminho definitivo de eficiência e inteligência energética. Dispor de uma estação Wallbox dedicada transforma a experiência de uso: oferece <strong>total conveniência de abastecer no local onde o veículo já permanece estacionado</strong>, agrega alto valor percebido ao imóvel ou estabelecimento comercial, posiciona sua marca na vanguarda da sustentabilidade e garante autonomia diária com segurança contra sobrecargas elétricas e surtos de tensão.
        </p>
      </div>
    </section>

    <!-- 4. PROJEÇÃO DE ECONOMIA -->
    <section class="prop-section" aria-labelledby="sec-economy">
      <h2 id="sec-economy" class="prop-section-title">2. Projeção de Economia: Ponto Próprio vs. Posto Público</h2>
      <p style="font-size: 0.8125rem; color: var(--slate-600); margin-top: -0.25rem; margin-bottom: 0.75rem;">
        *Valores médios de referência para consumo de 16 a 18 kWh a cada 100 km rodados em veículos elétricos médios (tarifa de energia local vs. tarifas de operadores de recarga rápida comercial):
      </p>

      <div class="economy-grid">
        <div class="economy-card highlight">
          <div class="economy-card-tag">Recarga Própria (Wallbox Delfos)</div>
          <div class="economy-price">R$ ${cPropMin} a R$ ${cPropMax}</div>
          <div class="economy-sub">Custo médio estimado a cada 100 km rodados (tarifa concessionária ou solar)</div>
        </div>

        <div class="economy-card">
          <div class="economy-card-tag">Eletroposto Público / Rápido Comercial</div>
          <div class="economy-price" style="color: var(--slate-600);">R$ ${cPubMin} a R$ ${cPubMax}</div>
          <div class="economy-sub">Custo médio cobrado por aplicativos e hubs de carregamento por 100 km</div>
        </div>

        <div class="callout-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span><strong>Economia de até 4x no custo por quilômetro:</strong> o investimento no carregador próprio se amortiza com a economia mensal em combustível e tempo de deslocamento.</span>
        </div>
      </div>
    </section>

    <!-- 5. OPÇÕES DE CARREGADOR -->
    <section class="prop-section" aria-labelledby="sec-options">
      <h2 id="sec-options" class="prop-section-title">3. Carregador Veicular Wallbox</h2>
      ${
        isAdquirido
          ? `<div style="border: 1px solid #fcd34d; background: #fffbeb; border-radius: 6px; padding: 1rem 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-weight: 700; color: var(--slate-900);">${carregadorModelo}
              <span style="background: #d97706; color: #ffffff; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; padding: 0.15rem 0.5rem; border-radius: 3px; margin-left: 0.4rem;">Adquirido</span>
            </div>
            <small style="color: var(--slate-600); display: block; margin-top: 0.25rem;">
              Equipamento fornecido diretamente pelo cliente. A Delfos Engenharia realizará o comissionamento técnico, fixação, parametrizações elétricas e conexão com a infraestrutura dedicada.
            </small>
            ${carregadorPotencia ? `<small style="color: var(--slate-800); font-weight: 600; display: block; margin-top: 0.2rem;">Potência / Tensão informada: ${carregadorPotencia}</small>` : ''}
          </div>
          <div style="font-weight: 800; color: #92400e; background: #ffffff; border: 1px solid #fde68a; padding: 0.4rem 0.8rem; border-radius: 4px;">Adquirido</div>
        </div>
      </div>`
          : `<table class="custom-table">
        <thead>
          <tr>
            <th style="width: 25%;">Modelo &amp; Aplicação</th>
            <th style="width: 15%;">Potência</th>
            <th style="width: 20%;">Ligação &amp; Rede</th>
            <th style="width: 20%;">Tempo Recarga (0–100%)*</th>
            <th style="width: 20%; text-align: right;">Investimento Base</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${op1Titulo}</strong><br>
              <small style="color: var(--slate-600);">Ideal para residências, condomínios e recarga noturna contínua.</small>
            </td>
            <td><strong>${op1Potencia}</strong></td>
            <td>${op1Tensao}</td>
            <td>${op1Tempo}</td>
            <td style="text-align: right; font-weight: 700; color: var(--slate-900);">
              ${op1Valor}
            </td>
          </tr>
          <tr style="background: #f0fdf4;">
            <td>
              <strong>${op2Titulo}</strong>
              <span class="tag-rec">Recomendado</span><br>
              <small style="color: var(--slate-600);">Alta performance para frotas, comércios, clínicas e recarga rotativa.</small>
            </td>
            <td><strong>${op2Potencia}</strong></td>
            <td>${op2Tensao}</td>
            <td>${op2Tempo}</td>
            <td style="text-align: right; font-weight: 700; color: var(--accent);">
              ${op2Valor}
            </td>
          </tr>
        </tbody>
      </table>
      <div style="font-size: 0.72rem; color: var(--slate-600); margin-top: 0.4rem;">
        *Tempo estimado em função da capacidade interna do inversor onboard do veículo. Ambos os modelos incluem conector padrão Tipo 2 (Tipo Mennekes) com cabo integrado de 5 metros.
      </div>`
      }
    </section>

    <!-- 6. ESCOPO TÉCNICO DA INSTALAÇÃO -->
    <section class="prop-section" aria-labelledby="sec-scope">
      <h2 id="sec-scope" class="prop-section-title">4. Escopo Técnico da Engenharia de Instalação</h2>
      
      <div class="scope-grid">
        <!-- Bloco A -->
        <div class="scope-box">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"></rect>
              <path d="M7 8h10M7 12h10M7 16h6"></path>
            </svg>
            (A) Quadro de Proteção
          </h4>
          <ul>
            <li>Montagem em estrita conformidade com <strong>NBR 5410</strong> e <strong>NBR 17019</strong>.</li>
            <li>Disjuntor termomagnético dedicado com curva de disparo apropriada.</li>
            <li>Interruptor Diferencial Residual (<strong>DR Tipo A</strong> ou sensor DC 6mA) para proteção de usuários.</li>
            <li>Dispositivo Protetor de Surto (<strong>DPS Classe II</strong>).</li>
          </ul>
        </div>

        <!-- Bloco B -->
        <div class="scope-box">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            (B) Infraestrutura &amp; Cabeamento
          </h4>
          <ul>
            <li>Condutores de cobre eletrolítico antichama (cabo isolação 750V / 1kV).</li>
            <li>Dimensionamento térmico e critério de queda de tensão (&lt; 2%).</li>
            <li>Eletrodutos rígidos ou metálicos aparentes de alto acabamento.</li>
            <li>Acessórios de fixação mecânica, abraçadeiras e prensas-cabos estanques.</li>
          </ul>
        </div>

        <!-- Bloco C -->
        <div class="scope-box">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
            (C) Fixação &amp; Comissionamento
          </h4>
          <ul>
            <li>Fixação em alvenaria / totem com chumbamento técnico seguro.</li>
            <li>Medição e adequação do sistema de aterramento elétrico exclusivo.</li>
            <li>Configuração de rede, controle de potência e ativação de RFID/App.</li>
            <li>Testes com simulador de carga veicular e checagem térmica pré-entrega.</li>
          </ul>
        </div>
      </div>

      <!-- Legal & Technical Docs -->
      <div class="legal-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <div>
          <strong>Documentação Técnica &amp; Legal Inclusa:</strong>
          Emissão de <strong>ART (Anotação de Responsabilidade Técnica) no CREA-RS</strong> pelo Engenheiro Responsável, diagramas elétricos unifilares da instalação e documentação compatível para fins de seguro patrimonial e vistorias do Corpo de Bombeiros.
        </div>
      </div>
    </section>

    <!-- 7. INVESTIMENTO -->
    <section class="prop-section" aria-labelledby="sec-investment">
      <h2 id="sec-investment" class="prop-section-title">5. Investimento Consolidado &amp; Condições Comerciais</h2>
      
      <table class="custom-table">
        <thead>
          <tr>
            <th>Item / Discriminação dos Custos</th>
            <th style="width: 14%; text-align: center;">Quantidade</th>
            <th style="width: 16%; text-align: right;">Unitário</th>
            <th style="width: 18%; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>1. Carregador Veicular — ${carregadorModelo}</strong>${isAdquirido ? ' <span style="background: #d97706; color: #ffffff; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; padding: 0.12rem 0.45rem; border-radius: 3px;">Adquirido</span>' : ''}<br>
              <small style="color: var(--slate-600);">${isAdquirido ? 'Equipamento fornecido diretamente pelo cliente (sem custo de aquisição na proposta).' : `Estação Wallbox homologada ${carregadorPotencia} com conector Tipo 2.`}</small>
            </td>
            <td style="text-align: center;">1 un</td>
            <td style="text-align: right;">${isAdquirido ? '—' : vCarregador}</td>
            <td style="text-align: right; font-weight: 600; color: ${isAdquirido ? '#92400e' : 'var(--slate-900)'};">
              ${vCarregador}
            </td>
          </tr>
          <tr style="background: #f1f5f9;">
            <td colspan="4" style="font-weight: 700; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em;">2. Materiais da Infraestrutura de Instalação</td>
          </tr>
          ${linhasMateriaisHtml || `<tr><td colspan="4" style="text-align: center; font-size: 0.8rem; color: var(--slate-600);">Materiais da infraestrutura elétrica inclusos no escopo (quadro de proteção, disjuntor, DR, DPS e cabeamento).</td></tr>`}
          <tr style="background: #f8fafc;">
            <td colspan="3" style="text-align: right; font-weight: 700; font-size: 0.8rem;">Subtotal dos Materiais da Infraestrutura:</td>
            <td style="text-align: right; font-weight: 700;">${subtotalMateriais}</td>
          </tr>
          <tr>
            <td>
              <strong>3. Serviços de Instalação e Engenharia</strong><br>
              <small style="color: var(--slate-600);">Passagem e fixação de infraestrutura, montagem de quadro elétrico dedicado, fixação mecânica do Wallbox, conexões elétricas, comissionamento com testes funcionais, laudo técnico e emissão de ART/CREA-RS.</small>
            </td>
            <td style="text-align: center;">1 lote</td>
            <td style="text-align: right;">${vServicos}</td>
            <td style="text-align: right; font-weight: 600;">${vServicos}</td>
          </tr>
          <tr style="background: #f8fafc; border-top: 2px solid var(--slate-900);">
            <td colspan="2" style="font-size: 1rem; font-weight: 800;">
              INVESTIMENTO TOTAL
              <div style="font-size: 0.72rem; font-weight: 400; color: var(--slate-600);">Composição: ${isAdquirido ? 'Carregador Adquirido (R$ 0,00)' : 'Carregador'} + Materiais + Serviços</div>
            </td>
            <td style="text-align: center; font-weight: 700;">—</td>
            <td style="text-align: right; font-size: 1.15rem; font-weight: 800; color: var(--accent);">
              ${vTotal}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 0.85rem; padding: 0.85rem 1rem; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.85rem;">
        <strong>Condições de Pagamento:</strong>
        <span>${condicoes}</span>
      </div>
    </section>

    <!-- 8. PRAZO, GARANTIAS E NÃO INCLUSO -->
    <section class="prop-section" aria-labelledby="sec-terms">
      <h2 id="sec-terms" class="prop-section-title">6. Prazos, Garantia &amp; Premissas de Instalação</h2>
      
      <div class="terms-grid">
        <div class="term-card">
          <div class="term-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            Prazo de Execução
          </div>
          <p class="term-desc">
            ${prazoExec}
          </p>
        </div>

        <div class="term-card">
          <div class="term-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            Garantias Asseguradas
          </div>
          <p class="term-desc">
            ${garantias}
          </p>
        </div>

        <div class="term-card">
          <div class="term-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            Sob Orçamento Prévio
          </div>
          <p class="term-desc">
            ${sobOrcamento}
          </p>
        </div>
      </div>
    </section>

    <!-- 9. RESPONSÁVEL TÉCNICO -->
    <section class="prop-section" aria-labelledby="sec-engineer">
      <h2 id="sec-engineer" class="prop-section-title">7. Responsabilidade Técnica</h2>
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; padding: 1rem 1.25rem; border-radius: 6px;">
        <div>
          <div style="font-size: 1rem; font-weight: 700; color: var(--slate-900);">
            ${engNome}
          </div>
          <div style="font-size: 0.8125rem; color: var(--slate-600); margin-top: 0.15rem;">
            Responsável Técnico • <strong>${engCrea}</strong> • Especialista em Instalações de Alta &amp; Baixa Tensão
          </div>
        </div>
        <div style="font-size: 0.78rem; background: #ffffff; border: 1px solid #cbd5e1; padding: 0.4rem 0.75rem; border-radius: 4px; color: var(--slate-800); font-weight: 600;">
          Registro Profissional Ativo CREA-RS
        </div>
      </div>
    </section>

    <!-- 10. PRÓXIMOS PASSOS (CTA) -->
    <section class="prop-section" aria-labelledby="sec-steps">
      <h2 id="sec-steps" class="prop-section-title">8. Próximos Passos para Ativação</h2>
      
      <div class="steps-container">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-title">Aceite Formal</div>
          <div class="step-text">Assinatura digital ou física da proposta.</div>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-title">Sinal (50%)</div>
          <div class="step-text">Confirmação financeira para reserva de insumos.</div>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-title">Vistoria &amp; Agenda</div>
          <div class="step-text">Alinhamento do traçado e agendamento da equipe.</div>
        </div>
        <div class="step-item">
          <div class="step-num">4</div>
          <div class="step-title">Instalação &amp; Testes</div>
          <div class="step-text">Execução rápida, comissionamento e laudo técnico.</div>
        </div>
        <div class="step-item">
          <div class="step-num">5</div>
          <div class="step-title">Saldo Final</div>
          <div class="step-text">Pagamento dos 50% restantes com entrega da ART.</div>
        </div>
      </div>

      <div class="urgency-badge">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>
          <strong>Atenção:</strong> Condições comerciais e reserva de equipamentos válidas por apenas <strong>10 dias</strong>. A agenda de montagem é confirmada por ordem cronológica de aceite.
        </span>
      </div>
    </section>

    <!-- 11. RODAPÉ & ASSINATURAS -->
    <section class="signatures-section" aria-label="Assinaturas das Partes">
      <div class="sign-block">
        <div class="sign-line">
          <div class="sign-name">DELFOS ENGENHARIA LTDA</div>
          <div class="sign-role">CNPJ: 21.379.952/0001-38 — Erechim/RS</div>
          <div class="sign-role" style="font-size: 0.72rem; margin-top: 0.2rem;">${engNome} — ${engCrea}</div>
        </div>
      </div>

      <div class="sign-block">
        <div class="sign-line">
          <div class="sign-name">${clienteNome}</div>
          <div class="sign-role">De Acordo / Aceite da Proposta Comercial</div>
          <div class="sign-role" style="margin-top: 0.35rem;">Data do Aceite: ___ / ___ / 2025</div>
        </div>
      </div>
    </section>

    <footer class="proposal-footer">
      <div>
        <strong>Delfos Engenharia Ltda</strong> • Erechim – RS • Contato Comercial: (54) 3522-0000 • engenharia@delfosengenharia.com.br
      </div>
      <div>
        Proposta Comercial emitida conforme normas ABNT vigentes • Válida por 10 dias.
      </div>
    </footer>

  </main>
</body>
</html>`
}

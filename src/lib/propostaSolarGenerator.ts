import type {
  CalculosSolarResultado,
  TipoClienteSolar,
  TipoEstruturaSolar,
  OrientacaoTelhadoSolar,
} from '@/lib/energiaSolar'

export interface DadosEmpresaDelfosCompleto {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  endereco: string
  telefone: string
  email: string
  site: string
  responsavelTecnico: string
  crea: string
}

export const DADOS_EMPRESA_DELFOS_SOLAR: DadosEmpresaDelfosCompleto = {
  razaoSocial: 'Delfos Engenharia Ltda',
  nomeFantasia: 'Delfos Solar',
  cnpj: '21.379.952/0001-38',
  endereco: 'Rua Espírito Santo 275, Centro, Erechim - RS',
  telefone: '(54) 99129-2121',
  email: 'contato@delfos.eng.br',
  site: 'www.delfos.eng.br',
  responsavelTecnico: 'João Victor Bagetti Fuchs',
  crea: 'CREA RS151894',
}

export interface PropostaSolarPDFInput {
  cliente: {
    nome: string
    cpfOuCnpj?: string
    endereco?: string
    municipio?: string
    email?: string
    telefone?: string
    tipoCliente?: TipoClienteSolar
  }
  representanteComercial?: string
  sistema: {
    potenciaKwp: number
    consumoKwhMes: number
    numeroPlacas: number
    potenciaPlacaWp: number
    marcaPlacas: string
    marcaInversor: string
    quantidadeInversores: number
    tipoEstrutura: TipoEstruturaSolar
    orientacaoTelhado: OrientacaoTelhadoSolar
    areaNecessariaM2: number
    codigoFiname?: string
    prazoEntregaDias?: number
  }
  calculos: CalculosSolarResultado
  dataEmissao?: string
  validadeDias?: number // 5 dias prescritos
  observacoes?: string
}

export function formatarTipoEstrutura(tipo: TipoEstruturaSolar): string {
  switch (tipo) {
    case 'ceramico':
      return 'Telhado Cerâmico'
    case 'metalico':
      return 'Telhado Metálico'
    case 'laje':
      return 'Laje de Concreto'
    case 'fibrocimento':
      return 'Telhado Fibrocimento'
    case 'solo':
      return 'Estrutura de Solo'
    default:
      return tipo
  }
}

export function formatarOrientacao(orientacao: OrientacaoTelhadoSolar): string {
  switch (orientacao) {
    case 'norte':
      return 'Norte (Ideal)'
    case 'leste':
      return 'Leste'
    case 'oeste':
      return 'Oeste'
    case 'sul':
      return 'Sul'
    default:
      return orientacao
  }
}

export function gerarHTMLPropostaSolar(dados: PropostaSolarPDFInput): string {
  const { cliente, representanteComercial, sistema, calculos } = dados

  const formatBRL = (val: number) =>
    (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const formatDateBR = (iso?: string) => {
    const d = iso ? new Date(iso) : new Date()
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const validadeEmDias = dados.validadeDias ?? 5
  const repNome = representanteComercial || 'Equipe Comercial Delfos Solar'
  const prazoEntrega = sistema.prazoEntregaDias ?? 30

  // Gera as colunas dos meses para a tabela de geração sazonal
  const mesesLinhas = calculos.geracaoMensalDetalhada
    .map(
      (m) => `
      <tr>
        <td style="font-weight: 600; text-align: left;">${m.mesNome}</td>
        <td>${m.irradiacaoHSP.toFixed(2)}</td>
        <td>${m.dias} dias</td>
        <td>${(m.fatorSazonal * 100).toFixed(0)}%</td>
        <td style="font-weight: 700; color: #166534; text-align: right;">${m.geracaoKwh.toLocaleString('pt-BR')} kWh</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta Técnico-Comercial Solar - Delfos Solar - ${cliente.nome}</title>
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
      font-size: 10.5px;
      line-height: 1.4;
    }
    .page-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
    }
    /* Controls for Browser Preview */
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
    /* Header Bar */
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #16A34A;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-badge {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #166534, #16A34A, #F59E0B);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 900;
      font-size: 26px;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);
    }
    .company-title {
      font-size: 19px;
      font-weight: 900;
      color: #064E3B;
      letter-spacing: -0.02em;
      margin: 0;
      line-height: 1.05;
    }
    .company-subtitle {
      font-size: 10px;
      font-weight: 700;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin-top: 2px;
    }
    .header-contact {
      text-align: right;
      font-size: 9px;
      color: #4B5563;
      line-height: 1.35;
    }
    .header-contact strong {
      color: #111827;
      font-weight: 700;
    }
    /* Hero Title */
    .doc-hero {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #16A34A;
      border-radius: 8px;
      padding: 9px 12px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .doc-hero-left h1 {
      font-size: 14.5px;
      font-weight: 900;
      color: #065F46;
      margin: 0 0 2px 0;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .doc-hero-left p {
      margin: 0;
      font-size: 10px;
      color: #047857;
      font-weight: 500;
    }
    .doc-badge-date {
      font-size: 9.5px;
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
      gap: 10px;
      margin-bottom: 12px;
    }
    .info-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 8px 12px;
    }
    .info-card h3 {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #111827;
      margin: 0 0 6px 0;
      padding-bottom: 4px;
      border-bottom: 1px dashed #D1D5DB;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 10px;
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
      font-weight: 800;
    }
    /* Quem Somos */
    .about-box {
      background: #F8FAF9;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
      font-size: 9.5px;
      color: #4B5563;
      line-height: 1.45;
    }
    .about-box strong {
      color: #111827;
    }
    /* Section Headers */
    .section-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 12px 0 6px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 3.5px;
      height: 12px;
      background: #16A34A;
      border-radius: 2px;
    }
    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9.5px;
    }
    .data-table th {
      background: #F3F4F6;
      border: 1px solid #E5E7EB;
      padding: 6px 8px;
      font-weight: 700;
      color: #374151;
      text-align: left;
    }
    .data-table td {
      border: 1px solid #E5E7EB;
      padding: 5px 8px;
      color: #4B5563;
    }
    .data-table tr:nth-child(even) td {
      background: #FAFAFA;
    }
    /* Key Metrics Highlights Grid */
    .metrics-banner {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .metric-card {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 8px;
      text-align: center;
    }
    .metric-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #166534;
      text-transform: uppercase;
    }
    .metric-value {
      font-size: 14px;
      font-weight: 900;
      color: #15803D;
      margin-top: 2px;
    }
    .metric-sub {
      font-size: 8px;
      color: #047857;
      margin-top: 1px;
    }
    /* Parcelamento 4 colunas */
    .finance-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .finance-card {
      border: 1.5px solid #E5E7EB;
      border-radius: 8px;
      padding: 8px;
      background: #FFFFFF;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .finance-card.highlight {
      border-color: #16A34A;
      background: #F0FDF4;
    }
    .finance-card.highlight-blue {
      border-color: #3B82F6;
      background: #EFF6FF;
    }
    .finance-title {
      font-size: 10px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
    }
    .finance-badge {
      display: inline-block;
      font-size: 8px;
      font-weight: 700;
      padding: 1.5px 5px;
      border-radius: 4px;
      margin-top: 3px;
      background: #E5E7EB;
      color: #374151;
    }
    .finance-card.highlight .finance-badge {
      background: #16A34A;
      color: #FFFFFF;
    }
    .finance-card.highlight-blue .finance-badge {
      background: #2563EB;
      color: #FFFFFF;
    }
    .finance-installment {
      font-size: 14px;
      font-weight: 900;
      color: #111827;
      margin: 6px 0 2px 0;
    }
    .finance-card.highlight .finance-installment {
      color: #15803D;
    }
    .finance-card.highlight-blue .finance-installment {
      color: #1D4ED8;
    }
    .finance-total {
      font-size: 8.5px;
      color: #6B7280;
    }
    .finance-comparison {
      border-top: 1px dashed #D1D5DB;
      margin-top: 6px;
      padding-top: 6px;
      font-size: 8.5px;
      text-align: left;
    }
    .finance-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    /* Desperdício x Economia */
    .waste-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .waste-box {
      border-radius: 8px;
      padding: 8px 12px;
    }
    .waste-box.danger {
      background: #FEF2F2;
      border: 1px solid #FECACA;
    }
    .waste-box.success {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
    }
    .waste-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .waste-box.danger .waste-title {
      color: #991B1B;
    }
    .waste-box.success .waste-title {
      color: #166534;
    }
    .waste-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5px;
      margin-bottom: 2px;
    }
    /* Serviços e Garantias */
    .services-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
      font-size: 9.5px;
    }
    .bullet-list {
      margin: 4px 0 0 0;
      padding-left: 14px;
    }
    .bullet-list li {
      margin-bottom: 2.5px;
      color: #4B5563;
    }
    /* Footer */
    .doc-footer {
      border-top: 1px solid #E5E7EB;
      padding-top: 8px;
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5px;
      color: #6B7280;
    }
    .doc-footer strong {
      color: #111827;
    }
    .tech-resp {
      text-align: right;
      color: #15803D;
      font-weight: 700;
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
        <strong style="font-size: 13px;">Delfos Solar — Proposta Técnico-Comercial de Usina Solar</strong>
        <div style="font-size: 11px; color: #9CA3AF;">Visualização para impressão / download em PDF</div>
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

    <!-- Header Delfos Solar -->
    <div class="header-bar">
      <div class="brand-section">
        <div class="logo-badge">☀️</div>
        <div>
          <div class="company-title">${DADOS_EMPRESA_DELFOS_SOLAR.nomeFantasia}</div>
          <div class="company-subtitle">Engenharia Solar & Eficiência Energética</div>
        </div>
      </div>
      <div class="header-contact">
        <strong>${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial}</strong> • CNPJ ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}<br />
        ${DADOS_EMPRESA_DELFOS_SOLAR.endereco}<br />
        Tel: <strong>${DADOS_EMPRESA_DELFOS_SOLAR.telefone}</strong> • Email: ${DADOS_EMPRESA_DELFOS_SOLAR.email}<br />
        <strong>${DADOS_EMPRESA_DELFOS_SOLAR.site}</strong>
      </div>
    </div>

    <!-- Hero Title -->
    <div class="doc-hero">
      <div class="doc-hero-left">
        <h1>Proposta Técnico-Comercial de Energia Solar Fotovoltaica</h1>
        <p>Geração limpa, valorização patrimonial e redução imediata de custos na sua conta de energia</p>
      </div>
      <div class="doc-badge-date">
        Emissão: ${formatDateBR(dados.dataEmissao)}
      </div>
    </div>

    <!-- Seção Quem Somos e Portfólio -->
    <div class="about-box">
      <strong>Quem Somos:</strong> A <strong>Delfos Engenharia (Delfos Solar)</strong> é referência no Alto Uruguai Gaúcho e Norte Catarinense em engenharia fotovoltaica, projetos elétricos homologados e gestão inteligente de usinas. Com corpo técnico especializado liderado pelo Eng. Civil e Eletricista João Victor Bagetti Fuchs (CREA RS151894), já conectamos centenas de projetos residenciais, comerciais, industriais e rurais, entregando excelência técnica com materiais de primeira linha (Tier 1) e pós-venda completo.
    </div>

    <!-- Grid: Cliente & Representante -->
    <div class="cards-grid">
      <!-- Card Cliente -->
      <div class="info-card">
        <h3>
          <span>1. Dados do Cliente</span>
          <span style="font-size: 8.5px; color: #16A34A; text-transform: uppercase;">
            ${cliente.tipoCliente || 'Solar'}
          </span>
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
          <span class="info-label">Telefone / E-mail:</span>
          <span class="info-value">${cliente.telefone || ''} ${cliente.email ? `• ${cliente.email}` : ''}</span>
        </div>
      </div>

      <!-- Card Responsáveis & Prazos -->
      <div class="info-card">
        <h3>
          <span>2. Atendimento & Validade</span>
          <span style="font-size: 8.5px; color: #16A34A;">● Vigente</span>
        </h3>
        <div class="info-row">
          <span class="info-label">Representante Comercial:</span>
          <span class="info-value"><strong>${repNome}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Responsável Técnico:</span>
          <span class="info-value"><strong>${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico}</strong></span>
        </div>
        <div class="info-row">
          <span class="info-label">Registro Profissional:</span>
          <span class="info-value">${DADOS_EMPRESA_DELFOS_SOLAR.crea}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Prazo de Instalação:</span>
          <span class="info-value highlight-val">${prazoEntrega} dias corridos</span>
        </div>
        <div class="info-row">
          <span class="info-label">Validade da Proposta:</span>
          <span class="info-value highlight-val"><strong>${validadeEmDias} dias corridos</strong></span>
        </div>
      </div>
    </div>

    <!-- Destaques Numéricos do Sistema -->
    <div class="metrics-banner">
      <div class="metric-card">
        <div class="metric-label">Potência Instalada</div>
        <div class="metric-value">${sistema.potenciaKwp.toFixed(2)} kWp</div>
        <div class="metric-sub">${sistema.numeroPlacas} placas (${sistema.potenciaPlacaWp}W)</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Geração Média Mensal</div>
        <div class="metric-value">${calculos.geracaoMediaMensalKwh.toLocaleString('pt-BR')} kWh</div>
        <div class="metric-sub">${calculos.geracaoAnualEstimadaKwh.toLocaleString('pt-BR')} kWh/ano</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Investimento Total</div>
        <div class="metric-value">${formatBRL(calculos.valorInvestimento)}</div>
        <div class="metric-sub">${formatBRL(calculos.custoPorKwpInstalado)}/kWp</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Payback Estimado</div>
        <div class="metric-value">${calculos.paybackMeses} meses</div>
        <div class="metric-sub">(~${calculos.paybackAnos} anos)</div>
      </div>
    </div>

    <!-- Especificações Técnicas do Sistema -->
    <div class="section-title">3. Especificações Técnicas dos Equipamentos</div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 28%;">Item / Componente</th>
          <th style="width: 32%;">Especificação / Modelo</th>
          <th style="width: 15%; text-align: center;">Quantidade</th>
          <th style="width: 25%;">Garantia de Fábrica</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Módulos Fotovoltaicos</strong></td>
          <td>${sistema.marcaPlacas} — ${sistema.potenciaPlacaWp} Wp</td>
          <td style="text-align: center;">${sistema.numeroPlacas} un</td>
          <td>12 a 15 anos defeito de fabricação / 25 a 30 anos 80%+ rendimento</td>
        </tr>
        <tr>
          <td><strong>Inversor(es) Solar(es)</strong></td>
          <td>${sistema.marcaInversor}</td>
          <td style="text-align: center;">${sistema.quantidadeInversores} un</td>
          <td>10 anos de garantia do fabricante</td>
        </tr>
        <tr>
          <td><strong>Estrutura de Fixação</strong></td>
          <td>Alumínio anodizado e aço inox para ${formatarTipoEstrutura(sistema.tipoEstrutura)}</td>
          <td style="text-align: center;">1 conjunto</td>
          <td>10 a 12 anos contra corrosão</td>
        </tr>
        <tr>
          <td><strong>Área de Instalação</strong></td>
          <td>Aproximadamente <strong>${sistema.areaNecessariaM2} m²</strong> necessária em telhado/solo</td>
          <td style="text-align: center;">—</td>
          <td>Orientação: ${formatarOrientacao(sistema.orientacaoTelhado)}</td>
        </tr>
        ${
          sistema.codigoFiname
            ? `<tr>
          <td><strong>Código FINAME</strong></td>
          <td>${sistema.codigoFiname} (Elegível a linhas de financiamento industrial/BNDES)</td>
          <td style="text-align: center;">Sim</td>
          <td>Conforme cadastro BNDES</td>
        </tr>`
            : ''
        }
      </tbody>
    </table>

    <!-- Serviços Inclusos & Garantias -->
    <div class="services-grid">
      <div class="info-card">
        <h3><span>Serviços Inclusos na Proposta</span></h3>
        <ul class="bullet-list">
          <li><strong>Projeto Executivo e Homologação:</strong> Entrada completa, aprovação técnica e vistoria junto à concessionária (RGE).</li>
          <li><strong>Mão de Obra Qualificada:</strong> Equipe própria treinada com certificação NR-10 e NR-35.</li>
          <li><strong>Estruturas e Cabeamento:</strong> Cabos solares certificados anti-UV, eletrodutos e conectores MC4 originais.</li>
          <li><strong>Quadro de Proteção (String Box):</strong> Dispositivos DPS e disjuntores CC/CA de padrão industrial.</li>
          <li><strong>Configuração do Monitoramento:</strong> Aplicativo em smartphone e computador para acompanhar geração em tempo real.</li>
        </ul>
      </div>

      <div class="info-card">
        <h3><span>Garantias da Delfos Solar</span></h3>
        <ul class="bullet-list">
          <li><strong>Garantia de Instalação:</strong> 1 ano de garantia total da Delfos na execução da montagem e fixações.</li>
          <li><strong>Garantia dos Módulos:</strong> 12 anos contra defeitos e 25 anos de desempenho linear assegurado pelo fabricante.</li>
          <li><strong>Garantia dos Inversores:</strong> 10 anos de garantia de fábrica com suporte técnico ágil.</li>
          <li><strong>Engenheiro Responsável:</strong> ART (Anotação de Responsabilidade Técnica) recolhida por profissional habilitado.</li>
          <li><strong>Acompanhamento Pós-Venda:</strong> Análise da primeira fatura compensada para validação da homologação.</li>
        </ul>
      </div>
    </div>

    <!-- Tabela de Geração Mensal Detalhada (Janeiro a Dezembro) -->
    <div class="section-title">4. Estimativa de Geração Mensal (Janeiro a Dezembro — Erechim/RS)</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
      <table class="data-table" style="margin-bottom: 0;">
        <thead>
          <tr>
            <th>Mês</th>
            <th>HSP Diário</th>
            <th>Dias</th>
            <th>Sazonalidade</th>
            <th style="text-align: right;">Geração Estimada</th>
          </tr>
        </thead>
        <tbody>
          ${mesesLinhas}
        </tbody>
      </table>

      <!-- Resumo da Conta e Reajuste -->
      <div class="info-card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3><span>Conta com Solar & Reajuste Tarifário</span></h3>
          <div class="info-row">
            <span class="info-label">Tarifa da concessionária considerada:</span>
            <span class="info-value">${formatBRL(calculos.tarifaEfetiva)} / kWh</span>
          </div>
          <div class="info-row">
            <span class="info-label">Conta hoje sem solar:</span>
            <span class="info-value" style="color: #DC2626; font-weight: 700;">${formatBRL(calculos.contaAtualSemSolarMes)} / mês</span>
          </div>
          <div class="info-row">
            <span class="info-label">Conta no 1º mês após instalar solar:</span>
            <span class="info-value highlight-val"><strong>${formatBRL(calculos.contaPrimeiroMesComSolar)} / mês</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Economia mensal inicial estimada:</span>
            <span class="info-value highlight-val">${formatBRL(calculos.economia1Mes)} / mês</span>
          </div>
          <div class="info-row" style="border-top: 1px dashed #D1D5DB; padding-top: 4px; margin-top: 4px;">
            <span class="info-label">Reajuste tarifário histórico projetado:</span>
            <span class="info-value"><strong>9,0% ao ano</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Conta em 4 anos (sem solar vs com solar):</span>
            <span class="info-value">${formatBRL(calculos.contaSemSolar4AnosComReajuste)} ➔ <strong style="color: #16A34A;">${formatBRL(calculos.contaComSolar4AnosComReajuste)}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Conta em 10 anos (sem solar vs com solar):</span>
            <span class="info-value">${formatBRL(calculos.contaSemSolar10AnosComReajuste)} ➔ <strong style="color: #16A34A;">${formatBRL(calculos.contaComSolar10AnosComReajuste)}</strong></span>
          </div>
        </div>

        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 6px 8px; font-size: 8.5px; color: #065F46; line-height: 1.35; margin-top: 6px;">
          * A economia protege o cliente diretamente contra os sucessivos aumentos anuais da tarifa e bandeiras tarifárias da concessionária.
        </div>
      </div>
    </div>

    <!-- Simulação de Parcelamento em 4 Colunas -->
    <div class="section-title">5. Simulação de Investimento e Parcelamento</div>
    <div class="finance-grid">
      <!-- 1. À Vista -->
      <div class="finance-card highlight">
        <div>
          <div class="finance-title">${calculos.parcelamentos.aVista.titulo}</div>
          <span class="finance-badge">Melhor Retorno</span>
          <div class="finance-installment">${formatBRL(calculos.parcelamentos.aVista.valorTotal)}</div>
          <div class="finance-total">Pagamento único na aprovação/etapas</div>
        </div>
        <div class="finance-comparison">
          <div class="finance-row">
            <span>Conta sem solar:</span>
            <span style="color: #DC2626; font-weight: 700;">${formatBRL(calculos.parcelamentos.aVista.contaSemSolar)}</span>
          </div>
          <div class="finance-row">
            <span>Conta c/ solar:</span>
            <span style="color: #16A34A; font-weight: 700;">${formatBRL(calculos.parcelamentos.aVista.contaComSolar)}</span>
          </div>
          <div class="finance-row" style="font-weight: 800; color: #166534; border-top: 1px solid #D1D5DB; padding-top: 2px;">
            <span>Economia/mês:</span>
            <span>${formatBRL(calculos.parcelamentos.aVista.economiaMensalLiquida)}</span>
          </div>
        </div>
      </div>

      <!-- 2. Cartão 18x -->
      <div class="finance-card">
        <div>
          <div class="finance-title">${calculos.parcelamentos.cartao18x.titulo}</div>
          <span class="finance-badge">Cartão Crédito</span>
          <div class="finance-installment">${formatBRL(calculos.parcelamentos.cartao18x.valorParcela)}</div>
          <div class="finance-total">18 parcelas no cartão</div>
        </div>
        <div class="finance-comparison">
          <div class="finance-row">
            <span>Conta sem solar:</span>
            <span style="color: #DC2626; font-weight: 700;">${formatBRL(calculos.parcelamentos.cartao18x.contaSemSolar)}</span>
          </div>
          <div class="finance-row">
            <span>Conta c/ solar:</span>
            <span style="color: #16A34A; font-weight: 700;">${formatBRL(calculos.parcelamentos.cartao18x.contaComSolar)}</span>
          </div>
          <div class="finance-row" style="border-top: 1px solid #D1D5DB; padding-top: 2px;">
            <span>Parcela + Conta:</span>
            <span style="font-weight: 700;">${formatBRL(calculos.parcelamentos.cartao18x.desembolsoMensal)}</span>
          </div>
        </div>
      </div>

      <!-- 3. Financiamento Banco 1 (1.9% a.m.) -->
      <div class="finance-card">
        <div>
          <div class="finance-title">${calculos.parcelamentos.financiamentoBanco1.titulo}</div>
          <span class="finance-badge">Até 60x (1,90% a.m.)</span>
          <div class="finance-installment">${formatBRL(calculos.parcelamentos.financiamentoBanco1.valorParcela)}</div>
          <div class="finance-total">60 parcelas bancárias</div>
        </div>
        <div class="finance-comparison">
          <div class="finance-row">
            <span>Conta sem solar:</span>
            <span style="color: #DC2626; font-weight: 700;">${formatBRL(calculos.parcelamentos.financiamentoBanco1.contaSemSolar)}</span>
          </div>
          <div class="finance-row">
            <span>Conta c/ solar:</span>
            <span style="color: #16A34A; font-weight: 700;">${formatBRL(calculos.parcelamentos.financiamentoBanco1.contaComSolar)}</span>
          </div>
          <div class="finance-row" style="border-top: 1px solid #D1D5DB; padding-top: 2px;">
            <span>Parcela + Conta:</span>
            <span style="font-weight: 700;">${formatBRL(calculos.parcelamentos.financiamentoBanco1.desembolsoMensal)}</span>
          </div>
        </div>
      </div>

      <!-- 4. Financiamento Banco 2 (0.99% a.m.) -->
      <div class="finance-card highlight-blue">
        <div>
          <div class="finance-title">${calculos.parcelamentos.financiamentoBanco2.titulo}</div>
          <span class="finance-badge">Taxa Verde (0,99% a.m.)</span>
          <div class="finance-installment">${formatBRL(calculos.parcelamentos.financiamentoBanco2.valorParcela)}</div>
          <div class="finance-total">60 parcelas reduzidas</div>
        </div>
        <div class="finance-comparison">
          <div class="finance-row">
            <span>Conta sem solar:</span>
            <span style="color: #DC2626; font-weight: 700;">${formatBRL(calculos.parcelamentos.financiamentoBanco2.contaSemSolar)}</span>
          </div>
          <div class="finance-row">
            <span>Conta c/ solar:</span>
            <span style="color: #16A34A; font-weight: 700;">${formatBRL(calculos.parcelamentos.financiamentoBanco2.contaComSolar)}</span>
          </div>
          <div class="finance-row" style="border-top: 1px solid #D1D5DB; padding-top: 2px;">
            <span>Parcela + Conta:</span>
            <span style="font-weight: 700; color: #1E40AF;">${formatBRL(calculos.parcelamentos.financiamentoBanco2.desembolsoMensal)}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Projeção: Desperdício sem Solar vs Economia Acumulada -->
    <div class="section-title">6. Projeção: Dinheiro Desperdiçado sem Solar vs Economia Acumulada</div>
    <div class="waste-grid">
      <div class="waste-box danger">
        <div class="waste-title">⚠️ Gasto com a Concessionária SEM Solar (com reajuste 9% a.a.)</div>
        <div class="waste-row">
          <span>Gasto em 1 ano (12 meses):</span>
          <strong style="color: #B91C1C;">${formatBRL(calculos.gastoSemSolar1Ano)}</strong>
        </div>
        <div class="waste-row">
          <span>Gasto acumulado em 5 anos:</span>
          <strong style="color: #B91C1C;">${formatBRL(calculos.gastoSemSolar5Anos)}</strong>
        </div>
        <div class="waste-row">
          <span>Gasto acumulado em 10 anos:</span>
          <strong style="color: #B91C1C;">${formatBRL(calculos.gastoSemSolar10Anos)}</strong>
        </div>
        <div class="waste-row" style="border-top: 1px solid #FECACA; padding-top: 3px; margin-top: 3px;">
          <span>Gasto acumulado em 25 anos:</span>
          <strong style="color: #991B1B; font-size: 11px;">${formatBRL(calculos.gastoSemSolar25Anos)}</strong>
        </div>
      </div>

      <div class="waste-box success">
        <div class="waste-title">✅ Economia Líquida Acumulada COM Solar Delfos</div>
        <div class="waste-row">
          <span>Economia em 1 ano (12 meses):</span>
          <strong style="color: #15803D;">${formatBRL(calculos.economia1Ano)}</strong>
        </div>
        <div class="waste-row">
          <span>Economia acumulada em 5 anos:</span>
          <strong style="color: #15803D;">${formatBRL(calculos.economia5Anos)}</strong>
        </div>
        <div class="waste-row">
          <span>Economia acumulada em 10 anos:</span>
          <strong style="color: #15803D;">${formatBRL(calculos.economia10Anos)}</strong>
        </div>
        <div class="waste-row" style="border-top: 1px solid #BBF7D0; padding-top: 3px; margin-top: 3px;">
          <span>Economia acumulada em 25 anos:</span>
          <strong style="color: #166534; font-size: 11px;">${formatBRL(calculos.economia25Anos)}</strong>
        </div>
      </div>
    </div>

    ${
      dados.observacoes
        ? `<div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 10px; font-size: 9px; color: #4B5563; margin-bottom: 8px;">
        <strong>Observações do Orçamento:</strong> ${dados.observacoes}
      </div>`
        : ''
    }

    <!-- Footer da Proposta -->
    <div class="doc-footer">
      <div>
        <strong>${DADOS_EMPRESA_DELFOS_SOLAR.razaoSocial}</strong> • CNPJ ${DADOS_EMPRESA_DELFOS_SOLAR.cnpj}<br />
        ${DADOS_EMPRESA_DELFOS_SOLAR.endereco} • ${DADOS_EMPRESA_DELFOS_SOLAR.site} • Tel: ${DADOS_EMPRESA_DELFOS_SOLAR.telefone}
      </div>
      <div class="tech-resp">
        Responsável Técnico: <strong>${DADOS_EMPRESA_DELFOS_SOLAR.responsavelTecnico}</strong><br />
        <strong>${DADOS_EMPRESA_DELFOS_SOLAR.crea}</strong> • Validade: <strong>${validadeEmDias} dias corridos</strong>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Abre a proposta de energia solar em uma nova aba do navegador com renderização nativa de impressão/PDF.
 */
export function abrirPropostaSolarEmNovaAba(dados: PropostaSolarPDFInput): void {
  const html = gerarHTMLPropostaSolar(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

/**
 * Faz download do arquivo HTML estilizado da proposta solar pronto para impressão/PDF.
 */
export function baixarPropostaSolarHTML(dados: PropostaSolarPDFInput): void {
  const html = gerarHTMLPropostaSolar(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeName = dados.cliente.nome.replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `Proposta_Solar_Delfos_${safeName}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

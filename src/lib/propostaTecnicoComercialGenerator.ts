import type { CalculosSolarResultado, GeracaoMensalItem } from '@/lib/energiaSolar'

export interface FotoInstalacaoProposta {
  id: string
  titulo: string
  url: string
}

export interface PropostaTecnicoComercialDados {
  cliente: {
    nome: string
    cpfOuCnpj?: string
    endereco?: string
    municipio?: string
    email?: string
    telefone?: string
  }
  representante: {
    nome: string
    contato: string
  }
  dataProposta: string // Formatado ou ISO
  validadeDias: number // Padrão: 5 dias
  empresa: {
    razaoSocial: string
    cnpj: string
    endereco: string
    telefone: string
    email: string
    site: string
    responsavelTecnico: string
    crea: string
  }
  // Seção QUEM SOMOS: até 6 fotos selecionadas da galeria
  fotosInstalacoes: FotoInstalacaoProposta[]
  // Imagens Ilustrativas
  incluirImagemComoFunciona?: boolean
  incluirImagemMonitoramento?: boolean
  // Seção ESPECIFICAÇÕES TÉCNICAS
  sistema: {
    potenciaKwp: number
    descricaoPaineis: string
    qtdPaineis: number
    descricaoInversores: string
    qtdInversores: number
    estruturaFixacao: string
    codigoFiname?: string
    areaNecessariaM2: number
  }
  // Seção GARANTIAS (campos dinâmicos)
  garantias: {
    paineisAnosFabricacao: number
    paineisAnosDesempenho: number
    paineisPercentualDesempenho: string // ex: "80%" ou "84,8%"
    inversorAnosFabricacao: number
    instalacaoAnos: number
  }
  // Seção PRODUÇÃO DE ENERGIA & GERAÇÃO MENSAL
  producao: {
    anualKwh: number
    mediaMensalKwh: number
    geracaoMensal: GeracaoMensalItem[] // Jan a Dez
  }
  // Seção ECONOMIA ENERGÉTICA
  economia: {
    investimentoTotal: number
    prazoEntregaDias: number
    paybackTexto: string // ex: "4,2 anos (50 meses)"
  }
  // Seção SIMULAÇÃO DE PARCELAMENTO (4 colunas)
  parcelamento: {
    aVista: {
      valorTotal: number
      contaHoje: number
      contaComSolar: number
    }
    cartao18x: {
      numeroParcelas: number
      valorParcela: number
      contaHoje: number
      contaComSolar: number
    }
    financiamentoA: {
      nome: string
      numeroParcelas: number
      valorParcela: number
      contaHoje: number
      contaComSolar: number
    }
    financiamentoB: {
      nome: string
      numeroParcelas: number
      valorParcela: number
      contaHoje: number
      contaComSolar: number
    }
  }
  // Seção PROJEÇÃO DE DESPERDÍCIO X ECONOMIA ACUMULADA
  projecao: {
    gastoSemSolar1Ano: number
    gastoSemSolar5Anos: number
    gastoSemSolar25Anos: number
    economia1Ano: number
    economia5Anos: number
    economia25Anos: number
    economia1Mes: number
  }
  observacoes?: string
}

export const DADOS_FIXOS_EMPRESA_DELFOS = {
  razaoSocial: 'DELFOS ENGENHARIA LTDA',
  cnpj: '21.379.952/0001-38',
  endereco: 'Rua Espírito Santo, nº 275 – Erechim / RS',
  telefone: '(54) 99129-2121',
  email: 'contato@delfos.eng.br',
  site: 'www.delfos.eng.br',
  responsavelTecnico: 'JOÃO VICTOR BAGETTI FUCHS',
  crea: 'CREA: RS151894',
}

function formatBRL(val: number): string {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatNumBR(val: number, decimals: number = 0): string {
  return (val || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Gera o documento HTML oficial de Proposta Técnico-Comercial do CRM Delfos Solar
 * estruturado em exatamente 4 páginas de alta qualidade estética, alinhado ao
 * modelo DOCX PROPOSTA-40a14.docx, com mescla elegante de imagens e foco comercial em vendas.
 */
export function gerarHTMLPropostaTecnicoComercial(dados: PropostaTecnicoComercialDados): string {
  const {
    cliente,
    representante,
    dataProposta,
    validadeDias,
    empresa,
    fotosInstalacoes,
    incluirImagemComoFunciona,
    incluirImagemMonitoramento,
    sistema,
    garantias,
    producao,
    economia,
    parcelamento,
    projecao,
    observacoes,
  } = dados

  // Geração da grade de 12 meses Jan - Dez
  const mesesNomes = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]
  const thMeses = mesesNomes.map((m) => `<th>${m}</th>`).join('')
  const tdMeses = mesesNomes
    .map((_, idx) => {
      const item = producao.geracaoMensal.find((g) => g.mesIndex === idx)
      const val = item ? Math.round(item.geracaoKwh) : 0
      return `<td>${val.toLocaleString('pt-BR')}</td>`
    })
    .join('')

  // Galeria de usinas selecionadas (até 6 fotos em 2 linhas x 3 colunas ou 1 linha se poucas)
  const fotosValidas = (fotosInstalacoes || []).slice(0, 6)
  const galeriaHtml =
    fotosValidas.length > 0
      ? `
    <div class="galeria-section">
      <div class="sub-section-title">
        <span class="sub-dot"></span> Algumas de Nossas Obras e Usinas Entregues
      </div>
      <div class="galeria-grid ${fotosValidas.length <= 3 ? 'galeria-grid-3' : 'galeria-grid-6'}">
        ${fotosValidas
          .map(
            (foto) => `
          <div class="galeria-card">
            <div class="galeria-img-wrap">
              <img src="${foto.url}" alt="${foto.titulo}" loading="lazy" />
              <div class="galeria-badge-solar">DELFOS SOLAR</div>
            </div>
            <div class="galeria-legenda">
              <strong>${foto.titulo}</strong>
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
    </div>
    `
      : `
    <div class="galeria-empty-notice">
      <em>Instalações homologadas com equipamentos de alta tecnologia e engenharia própria nos 3 estados do Sul.</em>
    </div>
    `

  // Cabeçalho de topo reutilizável (repetido de forma consistente em cada página)
  const renderHeader = (pageNumber: number, totalPages: number = 4) => `
    <header class="page-header">
      <div class="header-brand">
        <div class="brand-symbol">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#FFFFFF" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
        </div>
        <div class="brand-text">
          <div class="brand-title">DELFOS SOLAR</div>
          <div class="brand-tagline">ENGENHARIA & SOLUÇÕES FOTOVOLTAICAS</div>
        </div>
      </div>
      <div class="header-company-info">
        <div class="company-name">${empresa.razaoSocial} • CNPJ ${empresa.cnpj}</div>
        <div class="company-meta">${empresa.endereco}</div>
        <div class="company-contacts">
          Tel: <strong>${empresa.telefone}</strong> | Email: <strong>${empresa.email}</strong> | <strong>${empresa.site}</strong>
        </div>
      </div>
    </header>
  `

  // Rodapé minimalista com paginação
  const renderFooter = (pageNumber: number, totalPages: number = 4) => `
    <footer class="page-footer">
      <div class="footer-left">
        <strong>Delfos Engenharia Solar</strong> • Soluções Técnicas de Alta Performance • Responsável: <strong>${empresa.responsavelTecnico}</strong> (${empresa.crea})
      </div>
      <div class="footer-right">
        Página <strong>${pageNumber}</strong> de <strong>${totalPages}</strong>
      </div>
    </footer>
  `

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta Técnico-Comercial - Delfos Solar - ${cliente.nome}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* ==========================================================
       RESET & BASE SETUP COM PRECISÃO DE IMPRESSÃO A4 (4 PÁGINAS)
       ========================================================== */
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #E5E7EB;
      font-family: Arial, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      color: #1F2937;
      font-size: 10.5px;
      line-height: 1.36;
    }

    /* BARRA DE AÇÃO FORA DA IMPRESSÃO */
    .no-print-bar {
      max-width: 860px;
      margin: 12px auto 8px auto;
      padding: 10px 16px;
      background: #064E3B;
      color: #FFFFFF;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 14px rgba(6, 78, 59, 0.25);
    }
    .no-print-bar-info strong {
      font-size: 13px;
      display: block;
      color: #ECFDF5;
    }
    .no-print-bar-info span {
      font-size: 10.5px;
      color: #A7F3D0;
    }
    .no-print-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-action-print {
      background: #16A34A;
      color: #FFFFFF;
      border: none;
      padding: 7px 16px;
      font-size: 11.5px;
      font-weight: 800;
      border-radius: 7px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s ease, transform 0.1s ease;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
    }
    .btn-action-print:hover {
      background: #15803D;
      transform: translateY(-1px);
    }

    /* CONTÊINER DE FOLHAS A4 (CADA PÁGINA É UMA FOLHA INDEPENDENTE) */
    .proposta-container {
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      padding-bottom: 20px;
    }

    .proposta-page {
      background: #FFFFFF;
      width: 100%;
      min-height: 297mm;
      padding: 9mm 12mm 8mm 12mm;
      margin: 0 auto 16px auto;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 4px;
    }

    .page-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* CABEÇALHO RECORRENTE DA MARCA DELFOS */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #16A34A;
      padding-bottom: 6px;
      margin-bottom: 8px;
      gap: 10px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-symbol {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      background: linear-gradient(135deg, #166534 0%, #16A34A 50%, #EAB308 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 5px rgba(22, 163, 74, 0.35);
      flex-shrink: 0;
    }
    .brand-title {
      font-size: 17px;
      font-weight: 900;
      color: #064E3B;
      letter-spacing: -0.01em;
      line-height: 1.1;
    }
    .brand-tagline {
      font-size: 8.5px;
      font-weight: 800;
      color: #16A34A;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-top: 1px;
    }
    .header-company-info {
      text-align: right;
      font-size: 9px;
      color: #4B5563;
      line-height: 1.3;
    }
    .header-company-info .company-name {
      font-weight: 800;
      color: #111827;
      font-size: 9.5px;
    }
    .header-company-info strong {
      color: #166534;
    }

    /* RODAPÉ RECORRENTE */
    .page-footer {
      border-top: 1px solid #D1D5DB;
      padding-top: 6px;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5px;
      color: #6B7280;
    }
    .page-footer strong {
      color: #111827;
    }
    .page-footer .footer-right {
      font-weight: 700;
      color: #166534;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      padding: 2px 7px;
      border-radius: 4px;
    }

    /* BANNER DE TÍTULO PRINCIPAL (PÁGINA 1) */
    .banner-titulo-proposta {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4.5px solid #166534;
      border-radius: 7px;
      padding: 7px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .banner-titulo-proposta h1 {
      margin: 0;
      font-size: 14px;
      font-weight: 900;
      color: #064E3B;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      line-height: 1.15;
    }
    .banner-titulo-proposta p {
      margin: 2px 0 0 0;
      font-size: 9.5px;
      color: #047857;
      font-weight: 600;
    }
    .banner-tag-emissao {
      text-align: right;
      font-size: 9px;
      color: #065F46;
      background: #DCFCE7;
      border: 1px solid #86EFAC;
      padding: 4px 8px;
      border-radius: 5px;
      white-space: nowrap;
      font-weight: 700;
      line-height: 1.3;
    }

    /* SEÇÃO COM CABEÇALHO PADRÃO ESTILO DOCX */
    .section-header-docx {
      background: linear-gradient(90deg, #F0FDF4 0%, #FFFFFF 100%);
      border-left: 3.5px solid #16A34A;
      border-bottom: 1px solid #DCFCE7;
      padding: 4px 8px;
      margin: 7px 0 6px 0;
      font-size: 11px;
      font-weight: 900;
      color: #064E3B;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-header-docx .sq-bullet {
      color: #16A34A;
      font-size: 12px;
    }

    /* GRID CLIENTE & REPRESENTANTE (PÁGINA 1) */
    .meta-cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 7px;
    }
    .meta-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 7px;
      padding: 6px 10px;
      font-size: 10px;
    }
    .meta-card-title {
      font-size: 9.5px;
      font-weight: 900;
      color: #166534;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px dashed #D1D5DB;
      padding-bottom: 3px;
      margin-bottom: 4px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      line-height: 1.3;
    }
    .meta-row span.label {
      color: #6B7280;
      font-weight: 600;
    }
    .meta-row span.val {
      font-weight: 700;
      color: #111827;
      text-align: right;
    }
    .meta-row span.val-accent {
      color: #16A34A;
      font-weight: 800;
    }

    /* QUEM SOMOS (PÁGINA 1) */
    .about-lead {
      font-size: 10px;
      color: #374151;
      text-align: justify;
      margin-bottom: 6px;
      line-height: 1.38;
    }
    .about-lead strong {
      color: #064E3B;
    }
    .about-bullets-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 10px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 7px;
      padding: 6px 10px;
      margin-bottom: 7px;
    }
    .about-bullet-item {
      font-size: 9.5px;
      color: #1F2937;
      display: flex;
      align-items: flex-start;
      gap: 5px;
      line-height: 1.3;
    }
    .about-bullet-item .check-icon {
      color: #16A34A;
      font-weight: 900;
      font-size: 11px;
      line-height: 1;
      margin-top: 1px;
    }

    /* GALERIA DE INSTALAÇÕES (PÁGINA 1) */
    .galeria-section {
      margin-top: 4px;
    }
    .sub-section-title {
      font-size: 10px;
      font-weight: 800;
      color: #166534;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 5px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .sub-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #16A34A;
      display: inline-block;
    }
    .galeria-grid {
      display: grid;
      gap: 6px;
    }
    .galeria-grid-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    .galeria-grid-6 {
      grid-template-columns: repeat(3, 1fr);
    }
    .galeria-card {
      background: #FFFFFF;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .galeria-img-wrap {
      width: 100%;
      height: 78px;
      background: #F3F4F6;
      position: relative;
      overflow: hidden;
    }
    .galeria-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .galeria-badge-solar {
      position: absolute;
      top: 3px;
      right: 3px;
      font-size: 7px;
      font-weight: 800;
      background: rgba(6, 78, 59, 0.85);
      color: #FFFFFF;
      padding: 1px 4px;
      border-radius: 3px;
      letter-spacing: 0.04em;
    }
    .galeria-legenda {
      padding: 3px 5px;
      font-size: 8.5px;
      font-weight: 800;
      color: #111827;
      text-align: center;
      background: #FAFAFA;
      border-top: 1px solid #E5E7EB;
      min-height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1.2;
    }

    /* PÁGINA 2: IMAGENS ILUSTRATIVAS, ESPECIFICAÇÕES & SERVIÇOS */
    .ilustrativas-duas-colunas {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 7px;
    }
    .ilustrativa-card {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 7px;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .ilustrativa-header-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #065F46;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .ilustrativa-img-box {
      width: 100%;
      height: 104px;
      border-radius: 5px;
      overflow: hidden;
      border: 1px solid #D1D5DB;
      background: #FFFFFF;
      margin-bottom: 5px;
    }
    .ilustrativa-img-box img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .ilustrativa-texto-desc {
      font-size: 9px;
      color: #374151;
      line-height: 1.32;
      text-align: justify;
    }

    /* CARDS RESUMO POTÊNCIA / ÁREA (PÁGINA 2) */
    .potencia-banner {
      background: linear-gradient(135deg, #065F46 0%, #166534 100%);
      color: #FFFFFF;
      border-radius: 7px;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    .potencia-banner-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .potencia-banner-number {
      font-size: 16px;
      font-weight: 900;
      color: #FACC15;
    }

    /* TABELA DE ESPECIFICAÇÕES TÉCNICAS */
    .tabela-tecnica {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 9.5px;
    }
    .tabela-tecnica th {
      background: #064E3B;
      color: #FFFFFF;
      padding: 5px 8px;
      font-weight: 800;
      text-align: left;
      font-size: 9.5px;
      text-transform: uppercase;
      border: 1px solid #064E3B;
    }
    .tabela-tecnica td {
      border: 1px solid #D1D5DB;
      padding: 5px 8px;
      color: #374151;
      line-height: 1.3;
    }
    .tabela-tecnica tr:nth-child(even) td {
      background: #F9FAFB;
    }
    .tabela-tecnica td.highlight-qtd {
      font-weight: 800;
      color: #166534;
      text-align: center;
      background: #F0FDF4;
    }

    .especificacoes-meta-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 5px;
      padding: 5px 8px;
      font-size: 9.5px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    .especificacoes-meta-box strong {
      color: #111827;
    }

    /* SERVIÇOS INCLUSOS */
    .servicos-inclusos-box {
      background: #FAFAFA;
      border: 1px solid #E5E7EB;
      border-radius: 7px;
      padding: 6px 10px;
      margin-bottom: 4px;
    }
    .servicos-inclusos-list {
      margin: 0;
      padding-left: 16px;
      font-size: 9px;
      color: #374151;
    }
    .servicos-inclusos-list li {
      margin-bottom: 2.5px;
      line-height: 1.32;
    }
    .servicos-inclusos-list li strong {
      color: #064E3B;
    }

    /* PÁGINA 3: GARANTIAS, PRODUÇÃO DE ENERGIA & INVESTIMENTO / PAYBACK */
    .garantias-cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 5px;
    }
    .garantia-card {
      background: #FFFFFF;
      border: 1.5px solid #BBF7D0;
      border-top: 3px solid #16A34A;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
    }
    .garantia-card-tipo {
      font-size: 8.5px;
      font-weight: 800;
      color: #065F46;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }
    .garantia-card-tempo {
      font-size: 13px;
      font-weight: 900;
      color: #166534;
      line-height: 1.1;
    }
    .garantia-card-sub {
      font-size: 8px;
      color: #4B5563;
      margin-top: 2px;
    }
    .garantias-nota {
      font-size: 8.5px;
      color: #6B7280;
      font-style: italic;
      margin-bottom: 8px;
      padding-left: 2px;
    }

    /* PRODUÇÃO E TABELA 12 MESES */
    .producao-resumo-banner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 6px;
    }
    .producao-pill {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .producao-pill-label {
      font-size: 9px;
      font-weight: 700;
      color: #166534;
      text-transform: uppercase;
    }
    .producao-pill-val {
      font-size: 13px;
      font-weight: 900;
      color: #065F46;
    }

    .tabela-meses-wrap {
      margin-bottom: 8px;
    }
    .tabela-meses {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      font-size: 9px;
    }
    .tabela-meses th {
      background: #065F46;
      color: #FFFFFF;
      padding: 4px 2px;
      font-weight: 800;
      border: 1px solid #065F46;
      text-transform: uppercase;
      font-size: 8.5px;
    }
    .tabela-meses td {
      border: 1px solid #D1D5DB;
      padding: 5px 2px;
      font-weight: 700;
      color: #166534;
      background: #FFFFFF;
    }
    .tabela-meses tr td.label-kwh {
      background: #F3F4F6;
      font-weight: 800;
      color: #111827;
      padding: 5px 3px;
    }

    /* DESTAQUE HERO DE INVESTIMENTO & PAYBACK (VENDA) */
    .investimento-hero-card {
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      border: 1.5px solid #10B981;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 3px;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.12);
      position: relative;
    }
    .investimento-hero-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #A7F3D0;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .investimento-hero-title {
      font-size: 10.5px;
      font-weight: 900;
      color: #065F46;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .investimento-hero-prazo {
      font-size: 9.5px;
      font-weight: 700;
      color: #047857;
      background: #FFFFFF;
      border: 1px solid #86EFAC;
      padding: 2.5px 7px;
      border-radius: 5px;
    }
    .investimento-valores-row {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 12px;
      align-items: center;
    }
    .valor-total-destaque-box {
      border-right: 1px dashed #6EE7B7;
      padding-right: 10px;
    }
    .valor-total-label {
      font-size: 9.5px;
      font-weight: 800;
      color: #047857;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .valor-total-big {
      font-size: 23px;
      font-weight: 900;
      color: #064E3B;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .valor-total-sub {
      font-size: 9px;
      color: #047857;
      font-weight: 600;
      margin-top: 3px;
    }
    .payback-destaque-box {
      text-align: center;
      background: #FFFFFF;
      border: 1px solid #86EFAC;
      border-radius: 7px;
      padding: 6px 10px;
    }
    .payback-label {
      font-size: 9px;
      font-weight: 800;
      color: #065F46;
      text-transform: uppercase;
    }
    .payback-number {
      font-size: 16px;
      font-weight: 900;
      color: #16A34A;
      margin: 1px 0;
    }
    .payback-note {
      font-size: 8px;
      color: #6B7280;
    }

    /* PÁGINA 4: SIMULAÇÃO DE PARCELAMENTO, PROJEÇÃO DE ECONOMIA & ASSINATURA */
    .parcelamento-grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 3px;
    }
    .parc-card {
      border: 1.5px solid #D1D5DB;
      border-radius: 7px;
      background: #FFFFFF;
      padding: 6px 5px;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .parc-card.card-destaque-verde {
      border-color: #16A34A;
      background: #F0FDF4;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.12);
    }
    .parc-card.card-destaque-azul {
      border-color: #2563EB;
      background: #EFF6FF;
    }
    .parc-card-top-tag {
      font-size: 7.5px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 1.5px 5px;
      border-radius: 3px;
      margin-bottom: 3px;
      display: inline-block;
      background: #E5E7EB;
      color: #374151;
    }
    .card-destaque-verde .parc-card-top-tag {
      background: #16A34A;
      color: #FFFFFF;
    }
    .card-destaque-azul .parc-card-top-tag {
      background: #2563EB;
      color: #FFFFFF;
    }
    .parc-col-titulo {
      font-size: 9.5px;
      font-weight: 900;
      color: #111827;
      text-transform: uppercase;
      margin-bottom: 3px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 2px;
    }
    .parc-col-valor-principal {
      font-size: 12.5px;
      font-weight: 900;
      color: #065F46;
      margin: 3px 0 1px 0;
      line-height: 1.15;
    }
    .parc-col-sub {
      font-size: 8px;
      color: #6B7280;
      margin-bottom: 4px;
    }
    .parc-contas-box {
      border-top: 1px dashed #D1D5DB;
      padding-top: 4px;
      margin-top: 3px;
      font-size: 8px;
      color: #4B5563;
      text-align: left;
      line-height: 1.3;
    }
    .parc-contas-box .row-conta {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
    }
    .parc-contas-box .row-conta strong {
      color: #111827;
    }
    .parc-contas-box .row-conta strong.accent-solar {
      color: #166534;
      font-weight: 900;
    }

    .nota-parcelamento-legal {
      font-size: 7.5px;
      color: #6B7280;
      font-style: italic;
      margin: 2px 0 6px 0;
    }

    /* TABELA DE PROJEÇÃO DE DESPERDÍCIO X ECONOMIA */
    .tabela-projecao-venda {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 6px;
      font-size: 9.5px;
    }
    .tabela-projecao-venda th {
      background: #064E3B;
      color: #FFFFFF;
      padding: 5px 8px;
      font-weight: 800;
      text-align: left;
      font-size: 9.5px;
      text-transform: uppercase;
      border: 1px solid #064E3B;
    }
    .tabela-projecao-venda td {
      border: 1px solid #D1D5DB;
      padding: 5px 8px;
      line-height: 1.3;
    }
    .td-sem-solar-perda {
      color: #DC2626;
      font-weight: 800;
      background: #FEF2F2;
    }
    .td-com-solar-ganho {
      color: #166534;
      font-weight: 800;
      background: #F0FDF4;
    }

    /* BANNER DE IMPACTO TOTAL 25 ANOS (VENDA AGRESSIVA & CLARA) */
    .banner-impacto-25anos {
      background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
      border: 1.5px solid #F59E0B;
      border-radius: 7px;
      padding: 7px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 7px;
    }
    .impacto-total-texto strong {
      font-size: 11.5px;
      color: #78350F;
      display: block;
      font-weight: 900;
      text-transform: uppercase;
    }
    .impacto-total-texto span {
      font-size: 9px;
      color: #92400E;
    }
    .impacto-perda-mes {
      background: #FFFFFF;
      border: 1px solid #FCD34D;
      border-radius: 5px;
      padding: 4px 8px;
      text-align: right;
    }
    .impacto-perda-mes-label {
      font-size: 8px;
      font-weight: 700;
      color: #92400E;
      text-transform: uppercase;
    }
    .impacto-perda-mes-val {
      font-size: 13px;
      font-weight: 900;
      color: #DC2626;
    }

    /* TERMO DE ACEITE & ASSINATURA */
    .aceite-aprovacao-grid {
      border-top: 2px solid #16A34A;
      padding-top: 7px;
      margin-top: 4px;
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 12px;
      font-size: 9px;
      color: #374151;
    }
    .validade-responsabilidade-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 6px 8px;
      line-height: 1.35;
    }
    .validade-responsabilidade-box strong {
      color: #111827;
    }
    .assinatura-cliente-box {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      text-align: center;
      padding: 4px;
    }
    .linha-assinatura {
      width: 85%;
      border-bottom: 1.5px solid #111827;
      margin-bottom: 5px;
    }
    .assinatura-nome-cliente {
      font-size: 10px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
    }
    .assinatura-doc-cliente {
      font-size: 8.5px;
      color: #6B7280;
    }

    /* ==========================================================
       REGRAS DE IMPRESSÃO / PDF NATIVO (PAGE BREAKS ESTRITOS)
       ========================================================== */
    @media print {
      html, body {
        background: #FFFFFF !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .proposta-container {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .proposta-page {
        margin: 0 !important;
        padding: 7mm 9mm 7mm 9mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
        height: 297mm !important;
        max-height: 297mm !important;
        overflow: hidden !important;
      }
      .proposta-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>

  <!-- BARRA DE AÇÃO SUPERIOR (APENAS NA VISUALIZAÇÃO EM TELA) -->
  <div class="no-print-bar">
    <div class="no-print-bar-info">
      <strong>Proposta Técnico-Comercial Delfos Solar (4 Páginas Oficiais)</strong>
      <span>Layout de alto impacto para vendas • Fiel ao documento de referência DOCX • Pronto para PDF ou impressão</span>
    </div>
    <div class="no-print-actions">
      <button class="btn-action-print" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Salvar em PDF / Imprimir (4 Páginas)
      </button>
    </div>
  </div>

  <div class="proposta-container">

    <!-- ========================================================
         PÁGINA 1: CABEÇALHO + CLIENTE/REPRESENTANTE + QUEM SOMOS + GALERIA
         ======================================================== -->
    <section class="proposta-page" id="pagina-1">
      <div class="page-body">
        ${renderHeader(1, 4)}

        <div class="banner-titulo-proposta">
          <div>
            <h1>PROPOSTA TÉCNICO - COMERCIAL</h1>
            <p>Engenharia fotovoltaica de precisão, homologação completa e rentabilidade sustentável</p>
          </div>
          <div class="banner-tag-emissao">
            Data: <strong>${dataProposta}</strong><br />
            Validade: <strong>${validadeDias} dias corridos</strong>
          </div>
        </div>

        <!-- Dados do Cliente e Representante -->
        <div class="meta-cards-grid">
          <div class="meta-card">
            <div class="meta-card-title">1. Dados do Cliente / Contratante</div>
            <div class="meta-row">
              <span class="label">Cliente:</span>
              <span class="val">${cliente.nome}</span>
            </div>
            ${
              cliente.cpfOuCnpj
                ? `<div class="meta-row"><span class="label">CPF/CNPJ:</span><span class="val">${cliente.cpfOuCnpj}</span></div>`
                : ''
            }
            ${
              cliente.endereco
                ? `<div class="meta-row"><span class="label">Endereço:</span><span class="val">${cliente.endereco}</span></div>`
                : ''
            }
            ${
              cliente.municipio
                ? `<div class="meta-row"><span class="label">Município:</span><span class="val">${cliente.municipio}</span></div>`
                : ''
            }
            ${
              cliente.telefone || cliente.email
                ? `<div class="meta-row"><span class="label">Contato:</span><span class="val">${[cliente.telefone, cliente.email].filter(Boolean).join(' • ')}</span></div>`
                : ''
            }
          </div>

          <div class="meta-card">
            <div class="meta-card-title">2. Atendimento & Responsáveis</div>
            <div class="meta-row">
              <span class="label">Representante Comercial:</span>
              <span class="val-accent">${representante.nome}</span>
            </div>
            <div class="meta-row">
              <span class="label">Contato Comercial:</span>
              <span class="val">${representante.contato}</span>
            </div>
            <div class="meta-row">
              <span class="label">Responsável Técnico:</span>
              <span class="val">${empresa.responsavelTecnico}</span>
            </div>
            <div class="meta-row">
              <span class="label">Registro Profissional:</span>
              <span class="val">${empresa.crea}</span>
            </div>
            <div class="meta-row">
              <span class="label">Prazo de Entrega:</span>
              <span class="val-accent">${economia.prazoEntregaDias} dias corridos</span>
            </div>
          </div>
        </div>

        <!-- Seção Quem Somos -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> QUEM SOMOS
        </div>
        <div class="about-lead">
          A <strong>Delfos Solar</strong> é especialista em transformar contas de energia em ativos que geram retorno mensal e segurança patrimonial. Com uma trajetória consolidada e equipe técnica própria, entregamos soluções sob medida com máxima eficiência e confiabilidade operacional:
        </div>

        <div class="about-bullets-grid">
          <div class="about-bullet-item">
            <span class="check-icon">✓</span>
            <div><strong>12 Anos de Atuação:</strong> Experiência consolidada e solidez no mercado de energia solar.</div>
          </div>
          <div class="about-bullet-item">
            <span class="check-icon">✓</span>
            <div><strong>Mais de 2.500 Projetos:</strong> Usinas entregues, homologadas e gerando energia limpa.</div>
          </div>
          <div class="about-bullet-item">
            <span class="check-icon">✓</span>
            <div><strong>Presença Regional:</strong> Atuação forte nos 3 estados do Sul (RS, SC e PR).</div>
          </div>
          <div class="about-bullet-item">
            <span class="check-icon">✓</span>
            <div><strong>Engenharia Própria:</strong> Projetos customizados e homologação direta junto à concessionária.</div>
          </div>
          <div class="about-bullet-item" style="grid-column: span 2;">
            <span class="check-icon">✓</span>
            <div><strong>Pós-Vendas Estruturado:</strong> Monitoramento ativo de usinas, preventiva, relatórios e suporte técnico especializado.</div>
          </div>
        </div>

        <!-- Galeria de Fotos de Instalações -->
        ${galeriaHtml}
      </div>

      ${renderFooter(1, 4)}
    </section>

    <!-- ========================================================
         PÁGINA 2: IMAGENS ILUSTRATIVAS + ESPECIFICAÇÕES TÉCNICAS + SERVIÇOS INCLUSOS
         ======================================================== -->
    <section class="proposta-page" id="pagina-2">
      <div class="page-body">
        ${renderHeader(2, 4)}

        <!-- Imagens Ilustrativas: Como Funciona & Monitoramento -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> FUNCIONAMENTO DO SISTEMA & MONITORAMENTO INTELIGENTE
        </div>

        <div class="ilustrativas-duas-colunas">
          ${
            incluirImagemComoFunciona !== false
              ? `
          <div class="ilustrativa-card">
            <div class="ilustrativa-header-title">COMO FUNCIONA O SISTEMA SOLAR ON-GRID</div>
            <div class="ilustrativa-img-box">
              <img src="https://img.usecurling.com/p/800/450?q=solar+energy+system+diagram&color=teal" alt="Como Funciona o Sistema Solar On-Grid" />
            </div>
            <div class="ilustrativa-texto-desc">
              <strong>Geração Fotovoltaica Conectada à Rede:</strong> Os módulos captam a radiação solar e convertem em energia elétrica contínua. O inversor transforma em corrente alternada para o consumo do imóvel. O excedente produzido é injetado diretamente na rede da concessionária, gerando créditos energéticos compensáveis.
            </div>
          </div>
          `
              : ''
          }

          ${
            incluirImagemMonitoramento !== false
              ? `
          <div class="ilustrativa-card">
            <div class="ilustrativa-header-title">MONITORAMENTO EM TEMPO REAL</div>
            <div class="ilustrativa-img-box">
              <img src="https://img.usecurling.com/p/800/450?q=solar+app+dashboard+graph&color=green" alt="Monitoramento do Sistema Solar" />
            </div>
            <div class="ilustrativa-texto-desc">
              <strong>Acompanhamento na Palma da Mão:</strong> O sistema de monitoramento permite ao usuário acessar remotamente o desempenho do seu gerador via smartphone e computador. Visualize a geração diária, economia acumulada e alertas automáticos em tempo real.
            </div>
          </div>
          `
              : ''
          }
        </div>

        <!-- Especificações Técnicas do Sistema -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> ESPECIFICAÇÕES TÉCNICAS DO SISTEMA
        </div>

        <div class="potencia-banner">
          <div>
            <div class="potencia-banner-title">GERADOR FOTOVOLTAICO PROJETADO</div>
            <div style="font-size: 10px; color: #D1FAE5; margin-top: 1px;">Alta performance com módulos Tier-1 e inversor de última geração</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; color: #A7F3D0;">Potência Total</div>
            <div class="potencia-banner-number">${formatNumBR(sistema.potenciaKwp, 2)} kWp</div>
          </div>
        </div>

        <table class="tabela-tecnica">
          <thead>
            <tr>
              <th style="width: 28%;">Componente</th>
              <th style="width: 52%;">Descrição Técnica dos Equipamentos</th>
              <th style="width: 20%; text-align: center;">Quantidade</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Módulos Fotovoltaicos</strong></td>
              <td>${sistema.descricaoPaineis}</td>
              <td class="highlight-qtd">${sistema.qtdPaineis} unid.</td>
            </tr>
            <tr>
              <td><strong>Inversor(es) Solar(es)</strong></td>
              <td>${sistema.descricaoInversores}</td>
              <td class="highlight-qtd">${sistema.qtdInversores} unid.</td>
            </tr>
            <tr>
              <td><strong>Estrutura de Fixação</strong></td>
              <td>${sistema.estruturaFixacao}</td>
              <td class="highlight-qtd">1 Conjunto Completo</td>
            </tr>
          </tbody>
        </table>

        <div class="especificacoes-meta-box">
          <div>
            Código FINAME / CFI: <strong>${sistema.codigoFiname || 'Sob consulta (elegível BNDES)'}</strong>
          </div>
          <div>
            Área necessária estimada para instalação: <strong>${formatNumBR(sistema.areaNecessariaM2, 1)} m²</strong>
          </div>
        </div>

        <!-- Serviços Inclusos -->
        <div class="section-header-docx" style="margin-top: 12px;">
          <span class="sq-bullet">■</span> SERVIÇOS INCLUSOS
        </div>
        <div class="servicos-inclusos-box">
          <ul class="servicos-inclusos-list">
            <li><strong>Projeto e Homologação:</strong> Elaboração do projeto fotovoltaico executivo e homologação completa junto à concessionária de energia;</li>
            <li><strong>Instalação Completa:</strong> Execução técnica por equipe própria, contemplando módulos, estruturas de fixação, inversor, passagem e organização dos cabos solares anti-UV, dispositivos de proteção CC/CA (String Box) e aterramento do gerador;</li>
            <li><strong>Comissionamento & Orientação:</strong> Configuração inicial do sistema de monitoramento via aplicativo e suporte ao cliente para acompanhamento da geração de energia;</li>
            <li><strong>Responsabilidade Técnica (ART):</strong> Registro emitido por Engenheiro responsável credenciado junto ao CREA.</li>
          </ul>
        </div>
      </div>

      ${renderFooter(2, 4)}
    </section>

    <!-- ========================================================
         PÁGINA 3: GARANTIAS + PRODUÇÃO DE ENERGIA (TABELA 12 MESES) + INVESTIMENTO / PAYBACK
         ======================================================== -->
    <section class="proposta-page" id="pagina-3">
      <div class="page-body">
        ${renderHeader(3, 4)}

        <!-- Garantias -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> GARANTIAS ASSEGURADAS
        </div>

        <div class="garantias-cards-grid">
          <div class="garantia-card">
            <div class="garantia-card-tipo">PAINÉIS SOLARES</div>
            <div class="garantia-card-tempo">${garantias.paineisAnosFabricacao} ANOS</div>
            <div class="garantia-card-sub">Contra defeitos de fabricação</div>
            <div style="font-size: 8.5px; font-weight: 800; color: #166534; margin-top: 3px;">
              + ${garantias.paineisAnosDesempenho} anos (${garantias.paineisPercentualDesempenho} de rendimento)
            </div>
          </div>

          <div class="garantia-card">
            <div class="garantia-card-tipo">INVERSOR SOLAR</div>
            <div class="garantia-card-tempo">${garantias.inversorAnosFabricacao} ANOS</div>
            <div class="garantia-card-sub">Garantia padrão de fábrica</div>
            <div style="font-size: 8.5px; font-weight: 800; color: #166534; margin-top: 3px;">
              Assistência técnica ágil
            </div>
          </div>

          <div class="garantia-card">
            <div class="garantia-card-tipo">INSTALAÇÃO DELFOS</div>
            <div class="garantia-card-tempo">${garantias.instalacaoAnos} ANO</div>
            <div class="garantia-card-sub">Garantia integral sobre os serviços</div>
            <div style="font-size: 8.5px; font-weight: 800; color: #166534; margin-top: 3px;">
              Padrão de engenharia Delfos
            </div>
          </div>
        </div>

        <div class="garantias-nota">
          * OBS: Não são cobertas as garantias de peças ou componentes por desgaste natural, como disjuntores e DPS.
        </div>

        <!-- Produção de Energia -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> PRODUÇÃO ESTIMADA DE ENERGIA
        </div>

        <div class="producao-resumo-banner">
          <div class="producao-pill">
            <span class="producao-pill-label">Produção Anual Estimada:</span>
            <span class="producao-pill-val">${formatNumBR(producao.anualKwh, 0)} kWh/ano</span>
          </div>
          <div class="producao-pill">
            <span class="producao-pill-label">Geração Média Mensal:</span>
            <span class="producao-pill-val">${formatNumBR(producao.mediaMensalKwh, 0)} kWh/mês</span>
          </div>
        </div>

        <!-- Tabela Mensal Jan a Dez -->
        <div class="tabela-meses-wrap">
          <table class="tabela-meses">
            <thead>
              <tr>
                <th style="width: 10%;">Mês</th>
                ${thMeses}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="label-kwh">kWh</td>
                ${tdMeses}
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Investimento & Payback (Hero de Venda) -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> SUA PROPOSTA DE ECONOMIA ENERGÉTICA
        </div>

        <div class="investimento-hero-card">
          <div class="investimento-hero-header">
            <div class="investimento-hero-title">INVESTIMENTO TOTAL COM ENGENHARIA DELFOS</div>
            <div class="investimento-hero-prazo">
              Prazo de entrega: até <strong>${economia.prazoEntregaDias} dias</strong> após pedido
            </div>
          </div>

          <div class="investimento-valores-row">
            <div class="valor-total-destaque-box">
              <div class="valor-total-label">Valor Total do Projeto Turnkey:</div>
              <div class="valor-total-big">${formatBRL(economia.investimentoTotal)}</div>
              <div class="valor-total-sub">
                ✓ Economia imediata já a partir do 1º mês na sua conta de energia.
              </div>
            </div>

            <div class="payback-destaque-box">
              <div class="payback-label">Tempo de Retorno do Investimento (Payback)</div>
              <div class="payback-number">${economia.paybackTexto}</div>
              <div class="payback-note">Após esse período, toda a geração torna-se lucro líquido direto.</div>
            </div>
          </div>
        </div>

        ${
          observacoes
            ? `
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 7px 10px; font-size: 9.5px; color: #4B5563; margin-top: 10px;">
          <strong>Observações Técnicas / Comerciais:</strong> ${observacoes}
        </div>
        `
            : ''
        }
      </div>

      ${renderFooter(3, 4)}
    </section>

    <!-- ========================================================
         PÁGINA 4: SIMULAÇÃO DE PARCELAMENTO + PROJEÇÃO DE ECONOMIA + TERMO DE ACEITE
         ======================================================== -->
    <section class="proposta-page" id="pagina-4">
      <div class="page-body">
        ${renderHeader(4, 4)}

        <!-- Simulação de Parcelamento em 4 Colunas -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> SIMULAÇÃO DE PARCELAMENTO E CONDIÇÕES COMERCIAIS
        </div>

        <div class="parcelamento-grid-4">
          <!-- Coluna 1: À Vista -->
          <div class="parc-card card-destaque-verde">
            <div>
              <span class="parc-card-top-tag">Maior Economia</span>
              <div class="parc-col-titulo">À VISTA</div>
              <div class="parc-col-valor-principal">${formatBRL(parcelamento.aVista.valorTotal)}</div>
              <div class="parc-col-sub">Parcela única na contratação</div>
            </div>
            <div class="parc-contas-box">
              <div class="row-conta">
                <span>Conta hoje:</span>
                <strong>${formatBRL(parcelamento.aVista.contaHoje)}</strong>
              </div>
              <div class="row-conta">
                <span>Conta c/ solar*:</span>
                <strong class="accent-solar">${formatBRL(parcelamento.aVista.contaComSolar)}</strong>
              </div>
            </div>
          </div>

          <!-- Coluna 2: Cartão 18x -->
          <div class="parc-card">
            <div>
              <span class="parc-card-top-tag">Sem Burocracia</span>
              <div class="parc-col-titulo">CARTÃO 18X</div>
              <div class="parc-col-valor-principal">
                ${parcelamento.cartao18x.numeroParcelas}x de ${formatBRL(parcelamento.cartao18x.valorParcela)}
              </div>
              <div class="parc-col-sub">Direto no cartão de crédito</div>
            </div>
            <div class="parc-contas-box">
              <div class="row-conta">
                <span>Conta hoje:</span>
                <strong>${formatBRL(parcelamento.cartao18x.contaHoje)}</strong>
              </div>
              <div class="row-conta">
                <span>Conta c/ solar*:</span>
                <strong class="accent-solar">${formatBRL(parcelamento.cartao18x.contaComSolar)}</strong>
              </div>
            </div>
          </div>

          <!-- Coluna 3: Financiamento A -->
          <div class="parc-card">
            <div>
              <span class="parc-card-top-tag">Sem Entrada</span>
              <div class="parc-col-titulo">${parcelamento.financiamentoA.nome}</div>
              <div class="parc-col-valor-principal">
                ${parcelamento.financiamentoA.numeroParcelas}x de ${formatBRL(parcelamento.financiamentoA.valorParcela)}
              </div>
              <div class="parc-col-sub">Linha bancária facilitada</div>
            </div>
            <div class="parc-contas-box">
              <div class="row-conta">
                <span>Conta hoje:</span>
                <strong>${formatBRL(parcelamento.financiamentoA.contaHoje)}</strong>
              </div>
              <div class="row-conta">
                <span>Conta c/ solar*:</span>
                <strong class="accent-solar">${formatBRL(parcelamento.financiamentoA.contaComSolar)}</strong>
              </div>
            </div>
          </div>

          <!-- Coluna 4: Financiamento B -->
          <div class="parc-card card-destaque-azul">
            <div>
              <span class="parc-card-top-tag">Menor Parcela</span>
              <div class="parc-col-titulo">${parcelamento.financiamentoB.nome}</div>
              <div class="parc-col-valor-principal">
                ${parcelamento.financiamentoB.numeroParcelas}x de ${formatBRL(parcelamento.financiamentoB.valorParcela)}
              </div>
              <div class="parc-col-sub">Prazo estendido</div>
            </div>
            <div class="parc-contas-box">
              <div class="row-conta">
                <span>Conta hoje:</span>
                <strong>${formatBRL(parcelamento.financiamentoB.contaHoje)}</strong>
              </div>
              <div class="row-conta">
                <span>Conta c/ solar*:</span>
                <strong class="accent-solar">${formatBRL(parcelamento.financiamentoB.contaComSolar)}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="nota-parcelamento-legal">
          * Valores estimados. A conta com energia solar pode variar conforme consumo excedente, custo de disponibilidade/taxa mínima da concessionária e taxa de iluminação pública.
        </div>

        <!-- Projeção de Desperdício x Economia Acumulada -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> PROJEÇÃO DE DESPERDÍCIO X ECONOMIA ACUMULADA
        </div>

        <table class="tabela-projecao-venda">
          <thead>
            <tr>
              <th style="width: 25%;">Período</th>
              <th style="width: 37.5%;">Sem Energia Solar (Desperdício)</th>
              <th style="width: 37.5%;">Com Energia Solar Delfos</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1 ano</strong></td>
              <td class="td-sem-solar-perda">${formatBRL(projecao.gastoSemSolar1Ano)} jogados fora</td>
              <td class="td-com-solar-ganho">${formatBRL(projecao.economia1Ano)} economizados</td>
            </tr>
            <tr>
              <td><strong>5 anos</strong></td>
              <td class="td-sem-solar-perda">${formatBRL(projecao.gastoSemSolar5Anos)} jogados fora</td>
              <td class="td-com-solar-ganho">${formatBRL(projecao.economia5Anos)} economizados</td>
            </tr>
            <tr>
              <td><strong>25 anos</strong></td>
              <td class="td-sem-solar-perda">${formatBRL(projecao.gastoSemSolar25Anos)} jogados fora</td>
              <td class="td-com-solar-ganho">${formatBRL(projecao.economia25Anos)} economizados</td>
            </tr>
          </tbody>
        </table>

        <!-- Banner Vendedor Total Economizado em 25 anos -->
        <div class="banner-impacto-25anos">
          <div class="impacto-total-texto">
            <strong>TOTAL ECONOMIZADO EM 25 ANOS: ${formatBRL(projecao.economia25Anos)}</strong>
            <span>Patrimônio protegido contra reajustes tarifários da concessionária.</span>
          </div>
          <div class="impacto-perda-mes">
            <div class="impacto-perda-mes-label">Custo da Postergação</div>
            <div class="impacto-perda-mes-val">${formatBRL(projecao.economia1Mes)}/mês</div>
            <span style="font-size: 8px; color: #92400E;">que não retornam mais</span>
          </div>
        </div>

        <!-- Termo de Aceite e Assinaturas -->
        <div class="section-header-docx">
          <span class="sq-bullet">■</span> VALIDADE & TERMO DE ACEITE DA PROPOSTA
        </div>

        <div class="aceite-aprovacao-grid">
          <div class="validade-responsabilidade-box">
            <div>
              <strong>VALIDADE DA PROPOSTA:</strong> ${validadeDias} dias a partir da apresentação da proposta.
            </div>
            <div style="margin-top: 4px;">
              RESPONSÁVEL TÉCNICO: <strong>${empresa.responsavelTecnico}</strong> — ${empresa.crea}
            </div>
            <div style="margin-top: 4px;">
              <strong>${empresa.razaoSocial}</strong> — CNPJ: ${empresa.cnpj}<br />
              ${empresa.endereco}
            </div>
          </div>

          <div class="assinatura-cliente-box">
            <div class="linha-assinatura"></div>
            <div class="assinatura-nome-cliente">${cliente.nome}</div>
            <div class="assinatura-doc-cliente">
              CPF/CNPJ: ${cliente.cpfOuCnpj || '_________________________________'}
            </div>
          </div>
        </div>
      </div>

      ${renderFooter(4, 4)}
    </section>

  </div>

</body>
</html>`
}

/**
 * Abre a Proposta Técnico-Comercial em uma nova janela pronta para impressão/salvar como PDF.
 */
export function abrirPropostaTecnicoComercialEmNovaAba(dados: PropostaTecnicoComercialDados): void {
  const html = gerarHTMLPropostaTecnicoComercial(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}

/**
 * Baixa o arquivo HTML da Proposta Técnico-Comercial no computador.
 */
export function baixarPropostaTecnicoComercialHTML(dados: PropostaTecnicoComercialDados): void {
  const html = gerarHTMLPropostaTecnicoComercial(dados)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const safeName = dados.cliente.nome.replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `Proposta_Tecnico_Comercial_${safeName}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

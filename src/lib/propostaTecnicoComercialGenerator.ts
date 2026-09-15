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
 * Gera o documento HTML estritamente idêntico ao modelo de referência DOCX PROPOSTA-40a14.docx
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

  // Grade de instalações (até 6 fotos em 3 colunas)
  const galeriaHtml =
    fotosInstalacoes && fotosInstalacoes.length > 0
      ? `
    <div class="galeria-usinas-grade">
      ${fotosInstalacoes
        .slice(0, 6)
        .map(
          (foto) => `
        <div class="usina-card">
          <div class="usina-img-wrapper">
            <img src="${foto.url}" alt="${foto.titulo}" />
          </div>
          <div class="usina-legenda"><strong>${foto.titulo}</strong></div>
        </div>
      `,
        )
        .join('')}
    </div>
    `
      : ''

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta Técnico-Comercial - Delfos Solar - ${cliente.nome}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
      color: #111827;
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
    }

    /* Barra de ação fixa fora da impressão */
    .no-print-bar {
      margin-bottom: 16px;
      padding: 12px 18px;
      background: #0f172a;
      color: #f8fafc;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .print-btn-action {
      background: #16A34A;
      color: #FFFFFF;
      border: none;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: background 0.15s;
    }
    .print-btn-action:hover {
      background: #15803D;
    }

    /* 1. CABEÇALHO */
    .proposta-header {
      border-bottom: 2px solid #16A34A;
      padding-bottom: 14px;
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .brand-logo-circle {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #166534, #16A34A, #F59E0B);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 900;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.3);
    }
    .brand-names h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
      color: #064E3B;
      letter-spacing: -0.01em;
      line-height: 1.1;
    }
    .brand-names p {
      margin: 2px 0 0 0;
      font-size: 10px;
      font-weight: 700;
      color: #16A34A;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .header-empresa-contato {
      text-align: right;
      font-size: 9.5px;
      color: #4B5563;
      line-height: 1.4;
    }
    .header-empresa-contato a {
      color: #166534;
      text-decoration: none;
      font-weight: 600;
    }

    /* TÍTULO PRINCIPAL */
    .doc-main-title {
      font-size: 17px;
      font-weight: 900;
      color: #065F46;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 14px 0 10px 0;
      padding-bottom: 4px;
      border-bottom: 1px solid #E5E7EB;
    }

    /* CLIENTE E REPRESENTANTE */
    .meta-dados-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .meta-item {
      font-size: 11px;
      margin-bottom: 3px;
    }
    .meta-item strong {
      color: #111827;
    }

    /* SEÇÕES PADRÃO (TÍTULOS EM CAIXA ALTA) */
    .section-title {
      font-size: 13px;
      font-weight: 900;
      color: #065F46;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin: 18px 0 8px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 14px;
      background: #16A34A;
      border-radius: 2px;
    }

    /* QUEM SOMOS */
    .about-text {
      font-size: 11px;
      color: #374151;
      margin-bottom: 8px;
      text-align: justify;
      line-height: 1.5;
    }
    .bullet-list {
      margin: 6px 0 12px 0;
      padding-left: 20px;
    }
    .bullet-list li {
      font-size: 10.5px;
      color: #374151;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .bullet-list li strong {
      color: #111827;
    }

    /* GALERIA DE USINAS EM GRADE (3 COLUNAS) */
    .galeria-usinas-grade {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 12px 0 18px 0;
    }
    .usina-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .usina-img-wrapper {
      width: 100%;
      height: 110px;
      background: #F3F4F6;
      overflow: hidden;
    }
    .usina-img-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .usina-legenda {
      padding: 6px 8px;
      font-size: 9.5px;
      color: #111827;
      text-align: center;
      background: #F9FAFB;
      font-weight: 700;
      border-top: 1px solid #E5E7EB;
      min-height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* MONITORAMENTO & ILUSTRATIVAS */
    .ilustrativa-box {
      margin: 10px 0 16px 0;
      padding: 10px;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .ilustrativa-img {
      width: 180px;
      height: 100px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid #D1D5DB;
      flex-shrink: 0;
    }
    .ilustrativa-desc {
      font-size: 11px;
      color: #374151;
      line-height: 1.5;
    }

    /* TABELA ESPECIFICAÇÕES TÉCNICAS */
    .tabela-especificacoes {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 12px 0;
      font-size: 10.5px;
    }
    .tabela-especificacoes th {
      background: #F3F4F6;
      border: 1px solid #D1D5DB;
      padding: 7px 10px;
      font-weight: 800;
      color: #111827;
      text-align: left;
    }
    .tabela-especificacoes td {
      border: 1px solid #D1D5DB;
      padding: 6px 10px;
      color: #374151;
    }
    .tabela-especificacoes tr:nth-child(even) td {
      background: #FAFAFA;
    }
    .especificacoes-extras {
      margin-top: 6px;
      font-size: 11px;
      color: #111827;
    }

    /* TABELA GERAÇÃO MENSAL (JAN A DEZ) */
    .tabela-geracao-meses {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 14px 0;
      font-size: 10px;
      text-align: center;
    }
    .tabela-geracao-meses th {
      background: #E5E7EB;
      border: 1px solid #D1D5DB;
      padding: 5px 4px;
      font-weight: 800;
      color: #111827;
    }
    .tabela-geracao-meses td {
      border: 1px solid #D1D5DB;
      padding: 6px 4px;
      font-weight: 700;
      color: #166534;
      background: #FFFFFF;
    }

    /* ECONOMIA & DESTAQUES */
    .destaque-investimento-box {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 8px;
      padding: 10px 14px;
      margin: 10px 0 14px 0;
    }
    .destaque-investimento-box .valor-destaque {
      font-size: 15px;
      font-weight: 900;
      color: #166534;
    }

    /* SIMULAÇÃO DE PARCELAMENTO - 4 COLUNAS */
    .parcelamento-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin: 10px 0 6px 0;
    }
    .parcela-card {
      border: 1.5px solid #D1D5DB;
      border-radius: 6px;
      padding: 8px;
      background: #FFFFFF;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .parcela-card.destaque-verde {
      border-color: #16A34A;
      background: #F0FDF4;
    }
    .parcela-col-titulo {
      font-size: 11px;
      font-weight: 900;
      color: #111827;
      text-transform: uppercase;
      padding-bottom: 4px;
      border-bottom: 1px solid #E5E7EB;
    }
    .parcela-col-valor {
      font-size: 13px;
      font-weight: 900;
      color: #166534;
      margin: 8px 0;
    }
    .parcela-contas {
      font-size: 9px;
      color: #4B5563;
      text-align: left;
      border-top: 1px dashed #D1D5DB;
      padding-top: 4px;
      margin-top: 4px;
    }
    .parcela-tag {
      margin-top: 6px;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      background: #E5E7EB;
      color: #374151;
      text-transform: uppercase;
    }
    .parcela-card.destaque-verde .parcela-tag {
      background: #16A34A;
      color: #FFFFFF;
    }
    .nota-parcelamento {
      font-size: 8.5px;
      color: #6B7280;
      font-style: italic;
      margin: 4px 0 14px 0;
    }

    /* TABELA DESPERDÍCIO X ECONOMIA */
    .tabela-desperdicio {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 10px 0;
      font-size: 10.5px;
    }
    .tabela-desperdicio th {
      background: #F3F4F6;
      border: 1px solid #D1D5DB;
      padding: 6px 10px;
      font-weight: 800;
      color: #111827;
      text-align: left;
    }
    .tabela-desperdicio td {
      border: 1px solid #D1D5DB;
      padding: 6px 10px;
    }
    .td-sem-solar {
      color: #DC2626;
      font-weight: 700;
    }
    .td-com-solar {
      color: #166534;
      font-weight: 700;
    }
    .destaque-total-25anos {
      background: #FEF3C7;
      border: 1px solid #FCD34D;
      border-radius: 6px;
      padding: 8px 12px;
      margin: 10px 0 16px 0;
      font-size: 11px;
      color: #92400E;
    }
    .destaque-total-25anos strong {
      color: #78350F;
      font-size: 12px;
    }

    /* RODAPÉ E ASSINATURA */
    .rodape-proposta {
      border-top: 2px solid #16A34A;
      padding-top: 14px;
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      font-size: 10px;
      color: #374151;
      page-break-inside: avoid;
    }
    .assinatura-box {
      text-align: center;
      margin-top: 20px;
    }
    .assinatura-linha {
      width: 80%;
      margin: 0 auto 6px auto;
      border-bottom: 1px solid #111827;
    }

    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        background: #FFFFFF;
      }
      .page-container {
        max-width: 100%;
      }
      .galeria-usinas-grade {
        page-break-inside: avoid;
      }
      .tabela-geracao-meses, .parcelamento-grid, .tabela-desperdicio {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Barra para visualização em navegador -->
    <div class="no-print-bar">
      <div>
        <strong style="font-size: 13px;">Delfos Solar — Proposta Técnico-Comercial Oficial</strong>
        <div style="font-size: 11px; color: #94a3b8;">Estrutura fiel ao documento anexado • Pronta para gerar PDF ou imprimir</div>
      </div>
      <button class="print-btn-action" onclick="window.print()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 6 2 18 2 18 9"></polyline>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        Baixar em PDF / Imprimir
      </button>
    </div>

    <!-- 1. CABEÇALHO -->
    <div class="proposta-header">
      <div class="brand-box">
        <div class="brand-logo-circle">☀️</div>
        <div class="brand-names">
          <h1>DELFOS SOLAR</h1>
          <p>Engenharia & Soluções Fotovoltaicas</p>
        </div>
      </div>
      <div class="header-empresa-contato">
        <strong>${empresa.razaoSocial}</strong><br />
        ${empresa.endereco}<br />
        Tel: <strong>${empresa.telefone}</strong><br />
        Email: <a href="mailto:${empresa.email}">${empresa.email}</a><br />
        <a href="http://${empresa.site}" target="_blank">${empresa.site}</a>
      </div>
    </div>

    <div class="doc-main-title">PROPOSTA TÉCNICO - COMERCIAL</div>

    <!-- DADOS CLIENTE / REPRESENTANTE / DATA -->
    <div class="meta-dados-grid">
      <div>
        <div class="meta-item">Cliente: <strong>${cliente.nome}</strong></div>
        ${cliente.cpfOuCnpj ? `<div class="meta-item">Documento: <strong>${cliente.cpfOuCnpj}</strong></div>` : ''}
        ${cliente.endereco ? `<div class="meta-item">Endereço: ${cliente.endereco} ${cliente.municipio ? `— ${cliente.municipio}` : ''}</div>` : ''}
      </div>
      <div>
        <div class="meta-item">Representante: <strong>${representante.nome}</strong></div>
        <div class="meta-item">Contato: <strong>${representante.contato}</strong></div>
        <div class="meta-item">Data da Proposta: <strong>${dataProposta}</strong></div>
      </div>
    </div>

    <!-- 2. SEÇÃO QUEM SOMOS -->
    <div class="section-title">QUEM SOMOS</div>
    <div class="about-text">
      A Delfos Solar é especialista em transformar contas de energia em ativos que geram retorno mensal. Com uma trajetória consolidada, entregamos segurança técnica e previsibilidade financeira para nossos clientes.
    </div>

    <ul class="bullet-list">
      <li><strong>Experiência Comprovada:</strong> 12 anos de atuação ininterrupta no mercado de energia.</li>
      <li><strong>Portfólio Robusto:</strong> Mais de 2.500 projetos entregues e homologados.</li>
      <li><strong>Presença Regional:</strong> Atuação estratégica nos 3 estados do Sul do Brasil.</li>
      <li><strong>Engenharia Própria:</strong> Projetos customizados para máxima eficiência.</li>
      <li><strong>Pós-vendas Estruturado:</strong> Monitoramento de usinas, manutenção preventiva, relatórios mensais e suporte técnico especializado.</li>
    </ul>

    <!-- GALERIA DAS INSTALAÇÕES EM GRADE (ATÉ 6) -->
    ${galeriaHtml}

    <!-- 3. SEÇÃO MONITORAMENTO / COMO FUNCIONA -->
    ${
      incluirImagemComoFunciona
        ? `
    <div class="section-title">COMO FUNCIONA O SISTEMA SOLAR ON-GRID</div>
    <div class="ilustrativa-box">
      <img src="https://img.usecurling.com/p/800/450?q=solar+energy+system+diagram&color=teal" alt="Como Funciona o Sistema Solar" class="ilustrativa-img" />
      <div class="ilustrativa-desc">
        <strong>Geração Fotovoltaica Conectada à Rede:</strong> Os módulos fotovoltaicos convertem a radiação solar em energia elétrica contínua. O inversor converte para corrente alternada pronta para consumo no imóvel. O excedente produzido é injetado diretamente na rede da concessionária, gerando créditos energéticos compensáveis.
      </div>
    </div>
    `
        : ''
    }

    ${
      incluirImagemMonitoramento
        ? `
    <div class="section-title">MONITORAMENTO</div>
    <div class="ilustrativa-box">
      <img src="https://img.usecurling.com/p/800/450?q=solar+app+dashboard+graph&color=green" alt="Monitoramento do Sistema Solar" class="ilustrativa-img" />
      <div class="ilustrativa-desc">
        O sistema de monitoramento permite ao usuário acessar remotamente o desempenho do seu sistema.
      </div>
    </div>
    `
        : ''
    }

    <!-- 4. SEÇÃO ESPECIFICAÇÕES TÉCNICAS DO SISTEMA -->
    <div class="section-title">ESPECIFICAÇÕES TÉCNICAS DO SISTEMA</div>
    <div class="about-text">
      Projetamos um sistema de alta performance utilizando tecnologia de ponta para garantir a máxima captação solar em sua localização.
    </div>
    <div style="font-size: 11.5px; margin-bottom: 6px;">
      Equipamento: Gerador Fotovoltaico com potência de <strong>${formatNumBR(sistema.potenciaKwp, 2)} kWp</strong>
    </div>

    <table class="tabela-especificacoes">
      <thead>
        <tr>
          <th style="width: 30%;">Componente</th>
          <th style="width: 45%;">Descrição Técnica</th>
          <th style="width: 25%;">Quantidade</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Módulos Fotovoltaicos</strong></td>
          <td>${sistema.descricaoPaineis}</td>
          <td>${sistema.qtdPaineis} unid.</td>
        </tr>
        <tr>
          <td><strong>Inversor</strong></td>
          <td>${sistema.descricaoInversores}</td>
          <td>${sistema.qtdInversores} unid.</td>
        </tr>
        <tr>
          <td><strong>Estrutura de Fixação</strong></td>
          <td>${sistema.estruturaFixacao}</td>
          <td>Kit Completo</td>
        </tr>
      </tbody>
    </table>

    <div class="especificacoes-extras">
      Código FINAME/CFI: <strong>${sistema.codigoFiname || 'Sob consulta'}</strong><br />
      Área necessária para instalação: <strong>${formatNumBR(sistema.areaNecessariaM2, 1)} m²</strong>
    </div>

    <!-- 5. SEÇÃO SERVIÇOS INCLUSOS -->
    <div class="section-title">SERVIÇOS INCLUSOS:</div>
    <ul class="bullet-list">
      <li>Elaboração do projeto fotovoltaico e homologação junto à concessionária de energia;</li>
      <li>Instalação completa do sistema fotovoltaico, contemplando módulos, estruturas de fixação, inversor, passagem e organização dos cabos, dispositivos de proteção e aterramento do gerador;</li>
      <li>Configuração inicial do sistema de monitoramento e orientação ao cliente para acompanhamento da geração de energia;</li>
    </ul>

    <!-- 6. SEÇÃO GARANTIAS -->
    <div class="section-title">GARANTIAS</div>
    <ul class="bullet-list">
      <li><strong>Painéis Solares:</strong> ${garantias.paineisAnosFabricacao} anos contra defeitos de fabricação e ${garantias.paineisAnosDesempenho} anos de garantia para desempenho de ${garantias.paineisPercentualDesempenho} da potência nominal.</li>
      <li><strong>Inversor:</strong> ${garantias.inversorAnosFabricacao} anos de garantia contra defeitos de fabricação.</li>
      <li><strong>Instalação Delfos:</strong> ${garantias.instalacaoAnos} ano de garantia total sobre o serviço executado.</li>
    </ul>
    <div style="font-size: 10px; color: #4B5563; font-style: italic; margin-top: 4px;">
      OBS: Não são cobertas as garantias de peças ou componentes por desgaste natural, como disjuntores e DPS
    </div>

    <!-- 7. SEÇÃO PRODUÇÃO DE ENERGIA & GERAÇÃO MENSAL -->
    <div class="section-title">PRODUÇÃO DE ENERGIA</div>
    <div style="font-size: 11px; margin-bottom: 8px;">
      Anual: <strong>${formatNumBR(producao.anualKwh, 0)} kWh/ano</strong><br />
      Média Mensal: <strong>${formatNumBR(producao.mediaMensalKwh, 0)} kWh/mês</strong>
    </div>

    <div class="section-title" style="font-size: 11.5px;">GERAÇÃO MENSAL (KWH)</div>
    <table class="tabela-geracao-meses">
      <thead>
        <tr>
          <th>Mês</th>
          ${thMeses}
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="background: #F3F4F6; font-weight: 800; color: #111827;">kWh</td>
          ${tdMeses}
        </tr>
      </tbody>
    </table>

    <!-- 8. SEÇÃO SUA PROPOSTA DE ECONOMIA ENERGÉTICA -->
    <div class="section-title">SUA PROPOSTA DE ECONOMIA ENERGÉTICA</div>
    <div class="destaque-investimento-box">
      <div class="valor-destaque">Investimento total: ${formatBRL(economia.investimentoTotal)}</div>
      <div style="font-size: 11px; color: #166534; margin-top: 4px;">
        <strong>Prazo de entrega:</strong> Até ${economia.prazoEntregaDias} dias a partir da colocação do pedido.<br />
        Economia já a partir do 1º mês na conta de energia.<br />
        <strong>Tempo de retorno do investimento:</strong> ${economia.paybackTexto}
      </div>
    </div>

    <!-- 9. SEÇÃO SIMULAÇÃO DE PARCELAMENTO -->
    <div class="section-title">SIMULAÇÃO DE PARCELAMENTO</div>
    <div class="parcelamento-grid">
      <!-- À VISTA -->
      <div class="parcela-card destaque-verde">
        <div>
          <div class="parcela-col-titulo">À VISTA</div>
          <div class="parcela-col-valor">${formatBRL(parcelamento.aVista.valorTotal)}</div>
          <div style="font-size: 9px; color: #4B5563;">Parcela única</div>
        </div>
        <div>
          <div class="parcela-contas">
            Conta hoje: <strong>${formatBRL(parcelamento.aVista.contaHoje)}</strong><br />
            Conta com solar*: <strong style="color: #166534;">${formatBRL(parcelamento.aVista.contaComSolar)}</strong>
          </div>
          <div class="parcela-tag">Maior economia</div>
        </div>
      </div>

      <!-- CARTÃO 18X -->
      <div class="parcela-card">
        <div>
          <div class="parcela-col-titulo">CARTÃO 18X</div>
          <div class="parcela-col-valor">${parcelamento.cartao18x.numeroParcelas}x de ${formatBRL(parcelamento.cartao18x.valorParcela)}</div>
          <div style="font-size: 9px; color: #4B5563;">Sem burocracia bancária</div>
        </div>
        <div>
          <div class="parcela-contas">
            Conta hoje: <strong>${formatBRL(parcelamento.cartao18x.contaHoje)}</strong><br />
            Conta com solar*: <strong style="color: #166534;">${formatBRL(parcelamento.cartao18x.contaComSolar)}</strong>
          </div>
          <div class="parcela-tag">Sem burocracia</div>
        </div>
      </div>

      <!-- FINANCIAMENTO A -->
      <div class="parcela-card">
        <div>
          <div class="parcela-col-titulo">${parcelamento.financiamentoA.nome}</div>
          <div class="parcela-col-valor">${parcelamento.financiamentoA.numeroParcelas}x de ${formatBRL(parcelamento.financiamentoA.valorParcela)}</div>
          <div style="font-size: 9px; color: #4B5563;">Linha Bancária 1</div>
        </div>
        <div>
          <div class="parcela-contas">
            Conta hoje: <strong>${formatBRL(parcelamento.financiamentoA.contaHoje)}</strong><br />
            Conta com solar*: <strong style="color: #166534;">${formatBRL(parcelamento.financiamentoA.contaComSolar)}</strong>
          </div>
          <div class="parcela-tag">Sem entrada</div>
        </div>
      </div>

      <!-- FINANCIAMENTO B -->
      <div class="parcela-card">
        <div>
          <div class="parcela-col-titulo">${parcelamento.financiamentoB.nome}</div>
          <div class="parcela-col-valor">${parcelamento.financiamentoB.numeroParcelas}x de ${formatBRL(parcelamento.financiamentoB.valorParcela)}</div>
          <div style="font-size: 9px; color: #4B5563;">Linha Bancária 2</div>
        </div>
        <div>
          <div class="parcela-contas">
            Conta hoje: <strong>${formatBRL(parcelamento.financiamentoB.contaHoje)}</strong><br />
            Conta com solar*: <strong style="color: #166534;">${formatBRL(parcelamento.financiamentoB.contaComSolar)}</strong>
          </div>
          <div class="parcela-tag">Menor parcela</div>
        </div>
      </div>
    </div>
    <div class="nota-parcelamento">
      * Valores estimados. A conta com energia solar pode variar conforme consumo, taxa mínima da concessionária e iluminação pública.
    </div>

    <!-- 10. SEÇÃO PROJEÇÃO DE DESPERDÍCIO X ECONOMIA ACUMULADA -->
    <div class="section-title">PROJEÇÃO DE DESPERDÍCIO X ECONOMIA ACUMULADA</div>
    <table class="tabela-desperdicio">
      <thead>
        <tr>
          <th style="width: 25%;">Período</th>
          <th style="width: 37%;">Sem energia solar</th>
          <th style="width: 38%;">Com energia solar</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>1 ano</strong></td>
          <td class="td-sem-solar">${formatBRL(projecao.gastoSemSolar1Ano)} <strong>jogados fora</strong></td>
          <td class="td-com-solar">${formatBRL(projecao.economia1Ano)} <strong>economizados</strong></td>
        </tr>
        <tr>
          <td><strong>5 anos</strong></td>
          <td class="td-sem-solar">${formatBRL(projecao.gastoSemSolar5Anos)} <strong>jogados fora</strong></td>
          <td class="td-com-solar">${formatBRL(projecao.economia5Anos)} <strong>economizados</strong></td>
        </tr>
        <tr>
          <td><strong>25 anos</strong></td>
          <td class="td-sem-solar">${formatBRL(projecao.gastoSemSolar25Anos)} <strong>jogados fora</strong></td>
          <td class="td-com-solar">${formatBRL(projecao.economia25Anos)} <strong>economizados</strong></td>
        </tr>
      </tbody>
    </table>

    <div class="destaque-total-25anos">
      <strong>TOTAL ECONOMIZADO EM 25 ANOS: ${formatBRL(projecao.economia25Anos)}</strong><br />
      Cada mês de postergação = <strong>${formatBRL(projecao.economia1Mes)}</strong> que não retorna mais.
    </div>

    ${
      dados.observacoes
        ? `<div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 10px; font-size: 10px; color: #4B5563; margin-bottom: 12px;">
        <strong>Observações do Orçamento:</strong> ${dados.observacoes}
      </div>`
        : ''
    }

    <!-- 11. RODAPÉ E ASSINATURA -->
    <div class="rodape-proposta">
      <div>
        <p style="margin: 0 0 6px 0;">
          <strong>VALIDADE DA PROPOSTA:</strong> ${validadeDias} dias a partir da apresentação da proposta.
        </p>
        <p style="margin: 0 0 4px 0;">
          RESPONSÁVEL TÉCNICO: <strong>${empresa.responsavelTecnico}</strong><br />
          ${empresa.crea}
        </p>
        <p style="margin: 0 0 4px 0;">
          <strong>${empresa.razaoSocial}</strong><br />
          CNPJ: ${empresa.cnpj}
        </p>
      </div>

      <div class="assinatura-box">
        <div class="assinatura-linha"></div>
        <strong>${cliente.nome}</strong><br />
        <span>CPF/CNPJ: ${cliente.cpfOuCnpj || '_____________________'}</span>
      </div>
    </div>
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

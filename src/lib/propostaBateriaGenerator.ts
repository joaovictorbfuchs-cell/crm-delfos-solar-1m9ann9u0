import { formatCurrency, formatDateShort } from '@/lib/formatters'
import type { BateriaOrcamento, Cliente } from '@/types/crm'

export interface DadosDocumentoBateria {
  numeroProposta: string
  dataOrcamento: string
  validadeDias: number
  dataValidade: string
  autor: string

  // Cliente
  clienteNome: string
  clienteDocumento: string
  clienteTelefone: string
  clienteCidade: string
  clienteEndereco: string

  // Sistema de Baterias
  tipoAplicacao: string
  capacidadeKwh: number
  capacidadeUtilKwh: number
  potenciaInversorKw: number
  tensaoBancoV: number
  autonomiaHoras: number
  consumoCriticoKwhDia: number
  tipoBateria: string
  profundidadeDescargaDod: number
  ciclosVidaEstimados: number

  // Equipamentos
  marcaBateria: string
  modeloBateria: string
  quantidadeBaterias: number
  marcaInversorCarregador: string
  modeloInversorCarregador: string

  // Valores e Condições
  valorInvestimento: number
  condicoesPagamento: string
  parcelasCartao: number
  parcelaCartao: number
  parcelasFinanciamento: number
  parcelaFinanciamento: number

  // Garantias
  garantiaBateriasAnos: number
  garantiaInversorAnos: number
  garantiaInstalacaoAnos: number
  prazoInstalacaoDias: number

  observacoes?: string
}

export function compilarDadosDocumentoBateria(
  orcamento: Partial<BateriaOrcamento>,
  cliente?: Cliente | null,
): DadosDocumentoBateria {
  const cliNome =
    cliente?.razao_social ||
    cliente?.nome ||
    orcamento.expand?.cliente_id?.razao_social ||
    orcamento.expand?.cliente_id?.nome ||
    'Cliente não informado'

  const cliDoc =
    cliente?.cnpj ||
    cliente?.cpf ||
    orcamento.expand?.cliente_id?.cnpj ||
    orcamento.expand?.cliente_id?.cpf ||
    '—'

  const cliTel =
    cliente?.whatsapp ||
    cliente?.telefone ||
    orcamento.expand?.cliente_id?.whatsapp ||
    orcamento.expand?.cliente_id?.telefone ||
    '—'

  const cliCidade = cliente?.cidade || orcamento.expand?.cliente_id?.cidade || 'Erechim - RS'

  const cliEndereco =
    cliente?.endereco || orcamento.expand?.cliente_id?.endereco || 'Endereço a confirmar'

  const dataStr = orcamento.data_orcamento || new Date().toISOString().split('T')[0]
  const validadeDias = orcamento.validade_dias || 10

  const d = new Date(dataStr.includes('T') ? dataStr : `${dataStr}T12:00:00`)
  d.setDate(d.getDate() + validadeDias)
  const dataValidade = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`

  return {
    numeroProposta: orcamento.numero_proposta || 'BAT-2025-001',
    dataOrcamento: formatDateShort(dataStr),
    validadeDias,
    dataValidade,
    autor: orcamento.autor || 'João Victor Bagetti Fuchs',

    clienteNome: cliNome,
    clienteDocumento: cliDoc,
    clienteTelefone: cliTel,
    clienteCidade: cliCidade,
    clienteEndereco: cliEndereco,

    tipoAplicacao: orcamento.tipo_aplicacao || 'backup',
    capacidadeKwh: Number(orcamento.capacidade_kwh) || 10.24,
    capacidadeUtilKwh: Number(orcamento.capacidade_util_kwh) || 9.2,
    potenciaInversorKw: Number(orcamento.potencia_inversor_kw) || 5.0,
    tensaoBancoV: Number(orcamento.tensao_banco_v) || 51.2,
    autonomiaHoras: Number(orcamento.autonomia_horas) || 12,
    consumoCriticoKwhDia: Number(orcamento.consumo_critico_kwh_dia) || 10.0,
    tipoBateria: orcamento.tipo_bateria || 'LiFePO4',
    profundidadeDescargaDod: Number(orcamento.profundidade_descarga_dod) || 90,
    ciclosVidaEstimados: Number(orcamento.ciclos_vida_estimados) || 6000,

    marcaBateria: orcamento.marca_bateria || 'Deye',
    modeloBateria: orcamento.modelo_bateria || 'Bateria LiFePO4 5.12 kWh / 100Ah 51.2V',
    quantidadeBaterias: Number(orcamento.quantidade_baterias) || 2,
    marcaInversorCarregador: orcamento.marca_inversor_carregador || 'Deye',
    modeloInversorCarregador:
      orcamento.modelo_inversor_carregador || 'Inversor Híbrido 5kW Monofásico/Bifásico',

    valorInvestimento: Number(orcamento.valor_investimento) || 0,
    condicoesPagamento:
      orcamento.condicoes_pagamento ||
      'À vista via TED/Pix ou parcelado em até 18x no cartão ou 60x via financiamento bancário.',
    parcelasCartao: Number(orcamento.parcelas_cartao) || 12,
    parcelaCartao: Number(orcamento.parcela_cartao) || 0,
    parcelasFinanciamento: Number(orcamento.parcelas_financiamento) || 60,
    parcelaFinanciamento: Number(orcamento.parcela_financiamento) || 0,

    garantiaBateriasAnos: Number(orcamento.garantia_baterias_anos) || 10,
    garantiaInversorAnos: Number(orcamento.garantia_inversor_anos) || 5,
    garantiaInstalacaoAnos: Number(orcamento.garantia_instalacao_anos) || 1,
    prazoInstalacaoDias: Number(orcamento.prazo_instalacao_dias) || 15,

    observacoes: orcamento.observacoes || '',
  }
}

export function gerarHTMLPropostaBateria(dados: DadosDocumentoBateria): string {
  const getAplicacaoLabel = (app: string) => {
    switch (app) {
      case 'backup':
        return 'Backup / No-Break (Segurança Energética contra Quedas)'
      case 'peak_shaving':
        return 'Peak Shaving (Redução de Ponta de Demanda / Horário de Pico)'
      case 'autoconsumo':
        return 'Maximização de Autoconsumo Solar'
      case 'off_grid':
        return 'Sistema Isolado / Off-Grid (100% Autônomo)'
      default:
        return app
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Proposta Comercial — Sistema de Baterias | DELFOS ENGENHARIA</title>
  <style>
    :root {
      --primary: #166534;
      --primary-light: #16a34a;
      --primary-soft: #f0fdf4;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-600: #475569;
      --slate-100: #f1f5f9;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      color: var(--slate-900);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.5;
    }
    .paper {
      max-width: 900px;
      margin: 20px auto;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid var(--slate-900);
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .logo-title {
      font-size: 24px;
      font-weight: 800;
      color: var(--primary);
      letter-spacing: -0.5px;
    }
    .logo-subtitle {
      font-size: 11px;
      color: var(--slate-600);
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
    }
    .meta-box {
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background: var(--primary-soft);
      color: var(--primary);
      border: 1px solid var(--primary-light);
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--slate-900);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--border);
      padding-bottom: 6px;
      margin-top: 25px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 14px;
      background: var(--primary-light);
      border-radius: 2px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 15px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 16px;
    }
    .card-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--slate-600);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .card-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--slate-900);
    }
    .hero-stat {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1px solid #86efac;
      border-radius: 8px;
      padding: 18px;
      text-align: center;
    }
    .hero-stat-value {
      font-size: 26px;
      font-weight: 800;
      color: #15803d;
    }
    .hero-stat-label {
      font-size: 11px;
      font-weight: 700;
      color: var(--slate-600);
      text-transform: uppercase;
      margin-top: 4px;
    }
    .investment-box {
      background: #0f172a;
      color: #ffffff;
      border-radius: 10px;
      padding: 24px;
      margin-top: 25px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .investment-total {
      font-size: 32px;
      font-weight: 800;
      color: #4ade80;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--slate-600);
    }
    @media print {
      body { background: #ffffff; }
      .paper { box-shadow: none; border: none; padding: 0; margin: 0; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="paper">
    <div class="header">
      <div>
        <div class="logo-title">DELFOS ENGENHARIA</div>
        <div class="logo-subtitle">Sistemas de Armazenamento de Energia & Baterias</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
          Rua Espírito Santo, 275 — Erechim/RS • updates.delfos.eng.br
        </div>
      </div>
      <div class="meta-box">
        <span class="badge">Proposta Comercial</span>
        <div style="font-weight: 800; font-size: 16px; margin-top: 6px;">${dados.numeroProposta}</div>
        <div style="font-size: 11px; color: #64748b;">Emissão: ${dados.dataOrcamento} • Válida até: ${dados.dataValidade}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Consultor: <strong>${dados.autor}</strong></div>
      </div>
    </div>

    <!-- Cliente -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="grid-3">
        <div>
          <div class="card-label">Cliente / Razão Social</div>
          <div class="card-value">${dados.clienteNome}</div>
        </div>
        <div>
          <div class="card-label">CPF / CNPJ</div>
          <div class="card-value">${dados.clienteDocumento}</div>
        </div>
        <div>
          <div class="card-label">Cidade / Contato</div>
          <div class="card-value">${dados.clienteCidade} • ${dados.clienteTelefone}</div>
        </div>
      </div>
    </div>

    <!-- Resumo do Sistema Dimensionado -->
    <div class="grid-3" style="margin-bottom: 20px;">
      <div class="hero-stat">
        <div class="hero-stat-value">${dados.capacidadeKwh} kWh</div>
        <div class="hero-stat-label">Capacidade Nominal Total</div>
        <div style="font-size: 10px; color: #166534; margin-top: 2px;">${dados.capacidadeUtilKwh} kWh úteis (${dados.profundidadeDescargaDod}% DOD)</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-value">${dados.autonomiaHoras}h</div>
        <div class="hero-stat-label">Autonomia Estimada</div>
        <div style="font-size: 10px; color: #166534; margin-top: 2px;">Consumo de ${dados.consumoCriticoKwhDia} kWh/dia</div>
      </div>
      <div class="hero-stat">
        <div class="hero-stat-value">${dados.potenciaInversorKw} kW</div>
        <div class="hero-stat-label">Potência Inversor Híbrido</div>
        <div style="font-size: 10px; color: #166534; margin-top: 2px;">Tensão do Banco: ${dados.tensaoBancoV}V</div>
      </div>
    </div>

    <div class="section-title">Finalidade &amp; Aplicação do Sistema</div>
    <div class="card">
      <div style="font-weight: 700; color: #166534; font-size: 13px;">
        ${getAplicacaoLabel(dados.tipoAplicacao)}
      </div>
      <div style="font-size: 11px; color: #475569; margin-top: 4px;">
        Sistema projetado com tecnologia de ponta em química <strong>${dados.tipoBateria}</strong>, oferecendo mais de <strong>${dados.ciclosVidaEstimados} ciclos de carga/descarga</strong>, alta estabilidade térmica e zero manutenção ao longo de sua vida útil.
      </div>
    </div>

    <div class="section-title">Equipamentos Homologados</div>
    <div class="grid-2">
      <div class="card">
        <div class="card-label">Banco de Baterias</div>
        <div class="card-value">${dados.marcaBateria}</div>
        <div style="font-size: 12px; color: #334155; margin-top: 2px;">${dados.modeloBateria}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Quantidade: <strong>${dados.quantidadeBaterias} unidades</strong></div>
      </div>
      <div class="card">
        <div class="card-label">Inversor / Carregador Híbrido</div>
        <div class="card-value">${dados.marcaInversorCarregador}</div>
        <div style="font-size: 12px; color: #334155; margin-top: 2px;">${dados.modeloInversorCarregador}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Potência contínua: <strong>${dados.potenciaInversorKw} kW</strong></div>
      </div>
    </div>

    <div class="section-title">Garantias &amp; Instalação</div>
    <div class="grid-3">
      <div class="card">
        <div class="card-label">Garantia Baterias</div>
        <div class="card-value">${dados.garantiaBateriasAnos} anos de fábrica</div>
      </div>
      <div class="card">
        <div class="card-label">Garantia Inversor</div>
        <div class="card-value">${dados.garantiaInversorAnos} anos de fábrica</div>
      </div>
      <div class="card">
        <div class="card-label">Garantia de Instalação</div>
        <div class="card-value">${dados.garantiaInstalacaoAnos} ano Delfos Engenharia</div>
      </div>
    </div>

    <!-- Bloco de Investimento -->
    <div class="investment-box">
      <div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700;">
          Investimento Total Turnkey
        </div>
        <div class="investment-total">${formatCurrency(dados.valorInvestimento)}</div>
        <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">
          Inclui equipamentos completos, proteções elétricas DC/AC, instalação e comissionamento técnico.
        </div>
      </div>
      <div style="text-align: right; max-width: 320px;">
        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Condições de Pagamento</div>
        <div style="font-size: 11px; color: #ffffff; margin-top: 4px;">${dados.condicoesPagamento}</div>
        ${dados.parcelaFinanciamento > 0 ? `<div style="font-size: 12px; color: #86efac; font-weight: 700; margin-top: 6px;">Financiamento em até ${dados.parcelasFinanciamento}x de ${formatCurrency(dados.parcelaFinanciamento)}</div>` : ''}
      </div>
    </div>

    ${
      dados.observacoes
        ? `
    <div class="section-title">Observações Técnicas</div>
    <div class="card" style="font-size: 12px; color: #334155;">
      ${dados.observacoes}
    </div>
    `
        : ''
    }

    <div class="footer">
      <div>DELFOS ENGENHARIA SOLAR LTDA • CNPJ 38.307.728/0001-35</div>
      <div>Proposta ${dados.numeroProposta} • Página 1 de 1</div>
    </div>
  </div>
</body>
</html>`
}

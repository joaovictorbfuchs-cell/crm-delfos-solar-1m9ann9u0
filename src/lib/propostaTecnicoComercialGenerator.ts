import type { GeracaoMensalItem } from '@/lib/energiaSolar'
import { calcularProjecaoEconomia } from '@/lib/calculoProjecaoEconomia'
import { CONSUMO_EXEMPLO_PADRAO_KWH_ANO } from '@/data/planilhaBaseProjecao'

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
    tipoCliente?: 'residencial' | 'comercial' | 'rural' | 'industrial'
  }
  representante: {
    nome: string
    contato: string
  }
  dataProposta: string
  validadeDias: number
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
  fotosInstalacoes?: FotoInstalacaoProposta[]
  incluirImagemComoFunciona?: boolean
  incluirImagemMonitoramento?: boolean
  sistema: {
    potenciaKwp: number
    descricaoPaineis: string
    qtdPaineis: number
    descricaoInversores: string
    qtdInversores: number
    estruturaFixacao: string
    codigoFiname?: string
    areaNecessariaM2: number
    potenciaPlacaWp?: number
    tecnologiaModulo?: string
    mpptInversor?: number | string
    potenciaInversorKw?: number
  }
  garantias: {
    paineisAnosFabricacao: number
    paineisAnosDesempenho: number
    paineisPercentualDesempenho: string
    inversorAnosFabricacao: number
    instalacaoAnos: number
    instalacaoTexto?: string
  }
  producao: {
    anualKwh: number
    mediaMensalKwh: number
    geracaoMensal?: GeracaoMensalItem[]
  }
  economia: {
    investimentoTotal: number
    prazoEntregaDias: number
    paybackTexto: string
    paybackMeses?: number
  }
  parcelamento: {
    aVista: {
      valorTotal: number
      contaHoje: number
      contaComSolar: number
      descontoReais?: number
    }
    cartao18x: {
      numeroParcelas: number
      valorParcela: number
      contaHoje: number
      contaComSolar: number
      semJuros?: boolean
    }
    financiamentoA: {
      nome: string
      numeroParcelas: number
      valorParcela: number
      contaHoje: number
      contaComSolar: number
      entrada?: number
    }
    financiamentoB: {
      nome: string
      numeroParcelas: number
      valorParcela: number
      contaHoje: number
      contaComSolar: number
      entrada?: number
    }
  }
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
 * Logotipo oficial vetorial Delfos Solar com degradê característico azul/verde/amarelo.
 */
function renderLogoSvg(idSuffix: string = '1'): string {
  return `<svg viewBox="0 0 520 280" fill="none" class="brand-logo-svg" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="delfos-grad-top-${idSuffix}" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#0B5AA8" />
        <stop offset="18%" stop-color="#12789E" />
        <stop offset="42%" stop-color="#2E9E43" />
        <stop offset="68%" stop-color="#7EBE32" />
        <stop offset="88%" stop-color="#DECA09" />
        <stop offset="100%" stop-color="#FCD200" />
      </linearGradient>
      <linearGradient id="delfos-grad-bottom-${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCD200" />
        <stop offset="14%" stop-color="#DECA09" />
        <stop offset="36%" stop-color="#7EBE32" />
        <stop offset="62%" stop-color="#2E9E43" />
        <stop offset="84%" stop-color="#12789E" />
        <stop offset="100%" stop-color="#0B5AA8" />
      </linearGradient>
    </defs>
    <path d="M 10 96 C 45 42, 135 12, 260 12 C 390 12, 475 46, 514 88 C 450 42, 360 26, 260 26 C 145 26, 55 56, 10 96 Z" fill="url(#delfos-grad-top-${idSuffix})" />
    <path d="M 12 96 C 40 48, 130 16, 260 16 C 395 16, 480 50, 514 88 C 455 42, 365 28, 260 28 C 145 28, 55 58, 12 96 Z" fill="url(#delfos-grad-top-${idSuffix})" opacity="0.95" />
    <path d="M 10 184 C 55 226, 145 258, 260 258 C 375 258, 465 228, 514 192 C 480 228, 395 268, 260 268 C 130 268, 45 232, 10 184 Z" fill="url(#delfos-grad-bottom-${idSuffix})" />
    <path d="M 12 184 C 52 214, 135 246, 260 246 C 385 246, 470 224, 514 192 C 480 226, 390 264, 260 264 C 105 264, 35 218, 12 184 Z" fill="url(#delfos-grad-bottom-${idSuffix})" opacity="0.95" />
    <g fill="#0A539E">
      <text x="260" y="160" text-anchor="middle" font-family="Arial, -apple-system, BlinkMacSystemFont, sans-serif" font-size="94" font-weight="900" letter-spacing="0.22em">delfos</text>
      <text x="264" y="200" text-anchor="middle" font-family="Arial, -apple-system, BlinkMacSystemFont, sans-serif" font-size="25" font-weight="800" letter-spacing="0.68em">solar</text>
    </g>
  </svg>`
}

/**
 * Cabeçalho recorrente para páginas internas (seções 2 a 6).
 */
function renderInternalHeader(secaoTitulo: string, numeroSecao: number, idSuffix: string): string {
  return `
    <header class="doc-header">
      <div class="header-brand">
        <div class="logo-box">${renderLogoSvg(idSuffix)}</div>
        <div>
          <div class="brand-title">DELFOS SOLAR</div>
          <div class="brand-sub">ENGENHARIA & SOLUÇÕES FOTOVOLTAICAS</div>
        </div>
      </div>
      <div class="header-tag">
        <span class="tag-secao">SEÇÃO ${numeroSecao} DE 6</span>
        <span class="tag-desc">${secaoTitulo}</span>
      </div>
    </header>
  `
}

/**
 * Rodapé recorrente para todas as seções.
 */
function renderInternalFooter(numeroSecao: number): string {
  return `
    <footer class="doc-footer">
      <div class="footer-left">
        <strong>Delfos Engenharia Solar</strong> • CNPJ 21.379.952/0001-38 • Erechim / RS • Tel: (54) 99129-2121 • Responsável: <strong>João Victor Bagetti Fuchs</strong> (CREA RS151894)
      </div>
      <div class="footer-right">
        Seção <strong>${numeroSecao}</strong> de <strong>6</strong>
      </div>
    </footer>
  `
}

/**
 * Gera o documento HTML oficial da Proposta Comercial Delfos Solar
 * com exatamente as 6 SEÇÕES NOVAS aprovadas pelo usuário:
 *
 * 1. Capa (logo Delfos, cliente, potência kWp, geração, consultor, data)
 * 2. Custo da Inércia (comparativo 1/5/25 anos + box vermelho + linha reflexiva)
 * 3. Seu Sistema Fotovoltaico (cards potência, geração, módulos, inversor, área, garantias 30a/10a/Delfos, faixa 24/7)
 * 4. Projeção de Economia na Conta de Energia (tabela 2026–2051, calculada via calcularProjecaoEconomia)
 * 5. Projeção de Economia em 25 Anos (curvas gasto sem solar vs investimento/economia + marcador payback + cards)
 * 6. Investimento e Condições de Pagamento (cards À vista / Cartão / Finan A / Finan B + comparativo conta + badge validade)
 */
export function gerarHTMLPropostaTecnicoComercial(dados: PropostaTecnicoComercialDados): string {
  const {
    cliente,
    representante,
    dataProposta,
    validadeDias,
    empresa,
    sistema,
    garantias,
    producao,
    economia,
    parcelamento,
    projecao,
    observacoes,
  } = dados

  const nomeCliente = (cliente?.nome && cliente.nome.trim()) || 'Cliente Especial'
  const potenciaKwp = sistema?.potenciaKwp || 0
  const consultorNome =
    (representante?.nome && representante.nome.trim()) || 'Consultor Delfos Solar'
  const consultorContato = representante?.contato || '(54) 99129-2121'
  const dataFormatada = dataProposta || new Date().toLocaleDateString('pt-BR')
  const validade = validadeDias || 5

  // Economia mensal prioritária
  const economiaMensal =
    projecao?.economia1Mes && projecao.economia1Mes > 0
      ? projecao.economia1Mes
      : parcelamento?.aVista?.contaHoje && parcelamento.aVista.contaComSolar !== undefined
        ? Math.max(0, parcelamento.aVista.contaHoje - parcelamento.aVista.contaComSolar)
        : 928.75

  // Conta atual prioritária
  const contaHoje =
    parcelamento?.aVista?.contaHoje && parcelamento.aVista.contaHoje > 0
      ? parcelamento.aVista.contaHoje
      : Math.round(economiaMensal * 1.08)

  const investimentoTotal = economia?.investimentoTotal || parcelamento?.aVista?.valorTotal || 45000

  // Valores de inércia
  const gasto1Ano =
    projecao?.gastoSemSolar1Ano && projecao.gastoSemSolar1Ano > 0
      ? projecao.gastoSemSolar1Ano
      : Math.round(contaHoje * 12 * 1.045)
  const gasto5Anos =
    projecao?.gastoSemSolar5Anos && projecao.gastoSemSolar5Anos > 0
      ? projecao.gastoSemSolar5Anos
      : Math.round(gasto1Ano * 5.8)
  const gasto25Anos =
    projecao?.gastoSemSolar25Anos && projecao.gastoSemSolar25Anos > 0
      ? projecao.gastoSemSolar25Anos
      : Math.round(gasto1Ano * 38.5)

  const eco1Ano =
    projecao?.economia1Ano && projecao.economia1Ano > 0
      ? projecao.economia1Ano
      : Math.round(economiaMensal * 12)
  const eco5Anos =
    projecao?.economia5Anos && projecao.economia5Anos > 0
      ? projecao.economia5Anos
      : Math.round(gasto5Anos - investimentoTotal)
  const eco25Anos =
    projecao?.economia25Anos && projecao.economia25Anos > 0
      ? projecao.economia25Anos
      : Math.round(gasto25Anos - investimentoTotal)

  // Cálculo da projeção completa 2026-2051 via lib oficial
  const consumoKwhAnoEstimado =
    producao?.anualKwh && producao.anualKwh > 0
      ? producao.anualKwh
      : producao?.mediaMensalKwh && producao.mediaMensalKwh > 0
        ? producao.mediaMensalKwh * 12
        : CONSUMO_EXEMPLO_PADRAO_KWH_ANO

  const tipoClienteProj = cliente?.tipoCliente === 'comercial' ? 'comercial' : 'residencial'
  const projecaoOficial = calcularProjecaoEconomia({
    tipoCliente: tipoClienteProj,
    consumoKwhAno: consumoKwhAnoEstimado,
  })

  // Payback
  const paybackMesesCalculado =
    economia?.paybackMeses && economia.paybackMeses > 0
      ? economia.paybackMeses
      : economiaMensal > 0
        ? Math.round((investimentoTotal / economiaMensal) * 10) / 10
        : 50
  const paybackAnosInt = Math.floor(paybackMesesCalculado / 12)
  const paybackMesesInt = Math.round(paybackMesesCalculado % 12)
  const paybackTextoFinal =
    economia?.paybackTexto || `${paybackAnosInt} anos e ${paybackMesesInt} meses`

  // ROI estimado
  const roiCalculado =
    investimentoTotal > 0
      ? Math.round(((eco25Anos - investimentoTotal) / investimentoTotal) * 100)
      : 840

  // Condições de pagamento
  const aVistaValor = parcelamento?.aVista?.valorTotal || Math.round(investimentoTotal * 0.95)
  const aVistaDesconto =
    parcelamento?.aVista?.descontoReais !== undefined && parcelamento.aVista.descontoReais !== null
      ? parcelamento.aVista.descontoReais
      : Math.max(0, investimentoTotal - aVistaValor)

  const cartaoParcelas = parcelamento?.cartao18x?.numeroParcelas || 12
  const cartaoValor =
    parcelamento?.cartao18x?.valorParcela || Math.round(investimentoTotal / cartaoParcelas)

  const finanANome = parcelamento?.financiamentoA?.nome || 'Financiamento A'
  const finanAParcelas = parcelamento?.financiamentoA?.numeroParcelas || 60
  const finanAEntrada =
    parcelamento?.financiamentoA?.entrada !== undefined
      ? parcelamento.financiamentoA.entrada
      : Math.round(investimentoTotal * 0.2)
  const finanAValor =
    parcelamento?.financiamentoA?.valorParcela ||
    Math.round(((investimentoTotal - finanAEntrada) * 1.35) / finanAParcelas)

  const finanBNome = parcelamento?.financiamentoB?.nome || 'Financiamento B'
  const finanBParcelas = parcelamento?.financiamentoB?.numeroParcelas || 120
  const finanBEntrada =
    parcelamento?.financiamentoB?.entrada !== undefined
      ? parcelamento.financiamentoB.entrada
      : Math.round(investimentoTotal * 0.1)
  const finanBValor =
    parcelamento?.financiamentoB?.valorParcela ||
    Math.round(((investimentoTotal - finanBEntrada) * 1.6) / finanBParcelas)

  const menorParcela = Math.min(
    finanAValor > 0 ? finanAValor : Infinity,
    finanBValor > 0 ? finanBValor : Infinity,
  )
  const parcelaComparativa = menorParcela !== Infinity ? menorParcela : finanBValor

  // Equipamentos
  const modulosQtd = sistema?.qtdPaineis || 14
  const modulosDesc = sistema?.descricaoPaineis || 'JA Solar 610W'
  const modulosWp = sistema?.potenciaPlacaWp || 610
  const modulosTecnologia = sistema?.tecnologiaModulo || 'bifacial N-type'
  const inversorDesc = sistema?.descricaoInversores || 'Huawei SUN2000-6KTL-L1 220V'
  const inversorQtd = sistema?.qtdInversores || 1
  const inversorMppt = sistema?.mpptInversor || 2
  const inversorKw =
    sistema?.potenciaInversorKw || (potenciaKwp > 0 ? Math.round(potenciaKwp * 0.8 * 10) / 10 : 6)
  const areaM2 = sistema?.areaNecessariaM2 || 37.8
  const garantiaModulos = garantias?.paineisAnosDesempenho || 30
  const garantiaInversor = garantias?.inversorAnosFabricacao || 10
  const garantiaInstalacao =
    garantias?.instalacaoTexto || `${garantias?.instalacaoAnos || 1} ano(s)`

  // SVG Curvas Gráfico Seção 5 (renderização vetorial estática A4)
  // Largura 700, Altura 220, Margem X: 50 a 670 (largura útil 620), Margem Y: 20 a 190 (altura útil 170)
  const linhasComp = projecaoOficial.linhas
  const maxVal = Math.max(
    ...linhasComp.map((l) => l.gastoSemSolarAcumulado),
    investimentoTotal * 2,
    100000,
  )
  const escalaX = (idx: number) => 55 + (idx / (linhasComp.length - 1)) * 600
  const escalaY = (val: number) => 190 - (Math.min(val, maxVal) / maxVal) * 160

  const pontosVermelho = linhasComp
    .map((l, idx) => `${escalaX(idx).toFixed(1)},${escalaY(l.gastoSemSolarAcumulado).toFixed(1)}`)
    .join(' ')

  const pontosVerde = linhasComp
    .map((l, idx) => {
      // Custo acumulado do sistema + taxa residual
      const taxaMinimaAcum = idx * 60 * l.tarifaKwh
      const custoComSolar = investimentoTotal + taxaMinimaAcum
      return `${escalaX(idx).toFixed(1)},${escalaY(custoComSolar).toFixed(1)}`
    })
    .join(' ')

  // Payback ponto
  const idxPayback = Math.min(
    Math.max(1, Math.round(paybackMesesCalculado / 12)),
    linhasComp.length - 1,
  )
  const xPayback = escalaX(idxPayback).toFixed(1)
  const yPayback = escalaY(investimentoTotal).toFixed(1)
  const anoPayback = 2026 + idxPayback

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta Comercial Delfos Solar - ${nomeCliente}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* ==========================================================
       SETUP DE IMPRESSÃO A4 COM 6 SEÇÕES PRECISAS
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
      font-size: 10px;
      line-height: 1.35;
    }

    /* BARRA DE AÇÃO FORA DA IMPRESSÃO */
    .no-print-bar {
      max-width: 900px;
      margin: 14px auto 10px auto;
      padding: 12px 18px;
      background: #064E3B;
      color: #FFFFFF;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 4px 14px rgba(6, 78, 59, 0.25);
    }
    .no-print-bar-info strong {
      font-size: 13.5px;
      display: block;
      color: #ECFDF5;
    }
    .no-print-bar-info span {
      font-size: 11px;
      color: #A7F3D0;
    }
    .btn-action-print {
      background: #16A34A;
      color: #FFFFFF;
      border: none;
      padding: 8px 18px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 8px;
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

    /* CONTÊINER GERAL */
    .proposta-container {
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding-bottom: 24px;
    }

    /* PÁGINA INDIVIDUAL DA PROPOSTA (UMA SEÇÃO POR FOLHA A4) */
    .proposta-secao-page {
      background: #FFFFFF;
      width: 100%;
      min-height: 297mm;
      padding: 10mm 12mm 10mm 12mm;
      margin: 0 auto 16px auto;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 6px;
      page-break-before: always;
      break-before: page;
    }
    .proposta-secao-page:first-child {
      page-break-before: avoid;
      break-before: avoid;
    }

    .secao-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* CABEÇALHO RECORRENTE SEÇÕES 2-6 */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #16A34A;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-box {
      width: 58px;
      height: 34px;
      display: flex;
      align-items: center;
    }
    .brand-logo-svg {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .brand-title {
      font-size: 15px;
      font-weight: 900;
      color: #0A539E;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      font-size: 8px;
      font-weight: 800;
      color: #16A34A;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .header-tag {
      text-align: right;
    }
    .tag-secao {
      display: block;
      font-size: 8px;
      font-weight: 800;
      color: #065F46;
      background: #DCFCE7;
      border: 1px solid #86EFAC;
      padding: 2px 7px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .tag-desc {
      display: block;
      font-size: 9px;
      font-weight: 700;
      color: #4B5563;
      margin-top: 2px;
    }

    /* RODAPÉ RECORRENTE */
    .doc-footer {
      border-top: 1px solid #E5E7EB;
      padding-top: 6px;
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8px;
      color: #6B7280;
    }
    .doc-footer strong {
      color: #111827;
    }
    .doc-footer .footer-right {
      font-weight: 700;
      color: #166534;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      padding: 2px 7px;
      border-radius: 4px;
    }

    /* ==========================================================
       SEÇÃO 1 — CAPA
       ========================================================== */
    .capa-wrapper {
      background: linear-gradient(145deg, #071311 0%, #0b241c 50%, #04100d 100%);
      color: #FFFFFF;
      border-radius: 18px;
      padding: 24px;
      border: 1.5px solid #065f46;
      position: relative;
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 255mm;
      box-shadow: inset 0 0 80px rgba(16, 185, 129, 0.1);
    }
    .capa-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .capa-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(52, 211, 153, 0.4);
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 800;
      color: #6EE7B7;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .capa-logo-card {
      background: rgba(255, 255, 255, 0.96);
      padding: 6px 14px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      width: 140px;
      height: 48px;
    }
    .capa-middle {
      margin: 32px 0;
    }
    .capa-prep-tag {
      font-size: 11px;
      font-weight: 700;
      color: #34D399;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .capa-prep-tag::before {
      content: "";
      display: inline-block;
      width: 18px;
      height: 2px;
      background: #34D399;
    }
    .capa-cliente-nome {
      font-size: 34px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0 0 16px 0;
    }
    .capa-frase-destaque {
      font-size: 22px;
      font-weight: 900;
      color: #22C55E;
      line-height: 1.25;
      margin: 0 0 10px 0;
    }
    .capa-subtitulo {
      font-size: 13px;
      color: #D1FAE5;
      font-weight: 500;
      margin: 0;
    }
    .capa-pills-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 24px;
    }
    .capa-pill {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(52, 211, 153, 0.25);
      border-radius: 10px;
      padding: 10px 12px;
    }
    .capa-pill-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #A7F3D0;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .capa-pill-val {
      font-size: 16px;
      font-weight: 900;
      color: #FFFFFF;
      margin-top: 2px;
    }
    .capa-bottom {
      border-top: 1px solid rgba(52, 211, 153, 0.25);
      padding-top: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      font-size: 9.5px;
    }
    .capa-bottom-info strong {
      color: #FFFFFF;
    }
    .capa-bottom-info span {
      color: #A7F3D0;
    }

    /* ==========================================================
       SEÇÃO 2 — O CUSTO DA INÉRCIA
       ========================================================== */
    .secao-titulo-bloco {
      background: linear-gradient(90deg, #F0FDF4 0%, #FFFFFF 100%);
      border-left: 4px solid #16A34A;
      padding: 6px 10px;
      border-radius: 6px;
      margin-bottom: 12px;
    }
    .secao-titulo-bloco h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 900;
      color: #064E3B;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .secao-titulo-bloco p {
      margin: 2px 0 0 0;
      font-size: 9px;
      color: #047857;
      font-weight: 600;
    }

    .tabela-inercia {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 10px;
    }
    .tabela-inercia th {
      background: #064E3B;
      color: #FFFFFF;
      padding: 6px 10px;
      text-align: left;
      font-size: 9.5px;
      text-transform: uppercase;
      border: 1px solid #064E3B;
    }
    .tabela-inercia td {
      padding: 8px 10px;
      border: 1px solid #E5E7EB;
    }
    .td-sem-solar {
      background: #FEF2F2;
      color: #DC2626;
      font-weight: 800;
    }
    .td-com-solar {
      background: #F0FDF4;
      color: #166534;
      font-weight: 800;
    }

    .box-vermelho-alerta {
      background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%);
      color: #FFFFFF;
      border-radius: 12px;
      padding: 14px 18px;
      margin: 12px 0;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);
    }
    .box-vermelho-tag {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #FECACA;
      margin-bottom: 4px;
    }
    .box-vermelho-texto {
      font-size: 14px;
      font-weight: 900;
      line-height: 1.3;
      margin: 0;
    }
    .box-vermelho-sub {
      font-size: 10px;
      color: #FEE2E2;
      margin-top: 4px;
    }

    .box-linha-reflexiva {
      background: #FFFFFF;
      border: 1.5px solid #16A34A;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 10px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .box-linha-reflexiva .icon-patrimonio {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #DCFCE7;
      color: #166534;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
      shrink-0;
    }

    /* ==========================================================
       SEÇÃO 3 — SEU SISTEMA FOTOVOLTAICO
       ========================================================== */
    .grid-sistema-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 9px;
      margin: 10px 0;
    }
    .card-sistema {
      background: #F9FAFB;
      border: 1.5px solid #E5E7EB;
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-sistema-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .card-sistema-icon {
      font-size: 16px;
    }
    .card-sistema-tag {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1.5px 6px;
      border-radius: 4px;
      background: #E5E7EB;
      color: #374151;
    }
    .card-sistema-tag.emerald {
      background: #DCFCE7;
      color: #166534;
    }
    .card-sistema-tag.blue {
      background: #DBEAFE;
      color: #1E40AF;
    }
    .card-sistema-tag.amber {
      background: #FEF3C7;
      color: #92400E;
    }
    .card-sistema-label {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6B7280;
    }
    .card-sistema-valor {
      font-size: 19px;
      font-weight: 900;
      color: #111827;
      line-height: 1.15;
      margin: 2px 0;
    }
    .card-sistema-sub {
      font-size: 8.5px;
      color: #4B5563;
      line-height: 1.25;
    }

    .faixa-garantias-tripla {
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%);
      border: 1.5px solid #10B981;
      border-radius: 12px;
      padding: 12px 14px;
      margin-top: 10px;
    }
    .garantias-tripla-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 8px;
    }
    .garantia-item-bloco {
      background: #FFFFFF;
      border: 1px solid #A7F3D0;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
    }
    .garantia-item-anos {
      font-size: 18px;
      font-weight: 900;
      color: #065F46;
      line-height: 1;
    }
    .garantia-item-tipo {
      font-size: 9px;
      font-weight: 800;
      color: #166534;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .garantia-item-sub {
      font-size: 7.5px;
      color: #6B7280;
    }

    .faixa-monitoramento {
      background: #111827;
      color: #FFFFFF;
      border-radius: 10px;
      padding: 10px 14px;
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .faixa-monitoramento-title {
      font-size: 11px;
      font-weight: 900;
      color: #34D399;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .faixa-monitoramento-desc {
      font-size: 8.5px;
      color: #D1D5DB;
    }

    /* ==========================================================
       SEÇÃO 4 — PROJEÇÃO DE ECONOMIA NA CONTA (TABELA 2026-2051)
       ========================================================== */
    .tabela-projecao-scroll {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.5px;
      margin: 8px 0;
    }
    .tabela-projecao-scroll th {
      background: #064E3B;
      color: #FFFFFF;
      padding: 4px 5px;
      text-align: right;
      font-size: 7.5px;
      font-weight: 800;
      border: 1px solid #064E3B;
    }
    .tabela-projecao-scroll th:first-child,
    .tabela-projecao-scroll td:first-child {
      text-align: center;
    }
    .tabela-projecao-scroll td {
      padding: 3px 5px;
      border: 1px solid #D1D5DB;
      text-align: right;
    }
    .tabela-projecao-scroll tr:nth-child(even) td {
      background: #F9FAFB;
    }
    .tabela-projecao-scroll tr.destaque-5anos td {
      background: #FEF3C7;
      font-weight: 700;
    }
    .tabela-projecao-scroll tr.destaque-25anos td {
      background: #DCFCE7;
      font-weight: 800;
    }
    .destaque-verde {
      color: #166534;
      font-weight: 800;
    }
    .destaque-vermelho {
      color: #DC2626;
      font-weight: 800;
    }

    /* ==========================================================
       SEÇÃO 5 — PROJEÇÃO EM 25 ANOS (CURVAS & PAYBACK)
       ========================================================== */
    .grafico-curvas-box {
      background: #FFFFFF;
      border: 1.5px solid #E5E7EB;
      border-radius: 12px;
      padding: 10px 12px;
      margin: 8px 0;
    }
    .grafico-legendas {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5px;
      margin-bottom: 6px;
      border-bottom: 1px dashed #E5E7EB;
      padding-bottom: 6px;
    }
    .leg-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .leg-cor {
      width: 14px;
      height: 4px;
      border-radius: 2px;
    }
    .leg-cor.red {
      background: #DC2626;
    }
    .leg-cor.green {
      background: #16A34A;
    }

    .cards-metricas-25anos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 10px;
    }
    .card-metrica-destaque {
      background: #F0FDF4;
      border: 1.5px solid #86EFAC;
      border-radius: 10px;
      padding: 10px 12px;
      text-align: center;
    }
    .card-metrica-label {
      font-size: 8.5px;
      font-weight: 800;
      color: #065F46;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .card-metrica-numero {
      font-size: 21px;
      font-weight: 900;
      color: #166534;
      margin: 2px 0;
      line-height: 1.1;
    }
    .card-metrica-sub {
      font-size: 8px;
      color: #4B5563;
    }

    /* ==========================================================
       SEÇÃO 6 — INVESTIMENTO & CONDIÇÕES DE PAGAMENTO
       ========================================================== */
    .hero-investimento-banner {
      background: linear-gradient(135deg, #065F46 0%, #166534 100%);
      color: #FFFFFF;
      border-radius: 12px;
      padding: 12px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .hero-invest-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #A7F3D0;
    }
    .hero-invest-valor {
      font-size: 28px;
      font-weight: 900;
      color: #FACC15;
      line-height: 1;
      margin-top: 2px;
    }
    .hero-invest-sub {
      font-size: 9px;
      color: #D1FAE5;
    }

    .grid-pagamento-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .card-pagamento {
      border: 1.5px solid #E5E7EB;
      border-radius: 10px;
      background: #FFFFFF;
      padding: 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
    }
    .card-pagamento.destaque-verde {
      border-color: #16A34A;
      background: #F0FDF4;
      box-shadow: 0 2px 8px rgba(22, 163, 74, 0.12);
    }
    .card-pagamento-tag {
      font-size: 7.5px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 9999px;
      display: inline-block;
      margin: 0 auto 4px auto;
      background: #E5E7EB;
      color: #374151;
    }
    .card-pagamento.destaque-verde .card-pagamento-tag {
      background: #16A34A;
      color: #FFFFFF;
    }
    .card-pagamento-titulo {
      font-size: 10px;
      font-weight: 900;
      color: #111827;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .card-pagamento-valor {
      font-size: 14px;
      font-weight: 900;
      color: #065F46;
      margin: 4px 0 2px 0;
      line-height: 1.15;
    }
    .card-pagamento-desc {
      font-size: 8px;
      color: #6B7280;
      margin-bottom: 6px;
    }
    .card-pagamento-badge-sub {
      font-size: 8px;
      font-weight: 700;
      color: #166534;
      background: #DCFCE7;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid #86EFAC;
    }

    .linha-comparativa-pagamento {
      background: #FFFFFF;
      border: 1.5px solid #16A34A;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .linha-comp-texto strong.red {
      color: #DC2626;
    }
    .linha-comp-texto strong.green {
      color: #16A34A;
    }

    .badge-urgencia-validade {
      background: #FEF3C7;
      border: 1.5px solid #F59E0B;
      color: #78350F;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 9.5px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .assinaturas-grid-final {
      border-top: 1.5px solid #E5E7EB;
      padding-top: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      font-size: 8.5px;
    }
    .linha-assinatura-final {
      border-bottom: 1px solid #111827;
      margin-bottom: 4px;
      width: 90%;
    }

    /* REGRAS DE IMPRESSÃO PURA */
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
      .proposta-secao-page {
        margin: 0 !important;
        padding: 8mm 10mm 8mm 10mm !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        height: 297mm !important;
        max-height: 297mm !important;
        overflow: hidden !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .proposta-secao-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>

  <!-- BARRA DE AÇÃO FORA DA IMPRESSÃO -->
  <div class="no-print-bar">
    <div class="no-print-bar-info">
      <strong>Proposta Comercial Oficial Delfos Solar (6 Seções Exclusivas)</strong>
      <span>Layout 100% alinhado à interface comercial • Capa • Inércia • Sistema • Projeção Conta • Projeção 25 Anos • Pagamento</span>
    </div>
    <button class="btn-action-print" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Salvar em PDF / Imprimir (6 Seções)
    </button>
  </div>

  <div class="proposta-container">

    <!-- ========================================================
         SEÇÃO 1 — CAPA
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-1-capa">
      <div class="secao-body">
        <div class="capa-wrapper">
          <div class="capa-top">
            <div class="capa-badge">
              <span>✦</span> Proposta Comercial Exclusiva
            </div>
            <div class="capa-logo-card">
              ${renderLogoSvg('capa')}
            </div>
          </div>

          <div class="capa-middle">
            <div class="capa-prep-tag">Proposta preparada para</div>
            <h1 class="capa-cliente-nome">${nomeCliente}</h1>
            <p class="capa-frase-destaque">
              Economize ${formatBRL(economiaMensal)} por mês com sua própria usina solar
            </p>
            <p class="capa-subtitulo">
              Independência energética projetada exclusivamente para você
            </p>

            <div class="capa-pills-row">
              <div class="capa-pill">
                <div class="capa-pill-label">Potência Total</div>
                <div class="capa-pill-val">${formatNumBR(potenciaKwp, 2)} kWp</div>
              </div>
              <div class="capa-pill">
                <div class="capa-pill-label">Geração Média Estimada</div>
                <div class="capa-pill-val">${formatNumBR(producao.mediaMensalKwh, 0)} kWh/mês</div>
              </div>
              <div class="capa-pill">
                <div class="capa-pill-label">Retorno do Investimento</div>
                <div class="capa-pill-val">${paybackTextoFinal}</div>
              </div>
            </div>
          </div>

          <div class="capa-bottom">
            <div class="capa-bottom-info">
              <span>Consultor Responsável:</span> <strong>${consultorNome}</strong> • ${consultorContato}
            </div>
            <div class="capa-bottom-info" style="text-align: right;">
              <span>Data da Proposta:</span> <strong>${dataFormatada}</strong> • Validade: <strong>${validade} dias</strong>
            </div>
          </div>
        </div>
      </div>
      ${renderInternalFooter(1)}
    </section>

    <!-- ========================================================
         SEÇÃO 2 — O CUSTO DA INÉRCIA
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-2-custo-inercia">
      <div class="secao-body">
        ${renderInternalHeader('O Custo da Inércia (Diagnóstico Visual)', 2, 'inercia')}

        <div class="secao-titulo-bloco">
          <h2>O quanto você já perdeu sem solar?</h2>
          <p>Comparativo real entre continuar pagando boletos à concessionária e ter sua própria usina gerando economia.</p>
        </div>

        <table class="tabela-inercia">
          <thead>
            <tr>
              <th style="width: 20%;">Período</th>
              <th style="width: 40%;">Sua Conta de Luz Sem Solar (Desperdício)</th>
              <th style="width: 40%;">Com Energia Solar Delfos (Investimento + Economia)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1 ano</strong> (Curto Prazo)</td>
              <td class="td-sem-solar">${formatBRL(gasto1Ano)} pagos à concessionária</td>
              <td class="td-com-solar">${formatBRL(eco1Ano)} economizados</td>
            </tr>
            <tr>
              <td><strong>5 anos</strong> (Payback Quitado)</td>
              <td class="td-sem-solar">${formatBRL(gasto5Anos)} jogados fora</td>
              <td class="td-com-solar">${formatBRL(eco5Anos)} sobram no seu bolso</td>
            </tr>
            <tr>
              <td><strong>25 anos</strong> (Vida Útil)</td>
              <td class="td-sem-solar">${formatBRL(gasto25Anos)} sem qualquer retorno</td>
              <td class="td-com-solar">${formatBRL(eco25Anos)} de patrimônio acumulado</td>
            </tr>
          </tbody>
        </table>

        <!-- BOX VERMELHO EXATO SOLICITADO -->
        <div class="box-vermelho-alerta">
          <div class="box-vermelho-tag">⚠️ Diagnóstico Financeiro de Perda Acumulada</div>
          <p class="box-vermelho-texto">
            Sem solar, em 5 anos você pagará ${formatBRL(gasto5Anos)}. Esse dinheiro poderia estar no seu bolso.
          </p>
          <div class="box-vermelho-sub">
            Gasto sem retorno com sucessivos reajustes tarifários e bandeiras tarifárias da distribuidora.
          </div>
        </div>

        <!-- LINHA REFLEXIVA EXATA SOLICITADA -->
        <div class="box-linha-reflexiva">
          <div class="icon-patrimonio">✦</div>
          <div style="font-size: 10.5px; line-height: 1.4;">
            <div>
              Hoje você paga <strong>${formatBRL(contaHoje)}</strong> para a concessionária e <strong>não recebe nada em troca</strong>.
            </div>
            <div style="color: #166534; font-weight: 800; margin-top: 2px;">
              Com solar, você investe e o sistema passa a ser seu patrimônio.
            </div>
          </div>
        </div>
      </div>
      ${renderInternalFooter(2)}
    </section>

    <!-- ========================================================
         SEÇÃO 3 — SEU SISTEMA FOTOVOLTAICO
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-3-seu-sistema">
      <div class="secao-body">
        ${renderInternalHeader('Seu Sistema Fotovoltaico', 3, 'sistema')}

        <div class="secao-titulo-bloco">
          <h2>Conheça sua usina solar</h2>
          <p>Equipamentos de alta performance Tier-1 com homologação completa e engenharia própria Delfos Solar.</p>
        </div>

        <div class="grid-sistema-cards">
          <!-- Card 1: Potência -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <span class="card-sistema-icon">⚡</span>
              <span class="card-sistema-tag emerald">Capacidade Nominal</span>
            </div>
            <div>
              <div class="card-sistema-label">Potência do Sistema</div>
              <div class="card-sistema-valor">${formatNumBR(potenciaKwp, 2)} kWp</div>
              <div class="card-sistema-sub">Potência total instalada com tecnologia de ponta.</div>
            </div>
          </div>

          <!-- Card 2: Geração -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <span class="card-sistema-icon">📈</span>
              <span class="card-sistema-tag emerald">Alta Produção</span>
            </div>
            <div>
              <div class="card-sistema-label">Geração Estimada</div>
              <div class="card-sistema-valor" style="color: #16A34A;">${formatNumBR(producao.mediaMensalKwh, 0)} kWh/mês</div>
              <div class="card-sistema-sub">Economia estimada de <strong>${formatBRL(economiaMensal)}/mês</strong>.</div>
            </div>
          </div>

          <!-- Card 3: Módulos -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <span class="card-sistema-icon">☀️</span>
              <span class="card-sistema-tag blue">Tier-1 Global</span>
            </div>
            <div>
              <div class="card-sistema-label">Módulos Fotovoltaicos</div>
              <div class="card-sistema-valor">${modulosQtd} unidades</div>
              <div class="card-sistema-sub"><strong>${modulosDesc}</strong> (${modulosWp}W cada • ${modulosTecnologia}).</div>
            </div>
          </div>

          <!-- Card 4: Inversor -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <span class="card-sistema-icon">🔌</span>
              <span class="card-sistema-tag emerald">${inversorQtd} Inversor(es)</span>
            </div>
            <div>
              <div class="card-sistema-label">Inversor Solar</div>
              <div class="card-sistema-valor" style="font-size: 15px;">${inversorDesc}</div>
              <div class="card-sistema-sub">${inversorMppt} MPPT • Potência: ${inversorKw} kW.</div>
            </div>
          </div>

          <!-- Card 5: Área -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <span class="card-sistema-icon">📐</span>
              <span class="card-sistema-tag amber">Telhado / Solo</span>
            </div>
            <div>
              <div class="card-sistema-label">Área Necessária</div>
              <div class="card-sistema-valor">${formatNumBR(areaM2, 1)} m²</div>
              <div class="card-sistema-sub">Área útil para fixação otimizada dos painéis.</div>
            </div>
          </div>

          <!-- Card 6: Instalação Delfos -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <span class="card-sistema-icon">🛡️</span>
              <span class="card-sistema-tag emerald">Engenharia Própria</span>
            </div>
            <div>
              <div class="card-sistema-label">Garantia Instalação</div>
              <div class="card-sistema-valor" style="color: #065F46;">${garantiaInstalacao}</div>
              <div class="card-sistema-sub">Garantia integral sobre mão de obra, cabos e ART.</div>
            </div>
          </div>
        </div>

        <!-- FAIXA DE GARANTIAS TRIPLA -->
        <div class="faixa-garantias-tripla">
          <div style="font-size: 10px; font-weight: 900; color: #064E3B; text-transform: uppercase;">
            ✦ Tranquilidade e Garantias Asseguradas
          </div>
          <div class="garantias-tripla-grid">
            <div class="garantia-item-bloco">
              <div class="garantia-item-anos">${garantiaModulos} ANOS</div>
              <div class="garantia-item-tipo">Módulos Solares</div>
              <div class="garantia-item-sub">Garantia linear de performance</div>
            </div>
            <div class="garantia-item-bloco">
              <div class="garantia-item-anos">${garantiaInversor} ANOS</div>
              <div class="garantia-item-tipo">Inversor Solar</div>
              <div class="garantia-item-sub">Garantia de fábrica homologada</div>
            </div>
            <div class="garantia-item-bloco">
              <div class="garantia-item-anos">${garantiaInstalacao}</div>
              <div class="garantia-item-tipo">Instalação Delfos</div>
              <div class="garantia-item-sub">Engenharia e pós-venda direto</div>
            </div>
          </div>
        </div>

        <!-- FAIXA MONITORAMENTO 24/7 -->
        <div class="faixa-monitoramento">
          <div>
            <div class="faixa-monitoramento-title">📱 Monitoramento Inteligente 24/7 pelo Smartphone</div>
            <div class="faixa-monitoramento-desc">
              Acompanhe geração diária em tempo real, curva solar em kWh, economia mensal acumulada e status do gerador de onde estiver.
            </div>
          </div>
          <div style="font-size: 10px; font-weight: 800; color: #A7F3D0; white-space: nowrap;">
            App iOS & Android Inclusos
          </div>
        </div>
      </div>
      ${renderInternalFooter(3)}
    </section>

    <!-- ========================================================
         SEÇÃO 4 — PROJEÇÃO DE ECONOMIA NA CONTA DE ENERGIA (TABELA 2026-2051)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-4-projecao-economia">
      <div class="secao-body">
        ${renderInternalHeader('Projeção de Economia na Conta de Energia', 4, 'projecao')}

        <div class="secao-titulo-bloco">
          <h2>Projeção de Economia na Conta de Energia (2026–2051)</h2>
          <p>Aplicação oficial do Marco Legal da GD (Lei 14.300/2022), Fator de Simultaneidade (${Math.round(projecaoOficial.fatorSimultaneidade * 100)}%), Fio B e degradação linear dos painéis (LID 2% + 0,55% a.a.).</p>
        </div>

        <table class="tabela-projecao-scroll">
          <thead>
            <tr>
              <th style="width: 7%;">Ano</th>
              <th style="width: 14%;">Tarifa (R$/kWh)</th>
              <th style="width: 14%;">Fio B (R$/kWh)</th>
              <th style="width: 15%;">GD Eco Líq. (R$/kWh)</th>
              <th style="width: 11%;">Degradação</th>
              <th style="width: 18%;">Economia no Ano</th>
              <th style="width: 21%;">Economia Acumulada</th>
            </tr>
          </thead>
          <tbody>
            ${projecaoOficial.linhas
              .map((l, idx) => {
                const classeDestaque =
                  idx === 4 ? 'destaque-5anos' : idx === 24 ? 'destaque-25anos' : ''
                return `
                <tr class="${classeDestaque}">
                  <td><strong>${l.ano}</strong></td>
                  <td>${formatNumBR(l.tarifaKwh, 4)}</td>
                  <td>${formatNumBR(l.fioBKwh, 4)}</td>
                  <td class="destaque-verde">${formatNumBR(l.gdEcoLiquidaKwh, 4)}</td>
                  <td>${(l.fatorDegradacao * 100).toFixed(1)}%</td>
                  <td class="destaque-verde">${formatBRL(l.economiaAnual)}</td>
                  <td class="destaque-verde" style="font-weight: 800;">${formatBRL(l.economiaAcumulada)}</td>
                </tr>
              `
              })
              .join('')}
          </tbody>
        </table>

        <div style="font-size: 8px; color: #6B7280; text-align: right; margin-top: 4px;">
          * Simulação calculada sobre consumo anual de <strong>${formatNumBR(consumoKwhAnoEstimado, 2)} kWh/ano</strong>.
        </div>
      </div>
      ${renderInternalFooter(4)}
    </section>

    <!-- ========================================================
         SEÇÃO 5 — PROJEÇÃO DE ECONOMIA EM 25 ANOS (CURVAS & PAYBACK)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-5-projecao-25anos">
      <div class="secao-body">
        ${renderInternalHeader('Projeção de Economia em 25 Anos', 5, 'curvas')}

        <div class="secao-titulo-bloco">
          <h2>Sua economia ao longo do tempo</h2>
          <p>Veja o quanto você vai economizar ao longo da vida útil do sistema solar em comparação com o dinheiro pago à concessionária.</p>
        </div>

        <!-- GRÁFICO VETORIAL DE DUAS CURVAS + MARCADOR NO PAYBACK -->
        <div class="grafico-curvas-box">
          <div class="grafico-legendas">
            <div class="leg-item">
              <span class="leg-cor red"></span>
              <strong>Gasto acumulado sem solar:</strong> conta de luz + reajustes anuais
            </div>
            <div class="leg-item">
              <span class="leg-cor green"></span>
              <strong>Investimento + economia com solar:</strong> sistema quitado + taxa mínima da concessionária
            </div>
            <div style="font-weight: 800; color: #92400E; background: #FEF3C7; padding: 2px 7px; border-radius: 4px; border: 1px solid #FCD34D;">
              Payback no cruzamento: ${paybackTextoFinal}
            </div>
          </div>

          <div style="width: 100%; height: 210px;">
            <svg viewBox="0 0 700 220" style="width: 100%; height: 100%; overflow: visible;" xmlns="http://www.w3.org/2000/svg">
              <!-- Grade de fundo -->
              <line x1="55" y1="30" x2="655" y2="30" stroke="#E5E7EB" stroke-dasharray="3 3" />
              <line x1="55" y1="70" x2="655" y2="70" stroke="#E5E7EB" stroke-dasharray="3 3" />
              <line x1="55" y1="110" x2="655" y2="110" stroke="#E5E7EB" stroke-dasharray="3 3" />
              <line x1="55" y1="150" x2="655" y2="150" stroke="#E5E7EB" stroke-dasharray="3 3" />
              <line x1="55" y1="190" x2="655" y2="190" stroke="#D1D5DB" stroke-width="1.5" />
              <line x1="55" y1="20" x2="55" y2="190" stroke="#D1D5DB" stroke-width="1.5" />

              <!-- Eixo Y Labels -->
              <text x="50" y="34" text-anchor="end" font-size="8" fill="#6B7280">${formatBRL(maxVal)}</text>
              <text x="50" y="114" text-anchor="end" font-size="8" fill="#6B7280">${formatBRL(maxVal * 0.5)}</text>
              <text x="50" y="193" text-anchor="end" font-size="8" fill="#6B7280">R$ 0</text>

              <!-- Eixo X Labels -->
              <text x="55" y="204" text-anchor="middle" font-size="8" fill="#6B7280">2026</text>
              <text x="175" y="204" text-anchor="middle" font-size="8" fill="#6B7280">2031 (5a)</text>
              <text x="295" y="204" text-anchor="middle" font-size="8" fill="#6B7280">2036 (10a)</text>
              <text x="415" y="204" text-anchor="middle" font-size="8" fill="#6B7280">2041 (15a)</text>
              <text x="535" y="204" text-anchor="middle" font-size="8" fill="#6B7280">2046 (20a)</text>
              <text x="655" y="204" text-anchor="middle" font-size="8" fill="#6B7280">2051 (25a)</text>

              <!-- Curva Vermelha: Gasto sem solar -->
              <polyline fill="none" stroke="#DC2626" stroke-width="2.8" points="${pontosVermelho}" />

              <!-- Curva Verde: Com solar -->
              <polyline fill="none" stroke="#16A34A" stroke-width="2.8" points="${pontosVerde}" />

              <!-- Marcador de Payback no cruzamento -->
              <line x1="${xPayback}" y1="20" x2="${xPayback}" y2="190" stroke="#F59E0B" stroke-width="1.8" stroke-dasharray="4 3" />
              <circle cx="${xPayback}" y="${yPayback}" r="6" fill="#F59E0B" stroke="#FFFFFF" stroke-width="2" />
              <rect x="${Math.max(55, Number(xPayback) - 60)}" y="12" width="120" height="20" rx="4" fill="#FEF3C7" stroke="#F59E0B" />
              <text x="${xPayback}" y="25" text-anchor="middle" font-size="8.5" font-weight="900" fill="#92400E">Payback: ${paybackTextoFinal} (${anoPayback})</text>
            </svg>
          </div>
        </div>

        <!-- 3 CARDS DE MÉTRICAS EXATOS -->
        <div class="cards-metricas-25anos">
          <div class="card-metrica-destaque">
            <div class="card-metrica-label">Economia Total Acumulada</div>
            <div class="card-metrica-numero">${formatBRL(eco25Anos)}</div>
            <div class="card-metrica-sub">Retorno líquido direto em 25 anos de vida útil</div>
          </div>
          <div class="card-metrica-destaque">
            <div class="card-metrica-label">Tempo de Retorno (Payback)</div>
            <div class="card-metrica-numero" style="color: #065F46;">${paybackTextoFinal}</div>
            <div class="card-metrica-sub">Ano estimado do cruzamento: ${anoPayback}</div>
          </div>
          <div class="card-metrica-destaque">
            <div class="card-metrica-label">Retorno Sobre Investimento (ROI)</div>
            <div class="card-metrica-numero" style="color: #2563EB;">${roiCalculado}%</div>
            <div class="card-metrica-sub">Multiplicação patrimonial com o gerador solar</div>
          </div>
        </div>
      </div>
      ${renderInternalFooter(5)}
    </section>

    <!-- ========================================================
         SEÇÃO 6 — INVESTIMENTO E CONDIÇÕES DE PAGAMENTO
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-6-investimento-pagamento">
      <div class="secao-body">
        ${renderInternalHeader('Investimento e Condições de Pagamento', 6, 'investimento')}

        <!-- HERO DO INVESTIMENTO TOTAL -->
        <div class="hero-investimento-banner">
          <div>
            <div class="hero-invest-label">Seu Investimento</div>
            <div class="hero-invest-valor">${formatBRL(investimentoTotal)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase;">
              Investimento único — o sistema é seu
            </div>
            <div class="hero-invest-sub">Projeto Turnkey completo homologado junto à concessionária</div>
          </div>
        </div>

        <!-- 4 CARDS DE PAGAMENTO LADO A LADO -->
        <div class="grid-pagamento-4">
          <!-- Card 1: À Vista -->
          <div class="card-pagamento destaque-verde">
            <div>
              <span class="card-pagamento-tag">Melhor condição</span>
              <div class="card-pagamento-titulo">À VISTA</div>
              <div class="card-pagamento-valor">${formatBRL(aVistaValor)}</div>
              <div class="card-pagamento-desc">Desconto de 5% aplicado</div>
            </div>
            <div class="card-pagamento-badge-sub">
              Economia de ${formatBRL(aVistaDesconto)}
            </div>
          </div>

          <!-- Card 2: Cartão -->
          <div class="card-pagamento">
            <div>
              <span class="card-pagamento-tag">Sem burocracia</span>
              <div class="card-pagamento-titulo">CARTÃO</div>
              <div class="card-pagamento-valor">${cartaoParcelas}x de ${formatBRL(cartaoValor)}</div>
              <div class="card-pagamento-desc">Direto na maquininha de cartão</div>
            </div>
            <div class="card-pagamento-badge-sub" style="background: #EFF6FF; color: #1E40AF; border-color: #BFDBFE;">
              Parcele em até ${cartaoParcelas}x sem juros
            </div>
          </div>

          <!-- Card 3: Financiamento A -->
          <div class="card-pagamento">
            <div>
              <span class="card-pagamento-tag">Menor parcela</span>
              <div class="card-pagamento-titulo">${finanANome}</div>
              <div class="card-pagamento-valor">${finanAParcelas}x de ${formatBRL(finanAValor)}</div>
              <div class="card-pagamento-desc">Entrada de ${formatBRL(finanAEntrada)}</div>
            </div>
            <div class="card-pagamento-badge-sub" style="background: #FEF3C7; color: #92400E; border-color: #FDE68A;">
              Linha bancária facilitada
            </div>
          </div>

          <!-- Card 4: Financiamento B -->
          <div class="card-pagamento">
            <div>
              <span class="card-pagamento-tag">Maior prazo</span>
              <div class="card-pagamento-titulo">${finanBNome}</div>
              <div class="card-pagamento-valor">${finanBParcelas}x de ${formatBRL(finanBValor)}</div>
              <div class="card-pagamento-desc">Entrada de ${formatBRL(finanBEntrada)}</div>
            </div>
            <div class="card-pagamento-badge-sub" style="background: #F3E8FF; color: #6B21A8; border-color: #E9D5FF;">
              Prazo estendido até ${finanBParcelas} meses
            </div>
          </div>
        </div>

        <!-- LINHA COMPARATIVA PARCELA VS CONTA ATUAL -->
        <div class="linha-comparativa-pagamento">
          <div class="linha-comp-texto" style="font-size: 10px; line-height: 1.4;">
            <div>
              Hoje você paga <strong class="red">${formatBRL(contaHoje)}</strong> de energia para a concessionária.
            </div>
            <div style="margin-top: 2px;">
              Com solar, sua parcela do financiamento é <strong class="green" style="font-size: 11px;">${formatBRL(parcelaComparativa)}</strong> — e o sistema passa a ser seu patrimônio.
            </div>
          </div>
          <div style="font-size: 9px; font-weight: 800; color: #166534; background: #DCFCE7; padding: 4px 8px; border-radius: 6px; white-space: nowrap; border: 1px solid #86EFAC;">
            Troque despesa por patrimônio
          </div>
        </div>

        <!-- BADGE DE URGÊNCIA -->
        <div class="badge-urgencia-validade">
          <span>⏰ Condições comerciais válidas por <strong>${validade} dias corridos</strong> (${dataFormatada}). Reserve sua usina agora.</span>
          <span style="text-transform: uppercase; font-size: 9px;">Garantia de Preço Delfos</span>
        </div>

        ${
          observacoes
            ? `
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 6px 10px; font-size: 8.5px; color: #4B5563; margin-bottom: 10px;">
          <strong>Observações Comerciais:</strong> ${observacoes}
        </div>
        `
            : ''
        }

        <!-- TERMO DE ACEITE & ASSINATURA -->
        <div class="assinaturas-grid-final">
          <div>
            <strong>Delfos Engenharia Ltda (Delfos Solar)</strong><br />
            CNPJ: ${empresa?.cnpj || '21.379.952/0001-38'}<br />
            Responsável Técnico: <strong>${empresa?.responsavelTecnico || 'João Victor Bagetti Fuchs'}</strong> (${empresa?.crea || 'CREA RS151894'})<br />
            ${empresa?.endereco || 'Rua Espírito Santo, nº 275 – Erechim / RS'}
          </div>

          <div style="display: flex; flex-direction: column; justify-content: flex-end; align-items: center; text-align: center;">
            <div class="linha-assinatura-final"></div>
            <strong style="text-transform: uppercase;">${nomeCliente}</strong>
            <span style="color: #6B7280; font-size: 8px;">
              CPF/CNPJ: ${cliente?.cpfOuCnpj || '________________________________'}
            </span>
            <span style="color: #9CA3AF; font-size: 7.5px; margin-top: 2px;">De acordo com os termos e especificações</span>
          </div>
        </div>
      </div>
      ${renderInternalFooter(6)}
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
  const safeName = (dados?.cliente?.nome || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_')
  const a = document.createElement('a')
  a.href = url
  a.download = `Proposta_Comercial_${safeName}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

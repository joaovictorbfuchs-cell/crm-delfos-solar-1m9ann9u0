import type { GeracaoMensalItem } from '@/lib/energiaSolar'
import { calcularProjecaoEconomia } from '@/lib/calculoProjecaoEconomia'
import { CONSUMO_EXEMPLO_PADRAO_KWH_ANO } from '@/data/planilhaBaseProjecao'
import { formatarMesAnoQuitacao } from '@/lib/formatters'
import { onGridPngAsset, monitoramentoPngAsset } from './propostaIlustracoesAssets'

export interface FotoInstalacaoProposta {
  id: string
  titulo: string
  url: string
  cidade?: string
  potenciaKwp?: number
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
  instalacoesSelecionadasIds?: string[]
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
    fotoModuloUrl?: string
    mpptInversor?: number | string
    potenciaInversorKw?: number
    fotoInversorUrl?: string
  }
  garantias: {
    paineisAnosFabricacao: number // ex: 15
    paineisAnosDesempenho: number // ex: 30
    paineisPercentualDesempenho: string // ex: "84,80%"
    inversorAnosFabricacao: number // ex: 10
    instalacaoAnos: number // ex: 1
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
      entrada?: number
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
    gastoSemSolarPaybackAnos?: number
    anosPaybackArredondado?: number
    gastoSemSolar25Anos: number
    economia1Ano: number
    economia5Anos: number
    economia25Anos: number
    economia1Mes: number
    contaSemSolar4AnosComReajuste?: number
    contaComSolar4AnosComReajuste?: number
    contaSemSolar10AnosComReajuste?: number
    contaComSolar10AnosComReajuste?: number
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
        <span class="tag-secao">SEÇÃO ${numeroSecao} DE 5</span>
        <span class="tag-desc">${secaoTitulo}</span>
      </div>
    </header>
  `
}

/**
 * Rodapé recorrente para todas as seções.
 */
function renderInternalFooter(numeroSecao?: number, validadeDias?: number): string {
  const hasValidade = typeof validadeDias === 'number' && validadeDias > 0
  const validadeLinha = hasValidade
    ? `<div class="doc-footer-validade-bar">Proposta válida por ${validadeDias} dias.</div>`
    : ''

  return `
    <footer class="doc-footer">
      <div class="doc-footer-main-row">
        <div class="doc-footer-item-left">
          <div class="doc-footer-logo-card">
            ${renderLogoSvg('ftr-' + (numeroSecao || 'def'))}
          </div>
          <span>Delfos Engenharia Solar | CNPJ 21.379.952/0001-38</span>
        </div>
        <div class="doc-footer-sep">•</div>
        <div class="doc-footer-item-phone">
          <svg class="doc-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
          </svg>
          <span>(54) 99129-2121</span>
        </div>
        <div class="doc-footer-sep">•</div>
        <div class="doc-footer-item-site">
          <svg class="doc-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>www.delfos.eng.br</span>
        </div>
        <div class="doc-footer-sep">•</div>
        <div class="doc-footer-item-address">
          <svg class="doc-footer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span>Rua Espírito Santo, 275 – Centro, Erechim/RS</span>
        </div>
      </div>
      ${validadeLinha}
    </footer>
  `
}

/**
 * Gera o documento HTML oficial da Proposta Comercial Delfos Solar
 * com exatamente as 5 SEÇÕES NOVAS aprovadas pelo usuário:
 *
 * 1. Capa (logo Delfos, cliente, potência kWp, geração, consultor, data)
 * 2. Situação Atual (consumo/custo mensal e anual + comparativo 1/5/25 anos + box vermelho + linha reflexiva)
 * 3. Seu Sistema Fotovoltaico (cards potência, geração, módulos, inversor, área, garantias 30a/10a/Delfos, faixa 24/7)
 * 4. Projeção de Economia em 25 Anos (curvas gasto sem solar vs investimento/economia + marcador payback + cards)
 * 5. Investimento e Condições de Pagamento (cards À vista / Cartão / Finan A / Finan B + comparativo conta + custo postergação + badge validade)
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

  // Custo anual atual da conta de energia
  const contaAnualEstimada =
    projecao?.gastoSemSolar1Ano && projecao.gastoSemSolar1Ano > 0
      ? projecao.gastoSemSolar1Ano
      : Math.round(contaHoje * 12)

  // Consumo mensal e anual da Situação Atual (Regra de Negócio: consumo = geração real)
  const consumoKwhMesReal =
    producao?.mediaMensalKwh && producao.mediaMensalKwh > 0
      ? producao.mediaMensalKwh
      : Math.round(contaHoje / 0.95)

  const consumoKwhAnoReal =
    producao?.anualKwh && producao.anualKwh > 0
      ? producao.anualKwh
      : Math.round(consumoKwhMesReal * 12)

  const investimentoTotal = economia?.investimentoTotal || parcelamento?.aVista?.valorTotal || 45000

  // Payback
  const paybackMesesCalculado =
    economia?.paybackMeses && economia.paybackMeses > 0
      ? economia.paybackMeses
      : economiaMensal > 0
        ? Math.round((investimentoTotal / economiaMensal) * 10) / 10
        : 50

  // Anos de payback arredondados PARA CIMA até fechar um ano inteiro (ex: 22 meses -> 2 anos; 25 meses -> 3 anos)
  const anosPaybackArredondado = (() => {
    if (projecao?.anosPaybackArredondado && projecao.anosPaybackArredondado > 0) {
      return Math.max(1, Math.round(projecao.anosPaybackArredondado))
    }
    if (paybackMesesCalculado > 0) {
      return Math.max(1, Math.ceil(paybackMesesCalculado / 12))
    }
    return 5
  })()

  // Valores de inércia
  const gasto1Ano =
    projecao?.gastoSemSolar1Ano && projecao.gastoSemSolar1Ano > 0
      ? projecao.gastoSemSolar1Ano
      : Math.round(contaHoje * 12 * 1.045)
  const gasto5Anos =
    projecao?.gastoSemSolar5Anos && projecao.gastoSemSolar5Anos > 0
      ? projecao.gastoSemSolar5Anos
      : Math.round(gasto1Ano * 5.8)

  // Gasto acumulado no período do payback arredondado (card do meio)
  const gastoCardMeio = (() => {
    if (
      projecao?.gastoSemSolarPaybackAnos &&
      projecao.gastoSemSolarPaybackAnos > 0 &&
      (!projecao.anosPaybackArredondado ||
        projecao.anosPaybackArredondado === anosPaybackArredondado)
    ) {
      return projecao.gastoSemSolarPaybackAnos
    }
    if (anosPaybackArredondado === 5 && gasto5Anos > 0) {
      return gasto5Anos
    }
    if (anosPaybackArredondado === 1 && gasto1Ano > 0) {
      return gasto1Ano
    }
    let acumulado = 0
    for (let ano = 0; ano < anosPaybackArredondado; ano++) {
      acumulado += contaAnualEstimada * Math.pow(1 + 0.09, ano)
    }
    return Math.round(acumulado)
  })()

  const rotuloPeriodoCardMeio =
    anosPaybackArredondado === 1 ? '1 Ano' : `${anosPaybackArredondado} Anos`
  const tituloCardMeio = `Gasto em ${rotuloPeriodoCardMeio}`
  const totalMesesCardMeio = anosPaybackArredondado * 12
  const mediaMensalCardMeio = Math.round(gastoCardMeio / totalMesesCardMeio)

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

  // Cálculo da projeção completa 2026-2051 via lib oficial (paridade total consumo = geração)
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
  const cartaoEntrada =
    parcelamento?.cartao18x?.entrada !== undefined && parcelamento.cartao18x.entrada !== null
      ? Math.max(0, parcelamento.cartao18x.entrada)
      : 0
  const cartaoValor =
    parcelamento?.cartao18x?.valorParcela ||
    Math.round(Math.max(0, investimentoTotal - cartaoEntrada) / cartaoParcelas)
  const cartaoContaSemSolar =
    parcelamento?.cartao18x?.contaHoje !== undefined ? parcelamento.cartao18x.contaHoje : contaHoje
  const cartaoContaComSolar =
    parcelamento?.cartao18x?.contaComSolar !== undefined ? parcelamento.cartao18x.contaComSolar : 70
  const cartaoDesembolso = cartaoValor + cartaoContaComSolar

  const finanANome = parcelamento?.financiamentoA?.nome || 'Financiamento A'
  const finanAParcelas = parcelamento?.financiamentoA?.numeroParcelas || 60
  const finanAEntrada =
    parcelamento?.financiamentoA?.entrada !== undefined &&
    parcelamento.financiamentoA.entrada !== null
      ? Math.max(0, parcelamento.financiamentoA.entrada)
      : 0
  const finanAValor =
    parcelamento?.financiamentoA?.valorParcela ||
    Math.round(((investimentoTotal - finanAEntrada) * 1.35) / finanAParcelas)
  const finanAContaSemSolar =
    parcelamento?.financiamentoA?.contaHoje !== undefined
      ? parcelamento.financiamentoA.contaHoje
      : contaHoje
  const finanAContaComSolar =
    parcelamento?.financiamentoA?.contaComSolar !== undefined
      ? parcelamento.financiamentoA.contaComSolar
      : 70
  const finanADesembolso = finanAValor + finanAContaComSolar

  const finanBNome = parcelamento?.financiamentoB?.nome || 'Financiamento B'
  const finanBParcelas = parcelamento?.financiamentoB?.numeroParcelas || 120
  const finanBEntrada =
    parcelamento?.financiamentoB?.entrada !== undefined &&
    parcelamento.financiamentoB.entrada !== null
      ? Math.max(0, parcelamento.financiamentoB.entrada)
      : 0
  const finanBValor =
    parcelamento?.financiamentoB?.valorParcela ||
    Math.round(((investimentoTotal - finanBEntrada) * 1.6) / finanBParcelas)
  const finanBContaSemSolar =
    parcelamento?.financiamentoB?.contaHoje !== undefined
      ? parcelamento.financiamentoB.contaHoje
      : contaHoje
  const finanBContaComSolar =
    parcelamento?.financiamentoB?.contaComSolar !== undefined
      ? parcelamento.financiamentoB.contaComSolar
      : 70
  const finanBDesembolso = finanBValor + finanBContaComSolar

  const menorParcela = Math.min(
    finanAValor > 0 ? finanAValor : Infinity,
    finanBValor > 0 ? finanBValor : Infinity,
  )
  const parcelaComparativa = menorParcela !== Infinity ? menorParcela : finanBValor

  // Projeção com reajuste tarifário de 9% ao ano (Concessionária)
  const contaSemSolar4AnosFinal =
    projecao?.contaSemSolar4AnosComReajuste !== undefined &&
    projecao.contaSemSolar4AnosComReajuste > 0
      ? projecao.contaSemSolar4AnosComReajuste
      : Math.round(contaHoje * Math.pow(1.09, 4))

  const contaPrimeiroMesComSolarBase =
    parcelamento?.aVista?.contaComSolar !== undefined ? parcelamento.aVista.contaComSolar : 70

  const contaComSolar4AnosFinal =
    projecao?.contaComSolar4AnosComReajuste !== undefined &&
    projecao.contaComSolar4AnosComReajuste > 0
      ? projecao.contaComSolar4AnosComReajuste
      : Math.round(contaPrimeiroMesComSolarBase * Math.pow(1.09, 4))

  const contaSemSolar10AnosFinal =
    projecao?.contaSemSolar10AnosComReajuste !== undefined &&
    projecao.contaSemSolar10AnosComReajuste > 0
      ? projecao.contaSemSolar10AnosComReajuste
      : Math.round(contaHoje * Math.pow(1.09, 10))

  const contaComSolar10AnosFinal =
    projecao?.contaComSolar10AnosComReajuste !== undefined &&
    projecao.contaComSolar10AnosComReajuste > 0
      ? projecao.contaComSolar10AnosComReajuste
      : Math.round(contaPrimeiroMesComSolarBase * Math.pow(1.09, 10))

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
  const garantiaModulosDesempenho = garantias?.paineisAnosDesempenho || 30
  const garantiaModulosFabricacao = garantias?.paineisAnosFabricacao || 15
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
  const quitacaoMesAno = formatarMesAnoQuitacao(dataProposta, paybackMesesCalculado)

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Proposta Comercial Delfos Solar - ${nomeCliente}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* ==========================================================
       SETUP DE IMPRESSÃO A4 COM 5 SEÇÕES PRECISAS
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

    /* RODAPÉ RECORRENTE PROFISSIONAL — CLEAN & MODERNO */
    .doc-footer {
      border-top: 1.5px solid #86EFAC;
      background: #F9FAFB;
      color: #374151;
      border-radius: 8px;
      padding: 6px 10px 5px 10px;
      margin-top: 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .doc-footer-main-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 7px;
      font-size: 8px;
      font-weight: 600;
      color: #374151;
      line-height: 1.25;
      text-align: center;
    }
    .doc-footer-item-left {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      color: #1F2937;
    }
    .doc-footer-logo-card {
      background: #FFFFFF;
      padding: 1px 4px;
      border-radius: 4px;
      display: inline-flex;
      align-items: center;
      height: 15px;
      width: 42px;
      border: 1px solid #E5E7EB;
    }
    .doc-footer-logo-card svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .doc-footer-item-phone {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #1F2937;
      font-weight: 700;
    }
    .doc-footer-item-site {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #065F46;
      font-weight: 700;
    }
    .doc-footer-item-address {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #374151;
    }
    .doc-footer-icon {
      width: 10.5px;
      height: 10.5px;
      color: #4ADE80;
      flex-shrink: 0;
    }
    .doc-footer-sep {
      color: #86EFAC;
      font-weight: 800;
      font-size: 8.5px;
    }
    .doc-footer-validade-bar {
      margin-top: 3px;
      text-align: center;
      font-size: 7.5px;
      font-weight: 500;
      color: #065F46;
      letter-spacing: 0.01em;
    }

    /* ==========================================================
       SEÇÃO 1 — CAPA
       ========================================================== */
    .capa-wrapper {
      background: linear-gradient(135deg, #071311 0%, #0b241c 45%, #04100d 100%);
      color: #FFFFFF;
      border-radius: 24px;
      padding: 28px 30px;
      border: 1px solid rgba(16, 185, 129, 0.4);
      position: relative;
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 255mm;
      box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5), inset 0 0 100px rgba(16, 185, 129, 0.12);
    }
    .capa-glow-top {
      position: absolute;
      top: -60px;
      left: -60px;
      width: 280px;
      height: 280px;
      border-radius: 9999px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, transparent 70%);
      pointer-events: none;
    }
    .capa-glow-right {
      position: absolute;
      top: 35%;
      right: -60px;
      width: 240px;
      height: 240px;
      border-radius: 9999px;
      background: radial-gradient(circle, rgba(245, 158, 11, 0.14) 0%, transparent 70%);
      pointer-events: none;
    }
    .capa-grid-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      opacity: 0.18;
      pointer-events: none;
    }
    .capa-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      position: relative;
      z-index: 2;
    }
    .capa-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(52, 211, 153, 0.35);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 800;
      color: #6EE7B7;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      backdrop-filter: blur(8px);
    }
    .capa-badge .sparkle {
      color: #FCD34D;
      font-size: 12px;
    }
    .capa-badge .kwp-tag {
      margin-left: 6px;
      padding-left: 8px;
      border-left: 1px solid rgba(52, 211, 153, 0.4);
      color: #A7F3D0;
      font-weight: 800;
    }
    .capa-logo-card {
      background: rgba(255, 255, 255, 0.98);
      padding: 6px 16px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      width: 145px;
      height: 48px;
      box-shadow: 0 10px 20px rgba(0, 0, 0, 0.25);
    }
    .capa-middle {
      margin: 28px 0;
      position: relative;
      z-index: 2;
      max-width: 780px;
    }
    .capa-prep-tag {
      font-size: 11px;
      font-weight: 700;
      color: #34D399;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .capa-prep-tag::before {
      content: "";
      display: inline-block;
      width: 24px;
      height: 2.5px;
      background: #34D399;
      border-radius: 2px;
    }
    .capa-cliente-nome {
      font-size: 38px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: -0.025em;
      line-height: 1.12;
      margin: 0 0 18px 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }
    .capa-frase-destaque {
      font-size: 24px;
      font-weight: 900;
      color: #22C55E;
      line-height: 1.25;
      margin: 0 0 12px 0;
      text-shadow: 0 2px 10px rgba(34, 197, 94, 0.3);
    }
    .capa-subtitulo {
      font-size: 14px;
      color: #D1FAE5;
      font-weight: 500;
      margin: 0 0 24px 0;
      max-width: 620px;
      line-height: 1.45;
    }
    .capa-pills-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 18px;
    }
    .capa-pill {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(52, 211, 153, 0.28);
      border-radius: 14px;
      padding: 12px 14px;
      backdrop-filter: blur(8px);
    }
    .capa-pill-label {
      font-size: 9px;
      font-weight: 800;
      color: #A7F3D0;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .capa-pill-val {
      font-size: 18px;
      font-weight: 900;
      color: #FFFFFF;
      margin-top: 3px;
      letter-spacing: -0.01em;
    }
    .capa-bottom {
      border-top: 1px solid rgba(52, 211, 153, 0.3);
      padding-top: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      font-size: 10px;
      position: relative;
      z-index: 2;
    }
    .capa-bottom-col {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .capa-bottom-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: rgba(16, 185, 129, 0.2);
      border: 1px solid rgba(52, 211, 153, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6EE7B7;
      font-size: 14px;
    }
    .capa-bottom-info strong {
      color: #FFFFFF;
      font-size: 11px;
    }
    .capa-bottom-info span {
      color: #A7F3D0;
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 700;
      display: block;
      margin-bottom: 1px;
    }
    .capa-selo-engenharia {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #A7F3D0;
      font-size: 10px;
      font-weight: 700;
    }

    /* ==========================================================
       SEÇÃO 2 — SITUAÇÃO ATUAL (ESPELHADO DO SecaoCustoInercia.tsx)
       ========================================================== */
    .secao-header-card {
      padding: 16px 20px;
      border-radius: 16px;
      margin-bottom: 14px;
      border: 1px solid #E5E7EB;
    }
    .secao-header-card.situacao-atual {
      background: linear-gradient(90deg, rgba(236, 253, 245, 0.6) 0%, rgba(254, 243, 199, 0.35) 45%, #FFFFFF 100%);
      border-color: #A7F3D0;
    }
    .badge-situacao-atual {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 9.5px;
      font-weight: 800;
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #86EFAC;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }
    .secao-titulo-h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
      color: #111827;
      letter-spacing: -0.015em;
    }
    .secao-desc-sub {
      margin: 4px 0 0 0;
      font-size: 10px;
      color: #4B5563;
      line-height: 1.4;
    }

    /* Grid de 2 Cards Grandes da Situação Atual (Consumo e Custos com valores mensal/anual empilhados) */
    .grid-situacao-wrapper {
      position: relative;
      margin-bottom: 12px;
    }
    .grid-situacao-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
    }
    .card-situacao {
      background: #FFFFFF;
      border: 1px solid #D1FAE5;
      border-radius: 16px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .card-situacao-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid #F3F4F6;
      margin-bottom: 8px;
    }
    .card-situacao-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-situacao-header-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .card-situacao.consumo .card-situacao-header-icon { background: #EFF6FF; color: #2563EB; }
    .card-situacao.custos .card-situacao-header-icon { background: #FEF2F2; color: #DC2626; }
    .card-situacao-header-title {
      font-size: 10px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .card-situacao-header-sub {
      font-size: 7.5px;
      color: #6B7280;
    }
    .card-situacao-header-badge {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 9999px;
    }
    .card-situacao.consumo .card-situacao-header-badge { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .card-situacao.custos .card-situacao-header-badge { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }

    .card-situacao-row-item {
      padding: 6px 0;
    }
    .card-situacao-row-item.first {
      border-bottom: 1px dashed #E5E7EB;
      padding-top: 0;
    }
    .card-situacao-row-item.second {
      padding-bottom: 0;
    }
    .card-situacao-row-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .card-situacao-label {
      font-size: 8.5px;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .card-situacao-tag {
      font-size: 7px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1px 5px;
      border-radius: 9999px;
    }
    .tag-mensal { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .tag-anual { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }
    .tag-conta-atual { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
    .tag-gasto-anual { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
    .card-situacao-valor {
      font-size: 16px;
      font-weight: 900;
      color: #111827;
      margin: 1px 0;
      line-height: 1.15;
    }
    .card-situacao-valor.red { color: #DC2626; }
    .card-situacao-valor.amber { color: #B45309; }
    .card-situacao-sub {
      font-size: 8px;
      color: #6B7280;
      line-height: 1.3;
    }

    /* Container dos Gastos Acumulados Sem Solar */
    .box-barras-inercia {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 14px 16px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .barras-topo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #F3F4F6;
    }
    .barras-topo-title {
      font-size: 11px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .barras-topo-sub {
      font-size: 9px;
      color: #6B7280;
    }
    .legenda-barras-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      padding: 4px 10px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 800;
      color: #991B1B;
    }
    .leg-bullet-red {
      width: 8px;
      height: 8px;
      border-radius: 9999px;
      background: #DC2626;
      display: inline-block;
    }

    /* 3 Cards Grandes de Gasto Acumulado Sem Solar (1 ano, 5 anos, 25 anos) */
    .grid-marcos-inercia {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 8px;
    }
    .card-marco-inercia {
      border: 2px solid #E5E7EB;
      border-radius: 14px;
      padding: 14px 12px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 130px;
    }
    .card-marco-inercia.ano1 {
      background: linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%);
      border-color: #FDE68A;
    }
    .card-marco-inercia.ano5 {
      background: linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%);
      border-color: #FDBA74;
    }
    .card-marco-inercia.ano25 {
      background: linear-gradient(135deg, #FEF2F2 0%, #FFFFFF 100%);
      border-color: #FCA5A5;
    }
    .card-marco-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 6px;
    }
    .card-marco-title {
      font-size: 11px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .card-marco-tag {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 4px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      color: #4B5563;
    }
    .card-marco-inercia.ano1 .card-marco-tag {
      color: #92400E;
      border-color: #FDE68A;
      background: #FEF3C7;
    }
    .card-marco-inercia.ano5 .card-marco-tag {
      color: #9A3412;
      border-color: #FED7AA;
      background: #FFEDD5;
    }
    .card-marco-inercia.ano25 .card-marco-tag {
      color: #991B1B;
      border-color: #FECACA;
      background: #FEE2E2;
    }

    .card-marco-subhead {
      font-size: 8.5px;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }
    .card-marco-valor-grande {
      font-size: 19px;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    .card-marco-inercia.ano1 .card-marco-valor-grande {
      color: #78350F;
    }
    .card-marco-inercia.ano5 .card-marco-valor-grande {
      color: #9A3412;
    }
    .card-marco-inercia.ano25 .card-marco-valor-grande {
      color: #DC2626;
    }

    .card-marco-footer-meta {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px dashed #E5E7EB;
      font-size: 8.5px;
      color: #4B5563;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .card-marco-footer-meta strong {
      color: #111827;
      font-weight: 800;
    }

    /* ==========================================================
       SEÇÃO 3 — SEU SISTEMA FOTOVOLTAICO (ESPELHADO DO SecaoSeuSistemaFotovoltaico.tsx)
       ========================================================== */
    .secao-header-card.sistema {
      background: linear-gradient(135deg, #064E3B 0%, #065F46 60%, #0D9488 100%);
      color: #FFFFFF;
      border: 1px solid #047857;
      position: relative;
      overflow: hidden;
      padding: 18px 22px;
    }
    .secao-header-card.sistema .glow-circle {
      position: absolute;
      top: -30px;
      right: -30px;
      width: 140px;
      height: 140px;
      border-radius: 9999px;
      background: radial-gradient(circle, rgba(52, 211, 153, 0.3) 0%, transparent 70%);
      pointer-events: none;
    }
    .secao-header-card.sistema .badge-sistema {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 9px;
      font-weight: 800;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #D1FAE5;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .secao-header-card.sistema h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: -0.015em;
    }
    .secao-header-card.sistema p {
      margin: 4px 0 0 0;
      font-size: 10px;
      color: #D1FAE5;
      line-height: 1.4;
      max-width: 680px;
    }

    .grid-sistema-cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 12px 0;
    }
    .card-sistema {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      min-height: 110px;
    }
    .card-sistema-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .card-sistema-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    .card-sistema-icon-wrap.amber {
      background: #FEF3C7;
      color: #D97706;
      border: 1px solid #FDE68A;
    }
    .card-sistema-icon-wrap.emerald {
      background: #DCFCE7;
      color: #16A34A;
      border: 1px solid #BBF7D0;
    }
    .card-sistema-icon-wrap.yellow {
      background: #FEF9C3;
      color: #CA8A04;
      border: 1px solid #FEF08A;
    }
    .card-sistema-icon-wrap.teal {
      background: #CCFBF1;
      color: #0D9488;
      border: 1px solid #99F6E4;
    }
    .card-sistema-icon-wrap.blue {
      background: #DBEAFE;
      color: #2563EB;
      border: 1px solid #BFDBFE;
    }
    .card-sistema-tag {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 9999px;
      letter-spacing: 0.04em;
    }
    .card-sistema-tag.emerald {
      background: #DCFCE7;
      color: #166534;
      border: 1px solid #86EFAC;
    }
    .card-sistema-tag.blue {
      background: #DBEAFE;
      color: #1E40AF;
      border: 1px solid #93C5FD;
    }
    .card-sistema-tag.teal {
      background: #CCFBF1;
      color: #115E59;
      border: 1px solid #5EEAD4;
    }
    .card-sistema-tag.amber {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FCD34D;
    }
    .card-sistema-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6B7280;
      letter-spacing: 0.04em;
    }
    .card-sistema-valor {
      font-size: 21px;
      font-weight: 900;
      color: #111827;
      line-height: 1.15;
      margin: 2px 0;
    }
    .card-sistema-valor span.unit {
      font-size: 13px;
      font-weight: 700;
      color: #166534;
    }
    .card-sistema-sub {
      font-size: 9px;
      color: #4B5563;
      line-height: 1.3;
      margin-top: 3px;
    }
    .card-sistema-badge-eco {
      margin-top: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 7px;
      border-radius: 6px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      color: #166534;
      font-size: 8.5px;
      font-weight: 800;
    }

    /* Box de Garantias com Selos Visuais Lado a Lado */
    .faixa-garantias-tripla {
      background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 60%, #FFFFFF 100%);
      border: 1px solid #A7F3D0;
      border-radius: 16px;
      padding: 14px 18px;
      margin-top: 10px;
    }
    .garantias-topo-flex {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(16, 185, 129, 0.25);
    }
    .garantias-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .garantias-title-icon {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: #059669;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
    }
    .garantias-tripla-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 10px;
    }
    .garantia-item-bloco {
      background: #FFFFFF;
      border: 1px solid #BBF7D0;
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    .garantia-item-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      shrink-0;
    }
    .garantia-item-icon-box.emerald {
      background: #DCFCE7;
      color: #15803D;
    }
    .garantia-item-icon-box.teal {
      background: #CCFBF1;
      color: #0F766E;
    }
    .garantia-item-icon-box.amber {
      background: #FEF3C7;
      color: #B45309;
    }
    .garantia-item-anos {
      font-size: 16px;
      font-weight: 900;
      color: #065F46;
      line-height: 1.1;
    }
    .garantia-item-tipo {
      font-size: 8px;
      font-weight: 800;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .garantia-item-sub {
      font-size: 8.5px;
      color: #374151;
      font-weight: 600;
      margin-top: 1px;
    }

    /* Faixa de Monitoramento 24/7 com smartphone e visual esmeralda */
    .faixa-monitoramento {
      background: linear-gradient(90deg, #065F46 0%, #047857 50%, #0D9488 100%);
      color: #FFFFFF;
      border-radius: 14px;
      padding: 12px 18px;
      margin-top: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      box-shadow: 0 4px 10px rgba(6, 95, 70, 0.2);
    }
    .faixa-mon-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .faixa-mon-icon-box {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      color: #A7F3D0;
      shrink-0;
    }
    .faixa-mon-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .faixa-monitoramento-title {
      font-size: 12px;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 0.02em;
    }
    .faixa-mon-pill {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #D1FAE5;
    }
    .faixa-monitoramento-desc {
      font-size: 9px;
      color: #D1FAE5;
      margin-top: 2px;
    }
    .faixa-mon-badge-right {
      background: #FFFFFF;
      color: #065F46;
      font-size: 9.5px;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 10px;
      white-space: nowrap;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    }

    /* ==========================================================
       SEÇÃO 4 — PROJEÇÃO EM 25 ANOS (ESPELHADO DO SecaoProjecao25Anos.tsx)
       ========================================================== */
    .grafico-curvas-box {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 12px 16px;
      margin: 10px 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .grafico-legendas {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5px;
      margin-bottom: 8px;
      border-bottom: 1px dashed #E5E7EB;
      padding-bottom: 8px;
    }
    .leg-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .leg-cor-bullet {
      width: 10px;
      height: 10px;
      border-radius: 9999px;
      display: inline-block;
    }
    .leg-cor-bullet.red {
      background: #DC2626;
      box-shadow: 0 0 0 2px #FEE2E2;
    }
    .leg-cor-bullet.green {
      background: #16A34A;
      box-shadow: 0 0 0 2px #DCFCE7;
    }
    .badge-cruzamento-payback {
      font-weight: 900;
      color: #92400E;
      background: #FEF3C7;
      padding: 4px 10px;
      border-radius: 8px;
      border: 1px solid #FCD34D;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 9px;
    }

    .cards-metricas-25anos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 12px;
    }
    .card-metrica-destaque {
      background: #F0FDF4;
      border: 1.5px solid #86EFAC;
      border-radius: 14px;
      padding: 12px 14px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.08);
    }
    .card-metrica-destaque.payback-card {
      background: #FFFBEB;
      border-color: #FDE68A;
    }
    .card-metrica-destaque.roi-card {
      background: #EFF6FF;
      border-color: #BFDBFE;
    }
    .card-metrica-label {
      font-size: 9px;
      font-weight: 800;
      color: #065F46;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .card-metrica-destaque.payback-card .card-metrica-label {
      color: #92400E;
    }
    .card-metrica-destaque.roi-card .card-metrica-label {
      color: #1E40AF;
    }
    .card-metrica-numero {
      font-size: 24px;
      font-weight: 900;
      color: #166534;
      margin: 4px 0 2px 0;
      line-height: 1.1;
      letter-spacing: -0.01em;
    }
    .card-metrica-sub {
      font-size: 8.5px;
      color: #4B5563;
      font-weight: 600;
    }

    /* ==========================================================
       SEÇÃO 5 — INVESTIMENTO & CONDIÇÕES DE PAGAMENTO (ESPELHADO DO SecaoInvestimentoPagamento.tsx)
       ========================================================== */
    .hero-investimento-banner {
      background: linear-gradient(135deg, #065F46 0%, #047857 40%, #0D9488 100%);
      color: #FFFFFF;
      border-radius: 18px;
      padding: 16px 22px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
      box-shadow: 0 4px 12px rgba(6, 95, 70, 0.2);
    }
    .hero-invest-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #A7F3D0;
    }
    .hero-invest-valor {
      font-size: 32px;
      font-weight: 900;
      color: #FDE047;
      line-height: 1;
      margin-top: 3px;
      letter-spacing: -0.02em;
    }
    .hero-invest-sub {
      font-size: 9.5px;
      color: #D1FAE5;
      margin-top: 2px;
    }

    .grid-pagamento-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .card-pagamento {
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      background: #FFFFFF;
      padding: 12px 10px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      min-height: 130px;
    }
    .card-pagamento.destaque-verde {
      border: 2px solid #16A34A;
      background: #FFFFFF;
      box-shadow: 0 4px 14px rgba(22, 163, 74, 0.16);
    }
    .card-pagamento-icon-circle {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 6px auto;
      font-size: 16px;
    }
    .card-pagamento-icon-circle.emerald {
      background: #DCFCE7;
      color: #166534;
    }
    .card-pagamento-icon-circle.blue {
      background: #DBEAFE;
      color: #1D4ED8;
    }
    .card-pagamento-icon-circle.amber {
      background: #FEF3C7;
      color: #B45309;
    }
    .card-pagamento-icon-circle.purple {
      background: #F3E8FF;
      color: #7E22CE;
    }
    .card-pagamento-tag {
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 9999px;
      display: inline-block;
      margin-bottom: 4px;
      letter-spacing: 0.04em;
    }
    .card-pagamento.destaque-verde .card-pagamento-tag {
      background: #16A34A;
      color: #FFFFFF;
    }
    .card-pagamento-tag.blue {
      background: #DBEAFE;
      color: #1E40AF;
    }
    .card-pagamento-tag.amber {
      background: #FEF3C7;
      color: #92400E;
    }
    .card-pagamento-tag.purple {
      background: #F3E8FF;
      color: #6B21A8;
    }
    .card-pagamento-titulo {
      font-size: 10px;
      font-weight: 800;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }
    .card-pagamento-valor {
      font-size: 16px;
      font-weight: 900;
      color: #111827;
      margin: 2px 0 3px 0;
      line-height: 1.15;
    }
    .card-pagamento-desc {
      font-size: 8px;
      color: #6B7280;
      margin-bottom: 6px;
    }
    .card-pagamento-badge-sub {
      font-size: 8.5px;
      font-weight: 800;
      padding: 4px 6px;
      border-radius: 6px;
      display: inline-block;
    }
    .card-pagamento-badge-sub.emerald {
      color: #166534;
      background: #DCFCE7;
      border: 1px solid #86EFAC;
    }
    .card-pagamento-badge-sub.blue {
      color: #1E40AF;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
    }
    .card-pagamento-badge-sub.amber {
      color: #92400E;
      background: #FEF3C7;
      border: 1px solid #FDE68A;
    }
    .card-pagamento-badge-sub.purple {
      color: #6B21A8;
      background: #FAF5FF;
      border: 1px solid #E9D5FF;
    }

    .linha-comparativa-pagamento {
      background: #FFFFFF;
      border: 1.5px solid #86EFAC;
      border-radius: 14px;
      padding: 12px 18px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.08);
    }
    .linha-comp-texto strong.red {
      color: #DC2626;
      text-decoration: underline;
      text-decoration-color: #FCA5A5;
      text-underline-offset: 2px;
    }
    .linha-comp-texto strong.green {
      color: #15803D;
      font-size: 13px;
    }

    .badge-urgencia-validade {
      background: linear-gradient(90deg, #F59E0B 0%, #EA580C 100%);
      color: #FFFFFF;
      padding: 10px 18px;
      border-radius: 14px;
      font-size: 10px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      box-shadow: 0 4px 10px rgba(234, 88, 12, 0.2);
    }

    .assinaturas-grid-final {
      border-top: 1.5px solid #E5E7EB;
      padding-top: 12px;
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      font-size: 8.5px;
    }
    .assinatura-bloco {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      min-height: 175px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .assinatura-dados {
      font-size: 8px;
      line-height: 1.5;
      color: #4B5563;
    }
    .linha-assinatura-final {
      border-bottom: 1.5px solid #111827;
      margin-top: 55px;
      margin-bottom: 8px;
      width: 100%;
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
      <strong>Proposta Comercial Oficial Delfos Solar (5 Seções Exclusivas)</strong>
      <span>Layout 100% alinhado à interface comercial • Capa • Inércia • Sistema • Projeção 25 Anos • Pagamento</span>
    </div>
    <button class="btn-action-print" onclick="window.print()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 6 2 18 2 18 9"></polyline>
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
        <rect x="6" y="14" width="12" height="8"></rect>
      </svg>
      Salvar em PDF / Imprimir (5 Seções)
    </button>
  </div>

  <div class="proposta-container">

    <!-- ========================================================
         SEÇÃO 1 — CAPA (ESPELHADO DO SecaoCapaProposta.tsx)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-1-capa">
      <div class="secao-body">
        <div class="capa-wrapper">
          <!-- Glows esmeralda e dourado de fundo -->
          <div class="capa-glow-top"></div>
          <div class="capa-glow-right"></div>

          <!-- Malha geométrica fotovoltaica SVG exata do SecaoCapaProposta -->
          <svg class="capa-grid-svg" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="capa-solar-grid-gen" width="60" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
                <rect x="2" y="2" width="56" height="36" rx="3" fill="none" stroke="#34D399" stroke-width="0.8" stroke-opacity="0.4" />
                <line x1="2" y1="14" x2="58" y2="14" stroke="#34D399" stroke-width="0.4" stroke-opacity="0.25" />
                <line x1="2" y1="26" x2="58" y2="26" stroke="#34D399" stroke-width="0.4" stroke-opacity="0.25" />
                <line x1="30" y1="2" x2="30" y2="38" stroke="#34D399" stroke-width="0.4" stroke-opacity="0.25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#capa-solar-grid-gen)" />
          </svg>

          <!-- Topo: Badge Exclusiva + Logo Oficial -->
          <div class="capa-top">
            <div class="capa-badge">
              <span class="sparkle">✦</span>
              <span>Proposta Comercial Exclusiva</span>
              <span class="kwp-tag">${formatNumBR(potenciaKwp, 2)} kWp</span>
            </div>
            <div class="capa-logo-card">
              ${renderLogoSvg('capa')}
            </div>
          </div>

          <!-- Miolo: Nome do Cliente + Frase Verde + Subtítulo + 3 Pills -->
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
                <div class="capa-pill-label">Potência Nominal</div>
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

          <!-- Rodapé da Capa: Consultor, Data e Selo Engenharia -->
          <div class="capa-bottom">
            <div class="capa-bottom-col">
              <div class="capa-bottom-icon">👤</div>
              <div class="capa-bottom-info">
                <span>Consultor Responsável</span>
                <strong>${consultorNome}</strong> • ${consultorContato}
              </div>
            </div>
            <div class="capa-bottom-col">
              <div class="capa-bottom-icon">📅</div>
              <div class="capa-bottom-info">
                <span>Data da Proposta</span>
                <strong>${dataFormatada}</strong> • Validade: <strong>${validade} dias corridos</strong>
              </div>
            </div>
            <div class="capa-selo-engenharia">
              <span>🛡️</span>
              <span>Engenharia Própria Delfos</span>
            </div>
          </div>
        </div>
      </div>
      ${renderInternalFooter(1, validade)}
    </section>

    <!-- ========================================================
         PÁGINA DE APRESENTAÇÃO DA EMPRESA & PORTFÓLIO DE USINAS
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-apresentacao-empresa">
      <div class="secao-body">
        <header class="doc-header">
          <div class="header-brand">
            <div class="logo-box">${renderLogoSvg('apresentacao')}</div>
            <div>
              <div class="brand-title">DELFOS SOLAR</div>
              <div class="brand-sub">ENGENHARIA & SOLUÇÕES FOTOVOLTAICAS</div>
            </div>
          </div>
          <div class="header-tag">
            <span class="tag-secao">INSTITUCIONAL</span>
            <span class="tag-desc">Apresentação & Engenharia</span>
          </div>
        </header>

        <!-- Banner Institucional Delfos Solar -->
        <div style="background: linear-gradient(135deg, #064E3B 0%, #065F46 50%, #0F766E 100%); border-radius: 16px; padding: 18px 22px; color: #FFFFFF; box-shadow: 0 4px 12px rgba(6, 78, 59, 0.2); margin-bottom: 16px;">
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 9px; border-radius: 9999px; font-size: 8.5px; font-weight: 800; background: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); color: #D1FAE5; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
            <span>🏢</span> Engenharia Própria Especializada
          </div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.015em;">
            Delfos Engenharia Ltda (Delfos Solar)
          </h2>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; font-size: 9.5px; color: #D1FAE5; margin-top: 6px; font-weight: 600;">
            <span>CNPJ: <strong>${empresa?.cnpj || '21.379.952/0001-38'}</strong></span>
            <span>•</span>
            <span>📍 Erechim / RS</span>
            <span>•</span>
            <span style="color: #FDE047;">Engenheiro Responsável: <strong>Eng. João Victor Bagetti Fuchs — CREA RS151894</strong></span>
          </div>
          <p style="margin: 8px 0 0 0; font-size: 9.5px; color: #ECFDF5; line-height: 1.45; max-width: 740px;">
            Engenharia própria especializada em projetos fotovoltaicos, homologação completa junto à concessionária de energia e rigorosa garantia de desempenho com monitoramento em tempo real. Soluções completas Turnkey (chave na mão) do projeto à aprovação e geração.
          </p>
        </div>

        <!-- Grade com 3 Usinas do Portfólio / Galeria Usinas -->
        <div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <div>
              <h3 style="margin: 0; font-size: 13px; font-weight: 900; color: #111827;">
                Portfólio de Usinas Solares Instaladas
              </h3>
              <p style="margin: 2px 0 0 0; font-size: 8.5px; color: #4B5563;">
                Conheça algumas usinas projetadas, homologadas e executadas pela equipe da Delfos Solar.
              </p>
            </div>
            <span style="font-size: 8.5px; font-weight: 800; background: #DCFCE7; color: #166534; padding: 3px 9px; border-radius: 9999px; border: 1px solid #86EFAC;">
              Projetos Reais Homologados
            </span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            ${(() => {
              // Se há fotosInstalacoes fornecidas, respeita a seleção (filtrada se houver instalacoesSelecionadasIds)
              let usinasExibicao = dados.fotosInstalacoes || []
              if (
                dados.instalacoesSelecionadasIds &&
                dados.instalacoesSelecionadasIds.length > 0 &&
                usinasExibicao.length > 0
              ) {
                const filtradas = usinasExibicao.filter((u) =>
                  dados.instalacoesSelecionadasIds!.includes(u.id),
                )
                if (filtradas.length > 0) {
                  usinasExibicao = filtradas
                }
              }

              if (!usinasExibicao || usinasExibicao.length === 0) {
                usinasExibicao = [
                  {
                    id: '1',
                    titulo: 'Usina Solar Residencial',
                    url: '',
                    cidade: 'Erechim / RS',
                    potenciaKwp: 10.5,
                  },
                  {
                    id: '2',
                    titulo: 'Usina Solar Comercial',
                    url: '',
                    cidade: 'Passo Fundo / RS',
                    potenciaKwp: 35.0,
                  },
                  {
                    id: '3',
                    titulo: 'Usina Solar Agropecuária',
                    url: '',
                    cidade: 'Getúlio Vargas / RS',
                    potenciaKwp: 50.0,
                  },
                ]
              }

              // Exibir até 6 usinas se selecionadas, mantendo grade responsiva
              return usinasExibicao
                .map((u) => {
                  const temFoto = !!(u.url && u.url.trim())
                  const fotoHtml = temFoto
                    ? `<img src="${u.url}" alt="${u.titulo || 'Usina Solar'}" style="width: 100%; height: 110px; object-fit: cover; display: block;" />`
                    : `<div style="width: 100%; height: 110px; background: #F0FDF4; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #166534;">
                       <span style="font-size: 26px;">☀️</span>
                       <span style="font-size: 8.5px; font-weight: 800; color: #166534; margin-top: 4px;">Usina Fotovoltaica Delfos</span>
                     </div>`

                  const potTexto = u.potenciaKwp
                    ? `${formatNumBR(u.potenciaKwp, 1)} kWp`
                    : 'Turnkey'
                  const cidTexto = u.cidade || 'Erechim / RS'

                  return `
                  <div style="border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; background: #FFFFFF; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="position: relative;">
                      ${fotoHtml}
                      <span style="position: absolute; top: 6px; right: 6px; background: rgba(6, 78, 59, 0.88); color: #FFFFFF; font-size: 8.5px; font-weight: 800; padding: 2px 7px; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.25);">
                        ⚡ ${potTexto}
                      </span>
                    </div>
                    <div style="padding: 8px 10px;">
                      <div style="font-size: 10px; font-weight: 800; color: #111827; line-height: 1.25; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${u.titulo || 'Usina Solar Delfos'}
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 8.5px; color: #6B7280;">
                        <span>📍 ${cidTexto}</span>
                        <strong style="color: #166534;">${potTexto}</strong>
                      </div>
                    </div>
                  </div>
                `
                })
                .join('')
            })()}
          </div>
        </div>
      </div>
      ${renderInternalFooter(1, validade)}
    </section>

    <!-- ========================================================
         SEÇÃO 2 — SITUAÇÃO ATUAL (ESPELHADO DO SecaoCustoInercia.tsx)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-2-custo-inercia">
      <div class="secao-body">
        ${renderInternalHeader('Situação Atual', 2, 'situacao-atual')}

        <!-- Cabeçalho Situação Atual -->
        <div class="secao-header-card situacao-atual">
          <div class="badge-situacao-atual">
            <span>📊</span> Situação Atual
          </div>
          <h2 class="secao-titulo-h2">Situação Atual</h2>
          <p class="secao-desc-sub">
            Panorama do seu padrão de consumo energético e despesas recorrentes pagas à concessionária
            sem qualquer retorno patrimonial, além da projeção de gastos futuros sem a tecnologia solar.
          </p>
        </div>

        <!-- 1. Grid Visual em 2 Cards Grandes: Consumo (Mensal + Anual) e Custos (Mensal + Anual) com conector de correspondência -->
        <div class="grid-situacao-wrapper">
          <div class="grid-situacao-cards">
            <!-- Card 1: Consumo de Energia (Mensal em cima, Anual abaixo) -->
            <div class="card-situacao consumo">
              <div class="card-situacao-header">
                <div class="card-situacao-header-left">
                  <div class="card-situacao-header-icon">⚡</div>
                  <div>
                    <div class="card-situacao-header-title">Consumo de Energia</div>
                    <div class="card-situacao-header-sub">Volume consumido da concessionária</div>
                  </div>
                </div>
                <span class="card-situacao-header-badge">kWh</span>
              </div>

              <!-- Bloco Mensal -->
              <div class="card-situacao-row-item first">
                <div class="card-situacao-row-top">
                  <div class="card-situacao-label">Consumo Mensal</div>
                  <span class="card-situacao-tag tag-mensal">Mensal</span>
                </div>
                <div class="card-situacao-valor">
                  ${formatNumBR(consumoKwhMesReal, 0)} <span style="font-size: 11px; font-weight: 700; color: #2563EB;">kWh/mês</span>
                </div>
                <div class="card-situacao-sub">Média mensal de energia consumida da rede</div>
              </div>

              <!-- Bloco Anual -->
              <div class="card-situacao-row-item second">
                <div class="card-situacao-row-top">
                  <div class="card-situacao-label">Consumo no Ano</div>
                  <span class="card-situacao-tag tag-anual">Anual</span>
                </div>
                <div class="card-situacao-valor">
                  ${formatNumBR(consumoKwhAnoReal, 0)} <span style="font-size: 11px; font-weight: 700; color: #4F46E5;">kWh/ano</span>
                </div>
                <div class="card-situacao-sub">Volume total faturado em 12 faturas</div>
              </div>
            </div>

            <!-- Card 2: Custos com Concessionária (Mensal em cima, Anual abaixo) -->
            <div class="card-situacao custos">
              <div class="card-situacao-header">
                <div class="card-situacao-header-left">
                  <div class="card-situacao-header-icon">💲</div>
                  <div>
                    <div class="card-situacao-header-title">Custos com Concessionária</div>
                    <div class="card-situacao-header-sub">Desembolso financeiro sem retorno</div>
                  </div>
                </div>
                <span class="card-situacao-header-badge">R$ Reais</span>
              </div>

              <!-- Bloco Mensal (Conta Atual) -->
              <div class="card-situacao-row-item first">
                <div class="card-situacao-row-top">
                  <div class="card-situacao-label">Custo Mensal</div>
                  <span class="card-situacao-tag tag-conta-atual">Conta Atual</span>
                </div>
                <div class="card-situacao-valor red">
                  ${formatBRL(contaHoje)}
                </div>
                <div class="card-situacao-sub">Despesa média paga todo mês à concessionária</div>
              </div>

              <!-- Bloco Anual (Gasto Anual) -->
              <div class="card-situacao-row-item second">
                <div class="card-situacao-row-top">
                  <div class="card-situacao-label">Custo no Ano</div>
                  <span class="card-situacao-tag tag-gasto-anual">Gasto Anual</span>
                </div>
                <div class="card-situacao-valor amber">
                  ${formatBRL(contaAnualEstimada)}
                </div>
                <div class="card-situacao-sub">Total desembolsado em 12 faturas sem retorno</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Box de Gastos Acumulados Sem Solar: 1 ano, payback em anos, 25 anos -->
        <div class="box-barras-inercia">
          <div class="barras-topo-row">
            <div>
              <div class="barras-topo-title">
                <span style="color: #DC2626;">📈</span> Gastos Acumulados Sem Solar: 1, ${rotuloPeriodoCardMeio} e 25 Anos
              </div>
              <div class="barras-topo-sub">
                Total faturado pela concessionária ao longo do tempo considerando o reajuste tarifário histórico da rede elétrica
              </div>
            </div>
            <div class="legenda-barras-pill">
              <span class="leg-bullet-red"></span>
              <span>Sem energia solar • Desembolso direto</span>
            </div>
          </div>

          <div class="grid-marcos-inercia">
            <!-- Marco 1: 1 ano -->
            <div class="card-marco-inercia ano1">
              <div>
                <div class="card-marco-head">
                  <span class="card-marco-title">Gasto em 1 Ano</span>
                  <span class="card-marco-tag">Curto prazo</span>
                </div>
                <div class="card-marco-subhead">Sem energia solar</div>
                <div class="card-marco-valor-grande">${formatBRL(gasto1Ano)}</div>
              </div>
              <div class="card-marco-footer-meta">
                <div>Média mensal: <strong>≈ ${formatBRL(Math.round(gasto1Ano / 12))}/mês</strong></div>
                <div style="font-size: 8px; color: #6B7280;">12 faturas com reajuste inicial</div>
              </div>
            </div>

            <!-- Marco 2: Payback em X Anos -->
            <div class="card-marco-inercia ano5">
              <div>
                <div class="card-marco-head">
                  <span class="card-marco-title">${tituloCardMeio}</span>
                  <span class="card-marco-tag">Médio prazo</span>
                </div>
                <div class="card-marco-subhead">Sem energia solar</div>
                <div class="card-marco-valor-grande">${formatBRL(gastoCardMeio)}</div>
              </div>
              <div class="card-marco-footer-meta">
                <div>Média mensal: <strong>≈ ${formatBRL(mediaMensalCardMeio)}/mês</strong></div>
                <div style="font-size: 8px; color: #C2410C; font-weight: 700;">Supera o valor de uma usina própria</div>
              </div>
            </div>

            <!-- Marco 3: 25 anos -->
            <div class="card-marco-inercia ano25">
              <div>
                <div class="card-marco-head">
                  <span class="card-marco-title">Gasto em 25 Anos</span>
                  <span class="card-marco-tag">Longo prazo</span>
                </div>
                <div class="card-marco-subhead">Sem energia solar</div>
                <div class="card-marco-valor-grande">${formatBRL(gasto25Anos)}</div>
              </div>
              <div class="card-marco-footer-meta">
                <div>Média mensal: <strong>≈ ${formatBRL(Math.round(gasto25Anos / 300))}/mês</strong></div>
                <div style="font-size: 8px; color: #DC2626; font-weight: 700;">Desembolso acumulado com inflação da rede</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      ${renderInternalFooter(2, validade)}
    </section>

    <!-- ========================================================
         SEÇÃO 3 — SEU SISTEMA FOTOVOLTAICO (ESPELHADO DO SecaoSeuSistemaFotovoltaico.tsx)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-3-seu-sistema">
      <div class="secao-body">
        ${renderInternalHeader('Seu Sistema Fotovoltaico', 3, 'sistema')}

        <!-- Topo da seção com fundo verde esmeralda com malha fotovoltaica -->
        <div class="secao-header-card sistema">
          <div class="glow-circle"></div>
          <div class="badge-sistema">
            <span>✨</span> Seu Sistema Fotovoltaico
          </div>
          <h2>Conheça sua usina solar</h2>
          <p>
            Engenharia de precisão planejada sob medida para <strong>${nomeCliente}</strong>.
            Todos os dados técnicos consolidados em uma apresentação clara, moderna e transparente.
          </p>
        </div>

        <!-- Grid de Cards Arredondados com Ícones Coloridos e Fontes Grandes -->
        <div class="grid-sistema-cards">
          <!-- Card 1: ⚡ Potência do sistema -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-icon-wrap amber">⚡</div>
              <span class="card-sistema-tag emerald">Capacidade Nominal</span>
            </div>
            <div>
              <div class="card-sistema-label">Potência do Sistema</div>
              <div class="card-sistema-valor">
                ${formatNumBR(potenciaKwp, 2)} <span class="unit">kWp</span>
              </div>
              <div class="card-sistema-sub">Potência total instalada com tecnologia de ponta.</div>
            </div>
          </div>

          <!-- Card 2: 📈 Geração estimada + economia -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-icon-wrap emerald">📈</div>
              <span class="card-sistema-tag emerald">Alta Produção</span>
            </div>
            <div>
              <div class="card-sistema-label">Geração Estimada</div>
              <div class="card-sistema-valor" style="color: #15803D;">
                ${formatNumBR(producao.mediaMensalKwh, 0)} <span class="unit" style="color: #4B5563;">kWh/mês</span>
              </div>
              <div class="card-sistema-badge-eco">
                <span>✓</span> Economia de ${formatBRL(economiaMensal)}/mês
              </div>
            </div>
          </div>

          <!-- Card 3: ☀️ Módulos fotovoltaicos (ícone representativo em grade + garantias no rodapé) -->
          <div class="card-sistema" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="card-sistema-header">
                ${
                  sistema?.fotoModuloUrl
                    ? `<div style="width: 38px; height: 38px; border-radius: 8px; border: 1px solid #FDE68A; background: #FEF3C7; padding: 2px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <img src="${sistema.fotoModuloUrl}" alt="Módulo FV" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                      </div>`
                    : `<div class="card-sistema-icon-wrap amber" style="background: #FEF3C7; color: #D97706;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <line x1="12" y1="3" x2="12" y2="21" />
                          <line x1="3" y1="9" x2="21" y2="9" />
                          <line x1="3" y1="15" x2="21" y2="15" />
                        </svg>
                      </div>`
                }
                <span class="card-sistema-tag blue">Tier-1 Global</span>
              </div>
              <div>
                <div class="card-sistema-label">Módulos Fotovoltaicos</div>
                <div class="card-sistema-valor">
                  ${modulosQtd} <span class="unit" style="color: #4B5563;">unidades</span>
                </div>
                <div class="card-sistema-sub">
                  <strong>${modulosDesc}</strong> (${modulosWp}W cada • ${modulosTecnologia}).
                </div>
              </div>
            </div>

            <!-- Rodapé do Card: Garantias dos Módulos (Degradação & Fabricação) -->
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E5E7EB; font-size: 8px; line-height: 1.4;">
              <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563; margin-bottom: 2px;">
                <span>Garantia de performance (degradação):</span>
                <strong style="color: #065F46; background: #DCFCE7; padding: 1px 5px; border-radius: 4px; border: 1px solid #BBF7D0;">${garantiaModulosDesempenho} anos</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563;">
                <span>Garantia contra defeitos de fabricação:</span>
                <strong style="color: #92400E; background: #FEF3C7; padding: 1px 5px; border-radius: 4px; border: 1px solid #FDE68A;">${garantiaModulosFabricacao} anos</strong>
              </div>
            </div>
          </div>

          <!-- Card 4: 🔌 Inversor solar (ícone de placa de circuito + garantias no rodapé) -->
          <div class="card-sistema" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="card-sistema-header">
                ${
                  sistema?.fotoInversorUrl
                    ? `<div style="width: 38px; height: 38px; border-radius: 8px; border: 1px solid #99F6E4; background: #CCFBF1; padding: 2px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <img src="${sistema.fotoInversorUrl}" alt="Inversor Solar" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                      </div>`
                    : `<div class="card-sistema-icon-wrap teal" style="background: #CCFBF1; color: #0F766E;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 18px; height: 18px;">
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M11 9h4a2 2 0 0 0 2-2V3" />
                          <circle cx="9" cy="9" r="2" />
                          <path d="M7 21v-4a2 2 0 0 1 2-2h4" />
                          <circle cx="15" cy="15" r="2" />
                        </svg>
                      </div>`
                }
                <span class="card-sistema-tag teal">${inversorQtd} Inversor</span>
              </div>
              <div>
                <div class="card-sistema-label">Inversor Solar</div>
                <div class="card-sistema-valor" style="font-size: 15px;">
                  ${inversorDesc}
                </div>
                <div class="card-sistema-sub">
                  ${inversorMppt} MPPT • Potência: ${inversorKw} kW homologado.
                </div>
              </div>
            </div>

            <!-- Rodapé do Card: Garantia do Inversor -->
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E5E7EB; font-size: 8px; line-height: 1.4;">
              <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563;">
                <span>Garantia do inversor:</span>
                <strong style="color: #0F766E; background: #CCFBF1; padding: 1px 5px; border-radius: 4px; border: 1px solid #99F6E4;">${garantiaInversor} anos</strong>
              </div>
            </div>
          </div>

          <!-- Card 5: 📐 Área necessária -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-icon-wrap blue">📐</div>
              <span class="card-sistema-tag amber">Telhado / Solo</span>
            </div>
            <div>
              <div class="card-sistema-label">Área Necessária</div>
              <div class="card-sistema-valor">
                ${formatNumBR(areaM2, 1)} <span class="unit" style="color: #4B5563;">m²</span>
              </div>
              <div class="card-sistema-sub">Área útil para fixação otimizada dos painéis.</div>
            </div>
          </div>

          <!-- Card 6: 🛡️ Garantia de instalação Delfos -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-icon-wrap emerald">🛡️</div>
              <span class="card-sistema-tag emerald">Engenharia Própria</span>
            </div>
            <div>
              <div class="card-sistema-label">Garantia Instalação</div>
              <div class="card-sistema-valor" style="color: #065F46;">
                ${garantiaInstalacao}
              </div>
              <div class="card-sistema-sub">Garantia integral sobre mão de obra, cabos e ART.</div>
            </div>
          </div>
        </div>

        ${(() => {
          const itens = producao?.geracaoMensal
          if (!Array.isArray(itens) || itens.length === 0) {
            return ''
          }

          const totalKwh =
            producao?.anualKwh && producao.anualKwh > 0
              ? producao.anualKwh
              : itens.reduce((acc, curr) => acc + (Number(curr.geracaoKwh) || 0), 0)
          const maxGeracao = Math.max(...itens.map((m) => Number(m.geracaoKwh) || 0), 1)
          const mediaMensal = totalKwh > 0 ? Math.round(totalKwh / itens.length) : 0

          const maxBarHeightPx = 80 // Altura da área de barras para impressão compacta e segura

          const barrasHtml = itens
            .map((item) => {
              const valorKwh = Math.round(Number(item.geracaoKwh) || 0)
              const pct = Math.max(8, Math.min(100, Math.round((valorKwh / maxGeracao) * 100)))
              const barHeightPx = Math.max(6, Math.round((pct / 100) * maxBarHeightPx))
              const isPico = valorKwh >= maxGeracao * 0.98 && valorKwh > 0
              const barColor = isPico ? '#065F46' : '#6EE7B7'
              const textColor = isPico ? '#064E3B' : '#4B5563'
              const textWeight = isPico ? '800' : '600'

              return `
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 0;">
                  <!-- Badge Pico discreto -->
                  <div style="height: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 2px;">
                    ${
                      isPico
                        ? '<span style="font-size: 6.5px; font-weight: 800; text-transform: uppercase; background: #DCFCE7; color: #064E3B; border: 1px solid #86EFAC; padding: 0.5px 3px; border-radius: 3px;">Pico</span>'
                        : ''
                    }
                  </div>

                  <!-- Valor em kWh -->
                  <div style="font-size: 7.5px; font-weight: ${textWeight}; color: ${textColor}; font-family: monospace; margin-bottom: 3px; text-align: center; white-space: nowrap;">
                    ${valorKwh.toLocaleString('pt-BR')}
                  </div>

                  <!-- Coluna com altura fixa onde a barra fica ancorada no fundo -->
                  <div style="height: ${maxBarHeightPx}px; width: 100%; display: flex; align-items: flex-end; justify-content: center;">
                    <div style="width: 80%; max-width: 28px; height: ${barHeightPx}px; background: ${barColor}; border-top-left-radius: 4px; border-top-right-radius: 4px;"></div>
                  </div>

                  <!-- Mês -->
                  <div style="font-size: 8px; font-weight: ${textWeight}; color: ${textColor}; text-transform: uppercase; margin-top: 5px; text-align: center;">
                    ${item.mesNome}
                  </div>
                </div>
              `
            })
            .join('')

          return `
            <!-- ========================================================
                 GRÁFICO: GERAÇÃO MENSAL PREVISTA (JANEIRO A DEZEMBRO — ERECHIM/RS)
                 IMEDIATAMENTE ABAIXO dos cards da seção "Seu Sistema Fotovoltaico"
                 Quebra de página controlada (page-break-inside: avoid)
                 ======================================================== -->
            <div style="background: #FFFFFF; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 10px 14px; margin-top: 10px; margin-bottom: 4px; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.08); page-break-inside: avoid; break-inside: avoid;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid #E5E7EB;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background: #DCFCE7; color: #166534; padding: 2px 7px; border-radius: 9999px; border: 1px solid #BBF7D0;">
                      Sazonalidade Solar
                    </span>
                    <strong style="font-size: 11px; font-weight: 900; color: #166534;">
                      Geração Mensal Prevista (Janeiro a Dezembro — Erechim/RS)
                    </strong>
                  </div>
                  <div style="font-size: 8px; color: #6B7280; margin-top: 2px;">
                    Produção estimada de energia mês a mês em kWh
                  </div>
                </div>
              </div>

              <!-- Gráfico de barras horizontais lado a lado (12 meses) -->
              <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 4px; padding: 4px 6px 6px 6px;">
                ${barrasHtml}
              </div>

              <!-- Linha Única de Totais -->
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 9px; color: #374151;">
                <span style="color: #6B7280;">Total anual:</span>
                <strong style="color: #065F46; font-weight: 900;">${Math.round(totalKwh).toLocaleString('pt-BR')} kWh</strong>
                <span style="margin: 0 6px; color: #D1D5DB;">·</span>
                <span style="color: #6B7280;">Média mensal:</span>
                <strong style="color: #111827; font-weight: 700;">${mediaMensal.toLocaleString('pt-BR')} kWh</strong>
              </div>
            </div>
          `
        })()}

        <!-- Faixa Verde de Monitoramento Inteligente 24/7 com Ícone de Smartphone -->
        <div class="faixa-monitoramento">
          <div class="faixa-mon-left">
            <div class="faixa-mon-icon-box">📱</div>
            <div>
              <div class="faixa-mon-title-row">
                <span class="faixa-monitoramento-title">Monitoramento Inteligente 24/7 pelo Smartphone</span>
                <span class="faixa-mon-pill">Aplicativo Mobile</span>
              </div>
              <div class="faixa-monitoramento-desc">
                Acompanhe geração diária em tempo real, curva solar em kWh, economia mensal acumulada e alertas de desempenho.
              </div>
            </div>
          </div>
          <div class="faixa-mon-badge-right">
            ✓ iOS & Android Inclusos
          </div>
        </div>

        <!-- BLOCOS EXPLICATIVOS COM ILUSTRAÇÕES OFICIAIS DA PROPOSTA -->
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 14px;">
          <!-- Bloco 1: Como funciona o sistema solar (On-Grid) -->
          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.08);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background: #DCFCE7; color: #166534; padding: 2px 7px; border-radius: 9999px; border: 1px solid #BBF7D0;">
                  Engenharia On-Grid
                </span>
                <span style="font-size: 8px; font-weight: 700; color: #16A34A;">Conexão à Rede</span>
              </div>
              <div style="font-size: 11.5px; font-weight: 900; color: #166534; line-height: 1.25; margin-bottom: 4px;">
                Como funciona o sistema solar (On-Grid)
              </div>
              <p style="font-size: 8.5px; color: #374151; line-height: 1.35; margin: 0 0 8px 0;">
                Módulos fotovoltaicos convertem a luz solar em energia limpa contínua e o inversor transforma em corrente alternada para o consumo do imóvel. O excedente é injetado na concessionária gerando créditos energéticos no medidor bidirecional.
              </p>
              <div style="border-radius: 10px; overflow: hidden; border: 1px solid #BBF7D0; background: #FFFFFF; display: flex; align-items: center; justify-content: center; padding: 4px;">
                <img src="${onGridPngAsset}" alt="Como funciona o sistema solar (On-Grid)" style="width: 100%; height: 130px; object-fit: contain; display: block; border-radius: 8px;" />
              </div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #BBF7D0; display: flex; justify-content: space-between; font-size: 8px; color: #166534; font-weight: 800;">
              <span>✓ Homologação e ART Inclusa</span>
              <span style="color: #16A34A;">Turnkey Delfos</span>
            </div>
          </div>

          <!-- Bloco 2: Monitoramento Inteligente 24/7 -->
          <div style="background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.08);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background: #DCFCE7; color: #166534; padding: 2px 7px; border-radius: 9999px; border: 1px solid #BBF7D0;">
                  Telemetria em Tempo Real
                </span>
                <span style="font-size: 8px; font-weight: 700; color: #16A34A;">App Mobile Incluso</span>
              </div>
              <div style="font-size: 11.5px; font-weight: 900; color: #166534; line-height: 1.25; margin-bottom: 4px;">
                Monitoramento Inteligente 24/7
              </div>
              <p style="font-size: 8.5px; color: #374151; line-height: 1.35; margin: 0 0 8px 0;">
                Acompanhe a geração de energia em tempo real na palma da mão. Gráficos diários em kWh, economia acumulada em reais, status do inversor e alertas inteligentes via aplicativo para celular (Android e iOS).
              </p>
              <div style="border-radius: 10px; overflow: hidden; border: 1px solid #BBF7D0; background: #FFFFFF; display: flex; align-items: center; justify-content: center; padding: 4px;">
                <img src="${monitoramentoPngAsset}" alt="Monitoramento Inteligente 24/7" style="width: 100%; height: 130px; object-fit: contain; display: block; border-radius: 8px;" />
              </div>
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #BBF7D0; display: flex; justify-content: space-between; font-size: 8px; color: #166534; font-weight: 800;">
              <span>✓ Suporte e Acesso Vitalício</span>
              <span style="color: #16A34A;">iOS & Android</span>
            </div>
          </div>
        </div>      </div>
      ${renderInternalFooter(3, validade)}
    </section>

    <!-- ========================================================
         SEÇÃO 4 — PROJEÇÃO DE ECONOMIA EM 25 ANOS (CURVAS & PAYBACK)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-4-projecao-25anos">
      <div class="secao-body">
        ${renderInternalHeader('Projeção de Economia em 25 Anos', 4, 'curvas')}

        <!-- Cabeçalho idêntico ao SecaoProjecao25Anos -->
        <div class="secao-header-card inercia" style="background: linear-gradient(90deg, #F0FDF4 0%, #FFFFFF 100%); border-color: #BBF7D0;">
          <div class="badge-diagnostico" style="background: #DCFCE7; color: #166534; border-color: #86EFAC;">
            <span>📈</span> Curva de Retorno e Payback
          </div>
          <h2 class="secao-titulo-h2">Sua economia ao longo do tempo</h2>
          <p class="secao-desc-sub">
            Veja o quanto você vai economizar ao longo da vida útil do sistema solar em comparação com o dinheiro pago à concessionária.
          </p>
        </div>

        <!-- 3 CARDS DE MÉTRICAS EXATOS DO SecaoProjecao25Anos -->
        <div class="cards-metricas-25anos" style="margin-top: 18px;">
          <!-- Card 1: Economia em 1 ano -->
          <div class="card-metrica-destaque">
            <div class="card-metrica-label">Economia em 1 ano</div>
            <div class="card-metrica-numero">${formatBRL(eco1Ano)}</div>
            <div class="card-metrica-sub">Economia acumulada no primeiro ano</div>
          </div>

          <!-- Card 2: Economia em 5 anos -->
          <div class="card-metrica-destaque payback-card">
            <div class="card-metrica-label">Economia em 5 anos</div>
            <div class="card-metrica-numero" style="color: #92400E;">${formatBRL(eco5Anos)}</div>
            <div class="card-metrica-sub">Economia acumulada em 5 anos</div>
          </div>

          <!-- Card 3: Economia em 25 anos -->
          <div class="card-metrica-destaque roi-card">
            <div class="card-metrica-label">Economia em 25 anos</div>
            <div class="card-metrica-numero" style="color: #1D4ED8;">${formatBRL(eco25Anos)}</div>
            <div class="card-metrica-sub">Total poupado na vida útil do sistema</div>
          </div>
        </div>

        <div style="font-size: 8px; font-style: italic; color: #6B7280; margin-top: 10px; text-align: center;">
          * Projeção baseada na degradação linear de fábrica dos módulos e histórico de reajustes tarifários da rede elétrica.
        </div>
      </div>
      ${renderInternalFooter(4, validade)}
    </section>

    <!-- ========================================================
         SEÇÃO 5 — INVESTIMENTO E CONDIÇÕES DE PAGAMENTO (ESPELHADO DO SecaoInvestimentoPagamento.tsx)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-5-investimento-pagamento">
      <div class="secao-body">
        ${renderInternalHeader('Investimento e Condições de Pagamento', 5, 'investimento')}

        <!-- HERO DO INVESTIMENTO TOTAL -->
        <div class="hero-investimento-banner">
          <div>
            <div class="hero-invest-label">Investimento Total do Sistema Turnkey</div>
            <div class="hero-invest-valor">${formatBRL(investimentoTotal)}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 11px; font-weight: 800; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.04em;">
              Investimento único — o sistema é seu
            </div>
            <div class="hero-invest-sub">Projeto Turnkey completo, equipamentos Tier-1 e homologação com ART inclusa</div>
          </div>
        </div>

        <!-- TÍTULO DA SEÇÃO DE PAGAMENTO -->
        <div style="font-size: 12px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
          Condições de pagamento
        </div>

        <!-- 4 CARDS DE PAGAMENTO LADO A LADO -->
        <div class="grid-pagamento-4">
          <!-- Card 1: À Vista -->
          <div class="card-pagamento destaque-verde">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 9.5px; font-weight: 900; color: #022c22; text-transform: uppercase;">À VISTA</span>
                <span style="font-size: 8px; font-weight: 800; background: #D1FAE5; color: #064E3B; padding: 2px 6px; border-radius: 9999px;">Sem Juros</span>
              </div>
              <div class="card-pagamento-valor" style="color: #047857; margin-top: 6px;">${formatBRL(aVistaValor)}</div>
              <div class="card-pagamento-desc">
                ${
                  aVistaDesconto > 0
                    ? `Desconto de ${formatBRL(aVistaDesconto)} aplicado`
                    : 'Valor total do projeto à vista'
                }
              </div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #A7F3D0; font-size: 8.5px; line-height: 1.45;">
              <div style="display: flex; justify-content: space-between; color: #6B7280;">
                <span>Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800;">${formatBRL(contaHoje)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #6B7280; margin-top: 2px;">
                <span>Conta c/ solar:</span>
                <strong style="color: #047857; font-weight: 800;">${formatBRL(parcelamento?.aVista?.contaComSolar !== undefined ? parcelamento.aVista.contaComSolar : 70)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #064E3B; font-weight: 900; margin-top: 4px; padding-top: 4px; border-top: 1px solid #A7F3D0;">
                <span>Economia/mês:</span>
                <span>${formatBRL(Math.max(0, contaHoje - (parcelamento?.aVista?.contaComSolar !== undefined ? parcelamento.aVista.contaComSolar : 70)))}</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Cartão -->
          <div class="card-pagamento">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 9.5px; font-weight: 900; color: #111827; text-transform: uppercase;">CARTÃO DE CRÉDITO</span>
                <span style="font-size: 8px; font-weight: 800; background: #F3F4F6; color: #374151; padding: 2px 6px; border-radius: 9999px;">${cartaoParcelas}x</span>
              </div>
              <div class="card-pagamento-valor" style="color: #111827; margin-top: 6px;">
                <span style="font-size: 11px; font-weight: 700; color: #4B5563;">${cartaoParcelas}x de </span>${formatBRL(cartaoValor)}
              </div>
              <div class="card-pagamento-desc">
                ${
                  cartaoEntrada > 0
                    ? `<span style="color: #047857; font-weight: 700; display: block;">Entrada: ${formatBRL(cartaoEntrada)}</span>`
                    : ''
                }
                Total: ${formatBRL(cartaoEntrada + cartaoValor * cartaoParcelas)}
              </div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #F3F4F6; font-size: 8.5px; line-height: 1.45;">
              <div style="display: flex; justify-content: space-between; color: #6B7280;">
                <span>Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800;">${formatBRL(cartaoContaSemSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #6B7280; margin-top: 2px;">
                <span>Conta c/ solar:</span>
                <strong style="color: #047857; font-weight: 800;">${formatBRL(cartaoContaComSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #111827; font-weight: 900; margin-top: 4px; padding-top: 4px; border-top: 1px solid #F3F4F6;">
                <span>Parcela + Conta:</span>
                <span>${formatBRL(cartaoDesembolso)}</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Financiamento A -->
          <div class="card-pagamento">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 9.5px; font-weight: 900; color: #111827; text-transform: uppercase;">${finanANome}</span>
                <span style="font-size: 8px; font-weight: 800; background: #FEF3C7; color: #78350F; padding: 2px 6px; border-radius: 9999px;">${finanAParcelas}x</span>
              </div>
              <div class="card-pagamento-valor" style="color: #111827; margin-top: 6px;">
                <span style="font-size: 11px; font-weight: 700; color: #4B5563;">${finanAParcelas}x de </span>${formatBRL(finanAValor)}
              </div>
              <div class="card-pagamento-desc">
                ${
                  finanAEntrada > 0
                    ? `<span style="color: #92400E; font-weight: 700; display: block;">Entrada: ${formatBRL(finanAEntrada)}</span>`
                    : ''
                }
                Total: ${formatBRL(finanAEntrada + finanAValor * finanAParcelas)}
              </div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #F3F4F6; font-size: 8.5px; line-height: 1.45;">
              <div style="display: flex; justify-content: space-between; color: #6B7280;">
                <span>Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800;">${formatBRL(finanAContaSemSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #6B7280; margin-top: 2px;">
                <span>Conta c/ solar:</span>
                <strong style="color: #047857; font-weight: 800;">${formatBRL(finanAContaComSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #111827; font-weight: 900; margin-top: 4px; padding-top: 4px; border-top: 1px solid #F3F4F6;">
                <span>Parcela + Conta:</span>
                <span>${formatBRL(finanADesembolso)}</span>
              </div>
            </div>
          </div>

          <!-- Card 4: Financiamento B -->
          <div class="card-pagamento destaque-azul" style="border: 2px solid #60A5FA; background: #F0F9FF;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 9.5px; font-weight: 900; color: #172554; text-transform: uppercase;">${finanBNome}</span>
                <span style="font-size: 8px; font-weight: 800; background: #BFDBFE; color: #1E3A8A; padding: 2px 6px; border-radius: 9999px;">${finanBParcelas}x</span>
              </div>
              <div class="card-pagamento-valor" style="color: #1E40AF; margin-top: 6px;">
                <span style="font-size: 11px; font-weight: 700; color: #1E3A8A;">${finanBParcelas}x de </span>${formatBRL(finanBValor)}
              </div>
              <div class="card-pagamento-desc">
                ${
                  finanBEntrada > 0
                    ? `<span style="color: #1E3A8A; font-weight: 700; display: block;">Entrada: ${formatBRL(finanBEntrada)}</span>`
                    : ''
                }
                Total: ${formatBRL(finanBEntrada + finanBValor * finanBParcelas)}
              </div>
            </div>
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #BFDBFE; font-size: 8.5px; line-height: 1.45;">
              <div style="display: flex; justify-content: space-between; color: #6B7280;">
                <span>Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800;">${formatBRL(finanBContaSemSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #6B7280; margin-top: 2px;">
                <span>Conta c/ solar:</span>
                <strong style="color: #047857; font-weight: 800;">${formatBRL(finanBContaComSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; color: #1E3A8A; font-weight: 900; margin-top: 4px; padding-top: 4px; border-top: 1px solid #BFDBFE;">
                <span>Parcela + Conta:</span>
                <span>${formatBRL(finanBDesembolso)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BLOCO DE PROJEÇÃO COM REAJUSTE TARIFÁRIO DE 9% AO ANO (CONCESSIONÁRIA) -->
        <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border: 1.5px solid #FCD34D; border-radius: 10px; padding: 10px 14px; margin-top: 8px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 22px; height: 22px; border-radius: 6px; background: #F59E0B; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 12px; shrink-0;">
              📈
            </div>
            <span style="font-size: 9.5px; font-weight: 900; color: #92400E; text-transform: uppercase; letter-spacing: 0.03em;">
              Projeção com Reajuste Tarifário de 9% ao ano (Concessionária)
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <!-- Card 4 anos -->
            <div style="background: #FFFFFF; border: 1px solid #FDE68A; border-radius: 8px; padding: 7px 12px;">
              <span style="font-size: 8.5px; color: #6B7280; font-weight: 700; display: block; margin-bottom: 3px;">
                Conta daqui a 4 anos:
              </span>
              <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 11px; font-weight: 800; color: #DC2626; text-decoration: line-through;">
                  ${formatBRL(contaSemSolar4AnosFinal)}
                </span>
                <span style="font-size: 12px; font-weight: 900; color: #047857;">
                  ${formatBRL(contaComSolar4AnosFinal)} <span style="font-size: 9px; font-weight: 700;">com solar</span>
                </span>
              </div>
            </div>

            <!-- Card 10 anos -->
            <div style="background: #FFFFFF; border: 1px solid #FDE68A; border-radius: 8px; padding: 7px 12px;">
              <span style="font-size: 8.5px; color: #6B7280; font-weight: 700; display: block; margin-bottom: 3px;">
                Conta daqui a 10 anos:
              </span>
              <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 11px; font-weight: 800; color: #DC2626; text-decoration: line-through;">
                  ${formatBRL(contaSemSolar10AnosFinal)}
                </span>
                <span style="font-size: 12px; font-weight: 900; color: #047857;">
                  ${formatBRL(contaComSolar10AnosFinal)} <span style="font-size: 9px; font-weight: 700;">com solar</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD DO PAYBACK ESTIMADO (ABAIXO DOS CARDS DE CONDIÇÕES DE PAGAMENTO) -->
        <div style="background: #FFFFFF; border: 1.5px solid #F59E0B; border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-top: 8px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: #FEF3C7; border: 1px solid #FDE68A; display: flex; align-items: center; justify-content: center; font-size: 18px; shrink-0;">
              ⏱️
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; background: #FEF3C7; color: #92400E; padding: 1px 6px; border-radius: 4px; border: 1px solid #FDE68A;">
                  Tempo de Retorno do Investimento
                </span>
                <span style="font-size: 8px; font-weight: 800; background: #DCFCE7; color: #166534; padding: 1px 6px; border-radius: 4px; border: 1px solid #86EFAC;">
                  Retorno Garantido
                </span>
              </div>
              <div style="font-size: 11.5px; font-weight: 900; color: #1F2937;">Payback Estimado</div>
              <p style="margin: 1px 0 0 0; font-size: 8.5px; color: #4B5563; max-width: 440px; line-height: 1.3;">
                Tempo para que a economia na fatura de energia pague 100% do investimento. A partir desse momento, todo o ganho transforma-se em patrimônio e lucro líquido.
              </p>
            </div>
          </div>

          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border: 1.5px solid #FCD34D; border-radius: 8px; padding: 6px 12px; text-align: right; shrink-0;">
            <span style="font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #92400E; display: block;">
              Payback do Sistema
            </span>
            <div style="font-size: 15px; font-weight: 900; color: #B45309; line-height: 1.2; margin: 1px 0;">
              ${paybackTextoFinal}
            </div>
            <span style="font-size: 8px; color: #78350F; font-weight: 700; display: block;">
              Quitação prevista: ${quitacaoMesAno}
            </span>
          </div>
        </div>

        <!-- CARD DE CUSTO DE POSTERGAÇÃO (DESTAQUE ÂMBAR / LARANJA) -->
        <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 50%, #FFF7ED 100%); border: 1.5px solid #F59E0B; border-radius: 12px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 14px; box-shadow: 0 1px 3px rgba(245, 158, 11, 0.1); margin-top: 6px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: #F59E0B; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 18px; shrink-0;">
              ⚠️
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                <span style="font-size: 8px; font-weight: 900; text-transform: uppercase; background: #FEF3C7; color: #92400E; padding: 1px 6px; border-radius: 4px; border: 1px solid #FDE68A;">
                  Custo de Postergação
                </span>
                <span style="font-size: 8px; font-weight: 800; color: #78350F;">
                  Cada mês sem energia solar custa dinheiro
                </span>
              </div>
              <div style="font-size: 11.5px; font-weight: 900; color: #1F2937;">Não adie sua economia</div>
              <p style="margin: 1px 0 0 0; font-size: 8.5px; color: #4B5563; max-width: 440px; line-height: 1.3;">
                Adiar a decisão significa continuar pagando a conta cheia para a concessionária sem construir patrimônio.
              </p>
            </div>
          </div>

          <div style="background: #FFFFFF; border: 1.5px solid #FCD34D; border-radius: 8px; padding: 6px 12px; text-align: right; shrink-0;">
            <span style="font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #92400E; display: block;">
              Valor perdido por mês
            </span>
            <div style="font-size: 15px; font-weight: 900; color: #C2410C; line-height: 1.2; margin: 1px 0;">
              ${formatBRL(economiaMensal)} <span style="font-size: 9px; font-weight: 700;">/mês</span>
            </div>
          </div>
        </div>

        <!-- BADGE DE URGÊNCIA -->
        <div class="badge-urgencia-validade">
          <span>⏰ Condições válidas por <strong>${validade} dias</strong> (${dataFormatada}).</span>
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
          <!-- Bloco da Empresa (EMPRESA CONTRATADA à esquerda) -->
          <div class="assinatura-bloco">
            <!-- 1. Topo: Categoria + Local e data -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #065F46; letter-spacing: 0.05em;">
                EMPRESA CONTRATADA
              </span>
              <span style="font-size: 7.5px; color: #6B7280; font-weight: 600;">
                Erechim / RS, ${dataFormatada}
              </span>
            </div>

            <!-- 2. Linha de assinatura com ~55px de espaço livre no topo -->
            <div class="linha-assinatura-final"></div>

            <!-- 3. Nome de quem assina + subtítulo -->
            <div style="text-align: center; margin-bottom: 10px;">
              <div style="font-size: 9px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.02em;">
                ${empresa?.responsavelTecnico ?? 'João Victor Bagetti Fuchs'}
              </div>
              <div style="font-size: 7.5px; font-weight: 700; color: #065F46; margin-top: 2px;">
                Responsável Técnico${empresa?.crea ? ` — ${empresa.crea}` : ''}
              </div>
            </div>

            <!-- 4. Divisor tracejado sutil e bloco de dados compactos -->
            <div style="border-top: 1px dashed #E5E7EB; padding-top: 8px; margin-top: 2px;" class="assinatura-dados">
              <div><strong>Razão Social:</strong> ${(empresa?.razaoSocial ?? 'DELFOS ENGENHARIA LTDA') ? `${empresa?.razaoSocial ?? 'DELFOS ENGENHARIA LTDA'} (Delfos Solar)` : ''}</div>
              <div><strong>CNPJ:</strong> ${empresa?.cnpj ?? '21.379.952/0001-38'}</div>
              <div><strong>Resp. Técnico:</strong> ${empresa?.responsavelTecnico ?? 'João Victor Bagetti Fuchs'}${empresa?.crea ? ` (${empresa.crea})` : ''}</div>
              <div><strong>Endereço:</strong> ${empresa?.endereco ?? 'Rua Espírito Santo, nº 275 – Centro, Erechim/RS'}</div>
              <div><strong>Contato:</strong> ${[empresa?.telefone ?? '(54) 99129-2121', empresa?.email ?? 'contato@delfos.eng.br'].filter(Boolean).join(' • ')}</div>
            </div>
          </div>

          <!-- Bloco do Cliente (CLIENTE / CONTRATANTE à direita) -->
          <div class="assinatura-bloco">
            <!-- 1. Topo: Categoria + Local e data -->
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 7.5px; font-weight: 800; text-transform: uppercase; color: #1E40AF; letter-spacing: 0.05em;">
                CLIENTE / CONTRATANTE
              </span>
              <span style="font-size: 7.5px; color: #6B7280; font-weight: 600;">
                Local e data: ______________________, ____/____/________
              </span>
            </div>

            <!-- 2. Linha de assinatura com ~55px de espaço livre no topo -->
            <div class="linha-assinatura-final"></div>

            <!-- 3. Nome do cliente + subtítulo -->
            <div style="text-align: center; margin-bottom: 10px;">
              <div style="font-size: 9px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.02em;">
                ${nomeCliente}
              </div>
              <div style="font-size: 7.5px; font-weight: 700; color: #1E40AF; margin-top: 2px;">
                De acordo com as especificações e valores da proposta
              </div>
            </div>

            <!-- 4. Divisor tracejado sutil e bloco de dados compactos -->
            <div style="border-top: 1px dashed #E5E7EB; padding-top: 8px; margin-top: 2px;" class="assinatura-dados">
              <div><strong>Nome/Razão Social:</strong> ${nomeCliente}</div>
              <div><strong>CPF/CNPJ:</strong> ${cliente?.cpfOuCnpj || ''}</div>
              <div><strong>Endereço:</strong> ${cliente?.endereco ? `${cliente.endereco}${cliente?.municipio ? `, ${cliente.municipio}` : ''}` : cliente?.municipio || ''}</div>
              <div><strong>Contato:</strong> ${[cliente?.telefone, cliente?.email].filter(Boolean).join(' • ')}</div>
            </div>
          </div>
        </div>      </div>
      ${renderInternalFooter(5, validade)}
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

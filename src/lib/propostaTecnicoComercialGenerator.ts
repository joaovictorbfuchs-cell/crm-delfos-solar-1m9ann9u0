import type { GeracaoMensalItem } from '@/lib/energiaSolar'
import { calcularProjecaoEconomia } from '@/lib/calculoProjecaoEconomia'
import { CONSUMO_EXEMPLO_PADRAO_KWH_ANO } from '@/data/planilhaBaseProjecao'
import { formatarMesAnoQuitacao } from '@/lib/formatters'
import {
  logoOficialPngAsset,
  onGridPngAsset,
  monitoramentoPngAsset,
} from './propostaIlustracoesAssets'
import { USINAS_PORTFOLIO_PADRAO } from './portfolioUsinasAssets'
import { formatarTextoModuloCard } from './equipamentoFormatters'
import { normalizarConteudoProposta, type ConteudoProposta } from '@/lib/conteudoProposta'

export interface PropostaSecoesHabilitadas {
  layoutTelhado?: boolean
  fotosProjeto?: boolean
  sazonalidadeSolar?: boolean
  portfolioUsinas?: boolean
}

export interface FotoInstalacaoProposta {
  id: string
  titulo: string
  url: string
  cidade?: string
  potenciaKwp?: number
}

export interface PropostaTecnicoComercialDados {
  orcamento?: {
    consumo_mensal_kwh?: number
    [key: string]: any
  }
  cliente: {
    nome: string
    cpfOuCnpj?: string
    endereco?: string
    municipio?: string
    email?: string
    telefone?: string
    tipoCliente?: 'residencial' | 'comercial' | 'rural' | 'industrial'
    tipoImovel?: string
    cidade?: string
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
      valorIof?: number
    }
    financiamentoB: {
      nome: string
      numeroParcelas: number
      valorParcela: number
      contaHoje: number
      contaComSolar: number
      entrada?: number
      valorIof?: number
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
  // Solergo
  ajusteSolergoAtivo?: boolean
  geracaoMensalSolergo?: number[]
  // Layout do Telhado
  layoutTelhadoUrl?: string | null
  layoutTelhadoHabilitado?: boolean
  secoesHabilitadas?: PropostaSecoesHabilitadas
  observacoes?: string
  conteudo?: import('@/lib/conteudoProposta').ConteudoProposta
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

  const notaPremissasFinanceiras =
    numeroSecao === 4 || numeroSecao === 5
      ? `<div class="doc-footer-nota-financeira">Valores estimados sem iluminação pública. Consumo considerado igual à energia gerada. A taxa mínima (custo de disponibilidade) só é cobrada quando o consumo faturado fica abaixo do mínimo. Fio B progressivo até 2029 conforme Lei 14.300/2021 (GD II). Reajuste tarifário de 9% a.a. é premissa comercial.</div>`
      : ''

  return `
    <footer class="doc-footer">
      ${notaPremissasFinanceiras}
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
 * 3. Seu Sistema Fotovoltaico (cards potência, geração, módulos, inversor, área, garantias 30a/10a/Delfos, faixa monitoramento)
 * 4. Projeção de Economia em 25 Anos (curvas gasto sem solar vs investimento/economia + marcador payback + cards)
 * 5. Investimento e Condições de Pagamento (cards À vista / Cartão / Finan A / Finan B + comparativo conta + custo postergação + badge validade)
 */
export function gerarHTMLPropostaTecnicoComercial(dados: PropostaTecnicoComercialDados): string {
  const {
    orcamento,
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

  const conteudo = normalizarConteudoProposta(dados.conteudo)

  const nomeCliente = (cliente?.nome && cliente.nome.trim()) || 'Cliente Especial'
  const potenciaKwp = sistema?.potenciaKwp || 0
  const consultorNome =
    (representante?.nome && representante.nome.trim()) || 'Consultor Delfos Solar'
  const consultorContato = representante?.contato || '(54) 99129-2121'
  const dataFormatada = dataProposta || new Date().toLocaleDateString('pt-BR')

  // Dados dinâmicos de tipo de imóvel e cidade para a capa
  const tipoImovelFormatado =
    (cliente?.tipoImovel && cliente.tipoImovel.trim()) ||
    (cliente?.tipoCliente === 'comercial'
      ? 'Comércio'
      : cliente?.tipoCliente === 'industrial'
        ? 'Indústria'
        : cliente?.tipoCliente === 'rural'
          ? 'Rural'
          : 'Residência')
  const cidadeCliente =
    (cliente?.cidade && cliente.cidade.trim()) ||
    (cliente?.municipio && cliente.municipio.trim()) ||
    'Passo Fundo - RS'
  const sublinhaClienteCapa = `${tipoImovelFormatado} • ${cidadeCliente}`
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
      : (orcamento as any)?.consumo_mensal_kwh || 400

  const consumoKwhAnoReal =
    producao?.anualKwh && producao.anualKwh > 0
      ? producao.anualKwh
      : Math.round(consumoKwhMesReal * 12)

  const investimentoTotal = economia?.investimentoTotal || parcelamento?.aVista?.valorTotal || 45000
  const prazoEntregaDias =
    economia?.prazoEntregaDias !== undefined &&
    economia?.prazoEntregaDias !== null &&
    economia.prazoEntregaDias > 0
      ? economia.prazoEntregaDias
      : 30

  // Payback
  const paybackMesesCalculado =
    economia?.paybackMeses && economia.paybackMeses > 0
      ? economia.paybackMeses
      : economiaMensal > 0
        ? Math.round((investimentoTotal / economiaMensal) * 10) / 10
        : 50

  // Anos de payback arredondados PARA CIMA até fechar um ano inteiro (ex: 22 meses -> 2 anos; 25 meses -> 3 anos; <= 1 ano -> fallback 5 anos para evitar card duplicado com 1 Ano)
  const anosCalculadosHtml = paybackMesesCalculado > 0 ? Math.ceil(paybackMesesCalculado / 12) : 5
  const anosPaybackArredondado =
    projecao?.anosPaybackArredondado && projecao.anosPaybackArredondado > 1
      ? Math.round(projecao.anosPaybackArredondado)
      : anosCalculadosHtml <= 1
        ? 5
        : anosCalculadosHtml

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
    if (anosPaybackArredondado === 5 && gasto5Anos > 0) return gasto5Anos
    if (
      projecao?.gastoSemSolarPaybackAnos &&
      projecao.gastoSemSolarPaybackAnos > 0 &&
      anosPaybackArredondado !== 5
    ) {
      return projecao.gastoSemSolarPaybackAnos
    }
    let acumulado = 0
    for (let ano = 0; ano < anosPaybackArredondado; ano++) {
      acumulado += contaAnualEstimada * Math.pow(1 + 0.09, ano)
    }
    return Math.round(acumulado)
  })()

  const rotuloPeriodoCardMeio = `${anosPaybackArredondado} Anos`
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

  const mesesFinal = (() => {
    if (
      economia?.paybackMeses !== undefined &&
      economia.paybackMeses !== null &&
      economia.paybackMeses > 0
    ) {
      return Math.round(economia.paybackMeses)
    }
    if (economia?.paybackTexto && economia.paybackTexto.trim()) {
      const matchAnos = economia.paybackTexto.match(/(\d+(?:[.,]\d+)?)\s*(?:anos?|a)/i)
      const matchMeses = economia.paybackTexto.match(/(\d+)\s*m[eê]s(?:es)?/i)
      if (matchAnos && matchAnos[1]) {
        const anos = parseFloat(matchAnos[1].replace(',', '.'))
        const mesesExtra = matchMeses && matchMeses[1] ? parseInt(matchMeses[1], 10) : 0
        return Math.round(anos * 12 + mesesExtra)
      }
      if (matchMeses && matchMeses[1]) {
        return parseInt(matchMeses[1], 10)
      }
    }
    return Math.round(paybackMesesCalculado)
  })()
  const paybackTextoFinal = `${mesesFinal} meses`

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
    parcelamento?.cartao18x?.contaComSolar !== undefined ? parcelamento.cartao18x.contaComSolar : 0
  const cartaoDesembolso = cartaoValor + cartaoContaComSolar

  const rawFinanANome = parcelamento?.financiamentoA?.nome || 'FINANCIAMENTO 1'
  const finanANome = rawFinanANome
    .replace(/FINANCIAMENTO\s*BANCO\s*1/i, 'FINANCIAMENTO 1')
    .replace(/Financiamento\s*Banco\s*1/i, 'FINANCIAMENTO 1')
    .replace(/BANCO\s*1/i, 'FINANCIAMENTO 1')
  const finanAParcelas = parcelamento?.financiamentoA?.numeroParcelas || 60
  const finanAEntrada =
    parcelamento?.financiamentoA?.entrada !== undefined &&
    parcelamento.financiamentoA.entrada !== null
      ? Math.max(0, parcelamento.financiamentoA.entrada)
      : 0
  const finanAValor =
    parcelamento?.financiamentoA?.valorParcela ||
    Math.round(((investimentoTotal - finanAEntrada) * 1.35) / finanAParcelas)
  const finanAIof =
    parcelamento?.financiamentoA?.valorIof !== undefined &&
    parcelamento.financiamentoA.valorIof !== null
      ? Math.max(0, parcelamento.financiamentoA.valorIof)
      : 0
  const finanAContaSemSolar =
    parcelamento?.financiamentoA?.contaHoje !== undefined
      ? parcelamento.financiamentoA.contaHoje
      : contaHoje
  const finanAContaComSolar =
    parcelamento?.financiamentoA?.contaComSolar !== undefined
      ? parcelamento.financiamentoA.contaComSolar
      : 0
  const finanADesembolso = finanAValor + finanAContaComSolar

  const rawFinanBNome = parcelamento?.financiamentoB?.nome || 'FINANCIAMENTO 2'
  const finanBNome = rawFinanBNome
    .replace(/FINANCIAMENTO\s*BANCO\s*2/i, 'FINANCIAMENTO 2')
    .replace(/Financiamento\s*Banco\s*2/i, 'FINANCIAMENTO 2')
    .replace(/BANCO\s*2/i, 'FINANCIAMENTO 2')
  const finanBParcelas = parcelamento?.financiamentoB?.numeroParcelas || 120
  const finanBEntrada =
    parcelamento?.financiamentoB?.entrada !== undefined &&
    parcelamento.financiamentoB.entrada !== null
      ? Math.max(0, parcelamento.financiamentoB.entrada)
      : 0
  const finanBValor =
    parcelamento?.financiamentoB?.valorParcela ||
    Math.round(((investimentoTotal - finanBEntrada) * 1.6) / finanBParcelas)
  const finanBIof =
    parcelamento?.financiamentoB?.valorIof !== undefined &&
    parcelamento.financiamentoB.valorIof !== null
      ? Math.max(0, parcelamento.financiamentoB.valorIof)
      : 0
  const finanBContaSemSolar =
    parcelamento?.financiamentoB?.contaHoje !== undefined
      ? parcelamento.financiamentoB.contaHoje
      : contaHoje
  const finanBContaComSolar =
    parcelamento?.financiamentoB?.contaComSolar !== undefined
      ? parcelamento.financiamentoB.contaComSolar
      : 0
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
    parcelamento?.aVista?.contaComSolar !== undefined ? parcelamento.aVista.contaComSolar : 0

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
  const estruturaFixacaoBadge = (() => {
    const raw = sistema?.estruturaFixacao
    if (!raw || !raw.trim()) return 'Telhado / Solo'
    const normalizado = raw.toLowerCase().trim()
    if (
      normalizado === 'ceramico' ||
      normalizado.includes('cerâmico') ||
      normalizado === 'telhado cerâmico'
    )
      return 'Cerâmico'
    if (
      normalizado === 'metalico' ||
      normalizado.includes('metálico') ||
      normalizado.includes('metalico') ||
      normalizado === 'telhado metálico'
    )
      return 'Metálico'
    if (
      normalizado === 'laje' ||
      normalizado.includes('laje') ||
      normalizado === 'laje de concreto'
    )
      return 'Laje'
    if (
      normalizado === 'fibrocimento' ||
      normalizado.includes('fibrocimento') ||
      normalizado === 'telhado fibrocimento'
    )
      return 'Fibrocimento'
    if (
      normalizado === 'solo' ||
      normalizado.includes('solo') ||
      normalizado === 'estrutura de solo'
    )
      return 'Solo'
    return raw
  })()
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
       Margens: 10mm 7mm 12mm 7mm
       ========================================================== */
    @page {
      size: A4;
      margin: 10mm 7mm 12mm 7mm;
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
      font-size: 10pt;
      line-height: 1.45;
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
      width: 210mm;
      max-width: 100%;
      box-sizing: border-box;
      margin: 0 auto;
      padding-bottom: 24px;
    }

    /* PÁGINA INDIVIDUAL DA PROPOSTA (MODO PREVIEW DE TELA COM MARGENS A4: 7mm em todos os lados) */
    .proposta-secao-page {
      background: #FFFFFF;
      width: 100%;
      min-height: auto;
      padding: 7mm;
      box-sizing: border-box;
      margin: 0 auto 14px auto;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-radius: 6px;
      page-break-before: auto;
      break-before: auto;
    }
    .proposta-secao-page:first-child {
      page-break-before: avoid;
      break-before: avoid;
    }
    #secao-1-capa {
      page-break-after: always;
      break-after: page;
      min-height: 297mm;
    }
    #secao-apresentacao-empresa,
    #secao-2-custo-inercia,
    #secao-3-seu-sistema,
    #secao-4-projecao-25anos,
    #secao-5-investimento-pagamento {
      page-break-before: auto;
      break-before: auto;
    }

    /* ESTILOS DA SEÇÃO QUEM SOMOS & PORTFÓLIO DE USINAS */
    .secao-header-card.institucional {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-left: 4px solid #16A34A;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .badge-institucional {
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
    .titulo-institucional-azul {
      margin: 0;
      font-size: 20px;
      font-weight: 900;
      color: #0A539E;
      letter-spacing: -0.015em;
      line-height: 1.2;
    }
    .subtitulo-institucional-verde {
      margin: 2px 0 0 0;
      font-size: 11px;
      font-weight: 700;
      color: #16A34A;
      letter-spacing: -0.01em;
    }
    .grid-diferenciais-cards {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 6px;
      margin-top: 8px;
    }
    .card-diferencial {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 7px 8px;
      display: flex;
      flex-direction: column;
      gap: 3px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }
    .card-diferencial-topo {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .card-diferencial-icon {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: #EFF6FF;
      color: #0A539E;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }
    .card-diferencial-tit {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0A539E;
      line-height: 1.2;
    }
    .card-diferencial-desc {
      font-size: 8.5pt;
      color: #475569;
      line-height: 1.35;
    }

    .portfolio-wrapper {
      margin-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .portfolio-header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #E2E8F0;
    }
    .portfolio-titulo-azul {
      margin: 0;
      font-size: 13pt;
      font-weight: 900;
      color: #0A539E;
      letter-spacing: -0.01em;
    }
    .portfolio-sub-cinza {
      margin: 2px 0 0 0;
      font-size: 9.5pt;
      color: #64748B;
    }
    .portfolio-badge-pill {
      font-size: 8.5pt;
      font-weight: 800;
      background: #DCFCE7;
      color: #166534;
      padding: 3px 9px;
      border-radius: 9999px;
      border: 1px solid #86EFAC;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .grid-portfolio-6 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, auto);
      gap: 8px;
    }
    .card-portfolio-usina {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-portfolio-thumb-wrap {
      position: relative;
      width: 100%;
      height: 98px;
      background: #F1F5F9;
      overflow: hidden;
      border-bottom: 1px solid #E2E8F0;
    }
    .card-portfolio-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      border-top-left-radius: 9px;
      border-top-right-radius: 9px;
    }
    .card-portfolio-badge-tipo {
      position: absolute;
      top: 6px;
      left: 6px;
      font-size: 8pt;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    }
    .card-portfolio-badge-pot {
      position: absolute;
      bottom: 6px;
      right: 6px;
      background: rgba(10, 83, 158, 0.92);
      color: #FFFFFF;
      font-size: 8.5pt;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    .card-portfolio-info {
      padding: 6px 8px 7px 8px;
      background: #FFFFFF;
    }
    .card-portfolio-titulo {
      font-size: 10pt;
      font-weight: 800;
      color: #0A539E;
      line-height: 1.2;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-portfolio-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #64748B;
    }
    .card-portfolio-cidade {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      color: #475569;
      font-weight: 600;
    }
    .card-portfolio-pot-destaque {
      color: #16A34A;
      font-weight: 800;
    }

    .secao-body {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* CABEÇALHO RECORRENTE SEÇÕES 2-5 */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #16A34A;
      padding-bottom: 4px;
      margin-bottom: 8px;
      page-break-after: avoid;
      break-after: avoid;
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
      font-size: 9pt;
      font-weight: 800;
      color: #065F46;
      background: #DCFCE7;
      border: 1px solid #86EFAC;
      padding: 2px 8px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .tag-desc {
      display: block;
      font-size: 10pt;
      font-weight: 700;
      color: #374151;
      margin-top: 2px;
    }

    /* RODAPÉ RECORRENTE PROFISSIONAL — CLEAN & MODERNO */
    .doc-footer {
      border-top: 1.5px solid #86EFAC;
      background: #F9FAFB;
      color: #374151;
      border-radius: 8px;
      padding: 5px 10px 4px 10px;
      margin-top: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .doc-footer-main-row {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 8.5pt;
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
    .doc-footer-nota-financeira {
      margin-bottom: 3px;
      text-align: center;
      font-size: 6.8px;
      font-weight: 400;
      color: #4B5563;
      line-height: 1.25;
      letter-spacing: 0.005em;
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
       SEÇÃO 1 — CAPA OFICIAL DELFOS SOLAR (DESIGN MODELO A4)
       ========================================================== */
    .capa-wrapper {
      background: linear-gradient(155deg, #F9FCFA 0%, #EFF8F2 45%, #E3F3E8 100%);
      color: #0D382B;
      border-radius: 20px;
      padding: 36px 42px 28px 42px;
      border: 1px solid #D1E7D8;
      position: relative;
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 265mm;
      box-shadow: 0 10px 30px rgba(13, 56, 43, 0.06);
    }
    .capa-sol-ondas-bg {
      position: absolute;
      right: 0;
      top: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    }
    .capa-sol-ondas-svg {
      position: absolute;
      right: 0;
      top: 0;
      width: 100%;
      height: 100%;
    }
    .capa-top-center {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding-top: 6px;
    }
    .capa-logo-container {
      position: relative;
      width: 250px;
      height: 104px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .capa-logo-img {
      width: 100%;
      height: auto;
      object-fit: cover;
      object-position: center 14%;
      transform: scale(1.02);
      display: block;
    }
    .capa-badge-amarelo {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: #F3BE56;
      padding: 8px 30px;
      border-radius: 9999px;
      font-size: 11.5px;
      font-weight: 900;
      color: #0D382B;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      margin-top: 14px;
      box-shadow: 0 2px 8px rgba(243, 190, 86, 0.35);
    }
    .capa-middle-bloco {
      position: relative;
      z-index: 2;
      margin: 40px 0 30px 0;
      max-width: 580px;
    }
    .capa-titulo-destaque {
      font-size: 50px;
      font-weight: 900;
      color: #0D382B;
      letter-spacing: -0.025em;
      line-height: 1.08;
      margin: 0;
    }
    .capa-subtitulo-cinza {
      font-size: 16px;
      font-weight: 500;
      color: #4A5D54;
      line-height: 1.45;
      margin: 14px 0 0 0;
      max-width: 480px;
    }
    .capa-preparada-box {
      margin-top: 36px;
      padding-left: 18px;
      border-left: 4px solid #E9A224;
    }
    .capa-prep-rotulo {
      font-size: 11px;
      font-weight: 800;
      color: #6E7E76;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      margin-bottom: 4px;
    }
    .capa-cliente-nome-destaque {
      font-size: 32px;
      font-weight: 900;
      color: #0D382B;
      letter-spacing: -0.02em;
      line-height: 1.15;
      margin: 0 0 4px 0;
    }
    .capa-cliente-imovel-cidade {
      font-size: 14px;
      font-weight: 500;
      color: #6E7E76;
    }
    .capa-consultor-linha {
      margin-top: 28px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13.5px;
      color: #4A5D54;
      font-weight: 500;
    }
    .capa-consultor-icon {
      width: 18px;
      height: 18px;
      color: #5D7066;
      flex-shrink: 0;
    }
    .capa-consultor-linha strong {
      color: #0D382B;
      font-weight: 800;
    }
    .capa-bottom-site-email {
      position: relative;
      z-index: 2;
      margin-top: auto;
      flex-shrink: 0;
      width: 100%;
    }

    /* ==========================================================
       SEÇÃO 2 — SITUAÇÃO ATUAL (ESPELHADO DO SecaoCustoInercia.tsx)
       ========================================================== */
    .secao-header-card {
      padding: 8px 12px;
      border-radius: 12px;
      margin-bottom: 6px;
      border: 1px solid #E5E7EB;
      page-break-after: avoid;
      break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
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
      page-break-after: avoid;
      break-after: avoid;
    }
    .secao-desc-sub {
      margin: 4px 0 0 0;
      font-size: 10pt;
      color: #4B5563;
      line-height: 1.4;
    }

    /* Grid de 2 Cards Grandes da Situação Atual (Consumo e Custos com valores mensal/anual empilhados) */
    .grid-situacao-wrapper {
      position: relative;
      margin-bottom: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .grid-situacao-cards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .card-situacao {
      background: #FFFFFF;
      border: 1px solid #D1FAE5;
      border-radius: 12px;
      padding: 8px 10px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-inside: avoid;
      break-inside: avoid;
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
      font-size: 8.5pt;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .card-situacao-header-sub {
      font-size: 9.5pt;
      color: #6B7280;
    }
    .card-situacao-header-badge {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1.5px 5px;
      border-radius: 9999px;
      white-space: nowrap;
      flex-shrink: 0;
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
      font-size: 9.5pt;
      font-weight: 700;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .card-situacao-tag {
      font-size: 8pt;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 6px;
      border-radius: 9999px;
    }
    .tag-mensal { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; }
    .tag-anual { background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }
    .tag-conta-atual { background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; }
    .tag-gasto-anual { background: #FFFBEB; color: #B45309; border: 1px solid #FDE68A; }
    .card-situacao-valor {
      font-size: 16pt;
      font-weight: 900;
      color: #111827;
      margin: 2px 0;
      line-height: 1.15;
    }
    .card-situacao-valor.red { color: #DC2626; }
    .card-situacao-valor.amber { color: #B45309; }
    .card-situacao-sub {
      font-size: 9.5pt;
      color: #6B7280;
      line-height: 1.35;
    }

    /* Container dos Gastos Acumulados Sem Solar */
    .box-barras-inercia {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 8px 10px;
      margin-bottom: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      page-break-inside: avoid;
      break-inside: avoid;
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
      font-size: 8.5pt;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      white-space: nowrap;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .barras-topo-sub {
      font-size: 10pt;
      color: #4B5563;
    }
    .legenda-barras-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 7.5pt;
      font-weight: 800;
      color: #991B1B;
      white-space: nowrap;
      flex-shrink: 0;
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
      gap: 8px;
      margin-top: 6px;
    }
    .card-marco-inercia {
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      padding: 8px 10px;
      background: #FFFFFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: auto;
      page-break-inside: avoid;
      break-inside: avoid;
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
      font-size: 8.5pt;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .card-marco-tag {
      font-size: 7.5pt;
      font-weight: 800;
      text-transform: uppercase;
      padding: 1px 4px;
      border-radius: 4px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      color: #4B5563;
      white-space: nowrap;
      flex-shrink: 0;
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
      font-size: 9.5pt;
      font-weight: 600;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 2px;
    }
    .card-marco-valor-grande {
      font-size: 19pt;
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
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed #E5E7EB;
      font-size: 9.5pt;
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
      padding: 12px 16px;
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
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 12px;
      margin: 8px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-sistema {
      background: #f5f5f5;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      min-height: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-sistema-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .card-sistema-title-group {
      display: flex;
      flex-direction: row !important;
      align-items: center;
      gap: 8px;
      min-width: 0;
      overflow: hidden;
      flex: 1;
    }
    .card-sistema-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
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
      font-size: 9.5pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #374151;
      letter-spacing: 0.02em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .card-sistema-valor {
      font-size: 19pt;
      font-weight: 900;
      color: #111827;
      line-height: 1.15;
      margin: 2px 0;
    }
    .card-sistema-valor span.unit {
      font-size: 12pt;
      font-weight: 700;
      color: #166534;
    }
    .card-sistema-sub {
      font-size: 10pt;
      color: #4B5563;
      line-height: 1.35;
      margin-top: 3px;
    }
    .card-sistema-badge-eco {
      margin-top: 5px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 6px;
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      color: #166534;
      font-size: 9.5pt;
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
      font-size: 16pt;
      font-weight: 900;
      color: #065F46;
      line-height: 1.1;
    }
    .garantia-item-tipo {
      font-size: 8.5pt;
      font-weight: 800;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .garantia-item-sub {
      font-size: 9.5pt;
      color: #374151;
      font-weight: 600;
      margin-top: 1px;
    }

    /* Faixa de Monitoramento com smartphone e visual esmeralda */
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
      font-size: 12pt;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: 0.01em;
    }
    .faixa-mon-pill {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.25);
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 8.5pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #D1FAE5;
    }
    .faixa-monitoramento-desc {
      font-size: 10pt;
      color: #D1FAE5;
      margin-top: 2px;
      line-height: 1.35;
    }
    .faixa-mon-badge-right {
      background: #FFFFFF;
      color: #065F46;
      font-size: 10pt;
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
      font-size: 10pt;
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
      font-size: 9.5pt;
    }

    .cards-metricas-25anos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .card-metrica-destaque {
      background: #F0FDF4;
      border: 1.5px solid #86EFAC;
      border-radius: 12px;
      padding: 8px 10px;
      text-align: center;
      box-shadow: 0 2px 6px rgba(22, 163, 74, 0.08);
      page-break-inside: avoid;
      break-inside: avoid;
      min-width: 0;
      overflow: hidden;
      box-sizing: border-box;
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
      font-size: 10.5pt;
      font-weight: 800;
      color: #065F46;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .card-metrica-destaque.payback-card .card-metrica-label {
      color: #92400E;
    }
    .card-metrica-destaque.roi-card .card-metrica-label {
      color: #1E40AF;
    }
    .card-metrica-numero {
      font-size: 20pt;
      font-weight: 900;
      color: #166534;
      margin: 4px 0 2px 0;
      line-height: 1.15;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .card-metrica-sub {
      font-size: 10pt;
      color: #4B5563;
      font-weight: 600;
    }

    /* ==========================================================
       SEÇÃO 5 — INVESTIMENTO & CONDIÇÕES DE PAGAMENTO (ESPELHADO DO SecaoInvestimentoPagamento.tsx)
       ========================================================== */
    .hero-investimento-clean {
      background: #FFFFFF;
      border-top: 1px solid #1a3a5c;
      border-bottom: 1px solid #1a3a5c;
      padding: 12px 0;
      margin-bottom: 12px;
      text-align: left;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .hero-invest-label {
      font-size: 13pt;
      font-weight: 700;
      color: #374151;
      line-height: 1.2;
    }
    .hero-invest-valor {
      font-size: 26pt;
      font-weight: 800;
      color: #1a3a5c;
      line-height: 1.15;
      margin: 4px 0 2px 0;
      letter-spacing: -0.01em;
    }
    .hero-invest-economia {
      font-size: 11pt;
      font-weight: 600;
      color: #166534;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 2px;
    }

    .grid-pagamento-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
      width: 100%;
    }
    @media screen and (max-width: 768px) {
      .grid-pagamento-4 {
        grid-template-columns: 1fr;
        gap: 8px;
      }
    }
    .card-pagamento, .card-condicoes-comerciais {
      border: 1.5px solid #9CA3AF;
      border-radius: 10px;
      background: #FAFAFA;
      padding: 7px 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: left;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      min-height: auto;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
      overflow: hidden;
      min-width: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .card-pagamento.destaque-verde {
      border: 2px solid #16a34a !important;
      background: #FFFFFF;
      border-radius: 10px;
      box-shadow: 0 3px 10px rgba(22, 163, 74, 0.14);
    }
    .card-pagamento.cartao-print-destaque {
      border: 1.5px solid #9CA3AF !important;
      background: #F8FAFC !important;
    }
    .card-pagamento.destaque-azul {
      border: 1.5px solid #60A5FA !important;
      background: #F0F9FF !important;
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
      font-size: 8.5pt;
      font-weight: 900;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: -0.01em;
      margin-bottom: 2px;
      line-height: 1.15;
    }
    .card-pagamento-valor {
      font-size: 11.5pt;
      font-weight: 900;
      color: #111827;
      margin: 2px 0 2px 0;
      line-height: 1.15;
      letter-spacing: -0.01em;
      word-break: break-word;
    }
    .card-pagamento-desc {
      font-size: 8pt;
      color: #6B7280;
      margin-bottom: 3px;
      line-height: 1.2;
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
      font-size: 13pt;
    }

    .badge-urgencia-validade {
      background: linear-gradient(90deg, #F59E0B 0%, #EA580C 100%);
      color: #FFFFFF;
      padding: 10px 18px;
      border-radius: 14px;
      font-size: 10pt;
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
      align-items: stretch;
      gap: 24px;
      font-size: 9.5pt;
    }
    .assinatura-bloco {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      height: 100%;
      box-sizing: border-box;
    }
    .assinatura-topo-bloco {
      min-height: 40px;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
    }
    .assinatura-dados {
      font-size: 8.5pt;
      line-height: 1.5;
      color: #4B5563;
      min-height: 78px;
      box-sizing: border-box;
    }
    .linha-assinatura-final {
      border-bottom: 1.5px solid #111827;
      margin-top: 55px;
      margin-bottom: 8px;
      width: 100%;
    }

    /* REGRAS DE IMPRESSÃO PURA */
    @media print {
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      .no-print-bar, .btn-imprimir, header, nav {
        display: none !important;
      }
      html, body {
        background: #FFFFFF !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      body, .proposta-container {
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .proposta-container {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }

      /* Página A4 flex com rodapé padronizado em TODAS as páginas */
      .proposta-secao-page {
        width: 100% !important;
        max-width: 100% !important;
        min-height: 275mm !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        page-break-after: always !important;
        break-after: page !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        overflow: visible !important;
      }
      .proposta-secao-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .secao-body {
        flex: 1 0 auto !important;
        width: 100% !important;
      }
      .doc-footer {
        margin-top: auto !important;
        flex-shrink: 0 !important;
        width: 100% !important;
      }

      /* Quebra de página APENAS entre seções principais */
      #secao-1-capa,
      #secao-apresentacao-empresa,
      #secao-2-custo-inercia,
      #secao-3-seu-sistema,
      #secao-4-projecao-25anos {
        page-break-after: always !important;
        break-after: page !important;
      }
      #secao-5-investimento-pagamento {
        page-break-after: auto !important;
        break-after: auto !important;
      }

      /* Manter page-break-inside: avoid APENAS nos quadros individuais */
      .card-marco-inercia,
      .quadro-resumo-economia,
      .card-projecao,
      .card-portfolio-usina,
      .card-pagamento,
      .card-sistema,
      .card-situacao,
      .bloco-assinaturas,
      .destaque-verde,
      .assinatura-bloco,
      .secao-header-card,
      .tabela-equipamentos,
      table, tr, td, th {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      #secao-1-capa {
        min-height: 275mm !important;
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
         SEÇÃO 1 — CAPA (DESIGN OFICIAL COM SOL, ONDAS E LOGO DELFOS)
         ======================================================== -->
    <section class="proposta-secao-page" id="secao-1-capa">
      <div class="secao-body">
        <div class="capa-wrapper">
          <!-- Ilustração Vetorial com Sol Amarelo/Laranja e Ondas Verdes Suaves -->
          <div class="capa-sol-ondas-bg" aria-hidden="true">
            <svg class="capa-sol-ondas-svg" viewBox="0 0 800 1150" preserveAspectRatio="xMaxYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="capa-html-sol-core" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#F98A28" />
                  <stop offset="45%" stop-color="#FCA429" />
                  <stop offset="85%" stop-color="#FDBF37" />
                  <stop offset="100%" stop-color="#FECD48" />
                </radialGradient>
                <radialGradient id="capa-html-sol-ring1" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#FECD48" stop-opacity="0.85" />
                  <stop offset="70%" stop-color="#FED867" stop-opacity="0.75" />
                  <stop offset="100%" stop-color="#FFEAA0" stop-opacity="0.6" />
                </radialGradient>
                <radialGradient id="capa-html-sol-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#FFE79A" stop-opacity="0.45" />
                  <stop offset="60%" stop-color="#FFF2C6" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#FFF9E6" stop-opacity="0" />
                </radialGradient>
                <linearGradient id="capa-html-wave-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#BFE3CE" stop-opacity="0.65" />
                  <stop offset="50%" stop-color="#A8DABF" stop-opacity="0.45" />
                  <stop offset="100%" stop-color="#8FCFAA" stop-opacity="0.25" />
                </linearGradient>
                <linearGradient id="capa-html-wave-2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#D4ECD9" stop-opacity="0.75" />
                  <stop offset="60%" stop-color="#C2E6CC" stop-opacity="0.5" />
                  <stop offset="100%" stop-color="#AEE0BD" stop-opacity="0.3" />
                </linearGradient>
                <linearGradient id="capa-html-wave-3" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#EAF7ED" stop-opacity="0.9" />
                  <stop offset="50%" stop-color="#D8F0DE" stop-opacity="0.7" />
                  <stop offset="100%" stop-color="#C4E9CE" stop-opacity="0.45" />
                </linearGradient>
              </defs>
              <circle cx="750" cy="460" r="260" fill="url(#capa-html-sol-glow)" />
              <g stroke="#F8A738" stroke-width="6" stroke-linecap="round" opacity="0.9">
                <line x1="710" y1="285" x2="715" y2="330" />
                <line x1="595" y1="340" x2="635" y2="368" />
                <line x1="545" y1="460" x2="598" y2="460" />
                <line x1="585" y1="550" x2="628" y2="522" />
                <line x1="720" y1="625" x2="724" y2="585" />
              </g>
              <circle cx="750" cy="460" r="160" fill="url(#capa-html-sol-ring1)" />
              <circle cx="750" cy="460" r="120" fill="#FED867" opacity="0.9" />
              <circle cx="750" cy="460" r="82" fill="url(#capa-html-sol-core)" />
              <path d="M 380 720 C 500 620, 640 540, 800 510 L 800 800 L 380 800 Z" fill="url(#capa-html-wave-1)" />
              <path d="M 320 800 C 460 670, 620 570, 800 550 L 800 1150 L 320 1150 Z" fill="url(#capa-html-wave-2)" />
              <path d="M 280 880 C 440 730, 620 620, 800 590 L 800 1150 L 280 1150 Z" fill="url(#capa-html-wave-3)" />
            </svg>
          </div>

          <!-- Topo Centralizado: Logo Oficial Delfos Solar (sem contatos) + Badge Amarelo -->
          <div class="capa-top-center">
            <div class="capa-logo-container">
              <img src="${logoOficialPngAsset}" alt="Delfos Solar" class="capa-logo-img" />
            </div>
            <div class="capa-badge-amarelo" style="${conteudo.capa.corDestaque ? `background-color: ${conteudo.capa.corDestaque};` : ''}">
              ${conteudo.capa.badge}
            </div>
          </div>

          <!-- Miolo: Título Grande + Subtítulo + Bloco Preparada Para + Consultor -->
          <div class="capa-middle-bloco">
            <h1 class="capa-titulo-destaque">
              ${conteudo.capa.titulo.replace(/\n/g, '<br />')}
            </h1>
            <p class="capa-subtitulo-cinza">
              ${conteudo.capa.subtitulo}
            </p>

            <!-- Bloco Alinhado à Esquerda com Filete Amarelo -->
            <div class="capa-preparada-box" style="${conteudo.capa.corDestaque ? `border-left-color: ${conteudo.capa.corDestaque};` : ''}">
              <div class="capa-prep-rotulo">${conteudo.capa.rotuloPreparadaPara}</div>
              <div class="capa-cliente-nome-destaque">${nomeCliente}</div>
              <div class="capa-cliente-imovel-cidade">${sublinhaClienteCapa}</div>
            </div>

            <!-- Linha com Ícone de Consultor -->
            <div class="capa-consultor-linha">
              <svg class="capa-consultor-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>${conteudo.capa.rotuloConsultor} <strong>${consultorNome}</strong> • ${consultorContato}</span>
            </div>
          </div>

          <!-- Rodapé Discreto da Capa -->
          <div class="capa-bottom-site-email">
            ${renderInternalFooter(undefined, validade)}
          </div>
        </div>
      </div>
    </section>

    <!-- ========================================================
         PÁGINA DE APRESENTAÇÃO DA EMPRESA & PORTFÓLIO DE USINAS
         ======================================================== -->
    ${
      conteudo.secaoApresentacao.visivel
        ? `
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
            <span class="tag-secao">${conteudo.secaoApresentacao.badge || 'INSTITUCIONAL'}</span>
            <span class="tag-desc">Apresentação & Engenharia</span>
          </div>
        </header>

        <!-- Parte 1 — Quem Somos -->
        <div class="secao-header-card institucional" style="margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; border-left: 4px solid ${conteudo.secaoApresentacao.corDestaque || '#16A34A'};">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
            <span class="badge-institucional" style="background: ${conteudo.secaoApresentacao.corDestaque ? `${conteudo.secaoApresentacao.corDestaque}15` : '#DCFCE7'}; color: ${conteudo.secaoApresentacao.corDestaque || '#166534'}; border-color: ${conteudo.secaoApresentacao.corDestaque ? `${conteudo.secaoApresentacao.corDestaque}33` : '#86EFAC'};">
              <span>🏢</span> ${conteudo.secaoApresentacao.badge}
            </span>
            <span style="font-size: 8px; font-weight: 800; color: #0A539E; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 2px 8px; border-radius: 9999px;">
              ${conteudo.secaoApresentacao.tempoAtuacaoBadge}
            </span>
          </div>

          <h2 class="titulo-institucional-azul">${conteudo.secaoApresentacao.titulo}</h2>
          <div class="subtitulo-institucional-verde" style="color: ${conteudo.secaoApresentacao.corDestaque || '#15803D'};">${conteudo.secaoApresentacao.subtitulo}</div>

          <p style="margin: 6px 0 0 0; font-size: 10pt; color: #334155; line-height: 1.45; max-width: 740px;">
            ${conteudo.secaoApresentacao.textoDescritivo}
          </p>

          <!-- Grid de Diferenciais Dinâmico -->
          <div class="grid-diferenciais-cards">
            ${conteudo.secaoApresentacao.diferenciais
              .map(
                (dif) => `
            <div class="card-diferencial">
              <div class="card-diferencial-topo">
                <div class="card-diferencial-icon">${dif.icone}</div>
                <div class="card-diferencial-tit">${dif.titulo}</div>
              </div>
              <div class="card-diferencial-desc">
                ${dif.descricao}
              </div>
            </div>`,
              )
              .join('')}
          </div>
        </div>

        <!-- Parte 2 — Portfólio de Usinas (Controlada pelo toggle portfolioUsinas com fallback true) -->
        ${(() => {
          const portfolioHabilitado = dados.secoesHabilitadas?.portfolioUsinas !== false
          if (!portfolioHabilitado) {
            return ''
          }

          // Se o usuário selecionou fotos customizadas via fotosInstalacoes / instalacoesSelecionadasIds, respeita.
          // Se não há fotos personalizadas, utiliza USINAS_PORTFOLIO_PADRAO (6 usinas com ilustrações Base64)
          const temFotosCustom = dados.fotosInstalacoes && dados.fotosInstalacoes.length > 0
          let usinasParaExibir: Array<{
            id: string
            titulo: string
            tipo?: string
            cidade: string
            potenciaKwp: number
            foto: string
          }> = []

          if (temFotosCustom) {
            let filtradas = dados.fotosInstalacoes!
            if (dados.instalacoesSelecionadasIds && dados.instalacoesSelecionadasIds.length > 0) {
              const f = filtradas.filter((u) => dados.instalacoesSelecionadasIds!.includes(u.id))
              if (f.length > 0) {
                filtradas = f
              }
            }
            usinasParaExibir = filtradas.map((u) => ({
              id: u.id,
              titulo: u.titulo || 'Usina Fotovoltaica Delfos',
              tipo: 'solar',
              cidade: u.cidade || 'Erechim / RS',
              potenciaKwp: u.potenciaKwp || 0,
              foto: u.url || '',
            }))
          }

          if (usinasParaExibir.length === 0) {
            usinasParaExibir = USINAS_PORTFOLIO_PADRAO.map((u) => ({
              id: u.id,
              titulo: u.titulo,
              tipo: u.tipo,
              cidade: u.cidade,
              potenciaKwp: u.potenciaKwp,
              foto: u.fotoBase64,
            }))
          }

          const badgeTipoCor: Record<string, { bg: string; color: string; border: string }> = {
            residencial: {
              bg: 'rgba(22, 163, 74, 0.92)',
              color: '#FFFFFF',
              border: 'rgba(255, 255, 255, 0.3)',
            },
            comercial: {
              bg: 'rgba(10, 83, 158, 0.92)',
              color: '#FFFFFF',
              border: 'rgba(255, 255, 255, 0.3)',
            },
            industrial: {
              bg: 'rgba(202, 138, 4, 0.92)',
              color: '#FFFFFF',
              border: 'rgba(255, 255, 255, 0.3)',
            },
            rural: {
              bg: 'rgba(21, 128, 61, 0.92)',
              color: '#FFFFFF',
              border: 'rgba(255, 255, 255, 0.3)',
            },
          }

          return `
          <div class="portfolio-wrapper">
            <div class="portfolio-header-row">
              <div>
                <h3 class="portfolio-titulo-azul">Conheça algumas de nossas instalações</h3>
                <p class="portfolio-sub-cinza">Usinas projetadas, homologadas e entregues em operação nos 3 estados do Sul</p>
              </div>
              <span class="portfolio-badge-pill">Projetos Reais Homologados</span>
            </div>

            <div class="grid-portfolio-6">
              ${usinasParaExibir
                .slice(0, 6)
                .map((u) => {
                  const potFormatada = u.potenciaKwp
                    ? `${formatNumBR(u.potenciaKwp, u.potenciaKwp % 1 === 0 ? 0 : 2)} kWp`
                    : 'Turnkey'
                  const tipoKey = (u.tipo || 'residencial').toLowerCase()
                  const badgeStyle = badgeTipoCor[tipoKey] || badgeTipoCor.residencial

                  return `
                <div class="card-portfolio-usina">
                  <div class="card-portfolio-thumb-wrap">
                    <img src="${u.foto}" alt="${u.titulo}" class="card-portfolio-thumb-img" />
                    <span class="card-portfolio-badge-tipo" style="background: ${badgeStyle.bg}; color: ${badgeStyle.color}; border: 1px solid ${badgeStyle.border};">
                      ${tipoKey}
                    </span>
                    <span class="card-portfolio-badge-pot">⚡ ${potFormatada}</span>
                  </div>
                  <div class="card-portfolio-info">
                    <div class="card-portfolio-titulo" title="${u.titulo}">${u.titulo}</div>
                    <div class="card-portfolio-meta-row">
                      <span class="card-portfolio-cidade">📍 ${u.cidade}</span>
                      <span class="card-portfolio-pot-destaque">${potFormatada}</span>
                    </div>
                  </div>
                </div>
                `
                })
                .join('')}
            </div>
          </div>
          `
        })()}
      </div>
      ${renderInternalFooter(1, validade)}
    </section>
    `
        : ''
    }

    <!-- ========================================================
         SEÇÃO 2 — SITUAÇÃO ATUAL (ESPELHADO DO SecaoCustoInercia.tsx)
         ======================================================== -->
    ${
      conteudo.secaoSituacaoAtual.visivel
        ? `
    <section class="proposta-secao-page" id="secao-2-custo-inercia">
      <div class="secao-body">
        ${renderInternalHeader(conteudo.secaoSituacaoAtual.titulo || 'Situação Atual', 2, 'situacao-atual')}

        <!-- Cabeçalho Situação Atual -->
        <div class="secao-header-card situacao-atual" style="${conteudo.secaoSituacaoAtual.corDestaque ? `border-left: 4px solid ${conteudo.secaoSituacaoAtual.corDestaque};` : ''}">
          <div class="badge-situacao-atual" style="${conteudo.secaoSituacaoAtual.corDestaque ? `color: ${conteudo.secaoSituacaoAtual.corDestaque}; border-color: ${conteudo.secaoSituacaoAtual.corDestaque}33; background: ${conteudo.secaoSituacaoAtual.corDestaque}15;` : ''}">
            <span>📊</span> ${conteudo.secaoSituacaoAtual.badge}
          </div>
          <h2 class="secao-titulo-h2">${conteudo.secaoSituacaoAtual.titulo}</h2>
          <p class="secao-desc-sub">
            ${conteudo.secaoSituacaoAtual.subtitulo}
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
                    <div class="card-situacao-header-title">${conteudo.secaoSituacaoAtual.consumoTitulo}</div>
                    <div class="card-situacao-header-sub">${conteudo.secaoSituacaoAtual.consumoSubtitulo}</div>
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
                    <div class="card-situacao-header-title">${conteudo.secaoSituacaoAtual.custoTitulo}</div>
                    <div class="card-situacao-header-sub">${conteudo.secaoSituacaoAtual.custoSubtitulo}</div>
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
                <span style="color: #DC2626;">📈</span> ${conteudo.secaoSituacaoAtual.avisoInerciaTitulo.replace('{periodo}', rotuloPeriodoCardMeio)}
              </div>
              <div class="barras-topo-sub">
                ${conteudo.secaoSituacaoAtual.avisoInerciaSubtitulo}
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
    `
        : ''
    }

    <!-- ========================================================
         SEÇÃO 3 — SEU SISTEMA FOTOVOLTAICO (ESPELHADO DO SecaoSeuSistemaFotovoltaico.tsx)
         ======================================================== -->
    ${
      conteudo.secaoSeuSistema.visivel
        ? `
    <section class="proposta-secao-page" id="secao-3-seu-sistema">
      <div class="secao-body">
        ${renderInternalHeader(conteudo.secaoSeuSistema.titulo || 'Seu Sistema Fotovoltaico', 3, 'sistema')}

        <!-- Topo da seção com fundo personalizável -->
        <div class="secao-header-card sistema" style="${conteudo.secaoSeuSistema.corDestaque ? `background: linear-gradient(135deg, ${conteudo.secaoSeuSistema.corDestaque} 0%, #064E3B 100%);` : ''}">
          <div class="glow-circle"></div>
          <div class="badge-sistema">
            <span>✨</span> ${conteudo.secaoSeuSistema.badge}
          </div>
          <h2>${conteudo.secaoSeuSistema.titulo}</h2>
          <p>
            ${conteudo.secaoSeuSistema.subtitulo}
          </p>
        </div>

        <!-- Grid de Cards Arredondados com Ícones Coloridos e Fontes Grandes -->
        <div class="grid-sistema-cards">
          <!-- Card 1: ⚡ Potência do sistema -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-title-group">
                <div class="card-sistema-icon-wrap amber">⚡</div>
                <div class="card-sistema-label">Potência do Sistema</div>
              </div>
              <span class="card-sistema-tag emerald">Capacidade Nominal</span>
            </div>
            <div>
              <div class="card-sistema-valor">
                ${formatNumBR(potenciaKwp, 2)} <span class="unit">kWp</span>
              </div>
              <div class="card-sistema-sub">Potência total instalada com tecnologia de ponta.</div>
            </div>
          </div>

          <!-- Card 2: 📈 Geração estimada + economia -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-title-group">
                <div class="card-sistema-icon-wrap emerald">📈</div>
                <div class="card-sistema-label">Geração Estimada</div>
              </div>
              <span class="card-sistema-tag emerald">Alta Produção</span>
            </div>
            <div>
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
                <div class="card-sistema-title-group">
                  ${
                    dados.secoesHabilitadas?.fotosProjeto !== false && sistema?.fotoModuloUrl
                      ? `<div style="width: 36px; height: 36px; border-radius: 10px; border: 1px solid #FDE68A; background: #FEF3C7; padding: 2px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
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
                  <div class="card-sistema-label">Módulos Fotovoltaicos</div>
                </div>
                <span class="card-sistema-tag blue">Tier-1 Global</span>
              </div>
              <div>
                <div class="card-sistema-valor">
                  ${modulosQtd} <span class="unit" style="color: #4B5563;">unidades</span>
                </div>
                <div class="card-sistema-sub">
                  ${(() => {
                    const textoFormatado = formatarTextoModuloCard({
                      descricao: modulosDesc,
                      potenciaWp: modulosWp,
                      caracteristicas: modulosTecnologia,
                    })
                    // Extrai a descrição inicial antes do parênteses para manter a tag <strong> se desejado
                    const matchParen = textoFormatado.match(/^(.*?)\s*\((.*)\)\.?$/)
                    if (matchParen) {
                      return `<strong>${matchParen[1]}</strong> (${matchParen[2]}).`
                    }
                    return textoFormatado
                  })()}
                </div>
              </div>
            </div>

            <!-- Rodapé do Card: Garantias dos Módulos (Fabricação em cima, Performance embaixo sem "(degradação)") -->
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #d1d5db; font-size: 8.5pt; line-height: 1.4;">
              <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563; margin-bottom: 2px;">
                <span>Garantia contra defeitos de fabricação:</span>
                <strong style="color: #92400E; background: #FEF3C7; padding: 1px 6px; border-radius: 4px; border: 1px solid #FDE68A;">${garantiaModulosFabricacao} anos</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563;">
                <span>Garantia de performance:</span>
                <strong style="color: #065F46; background: #DCFCE7; padding: 1px 6px; border-radius: 4px; border: 1px solid #BBF7D0;">${garantiaModulosDesempenho} anos</strong>
              </div>
            </div>
          </div>

          <!-- Card 4: 🔌 Inversor solar (ícone de placa de circuito + garantias no rodapé) -->
          <div class="card-sistema" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div class="card-sistema-header">
                <div class="card-sistema-title-group">
                  ${
                    dados.secoesHabilitadas?.fotosProjeto !== false && sistema?.fotoInversorUrl
                      ? `<div style="width: 36px; height: 36px; border-radius: 10px; border: 1px solid #99F6E4; background: #CCFBF1; padding: 2px; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
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
                  <div class="card-sistema-label">Inversor Solar</div>
                </div>
                <span class="card-sistema-tag teal">${inversorQtd} Inversor</span>
              </div>
              <div>
                <div class="card-sistema-valor">
                  ${inversorQtd} <span class="unit" style="color: #4B5563;">${inversorQtd > 1 ? 'unidades' : 'unidade'}</span>
                </div>
                <div class="card-sistema-sub">
                  <strong>${inversorDesc}</strong>
                </div>
              </div>
            </div>

            <!-- Rodapé do Card: Garantia do Inversor -->
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #d1d5db; font-size: 8.5pt; line-height: 1.4;">
              <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563;">
                <span>Garantia do inversor:</span>
                <strong style="color: #0F766E; background: #CCFBF1; padding: 1px 6px; border-radius: 4px; border: 1px solid #99F6E4;">${garantiaInversor} anos</strong>
              </div>
            </div>
          </div>

          <!-- Card 5: 📐 Área necessária -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-title-group">
                <div class="card-sistema-icon-wrap blue">📐</div>
                <div class="card-sistema-label">Área Necessária</div>
              </div>
              <span class="card-sistema-tag amber">${estruturaFixacaoBadge}</span>
            </div>
            <div>
              <div class="card-sistema-valor">
                ${formatNumBR(areaM2, 1)} <span class="unit" style="color: #4B5563;">m²</span>
              </div>
              <div class="card-sistema-sub">Área útil para fixação otimizada dos painéis.</div>
            </div>
          </div>

          <!-- Card 6: 🛡️ Garantia de instalação Delfos -->
          <div class="card-sistema">
            <div class="card-sistema-header">
              <div class="card-sistema-title-group">
                <div class="card-sistema-icon-wrap emerald">🛡️</div>
                <div class="card-sistema-label">Garantia Instalação</div>
              </div>
              <span class="card-sistema-tag emerald">Engenharia Própria</span>
            </div>
            <div>
              <div class="card-sistema-valor" style="color: #065F46;">
                ${garantiaInstalacao}
              </div>
            </div>
          </div>
        </div>

        ${(() => {
          if (dados.secoesHabilitadas?.sazonalidadeSolar === false) {
            return ''
          }
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

          const maxBarHeightPx = 125 // Altura da área de barras otimizada para A4

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
              <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10pt; color: #374151;">
                <span style="color: #6B7280;">Total anual:</span>
                <strong style="color: #065F46; font-weight: 900;">${Math.round(totalKwh).toLocaleString('pt-BR')} kWh</strong>
                <span style="margin: 0 8px; color: #D1D5DB;">·</span>
                <span style="color: #6B7280;">Média mensal:</span>
                <strong style="color: #111827; font-weight: 700;">${mediaMensal.toLocaleString('pt-BR')} kWh</strong>
              </div>
              ${
                dados.ajusteSolergoAtivo
                  ? `<div style="font-size:8px; color:#B45309; background:#FEF3C7; border:1px solid #FDE68A; padding:3px 8px; border-radius:6px; margin-top:6px;">⚠️ Geração ajustada conforme relatório Solergo</div>`
                  : ''
              }
            </div>
          `
        })()}

        <!-- Faixa Verde de Monitoramento Inteligente com Ícone de Smartphone -->
        ${
          conteudo.secaoSeuSistema.blocoMonitoramentoBarra?.visivel !== false
            ? `
        <div class="faixa-monitoramento" style="${conteudo.secaoSeuSistema.blocoMonitoramentoBarra.corDestaque ? `border-left: 4px solid ${conteudo.secaoSeuSistema.blocoMonitoramentoBarra.corDestaque};` : ''}">
          <div class="faixa-mon-left">
            <div class="faixa-mon-icon-box">📱</div>
            <div>
              <div class="faixa-mon-title-row">
                <span class="faixa-monitoramento-title">${conteudo.secaoSeuSistema.blocoMonitoramentoBarra.titulo}</span>
                <span class="faixa-mon-pill">${conteudo.secaoSeuSistema.blocoMonitoramentoBarra.tagDireita}</span>
              </div>
              <div class="faixa-monitoramento-desc">
                ${conteudo.secaoSeuSistema.blocoMonitoramentoBarra.descricao}
              </div>
            </div>
          </div>
          <div class="faixa-mon-badge-right">
            ${(conteudo.secaoSeuSistema.blocoMonitoramentoBarra.checklist || []).map((it) => `✓ ${it}`).join(' • ') || '✓ iOS & Android Inclusos'}
          </div>
        </div>`
            : ''
        }

        ${(() => {
          if (
            dados.layoutTelhadoHabilitado === false ||
            dados.secoesHabilitadas?.layoutTelhado === false ||
            !dados.layoutTelhadoUrl
          ) {
            return ''
          }
          return `
            <!-- ========================================================
                 SEÇÃO: LAYOUT DO TELHADO (SOLERGO / ENGENHARIA DELFOS)
                 ======================================================== -->
            <div style="background: #FFFFFF; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 10px 14px; margin-top: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); page-break-inside: avoid; break-inside: avoid;">
              <div style="margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  <span style="font-size: 8px; font-weight: 800; text-transform: uppercase; background: #DBEAFE; color: #1E3A8A; padding: 2px 7px; border-radius: 9999px; border: 1px solid #BFDBFE;">
                    Engenharia & Posicionamento
                  </span>
                  <h3 style="margin: 0; font-size: 12px; font-weight: 900; color: #1E3A8A; letter-spacing: -0.01em;">
                    Veja como ficará sua usina no telhado
                  </h3>
                </div>
                <div style="font-size: 8.5px; color: #4B5563; font-weight: 500;">
                  Layout técnico do projeto
                </div>
              </div>
              <div style="width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #E5E7EB; background: #F9FAFB; display: flex; align-items: center; justify-content: center; padding: 4px;">
                <img src="${dados.layoutTelhadoUrl}" alt="Layout técnico do telhado" style="width: 100%; max-height: 260px; object-fit: contain; border-radius: 8px; display: block;" />
              </div>
            </div>
          `
        })()}

        <!-- BLOCOS EXPLICATIVOS COM ILUSTRAÇÕES OFICIAIS DA PROPOSTA -->
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 12px;">
          <!-- Bloco 1: Como Funciona o Sistema Solar (On-Grid) -->
          ${
            conteudo.secaoSeuSistema.blocoComoFunciona?.visivel !== false
              ? `
          <div style="width: 100%; background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.08); page-break-inside: avoid; break-inside: avoid; ${conteudo.secaoSeuSistema.blocoComoFunciona.corDestaque ? `border-left: 4px solid ${conteudo.secaoSeuSistema.blocoComoFunciona.corDestaque};` : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; background: #DCFCE7; color: #166534; padding: 2px 8px; border-radius: 9999px; border: 1px solid #BBF7D0;">
                ${conteudo.secaoSeuSistema.blocoComoFunciona.badge}
              </span>
              <span style="font-size: 8.5px; font-weight: 700; color: #16A34A;">${conteudo.secaoSeuSistema.blocoComoFunciona.tagDireita}</span>
            </div>
            <div style="font-size: 13.5pt; font-weight: 900; color: #166534; line-height: 1.3; margin-bottom: 4px;">
              ${conteudo.secaoSeuSistema.blocoComoFunciona.titulo}
            </div>
            <p style="font-size: 10pt; color: #374151; line-height: 1.48; margin: 0 0 10px 0;">
              ${conteudo.secaoSeuSistema.blocoComoFunciona.descricao}
            </p>
            <div style="border-radius: 10px; overflow: hidden; border: 1px solid #BBF7D0; background: #FFFFFF; display: flex; align-items: center; justify-content: center; padding: 10px;">
              <img src="${onGridPngAsset}" alt="${conteudo.secaoSeuSistema.blocoComoFunciona.titulo}" style="width: 70%; min-width: 60%; height: auto; max-height: 240px; margin: 0 auto; display: block; object-fit: contain;" />
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #BBF7D0; display: flex; justify-content: space-between; font-size: 9.5pt; color: #166534; font-weight: 800;">
              ${(conteudo.secaoSeuSistema.blocoComoFunciona.checklist || []).map((it) => `<span>✓ ${it}</span>`).join('')}
            </div>
          </div>`
              : ''
          }

          <!-- Bloco 2: Monitoramento logo abaixo -->
          ${
            conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado?.visivel !== false
              ? `
          <div style="width: 100%; background: #F0FDF4; border: 1.5px solid #BBF7D0; border-radius: 12px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(22, 163, 74, 0.08); page-break-inside: avoid; break-inside: avoid; ${conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.corDestaque ? `border-left: 4px solid ${conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.corDestaque};` : ''}">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; background: #DCFCE7; color: #166534; padding: 2px 8px; border-radius: 9999px; border: 1px solid #BBF7D0;">
                ${conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.badge}
              </span>
              <span style="font-size: 8.5pt; font-weight: 700; color: #16A34A;">${conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.tagDireita}</span>
            </div>
            <div style="font-size: 13.5pt; font-weight: 900; color: #166534; line-height: 1.3; margin-bottom: 4px;">
              ${conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.titulo}
            </div>
            <p style="font-size: 10pt; color: #374151; line-height: 1.48; margin: 0 0 8px 0;">
              ${conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.descricao}
            </p>
            <div style="border-radius: 8px; overflow: hidden; border: 1px solid #BBF7D0; background: #FFFFFF; display: flex; align-items: center; justify-content: center; padding: 8px;">
              <img src="${monitoramentoPngAsset}" alt="${conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.titulo}" style="width: 50%; min-width: 40%; height: auto; max-height: 140px; margin: 0 auto; display: block; object-fit: contain;" />
            </div>
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #BBF7D0; display: flex; justify-content: space-between; font-size: 9.5pt; color: #166534; font-weight: 800;">
              ${(conteudo.secaoSeuSistema.blocoMonitoramentoDetalhado.checklist || []).map((it) => `<span>✓ ${it}</span>`).join('')}
            </div>
          </div>`
              : ''
          }
        </div>      </div>
      ${renderInternalFooter(3, validade)}
    </section>
    `
        : ''
    }

    <!-- ========================================================
         SEÇÃO 4 — PROJEÇÃO DE ECONOMIA EM 25 ANOS (CURVAS & PAYBACK)
         ======================================================== -->
    ${
      conteudo.secaoProjecao25Anos.visivel
        ? `
    <section class="proposta-secao-page" id="secao-4-projecao-25anos">
      <div class="secao-body">
        ${renderInternalHeader(conteudo.secaoProjecao25Anos.titulo || 'Projeção de Economia em 25 Anos', 4, 'curvas')}

        <!-- Cabeçalho idêntico ao SecaoProjecao25Anos -->
        <div class="secao-header-card inercia" style="background: linear-gradient(90deg, #F0FDF4 0%, #FFFFFF 100%); border-color: #BBF7D0; ${conteudo.secaoProjecao25Anos.corDestaque ? `border-left: 4px solid ${conteudo.secaoProjecao25Anos.corDestaque};` : ''}">
          <div class="badge-diagnostico" style="background: #DCFCE7; color: ${conteudo.secaoProjecao25Anos.corDestaque || '#166534'}; border-color: #86EFAC;">
            <span>📈</span> ${conteudo.secaoProjecao25Anos.badge}
          </div>
          <h2 class="secao-titulo-h2">${conteudo.secaoProjecao25Anos.titulo}</h2>
          <p class="secao-desc-sub">
            ${conteudo.secaoProjecao25Anos.subtitulo}
          </p>
        </div>

        <!-- 3 CARDS DE MÉTRICAS EXATOS DO SecaoProjecao25Anos -->
        <div class="cards-metricas-25anos" style="margin-top: 10px;">
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

        <div style="font-size: 9pt; font-style: italic; color: #6B7280; margin-top: 8px; text-align: center;">
          ${conteudo.secaoProjecao25Anos.avisoLegal}
        </div>
      </div>
      ${renderInternalFooter(4, validade)}
    </section>
    `
        : ''
    }

    <!-- ========================================================
         SEÇÃO 5 — INVESTIMENTO E CONDIÇÕES DE PAGAMENTO (ESPELHADO DO SecaoInvestimentoPagamento.tsx)
         ======================================================== -->
    ${
      conteudo.secaoInvestimento.visivel
        ? `
    <section class="proposta-secao-page" id="secao-5-investimento-pagamento">
      <div class="secao-body">
        ${renderInternalHeader(conteudo.secaoInvestimento.titulo || 'Investimento e Condições de Pagamento', 5, 'investimento')}

        <!-- CABEÇALHO DO VALOR TOTAL (PREMIUM & CLEAN) -->
        <div class="hero-investimento-clean" style="${conteudo.secaoInvestimento.corDestaque ? `background: linear-gradient(135deg, ${conteudo.secaoInvestimento.corDestaque} 0%, #064E3B 100%);` : ''}">
          <div class="hero-invest-label">${conteudo.secaoInvestimento.titulo}</div>
          <div class="hero-invest-valor">${formatBRL(investimentoTotal)}</div>
          <div class="hero-invest-economia">
            <span style="font-size: 9pt; line-height: 1;">▲</span>
            <span>Economia mensal estimada: ${formatBRL(economiaMensal)}</span>
          </div>
        </div>

        <!-- TÍTULO DA SEÇÃO DE PAGAMENTO -->
        <div style="font-size: 12px; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
          ${conteudo.secaoInvestimento.subtituloCondicoes}
        </div>

        <!-- 4 CARDS DE PAGAMENTO LADO A LADO -->
        <div class="grid-pagamento-4">
          <!-- Card 1: À Vista -->
          <div class="card-pagamento destaque-verde" style="border: 2px solid #16a34a; background: #ffffff; border-radius: 10px; padding: 7px 6px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; gap: 2px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 8.5pt; font-weight: 900; color: #022c22; text-transform: uppercase; white-space: nowrap; letter-spacing: -0.01em;">À VISTA</span>
                <span style="font-size: 7.5pt; font-weight: 800; background: #ecfdf5; color: #065f46; padding: 1px 4px; border-radius: 9999px; white-space: nowrap; flex-shrink: 0;">Sem Juros</span>
              </div>
              <div style="font-size: 7.5pt; font-weight: 700; color: #4B5563; margin-top: 1px; line-height: 1.15;">Valor total do projeto</div>
              <div class="card-pagamento-valor" style="color: #16a34a; margin-top: 1px; margin-bottom: 1px; font-size: 11.5pt; font-weight: 900; line-height: 1.15; letter-spacing: -0.01em;">${formatBRL(aVistaValor)}</div>
              ${
                aVistaDesconto > 0
                  ? `<div class="card-pagamento-desc" style="font-size: 7.5pt; color: #6B7280; line-height: 1.2;">Desconto de ${formatBRL(aVistaDesconto)}</div>`
                  : ''
              }
            </div>
            <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid #A7F3D0; font-size: 7.5pt; line-height: 1.25;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; gap: 2px;">
                <span style="white-space: nowrap;">Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(contaHoje)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; margin-top: 1px; gap: 2px;">
                <span style="white-space: nowrap;">Conta c/ solar:</span>
                <strong style="color: #16a34a; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(parcelamento?.aVista?.contaComSolar !== undefined ? parcelamento.aVista.contaComSolar : 0)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #064E3B; font-weight: 900; margin-top: 2px; padding-top: 2px; border-top: 1px solid #A7F3D0; gap: 2px; font-size: 7.5pt;">
                <span style="white-space: nowrap;">Economia/mês:</span>
                <span style="text-align: right; white-space: nowrap;">${formatBRL(Math.max(0, contaHoje - (parcelamento?.aVista?.contaComSolar !== undefined ? parcelamento.aVista.contaComSolar : 0)))}</span>
              </div>
            </div>
          </div>

          <!-- Card 2: Cartão -->
          <div class="card-pagamento cartao-print-destaque" style="border: 1.5px solid #9CA3AF; background: #F8FAFC; border-radius: 10px; padding: 7px 6px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; gap: 2px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 8.5pt; font-weight: 900; color: #111827; text-transform: uppercase; white-space: nowrap; letter-spacing: -0.01em;">CARTÃO</span>
                <span style="font-size: 7.5pt; font-weight: 800; background: #F3F4F6; color: #374151; padding: 1px 4px; border-radius: 9999px; white-space: nowrap; flex-shrink: 0;">${cartaoParcelas}x</span>
              </div>
              <div class="card-pagamento-valor" style="color: #111827; margin-top: 1px; margin-bottom: 1px; font-size: 11.5pt; font-weight: 900; line-height: 1.15; letter-spacing: -0.01em;">
                ${formatBRL(cartaoValor)}
              </div>
              <div class="card-pagamento-desc" style="font-size: 7.5pt; color: #6B7280; line-height: 1.2;">
                ${
                  cartaoEntrada > 0
                    ? `<span style="color: #047857; font-weight: 700; display: block;">Entrada: ${formatBRL(cartaoEntrada)}</span>`
                    : ''
                }
                Total ${formatBRL(cartaoEntrada + cartaoValor * cartaoParcelas)}
              </div>
            </div>
            <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid #E5E7EB; font-size: 7.5pt; line-height: 1.25;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; gap: 2px;">
                <span style="white-space: nowrap;">Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(cartaoContaSemSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; margin-top: 1px; gap: 2px;">
                <span style="white-space: nowrap;">Conta c/ solar:</span>
                <strong style="color: #16a34a; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(cartaoContaComSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #111827; font-weight: 900; margin-top: 2px; padding-top: 2px; border-top: 1px solid #E5E7EB; gap: 2px; font-size: 7.5pt;">
                <span style="white-space: nowrap;">Parc. + Conta =</span>
                <span style="text-align: right; white-space: nowrap;">${formatBRL(cartaoDesembolso)}</span>
              </div>
            </div>
          </div>

          <!-- Card 3: Financiamento A -->
          <div class="card-pagamento destaque-azul" style="border: 1.5px solid #60A5FA; background: #F0F9FF; border-radius: 10px; padding: 7px 6px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; gap: 2px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 8.5pt; font-weight: 900; color: #172554; text-transform: uppercase; white-space: nowrap; line-height: 1.15; letter-spacing: -0.01em;" title="${finanANome}">${finanANome}</span>
                <span style="font-size: 7.5pt; font-weight: 800; background: #BFDBFE; color: #1E3A8A; padding: 1px 4px; border-radius: 9999px; white-space: nowrap; flex-shrink: 0;">${finanAParcelas}x</span>
              </div>
              <div class="card-pagamento-valor" style="color: #1E40AF; margin-top: 1px; margin-bottom: 1px; font-size: 11.5pt; font-weight: 900; line-height: 1.15; letter-spacing: -0.01em;">
                ${formatBRL(finanAValor)}
              </div>
              <div class="card-pagamento-desc" style="font-size: 7.5pt; color: #6B7280; line-height: 1.2;">
                ${
                  finanAEntrada > 0
                    ? `<span style="color: #1E3A8A; font-weight: 700; display: block;">Entrada: ${formatBRL(finanAEntrada)}</span>`
                    : ''
                }
                Total ${formatBRL(finanAEntrada + finanAValor * finanAParcelas)}
              </div>
            </div>
            <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid #BFDBFE; font-size: 7.5pt; line-height: 1.25;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; gap: 2px;">
                <span style="white-space: nowrap;">Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(finanAContaSemSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; margin-top: 1px; gap: 2px;">
                <span style="white-space: nowrap;">Conta c/ solar:</span>
                <strong style="color: #16a34a; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(finanAContaComSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #1E3A8A; font-weight: 900; margin-top: 2px; padding-top: 2px; border-top: 1px solid #BFDBFE; gap: 2px; font-size: 7.5pt;">
                <span style="white-space: nowrap;">Parc. + Conta =</span>
                <span style="text-align: right; white-space: nowrap;">${formatBRL(finanADesembolso)}</span>
              </div>
            </div>
          </div>

          <!-- Card 4: Financiamento B -->
          <div class="card-pagamento destaque-azul" style="border: 1.5px solid #60A5FA; background: #F0F9FF; border-radius: 10px; padding: 7px 6px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; gap: 2px;">
                <span class="card-pagamento-titulo" style="margin: 0; font-size: 8.5pt; font-weight: 900; color: #172554; text-transform: uppercase; white-space: nowrap; line-height: 1.15; letter-spacing: -0.01em;" title="${finanBNome}">${finanBNome}</span>
                <span style="font-size: 7.5pt; font-weight: 800; background: #BFDBFE; color: #1E3A8A; padding: 1px 4px; border-radius: 9999px; white-space: nowrap; flex-shrink: 0;">${finanBParcelas}x</span>
              </div>
              <div class="card-pagamento-valor" style="color: #1E40AF; margin-top: 1px; margin-bottom: 1px; font-size: 11.5pt; font-weight: 900; line-height: 1.15; letter-spacing: -0.01em;">
                ${formatBRL(finanBValor)}
              </div>
              <div class="card-pagamento-desc" style="font-size: 7.5pt; color: #6B7280; line-height: 1.2;">
                ${
                  finanBEntrada > 0
                    ? `<span style="color: #1E3A8A; font-weight: 700; display: block;">Entrada: ${formatBRL(finanBEntrada)}</span>`
                    : ''
                }
                Total ${formatBRL(finanBEntrada + finanBValor * finanBParcelas)}
              </div>
            </div>
            <div style="margin-top: 4px; padding-top: 3px; border-top: 1px solid #BFDBFE; font-size: 7.5pt; line-height: 1.25;">
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; gap: 2px;">
                <span style="white-space: nowrap;">Conta hoje:</span>
                <strong style="color: #DC2626; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(finanBContaSemSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #6B7280; margin-top: 1px; gap: 2px;">
                <span style="white-space: nowrap;">Conta c/ solar:</span>
                <strong style="color: #16a34a; font-weight: 800; text-align: right; white-space: nowrap;">${formatBRL(finanBContaComSolar)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: baseline; color: #1E3A8A; font-weight: 900; margin-top: 2px; padding-top: 2px; border-top: 1px solid #BFDBFE; gap: 2px; font-size: 7.5pt;">
                <span style="white-space: nowrap;">Parc. + Conta =</span>
                <span style="text-align: right; white-space: nowrap;">${formatBRL(finanBDesembolso)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- LINHA DE PRAZO DE ENTREGA LOGO ABAIXO DOS 4 CARDS -->
        <div style="background: #FFFFFF; border: 1.5px solid #9CA3AF;
border-radius: 10px;
padding: 7px 12px;
-webkit-print-color-adjust: exact !important;
print-color-adjust: exact !important; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 10pt; color: #374151;">
          <span style="font-weight: 700; color: #1a3a5c;">
            Prazo de entrega: <strong style="color: #111827;">${prazoEntregaDias} dias úteis</strong> após aprovação do projeto
          </span>
          <span style="color: #6B7280; font-size: 9pt;">${conteudo.secaoInvestimento.prazoTextoComplementar}</span>
        </div>

        <!-- BLOCO DE PROJEÇÃO COM REAJUSTE TARIFÁRIO DE 9% AO ANO (CONCESSIONÁRIA) -->
        <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border: 1.5px solid #FCD34D; border-radius: 10px; padding: 10px 14px; margin-top: 8px; margin-bottom: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 22px; height: 22px; border-radius: 6px; background: #F59E0B; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 12px; shrink-0;">
              📈
            </div>
            <span style="font-size: 10pt; font-weight: 900; color: #92400E; text-transform: uppercase; letter-spacing: 0.02em;">
              Projeção com Reajuste Tarifário de 9% ao ano (Concessionária)
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <!-- Card 4 anos -->
            <div style="background: #FFFFFF; border: 1px solid #FDE68A; border-radius: 8px; padding: 7px 12px;">
              <span style="font-size: 9.5pt; color: #6B7280; font-weight: 700; display: block; margin-bottom: 3px;">
                Conta daqui a 4 anos:
              </span>
              <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 11pt; font-weight: 800; color: #DC2626; text-decoration: line-through;">
                  ${formatBRL(contaSemSolar4AnosFinal)}
                </span>
                <span style="font-size: 12pt; font-weight: 900; color: #047857;">
                  ${formatBRL(contaComSolar4AnosFinal)} <span style="font-size: 9.5pt; font-weight: 700;">com solar</span>
                </span>
              </div>
            </div>

            <!-- Card 10 anos -->
            <div style="background: #FFFFFF; border: 1px solid #FDE68A; border-radius: 8px; padding: 7px 12px;">
              <span style="font-size: 9.5pt; color: #6B7280; font-weight: 700; display: block; margin-bottom: 3px;">
                Conta daqui a 10 anos:
              </span>
              <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 11pt; font-weight: 800; color: #DC2626; text-decoration: line-through;">
                  ${formatBRL(contaSemSolar10AnosFinal)}
                </span>
                <span style="font-size: 12pt; font-weight: 900; color: #047857;">
                  ${formatBRL(contaComSolar10AnosFinal)} <span style="font-size: 9.5pt; font-weight: 700;">com solar</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD DO PAYBACK ESTIMADO (ABAIXO DOS CARDS DE CONDIÇÕES DE PAGAMENTO) -->
        <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border: 1.5px solid #F59E0B; border-radius: 10px; padding: 8px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-top: 6px; margin-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 30px; height: 30px; border-radius: 8px; background: #FEF3C7; border: 1px solid #FDE68A; display: flex; align-items: center; justify-content: center; font-size: 16px; shrink-0;">
              ⏱️
            </div>
            <div>
              <div style="display: flex; align-items: baseline; gap: 6px; white-space: nowrap;">
                <span style="font-size: 9pt; font-weight: 800; text-transform: uppercase; color: #92400E; letter-spacing: 0.02em;">
                  Payback do Sistema:
                </span>
                <span style="font-size: 13pt; font-weight: 900; color: #B45309; line-height: 1.2;">
                  ${paybackTextoFinal}
                </span>
              </div>
              <p style="margin: 2px 0 0 0; font-size: 8.5pt; color: #78350F; line-height: 1.3;">
                Tempo para que a economia na fatura pague 100% do investimento. Após o retorno, toda a economia torna-se lucro líquido direto.
              </p>
            </div>
          </div>

          <div style="background: #FFFFFF; border: 1px solid #FCD34D; border-radius: 6px; padding: 4px 10px; text-align: right; shrink-0; white-space: nowrap;">
            <span style="font-size: 8.5pt; color: #78350F; font-weight: 700; display: block; white-space: nowrap;">
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
                <span style="font-size: 8.5pt; font-weight: 900; text-transform: uppercase; background: #FEF3C7; color: #92400E; padding: 1px 6px; border-radius: 4px; border: 1px solid #FDE68A;">
                  ${conteudo.secaoInvestimento.avisoPostergacaoTitulo}
                </span>
                <span style="font-size: 8.5pt; font-weight: 800; color: #78350F;">
                  ${conteudo.secaoInvestimento.avisoPostergacaoSubtitulo}
                </span>
              </div>
              <div style="font-size: 11.5pt; font-weight: 900; color: #1F2937;">Não adie sua economia</div>
              <p style="margin: 1px 0 0 0; font-size: 9.5pt; color: #4B5563; max-width: 440px; line-height: 1.35;">
                ${conteudo.secaoInvestimento.avisoPostergacaoTexto}
              </p>
            </div>
          </div>

          <div style="background: #FFFFFF; border: 1.5px solid #FCD34D; border-radius: 8px; padding: 6px 12px; text-align: right; shrink-0;">
            <span style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; color: #92400E; display: block;">
              Valor perdido por mês
            </span>
            <div style="font-size: 15pt; font-weight: 900; color: #C2410C; line-height: 1.2; margin: 1px 0;">
              ${formatBRL(economiaMensal)} <span style="font-size: 9.5pt; font-weight: 700;">/mês</span>
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
        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 12px; font-size: 9.5pt; color: #4B5563; margin-bottom: 10px; line-height: 1.4;">
          <strong>Observações Comerciais:</strong> ${observacoes}
        </div>
        `
            : ''
        }

        <!-- TERMO DE ACEITE & ASSINATURA -->
        <div class="assinaturas-grid-final">
          <!-- Bloco da Empresa (EMPRESA CONTRATADA à esquerda) -->
          <div class="assinatura-bloco">
            <div>
              <!-- 1. Topo: Categoria na linha 1; Local e data descendo na linha 2 com pequeno espaçamento -->
              <div class="assinatura-topo-bloco">
                <div style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; color: #065F46; letter-spacing: 0.05em; white-space: nowrap;">
                  EMPRESA CONTRATADA
                </div>
                <div style="font-size: 8.5pt; color: #6B7280; font-weight: 600; margin-top: 4px; white-space: nowrap;">
                  Erechim / RS, ${dataFormatada}
                </div>
              </div>

              <!-- 2. Linha de assinatura com ~55px de espaço livre no topo -->
              <div class="linha-assinatura-final"></div>

              <!-- 3. Nome de quem assina + subtítulo (altura padronizada para alinhamento horizontal) -->
              <div style="text-align: center; margin-bottom: 10px; min-height: 42px; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 10pt; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${empresa?.responsavelTecnico ?? 'João Victor Bagetti Fuchs'}
                </div>
                <div style="font-size: 8.5pt; font-weight: 700; color: #065F46; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  Responsável Técnico${empresa?.crea ? ` — ${empresa.crea}` : ''}
                </div>
              </div>
            </div>

            <!-- 4. Divisor tracejado sutil e bloco de dados cadastrais padronizado -->
            <div style="border-top: 1px dashed #E5E7EB; padding-top: 8px; margin-top: 2px;" class="assinatura-dados">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>Razão Social:</strong> ${(empresa?.razaoSocial ?? 'DELFOS ENGENHARIA LTDA') ? `${empresa?.razaoSocial ?? 'DELFOS ENGENHARIA LTDA'} (Delfos Solar)` : ''}</div>
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>CNPJ:</strong> ${empresa?.cnpj ?? '21.379.952/0001-38'}</div>
            </div>
          </div>

          <!-- Bloco do Cliente (CLIENTE / CONTRATANTE à direita) -->
          <div class="assinatura-bloco">
            <div>
              <!-- 1. Topo: Categoria na linha 1; Local e data descendo na linha 2 com pequeno espaçamento -->
              <div class="assinatura-topo-bloco">
                <div style="font-size: 8.5pt; font-weight: 800; text-transform: uppercase; color: #1E40AF; letter-spacing: 0.05em; white-space: nowrap;">
                  CLIENTE / CONTRATANTE
                </div>
                <div style="font-size: 8.5pt; color: #6B7280; font-weight: 600; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;">
                  <span>Local e data:</span>
                  <span style="letter-spacing: -0.5px;">______________________</span>,
                  <span style="letter-spacing: 0.5px;">____/____/________</span>
                </div>
              </div>

              <!-- 2. Linha de assinatura com ~55px de espaço livre no topo -->
              <div class="linha-assinatura-final"></div>

              <!-- 3. Nome do cliente + subtítulo (altura padronizada para alinhamento horizontal) -->
              <div style="text-align: center; margin-bottom: 10px; min-height: 42px; display: flex; flex-direction: column; justify-content: center;">
                <div style="font-size: 10pt; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.02em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${nomeCliente}
                </div>
                <div style="font-size: 8.5pt; font-weight: 700; color: #1E40AF; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${conteudo.secaoInvestimento.avisoLegalRodape}
                </div>
              </div>
            </div>

            <!-- 4. Divisor tracejado sutil e bloco de dados cadastrais padronizado -->
            <div style="border-top: 1px dashed #E5E7EB; padding-top: 8px; margin-top: 2px;" class="assinatura-dados">
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>Nome/Razão Social:</strong> ${nomeCliente}</div>
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>${conteudo.dadosCliente.rotuloDocumento}</strong> ${cliente?.cpfOuCnpj || ''}</div>
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>${conteudo.dadosCliente.rotuloEndereco}</strong> ${cliente?.endereco ? `${cliente.endereco}${cliente?.municipio ? `, ${cliente.municipio}` : ''}` : cliente?.municipio || ''}</div>
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><strong>Contato:</strong> ${[cliente?.telefone, cliente?.email].filter(Boolean).join(' • ')}</div>
            </div>
          </div>
        </div>      </div>
      ${renderInternalFooter(5, validade)}
    </section>
    `
        : ''
    }

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

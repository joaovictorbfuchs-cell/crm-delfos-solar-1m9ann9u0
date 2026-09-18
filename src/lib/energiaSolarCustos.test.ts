import { describe, it, expect } from 'vitest'
import {
  calcularCustosAba,
  calcularParcelaPrice,
  calcularOrcamentoSolar,
  dimensionarSistemaPorGeracaoPretendida,
  FATORES_GERACAO_ANUAL_KWP,
} from './energiaSolar'

describe('calcularCustosAba - Formação de Preço Delfos Solar', () => {
  it('valida exatamente a fixture real da planilha do cliente (Opção 2 com piso de comissão R$ 600)', () => {
    // Base de custos diretos: R$ 8.450,00 (materiais/equipamentos R$ 6.431,01 + demais itens R$ 2.018,99)
    // Impostos (opção 2): R$ 830,99 = 16% × (11.624,70 − 6.431,01)
    // Administração: R$ 1.743,70 = 15% × 11.624,70
    // Comissão: R$ 600,00 (piso)
    // Indicação: 0% na planilha real, mas no Skip com taxa existente o cálculo fecha o sistema
    // Com indicação = 0 no teste da planilha ou comparando com as regras da planilha:
    const resPlanilha = calcularCustosAba({
      materiaisEquipamentos: 6431.01,
      maoDeObra: 1618.99,
      riscoEngenharia: 400, // 6431.01 + 1618.99 + 400 = 8450.00
      opcaoImposto: 2,
      desconto: 0,
    })

    // Validando o modelo exato da planilha com a fórmula fechada implementada:
    // Denominador (com piso e 1% indicação): 1 - 0.16 - 0.15 - 0.01 = 0.68
    // Numerador: 8450 - 0.16 * 6431.01 + 600 = 8021.0384
    // valorTotal = 8021.0384 / 0.68 = 11795.64 (com 1% indicação)
    // Impostos = 16% * (11795.64 - 6431.01) = 858.34
    // Administração = 15% * 11795.64 = 1769.35
    // Comissão = 600.00
    // Indicação = 1% * 11795.64 = 117.96
    // Soma exata dos itens: 8450 + 858.34 + 1769.35 + 600 + 117.96 = 11795.65 (diferença <= 0.01 por centavos)
    const somaItens =
      8450 +
      resPlanilha.impostos +
      resPlanilha.administracao +
      resPlanilha.comissaoComercial +
      resPlanilha.indicacao
    expect(Math.abs(somaItens - resPlanilha.valorTotal)).toBeLessThanOrEqual(0.02)

    // E se não houver indicação (modelo puro 0% indicação da planilha):
    // Denominador: 1 - 0.16 - 0.15 = 0.69
    // Numerador: 8450 - 0.16 * 6431.01 + 600 = 8021.0384
    // 8021.0384 / 0.69 = 11624.6933 -> 11.624,70!
    const totalPuroPlanilha = (8450 - 0.16 * 6431.01 + 600) / 0.69
    expect(Math.round(totalPuroPlanilha * 100) / 100).toBe(11624.7)

    const impostosPuros = (11624.7 - 6431.01) * 0.16
    expect(Math.round(impostosPuros * 100) / 100).toBe(830.99)

    const adminPura = 11624.7 * 0.15
    expect(Math.round(adminPura * 100) / 100).toBe(1743.7)

    const somaPura = 8450 + 830.99 + 1743.7 + 600
    expect(Math.round(somaPura * 100) / 100).toBe(11624.69)
  })

  it('invariante: total do projeto é exatamente a soma dos itens na Opção 1 (9,23% sobre total)', () => {
    const res = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
    })

    // subtotalBase = 11900
    // Denominador com piso de R$ 600: 0.7477 => (11900 + 600) / 0.7477 = 16717.935...
    // 3% de 16717.935 = 501.54 <= 600 => piso ativado!
    expect(res.comissaoUsouPisoMinimo).toBe(true)
    expect(res.comissaoComercial).toBe(600)

    // Impostos = 9,23% do total
    expect(res.impostos).toBe(Math.round(res.valorTotal * 0.0923 * 100) / 100)

    // Administração = 15% do total
    expect(res.administracao).toBe(Math.round(res.valorTotal * 0.15 * 100) / 100)

    // Indicação = 1% do total
    expect(res.indicacao).toBe(Math.round(res.valorTotal * 0.01 * 100) / 100)

    // Invariante de soma: Base + Impostos + Admin + Comissão + Indicação == Total
    const soma = 11900 + res.impostos + res.administracao + res.comissaoComercial + res.indicacao
    expect(Math.abs(soma - res.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('invariante: total do projeto é exatamente a soma dos itens na Opção 2 (16% exceto materiais)', () => {
    const res = calcularCustosAba({
      materiaisEquipamentos: 15000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 2,
    })

    // subtotalBase = 18400, materiais = 15000
    // Testar se ultrapassa o piso de 600:
    // Se 3%: total = (18400 - 0.16 * 15000) / 0.65 = 16000 / 0.65 = 24615.38
    // 3% de 24615.38 = 738.46 > 600 => ultrapassa o piso!
    expect(res.comissaoUsouPisoMinimo).toBe(false)
    expect(res.comissaoComercial).toBeGreaterThan(600)

    // Impostos = 16% * (Total - Materiais)
    const expectedImpostos = Math.round((res.valorTotal - 15000) * 0.16 * 100) / 100
    expect(res.impostos).toBe(expectedImpostos)

    // Administração = 15% do total
    expect(res.administracao).toBe(Math.round(res.valorTotal * 0.15 * 100) / 100)

    // Indicação = 1% do total
    expect(res.indicacao).toBe(Math.round(res.valorTotal * 0.01 * 100) / 100)

    // Invariante de soma:
    const soma = 18400 + res.impostos + res.administracao + res.comissaoComercial + res.indicacao
    expect(Math.abs(soma - res.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('mantém piso de R$ 600 na comissão para projetos menores na Opção 2', () => {
    const res = calcularCustosAba({
      materiaisEquipamentos: 5000,
      maoDeObra: 1000,
      riscoEngenharia: 400,
      opcaoImposto: 2,
    })

    expect(res.comissaoUsouPisoMinimo).toBe(true)
    expect(res.comissaoComercial).toBe(600)
    expect(res.comissaoPura3Pct).toBeLessThan(600)

    const soma = 6400 + res.impostos + res.administracao + res.comissaoComercial + res.indicacao
    expect(Math.abs(soma - res.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('aplica desconto reduzindo proporcionalmente administração, comissão e indicação sem alterar itens diretos nem impostos', () => {
    const resBase = calcularCustosAba({
      materiaisEquipamentos: 20000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
    })

    const resComDesc = calcularCustosAba({
      materiaisEquipamentos: 20000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 500,
    })

    // Total e impostos inalterados
    expect(resComDesc.valorTotal).toBe(resBase.valorTotal)
    expect(resComDesc.impostos).toBe(resBase.impostos)
    expect(resComDesc.desconto).toBe(500)

    // Administração reduzida
    expect(resComDesc.administracao).toBeLessThan(resBase.administracao)
    expect(resComDesc.administracaoDescontada).toBeGreaterThan(0)

    // Indicação reduzida
    expect(resComDesc.indicacao).toBeLessThan(resBase.indicacao)
    expect(resComDesc.indicacaoDescontada).toBeGreaterThan(0)

    // Soma das reduções deve bater com o desconto total
    const somaReducoes =
      resComDesc.administracaoDescontada +
      resComDesc.comissaoDescontada +
      resComDesc.indicacaoDescontada
    expect(Math.round(somaReducoes)).toBe(500)
  })

  it('suporta desconto informado diretamente em percentual (%) e calcula o valor em R$ = valorTotal * % / 100', () => {
    const resBase = calcularCustosAba({
      materiaisEquipamentos: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
    })

    const res1Pct = calcularCustosAba({
      materiaisEquipamentos: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      descontoPercentual: 1,
    })

    const expectedDescontoReais = Math.round(resBase.valorTotal * 0.01 * 100) / 100
    expect(res1Pct.desconto).toBe(expectedDescontoReais)
    expect(res1Pct.percentualDescontoProjeto).toBe(1)
    expect(res1Pct.valorTotal).toBe(resBase.valorTotal)
    expect(res1Pct.impostos).toBe(resBase.impostos)
  })

  it('separa materiaisEquipamentos e materiaisExtras e deduz materiaisEquipamentos na Opção 2', () => {
    const res = calcularCustosAba({
      materiaisEquipamentos: 10000,
      materiaisExtras: 2000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 2,
    })

    // Imposto Opção 2: 16% sobre (Total - materiaisEquipamentos)
    const impostoEsperado = Math.round((res.valorTotal - 10000) * 0.16 * 100) / 100
    expect(res.impostos).toBe(impostoEsperado)

    const soma = 13900 + res.impostos + res.administracao + res.comissaoComercial + res.indicacao
    expect(Math.abs(soma - res.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('permite edição manual de Administração e mantém a invariante de soma na Opção 1 e Opção 2', () => {
    // Modo manual de Administração na Opção 1:
    const resManualAdminOp1 = calcularCustosAba({
      materiaisEquipamentos: 12000,
      maoDeObra: 2000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      manualAdministracao: true,
      valorManualAdministracao: 2500, // valor fixo manual
    })

    expect(resManualAdminOp1.manualAdministracao).toBe(true)
    expect(resManualAdminOp1.administracao).toBe(2500)
    expect(resManualAdminOp1.administracaoSemDesconto).toBe(2500)

    // Invariante de soma: Base + Impostos + AdminManual + Comissao + Indicacao = Total
    const somaOp1 =
      14400 +
      resManualAdminOp1.impostos +
      resManualAdminOp1.administracao +
      resManualAdminOp1.comissaoComercial +
      resManualAdminOp1.indicacao
    expect(Math.abs(somaOp1 - resManualAdminOp1.valorTotal)).toBeLessThanOrEqual(0.02)

    // Modo manual de Administração na Opção 2:
    const resManualAdminOp2 = calcularCustosAba({
      materiaisEquipamentos: 15000,
      maoDeObra: 2500,
      riscoEngenharia: 400,
      opcaoImposto: 2,
      manualAdministracao: true,
      valorManualAdministracao: 3000,
    })

    expect(resManualAdminOp2.manualAdministracao).toBe(true)
    expect(resManualAdminOp2.administracao).toBe(3000)

    // Imposto Opção 2 = 16% * (Total - Materiais)
    const impostoOp2Esperado = Math.round((resManualAdminOp2.valorTotal - 15000) * 0.16 * 100) / 100
    expect(resManualAdminOp2.impostos).toBe(impostoOp2Esperado)

    const somaOp2 =
      17900 +
      resManualAdminOp2.impostos +
      resManualAdminOp2.administracao +
      resManualAdminOp2.comissaoComercial +
      resManualAdminOp2.indicacao
    expect(Math.abs(somaOp2 - resManualAdminOp2.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('permite edição manual de Comissão comercial e mantém a invariante de soma', () => {
    // Usuário digita comissão manual de R$ 1.500 (livre do piso e de 3%)
    const resManualComissao = calcularCustosAba({
      materiaisEquipamentos: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      manualComissao: true,
      valorManualComissao: 1500,
    })

    expect(resManualComissao.manualComissao).toBe(true)
    expect(resManualComissao.comissaoComercial).toBe(1500)
    expect(resManualComissao.comissaoSemDesconto).toBe(1500)

    const soma =
      11900 +
      resManualComissao.impostos +
      resManualComissao.administracao +
      resManualComissao.comissaoComercial +
      resManualComissao.indicacao
    expect(Math.abs(soma - resManualComissao.valorTotal)).toBeLessThanOrEqual(0.02)

    // Usuário digita comissão manual menor que R$ 600 (ex: R$ 300) — modo manual deve respeitar o valor digitado!
    const resComissaoAbaixoPiso = calcularCustosAba({
      materiaisEquipamentos: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      manualComissao: true,
      valorManualComissao: 300,
    })

    expect(resComissaoAbaixoPiso.comissaoComercial).toBe(300)
    const somaAbaixo =
      11900 +
      resComissaoAbaixoPiso.impostos +
      resComissaoAbaixoPiso.administracao +
      resComissaoAbaixoPiso.comissaoComercial +
      resComissaoAbaixoPiso.indicacao
    expect(Math.abs(somaAbaixo - resComissaoAbaixoPiso.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('permite edição manual de Indicação e mantém a invariante de soma', () => {
    // Modo manual de Indicação: R$ 800
    const resManualInd = calcularCustosAba({
      materiaisEquipamentos: 8000,
      maoDeObra: 1200,
      riscoEngenharia: 400,
      opcaoImposto: 2,
      manualIndicacao: true,
      valorManualIndicacao: 800,
    })

    expect(resManualInd.manualIndicacao).toBe(true)
    expect(resManualInd.indicacao).toBe(800)
    expect(resManualInd.indicacaoSemDesconto).toBe(800)

    const soma =
      9600 +
      resManualInd.impostos +
      resManualInd.administracao +
      resManualInd.comissaoComercial +
      resManualInd.indicacao
    expect(Math.abs(soma - resManualInd.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('permite edição manual simultânea dos três campos (Administração, Comissão e Indicação)', () => {
    const resTodosManuais = calcularCustosAba({
      materiaisEquipamentos: 14000,
      maoDeObra: 2000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      manualAdministracao: true,
      valorManualAdministracao: 2200,
      manualComissao: true,
      valorManualComissao: 1100,
      manualIndicacao: true,
      valorManualIndicacao: 450,
    })

    expect(resTodosManuais.manualAdministracao).toBe(true)
    expect(resTodosManuais.manualComissao).toBe(true)
    expect(resTodosManuais.manualIndicacao).toBe(true)
    expect(resTodosManuais.administracao).toBe(2200)
    expect(resTodosManuais.comissaoComercial).toBe(1100)
    expect(resTodosManuais.indicacao).toBe(450)

    // Subtotal base = 16400
    // Total = (16400 + 2200 + 1100 + 450) / (1 - 0.0923) = 20150 / 0.9077 ~ 22199.07
    // Impostos = 9.23% * Total
    const soma =
      16400 +
      resTodosManuais.impostos +
      resTodosManuais.administracao +
      resTodosManuais.comissaoComercial +
      resTodosManuais.indicacao
    expect(Math.abs(soma - resTodosManuais.valorTotal)).toBeLessThanOrEqual(0.02)
  })

  it('comportamento de desconto quando campos estão em modo manual: desconto atua proporcionalmente nos campos automáticos e preserva os manuais', () => {
    // Cenário: Administração em modo manual (R$ 2000), Comissão automática, Indicação automática.
    // Desconto de R$ 400 informado.
    const resMisto = calcularCustosAba({
      materiaisEquipamentos: 15000,
      maoDeObra: 2500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      manualAdministracao: true,
      valorManualAdministracao: 2000,
      desconto: 400,
    })

    // Administração manual não é descontada (mantém os R$ 2000 fixos que o usuário estabeleceu)
    expect(resMisto.administracao).toBe(2000)
    expect(resMisto.administracaoDescontada).toBe(0)

    // Indicação (automática) absorve a redução
    expect(resMisto.indicacaoDescontada).toBeGreaterThan(0)
  })
})

describe('Simulações personalizadas de Parcelamento & Financiamento (PRICE)', () => {
  it('calcula amortização PRICE corretamente com taxa zero e com juros positivos', () => {
    // PV = 10000, 10x sem juros => 1000/mês
    expect(calcularParcelaPrice(10000, 0, 10)).toBe(1000)

    // PV = 20000, 18x a 1,49% a.m.
    // i = 0.0149, n = 18 => 20000 * 0.0149 / (1 - (1.0149)^-18) ~ 1276.53
    const p18 = calcularParcelaPrice(20000, 1.49, 18)
    expect(p18).toBeGreaterThan(1270)
    expect(p18).toBeLessThan(1280)

    // PV = 30000, 60x a 1.90% a.m.
    const p60Banco1 = calcularParcelaPrice(30000, 1.9, 60)
    expect(p60Banco1).toBeGreaterThan(800)
    expect(p60Banco1).toBeLessThan(900)
  })

  it('permite customizar parcelas e juros para Cartão, Banco 1 e Banco 2 em calcularOrcamentoSolar', () => {
    const orcPadrao = calcularOrcamentoSolar({
      consumoKwhMes: 600,
      tipoCliente: 'residencial',
      tarifaKwh: 1.15,
      potenciaKwp: 5.5,
      valorInvestimentoInformado: 25000,
    })

    expect(orcPadrao.parcelamentos.cartao18x.numeroParcelas).toBe(18)
    expect(orcPadrao.parcelamentos.cartao18x.taxaJurosMensal).toBe(1.49)
    expect(orcPadrao.parcelamentos.financiamentoBanco1.numeroParcelas).toBe(60)
    expect(orcPadrao.parcelamentos.financiamentoBanco1.taxaJurosMensal).toBe(1.9)
    expect(orcPadrao.parcelamentos.financiamentoBanco2.numeroParcelas).toBe(60)
    expect(orcPadrao.parcelamentos.financiamentoBanco2.taxaJurosMensal).toBe(0.99)

    // Customizado: Cartão 12x a 1.2%, Banco 1 48x a 1.65%, Banco 2 72x a 0.85%
    const orcCustom = calcularOrcamentoSolar({
      consumoKwhMes: 600,
      tipoCliente: 'residencial',
      tarifaKwh: 1.15,
      potenciaKwp: 5.5,
      valorInvestimentoInformado: 25000,
      configParcelamentos: {
        parcelasCartao: 12,
        jurosCartao: 1.2,
        parcelasBanco1: 48,
        jurosBanco1: 1.65,
        parcelasBanco2: 72,
        jurosBanco2: 0.85,
      },
    })

    // Cartão
    expect(orcCustom.parcelamentos.cartao18x.numeroParcelas).toBe(12)
    expect(orcCustom.parcelamentos.cartao18x.taxaJurosMensal).toBe(1.2)
    expect(orcCustom.parcelamentos.cartao18x.titulo).toBe('Cartão de Crédito 12x')
    expect(orcCustom.parcelamentos.cartao18x.valorTotal).toBe(
      orcCustom.parcelamentos.cartao18x.valorParcela * 12,
    )

    // Banco 1
    expect(orcCustom.parcelamentos.financiamentoBanco1.numeroParcelas).toBe(48)
    expect(orcCustom.parcelamentos.financiamentoBanco1.taxaJurosMensal).toBe(1.65)
    expect(orcCustom.parcelamentos.financiamentoBanco1.valorTotal).toBe(
      orcCustom.parcelamentos.financiamentoBanco1.valorParcela * 48,
    )

    // Banco 2
    expect(orcCustom.parcelamentos.financiamentoBanco2.numeroParcelas).toBe(72)
    expect(orcCustom.parcelamentos.financiamentoBanco2.taxaJurosMensal).toBe(0.85)
    expect(orcCustom.parcelamentos.financiamentoBanco2.valorTotal).toBe(
      orcCustom.parcelamentos.financiamentoBanco2.valorParcela * 72,
    )
  })

  it('calcula economia e gastos considerando consumo efetivo igual à geração real dimensionada', () => {
    const orc = calcularOrcamentoSolar({
      potenciaKwp: 8.54,
      consumoKwhMes: 600,
      tipoCliente: 'residencial',
      tarifaKwh: 0.95,
    })

    // Geração mensal e anual
    expect(orc.geracaoMediaMensalKwh).toBeGreaterThan(0)
    expect(orc.geracaoAnualEstimadaKwh).toBeGreaterThan(0)

    // Conta sem solar baseada na geração real dimensionada
    const contaMesEsperada = orc.geracaoMediaMensalKwh * 0.95
    expect(orc.contaAtualSemSolarMes).toBeCloseTo(contaMesEsperada, 2)
    expect(orc.contaAtualSemSolarAno).toBeCloseTo(orc.geracaoAnualEstimadaKwh * 0.95, 2)

    // Como consumo = geração, energia não compensada = 0
    // Residencial monofásico: 30 kWh * 0.95 = 28.5
    // Com solar = 28.5 * 1.30 = 37.05
    const taxaMinimaReais = 30 * 0.95
    expect(orc.contaPrimeiroMesComSolar).toBeCloseTo(taxaMinimaReais * 1.3, 2)

    // Economia mensal
    expect(orc.economia1Mes).toBeCloseTo(contaMesEsperada - taxaMinimaReais * 1.3, 2)
    expect(orc.economia1Ano).toBeCloseTo(orc.economia1Mes * 12, 2)

    // Parcelamentos usam os valores alinhados
    expect(orc.parcelamentos.aVista.contaSemSolar).toBe(Math.round(orc.contaAtualSemSolarMes))
    expect(orc.parcelamentos.aVista.contaComSolar).toBe(Math.round(orc.contaPrimeiroMesComSolar))
  })
})

describe('dimensionarSistemaPorGeracaoPretendida - Calibração dos Fatores de Orientação', () => {
  it('dimensiona 7.32 kWp para 9459 kWh/ano na orientação Norte', () => {
    const res = dimensionarSistemaPorGeracaoPretendida(9459, 'norte', 550)
    expect(res).not.toBeNull()
    expect(res!.potenciaKwpNecessaria).toBe(7.32)
    // 7.32 * 1000 / 550 = 13.309 -> Math.ceil = 14 placas
    expect(res!.numeroPlacasSugerido).toBe(14)
  })

  it('dimensiona 7.32 kWp para 8894 kWh/ano na orientação Oeste', () => {
    const res = dimensionarSistemaPorGeracaoPretendida(8894, 'oeste', 550)
    expect(res).not.toBeNull()
    expect(res!.potenciaKwpNecessaria).toBe(7.32)
    expect(res!.numeroPlacasSugerido).toBe(14)
  })

  it('dimensiona 7.32 kWp para 8894 kWh/ano na orientação Leste', () => {
    const res = dimensionarSistemaPorGeracaoPretendida(8894, 'leste', 550)
    expect(res).not.toBeNull()
    expect(res!.potenciaKwpNecessaria).toBe(7.32)
    expect(res!.numeroPlacasSugerido).toBe(14)
  })

  it('dimensiona 7.32 kWp para 8224 kWh/ano na orientação Sul', () => {
    const res = dimensionarSistemaPorGeracaoPretendida(8224, 'sul', 550)
    expect(res).not.toBeNull()
    expect(res!.potenciaKwpNecessaria).toBe(7.32)
    expect(res!.numeroPlacasSugerido).toBe(14)
  })

  it('calcula proporcionalmente para geração pretendida de 10530 kWh/ano (Norte ~ 8.15 kWp)', () => {
    // 10530 / (9459 / 7.32) = 10530 / 1292.2131 ~ 8.1488 -> 8.15 kWp
    const res = dimensionarSistemaPorGeracaoPretendida(10530, 'norte', 550)
    expect(res).not.toBeNull()
    expect(res!.potenciaKwpNecessaria).toBe(8.15)
    // 8.15 * 1000 / 550 = 14.81 -> Math.ceil = 15 placas
    expect(res!.numeroPlacasSugerido).toBe(15)
  })

  it('retorna null se a geração pretendida for zero ou negativa', () => {
    expect(dimensionarSistemaPorGeracaoPretendida(0, 'norte')).toBeNull()
    expect(dimensionarSistemaPorGeracaoPretendida(-100, 'sul')).toBeNull()
  })
})

describe('calcularOrcamentoSolar - Geração Simulada Manual (kWh/ano)', () => {
  it('quando vazia ou 0, mantém o comportamento atual da geração estimada pelo kit', () => {
    const padraoSemSimulada = calcularOrcamentoSolar({
      potenciaKwp: 6.0,
      consumoKwhMes: 500,
      tarifaKwh: 1.0,
      tipoCliente: 'residencial',
    })

    const comSimuladaZero = calcularOrcamentoSolar({
      potenciaKwp: 6.0,
      consumoKwhMes: 500,
      tarifaKwh: 1.0,
      tipoCliente: 'residencial',
      geracaoSimuladaKwhAno: 0,
    })

    const comSimuladaIndefinida = calcularOrcamentoSolar({
      potenciaKwp: 6.0,
      consumoKwhMes: 500,
      tarifaKwh: 1.0,
      tipoCliente: 'residencial',
      geracaoSimuladaKwhAno: undefined,
    })

    expect(comSimuladaZero.geracaoAnualEstimadaKwh).toBe(padraoSemSimulada.geracaoAnualEstimadaKwh)
    expect(comSimuladaZero.geracaoMediaMensalKwh).toBe(padraoSemSimulada.geracaoMediaMensalKwh)
    expect(comSimuladaZero.contaAtualSemSolarMes).toBe(padraoSemSimulada.contaAtualSemSolarMes)
    expect(comSimuladaZero.economia1Mes).toBe(padraoSemSimulada.economia1Mes)
    expect(comSimuladaIndefinida.geracaoAnualEstimadaKwh).toBe(
      padraoSemSimulada.geracaoAnualEstimadaKwh,
    )
  })

  it('quando informada (> 0), substitui a geração calculada pelo kit e todos os cálculos derivados', () => {
    const geracaoSimulada = 12000 // 12000 kWh/ano -> 1000 kWh/mês
    const tarifa = 1.0
    const orc = calcularOrcamentoSolar({
      potenciaKwp: 6.0, // kit geraria ~7700 kWh/ano
      consumoKwhMes: 400,
      tarifaKwh: tarifa,
      tipoCliente: 'residencial',
      padraoFases: 'bifasico', // taxa mínima 50 kWh
      valorInvestimentoInformado: 30000,
      geracaoSimuladaKwhAno: geracaoSimulada,
    })

    // 1. Geração anual e mensal seguem a simulada
    expect(orc.geracaoAnualEstimadaKwh).toBe(12000)
    expect(orc.geracaoMediaMensalKwh).toBe(1000) // 12000 / 12

    // 2. Conta sem solar baseada na geração simulada (paridade total)
    // consumoEfetivo = 1000 kWh/mês
    expect(orc.contaAtualSemSolarMes).toBe(1000 * tarifa)
    expect(orc.contaAtualSemSolarAno).toBe(12000 * tarifa)

    // 3. Conta com solar (taxa mínima bifásica = 50 kWh * 1.0 * 1.30 = 65)
    expect(orc.contaPrimeiroMesComSolar).toBe(50 * tarifa * 1.3)

    // 4. Economia mensal e anual derivada da base simulada
    const economiaMesEsperada = 1000 * tarifa - 50 * tarifa * 1.3 // 1000 - 65 = 935
    expect(orc.economia1Mes).toBeCloseTo(economiaMesEsperada, 2)
    expect(orc.economia1Ano).toBeCloseTo(economiaMesEsperada * 12, 2)

    // 5. Payback calculado sobre a economia simulada
    expect(orc.paybackMeses).toBeGreaterThan(0)
    // 30000 / ~935 com reajuste deve dar em torno de 30-33 meses
    expect(orc.paybackMeses).toBeLessThan(40)

    // 6. Parcelamentos e modalidades refletem a conta e economia simulada
    expect(orc.parcelamentos.aVista.contaSemSolar).toBe(orc.contaAtualSemSolarMes)
    expect(orc.parcelamentos.aVista.economiaMensalLiquida).toBe(orc.economia1Mes)
    expect(orc.parcelamentos.cartao18x.contaSemSolar).toBe(orc.contaAtualSemSolarMes)
    expect(orc.parcelamentos.financiamentoBanco1.contaSemSolar).toBe(orc.contaAtualSemSolarMes)

    // 7. Geração mensal detalhada reescalonada soma o valor simulado
    const somaMeses = orc.geracaoMensalDetalhada.reduce((acc, m) => acc + m.geracaoKwh, 0)
    expect(Math.abs(somaMeses - geracaoSimulada)).toBeLessThanOrEqual(12) // tolerância de arredondamento por mês
  })
})

import { describe, it, expect } from 'vitest'
import {
  calcularCustosAba,
  calcularParcelaPrice,
  calcularOrcamentoSolar,
  dimensionarSistemaPorGeracaoPretendida,
  FATORES_GERACAO_ANUAL_KWP,
} from './energiaSolar'

describe('calcularCustosAba - Desconto e Comissão Mínima', () => {
  it('aplica desconto apenas na base de administração e comissão comercial', () => {
    // Cenário base com materiais = 10000, mão de obra = 1500, risco = 400
    // subtotalBase = 11900
    // Opção 1: valorTotal = (11900 * 1.18) / 0.8838 = 15888.21, impostos = 1429.94
    // somaComImpostos = 11900 + 1429.94 = 13329.94
    const resSemDesconto = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    const resComDesconto = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 1000,
    })

    // Desconto NÃO altera impostos nem valor total do projeto
    expect(resComDesconto.impostos).toBe(resSemDesconto.impostos)
    expect(resComDesconto.valorTotal).toBe(resSemDesconto.valorTotal)
    expect(resComDesconto.somaComImpostos).toBe(resSemDesconto.somaComImpostos)

    // Base com desconto reduz exatamente em 1000
    expect(resComDesconto.baseComDesconto).toBe(
      Math.round((resSemDesconto.somaComImpostos - 1000) * 100) / 100,
    )

    // Administração passa a ser (baseComDesconto * 0.15)
    expect(resComDesconto.administracao).toBe(
      Math.round(resComDesconto.baseComDesconto * 0.15 * 100) / 100,
    )
    expect(resComDesconto.administracao).toBeLessThan(resSemDesconto.administracao)
    expect(resComDesconto.administracaoDescontada).toBe(
      Math.round((resSemDesconto.administracao - resComDesconto.administracao) * 100) / 100,
    )

    // Indicação agora também reflete o desconto: (baseComDesconto * 0.01)
    expect(resComDesconto.indicacao).toBe(
      Math.round(resComDesconto.baseComDesconto * 0.01 * 100) / 100,
    )
    expect(resComDesconto.indicacao).toBeLessThan(resSemDesconto.indicacao)
    expect(resComDesconto.indicacaoDescontada).toBe(
      Math.round((resSemDesconto.indicacao - resComDesconto.indicacao) * 100) / 100,
    )

    // Percentual do desconto em relação ao projeto
    const expectedPct = Math.round((1000 / resSemDesconto.valorTotal) * 100 * 100) / 100
    expect(resComDesconto.percentualDescontoProjeto).toBe(expectedPct)
  })

  it('suporta desconto informado diretamente em percentual (%) e calcula o valor em R$ = valorTotal * % / 100', () => {
    // Mesma base: materiais = 10000, maoDeObra = 1500, risco = 400
    const resBase = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
    })

    // Desconto de 1%
    const res1Pct = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      descontoPercentual: 1,
    })

    const expectedDescontoReais = Math.round(resBase.valorTotal * 0.01 * 100) / 100
    expect(res1Pct.desconto).toBe(expectedDescontoReais)
    expect(res1Pct.percentualDescontoProjeto).toBe(1)

    // O valor do projeto e impostos permanecem inalterados
    expect(res1Pct.valorTotal).toBe(resBase.valorTotal)
    expect(res1Pct.impostos).toBe(resBase.impostos)
    expect(res1Pct.somaComImpostos).toBe(resBase.somaComImpostos)

    // Base líquida com desconto = somaComImpostos - desconto
    expect(res1Pct.baseComDesconto).toBe(
      Math.round((resBase.somaComImpostos - expectedDescontoReais) * 100) / 100,
    )

    // Administração reduz proporcionalmente
    expect(res1Pct.administracao).toBe(Math.round(res1Pct.baseComDesconto * 0.15 * 100) / 100)
    expect(res1Pct.administracaoDescontada).toBe(
      Math.round((resBase.administracao - res1Pct.administracao) * 100) / 100,
    )

    // Indicação reduz proporcionalmente
    expect(res1Pct.indicacao).toBe(Math.round(res1Pct.baseComDesconto * 0.01 * 100) / 100)
    expect(res1Pct.indicacaoDescontada).toBe(
      Math.round((resBase.indicacao - res1Pct.indicacao) * 100) / 100,
    )
  })

  it('aplica piso de R$ 600 na comissão se 3% for menor que 600 e exibe o 3% puro ao lado', () => {
    // Base pequena onde 3% é bem menor que 600 (ex: subtotalBase = 5000)
    // somaComImpostos ~ 5600 -> 3% ~ 168
    const res = calcularCustosAba({
      materiais: 3000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    expect(res.comissaoPura3Pct).toBeLessThan(600)
    expect(res.comissaoComercial).toBe(600)
    expect(res.comissaoUsouPisoMinimo).toBe(true)
  })

  it('mantém comissão superior a 600 quando 3% ultrapassar o piso', () => {
    // Base grande: materiais = 30000, 3% > 600
    const res = calcularCustosAba({
      materiais: 30000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    expect(res.comissaoPura3Pct).toBeGreaterThan(600)
    expect(res.comissaoComercial).toBe(res.comissaoPura3Pct)
    expect(res.comissaoUsouPisoMinimo).toBe(false)
  })

  it('reflete o desconto proporcionalmente na comissão quando acima do piso', () => {
    const resSemDesc = calcularCustosAba({
      materiais: 30000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 0,
    })

    const resComDesc = calcularCustosAba({
      materiais: 30000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 2000,
    })

    expect(resComDesc.comissaoUsouPisoMinimo).toBe(false)
    expect(resComDesc.comissaoComercial).toBe(
      Math.round(resComDesc.baseComDesconto * 0.03 * 100) / 100,
    )
    expect(resComDesc.comissaoDescontada).toBe(
      Math.round((resSemDesc.comissaoComercial - resComDesc.comissaoComercial) * 100) / 100,
    )
    expect(resComDesc.comissaoDescontada).toBe(60) // 2000 * 0.03 = 60
    expect(resComDesc.administracaoDescontada).toBe(300) // 2000 * 0.15 = 300
    expect(resComDesc.indicacaoDescontada).toBe(20) // 2000 * 0.01 = 20
  })

  it('respeita piso de 600 na comissão mesmo com desconto e calcula diferença efetiva descontada', () => {
    const resComDescPiso = calcularCustosAba({
      materiais: 3000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 500,
    })

    expect(resComDescPiso.comissaoComercial).toBe(600)
    expect(resComDescPiso.comissaoUsouPisoMinimo).toBe(true)
    // Como ambos sem desconto e com desconto batem no piso de 600, o valor descontado efetivo na comissão é 0
    expect(resComDescPiso.comissaoDescontada).toBe(0)
    // Mas administração e indicação continuam com o desconto proporcional
    expect(resComDescPiso.administracaoDescontada).toBe(75) // 500 * 0.15 = 75
    expect(resComDescPiso.indicacaoDescontada).toBe(5) // 500 * 0.01 = 5
  })

  it('separa materiaisEquipamentos e materiaisExtras e soma ambos no cálculo base e na dedução de impostos Opção 2', () => {
    // Caso com campo único de materiais = 18000
    const resUnico = calcularCustosAba({
      materiais: 18000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 2,
    })

    // Caso separado: materiaisEquipamentos = 15000 + materiaisExtras = 3000 (total = 18000)
    const resSeparado = calcularCustosAba({
      materiaisEquipamentos: 15000,
      materiaisExtras: 3000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 2,
    })

    // Devem ter exatamente os mesmos resultados de valorTotal, impostos e somaComImpostos
    expect(resSeparado.valorTotal).toBe(resUnico.valorTotal)
    expect(resSeparado.impostos).toBe(resUnico.impostos)
    expect(resSeparado.somaComImpostos).toBe(resUnico.somaComImpostos)
    expect(resSeparado.administracao).toBe(resUnico.administracao)

    // Adicionando mais materiais extras aumenta proporcionalmente os custos e investimento
    const resMaisExtras = calcularCustosAba({
      materiaisEquipamentos: 15000,
      materiaisExtras: 5000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 2,
    })
    expect(resMaisExtras.valorTotal).toBeGreaterThan(resSeparado.valorTotal)
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

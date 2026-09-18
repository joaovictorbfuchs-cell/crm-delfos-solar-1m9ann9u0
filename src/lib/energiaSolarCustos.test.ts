import { describe, it, expect } from 'vitest'
import {
  calcularCustosAba,
  calcularParcelaPrice,
  calcularOrcamentoSolar,
  dimensionarSistemaPorGeracaoPretendida,
  FATORES_GERACAO_ANUAL_KWP,
} from './energiaSolar'

describe('calcularCustosAba - Formação de Preço Delfos Solar', () => {
  it('validação obrigatória: fixture do usuário validada contra Excel (Opção 2, indicação 0%, piso R$ 600)', () => {
    // Base = 9.050 (Materiais/Equip. 6.200 + Mat. extras 800 + Mão de obra 1.200 + Risco 500 + Terceirização 200 + Marketing 150)
    // Base_sem_materiais = 9.050 - 6.200 = 2.850
    // Total esperado = R$ 12.351,09
    // Impostos esperado = R$ 848,43
    // Administração esperado = R$ 1.852,66
    // Comissão esperado = R$ 600,00
    // Indicação esperado = R$ 0,00
    const res = calcularCustosAba({
      materiaisEquipamentos: 6200,
      materiaisExtras: 800,
      maoDeObra: 1200,
      riscoEngenharia: 500,
      terceirizacao: 200,
      marketingCombustivel: 150,
      freteGuincho: 0,
      subestacao: 0,
      opcaoImposto: 2,
      percentualIndicacaoAuto: 0,
    })

    expect(res.valorTotal).toBe(12351.09)
    expect(res.impostos).toBe(848.43)
    expect(res.administracao).toBe(1852.66)
    expect(res.comissaoComercial).toBe(600)
    expect(res.indicacao).toBe(0)
    expect(res.comissaoUsouPisoMinimo).toBe(true)

    // Invariante de soma: Base + Impostos + Admin + Comissão + Indicação == Total
    const soma = 9050 + res.impostos + res.administracao + res.comissaoComercial + res.indicacao
    expect(Math.abs(soma - res.valorTotal)).toBeLessThanOrEqual(0.01)
  })

  it('valida fixture da planilha base R$ 8.450 com a nova regra da Opção 2', () => {
    // Base de custos diretos: R$ 8.450,00 (materiais/equipamentos R$ 6.431,01 + mão de obra R$ 1.618,99 + risco R$ 400)
    // Base_sem_materiais = 8.450 - 6.431,01 = 2.018,99
    // Nova regra Opção 2 com piso R$ 600 e indicação 0%:
    // Denominador = 1 - 1.16 * 0.15 = 0.826
    // Numerador = 8450 + 0.16 * 2018.99 + 1.16 * 600 = 8450 + 323.0384 + 696 = 9469.0384
    // valorTotal = 9469.0384 / 0.826 = 11463.7268... -> R$ 11.463,73
    // administracao = 15% * 11463.7268... = 1719.559 -> R$ 1.719,56
    // comissao = R$ 600,00 (piso)
    // indicacao = R$ 0,00
    // impostos = 16% * (2018.99 + 1719.559 + 600) = 16% * 4338.549 = 694.1678... -> R$ 694,17
    const resPlanilha = calcularCustosAba({
      materiaisEquipamentos: 6431.01,
      maoDeObra: 1618.99,
      riscoEngenharia: 400,
      opcaoImposto: 2,
      desconto: 0,
    })

    expect(resPlanilha.percentualIndicacaoAuto).toBe(0)
    expect(resPlanilha.indicacao).toBe(0)
    expect(resPlanilha.comissaoComercial).toBe(600)
    expect(resPlanilha.administracao).toBe(1719.56)
    expect(resPlanilha.impostos).toBe(694.17)
    expect(resPlanilha.valorTotal).toBe(11463.73)

    const somaItens =
      8450 +
      resPlanilha.impostos +
      resPlanilha.administracao +
      resPlanilha.comissaoComercial +
      resPlanilha.indicacao
    expect(Math.abs(somaItens - resPlanilha.valorTotal)).toBeLessThanOrEqual(0.01)
  })

  it('permite configurar indicação para 1% (0.01) e recalcula com precisão na nova regra Opção 2', () => {
    // Com indicação 1% (0.01):
    // Denominador = 1 - 1.16 * (0.15 + 0.01) = 1 - 1.16 * 0.16 = 1 - 0.1856 = 0.8144
    // Numerador = 8450 + 0.16 * 2018.99 + 1.16 * 600 = 9469.0384
    // valorTotal = 9469.0384 / 0.8144 = 11627.0117... -> R$ 11.627,01
    // administracao = 15% * 11627.0117... = 1744.05
    // comissao = R$ 600,00
    // indicacao = 1% * 11627.0117... = 116.27
    // base_imposto = 2018.99 + 1744.0517 + 600 + 116.2701 = 4479.3118
    // impostos = 16% * 4479.3118 = 716.6898... -> R$ 716.69
    const res1Pct = calcularCustosAba({
      materiaisEquipamentos: 6431.01,
      maoDeObra: 1618.99,
      riscoEngenharia: 400,
      opcaoImposto: 2,
      desconto: 0,
      percentualIndicacaoAuto: 0.01,
    })

    expect(res1Pct.percentualIndicacaoAuto).toBe(0.01)
    expect(res1Pct.valorTotal).toBe(11627.01)
    expect(res1Pct.administracao).toBe(1744.05)
    expect(res1Pct.comissaoComercial).toBe(600)
    expect(res1Pct.indicacao).toBe(116.27)
    expect(res1Pct.impostos).toBe(716.69)

    const somaItens =
      8450 +
      res1Pct.impostos +
      res1Pct.administracao +
      res1Pct.comissaoComercial +
      res1Pct.indicacao
    expect(Math.abs(somaItens - res1Pct.valorTotal)).toBeLessThanOrEqual(0.01)
  })

  it('invariante: total do projeto é exatamente a soma dos itens na Opção 1 (9,23% sobre total)', () => {
    const res = calcularCustosAba({
      materiais: 10000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      percentualIndicacaoAuto: 0.01,
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
      percentualIndicacaoAuto: 0.01,
    })

    // subtotalBase = 18400, materiais = 15000, baseSemMateriais = 3400
    // Denominador (com comissão 3%): 1 - 1.16 * (0.15 + 0.01 + 0.03) = 1 - 1.16 * 0.19 = 1 - 0.2204 = 0.7796
    // Numerador = 18400 + 0.16 * 3400 = 18400 + 544 = 18944
    // valorTotal = 18944 / 0.7796 ≈ 24300.08
    // 3% de 24300.08 = 729.00 > 600 => ultrapassa o piso!
    expect(res.comissaoUsouPisoMinimo).toBe(false)
    expect(res.comissaoComercial).toBeGreaterThan(600)
    expect(res.comissaoComercial).toBe(Math.round(res.valorTotal * 0.03 * 100) / 100)

    // Administração = 15% do total
    expect(res.administracao).toBe(Math.round(res.valorTotal * 0.15 * 100) / 100)

    // Indicação = 1% do total
    expect(res.indicacao).toBe(Math.round(res.valorTotal * 0.01 * 100) / 100)

    // Impostos = 16% * (Base_sem_materiais + Administracao + Comissao + Indicacao)
    const baseCalculoImpostos = 3400 + res.administracao + res.comissaoComercial + res.indicacao
    const expectedImpostos = Math.round(0.16 * baseCalculoImpostos * 100) / 100
    expect(res.impostos).toBe(expectedImpostos)

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
      percentualIndicacaoAuto: 0.01,
    })

    const resComDesc = calcularCustosAba({
      materiaisEquipamentos: 20000,
      maoDeObra: 3000,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      desconto: 500,
      percentualIndicacaoAuto: 0.01,
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

  it('separa materiaisEquipamentos e materiaisExtras e deduz apenas materiaisEquipamentos na Opção 2', () => {
    const res = calcularCustosAba({
      materiaisEquipamentos: 10000,
      materiaisExtras: 2000,
      maoDeObra: 1500,
      riscoEngenharia: 400,
      opcaoImposto: 2,
    })

    // subtotalBase = 10000 + 2000 + 1500 + 400 = 13900
    // baseSemMateriais = 13900 - 10000 = 3900 (materiaisExtras entra na base de impostos)
    // Impostos = 16% * (baseSemMateriais + administracao + comissao + indicacao)
    const baseCalculoImpostos = 3900 + res.administracao + res.comissaoComercial + res.indicacao
    const impostoEsperado = Math.round(0.16 * baseCalculoImpostos * 100) / 100
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

    // Imposto Opção 2 = 16% * (Base_sem_materiais + admin + comissao + indicacao)
    // Base_sem_materiais = (15000 + 2500 + 400) - 15000 = 2900
    const baseCalculoImpostosOp2 =
      2900 +
      resManualAdminOp2.administracao +
      resManualAdminOp2.comissaoComercial +
      resManualAdminOp2.indicacao
    const impostoOp2Esperado = Math.round(0.16 * baseCalculoImpostosOp2 * 100) / 100
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

  it('permite edição manual de Indicação e mantém a invariante de soma na Opção 2', () => {
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

    // Base sem materiais = 1600
    const baseCalculoImpostos =
      1600 + resManualInd.administracao + resManualInd.comissaoComercial + resManualInd.indicacao
    const impostoEsperado = Math.round(0.16 * baseCalculoImpostos * 100) / 100
    expect(resManualInd.impostos).toBe(impostoEsperado)

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
    // Cenário: Administração em modo manual (R$ 2000), Comissão automática, Indicação automática (1%).
    // Desconto de R$ 400 informado.
    const resMisto = calcularCustosAba({
      materiaisEquipamentos: 15000,
      maoDeObra: 2500,
      riscoEngenharia: 400,
      opcaoImposto: 1,
      percentualIndicacaoAuto: 0.01,
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

  it('calcula o IOF e inclui no principal financiado dos dois financiamentos (fixture real validada pelo usuário)', () => {
    // Caso real validado:
    // Valor à vista R$ 11.624,70, 60 parcelas a 1,9%
    // IOF = 11.624,70 * (0,0038 + 0,000082 * 30 * 60) = 11.624,70 * 0,1514 = R$ 1.759,97958 -> R$ 1.759,98
    // Principal = 11.624,70 + 1.759,97958 = R$ 13.384,67958 -> R$ 13.384,68
    // Parcela PRICE 60x a 1,9% = R$ 375,78
    const orc = calcularOrcamentoSolar({
      consumoKwhMes: 400,
      tipoCliente: 'residencial',
      tarifaKwh: 1.0,
      potenciaKwp: 3.5,
      valorInvestimentoInformado: 11624.7,
      configParcelamentos: {
        parcelasBanco1: 60,
        jurosBanco1: 1.9,
        parcelasBanco2: 60,
        jurosBanco2: 0.99,
      },
    })

    const f1 = orc.parcelamentos.financiamentoBanco1
    expect(f1.valorIof).toBeCloseTo(1759.98, 2)
    expect(f1.valorFinanciado).toBeCloseTo(13384.68, 2)
    expect(f1.valorParcela).toBeCloseTo(375.78, 2)
    expect(f1.valorTotal).toBeCloseTo(375.78 * 60, 1)

    // Banco 2: 60 parcelas a 0.99% a.m. com mesmo valor à vista de R$ 11.624,70
    // IOF é o mesmo para 60 parcelas: R$ 1.759,98
    // Principal é o mesmo: R$ 13.384,68
    // PMT Price: 13.384,68 * (0.0099 * 1.0099^60) / (1.0099^60 - 1) ≈ R$ 299,60
    const f2 = orc.parcelamentos.financiamentoBanco2
    expect(f2.valorIof).toBeCloseTo(1759.98, 2)
    expect(f2.valorFinanciado).toBeCloseTo(13384.68, 2)
    expect(f2.valorParcela).toBeCloseTo(299.6, 2)
    expect(f2.valorTotal).toBeCloseTo(f2.valorParcela * 60, 2)
  })

  it('abate a entrada do principal após somar o IOF', () => {
    const valorAVista = 20000
    const entrada = 5000
    // 60 parcelas -> aliquota IOF = 0,0038 + 0,000082 * 30 * 60 = 0,1514
    // IOF = 20.000 * 0,1514 = 3.028
    // Principal = 20.000 + 3.028 - 5.000 = 18.028
    const orc = calcularOrcamentoSolar({
      consumoKwhMes: 400,
      tipoCliente: 'residencial',
      tarifaKwh: 1.0,
      potenciaKwp: 3.5,
      valorInvestimentoInformado: valorAVista,
      configParcelamentos: {
        parcelasBanco1: 60,
        jurosBanco1: 1.9,
        entradaBanco1: entrada,
      },
    })

    const f1 = orc.parcelamentos.financiamentoBanco1
    expect(f1.valorIof).toBeCloseTo(3028, 2)
    expect(f1.valorEntrada).toBe(5000)
    expect(f1.valorFinanciado).toBeCloseTo(18028, 2)
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

    // Novo modelo GD Eco Líquida:
    // Monofásico residencial: taxa mínima desativada -> conta com solar = R$ 0,00
    // Tarifa 0.95, FS 0.30, Fio B 0.2239 -> GD Eco Líquida = 0.95 - (0.30 * 0.2239) = 0.8828
    expect(orc.contaPrimeiroMesComSolar).toBe(0)

    // Economia mensal = consumo * GD Eco Líquida
    const economiaMesEsperada = orc.geracaoMediaMensalKwh * orc.gdEcoLiquidaKwh
    expect(orc.economia1Mes).toBeCloseTo(economiaMesEsperada, 2)
    expect(orc.economia1Ano).toBeCloseTo(orc.economia1Mes * 12, 2)

    // Parcelamentos usam os valores alinhados
    expect(orc.parcelamentos.aVista.contaSemSolar).toBe(Math.round(orc.contaAtualSemSolarMes))
    expect(orc.parcelamentos.aVista.contaComSolar).toBe(0)
  })
})

describe('calcularOrcamentoSolar - Novo Modelo GD Eco Líquida e Taxa Mínima Condicionada', () => {
  it('validação com as fixtures da planilha: tarifa 1.1979, FS 30%, Fio B 0.2239 -> GD Eco Líquida 1.1039', () => {
    // Quando fornecido gdEcoLiquida informado de 1.1039:
    const orcPlanilhaExata = calcularOrcamentoSolar({
      consumoKwhMes: 331.43,
      tarifaKwh: 1.1979,
      fatorSimultaneidade: 0.3,
      fioBKwh: 0.2239,
      gdEcoLiquidaKwh: 1.1039,
      potenciaKwp: 2.8,
      padraoFases: 'monofasico',
      tipoCliente: 'residencial',
      geracaoSimuladaKwhAno: 331.43 * 12,
    })

    expect(orcPlanilhaExata.gdEcoLiquidaKwh).toBe(1.1039)
    expect(orcPlanilhaExata.economia1Mes).toBe(365.87)
    expect(orcPlanilhaExata.contaPrimeiroMesComSolar).toBe(0)

    // FS 70% comercial/industrial:
    // Tarifa 1.1979 - (0.70 * 0.2239) = 1.1979 - 0.15673 = 1.04117
    const orcComercial = calcularOrcamentoSolar({
      consumoKwhMes: 331.43,
      tarifaKwh: 1.1979,
      fioBKwh: 0.2239,
      potenciaKwp: 2.8,
      padraoFases: 'trifasico',
      tipoCliente: 'comercial',
      geracaoSimuladaKwhAno: 331.43 * 12,
    })

    expect(Number((1.1979 - 0.7 * 0.2239).toFixed(5))).toBe(1.04117)
    expect(orcComercial.gdEcoLiquidaKwh).toBeCloseTo(1.04117, 4)
    expect(orcComercial.fatorSimultaneidade).toBe(0.7)
    // Como 331.43 * 1.04117 = 345.07 > 100 * 1.1979 (119.79), conta com solar = 0
    expect(orcComercial.contaPrimeiroMesComSolar).toBe(0)

    // FS 30% residencial quando calculado pela fórmula direta (1.1979 - 0.30 * 0.2239):
    const orcResidencialCalculado = calcularOrcamentoSolar({
      consumoKwhMes: 331.43,
      tarifaKwh: 1.1979,
      fioBKwh: 0.2239,
      potenciaKwp: 2.8,
      padraoFases: 'monofasico',
      tipoCliente: 'residencial',
      geracaoSimuladaKwhAno: 331.43 * 12,
    })
    expect(orcResidencialCalculado.fatorSimultaneidade).toBe(0.3)
    expect(orcResidencialCalculado.gdEcoLiquidaKwh).toBeCloseTo(1.1979 - 0.3 * 0.2239, 4)
    expect(orcResidencialCalculado.contaPrimeiroMesComSolar).toBe(0)

    // Teste específico de 331.43 kWh e GD Eco Líquida 1.1039 -> R$ 365.87
    const ecoEsperada = Number((331.43 * 1.1039).toFixed(2))
    expect(ecoEsperada).toBe(365.87)
  })
  it('trifásico com compensação < 100 kWh em reais -> conta com solar = 100 * tarifa', () => {
    // Trifásico com consumo baixo (ex: 50 kWh), tarifa R$ 1,00
    // 50 kWh * GD Eco Líquida (~0.93) = ~R$ 46.50 < 100 * 1.00 (R$ 100,00)
    const orcTrifasicoBaixo = calcularOrcamentoSolar({
      consumoKwhMes: 50,
      tarifaKwh: 1.0,
      padraoFases: 'trifasico',
      tipoCliente: 'comercial',
      potenciaKwp: 1.0,
      geracaoSimuladaKwhAno: 50 * 12,
    })

    expect(orcTrifasicoBaixo.contaPrimeiroMesComSolar).toBe(100 * 1.0)
  })

  it('trifásico com compensação >= 100 kWh em reais -> conta com solar = R$ 0', () => {
    // Trifásico com consumo alto (ex: 500 kWh), tarifa R$ 1,00
    // 500 kWh * GD Eco Líquida > 100 * tarifa -> conta = R$ 0
    const orcTrifasicoAlto = calcularOrcamentoSolar({
      consumoKwhMes: 500,
      tarifaKwh: 1.0,
      padraoFases: 'trifasico',
      tipoCliente: 'comercial',
      potenciaKwp: 5.0,
      geracaoSimuladaKwhAno: 500 * 12,
    })

    expect(orcTrifasicoAlto.contaPrimeiroMesComSolar).toBe(0)
  })

  it('monofásico ou bifásico sempre tem conta com solar = R$ 0 (taxa mínima desativada)', () => {
    const orcMono = calcularOrcamentoSolar({
      consumoKwhMes: 50,
      tarifaKwh: 1.0,
      padraoFases: 'monofasico',
      tipoCliente: 'residencial',
      potenciaKwp: 1.0,
      geracaoSimuladaKwhAno: 50 * 12,
    })
    expect(orcMono.contaPrimeiroMesComSolar).toBe(0)

    const orcBi = calcularOrcamentoSolar({
      consumoKwhMes: 50,
      tarifaKwh: 1.0,
      padraoFases: 'bifasico',
      tipoCliente: 'residencial',
      potenciaKwp: 1.0,
      geracaoSimuladaKwhAno: 50 * 12,
    })
    expect(orcBi.contaPrimeiroMesComSolar).toBe(0)
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

    // 3. Conta com solar (bifásico -> taxa mínima desativada -> conta com solar = R$ 0)
    expect(orc.contaPrimeiroMesComSolar).toBe(0)

    // 4. Economia mensal e anual derivada da base simulada
    // Economia = consumo * GD Eco Líquida. Tarifa 1.0, FS 0.3, Fio B 0.2239 -> GD Eco = 1.0 - 0.06717 = 0.93283
    const economiaMesEsperada = 1000 * orc.gdEcoLiquidaKwh
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

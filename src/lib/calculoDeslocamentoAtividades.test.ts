import { describe, it, expect } from 'vitest'
import {
  estimarDistanciaDelfosCliente,
  calcularCustosAtividade,
  CONFIG_DESLOCAMENTO_PADRAO,
} from './calculoDeslocamentoAtividades'

describe('calculoDeslocamentoAtividades', () => {
  it('estima distância correta para cidades conhecidas a partir de Erechim', () => {
    const erechim = estimarDistanciaDelfosCliente('Erechim - RS', 'Erechim')
    expect(erechim.distanciaKm).toBe(8) // Urbano interno

    const getulio = estimarDistanciaDelfosCliente('Getúlio Vargas - RS', 'Getúlio Vargas')
    expect(getulio.distanciaKm).toBe(31)

    const gaurama = estimarDistanciaDelfosCliente('Gaurama - RS', 'Gaurama')
    expect(gaurama.distanciaKm).toBe(24)

    const passoFundo = estimarDistanciaDelfosCliente('Passo Fundo', 'Passo Fundo')
    expect(passoFundo.distanciaKm).toBe(78)
  })

  it('calcula custo total somando serviço e deslocamento cobrado', () => {
    // 35 km ida, ida e volta = 70 km; R$ 1,20/km => R$ 84,00
    // Serviço base R$ 250,00
    // Total = 334,00
    const res = calcularCustosAtividade({
      valorServico: 250,
      cobrarDeslocamento: true,
      distanciaKm: 35,
      valorKm: 1.2,
      cobrarIdaEVolta: true,
    })

    expect(res.custoServicoEfetivo).toBe(250)
    expect(res.kmTotalRodado).toBe(70)
    expect(res.custoDeslocamento).toBe(84)
    expect(res.custoTotal).toBe(334)
  })

  it('calcula cobrança por placa quando informada', () => {
    // 30 módulos x R$ 15,00/placa = R$ 450,00
    // Deslocamento desmarcado
    const res = calcularCustosAtividade({
      valorServico: 200,
      valorPorPlaca: 15,
      qtdModulos: 30,
      cobrarDeslocamento: false,
      distanciaKm: 20,
      valorKm: 1.2,
    })

    expect(res.isCobrancaPorPlaca).toBe(true)
    expect(res.custoPlacas).toBe(450)
    expect(res.custoServicoEfetivo).toBe(450)
    expect(res.custoDeslocamento).toBe(0)
    expect(res.custoTotal).toBe(450)
  })

  it('soma serviço por placas + deslocamento cobrado', () => {
    // 32 placas * 12.50 = 400
    // 35 km * 2 = 70 km * 1.20 = 84
    // Total = 484
    const res = calcularCustosAtividade({
      valorServico: 200,
      valorPorPlaca: 12.5,
      qtdModulos: 32,
      cobrarDeslocamento: true,
      distanciaKm: 35,
      valorKm: 1.2,
      cobrarIdaEVolta: true,
    })

    expect(res.custoPlacas).toBe(400)
    expect(res.custoDeslocamento).toBe(84)
    expect(res.custoTotal).toBe(484)
  })

  it('utiliza configuração padrão da Delfos quando não especificado', () => {
    expect(CONFIG_DESLOCAMENTO_PADRAO.baseCidade).toBe('Erechim')
    expect(CONFIG_DESLOCAMENTO_PADRAO.valorKmPadrao).toBe(1.2)
  })
})

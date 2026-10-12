import { describe, it, expect } from 'vitest'
import {
  calcularValorPlanoOM,
  calcularTodosPlanosOM,
  calcularBasePlanoOM,
  calcularDeslocamentoOM,
  calcularAjustePlacasOM,
  calcularDetalhesBaseOM,
  normalizarNomePlanoOM,
  PLANOS_OM_CATALOGO,
  PISO_BASE_OM,
  VALOR_PADRAO_POR_PLACA,
  VALOR_FIXO_PLACAS_ATE_34,
} from './planosOM'
import { calcularPropostaOM } from './propostaOMGenerator'

describe('Planos O&M - Módulo Centralizado e Fórmulas Exatas do Usuário', () => {
  it('contém exatamente os 3 planos canônicos: Essencial, Inspeção e Completo', () => {
    expect(PLANOS_OM_CATALOGO.Essencial).toBeDefined()
    expect(PLANOS_OM_CATALOGO.Inspeção).toBeDefined()
    expect(PLANOS_OM_CATALOGO.Completo).toBeDefined()

    expect(PLANOS_OM_CATALOGO.Essencial.nome).toBe('Plano Essencial')
    expect(PLANOS_OM_CATALOGO.Inspeção.nome).toBe('Plano Inspeção')
    expect(PLANOS_OM_CATALOGO.Completo.nome).toBe('Plano Completo')
  })

  it('preserva os bullets canônicos e termina Plano Completo com "Suporte técnico limitado VIP"', () => {
    const bulletsCompleto = PLANOS_OM_CATALOGO.Completo.bullets
    expect(bulletsCompleto).toContain('Tudo do plano Inspeção')
    expect(bulletsCompleto[bulletsCompleto.length - 1]).toBe('Suporte técnico limitado VIP')
  })

  it('normaliza nomes antigos como "Prevenção" para "Inspeção"', () => {
    expect(normalizarNomePlanoOM('Prevenção')).toBe('Inspeção')
    expect(normalizarNomePlanoOM('prevencao')).toBe('Inspeção')
    expect(normalizarNomePlanoOM('Inspeção')).toBe('Inspeção')
    expect(normalizarNomePlanoOM('inspecao')).toBe('Inspeção')
    expect(normalizarNomePlanoOM('Completo')).toBe('Completo')
    expect(normalizarNomePlanoOM('Essencial')).toBe('Essencial')
  })

  describe('Fórmulas exatas definidas pelo usuário', () => {
    it('1 e 2. Base = (geração × tarifa) ÷ 60, com piso de R$ 49,90', () => {
      // Caso abaixo do piso: 1000 kWh a R$ 0,92 -> 920 / 60 = 15,33 -> piso 49,90
      const abaixo = calcularBasePlanoOM(1000, 0.92)
      expect(abaixo.baseBruta).toBeCloseTo(15.33, 2)
      expect(abaixo.baseComPiso).toBe(PISO_BASE_OM)
      expect(abaixo.pisoAplicado).toBe(true)

      // Caso acima do piso: 4000 kWh a R$ 1,00 -> 4000 / 60 = 66,67 -> base 66,67
      const acima = calcularBasePlanoOM(4000, 1.0)
      expect(acima.baseBruta).toBeCloseTo(66.67, 2)
      expect(acima.baseComPiso).toBeCloseTo(66.67, 2)
      expect(acima.pisoAplicado).toBe(false)
    })

    it('7. Deslocamento = Distância × 2 × R$/km (ida e volta)', () => {
      // 15 km a R$ 2,50/km -> 15 * 2 * 2,50 = R$ 75,00
      expect(calcularDeslocamentoOM(15, 2.5)).toBe(75)
      // 0 km -> R$ 0
      expect(calcularDeslocamentoOM(0, 2.5)).toBe(0)
    })

    it('6. Ajuste de placas: < 35 placas = R$ 350 fixos; ≥ 35 placas = nº placas × R$ 9 editável', () => {
      // < 35 placas
      const ate34 = calcularAjustePlacasOM(20)
      expect(ate34.custo).toBe(VALOR_FIXO_PLACAS_ATE_34) // 350
      expect(ate34.regra).toBe('<35')

      // 34 placas exatas -> R$ 350
      expect(calcularAjustePlacasOM(34).custo).toBe(350)

      // 35 placas exatas -> 35 * 9 = 315
      const exatas35 = calcularAjustePlacasOM(35)
      expect(exatas35.custo).toBe(315)
      expect(exatas35.regra).toBe('>=35')

      // Caso de referência: Delfos Engenharia com 201 placas a R$ 9,00 -> 201 * 9 = R$ 1.809,00
      const delfosEng = calcularAjustePlacasOM(201, 9)
      expect(delfosEng.custo).toBe(1809)
      expect(delfosEng.valorPorPlacaEfetivo).toBe(9)

      // Valor de R$/placa editável (ex: R$ 8,50 por placa)
      const editavel = calcularAjustePlacasOM(201, 8.5)
      expect(editavel.custo).toBe(1708.5)
      expect(editavel.valorPorPlacaEfetivo).toBe(8.5)
    })

    it('3, 4 e 5. Planos Essencial, Inspeção e Completo (dobra parcela inteira de visita)', () => {
      // Exemplo: Usina residencial comum
      // Geração: 1000 kWh, Tarifa: R$ 0,92 (Base = R$ 49,90 pelo piso)
      // Placas: 20 (< 35 -> Ajuste = 350)
      // Distância: 15 km, R$/km: 2,50 -> Deslocamento = 15 * 2 * 2,5 = 75
      // Parcela de visita = 350 + 75 = 425
      // Essencial = 49,90
      // Inspeção = 49,90 + 425 = 474,90
      // Completo = 49,90 + 425 * 2 = 899,90
      const planos = calcularTodosPlanosOM({
        geracaoMensalKwh: 1000,
        valorKwh: 0.92,
        numeroModulos: 20,
        distanciaKm: 15,
        valorKm: 2.5,
      })

      expect(planos.Essencial.mensal).toBe(49.9)
      expect(planos.Inspeção.mensal).toBe(474.9)
      expect(planos.Completo.mensal).toBe(899.9)
      expect(planos.Essencial.anual).toBe(598.8)
      expect(planos.Inspeção.anual).toBe(5698.8)
      expect(planos.Completo.anual).toBe(10798.8)
    })

    it('Caso Delfos Engenharia (201 placas ≥ 35): calcula conforme fórmula', () => {
      // Geração: 15933 kWh, Tarifa: 0,92
      // Base bruta = (15933 * 0.92) / 60 = 244.306 -> 244.31 (acima do piso 49,90)
      // Ajuste placas = 201 * 9 = 1809
      // Deslocamento: 15 km, 2.50 R$/km -> 15 * 2 * 2.5 = 75
      // Parcela visita = 1809 + 75 = 1884
      // Essencial = 244.31
      // Inspeção = 244.31 + 1884 = 2128.31
      // Completo = 244.31 + 1884 * 2 = 4012.31
      const planos = calcularTodosPlanosOM({
        geracaoMensalKwh: 15933,
        valorKwh: 0.92,
        numeroModulos: 201,
        distanciaKm: 15,
        valorKm: 2.5,
        valorPorPlaca: 9,
      })

      expect(planos.Essencial.mensal).toBeCloseTo(244.31, 2)
      expect(planos.Inspeção.mensal).toBeCloseTo(2128.31, 2)
      expect(planos.Completo.mensal).toBeCloseTo(4012.31, 2)
    })

    it('Permite edição manual para negociação (valoresNegociados)', () => {
      const planos = calcularTodosPlanosOM({
        geracaoMensalKwh: 1000,
        valorKwh: 0.92,
        numeroModulos: 20,
        distanciaKm: 15,
        valorKm: 2.5,
        valoresNegociados: {
          Inspeção: 450.0,
          Completo: 850.0,
        },
      })

      expect(planos.Essencial.mensal).toBe(49.9)
      expect(planos.Essencial.isNegociado).toBeFalsy()

      // Inspeção negociado
      expect(planos.Inspeção.mensal).toBe(450.0)
      expect(planos.Inspeção.anual).toBe(5400.0)
      expect(planos.Inspeção.isNegociado).toBe(true)
      expect(planos.Inspeção.mensalCalculadoFormula).toBe(474.9)

      // Completo negociado
      expect(planos.Completo.mensal).toBe(850.0)
      expect(planos.Completo.anual).toBe(10200.0)
      expect(planos.Completo.isNegociado).toBe(true)
      expect(planos.Completo.mensalCalculadoFormula).toBe(899.9)
    })
  })

  it('calcularPropostaOM integra os cálculos dinâmicos com os cenários de perda', () => {
    const res = calcularPropostaOM({
      geracaoMensalKwh: 1000,
      valorKwh: 1.0,
      distanciaKm: 0,
      valorKm: 1.5,
      numeroModulos: 15,
      planoEscolhido: 'Inspeção',
    })

    expect(res.valorAtivoProtegido).toBe(1000)
    expect(res.perda15Ano).toBe(1800)
    expect(res.perda20Ano).toBe(2400)
    expect(res.prejuizo20Dias).toBeCloseTo(666.67, 1)
    expect(res.prejuizo30Dias).toBe(1000)

    // Base = 1000 / 60 = 16,67 -> piso 49,90
    // Placas 15 (<35) -> 350
    // Deslocamento 0 -> 0
    // Parcela visita = 350
    // Essencial = 49,90
    // Inspeção = 49,90 + 350 = 399,90
    // Completo = 49,90 + 700 = 749,90
    expect(res.planos.Essencial.mensal).toBe(49.9)
    expect(res.planos.Inspeção.mensal).toBe(399.9)
    expect(res.planos.Completo.mensal).toBe(749.9)
    // Alias de compatibilidade
    expect(res.planos.Prevenção?.mensal).toBe(399.9)

    expect(res.valorMensalEscolhido).toBe(399.9)
    expect(res.valorAnualEscolhido).toBeCloseTo(4798.8, 1)
  })
})

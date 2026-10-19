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
  mapearPlanoPropostaParaContrato,
  mapearPlanoContratoParaProposta,
  resolverValoresPlanosContratoOM,
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

  describe('Mapeamento e Unificação Proposta O&M <-> Contrato O&M', () => {
    it('mapeia Inspeção da proposta para Prevenção no contrato', () => {
      expect(mapearPlanoPropostaParaContrato('Inspeção')).toBe('Prevenção')
      expect(mapearPlanoPropostaParaContrato('inspecao')).toBe('Prevenção')
      expect(mapearPlanoPropostaParaContrato('Prevenção')).toBe('Prevenção')
      expect(mapearPlanoPropostaParaContrato('Completo')).toBe('Completo')
      expect(mapearPlanoPropostaParaContrato('Essencial')).toBe('Essencial')
      expect(mapearPlanoPropostaParaContrato(null)).toBe('Essencial')
    })

    it('mapeia Prevenção do contrato para Inspeção na proposta/cálculo', () => {
      expect(mapearPlanoContratoParaProposta('Prevenção')).toBe('Inspeção')
      expect(mapearPlanoContratoParaProposta('Inspeção')).toBe('Inspeção')
      expect(mapearPlanoContratoParaProposta('Completo')).toBe('Completo')
      expect(mapearPlanoContratoParaProposta('Essencial')).toBe('Essencial')
    })

    it('caso real do usuário: proposta aprovada com valores calculados/salvos da proposta (ex: 256.81/mês e 3081.72/ano no Completo)', () => {
      const propostaAprovada = {
        plano_escolhido: 'Completo',
        valor_mensal_plano: 256.81,
        valor_anual_plano: 3081.72,
        valor_plano_essencial: 76.81,
        valor_plano_inspecao: 166.81,
        valor_plano_completo: 256.81,
        numero_modulos: 20,
        geracao_mensal_kwh: 1000,
      }

      const res = resolverValoresPlanosContratoOM(propostaAprovada)
      expect(res.planoSugerido).toBe('Completo')
      expect(res.Completo.mensal).toBe(256.81)
      expect(res.Completo.anual).toBe(3081.72)
      expect(res.Completo.fonte).toBe('campo_plano')

      // Dropdown labels usam os valores da proposta e NUNCA fallbacks fixos 190, 450, 1450
      expect(res.Essencial.mensal).toBe(76.81)
      expect(res.Prevenção.mensal).toBe(166.81)
      expect(res.Prevenção.planoProposta).toBe('Inspeção')
      expect(res.Prevenção.fonte).toBe('campo_plano')
    })

    it('prioriza valores negociados da proposta sobre campos e fórmula', () => {
      const propostaComNegociado = {
        plano_escolhido: 'Inspeção',
        valores_negociados_json: JSON.stringify({
          Essencial: 120,
          Inspeção: 280,
          Completo: 500,
        }),
        valor_plano_essencial: 80,
        valor_plano_inspecao: 200,
        valor_plano_completo: 350,
      }

      const res = resolverValoresPlanosContratoOM(propostaComNegociado)
      expect(res.planoSugerido).toBe('Prevenção')
      expect(res.Essencial.mensal).toBe(120)
      expect(res.Essencial.fonte).toBe('negociado')
      expect(res.Prevenção.mensal).toBe(280)
      expect(res.Prevenção.fonte).toBe('negociado')
      expect(res.Completo.mensal).toBe(500)
      expect(res.Completo.fonte).toBe('negociado')
    })

    it('usa cálculo por fórmula quando campos da proposta estão ausentes e não há negociado, sem fallbacks fixos 190/450/1450', () => {
      const propostaSemValoresSalvos = {
        plano_escolhido: 'Inspeção',
        distancia_km: 15,
        valor_km: 2.5,
        numero_modulos: 20,
        geracao_mensal_kwh: 1000,
        valor_kwh: 0.92,
      }

      const res = resolverValoresPlanosContratoOM(propostaSemValoresSalvos)
      // Base = 49.90, Visita = 350 + 75 = 425 -> Rateio Inspeção = 35.42 -> 85.32
      expect(res.planoSugerido).toBe('Prevenção')
      expect(res.Essencial.mensal).toBe(49.9)
      expect(res.Prevenção.mensal).toBe(85.32)
      expect(res.Completo.mensal).toBe(120.73)
      expect(res.Essencial.fonte).toBe('formula')
      expect(res.Prevenção.fonte).toBe('formula')
      expect(res.Completo.fonte).toBe('formula')

      // Valores não são os antigos hardcoded 190, 450, 1450
      expect(res.Essencial.mensal).not.toBe(190)
      expect(res.Prevenção.mensal).not.toBe(450)
      expect(res.Completo.mensal).not.toBe(1450)
    })

    it('caso sem nenhuma informação: aplica piso mínimo R$ 49,90 e nunca 190/450/1450', () => {
      const res = resolverValoresPlanosContratoOM(null)
      expect(res.Essencial.mensal).toBe(49.9)
      expect(res.Prevenção.mensal).toBe(49.9)
      expect(res.Completo.mensal).toBe(49.9)
    })
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

    it('3, 4 e 5. Planos Essencial, Inspeção e Completo (rateia lavagens anuais em 12 meses)', () => {
      // Exemplo: Usina residencial comum
      // Geração: 1000 kWh, Tarifa: R$ 0,92 (Base = R$ 49,90 pelo piso)
      // Placas: 20 (< 35 -> Ajuste = 350)
      // Distância: 15 km, R$/km: 2,50 -> Deslocamento = 15 * 2 * 2,5 = 75
      // Parcela de visita (1 lavagem) = 350 + 75 = 425
      // Rateio mensal Inspeção (1 lavagem ÷ 12) = 425 / 12 = 35.4166... -> 35,42
      // Rateio mensal Completo (2 lavagens ÷ 12) = 850 / 12 = 70.8333... -> 70,83
      // Essencial = 49,90
      // Inspeção = 49,90 + 35,42 = 85,32
      // Completo = 49,90 + 70,83 = 120,73
      const planos = calcularTodosPlanosOM({
        geracaoMensalKwh: 1000,
        valorKwh: 0.92,
        numeroModulos: 20,
        distanciaKm: 15,
        valorKm: 2.5,
      })

      expect(planos.Essencial.mensal).toBe(49.9)
      expect(planos.Inspeção.mensal).toBe(85.32)
      expect(planos.Completo.mensal).toBe(120.73)
      expect(planos.Essencial.anual).toBe(598.8)
      expect(planos.Inspeção.anual).toBeCloseTo(85.32 * 12, 2)
      expect(planos.Completo.anual).toBeCloseTo(120.73 * 12, 2)
    })

    it('Caso Delfos Engenharia (201 placas ≥ 35): calcula com rateio em 12 meses', () => {
      // Geração: 15933 kWh, Tarifa: 0,92
      // Base bruta = (15933 * 0.92) / 60 = 244.306 -> 244.31 (acima do piso 49,90)
      // Ajuste placas = 201 * 9 = 1809
      // Deslocamento: 15 km, 2.50 R$/km -> 15 * 2 * 2.5 = 75
      // Parcela visita (1 lavagem anual) = 1809 + 75 = 1884
      // Rateio Inspeção = 1884 / 12 = 157.00
      // Rateio Completo = (1884 * 2) / 12 = 314.00
      // Essencial = 244.31
      // Inspeção = 244.31 + 157 = 401.31
      // Completo = 244.31 + 314 = 558.31
      const planos = calcularTodosPlanosOM({
        geracaoMensalKwh: 15933,
        valorKwh: 0.92,
        numeroModulos: 201,
        distanciaKm: 15,
        valorKm: 2.5,
        valorPorPlaca: 9,
      })

      expect(planos.Essencial.mensal).toBeCloseTo(244.31, 2)
      expect(planos.Inspeção.mensal).toBeCloseTo(401.31, 2)
      expect(planos.Completo.mensal).toBeCloseTo(558.31, 2)
    })

    it('Permite edição manual para negociação (valoresNegociados)', () => {
      const planos = calcularTodosPlanosOM({
        geracaoMensalKwh: 1000,
        valorKwh: 0.92,
        numeroModulos: 20,
        distanciaKm: 15,
        valorKm: 2.5,
        valoresNegociados: {
          Inspeção: 95.0,
          Completo: 130.0,
        },
      })

      expect(planos.Essencial.mensal).toBe(49.9)
      expect(planos.Essencial.isNegociado).toBeFalsy()

      // Inspeção negociado
      expect(planos.Inspeção.mensal).toBe(95.0)
      expect(planos.Inspeção.anual).toBe(1140.0)
      expect(planos.Inspeção.isNegociado).toBe(true)
      expect(planos.Inspeção.mensalCalculadoFormula).toBe(85.32)

      // Completo negociado
      expect(planos.Completo.mensal).toBe(130.0)
      expect(planos.Completo.anual).toBe(1560.0)
      expect(planos.Completo.isNegociado).toBe(true)
      expect(planos.Completo.mensalCalculadoFormula).toBe(120.73)
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
    // Parcela visita (1 lavagem) = 350
    // Rateio Inspeção = 350 / 12 = 29.166... -> 29,17
    // Rateio Completo = 700 / 12 = 58.333... -> 58,33
    // Essencial = 49,90
    // Inspeção = 49,90 + 29,17 = 79,07
    // Completo = 49,90 + 58,33 = 108,23
    expect(res.planos.Essencial.mensal).toBe(49.9)
    expect(res.planos.Inspeção.mensal).toBe(79.07)
    expect(res.planos.Completo.mensal).toBe(108.23)
    // Alias de compatibilidade
    expect(res.planos.Prevenção?.mensal).toBe(79.07)

    expect(res.valorMensalEscolhido).toBe(79.07)
    expect(res.valorAnualEscolhido).toBeCloseTo(79.07 * 12, 2)
  })
})

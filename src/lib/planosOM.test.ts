import { describe, it, expect } from 'vitest'
import {
  calcularValorPlanoOM,
  calcularTodosPlanosOM,
  normalizarNomePlanoOM,
  PLANOS_OM_CATALOGO,
  PLANOS_OM_VALORES_BASE,
} from './planosOM'
import { calcularPropostaOM } from './propostaOMGenerator'

describe('Planos O&M - Módulo Centralizado e Fórmula Dinâmica', () => {
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

  it('TESTE DE SANIDADE (deslocamento 0 km e até 15 módulos): produz exatamente os valores base 49,90 / 74,90 / 99,90', () => {
    const planos = calcularTodosPlanosOM({
      distanciaKm: 0,
      valorKm: 1.5,
      numeroModulos: 15,
    })

    expect(planos.Essencial.mensal).toBe(49.9)
    expect(planos.Inspeção.mensal).toBe(74.9)
    expect(planos.Completo.mensal).toBe(99.9)

    expect(planos.Essencial.anual).toBe(598.8)
    expect(planos.Inspeção.anual).toBe(898.8)
    expect(planos.Completo.anual).toBe(1198.8)
  })

  it('calcula acréscimo dinâmico de deslocamento proporcionalmente às visitas anuais de cada plano', () => {
    // Exemplo: 40 km de distância (ida e volta) a R$ 2,00/km -> Custo por viagem = R$ 80,00
    // - Essencial: 0 visitas presenciais -> R$ 0 acréscimo -> R$ 49,90/mês
    // - Inspeção: 1 visita técnica anual -> R$ 80 / 12 = R$ 6,67/mês -> R$ 74,90 + 6,67 = R$ 81,57/mês
    // - Completo: 2 visitas técnicas anuais -> R$ 160 / 12 = R$ 13,33/mês -> R$ 99,90 + 13,33 = R$ 113,23/mês
    const planos = calcularTodosPlanosOM({
      distanciaKm: 40,
      valorKm: 2.0,
      numeroModulos: 15,
    })

    expect(planos.Essencial.mensal).toBe(49.9)
    expect(planos.Inspeção.mensal).toBeCloseTo(81.57, 1)
    expect(planos.Completo.mensal).toBeCloseTo(113.23, 1)
  })

  it('calcula acréscimo dinâmico para usinas maiores com módulos acima da franquia base', () => {
    // 25 módulos (10 extras acima de 15)
    // - Essencial: 0 limpezas -> R$ 49,90/mês
    // - Inspeção: 1 limpeza/ano -> 10 extras × R$ 5,00 = R$ 50,00/ano -> R$ 4,17/mês -> R$ 79,07/mês
    // - Completo: 2 limpezas/ano -> 10 extras × R$ 5,00 × 2 = R$ 100,00/ano -> R$ 8,33/mês -> R$ 108,23/mês
    const planos = calcularTodosPlanosOM({
      distanciaKm: 0,
      numeroModulos: 25,
    })

    expect(planos.Essencial.mensal).toBe(49.9)
    expect(planos.Inspeção.mensal).toBeCloseTo(79.07, 1)
    expect(planos.Completo.mensal).toBeCloseTo(108.23, 1)
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

    expect(res.planos.Essencial.mensal).toBe(49.9)
    expect(res.planos.Inspeção.mensal).toBe(74.9)
    expect(res.planos.Completo.mensal).toBe(99.9)
    // Alias de compatibilidade
    expect(res.planos.Prevenção?.mensal).toBe(74.9)

    expect(res.valorMensalEscolhido).toBe(74.9)
    expect(res.valorAnualEscolhido).toBe(898.8)
  })
})

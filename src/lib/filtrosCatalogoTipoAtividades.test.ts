import { describe, it, expect, beforeEach } from 'vitest'
import {
  CAMPOS_ATIVIDADES,
  OPCOES_TIPO_ATIVIDADES_FALLBACK,
  getCatalogoPorModulo,
  getCampoPorId,
  injetarOpcoesTipoAtividades,
} from '@/lib/filtrosCatalogo'

describe('filtrosCatalogo — opções do campo Tipo da Atividade', () => {
  beforeEach(() => {
    // Reset: recria o estado do catálogo (fallback) entre testes via re-injeção vazia não é
    // possível — usamos injeções reversíveis nos próprios testes.
  })

  it('fallback tem exatamente os 3 tipos canônicos (sem legado limpeza_manutencao)', () => {
    expect(OPCOES_TIPO_ATIVIDADES_FALLBACK).toEqual([
      { label: 'Limpeza dos Módulos', value: 'limpeza' },
      { label: 'Manutenção Preventiva', value: 'manutencao_preventiva' },
      { label: 'Manutenção Corretiva', value: 'manutencao_corretiva' },
    ])
    expect(OPCOES_TIPO_ATIVIDADES_FALLBACK.some((o) => o.value === 'limpeza_manutencao')).toBe(
      false,
    )
  })

  it('catálogo começa com o fallback no campo tipo', () => {
    const campo = getCampoPorId('atividades', 'tipo')
    expect(campo?.opcoes).toEqual(OPCOES_TIPO_ATIVIDADES_FALLBACK)
  })

  it('injetarOpcoesTipoAtividades substitui as opções por referência (getCatalogoPorModulo e getCampoPorId)', () => {
    injetarOpcoesTipoAtividades([
      { label: 'Limpeza dos Módulos', value: 'limpeza' },
      { label: 'Manutenção Preventiva', value: 'manutencao_preventiva' },
      { label: 'Manutenção Corretiva', value: 'manutencao_corretiva' },
      { label: 'Limpeza + Manutenção', value: 'custom_abc123' },
    ])

    const catalogo = getCatalogoPorModulo('atividades')
    const campoCatalogo = catalogo.find((c) => c.id === 'tipo')
    const campoDireto = getCampoPorId('atividades', 'tipo')

    expect(campoCatalogo?.opcoes).toHaveLength(4)
    expect(campoCatalogo?.opcoes).toContainEqual({
      label: 'Limpeza + Manutenção',
      value: 'custom_abc123',
    })
    // Mesma referência: mutação por injeção propaga para todos os consumidores
    expect(campoCatalogo?.opcoes).toBe(campoDireto?.opcoes)
    // Canônicos permanecem presentes
    expect(campoCatalogo?.opcoes?.map((o) => o.value)).toEqual(
      expect.arrayContaining(['limpeza', 'manutencao_preventiva', 'manutencao_corretiva']),
    )
  })

  it('injetarOpcoesTipoAtividades ignora lista vazia ou inválida (mantém o estado anterior)', () => {
    injetarOpcoesTipoAtividades([] as never)
    const campo = getCampoPorId('atividades', 'tipo')
    expect(campo?.opcoes?.length).toBeGreaterThan(0)
  })

  it('CAMPOS_ATIVIDADES expõe o campo tipo com opcoes definidas', () => {
    const campoTipo = CAMPOS_ATIVIDADES.find((c) => c.id === 'tipo')
    expect(campoTipo).toBeDefined()
    expect(Array.isArray(campoTipo?.opcoes)).toBe(true)
    expect(campoTipo?.opcoes?.length).toBeGreaterThan(0)
  })
})

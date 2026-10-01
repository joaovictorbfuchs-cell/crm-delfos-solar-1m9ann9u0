import { describe, it, expect } from 'vitest'
import {
  marcasEquivalentes,
  modelosEquivalentes,
  encontrarEquipamentoCorrespondente,
  formatarPotenciaEquipamento,
  converterKwParaWatts,
  converterWattsParaKwString,
} from './equipamentosService'
import type { Equipamento } from '@/types/equipamentos'

describe('equipamentosService - correspondência tolerante para datasheet', () => {
  it('identifica equivalência de marcas com sinônimos e maiúsculas/minúsculas', () => {
    expect(marcasEquivalentes('CANADIAN', 'Canadian Solar')).toBe(true)
    expect(marcasEquivalentes('GROWATT', 'Growatt')).toBe(true)
    expect(marcasEquivalentes('SOLIS', 'Ginlong Solis')).toBe(true)
    expect(marcasEquivalentes('Huawei', 'HUAWEI')).toBe(true)
    expect(marcasEquivalentes('Deye', 'DEYE INVERTERS')).toBe(true)
    expect(marcasEquivalentes('Canadian', 'Growatt')).toBe(false)
  })

  it('identifica modelos por radical e substrings de código', () => {
    expect(modelosEquivalentes('CS3W-450MS', 'CS3W-450MS-AG')).toBe(true)
    expect(modelosEquivalentes('CS3W-455MS MONOCRISTAL 455Wp', 'CS3W-455MS')).toBe(true)
    expect(modelosEquivalentes('MAX 30KTL3-X LV', 'MAX 30KTL3-X')).toBe(true)
    expect(modelosEquivalentes('MIN 8000TL-X', 'MIN 8000TL-X')).toBe(true)
    expect(modelosEquivalentes('SUN2000-10KTL-M1', 'SUN2000-10KTL')).toBe(true)
  })

  it('encontra equipamento com datasheet no catálogo tolerante', () => {
    const catalogo = [
      {
        id: 'eq1',
        collectionId: 'equipamentos',
        collectionName: 'equipamentos',
        tipo: 'modulo_fv',
        marca: 'Canadian Solar',
        modelo: 'CS3W-450MS-AG',
        potencia_w: 450,
        datasheet_pdf: 'cs3w450.pdf',
        created: '2025-01-01',
        updated: '2025-01-01',
      },
      {
        id: 'eq2',
        collectionId: 'equipamentos',
        collectionName: 'equipamentos',
        tipo: 'inversor',
        marca: 'Growatt',
        modelo: 'MAX 30KTL3-X LV',
        potencia_w: 30000,
        datasheet_pdf: 'growatt_max.pdf',
        created: '2025-01-01',
        updated: '2025-01-01',
      },
      {
        id: 'eq3',
        collectionId: 'equipamentos',
        collectionName: 'equipamentos',
        tipo: 'modulo_fv',
        marca: 'Trina Solar',
        modelo: 'TSM-DE09.08',
        potencia_w: 400,
        datasheet_pdf: '', // sem datasheet
        created: '2025-01-01',
        updated: '2025-01-01',
      },
    ] as Equipamento[]

    // Canadian com CS3W-450MS
    const matchModulo = encontrarEquipamentoCorrespondente(catalogo, {
      marca: 'CANADIAN',
      modelo: 'CS3W-450MS',
      tipo: 'modulo_fv',
      apenasComDatasheet: true,
    })
    expect(matchModulo).not.toBeNull()
    expect(matchModulo?.id).toBe('eq1')
    expect(matchModulo?.datasheet_pdf).toBe('cs3w450.pdf')

    // Inversor Growatt
    const matchInversor = encontrarEquipamentoCorrespondente(catalogo, {
      marca: 'GROWATT',
      modelo: 'MAX 30KTL3-X',
      tipo: 'inversor',
      apenasComDatasheet: true,
    })
    expect(matchInversor).not.toBeNull()
    expect(matchInversor?.id).toBe('eq2')

    // Sem datasheet não deve retornar quando apenasComDatasheet é true
    const matchTrina = encontrarEquipamentoCorrespondente(catalogo, {
      marca: 'Trina',
      modelo: 'TSM-DE09.08',
      tipo: 'modulo_fv',
      apenasComDatasheet: true,
    })
    expect(matchTrina).toBeNull()
  })

  it('converte corretamente kW digitado pelo usuário para Watts', () => {
    expect(converterKwParaWatts('6')).toBe(6000)
    expect(converterKwParaWatts('6.0')).toBe(6000)
    expect(converterKwParaWatts('5,5')).toBe(5500)
    expect(converterKwParaWatts('0.55')).toBe(550)
    expect(converterKwParaWatts('0,585')).toBe(585)
    expect(converterKwParaWatts(10)).toBe(10000)
    expect(converterKwParaWatts('')).toBe(0)
    expect(converterKwParaWatts(null)).toBe(0)
  })

  it('converte Watts do banco para string de kW para inputs', () => {
    expect(converterWattsParaKwString(6000)).toBe('6')
    expect(converterWattsParaKwString(5000)).toBe('5')
    expect(converterWattsParaKwString(5500)).toBe('5.5')
    expect(converterWattsParaKwString(550)).toBe('0.55')
    expect(converterWattsParaKwString(585)).toBe('0.585')
    expect(converterWattsParaKwString(0)).toBe('')
    expect(converterWattsParaKwString(null)).toBe('')
  })

  it('formata potência com kW em primeiro plano e Watts como referência', () => {
    expect(formatarPotenciaEquipamento(6000)).toBe('6 kW (6.000 W)')
    expect(formatarPotenciaEquipamento(5500)).toBe('5,5 kW (5.500 W)')
    expect(formatarPotenciaEquipamento(550)).toBe('0,55 kW (550 W)')
    expect(formatarPotenciaEquipamento(0)).toBe('0 kW')
  })
})

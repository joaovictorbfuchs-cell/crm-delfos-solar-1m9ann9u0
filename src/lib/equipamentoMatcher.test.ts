import { describe, it, expect } from 'vitest'
import {
  marcasCoincidem,
  equipamentoCorrespondeRigoroso,
  buscarEquipamentoCorrespondente,
  extrairTokensModelo,
  extrairPotenciaWpDoModelo,
  extrairCelulasDoModelo,
} from './equipamentoMatcher'
import type { Equipamento } from '@/types/equipamentos'

describe('equipamentoMatcher - Correspondência Rigorosa de Equipamentos', () => {
  const mockCatalogo: Equipamento[] = [
    {
      id: 'eq_mod_sunova_555',
      collectionId: 'equipamentos',
      collectionName: 'equipamentos',
      tipo: 'modulo_fv',
      marca: 'Sunova Solar',
      modelo: 'SS-555-72MDH',
      potencia_w: 555,
      created: '2026-01-01',
      updated: '2026-01-01',
    },
    {
      id: 'eq_mod_sunova_610',
      collectionId: 'equipamentos',
      collectionName: 'equipamentos',
      tipo: 'modulo_fv',
      marca: 'Sunova Solar',
      modelo: 'SS-610-66MDH-G11',
      potencia_w: 610,
      created: '2026-01-01',
      updated: '2026-01-01',
    },
    {
      id: 'eq_inv_solis_75_80',
      collectionId: 'equipamentos',
      collectionName: 'equipamentos',
      tipo: 'inversor',
      marca: 'Solis',
      modelo: 'Solis-(75-80)K-5G-PRO',
      potencia_w: 75000,
      created: '2026-01-01',
      updated: '2026-01-01',
    },
    {
      id: 'eq_inv_solis_60',
      collectionId: 'equipamentos',
      collectionName: 'equipamentos',
      tipo: 'inversor',
      marca: 'Solis',
      modelo: 'S5-GC 60K',
      potencia_w: 60000,
      created: '2026-01-01',
      updated: '2026-01-01',
    },
  ]

  describe('Regra 1: Marcas coincidem como pré-requisito', () => {
    it('deve casar variações válidas da mesma marca', () => {
      expect(marcasCoincidem('Sunova', 'Sunova Solar')).toBe(true)
      expect(marcasCoincidem('Solis', 'Solis Inverters')).toBe(true)
      expect(marcasCoincidem('Huawei', 'Huawei Technologies')).toBe(true)
      expect(marcasCoincidem('JA Solar', 'JA Solar')).toBe(true)
    })

    it('não deve casar marcas diferentes', () => {
      expect(marcasCoincidem('Sunova', 'Canadian Solar')).toBe(false)
      expect(marcasCoincidem('Growatt', 'Deye')).toBe(false)
      expect(marcasCoincidem('Solis', 'Sungrow')).toBe(false)
      expect(marcasCoincidem('', 'Sunova')).toBe(false)
      expect(marcasCoincidem(null, 'Sunova')).toBe(false)
    })
  })

  describe('Caso 1 do usuário: Módulo SUNOVA SS-610-66MDH-G11 vs Sunova SS-555-72MDH', () => {
    it('NÃO deve casar módulo de 610 Wp (66 células) com módulo de 555 Wp (72 células)', () => {
      const extraidoDoc = {
        tipo: 'modulo_fv' as const,
        fabricante: 'SUNOVA',
        modelo: 'SS-610-66MDH-G11',
        potenciaW: 610,
      }

      const mod555 = mockCatalogo.find((e) => e.id === 'eq_mod_sunova_555')!
      const corresponde = equipamentoCorrespondeRigoroso(extraidoDoc, mod555)
      expect(corresponde).toBe(false)
    })

    it('DEVE casar quando o catálogo possui exatamente o módulo de 610 Wp', () => {
      const extraidoDoc = {
        tipo: 'modulo_fv' as const,
        fabricante: 'SUNOVA',
        modelo: 'SS-610-66MDH-G11',
        potenciaW: 610,
      }

      const match = buscarEquipamentoCorrespondente(extraidoDoc, mockCatalogo)
      expect(match).not.toBeNull()
      expect(match?.id).toBe('eq_mod_sunova_610')
      expect(match?.modelo).toBe('SS-610-66MDH-G11')
    })

    it('deve retornar null se no catálogo só existir o SS-555-72MDH', () => {
      const catalogoApenas555 = mockCatalogo.filter((e) => e.id !== 'eq_mod_sunova_610')
      const extraidoDoc = {
        tipo: 'modulo_fv' as const,
        fabricante: 'SUNOVA',
        modelo: 'SS-610-66MDH-G11',
        potenciaW: 610,
      }

      const match = buscarEquipamentoCorrespondente(extraidoDoc, catalogoApenas555)
      expect(match).toBeNull()
    })
  })

  describe('Caso 2 do usuário: Inversor SOLIS S5-GC 60 kW vs Solis-(75-80)K-5G-PRO', () => {
    it('NÃO deve casar inversor de 60 kW com inversor de 75-80 kW', () => {
      const extraidoDoc = {
        tipo: 'inversor' as const,
        fabricante: 'SOLIS',
        modelo: 'S5-GC',
        potenciaW: 60000, // 60 kW
      }

      const inv7580 = mockCatalogo.find((e) => e.id === 'eq_inv_solis_75_80')!
      const corresponde = equipamentoCorrespondeRigoroso(extraidoDoc, inv7580)
      expect(corresponde).toBe(false)
    })

    it('DEVE casar quando o catálogo possui o inversor de 60 kW correspondente', () => {
      const extraidoDoc = {
        tipo: 'inversor' as const,
        fabricante: 'SOLIS',
        modelo: 'S5-GC 60K',
        potenciaW: 60000,
      }

      const match = buscarEquipamentoCorrespondente(extraidoDoc, mockCatalogo)
      expect(match).not.toBeNull()
      expect(match?.id).toBe('eq_inv_solis_60')
    })

    it('deve retornar null se no catálogo só existir o inversor de 75-80 kW', () => {
      const catalogoApenas7580 = mockCatalogo.filter((e) => e.id !== 'eq_inv_solis_60')
      const extraidoDoc = {
        tipo: 'inversor' as const,
        fabricante: 'SOLIS',
        modelo: 'S5-GC',
        potenciaW: 60000,
      }

      const match = buscarEquipamentoCorrespondente(extraidoDoc, catalogoApenas7580)
      expect(match).toBeNull()
    })
  })

  describe('Extratores auxiliares de modelo', () => {
    it('extrai potência em Wp do modelo', () => {
      expect(extrairPotenciaWpDoModelo('SS-610-66MDH-G11')).toBe(610)
      expect(extrairPotenciaWpDoModelo('SS-555-72MDH')).toBe(555)
      expect(extrairPotenciaWpDoModelo('CS7L-550MS')).toBe(550)
      expect(extrairPotenciaWpDoModelo('JAM72S30-545/MR')).toBe(545)
    })

    it('extrai contagem de células do modelo', () => {
      expect(extrairCelulasDoModelo('SS-610-66MDH-G11')).toBe(66)
      expect(extrairCelulasDoModelo('SS-555-72MDH')).toBe(72)
      expect(extrairCelulasDoModelo('JAM54S31-415/MR')).toBe(54)
    })

    it('extrai tokens de modelo sem pontuação', () => {
      expect(extrairTokensModelo('SS-610-66MDH-G11')).toEqual(['ss', '610', '66mdh', 'g11'])
      expect(extrairTokensModelo('Solis-(75-80)K-5G-PRO')).toEqual([
        'solis',
        '75',
        '80',
        'k',
        '5g',
        'pro',
      ])
    })
  })
})

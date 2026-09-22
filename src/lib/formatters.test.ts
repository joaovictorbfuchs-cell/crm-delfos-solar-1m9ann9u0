import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatCurrencyBRL,
  maskCurrencyBRL,
  parseCurrencyBRL,
  formatarMesAnoQuitacao,
  formatWhatsAppPhone,
} from './formatters'

describe('Formatters - Máscara Monetária em Real (R$)', () => {
  describe('formatCurrencyBRL', () => {
    it('deve formatar valores numéricos com duas casas decimais e agrupador de milhar', () => {
      expect(formatCurrencyBRL(1198.8)).toBe('R$ 1.198,80')
      expect(formatCurrencyBRL(1198.8000000000002)).toBe('R$ 1.198,80')
      expect(formatCurrencyBRL(99.9)).toBe('R$ 99,90')
      expect(formatCurrencyBRL(0)).toBe('R$ 0,00')
      expect(formatCurrencyBRL(1234567.89)).toBe('R$ 1.234.567,89')
      expect(formatCurrencyBRL(5)).toBe('R$ 5,00')
    })

    it('deve lidar com valores nulos ou indefinidos de forma segura', () => {
      expect(formatCurrencyBRL(null)).toBe('R$ 0,00')
      expect(formatCurrencyBRL(undefined)).toBe('R$ 0,00')
      expect(formatCurrencyBRL(NaN)).toBe('R$ 0,00')
    })
  })

  describe('maskCurrencyBRL', () => {
    it('deve aplicar máscara monetária estilo caixa eletrônico/centavos durante digitação', () => {
      expect(maskCurrencyBRL('')).toBe('R$ 0,00')
      expect(maskCurrencyBRL('1')).toBe('R$ 0,01')
      expect(maskCurrencyBRL('10')).toBe('R$ 0,10')
      expect(maskCurrencyBRL('100')).toBe('R$ 1,00')
      expect(maskCurrencyBRL('9990')).toBe('R$ 99,90')
      expect(maskCurrencyBRL('119880')).toBe('R$ 1.198,80')
      expect(maskCurrencyBRL('R$ 1.198,80')).toBe('R$ 1.198,80')
    })

    it('deve aceitar número diretamente', () => {
      expect(maskCurrencyBRL(99.9)).toBe('R$ 99,90')
      expect(maskCurrencyBRL(1198.8000000000002)).toBe('R$ 1.198,80')
    })
  })

  describe('parseCurrencyBRL', () => {
    it('deve converter string formatada em número com 2 casas decimais sem float impreciso', () => {
      expect(parseCurrencyBRL('R$ 1.198,80')).toBe(1198.8)
      expect(parseCurrencyBRL('R$ 99,90')).toBe(99.9)
      expect(parseCurrencyBRL('R$ 0,00')).toBe(0)
      expect(parseCurrencyBRL('')).toBe(0)
      expect(parseCurrencyBRL(1198.8000000000002)).toBe(1198.8)
    })

    it('deve calcular corretamente valor mensal * 12 sem dízimas estranhas', () => {
      const mensal = parseCurrencyBRL('R$ 99,90') // 99.9
      const anual = Math.round(mensal * 12 * 100) / 100
      expect(anual).toBe(1198.8)
      expect(formatCurrencyBRL(anual)).toBe('R$ 1.198,80')
    })
  })

  describe('formatarMesAnoQuitacao', () => {
    it('deve calcular o mês e ano corretos a partir de uma data base e payback em meses', () => {
      // 2024-03-15 + 52 meses = março/2024 + 4 anos e 4 meses = julho/2028
      const resultado = formatarMesAnoQuitacao('2024-03-15', 52)
      expect(resultado).toBe('julho/2028')
    })

    it('deve usar 24 meses como fallback quando paybackMeses não for informado', () => {
      const base = new Date(2024, 0, 15) // janeiro/2024
      const resultado = formatarMesAnoQuitacao(base, null)
      expect(resultado).toBe('janeiro/2026')
    })
  })

  describe('formatCurrency, formatDate, formatDateTime (defensivos)', () => {
    it('formatCurrency deve aceitar number, string, null, undefined sem crashar', () => {
      expect(formatCurrency(null)).toBe('R$ 0,00')
      expect(formatCurrency(undefined)).toBe('R$ 0,00')
      expect(formatCurrency('')).toBe('R$ 0,00')
      expect(formatCurrency(NaN)).toBe('R$ 0,00')
      expect(formatCurrency('abc')).toBe('R$ 0,00')
      expect(formatCurrency(190)).toBe('R$ 190,00')
      expect(formatCurrency('250.5')).toBe('R$ 250,50')
    })

    it('formatDate deve tratar null, undefined, vazio e datas inválidas retornando "-"', () => {
      expect(formatDate(null)).toBe('-')
      expect(formatDate(undefined)).toBe('-')
      expect(formatDate('')).toBe('-')
      expect(formatDate('   ')).toBe('-')
      expect(formatDate('data-invalida')).toBe('-')
      expect(formatDate('2025-03-15T00:00:00Z')).toBe('15/03/2025')
    })

    it('formatDateTime deve tratar null, undefined, vazio e datas inválidas retornando "-"', () => {
      expect(formatDateTime(null)).toBe('-')
      expect(formatDateTime(undefined)).toBe('-')
      expect(formatDateTime('')).toBe('-')
      expect(formatDateTime('   ')).toBe('-')
      expect(formatDateTime('data-invalida')).toBe('-')
      expect(formatDateTime('2025-03-15T12:00:00Z')).toMatch(/\d{2}\/\d{2}\/\d{4}/)
    })
  })

  describe('formatWhatsAppPhone', () => {
    it('deve formatar número completo com DDD 54', () => {
      expect(formatWhatsAppPhone('54991234567')).toBe('(54) 99123-4567')
      expect(formatWhatsAppPhone('5435221234')).toBe('(54) 3522-1234')
    })

    it('deve formatar número sem DDD assumindo 54 para celular (9 dígitos) e fixo (8 dígitos)', () => {
      expect(formatWhatsAppPhone('99123-4567')).toBe('(54) 99123-4567')
      expect(formatWhatsAppPhone('991234567')).toBe('(54) 99123-4567')
      expect(formatWhatsAppPhone('3522-1234')).toBe('(54) 3522-1234')
      expect(formatWhatsAppPhone('35221234')).toBe('(54) 3522-1234')
    })

    it('deve remover DDI 55 e preservar DDD', () => {
      expect(formatWhatsAppPhone('+55 54 99123-4567')).toBe('(54) 99123-4567')
      expect(formatWhatsAppPhone('+55 51 98888-7766')).toBe('(51) 98888-7766')
    })
  })
})

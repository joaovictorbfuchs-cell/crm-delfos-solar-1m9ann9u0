import { describe, it, expect } from 'vitest'
import {
  parseSaoPauloToUtcIso,
  getSaoPauloTimestampMs,
  formatUtcToSaoPaulo,
  formatUtcToSaoPauloInput,
} from './datetimeSaoPaulo'

describe('datetimeSaoPaulo', () => {
  describe('parseSaoPauloToUtcIso', () => {
    it('deve converter datetime-local para UTC somando 3 horas', () => {
      // 14:30 em SP (UTC-3) corresponde a 17:30 em UTC
      const input = '2025-05-10T14:30'
      const iso = parseSaoPauloToUtcIso(input)
      expect(iso).toBe('2025-05-10T17:30:00.000Z')
    })

    it('deve converter com segundos opcionais corretamente', () => {
      const input = '2025-05-10T14:30:45'
      const iso = parseSaoPauloToUtcIso(input)
      expect(iso).toBe('2025-05-10T17:30:45.000Z')
    })

    it('deve lidar com virada de dia ao converter de SP para UTC', () => {
      // 22:00 do dia 10 em SP corresponde a 01:00 do dia 11 em UTC
      const input = '2025-05-10T22:00'
      const iso = parseSaoPauloToUtcIso(input)
      expect(iso).toBe('2025-05-11T01:00:00.000Z')
    })

    it('deve lidar com formato com espaço em vez de T', () => {
      const input = '2025-12-31 23:59'
      const iso = parseSaoPauloToUtcIso(input)
      expect(iso).toBe('2026-01-01T02:59:00.000Z')
    })

    it('deve retornar null para entradas vazias ou inválidas', () => {
      expect(parseSaoPauloToUtcIso('')).toBeNull()
      expect(parseSaoPauloToUtcIso(null)).toBeNull()
      expect(parseSaoPauloToUtcIso(undefined)).toBeNull()
      expect(parseSaoPauloToUtcIso('invalid-date')).toBeNull()
    })
  })

  describe('getSaoPauloTimestampMs', () => {
    it('deve retornar o timestamp em milissegundos correspondente ao instante em UTC', () => {
      const input = '2025-05-10T14:30'
      const ms = getSaoPauloTimestampMs(input)
      expect(ms).toBe(new Date('2025-05-10T17:30:00.000Z').getTime())
    })

    it('deve retornar null para entrada inválida', () => {
      expect(getSaoPauloTimestampMs('data-invalida')).toBeNull()
    })
  })

  describe('formatUtcToSaoPaulo', () => {
    it('deve formatar data UTC como DD/MM/AAAA HH:mm no fuso de SP subtraindo 3 horas', () => {
      const utcIso = '2025-05-10T17:30:00.000Z'
      const formatted = formatUtcToSaoPaulo(utcIso)
      expect(formatted).toBe('10/05/2025 14:30')
    })

    it('deve lidar com virada de dia ao subtrair 3 horas de UTC', () => {
      // 01:00 do dia 11 em UTC corresponde a 22:00 do dia 10 em SP
      const utcIso = '2025-05-11T01:00:00.000Z'
      const formatted = formatUtcToSaoPaulo(utcIso)
      expect(formatted).toBe('10/05/2025 22:00')
    })

    it('deve permitir incluir segundos quando solicitado', () => {
      const utcIso = '2025-05-10T17:30:45.000Z'
      const formatted = formatUtcToSaoPaulo(utcIso, true)
      expect(formatted).toBe('10/05/2025 14:30:45')
    })

    it('deve retornar "-" para valores nulos, vazios ou inválidos', () => {
      expect(formatUtcToSaoPaulo(null)).toBe('-')
      expect(formatUtcToSaoPaulo(undefined)).toBe('-')
      expect(formatUtcToSaoPaulo('')).toBe('-')
      expect(formatUtcToSaoPaulo('invalido')).toBe('-')
    })
  })

  describe('formatUtcToSaoPauloInput', () => {
    it('deve formatar UTC para valor de input datetime-local no horário de SP', () => {
      const utcIso = '2025-05-10T17:30:00.000Z'
      const inputVal = formatUtcToSaoPauloInput(utcIso)
      expect(inputVal).toBe('2025-05-10T14:30')
    })

    it('deve retornar string vazia para entradas nulas ou inválidas', () => {
      expect(formatUtcToSaoPauloInput(null)).toBe('')
      expect(formatUtcToSaoPauloInput('')).toBe('')
      expect(formatUtcToSaoPauloInput('invalido')).toBe('')
    })
  })

  describe('Consistência bidirecional (ida e volta)', () => {
    it('deve converter datetime-local para UTC e reformatar exatamente o mesmo horário em SP', () => {
      const originalSp = '2025-08-20T09:15'
      const utcIso = parseSaoPauloToUtcIso(originalSp)
      expect(utcIso).not.toBeNull()

      const exibicaoSp = formatUtcToSaoPaulo(utcIso)
      expect(exibicaoSp).toBe('20/08/2025 09:15')

      const inputReverso = formatUtcToSaoPauloInput(utcIso)
      expect(inputReverso).toBe(originalSp)
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  timeStringToMinutes,
  minutesToTimeString,
  somarMinutos,
  calcularDiferencaMinutos,
  formatarDuracao,
  arredondarParaPasso5,
} from './horarios'

describe('utilitário de horários e duração prevista', () => {
  it('converte string de hora em minutos e vice-versa', () => {
    expect(timeStringToMinutes('08:00')).toBe(480)
    expect(timeStringToMinutes('09:30')).toBe(570)
    expect(timeStringToMinutes('00:00')).toBe(0)
    expect(timeStringToMinutes('23:55')).toBe(1435)

    expect(minutesToTimeString(480)).toBe('08:00')
    expect(minutesToTimeString(570)).toBe('09:30')
    expect(minutesToTimeString(0)).toBe('00:00')
    expect(minutesToTimeString(1435)).toBe('23:55')
  })

  it('soma 1 hora (60 minutos) ao horário inicial mantendo a previsão padrão de 1 hora', () => {
    expect(somarMinutos('08:00', 60)).toBe('09:00')
    expect(somarMinutos('14:30', 60)).toBe('15:30')
    expect(somarMinutos('23:00', 60)).toBe('00:00')
    expect(somarMinutos('23:45', 75)).toBe('01:00')
  })

  it('calcula diferença em minutos entre dois horários com virada de meia-noite', () => {
    expect(calcularDiferencaMinutos('08:00', '09:00')).toBe(60)
    expect(calcularDiferencaMinutos('08:00', '09:30')).toBe(90)
    expect(calcularDiferencaMinutos('08:15', '09:45')).toBe(90)
    // Virada de meia-noite
    expect(calcularDiferencaMinutos('23:00', '01:00')).toBe(120)
    expect(calcularDiferencaMinutos('23:30', '00:30')).toBe(60)
  })

  it('formata duração amigável em texto legível', () => {
    expect(formatarDuracao(60)).toBe('1h')
    expect(formatarDuracao(90)).toBe('1h 30min')
    expect(formatarDuracao(45)).toBe('45min')
    expect(formatarDuracao(120)).toBe('2h')
    expect(formatarDuracao(135)).toBe('2h 15min')
    expect(formatarDuracao(0)).toBe('0min')
  })

  it('arredonda para múltiplo de 5 mais próximo', () => {
    expect(arredondarParaPasso5(58)).toBe(60)
    expect(arredondarParaPasso5(61)).toBe(60)
    expect(arredondarParaPasso5(63)).toBe(65)
    expect(arredondarParaPasso5(4)).toBe(5)
  })

  it('resiste a entradas nulas, indefinidas ou formatos anômalos sem lançar exceção', () => {
    // timeStringToMinutes
    expect(timeStringToMinutes(null as any)).toBe(0)
    expect(timeStringToMinutes(undefined as any)).toBe(0)
    expect(timeStringToMinutes('')).toBe(0)
    expect(timeStringToMinutes('texto invalido')).toBe(0)
    expect(timeStringToMinutes('2025-05-10 14:45:00')).toBe(14 * 60 + 45)
    expect(timeStringToMinutes(new Date(2025, 4, 10, 8, 30))).toBe(8 * 60 + 30)

    // minutesToTimeString
    expect(minutesToTimeString(NaN)).toBe('00:00')
    expect(minutesToTimeString(null as any)).toBe('00:00')
    expect(minutesToTimeString(undefined as any)).toBe('00:00')

    // somarMinutos
    expect(somarMinutos(null as any, 60)).toBe('01:00')
    expect(somarMinutos('08:00', null as any)).toBe('08:00')
    expect(somarMinutos(undefined as any, undefined as any)).toBe('00:00')

    // calcularDiferencaMinutos
    expect(calcularDiferencaMinutos(null as any, undefined as any)).toBe(0)
    expect(calcularDiferencaMinutos('invalido', '09:00')).toBe(540)

    // formatarDuracao
    expect(formatarDuracao(null)).toBe('0min')
    expect(formatarDuracao(undefined)).toBe('0min')
    expect(formatarDuracao(NaN)).toBe('0min')
    expect(formatarDuracao(-10)).toBe('0min')

    // arredondarParaPasso5
    expect(arredondarParaPasso5(NaN)).toBe(0)
    expect(arredondarParaPasso5(null)).toBe(0)
    expect(arredondarParaPasso5(-5)).toBe(0)
  })
})

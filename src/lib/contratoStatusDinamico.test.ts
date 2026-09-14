import { describe, it, expect } from 'vitest'
import { calcularStatusDinamicoContrato } from './contratoStatusDinamico'
import { ContratoOM } from '@/types/crm'

describe('calcularStatusDinamicoContrato', () => {
  const refDate = new Date('2026-09-14T12:00:00Z')

  it('deve retornar Encerrado se status for Encerrado', () => {
    const contrato: Partial<ContratoOM> = {
      status: 'Encerrado',
      data_vencimento: '2026-10-14T12:00:00Z',
    }
    const res = calcularStatusDinamicoContrato(contrato, refDate)
    expect(res.status).toBe('Encerrado')
    expect(res.badgeLabel).toBe('Encerrado')
    expect(res.badgeColorClass).toContain('bg-gray-100')
  })

  it('deve retornar Encerrado se status_encerramento for encerrado ou motivo_encerramento estiver preenchido', () => {
    const contrato: Partial<ContratoOM> = {
      status: 'Ativo',
      status_encerramento: 'encerrado',
      motivo_encerramento: 'Não renovação',
      data_vencimento: '2026-12-31T12:00:00Z',
    }
    const res = calcularStatusDinamicoContrato(contrato, refDate)
    expect(res.status).toBe('Encerrado')
  })

  it('deve retornar Encerrado se a data de vencimento já expirou (passado)', () => {
    const contrato: Partial<ContratoOM> = {
      status: 'Ativo',
      data_vencimento: '2026-08-01T12:00:00Z',
    }
    const res = calcularStatusDinamicoContrato(contrato, refDate)
    expect(res.status).toBe('Encerrado')
  })

  it('deve retornar Próximo do vencimento se término for em até 60 dias', () => {
    // 30 dias à frente
    const contrato: Partial<ContratoOM> = {
      status: 'Ativo',
      data_vencimento: '2026-10-14T12:00:00Z',
    }
    const res = calcularStatusDinamicoContrato(contrato, refDate)
    expect(res.status).toBe('Próximo do vencimento')
    expect(res.badgeLabel).toBe('Próximo do vencimento')
    expect(res.badgeColorClass).toContain('bg-amber-100')
    expect(res.diasRestantes).toBe(30)
  })

  it('deve retornar Próximo do vencimento no limite de exatamente 60 dias', () => {
    const data60Dias = new Date(refDate.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString()
    const contrato: Partial<ContratoOM> = {
      status: 'Ativo',
      data_vencimento: data60Dias,
    }
    const res = calcularStatusDinamicoContrato(contrato, refDate)
    expect(res.status).toBe('Próximo do vencimento')
  })

  it('deve retornar Ativo com badge verde se faltarem mais de 60 dias', () => {
    // 120 dias à frente
    const contrato: Partial<ContratoOM> = {
      status: 'Ativo',
      data_vencimento: '2027-01-14T12:00:00Z',
    }
    const res = calcularStatusDinamicoContrato(contrato, refDate)
    expect(res.status).toBe('Ativo')
    expect(res.badgeLabel).toBe('Ativo')
    expect(res.badgeColorClass).toContain('bg-emerald-100')
    expect(res.diasRestantes).toBeGreaterThan(60)
  })
})

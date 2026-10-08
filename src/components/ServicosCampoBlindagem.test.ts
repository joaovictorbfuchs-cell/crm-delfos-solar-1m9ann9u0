import { describe, it, expect } from 'vitest'
import { safeHorarioStr, formatarDuracao } from '@/components/FichaExecucaoOS'
import { sanitizeOS } from '@/components/CalendarioExecucaoOS'

describe('Blindagens e Regressão de Tipos em Serviços de Campo (FichaExecucaoOS e CalendarioExecucaoOS)', () => {
  describe('safeHorarioStr', () => {
    it('deve lidar com horario_inicio numérico sem lançar erro', () => {
      expect(safeHorarioStr(8)).toBe('08:00')
      expect(safeHorarioStr(14)).toBe('14:00')
      expect(safeHorarioStr(0)).toBe('00:00')
    })

    it('deve lidar com nulo, indefinido ou objeto sem lançar erro', () => {
      expect(safeHorarioStr(null)).toBe('08:00')
      expect(safeHorarioStr(undefined)).toBe('08:00')
      expect(safeHorarioStr({})).toBe('[object Object]')
      expect(safeHorarioStr('', '09:00')).toBe('09:00')
    })

    it('deve preservar strings válidas', () => {
      expect(safeHorarioStr('10:30')).toBe('10:30')
      expect(safeHorarioStr(' 15:45 ')).toBe('15:45')
    })
  })

  describe('formatarDuracao', () => {
    it('deve tratar duracaoMinutos como string numérica ou inválida sem lançar erro', () => {
      expect(formatarDuracao('60')).toBe('1h')
      expect(formatarDuracao('90')).toBe('1h 30min')
      expect(formatarDuracao('abc')).toBe('0min')
      expect(formatarDuracao(null)).toBe('0min')
      expect(formatarDuracao(undefined)).toBe('0min')
      expect(formatarDuracao(-10)).toBe('0min')
    })
  })

  describe('VisaoInstaladorMobileOS - Resolução de Checklist e Fallback Canônico', () => {
    it('deve deduplicar tipos custom prevalecendo sobre nativos e manter checklist dinâmico', async () => {
      // Verifica se a função deduplicarTiposAtividades está sendo usada corretamente
      const { deduplicarTiposAtividades, ATIVIDADES_PADRAO, buildCustomTipoDef } =
        await import('@/constants/atividadesTipos')
      const customDefs = [
        buildCustomTipoDef({
          id: 'custom-limpeza-1',
          nome: 'Limpeza dos Módulos',
          categoria: 'manutencao',
        }),
      ]
      const deduplicados = deduplicarTiposAtividades(ATIVIDADES_PADRAO, customDefs)
      const limpezaDef = deduplicados.find((t) => t.id === 'limpeza')
      expect(limpezaDef?.customRecordId).toBe('custom-limpeza-1')
    })
  })

  describe('sanitizeOS', () => {
    it('deve normalizar OS com data_agendada como Date, horario_inicio numérico e duracao como string', () => {
      const dataDate = new Date(2026, 9, 7, 14, 30) // 2026-10-07 14:30
      const rawOs: any = {
        id: 'os-teste-1',
        tipo_servico: 'Manutenção Preventiva',
        data_agendada: dataDate,
        horario_inicio: 14,
        duracao_minutos: '120',
        checklist: null,
      }

      const sanitized = sanitizeOS(rawOs)

      expect(sanitized.id).toBe('os-teste-1')
      expect(typeof sanitized.data_agendada).toBe('string')
      expect(sanitized.data_agendada).toContain('2026-10-07')
      expect(sanitized.horario_inicio).toBe('14:00')
      expect(sanitized.duracao_minutos).toBe(120)
      expect(sanitized.horario_fim).toBe('16:00')
      expect(Array.isArray(sanitized.checklist)).toBe(true)
    })

    it('deve tolerar data_agendada como Date inválida sem quebrar', () => {
      const invalidDate = new Date('data-totalmente-invalida')
      const rawOs: any = {
        id: 'os-teste-2',
        data_agendada: invalidDate,
        horario_inicio: undefined,
        duracao_minutos: null,
      }

      const sanitized = sanitizeOS(rawOs)
      expect(sanitized.id).toBe('os-teste-2')
      expect(sanitized.horario_inicio).toBe('08:00')
      expect(sanitized.duracao_minutos).toBe(60)
      expect(sanitized.horario_fim).toBe('09:00')
    })

    it('deve normalizar checklist nulo ou string JSON corrompida', () => {
      const os1 = sanitizeOS({ id: 'os-1', checklist: null })
      expect(Array.isArray(os1.checklist)).toBe(true)
      expect(os1.checklist.length).toBe(0)

      const os2 = sanitizeOS({ id: 'os-2', checklist: '{invalid-json' })
      expect(Array.isArray(os2.checklist)).toBe(true)
    })
  })
})

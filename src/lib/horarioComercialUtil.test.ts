import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

// Avalia o módulo REAL dos pb_hooks (horario_comercial_util.js — CommonJS puro, sem APIs do
// PocketBase) numa VM isolada, provando o mesmo código que roda no backend, independente
// do "type" do package.json.
const codigoHook = readFileSync(
  resolve(process.cwd(), 'pocketbase/hooks/horario_comercial_util.js'),
  'utf8',
)
const modulo = { exports: {} }
vm.runInNewContext(codigoHook, { module: modulo })
const util = modulo.exports as {
  OFFSET_BRASILIA_MS: number
  getBrasiliaParts: (d: Date) => {
    ano: number
    mes: number
    dia: number
    hora: number
    minuto: number
    segundo: number
    diaSemana: number
  }
  eFeriadoNacional: (d: Date) => boolean
  ehDiaUtil: (d: Date) => boolean
  estaNaJanelaComercial: (d: Date) => boolean
  ajustarDataEnvio: (d: Date, modo: 'antecipar' | 'adiar') => Date
}

describe('horarioComercialUtil — janela 08:00–16:30 Brasília (UTC−3 fixo) e feriados nacionais', () => {
  describe('getBrasiliaParts e fuso horário Brasília (UTC−3 fixo)', () => {
    it('getBrasiliaParts converte UTC para o relógio de Brasília', () => {
      const p = util.getBrasiliaParts(new Date('2026-12-14T13:00:00Z'))
      expect(p).toMatchObject({ ano: 2026, mes: 12, dia: 14, hora: 10, minuto: 0, diaSemana: 1 })
      const noite = util.getBrasiliaParts(new Date('2026-12-14T02:00:00Z'))
      expect(noite).toMatchObject({ dia: 13, hora: 23 }) // vira o dia civil em Brasília
    })

    it('identifica corretamente o dia da semana no relógio de Brasília', () => {
      // 2026-12-13 01:00 UTC = 2026-12-12 22:00 BRT (Sábado = 6)
      const sab = util.getBrasiliaParts(new Date('2026-12-13T01:00:00Z'))
      expect(sab.diaSemana).toBe(6)
      expect(sab.dia).toBe(12)

      // 2026-12-13 03:00 UTC = 2026-12-13 00:00 BRT (Domingo = 0)
      const dom = util.getBrasiliaParts(new Date('2026-12-13T03:00:00Z'))
      expect(dom.diaSemana).toBe(0)
      expect(dom.dia).toBe(13)
    })
  })

  describe('eFeriadoNacional e ehDiaUtil', () => {
    it('reconhece feriados nacionais fixos', () => {
      expect(util.eFeriadoNacional(new Date('2026-01-01T12:00:00Z'))).toBe(true) // Confraternização Universal
      expect(util.eFeriadoNacional(new Date('2026-04-21T12:00:00Z'))).toBe(true) // Tiradentes
      expect(util.eFeriadoNacional(new Date('2026-05-01T12:00:00Z'))).toBe(true) // Dia do Trabalho
      expect(util.eFeriadoNacional(new Date('2026-09-07T12:00:00Z'))).toBe(true) // Independência
      expect(util.eFeriadoNacional(new Date('2026-10-12T12:00:00Z'))).toBe(true) // Nossa Senhora Aparecida
      expect(util.eFeriadoNacional(new Date('2026-11-02T12:00:00Z'))).toBe(true) // Finados
      expect(util.eFeriadoNacional(new Date('2026-11-15T12:00:00Z'))).toBe(true) // Proclamação da República
      expect(util.eFeriadoNacional(new Date('2026-12-25T12:00:00Z'))).toBe(true) // Natal
    })

    it('calcula feriados móveis baseados na Páscoa (Páscoa 2026 = 05/04)', () => {
      expect(util.eFeriadoNacional(new Date('2026-02-17T12:00:00Z'))).toBe(true) // Carnaval (Páscoa − 47 dias)
      expect(util.eFeriadoNacional(new Date('2026-04-03T12:00:00Z'))).toBe(true) // Sexta-feira Santa (Páscoa − 2 dias)
      expect(util.eFeriadoNacional(new Date('2026-06-04T12:00:00Z'))).toBe(true) // Corpus Christi (Páscoa + 60 dias)
      expect(util.eFeriadoNacional(new Date('2026-12-14T12:00:00Z'))).toBe(false) // Segunda-feira comum
    })

    it('ehDiaUtil cobre fim de semana e feriados', () => {
      expect(util.ehDiaUtil(new Date('2026-12-12T12:00:00Z'))).toBe(false) // Sábado
      expect(util.ehDiaUtil(new Date('2026-12-13T12:00:00Z'))).toBe(false) // Domingo
      expect(util.ehDiaUtil(new Date('2026-12-14T12:00:00Z'))).toBe(true) // Segunda-feira comum
      expect(util.ehDiaUtil(new Date('2026-12-25T12:00:00Z'))).toBe(false) // Sexta-feira Natal
    })
  })

  describe('ajustarDataEnvio — casos combinados com o usuário', () => {
    it('caso 1: sábado → adiar para segunda-feira na janela comercial', () => {
      // Sábado 12/12/2026 às 10:00 BRT (13:00 UTC) → Segunda 14/12/2026 às 10:00 BRT (13:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-12T13:00:00Z'), 'adiar')
      expect(res.toISOString()).toBe('2026-12-14T13:00:00Z')
    })

    it('caso 2: domingo → adiar para segunda-feira', () => {
      // Domingo 13/12/2026 às 15:00 BRT (18:00 UTC) → Segunda 14/12/2026 às 15:00 BRT (18:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-13T18:00:00Z'), 'adiar')
      expect(res.toISOString()).toBe('2026-12-14T18:00:00Z')
    })

    it('caso 3: sexta-feira feriada 25/12/2026 (Natal) → modo "adiar" pula para segunda 28/12/2026', () => {
      // Sexta-feira feriado 25/12/2026 às 10:00 BRT (13:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-25T13:00:00Z'), 'adiar')
      expect(res.toISOString()).toBe('2026-12-28T13:00:00Z')
    })

    it('caso 4: sexta-feira feriada 25/12/2026 (Natal) → modo "antecipar" (auto leitura) recua para quinta 24/12/2026', () => {
      // Sexta-feira feriado 25/12/2026 às 10:00 BRT (13:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-25T13:00:00Z'), 'antecipar')
      expect(res.toISOString()).toBe('2026-12-24T13:00:00Z')
    })

    it('caso 5: sábado no modo "antecipar" recua para sexta-feira', () => {
      // Sábado 12/12/2026 às 10:00 BRT (13:00 UTC) → Sexta 11/12/2026 às 10:00 BRT (13:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-12T13:00:00Z'), 'antecipar')
      expect(res.toISOString()).toBe('2026-12-11T13:00:00Z')
    })

    it('caso 6: clamp antes da janela (07:30 BRT → 08:00 BRT do mesmo dia)', () => {
      // Terça-feira 22/12/2026 às 07:30 BRT (10:30 UTC) → 08:00 BRT (11:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-22T10:30:00Z'), 'adiar')
      expect(res.toISOString()).toBe('2026-12-22T11:00:00Z')
    })

    it('caso 7: clamp após a janela (19:45 BRT → 18:00 BRT do mesmo dia)', () => {
      // Terça-feira 22/12/2026 às 19:45 BRT (22:45 UTC) → 18:00 BRT (21:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-22T22:45:00Z'), 'adiar')
      expect(res.toISOString()).toBe('2026-12-22T21:00:00Z')
    })

    it('caso 8: dia útil dentro da janela comercial (08:00–18:00 BRT) sai inalterado', () => {
      // Terça-feira 22/12/2026 às 11:00 BRT (14:00 UTC)
      const envioAdiar = util.ajustarDataEnvio(new Date('2026-12-22T14:00:00Z'), 'adiar')
      expect(envioAdiar.toISOString()).toBe('2026-12-22T14:00:00Z')

      const envioAntecipar = util.ajustarDataEnvio(new Date('2026-12-22T14:00:00Z'), 'antecipar')
      expect(envioAntecipar.toISOString()).toBe('2026-12-22T14:00:00Z')

      // 17:30 BRT (20:30 UTC) está dentro da janela (08:00–18:00 BRT)
      const envioFimTarde = util.ajustarDataEnvio(new Date('2026-12-22T20:30:00Z'), 'adiar')
      expect(envioFimTarde.toISOString()).toBe('2026-12-22T20:30:00Z')
    })

    it('combinação: sábado às 19:00 BRT modo adiar → segunda-feira às 18:00 BRT', () => {
      // Sábado 12/12/2026 19:00 BRT (22:00 UTC) → Segunda 14/12/2026 18:00 BRT (21:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-12T22:00:00Z'), 'adiar')
      expect(res.toISOString()).toBe('2026-12-14T21:00:00Z')
    })

    it('combinação: domingo às 06:00 BRT modo adiar → segunda-feira às 08:00 BRT', () => {
      // Domingo 13/12/2026 06:00 BRT (09:00 UTC) → Segunda 14/12/2026 08:00 BRT (11:00 UTC)
      const res = util.ajustarDataEnvio(new Date('2026-12-13T09:00:00Z'), 'adiar')
      expect(res.toISOString()).toBe('2026-12-14T11:00:00Z')
    })
  })

  describe('estaNaJanelaComercial — guarda de worker da fila agendada', () => {
    it('bloqueia envio em finais de semana, feriados e fora do horário 08:00–18:00 BRT', () => {
      expect(util.estaNaJanelaComercial(new Date('2026-12-12T13:00:00Z'))).toBe(false) // sábado
      expect(util.estaNaJanelaComercial(new Date('2026-12-13T13:00:00Z'))).toBe(false) // domingo
      expect(util.estaNaJanelaComercial(new Date('2026-12-25T13:00:00Z'))).toBe(false) // feriado Natal
      expect(util.estaNaJanelaComercial(new Date('2026-12-14T10:00:00Z'))).toBe(false) // seg 07:00 BRT (antes)
      expect(util.estaNaJanelaComercial(new Date('2026-12-14T21:01:00Z'))).toBe(false) // seg 18:01 BRT (depois)
    })

    it('permite envio dentro da janela comercial em dia útil (incluindo limites 08:00 e 18:00 BRT)', () => {
      expect(util.estaNaJanelaComercial(new Date('2026-12-14T11:00:00Z'))).toBe(true) // seg 08:00 BRT (início)
      expect(util.estaNaJanelaComercial(new Date('2026-12-14T13:00:00Z'))).toBe(true) // seg 10:00 BRT
      expect(util.estaNaJanelaComercial(new Date('2026-12-14T15:30:00Z'))).toBe(true) // seg 12:30 BRT
      expect(util.estaNaJanelaComercial(new Date('2026-12-14T20:00:00Z'))).toBe(true) // seg 17:00 BRT
      expect(util.estaNaJanelaComercial(new Date('2026-12-14T21:00:00Z'))).toBe(true) // seg 18:00 BRT (limite exato)
    })
  })
})

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
  ajustarDataEnvio: (d: Date, modo: string) => Date
}

describe('horario_comercial_util — janela 08:00–16:30 Brasília (UTC−3 fixo)', () => {
  it('getBrasiliaParts converte UTC para o relógio de Brasília', () => {
    const p = util.getBrasiliaParts(new Date('2026-12-14T13:00:00Z'))
    expect(p).toMatchObject({ ano: 2026, mes: 12, dia: 14, hora: 10, minuto: 0, diaSemana: 1 })
    const noite = util.getBrasiliaParts(new Date('2026-12-14T02:00:00Z'))
    expect(noite).toMatchObject({ dia: 13, hora: 23 }) // vira o dia civil em Brasília
  })

  it('feriados fixos e móveis (Páscoa 2026 = 05/04)', () => {
    expect(util.eFeriadoNacional(new Date('2026-01-01T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-04-21T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-05-01T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-09-07T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-10-12T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-11-02T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-11-15T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-12-25T12:00:00Z'))).toBe(true)
    expect(util.eFeriadoNacional(new Date('2026-02-17T12:00:00Z'))).toBe(true) // Carnaval (Páscoa−47)
    expect(util.eFeriadoNacional(new Date('2026-04-03T12:00:00Z'))).toBe(true) // Sexta-feira Santa (Páscoa−2)
    expect(util.eFeriadoNacional(new Date('2026-06-04T12:00:00Z'))).toBe(true) // Corpus Christi (Páscoa+60)
    expect(util.eFeriadoNacional(new Date('2026-12-14T12:00:00Z'))).toBe(false)
  })

  it('fluxo: sábado → agendado segunda na janela', () => {
    // sáb 12/12/2026 10:00 BRT
    expect(util.ajustarDataEnvio(new Date('2026-12-12T13:00:00Z'), 'adiar').toISOString()).toBe(
      '2026-12-14T13:00:00Z',
    )
  })

  it('fluxo: domingo → segunda', () => {
    // dom 13/12/2026 15:00 BRT
    expect(util.ajustarDataEnvio(new Date('2026-12-13T18:00:00Z'), 'adiar').toISOString()).toBe(
      '2026-12-14T18:00:00Z',
    )
  })

  it('fluxo: sexta feriada 25/12/2026 → adiar para segunda 28/12', () => {
    // sex feriado 25/12/2026 10:00 BRT
    expect(util.ajustarDataEnvio(new Date('2026-12-25T13:00:00Z'), 'adiar').toISOString()).toBe(
      '2026-12-28T13:00:00Z',
    )
  })

  it('leitura: sexta feriada 25/12/2026 → antecipa para quinta 24/12', () => {
    expect(util.ajustarDataEnvio(new Date('2026-12-25T13:00:00Z'), 'antecipar').toISOString()).toBe(
      '2026-12-24T13:00:00Z',
    )
  })

  it('leitura: sábado → antecipa para sexta', () => {
    // sáb 12/12/2026 10:00 BRT → sexta 11/12 10:00 BRT
    expect(util.ajustarDataEnvio(new Date('2026-12-12T13:00:00Z'), 'antecipar').toISOString()).toBe(
      '2026-12-11T13:00:00Z',
    )
  })

  it('clamp: 07:30 → 08:00 do mesmo dia', () => {
    // ter 22/12/2026 07:30 BRT
    expect(util.ajustarDataEnvio(new Date('2026-12-22T10:30:00Z'), 'adiar').toISOString()).toBe(
      '2026-12-22T11:00:00Z',
    )
  })

  it('clamp: 17:45 → 16:30 do mesmo dia', () => {
    // ter 22/12/2026 17:45 BRT
    expect(util.ajustarDataEnvio(new Date('2026-12-22T20:45:00Z'), 'adiar').toISOString()).toBe(
      '2026-12-22T19:30:00Z',
    )
  })

  it('dia útil dentro da janela sai inalterado', () => {
    // ter 22/12/2026 11:00 BRT
    expect(util.ajustarDataEnvio(new Date('2026-12-22T14:00:00Z'), 'adiar').toISOString()).toBe(
      '2026-12-22T14:00:00Z',
    )
    expect(util.ajustarDataEnvio(new Date('2026-12-22T14:00:00Z'), 'antecipar').toISOString()).toBe(
      '2026-12-22T14:00:00Z',
    )
  })

  it('worker: fila não envia em fim de semana/feriado/fora da janela e envia na segunda', () => {
    expect(util.estaNaJanelaComercial(new Date('2026-12-12T13:00:00Z'))).toBe(false) // sábado
    expect(util.estaNaJanelaComercial(new Date('2026-12-13T13:00:00Z'))).toBe(false) // domingo
    expect(util.estaNaJanelaComercial(new Date('2026-12-25T13:00:00Z'))).toBe(false) // feriado
    expect(util.estaNaJanelaComercial(new Date('2026-12-14T10:00:00Z'))).toBe(false) // seg 07:00 BRT
    expect(util.estaNaJanelaComercial(new Date('2026-12-14T20:00:00Z'))).toBe(false) // seg 17:00 BRT
    expect(util.estaNaJanelaComercial(new Date('2026-12-14T13:00:00Z'))).toBe(true) // seg 10:00 BRT
    expect(util.estaNaJanelaComercial(new Date('2026-12-14T19:30:00Z'))).toBe(true) // seg 16:30 BRT (limite)
  })

  it('ehDiaUtil cobre fim de semana e feriado', () => {
    expect(util.ehDiaUtil(new Date('2026-12-12T12:00:00Z'))).toBe(false)
    expect(util.ehDiaUtil(new Date('2026-12-14T12:00:00Z'))).toBe(true)
    expect(util.ehDiaUtil(new Date('2026-12-25T12:00:00Z'))).toBe(false)
  })
})

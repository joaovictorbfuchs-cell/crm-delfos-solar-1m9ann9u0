import { describe, it, expect } from 'vitest'
import { calcularLayoutCamadas } from '@/lib/calendarioLayoutCamadas'

describe('calcularLayoutCamadas - Google Calendar Overlap Algorithm', () => {
  it('evento isolado tem 100% de largura e left 0%', () => {
    const item1 = { top: 100, height: 60 }
    const layout = calcularLayoutCamadas([item1])

    const res = layout.get(item1)
    expect(res).toBeDefined()
    expect(res?.leftPct).toBe(0)
    expect(res?.widthPct).toBe(100)
    expect(res?.zIndex).toBe(10)
  })

  it('caso real do usuário: base 08:00–16:00 e sobreposto 11:00–12:00 (Paulo Ricardo vs System)', () => {
    // 08:00 = 8 * 48 = 384 top, duracao 8h = 48 * 8 = 384 height
    // 11:00 = 11 * 48 = 528 top, duracao 1h = 48 height
    const base = { top: 384, height: 384, id: 'system_08_16' }
    const sobreposto = { top: 528, height: 48, id: 'paulo_11_12' }

    const layout = calcularLayoutCamadas([base, sobreposto])

    const resBase = layout.get(base)
    const resSobreposto = layout.get(sobreposto)

    // Base deve ter largura cheia (100%) e left 0
    expect(resBase?.leftPct).toBe(0)
    expect(resBase?.widthPct).toBe(100)

    // Sobreposto deve estar recuado à direita (left = 8%) e mais estreito (width = 92%)
    expect(resSobreposto?.leftPct).toBe(8)
    expect(resSobreposto?.widthPct).toBe(92)

    // Sobreposto deve ter zIndex maior que a base para renderizar por cima
    expect((resSobreposto?.zIndex ?? 0) > (resBase?.zIndex ?? 0)).toBe(true)
  })

  it('dois eventos com o MESMO horário de início (caso Reunião + Seguro 13:15–14:00) dividem a camada lado a lado', () => {
    // 13:15 = top 636, height 36
    const ev1 = { top: 636, height: 36, id: 'reuniao' }
    const ev2 = { top: 636, height: 36, id: 'seguro' }

    const layout = calcularLayoutCamadas([ev1, ev2])

    const res1 = layout.get(ev1)
    const res2 = layout.get(ev2)

    // Ambos começam no mesmo top (tier 0): dividem 100% em 50% cada
    expect(res1?.leftPct).toBe(0)
    expect(res1?.widthPct).toBe(50)

    expect(res2?.leftPct).toBe(50)
    expect(res2?.widthPct).toBe(50)
  })

  it('base com evento sobreposto duplo no mesmo horário subsequente', () => {
    // Base 08:00–16:00
    // Dois eventos sobrepostos às 13:15–14:00
    const base = { top: 384, height: 384, id: 'base' }
    const sub1 = { top: 636, height: 36, id: 'reuniao' }
    const sub2 = { top: 636, height: 36, id: 'seguro' }

    const layout = calcularLayoutCamadas([base, sub1, sub2])

    const resBase = layout.get(base)
    const res1 = layout.get(sub1)
    const res2 = layout.get(sub2)

    // Base mantém 100%
    expect(resBase?.leftPct).toBe(0)
    expect(resBase?.widthPct).toBe(100)

    // A camada sobreposta começa com left = 8% e largura disponível = 92%
    // Dividida em 2: cada um tem 46% de largura
    expect(res1?.leftPct).toBe(8)
    expect(res1?.widthPct).toBe(46)

    expect(res2?.leftPct).toBe(8 + 46)
    expect(res2?.widthPct).toBe(46)

    // Ambos sobrepostos têm zIndex maior que a base
    expect((res1?.zIndex ?? 0) > (resBase?.zIndex ?? 0)).toBe(true)
    expect((res2?.zIndex ?? 0) > (resBase?.zIndex ?? 0)).toBe(true)
  })

  it('eventos que apenas se tocam no fim NÃO são sobrepostos (ex.: 08:00–12:00 e 12:00–13:00)', () => {
    // 08:00 top 384, duracao 4h = height 192 (end = 576)
    // 12:00 top 576, duracao 1h = height 48
    const ev1 = { top: 384, height: 192, id: 'manha' }
    const ev2 = { top: 576, height: 48, id: 'tarde' }

    const layout = calcularLayoutCamadas([ev1, ev2])

    const res1 = layout.get(ev1)
    const res2 = layout.get(ev2)

    // Nenhum dos dois deve ser reduzido ou deslocado, pois não há overlap
    expect(res1?.leftPct).toBe(0)
    expect(res1?.widthPct).toBe(100)

    expect(res2?.leftPct).toBe(0)
    expect(res2?.widthPct).toBe(100)
  })

  it('múltiplas camadas em escadinha (3 sobreposições sucessivas)', () => {
    // ev1: 08:00–16:00
    // ev2: 10:00–12:00
    // ev3: 11:00–12:00
    const ev1 = { top: 384, height: 384, id: 'ev1' }
    const ev2 = { top: 480, height: 96, id: 'ev2' }
    const ev3 = { top: 528, height: 48, id: 'ev3' }

    const layout = calcularLayoutCamadas([ev1, ev2, ev3])

    const res1 = layout.get(ev1)
    const res2 = layout.get(ev2)
    const res3 = layout.get(ev3)

    // Tier 0 (base): left 0%, width 100%
    expect(res1?.leftPct).toBe(0)
    expect(res1?.widthPct).toBe(100)

    // Tier 1: left 8%, width 92%
    expect(res2?.leftPct).toBe(8)
    expect(res2?.widthPct).toBe(92)

    // Tier 2: left 16%, width 84%
    expect(res3?.leftPct).toBe(16)
    expect(res3?.widthPct).toBe(84)

    // zIndex em ordem estrita
    expect((res1?.zIndex ?? 0) < (res2?.zIndex ?? 0)).toBe(true)
    expect((res2?.zIndex ?? 0) < (res3?.zIndex ?? 0)).toBe(true)
  })

  it('garante respeito à largura mínima configurada quando há muitas camadas', () => {
    // 10 eventos em cascata
    const eventos = Array.from({ length: 10 }, (_, i) => ({
      top: 100 + i * 20,
      height: 200,
      id: `ev_${i}`,
    }))

    const layout = calcularLayoutCamadas(eventos, { incrementoPct: 8, minWidthPct: 35 })

    for (const ev of eventos) {
      const res = layout.get(ev)
      expect(res).toBeDefined()
      expect(res!.widthPct).toBeGreaterThanOrEqual(35)
      expect(res!.leftPct + res!.widthPct).toBeLessThanOrEqual(100.001)
    }
  })
})

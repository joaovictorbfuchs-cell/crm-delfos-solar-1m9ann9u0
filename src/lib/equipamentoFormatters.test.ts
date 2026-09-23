import { describe, it, expect } from 'vitest'
import {
  descricaoContemPotencia,
  deduplicarPotenciaTexto,
  formatarTextoModuloCard,
  formatarTextoModuloDocx,
} from './equipamentoFormatters'

describe('equipamentoFormatters', () => {
  it('(a) lida com descrição duplicada "Canadian Solar 550W BiHiKu7 550W" com 550W resultando em exatamente 1 ocorrência de "550W"', () => {
    const descricao = 'Canadian Solar 550W BiHiKu7 550W'
    const potenciaWp = 550
    const caracteristicas = 'bifacial N-type'

    expect(descricaoContemPotencia(descricao, potenciaWp)).toBe(true)

    const dedup = deduplicarPotenciaTexto(descricao, potenciaWp)
    expect(dedup).toBe('Canadian Solar 550W BiHiKu7')

    const resultadoCard = formatarTextoModuloCard({
      descricao,
      potenciaWp,
      caracteristicas,
    })

    expect(resultadoCard).toBe('Canadian Solar 550W BiHiKu7 (bifacial N-type).')

    // Deve conter EXATAMENTE 1 ocorrência de 550W
    const matches = resultadoCard.match(/550W/gi)
    expect(matches).not.toBeNull()
    expect(matches?.length).toBe(1)

    // Testa também a versão DOCX
    const resultadoDocx = formatarTextoModuloDocx({
      quantidade: 13,
      descricao,
      potenciaWp,
      caracteristicas,
    })
    expect(resultadoDocx).toBe('13x Canadian Solar 550W BiHiKu7 (bifacial N-type)')
    const matchesDocx = resultadoDocx.match(/550W/gi)
    expect(matchesDocx?.length).toBe(1)
  })

  it('(b) descrição sem potência inclui "(550W cada • bifacial N-type)"', () => {
    const descricao = 'Canadian Solar BiHiKu7'
    const potenciaWp = 550
    const caracteristicas = 'bifacial N-type'

    expect(descricaoContemPotencia(descricao, potenciaWp)).toBe(false)

    const resultadoCard = formatarTextoModuloCard({
      descricao,
      potenciaWp,
      caracteristicas,
    })

    expect(resultadoCard).toBe('Canadian Solar BiHiKu7 (550W cada • bifacial N-type).')

    const resultadoDocx = formatarTextoModuloDocx({
      quantidade: 14,
      descricao,
      potenciaWp,
      caracteristicas,
    })
    expect(resultadoDocx).toBe('14x Canadian Solar BiHiKu7 (550W cada • bifacial N-type)')
  })

  it('(c) reconhece variações como "550Wp" e "550 W" na detecção e deduplicação', () => {
    // Variação 550Wp
    const descWp = 'Módulo Fotovoltaico 550Wp Canadian 550Wp'
    expect(descricaoContemPotencia(descWp, 550)).toBe(true)
    expect(deduplicarPotenciaTexto(descWp, 550)).toBe('Módulo Fotovoltaico 550Wp Canadian')

    const cardWp = formatarTextoModuloCard({
      descricao: 'Módulo Fotovoltaico 550Wp Canadian',
      potenciaWp: 550,
      caracteristicas: 'monocristalino',
    })
    expect(cardWp).toBe('Módulo Fotovoltaico 550Wp Canadian (monocristalino).')

    // Variação 550 W
    const descEspaco = 'Canadian Solar 550 W BiHiKu7 550W'
    expect(descricaoContemPotencia(descEspaco, 550)).toBe(true)
    expect(deduplicarPotenciaTexto(descEspaco, 550)).toBe('Canadian Solar 550 W BiHiKu7')

    // Fallbacks
    const cardFallback = formatarTextoModuloCard({
      descricao: '',
      potenciaWp: 610,
    })
    expect(cardFallback).toBe('Módulos Tier-1 (610W cada • bifacial N-type).')
  })
})

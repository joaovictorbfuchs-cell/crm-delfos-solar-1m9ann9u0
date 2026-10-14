import { describe, expect, it } from 'vitest'
import { injetarPaginacaoA4 } from './propostaPaginacaoA4'

describe('injetarPaginacaoA4', () => {
  const html =
    '<!doctype html><html><head></head><body><div class="proposta-container"><section class="proposta-secao-page" id="secao-1-capa"><div class="secao-body"><div class="capa-wrapper"><div class="capa-bottom-site-email"></div></div></div></section></div></body></html>'

  it('injeta o estilo e o script de paginação uma única vez', () => {
    const once = injetarPaginacaoA4(html)
    const twice = injetarPaginacaoA4(once)
    expect(once).toContain('data-proposta-paginacao-a4')
    expect(once.match(/data-proposta-paginacao-a4/g)?.length).toBe(2)
    expect(twice).toBe(once)
  })

  it('preserva o HTML original e injeta antes do fechamento do documento', () => {
    const result = injetarPaginacaoA4(html)
    expect(result).toContain('id="secao-1-capa"')
    expect(result.lastIndexOf('data-proposta-paginacao-a4')).toBeLessThan(
      result.lastIndexOf('</body>'),
    )
  })
})

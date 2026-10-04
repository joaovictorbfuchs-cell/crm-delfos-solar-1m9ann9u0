import { describe, it, expect } from 'vitest'
import { HighlightMatch } from './BarraBuscaGlobal'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

describe('BarraBuscaGlobal - HighlightMatch', () => {
  it('deve renderizar texto sem alteração quando a query for vazia', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, { text: 'Carlos Alberto Lima', query: '' }),
    )
    expect(html).toContain('Carlos Alberto Lima')
    expect(html).not.toContain('<mark')
  })

  it('deve envolver o trecho pesquisado em tag mark com destaque em verde/esmeralda', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, { text: 'Carlos Alberto Lima', query: 'alberto' }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Alberto</mark>',
    )
    expect(html).toContain('Carlos')
    expect(html).toContain('Lima')
  })

  it('deve ser case-insensitive ao destacar', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, { text: 'Passo Fundo/RS', query: 'PASSO' }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Passo</mark>',
    )
    expect(html).toContain('Fundo/RS')
  })

  it('deve destacar múltiplos tokens separadamente (ex: "mauro se" em "Mauro Antônio Serraglio")', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Mauro Antônio Serraglio',
        query: 'mauro se',
      }),
    )
    // "Mauro" e "Se" devem estar destacados individualmente
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Mauro</mark>',
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Se</mark>',
    )
    expect(html).toContain('Antônio')
    expect(html).toContain('rraglio')
  })

  it('preserva destaque contíguo com acentuação compatível', () => {
    const html = renderToStaticMarkup(
      React.createElement(HighlightMatch, {
        text: 'Mauro Antônio Serraglio',
        query: 'Mauro Antônio',
      }),
    )
    expect(html).toContain(
      '<mark class="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">Mauro Antônio</mark>',
    )
  })

  it('formata badge Encontrado via contato corretamente', () => {
    const contatoNome = 'Rodrigo Becker'
    const badge = `Encontrado via contato: ${contatoNome}`
    expect(badge).toBe('Encontrado via contato: Rodrigo Becker')
  })
})

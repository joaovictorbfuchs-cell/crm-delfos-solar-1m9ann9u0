import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { PainelEdicaoConteudoProposta } from './PainelEdicaoConteudoProposta'
import { getConteudoPropostaDefaults } from '@/lib/conteudoProposta'

describe('PainelEdicaoConteudoProposta', () => {
  it('renderiza o painel com as seções principais da proposta', () => {
    const conteudoInicial = getConteudoPropostaDefaults()
    const html = renderToStaticMarkup(
      React.createElement(PainelEdicaoConteudoProposta, {
        conteudo: conteudoInicial,
        onChange: () => {},
      }),
    )

    expect(html).toContain('Personalização do Conteúdo da Proposta')
    expect(html).toContain('100% Editável')
    expect(html).toContain('Capa da Proposta')
    expect(html).toContain('1. Apresentação da Empresa (Institucional)')
    expect(html).toContain('2. Situação Atual')
    expect(html).toContain('3. Seu Sistema Fotovoltaico &amp; Engenharia')
    expect(html).toContain('4. Projeção de Economia em 25 Anos')
    expect(html).toContain('5. Investimento e Condições de Pagamento')
  })

  it('renderiza os botões e componentes de restauração', () => {
    const conteudoInicial = getConteudoPropostaDefaults()
    const html = renderToStaticMarkup(
      React.createElement(PainelEdicaoConteudoProposta, {
        conteudo: conteudoInicial,
        onChange: () => {},
      }),
    )

    expect(html).toContain('Restaurar Padrões')
    expect(html).toContain('Exibido')
  })
})

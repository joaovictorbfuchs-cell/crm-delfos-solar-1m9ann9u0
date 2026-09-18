import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { SecaoSeuSistemaFotovoltaico } from './SecaoSeuSistemaFotovoltaico'
import type { GeracaoMensalItem } from '@/lib/energiaSolar'

describe('SecaoSeuSistemaFotovoltaico - Geração Mensal Detalhada', () => {
  const dadosGeracaoExemplo: GeracaoMensalItem[] = [
    {
      mesIndex: 1,
      mesNome: 'Jan',
      dias: 31,
      geracaoKwh: 1695,
      fatorSazonal: 1.29,
      irradiacaoHSP: 5.65,
    },
    {
      mesIndex: 2,
      mesNome: 'Fev',
      dias: 28,
      geracaoKwh: 1450,
      fatorSazonal: 1.1,
      irradiacaoHSP: 5.35,
    },
    {
      mesIndex: 3,
      mesNome: 'Mar',
      dias: 31,
      geracaoKwh: 1380,
      fatorSazonal: 1.05,
      irradiacaoHSP: 4.8,
    },
    {
      mesIndex: 4,
      mesNome: 'Abr',
      dias: 30,
      geracaoKwh: 1120,
      fatorSazonal: 0.85,
      irradiacaoHSP: 3.9,
    },
    {
      mesIndex: 5,
      mesNome: 'Mai',
      dias: 31,
      geracaoKwh: 920,
      fatorSazonal: 0.7,
      irradiacaoHSP: 3.2,
    },
    {
      mesIndex: 6,
      mesNome: 'Jun',
      dias: 30,
      geracaoKwh: 810,
      fatorSazonal: 0.61,
      irradiacaoHSP: 2.85,
    },
    {
      mesIndex: 7,
      mesNome: 'Jul',
      dias: 31,
      geracaoKwh: 890,
      fatorSazonal: 0.68,
      irradiacaoHSP: 3.1,
    },
    {
      mesIndex: 8,
      mesNome: 'Ago',
      dias: 31,
      geracaoKwh: 1090,
      fatorSazonal: 0.83,
      irradiacaoHSP: 3.8,
    },
    {
      mesIndex: 9,
      mesNome: 'Set',
      dias: 30,
      geracaoKwh: 1190,
      fatorSazonal: 0.9,
      irradiacaoHSP: 4.15,
    },
    {
      mesIndex: 10,
      mesNome: 'Out',
      dias: 31,
      geracaoKwh: 1420,
      fatorSazonal: 1.08,
      irradiacaoHSP: 4.95,
    },
    {
      mesIndex: 11,
      mesNome: 'Nov',
      dias: 30,
      geracaoKwh: 1580,
      fatorSazonal: 1.2,
      irradiacaoHSP: 5.5,
    },
    {
      mesIndex: 12,
      mesNome: 'Dez',
      dias: 31,
      geracaoKwh: 1755,
      fatorSazonal: 1.33,
      irradiacaoHSP: 5.85,
    },
  ]

  it('renderiza a tabela de geração mensal detalhada com os 12 meses quando geracaoMensalDetalhada for informada', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 12.5,
        geracaoMensalDetalhada: dadosGeracaoExemplo,
        geracaoAnualKwh: 15808,
      }),
    )

    // Cabeçalho da seção
    expect(html).toContain('Geração Mensal Detalhada (Janeiro a Dezembro — Erechim/RS)')
    expect(html).toContain(
      'Sazonalidade solar calculada com base na irradiação HSP média diária de Erechim/RS',
    )

    // Presença de meses e dados
    expect(html).toContain('Jan')
    expect(html).toContain('Fev')
    expect(html).toContain('Dez')
    expect(html).toContain('1.695')
    expect(html).toContain('1.450')
    expect(html).toContain('1.755')
    expect(html).toContain('5.65')
    expect(html).toContain('5.85')

    // Totais e destaques
    expect(html).toContain('15.808')
    expect(html).toContain('Totais Anuais')
    expect(html).toContain('Pico')
  })

  it('omite a tabela de geração mensal quando geracaoMensalDetalhada for vazio ou nulo (fallback)', () => {
    const htmlNulo = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 12.5,
        geracaoMensalDetalhada: null,
      }),
    )
    expect(htmlNulo).not.toContain('Geração Mensal Detalhada (Janeiro a Dezembro — Erechim/RS)')

    const htmlVazio = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 12.5,
        geracaoMensalDetalhada: [],
      }),
    )
    expect(htmlVazio).not.toContain('Geração Mensal Detalhada (Janeiro a Dezembro — Erechim/RS)')
  })
})

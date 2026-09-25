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

  it('renderiza o gráfico de geração mensal previsto com os 12 meses quando geracaoMensalDetalhada for informada', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 12.5,
        geracaoMensalDetalhada: dadosGeracaoExemplo,
        geracaoAnualKwh: 15808,
      }),
    )

    // Cabeçalho da seção
    expect(html).toContain('Geração Mensal Prevista (Janeiro a Dezembro — Erechim/RS)')
    expect(html).toContain('Produção estimada de energia mês a mês em kWh')

    // Presença de meses e dados nas barras
    expect(html).toContain('Jan')
    expect(html).toContain('Fev')
    expect(html).toContain('Dez')
    expect(html).toContain('1.695')
    expect(html).toContain('1.450')
    expect(html).toContain('1.755')

    // Colunas de HSP e fator sazonal NÃO devem aparecer
    expect(html).not.toContain('5.65')
    expect(html).not.toContain('5.85')
    expect(html).not.toContain('Irradiação (HSP)')
    expect(html).not.toContain('Fator Sazonal')

    // Totais e destaques
    expect(html).toContain('Total anual:')
    expect(html).toContain('15.808 kWh')
    expect(html).toContain('Média mensal:')
    expect(html).toContain('1.317 kWh')
    expect(html).toContain('Pico')
  })

  it('omite a seção de geração mensal quando geracaoMensalDetalhada for vazio ou nulo (fallback)', () => {
    const htmlNulo = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 12.5,
        geracaoMensalDetalhada: null,
      }),
    )
    expect(htmlNulo).not.toContain('Geração Mensal Prevista')

    const htmlVazio = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 12.5,
        geracaoMensalDetalhada: [],
      }),
    )
    expect(htmlVazio).not.toContain('Geração Mensal Prevista')
  })

  it('exibe fotos de módulo FV e inversor quando fornecidas', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 10.5,
        marcaPainel: 'Canadian Solar 550W',
        fotoModuloUrl: 'https://example.com/modulo.jpg',
        marcaInversor: 'Growatt 10kW',
        fotoInversorUrl: 'https://example.com/inversor.jpg',
      }),
    )
    expect(html).toContain('src="https://example.com/modulo.jpg"')
    expect(html).toContain('src="https://example.com/inversor.jpg"')
  })

  it('renderiza os 6 cards técnicos com título ao lado do ícone, badges e garantias ajustadas', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        potenciaKwp: 3.75,
        geracaoMensalKwh: 417,
        economiaMensal: 457.28,
        numeroPlacas: 6,
        marcaPainel: 'LUXEN 625W BIFACIAL N-TYPE',
        potenciaPlacaWp: 625,
        tecnologiaModulo: 'bifacial N-type',
        marcaInversor: 'TSUNESS 2.5 kW MONOFÁSICO 220 V MICRO TSOL-MX2500D',
        quantidadeInversores: 1,
        tipoEstrutura: 'ceramico',
        areaNecessariaM2: 14.0,
        garantiaModulosAnos: 30,
        garantiaModulosFabricacaoAnos: 15,
        garantiaInversorAnos: 10,
        garantiaInstalacaoTexto: '12 meses',
      }),
    )

    // 1. Títulos e alinhamento
    expect(html).toContain('Potência do sistema')
    expect(html).toContain('Geração estimada')
    expect(html).toContain('Módulos Fotovoltaicos')
    expect(html).toContain('Inversor Solar')
    expect(html).toContain('Área necessária')
    expect(html).toContain('Garantia Instalação')

    // 2. Card Inversor Solar tem mesmo estilo/tamanho do card de módulos (1 unidade)
    expect(html).toContain(
      '1</span> <span class="text-base font-bold text-gray-600">unidade</span>',
    )
    expect(html).toContain('TSUNESS 2.5 kW MONOFÁSICO 220 V MICRO TSOL-MX2500D')

    // 3. Linha MPPT / Potência homologada removida do card do inversor
    expect(html).not.toContain('MPPT • Potência:')
    expect(html).not.toContain('homologado')

    // 4. Card Área Necessária exibe o tipo de estrutura de fixação selecionado
    expect(html).toContain('Cerâmico')

    // 4b. Testar outros tipos de estrutura selecionados na aba Dados Técnicos & Sistema
    const htmlSolo = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        tipoEstrutura: 'solo',
      }),
    )
    expect(htmlSolo).toContain('Solo')

    const htmlMetalico = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        tipoEstrutura: 'metalico',
      }),
    )
    expect(htmlMetalico).toContain('Metálico')

    const htmlFibro = renderToStaticMarkup(
      React.createElement(SecaoSeuSistemaFotovoltaico, {
        tipoEstrutura: 'fibrocimento',
      }),
    )
    expect(htmlFibro).toContain('Fibrocimento')

    // 5. Card Garantia Instalação NÃO contém "Garantia integral sobre mão de obra, cabos e ART."
    expect(html).not.toContain('Garantia integral sobre mão de obra, cabos e ART.')

    // 6. Garantias dos módulos: fabricação primeiro e sem "(degradação)"
    const posFabricacao = html.indexOf('Garantia contra defeitos de fabricação:')
    const posPerformance = html.indexOf('Garantia de performance:')
    expect(posFabricacao).toBeGreaterThan(-1)
    expect(posPerformance).toBeGreaterThan(-1)
    expect(posFabricacao).toBeLessThan(posPerformance)
    expect(html).not.toContain('(degradação)')

    // 7. Não deve conter a antiga faixa verde isolada de monitoramento
    expect(html).not.toContain('Monitoramento incluso')
    expect(html).not.toContain('Aplicativo Mobile')
    expect(html).not.toContain('Acompanhe sua produção em tempo real pelo celular')
    // Mantém os 2 blocos de baixo
    expect(html).toContain('Como funciona o sistema solar (On-Grid)')
    expect(html).toContain('Monitoramento')
  })
})

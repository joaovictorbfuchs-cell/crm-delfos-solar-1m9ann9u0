import { describe, it, expect } from 'vitest'
import { calcularProjecaoEconomia } from './calculoProjecaoEconomia'
import {
  TABELA_REFERENCIA_BASE,
  FATORES_SIMULTANEIDADE,
  CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
  TAXA_REAJUSTE_PADRAO_AA,
} from '@/data/planilhaBaseProjecao'
import { extrairLinhasTarifarias, normalizarNumero } from './planilhaTarifariaParser'
import type { ProjecaoTarifariaRecord } from '@/services/projecaoTarifariaService'

describe('Cálculo da Projeção de Economia na Conta de Energia (2026-2051)', () => {
  it('deve conter exatamente 26 anos na tabela de referência de fallback (2026 a 2051)', () => {
    expect(TABELA_REFERENCIA_BASE).toHaveLength(26)
    expect(TABELA_REFERENCIA_BASE[0].ano).toBe(2026)
    expect(TABELA_REFERENCIA_BASE[25].ano).toBe(2051)
  })

  it('deve aplicar taxa de reajuste de 9% a.a. no fallback', () => {
    expect(TAXA_REAJUSTE_PADRAO_AA).toBe(0.09)
    // Tarifa ano 2027 deve ser ~9% maior que 2026
    const t2026 = TABELA_REFERENCIA_BASE[0].tarifaBase
    const t2027 = TABELA_REFERENCIA_BASE[1].tarifaBase
    const razao = t2027 / t2026
    expect(Math.abs(razao - 1.09)).toBeLessThan(0.005)
  })

  it('deve aplicar os fatores de simultaneidade corretos: Residencial (30%) e Comercial (70%)', () => {
    expect(FATORES_SIMULTANEIDADE.residencial).toBe(0.3)
    expect(FATORES_SIMULTANEIDADE.comercial).toBe(0.7)

    const projRes = calcularProjecaoEconomia({ tipoCliente: 'residencial' })
    const projCom = calcularProjecaoEconomia({ tipoCliente: 'comercial' })

    expect(projRes.fatorSimultaneidade).toBe(0.3)
    expect(projCom.fatorSimultaneidade).toBe(0.7)
    expect(projRes.origemDados).toBe('estimativa')
  })

  it('deve calcular corretamente com dados do banco quando fornecidos', () => {
    // Dados sintéticos triviais para validação do pipeline
    const dadosSinteticos: ProjecaoTarifariaRecord[] = [
      {
        id: 'rec1',
        ano: 2026,
        tipo_cliente: 'residencial',
        tarifa_kwh: 1.0,
        fio_b_kwh: 0.2,
        fs: 0.3,
        gd_eco_liquida: 0.86,
      },
      {
        id: 'rec2',
        ano: 2027,
        tipo_cliente: 'residencial',
        tarifa_kwh: 1.09,
        fio_b_kwh: 0.22,
        fs: 0.3,
        gd_eco_liquida: 0.936,
      },
    ]

    const proj = calcularProjecaoEconomia({
      tipoCliente: 'residencial',
      consumoKwhAno: 1000,
      dadosTarifariosCustomizados: dadosSinteticos,
    })

    expect(proj.origemDados).toBe('banco')
    expect(proj.linhas).toHaveLength(2)
    expect(proj.linhas[0].tarifaKwh).toBe(1.0)
    expect(proj.linhas[0].gdEcoLiquidaKwh).toBe(0.86)
    expect(proj.linhas[0].economiaAnual).toBe(860) // 1000 * 0.86
    expect(proj.linhas[0].gastoSemSolarAnual).toBe(1000) // 1000 * 1.0
  })

  it('deve preservar as fórmulas consolidadas: postergação = ecoAno1 / 12', () => {
    const proj = calcularProjecaoEconomia({
      tipoCliente: 'residencial',
      consumoKwhAno: CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
    })

    const ecoAno1 = proj.linhas[0].economiaAnual
    expect(proj.valorPerdidoPorMesPostergacao).toBe(Number((ecoAno1 / 12).toFixed(2)))
    expect(proj.economiaTotal25Anos).toBeGreaterThan(0)
    expect(proj.gastoTotalSemSolar25Anos).toBeGreaterThan(proj.economiaTotal25Anos)
  })
})

describe('Parser da Planilha Tarifária (planilhaTarifariaParser)', () => {
  it('normalizarNumero deve tratar diversos formatos brasileiros e percentuais', () => {
    expect(normalizarNumero('1.1979')).toBe(1.1979)
    expect(normalizarNumero('1,1979')).toBe(1.1979)
    expect(normalizarNumero('30%')).toBe(0.3)
    expect(normalizarNumero('70%')).toBe(0.7)
    expect(normalizarNumero('R$ 5.306,55')).toBe(5306.55)
    expect(normalizarNumero(null)).toBe(0)
  })

  it('deve detectar linhas tarifárias com dados sintéticos tabulares', () => {
    // Matriz sintética trivial simulando as colunas da planilha oficial do usuário
    const rawMatrixSintetica = [
      ['Cabeçalho Qualquer', 'Outro', '', '', ''],
      ['Residencial', '', '', '', ''],
      [
        'Ano',
        'Tarifa (R$/kWh)',
        'FioB (R$/kWh)',
        'FS',
        'GD Eco Líquida (R$/kWh)',
        'Economia Acum.',
        'Gasto acum.',
      ],
      ['2026', '1.19', '0.22', '30%', '1.10', '5000', '5500'],
      ['2027', '1.30', '0.24', '30%', '1.17', '10000', '11000'],
      ['Comercial', '', '', '', ''],
      [
        'Ano',
        'Tarifa (R$/kWh)',
        'FioB (R$/kWh)',
        'FS',
        'GD Eco Líquida (R$/kWh)',
        'Economia Acum.',
        'Gasto acum.',
      ],
      ['2026', '1.19', '0.22', '70%', '1.15', '5500', '5600'],
      ['2027', '1.30', '0.24', '70%', '1.25', '11500', '11800'],
    ]

    const resultado = extrairLinhasTarifarias(rawMatrixSintetica)
    expect(resultado.sucesso).toBe(true)
    expect(resultado.blocos).toHaveLength(2)

    const blocoRes = resultado.blocos.find((b) => b.tipo === 'residencial')
    const blocoCom = resultado.blocos.find((b) => b.tipo === 'comercial')

    expect(blocoRes).toBeDefined()
    expect(blocoRes?.linhas).toHaveLength(2)
    expect(blocoRes?.linhas[0].ano).toBe(2026)
    expect(blocoRes?.linhas[0].fs).toBe(0.3)

    expect(blocoCom).toBeDefined()
    expect(blocoCom?.linhas).toHaveLength(2)
    expect(blocoCom?.linhas[0].ano).toBe(2026)
    expect(blocoCom?.linhas[0].fs).toBe(0.7)
  })
})

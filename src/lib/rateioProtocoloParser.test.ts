import { describe, it, expect } from 'vitest'
import { vi } from 'vitest'
import {
  parseConfirmacaoConcessionaria,
  tentarParseLinhaUC,
  tentarParseLinhaSeta,
  normalizarPercentual,
  extrairRateioProtocoloComFallbackIA,
} from './rateioProtocoloParser'

describe('rateioProtocoloParser', () => {
  const exemploReal = `
Solicitação concluída com sucesso!
Seu protocolo foi gerado e está em andamento. Em breve, nossa equipe entrará em contato para dar prosseguimento. Fique tranquilo, estamos cuidando de tudo para você!.

Protocolo: 2175698383
14:42 05/08/2026

UC | CPF/CNPJ | Rateio | UC âncora | Ações
308155225 | 54323843020 | 5
4004357003 | 54323843020 | 35
4004392324 | 54323843020 | 10
4004357004 | 54323843020 | 35
3083327475 | 54323843020 | 15
`

  it('faz o parse com sucesso do exemplo real do usuário da RGE', () => {
    const res = parseConfirmacaoConcessionaria(exemploReal)
    expect(res.sucesso).toBe(true)
    expect(res.protocolo).toBe('2175698383')
    expect(res.dataHora).toBe('14:42 05/08/2026')
    expect(res.unidades).toHaveLength(5)

    expect(res.unidades[0]).toEqual({ numero_uc: '308155225', percentual: 5 })
    expect(res.unidades[1]).toEqual({ numero_uc: '4004357003', percentual: 35 })
    expect(res.unidades[2]).toEqual({ numero_uc: '4004392324', percentual: 10 })
    expect(res.unidades[3]).toEqual({ numero_uc: '4004357004', percentual: 35 })
    expect(res.unidades[4]).toEqual({ numero_uc: '3083327475', percentual: 15 })

    expect(res.somaPercentuais).toBe(100)
    expect(res.erros).toHaveLength(0)
  })

  it('lida com decimais com vírgula e ponto', () => {
    expect(normalizarPercentual('12,5')).toBe(12.5)
    expect(normalizarPercentual('12.5%')).toBe(12.5)
    expect(normalizarPercentual(' 33,33 ')).toBe(33.33)

    const textoComDecimais = `
Protocolo: 99887766
01/09/2026

UC | CPF/CNPJ | Rateio
100200300 | 12345678900 | 12,5
200300400 | 12345678900 | 37.5
300400500 | 12345678900 | 50
`
    const res = parseConfirmacaoConcessionaria(textoComDecimais)
    expect(res.sucesso).toBe(true)
    expect(res.protocolo).toBe('99887766')
    expect(res.unidades).toHaveLength(3)
    expect(res.unidades[0].percentual).toBe(12.5)
    expect(res.unidades[1].percentual).toBe(37.5)
    expect(res.unidades[2].percentual).toBe(50)
    expect(res.somaPercentuais).toBe(100)
  })

  it('lida com linhas separadas por tabulações ou múltiplos espaços', () => {
    const linhaTab = '308155225\t54323843020\t20'
    const parsedTab = tentarParseLinhaUC(linhaTab)
    expect(parsedTab).toEqual({ numero_uc: '308155225', percentual: 20 })

    const linhaEspacos = '4004357003   54323843020   80'
    const parsedEspacos = tentarParseLinhaUC(linhaEspacos)
    expect(parsedEspacos).toEqual({ numero_uc: '4004357003', percentual: 80 })

    const linhaSimples = '308155225 100%'
    const parsedSimples = tentarParseLinhaUC(linhaSimples)
    expect(parsedSimples).toEqual({ numero_uc: '308155225', percentual: 100 })
  })

  it('rejeita texto sem protocolo e sem unidades gerando erros descritivos', () => {
    const resVazio = parseConfirmacaoConcessionaria('')
    expect(resVazio.sucesso).toBe(false)
    expect(resVazio.erros[0]).toContain('Nenhum texto informado')

    const resSemProtocolo = parseConfirmacaoConcessionaria(`
UC | CPF | Rateio
308155225 | 12345678900 | 50
`)
    expect(resSemProtocolo.sucesso).toBe(false)
    expect(resSemProtocolo.erros.some((e) => e.includes('protocolo'))).toBe(true)
    expect(resSemProtocolo.unidades).toHaveLength(1)

    const resSemUnidades = parseConfirmacaoConcessionaria(`
Solicitação concluída com sucesso!
Protocolo: 12345678
`)
    expect(resSemUnidades.sucesso).toBe(false)
    expect(resSemUnidades.erros.some((e) => e.includes('Nenhuma unidade'))).toBe(true)
  })

  it('extrairRateioProtocoloComFallbackIA usa parser local de primeira se for válido', async () => {
    const res = await extrairRateioProtocoloComFallbackIA(exemploReal)
    expect(res.sucesso).toBe(true)
    expect(res.protocolo).toBe('2175698383')
    expect(res.unidades).toHaveLength(5)
  })

  it('extrairRateioProtocoloComFallbackIA recorre ao endpoint quando o determinístico falha', async () => {
    const textoBaguncado =
      'Texto desestruturado qualquer sem padrão tabular normal de concessionária'
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        raw_text: JSON.stringify({
          protocolo: '55667788',
          unidades: [
            { uc: '999888777', percentual: 60 },
            { uc: '111222333', percentual: 40 },
          ],
        }),
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    const res = await extrairRateioProtocoloComFallbackIA(
      textoBaguncado,
      'Bearer token123',
      'http://localhost',
    )
    expect(res.sucesso).toBe(true)
    expect(res.protocolo).toBe('55667788')
    expect(res.unidades).toHaveLength(2)
    expect(res.somaPercentuais).toBe(100)
    expect(res.avisos.some((a) => a.includes('fallback de IA'))).toBe(true)

    vi.unstubAllGlobals()
  })

  describe('Formato de texto com setas (UCG / UCB)', () => {
    const textoFormatoSeta = `
Protocolo: 2026-99112233
Data: 10/10/2026

UCG (290984100192) → 0,00%
UCB 1 (2.909.841.001-92) → 5,00%
UCB 2 (778.946.001-78) → 15,00%
UCB 3 (1.420.261.001-98) → 14,00%
UCB 4 (1.420.565.001-74) → 12,00%
UCB 5 (1.424.374.001-72) → 22,00%
UCB 6 (1.425.163.001-13) → 6,00%
UCB 7 (1.463.761.001-66) → 13,00%
UCB 8 (2.911.492.001-49) → 6,00%
UCB 9 (2.933.548.001-91) → 7,00%
`

    it('faz parse correto de linha individual com tentarParseLinhaSeta', () => {
      const ucg = tentarParseLinhaSeta('UCG (290984100192) → 0,00%')
      expect(ucg).not.toBeNull()
      expect(ucg?.tipo).toBe('geradora')
      expect(ucg?.rotulo).toBe('UCG')
      expect(ucg?.numero_uc).toBe('290984100192')
      expect(ucg?.percentual).toBe(0)

      const ucb1 = tentarParseLinhaSeta('UCB 1 (2.909.841.001-92) → 5,00%')
      expect(ucb1).not.toBeNull()
      expect(ucb1?.tipo).toBe('beneficiaria')
      expect(ucb1?.rotulo).toBe('UCB 1')
      expect(ucb1?.numero_uc).toBe('290984100192')
      expect(ucb1?.percentual).toBe(5)
      expect(ucb1?.identificacao).toBe('UCB 1 (2.909.841.001-92)')

      // Variação com seta ASCII "->" e sem sufixo numérico
      const ucbSemSufixo = tentarParseLinhaSeta('UCB (778.946.001-78) -> 15.5%')
      expect(ucbSemSufixo).not.toBeNull()
      expect(ucbSemSufixo?.tipo).toBe('beneficiaria')
      expect(ucbSemSufixo?.rotulo).toBe('UCB')
      expect(ucbSemSufixo?.numero_uc).toBe('77894600178')
      expect(ucbSemSufixo?.percentual).toBe(15.5)
    })

    it('extrai todas as 9 beneficiárias e geradora a 0% do exemplo do usuário', () => {
      const res = parseConfirmacaoConcessionaria(textoFormatoSeta)
      expect(res.sucesso).toBe(true)
      expect(res.protocolo).toBe('2026-99112233')
      expect(res.percentualGeradora).toBe(0)
      expect(res.unidades).toHaveLength(9)

      // Soma de 5 + 15 + 14 + 12 + 22 + 6 + 13 + 6 + 7 = 100
      expect(res.somaPercentuais).toBe(100)

      expect(res.unidades[0]).toEqual({
        numero_uc: '290984100192',
        percentual: 5,
        rotulo: 'UCB 1',
        identificacao: 'UCB 1 (2.909.841.001-92)',
        documento: '2.909.841.001-92',
      })

      expect(res.unidades[1]).toEqual({
        numero_uc: '77894600178',
        percentual: 15,
        rotulo: 'UCB 2',
        identificacao: 'UCB 2 (778.946.001-78)',
        documento: '778.946.001-78',
      })

      expect(res.unidades[4].percentual).toBe(22)
      expect(res.unidades[8].percentual).toBe(7)
    })

    it('suporta variações: "->" em vez de "→", documentos sem pontuação e linhas com ruído ao redor', () => {
      const textoVariado = `
Prezados, segue comprovante do atendimento de rateio.
Atendimento Protocolo: 987654321
Data e Hora: 12/11/2026 15:30

Informações da Usina:
UCG (11122233344) -> 10,0%
UCB 1 (22233344455) -> 30,0%
UCB 2 (33344455566) -> 60,00%

Observações finais:
Favor conferir faturas do próximo ciclo.
`
      const res = parseConfirmacaoConcessionaria(textoVariado)
      expect(res.sucesso).toBe(true)
      expect(res.protocolo).toBe('987654321')
      expect(res.percentualGeradora).toBe(10)
      expect(res.unidades).toHaveLength(2)
      expect(res.unidades[0].percentual).toBe(30)
      expect(res.unidades[1].percentual).toBe(60)
      expect(res.somaPercentuais).toBe(90)
    })
  })
})

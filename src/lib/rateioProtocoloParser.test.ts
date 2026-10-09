import { describe, it, expect } from 'vitest'
import {
  parseConfirmacaoConcessionaria,
  tentarParseLinhaUC,
  normalizarPercentual,
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
})

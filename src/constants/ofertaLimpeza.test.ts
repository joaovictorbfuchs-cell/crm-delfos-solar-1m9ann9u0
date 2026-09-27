import { describe, it, expect } from 'vitest'
import {
  calcularPerdaAnualPorSujeira,
  extrairGeracaoMediaMensal,
  extrairPotenciaUsinaTexto,
  resolverPlaceholdersOfertaLimpeza,
  MENSAGEM_OFERTA_LIMPEZA_PADRAO,
} from './ofertaLimpeza'
import type { Cliente, UsinaCliente } from '@/types/crm'

describe('ofertaLimpeza constants and helpers', () => {
  it('calcula perda anual por sujeira corretamente (850 kWh/mês -> perda ≈ R$ 3.665,88)', () => {
    const geracaoMensal = 850
    const { geracaoAnualKwh, valorPerda } = calcularPerdaAnualPorSujeira(geracaoMensal, 1.198, 0.3)

    expect(geracaoAnualKwh).toBe(10200)
    // 10200 * 1.198 * 0.3 = 3665.88
    expect(valorPerda).toBeCloseTo(3665.88, 2)
  })

  it('extrai geração média mensal da usina com prioridade', () => {
    const mockCliente: Partial<Cliente> = {
      id: 'c1',
      nome: 'João da Silva',
      consumo_kwh_mes: 500,
      potencia_kwp: 5,
    }

    const mockUsina: Partial<UsinaCliente> = {
      id: 'u1',
      cliente_id: 'c1',
      nome: 'Usina 1',
      geracao_media_mensal_kwh: 850,
      potencia_kwp: 7.1,
    }

    const geracao = extrairGeracaoMediaMensal(mockCliente as Cliente, [mockUsina as UsinaCliente])
    expect(geracao).toBe(850)
  })

  it('faz fallback para consumo do cliente caso usina não tenha geração informada', () => {
    const mockCliente: Partial<Cliente> = {
      id: 'c2',
      nome: 'Maria Souza',
      consumo_kwh_mes: 600,
    }

    const geracao = extrairGeracaoMediaMensal(mockCliente as Cliente, [])
    expect(geracao).toBe(600)
  })

  it('formata texto de potência da usina corretamente', () => {
    const mockCliente: Partial<Cliente> = { id: 'c3', nome: 'Empresa X' }
    const mockUsina: Partial<UsinaCliente> = {
      id: 'u3',
      cliente_id: 'c3',
      potencia_kwp: 7.1,
    }

    const texto = extrairPotenciaUsinaTexto(mockCliente as Cliente, [mockUsina as UsinaCliente])
    expect(texto).toContain('7,1 kWp')
  })

  it('resolve todos os placeholders na mensagem padrão de oferta de limpeza', () => {
    const mockCliente: Partial<Cliente> = {
      id: 'c4',
      nome: 'João Victor Bagetti Fuchs',
      cidade: 'Erechim',
    }

    const mockUsina: Partial<UsinaCliente> = {
      id: 'u4',
      cliente_id: 'c4',
      geracao_media_mensal_kwh: 850,
      potencia_kwp: 7.1,
    }

    const msg = resolverPlaceholdersOfertaLimpeza({
      template: MENSAGEM_OFERTA_LIMPEZA_PADRAO,
      cliente: mockCliente as Cliente,
      usinasDoCliente: [mockUsina as UsinaCliente],
      valorServico: 350.0,
      tarifa: 1.198,
    })

    expect(msg).toContain('Olá, João!')
    expect(msg).toContain('850 kWh')
    expect(msg).toContain('3.665,88')
    expect(msg).toContain('7,1 kWp')
    expect(msg).toContain('Erechim')
    expect(msg).toContain('R$ 350,00')
    expect(msg).not.toContain('[nome do cliente]')
    expect(msg).not.toContain('[geração média]')
    expect(msg).not.toContain('[valor calculado]')
  })
})

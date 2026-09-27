import { describe, it, expect } from 'vitest'
import {
  calcularPerdaAnualPorSujeira,
  extrairGeracaoMediaMensal,
  extrairPotenciaUsinaTexto,
  resolverPlaceholdersOfertaLimpeza,
  calcularValorLimpezaPorPlacas,
  calcularValorDeslocamentoLimpeza,
  extrairNumeroPlacas,
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

  it('calcula valor de limpeza por placas conforme regra (< 30 -> R$ 300; >= 30 -> placas * 9)', () => {
    // 0 ou menos de 30 placas -> R$ 300,00
    expect(calcularValorLimpezaPorPlacas(0)).toBe(300)
    expect(calcularValorLimpezaPorPlacas(13)).toBe(300)
    expect(calcularValorLimpezaPorPlacas(29)).toBe(300)

    // 30 placas ou mais -> placas * 9
    expect(calcularValorLimpezaPorPlacas(30)).toBe(270)
    expect(calcularValorLimpezaPorPlacas(40)).toBe(360)
    expect(calcularValorLimpezaPorPlacas(100)).toBe(900)
  })

  it('calcula deslocamento conforme regra (km * 1.50 * 2)', () => {
    expect(calcularValorDeslocamentoLimpeza(0)).toBe(0)
    expect(calcularValorDeslocamentoLimpeza(10)).toBe(30) // 10 * 1.5 * 2 = 30
    expect(calcularValorDeslocamentoLimpeza(31)).toBe(93) // 31 * 1.5 * 2 = 93
  })

  it('extrai numero de placas de usina, sistema ou cliente', () => {
    const cliSemPlacas: Partial<Cliente> = { id: 'c1', nome: 'Teste' }
    expect(extrairNumeroPlacas(cliSemPlacas as Cliente)).toBe(0)

    const cliComPlacas: Partial<Cliente> = { id: 'c2', nome: 'João Victor', placas_qtd: 13 }
    expect(extrairNumeroPlacas(cliComPlacas as Cliente)).toBe(13)

    const usinaComModulos: Partial<UsinaCliente> = { id: 'u1', qtd_modulos: 42 }
    expect(extrairNumeroPlacas(cliComPlacas as Cliente, [usinaComModulos as UsinaCliente])).toBe(42)

    const sistemaComModulos = { quantidade_placas: 50 }
    expect(extrairNumeroPlacas(cliSemPlacas as Cliente, [], sistemaComModulos)).toBe(50)
  })

  it('valida o caso real do cliente João Victor Bagetti Fuchs existente no CRM', () => {
    // Dados reais do cliente João Victor Bagetti Fuchs no PocketBase:
    // id: '4bb6q12dbgk5sa4', placas_qtd: 13, cidade: 'Erechim', whatsapp: '(54) 98110-8228'
    const clienteJoaoVictor: Partial<Cliente> = {
      id: '4bb6q12dbgk5sa4',
      nome: 'João Victor Bagetti Fuchs',
      cidade: 'Erechim',
      placas_qtd: 13,
      potencia_kwp: 7.1,
      whatsapp: '(54) 98110-8228',
      telefone: '(54) 98110-8228',
    }

    // 1. Extração do número de placas
    const nPlacas = extrairNumeroPlacas(clienteJoaoVictor as Cliente)
    expect(nPlacas).toBe(13)

    // 2. Menos de 30 placas -> R$ 300,00
    const valorLimpeza = calcularValorLimpezaPorPlacas(nPlacas)
    expect(valorLimpeza).toBe(300.0)

    // 3. Se houver deslocamento (ex: 20 km -> 20 * 1.50 * 2 = R$ 60,00)
    const deslocamento = calcularValorDeslocamentoLimpeza(20)
    expect(deslocamento).toBe(60.0)
    const valorTotalComDeslocamento = valorLimpeza + deslocamento
    expect(valorTotalComDeslocamento).toBe(360.0)

    // 4. Preenchimento de mensagem com placeholders
    const msg = resolverPlaceholdersOfertaLimpeza({
      template: MENSAGEM_OFERTA_LIMPEZA_PADRAO,
      cliente: clienteJoaoVictor as Cliente,
      usinasDoCliente: [],
      valorServico: valorTotalComDeslocamento,
      tarifa: 1.198,
    })

    expect(msg).toContain('João Victor Bagetti Fuchs')
    expect(msg).toContain('Erechim')
    expect(msg).toContain('R$ 360,00')
    expect(msg).not.toContain('[nome do cliente]')
    expect(msg).not.toContain('[valor]')
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

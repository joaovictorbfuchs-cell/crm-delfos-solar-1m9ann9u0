import { describe, it, expect } from 'vitest'
import {
  extrairPrimeiroNomeCliente,
  extrairCidadeCliente,
  extrairPotenciaClienteTexto,
  extrairValorClienteTexto,
  resolverPlaceholdersMensagemMassa,
  PLACEHOLDERS_ENVIO_MASSA,
} from './placeholdersMensagemMassa'
import type { Cliente, UsinaCliente } from '@/types/crm'

describe('placeholdersMensagemMassa', () => {
  const clienteMock: Cliente = {
    id: 'cli123',
    nome: 'João Victor Bagetti Fuchs',
    cidade: 'Erechim',
    estado: 'RS',
    potencia_kwp: 7.1,
    valor_estimado: 35000,
    telefone: '(54) 98110-8228',
    whatsapp: '(54) 98110-8228',
  } as Cliente

  it('deve listar os 4 placeholders obrigatórios', () => {
    const tags = PLACEHOLDERS_ENVIO_MASSA.map((p) => p.tag)
    expect(tags).toContain('[nome do cliente]')
    expect(tags).toContain('[cidade]')
    expect(tags).toContain('[potência]')
    expect(tags).toContain('[valor]')
  })

  it('extrai o primeiro nome corretamente', () => {
    expect(extrairPrimeiroNomeCliente(clienteMock)).toBe('João')
    expect(extrairPrimeiroNomeCliente({ nome: 'Maria Santos' } as any)).toBe('Maria')
    expect(extrairPrimeiroNomeCliente(null)).toBe('Cliente')
  })

  it('extrai cidade com fallback', () => {
    expect(extrairCidadeCliente(clienteMock)).toBe('Erechim')
    expect(extrairCidadeCliente({ cidade: 'Passo Fundo' } as any)).toBe('Passo Fundo')
    expect(extrairCidadeCliente({ cidade: '' } as any)).toBe('Erechim')
  })

  it('extrai potência formatada em kWp pt-BR', () => {
    expect(extrairPotenciaClienteTexto(clienteMock)).toBe('7,1 kWp')

    const usina: Partial<UsinaCliente> = { potencia_kwp: 12.5 }
    expect(extrairPotenciaClienteTexto(clienteMock, usina as UsinaCliente)).toBe('12,5 kWp')

    expect(extrairPotenciaClienteTexto({ potencia_kwp: 0 } as any)).toBe('energia solar')
  })

  it('extrai valor formatado em R$ pt-BR', () => {
    expect(extrairValorClienteTexto(450, clienteMock)).toBe('R$ 450,00')
    expect(extrairValorClienteTexto(undefined, clienteMock)).toBe('R$ 35.000,00')
    expect(extrairValorClienteTexto(undefined, { valor_estimado: 0 } as any)).toBe('R$ 0,00')
  })

  it('resolve todos os placeholders em uma mensagem com múltiplos clientes', () => {
    const template =
      'Olá, [nome do cliente]! Confirmamos sua usina de [potência] em [cidade]. O valor estimado é [valor].'

    const resolvida = resolverPlaceholdersMensagemMassa({
      template,
      cliente: clienteMock,
      valor: 250,
    })

    expect(resolvida).toBe(
      'Olá, João! Confirmamos sua usina de 7,1 kWp em Erechim. O valor estimado é R$ 250,00.',
    )
  })

  it('resolve sem acento no placeholder [potencia]', () => {
    const template = 'Usina de [potencia] para [nome do cliente] em [cidade]'
    const resolvida = resolverPlaceholdersMensagemMassa({
      template,
      cliente: clienteMock,
    })
    expect(resolvida).toBe('Usina de 7,1 kWp para João em Erechim')
  })
})

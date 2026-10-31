import { describe, it, expect } from 'vitest'
import { isAuthSessionError, isAbortError } from '@/lib/pocketbase/errors'
import pb, { isAuthSessionError as clientIsAuthSessionError } from '@/lib/pocketbase/client'
import {
  SecoesCadastroNovoCliente,
  DADOS_NOVO_CLIENTE_INICIAIS,
} from '@/components/SecoesCadastroNovoCliente'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

describe('Modal Novo Negócio - Expansão de Novo Cliente e Salvaguardas', () => {
  it('garante que isAuthSessionError e pb estão exportados e válidos em client.ts e errors.ts', () => {
    expect(typeof isAuthSessionError).toBe('function')
    expect(typeof clientIsAuthSessionError).toBe('function')
    expect(isAuthSessionError({ status: 401 })).toBe(true)
    expect(isAuthSessionError({ status: 403 })).toBe(true)
    expect(isAuthSessionError({ response: { status: 401 } })).toBe(true)
    expect(isAuthSessionError(new Error('Token is expired or invalid'))).toBe(true)
    expect(isAuthSessionError(new Error('Sessão expirada'))).toBe(true)
    expect(isAuthSessionError(null)).toBe(false)
    expect(isAbortError({ isAbort: true })).toBe(true)

    expect(pb).toBeDefined()
    expect(typeof pb.collection).toBe('function')
  })

  it('renderiza as três seções exigidas (dados cadastrais, contato e dados de energia) para cliente novo', () => {
    const html = renderToStaticMarkup(
      React.createElement(SecoesCadastroNovoCliente, {
        dados: {
          ...DADOS_NOVO_CLIENTE_INICIAIS,
          nome: 'Delfos Teste Solar Ltda',
          cnpj_cpf: '00.000.000/0001-91',
          concessionaria: 'RGE',
          uc: '200.419.001-19',
          consumo_kwh_mes: '850',
          tipo_fornecimento: 'trifásico',
          potencia_kwp: '7.08',
        },
        onChange: () => {},
      }),
    )

    // Seção (a) Dados cadastrais
    expect(html).toContain('(a) Dados Cadastrais do Cliente')
    expect(html).toContain('CNPJ / CPF')
    expect(html).toContain('RG / Inscrição Estadual (IE)')
    expect(html).toContain('Razão Social / Nome Completo')
    expect(html).toContain('Endereço Completo')
    expect(html).toContain('Rua / Logradouro')
    expect(html).toContain('Número')
    expect(html).toContain('Bairro')
    expect(html).toContain('Cidade')
    expect(html).toContain('UF')
    expect(html).toContain('CEP')

    // Seção (b) Contato
    expect(html).toContain('(b) Contato')
    expect(html).toContain('Telefone Fixo / Celular')
    expect(html).toContain('WhatsApp')
    expect(html).toContain('E-mail')

    // Seção (c) Dados de energia
    expect(html).toContain('(c) Dados de Energia da Instalação')
    expect(html).toContain('Concessionária')
    expect(html).toContain('Unidade Consumidora / Instalação (UC)')
    expect(html).toContain('Média de Consumo Mensal (kWh)')
    expect(html).toContain('Tipo de Ligação')
    expect(html).toContain('Potência Instalada / Estimada (kWp)')

    // Funcionalidades
    expect(html).toContain('Anexar Conta de Luz (PDF/Foto)')
    expect(html).toContain('Consultar BrasilAPI')
  })
})

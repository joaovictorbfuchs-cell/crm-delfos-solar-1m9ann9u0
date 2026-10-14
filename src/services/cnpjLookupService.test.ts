import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { consultarCNPJReceita, limparCNPJ } from './cnpjLookupService'
import { validarCNPJ, formatarCNPJ } from '@/lib/orcamentoParser'

describe('cnpjLookupService', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('valida e formata CNPJ corretamente', () => {
    expect(limparCNPJ('12.345.678/0001-95')).toBe('12345678000195')
    expect(validarCNPJ('11222333000181')).toBe(false) // dígitos inválidos
    expect(formatarCNPJ('00000000000191')).toBe('00.000.000/0001-91')
  })

  it('rejeita CNPJ com tamanho inválido sem lançar exceção', async () => {
    const res = await consultarCNPJReceita('123')
    expect(res.success).toBe(false)
    expect(res.error).toContain('14 dígitos')
  })

  it('rejeita CNPJ com dígitos verificadores incorretos sem lançar exceção', async () => {
    const res = await consultarCNPJReceita('11111111111111')
    expect(res.success).toBe(false)
    expect(res.error).toContain('inválido')
  })

  it('quando a API falha com TypeError (Failed to fetch / CORS / rede), resolve graciosamente sem estourar exceção', async () => {
    // CNPJ válido para passar no teste de DV: 00.000.000/0001-91 (Banco do Brasil)
    const cnpjValido = '00000000000191'

    // Simula erro de fetch comum ("Failed to fetch" ou falha de rede/CORS)
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))

    const res = await consultarCNPJReceita(cnpjValido)
    expect(res.success).toBe(false)
    expect(res.error).toBeDefined()
    expect(res.error).toContain('Não foi possível consultar os dados na Receita Federal no momento')
  })

  it('quando a primeira API (BrasilAPI) falha com 500 e a segunda (PublicaCNPJ) falha com erro de rede, degrada com segurança', async () => {
    const cnpjValido = '00000000000191'

    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // BrasilAPI retorna 500
        return Promise.resolve(new Response('Server Error', { status: 500 }))
      }
      // PublicaCNPJ falha com erro de rede
      return Promise.reject(new TypeError('Network request failed'))
    })

    const res = await consultarCNPJReceita(cnpjValido)
    expect(res.success).toBe(false)
    expect(res.error).toContain('Não foi possível consultar os dados na Receita Federal')
  })

  it('quando ambas retornam 404, retorna notFound: true sem quebrar', async () => {
    const cnpjValido = '00000000000191'

    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Not Found', { status: 404 }))

    const res = await consultarCNPJReceita(cnpjValido)
    expect(res.success).toBe(false)
    expect(res.notFound).toBe(true)
    expect(res.error).toContain('não encontrado')
  })

  it('quando a BrasilAPI tem sucesso, retorna dados normalizados', async () => {
    const cnpjValido = '00000000000191'

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          cnpj: cnpjValido,
          razao_social: 'BANCO DO BRASIL SA',
          nome_fantasia: 'DIRECAO GERAL',
          logradouro: 'SBS QUADRA 1 BLOCO C',
          numero: 'SN',
          bairro: 'ASA SUL',
          municipio: 'BRASILIA',
          uf: 'DF',
          cep: '70073901',
          ddd_telefone_1: '6134939002',
          descricao_situacao_cadastral: 'ATIVA',
          cnae_fiscal_descricao: 'Bancos múltiplos, com carteira comercial',
          cnae_fiscal: 6422100,
          data_inicio_atividade: '1966-08-01',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    const res = await consultarCNPJReceita(cnpjValido)
    expect(res.success).toBe(true)
    expect(res.data?.razao_social).toBe('BANCO DO BRASIL SA')
    expect(res.data?.origem_api).toBe('brasilapi')
  })
})

import { describe, it, expect } from 'vitest'
import { sanitizarDocumentoExtraido, type DocumentoExtraidoSanitizavel } from './documentExtractor'

describe('sanitizarDocumentoExtraido', () => {
  it('move valor com dígitos != 11 e != 14 (como UC mascarada de 11 pontuações ou 10/12 dígitos) para consumo.uc e anula cpf_cnpj', () => {
    // Exemplo do bug relatado: "3.584.212.001-72" tem 11 dígitos numéricos? "358421200172" tem 12 dígitos!
    const entrada: DocumentoExtraidoSanitizavel = {
      dados_cadastrais: {
        nome: 'João da Silva',
        cpf_cnpj: '3.584.212.001-72',
      },
      consumo: {
        uc: null,
      },
    }

    const resultado = sanitizarDocumentoExtraido(entrada)
    expect(resultado.dados_cadastrais?.cpf_cnpj).toBeNull()
    expect(resultado.consumo?.uc).toBe('3.584.212.001-72')
  })

  it('mantém CPF real com exatamente 11 dígitos em dados_cadastrais.cpf_cnpj', () => {
    const entrada: DocumentoExtraidoSanitizavel = {
      dados_cadastrais: {
        nome: 'Maria Pereira',
        cpf_cnpj: '123.456.789-01',
      },
      consumo: {
        uc: '3.584.212.001-72',
      },
    }

    const resultado = sanitizarDocumentoExtraido(entrada)
    expect(resultado.dados_cadastrais?.cpf_cnpj).toBe('123.456.789-01')
    expect(resultado.consumo?.uc).toBe('3.584.212.001-72')
  })

  it('mantém CNPJ real com exatamente 14 dígitos em dados_cadastrais.cpf_cnpj', () => {
    const entrada: DocumentoExtraidoSanitizavel = {
      dados_cadastrais: {
        nome: 'Empresa Solar Ltda',
        cpf_cnpj: '12.345.678/0001-90',
      },
      consumo: {
        uc: '7001234567',
      },
    }

    const resultado = sanitizarDocumentoExtraido(entrada)
    expect(resultado.dados_cadastrais?.cpf_cnpj).toBe('12.345.678/0001-90')
    expect(resultado.consumo?.uc).toBe('7001234567')
  })

  it('se cpf_cnpj tiver dígitos != 11 e != 14 mas consumo.uc já estiver preenchida, não sobrescreve a UC existente e anula cpf_cnpj', () => {
    const entrada: DocumentoExtraidoSanitizavel = {
      dados_cadastrais: {
        nome: 'Carlos Souza',
        cpf_cnpj: '998877665', // 9 dígitos
      },
      consumo: {
        uc: '1122334455',
      },
    }

    const resultado = sanitizarDocumentoExtraido(entrada)
    expect(resultado.dados_cadastrais?.cpf_cnpj).toBeNull()
    expect(resultado.consumo?.uc).toBe('1122334455')
  })

  it('se cpf_cnpj tiver exatamente os mesmos dígitos que consumo.uc (duplicação), anula cpf_cnpj e preserva consumo.uc', () => {
    const entrada: DocumentoExtraidoSanitizavel = {
      dados_cadastrais: {
        nome: 'Ana Santos',
        cpf_cnpj: '123.456.789.01', // 11 dígitos, mas coincide exatamente com a UC
      },
      consumo: {
        uc: '12345678901',
      },
    }

    const resultado = sanitizarDocumentoExtraido(entrada)
    expect(resultado.dados_cadastrais?.cpf_cnpj).toBeNull()
    expect(resultado.consumo?.uc).toBe('12345678901')
  })

  it('lida graciosamente com objetos vazios ou nulos', () => {
    expect(sanitizarDocumentoExtraido(null)).toBeNull()
    expect(sanitizarDocumentoExtraido(undefined)).toBeUndefined()
    const vazio: DocumentoExtraidoSanitizavel = {}
    expect(sanitizarDocumentoExtraido(vazio)).toEqual({
      dados_cadastrais: {},
      endereco: {},
      dados_tecnicos: {},
      consumo: {},
    })
  })
})

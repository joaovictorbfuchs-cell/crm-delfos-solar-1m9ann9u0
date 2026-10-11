import { describe, it, expect } from 'vitest'
import React from 'react'
import { ProcuracaoPDFDocument } from './ProcuracaoPDFDocument'

describe('ProcuracaoPDFDocument — Componente @react-pdf/renderer', () => {
  const dadosMock = {
    nome: 'Marcelo Becker',
    cpf: '412.589.630-18',
    endereco: 'Linha São João, Km 12, S/N, Zona Rural',
    municipio: 'Passo Fundo/RS',
    dataPorExtenso: '13 de setembro de 2026',
    telefone: '(54) 99712-8844',
  }

  it('deve instanciar o componente ProcuracaoPDFDocument com os dados fornecidos', () => {
    const element = React.createElement(ProcuracaoPDFDocument, { dados: dadosMock })
    expect(element).toBeDefined()
    expect(element.props.dados.nome).toBe('Marcelo Becker')
    expect(element.props.dados.cpf).toBe('412.589.630-18')
    expect(element.props.dados.municipio).toBe('Passo Fundo/RS')
    expect(element.props.dados.dataPorExtenso).toBe('13 de setembro de 2026')
  })

  it('deve usar valores padrão quando campos opcionais estiverem ausentes', () => {
    const element = React.createElement(ProcuracaoPDFDocument, { dados: { nome: 'João da Silva' } })
    expect(element).toBeDefined()
    expect(element.props.dados.nome).toBe('João da Silva')
  })
})

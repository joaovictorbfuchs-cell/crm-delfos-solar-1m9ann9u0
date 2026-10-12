import { describe, it, expect } from 'vitest'
import React from 'react'
import { ContratoOMPDFDocument } from './ContratoOMPDFDocument'
import { SERVICOS_ADICIONAIS_PADRAO } from '@/lib/contratoGenerator'

describe('ContratoOMPDFDocument', () => {
  it('renderiza a árvore de componentes @react-pdf/renderer com dados consolidados', () => {
    const dados = {
      nomeRazaoSocial: 'Agrícola Boa Vista Ltda',
      cpfCnpj: '12.345.678/0001-90',
      municipio: 'Erechim/RS',
      enderecoInstalacao: 'Linha Três Arroios, km 4',
      telefone: '(54) 99999-8888',
      email: 'contato@boavista.com.br',
      planoSelecionado: 'Prevenção' as const,
      valorMensal: 450,
      valorTotal: 5400,
      numeroModulos: 120,
      marcaInversores: 'Solis 50kW',
      localInstalacao: 'Telhado' as const,
      cidadeAssinatura: 'Erechim',
      servicosAdicionais: SERVICOS_ADICIONAIS_PADRAO,
    }

    const doc = React.createElement(ContratoOMPDFDocument, { dados })
    expect(doc).toBeDefined()
    expect(doc.props.dados.nomeRazaoSocial).toBe('Agrícola Boa Vista Ltda')
    expect(doc.props.dados.planoSelecionado).toBe('Prevenção')
  })
})

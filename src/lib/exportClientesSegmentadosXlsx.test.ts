import { describe, it, expect } from 'vitest'
import {
  prepararDadosExportacaoClientes,
  exportarClientesSegmentadosXlsx,
} from './exportClientesSegmentadosXlsx'
import type { Cliente, ContatoAdicional } from '@/types/crm'

describe('exportClientesSegmentadosXlsx', () => {
  const mockClientes: Cliente[] = [
    {
      id: 'cli-1',
      collectionId: 'clientes',
      collectionName: 'clientes',
      nome: 'João Silva Solar',
      telefone: '(54) 99999-1111',
      whatsapp: '(54) 99999-1111',
      status: 'Novo Lead',
      cidade: 'Erechim',
      potencia_kwp: 6.5,
      valor_estimado: 25000,
      data_instalacao: '2025-01-01',
      inversor_marca: 'Deye',
      inversor_modelo: '5K',
      placas_qtd: 10,
      placas_marca: 'Canadian',
      telhado_tipo: 'ceramico',
      endereco: 'Rua A, 123',
      uc: '123456',
      created: '2025-01-01T10:00:00Z',
      updated: '2025-01-01T10:00:00Z',
    },
    {
      id: 'cli-2',
      collectionId: 'clientes',
      collectionName: 'clientes',
      nome: 'Maria Sem Whats',
      telefone: '(54) 3522-0000',
      whatsapp: '',
      status: 'Levantamento',
      cidade: 'Getúlio Vargas',
      potencia_kwp: 10,
      valor_estimado: 45000,
      data_instalacao: '2025-01-01',
      inversor_marca: 'Growatt',
      inversor_modelo: '10K',
      placas_qtd: 18,
      placas_marca: 'JA Solar',
      telhado_tipo: 'metalico',
      endereco: 'Rua B, 456',
      uc: '654321',
      created: '2025-01-02T10:00:00Z',
      updated: '2025-01-02T10:00:00Z',
    },
    {
      id: 'cli-3',
      collectionId: 'clientes',
      collectionName: 'clientes',
      nome: 'Empresa Sem Contato',
      telefone: '',
      whatsapp: '',
      tipo_pessoa: 'juridica',
      cnpj: '12.345.678/0001-99',
      status: 'Orçamento',
      cidade: 'Passo Fundo',
      potencia_kwp: 15,
      valor_estimado: 70000,
      data_instalacao: '2025-01-01',
      inversor_marca: 'Solis',
      inversor_modelo: '15K',
      placas_qtd: 28,
      placas_marca: 'Trina',
      telhado_tipo: 'laje',
      endereco: 'Av Principal, 789',
      uc: '987654',
      created: '2025-01-03T10:00:00Z',
      updated: '2025-01-03T10:00:00Z',
    },
  ]

  const mockContatosAdicionais: ContatoAdicional[] = [
    {
      id: 'ca-1',
      collectionId: 'contatos_adicionais',
      collectionName: 'contatos_adicionais',
      cliente: 'cli-1',
      nome: 'Pedro Gerente',
      cargo: 'Gerente Operações',
      created: '2025-01-01T12:00:00Z',
      updated: '2025-01-01T12:00:00Z',
    },
  ]

  it('prepara dados de exportação identificando corretamente telefone, whatsapp e contato vinculado', () => {
    const dados = prepararDadosExportacaoClientes(mockClientes, mockContatosAdicionais)

    expect(dados).toHaveLength(3)

    // cli-1: Tem tel, tem whats, tem contato adicional vinculado
    expect(dados[0].temTelefone).toBe(true)
    expect(dados[0].temWhatsApp).toBe(true)
    expect(dados[0].temContatoVinculado).toBe(true)
    expect(dados[0].totalContatosVinculados).toBe(1)

    // cli-2: Tem tel fixo, NÃO tem whats, NÃO tem contato vinculado
    expect(dados[1].temTelefone).toBe(true)
    expect(dados[1].temWhatsApp).toBe(false)
    expect(dados[1].temContatoVinculado).toBe(false)

    // cli-3: NÃO tem tel, NÃO tem whats, NÃO tem contato vinculado
    expect(dados[2].temTelefone).toBe(false)
    expect(dados[2].temWhatsApp).toBe(false)
    expect(dados[2].temContatoVinculado).toBe(false)
  })

  it('gera planilha segmentada com abas e totais de resumo corretos', () => {
    // Mock simples de downloadFileInBrowser para ambiente Node/testes
    const resultado = exportarClientesSegmentadosXlsx({
      clientes: mockClientes,
      contatosAdicionais: mockContatosAdicionais,
    })

    expect(resultado.totalExportados).toBe(3)
    expect(resultado.resumo.comTelefone).toBe(2)
    expect(resultado.resumo.semTelefone).toBe(1)
    expect(resultado.resumo.comWhatsApp).toBe(1)
    expect(resultado.resumo.semWhatsApp).toBe(2)
    expect(resultado.resumo.comContato).toBe(1)
    expect(resultado.resumo.semContato).toBe(2)
    expect(resultado.nomeArquivo).toMatch(/clientes-segmentados-.*\.xlsx/)
  })
})

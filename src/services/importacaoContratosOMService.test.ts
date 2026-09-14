import { describe, it, expect } from 'vitest'
import {
  detectarCabecalhoContratos,
  normalizarDataContrato,
  extrairValorMoeda,
  normalizarSituacaoContrato,
  deduzirPlanoOM,
  construirItensImportacaoContratos,
  extrairContratosDeTextoLivre,
  gerarContratosExemploDemonstracao,
} from './importacaoContratosOMService'
import { Cliente, ContratoOM } from '@/types/crm'

describe('importacaoContratosOMService', () => {
  it('detecta cabeçalhos típicos da exportação da Conta Azul Pro', () => {
    const headers = [
      'Cliente / Razão Social',
      'Número do Contrato',
      'Data de Início',
      'Próximo Vencimento',
      'Data de Término',
      'Valor Mensal',
      'Situação',
    ]

    const cols = detectarCabecalhoContratos(headers)
    expect(cols).not.toBeNull()
    expect(cols?.cliente).toBe('Cliente / Razão Social')
    expect(cols?.numeroContrato).toBe('Número do Contrato')
    expect(cols?.dataInicio).toBe('Data de Início')
    expect(cols?.proximoVencimento).toBe('Próximo Vencimento')
    expect(cols?.dataTermino).toBe('Data de Término')
    expect(cols?.valorMensal).toBe('Valor Mensal')
    expect(cols?.situacao).toBe('Situação')
  })

  it('normaliza datas no formato brasileiro DD/MM/YYYY para ISO YYYY-MM-DD', () => {
    expect(normalizarDataContrato('15/03/2024')).toBe('2024-03-15')
    expect(normalizarDataContrato('01/01/24')).toBe('2024-01-01')
    expect(normalizarDataContrato('2024-12-31')).toBe('2024-12-31')
  })

  it('converte valores monetários brasileiros corretamente', () => {
    expect(extrairValorMoeda('R$ 450,00')).toBe(450)
    expect(extrairValorMoeda('1.250,50')).toBe(1250.5)
    expect(extrairValorMoeda('300')).toBe(300)
    expect(extrairValorMoeda(500)).toBe(500)
  })

  it('mapeia situações e deduz planos O&M adequadamente', () => {
    expect(normalizarSituacaoContrato('Ativo')).toBe('Ativo')
    expect(normalizarSituacaoContrato('Cancelado')).toBe('Cancelado')
    expect(normalizarSituacaoContrato('Encerrado')).toBe('Encerrado')
    expect(normalizarSituacaoContrato('Vencido')).toBe('Vencido')

    expect(deduzirPlanoOM(250)).toBe('Essencial')
    expect(deduzirPlanoOM(450)).toBe('Prevenção')
    expect(deduzirPlanoOM(1200)).toBe('Completo')
  })

  it('reconcilia e compara clientes fuzzy com a base do CRM', () => {
    const clientesBase: Partial<Cliente>[] = [
      {
        id: 'c1',
        nome: 'Marcelo Becker',
        razao_social: 'Marcelo Becker Agropecuaria LTDA',
      },
      {
        id: 'c2',
        nome: 'Maria Santos',
        nome_fantasia: 'Mercado Santos',
      },
    ]

    const rows = [
      {
        Cliente: 'Marcelo Becker Agropecuaria LTDA',
        'Nº Contrato': 'CT-101',
        'Data Início': '01/05/2024',
        'Valor Mensal': '350,00',
        Situação: 'Ativo',
      },
      {
        Cliente: 'Desconhecido Sem Cadastro S/A',
        'Nº Contrato': 'CT-999',
        'Data Início': '01/05/2024',
        'Valor Mensal': '500,00',
        Situação: 'Ativo',
      },
    ]

    const cols = {
      cliente: 'Cliente',
      numeroContrato: 'Nº Contrato',
      dataInicio: 'Data Início',
      valorMensal: 'Valor Mensal',
      situacao: 'Situação',
    }

    const itens = construirItensImportacaoContratos(
      rows,
      cols,
      clientesBase as Cliente[],
      [] as ContratoOM[],
    )

    expect(itens).toHaveLength(2)
    // Linha 1 deve casar com Marcelo Becker
    expect(itens[0].confiancaMatch).toBe('alta')
    expect(itens[0].clienteIdentificadoId).toBe('c1')
    expect(itens[0].decisao).toBe('vincular')

    // Linha 2 não deve casar
    expect(itens[1].confiancaMatch).toBe('nenhuma')
    expect(itens[1].clienteIdentificadoId).toBeNull()
    expect(itens[1].decisao).toBe('criar_cliente')
  })

  it('extrai contratos de texto livre ou colado manualmente', () => {
    const clientesBase: Partial<Cliente>[] = [{ id: 'c1', nome: 'Marcelo Becker' }]
    const texto = `
      Contrato CT-2024-001 - Marcelo Becker - R$ 350,00 - Início 01/05/2024 - Término 01/05/2025
    `
    const itens = extrairContratosDeTextoLivre(texto, clientesBase as Cliente[], [])
    expect(itens.length).toBeGreaterThanOrEqual(1)
    expect(itens[0].clienteIdentificadoId).toBe('c1')
  })

  it('gera contratos de exemplo demonstrando os 3 caminhos solicitados', () => {
    const clientesBase: Partial<Cliente>[] = [
      { id: 'c1', nome: 'Marcelo Becker' },
      { id: 'c2', nome: 'Maria Santos' },
    ]
    const exemplos = gerarContratosExemploDemonstracao(clientesBase as Cliente[], [])
    expect(exemplos).toHaveLength(3)

    // 2 identificados
    const identificados = exemplos.filter((e) => e.clienteIdentificadoId !== null)
    expect(identificados).toHaveLength(2)

    // 1 não encontrado
    const naoEncontrado = exemplos.find((e) => e.clienteIdentificadoId === null)
    expect(naoEncontrado).toBeDefined()
    expect(naoEncontrado?.decisao).toBe('criar_cliente')
  })
})

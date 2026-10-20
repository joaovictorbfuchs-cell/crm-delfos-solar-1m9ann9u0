import { describe, it, expect } from 'vitest'
import { gerarValoresIniciaisPropostaCarregador } from '@/services/propostasCarregadorService'
import {
  gerarHTMLPropostaCarregador,
  formatarDataBr,
  calcularDataValidade,
} from '@/lib/propostaCarregadorGenerator'
import type { Cliente } from '@/types/crm'

describe('Propostas de Carregador Veicular (Infraestrutura Wallbox)', () => {
  it('gera valores iniciais respeitando premissas técnicas e cliente', () => {
    const clienteMock = {
      id: 'cli-test-1',
      collectionId: 'clientes',
      collectionName: 'clientes',
      nome: 'Transportadora Caxias',
      razao_social: 'Transportadora Caxias Ltda',
      cnpj: '12.345.678/0001-90',
      whatsapp: '54991234567',
      endereco: 'Av. das Indústrias',
      numero: '500',
      bairro: 'Industrial',
      cidade: 'Erechim',
      estado: 'RS',
      tipo_cliente: 'comercial',
      created: '2025-01-01',
      updated: '2025-01-01',
    } as unknown as Cliente

    const init = gerarValoresIniciaisPropostaCarregador(clienteMock)

    expect(init.cliente_nome).toBe('Transportadora Caxias Ltda')
    expect(init.cliente_documento).toBe('12.345.678/0001-90')
    expect(init.endereco_instalacao).toContain('Av. das Indústrias')
    expect(init.tipo_local).toBe('Comercial')
    expect(init.custo_proprio_min).toBe(18)
    expect(init.custo_proprio_max).toBe(25)
    expect(init.custo_publico_min).toBe(70)
    expect(init.custo_publico_max).toBe(90)
    expect(init.opcao1_valor).toBe(6890)
    expect(init.opcao2_valor).toBe(9450)
    expect(init.valor_estacao_materiais).toBe(5950)
    expect(init.valor_servicos_engenharia).toBe(2450)
    expect(init.valor_total).toBe(8400)
    expect(init.engenheiro_nome).toContain('João Victor Bagetti Fuchs')
    expect(init.engenheiro_crea).toContain('151894')
  })

  it('calcula data de validade com 10 dias corridos', () => {
    const emissao = '2025-10-24'
    const validade = calcularDataValidade(emissao, 10)
    expect(validade).toBe('03/11/2025')
  })

  it('gera HTML fiel ao modelo anexo contendo normas NBR e seções completas', () => {
    const dados = gerarValoresIniciaisPropostaCarregador(null)
    dados.numero_proposta = 'PROP-2025-084'
    dados.data_emissao = '2025-10-24'

    const html = gerarHTMLPropostaCarregador(dados)

    // Cabeçalho e timbrado oficial
    expect(html).toContain('DELFOS ENGENHARIA')
    expect(html).toContain('21.379.952/0001-38')
    expect(html).toContain('PROP-2025-084')
    expect(html).toContain('10 dias corridos')

    // Título e NBRs
    expect(html).toContain('Infraestrutura de Recarga Wallbox')
    expect(html).toContain('NBR 5410')
    expect(html).toContain('NBR 17019')

    // Seção 2 Economia
    expect(html).toContain('Economia de até 4x no custo por quilômetro')
    expect(html).toContain('R$ 18 a R$ 25')
    expect(html).toContain('R$ 70 a R$ 90')

    // Seção 3 Modelos
    expect(html).toContain('Opção 01: Wallbox AC 7,4 kW')
    expect(html).toContain('Opção 02: Wallbox AC 22 kW')
    expect(html).toContain('Recomendado')

    // Seção 4 Escopo Técnico
    expect(html).toContain('(A) Quadro de Proteção')
    expect(html).toContain('(B) Infraestrutura &amp; Cabeamento')
    expect(html).toContain('(C) Fixação &amp; Comissionamento')
    expect(html).toContain('CREA-RS')

    // Seção 5 Investimento e Condições
    expect(html).toContain('INVESTIMENTO TOTAL')
    expect(html).toContain('50% de sinal no aceite')

    // Seção 7 Responsável Técnico
    expect(html).toContain('João Victor Bagetti Fuchs')
    expect(html).toContain('CREA-RS 151894')

    // Seção 8 Próximos Passos
    expect(html).toContain('Aceite Formal')
    expect(html).toContain('Sinal (50%)')
    expect(html).toContain('Vistoria &amp; Agenda')
    expect(html).toContain('Instalação &amp; Testes')
    expect(html).toContain('Saldo Final')
  })
})

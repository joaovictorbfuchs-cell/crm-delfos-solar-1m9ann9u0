import { describe, it, expect } from 'vitest'
import {
  gerarValoresIniciaisPropostaCarregador,
  normalizarPropostaCarregadorParaInput,
  converterInputParaPropostaCarregador,
} from '@/services/propostasCarregadorService'
import {
  gerarHTMLPropostaCarregador,
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
    expect(init.materiais_infraestrutura?.length).toBeGreaterThan(0)
    expect(init.subtotal_materiais).toBe(4550)
    expect(init.valor_servicos_instalacao).toBe(1850)
    expect(init.valor_servicos_engenharia).toBe(1200)
    expect(init.engenheiro_nome).toContain('João Victor Bagetti Fuchs')
    expect(init.engenheiro_crea).toContain('151894')
  })

  it('suporta modo de carregador já adquirido: mostra Adquirido sem valor e soma apenas materiais e serviços', () => {
    const dados = gerarValoresIniciaisPropostaCarregador(null)
    dados.carregador_adquirido = true
    dados.modo_carregador = 'adquirido'
    dados.carregador_modelo = 'Wallbox Pulsar Plus 7,4 kW'
    dados.carregador_potencia = '7,4 kW (220V)'

    // Materiais: 4550, Instalação: 1850, Engenharia: 1200 -> Total = 7600
    dados.subtotal_materiais = 4550
    dados.valor_servicos_instalacao = 1850
    dados.valor_servicos_engenharia = 1200
    dados.valor_total = 4550 + 1850 + 1200

    const html = gerarHTMLPropostaCarregador(dados)

    expect(html).toContain('Wallbox Pulsar Plus 7,4 kW')
    expect(html).toContain('Adquirido')
    expect(html).toContain('Materiais da Infraestrutura de Instalação')
    expect(html).toContain('Serviços de Instalação e Engenharia')
    expect(html).toContain('R$&nbsp;7.600,00')
  })

  it('preserva integridade do ciclo salvar -> reabrir com normalizarPropostaCarregadorParaInput', () => {
    const inputOriginal = gerarValoresIniciaisPropostaCarregador(null)
    inputOriginal.modo_carregador = 'adquirido'
    inputOriginal.carregador_adquirido = true
    inputOriginal.carregador_modelo = 'WEG WEMOB 7,4 kW'
    inputOriginal.materiais_infraestrutura = [
      { id: '1', descricao: 'Disjuntor Bipolar 40A', quantidade: 2, valor_unitario: 120 },
      { id: '2', descricao: 'Cabo 6mm 20m', quantidade: 20, valor_unitario: 15 },
    ]
    inputOriginal.subtotal_materiais = 2 * 120 + 20 * 15 // 540
    inputOriginal.valor_servicos = 2900 // serviço unificado editado
    inputOriginal.valor_total = 0 + 540 + 2900 // 3440

    // Simula salvar transformando em registro PropostaCarregador
    const propostaSalva = converterInputParaPropostaCarregador(inputOriginal, 'cli-123')

    // Simula reabrir para edição no modal
    const reaberta = normalizarPropostaCarregadorParaInput(propostaSalva)

    expect(reaberta.modo_carregador).toBe('adquirido')
    expect(reaberta.carregador_adquirido).toBe(true)
    expect(reaberta.carregador_modelo).toBe('WEG WEMOB 7,4 kW')
    expect(reaberta.materiais_infraestrutura).toHaveLength(2)
    expect(reaberta.materiais_infraestrutura?.[0].descricao).toBe('Disjuntor Bipolar 40A')
    expect(reaberta.materiais_infraestrutura?.[0].valor_unitario).toBe(120)
    expect(reaberta.subtotal_materiais).toBe(540)
    expect(reaberta.valor_servicos).toBe(2900)
    expect(reaberta.valor_total).toBe(3440)
  })

  it('preserva a preferência de ocultar valores / exibir apenas valor total consolidado no ciclo salvar -> reabrir', () => {
    const inputOriginal = gerarValoresIniciaisPropostaCarregador(null)
    inputOriginal.detalhar_valores = false
    inputOriginal.exibir_apenas_total = true

    const propostaSalva = converterInputParaPropostaCarregador(inputOriginal, 'cli-456')
    const reaberta = normalizarPropostaCarregadorParaInput(propostaSalva)

    expect(reaberta.detalhar_valores).toBe(false)
    expect(reaberta.exibir_apenas_total).toBe(true)
  })

  it('gera HTML correto quando carregador já foi adquirido pelo cliente (sem listar opções e sem valor monetário do carregador)', () => {
    const dados = gerarValoresIniciaisPropostaCarregador(null)
    dados.carregador_adquirido = true
    dados.modo_carregador = 'adquirido'
    dados.carregador_modelo = 'Zeeda Energy'
    dados.carregador_potencia = '7 kW (32A trifásico)'
    dados.subtotal_materiais = 500
    dados.valor_servicos = 1200
    dados.valor_total = 1700

    const html = gerarHTMLPropostaCarregador(dados)

    // Seção 3 Carregador Veicular: NÃO deve listar Opção 01 e Opção 02 Wallbox
    expect(html).not.toContain('Opção 01: Wallbox AC 7,4 kW')
    expect(html).not.toContain('Opção 02: Wallbox AC 22 kW')
    expect(html).not.toContain('Recomendado')

    // Deve exibir o carregador adquirido pelo cliente
    expect(html).toContain('Zeeda Energy')
    expect(html).toContain('7 kW (32A trifásico)')
    expect(html).toContain('Adquirido')

    // Na tabela de investimentos:
    // Carregador deve constar como Adquirido e sem valor monetário na linha
    expect(html).toContain('1. Carregador Veicular — Zeeda Energy')
    expect(html).toContain('Adquirido')
    expect(html).toContain('Carregador Adquirido (R$ 0,00)')
    expect(html).toContain('R$&nbsp;1.700,00')
  })

  it('gera HTML correto no modo ocultar valores por item (exibir apenas o valor total)', () => {
    const dados = gerarValoresIniciaisPropostaCarregador(null)
    dados.detalhar_valores = false
    dados.exibir_apenas_total = true
    dados.subtotal_materiais = 637
    dados.valor_servicos = 1063
    dados.valor_total = 1700

    const html = gerarHTMLPropostaCarregador(dados)

    // A tabela de investimento deve conter "Incluso" para materiais e serviços
    expect(html).toContain('Incluso')
    expect(html).toContain('INVESTIMENTO TOTAL')
    expect(html).toContain('R$&nbsp;1.700,00')
    // Não deve exibir subtotal separado de materiais
    expect(html).not.toContain('Subtotal dos Materiais da Infraestrutura:')
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

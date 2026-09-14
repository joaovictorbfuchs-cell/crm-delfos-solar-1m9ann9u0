import { categorizarClienteOM, calcularContagensOM } from './omCategorizacao'
import type { Cliente, ContratoOM, ServicoAvulso } from '@/types/crm'

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(
      `Assertion failed for ${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    )
  }
}

function mockCliente(partial: Partial<Cliente> & { id: string; nome: string }): Cliente {
  return {
    collectionId: 'pbc_clientes',
    collectionName: 'clientes',
    telefone: '',
    endereco: '',
    uc: '',
    cidade: 'Erechim/RS',
    potencia_kwp: 0,
    valor_estimado: 0,
    status: 'Novo Lead',
    data_instalacao: '',
    inversor_marca: '',
    inversor_modelo: '',
    placas_qtd: 0,
    placas_marca: '',
    telhado_tipo: 'metalico',
    produto: 'Energia Solar',
    created: '2026-09-10',
    updated: '2026-09-10',
    ...partial,
  }
}

function mockContrato(
  partial: Partial<ContratoOM> & { id: string; cliente_id: string },
): ContratoOM {
  return {
    collectionId: 'pbc_contratos',
    collectionName: 'contratos_om',
    plano: 'Essencial',
    status: 'Ativo',
    valor_mensal: 250,
    valor_anual: 3000,
    data_inicio: '2025-01-01',
    data_vencimento: '2027-01-01',
    created: '2026-09-10',
    updated: '2026-09-10',
    ...partial,
  }
}

function mockServicoAvulso(
  partial: Partial<ServicoAvulso> & { id: string; cliente_id: string },
): ServicoAvulso {
  return {
    collectionId: 'pbc_servicos_avulsos',
    collectionName: 'servicos_avulsos',
    data_servico: '2026-03-24',
    tipo_servico: 'limpeza',
    valor_cobrado: 450,
    status: 'concluido',
    created: '2026-03-24',
    updated: '2026-03-24',
    ...partial,
  }
}

export function runOmCategorizacaoTests(): {
  passed: number
  total: number
  errors: string[]
} {
  const tests: { name: string; fn: () => void }[] = [
    {
      name: 'Cliente com plano O&M ativo vai para plano_ativo e não entra no pós-vendas',
      fn: () => {
        const clienteComPlano = mockCliente({
          id: 'cli_marcelo',
          nome: 'Marcelo Becker',
          telefone: '54997128844',
          cidade: 'Passo Fundo/RS',
          status: 'Fechado',
          produto: 'Energia Solar',
          potencia_kwp: 28.5,
        })

        const contratoAtivo = mockContrato({
          id: 'ct_1',
          cliente_id: 'cli_marcelo',
          plano: 'Completo',
          status: 'Ativo',
          valor_mensal: 149.9,
          valor_anual: 1798.8,
        })

        const res = categorizarClienteOM(clienteComPlano.id, [contratoAtivo])
        assertEquals(res.categoria, 'plano_ativo', 'categoria deve ser plano_ativo')
        assert(Boolean(res.contratoAtivo), 'contratoAtivo deve estar definido')

        const contagens = calcularContagensOM([clienteComPlano], [contratoAtivo])
        assertEquals(contagens.totalClientes, 1, 'total clientes')
        assertEquals(contagens.planosAtivos, 1, 'planos ativos')
        assertEquals(contagens.posVendas, 0, 'pos vendas deve ser 0 para quem tem plano ativo')
        assertEquals(contagens.oportunidadesOM, 0, 'oportunidades OM deve ser 0')
      },
    },
    {
      name: 'Cliente importado do Conta Azul sem plano O&M entra automaticamente em Pós-Vendas',
      fn: () => {
        const clienteContaAzul = mockCliente({
          id: 'cli_conta_azul_1',
          nome: 'Metalúrgica Alto Uruguai S/A',
          cnpj: '91.442.119/0001-52',
          telefone: '(54) 3520-1400',
          cidade: 'Erechim',
          estado: 'RS',
          status: 'Novo Lead',
          produto: 'Energia Solar',
          potencia_kwp: 5.5,
          dados_importados: {
            'Razão Social / Nome': 'Metalúrgica Alto Uruguai S/A',
            'Situação Cadastral': 'Ativo',
            'Data do Cadastro': '05/01/2026',
          },
        })

        const res = categorizarClienteOM(clienteContaAzul.id, [])
        assertEquals(res.categoria, 'sem_plano', 'categoria deve ser sem_plano')

        const contagens = calcularContagensOM([clienteContaAzul], [])
        assertEquals(contagens.totalClientes, 1, 'total clientes')
        assertEquals(contagens.planosAtivos, 0, 'planos ativos')
        assertEquals(contagens.posVendas, 1, 'cliente Conta Azul deve contar como posVendas')
        assertEquals(
          contagens.oportunidadesOM,
          1,
          'como tem potencia > 0 deve contar como oportunidade O&M',
        )
      },
    },
    {
      name: 'Cliente com serviço avulso realizado sem plano O&M entra em Pós-Vendas',
      fn: () => {
        const clienteServico = mockCliente({
          id: 'cli_ricardo',
          nome: 'Ricardo Alves',
          telefone: '(54) 99188-4422',
          cidade: 'Erechim/RS',
          status: 'Contato Futuro',
          produto: 'Energia Solar',
          potencia_kwp: 10,
        })

        const servicoAvulso = mockServicoAvulso({
          id: 'serv_1',
          cliente_id: 'cli_ricardo',
          data_servico: '2026-03-24',
          tipo_servico: 'limpeza',
          valor_cobrado: 450,
          status: 'concluido',
        })

        const res = categorizarClienteOM(clienteServico.id, [], [], [], [servicoAvulso])
        assert(res.temServicoAvulsoHistorico, 'deve ter histórico de serviço avulso')
        assertEquals(res.ultimoServicoAvulso?.id, 'serv_1', 'último serviço deve ser serv_1')

        const contagens = calcularContagensOM([clienteServico], [], [], [], [servicoAvulso])
        assertEquals(contagens.posVendas, 1, 'deve ser pós-vendas')
        assertEquals(contagens.oportunidadesOM, 1, 'solar instalado deve contar como oportunidade')
      },
    },
    {
      name: 'Cliente sem energia solar e sem serviços avulsos (lead ou cadastro básico) entra em Pós-Vendas como cliente sem plano',
      fn: () => {
        const clienteBasico = mockCliente({
          id: 'cli_basico',
          nome: 'Clanel',
          telefone: '54981108228',
          cidade: 'Erechim/RS',
          status: 'Novo Lead',
          potencia_kwp: 0,
        })

        const contagens = calcularContagensOM([clienteBasico], [])
        assertEquals(
          contagens.posVendas,
          1,
          'todos os clientes do CRM sem plano entram em pós-vendas',
        )
        assertEquals(
          contagens.oportunidadesOM,
          0,
          'não tem solar nem usina, então não é oportunidade de O&M',
        )
        assertEquals(contagens.clientesSemPlano, 1, 'conta como clientesSemPlano')
      },
    },
    {
      name: 'Quando cliente de Pós-Vendas contrata plano O&M, passa para a lista de planos ativos automaticamente',
      fn: () => {
        const cliente = mockCliente({
          id: 'cli_transicao',
          nome: 'João Victor Ferreira',
          status: 'Novo Lead',
          potencia_kwp: 7.1,
        })

        // Sem contrato: Pós-Vendas
        const antes = calcularContagensOM([cliente], [])
        assertEquals(antes.planosAtivos, 0, 'antes: planos ativos 0')
        assertEquals(antes.posVendas, 1, 'antes: pós vendas 1')

        // Contratou plano: Planos Ativos
        const novoContrato = mockContrato({
          id: 'ct_novo',
          cliente_id: 'cli_transicao',
          plano: 'Essencial',
          status: 'Ativo',
          valor_mensal: 250,
        })

        const depois = calcularContagensOM([cliente], [novoContrato])
        assertEquals(depois.planosAtivos, 1, 'depois: planos ativos 1')
        assertEquals(depois.posVendas, 0, 'depois: pós vendas 0')
      },
    },
    {
      name: 'Defensivo com datas inválidas ou nulas não gera NaN e mantém integridade',
      fn: () => {
        const clienteComDataInvalida = mockCliente({
          id: 'cli_data_inv',
          nome: 'Cliente Data Inválida',
        })
        const contratoDataInvalida = mockContrato({
          id: 'ct_inv',
          cliente_id: 'cli_data_inv',
          status: 'Ativo',
          data_vencimento: 'data_invalida_nao_parseavel',
        })

        const res = categorizarClienteOM(clienteComDataInvalida.id, [contratoDataInvalida])
        assertEquals(
          res.categoria,
          'plano_ativo',
          'deve se manter ativo sem quebrar por data inválida',
        )

        const contagens = calcularContagensOM([clienteComDataInvalida], [contratoDataInvalida])
        assertEquals(contagens.planosAtivos, 1, 'planos ativos com data inválida')
        assert(!isNaN(contagens.planosAtivos), 'planosAtivos não pode ser NaN')
        assert(!isNaN(contagens.posVendas), 'posVendas não pode ser NaN')
      },
    },
    {
      name: 'Contrato com status Encerrado ou status_encerramento encerrado move cliente para pós-vendas',
      fn: () => {
        const cliEncerrado = mockCliente({
          id: 'cli_encerrado_1',
          nome: 'Cliente Contrato Encerrado',
        })
        const contratoEncerrado = mockContrato({
          id: 'ct_enc_1',
          cliente_id: 'cli_encerrado_1',
          status: 'Encerrado',
          status_encerramento: 'encerrado',
          motivo_encerramento: 'Não renovação',
          data_encerramento: new Date().toISOString(),
        })

        const res = categorizarClienteOM(cliEncerrado.id, [contratoEncerrado])
        assertEquals(
          res.categoria,
          'sem_plano',
          'cliente com contrato encerrado não deve ficar em plano_ativo',
        )

        const contagens = calcularContagensOM([cliEncerrado], [contratoEncerrado])
        assertEquals(contagens.planosAtivos, 0, 'planos ativos deve ser zero')
        assertEquals(contagens.posVendas, 1, 'posVendas deve contabilizar o cliente')
      },
    },
    {
      name: 'Defensivo com fallbacks vazios ou nulos não lança erro',
      fn: () => {
        const res = categorizarClienteOM(
          'cli_teste_vazio',
          undefined,
          undefined,
          undefined,
          undefined,
        )
        assertEquals(res.categoria, 'sem_plano', 'categoria default sem_plano')

        const contagens = calcularContagensOM(
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        )
        assertEquals(contagens.totalClientes, 0, 'total clientes zero')
        assertEquals(contagens.planosAtivos, 0, 'planos ativos zero')
      },
    },
    {
      name: 'Cliente com status Fechado ou Concluído no comercial é categorizado como isPosVenda',
      fn: () => {
        const cliFechado = mockCliente({
          id: 'cli_fechado_funil',
          nome: 'Cliente Fechado Comercial',
          status: 'Fechado',
        })
        const resFechado = categorizarClienteOM(cliFechado.id, [], [], [], [], cliFechado)
        assertEquals(
          resFechado.isPosVenda,
          true,
          'cliente com status Fechado deve ter isPosVenda=true',
        )

        const cliConcluido = mockCliente({
          id: 'cli_concluido_funil',
          nome: 'Cliente Concluído Comercial',
          status: 'Concluído' as any,
        })
        const resConcluido = categorizarClienteOM(cliConcluido.id, [], [], [], [], cliConcluido)
        assertEquals(
          resConcluido.isPosVenda,
          true,
          'cliente com status Concluído deve ter isPosVenda=true',
        )

        const contagens = calcularContagensOM([cliFechado, cliConcluido], [])
        assertEquals(contagens.posVendas, 2, 'ambos devem contar em posVendas')
        assertEquals(
          contagens.oportunidadesOM,
          2,
          'fechados/concluidos contam como oportunidades OM',
        )
      },
    },
  ]

  let passed = 0
  const errors: string[] = []

  for (const t of tests) {
    try {
      t.fn()
      passed++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(`${t.name}: ${msg}`)
    }
  }

  return { passed, total: tests.length, errors }
}

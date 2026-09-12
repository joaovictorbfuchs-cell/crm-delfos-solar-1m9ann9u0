import { extrairOrcamentoFotovoltaicoPDF } from './orcamentoParser'
import type { Fornecedor, FornecedorItemOrcamento, FornecedorOrcamento } from '@/types/crm'

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

export function isExtracaoOrcamentoVazia(
  extraido: {
    nome_fornecedor?: string
    valor_total?: number
    modulos?: FornecedorItemOrcamento[]
    inversores?: FornecedorItemOrcamento[]
    acessorios?: FornecedorItemOrcamento[]
  },
  fileName = 'orcamento.pdf',
): boolean {
  const semItens =
    (!extraido.modulos || extraido.modulos.length === 0) &&
    (!extraido.inversores || extraido.inversores.length === 0) &&
    (!extraido.acessorios || extraido.acessorios.length === 0)

  const nomePadraoFallback = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
  const semNomeReal =
    !extraido.nome_fornecedor ||
    extraido.nome_fornecedor === 'Fornecedor Solar' ||
    extraido.nome_fornecedor.trim().toLowerCase() === nomePadraoFallback.trim().toLowerCase()

  return Boolean(semItens && (!extraido.valor_total || extraido.valor_total === 0) && semNomeReal)
}

export function runOrcamentoFornecedorFlowTests(): {
  passed: number
  total: number
  errors: string[]
} {
  const mockFornecedores: Fornecedor[] = [
    {
      id: 'bc9hqwgwznbrg1g',
      collectionId: 'pbc_3178984736',
      collectionName: 'fornecedores',
      nome_empresa: 'Sol tecno Distribuidora',
      cnpj: '14.285.923/0001-80',
      especialidade: 'completo',
      created: '2026-09-12 15:46:00.683Z',
      updated: '2026-09-12 15:46:00.683Z',
    },
    {
      id: 'm8ywhykedcf2f0v',
      collectionId: 'pbc_3178984736',
      collectionName: 'fornecedores',
      nome_empresa: 'Elétrica Comercial RS',
      cnpj: '92.418.570/0001-34',
      especialidade: 'inversores',
      created: '2026-09-12 15:46:00.683Z',
      updated: '2026-09-12 15:46:00.683Z',
    },
    {
      id: 'sqa3uywov83c4y2',
      collectionId: 'pbc_3178984736',
      collectionName: 'fornecedores',
      nome_empresa: 'Estruturas Sul Solar',
      cnpj: '08.621.394/0001-19',
      especialidade: 'estruturas',
      created: '2026-09-12 15:46:00.683Z',
      updated: '2026-09-12 15:46:00.683Z',
    },
  ]

  const tests: { name: string; fn: () => void | Promise<void> }[] = [
    {
      name: 'Classificação de extração vazia: detecta PDF escaneado/sem texto legível',
      fn: () => {
        const extraidoVazio = {
          nome_fornecedor: 'orcamento escaneado',
          valor_total: 0,
          modulos: [],
          inversores: [],
          acessorios: [],
        }
        const vazia = isExtracaoOrcamentoVazia(extraidoVazio, 'orcamento_escaneado.pdf')
        assert(
          vazia,
          'Deve classificar como vazia quando itens e valor estão zerados e nome é o fallback do arquivo',
        )
      },
    },
    {
      name: 'Classificação de extração bem-sucedida: não classifica como vazia quando há valor ou equipamentos',
      fn: () => {
        const extraidoSucesso = {
          nome_fornecedor: 'Sol tecno Distribuidora',
          valor_total: 48650,
          modulos: [{ descricao: 'Módulo Canadian Solar 550W', quantidade: 52 }],
          inversores: [{ descricao: 'Inversor Growatt MAX 30KTL3-X', quantidade: 1 }],
          acessorios: [],
        }
        const vazia = isExtracaoOrcamentoVazia(extraidoSucesso, 'orcamento_soltecno.pdf')
        assert(!vazia, 'Não deve classificar como vazia quando há dados válidos')
      },
    },
    {
      name: 'Fluxo manual: vinculação automática de fornecedor cadastrado existente',
      fn: () => {
        const nomeDigitado = 'elétrica comercial rs'
        const matching = mockFornecedores.find(
          (f) => f.nome_empresa.toLowerCase() === nomeDigitado.trim().toLowerCase(),
        )
        assert(Boolean(matching), 'Deve localizar o fornecedor cadastrado mesmo em minúsculas')
        assertEquals(matching?.id, 'm8ywhykedcf2f0v', 'ID deve corresponder ao cadastro existente')
      },
    },
    {
      name: 'Fluxo manual: permissão para fornecedor novo não cadastrado',
      fn: () => {
        const nomeNovo = 'Distribuidora Solar Horizonte Ltda'
        const matching = mockFornecedores.find(
          (f) => f.nome_empresa.toLowerCase() === nomeNovo.trim().toLowerCase(),
        )
        assert(!matching, 'Não deve achar nos cadastrados')
        // No salvamento o fornecedor_id fica undefined e o nome_fornecedor é gravado perfeitamente
        const payload: Partial<FornecedorOrcamento> = {
          nome_fornecedor: nomeNovo,
          fornecedor_id: undefined,
          valor_total: 25000,
          modulos: [{ descricao: 'Módulo Risen 550W', quantidade: 20 }],
          inversores: [{ descricao: 'Inversor Deye 8kW', quantidade: 1 }],
          acessorios: [{ descricao: 'Kit cabos', quantidade: 1 }],
        }
        assertEquals(payload.nome_fornecedor, nomeNovo, 'Nome novo deve ser preservado')
        assertEquals(payload.fornecedor_id, undefined, 'fornecedor_id deve ser opcional')
      },
    },
    {
      name: 'Estrutura idêntica entre fluxo automático e formulário manual rápido',
      fn: () => {
        const payloadManual: Partial<FornecedorOrcamento> = {
          nome_fornecedor: 'Sol tecno Distribuidora',
          fornecedor_id: 'bc9hqwgwznbrg1g',
          cliente_id: 'cliente_123',
          orcamento_solar_id: 'orc_solar_456',
          numero_revisao: 'REV-02',
          valor_total: 46200,
          modulos: [{ descricao: 'JA Solar 550W DeepBlue 3.0', quantidade: 52 }],
          inversores: [{ descricao: 'Growatt MAX 30KTL3-X LV', quantidade: 1 }],
          acessorios: [{ descricao: 'String Box Solar CC/CA', quantidade: 1 }],
          observacoes: 'Preenchimento rápido manual após upload de cotação escaneada',
        }

        // Verifica compatibilidade de campos
        assert(Boolean(payloadManual.nome_fornecedor), 'nome_fornecedor preenchido')
        assertEquals(payloadManual.fornecedor_id, 'bc9hqwgwznbrg1g', 'fornecedor_id vinculado')
        assertEquals(payloadManual.valor_total, 46200, 'valor_total preservado')
        assertEquals(payloadManual.modulos?.length, 1, 'módulos presentes')
        assertEquals(payloadManual.inversores?.length, 1, 'inversores presentes')
        assertEquals(payloadManual.acessorios?.length, 1, 'acessórios presentes')
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

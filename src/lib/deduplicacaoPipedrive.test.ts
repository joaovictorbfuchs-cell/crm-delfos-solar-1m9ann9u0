import {
  normalizarTexto,
  normalizarDocumento,
  telefonesIguais,
  calcularSimilaridadeTexto,
  encontrarCorrespondenciaCliente,
  mesclarDadosPipedriveNoCadastro,
  ItemRevisaoPipedrive,
} from './deduplicacaoPipedrive'
import type { Cliente } from '@/types/crm'

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
    cidade: 'Erechim',
    potencia_kwp: 5,
    valor_estimado: 25000,
    status: 'Novo Lead',
    data_instalacao: '',
    inversor_marca: '',
    inversor_modelo: '',
    placas_qtd: 0,
    placas_marca: '',
    telhado_tipo: 'ceramico',
    produto: 'Energia Solar',
    created: '2026-09-10',
    updated: '2026-09-10',
    ...partial,
  }
}

export function runDeduplicacaoPipedriveTests(): {
  passed: number
  total: number
  errors: string[]
} {
  const tests: { name: string; fn: () => void }[] = [
    {
      name: 'Correspondência por CPF/CNPJ exato',
      fn: () => {
        const clienteExistente = mockCliente({
          id: 'cli_1',
          nome: 'Ademar Fiorini',
          cpf: '727.971.770-53',
          telefone: '54999242399',
          email: 'fioriniademar@gmail.com',
          como_conheceu: 'Conta Azul',
        })

        const match = encontrarCorrespondenciaCliente(
          {
            nome: 'Ademar Fiorini Rural',
            cpf: '72797177053',
            email: 'outro@email.com',
          },
          [clienteExistente],
        )

        assert(match !== null, 'Deveria ter encontrado match')
        assertEquals(match?.criterio, 'cpf_cnpj', 'Critério deve ser cpf_cnpj')
        assertEquals(match?.clienteContaAzul.id, 'cli_1', 'ID do cliente deve bater')
      },
    },
    {
      name: 'Correspondência por Nome muito parecido (similaridade >= 0.85)',
      fn: () => {
        const clienteExistente = mockCliente({
          id: 'cli_2',
          nome: 'Ademar Emílio Berlanda',
          cpf: '371.942.080-91',
          telefone: '54991268473',
          email: 'ademarberlanda@gmail.com',
          como_conheceu: 'Conta Azul',
        })

        // Variação sem acento e com pequena diferença
        const match = encontrarCorrespondenciaCliente(
          {
            nome: 'Ademar Emilio Berlanda',
            telefone: '(54) 99126-8473',
          },
          [clienteExistente],
        )

        assert(match !== null, 'Deveria ter encontrado match')
        assert(
          match?.criterio === 'cpf_cnpj' ||
            match?.criterio === 'telefone' ||
            match?.criterio === 'nome_similar',
          'Critério válido',
        )

        // Testar similaridade de nome isolada
        const score = calcularSimilaridadeTexto('Ademar Emílio Berlanda', 'Ademar Emilio Berlanda')
        assert(score >= 0.85, `Score de nome (${score}) deve ser >= 0.85`)
      },
    },
    {
      name: 'Correspondência por Telefone igual (com ou sem formatação / DDI)',
      fn: () => {
        const clienteExistente = mockCliente({
          id: 'cli_3',
          nome: 'Adílio Paulo Follador',
          telefone: '54999731804',
          email: 'adiliofollador@hotmail.com',
          como_conheceu: 'Conta Azul',
        })

        assert(
          telefonesIguais('(54) 99973-1804', '54999731804'),
          'Telefones com máscara devem ser iguais',
        )
        assert(
          telefonesIguais('5554999731804', '54999731804'),
          'Telefone com 55 e sem 55 devem ser iguais',
        )

        const match = encontrarCorrespondenciaCliente(
          {
            nome: 'A. P. Follador',
            telefone: '(54) 99973-1804',
          },
          [clienteExistente],
        )

        assert(match !== null, 'Deveria encontrar match por telefone')
        assertEquals(match?.criterio, 'telefone', 'Critério deve ser telefone')
      },
    },
    {
      name: 'Correspondência por E-mail igual case-insensitive',
      fn: () => {
        const clienteExistente = mockCliente({
          id: 'cli_4',
          nome: 'Adriano Gelain Machado',
          email: 'amgelain@gmail.com',
          como_conheceu: 'Conta Azul',
        })

        const match = encontrarCorrespondenciaCliente(
          {
            nome: 'Adriano Gelain',
            email: 'AMGELAIN@GMAIL.COM',
          },
          [clienteExistente],
        )

        assert(match !== null, 'Deveria encontrar match por e-mail')
        // Critério pode ser email ou nome similar (ambos válidos)
        assert(match?.criterio === 'email' || match?.criterio === 'nome_similar', 'Critério válido')
      },
    },
    {
      name: 'Lead novo sem correspondência retorna null',
      fn: () => {
        const clienteExistente = mockCliente({
          id: 'cli_5',
          nome: 'Carlos Alberto Lima',
          cpf: '319.482.019-88',
          telefone: '49999345678',
          email: 'comercial@frigorificolima.com.br',
        })

        const match = encontrarCorrespondenciaCliente(
          {
            nome: 'Lucas Gabriel Menegat',
            cpf: '034.881.990-25',
            telefone: '(54) 99933-4411',
            email: 'lucas.menegat@outlook.com',
          },
          [clienteExistente],
        )

        assertEquals(match, null, 'Lead novo não deve ter match')
      },
    },
    {
      name: 'Mesclagem de dados atualiza status para Fechado (já fechou negócio no Conta Azul)',
      fn: () => {
        const clienteExistente = mockCliente({
          id: 'cli_6',
          nome: 'Ademar Fiorini',
          status: 'Novo Lead',
          endereco: 'Linha São Paulo',
          cidade: 'Severiano de Almeida',
          dados_importados: { 'Data do Cadastro': '18/12/2023' },
        })

        const itemPipedrive: ItemRevisaoPipedrive = {
          idTemp: 'temp_1',
          nome: 'Ademar Fiorini',
          telefone: '(54) 99924-2399',
          whatsapp: '(54) 99924-2399',
          email: 'fioriniademar@gmail.com',
          cpf: '727.971.770-53',
          cnpj: '',
          cidade: 'Severiano de Almeida',
          estado: 'RS',
          endereco: 'Linha São Paulo, Km 4',
          statusSugerido: 'Fechado',
          tipo_pessoa: 'fisica',
          valor_estimado: 48000,
          isDuplicadoContaAzul: true,
          acaoDuplicado: 'atualizar',
          aprovadoParaImportar: true,
          dados_importados: { 'Deal Title': 'Usina Solar Rural 12 kWp' },
        }

        const mesclado = mesclarDadosPipedriveNoCadastro(clienteExistente, itemPipedrive)
        assertEquals(mesclado.status, 'Fechado', 'Status mesclado deve ser Fechado')
        assertEquals(mesclado.valor_estimado, 48000, 'Valor estimado deve vir do Pipedrive')
        assertEquals(
          mesclado.dados_importados?.['Deal Title'],
          'Usina Solar Rural 12 kWp',
          'Campos extras do Pipedrive devem ser preservados',
        )
        assertEquals(
          mesclado.dados_importados?.['Data do Cadastro'],
          '18/12/2023',
          'Campos antigos do Conta Azul devem ser mantidos',
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

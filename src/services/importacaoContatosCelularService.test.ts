import { describe, it, expect } from 'vitest'
import {
  parseContatosCsv,
  normalizarTelefoneComparacao,
  telefonesBatem,
  buscarClientePorTelefone,
  processarContatosComClientes,
  CSV_EXEMPLO_DEMONSTRACAO,
} from './importacaoContatosCelularService'
import type { Cliente } from '@/types/crm'

describe('importacaoContatosCelularService', () => {
  describe('normalizarTelefoneComparacao', () => {
    it('deve normalizar telefones com diferentes formatos e máscaras', () => {
      expect(normalizarTelefoneComparacao('(54) 99712-8844')).toBe('54997128844')
      expect(normalizarTelefoneComparacao('+55 54 99712-8844')).toBe('54997128844')
      expect(normalizarTelefoneComparacao('+5554997128844')).toBe('54997128844')
      expect(normalizarTelefoneComparacao('054997128844')).toBe('54997128844')
      expect(normalizarTelefoneComparacao('+55 054 99712-8844')).toBe('54997128844')
      expect(normalizarTelefoneComparacao('54997128844')).toBe('54997128844')
      expect(normalizarTelefoneComparacao('5433211015')).toBe('5433211015')
    })

    it('deve retornar vazio se não informado', () => {
      expect(normalizarTelefoneComparacao('')).toBe('')
      expect(normalizarTelefoneComparacao(null)).toBe('')
      expect(normalizarTelefoneComparacao(undefined)).toBe('')
    })
  })

  describe('telefonesBatem', () => {
    it('deve considerar iguais números com e sem DDI +55', () => {
      expect(telefonesBatem('(54) 99712-8844', '+55 54 99712-8844')).toBe(true)
      expect(telefonesBatem('54997128844', '(54) 99712-8844')).toBe(true)
      expect(telefonesBatem('054997128844', '54997128844')).toBe(true)
    })

    it('deve casar números com variação de nono dígito com o mesmo DDD', () => {
      expect(telefonesBatem('5497128844', '54997128844')).toBe(true)
    })

    it('não deve casar números com DDDs diferentes', () => {
      expect(telefonesBatem('(51) 99712-8844', '(54) 99712-8844')).toBe(false)
    })

    it('não deve casar telefones diferentes', () => {
      expect(telefonesBatem('(54) 99712-8844', '(54) 99344-9988')).toBe(false)
    })
  })

  describe('parseContatosCsv', () => {
    it('deve parsear CSV padrão separado por vírgula', () => {
      const csv = `Nome,Telefone\nMarcelo Becker,(54) 99712-8844\nMaria Santos,+55 54 99812-3456`
      const res = parseContatosCsv(csv)
      expect(res).toHaveLength(2)
      expect(res[0].nome).toBe('Marcelo Becker')
      expect(res[0].telefone).toBe('(54) 99712-8844')
      expect(res[1].nome).toBe('Maria Santos')
      expect(res[1].telefone).toBe('+55 54 99812-3456')
    })

    it('deve parsear CSV separado por ponto-e-vírgula', () => {
      const csv = `Nome;Telefone\nJoão Pedro;54991237890\nCliente Teste;5499887766`
      const res = parseContatosCsv(csv)
      expect(res).toHaveLength(2)
      expect(res[0].nome).toBe('João Pedro')
      expect(res[0].telefone).toBe('54991237890')
    })

    it('deve ser tolerante a ordem trocada de colunas (Telefone, Nome)', () => {
      const csv = `Telefone,Nome\n(54) 99712-8844,Marcelo Becker`
      const res = parseContatosCsv(csv)
      expect(res).toHaveLength(1)
      expect(res[0].nome).toBe('Marcelo Becker')
      expect(res[0].telefone).toBe('(54) 99712-8844')
    })

    it('deve parsear com precisão o CSV_EXEMPLO_DEMONSTRACAO', () => {
      const res = parseContatosCsv(CSV_EXEMPLO_DEMONSTRACAO)
      expect(res).toHaveLength(5)
      expect(res[0].nome).toBe('Marcelo Becker')
      expect(res[1].nome).toBe('Maria Santos')
      expect(res[2].nome).toBe('João Pedro Oliveira')
      expect(res[3].nome).toBe('Marcos Vinicius Souza')
      expect(res[4].nome).toBe('Camila Fernandes Andrade')
    })

    it('deve parsear CSV separado por TAB (exportação TSV)', () => {
      const csv = `Nome\tTelefone\nCarlos Silva\t+555499112233\nMarcos\t54988776655`
      const res = parseContatosCsv(csv)
      expect(res).toHaveLength(2)
      expect(res[0].nome).toBe('Carlos Silva')
      expect(res[0].telefone).toBe('+555499112233')
      expect(res[1].nome).toBe('Marcos')
      expect(res[1].telefone).toBe('54988776655')
    })

    it('deve identificar corretamente colunas em formato do Google Contatos / celular (com vírgulas e parênteses no nome)', () => {
      // Cenário real do bug report:
      // "Adair (Loeri", "Alisson (Erika", "Bem Estar ( Luciano Bettio", "Cassul (", "Mariana Vargas", etc.
      const csv = `Name,Given Name,Additional Name,Family Name,Yomi Name,Given Name Yomi,Additional Name Yomi,Family Name Yomi,Name Prefix,Name Suffix,Initials,Nickname,Short Name,Maiden Name,Birthday,Gender,Location,Billing Information,Directory Server,Mileage,Occupation,Hobby,Sensitivity,Priority,Subject,Notes,Language,Photo,Group Membership,Phone 1 - Type,Phone 1 - Value
"Adair (Loeri da Costa)",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,54991617335
"Alisson (Erika Pastorio)",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,54996562780
"Bem Estar ( Luciano Bettio )",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,5433211015
"Cassul (",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,5435201500
"Mariana Vargas",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,5433210093
"Prefeitura de Erechim",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,5435207000
"Gilmar Passo Fundo",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,54999056500
"Rodrigo Pretto",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,54999005286
"Ricardo Luiz",,,,,,,,,,,,,,,,,,,,,,,,,,,* myContacts,Mobile,54999762349`

      const res = parseContatosCsv(csv)
      expect(res).toHaveLength(9)

      expect(res[0].nome).toBe('Adair (Loeri da Costa)')
      expect(res[0].telefone).toBe('54991617335')

      expect(res[1].nome).toBe('Alisson (Erika Pastorio)')
      expect(res[1].telefone).toBe('54996562780')

      expect(res[2].nome).toBe('Bem Estar ( Luciano Bettio )')
      expect(res[2].telefone).toBe('5433211015')

      expect(res[3].nome).toBe('Cassul (')
      expect(res[3].telefone).toBe('5435201500')

      expect(res[4].nome).toBe('Mariana Vargas')
      expect(res[4].telefone).toBe('5433210093')

      expect(res[7].nome).toBe('Rodrigo Pretto')
      expect(res[7].telefone).toBe('54999005286')

      expect(res[8].nome).toBe('Ricardo Luiz')
      expect(res[8].telefone).toBe('54999762349')
    })

    it('não deve colocar fragmento de nome no campo de telefone quando não houver telefone', () => {
      const csv = `Nome,Telefone\nContato Sem Telefone,Apenas Texto Aqui`
      const res = parseContatosCsv(csv)
      expect(res).toHaveLength(1)
      expect(res[0].nome).toBe('Contato Sem Telefone')
      expect(res[0].telefone).toBe('')
    })

    it('deve suportar auto-detecção por conteúdo mesmo com cabeçalhos não padronizados', () => {
      const csv = `CampoA,CampoB\nMarcelo Silva,54997128844\nOutro Contato,54998123456`
      const res = parseContatosCsv(csv)
      expect(res).toHaveLength(2)
      expect(res[0].nome).toBe('Marcelo Silva')
      expect(res[0].telefone).toBe('54997128844')
    })
  })

  describe('buscarClientePorTelefone & processarContatosComClientes', () => {
    const mockClientes: Partial<Cliente>[] = [
      {
        id: 'c1',
        nome: 'Marcelo Becker',
        telefone: '(54) 99712-8844',
      },
      {
        id: 'c2',
        nome: 'Maria Santos',
        telefone: '(54) 99812-3456',
        whatsapp: '(54) 99812-3456',
      },
      {
        id: 'c3',
        nome: 'João Pedro Oliveira',
        telefone: '(54) 99123-7890',
      },
      {
        id: 'c4',
        nome: 'Alisson Daniel Pastorio (Titular: Erika Simone dos Reis Triches)',
        telefone: '54996562780',
        whatsapp: '54996562780',
      },
      {
        id: 'c5',
        nome: 'Bem Estar Móveis',
        telefone: '5433211015',
        whatsapp: '5433211015',
      },
    ]

    it('deve encontrar cliente existente mesmo com formato de telefone diferente', () => {
      const cliente = buscarClientePorTelefone('+55 54 99712-8844', mockClientes as Cliente[])
      expect(cliente).not.toBeNull()
      expect(cliente?.id).toBe('c1')
      expect(cliente?.nome).toBe('Marcelo Becker')
    })

    it('deve retornar null para telefone não cadastrado', () => {
      const cliente = buscarClientePorTelefone('(54) 99344-9988', mockClientes as Cliente[])
      expect(cliente).toBeNull()
    })

    it('deve classificar exatamente 3 encontrados e 2 não encontrados no dataset de demonstração', () => {
      const contatos = parseContatosCsv(CSV_EXEMPLO_DEMONSTRACAO)
      const resultado = processarContatosComClientes(contatos, mockClientes as Cliente[])

      expect(resultado).toHaveLength(5)

      const encontrados = resultado.filter((r) => r.status === 'encontrado')
      const naoEncontrados = resultado.filter((r) => r.status === 'nao_encontrado')

      expect(encontrados).toHaveLength(3)
      expect(naoEncontrados).toHaveLength(2)

      expect(encontrados[0].clienteNome).toBe('Marcelo Becker')
      expect(encontrados[1].clienteNome).toBe('Maria Santos')
      expect(encontrados[2].clienteNome).toBe('João Pedro Oliveira')

      expect(naoEncontrados[0].nomeCsv).toBe('Marcos Vinicius Souza')
      expect(naoEncontrados[1].nomeCsv).toBe('Camila Fernandes Andrade')
    })

    it('deve casar contatos do celular reais contra a base do CRM', () => {
      const contatos = [
        { nome: 'Alisson (Erika Pastorio)', telefone: '+55 54 99656-2780' },
        { nome: 'Bem Estar ( Luciano Bettio )', telefone: '(54) 3321-1015' },
        { nome: 'Contato Aleatório', telefone: '54999999999' },
      ]
      const resultado = processarContatosComClientes(contatos, mockClientes as Cliente[])

      expect(resultado).toHaveLength(3)
      expect(resultado[0].status).toBe('encontrado')
      expect(resultado[0].clienteId).toBe('c4')
      expect(resultado[0].clienteNome).toBe(
        'Alisson Daniel Pastorio (Titular: Erika Simone dos Reis Triches)',
      )

      expect(resultado[1].status).toBe('encontrado')
      expect(resultado[1].clienteId).toBe('c5')
      expect(resultado[1].clienteNome).toBe('Bem Estar Móveis')

      expect(resultado[2].status).toBe('nao_encontrado')
    })
  })

  describe('Fluxo de Vinculação Manual a Cliente Existente', () => {
    const mockClientes: Partial<Cliente>[] = [
      {
        id: 'c10',
        nome: 'Solar Sul Comércio Ltda',
        telefone: '(54) 3522-0000',
        whatsapp: '5435220000',
        cidade: 'Erechim',
        email: 'contato@solarsul.com.br',
      },
      {
        id: 'c11',
        nome: 'Paulo Roberto Fontana',
        telefone: '(54) 99888-7766',
        cidade: 'Passo Fundo',
      },
    ]

    it('deve simular sobreposição de status quando um contato não encontrado é vinculado manualmente', () => {
      // Contato que não foi encontrado automaticamente
      const contatos = [{ nome: 'Paulo Fontana Celular', telefone: '54991112233' }]
      const resultadoInicial = processarContatosComClientes(contatos, mockClientes as Cliente[])

      expect(resultadoInicial).toHaveLength(1)
      expect(resultadoInicial[0].status).toBe('nao_encontrado')
      expect(resultadoInicial[0].clienteId).toBeUndefined()

      // Aplica a vinculação manual simulada
      const vinculacoesManuaisMap: Record<
        string,
        {
          clienteId: string
          clienteNome: string
          clienteTelefoneAtual?: string
          telefoneAtualizado: boolean
        }
      > = {
        [resultadoInicial[0].id]: {
          clienteId: 'c11',
          clienteNome: 'Paulo Roberto Fontana',
          clienteTelefoneAtual: '(54) 99888-7766',
          telefoneAtualizado: true,
        },
      }

      // Projeção do estado mesclado na página
      const itensComVinculacao = resultadoInicial.map((item) => {
        const manual = vinculacoesManuaisMap[item.id]
        if (manual) {
          return {
            ...item,
            status: 'encontrado' as const,
            clienteId: manual.clienteId,
            clienteNome: manual.clienteNome,
            clienteTelefoneAtual: manual.clienteTelefoneAtual,
            telefoneAtualizado: manual.telefoneAtualizado,
            novoTelefoneAplicado: manual.telefoneAtualizado ? item.telefoneCsv : undefined,
          }
        }
        return item
      })

      expect(itensComVinculacao[0].status).toBe('encontrado')
      expect(itensComVinculacao[0].clienteId).toBe('c11')
      expect(itensComVinculacao[0].clienteNome).toBe('Paulo Roberto Fontana')
      expect(itensComVinculacao[0].telefoneAtualizado).toBe(true)
      expect(itensComVinculacao[0].novoTelefoneAplicado).toBe('54991112233')
    })

    it('deve permitir desvincular mantendo os dados originais do CSV intactos', () => {
      const contatos = [{ nome: 'Contato Teste', telefone: '54992223344' }]
      const resultadoInicial = processarContatosComClientes(contatos, mockClientes as Cliente[])

      let vinculacoesManuaisMap: Record<
        string,
        {
          clienteId: string
          clienteNome: string
          clienteTelefoneAtual?: string
          telefoneAtualizado: boolean
        }
      > = {
        [resultadoInicial[0].id]: {
          clienteId: 'c10',
          clienteNome: 'Solar Sul Comércio Ltda',
          telefoneAtualizado: true,
        },
      }

      // Desvincula (remove do map)
      delete vinculacoesManuaisMap[resultadoInicial[0].id]

      const itensAposDesvincular = resultadoInicial.map((item) => {
        const manual = vinculacoesManuaisMap[item.id]
        if (manual) {
          return {
            ...item,
            status: 'encontrado' as const,
            clienteId: manual.clienteId,
            clienteNome: manual.clienteNome,
          }
        }
        return item
      })

      expect(itensAposDesvincular[0].status).toBe('nao_encontrado')
      expect(itensAposDesvincular[0].clienteId).toBeUndefined()
    })
  })
})

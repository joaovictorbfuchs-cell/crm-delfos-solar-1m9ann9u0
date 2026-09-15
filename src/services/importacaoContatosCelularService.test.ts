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
      expect(normalizarTelefoneComparacao('54997128844')).toBe('54997128844')
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
  })
})

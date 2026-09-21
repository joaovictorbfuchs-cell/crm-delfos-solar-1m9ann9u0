import { describe, it, expect } from 'vitest'
import {
  extrairApenasDigitos,
  removerCodigoPaisBrasil,
  compararTelefones,
  extrairNomeCompletoGoogle,
  extrairTelefonesGoogle,
  parseGoogleContactRow,
  analisarContatoGoogle,
} from './googleContactsImportService'
import { Cliente } from '@/types/crm'

describe('googleContactsImportService', () => {
  describe('extrairApenasDigitos e removerCodigoPaisBrasil', () => {
    it('deve extrair somente dígitos numéricos', () => {
      expect(extrairApenasDigitos('+55 (54) 99123-4567')).toBe('5554991234567')
      expect(extrairApenasDigitos('(54) 3522-1234')).toBe('5435221234')
      expect(extrairApenasDigitos('')).toBe('')
      expect(extrairApenasDigitos(null)).toBe('')
    })

    it('deve remover DDI 55 de números com 12 ou 13 dígitos', () => {
      expect(removerCodigoPaisBrasil('5554991234567')).toBe('54991234567')
      expect(removerCodigoPaisBrasil('555435221234')).toBe('5435221234')
      // Se não tem 55, mantém inalterado
      expect(removerCodigoPaisBrasil('54991234567')).toBe('54991234567')
    })
  })

  describe('compararTelefones', () => {
    it('deve identificar telefones idênticos com formatação variada', () => {
      // Mesmos dígitos exatos
      expect(compararTelefones('(54) 99123-4567', '54991234567')).toBe('identico')
    })

    it('deve identificar formato diferente (com e sem +55)', () => {
      expect(compararTelefones('+55 54 99123-4567', '54991234567')).toBe('semelhante')
      expect(compararTelefones('5554991234567', '(54) 99123-4567')).toBe('semelhante')
    })

    it('deve identificar formato diferente com DDD 54 regional', () => {
      // 99123-4567 (sem DDD) vs (54) 99123-4567 (com DDD 54)
      expect(compararTelefones('991234567', '(54) 99123-4567')).toBe('semelhante')
    })

    it('deve identificar telefones realmente diferentes', () => {
      expect(compararTelefones('(54) 99123-4567', '(54) 98888-1111')).toBe('diferente')
      expect(compararTelefones('(54) 99123-4567', '')).toBe('diferente')
      expect(compararTelefones(null, '(54) 99123-4567')).toBe('diferente')
    })
  })

  describe('extrairNomeCompletoGoogle', () => {
    it('deve concatenar first_name, middle_name e last_name', () => {
      const row = {
        first_name: 'Marcos',
        middle_name: 'Aurélio',
        last_name: 'Ferreira',
      }
      expect(extrairNomeCompletoGoogle(row)).toBe('Marcos Aurélio Ferreira')
    })

    it('deve usar o nome completo quando todo ele estiver na coluna first_name', () => {
      const row = {
        first_name: 'João da Silva Sauro',
        middle_name: '',
        last_name: '',
      }
      expect(extrairNomeCompletoGoogle(row)).toBe('João da Silva Sauro')
    })

    it('deve funcionar com nomes de colunas com espaços ou variações', () => {
      const row = {
        'Given Name': 'Juliana',
        'Family Name': 'Ramos',
      }
      expect(extrairNomeCompletoGoogle(row)).toBe('Juliana Ramos')
    })
  })

  describe('extrairTelefonesGoogle', () => {
    it('deve separar telefone principal e secundários', () => {
      const row = {
        phone_1_value: '+55 54 99876-5432',
        phone_2_value: '+55 54 3522-1100',
        phone_3_value: '(54) 98400-9988',
      }
      const { principal, secundarios } = extrairTelefonesGoogle(row)
      expect(principal).toBe('+55 54 99876-5432')
      expect(secundarios).toHaveLength(2)
      expect(secundarios).toContain('+55 54 3522-1100')
      expect(secundarios).toContain('(54) 98400-9988')
    })
  })

  describe('analisarContatoGoogle', () => {
    const clientesMock: Cliente[] = [
      {
        id: 'cli_1',
        collectionId: 'clientes',
        collectionName: 'clientes',
        nome: 'João da Silva',
        telefone: '(54) 99123-4567',
        whatsapp: '(54) 99123-4567',
        cidade: 'Erechim',
        endereco: 'Rua A, 100',
        uc: '12345',
        potencia_kwp: 5,
        valor_estimado: 20000,
        status: 'Fechado',
        data_instalacao: '',
        inversor_marca: '',
        inversor_modelo: '',
        placas_qtd: 10,
        placas_marca: '',
        telhado_tipo: 'metalico',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
      {
        id: 'cli_2',
        collectionId: 'clientes',
        collectionName: 'clientes',
        nome: 'Marcos Aurélio Ferreira',
        telefone: '(54) 3522-9999',
        whatsapp: '(54) 3522-9999',
        cidade: 'Passo Fundo',
        endereco: '',
        uc: '',
        potencia_kwp: 0,
        valor_estimado: 0,
        status: 'Novo Lead',
        data_instalacao: '',
        inversor_marca: '',
        inversor_modelo: '',
        placas_qtd: 0,
        placas_marca: '',
        telhado_tipo: 'ceramico',
        created: '2026-01-01',
        updated: '2026-01-01',
      },
    ]

    it('deve marcar como "correto" quando o telefone for idêntico', () => {
      const parsed = parseGoogleContactRow(
        {
          first_name: 'João da Silva',
          phone_1_value: '(54) 99123-4567',
          address_1_city: 'Erechim',
        },
        0,
      )

      const resultado = analisarContatoGoogle(parsed, clientesMock)
      expect(resultado.statusComparacao).toBe('correto')
      expect(resultado.ehDivergencia).toBe(false)
      expect(resultado.resolvido).toBe(true)
    })

    it('deve marcar como "formato_diferente" quando a diferença for apenas +55 ou espaços', () => {
      const parsed = parseGoogleContactRow(
        {
          first_name: 'João da Silva',
          phone_1_value: '+55 54 99123-4567',
          address_1_city: 'Erechim',
        },
        1,
      )

      const resultado = analisarContatoGoogle(parsed, clientesMock)
      expect(resultado.statusComparacao).toBe('formato_diferente')
      expect(resultado.ehDivergencia).toBe(false)
      expect(resultado.resolvido).toBe(true)
    })

    it('deve identificar divergência de WhatsApp quando o cliente existe com WhatsApp diferente', () => {
      const parsed = parseGoogleContactRow(
        {
          first_name: 'Marcos',
          middle_name: 'Aurélio',
          last_name: 'Ferreira',
          phone_1_value: '(54) 99876-5432', // diferente do WhatsApp cadastrado 3522-9999
          address_1_city: 'Passo Fundo',
        },
        2,
      )

      const resultado = analisarContatoGoogle(parsed, clientesMock)
      expect(resultado.ehDivergencia).toBe(true)
      expect(resultado.whatsappDiverge).toBe(true)
      expect(resultado.statusComparacao).toBe('divergente_whatsapp')
      expect(resultado.clienteBanco?.id).toBe('cli_2')
      expect(resultado.acaoSelecionada).toBe('atualizar')
    })

    it('deve marcar como "nao_encontrado" e sugerir "adicionar_novo" para contatos inéditos', () => {
      const parsed = parseGoogleContactRow(
        {
          first_name: 'Novo Cliente Inédito',
          phone_1_value: '(54) 99999-0000',
          address_1_city: 'Marau',
        },
        3,
      )

      const resultado = analisarContatoGoogle(parsed, clientesMock)
      expect(resultado.statusComparacao).toBe('nao_encontrado')
      expect(resultado.ehDivergencia).toBe(true)
      expect(resultado.acaoSelecionada).toBe('adicionar_novo')
      expect(resultado.clienteBanco).toBeUndefined()
    })
  })
})

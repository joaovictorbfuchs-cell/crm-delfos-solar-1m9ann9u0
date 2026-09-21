import { describe, it, expect } from 'vitest'
import {
  extrairApenasDigitos,
  removerCodigoPaisBrasil,
  normalizarTelefoneDelfos,
  normalizarCoreTelefone,
  compararTelefones,
  extrairNomeCompletoGoogle,
  extrairTelefonesGoogle,
  parseGoogleContactRow,
  analisarContatoGoogle,
  ItemComparacaoGoogle,
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

  describe('normalizarTelefoneDelfos (regras 55 Brasil e 54 RS)', () => {
    it('deve assumir 55 (Brasil) e 54 (região Delfos Solar) para números sem código de país e sem DDD', () => {
      // Celular com 9 dígitos sem DDD
      const cel9 = normalizarTelefoneDelfos('99123-4567')
      expect(cel9).not.toBeNull()
      expect(cel9?.ddd).toBe('54')
      expect(cel9?.numeroLocal).toBe('991234567')
      expect(cel9?.digitosNacionais).toBe('54991234567')
      expect(cel9?.digitosCompletos55).toBe('5554991234567')
      expect(cel9?.formatado).toBe('(54) 99123-4567')

      // Celular com espaços "9 9999-9999"
      const cel9Espaco = normalizarTelefoneDelfos('9 9999-9999')
      expect(cel9Espaco?.ddd).toBe('54')
      expect(cel9Espaco?.digitosNacionais).toBe('54999999999')
      expect(cel9Espaco?.formatado).toBe('(54) 99999-9999')

      // Fixo com 8 dígitos sem DDD
      const fixo8 = normalizarTelefoneDelfos('3522-1234')
      expect(fixo8).not.toBeNull()
      expect(fixo8?.ddd).toBe('54')
      expect(fixo8?.numeroLocal).toBe('35221234')
      expect(fixo8?.digitosNacionais).toBe('5435221234')
      expect(fixo8?.digitosCompletos55).toBe('555435221234')
      expect(fixo8?.formatado).toBe('(54) 3522-1234')
    })

    it('deve preservar DDDs diferentes de 54 quando o DDD for informado', () => {
      // DDD 51 (Porto Alegre)
      const ddd51 = normalizarTelefoneDelfos('(51) 98888-7766')
      expect(ddd51?.ddd).toBe('51')
      expect(ddd51?.numeroLocal).toBe('988887766')
      expect(ddd51?.digitosNacionais).toBe('51988887766')
      expect(ddd51?.formatado).toBe('(51) 98888-7766')

      // DDD 49 (Chapecó/SC) com +55
      const ddd49 = normalizarTelefoneDelfos('+55 49 99988-1122')
      expect(ddd49?.ddd).toBe('49')
      expect(ddd49?.digitosNacionais).toBe('49999881122')
      expect(ddd49?.formatado).toBe('(49) 99988-1122')
    })

    it('deve remover DDI 55 de números com 12 ou 13 dígitos e preservar DDD', () => {
      const com55 = normalizarTelefoneDelfos('+55 54 99123-4567')
      expect(com55?.ddd).toBe('54')
      expect(com55?.digitosNacionais).toBe('54991234567')
      expect(com55?.formatado).toBe('(54) 99123-4567')
    })

    it('deve retornar null para números com menos de 8 dígitos', () => {
      expect(normalizarTelefoneDelfos('')).toBeNull()
      expect(normalizarTelefoneDelfos('12345')).toBeNull()
      expect(normalizarTelefoneDelfos(null)).toBeNull()
    })

    it('normalizarCoreTelefone deve retornar DDD+número com 54 assumido', () => {
      expect(normalizarCoreTelefone('99123-4567')).toBe('54991234567')
      expect(normalizarCoreTelefone('3522-1234')).toBe('5435221234')
      expect(normalizarCoreTelefone('+55 54 99123-4567')).toBe('54991234567')
      expect(normalizarCoreTelefone('51988887766')).toBe('51988887766')
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
      // fixo 3522-1234 sem DDD vs (54) 3522-1234 com DDD 54
      expect(compararTelefones('35221234', '(54) 3522-1234')).toBe('semelhante')
      expect(compararTelefones('3522-1234', '+55 54 3522-1234')).toBe('semelhante')
      // celular sem DDD vs com +55 54
      expect(compararTelefones('9 9999-9999', '+55 54 99999-9999')).toBe('semelhante')
    })

    it('deve comparar corretamente nos dois sentidos (CSV sem DDD vs Banco com DDD 54 e vice-versa)', () => {
      expect(compararTelefones('(54) 99123-4567', '99123-4567')).toBe('semelhante')
      expect(compararTelefones('(54) 3522-1234', '35221234')).toBe('semelhante')
    })

    it('deve identificar telefones de DDDs diferentes como diferentes mesmo se o número local for igual', () => {
      // DDD 54 (Erechim/RS) vs DDD 51 (Porto Alegre) com mesmo número local
      expect(compararTelefones('(54) 99123-4567', '(51) 99123-4567')).toBe('diferente')
      // CSV sem DDD (assume 54) vs cliente cadastrado com DDD 51
      expect(compararTelefones('99123-4567', '(51) 99123-4567')).toBe('diferente')
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

  describe('Ações de divergência e novos campos', () => {
    it('deve suportar tipo AcaoDivergenciaGoogle com vincular e ignorar', () => {
      const item: Partial<ItemComparacaoGoogle> = {
        acaoSelecionada: 'vincular',
        clienteDestinoVinculo: {
          id: 'cli_123',
          nome: 'Cliente Escolhido',
        } as any,
      }
      expect(item.acaoSelecionada).toBe('vincular')
      expect(item.clienteDestinoVinculo?.id).toBe('cli_123')

      item.acaoSelecionada = 'ignorar'
      expect(item.acaoSelecionada).toBe('ignorar')
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

    it('deve reconhecer cliente do banco quando número do Google vem SEM DDD e SEM código do país (9 dígitos)', () => {
      // Cliente João da Silva tem (54) 99123-4567 no banco
      // No Google veio apenas "99123-4567" ou "991234567"
      const parsed = parseGoogleContactRow(
        {
          first_name: 'João da Silva Sauro',
          phone_1_value: '99123-4567',
          address_1_city: 'Erechim',
        },
        10,
      )

      const resultado = analisarContatoGoogle(parsed, clientesMock)
      // Deve casar com João da Silva como formato_diferente (não como divergência de erro)
      expect(resultado.ehDivergencia).toBe(false)
      expect(resultado.statusComparacao).toBe('formato_diferente')
      expect(resultado.clienteBanco?.id).toBe('cli_1')
      expect(resultado.telefoneNormalizadoCompleto).toBe('(54) 99123-4567')
    })

    it('deve reconhecer cliente do banco quando telefone fixo vem SEM DDD (8 dígitos)', () => {
      // Cliente Marcos tem (54) 3522-9999 no banco
      // No Google veio apenas "3522-9999" ou "35229999"
      const parsed = parseGoogleContactRow(
        {
          first_name: 'Marcos Ferreira',
          phone_1_value: '3522-9999',
          address_1_city: 'Passo Fundo',
        },
        11,
      )

      const resultado = analisarContatoGoogle(parsed, clientesMock)
      expect(resultado.ehDivergencia).toBe(false)
      expect(resultado.statusComparacao).toBe('formato_diferente')
      expect(resultado.clienteBanco?.id).toBe('cli_2')
      expect(resultado.telefoneNormalizadoCompleto).toBe('(54) 3522-9999')
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

    it('deve permitir configurar decisão de vincular a cliente existente para virar contato adicional', () => {
      const parsed = parseGoogleContactRow(
        {
          first_name: 'Esposa do João',
          phone_1_value: '(54) 99888-1122',
          phone_2_value: '(54) 3522-8877',
          address_1_city: 'Erechim',
        },
        4,
      )

      const resultado = analisarContatoGoogle(parsed, clientesMock)
      expect(resultado.ehDivergencia).toBe(true)
      // Pode ser vinculado manualmente pelo usuário ao cliente cli_1
      const resultadoComVinculo: ItemComparacaoGoogle = {
        ...resultado,
        acaoSelecionada: 'vincular',
        clienteDestinoVinculo: clientesMock[0],
        resolvido: true,
      }
      expect(resultadoComVinculo.acaoSelecionada).toBe('vincular')
      expect(resultadoComVinculo.clienteDestinoVinculo?.id).toBe('cli_1')
      expect(resultadoComVinculo.telefoneNormalizadoCompleto).toBe('(54) 99888-1122')
    })
  })
})

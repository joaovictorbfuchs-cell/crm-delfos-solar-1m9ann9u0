import { describe, it, expect } from 'vitest'
import {
  normalizarNomeComparacao,
  verificarTelefonesIguais,
  buscarClientePorNome,
  analisarLinhaContatoCsv,
  extrairCamposDaLinhaCsv,
} from './importacaoCsvContatosService'
import { Cliente } from '@/types/crm'

describe('importacaoCsvContatosService', () => {
  describe('normalizarNomeComparacao', () => {
    it('ignora diferenças de maiúsculas, acentos e símbolos', () => {
      expect(normalizarNomeComparacao('João Victor Fuchs')).toBe('joao victor fuchs')
      expect(normalizarNomeComparacao('JOÃO VICTOR FUCHS!')).toBe('joao victor fuchs')
      expect(normalizarNomeComparacao('  João - Victor / Fuchs  ')).toBe('joao victor fuchs')
      expect(normalizarNomeComparacao('Renée C. Älvares')).toBe('renee c alvares')
    })
  })

  describe('verificarTelefonesIguais', () => {
    it('reconhece igualdade com e sem máscara, +55 e espaços', () => {
      expect(verificarTelefonesIguais('(54) 99123-4567', '54991234567')).toBe(true)
      expect(verificarTelefonesIguais('+55 54 99123-4567', '54991234567')).toBe(true)
      expect(verificarTelefonesIguais('99123-4567', '54991234567')).toBe(true)
      expect(verificarTelefonesIguais('54 3522-1234', '(54) 3522-1234')).toBe(true)
    })

    it('identifica quando números são realmente diferentes', () => {
      expect(verificarTelefonesIguais('(54) 99123-4567', '(54) 98888-7777')).toBe(false)
      expect(verificarTelefonesIguais('(54) 3522-1234', '(51) 3522-1234')).toBe(false)
    })
  })

  describe('buscarClientePorNome', () => {
    const clientes: Cliente[] = [
      {
        id: 'c1',
        nome: 'João Victor Bagetti Fuchs',
        telefone: '(54) 3522-0000',
        whatsapp: '(54) 98110-8228',
      } as Cliente,
      {
        id: 'c2',
        nome: 'Ademar Fiorini',
        telefone: '(54) 99924-2399',
        whatsapp: '(54) 99924-2399',
      } as Cliente,
    ]

    it('encontra cliente ignorando acentos, maiúsculas e símbolos', () => {
      const achado = buscarClientePorNome('joao victor bagetti fuchs', clientes)
      expect(achado?.id).toBe('c1')

      const achadoComSimbolo = buscarClientePorNome('JOÃO VICTOR - BAGETTI FUCHS!', clientes)
      expect(achadoComSimbolo?.id).toBe('c1')
    })

    it('retorna undefined quando não encontra', () => {
      const achado = buscarClientePorNome('Carlos Eduardo Silva', clientes)
      expect(achado).toBeUndefined()
    })
  })

  describe('analisarLinhaContatoCsv', () => {
    const clientes: Cliente[] = [
      {
        id: 'c1',
        nome: 'João Victor Bagetti Fuchs',
        telefone: '(54) 3522-0000',
        whatsapp: '(54) 98110-8228',
      } as Cliente,
    ]

    it('quando número for igual ao WhatsApp ou Telefone do cadastro: status identico e resolvido sem perguntar', () => {
      const row = {
        Nome: 'João Victor Bagetti Fuchs',
        Telefone: '54 98110-8228',
      }
      const item = analisarLinhaContatoCsv(row, ['Nome', 'Telefone'], clientes, 0)
      expect(item.status).toBe('identico')
      expect(item.resolvido).toBe(true)
      expect(item.decisao).toBe('manter_atual')
      expect(item.clienteEncontrado?.id).toBe('c1')
    })

    it('quando número for diferente do cadastro: status diferente e não resolvido (pergunta ao usuário)', () => {
      const row = {
        Nome: 'João Victor Bagetti Fuchs',
        Telefone: '(54) 99999-8888',
      }
      const item = analisarLinhaContatoCsv(row, ['Nome', 'Telefone'], clientes, 0)
      expect(item.status).toBe('diferente')
      expect(item.resolvido).toBe(false)
      expect(item.clienteEncontrado?.id).toBe('c1')
      expect(item.whatsappAtual).toBe('(54) 98110-8228')
    })

    it('quando contato não existir no cadastro: status nao_encontrado (oferece criar ou mesclar)', () => {
      const row = {
        Nome: 'Novo Cliente Desconhecido',
        Telefone: '(54) 99111-2222',
      }
      const item = analisarLinhaContatoCsv(row, ['Nome', 'Telefone'], clientes, 0)
      expect(item.status).toBe('nao_encontrado')
      expect(item.resolvido).toBe(false)
      expect(item.clienteEncontrado).toBeUndefined()
      expect(item.decisao).toBe('criar_novo')
    })
  })

  describe('extrairCamposDaLinhaCsv', () => {
    it('detecta colunas flexíveis com diferentes cabeçalhos', () => {
      const row = {
        'Razão Social': 'Empresa Solar Ltda',
        WhatsApp: '(54) 99123-4567',
        'E-mail': 'contato@solar.com',
        Município: 'Erechim',
      }
      const extraido = extrairCamposDaLinhaCsv(row, Object.keys(row))
      expect(extraido.nome).toBe('Empresa Solar Ltda')
      expect(extraido.telefone).toBe('(54) 99123-4567')
      expect(extraido.email).toBe('contato@solar.com')
      expect(extraido.cidade).toBe('Erechim')
    })

    it('fallback para primeira coluna se não tiver cabeçalho reconhecido', () => {
      const row = {
        col1: 'Lucas Menegat',
        col2: '54999998888',
      }
      const extraido = extrairCamposDaLinhaCsv(row, ['col1', 'col2'])
      expect(extraido.nome).toBe('Lucas Menegat')
      expect(extraido.telefone).toBe('54999998888')
    })
  })
})

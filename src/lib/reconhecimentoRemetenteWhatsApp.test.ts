import { describe, it, expect } from 'vitest'
import {
  normalizarNumeroWhatsApp,
  decomporTelefone,
  compararTelefonesFlexivel,
  casarRemetenteComContatos,
} from './reconhecimentoRemetenteWhatsApp'

describe('Reconhecimento flexível de remetente WhatsApp', () => {
  describe('1. Normalização de números de telefone', () => {
    it('deve remover máscaras, parênteses, hífens e espaços', () => {
      expect(normalizarNumeroWhatsApp('(54) 3231-0000')).toBe('5432310000')
      expect(normalizarNumeroWhatsApp('(54) 93231-0000')).toBe('54932310000')
      expect(normalizarNumeroWhatsApp('  54 99123-4567  ')).toBe('54991234567')
    })

    it('deve remover DDI brasileiro +55 e 55', () => {
      expect(normalizarNumeroWhatsApp('+55 (54) 3231-0000')).toBe('5432310000')
      expect(normalizarNumeroWhatsApp('+5554932310000')).toBe('54932310000')
      expect(normalizarNumeroWhatsApp('555432310000')).toBe('5432310000')
      expect(normalizarNumeroWhatsApp('5554932310000')).toBe('54932310000')
    })

    it('deve remover sufixos de JID do WhatsApp como @c.us e :1@s.whatsapp.net', () => {
      expect(normalizarNumeroWhatsApp('5554932310000@c.us')).toBe('54932310000')
      expect(normalizarNumeroWhatsApp('54932310000:1@s.whatsapp.net')).toBe('54932310000')
    })

    it('deve tratar zeros à esquerda e prefixo de operadora', () => {
      expect(normalizarNumeroWhatsApp('054932310000')).toBe('54932310000')
      expect(normalizarNumeroWhatsApp('02154932310000')).toBe('54932310000')
    })

    it('deve inferir DDD 54 padrão se receber apenas 8 ou 9 dígitos locais', () => {
      expect(normalizarNumeroWhatsApp('3231-0000')).toBe('5432310000')
      expect(normalizarNumeroWhatsApp('93231-0000')).toBe('54932310000')
    })

    it('deve retornar string vazia para entradas nulas ou inválidas', () => {
      expect(normalizarNumeroWhatsApp(null)).toBe('')
      expect(normalizarNumeroWhatsApp(undefined)).toBe('')
      expect(normalizarNumeroWhatsApp('')).toBe('')
      expect(normalizarNumeroWhatsApp('abc')).toBe('')
    })
  })

  describe('2. Decomposição de telefones', () => {
    it('deve decompor número fixo com DDD (10 dígitos)', () => {
      const dec = decomporTelefone('(54) 3231-0000')
      expect(dec).not.toBeNull()
      expect(dec?.ddd).toBe('54')
      expect(dec?.ultimos8).toBe('32310000')
      expect(dec?.temNonoDigito).toBe(false)
      expect(dec?.e164).toBe('555432310000')
    })

    it('deve decompor celular com nono dígito (11 dígitos)', () => {
      const dec = decomporTelefone('+55 54 99323-0000')
      expect(dec).not.toBeNull()
      expect(dec?.ddd).toBe('54')
      expect(dec?.ultimos8).toBe('93230000')
      expect(dec?.temNonoDigito).toBe(true)
      expect(dec?.e164).toBe('5554993230000')
    })
  })

  describe('3. Casamento com tolerância ao nono dígito (8 vs 9 e 9 vs 8)', () => {
    it('deve casar números com e sem o nono dígito no mesmo DDD nos dois sentidos', () => {
      // 8 dígitos no cadastro vs 9 dígitos recebido
      expect(compararTelefonesFlexivel('(54) 3231-0000', '(54) 93231-0000')).toBe(
        'tolerante_nono_digito',
      )

      // 9 dígitos no cadastro vs 8 dígitos recebido
      expect(compararTelefonesFlexivel('(54) 93231-0000', '(54) 3231-0000')).toBe(
        'tolerante_nono_digito',
      )

      // Com e sem DDI +55
      expect(compararTelefonesFlexivel('+55 54 93231-0000', '54 3231-0000')).toBe(
        'tolerante_nono_digito',
      )
    })

    it('deve retornar "exato" quando os números tiverem o mesmo formato e valor', () => {
      expect(compararTelefonesFlexivel('(54) 99123-4567', '+55 (54) 99123-4567')).toBe('exato')
      expect(compararTelefonesFlexivel('5432310000', '(54) 3231-0000')).toBe('exato')
    })

    it('NÃO deve casar se o DDD for diferente, mesmo com mesmos 8 dígitos finais', () => {
      expect(compararTelefonesFlexivel('(51) 93231-0000', '(54) 93231-0000')).toBe('nenhum')
      expect(compararTelefonesFlexivel('(11) 3231-0000', '(54) 93231-0000')).toBe('nenhum')
    })

    it('NÃO deve casar se os 8 dígitos finais forem diferentes', () => {
      expect(compararTelefonesFlexivel('(54) 93231-0000', '(54) 93231-1111')).toBe('nenhum')
    })
  })

  describe('4. Casamento com contatos do cliente (prioridade exata vs ambiguidade)', () => {
    const clientesBase = [
      {
        id: 'cli-1',
        nome: 'Supermercado Central',
        whatsapp: '(54) 3231-0000', // 8 dígitos no cadastro
        telefone: '5432310000',
      },
      {
        id: 'cli-2',
        nome: 'Fazenda Sol Nascente',
        whatsapp: '(54) 99888-7777', // 9 dígitos
        telefone: '(54) 3322-1100',
      },
    ]

    const contatosAdicionaisBase = [
      {
        id: 'ca-1',
        cliente: 'cli-1',
        nome: 'Gerente Financeiro Marcos',
        telefone: '(54) 99111-2222',
        papel: 'financeiro',
      },
      {
        id: 'ca-2',
        cliente: 'cli-2',
        nome: 'Rodrigo Becker Engenheiro',
        telefone: '(54) 3222-3333',
        papel: 'tecnico',
      },
    ]

    it('deve casar com tolerância ao 9º dígito quando o webhook receber 9 dígitos e o cliente tiver 8 cadastrados', () => {
      // Recebido do webhook do WhatsApp com 9 dígitos: +5554932310000
      const res = casarRemetenteComContatos('+5554932310000', clientesBase, contatosAdicionaisBase)

      expect(res.status).toBe('exato_unico')
      expect(res.contatoPrincipal?.clienteId).toBe('cli-1')
      expect(res.contatoPrincipal?.clienteNome).toBe('Supermercado Central')
      expect(res.contatoPrincipal?.tipoMatch).toBe('tolerante_nono_digito')
    })

    it('deve casar nos dois sentidos: webhook envia 8 dígitos e cliente tem 9 cadastrados', () => {
      const res = casarRemetenteComContatos(
        '5498887777', // 8 dígitos
        clientesBase,
        contatosAdicionaisBase,
      )

      expect(res.status).toBe('exato_unico')
      expect(res.contatoPrincipal?.clienteId).toBe('cli-2')
      expect(res.contatoPrincipal?.tipoMatch).toBe('tolerante_nono_digito')
    })

    it('deve reconhecer contato adicional do cliente com casamento exato e com tolerância', () => {
      // Exato no contato adicional
      const resExato = casarRemetenteComContatos(
        '+55 (54) 99111-2222',
        clientesBase,
        contatosAdicionaisBase,
      )
      expect(resExato.status).toBe('exato_unico')
      expect(resExato.contatoPrincipal?.clienteId).toBe('cli-1')
      expect(resExato.contatoPrincipal?.contatoNome).toBe('Gerente Financeiro Marcos')
      expect(resExato.contatoPrincipal?.origem).toBe('contato_adicional')
      expect(resExato.contatoPrincipal?.tipoMatch).toBe('exato')

      // Tolerante no contato adicional (Rodrigo Becker tem 8 dígitos 3222-3333, recebe 9 dígitos 93222-3333)
      const resTolerante = casarRemetenteComContatos(
        '5554932223333',
        clientesBase,
        contatosAdicionaisBase,
      )
      expect(resTolerante.status).toBe('exato_unico')
      expect(resTolerante.contatoPrincipal?.clienteId).toBe('cli-2')
      expect(resTolerante.contatoPrincipal?.contatoNome).toBe('Rodrigo Becker Engenheiro')
      expect(resTolerante.contatoPrincipal?.tipoMatch).toBe('tolerante_nono_digito')
    })

    it('deve dar PRIORIDADE ao contato cujo número bata EXATAMENTE sobre o tolerante', () => {
      const clientesComConflito = [
        {
          id: 'cli-exato',
          nome: 'Cliente Exato',
          whatsapp: '(54) 93231-0000', // 9 dígitos exatos
        },
        {
          id: 'cli-tolerante',
          nome: 'Cliente Tolerante',
          whatsapp: '(54) 3231-0000', // 8 dígitos
        },
      ]

      // Chega mensagem de (54) 93231-0000
      const res = casarRemetenteComContatos('5554932310000', clientesComConflito, [])

      // O exato deve vencer e ser exato_unico, registrando direto sem perguntar!
      expect(res.status).toBe('exato_unico')
      expect(res.contatoPrincipal?.clienteId).toBe('cli-exato')
      expect(res.contatoPrincipal?.tipoMatch).toBe('exato')
    })

    it('deve sinalizar status "ambiguo" se houver múltiplos contatos compatíveis e nenhum exato único', () => {
      const clientesAmbiguos = [
        {
          id: 'cli-a',
          nome: 'João da Silva',
          whatsapp: '(54) 3231-0000',
        },
        {
          id: 'cli-b',
          nome: 'Maria da Silva',
          telefone: '(54) 3231-0000',
        },
      ]

      // Chega mensagem com 9 dígitos (54) 93231-0000
      const res = casarRemetenteComContatos('(54) 93231-0000', clientesAmbiguos, [])

      expect(res.status).toBe('ambiguo')
      expect(res.candidatosCompativeis.length).toBe(2)
      expect(res.candidatosCompativeis.map((c) => c.clienteId)).toContain('cli-a')
      expect(res.candidatosCompativeis.map((c) => c.clienteId)).toContain('cli-b')
    })

    it('deve retornar status "nenhum" se nenhum cliente ou contato for compatível', () => {
      const res = casarRemetenteComContatos(
        '+55 (47) 99999-9999',
        clientesBase,
        contatosAdicionaisBase,
      )
      expect(res.status).toBe('nenhum')
      expect(res.candidatosCompativeis).toHaveLength(0)
    })
  })
})

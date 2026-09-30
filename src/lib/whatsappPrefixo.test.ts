import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import {
  obterPrimeiroNomeUsuarioLogado,
  aplicarPrefixoMensagemManual,
  jaPossuiPrefixoManual,
  REGEX_PREFIXO_MANUAL,
} from './whatsappPrefixo'

describe('whatsappPrefixo', () => {
  beforeEach(() => {
    pb.authStore.clear()
  })

  afterEach(() => {
    pb.authStore.clear()
  })

  describe('obterPrimeiroNomeUsuarioLogado', () => {
    it('retorna fallback quando não há usuário logado', () => {
      expect(obterPrimeiroNomeUsuarioLogado()).toBe('Atendente')
      expect(obterPrimeiroNomeUsuarioLogado('Consultor')).toBe('Consultor')
    })

    it('retorna a primeira palavra do campo name', () => {
      pb.authStore.save('fake-token', {
        id: 'u1',
        name: 'Daniel Silveira Pereira',
      } as any)
      expect(obterPrimeiroNomeUsuarioLogado()).toBe('Daniel')
    })

    it('retorna a primeira palavra quando o nome é composto com espaços extras', () => {
      pb.authStore.save('fake-token', {
        id: 'u2',
        name: '  Cassio   Bortolini ',
      } as any)
      expect(obterPrimeiroNomeUsuarioLogado()).toBe('Cassio')
    })

    it('usa campo nome caso name não exista', () => {
      pb.authStore.save('fake-token', {
        id: 'u3',
        nome: 'João Victor Santos',
      } as any)
      expect(obterPrimeiroNomeUsuarioLogado()).toBe('João')
    })

    it('usa campo username caso name e nome não existam', () => {
      pb.authStore.save('fake-token', {
        id: 'u4',
        username: 'marcos.dev',
      } as any)
      expect(obterPrimeiroNomeUsuarioLogado()).toBe('marcos.dev')
    })
  })

  describe('jaPossuiPrefixoManual e REGEX_PREFIXO_MANUAL', () => {
    it('detecta prefixos válidos', () => {
      expect(jaPossuiPrefixoManual('[Daniel]: Olá, tudo bem?')).toBe(true)
      expect(jaPossuiPrefixoManual('[Cassio]: Proposta solar')).toBe(true)
      expect(jaPossuiPrefixoManual('[João Victor]: Segue o documento')).toBe(true)
      expect(jaPossuiPrefixoManual('  [Atendente]: bom dia')).toBe(true)
    })

    it('rejeita mensagens sem prefixo ou com outros colchetes', () => {
      expect(jaPossuiPrefixoManual('Olá, tudo bem?')).toBe(false)
      expect(jaPossuiPrefixoManual('[Delfos Solar]')).toBe(false)
      expect(jaPossuiPrefixoManual('')).toBe(false)
      expect(jaPossuiPrefixoManual('Conta [0123]: R$ 500')).toBe(false)
    })
  })

  describe('aplicarPrefixoMensagemManual', () => {
    it('aplica prefixo com nome do usuário logado', () => {
      pb.authStore.save('fake-token', {
        id: 'u1',
        name: 'Daniel Silveira',
      } as any)

      const resultado = aplicarPrefixoMensagemManual('Olá, tudo bem?')
      expect(resultado).toBe('[Daniel]: Olá, tudo bem?')
    })

    it('não duplica se o texto já tiver prefixo', () => {
      pb.authStore.save('fake-token', {
        id: 'u1',
        name: 'Daniel Silveira',
      } as any)

      const texto = '[Daniel]: Olá, tudo bem?'
      expect(aplicarPrefixoMensagemManual(texto)).toBe(texto)

      const textoComOutro = '[Cassio]: Já mandei'
      expect(aplicarPrefixoMensagemManual(textoComOutro)).toBe(textoComOutro)
    })

    it('aceita nomeCustomizado e extrai o primeiro nome dele', () => {
      const resultado = aplicarPrefixoMensagemManual('Seguem os dados', 'Lucas Gabriel')
      expect(resultado).toBe('[Lucas]: Seguem os dados')
    })

    it('retorna string vazia se o texto de entrada for vazio ou só espaços', () => {
      expect(aplicarPrefixoMensagemManual('')).toBe('')
      expect(aplicarPrefixoMensagemManual('   ')).toBe('')
    })
  })
})

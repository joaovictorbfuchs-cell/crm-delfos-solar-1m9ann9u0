import { describe, it, expect } from 'vitest'
import {
  aplicarPlaceholdersProposta,
  validarNumeroWhatsApp,
  extrairContextoProposta,
  TEMPLATES_PROPOSTA_WHATSAPP,
} from './propostaWhatsAppService'
import type { Cliente, OrcamentoSolar } from '@/types/crm'

describe('propostaWhatsAppService', () => {
  describe('validarNumeroWhatsApp', () => {
    it('valida número de celular comum com DDD', () => {
      const res = validarNumeroWhatsApp('54991292121')
      expect(res.valido).toBe(true)
      expect(res.numeroLimpo).toBe('54991292121')
      expect(res.numeroFormatado).toBe('(54) 99129-2121')
      expect(res.temDdd).toBe(true)
      expect(res.isCelular).toBe(true)
    })

    it('valida número formatado vindo com parênteses e traço', () => {
      const res = validarNumeroWhatsApp('(54) 98110-8228')
      expect(res.valido).toBe(true)
      expect(res.numeroLimpo).toBe('54981108228')
      expect(res.numeroFormatado).toBe('(54) 98110-8228')
    })

    it('remove DDI 55 antes de validar se tem 12 ou 13 dígitos', () => {
      const res = validarNumeroWhatsApp('5554991292121')
      expect(res.valido).toBe(true)
      expect(res.numeroLimpo).toBe('54991292121')
      expect(res.numeroFormatado).toBe('(54) 99129-2121')
    })

    it('rejeita número com menos de 10 dígitos (sem DDD)', () => {
      const res = validarNumeroWhatsApp('991292121')
      expect(res.valido).toBe(false)
      expect(res.mensagemErro).toContain('mínimo 10')
    })

    it('rejeita número vazio ou nulo', () => {
      expect(validarNumeroWhatsApp('').valido).toBe(false)
      expect(validarNumeroWhatsApp(null).valido).toBe(false)
      expect(validarNumeroWhatsApp(undefined).valido).toBe(false)
    })

    it('rejeita número com mais de 11 dígitos que não seja DDI 55', () => {
      const res = validarNumeroWhatsApp('123456789012345')
      expect(res.valido).toBe(false)
    })
  })

  describe('aplicarPlaceholdersProposta', () => {
    it('substitui placeholders {chave} em texto', () => {
      const template =
        'Olá {nome_cliente}, sua proposta em {cidade} de {valor} feita por {consultor}.'
      const contexto = {
        nome_cliente: 'Carlos',
        cidade: 'Erechim',
        valor: 'R$ 45.000,00',
        consultor: 'João Victor',
      }
      const resultado = aplicarPlaceholdersProposta(template, contexto)
      expect(resultado).toBe(
        'Olá Carlos, sua proposta em Erechim de R$ 45.000,00 feita por João Victor.',
      )
    })

    it('substitui placeholders {{chave}} em formato duplo (compatibilidade)', () => {
      const template = 'Olá {{nome_cliente}}, empresa {{empresa}}, tipo {{tipo}}.'
      const contexto = {
        nome_cliente: 'Mariana',
        empresa: 'Delfos Solar',
        tipo: 'Comercial',
      }
      const resultado = aplicarPlaceholdersProposta(template, contexto)
      expect(resultado).toBe('Olá Mariana, empresa Delfos Solar, tipo Comercial.')
    })

    it('substitui todos os templates pré-definidos sem deixar tags {nome_cliente} sobrando', () => {
      const contexto = {
        nome_cliente: 'Lucas',
        consultor: 'João Victor',
        valor: 'R$ 38.500,00',
        tipo: 'Residencial',
        cidade: 'Getúlio Vargas / RS',
        empresa: 'Delfos Solar',
        potencia: '7.80 kWp',
        economia_mensal: 'R$ 850,00',
      }

      for (const tpl of TEMPLATES_PROPOSTA_WHATSAPP) {
        const parsed = aplicarPlaceholdersProposta(tpl.conteudo, contexto)
        expect(parsed).not.toContain('{nome_cliente}')
        expect(parsed).not.toContain('{consultor}')
        expect(parsed).not.toContain('{valor}')
        expect(parsed).not.toContain('{cidade}')
        expect(parsed).toContain('Lucas')
      }
    })
  })

  describe('extrairContextoProposta', () => {
    it('extrai corretamente dados do cliente e da proposta', () => {
      const clienteMock = {
        id: 'cli1',
        nome: 'Marcelo Becker',
        whatsapp: '54991292121',
        cidade: 'Erechim / RS',
        tipo_cliente: 'residencial',
      } as unknown as Cliente

      const orcMock = {
        id: 'orc1',
        cliente_id: 'cli1',
        potencia_kwp: 9.36,
        valor_investimento: 35000,
        economia_1_mes: 920,
        tipo_cliente: 'residencial',
        autor: 'João Victor Bagetti Fuchs',
      } as unknown as OrcamentoSolar

      const ctx = extrairContextoProposta(orcMock, clienteMock)
      expect(ctx.nome_cliente).toBe('Marcelo')
      expect(ctx.consultor).toBe('João Victor Bagetti Fuchs')
      expect(ctx.tipo).toBe('Residencial')
      expect(ctx.cidade).toBe('Erechim / RS')
      expect(ctx.potencia).toBe('9.36 kWp')
      expect(ctx.valor).toContain('35.000')
      expect(ctx.empresa).toBe('Delfos Solar')
    })
  })
})

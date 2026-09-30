import { describe, it, expect } from 'vitest'
import {
  aplicarRegraWhatsAppAutoritativo,
  consolidarContatosDeduplicados,
  determinarPapelCliente,
  normalizarChaveTelefone,
} from './contatosService'
import type { Cliente, ContatoAdicional, ContatoUnico } from '@/types/crm'

describe('contatosService', () => {
  describe('aplicarRegraWhatsAppAutoritativo', () => {
    it('campos telefone e WhatsApp são independentes (regra atualizada do usuário)', () => {
      const res = aplicarRegraWhatsAppAutoritativo({
        telefone: '(54) 3522-1234',
        whatsapp: '(54) 99123-4567',
      })
      expect(res.whatsapp).toBe('(54) 99123-4567')
      expect(res.telefone).toBe('(54) 3522-1234')
    })

    it('quando WhatsApp estiver vazio e telefone preenchido, mantém telefone e não copia para WhatsApp', () => {
      const res = aplicarRegraWhatsAppAutoritativo({
        telefone: '(54) 99123-4567',
        whatsapp: '',
      })
      expect(res.whatsapp).toBe('')
      expect(res.telefone).toBe('(54) 99123-4567')
    })

    it('quando WhatsApp preenchido e telefone vazio, mantém WhatsApp e não copia para telefone', () => {
      const res = aplicarRegraWhatsAppAutoritativo({
        telefone: '',
        whatsapp: '(54) 98888-7777',
      })
      expect(res.whatsapp).toBe('(54) 98888-7777')
      expect(res.telefone).toBe('')
    })

    it('quando ambos vazios, retorna strings vazias', () => {
      const res = aplicarRegraWhatsAppAutoritativo({
        telefone: '',
        whatsapp: '',
      })
      expect(res.whatsapp).toBe('')
      expect(res.telefone).toBe('')
    })
  })

  describe('determinarPapelCliente', () => {
    it('classifica cliente Fechado como "cliente"', () => {
      expect(determinarPapelCliente('Fechado')).toBe('cliente')
    })

    it('classifica status de funil comercial (Novo Lead, Negociação, Orçamento, Levantamento, Contato Futuro) como "lead"', () => {
      expect(determinarPapelCliente('Novo Lead')).toBe('lead')
      expect(determinarPapelCliente('Negociação')).toBe('lead')
      expect(determinarPapelCliente('Orçamento')).toBe('lead')
      expect(determinarPapelCliente('Levantamento')).toBe('lead')
      expect(determinarPapelCliente('Contato Futuro')).toBe('lead')
      expect(determinarPapelCliente('Perdido')).toBe('lead')
    })
  })

  describe('normalizarChaveTelefone', () => {
    it('extrai últimos 9 dígitos removendo prefixo DDI 55 se houver', () => {
      expect(normalizarChaveTelefone('+55 54 99123-4567')).toBe('54991234567')
      expect(normalizarChaveTelefone('5554991234567')).toBe('54991234567')
      expect(normalizarChaveTelefone('(54) 99123-4567')).toBe('54991234567')
    })

    it('retorna vazio para telefone inválido ou placeholder de zeros', () => {
      expect(normalizarChaveTelefone('00000000000')).toBe('')
      expect(normalizarChaveTelefone('123')).toBe('')
      expect(normalizarChaveTelefone('')).toBe('')
    })
  })

  describe('consolidarContatosDeduplicados', () => {
    it('consolida (1) contatos salvos, (2) clientes vivos e (3) contatos_adicionais', () => {
      const contatosExistentes: ContatoUnico[] = [
        {
          id: 'cont_1',
          collectionId: 'pbc_contatos',
          collectionName: 'contatos',
          nome: 'Nexen Fornecedor',
          papel: 'fornecedor',
          whatsapp: '(49) 9101-0839',
          telefone: '(49) 9101-0839',
          email: '',
          clientes_vinculados: [],
          created: '2026-09-01T10:00:00.000Z',
          updated: '2026-09-01T10:00:00.000Z',
        },
      ]

      const clientes: Cliente[] = [
        {
          id: 'cli_joao',
          collectionId: 'pbc_clientes',
          collectionName: 'clientes',
          nome: 'João Victor Bagetti Fuchs',
          status: 'Fechado',
          telefone: '(54) 98110-8228',
          whatsapp: '(54) 98110-8228',
          email: 'joao@delfosengenharia.com.br',
          cidade: 'Erechim',
          endereco: 'Rua Pedro Álvares Cabral',
          uc: '123',
          potencia_kwp: 7.1,
          valor_estimado: 0,
          data_instalacao: '',
          inversor_marca: '',
          inversor_modelo: '',
          placas_qtd: 13,
          placas_marca: '',
          telhado_tipo: 'ceramico',
          created: '2026-09-11T17:19:48.868Z',
          updated: '2026-09-20T00:14:50.245Z',
        },
        {
          id: 'cli_lead',
          collectionId: 'pbc_clientes',
          collectionName: 'clientes',
          nome: 'Lead em Negociação Solar',
          status: 'Negociação',
          telefone: '(54) 99999-1111',
          whatsapp: '(54) 99999-1111',
          email: 'lead@exemplo.com',
          cidade: 'Erechim',
          endereco: '',
          uc: '',
          potencia_kwp: 5,
          valor_estimado: 25000,
          data_instalacao: '',
          inversor_marca: '',
          inversor_modelo: '',
          placas_qtd: 10,
          placas_marca: '',
          telhado_tipo: 'metalico',
          created: '2026-09-15T10:00:00.000Z',
          updated: '2026-09-15T10:00:00.000Z',
        },
      ]

      const contatosAdicionais: ContatoAdicional[] = [
        {
          id: 'adic_1',
          collectionId: 'pbc_contatos_adic',
          collectionName: 'contatos_adicionais',
          cliente: 'cli_joao',
          nome: 'Engenheiro Responsável Técnico',
          cargo: 'Engenheiro RT',
          papel: 'tecnico',
          telefone: '(54) 98433-2260',
          email: 'engenharia@exemplo.com',
          is_whatsapp: true,
          created: '2026-09-21T15:07:48.178Z',
          updated: '2026-09-21T15:07:48.178Z',
        },
      ]

      const resultado = consolidarContatosDeduplicados({
        contatosCadastrados: contatosExistentes,
        clientes,
        contatosAdicionais,
      })

      // Espera 4 contatos consolidando todas as 3 fontes
      expect(resultado.length).toBe(4)

      const nexen = resultado.find((c) => c.nome === 'Nexen Fornecedor')
      expect(nexen).toBeDefined()
      expect(nexen?.papel).toBe('fornecedor')

      const joao = resultado.find((c) => c.nome === 'João Victor Bagetti Fuchs')
      expect(joao).toBeDefined()
      expect(joao?.papel).toBe('cliente')
      expect(joao?.clientes_vinculados).toContain('cli_joao')

      const lead = resultado.find((c) => c.nome === 'Lead em Negociação Solar')
      expect(lead).toBeDefined()
      expect(lead?.papel).toBe('lead')
      expect(lead?.clientes_vinculados).toContain('cli_lead')

      const adic = resultado.find((c) => c.nome === 'Engenheiro Responsável Técnico')
      expect(adic).toBeDefined()
      expect(adic?.papel).toBe('tecnico')
      expect(adic?.clientes_vinculados).toContain('cli_joao')
    })

    it('deduplica por WhatsApp autoritativo e preserva o vínculo com o cliente', () => {
      // Contato já cadastrado na tabela contatos com o WhatsApp do cliente
      const contatosExistentes: ContatoUnico[] = [
        {
          id: 'cont_existente_joao',
          collectionId: 'pbc_contatos',
          collectionName: 'contatos',
          nome: 'João Victor Bagetti Fuchs',
          papel: 'cliente',
          whatsapp: '(54) 98110-8228',
          telefone: '(54) 98110-8228',
          clientes_vinculados: [],
          created: '2026-09-01T10:00:00.000Z',
          updated: '2026-09-01T10:00:00.000Z',
        },
      ]

      const clientes: Cliente[] = [
        {
          id: 'cli_joao',
          collectionId: 'pbc_clientes',
          collectionName: 'clientes',
          nome: 'João Victor Bagetti Fuchs',
          status: 'Fechado',
          telefone: '54981108228',
          whatsapp: '54981108228',
          email: 'joao@delfosengenharia.com.br',
          cidade: 'Erechim',
          endereco: '',
          uc: '',
          potencia_kwp: 7,
          valor_estimado: 0,
          data_instalacao: '',
          inversor_marca: '',
          inversor_modelo: '',
          placas_qtd: 10,
          placas_marca: '',
          telhado_tipo: 'ceramico',
          created: '2026-09-11T17:19:48.868Z',
          updated: '2026-09-20T00:14:50.245Z',
        },
      ]

      const resultado = consolidarContatosDeduplicados({
        contatosCadastrados: contatosExistentes,
        clientes,
        contatosAdicionais: [],
      })

      // Não duplica: deve haver 1 único registro consolidado
      expect(resultado.length).toBe(1)
      expect(resultado[0].id).toBe('cont_existente_joao')
      expect(resultado[0].clientes_vinculados).toContain('cli_joao')
    })

    it('deduplica por nome + telefone quando WhatsApp estiver em formato diferente ou vazio', () => {
      const contatosExistentes: ContatoUnico[] = [
        {
          id: 'cont_sem_wpp',
          collectionId: 'pbc_contatos',
          collectionName: 'contatos',
          nome: 'Ademar Fiorini',
          papel: 'outro',
          telefone: '(54) 99924-2399',
          clientes_vinculados: [],
          created: '2026-09-01T10:00:00.000Z',
          updated: '2026-09-01T10:00:00.000Z',
        },
      ]

      const clientes: Cliente[] = [
        {
          id: 'cli_ademar',
          collectionId: 'pbc_clientes',
          collectionName: 'clientes',
          nome: 'Ademar Fiorini',
          status: 'Fechado',
          telefone: '54999242399',
          whatsapp: '54999242399',
          email: 'fiorini@exemplo.com',
          cidade: 'Erechim',
          endereco: '',
          uc: '',
          potencia_kwp: 6.9,
          valor_estimado: 0,
          data_instalacao: '',
          inversor_marca: '',
          inversor_modelo: '',
          placas_qtd: 13,
          placas_marca: '',
          telhado_tipo: 'ceramico',
          created: '2026-09-13T16:52:31.910Z',
          updated: '2026-09-20T00:14:50.246Z',
        },
      ]

      const resultado = consolidarContatosDeduplicados({
        contatosCadastrados: contatosExistentes,
        clientes,
        contatosAdicionais: [],
      })

      expect(resultado.length).toBe(1)
      expect(resultado[0].clientes_vinculados).toContain('cli_ademar')
    })
  })
})

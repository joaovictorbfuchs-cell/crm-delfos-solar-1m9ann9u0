import { describe, it, expect, vi } from 'vitest'
import {
  resolverNumeroDestinoClienteSync,
  resolverNumeroDestinoCliente,
  validarDigitosTelefone,
  MENSAGEM_ALERTA_SEM_NUMERO,
} from './resolverNumeroDestinoCliente'
import type { Cliente, ContatoAdicional } from '@/types/crm'

describe('resolverNumeroDestinoCliente', () => {
  it('valida dígitos corretamente (mínimo 10 dígitos)', () => {
    expect(validarDigitosTelefone(null)).toBe(false)
    expect(validarDigitosTelefone('')).toBe(false)
    expect(validarDigitosTelefone('123456789')).toBe(false)
    expect(validarDigitosTelefone('(54) 9999-8888')).toBe(true) // 10 dígitos
    expect(validarDigitosTelefone('(54) 99999-8888')).toBe(true) // 11 dígitos
  })

  it('1. prioriza WhatsApp do cliente quando preenchido', () => {
    const cliente: Partial<Cliente> = {
      whatsapp: '(54) 99999-1111',
      telefone: '(54) 3522-0000',
    }
    const contatos: ContatoAdicional[] = [
      {
        id: 'ca1',
        cliente: 'c1',
        nome: 'Esposa',
        telefone: '(54) 98888-2222',
        is_whatsapp: true,
        collectionId: '',
        collectionName: '',
        created: '',
        updated: '',
      },
    ]

    const res = resolverNumeroDestinoClienteSync(cliente, contatos)
    expect(res.origem).toBe('cliente_whatsapp')
    expect(res.numero).toBe('54999991111')
    expect(res.contatoAdicionalNome).toBeUndefined()
  })

  it('2. usa WhatsApp de contato adicional quando cliente não tem WhatsApp próprio', () => {
    const cliente: Partial<Cliente> = {
      whatsapp: '',
      telefone: '(54) 3522-0000',
    }
    const contatos: ContatoAdicional[] = [
      {
        id: 'ca0',
        cliente: 'c1',
        nome: 'Gerente sem WhatsApp',
        telefone: '(54) 3333-4444',
        is_whatsapp: false,
        collectionId: '',
        collectionName: '',
        created: '',
        updated: '',
      },
      {
        id: 'ca1',
        cliente: 'c1',
        nome: 'Juliana Moreira',
        telefone: '(54) 98888-2222',
        is_whatsapp: true,
        collectionId: '',
        collectionName: '',
        created: '',
        updated: '',
      },
    ]

    const res = resolverNumeroDestinoClienteSync(cliente, contatos)
    expect(res.origem).toBe('contato_adicional_whatsapp')
    expect(res.numero).toBe('54988882222')
    expect(res.contatoAdicionalNome).toBe('Juliana Moreira')
  })

  it('3. usa telefone do cliente quando contato adicional não tem WhatsApp ou não existe', () => {
    const cliente: Partial<Cliente> = {
      whatsapp: '',
      telefone: '(54) 3522-0000',
    }
    const contatos: ContatoAdicional[] = [
      {
        id: 'ca1',
        cliente: 'c1',
        nome: 'Contato Fixo',
        telefone: '(54) 3333-4444',
        is_whatsapp: false,
        collectionId: '',
        collectionName: '',
        created: '',
        updated: '',
      },
    ]

    const res = resolverNumeroDestinoClienteSync(cliente, contatos)
    expect(res.origem).toBe('cliente_telefone')
    expect(res.numero).toBe('5435220000')
  })

  it('4. retorna nenhum e numero null quando nada existir', () => {
    const cliente: Partial<Cliente> = {
      whatsapp: '',
      telefone: '',
    }
    const res = resolverNumeroDestinoClienteSync(cliente, [])
    expect(res.origem).toBe('nenhum')
    expect(res.numero).toBeNull()
  })

  it('expõe a mensagem padrão de alerta para cadastro sem número', () => {
    expect(MENSAGEM_ALERTA_SEM_NUMERO).toContain('Envio não realizado')
    expect(MENSAGEM_ALERTA_SEM_NUMERO).toContain('contato adicional com WhatsApp')
  })

  it('versão assíncrona busca no banco se cliente.id for fornecido e contatos não em memória', async () => {
    const mockList = vi.fn().mockResolvedValue([
      {
        id: 'ca1',
        cliente: 'c1',
        nome: 'Mariana S.',
        telefone: '(54) 99111-2233',
        is_whatsapp: true,
      },
    ])

    const pbMock = (await import('@/lib/pocketbase/client')).default
    const originalCollection = pbMock.collection
    pbMock.collection = vi.fn().mockReturnValue({
      getFullList: mockList,
    }) as any

    try {
      const cliente: Partial<Cliente> = { id: 'c1', whatsapp: '' }
      const res = await resolverNumeroDestinoCliente(cliente)
      expect(res.origem).toBe('contato_adicional_whatsapp')
      expect(res.contatoAdicionalNome).toBe('Mariana S.')
      expect(res.numero).toBe('54991112233')
    } finally {
      pbMock.collection = originalCollection
    }
  })
})

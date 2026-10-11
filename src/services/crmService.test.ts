import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  executeInChunks,
  reatribuirTodosVinculosCliente,
  mesclarMultiplosClientes,
  NOMES_COLECOES_CRM,
  sanitizarPayloadUsina,
  updateUsina,
  deleteContratoOM,
} from './crmService'

// Mock do cliente PocketBase
const mockPbUpdate = vi.fn().mockResolvedValue({})
const mockPbDelete = vi.fn().mockResolvedValue({})
const mockPbCreate = vi.fn().mockResolvedValue({ id: 'act-1' })
const mockPbGetOne = vi.fn()
const mockPbGetFullList = vi.fn()

vi.mock('@/lib/pocketbase/client', () => {
  const collectionMock = {
    getFullList: (...args: any[]) => mockPbGetFullList(...args),
    getOne: (...args: any[]) => mockPbGetOne(...args),
    update: (...args: any[]) => mockPbUpdate(...args),
    delete: (...args: any[]) => mockPbDelete(...args),
    create: (...args: any[]) => mockPbCreate(...args),
  }
  const pbInstance = {
    collection: vi.fn(() => collectionMock),
    autoCancellation: vi.fn(),
  }
  return {
    pb: pbInstance,
    default: pbInstance,
  }
})

describe('executeInChunks - paralelização em lotes concorrentes', () => {
  it('executa tarefas em lotes concorrentes respeitando o tamanho do chunk', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    let activeTasks = 0
    let maxSimultaneous = 0

    const results = await executeInChunks(items, 4, async (item) => {
      activeTasks++
      maxSimultaneous = Math.max(maxSimultaneous, activeTasks)
      await new Promise((res) => setTimeout(res, 10))
      activeTasks--
      return item * 2
    })

    expect(results).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
    expect(maxSimultaneous).toBeLessThanOrEqual(4)
  })

  it('lida com lista vazia graciosamente', async () => {
    const results = await executeInChunks([], 5, async (x) => x)
    expect(results).toEqual([])
  })
})

describe('reatribuirTodosVinculosCliente - otimização com chunks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 0 imediatamente se clienteOrigemId for igual a clienteDestinoId', async () => {
    const total = await reatribuirTodosVinculosCliente('cli-1', 'cli-1')
    expect(total).toBe(0)
    expect(mockPbGetFullList).not.toHaveBeenCalled()
  })

  it('paraleliza a atualização de registros e aciona callbacks de progresso', async () => {
    // Mock para retornar 3 registros na coleção 'atividades' e 0 nas demais
    mockPbGetFullList.mockImplementation(({ filter }: { filter?: string } = {}) => {
      if (filter && filter.includes('cli-origem')) {
        return Promise.resolve([{ id: 'rec-1' }, { id: 'rec-2' }, { id: 'rec-3' }])
      }
      return Promise.resolve([])
    })

    const progressoChamadas: any[] = []
    const total = await reatribuirTodosVinculosCliente('cli-origem', 'cli-destino', (info) => {
      progressoChamadas.push(info)
    })

    // Deve ter chamado pb.update para cada registro
    expect(mockPbUpdate).toHaveBeenCalled()
    expect(total).toBeGreaterThan(0)
    expect(progressoChamadas.length).toBeGreaterThan(0)
    expect(progressoChamadas[0].concluidos).toBeGreaterThan(0)
  })

  it('tem dicionário amigável de nomes das coleções do CRM em português', () => {
    expect(NOMES_COLECOES_CRM['negocios']).toBe('Negócios e Oportunidades')
    expect(NOMES_COLECOES_CRM['atividades']).toBe('Atividades e Tarefas')
    expect(NOMES_COLECOES_CRM['usinas']).toBe('Usinas Fotovoltaicas')
  })
})

describe('mesclarMultiplosClientes - otimizações e integridade de dados', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPbGetOne.mockImplementation((id: string) => {
      return Promise.resolve({
        id,
        nome: id === 'cli-mestre' ? 'Cliente Mestre' : `Cliente Secundário ${id}`,
        observacoes: `Notas de ${id}`,
        dados_importados: { origem: 'importacao' },
      })
    })
    mockPbUpdate.mockImplementation((id: string, data: any) => {
      return Promise.resolve({ id, ...data })
    })
    mockPbGetFullList.mockResolvedValue([])
  })

  it('executa mesclagem de múltiplos clientes disparando callback de progresso em português', async () => {
    const progressoHistorico: any[] = []

    const resultado = await mesclarMultiplosClientes({
      clientePrincipalId: 'cli-mestre',
      clientesSecundariosIds: ['cli-sec-1', 'cli-sec-2'],
      camposSobrescritos: { nome: 'Cliente Mestre Unificado' },
      onProgresso: (p) => {
        progressoHistorico.push(p)
      },
    })

    expect(resultado).toBeDefined()
    // Verificou etapas de progresso
    expect(progressoHistorico.length).toBeGreaterThan(0)
    const etapas = progressoHistorico.map((p) => p.etapa)
    expect(etapas).toContain('preparando')
    expect(etapas).toContain('reatribuindo')
    expect(etapas).toContain('concluido')

    // Último callback deve indicar conclusão
    const ultimo = progressoHistorico[progressoHistorico.length - 1]
    expect(ultimo.porcentagem).toBe(100)
    expect(ultimo.detalhe).toContain('concluída com sucesso')

    // Deve ter excluído apenas os secundários
    expect(mockPbDelete).toHaveBeenCalledWith('cli-sec-1')
    expect(mockPbDelete).toHaveBeenCalledWith('cli-sec-2')
    expect(mockPbDelete).not.toHaveBeenCalledWith('cli-mestre')
  })

  it('sanitizarPayloadUsina descarta campos desconhecidos, converte string vazia para null em números/datas e protege selects', () => {
    const raw = {
      id: 'a0o9ix29w4smfhl', // campo do sistema -> descartar
      expand: { cliente_id: {} }, // metadado de expand -> descartar
      created: '2026-09-14', // autodate -> descartar
      campo_inexistente_inventado: 'valor', // campo fora do schema -> descartar
      campo_indesejado: 123, // descartar
      potencia_kwp: '15.5', // converter para número
      qtd_modulos: '', // string vazia em número -> null
      geracao_estimada_kwh: 'abc', // NaN -> descartar
      tarifa: '0.95', // converter para número
      data_instalacao: '', // string vazia em date -> null
      contrato_id: '', // relation vazia -> null
      tipo_estrutura: 'telhado', // select válido -> preservar
      tipo_atendimento: 'aéreo', // select válido -> preservar
      numero_fases: 'bifasico', // sem acento -> normalizar para 'bifásico'
      tipo_usina: 'invalido_alienigena', // select inexistente -> descartar
      nome: 'Usina Teste Sanitizacao', // texto -> preservar
      cidade: 'Erechim', // texto -> preservar
      portal_login: 'login123', // campo recente -> preservar
      portal_senha: 'senha-secreta', // campo recente -> preservar
      undefinedField: undefined, // undefined -> descartar
    }

    const sanitized = sanitizarPayloadUsina(raw)

    // Chaves descartadas
    expect(sanitized.id).toBeUndefined()
    expect(sanitized.expand).toBeUndefined()
    expect(sanitized.created).toBeUndefined()
    expect(sanitized.campo_inexistente_inventado).toBeUndefined()
    expect(sanitized.campo_indesejado).toBeUndefined()
    expect(sanitized.undefinedField).toBeUndefined()
    expect(sanitized.geracao_estimada_kwh).toBeUndefined()
    expect(sanitized.tipo_usina).toBeUndefined()

    // Chaves tratadas
    expect(sanitized.potencia_kwp).toBe(15.5)
    expect(sanitized.qtd_modulos).toBeNull()
    expect(sanitized.tarifa).toBe(0.95)
    expect(sanitized.data_instalacao).toBeNull()
    expect(sanitized.contrato_id).toBeNull()
    expect(sanitized.tipo_estrutura).toBe('telhado')
    expect(sanitized.tipo_atendimento).toBe('aéreo')
    expect(sanitized.numero_fases).toBe('bifásico')
    expect(sanitized.nome).toBe('Usina Teste Sanitizacao')
    expect(sanitized.cidade).toBe('Erechim')
    expect(sanitized.portal_login).toBe('login123')
    expect(sanitized.portal_senha).toBe('senha-secreta')
  })

  it('sanitizarPayloadUsina aceita campo beneficiarias válido e descarta inválido', () => {
    const rawValido = {
      nome: 'Usina com Beneficiarias',
      beneficiarias: {
        habilitado: true,
        percentual_geradora: 60,
        unidades: [{ numero_uc: '12345', identificacao: 'Casa Praia', percentual: 40 }],
      },
    }
    const sanitizedValido = sanitizarPayloadUsina(rawValido)
    expect(sanitizedValido.beneficiarias).toEqual({
      habilitado: true,
      percentual_geradora: 60,
      unidades: [{ numero_uc: '12345', identificacao: 'Casa Praia', percentual: 40 }],
    })

    const rawVazio = {
      nome: 'Usina sem Beneficiarias',
      beneficiarias: null,
    }
    const sanitizedVazio = sanitizarPayloadUsina(rawVazio)
    expect(sanitizedVazio.beneficiarias).toBeNull()
  })

  it('updateUsina sanitiza o payload antes de invocar o PATCH no PocketBase', async () => {
    mockPbUpdate.mockClear()
    mockPbGetFullList.mockResolvedValue([])

    await updateUsina('usina-teste-id', {
      id: 'usina-teste-id' as any,
      nome: 'Usina Atualizada',
      potencia_kwp: 12.5,
      qtd_modulos: '' as any, // string vazia vinda de input de formulário
      data_instalacao: '',
      campo_fantasma: 'teste' as any,
      portal_login: 'portal_user',
      portal_senha: 'portal_password',
    } as any)

    expect(mockPbUpdate).toHaveBeenCalledTimes(1)
    const [calledId, calledPayload, calledOpts] = mockPbUpdate.mock.calls[0]
    expect(calledId).toBe('usina-teste-id')
    expect(calledOpts).toEqual({ expand: 'contrato_id' })
    expect(calledPayload).toEqual({
      nome: 'Usina Atualizada',
      potencia_kwp: 12.5,
      qtd_modulos: null,
      data_instalacao: null,
      portal_login: 'portal_user',
      portal_senha: 'portal_password',
    })
    expect(calledPayload.id).toBeUndefined()
    expect(calledPayload.campo_fantasma).toBeUndefined()
  })

  describe('deleteContratoOM - limpeza prévia de vínculos', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('remove vínculos de contratos_usinas, limpa contrato_id das usinas e exclui o contrato', async () => {
      const mockVinculos = [{ id: 'vinculo-1' }, { id: 'vinculo-2' }]
      const mockUsinas = [{ id: 'usina-1' }, { id: 'usina-2' }]

      mockPbGetFullList.mockImplementation(({ filter }: { filter?: string } = {}) => {
        if (filter?.includes('contrato_id = "contrato-123"')) {
          // Diferenciar pela coleção chamada na última vez ou retornar conforme mock
          return Promise.resolve(mockVinculos)
        }
        return Promise.resolve([])
      })

      // Mais preciso: mapear chamadas por coleção
      const deletedContratosUsinas: string[] = []
      const updatedUsinas: Array<{ id: string; data: any }> = []
      let deletedContratosOm: string | null = null

      const customCollection = (colName: string) => ({
        getFullList: vi.fn().mockImplementation(({ filter }: { filter?: string } = {}) => {
          if (colName === 'contratos_usinas' && filter?.includes('contrato-123')) {
            return Promise.resolve(mockVinculos)
          }
          if (colName === 'usinas' && filter?.includes('contrato-123')) {
            return Promise.resolve(mockUsinas)
          }
          return Promise.resolve([])
        }),
        delete: vi.fn().mockImplementation((id: string) => {
          if (colName === 'contratos_usinas') deletedContratosUsinas.push(id)
          if (colName === 'contratos_om') deletedContratosOm = id
          return Promise.resolve(true)
        }),
        update: vi.fn().mockImplementation((id: string, data: any) => {
          if (colName === 'usinas') updatedUsinas.push({ id, data })
          return Promise.resolve({ id, ...data })
        }),
      })

      const pbModule = await import('@/lib/pocketbase/client')
      vi.spyOn(pbModule.default, 'collection').mockImplementation(customCollection as any)

      const success = await deleteContratoOM('contrato-123')

      expect(success).toBe(true)
      expect(deletedContratosUsinas).toEqual(['vinculo-1', 'vinculo-2'])
      expect(updatedUsinas).toEqual([
        { id: 'usina-1', data: { contrato_id: '' } },
        { id: 'usina-2', data: { contrato_id: '' } },
      ])
      expect(deletedContratosOm).toBe('contrato-123')
    })

    it('emite mensagem amigável em português quando houver erro de required relation reference', async () => {
      const customCollection = (colName: string) => ({
        getFullList: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockImplementation(() => {
          if (colName === 'contratos_om') {
            const err: any = new Error(
              'Failed to delete record. Make sure that the record is not part of a required relation reference.',
            )
            err.status = 400
            err.response = {
              data: {
                message: 'Make sure that the record is not part of a required relation reference.',
              },
            }
            throw err
          }
          return Promise.resolve(true)
        }),
        update: vi.fn().mockResolvedValue({}),
      })

      const pbModule = await import('@/lib/pocketbase/client')
      vi.spyOn(pbModule.default, 'collection').mockImplementation(customCollection as any)

      await expect(deleteContratoOM('contrato-bloqueado')).rejects.toThrow(
        'Não foi possível excluir: existem vínculos com usinas deste contrato.',
      )
    })
  })
})

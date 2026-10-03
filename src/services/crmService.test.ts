import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  executeInChunks,
  reatribuirTodosVinculosCliente,
  mesclarMultiplosClientes,
  NOMES_COLECOES_CRM,
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
})

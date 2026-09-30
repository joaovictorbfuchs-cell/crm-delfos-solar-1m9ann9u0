import { describe, it, expect, vi } from 'vitest'
import { carregarCentralAtividades } from './centralAtividadesService'
import pb from '@/lib/pocketbase/client'

describe('centralAtividadesService com registros unificados e fallback', () => {
  it('deduplica registros que possuem cópia unificada com chave piloto ou padrão', async () => {
    const mockAtividades = [
      {
        id: 'atv_1',
        cliente_id: '50vyppm3qwwuz62',
        origem: 'ordem_servico',
        chave_importacao: 'piloto-ordem_servico-os_100',
        registro_original_id: 'os_100',
        tipo_unificado: 'OS: Limpeza',
        titulo: 'OS #OS_100 — Limpeza',
        status: 'pendente',
        created: '2026-09-28T10:00:00Z',
      },
      {
        id: 'atv_2',
        cliente_id: '50vyppm3qwwuz62',
        origem: 'atividade',
        chave_importacao: 'piloto-atividade-atv_2',
        registro_original_id: 'atv_2',
        tipo_unificado: 'Auto Leitura RGE',
        tipo: 'auto_leitura_rge',
        titulo: 'Auto Leitura RGE',
        status: 'pendente',
        created: '2026-09-28T10:00:00Z',
      },
    ]

    const mockOrdensServico = [
      {
        id: 'os_100', // Já migrado como atv_1!
        cliente_id: '50vyppm3qwwuz62',
        tipo_servico: 'Limpeza',
        status: 'pendente',
        created: '2026-09-28T09:00:00Z',
      },
      {
        id: 'os_200', // De outro cliente, NÃO migrado
        cliente_id: 'outro_cliente',
        tipo_servico: 'Manutenção',
        status: 'pendente',
        created: '2026-09-28T08:00:00Z',
      },
    ]

    vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      return {
        getFullList: vi.fn().mockImplementation(async () => {
          if (colName === 'atividades') return mockAtividades
          if (colName === 'ordens_servico') return mockOrdensServico
          if (colName === 'manutencoes') return []
          if (colName === 'servicos_avulsos') return []
          if (colName === 'timeline_om') return []
          if (colName === 'anomalias_om') return []
          if (colName === 'clientes')
            return [
              { id: '50vyppm3qwwuz62', nome: 'Delfos Engenharia Ltda' },
              { id: 'outro_cliente', nome: 'Outro Cliente Solar' },
            ]
          if (colName === 'usinas') return []
          return []
        }),
      } as any
    })

    const data = await carregarCentralAtividades()

    // os_100 NÃO pode aparecer duas vezes: deve ser lida a partir de atividades unificadas e ignorada da fonte original ordens_servico
    const os100Itens = data.items.filter(
      (item) =>
        item.chaveImportacao === 'piloto-ordem_servico-os_100' ||
        item.origemId === 'os_100' ||
        item.registroOriginalId === 'os_100',
    )
    expect(os100Itens).toHaveLength(1)
    expect(os100Itens[0].fonte).toBe('ordem_servico')
    expect(os100Itens[0].tipoAtividade).toBe('OS: Limpeza')

    // os_200 (não migrada) continua vindo normalmente pelo fallback
    const os200Itens = data.items.filter((item) => item.origemId === 'os_200')
    expect(os200Itens).toHaveLength(1)
    expect(os200Itens[0].clienteNome).toBe('Outro Cliente Solar')

    // total de itens no resultado: 3 (atv_1 unificada de OS, atv_2 nativa, os_200 do fallback)
    expect(data.items).toHaveLength(3)
  })

  it('deduplica registros com chave do lote 1 da carteira', async () => {
    const mockAtividadesLote1 = [
      {
        id: 'atv_lote1_os',
        cliente_id: 'rvkvuvn4uz9o65a',
        origem: 'ordem_servico',
        chave_importacao: 'lote1-ordem_servico-k4qhlltdxvnmycu',
        registro_original_id: 'k4qhlltdxvnmycu',
        tipo_unificado: 'OS: Limpeza',
        titulo: 'OS #VNMYCU — Limpeza',
        status: 'concluida',
        created: '2026-09-29T00:50:00Z',
      },
    ]

    const mockOrdensServicoLote1 = [
      {
        id: 'k4qhlltdxvnmycu',
        cliente_id: 'rvkvuvn4uz9o65a',
        tipo_servico: 'Limpeza',
        status: 'concluida',
        created: '2026-09-23T14:00:00Z',
      },
    ]

    vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      return {
        getFullList: vi.fn().mockImplementation(async () => {
          if (colName === 'atividades') return mockAtividadesLote1
          if (colName === 'ordens_servico') return mockOrdensServicoLote1
          if (colName === 'manutencoes') return []
          if (colName === 'servicos_avulsos') return []
          if (colName === 'timeline_om') return []
          if (colName === 'anomalias_om') return []
          if (colName === 'clientes')
            return [{ id: 'rvkvuvn4uz9o65a', nome: 'Ademar Emílio Berlanda' }]
          if (colName === 'usinas') return []
          return []
        }),
      } as any
    })

    const data = await carregarCentralAtividades()

    // O registro k4qhlltdxvnmycu deve aparecer apenas uma vez
    const itens = data.items.filter(
      (item) =>
        item.origemId === 'k4qhlltdxvnmycu' || item.registroOriginalId === 'k4qhlltdxvnmycu',
    )
    expect(itens).toHaveLength(1)
    expect(itens[0].fonte).toBe('ordem_servico')
    expect(itens[0].categoriaId).toBe('manutencao')
    expect(itens[0].titulo).toContain('OS #VNMYCU')
  })

  it('classifica corretamente e filtra pelas 3 categorias unificadas (Comerciais, Manutenção, Administrativas)', async () => {
    const mockAtividades = [
      {
        id: 'atv_comercial',
        cliente_id: 'c1',
        tipo: 'contato_ligacao',
        titulo: 'Ligar para cliente',
        status: 'pendente',
        created: '2026-09-29T10:00:00Z',
      },
      {
        id: 'atv_manut',
        cliente_id: 'c1',
        tipo: 'limpeza_manutencao',
        titulo: 'Limpeza de módulos',
        status: 'pendente',
        created: '2026-09-29T11:00:00Z',
      },
      {
        id: 'atv_admin',
        cliente_id: 'c1',
        tipo: 'auto_leitura_rge',
        titulo: 'Auto leitura RGE',
        status: 'pendente',
        created: '2026-09-29T12:00:00Z',
      },
    ]

    vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
      return {
        getFullList: vi.fn().mockImplementation(async () => {
          if (colName === 'atividades') return mockAtividades
          if (colName === 'ordens_servico') return []
          if (colName === 'manutencoes') return []
          if (colName === 'servicos_avulsos') return []
          if (colName === 'timeline_om') return []
          if (colName === 'anomalias_om') return []
          if (colName === 'clientes') return [{ id: 'c1', nome: 'Cliente Solar' }]
          if (colName === 'usinas') return []
          return []
        }),
      } as any
    })

    const data = await carregarCentralAtividades()

    // Verifica que categoriasDisponiveis contem exatamente 3 categorias
    expect(data.categoriasDisponiveis).toHaveLength(3)
    const com = data.categoriasDisponiveis.find((c) => c.id === 'comercial')
    const man = data.categoriasDisponiveis.find((c) => c.id === 'manutencao')
    const adm = data.categoriasDisponiveis.find((c) => c.id === 'administrativo_pos_venda')

    expect(com?.count).toBe(1)
    expect(man?.count).toBe(1)
    expect(adm?.count).toBe(1)

    // Testar filtrarCentralAtividades
    const apenasManut = data.items.filter((it) => it.categoriaId === 'manutencao')
    expect(apenasManut).toHaveLength(1)
    expect(apenasManut[0].id).toContain('atv_manut')
  })
})

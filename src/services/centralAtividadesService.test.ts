import { describe, it, expect, vi } from 'vitest'
import {
  carregarCentralAtividades,
  bulkAtualizarResponsavelCentral,
  bulkExcluirItensCentral,
  isRegistroValidoCentral,
} from './centralAtividadesService'
import pb from '@/lib/pocketbase/client'
import type { Atividade } from '@/types/crm'

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
        data: '2026-09-28T10:00:00Z',
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
        data: '2026-09-28T10:00:00Z',
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
        data: '2026-09-29T00:50:00Z',
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
        data: '2026-09-29T10:00:00Z',
        created: '2026-09-29T10:00:00Z',
      },
      {
        id: 'atv_manut',
        cliente_id: 'c1',
        tipo: 'limpeza_manutencao',
        titulo: 'Limpeza de módulos',
        status: 'pendente',
        data: '2026-09-29T11:00:00Z',
        created: '2026-09-29T11:00:00Z',
      },
      {
        id: 'atv_admin',
        cliente_id: 'c1',
        tipo: 'auto_leitura_rge',
        titulo: 'Auto leitura RGE',
        status: 'pendente',
        data: '2026-09-29T12:00:00Z',
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

  it('permite atualizar responsável em lote (bulkAtualizarResponsavelCentral)', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({})
    vi.spyOn(pb, 'collection').mockReturnValue({
      update: mockUpdate,
    } as any)

    const items = [
      {
        id: 'unif_atv1',
        origemId: 'atv1',
        fonte: 'atividade' as const,
        categoriaId: 'comercial' as const,
        categoriaNome: 'Comerciais',
        tipoAtividade: 'Ligação',
        titulo: 'Teste 1',
        status: 'Pendente',
        statusRaw: 'pendente',
        responsavel: 'Antigo',
        clienteNome: 'Cliente 1',
        data: '2026-03-30',
        hora: '10:00',
      },
      {
        id: 'os_200',
        origemId: 'os_200',
        fonte: 'ordem_servico' as const,
        categoriaId: 'manutencao' as const,
        categoriaNome: 'Manutenção',
        tipoAtividade: 'OS',
        titulo: 'Teste 2',
        status: 'Pendente',
        statusRaw: 'pendente',
        responsavel: 'Antigo',
        clienteNome: 'Cliente 2',
        data: '2026-03-30',
        hora: '10:00',
      },
    ]

    const res = await bulkAtualizarResponsavelCentral(items, 'user_123', 'Novo Responsável')
    expect(res.sucessos).toBe(2)
    expect(res.falhas).toBe(0)
    expect(mockUpdate).toHaveBeenCalled()
  })

  it('permite excluir atividades em lote (bulkExcluirItensCentral)', async () => {
    const mockDelete = vi.fn().mockResolvedValue({})
    vi.spyOn(pb, 'collection').mockReturnValue({
      delete: mockDelete,
    } as any)

    const items = [
      {
        id: 'unif_atv1',
        origemId: 'atv1',
        fonte: 'atividade' as const,
        categoriaId: 'comercial' as const,
        categoriaNome: 'Comerciais',
        tipoAtividade: 'Ligação',
        titulo: 'Teste 1',
        status: 'Pendente',
        statusRaw: 'pendente',
        responsavel: 'Antigo',
        clienteNome: 'Cliente 1',
        data: '2026-03-30',
        hora: '10:00',
      },
    ]

    const res = await bulkExcluirItensCentral(items)
    expect(res.sucessos).toBe(1)
    expect(res.falhas).toBe(0)
    expect(mockDelete).toHaveBeenCalledWith('atv1')
  })

  describe('isRegistroValidoCentral - filtro de registros de sistema e sem prazo', () => {
    it('mesclagem de clientes (anotacao + Sistema Delfos + concluída sem data) é EXCLUÍDA', () => {
      const atvMesclagemSemData = {
        id: 'atv_mesclagem_1',
        tipo: 'anotacao',
        autor: 'Sistema Delfos',
        status: 'concluida',
        titulo: 'Clientes mesclados',
        data: '',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvMesclagemSemData)).toBe(false)

      const atvMesclagemComData = {
        id: 'atv_mesclagem_2',
        tipo: 'anotacao',
        autor: 'Sistema Delfos',
        status: 'concluida',
        titulo: 'Clientes mesclados',
        data: '2026-04-10 10:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvMesclagemComData)).toBe(false)
    })

    it('dados importados (anotacao + IA Extrator Delfos sem data) são EXCLUÍDOS', () => {
      const atvExtratorAutor = {
        id: 'atv_import_1',
        tipo: 'anotacao',
        autor: 'IA Extrator Delfos',
        titulo: 'Dados extraídos de documento',
        data: '',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvExtratorAutor)).toBe(false)

      const atvExtratorResp = {
        id: 'atv_import_2',
        tipo: 'anotacao',
        autor: 'Qualquer',
        responsavel_nome: 'IA Extrator Delfos',
        titulo: 'Dados extraídos de documento',
        data: '',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvExtratorResp)).toBe(false)

      const atvExtratorComData = {
        id: 'atv_import_3',
        tipo: 'anotacao',
        autor: 'IA Extrator Delfos',
        data: '2026-05-01 14:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvExtratorComData)).toBe(false)
    })

    it('mudança de estágio é EXCLUÍDA', () => {
      const atvMudancaTipo = {
        id: 'atv_etapa_1',
        tipo: 'mudanca_estagio',
        titulo: 'Etapa alterada para Proposta',
        data: '2026-04-01 10:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvMudancaTipo)).toBe(false)

      const atvMudancaSubtipo = {
        id: 'atv_etapa_2',
        tipo: 'outro',
        subtipo: 'mudanca_estagio',
        titulo: 'Etapa alterada',
        data: '2026-04-01 10:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvMudancaSubtipo)).toBe(false)

      const atvMudancaUnificado = {
        id: 'atv_etapa_3',
        tipo: 'outro',
        tipo_unificado: 'mudanca_estagio',
        titulo: 'Etapa alterada',
        data: '2026-04-01 10:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvMudancaUnificado)).toBe(false)
    })

    it('registro sem data (sem prazo) é EXCLUÍDO mesmo se tipo for comercial', () => {
      const atvSemData = {
        id: 'atv_sem_data',
        tipo: 'contato_ligacao',
        titulo: 'Ligar para retorno',
        data: '',
        created: '2026-04-01 10:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvSemData)).toBe(false)
    })

    it('atividade comercial com prazo é MANTIDA', () => {
      const atvComercial = {
        id: 'atv_comercial_ok',
        tipo: 'contato_ligacao',
        titulo: 'Ligar para cliente apresentar proposta',
        data: '2026-04-15 09:30:00',
        responsavel_nome: 'Consultor Solar',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvComercial)).toBe(true)

      const atvReuniao = {
        id: 'atv_reuniao_ok',
        tipo: 'reuniao',
        titulo: 'Reunião Comercial',
        data: '2026-04-16 14:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvReuniao)).toBe(true)

      const atvFollowUp = {
        id: 'atv_follow_ok',
        tipo: 'follow_up',
        titulo: 'Follow-up de proposta',
        data: '2026-04-17 11:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvFollowUp)).toBe(true)
    })

    it('atividade administrativa com prazo é MANTIDA', () => {
      const atvAdminAnalise = {
        id: 'atv_admin_fatura',
        tipo: 'analise_fatura',
        titulo: 'Análise de Fatura RGE',
        data: '2026-04-20 10:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvAdminAnalise)).toBe(true)

      const atvAdminAutoLeitura = {
        id: 'atv_admin_leitura',
        tipo: 'auto_leitura_rge',
        titulo: 'Auto Leitura RGE',
        data: '2026-04-22 08:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvAdminAutoLeitura)).toBe(true)
    })

    it('atividade de manutenção é MANTIDA', () => {
      const atvLimpeza = {
        id: 'atv_manut_limpeza',
        tipo: 'limpeza',
        titulo: 'Limpeza de Painéis',
        data: '2026-04-25 08:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvLimpeza)).toBe(true)

      const atvPreventiva = {
        id: 'atv_manut_prev',
        tipo: 'manutencao_preventiva',
        titulo: 'Manutenção Preventiva Inversor',
        data: '2026-04-26 13:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvPreventiva)).toBe(true)

      const atvCorretiva = {
        id: 'atv_manut_corr',
        tipo: 'manutencao_corretiva',
        titulo: 'Troca de conector MC4',
        data: '2026-04-27 10:00:00',
      } as unknown as Atividade

      expect(isRegistroValidoCentral(atvCorretiva)).toBe(true)
    })

    it('carregarCentralAtividades filtra registros de sistema e sem data da coleção atividades', async () => {
      const mockColecaoAtividades = [
        // 1. Mudança de estágio (deve ser excluída)
        {
          id: 'atv_etapa',
          tipo: 'mudanca_estagio',
          titulo: 'Etapa alterada',
          data: '2026-04-01 10:00:00',
          created: '2026-04-01 10:00:00',
        },
        // 2. Mesclagem de clientes (deve ser excluída)
        {
          id: 'atv_mesclagem',
          tipo: 'anotacao',
          autor: 'Sistema Delfos',
          status: 'concluida',
          titulo: 'Mesclagem de clientes',
          data: '',
          created: '2026-04-01 10:00:00',
        },
        // 3. Importação de dados IA (deve ser excluída)
        {
          id: 'atv_ia',
          tipo: 'anotacao',
          autor: 'IA Extrator Delfos',
          titulo: 'Extração concluída',
          data: '',
          created: '2026-04-01 10:00:00',
        },
        // 4. Atividade sem prazo (deve ser excluída)
        {
          id: 'atv_sem_prazo',
          tipo: 'contato_ligacao',
          titulo: 'Sem data agendada',
          data: '',
          created: '2026-04-01 10:00:00',
        },
        // 5. Atividade comercial com prazo (deve aparecer)
        {
          id: 'atv_comercial_valida',
          cliente_id: 'c_valid',
          tipo: 'contato_ligacao',
          titulo: 'Ligar para cliente',
          data: '2026-04-10 10:00:00',
          status: 'pendente',
          created: '2026-04-01 10:00:00',
        },
        // 6. Atividade de manutenção com prazo (deve aparecer)
        {
          id: 'atv_manut_valida',
          cliente_id: 'c_valid',
          tipo: 'limpeza_manutencao',
          titulo: 'Limpeza de painéis',
          data: '2026-04-11 08:30:00',
          status: 'pendente',
          created: '2026-04-01 10:00:00',
        },
      ]

      vi.spyOn(pb, 'collection').mockImplementation((colName: string) => {
        return {
          getFullList: vi.fn().mockImplementation(async () => {
            if (colName === 'atividades') return mockColecaoAtividades
            if (colName === 'ordens_servico') return []
            if (colName === 'manutencoes') return []
            if (colName === 'servicos_avulsos') return []
            if (colName === 'timeline_om') return []
            if (colName === 'anomalias_om') return []
            if (colName === 'clientes') return [{ id: 'c_valid', nome: 'Cliente Ativo' }]
            if (colName === 'usinas') return []
            return []
          }),
        } as any
      })

      const data = await carregarCentralAtividades()

      // Apenas as duas atividades válidas com prazo devem estar presentes
      expect(data.items).toHaveLength(2)
      const ids = data.items.map((i) => i.origemId)
      expect(ids).toContain('atv_comercial_valida')
      expect(ids).toContain('atv_manut_valida')
      expect(ids).not.toContain('atv_etapa')
      expect(ids).not.toContain('atv_mesclagem')
      expect(ids).not.toContain('atv_ia')
      expect(ids).not.toContain('atv_sem_prazo')
    })
  })
})

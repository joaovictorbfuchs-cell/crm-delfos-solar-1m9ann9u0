/**
 * Quick Filters Pré-definidos por Módulo no CRM Delfos Solar
 *
 * Chips inline rápidos posicionados acima da tabela.
 * - 100% integrados ao motor filtrosEngine (traduzem diretamente para CondicaoFiltro/EstruturaCondicoes)
 * - Acumuláveis entre si com limite máximo de 10 chips ativos
 * - Aplicação em 1 clique sem persistência (efêmero de sessão)
 * - Pré-definidos para Clientes, Negócios, Central de Atividades e Contratos O&M
 */

import type { EstruturaCondicoes, ModuloFiltro, QuickFilterDef } from '@/types/filtros'

export const QUICK_FILTERS_CLIENTES: QuickFilterDef[] = [
  {
    id: 'qf_cli_sem_whatsapp',
    label: 'Sem WhatsApp',
    modulo: 'clientes',
    cor: 'rose',
    condicoes: {
      all: [
        {
          id: 'qf_c_sem_wpp',
          campoId: 'tem_whatsapp',
          operador: 'e_falso',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_cli_com_whatsapp',
    label: 'Com WhatsApp',
    modulo: 'clientes',
    cor: 'emerald',
    condicoes: {
      all: [
        {
          id: 'qf_c_com_wpp',
          campoId: 'tem_whatsapp',
          operador: 'e_verdadeiro',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_cli_com_contrato_om',
    label: 'Com Contrato O&M',
    modulo: 'clientes',
    cor: 'teal',
    condicoes: {
      all: [
        {
          id: 'qf_c_com_om',
          campoId: 'tem_contrato_om',
          operador: 'e_verdadeiro',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_cli_sem_contrato_om',
    label: 'Sem O&M',
    modulo: 'clientes',
    cor: 'amber',
    condicoes: {
      all: [
        {
          id: 'qf_c_sem_om',
          campoId: 'tem_contrato_om',
          operador: 'e_falso',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_cli_rge',
    label: 'Concessionária RGE',
    modulo: 'clientes',
    cor: 'sky',
    condicoes: {
      all: [
        {
          id: 'qf_c_rge',
          campoId: 'concessionaria',
          operador: 'e',
          valor: 'RGE',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_cli_com_usina',
    label: 'Com Usina Cadastrada',
    modulo: 'clientes',
    cor: 'blue',
    condicoes: {
      all: [
        {
          id: 'qf_c_com_usina',
          campoId: 'total_usinas',
          operador: 'maior',
          valor: 0,
        },
      ],
      any: [],
    },
  },
]

export const QUICK_FILTERS_ATIVIDADES: QuickFilterDef[] = [
  {
    id: 'qf_atv_atrasadas',
    label: 'Atrasadas',
    modulo: 'atividades',
    cor: 'rose',
    condicoes: {
      all: [
        {
          id: 'qf_a_atrasada',
          campoId: 'atrasada',
          operador: 'e_verdadeiro',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_atv_pendentes',
    label: 'Pendentes',
    modulo: 'atividades',
    cor: 'amber',
    condicoes: {
      all: [
        {
          id: 'qf_a_pendente',
          campoId: 'status',
          operador: 'e',
          valor: 'pendente',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_atv_concluidas',
    label: 'Concluídas',
    modulo: 'atividades',
    cor: 'emerald',
    condicoes: {
      all: [
        {
          id: 'qf_a_concluida',
          campoId: 'status',
          operador: 'e',
          valor: 'concluida',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_atv_cat_manutencao',
    label: 'Manutenção',
    modulo: 'atividades',
    cor: 'sky',
    condicoes: {
      all: [
        {
          id: 'qf_a_manut',
          campoId: 'categoria',
          operador: 'e',
          valor: 'Manutenção',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_atv_cat_comercial',
    label: 'Comercial',
    modulo: 'atividades',
    cor: 'purple',
    condicoes: {
      all: [
        {
          id: 'qf_a_comerc',
          campoId: 'categoria',
          operador: 'e',
          valor: 'Comercial',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_atv_proximos_7_dias',
    label: 'Próximos 7 dias',
    modulo: 'atividades',
    cor: 'blue',
    condicoes: {
      all: [
        {
          id: 'qf_a_prox7',
          campoId: 'data_agendamento',
          operador: 'proximos_dias',
          valor: 7,
        },
      ],
      any: [],
    },
  },
]

export const QUICK_FILTERS_NEGOCIOS: QuickFilterDef[] = [
  {
    id: 'qf_neg_em_andamento',
    label: 'Em Andamento',
    modulo: 'negocios',
    cor: 'sky',
    condicoes: {
      all: [
        {
          id: 'qf_n_andamento',
          campoId: 'status',
          operador: 'e',
          valor: 'em andamento',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_neg_ganhos',
    label: 'Ganhos (Fechados)',
    modulo: 'negocios',
    cor: 'emerald',
    condicoes: {
      all: [
        {
          id: 'qf_n_ganhos',
          campoId: 'status',
          operador: 'e',
          valor: 'ganho',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_neg_perdidos',
    label: 'Perdidos',
    modulo: 'negocios',
    cor: 'rose',
    condicoes: {
      all: [
        {
          id: 'qf_n_perdidos',
          campoId: 'status',
          operador: 'e',
          valor: 'perdido',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_neg_energia_solar',
    label: 'Energia Solar',
    modulo: 'negocios',
    cor: 'amber',
    condicoes: {
      all: [
        {
          id: 'qf_n_solar',
          campoId: 'tipo_negocio',
          operador: 'e',
          valor: 'venda usina',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_neg_recorrencia',
    label: 'Com Recorrência Mensal',
    modulo: 'negocios',
    cor: 'teal',
    condicoes: {
      all: [
        {
          id: 'qf_n_rec',
          campoId: 'recorrencia_mensal',
          operador: 'e_verdadeiro',
        },
      ],
      any: [],
    },
  },
]

export const QUICK_FILTERS_CONTRATOS_OM: QuickFilterDef[] = [
  {
    id: 'qf_om_ativos',
    label: 'Ativos',
    modulo: 'contratos_om',
    cor: 'emerald',
    condicoes: {
      all: [
        {
          id: 'qf_om_atv',
          campoId: 'status',
          operador: 'e',
          valor: 'ativo',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_om_vencendo',
    label: 'Vencendo',
    modulo: 'contratos_om',
    cor: 'amber',
    condicoes: {
      all: [
        {
          id: 'qf_om_venc',
          campoId: 'status',
          operador: 'e',
          valor: 'vencendo',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_om_vencidos',
    label: 'Vencidos',
    modulo: 'contratos_om',
    cor: 'rose',
    condicoes: {
      all: [
        {
          id: 'qf_om_exp',
          campoId: 'status',
          operador: 'e',
          valor: 'vencido',
        },
      ],
      any: [],
    },
  },
  {
    id: 'qf_om_monitoramento',
    label: 'Plano Monitoramento',
    modulo: 'contratos_om',
    cor: 'sky',
    condicoes: {
      all: [
        {
          id: 'qf_om_mon',
          campoId: 'plano',
          operador: 'e',
          valor: 'monitoramento',
        },
      ],
      any: [],
    },
  },
]

export const QUICK_FILTERS_POR_MODULO: Record<ModuloFiltro, QuickFilterDef[]> = {
  clientes: QUICK_FILTERS_CLIENTES,
  atividades: QUICK_FILTERS_ATIVIDADES,
  negocios: QUICK_FILTERS_NEGOCIOS,
  contratos_om: QUICK_FILTERS_CONTRATOS_OM,
}

export function getQuickFiltersPorModulo(modulo: ModuloFiltro): QuickFilterDef[] {
  return QUICK_FILTERS_POR_MODULO[modulo] || []
}

/**
 * Cria ou atualiza um QuickFilterDef dinâmico a partir de seleção de valores em cabeçalho de coluna.
 */
export function criarQuickFilterColuna(
  modulo: ModuloFiltro,
  campoId: string,
  campoLabel: string,
  valoresSelecionados: string[],
): QuickFilterDef | null {
  if (!valoresSelecionados || valoresSelecionados.length === 0) return null

  const id = `qf_col_${modulo}_${campoId}`
  const label =
    valoresSelecionados.length === 1
      ? `${campoLabel}: ${valoresSelecionados[0]}`
      : `${campoLabel}: ${valoresSelecionados[0]} +${valoresSelecionados.length - 1}`

  const condicao =
    valoresSelecionados.length === 1
      ? {
          id: `cond_${id}`,
          campoId,
          operador: 'e' as const,
          valor: valoresSelecionados[0],
        }
      : {
          id: `cond_${id}`,
          campoId,
          operador: 'e_um_de' as const,
          valor: valoresSelecionados,
        }

  return {
    id,
    label,
    modulo,
    cor: 'sky',
    condicoes: {
      all: [condicao],
      any: [],
    },
  }
}

/**
 * Combina a estrutura de condições de um filtro salvo (se houver) com múltiplos quick filters ativos.
 * Cria uma estrutura unificada ALL contendo todas as condições ativas para o filtrosEngine.
 */
export function combinarEstruturasFiltros(
  estruturaFiltroSalvo: EstruturaCondicoes | null | undefined,
  quickFiltersAtivos: QuickFilterDef[],
): EstruturaCondicoes {
  const allCombinado = [...(estruturaFiltroSalvo?.all || [])]
  const anyCombinado = [...(estruturaFiltroSalvo?.any || [])]

  for (const qf of quickFiltersAtivos) {
    if (qf.condicoes?.all) {
      allCombinado.push(...qf.condicoes.all)
    }
    if (qf.condicoes?.any) {
      anyCombinado.push(...qf.condicoes.any)
    }
  }

  return {
    all: allCombinado,
    any: anyCombinado,
  }
}

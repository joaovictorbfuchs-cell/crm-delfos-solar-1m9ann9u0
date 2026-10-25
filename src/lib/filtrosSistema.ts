import type { FiltroSalvoRecord, ModuloFiltro } from '@/types/filtros'

/**
 * Filtros de Sistema Pré-Definidos do CRM Delfos Solar
 *
 * Definidos puramente em código (imunes a banco de dados vazio ou alterações de schema).
 * Aparecem fixos no topo do FiltroSalvoBar, com identificação visual "Sistema",
 * não editáveis e não excluíveis.
 */

export const FILTROS_SISTEMA_NEGOCIOS: FiltroSalvoRecord[] = [
  {
    id: 'sistema_negocios_ganhos',
    nome: 'Ganhos',
    modulo: 'negocios',
    visibilidade: 'shared',
    dono: 'sistema',
    dono_nome: 'Sistema Delfos',
    isSistema: true,
    condicoes: {
      all: [],
      any: [
        {
          id: 'sys_neg_ganhos_etapa',
          campoId: 'etapa_funil',
          operador: 'e_um_de',
          valor: ['contrato assinado', 'Fechado', 'fechado'],
        },
        {
          id: 'sys_neg_ganhos_status',
          campoId: 'status',
          operador: 'e_um_de',
          valor: ['ganho', 'Fechado', 'fechado'],
        },
      ],
    },
  },
  {
    id: 'sistema_negocios_perdidos',
    nome: 'Perdidos',
    modulo: 'negocios',
    visibilidade: 'shared',
    dono: 'sistema',
    dono_nome: 'Sistema Delfos',
    isSistema: true,
    condicoes: {
      all: [],
      any: [
        {
          id: 'sys_neg_perdidos_etapa',
          campoId: 'etapa_funil',
          operador: 'e_um_de',
          valor: ['perdido', 'Perdido'],
        },
        {
          id: 'sys_neg_perdidos_status',
          campoId: 'status',
          operador: 'e_um_de',
          valor: ['perdido', 'Perdido'],
        },
      ],
    },
  },
]

export const FILTROS_SISTEMA_CLIENTES: FiltroSalvoRecord[] = [
  {
    id: 'sistema_clientes_com_whatsapp',
    nome: 'Com WhatsApp',
    modulo: 'clientes',
    visibilidade: 'shared',
    dono: 'sistema',
    dono_nome: 'Sistema Delfos',
    isSistema: true,
    condicoes: {
      all: [
        {
          id: 'sys_cli_com_wpp',
          campoId: 'tem_whatsapp',
          operador: 'e_verdadeiro',
        },
      ],
      any: [],
    },
  },
  {
    id: 'sistema_clientes_sem_whatsapp',
    nome: 'Sem WhatsApp',
    modulo: 'clientes',
    visibilidade: 'shared',
    dono: 'sistema',
    dono_nome: 'Sistema Delfos',
    isSistema: true,
    condicoes: {
      all: [
        {
          id: 'sys_cli_sem_wpp',
          campoId: 'tem_whatsapp',
          operador: 'e_falso',
        },
      ],
      any: [],
    },
  },
]

export const FILTROS_SISTEMA_ATIVIDADES: FiltroSalvoRecord[] = [
  {
    id: 'sistema_atividades_atrasadas',
    nome: 'Atrasadas',
    modulo: 'atividades',
    visibilidade: 'shared',
    dono: 'sistema',
    dono_nome: 'Sistema Delfos',
    isSistema: true,
    condicoes: {
      all: [
        {
          id: 'sys_atv_atrasada',
          campoId: 'atrasada',
          operador: 'e_verdadeiro',
        },
      ],
      any: [],
    },
  },
]

export const FILTROS_SISTEMA_POR_MODULO: Record<ModuloFiltro, FiltroSalvoRecord[]> = {
  negocios: FILTROS_SISTEMA_NEGOCIOS,
  clientes: FILTROS_SISTEMA_CLIENTES,
  atividades: FILTROS_SISTEMA_ATIVIDADES,
  contratos_om: [],
}

/**
 * Retorna os filtros de sistema pré-definidos para um dado módulo
 */
export function getFiltrosSistema(modulo: ModuloFiltro): FiltroSalvoRecord[] {
  return FILTROS_SISTEMA_POR_MODULO[modulo] || []
}

/**
 * Verifica se um filtro é de sistema (pré-definido, não editável e não excluível)
 */
export function isFiltroSistema(filtro: FiltroSalvoRecord | null | undefined): boolean {
  if (!filtro) return false
  if (filtro.isSistema) return true
  return filtro.id.startsWith('sistema_')
}

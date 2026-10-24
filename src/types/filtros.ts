/**
 * Tipos e Definições para Filtros Salvos estilo Pipedrive (Fase 1)
 */

export type ModuloFiltro = 'clientes' | 'negocios'
export type VisibilidadeFiltro = 'private' | 'shared'

export type TipoCampoFiltro = 'texto' | 'numero' | 'data' | 'lista' | 'booleano'

export type OperadorTexto =
  | 'contem'
  | 'nao_contem'
  | 'e'
  | 'nao_e'
  | 'comeca_com'
  | 'esta_vazio'
  | 'nao_esta_vazio'
export type OperadorNumero =
  | 'igual'
  | 'diferente'
  | 'maior'
  | 'maior_igual'
  | 'menor'
  | 'menor_igual'
  | 'entre'
  | 'esta_vazio'
  | 'nao_esta_vazio'
export type OperadorData =
  | 'e'
  | 'antes_de'
  | 'depois_de'
  | 'entre'
  | 'ultimos_dias'
  | 'proximos_dias'
  | 'esta_vazio'
  | 'nao_esta_vazio'
export type OperadorLista =
  | 'e'
  | 'nao_e'
  | 'e_um_de'
  | 'nao_e_um_de'
  | 'esta_vazio'
  | 'nao_esta_vazio'
export type OperadorBooleano = 'e_verdadeiro' | 'e_falso'

export type OperadorCondicao =
  | OperadorTexto
  | OperadorNumero
  | OperadorData
  | OperadorLista
  | OperadorBooleano

export interface OpcaoSelect {
  label: string
  value: string
}

export interface DefinicaoCampo {
  id: string
  label: string
  tipo: TipoCampoFiltro
  modulo: ModuloFiltro
  categoria?: string
  opcoes?: OpcaoSelect[]
  placeholder?: string
  ajuda?: string
}

export interface CondicaoFiltro {
  id: string
  campoId: string
  operador: OperadorCondicao
  valor?: any
  valorSecundario?: any // usado em operadores 'entre'
}

export interface EstruturaCondicoes {
  // Bloco ALL (todas as condições devem ser satisfeitas)
  all: CondicaoFiltro[]
  // Bloco ANY (qualquer uma das condições deve ser satisfeita)
  any: CondicaoFiltro[]
}

export interface FiltroSalvoRecord {
  id: string
  nome: string
  modulo: ModuloFiltro
  condicoes: EstruturaCondicoes
  visibilidade: VisibilidadeFiltro
  dono: string
  dono_nome?: string
  created?: string
  updated?: string
}

export interface SalvarFiltroInput {
  nome: string
  modulo: ModuloFiltro
  condicoes: EstruturaCondicoes
  visibilidade: VisibilidadeFiltro
}

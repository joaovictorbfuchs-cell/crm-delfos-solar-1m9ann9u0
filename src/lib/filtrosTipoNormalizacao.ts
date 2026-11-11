/**
 * Normalização de comparação dos campos 'tipo' e 'categoria' do módulo ATIVIDADES
 * para o filtrosEngine.
 *
 * Problema resolvido: condições salvas guardam o RÓTULO (ex.: "Limpeza + Manutenção")
 * ou id custom, enquanto o registro carrega o valor canônico (ex.: 'limpeza') ou
 * tipo_custom_id. Esta comparação casa id canônico, id custom (custom_<id> e <id>)
 * e rótulo (tituloPadrao / nome cadastrado), usando como fonte da verdade:
 * - as opções injetadas no catálogo (buildCustomTipoDef/deduplicarTiposAtividades via
 *   injetarOpcoesTipoAtividades) — rótulo cadastrado → custom_<id>;
 * - ATIVIDADES_PADRAO + ALIASES_TIPOS_CANONICOS (src/constants/atividadesTipos.ts).
 *
 * Regras do projeto respeitadas: o tipo vem SÓ dos campos canônicos tipo/tipo_custom_id
 * (nenhuma heurística de título da atividade); 'limpeza_manutencao' é tratado como
 * alias legado de 'limpeza' na COMPARAÇÃO, mas nunca vira opção de filtro.
 */

import type { CondicaoFiltro, OpcaoSelect } from '@/types/filtros'
import {
  ALIASES_TIPOS_CANONICOS,
  ATIVIDADES_PADRAO,
  normalizarNomeTipo,
} from '@/constants/atividadesTipos'
import { getCampoPorId } from '@/lib/filtrosCatalogo'

const PREFIXO_CUSTOM = 'custom_'

/** Compacta um texto normalizado removendo tudo que não é letra/número (ex.: 'limpeza + manutencao' → 'limpezamanutencao') */
function compactarTexto(norm: string): string {
  return norm.replace(/[^a-z0-9]/g, '')
}

/** Opções atuais do campo 'tipo' (fallback canônico + tipos cadastrados injetados) */
function opcoesTipoAtividades(): OpcaoSelect[] {
  try {
    return getCampoPorId('atividades', 'tipo')?.opcoes ?? []
  } catch {
    return []
  }
}

/** Resolve id canônico ou título padrão para o id canônico ('' se não resolver) */
function canonicoDeIdOuTitulo(bruto: string, norm: string): string {
  const def = ATIVIDADES_PADRAO.find(
    (t) => t.id === bruto || normalizarNomeTipo(t.tituloPadrao) === norm,
  )
  return def?.id || ''
}

/**
 * Resolve um texto (id canônico, id custom, custom_<id> ou rótulo/título do tipo)
 * para a chave canônica de comparação: id canônico, custom_<id> ou texto normalizado.
 * Prioridade: opções injetadas (rótulo/valor cadastrado) → canônico → legado → aliases.
 */
export function chaveCanonicaTipo(texto: unknown): string {
  const bruto = String(texto ?? '').trim()
  if (!bruto) return ''
  const norm = normalizarNomeTipo(bruto)
  if (!norm) return ''
  const semUnderscore = norm.replace(/_/g, ' ')
  const compacto = compactarTexto(semUnderscore)

  // 1) Opções injetadas do catálogo (tipos cadastrados): rótulo ou valor exato
  for (const op of opcoesTipoAtividades()) {
    if (!op?.value) continue
    if (op.value === bruto || normalizarNomeTipo(op.label) === norm) {
      if (String(op.value).startsWith(PREFIXO_CUSTOM)) return String(op.value)
      return (
        canonicoDeIdOuTitulo(
          String(op.value),
          normalizarNomeTipo(String(op.value).replace(/_/g, ' ')),
        ) || String(op.value)
      )
    }
  }

  // 2) Id canônico ou título padrão (ex.: 'limpeza', 'Manutenção Preventiva')
  const canonico = canonicoDeIdOuTitulo(bruto, semUnderscore)
  if (canonico) return canonico

  // 3) Legado 'limpeza_manutencao' / 'Limpeza + Manutenção' sem tipo custom cadastrado:
  //    alias de comparação de 'limpeza' (nunca vira opção de filtro)
  if (compacto === 'limpezamanutencao' || compacto === 'limpezaemanutencao') return 'limpeza'

  // 4) Aliases canônicos (ALIASES_TIPOS_CANONICOS)
  for (const [canon, aliases] of Object.entries(ALIASES_TIPOS_CANONICOS)) {
    if (canon === norm) return canon
    const bateu = aliases.some((al) => {
      const alCompacto = compactarTexto(al)
      return (
        compacto === alCompacto ||
        semUnderscore === al ||
        semUnderscore.includes(al) ||
        al.includes(semUnderscore)
      )
    })
    if (bateu) return canon
  }

  return norm
}

/** Chaves canônicas de um valor de condição de filtro do campo 'tipo' */
export function chavesFiltroTipo(valor: unknown): string[] {
  const chaves = new Set<string>()
  const bruto = String(valor ?? '').trim()
  if (!bruto) return []
  chaves.add(chaveCanonicaTipo(bruto))
  const m = bruto.match(/^custom_(.+)$/i)
  if (m) chaves.add(chaveCanonicaTipo(m[1]))
  // Alias legado: 'Limpeza + Manutenção' (mesmo com tipo custom cadastrado) também casa
  // registros de limpeza pura (tipo='limpeza'/'limpeza_manutencao' sem custom id)
  const compacto = compactarTexto(normalizarNomeTipo(bruto))
  if (compacto === 'limpezamanutencao' || compacto === 'limpezaemanutencao') {
    chaves.add('limpeza')
  }
  chaves.delete('')
  return [...chaves]
}

/**
 * Chaves canônicas de identificação de tipo de um registro de atividade/OS.
 * Usa SÓ os campos canônicos (tipo, tipo_custom_id, tipo_servico, tipoId, tipoAtividade)
 * — nunca o título da atividade.
 */
export function chavesTipoRegistro(registro: any): string[] {
  const chaves = new Set<string>()
  if (registro == null) return []
  if (typeof registro === 'string' || typeof registro === 'number') {
    const c = chaveCanonicaTipo(registro)
    return c ? [c] : []
  }

  const raw = registro.metadata?.rawAtividade ?? registro

  const customId = String(raw.tipo_custom_id || registro.tipoCustomId || '').trim()
  if (customId) {
    chaves.add(chaveCanonicaTipo(`${PREFIXO_CUSTOM}${customId}`))
    chaves.add(chaveCanonicaTipo(customId))
    chaves.add(`${PREFIXO_CUSTOM}${customId}`)
  }

  const tipo = String(registro.tipo || registro.tipoId || raw.tipo || '').trim()
  if (tipo) chaves.add(chaveCanonicaTipo(tipo))

  const servico = String(
    registro.tipo_servico || registro.tipoServico || raw.tipo_servico || '',
  ).trim()
  if (servico) chaves.add(chaveCanonicaTipo(servico))

  const label = String(registro.tipoAtividade || '').trim()
  if (label) chaves.add(chaveCanonicaTipo(label))

  chaves.delete('')
  return [...chaves]
}

/**
 * Avalia uma condição (e/nao_e/e_um_de/nao_e_um_de) do campo 'tipo' comparando
 * conjuntos de chaves canônicas dos dois lados.
 */
export function avaliarCondicaoTipo(cond: CondicaoFiltro, registro: any): boolean {
  const chavesReg = new Set(chavesTipoRegistro(registro))
  if (cond.operador === 'esta_vazio') return chavesReg.size === 0
  if (cond.operador === 'nao_esta_vazio') return chavesReg.size > 0
  const valoresFiltro: unknown[] = Array.isArray(cond.valor) ? cond.valor : [cond.valor]
  const chavesFiltro = new Set<string>()
  valoresFiltro.forEach((v) => chavesFiltroTipo(v).forEach((k) => chavesFiltro.add(k)))

  const casou = [...chavesFiltro].some((k) => chavesReg.has(k))
  switch (cond.operador) {
    case 'e':
    case 'e_um_de':
      return casou
    case 'nao_e':
    case 'nao_e_um_de':
      return !casou
    default:
      return true
  }
}

/**
 * Normaliza um valor de categoria para a chave canônica:
 * 'comercial' | 'manutencao' | 'administrativo_pos_venda' (ou texto normalizado desconhecido).
 * Agrupa: "Manutenção" cobre preventiva, corretiva, limpeza (incl. limpeza_manutencao legado),
 * instalação, visita técnica, datalogger e garantia.
 */
export function categoriaCanonica(valor: unknown): string {
  const bruto = typeof valor === 'string' ? valor : String(valor ?? '')
  const norm = normalizarNomeTipo(bruto)
  if (!norm) return ''
  const semUnderscore = norm.replace(/_/g, ' ')
  if (semUnderscore.startsWith('comerc')) return 'comercial'
  if (
    semUnderscore.includes('manutencao') ||
    semUnderscore.startsWith('limpeza') ||
    semUnderscore.startsWith('instalac') ||
    semUnderscore.startsWith('visita') ||
    semUnderscore.startsWith('garantia') ||
    semUnderscore.includes('datalogger')
  ) {
    return 'manutencao'
  }
  if (
    semUnderscore.startsWith('admin') ||
    semUnderscore.includes('pos venda') ||
    semUnderscore.includes('pos-venda')
  ) {
    return 'administrativo_pos_venda'
  }
  return norm
}

/** Rótulo de exibição da categoria canônica (compatível com o catálogo de filtros) */
export function rotuloCategoriaCanonica(cat: string): string {
  switch (cat) {
    case 'comercial':
      return 'Comercial'
    case 'manutencao':
      return 'Manutenção'
    case 'administrativo_pos_venda':
      return 'Administrativas'
    default:
      return cat
  }
}

/**
 * Categoria canônica derivada do TIPO canônico da atividade (não de heurística de título).
 * Ex.: 'manutencao_preventiva' → 'manutencao'; 'limpeza_manutencao' → 'manutencao'.
 */
export function categoriaDeTipoAtividade(tipoValor: unknown): string {
  const chave = chaveCanonicaTipo(tipoValor)
  if (!chave) return ''
  const def = ATIVIDADES_PADRAO.find((t) => t.id === chave)
  return def?.categoria || ''
}

/**
 * Categoria canônica a partir de um registro de atividade (ou de um valor solto).
 * Prioridade: tipo canônico (regra do projeto) → campos categoria* do registro.
 */
export function categoriaCanonicaDeRegistro(registro: any): string {
  if (registro == null) return ''
  if (typeof registro === 'string' || typeof registro === 'number') {
    return categoriaCanonica(registro)
  }
  if (typeof registro !== 'object') return categoriaCanonica(registro)

  const raw = registro.metadata?.rawAtividade ?? registro
  const porTipo = categoriaDeTipoAtividade(
    registro.tipo ||
      registro.tipo_atividade ||
      registro.tipoId ||
      registro.tipo_custom_id ||
      registro.tipoCustomId ||
      raw.tipo ||
      raw.tipo_custom_id ||
      '',
  )
  if (porTipo) return porTipo
  const bruto =
    raw.categoriaId ||
    raw.categoria ||
    raw.categoriaNome ||
    registro.categoriaNome ||
    registro.categoria ||
    registro.categoriaId ||
    ''
  return categoriaCanonica(bruto)
}

/** Avalia uma condição (e/nao_e/e_um_de/nao_e_um_de) do campo 'categoria' agrupando tipos */
export function avaliarCondicaoCategoria(cond: CondicaoFiltro, valorRegistro: any): boolean {
  const valReg = categoriaCanonicaDeRegistro(valorRegistro)
  const valores: unknown[] = Array.isArray(cond.valor) ? cond.valor : [cond.valor]
  switch (cond.operador) {
    case 'e':
      return valReg !== '' && valReg === categoriaCanonica(cond.valor)
    case 'nao_e':
      return valReg !== categoriaCanonica(cond.valor)
    case 'e_um_de':
      return valores.some((v) => valReg !== '' && categoriaCanonica(v) === valReg)
    case 'nao_e_um_de':
      return !valores.some((v) => valReg !== '' && categoriaCanonica(v) === valReg)
    default:
      return true
  }
}

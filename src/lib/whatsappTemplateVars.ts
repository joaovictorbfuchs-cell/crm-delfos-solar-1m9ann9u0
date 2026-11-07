/**
 * Interpolação central de variáveis dos templates WhatsApp (espelho TS do módulo backend
 * pocketbase/hooks/whatsapp_template_vars.js).
 *
 * Regras:
 *  - 1ª passada: placeholders {{chave}}
 *  - 2ª passada: placeholders [chave] (case-insensitive)
 *  - chaves normalizadas trim/lowercase/sem acentos
 *  - variável ausente no contexto → placeholder removido + espaço duplo colapsado (órfãs logadas)
 *  - a saída NUNCA contém '{{' nem '[' de placeholder
 */

export type ContextoInterpolacao = Record<string, string | number | null | undefined>

const REMOVE_ACCENTS = /[\u0300-\u036f]/g

/** Grupos de aliases — espelho de GRUPOS_ALIASES no módulo backend. */
export const GRUPOS_ALIASES: Record<string, string[]> = {
  nome_cliente: [
    'nome_cliente',
    'nome do cliente',
    'nome',
    'cliente',
    'cliente_nome',
    'nomecliente',
  ],
  empresa: ['empresa', 'nome_da_empresa', 'nome da empresa', 'empresa_nome'],
  valor_proposta: ['valor_proposta', 'valor da proposta', 'valor'],
  data: ['data', 'data atual', 'data_atual', 'data de hoje', 'hoje'],
  cidade: ['cidade'],
  potencia: ['potencia', 'potência', 'potencia_kwp', 'potencia da usina'],
  usina: ['usina', 'nome_usina', 'nome da usina'],
  numero_uc: [
    'numero_uc',
    'número da uc',
    'numero da uc',
    'numero_da_uc',
    'uc',
    'numero_instalacao',
    'número da instalação',
    'numero_instalacao_rge',
  ],
  endereco: ['endereco', 'endereço', 'endereco_uc', 'endereco_instalacao'],
  data_agendada: ['data_agendada', 'data agendada', 'data da visita'],
  tipo_servico: ['tipo_servico', 'tipo de serviço', 'tipo de servico', 'servico', 'serviço'],
  nome_instalador: ['nome_instalador', 'nome do instalador', 'instalador', 'tecnico', 'técnico'],
  dia_anterior: ['dia_anterior', 'dia anterior'],
  mes: ['mes', 'mês'],
}

export function normalizarChave(chave: string): string {
  return String(chave == null ? '' : chave)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(REMOVE_ACCENTS, '')
    .replace(/\s+/g, ' ')
}

// alias dobrado -> nome canônico
const ALIAS_PARA_CANON: Record<string, string> = (() => {
  const mapa: Record<string, string> = {}
  for (const canon of Object.keys(GRUPOS_ALIASES)) {
    for (const alias of GRUPOS_ALIASES[canon]) {
      const k = normalizarChave(alias)
      if (!mapa[k]) mapa[k] = canon
    }
  }
  return mapa
})()

function valorResolvido(chave: string, mapa: Record<string, string>): string | null {
  const canon = ALIAS_PARA_CANON[normalizarChave(chave)] || normalizarChave(chave)
  if (Object.prototype.hasOwnProperty.call(mapa, canon)) {
    const v = mapa[canon]
    if (v !== null && v !== undefined && String(v).trim() !== '') return String(v)
  }
  return null
}

/** Consolida o contexto: canônicos a partir de qualquer alias + chaves extras diretas. */
export function normalizarContexto(ctx: ContextoInterpolacao): Record<string, string> {
  const fonte: Record<string, string> = {}
  if (ctx && typeof ctx === 'object') {
    for (const k of Object.keys(ctx)) {
      let v = ctx[k]
      if (v === undefined || v === null) continue
      if (typeof v === 'object') v = JSON.stringify(v)
      fonte[normalizarChave(k)] = String(v)
    }
  }
  const mapa: Record<string, string> = {}
  for (const canon of Object.keys(GRUPOS_ALIASES)) {
    for (const alias of GRUPOS_ALIASES[canon]) {
      const vAlias = fonte[normalizarChave(alias)]
      if (vAlias !== undefined && String(vAlias).trim() !== '') {
        mapa[canon] = vAlias
        break
      }
    }
  }
  for (const chave of Object.keys(fonte)) {
    if (!(chave in mapa) && String(fonte[chave]).trim() !== '') mapa[chave] = fonte[chave]
  }
  return mapa
}

function limparEspacosOrfaos(t: string): string {
  const linhas = String(t).split('\n')
  const out = linhas.map((l) =>
    l
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+([,.;:!?])/g, '$1')
      .replace(/[ \t]+$/, ''),
  )
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Interpola e devolve { texto, faltando } — para log de variáveis órfãs. */
export function interpolarComDetalhe(
  texto: string,
  contexto: ContextoInterpolacao = {},
  tag?: string,
): { texto: string; faltando: string[] } {
  const t = String(texto == null ? '' : texto)
  const mapa = normalizarContexto(contexto)
  const faltando: string[] = []
  const vistos: Record<string, boolean> = {}

  const registrarFalta = (chave: string): string => {
    if (!vistos[chave]) {
      vistos[chave] = true
      faltando.push(chave)
    }
    return ''
  }

  const ABRE_CHAVE = String.fromCharCode(123) // "{"
  const FECHA_CHAVE = String.fromCharCode(125) // "}"
  const RE_MOSTRAR = new RegExp(
    ABRE_CHAVE +
      ABRE_CHAVE +
      '\\s*[^' +
      ABRE_CHAVE +
      FECHA_CHAVE +
      '\\n]+?\\s*' +
      FECHA_CHAVE +
      FECHA_CHAVE,
    'g',
  )

  // 1ª passada: {{chave}}
  const t1 = t.replace(RE_MOSTRAR, (match: string) => {
    const chave = match.slice(2, -2)
    const valor = valorResolvido(chave, mapa)
    if (valor === null) return registrarFalta(match)
    return valor
  })

  // 2ª passada: [chave] case-insensitive
  const t2 = t1.replace(/\[([^[\]\n]+?)\]/g, (_, chave: string) => {
    const valor = valorResolvido(chave, mapa)
    if (valor === null) return registrarFalta('[' + chave + ']')
    return valor
  })

  const saida = limparEspacosOrfaos(t2)

  if (faltando.length > 0) {
    console.warn(
      `[whatsappTemplateVars${tag ? ':' + tag : ''}] Variáveis sem valor removidas do texto: ` +
        faltando.join(', '),
    )
  }

  return { texto: saida, faltando }
}

/** Interpolação direta (retorna só o texto final). */
export function interpolarTemplate(
  texto: string,
  contexto: ContextoInterpolacao = {},
  tag?: string,
): string {
  return interpolarComDetalhe(texto, contexto, tag).texto
}

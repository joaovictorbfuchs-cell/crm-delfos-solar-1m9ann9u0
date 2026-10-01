/**
 * Utilitários para formatação e deduplicação de potências e especificações
 * de equipamentos (especialmente módulos fotovoltaicos) em propostas e documentos.
 */

/**
 * Escapa caracteres especiais para uso seguro em RegExp.
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

/**
 * Verifica se a descrição do equipamento já contém a potência informada.
 * Cobre formatos comuns como "550W", "550 W", "550Wp", "550 wp", etc.
 */
export function descricaoContemPotencia(
  descricao: string | null | undefined,
  potenciaWp: number | string | null | undefined,
): boolean {
  if (!descricao || potenciaWp === null || potenciaWp === undefined) {
    return false
  }

  const potenciaNum =
    typeof potenciaWp === 'number'
      ? potenciaWp
      : parseFloat(String(potenciaWp).replace(/[^\d.]/g, ''))
  if (!potenciaNum || isNaN(potenciaNum)) {
    return false
  }

  const safePotencia = escapeRegex(String(Math.round(potenciaNum)))
  const regex = new RegExp(`\\b${safePotencia}\\s*(?:w|wp)\\b`, 'i')
  return regex.test(descricao)
}

/**
 * Remove ocorrências repetidas da potência no texto, mantendo apenas a primeira,
 * e limpa espaços duplos remanescentes.
 */
export function deduplicarPotenciaTexto(
  descricao: string | null | undefined,
  potenciaWp: number | string | null | undefined,
): string {
  if (!descricao) {
    return ''
  }

  if (potenciaWp === null || potenciaWp === undefined) {
    return descricao.trim().replace(/\s{2,}/g, ' ')
  }

  const potenciaNum =
    typeof potenciaWp === 'number'
      ? potenciaWp
      : parseFloat(String(potenciaWp).replace(/[^\d.]/g, ''))
  if (!potenciaNum || isNaN(potenciaNum)) {
    return descricao.trim().replace(/\s{2,}/g, ' ')
  }

  const safePotencia = escapeRegex(String(Math.round(potenciaNum)))
  const regexGlobal = new RegExp(`\\b${safePotencia}\\s*(?:w|wp)\\b`, 'gi')

  let ocorrencias = 0
  const resultado = descricao.replace(regexGlobal, (match) => {
    ocorrencias++
    if (ocorrencias === 1) {
      return match
    }
    return ''
  })

  return resultado
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .trim()
}

export interface FormatarTextoModuloCardParams {
  descricao?: string | null
  potenciaWp?: number | string | null
  caracteristicas?: string | null
}

/**
 * Formata o texto exibido no card "Módulos Fotovoltaicos":
 * - Se a descrição já contém a potência: `"<desc dedup> (<caracteristicas>)."`
 * - Se não contém: `"<desc> (<potenciaWp>W cada • <caracteristicas>)."`
 * Fallback de descrição: "Módulos Tier-1". Fallback de características: "bifacial N-type".
 */
export function formatarTextoModuloCard({
  descricao,
  potenciaWp,
  caracteristicas,
}: FormatarTextoModuloCardParams): string {
  const descBase = (descricao && descricao.trim()) || 'Módulos Tier-1'
  const carac = (caracteristicas && caracteristicas.trim()) || 'bifacial N-type'
  const temPotencia = descricaoContemPotencia(descBase, potenciaWp)

  if (temPotencia) {
    const descDedup = deduplicarPotenciaTexto(descBase, potenciaWp)
    return `${descDedup} (${carac}).`
  }

  const potFormatada =
    potenciaWp !== null && potenciaWp !== undefined && !isNaN(Number(potenciaWp))
      ? `${Math.round(Number(potenciaWp))}W cada • `
      : ''

  return `${descBase} (${potFormatada}${carac}).`
}

export interface FormatarTextoModuloDocxParams {
  quantidade: number | string
  descricao?: string | null
  potenciaWp?: number | string | null
  caracteristicas?: string | null
}

/**
 * Formata o texto do módulo para geração de DOCX, com prefixo `${quantidade}x `.
 * Mesma regra de deduplicação e formato.
 */
export function formatarTextoModuloDocx({
  quantidade,
  descricao,
  potenciaWp,
  caracteristicas,
}: FormatarTextoModuloDocxParams): string {
  const textoCard = formatarTextoModuloCard({
    descricao,
    potenciaWp,
    caracteristicas,
  })

  // Remove o ponto final ao prefixar com quantidade caso necessário, ou mantém limpo
  const textoLimpo = textoCard.endsWith('.') ? textoCard.slice(0, -1) : textoCard
  return `${quantidade}x ${textoLimpo}`
}

/**
 * Formata potência de equipamento conforme regra do tipo:
 * - Placa solar unitária: sempre Watts (W)
 * - Inversor: sempre kW
 */
export function formatarPotenciaEquipamentoUnidade(
  potenciaW: number | null | undefined,
  tipo?: string | null,
): string {
  if (potenciaW === null || potenciaW === undefined || isNaN(potenciaW) || potenciaW <= 0) {
    return tipo === 'modulo_fv' ? '0 W' : '0 kW'
  }
  const isModulo = tipo === 'modulo_fv' || (!tipo && potenciaW <= 800)
  const kw = potenciaW / 1000
  const kwFormatado = parseFloat(kw.toFixed(3)).toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
  })
  const formattedW = `${Math.round(potenciaW).toLocaleString('pt-BR')} W`

  if (isModulo) {
    return `${formattedW} (${kwFormatado} kW)`
  }
  return `${kwFormatado} kW (${formattedW})`
}

/**
 * Formata potência de pico (soma das placas) sempre em kW / kWp
 */
export function formatarPotenciaPico(
  potencia: number | null | undefined,
  opcoes?: { valorJaEmKw?: boolean; sufixoKwp?: boolean },
): string {
  const val = Number(potencia) || 0
  if (val <= 0 || isNaN(val)) {
    return opcoes?.sufixoKwp ? '0 kWp' : '0 kW'
  }
  const kw =
    opcoes?.valorJaEmKw !== undefined
      ? opcoes.valorJaEmKw
        ? val
        : val / 1000
      : val > 500
        ? val / 1000
        : val

  const kwFormatado = parseFloat(kw.toFixed(3)).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })
  const sufixo = opcoes?.sufixoKwp ? 'kWp' : 'kW'
  return `${kwFormatado} ${sufixo}`
}

import pb from '@/lib/pocketbase/client'

/**
 * Retorna o primeiro nome do usuário logado (ex.: "Daniel" de "Daniel Silveira", "Cassio" de "Cassio").
 * Lê de pb.authStore.record: campos name / nome / username.
 * Se não houver usuário logado ou nome preenchido, usa o fallback informado (padrão: "Atendente").
 */
export function obterPrimeiroNomeUsuarioLogado(fallback: string = 'Atendente'): string {
  try {
    const record = pb?.authStore?.record as Record<string, unknown> | null | undefined
    if (!record) return fallback

    const raw =
      (typeof record.name === 'string' && record.name.trim()) ||
      (typeof record.nome === 'string' && record.nome.trim()) ||
      (typeof record.username === 'string' && record.username.trim()) ||
      ''

    if (!raw) return fallback

    // Pega a primeira palavra (remove pontuações ou espaços extras)
    const primeiraPalavra = raw.trim().split(/\s+/)[0]
    return primeiraPalavra || fallback
  } catch {
    return fallback
  }
}

/**
 * Regex que identifica se uma mensagem já começa com prefixo entre colchetes seguido de dois-pontos.
 * Exemplo: "[Daniel]: Olá", "[Cassio]: ", "[João Victor]: "
 */
export const REGEX_PREFIXO_MANUAL = /^\[[^\]]+\]:\s*/

/**
 * Verifica se a mensagem já possui prefixo de remetente entre colchetes.
 */
export function jaPossuiPrefixoManual(texto: string): boolean {
  if (!texto) return false
  return REGEX_PREFIXO_MANUAL.test(texto.trim())
}

/**
 * Aplica o prefixo "[PrimeiroNome]: " à mensagem enviada manualmente por um usuário.
 * Regras:
 * 1. Não duplica se a mensagem já começa com "[Nome]: ".
 * 2. Se o texto estiver vazio ou apenas espaços, retorna vazio sem inventar mensagem.
 * 3. Usa o primeiro nome do usuário logado (ou nomeCustomizado se passado).
 */
/**
 * Remove qualquer prefixo no formato "[Nome]: " do início do texto.
 * Utilizado para garantir que títulos de cards e oportunidades no funil não exibam o prefixo do WhatsApp.
 */
export function removerPrefixoMensagemManual(texto?: string): string {
  if (!texto || typeof texto !== 'string') return ''
  return texto.replace(REGEX_PREFIXO_MANUAL, '').trim()
}

export function aplicarPrefixoMensagemManual(texto: string, nomeCustomizado?: string): string {
  if (!texto || typeof texto !== 'string') return ''
  const trimmed = texto.trim()
  if (!trimmed) return ''

  // Não duplica se já tiver prefixo no formato [Nome]:
  if (jaPossuiPrefixoManual(trimmed)) {
    return trimmed
  }

  const nome =
    (nomeCustomizado && nomeCustomizado.trim().split(/\s+/)[0]) || obterPrimeiroNomeUsuarioLogado()
  return `[${nome}]: ${trimmed}`
}

/**
 * Formata o número do endereço seguindo o padrão oficial da Delfos Solar:
 * - Se preenchido e diferente de "S/N" / "s/n", retorna "nº {numero}"
 * - Se vazio, null, undefined ou "S/N", retorna string vazia ""
 */
export function formatarNumeroEndereco(numero?: string | null): string {
  if (!numero) return ''
  const trimmed = String(numero).trim()
  if (!trimmed || trimmed.toUpperCase() === 'S/N') return ''
  // Se o próprio valor já começar com "nº" ou "n.", apenas retorna o valor limpo
  if (/^n[ºo°.]\s*/i.test(trimmed)) {
    return trimmed
  }
  return `nº ${trimmed}`
}

/**
 * Monta o endereço concatenando logradouro, número formatado, bairro e cidade/município,
 * filtrando campos vazios.
 */
export function formatarEnderecoComNumero(params: {
  endereco?: string | null
  numero?: string | null
  bairro?: string | null
  cidade?: string | null
  fallback?: string
}): string {
  const numFmt = formatarNumeroEndereco(params.numero)
  const partes = [
    params.endereco?.trim(),
    numFmt,
    params.bairro?.trim(),
    params.cidade?.trim(),
  ].filter(Boolean) as string[]

  if (partes.length === 0) {
    return params.fallback || ''
  }

  return partes.join(', ')
}

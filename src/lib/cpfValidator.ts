/**
 * Utilitários para formatação e validação de CPF brasileiro
 */

/**
 * Remove caracteres não numéricos
 */
export function limparCPF(cpfRaw: string | undefined | null): string {
  if (!cpfRaw) return ''
  return cpfRaw.replace(/\D/g, '')
}

/**
 * Formata CPF: 000.000.000-00
 */
export function formatarCPF(cpfRaw: string): string {
  const digits = (cpfRaw || '').replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

/**
 * Formata CPF ou CNPJ progressivamente conforme o número de dígitos (até 14 dígitos).
 * - até 11 dígitos: máscara progressiva de CPF (000.000.000-00)
 * - 12 a 14 dígitos: máscara progressiva de CNPJ (00.000.000/0000-00)
 * - Aceita entradas coladas com pontuação (limpa caracteres não numéricos antes).
 */
export function formatarCpfCnpj(docRaw: string | undefined | null): string {
  if (!docRaw) return ''
  const digits = docRaw.replace(/\D/g, '').slice(0, 14)
  if (!digits) return ''

  if (digits.length <= 11) {
    // Máscara dinâmica CPF
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }

  // Máscara dinâmica CNPJ (12 a 14 dígitos)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

/**
 * Validação com algoritmo oficial dos dígitos verificadores do CPF
 */
export function validarCPF(cpfRaw: string): boolean {
  const cpf = limparCPF(cpfRaw)
  if (cpf.length !== 11) return false

  // Rejeita sequências de dígitos todos iguais (111.111.111-11, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Validação do 1º dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(9), 10)) return false

  // Validação do 2º dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i), 10) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(10), 10)) return false

  return true
}

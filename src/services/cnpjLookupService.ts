import { validarCNPJ, formatarCNPJ } from '@/lib/orcamentoParser'
import { formatWhatsAppPhone } from '@/lib/formatters'

export interface CnpjDataNormalized {
  cnpj: string
  razao_social: string
  nome_fantasia: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  municipio: string
  uf: string
  cep: string
  telefone: string
  email: string
  situacao_cadastral: string
  cnae_principal: string
  cnae_codigo: string
  data_abertura: string
  origem_api: 'brasilapi' | 'publicacnpj'
}

export type CnpjLookupStatus = 'idle' | 'loading' | 'success' | 'not_found' | 'error'

/**
 * Normaliza CNPJ removendo tudo o que não for dígito
 */
export function limparCNPJ(valor: string | undefined | null): string {
  if (!valor) return ''
  return valor.replace(/\D/g, '')
}

/**
 * Formata CEP (00000-000)
 */
export function formatarCEP(cep: string | undefined | null): string {
  if (!cep) return ''
  const clean = cep.replace(/\D/g, '').slice(0, 8)
  if (clean.length <= 5) return clean
  return `${clean.slice(0, 5)}-${clean.slice(5)}`
}

/**
 * Formata telefone unindo DDD + número e aplicando máscara de telefone/celular
 */
function comporTelefone(ddd?: string, numero?: string, fallback?: string): string {
  if (fallback && fallback.trim()) {
    const limpo = fallback.replace(/\D/g, '')
    if (limpo.length >= 10) return formatWhatsAppPhone(limpo)
  }
  const cleanDdd = (ddd || '').replace(/\D/g, '')
  const cleanNum = (numero || '').replace(/\D/g, '')
  const combinado = `${cleanDdd}${cleanNum}`
  if (combinado.length >= 10) {
    return formatWhatsAppPhone(combinado)
  }
  if (combinado.length > 0) return combinado
  return ''
}

/**
 * Normaliza data YYYY-MM-DD para compatibilidade com inputs do tipo date
 */
function normalizarData(dataStr?: string | null): string {
  if (!dataStr) return ''
  const trimmed = dataStr.trim()
  // Se vier no formato DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('/')
    return `${y}-${m}-${d}`
  }
  // Se vier YYYY-MM-DD ou ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }
  return trimmed
}

/**
 * Consulta na BrasilAPI: https://brasilapi.com.br/api/cnpj/v1/{cnpj}
 */
async function consultarBrasilApi(
  cnpjLimpo: string,
  signal?: AbortSignal,
): Promise<CnpjDataNormalized | null> {
  const url = `https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`
  const response = await fetch(url, { signal })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`BrasilAPI HTTP error: ${response.status}`)
  }

  const data = await response.json()

  const logradouroCompleto = [data.descricao_tipo_de_logradouro, data.logradouro]
    .filter(Boolean)
    .join(' ')
    .trim()

  const telefoneFinal = comporTelefone(
    data.ddd_telefone_1 ? '' : '',
    '',
    data.ddd_telefone_1 || data.ddd_telefone_2,
  )

  return {
    cnpj: formatarCNPJ(data.cnpj || cnpjLimpo),
    razao_social: (data.razao_social || '').trim(),
    nome_fantasia: (data.nome_fantasia || '').trim(),
    logradouro: logradouroCompleto || (data.logradouro || '').trim(),
    numero: (data.numero || '').trim(),
    complemento: (data.complemento || '').trim(),
    bairro: (data.bairro || '').trim(),
    municipio: (data.municipio || '').trim(),
    uf: (data.uf || '').trim().toUpperCase(),
    cep: formatarCEP(data.cep),
    telefone: telefoneFinal,
    email: (data.email || '').trim().toLowerCase(),
    situacao_cadastral: (
      data.descricao_situacao_cadastral ||
      (data.situacao_cadastral === 2 ? 'ATIVA' : '') ||
      ''
    ).trim(),
    cnae_principal: (data.cnae_fiscal_descricao || '').trim(),
    cnae_codigo: String(data.cnae_fiscal || ''),
    data_abertura: normalizarData(data.data_inicio_atividade),
    origem_api: 'brasilapi',
  }
}

/**
 * Consulta na Publica CNPJ (Fallback): https://publica.cnpj.ws/cnpj/{cnpj}
 */
async function consultarPublicaCnpj(
  cnpjLimpo: string,
  signal?: AbortSignal,
): Promise<CnpjDataNormalized | null> {
  const url = `https://publica.cnpj.ws/cnpj/${cnpjLimpo}`
  const response = await fetch(url, { signal })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`PublicaCNPJ HTTP error: ${response.status}`)
  }

  const data = await response.json()
  const est = data.estabelecimento || {}

  const tipoLog = est.tipo_logradouro || ''
  const logr = est.logradouro || ''
  const logradouroCompleto = [tipoLog, logr].filter(Boolean).join(' ').trim()

  const telefoneFinal = comporTelefone(
    est.ddd1,
    est.telefone1,
    est.telefone2 ? `${est.ddd2 || ''}${est.telefone2}` : undefined,
  )

  const cnaeDesc =
    est.atividade_principal?.descricao ||
    (Array.isArray(est.atividades_secundarias) && est.atividades_secundarias[0]?.descricao) ||
    ''
  const cnaeCod = est.atividade_principal?.subclasse || est.atividade_principal?.id || ''

  const situacao = est.situacao_cadastral || ''

  return {
    cnpj: formatarCNPJ(est.cnpj || cnpjLimpo),
    razao_social: (data.razao_social || '').trim(),
    nome_fantasia: (est.nome_fantasia || '').trim(),
    logradouro: logradouroCompleto,
    numero: (est.numero || '').trim(),
    complemento: (est.complemento || '').trim(),
    bairro: (est.bairro || '').trim(),
    municipio: (est.cidade?.nome || '').trim(),
    uf: (est.estado?.sigla || '').trim().toUpperCase(),
    cep: formatarCEP(est.cep),
    telefone: telefoneFinal,
    email: (est.email || '').trim().toLowerCase(),
    situacao_cadastral: situacao.trim(),
    cnae_principal: cnaeDesc.trim(),
    cnae_codigo: String(cnaeCod),
    data_abertura: normalizarData(est.data_inicio_atividade),
    origem_api: 'publicacnpj',
  }
}

/**
 * Executa a consulta de CNPJ com fallback automático de BrasilAPI -> Publica CNPJ
 */
export async function consultarCNPJReceita(
  cnpjInput: string,
  options?: { signal?: AbortSignal },
): Promise<{ success: boolean; data?: CnpjDataNormalized; notFound?: boolean; error?: string }> {
  const cnpjLimpo = limparCNPJ(cnpjInput)

  if (cnpjLimpo.length !== 14) {
    return {
      success: false,
      error: 'CNPJ deve conter 14 dígitos.',
    }
  }

  if (!validarCNPJ(cnpjLimpo)) {
    return {
      success: false,
      error: 'CNPJ inválido (dígitos verificadores incorretos).',
    }
  }

  // 1ª Tentativa: BrasilAPI
  try {
    const resBrasil = await consultarBrasilApi(cnpjLimpo, options?.signal)
    if (resBrasil) {
      return { success: true, data: resBrasil }
    }
    // Se retornou 404 na BrasilAPI, podemos tentar na Publica CNPJ como garantia antes de cravar "not_found"
  } catch (err: unknown) {
    console.warn('[CNPJ Lookup] Falha na BrasilAPI, tentando fallback na Publica CNPJ...', err)
  }

  // 2ª Tentativa (Fallback): Publica CNPJ
  try {
    const resPublica = await consultarPublicaCnpj(cnpjLimpo, options?.signal)
    if (resPublica) {
      return { success: true, data: resPublica }
    }
    return {
      success: false,
      notFound: true,
      error: 'CNPJ não encontrado na Receita Federal.',
    }
  } catch (err: unknown) {
    console.error('[CNPJ Lookup] Falha em ambas as APIs (BrasilAPI e Publica CNPJ):', err)
    return {
      success: false,
      error:
        'Não foi possível consultar os dados na Receita Federal no momento. O cadastro manual continua disponível.',
    }
  }
}

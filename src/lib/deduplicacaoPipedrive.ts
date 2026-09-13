import type { Cliente, ClienteStatus, TipoPessoa } from '@/types/crm'

export type CriterioDuplicacao = 'cpf_cnpj' | 'nome_similar' | 'telefone' | 'email'

export interface CorrespondenciaContaAzul {
  clienteContaAzul: Cliente
  criterio: CriterioDuplicacao
  detalhe: string
  similaridadeNome?: number
}

export type DecisaoRevisaoItem = 'atualizar' | 'ignorar'

export interface ItemRevisaoPipedrive {
  idTemp: string
  // Dados extraídos da planilha do Pipedrive
  nome: string
  telefone: string
  whatsapp: string
  email: string
  cpf: string
  cnpj: string
  cidade: string
  estado: string
  endereco: string
  statusSugerido: ClienteStatus // 'Fechado' para duplicata Conta Azul, 'Novo Lead' para lead novo
  tipo_pessoa: TipoPessoa
  valor_estimado: number
  data_ultimo_contato?: string
  dados_importados?: Record<string, string>

  // Classificação
  isDuplicadoContaAzul: boolean
  correspondencia?: CorrespondenciaContaAzul

  // Ação para duplicado ('atualizar' | 'ignorar')
  acaoDuplicado: DecisaoRevisaoItem

  // Confirmação para leads novos (marcado por padrão)
  aprovadoParaImportar: boolean
}

/**
 * Normaliza strings removendo acentuação, caracteres especiais e espaços duplicados
 */
export function normalizarTexto(str: string | undefined | null): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Limpa números de documentos (apenas dígitos)
 */
export function normalizarDocumento(doc: string | undefined | null): string {
  if (!doc) return ''
  return doc.replace(/\D/g, '')
}

/**
 * Limpa telefones pegando apenas dígitos.
 * Se tiver 12 ou 13 dígitos começando com 55 (DDI Brasil), remove o 55 para comparar DDD + número.
 */
export function normalizarTelefone(tel: string | undefined | null): string {
  if (!tel) return ''
  let digits = tel.replace(/\D/g, '')
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  return digits
}

/**
 * Compara dois telefones considerando dígitos significativos (8 a 11 dígitos, ex. fixo ou celular com ou sem 9)
 */
export function telefonesIguais(
  telA: string | undefined | null,
  telB: string | undefined | null,
): boolean {
  const a = normalizarTelefone(telA)
  const b = normalizarTelefone(telB)
  if (!a || !b) return false
  if (a.length < 8 || b.length < 8) return false

  // Se forem idênticos
  if (a === b) return true

  // Comparar os últimos 8 ou 9 dígitos (caso de variação de nono dígito ou DDD incluso)
  const ultimos8A = a.slice(-8)
  const ultimos8B = b.slice(-8)
  if (ultimos8A === ultimos8B) {
    // Se ambos tiverem DDD (10 ou 11 dígitos), o DDD também deve bater
    if (a.length >= 10 && b.length >= 10) {
      const dddA = a.slice(0, 2)
      const dddB = b.slice(0, 2)
      return dddA === dddB
    }
    return true
  }

  return false
}

/**
 * Normaliza e-mail
 */
export function normalizarEmail(email: string | undefined | null): string {
  if (!email) return ''
  return email.toLowerCase().trim()
}

/**
 * Similaridade de strings usando Dice / Bigram Coefficient (valor entre 0 e 1)
 */
export function calcularSimilaridadeTexto(strA: string, strB: string): number {
  const a = normalizarTexto(strA)
  const b = normalizarTexto(strB)

  if (!a && !b) return 1
  if (!a || !b) return 0
  if (a === b) return 1

  // Se um contiver o outro exatamente e for razoavelmente longo
  if (a.includes(b) && b.length >= 5) {
    const ratio = b.length / a.length
    if (ratio >= 0.8) return Math.max(0.88, ratio)
  }
  if (b.includes(a) && a.length >= 5) {
    const ratio = a.length / b.length
    if (ratio >= 0.8) return Math.max(0.88, ratio)
  }

  // Bigrams (bi-gramas de caracteres)
  const getBigrams = (str: string): string[] => {
    const bigrams: string[] = []
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.push(str.slice(i, i + 2))
    }
    return bigrams
  }

  const bigramsA = getBigrams(a)
  const bigramsB = getBigrams(b)

  if (bigramsA.length === 0 || bigramsB.length === 0) return 0

  let matches = 0
  const bCopy = [...bigramsB]

  for (const bg of bigramsA) {
    const idx = bCopy.indexOf(bg)
    if (idx !== -1) {
      matches++
      bCopy.splice(idx, 1)
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length)
}

/**
 * Verifica se um cliente da base foi importado do Conta Azul
 * ou se é um cadastro existente do Conta Azul
 */
export function isClienteContaAzul(cliente: Cliente): boolean {
  const como = normalizarTexto(cliente.como_conheceu)
  const obs = normalizarTexto(cliente.observacoes)
  if (como.includes('conta azul') || obs.includes('conta azul')) {
    return true
  }
  // Se possui dados_importados com colunas típicas do Conta Azul (ex: "Razão Social / Nome", "Data de cadastro")
  if (cliente.dados_importados && typeof cliente.dados_importados === 'object') {
    const keys = Object.keys(cliente.dados_importados).map((k) => normalizarTexto(k))
    if (
      keys.some(
        (k) =>
          k.includes('conta azul') ||
          k.includes('situacao cadastral') ||
          k.includes('data do cadastro'),
      )
    ) {
      return true
    }
  }
  // Se tiver documento preenchido ou status fechado na base de clientes pré-existente
  return false
}

/**
 * Encontra correspondência de um registro importado contra a base de clientes do sistema
 * (priorizando clientes importados do Conta Azul ou qualquer cliente já cadastrado)
 */
export function encontrarCorrespondenciaCliente(
  registro: {
    nome: string
    cpf?: string
    cnpj?: string
    telefone?: string
    whatsapp?: string
    email?: string
  },
  clientesBase: Cliente[],
): CorrespondenciaContaAzul | null {
  const docReg = normalizarDocumento(registro.cpf || registro.cnpj)
  const telReg = registro.telefone || registro.whatsapp || ''
  const emailReg = normalizarEmail(registro.email)
  const nomeReg = normalizarTexto(registro.nome)

  // 1. CPF / CNPJ exato (apenas dígitos)
  if (docReg && docReg.length >= 11) {
    for (const c of clientesBase) {
      const docBase = normalizarDocumento(c.cpf || c.cnpj)
      if (docBase && docBase === docReg) {
        return {
          clienteContaAzul: c,
          criterio: 'cpf_cnpj',
          detalhe: `CPF/CNPJ idêntico (${c.cpf || c.cnpj})`,
        }
      }
    }
  }

  // 2. Email igual case-insensitive
  if (emailReg && emailReg.includes('@')) {
    for (const c of clientesBase) {
      const emailBase = normalizarEmail(c.email)
      if (emailBase && emailBase === emailReg) {
        return {
          clienteContaAzul: c,
          criterio: 'email',
          detalhe: `E-mail idêntico (${c.email})`,
        }
      }
    }
  }

  // 3. Telefone / WhatsApp igual
  if (telReg) {
    for (const c of clientesBase) {
      const telBase = c.telefone || c.whatsapp
      if (telBase && telefonesIguais(telReg, telBase)) {
        return {
          clienteContaAzul: c,
          criterio: 'telefone',
          detalhe: `Telefone correspondente (${c.telefone || c.whatsapp})`,
        }
      }
    }
  }

  // 4. Nome muito parecido (similaridade >= 0.85)
  if (nomeReg && nomeReg.length >= 4) {
    let melhorMatch: { cliente: Cliente; score: number } | null = null

    for (const c of clientesBase) {
      const score = calcularSimilaridadeTexto(nomeReg, c.nome)
      if (score >= 0.85) {
        if (!melhorMatch || score > melhorMatch.score) {
          melhorMatch = { cliente: c, score }
        }
      }
    }

    if (melhorMatch) {
      return {
        clienteContaAzul: melhorMatch.cliente,
        criterio: 'nome_similar',
        detalhe: `Nome ${Math.round(melhorMatch.score * 100)}% similar ("${melhorMatch.cliente.nome}")`,
        similaridadeNome: melhorMatch.score,
      }
    }
  }

  return null
}

/**
 * Mescla informações do registro do Pipedrive com o cadastro existente do Conta Azul:
 * - Campos do Pipedrive preenchem campos vazios do existente ou atualizam o cadastro
 * - Campos extras do Pipedrive são mesclados preservando os anteriores em `dados_importados`
 */
export function mesclarDadosPipedriveNoCadastro(
  existente: Cliente,
  itemPipedrive: ItemRevisaoPipedrive,
): Partial<Cliente> {
  const dadosImportadosMesclados: Record<string, string> = {
    ...(existente.dados_importados || {}),
    ...(itemPipedrive.dados_importados || {}),
    origem_integracao: 'Pipedrive + Conta Azul (Mesclado)',
    data_atualizacao_pipedrive: new Date().toLocaleDateString('pt-BR'),
  }

  // Notas e observações
  const obsExistente = existente.observacoes || ''
  const notaAdicional = `[Atualizado via Pipedrive em ${new Date().toLocaleDateString('pt-BR')}]: ${itemPipedrive.nome} (${itemPipedrive.cidade || 'RS'})`
  const observacoes = obsExistente ? `${obsExistente} • ${notaAdicional}` : notaAdicional

  return {
    // Atualiza status para Fechado (já é cliente Conta Azul)
    status: 'Fechado',
    // Preenche telefone se não tinha ou atualiza se novo
    telefone: itemPipedrive.telefone || existente.telefone,
    whatsapp: itemPipedrive.whatsapp || existente.whatsapp || itemPipedrive.telefone,
    email: itemPipedrive.email || existente.email,
    cidade: itemPipedrive.cidade || existente.cidade,
    estado: itemPipedrive.estado || existente.estado,
    endereco: itemPipedrive.endereco || existente.endereco,
    // Valor estimado se informado
    valor_estimado: itemPipedrive.valor_estimado || existente.valor_estimado,
    observacoes,
    dados_importados: dadosImportadosMesclados,
  }
}

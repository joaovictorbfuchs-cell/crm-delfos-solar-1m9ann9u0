/**
 * Serviço de Importação e Comparação de Contatos do Google para o CRM Delfos Solar.
 *
 * Suporta o formato padrão exportado pelo Google Contatos (CSV), com colunas:
 * - first_name, middle_name, last_name (ou nome todo na first_name)
 * - phone_1_value, phone_2_value, phone_... (telefone com ou sem +55, espaços, formatações)
 * - e_mail_1_value (email)
 * - address_1_city (cidade)
 *
 * Regras de Comparação de Telefone/WhatsApp:
 * - Remove todos os caracteres não numéricos
 * - Telefone idêntico ao cadastrado -> "Correto" (não exibe na lista de divergências)
 * - Telefone semelhante (só diferença de +55, DDD 54 regional padrão, espaços, formatação) -> "Formato diferente" (não exibe)
 * - Telefone divergente ou contato não encontrado no banco -> mostra na lista de divergências com opções:
 *   1. "Atualizar telefone e WhatsApp" (substitui telefone no banco e atualiza o WhatsApp principal)
 *   2. "Manter atual" (ignora / mantém dados atuais)
 *   3. "Adicionar como novo contato" (cria novo cliente com o telefone como WhatsApp principal)
 *
 * Contatos adicionais:
 * - Telefones secundários da linha do CSV (phone_2_value, etc.) podem ser salvos como
 *   contatos adicionais vinculados à ficha do cliente.
 */

import { Cliente } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'

export interface GoogleContactRawRow {
  [key: string]: string
}

export interface GoogleContactParsed {
  idTemp: string
  nomeCompleto: string
  telefonePrincipal: string
  telefonePrincipalLimpo: string
  telefonesSecundarios: string[]
  email: string
  cidade: string
  rawRow: Record<string, string>
}

export type StatusComparacaoGoogle =
  | 'correto' // Idêntico ao banco (ou whatsapp)
  | 'formato_diferente' // Semelhante (diferença de +55, DDD, pontuação)
  | 'divergente_telefone' // Encontrou cliente pelo nome/documento, mas telefone é diferente
  | 'divergente_whatsapp' // Cliente tem whatsapp cadastrado que diverge do telefone do CSV
  | 'nao_encontrado' // Cliente não encontrado no banco

export type AcaoDivergenciaGoogle =
  | 'atualizar' // Substitui telefone e WhatsApp principal
  | 'manter_atual' // Ignora alteração
  | 'adicionar_novo' // Cria novo cliente no CRM

export interface ItemComparacaoGoogle {
  idTemp: string
  nomeCompleto: string
  telefoneCsv: string
  telefoneCsvFormatado: string
  telefoneNormalizadoCompleto?: string // Telefone na forma completa padronizada Delfos (+55 54...)
  telefonesSecundariosCsv: string[]
  emailCsv: string
  cidadeCsv: string

  // Status da análise
  statusComparacao: StatusComparacaoGoogle
  ehDivergencia: boolean
  motivoStatus: string

  // Dados do cliente no banco correspondente (se encontrado)
  clienteBanco?: Cliente
  telefoneBanco?: string
  whatsappBanco?: string

  // Divergência de WhatsApp específico
  whatsappDiverge: boolean

  // Decisão do usuário
  acaoSelecionada: AcaoDivergenciaGoogle
  incluirContatosAdicionais: boolean
  resolvido: boolean
}

/**
 * Extrai apenas dígitos de uma string
 */
export function extrairApenasDigitos(val: string | null | undefined): string {
  if (!val) return ''
  return String(val).replace(/\D/g, '')
}

/**
 * Remove código do país (+55 / 55) do início de um número brasileiro se aplicável.
 * Se tiver 12 ou 13 dígitos e começar com 55:
 *   55 54 991234567 (13 dígitos) -> 54 991234567 (11 dígitos)
 *   55 54 35221234  (12 dígitos) -> 54 35221234  (10 dígitos)
 */
export function removerCodigoPaisBrasil(digitos: string): string {
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    return digitos.slice(2)
  }
  return digitos
}

/**
 * Normaliza um número telefônico aplicando as regras da Delfos Solar:
 * 1. Remove qualquer caractere não numérico.
 * 2. Se tiver DDI 55 (12 ou 13 dígitos), remove o 55 temporariamente para inspecionar DDD + número.
 * 3. Se NÃO tiver código de região/DDD (8 dígitos para fixo ou 9 dígitos para celular), assume 54 (região padrão Delfos Solar / RS).
 * 4. Retorna os dígitos nacionais com DDD (10 dígitos para fixo, ex: 5435221234; ou 11 dígitos para celular, ex: 54991234567).
 */
export function normalizarTelefoneDelfos(phone: string | null | undefined): {
  digitosNacionais: string // 10 ou 11 dígitos (com DDD 54 assumido se ausente)
  digitosCompletos55: string // com 55 na frente: "5554991234567"
  ddd: string // "54" ou DDD original informado
  numeroLocal: string // 8 ou 9 dígitos locais
  formatado: string // "(54) 99123-4567"
} | null {
  const digitos = extrairApenasDigitos(phone)
  if (!digitos || digitos.length < 8) {
    return null
  }

  // 1. Remove DDI 55 se vier com 12 ou 13 dígitos
  let semDdi = digitos
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) {
    semDdi = digitos.slice(2)
  }

  let ddd = '54'
  let numeroLocal = semDdi

  if (semDdi.length === 8 || semDdi.length === 9) {
    // Caso sem DDD: assume 54 padrão regional
    ddd = '54'
    numeroLocal = semDdi
  } else if (semDdi.length === 10 || semDdi.length === 11) {
    // Caso com DDD explícito (ex: 54, 51, 49, 11...)
    ddd = semDdi.slice(0, 2)
    numeroLocal = semDdi.slice(2)
  } else if (semDdi.length > 11) {
    // Número longo atípico: preserva os 2 primeiros como DDD e o restante como local
    ddd = semDdi.slice(0, 2)
    numeroLocal = semDdi.slice(2)
  } else {
    // Menos de 8 dígitos após tratamento
    return null
  }

  const digitosNacionais = `${ddd}${numeroLocal}`
  const digitosCompletos55 = `55${digitosNacionais}`
  const formatado = formatWhatsAppPhone(digitosNacionais)

  return {
    digitosNacionais,
    digitosCompletos55,
    ddd,
    numeroLocal,
    formatado,
  }
}

/**
 * Normaliza um número para o core nacional brasileiro (DDD + número)
 * Trata caso de número sem DDD assumindo DDD 54 padrão da região de atuação de Erechim/RS.
 */
export function normalizarCoreTelefone(phone: string | null | undefined): string {
  const norm = normalizarTelefoneDelfos(phone)
  if (norm) {
    return norm.digitosNacionais
  }
  const digits = extrairApenasDigitos(phone)
  if (!digits) return ''
  return removerCodigoPaisBrasil(digits)
}

/**
 * Compara dois números de telefone retornando:
 * - 'identico': dígitos são exatamente iguais (ou tornam-se iguais após aplicar regra de 55 e DDD 54 padrão)
 * - 'semelhante': representam a mesma linha telefônica (variação apenas de +55, formatação, DDD padrão regional 54 ou nono dígito celular)
 * - 'diferente': números são realmente divergentes
 */
export function compararTelefones(
  telA: string | null | undefined,
  telB: string | null | undefined,
): 'identico' | 'semelhante' | 'diferente' {
  const digitosA = extrairApenasDigitos(telA)
  const digitosB = extrairApenasDigitos(telB)

  if (!digitosA || !digitosB) {
    return 'diferente'
  }

  // 1. Idêntico estrito nos dígitos crus
  if (digitosA === digitosB) {
    return 'identico'
  }

  // Normalização completa aplicando regra de 55 (Brasil) e 54 (região Delfos Solar)
  const normA = normalizarTelefoneDelfos(telA)
  const normB = normalizarTelefoneDelfos(telB)

  if (normA && normB) {
    // Se com DDI 55 e DDD 54 assumidos ambos são idênticos em dígitos
    if (normA.digitosNacionais === normB.digitosNacionais) {
      // Se um dos lados não tinha 55 ou DDD, é um match semelhante/formato diferente
      return 'semelhante'
    }

    // Se ambos são da mesma região/DDD (inclusive com 54 assumido)
    if (normA.ddd === normB.ddd) {
      // Compara número local (caso celular de 8 vs 9 dígitos com nono dígito)
      const locA = normA.numeroLocal
      const locB = normB.numeroLocal

      if (locA === locB) {
        return 'semelhante'
      }

      // Variação de nono dígito celular (ex: 991234567 vs 91234567 onde últimos 8 batem)
      if (locA.length >= 8 && locB.length >= 8 && locA.slice(-8) === locB.slice(-8)) {
        return 'semelhante'
      }
    }

    // Se DDDs são diferentes, são números de regiões distintas
    return 'diferente'
  }

  // Fallback caso normalização completa não se aplique (ex. número com menos de 8 dígitos)
  const coreA = removerCodigoPaisBrasil(digitosA)
  const coreB = removerCodigoPaisBrasil(digitosB)

  if (coreA === coreB) {
    return 'semelhante'
  }

  const semDddA = coreA.length >= 10 ? coreA.slice(2) : coreA
  const semDddB = coreB.length >= 10 ? coreB.slice(2) : coreB

  if (semDddA === semDddB) {
    return 'semelhante'
  }

  if (semDddA.length >= 8 && semDddB.length >= 8) {
    const final8A = semDddA.slice(-8)
    const final8B = semDddB.slice(-8)
    if (final8A === final8B) {
      const dddA = coreA.length >= 10 ? coreA.slice(0, 2) : '54'
      const dddB = coreB.length >= 10 ? coreB.slice(0, 2) : '54'
      if (dddA === dddB) {
        return 'semelhante'
      }
    }
  }

  return 'diferente'
}

/**
 * Monta o nome completo a partir das colunas do Google Contacts
 */
export function extrairNomeCompletoGoogle(row: Record<string, string>): string {
  // Procura case-insensitive por chaves de first, middle, last name
  const findValue = (regex: RegExp): string => {
    for (const key of Object.keys(row)) {
      if (regex.test(key)) {
        const val = (row[key] || '').trim()
        if (val) return val
      }
    }
    return ''
  }

  const firstName =
    findValue(/^(first_name|first name|given name|nome|primeiro nome)$/i) ||
    findValue(/first.*name/i) ||
    findValue(/^name$/i)
  const middleName =
    findValue(/^(middle_name|middle name|additional name|nome do meio)$/i) ||
    findValue(/middle.*name/i)
  const lastName =
    findValue(/^(last_name|last name|family name|sobrenome)$/i) || findValue(/last.*name/i)

  const partes = [firstName, middleName, lastName].filter(Boolean)
  if (partes.length > 0) {
    return partes.join(' ')
  }

  // Fallback: primeira coluna não vazia que pareça nome
  for (const key of Object.keys(row)) {
    if (/(name|nome|contato)/i.test(key)) {
      const val = (row[key] || '').trim()
      if (val) return val
    }
  }

  return 'Contato sem nome'
}

/**
 * Encontra todos os telefones de uma linha do Google Contatos
 */
export function extrairTelefonesGoogle(row: Record<string, string>): {
  principal: string
  secundarios: string[]
} {
  const telefonesEncontrados: string[] = []

  // 1. Procurar colunas phone_1_value, phone_2_value, etc.
  const phoneKeys = Object.keys(row)
    .filter((k) => /(phone.*value|telefone|celular|phone|tel)/i.test(k))
    .sort((a, b) => {
      // Priorizar phone_1_value, phone 1, etc.
      const numA = (a.match(/\d+/) || ['99'])[0]
      const numB = (b.match(/\d+/) || ['99'])[0]
      return parseInt(numA, 10) - parseInt(numB, 10)
    })

  for (const key of phoneKeys) {
    const val = (row[key] || '').trim()
    if (val && extrairApenasDigitos(val).length >= 8) {
      if (!telefonesEncontrados.includes(val)) {
        telefonesEncontrados.push(val)
      }
    }
  }

  const principal = telefonesEncontrados[0] || ''
  const secundarios = telefonesEncontrados.slice(1)

  return { principal, secundarios }
}

/**
 * Extrai email da linha do Google Contatos
 */
export function extrairEmailGoogle(row: Record<string, string>): string {
  for (const key of Object.keys(row)) {
    if (/(e_?mail.*value|e_?mail|email)/i.test(key)) {
      const val = (row[key] || '').trim()
      if (val && val.includes('@')) return val.toLowerCase()
    }
  }
  return ''
}

/**
 * Extrai cidade da linha do Google Contatos
 */
export function extrairCidadeGoogle(row: Record<string, string>): string {
  for (const key of Object.keys(row)) {
    if (/(address.*city|cidade|city|municipio)/i.test(key)) {
      const val = (row[key] || '').trim()
      if (val) return val
    }
  }
  return 'Erechim'
}

/**
 * Parseia cada linha crua para o modelo estruturado
 */
export function parseGoogleContactRow(
  row: Record<string, string>,
  index: number,
): GoogleContactParsed {
  const nomeCompleto = extrairNomeCompletoGoogle(row)
  const { principal, secundarios } = extrairTelefonesGoogle(row)
  const email = extrairEmailGoogle(row)
  const cidade = extrairCidadeGoogle(row)

  return {
    idTemp: `gc_${index}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    nomeCompleto,
    telefonePrincipal: principal,
    telefonePrincipalLimpo: extrairApenasDigitos(principal),
    telefonesSecundarios: secundarios,
    email,
    cidade,
    rawRow: row,
  }
}

/**
 * Realiza a comparação do contato importado do Google com a base de clientes do CRM.
 * Busca cliente existente por:
 * 1. Telefone principal / WhatsApp idêntico ou semelhante
 * 2. Nome completo exato ou muito aproximado
 * 3. Email
 */
export function analisarContatoGoogle(
  contato: GoogleContactParsed,
  clientesExistentes: Cliente[],
): ItemComparacaoGoogle {
  const telCsvLimpo = contato.telefonePrincipalLimpo
  // Aplica a normalização completa da Delfos Solar (assume 55 e DDD 54 regional)
  const normPrincipal = normalizarTelefoneDelfos(contato.telefonePrincipal)
  const telFormatado =
    normPrincipal?.formatado ||
    (contato.telefonePrincipal ? formatWhatsAppPhone(contato.telefonePrincipal) : '-')
  const telefoneCompletoParaGravacao = normPrincipal
    ? normPrincipal.formatado
    : contato.telefonePrincipal
      ? formatWhatsAppPhone(contato.telefonePrincipal)
      : ''

  // 1. Busca por telefone no banco (coluna telefone ou whatsapp)
  let clientePorTelefone: Cliente | undefined
  let matchTipoTelefone: 'identico' | 'semelhante' | null = null

  if (telCsvLimpo) {
    for (const c of clientesExistentes) {
      const compTel = compararTelefones(contato.telefonePrincipal, c.telefone)
      const compWhats = compararTelefones(contato.telefonePrincipal, c.whatsapp)

      if (compTel === 'identico' || compWhats === 'identico') {
        clientePorTelefone = c
        matchTipoTelefone = 'identico'
        break
      }

      if (compTel === 'semelhante' || compWhats === 'semelhante') {
        if (!clientePorTelefone) {
          clientePorTelefone = c
          matchTipoTelefone = 'semelhante'
        }
      }
    }
  }

  // 2. Se encontrou por telefone com match idêntico
  if (clientePorTelefone && matchTipoTelefone === 'identico') {
    return {
      idTemp: contato.idTemp,
      nomeCompleto: contato.nomeCompleto,
      telefoneCsv: contato.telefonePrincipal,
      telefoneCsvFormatado: telFormatado,
      telefoneNormalizadoCompleto: telefoneCompletoParaGravacao,
      telefonesSecundariosCsv: contato.telefonesSecundarios,
      emailCsv: contato.email,
      cidadeCsv: contato.cidade,
      statusComparacao: 'correto',
      ehDivergencia: false,
      motivoStatus: 'Telefone e WhatsApp já cadastrados idênticos no CRM',
      clienteBanco: clientePorTelefone,
      telefoneBanco: clientePorTelefone.telefone,
      whatsappBanco: clientePorTelefone.whatsapp,
      whatsappDiverge: false,
      acaoSelecionada: 'manter_atual',
      incluirContatosAdicionais: false,
      resolvido: true,
    }
  }

  // 3. Se encontrou por telefone com formato diferente (+55, pontuação, DDD 54 regional)
  if (clientePorTelefone && matchTipoTelefone === 'semelhante') {
    return {
      idTemp: contato.idTemp,
      nomeCompleto: contato.nomeCompleto,
      telefoneCsv: contato.telefonePrincipal,
      telefoneCsvFormatado: telFormatado,
      telefoneNormalizadoCompleto: telefoneCompletoParaGravacao,
      telefonesSecundariosCsv: contato.telefonesSecundarios,
      emailCsv: contato.email,
      cidadeCsv: contato.cidade,
      statusComparacao: 'formato_diferente',
      ehDivergencia: false,
      motivoStatus: 'Mesmo número com formato diferente (com/sem +55, espaços ou DDD 54 regional)',
      clienteBanco: clientePorTelefone,
      telefoneBanco: clientePorTelefone.telefone,
      whatsappBanco: clientePorTelefone.whatsapp,
      whatsappDiverge: false,
      acaoSelecionada: 'manter_atual',
      incluirContatosAdicionais: false,
      resolvido: true,
    }
  }

  // 4. Se não achou pelo telefone, buscar se o CLIENTE já existe no banco por Nome ou Email
  const nomeClean = contato.nomeCompleto.trim().toLowerCase()
  const emailClean = contato.email.trim().toLowerCase()

  let clientePorNomeOuEmail: Cliente | undefined

  if (nomeClean && nomeClean !== 'contato sem nome') {
    clientePorNomeOuEmail = clientesExistentes.find((c) => {
      const cNome = (c.nome || '').trim().toLowerCase()
      if (cNome === nomeClean) return true
      // Correspondência forte de nome
      if (
        cNome.length > 5 &&
        nomeClean.length > 5 &&
        (cNome.startsWith(nomeClean) || nomeClean.startsWith(cNome))
      ) {
        return true
      }
      return false
    })
  }

  if (!clientePorNomeOuEmail && emailClean) {
    clientePorNomeOuEmail = clientesExistentes.find(
      (c) => (c.email || '').trim().toLowerCase() === emailClean,
    )
  }

  // 5. Caso o cliente exista no CRM pelo nome/email, mas o telefone seja diferente
  if (clientePorNomeOuEmail) {
    const whatsAtual = clientePorNomeOuEmail.whatsapp || ''
    const compWhats = compararTelefones(contato.telefonePrincipal, whatsAtual)
    const whatsDiverge = whatsAtual.trim().length > 0 && compWhats === 'diferente'

    return {
      idTemp: contato.idTemp,
      nomeCompleto: contato.nomeCompleto,
      telefoneCsv: contato.telefonePrincipal,
      telefoneCsvFormatado: telFormatado,
      telefoneNormalizadoCompleto: telefoneCompletoParaGravacao,
      telefonesSecundariosCsv: contato.telefonesSecundarios,
      emailCsv: contato.email,
      cidadeCsv: contato.cidade,
      statusComparacao: whatsDiverge ? 'divergente_whatsapp' : 'divergente_telefone',
      ehDivergencia: true,
      motivoStatus: whatsDiverge
        ? 'Cliente cadastrado com WhatsApp divergente do telefone do CSV'
        : 'Cliente cadastrado com telefone diferente no banco',
      clienteBanco: clientePorNomeOuEmail,
      telefoneBanco: clientePorNomeOuEmail.telefone,
      whatsappBanco: clientePorNomeOuEmail.whatsapp,
      whatsappDiverge: whatsDiverge,
      acaoSelecionada: 'atualizar', // Padrão recomendado: atualizar para o número do CSV
      incluirContatosAdicionais: contato.telefonesSecundarios.length > 0,
      resolvido: false,
    }
  }

  // 6. Não encontrado no banco: novo contato
  return {
    idTemp: contato.idTemp,
    nomeCompleto: contato.nomeCompleto,
    telefoneCsv: contato.telefonePrincipal,
    telefoneCsvFormatado: telFormatado,
    telefoneNormalizadoCompleto: telefoneCompletoParaGravacao,
    telefonesSecundariosCsv: contato.telefonesSecundarios,
    emailCsv: contato.email,
    cidadeCsv: contato.cidade,
    statusComparacao: 'nao_encontrado',
    ehDivergencia: true,
    motivoStatus: 'Contato não cadastrado no CRM',
    clienteBanco: undefined,
    telefoneBanco: undefined,
    whatsappBanco: undefined,
    whatsappDiverge: false,
    acaoSelecionada: 'adicionar_novo',
    incluirContatosAdicionais: contato.telefonesSecundarios.length > 0,
    resolvido: false,
  }
}

/**
 * CSV de exemplo do Google Contatos para demonstração
 */
export const CSV_EXEMPLO_GOOGLE_CONTATOS = `first_name,middle_name,last_name,phone_1_value,phone_2_value,e_mail_1_value,address_1_city
João,,da Silva,99123-4567,,joao.silva@exemplo.com.br,Erechim
Residência,,Família Andrade,54991823400,,andrade.solar@exemplo.com,Erechim
Marcos,Aurélio,Ferreira,99876-5432,3522-1100,marcos.ferreira@agronegocio.com.br,Passo Fundo
Juliana,,Menezes Ramos,+55 54 99111-2233,(54) 98400-9988,juliana.ramos@comercial.com,Marau
Roberto,,Albuquerque Silveira,99222-8899,,roberto.silveira@agro.com.br,Sertão
Carlos,Eduardo,Santos,+55 51 98888-7766,,carlos.santos@eng.com.br,Porto Alegre
Luciana,,Borges Fontana,999554433,3522-0022,luciana.fontana@clinica.com.br,Erechim
`

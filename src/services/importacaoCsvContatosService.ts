/**
 * Serviço de Importação de Contatos por CSV para o CRM Delfos Solar
 *
 * Regras de Negócio solicitadas pelo usuário:
 * 1. Para cada registro da planilha, busque o cliente cadastrado pelo nome,
 *    ignorando diferenças de maiúsculas, acentos e símbolos.
 * 2. Se encontrar o cliente:
 *    - Compare o número vindo da planilha com os números cadastrados (WhatsApp e Telefone).
 *    - Se o número de telefone ou WhatsApp for igual ao que já está cadastrado (normalizado):
 *      mantenha o cadastro como está, sem perguntar (status: 'identico', ação automática: 'manter').
 *    - Se o número for diferente do cadastrado:
 *      mostre um comparativo com o número atual do cadastro e o número vindo do CSV,
 *      perguntando ao usuário qual deve ficar, com as opções de manter o número atual ou
 *      atualizar com o número do CSV.
 *      Quando atualizar: "grave o número de telefone da planilha como o número de WhatsApp
 *      do contato daquele cliente, sem alterar o campo Telefone."
 * 3. Se o contato NÃO existir no cadastro:
 *    - Oferecer opções: "Criar novo cliente" ou "Mesclar com cliente existente"
 *      (permitindo ao usuário selecionar o cliente existente com quem mesclar).
 * 4. Mantenha os campos Telefone e WhatsApp independentes (sem cópia automática entre eles).
 */

import { Cliente } from '@/types/crm'
import { formatWhatsAppPhone, cleanPhoneDigits } from '@/lib/formatters'
import { normalizarChave } from '@/services/importacaoClientesService'

export interface ContatoCsvRow {
  [key: string]: string
}

export interface ContatoCsvParsed {
  idTemp: string
  nome: string
  telefone: string
  whatsapp?: string
  email?: string
  cidade?: string
  rawRow: Record<string, string>
}

export type StatusComparacaoCsv =
  | 'identico' // Encontrou pelo nome e número é igual ao já cadastrado (Telefone ou WhatsApp)
  | 'diferente' // Encontrou pelo nome mas o número do CSV é diferente do WhatsApp/Telefone
  | 'nao_encontrado' // Cliente não encontrado pelo nome no CRM

export type DecisaoContatoCsv =
  | 'manter_atual' // Mantém o cadastro como está
  | 'atualizar_whatsapp' // Atualiza o WhatsApp com o número do CSV (sem alterar Telefone)
  | 'criar_novo' // Cria novo cliente no CRM com o número do CSV como WhatsApp
  | 'mesclar_existente' // Mescla com um cliente existente selecionado (atualiza o WhatsApp desse cliente)
  | 'ignorar' // Ignora o contato

export interface ItemImportacaoContatoCsv {
  idTemp: string
  nomeCsv: string
  telefoneCsv: string
  telefoneCsvFormatado: string
  emailCsv?: string
  cidadeCsv?: string

  // Comparação com cliente encontrado pelo nome
  status: StatusComparacaoCsv
  clienteEncontrado?: Cliente
  whatsappAtual?: string
  telefoneAtual?: string

  // Decisão do usuário
  decisao: DecisaoContatoCsv
  clienteSelecionadoParaMescla?: Cliente

  // Estado de resolução
  resolvido: boolean
}

/**
 * Normaliza string de nome ignorando maiúsculas/minúsculas, acentos e caracteres especiais/símbolos.
 */
export function normalizarNomeComparacao(nome: string | null | undefined): string {
  if (!nome) return ''
  return normalizarChave(nome)
}

/**
 * Normaliza telefone para comparação:
 * - Apenas dígitos
 * - Remove prefixo 55 se houver mais de 11 dígitos
 * - Trata números com e sem DDD regional 54
 */
export function normalizarDigitosComparacao(tel: string | null | undefined): string {
  if (!tel) return ''
  let digits = cleanPhoneDigits(tel)
  if (!digits || digits.length < 8) return ''

  // Remove DDI 55 do Brasil se tiver 12 ou 13 dígitos
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2)
  }

  // Se tiver 8 ou 9 dígitos sem DDD, assume 54 regional padrão
  if (digits.length === 8 || digits.length === 9) {
    digits = `54${digits}`
  }

  return digits
}

/**
 * Compara dois números de telefone ignorando máscara, espaços, +55, DDI e símbolos.
 */
export function verificarTelefonesIguais(
  telA: string | null | undefined,
  telB: string | null | undefined,
): boolean {
  const normA = normalizarDigitosComparacao(telA)
  const normB = normalizarDigitosComparacao(telB)

  if (!normA || !normB) return false
  if (normA === normB) return true

  // Comparação de últimos 8 dígitos (celular sem 9 ou variação de nono dígito)
  if (normA.length >= 10 && normB.length >= 10) {
    const dddA = normA.slice(0, 2)
    const dddB = normB.slice(0, 2)
    if (dddA === dddB && normA.slice(-8) === normB.slice(-8)) {
      return true
    }
  }

  return false
}

/**
 * Detecta cabeçalhos flexíveis para Nome, Telefone/WhatsApp, Email e Cidade.
 * Suporta colunas com ou sem acentos, maiúsculas/minúsculas, ou fallback para primeira coluna como nome.
 */
export function extrairCamposDaLinhaCsv(
  row: Record<string, string>,
  headers: string[],
): {
  nome: string
  telefone: string
  email: string
  cidade: string
} {
  const chaves = Object.keys(row)

  const findValor = (regexes: RegExp[]): string => {
    for (const r of regexes) {
      const matchKey = chaves.find((k) => r.test(normalizarNomeComparacao(k)))
      if (matchKey && row[matchKey]) {
        const val = row[matchKey].trim()
        if (val) return val
      }
    }
    return ''
  }

  // 1. Nome
  let nome = findValor([
    /^(nome|name|cliente|contato|razao social|razaosocial|pessoa)$/i,
    /^(nome.*cliente|cliente.*nome|first.*name|full.*name)$/i,
    /(nome|name|contato)/i,
  ])

  // Se não achou cabeçalho de nome, usa o primeiro campo não numérico como nome
  if (!nome && headers.length > 0) {
    for (const h of headers) {
      const val = (row[h] || '').trim()
      // Se não for puramente numérico e tiver letras
      if (val && /[a-zA-ZÀ-ÿ]/.test(val) && !val.includes('@')) {
        nome = val
        break
      }
    }
    if (!nome) {
      nome = (row[headers[0]] || '').trim()
    }
  }

  // 2. Telefone / WhatsApp
  let telefone = findValor([
    /^(whatsapp|wpp|whats|celular|telefone|phone|mobile|tel|fone)$/i,
    /(whatsapp|wpp|whats|celular|telefone|phone|mobile|tel|fone)/i,
  ])

  // Se não achou por cabeçalho, procura a primeira coluna que tenha pelo menos 8 dígitos
  if (!telefone) {
    for (const k of chaves) {
      const val = (row[k] || '').trim()
      const digits = cleanPhoneDigits(val)
      if (digits.length >= 8 && digits.length <= 15) {
        telefone = val
        break
      }
    }
  }

  // 3. E-mail
  let email = findValor([/^(email|e mail|correio eletronico)$/i, /(email|e mail)/i])
  if (!email) {
    for (const k of chaves) {
      const val = (row[k] || '').trim()
      if (val.includes('@') && val.includes('.')) {
        email = val.toLowerCase()
        break
      }
    }
  }

  // 4. Cidade
  const cidade = findValor([/^(cidade|city|municipio|localidade)$/i, /(cidade|municipio)/i]) || ''

  return {
    nome: nome || 'Contato sem nome',
    telefone: telefone || '',
    email,
    cidade,
  }
}

/**
 * Busca cliente na base pelo nome, ignorando diferenças de maiúsculas, acentos e símbolos.
 */
export function buscarClientePorNome(
  nomeProcurado: string,
  clientes: Cliente[],
): Cliente | undefined {
  const normProcurado = normalizarNomeComparacao(nomeProcurado)
  if (!normProcurado || normProcurado.length < 2) return undefined

  // 1. Busca exata após normalização
  const matchExato = clientes.find((c) => normalizarNomeComparacao(c.nome) === normProcurado)
  if (matchExato) return matchExato

  // 2. Se não achou exato, tenta correspondência de início/contém se o nome for longo (> 5 chars)
  if (normProcurado.length >= 5) {
    const matchPrefixo = clientes.find((c) => {
      const cNorm = normalizarNomeComparacao(c.nome)
      return (
        cNorm.length >= 5 && (cNorm.startsWith(normProcurado) || normProcurado.startsWith(cNorm))
      )
    })
    if (matchPrefixo) return matchPrefixo
  }

  return undefined
}

/**
 * Analisa uma linha do CSV contra a base de clientes do CRM Delfos Solar
 * aplicando estritamente as regras de negócio definidas pelo usuário.
 */
export function analisarLinhaContatoCsv(
  row: Record<string, string>,
  headers: string[],
  clientes: Cliente[],
  index: number,
): ItemImportacaoContatoCsv {
  const { nome, telefone, email, cidade } = extrairCamposDaLinhaCsv(row, headers)
  const telFormatado = formatWhatsAppPhone(telefone) || telefone

  // Regra 3: Buscar cliente cadastrado pelo nome, ignorando diferenças de maiúsculas, acentos e símbolos
  const clienteEncontrado = buscarClientePorNome(nome, clientes)

  if (clienteEncontrado) {
    // Cliente encontrado no cadastro!
    const whatsappAtual = clienteEncontrado.whatsapp || ''
    const telefoneAtual = clienteEncontrado.telefone || ''

    // Regra: Se o número de telefone ou WhatsApp for igual ao que já está cadastrado, mantenha o cadastro como está, sem perguntar.
    const numeroCsvBateComWhatsApp = verificarTelefonesIguais(telefone, whatsappAtual)
    const numeroCsvBateComTelefone = verificarTelefonesIguais(telefone, telefoneAtual)

    if (numeroCsvBateComWhatsApp || numeroCsvBateComTelefone) {
      return {
        idTemp: `csv_contato_${index}_${Date.now()}`,
        nomeCsv: nome,
        telefoneCsv: telefone,
        telefoneCsvFormatado: telFormatado,
        emailCsv: email,
        cidadeCsv: cidade,
        status: 'identico',
        clienteEncontrado,
        whatsappAtual,
        telefoneAtual,
        decisao: 'manter_atual',
        resolvido: true, // Já resolvido automaticamente sem perguntar!
      }
    }

    // Regra: Se o número for diferente do cadastrado, mostre um comparativo com o número atual do cadastro e o número vindo do CSV,
    // perguntando ao usuário qual deve ficar, com as opções de manter o número atual ou atualizar com o número do CSV.
    return {
      idTemp: `csv_contato_${index}_${Date.now()}`,
      nomeCsv: nome,
      telefoneCsv: telefone,
      telefoneCsvFormatado: telFormatado,
      emailCsv: email,
      cidadeCsv: cidade,
      status: 'diferente',
      clienteEncontrado,
      whatsappAtual,
      telefoneAtual,
      decisao: 'atualizar_whatsapp', // Opção padrão sugerida
      resolvido: false, // Fica na fila para o usuário decidir
    }
  }

  // Regra: Se o contato não existir no cadastro, coloque um botão ao lado se é para criar ou mesclar com um existente
  return {
    idTemp: `csv_contato_${index}_${Date.now()}`,
    nomeCsv: nome,
    telefoneCsv: telefone,
    telefoneCsvFormatado: telFormatado,
    emailCsv: email,
    cidadeCsv: cidade,
    status: 'nao_encontrado',
    clienteEncontrado: undefined,
    whatsappAtual: undefined,
    telefoneAtual: undefined,
    decisao: 'criar_novo', // Padrão sugerido
    resolvido: false, // Fica na fila para o usuário decidir
  }
}

/**
 * CSV de exemplo com contatos para testes rápidos
 */
export const CSV_EXEMPLO_CONTATOS = `Nome,Telefone,Email,Cidade
João Victor Bagetti Fuchs,(54) 98110-8228,joao@delfosengenharia.com.br,Erechim
Ademar Fiorini,(54) 99123-4567,fiorini@exemplo.com.br,Erechim
Carlos Alberto Silveira,(54) 98400-1122,carlos.silveira@agro.com.br,Passo Fundo
Dra. Mariana Zandoná,(54) 99654-3322,mariana.zandona@med.com.br,Marau
Padaria e Confeitaria Central,(54) 3522-9988,contato@padariacentral.com.br,Erechim
`

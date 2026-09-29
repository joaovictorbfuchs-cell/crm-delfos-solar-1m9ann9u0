import { cleanPhoneDigits, formatWhatsAppPhone } from '@/lib/formatters'
import type { Cliente, ContatoAdicional } from '@/types/crm'
import pb from '@/lib/pocketbase/client'

export type OrigemNumeroDestino =
  | 'cliente_whatsapp'
  | 'contato_adicional_whatsapp'
  | 'cliente_telefone'
  | 'nenhum'

export interface ResolucaoNumeroDestinoCliente {
  numero: string | null
  origem: OrigemNumeroDestino
  contatoAdicionalNome?: string
  numeroFormatado?: string
  numeroLimpo?: string
  detalheOrigem?: string
}

export const MENSAGEM_ALERTA_SEM_NUMERO =
  'Envio não realizado: o cliente não possui WhatsApp, contato adicional com WhatsApp ou telefone cadastrado. Atualize o cadastro antes de enviar.'

/**
 * Valida se a string possui ao menos 10 dígitos após limpeza.
 */
export function validarDigitosTelefone(tel?: string | null): boolean {
  if (!tel) return false
  const digitos = cleanPhoneDigits(tel)
  return digitos.length >= 10
}

/**
 * Normaliza número para envio (mantendo apenas dígitos, removendo DDI 55 redundante se necessário).
 */
export function normalizarDigitosDestino(tel: string): string {
  const digits = cleanPhoneDigits(tel)
  return digits
}

export interface ResolverNumeroDestinoOptions {
  contatosAdicionais?: ContatoAdicional[] | null
  buscarNoBancoSeNecessario?: boolean
}

/**
 * Versão SÍNCRONA da resolução de número de destino.
 * Aplica a ordem estrita:
 * 1. WhatsApp cadastrado no cliente (>= 10 dígitos)
 * 2. WhatsApp de um contato adicional vinculado com is_whatsapp = true (>= 10 dígitos)
 * 3. Telefone do cliente (>= 10 dígitos)
 * 4. Se nada existir: origem 'nenhum' e numero null
 */
export function resolverNumeroDestinoClienteSync(
  cliente?: Partial<Cliente> | null,
  contatosAdicionais?: ContatoAdicional[] | null,
): ResolucaoNumeroDestinoCliente {
  if (!cliente) {
    return { numero: null, origem: 'nenhum' }
  }

  // 1. WhatsApp do cliente
  if (validarDigitosTelefone(cliente.whatsapp)) {
    const limpo = normalizarDigitosDestino(cliente.whatsapp!)
    return {
      numero: limpo,
      origem: 'cliente_whatsapp',
      numeroLimpo: limpo,
      numeroFormatado: formatWhatsAppPhone(limpo),
      detalheOrigem: 'WhatsApp do cliente',
    }
  }

  // 2. WhatsApp de contato adicional com is_whatsapp marcado
  if (Array.isArray(contatosAdicionais) && contatosAdicionais.length > 0) {
    const contatoValido = contatosAdicionais.find(
      (c) => Boolean(c?.is_whatsapp) && validarDigitosTelefone(c?.telefone),
    )
    if (contatoValido && contatoValido.telefone) {
      const limpo = normalizarDigitosDestino(contatoValido.telefone)
      return {
        numero: limpo,
        origem: 'contato_adicional_whatsapp',
        contatoAdicionalNome: contatoValido.nome || 'Contato Adicional',
        numeroLimpo: limpo,
        numeroFormatado: formatWhatsAppPhone(limpo),
        detalheOrigem: `Contato adicional: ${contatoValido.nome || 'Contato Adicional'} (WhatsApp)`,
      }
    }
  }

  // 3. Telefone do cliente
  if (validarDigitosTelefone(cliente.telefone)) {
    const limpo = normalizarDigitosDestino(cliente.telefone!)
    return {
      numero: limpo,
      origem: 'cliente_telefone',
      numeroLimpo: limpo,
      numeroFormatado: formatWhatsAppPhone(limpo),
      detalheOrigem: 'Telefone comercial/fixo do cliente',
    }
  }

  // 4. Se nada existir
  return {
    numero: null,
    origem: 'nenhum',
  }
}

/**
 * Versão ASSÍNCRONA da resolução de número de destino.
 * Caso o cliente não possua WhatsApp próprio e os contatos adicionais não tenham sido
 * passados em memória, busca na coleção `contatos_adicionais` do PocketBase se `buscarNoBancoSeNecessario` for true (padrão).
 */
export async function resolverNumeroDestinoCliente(
  cliente?: Partial<Cliente> | null,
  options?: ResolverNumeroDestinoOptions,
): Promise<ResolucaoNumeroDestinoCliente> {
  if (!cliente) {
    return { numero: null, origem: 'nenhum' }
  }

  // 1. WhatsApp cadastrado no cliente
  if (validarDigitosTelefone(cliente.whatsapp)) {
    const limpo = normalizarDigitosDestino(cliente.whatsapp!)
    return {
      numero: limpo,
      origem: 'cliente_whatsapp',
      numeroLimpo: limpo,
      numeroFormatado: formatWhatsAppPhone(limpo),
      detalheOrigem: 'WhatsApp do cliente',
    }
  }

  // 2. Se temos contatos em memória ou podemos buscar no banco
  let contatos: ContatoAdicional[] = options?.contatosAdicionais || []

  if (contatos.length === 0 && options?.buscarNoBancoSeNecessario !== false && cliente.id) {
    try {
      contatos = await pb.collection('contatos_adicionais').getFullList<ContatoAdicional>({
        filter: `cliente = '${cliente.id}'`,
        sort: 'created',
        requestKey: null,
      })
    } catch (err) {
      console.warn('Erro ao consultar contatos_adicionais para resolução de número:', err)
      contatos = []
    }
  }

  // 2. Avalia contato adicional com is_whatsapp = true
  const contatoValido = contatos.find(
    (c) => Boolean(c?.is_whatsapp) && validarDigitosTelefone(c?.telefone),
  )
  if (contatoValido && contatoValido.telefone) {
    const limpo = normalizarDigitosDestino(contatoValido.telefone)
    return {
      numero: limpo,
      origem: 'contato_adicional_whatsapp',
      contatoAdicionalNome: contatoValido.nome || 'Contato Adicional',
      numeroLimpo: limpo,
      numeroFormatado: formatWhatsAppPhone(limpo),
      detalheOrigem: `Contato adicional: ${contatoValido.nome || 'Contato Adicional'} (WhatsApp)`,
    }
  }

  // 3. Telefone do cliente
  if (validarDigitosTelefone(cliente.telefone)) {
    const limpo = normalizarDigitosDestino(cliente.telefone!)
    return {
      numero: limpo,
      origem: 'cliente_telefone',
      numeroLimpo: limpo,
      numeroFormatado: formatWhatsAppPhone(limpo),
      detalheOrigem: 'Telefone comercial/fixo do cliente',
    }
  }

  // 4. Nenhum
  return {
    numero: null,
    origem: 'nenhum',
  }
}

export default resolverNumeroDestinoCliente

import { formatCurrency } from '@/lib/formatters'
import type { Cliente, UsinaCliente, Sistema } from '@/types/crm'

/**
 * Definição dos placeholders disponíveis para envio em massa
 */
export interface PlaceholderInfo {
  tag: string
  label: string
  descricao: string
  exemplo: string
}

export const PLACEHOLDERS_ENVIO_MASSA: PlaceholderInfo[] = [
  {
    tag: '[nome do cliente]',
    label: 'Nome do Cliente',
    descricao: 'Primeiro nome ou nome de contato do cliente',
    exemplo: 'João',
  },
  {
    tag: '[nome da empresa]',
    label: 'Nome da Empresa',
    descricao: 'Razão social, nome fantasia do cliente ou Delfos Solar',
    exemplo: 'Delfos Solar',
  },
  {
    tag: '[cidade]',
    label: 'Cidade',
    descricao: 'Cidade do cliente ou da usina',
    exemplo: 'Erechim',
  },
  {
    tag: '[data atual]',
    label: 'Data Atual',
    descricao: 'Data de hoje por extenso ou formatada (ex: 28/09/2026)',
    exemplo: '28/09/2026',
  },
  {
    tag: '[potência]',
    label: 'Potência da Usina',
    descricao: 'Potência da usina em kWp (ex: 7,1 kWp)',
    exemplo: '7,1 kWp',
  },
  {
    tag: '[valor]',
    label: 'Valor',
    descricao: 'Valor estimado/final do negócio, da atividade ou do serviço em R$',
    exemplo: 'R$ 350,00',
  },
]

export interface ContextoPlaceholderCliente {
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  usinasDoCliente?: UsinaCliente[]
  valor?: number
  potenciaManual?: number | string
  cidadeManual?: string
}

/**
 * Extrai o primeiro nome amigável de um cliente ou razão social
 */
export function extrairPrimeiroNomeCliente(cliente?: Partial<Cliente> | null): string {
  if (!cliente) return 'Cliente'
  const nomeCompleto = (
    cliente.contato_principal ||
    cliente.contato ||
    cliente.nome ||
    cliente.razao_social ||
    'Cliente'
  ).trim()
  return nomeCompleto.split(' ')[0] || nomeCompleto
}

/**
 * Extrai a cidade mais relevante de um cliente ou usina vinculada
 */
export function extrairCidadeCliente(
  cliente?: Partial<Cliente> | null,
  usina?: Partial<UsinaCliente | Sistema> | null,
): string {
  if (cliente?.cidade && cliente.cidade.trim()) {
    return cliente.cidade.trim()
  }
  if (usina) {
    const end = (usina as any).endereco || (usina as any).cidade
    if (end && typeof end === 'string' && end.trim()) {
      return end.trim()
    }
  }
  return 'Erechim'
}

/**
 * Extrai a potência fotovoltaica formatada (ex: "7,1 kWp")
 */
export function extrairPotenciaClienteTexto(
  cliente?: Partial<Cliente> | null,
  usina?: Partial<UsinaCliente | Sistema> | null,
  usinasDoCliente?: UsinaCliente[],
): string {
  let pot = 0

  if (usina) {
    const uPot =
      (usina as UsinaCliente).potencia_kwp ||
      (usina as Sistema).potencia_total_kwp ||
      (usina as Sistema).potencia_pico_modulos_kwp ||
      0
    if (uPot > 0) pot = uPot
  }

  if (pot <= 0 && Array.isArray(usinasDoCliente) && usinasDoCliente.length > 0) {
    const achada = usinasDoCliente.find(
      (u) => typeof u.potencia_kwp === 'number' && u.potencia_kwp > 0,
    )
    if (achada?.potencia_kwp) pot = achada.potencia_kwp
  }

  if (pot <= 0 && cliente?.potencia_kwp && cliente.potencia_kwp > 0) {
    pot = cliente.potencia_kwp
  }

  if (pot > 0) {
    return `${pot.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`
  }

  return 'energia solar'
}

/**
 * Extrai o valor formatado para o placeholder [valor]
 */
export function extrairValorClienteTexto(
  valor?: number | null,
  cliente?: Partial<Cliente> | null,
): string {
  if (typeof valor === 'number' && !isNaN(valor) && valor > 0) {
    return formatCurrency(valor)
  }
  if (
    typeof cliente?.valor_final === 'number' &&
    !isNaN(cliente.valor_final) &&
    cliente.valor_final > 0
  ) {
    return formatCurrency(cliente.valor_final)
  }
  if (
    typeof cliente?.valor_estimado === 'number' &&
    !isNaN(cliente.valor_estimado) &&
    cliente.valor_estimado > 0
  ) {
    return formatCurrency(cliente.valor_estimado)
  }
  if (typeof valor === 'number' && valor === 0) {
    return formatCurrency(0)
  }
  return formatCurrency(0)
}

/**
 * Resolve todos os placeholders em uma mensagem para um cliente específico:
 * - [nome do cliente]
 * - [cidade]
 * - [potência] / [potencia]
 * - [valor]
 */
export function resolverPlaceholdersMensagemMassa(params: {
  template: string
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  usinasDoCliente?: UsinaCliente[]
  valor?: number
  potenciaManual?: number | string
  cidadeManual?: string
}): string {
  const {
    template,
    cliente,
    usina,
    usinasDoCliente = [],
    valor,
    potenciaManual,
    cidadeManual,
  } = params

  if (!template) return ''

  const nome = extrairPrimeiroNomeCliente(cliente)
  const empresaCliente = (cliente.nome_fantasia || cliente.razao_social || 'Delfos Solar').trim()
  const cidade = cidadeManual || extrairCidadeCliente(cliente, usina)
  const dataHoje = new Date().toLocaleDateString('pt-BR')
  const potencia =
    potenciaManual !== undefined && potenciaManual !== null
      ? typeof potenciaManual === 'number'
        ? `${potenciaManual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`
        : String(potenciaManual)
      : extrairPotenciaClienteTexto(cliente, usina, usinasDoCliente)
  const valorTexto = extrairValorClienteTexto(valor, cliente)

  return template
    .replace(/\[nome do cliente\]/gi, nome)
    .replace(/\[nome da empresa\]/gi, empresaCliente)
    .replace(/\[empresa\]/gi, empresaCliente)
    .replace(/\[cidade\]/gi, cidade)
    .replace(/\[data atual\]/gi, dataHoje)
    .replace(/\[data\]/gi, dataHoje)
    .replace(/\[potência\]/gi, potencia)
    .replace(/\[potencia\]/gi, potencia)
    .replace(/\[valor\]/gi, valorTexto)
}

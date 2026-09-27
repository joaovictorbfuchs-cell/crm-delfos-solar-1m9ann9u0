import { formatCurrency } from '@/lib/formatters'
import type { Cliente, UsinaCliente } from '@/types/crm'

/**
 * Constantes e funções auxiliares para a funcionalidade "Oferecer Limpeza Avulsa"
 */

export const TARIFA_ENERGIA_PADRAO = 1.198
export const PERCENTUAL_PERDA_SUJEIRA = 0.3
export const VALOR_BASE_LIMPEZA_PADRAO = 350.0

export const MENSAGEM_OFERTA_LIMPEZA_PADRAO =
  'Olá, [nome do cliente]! Aqui é da Delfos Solar. Passando para lembrar que a limpeza periódica das placas solares é essencial para manter a geração de energia no máximo. Sujeira e poeira podem reduzir o desempenho em até 30%. Ou seja, como sua usina gera em média [geração média] kWh e o valor da fatura é R$ 1,198, são aproximadamente R$ [valor calculado] que são perdidos devido à sujeira. Temos disponibilidade para fazer a limpeza da sua usina de [potência] em [cidade]. O investimento é de [valor] e inclui inspeção visual completa do sistema. Posso agendar para você?'

export interface DadosCalculoOfertaLimpeza {
  geracaoMensalKwh: number
  geracaoAnualKwh: number
  valorPerdaAnual: number
  potenciaKwp: number
  cidade: string
  valorServico: number
}

/**
 * Calcula a geração média mensal estimada da usina do cliente.
 * Prioridade:
 * 1. Campo geracao_media_mensal_kwh da Usina vinculada
 * 2. Campo geracao_estimada_kwh da Usina vinculada
 * 3. Se zerado ou ausente, consumo_kwh_mes do cliente
 * 4. Fallback baseado na potência (potência_kwp * 120 kWh/kWp/mês) ou 850 kWh
 */
export function extrairGeracaoMediaMensal(
  cliente: Cliente,
  usinasDoCliente: UsinaCliente[] = [],
): number {
  // Procura usina vinculada com geração informada
  const usinaComGeracao = usinasDoCliente.find(
    (u) =>
      (typeof u.geracao_media_mensal_kwh === 'number' && u.geracao_media_mensal_kwh > 0) ||
      (typeof u.geracao_estimada_kwh === 'number' && u.geracao_estimada_kwh > 0),
  )

  if (usinaComGeracao) {
    if (
      typeof usinaComGeracao.geracao_media_mensal_kwh === 'number' &&
      usinaComGeracao.geracao_media_mensal_kwh > 0
    ) {
      return usinaComGeracao.geracao_media_mensal_kwh
    }
    if (
      typeof usinaComGeracao.geracao_estimada_kwh === 'number' &&
      usinaComGeracao.geracao_estimada_kwh > 0
    ) {
      return usinaComGeracao.geracao_estimada_kwh
    }
  }

  // Fallback 1: consumo do cliente
  if (typeof cliente.consumo_kwh_mes === 'number' && cliente.consumo_kwh_mes > 0) {
    return cliente.consumo_kwh_mes
  }

  // Fallback 2: estimativa pela potência da usina ou do cliente (potência * 120 kWh/kWp/mês)
  const potencia = usinasDoCliente[0]?.potencia_kwp || cliente.potencia_kwp || 0
  if (potencia > 0) {
    return Math.round(potencia * 120)
  }

  // Fallback padrão amigável caso nada conste
  return 850
}

/**
 * Extrai a potência da usina do cliente formatada (ex: "7,1 kWp")
 */
export function extrairPotenciaUsinaTexto(
  cliente: Cliente,
  usinasDoCliente: UsinaCliente[] = [],
): string {
  const pot =
    usinasDoCliente.find((u) => typeof u.potencia_kwp === 'number' && u.potencia_kwp > 0)
      ?.potencia_kwp ??
    cliente.potencia_kwp ??
    0

  if (pot > 0) {
    return `${pot.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp`
  }
  return 'energia solar'
}

/**
 * Calcula a perda anual por sujeira:
 * Geração anual estimada (geração mensal × 12) × R$ 1,198 × 0,30
 */
export function calcularPerdaAnualPorSujeira(
  geracaoMensalKwh: number,
  tarifa: number = TARIFA_ENERGIA_PADRAO,
  percentualPerda: number = PERCENTUAL_PERDA_SUJEIRA,
): { geracaoAnualKwh: number; valorPerda: number } {
  const geracaoAnualKwh = Math.round(geracaoMensalKwh * 12)
  const valorPerda = geracaoAnualKwh * tarifa * percentualPerda
  return {
    geracaoAnualKwh,
    valorPerda,
  }
}

/**
 * Resolve todos os placeholders da mensagem de oferta para um cliente específico:
 * - [nome do cliente]
 * - [geração média]
 * - [valor calculado]
 * - [potência]
 * - [cidade]
 * - [valor]
 */
export function resolverPlaceholdersOfertaLimpeza(params: {
  template: string
  cliente: Cliente
  usinasDoCliente?: UsinaCliente[]
  valorServico?: number
  tarifa?: number
}): string {
  const {
    template,
    cliente,
    usinasDoCliente = [],
    valorServico = VALOR_BASE_LIMPEZA_PADRAO,
    tarifa = TARIFA_ENERGIA_PADRAO,
  } = params

  const geracaoMensal = extrairGeracaoMediaMensal(cliente, usinasDoCliente)
  const { valorPerda } = calcularPerdaAnualPorSujeira(geracaoMensal, tarifa)

  // Extrai primeiro nome ou nome completo
  const nomeCompleto = (cliente.nome || 'Cliente').trim()
  const primeiroNome = nomeCompleto.split(' ')[0] || nomeCompleto

  const geracaoTexto = Math.round(geracaoMensal).toLocaleString('pt-BR')
  const perdaTexto = formatCurrency(valorPerda).replace('R$', '').trim()
  const valorServicoTexto = formatCurrency(valorServico)
  const potenciaTexto = extrairPotenciaUsinaTexto(cliente, usinasDoCliente)
  const cidadeTexto = (cliente.cidade || usinasDoCliente[0]?.endereco || 'sua região').trim()

  return template
    .replace(/\[nome do cliente\]/gi, primeiroNome)
    .replace(/\[geração média\]/gi, geracaoTexto)
    .replace(/\[geracao media\]/gi, geracaoTexto)
    .replace(/\[valor calculado\]/gi, perdaTexto)
    .replace(/\[potência\]/gi, potenciaTexto)
    .replace(/\[potencia\]/gi, potenciaTexto)
    .replace(/\[cidade\]/gi, cidadeTexto)
    .replace(/\[valor\]/gi, valorServicoTexto)
}

import type { OrcamentoSolar } from '@/types/crm'

/**
 * Retorna o valor numérico total de um orçamento solar, considerando valor_total
 * ou valor_investimento ou valor_total_custos.
 */
export function extrairValorOrcamento(orc: Partial<OrcamentoSolar> | null | undefined): number {
  if (!orc) return 0
  const anyOrc = orc as any
  const val =
    Number(anyOrc.valor_total) ||
    Number(anyOrc.valor_investimento) ||
    Number(anyOrc.valor_total_custos) ||
    0
  return val > 0 ? val : 0
}

/**
 * Encontra a última revisão de orçamento para um negócio específico (ou para o cliente)
 * dentro da lista de orçamentos solares disponíveis.
 * Ordena por maior numero_revisao e data mais recente.
 */
export function getUltimaRevisaoOrcamento(
  orcamentos: OrcamentoSolar[] | undefined,
  criterio: { negocioId?: string; clienteId?: string },
): OrcamentoSolar | null {
  if (!orcamentos || orcamentos.length === 0) return null

  const { negocioId, clienteId } = criterio

  // 1. Tentar correspondência exata por negocio_id se fornecido
  let candidatos: OrcamentoSolar[] = []
  if (negocioId) {
    candidatos = orcamentos.filter((o) => (o as any).negocio_id === negocioId)
  }

  // 2. Se não houver candidato por negocio_id mas houver clienteId, busca por cliente_id
  if (candidatos.length === 0 && clienteId) {
    candidatos = orcamentos.filter((o) => o.cliente_id === clienteId)
  }

  if (candidatos.length === 0) return null

  // Ordena por maior numero_revisao, depois data de criação mais recente
  const ordenados = [...candidatos].sort((a, b) => {
    const revA = Number(a.numero_revisao) || 0
    const revB = Number(b.numero_revisao) || 0
    if (revB !== revA) {
      return revB - revA
    }
    const timeA = new Date(a.created || a.data_orcamento || 0).getTime()
    const timeB = new Date(b.created || b.data_orcamento || 0).getTime()
    return timeB - timeA
  })

  return ordenados[0] || null
}

/**
 * Determina o valor a ser exibido no card comercial:
 * Se houver orçamento solar vinculado ao negócio/cliente, utiliza o valor da última revisão.
 * Caso contrário, fallback para o valor do negócio/cliente (ex: valor_final ou valor_estimado).
 */
export function getValorExibicaoCard(
  orcamentos: OrcamentoSolar[] | undefined,
  criterio: {
    negocioId?: string
    clienteId?: string
    valorFinal?: number
    valorEstimado?: number
    status?: string
  },
): { valor: number; isOrcamento: boolean; numeroRevisao?: number } {
  const ultimaRev = getUltimaRevisaoOrcamento(orcamentos, {
    negocioId: criterio.negocioId,
    clienteId: criterio.clienteId,
  })

  if (ultimaRev) {
    const valOrc = extrairValorOrcamento(ultimaRev)
    if (valOrc > 0) {
      return {
        valor: valOrc,
        isOrcamento: true,
        numeroRevisao: ultimaRev.numero_revisao,
      }
    }
  }

  // Fallback para valor do negócio/cliente
  const valNegocio =
    criterio.status === 'ganho' && criterio.valorFinal
      ? Number(criterio.valorFinal)
      : Number(criterio.valorEstimado) || Number(criterio.valorFinal) || 0

  return {
    valor: valNegocio,
    isOrcamento: false,
  }
}

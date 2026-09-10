import type { Cliente, ContratoOM, ServicoAdicionalOM, AnomaliaOM } from '@/types/crm'

export type CategoriaClienteOM =
  | 'plano_ativo'
  | 'sem_plano'
  | 'servico_avulso'
  | 'anomalia_aberta'
  | 'plano_vencido'

export interface ContagensOM {
  totalClientes: number
  planosAtivos: number
  semPlano: number
  servicosAvulsos: number
  anomaliasAbertas: number
  planosVencidos: number
  // Contagens secundárias de ocorrências globais (para badges informativos)
  totalAnomaliasAbertasOcorrencias: number
  totalServicosAvulsosOcorrencias: number
}

/**
 * Classifica um cliente na categoria prioritária O&M:
 * Cada cliente pertence a uma única categoria primária.
 *
 * Prioridades:
 * 1. Plano O&M ativo (inclui status "Ativo" e "Vencendo em 30 dias"; anomalias e serviços adicionais não retiram o cliente de plano ativo)
 * 2. Plano vencido (se o cliente tiver contrato vencido e nenhum contrato ativo)
 * 3. Anomalia aberta (se o cliente NÃO tiver plano mas possuir anomalia aberta/em triagem/em análise/em execução)
 * 4. Serviço avulso em andamento (se o cliente NÃO tiver plano/anomalia mas tiver serviço adicional 'em execução' ou 'pendente')
 * 5. Sem plano (oportunidade pura)
 */
export function categorizarClienteOM(
  clienteId: string,
  contratosOM: ContratoOM[],
  servicosAdicionaisOM: ServicoAdicionalOM[],
  anomaliasOM: AnomaliaOM[],
): {
  categoria: CategoriaClienteOM
  contratoAtivo?: ContratoOM
  contratoVencido?: ContratoOM
  temAnomaliaAberta: boolean
  temServicoAvulsoEmAndamento: boolean
} {
  // Contratos do cliente
  const contratos = contratosOM.filter((c) => c.cliente_id === clienteId)

  // Contrato ativo (status Ativo ou Vencendo em 30 dias e data de vencimento não expirada com status Vencido)
  const contratoAtivo = contratos.find((c) => {
    if (c.status === 'Vencido') return false
    if (c.data_vencimento) {
      const diasRestantes = Math.ceil(
        (new Date(c.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )
      if (diasRestantes < 0) return false
    }
    return c.status === 'Ativo' || c.status === 'Vencendo em 30 dias'
  })

  // Contrato vencido
  const contratoVencido = !contratoAtivo
    ? contratos.find((c) => {
        if (c.status === 'Vencido') return true
        if (c.data_vencimento) {
          const diasRestantes = Math.ceil(
            (new Date(c.data_vencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
          )
          return diasRestantes < 0
        }
        return false
      })
    : undefined

  // Anomalia aberta deste cliente
  const temAnomaliaAberta = anomaliasOM.some(
    (a) => a.cliente_id === clienteId && a.status !== 'Resolvido' && a.status !== 'Cancelado',
  )

  // Serviço avulso / adicional em andamento deste cliente
  const temServicoAvulsoEmAndamento = servicosAdicionaisOM.some(
    (s) => s.cliente_id === clienteId && (s.status === 'em execução' || s.status === 'pendente'),
  )

  let categoria: CategoriaClienteOM

  if (contratoAtivo) {
    categoria = 'plano_ativo'
  } else if (contratoVencido) {
    categoria = 'plano_vencido'
  } else if (temAnomaliaAberta) {
    categoria = 'anomalia_aberta'
  } else if (temServicoAvulsoEmAndamento) {
    categoria = 'servico_avulso'
  } else {
    categoria = 'sem_plano'
  }

  return {
    categoria,
    contratoAtivo,
    contratoVencido,
    temAnomaliaAberta,
    temServicoAvulsoEmAndamento,
  }
}

/**
 * Calcula os totais exatos por cliente para alimentar cards de resumo e botões de filtro.
 * A soma das categorias exclusivas de clientes é exatamente igual ao número de clientes.
 */
export function calcularContagensOM(
  clientes: Cliente[],
  contratosOM: ContratoOM[],
  servicosAdicionaisOM: ServicoAdicionalOM[],
  anomaliasOM: AnomaliaOM[],
): ContagensOM {
  let planosAtivos = 0
  let semPlano = 0
  let servicosAvulsos = 0
  let anomaliasAbertas = 0
  let planosVencidos = 0

  for (const cliente of clientes) {
    const { categoria } = categorizarClienteOM(
      cliente.id,
      contratosOM,
      servicosAdicionaisOM,
      anomaliasOM,
    )

    switch (categoria) {
      case 'plano_ativo':
        planosAtivos++
        break
      case 'plano_vencido':
        planosVencidos++
        break
      case 'anomalia_aberta':
        anomaliasAbertas++
        break
      case 'servico_avulso':
        servicosAvulsos++
        break
      case 'sem_plano':
        semPlano++
        break
    }
  }

  // Contadores secundários informativos (número absoluto de tickets/serviços não resolvidos)
  const totalAnomaliasAbertasOcorrencias = anomaliasOM.filter(
    (a) => a.status !== 'Resolvido' && a.status !== 'Cancelado',
  ).length

  const totalServicosAvulsosOcorrencias = servicosAdicionaisOM.filter(
    (s) => s.status === 'em execução' || s.status === 'pendente',
  ).length

  return {
    totalClientes: clientes.length,
    planosAtivos,
    semPlano,
    servicosAvulsos,
    anomaliasAbertas,
    planosVencidos,
    totalAnomaliasAbertasOcorrencias,
    totalServicosAvulsosOcorrencias,
  }
}

import type {
  Cliente,
  ContratoOM,
  ServicoAdicionalOM,
  AnomaliaOM,
  ServicoAvulso,
} from '@/types/crm'

export type CategoriaClienteOM =
  | 'plano_ativo'
  | 'pos_vendas'
  | 'sem_plano'
  | 'servico_avulso'
  | 'anomalia_aberta'
  | 'plano_vencido'

export interface ContagensOM {
  totalClientes: number
  planosAtivos: number
  posVendas: number
  oportunidadesOM: number
  semPlano: number
  servicosAvulsos: number
  anomaliasAbertas: number
  planosVencidos: number
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
  servicosAdicionaisOM: ServicoAdicionalOM[] = [],
  anomaliasOM: AnomaliaOM[] = [],
  servicosAvulsos: ServicoAvulso[] = [],
): {
  categoria: CategoriaClienteOM
  contratoAtivo?: ContratoOM
  contratoVencido?: ContratoOM
  temAnomaliaAberta: boolean
  temServicoAvulsoEmAndamento: boolean
  temServicoAvulsoHistorico: boolean
  ultimoServicoAvulso?: ServicoAvulso
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

  // Serviço avulso da coleção servicos_avulsos e servicos_adicionais_om
  const avulsosCliente = servicosAvulsos.filter((s) => s.cliente_id === clienteId)
  const temServicoAvulsoHistorico =
    avulsosCliente.length > 0 || servicosAdicionaisOM.some((s) => s.cliente_id === clienteId)
  const ultimoServicoAvulso = avulsosCliente[0] // já ordenado por data_servico desc

  const temServicoAvulsoEmAndamento =
    avulsosCliente.some((s) => s.status === 'agendado' || s.status === 'em_andamento') ||
    servicosAdicionaisOM.some(
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
    temServicoAvulsoHistorico,
    ultimoServicoAvulso,
  }
}

/**
 * Calcula os totais exatos por cliente para alimentar cards de resumo e botões de filtro.
 */
export function calcularContagensOM(
  clientes: Cliente[],
  contratosOM: ContratoOM[],
  servicosAdicionaisOM: ServicoAdicionalOM[] = [],
  anomaliasOM: AnomaliaOM[] = [],
  servicosAvulsos: ServicoAvulso[] = [],
  sistemas: { cliente_id?: string; potencia_total_kwp?: number }[] = [],
): ContagensOM {
  let planosAtivos = 0
  let posVendas = 0
  let oportunidadesOM = 0
  let semPlano = 0
  let servicosAvulsosCount = 0
  let anomaliasAbertas = 0
  let planosVencidos = 0

  for (const cliente of clientes) {
    const { categoria, temServicoAvulsoHistorico } = categorizarClienteOM(
      cliente.id,
      contratosOM,
      servicosAdicionaisOM,
      anomaliasOM,
      servicosAvulsos,
    )

    const sistema = sistemas.find((s) => s.cliente_id === cliente.id)
    const potencia = sistema?.potencia_total_kwp ?? cliente.potencia_kwp ?? 0
    const instalouSolar =
      potencia > 0 ||
      Boolean(cliente.data_instalacao) ||
      cliente.status === 'Fechado' ||
      cliente.produto === 'Energia Solar'

    if (categoria === 'plano_ativo') {
      planosAtivos++
    } else {
      // É Pós-Vendas (não tem plano ativo)
      posVendas++
      if (instalouSolar) {
        oportunidadesOM++
      }
    }

    switch (categoria) {
      case 'plano_vencido':
        planosVencidos++
        break
      case 'anomalia_aberta':
        anomaliasAbertas++
        break
      case 'servico_avulso':
        servicosAvulsosCount++
        break
      case 'sem_plano':
        semPlano++
        break
    }
  }

  const totalAnomaliasAbertasOcorrencias = anomaliasOM.filter(
    (a) => a.status !== 'Resolvido' && a.status !== 'Cancelado',
  ).length

  const totalServicosAvulsosOcorrencias =
    servicosAdicionaisOM.filter((s) => s.status === 'em execução' || s.status === 'pendente')
      .length +
    servicosAvulsos.filter((s) => s.status === 'agendado' || s.status === 'em_andamento').length

  return {
    totalClientes: clientes.length,
    planosAtivos,
    posVendas,
    oportunidadesOM,
    semPlano,
    servicosAvulsos: servicosAvulsosCount,
    anomaliasAbertas,
    planosVencidos,
    totalAnomaliasAbertasOcorrencias,
    totalServicosAvulsosOcorrencias,
  }
}

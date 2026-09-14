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
  clientesSemPlano: number
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
/**
 * Calcula os dias restantes de forma defensiva até uma data de vencimento.
 * Retorna null se a data for nula, indefinida ou inválida, evitando NaN.
 */
export function calcularDiasRestantesDefensivo(dataVencimento?: string | null): number | null {
  if (!dataVencimento || typeof dataVencimento !== 'string') return null
  const timestamp = new Date(dataVencimento).getTime()
  if (isNaN(timestamp)) return null
  return Math.ceil((timestamp - Date.now()) / (1000 * 60 * 60 * 24))
}

export function categorizarClienteOM(
  clienteId: string,
  contratosOM: ContratoOM[] = [],
  servicosAdicionaisOM: ServicoAdicionalOM[] = [],
  anomaliasOM: AnomaliaOM[] = [],
  servicosAvulsos: ServicoAvulso[] = [],
  clienteOuStatus?: Cliente | { status?: string; [key: string]: any } | null,
): {
  categoria: CategoriaClienteOM
  contratoAtivo?: ContratoOM
  contratoVencido?: ContratoOM
  temAnomaliaAberta: boolean
  temServicoAvulsoEmAndamento: boolean
  temServicoAvulsoHistorico: boolean
  ultimoServicoAvulso?: ServicoAvulso
  isPosVenda: boolean
} {
  const safeContratos = Array.isArray(contratosOM) ? contratosOM : []
  const safeServicosAdicionais = Array.isArray(servicosAdicionaisOM) ? servicosAdicionaisOM : []
  const safeAnomalias = Array.isArray(anomaliasOM) ? anomaliasOM : []
  const safeServicosAvulsos = Array.isArray(servicosAvulsos) ? servicosAvulsos : []

  // Contratos do cliente
  const contratos = safeContratos.filter((c) => c?.cliente_id === clienteId)

  // Contrato ativo (status Ativo ou Vencendo em 30 dias, sem encerramento, e data de vencimento não expirada com status Vencido)
  const contratoAtivo = contratos.find((c) => {
    if (!c) return false
    if (c.status === 'Vencido' || c.status === 'Cancelado' || c.status === 'Encerrado') return false
    if (c.status_encerramento === 'encerrado') return false
    const diasRestantes = calcularDiasRestantesDefensivo(c.data_vencimento)
    if (diasRestantes !== null && diasRestantes < 0) return false
    return c.status === 'Ativo' || c.status === 'Vencendo em 30 dias'
  })

  // Contrato vencido
  const contratoVencido = !contratoAtivo
    ? contratos.find((c) => {
        if (!c) return false
        if (c.status_encerramento === 'encerrado' || c.status === 'Encerrado') return false
        if (c.status === 'Vencido') return true
        const diasRestantes = calcularDiasRestantesDefensivo(c.data_vencimento)
        if (diasRestantes !== null && diasRestantes < 0) return true
        return false
      })
    : undefined

  // Anomalia aberta deste cliente
  const temAnomaliaAberta = safeAnomalias.some(
    (a) => a?.cliente_id === clienteId && a?.status !== 'Resolvido' && a?.status !== 'Cancelado',
  )

  // Serviço avulso da coleção servicos_avulsos e servicos_adicionais_om
  const avulsosCliente = safeServicosAvulsos.filter((s) => s?.cliente_id === clienteId)
  const temServicoAvulsoHistorico =
    avulsosCliente.length > 0 || safeServicosAdicionais.some((s) => s?.cliente_id === clienteId)
  const ultimoServicoAvulso = avulsosCliente[0] // já ordenado por data_servico desc

  const temServicoAvulsoEmAndamento =
    avulsosCliente.some((s) => s?.status === 'agendado' || s?.status === 'em_andamento') ||
    safeServicosAdicionais.some(
      (s) =>
        s?.cliente_id === clienteId && (s?.status === 'em execução' || s?.status === 'pendente'),
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

  // CRITÉRIO OFICIAL DE PÓS-VENDAS (Alinhado às migrações 0078/0080):
  // Entram e permanecem na área de Pós-Vendas:
  // 1. Clientes com transferido_pos_vendas = true (abrange clientes com status 'Fechado'
  //    transferidos do funil comercial E clientes com credenciais de monitoramento importadas);
  // 2. OU clientes com status 'Fechado' / 'Concluído' vindos do funil comercial;
  // 3. OU clientes que possuem credenciais de monitoramento registradas diretamente no objeto do cliente.
  // Quem NÃO fechou negócio E NÃO tem credenciais de monitoramento / transferido_pos_vendas NÃO entra em Pós-Vendas.
  const isTransferidoPosVendas = Boolean((clienteOuStatus as any)?.transferido_pos_vendas)
  const statusCliente = (clienteOuStatus as any)?.status
  const isFechadoFunil = statusCliente === 'Fechado' || statusCliente === 'Concluído'

  // Verificação direta de credenciais de monitoramento no próprio cliente
  const monLogin = ((clienteOuStatus as any)?.monitoramento_login || '').trim()
  const monSenha = ((clienteOuStatus as any)?.monitoramento_senha || '').trim()
  const solLogin = ((clienteOuStatus as any)?.solarview_login || '').trim()
  const solSenha = ((clienteOuStatus as any)?.solarview_senha || '').trim()
  const temCredenciaisDiretas =
    monLogin !== '' || monSenha !== '' || solLogin !== '' || solSenha !== ''

  // Cliente entra em Pós-Vendas se NÃO tem plano ativo e foi qualificado para pós-vendas
  const isPosVenda =
    categoria !== 'plano_ativo' &&
    (isTransferidoPosVendas || isFechadoFunil || temCredenciaisDiretas)

  return {
    categoria,
    contratoAtivo,
    contratoVencido,
    temAnomaliaAberta,
    temServicoAvulsoEmAndamento,
    temServicoAvulsoHistorico,
    ultimoServicoAvulso,
    isPosVenda,
  }
}

/**
 * Calcula os totais exatos por cliente para alimentar cards de resumo e botões de filtro.
 */
export function calcularContagensOM(
  clientes: Cliente[] = [],
  contratosOM: ContratoOM[] = [],
  servicosAdicionaisOM: ServicoAdicionalOM[] = [],
  anomaliasOM: AnomaliaOM[] = [],
  servicosAvulsos: ServicoAvulso[] = [],
  sistemas: { cliente_id?: string; potencia_total_kwp?: number }[] = [],
): ContagensOM {
  const safeClientes = Array.isArray(clientes) ? clientes : []
  const safeContratos = Array.isArray(contratosOM) ? contratosOM : []
  const safeServicosAdicionais = Array.isArray(servicosAdicionaisOM) ? servicosAdicionaisOM : []
  const safeAnomalias = Array.isArray(anomaliasOM) ? anomaliasOM : []
  const safeServicosAvulsos = Array.isArray(servicosAvulsos) ? servicosAvulsos : []
  const safeSistemas = Array.isArray(sistemas) ? sistemas : []

  let planosAtivos = 0
  let posVendas = 0
  let oportunidadesOM = 0
  let semPlano = 0
  let servicosAvulsosCount = 0
  let anomaliasAbertas = 0
  let planosVencidos = 0
  let clientesSemPlano = 0

  for (const cliente of safeClientes) {
    if (!cliente?.id) continue

    const { categoria, temServicoAvulsoHistorico, isPosVenda } = categorizarClienteOM(
      cliente.id,
      safeContratos,
      safeServicosAdicionais,
      safeAnomalias,
      safeServicosAvulsos,
      cliente,
    )

    const sistema = safeSistemas.find((s) => s?.cliente_id === cliente.id)
    const potencia = Number(sistema?.potencia_total_kwp ?? cliente?.potencia_kwp) || 0
    const statusVal = String(cliente?.status || '')
    const instalouSolar =
      potencia > 0 ||
      Boolean(cliente?.data_instalacao) ||
      statusVal === 'Fechado' ||
      statusVal === 'Concluído' ||
      cliente?.produto === 'Energia Solar'

    if (categoria === 'plano_ativo') {
      planosAtivos++
    } else if (isPosVenda) {
      posVendas++

      if (instalouSolar) {
        oportunidadesOM++
      }

      if (!instalouSolar && !temServicoAvulsoHistorico) {
        clientesSemPlano++
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

  const totalAnomaliasAbertasOcorrencias = safeAnomalias.filter(
    (a) => a && a.status !== 'Resolvido' && a.status !== 'Cancelado',
  ).length

  const totalServicosAvulsosOcorrencias =
    safeServicosAdicionais.filter(
      (s) => s && (s.status === 'em execução' || s.status === 'pendente'),
    ).length +
    safeServicosAvulsos.filter((s) => s && (s.status === 'agendado' || s.status === 'em_andamento'))
      .length

  return {
    totalClientes: safeClientes.length,
    planosAtivos,
    posVendas,
    oportunidadesOM,
    semPlano,
    servicosAvulsos: servicosAvulsosCount,
    anomaliasAbertas,
    planosVencidos,
    totalAnomaliasAbertasOcorrencias,
    totalServicosAvulsosOcorrencias,
    clientesSemPlano,
  }
}

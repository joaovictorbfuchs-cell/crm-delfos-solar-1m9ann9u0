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

  // Critério de estágio comercial fechado no funil ou explicitamente transferido para pós-vendas
  const statusCliente = (clienteOuStatus as any)?.status
  const isComercialFechado =
    statusCliente === 'Fechado' ||
    statusCliente === 'Concluído' ||
    Boolean((clienteOuStatus as any)?.transferido_pos_vendas)

  // Proposta O&M aprovada / fechada
  const propostaStatus = ((clienteOuStatus as any)?.proposta_om_status || '').toLowerCase().trim()
  const temPropostaOMAprovada =
    Boolean((clienteOuStatus as any)?.proposta_om_aprovada) ||
    propostaStatus === 'aprovado' ||
    propostaStatus === 'aprovada' ||
    propostaStatus === 'fechado' ||
    propostaStatus === 'fechada' ||
    propostaStatus === 'aceita'

  // Contrato O&M existente
  const temContratoOM = contratos.length > 0

  // Origem Conta Azul / importação
  const dadosImportados = (clienteOuStatus as any)?.dados_importados
  const isContaAzulOuImportado =
    Boolean(dadosImportados?.['Razão Social / Nome']) ||
    Boolean(dadosImportados?.['Data do Cadastro']) ||
    (clienteOuStatus as any)?.origem_lead === 'Outro' ||
    Boolean(dadosImportados && Object.keys(dadosImportados).length > 0)

  // Cliente entra em Pós-Venda se NÃO tem plano ativo e atende aos critérios (comercial fechado, serviço avulso, contrato, proposta aprovada ou importado)
  const isPosVenda =
    categoria !== 'plano_ativo' &&
    (isComercialFechado ||
      temPropostaOMAprovada ||
      temContratoOM ||
      temServicoAvulsoHistorico ||
      temServicoAvulsoEmAndamento ||
      isContaAzulOuImportado ||
      Boolean(
        (clienteOuStatus as any)?.potencia_kwp && (clienteOuStatus as any)?.potencia_kwp > 0,
      ) ||
      Boolean((clienteOuStatus as any)?.data_instalacao) ||
      (clienteOuStatus as any)?.produto === 'Energia Solar' ||
      categoria === 'sem_plano' ||
      categoria === 'plano_vencido' ||
      categoria === 'anomalia_aberta' ||
      categoria === 'servico_avulso')

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

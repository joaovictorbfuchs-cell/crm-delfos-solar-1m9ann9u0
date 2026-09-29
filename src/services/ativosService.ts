import pb from '@/lib/pocketbase/client'
import type { AtivoUsina, InfoStatusGarantia, SalvarAtivoDados, TipoAtivo } from '@/types/ativos'
import type { UsinaCliente } from '@/types/crm'

export const OPCOES_TIPO_ATIVO: { value: TipoAtivo; label: string }[] = [
  { value: 'inversor', label: 'Inversor' },
  { value: 'placa_solar', label: 'Placa Solar (Módulo FV)' },
  { value: 'bateria', label: 'Bateria' },
  { value: 'string_box', label: 'String Box' },
  { value: 'outros', label: 'Outros' },
]

export function getLabelTipoAtivo(tipo: TipoAtivo, tipoOutroDescricao?: string): string {
  if (tipo === 'outros' && tipoOutroDescricao?.trim()) {
    return tipoOutroDescricao.trim()
  }
  const encontrado = OPCOES_TIPO_ATIVO.find((o) => o.value === tipo)
  return encontrado ? encontrado.label : tipo
}

/**
 * Indicador visual simples de status de garantia (vigente, próxima do vencimento em 60 dias, vencida, não informada).
 * Apenas visual e sem automação.
 */
export function calcularStatusGarantia(dataFimGarantia?: string): InfoStatusGarantia {
  if (!dataFimGarantia) {
    return {
      status: 'nao_informada',
      label: 'Não informada',
      descricao: 'Data de garantia não cadastrada',
      badgeVariant: 'outline',
      badgeClasses: 'bg-slate-50 text-slate-500 border-slate-200',
    }
  }

  const fimDate = new Date(dataFimGarantia)
  if (isNaN(fimDate.getTime())) {
    return {
      status: 'nao_informada',
      label: 'Data inválida',
      descricao: 'Data de garantia inválida',
      badgeVariant: 'outline',
      badgeClasses: 'bg-slate-50 text-slate-500 border-slate-200',
    }
  }

  // Normalizar para meia-noite do dia atual
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  fimDate.setHours(0, 0, 0, 0)

  const diffMs = fimDate.getTime() - hoje.getTime()
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias < 0) {
    const diasVencida = Math.abs(diffDias)
    return {
      status: 'vencida',
      label: 'Garantia Vencida',
      descricao: `Venceu há ${diasVencida} ${diasVencida === 1 ? 'dia' : 'dias'}`,
      badgeVariant: 'destructive',
      badgeClasses: 'bg-rose-50 text-rose-700 border-rose-300',
      diasRestantes: diffDias,
    }
  }

  if (diffDias <= 60) {
    return {
      status: 'proxima_vencimento',
      label: diffDias === 0 ? 'Vence hoje' : `Vence em ${diffDias}d`,
      descricao: `Garantia vence em ${diffDias} ${diffDias === 1 ? 'dia' : 'dias'}`,
      badgeVariant: 'secondary',
      badgeClasses: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
      diasRestantes: diffDias,
    }
  }

  return {
    status: 'vigente',
    label: 'Garantia Vigente',
    descricao: `Válida por mais ${diffDias} dias`,
    badgeVariant: 'default',
    badgeClasses: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    diasRestantes: diffDias,
  }
}

export interface FiltrosAtivos {
  usinaId?: string
  tipo?: TipoAtivo
  busca?: string
  statusGarantia?: string
}

export async function fetchAllUsinasComCliente(): Promise<UsinaCliente[]> {
  try {
    return await pb.collection('usinas').getFullList<UsinaCliente>({
      sort: 'nome',
      expand: 'cliente_id',
    })
  } catch (err) {
    console.error('Erro ao buscar usinas com cliente:', err)
    return []
  }
}

export async function fetchAtivos(filtros?: FiltrosAtivos): Promise<AtivoUsina[]> {
  try {
    const parts: string[] = []

    if (filtros?.usinaId && filtros.usinaId !== 'todas') {
      parts.push(`usina_id = '${filtros.usinaId}'`)
    }
    if (filtros?.tipo && filtros.tipo !== ('todos' as any)) {
      parts.push(`tipo = '${filtros.tipo}'`)
    }
    if (filtros?.busca?.trim()) {
      const q = filtros.busca.trim().replace(/['"\\]/g, '')
      parts.push(
        `(fabricante ~ '${q}' || modelo ~ '${q}' || numero_serie ~ '${q}' || tipo_outro_descricao ~ '${q}')`,
      )
    }

    const filterString = parts.length > 0 ? parts.join(' && ') : undefined

    const records = await pb.collection('ativos').getFullList<AtivoUsina>({
      filter: filterString,
      sort: '-created',
      expand: 'usina_id,usina_id.cliente_id,responsavel_id',
    })

    if (filtros?.statusGarantia && filtros.statusGarantia !== 'todos') {
      return records.filter((item) => {
        const info = calcularStatusGarantia(item.data_fim_garantia)
        return info.status === filtros.statusGarantia
      })
    }

    return records
  } catch (err) {
    console.error('Erro ao buscar ativos:', err)
    return []
  }
}

export async function fetchAtivosPorUsina(usinaId: string): Promise<AtivoUsina[]> {
  if (!usinaId) return []
  try {
    return await pb.collection('ativos').getFullList<AtivoUsina>({
      filter: `usina_id = '${usinaId}'`,
      sort: 'tipo,fabricante,modelo',
      expand: 'responsavel_id',
    })
  } catch (err) {
    console.error(`Erro ao buscar ativos da usina ${usinaId}:`, err)
    return []
  }
}

export async function createAtivo(dados: SalvarAtivoDados): Promise<AtivoUsina> {
  const payload: Record<string, any> = {
    usina_id: dados.usina_id || null,
    tipo: dados.tipo,
    fabricante: dados.fabricante.trim(),
    modelo: dados.modelo.trim(),
    tipo_outro_descricao:
      dados.tipo === 'outros' && dados.tipo_outro_descricao
        ? dados.tipo_outro_descricao.trim()
        : '',
    numero_serie: dados.numero_serie ? dados.numero_serie.trim() : '',
    observacoes: dados.observacoes ? dados.observacoes.trim() : '',
    status_operacional: dados.status_operacional || 'operacional',
    chave_importacao: dados.chave_importacao || '',
    cliente_inversor_id: dados.cliente_inversor_id || '',
  }

  if (dados.data_instalacao) {
    payload.data_instalacao =
      dados.data_instalacao.includes('T') || dados.data_instalacao.includes(' ')
        ? dados.data_instalacao
        : `${dados.data_instalacao} 12:00:00.000Z`
  } else {
    payload.data_instalacao = null
  }

  if (dados.data_fim_garantia) {
    payload.data_fim_garantia =
      dados.data_fim_garantia.includes('T') || dados.data_fim_garantia.includes(' ')
        ? dados.data_fim_garantia
        : `${dados.data_fim_garantia} 12:00:00.000Z`
  } else {
    payload.data_fim_garantia = null
  }

  if (dados.responsavel_id) {
    payload.responsavel_id = dados.responsavel_id
  }

  return await pb.collection('ativos').create<AtivoUsina>(payload, {
    expand: 'usina_id,usina_id.cliente_id,responsavel_id',
  })
}

export async function updateAtivo(
  id: string,
  dados: Partial<SalvarAtivoDados>,
): Promise<AtivoUsina> {
  const payload: Record<string, any> = {}

  if (dados.usina_id !== undefined) payload.usina_id = dados.usina_id || null
  if (dados.tipo !== undefined) payload.tipo = dados.tipo
  if (dados.tipo_outro_descricao !== undefined)
    payload.tipo_outro_descricao = dados.tipo_outro_descricao.trim()
  if (dados.fabricante !== undefined) payload.fabricante = dados.fabricante.trim()
  if (dados.modelo !== undefined) payload.modelo = dados.modelo.trim()
  if (dados.numero_serie !== undefined) payload.numero_serie = dados.numero_serie.trim()
  if (dados.observacoes !== undefined) payload.observacoes = dados.observacoes.trim()
  if (dados.status_operacional !== undefined) payload.status_operacional = dados.status_operacional
  if (dados.responsavel_id !== undefined) payload.responsavel_id = dados.responsavel_id || null
  if (dados.chave_importacao !== undefined) payload.chave_importacao = dados.chave_importacao
  if (dados.cliente_inversor_id !== undefined)
    payload.cliente_inversor_id = dados.cliente_inversor_id

  if (dados.data_instalacao !== undefined) {
    payload.data_instalacao = dados.data_instalacao
      ? dados.data_instalacao.includes('T') || dados.data_instalacao.includes(' ')
        ? dados.data_instalacao
        : `${dados.data_instalacao} 12:00:00.000Z`
      : null
  }

  if (dados.data_fim_garantia !== undefined) {
    payload.data_fim_garantia = dados.data_fim_garantia
      ? dados.data_fim_garantia.includes('T') || dados.data_fim_garantia.includes(' ')
        ? dados.data_fim_garantia
        : `${dados.data_fim_garantia} 12:00:00.000Z`
      : null
  }

  return await pb.collection('ativos').update<AtivoUsina>(id, payload, {
    expand: 'usina_id,usina_id.cliente_id,responsavel_id',
  })
}

export async function deleteAtivo(id: string): Promise<boolean> {
  await pb.collection('ativos').delete(id)
  return true
}

/**
 * Analisa os registros de `cliente_inversores` e os ativos atuais para
 * simular a cópia/importação e fornecer resumo com confirmação ao usuário.
 */
export async function analisarImportacaoInversores(): Promise<
  import('@/types/ativos').AnaliseImportacaoInversores
> {
  // 1. Carrega todos os registros de cliente_inversores com cliente expandido
  const [inversores, usinas, clientes, ativosExistentes] = await Promise.all([
    pb.collection('cliente_inversores').getFullList<import('@/types/crm').ClienteInversor>({
      sort: 'cliente_id,ordem,created',
      requestKey: null,
    }),
    pb.collection('usinas').getFullList<import('@/types/crm').UsinaCliente>({
      sort: 'created',
      requestKey: null,
    }),
    pb.collection('clientes').getFullList<{ id: string; nome: string }>({
      fields: 'id,nome',
      requestKey: null,
    }),
    pb.collection('ativos').getFullList<AtivoUsina>({
      sort: 'created',
      requestKey: null,
    }),
  ])

  const mapaClientes = new Map<string, string>()
  clientes.forEach((c) => mapaClientes.set(c.id, c.nome))

  // Mapeia usinas por cliente: cliente_id -> UsinaCliente[]
  const usinasPorCliente = new Map<string, import('@/types/crm').UsinaCliente[]>()
  usinas.forEach((u) => {
    if (u.cliente_id) {
      const arr = usinasPorCliente.get(u.cliente_id) || []
      arr.push(u)
      usinasPorCliente.set(u.cliente_id, arr)
    }
  })

  // Mapa de ativos já criados por chave_importacao ou observação ou cliente_inversor_id
  const mapaAtivosImportados = new Map<string, AtivoUsina>()
  ativosExistentes.forEach((a) => {
    if (a.chave_importacao) {
      mapaAtivosImportados.set(a.chave_importacao, a)
    }
    if (a.cliente_inversor_id) {
      mapaAtivosImportados.set(`cliente_inversores:${a.cliente_inversor_id}`, a)
    }
    if (a.observacoes && a.observacoes.includes('Importado de cliente_inversores #')) {
      const match = a.observacoes.match(/#([a-zA-Z0-9_-]+)/)
      if (match && match[1]) {
        mapaAtivosImportados.set(`cliente_inversores:${match[1]}`, a)
      }
    }
  })

  const aptosParaCriar: import('@/types/ativos').AnaliseImportacaoInversores['aptosParaCriar'] = []
  const jaImportados: import('@/types/ativos').AnaliseImportacaoInversores['jaImportados'] = []
  const foraPorFaltaDados: import('@/types/ativos').InversorIgnoradoInfo[] = []

  for (const inv of inversores) {
    const chave = `cliente_inversores:${inv.id}`
    const clienteNome =
      (inv.cliente_id && mapaClientes.get(inv.cliente_id)) || 'Cliente não identificado'

    // Verifica se já foi importado (idempotência)
    const existente = mapaAtivosImportados.get(chave)
    if (existente) {
      jaImportados.push({
        inversorId: inv.id,
        clienteNome,
        fabricante: existente.fabricante,
        modelo: existente.modelo,
        numeroSerie: existente.numero_serie,
        ativoExistenteId: existente.id,
      })
      continue
    }

    // Regra de validação mínima dos dados:
    // Deve ter pelo menos um dado identificador confiável:
    // (marca/fabricante OU modelo OU número de série). Se tudo for vazio, fica de fora.
    const marcaRaw = (inv.marca_inversor || '').trim()
    const modeloRaw = (inv.modelo_inversor || '').trim()
    const serieRaw = (inv.numero_serie || '').trim()

    if (!marcaRaw && !modeloRaw && !serieRaw) {
      foraPorFaltaDados.push({
        id: inv.id,
        cliente_id: inv.cliente_id,
        cliente_nome: clienteNome,
        marca_inversor: inv.marca_inversor,
        modelo_inversor: inv.modelo_inversor,
        numero_serie: inv.numero_serie,
        motivo: 'Sem fabricante, sem modelo e sem número de série preenchidos',
      })
      continue
    }

    // Determina fabricante
    const fabricante = marcaRaw || 'Não especificado'
    // Determina modelo: se modelo estiver vazio mas temos potência ou número de série, formatamos
    let modelo = modeloRaw
    if (!modelo) {
      if (inv.potencia_kwp && inv.potencia_kwp > 0) {
        modelo = `Inversor ${inv.potencia_kwp} kWp`
      } else if (serieRaw) {
        modelo = `Inversor SN ${serieRaw}`
      } else {
        modelo = 'Inversor Solar'
      }
    }

    // Vínculo com usina de forma confiável
    let usinaIdAssociada: string | undefined = undefined
    let usinaNomeAssociada: string | undefined = undefined

    if (inv.cliente_id) {
      const usinasDoCli = usinasPorCliente.get(inv.cliente_id) || []
      if (usinasDoCli.length === 1) {
        // Vínculo unívoco e confiável
        usinaIdAssociada = usinasDoCli[0].id
        usinaNomeAssociada = usinasDoCli[0].nome
      } else if (usinasDoCli.length > 1) {
        // Se houver mais de uma usina do cliente, verifica se o nome da usina bate com app_nome ou observações
        const matchUsina = usinasDoCli.find(
          (u) =>
            (inv.app_nome && u.nome.toLowerCase().includes(inv.app_nome.toLowerCase())) ||
            (inv.observacoes && u.nome.toLowerCase().includes(inv.observacoes.toLowerCase())),
        )
        if (matchUsina) {
          usinaIdAssociada = matchUsina.id
          usinaNomeAssociada = matchUsina.nome
        } else {
          // Não inventa vínculos dúbios: se houver múltiplas usinas sem desempate claro,
          // usa a primeira usina principal se existir nomeada 'Usina Principal'
          const usinaPrincipal = usinasDoCli.find((u) => u.nome.toLowerCase().includes('principal'))
          if (usinaPrincipal) {
            usinaIdAssociada = usinaPrincipal.id
            usinaNomeAssociada = usinaPrincipal.nome
          }
        }
      }
    }

    // Formata a observação com rastreabilidade
    let obs = `Importado de cliente_inversores #${inv.id}`
    if (inv.cliente_id) {
      obs += ` — cliente: ${clienteNome} (#${inv.cliente_id})`
    }
    if (!usinaIdAssociada) {
      obs += ' (sem usina vinculada direta)'
    }
    if (inv.potencia_kwp && inv.potencia_kwp > 0) {
      obs += ` • Potência: ${inv.potencia_kwp} kWp`
    }
    if (inv.app_nome) {
      obs += ` • Monitoramento: ${inv.app_nome}`
    }
    if (inv.observacoes?.trim()) {
      obs += ` • Obs original: ${inv.observacoes.trim()}`
    }

    aptosParaCriar.push({
      inversorId: inv.id,
      clienteId: inv.cliente_id,
      clienteNome,
      usinaId: usinaIdAssociada,
      usinaNome: usinaNomeAssociada,
      fabricante,
      modelo,
      numeroSerie: serieRaw || undefined,
      observacaoFormatada: obs,
    })
  }

  return {
    totalInversores: inversores.length,
    aptosParaCriar,
    jaImportados,
    foraPorFaltaDados,
  }
}

/**
 * Executa a cópia definitiva dos registros de cliente_inversores para a coleção ativos.
 * 100% aditivo: não toca, não altera e não deleta absolutamente nada em cliente_inversores.
 */
export async function executarCopiaInversores(
  usuarioId?: string,
): Promise<import('@/types/ativos').ResultadoExecucaoImportacao> {
  const analise = await analisarImportacaoInversores()

  let criados = 0
  const erros: { id: string; erro: string }[] = []

  for (const item of analise.aptosParaCriar) {
    try {
      const payload: Record<string, any> = {
        usina_id: item.usinaId || null,
        tipo: 'inversor',
        fabricante: item.fabricante,
        modelo: item.modelo,
        numero_serie: item.numeroSerie || '',
        observacoes: item.observacaoFormatada,
        status_operacional: 'operacional',
        chave_importacao: `cliente_inversores:${item.inversorId}`,
        cliente_inversor_id: item.inversorId,
        responsavel_id: usuarioId || null,
      }

      await pb.collection('ativos').create(payload)
      criados++
    } catch (err: any) {
      console.error(`Erro ao copiar inversor ${item.inversorId}:`, err)
      erros.push({
        id: item.inversorId,
        erro: err?.message || 'Falha ao criar registro de ativo',
      })
    }
  }

  return {
    criados,
    jaExistentes: analise.jaImportados.length,
    ignoradosPorFaltaDados: analise.foraPorFaltaDados.length,
    detalhesIgnorados: analise.foraPorFaltaDados,
    erros: erros.length > 0 ? erros : undefined,
  }
}

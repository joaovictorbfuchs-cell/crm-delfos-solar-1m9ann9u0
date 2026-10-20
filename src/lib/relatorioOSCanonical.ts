import type { OrdemServico, Cliente, Sistema, OSChecklistItem } from '@/types/crm'

export interface FotoRegistroRelatorio {
  id: string
  url: string
  titulo: string
  subtitulo: string
  descricao: string
  dataHora: string
  item_checklist_id?: string
  item_checklist_texto?: string
}

export interface GrupoFotosEtapaRelatorio {
  itemChecklistId?: string
  itemChecklistTexto: string
  fotos: FotoRegistroRelatorio[]
}

export interface ServicoExecutadoRelatorio {
  atividade: string
  descricaoCliente?: string
  localAtivo: string
  quantidade: string
  situacao: string
  evidencia: string
}

export interface ComponenteCondicaoRelatorio {
  componente: string
  abrangencia: string
  condicao: string
  evidencia: string
}

export interface RelatorioOSCanonicalData {
  // Identificação do documento
  numeroRelatorio: string // REL-{ano}-{num}
  osCodigo: string // #95SPBG ou #XXXXXX
  osIdReal: string
  revisao: string // 01
  dataEmissao: string // DD/MM/AAAA

  // Resumo do atendimento
  clienteNome: string
  clienteDoc: string
  clienteTelefone: string
  enderecoUsina: string
  dataAtendimento: string // DD/MM/AAAA
  horarioInicioTermino: string // ex: 13:30 às 14:42 (Duração: 01h12min)
  tipoServico: string // ex: Manutenção preventiva — Limpeza de módulos
  concessionariaUc: string // ex: RGE • UC: 4004280183
  dadosSistemaGerador: string // ex: Potência: 2,00 kWp • 5 módulos TSUN • Inversor Solis • Estrutura: Telhado cerâmico

  // Badges de status
  situacaoAtendimento: 'CONCLUÍDO' | 'EM ANDAMENTO'
  condicaoSistema: 'EM OPERAÇÃO' | 'EM AVALIAÇÃO' | 'PARALISADO'

  // Serviços executados
  servicosExecutados: ServicoExecutadoRelatorio[]

  // Detalhes da limpeza
  modulosPrevistosAtendidos: string
  metodoExecutado: string
  manualFabricante: string
  ressalvasObservadas: string

  // Condição do sistema por componente
  componentes: ComponenteCondicaoRelatorio[]

  // Registro fotográfico
  fotos: FotoRegistroRelatorio[]
  fotosPorEtapa?: GrupoFotosEtapaRelatorio[]
  fotosGeraisSemEtapa?: FotoRegistroRelatorio[]

  // Pendências e recomendações
  conformidadeTecnica: string
  proximaManutencao: string // DD/MM/AAAA (semestral +6 meses)
  pendenciasRecomendacoes?: string

  // Conclusão técnica
  conclusaoNarrativa: string
  conclusaoSituacao: string
  conclusaoCondicao: string
  conclusaoDesempenho: string

  // Próximos passos
  proximosPassosTexto: string
  temContratoOMAtivo?: boolean
  exibirPlanoOM?: boolean
  planoOmTitulo: string
  planoOmTexto: string
  planoOmContato: string

  // Recebimento do cliente
  formaEDataEnvio: string
  recebidoPor: string
}

/**
 * Normaliza e compila os dados reais da OS, Cliente e Sistema para o modelo canônico Delfos Solar.
 */
export interface CompilarDadosRelatorioOSOptions {
  clientePossuiContratoOMAtivo?: boolean
}

function safeStr(val: any): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

export function compilarDadosRelatorioOS(
  os: any,
  cliente: any,
  sistema: any,
  fotosDataUrls: string[] = [],
  opcoes?: CompilarDadosRelatorioOSOptions,
): RelatorioOSCanonicalData {
  const osId = String(os?.id || '')
  const osIdCurto = osId ? osId.slice(-6).toUpperCase() : '000000'
  const osCodigo = `#${osIdCurto}`

  // Ano de referência da emissão
  const dataRef = os?.concluida_em || os?.updated || os?.created || new Date().toISOString()
  const dObj = new Date(dataRef)
  const ano = isNaN(dObj.getFullYear()) ? new Date().getFullYear() : dObj.getFullYear()
  const numeroRelatorio = `REL-${ano}-${osIdCurto}`
  const revisao = '01'

  const hoje = new Date()
  const dataEmissao = hoje.toLocaleDateString('pt-BR')

  // Cliente
  const clienteNome =
    cliente?.nome || cliente?.razao_social || os?.cliente_nome || 'Cliente Delfos Solar'
  const clienteDoc = cliente?.cpf || cliente?.cnpj || ''
  const clienteTelefone = cliente?.whatsapp || cliente?.telefone || '(54) 99129-2121'

  // Endereço da usina
  const cidadeEstado = cliente?.cidade
    ? `${cliente.cidade}/${cliente.estado || 'RS'}`
    : sistema?.cidade
      ? `${sistema.cidade}/RS`
      : 'Erechim/RS'
  const enderecoBase =
    os?.endereco ||
    os?.endereco_uc ||
    sistema?.endereco ||
    cliente?.endereco ||
    'Rua Espírito Santo, 275'
  const enderecoUsina = enderecoBase.includes(cidadeEstado)
    ? enderecoBase
    : `${enderecoBase} – ${cidadeEstado}`

  // Data do atendimento e horários
  const dataAgendadaRaw = os?.data_agendada || os?.created
  let dataAtendimento = dataEmissao
  if (dataAgendadaRaw) {
    try {
      const d = new Date(dataAgendadaRaw)
      if (!isNaN(d.getTime())) {
        dataAtendimento = d.toLocaleDateString('pt-BR')
      }
    } catch {
      /* ignore */
    }
  }

  // Horários e duração
  let horarioInicio = '08:00'
  let horarioFim = '09:30'
  let duracaoStr = '01h30min'

  // Tenta extrair do texto detalhes_execucao se houver "[INÍCIO DO ATENDIMENTO: ...]"
  const detalhesRaw = String(os?.detalhes_execucao || os?.observacoes || os?.descricao || '')
  const matchInicio = detalhesRaw.match(/\[INÍCIO DO ATENDIMENTO:\s*([^\]]+)\]/i)

  if (matchInicio && matchInicio[1]) {
    const rawInicio = matchInicio[1].trim()
    const matchHora = rawInicio.match(/(\d{1,2}:\d{2})/)
    if (matchHora) {
      horarioInicio = matchHora[1]
    }
  } else if (os?.data_agendada) {
    try {
      const d = new Date(os.data_agendada)
      if (!isNaN(d.getTime())) {
        horarioInicio = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }
    } catch {
      /* ignore */
    }
  }

  if (os?.concluida_em) {
    try {
      const dFim = new Date(os.concluida_em)
      if (!isNaN(dFim.getTime())) {
        horarioFim = dFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        // Se houver data agendada para início, calcula a duração real
        if (os.data_agendada) {
          const dIni = new Date(os.data_agendada)
          const diffMs = Math.max(0, dFim.getTime() - dIni.getTime())
          const diffMinTotal = Math.floor(diffMs / 60000)
          const horas = Math.floor(diffMinTotal / 60)
          const minutos = diffMinTotal % 60
          duracaoStr = `${String(horas).padStart(2, '0')}h${String(minutos).padStart(2, '0')}min`
        }
      }
    } catch {
      /* ignore */
    }
  } else {
    horarioFim = '11:00'
    duracaoStr = '01h30min'
  }

  const horarioInicioTermino = `${horarioInicio} às ${horarioFim} (Duração: ${duracaoStr})`

  // Tipo de serviço
  const tipoServico =
    os?.tipo_servico ||
    (os?.tipo === 'limpeza'
      ? 'Manutenção preventiva — Limpeza de módulos'
      : os?.tipo === 'manutencao_preventiva'
        ? 'Manutenção preventiva técnica'
        : os?.tipo === 'manutencao_corretiva'
          ? 'Manutenção corretiva'
          : os?.titulo || 'Manutenção preventiva — Limpeza de módulos')

  // Concessionária & UC
  const concessionaria = sistema?.concessionaria || cliente?.concessionaria || 'RGE'
  const uc = sistema?.numero_uc || cliente?.uc || '4004280183'
  const concessionariaUc = `${concessionaria} • UC: ${uc}`

  // Dados do sistema gerador
  const potencia = sistema?.potencia_total_kwp || cliente?.potencia_kwp || '2,00'
  const potenciaFormatada =
    typeof potencia === 'number'
      ? potencia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : String(potencia).replace('.', ',')
  const qtdModulos = sistema?.quantidade_modulos || cliente?.placas_qtd || '5'
  const marcaModulos =
    sistema?.fabricante_modulos ||
    sistema?.marca_placas ||
    cliente?.marca_placas ||
    cliente?.fabricante_modulos ||
    'TSUN'
  const inversor =
    sistema?.fabricante_inversores || sistema?.inversor_marca || cliente?.inversor_marca || 'Solis'
  const tipoEstrutura = sistema?.tipo_telhado || cliente?.telhado_tipo || 'Telhado cerâmico'
  const estruturaFormatada = tipoEstrutura.toLowerCase().includes('solo')
    ? 'Solo'
    : tipoEstrutura.toLowerCase().includes('metal')
      ? 'Telhado metálico'
      : tipoEstrutura.toLowerCase().includes('fibrocimento')
        ? 'Fibrocimento'
        : 'Telhado cerâmico'

  const dadosSistemaGerador = `Potência: ${potenciaFormatada} kWp • ${qtdModulos} módulos ${marcaModulos} • Inversor ${inversor} • Estrutura: ${estruturaFormatada}`

  // Situação do atendimento e condição do sistema
  const isConcluida =
    os?.status === 'concluida' || os?.status === 'finalizada' || Boolean(os?.concluida)
  const situacaoAtendimento: 'CONCLUÍDO' | 'EM ANDAMENTO' = isConcluida
    ? 'CONCLUÍDO'
    : 'EM ANDAMENTO'
  const condicaoSistema: 'EM OPERAÇÃO' | 'EM AVALIAÇÃO' | 'PARALISADO' = isConcluida
    ? 'EM OPERAÇÃO'
    : 'EM AVALIAÇÃO'

  // Limpa o texto de detalhes
  const observacoesLimpas = detalhesRaw.replace(/\[INÍCIO DO ATENDIMENTO:[^\]]+\]\s*/gi, '').trim()

  // Metadados persistidos das fotos (vínculo com etapas do checklist)
  const fotosMetadadosRaw: any[] = Array.isArray(os?.fotos_metadados)
    ? os.fotos_metadados
    : typeof os?.fotos_metadados === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(os.fotos_metadados)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      : []

  // Checklist da OS
  let checklistItens: OSChecklistItem[] = []
  if (Array.isArray(os?.checklist)) {
    checklistItens = os.checklist
  } else if (typeof os?.checklist === 'string' && os.checklist.trim()) {
    try {
      const parsed = JSON.parse(os.checklist)
      if (Array.isArray(parsed)) checklistItens = parsed
    } catch {
      /* ignore */
    }
  }

  // Registro fotográfico: lista plana de fotos na mesma ordem em que aparecem no Registro Fotográfico
  const fotosUrls = fotosDataUrls || []
  const fotos: FotoRegistroRelatorio[] = []

  // Contadores para numeração sequencial dentro de cada atividade e fotos gerais
  const contagemPorEtapa = new Map<string, number>()
  let contadorGeralFotos = 0

  if (fotosUrls.length > 0) {
    fotosUrls.forEach((url, i) => {
      const meta = fotosMetadadosRaw[i] || {}
      const itemChecklistId = meta.item_checklist_id || undefined
      const itemChecklistTexto = meta.item_checklist_texto || undefined
      const legendaCustom = meta.legenda ? String(meta.legenda).trim() : ''
      const numeroGlobal = i + 1

      // Determinar a qual atividade do checklist este item se refere (índice 1-based)
      let atividadeNum: number | null = null
      if (itemChecklistId && checklistItens.length > 0) {
        const foundIdx = checklistItens.findIndex((chk) => chk.id === itemChecklistId)
        if (foundIdx >= 0) {
          atividadeNum = foundIdx + 1
        }
      }

      let titulo = `Foto ${numeroGlobal}`
      let subtitulo = itemChecklistTexto
        ? `Etapa: ${itemChecklistTexto}`
        : `Registro da OS ${osCodigo}`
      let desc =
        legendaCustom ||
        'Registro fotográfico das condições de campo durante a execução dos serviços.'

      if (atividadeNum !== null) {
        const chaveAtiv = itemChecklistId || `ativ-${atividadeNum}`
        const proxM = (contagemPorEtapa.get(chaveAtiv) || 0) + 1
        contagemPorEtapa.set(chaveAtiv, proxM)
        titulo = `Atividade ${atividadeNum} — Foto ${proxM}`
        subtitulo = itemChecklistTexto || `Atividade ${atividadeNum}`
      } else if (itemChecklistTexto) {
        const proxM = (contagemPorEtapa.get(itemChecklistTexto) || 0) + 1
        contagemPorEtapa.set(itemChecklistTexto, proxM)
        titulo = `${itemChecklistTexto} — Foto ${proxM}`
        subtitulo = itemChecklistTexto
      } else {
        contadorGeralFotos += 1
        titulo = `Foto ${contadorGeralFotos}`
        subtitulo = `Registro da OS ${osCodigo}`
      }

      const dataHoraStr = meta.data_hora
        ? new Date(meta.data_hora).toLocaleString('pt-BR', {
            dateStyle: 'short',
            timeStyle: 'short',
          }) + ' • Técnico executor'
        : `${dataAtendimento} às ${horarioInicio} • Técnico executor`

      fotos.push({
        id: meta.id || String(numeroGlobal),
        url,
        titulo,
        subtitulo,
        descricao: desc,
        dataHora: dataHoraStr,
        item_checklist_id: itemChecklistId,
        item_checklist_texto: itemChecklistTexto,
      })
    })
  } else {
    // 3 registros padrão com placeholder ilustrativo elegante
    fotos.push(
      {
        id: '1',
        url: '',
        titulo: 'Atividade 1 — Foto 1',
        subtitulo: `Módulos ${marcaModulos} (${estruturaFormatada})`,
        descricao: `Vista geral dos ${qtdModulos} módulos ${marcaModulos} antes do procedimento de manutenção. Presença de camada de poeira e sujidade superficial pré-intervenção.`,
        dataHora: `${dataAtendimento} às ${horarioInicio} • Técnico executor`,
        item_checklist_id: checklistItens[0]?.id,
        item_checklist_texto: checklistItens[0]?.item,
      },
      {
        id: '2',
        url: '',
        titulo: 'Atividade 1 — Foto 2',
        subtitulo: `Módulos ${marcaModulos} — Conclusão`,
        descricao:
          'Superfície dos módulos após lavagem e escovação técnica com cerdas macias e água limpa. Remoção completa de impurezas conforme manual técnico.',
        dataHora: `${dataAtendimento} às ${horarioFim} • Técnico executor`,
        item_checklist_id: checklistItens[0]?.id,
        item_checklist_texto: checklistItens[0]?.item,
      },
      {
        id: '3',
        url: '',
        titulo: 'Atividade 2 — Foto 1',
        subtitulo: 'Estrutura e Conexões MC4',
        descricao: `Inspeção detalhada de fixadores no ${estruturaFormatada.toLowerCase()} e integridade do chicote elétrico acessível do arranjo.`,
        dataHora: `${dataAtendimento} às ${horarioFim} • Técnico executor`,
        item_checklist_id: checklistItens[1]?.id,
        item_checklist_texto: checklistItens[1]?.item,
      },
    )
  }

  // Mapear números das fotos vinculadas para cada etapa (1-based no registro fotográfico geral)
  const formatarEvidenciaEtapa = (
    itemId?: string,
    fallbackEvidencia = 'Registro no checklist',
  ): string => {
    if (!itemId) return fallbackEvidencia
    const indicesFotos: number[] = []
    fotos.forEach((f, idx) => {
      if (f.item_checklist_id === itemId) {
        indicesFotos.push(idx + 1)
      }
    })
    if (indicesFotos.length === 0) {
      return 'Registro no checklist'
    }
    if (indicesFotos.length === 1) {
      return `Foto ${indicesFotos[0]}`
    }
    if (indicesFotos.length === 2) {
      return `Fotos ${indicesFotos[0]} e ${indicesFotos[1]}`
    }
    const ult = indicesFotos[indicesFotos.length - 1]
    const ant = indicesFotos.slice(0, -1).join(', ')
    return `Fotos ${ant} e ${ult}`
  }

  // Serviços executados: baseados no checklist da OS ou nos padrões do modelo
  let servicosExecutados: ServicoExecutadoRelatorio[] = []
  if (checklistItens.length > 0) {
    servicosExecutados = checklistItens.map((item) => {
      const text = item.item || ''
      const rawDescCliente =
        (item as any).descricao_cliente || (item as any).descricaoCliente || undefined
      const descCliente =
        rawDescCliente && String(rawDescCliente).trim() ? String(rawDescCliente).trim() : undefined
      const isLimpeza =
        text.toLowerCase().includes('limpeza') || text.toLowerCase().includes('lavagem')
      const isConectores =
        text.toLowerCase().includes('conector') ||
        text.toLowerCase().includes('fixador') ||
        text.toLowerCase().includes('estrutura')
      const isQuadro =
        text.toLowerCase().includes('quadro') ||
        text.toLowerCase().includes('disjuntor') ||
        text.toLowerCase().includes('aperto') ||
        text.toLowerCase().includes('inversor')

      let localAtivo = estruturaFormatada
      let qtd = `${qtdModulos} módulos`

      if (isQuadro) {
        localAtivo = 'Quadro DC/CA'
        qtd = '1 quadro'
      } else if (isConectores) {
        localAtivo = 'Estrutura de fixação'
        qtd = `${qtdModulos} módulos`
      } else if (isLimpeza) {
        localAtivo = estruturaFormatada
        qtd = `${qtdModulos} módulos`
      }

      const isConcluido = Boolean(item.concluido)

      return {
        // No relatório ao cliente, o descritivo para o cliente substitui a instrução interna quando preenchido
        atividade: descCliente || text,
        descricaoCliente: descCliente,
        localAtivo,
        quantidade: qtd,
        situacao: isConcluido ? 'Executado' : 'Pendente',
        evidencia: formatarEvidenciaEtapa(item.id),
      }
    })
  }

  // Se não houver itens cadastrados no checklist da OS, preenche com a tríade canônica do modelo
  if (servicosExecutados.length === 0) {
    servicosExecutados = [
      {
        atividade: 'Limpeza dos módulos',
        descricaoCliente:
          'Lavagem técnica dos módulos fotovoltaicos com água desmineralizada/filtrada e escova macia.',
        localAtivo: estruturaFormatada,
        quantidade: `${qtdModulos} módulos`,
        situacao: 'Executado',
        evidencia: formatarEvidenciaEtapa(undefined, 'Fotos 1 e 2'),
      },
      {
        atividade: 'Verificação de conectores MC4 e fixadores',
        descricaoCliente:
          'Inspeção mecânica dos pontos de fixação e integridade dos conectores elétricos da usina.',
        localAtivo: 'Estrutura de fixação',
        quantidade: `${qtdModulos} módulos`,
        situacao: 'Executado',
        evidencia: formatarEvidenciaEtapa(undefined, 'Foto 3'),
      },
      {
        atividade: 'Verificação de conexões e reaperto de disjuntores',
        descricaoCliente:
          'Reaperto preventivo de bornes, terminais e disjuntores do quadro de proteção.',
        localAtivo: 'Quadro DC/CA',
        quantidade: '1 quadro',
        situacao: 'Executado',
        evidencia: 'Registro no checklist',
      },
    ]
  }

  // Detalhes da limpeza
  const modulosPrevistosAtendidos = `${qtdModulos} / ${qtdModulos} módulos`
  const metodoExecutado = 'Escova macia e água (sem produtos abrasivos)'
  const manualFabricante = `Procedimento padrão ${marcaModulos} / ${inversor}`
  const ressalvasObservadas = 'Nenhuma sujidade remanescente identificada'

  const pendenciasRecomendacoes =
    typeof os?.pendencias_recomendacoes === 'string' &&
    os.pendencias_recomendacoes.trim().length > 0
      ? os.pendencias_recomendacoes.trim()
      : undefined

  // Condição do sistema por componente
  const componentes: ComponenteCondicaoRelatorio[] = [
    {
      componente: 'Módulos fotovoltaicos',
      abrangencia: 'Inspeção visual + limpeza',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Fotos 1–3',
    },
    {
      componente: 'Estruturas e fixações',
      abrangencia: 'Inspeção visual',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Foto 3',
    },
    {
      componente: 'Cabos e conectores acessíveis',
      abrangencia: 'Inspeção visual',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Foto 3',
    },
    {
      componente: 'Inversor e sinalizações',
      abrangencia: 'Verificação de status no display',
      condicao: 'Em operação no horário verificado',
      evidencia: 'Registro no checklist',
    },
    {
      componente: 'Proteções e aterramento',
      abrangencia: 'Inspeção visual dos disjuntores',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Registro no checklist',
    },
    {
      componente: 'Monitoramento e comunicação',
      abrangencia: 'Verificação no aplicativo',
      condicao: 'Comunicação ativa no horário verificado',
      evidencia: 'Registro no checklist',
    },
  ]

  // Agrupamento de fotos por etapa do checklist (mantido para compatibilidade onde necessário):
  const fotosPorEtapaMap = new Map<
    string,
    { itemChecklistId?: string; itemChecklistTexto: string; fotos: FotoRegistroRelatorio[] }
  >()
  const fotosGeraisSemEtapa: FotoRegistroRelatorio[] = []

  fotos.forEach((f) => {
    if (f.item_checklist_id || f.item_checklist_texto) {
      const chave = f.item_checklist_id || f.item_checklist_texto || 'etapa'
      const texto = f.item_checklist_texto || 'Etapa do Checklist'
      if (!fotosPorEtapaMap.has(chave)) {
        fotosPorEtapaMap.set(chave, {
          itemChecklistId: f.item_checklist_id,
          itemChecklistTexto: texto,
          fotos: [],
        })
      }
      fotosPorEtapaMap.get(chave)!.fotos.push(f)
    } else {
      fotosGeraisSemEtapa.push(f)
    }
  })

  const fotosPorEtapa: GrupoFotosEtapaRelatorio[] = Array.from(fotosPorEtapaMap.values())

  // Cálculo da próxima manutenção prevista (+6 meses)
  let proximaManutencao = '15/04/2027'
  try {
    const dManut = new Date(dataAgendadaRaw || Date.now())
    dManut.setMonth(dManut.getMonth() + 6)
    proximaManutencao = dManut.toLocaleDateString('pt-BR')
  } catch {
    /* ignore */
  }

  const conformidadeTecnica =
    'Não foram identificadas pendências no escopo verificado nesta visita.'

  // Conclusão técnica narrativa
  const conclusaoNarrativa = `Em ${dataAtendimento}, realizamos o atendimento de ${tipoServico.toLowerCase()} na unidade ${cidadeEstado}, conforme a OS ${osCodigo}. Foram executadas a limpeza integral dos ${qtdModulos} módulos, a verificação de conectores MC4 e fixadores e o reaperto das conexões do quadro, sem limitações. O resultado observado foi inversor em operação normal e comunicação de monitoramento ativa no horário verificado, conforme registros e fotos anexas. Não foram identificadas pendências no escopo verificado. Recomenda-se manter a próxima manutenção preventiva prevista para ${proximaManutencao}. Esta conclusão se restringe às atividades e verificações descritas neste relatório; o efeito da limpeza sobre a geração não foi quantificado neste atendimento.`

  // Próximos passos e Plano O&M
  const proximosPassosTexto =
    'Manter a rotina de acompanhamento garante que quedas de geração sejam identificadas e corrigidas antes de comprometerem sua economia.'
  const planoOmTitulo = 'Plano Delfos de Manutenção Preventiva & O&M'
  const planoOmTexto =
    'Proteja seu investimento: limpeza periódica, revisão técnica completa, verificação de conexões e estrutura, e atendimento ágil em Erechim e região — mantendo sua usina com geração máxima e segurança durante toda a vida útil do sistema.'
  const planoOmContato = 'Solicite uma avaliação: (54) 99129-2121 • solar@updates.delfos.eng.br'

  // Recebimento
  const formaEDataEnvio = `Enviado em ${dataEmissao} por WhatsApp / E-mail`
  const recebidoPor = '____________________________________'

  const clientePossuiContratoOMAtivo = opcoes?.clientePossuiContratoOMAtivo ?? false
  const exibirPlanoOM = !clientePossuiContratoOMAtivo

  return {
    numeroRelatorio,
    osCodigo,
    osIdReal: osId,
    revisao,
    dataEmissao,
    clienteNome,
    clienteDoc,
    clienteTelefone,
    enderecoUsina,
    dataAtendimento,
    horarioInicioTermino,
    tipoServico,
    concessionariaUc,
    dadosSistemaGerador,
    situacaoAtendimento,
    condicaoSistema,
    servicosExecutados,
    modulosPrevistosAtendidos,
    metodoExecutado,
    manualFabricante,
    ressalvasObservadas,
    componentes,
    fotos,
    fotosPorEtapa,
    fotosGeraisSemEtapa,
    conformidadeTecnica,
    proximaManutencao,
    pendenciasRecomendacoes,
    conclusaoNarrativa,
    conclusaoSituacao: 'Concluído',
    conclusaoCondicao: 'Em operação',
    conclusaoDesempenho: 'Não avaliado neste atendimento',
    proximosPassosTexto,
    temContratoOMAtivo: clientePossuiContratoOMAtivo,
    exibirPlanoOM,
    planoOmTitulo,
    planoOmTexto,
    planoOmContato,
    formaEDataEnvio,
    recebidoPor,
  }
}

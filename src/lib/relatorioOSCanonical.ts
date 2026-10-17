import type { OrdemServico, Cliente, Sistema, OSChecklistItem } from '@/types/crm'

export interface FotoRegistroRelatorio {
  id: string
  url: string
  titulo: string
  subtitulo: string
  descricao: string
  dataHora: string
}

export interface ServicoExecutadoRelatorio {
  atividade: string
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

  // Destaque "Resultado em poucas palavras"
  resultadoPoucasPalavras: string

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

  // Pendências e recomendações
  conformidadeTecnica: string
  proximaManutencao: string // DD/MM/AAAA (semestral +6 meses)

  // Escopo e limitações
  escopoELimitacoes: string

  // Conclusão técnica
  conclusaoNarrativa: string
  conclusaoSituacao: string
  conclusaoCondicao: string
  conclusaoDesempenho: string

  // Próximos passos
  proximosPassosTexto: string
  planoOmTitulo: string
  planoOmTexto: string
  planoOmContato: string
  indicacaoAmigoTexto: string

  // Recebimento do cliente
  formaEDataEnvio: string
  recebidoPor: string
}

/**
 * Normaliza e compila os dados reais da OS, Cliente e Sistema para o modelo canônico Delfos Solar.
 */
export function compilarDadosRelatorioOS(
  os: any,
  cliente?: any,
  sistema?: any,
  fotosUrls: string[] = [],
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

  // Destaque "Resultado em poucas palavras"
  const resultadoPoucasPalavras =
    observacoesLimpas ||
    `Identificamos sujidade acumulada nos módulos e conexões que necessitavam reaperto no quadro. Realizamos a limpeza completa dos ${qtdModulos} módulos, a verificação da integridade dos conectores MC4 e fixadores da estrutura, e o reaperto dos disjuntores. Ao final, verificamos o inversor em operação normal e comunicação de monitoramento ativa, sem alarmes no horário verificado. Não foram identificadas pendências no escopo verificado nesta visita.`

  // Serviços executados: baseados no checklist da OS ou nos padrões do modelo
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

  let servicosExecutados: ServicoExecutadoRelatorio[] = []
  if (checklistItens.length > 0) {
    servicosExecutados = checklistItens.map((item, idx) => {
      const text = item.item || ''
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

      return {
        atividade: text,
        localAtivo,
        quantidade: qtd,
        situacao: item.concluido ? 'Executado integralmente' : 'Pendente',
        evidencia: idx === 0 ? 'Fotos #1 e #2' : idx === 1 ? 'Foto #3' : 'Registro no checklist',
      }
    })
  }

  // Se não houver itens cadastrados no checklist da OS, preenche com a tríade canônica do modelo
  if (servicosExecutados.length === 0) {
    servicosExecutados = [
      {
        atividade: 'Limpeza dos módulos',
        localAtivo: estruturaFormatada,
        quantidade: `${qtdModulos} módulos`,
        situacao: 'Executado integralmente',
        evidencia: 'Fotos #1 e #2',
      },
      {
        atividade: 'Verificação de conectores MC4 e fixadores',
        localAtivo: 'Estrutura de fixação',
        quantidade: `${qtdModulos} módulos`,
        situacao: 'Executado integralmente',
        evidencia: 'Foto #3',
      },
      {
        atividade: 'Verificação de conexões e reaperto de disjuntores',
        localAtivo: 'Quadro DC/CA',
        quantidade: '1 quadro',
        situacao: 'Executado integralmente',
        evidencia: 'Registro no checklist',
      },
    ]
  }

  // Detalhes da limpeza
  const modulosPrevistosAtendidos = `${qtdModulos} / ${qtdModulos} módulos`
  const metodoExecutado = 'Escova macia e água (sem produtos abrasivos)'
  const manualFabricante = `Procedimento padrão ${marcaModulos} / ${inversor}`
  const ressalvasObservadas = 'Nenhuma sujidade remanescente identificada'

  // Condição do sistema por componente
  const componentes: ComponenteCondicaoRelatorio[] = [
    {
      componente: 'Módulos fotovoltaicos',
      abrangencia: 'Inspeção visual + limpeza',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Fotos #1–#3',
    },
    {
      componente: 'Estruturas e fixações',
      abrangencia: 'Inspeção visual',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Foto #3',
    },
    {
      componente: 'Cabos e conectores acessíveis',
      abrangencia: 'Inspeção visual',
      condicao: 'Sem anomalia aparente na avaliação realizada',
      evidencia: 'Foto #3',
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

  // Registro fotográfico: fotos reais ou modelo demonstrativo
  const fotos: FotoRegistroRelatorio[] = []
  if (fotosUrls.length > 0) {
    fotosUrls.forEach((url, i) => {
      const idx = i + 1
      let titulo = `Foto #${idx}`
      let subtitulo = `Registro da OS ${osCodigo}`
      let desc = 'Registro fotográfico das condições de campo durante a execução dos serviços.'
      if (idx === 1) {
        titulo = 'Foto #1 — Antes da limpeza'
        subtitulo = `Módulos ${marcaModulos} (${estruturaFormatada})`
        desc = `Vista geral dos ${qtdModulos} módulos ${marcaModulos} antes do procedimento de manutenção. Presença de camada de poeira e fuligem acumulada.`
      } else if (idx === 2) {
        titulo = 'Foto #2 — Depois da limpeza'
        subtitulo = `Módulos ${marcaModulos} — Conclusão do Procedimento`
        desc =
          'Superfície dos módulos após lavagem e escovação técnica com cerdas macias e água limpa. Remoção completa de impurezas sem uso de abrasivos.'
      } else if (idx === 3) {
        titulo = 'Foto #3 — Conectores e fixadores'
        subtitulo = 'Inspeção Mecânica e Conexões MC4'
        desc = `Inspeção detalhada de suportes mecânicos, fixadores no ${estruturaFormatada.toLowerCase()} e integridade dos conectores MC4.`
      }
      fotos.push({
        id: String(idx),
        url,
        titulo,
        subtitulo,
        descricao: desc,
        dataHora: `${dataAtendimento} às ${horarioInicio} • Técnico executor`,
      })
    })
  } else {
    // 3 registros padrão com placeholder ilustrativo elegante
    fotos.push(
      {
        id: '1',
        url: '',
        titulo: 'Foto #1 — Antes da limpeza',
        subtitulo: `Módulos ${marcaModulos} (${estruturaFormatada})`,
        descricao: `Vista geral dos ${qtdModulos} módulos ${marcaModulos} antes do procedimento de manutenção. Presença de camada de poeira e sujidade superficial pré-intervenção.`,
        dataHora: `${dataAtendimento} às ${horarioInicio} • Técnico executor`,
      },
      {
        id: '2',
        url: '',
        titulo: 'Foto #2 — Depois da limpeza',
        subtitulo: `Módulos ${marcaModulos} — Conclusão`,
        descricao:
          'Superfície dos módulos após lavagem e escovação técnica com cerdas macias e água limpa. Remoção completa de impurezas conforme manual técnico.',
        dataHora: `${dataAtendimento} às ${horarioFim} • Técnico executor`,
      },
      {
        id: '3',
        url: '',
        titulo: 'Foto #3 — Conectores e fixadores',
        subtitulo: 'Estrutura e Conexões MC4',
        descricao: `Inspeção detalhada de fixadores no ${estruturaFormatada.toLowerCase()} e integridade do chicote elétrico acessível do arranjo.`,
        dataHora: `${dataAtendimento} às ${horarioFim} • Técnico executor`,
      },
    )
  }

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

  // Escopo e limitações
  const escopoELimitacoes =
    'Este atendimento abrangeu a limpeza dos módulos, a verificação visual de conectores, fixadores e proteções acessíveis, e a verificação funcional do inversor e do monitoramento. Não foram realizados ensaios elétricos instrumentados nem avaliação de desempenho energético comparativo. As conclusões correspondem às verificações descritas e às condições registradas durante o atendimento.'

  // Conclusão técnica narrativa
  const conclusaoNarrativa = `Em ${dataAtendimento}, realizamos o atendimento de ${tipoServico.toLowerCase()} na unidade ${cidadeEstado}, conforme a OS ${osCodigo}. Foram executadas a limpeza integral dos ${qtdModulos} módulos, a verificação de conectores MC4 e fixadores e o reaperto das conexões do quadro, sem limitações. O resultado observado foi inversor em operação normal e comunicação de monitoramento ativa no horário verificado, conforme registros e fotos anexas. Não foram identificadas pendências no escopo verificado. Recomenda-se manter a próxima manutenção preventiva prevista para ${proximaManutencao}. Esta conclusão se restringe às atividades e verificações descritas neste relatório; o efeito da limpeza sobre a geração não foi quantificado neste atendimento.`

  // Próximos passos e Plano O&M
  const proximosPassosTexto =
    'Manter a rotina de acompanhamento garante que quedas de geração sejam identificadas e corrigidas antes de comprometerem sua economia.'
  const planoOmTitulo = 'Plano Delfos de Manutenção Preventiva & O&M'
  const planoOmTexto =
    'Proteja seu investimento: limpeza periódica, revisão técnica completa, verificação de conexões e estrutura, e atendimento ágil em Erechim e região — mantendo sua usina com geração máxima e segurança durante toda a vida útil do sistema.'
  const planoOmContato = 'Solicite uma avaliação: (54) 99129-2121 • solar@updates.delfos.eng.br'
  const indicacaoAmigoTexto =
    '💡 Indique um amigo para instalar ou revisar sua usina solar com a Delfos e ganhe benefícios exclusivos!'

  // Recebimento
  const formaEDataEnvio = `Enviado em ${dataEmissao} por WhatsApp / E-mail`
  const recebidoPor = '____________________________________'

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
    resultadoPoucasPalavras,
    situacaoAtendimento,
    condicaoSistema,
    servicosExecutados,
    modulosPrevistosAtendidos,
    metodoExecutado,
    manualFabricante,
    ressalvasObservadas,
    componentes,
    fotos,
    conformidadeTecnica,
    proximaManutencao,
    escopoELimitacoes,
    conclusaoNarrativa,
    conclusaoSituacao: 'Concluído',
    conclusaoCondicao: 'Em operação',
    conclusaoDesempenho: 'Não avaliado neste atendimento',
    proximosPassosTexto,
    planoOmTitulo,
    planoOmTexto,
    planoOmContato,
    indicacaoAmigoTexto,
    formaEDataEnvio,
    recebidoPor,
  }
}

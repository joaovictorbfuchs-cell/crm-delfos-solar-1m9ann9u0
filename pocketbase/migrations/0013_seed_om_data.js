migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const contratosCol = app.findCollectionByNameOrId('contratos_om')
    const anomaliasCol = app.findCollectionByNameOrId('anomalias_om')
    const servicosCol = app.findCollectionByNameOrId('servicos_adicionais_om')
    const timelineCol = app.findCollectionByNameOrId('timeline_om')
    const profCol = app.findCollectionByNameOrId('profissionais')

    // Obter técnicos conhecidos
    let tecManutencao = ''
    let tecLimpeza = ''
    let tecProjeto = ''
    try {
      const proList = app.findRecordsByFilter('profissionais', '', 'nome', 10, 0)
      for (const p of proList) {
        const esp = p.getString('especialidade')
        const nome = p.getString('nome')
        if (esp === 'Manutenção' && !tecManutencao) tecManutencao = nome
        if (esp === 'Limpeza' && !tecLimpeza) tecLimpeza = nome
        if (esp === 'Projeto Elétrico' && !tecProjeto) tecProjeto = nome
      }
    } catch (_) {}
    if (!tecManutencao) tecManutencao = 'Lucas Gabriel Zanin'
    if (!tecLimpeza) tecLimpeza = 'Diego Fernandes'
    if (!tecProjeto) tecProjeto = 'Eng. Mateus Fontana'

    // Dados dos 5 clientes para O&M
    // 1. Fernanda Ribeiro (Erechim, 8 kWp, Essencial, Vencendo em 30 dias ~22 dias restantes)
    // 2. Frigorífico Lima - Carlos Alberto Lima (Chapecó, 75 kWp, Completo, Ativo)
    // 3. Delfos Agroindustrial (Passo Fundo, 150 kWp, Completo, Ativo)
    // 4. Mercado Santos - Maria Santos (Erechim, 12 kWp, Prevenção, Ativo)
    // 5. João Pedro Oliveira (Passo Fundo, 5 kWp, Essencial, Vencido)

    const omConfigs = [
      {
        clienteId: 'qf2m39q1zax41m7', // Fernanda Ribeiro
        plano: 'Essencial',
        status: 'Vencendo em 30 dias',
        valorMensal: 250,
        valorAnual: 3000,
        dataInicio: '2025-04-01 10:00:00.000Z',
        dataVencimento: '2026-04-01 10:00:00.000Z',
        proximaData: '2026-03-20 14:00:00.000Z',
        proximaTitulo: 'Revisão preventiva anual e renovação contratual',
        servicosRealizados: [
          'Monitoramento da geração em horários comerciais',
          'Relatório mensal de desempenho',
          'Suporte técnico especializado',
          'Intermediação com a RGE',
          'Configuração e suporte remoto',
          'Inspeção preventiva anual',
          'Reaperto de conexões e grampos',
          'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
          'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
        ],
        servicosAgendados: [
          'Relatório mensal de desempenho',
          'Inspeção preventiva anual',
          'Reaperto de conexões e grampos',
        ],
        anomalias: [
          {
            codigo: 'ANO-2026-001',
            titulo: 'Queda de comunicação no datalogger Growatt',
            descricao:
              'Sinal Wi-Fi instável provocando falha no envio de leituras da geração horária.',
            etapa: 'Execução',
            status: 'Em execução',
            severidade: 'Média',
            dataAbertura: '2026-03-01 09:30:00.000Z',
            dataResolucao: '',
            tecnicoNome: tecManutencao,
            solucaoAdotada: 'Reconfiguração de IP estático e substituição da antena receptora.',
            valorFaturamento: 0,
          },
        ],
        adicionais: [
          {
            tipo: 'configuracao_datalogger',
            descricao: 'Reconfiguração avançada de datalogger com integração SolarView',
            valor: 280,
            status: 'faturado',
            data: '2025-11-14 15:00:00.000Z',
            tecnicoNome: tecManutencao,
          },
          {
            tipo: 'inspecao_termografica',
            descricao: 'Termografia aérea de módulos para renovação de seguro',
            valor: 450,
            status: 'pendente',
            data: '2026-03-25 10:00:00.000Z',
            tecnicoNome: tecProjeto,
          },
        ],
        timeline: [
          {
            tipo: 'relatorio',
            titulo: 'Relatório Mensal de Fevereiro/2026 emitido',
            descricao: 'Geração atingiu 104% do previsto (980 kWh vs 942 kWh meta).',
            data: '2026-03-02 11:00:00.000Z',
            autor: 'Sistema Delfos O&M',
            statusTag: 'Enviado',
          },
          {
            tipo: 'anomalia',
            titulo: 'Anomalia ANO-2026-001 registrada: Datalogger offline',
            descricao: 'Abertura do chamado pela telemetria após 4 horas sem telemetria.',
            data: '2026-03-01 09:30:00.000Z',
            autor: 'Lucas Gabriel Zanin',
            statusTag: 'Em execução',
          },
          {
            tipo: 'servico_plano',
            titulo: 'Limpeza de Placas Solares (1ª do ano)',
            descricao:
              'Lavagem com água desmineralizada nos 20 módulos. Ganho imediato de +7.4% de irradiação.',
            data: '2025-10-18 14:00:00.000Z',
            autor: tecLimpeza,
            statusTag: 'Concluído',
          },
          {
            tipo: 'interacao',
            titulo: 'Aviso de vencimento do plano enviado à cliente',
            descricao:
              'Contato preventivo para renovação anual do Plano Essencial com proposta de upgrade.',
            data: '2026-03-05 16:30:00.000Z',
            autor: 'João Silva',
            statusTag: 'Em negociação',
          },
        ],
      },
      {
        clienteId: 'vtszbseb345heif', // Frigorífico Lima - Carlos Alberto Lima
        plano: 'Completo',
        status: 'Ativo',
        valorMensal: 1450,
        valorAnual: 17400,
        dataInicio: '2025-08-01 10:00:00.000Z',
        dataVencimento: '2026-08-01 10:00:00.000Z',
        proximaData: '2026-03-18 09:00:00.000Z',
        proximaTitulo: 'Inspeção termográfica e reaperto de conexões em média tensão',
        servicosRealizados: [
          'Monitoramento da geração em horários comerciais',
          'Relatório mensal de desempenho',
          'Suporte técnico especializado',
          'Intermediação com a RGE',
          'Configuração e suporte remoto',
          'Inspeção preventiva anual',
          'Reaperto de conexões e grampos',
          'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
          'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
        ],
        servicosAgendados: [
          'Inspeção preventiva anual',
          'Reaperto de conexões e grampos',
          'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
          'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
        ],
        anomalias: [
          {
            codigo: 'ANO-2026-004',
            titulo: 'Ponto quente detectado na string 4 do inversor Huawei 75kW',
            descricao:
              'Aquecimento anômalo na caixa de junção da string 4 identificado no monitoramento de curvas I-V.',
            etapa: 'Diagnóstico In Loco',
            status: 'Em análise',
            severidade: 'Alta',
            dataAbertura: '2026-03-04 14:15:00.000Z',
            dataResolucao: '',
            tecnicoNome: tecProjeto,
            solucaoAdotada: 'Agendada substituição de conector MC4 oxidado e teste de isolamento.',
            valorFaturamento: 0,
          },
        ],
        adicionais: [
          {
            tipo: 'auditoria_faturamento',
            descricao:
              'Auditoria de faturamento tarifário do Frigorífico junto à Celesc e rateio de créditos',
            valor: 1200,
            status: 'faturado',
            data: '2026-01-20 10:00:00.000Z',
            tecnicoNome: tecProjeto,
          },
          {
            tipo: 'manutencao_ativos',
            descricao: 'Reaperto preventivo de quadros elétricos da subestação e barramentos',
            valor: 1800,
            status: 'em execução',
            data: '2026-03-18 09:00:00.000Z',
            tecnicoNome: tecManutencao,
          },
        ],
        timeline: [
          {
            tipo: 'anomalia',
            titulo: 'Anomalia ANO-2026-004 aberta: Ponto quente em string',
            descricao:
              'Telemetria acusou desvio de corrente > 12% na string 4 em horário de pico solar.',
            data: '2026-03-04 14:15:00.000Z',
            autor: 'Eng. Mateus Fontana',
            statusTag: 'Em análise',
          },
          {
            tipo: 'relatorio',
            titulo: 'Relatório Executivo Mensal de Fevereiro entregue',
            descricao:
              'Economia financeira de R$ 9.420,00 no mês com compensação líquida de 11.200 kWh.',
            data: '2026-03-01 15:30:00.000Z',
            autor: 'Sistema Delfos O&M',
            statusTag: 'Concluído',
          },
          {
            tipo: 'servico_plano',
            titulo: 'Inspeção preventiva semestral e reaperto mecânico',
            descricao: 'Revisados todos os 200 módulos na laje com torquímetro digital calibrado.',
            data: '2026-01-15 08:30:00.000Z',
            autor: tecManutencao,
            statusTag: 'Realizado',
          },
        ],
      },
      {
        clienteId: '82wz5urzbk1qkp4', // Empresa Delfos Agroindustrial
        plano: 'Completo',
        status: 'Ativo',
        valorMensal: 2800,
        valorAnual: 33600,
        dataInicio: '2025-05-15 10:00:00.000Z',
        dataVencimento: '2026-05-15 10:00:00.000Z',
        proximaData: '2026-03-22 08:30:00.000Z',
        proximaTitulo: 'Limpeza semestral de 340 placas em telhado de silos industriais',
        servicosRealizados: [
          'Monitoramento da geração em horários comerciais',
          'Relatório mensal de desempenho',
          'Suporte técnico especializado',
          'Intermediação com a RGE',
          'Configuração e suporte remoto',
          'Inspeção preventiva anual',
          'Reaperto de conexões e grampos',
          'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
          'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
        ],
        servicosAgendados: [
          'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
          'Relatório mensal de desempenho',
          'Inspeção preventiva anual',
        ],
        anomalias: [
          {
            codigo: 'ANO-2025-089',
            titulo: 'Superaquecimento em disjuntor de proteção CA do inversor SMA',
            descricao:
              'Disjuntor termomagnético operando a 68°C devido a sobrecorrente de transitório.',
            etapa: 'Faturamento',
            status: 'Resolvido',
            severidade: 'Crítica',
            dataAbertura: '2025-12-10 11:00:00.000Z',
            dataResolucao: '2025-12-12 17:00:00.000Z',
            tecnicoNome: tecManutencao,
            solucaoAdotada:
              'Substituição por disjuntor em caixa moldada e balanceamento das fases.',
            valorFaturamento: 1450,
          },
        ],
        adicionais: [
          {
            tipo: 'relatorio_seguradora',
            descricao:
              'Laudo pericial e relatório técnico de conformidade para seguradora Porto Seguro',
            valor: 950,
            status: 'faturado',
            data: '2025-11-05 14:00:00.000Z',
            tecnicoNome: tecProjeto,
          },
          {
            tipo: 'gestao_rateio',
            descricao:
              'Gestão de rateio de créditos de energia para 3 unidades consumidoras rurais',
            valor: 600,
            status: 'em execução',
            data: '2026-03-10 16:00:00.000Z',
            tecnicoNome: 'João Silva',
          },
        ],
        timeline: [
          {
            tipo: 'servico_adicional',
            titulo: 'Gestão de rateio mensal de créditos na RGE protocolada',
            descricao: 'Créditos de 18.500 kWh alocados entre pavilhão principal e silos 2 e 3.',
            data: '2026-03-08 10:00:00.000Z',
            autor: 'João Silva',
            statusTag: 'Faturado',
          },
          {
            tipo: 'relatorio',
            titulo: 'Relatório consolidado de safra emitido',
            descricao: 'Economia acumulada em 10 meses superou R$ 138.000,00.',
            data: '2026-03-01 09:00:00.000Z',
            autor: 'Sistema Delfos O&M',
            statusTag: 'Enviado',
          },
          {
            tipo: 'anomalia',
            titulo: 'Anomalia ANO-2025-089 concluída e faturada',
            descricao:
              'Troca de disjuntor validada com termografia sob carga máxima sem reincidência.',
            data: '2025-12-12 17:00:00.000Z',
            autor: tecManutencao,
            statusTag: 'Resolvido',
          },
        ],
      },
      {
        clienteId: 'pp4572amhvqgm81', // Mercado Santos - Maria Santos
        plano: 'Prevenção',
        status: 'Ativo',
        valorMensal: 450,
        valorAnual: 5400,
        dataInicio: '2025-09-10 10:00:00.000Z',
        dataVencimento: '2026-09-10 10:00:00.000Z',
        proximaData: '2026-03-28 13:30:00.000Z',
        proximaTitulo: 'Reaperto preventivo semestral de conectores e teste de isolação',
        servicosRealizados: [
          'Monitoramento da geração em horários comerciais',
          'Relatório mensal de desempenho',
          'Suporte técnico especializado',
          'Intermediação com a RGE',
          'Configuração e suporte remoto',
          'Inspeção preventiva anual',
          'Reaperto de conexões e grampos',
        ],
        servicosAgendados: [
          'Verificação de desempenho (pontos quentes, sombreamento, falhas)',
          'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
        ],
        anomalias: [
          {
            codigo: 'ANO-2026-002',
            titulo: 'Falha de aterramento intermitente no inversor Fronius Symo',
            descricao:
              'Erro de isolamento (código 509 Fronius) registrado nas manhãs de alta umidade.',
            etapa: 'Triagem Remota',
            status: 'Em análise',
            severidade: 'Média',
            dataAbertura: '2026-03-06 08:20:00.000Z',
            dataResolucao: '',
            tecnicoNome: tecManutencao,
            solucaoAdotada: 'Orientado cliente a aguardar teste com megôhmetro na visita técnica.',
            valorFaturamento: 0,
          },
        ],
        adicionais: [
          {
            tipo: 'testes_inversor',
            descricao: 'Teste de curva I-V e isolamento de aterramento com megôhmetro Fluke',
            valor: 350,
            status: 'pendente',
            data: '2026-03-28 13:30:00.000Z',
            tecnicoNome: tecManutencao,
          },
        ],
        timeline: [
          {
            tipo: 'anomalia',
            titulo: 'Anomalia ANO-2026-002 registrada',
            descricao: 'Alerta remoto via Solar.web: State Code 509 (R_ISO baixo).',
            data: '2026-03-06 08:20:00.000Z',
            autor: 'Lucas Gabriel Zanin',
            statusTag: 'Em análise',
          },
          {
            tipo: 'servico_plano',
            titulo: 'Relatório Mensal de Fevereiro enviado por WhatsApp',
            descricao:
              'Geração de 1.480 kWh. Economia estimada de R$ 1.250,00 na conta do mercado.',
            data: '2026-03-02 14:00:00.000Z',
            autor: 'João Silva',
            statusTag: 'Entregue',
          },
        ],
      },
      {
        clienteId: 'v339t6jz7wy93df', // João Pedro Oliveira (Passo Fundo)
        plano: 'Essencial',
        status: 'Vencido',
        valorMensal: 190,
        valorAnual: 2280,
        dataInicio: '2025-01-10 10:00:00.000Z',
        dataVencimento: '2026-01-10 10:00:00.000Z',
        proximaData: '2026-03-20 15:00:00.000Z',
        proximaTitulo: 'Reunião comercial para renovação do plano e reativação da telemetria',
        servicosRealizados: [
          'Monitoramento da geração em horários comerciais',
          'Relatório mensal de desempenho',
          'Suporte técnico especializado',
          'Configuração e suporte remoto',
        ],
        servicosAgendados: [
          'Inspeção preventiva anual',
          'Limpeza de placas solares (1x ou 2x ao ano, conforme o plano)',
        ],
        anomalias: [
          {
            codigo: 'ANO-2025-042',
            titulo: 'Sombreamento excessivo pós-crescimento de árvores vizinhas',
            descricao: 'Perda de ~18% de geração nas tardes de verão detectada no histórico.',
            etapa: 'Faturamento',
            status: 'Resolvido',
            severidade: 'Baixa',
            dataAbertura: '2025-11-02 10:00:00.000Z',
            dataResolucao: '2025-11-20 16:00:00.000Z',
            tecnicoNome: tecProjeto,
            solucaoAdotada: 'Recomendada poda com autorização municipal. Cliente realizou a poda.',
            valorFaturamento: 200,
          },
        ],
        adicionais: [
          {
            tipo: 'diagnostico_tecnico',
            descricao: 'Diagnóstico técnico presencial pós-queda de raio nas proximidades',
            valor: 320,
            status: 'faturado',
            data: '2025-10-12 11:00:00.000Z',
            tecnicoNome: tecManutencao,
          },
        ],
        timeline: [
          {
            tipo: 'interacao',
            titulo: 'Contrato Vencido - Notificação de encerramento temporário do monitoramento',
            descricao:
              'Enviado termo de renovação automática ou contratação de plano Prevenção com 10% de desconto.',
            data: '2026-01-15 10:00:00.000Z',
            autor: 'João Silva',
            statusTag: 'Vencido',
          },
          {
            tipo: 'relatorio',
            titulo: 'Último Relatório Anual consolidado entregue',
            descricao: 'Geração total de 5.890 kWh no ciclo de 12 meses.',
            data: '2026-01-10 14:00:00.000Z',
            autor: 'Sistema Delfos O&M',
            statusTag: 'Finalizado',
          },
          {
            tipo: 'anomalia',
            titulo: 'Anomalia ANO-2025-042 resolvida',
            descricao: 'Poda de galhos liberou incidência solar total a partir das 14h.',
            data: '2025-11-20 16:00:00.000Z',
            autor: tecProjeto,
            statusTag: 'Resolvido',
          },
        ],
      },
    ]

    for (const item of omConfigs) {
      // 1. Atualizar produto do cliente para 'Plano de O&M' se já não for
      try {
        const clienteRecord = app.findFirstRecordByData('clientes', 'id', item.clienteId)
        clienteRecord.set('produto', 'Plano de O&M')
        app.save(clienteRecord)
      } catch (_) {}

      // 2. Criar ou atualizar contratos_om
      let contratoRec
      try {
        contratoRec = app.findFirstRecordByData('contratos_om', 'cliente_id', item.clienteId)
      } catch (_) {
        contratoRec = new Record(contratosCol)
      }

      contratoRec.set('cliente_id', item.clienteId)
      contratoRec.set('plano', item.plano)
      contratoRec.set('status', item.status)
      contratoRec.set('valor_mensal', item.valorMensal)
      contratoRec.set('valor_anual', item.valorAnual)
      contratoRec.set('data_inicio', item.dataInicio)
      contratoRec.set('data_vencimento', item.dataVencimento)
      contratoRec.set('proxima_atividade_data', item.proximaData)
      contratoRec.set('proxima_atividade_titulo', item.proximaTitulo)
      contratoRec.set('servicos_realizados', item.servicosRealizados)
      contratoRec.set('servicos_agendados', item.servicosAgendados)
      contratoRec.set(
        'observacoes',
        `Plano contratado ${item.plano}. Atendimento técnico regional Delfos Solar.`,
      )
      app.save(contratoRec)

      const contratoId = contratoRec.id

      // 3. Cadastrar anomalias
      for (const anom of item.anomalias) {
        let anomRec
        try {
          anomRec = app.findFirstRecordByData('anomalias_om', 'codigo', anom.codigo)
        } catch (_) {
          anomRec = new Record(anomaliasCol)
        }
        anomRec.set('contrato_id', contratoId)
        anomRec.set('cliente_id', item.clienteId)
        anomRec.set('codigo', anom.codigo)
        anomRec.set('titulo', anom.titulo)
        anomRec.set('descricao', anom.descricao)
        anomRec.set('etapa', anom.etapa)
        anomRec.set('status', anom.status)
        anomRec.set('severidade', anom.severidade)
        anomRec.set('data_abertura', anom.dataAbertura)
        if (anom.dataResolucao) anomRec.set('data_resolucao', anom.dataResolucao)
        anomRec.set('tecnico_nome', anom.tecnicoNome)
        anomRec.set('solucao_adotada', anom.solucaoAdotada)
        anomRec.set('valor_faturamento', anom.valorFaturamento)
        app.save(anomRec)
      }

      // 4. Cadastrar serviços adicionais
      for (const adic of item.adicionais) {
        const adicRec = new Record(servicosCol)
        adicRec.set('contrato_id', contratoId)
        adicRec.set('cliente_id', item.clienteId)
        adicRec.set('tipo', adic.tipo)
        adicRec.set('descricao', adic.descricao)
        adicRec.set('valor', adic.valor)
        adicRec.set('status', adic.status)
        adicRec.set('data', adic.data)
        adicRec.set('tecnico_nome', adic.tecnicoNome)
        app.save(adicRec)
      }

      // 5. Cadastrar timeline_om
      for (const time of item.timeline) {
        const timeRec = new Record(timelineCol)
        timeRec.set('contrato_id', contratoId)
        timeRec.set('cliente_id', item.clienteId)
        timeRec.set('tipo', time.tipo)
        timeRec.set('titulo', time.titulo)
        timeRec.set('descricao', time.descricao)
        timeRec.set('data', time.data)
        timeRec.set('autor', time.autor)
        timeRec.set('status_tag', time.statusTag)
        app.save(timeRec)
      }
    }
  },
  (app) => {
    // Reverter seed
    try {
      app.db().newQuery('DELETE FROM timeline_om').execute()
      app.db().newQuery('DELETE FROM servicos_adicionais_om').execute()
      app.db().newQuery('DELETE FROM anomalias_om').execute()
      app.db().newQuery('DELETE FROM contratos_om').execute()
    } catch (_) {}
  },
)

migrate(
  (app) => {
    const colContratos = app.findCollectionByNameOrId('contratos_om')
    const colClientes = app.findCollectionByNameOrId('clientes')

    // 1. Adicionar campos complementares em contratos_om se ainda não existirem
    const camposParaAdicionar = [
      { name: 'tipo_proxima_atividade', type: 'text' },
      { name: 'data_ultima_atividade', type: 'date' },
      { name: 'tipo_ultima_atividade', type: 'text' },
      { name: 'performance_usina', type: 'text' }, // 'acima_meta', 'na_meta', 'abaixo_meta', 'sem_monitoramento'
      { name: 'potencia_kwp', type: 'number' },
      { name: 'qtd_modulos', type: 'number' },
      { name: 'area_telhado_m2', type: 'number' },
      { name: 'dias_desde_ultima_atividade', type: 'number' },
    ]

    for (const f of camposParaAdicionar) {
      if (!colContratos.fields.getByName(f.name)) {
        if (f.type === 'text') {
          colContratos.fields.add(new TextField({ name: f.name }))
        } else if (f.type === 'number') {
          colContratos.fields.add(new NumberField({ name: f.name }))
        } else if (f.type === 'date') {
          colContratos.fields.add(new DateField({ name: f.name }))
        }
      }
    }
    app.save(colContratos)

    // 2. Localizar ou ajustar o cliente Geison Rigo
    let geisonCliente = null
    try {
      geisonCliente = app.findFirstRecordByData('clientes', 'nome', 'Geison Rigo')
    } catch (_) {
      try {
        geisonCliente = app.findFirstRecordByData('clientes', 'nome', 'Geison Luis Rigo')
      } catch (_) {}
    }

    if (!geisonCliente) {
      geisonCliente = new Record(colClientes)
      geisonCliente.set('nome', 'Geison Rigo')
      geisonCliente.set('cidade', 'Erechim')
      geisonCliente.set('estado', 'RS')
      geisonCliente.set('status', 'Fechado')
      geisonCliente.set('potencia_kwp', 3.75)
      geisonCliente.set('placas_qtd', 6)
      geisonCliente.set('produto', 'Plano de O&M')
      geisonCliente.set('transferido_pos_vendas', true)
      app.save(geisonCliente)
    } else {
      geisonCliente.set('potencia_kwp', 3.75)
      geisonCliente.set('placas_qtd', 6)
      app.save(geisonCliente)
    }

    // Criar ou atualizar contrato O&M do Geison Rigo:
    // 6 módulos, 3,75 kWp, próxima lavagem em 25/09/2026, ativo
    let geisonContrato = null
    try {
      geisonContrato = app.findFirstRecordByData('contratos_om', 'cliente_id', geisonCliente.id)
    } catch (_) {}

    if (!geisonContrato) {
      geisonContrato = new Record(colContratos)
      geisonContrato.set('cliente_id', geisonCliente.id)
      geisonContrato.set('numero_contrato', 'OM-1001')
    }
    geisonContrato.set('plano', 'Essencial')
    geisonContrato.set('status', 'Ativo')
    geisonContrato.set('valor_mensal', 119.0)
    geisonContrato.set('valor_anual', 1428.0)
    geisonContrato.set('data_inicio', '2026-01-10 12:00:00.000Z')
    geisonContrato.set('data_vencimento', '2027-08-10 12:00:00.000Z')
    geisonContrato.set('proxima_atividade_data', '2026-09-25 09:00:00.000Z')
    geisonContrato.set('proxima_atividade_titulo', 'Lavagem semestral de módulos solares')
    geisonContrato.set('tipo_proxima_atividade', 'Lavagem')
    geisonContrato.set('data_ultima_atividade', '2026-06-15 10:00:00.000Z')
    geisonContrato.set('tipo_ultima_atividade', 'Inspeção')
    geisonContrato.set('performance_usina', 'na_meta')
    geisonContrato.set('potencia_kwp', 3.75)
    geisonContrato.set('qtd_modulos', 6)
    geisonContrato.set('area_telhado_m2', 15.5)
    geisonContrato.set('dias_desde_ultima_atividade', 45)
    geisonContrato.set(
      'observacoes',
      'Contrato O&M ativo Geison Rigo - 6 módulos, 3.75 kWp, telhado cerâmico.',
    )
    app.save(geisonContrato)

    // 3. Garantir 50 contratos ativos no total, com os requisitos exatos:
    // • 8 com lavagem agendada esta semana (entre 21/09/2026 e 27/09/2026)
    // • 3 atrasados (data_vencimento no passado ou atividade atrasada / status Vencido)
    // • 2 próximos do vencimento (30 dias)
    // • Variação de tipos de atividade: Lavagem, Inspeção, Troca de componente, Auto leitura, Relatório de performance, Visita técnica
    // • Variação de performance: Acima da meta, Na meta, Abaixo da meta, Sem monitoramento
    // • Variação de tempo desde a última atividade: Menos de 30 dias, 30-60 dias, 60-90 dias, Mais de 90 dias

    const contratosAtivosExistentes = app.findRecordsByFilter(
      'contratos_om',
      "status != 'Cancelado' && status != 'Encerrado'",
      'data_inicio',
      100,
      0,
    )

    // Atualizar contratos existentes enriquecendo com dados de atividades, performance, módulos e telhado
    const tiposAtividade = [
      'Lavagem',
      'Inspeção',
      'Troca de componente',
      'Auto leitura',
      'Relatório de performance',
      'Visita técnica',
    ]

    const performances = ['acima_meta', 'na_meta', 'abaixo_meta', 'sem_monitoramento']

    // Preparar lista de 8 contratos que terão lavagem nesta semana (21 a 27 de setembro de 2026)
    // Dias da semana: 21, 22, 23, 24, 25 (Geison), 26, 27
    const datasLavagemEstaSemana = [
      '2026-09-22 08:30:00.000Z',
      '2026-09-23 09:00:00.000Z',
      '2026-09-23 14:00:00.000Z',
      '2026-09-24 10:00:00.000Z',
      '2026-09-24 15:30:00.000Z',
      '2026-09-25 09:00:00.000Z', // Geison
      '2026-09-25 14:00:00.000Z',
      '2026-09-26 09:30:00.000Z',
    ]

    let countLavagemSemana = 1 // Geison já é 1
    let countProximosVencimento = 0
    let countAtrasados = 0

    // Atualizar contratos existentes para garantir preenchimento consistente
    for (let i = 0; i < contratosAtivosExistentes.length; i++) {
      const c = contratosAtivosExistentes[i]
      if (c.id === geisonContrato.id) continue

      // Buscar cliente vinculado
      let cli = null
      try {
        cli = app.findCollectionByNameOrId('clientes')
        cli = app.findFirstRecordByData('clientes', 'id', c.getString('cliente_id'))
      } catch (_) {}

      const potCli = cli ? Number(cli.get('potencia_kwp')) || 0 : 0
      const potFinal = potCli > 0 ? potCli : Number((3.5 + (i % 15) * 1.5).toFixed(2))
      const modulosFinal = Math.max(4, Math.round(potFinal / 0.55))
      const areaTelhado = Number((modulosFinal * 2.1).toFixed(1))

      // Atribuir campos adicionais
      c.set('potencia_kwp', potFinal)
      c.set('qtd_modulos', modulosFinal)
      c.set('area_telhado_m2', areaTelhado)

      // Garantir 8 com lavagem agendada esta semana
      if (countLavagemSemana < 8) {
        c.set('tipo_proxima_atividade', 'Lavagem')
        c.set('proxima_atividade_titulo', 'Lavagem e desobstrução de painéis solares')
        c.set('proxima_atividade_data', datasLavagemEstaSemana[countLavagemSemana])
        c.set('status', 'Ativo')
        c.set('performance_usina', i % 2 === 0 ? 'na_meta' : 'acima_meta')
        c.set('data_ultima_atividade', '2026-07-10 10:00:00.000Z')
        c.set('tipo_ultima_atividade', 'Inspeção')
        c.set('dias_desde_ultima_atividade', 70)
        countLavagemSemana++
        app.save(c)
        continue
      }

      // Garantir 2 próximos do vencimento (30 dias)
      if (countProximosVencimento < 2 && c.getString('status') !== 'Vencido') {
        c.set('status', 'Vencendo em 30 dias')
        c.set('data_vencimento', '2026-10-15 12:00:00.000Z')
        c.set('tipo_proxima_atividade', 'Relatório de performance')
        c.set('proxima_atividade_titulo', 'Emissão do relatório anual para renovação')
        c.set('proxima_atividade_data', '2026-10-05 10:00:00.000Z')
        c.set('performance_usina', 'na_meta')
        c.set('data_ultima_atividade', '2026-08-20 14:00:00.000Z')
        c.set('tipo_ultima_atividade', 'Relatório de performance')
        c.set('dias_desde_ultima_atividade', 28)
        countProximosVencimento++
        app.save(c)
        continue
      }

      // Garantir 3 atrasados
      if (countAtrasados < 3) {
        c.set('status', 'Vencido')
        c.set('data_vencimento', '2026-08-30 12:00:00.000Z')
        c.set('tipo_proxima_atividade', 'Inspeção')
        c.set('proxima_atividade_titulo', 'Inspeção termográfica e reaperto elétrico pendente')
        c.set('proxima_atividade_data', '2026-09-05 14:00:00.000Z') // data no passado = atrasada
        c.set('performance_usina', 'abaixo_meta')
        c.set('data_ultima_atividade', '2026-05-10 09:00:00.000Z')
        c.set('tipo_ultima_atividade', 'Visita técnica')
        c.set('dias_desde_ultima_atividade', 130)
        countAtrasados++
        app.save(c)
        continue
      }

      // Demais contratos normais distribuídos
      const tipoAtiv = tiposAtividade[i % tiposAtividade.length]
      const perf = performances[i % performances.length]
      const diasUlt = [15, 45, 75, 110][i % 4]

      c.set('tipo_proxima_atividade', tipoAtiv)
      c.set('proxima_atividade_titulo', `${tipoAtiv} programada O&M`)
      // Próximas datas distribuídas em outubro/novembro 2026
      const diaProx = 1 + (i % 28)
      const mesProx = i % 2 === 0 ? '10' : '11'
      c.set(
        'proxima_atividade_data',
        `2026-${mesProx}-${String(diaProx).padStart(2, '0')} 10:00:00.000Z`,
      )
      c.set('performance_usina', perf)
      c.set('data_vencimento', '2027-08-10 12:00:00.000Z')
      c.set('dias_desde_ultima_atividade', diasUlt)
      c.set('tipo_ultima_atividade', tiposAtividade[(i + 1) % tiposAtividade.length])

      if (c.getString('status') !== 'Vencendo em 30 dias' && c.getString('status') !== 'Vencido') {
        c.set('status', 'Ativo')
      }

      app.save(c)
    }

    // 4. Se a quantidade total de contratos ativos for inferior a 50, criar contratos complementares
    // com clientes adicionais para atingir a meta dos 50 planos O&M ativos
    const totalContratosAgora = app.findRecordsByFilter(
      'contratos_om',
      '',
      '-created',
      100,
      0,
    ).length
    const faltam = 55 - totalContratosAgora

    if (faltam > 0) {
      const cidades = [
        'Erechim',
        'Getúlio Vargas',
        'Barão de Cotegipe',
        'Passo Fundo',
        'Marau',
        'Sertão',
      ]
      const nomesExemplo = [
        'Cooperativa Agroindustrial Alfa Solar',
        'Metalúrgica Progresso RS',
        'Posto Combustíveis Bela Vista',
        'Hospital São Vicente Painéis',
        'Hotel Fazenda Pinheiros',
        'Distribuidora Aurora Alimentos',
        'Auto Posto Trevo Norte',
        'Laticínios Vale Verde',
        'Serraria e Madeiras Gaúcha',
        'Indústria Gráfica Sul',
        'Supermercado Econômico',
        'Moinho de Trigo Planalto',
        'Transportadora TransVale',
        'Centro Automotivo Speed',
        'Vinícola Serra dos Ventos',
        'Restaurante Famiglia Bella',
        'Fábrica de Móveis Nobre',
        'Laboratório Santa Clara',
        'Cerâmica Barro Vermelho',
        'Agropecuária Terra Boa',
      ]

      for (let j = 0; j < faltam && j < nomesExemplo.length; j++) {
        const nomeCli = nomesExemplo[j]
        let cRecord = null
        try {
          cRecord = app.findFirstRecordByData('clientes', 'nome', nomeCli)
        } catch (_) {
          cRecord = new Record(colClientes)
          cRecord.set('nome', nomeCli)
          cRecord.set('cidade', cidades[j % cidades.length])
          cRecord.set('estado', 'RS')
          cRecord.set('status', 'Fechado')
          cRecord.set('produto', 'Plano de O&M')
          cRecord.set('transferido_pos_vendas', true)
          const pKwp = Number((5.5 + (j % 8) * 3.2).toFixed(2))
          cRecord.set('potencia_kwp', pKwp)
          cRecord.set('placas_qtd', Math.round(pKwp / 0.55))
          app.save(cRecord)
        }

        const potVal = Number(cRecord.get('potencia_kwp')) || 8.8
        const qtdMod = Number(cRecord.get('placas_qtd')) || Math.round(potVal / 0.55)
        const areaEst = Number((qtdMod * 2.1).toFixed(1))
        const tipoAtiv = tiposAtividade[j % tiposAtividade.length]
        const perf = performances[j % performances.length]

        const novoContrato = new Record(colContratos)
        novoContrato.set('cliente_id', cRecord.id)
        novoContrato.set('numero_contrato', `OM-${2000 + j}`)
        novoContrato.set(
          'plano',
          j % 3 === 0 ? 'Completo' : j % 2 === 0 ? 'Prevenção' : 'Essencial',
        )
        novoContrato.set('status', 'Ativo')
        novoContrato.set('valor_mensal', Number((120 + (j % 5) * 50).toFixed(2)))
        novoContrato.set('valor_anual', Number(((120 + (j % 5) * 50) * 12).toFixed(2)))
        novoContrato.set('data_inicio', '2026-03-01 12:00:00.000Z')
        novoContrato.set('data_vencimento', '2027-08-01 12:00:00.000Z')
        novoContrato.set(
          'proxima_atividade_data',
          `2026-10-${String(10 + (j % 18)).padStart(2, '0')} 10:00:00.000Z`,
        )
        novoContrato.set('proxima_atividade_titulo', `${tipoAtiv} preventiva programada`)
        novoContrato.set('tipo_proxima_atividade', tipoAtiv)
        novoContrato.set('data_ultima_atividade', '2026-07-15 14:00:00.000Z')
        novoContrato.set('tipo_ultima_atividade', 'Inspeção')
        novoContrato.set('performance_usina', perf)
        novoContrato.set('potencia_kwp', potVal)
        novoContrato.set('qtd_modulos', qtdMod)
        novoContrato.set('area_telhado_m2', areaEst)
        novoContrato.set('dias_desde_ultima_atividade', 35 + (j % 4) * 20)
        novoContrato.set(
          'observacoes',
          `Contrato O&M semeado automaticamente para cobertura completa.`,
        )
        app.save(novoContrato)
      }
    }
  },
  (app) => {
    // Reversão segura se necessário
  },
)

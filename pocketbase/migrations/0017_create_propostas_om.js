migrate(
  (app) => {
    const clientesColId = app.findCollectionByNameOrId('clientes').id

    // 1. Criar coleção propostas_om
    const propostasOm = new Collection({
      name: 'propostas_om',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesColId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'plano_escolhido',
          type: 'select',
          required: true,
          values: ['Essencial', 'Prevenção', 'Completo'],
          maxSelect: 1,
        },
        // Parâmetros técnicos & informados
        { name: 'potencia_kwp', type: 'number', required: true },
        { name: 'geracao_mensal_kwh', type: 'number', required: true },
        { name: 'marca_inversores', type: 'text' },
        { name: 'tipo_instalacao', type: 'text' }, // "Telhado metálico", "Solo", etc.
        { name: 'numero_modulos', type: 'number' },
        { name: 'valor_kwh', type: 'number', required: true },
        { name: 'distancia_km', type: 'number' },
        { name: 'valor_km', type: 'number' },
        // Valores calculados
        { name: 'valor_ativo_protegido', type: 'number', required: true },
        { name: 'perda_15_ano', type: 'number', required: true },
        { name: 'perda_20_ano', type: 'number', required: true },
        { name: 'prejuizo_20_dias', type: 'number', required: true },
        { name: 'prejuizo_30_dias', type: 'number', required: true },
        { name: 'valor_mensal_plano', type: 'number', required: true },
        { name: 'valor_anual_plano', type: 'number', required: true },
        // Metadados
        { name: 'data_proposta', type: 'date', required: true },
        { name: 'autor', type: 'text' },
        { name: 'status', type: 'text' }, // "Proposta Enviada", etc.
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_propostas_om_cliente ON propostas_om (cliente_id)',
        'CREATE INDEX idx_propostas_om_plano ON propostas_om (plano_escolhido)',
        'CREATE INDEX idx_propostas_om_data ON propostas_om (data_proposta)',
      ],
    })
    app.save(propostasOm)

    // 2. Semear pelo menos 2 propostas de exemplo vinculadas a clientes existentes
    // Cliente 1: Carlos Alberto Lima (Frigorífico Lima) -> Plano Completo
    // Cliente 2: Maria Santos (Mercado Santos) -> Plano Prevenção
    let clienteCompletoId = ''
    let clientePrevencaoId = ''

    try {
      clienteCompletoId = app.findFirstRecordByData('clientes', 'nome', 'Carlos Alberto Lima').id
    } catch (_) {
      try {
        const c = app.findRecordsByFilter('clientes', '', '-created', 1, 0)
        if (c.length > 0) clienteCompletoId = c[0].id
      } catch (_) {}
    }

    try {
      clientePrevencaoId = app.findFirstRecordByData('clientes', 'nome', 'Maria Santos').id
    } catch (_) {
      try {
        const c = app.findRecordsByFilter('clientes', '', 'created', 1, 0)
        if (c.length > 0) clientePrevencaoId = c[0].id
      } catch (_) {}
    }

    const propostasCol = app.findCollectionByNameOrId('propostas_om')
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const timelineOmCol = app.findCollectionByNameOrId('timeline_om')

    // Proposta 1: Plano Completo para Frigorífico Lima
    if (clienteCompletoId) {
      try {
        const p1 = new Record(propostasCol)
        p1.set('cliente_id', clienteCompletoId)
        p1.set('plano_escolhido', 'Completo')
        p1.set('potencia_kwp', 75.0)
        p1.set('geracao_mensal_kwh', 9750)
        p1.set('marca_inversores', 'Huawei SUN2000-75KTL-M3')
        p1.set('tipo_instalacao', 'Telhado Laje')
        p1.set('numero_modulos', 200)
        p1.set('valor_kwh', 0.92)
        p1.set('distancia_km', 45)
        p1.set('valor_km', 2.5)
        // Cálculos
        const ativo1 = 9750 * 0.92 // 8970.00
        p1.set('valor_ativo_protegido', ativo1)
        p1.set('perda_15_ano', ativo1 * 12 * 0.15) // 16146.00
        p1.set('perda_20_ano', ativo1 * 12 * 0.2) // 21528.00
        p1.set('prejuizo_20_dias', (ativo1 * 20) / 30) // 5980.00
        p1.set('prejuizo_30_dias', ativo1) // 8970.00
        p1.set('valor_mensal_plano', 99.9)
        p1.set('valor_anual_plano', 99.9 * 12) // 1198.80
        p1.set('data_proposta', '2026-03-02 10:30:00.000Z')
        p1.set('autor', 'Eng. Mateus Fontana')
        p1.set('status', 'Proposta Enviada')
        p1.set(
          'observacoes',
          'Proposta apresentada com destaque para o Plano Completo com 2 limpezas anuais e suporte ilimitado.',
        )
        app.save(p1)

        // Adicionar na timeline de atividades
        const atv1 = new Record(atividadesCol)
        atv1.set('cliente_id', clienteCompletoId)
        atv1.set('tipo', 'proposta')
        atv1.set('titulo', 'Proposta O&M Gerada: Plano Completo')
        atv1.set(
          'descricao',
          'Proposta de Gestão e Manutenção O&M gerada para usina de 75.0 kWp. Plano Completo (R$ 99,90/mês — R$ 1.198,80/ano). Ativo protegido de R$ 8.970,00/mês.',
        )
        atv1.set('data', '2026-03-02 10:30:00.000Z')
        atv1.set('status', 'concluida')
        atv1.set('autor', 'Eng. Mateus Fontana')
        app.save(atv1)

        // Adicionar na timeline O&M
        const time1 = new Record(timelineOmCol)
        time1.set('cliente_id', clienteCompletoId)
        time1.set('tipo', 'interacao')
        time1.set('titulo', 'Proposta O&M: Plano Completo Emitida')
        time1.set(
          'descricao',
          'Documento técnico de proposta O&M entregue com cálculo de cenários de exposição e recomendação do Plano Completo.',
        )
        time1.set('data', '2026-03-02 10:30:00.000Z')
        time1.set('autor', 'Eng. Mateus Fontana')
        time1.set('status_tag', 'Proposta Enviada')
        time1.set('referencia_id', p1.id)
        app.save(time1)
      } catch (err) {
        console.log('Erro ao semear proposta 1:', err)
      }
    }

    // Proposta 2: Plano Prevenção para Mercado Santos
    if (clientePrevencaoId) {
      try {
        const p2 = new Record(propostasCol)
        p2.set('cliente_id', clientePrevencaoId)
        p2.set('plano_escolhido', 'Prevenção')
        p2.set('potencia_kwp', 12.0)
        p2.set('geracao_mensal_kwh', 1560)
        p2.set('marca_inversores', 'Fronius Symo 12.0-3-M')
        p2.set('tipo_instalacao', 'Telhado Metálico')
        p2.set('numero_modulos', 30)
        p2.set('valor_kwh', 0.88)
        p2.set('distancia_km', 12)
        p2.set('valor_km', 2.0)
        // Cálculos
        const ativo2 = 1560 * 0.88 // 1372.80
        p2.set('valor_ativo_protegido', ativo2)
        p2.set('perda_15_ano', ativo2 * 12 * 0.15) // 2471.04
        p2.set('perda_20_ano', ativo2 * 12 * 0.2) // 3294.72
        p2.set('prejuizo_20_dias', (ativo2 * 20) / 30) // 915.20
        p2.set('prejuizo_30_dias', ativo2) // 1372.80
        p2.set('valor_mensal_plano', 74.9)
        p2.set('valor_anual_plano', 74.9 * 12) // 898.80
        p2.set('data_proposta', '2026-03-05 14:15:00.000Z')
        p2.set('autor', 'João Victor Bagetti Fuchs')
        p2.set('status', 'Proposta Enviada')
        p2.set(
          'observacoes',
          'Proposta enviada ao cliente com foco no Plano Prevenção cobrindo 1 limpeza técnica anual e reaperto geral.',
        )
        app.save(p2)

        // Adicionar na timeline de atividades
        const atv2 = new Record(atividadesCol)
        atv2.set('cliente_id', clientePrevencaoId)
        atv2.set('tipo', 'proposta')
        atv2.set('titulo', 'Proposta O&M Gerada: Plano Prevenção')
        atv2.set(
          'descricao',
          'Proposta de Gestão e Manutenção O&M gerada para usina de 12.0 kWp. Plano Prevenção (R$ 74,90/mês — R$ 898,80/ano). Ativo protegido de R$ 1.372,80/mês.',
        )
        atv2.set('data', '2026-03-05 14:15:00.000Z')
        atv2.set('status', 'concluida')
        atv2.set('autor', 'João Victor Bagetti Fuchs')
        app.save(atv2)

        // Adicionar na timeline O&M
        const time2 = new Record(timelineOmCol)
        time2.set('cliente_id', clientePrevencaoId)
        time2.set('tipo', 'interacao')
        time2.set('titulo', 'Proposta O&M: Plano Prevenção Emitida')
        time2.set(
          'descricao',
          'Documento técnico de proposta O&M entregue com cálculo de cenários de exposição e Plano Prevenção selecionado.',
        )
        time2.set('data', '2026-03-05 14:15:00.000Z')
        time2.set('autor', 'João Victor Bagetti Fuchs')
        time2.set('status_tag', 'Proposta Enviada')
        time2.set('referencia_id', p2.id)
        app.save(time2)
      } catch (err) {
        console.log('Erro ao semear proposta 2:', err)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('propostas_om')
      app.delete(col)
    } catch (_) {}
  },
)

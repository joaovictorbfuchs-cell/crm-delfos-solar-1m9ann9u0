migrate(
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (!orcCol.fields.getByName('valor_por_placa')) {
      orcCol.fields.add(new NumberField({ name: 'valor_por_placa' }))
    }
    if (!orcCol.fields.getByName('opcao_imposto')) {
      orcCol.fields.add(new NumberField({ name: 'opcao_imposto' }))
    }
    if (!orcCol.fields.getByName('fornecedor_selecionado_id')) {
      orcCol.fields.add(new TextField({ name: 'fornecedor_selecionado_id' }))
    }
    app.save(orcCol)

    // Semear dados de exemplo para demonstração conforme item 8:
    // Orçamento com 10 placas, valor por placa de R$ 150,
    // dois fornecedores cadastrados no comparativo (um selecionado),
    // imposto na opção 2 e todos os campos calculados aparecendo automaticamente.
    const foCol = app.findCollectionByNameOrId('fornecedores_orcamentos')

    // Verificar se já existe pelo título ou observação
    let existingOrc = null
    try {
      existingOrc = app.findFirstRecordByData(
        'orcamentos_solar',
        'observacoes',
        'Orçamento de demonstração: 10 placas fotovoltaicas, valor por placa R$ 150, imposto Opção 2 e comparativo de 2 fornecedores homologados.',
      )
    } catch (_) {}

    if (existingOrc) {
      existingOrc.set('numero_placas', 10)
      existingOrc.set('valor_por_placa', 150)
      existingOrc.set('opcao_imposto', 2)
      existingOrc.set('custo_risco_engenharia', 400)
      app.save(existingOrc)
      return
    }

    // Buscar um cliente existente para associar
    let clienteDemoId = 'f3eass5h5tg8wli' // Ana Paula Martins
    try {
      const c = app.findFirstRecordByData('clientes', 'nome', 'Ana Paula Martins')
      if (c) clienteDemoId = c.id
    } catch (_) {}

    const demoOrc = new Record(orcCol)
    demoOrc.set('cliente_id', clienteDemoId)
    demoOrc.set('status', 'Em elaboração')
    demoOrc.set('status_revisao', 'em análise')
    demoOrc.set('numero_revisao', 1)
    demoOrc.set('tipo_cliente', 'residencial')
    demoOrc.set('consumo_kwh_mes', 550)
    demoOrc.set('tarifa_kwh', 1.05)
    demoOrc.set('potencia_kwp', 5.5)
    demoOrc.set('numero_placas', 10)
    demoOrc.set('potencia_placa_wp', 550)
    demoOrc.set('marca_painel', 'Canadian Solar 550W BiHiKu7')
    demoOrc.set('marca_inversor', 'Deye SUN-5K-SG04LP1-EU')
    demoOrc.set('quantidade_inversores', 1)
    demoOrc.set('tipo_estrutura', 'ceramico')
    demoOrc.set('orientacao_telhado', 'norte')
    demoOrc.set('area_necessaria_m2', 24)
    demoOrc.set('data_orcamento', new Date().toISOString())
    demoOrc.set('validade_dias', 10)
    demoOrc.set('autor', 'Demonstração Delfos Solar')
    demoOrc.set(
      'observacoes',
      'Orçamento de demonstração: 10 placas fotovoltaicas, valor por placa R$ 150, imposto Opção 2 e comparativo de 2 fornecedores homologados.',
    )

    // Valores do cálculo exato:
    const materiais = 18000
    const maoDeObra = 1500
    const valorPorPlaca = 150
    const risco = 400
    const subtotal = materiais + maoDeObra + risco
    const totalCalc = (subtotal * 1.18) / 0.81 // 28990.123456...
    const impostosCalc = (totalCalc - materiais) * 0.16 // 1758.4197...
    const somaComImpostos = subtotal + impostosCalc // 21658.4197...
    const admCalc = somaComImpostos * 0.15 // 3248.7629...
    const comCalc = somaComImpostos * 0.03 // 649.7525...
    const indCalc = totalCalc * 0.01 // 289.9012...
    const totalCustos = totalCalc

    demoOrc.set('valor_por_placa', valorPorPlaca)
    demoOrc.set('opcao_imposto', 2)
    demoOrc.set('custo_materiais_extras', materiais)
    demoOrc.set('custo_mao_de_obra', maoDeObra)
    demoOrc.set('custo_risco_engenharia', risco)
    demoOrc.set('custo_impostos', Math.round(impostosCalc * 100) / 100)
    demoOrc.set('custo_administracao', Math.round(admCalc * 100) / 100)
    demoOrc.set('custo_comissao_comercial', Math.round(comCalc * 100) / 100)
    demoOrc.set('custo_indicacao', Math.round(indCalc * 100) / 100)
    demoOrc.set('custo_frete_guincho', 0)
    demoOrc.set('custo_subestacao', 0)
    demoOrc.set('custo_terceirizacao', 0)
    demoOrc.set('custo_marketing_combustivel', 0)
    demoOrc.set('valor_total_custos', Math.round(totalCustos * 100) / 100)
    demoOrc.set('valor_investimento', Math.round(totalCustos * 100) / 100)
    demoOrc.set('custo_por_kwp', Math.round((totalCustos / 5.5) * 100) / 100)

    demoOrc.set('geracao_anual_kwh', 8250)
    demoOrc.set('geracao_mensal_kwh', 687)
    demoOrc.set('economia_1_mes', 680)
    demoOrc.set('economia_1_ano', 8160)
    demoOrc.set('economia_5_anos', 48500)
    demoOrc.set('economia_10_anos', 123000)
    demoOrc.set('economia_25_anos', 478000)
    demoOrc.set('payback_meses', 36)
    demoOrc.set('parcela_a_vista', Math.round(totalCustos * 100) / 100)
    demoOrc.set('parcela_cartao_18x', Math.round((totalCustos / 18) * 1.14 * 100) / 100)
    demoOrc.set('parcela_financiamento_banco1', 790)
    demoOrc.set('parcela_financiamento_banco2', 630)

    app.save(demoOrc)
    const demoOrcId = demoOrc.id

    // Criar fornecedores para a cotação
    let fornSoltecnoId = ''
    let fornEletricaRsId = ''
    try {
      fornSoltecnoId = app.findFirstRecordByData(
        'fornecedores',
        'nome_empresa',
        'Sol tecno Distribuidora',
      ).id
    } catch (_) {}
    try {
      fornEletricaRsId = app.findFirstRecordByData(
        'fornecedores',
        'nome_empresa',
        'Elétrica Comercial RS',
      ).id
    } catch (_) {}

    // Fornecedor 1 (Selecionado)
    const fo1 = new Record(foCol)
    if (fornSoltecnoId) fo1.set('fornecedor_id', fornSoltecnoId)
    fo1.set('nome_fornecedor', 'Sol tecno Distribuidora')
    fo1.set('cliente_id', clienteDemoId)
    fo1.set('orcamento_solar_id', demoOrcId)
    fo1.set('data', new Date().toISOString())
    fo1.set('numero_revisao', 'ST-DEMO-10P')
    fo1.set('valor_total', 18000)
    fo1.set('selecionado', true)
    fo1.set('modulos', [
      {
        descricao: 'Módulo Fotovoltaico Canadian Solar 550W BiHiKu7 Monocristalino',
        quantidade: 10,
      },
    ])
    fo1.set('inversores', [
      { descricao: 'Inversor Solar On-Grid Deye SUN-5K-SG04LP1-EU Monofásico 220V', quantidade: 1 },
    ])
    fo1.set('acessorios', [
      { descricao: 'Kit Fixação Telhado Cerâmico 10 Placas + String Box CC', quantidade: 1 },
    ])
    fo1.set('observacoes', 'Cotação selecionada para o cálculo final do orçamento.')
    app.save(fo1)

    // Fornecedor 2 (Não selecionado)
    const fo2 = new Record(foCol)
    if (fornEletricaRsId) fo2.set('fornecedor_id', fornEletricaRsId)
    fo2.set('nome_fornecedor', 'Elétrica Comercial RS')
    fo2.set('cliente_id', clienteDemoId)
    fo2.set('orcamento_solar_id', demoOrcId)
    fo2.set('data', new Date().toISOString())
    fo2.set('numero_revisao', 'EL-DEMO-10P')
    fo2.set('valor_total', 19500)
    fo2.set('selecionado', false)
    fo2.set('modulos', [
      { descricao: 'Módulo Fotovoltaico JA Solar 550W DeepBlue 3.0 Mono', quantidade: 10 },
    ])
    fo2.set('inversores', [
      { descricao: 'Inversor Solar On-Grid Growatt MIN 5000TL-X Monofásico 220V', quantidade: 1 },
    ])
    fo2.set('acessorios', [
      { descricao: 'Kit Fixação Alumínio 10 Módulos + Proteções CC/CA Clamper', quantidade: 1 },
    ])
    fo2.set('observacoes', 'Segunda opção de fornecedor no comparativo.')
    app.save(fo2)

    // Atualizar demoOrc com o fornecedor selecionado id
    demoOrc.set('fornecedor_selecionado_id', fo1.id)
    app.save(demoOrc)
  },
  (app) => {
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    if (orcCol.fields.getByName('valor_por_placa')) {
      orcCol.fields.removeByName('valor_por_placa')
    }
    if (orcCol.fields.getByName('opcao_imposto')) {
      orcCol.fields.removeByName('opcao_imposto')
    }
    if (orcCol.fields.getByName('fornecedor_selecionado_id')) {
      orcCol.fields.removeByName('fornecedor_selecionado_id')
    }
    app.save(orcCol)
  },
)

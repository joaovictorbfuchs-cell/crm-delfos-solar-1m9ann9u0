migrate(
  (app) => {
    const foCol = app.findCollectionByNameOrId('fornecedores_orcamentos')
    const osCol = app.findCollectionByNameOrId('orcamentos_solar')
    const fornCol = app.findCollectionByNameOrId('fornecedores')
    const cliCol = app.findCollectionByNameOrId('clientes')

    // 1. Backfill dos orçamentos solares existentes:
    // Definir numero_revisao = 1 e status_revisao coerente com status atual
    const orcamentosAtuais = app.findRecordsByFilter('orcamentos_solar', '', 'created', 100, 0)
    for (const o of orcamentosAtuais) {
      if (!o.getInt('numero_revisao') || o.getInt('numero_revisao') === 0) {
        o.set('numero_revisao', 1)
      }
      const stAtual = o.getString('status')
      let stRev = 'em análise'
      if (stAtual === 'Aprovado') stRev = 'aprovada'
      else if (stAtual === 'Rejeitado') stRev = 'rejeitada'
      else if (stAtual === 'Enviado ao cliente') stRev = 'enviada ao cliente'
      o.set('status_revisao', stRev)
      app.save(o)
    }

    // 2. Garantir 'selecionado' no orçamento yu691jaybs4r4za (ou o primeiro do projeto rt62hb0w2l4xcl8 / cxfvykl3fnrjto8)
    try {
      const fo1 = app.findFirstRecordByData(
        'fornecedores_orcamentos',
        'numero_revisao',
        'ST-2026-REV01',
      )
      fo1.set('selecionado', true)
      app.save(fo1)
    } catch (_) {}

    // Buscar referências de fornecedores
    let f1Id = '',
      f2Id = '',
      f3Id = ''
    try {
      f1Id = app.findFirstRecordByData('fornecedores', 'nome_empresa', 'Sol tecno Distribuidora').id
    } catch (_) {}
    try {
      f2Id = app.findFirstRecordByData('fornecedores', 'nome_empresa', 'Elétrica Comercial RS').id
    } catch (_) {}
    try {
      f3Id = app.findFirstRecordByData('fornecedores', 'nome_empresa', 'Estruturas Sul Solar').id
    } catch (_) {}

    // Buscar clientes e propostas solares
    let marceloBeckerId = '9ozpqdm9sgwmdzr'
    let marceloOrcamentoId = 'rt62hb0w2l4xcl8'
    let anaPaulaId = 'f3eass5h5tg8wli'
    let anaPaulaOrcamentoId = 'tsidb0gmat7e0gn'

    // Vincular os dois primeiros orçamentos ao marceloOrcamentoId (para garantir 2+ orçamentos no mesmo orcamento_solar_id)
    try {
      const o1 = app.findFirstRecordByData(
        'fornecedores_orcamentos',
        'numero_revisao',
        'ST-2026-REV01',
      )
      o1.set('orcamento_solar_id', marceloOrcamentoId)
      o1.set('cliente_id', marceloBeckerId)
      o1.set('selecionado', true)
      app.save(o1)
    } catch (_) {}

    try {
      const o2 = app.findFirstRecordByData(
        'fornecedores_orcamentos',
        'numero_revisao',
        'ST-2026-REV02',
      )
      o2.set('orcamento_solar_id', marceloOrcamentoId)
      o2.set('cliente_id', marceloBeckerId)
      o2.set('selecionado', false)
      app.save(o2)
    } catch (_) {}

    // 3. Adicionar mais 2 orçamentos de fornecedores (totalizando 5 orçamentos de fornecedores extraídos e salvos)
    // Orçamento 4: Elétrica Comercial RS cotando inversores e string box para o projeto do Marcelo Becker (3 fornecedores no mesmo projeto!)
    try {
      app.findFirstRecordByData('fornecedores_orcamentos', 'numero_revisao', 'EL-RS-9920')
    } catch (_) {
      const o4 = new Record(foCol)
      if (f2Id) o4.set('fornecedor_id', f2Id)
      o4.set('nome_fornecedor', 'Elétrica Comercial RS')
      o4.set('cliente_id', marceloBeckerId)
      o4.set('orcamento_solar_id', marceloOrcamentoId)
      o4.set('data', '2026-03-07 11:20:00.000Z')
      o4.set('numero_revisao', 'EL-RS-9920')
      o4.set('valor_total', 49800)
      o4.set('selecionado', false)
      o4.set('modulos', [
        { descricao: 'Módulo Fotovoltaico JA Solar 550W Monocristalino N-Type', quantidade: 52 },
      ])
      o4.set('inversores', [
        {
          descricao: 'Inversor Solar On-Grid Huawei SUN2000-30KTL-M3 Trifásico 220V',
          quantidade: 1,
        },
      ])
      o4.set('acessorios', [
        {
          descricao: 'Quadro Proteção CC 1000V com Disjuntor Bipolar + DPS Clamper',
          quantidade: 2,
        },
        { descricao: 'Smart Logger Huawei 3000A com monitoramento 4G/Wi-Fi', quantidade: 1 },
        { descricao: 'Cabo Solar Fotovoltaico 6mm² Vermelho/Preto 400m', quantidade: 1 },
        { descricao: 'Conectores MC4 Macho/Fêmea Original', quantidade: 24 },
      ])
      o4.set(
        'observacoes',
        'Extraído do arquivo cotacao_eletrica_rs_huawei_30k.pdf. Linha Premium com monitoramento inteligente Smart Logger incluso.',
      )
      app.save(o4)
    }

    // Orçamento 5: Estruturas Sul Solar cotando estrutura + inversores para o projeto residencial de Ana Paula Martins
    try {
      app.findFirstRecordByData('fornecedores_orcamentos', 'numero_revisao', 'ESS-2026-081')
    } catch (_) {
      const o5 = new Record(foCol)
      if (f3Id) o5.set('fornecedor_id', f3Id)
      o5.set('nome_fornecedor', 'Estruturas Sul Solar')
      o5.set('cliente_id', anaPaulaId)
      o5.set('orcamento_solar_id', anaPaulaOrcamentoId)
      o5.set('data', '2026-03-09 15:30:00.000Z')
      o5.set('numero_revisao', 'ESS-2026-081')
      o5.set('valor_total', 26400)
      o5.set('selecionado', true)
      o5.set('modulos', [
        { descricao: 'Painel Fotovoltaico Canadian Solar 550W TopHiKu6 Mono', quantidade: 13 },
      ])
      o5.set('inversores', [
        { descricao: 'Inversor Solar Deye SUN-8K-SG04LP1-EU Monofásico 220V', quantidade: 1 },
      ])
      o5.set('acessorios', [
        { descricao: 'Kit Fixação Estrutura Alumínio Telhado Cerâmico 13 Painéis', quantidade: 1 },
        { descricao: 'String Box Solar CC 1000V DPS + Chave Seccionadora', quantidade: 1 },
        { descricao: 'Cabo Solar 6mm² Preto/Vermelho (150m)', quantidade: 1 },
        { descricao: 'Kit Conectores MC4 Stäubli', quantidade: 10 },
      ])
      o5.set(
        'observacoes',
        'Extraído do arquivo orcamento_estruturas_sul_solar_anapaula.pdf. Kit de fixação em alumínio anodizado marítimo 6063-T6 com 12 anos de garantia.',
      )
      app.save(o5)
    }

    // 4. Semear 2 propostas solares com múltiplas revisões
    // Caso 1: Projeto do Marcelo Becker
    // - Revisão 1: rt62hb0w2l4xcl8 -> marcar como status 'Rejeitado', status_revisao 'rejeitada', numero_revisao 1, valor R$ 112.000
    // - Revisão 2: nova proposta solar -> numero_revisao 2, revisao_de = rt62hb0w2l4xcl8, status 'Enviado ao cliente', status_revisao 'enviada ao cliente', valor R$ 104.500
    try {
      const p1 = app.findFirstRecordByData('orcamentos_solar', 'id', marceloOrcamentoId)
      p1.set('numero_revisao', 1)
      p1.set('status', 'Rejeitado')
      p1.set('status_revisao', 'rejeitada')
      p1.set('valor_investimento', 112000)
      p1.set('data_orcamento', '2026-03-01 10:00:00.000Z')
      p1.set(
        'observacoes',
        'Revisão 1 inicial do projeto fotovoltaico de 28.5 kWp. Cliente solicitou renegociação com fornecedor e adequação de custos.',
      )
      app.save(p1)

      // Criar Revisão 2 se ainda não existir
      try {
        app.findFirstRecordByData(
          'orcamentos_solar',
          'observacoes',
          'Revisão 2 com desconto concedido pelo fornecedor Sol tecno (cotação ST-2026-REV02) e adequação dos custos de instalação.',
        )
      } catch (_) {
        const p1Rev2 = new Record(osCol)
        p1Rev2.set('cliente_id', marceloBeckerId)
        p1Rev2.set('revisao_de', marceloOrcamentoId)
        p1Rev2.set('numero_revisao', 2)
        p1Rev2.set('status', 'Enviado ao cliente')
        p1Rev2.set('status_revisao', 'enviada ao cliente')
        p1Rev2.set('tipo_cliente', 'rural')
        p1Rev2.set('consumo_kwh_mes', 3400)
        p1Rev2.set('tarifa_kwh', 0.94)
        p1Rev2.set('potencia_kwp', 28.5)
        p1Rev2.set('numero_placas', 52)
        p1Rev2.set('potencia_placa_wp', 550)
        p1Rev2.set('marca_painel', 'Canadian Solar 550W BiHiKu7')
        p1Rev2.set('marca_inversor', 'Growatt MAX 30KTL3-X LV')
        p1Rev2.set('quantidade_inversores', 1)
        p1Rev2.set('tipo_estrutura', 'metalico')
        p1Rev2.set('orientacao_telhado', 'norte')
        p1Rev2.set('area_necessaria_m2', 140)
        p1Rev2.set('codigo_finame', '3.456.789')
        p1Rev2.set('valor_investimento', 104500)
        p1Rev2.set('custo_mao_de_obra', 14000)
        p1Rev2.set('custo_materiais_extras', 6500)
        p1Rev2.set('custo_frete_guincho', 2800)
        p1Rev2.set('custo_impostos', 7800)
        p1Rev2.set('custo_indicacao', 1000)
        p1Rev2.set('custo_administracao', 4200)
        p1Rev2.set('custo_marketing_combustivel', 1500)
        p1Rev2.set('custo_risco_engenharia', 2500)
        p1Rev2.set('custo_comissao_comercial', 5200)
        p1Rev2.set('valor_total_custos', 104500)
        p1Rev2.set('custo_por_kwp', 3666.67)
        p1Rev2.set('geracao_anual_kwh', 43800)
        p1Rev2.set('geracao_mensal_kwh', 3650)
        p1Rev2.set('economia_1_mes', 3150)
        p1Rev2.set('economia_1_ano', 37800)
        p1Rev2.set('economia_5_anos', 226200)
        p1Rev2.set('economia_10_anos', 574800)
        p1Rev2.set('economia_25_anos', 2235000)
        p1Rev2.set('payback_meses', 32)
        p1Rev2.set('parcela_a_vista', 104500)
        p1Rev2.set('parcela_cartao_18x', 6668.4)
        p1Rev2.set('parcela_financiamento_banco1', 2942.3)
        p1Rev2.set('parcela_financiamento_banco2', 2320.1)
        p1Rev2.set('data_orcamento', '2026-03-08 14:00:00.000Z')
        p1Rev2.set('validade_dias', 7)
        p1Rev2.set('autor', 'João Victor Bagetti Fuchs')
        p1Rev2.set(
          'observacoes',
          'Revisão 2 com desconto concedido pelo fornecedor Sol tecno (cotação ST-2026-REV02) e adequação dos custos de instalação.',
        )
        app.save(p1Rev2)
      }
    } catch (_) {}

    // Caso 2: Projeto da Ana Paula Martins
    // - Revisão 1: tsidb0gmat7e0gn -> numero_revisao 1, status 'Enviado ao cliente', status_revisao 'enviada ao cliente', valor R$ 29.800
    // - Revisão 2: nova proposta -> numero_revisao 2, revisao_de = tsidb0gmat7e0gn, status 'Aprovado', status_revisao 'aprovada', valor R$ 27.900
    try {
      const p2 = app.findFirstRecordByData('orcamentos_solar', 'id', anaPaulaOrcamentoId)
      p2.set('numero_revisao', 1)
      p2.set('status', 'Enviado ao cliente')
      p2.set('status_revisao', 'enviada ao cliente')
      p2.set('valor_investimento', 29800)
      p2.set('data_orcamento', '2026-03-03 09:00:00.000Z')
      p2.set(
        'observacoes',
        'Revisão 1 de proposta residencial 7.15 kWp enviada ao cliente com módulos JA Solar.',
      )
      app.save(p2)

      try {
        app.findFirstRecordByData(
          'orcamentos_solar',
          'observacoes',
          'Revisão 2 aprovada pelo cliente com inclusão do kit de fixação Estruturas Sul Solar.',
        )
      } catch (_) {
        const p2Rev2 = new Record(osCol)
        p2Rev2.set('cliente_id', anaPaulaId)
        p2Rev2.set('revisao_de', anaPaulaOrcamentoId)
        p2Rev2.set('numero_revisao', 2)
        p2Rev2.set('status', 'Aprovado')
        p2Rev2.set('status_revisao', 'aprovada')
        p2Rev2.set('tipo_cliente', 'residencial')
        p2Rev2.set('consumo_kwh_mes', 850)
        p2Rev2.set('tarifa_kwh', 0.96)
        p2Rev2.set('potencia_kwp', 7.15)
        p2Rev2.set('numero_placas', 13)
        p2Rev2.set('potencia_placa_wp', 550)
        p2Rev2.set('marca_painel', 'JA Solar 550W DeepBlue 3.0')
        p2Rev2.set('marca_inversor', 'Deye SUN-8K-SG04LP1-EU')
        p2Rev2.set('quantidade_inversores', 1)
        p2Rev2.set('tipo_estrutura', 'ceramico')
        p2Rev2.set('orientacao_telhado', 'norte')
        p2Rev2.set('area_necessaria_m2', 35)
        p2Rev2.set('valor_investimento', 27900)
        p2Rev2.set('custo_mao_de_obra', 4200)
        p2Rev2.set('custo_materiais_extras', 1800)
        p2Rev2.set('custo_frete_guincho', 800)
        p2Rev2.set('custo_impostos', 2100)
        p2Rev2.set('custo_administracao', 1200)
        p2Rev2.set('custo_comissao_comercial', 1400)
        p2Rev2.set('custo_marketing_combustivel', 500)
        p2Rev2.set('custo_risco_engenharia', 700)
        p2Rev2.set('valor_total_custos', 27900)
        p2Rev2.set('custo_por_kwp', 3902.1)
        p2Rev2.set('geracao_anual_kwh', 10950)
        p2Rev2.set('geracao_mensal_kwh', 912)
        p2Rev2.set('economia_1_mes', 787.2)
        p2Rev2.set('economia_1_ano', 9446.4)
        p2Rev2.set('economia_5_anos', 56500)
        p2Rev2.set('economia_10_anos', 143500)
        p2Rev2.set('economia_25_anos', 558000)
        p2Rev2.set('payback_meses', 34)
        p2Rev2.set('parcela_a_vista', 27900)
        p2Rev2.set('parcela_cartao_18x', 1780.5)
        p2Rev2.set('parcela_financiamento_banco1', 785.6)
        p2Rev2.set('parcela_financiamento_banco2', 619.4)
        p2Rev2.set('data_orcamento', '2026-03-09 10:15:00.000Z')
        p2Rev2.set('validade_dias', 5)
        p2Rev2.set('autor', 'Mateus Fontana')
        p2Rev2.set(
          'observacoes',
          'Revisão 2 aprovada pelo cliente com inclusão do kit de fixação Estruturas Sul Solar.',
        )
        app.save(p2Rev2)
      }
    } catch (_) {}
  },
  (app) => {
    // Revert opcional
  },
)

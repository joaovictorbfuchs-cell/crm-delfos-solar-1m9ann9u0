migrate(
  (app) => {
    const clientesColId = app.findCollectionByNameOrId('clientes').id

    // 1. Criar coleção orcamentos_solar
    const orcamentosCol = new Collection({
      name: 'orcamentos_solar',
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
        // Dados do cliente e status do orçamento
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Em elaboração', 'Enviado ao cliente', 'Aprovado', 'Rejeitado'],
          maxSelect: 1,
        },
        {
          name: 'tipo_cliente',
          type: 'select',
          required: true,
          values: ['residencial', 'comercial', 'industrial', 'rural'],
          maxSelect: 1,
        },
        // Dados técnicos do sistema
        { name: 'consumo_kwh_mes', type: 'number', required: true },
        { name: 'tarifa_kwh', type: 'number', required: true },
        { name: 'potencia_kwp', type: 'number', required: true },
        { name: 'numero_placas', type: 'number', required: true },
        { name: 'potencia_placa_wp', type: 'number', required: true },
        { name: 'marca_painel', type: 'text', required: true },
        { name: 'marca_inversor', type: 'text', required: true },
        { name: 'quantidade_inversores', type: 'number', required: true },
        {
          name: 'tipo_estrutura',
          type: 'select',
          required: true,
          values: ['ceramico', 'metalico', 'laje', 'fibrocimento', 'solo'],
          maxSelect: 1,
        },
        {
          name: 'orientacao_telhado',
          type: 'select',
          required: true,
          values: ['leste', 'oeste', 'norte', 'sul'],
          maxSelect: 1,
        },
        { name: 'area_necessaria_m2', type: 'number', required: true },
        { name: 'codigo_finame', type: 'text' },
        { name: 'valor_investimento', type: 'number', required: true },
        // Custos do projeto
        { name: 'custo_mao_de_obra', type: 'number' },
        { name: 'custo_materiais_extras', type: 'number' },
        { name: 'custo_frete_guincho', type: 'number' },
        { name: 'custo_subestacao', type: 'number' },
        { name: 'custo_terceirizacao', type: 'number' },
        { name: 'custo_administracao', type: 'number' },
        { name: 'custo_marketing_combustivel', type: 'number' },
        { name: 'custo_risco_engenharia', type: 'number' },
        { name: 'custo_comissao_comercial', type: 'number' },
        { name: 'custo_indicacao', type: 'number' },
        { name: 'custo_impostos', type: 'number' },
        { name: 'valor_total_custos', type: 'number' },
        { name: 'custo_por_kwp', type: 'number' },
        // Cálculos e resultados chave
        { name: 'geracao_anual_kwh', type: 'number' },
        { name: 'geracao_mensal_kwh', type: 'number' },
        { name: 'geracao_detalhada_json', type: 'json' },
        { name: 'economia_1_mes', type: 'number' },
        { name: 'economia_1_ano', type: 'number' },
        { name: 'economia_5_anos', type: 'number' },
        { name: 'economia_10_anos', type: 'number' },
        { name: 'economia_25_anos', type: 'number' },
        { name: 'gasto_sem_solar_1_ano', type: 'number' },
        { name: 'gasto_sem_solar_5_anos', type: 'number' },
        { name: 'gasto_sem_solar_10_anos', type: 'number' },
        { name: 'gasto_sem_solar_25_anos', type: 'number' },
        { name: 'conta_primeiro_mes_com_solar', type: 'number' },
        { name: 'conta_4_anos_reajuste', type: 'number' },
        { name: 'conta_10_anos_reajuste', type: 'number' },
        { name: 'payback_meses', type: 'number' },
        // Parcelamentos calculados
        { name: 'parcela_a_vista', type: 'number' },
        { name: 'parcela_cartao_18x', type: 'number' },
        { name: 'parcela_financiamento_banco1', type: 'number' },
        { name: 'parcela_financiamento_banco2', type: 'number' },
        // Metadados
        { name: 'data_orcamento', type: 'date', required: true },
        { name: 'validade_dias', type: 'number' },
        { name: 'autor', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orcamentos_solar_cliente ON orcamentos_solar (cliente_id)',
        'CREATE INDEX idx_orcamentos_solar_status ON orcamentos_solar (status)',
        'CREATE INDEX idx_orcamentos_solar_data ON orcamentos_solar (data_orcamento)',
      ],
    })
    app.save(orcamentosCol)

    // 2. Semear pelo menos 2 orçamentos de exemplo com clientes reais existentes
    // Exemplo 1: Enviado ao cliente (Marcelo Becker ou Frigorífico Lima)
    // Exemplo 2: Em elaboração (Ana Paula Martins ou Cooperativa Aurora)
    let cliente1Id = ''
    let cliente2Id = ''

    try {
      cliente1Id = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker').id
    } catch (_) {
      try {
        const c = app.findRecordsByFilter('clientes', '', '-created', 1, 0)
        if (c.length > 0) cliente1Id = c[0].id
      } catch (_) {}
    }

    try {
      cliente2Id = app.findFirstRecordByData('clientes', 'nome', 'Ana Paula Martins').id
    } catch (_) {
      try {
        const c = app.findRecordsByFilter('clientes', '', 'created', 1, 0)
        if (c.length > 0) cliente2Id = c[0].id
      } catch (_) {}
    }

    const orcamentosRecCol = app.findCollectionByNameOrId('orcamentos_solar')
    const atividadesCol = app.findCollectionByNameOrId('atividades')

    // Orçamento 1: Rural / Comercial - 28.5 kWp - Enviado ao cliente
    if (cliente1Id) {
      try {
        const o1 = new Record(orcamentosRecCol)
        o1.set('cliente_id', cliente1Id)
        o1.set('status', 'Enviado ao cliente')
        o1.set('tipo_cliente', 'rural')
        o1.set('consumo_kwh_mes', 3400)
        o1.set('tarifa_kwh', 0.94)
        o1.set('potencia_kwp', 28.5)
        o1.set('numero_placas', 52)
        o1.set('potencia_placa_wp', 550)
        o1.set('marca_painel', 'Canadian Solar 550W BiHiKu7')
        o1.set('marca_inversor', 'Growatt MAX 30KTL3-X LV')
        o1.set('quantidade_inversores', 1)
        o1.set('tipo_estrutura', 'metalico')
        o1.set('orientacao_telhado', 'norte')
        o1.set('area_necessaria_m2', 140)
        o1.set('codigo_finame', '3.456.789')
        o1.set('valor_investimento', 104500)
        // Custos
        o1.set('custo_mao_de_obra', 14000)
        o1.set('custo_materiais_extras', 6500)
        o1.set('custo_frete_guincho', 2800)
        o1.set('custo_subestacao', 0)
        o1.set('custo_terceirizacao', 0)
        o1.set('custo_administracao', 4200)
        o1.set('custo_marketing_combustivel', 1500)
        o1.set('custo_risco_engenharia', 2500)
        o1.set('custo_comissao_comercial', 5200)
        o1.set('custo_indicacao', 1000)
        o1.set('custo_impostos', 7800)
        o1.set('valor_total_custos', 104500)
        o1.set('custo_por_kwp', 3666.67)
        // Cálculos solares
        o1.set('geracao_anual_kwh', 43800)
        o1.set('geracao_mensal_kwh', 3650)
        o1.set(
          'geracao_detalhada_json',
          JSON.stringify([
            { mes: 'Jan', kwh: 4420 },
            { mes: 'Fev', kwh: 3850 },
            { mes: 'Mar', kwh: 3750 },
            { mes: 'Abr', kwh: 3100 },
            { mes: 'Mai', kwh: 2550 },
            { mes: 'Jun', kwh: 2280 },
            { mes: 'Jul', kwh: 2470 },
            { mes: 'Ago', kwh: 3050 },
            { mes: 'Set', kwh: 3260 },
            { mes: 'Out', kwh: 3880 },
            { mes: 'Nov', kwh: 4260 },
            { mes: 'Dez', kwh: 4580 },
          ]),
        )
        o1.set('economia_1_mes', 3150)
        o1.set('economia_1_ano', 37800)
        o1.set('economia_5_anos', 226200)
        o1.set('economia_10_anos', 574800)
        o1.set('economia_25_anos', 2235000)
        o1.set('gasto_sem_solar_1_ano', 38352)
        o1.set('gasto_sem_solar_5_anos', 229500)
        o1.set('gasto_sem_solar_10_anos', 583100)
        o1.set('gasto_sem_solar_25_anos', 2267000)
        o1.set('conta_primeiro_mes_com_solar', 47)
        o1.set('conta_4_anos_reajuste', 66.3)
        o1.set('conta_10_anos_reajuste', 111.2)
        o1.set('payback_meses', 32)
        // Parcelas
        o1.set('parcela_a_vista', 104500)
        o1.set('parcela_cartao_18x', 6668.4)
        o1.set('parcela_financiamento_banco1', 2942.3) // 60x 1.9%
        o1.set('parcela_financiamento_banco2', 2320.1) // 60x 0.99%
        o1.set('data_orcamento', '2026-03-08 14:00:00.000Z')
        o1.set('validade_dias', 5)
        o1.set('autor', 'João Victor Bagetti Fuchs')
        o1.set(
          'observacoes',
          'Orçamento de usina solar para granja/galpão rural. Telhado metálico voltado ao norte, excelente índice de irradiação.',
        )
        app.save(o1)

        // Registrar atividade na timeline do cliente
        const atv1 = new Record(atividadesCol)
        atv1.set('cliente_id', cliente1Id)
        atv1.set('tipo', 'proposta')
        atv1.set('titulo', 'Orçamento Solar 28.5 kWp Gerado')
        atv1.set(
          'descricao',
          'Orçamento de Energia Solar Fotovoltaica gerado e enviado ao cliente. Potência: 28.5 kWp (52 placas Canadian Solar 550W). Investimento: R$ 104.500,00. Payback estimado: 32 meses.',
        )
        atv1.set('data', '2026-03-08 14:00:00.000Z')
        atv1.set('status', 'concluida')
        atv1.set('autor', 'João Victor Bagetti Fuchs')
        app.save(atv1)
      } catch (err) {
        console.log('Erro ao semear orçamento 1:', err)
      }
    }

    // Orçamento 2: Residencial - 7.15 kWp - Em elaboração
    if (cliente2Id) {
      try {
        const o2 = new Record(orcamentosRecCol)
        o2.set('cliente_id', cliente2Id)
        o2.set('status', 'Em elaboração')
        o2.set('tipo_cliente', 'residencial')
        o2.set('consumo_kwh_mes', 850)
        o2.set('tarifa_kwh', 0.96)
        o2.set('potencia_kwp', 7.15)
        o2.set('numero_placas', 13)
        o2.set('potencia_placa_wp', 550)
        o2.set('marca_painel', 'JA Solar 550W DeepBlue 3.0')
        o2.set('marca_inversor', 'Deye SUN-8K-SG04LP1-EU')
        o2.set('quantidade_inversores', 1)
        o2.set('tipo_estrutura', 'ceramico')
        o2.set('orientacao_telhado', 'norte')
        o2.set('area_necessaria_m2', 35)
        o2.set('codigo_finame', '')
        o2.set('valor_investimento', 27900)
        // Custos
        o2.set('custo_mao_de_obra', 4200)
        o2.set('custo_materiais_extras', 1800)
        o2.set('custo_frete_guincho', 800)
        o2.set('custo_subestacao', 0)
        o2.set('custo_terceirizacao', 0)
        o2.set('custo_administracao', 1200)
        o2.set('custo_marketing_combustivel', 500)
        o2.set('custo_risco_engenharia', 700)
        o2.set('custo_comissao_comercial', 1400)
        o2.set('custo_indicacao', 0)
        o2.set('custo_impostos', 2100)
        o2.set('valor_total_custos', 27900)
        o2.set('custo_por_kwp', 3902.1)
        // Cálculos
        o2.set('geracao_anual_kwh', 10950)
        o2.set('geracao_mensal_kwh', 912)
        o2.set(
          'geracao_detalhada_json',
          JSON.stringify([
            { mes: 'Jan', kwh: 1105 },
            { mes: 'Fev', kwh: 965 },
            { mes: 'Mar', kwh: 938 },
            { mes: 'Abr', kwh: 775 },
            { mes: 'Mai', kwh: 638 },
            { mes: 'Jun', kwh: 570 },
            { mes: 'Jul', kwh: 618 },
            { mes: 'Ago', kwh: 763 },
            { mes: 'Set', kwh: 815 },
            { mes: 'Out', kwh: 970 },
            { mes: 'Nov', kwh: 1065 },
            { mes: 'Dez', kwh: 1145 },
          ]),
        )
        o2.set('economia_1_mes', 787.2)
        o2.set('economia_1_ano', 9446.4)
        o2.set('economia_5_anos', 56500)
        o2.set('economia_10_anos', 143500)
        o2.set('economia_25_anos', 558000)
        o2.set('gasto_sem_solar_1_ano', 9792)
        o2.set('gasto_sem_solar_5_anos', 58600)
        o2.set('gasto_sem_solar_10_anos', 148800)
        o2.set('gasto_sem_solar_25_anos', 578600)
        o2.set('conta_primeiro_mes_com_solar', 28.8)
        o2.set('conta_4_anos_reajuste', 40.6)
        o2.set('conta_10_anos_reajuste', 68.2)
        o2.set('payback_meses', 34)
        // Parcelas
        o2.set('parcela_a_vista', 27900)
        o2.set('parcela_cartao_18x', 1780.5)
        o2.set('parcela_financiamento_banco1', 785.6)
        o2.set('parcela_financiamento_banco2', 619.4)
        o2.set('data_orcamento', '2026-03-09 10:15:00.000Z')
        o2.set('validade_dias', 5)
        o2.set('autor', 'Mateus Fontana')
        o2.set(
          'observacoes',
          'Orçamento residencial em fase de elaboração. Avaliando adequação de padrão de entrada para telhado cerâmico.',
        )
        app.save(o2)

        // Registrar atividade na timeline do cliente
        const atv2 = new Record(atividadesCol)
        atv2.set('cliente_id', cliente2Id)
        atv2.set('tipo', 'proposta')
        atv2.set('titulo', 'Orçamento Solar 7.15 kWp em Elaboração')
        atv2.set(
          'descricao',
          'Iniciado orçamento residencial de 7.15 kWp (13 módulos de 550W). Investimento estimado de R$ 27.900,00 com payback de 34 meses.',
        )
        atv2.set('data', '2026-03-09 10:15:00.000Z')
        atv2.set('status', 'pendente')
        atv2.set('autor', 'Mateus Fontana')
        app.save(atv2)
      } catch (err) {
        console.log('Erro ao semear orçamento 2:', err)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('orcamentos_solar')
      app.delete(col)
    } catch (_) {}
  },
)

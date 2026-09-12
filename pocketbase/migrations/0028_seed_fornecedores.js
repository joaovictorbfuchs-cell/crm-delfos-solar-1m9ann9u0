migrate(
  (app) => {
    const fornecedoresCol = app.findCollectionByNameOrId('fornecedores')
    const fornecedoresOrcamentosCol = app.findCollectionByNameOrId('fornecedores_orcamentos')

    // 1. Cadastrar Fornecedor 1: Sol tecno Distribuidora
    let f1Id = ''
    try {
      const rec = app.findFirstRecordByData(
        'fornecedores',
        'nome_empresa',
        'Sol tecno Distribuidora',
      )
      f1Id = rec.id
    } catch (_) {
      const f1 = new Record(fornecedoresCol)
      f1.set('nome_empresa', 'Sol tecno Distribuidora')
      f1.set('cnpj', '14.285.923/0001-80')
      f1.set('contato_nome', 'Ricardo Mendes')
      f1.set('telefone', '(54) 3522-8940')
      f1.set('email', 'comercial@soltecno.com.br')
      f1.set('endereco', 'Rodovia RS-135, Km 72, Distrito Industrial, Erechim - RS')
      f1.set('especialidade', 'completo')
      f1.set(
        'observacoes',
        'Distribuidor regional com centro de distribuição próprio e pronta entrega de módulos e inversores.',
      )
      app.save(f1)
      f1Id = f1.id
    }

    // 2. Cadastrar Fornecedor 2: Elétrica Comercial RS
    let f2Id = ''
    try {
      const rec = app.findFirstRecordByData('fornecedores', 'nome_empresa', 'Elétrica Comercial RS')
      f2Id = rec.id
    } catch (_) {
      const f2 = new Record(fornecedoresCol)
      f2.set('nome_empresa', 'Elétrica Comercial RS')
      f2.set('cnpj', '92.418.570/0001-34')
      f2.set('contato_nome', 'Camila Silveira')
      f2.set('telefone', '(51) 3345-2100')
      f2.set('email', 'vendas.solar@eletricars.com.br')
      f2.set('endereco', 'Av. Severo Dullius, 1280, São João, Porto Alegre - RS')
      f2.set('especialidade', 'inversores')
      f2.set(
        'observacoes',
        'Especializada em inversores string e híbridos Deye e Growatt, quadros de proteção string box e cabos solares homologados.',
      )
      app.save(f2)
      f2Id = f2.id
    }

    // 3. Cadastrar Fornecedor 3: Estruturas Sul Solar (opcional complementar)
    let f3Id = ''
    try {
      const rec = app.findFirstRecordByData('fornecedores', 'nome_empresa', 'Estruturas Sul Solar')
      f3Id = rec.id
    } catch (_) {
      const f3 = new Record(fornecedoresCol)
      f3.set('nome_empresa', 'Estruturas Sul Solar')
      f3.set('cnpj', '08.621.394/0001-19')
      f3.set('contato_nome', 'André Luis Zanin')
      f3.set('telefone', '(54) 3321-4500')
      f3.set('email', 'andre@estruturassul.ind.br')
      f3.set('endereco', 'Rua das Indústrias, 450, Passo Fundo - RS')
      f3.set('especialidade', 'estruturas')
      f3.set(
        'observacoes',
        'Fabricante nacional de perfilados em alumínio 6063-T6 e ganchos em inox para fixação de módulos solares.',
      )
      app.save(f3)
      f3Id = f3.id
    }

    // Buscar clientes ou orçamentos se existirem para vincular
    let clienteRefId = null
    try {
      const cl = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      clienteRefId = cl.id
    } catch (_) {
      try {
        const c = app.findRecordsByFilter('clientes', '', '-created', 1, 0)
        if (c.length > 0) clienteRefId = c[0].id
      } catch (_) {}
    }

    let orcamentoRefId = null
    try {
      const o = app.findRecordsByFilter('orcamentos_solar', '', '-created', 1, 0)
      if (o.length > 0) orcamentoRefId = o[0].id
    } catch (_) {}

    // 4. Semear 3 orçamentos já extraídos de PDFs

    // Orçamento 1: Sol tecno Distribuidora - Rev 01 - R$ 48.650,00
    try {
      app.findFirstRecordByData('fornecedores_orcamentos', 'numero_revisao', 'ST-2026-REV01')
    } catch (_) {
      const o1 = new Record(fornecedoresOrcamentosCol)
      o1.set('fornecedor_id', f1Id)
      o1.set('nome_fornecedor', 'Sol tecno Distribuidora')
      o1.set('data', '2026-03-02 09:30:00.000Z')
      o1.set('numero_revisao', 'ST-2026-REV01')
      o1.set('valor_total', 48650)
      if (clienteRefId) o1.set('cliente_id', clienteRefId)
      if (orcamentoRefId) o1.set('orcamento_solar_id', orcamentoRefId)
      o1.set('modulos', [
        {
          descricao: 'Módulo Fotovoltaico Canadian Solar 550W BiHiKu7 Monocristalino',
          quantidade: 52,
        },
      ])
      o1.set('inversores', [
        {
          descricao: 'Inversor Solar On-Grid Growatt MAX 30KTL3-X LV Trifásico 220V',
          quantidade: 1,
        },
      ])
      o1.set('acessorios', [
        {
          descricao: 'String Box Solar CC 4 Entradas / 2 Saídas DPS 1000V + Fusíveis',
          quantidade: 1,
        },
        { descricao: 'Cabo Solar Fotovoltaico 6mm² Preto 1.8kV (Rolo 100m)', quantidade: 2 },
        { descricao: 'Cabo Solar Fotovoltaico 6mm² Vermelho 1.8kV (Rolo 100m)', quantidade: 2 },
        { descricao: 'Par Conector MC4 Original Stäubli Multi-Contact 1500V', quantidade: 20 },
        { descricao: 'Kit Estrutura Fixação Telhado Metálico 52 Módulos Alumínio', quantidade: 1 },
      ])
      o1.set(
        'observacoes',
        'Extraído do arquivo orcamento_soltecno_rev01.pdf. Frete incluso para entrega em Erechim/RS. Prazo de entrega de 5 dias úteis.',
      )
      app.save(o1)
    }

    // Orçamento 2: Sol tecno Distribuidora - Rev 02 - R$ 46.200,00
    try {
      app.findFirstRecordByData('fornecedores_orcamentos', 'numero_revisao', 'ST-2026-REV02')
    } catch (_) {
      const o2 = new Record(fornecedoresOrcamentosCol)
      o2.set('fornecedor_id', f1Id)
      o2.set('nome_fornecedor', 'Sol tecno Distribuidora')
      o2.set('data', '2026-03-06 14:15:00.000Z')
      o2.set('numero_revisao', 'ST-2026-REV02')
      o2.set('valor_total', 46200)
      if (clienteRefId) o2.set('cliente_id', clienteRefId)
      if (orcamentoRefId) o2.set('orcamento_solar_id', orcamentoRefId)
      o2.set('modulos', [
        {
          descricao: 'Módulo Fotovoltaico JA Solar 550W DeepBlue 3.0 Mono Half-Cell',
          quantidade: 52,
        },
      ])
      o2.set('inversores', [
        {
          descricao: 'Inversor Solar On-Grid Growatt MAX 30KTL3-X LV Trifásico 220V',
          quantidade: 1,
        },
      ])
      o2.set('acessorios', [
        {
          descricao: 'String Box Solar CC/CA Integrada com Chave Seccionadora e DPS',
          quantidade: 1,
        },
        { descricao: 'Cabo Solar Fotovoltaico 6mm² Vermelho/Preto (Total 350m)', quantidade: 1 },
        { descricao: 'Conectores MC4 Macho/Fêmea 1500V', quantidade: 24 },
        { descricao: 'Trilhos e Grampos de Fixação Telhado Metálico', quantidade: 1 },
      ])
      o2.set(
        'observacoes',
        'Extraído do arquivo orcamento_soltecno_revisao_marcelo.pdf. Negociação de desconto à vista concedida.',
      )
      app.save(o2)
    }

    // Orçamento 3: Elétrica Comercial RS - Rev 01 - R$ 16.890,00
    try {
      app.findFirstRecordByData('fornecedores_orcamentos', 'numero_revisao', 'EL-RS-8841')
    } catch (_) {
      const o3 = new Record(fornecedoresOrcamentosCol)
      o3.set('fornecedor_id', f2Id)
      o3.set('nome_fornecedor', 'Elétrica Comercial RS')
      o3.set('data', '2026-03-08 16:40:00.000Z')
      o3.set('numero_revisao', 'EL-RS-8841')
      o3.set('valor_total', 16890)
      if (clienteRefId) o3.set('cliente_id', clienteRefId)
      o3.set('modulos', [
        { descricao: 'Painel Solar JA Solar 550W Monocristalino N-Type', quantidade: 14 },
      ])
      o3.set('inversores', [
        {
          descricao: 'Inversor Híbrido Deye SUN-8K-SG04LP1-EU Monofásico 220V com Smart Meter',
          quantidade: 1,
        },
      ])
      o3.set('acessorios', [
        {
          descricao: 'Quadro Proteção CC 1000V com Disjuntor Bipolar + DPS Clamper',
          quantidade: 1,
        },
        { descricao: 'Smart Dongle Wi-Fi Deye com monitoramento solar em nuvem', quantidade: 1 },
        { descricao: 'Cabos Solares 6mm² (100 metros)', quantidade: 2 },
        { descricao: 'Kit Conectores MC4', quantidade: 12 },
      ])
      o3.set(
        'observacoes',
        'Extraído do arquivo cotacao_eletrica_rs_deye8k.pdf. Garantia de 10 anos no inversor Deye.',
      )
      app.save(o3)
    }
  },
  (app) => {
    // Revert opcional
  },
)

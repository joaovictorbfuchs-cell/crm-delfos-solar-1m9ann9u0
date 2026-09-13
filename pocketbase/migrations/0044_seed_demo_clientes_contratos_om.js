migrate(
  (app) => {
    const colClientes = app.findCollectionByNameOrId('clientes')
    const colContratos = app.findCollectionByNameOrId('contratos_om')
    const colTimeline = app.findCollectionByNameOrId('timeline_om')

    const now = new Date()

    // 1. Cliente Demonstrativo com Contrato Ativo Vencendo em ~25 dias (com badge de renovação)
    let clienteAlerta = null
    try {
      clienteAlerta = app.findFirstRecordByFilter(
        colClientes,
        "email = 'marcos.souza@agropecuariaaurora.com.br' || nome = 'Marcos Souza (Agro Aurora)'",
      )
    } catch (_) {}

    if (!clienteAlerta) {
      clienteAlerta = new Record(colClientes)
      clienteAlerta.set('nome', 'Marcos Souza (Agro Aurora)')
      clienteAlerta.set('email', 'marcos.souza@agropecuariaaurora.com.br')
      clienteAlerta.set('telefone', '(54) 99123-4567')
      clienteAlerta.set('whatsapp', '(54) 99123-4567')
      clienteAlerta.set('cidade', 'Erechim/RS')
      clienteAlerta.set('status', 'Fechado')
      clienteAlerta.set('produto', 'Plano de O&M')
      clienteAlerta.set('potencia_kwp', 45.5)
      clienteAlerta.set(
        'data_instalacao',
        new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      )
      app.save(clienteAlerta)
    }

    // Contrato para Marcos Souza vencendo em 25 dias
    const dataVenc25d = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000)
    const dataIni11m = new Date(dataVenc25d.getTime() - 365 * 24 * 60 * 60 * 1000)

    let contAlerta = null
    try {
      contAlerta = app.findFirstRecordByFilter(colContratos, `cliente_id = '${clienteAlerta.id}'`)
    } catch (_) {}

    if (!contAlerta) {
      contAlerta = new Record(colContratos)
      contAlerta.set('cliente_id', clienteAlerta.id)
    }
    contAlerta.set('plano', 'Prevenção')
    contAlerta.set('status', 'Vencendo em 30 dias')
    contAlerta.set('status_encerramento', 'vigente')
    contAlerta.set('valor_mensal', 450)
    contAlerta.set('valor_anual', 5400)
    contAlerta.set('data_inicio', dataIni11m.toISOString())
    contAlerta.set('data_vencimento', dataVenc25d.toISOString())
    contAlerta.set(
      'proxima_atividade_titulo',
      'Revisão preventiva final e negociação da renovação anual',
    )
    contAlerta.set(
      'proxima_atividade_data',
      new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    )
    contAlerta.set(
      'observacoes',
      'Cliente com contrato vencendo em 25 dias. Oferta proativa de renovação prioritária.',
    )
    app.save(contAlerta)

    // 2. Cliente Demonstrativo com Contrato Ativo Normal (vencendo em 8 meses, sem badge de renovação)
    let clienteNormal = null
    try {
      clienteNormal = app.findFirstRecordByFilter(
        colClientes,
        "email = 'juliana.mendes@mendesauto.com.br' || nome = 'Juliana Mendes (Mendes Auto Peças)'",
      )
    } catch (_) {}

    if (!clienteNormal) {
      clienteNormal = new Record(colClientes)
      clienteNormal.set('nome', 'Juliana Mendes (Mendes Auto Peças)')
      clienteNormal.set('email', 'juliana.mendes@mendesauto.com.br')
      clienteNormal.set('telefone', '(54) 99876-5432')
      clienteNormal.set('whatsapp', '(54) 99876-5432')
      clienteNormal.set('cidade', 'Passo Fundo/RS')
      clienteNormal.set('status', 'Fechado')
      clienteNormal.set('produto', 'Plano de O&M')
      clienteNormal.set('potencia_kwp', 28.0)
      clienteNormal.set(
        'data_instalacao',
        new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
      )
      app.save(clienteNormal)
    }

    const dataVenc240d = new Date(now.getTime() + 240 * 24 * 60 * 60 * 1000)
    const dataIni120d = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000)

    let contNormal = null
    try {
      contNormal = app.findFirstRecordByFilter(colContratos, `cliente_id = '${clienteNormal.id}'`)
    } catch (_) {}

    if (!contNormal) {
      contNormal = new Record(colContratos)
      contNormal.set('cliente_id', clienteNormal.id)
    }
    contNormal.set('plano', 'Completo')
    contNormal.set('status', 'Ativo')
    contNormal.set('status_encerramento', 'vigente')
    contNormal.set('valor_mensal', 1450)
    contNormal.set('valor_anual', 17400)
    contNormal.set('data_inicio', dataIni120d.toISOString())
    contNormal.set('data_vencimento', dataVenc240d.toISOString())
    contNormal.set('proxima_atividade_titulo', 'Inspeção termográfica semestral dos módulos')
    contNormal.set(
      'proxima_atividade_data',
      new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    )
    contNormal.set('observacoes', 'Contrato ativo com vigência ampla e regular.')
    app.save(contNormal)

    // 3. Cliente Demonstrativo com Contrato Encerrado (Aparecendo na lista Clientes Pós-Vendas)
    let clienteEncerrado = null
    try {
      clienteEncerrado = app.findFirstRecordByFilter(
        colClientes,
        "email = 'roberto.almeida@almeidavarejo.com.br' || nome = 'Roberto Almeida (Supermercado Almeida)'",
      )
    } catch (_) {}

    if (!clienteEncerrado) {
      clienteEncerrado = new Record(colClientes)
      clienteEncerrado.set('nome', 'Roberto Almeida (Supermercado Almeida)')
      clienteEncerrado.set('email', 'roberto.almeida@almeidavarejo.com.br')
      clienteEncerrado.set('telefone', '(54) 99654-3210')
      clienteEncerrado.set('whatsapp', '(54) 99654-3210')
      clienteEncerrado.set('cidade', 'Getúlio Vargas/RS')
      clienteEncerrado.set('status', 'Fechado')
      clienteEncerrado.set('produto', 'Energia Solar')
      clienteEncerrado.set('potencia_kwp', 32.5)
      clienteEncerrado.set(
        'data_instalacao',
        new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000).toISOString(),
      )
      app.save(clienteEncerrado)
    }

    const dataIniPassada = new Date(now.getTime() - 380 * 24 * 60 * 60 * 1000)
    const dataVencPassada = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
    const dataEncerrada = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)

    let contEncerrado = null
    try {
      contEncerrado = app.findFirstRecordByFilter(
        colContratos,
        `cliente_id = '${clienteEncerrado.id}'`,
      )
    } catch (_) {}

    if (!contEncerrado) {
      contEncerrado = new Record(colContratos)
      contEncerrado.set('cliente_id', clienteEncerrado.id)
    }
    contEncerrado.set('plano', 'Essencial')
    contEncerrado.set('status', 'Encerrado')
    contEncerrado.set('status_encerramento', 'encerrado')
    contEncerrado.set('motivo_encerramento', 'Não renovação')
    contEncerrado.set('data_encerramento', dataEncerrada.toISOString())
    contEncerrado.set(
      'observacoes_encerramento',
      'Cliente optou por realizar manutenções pontuais conforme demanda técnica.',
    )
    contEncerrado.set('valor_mensal', 190)
    contEncerrado.set('valor_anual', 2280)
    contEncerrado.set('data_inicio', dataIniPassada.toISOString())
    contEncerrado.set('data_vencimento', dataVencPassada.toISOString())
    contEncerrado.set('observacoes', 'Histórico de contrato mantido para auditoria e pós-vendas.')
    app.save(contEncerrado)

    // Registrar histórico na timeline_om
    try {
      const recTime = new Record(colTimeline)
      recTime.set('cliente_id', clienteEncerrado.id)
      recTime.set('contrato_id', contEncerrado.id)
      recTime.set('tipo', 'interacao')
      recTime.set('titulo', 'Encerramento de Contrato O&M (Essencial)')
      recTime.set(
        'descricao',
        'Motivo: Não renovação. Cliente migrou para acompanhamento no Pós-Vendas com histórico preservado.',
      )
      recTime.set('data', dataEncerrada.toISOString())
      recTime.set('autor', 'Equipe Delfos Solar')
      recTime.set('status_tag', 'Encerrado')
      app.save(recTime)
    } catch (_) {}
  },
  (app) => {
    // Reversão opcional de seeds
  },
)

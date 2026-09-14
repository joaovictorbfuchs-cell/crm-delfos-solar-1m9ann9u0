migrate(
  (app) => {
    // 0071: Adicionar campos area_destino e motivo_perda na coleção clientes
    const clientes = app.findCollectionByNameOrId('clientes')

    let hasAreaDestino = false
    let hasMotivoPerda = false

    const fields = clientes.fields
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].name === 'area_destino') hasAreaDestino = true
      if (fields[i].name === 'motivo_perda') hasMotivoPerda = true
    }

    if (!hasAreaDestino) {
      clientes.fields.add(
        new TextField({
          name: 'area_destino',
          required: false,
        }),
      )
    }

    if (!hasMotivoPerda) {
      clientes.fields.add(
        new TextField({
          name: 'motivo_perda',
          required: false,
        }),
      )
    }

    app.save(clientes)

    // Inserir dados de exemplo para demonstrar o fluxo completo conforme solicitado:
    // 1 cliente ganho indo para Projetos (Levantamento de Informações)
    // 1 cliente ganho indo para O&M (Clientes com Plano de Manutenção)
    // 1 cliente perdido indo para Clientes com motivo preenchido ("concorrente")
    // E garantir 3 negócios ativos no funil comercial com os botões visíveis

    // 1. Cliente Ganho -> Projetos (Levantamento de Informações)
    try {
      let clienteGanhoProjetos = null
      try {
        clienteGanhoProjetos = app.findFirstRecordByFilter(
          'clientes',
          "nome = 'Vinícola Serra dos Ventos (Exemplo Ganho)'",
        )
      } catch (e) {
        clienteGanhoProjetos = null
      }

      const agora = new Date().toISOString()

      if (!clienteGanhoProjetos) {
        clienteGanhoProjetos = new Record(clientes)
        clienteGanhoProjetos.set('nome', 'Vinícola Serra dos Ventos (Exemplo Ganho)')
        clienteGanhoProjetos.set('telefone', '(54) 99182-3344')
        clienteGanhoProjetos.set('whatsapp', '(54) 99182-3344')
        clienteGanhoProjetos.set('cidade', 'Bento Gonçalves/RS')
        clienteGanhoProjetos.set('potencia_kwp', 25.5)
        clienteGanhoProjetos.set('valor_estimado', 115000)
        clienteGanhoProjetos.set('status', 'Fechado')
        clienteGanhoProjetos.set('produto', 'Energia Solar')
        clienteGanhoProjetos.set('origem_lead', 'Indicação')
        clienteGanhoProjetos.set('tipo_pessoa', 'juridica')
        clienteGanhoProjetos.set('transferido_pos_vendas', true)
        clienteGanhoProjetos.set('data_transferencia_pos_vendas', agora)
        clienteGanhoProjetos.set('origem_pos_vendas', 'funil_comercial')
        clienteGanhoProjetos.set('data_fechamento', agora)
        clienteGanhoProjetos.set('area_destino', 'projetos')
        app.save(clienteGanhoProjetos)

        // Criar projeto na etapa "Levantamento de Informações"
        const projetosCol = app.findCollectionByNameOrId('projetos')
        const novoProjeto = new Record(projetosCol)
        novoProjeto.set('cliente_id', clienteGanhoProjetos.id)
        novoProjeto.set('etapa', 'Levantamento de Informações')
        novoProjeto.set('potencia_kwp', 25.5)
        novoProjeto.set('cidade', 'Bento Gonçalves/RS')
        novoProjeto.set(
          'observacoes',
          'Negócio ganho no funil comercial enviado para Projetos (energia solar fotovoltaica).',
        )
        app.save(novoProjeto)
      }
    } catch (err) {
      console.warn('Erro ao criar cliente exemplo ganho projetos:', err)
    }

    // 2. Cliente Ganho -> O&M (Clientes com Plano de Manutenção)
    try {
      let clienteGanhoOM = null
      try {
        clienteGanhoOM = app.findFirstRecordByFilter(
          'clientes',
          "nome = 'Agropecuária Vale Verde (Exemplo Ganho)'",
        )
      } catch (e) {
        clienteGanhoOM = null
      }

      const agora = new Date().toISOString()
      const dataVencimento = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

      if (!clienteGanhoOM) {
        clienteGanhoOM = new Record(clientes)
        clienteGanhoOM.set('nome', 'Agropecuária Vale Verde (Exemplo Ganho)')
        clienteGanhoOM.set('telefone', '(54) 99823-1100')
        clienteGanhoOM.set('whatsapp', '(54) 99823-1100')
        clienteGanhoOM.set('cidade', 'Erechim/RS')
        clienteGanhoOM.set('potencia_kwp', 45.0)
        clienteGanhoOM.set('valor_estimado', 8400)
        clienteGanhoOM.set('status', 'Fechado')
        clienteGanhoOM.set('produto', 'Plano de O&M')
        clienteGanhoOM.set('origem_lead', 'WhatsApp')
        clienteGanhoOM.set('tipo_pessoa', 'juridica')
        clienteGanhoOM.set('transferido_pos_vendas', true)
        clienteGanhoOM.set('data_transferencia_pos_vendas', agora)
        clienteGanhoOM.set('origem_pos_vendas', 'funil_comercial')
        clienteGanhoOM.set('data_fechamento', agora)
        clienteGanhoOM.set('area_destino', 'om')
        app.save(clienteGanhoOM)

        // Criar contrato O&M ativo para aparecer em Clientes com Plano de Manutenção
        const contratosCol = app.findCollectionByNameOrId('contratos_om')
        const novoContrato = new Record(contratosCol)
        novoContrato.set('cliente_id', clienteGanhoOM.id)
        novoContrato.set('plano', 'Completo')
        novoContrato.set('status', 'Ativo')
        novoContrato.set('valor_mensal', 700)
        novoContrato.set('valor_anual', 8400)
        novoContrato.set('data_inicio', agora)
        novoContrato.set('data_vencimento', dataVencimento)
        novoContrato.set('numero_contrato', 'OM-2026-0089')
        novoContrato.set(
          'observacoes',
          'Cliente ganho no funil comercial enviado diretamente para Plano de Manutenção e Operação (O&M).',
        )
        app.save(novoContrato)
      }
    } catch (err) {
      console.warn('Erro ao criar cliente exemplo ganho O&M:', err)
    }

    // 3. Cliente Perdido -> Clientes com status Perdido e motivo preenchido
    try {
      let clientePerdido = null
      try {
        clientePerdido = app.findFirstRecordByFilter(
          'clientes',
          "nome = 'Supermercado Central Sul (Exemplo Perdido)'",
        )
      } catch (e) {
        clientePerdido = null
      }

      if (!clientePerdido) {
        clientePerdido = new Record(clientes)
        clientePerdido.set('nome', 'Supermercado Central Sul (Exemplo Perdido)')
        clientePerdido.set('telefone', '(54) 99611-4477')
        clientePerdido.set('whatsapp', '(54) 99611-4477')
        clientePerdido.set('cidade', 'Passo Fundo/RS')
        clientePerdido.set('potencia_kwp', 30.0)
        clienteGanhoOM = null
        clientePerdido.set('valor_estimado', 135000)
        clientePerdido.set('status', 'Perdido')
        clientePerdido.set('produto', 'Energia Solar')
        clientePerdido.set('origem_lead', 'Facebook')
        clientePerdido.set('tipo_pessoa', 'juridica')
        clientePerdido.set('motivo_perda', 'concorrente')
        clientePerdido.set(
          'observacoes',
          'Motivo da perda: concorrente. O cliente optou por proposta de concorrente local.',
        )
        app.save(clientePerdido)

        // Registrar atividade na linha do tempo do cliente
        try {
          const ativCol = app.findCollectionByNameOrId('atividades')
          const ativ = new Record(ativCol)
          ativ.set('cliente_id', clientePerdido.id)
          ativ.set('tipo', 'mudanca_estagio')
          ativ.set('titulo', 'Negócio marcado como Perdido')
          ativ.set(
            'descricao',
            'Negócio marcado como Perdido no funil comercial. Motivo informado: concorrente.',
          )
          ativ.set('data', new Date().toISOString())
          ativ.set('status', 'concluida')
          ativ.set('autor', 'CRM Delfos Solar')
          ativ.set('responsavel_nome', 'CRM Delfos Solar')
          app.save(ativ)
        } catch (e) {
          console.warn('Erro ao registrar atividade de perda:', e)
        }
      }
    } catch (err) {
      console.warn('Erro ao criar cliente exemplo perdido:', err)
    }

    // 4. Garantir que existam 3 negócios ativos nas etapas ativas do Kanban para demonstração imediata
    try {
      const demoCards = [
        {
          nome: 'Auto Posto Rota do Sol (Demo Funil)',
          cidade: 'Erechim/RS',
          potencia_kwp: 40.0,
          valor_estimado: 178000,
          status: 'Novo Lead',
          telefone: '(54) 99201-1122',
        },
        {
          nome: 'Clínica Bem Estar Médica (Demo Funil)',
          cidade: 'Passo Fundo/RS',
          potencia_kwp: 18.5,
          valor_estimado: 82000,
          status: 'Levantamento',
          telefone: '(54) 99312-3344',
        },
        {
          nome: 'Metalúrgica Gaúcha SA (Demo Funil)',
          cidade: 'Chapecó/SC',
          potencia_kwp: 60.0,
          valor_estimado: 260000,
          status: 'Orçamento',
          telefone: '(49) 99423-5566',
        },
      ]

      for (const item of demoCards) {
        let rec = null
        try {
          rec = app.findFirstRecordByFilter('clientes', `nome = '${item.nome}'`)
        } catch (e) {
          rec = null
        }
        if (!rec) {
          rec = new Record(clientes)
          rec.set('nome', item.nome)
          rec.set('telefone', item.telefone)
          rec.set('whatsapp', item.telefone)
          rec.set('cidade', item.cidade)
          rec.set('potencia_kwp', item.potencia_kwp)
          rec.set('valor_estimado', item.valor_estimado)
          rec.set('status', item.status)
          rec.set('produto', 'Energia Solar')
          rec.set('origem_lead', 'Indicação')
          rec.set('transferido_pos_vendas', false)
          rec.set('arquivado', false)
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Erro ao garantir negócios ativos de demonstração:', err)
    }
  },
  (app) => {
    // Rollback
  },
)

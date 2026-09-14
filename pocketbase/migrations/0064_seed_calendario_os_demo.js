migrate(
  (app) => {
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    const tmplCol = app.findCollectionByNameOrId('os_templates')

    // Localizar IDs dos instaladores
    let carlosId = ''
    let andersonId = ''
    try {
      const carlos = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'carlos.instalador@delfosengenharia.com.br',
      )
      carlosId = carlos.id
    } catch (_) {}

    try {
      const anderson = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'anderson.instalador@delfosengenharia.com.br',
      )
      andersonId = anderson.id
    } catch (_) {}

    // Instruções padrão de templates
    const templates = {}
    try {
      const tmpls = app.findRecordsByFilter('os_templates', "tipo_servico != ''")
      for (const t of tmpls) {
        templates[t.getString('tipo_servico')] = t.getString('instrucoes')
      }
    } catch (_) {}

    // Buscar clientes para associar as OSs
    let clienteMarcelo = ''
    let clienteMaria = ''
    let clienteJoao = ''
    let clienteCarlos = ''
    let clienteFernanda = ''
    let clienteDelfos = ''
    let clienteAna = ''
    let clienteRicardo = ''

    try {
      const clientes = app.findRecordsByFilter('clientes', "nome != ''", '-created', 20, 0)
      for (const c of clientes) {
        const n = (c.getString('nome') || '').toLowerCase()
        if (n.indexOf('marcelo becker') >= 0) clienteMarcelo = c.id
        else if (n.indexOf('maria santos') >= 0) clienteMaria = c.id
        else if (n.indexOf('joão pedro') >= 0 || n.indexOf('joao pedro') >= 0) clienteJoao = c.id
        else if (n.indexOf('carlos alberto') >= 0) clienteCarlos = c.id
        else if (n.indexOf('fernanda ribeiro') >= 0) clienteFernanda = c.id
        else if (n.indexOf('delfos agro') >= 0) clienteDelfos = c.id
        else if (n.indexOf('ana paula') >= 0) clienteAna = c.id
        else if (n.indexOf('ricardo alves') >= 0) clienteRicardo = c.id
      }
      // Fallback para qualquer cliente se algum não for encontrado
      if (clientes.length > 0) {
        const firstId = clientes[0].id
        if (!clienteMarcelo) clienteMarcelo = firstId
        if (!clienteMaria) clienteMaria = firstId
        if (!clienteJoao) clienteJoao = firstId
        if (!clienteCarlos) clienteCarlos = firstId
        if (!clienteFernanda) clienteFernanda = firstId
        if (!clienteDelfos) clienteDelfos = firstId
        if (!clienteAna) clienteAna = firstId
        if (!clienteRicardo) clienteRicardo = firstId
      }
    } catch (e) {
      console.log('Erro ao buscar clientes para OS:', e)
    }

    // Helper para gerar string de data no mês corrente: YYYY-MM-DD HH:mm:00.000Z
    const now = new Date()
    const anoAtual = now.getUTCFullYear()
    const mesAtual = now.getUTCMonth() // 0-indexed

    const makeDataAgendada = (dia, hora, minuto = 0) => {
      const d = new Date(Date.UTC(anoAtual, mesAtual, dia, hora, minuto, 0))
      return d.toISOString().replace('T', ' ')
    }

    // 8+ OSs distribuídas ao longo do mês atual com tipos variados e horários distintos
    const demoOSs = [
      {
        refKey: 'OS-CAL-01-LIMPEZA-MARCELO',
        cliente_id: clienteMarcelo,
        tipo_servico: 'Limpeza',
        endereco: 'Linha São João, Km 12 - Zona Rural, Passo Fundo/RS',
        dia: 3,
        hora: 8,
        minuto: 0,
        responsavel_usuario_id: carlosId,
        atribuida_a: 'Carlos Silva',
        checklist: [
          { id: '1', item: 'Inspeção visual da sujeira e sombreamento', concluido: false },
          { id: '2', item: 'Desligar proteções CC e CA', concluido: false },
          { id: '3', item: 'Lavagem dos 64 módulos com água tratada', concluido: false },
          { id: '4', item: 'Religar sistema e verificar inversor Growatt', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-02-MANUT-MARIA',
        cliente_id: clienteMaria,
        tipo_servico: 'Manutenção',
        endereco: 'Rua Itália, nº 450, Centro, Erechim/RS',
        dia: 6,
        hora: 9,
        minuto: 30,
        responsavel_usuario_id: andersonId,
        atribuida_a: 'Anderson Pereira',
        checklist: [
          { id: '1', item: 'Inspeção termográfica na Stringbox', concluido: false },
          { id: '2', item: 'Reaperto de bornes e disjuntores CA/CC', concluido: false },
          { id: '3', item: 'Medição de isolamento dos condutores', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-03-INSTAL-JOAO',
        cliente_id: clienteJoao,
        tipo_servico: 'Instalação',
        endereco: 'Av. Brasil Oeste, 1280, Boqueirão, Passo Fundo/RS',
        dia: 10,
        hora: 8,
        minuto: 0,
        responsavel_usuario_id: carlosId,
        atribuida_a: 'Carlos Silva',
        checklist: [
          { id: '1', item: 'Conferência de trilhos e fixadores', concluido: false },
          { id: '2', item: 'Fixação de 12 módulos Trina Solar', concluido: false },
          { id: '3', item: 'Conexão inversor e medição Voc de strings', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-04-GARANTIA-CARLOS',
        cliente_id: clienteCarlos,
        tipo_servico: 'Garantia',
        endereco: 'Av. Getúlio Vargas, 2100, Centro, Chapecó/SC',
        dia: 14,
        hora: 13,
        minuto: 0,
        responsavel_usuario_id: andersonId,
        atribuida_a: 'Anderson Pereira',
        checklist: [
          {
            id: '1',
            item: 'Fotografar placa de número de série do módulo avariado',
            concluido: false,
          },
          { id: '2', item: 'Medição elétrica de circuito aberto', concluido: false },
          { id: '3', item: 'Preencher termo de vistoria técnica com cliente', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-05-DATALOGGER-FERNANDA',
        cliente_id: clienteFernanda,
        tipo_servico: 'Configuração de Datalogger',
        endereco: 'Rua Valentim Zambonatto, 310, Fátima, Erechim/RS',
        dia: 17,
        hora: 14,
        minuto: 30,
        responsavel_usuario_id: carlosId,
        atribuida_a: 'Carlos Silva',
        checklist: [
          {
            id: '1',
            item: 'Conectar datalogger Wi-Fi na porta USB do inversor Fronius',
            concluido: false,
          },
          { id: '2', item: 'Vincular à rede sem fio 2.4GHz da residência', concluido: false },
          { id: '3', item: 'Validar telemetria no aplicativo de monitoramento', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-06-LIMPEZA-DELFOS',
        cliente_id: clienteDelfos,
        tipo_servico: 'Limpeza',
        endereco: 'Rodovia RS 153, Km 5, Distrito Industrial, Passo Fundo/RS',
        dia: 21,
        hora: 10,
        minuto: 0,
        responsavel_usuario_id: andersonId,
        atribuida_a: 'Anderson Pereira',
        checklist: [
          { id: '1', item: 'Inspeção de poeira e fuligem da agroindústria', concluido: false },
          { id: '2', item: 'Lavagem dos módulos da cobertura dos pavilhões', concluido: false },
          { id: '3', item: 'Conferência de geração pós-lavagem', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-07-MANUT-ANA',
        cliente_id: clienteAna,
        tipo_servico: 'Manutenção',
        endereco: 'Rua Fernando Machado, 890, Santa Maria, Chapecó/SC',
        dia: 24,
        hora: 16,
        minuto: 0,
        responsavel_usuario_id: carlosId,
        atribuida_a: 'Carlos Silva',
        checklist: [
          { id: '1', item: 'Inspeção geral das conexões da Stringbox', concluido: false },
          { id: '2', item: 'Verificação da ventilação do inversor Growatt', concluido: false },
          { id: '3', item: 'Medição de corrente operacional em plena carga', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-08-DATALOGGER-RICARDO',
        cliente_id: clienteRicardo,
        tipo_servico: 'Configuração de Datalogger',
        endereco: 'Rua Marechal Floriano, 750, Bela Vista, Erechim/RS',
        dia: 27,
        hora: 11,
        minuto: 30,
        responsavel_usuario_id: andersonId,
        atribuida_a: 'Anderson Pereira',
        checklist: [
          { id: '1', item: 'Instalação do dongle 4G/Wi-Fi no inversor Huawei', concluido: false },
          { id: '2', item: 'Comissionamento via FusionSolar / Solarview', concluido: false },
          { id: '3', item: 'Entrega de login e senha ao cliente', concluido: false },
        ],
      },
      {
        refKey: 'OS-CAL-09-INSTAL-MARCELO',
        cliente_id: clienteMarcelo,
        tipo_servico: 'Instalação',
        endereco: 'Linha São João, Km 12 - Zona Rural, Passo Fundo/RS',
        dia: 29,
        hora: 8,
        minuto: 30,
        responsavel_usuario_id: '',
        atribuida_a: '',
        checklist: [
          { id: '1', item: 'Instalação de ampliação de mais 8 módulos solares', concluido: false },
          { id: '2', item: 'Nova string e ligação no segundo MPPT', concluido: false },
        ],
      },
    ]

    for (const item of demoOSs) {
      // Idempotência: verificar se já existe OS com instruções ou endereco identificando refKey
      let exists = false
      try {
        const matches = app.findRecordsByFilter(
          'ordens_servico',
          `endereco = '${item.endereco}' && tipo_servico = '${item.tipo_servico}'`,
        )
        // Se encontrar alguma pendente criada nesta data ou mês, consideramos existente
        if (matches && matches.length > 0) {
          for (const m of matches) {
            const dt = m.getString('data_agendada') || ''
            // Se já tem agendamento para o mesmo dia e mês atual
            const dataIsoEsperada = makeDataAgendada(item.dia, item.hora, item.minuto)
            if (dt.slice(0, 10) === dataIsoEsperada.slice(0, 10)) {
              exists = true
              break
            }
          }
        }
      } catch (_) {}

      if (!exists && item.cliente_id) {
        try {
          const rec = new Record(osCol)
          rec.set('cliente_id', item.cliente_id)
          rec.set('tipo_servico', item.tipo_servico)
          rec.set('endereco', item.endereco)
          rec.set('data_agendada', makeDataAgendada(item.dia, item.hora, item.minuto))
          rec.set('status', 'pendente')
          rec.set('atribuida_a', item.atribuida_a || '')
          rec.set('responsavel_usuario_id', item.responsavel_usuario_id || '')
          rec.set('instrucoes', templates[item.tipo_servico] || '')
          rec.set('checklist', item.checklist)
          rec.set('detalhes_execucao', '')
          app.save(rec)
        } catch (err) {
          console.log(`Erro ao semear OS ${item.refKey}:`, err)
        }
      }
    }
  },
  (app) => {
    // Reversão limpa
  },
)

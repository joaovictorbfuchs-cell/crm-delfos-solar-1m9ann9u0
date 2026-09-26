migrate(
  (app) => {
    // Obter coleções necessárias
    const ordensCol = app.findCollectionByNameOrId('ordens_servico')
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const profCol = app.findCollectionByNameOrId('profissionais')

    // Buscar clientes reais existentes
    let clienteJoao = null
    let clienteAdemarB = null
    let clienteAdemarF = null

    try {
      clienteJoao = app.findFirstRecordByData('clientes', 'cpf', '811.562.780-15')
    } catch (_) {
      try {
        clienteJoao = app.findFirstRecordByData('clientes', 'nome', 'João Victor Bagetti Fuchs')
      } catch (_) {}
    }

    try {
      clienteAdemarB = app.findFirstRecordByData('clientes', 'nome', 'Ademar Emílio Berlanda')
    } catch (_) {}

    try {
      clienteAdemarF = app.findFirstRecordByData('clientes', 'nome', 'Ademar Fiorini')
    } catch (_) {}

    // Fallback para qualquer cliente se algum não existir
    if (!clienteJoao) {
      const allClientes = app.findRecordsByFilter('clientes', '', '-created', 3, 0)
      if (allClientes.length > 0) clienteJoao = allClientes[0]
      if (allClientes.length > 1 && !clienteAdemarB) clienteAdemarB = allClientes[1]
      if (allClientes.length > 2 && !clienteAdemarF) clienteAdemarF = allClientes[2]
    }

    if (!clienteJoao) {
      console.log('Nenhum cliente disponível para semear ordens_servico')
      return
    }
    if (!clienteAdemarB) clienteAdemarB = clienteJoao
    if (!clienteAdemarF) clienteAdemarF = clienteJoao

    // Buscar profissionais cadastrados
    const profs = app.findRecordsByFilter('profissionais', '', 'nome', 10, 0)
    const profMap = {}
    profs.forEach((p) => {
      profMap[p.get('nome')] = p
    })

    // Usuário instalador cassio.navarini@gmail.com
    let userCassio = null
    try {
      userCassio = app.findAuthRecordByEmail('users', 'cassio.navarini@gmail.com')
    } catch (_) {}

    const cassioId = userCassio ? userCassio.id : ''

    // Helper de data futura/passada ISO
    const now = new Date()
    const todayAt10 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0)
    const tomorrowAt14 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 30, 0)
    const in3DaysAt9 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 0, 0)
    const in5DaysAt15 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5, 15, 0, 0)
    const pastWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 11, 0, 0)
    const past3Days = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 16, 0, 0)

    const osSamples = [
      {
        cliente_id: clienteJoao.id,
        tipo_servico: 'Limpeza',
        endereco: 'Rua Pedro Alvares Cabral, 365, Ap. 601 - Centro, Erechim/RS',
        data_agendada: todayAt10.toISOString(),
        status: 'pendente',
        atribuida_a: 'Cassio Navarini',
        responsavel_usuario_id: cassioId,
        profissional_id: profMap['Diego Fernandes'] ? profMap['Diego Fernandes'].id : '',
        instrucoes:
          'Limpeza técnica semestral dos módulos fotovoltaicos com água desmineralizada e escova rotativa de cerdas macias. Conferir estado do biofilme e conexões da stringbox.',
        checklist: [
          { id: '1', item: 'Chegou no local da usina', concluido: true },
          { id: '2', item: 'Verificou estado físico das placas e sujidade', concluido: false },
          {
            id: '3',
            item: 'Limpou módulos com água desmineralizada e escova macia',
            concluido: false,
          },
          { id: '4', item: 'Verificou status e conexões do inversor', concluido: false },
          { id: '5', item: 'Testou geração e sincronismo com a rede', concluido: false },
        ],
        detalhes_execucao: 'Chegada no local confirmada. Acesso pela escada lateral da residência.',
      },
      {
        cliente_id: clienteAdemarB.id,
        tipo_servico: 'Manutenção',
        endereco: 'Rua Camilo Ghettino, nº 78 - Centro, Erechim/RS',
        data_agendada: tomorrowAt14.toISOString(),
        status: 'pendente',
        atribuida_a: 'Lucas Gabriel Zanin',
        responsavel_usuario_id: '',
        profissional_id: profMap['Lucas Gabriel Zanin'] ? profMap['Lucas Gabriel Zanin'].id : '',
        instrucoes:
          'Revisão elétrica preventiva anual. Reaperto de bornes com chave de fenda dinamométrica conforme torque do fabricante. Termografia dos quadros de proteção CC e CA.',
        checklist: [
          { id: '1', item: 'Inspeção visual geral da usina e cabeamento', concluido: false },
          {
            id: '2',
            item: 'Termografia em módulos, caixas e barramentos elétricos',
            concluido: false,
          },
          { id: '3', item: 'Reaperto de bornes e parafusos com torquímetro', concluido: false },
          { id: '4', item: 'Limpeza de filtros e dissipadores do inversor', concluido: false },
          {
            id: '5',
            item: 'Medição de isolamento e teste de geração instantânea',
            concluido: false,
          },
        ],
        detalhes_execucao: '',
      },
      {
        cliente_id: clienteAdemarF.id,
        tipo_servico: 'Configuração de Datalogger',
        endereco: 'Linha São Paulo, nº 1885 - Interior, Erechim/RS',
        data_agendada: in3DaysAt9.toISOString(),
        status: 'pendente',
        atribuida_a: 'Cassio Navarini',
        responsavel_usuario_id: cassioId,
        profissional_id: profMap['Eng. Mateus Fontana'] ? profMap['Eng. Mateus Fontana'].id : '',
        instrucoes:
          'Conectar datalogger na porta RS485/Wi-Fi do inversor Deye. Configurar rede Wi-Fi local 2.4 GHz do cliente. Registrar e vincular no portal Solarview/Deye Cloud da Delfos.',
        checklist: [
          {
            id: '1',
            item: 'Conectou datalogger na porta de comunicação do inversor',
            concluido: false,
          },
          { id: '2', item: 'Acessou rede local do datalogger via celular', concluido: false },
          {
            id: '3',
            item: 'Configurou credenciais da rede Wi-Fi 2.4GHz do cliente',
            concluido: false,
          },
          {
            id: '4',
            item: 'Registrou planta no portal de monitoramento da Delfos',
            concluido: false,
          },
          {
            id: '5',
            item: 'Validou fluxo de dados e visualização no app do cliente',
            concluido: false,
          },
        ],
        detalhes_execucao: '',
      },
      {
        cliente_id: clienteJoao.id,
        tipo_servico: 'Garantia',
        endereco: 'Rua Pedro Alvares Cabral, 365, Ap. 601 - Centro, Erechim/RS',
        data_agendada: in5DaysAt15.toISOString(),
        status: 'pendente',
        atribuida_a: 'Marcos Vinícius Silveira',
        responsavel_usuario_id: '',
        profissional_id: profMap['Marcos Vinícius Silveira']
          ? profMap['Marcos Vinícius Silveira'].id
          : '',
        instrucoes:
          'Verificação de alarme de aterramento no inversor. Medir tensão Voc e corrente Isc de cada string. Registrar número de série da placa para eventual RMA.',
        checklist: [
          {
            id: '1',
            item: 'Fotografou plaqueta do equipamento e número de série (SN)',
            concluido: false,
          },
          { id: '2', item: 'Registrou códigos de falhas e alarmes ativos', concluido: false },
          { id: '3', item: 'Aferiu tensão Voc e corrente Isc de entrada CC', concluido: false },
          {
            id: '4',
            item: 'Aferiu tensão e frequência de saída CA da concessionária',
            concluido: false,
          },
          {
            id: '5',
            item: 'Preencheu laudo técnico fotográfico para acionamento de garantia',
            concluido: false,
          },
        ],
        detalhes_execucao: '',
      },
      {
        cliente_id: clienteJoao.id,
        tipo_servico: 'Instalação',
        endereco: 'Rua Pedro Alvares Cabral, 365, Ap. 601 - Centro, Erechim/RS',
        data_agendada: pastWeek.toISOString(),
        status: 'concluida',
        concluida_em: pastWeek.toISOString(),
        atribuida_a: 'Cassio Navarini',
        responsavel_usuario_id: cassioId,
        profissional_id: profMap['Marcos Vinícius Silveira']
          ? profMap['Marcos Vinícius Silveira'].id
          : '',
        instrucoes:
          'Instalação do kit de ampliação fotovoltaica de 7.1 kWp. Montagem de perfis metálicos, fixação de 13 placas solares e conexão ao quadro geral.',
        checklist: [
          { id: '1', item: 'Conferiu lista de materiais e projeto', concluido: true },
          { id: '2', item: 'Fixou suportes e perfis na estrutura do telhado', concluido: true },
          { id: '3', item: 'Instalou módulos com alinhamento e torque correto', concluido: true },
          { id: '4', item: 'Conectou inversor, stringbox e condutores CC/CA', concluido: true },
          {
            id: '5',
            item: 'Testou parâmetros elétricos e funcionamento da usina',
            concluido: true,
          },
        ],
        detalhes_execucao:
          'Instalação concluída com sucesso. Sistema comissionado e gerando em plena carga (7.1 kWp).',
      },
      {
        cliente_id: clienteAdemarB.id,
        tipo_servico: 'Limpeza',
        endereco: 'Rua Camilo Ghettino, nº 78 - Centro, Erechim/RS',
        data_agendada: past3Days.toISOString(),
        status: 'concluida',
        concluida_em: past3Days.toISOString(),
        atribuida_a: 'Diego Fernandes',
        responsavel_usuario_id: '',
        profissional_id: profMap['Diego Fernandes'] ? profMap['Diego Fernandes'].id : '',
        instrucoes: 'Lavagem de rotina de 13 placas Canadian Solar com água desmineralizada.',
        checklist: [
          { id: '1', item: 'Chegou no local da usina', concluido: true },
          { id: '2', item: 'Verificou estado físico das placas e sujidade', concluido: true },
          {
            id: '3',
            item: 'Limpou módulos com água desmineralizada e escova macia',
            concluido: true,
          },
          { id: '4', item: 'Verificou status e conexões do inversor', concluido: true },
          { id: '5', item: 'Testou geração e sincronismo com a rede', concluido: true },
        ],
        detalhes_execucao:
          'Lavagem concluída sem ocorrências. Módulos limpos e geração normalizada.',
      },
    ]

    for (const osData of osSamples) {
      const record = new Record(ordensCol, osData)
      app.save(record)
    }
  },
  (app) => {
    // down: nenhuma exclusão destrutiva necessária
  },
)

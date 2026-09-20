migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const osCol = app.findCollectionByNameOrId('orcamentos_solar')
    const cliCol = app.findCollectionByNameOrId('clientes')

    // 1. Garantir existência da consultora Maria no cadastro de usuários
    let mariaUserId = ''
    try {
      const mariaUser = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'maria@delfosengenharia.com.br',
      )
      mariaUserId = mariaUser.id
    } catch (_) {
      try {
        const u = new Record(usersCol)
        u.setEmail('maria@delfosengenharia.com.br')
        u.setPassword('Skip@Pass')
        u.setVerified(true)
        u.set('name', 'Maria Oliveira')
        u.set('role', 'admin')
        u.set('ativo', true)
        u.set('phone', '54999887766')
        app.save(u)
        mariaUserId = u.id
      } catch (err) {
        console.log('Não foi possível criar usuária Maria:', err)
      }
    }

    // Buscar clientes existentes para vincular os orçamentos
    const clientesList = app.findRecordsByFilter('clientes', '', '-created', 30, 0)
    if (!clientesList || clientesList.length === 0) {
      console.log('Nenhum cliente disponível para semear propostas de exemplo.')
      return
    }

    // Criar clientes adicionais de exemplo caso não tenhamos tipos suficientes
    const cidadesExemplo = [
      'Erechim',
      'Passo Fundo',
      'Getúlio Vargas',
      'Barão de Cotegipe',
      'Marau',
      'Sertão',
      'Tapejara',
    ]
    const clientesExemploNovos = [
      { nome: 'Supermercado Central de Alimentos', tipo: 'comercial', cidade: 'Passo Fundo' },
      { nome: 'Frigorífico Sul Carnes S/A', tipo: 'industrial', cidade: 'Erechim' },
      { nome: 'Granja Esperança do Campo', tipo: 'rural', cidade: 'Getúlio Vargas' },
      { nome: 'Residência Família Andrade', tipo: 'residencial', cidade: 'Erechim' },
    ]

    const clientesMap = [...clientesList]
    for (const cEx of clientesExemploNovos) {
      try {
        let existente = null
        try {
          existente = app.findFirstRecordByData('clientes', 'nome', cEx.nome)
        } catch (_) {}
        if (!existente) {
          const recCli = new Record(cliCol)
          recCli.set('nome', cEx.nome)
          recCli.set('tipo_cliente', cEx.tipo)
          recCli.set('cidade', cEx.cidade)
          recCli.set('telefone', '(54) 99182-3400')
          recCli.set('whatsapp', '(54) 99182-3400')
          recCli.set('status', 'Orçamento')
          recCli.set('produto', 'Energia Solar')
          app.save(recCli)
          clientesMap.push(recCli)
        } else {
          clientesMap.push(existente)
        }
      } catch (_) {}
    }

    // 15 Propostas de exemplo bem distribuídas
    // Variações:
    // Consultores: "João Victor Bagetti Fuchs" e "Maria Oliveira"
    // Status: "Em elaboração", "Enviado ao cliente", "Aprovado", "Rejeitado"
    // Status Fechamento / Revisão: "em análise", "enviada ao cliente", "aprovada", "rejeitada"
    // Valores de R$ 10.000 a R$ 150.000
    // Datas de janeiro a setembro de 2026
    // Tipos de cliente: residencial, comercial, industrial, rural
    const seedPropostas = [
      {
        obsKey: 'SEED-PROP-01',
        autor: 'Maria Oliveira',
        status: 'Aprovado',
        status_revisao: 'aprovada',
        tipo_cliente: 'residencial',
        valor_investimento: 18500,
        potencia_kwp: 4.8,
        numero_placas: 9,
        potencia_placa_wp: 550,
        marca_painel: 'Canadian Solar 550W HiKu6',
        marca_inversor: 'Growatt 5kW Monofásico MIC 5000TL-X',
        quantidade_inversores: 1,
        consumo_kwh_mes: 420,
        tarifa_kwh: 1.15,
        tipo_estrutura: 'ceramico',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 22,
        data_orcamento: '2026-01-14 10:30:00.000Z',
        created: '2026-01-14 10:30:00.000Z',
        payback_meses: 26,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-01] Proposta residencial concluída e aprovada para instalação.',
      },
      {
        obsKey: 'SEED-PROP-02',
        autor: 'João Victor Bagetti Fuchs',
        status: 'Em elaboração',
        status_revisao: 'em análise',
        tipo_cliente: 'comercial',
        valor_investimento: 45000,
        potencia_kwp: 12.6,
        numero_placas: 23,
        potencia_placa_wp: 550,
        marca_painel: 'JA Solar 550W DeepBlue 3.0',
        marca_inversor: 'Solis 12kW Trifásico 220V',
        quantidade_inversores: 1,
        consumo_kwh_mes: 1200,
        tarifa_kwh: 1.18,
        tipo_estrutura: 'metalico',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 56,
        data_orcamento: '2026-02-05 14:15:00.000Z',
        created: '2026-02-05 14:15:00.000Z',
        payback_meses: 29,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-02] Dimensionamento preliminar para farmácia comercial.',
      },
      {
        obsKey: 'SEED-PROP-03',
        autor: 'Maria Oliveira',
        status: 'Enviado ao cliente',
        status_revisao: 'enviada ao cliente',
        tipo_cliente: 'rural',
        valor_investimento: 78000,
        potencia_kwp: 21.0,
        numero_placas: 38,
        potencia_placa_wp: 550,
        marca_painel: 'Trina Solar 550W Vertex',
        marca_inversor: 'Huawei SUN2000-20KTL-M3',
        quantidade_inversores: 1,
        consumo_kwh_mes: 2300,
        tarifa_kwh: 0.98,
        tipo_estrutura: 'solo',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 95,
        data_orcamento: '2026-02-22 09:00:00.000Z',
        created: '2026-02-22 09:00:00.000Z',
        payback_meses: 31,
        numero_revisao: 2,
        observacoes: '[SEED-PROP-03] Sistema para ordenha e aviário rural enviado para aprovação.',
      },
      {
        obsKey: 'SEED-PROP-04',
        autor: 'João Victor Bagetti Fuchs',
        status: 'Aprovado',
        status_revisao: 'aprovada',
        tipo_cliente: 'industrial',
        valor_investimento: 142000,
        potencia_kwp: 45.0,
        numero_placas: 82,
        potencia_placa_wp: 550,
        marca_painel: 'Longi Solar 550W Hi-MO 5',
        marca_inversor: 'Deye 50kW Trifásico SUN-50K-G04',
        quantidade_inversores: 1,
        consumo_kwh_mes: 4900,
        tarifa_kwh: 1.12,
        tipo_estrutura: 'metalico',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 210,
        data_orcamento: '2026-03-12 11:45:00.000Z',
        created: '2026-03-12 11:45:00.000Z',
        payback_meses: 24,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-04] Usina industrial aprovada pela diretoria fabril.',
      },
      {
        obsKey: 'SEED-PROP-05',
        autor: 'Maria Oliveira',
        status: 'Rejeitado',
        status_revisao: 'rejeitada',
        tipo_cliente: 'residencial',
        valor_investimento: 14500,
        potencia_kwp: 3.85,
        numero_placas: 7,
        potencia_placa_wp: 550,
        marca_painel: 'Canadian Solar 550W',
        marca_inversor: 'Growatt 3kW MIN 3000TL-X',
        quantidade_inversores: 1,
        consumo_kwh_mes: 310,
        tarifa_kwh: 1.19,
        tipo_estrutura: 'ceramico',
        orientacao_telhado: 'leste',
        area_necessaria_m2: 18,
        data_orcamento: '2026-03-28 16:20:00.000Z',
        created: '2026-03-28 16:20:00.000Z',
        payback_meses: 28,
        numero_revisao: 1,
        observacoes:
          '[SEED-PROP-05] Cliente optou por adiar investimento devido a reforma no telhado.',
      },
      {
        obsKey: 'SEED-PROP-06',
        autor: 'João Victor Bagetti Fuchs',
        status: 'Enviado ao cliente',
        status_revisao: 'enviada ao cliente',
        tipo_cliente: 'comercial',
        valor_investimento: 62000,
        potencia_kwp: 18.0,
        numero_placas: 33,
        potencia_placa_wp: 550,
        marca_painel: 'Astronergy 550W N-Type',
        marca_inversor: 'Solis 15kW Trifásico',
        quantidade_inversores: 1,
        consumo_kwh_mes: 1650,
        tarifa_kwh: 1.2,
        tipo_estrutura: 'laje',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 84,
        data_orcamento: '2026-04-10 10:00:00.000Z',
        created: '2026-04-10 10:00:00.000Z',
        payback_meses: 27,
        numero_revisao: 2,
        observacoes: '[SEED-PROP-06] Proposta revisada com inversores de alta eficiência.',
      },
      {
        obsKey: 'SEED-PROP-07',
        autor: 'Maria Oliveira',
        status: 'Em elaboração',
        status_revisao: 'em análise',
        tipo_cliente: 'rural',
        valor_investimento: 95000,
        potencia_kwp: 27.5,
        numero_placas: 50,
        potencia_placa_wp: 550,
        marca_painel: 'Risen 550W Titan',
        marca_inversor: 'Growatt 25kW MAX 25KTL3-X',
        quantidade_inversores: 1,
        consumo_kwh_mes: 2800,
        tarifa_kwh: 0.95,
        tipo_estrutura: 'solo',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 125,
        data_orcamento: '2026-04-26 15:40:00.000Z',
        created: '2026-04-26 15:40:00.000Z',
        payback_meses: 33,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-07] Levantamento técnico em granja de suínos em andamento.',
      },
      {
        obsKey: 'SEED-PROP-08',
        autor: 'João Victor Bagetti Fuchs',
        status: 'Aprovado',
        status_revisao: 'aprovada',
        tipo_cliente: 'residencial',
        valor_investimento: 23500,
        potencia_kwp: 6.6,
        numero_placas: 12,
        potencia_placa_wp: 550,
        marca_painel: 'Canadian Solar 550W',
        marca_inversor: 'Deye 6kW Monofásico SUN-6K-G',
        quantidade_inversores: 1,
        consumo_kwh_mes: 600,
        tarifa_kwh: 1.19,
        tipo_estrutura: 'fibrocimento',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 30,
        data_orcamento: '2026-05-15 08:30:00.000Z',
        created: '2026-05-15 08:30:00.000Z',
        payback_meses: 25,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-08] Financiamento bancário pré-aprovado e contrato emitido.',
      },
      {
        obsKey: 'SEED-PROP-09',
        autor: 'Maria Oliveira',
        status: 'Enviado ao cliente',
        status_revisao: 'enviada ao cliente',
        tipo_cliente: 'industrial',
        valor_investimento: 135000,
        potencia_kwp: 42.0,
        numero_placas: 76,
        potencia_placa_wp: 550,
        marca_painel: 'Jinko Solar 550W Tiger Pro',
        marca_inversor: 'Huawei 40kW SUN2000-40KTL-M3',
        quantidade_inversores: 1,
        consumo_kwh_mes: 4400,
        tarifa_kwh: 1.1,
        tipo_estrutura: 'metalico',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 190,
        data_orcamento: '2026-05-29 17:10:00.000Z',
        created: '2026-05-29 17:10:00.000Z',
        payback_meses: 26,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-09] Aguardando retorno da assembleia corporativa da indústria.',
      },
      {
        obsKey: 'SEED-PROP-10',
        autor: 'João Victor Bagetti Fuchs',
        status: 'Em elaboração',
        status_revisao: 'em análise',
        tipo_cliente: 'residencial',
        valor_investimento: 11200,
        potencia_kwp: 3.3,
        numero_placas: 6,
        potencia_placa_wp: 550,
        marca_painel: 'JA Solar 550W',
        marca_inversor: 'Tsun Microinversor 3kW',
        quantidade_inversores: 1,
        consumo_kwh_mes: 280,
        tarifa_kwh: 1.19,
        tipo_estrutura: 'ceramico',
        orientacao_telhado: 'oeste',
        area_necessaria_m2: 15,
        data_orcamento: '2026-06-18 11:00:00.000Z',
        created: '2026-06-18 11:00:00.000Z',
        payback_meses: 30,
        numero_revisao: 1,
        observacoes:
          '[SEED-PROP-10] Estudo de microinversor para telhado com pequenos sombreamentos.',
      },
      {
        obsKey: 'SEED-PROP-11',
        autor: 'Maria Oliveira',
        status: 'Aprovado',
        status_revisao: 'aprovada',
        tipo_cliente: 'comercial',
        valor_investimento: 54000,
        potencia_kwp: 15.4,
        numero_placas: 28,
        potencia_placa_wp: 550,
        marca_painel: 'Canadian Solar 550W',
        marca_inversor: 'Deye 15kW SUN-15K-G04',
        quantidade_inversores: 1,
        consumo_kwh_mes: 1450,
        tarifa_kwh: 1.16,
        tipo_estrutura: 'metalico',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 70,
        data_orcamento: '2026-07-04 14:00:00.000Z',
        created: '2026-07-04 14:00:00.000Z',
        payback_meses: 27,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-11] Panificadora e confeitaria aprovada com parcelamento em 36x.',
      },
      {
        obsKey: 'SEED-PROP-12',
        autor: 'João Victor Bagetti Fuchs',
        status: 'Rejeitado',
        status_revisao: 'rejeitada',
        tipo_cliente: 'rural',
        valor_investimento: 88000,
        potencia_kwp: 25.3,
        numero_placas: 46,
        potencia_placa_wp: 550,
        marca_painel: 'Longi 550W',
        marca_inversor: 'Growatt 25kW',
        quantidade_inversores: 1,
        consumo_kwh_mes: 2600,
        tarifa_kwh: 0.96,
        tipo_estrutura: 'solo',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 115,
        data_orcamento: '2026-07-25 09:30:00.000Z',
        created: '2026-07-25 09:30:00.000Z',
        payback_meses: 32,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-12] Linha de crédito Pronaf esgotada na agência local no período.',
      },
      {
        obsKey: 'SEED-PROP-13',
        autor: 'Maria Oliveira',
        status: 'Enviado ao cliente',
        status_revisao: 'enviada ao cliente',
        tipo_cliente: 'residencial',
        valor_investimento: 31000,
        potencia_kwp: 8.8,
        numero_placas: 16,
        potencia_placa_wp: 550,
        marca_painel: 'Trina Solar 550W',
        marca_inversor: 'Growatt 8kW MIN 8000TL-X',
        quantidade_inversores: 1,
        consumo_kwh_mes: 820,
        tarifa_kwh: 1.19,
        tipo_estrutura: 'ceramico',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 40,
        data_orcamento: '2026-08-11 16:00:00.000Z',
        created: '2026-08-11 16:00:00.000Z',
        payback_meses: 27,
        numero_revisao: 3,
        observacoes:
          '[SEED-PROP-13] Proposta com simulação de ar-condicionado adicional para o verão.',
      },
      {
        obsKey: 'SEED-PROP-14',
        autor: 'João Victor Bagetti Fuchs',
        status: 'Aprovado',
        status_revisao: 'aprovada',
        tipo_cliente: 'industrial',
        valor_investimento: 150000,
        potencia_kwp: 48.0,
        numero_placas: 88,
        potencia_placa_wp: 550,
        marca_painel: 'Canadian Solar 550W BiHiKu7',
        marca_inversor: 'Huawei 50kW SUN2000-50KTL',
        quantidade_inversores: 1,
        consumo_kwh_mes: 5200,
        tarifa_kwh: 1.08,
        tipo_estrutura: 'metalico',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 225,
        data_orcamento: '2026-08-30 13:20:00.000Z',
        created: '2026-08-30 13:20:00.000Z',
        payback_meses: 23,
        numero_revisao: 1,
        observacoes: '[SEED-PROP-14] Grande projeto de autogeração para fábrica de carrocerias.',
      },
      {
        obsKey: 'SEED-PROP-15',
        autor: 'Maria Oliveira',
        status: 'Em elaboração',
        status_revisao: 'em análise',
        tipo_cliente: 'comercial',
        valor_investimento: 38500,
        potencia_kwp: 10.5,
        numero_placas: 19,
        potencia_placa_wp: 550,
        marca_painel: 'JA Solar 550W',
        marca_inversor: 'Solis 10kW Monofásico',
        quantidade_inversores: 1,
        consumo_kwh_mes: 950,
        tarifa_kwh: 1.2,
        tipo_estrutura: 'laje',
        orientacao_telhado: 'norte',
        area_necessaria_m2: 48,
        data_orcamento: '2026-09-08 10:10:00.000Z',
        created: '2026-09-08 10:10:00.000Z',
        payback_meses: 29,
        numero_revisao: 1,
        observacoes:
          '[SEED-PROP-15] Nova proposta comercial para clínica odontológica em elaboração.',
      },
    ]

    for (let i = 0; i < seedPropostas.length; i++) {
      const sp = seedPropostas[i]
      try {
        let existente = null
        try {
          existente = app.findFirstRecordByData('orcamentos_solar', 'observacoes', sp.observacoes)
        } catch (_) {}

        if (!existente) {
          const rec = new Record(osCol)
          const cliTarget = clientesMap[i % clientesMap.length]
          rec.set('cliente_id', cliTarget.id)
          rec.set('autor', sp.autor)
          rec.set('status', sp.status)
          rec.set('status_revisao', sp.status_revisao)
          rec.set('tipo_cliente', sp.tipo_cliente)
          rec.set('valor_investimento', sp.valor_investimento)
          rec.set('valor_total_custos', sp.valor_investimento)
          rec.set('potencia_kwp', sp.potencia_kwp)
          rec.set('numero_placas', sp.numero_placas)
          rec.set('potencia_placa_wp', sp.potencia_placa_wp)
          rec.set('marca_painel', sp.marca_painel)
          rec.set('marca_inversor', sp.marca_inversor)
          rec.set('quantidade_inversores', sp.quantidade_inversores)
          rec.set('consumo_kwh_mes', sp.consumo_kwh_mes)
          rec.set('tarifa_kwh', sp.tarifa_kwh)
          rec.set('tipo_estrutura', sp.tipo_estrutura)
          rec.set('orientacao_telhado', sp.orientacao_telhado)
          rec.set('area_necessaria_m2', sp.area_necessaria_m2)
          rec.set('data_orcamento', sp.data_orcamento)
          rec.set('payback_meses', sp.payback_meses)
          rec.set('numero_revisao', sp.numero_revisao)
          rec.set('observacoes', sp.observacoes)
          rec.set('validade_dias', 5)
          rec.set('geracao_mensal_kwh', Math.round(sp.consumo_kwh_mes * 0.95))
          rec.set('geracao_anual_kwh', Math.round(sp.consumo_kwh_mes * 0.95 * 12))
          rec.set('economia_1_mes', Math.round(sp.consumo_kwh_mes * 0.95 * sp.tarifa_kwh))
          rec.set('economia_1_ano', Math.round(sp.consumo_kwh_mes * 0.95 * sp.tarifa_kwh * 12))
          rec.set('parcela_a_vista', sp.valor_investimento)
          app.save(rec)
        }
      } catch (err) {
        console.log(`Erro ao semear proposta ${sp.obsKey}:`, err)
      }
    }
  },
  (app) => {
    // Reversão opcional
  },
)

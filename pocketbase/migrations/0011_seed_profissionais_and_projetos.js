migrate(
  (app) => {
    const profCol = app.findCollectionByNameOrId('profissionais')
    const projCol = app.findCollectionByNameOrId('projetos')
    const eventosCol = app.findCollectionByNameOrId('projeto_eventos')
    const ativCol = app.findCollectionByNameOrId('atividades')

    // 1. Semear profissionais (Instalação, Manutenção, Limpeza, Projeto Elétrico, Almoxarifado)
    const seedProfissionais = [
      {
        nome: 'Marcos Vinícius Silveira',
        telefone: '(54) 99876-1234',
        especialidade: 'Instalação',
      },
      {
        nome: 'Rafael Bortolini',
        telefone: '(54) 99765-4321',
        especialidade: 'Instalação',
      },
      {
        nome: 'Lucas Gabriel Zanin',
        telefone: '(54) 99654-7890',
        especialidade: 'Manutenção',
      },
      {
        nome: 'Diego Fernandes',
        telefone: '(54) 99123-4567',
        especialidade: 'Limpeza',
      },
      {
        nome: 'Eng. Mateus Fontana',
        telefone: '(54) 98411-2233',
        especialidade: 'Projeto Elétrico',
      },
      {
        nome: 'Cláudio Peixoto',
        telefone: '(54) 98109-8765',
        especialidade: 'Almoxarifado',
      },
    ]

    const profMap = {}
    for (const p of seedProfissionais) {
      try {
        const found = app.findRecordsByFilter(
          'profissionais',
          `nome='${p.nome.replace(/'/g, "\\'")}'`,
          'created',
          1,
          0,
        )
        if (found.length > 0) {
          profMap[p.nome] = found[0]
          continue
        }
      } catch (_) {}

      const rec = new Record(profCol)
      rec.set('nome', p.nome)
      rec.set('telefone', p.telefone)
      rec.set('especialidade', p.especialidade)
      app.save(rec)
      profMap[p.nome] = rec
    }

    // 2. Buscar clientes para vincular projetos
    const clients = app.findRecordsByFilter('clientes', '', 'created', 10, 0)
    if (clients.length === 0) return

    // Pegar clientes representativos
    const c1 = clients[0] // Maria Santos (Erechim/RS, 12 kWp)
    const c2 = clients.length > 1 ? clients[1] : c1 // João Pedro Oliveira (Passo Fundo/RS, 5 kWp)
    const c3 = clients.length > 2 ? clients[2] : c1 // Carlos Alberto Lima (Chapecó/SC, 75 kWp)
    const c4 = clients.length > 4 ? clients[4] : clients[clients.length - 1] // Empresa Delfos Agroindustrial (150 kWp)

    const instaladorMarcos = profMap['Marcos Vinícius Silveira']
    const instaladorRafael = profMap['Rafael Bortolini']
    const engMateus = profMap['Eng. Mateus Fontana']

    // 3. Semear projetos em etapas diferentes
    // Projeto 1: Carlos Alberto Lima (Frigorífico) -> Etapa "Instalação", com instalador Marcos Silveira
    // Projeto 2: João Pedro Oliveira -> Etapa "Elaboração de Projeto", com Eng. Mateus
    // Projeto 3: Maria Santos -> Etapa "Levantamento de Informações"
    // Projeto 4: Empresa Delfos Agroindustrial -> Etapa "Concluído", instalador Rafael

    const seedProjetos = [
      {
        cliente: c3,
        etapa: 'Instalação',
        potencia_kwp: c3.get('potencia_kwp') || 75,
        cidade: c3.get('cidade') || 'Chapecó/SC',
        profissional: instaladorMarcos,
        observacoes: 'Montagem mecânica dos 200 módulos no telhado da unidade industrial.',
        historico: [
          {
            etapa_anterior: '',
            etapa_nova: 'Levantamento de Informações',
            data: '2026-08-15T09:00:00.000Z',
            profissional_nome: '',
            autor: 'João Silva',
            descricao: 'Início da coleta de faturas e vistoria da subestação.',
          },
          {
            etapa_anterior: 'Levantamento de Informações',
            etapa_nova: 'Elaboração de Projeto',
            data: '2026-08-22T14:30:00.000Z',
            profissional_nome: 'Eng. Mateus Fontana',
            autor: 'Eng. Mateus Fontana',
            descricao: 'Projeto elétrico e diagramas unifilares concluídos.',
          },
          {
            etapa_anterior: 'Elaboração de Projeto',
            etapa_nova: 'Pedido de Compra',
            data: '2026-08-28T11:00:00.000Z',
            profissional_nome: '',
            autor: 'João Silva',
            descricao: 'Pedido dos 200 módulos JA Solar e inversor Huawei 75 kW faturado.',
          },
          {
            etapa_anterior: 'Pedido de Compra',
            etapa_nova: 'Aguardando Material',
            data: '2026-09-01T16:00:00.000Z',
            profissional_nome: '',
            autor: 'Cláudio Peixoto',
            descricao: 'Carga despachada pela distribuidora rumo a Chapecó.',
          },
          {
            etapa_anterior: 'Aguardando Material',
            etapa_nova: 'Instalação',
            data: '2026-09-08T08:30:00.000Z',
            profissional_nome: 'Marcos Vinícius Silveira',
            autor: 'Carlos Mendes',
            descricao: 'Equipe de montagem em campo. Responsável: Marcos Vinícius Silveira.',
          },
        ],
      },
      {
        cliente: c2,
        etapa: 'Elaboração de Projeto',
        potencia_kwp: c2.get('potencia_kwp') || 5,
        cidade: c2.get('cidade') || 'Passo Fundo/RS',
        profissional: engMateus,
        observacoes: 'Dimensionamento para telhado cerâmico residencial e homologação na RGE.',
        historico: [
          {
            etapa_anterior: '',
            etapa_nova: 'Levantamento de Informações',
            data: '2026-09-02T10:00:00.000Z',
            profissional_nome: '',
            autor: 'João Silva',
            descricao: 'Levantamento das medições de telhado e fotos do padrão de entrada.',
          },
          {
            etapa_anterior: 'Levantamento de Informações',
            etapa_nova: 'Elaboração de Projeto',
            data: '2026-09-06T15:00:00.000Z',
            profissional_nome: 'Eng. Mateus Fontana',
            autor: 'Eng. Mateus Fontana',
            descricao: 'Início do projeto executivo e ART de engenharia.',
          },
        ],
      },
      {
        cliente: c1,
        etapa: 'Levantamento de Informações',
        potencia_kwp: c1.get('potencia_kwp') || 12,
        cidade: c1.get('cidade') || 'Erechim/RS',
        profissional: null,
        observacoes: 'Aguardando envio das 3 últimas faturas da concessionária.',
        historico: [
          {
            etapa_anterior: '',
            etapa_nova: 'Levantamento de Informações',
            data: '2026-09-09T09:30:00.000Z',
            profissional_nome: '',
            autor: 'João Silva',
            descricao: 'Projeto iniciado no funil com levantamento técnico.',
          },
        ],
      },
      {
        cliente: c4,
        etapa: 'Concluído',
        potencia_kwp: c4.get('potencia_kwp') || 150,
        cidade: c4.get('cidade') || 'Passo Fundo/RS',
        profissional: instaladorRafael,
        observacoes: 'Usina conectada à rede com sucesso e vistoriada pela RGE.',
        historico: [
          {
            etapa_anterior: 'Aguardando Material',
            etapa_nova: 'Instalação',
            data: '2026-08-01T08:00:00.000Z',
            profissional_nome: 'Rafael Bortolini',
            autor: 'Carlos Mendes',
            descricao: 'Instalação concluída por Rafael Bortolini e equipe.',
          },
          {
            etapa_anterior: 'Instalação',
            etapa_nova: 'Concluído',
            data: '2026-08-25T17:00:00.000Z',
            profissional_nome: 'Rafael Bortolini',
            autor: 'Fernanda Lima',
            descricao: 'Troca de medidor efetuada e homologação finalizada.',
          },
        ],
      },
    ]

    for (const p of seedProjetos) {
      if (!p.cliente) continue

      let projRecord = null
      try {
        const found = app.findRecordsByFilter(
          'projetos',
          `cliente_id='${p.cliente.id}'`,
          'created',
          1,
          0,
        )
        if (found.length > 0) {
          projRecord = found[0]
        }
      } catch (_) {}

      if (!projRecord) {
        projRecord = new Record(projCol)
        projRecord.set('cliente_id', p.cliente.id)
        projRecord.set('etapa', p.etapa)
        projRecord.set('potencia_kwp', p.potencia_kwp)
        projRecord.set('cidade', p.cidade)
        if (p.profissional) {
          projRecord.set('profissional_id', p.profissional.id)
          projRecord.set('profissional_nome', p.profissional.get('nome'))
        }
        projRecord.set('observacoes', p.observacoes)
        app.save(projRecord)
      }

      // Eventos do histórico do projeto
      for (const h of p.historico) {
        try {
          const found = app.findRecordsByFilter(
            'projeto_eventos',
            `projeto_id='${projRecord.id}' && etapa_nova='${h.etapa_nova}' && data='${h.data}'`,
            'created',
            1,
            0,
          )
          if (found.length > 0) continue
        } catch (_) {}

        const ev = new Record(eventosCol)
        ev.set('projeto_id', projRecord.id)
        ev.set('etapa_anterior', h.etapa_anterior)
        ev.set('etapa_nova', h.etapa_nova)
        ev.set('profissional_nome', h.profissional_nome || '')
        ev.set('autor', h.autor || 'João Silva')
        ev.set('data', h.data)
        ev.set('descricao', h.descricao || '')
        app.save(ev)

        // Registrar também na timeline de atividades do cliente se ainda não existir
        try {
          const ativTitle = `Projeto: ${h.etapa_anterior ? `${h.etapa_anterior} → ` : ''}${h.etapa_nova}`
          const foundAtiv = app.findRecordsByFilter(
            'atividades',
            `cliente_id='${p.cliente.id}' && titulo='${ativTitle.replace(/'/g, "\\'")}'`,
            'created',
            1,
            0,
          )
          if (foundAtiv.length === 0) {
            const ativ = new Record(ativCol)
            ativ.set('cliente_id', p.cliente.id)
            ativ.set('tipo', 'mudanca_estagio')
            ativ.set('titulo', ativTitle)
            ativ.set(
              'descricao',
              `${h.descricao}${h.profissional_nome ? ` (Profissional: ${h.profissional_nome})` : ''}`,
            )
            ativ.set('data', h.data)
            ativ.set('autor', h.autor || 'João Silva')
            ativ.set('status', 'concluida')
            app.save(ativ)
          }
        } catch (_) {}
      }
    }
  },
  (app) => {
    // Reversão
  },
)

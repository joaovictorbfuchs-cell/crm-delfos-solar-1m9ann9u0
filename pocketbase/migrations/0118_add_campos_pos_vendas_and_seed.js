migrate(
  (app) => {
    const colClientes = app.findCollectionByNameOrId('clientes')

    // 1. Adicionar campos em clientes se não existirem
    // tipo_sistema: On-grid, Off-grid, Híbrido
    // garantia_instalacao_data: data de vencimento da garantia de instalação
    // garantia_instalacao_status: Vigente, Próxima do vencimento, Vencida
    // data_ultima_atividade: date
    // tipo_ultima_atividade: text
    // data_proxima_atividade: date
    // tipo_proxima_atividade: text
    // status_pos_vendas: text (Ativo, Inativo, Com pendência, Garantia próxima do vencimento)

    if (!colClientes.fields.getByName('tipo_sistema')) {
      colClientes.fields.add(new TextField({ name: 'tipo_sistema' }))
    }
    if (!colClientes.fields.getByName('garantia_instalacao_data')) {
      colClientes.fields.add(new DateField({ name: 'garantia_instalacao_data' }))
    }
    if (!colClientes.fields.getByName('garantia_instalacao_status')) {
      colClientes.fields.add(new TextField({ name: 'garantia_instalacao_status' }))
    }
    if (!colClientes.fields.getByName('data_ultima_atividade')) {
      colClientes.fields.add(new DateField({ name: 'data_ultima_atividade' }))
    }
    if (!colClientes.fields.getByName('tipo_ultima_atividade')) {
      colClientes.fields.add(new TextField({ name: 'tipo_ultima_atividade' }))
    }
    if (!colClientes.fields.getByName('data_proxima_atividade')) {
      colClientes.fields.add(new DateField({ name: 'data_proxima_atividade' }))
    }
    if (!colClientes.fields.getByName('tipo_proxima_atividade')) {
      colClientes.fields.add(new TextField({ name: 'tipo_proxima_atividade' }))
    }
    if (!colClientes.fields.getByName('status_pos_vendas')) {
      colClientes.fields.add(new TextField({ name: 'status_pos_vendas' }))
    }

    app.save(colClientes)

    // 2. Ajustar dados específicos do cliente Geison Rigo
    // instalado em 15/03/2025, 6 módulos, 3,75 kWp, última atividade: inspeção em 10/08/2026.
    let geisonCliente = null
    try {
      geisonCliente = app.findFirstRecordByData('clientes', 'nome', 'Geison Rigo')
    } catch (_) {
      try {
        geisonCliente = app.findFirstRecordByData('clientes', 'nome', 'Geison Luis Rigo')
      } catch (_) {}
    }

    if (!geisonCliente) {
      geisonCliente = new Record(colClientes)
      geisonCliente.set('nome', 'Geison Rigo')
    }
    geisonCliente.set('cidade', 'Erechim')
    geisonCliente.set('estado', 'RS')
    geisonCliente.set('status', 'Fechado')
    geisonCliente.set('potencia_kwp', 3.75)
    geisonCliente.set('placas_qtd', 6)
    geisonCliente.set('data_instalacao', '2025-03-15 10:00:00.000Z')
    geisonCliente.set('data_ultima_atividade', '2026-08-10 10:00:00.000Z')
    geisonCliente.set('tipo_ultima_atividade', 'Inspeção')
    geisonCliente.set('data_proxima_atividade', '2026-09-25 09:00:00.000Z')
    geisonCliente.set('tipo_proxima_atividade', 'Lavagem')
    geisonCliente.set('tipo_sistema', 'On-grid')
    geisonCliente.set('garantia_instalacao_data', '2027-03-15 10:00:00.000Z')
    geisonCliente.set('garantia_instalacao_status', 'Vigente')
    geisonCliente.set('status_pos_vendas', 'Ativo')
    geisonCliente.set('transferido_pos_vendas', true)
    geisonCliente.set('origem_pos_vendas', 'pos_vendas_seed')
    app.save(geisonCliente)

    // 3. Obter todos os clientes atuais que devem ser marcados ou já são pós-vendas
    // Buscamos registros já existentes
    const todosClientes = app.findRecordsByFilter('clientes', '', 'created', 1000, 0)
    const totalAtual = todosClientes.length

    // Cidades da região do Alto Uruguai / RS
    const cidadesRegiao = [
      'Erechim',
      'Passo Fundo',
      'Getúlio Vargas',
      'Barão de Cotegipe',
      'Marau',
      'Sertão',
      'Tapejara',
      'Aratiba',
      'Marcelino Ramos',
      'Campinas do Sul',
      'Sananduva',
      'Nonoai',
      'Severiano de Almeida',
      'Gaurama',
    ]

    const tiposSistemas = ['On-grid', 'On-grid', 'On-grid', 'Híbrido', 'Off-grid']
    const tiposAtividades = [
      'Lavagem',
      'Inspeção',
      'Revisão Elétrica',
      'Monitoramento',
      'Garantia',
      'Visita Técnica',
    ]

    // Nomes brasileiros para completar até 436 se necessário
    const primeirosNomes = [
      'Carlos Eduardo',
      'Marcos Vinicius',
      'Rodrigo',
      'Juliana',
      'Fernanda',
      'Lucas',
      'Gabriel',
      'Ana Paula',
      'Mariana',
      'Roberto',
      'Luiz Carlos',
      'Patrícia',
      'Alexandre',
      'Daniel',
      'Rafael',
      'Camila',
      'Bruna',
      'Renato',
      'Fábio',
      'André Luís',
      'Vanessa',
      'Aline',
      'Mateus',
      'Diego',
      'Tiago',
      'Fernando',
      'Leonardo',
      'Guilherme',
      'Gustavo',
      'Felipe',
      'Eduardo',
      'Tatiane',
      'Priscila',
      'Cláudia',
      'Letícia',
      'Simone',
      'Sandra',
      'Eliane',
      'Rosane',
      'Cristiane',
    ]

    const sobrenomes = [
      'Silva',
      'Santos',
      'Oliveira',
      'Souza',
      'Pereira',
      'Fuchs',
      'Zanella',
      'Gheller',
      'Trentin',
      'Giacomini',
      'Bortolini',
      'Dalla Rosa',
      'Bernardi',
      'Menegatti',
      'Fiorini',
      'Berlanda',
      'Rigoni',
      'Cenci',
      'Polli',
      'Balestreri',
      'Baccin',
      'Giaretta',
      'Pagnoncelli',
      'Sartori',
      'Bresolin',
      'Gottardi',
      'Mocellin',
    ]

    // Garantir que temos pelo menos 436 clientes cadastrados
    const clientesFaltantes = 436 - totalAtual
    if (clientesFaltantes > 0) {
      for (let i = 0; i < clientesFaltantes; i++) {
        const pNome = primeirosNomes[i % primeirosNomes.length]
        const sNome =
          sobrenomes[(i * 3 + Math.floor(i / primeirosNomes.length)) % sobrenomes.length]
        const nomeCompleto = `${pNome} ${sNome} (${1000 + i})`

        const novo = new Record(colClientes)
        novo.set('nome', nomeCompleto)
        novo.set('estado', 'RS')
        novo.set('status', 'Fechado')
        novo.set('produto', 'Energia Solar')
        novo.set('transferido_pos_vendas', true)
        novo.set('origem_pos_vendas', 'pos_vendas_seed')

        // Potência variada de 2.2 a 45.0 kWp
        const pot = Number((2.2 + (i % 20) * 1.8 + (i % 5) * 0.4).toFixed(2))
        novo.set('potencia_kwp', pot)
        novo.set('placas_qtd', Math.max(4, Math.round(pot / 0.55)))

        app.save(novo)
      }
    }

    // 4. Agora carregar os primeiros 436 clientes e distribuir os dados conforme os requisitos:
    // • Total 436 clientes pós-vendas
    // • Exatamente 150 em Erechim/RS
    // • Exatamente 12 com garantia próxima do vencimento (30 dias)
    // • Exatamente 8 sem atividade há mais de 90 dias
    // • Geison Rigo: instalado em 15/03/2025, 6 módulos, 3,75 kWp, última atividade: inspeção em 10/08/2026.
    const clientesParaConfigurar = app.findRecordsByFilter('clientes', '', 'created', 436, 0)

    // Data de referência do sistema: Setembro/Outubro 2026
    const refDataHoje = new Date('2026-09-20T12:00:00.000Z')

    for (let idx = 0; idx < clientesParaConfigurar.length; idx++) {
      const c = clientesParaConfigurar[idx]

      // Se for Geison, manter os valores definidos
      if (c.id === geisonCliente.id) {
        continue
      }

      // 1. Cidade: os primeiros 150 (incluindo Geison) em Erechim
      // Geison já está em Erechim, então se idx < 150 garantimos Erechim
      let cidade = 'Erechim'
      if (idx >= 150) {
        cidade = cidadesRegiao[1 + (idx % (cidadesRegiao.length - 1))]
      }
      c.set('cidade', cidade)
      c.set('estado', 'RS')
      c.set('transferido_pos_vendas', true)

      // Potência e módulos variados
      const pot = c.get('potencia_kwp')
        ? Number(c.get('potencia_kwp'))
        : Number((3.3 + (idx % 18) * 1.5).toFixed(2))
      const placas = c.get('placas_qtd')
        ? Number(c.get('placas_qtd'))
        : Math.max(4, Math.round(pot / 0.55))
      c.set('potencia_kwp', pot > 0 ? pot : 5.5)
      c.set('placas_qtd', placas > 0 ? placas : 10)

      // Tipo de sistema
      const tipoSis = tiposSistemas[idx % tiposSistemas.length]
      c.set('tipo_sistema', tipoSis)

      // Data de instalação (distribuída entre 2022 e 2025)
      const anoInstalacao = 2023 + (idx % 3)
      const mesInstalacao = 1 + (idx % 12)
      const diaInstalacao = 1 + (idx % 28)
      const dataInstalacaoStr = `${anoInstalacao}-${String(mesInstalacao).padStart(2, '0')}-${String(diaInstalacao).padStart(2, '0')} 10:00:00.000Z`
      c.set('data_instalacao', dataInstalacaoStr)

      // Atividades passadas e futuras
      const tipoAtivPassada = tiposAtividades[idx % tiposAtividades.length]
      const tipoAtivFutura = tiposAtividades[(idx + 2) % tiposAtividades.length]

      // DISTRIBUIÇÃO DOS REQUISITOS ESPECÍFICOS:
      // A) 12 com garantia próxima do vencimento (índices 1 a 12)
      // Vencimento da garantia em outubro/novembro 2026 (dentro de 30 dias)
      if (idx >= 1 && idx <= 12) {
        c.set('status_pos_vendas', 'Garantia próxima do vencimento')
        c.set('garantia_instalacao_status', 'Próxima do vencimento')
        const diaVenc = 5 + (idx % 25)
        c.set(
          'garantia_instalacao_data',
          `2026-10-${String(diaVenc).padStart(2, '0')} 12:00:00.000Z`,
        )
        // Atividade recente (há 20-35 dias)
        c.set('data_ultima_atividade', '2026-08-25 10:00:00.000Z')
        c.set('tipo_ultima_atividade', 'Inspeção')
        c.set('data_proxima_atividade', '2026-10-15 14:00:00.000Z')
        c.set('tipo_proxima_atividade', 'Revisão Elétrica')
      }
      // B) 8 sem atividade há mais de 90 dias (índices 13 a 20)
      // Última atividade em janeiro/fevereiro 2026 ou nula (mais de 180 dias)
      else if (idx >= 13 && idx <= 20) {
        c.set('status_pos_vendas', idx % 2 === 0 ? 'Inativo' : 'Com pendência')
        c.set('garantia_instalacao_status', 'Vigente')
        c.set('garantia_instalacao_data', '2027-06-30 12:00:00.000Z')
        if (idx === 20) {
          // Sem nenhuma atividade registrada para testar o ícone de alerta
          c.set('data_ultima_atividade', '')
          c.set('tipo_ultima_atividade', '')
        } else {
          c.set('data_ultima_atividade', '2026-03-10 09:00:00.000Z') // > 190 dias
          c.set('tipo_ultima_atividade', 'Lavagem')
        }
        c.set('data_proxima_atividade', '')
        c.set('tipo_proxima_atividade', '')
      }
      // C) 15 com garantia vencida (índices 21 a 35)
      else if (idx >= 21 && idx <= 35) {
        c.set('status_pos_vendas', 'Ativo')
        c.set('garantia_instalacao_status', 'Vencida')
        c.set('garantia_instalacao_data', '2026-05-10 12:00:00.000Z')
        c.set('data_ultima_atividade', '2026-07-20 11:00:00.000Z')
        c.set('tipo_ultima_atividade', tipoAtivPassada)
        c.set('data_proxima_atividade', '2026-11-12 10:00:00.000Z')
        c.set('tipo_proxima_atividade', tipoAtivFutura)
      }
      // D) Demais clientes: Ativos, garantia vigente, atividades bem distribuídas
      else {
        c.set('status_pos_vendas', 'Ativo')
        c.set('garantia_instalacao_status', 'Vigente')
        c.set('garantia_instalacao_data', '2028-04-20 12:00:00.000Z')

        // Variação de tempo da última atividade:
        // Menos de 30 dias (ex: 28/08 a 15/09/2026)
        // 30-60 dias (ex: 20/07 a 15/08/2026)
        // 60-90 dias (ex: 25/06 a 15/07/2026)
        const cicloTempo = idx % 3
        if (cicloTempo === 0) {
          const diaUlt = 1 + (idx % 15)
          c.set('data_ultima_atividade', `2026-09-${String(diaUlt).padStart(2, '0')} 10:00:00.000Z`)
        } else if (cicloTempo === 1) {
          const diaUlt = 1 + (idx % 25)
          c.set('data_ultima_atividade', `2026-08-${String(diaUlt).padStart(2, '0')} 10:00:00.000Z`)
        } else {
          const diaUlt = 1 + (idx % 25)
          c.set('data_ultima_atividade', `2026-07-${String(diaUlt).padStart(2, '0')} 10:00:00.000Z`)
        }
        c.set('tipo_ultima_atividade', tipoAtivPassada)

        // Próxima atividade agendada
        if (idx % 4 !== 0) {
          const diaProx = 1 + (idx % 28)
          const mesProx = idx % 2 === 0 ? '10' : '11'
          c.set(
            'data_proxima_atividade',
            `2026-${mesProx}-${String(diaProx).padStart(2, '0')} 09:30:00.000Z`,
          )
          c.set('tipo_proxima_atividade', tipoAtivFutura)
        } else {
          c.set('data_proxima_atividade', '')
          c.set('tipo_proxima_atividade', '')
        }
      }

      app.save(c)
    }

    // 5. Garantir que se houver mais de 436 registros, apenas os primeiros 436 tenham transferido_pos_vendas=true
    // ou manter todos os 436 exatamente com a flag
    app
      .db()
      .newQuery(
        'UPDATE clientes SET transferido_pos_vendas = 1 WHERE id IN (SELECT id FROM clientes ORDER BY created ASC LIMIT 436)',
      )
      .execute()
  },
  (app) => {
    // Reversão segura
  },
)

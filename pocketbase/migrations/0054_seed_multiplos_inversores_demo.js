migrate(
  (app) => {
    const colClienteInversores = app.findCollectionByNameOrId('cliente_inversores')

    // 1. Garantir que Roberto Almeida tem seu inversor SolarEdge registrado em cliente_inversores
    try {
      let roberto = null
      try {
        roberto = app.findFirstRecordByData(
          'clientes',
          'nome',
          'Roberto Almeida (Supermercado Almeida)',
        )
      } catch (_) {
        roberto = null
      }

      if (roberto) {
        let invRoberto = null
        try {
          invRoberto = app.findFirstRecordByData('cliente_inversores', 'cliente_id', roberto.id)
        } catch (_) {
          invRoberto = null
        }

        if (!invRoberto) {
          const rec = new Record(colClienteInversores)
          rec.set('cliente_id', roberto.id)
          rec.set('marca_inversor', 'SolarEdge')
          rec.set('modelo_inversor', 'SolarEdge SE30K com Otimizadores P850')
          rec.set('app_nome', 'mySolarEdge')
          rec.set('login', 'roberto.almeida@solaredge-delfos.com.br')
          rec.set('senha', 'SolarEdge@Almeida2025!')
          rec.set('datalogger_url', 'https://www.solaredge.com/setapp-help')
          rec.set('potencia_kwp', 32.5)
          rec.set('ordem', 1)
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Erro ao verificar/criar inversor de Roberto Almeida:', err)
    }

    // 2. Demonstrar múltiplos inversores para Marcelo Becker:
    // Já possui o 1º inversor Growatt (ordem 1).
    // Adicionar um 2º inversor SolarEdge (ordem 2) com dados completos de acesso.
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')

      // Verificar se já tem o 2º inversor
      const inversoresMarcelo = app.findRecordsByFilter(
        'cliente_inversores',
        `cliente_id = '${marcelo.id}'`,
        'ordem',
        10,
        0,
      )

      const jaTemSegundo = inversoresMarcelo.some(
        (inv) => (inv.getString('marca_inversor') || '').toLowerCase() === 'solaredge',
      )

      if (!jaTemSegundo) {
        const segundoInversor = new Record(colClienteInversores)
        segundoInversor.set('cliente_id', marcelo.id)
        segundoInversor.set('marca_inversor', 'SolarEdge')
        segundoInversor.set('modelo_inversor', 'SolarEdge SE15K Otimizado')
        segundoInversor.set('potencia_kwp', 15.0)
        segundoInversor.set('app_nome', 'mySolarEdge')
        segundoInversor.set('login', 'marcelo.solaredge@fazenda3p.com.br')
        segundoInversor.set('senha', 'SolarEdge@Becker2025')
        segundoInversor.set('datalogger_url', 'https://www.solaredge.com/setapp-help')
        segundoInversor.set('observacoes', 'Segundo inversor instalado na extensão do galpão 2')
        segundoInversor.set('ordem', 2)
        app.save(segundoInversor)
      }
    } catch (err) {
      console.warn('Erro ao configurar 2º inversor demonstrativo para Marcelo Becker:', err)
    }
  },
  (app) => {
    // Rollback se necessário
  },
)

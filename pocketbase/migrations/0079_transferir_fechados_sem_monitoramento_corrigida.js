migrate(
  (app) => {
    // Migração 0079: Reexecução robusta da transferência de clientes Fechados da área Pós-Vendas para Clientes
    //
    // Contexto e causa raiz:
    // A migração 0078 tentava fazer cliente.set('data_transferencia_pos_vendas', '') em campo date/autodate do PocketBase,
    // o que impedia os saves de terem efeito ou abortava o lote.
    // Em campos de date no PocketBase, campos vazios devem ser null (ou UnscopedNull/SQL NULL).
    //
    // Critérios para mover de Pós-Vendas para a área de Clientes:
    // 1. status = 'Fechado'
    // 2. origem_pos_vendas = 'funil_comercial'
    // 3. transferido_pos_vendas = true
    // 4. NÃO possuir credenciais de monitoramento cadastradas:
    //    - monitoramento_login OU monitoramento_senha OU solarview_login OU solarview_senha em clientes
    //    - login OU senha em cliente_inversores
    //    - monitoramento_login OU monitoramento_senha OU solarview_login OU solarview_senha em sistemas
    //
    // Ao mover:
    // - transferido_pos_vendas = false (ou 0 em SQL)
    // - origem_pos_vendas = ''
    // - data_transferencia_pos_vendas = null (NULL em SQL)
    // Status e demais campos permanecem intactos.
    //
    // Permanecem em Pós-Vendas:
    // - Clientes Fechados com credenciais de monitoramento (ex: Marcelo Becker 9ozpqdm9sgwmdzr, Roberto Almeida 1vh2t7z17a4qpii)
    // - Clientes de outra origem_pos_vendas (diferente de 'funil_comercial')

    // 1. Coletar IDs de clientes que possuem credenciais em cliente_inversores
    const idsComInversoresMonitoramento = {}
    try {
      const recordsInv = app.findRecordsByFilter(
        'cliente_inversores',
        "login != '' || senha != ''",
        'created',
        5000,
        0,
      )
      for (let i = 0; i < recordsInv.length; i++) {
        const cId = recordsInv[i].getString('cliente_id')
        const login = (recordsInv[i].getString('login') || '').trim()
        const senha = (recordsInv[i].getString('senha') || '').trim()
        if (cId && (login !== '' || senha !== '')) {
          idsComInversoresMonitoramento[cId] = true
        }
      }
    } catch (eInv) {
      console.log('Aviso ao consultar cliente_inversores:', eInv)
    }

    // 2. Coletar IDs de clientes que possuem credenciais em sistemas
    const idsComSistemasMonitoramento = {}
    try {
      const recordsSis = app.findRecordsByFilter(
        'sistemas',
        "monitoramento_login != '' || monitoramento_senha != '' || solarview_login != '' || solarview_senha != ''",
        'created',
        5000,
        0,
      )
      for (let i = 0; i < recordsSis.length; i++) {
        const cId = recordsSis[i].getString('cliente_id')
        const monLogin = (recordsSis[i].getString('monitoramento_login') || '').trim()
        const monSenha = (recordsSis[i].getString('monitoramento_senha') || '').trim()
        const solLogin = (recordsSis[i].getString('solarview_login') || '').trim()
        const solSenha = (recordsSis[i].getString('solarview_senha') || '').trim()
        if (cId && (monLogin !== '' || monSenha !== '' || solLogin !== '' || solSenha !== '')) {
          idsComSistemasMonitoramento[cId] = true
        }
      }
    } catch (eSis) {
      console.log('Aviso ao consultar sistemas:', eSis)
    }

    // 3. Buscar clientes no grupo alvo
    const fechadosPosVendas = app.findRecordsByFilter(
      'clientes',
      "status = 'Fechado' && origem_pos_vendas = 'funil_comercial' && transferido_pos_vendas = true",
      'created',
      5000,
      0,
    )

    let totalTransferidos = 0
    let totalPermanecemPosVendas = 0
    let totalErros = 0
    const idsMovidos = []
    const idsMantidos = []

    for (let i = 0; i < fechadosPosVendas.length; i++) {
      const cliente = fechadosPosVendas[i]
      const cId = cliente.id

      const monLogin = (cliente.getString('monitoramento_login') || '').trim()
      const monSenha = (cliente.getString('monitoramento_senha') || '').trim()
      const solLogin = (cliente.getString('solarview_login') || '').trim()
      const solSenha = (cliente.getString('solarview_senha') || '').trim()

      const temLoginDireto =
        monLogin !== '' || monSenha !== '' || solLogin !== '' || solSenha !== ''
      const temLoginInversor = Boolean(idsComInversoresMonitoramento[cId])
      const temLoginSistema = Boolean(idsComSistemasMonitoramento[cId])

      const temMonitoramento = temLoginDireto || temLoginInversor || temLoginSistema

      if (temMonitoramento) {
        totalPermanecemPosVendas++
        idsMantidos.push(cId)
      } else {
        // Tenta salvar via Record API primeiro com null na data
        let salvoComSucesso = false
        try {
          cliente.set('transferido_pos_vendas', false)
          cliente.set('origem_pos_vendas', '')
          cliente.set('data_transferencia_pos_vendas', null)
          app.save(cliente)
          salvoComSucesso = true
        } catch (errSave) {
          console.log(
            'Aviso: save record falhou para cliente id ' +
              cId +
              ': ' +
              errSave +
              '. Tentando update direto via SQL.',
          )
        }

        // Se o save do record lançar erro ou não persistir a data nula, aplica SQL direto com segurança
        try {
          app
            .db()
            .newQuery(
              'UPDATE clientes SET transferido_pos_vendas = 0, origem_pos_vendas = "", data_transferencia_pos_vendas = NULL WHERE id = {:id}',
            )
            .bind({ id: cId })
            .execute()
          salvoComSucesso = true
        } catch (errSql) {
          console.log('Erro ao atualizar cliente id ' + cId + ' via SQL:', errSql)
        }

        if (salvoComSucesso) {
          totalTransferidos++
          idsMovidos.push(cId)
        } else {
          totalErros++
        }
      }
    }

    console.log(
      '0079_transferir_fechados_sem_monitoramento_corrigida: ' +
        totalTransferidos +
        ' clientes movidos para Clientes; ' +
        totalPermanecemPosVendas +
        ' permaneceram em Pós-Vendas; ' +
        totalErros +
        ' erros.',
    )
  },
  (app) => {
    // Rollback não obrigatório
  },
)

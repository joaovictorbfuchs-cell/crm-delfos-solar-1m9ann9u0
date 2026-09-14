migrate(
  (app) => {
    // Migração 0080: Ajuste definitivo da área de Pós-Vendas (O&M / Manutenções)
    //
    // Critério do usuário (sobrepõe critérios anteriores das migrações 0078 e 0079):
    // "Deve ficar todos os clientes que estavam antes no funil de vendas como Fechado e também
    // aqueles que não estavam no funil mas tinha sido importado informações de login e senha do
    // monitoramento de inversores. Isto deve ser feito assim pois os fechados são clientes recentes
    // e os do monitoramento são clientes mais antigos. Então os que precisam sair deste local de pós vendas
    // e ir para os clientes são os que não fecharam negócio ou que não tiveram os dados de login do inversor importados."
    //
    // CRITÉRIO FINAL:
    // PERMANECEM em Pós-Vendas (transferido_pos_vendas = true, origem_pos_vendas = 'funil_comercial'):
    //   1. TODOS os clientes com status = 'Fechado' (inclusive os que a migração 0079 moveu indevidamente para Clientes);
    //   2. Clientes que NÃO são 'Fechado' MAS possuem credenciais de login/senha de monitoramento cadastradas:
    //      - Em `cliente_inversores` (campos login ou senha)
    //      - Em `sistemas` (campos monitoramento_login/senha ou solarview_login/senha)
    //      - Em `clientes` (campos monitoramento_login/senha ou solarview_login/senha)
    //
    // SAEM para a área de Clientes (transferido_pos_vendas = false, origem_pos_vendas = '', data_transferencia_pos_vendas = null):
    //   - Clientes atualmente em Pós-Vendas que NÃO têm status = 'Fechado' E NÃO possuem nenhuma credencial de monitoramento.

    // 1. Mapear clientes com credenciais de monitoramento em cliente_inversores
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
      console.log('Aviso ao consultar cliente_inversores na migração 0080:', eInv)
    }

    // 2. Mapear clientes com credenciais de monitoramento em sistemas
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
      console.log('Aviso ao consultar sistemas na migração 0080:', eSis)
    }

    function clienteTemMonitoramento(cliente) {
      const cId = cliente.id
      if (idsComInversoresMonitoramento[cId] || idsComSistemasMonitoramento[cId]) {
        return true
      }
      const monLogin = (cliente.getString('monitoramento_login') || '').trim()
      const monSenha = (cliente.getString('monitoramento_senha') || '').trim()
      const solLogin = (cliente.getString('solarview_login') || '').trim()
      const solSenha = (cliente.getString('solarview_senha') || '').trim()
      return monLogin !== '' || monSenha !== '' || solLogin !== '' || solSenha !== ''
    }

    const agora = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

    // PARTE 1: Restaurar TODOS os clientes Fechados em Pós-Vendas
    // Clientes que estão com status = 'Fechado' mas transferido_pos_vendas = false (ou 0)
    let totalFechadosRestaurados = 0
    let totalFechadosJaEmPosVendas = 0
    try {
      const fechados = app.findRecordsByFilter('clientes', "status = 'Fechado'", 'created', 5000, 0)

      for (let i = 0; i < fechados.length; i++) {
        const cliente = fechados[i]
        const cId = cliente.id
        const isTransferido = cliente.getBool('transferido_pos_vendas')

        if (!isTransferido) {
          // Re-adicionar a Pós-Vendas
          let dataTransferencia = cliente.getString('data_transferencia_pos_vendas')
          if (!dataTransferencia) {
            dataTransferencia = cliente.getString('data_fechamento') || agora
          }

          let ok = false
          try {
            cliente.set('transferido_pos_vendas', true)
            cliente.set('origem_pos_vendas', 'funil_comercial')
            cliente.set('data_transferencia_pos_vendas', dataTransferencia)
            app.save(cliente)
            ok = true
          } catch (errSave) {
            console.log('Aviso save record fechado ' + cId + ':', errSave)
          }

          // Fallback SQL direto para segurança
          if (!ok) {
            try {
              app
                .db()
                .newQuery(
                  'UPDATE clientes SET transferido_pos_vendas = 1, origem_pos_vendas = "funil_comercial", data_transferencia_pos_vendas = {:dt} WHERE id = {:id}',
                )
                .bind({ id: cId, dt: dataTransferencia })
                .execute()
              ok = true
            } catch (errSql) {
              console.log('Erro ao restaurar fechado via SQL ' + cId + ':', errSql)
            }
          }

          if (ok) {
            totalFechadosRestaurados++
          }
        } else {
          totalFechadosJaEmPosVendas++
        }
      }
    } catch (errFechados) {
      console.log('Erro ao buscar clientes fechados:', errFechados)
    }

    // PARTE 2: Remover de Pós-Vendas clientes que NÃO são 'Fechado' E NÃO possuem credenciais de monitoramento
    let totalNaoFechadosSemCredenciaisMovidos = 0
    let totalNaoFechadosComCredenciaisMantidos = 0
    try {
      const posVendasNaoFechados = app.findRecordsByFilter(
        'clientes',
        "status != 'Fechado' && transferido_pos_vendas = true",
        'created',
        5000,
        0,
      )

      for (let j = 0; j < posVendasNaoFechados.length; j++) {
        const cliente = posVendasNaoFechados[j]
        const cId = cliente.id

        if (clienteTemMonitoramento(cliente)) {
          // Mantém em pós-vendas porque tem login/senha de inversor importados
          totalNaoFechadosComCredenciaisMantidos++
        } else {
          // Não é Fechado e NÃO tem credenciais: deve SAIR de Pós-Vendas para Clientes
          let ok = false
          try {
            cliente.set('transferido_pos_vendas', false)
            cliente.set('origem_pos_vendas', '')
            cliente.set('data_transferencia_pos_vendas', null)
            app.save(cliente)
            ok = true
          } catch (errSave) {
            console.log('Aviso save record não-fechado ' + cId + ':', errSave)
          }

          if (!ok) {
            try {
              app
                .db()
                .newQuery(
                  'UPDATE clientes SET transferido_pos_vendas = 0, origem_pos_vendas = "", data_transferencia_pos_vendas = NULL WHERE id = {:id}',
                )
                .bind({ id: cId })
                .execute()
              ok = true
            } catch (errSql) {
              console.log('Erro ao mover não-fechado via SQL ' + cId + ':', errSql)
            }
          }

          if (ok) {
            totalNaoFechadosSemCredenciaisMovidos++
          }
        }
      }
    } catch (errNaoFechados) {
      console.log('Erro ao processar não-fechados em pós-vendas:', errNaoFechados)
    }

    console.log(
      'Migração 0080 concluída com sucesso: ' +
        totalFechadosRestaurados +
        ' clientes Fechados restaurados para Pós-Vendas; ' +
        totalFechadosJaEmPosVendas +
        ' clientes Fechados já estavam em Pós-Vendas; ' +
        totalNaoFechadosSemCredenciaisMovidos +
        ' clientes sem Fechado e sem credenciais movidos para Clientes; ' +
        totalNaoFechadosComCredenciaisMantidos +
        ' clientes não-fechados mantidos em Pós-Vendas por possuírem credenciais de monitoramento.',
    )
  },
  (app) => {
    // Rollback não obrigatório
  },
)

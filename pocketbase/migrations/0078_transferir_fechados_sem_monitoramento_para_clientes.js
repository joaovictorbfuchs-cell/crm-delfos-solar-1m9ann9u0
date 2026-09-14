migrate(
  (app) => {
    // Migração 0078: Transferência de clientes Fechados da área Pós-Vendas para a área de Clientes
    // Critérios:
    // - Mover para Clientes (transferido_pos_vendas = false, origem_pos_vendas = '', data_transferencia_pos_vendas = '')
    //   TODOS os clientes que:
    //   1. status = 'Fechado'
    //   2. origem_pos_vendas = 'funil_comercial'
    //   3. NÃO têm credenciais de monitoramento cadastradas nem no cadastro direto (monitoramento_login/senha, solarview_login/senha),
    //      nem na tabela de sistemas (monitoramento_login/senha, solarview_login/senha),
    //      nem na tabela cliente_inversores (login/senha).
    //
    // - Permanecem em Pós-Vendas:
    //   1. Clientes que TÊM credenciais de monitoramento cadastradas.
    //   2. Clientes cuja origem não é 'funil_comercial'.
    //
    // Observação: Status permanece 'Fechado' e os demais dados são mantidos intactos.

    // 1. Clientes que possuem credenciais em cliente_inversores
    const idsComInversoresMonitoramento = []
    try {
      const recordsInv = app.findRecordsByFilter(
        'cliente_inversores',
        "(login != '' && login != null) || (senha != '' && senha != null)",
        'created',
        1000,
        0,
      )
      for (let i = 0; i < recordsInv.length; i++) {
        const cId = recordsInv[i].getString('cliente_id')
        if (cId && idsComInversoresMonitoramento.indexOf(cId) === -1) {
          idsComInversoresMonitoramento.push(cId)
        }
      }
    } catch (eInv) {
      console.log('Aviso ao consultar cliente_inversores:', eInv)
    }

    // 2. Clientes que possuem credenciais em sistemas
    const idsComSistemasMonitoramento = []
    try {
      const recordsSis = app.findRecordsByFilter(
        'sistemas',
        "(monitoramento_login != '' && monitoramento_login != null) || (monitoramento_senha != '' && monitoramento_senha != null) || (solarview_login != '' && solarview_login != null) || (solarview_senha != '' && solarview_senha != null)",
        'created',
        1000,
        0,
      )
      for (let i = 0; i < recordsSis.length; i++) {
        const cId = recordsSis[i].getString('cliente_id')
        if (cId && idsComSistemasMonitoramento.indexOf(cId) === -1) {
          idsComSistemasMonitoramento.push(cId)
        }
      }
    } catch (eSis) {
      console.log('Aviso ao consultar sistemas:', eSis)
    }

    // 3. Buscar todos os clientes que estão transferidos para pós-vendas com status Fechado e origem_pos_vendas = 'funil_comercial'
    const fechadosPosVendas = app.findRecordsByFilter(
      'clientes',
      "status = 'Fechado' && origem_pos_vendas = 'funil_comercial' && transferido_pos_vendas = true",
      'created',
      1000,
      0,
    )

    let totalTransferidos = 0
    let totalPermanecemPosVendas = 0

    for (let i = 0; i < fechadosPosVendas.length; i++) {
      const cliente = fechadosPosVendas[i]
      const cId = cliente.id

      const temLoginDireto =
        (cliente.getString('monitoramento_login') || '').trim() !== '' ||
        (cliente.getString('monitoramento_senha') || '').trim() !== '' ||
        (cliente.getString('solarview_login') || '').trim() !== '' ||
        (cliente.getString('solarview_senha') || '').trim() !== ''

      const temLoginInversor = idsComInversoresMonitoramento.indexOf(cId) !== -1
      const temLoginSistema = idsComSistemasMonitoramento.indexOf(cId) !== -1

      const temMonitoramento = temLoginDireto || temLoginInversor || temLoginSistema

      if (temMonitoramento) {
        // Permanece em Pós-Vendas
        totalPermanecemPosVendas++
      } else {
        // Mover para área de Clientes: remover flag de pós-vendas, preservando status = 'Fechado'
        cliente.set('transferido_pos_vendas', false)
        cliente.set('origem_pos_vendas', '')
        cliente.set('data_transferencia_pos_vendas', '')
        app.save(cliente)
        totalTransferidos++
      }
    }

    console.log(
      '0078_transferir_fechados_sem_monitoramento_para_clientes: ' +
        totalTransferidos +
        ' clientes movidos para a área de Clientes; ' +
        totalPermanecemPosVendas +
        ' permaneceram em Pós-Vendas por possuírem monitoramento.',
    )
  },
  (app) => {
    // Rollback não obrigatório
  },
)

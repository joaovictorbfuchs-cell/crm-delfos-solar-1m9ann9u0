migrate(
  (app) => {
    // Processo de Cópia Aditivo e Idempotente de cliente_inversores -> ativos
    const inversoresCol = app.findCollectionByNameOrId('cliente_inversores')
    const ativosCol = app.findCollectionByNameOrId('ativos')
    const usinasCol = app.findCollectionByNameOrId('usinas')
    const clientesCol = app.findCollectionByNameOrId('clientes')

    const inversores = app.findRecordsByFilter(
      'cliente_inversores',
      'id != ""',
      'cliente_id,ordem',
      0,
      0,
    )
    const usinas = app.findRecordsByFilter('usinas', 'id != ""', 'created', 0, 0)
    const clientes = app.findRecordsByFilter('clientes', 'id != ""', 'created', 0, 0)
    const ativosExistentes = app.findRecordsByFilter('ativos', 'id != ""', 'created', 0, 0)

    const mapaClientes = new Map()
    for (let i = 0; i < clientes.length; i++) {
      mapaClientes.set(clientes[i].id, clientes[i].getString('nome'))
    }

    const usinasPorCliente = new Map()
    for (let i = 0; i < usinas.length; i++) {
      const cId = usinas[i].getString('cliente_id')
      if (cId) {
        const arr = usinasPorCliente.get(cId) || []
        arr.push(usinas[i])
        usinasPorCliente.set(cId, arr)
      }
    }

    const mapaAtivosJaCriados = new Map()
    for (let i = 0; i < ativosExistentes.length; i++) {
      const a = ativosExistentes[i]
      const ch = a.getString('chave_importacao')
      if (ch) {
        mapaAtivosJaCriados.set(ch, a.id)
      }
      const obs = a.getString('observacoes')
      if (obs && obs.indexOf('Importado de cliente_inversores #') !== -1) {
        const match = obs.match(/#([a-zA-Z0-9_-]+)/)
        if (match && match[1]) {
          mapaAtivosJaCriados.set('cliente_inversores:' + match[1], a.id)
        }
      }
    }

    let criados = 0
    let jaExistentes = 0
    let foraPorFaltaDados = 0

    for (let i = 0; i < inversores.length; i++) {
      const inv = inversores[i]
      const invId = inv.id
      const chave = 'cliente_inversores:' + invId

      if (mapaAtivosJaCriados.has(chave)) {
        jaExistentes++
        continue
      }

      const marcaRaw = (inv.getString('marca_inversor') || '').trim()
      const modeloRaw = (inv.getString('modelo_inversor') || '').trim()
      const serieRaw = (inv.getString('numero_serie') || '').trim()
      const clienteId = inv.getString('cliente_id')
      const clienteNome = mapaClientes.get(clienteId) || 'Cliente não identificado'

      // Se não tiver dados mínimos (sem marca, sem modelo e sem número de série), fica de fora
      if (!marcaRaw && !modeloRaw && !serieRaw) {
        foraPorFaltaDados++
        continue
      }

      const fabricante = marcaRaw || 'Não especificado'
      let modelo = modeloRaw
      const pot = inv.getFloat('potencia_kwp')
      if (!modelo) {
        if (pot > 0) {
          modelo = 'Inversor ' + pot + ' kWp'
        } else if (serieRaw) {
          modelo = 'Inversor SN ' + serieRaw
        } else {
          modelo = 'Inversor Solar'
        }
      }

      // Vínculo com usina
      let usinaId = ''
      if (clienteId) {
        const usinasDoCli = usinasPorCliente.get(clienteId) || []
        if (usinasDoCli.length === 1) {
          usinaId = usinasDoCli[0].id
        } else if (usinasDoCli.length > 1) {
          const appNome = (inv.getString('app_nome') || '').toLowerCase()
          const invObs = (inv.getString('observacoes') || '').toLowerCase()
          for (let u = 0; u < usinasDoCli.length; u++) {
            const uNome = (usinasDoCli[u].getString('nome') || '').toLowerCase()
            if (
              (appNome && uNome.indexOf(appNome) !== -1) ||
              (invObs && uNome.indexOf(invObs) !== -1)
            ) {
              usinaId = usinasDoCli[u].id
              break
            }
          }
          if (!usinaId) {
            for (let u = 0; u < usinasDoCli.length; u++) {
              const uNome = (usinasDoCli[u].getString('nome') || '').toLowerCase()
              if (uNome.indexOf('principal') !== -1) {
                usinaId = usinasDoCli[u].id
                break
              }
            }
          }
        }
      }

      let observacaoFormatada = 'Importado de cliente_inversores #' + invId
      if (clienteId) {
        observacaoFormatada += ' — cliente: ' + clienteNome + ' (#' + clienteId + ')'
      }
      if (!usinaId) {
        observacaoFormatada += ' (sem usina vinculada direta)'
      }
      if (pot > 0) {
        observacaoFormatada += ' • Potência: ' + pot + ' kWp'
      }
      const appNome = inv.getString('app_nome')
      if (appNome) {
        observacaoFormatada += ' • Monitoramento: ' + appNome
      }
      const obsOrig = inv.getString('observacoes')
      if (obsOrig) {
        observacaoFormatada += ' • Obs original: ' + obsOrig
      }

      const record = new Record(ativosCol)
      if (usinaId) {
        record.set('usina_id', usinaId)
      }
      record.set('tipo', 'inversor')
      record.set('fabricante', fabricante)
      record.set('modelo', modelo)
      record.set('numero_serie', serieRaw)
      record.set('status_operacional', 'operacional')
      record.set('observacoes', observacaoFormatada)
      record.set('chave_importacao', chave)
      record.set('cliente_inversor_id', invId)

      app.save(record)
      criados++
    }

    console.log(
      'MIGRACAO_IMPORTACAO_INVERSORES: Criados: ' +
        criados +
        ' | Já existentes: ' +
        jaExistentes +
        ' | Fora por falta de dados: ' +
        foraPorFaltaDados,
    )
  },
  (app) => {
    // Reverter apenas os ativos criados por esta chave
    const ativos = app.findRecordsByFilter(
      'ativos',
      'chave_importacao ~ "cliente_inversores:"',
      'created',
      0,
      0,
    )
    for (let i = 0; i < ativos.length; i++) {
      app.delete(ativos[i])
    }
  },
)

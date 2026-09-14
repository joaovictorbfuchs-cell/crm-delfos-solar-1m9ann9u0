migrate(
  (app) => {
    const colClienteInversores = app.findCollectionByNameOrId('cliente_inversores')

    try {
      const allClientes = app.findRecordsByFilter('clientes', 'id != ""', 'created', 1000, 0)
      const allSistemas = app.findRecordsByFilter('sistemas', 'id != ""', 'created', 1000, 0)

      // Mapa rápido de cliente_id -> sistema
      const sistemasMap = new Map()
      for (const s of allSistemas) {
        const cId = s.getString('cliente_id')
        if (cId) {
          sistemasMap.set(cId, s)
        }
      }

      for (const cli of allClientes) {
        const sist = sistemasMap.get(cli.id)

        const marcaCli = (cli.getString('inversor_marca') || '').trim()
        const modeloCli = (cli.getString('inversor_modelo') || '').trim()
        const potCli = cli.getFloat('potencia_kwp') || 0

        const marcaSist = sist ? (sist.getString('fabricante_inversores') || '').trim() : ''
        const modeloSist = sist ? (sist.getString('modelo_inversores') || '').trim() : ''
        const potSist = sist
          ? sist.getFloat('potencia_pico_inversores_kwp') ||
            sist.getFloat('potencia_total_kwp') ||
            0
          : 0

        const marcaEfetiva = marcaCli || marcaSist
        const modeloEfetivo = modeloCli || modeloSist
        const potEfetiva = potSist > 0 ? potSist : potCli > 0 ? potCli : 0

        // Buscar inversores já cadastrados para este cliente
        let inversoresDoCliente = []
        try {
          inversoresDoCliente = app.findRecordsByFilter(
            'cliente_inversores',
            `cliente_id = '${cli.id}'`,
            'ordem',
            50,
            0,
          )
        } catch (_) {
          inversoresDoCliente = []
        }

        if (inversoresDoCliente.length === 0) {
          // Se o cliente tem qualquer dado relacionado a inversor ou potência, criar o primeiro inversor
          if (marcaEfetiva || modeloEfetivo || potEfetiva > 0) {
            const rec = new Record(colClienteInversores)
            rec.set('cliente_id', cli.id)
            rec.set('marca_inversor', marcaEfetiva)
            rec.set('modelo_inversor', modeloEfetivo)
            if (potEfetiva > 0) {
              rec.set('potencia_kwp', potEfetiva)
            }
            rec.set(
              'app_nome',
              (
                cli.getString('monitoramento_app_nome') ||
                (sist ? sist.getString('monitoramento_app_nome') : '') ||
                ''
              ).trim(),
            )
            rec.set(
              'login',
              (
                cli.getString('monitoramento_login') ||
                (sist ? sist.getString('monitoramento_login') : '') ||
                ''
              ).trim(),
            )
            rec.set(
              'senha',
              (
                cli.getString('monitoramento_senha') ||
                (sist ? sist.getString('monitoramento_senha') : '') ||
                ''
              ).trim(),
            )
            rec.set(
              'datalogger_url',
              (
                cli.getString('monitoramento_datalogger_url') ||
                (sist ? sist.getString('monitoramento_datalogger_url') : '') ||
                ''
              ).trim(),
            )
            rec.set('ordem', 1)
            app.save(rec)
          }
        } else {
          // Atualizar o primeiro inversor se estiver com campos vazios ou zerados (sem sobrescrever valores já preenchidos)
          const primeiro = inversoresDoCliente[0]
          let mudou = false

          if (!primeiro.getString('marca_inversor') && marcaEfetiva) {
            primeiro.set('marca_inversor', marcaEfetiva)
            mudou = true
          }
          if (!primeiro.getString('modelo_inversor') && modeloEfetivo) {
            primeiro.set('modelo_inversor', modeloEfetivo)
            mudou = true
          }
          const potAtual = primeiro.getFloat('potencia_kwp') || 0
          if (potAtual <= 0 && potEfetiva > 0) {
            primeiro.set('potencia_kwp', potEfetiva)
            mudou = true
          }

          if (mudou) {
            app.save(primeiro)
          }
        }
      }
    } catch (err) {
      console.warn('Aviso na migração 0056:', err)
    }
  },
  (app) => {
    // Reversão limpa se necessário
  },
)

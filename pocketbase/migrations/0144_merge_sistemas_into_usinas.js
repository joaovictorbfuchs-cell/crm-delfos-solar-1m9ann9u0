migrate(
  (app) => {
    const usinasCol = app.findCollectionByNameOrId('usinas')

    // 1. Adicionar campos elétricos
    if (!usinasCol.fields.getByName('padrao_entrada')) {
      usinasCol.fields.add(new TextField({ name: 'padrao_entrada', required: false }))
    }
    if (!usinasCol.fields.getByName('tipo_atendimento')) {
      usinasCol.fields.add(
        new SelectField({
          name: 'tipo_atendimento',
          required: false,
          values: ['aéreo', 'subterrâneo'],
          maxSelect: 1,
        }),
      )
    }
    if (!usinasCol.fields.getByName('numero_fases')) {
      usinasCol.fields.add(
        new SelectField({
          name: 'numero_fases',
          required: false,
          values: ['monofásico', 'bifásico', 'trifásico'],
          maxSelect: 1,
        }),
      )
    }
    if (!usinasCol.fields.getByName('secao_cabos')) {
      usinasCol.fields.add(new TextField({ name: 'secao_cabos', required: false }))
    }
    if (!usinasCol.fields.getByName('amperagem_disjuntor')) {
      usinasCol.fields.add(new TextField({ name: 'amperagem_disjuntor', required: false }))
    }
    if (!usinasCol.fields.getByName('tipo_caixa_medicao')) {
      usinasCol.fields.add(new TextField({ name: 'tipo_caixa_medicao', required: false }))
    }

    // 2. Localização e tarifa
    if (!usinasCol.fields.getByName('latitude')) {
      usinasCol.fields.add(new NumberField({ name: 'latitude', required: false }))
    }
    if (!usinasCol.fields.getByName('longitude')) {
      usinasCol.fields.add(new NumberField({ name: 'longitude', required: false }))
    }
    if (!usinasCol.fields.getByName('tarifa')) {
      usinasCol.fields.add(new NumberField({ name: 'tarifa', required: false }))
    }
    if (!usinasCol.fields.getByName('classe_consumo')) {
      usinasCol.fields.add(new TextField({ name: 'classe_consumo', required: false }))
    }
    if (!usinasCol.fields.getByName('geracao_media_mensal_kwh')) {
      usinasCol.fields.add(new NumberField({ name: 'geracao_media_mensal_kwh', required: false }))
    }

    // 3. Monitoramento
    if (!usinasCol.fields.getByName('monitoramento_app_nome')) {
      usinasCol.fields.add(new TextField({ name: 'monitoramento_app_nome', required: false }))
    }
    if (!usinasCol.fields.getByName('monitoramento_login')) {
      usinasCol.fields.add(new TextField({ name: 'monitoramento_login', required: false }))
    }
    if (!usinasCol.fields.getByName('monitoramento_senha')) {
      usinasCol.fields.add(new TextField({ name: 'monitoramento_senha', required: false }))
    }
    if (!usinasCol.fields.getByName('monitoramento_datalogger_url')) {
      usinasCol.fields.add(new TextField({ name: 'monitoramento_datalogger_url', required: false }))
    }
    if (!usinasCol.fields.getByName('solarview_login')) {
      usinasCol.fields.add(new TextField({ name: 'solarview_login', required: false }))
    }
    if (!usinasCol.fields.getByName('solarview_senha')) {
      usinasCol.fields.add(new TextField({ name: 'solarview_senha', required: false }))
    }
    if (!usinasCol.fields.getByName('solarview_link_ios')) {
      usinasCol.fields.add(new TextField({ name: 'solarview_link_ios', required: false }))
    }
    if (!usinasCol.fields.getByName('solarview_link_android')) {
      usinasCol.fields.add(new TextField({ name: 'solarview_link_android', required: false }))
    }
    if (!usinasCol.fields.getByName('solarview_link_texto')) {
      usinasCol.fields.add(new TextField({ name: 'solarview_link_texto', required: false }))
    }

    // 4. Equipamentos
    if (!usinasCol.fields.getByName('fabricante_inversores')) {
      usinasCol.fields.add(new TextField({ name: 'fabricante_inversores', required: false }))
    }
    if (!usinasCol.fields.getByName('modelo_inversores')) {
      usinasCol.fields.add(new TextField({ name: 'modelo_inversores', required: false }))
    }
    if (!usinasCol.fields.getByName('potencia_pico_inversores_kwp')) {
      usinasCol.fields.add(
        new NumberField({ name: 'potencia_pico_inversores_kwp', required: false }),
      )
    }
    if (!usinasCol.fields.getByName('fabricante_modulos')) {
      usinasCol.fields.add(new TextField({ name: 'fabricante_modulos', required: false }))
    }
    if (!usinasCol.fields.getByName('modelo_modulos')) {
      usinasCol.fields.add(new TextField({ name: 'modelo_modulos', required: false }))
    }
    if (!usinasCol.fields.getByName('potencia_pico_modulos_kwp')) {
      usinasCol.fields.add(new NumberField({ name: 'potencia_pico_modulos_kwp', required: false }))
    }
    if (!usinasCol.fields.getByName('quantidade_placas')) {
      usinasCol.fields.add(new NumberField({ name: 'quantidade_placas', required: false }))
    }
    if (!usinasCol.fields.getByName('marca_placas')) {
      usinasCol.fields.add(new TextField({ name: 'marca_placas', required: false }))
    }
    if (!usinasCol.fields.getByName('tipo_telhado')) {
      usinasCol.fields.add(
        new SelectField({
          name: 'tipo_telhado',
          required: false,
          values: ['ceramico', 'metalico', 'laje', 'fibrocimento'],
          maxSelect: 1,
        }),
      )
    }

    app.save(usinasCol)

    // 5. Migrar dados dos 6 registros da coleção sistemas para usinas
    let sistemasRecords = []
    try {
      sistemasRecords = app.findRecordsByFilter('sistemas', '', '-created', 100, 0)
    } catch (_) {
      sistemasRecords = []
    }

    for (const sis of sistemasRecords) {
      const clienteId = sis.getString('cliente_id')
      if (!clienteId) continue

      let usinaAlvo = null
      try {
        const usinasExistentes = app.findRecordsByFilter(
          'usinas',
          `cliente_id = "${clienteId}"`,
          'created',
          10,
          0,
        )
        if (usinasExistentes.length > 0) {
          usinaAlvo = usinasExistentes[0]
        }
      } catch (_) {}

      if (!usinaAlvo) {
        // Criar usina para o cliente que ainda não tem (ex: wtjldnm7kj0s96u)
        usinaAlvo = new Record(usinasCol)
        usinaAlvo.set('cliente_id', clienteId)
        let clienteNome = 'Solis'
        try {
          const cli = app.findFirstRecordByData('clientes', 'id', clienteId)
          if (cli && cli.getString('nome')) {
            clienteNome = cli.getString('nome')
          }
        } catch (_) {}
        usinaAlvo.set('nome', `Usina Principal - ${clienteNome}`)
        usinaAlvo.set('tipo_estrutura', 'telhado')
        usinaAlvo.set('tipo_usina', 'residencial')
        usinaAlvo.set('status', 'ativo')
      }

      // Mapear campos de sistemas para usinas
      // Elétrico
      if (sis.getString('padrao_entrada'))
        usinaAlvo.set('padrao_entrada', sis.getString('padrao_entrada'))
      if (sis.getString('tipo_atendimento'))
        usinaAlvo.set('tipo_atendimento', sis.getString('tipo_atendimento'))
      if (sis.getString('numero_fases'))
        usinaAlvo.set('numero_fases', sis.getString('numero_fases'))
      if (sis.getString('secao_cabos')) usinaAlvo.set('secao_cabos', sis.getString('secao_cabos'))
      if (sis.getString('amperagem_disjuntor'))
        usinaAlvo.set('amperagem_disjuntor', sis.getString('amperagem_disjuntor'))
      if (sis.getString('tipo_caixa_medicao'))
        usinaAlvo.set('tipo_caixa_medicao', sis.getString('tipo_caixa_medicao'))

      // Localização e tarifa
      if (sis.getFloat('latitude')) usinaAlvo.set('latitude', sis.getFloat('latitude'))
      if (sis.getFloat('longitude')) usinaAlvo.set('longitude', sis.getFloat('longitude'))
      if (sis.getFloat('tarifa')) usinaAlvo.set('tarifa', sis.getFloat('tarifa'))
      if (sis.getString('classe_consumo'))
        usinaAlvo.set('classe_consumo', sis.getString('classe_consumo'))
      if (sis.getFloat('geracao_media_mensal_kwh')) {
        usinaAlvo.set('geracao_media_mensal_kwh', sis.getFloat('geracao_media_mensal_kwh'))
      }

      // Monitoramento
      if (sis.getString('monitoramento_app_nome'))
        usinaAlvo.set('monitoramento_app_nome', sis.getString('monitoramento_app_nome'))
      if (sis.getString('monitoramento_login'))
        usinaAlvo.set('monitoramento_login', sis.getString('monitoramento_login'))
      if (sis.getString('monitoramento_senha'))
        usinaAlvo.set('monitoramento_senha', sis.getString('monitoramento_senha'))
      if (sis.getString('monitoramento_datalogger_url'))
        usinaAlvo.set('monitoramento_datalogger_url', sis.getString('monitoramento_datalogger_url'))
      if (sis.getString('solarview_login'))
        usinaAlvo.set('solarview_login', sis.getString('solarview_login'))
      if (sis.getString('solarview_senha'))
        usinaAlvo.set('solarview_senha', sis.getString('solarview_senha'))
      if (sis.getString('solarview_link_ios'))
        usinaAlvo.set('solarview_link_ios', sis.getString('solarview_link_ios'))
      if (sis.getString('solarview_link_android'))
        usinaAlvo.set('solarview_link_android', sis.getString('solarview_link_android'))
      if (sis.getString('solarview_link_texto'))
        usinaAlvo.set('solarview_link_texto', sis.getString('solarview_link_texto'))

      // Equipamentos
      if (sis.getString('fabricante_inversores'))
        usinaAlvo.set('fabricante_inversores', sis.getString('fabricante_inversores'))
      if (sis.getString('modelo_inversores'))
        usinaAlvo.set('modelo_inversores', sis.getString('modelo_inversores'))
      if (sis.getFloat('potencia_pico_inversores_kwp')) {
        usinaAlvo.set('potencia_pico_inversores_kwp', sis.getFloat('potencia_pico_inversores_kwp'))
      }
      if (sis.getString('fabricante_modulos'))
        usinaAlvo.set('fabricante_modulos', sis.getString('fabricante_modulos'))
      if (sis.getString('modelo_modulos'))
        usinaAlvo.set('modelo_modulos', sis.getString('modelo_modulos'))
      if (sis.getFloat('potencia_pico_modulos_kwp')) {
        usinaAlvo.set('potencia_pico_modulos_kwp', sis.getFloat('potencia_pico_modulos_kwp'))
      }
      if (sis.getInt('quantidade_placas')) {
        usinaAlvo.set('quantidade_placas', sis.getInt('quantidade_placas'))
        if (!usinaAlvo.getInt('qtd_modulos')) {
          usinaAlvo.set('qtd_modulos', sis.getInt('quantidade_placas'))
        }
      }
      if (sis.getInt('quantidade_modulos') && !usinaAlvo.getInt('qtd_modulos')) {
        usinaAlvo.set('qtd_modulos', sis.getInt('quantidade_modulos'))
      }
      if (sis.getString('marca_placas'))
        usinaAlvo.set('marca_placas', sis.getString('marca_placas'))
      if (sis.getString('tipo_telhado'))
        usinaAlvo.set('tipo_telhado', sis.getString('tipo_telhado'))

      // Informações gerais se ainda não definidas na usina
      if (sis.getString('concessionaria') && !usinaAlvo.getString('concessionaria')) {
        usinaAlvo.set('concessionaria', sis.getString('concessionaria'))
      }
      if (sis.getString('numero_uc') && !usinaAlvo.getString('numero_uc')) {
        usinaAlvo.set('numero_uc', sis.getString('numero_uc'))
      }
      if (sis.getFloat('potencia_total_kwp')) {
        usinaAlvo.set('potencia_kwp', sis.getFloat('potencia_total_kwp'))
      }

      // Constrói inversores_info se estiver vazio ou genérico "Deye"
      const curInvInfo = usinaAlvo.getString('inversores_info')
      if (!curInvInfo || curInvInfo === 'Deye') {
        const fab = sis.getString('fabricante_inversores')
        const mod = sis.getString('modelo_inversores')
        if (fab || mod) {
          usinaAlvo.set('inversores_info', [fab, mod].filter(Boolean).join(' '))
        }
      }

      app.save(usinaAlvo)
    }
  },
  (app) => {
    // Reverter colunas adicionadas se necessário
    const usinasCol = app.findCollectionByNameOrId('usinas')
    const fieldNames = [
      'padrao_entrada',
      'tipo_atendimento',
      'numero_fases',
      'secao_cabos',
      'amperagem_disjuntor',
      'tipo_caixa_medicao',
      'latitude',
      'longitude',
      'tarifa',
      'classe_consumo',
      'geracao_media_mensal_kwh',
      'monitoramento_app_nome',
      'monitoramento_login',
      'monitoramento_senha',
      'monitoramento_datalogger_url',
      'solarview_login',
      'solarview_senha',
      'solarview_link_ios',
      'solarview_link_android',
      'solarview_link_texto',
      'fabricante_inversores',
      'modelo_inversores',
      'potencia_pico_inversores_kwp',
      'fabricante_modulos',
      'modelo_modulos',
      'potencia_pico_modulos_kwp',
      'quantidade_placas',
      'marca_placas',
      'tipo_telhado',
    ]

    for (const name of fieldNames) {
      const f = usinasCol.fields.getByName(name)
      if (f) {
        usinasCol.fields.remove(f)
      }
    }
    app.save(usinasCol)
  },
)

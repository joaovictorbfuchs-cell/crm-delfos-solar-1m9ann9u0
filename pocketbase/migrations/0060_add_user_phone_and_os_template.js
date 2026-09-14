migrate(
  (app) => {
    // 1. Adicionar campo phone na coleção users
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!usersCol.fields.getByName('phone')) {
      usersCol.fields.add(
        new TextField({
          name: 'phone',
          required: false,
        }),
      )
      app.save(usersCol)
    }

    // 2. Preencher telefone inicial de teste para os instaladores de demonstração caso estejam vazios
    try {
      const carlos = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'carlos.instalador@delfosengenharia.com.br',
      )
      if (!carlos.getString('phone')) {
        carlos.set('phone', '54999990001')
        app.save(carlos)
      }
    } catch (_) {}

    try {
      const anderson = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'anderson.instalador@delfosengenharia.com.br',
      )
      if (!anderson.getString('phone')) {
        anderson.set('phone', '54999990002')
        app.save(anderson)
      }
    } catch (_) {}

    // 3. Criar template no whatsapp_templates para notificação de nova OS (slug: os_atribuida_instalador)
    try {
      const templatesCol = app.findCollectionByNameOrId('whatsapp_templates')
      let tpl = null
      try {
        tpl = app.findFirstRecordByData('whatsapp_templates', 'slug', 'os_atribuida_instalador')
      } catch (_) {}

      if (!tpl) {
        const record = new Record(templatesCol)
        record.set('titulo', 'Nova OS Atribuída ao Instalador')
        record.set('slug', 'os_atribuida_instalador')
        record.set(
          'conteudo',
          '📋 *Nova Ordem de Serviço atribuída*\n👤 Cliente: {{nome_cliente}}\n🔧 Serviço: {{tipo_servico}}\n📍 Endereço: {{endereco}}\n📅 Data: {{data_agendada}}\n\nAcesse o CRM para ver a ficha de execução.',
        )
        record.set('tipo_gatilho', 'os_atribuida')
        record.set('variaveis_disponiveis', [
          'nome_cliente',
          'tipo_servico',
          'endereco',
          'data_agendada',
          'nome_instalador',
          'id_os',
        ])
        record.set('ativo', true)
        app.save(record)
      }
    } catch (errTpl) {
      console.log('Aviso ao criar template os_atribuida_instalador:', errTpl)
    }
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('phone')) {
        usersCol.fields.removeByName('phone')
        app.save(usersCol)
      }
    } catch (_) {}

    try {
      const tpl = app.findFirstRecordByData('whatsapp_templates', 'slug', 'os_atribuida_instalador')
      if (tpl) {
        app.delete(tpl)
      }
    } catch (_) {}
  },
)

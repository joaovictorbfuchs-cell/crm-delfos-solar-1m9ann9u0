migrate(
  (app) => {
    // 1. Adicionar campos de acesso ao app Solarview na coleção clientes
    const clientesCol = app.findCollectionByNameOrId('clientes')

    if (!clientesCol.fields.getByName('solarview_login')) {
      clientesCol.fields.add(
        new TextField({
          name: 'solarview_login',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('solarview_senha')) {
      clientesCol.fields.add(
        new TextField({
          name: 'solarview_senha',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('solarview_link_ios')) {
      clientesCol.fields.add(
        new TextField({
          name: 'solarview_link_ios',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('solarview_link_android')) {
      clientesCol.fields.add(
        new TextField({
          name: 'solarview_link_android',
          required: false,
        }),
      )
    }

    if (!clientesCol.fields.getByName('solarview_link_texto')) {
      clientesCol.fields.add(
        new TextField({
          name: 'solarview_link_texto',
          required: false,
        }),
      )
    }

    app.save(clientesCol)

    // 2. Adicionar os mesmos campos opcionais na coleção sistemas para consistência e redundância
    try {
      const sistemasCol = app.findCollectionByNameOrId('sistemas')
      if (!sistemasCol.fields.getByName('solarview_login')) {
        sistemasCol.fields.add(
          new TextField({
            name: 'solarview_login',
            required: false,
          }),
        )
      }
      if (!sistemasCol.fields.getByName('solarview_senha')) {
        sistemasCol.fields.add(
          new TextField({
            name: 'solarview_senha',
            required: false,
          }),
        )
      }
      if (!sistemasCol.fields.getByName('solarview_link_ios')) {
        sistemasCol.fields.add(
          new TextField({
            name: 'solarview_link_ios',
            required: false,
          }),
        )
      }
      if (!sistemasCol.fields.getByName('solarview_link_android')) {
        sistemasCol.fields.add(
          new TextField({
            name: 'solarview_link_android',
            required: false,
          }),
        )
      }
      if (!sistemasCol.fields.getByName('solarview_link_texto')) {
        sistemasCol.fields.add(
          new TextField({
            name: 'solarview_link_texto',
            required: false,
          }),
        )
      }
      app.save(sistemasCol)
    } catch (_) {}

    // Links padrão oficiais do app Solarview (App Store e Google Play)
    const defaultSolarviewIos = 'https://apps.apple.com/br/app/solarview/id1453416568'
    const defaultSolarviewAndroid =
      'https://play.google.com/store/apps/details?id=com.solarview.smartview'
    const defaultSolarviewTexto =
      'Baixe o app Solarview para acompanhar a geração do seu sistema em tempo real na palma da mão!'

    // 3. Preencher dados de acesso Solarview para clientes demonstrativos (Marcelo Becker e Roberto Almeida)
    // 3.1 Marcelo Becker
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      marcelo.set('solarview_login', 'marcelo.becker@fazenda3palmeiras.com.br')
      marcelo.set('solarview_senha', 'Solarview@Becker2025')
      marcelo.set('solarview_link_ios', defaultSolarviewIos)
      marcelo.set('solarview_link_android', defaultSolarviewAndroid)
      marcelo.set('solarview_link_texto', defaultSolarviewTexto)
      app.save(marcelo)

      try {
        const sisMarcelo = app.findFirstRecordByData('sistemas', 'cliente_id', marcelo.id)
        sisMarcelo.set('solarview_login', 'marcelo.becker@fazenda3palmeiras.com.br')
        sisMarcelo.set('solarview_senha', 'Solarview@Becker2025')
        sisMarcelo.set('solarview_link_ios', defaultSolarviewIos)
        sisMarcelo.set('solarview_link_android', defaultSolarviewAndroid)
        sisMarcelo.set('solarview_link_texto', defaultSolarviewTexto)
        app.save(sisMarcelo)
      } catch (_) {}
    } catch (_) {}

    // 3.2 Roberto Almeida (Supermercado Almeida)
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

      if (!roberto) {
        try {
          roberto = app.findFirstRecordByData('clientes', 'nome', 'Roberto Almeida')
        } catch (_) {
          roberto = null
        }
      }

      if (roberto) {
        roberto.set('solarview_login', 'roberto.almeida@almeidavarejo.com.br')
        roberto.set('solarview_senha', 'Solarview@Almeida2025!')
        roberto.set('solarview_link_ios', defaultSolarviewIos)
        roberto.set('solarview_link_android', defaultSolarviewAndroid)
        roberto.set('solarview_link_texto', defaultSolarviewTexto)
        app.save(roberto)

        try {
          const sisRoberto = app.findFirstRecordByData('sistemas', 'cliente_id', roberto.id)
          sisRoberto.set('solarview_login', 'roberto.almeida@almeidavarejo.com.br')
          sisRoberto.set('solarview_senha', 'Solarview@Almeida2025!')
          sisRoberto.set('solarview_link_ios', defaultSolarviewIos)
          sisRoberto.set('solarview_link_android', defaultSolarviewAndroid)
          sisRoberto.set('solarview_link_texto', defaultSolarviewTexto)
          app.save(sisRoberto)
        } catch (_) {}
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const c = app.findCollectionByNameOrId('clientes')
      if (c.fields.getByName('solarview_login')) c.fields.removeByName('solarview_login')
      if (c.fields.getByName('solarview_senha')) c.fields.removeByName('solarview_senha')
      if (c.fields.getByName('solarview_link_ios')) c.fields.removeByName('solarview_link_ios')
      if (c.fields.getByName('solarview_link_android'))
        c.fields.removeByName('solarview_link_android')
      if (c.fields.getByName('solarview_link_texto')) c.fields.removeByName('solarview_link_texto')
      app.save(c)
    } catch (_) {}

    try {
      const s = app.findCollectionByNameOrId('sistemas')
      if (s.fields.getByName('solarview_login')) s.fields.removeByName('solarview_login')
      if (s.fields.getByName('solarview_senha')) s.fields.removeByName('solarview_senha')
      if (s.fields.getByName('solarview_link_ios')) s.fields.removeByName('solarview_link_ios')
      if (s.fields.getByName('solarview_link_android'))
        s.fields.removeByName('solarview_link_android')
      if (s.fields.getByName('solarview_link_texto')) s.fields.removeByName('solarview_link_texto')
      app.save(s)
    } catch (_) {}
  },
)

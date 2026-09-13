migrate(
  (app) => {
    // 1. Cliente 1: Marcelo Becker (Plano Essencial - Demonstração 1)
    let marcelo = null
    try {
      marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
    } catch (_) {
      try {
        marcelo = app.findFirstRecordByData('clientes', 'id', '9ozpqdm9sgwmdzr')
      } catch (_) {}
    }

    if (marcelo) {
      marcelo.set('nome', 'Marcelo Becker')
      marcelo.set('razao_social', 'Marcelo Becker Agropecuária')
      marcelo.set('cpf', '412.589.630-18')
      marcelo.set('endereco', 'Linha São João, Km 12')
      marcelo.set('numero', 'S/N')
      marcelo.set('bairro', 'Zona Rural')
      marcelo.set('cidade', 'Passo Fundo/RS')
      marcelo.set('telefone', '(54) 99712-8844')
      marcelo.set('whatsapp', '(54) 99712-8844')
      marcelo.set('email', 'marcelo.becker@fazenda3palmeiras.com.br')
      marcelo.set('placas_qtd', 64)
      marcelo.set('inversor_marca', 'Growatt')
      marcelo.set('inversor_modelo', 'Growatt MAX 30KTL3-X LV')
      marcelo.set('telhado_tipo', 'metalico')
      marcelo.set('status', 'Fechado')
      app.save(marcelo)

      const marceloId = marcelo.id
      let propMarcelo = null
      try {
        propMarcelo = app.findFirstRecordByData('propostas_om', 'cliente_id', marceloId)
      } catch (_) {}

      if (propMarcelo) {
        propMarcelo.set('plano_escolhido', 'Essencial')
        propMarcelo.set('status', 'aprovado')
        propMarcelo.set('valor_mensal_plano', 190)
        propMarcelo.set('valor_anual_plano', 2280)
        propMarcelo.set('numero_modulos', 64)
        propMarcelo.set('marca_inversores', 'Growatt MAX 30KTL3-X LV')
        propMarcelo.set('tipo_instalacao', 'Telhado Metálico')
        app.save(propMarcelo)
      } else {
        const propostasCol = app.findCollectionByNameOrId('propostas_om')
        const nova = new Record(propostasCol)
        nova.set('cliente_id', marceloId)
        nova.set('plano_escolhido', 'Essencial')
        nova.set('status', 'aprovado')
        nova.set('valor_mensal_plano', 190)
        nova.set('valor_anual_plano', 2280)
        nova.set('potencia_kwp', 28.5)
        nova.set('geracao_mensal_kwh', 3650)
        nova.set('numero_modulos', 64)
        nova.set('marca_inversores', 'Growatt MAX 30KTL3-X LV')
        nova.set('tipo_instalacao', 'Telhado Metálico')
        nova.set('data_proposta', '2026-03-10 14:30:00.000Z')
        nova.set('autor', 'Carlos Mendes')
        nova.set(
          'observacoes',
          'Proposta O&M Plano Essencial aprovada pelo cliente para usina fotovoltaica de 28.5 kWp.',
        )
        app.save(nova)
      }
    }

    // 2. Cliente 2: Maria Santos (Plano Prevenção - Demonstração 2)
    let maria = null
    try {
      maria = app.findFirstRecordByData('clientes', 'nome', 'Maria Santos')
    } catch (_) {
      try {
        maria = app.findFirstRecordByData('clientes', 'id', 'pp4572amhvqgm81')
      } catch (_) {}
    }

    if (maria) {
      maria.set('nome', 'Maria Santos')
      maria.set('razao_social', 'Maria Santos Comercio de Alimentos LTDA')
      maria.set('cnpj', '14.283.945/0001-82')
      maria.set('cpf', '458.192.830-49')
      maria.set('endereco', 'Rua Itália, nº 450, Centro')
      maria.set('numero', '450')
      maria.set('bairro', 'Centro')
      maria.set('cidade', 'Erechim/RS')
      maria.set('telefone', '(54) 99812-3456')
      maria.set('whatsapp', '(54) 99812-3456')
      maria.set('email', 'contato@mercadosantos.com.br')
      maria.set('placas_qtd', 30)
      maria.set('inversor_marca', 'Fronius')
      maria.set('inversor_modelo', 'Fronius Symo 12.0-3-M')
      maria.set('telhado_tipo', 'metalico')
      maria.set('status', 'Fechado')
      app.save(maria)

      const mariaId = maria.id
      let propMaria = null
      try {
        propMaria = app.findFirstRecordByData('propostas_om', 'cliente_id', mariaId)
      } catch (_) {}

      if (propMaria) {
        propMaria.set('plano_escolhido', 'Prevenção')
        propMaria.set('status', 'aprovado')
        propMaria.set('valor_mensal_plano', 450)
        propMaria.set('valor_anual_plano', 5400)
        propMaria.set('numero_modulos', 30)
        propMaria.set('marca_inversores', 'Fronius Symo 12.0-3-M')
        propMaria.set('tipo_instalacao', 'Telhado Metálico')
        app.save(propMaria)
      } else {
        const propostasCol = app.findCollectionByNameOrId('propostas_om')
        const nova = new Record(propostasCol)
        nova.set('cliente_id', mariaId)
        nova.set('plano_escolhido', 'Prevenção')
        nova.set('status', 'aprovado')
        nova.set('valor_mensal_plano', 450)
        nova.set('valor_anual_plano', 5400)
        nova.set('potencia_kwp', 12)
        nova.set('geracao_mensal_kwh', 1560)
        nova.set('numero_modulos', 30)
        nova.set('marca_inversores', 'Fronius Symo 12.0-3-M')
        nova.set('tipo_instalacao', 'Telhado Metálico')
        nova.set('data_proposta', '2026-03-05 14:15:00.000Z')
        nova.set('autor', 'João Victor Bagetti Fuchs')
        nova.set(
          'observacoes',
          'Proposta O&M Plano Prevenção aprovada com 1 inspeção preventiva anual completa.',
        )
        app.save(nova)
      }
    }
  },
  (app) => {
    // Reversão opcional
  },
)

/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Expandir valores do select 'tipo' na coleção 'atividades'
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const tipoField = atividadesCol.fields.getByName('tipo')
    if (tipoField) {
      const allowed = new Set(tipoField.values || [])
      allowed.add('oferecer_limpeza_avulsa')
      tipoField.values = Array.from(allowed)
      app.save(atividadesCol)
    }

    // 2. Garantir que usinas de clientes com WhatsApp tenham geracao_media_mensal_kwh preenchida
    // Usina do João Victor Bagetti Fuchs (id q65tjsmhsqzfsdk, cliente 4bb6q12dbgk5sa4) -> 850 kWh/mês (perda anual ≈ R$ 3.669)
    try {
      const usinaJoao = app.findRecordById('usinas', 'q65tjsmhsqzfsdk')
      if (usinaJoao) {
        usinaJoao.set('geracao_media_mensal_kwh', 850)
        usinaJoao.set('geracao_estimada_kwh', 850)
        usinaJoao.set('potencia_kwp', 7.1)
        app.save(usinaJoao)
      }
    } catch (e) {
      // Usina não encontrada por id fixo, tenta por cliente
      try {
        const records = app.findRecordsByFilter(
          'usinas',
          "cliente_id = '4bb6q12dbgk5sa4'",
          '-created',
          1,
        )
        if (records.length > 0) {
          records[0].set('geracao_media_mensal_kwh', 850)
          records[0].set('geracao_estimada_kwh', 850)
          records[0].set('potencia_kwp', 7.1)
          app.save(records[0])
        }
      } catch (e2) {}
    }

    // Usina de Ademar Emílio Berlanda (id 9dbkie8ytv7y77r, cliente rvkvuvn4uz9o65a) -> 820 kWh/mês
    try {
      const usinaAdemar = app.findRecordById('usinas', '9dbkie8ytv7y77r')
      if (usinaAdemar) {
        usinaAdemar.set('geracao_media_mensal_kwh', 820)
        usinaAdemar.set('geracao_estimada_kwh', 820)
        usinaAdemar.set('potencia_kwp', 6.9)
        app.save(usinaAdemar)
      }
    } catch (e) {
      try {
        const records = app.findRecordsByFilter(
          'usinas',
          "cliente_id = 'rvkvuvn4uz9o65a'",
          '-created',
          1,
        )
        if (records.length > 0) {
          records[0].set('geracao_media_mensal_kwh', 820)
          records[0].set('geracao_estimada_kwh', 820)
          records[0].set('potencia_kwp', 6.9)
          app.save(records[0])
        }
      } catch (e2) {}
    }

    // Usina da Clanel (id sdrm6t01rh8c7q4, cliente 7fyi4mf1evoxfl6) -> 650 kWh/mês
    try {
      const usinaClanel = app.findRecordById('usinas', 'sdrm6t01rh8c7q4')
      if (usinaClanel) {
        usinaClanel.set('geracao_media_mensal_kwh', 650)
        usinaClanel.set('geracao_estimada_kwh', 650)
        usinaClanel.set('potencia_kwp', 6.9)
        app.save(usinaClanel)
      }
    } catch (e) {
      try {
        const records = app.findRecordsByFilter(
          'usinas',
          "cliente_id = '7fyi4mf1evoxfl6'",
          '-created',
          1,
        )
        if (records.length > 0) {
          records[0].set('geracao_media_mensal_kwh', 650)
          records[0].set('geracao_estimada_kwh', 650)
          records[0].set('potencia_kwp', 6.9)
          app.save(records[0])
        }
      } catch (e2) {}
    }
  },
  (app) => {
    // Reverter
  },
)

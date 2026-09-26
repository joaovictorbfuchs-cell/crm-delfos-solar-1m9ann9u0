/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. tipos_atividades_custom: adicionar campo valor_por_placa (number)
    const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')
    if (tiposCol) {
      if (!tiposCol.fields.getByName('valor_por_placa')) {
        tiposCol.fields.add(
          new NumberField({
            name: 'valor_por_placa',
            min: 0,
          }),
        )
      }
      app.save(tiposCol)
    }

    // 2. atividades: adicionar campos de custo e deslocamento
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    if (atividadesCol) {
      if (!atividadesCol.fields.getByName('valor_por_placa')) {
        atividadesCol.fields.add(
          new NumberField({
            name: 'valor_por_placa',
            min: 0,
          }),
        )
      }
      if (!atividadesCol.fields.getByName('qtd_modulos')) {
        atividadesCol.fields.add(
          new NumberField({
            name: 'qtd_modulos',
            min: 0,
          }),
        )
      }
      if (!atividadesCol.fields.getByName('custo_placas')) {
        atividadesCol.fields.add(
          new NumberField({
            name: 'custo_placas',
            min: 0,
          }),
        )
      }
      if (!atividadesCol.fields.getByName('cobrar_deslocamento')) {
        atividadesCol.fields.add(
          new BoolField({
            name: 'cobrar_deslocamento',
          }),
        )
      }
      if (!atividadesCol.fields.getByName('distancia_km')) {
        atividadesCol.fields.add(
          new NumberField({
            name: 'distancia_km',
            min: 0,
          }),
        )
      }
      if (!atividadesCol.fields.getByName('valor_km')) {
        atividadesCol.fields.add(
          new NumberField({
            name: 'valor_km',
            min: 0,
          }),
        )
      }
      if (!atividadesCol.fields.getByName('custo_deslocamento')) {
        atividadesCol.fields.add(
          new NumberField({
            name: 'custo_deslocamento',
            min: 0,
          }),
        )
      }
      if (!atividadesCol.fields.getByName('custo_total')) {
        atividadesCol.fields.add(
          new NumberField({
            name: 'custo_total',
            min: 0,
          }),
        )
      }
      app.save(atividadesCol)
    }

    // 3. Atualizar atividade de exemplo de limpeza / manutenção para demonstrar campos
    try {
      const limpezaTipo = app.findFirstRecordByFilter('tipos_atividades_custom', 'nome ~ "Limpeza"')
      if (limpezaTipo) {
        limpezaTipo.set('valor_por_placa', 12.5) // R$ 12,50 por placa como padrão do catálogo
        app.save(limpezaTipo)
      }
    } catch (_e) {
      // ignora se não encontrar
    }

    try {
      const atividadesManut = app.findRecordsByFilter(
        'atividades',
        'tipo = "limpeza_manutencao"',
        '-created',
        5,
        0,
      )
      if (atividadesManut && atividadesManut.length > 0) {
        const atv = atividadesManut[0]
        atv.set('valor_servico', 250)
        atv.set('valor_por_placa', 12.5)
        atv.set('qtd_modulos', 32)
        atv.set('custo_placas', 400) // 32 * 12.50
        atv.set('cobrar_deslocamento', true)
        atv.set('distancia_km', 35)
        atv.set('valor_km', 1.2)
        atv.set('custo_deslocamento', 84) // 35km ida e volta = 70km * 1.20 = 84
        atv.set('custo_total', 484) // 400 (placas) + 84 (deslocamento)
        app.save(atv)
      }
    } catch (_e) {
      // ignora se não houver registros
    }
  },
  (app) => {
    const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')
    if (tiposCol) {
      const f = tiposCol.fields.getByName('valor_por_placa')
      if (f) tiposCol.fields.remove(f)
      app.save(tiposCol)
    }

    const atividadesCol = app.findCollectionByNameOrId('atividades')
    if (atividadesCol) {
      const campos = [
        'valor_por_placa',
        'qtd_modulos',
        'custo_placas',
        'cobrar_deslocamento',
        'distancia_km',
        'valor_km',
        'custo_deslocamento',
        'custo_total',
      ]
      for (const c of campos) {
        const f = atividadesCol.fields.getByName(c)
        if (f) atividadesCol.fields.remove(f)
      }
      app.save(atividadesCol)
    }
  },
)

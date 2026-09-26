/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const tipoField = atividadesCol.fields.getByName('tipo')
    if (tipoField) {
      const allowed = new Set(tipoField.values || [])
      allowed.add('gerar_procuracao')
      allowed.add('gerar_contrato')
      allowed.add('custom')
      tipoField.values = Array.from(allowed)
      app.save(atividadesCol)
    }
  },
  (app) => {
    // Reverter valores adicionados se necessário
  },
)

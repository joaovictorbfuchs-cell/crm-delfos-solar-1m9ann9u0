/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('whatsapp_mensagens')
    if (!col) return

    if (!col.fields.getByName('origem_envio')) {
      col.fields.add(
        new TextField({
          name: 'origem_envio',
          required: false,
        }),
      )
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('whatsapp_mensagens')
    if (!col) return
    const field = col.fields.getByName('origem_envio')
    if (field) {
      col.fields.remove(field)
      app.save(col)
    }
  },
)

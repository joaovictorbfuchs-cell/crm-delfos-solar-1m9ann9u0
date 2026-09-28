migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    if (!col.fields.getByName('email_log_erro')) {
      col.fields.add(new TextField({ name: 'email_log_erro' }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const field = col.fields.getByName('email_log_erro')
    if (field) {
      col.fields.removeByName('email_log_erro')
      app.save(col)
    }
  },
)

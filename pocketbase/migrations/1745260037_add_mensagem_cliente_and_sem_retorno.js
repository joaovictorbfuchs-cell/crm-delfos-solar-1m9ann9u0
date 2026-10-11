migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // 1. Campo mensagem_cliente (texto personalizado da mensagem gravado na criação da atividade)
    if (!col.fields.getByName('mensagem_cliente')) {
      col.fields.add(
        new TextField({
          name: 'mensagem_cliente',
          required: false,
        }),
      )
    }

    // 2. Campo sem_retorno_leitura_media (bool para evitar reenvio de alerta quando data da leitura chega sem retorno)
    if (!col.fields.getByName('sem_retorno_leitura_media')) {
      col.fields.add(
        new BoolField({
          name: 'sem_retorno_leitura_media',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const fMsg = col.fields.getByName('mensagem_cliente')
    if (fMsg) col.fields.remove(fMsg)
    const fSemRetorno = col.fields.getByName('sem_retorno_leitura_media')
    if (fSemRetorno) col.fields.remove(fSemRetorno)
    app.save(col)
  },
)

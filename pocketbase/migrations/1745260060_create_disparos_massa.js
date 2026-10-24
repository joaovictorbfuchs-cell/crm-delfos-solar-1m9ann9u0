migrate(
  (app) => {
    try {
      const existing = app.findCollectionByNameOrId('disparos_massa')
      if (existing) {
        return
      }
    } catch {
      // Coleção ainda não existe
    }

    let usersCollectionId = ''
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      if (usersCol) {
        usersCollectionId = usersCol.id
      }
    } catch {
      // Ignora se não encontrar
    }

    const fields = [
      { name: 'titulo', type: 'text', required: true },
      {
        name: 'status',
        type: 'select',
        required: true,
        values: ['ativo', 'concluido', 'cancelado'],
      },
      { name: 'segmento', type: 'text' },
      { name: 'filtros', type: 'json' },
      { name: 'total_destinatarios', type: 'number' },
      { name: 'intervalo_segundos', type: 'number' },
      { name: 'data_disparo', type: 'date' },
      { name: 'mensagem_original', type: 'text' },
      { name: 'reenvio_ativo', type: 'bool' },
      { name: 'texto_reenvio_1', type: 'text' },
      { name: 'texto_reenvio_2', type: 'text' },
      // Armazena a lista de destinatários com o estado de cada um no lote
      // [{ cliente_id, nome, telefone, status: 'pendente'|'respondido'|'atendido'|'reenvio_1_agendado'|'reenvio_2_agendado'|'finalizado'|'bloqueado'|'sem_whatsapp',
      //    reenvio_1_data, reenvio_1_msg_id, reenvio_2_data, reenvio_2_msg_id, respondido_em, data_envio_inicial }]
      { name: 'destinatarios', type: 'json' },
      { name: 'estatisticas', type: 'json' },
    ]

    if (usersCollectionId) {
      fields.push({
        name: 'criado_por',
        type: 'relation',
        collectionId: usersCollectionId,
        maxSelect: 1,
      })
    } else {
      fields.push({
        name: 'criado_por',
        type: 'text',
      })
    }

    fields.push(
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    )

    const collection = new Collection({
      name: 'disparos_massa',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields,
      indexes: [],
    })

    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('disparos_massa')
      if (collection) {
        app.delete(collection)
      }
    } catch {
      // Já excluído ou não existe
    }
  },
)

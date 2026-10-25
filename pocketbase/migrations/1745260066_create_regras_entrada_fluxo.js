migrate(
  (app) => {
    // 1. Coleção regras_entrada_fluxo
    let regrasCol
    try {
      regrasCol = app.findCollectionByNameOrId('regras_entrada_fluxo')
    } catch (_) {
      regrasCol = null
    }

    let fluxosColId = ''
    try {
      const fCol = app.findCollectionByNameOrId('fluxos_follow_up')
      if (fCol) fluxosColId = fCol.id
    } catch (_) {}

    if (!regrasCol && fluxosColId) {
      const fieldsRegras = [
        {
          name: 'fluxo_id',
          type: 'relation',
          collectionId: fluxosColId,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'estagio_funil',
          type: 'text',
          required: true,
        },
        {
          name: 'ativo',
          type: 'bool',
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ]

      regrasCol = new Collection({
        name: 'regras_entrada_fluxo',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: fieldsRegras,
        indexes: [],
      })

      app.save(regrasCol)
    }

    // 2. Garantir campo origem_entrada em disparos_massa se aplicável
    try {
      const disparosCol = app.findCollectionByNameOrId('disparos_massa')
      if (disparosCol) {
        let hasOrigemField = false
        for (let i = 0; i < disparosCol.fields.length; i++) {
          if (disparosCol.fields[i].name === 'origem_entrada') {
            hasOrigemField = true
            break
          }
        }
        if (!hasOrigemField) {
          disparosCol.fields.add(
            new TextField({
              name: 'origem_entrada',
              required: false,
            }),
          )
          app.save(disparosCol)
        }
      }
    } catch (errDisparos) {
      console.log('[MIGRATION 1745260066] Aviso disparos_massa.origem_entrada:', errDisparos)
    }
  },
  (app) => {
    try {
      const regrasCol = app.findCollectionByNameOrId('regras_entrada_fluxo')
      if (regrasCol) app.delete(regrasCol)
    } catch (_) {}
    try {
      const disparosCol = app.findCollectionByNameOrId('disparos_massa')
      if (disparosCol) {
        disparosCol.fields.removeByName('origem_entrada')
        app.save(disparosCol)
      }
    } catch (_) {}
  },
)

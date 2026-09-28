migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // 1. Campo parent_id: relação com a coleção atividades (maxSelect: 1, cascadeDelete: false)
    if (!col.fields.getByName('parent_id')) {
      col.fields.add(
        new RelationField({
          name: 'parent_id',
          collectionId: col.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // 2. Campo datas_leitura: JSON para armazenar array de datas de leitura na atividade mãe
    if (!col.fields.getByName('datas_leitura')) {
      col.fields.add(
        new JSONField({
          name: 'datas_leitura',
          required: false,
        }),
      )
    }

    // 3. Campo data_lembrete: data calculada do lembrete (2 dias antes)
    if (!col.fields.getByName('data_lembrete')) {
      col.fields.add(
        new DateField({
          name: 'data_lembrete',
          required: false,
        }),
      )
    }

    // 4. Atualizar campo select 'tipo' para incluir 'lembrete_auto_leitura'
    const tipoField = col.fields.getByName('tipo')
    if (tipoField && tipoField.values && Array.isArray(tipoField.values)) {
      if (!tipoField.values.includes('lembrete_auto_leitura')) {
        tipoField.values.push('lembrete_auto_leitura')
      }
    }

    // 5. Adicionar índice em parent_id para busca rápida de filhas
    try {
      col.addIndex('idx_atividades_parent_id', false, 'parent_id', '')
    } catch (_) {}

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    try {
      col.removeIndex('idx_atividades_parent_id')
    } catch (_) {}
    const fParent = col.fields.getByName('parent_id')
    if (fParent) col.fields.remove(fParent)
    const fDatas = col.fields.getByName('datas_leitura')
    if (fDatas) col.fields.remove(fDatas)
    const fLembrete = col.fields.getByName('data_lembrete')
    if (fLembrete) col.fields.remove(fLembrete)
    app.save(col)
  },
)

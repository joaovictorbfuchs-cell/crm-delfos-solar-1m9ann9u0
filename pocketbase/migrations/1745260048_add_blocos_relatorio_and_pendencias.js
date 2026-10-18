// Adicionar campo blocos_relatorio (json) em tipos_atividades_custom e ordens_servico,
// além de campo pendencias_recomendacoes (text) em ordens_servico (livre e opcional).
// Pré-cadastra blocos padrão do tipo Limpeza (Metodologia de Limpeza e Produtos & Cuidados).
migrate(
  (app) => {
    // 1. tipos_atividades_custom: blocos_relatorio
    const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')
    if (tiposCol) {
      if (!tiposCol.fields.getByName('blocos_relatorio')) {
        tiposCol.fields.add(
          new JSONField({
            name: 'blocos_relatorio',
            required: false,
          }),
        )
        app.save(tiposCol)
      }
    }

    // 2. ordens_servico: blocos_relatorio e pendencias_recomendacoes
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      let osChanged = false
      if (!osCol.fields.getByName('blocos_relatorio')) {
        osCol.fields.add(
          new JSONField({
            name: 'blocos_relatorio',
            required: false,
          }),
        )
        osChanged = true
      }
      if (!osCol.fields.getByName('pendencias_recomendacoes')) {
        osCol.fields.add(
          new TextField({
            name: 'pendencias_recomendacoes',
            required: false,
          }),
        )
        osChanged = true
      }
      if (osChanged) {
        app.save(osCol)
      }
    }

    // 3. Pré-cadastrar os blocos do tipo Limpeza no tipos_atividades_custom
    const blocosLimpezaPadrao = [
      {
        id: 'bloco_metodologia_limpeza',
        titulo: 'Metodologia de Limpeza',
        texto:
          'Lavagem técnica com água desmineralizada/filtrada, escovação manual com cerdas macias, sem abrasivos, sem choque térmico nos módulos.',
        ordem: 1,
      },
      {
        id: 'bloco_produtos_cuidados',
        titulo: 'Produtos & Cuidados',
        texto:
          'Água tratada, sem solventes ou produtos ácidos/alcalinos que degradem o revestimento antirreflexo ou anulem garantias do fabricante.',
        ordem: 2,
      },
    ]

    try {
      const records = app.findRecordsByFilter(
        'tipos_atividades_custom',
        'nome ~ "Limpeza" || nome ~ "limpeza"',
      )
      for (const rec of records) {
        rec.set('blocos_relatorio', blocosLimpezaPadrao)
        app.save(rec)
      }
    } catch (_e) {
      // ignora caso não haja registros
    }
  },
  (app) => {
    const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')
    if (tiposCol) {
      const f = tiposCol.fields.getByName('blocos_relatorio')
      if (f) tiposCol.fields.remove(f)
      app.save(tiposCol)
    }

    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      const f1 = osCol.fields.getByName('blocos_relatorio')
      if (f1) osCol.fields.remove(f1)
      const f2 = osCol.fields.getByName('pendencias_recomendacoes')
      if (f2) osCol.fields.remove(f2)
      app.save(osCol)
    }
  },
)

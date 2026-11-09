// Adiciona campos de relatório e horários faltantes na coleção atividades e ordens_servico se aplicável:
// - pendencias_recomendacoes (text) em atividades
// - blocos_relatorio (json) em atividades
// - horario_inicio (text), horario_fim (text), duracao_minutos (number) em ordens_servico (para manter paridade)

migrate(
  (app) => {
    // 1. atividades: adicionar pendencias_recomendacoes e blocos_relatorio se não existirem
    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      let ativChanged = false
      if (!ativCol.fields.getByName('pendencias_recomendacoes')) {
        ativCol.fields.add(
          new TextField({
            name: 'pendencias_recomendacoes',
            required: false,
          }),
        )
        ativChanged = true
      }
      if (!ativCol.fields.getByName('blocos_relatorio')) {
        ativCol.fields.add(
          new JSONField({
            name: 'blocos_relatorio',
            required: false,
          }),
        )
        ativChanged = true
      }
      if (ativChanged) {
        app.save(ativCol)
      }
    }

    // 2. ordens_servico: adicionar horario_inicio, horario_fim, duracao_minutos se não existirem
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      let osChanged = false
      if (!osCol.fields.getByName('horario_inicio')) {
        osCol.fields.add(
          new TextField({
            name: 'horario_inicio',
            required: false,
          }),
        )
        osChanged = true
      }
      if (!osCol.fields.getByName('horario_fim')) {
        osCol.fields.add(
          new TextField({
            name: 'horario_fim',
            required: false,
          }),
        )
        osChanged = true
      }
      if (!osCol.fields.getByName('duracao_minutos')) {
        osCol.fields.add(
          new NumberField({
            name: 'duracao_minutos',
            required: false,
          }),
        )
        osChanged = true
      }
      if (osChanged) {
        app.save(osCol)
      }
    }
  },
  (app) => {
    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      const f1 = ativCol.fields.getByName('pendencias_recomendacoes')
      if (f1) ativCol.fields.remove(f1)
      const f2 = ativCol.fields.getByName('blocos_relatorio')
      if (f2) ativCol.fields.remove(f2)
      app.save(ativCol)
    }

    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      const f1 = osCol.fields.getByName('horario_inicio')
      if (f1) osCol.fields.remove(f1)
      const f2 = osCol.fields.getByName('horario_fim')
      if (f2) osCol.fields.remove(f2)
      const f3 = osCol.fields.getByName('duracao_minutos')
      if (f3) osCol.fields.remove(f3)
      app.save(osCol)
    }
  },
)

migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('configuracoes_monitoramento')
      const campoTipo = col.fields.getByName('tipo_procedimento')
      if (campoTipo) {
        // Expandir opções permitidas do select para permitir 'ambos' além de 'pdf' e 'link'
        campoTipo.values = ['pdf', 'link', 'ambos']
        campoTipo.maxSelect = 1
        app.save(col)
      }
    } catch (err) {
      console.warn('Aviso na migration 1745260007_allow_ambos_in_configuracoes_monitoramento:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('configuracoes_monitoramento')
      const campoTipo = col.fields.getByName('tipo_procedimento')
      if (campoTipo) {
        campoTipo.values = ['pdf', 'link']
        app.save(col)
      }
    } catch (_) {}
  },
)

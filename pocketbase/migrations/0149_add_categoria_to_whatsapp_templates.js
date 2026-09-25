migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('whatsapp_templates')
    if (!col.fields.getByName('categoria')) {
      col.fields.add(new TextField({ name: 'categoria', required: false }))
      app.save(col)
    }

    // Classificar templates existentes nas categorias oficiais do CRM
    try {
      const records = app.findRecordsByFilter('whatsapp_templates', '', '', 100, 0)
      for (const rec of records) {
        const slug = rec.getString('slug')
        const tipo = rec.getString('tipo_gatilho')
        const atual = rec.getString('categoria')
        if (!atual) {
          if (
            slug === 'lembrete_auto_leitura_rge' ||
            slug === 'os_atribuida_instalador' ||
            tipo === 'operacional'
          ) {
            rec.set('categoria', 'Operacional')
          } else if (slug === 'confirmacao_proposta' || tipo === 'proposta_aprovada') {
            rec.set('categoria', 'Comercial')
          } else if (slug === 'lembrete_visita_tecnica' || tipo === 'lembrete_visita') {
            rec.set('categoria', 'Atendimento')
          } else if (slug === 'followup_pos_venda' || tipo === 'followup_posvenda') {
            rec.set('categoria', 'Pós-Vendas')
          } else {
            rec.set('categoria', 'Geral')
          }
          app.save(rec)
        }
      }
    } catch (errRecs) {
      console.log('[MIGRATION 0149] Erro ao classificar templates existentes:', errRecs)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('whatsapp_templates')
      if (col.fields.getByName('categoria')) {
        col.fields.removeByName('categoria')
        app.save(col)
      }
    } catch (_) {}
  },
)

migrate(
  (app) => {
    // 1. Tornar plano_escolhido, valor_mensal_plano e valor_anual_plano opcionais
    const col = app.findCollectionByNameOrId('propostas_om')

    const planoField = col.fields.getByName('plano_escolhido')
    if (planoField) {
      planoField.required = false
    }

    const valorMensalField = col.fields.getByName('valor_mensal_plano')
    if (valorMensalField) {
      valorMensalField.required = false
    }

    const valorAnualField = col.fields.getByName('valor_anual_plano')
    if (valorAnualField) {
      valorAnualField.required = false
    }

    app.save(col)

    // 2. Esvaziar / atualizar o campo plano_escolhido nas propostas existentes (ex.: Frigorífico Lima e Mercado Santos e outras)
    // Conforme pedido: "As 2 propostas de exemplo existentes (Frigorífico Lima e Mercado Santos) podem ter o campo de plano esvaziado/migrado — mantenha os registros funcionando e regeneráveis."
    try {
      app.db().newQuery("UPDATE propostas_om SET plano_escolhido = ''").execute()
    } catch (e) {
      console.log('Erro ao esvaziar plano_escolhido em propostas_om:', e)
    }

    // 3. Atualizar textos de atividades e timeline_om das propostas sem citar plano específico
    try {
      app
        .db()
        .newQuery(`
        UPDATE atividades
        SET titulo = 'Proposta O&M Gerada',
            descricao = 'Proposta técnica e comercial de Gestão e Manutenção gerada com comparativo dos 3 planos (Essencial, Prevenção e Completo). Ativo protegido de R$ 8.970,00/mês.'
        WHERE titulo LIKE '%Proposta O&M%Plano Completo%'
      `)
        .execute()

      app
        .db()
        .newQuery(`
        UPDATE atividades
        SET titulo = 'Proposta O&M Gerada',
            descricao = 'Proposta técnica e comercial de Gestão e Manutenção gerada com comparativo dos 3 planos (Essencial, Prevenção e Completo). Ativo protegido de R$ 1.372,80/mês.'
        WHERE titulo LIKE '%Proposta O&M%Plano Prevenção%'
      `)
        .execute()

      app
        .db()
        .newQuery(`
        UPDATE timeline_om
        SET titulo = 'Proposta O&M Emitida',
            descricao = 'Documento técnico de proposta O&M entregue com cálculo de cenários de exposição e comparativo completo dos planos.'
        WHERE titulo LIKE '%Proposta O&M%Emitida%'
      `)
        .execute()
    } catch (e) {
      console.log('Erro ao atualizar textos no histórico:', e)
    }
  },
  (app) => {
    // Reverter caso necessário
    try {
      const col = app.findCollectionByNameOrId('propostas_om')
      const planoField = col.fields.getByName('plano_escolhido')
      if (planoField) {
        planoField.required = true
      }
      app.save(col)
    } catch (_) {}
  },
)

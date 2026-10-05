migrate(
  (app) => {
    // 1. Atualizar select tipo_venda na coleção 'negocios' adicionando 'Créditos de energia'
    try {
      const negociosCol = app.findCollectionByNameOrId('negocios')
      const tipoVendaNeg = negociosCol.fields.getByName('tipo_venda')
      if (tipoVendaNeg) {
        const valoresAtuais = tipoVendaNeg.values || []
        if (!valoresAtuais.includes('Créditos de energia')) {
          tipoVendaNeg.values = [...valoresAtuais, 'Créditos de energia']
        }
      }

      // Adicionar 'creditos_energia' ao select tipo_negocio da coleção 'negocios' se existir
      const tipoNegocioNeg = negociosCol.fields.getByName('tipo_negocio')
      if (tipoNegocioNeg) {
        const valoresAtuais = tipoNegocioNeg.values || []
        if (!valoresAtuais.includes('creditos_energia')) {
          tipoNegocioNeg.values = [...valoresAtuais, 'creditos_energia']
        }
      }

      app.save(negociosCol)
    } catch (e) {
      console.log('[migration 1745260013] Erro ao atualizar negocios:', e)
    }

    // 2. Atualizar select tipo_venda na coleção 'clientes' adicionando 'Créditos de energia'
    try {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      const tipoVendaCli = clientesCol.fields.getByName('tipo_venda')
      if (tipoVendaCli) {
        const valoresAtuais = tipoVendaCli.values || []
        if (!valoresAtuais.includes('Créditos de energia')) {
          tipoVendaCli.values = [...valoresAtuais, 'Créditos de energia']
          app.save(clientesCol)
        }
      }
    } catch (e) {
      console.log('[migration 1745260013] Erro ao atualizar clientes:', e)
    }
  },
  (app) => {
    // Rollback seguro: não remove dados existentes
    try {
      const negociosCol = app.findCollectionByNameOrId('negocios')
      const tipoVendaNeg = negociosCol.fields.getByName('tipo_venda')
      if (tipoVendaNeg && tipoVendaNeg.values) {
        tipoVendaNeg.values = tipoVendaNeg.values.filter((v) => v !== 'Créditos de energia')
      }
      const tipoNegocioNeg = negociosCol.fields.getByName('tipo_negocio')
      if (tipoNegocioNeg && tipoNegocioNeg.values) {
        tipoNegocioNeg.values = tipoNegocioNeg.values.filter((v) => v !== 'creditos_energia')
      }
      app.save(negociosCol)
    } catch (_) {}

    try {
      const clientesCol = app.findCollectionByNameOrId('clientes')
      const tipoVendaCli = clientesCol.fields.getByName('tipo_venda')
      if (tipoVendaCli && tipoVendaCli.values) {
        tipoVendaCli.values = tipoVendaCli.values.filter((v) => v !== 'Créditos de energia')
        app.save(clientesCol)
      }
    } catch (_) {}
  },
)

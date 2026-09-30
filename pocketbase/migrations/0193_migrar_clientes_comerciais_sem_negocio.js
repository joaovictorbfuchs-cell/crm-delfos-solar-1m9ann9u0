migrate(
  (app) => {
    // 0193_migrar_clientes_comerciais_sem_negocio.js
    // Garante que todo cliente presente no Funil Comercial (não arquivado, não transferido para pós-vendas)
    // tenha ao menos um registro correspondente na coleção 'negocios', vinculado pelo cliente_id.
    const negociosCol = app.findCollectionByNameOrId('negocios')
    if (!negociosCol) {
      console.warn('Coleção negocios não encontrada!')
      return
    }

    const mapaEtapas = {
      'Novo Lead': 'novo lead',
      Levantamento: 'qualificado',
      Orçamento: 'proposta enviada',
      Negociação: 'negociação',
      Fechado: 'contrato assinado',
      'Contato Futuro': 'novo lead',
      Perdido: 'novo lead',
    }

    const batchSize = 100
    let offset = 0
    let criados = 0

    while (true) {
      // Clientes não arquivados e não transferidos para pós-vendas
      const clientes = app.findRecordsByFilter(
        'clientes',
        'arquivado != true && transferido_pos_vendas != true',
        'created',
        batchSize,
        offset,
      )

      if (!clientes || clientes.length === 0) break

      for (let i = 0; i < clientes.length; i++) {
        const c = clientes[i]
        const cid = c.id

        // Verifica se já existe algum negócio para este cliente
        let negociosExistentes = []
        try {
          negociosExistentes = app.findRecordsByFilter(
            'negocios',
            `cliente_id = "${cid}"`,
            '-created',
            1,
            0,
          )
        } catch (e) {
          negociosExistentes = []
        }

        if (!negociosExistentes || negociosExistentes.length === 0) {
          const statusCliente = c.getString('status') || 'Novo Lead'
          const etapaFunil = mapaEtapas[statusCliente] || 'novo lead'

          let negocioStatus = 'em andamento'
          if (statusCliente === 'Fechado') negocioStatus = 'ganho'
          else if (statusCliente === 'Perdido') negocioStatus = 'perdido'

          const valorEstimado = c.getFloat('valor_estimado') || 0
          const valorFinal = c.getFloat('valor_final') || 0
          const tipoVenda = c.getString('tipo_venda') || 'Energia Solar'
          const nomeCliente = c.getString('nome') || 'Negócio Comercial'

          const rec = new Record(negociosCol)
          rec.set('cliente_id', cid)
          rec.set('titulo', nomeCliente)
          rec.set('tipo_negocio', 'venda usina')
          rec.set('tipo_venda', tipoVenda)
          rec.set('valor_estimado', valorEstimado)
          rec.set('valor_final', valorFinal)
          rec.set('valor', valorFinal > 0 ? valorFinal : valorEstimado)
          rec.set('etapa_funil', etapaFunil)
          rec.set('status', negocioStatus)
          rec.set('reabertura', c.getBool('reabertura'))
          rec.set('recorrencia_mensal', c.getBool('recorrencia_mensal'))

          const respId = c.getString('responsavel_id')
          if (respId) rec.set('consultor_responsavel', respId)

          const dataPrev = c.getString('data_previsao_fechamento')
          if (dataPrev) rec.set('data_previsao_fechamento', dataPrev)

          const dataFech = c.getString('data_fechamento')
          if (dataFech) rec.set('data_fechamento', dataFech)

          const motivoPerda = c.getString('motivo_perda')
          if (motivoPerda) rec.set('motivo_perda', motivoPerda)

          const condPag = c.getString('condicao_pagamento')
          if (condPag) rec.set('condicao_pagamento', condPag)

          app.save(rec)
          criados++
        }
      }

      if (clientes.length < batchSize) break
      offset += batchSize
    }

    console.log(
      `[0193] Migração concluída: ${criados} negócio(s) criado(s) para clientes sem negócio.`,
    )
  },
  (app) => {
    // Revert opcional: não exclui negócios criados para evitar perda de dados adicionados
  },
)

migrate(
  (app) => {
    // 1745260004_limpar_negocios_em_aberto_fora_do_funil.js
    // Varredura de limpeza de negócios conforme pedido literal do usuário (Opção B):
    // Apaga negócios em aberto (status != 'ganho' e status != 'perdido') cujos clientes
    // estão arquivados (arquivado = true) ou transferidos para Pós-Vendas (transferido_pos_vendas = true).
    // Mantém 100% intactos todos os clientes e seus registros vinculados (atividades, propostas,
    // ordens de serviço, usinas, contatos, etc.).

    const negociosCol = app.findCollectionByNameOrId('negocios')
    if (!negociosCol) {
      console.warn('[1745260004] Coleção negocios não encontrada!')
      return
    }

    const batchSize = 100
    let offset = 0
    let totalAnalisados = 0
    let totalApagados = 0
    const relatorioApagados = []

    while (true) {
      // Busca negócios em aberto (status != 'ganho' && status != 'perdido')
      const records = app.findRecordsByFilter(
        'negocios',
        "status != 'ganho' && status != 'perdido'",
        'created',
        batchSize,
        offset,
      )

      if (!records || records.length === 0) break

      const paraApagarNestaIteracao = []

      for (let i = 0; i < records.length; i++) {
        totalAnalisados++
        const neg = records[i]
        const cid = neg.getString('cliente_id')
        if (!cid) continue

        let cli = null
        try {
          cli = app.findRecordById('clientes', cid)
        } catch (e) {
          cli = null
        }

        if (!cli) continue

        const isArquivado = cli.getBool('arquivado')
        const isTransferidoPosVendas = cli.getBool('transferido_pos_vendas')

        if (isArquivado || isTransferidoPosVendas) {
          paraApagarNestaIteracao.push({
            negocioRecord: neg,
            negocioId: neg.id,
            clienteId: cid,
            clienteNome: cli.getString('nome') || cli.getString('razao_social') || 'Cliente',
            etapa: neg.getString('etapa_funil') || 'novo lead',
            titulo: neg.getString('titulo') || 'Negócio Comercial',
            motivo: isArquivado ? 'cliente_arquivado' : 'cliente_transferido_pos_vendas',
          })
        }
      }

      for (const item of paraApagarNestaIteracao) {
        try {
          app.delete(item.negocioRecord)
          totalApagados++
          relatorioApagados.push({
            negocioId: item.negocioId,
            clienteId: item.clienteId,
            clienteNome: item.clienteNome,
            etapa: item.etapa,
            motivo: item.motivo,
          })
        } catch (delErr) {
          console.error(`[1745260004] Erro ao deletar negócio ${item.negocioId}:`, delErr)
        }
      }

      // Se apagamos itens na página atual, o offset de paginação precisa ser ajustado
      // ou mantemos o offset avançando pelos itens NÃO apagados
      const naoApagados = records.length - paraApagarNestaIteracao.length
      offset += naoApagados

      if (records.length < batchSize) break
    }

    console.log(
      `[1745260004] Varredura de limpeza de negócios concluída com sucesso! Total analisados: ${totalAnalisados}, Total apagados: ${totalApagados}`,
    )
    for (const r of relatorioApagados) {
      console.log(
        `[1745260004] Negócio apagado: ID ${r.negocioId} | Cliente: ${r.clienteNome} (${r.clienteId}) | Etapa: ${r.etapa} | Motivo: ${r.motivo}`,
      )
    }
  },
  (app) => {
    // Reversão não recomendada pois o usuário solicitou explicitamente a remoção definitiva desses negócios
  },
)

migrate(
  (app) => {
    try {
      const targetCol = app.findCollectionByNameOrId('configuracoes')
      const records = app.findRecordsByFilter(
        'configuracoes',
        "chave = 'oferta_limpeza_config_padrao'",
      )

      if (!records || records.length === 0) {
        const mensagemPadrao =
          'Olá, [nome do cliente]! Aqui é da Delfos Solar. Passando para lembrar que a limpeza periódica das placas solares é essencial para manter a geração de energia no máximo. Sujeira e poeira podem reduzir o desempenho em até [perda percentual]%. Ou seja, como sua usina gera em média [geração média] kWh e o valor da fatura é R$ 1,198, são aproximadamente R$ [valor calculado] que são perdidos devido à sujeira. Temos disponibilidade para fazer a limpeza da sua usina de [potência] em [cidade]. O investimento é de [valor] e inclui inspeção visual completa do sistema. Posso agendar para você?'

        const rec = new Record(targetCol)
        rec.set('chave', 'oferta_limpeza_config_padrao')
        rec.set('valor', mensagemPadrao)
        rec.set('dados', {
          mensagem: mensagemPadrao,
          percentual_perda: 30,
        })
        rec.set('descricao', 'Modelo de mensagem e percentual padrão da oferta de limpeza avulsa')
        app.save(rec)
      }
    } catch (err) {
      console.warn('Aviso ao semear oferta_limpeza_config_padrao:', err)
    }
  },
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'configuracoes',
        "chave = 'oferta_limpeza_config_padrao'",
      )
      for (let i = 0; i < records.length; i++) {
        app.delete(records[i])
      }
    } catch (_) {}
  },
)

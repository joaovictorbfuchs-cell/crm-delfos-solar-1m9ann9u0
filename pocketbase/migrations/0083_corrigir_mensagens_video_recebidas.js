/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Corrigir mensagem de vídeo específica recebida às 07:17 (id: sx4x9abd31lfmra)
    // ou quaisquer mensagens recebidas que contenham links/extensões de vídeo mas foram salvas como 'texto'
    try {
      const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')

      // 1. Corrigir diretamente a mensagem sx4x9abd31lfmra se existir
      try {
        const specificRecord = app.findRecordById(msgsCol.id, 'sx4x9abd31lfmra')
        if (specificRecord) {
          specificRecord.set('tipo_mensagem', 'video')
          if (specificRecord.getString('conteudo_final') === '[Mensagem recebida]') {
            specificRecord.set('conteudo_final', '[Vídeo]')
          }
          if (
            !specificRecord.getString('arquivo') &&
            !specificRecord.getString('motivo_falha_midia')
          ) {
            specificRecord.set(
              'motivo_falha_midia',
              'Mídia não armazenada no momento do recebimento (Z-API não forneceu arquivo)',
            )
          }
          app.save(specificRecord)
        }
      } catch (errSpec) {
        console.log('[MIGRATION 0083] Mensagem sx4x9abd31lfmra não encontrada:', errSpec)
      }

      // 2. Atualizar a conversa correspondente (t7dzbppx15rppl9) caso a última mensagem preview seja '[Mensagem recebida]'
      try {
        const convCol = app.findCollectionByNameOrId('whatsapp_conversas')
        const convRecord = app.findRecordById(convCol.id, 't7dzbppx15rppl9')
        if (convRecord) {
          if (convRecord.getString('ultima_mensagem_preview') === '[Mensagem recebida]') {
            convRecord.set('ultima_mensagem_preview', '[Vídeo]')
            app.save(convRecord)
          }
        }
      } catch (errConv) {
        console.log('[MIGRATION 0083] Conversa t7dzbppx15rppl9 não encontrada:', errConv)
      }

      // 3. Varredura defensiva por outras mensagens salvas como texto que tenham indicativo de vídeo
      const candidateMsgs = app.findRecordsByFilter(
        msgsCol.id,
        "tipo_mensagem = 'texto' && (documento_url ~ '.mp4' || nome_arquivo ~ '.mp4' || documento_url ~ '.mov' || nome_arquivo ~ '.mov')",
        '-created',
        50,
        0,
      )

      for (let i = 0; i < candidateMsgs.length; i++) {
        const rec = candidateMsgs[i]
        rec.set('tipo_mensagem', 'video')
        if (rec.getString('conteudo_final') === '[Mensagem recebida]') {
          rec.set('conteudo_final', '[Vídeo]')
        }
        app.save(rec)
      }
    } catch (err) {
      console.log('[MIGRATION 0083 ERRO]', err && err.message ? err.message : String(err))
    }
  },
  (app) => {
    // Revert opcional
  },
)

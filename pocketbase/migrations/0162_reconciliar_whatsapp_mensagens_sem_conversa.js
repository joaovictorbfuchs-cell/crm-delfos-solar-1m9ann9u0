/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Migration 0162: Reconciliação retroativa de whatsapp_mensagens sem conversa_id
    try {
      const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
      const convCol = app.findCollectionByNameOrId('whatsapp_conversas')

      // Buscar todas as mensagens com conversa_id vazio ou nulo
      let msgsSemConversa = []
      try {
        msgsSemConversa = app.findRecordsByFilter(
          msgsCol.id,
          "conversa_id = '' || conversa_id = null",
          'created',
          1000,
          0,
        )
      } catch (e) {
        console.log('[MIGRATION 0162] Erro ao buscar mensagens sem conversa:', e)
        return
      }

      if (!msgsSemConversa || msgsSemConversa.length === 0) {
        console.log('[MIGRATION 0162] Nenhuma mensagem sem conversa_id encontrada.')
        return
      }

      console.log(
        `[MIGRATION 0162] Encontradas ${msgsSemConversa.length} mensagens sem conversa_id para reconciliar.`,
      )

      for (let i = 0; i < msgsSemConversa.length; i++) {
        const msg = msgsSemConversa[i]
        const clienteId = msg.getString('cliente_id')
        const telDestino = (msg.getString('telefone_destino') || '').replace(/\D/g, '')
        const last8 = telDestino.length >= 8 ? telDestino.slice(-8) : telDestino
        const conteudo = msg.getString('conteudo_final') || ''
        const msgCreated = msg.getString('created') || new Date().toISOString()

        let conversaRecord = null

        // 1. Tentar por cliente_id
        if (clienteId) {
          try {
            const convs = app.findRecordsByFilter(
              convCol.id,
              `cliente_id = '${clienteId}'`,
              '-updated',
              1,
              0,
            )
            if (convs && convs.length > 0) {
              conversaRecord = convs[0]
            }
          } catch (_) {}
        }

        // 2. Se não achou por cliente_id, tentar por telefone_destino (últimos 8 dígitos)
        if (!conversaRecord && last8) {
          try {
            const convs = app.findRecordsByFilter(
              convCol.id,
              `numero ~ '${last8}'`,
              '-updated',
              1,
              0,
            )
            if (convs && convs.length > 0) {
              conversaRecord = convs[0]
            }
          } catch (_) {}
        }

        // 3. Se ainda não achou, obter dados do cliente para telefone
        let clienteRec = null
        if (clienteId) {
          try {
            clienteRec = app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)[0]
          } catch (_) {}
        }

        // 4. Se não existe conversa, criar uma nova
        if (!conversaRecord) {
          let numParaConversa = telDestino
          if (
            numParaConversa.length >= 10 &&
            numParaConversa.length <= 11 &&
            !numParaConversa.startsWith('55')
          ) {
            numParaConversa = '55' + numParaConversa
          }
          if (!numParaConversa && clienteRec) {
            const cTel = (
              clienteRec.getString('whatsapp') ||
              clienteRec.getString('telefone') ||
              ''
            ).replace(/\D/g, '')
            if (cTel) {
              numParaConversa =
                cTel.length >= 10 && cTel.length <= 11 && !cTel.startsWith('55')
                  ? '55' + cTel
                  : cTel
            }
          }
          if (!numParaConversa) {
            numParaConversa = 'desconhecido'
          }

          conversaRecord = new Record(convCol)
          conversaRecord.set('numero', numParaConversa)
          if (clienteId) {
            conversaRecord.set('cliente_id', clienteId)
            conversaRecord.set('vinculada_em', msgCreated)
          }
          conversaRecord.set('status', 'em_atendimento')
          conversaRecord.set('ultima_mensagem_preview', conteudo ? conteudo.substring(0, 100) : '')
          conversaRecord.set('ultima_mensagem_em', msgCreated)
          conversaRecord.set('nao_lidas', 0)
          app.save(conversaRecord)
          console.log(
            `[MIGRATION 0162] Criada nova conversa ${conversaRecord.id} para cliente ${clienteId} / tel ${numParaConversa}`,
          )
        } else {
          // Conversa já existia: se ela não tinha cliente_id e a mensagem tem, vincular
          if (clienteId && !conversaRecord.getString('cliente_id')) {
            conversaRecord.set('cliente_id', clienteId)
            conversaRecord.set('vinculada_em', msgCreated)
            app.save(conversaRecord)
          }
        }

        // 5. Atualizar a mensagem com a conversa_id
        if (conversaRecord && conversaRecord.id) {
          msg.set('conversa_id', conversaRecord.id)
          app.save(msg)
        }
      }

      console.log('[MIGRATION 0162] Reconciliação concluída com sucesso.')
    } catch (err) {
      console.log('[MIGRATION 0162 ERRO]', err)
    }
  },
  (app) => {
    // Reversão não é estritamente necessária pois dados válidos foram apenas associados
  },
)

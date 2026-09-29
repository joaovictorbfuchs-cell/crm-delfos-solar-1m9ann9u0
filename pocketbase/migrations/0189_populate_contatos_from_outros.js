migrate(
  (app) => {
    try {
      const outros = app.findRecordsByFilter('outros_contatos', "id != ''", 'created', 2000, 0)
      const contatosColRef = app.findCollectionByNameOrId('contatos')

      for (let i = 0; i < outros.length; i++) {
        const oc = outros[i]
        const nome = (oc.get('nome') || '').trim() || 'Contato sem nome'
        const tel = (oc.get('telefone') || '').trim()
        const tipo = (oc.get('tipo_contato') || 'outro').toLowerCase()

        // Mapear papel
        let papel = 'outro'
        if (tipo === 'fornecedor') papel = 'fornecedor'
        else if (tipo === 'instalador') papel = 'tecnico'
        else if (tipo === 'parceiro') papel = 'parceiro'

        const obs = oc.get('observacao') || ''
        const conversaId = oc.get('conversa_id') || ''

        // Regra WhatsApp autoritativo: se tem telefone que nao seja 00000000000, salva como whatsapp e telefone
        const isTelValido = tel && tel !== '00000000000'
        const whatsapp = isTelValido ? tel : ''
        const telefone = isTelValido ? tel : ''

        const record = new Record(contatosColRef)
        record.set('nome', nome)
        record.set('telefone', telefone)
        record.set('whatsapp', whatsapp)
        record.set('papel', papel)
        record.set('observacoes', obs)
        record.set('conversa_id', conversaId)
        record.set('origem_registro', 'migracao_outros_contatos')
        app.save(record)
      }
    } catch (err) {
      console.log('Erro ao popular contatos:', err)
    }
  },
  (app) => {
    // no-op
  },
)

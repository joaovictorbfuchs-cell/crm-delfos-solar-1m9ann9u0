// Sincronização e prioridade entre campos de telefone e WhatsApp na coleção 'clientes'
// Regra de negócio (WhatsApp é a fonte da verdade):
// 1. Se whatsapp preenchido e telefone vazio ou diferente -> telefone = whatsapp (copia WhatsApp para telefone)
// 2. Se whatsapp vazio e telefone preenchido -> whatsapp = telefone (mantém comportamento de importação/criação onde só existe telefone)

onRecordCreate((e) => {
  try {
    const record = e.record
    const tel = (record.getString('telefone') || '').trim()
    const wpp = (record.getString('whatsapp') || '').trim()

    if (wpp) {
      if (!tel || tel !== wpp) {
        record.set('telefone', record.getString('whatsapp'))
      }
    } else if (tel) {
      record.set('whatsapp', record.getString('telefone'))
    }
  } catch (err) {
    console.log('[CLIENTES_SYNC_WHATSAPP CREATE ERRO]:', err)
  }

  return e.next()
}, 'clientes')

onRecordUpdate((e) => {
  try {
    const record = e.record
    const tel = (record.getString('telefone') || '').trim()
    const wpp = (record.getString('whatsapp') || '').trim()

    if (wpp) {
      if (!tel || tel !== wpp) {
        record.set('telefone', record.getString('whatsapp'))
      }
    } else if (tel) {
      record.set('whatsapp', record.getString('telefone'))
    }
  } catch (err) {
    console.log('[CLIENTES_SYNC_WHATSAPP UPDATE ERRO]:', err)
  }

  return e.next()
}, 'clientes')

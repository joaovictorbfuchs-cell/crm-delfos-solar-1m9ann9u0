// Prevenir recorrência de clientes com telefone preenchido e whatsapp vazio
// Ao criar ou atualizar um registro na coleção 'clientes', se whatsapp estiver vazio e telefone preenchido,
// copia automaticamente o valor de telefone para whatsapp sem sobrescrever se já preenchido.

onRecordCreate((e) => {
  try {
    const record = e.record
    const tel = (record.getString('telefone') || '').trim()
    const wpp = (record.getString('whatsapp') || '').trim()

    if (tel && !wpp) {
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

    if (tel && !wpp) {
      record.set('whatsapp', record.getString('telefone'))
    }
  } catch (err) {
    console.log('[CLIENTES_SYNC_WHATSAPP UPDATE ERRO]:', err)
  }

  return e.next()
}, 'clientes')

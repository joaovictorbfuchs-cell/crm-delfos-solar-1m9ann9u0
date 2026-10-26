// Sincronização e prioridade entre campos de telefone e WhatsApp na coleção 'clientes'
// Regra mantida: telefone e whatsapp são campos independentes.
// Nova regra aditiva: quando um registro de 'clientes' tem whatsapp ou telefone alterado,
// sincronizar o campo `numero` (normalizado internacionalmente com DDI 55) das `whatsapp_conversas`
// vinculadas a esse cliente, evitando que conversas existentes continuem apontando para números antigos.

onRecordCreate((e) => {
  e.next()

  try {
    const rec = e.record
    if (!rec) return
    const rawWhats = rec.getString('whatsapp') || ''
    const rawTel = rec.getString('telefone') || ''
    const numeroAtual = rawWhats || rawTel
    if (!numeroAtual) return

    let d = String(numeroAtual).replace(/\D/g, '')
    if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) {
      d = '55' + d
    }
    if (!d || d.length < 10) return

    const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
    if (!convCol) return

    const conversas = $app.findRecordsByFilter(
      convCol.id,
      `cliente_id = '${rec.id}'`,
      '-updated',
      50,
      0,
    )
    if (!conversas || conversas.length === 0) return

    for (let i = 0; i < conversas.length; i++) {
      const conv = conversas[i]
      let numConv = String(conv.getString('numero') || '').replace(/\D/g, '')
      if (numConv.length >= 10 && numConv.length <= 11 && !numConv.startsWith('55')) {
        numConv = '55' + numConv
      }
      if (numConv !== d) {
        conv.set('numero', d)
        $app.save(conv)
      }
    }
  } catch (err) {
    console.log('[CLIENTES SYNC CREATE CONVERSA ERRO]', err)
  }
}, 'clientes')

onRecordUpdate((e) => {
  e.next()

  try {
    const rec = e.record
    if (!rec) return
    const rawWhats = rec.getString('whatsapp') || ''
    const rawTel = rec.getString('telefone') || ''
    const numeroAtual = rawWhats || rawTel
    if (!numeroAtual) return

    let d = String(numeroAtual).replace(/\D/g, '')
    if (d.length >= 10 && d.length <= 11 && !d.startsWith('55')) {
      d = '55' + d
    }
    if (!d || d.length < 10) return

    const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
    if (!convCol) return

    const conversas = $app.findRecordsByFilter(
      convCol.id,
      `cliente_id = '${rec.id}'`,
      '-updated',
      50,
      0,
    )
    if (!conversas || conversas.length === 0) return

    for (let i = 0; i < conversas.length; i++) {
      const conv = conversas[i]
      let numConv = String(conv.getString('numero') || '').replace(/\D/g, '')
      if (numConv.length >= 10 && numConv.length <= 11 && !numConv.startsWith('55')) {
        numConv = '55' + numConv
      }
      if (numConv !== d) {
        console.log(
          `[CLIENTES SYNC CONVERSA] Atualizando número da conversa ${conv.id} do cliente ${rec.id} de "${conv.getString('numero')}" para "${d}"`,
        )
        conv.set('numero', d)
        $app.save(conv)
      }
    }
  } catch (err) {
    console.log('[CLIENTES SYNC UPDATE CONVERSA ERRO]', err)
  }
}, 'clientes')

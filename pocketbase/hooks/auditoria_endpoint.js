/**
 * Hook temporário de leitura para auditoria de dados
 * Endpoint: GET /backend/v1/auditoria-dados
 */

routerAdd('GET', '/backend/v1/auditoria-dados', (e) => {
  try {
    const contatosCol = $app.findCollectionByNameOrId('contatos')
    const clientesCol = $app.findCollectionByNameOrId('clientes')

    const contatosRecs = $app.findRecordsByFilter(contatosCol.id, '', 'created', 10000, 0)
    const clientesRecs = $app.findRecordsByFilter(clientesCol.id, '', 'created', 10000, 0)

    const contatos = contatosRecs.map((r) => ({
      id: r.id,
      nome: r.getString('nome'),
      telefone: r.getString('telefone'),
      whatsapp: r.getString('whatsapp'),
      email: r.getString('email'),
      papel: r.getString('papel'),
      cargo: r.getString('cargo'),
      observacoes: r.getString('observacoes'),
      clientes_vinculados: r.get('clientes_vinculados') || [],
      negocios_vinculados: r.get('negocios_vinculados') || [],
      conversa_id: r.getString('conversa_id'),
      origem_registro: r.getString('origem_registro'),
      created: r.getString('created'),
      updated: r.getString('updated'),
    }))

    const clientes = clientesRecs.map((r) => ({
      id: r.id,
      nome: r.getString('nome'),
      telefone: r.getString('telefone'),
      whatsapp: r.getString('whatsapp'),
      email: r.getString('email'),
      status: r.getString('status'),
      cidade: r.getString('cidade'),
      endereco: r.getString('endereco'),
      uc: r.getString('uc'),
      cpf: r.getString('cpf'),
      cnpj: r.getString('cnpj'),
      created: r.getString('created'),
      updated: r.getString('updated'),
    }))

    return e.json(200, {
      ok: true,
      contatos,
      clientes,
    })
  } catch (err) {
    return e.json(500, {
      ok: false,
      error: err && err.message ? err.message : String(err),
    })
  }
})

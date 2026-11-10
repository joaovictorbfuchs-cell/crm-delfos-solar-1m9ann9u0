// Hook de compatibilidade para atualizar atividade via POST /backend/v1/atividades/atualizar
// Aceita autenticação de sessão ou cabeçalho do robô e atualiza registro na coleção 'atividades'.

routerAdd('POST', '/backend/v1/atividades/atualizar', (e) => {
  try {
    var porSegredo = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) {
        porSegredo = true
      }
    } catch (eS) {}

    if (!porSegredo && (!e.auth || !e.auth.id)) {
      return e.json(401, { ok: false, error: 'Autenticação necessária' })
    }

    var body = e.requestInfo().body || {}
    var id = String(body.id || body.atividade_id || '')
    if (!id) {
      return e.json(400, { ok: false, error: 'Informe id ou atividade_id' })
    }

    var record = null
    try {
      record = $app.findRecordById('atividades', id)
    } catch (eFind) {
      return e.json(404, { ok: false, error: 'Atividade não encontrada' })
    }

    // Campos permitidos para atualização
    var campos = [
      'titulo',
      'descricao',
      'status',
      'data',
      'data_agendada',
      'data_finalizacao',
      'horario_inicio',
      'horario_fim',
      'duracao_minutos',
      'responsavel_id',
      'responsavel_nome',
      'usina_id',
      'numero_uc',
      'concluida_em',
      'observacoes',
      'detalhes_execucao',
    ]

    for (var i = 0; i < campos.length; i++) {
      var k = campos[i]
      if (body[k] !== undefined) {
        record.set(k, body[k])
      }
    }

    $app.save(record)
    return e.json(200, { ok: true, id: record.id })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

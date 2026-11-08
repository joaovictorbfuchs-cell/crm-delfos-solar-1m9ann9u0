// RGE/CPFL — senha visível/editável + beneficiárias.
// Tudo inline: a VM do Skip não herda escopo de topo.
//
//   GET  /backend/v1/rge/senha?credencial_id=...   revela a senha (olho)
//   POST /backend/v1/rge/senha                     { credencial_id, senha }
//   GET  /backend/v1/rge/beneficiarias             lista (opcional ?credencial_id=)
//   POST /backend/v1/rge/beneficiarias             cria/atualiza
//   DELETE /backend/v1/rge/beneficiarias?id=...    remove
//
// O robô lê as beneficiárias em /rge/fila-do-robo para saber quais UCs
// baixar com o mesmo login da UC geradora.

// ---- senha: revelar ----
routerAdd(
  'GET',
  '/backend/v1/rge/senha',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      if (!q.credencial_id) return e.json(400, { ok: false, error: 'Informe credencial_id' })
      var rec = $app.findRecordById('rge_credenciais', String(q.credencial_id))
      var senha = String(rec.getString('senha') || '')
      return e.json(200, { ok: true, senha: senha, tem_senha: !!senha })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 300) })
    }
  },
  $apis.requireAuth(),
)

// ---- senha: gravar ----
routerAdd(
  'POST',
  '/backend/v1/rge/senha',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var body = e.requestInfo().body || {}
      if (!body.credencial_id) return e.json(400, { ok: false, error: 'Informe credencial_id' })
      var rec = $app.findRecordById('rge_credenciais', String(body.credencial_id))
      var nova = String(body.senha == null ? '' : body.senha)
      if (!nova) return e.json(400, { ok: false, error: 'Informe a senha' })
      rec.set('senha', nova)
      rec.set('status', 'novo')
      rec.set('ultimo_erro', '')
      $app.save(rec)
      return e.json(200, { ok: true, tem_senha: true })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 300) })
    }
  },
  $apis.requireAuth(),
)

// ---- beneficiárias: listar ----
routerAdd(
  'GET',
  '/backend/v1/rge/beneficiarias',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      var filtro = ''
      if (q.credencial_id) filtro = 'credencial_id = "' + String(q.credencial_id) + '"'
      var recs = []
      try {
        recs = $app.findRecordsByFilter('rge_beneficiarias', filtro, '', 500, 0)
      } catch (err) {
        recs = []
      }
      var itens = []
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i]
        itens.push({
          id: r.id,
          credencial_id: r.getString('credencial_id'),
          uc: r.getString('uc'),
          rotulo: r.getString('rotulo'),
          percentual: r.getFloat('percentual'),
          cliente_id: r.getString('cliente_id'),
          usina_id: r.getString('usina_id'),
          ativo: r.getBool('ativo'),
          observacao: r.getString('observacao'),
        })
      }
      return e.json(200, { ok: true, itens: itens })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 300) })
    }
  },
  $apis.requireAuth(),
)

// ---- beneficiárias: criar/atualizar ----
routerAdd(
  'POST',
  '/backend/v1/rge/beneficiarias',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var body = e.requestInfo().body || {}
      var benId = String(body.id == null ? '' : body.id)
      var credId = String(body.credencial_id == null ? '' : body.credencial_id)
      var uc = String(body.uc == null ? '' : body.uc).replace(/\D/g, '')
      if (!uc) return e.json(400, { ok: false, error: 'Informe o número da UC da beneficiária' })

      var rec = null
      if (benId) {
        try {
          rec = $app.findRecordById('rge_beneficiarias', benId)
        } catch (err) {}
      }
      if (!rec && credId) {
        try {
          var ach = $app.findRecordsByFilter(
            'rge_beneficiarias',
            'credencial_id = "' + credId + '" && uc = "' + uc + '"',
            '',
            1,
            0,
          )
          if (ach.length) rec = ach[0]
        } catch (err2) {}
      }
      if (!rec) {
        if (!credId) return e.json(400, { ok: false, error: 'Informe credencial_id' })
        rec = new Record($app.findCollectionByNameOrId('rge_beneficiarias'))
        rec.set('credencial_id', credId)
        rec.set('uc', uc)
      }
      if (body.rotulo !== undefined) rec.set('rotulo', String(body.rotulo).slice(0, 200))
      if (body.percentual !== undefined && body.percentual !== null && body.percentual !== '') {
        var p = Number(String(body.percentual).replace(',', '.'))
        if (!isNaN(p)) rec.set('percentual', p)
      }
      if (body.cliente_id) rec.set('cliente_id', String(body.cliente_id))
      if (body.usina_id) rec.set('usina_id', String(body.usina_id))
      if (body.observacao !== undefined)
        rec.set('observacao', String(body.observacao).slice(0, 300))
      rec.set('ativo', body.ativo === undefined ? true : !!body.ativo)
      $app.save(rec)
      return e.json(200, { ok: true, id: rec.id })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 300) })
    }
  },
  $apis.requireAuth(),
)

// ---- beneficiárias: remover ----
routerAdd(
  'DELETE',
  '/backend/v1/rge/beneficiarias',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      if (!q.id) return e.json(400, { ok: false, error: 'Informe id' })
      var rec = $app.findRecordById('rge_beneficiarias', String(q.id))
      $app.delete(rec)
      return e.json(200, { ok: true })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 300) })
    }
  },
  $apis.requireAuth(),
)

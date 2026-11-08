// RGE/CPFL — recebimento de contas vindas do robo no PC da Delfos.
// Rotas:
//   POST /backend/v1/rge/receber-conta   (autenticada por X-Robo-Secret)
//   GET  /backend/v1/rge/contas-pdf      (lista contas com flag tem_pdf)
//   GET  /backend/v1/rge/conta-por-id    (devolve o base64 de uma conta)
//   GET  /backend/v1/rge/robo-ping       (diagnostico do segredo)
//
// Segredo: $secrets.get('RGE_ROBO_SECRET').
// As SENHAS da CPFL NAO passam por aqui: ficam apenas no PC da Delfos.
// Tudo inline (a VM do Skip nao herda escopo de topo).

routerAdd(
  'POST',
  '/backend/v1/rge/receber-conta',
  (e) => {
    try {
      var segredo = $secrets.get('RGE_ROBO_SECRET') || ''
      if (!segredo) return e.json(500, { ok: false, error: 'RGE_ROBO_SECRET nao configurado' })
      var enviado = e.request.header.get('X-Robo-Secret') || ''
      if (enviado !== segredo) return e.json(401, { ok: false, error: 'Segredo invalido' })

      var body = e.requestInfo().body || {}
      var uc = String(body.uc == null ? '' : body.uc).replace(/\D/g, '')
      if (!uc) return e.json(400, { ok: false, error: 'Informe a uc' })
      var competencia = String(body.competencia == null ? '' : body.competencia)
        .trim()
        .slice(0, 20)
      if (!competencia) return e.json(400, { ok: false, error: 'Informe a competencia' })

      var b64 = String(body.pdf_base64 == null ? '' : body.pdf_base64)
      if (b64.length < 1000)
        return e.json(400, { ok: false, error: 'pdf_base64 ausente ou muito pequeno' })

      var tipo = String(body.tipo == null ? '' : body.tipo).toLowerCase()
      var filtro = 'uc = "' + uc + '" && competencia = "' + competencia + '"'
      var achados = []
      try {
        achados = $app.findRecordsByFilter('rge_contas', filtro, '', 5, 0)
      } catch (err) {
        achados = []
      }

      var rec = null
      for (var i = 0; i < achados.length; i++) {
        var t = ''
        try {
          var dd = achados[i].get('dados')
          t = dd && dd.tipo ? String(dd.tipo) : ''
        } catch (e2) {}
        if (t === tipo) {
          rec = achados[i]
          break
        }
      }
      if (!rec) rec = new Record($app.findCollectionByNameOrId('rge_contas'))

      rec.set('uc', uc)
      rec.set('competencia', competencia)
      if (body.vencimento !== undefined) rec.set('vencimento', String(body.vencimento).slice(0, 20))
      if (body.valor !== undefined && body.valor !== null && body.valor !== '') {
        var v = Number(String(body.valor).replace(/\./g, '').replace(',', '.'))
        if (!isNaN(v)) rec.set('valor', v)
      }
      if (body.consumo_kwh !== undefined && body.consumo_kwh !== null && body.consumo_kwh !== '') {
        var k = Number(body.consumo_kwh)
        if (!isNaN(k)) rec.set('consumo_kwh', k)
      }
      rec.set(
        'nome_arquivo',
        String(body.nome_arquivo || 'conta-' + uc + '-' + competencia + '.pdf').slice(0, 200),
      )
      rec.set('pdf_base64', b64)
      rec.set('origem', 'robo')
      if (body.cliente_id) rec.set('cliente_id', body.cliente_id)
      if (body.usina_id) rec.set('usina_id', body.usina_id)
      if (body.credencial_id) rec.set('credencial_id', body.credencial_id)
      rec.set('dados', {
        tipo: tipo,
        instalacao_nome: String(body.instalacao_nome || '').slice(0, 200),
        titular: String(body.titular || '').slice(0, 200),
        endereco: String(body.endereco || '').slice(0, 300),
        url_conta: String(body.url_conta || '').slice(0, 400),
        recebido_em: new Date().toISOString(),
        bytes: b64.length,
      })
      $app.save(rec)

      return e.json(200, {
        ok: true,
        conta_id: rec.id,
        uc: uc,
        competencia: competencia,
        tipo: tipo,
        kb: Math.round(b64.length / 1024),
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.bodyLimit(30 * 1024 * 1024),
)

routerAdd(
  'GET',
  '/backend/v1/rge/contas-pdf',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      var filtro = ''
      if (q.uc) filtro = 'uc = "' + String(q.uc).replace(/\D/g, '') + '"'
      var recs = []
      try {
        recs = $app.findRecordsByFilter('rge_contas', filtro, '-competencia', 300, 0)
      } catch (errSort) {
        try {
          recs = $app.findRecordsByFilter('rge_contas', filtro, '', 300, 0)
        } catch (e2) {
          recs = []
        }
      }
      var itens = []
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i]
        var dd = null
        try {
          dd = r.get('dados')
        } catch (e3) {}
        var temPdf = false
        try {
          temPdf = String(r.getString('pdf_base64') || '').length > 1000
        } catch (e4) {}
        itens.push({
          id: r.id,
          uc: r.getString('uc'),
          competencia: r.getString('competencia'),
          vencimento: r.getString('vencimento'),
          valor: r.getFloat('valor'),
          consumo_kwh: r.getFloat('consumo_kwh'),
          nome_arquivo: r.getString('nome_arquivo'),
          origem: r.getString('origem'),
          tem_pdf: temPdf,
          tipo: dd && dd.tipo ? dd.tipo : '',
          titular: dd && dd.titular ? dd.titular : '',
          created: r.getString('created'),
        })
      }
      return e.json(200, { ok: true, itens: itens })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/rge/conta-por-id',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      if (!q.id) return e.json(400, { ok: false, error: 'Informe id' })
      var rec = $app.findRecordById('rge_contas', q.id)
      var b64 = String(rec.getString('pdf_base64') || '')
      if (b64.length < 1000)
        return e.json(200, { ok: false, error: 'Esta conta nao tem PDF salvo' })
      return e.json(200, {
        ok: true,
        nome_arquivo: rec.getString('nome_arquivo') || 'conta.pdf',
        base64: b64,
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.requireAuth(),
)

routerAdd('GET', '/backend/v1/rge/robo-ping', (e) => {
  try {
    var segredo = $secrets.get('RGE_ROBO_SECRET') || ''
    if (!segredo) return e.json(500, { ok: false, error: 'RGE_ROBO_SECRET nao configurado' })
    var enviado = e.request.header.get('X-Robo-Secret') || ''
    if (enviado !== segredo) return e.json(401, { ok: false, error: 'Segredo invalido' })
    return e.json(200, { ok: true, hora: new Date().toISOString() })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err) })
  }
})

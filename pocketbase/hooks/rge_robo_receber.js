// RGE/CPFL — recebimento de contas vindas do robo no PC da Delfos.
//
// Rotas:
//   POST /backend/v1/rge/receber-conta   (auth por X-Robo-Secret)
//   GET  /backend/v1/rge/robo-ping       (diagnostico do segredo)
//   GET  /backend/v1/rge/contas-pdf      (lista contas, marcando tem_pdf)
//   GET  /backend/v1/rge/conta-por-id    (qual o arquivo PDF de uma conta)
//
// O PDF vai como ARQUIVO (campo arquivo_pdf), nao como texto:
// o campo de texto tem limite de 5.000 caracteres e a conta tem ~770 mil.
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

      // decodifica base64 manualmente (nao existe base64ToBytes nesta versao)
      var ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var limpo = String(b64).replace(/[^A-Za-z0-9+/=]/g, '')
      var tam = limpo.length
      var sobra = 0
      if (tam > 0 && limpo.charAt(tam - 1) === '=') sobra++
      if (tam > 1 && limpo.charAt(tam - 2) === '=') sobra++
      var outLen = Math.floor((tam * 3) / 4) - sobra
      if (outLen < 1000)
        return e.json(400, {
          ok: false,
          error: 'PDF vazio apos decodificar (' + outLen + ' bytes)',
        })
      var bytes = new Uint8Array(outLen)
      var pos = 0
      var jj = 0
      while (jj < tam) {
        var c1 = ALF.indexOf(limpo.charAt(jj++))
        var c2 = ALF.indexOf(limpo.charAt(jj++))
        var c3 = ALF.indexOf(limpo.charAt(jj++))
        var c4 = ALF.indexOf(limpo.charAt(jj++))
        if (c1 < 0 || c2 < 0) break
        bytes[pos++] = ((c1 << 2) | (c2 >> 4)) & 0xff
        if (c3 >= 0 && pos < outLen) bytes[pos++] = (((c2 & 15) << 4) | (c3 >> 2)) & 0xff
        if (c4 >= 0 && pos < outLen) bytes[pos++] = (((c3 & 3) << 6) | c4) & 0xff
      }
      if (pos < outLen) bytes = bytes.subarray(0, pos)

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

      var nomeArq = String(body.nome_arquivo || 'conta-' + uc + '-' + competencia + '.pdf').slice(
        0,
        180,
      )
      if (!/\.pdf$/i.test(nomeArq)) nomeArq = nomeArq + '.pdf'

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
      rec.set('nome_arquivo', nomeArq)
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
        bytes: bytes.length,
      })

      var f = $filesystem.fileFromBytes(bytes, nomeArq)
      rec.set('arquivo_pdf', f)
      $app.save(rec)

      return e.json(200, {
        ok: true,
        conta_id: rec.id,
        uc: uc,
        competencia: competencia,
        tipo: tipo,
        kb: Math.round(bytes.length / 1024),
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.bodyLimit(30 * 1024 * 1024),
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
      for (var j = 0; j < recs.length; j++) {
        var r = recs[j]
        var dd = null
        try {
          dd = r.get('dados')
        } catch (e3) {}
        var temPdf = false
        var nomeArq = r.getString('nome_arquivo') || ''
        try {
          var arqs = r.getStringSlice('arquivo_pdf')
          if (arqs && arqs.length > 0) {
            temPdf = true
            if (!nomeArq) nomeArq = arqs[0]
          }
        } catch (e4) {}
        itens.push({
          id: r.id,
          uc: r.getString('uc'),
          competencia: r.getString('competencia'),
          vencimento: r.getString('vencimento'),
          valor: r.getFloat('valor'),
          consumo_kwh: r.getFloat('consumo_kwh'),
          nome_arquivo: nomeArq,
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
      var q2 = e.requestInfo().query || {}
      if (!q2.id) return e.json(400, { ok: false, error: 'Informe id' })
      var rec = $app.findRecordById('rge_contas', q2.id)
      var arqs = []
      try {
        arqs = rec.getStringSlice('arquivo_pdf')
      } catch (e2) {}
      if (!arqs || !arqs.length)
        return e.json(200, { ok: false, error: 'Esta conta ainda nao tem PDF salvo' })
      return e.json(200, {
        ok: true,
        nome_arquivo: rec.getString('nome_arquivo') || arqs[0],
        arquivo: String(arqs[0]),
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.requireAuth(),
)

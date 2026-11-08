// RGE/CPFL — rotas /backend/v1/rge/*  (tudo inline: JSVM não herda escopo de topo)

routerAdd(
  'GET',
  '/backend/v1/rge/credenciais',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var role = String(e.auth.get('role') || e.auth.get('perfil') || '').toLowerCase()
      var email = String(e.auth.get('email') || '').toLowerCase()
      var admins = String($os.getenv('RGE_ADMIN_EMAILS') || '').split(',')
      var ok = role === 'admin' || role === 'administrador'
      for (var i = 0; i < admins.length; i++) {
        if (admins[i].trim().toLowerCase() === email && email) ok = true
      }
      try {
        if (e.auth.getBool('is_admin')) ok = true
      } catch (err) {}
      if (!ok) return e.json(403, { ok: false, error: 'Somente administradores' })

      var recs = []
      try {
        recs = $app.findRecordsByFilter('rge_credenciais', '', '-id', 300, 0)
      } catch (errSort) {
        try {
          recs = $app.findRecordsByFilter('rge_credenciais', '', '', 300, 0)
        } catch (errFallback) {
          recs = []
        }
      }
      var itens = []
      for (var j = 0; j < recs.length; j++) {
        var r = recs[j]
        itens.push({
          id: r.id,
          uc: r.getString('uc'),
          rotulo: r.getString('rotulo'),
          documento: r.getString('documento'),
          login: r.getString('login'),
          tem_senha: !!r.getString('senha'),
          tem_token: !!r.getString('token'),
          modo_auth: r.getString('modo_auth'),
          status: r.getString('status'),
          ultimo_login: r.getString('ultimo_login'),
          ultimo_erro: r.getString('ultimo_erro'),
          ativo: r.getBool('ativo'),
          cliente_id: r.getString('cliente_id'),
          usina_id: r.getString('usina_id'),
        })
      }
      return e.json(200, { ok: true, itens: itens })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/rge/credenciais',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var body = e.requestInfo().body || {}
      var uc = String(body.uc == null ? '' : body.uc).replace(/\D/g, '')
      if (!uc) return e.json(400, { ok: false, error: 'Informe o número da UC' })
      var doc = String(body.documento == null ? '' : body.documento).replace(/\D/g, '')

      var rec = null
      if (body.id) {
        try {
          rec = $app.findRecordById('rge_credenciais', body.id)
        } catch (err) {}
      }
      if (!rec) {
        var achados = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc + '"', '', 1, 0)
        if (achados.length) rec = achados[0]
      }
      if (!rec) rec = new Record($app.findCollectionByNameOrId('rge_credenciais'))

      rec.set('uc', uc)
      if (body.rotulo !== undefined) rec.set('rotulo', body.rotulo)
      if (body.documento !== undefined) rec.set('documento', doc)
      if (body.login !== undefined) rec.set('login', body.login)
      if (body.senha) rec.set('senha', body.senha)
      if (body.token) {
        rec.set('token', String(body.token).trim())
        rec.set('modo_auth', 'token')
      }
      if (body.cliente_id) rec.set('cliente_id', body.cliente_id)
      if (body.usina_id) rec.set('usina_id', body.usina_id)
      rec.set('ativo', body.ativo === undefined ? true : !!body.ativo)
      if (!rec.getString('status')) rec.set('status', 'novo')
      $app.save(rec)

      return e.json(200, {
        ok: true,
        item: {
          id: rec.id,
          uc: rec.getString('uc'),
          login: rec.getString('login'),
          tem_senha: !!rec.getString('senha'),
          tem_token: !!rec.getString('token'),
          status: rec.getString('status'),
        },
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/rge/sincronizar',
  (e) => {
    var t0 = Date.now()
    var cred = null
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var body = e.requestInfo().body || {}
      if (!body.credencial_id) return e.json(400, { ok: false, error: 'Informe credencial_id' })
      cred = $app.findRecordById('rge_credenciais', body.credencial_id)

      var uc = String(cred.getString('uc') || '').replace(/\D/g, '')
      if (!uc) return e.json(400, { ok: false, error: 'Credencial sem UC' })

      var token = cred.getString('token')
      if (!token) {
        var msg = 'Sem token. Gere o token no navegador e cole na credencial.'
        cred.set('status', 'erro')
        cred.set('ultimo_erro', msg)
        $app.save(cred)
        return e.json(200, { ok: false, error: msg, precisa_token: true })
      }

      var H = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://servicosonline.cpfl.com.br',
        Referer: 'https://servicosonline.cpfl.com.br/agencia-webapp/',
        Authorization: 'Bearer ' + token,
      }
      var API = 'https://servicosonline.cpfl.com.br/agencia-webapi'

      var infoR = $http.send({
        url: API + '/api/instalacao/informacoes-instalacao/' + encodeURIComponent(uc),
        method: 'GET',
        headers: H,
        timeout: 90000,
      })
      var stInfo = infoR.statusCode !== undefined ? infoR.statusCode : infoR.status
      if (stInfo === 401) {
        cred.set('status', 'expirado')
        cred.set('ultimo_erro', 'Token expirado (401)')
        $app.save(cred)
        return e.json(200, {
          ok: false,
          precisa_token: true,
          error: 'Token expirado. Gere outro no navegador e cole na credencial.',
        })
      }
      var info = {}
      try {
        info = JSON.parse(String(infoR.body || infoR.raw || '{}'))
      } catch (err) {}

      var pega = function (nomes) {
        for (var a = 0; a < nomes.length; a++) {
          var alvo = nomes[a].toLowerCase()
          for (var k in info) {
            if (String(k).toLowerCase() === alvo && info[k] !== null && info[k] !== '')
              return info[k]
          }
        }
        return null
      }

      var consR = $http.send({
        url: API + '/api/historico-consumo/busca-graficos',
        method: 'POST',
        headers: Object.assign({}, H, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          Instalacao: uc,
          CodigoClasse: pega(['CodigoClasse', 'CodClasse']),
          CodEmpresaSAP: pega(['CodEmpresaSAP', 'CodEmpresa']),
          NumeroContrato: pega(['Contrato', 'NumeroContrato']),
          TipoGrafico: 'Todos',
          ParceiroNegocio: null,
        }),
        timeout: 120000,
      })

      var cons = {}
      try {
        cons = JSON.parse(String(consR.body || consR.raw || '{}'))
      } catch (err) {}
      var graficos = (cons.data && cons.data.Graficos) || []

      var series = []
      var competencia = ''
      var recente = null
      for (var g = 0; g < graficos.length; g++) {
        var gr = graficos[g]
        if (!gr || !gr.Dados || !gr.Dados.length) continue
        var pontos = []
        for (var d = 0; d < gr.Dados.length; d++) {
          var dd = gr.Dados[d]
          pontos.push({ competencia: dd.Categoria, valor: dd.Valor, media: dd.MediaConsumo })
        }
        series.push({ tipo: gr.TipoGrafico, pontos: pontos })
        if (!competencia && pontos.length) {
          competencia = String(pontos[pontos.length - 1].competencia || '')
          if (recente === null) recente = pontos[pontos.length - 1].valor
        }
      }

      var col = $app.findCollectionByNameOrId('rge_contas')
      var rec = new Record(col)
      rec.set('uc', uc)
      rec.set('credencial_id', cred.id)
      if (cred.getString('cliente_id')) rec.set('cliente_id', cred.getString('cliente_id'))
      if (cred.getString('usina_id')) rec.set('usina_id', cred.getString('usina_id'))
      rec.set('origem', 'portal')
      rec.set('competencia', competencia || new Date().toISOString().slice(0, 7))
      if (recente !== null) rec.set('consumo_kwh', Number(recente))
      rec.set('nome_arquivo', 'conta-' + uc + '.pdf')
      rec.set('dados', { info_instalacao: info, series: series })
      $app.save(rec)

      cred.set('status', 'ok')
      cred.set('ultimo_login', new Date().toISOString())
      cred.set('ultimo_erro', '')
      $app.save(cred)

      var total = 0
      for (var z = 0; z < series.length; z++) total += series[z].pontos.length

      return e.json(200, {
        ok: true,
        conta_id: rec.id,
        uc: uc,
        series: series.length,
        pontos: total,
        competencia: competencia,
        ms: Date.now() - t0,
      })
    } catch (err) {
      try {
        if (cred) {
          cred.set('status', 'erro')
          cred.set('ultimo_erro', String(err).slice(0, 300))
          $app.save(cred)
        }
      } catch (e2) {}
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/rge/contas',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      var filtro = ''
      if (q.uc) filtro = 'uc = "' + String(q.uc).replace(/\D/g, '') + '"'
      var recs = []
      try {
        recs = $app.findRecordsByFilter('rge_contas', filtro, '-id', 100, 0)
      } catch (errSort) {
        try {
          recs = $app.findRecordsByFilter('rge_contas', filtro, '', 100, 0)
        } catch (errFallback) {
          recs = []
        }
      }
      var itens = []
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i]
        itens.push({
          id: r.id,
          uc: r.getString('uc'),
          competencia: r.getString('competencia'),
          consumo_kwh: r.getFloat('consumo_kwh'),
          nome_arquivo: r.getString('nome_arquivo'),
          created: r.getString('created'),
        })
      }
      return e.json(200, { ok: true, itens: itens })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/rge/conta-pdf',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      var cred = null
      if (q.credencial_id) {
        cred = $app.findRecordById('rge_credenciais', q.credencial_id)
      } else if (q.uc) {
        var uc0 = String(q.uc).replace(/\D/g, '')
        var ach = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc0 + '"', '', 1, 0)
        if (ach.length) cred = ach[0]
      }
      if (!cred) return e.json(404, { ok: false, error: 'Credencial não encontrada' })

      var uc = String(cred.getString('uc') || '').replace(/\D/g, '')
      var token = cred.getString('token')
      if (!token) {
        return e.json(200, {
          ok: false,
          precisa_token: true,
          error: 'Sem token. Gere no navegador e cole na credencial.',
        })
      }

      var res = $http.send({
        url:
          'https://servicosonline.cpfl.com.br/agencia-webapi/api/historico-contas/conta-completa-pdf?instalacao=' +
          encodeURIComponent(uc),
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'application/pdf,*/*',
          Origin: 'https://servicosonline.cpfl.com.br',
          Referer: 'https://servicosonline.cpfl.com.br/agencia-webapp/',
          Authorization: 'Bearer ' + token,
        },
        timeout: 180000,
      })
      var st = res.statusCode !== undefined ? res.statusCode : res.status
      if (st === 401) {
        cred.set('status', 'expirado')
        cred.set('ultimo_erro', 'Token expirado ao buscar PDF')
        $app.save(cred)
        return e.json(200, {
          ok: false,
          precisa_token: true,
          error: 'Token expirado. Gere outro no navegador.',
        })
      }
      if (st !== 200) return e.json(200, { ok: false, error: 'A CPFL respondeu HTTP ' + st })

      var bruto = res.raw !== undefined && res.raw !== null ? res.raw : res.body
      if (bruto === undefined || bruto === null) {
        return e.json(200, { ok: false, error: 'PDF vazio na resposta' })
      }

      var bytes = bruto
      if (typeof bruto === 'string') {
        var arr = []
        for (var i = 0; i < bruto.length; i++) arr.push(bruto.charCodeAt(i) & 0xff)
        bytes = arr
      }
      var alf = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var saida = ''
      var n = bytes.length
      var k = 0
      while (k < n) {
        var b1 = bytes[k++] & 0xff
        var t2 = k < n
        var b2 = t2 ? bytes[k++] & 0xff : 0
        var t3 = k < n
        var b3 = t3 ? bytes[k++] & 0xff : 0
        saida += alf.charAt(b1 >> 2)
        saida += alf.charAt(((b1 & 3) << 4) | (b2 >> 4))
        saida += t2 ? alf.charAt(((b2 & 15) << 2) | (b3 >> 6)) : '='
        saida += t3 ? alf.charAt(b3 & 63) : '='
      }

      return e.json(200, {
        ok: true,
        uc: uc,
        nome_arquivo: 'conta-' + uc + '.pdf',
        base64: saida,
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireAuth(),
)

// ---------------- importacao em massa (planilha) ----------------
// Aceita UCs repetidas: duas linhas com a mesma UC sao USINAS DIFERENTES
// (nao beneficiarias). A chave e login + uc + rotulo.
routerAdd(
  'POST',
  '/backend/v1/rge/importar-credenciais',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
      var body = e.requestInfo().body || {}
      var lista = body.credenciais || []
      if (!lista.length) return e.json(400, { ok: false, error: 'Nenhuma credencial enviada' })

      var criadas = 0
      var atualizadas = 0
      var puladas = []
      var col = $app.findCollectionByNameOrId('rge_credenciais')

      for (var i = 0; i < lista.length; i++) {
        var it = lista[i]
        var uc = String(it.uc == null ? '' : it.uc).replace(/\D/g, '')
        var login = String(it.login == null ? '' : it.login).trim()
        var rotulo = String(it.rotulo == null ? '' : it.rotulo)
          .trim()
          .slice(0, 120)
        var senha = String(it.senha == null ? '' : it.senha)
        if (!uc || uc.length < 10) {
          puladas.push({ rotulo: rotulo, motivo: 'UC invalida' })
          continue
        }
        if (!login) {
          puladas.push({ rotulo: rotulo, motivo: 'sem login' })
          continue
        }

        // casa por login + uc + rotulo (permite UC repetida em usinas diferentes)
        var rec = null
        try {
          var ach = $app.findRecordsByFilter(
            'rge_credenciais',
            'uc = "' + uc + '" && login = "' + login.replace(/"/g, '') + '"',
            '',
            20,
            0,
          )
          for (var a = 0; a < ach.length; a++) {
            if (String(ach[a].getString('rotulo') || '') === rotulo) {
              rec = ach[a]
              break
            }
          }
        } catch (errF) {}

        var novo = !rec
        if (novo) rec = new Record(col)

        rec.set('uc', uc)
        rec.set('login', login)
        if (senha) rec.set('senha', senha)
        rec.set('rotulo', rotulo || 'UC ' + uc)
        if (it.documento !== undefined)
          rec.set('documento', String(it.documento || '').replace(/\D/g, ''))
        rec.set('ativo', true)
        if (it.usina_id) rec.set('usina_id', String(it.usina_id))
        if (it.cliente_id) rec.set('cliente_id', String(it.cliente_id))
        if (novo || !rec.getString('status')) rec.set('status', 'novo')

        try {
          $app.save(rec)
          if (novo) criadas++
          else atualizadas++
        } catch (errSave) {
          puladas.push({ rotulo: rotulo, motivo: String(errSave).slice(0, 120) })
        }
      }

      return e.json(200, {
        ok: true,
        criadas: criadas,
        atualizadas: atualizadas,
        puladas: puladas.length,
        detalhe_puladas: puladas,
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.requireAuth(),
)

// ---------------- senha: revelar (olho) ----------------
routerAdd(
  'GET',
  '/backend/v1/rge/credencial-senha',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
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

// ---------------- senha: gravar (lapis) ----------------
routerAdd(
  'POST',
  '/backend/v1/rge/credencial-senha',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
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

// ---------------- beneficiarias: listar ----------------
routerAdd(
  'GET',
  '/backend/v1/rge/beneficiarias-uc',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
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

// ---------------- beneficiarias: criar/atualizar ----------------
routerAdd(
  'POST',
  '/backend/v1/rge/beneficiarias-uc',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
      var body = e.requestInfo().body || {}
      var benId = String(body.id == null ? '' : body.id)
      var credId = String(body.credencial_id == null ? '' : body.credencial_id)
      var uc = String(body.uc == null ? '' : body.uc).replace(/\D/g, '')
      if (!uc) return e.json(400, { ok: false, error: 'Informe a UC da beneficiaria' })

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

// ---------------- beneficiarias: remover ----------------
routerAdd(
  'DELETE',
  '/backend/v1/rge/beneficiarias-uc',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
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

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
routerAdd('POST', '/backend/v1/rge/importar-credenciais', (e) => {
  try {
    // aceita o segredo do robo (importacao em lote) ou um usuario logado
    var seg = $secrets.get('RGE_ROBO_SECRET') || ''
    var env = e.request.header.get('X-Robo-Secret') || ''
    var porSegredo = !!seg && env === seg
    if (!porSegredo && (!e.auth || !e.auth.id))
      return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
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
})

// ---------------- migrar UC antiga -> UC nova (guarda a antiga) ----------------
// A RGE trocou a numeracao das UCs. O CRM passa a usar a UC NOVA (11 ou 12
// digitos) e guarda a antiga em `uc_antiga`, para conferencia e para o robo
// poder tentar as duas.
routerAdd('POST', '/backend/v1/rge/migrar-uc', (e) => {
  try {
    var seg = $secrets.get('RGE_ROBO_SECRET') || ''
    var env = e.request.header.get('X-Robo-Secret') || ''
    var porSegredo = !!seg && env === seg
    if (!porSegredo && (!e.auth || !e.auth.id))
      return e.json(401, { ok: false, error: 'Autenticacao necessaria' })

    var body = e.requestInfo().body || {}
    var lista = body.migracoes || []
    if (!lista.length) return e.json(400, { ok: false, error: 'Nenhuma migracao enviada' })

    var mudadas = 0
    var puladas = []
    for (var i = 0; i < lista.length; i++) {
      var m = lista[i]
      var antiga = String(m.uc_antiga == null ? '' : m.uc_antiga).replace(/\D/g, '')
      var nova = String(m.uc_nova == null ? '' : m.uc_nova).replace(/\D/g, '')
      if (!antiga || !nova) {
        puladas.push({ uc_antiga: antiga, motivo: 'uc vazia' })
        continue
      }
      var recs = []
      try {
        recs = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + antiga + '"', '', 20, 0)
      } catch (errF) {
        recs = []
      }
      for (var j = 0; j < recs.length; j++) {
        var rec = recs[j]
        rec.set('uc_antiga', antiga)
        rec.set('uc', nova)
        rec.set('status', 'novo')
        rec.set('ultimo_erro', '')
        try {
          $app.save(rec)
          mudadas++
        } catch (errS) {
          puladas.push({ uc_antiga: antiga, motivo: String(errS).slice(0, 100) })
        }
      }
    }
    return e.json(200, { ok: true, mudadas: mudadas, puladas: puladas })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// ---------------- remover credencial (manutencao, segredo do robo) ----------------
routerAdd('DELETE', '/backend/v1/rge/credencial-remover', (e) => {
  try {
    var seg = $secrets.get('RGE_ROBO_SECRET') || ''
    var env = e.request.header.get('X-Robo-Secret') || ''
    if (!seg || env !== seg) return e.json(401, { ok: false, error: 'Segredo invalido' })
    var q = e.requestInfo().query || {}
    if (!q.id) return e.json(400, { ok: false, error: 'Informe id' })
    var rec = $app.findRecordById('rge_credenciais', String(q.id))
    $app.delete(rec)
    return e.json(200, { ok: true })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 300) })
  }
})

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

// ---------------- beneficiarias: salvar em lote (modal de percentuais) ----------------
// Grava uma linha por UC em rge_beneficiarias, atualiza usinas.beneficiarias
// e cria uma versao em rge_beneficiarias_versoes (versao = max+1 por usina).
routerAdd(
  'POST',
  '/backend/v1/rge/beneficiarias-uc/lote',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
      var body = e.requestInfo().body || {}
      var credId = String(body.credencial_id == null ? '' : body.credencial_id)
      if (!credId) return e.json(400, { ok: false, error: 'Informe credencial_id' })
      var cred = $app.findRecordById('rge_credenciais', credId)

      var usinaGeradoraId = String(cred.getString('usina_id') || '')
      var itens = body.itens || []
      if (!Array.isArray(itens)) return e.json(400, { ok: false, error: 'itens invalidos' })

      var colBen = $app.findCollectionByNameOrId('rge_beneficiarias')
      var colVersoes = null
      try {
        colVersoes = $app.findCollectionByNameOrId('rge_beneficiarias_versoes')
      } catch (eV) {
        colVersoes = null
      }

      // desativa as beneficiarias atuais que nao vieram na lista
      var atuais = []
      try {
        atuais = $app.findRecordsByFilter(
          'rge_beneficiarias',
          'credencial_id = "' + credId + '"',
          '',
          500,
          0,
        )
      } catch (errA) {
        atuais = []
      }
      var ucsNovas = {}
      for (var n = 0; n < itens.length; n++) {
        var ucn = String(itens[n] && itens[n].uc == null ? '' : itens[n].uc).replace(/\D/g, '')
        if (ucn) ucsNovas[ucn] = true
      }
      for (var a = 0; a < atuais.length; a++) {
        var ucAt = String(atuais[a].getString('uc') || '')
        if (!ucsNovas[ucAt] && atuais[a].getBool('ativo')) {
          atuais[a].set('ativo', false)
          $app.save(atuais[a])
        }
      }

      var gravadas = 0
      for (var i = 0; i < itens.length; i++) {
        var it = itens[i]
        var uc = String(it.uc == null ? '' : it.uc).replace(/\D/g, '')
        if (!uc) continue
        var pct = Number(String(it.percentual == null ? 0 : it.percentual).replace(',', '.'))
        if (isNaN(pct)) pct = 0

        var rec = null
        if (it.id) {
          try {
            rec = $app.findRecordById('rge_beneficiarias', String(it.id))
          } catch (errId) {
            rec = null
          }
        }
        if (!rec) {
          try {
            var ach = $app.findRecordsByFilter(
              'rge_beneficiarias',
              'credencial_id = "' + credId + '" && uc = "' + uc + '"',
              '',
              1,
              0,
            )
            if (ach.length) rec = ach[0]
          } catch (errL) {}
        }
        if (!rec) rec = new Record(colBen)
        rec.set('credencial_id', credId)
        rec.set('uc', uc)
        rec.set('rotulo', String(it.rotulo == null ? '' : it.rotulo).slice(0, 200))
        rec.set('percentual', pct)
        if (it.cliente_id) rec.set('cliente_id', String(it.cliente_id))
        if (it.usina_id) rec.set('usina_id', String(it.usina_id))
        rec.set('ativo', true)
        $app.save(rec)
        gravadas++
      }

      // atualiza usinas.beneficiarias da geradora (UsinaBeneficiariasConfig.unidades)
      var tipoVersao = 'inicial'
      if (usinaGeradoraId) {
        try {
          var usina = $app.findRecordById('usinas', usinaGeradoraId)
          var unidades = []
          for (var u = 0; u < itens.length; u++) {
            var iu = itens[u]
            var ucU = String(iu.uc == null ? '' : iu.uc).replace(/\D/g, '')
            if (!ucU) continue
            unidades.push({
              uc: ucU,
              rotulo: String(iu.rotulo == null ? '' : iu.rotulo).slice(0, 200),
              percentual:
                Number(String(iu.percentual == null ? 0 : iu.percentual).replace(',', '.')) || 0,
              usina_id: String(iu.usina_id == null ? '' : iu.usina_id),
              cliente_id: String(iu.cliente_id == null ? '' : iu.cliente_id),
            })
          }
          // marca a versao como "alteracao" se ja existia configuracao gravada
          var benAnt = usina.get('beneficiarias')
          var jaTinha = benAnt && typeof benAnt === 'object' && (benAnt.unidades || []).length > 0
          tipoVersao = jaTinha ? 'alteracao' : 'inicial'
          usina.set('beneficiarias', {
            unidades: unidades,
            atualizado_em: new Date().toISOString(),
          })
          $app.save(usina)

          // cria versao no historico de vigencia (versao = max+1 por usina)
          if (colVersoes) {
            var ultimas = $app.findRecordsByFilter(
              'rge_beneficiarias_versoes',
              'usina_id = "' + usinaGeradoraId + '"',
              '-versao',
              1,
              0,
            )
            var proxima = ultimas.length ? Number(ultimas[0].getFloat('versao')) + 1 : 1
            var versao = new Record(colVersoes)
            versao.set('usina_id', usinaGeradoraId)
            versao.set('credencial_id', credId)
            versao.set('versao', proxima)
            if (body.vigencia_inicio) versao.set('vigencia_inicio', String(body.vigencia_inicio))
            if (body.vigencia_fim) versao.set('vigencia_fim', String(body.vigencia_fim))
            versao.set('tipo', tipoVersao)
            versao.set('itens', {
              resumo: unidades.map(function (un) {
                return { uc: un.uc, rotulo: un.rotulo, percentual: un.percentual }
              }),
            })
            $app.save(versao)
          }
        } catch (errUs) {
          // usina/versao falhou: nao desfaz as beneficiarias gravadas
          return e.json(200, {
            ok: true,
            gravadas: gravadas,
            aviso: String(errUs).slice(0, 200),
          })
        }
      }

      return e.json(200, { ok: true, gravadas: gravadas, versao_tipo: tipoVersao })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 300) })
    }
  },
  $apis.requireAuth(),
)

// ---------------- beneficiarias: historico de versoes por usina ----------------
routerAdd(
  'GET',
  '/backend/v1/rge/beneficiarias-uc/versoes',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticacao necessaria' })
      var q = e.requestInfo().query || {}
      var usinaId = String(q.usina_id == null ? '' : q.usina_id)
      if (!usinaId) return e.json(400, { ok: false, error: 'Informe usina_id' })
      var recs = []
      try {
        recs = $app.findRecordsByFilter(
          'rge_beneficiarias_versoes',
          'usina_id = "' + usinaId + '"',
          '-versao',
          100,
          0,
        )
      } catch (errF) {
        recs = []
      }
      var itens = []
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i]
        var itensV = r.get('itens') || {}
        var resumo = Array.isArray(itensV.resumo) ? itensV.resumo : []
        var total = 0
        for (var j = 0; j < resumo.length; j++) {
          total += Number(resumo[j] && resumo[j].percentual) || 0
        }
        total = Math.round(total * 100) / 100
        itens.push({
          id: r.id,
          numero: r.getFloat('versao'),
          vigencia_inicio: r.getString('vigencia_inicio'),
          vigencia_fim: r.getString('vigencia_fim'),
          tipo: r.getString('tipo'),
          created: r.getString('created'),
          total_distribuido: total,
          resumo: resumo,
        })
      }
      return e.json(200, { ok: true, itens: itens })
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

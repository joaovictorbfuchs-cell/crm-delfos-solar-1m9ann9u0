/**
 * Integração RGE/CPFL — Agência Virtual (CRM Delfos Solar)
 *
 * Rotas (prefixo /backend/v1):
 *   GET  /rge/credenciais   -> lista credenciais SEM expor senha/token
 *   POST /rge/credenciais   -> cria/atualiza credencial (uc, login, senha)
 *   POST /rge/token         -> grava o token obtido no navegador
 *   POST /rge/sincronizar   -> baixa consumo e grava em rge_contas
 *   GET  /rge/contas        -> lista contas sincronizadas
 *   GET  /rge/conta-pdf     -> devolve o PDF da conta (base64) na hora
 *
 * IMPORTANTE — regra do JSVM do PocketBase:
 * cada callback roda em um pool de VM separado; nada de escopo de topo é
 * visível lá dentro. Por isso TODO o código vive dentro de cada callback.
 *
 * O QUE FOI TESTADO (07/11/2026, com credencial real):
 *  - POST /api/token grant_type=password com e-mail+senha corretos devolve
 *    400 {"error":"LOG008"}: a conta está no Azure AD B2C e o login legado
 *    da API não a reconhece.
 *  - ROPC no B2C devolve a página HTML de login (desabilitado na política),
 *    então não há como trocar e-mail+senha por token via HTTP.
 *  - Cloudflare NÃO bloqueia requisição de servidor (401 em vez de 403).
 *  - Com token, respondem:
 *      GET  /api/instalacao/informacoes-instalacao/{uc}
 *      POST /api/historico-consumo/busca-graficos
 *      GET  /api/historico-contas/conta-completa-pdf?instalacao={uc}
 *    Logo: o token nasce de um navegador; o resto roda aqui no servidor.
 */

routerAdd(
  'GET',
  '/backend/v1/rge/credenciais',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) throw new Error('Autenticação necessária')
      const role = String(e.auth.get('role') || e.auth.get('perfil') || '').toLowerCase()
      const email = String(e.auth.get('email') || '').toLowerCase()
      const lista = String($os.getenv('RGE_ADMIN_EMAILS') || '')
        .split(',')
        .map(function (s) {
          return s.trim().toLowerCase()
        })
        .filter(Boolean)
      let isAdmin = false
      try {
        isAdmin = e.auth.getBool('is_admin')
      } catch (_) {}
      if (!isAdmin && role !== 'admin' && role !== 'administrador' && lista.indexOf(email) < 0) {
        throw new Error('Somente administradores gerenciam a integração RGE')
      }

      const recs = $app.findRecordsByFilter('rge_credenciais', '', '-created', 500, 0)
      const itens = []
      for (let i = 0; i < recs.length; i++) {
        const r = recs[i]
        itens.push({
          id: r.id,
          uc: r.getString('uc'),
          rotulo: r.getString('rotulo'),
          documento: r.getString('documento'),
          login: r.getString('login'),
          tem_senha: !!r.getString('senha'),
          tem_token: !!r.getString('token'),
          token_exp: r.getString('token_exp'),
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
  $apis.requireRecordAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/rge/credenciais',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) throw new Error('Autenticação necessária')
      const role = String(e.auth.get('role') || e.auth.get('perfil') || '').toLowerCase()
      const email = String(e.auth.get('email') || '').toLowerCase()
      const lista = String($os.getenv('RGE_ADMIN_EMAILS') || '')
        .split(',')
        .map(function (s) {
          return s.trim().toLowerCase()
        })
        .filter(Boolean)
      let isAdmin = false
      try {
        isAdmin = e.auth.getBool('is_admin')
      } catch (_) {}
      if (!isAdmin && role !== 'admin' && role !== 'administrador' && lista.indexOf(email) < 0) {
        throw new Error('Somente administradores gerenciam a integração RGE')
      }

      const soDig = function (v) {
        return String(v == null ? '' : v).replace(/\D/g, '')
      }
      const body = e.requestInfo().body || {}
      const uc = soDig(body.uc)
      if (!uc) return e.json(400, { ok: false, error: 'Informe o número da UC' })

      const montarItem = function (rec) {
        return {
          id: rec.id,
          uc: rec.getString('uc'),
          rotulo: rec.getString('rotulo'),
          documento: rec.getString('documento'),
          login: rec.getString('login'),
          tem_senha: !!rec.getString('senha'),
          tem_token: !!rec.getString('token'),
          modo_auth: rec.getString('modo_auth'),
          status: rec.getString('status'),
          ativo: rec.getBool('ativo'),
        }
      }

      let rec = null
      if (body.id) {
        try {
          rec = $app.findRecordById('rge_credenciais', body.id)
        } catch (_) {}
      }
      if (!rec) {
        const achados = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc + '"', '', 1, 0)
        if (achados.length) rec = achados[0]
      }
      if (!rec) rec = new Record($app.findCollectionByNameOrId('rge_credenciais'))

      rec.set('uc', uc)
      if (body.rotulo !== undefined) rec.set('rotulo', body.rotulo)
      if (body.documento !== undefined) rec.set('documento', soDig(body.documento))
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

      console.log('[RGE] credencial salva', rec.id, 'UC', uc)
      return e.json(200, { ok: true, item: montarItem(rec) })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireRecordAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/rge/sincronizar',
  (e) => {
    const t0 = Date.now()
    let cred = null
    try {
      if (!e.auth || !e.auth.id) throw new Error('Autenticação necessária')
      const role = String(e.auth.get('role') || e.auth.get('perfil') || '').toLowerCase()
      const email = String(e.auth.get('email') || '').toLowerCase()
      const lista = String($os.getenv('RGE_ADMIN_EMAILS') || '')
        .split(',')
        .map(function (s) {
          return s.trim().toLowerCase()
        })
        .filter(Boolean)
      let isAdmin = false
      try {
        isAdmin = e.auth.getBool('is_admin')
      } catch (_) {}
      if (!isAdmin && role !== 'admin' && role !== 'administrador' && lista.indexOf(email) < 0) {
        throw new Error('Somente administradores sincronizam a integração RGE')
      }

      const BASE = 'https://servicosonline.cpfl.com.br/agencia-webapi'
      const CLIENTE_ID = 'agencia-virtual-cpfl-web'
      const H = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Origin: 'https://servicosonline.cpfl.com.br',
        Referer: 'https://servicosonline.cpfl.com.br/agencia-webapp/',
        'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      }

      const soDig = function (v) {
        return String(v == null ? '' : v).replace(/\D/g, '')
      }
      const textoDe = function (res) {
        const b = res && (res.raw !== undefined && res.raw !== null ? res.raw : res.body)
        if (b === undefined || b === null) return ''
        if (typeof b === 'string') return b
        try {
          return String(b)
        } catch (_) {
          return ''
        }
      }
      const pega = function (obj, nomes) {
        for (let i = 0; i < nomes.length; i++) {
          const alvo = String(nomes[i]).toLowerCase()
          for (const k in obj || {}) {
            if (String(k).toLowerCase() === alvo) {
              const v = obj[k]
              if (v !== null && v !== undefined && v !== '') return v
            }
          }
        }
        return null
      }

      const body = e.requestInfo().body || {}
      if (!body.credencial_id) return e.json(400, { ok: false, error: 'Informe credencial_id' })
      cred = $app.findRecordById('rge_credenciais', body.credencial_id)

      const uc = soDig(cred.getString('uc'))
      if (!uc) return e.json(400, { ok: false, error: 'Credencial sem UC' })

      let token = cred.getString('token')
      let origem = token ? 'token' : ''

      // Sem token: tenta o login legado (só funciona para contas antigas)
      if (!token && cred.getString('senha')) {
        const r = $http.send({
          url: BASE + '/api/token',
          method: 'POST',
          headers: Object.assign({}, H, {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          }),
          body:
            'client_id=' +
            encodeURIComponent(CLIENTE_ID) +
            '&grant_type=password&username=' +
            encodeURIComponent(cred.getString('login')) +
            '&password=' +
            encodeURIComponent(cred.getString('senha')),
          timeout: 60000,
        })
        const st = r.statusCode !== undefined ? r.statusCode : r.status
        let j = null
        try {
          j = JSON.parse(textoDe(r))
        } catch (_) {}
        if (st === 200 && j && j.access_token) {
          token = j.access_token
          origem = 'senha'
          cred.set('token', token)
        } else {
          const cod = (j && j.error) || 'HTTP ' + st
          const msg =
            cod === 'LOG008'
              ? 'A CPFL recusou e-mail+senha (LOG008): esta conta está no login novo (Azure B2C) ' +
                'e o login por senha da API não a reconhece. Gere o token no navegador e cole na credencial.'
              : 'Falha no login: ' + cod
          cred.set('status', 'erro')
          cred.set('ultimo_erro', String(msg).slice(0, 400))
          cred.set('ultimo_login', new Date().toISOString())
          $app.save(cred)
          return e.json(200, { ok: false, error: msg, precisa_token: true })
        }
      }

      if (!token) {
        const msg = 'Sem token utilizável. Gere o token no navegador e cole na credencial.'
        cred.set('status', 'erro')
        cred.set('ultimo_erro', msg)
        $app.save(cred)
        return e.json(200, { ok: false, error: msg, precisa_token: true })
      }

      const chamar = function (caminho, metodo, corpo) {
        const headers = {}
        for (const k in H) headers[k] = H[k]
        headers.Authorization = 'Bearer ' + token
        const opcoes = {
          url: BASE + caminho,
          method: metodo || 'GET',
          headers: headers,
          timeout: 120000,
        }
        if (corpo !== undefined && corpo !== null) {
          headers['Content-Type'] = 'application/json'
          opcoes.body = JSON.stringify(corpo)
        }
        const res = $http.send(opcoes)
        const status = res.statusCode !== undefined ? res.statusCode : res.status
        const txt = textoDe(res)
        let json = null
        if (txt.replace(/^\s+/, '').charAt(0) === '{') {
          try {
            json = JSON.parse(txt)
          } catch (_) {}
        }
        return { status: status, json: json, texto: txt }
      }

      // 1) dados da instalação
      const infoR = chamar(
        '/api/instalacao/informacoes-instalacao/' + encodeURIComponent(uc),
        'GET',
      )
      if (infoR.status === 401) {
        cred.set('status', 'expirado')
        cred.set('ultimo_erro', 'Token expirado (401)')
        $app.save(cred)
        return e.json(200, {
          ok: false,
          error: 'Token expirado. Gere outro no navegador e cole na credencial.',
          precisa_token: true,
        })
      }
      const info = infoR.json || {}

      // 2) consumo
      const consR = chamar('/api/historico-consumo/busca-graficos', 'POST', {
        Instalacao: uc,
        CodigoClasse: pega(info, ['CodigoClasse', 'CodClasse']),
        CodEmpresaSAP: pega(info, ['CodEmpresaSAP', 'CodEmpresa']),
        NumeroContrato: pega(info, ['Contrato', 'NumeroContrato']),
        TipoGrafico: 'Todos',
        ParceiroNegocio: null,
      })

      const graficos = (consR.json && consR.json.data && consR.json.data.Graficos) || []
      const series = []
      let competencia = ''
      let consumoRecente = null
      for (let i = 0; i < graficos.length; i++) {
        const g = graficos[i]
        if (!g || !g.Dados || !g.Dados.length) continue
        const pontos = []
        for (let k = 0; k < g.Dados.length; k++) {
          const d = g.Dados[k]
          pontos.push({ competencia: d.Categoria, valor: d.Valor, media: d.MediaConsumo })
        }
        series.push({ tipo: g.TipoGrafico, pontos: pontos })
        if (!competencia && pontos.length) {
          const ult = pontos[pontos.length - 1]
          if (ult.competencia) competencia = String(ult.competencia)
          if (consumoRecente === null && ult.valor !== undefined) consumoRecente = ult.valor
        }
      }

      const contasCol = $app.findCollectionByNameOrId('rge_contas')
      const rec = new Record(contasCol)
      rec.set('uc', uc)
      rec.set('credencial_id', cred.id)
      if (cred.getString('cliente_id')) rec.set('cliente_id', cred.getString('cliente_id'))
      if (cred.getString('usina_id')) rec.set('usina_id', cred.getString('usina_id'))
      rec.set('origem', 'portal')
      rec.set('competencia', competencia || new Date().toISOString().slice(0, 7))
      if (consumoRecente !== null) rec.set('consumo_kwh', Number(consumoRecente))
      rec.set('nome_arquivo', 'conta-' + uc + '.pdf')
      rec.set('dados', { info_instalacao: info, series: series })
      $app.save(rec)

      cred.set('status', 'ok')
      cred.set('ultimo_login', new Date().toISOString())
      cred.set('ultimo_erro', '')
      $app.save(cred)

      let pontosTotais = 0
      for (let i = 0; i < series.length; i++) pontosTotais += series[i].pontos.length

      console.log('[RGE] sync UC', uc, 'series', series.length, 'pontos', pontosTotais)
      return e.json(200, {
        ok: true,
        conta_id: rec.id,
        uc: uc,
        token_origem: origem,
        series: series.length,
        pontos: pontosTotais,
        competencia: competencia,
        ms: Date.now() - t0,
      })
    } catch (err) {
      console.log('[RGE] erro sincronizar:', String(err))
      try {
        if (cred) {
          cred.set('status', 'erro')
          cred.set('ultimo_erro', String(err).slice(0, 400))
          $app.save(cred)
        }
      } catch (_) {}
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireRecordAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/rge/contas',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) throw new Error('Autenticação necessária')
      const soDig = function (v) {
        return String(v == null ? '' : v).replace(/\D/g, '')
      }
      const q = e.requestInfo().query || {}
      const partes = []
      if (q.uc) partes.push('uc = "' + soDig(q.uc) + '"')
      if (q.cliente_id) partes.push('cliente_id = "' + q.cliente_id + '"')
      const recs = $app.findRecordsByFilter('rge_contas', partes.join(' && '), '-created', 100, 0)
      const itens = []
      for (let i = 0; i < recs.length; i++) {
        const r = recs[i]
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
  $apis.requireRecordAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/rge/conta-pdf',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) throw new Error('Autenticação necessária')

      const BASE = 'https://servicosonline.cpfl.com.br/agencia-webapi'
      const H = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'application/pdf,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        Origin: 'https://servicosonline.cpfl.com.br',
        Referer: 'https://servicosonline.cpfl.com.br/agencia-webapp/',
        'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
      }
      const soDig = function (v) {
        return String(v == null ? '' : v).replace(/\D/g, '')
      }

      const q = e.requestInfo().query || {}
      let uc = soDig(q.uc)
      let cred = null

      if (q.credencial_id) {
        cred = $app.findRecordById('rge_credenciais', q.credencial_id)
      } else if (uc) {
        const achados = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc + '"', '', 1, 0)
        if (achados.length) cred = achados[0]
      }
      if (!cred) {
        return e.json(404, { ok: false, error: 'Credencial não encontrada para esta UC' })
      }
      if (!uc) uc = soDig(cred.getString('uc'))

      const token = cred.getString('token')
      if (!token) {
        return e.json(200, {
          ok: false,
          precisa_token: true,
          error: 'Sem token válido. Gere o token no navegador e cole na credencial.',
        })
      }

      const headers = {}
      for (const k in H) headers[k] = H[k]
      headers.Authorization = 'Bearer ' + token

      const res = $http.send({
        url: BASE + '/api/historico-contas/conta-completa-pdf?instalacao=' + encodeURIComponent(uc),
        method: 'GET',
        headers: headers,
        timeout: 180000,
      })
      const status = res.statusCode !== undefined ? res.statusCode : res.status

      if (status === 401) {
        cred.set('status', 'expirado')
        cred.set('ultimo_erro', 'Token expirado ao buscar PDF')
        $app.save(cred)
        return e.json(200, {
          ok: false,
          precisa_token: true,
          error: 'Token expirado. Gere outro no navegador e cole na credencial.',
        })
      }
      if (status !== 200) {
        return e.json(200, { ok: false, error: 'A CPFL respondeu HTTP ' + status })
      }

      const bruto = res.raw !== undefined && res.raw !== null ? res.raw : res.body
      if (bruto === undefined || bruto === null) {
        return e.json(200, { ok: false, error: 'PDF vazio na resposta' })
      }

      const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      let bytes = null
      if (typeof bruto === 'string') {
        const arr = []
        for (let i = 0; i < bruto.length; i++) arr.push(bruto.charCodeAt(i) & 0xff)
        bytes = arr
      } else {
        bytes = bruto
      }

      let saida = ''
      const n = bytes.length
      let i = 0
      while (i < n) {
        const b1 = bytes[i++] & 0xff
        const tem2 = i < n
        const b2 = tem2 ? bytes[i++] & 0xff : 0
        const tem3 = i < n
        const b3 = tem3 ? bytes[i++] & 0xff : 0
        saida += alfabeto.charAt(b1 >> 2)
        saida += alfabeto.charAt(((b1 & 3) << 4) | (b2 >> 4))
        saida += tem2 ? alfabeto.charAt(((b2 & 15) << 2) | (b3 >> 6)) : '='
        saida += tem3 ? alfabeto.charAt(b3 & 63) : '='
      }

      console.log('[RGE] PDF UC', uc, 'bytes', n)
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
  $apis.requireRecordAuth(),
)

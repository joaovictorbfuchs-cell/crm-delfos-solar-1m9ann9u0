/**
 * Integração RGE/CPFL — Agência Virtual (Skip: CRM Delfos Solar)
 *
 * Rotas (prefixo /backend/v1):
 *   GET  /rge/credenciais   -> lista credenciais SEM expor senha/token
 *   POST /rge/credenciais   -> cria/atualiza credencial (uc, login, senha)
 *   POST /rge/token         -> grava o token obtido no navegador
 *   POST /rge/sincronizar   -> baixa consumo + dados e grava em rge_contas
 *   GET  /rge/contas        -> lista contas baixadas
 *   GET  /rge/conta-pdf     -> devolve o PDF da conta (base64) na hora
 *
 * O QUE FOI TESTADO (07/11/2026, com credencial real):
 *  - POST /api/token grant_type=password com o e-mail/senha corretos retorna
 *    400 {"error":"LOG008"}: a conta vive no Azure AD B2C e o login legado
 *    da API não a conhece.
 *  - ROPC no B2C devolve a página HTML de login (desabilitado na política),
 *    então não há como trocar e-mail+senha por token via HTTP.
 *  - Cloudflare NÃO bloqueia requisição de servidor: com headers de navegador
 *    completos a resposta é 401 (chegou na API), não 403.
 *  - Com o token em mãos, estes endpoints respondem:
 *      GET  /api/instalacao/informacoes-instalacao/{uc}
 *      POST /api/historico-consumo/busca-graficos
 *      GET  /api/historico-contas/conta-completa-pdf?instalacao={uc}
 *    Logo: o token precisa nascer de um navegador; o resto roda no servidor.
 */

const RGE_BASE = 'https://servicosonline.cpfl.com.br/agencia-webapi'
const RGE_CLIENT_ID = 'agencia-virtual-cpfl-web'

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

function soDigitos(v) {
  return String(v == null ? '' : v).replace(/\D/g, '')
}

function log() {
  console.log('[RGE]', Array.prototype.slice.call(arguments).join(' '))
}

function exigirUsuario(e) {
  if (!e.auth || !e.auth.id) throw new Error('Autenticação necessária')
  return e.auth
}

function ehAdmin(user) {
  const role = String(user.get('role') || user.get('perfil') || '').toLowerCase()
  const email = String(user.get('email') || '').toLowerCase()
  const lista = String($os.getenv('RGE_ADMIN_EMAILS') || '')
    .split(',')
    .map(function (s) {
      return s.trim().toLowerCase()
    })
    .filter(Boolean)
  try {
    if (user.getBool('is_admin')) return true
  } catch (_) {}
  return role === 'admin' || role === 'administrador' || lista.indexOf(email) >= 0
}

function exigirAdmin(e) {
  const user = exigirUsuario(e)
  if (!ehAdmin(user)) throw new Error('Somente administradores gerenciam a integração RGE')
  return user
}

function publica(rec) {
  return {
    id: rec.id,
    uc: rec.getString('uc'),
    rotulo: rec.getString('rotulo'),
    documento: rec.getString('documento'),
    login: rec.getString('login'),
    tem_senha: !!rec.getString('senha'),
    tem_token: !!rec.getString('token'),
    token_exp: rec.getString('token_exp'),
    modo_auth: rec.getString('modo_auth'),
    status: rec.getString('status'),
    ultimo_login: rec.getString('ultimo_login'),
    ultimo_erro: rec.getString('ultimo_erro'),
    ativo: rec.getBool('ativo'),
    cliente_id: rec.getString('cliente_id'),
    usina_id: rec.getString('usina_id'),
  }
}

function textoDe(res) {
  const b = res && (res.raw !== undefined && res.raw !== null ? res.raw : res.body)
  if (b === undefined || b === null) return ''
  if (typeof b === 'string') return b
  try {
    return String(b)
  } catch (_) {
    return ''
  }
}

function req(url, metodo, token, corpo, querTexto) {
  const headers = {}
  for (const k in H) headers[k] = H[k]
  if (token) headers.Authorization = 'Bearer ' + token
  const opcoes = { url: url, method: metodo || 'GET', headers: headers, timeout: 120000 }
  if (corpo !== undefined && corpo !== null) {
    headers['Content-Type'] = 'application/json'
    opcoes.body = JSON.stringify(corpo)
  } else if (!querTexto) {
    headers.Accept = 'application/json, text/plain, */*'
  }

  const res = $http.send(opcoes)
  const status = res.statusCode !== undefined ? res.statusCode : res.status
  let ct = ''
  if (res.headers) {
    ct = String(res.headers['Content-Type'] || res.headers['content-type'] || '')
  }
  const txt = querTexto ? '' : textoDe(res)
  let json = null
  if (!querTexto) {
    if (ct.indexOf('json') >= 0 || txt.replace(/^\s+/, '').charAt(0) === '{') {
      try {
        json = JSON.parse(txt)
      } catch (_) {}
    }
  }
  return { status: status, json: json, texto: txt, res: res, contentType: ct }
}

/** bytes -> base64 (para devolver o PDF como JSON) */
function bytesParaBase64(bytes) {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let saida = ''
  let i = 0
  const n = bytes.length
  while (i < n) {
    const b1 = bytes[i++] & 0xff
    const b2 = i < n ? bytes[i++] & 0xff : NaN
    const b3 = i < n ? bytes[i++] & 0xff : NaN
    saida += alfabeto.charAt(b1 >> 2)
    saida += alfabeto.charAt(((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4))
    saida += isNaN(b2) ? '=' : alfabeto.charAt(((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6))
    saida += isNaN(b3) ? '=' : alfabeto.charAt(b3 & 63)
  }
  return saida
}

function pega(obj, nomes) {
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

function gravarCred(rec, campos, erros) {
  for (const k in campos) {
    if (campos[k] !== undefined) rec.set(k, campos[k])
  }
  if (erros) rec.set('ultimo_erro', String(erros).slice(0, 400))
  $app.save(rec)
}

// ------------------------------------------------------------------ rotas

routerAdd(
  'GET',
  '/backend/v1/rge/credenciais',
  (e) => {
    try {
      exigirAdmin(e)
      const recs = $app.findRecordsByFilter('rge_credenciais', '', '-created', 500, 0)
      const itens = []
      for (let i = 0; i < recs.length; i++) itens.push(publica(recs[i]))
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
      exigirAdmin(e)
      const body = e.requestInfo().body || {}
      const uc = soDigitos(body.uc)
      if (!uc) return e.json(400, { ok: false, error: 'Informe o número da UC' })

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
      if (body.documento !== undefined) rec.set('documento', soDigitos(body.documento))
      if (body.login !== undefined) rec.set('login', body.login)
      if (body.senha) rec.set('senha', body.senha)
      if (body.cliente_id) rec.set('cliente_id', body.cliente_id)
      if (body.usina_id) rec.set('usina_id', body.usina_id)
      rec.set('ativo', body.ativo === undefined ? true : !!body.ativo)
      if (!rec.getString('status')) rec.set('status', 'novo')
      $app.save(rec)

      log('credencial salva', rec.id, 'UC', uc)
      return e.json(200, { ok: true, item: publica(rec) })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireRecordAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/rge/token',
  (e) => {
    try {
      exigirAdmin(e)
      const body = e.requestInfo().body || {}
      const token = String(body.token || '').trim()
      if (!token) return e.json(400, { ok: false, error: 'Informe o token' })

      let rec = null
      if (body.credencial_id) rec = $app.findRecordById('rge_credenciais', body.credencial_id)
      else {
        const uc = soDigitos(body.uc)
        if (!uc) return e.json(400, { ok: false, error: 'Informe credencial_id ou uc' })
        const achados = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc + '"', '', 1, 0)
        if (!achados.length) return e.json(404, { ok: false, error: 'Credencial não encontrada' })
        rec = achados[0]
      }

      rec.set('token', token)
      rec.set('token_exp', body.exp || '')
      rec.set('modo_auth', 'token')
      rec.set('status', 'ok')
      rec.set('ultimo_erro', '')
      rec.set('ultimo_login', new Date().toISOString())
      $app.save(rec)
      return e.json(200, { ok: true, item: publica(rec) })
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
      exigirAdmin(e)
      const body = e.requestInfo().body || {}
      if (!body.credencial_id) return e.json(400, { ok: false, error: 'Informe credencial_id' })
      cred = $app.findRecordById('rge_credenciais', body.credencial_id)

      const uc = soDigitos(cred.getString('uc'))
      if (!uc) return e.json(400, { ok: false, error: 'Credencial sem UC' })

      let token = cred.getString('token')
      let origem = token ? 'token' : ''

      if (!token && cred.getString('senha')) {
        const r = $http.send({
          url: RGE_BASE + '/api/token',
          method: 'POST',
          headers: Object.assign({}, H, {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          }),
          body:
            'client_id=' +
            encodeURIComponent(RGE_CLIENT_ID) +
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
                'e o login por senha da API não a reconhece. Gere um token no navegador e cole aqui.'
              : 'Falha no login: ' + cod
          gravarCred(cred, { status: 'erro', ultimo_login: new Date().toISOString() }, msg)
          return e.json(200, { ok: false, error: msg, precisa_token: true })
        }
      }

      if (!token) {
        const msg = 'Sem token utilizável. Gere um token no navegador e cole na credencial.'
        gravarCred(cred, { status: 'erro' }, msg)
        return e.json(200, { ok: false, error: msg, precisa_token: true })
      }

      const infoR = req(
        RGE_BASE + '/api/instalacao/informacoes-instalacao/' + encodeURIComponent(uc),
        'GET',
        token,
      )
      if (infoR.status === 401) {
        gravarCred(cred, { status: 'expirado' }, 'Token expirado (401)')
        return e.json(200, {
          ok: false,
          error: 'Token expirado. Gere outro no navegador.',
          precisa_token: true,
        })
      }
      const info = infoR.json || {}

      const consR = req(RGE_BASE + '/api/historico-consumo/busca-graficos', 'POST', token, {
        Instalacao: uc,
        CodigoClasse: pega(info, ['CodigoClasse', 'CodClasse']),
        CodEmpresaSAP: pega(info, ['CodEmpresaSAP', 'CodEmpresa']),
        NumeroContrato: pega(info, ['Contrato', 'NumeroContrato']),
        TipoGrafico: 'Todos',
        ParceiroNegocio: null,
      })

      const graficos = (consR.json && consR.json.data && consR.json.data.Graficos) || []
      const series = []
      for (let i = 0; i < graficos.length; i++) {
        const g = graficos[i]
        if (!g || !g.Dados || !g.Dados.length) continue
        const pontos = []
        for (let k = 0; k < g.Dados.length; k++) {
          const d = g.Dados[k]
          pontos.push({ competencia: d.Categoria, valor: d.Valor, media: d.MediaConsumo })
        }
        series.push({ tipo: g.TipoGrafico, pontos: pontos })
      }

      // competência mais recente da série de consumo
      let competencia = ''
      let consumoRecente = null
      for (let i = 0; i < series.length; i++) {
        const s = series[i]
        if (!s.pontos.length) continue
        const ult = s.pontos[s.pontos.length - 1]
        if (!competencia && ult.competencia) competencia = String(ult.competencia)
        if (consumoRecente === null && ult.valor !== undefined) consumoRecente = ult.valor
      }

      const contas = $app.findCollectionByNameOrId('rge_contas')
      const rec = new Record(contas)
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

      gravarCred(cred, { status: 'ok', ultimo_login: new Date().toISOString() }, '')

      let pontosTotais = 0
      for (let i = 0; i < series.length; i++) pontosTotais += series[i].pontos.length

      return e.json(200, {
        ok: true,
        conta_id: rec.id,
        uc: uc,
        token_origem: origem,
        series: series.length,
        pontos: pontosTotais,
        competencia: rec.getString('competencia'),
        ms: Date.now() - t0,
      })
    } catch (err) {
      log('erro sincronizar:', String(err))
      try {
        if (cred) gravarCred(cred, { status: 'erro' }, String(err))
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
      exigirUsuario(e)
      const q = e.requestInfo().query || {}
      const partes = []
      if (q.uc) partes.push('uc = "' + soDigitos(q.uc) + '"')
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
      exigirUsuario(e)
      const q = e.requestInfo().query || {}
      let uc = soDigitos(q.uc)
      let token = ''
      let cred = null

      if (q.credencial_id) {
        cred = $app.findRecordById('rge_credenciais', q.credencial_id)
      } else if (uc) {
        const achados = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc + '"', '', 1, 0)
        if (achados.length) cred = achados[0]
      }
      if (!cred) return e.json(404, { ok: false, error: 'Credencial não encontrada para esta UC' })
      if (!uc) uc = soDigitos(cred.getString('uc'))
      token = cred.getString('token')
      if (!token) {
        return e.json(200, {
          ok: false,
          precisa_token: true,
          error: 'Sem token válido. Gere o token no navegador e cole na credencial.',
        })
      }

      const r = req(
        RGE_BASE + '/api/historico-contas/conta-completa-pdf?instalacao=' + encodeURIComponent(uc),
        'GET',
        token,
        null,
        true,
      )

      if (r.status === 401) {
        gravarCred(cred, { status: 'expirado' }, 'Token expirado ao buscar PDF')
        return e.json(200, {
          ok: false,
          precisa_token: true,
          error: 'Token expirado. Gere outro no navegador.',
        })
      }
      if (r.status !== 200) {
        return e.json(200, { ok: false, error: 'A CPFL respondeu HTTP ' + r.status })
      }

      const bruto =
        r.res && (r.res.raw !== undefined && r.res.raw !== null ? r.res.raw : r.res.body)
      if (bruto === undefined || bruto === null) {
        return e.json(200, { ok: false, error: 'PDF vazio na resposta' })
      }

      let b64 = ''
      if (typeof bruto === 'string') {
        // já é o conteúdo do arquivo em texto binário
        const bytes = []
        for (let i = 0; i < bruto.length; i++) bytes.push(bruto.charCodeAt(i) & 0xff)
        b64 = bytesParaBase64(bytes)
      } else {
        b64 = bytesParaBase64(bruto)
      }

      return e.json(200, {
        ok: true,
        uc: uc,
        nome_arquivo: 'conta-' + uc + '.pdf',
        base64: b64,
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err) })
    }
  },
  $apis.requireRecordAuth(),
)

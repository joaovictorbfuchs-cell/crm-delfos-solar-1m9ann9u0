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

      // Uma conta por UC + mes. Casa so por esses dois campos: o `dados` JSON
      // nao volta como objeto confiavel aqui, e comparar por ele criava duplicata.
      var filtro = 'uc = "' + uc + '" && competencia = "' + competencia + '"'
      var achados = []
      try {
        achados = $app.findRecordsByFilter('rge_contas', filtro, '', 10, 0)
      } catch (err) {
        achados = []
      }

      var rec = achados.length ? achados[0] : null
      // limpa duplicatas antigas do mesmo mes, se houver
      if (achados.length > 1) {
        for (var d = 1; d < achados.length; d++) {
          try {
            $app.delete(achados[d])
          } catch (eDel) {}
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

    // diagnostico dos arquivos PDF
    var comArquivo = 0
    var detalhe = []
    try {
      var todos = $app.findRecordsByFilter('rge_contas', '', '', 50, 0)
      for (var i = 0; i < todos.length; i++) {
        var arqs = []
        try {
          arqs = todos[i].getStringSlice('arquivo_pdf')
        } catch (eA) {}
        if (arqs && arqs.length) comArquivo++
        detalhe.push({
          id: todos[i].id,
          uc: todos[i].getString('uc'),
          arq: arqs && arqs.length ? arqs[0] : '',
        })
      }
    } catch (eD) {}

    // diagnostico: quantas contas existem e como o filtro se comporta
    var info = { ok: true, hora: new Date().toISOString() }
    try {
      var todos = $app.findRecordsByFilter('rge_contas', '', '', 500, 0)
      info.total_contas = todos.length
      var resumo = []
      for (var i = 0; i < todos.length && i < 8; i++) {
        var r = todos[i]
        var dd = null
        try {
          dd = r.get('dados')
        } catch (e1) {}
        resumo.push({
          id: r.id,
          uc: r.getString('uc'),
          comp: r.getString('competencia'),
          tipo: dd ? String(dd.tipo) : '',
        })
      }
      info.ultimas = resumo
      var filtrados = $app.findRecordsByFilter('rge_contas', 'uc = "20390600115"', '', 50, 0)
      info.filtro_por_uc = filtrados.length
      var filtrados2 = $app.findRecordsByFilter(
        'rge_contas',
        'uc = "20390600115" && competencia = "2026-out"',
        '',
        50,
        0,
      )
      info.filtro_uc_comp = filtrados2.length
    } catch (eDiag) {
      info.diag_erro = String(eDiag).slice(0, 300)
    }
    info.com_arquivo = comArquivo
    info.arquivos = detalhe
    return e.json(200, info)
  } catch (err) {
    return e.json(400, { ok: false, error: String(err) })
  }
})

// O robô pergunta "tem trabalho novo?" -> devolve as credenciais ativas com senha.
// Assim o João cadastra na tela e o robô busca, sem mexer em arquivo.
routerAdd('GET', '/backend/v1/rge/fila-do-robo', (e) => {
  try {
    var segredo = $secrets.get('RGE_ROBO_SECRET') || ''
    if (!segredo) return e.json(500, { ok: false, error: 'RGE_ROBO_SECRET nao configurado' })
    var enviado = e.request.header.get('X-Robo-Secret') || ''
    if (enviado !== segredo) return e.json(401, { ok: false, error: 'Segredo invalido' })

    var recs = []
    try {
      recs = $app.findRecordsByFilter('rge_credenciais', 'ativo = true', '-id', 500, 0)
    } catch (err) {
      try {
        recs = $app.findRecordsByFilter('rge_credenciais', '', '-id', 500, 0)
      } catch (e2) {
        recs = []
      }
    }

    var itens = []
    for (var i = 0; i < recs.length; i++) {
      var r = recs[i]
      var senha = String(r.getString('senha') || '')
      var login = String(r.getString('login') || '')
      if (!senha || !login) continue

      // quantas contas já temos desta UC e qual a mais recente
      var contas = []
      try {
        contas = $app.findRecordsByFilter(
          'rge_contas',
          'uc = "' + r.getString('uc') + '"',
          '',
          200,
          0,
        )
      } catch (eC) {
        contas = []
      }
      var comps = []
      for (var c = 0; c < contas.length; c++) {
        var cp = String(contas[c].getString('competencia') || '')
        if (cp) comps.push(cp)
      }
      // "2026-out" ordenado como TEXTO deixa out antes de set, e a "mais recente"
      // saia errada (set/2026). Converte para ano*12+mes antes de comparar.
      var MESES_ = [
        'jan',
        'fev',
        'mar',
        'abr',
        'mai',
        'jun',
        'jul',
        'ago',
        'set',
        'out',
        'nov',
        'dez',
      ]
      comps.sort(function (a, b) {
        var na = 0
        var nb = 0
        var ma = String(a)
          .toLowerCase()
          .match(/^(\d{4})-([a-z]{3})$/)
        var mb = String(b)
          .toLowerCase()
          .match(/^(\d{4})-([a-z]{3})$/)
        if (ma) na = Number(ma[1]) * 12 + MESES_.indexOf(ma[2])
        if (mb) nb = Number(mb[1]) * 12 + MESES_.indexOf(mb[2])
        return na - nb
      })

      // beneficiárias ativas: o robô baixa a conta de cada uma
      // com o MESMO login desta UC geradora
      var bens = []
      try {
        var rb = $app.findRecordsByFilter(
          'rge_beneficiarias',
          'credencial_id = "' + r.id + '" && ativo = true',
          '',
          200,
          0,
        )
        for (var bi = 0; bi < rb.length; bi++) {
          bens.push({
            id: rb[bi].id,
            uc: String(rb[bi].getString('uc') || '').replace(/\D/g, ''),
            rotulo: rb[bi].getString('rotulo'),
            percentual: rb[bi].getFloat('percentual'),
          })
        }
      } catch (eB) {}

      itens.push({
        id: r.id,
        uc: r.getString('uc'),
        // numeracao antiga (codigo de instalacao), guardada quando a RGE renumerou
        uc_antiga: r.getString('uc_antiga'),
        rotulo: r.getString('rotulo'),
        documento: r.getString('documento'),
        login: login,
        senha: senha,
        usina_id: r.getString('usina_id'),
        cliente_id: r.getString('cliente_id'),
        tem_contas: comps.length,
        ultima_competencia: comps.length ? comps[comps.length - 1] : '',
        // todas as competências já baixadas desta UC (o robô usa para
        // saber quais meses do histórico ainda faltam)
        competencias: comps,
        beneficiarias: bens,
        status: r.getString('status'),
        ultimo_login: r.getString('ultimo_login'),
      })
    }

    return e.json(200, { ok: true, total: itens.length, itens: itens })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// O robô avisa que terminou uma credencial (atualiza status/último login)
routerAdd('POST', '/backend/v1/rge/robo-marcar', (e) => {
  try {
    var segredo = $secrets.get('RGE_ROBO_SECRET') || ''
    if (!segredo) return e.json(500, { ok: false, error: 'RGE_ROBO_SECRET nao configurado' })
    var enviado = e.request.header.get('X-Robo-Secret') || ''
    if (enviado !== segredo) return e.json(401, { ok: false, error: 'Segredo invalido' })

    var body = e.requestInfo().body || {}
    if (!body.credencial_id) return e.json(400, { ok: false, error: 'Informe credencial_id' })
    var rec = $app.findRecordById('rge_credenciais', body.credencial_id)
    var ok = body.status !== 'erro'
    rec.set('status', ok ? 'ok' : 'erro')
    rec.set('ultimo_login', new Date().toISOString())
    rec.set('ultimo_erro', ok ? '' : String(body.erro || '').slice(0, 300))
    $app.save(rec)

    // Erros por beneficiária: o robô manda beneficiarias_erro = [{id, erro}]
    // quando NAO conseguiu baixar a conta de uma UC beneficiária (ex.: "UC nao
    // encontrada em nenhum titular deste login"). Grava em ultimo_erro da
    // beneficiária e segue — um erro individual nunca para o loop.
    var bensComErro = 0
    if (Array.isArray(body.beneficiarias_erro)) {
      for (var bi = 0; bi < body.beneficiarias_erro.length; bi++) {
        var be = body.beneficiarias_erro[bi]
        if (!be || !be.id) continue
        try {
          var brec = $app.findRecordById('rge_beneficiarias', String(be.id))
          brec.set('ultimo_erro', String(be.erro || 'erro desconhecido').slice(0, 300))
          $app.save(brec)
          bensComErro++
        } catch (eBen) {}
      }
    }
    // beneficiárias que baixaram OK: limpa o erro antigo
    if (Array.isArray(body.beneficiarias_ok)) {
      for (var bo = 0; bo < body.beneficiarias_ok.length; bo++) {
        var bok = body.beneficiarias_ok[bo]
        if (!bok || !bok.id) continue
        try {
          var brok = $app.findRecordById('rge_beneficiarias', String(bok.id))
          brok.set('ultimo_erro', '')
          $app.save(brok)
        } catch (eBenOk) {}
      }
    }
    return e.json(200, { ok: true, beneficiarias_erro: bensComErro })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
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
          cliente_id: r.getString('cliente_id'),
          usina_id: r.getString('usina_id'),
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

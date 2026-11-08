// RGE — rotas novas da tela de Integrações:
//   PATCH /backend/v1/rge/credenciais/{id}  -> editar UC/login/senha/rótulo/documento
//   POST  /backend/v1/rge/anexar-conta      -> anexar PDF de conta baixada na mão
//
// Por que arquivo separado: o path de PATCH é distinto (com {id}) e o de anexar
// é novo, então não colidem com as rotas de rge_contas.js (mesmo METODO+path
// duplicado derruba o boot).
//
// Tudo inline (a VM do Skip não herda escopo de topo).

routerAdd(
  'PATCH',
  '/backend/v1/rge/credenciais/{id}',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var id = String(e.request.pathValue('id') || '')
      if (!id) return e.json(400, { ok: false, error: 'Informe o id da credencial' })

      var rec = null
      try {
        rec = $app.findRecordById('rge_credenciais', id)
      } catch (eFind) {
        return e.json(404, { ok: false, error: 'Credencial não encontrada' })
      }

      var body = e.requestInfo().body || {}

      if (body.uc !== undefined) {
        var uc = String(body.uc).replace(/\D/g, '')
        if (!uc) return e.json(400, { ok: false, error: 'UC inválida' })
        // não deixa duas credenciais com a mesma UC
        var outras = []
        try {
          outras = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc + '"', '', 5, 0)
        } catch (eDup) {
          outras = []
        }
        for (var i = 0; i < outras.length; i++) {
          if (outras[i].id !== rec.id) {
            return e.json(400, { ok: false, error: 'Já existe uma credencial para a UC ' + uc })
          }
        }
        rec.set('uc', uc)
      }
      if (body.rotulo !== undefined) rec.set('rotulo', String(body.rotulo).slice(0, 200))
      if (body.documento !== undefined)
        rec.set('documento', String(body.documento).replace(/\D/g, ''))
      if (body.login !== undefined) rec.set('login', String(body.login).slice(0, 200))
      // senha: só troca se vier preenchida (campo em branco = manter a atual)
      if (body.senha !== undefined && String(body.senha) !== '') {
        rec.set('senha', String(body.senha))
      }
      if (body.ativo !== undefined) rec.set('ativo', !!body.ativo)
      if (body.cliente_id !== undefined) rec.set('cliente_id', body.cliente_id)
      if (body.usina_id !== undefined) rec.set('usina_id', body.usina_id)

      $app.save(rec)

      return e.json(200, {
        ok: true,
        item: {
          id: rec.id,
          uc: rec.getString('uc'),
          rotulo: rec.getString('rotulo'),
          documento: rec.getString('documento'),
          login: rec.getString('login'),
          tem_senha: !!rec.getString('senha'),
          ativo: rec.getBool('ativo'),
        },
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.requireAuth(),
)

// Migra as credenciais de portal da FICHA DA USINA (portal_login/portal_senha)
// para a coleção rge_credenciais, e só então limpa os campos da usina.
//
// Body:
//   {}                        -> só diagnostica (não grava nada)
//   { limpar: true }          -> migra e limpa os campos da usina
//   { limpar: true, limpar_campos: false } -> migra mas mantém os campos
routerAdd('POST', '/backend/v1/rge/migrar-credenciais-usinas', (e) => {
  try {
    // aceita o segredo do robô OU um usuário logado (para eu poder rodar o
    // diagnóstico pelo servidor sem depender de sessão no navegador)
    var segredoOk = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) segredoOk = true
    } catch (eS) {}
    if (!segredoOk && (!e.auth || !e.auth.id))
      return e.json(401, { ok: false, error: 'Autenticação necessária' })

    var body = e.requestInfo().body || {}
    var limpar = !!body.limpar
    var limparCampos = body.limpar_campos === undefined ? true : !!body.limpar_campos

    var todas = []
    try {
      todas = $app.findRecordsByFilter('usinas', '', '', 500, 0)
    } catch (err) {
      todas = []
    }

    var achadas = []
    for (var i = 0; i < todas.length; i++) {
      var u = todas[i]
      var lg = String(u.getString('portal_login') || '').trim()
      var sn = String(u.getString('portal_senha') || '').trim()
      if (!lg && !sn) continue
      var ucBruta = String(u.getString('numero_uc') || '').trim()
      // limpa sem regex (o escape de \\D se perde ao salvar o hook)
      var ucNum = ''
      for (var q = 0; q < ucBruta.length; q++) {
        var ch = ucBruta.charAt(q)
        if (ch >= '0' && ch <= '9') ucNum += ch
      }
      achadas.push({
        usina_id: u.id,
        usina_nome: u.getString('nome'),
        uc: ucNum,
        ucOriginal: ucBruta,
        login: lg,
        tem_senha: !!sn,
        senha: sn,
      })
    }

    if (!limpar) {
      var soInfo = []
      for (var x = 0; x < achadas.length; x++) {
        soInfo.push({
          usina: achadas[x].usina_nome,
          uc: achadas[x].uc || '(sem UC)',
          login: achadas[x].login || '(sem login)',
          tem_senha: achadas[x].tem_senha,
        })
      }
      return e.json(200, {
        ok: true,
        modo: 'diagnostico',
        total_usinas: todas.length,
        com_credencial: achadas.length,
        itens: soInfo,
      })
    }

    // ---- migração ----
    var criadas = 0
    var atualizadas = 0
    var puladas = []
    var migradosIds = []

    for (var k = 0; k < achadas.length; k++) {
      var a = achadas[k]
      if (!a.uc) {
        puladas.push({ usina: a.usina_nome, motivo: 'sem numero_uc preenchido' })
        continue
      }
      // UC da RGE tem 10 ou 11 dígitos. O que separa UC de CPF é o FORMATO
      // original: UC aparece como "200.419.001-19" (sempre com pontos no campo).
      // CPF digitado no lugar da UC aparece como "383.904.420-00" — mesmo
      // formato, então checamos também o valor.
      // UC da RGE: 10 ou 11 dígitos. Não dá para filtrar por tamanho.
      // O que identifica CPF é o dígito verificador fechar — só isso.
      if (a.uc.length < 10 || a.uc.length > 12) {
        puladas.push({ usina: a.usina_nome, uc: a.uc, motivo: 'numero_uc nao parece uma UC' })
        continue
      }
      if (a.uc.length === 11) {
        var d1 = 0
        for (var cp = 0; cp < 9; cp++) d1 += Number(a.uc.charAt(cp)) * (10 - cp)
        d1 = (d1 * 10) % 11
        if (d1 === 10) d1 = 0
        var d2 = 0
        for (var cq = 0; cq < 10; cq++) d2 += Number(a.uc.charAt(cq)) * (11 - cq)
        d2 = (d2 * 10) % 11
        if (d2 === 10) d2 = 0
        if (d1 === Number(a.uc.charAt(9)) && d2 === Number(a.uc.charAt(10))) {
          puladas.push({
            usina: a.usina_nome,
            uc: a.uc,
            motivo: 'o numero confere como CPF, nao como UC — conferir na ficha',
          })
          continue
        }
      }
      if (!a.tem_senha) {
        puladas.push({ usina: a.usina_nome, uc: a.uc, motivo: 'sem senha preenchida' })
        continue
      }

      var existentes = []
      try {
        existentes = $app.findRecordsByFilter('rge_credenciais', 'uc = "' + a.uc + '"', '', 1, 0)
      } catch (eF) {
        existentes = []
      }
      var rec = existentes.length ? existentes[0] : null
      var novo = !rec
      if (!rec) rec = new Record($app.findCollectionByNameOrId('rge_credenciais'))

      rec.set('uc', a.uc)
      if (a.usina_nome) rec.set('rotulo', String(a.usina_nome).slice(0, 200))
      if (a.login) rec.set('login', String(a.login).slice(0, 200))
      // não sobrescreve senha já cadastrada na tela de Integrações
      if (!String(rec.getString('senha') || '')) rec.set('senha', a.senha)
      if (a.usina_id) rec.set('usina_id', a.usina_id)
      if (!rec.getString('status')) rec.set('status', 'novo')
      rec.set('ativo', true)
      $app.save(rec)
      migradosIds.push(a.usina_id)
      if (novo) criadas++
      else atualizadas++
    }

    // ---- limpa os campos da usina (só das que migraram) ----
    var limpas = 0
    if (limparCampos) {
      for (var m = 0; m < migradosIds.length; m++) {
        try {
          var us = $app.findRecordById('usinas', migradosIds[m])
          us.set('portal_login', '')
          us.set('portal_senha', '')
          $app.save(us)
          limpas++
        } catch (eU) {}
      }
    }

    return e.json(200, {
      ok: true,
      modo: 'migracao',
      com_credencial: achadas.length,
      criadas: criadas,
      atualizadas: atualizadas,
      usinas_limpas: limpas,
      campos_limpos: limparCampos,
      puladas: puladas,
    })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

routerAdd(
  'POST',
  '/backend/v1/rge/anexar-conta',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })

      var body = e.requestInfo().body || {}
      var uc = String(body.uc == null ? '' : body.uc).replace(/\D/g, '')
      if (!uc) return e.json(400, { ok: false, error: 'Informe a UC' })
      var competencia = String(body.competencia == null ? '' : body.competencia)
        .trim()
        .slice(0, 20)
      if (!/^\d{4}-[a-z]{3}$/i.test(competencia)) {
        return e.json(400, { ok: false, error: 'Competência deve ser AAAA-mmm (ex.: 2026-out)' })
      }

      var b64 = String(body.pdf_base64 == null ? '' : body.pdf_base64)
      if (b64.length < 1000) return e.json(400, { ok: false, error: 'Nenhum PDF recebido' })

      // decodifica base64 na mão (não existe base64ToBytes nesta versão)
      var ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var limpo = String(b64).replace(/[^A-Za-z0-9+/=]/g, '')
      var tam = limpo.length
      var sobra = 0
      if (tam > 0 && limpo.charAt(tam - 1) === '=') sobra++
      if (tam > 1 && limpo.charAt(tam - 2) === '=') sobra++
      var outLen = Math.floor((tam * 3) / 4) - sobra
      if (outLen < 1000) return e.json(400, { ok: false, error: 'PDF vazio' })
      var bytes = new Uint8Array(outLen)
      var pos = 0
      var j = 0
      while (j < tam) {
        var c1 = ALF.indexOf(limpo.charAt(j++))
        var c2 = ALF.indexOf(limpo.charAt(j++))
        var c3 = ALF.indexOf(limpo.charAt(j++))
        var c4 = ALF.indexOf(limpo.charAt(j++))
        if (c1 < 0 || c2 < 0) break
        bytes[pos++] = ((c1 << 2) | (c2 >> 4)) & 0xff
        if (c3 >= 0 && pos < outLen) bytes[pos++] = (((c2 & 15) << 4) | (c3 >> 2)) & 0xff
        if (c4 >= 0 && pos < outLen) bytes[pos++] = (((c3 & 3) << 6) | c4) & 0xff
      }
      if (pos < outLen) bytes = bytes.subarray(0, pos)

      // 1 conta por UC + competência
      var filtro = 'uc = "' + uc + '" && competencia = "' + competencia + '"'
      var achados = []
      try {
        achados = $app.findRecordsByFilter('rge_contas', filtro, '', 10, 0)
      } catch (eF) {
        achados = []
      }
      var rec = achados.length ? achados[0] : null
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
      if (body.vencimento) rec.set('vencimento', String(body.vencimento).slice(0, 20))
      if (body.valor !== undefined && body.valor !== null && body.valor !== '') {
        var v = Number(String(body.valor).replace(/\./g, '').replace(',', '.'))
        if (!isNaN(v)) rec.set('valor', v)
      }
      if (body.consumo_kwh !== undefined && body.consumo_kwh !== null && body.consumo_kwh !== '') {
        var k = Number(body.consumo_kwh)
        if (!isNaN(k)) rec.set('consumo_kwh', k)
      }
      rec.set('nome_arquivo', nomeArq)
      rec.set('origem', 'manual')
      if (body.credencial_id) rec.set('credencial_id', body.credencial_id)
      if (body.cliente_id) rec.set('cliente_id', body.cliente_id)
      if (body.usina_id) rec.set('usina_id', body.usina_id)
      rec.set('dados', {
        tipo: 'manual',
        anexado_por: e.auth.getString('email') || e.auth.id,
        anexado_em: new Date().toISOString(),
        bytes: bytes.length,
      })

      rec.set('arquivo_pdf', $filesystem.fileFromBytes(bytes, nomeArq))
      $app.save(rec)

      return e.json(200, {
        ok: true,
        conta_id: rec.id,
        uc: uc,
        competencia: competencia,
        kb: Math.round(bytes.length / 1024),
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.bodyLimit(30 * 1024 * 1024),
  $apis.requireAuth(),
)

// devolve a URL pública do arquivo PDF de uma conta
routerAdd(
  'GET',
  '/backend/v1/rge/url-pdf',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      if (!q.id) return e.json(400, { ok: false, error: 'Informe id' })
      var rec = $app.findRecordById('rge_contas', q.id)
      var arqs = []
      try {
        arqs = rec.getStringSlice('arquivo_pdf')
      } catch (e2) {}
      if (!arqs || !arqs.length)
        return e.json(200, { ok: false, error: 'Esta conta ainda não tem PDF' })
      // arqs[0] já é o nome REAL gravado (o PocketBase renomeia: pontos/traços
      // viram "_" e ganha sufixo). Usar o nome do campo daria 404.
      // O arquivo exige auth e window.open não manda header -> token na query.
      var tok = e.request.header.get('Authorization') || ''
      var soToken = tok.replace(/^Bearer\s+/i, '').trim()
      return e.json(200, {
        ok: true,
        nome_arquivo: rec.getString('nome_arquivo') || arqs[0],
        arquivo: String(arqs[0]),
        url: '/api/files/rge_contas/' + rec.id + '/' + encodeURIComponent(String(arqs[0])),
        token: soToken,
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.requireAuth(),
)

// RGE — autoleitura pelo robo do PC da Delfos.
//
// Rotas:
//   POST /backend/v1/rge/leitura-solicitar   (usuario logado) cria o pedido
//   GET  /backend/v1/rge/leitura-fila        (X-Robo-Secret) lista a fila
//   POST /backend/v1/rge/leitura-resultado   (X-Robo-Secret) grava o retorno
//   GET  /backend/v1/rge/leitura-atividade   (usuario logado) pedidos de uma atividade
//
// O robo NUNCA recebe senha por aqui: ele le a credencial da UC em
// rge_credenciais, como ja faz para baixar contas.
//
// Tudo inline (a VM do Skip nao herda escopo de topo).

function segredoRoboOk(e) {
  try {
    var seg = $secrets.get('RGE_ROBO_SECRET') || ''
    if (!seg) return false
    return (e.request.header.get('X-Robo-Secret') || '') === seg
  } catch (err) {
    return false
  }
}

function apenasDigitos(v) {
  var s = String(v == null ? '' : v)
  var out = ''
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i)
    if (c >= '0' && c <= '9') out += c
  }
  return out
}

// Normaliza a leitura para 5 posicoes com zeros a esquerda, que e o que a
// tela do portal espera (5 quadradinhos de 1 digito).
function normalizarLeitura(v) {
  var d = apenasDigitos(v)
  if (!d) return { erro: 'leitura vazia' }
  if (d.length > 5) return { erro: 'leitura com mais de 5 digitos: ' + d }
  while (d.length < 5) d = '0' + d
  return { valor: d }
}

// ---------------------------------------------------------------- solicitar
routerAdd(
  'POST',
  '/backend/v1/rge/leitura-solicitar',
  (e) => {
    try {
      // aceita o usuario logado (botao na tela) OU o segredo do robo
      // (para testes e para automatismos no PC da Delfos)
      var porSegredo = segredoRoboOk(e)
      if (!porSegredo && (!e.auth || !e.auth.id))
        return e.json(401, { ok: false, error: 'Autenticação necessária' })

      var body = e.requestInfo().body || {}
      var uc = apenasDigitos(body.uc)
      if (!uc) return e.json(400, { ok: false, error: 'Informe a UC (numero_uc)' })

      var l03 = normalizarLeitura(body.valor_03)
      if (l03.erro) return e.json(400, { ok: false, error: 'Leitura 03 invalida: ' + l03.erro })
      var lA3 = { valor: '' }
      if (body.valor_a3 !== undefined && String(body.valor_a3) !== '') {
        lA3 = normalizarLeitura(body.valor_a3)
        if (lA3.erro) return e.json(400, { ok: false, error: 'Leitura A3 invalida: ' + lA3.erro })
      }

      var tel = apenasDigitos(body.telefone)
      if (tel.length < 10 || tel.length > 11)
        return e.json(400, {
          ok: false,
          error: 'Telefone deve ter 10 ou 11 digitos (DDD + numero)',
        })

      var atividadeId = String(body.atividade_id || '')
      if (!atividadeId) return e.json(400, { ok: false, error: 'Informe a atividade_id' })

      var atividade = null
      try {
        atividade = $app.findRecordById('atividades', atividadeId)
      } catch (eAt) {
        return e.json(404, { ok: false, error: 'Atividade nao encontrada' })
      }

      // A UC pedida tem que existir entre as credenciais ativas: sem isso o
      // robo nao tem login para entrar e o pedido morreria na fila.
      var cred = []
      try {
        cred = $app.findRecordsByFilter(
          'rge_credenciais',
          'uc = "' + uc + '" && ativo = true',
          '',
          2,
          0,
        )
      } catch (eCr) {
        cred = []
      }
      var temBenef = []
      if (!cred.length) {
        try {
          temBenef = $app.findRecordsByFilter(
            'rge_beneficiarias',
            'uc = "' + uc + '" && ativo = true',
            '',
            2,
            0,
          )
        } catch (eB) {
          temBenef = []
        }
      }
      if (!cred.length && !temBenef.length)
        return e.json(400, {
          ok: false,
          error: 'Nenhuma credencial ativa para a UC ' + uc + '. Cadastre em Integrações RGE.',
        })

      // um pedido aberto por atividade: nao deixa duplicar
      var abertos = []
      try {
        abertos = $app.findRecordsByFilter(
          'rge_leituras',
          'atividade_id = "' + atividadeId + '" && (status = "na_fila" || status = "processando")',
          '',
          5,
          0,
        )
      } catch (eAb) {
        abertos = []
      }
      if (abertos.length)
        return e.json(409, {
          ok: false,
          error: 'Esta atividade ja tem uma leitura na fila',
          leitura_id: abertos[0].id,
        })

      var rec = new Record($app.findCollectionByNameOrId('rge_leituras'))
      rec.set('atividade_id', atividadeId)
      var clienteId = String(atividade.getString('cliente_id') || '')
      if (clienteId) rec.set('cliente_id', clienteId)
      rec.set('uc', uc)
      rec.set('mes_referencia', String(body.mes_referencia || '').slice(0, 20))
      rec.set('valor_03', l03.valor)
      rec.set('valor_a3', lA3.valor)
      rec.set('telefone', tel)
      rec.set('status', 'na_fila')
      var quem = 'robo'
      if (!porSegredo) {
        try {
          quem = String(e.auth.getString('nome') || e.auth.getString('name') || e.auth.email || '')
        } catch (eQ) {
          quem = ''
        }
      }
      rec.set('solicitado_por', quem.slice(0, 120))
      rec.set('tentativas', 0)
      $app.save(rec)

      return e.json(200, {
        ok: true,
        leitura_id: rec.id,
        valor_03: l03.valor,
        valor_a3: lA3.valor,
        uc: uc,
        status: 'na_fila',
      })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  // SEM $apis.requireAuth(): o handler aceita usuario logado OU o segredo do
  // robo, e o middleware cortaria o segredo antes de chegar aqui.
  // A autorizacao e conferida dentro do handler (porSegredo).
)

// ---------------------------------------------------------------- fila do robo
// O robo pergunta "tem leitura para enviar?" e recebe o pedido + o login da UC.
routerAdd('GET', '/backend/v1/rge/leitura-fila', (e) => {
  try {
    if (!segredoRoboOk(e)) return e.json(401, { ok: false, error: 'Segredo invalido' })

    var fila = []
    try {
      fila = $app.findRecordsByFilter('rge_leituras', 'status = "na_fila"', 'created', 20, 0)
    } catch (err) {
      fila = []
    }

    var itens = []
    for (var i = 0; i < fila.length; i++) {
      var r = fila[i]
      var uc = r.getString('uc')

      // credencial da UC (ou da geradora, quando a UC e beneficiaria)
      var login = ''
      var senha = ''
      var documento = ''
      var credId = ''
      var cr = []
      try {
        cr = $app.findRecordsByFilter(
          'rge_credenciais',
          'uc = "' + uc + '" && ativo = true',
          '',
          1,
          0,
        )
      } catch (eCr) {
        cr = []
      }
      if (!cr.length) {
        // beneficiaria: usa o login da UC geradora
        var ben = []
        try {
          ben = $app.findRecordsByFilter(
            'rge_beneficiarias',
            'uc = "' + uc + '" && ativo = true',
            '',
            1,
            0,
          )
        } catch (eB) {
          ben = []
        }
        if (ben.length) {
          var credDaBen = String(ben[0].getString('credencial_id') || '')
          if (credDaBen) {
            try {
              var cGer = $app.findRecordById('rge_credenciais', credDaBen)
              if (cGer) cr = [cGer]
            } catch (eG) {
              cr = []
            }
          }
        }
      }
      if (cr.length) {
        credId = cr[0].id
        login = cr[0].getString('login')
        senha = cr[0].getString('senha')
        documento = cr[0].getString('documento')
      }
      if (!login || !senha) continue

      itens.push({
        id: r.id,
        uc: uc,
        uc_antiga: '',
        valor_03: r.getString('valor_03'),
        valor_a3: r.getString('valor_a3'),
        telefone: r.getString('telefone'),
        mes_referencia: r.getString('mes_referencia'),
        atividade_id: r.getString('atividade_id'),
        credencial_id: credId,
        login: login,
        senha: senha,
        documento: documento,
      })
    }

    return e.json(200, { ok: true, total: itens.length, itens: itens })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// O robo reserva o item antes de comecar (evita dois roboes pegando o mesmo)
routerAdd('POST', '/backend/v1/rge/leitura-pegar', (e) => {
  try {
    if (!segredoRoboOk(e)) return e.json(401, { ok: false, error: 'Segredo invalido' })
    var body = e.requestInfo().body || {}
    if (!body.id) return e.json(400, { ok: false, error: 'Informe id' })
    var rec = $app.findRecordById('rge_leituras', body.id)
    if (rec.getString('status') === 'enviada')
      return e.json(409, {
        ok: false,
        error: 'Esta leitura ja foi enviada',
        protocolo: rec.getString('protocolo'),
      })
    rec.set('status', 'processando')
    rec.set('robo_em', new Date().toISOString())
    rec.set('tentativas', (rec.getInt('tentativas') || 0) + 1)
    $app.save(rec)
    return e.json(200, { ok: true, id: rec.id, tentativas: rec.getInt('tentativas') })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// ---------------------------------------------------------------- resultado
// Grava o retorno e atualiza a atividade: protocolo, horario, mensagem e
// status. Assim o operador ve na propria atividade que a leitura foi aceita.
routerAdd('POST', '/backend/v1/rge/leitura-resultado', (e) => {
  try {
    if (!segredoRoboOk(e)) return e.json(401, { ok: false, error: 'Segredo invalido' })

    var body = e.requestInfo().body || {}
    if (!body.id) return e.json(400, { ok: false, error: 'Informe id' })

    var rec = null
    try {
      rec = $app.findRecordById('rge_leituras', body.id)
    } catch (eR) {
      return e.json(404, { ok: false, error: 'Leitura nao encontrada' })
    }

    var sucesso = body.ok !== false
    rec.set('status', sucesso ? 'enviada' : 'erro')
    rec.set('protocolo', String(body.protocolo || '').slice(0, 40))
    rec.set('mensagem', String(body.mensagem || body.erro || '').slice(0, 4000))
    if (sucesso) rec.set('horario_envio', String(body.horario || new Date().toISOString()))
    if (body.mes_referencia) rec.set('mes_referencia', String(body.mes_referencia).slice(0, 20))
    $app.save(rec)

    // devolve para a atividade
    var atividadeId = String(rec.getString('atividade_id') || '')
    if (atividadeId) {
      try {
        var atv = $app.findRecordById('atividades', atividadeId)
        if (sucesso) {
          atv.set('protocolo_rge', String(body.protocolo || '').slice(0, 40))
          atv.set('valor_grandeza_03', rec.getString('valor_03'))
          if (rec.getString('valor_a3')) atv.set('valor_grandeza_103', rec.getString('valor_a3'))
          atv.set('data_leitura', String(body.horario || new Date().toISOString()))
          atv.set('status', 'concluida')

          // texto livre que a tela ja mostra hoje
          var quando = new Date().toLocaleString('pt-BR')
          var texto =
            'Leitura registrada automaticamente pelo robo\n' +
            'Grandeza 03: ' +
            rec.getString('valor_03') +
            (rec.getString('valor_a3') ? '\nGrandeza A3: ' + rec.getString('valor_a3') : '') +
            '\nProtocolo RGE: ' +
            String(body.protocolo || '(nao retornado)') +
            '\nData do envio: ' +
            quando
          atv.set('dados_leitura_registrados', texto)
          atv.set('auto_leitura_obs', texto)

          // conclui a mae tambem, igual ao modo manual
          var parentId = String(atv.getString('parent_id') || '')
          if (parentId) {
            try {
              var mae = $app.findRecordById('atividades', parentId)
              mae.set('status', 'concluida')
              mae.set('dados_leitura_registrados', texto)
              mae.set('auto_leitura_obs', texto)
              mae.set('protocolo_rge', String(body.protocolo || '').slice(0, 40))
              $app.save(mae)
            } catch (eMae) {}
          }
        } else {
          // erro: guarda o motivo sem concluir a atividade
          var obsAtual = String(atv.getString('auto_leitura_obs') || '')
          var linha =
            '[' +
            new Date().toLocaleString('pt-BR') +
            '] Falha no envio automatico: ' +
            String(body.erro || body.mensagem || '').slice(0, 500)
          atv.set('auto_leitura_obs', obsAtual ? obsAtual + '\n\n' + linha : linha)
        }
        $app.save(atv)
      } catch (eAt) {}
    }

    return e.json(200, {
      ok: true,
      leitura_id: rec.id,
      status: rec.getString('status'),
      atividade_atualizada: !!atividadeId && sucesso,
    })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// ---------------------------------------------------------------- consulta na tela
// A tela da atividade mostra o estado do envio (na fila / enviada / erro).
routerAdd(
  'GET',
  '/backend/v1/rge/leitura-atividade',
  (e) => {
    try {
      if (!e.auth || !e.auth.id) return e.json(401, { ok: false, error: 'Autenticação necessária' })
      var q = e.requestInfo().query || {}
      var atividadeId = String(q.atividade_id || '')
      if (!atividadeId) return e.json(400, { ok: false, error: 'Informe atividade_id' })

      var recs = []
      try {
        recs = $app.findRecordsByFilter(
          'rge_leituras',
          'atividade_id = "' + atividadeId + '"',
          '-created',
          5,
          0,
        )
      } catch (err2) {
        recs = []
      }

      var itens = []
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i]
        itens.push({
          id: r.id,
          uc: r.getString('uc'),
          valor_03: r.getString('valor_03'),
          valor_a3: r.getString('valor_a3'),
          status: r.getString('status'),
          protocolo: r.getString('protocolo'),
          horario_envio: r.getString('horario_envio'),
          mensagem: r.getString('mensagem'),
          mes_referencia: r.getString('mes_referencia'),
          created: r.getString('created'),
        })
      }
      return e.json(200, { ok: true, total: itens.length, itens: itens })
    } catch (err) {
      return e.json(400, { ok: false, error: String(err).slice(0, 400) })
    }
  },
  $apis.requireAuth(),
)

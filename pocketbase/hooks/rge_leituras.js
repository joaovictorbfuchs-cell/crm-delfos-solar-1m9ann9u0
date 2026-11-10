// RGE — autoleitura pelo robo do PC da Delfos.
//
// Rotas:
//   POST /backend/v1/rge/leitura-solicitar   (usuario logado OU segredo do robo)
//   GET  /backend/v1/rge/leitura-fila        (X-Robo-Secret) lista a fila
//   POST /backend/v1/rge/leitura-pegar       (X-Robo-Secret) reserva o item
//   POST /backend/v1/rge/leitura-resultado   (X-Robo-Secret) grava o retorno
//   GET  /backend/v1/rge/leitura-atividade   (usuario logado) pedidos de uma atividade
//
// O robo NUNCA recebe senha por aqui: ele le a credencial da UC em
// rge_credenciais, como ja faz para baixar contas.
//
// IMPORTANTE: a VM do Skip executa cada callback num pool separado e NAO
// herda escopo de topo — por isso funcoes auxiliares dao "Hook scoping error".
// Todo o codigo vai INLINE dentro de cada callback.

// ---------------------------------------------------------------- solicitar
routerAdd('POST', '/backend/v1/rge/leitura-solicitar', (e) => {
  try {
    // aceita o usuario logado (botao na tela) OU o segredo do robo
    var porSegredo = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) porSegredo = true
    } catch (eS) {}
    if (!porSegredo && (!e.auth || !e.auth.id))
      return e.json(401, { ok: false, error: 'Autenticação necessária' })

    var body = e.requestInfo().body || {}

    var ucBruta = String(body.uc == null ? '' : body.uc)
    var uc = ''
    for (var q = 0; q < ucBruta.length; q++) {
      var ch = ucBruta.charAt(q)
      if (ch >= '0' && ch <= '9') uc += ch
    }
    if (!uc) return e.json(400, { ok: false, error: 'Informe a UC (numero_uc)' })

    // leitura: 5 posicoes com zeros a esquerda (a tela tem 5 quadradinhos)
    var d03 = ''
    var b03 = String(body.valor_03 == null ? '' : body.valor_03)
    for (var a = 0; a < b03.length; a++) {
      var c03 = b03.charAt(a)
      if (c03 >= '0' && c03 <= '9') d03 += c03
    }
    if (!d03) return e.json(400, { ok: false, error: 'Leitura 03 invalida: vazia' })
    if (d03.length > 5)
      return e.json(400, { ok: false, error: 'Leitura 03 invalida: mais de 5 digitos' })
    while (d03.length < 5) d03 = '0' + d03

    var dA3 = ''
    if (body.valor_a3 !== undefined && String(body.valor_a3) !== '') {
      var bA3 = String(body.valor_a3)
      for (var b2 = 0; b2 < bA3.length; b2++) {
        var cA3 = bA3.charAt(b2)
        if (cA3 >= '0' && cA3 <= '9') dA3 += cA3
      }
      if (!dA3) return e.json(400, { ok: false, error: 'Leitura A3 invalida: vazia' })
      if (dA3.length > 5)
        return e.json(400, { ok: false, error: 'Leitura A3 invalida: mais de 5 digitos' })
      while (dA3.length < 5) dA3 = '0' + dA3
    }

    var telBruto = String(body.telefone == null ? '' : body.telefone)
    var tel = ''
    for (var t = 0; t < telBruto.length; t++) {
      var ct = telBruto.charAt(t)
      if (ct >= '0' && ct <= '9') tel += ct
    }
    if (tel.length < 10 || tel.length > 11)
      return e.json(400, { ok: false, error: 'Telefone deve ter 10 ou 11 digitos (DDD + numero)' })

    var atividadeId = String(body.atividade_id || '')
    if (!atividadeId) return e.json(400, { ok: false, error: 'Informe a atividade_id' })

    var atividade = null
    try {
      atividade = $app.findRecordById('atividades', atividadeId)
    } catch (eAt) {
      return e.json(404, { ok: false, error: 'Atividade nao encontrada' })
    }

    // A UC precisa ter credencial ativa (dona ou beneficiaria): sem isso o
    // robo nao tem login e o pedido morreria na fila.
    var temCred = false
    try {
      if (
        $app.findRecordsByFilter('rge_credenciais', 'uc = "' + uc + '" && ativo = true', '', 1, 0)
          .length
      )
        temCred = true
    } catch (eCr) {}
    if (!temCred) {
      try {
        if (
          $app.findRecordsByFilter(
            'rge_beneficiarias',
            'uc = "' + uc + '" && ativo = true',
            '',
            1,
            0,
          ).length
        )
          temCred = true
      } catch (eB) {}
    }
    if (!temCred)
      return e.json(400, {
        ok: false,
        error: 'Nenhuma credencial ativa para a UC ' + uc + '. Cadastre em Integrações RGE.',
      })

    // um pedido aberto por atividade (nao duplicar)
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

    var quem = 'robo'
    if (!porSegredo) {
      try {
        quem = String(e.auth.getString('nome') || e.auth.getString('name') || e.auth.email || '')
      } catch (eQ) {
        quem = ''
      }
    }

    var rec = new Record($app.findCollectionByNameOrId('rge_leituras'))
    rec.set('atividade_id', atividadeId)
    var clienteId = String(atividade.getString('cliente_id') || '')
    if (clienteId) rec.set('cliente_id', clienteId)
    rec.set('uc', uc)
    rec.set('mes_referencia', String(body.mes_referencia || '').slice(0, 20))
    rec.set('valor_03', d03)
    rec.set('valor_a3', dA3)
    rec.set('telefone', tel)
    rec.set('status', 'na_fila')
    rec.set('solicitado_por', quem.slice(0, 120))
    rec.set('tentativas', 0)
    $app.save(rec)

    return e.json(200, {
      ok: true,
      leitura_id: rec.id,
      valor_03: d03,
      valor_a3: dA3,
      uc: uc,
      status: 'na_fila',
    })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// ---------------------------------------------------------------- fila do robo
// O robo pergunta "tem leitura para enviar?" e recebe o pedido + o login da UC.
routerAdd('GET', '/backend/v1/rge/leitura-fila', (e) => {
  try {
    var okSeg = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) okSeg = true
    } catch (eS) {}
    if (!okSeg) return e.json(401, { ok: false, error: 'Segredo invalido' })

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

// O robo reserva o item antes de comecar (evita dois roboes no mesmo pedido)
routerAdd('POST', '/backend/v1/rge/leitura-pegar', (e) => {
  try {
    var okSeg = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) okSeg = true
    } catch (eS) {}
    if (!okSeg) return e.json(401, { ok: false, error: 'Segredo invalido' })

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
// Grava o retorno e atualiza a atividade: protocolo, valores, data e status.
routerAdd('POST', '/backend/v1/rge/leitura-resultado', (e) => {
  try {
    var okSeg = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) okSeg = true
    } catch (eS) {}
    if (!okSeg) return e.json(401, { ok: false, error: 'Segredo invalido' })

    var body = e.requestInfo().body || {}
    if (!body.id) return e.json(400, { ok: false, error: 'Informe id' })

    var rec = null
    try {
      rec = $app.findRecordById('rge_leituras', body.id)
    } catch (eR) {
      return e.json(404, { ok: false, error: 'Leitura nao encontrada' })
    }

    // devolver: o robo reservou mas NAO chegou a enviar (modo simulacao, ou
    // desistiu). Volta para a fila sem tocar na atividade.
    if (body.devolver === true) {
      rec.set('status', 'na_fila')
      rec.set('mensagem', String(body.mensagem || 'devolvido a fila').slice(0, 4000))
      $app.save(rec)
      return e.json(200, { ok: true, leitura_id: rec.id, devolvido: true })
    }

    // apagar: limpa um pedido de teste sem mexer na atividade
    if (body.apagar === true) {
      $app.delete(rec)
      return e.json(200, { ok: true, apagado: true })
    }

    var sucesso = body.ok !== false
    rec.set('status', sucesso ? 'enviada' : 'erro')
    rec.set('protocolo', String(body.protocolo || '').slice(0, 40))
    rec.set('mensagem', String(body.mensagem || body.erro || '').slice(0, 4000))
    if (sucesso) rec.set('horario_envio', String(body.horario || new Date().toISOString()))
    if (body.mes_referencia) rec.set('mes_referencia', String(body.mes_referencia).slice(0, 20))
    $app.save(rec)

    var atividadeId = String(rec.getString('atividade_id') || '')
    if (atividadeId) {
      try {
        var atv = $app.findRecordById('atividades', atividadeId)
        var valor03 = rec.getString('valor_03')
        var valorA3 = rec.getString('valor_a3')
        var protocolo = String(body.protocolo || '').slice(0, 40)

        if (sucesso) {
          atv.set('protocolo_rge', protocolo)
          atv.set('valor_grandeza_03', valor03)
          if (valorA3) atv.set('valor_grandeza_103', valorA3)
          atv.set('data_leitura', String(body.horario || new Date().toISOString()))
          // a mae tambem recebe os valores, para o historico ficar completo
          try {
            var pid0 = String(atv.getString('parent_id') || '')
            if (pid0) {
              var m0 = $app.findRecordById('atividades', pid0)
              if (valor03) m0.set('valor_grandeza_03', valor03)
              if (valorA3) m0.set('valor_grandeza_103', valorA3)
              m0.set('data_leitura', String(body.horario || new Date().toISOString()))
              $app.save(m0)
            }
          } catch (eM0) {}
          atv.set('status', 'concluida')

          // texto com TUDO o que a tela do portal mostrou
          var quando = new Date().toLocaleString('pt-BR')
          var dataTela = String(body.data_hora_texto || '').slice(0, 60)
          var telTela = String(body.telefone || '').slice(0, 30)
          var mesTela = String(body.mes_referencia || '').slice(0, 20)
          var linhas = ['Leitura registrada no portal da RGE (autoleitura)']
          var ucCrm = String(atv.getString('numero_uc') || '').slice(0, 40)
          if (ucCrm) linhas.push('UC: ' + ucCrm)
          if (mesTela) linhas.push('Mês de referência: ' + mesTela)
          if (valor03) linhas.push('03 - Totalizador Consumo Ativo: ' + valor03)
          if (valorA3) linhas.push('A3 - Totalizador Consumo Ativo Reverso: ' + valorA3)
          if (telTela) linhas.push('Telefone do solicitante: ' + telTela)
          linhas.push('Protocolo da leitura: ' + (protocolo || '(nao retornado)'))
          linhas.push('Data da solicitação: ' + (dataTela || quando))
          var texto = linhas.join('\n')
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
              mae.set('protocolo_rge', protocolo)
              $app.save(mae)
            } catch (eMae) {}
          }
        } else {
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

// ---------------------------------------------------------------- preencher na mao
// Grava na atividade os dados de uma leitura JA FEITA no portal (registro
// retroativo ou correcao). Nao fala com a RGE: so escreve no CRM.
// Aceita usuario logado OU o segredo do robo.
routerAdd('POST', '/backend/v1/rge/leitura-preencher', (e) => {
  try {
    var porSegredo = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) porSegredo = true
    } catch (eS) {}
    if (!porSegredo && (!e.auth || !e.auth.id))
      return e.json(401, { ok: false, error: 'Autenticação necessária' })

    var body = e.requestInfo().body || {}
    var atividadeId = String(body.atividade_id || '')
    if (!atividadeId) return e.json(400, { ok: false, error: 'Informe atividade_id' })

    var atv = null
    try {
      atv = $app.findRecordById('atividades', atividadeId)
    } catch (eAt) {
      return e.json(404, { ok: false, error: 'Atividade nao encontrada' })
    }

    var protocolo = String(body.protocolo || '').slice(0, 40)
    if (!protocolo) return e.json(400, { ok: false, error: 'Informe o protocolo da leitura' })

    // valores: aceita com ou sem zeros a esquerda; guarda com 5 posicoes
    var v03 = ''
    var b03 = String(body.valor_03 == null ? '' : body.valor_03)
    for (var a = 0; a < b03.length; a++) {
      var ch = b03.charAt(a)
      if (ch >= '0' && ch <= '9') v03 += ch
    }
    while (v03.length > 0 && v03.length < 5) v03 = '0' + v03

    var vA3 = ''
    var bA3 = String(body.valor_a3 == null ? '' : body.valor_a3)
    for (var b2 = 0; b2 < bA3.length; b2++) {
      var ch3 = bA3.charAt(b2)
      if (ch3 >= '0' && ch3 <= '9') vA3 += ch3
    }
    while (vA3.length > 0 && vA3.length < 5) vA3 = '0' + vA3

    var quando = String(body.data_hora || new Date().toISOString())
    var dataFormatada = String(body.data_hora_texto || '').slice(0, 60)
    var mesRef = String(body.mes_referencia || '').slice(0, 20)
    var telefone = String(body.telefone || '').slice(0, 30)
    var ucTexto = String(body.uc || '').slice(0, 40)
    var ucAntiga = String(body.uc_antiga || '').slice(0, 40)
    var protAtend = String(body.protocolo_atendimento || '').slice(0, 40)
    var observacao = String(body.observacao || '').slice(0, 1000)

    var linhas = ['Leitura registrada no portal da RGE (autoleitura)']
    if (ucTexto)
      linhas.push('UC: ' + ucTexto + (ucAntiga ? ' (código antigo ' + ucAntiga + ')' : ''))
    if (mesRef) linhas.push('Mês de referência: ' + mesRef)
    if (v03) linhas.push('03 - Totalizador Consumo Ativo: ' + v03)
    if (vA3) linhas.push('A3 - Totalizador Consumo Ativo Reverso: ' + vA3)
    if (telefone) linhas.push('Telefone do solicitante: ' + telefone)
    linhas.push('Protocolo da leitura: ' + protocolo)
    if (dataFormatada) linhas.push('Data da solicitação: ' + dataFormatada)
    if (protAtend) linhas.push('Protocolo de atendimento (sessão): ' + protAtend)
    if (observacao) linhas.push(observacao)
    var texto = linhas.join('\n')

    atv.set('protocolo_rge', protocolo)
    if (v03) atv.set('valor_grandeza_03', v03)
    if (vA3) atv.set('valor_grandeza_103', vA3)
    atv.set('data_leitura', quando)
    atv.set('status', 'concluida')
    atv.set('dados_leitura_registrados', texto)
    atv.set('auto_leitura_obs', texto)
    if (ucTexto) atv.set('numero_uc', ucTexto)
    // descricao: se vier, substitui (e o que aparece no CARD e no modal)
    if (body.descricao !== undefined && String(body.descricao) !== '') {
      atv.set('descricao', String(body.descricao).slice(0, 5000))
    }
    $app.save(atv)

    // conclui a mae tambem
    var maeOk = false
    var parentId = String(atv.getString('parent_id') || '')
    if (parentId) {
      try {
        var mae = $app.findRecordById('atividades', parentId)
        mae.set('status', 'concluida')
        mae.set('dados_leitura_registrados', texto)
        mae.set('auto_leitura_obs', texto)
        mae.set('protocolo_rge', protocolo)
        $app.save(mae)
        maeOk = true
      } catch (eMae) {}
    }

    return e.json(200, {
      ok: true,
      atividade_id: atv.id,
      protocolo: protocolo,
      valor_03: v03,
      valor_a3: vA3,
      status: atv.getString('status'),
      mae_concluida: maeOk,
      texto: texto,
    })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// ---------------------------------------------------------------- corrigir UC do titulo
// A RGE renumerou as UCs: atividades antigas ficaram com o codigo velho no
// TITULO ("Auto Leitura RGE - UC 4004280183"). Esta rota troca o titulo e o
// campo numero_uc da atividade e das filhas. Aceita segredo do robo.
routerAdd('POST', '/backend/v1/rge/atividade-trocar-uc', (e) => {
  try {
    var porSegredo = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) porSegredo = true
    } catch (eS) {}
    if (!porSegredo && (!e.auth || !e.auth.id))
      return e.json(401, { ok: false, error: 'Autenticação necessária' })

    var body = e.requestInfo().body || {}
    var atividadeId = String(body.atividade_id || '')
    var ucNova = String(body.uc_nova || '').slice(0, 40)
    if (!atividadeId) return e.json(400, { ok: false, error: 'Informe atividade_id' })
    if (!ucNova) return e.json(400, { ok: false, error: 'Informe uc_nova' })

    var alterados = []
    var atv = null
    try {
      atv = $app.findRecordById('atividades', atividadeId)
    } catch (eAt) {
      return e.json(404, { ok: false, error: 'Atividade nao encontrada' })
    }

    // titulo: troca apenas o trecho "UC <algo>" pelo novo, preservando o resto
    var tituloAtual = String(atv.getString('titulo') || '')
    var novoTitulo = tituloAtual
    if (/UC\s+[0-9.\-]+/i.test(tituloAtual)) {
      // troca TODOS os trechos "UC <numero>" por um unico "UC <nova>".
      // Antes era .replace com regex global=false: um titulo que ja tinha
      // sido trocado ganhava outra UC no fim e virava
      // "Auto Leitura RGE - UC 4004280183 - UC 3.741.688.001-68 - UC ...".
      // Tira cada "UC <numero>" JUNTO com o separador que vem antes, senao
      // sobra traco solto: "Auto Leitura RGE - UC 1 - UC 2" viraria
      // "Auto Leitura RGE -  - " e depois "Auto Leitura RGE - - UC nova".
      var somenteUC = tituloAtual.replace(/\s*-\s*UC\s+[0-9.\-]+/gi, '').trim()
      somenteUC = somenteUC.replace(/UC\s+[0-9.\-]+/gi, '').trim()
      somenteUC = somenteUC.replace(/[\s-]+$/g, '').trim()
      novoTitulo = somenteUC ? somenteUC + ' - UC ' + ucNova : 'UC ' + ucNova
    } else if (tituloAtual) {
      novoTitulo = tituloAtual + ' - UC ' + ucNova
    }
    atv.set('titulo', novoTitulo.slice(0, 200))
    atv.set('numero_uc', ucNova)
    var desc = String(atv.getString('descricao') || '')
    if (desc && /UC\\s+[0-9.\\-]+/i.test(desc)) {
      atv.set('descricao', desc.replace(/UC\\s+[0-9.\\-]+/i, 'UC ' + ucNova))
    }
    $app.save(atv)
    alterados.push({ id: atv.id, titulo: atv.getString('titulo'), papel: 'atividade' })

    // filhas (e a mae, se esta for filha) tambem recebem o numero_uc novo
    var parentId = String(atv.getString('parent_id') || '')
    if (parentId) {
      try {
        var mae = $app.findRecordById('atividades', parentId)
        var tm = String(mae.getString('titulo') || '')
        if (/UC\\s+[0-9.\\-]+/i.test(tm))
          mae.set('titulo', tm.replace(/UC\\s+[0-9.\\-]+/i, 'UC ' + ucNova).slice(0, 200))
        mae.set('numero_uc', ucNova)
        $app.save(mae)
        alterados.push({ id: mae.id, titulo: mae.getString('titulo'), papel: 'mae' })
      } catch (eMae) {}
    }
    try {
      var filhas = $app.findRecordsByFilter(
        'atividades',
        'parent_id = "' + atv.id + '"',
        '',
        200,
        0,
      )
      for (var i = 0; i < filhas.length; i++) {
        filhas[i].set('numero_uc', ucNova)
        $app.save(filhas[i])
        alterados.push({ id: filhas[i].id, titulo: filhas[i].getString('titulo'), papel: 'filha' })
      }
    } catch (eF) {}

    return e.json(200, { ok: true, alterados: alterados })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// ---------------------------------------------------------------- criar atividade
// Cria uma atividade de registro de auto leitura (ou qualquer tipo).
// Aceita segredo do robo. Serve para gerar as atividades de registro quando
// o fluxo automatico nao criou (ex.: importacao, correcao manual).
routerAdd('POST', '/backend/v1/rge/atividade-criar', (e) => {
  try {
    var porSegredo = false
    try {
      var seg = $secrets.get('RGE_ROBO_SECRET') || ''
      if (seg && (e.request.header.get('X-Robo-Secret') || '') === seg) porSegredo = true
    } catch (eS) {}
    if (!porSegredo && (!e.auth || !e.auth.id))
      return e.json(401, { ok: false, error: 'Autenticação necessária' })

    var body = e.requestInfo().body || {}
    var clienteId = String(body.cliente_id || '')
    var titulo = String(body.titulo || '').slice(0, 200)
    var tipo = String(body.tipo || 'lembrete_auto_leitura').slice(0, 50)
    if (!clienteId) return e.json(400, { ok: false, error: 'Informe cliente_id' })
    if (!titulo) return e.json(400, { ok: false, error: 'Informe titulo' })

    var rec = new Record($app.findCollectionByNameOrId('atividades'))
    rec.set('cliente_id', clienteId)
    rec.set('titulo', titulo)
    rec.set('tipo', tipo)
    rec.set('descricao', String(body.descricao || '').slice(0, 5000))
    rec.set('status', String(body.status || 'pendente'))
    rec.set('data', String(body.data || new Date().toISOString()))
    if (body.data_leitura) rec.set('data_leitura', String(body.data_leitura))
    if (body.data_lembrete) rec.set('data_lembrete', String(body.data_lembrete))
    if (body.numero_uc) rec.set('numero_uc', String(body.numero_uc).slice(0, 40))
    if (body.parent_id) rec.set('parent_id', String(body.parent_id))
    if (body.usina_id) rec.set('usina_id', String(body.usina_id))
    if (body.responsavel_nome)
      rec.set('responsavel_nome', String(body.responsavel_nome).slice(0, 120))
    if (body.autor) rec.set('autor', String(body.autor).slice(0, 120))
    $app.save(rec)

    return e.json(200, { ok: true, atividade_id: rec.id, titulo: rec.getString('titulo') })
  } catch (err) {
    return e.json(400, { ok: false, error: String(err).slice(0, 400) })
  }
})

// ---------------------------------------------------------------- consulta na tela
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

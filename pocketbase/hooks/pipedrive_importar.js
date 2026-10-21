// pocketbase/hooks/pipedrive_importar.js
// Importação controlada de anotações do Pipedrive para o histórico da ficha do cliente
// (coleção `atividades`, tipo 'anotacao'). Uso interno de operações, protegido por secret.
// Body JSON: { acao: 'consultar' | 'importar' | 'remover', registros: [...], atualizar?: bool, prefixo?: string }
// registro: { chave, nomes: [..], data (ISO), autor, titulo, descricao }
routerAdd('POST', '/backend/v1/pipedrive/importar', (e) => {
  try {
    const esperado = $secrets.get('PIPEDRIVE_IMPORT_SECRET') || ''
    const info = e.requestInfo()
    const hdrs = info.headers || {}
    let recebido = ''
    for (const k in hdrs) {
      if (String(k).toLowerCase() === 'x-import-secret') recebido = String(hdrs[k])
    }
    const body = info.body || {}
    if (!recebido && body && body._secret) recebido = String(body._secret)
    if (!esperado || !recebido || String(recebido) !== esperado) {
      const vistos = []
      for (const k2 in hdrs) {
        vistos.push(String(k2))
      }
      return e.json(401, {
        erro: 'nao autorizado',
        tem_secret_configurado: esperado !== '',
        headers_recebidos: vistos,
      })
    }
    const acao = String(body.acao || 'consultar')
    const registros = Array.isArray(body.registros) ? body.registros : []
    const atualizar = body.atualizar === true

    // ---------- remover: desfaz importação por prefixo de chave_importacao ----------
    if (acao === 'remover') {
      const prefixo = String(body.prefixo || 'pipedrive:').replace(/["\\]/g, '')
      const existentes = $app.findRecordsByFilter(
        'atividades',
        'chave_importacao ~ "' + prefixo + '"',
        '',
        2000,
        0,
      )
      let apagados = 0
      for (const r of existentes) {
        if (String(r.getString('chave_importacao')).indexOf(prefixo) === 0) {
          $app.delete(r)
          apagados++
        }
      }
      $app.logger().info('pipedrive_importar remover', 'prefixo', prefixo, 'apagados', apagados)
      return e.json(200, { acao: 'remover', apagados: apagados })
    }

    if (registros.length > 500) {
      return e.json(422, { erro: 'maximo de 500 registros por chamada' })
    }

    // ---------- normalização de nomes (inline: regra de escopo dos hooks) ----------
    const norm = function (s) {
      let t = String(s == null ? '' : s).toLowerCase()
      const acentos = 'aaaaeeeeiiiiooooouuuucn'
      const comAcento =
        '\u00e1\u00e0\u00e2\u00e3\u00e4\u00e9\u00e8\u00ea\u00eb\u00ed\u00ec\u00ee\u00ef\u00f3\u00f2\u00f4\u00f5\u00f6\u00fa\u00f9\u00fb\u00fc\u00e7\u00f1'
      for (let i = 0; i < comAcento.length; i++) {
        const de = comAcento.charAt(i)
        while (t.indexOf(de) >= 0) t = t.replace(de, acentos.charAt(i))
      }
      t = t.replace(/[^a-z0-9]+/g, ' ')
      const sufixos = [
        'ltda',
        'me',
        'epp',
        'eireli',
        'sa',
        'cia',
        'comercio',
        'industria',
        'servicos',
        'servico',
        'grupo',
        'negocio',
        'negocios',
        'projeto',
        'projetos',
        'usina',
        'casa',
      ]
      const partes = t.split(' ')
      const limpas = []
      for (const p of partes) {
        if (p && sufixos.indexOf(p) < 0) limpas.push(p)
      }
      return limpas.join(' ').replace(/\s+/g, ' ').trim()
    }

    // ---------- índice de clientes (nome / razão social / nome fantasia / contato) ----------
    const clientes = $app.findRecordsByFilter('clientes', 'id != ""', '', 20000, 0)
    const idx = {}
    for (const c of clientes) {
      const nomesCli = [
        c.getString('nome'),
        c.getString('razao_social'),
        c.getString('nome_fantasia'),
        c.getString('contato'),
      ]
      for (const nc of nomesCli) {
        const k = norm(nc)
        if (k.length < 4) continue
        if (!idx[k]) idx[k] = []
        let repetido = false
        for (const item of idx[k]) {
          if (item.id === c.id) repetido = true
        }
        if (!repetido) idx[k].push({ id: c.id, nome: c.getString('nome') })
      }
    }

    const achar = function (nomes) {
      for (const nome of nomes) {
        const k = norm(nome)
        if (k.length >= 4 && idx[k] && idx[k].length) {
          return { id: idx[k][0].id, nome: idx[k][0].nome, homonimos: idx[k].length }
        }
      }
      return null
    }

    const sugestoes = function (nomes) {
      const saida = []
      for (const nome of nomes) {
        const k = norm(nome)
        if (k.length < 6) continue
        for (const chave in idx) {
          if (saida.length >= 3) break
          if (chave.indexOf(k) === 0 || k.indexOf(chave) === 0) {
            saida.push({ id: idx[chave][0].id, nome: idx[chave][0].nome })
          }
        }
      }
      return saida
    }

    // ---------- consultar: dry-run de pareamento (não escreve nada) ----------
    if (acao === 'consultar') {
      let sonda = 'ok'
      try {
        const colSonda = $app.findCollectionByNameOrId('atividades')
        const recSonda = new Record(colSonda)
        recSonda.set('titulo', 'sonda')
      } catch (errSonda) {
        sonda = 'falhou: ' + String(errSonda && errSonda.message ? errSonda.message : errSonda)
      }
      const casados = []
      const naoCasados = []
      for (const reg of registros) {
        const alvo = achar(reg.nomes || [])
        if (alvo) {
          casados.push({
            chave: reg.chave,
            nome_pipedrive: (reg.nomes || [])[0],
            cliente_id: alvo.id,
            cliente_nome: alvo.nome,
            homonimos: alvo.homonimos,
          })
        } else {
          naoCasados.push({
            chave: reg.chave,
            nome_pipedrive: (reg.nomes || [])[0],
            sugestoes: sugestoes(reg.nomes || []),
          })
        }
      }
      return e.json(200, {
        acao: 'consultar',
        total: registros.length,
        clientes_indexados: clientes.length,
        sonda_construtor_registro: sonda,
        casados: casados,
        nao_casados: naoCasados,
      })
    }

    // ---------- importar: insere (ou atualiza) os comentários ----------
    if (acao === 'importar') {
      const col = $app.findCollectionByNameOrId('atividades')
      let inseridos = 0
      let atualizados = 0
      let pulados = 0
      const erros = []
      const naoCasados = []
      const exemplos = []
      for (const reg of registros) {
        try {
          const chave = String(reg.chave || '')
          if (!chave) {
            erros.push({ chave: '', erro: 'registro sem chave' })
            continue
          }
          const alvo = achar(reg.nomes || [])
          if (!alvo) {
            naoCasados.push({
              chave: chave,
              nome_pipedrive: (reg.nomes || [])[0],
              sugestoes: sugestoes(reg.nomes || []),
            })
            continue
          }
          let existente = null
          try {
            existente = $app.findFirstRecordByData('atividades', 'chave_importacao', chave)
          } catch (errBusca) {
            existente = null
          }
          if (existente && !atualizar) {
            pulados++
            continue
          }
          let rec = existente
          if (!rec) rec = new Record(col)
          rec.set('cliente_id', alvo.id)
          rec.set('tipo', 'anotacao')
          rec.set('titulo', String(reg.titulo || 'Anotacao Pipedrive').slice(0, 300))
          rec.set('descricao', String(reg.descricao || ''))
          rec.set('data', String(reg.data || new Date().toISOString()))
          rec.set('autor', String(reg.autor || 'Pipedrive'))
          rec.set('status', 'concluida')
          rec.set('origem', 'pipedrive')
          rec.set('chave_importacao', chave)
          rec.set('registro_original_id', chave)
          $app.save(rec)
          if (existente) {
            atualizados++
          } else {
            inseridos++
          }
          if (exemplos.length < 5) {
            exemplos.push({
              chave: chave,
              cliente_nome: alvo.nome,
              titulo: String(reg.titulo || ''),
            })
          }
        } catch (errReg) {
          erros.push({
            chave: String(reg.chave || ''),
            erro: String(errReg && errReg.message ? errReg.message : errReg),
          })
        }
      }
      $app
        .logger()
        .info(
          'pipedrive_importar importar',
          'total',
          registros.length,
          'inseridos',
          inseridos,
          'pulados',
          pulados,
          'erros',
          erros.length,
        )
      return e.json(200, {
        acao: 'importar',
        total: registros.length,
        inseridos: inseridos,
        atualizados: atualizados,
        pulados: pulados,
        nao_casados: naoCasados,
        erros: erros,
        exemplos: exemplos,
      })
    }

    return e.json(400, { erro: 'acao desconhecida: ' + acao })
  } catch (err) {
    $app
      .logger()
      .error('pipedrive_importar falhou', 'erro', String(err && err.message ? err.message : err))
    return e.json(500, {
      erro: 'falha interna',
      detalhe: String(err && err.message ? err.message : err),
    })
  }
})

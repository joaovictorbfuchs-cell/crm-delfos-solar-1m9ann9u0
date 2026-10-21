// pocketbase/hooks/pipedrive_importar.js
// Importação controlada de anotações do Pipedrive para o histórico da ficha do cliente
// (coleção `atividades`, tipo 'anotacao'). Uso interno de operações, protegido por secret.
// NUNCA cria clientes: só grava em fichas já existentes. Sem pareamento -> relatório.
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
        5000,
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
      // remove e-mails, urls e o que estiver entre parênteses (nomes de contato)
      t = t.replace(/[a-z0-9._%+-]+@[a-z0-9.-]+/g, ' ')
      t = t.replace(/(www\.|https?:)[^ ]*/g, ' ')
      t = t.replace(/\([^)]*\)/g, ' ')
      t = t.replace(/[^a-z0-9]+/g, ' ')
      const sufixos = [
        'ltda',
        'me',
        'epp',
        'eireli',
        'sa',
        'cia',
        'comercio',
        'com',
        'industria',
        'ind',
        'servicos',
        'servico',
        'grupo',
        'negocio',
        'negocios',
        'projeto',
        'projetos',
        'usina',
        'casa',
        'sede',
        'novo',
        'nova',
      ]
      const partes = t.split(' ')
      const limpas = []
      for (const p of partes) {
        if (!p) continue
        if (/^[0-9]+$/.test(p)) continue
        if (p.length < 2) continue
        if (sufixos.indexOf(p) >= 0) continue
        limpas.push(p)
      }
      return limpas.join(' ').replace(/\s+/g, ' ').trim()
    }

    // distância de edição (Levenshtein) curta, para grafias próximas
    const lev = function (a, b) {
      if (a === b) return 0
      const m = a.length
      const n = b.length
      if (Math.abs(m - n) > 2) return 9
      let ant = []
      for (let j = 0; j <= n; j++) ant.push(j)
      for (let i = 1; i <= m; i++) {
        const atual = [i]
        for (let j = 1; j <= n; j++) {
          const custo = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1
          let v = ant[j] + 1
          if (atual[j - 1] + 1 < v) v = atual[j - 1] + 1
          if (ant[j - 1] + custo < v) v = ant[j - 1] + custo
          atual.push(v)
        }
        ant = atual
      }
      return ant[n]
    }

    // ---------- índice de clientes (nome / razão social / nome fantasia / contato) ----------
    const clientes = $app.findRecordsByFilter('clientes', 'id != ""', '', 20000, 0)
    const idx = {}
    const porPrimeira = {}
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
        if (repetido) continue
        const entrada = { id: c.id, nome: c.getString('nome'), chave: k }
        idx[k].push(entrada)
        const pk = k.split(' ')
        const primeira = pk[0]
        const ultima = pk[pk.length - 1]
        if (!porPrimeira[primeira]) porPrimeira[primeira] = []
        porPrimeira[primeira].push({ id: entrada.id, nome: entrada.nome, chave: k, ultima: ultima })
      }
    }

    // pareamento seguro: só casa quando o alvo é ÚNICO. Homônimo/ambíguo -> não casa.
    const achar = function (nomes) {
      // 1) nome normalizado idêntico, cliente único
      for (const nome of nomes) {
        const k = norm(nome)
        if (k.length >= 4 && idx[k] && idx[k].length === 1) {
          return { id: idx[k][0].id, nome: idx[k][0].nome, modo: 'exato' }
        }
      }
      // 2) prefixo por palavra, cliente único ("Mirian" -> "Mirian Cararo"; "X - Usina 300" -> "X")
      for (const nome of nomes) {
        const k = norm(nome)
        if (k.length < 4) continue
        const primeira = k.split(' ')[0]
        const lista = porPrimeira[primeira] || []
        let achou = null
        let repetido = false
        for (const ent of lista) {
          let casa = false
          if (ent.chave.indexOf(k) === 0 && ent.chave.charAt(k.length) === ' ') casa = true
          if (k.indexOf(ent.chave) === 0 && k.charAt(ent.chave.length) === ' ') casa = true
          if (!casa) continue
          if (achou && achou.id !== ent.id) repetido = true
          if (!achou) achou = { id: ent.id, nome: ent.nome }
        }
        if (achou && !repetido) return { id: achou.id, nome: achou.nome, modo: 'prefixo' }
      }
      // 3) primeiro nome igual + último nome com grafia próxima (dist <= 2), cliente único
      for (const nome of nomes) {
        const k = norm(nome)
        const pk = k.split(' ')
        if (pk.length < 2) continue
        const primeira = pk[0]
        const ultima = pk[pk.length - 1]
        if (primeira.length < 3 || ultima.length < 5) continue
        const lista = porPrimeira[primeira] || []
        let achou = null
        let repetido = false
        for (const ent of lista) {
          if (!ent.ultima || ent.ultima.length < 5) continue
          const d = lev(ultima, ent.ultima)
          if (d < 1 || d > 2) continue
          if (achou && achou.id !== ent.id) repetido = true
          if (!achou) achou = { id: ent.id, nome: ent.nome }
        }
        if (achou && !repetido) return { id: achou.id, nome: achou.nome, modo: 'nome_proximo' }
      }
      return null
    }

    const sugestoes = function (nomes) {
      const saida = []
      for (const nome of nomes) {
        const k = norm(nome)
        if (k.length < 6) continue
        const primeira = k.split(' ')[0]
        const lista = porPrimeira[primeira] || []
        for (const ent of lista) {
          if (saida.length >= 3) break
          if (ent.chave === k) continue
          if (ent.chave.indexOf(k) === 0 || k.indexOf(ent.chave) === 0) {
            let jaTem = false
            for (const s of saida) {
              if (s.id === ent.id) jaTem = true
            }
            if (!jaTem) saida.push({ id: ent.id, nome: ent.nome })
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
            modo: alvo.modo,
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

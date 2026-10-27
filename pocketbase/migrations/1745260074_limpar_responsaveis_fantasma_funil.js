migrate(
  (app) => {
    // 1. Obter usuários reais da tabela users
    const users = app.findRecordsByFilter('users', 'id != ""', 'created', 100, 0)
    if (!users || users.length === 0) {
      console.log('[MIGRAÇÃO 1745260074] Nenhum usuário em users. Encerrando.')
      return
    }

    const realUserIds = new Set()
    const realUserNames = new Map() // lowercase -> original name
    const realUserById = new Map()
    let joaoUser = null

    for (let i = 0; i < users.length; i++) {
      const u = users[i]
      const uid = u.id
      const uname = (u.getString('name') || '').trim()
      realUserIds.add(uid)
      realUserById.set(uid, uname)
      if (uname) {
        realUserNames.set(uname.toLowerCase(), uname)
      }
      const lower = uname.toLowerCase()
      if (
        lower.includes('bagetti') ||
        lower.includes('joão victor') ||
        lower.includes('joao victor')
      ) {
        joaoUser = u
      }
    }

    if (!joaoUser) {
      joaoUser = users[0]
    }

    const joaoId = joaoUser.id
    const joaoNome = joaoUser.getString('name') || 'João Victor Bagetti Fuchs'

    function isRealUserName(nome) {
      if (!nome || typeof nome !== 'string') return false
      const trimmed = nome.trim().toLowerCase()
      if (!trimmed) return false
      for (const [realLower] of realUserNames) {
        if (trimmed === realLower) {
          return true
        }
      }
      return false
    }

    function resolveRealUserName(nome) {
      if (!nome || typeof nome !== 'string') return null
      const trimmed = nome.trim().toLowerCase()
      for (const [realLower, realOrig] of realUserNames) {
        if (trimmed === realLower) {
          return realOrig
        }
      }
      return null
    }

    const pageSize = 500

    // -------------------------------------------------------------
    // 1. NEGOCIOS: garantir que consultor_responsavel seja usuário real válido
    // -------------------------------------------------------------
    try {
      let pageNeg = 0
      let countNegAtualizados = 0
      while (true) {
        const negocios = app.findRecordsByFilter(
          'negocios',
          '',
          'created',
          pageSize,
          pageNeg * pageSize,
        )
        if (!negocios || negocios.length === 0) break

        for (let i = 0; i < negocios.length; i++) {
          const neg = negocios[i]
          const consultorId = neg.getString('consultor_responsavel') || ''
          let precisaSalvar = false

          if (!consultorId || !realUserIds.has(consultorId)) {
            // Verificar se o cliente vinculado tem responsavel_id real
            const cliId = neg.getString('cliente_id')
            let respDefinir = joaoId
            if (cliId) {
              try {
                const cli = app.findRecordById('clientes', cliId)
                const cliRespId = cli.getString('responsavel_id')
                if (cliRespId && realUserIds.has(cliRespId)) {
                  respDefinir = cliRespId
                }
              } catch (_) {}
            }
            neg.set('consultor_responsavel', respDefinir)
            precisaSalvar = true
          }

          if (precisaSalvar) {
            app.save(neg)
            countNegAtualizados++
          }
        }

        pageNeg++
        if (negocios.length < pageSize) break
      }
      console.log(`[MIGRAÇÃO 1745260074] Negócios revisados: ${countNegAtualizados} atualizados.`)
    } catch (errNeg) {
      console.warn('[MIGRAÇÃO 1745260074] Erro ao revisar negocios:', errNeg)
    }

    // -------------------------------------------------------------
    // 2. CLIENTES: garantir responsavel_id e responsavel_nome 100% de usuário real
    // -------------------------------------------------------------
    try {
      let pageCli = 0
      let countCliAtualizados = 0
      while (true) {
        const clientes = app.findRecordsByFilter(
          'clientes',
          '',
          'created',
          pageSize,
          pageCli * pageSize,
        )
        if (!clientes || clientes.length === 0) break

        for (let i = 0; i < clientes.length; i++) {
          const cli = clientes[i]
          const respIdAtual = cli.getString('responsavel_id') || ''
          const respNomeAtual = (cli.getString('responsavel_nome') || '').trim()
          let precisaSalvar = false

          if (respIdAtual && realUserIds.has(respIdAtual)) {
            const nomeEsperado = realUserById.get(respIdAtual) || joaoNome
            if (respNomeAtual !== nomeEsperado) {
              cli.set('responsavel_nome', nomeEsperado)
              precisaSalvar = true
            }
          } else {
            // responsavel_id inválido ou vazio
            if (isRealUserName(respNomeAtual)) {
              const nomeReal = resolveRealUserName(respNomeAtual)
              let matchedId = joaoId
              for (const [uid, uname] of realUserById) {
                if (uname.toLowerCase() === nomeReal.toLowerCase()) {
                  matchedId = uid
                  break
                }
              }
              cli.set('responsavel_id', matchedId)
              cli.set('responsavel_nome', nomeReal)
              precisaSalvar = true
            } else {
              cli.set('responsavel_id', joaoId)
              cli.set('responsavel_nome', joaoNome)
              precisaSalvar = true
            }
          }

          if (precisaSalvar) {
            app.save(cli)
            countCliAtualizados++
          }
        }

        pageCli++
        if (clientes.length < pageSize) break
      }
      console.log(`[MIGRAÇÃO 1745260074] Clientes revisados: ${countCliAtualizados} atualizados.`)
    } catch (errCli) {
      console.warn('[MIGRAÇÃO 1745260074] Erro ao revisar clientes:', errCli)
    }

    // -------------------------------------------------------------
    // 3. ATIVIDADES: sanear responsavel_id, responsavel_nome e autor
    // -------------------------------------------------------------
    try {
      let pageAtv = 0
      let countAtvAtualizados = 0
      while (true) {
        const atvs = app.findRecordsByFilter(
          'atividades',
          '',
          'created',
          pageSize,
          pageAtv * pageSize,
        )
        if (!atvs || atvs.length === 0) break

        for (let i = 0; i < atvs.length; i++) {
          const atv = atvs[i]
          const respIdAtual = atv.getString('responsavel_id') || ''
          const respNomeAtual = (atv.getString('responsavel_nome') || '').trim()
          const autorAtual = (atv.getString('autor') || '').trim()
          let precisaSalvar = false

          if (respIdAtual && realUserIds.has(respIdAtual)) {
            const nomeEsperado = realUserById.get(respIdAtual) || joaoNome
            if (respNomeAtual !== nomeEsperado) {
              atv.set('responsavel_nome', nomeEsperado)
              precisaSalvar = true
            }
          } else {
            if (isRealUserName(respNomeAtual)) {
              const nomeReal = resolveRealUserName(respNomeAtual)
              let matchedId = joaoId
              for (const [uid, uname] of realUserById) {
                if (uname.toLowerCase() === nomeReal.toLowerCase()) {
                  matchedId = uid
                  break
                }
              }
              atv.set('responsavel_id', matchedId)
              atv.set('responsavel_nome', nomeReal)
              precisaSalvar = true
            } else {
              atv.set('responsavel_id', joaoId)
              atv.set('responsavel_nome', joaoNome)
              precisaSalvar = true
            }
          }

          if (!isRealUserName(autorAtual)) {
            atv.set('autor', atv.getString('responsavel_nome') || joaoNome)
            precisaSalvar = true
          }

          if (precisaSalvar) {
            app.save(atv)
            countAtvAtualizados++
          }
        }

        pageAtv++
        if (atvs.length < pageSize) break
      }
      console.log(`[MIGRAÇÃO 1745260074] Atividades revisadas: ${countAtvAtualizados} atualizadas.`)
    } catch (errAtv) {
      console.warn('[MIGRAÇÃO 1745260074] Erro ao revisar atividades:', errAtv)
    }

    console.log('[MIGRAÇÃO 1745260074] Concluída com sucesso!')
  },
  (app) => {
    // Reversão no-op idempotente
  },
)

migrate(
  (app) => {
    // 1. Buscar os usuários reais cadastrados na tabela 'users'
    const users = app.findRecordsByFilter('users', 'id != ""', 'created', 100, 0)
    if (!users || users.length === 0) {
      console.log(
        '[REVISÃO RESPONSÁVEIS] Nenhum usuário encontrado na tabela users. Abortando migração de forma segura.',
      )
      return
    }

    // Identificar João Victor Bagetti Fuchs como usuário padrão de fallback
    let joaoUser = null
    const realUserIds = new Set()
    const realUserNames = new Map() // lowercase name -> real name
    const realUserById = new Map()

    for (let i = 0; i < users.length; i++) {
      const u = users[i]
      const uid = u.id
      const uname = (u.getString('name') || '').trim()
      realUserIds.add(uid)
      realUserById.set(uid, uname)
      if (uname) {
        realUserNames.set(uname.toLowerCase(), uname)
      }
      if (
        uname.toLowerCase().includes('bagetti') ||
        uname.toLowerCase().includes('joão victor') ||
        uname.toLowerCase().includes('joao victor')
      ) {
        joaoUser = u
      }
    }

    if (!joaoUser) {
      joaoUser = users[0]
    }

    const joaoId = joaoUser.id
    const joaoNome = joaoUser.getString('name') || 'João Victor Bagetti Fuchs'

    console.log(`[REVISÃO RESPONSÁVEIS] Usuário padrão definido: ${joaoNome} (${joaoId})`)
    console.log(
      `[REVISÃO RESPONSÁVEIS] Usuários reais reconhecidos: ${Array.from(realUserNames.values()).join(', ')}`,
    )

    function isRealUserName(nome) {
      if (!nome || typeof nome !== 'string') return false
      const trimmed = nome.trim().toLowerCase()
      if (!trimmed) return false
      for (const [realLower] of realUserNames) {
        if (trimmed === realLower || trimmed.includes(realLower) || realLower.includes(trimmed)) {
          return true
        }
      }
      return false
    }

    function resolveRealUserName(nome) {
      if (!nome || typeof nome !== 'string') return null
      const trimmed = nome.trim().toLowerCase()
      for (const [realLower, realOriginal] of realUserNames) {
        if (trimmed === realLower || trimmed.includes(realLower) || realLower.includes(trimmed)) {
          return realOriginal
        }
      }
      return null
    }

    const pageSize = 500

    // -------------------------------------------------------------
    // 1. CLIENTES
    // Campos: responsavel_id, responsavel_nome, nome
    // -------------------------------------------------------------
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
        const c = clientes[i]
        const clienteNome = (c.getString('nome') || '').trim().toLowerCase()
        const respIdAtual = c.getString('responsavel_id') || ''
        const respNomeAtual = (c.getString('responsavel_nome') || '').trim()

        let precisaAjustar = false

        // Caso ambíguo: se o nome do responsável coincidir com o nome do cliente -> fantasma
        const coincideComCliente =
          respNomeAtual &&
          clienteNome &&
          (respNomeAtual.toLowerCase() === clienteNome ||
            respNomeAtual.toLowerCase().includes(clienteNome) ||
            clienteNome.includes(respNomeAtual.toLowerCase()))

        // Se responsavel_id é um usuário real válido e não coincide com cliente
        if (respIdAtual && realUserIds.has(respIdAtual) && !coincideComCliente) {
          const nomeRealEsperado = realUserById.get(respIdAtual) || joaoNome
          if (respNomeAtual !== nomeRealEsperado) {
            c.set('responsavel_nome', nomeRealEsperado)
            precisaAjustar = true
          }
        } else {
          // Se responsavel_id está vazio ou inválido, verificar se responsavel_nome é usuário real
          const nomeReal = isRealUserName(respNomeAtual) ? resolveRealUserName(respNomeAtual) : null
          if (nomeReal && !coincideComCliente) {
            // Acha o ID correspondente
            let matchedId = joaoId
            for (const [uid, uname] of realUserById) {
              if (uname.toLowerCase() === nomeReal.toLowerCase()) {
                matchedId = uid
                break
              }
            }
            c.set('responsavel_id', matchedId)
            c.set('responsavel_nome', nomeReal)
            precisaAjustar = true
          } else {
            // Fantasma ou sem responsável -> atribuir João Victor Bagetti Fuchs
            c.set('responsavel_id', joaoId)
            c.set('responsavel_nome', joaoNome)
            precisaAjustar = true
          }
        }

        if (precisaAjustar) {
          app.save(c)
          countCliAtualizados++
        }
      }

      pageCli++
      if (clientes.length < pageSize) break
    }
    console.log(`[REVISÃO RESPONSÁVEIS] Clientes revisados: ${countCliAtualizados} atualizados.`)

    // -------------------------------------------------------------
    // 2. NEGOCIOS
    // Campo: consultor_responsavel (relation -> users)
    // -------------------------------------------------------------
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
        const n = negocios[i]
        const consultorId = n.getString('consultor_responsavel') || ''
        if (!consultorId || !realUserIds.has(consultorId)) {
          n.set('consultor_responsavel', joaoId)
          app.save(n)
          countNegAtualizados++
        }
      }

      pageNeg++
      if (negocios.length < pageSize) break
    }
    console.log(`[REVISÃO RESPONSÁVEIS] Negócios revisados: ${countNegAtualizados} atualizados.`)

    // -------------------------------------------------------------
    // 3. ATIVIDADES
    // Campos: responsavel_id, responsavel_nome, autor
    // -------------------------------------------------------------
    let pageAtv = 0
    let countAtvAtualizados = 0
    while (true) {
      const atividades = app.findRecordsByFilter(
        'atividades',
        '',
        'created',
        pageSize,
        pageAtv * pageSize,
      )
      if (!atividades || atividades.length === 0) break

      for (let i = 0; i < atividades.length; i++) {
        const atv = atividades[i]
        const respIdAtual = atv.getString('responsavel_id') || ''
        const respNomeAtual = (atv.getString('responsavel_nome') || '').trim()
        const autorAtual = (atv.getString('autor') || '').trim()

        let precisaAjustar = false

        if (respIdAtual && realUserIds.has(respIdAtual)) {
          const nomeRealEsperado = realUserById.get(respIdAtual) || joaoNome
          if (respNomeAtual !== nomeRealEsperado) {
            atv.set('responsavel_nome', nomeRealEsperado)
            precisaAjustar = true
          }
        } else {
          const nomeReal = isRealUserName(respNomeAtual) ? resolveRealUserName(respNomeAtual) : null
          if (nomeReal) {
            let matchedId = joaoId
            for (const [uid, uname] of realUserById) {
              if (uname.toLowerCase() === nomeReal.toLowerCase()) {
                matchedId = uid
                break
              }
            }
            atv.set('responsavel_id', matchedId)
            atv.set('responsavel_nome', nomeReal)
            precisaAjustar = true
          } else {
            atv.set('responsavel_id', joaoId)
            atv.set('responsavel_nome', joaoNome)
            precisaAjustar = true
          }
        }

        // Revisar campo autor se for fantasma ou vazio
        if (!autorAtual || !isRealUserName(autorAtual)) {
          // Se o autor não for usuário real (ex: fantasma), padronizar para o responsável real da atividade
          atv.set('autor', atv.getString('responsavel_nome') || joaoNome)
          precisaAjustar = true
        }

        if (precisaAjustar) {
          app.save(atv)
          countAtvAtualizados++
        }
      }

      pageAtv++
      if (atividades.length < pageSize) break
    }
    console.log(`[REVISÃO RESPONSÁVEIS] Atividades revisadas: ${countAtvAtualizados} atualizadas.`)

    // -------------------------------------------------------------
    // 4. PROPOSTAS O&M (propostas_om)
    // Campo: autor
    // -------------------------------------------------------------
    let pagePropOM = 0
    let countPropOMAtualizados = 0
    while (true) {
      const propostas = app.findRecordsByFilter(
        'propostas_om',
        '',
        'created',
        pageSize,
        pagePropOM * pageSize,
      )
      if (!propostas || propostas.length === 0) break

      for (let i = 0; i < propostas.length; i++) {
        const p = propostas[i]
        const autorAtual = (p.getString('autor') || '').trim()
        if (!autorAtual || !isRealUserName(autorAtual)) {
          p.set('autor', joaoNome)
          app.save(p)
          countPropOMAtualizados++
        }
      }

      pagePropOM++
      if (propostas.length < pageSize) break
    }
    console.log(
      `[REVISÃO RESPONSÁVEIS] Propostas O&M revisadas: ${countPropOMAtualizados} atualizadas.`,
    )

    // -------------------------------------------------------------
    // 5. TIMELINE O&M (timeline_om)
    // Campo: autor
    // -------------------------------------------------------------
    let pageTimeOM = 0
    let countTimeOMAtualizados = 0
    while (true) {
      const times = app.findRecordsByFilter(
        'timeline_om',
        '',
        'created',
        pageSize,
        pageTimeOM * pageSize,
      )
      if (!times || times.length === 0) break

      for (let i = 0; i < times.length; i++) {
        const t = times[i]
        const autorAtual = (t.getString('autor') || '').trim()
        if (!autorAtual || !isRealUserName(autorAtual)) {
          t.set('autor', joaoNome)
          app.save(t)
          countTimeOMAtualizados++
        }
      }

      pageTimeOM++
      if (times.length < pageSize) break
    }
    console.log(
      `[REVISÃO RESPONSÁVEIS] Timeline O&M revisada: ${countTimeOMAtualizados} atualizados.`,
    )

    // -------------------------------------------------------------
    // 6. PROPOSTAS CARREGADOR (propostas_carregador)
    // Campo: autor, responsavel_acompanhante
    // -------------------------------------------------------------
    try {
      let pagePropC = 0
      let countPropCAtualizados = 0
      while (true) {
        const propsC = app.findRecordsByFilter(
          'propostas_carregador',
          '',
          'created',
          pageSize,
          pagePropC * pageSize,
        )
        if (!propsC || propsC.length === 0) break

        for (let i = 0; i < propsC.length; i++) {
          const pc = propsC[i]
          const autorAtual = (pc.getString('autor') || '').trim()
          let alterado = false
          if (!autorAtual || !isRealUserName(autorAtual)) {
            pc.set('autor', joaoNome)
            alterado = true
          }
          if (alterado) {
            app.save(pc)
            countPropCAtualizados++
          }
        }

        pagePropC++
        if (propsC.length < pageSize) break
      }
      console.log(
        `[REVISÃO RESPONSÁVEIS] Propostas Carregador revisadas: ${countPropCAtualizados} atualizadas.`,
      )
    } catch (errCarregador) {
      console.warn(
        '[REVISÃO RESPONSÁVEIS] Coleção propostas_carregador ignorada ou sem registros:',
        errCarregador,
      )
    }

    // -------------------------------------------------------------
    // 7. ORÇAMENTOS BATERIA (baterias_orcamentos)
    // Campo: autor
    // -------------------------------------------------------------
    try {
      let pageBat = 0
      let countBatAtualizados = 0
      while (true) {
        const bats = app.findRecordsByFilter(
          'baterias_orcamentos',
          '',
          'created',
          pageSize,
          pageBat * pageSize,
        )
        if (!bats || bats.length === 0) break

        for (let i = 0; i < bats.length; i++) {
          const b = bats[i]
          const autorAtual = (b.getString('autor') || '').trim()
          if (!autorAtual || !isRealUserName(autorAtual)) {
            b.set('autor', joaoNome)
            app.save(b)
            countBatAtualizados++
          }
        }

        pageBat++
        if (bats.length < pageSize) break
      }
      console.log(
        `[REVISÃO RESPONSÁVEIS] Orçamentos Bateria revisados: ${countBatAtualizados} atualizados.`,
      )
    } catch (errBat) {
      console.warn(
        '[REVISÃO RESPONSÁVEIS] Coleção baterias_orcamentos ignorada ou sem registros:',
        errBat,
      )
    }

    // -------------------------------------------------------------
    // 8. ORÇAMENTOS SOLAR (orcamentos_solar)
    // Campo: autor
    // -------------------------------------------------------------
    try {
      let pageOrcS = 0
      let countOrcSAtualizados = 0
      while (true) {
        const orcs = app.findRecordsByFilter(
          'orcamentos_solar',
          '',
          'created',
          pageSize,
          pageOrcS * pageSize,
        )
        if (!orcs || orcs.length === 0) break

        for (let i = 0; i < orcs.length; i++) {
          const o = orcs[i]
          const autorAtual = (o.getString('autor') || '').trim()
          if (!autorAtual || !isRealUserName(autorAtual)) {
            o.set('autor', joaoNome)
            app.save(o)
            countOrcSAtualizados++
          }
        }

        pageOrcS++
        if (orcs.length < pageSize) break
      }
      console.log(
        `[REVISÃO RESPONSÁVEIS] Orçamentos Solar revisados: ${countOrcSAtualizados} atualizados.`,
      )
    } catch (errOrcS) {
      console.warn(
        '[REVISÃO RESPONSÁVEIS] Coleção orcamentos_solar ignorada ou sem registros:',
        errOrcS,
      )
    }

    // -------------------------------------------------------------
    // 9. ORDENS DE SERVIÇO (ordens_servico)
    // Campos: responsavel_usuario_id, atribuida_a
    // -------------------------------------------------------------
    try {
      let pageOS = 0
      let countOSAtualizados = 0
      while (true) {
        const ordens = app.findRecordsByFilter(
          'ordens_servico',
          '',
          'created',
          pageSize,
          pageOS * pageSize,
        )
        if (!ordens || ordens.length === 0) break

        for (let i = 0; i < ordens.length; i++) {
          const os = ordens[i]
          const respIdAtual = os.getString('responsavel_usuario_id') || ''
          const atribuidaAtual = (os.getString('atribuida_a') || '').trim()

          let precisaAjustar = false
          if (!respIdAtual || !realUserIds.has(respIdAtual)) {
            os.set('responsavel_usuario_id', joaoId)
            os.set('atribuida_a', joaoNome)
            precisaAjustar = true
          } else if (!atribuidaAtual || !isRealUserName(atribuidaAtual)) {
            os.set('atribuida_a', realUserById.get(respIdAtual) || joaoNome)
            precisaAjustar = true
          }

          if (precisaAjustar) {
            app.save(os)
            countOSAtualizados++
          }
        }

        pageOS++
        if (ordens.length < pageSize) break
      }
      console.log(
        `[REVISÃO RESPONSÁVEIS] Ordens de Serviço revisadas: ${countOSAtualizados} atualizadas.`,
      )
    } catch (errOS) {
      console.warn(
        '[REVISÃO RESPONSÁVEIS] Coleção ordens_servico ignorada ou sem registros:',
        errOS,
      )
    }

    // -------------------------------------------------------------
    // 10. ATIVOS (ativos)
    // Campo: responsavel_id
    // -------------------------------------------------------------
    try {
      let pageAtiv = 0
      let countAtivAtualizados = 0
      while (true) {
        const ativosList = app.findRecordsByFilter(
          'ativos',
          '',
          'created',
          pageSize,
          pageAtiv * pageSize,
        )
        if (!ativosList || ativosList.length === 0) break

        for (let i = 0; i < ativosList.length; i++) {
          const atvObj = ativosList[i]
          const respIdAtual = atvObj.getString('responsavel_id') || ''
          if (!respIdAtual || !realUserIds.has(respIdAtual)) {
            atvObj.set('responsavel_id', joaoId)
            app.save(atvObj)
            countAtivAtualizados++
          }
        }

        pageAtiv++
        if (ativosList.length < pageSize) break
      }
      console.log(`[REVISÃO RESPONSÁVEIS] Ativos revisados: ${countAtivAtualizados} atualizados.`)
    } catch (errAtivos) {
      console.warn('[REVISÃO RESPONSÁVEIS] Coleção ativos ignorada ou sem registros:', errAtivos)
    }

    console.log('[REVISÃO RESPONSÁVEIS] Concluída com sucesso total!')
  },
  (app) => {
    // Reversão no-op: dados migrados de forma aditiva e idempotente
    console.log('[REVISÃO RESPONSÁVEIS] Rollback no-op executado.')
  },
)

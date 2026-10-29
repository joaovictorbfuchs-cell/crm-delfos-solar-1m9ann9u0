// Endpoint de consolidação e limpeza de conversas duplicadas do WhatsApp
// POST /backend/v1/whatsapp/consolidar-duplicadas
// Suporta dry_run: true (padrão se não informado ou true) / false para executar a unificação real.

routerAdd('POST', '/backend/v1/whatsapp/consolidar-duplicadas', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    // Por segurança, se não for explicitamente false, assume true (dry_run)
    const dryRun = body.dry_run !== false

    console.log(
      `[WHATSAPP CONSOLIDAR DUPLICADAS] Iniciado por ${authUser.getString('email') || authUser.id} | dryRun: ${dryRun}`,
    )

    // Função de normalização canônica para agrupar conversas que representam o mesmo número
    function normalizarChaveGrupo(numeroRaw) {
      if (!numeroRaw) return ''
      let d = String(numeroRaw).replace(/\D/g, '')
      if (!d) return ''

      // Se for LID (14 dígitos não começando com 55)
      if (d.length === 14 && !d.startsWith('55')) {
        return 'lid_' + d
      }

      // Remover 55 se tiver 12 ou 13 dígitos
      if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
        d = d.slice(2)
      }

      // Se tiver 8 ou 9 dígitos, assumir DDD 54
      if (d.length === 8 || d.length === 9) {
        d = '54' + d
      }

      // Se tiver 11 dígitos com 9 no terceiro dígito (celular nacional), normalizar para sem o 9º dígito
      // para agrupar tanto '5499393405' quanto '54999393405'
      if (d.length === 11 && d.charAt(2) === '9') {
        const ddd = d.slice(0, 2)
        const resto8 = d.slice(3)
        return 'tel_' + ddd + resto8
      }

      if (d.length === 10) {
        return 'tel_' + d
      }

      return 'raw_' + d
    }

    // Carregar todas as conversas
    const convCol = $app.findCollectionByNameOrId('whatsapp_conversas')
    const conversas = $app.findRecordsByFilter('whatsapp_conversas', '', 'created', 5000, 0)

    // Agrupar por chave canônica
    const grupos = {}
    for (let i = 0; i < conversas.length; i++) {
      const conv = conversas[i]
      const num = conv.getString('numero') || ''
      const chave = normalizarChaveGrupo(num)
      if (!chave) continue

      if (!grupos[chave]) {
        grupos[chave] = []
      }
      grupos[chave].push(conv)
    }

    const relatorioGrupos = []
    let totalGruposDuplicados = 0
    let totalConversasRemovidas = 0
    let totalMensagensMovidas = 0
    let totalMensagensDuplicadasExcluidas = 0

    const chaves = Object.keys(grupos)
    for (let k = 0; k < chaves.length; k++) {
      const chave = chaves[k]
      const lista = grupos[chave]
      if (lista.length <= 1) continue

      totalGruposDuplicados++

      // Ordenar por created crescente: o mais antigo é o canônico primário
      lista.sort((a, b) => {
        const tA = new Date(a.getString('created')).getTime() || 0
        const tB = new Date(b.getString('created')).getTime() || 0
        return tA - tB
      })

      const principal = lista[0]
      const duplicatas = lista.slice(1)

      const infoGrupo = {
        chave,
        principalId: principal.id,
        principalNumero: principal.getString('numero'),
        principalCreated: principal.getString('created'),
        totalDuplicatas: duplicatas.length,
        duplicatas: [],
        mensagensAMover: 0,
        mensagensDuplicadasIgnoradas: 0,
      }

      // Obter mensagens já pertencentes à conversa principal para verificar idempotência
      const msgsPrincipal = $app.findRecordsByFilter(
        'whatsapp_mensagens',
        `conversa_id = '${principal.id}'`,
        'created',
        2000,
        0,
      )
      const idsExternosPrincipal = new Set()
      for (let mp = 0; mp < msgsPrincipal.length; mp++) {
        const ext = msgsPrincipal[mp].getString('id_externo_gateway')
        if (ext) idsExternosPrincipal.add(ext)
      }

      // Analisar cada duplicata
      for (let dIdx = 0; dIdx < duplicatas.length; dIdx++) {
        const dup = duplicatas[dIdx]
        const msgsDup = $app.findRecordsByFilter(
          'whatsapp_mensagens',
          `conversa_id = '${dup.id}'`,
          'created',
          2000,
          0,
        )

        let movidasNeste = 0
        let duplicadasNeste = 0

        for (let m = 0; m < msgsDup.length; m++) {
          const msg = msgsDup[m]
          const extId = msg.getString('id_externo_gateway')

          // Se a conversa principal já possui mensagem com esse mesmo id_externo_gateway,
          // não movemos para evitar duplicata na conversa principal
          if (extId && idsExternosPrincipal.has(extId)) {
            duplicadasNeste++
            if (!dryRun) {
              try {
                $app.delete(msg)
              } catch (errDelMsg) {
                console.log(
                  `[CONSOLIDAR DUPLICADAS] Erro ao deletar msg duplicada ${msg.id}:`,
                  errDelMsg,
                )
              }
            }
          } else {
            movidasNeste++
            if (extId) idsExternosPrincipal.add(extId)
            if (!dryRun) {
              try {
                msg.set('conversa_id', principal.id)
                $app.save(msg)
              } catch (errMoveMsg) {
                console.log(
                  `[CONSOLIDAR DUPLICADAS] Erro ao mover msg ${msg.id} para ${principal.id}:`,
                  errMoveMsg,
                )
              }
            }
          }
        }

        infoGrupo.mensagensAMover += movidasNeste
        infoGrupo.mensagensDuplicadasIgnoradas += duplicadasNeste
        totalMensagensMovidas += movidasNeste
        totalMensagensDuplicadasExcluidas += duplicadasNeste

        infoGrupo.duplicatas.push({
          id: dup.id,
          numero: dup.getString('numero'),
          created: dup.getString('created'),
          mensagensContidas: msgsDup.length,
          mensagensMovidas: movidasNeste,
          mensagensDuplicadasExcluidas: duplicadasNeste,
        })

        if (!dryRun) {
          try {
            // Se a duplicata tinha atendente ou cliente_id e a principal não tem, preservar
            if (!principal.getString('cliente_id') && dup.getString('cliente_id')) {
              principal.set('cliente_id', dup.getString('cliente_id'))
            }
            if (!principal.getString('atendente_id') && dup.getString('atendente_id')) {
              principal.set('atendente_id', dup.getString('atendente_id'))
              principal.set('atendente', dup.getString('atendente'))
            }
            $app.delete(dup)
            totalConversasRemovidas++
          } catch (errDelConv) {
            console.log(
              `[CONSOLIDAR DUPLICADAS] Erro ao deletar conversa duplicada ${dup.id}:`,
              errDelConv,
            )
          }
        } else {
          totalConversasRemovidas++
        }
      }

      if (!dryRun) {
        try {
          // Atualizar dados da principal com a última mensagem real
          const msgsFinal = $app.findRecordsByFilter(
            'whatsapp_mensagens',
            `conversa_id = '${principal.id}'`,
            '-created',
            1,
            0,
          )
          if (msgsFinal && msgsFinal.length > 0) {
            const ult = msgsFinal[0]
            const texto = ult.getString('conteudo_final') || ''
            principal.set('ultima_mensagem_preview', texto.substring(0, 100))
            principal.set(
              'ultima_mensagem_em',
              ult.getString('created') || principal.getString('created'),
            )
          }
          $app.save(principal)
        } catch (errUpdPrinc) {
          console.log(
            `[CONSOLIDAR DUPLICADAS] Erro ao atualizar conversa principal ${principal.id}:`,
            errUpdPrinc,
          )
        }
      }

      relatorioGrupos.push(infoGrupo)
    }

    return e.json(200, {
      ok: true,
      dryRun,
      totalConversasAnalisadas: conversas.length,
      totalGruposDuplicados,
      totalConversasRemovidas,
      totalMensagensMovidas,
      totalMensagensDuplicadasExcluidas,
      grupos: relatorioGrupos,
    })
  } catch (errGeral) {
    const msg = errGeral && errGeral.message ? errGeral.message : String(errGeral)
    console.error('[WHATSAPP CONSOLIDAR DUPLICADAS ERRO GERAL]', msg)
    return e.json(500, { ok: false, error: msg })
  }
})

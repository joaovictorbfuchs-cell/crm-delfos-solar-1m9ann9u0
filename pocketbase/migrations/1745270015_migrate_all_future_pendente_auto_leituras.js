migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const registros = app.findRecordsByFilter(
      'atividades',
      "tipo = 'lembrete_auto_leitura' && status = 'pendente' && (protocolo_rge = '' || protocolo_rge = null) && data_leitura >= '2026-11-10'",
      '',
      200,
    )

    for (const rec of registros) {
      try {
        const dataLeituraRaw = rec.get('data_leitura') || rec.get('data') || ''
        const dataIsoStr = String(dataLeituraRaw).slice(0, 10)
        let ddmmaaaa = dataIsoStr
        if (dataIsoStr.includes('-')) {
          const parts = dataIsoStr.split('-')
          if (parts.length === 3) {
            ddmmaaaa = `${parts[2]}/${parts[1]}/${parts[0]}`
          }
        }
        rec.set('tipo', 'registro_auto_leitura')
        rec.set('titulo', `Registro de auto leitura — ${ddmmaaaa}`)
        app.save(rec)

        const lembreteEnviado = rec.get('lembrete_whatsapp_enviado_em')
        if (!lembreteEnviado) {
          const parentId = rec.get('parent_id')
          const clienteId = rec.get('cliente_id')
          const usinaId = rec.get('usina_id')
          const numeroUc = rec.get('numero_uc')
          const responsavelId = rec.get('responsavel_id')
          const responsavelNome = rec.get('responsavel_nome')

          let dataLembreteStr = rec.get('data_lembrete')
          if (!dataLembreteStr && dataIsoStr) {
            const d = new Date(dataIsoStr + 'T12:00:00Z')
            d.setUTCDate(d.getUTCDate() - 2)
            if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() - 2)
            else if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1)
            dataLembreteStr = d.toISOString().slice(0, 10) + ' 08:00:00'
          }

          let jaExisteAviso = false
          try {
            if (parentId) {
              const avisos = app.findRecordsByFilter(
                'atividades',
                `parent_id = '${parentId}' && tipo = 'lembrete_auto_leitura' && data_leitura ~ '${dataIsoStr}'`,
                '',
                1,
              )
              if (avisos && avisos.length > 0) jaExisteAviso = true
            }
          } catch (_) {}

          if (!jaExisteAviso) {
            const novoAviso = new Record(col)
            novoAviso.set('tipo', 'lembrete_auto_leitura')
            novoAviso.set('titulo', `Aviso automático — leitura em ${ddmmaaaa}`)
            novoAviso.set(
              'descricao',
              `Lembrete programado de aviso para a leitura do dia ${ddmmaaaa}${numeroUc ? ' (UC ' + numeroUc + ')' : ''}.`,
            )
            novoAviso.set('status', 'pendente')
            novoAviso.set('data', dataLembreteStr || dataIsoStr + ' 08:00:00')
            novoAviso.set('data_lembrete', dataLembreteStr || dataIsoStr + ' 08:00:00')
            novoAviso.set('data_leitura', dataLeituraRaw)
            if (parentId) novoAviso.set('parent_id', parentId)
            novoAviso.set('cliente_id', clienteId)
            if (usinaId) novoAviso.set('usina_id', usinaId)
            if (numeroUc) novoAviso.set('numero_uc', numeroUc)
            if (responsavelId) novoAviso.set('responsavel_id', responsavelId)
            if (responsavelNome) novoAviso.set('responsavel_nome', responsavelNome)
            novoAviso.set('autor', 'Sistema Delfos')
            app.save(novoAviso)
          }
        }
      } catch (e) {
        console.log(`Erro ao migrar registro pendente ${rec.id}:`, e)
      }
    }
  },
  () => {},
)

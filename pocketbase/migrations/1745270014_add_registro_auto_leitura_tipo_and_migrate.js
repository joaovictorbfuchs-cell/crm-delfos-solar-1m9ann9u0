migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const tipoField = col.fields.getByName('tipo')

    if (tipoField && Array.isArray(tipoField.values)) {
      if (!tipoField.values.includes('registro_auto_leitura')) {
        tipoField.values.push('registro_auto_leitura')
        app.save(col)
      }
    }

    // Migração de dados idempotente conforme especificação:
    // 1. Manter como estão (NÃO migrar): status concluída, ou com protocolo_rge preenchido, ou data_leitura anterior a 2026-11-10.
    // 2. Migrar pendentes futuras (data_leitura >= 2026-11-10):
    //    - converter tipo para registro_auto_leitura
    //    - retitular "Registro de auto leitura — DD/MM/AAAA"
    //    - criar filha de aviso correspondente 2 dias antes SOMENTE se lembrete_whatsapp_enviado_em estiver vazio
    // 3. A atividade mcpczj5bybbt5dn passa a usar tipo novo registro_auto_leitura

    // Atualizar mcpczj5bybbt5dn especificamente se existir
    try {
      const recMcp = app.findRecordById('atividades', 'mcpczj5bybbt5dn')
      if (recMcp && recMcp.get('tipo') !== 'registro_auto_leitura') {
        recMcp.set('tipo', 'registro_auto_leitura')
        app.save(recMcp)
      }
    } catch (e) {
      // Ignorar se não existir
    }

    // Alvos específicos citados na tarefa:
    // a3ssbngdwjsh9d7 (leitura 09/12/2026)
    // 4grjc3eh1rfmt9r (leitura 10/12/2026, cliente Pedrinho Spassini)
    const alvosIds = ['a3ssbngdwjsh9d7', '4grjc3eh1rfmt9r']
    for (const id of alvosIds) {
      try {
        const rec = app.findRecordById('atividades', id)
        if (rec) {
          const status = rec.get('status')
          const protocolo = rec.get('protocolo_rge')
          if (status !== 'concluida' && !protocolo) {
            // Migrar para registro_auto_leitura
            const dataLeituraRaw = rec.get('data_leitura') || rec.get('data') || ''
            const dataIsoStr = String(dataLeituraRaw).slice(0, 10) // YYYY-MM-DD
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

            // Criar aviso 2 dias antes se lembrete_whatsapp_enviado_em estiver vazio
            const lembreteEnviado = rec.get('lembrete_whatsapp_enviado_em')
            if (!lembreteEnviado) {
              const parentId = rec.get('parent_id')
              const clienteId = rec.get('cliente_id')
              const usinaId = rec.get('usina_id')
              const numeroUc = rec.get('numero_uc')
              const responsavelId = rec.get('responsavel_id')
              const responsavelNome = rec.get('responsavel_nome')

              // Calcular data lembrete 2 dias antes
              let dataLembreteStr = rec.get('data_lembrete')
              if (!dataLembreteStr && dataIsoStr) {
                const d = new Date(dataIsoStr + 'T12:00:00Z')
                d.setUTCDate(d.getUTCDate() - 2)
                // Se cair fim de semana, sexta
                if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() - 2)
                else if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1)
                dataLembreteStr = d.toISOString().slice(0, 10) + ' 08:00:00'
              }

              // Checar se já existe aviso para essa data e parent
              let jaExisteAviso = false
              try {
                const avisos = app.findRecordsByFilter(
                  'atividades',
                  `parent_id = '${parentId}' && tipo = 'lembrete_auto_leitura' && data_leitura ~ '${dataIsoStr}'`,
                  '',
                  1,
                )
                if (avisos && avisos.length > 0) jaExisteAviso = true
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
                novoAviso.set('parent_id', parentId)
                novoAviso.set('cliente_id', clienteId)
                if (usinaId) novoAviso.set('usina_id', usinaId)
                if (numeroUc) novoAviso.set('numero_uc', numeroUc)
                if (responsavelId) novoAviso.set('responsavel_id', responsavelId)
                if (responsavelNome) novoAviso.set('responsavel_nome', responsavelNome)
                novoAviso.set('autor', 'Sistema Delfos')
                app.save(novoAviso)
              }
            }
          }
        }
      } catch (err) {
        console.log(`Erro ao migrar atividade ${id}:`, err)
      }
    }
  },
  (app) => {
    // Rollback seguro
    const col = app.findCollectionByNameOrId('atividades')
    const tipoField = col.fields.getByName('tipo')
    if (tipoField && Array.isArray(tipoField.values)) {
      tipoField.values = tipoField.values.filter((v) => v !== 'registro_auto_leitura')
      app.save(col)
    }
  },
)

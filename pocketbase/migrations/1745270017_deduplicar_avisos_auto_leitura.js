migrate(
  (app) => {
    // Migração idempotente para deduplicar avisos/lembretes de auto leitura duplicados
    // Caso específico relatado: aviso jj0d1q44bvp2hrx (parent 3vpfm8aduseo8zv, UC 196.880.001-93)
    // cuja irmã mcpczj5bybbt5dn já teve lembrete_whatsapp_enviado_em preenchido.
    // Regra geral de deduplicação:
    // Se existir atividade com lembrete_whatsapp_enviado_em preenchido para mesma (parent_id + numero_uc + data_leitura),
    // qualquer aviso irmão pendente sem envio deve ser cancelado/marcado enviado ou excluído.
    try {
      const col = app.findCollectionByNameOrId('atividades')

      // 1. Caso direto do aviso jj0d1q44bvp2hrx
      try {
        const avisoEsp = app.findRecordById('atividades', 'jj0d1q44bvp2hrx')
        if (avisoEsp) {
          const sentEm = avisoEsp.getString('lembrete_whatsapp_enviado_em')
          if (!sentEm) {
            // Marcar como cancelada para não ser disparada
            avisoEsp.set('status', 'cancelada')
            avisoEsp.set(
              'descricao',
              (avisoEsp.getString('descricao') || '') +
                ' [Cancelado automaticamente: lembrete já enviado pela atividade mcpczj5bybbt5dn]',
            )
            app.save(avisoEsp)
            console.log('[MIGRATION 1745270017] Aviso jj0d1q44bvp2hrx cancelado por duplicidade.')
          }
        }
      } catch (eEsp) {
        console.log('[MIGRATION 1745270017] jj0d1q44bvp2hrx não encontrado ou já tratado:', eEsp)
      }

      // 2. Busca genérica por duplicidades: atividades com parent_id preenchido onde parent tem múltiplos filhos
      // do tipo lembrete_auto_leitura ou registro_auto_leitura
      const avisosPendentes = app.findRecordsByFilter(
        'atividades',
        "tipo = 'lembrete_auto_leitura' && status = 'pendente' && lembrete_whatsapp_enviado_em = '' && parent_id != ''",
        '-created',
        200,
        0,
      )

      for (let i = 0; i < avisosPendentes.length; i++) {
        const aviso = avisosPendentes[i]
        const parentId = aviso.getString('parent_id')
        const uc = (aviso.getString('numero_uc') || '').trim()
        const dtL = (aviso.getString('data_leitura') || aviso.getString('data') || '').substring(
          0,
          10,
        )

        // Buscar se já existe uma irmã enviada
        let filterIrmas = `parent_id = '${parentId}' && id != '${aviso.id}' && lembrete_whatsapp_enviado_em != ''`
        if (uc) {
          filterIrmas += ` && numero_uc = '${uc}'`
        }

        const irmasEnviadas = app.findRecordsByFilter('atividades', filterIrmas, '-created', 1, 0)
        if (irmasEnviadas && irmasEnviadas.length > 0) {
          // Já existe irmã enviada! Cancelar o aviso duplicado
          aviso.set('status', 'cancelada')
          aviso.set(
            'descricao',
            (aviso.getString('descricao') || '') +
              ` [Cancelado automaticamente: lembrete já enviado pela atividade irmã ${irmasEnviadas[0].id}]`,
          )
          app.save(aviso)
          console.log(
            `[MIGRATION 1745270017] Aviso pendente ${aviso.id} cancelado por duplicidade com ${irmasEnviadas[0].id}`,
          )
        }
      }
    } catch (err) {
      console.log('[MIGRATION 1745270017 ERRO]', err)
    }
  },
  () => {},
)

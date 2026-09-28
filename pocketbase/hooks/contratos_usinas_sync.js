// Sincronização automática entre contratos_usinas e usinas.contrato_id
// Regras exigidas pelo CRM Delfos Solar:
// 1. Ao vincular uma usina a um contrato pela nova relação (ativo = true),
//    o campo atual da usina (contrato_id) deve ser atualizado automaticamente para esse contrato.
// 2. Se a usina for desvinculada (ativo = false ou deletado) e a usina ainda apontava para esse contrato:
//    - Procura se existe outro contrato ativo para essa usina em contratos_usinas; se sim, aponta para ele.
//    - Caso contrário, limpa usinas.contrato_id para manter consistência sem perda de dados.
// 3. Ao atualizar diretamente usinas.contrato_id, garante que exista registro em contratos_usinas ativo.

onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    const contratoId = record.getString('contrato_id')
    const usinaId = record.getString('usina_id')
    const ativo = record.getBool('ativo')

    if (usinaId && contratoId && ativo) {
      const usinaRecord = $app.findRecordById('usinas', usinaId)
      if (usinaRecord && usinaRecord.getString('contrato_id') !== contratoId) {
        usinaRecord.set('contrato_id', contratoId)
        $app.save(usinaRecord)
      }
    }
  } catch (err) {
    console.log('[CONTRATOS_USINAS CREATE SUCCESS SYNC ERRO]:', err)
  }

  return e.next()
}, 'contratos_usinas')

onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    const contratoId = record.getString('contrato_id')
    const usinaId = record.getString('usina_id')
    const ativo = record.getBool('ativo')

    if (usinaId) {
      const usinaRecord = $app.findRecordById('usinas', usinaId)
      if (usinaRecord) {
        if (ativo && contratoId) {
          if (usinaRecord.getString('contrato_id') !== contratoId) {
            usinaRecord.set('contrato_id', contratoId)
            $app.save(usinaRecord)
          }
        } else if (!ativo) {
          // Se o vínculo foi desativado e a usina ainda aponta para esse contrato,
          // verificar se há outro vínculo ativo para a usina
          if (usinaRecord.getString('contrato_id') === contratoId) {
            try {
              const outrosAtivos = $app.findRecordsByFilter(
                'contratos_usinas',
                `usina_id = "${usinaId}" && ativo = true && id != "${record.id}"`,
                '-created',
                1,
                0,
              )
              if (outrosAtivos && outrosAtivos.length > 0) {
                usinaRecord.set('contrato_id', outrosAtivos[0].getString('contrato_id'))
              } else {
                usinaRecord.set('contrato_id', '')
              }
              $app.save(usinaRecord)
            } catch (_) {}
          }
        }
      }
    }
  } catch (err) {
    console.log('[CONTRATOS_USINAS UPDATE SUCCESS SYNC ERRO]:', err)
  }

  return e.next()
}, 'contratos_usinas')

onRecordAfterDeleteSuccess((e) => {
  try {
    const record = e.record
    const contratoId = record.getString('contrato_id')
    const usinaId = record.getString('usina_id')

    if (usinaId && contratoId) {
      const usinaRecord = $app.findRecordById('usinas', usinaId)
      if (usinaRecord && usinaRecord.getString('contrato_id') === contratoId) {
        try {
          const outrosAtivos = $app.findRecordsByFilter(
            'contratos_usinas',
            `usina_id = "${usinaId}" && ativo = true`,
            '-created',
            1,
            0,
          )
          if (outrosAtivos && outrosAtivos.length > 0) {
            usinaRecord.set('contrato_id', outrosAtivos[0].getString('contrato_id'))
          } else {
            usinaRecord.set('contrato_id', '')
          }
          $app.save(usinaRecord)
        } catch (_) {}
      }
    }
  } catch (err) {
    console.log('[CONTRATOS_USINAS DELETE SUCCESS SYNC ERRO]:', err)
  }

  return e.next()
}, 'contratos_usinas')

// Hook complementar: quando uma usina for salva diretamente com contrato_id alterado,
// assegurar que exista um registro ativo correspondente em contratos_usinas
onRecordAfterUpdateSuccess((e) => {
  try {
    const usina = e.record
    const contratoId = usina.getString('contrato_id')
    const usinaId = usina.id

    if (contratoId && usinaId) {
      try {
        const vinculos = $app.findRecordsByFilter(
          'contratos_usinas',
          `contrato_id = "${contratoId}" && usina_id = "${usinaId}"`,
          '-created',
          1,
          0,
        )
        if (vinculos && vinculos.length > 0) {
          const v = vinculos[0]
          if (!v.getBool('ativo')) {
            v.set('ativo', true)
            v.set('data_desvinculo', '')
            $app.save(v)
          }
        } else {
          const col = $app.findCollectionByNameOrId('contratos_usinas')
          const novoVinculo = new Record(col)
          novoVinculo.set('contrato_id', contratoId)
          novoVinculo.set('usina_id', usinaId)
          novoVinculo.set('ativo', true)
          novoVinculo.set('data_vinculo', new Date().toISOString())
          novoVinculo.set('observacoes', 'Criado por sincronização direta de usinas.contrato_id')
          $app.save(novoVinculo)
        }
      } catch (innerErr) {
        console.log('[USINAS DIRECT UPDATE SYNC INNER ERRO]:', innerErr)
      }
    }
  } catch (err) {
    console.log('[USINAS DIRECT UPDATE SYNC ERRO]:', err)
  }

  return e.next()
}, 'usinas')

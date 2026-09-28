migrate(
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const clienteId = '50vyppm3qwwuz62'
      const usinaId = '0rc1xi2xb3t47h2'
      const numeroUc = '4004280183'
      const responsavelId = 'c26ma8cnb9tfudu'
      const responsavelNome = 'João Victor Bagetti Fuchs'
      const datasDemonstracao = ['2027-01-15', '2027-02-15', '2027-03-15']

      const maeRecord = new Record(col, {
        cliente_id: clienteId,
        usina_id: usinaId,
        numero_uc: numeroUc,
        tipo: 'auto_leitura_rge',
        titulo: 'Auto Leitura RGE - UC 4004280183',
        descricao: 'Acompanhamento de leituras programadas da concessionária RGE.',
        data: '2027-01-13 08:00:00.000Z',
        datas_leitura: datasDemonstracao,
        status: 'pendente',
        responsavel_id: responsavelId,
        responsavel_nome: responsavelNome,
        autor: responsavelNome,
      })
      app.save(maeRecord)

      // Criar as 3 filhas vinculadas à mãe
      const filhasDados = [
        {
          dataFormatada: '15/01/2027',
          dataLeituraIso: '2027-01-15 12:00:00.000Z',
          dataLembreteIso: '2027-01-13 08:00:00.000Z',
        },
        {
          dataFormatada: '15/02/2027',
          dataLeituraIso: '2027-02-15 12:00:00.000Z',
          dataLembreteIso: '2027-02-13 08:00:00.000Z',
        },
        {
          dataFormatada: '15/03/2027',
          dataLeituraIso: '2027-03-15 12:00:00.000Z',
          dataLembreteIso: '2027-03-13 08:00:00.000Z',
        },
      ]

      for (const item of filhasDados) {
        const filhaRecord = new Record(col, {
          cliente_id: clienteId,
          usina_id: usinaId,
          numero_uc: numeroUc,
          parent_id: maeRecord.id,
          tipo: 'lembrete_auto_leitura',
          titulo: `Lembrete de Auto Leitura - ${item.dataFormatada}`,
          descricao: `Lembrete de leitura para a UC ${numeroUc}. Data da leitura programada: ${item.dataFormatada}. Enviar foto do relógio e registrar grandezas 03 e 103.`,
          data: item.dataLembreteIso,
          data_leitura: item.dataLeituraIso,
          data_lembrete: item.dataLembreteIso,
          status: 'pendente',
          responsavel_id: responsavelId,
          responsavel_nome: responsavelNome,
          autor: responsavelNome,
        })
        app.save(filhaRecord)
      }
    } catch (e) {
      console.log('[MIGRATION 0169 seed erro]', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('atividades')
      const recs = app.findRecordsByFilter(
        'atividades',
        "tipo = 'lembrete_auto_leitura'",
        '-created',
        50,
        0,
      )
      for (const r of recs) {
        app.delete(r)
      }
    } catch (_) {}
  },
)

// Migration: Adicionar campos de solicitação de avaliação no Google em ordens_servico e atividades,
// e semear o texto e link padrão na coleção configuracoes (100% aditivo).
migrate(
  (app) => {
    // 1. Coleção ordens_servico: adicionar campos de avaliação no Google
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      if (!osCol.fields.getByName('solicitar_avaliacao_google')) {
        osCol.fields.add(
          new BoolField({
            name: 'solicitar_avaliacao_google',
            required: false,
          }),
        )
      }
      if (!osCol.fields.getByName('avaliacao_google_texto')) {
        osCol.fields.add(
          new TextField({
            name: 'avaliacao_google_texto',
            required: false,
          }),
        )
      }
      if (!osCol.fields.getByName('avaliacao_google_link')) {
        osCol.fields.add(
          new TextField({
            name: 'avaliacao_google_link',
            required: false,
          }),
        )
      }
      app.save(osCol)
    }

    // 2. Coleção atividades: adicionar campos também (manutenções geridas como atividades)
    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      if (!ativCol.fields.getByName('solicitar_avaliacao_google')) {
        ativCol.fields.add(
          new BoolField({
            name: 'solicitar_avaliacao_google',
            required: false,
          }),
        )
      }
      if (!ativCol.fields.getByName('avaliacao_google_texto')) {
        ativCol.fields.add(
          new TextField({
            name: 'avaliacao_google_texto',
            required: false,
          }),
        )
      }
      if (!ativCol.fields.getByName('avaliacao_google_link')) {
        ativCol.fields.add(
          new TextField({
            name: 'avaliacao_google_link',
            required: false,
          }),
        )
      }
      app.save(ativCol)
    }

    // 3. Seed na coleção configuracoes com chave 'avaliacao_google_config_padrao'
    try {
      const cfgCol = app.findCollectionByNameOrId('configuracoes')
      if (cfgCol) {
        const records = app.findRecordsByFilter(
          'configuracoes',
          "chave = 'avaliacao_google_config_padrao'",
        )
        const textoPadrao =
          'Ficamos felizes em atender você! Se o serviço foi do seu agrado, reserve 15 segundos para avaliar nossa equipe no Google — isso é muito importante para continuarmos entregando um atendimento de qualidade.'
        const linkPadrao = 'https://g.page/r/CTsVOsKTsWCTEBM/review'
        const tituloPadrao = 'Sua opinião vale muito para nós'

        if (!records || records.length === 0) {
          const rec = new Record(cfgCol)
          rec.set('chave', 'avaliacao_google_config_padrao')
          rec.set('valor', textoPadrao)
          rec.set('dados', {
            titulo: tituloPadrao,
            texto: textoPadrao,
            link: linkPadrao,
          })
          rec.set(
            'descricao',
            'Configuração padrão de solicitação de avaliação no Google para o Relatório da OS',
          )
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Aviso ao semear configuracao de avaliacao google:', err)
    }
  },
  (app) => {
    const osCol = app.findCollectionByNameOrId('ordens_servico')
    if (osCol) {
      const f1 = osCol.fields.getByName('solicitar_avaliacao_google')
      if (f1) osCol.fields.remove(f1)
      const f2 = osCol.fields.getByName('avaliacao_google_texto')
      if (f2) osCol.fields.remove(f2)
      const f3 = osCol.fields.getByName('avaliacao_google_link')
      if (f3) osCol.fields.remove(f3)
      app.save(osCol)
    }

    const ativCol = app.findCollectionByNameOrId('atividades')
    if (ativCol) {
      const f1 = ativCol.fields.getByName('solicitar_avaliacao_google')
      if (f1) ativCol.fields.remove(f1)
      const f2 = ativCol.fields.getByName('avaliacao_google_texto')
      if (f2) ativCol.fields.remove(f2)
      const f3 = ativCol.fields.getByName('avaliacao_google_link')
      if (f3) ativCol.fields.remove(f3)
      app.save(ativCol)
    }
  },
)

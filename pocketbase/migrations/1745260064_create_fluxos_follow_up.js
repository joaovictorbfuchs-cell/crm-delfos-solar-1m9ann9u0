migrate(
  (app) => {
    let usersCollectionId = ''
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      if (usersCol) {
        usersCollectionId = usersCol.id
      }
    } catch (_) {}

    // 1. Coleção fluxos_follow_up
    let fluxosCol
    try {
      fluxosCol = app.findCollectionByNameOrId('fluxos_follow_up')
    } catch (_) {
      fluxosCol = null
    }

    if (!fluxosCol) {
      const fieldsFluxos = [
        { name: 'nome', type: 'text', required: true },
        { name: 'descricao', type: 'text' },
        { name: 'ativo', type: 'bool' },
        { name: 'is_padrao', type: 'bool' },
      ]

      if (usersCollectionId) {
        fieldsFluxos.push({
          name: 'criado_por',
          type: 'relation',
          collectionId: usersCollectionId,
          maxSelect: 1,
        })
      } else {
        fieldsFluxos.push({
          name: 'criado_por',
          type: 'text',
        })
      }

      fieldsFluxos.push(
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      )

      fluxosCol = new Collection({
        name: 'fluxos_follow_up',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: fieldsFluxos,
        indexes: [],
      })

      app.save(fluxosCol)
    }

    // 2. Coleção etapas_follow_up
    let etapasCol
    try {
      etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
    } catch (_) {
      etapasCol = null
    }

    if (!etapasCol) {
      const fieldsEtapas = [
        {
          name: 'fluxo_id',
          type: 'relation',
          collectionId: fluxosCol.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'ordem', type: 'number', required: true },
        { name: 'nome', type: 'text' },
        { name: 'dias_apos', type: 'number', required: true },
        { name: 'mensagem', type: 'text', required: true },
        { name: 'ativa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ]

      etapasCol = new Collection({
        name: 'etapas_follow_up',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: fieldsEtapas,
        indexes: [],
      })

      app.save(etapasCol)
    }

    // 3. Atualizar listas_envio para ter fluxo_id (opcional relation)
    try {
      const listasCol = app.findCollectionByNameOrId('listas_envio')
      if (listasCol) {
        let hasFluxoField = false
        for (let i = 0; i < listasCol.fields.length; i++) {
          if (listasCol.fields[i].name === 'fluxo_id') {
            hasFluxoField = true
            break
          }
        }
        if (!hasFluxoField) {
          listasCol.fields.add(
            new RelationField({
              name: 'fluxo_id',
              collectionId: fluxosCol.id,
              maxSelect: 1,
            }),
          )
          app.save(listasCol)
        }
      }
    } catch (errListas) {
      console.log('[MIGRATION 1745260064] Aviso listas_envio.fluxo_id:', errListas)
    }

    // 4. Atualizar disparos_massa para ter fluxo_id (opcional relation)
    try {
      const disparosCol = app.findCollectionByNameOrId('disparos_massa')
      if (disparosCol) {
        let hasFluxoField = false
        for (let i = 0; i < disparosCol.fields.length; i++) {
          if (disparosCol.fields[i].name === 'fluxo_id') {
            hasFluxoField = true
            break
          }
        }
        if (!hasFluxoField) {
          disparosCol.fields.add(
            new RelationField({
              name: 'fluxo_id',
              collectionId: fluxosCol.id,
              maxSelect: 1,
            }),
          )
          app.save(disparosCol)
        }
      }
    } catch (errDisparos) {
      console.log('[MIGRATION 1745260064] Aviso disparos_massa.fluxo_id:', errDisparos)
    }

    // 5. Seed silencioso e idempotente do fluxo 'Padrão Delfos' (+3d e +90d)
    let fluxoPadraoId = ''
    try {
      const fluxosExistentes = app.findRecordsByFilter(
        'fluxos_follow_up',
        "nome = 'Padrão Delfos' || is_padrao = true",
        '-created',
        1,
        0,
      )
      if (fluxosExistentes && fluxosExistentes.length > 0) {
        fluxoPadraoId = fluxosExistentes[0].id
      } else {
        const novoFluxo = new Record(fluxosCol)
        novoFluxo.set('nome', 'Padrão Delfos')
        novoFluxo.set(
          'descricao',
          'Fluxo padrão institucional do CRM Delfos Solar: 1ª etapa após 3 dias e 2ª etapa após 90 dias.',
        )
        novoFluxo.set('ativo', true)
        novoFluxo.set('is_padrao', true)
        app.save(novoFluxo)
        fluxoPadraoId = novoFluxo.id

        // Criar etapa 1: +3 dias
        const etapa1 = new Record(etapasCol)
        etapa1.set('fluxo_id', fluxoPadraoId)
        etapa1.set('ordem', 1)
        etapa1.set('nome', '1º Follow-up (+3 dias)')
        etapa1.set('dias_apos', 3)
        etapa1.set(
          'mensagem',
          'Olá, [nome do cliente]! Tudo bem? Passando para saber se você conseguiu ver nossa mensagem anterior. Qualquer dúvida sobre sua usina solar ou serviços Delfos, estou à disposição por aqui!',
        )
        etapa1.set('ativa', true)
        app.save(etapa1)

        // Criar etapa 2: +90 dias
        const etapa2 = new Record(etapasCol)
        etapa2.set('fluxo_id', fluxoPadraoId)
        etapa2.set('ordem', 2)
        etapa2.set('nome', '2º Follow-up (+90 dias)')
        etapa2.set('dias_apos', 90)
        etapa2.set(
          'mensagem',
          'Olá, [nome do cliente]! Tudo bem? Faz algum tempo que nos falamos por aqui. Gostaria de saber como está o desempenho da sua usina solar e se precisa de alguma revisão, limpeza dos módulos ou acompanhamento técnico da Delfos Solar.',
        )
        etapa2.set('ativa', true)
        app.save(etapa2)
      }
    } catch (errSeedFluxo) {
      console.log('[MIGRATION 1745260064] Erro ao seedar fluxo padrão:', errSeedFluxo)
    }

    // 6. Migração silenciosa de listas_envio e disparos_massa existentes que não têm fluxo_id
    if (fluxoPadraoId) {
      try {
        const listasSemFluxo = app.findRecordsByFilter(
          'listas_envio',
          "fluxo_id = '' || fluxo_id = null",
          '',
          500,
          0,
        )
        for (let l = 0; l < listasSemFluxo.length; l++) {
          listasSemFluxo[l].set('fluxo_id', fluxoPadraoId)
          app.save(listasSemFluxo[l])
        }
      } catch (errMigListas) {
        console.log('[MIGRATION 1745260064] Aviso backfill listas:', errMigListas)
      }

      try {
        const disparosSemFluxo = app.findRecordsByFilter(
          'disparos_massa',
          "fluxo_id = '' || fluxo_id = null",
          '',
          500,
          0,
        )
        for (let d = 0; d < disparosSemFluxo.length; d++) {
          disparosSemFluxo[d].set('fluxo_id', fluxoPadraoId)
          app.save(disparosSemFluxo[d])
        }
      } catch (errMigDisparos) {
        console.log('[MIGRATION 1745260064] Aviso backfill disparos:', errMigDisparos)
      }
    }
  },
  (app) => {
    try {
      const etapasCol = app.findCollectionByNameOrId('etapas_follow_up')
      if (etapasCol) app.delete(etapasCol)
    } catch (_) {}
    try {
      const fluxosCol = app.findCollectionByNameOrId('fluxos_follow_up')
      if (fluxosCol) app.delete(fluxosCol)
    } catch (_) {}
  },
)

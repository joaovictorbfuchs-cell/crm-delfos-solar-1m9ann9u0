/// <reference types="pocketbase" />

/**
 * Migration 0143: Adiciona campo recorrencia_mensal em clientes e negocios
 * e garante que o registro do cliente e negócio João Silva esteja configurado
 * com valor 3500 e recorrencia_mensal = true ("R$ 3.500/mês").
 */
migrate(
  (app) => {
    // 1. Campo 'recorrencia_mensal' na coleção 'clientes'
    try {
      const cliCol = app.findCollectionByNameOrId('clientes')
      if (!cliCol.fields.getByName('recorrencia_mensal')) {
        cliCol.fields.add(
          new BoolField({
            name: 'recorrencia_mensal',
            required: false,
          }),
        )
        app.save(cliCol)
      }
    } catch (e) {
      console.log('Erro ou campo recorrencia_mensal já existente em clientes:', e)
    }

    // 2. Campo 'recorrencia_mensal' na coleção 'negocios'
    try {
      const negCol = app.findCollectionByNameOrId('negocios')
      if (!negCol.fields.getByName('recorrencia_mensal')) {
        negCol.fields.add(
          new BoolField({
            name: 'recorrencia_mensal',
            required: false,
          }),
        )
        app.save(negCol)
      }
    } catch (e) {
      console.log('Erro ou campo recorrencia_mensal já existente em negocios:', e)
    }

    // 3. Atualiza o cliente 'João Silva' com valor 3500 e recorrencia_mensal = true
    try {
      const joaoRecords = app.findRecordsByFilter(
        'clientes',
        'nome ~ "João Silva"',
        '-created',
        10,
        0,
      )
      if (joaoRecords && joaoRecords.length > 0) {
        for (const joao of joaoRecords) {
          joao.set('valor_estimado', 3500)
          joao.set('recorrencia_mensal', true)
          app.save(joao)

          // Atualiza também os negócios relacionados ao João Silva
          try {
            const negociosJoao = app.findRecordsByFilter(
              'negocios',
              `cliente_id = "${joao.id}"`,
              '-created',
              10,
              0,
            )
            if (negociosJoao && negociosJoao.length > 0) {
              for (const neg of negociosJoao) {
                neg.set('valor_estimado', 3500)
                neg.set('valor', 3500)
                neg.set('recorrencia_mensal', true)
                app.save(neg)
              }
            }
          } catch (_) {}
        }
      }
    } catch (e) {
      console.log('Erro ao atualizar registro de João Silva na migração:', e)
    }
  },
  (app) => {
    try {
      const cliCol = app.findCollectionByNameOrId('clientes')
      if (cliCol.fields.getByName('recorrencia_mensal')) {
        cliCol.fields.removeByName('recorrencia_mensal')
        app.save(cliCol)
      }
    } catch (_) {}

    try {
      const negCol = app.findCollectionByNameOrId('negocios')
      if (negCol.fields.getByName('recorrencia_mensal')) {
        negCol.fields.removeByName('recorrencia_mensal')
        app.save(negCol)
      }
    } catch (_) {}
  },
)

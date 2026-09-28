migrate(
  (app) => {
    // 1. Atualizar select de tipos da coleção atividades para incluir 'analise_fatura'
    try {
      const atvCol = app.findCollectionByNameOrId('atividades')
      const tipoField = atvCol.fields.getByName('tipo')
      if (tipoField && tipoField.values && Array.isArray(tipoField.values)) {
        if (!tipoField.values.includes('analise_fatura')) {
          tipoField.values.push('analise_fatura')
          app.save(atvCol)
        }
      }
    } catch (errAtv) {
      console.log('[MIGRATION 0166] Aviso ao atualizar campo tipo em atividades:', errAtv)
    }

    // 2. Criar coleção analises_fatura para armazenar análises completas
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const analisesCol = new Collection({
      name: 'analises_fatura',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'token', type: 'text', required: true },
        {
          name: 'cliente_id',
          type: 'relation',
          collectionId: clientesCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'cliente_nome', type: 'text' },
        { name: 'uc', type: 'text' },
        { name: 'competencia', type: 'text' },
        { name: 'vencimento', type: 'text' },
        { name: 'total_pagar', type: 'number' },
        { name: 'consumo_kwh', type: 'number' },
        { name: 'energia_injetada_kwh', type: 'number' },
        { name: 'creditos_compensados_kwh', type: 'number' },
        { name: 'saldo_energia_kwh', type: 'number' },
        { name: 'saldo_expirar_kwh', type: 'number' },
        { name: 'economia_estimada_rs', type: 'number' },
        { name: 'papel_uc', type: 'text' },
        { name: 'arquivos_nomes', type: 'json' },
        { name: 'dados_completos', type: 'json' },
        { name: 'atividade_id', type: 'text' },
        { name: 'whatsapp_enviado', type: 'bool' },
        { name: 'whatsapp_enviado_em', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_analises_fatura_token ON analises_fatura (token)',
        'CREATE INDEX idx_analises_fatura_cliente ON analises_fatura (cliente_id, created DESC)',
      ],
    })
    app.save(analisesCol)
  },
  (app) => {
    try {
      const analisesCol = app.findCollectionByNameOrId('analises_fatura')
      app.delete(analisesCol)
    } catch (_) {}
  },
)

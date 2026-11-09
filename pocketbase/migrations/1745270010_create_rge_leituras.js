// Fila de autoleitura na RGE.
//
// O botao "Enviar para RGE" na atividade cria um registro aqui com status
// 'na_fila'. O robo no PC da Delfos busca a fila, executa no portal e devolve
// protocolo/horario. Nada de senha aqui: a credencial e lida de
// rge_credenciais na hora que o robo pega o item.
migrate(
  (app) => {
    let col
    try {
      col = app.findCollectionByNameOrId('rge_leituras')
    } catch (e) {
      col = null
    }
    if (col) return

    const atividadesId = app.findCollectionByNameOrId('atividades').id

    col = new Collection({
      name: 'rge_leituras',
      type: 'base',
      fields: [
        // atividade que pediu o envio (a filha de lembrete ou a mae)
        {
          name: 'atividade_id',
          type: 'relation',
          required: false,
          maxSelect: 1,
          collectionId: atividadesId,
          cascadeDelete: false,
        },
        { name: 'cliente_id', type: 'relation', maxSelect: 1, collectionId: 'pbc_279994318' },
        { name: 'uc', type: 'text', required: true },
        // mes de referencia que o portal mostrava quando pedimos (ex.: 11/2026)
        { name: 'mes_referencia', type: 'text' },
        { name: 'valor_03', type: 'text', required: true },
        { name: 'valor_a3', type: 'text' },
        { name: 'telefone', type: 'text' },
        {
          name: 'status',
          type: 'select',
          maxSelect: 1,
          values: ['na_fila', 'processando', 'enviada', 'erro'],
        },
        { name: 'protocolo', type: 'text' },
        { name: 'horario_envio', type: 'date' },
        // mensagem crua que o portal devolveu (sucesso ou erro)
        { name: 'mensagem', type: 'text', max: 4000 },
        { name: 'solicitado_por', type: 'text' },
        { name: 'tentativas', type: 'number', min: 0, max: 100 },
        { name: 'robo_em', type: 'date' },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      indexes: ['CREATE INDEX idx_rge_leituras_status ON rge_leituras (status)'],
    })
    app.save(col)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('rge_leituras'))
    } catch (e) {}
  },
)

migrate(
  (app) => {
    const CLIENTES = 'pbc_279994318'
    const USINAS = 'pbc_3535928899'

    // ------------------------------------------------------------------
    // Credenciais do portal CPFL/RGE (uma por cliente / UC)
    // ------------------------------------------------------------------
    let cred = null
    try {
      cred = app.findCollectionByNameOrId('rge_credenciais')
    } catch (_) {}

    if (!cred) {
      cred = new Collection({
        name: 'rge_credenciais',
        type: 'base',
        // Segredo: nenhuma regra aberta. A senha e o token nunca voltam
        // para o navegador; quem usa é o hook, no servidor.
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          { name: 'uc', type: 'text', required: true },
          { name: 'rotulo', type: 'text' },
          { name: 'documento', type: 'text' },
          { name: 'login', type: 'text' },
          { name: 'senha', type: 'text' },
          { name: 'token', type: 'text' },
          { name: 'token_exp', type: 'text' },
          { name: 'modo_auth', type: 'select', maxSelect: 1, values: ['senha', 'token'] },
          {
            name: 'status',
            type: 'select',
            maxSelect: 1,
            values: ['novo', 'ok', 'erro', 'expirado'],
          },
          { name: 'ultimo_login', type: 'text' },
          { name: 'ultimo_erro', type: 'text' },
          { name: 'ativo', type: 'bool' },
          { name: 'cliente_id', type: 'relation', collectionId: CLIENTES, maxSelect: 1 },
          { name: 'usina_id', type: 'relation', collectionId: USINAS, maxSelect: 1 },
        ],
      })
      app.save(cred)
    }

    cred = app.findCollectionByNameOrId('rge_credenciais')

    // ------------------------------------------------------------------
    // Contas de energia (o PDF e os dados de cada mês)
    // ------------------------------------------------------------------
    let contas = null
    try {
      contas = app.findCollectionByNameOrId('rge_contas')
    } catch (_) {}

    if (!contas) {
      contas = new Collection({
        name: 'rge_contas',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'uc', type: 'text' },
          { name: 'competencia', type: 'text' },
          { name: 'vencimento', type: 'text' },
          { name: 'valor', type: 'number' },
          { name: 'consumo_kwh', type: 'number' },
          { name: 'energia_injetada_kwh', type: 'number' },
          { name: 'saldo_kwh', type: 'number' },
          { name: 'nome_arquivo', type: 'text' },
          // PDF em base64: evita depender da API de arquivos do JSVM
          { name: 'pdf_base64', type: 'text' },
          { name: 'dados', type: 'json' },
          { name: 'origem', type: 'text' },
          { name: 'cliente_id', type: 'relation', collectionId: CLIENTES, maxSelect: 1 },
          { name: 'usina_id', type: 'relation', collectionId: USINAS, maxSelect: 1 },
          { name: 'credencial_id', type: 'relation', collectionId: cred.id, maxSelect: 1 },
        ],
      })
      app.save(contas)
    }
  },
  (app) => {
    // down: mantém as coleções para não perder contas já baixadas
  },
)

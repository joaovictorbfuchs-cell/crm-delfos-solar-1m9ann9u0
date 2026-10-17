// Restrict collections that previously allowed anonymous CRUD access.
// This is a one-way security hardening: down deliberately preserves the restrictions
// rather than restoring public access to customer, commercial, and credential data.
migrate(
  (app) => {
    const authenticated = "@request.auth.id != ''"
    const protectedCollections = [
      'negocios',
      'usinas',
      'contatos',
      'contatos_adicionais',
      'cliente_inversores',
      'monitoramento_marcas',
      'documentos_cliente',
      'transferencias_creditos',
      'contratos_usinas',
    ]

    for (let i = 0; i < protectedCollections.length; i++) {
      const collection = app.findCollectionByNameOrId(protectedCollections[i])
      collection.listRule = authenticated
      collection.viewRule = authenticated
      collection.createRule = authenticated
      collection.updateRule = authenticated
      collection.deleteRule = authenticated
      app.save(collection)
    }

    // Public analysis links remain served by the token-verifying backend route;
    // direct collection list/view access is no longer anonymous.
    const analyses = app.findCollectionByNameOrId('analises_fatura')
    analyses.listRule = authenticated
    analyses.viewRule = authenticated
    app.save(analyses)
  },
  (app) => {
    const authenticated = "@request.auth.id != ''"
    const protectedCollections = [
      'negocios',
      'usinas',
      'contatos',
      'contatos_adicionais',
      'cliente_inversores',
      'monitoramento_marcas',
      'documentos_cliente',
      'transferencias_creditos',
      'contratos_usinas',
    ]

    // Never reopen anonymous access during rollback of a security hardening.
    for (let i = 0; i < protectedCollections.length; i++) {
      const collection = app.findCollectionByNameOrId(protectedCollections[i])
      collection.listRule = authenticated
      collection.viewRule = authenticated
      collection.createRule = authenticated
      collection.updateRule = authenticated
      collection.deleteRule = authenticated
      app.save(collection)
    }

    const analyses = app.findCollectionByNameOrId('analises_fatura')
    analyses.listRule = authenticated
    analyses.viewRule = authenticated
    app.save(analyses)
  },
)

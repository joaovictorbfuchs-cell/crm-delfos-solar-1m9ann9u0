/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const clientes = app.findCollectionByNameOrId('clientes')

    if (!clientes.fields.getByName('pendencias_informacoes')) {
      clientes.fields.add(
        new JSONField({
          name: 'pendencias_informacoes',
          required: false,
        }),
      )
      app.save(clientes)
    }

    // Atualizar cliente de exemplo Maria Santos com metade dos itens marcados como pendentes
    try {
      const records = app.findRecordsByFilter('clientes', "nome ~ 'Maria Santos'", 'created', 1, 0)
      if (records.length > 0) {
        const maria = records[0]
        // Dos 11 itens:
        // 1. Nome completo
        // 2. CPF
        // 3. Cópia da CNH
        // 4. Razão social
        // 5. CNPJ
        // 6. Última revisão do contrato social
        // 7. E-mail
        // 8. Telefone
        // 9. Conta de energia
        // 10. CCIR — Certificado de Cadastro de Imóvel Rural
        // 11. Foto do talão do produtor
        //
        // Metade pendentes (ex: 5 a 6 itens):
        const pendenciasExemplo = [
          'Cópia da CNH',
          'Última revisão do contrato social',
          'Conta de energia',
          'CCIR — Certificado de Cadastro de Imóvel Rural',
          'Foto do talão do produtor',
        ]
        maria.set('pendencias_informacoes', pendenciasExemplo)
        app.save(maria)
      }
    } catch (err) {
      console.log('Aviso ao semear pendências da Maria Santos:', err)
    }
  },
  (app) => {
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      if (clientes.fields.getByName('pendencias_informacoes')) {
        clientes.fields.removeByName('pendencias_informacoes')
        app.save(clientes)
      }
    } catch (_) {}
  },
)

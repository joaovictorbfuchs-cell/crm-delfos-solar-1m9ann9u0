migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')

    // 1. Atualizar select 'origem_lead' para incluir 'WhatsApp'
    const origemField = col.fields.getByName('origem_lead')
    if (origemField) {
      origemField.values = ['Facebook', 'Instagram', 'Indicação', 'Site', 'WhatsApp', 'Outro']
    } else {
      col.fields.add(
        new SelectField({
          name: 'origem_lead',
          values: ['Facebook', 'Instagram', 'Indicação', 'Site', 'WhatsApp', 'Outro'],
          maxSelect: 1,
        }),
      )
    }

    // 2. Atualizar select 'produto' para suportar tanto os produtos gerais quanto os tipos de cliente/projeto
    const produtoField = col.fields.getByName('produto')
    if (produtoField) {
      produtoField.values = [
        'Energia Solar',
        'Manutenção avulsa',
        'Plano de O&M',
        'Sistemas Híbridos',
        'Carregadores veiculares',
        'residencial',
        'comercial',
        'industrial',
        'rural',
        'investidor',
      ]
    }

    // 3. Adicionar campo 'tipo_cliente' dedicado se não existir (para orçamentos e perfil)
    if (!col.fields.getByName('tipo_cliente')) {
      col.fields.add(
        new SelectField({
          name: 'tipo_cliente',
          values: ['residencial', 'comercial', 'industrial', 'rural', 'investidor'],
          maxSelect: 1,
        }),
      )
    }

    // 4. Adicionar campo 'usina_endereco' se não existir para compatibilidade
    if (!col.fields.getByName('usina_endereco')) {
      col.fields.add(
        new TextField({
          name: 'usina_endereco',
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clientes')

    const usinaEnderecoField = col.fields.getByName('usina_endereco')
    if (usinaEnderecoField) {
      col.fields.remove(usinaEnderecoField)
    }

    const tipoClienteField = col.fields.getByName('tipo_cliente')
    if (tipoClienteField) {
      col.fields.remove(tipoClienteField)
    }

    const produtoField = col.fields.getByName('produto')
    if (produtoField) {
      produtoField.values = [
        'Energia Solar',
        'Manutenção avulsa',
        'Plano de O&M',
        'Sistemas Híbridos',
        'Carregadores veiculares',
      ]
    }

    const origemField = col.fields.getByName('origem_lead')
    if (origemField) {
      origemField.values = ['Facebook', 'Instagram', 'Indicação', 'Site', 'Outro']
    }

    app.save(col)
  },
)

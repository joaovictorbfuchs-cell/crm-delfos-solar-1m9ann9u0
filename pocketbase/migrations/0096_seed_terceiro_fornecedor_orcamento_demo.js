/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const foCol = app.findCollectionByNameOrId('fornecedores_orcamentos')
    const orcCol = app.findCollectionByNameOrId('orcamentos_solar')
    const clienteCol = app.findCollectionByNameOrId('clientes')

    // 1. Identificar cliente de demonstração
    let clienteDemoId = 'f3eass5h5tg8wli'
    try {
      clienteDemoId = app.findFirstRecordByData('clientes', 'id', clienteDemoId).id
    } catch (_) {
      try {
        clienteDemoId = app.findFirstRecordByData('clientes', 'nome', 'Ana Paula Silveira').id
      } catch (_) {
        const anyClient = app.findRecordsByFilter('clientes', '', '-created', 1, 0)
        if (anyClient && anyClient.length > 0) {
          clienteDemoId = anyClient[0].id
        }
      }
    }

    // 2. Identificar orçamento de demonstração
    let demoOrcId = '7sj8xu73ay9hvrc'
    let demoOrc = null
    try {
      demoOrc = app.findFirstRecordByData('orcamentos_solar', 'id', demoOrcId)
    } catch (_) {
      try {
        demoOrc = app.findFirstRecordByData('orcamentos_solar', 'cliente_id', clienteDemoId)
        if (demoOrc) demoOrcId = demoOrc.id
      } catch (_) {}
    }

    // 3. Fornecedores base cadastrados
    let fornSoltecnoId = ''
    let fornEletricaRsId = ''
    let fornEstruturasSulId = ''
    try {
      fornSoltecnoId = app.findFirstRecordByData(
        'fornecedores',
        'nome_empresa',
        'Sol tecno Distribuidora',
      ).id
    } catch (_) {}
    try {
      fornEletricaRsId = app.findFirstRecordByData(
        'fornecedores',
        'nome_empresa',
        'Elétrica Comercial RS',
      ).id
    } catch (_) {}
    try {
      fornEstruturasSulId = app.findFirstRecordByData(
        'fornecedores',
        'nome_empresa',
        'Estruturas Sul Solar',
      ).id
    } catch (_) {}

    // Garantir que os 2 primeiros orçamentos tenham cliente_id e orcamento_solar_id padronizados
    try {
      const fo1 = app.findFirstRecordByData('fornecedores_orcamentos', 'id', '435fd9yptb6y6m5')
      if (
        demoOrcId &&
        (!fo1.getString('orcamento_solar_id') || fo1.getString('orcamento_solar_id') !== demoOrcId)
      ) {
        fo1.set('orcamento_solar_id', demoOrcId)
        app.save(fo1)
      }
    } catch (_) {}

    try {
      const fo2 = app.findFirstRecordByData('fornecedores_orcamentos', 'id', '71vix40ekg6t4we')
      if (
        demoOrcId &&
        (!fo2.getString('orcamento_solar_id') || fo2.getString('orcamento_solar_id') !== demoOrcId)
      ) {
        fo2.set('orcamento_solar_id', demoOrcId)
        app.save(fo2)
      }
    } catch (_) {}

    // 4. Garantir 3º Fornecedor de demonstração com valor distinto (ex: Estruturas Sul Solar / R$ 16.500)
    let fo3Existente = null
    try {
      fo3Existente = app.findFirstRecordByData(
        'fornecedores_orcamentos',
        'numero_revisao',
        'ESS-DEMO-10P',
      )
    } catch (_) {}

    if (!fo3Existente) {
      const fo3 = new Record(foCol)
      if (fornEstruturasSulId) fo3.set('fornecedor_id', fornEstruturasSulId)
      fo3.set('nome_fornecedor', 'Estruturas Sul Solar')
      fo3.set('cliente_id', clienteDemoId)
      if (demoOrcId) fo3.set('orcamento_solar_id', demoOrcId)
      fo3.set('data', new Date().toISOString())
      fo3.set('numero_revisao', 'ESS-DEMO-10P')
      fo3.set('valor_total', 16500)
      fo3.set('selecionado', false)
      fo3.set('modulos', [
        { descricao: 'Módulo Fotovoltaico Canadian Solar 550W HiKu6 Mono', quantidade: 10 },
      ])
      fo3.set('inversores', [
        { descricao: 'Inversor Solar On-Grid Solis 5kW Monofásico 220V', quantidade: 1 },
      ])
      fo3.set('acessorios', [
        {
          descricao: 'Kit Fixação Alumínio Marítimo 6063-T6 10 Placas + String Box',
          quantidade: 1,
        },
      ])
      fo3.set(
        'observacoes',
        'Terceira opção de fornecedor homologado com valor promocional para 10 módulos.',
      )
      app.save(fo3)
    }

    // Se houver revisões derivadas (enh09eqph2leub7, 2p961dtwafkltoo), associar também ou deixar o clienteId vinculado
  },
  (app) => {
    try {
      const fo3 = app.findFirstRecordByData(
        'fornecedores_orcamentos',
        'numero_revisao',
        'ESS-DEMO-10P',
      )
      if (fo3) {
        app.delete(fo3)
      }
    } catch (_) {}
  },
)

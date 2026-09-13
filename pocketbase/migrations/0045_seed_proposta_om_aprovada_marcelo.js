migrate(
  (app) => {
    // 1. Atualizar ou garantir dados cadastrais de Marcelo Becker
    let marcelo = null
    try {
      marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
    } catch (_) {
      try {
        marcelo = app.findFirstRecordByData('clientes', 'id', '9ozpqdm9sgwmdzr')
      } catch (_) {}
    }

    if (marcelo) {
      marcelo.set('nome', 'Marcelo Becker')
      marcelo.set('cpf', '412.589.630-18')
      marcelo.set('endereco', 'Linha São João, Km 12')
      marcelo.set('numero', 'S/N')
      marcelo.set('bairro', 'Zona Rural')
      marcelo.set('cidade', 'Passo Fundo/RS')
      marcelo.set('telefone', '(54) 99712-8844')
      marcelo.set('whatsapp', '(54) 99712-8844')
      marcelo.set('titular_nome', 'Marcelo Becker')
      marcelo.set('titular_cpf', '412.589.630-18')
      marcelo.set('titular_telefone', '(54) 99712-8844')
      app.save(marcelo)
    }

    const marceloId = marcelo ? marcelo.id : '9ozpqdm9sgwmdzr'

    // 2. Garantir que a proposta O&M do Marcelo Becker esteja com status "aprovado"
    let propOm = null
    try {
      propOm = app.findFirstRecordByData('propostas_om', 'cliente_id', marceloId)
    } catch (_) {}

    if (propOm) {
      propOm.set('status', 'aprovado')
      app.save(propOm)
    } else {
      const propostasCol = app.findCollectionByNameOrId('propostas_om')
      const nova = new Record(propostasCol)
      nova.set('cliente_id', marceloId)
      nova.set('plano_escolhido', 'Completo')
      nova.set('potencia_kwp', 28.5)
      nova.set('geracao_mensal_kwh', 3650)
      nova.set('marca_inversores', 'Growatt MAX 30KTL3-X LV')
      nova.set('tipo_instalacao', 'Estrutura Metálica')
      nova.set('numero_modulos', 64)
      nova.set('valor_kwh', 0.94)
      nova.set('distancia_km', 48)
      nova.set('valor_km', 2.5)
      nova.set('valor_ativo_protegido', 3431)
      nova.set('perda_15_ano', 6175.8)
      nova.set('perda_20_ano', 8234.4)
      nova.set('prejuizo_20_dias', 2287.33)
      nova.set('prejuizo_30_dias', 3431)
      nova.set('valor_mensal_plano', 149.9)
      nova.set('valor_anual_plano', 1798.8)
      nova.set('data_proposta', '2026-03-10 14:30:00.000Z')
      nova.set('autor', 'Carlos Mendes')
      nova.set('status', 'aprovado')
      nova.set(
        'observacoes',
        'Proposta de Manutenção O&M Plano Completo para usina rural de 28.5 kWp da Fazenda Três Palmeiras aprovada pelo cliente.',
      )
      app.save(nova)
    }
  },
  (app) => {
    // Reversão
  },
)

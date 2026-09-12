migrate(
  (app) => {
    const propostasOmCol = app.findCollectionByNameOrId('propostas_om')
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const timelineOmCol = app.findCollectionByNameOrId('timeline_om')
    const orcamentosSolarCol = app.findCollectionByNameOrId('orcamentos_solar')

    const marceloBeckerId = '9ozpqdm9sgwmdzr'
    const anaPaulaId = 'f3eass5h5tg8wli'

    // =========================================================================
    // 1. Marcelo Becker: Garantir Proposta O&M (Plano Completo / Prevenção)
    // =========================================================================
    let propOmMarceloExiste = false
    try {
      app.findFirstRecordByData('propostas_om', 'cliente_id', marceloBeckerId)
      propOmMarceloExiste = true
    } catch (_) {}

    if (!propOmMarceloExiste) {
      try {
        const pOM = new Record(propostasOmCol)
        pOM.set('cliente_id', marceloBeckerId)
        pOM.set('plano_escolhido', 'Completo')
        pOM.set('potencia_kwp', 28.5)
        pOM.set('geracao_mensal_kwh', 3650)
        pOM.set('marca_inversores', 'Growatt MAX 30KTL3-X LV')
        pOM.set('tipo_instalacao', 'Estrutura Metálica')
        pOM.set('numero_modulos', 64)
        pOM.set('valor_kwh', 0.94)
        pOM.set('distancia_km', 48)
        pOM.set('valor_km', 2.5)

        const ativoMensal = 3650 * 0.94 // 3431.00
        pOM.set('valor_ativo_protegido', ativoMensal)
        pOM.set('perda_15_ano', ativoMensal * 12 * 0.15)
        pOM.set('perda_20_ano', ativoMensal * 12 * 0.2)
        pOM.set('prejuizo_20_dias', (ativoMensal * 20) / 30)
        pOM.set('prejuizo_30_dias', ativoMensal)
        pOM.set('valor_mensal_plano', 149.9)
        pOM.set('valor_anual_plano', 149.9 * 12)
        pOM.set('data_proposta', '2026-03-10 14:30:00.000Z')
        pOM.set('autor', 'Carlos Mendes')
        pOM.set('status', 'Proposta Enviada')
        pOM.set(
          'observacoes',
          'Proposta de Manutenção O&M Plano Completo para usina rural de 28.5 kWp da Fazenda Três Palmeiras, incluindo lavagens rotativas e inspeção termográfica anual.',
        )
        app.save(pOM)

        // Registrar na timeline_om
        const timeOM = new Record(timelineOmCol)
        timeOM.set('cliente_id', marceloBeckerId)
        timeOM.set('tipo', 'interacao')
        timeOM.set('titulo', 'Proposta O&M Emitida: Plano Completo')
        timeOM.set(
          'descricao',
          'Proposta oficial entregue ao produtor Marcelo Becker para plano de gestão continuada O&M Completo (R$ 149,90/mês).',
        )
        timeOM.set('data', '2026-03-10 14:30:00.000Z')
        timeOM.set('autor', 'Carlos Mendes')
        timeOM.set('status_tag', 'Proposta Enviada')
        timeOM.set('referencia_id', pOM.id)
        app.save(timeOM)
      } catch (e) {
        console.log('Erro ao semear proposta O&M para Marcelo Becker:', e)
      }
    }

    // =========================================================================
    // 2. Marcelo Becker: Garantir Anotação
    // =========================================================================
    let anotacaoMarceloExiste = false
    try {
      const records = app.findRecordsByFilter(
        'atividades',
        `cliente_id = '${marceloBeckerId}' && tipo = 'anotacao'`,
        '-created',
        1,
        0,
      )
      if (records.length > 0) anotacaoMarceloExiste = true
    } catch (_) {}

    if (!anotacaoMarceloExiste) {
      try {
        const anotacao = new Record(atividadesCol)
        anotacao.set('cliente_id', marceloBeckerId)
        anotacao.set('tipo', 'anotacao')
        anotacao.set('titulo', 'Anotação técnica: Ponto de conexão do pivô e acesso rural')
        anotacao.set(
          'descricao',
          'Cliente informou que durante a safra pesada a estrada municipal de terra recebe muitos caminhões e gera poeira intensa nos primeiros 20 módulos próximos à cerca. Recomendado plano com 2 limpezas semestrais.',
        )
        anotacao.set('data', '2026-03-06 16:45:00.000Z')
        anotacao.set('status', 'concluida')
        anotacao.set('autor', 'Carlos Mendes')
        anotacao.set('responsavel_nome', 'Carlos Mendes')
        app.save(anotacao)
      } catch (e) {
        console.log('Erro ao semear anotação para Marcelo Becker:', e)
      }
    }

    // =========================================================================
    // 3. Ana Paula Martins: Garantir Atividade agendada / pendente e Proposta O&M
    // =========================================================================
    // Ana Paula já tem propostas solares (Revisão 1 e Revisão 2), proposta O&M (wurm2dfbax15zmd),
    // anotação (90rd9ghhgks6kj5) e atividades. Garantir uma anotação adicional recente se necessário.
    let anotacaoAnaExiste = false
    try {
      const records = app.findRecordsByFilter(
        'atividades',
        `cliente_id = '${anaPaulaId}' && tipo = 'anotacao'`,
        '-created',
        1,
        0,
      )
      if (records.length > 0) anotacaoAnaExiste = true
    } catch (_) {}

    if (!anotacaoAnaExiste) {
      try {
        const anotacaoAna = new Record(atividadesCol)
        anotacaoAna.set('cliente_id', anaPaulaId)
        anotacaoAna.set('tipo', 'anotacao')
        anotacaoAna.set('titulo', 'Anotação técnica: Telhado cerâmico colonial')
        anotacaoAna.set(
          'descricao',
          'Vistoria técnica confirmou inclinação ideal voltada ao Norte (18°). Espaço reservado no quadro de distribuição para disjuntor bipolar de 40A do inversor Deye.',
        )
        anotacaoAna.set('data', '2026-03-04 11:00:00.000Z')
        anotacaoAna.set('status', 'concluida')
        anotacaoAna.set('autor', 'Fernanda Lima')
        anotacaoAna.set('responsavel_nome', 'Fernanda Lima')
        app.save(anotacaoAna)
      } catch (e) {
        console.log('Erro ao semear anotação para Ana Paula:', e)
      }
    }
  },
  (app) => {
    // Reversão limpa e segura
  },
)

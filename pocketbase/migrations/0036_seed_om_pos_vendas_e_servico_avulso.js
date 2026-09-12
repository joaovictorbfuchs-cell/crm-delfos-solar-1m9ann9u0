migrate(
  (app) => {
    const contratosCol = app.findCollectionByNameOrId('contratos_om')
    const servicosAvulsosCol = app.findCollectionByNameOrId('servicos_avulsos')

    // 1. Garantir que Marcelo Becker (id: 9ozpqdm9sgwmdzr) tem contrato O&M ativo
    // (já possui proposta O&M Completo no banco)
    try {
      app.findFirstRecordByData('contratos_om', 'cliente_id', '9ozpqdm9sgwmdzr')
      // Já existe contrato para Marcelo Becker
    } catch (_) {
      const recMarcelo = new Record(contratosCol)
      recMarcelo.set('cliente_id', '9ozpqdm9sgwmdzr')
      recMarcelo.set('plano', 'Completo')
      recMarcelo.set('status', 'Ativo')
      recMarcelo.set('valor_mensal', 149.9)
      recMarcelo.set('valor_anual', 1798.8)
      recMarcelo.set('data_inicio', '2025-06-01 10:00:00.000Z')
      recMarcelo.set('data_vencimento', '2026-06-01 10:00:00.000Z')
      recMarcelo.set('proxima_atividade_data', '2026-04-15 09:00:00.000Z')
      recMarcelo.set(
        'proxima_atividade_titulo',
        'Termografia anual dos 64 módulos e reaperto geral da usina',
      )
      recMarcelo.set('servicos_realizados', [
        'Monitoramento da geração em horários comerciais',
        'Relatório mensal de desempenho',
        'Suporte técnico especializado',
      ])
      recMarcelo.set('servicos_agendados', [
        'Limpeza técnica semestral dos módulos',
        'Inspeção preventiva com termografia',
        'Reaperto de conexões e grampos',
      ])
      recMarcelo.set(
        'observacoes',
        'Contrato O&M Plano Completo atendendo a Fazenda Três Palmeiras (Passo Fundo/RS). Usina rural de 28.5 kWp.',
      )
      app.save(recMarcelo)
    }

    // 2. Serviço avulso para cliente Pós-Vendas (Ricardo Alves - id: m81l8oixqbpglmv)
    try {
      app.findFirstRecordByData('servicos_avulsos', 'cliente_id', 'm81l8oixqbpglmv')
      // Já existe serviço avulso
    } catch (_) {
      const recServico = new Record(servicosAvulsosCol)
      recServico.set('cliente_id', 'm81l8oixqbpglmv')
      recServico.set('data_servico', '2026-03-24 14:00:00.000Z')
      recServico.set('tipo_servico', 'limpeza')
      recServico.set('valor_cobrado', 450)
      recServico.set(
        'observacoes_tecnicas',
        'Lavagem com água desmineralizada de 24 placas em telhado de laje e inspeção visual de conectores MC4.',
      )
      recServico.set('status', 'concluido')
      recServico.set(
        'observacoes_equipe',
        'Equipe técnica Rafael Souza e João Silva. Cliente satisfeito, sugerida contratação de plano O&M Essencial.',
      )
      app.save(recServico)
    }
  },
  (app) => {
    try {
      const rec = app.findFirstRecordByData('contratos_om', 'cliente_id', '9ozpqdm9sgwmdzr')
      app.delete(rec)
    } catch (_) {}

    try {
      const rec = app.findFirstRecordByData('servicos_avulsos', 'cliente_id', 'm81l8oixqbpglmv')
      app.delete(rec)
    } catch (_) {}
  },
)

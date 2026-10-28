/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const loteId = 'rcwu4ilnhb8wsc1'
    let lote = null
    try {
      lote = app.findRecordById('disparos_massa', loteId)
    } catch (_) {
      return
    }

    if (!lote) return

    const dataResp = '2026-10-28 20:27:06.927Z'
    const agoraIso = new Date().toISOString()

    // Objeto limpo e correto do destinatário respondido
    const destCorrigido = [
      {
        cliente_id: '50vyppm3qwwuz62',
        nome: 'Delfos Engenharia Ltda',
        telefone: '54 9 8110-8228',
        status: 'respondido',
        marcacao_resposta: 'respondeu',
        marcacao_data: dataResp,
        respondido_em: dataResp,
        motivo_saida: 'Resposta detectada automaticamente via WhatsApp',
        data_envio_inicial: '2026-10-28T18:16:29.986Z',
        fluxo_atual_id: 'j8jvs41gncsyduh',
        origem_entrada: 'por_disparo',
        proximo_envio_data: undefined,
        proxima_etapa_nome: undefined,
        etapas_executadas: [],
        trilha: [
          {
            fluxo_id: 'j8jvs41gncsyduh',
            fluxo_nome: 'Fluxo Follow-up 1',
            motivo: 'Resposta detectada automaticamente',
            resposta_detectada: true,
            mensagem_id: 'xs9269gh01cnfum',
            preview_mensagem: 'Ok',
            data: dataResp,
          },
        ],
      },
    ]

    const stats = {
      total: 1,
      pendentes: 0,
      respondidos: 1,
      atendidos: 0,
      bloqueados: 0,
      finalizados: 0,
      reenvios_1_enviados: 0,
      reenvios_2_enviados: 0,
      ultima_verificacao: agoraIso,
    }

    lote.set('destinatarios', destCorrigido)
    lote.set('estatisticas', stats)
    lote.set('total_destinatarios', 1)
    lote.set('status', 'concluido')
    app.save(lote)

    console.log(
      `[MIGRATION 1745260085] Lote ${loteId} corrigido com sucesso com status='respondido'`,
    )
  },
  (app) => {},
)

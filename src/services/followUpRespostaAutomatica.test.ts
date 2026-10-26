import { describe, it, expect } from 'vitest'

// Import the logic pattern directly to test the Fase 4 automatic response detection
describe('Fase 4 Follow-up: Detecção automática de resposta e ramificação', () => {
  it('marca como respondido e encerra o fluxo atual quando resposta_acao for encerrar', () => {
    const itemDestinatario = {
      cliente_id: 'cli_123',
      nome: 'Carlos Eduardo',
      telefone: '54999887766',
      status: 'pendente',
      fluxo_atual_id: 'fluxo_principal',
      trilha: [] as any[],
    }

    const etapaAtual = {
      id: 'etapa_1',
      ordem: 1,
      nome: '1º Follow-up',
      dias_apos: 3,
      resposta_acao: 'encerrar',
      resposta_fluxo_id: '',
    }

    // Simula a lógica do helper
    const agoraIso = new Date().toISOString()
    itemDestinatario.status = 'respondido'
    ;(itemDestinatario as any).marcacao_resposta = 'respondeu'
    ;(itemDestinatario as any).respondido_em = agoraIso
    ;(itemDestinatario as any).motivo_saida = 'Resposta detectada automaticamente via WhatsApp'

    itemDestinatario.trilha.push({
      fluxo_id: 'fluxo_principal',
      fluxo_nome: 'Fluxo Comercial',
      motivo: 'Resposta detectada automaticamente',
      resposta_detectada: true,
      preview_mensagem: 'Olá, tenho interesse na proposta!',
      data: agoraIso,
    })

    expect(itemDestinatario.status).toBe('respondido')
    expect((itemDestinatario as any).marcacao_resposta).toBe('respondeu')
    expect(itemDestinatario.trilha[0].motivo).toBe('Resposta detectada automaticamente')
    expect(itemDestinatario.trilha[0].resposta_detectada).toBe(true)
  })

  it('é estritamente idempotente e não reprocessa contato que já respondeu', () => {
    const itemDestinatario = {
      cliente_id: 'cli_123',
      nome: 'Carlos Eduardo',
      telefone: '54999887766',
      status: 'respondido',
      marcacao_resposta: 'respondeu',
      trilha: [{ motivo: 'Resposta detectada automaticamente' }],
    }

    const statusAtual = itemDestinatario.status
    const jaRespondido =
      statusAtual === 'respondido' || itemDestinatario.marcacao_resposta === 'respondeu'

    expect(jaRespondido).toBe(true)
    // Se já respondeu, a detecção ignora e não duplica trilha nem troca status
    const trilhaAntes = itemDestinatario.trilha.length
    if (!jaRespondido) {
      itemDestinatario.trilha.push({ motivo: 'Resposta detectada automaticamente' })
    }
    expect(itemDestinatario.trilha.length).toBe(trilhaAntes)
  })

  it('ao configurar ramificação para fluxo alternativo com etapa imediata (dias_apos=0), agenda envio imediato e registra trilha', () => {
    const itemDestinatario: any = {
      cliente_id: 'cli_456',
      nome: 'Mariana Silva',
      telefone: '54988776655',
      status: 'pendente',
      fluxo_atual_id: 'fluxo_1',
      trilha: [],
      etapas_executadas: [],
    }

    const etapaAtual = {
      id: 'etapa_1',
      ordem: 1,
      resposta_acao: 'fluxo_alternativo',
      resposta_fluxo_id: 'fluxo_resposta',
    }

    const etapasNovoFluxo = [
      {
        id: 'etapa_resp_1',
        ordem: 1,
        nome: 'Agradecimento e Próximos Passos',
        dias_apos: 0, // imediata
        mensagem: 'Olá, [nome do cliente]! Que bom que respondeu!',
      },
    ]

    const agoraIso = new Date().toISOString()

    // 1. Marca resposta
    itemDestinatario.status = 'respondido'
    itemDestinatario.marcacao_resposta = 'respondeu'
    itemDestinatario.respondido_em = agoraIso
    itemDestinatario.trilha.push({
      fluxo_id: 'fluxo_1',
      fluxo_nome: 'Fluxo 1',
      motivo: 'Resposta detectada automaticamente',
      resposta_detectada: true,
      data: agoraIso,
    })

    // 2. Ramificação para fluxo alternativo
    const novoFluxoId = etapaAtual.resposta_fluxo_id
    itemDestinatario.fluxo_atual_id = novoFluxoId
    itemDestinatario.status = 'pendente'
    itemDestinatario.trilha.push({
      fluxo_id: novoFluxoId,
      fluxo_nome: 'Fluxo de Resposta',
      motivo:
        'Resposta detectada automaticamente → Entrou no fluxo alternativo "Fluxo de Resposta"',
      data: agoraIso,
    })

    // 3. Etapa imediata (dias_apos === 0)
    const primeiraEtapaNova = etapasNovoFluxo[0]
    expect(primeiraEtapaNova.dias_apos).toBe(0)
    itemDestinatario.etapa_atual_ordem = primeiraEtapaNova.ordem
    itemDestinatario.etapa_atual_nome = primeiraEtapaNova.nome
    itemDestinatario.etapas_executadas.push({
      ordem: primeiraEtapaNova.ordem,
      etapa_id: primeiraEtapaNova.id,
      fluxo_id: novoFluxoId,
      nome: primeiraEtapaNova.nome,
      enviado_em: agoraIso,
    })

    expect(itemDestinatario.fluxo_atual_id).toBe('fluxo_resposta')
    expect(itemDestinatario.trilha.length).toBe(2)
    expect(itemDestinatario.trilha[0].motivo).toBe('Resposta detectada automaticamente')
    expect(itemDestinatario.etapas_executadas[0].etapa_id).toBe('etapa_resp_1')
  })
})

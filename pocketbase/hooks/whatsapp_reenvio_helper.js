// Helper compartilhado para execução de verificação de reenvio de disparos em massa.
// No PocketBase pb_hooks, módulos require() mantêm isolamento por pool de VM.
// Fase 2: Suporta fluxos encadeados, regras de desvio por etapa (timeout sem resposta),
// condições automáticas de saída (negócio ganho, atividade agendada, não perturbe) e trilha de origem.

/**
 * Normaliza e gera todas as variações canônicas de um número de telefone brasileiro
 * para comparação bidirecional robusta com ou sem 9º dígito móvel e com ou sem DDI 55.
 *
 * Exemplos aceitos e que casam entre si:
 *   54984025311 <-> 555484025311 <-> 5484025311 <-> 5554984025311
 *   5499097236  <-> 555499097236  <-> 54999097236 <-> 5554999097236
 */
function gerarVariacoesTelefone(tel) {
  if (!tel) return []
  let s = String(tel).split('@')[0].split(':')[0].trim()
  let d = s.replace(/\D/g, '')
  while (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('0') && (d.length === 11 || d.length === 12)) {
    d = d.slice(1)
  }

  // Remove DDI 55 se presente no início
  let nacional = d
  if (nacional.startsWith('55') && (nacional.length === 12 || nacional.length === 13)) {
    nacional = nacional.slice(2)
  }

  // Se tem apenas 8 ou 9 dígitos (sem DDD), assume RS padrão DDD 54
  if (nacional.length === 8 || nacional.length === 9) {
    nacional = '54' + nacional
  }

  const variacoes = new Set()
  if (d) variacoes.add(d)
  if (nacional) variacoes.add(nacional)

  // Tratamento específico de DDD (2 dígitos) + número (8 ou 9 dígitos)
  if (nacional.length === 10) {
    // Ex: 54 84025311 (sem nono dígito)
    const ddd = nacional.slice(0, 2)
    const resto8 = nacional.slice(2) // 8 dígitos
    const com9 = ddd + '9' + resto8 // 54984025311

    variacoes.add(nacional) // 5484025311
    variacoes.add('55' + nacional) // 555484025311
    variacoes.add(com9) // 54984025311
    variacoes.add('55' + com9) // 5554984025311
    variacoes.add(resto8)
  } else if (nacional.length === 11) {
    // Ex: 54 9 84025311 (com nono dígito) OU 54 99097236 se fosse número menor
    const ddd = nacional.slice(0, 2)
    const digito9 = nacional.charAt(2)
    const resto = nacional.slice(3) // 8 dígitos
    variacoes.add(nacional) // 54984025311
    variacoes.add('55' + nacional) // 5554984025311

    if (digito9 === '9') {
      const sem9 = ddd + resto // 5484025311
      variacoes.add(sem9)
      variacoes.add('55' + sem9)
    }
    variacoes.add(nacional.slice(2)) // 984025311
    variacoes.add(resto) // 84025311
  }

  // Sempre adicionar os últimos 8 dígitos como variação mínima segura
  if (nacional.length >= 8) {
    variacoes.add(nacional.slice(-8))
  }

  return Array.from(variacoes)
}

/**
 * Compara dois telefones considerando qualquer variação válida de DDI e 9º dígito
 */
function telefonesCasamBidirecional(telA, telB) {
  if (!telA || !telB) return false
  const limpoA = String(telA).replace(/\D/g, '')
  const limpoB = String(telB).replace(/\D/g, '')
  if (!limpoA || !limpoB) return false
  if (limpoA === limpoB) return true

  const varsA = gerarVariacoesTelefone(telA)
  const setB = new Set(gerarVariacoesTelefone(telB))

  for (let i = 0; i < varsA.length; i++) {
    const v = varsA[i]
    if (setB.has(v)) {
      // Se a variação for apenas os 8 dígitos finais, conferir se os DDDs (se existirem) batem
      if (v.length === 8) {
        const dddA =
          limpoA.length >= 10
            ? limpoA.startsWith('55')
              ? limpoA.slice(2, 4)
              : limpoA.slice(0, 2)
            : ''
        const dddB =
          limpoB.length >= 10
            ? limpoB.startsWith('55')
              ? limpoB.slice(2, 4)
              : limpoB.slice(0, 2)
            : ''
        if (dddA && dddB && dddA !== dddB) {
          continue
        }
      }
      return true
    }
  }

  // Fallback para os 8 últimos dígitos se o DDD coincidir ou for ausente
  if (limpoA.length >= 8 && limpoB.length >= 8) {
    const last8A = limpoA.slice(-8)
    const last8B = limpoB.slice(-8)
    if (last8A === last8B) {
      const dddA =
        limpoA.length >= 10
          ? limpoA.startsWith('55')
            ? limpoA.slice(2, 4)
            : limpoA.slice(0, 2)
          : ''
      const dddB =
        limpoB.length >= 10
          ? limpoB.startsWith('55')
            ? limpoB.slice(2, 4)
            : limpoB.slice(0, 2)
          : ''
      if (!dddA || !dddB || dddA === dddB) {
        return true
      }
    }
  }

  return false
}

function carregarEtapasDoFluxo(app, fluxoId) {
  if (!fluxoId) return []
  try {
    const etapasRecs = app.findRecordsByFilter(
      'etapas_follow_up',
      `fluxo_id = '${fluxoId}' && ativa = true`,
      'ordem',
      50,
      0,
    )
    const etapas = []
    for (let i = 0; i < etapasRecs.length; i++) {
      const rec = etapasRecs[i]
      const ordemVal = rec.getInt('ordem') || i + 1
      const rawDiasApos = rec.get('dias_apos')
      // Se for a primeira etapa (ordem 1), permite 0 dias (imediato); caso contrário se nulo/inválido usa 1
      const diasAposVal =
        rawDiasApos !== null && rawDiasApos !== undefined && rawDiasApos !== ''
          ? Number(rawDiasApos)
          : ordemVal === 1
            ? 0
            : 1

      etapas.push({
        id: rec.id,
        ordem: ordemVal,
        nome: rec.getString('nome') || `Etapa ${i + 1}`,
        dias_apos: isNaN(diasAposVal) ? (ordemVal === 1 ? 0 : 1) : Math.max(0, diasAposVal),
        mensagem: rec.getString('mensagem') || '',
        desvio_acao: rec.getString('desvio_acao') || 'nenhuma',
        desvio_dias: rec.getInt('desvio_dias') || 0,
        desvio_fluxo_id: rec.getString('desvio_fluxo_id') || '',
        resposta_acao: rec.getString('resposta_acao') || 'encerrar',
        resposta_fluxo_id: rec.getString('resposta_fluxo_id') || '',
      })
    }
    // Ordena garantindo ordem crescente
    etapas.sort((a, b) => a.ordem - b.ordem)
    return etapas
  } catch (err) {
    console.log('[REENVIO MASSA] Erro ao carregar etapas do fluxo:', err)
    return []
  }
}

function carregarNomeFluxo(app, fluxoId) {
  if (!fluxoId) return ''
  try {
    const fRec = app.findRecordById('fluxos_follow_up', fluxoId)
    if (fRec) return fRec.getString('nome') || ''
  } catch (_) {}
  return ''
}

function carregarFluxoPadraoId(app) {
  try {
    const padraoRecs = app.findRecordsByFilter(
      'fluxos_follow_up',
      'is_padrao = true && ativo = true',
      '-created',
      1,
      0,
    )
    if (padraoRecs && padraoRecs.length > 0) {
      return padraoRecs[0].id
    }
  } catch (_) {}
  return ''
}

/**
 * Checa condições de saída que encerram o fluxo automaticamente:
 * 1. Negócio vinculado fechado / ganho (status = 'ganho' ou etapa_funil = 'contrato assinado')
 * 2. Atividade agendada para o cliente (status = 'agendada' ou 'pendente' com data futura/recente)
 * 3. Marcação manual "não perturbe"
 */
function checarCondicaoSaida(app, item, dataDisparoMs) {
  // 1. Marcação manual "não perturbe" ou opt-out
  if (item.marcacao_resposta === 'nao_perturbe' || item.status === 'nao_perturbe') {
    return {
      saiu: true,
      motivo: 'Marcação "Não Perturbe" ativada para o destinatário',
    }
  }

  const clienteId = item.cliente_id
  if (!clienteId || clienteId.startsWith('demo_')) {
    return { saiu: false }
  }

  // 2. Negócio vinculado fechado/ganho
  try {
    const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')
    const filtroNegocio = `cliente_id = '${clienteId}' && (status = 'ganho' || etapa_funil = 'contrato assinado') && updated >= '${dataMinimaIso}'`
    const negociosFechados = app.findRecordsByFilter('negocios', filtroNegocio, '-updated', 1, 0)
    if (negociosFechados && negociosFechados.length > 0) {
      const neg = negociosFechados[0]
      const tituloNeg = neg.getString('titulo') || 'Negócio'
      return {
        saiu: true,
        motivo: `Negócio fechado/ganho: ${tituloNeg}`,
      }
    }
  } catch (errNeg) {
    console.log('[REENVIO MASSA] Erro ao checar negócios fechados:', errNeg)
  }

  // 3. Atividade agendada para o cliente (sinal de engajamento comercial)
  try {
    const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')
    const filtroAtv = `cliente_id = '${clienteId}' && (status = 'agendada' || status = 'pendente') && created >= '${dataMinimaIso}'`
    const atividadesRecentes = app.findRecordsByFilter('atividades', filtroAtv, '-created', 1, 0)
    if (atividadesRecentes && atividadesRecentes.length > 0) {
      const atv = atividadesRecentes[0]
      const tituloAtv = atv.getString('titulo') || atv.getString('tipo') || 'Atividade'
      return {
        saiu: true,
        motivo: `Atividade agendada recente: ${tituloAtv}`,
      }
    }
  } catch (errAtv) {
    console.log('[REENVIO MASSA] Erro ao checar atividades agendadas:', errAtv)
  }

  return { saiu: false }
}

function processarReenviosDisparosMassa(app) {
  const agora = new Date()
  const agoraIso = agora.toISOString()
  const logs = []

  let lotesAtivos = []
  try {
    lotesAtivos = app.findRecordsByFilter(
      'disparos_massa',
      "status = 'ativo' && reenvio_ativo = true",
      'created',
      50,
      0,
    )
  } catch (err) {
    console.log('[REENVIO MASSA] Erro ao buscar lotes ativos:', err)
    return { error: String(err), lotesProcessados: 0 }
  }

  if (!lotesAtivos || lotesAtivos.length === 0) {
    return { lotesProcessados: 0, mensagem: 'Nenhum lote ativo com reenvio pendente' }
  }

  // Carregar lista de telefones bloqueados para exclusão rápida
  const telefonesBloqueados = new Set()
  try {
    const bloqueadosRecs = app.findRecordsByFilter('whatsapp_bloqueados', '', '', 1000, 0)
    for (let b = 0; b < bloqueadosRecs.length; b++) {
      const numB = (bloqueadosRecs[b].getString('numero') || '').replace(/\D/g, '')
      if (numB) {
        telefonesBloqueados.add(numB)
        if (numB.startsWith('55')) {
          telefonesBloqueados.add(numB.substring(2))
        }
      }
    }
  } catch (_) {}

  const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
  let totalReenviosAgendados = 0
  const fluxoPadraoFallbackId = carregarFluxoPadraoId(app)

  for (let l = 0; l < lotesAtivos.length; l++) {
    const lote = lotesAtivos[l]
    let destinatarios = []
    try {
      const rawDest = lote.get('destinatarios')
      destinatarios = typeof rawDest === 'string' ? JSON.parse(rawDest) : rawDest || []
    } catch (_) {
      destinatarios = []
    }

    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
      continue
    }

    const fluxoInicialId = lote.getString('fluxo_id') || fluxoPadraoFallbackId
    const intervaloSegundos = Math.max(5, lote.getInt('intervalo_segundos') || 60)
    const intervalMs = intervaloSegundos * 1000

    // Data de base do disparo inicial
    const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
    const dataDisparoMs = new Date(dataDisparoStr).getTime()

    let loteModificado = false
    let reenviosAgendadosLote = 0

    // Hora base para agendar novos reenvios: agora + pequeno buffer
    let agendamentoBaseMs = agora.getTime() + 10000

    for (let d = 0; d < destinatarios.length; d++) {
      const item = destinatarios[d]
      if (!item) continue

      const statusAtual = item.status || 'pendente'

      // Se já foi finalizado, respondido, atendido na central, ou sem whatsapp/bloqueado/não perturbe, pular
      if (
        statusAtual === 'respondido' ||
        statusAtual === 'atendido' ||
        statusAtual === 'finalizado' ||
        statusAtual === 'bloqueado' ||
        statusAtual === 'sem_whatsapp' ||
        statusAtual === 'nao_perturbe' ||
        statusAtual === 'arquivado'
      ) {
        continue
      }

      const telefoneLimpo = (item.telefone || '').replace(/\D/g, '')
      if (!telefoneLimpo || telefoneLimpo.length < 10) {
        item.status = 'sem_whatsapp'
        item.motivo_saida = 'Sem WhatsApp ou telefone válido'
        loteModificado = true
        continue
      }

      // Verificar se número está bloqueado
      if (
        telefonesBloqueados.has(telefoneLimpo) ||
        telefonesBloqueados.has(telefoneLimpo.replace(/^55/, ''))
      ) {
        item.status = 'bloqueado'
        item.motivo_saida = 'Contato bloqueado no WhatsApp'
        loteModificado = true
        continue
      }

      // 1. CHECAGEM DE MARCAÇÃO MANUAL
      if (item.marcacao_resposta === 'nao_perturbe') {
        item.status = 'nao_perturbe'
        item.motivo_saida = 'Marcado manualmente como "Não Perturbe"'
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      if (item.marcacao_resposta === 'respondeu' || item.marcacao_resposta === 'interessado') {
        item.status = 'respondido'
        item.respondido_em = item.marcacao_data || agoraIso
        item.motivo_saida =
          item.marcacao_resposta === 'interessado'
            ? 'Marcado manualmente: Cliente Interessado'
            : 'Marcado manualmente: Cliente Respondeu'
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // 2. CONDIÇÕES DE SAÍDA AUTOMÁTICAS (Negócio ganho, Atividade agendada recente)
      const checagemSaida = checarCondicaoSaida(app, item, dataDisparoMs)
      if (checagemSaida.saiu) {
        item.status = 'finalizado'
        item.motivo_saida = checagemSaida.motivo || 'Condição de saída atendida'
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // 3. CHECAGEM SE RESPONDEU NO WHATSAPP (mensagem recebida após o disparo inicial)
      let houveResposta = false
      let respostaData = ''
      try {
        const dataMinimaIso = new Date(dataDisparoMs).toISOString().replace('T', ' ')
        const variacoesTel = gerarVariacoesTelefone(telefoneLimpo)

        // Tentar primeiro por cliente_id se cadastrado
        if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
          const filtroPorCli = `direcao = 'recebida' && created >= '${dataMinimaIso}' && cliente_id = '${item.cliente_id}'`
          const msgsCli = app.findRecordsByFilter(
            'whatsapp_mensagens',
            filtroPorCli,
            '-created',
            1,
            0,
          )
          if (msgsCli && msgsCli.length > 0) {
            houveResposta = true
            respostaData = msgsCli[0].getString('created')
          }
        }

        // Se ainda não achou por cliente_id, buscar mensagens recebidas recentes e comparar com normalização bidirecional
        if (!houveResposta && variacoesTel.length > 0) {
          const ult8 = telefoneLimpo.slice(-8)
          const filtroPorTel = `direcao = 'recebida' && created >= '${dataMinimaIso}' && telefone_destino ~ '${ult8}'`
          const msgsTel = app.findRecordsByFilter(
            'whatsapp_mensagens',
            filtroPorTel,
            '-created',
            20,
            0,
          )
          for (let m = 0; m < msgsTel.length; m++) {
            const msgT = msgsTel[m].getString('telefone_destino') || ''
            if (telefonesCasamBidirecional(msgT, telefoneLimpo)) {
              houveResposta = true
              respostaData = msgsTel[m].getString('created')
              break
            }
          }
        }
      } catch (errResp) {
        console.log('[REENVIO MASSA] Erro ao checar resposta do cliente:', errResp)
      }

      if (houveResposta) {
        item.status = 'respondido'
        item.respondido_em = respostaData || agoraIso
        item.motivo_saida = 'Cliente respondeu à mensagem no WhatsApp'
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // 4. CHECAGEM SE FOI ATENDIDO NA CENTRAL
      let foiAtendidoCentral = false
      try {
        const filtroConv = `cliente_id = '${item.cliente_id}' || numero ~ '${telefoneLimpo.replace(/^55/, '')}'`
        const conversas = app.findRecordsByFilter(
          'whatsapp_conversas',
          filtroConv,
          '-updated',
          5,
          0,
        )
        for (let c = 0; c < conversas.length; c++) {
          const conv = conversas[c]
          const convStatus = conv.getString('status')
          const atendente = conv.getString('atendente')
          const convUpdated = new Date(
            conv.getString('updated') || conv.getString('created'),
          ).getTime()

          if (convUpdated >= dataDisparoMs) {
            if (convStatus === 'em_atendimento' || convStatus === 'resolvido' || atendente) {
              foiAtendidoCentral = true
              break
            }
          }
        }
      } catch (errConv) {
        console.log('[REENVIO MASSA] Erro ao checar conversa na Central:', errConv)
      }

      if (foiAtendidoCentral) {
        item.status = 'atendido'
        item.atendido_em = agoraIso
        item.motivo_saida = 'Atendido na Central de Atendimento'
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // 5. DETERMINA QUAL FLUXO O DESTINATÁRIO ESTÁ SEGUINDO ATUALMENTE
      const fluxoAtualId = item.fluxo_atual_id || fluxoInicialId
      let etapasAtivas = carregarEtapasDoFluxo(app, fluxoAtualId)

      // Fallback de retrocompatibilidade para lotes antigos sem fluxo estruturado
      const textoReenvio1 = lote.getString('texto_reenvio_1') || ''
      const textoReenvio2 = lote.getString('texto_reenvio_2') || ''
      if (etapasAtivas.length === 0 && (textoReenvio1 || textoReenvio2)) {
        if (textoReenvio1) {
          etapasAtivas.push({
            id: 'etapa_compat_1',
            ordem: 1,
            nome: '1º Reenvio (+3d)',
            dias_apos: 3,
            mensagem: textoReenvio1,
            desvio_acao: 'nenhuma',
            desvio_dias: 0,
            desvio_fluxo_id: '',
          })
        }
        if (textoReenvio2) {
          etapasAtivas.push({
            id: 'etapa_compat_2',
            ordem: 2,
            nome: '2º Reenvio (+90d)',
            dias_apos: 90,
            mensagem: textoReenvio2,
            desvio_acao: 'nenhuma',
            desvio_dias: 0,
            desvio_fluxo_id: '',
          })
        }
      }

      // Se não há etapas no fluxo, finaliza
      if (etapasAtivas.length === 0) {
        item.status = 'finalizado'
        item.motivo_saida = 'Nenhuma etapa ativa configurada no fluxo'
        item.proximo_envio_data = undefined
        loteModificado = true
        continue
      }

      // Inicializa estrutura de etapas_executadas se não existir
      if (!Array.isArray(item.etapas_executadas)) {
        item.etapas_executadas = []
        if (item.reenvio_1_data) {
          item.etapas_executadas.push({
            ordem: 1,
            nome: '1º Reenvio (+3d)',
            enviado_em: item.reenvio_1_data,
            mensagem_id: item.reenvio_1_msg_id,
          })
        }
        if (item.reenvio_2_data) {
          item.etapas_executadas.push({
            ordem: 2,
            nome: '2º Reenvio (+90d)',
            enviado_em: item.reenvio_2_data,
            mensagem_id: item.reenvio_2_msg_id,
          })
        }
      }

      // Inicializa estrutura de trilha se não existir
      if (!Array.isArray(item.trilha)) {
        item.trilha = []
        const nomeOrigem = carregarNomeFluxo(app, fluxoInicialId) || 'Fluxo Inicial'
        item.trilha.push({
          fluxo_id: fluxoInicialId,
          fluxo_nome: nomeOrigem,
          motivo: 'Entrada inicial no disparo em massa',
          data: item.data_envio_inicial || dataDisparoStr,
        })
      }

      // Descobre a última execução deste destinatário no fluxo atual
      let ultimaExecucaoFluxoAtual = null
      for (let ex = item.etapas_executadas.length - 1; ex >= 0; ex--) {
        const eExec = item.etapas_executadas[ex]
        if (!eExec.fluxo_id || eExec.fluxo_id === fluxoAtualId) {
          ultimaExecucaoFluxoAtual = eExec
          break
        }
      }

      let ultimaOrdemExecutada = 0
      let dataUltimoEnvioMs = dataDisparoMs
      let ultimaEtapaObj = null

      if (ultimaExecucaoFluxoAtual) {
        ultimaOrdemExecutada = ultimaExecucaoFluxoAtual.ordem
        if (ultimaExecucaoFluxoAtual.enviado_em) {
          dataUltimoEnvioMs = new Date(ultimaExecucaoFluxoAtual.enviado_em).getTime()
        }
        if (ultimaExecucaoFluxoAtual.etapa_id) {
          ultimaEtapaObj = etapasAtivas.find((e) => e.id === ultimaExecucaoFluxoAtual.etapa_id)
        }
      } else if (item.etapas_executadas.length > 0) {
        // Se houve desvio de fluxo anterior mas ainda não disparou nenhuma do fluxo novo
        const ultimaGeral = item.etapas_executadas[item.etapas_executadas.length - 1]
        if (ultimaGeral.enviado_em) {
          dataUltimoEnvioMs = new Date(ultimaGeral.enviado_em).getTime()
        }
      } else if (item.reenvio_2_data) {
        ultimaOrdemExecutada = 2
        dataUltimoEnvioMs = new Date(item.reenvio_2_data).getTime()
      } else if (item.reenvio_1_data) {
        ultimaOrdemExecutada = 1
        dataUltimoEnvioMs = new Date(item.reenvio_1_data).getTime()
      }

      // 6. REGRA DE DESVIO POR ETAPA (TIMEOUT POR AUSÊNCIA DE RESPOSTA)
      // Se a última etapa enviada configurava um desvio ("sem resposta em X dias")
      // e o timeout venceu, aciona a ação de desvio
      if (
        ultimaEtapaObj &&
        ultimaEtapaObj.desvio_acao &&
        ultimaEtapaObj.desvio_acao !== 'nenhuma' &&
        ultimaEtapaObj.desvio_dias > 0 &&
        (!item.marcacao_resposta || item.marcacao_resposta === 'sem_resposta')
      ) {
        const timeoutMs = ultimaEtapaObj.desvio_dias * 24 * 60 * 60 * 1000
        const tempoDecorridoMs = agora.getTime() - dataUltimoEnvioMs

        if (tempoDecorridoMs >= timeoutMs) {
          // Ação: Arquivar / Parar de enviar
          if (ultimaEtapaObj.desvio_acao === 'arquivar') {
            item.status = 'arquivado'
            item.motivo_saida = `Desvio da etapa "${ultimaEtapaObj.nome}": arquivado por ausência de resposta após ${ultimaEtapaObj.desvio_dias} dia(s)`
            item.proximo_envio_data = undefined
            item.proxima_etapa_nome = undefined
            loteModificado = true

            item.trilha.push({
              fluxo_id: fluxoAtualId,
              fluxo_nome: carregarNomeFluxo(app, fluxoAtualId),
              etapa_id: ultimaEtapaObj.id,
              etapa_nome: ultimaEtapaObj.nome,
              motivo: `Desvio sem resposta em ${ultimaEtapaObj.desvio_dias}d → Arquivado`,
              data: agoraIso,
            })
            continue
          }

          // Ação: Entrar no fluxo alternativo Y
          if (
            ultimaEtapaObj.desvio_acao === 'fluxo_alternativo' &&
            ultimaEtapaObj.desvio_fluxo_id &&
            ultimaEtapaObj.desvio_fluxo_id !== fluxoAtualId // Evita auto-loop direto
          ) {
            const novoFluxoId = ultimaEtapaObj.desvio_fluxo_id
            const nomeNovoFluxo = carregarNomeFluxo(app, novoFluxoId) || 'Fluxo Alternativo'

            // Validação de ciclo na trilha: se já passou mais de 2 vezes pelo mesmo fluxo, encerra
            const vezesPassou = item.trilha.filter((t) => t.fluxo_id === novoFluxoId).length
            if (vezesPassou >= 2) {
              item.status = 'finalizado'
              item.motivo_saida = `Encerrado para prevenir ciclo circular no fluxo "${nomeNovoFluxo}"`
              item.proximo_envio_data = undefined
              loteModificado = true
              continue
            }

            // Realiza o desvio para o novo fluxo
            item.fluxo_atual_id = novoFluxoId
            item.fluxo_origem_id = fluxoAtualId
            item.fluxo_origem_nome = carregarNomeFluxo(app, fluxoAtualId)
            item.desvio_motivo = `Sem resposta após ${ultimaEtapaObj.desvio_dias}d na etapa "${ultimaEtapaObj.nome}"`

            item.trilha.push({
              fluxo_id: novoFluxoId,
              fluxo_nome: nomeNovoFluxo,
              fluxo_anterior_id: fluxoAtualId,
              fluxo_anterior_nome: item.fluxo_origem_nome,
              etapa_origem_id: ultimaEtapaObj.id,
              etapa_origem_nome: ultimaEtapaObj.nome,
              motivo: `Desvio sem resposta após ${ultimaEtapaObj.desvio_dias}d → Entrou em "${nomeNovoFluxo}"`,
              data: agoraIso,
            })

            // Recarrega etapas do novo fluxo e reinicia a régua a partir da 1ª etapa ativa
            etapasAtivas = carregarEtapasDoFluxo(app, novoFluxoId)
            ultimaOrdemExecutada = 0
            loteModificado = true
            logs.push(
              `Lote ${lote.id}: Destinatário ${item.nome} desviado do fluxo ${fluxoAtualId} para ${novoFluxoId} ("${nomeNovoFluxo}")`,
            )
          }
        }
      }

      // Encontra a próxima etapa ativa cuja ordem seja superior a ultimaOrdemExecutada
      let proximaEtapa = null
      for (let e = 0; e < etapasAtivas.length; e++) {
        if (etapasAtivas[e].ordem > ultimaOrdemExecutada) {
          proximaEtapa = etapasAtivas[e]
          break
        }
      }

      // Se não há mais etapas no fluxo
      if (!proximaEtapa) {
        // Se já passou 7 dias da última etapa sem resposta, marca como finalizado
        if (agora.getTime() - dataUltimoEnvioMs >= 7 * 24 * 60 * 60 * 1000) {
          item.status = 'finalizado'
          item.motivo_saida = 'Concluídas todas as etapas do fluxo sem resposta'
          item.proximo_envio_data = undefined
          loteModificado = true
        }
        continue
      }

      // Calcula o prazo para a próxima etapa: dias_apos contados do último envio (ou disparo inicial)
      // Se for a primeira etapa (ordem 1) com dias_apos = 0, o envio é imediato junto ao agendamento/disparo do lote
      const isPrimeiraEtapa = proximaEtapa.ordem === 1 || ultimaOrdemExecutada === 0
      const prazoDias =
        isPrimeiraEtapa && proximaEtapa.dias_apos === 0
          ? 0
          : Math.max(1, typeof proximaEtapa.dias_apos === 'number' ? proximaEtapa.dias_apos : 1)
      const prazoMs = prazoDias * 24 * 60 * 60 * 1000
      // Se prazoDias === 0, deve disparar na hora do agendamento do lote (dataDisparoMs ou agora, sem gerar agendamento no passado)
      const dataPrevistaEnvioMs =
        prazoDias === 0 ? Math.max(dataDisparoMs, agora.getTime()) : dataUltimoEnvioMs + prazoMs
      const dataPrevistaIso = new Date(dataPrevistaEnvioMs).toISOString()

      item.proximo_envio_data = dataPrevistaIso
      item.proxima_etapa_nome = proximaEtapa.nome
      if (!item.etapa_atual_nome) {
        item.etapa_atual_nome =
          ultimaOrdemExecutada > 0 ? `Etapa ${ultimaOrdemExecutada}` : 'Início'
      }

      // Verifica se o prazo venceu
      if (agora.getTime() >= dataPrevistaEnvioMs) {
        if (!proximaEtapa.mensagem) {
          // Pula etapa sem mensagem
          ultimaOrdemExecutada = proximaEtapa.ordem
          continue
        }

        // Agendar envio da etapa
        const agendadoParaIso = new Date(
          agendamentoBaseMs + reenviosAgendadosLote * intervalMs,
        ).toISOString()
        reenviosAgendadosLote++
        totalReenviosAgendados++

        // Substituição de placeholders consistente
        let textoFinal = proximaEtapa.mensagem
        textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, item.nome || 'Cliente')
        textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
        textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, item.nome || 'Cliente')

        let cleanPhone = telefoneLimpo
        if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone
        }

        // Criar registro na fila de whatsapp_mensagens
        const novaMsg = new Record(msgsCol)
        if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
          novaMsg.set('cliente_id', item.cliente_id)
        }
        novaMsg.set('telefone_destino', cleanPhone)
        novaMsg.set('conteudo_final', textoFinal)
        novaMsg.set('status', 'agendada')
        novaMsg.set('agendado_para', agendadoParaIso)
        novaMsg.set('tipo_disparo', `massa_fluxo_etapa_${proximaEtapa.ordem}`)
        novaMsg.set(
          'referencia_id',
          `lote_${lote.id}_f${fluxoAtualId}_e${proximaEtapa.ordem}_${item.cliente_id || cleanPhone}`,
        )
        app.save(novaMsg)

        // Atualizar estado do destinatário
        item.etapas_executadas.push({
          ordem: proximaEtapa.ordem,
          etapa_id: proximaEtapa.id,
          fluxo_id: fluxoAtualId,
          nome: proximaEtapa.nome,
          enviado_em: agendadoParaIso,
          mensagem_id: novaMsg.id,
        })

        item.etapa_atual_ordem = proximaEtapa.ordem
        item.etapa_atual_nome = proximaEtapa.nome

        // Retrocompatibilidade com reenvio_1 / reenvio_2 existentes
        if (proximaEtapa.ordem === 1) {
          item.status = 'reenvio_1_agendado'
          item.reenvio_1_data = agendadoParaIso
          item.reenvio_1_msg_id = novaMsg.id
        } else if (proximaEtapa.ordem === 2) {
          item.status = 'reenvio_2_agendado'
          item.reenvio_2_data = agendadoParaIso
          item.reenvio_2_msg_id = novaMsg.id
        } else {
          item.status = 'pendente'
        }

        // Próximo envio se houver mais etapas
        let subsequente = null
        for (let nextIdx = 0; nextIdx < etapasAtivas.length; nextIdx++) {
          if (etapasAtivas[nextIdx].ordem > proximaEtapa.ordem) {
            subsequente = etapasAtivas[nextIdx]
            break
          }
        }
        if (subsequente) {
          const proxPrazoDias = Math.max(
            1,
            typeof subsequente.dias_apos === 'number' ? subsequente.dias_apos : 1,
          )
          const proxPrazoMs = proxPrazoDias * 24 * 60 * 60 * 1000
          item.proximo_envio_data = new Date(agora.getTime() + proxPrazoMs).toISOString()
          item.proxima_etapa_nome = subsequente.nome
        } else {
          item.proximo_envio_data = undefined
          item.proxima_etapa_nome = undefined
        }

        loteModificado = true
        logs.push(
          `Lote ${lote.id}: Etapa "${proximaEtapa.nome}" agendada para ${item.nome} (${cleanPhone}) para ${agendadoParaIso}`,
        )
      }
    }

    // Recalcular estatísticas do lote
    const stats = {
      total: destinatarios.length,
      pendentes: destinatarios.filter(
        (d) =>
          d.status === 'pendente' ||
          d.status === 'reenvio_1_agendado' ||
          d.status === 'reenvio_2_agendado',
      ).length,
      respondidos: destinatarios.filter((d) => d.status === 'respondido').length,
      atendidos: destinatarios.filter((d) => d.status === 'atendido').length,
      bloqueados: destinatarios.filter(
        (d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp',
      ).length,
      finalizados: destinatarios.filter(
        (d) => d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe',
      ).length,
      reenvios_1_enviados: destinatarios.filter(
        (d) =>
          Boolean(d.reenvio_1_data) || (d.etapas_executadas && d.etapas_executadas.length >= 1),
      ).length,
      reenvios_2_enviados: destinatarios.filter(
        (d) =>
          Boolean(d.reenvio_2_data) || (d.etapas_executadas && d.etapas_executadas.length >= 2),
      ).length,
      ultima_verificacao: agoraIso,
    }

    const todosFinalizados = stats.pendentes === 0

    if (loteModificado || todosFinalizados) {
      lote.set('destinatarios', destinatarios)
      lote.set('estatisticas', stats)
      if (todosFinalizados) {
        lote.set('status', 'concluido')
      }
      app.save(lote)
    }
  }

  return {
    lotesProcessados: lotesAtivos.length,
    reenviosAgendados: totalReenviosAgendados,
    logs,
  }
}

/**
 * Normaliza estágios do funil para comparação uniforme e tolerante (ex: 'negociação' == 'Negociação').
 */
function normalizarEstagioComparacao(str) {
  if (!str) return ''
  return String(str)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Avalia regras de entrada ativas para um cliente/negócio quando seu estágio muda.
 * Se houver regra ativa correspondente, insere o cliente/negócio no fluxo correspondente
 * criando ou atualizando o registro de lote/acompanhamento apropriado.
 *
 * Idempotente: se o cliente já está em acompanhamento ativo neste fluxo, não duplica.
 */
function avaliarEntradaAutomaticaEstagio(app, negocioRec, novoEstagio, estagioAnterior) {
  if (!negocioRec || !novoEstagio) return { entrou: false }

  const novoNorm = normalizarEstagioComparacao(novoEstagio)
  const anteriorNorm = normalizarEstagioComparacao(estagioAnterior)

  // Se não mudou o estágio de fato, nada a fazer
  if (novoNorm && anteriorNorm && novoNorm === anteriorNorm) {
    return { entrou: false, motivo: 'Estágio não alterado' }
  }

  const clienteId = negocioRec.getString('cliente_id')
  if (!clienteId || clienteId.startsWith('demo_')) {
    return { entrou: false, motivo: 'Sem cliente válido' }
  }

  let clienteRec = null
  try {
    clienteRec = app.findRecordById('clientes', clienteId)
  } catch (_) {}

  if (!clienteRec) {
    return { entrou: false, motivo: 'Cliente não encontrado' }
  }

  const clienteNome = clienteRec.getString('nome') || 'Cliente'
  const telBruto = clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || ''
  const telefoneLimpo = telBruto.replace(/\D/g, '')

  if (!telefoneLimpo || telefoneLimpo.length < 10) {
    return { entrou: false, motivo: 'Cliente sem telefone/WhatsApp válido' }
  }

  // 1. Buscar todas as regras ativas na coleção regras_entrada_fluxo
  let regrasAtivas = []
  try {
    regrasAtivas = app.findRecordsByFilter(
      'regras_entrada_fluxo',
      'ativo = true',
      'created',
      100,
      0,
    )
  } catch (errRegras) {
    console.log('[ENTRADA ESTAGIO] Aviso ao buscar regras_entrada_fluxo:', errRegras)
    return { entrou: false, error: String(errRegras) }
  }

  if (!regrasAtivas || regrasAtivas.length === 0) {
    return { entrou: false, motivo: 'Nenhuma regra de entrada ativa configurada' }
  }

  // 2. Mapear fluxos ativos que casam com o novo estágio
  const fluxosCorrespondentesIds = []
  for (let r = 0; r < regrasAtivas.length; r++) {
    const reg = regrasAtivas[r]
    const estRegra = reg.getString('estagio_funil')
    if (normalizarEstagioComparacao(estRegra) === novoNorm) {
      const fId = reg.getString('fluxo_id')
      if (fId && !fluxosCorrespondentesIds.includes(fId)) {
        fluxosCorrespondentesIds.push(fId)
      }
    }
  }

  if (fluxosCorrespondentesIds.length === 0) {
    return { entrou: false, motivo: 'Nenhuma regra corresponde ao estágio ' + novoEstagio }
  }

  const agora = new Date()
  const agoraIso = agora.toISOString()
  let entradasRealizadas = 0

  for (let fIdx = 0; fIdx < fluxosCorrespondentesIds.length; fIdx++) {
    const targetFluxoId = fluxosCorrespondentesIds[fIdx]

    // Checar se o fluxo em si está ativo
    let fluxoRec = null
    try {
      fluxoRec = app.findRecordById('fluxos_follow_up', targetFluxoId)
    } catch (_) {}

    if (!fluxoRec || !fluxoRec.getBool('ativo')) {
      continue
    }

    const fluxoNome = fluxoRec.getString('nome') || 'Fluxo Follow-up'

    // Checar idempotência: verificar se o cliente JÁ possui lote ativo neste fluxo
    // Procura em lotes ativos vinculados a este fluxo_id
    let jaAtivoNesseFluxo = false
    try {
      const lotesDoFluxo = app.findRecordsByFilter(
        'disparos_massa',
        `fluxo_id = '${targetFluxoId}' && status = 'ativo'`,
        '-created',
        50,
        0,
      )

      for (let l = 0; l < lotesDoFluxo.length; l++) {
        let dests = []
        try {
          const rawD = lotesDoFluxo[l].get('destinatarios')
          dests = typeof rawD === 'string' ? JSON.parse(rawD) : rawD || []
        } catch (_) {}

        const matchDest = dests.find(
          (d) =>
            d.cliente_id === clienteId &&
            d.status !== 'finalizado' &&
            d.status !== 'arquivado' &&
            d.status !== 'respondido' &&
            d.status !== 'atendido' &&
            d.status !== 'nao_perturbe' &&
            d.status !== 'bloqueado' &&
            d.status !== 'sem_whatsapp',
        )

        if (matchDest) {
          jaAtivoNesseFluxo = true
          break
        }
      }
    } catch (errCheck) {
      console.log('[ENTRADA ESTAGIO] Erro ao checar idempotência do lote:', errCheck)
    }

    if (jaAtivoNesseFluxo) {
      console.log(
        `[ENTRADA ESTAGIO] Cliente ${clienteNome} já possui acompanhamento ativo no fluxo "${fluxoNome}" (${targetFluxoId}). Entrada ignorada.`,
      )
      continue
    }

    // Carregar 1ª etapa ativa do fluxo para calcular prazo e agendamento
    const etapas = carregarEtapasDoFluxo(app, targetFluxoId)
    const primeiraEtapa = etapas.length > 0 ? etapas[0] : null
    const prazoDias = primeiraEtapa
      ? primeiraEtapa.dias_apos === 0
        ? 0
        : Math.max(1, primeiraEtapa.dias_apos || 1)
      : 3
    const dataPrevistaIso = new Date(
      agora.getTime() + prazoDias * 24 * 60 * 60 * 1000,
    ).toISOString()

    // Montar objeto destinatário com origem_entrada = automatica_por_estagio e trilha completa
    const novoDestinatario = {
      cliente_id: clienteId,
      nome: clienteNome,
      telefone: telefoneLimpo,
      status: 'pendente',
      origem_entrada: 'automatica_por_estagio',
      estagio_origem: novoEstagio,
      negocio_id: negocioRec.id,
      data_envio_inicial: agoraIso,
      fluxo_atual_id: targetFluxoId,
      proximo_envio_data: dataPrevistaIso,
      proxima_etapa_nome: primeiraEtapa ? primeiraEtapa.nome : '1º Follow-up',
      etapas_executadas: [],
      trilha: [
        {
          fluxo_id: targetFluxoId,
          fluxo_nome: fluxoNome,
          origem_entrada: 'automatica_por_estagio',
          estagio_gatilho: novoEstagio,
          motivo: `Entrou automaticamente — estágio "${novoEstagio}" → Fluxo "${fluxoNome}"`,
          data: agoraIso,
        },
      ],
    }

    // Localizar ou criar lote dedicado para acompanhamento por estágio deste fluxo
    try {
      const disparosCol = app.findCollectionByNameOrId('disparos_massa')
      const filtroLoteAuto = `fluxo_id = '${targetFluxoId}' && origem_entrada = 'automatica_por_estagio' && status = 'ativo'`
      const lotesAuto = app.findRecordsByFilter('disparos_massa', filtroLoteAuto, '-created', 1, 0)

      let loteParaAtualizar = null
      if (lotesAuto && lotesAuto.length > 0) {
        loteParaAtualizar = lotesAuto[0]
        let dests = []
        try {
          const raw = loteParaAtualizar.get('destinatarios')
          dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
        } catch (_) {}
        dests.push(novoDestinatario)
        loteParaAtualizar.set('destinatarios', dests)
        loteParaAtualizar.set('total_destinatarios', dests.length)
        app.save(loteParaAtualizar)
      } else {
        loteParaAtualizar = new Record(disparosCol)
        loteParaAtualizar.set('titulo', `Follow-up Automático por Estágio: ${fluxoNome}`)
        loteParaAtualizar.set('status', 'ativo')
        loteParaAtualizar.set('segmento', 'automatica_por_estagio')
        loteParaAtualizar.set('total_destinatarios', 1)
        loteParaAtualizar.set('intervalo_segundos', 60)
        loteParaAtualizar.set('data_disparo', agoraIso)
        loteParaAtualizar.set(
          'mensagem_original',
          `Entrada automática de contatos com estágio "${novoEstagio}" no fluxo "${fluxoNome}"`,
        )
        loteParaAtualizar.set('reenvio_ativo', true)
        loteParaAtualizar.set('fluxo_id', targetFluxoId)
        loteParaAtualizar.set('origem_entrada', 'automatica_por_estagio')
        loteParaAtualizar.set('destinatarios', [novoDestinatario])
        loteParaAtualizar.set('estatisticas', {
          total: 1,
          pendentes: 1,
          respondidos: 0,
          atendidos: 0,
          bloqueados: 0,
          finalizados: 0,
          reenvios_1_enviados: 0,
          reenvios_2_enviados: 0,
          ultima_verificacao: agoraIso,
        })
        app.save(loteParaAtualizar)
      }

      entradasRealizadas++
      console.log(
        `[ENTRADA ESTAGIO SUCESSO] Cliente ${clienteNome} entrou no fluxo "${fluxoNome}" por mudança de estágio para "${novoEstagio}".`,
      )
    } catch (errSaveLote) {
      console.log('[ENTRADA ESTAGIO] Erro ao salvar lote de acompanhamento:', errSaveLote)
    }
  }

  return {
    entrou: entradasRealizadas > 0,
    entradasRealizadas,
    estagio: novoEstagio,
  }
}

/**
 * FASE 4: Detecção automática de resposta do cliente via WhatsApp Webhook.
 *
 * Quando o webhook do WhatsApp receber mensagem de um cliente (não de grupo, não fromMe),
 * verifica se ele está em acompanhamento de follow-up ativo nos lotes de disparos_massa.
 *
 * Se estiver ativo:
 * 1. Marca automaticamente como 'Respondeu' (status: 'respondido', marcacao_resposta: 'respondeu', respondido_em: agora).
 * 2. Encerra o fluxo atual.
 * 3. Se a etapa/fluxo atual tiver ramificação de resposta configurada (resposta_acao === 'fluxo_alternativo' && resposta_fluxo_id):
 *    - Transfere o contato para o fluxo alternativo.
 *    - Carrega as etapas do fluxo alternativo.
 *    - Se a 1ª etapa tiver dias_apos = 0 (imediata), agenda envio imediato da mensagem desta etapa (respeitando o mesmo caminho de envio da fila).
 *    - Se dias_apos > 0, define proximo_envio_data = agora + dias_apos.
 * 4. Registra na trilha com a marcação exata: 'Resposta detectada automaticamente'.
 * 5. Idempotência estrita: se o destinatário já estiver marcado como 'respondido' ou com marcacao_resposta !== undefined (ou status inativo),
 *    não reprocessa nem re-entra em fluxos.
 */
function processarRespostaAutomaticaCliente(app, params) {
  const clienteId = params.clienteId || ''
  const telefoneRecebido = (params.telefone || '').replace(/\D/g, '')
  const mensagemRecebida = params.mensagem || ''
  const agora = new Date()
  const agoraIso = agora.toISOString()

  if (!clienteId && (!telefoneRecebido || telefoneRecebido.length < 8)) {
    return { processado: false, motivo: 'Sem identificador de cliente ou telefone' }
  }

  // Preparar fragmentos de busca para localizar o lote de disparo ativo
  const telCurto = telefoneRecebido.startsWith('55')
    ? telefoneRecebido.substring(2)
    : telefoneRecebido
  const last8 = telefoneRecebido.slice(-8)

  // BUG 1: Buscar lotes recentes de qualquer status exceto 'cancelado' (últimos 60 dias),
  // para que respostas a disparos concluídos ou sem reenvio ativo também sejam reconhecidas!
  const sessentaDiasAtras = new Date(agora.getTime() - 60 * 24 * 60 * 60 * 1000)
  const dataMinimaLotesIso = sessentaDiasAtras.toISOString().replace('T', ' ')

  let lotesRecentes = []
  try {
    lotesRecentes = app.findRecordsByFilter(
      'disparos_massa',
      `status != 'cancelado' && created >= '${dataMinimaLotesIso}'`,
      '-created',
      100,
      0,
    )
  } catch (errBusca) {
    console.log('[FASE 4 DETECCAO] Erro ao buscar lotes de disparos_massa:', errBusca)
    return { processado: false, error: String(errBusca) }
  }

  if (!lotesRecentes || lotesRecentes.length === 0) {
    return { processado: false, motivo: 'Nenhum lote recente encontrado' }
  }

  const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
  let matchesEncontrados = 0

  for (let l = 0; l < lotesRecentes.length; l++) {
    const lote = lotesRecentes[l]
    let dests = []
    try {
      const raw = lote.get('destinatarios')
      dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
    } catch (_) {
      dests = []
    }

    if (!Array.isArray(dests) || dests.length === 0) continue

    let loteModificado = false

    for (let d = 0; d < dests.length; d++) {
      const item = dests[d]
      if (!item) continue

      // BUG 1b: Matching robusto com normalização bidirecional de telefone e 9º dígito
      const itemTelLimpo = (item.telefone || '').replace(/\D/g, '')
      const matchClienteId = clienteId && item.cliente_id && item.cliente_id === clienteId
      const matchTelefone =
        itemTelLimpo &&
        (itemTelLimpo === telefoneRecebido ||
          telefonesCasamBidirecional(itemTelLimpo, telefoneRecebido) ||
          (last8 && itemTelLimpo.endsWith(last8)) ||
          (telCurto && itemTelLimpo.includes(telCurto)))

      if (!matchClienteId && !matchTelefone) {
        continue
      }

      // IDEMPOTÊNCIA E ESTADO ATIVO:
      // Se o destinatário já foi marcado como 'respondido', 'atendido', 'finalizado', 'arquivado', 'bloqueado', 'nao_perturbe',
      // ou se já possui marcacao_resposta definida ('respondeu', etc.), NÃO reprocessar!
      const statusAtual = item.status || 'pendente'
      if (
        statusAtual === 'respondido' ||
        statusAtual === 'atendido' ||
        statusAtual === 'finalizado' ||
        statusAtual === 'arquivado' ||
        statusAtual === 'bloqueado' ||
        statusAtual === 'sem_whatsapp' ||
        statusAtual === 'nao_perturbe' ||
        item.marcacao_resposta === 'respondeu' ||
        item.marcacao_resposta === 'interessado'
      ) {
        continue
      }

      // Identificar o fluxo atual e a etapa em que o cliente estava
      const fluxoAtualId =
        item.fluxo_atual_id || lote.getString('fluxo_id') || carregarFluxoPadraoId(app)
      const nomeFluxoAtual = carregarNomeFluxo(app, fluxoAtualId) || 'Fluxo Atual'
      const etapasAtuais = carregarEtapasDoFluxo(app, fluxoAtualId)

      // Identificar a etapa atual ou última etapa executada
      let etapaAtualObj = null
      if (item.etapas_executadas && item.etapas_executadas.length > 0) {
        const ultExec = item.etapas_executadas[item.etapas_executadas.length - 1]
        if (ultExec && ultExec.etapa_id) {
          etapaAtualObj = etapasAtuais.find((e) => e.id === ultExec.etapa_id)
        }
        if (!etapaAtualObj && ultExec) {
          etapaAtualObj = etapasAtuais.find((e) => e.ordem === ultExec.ordem)
        }
      }
      if (!etapaAtualObj && etapasAtuais.length > 0) {
        etapaAtualObj = etapasAtuais[0]
      }

      // 1. Marcar como 'Respondeu' e encerrar fluxo atual
      item.status = 'respondido'
      item.marcacao_resposta = 'respondeu'
      item.marcacao_data = agoraIso
      item.respondido_em = agoraIso
      item.motivo_saida = 'Resposta detectada automaticamente via WhatsApp'

      // Garantir estrutura de trilha
      if (!Array.isArray(item.trilha)) {
        item.trilha = []
      }

      const etapaNomeDesc = etapaAtualObj
        ? etapaAtualObj.nome
        : item.etapa_atual_nome || 'Follow-up'

      // Registrar na trilha com o texto exigido pelo requisito do usuário:
      item.trilha.push({
        fluxo_id: fluxoAtualId,
        fluxo_nome: nomeFluxoAtual,
        etapa_origem_id: etapaAtualObj ? etapaAtualObj.id : undefined,
        etapa_origem_nome: etapaNomeDesc,
        motivo: 'Resposta detectada automaticamente',
        resposta_detectada: true,
        preview_mensagem: mensagemRecebida.substring(0, 80),
        data: agoraIso,
      })

      // 2. Verificar se há ramificação de resposta configurada para um fluxo alternativo
      // A regra pode estar configurada na etapaAtualObj (resposta_acao === 'fluxo_alternativo')
      const temRamificacao =
        etapaAtualObj &&
        etapaAtualObj.resposta_acao === 'fluxo_alternativo' &&
        etapaAtualObj.resposta_fluxo_id &&
        etapaAtualObj.resposta_fluxo_id !== fluxoAtualId

      if (temRamificacao) {
        const novoFluxoId = etapaAtualObj.resposta_fluxo_id
        const nomeNovoFluxo = carregarNomeFluxo(app, novoFluxoId) || 'Fluxo de Resposta'

        // Checar prevenção de ciclo circular: máximo 2 passagens
        const vezesPassou = item.trilha.filter((t) => t.fluxo_id === novoFluxoId).length
        if (vezesPassou < 2) {
          // Entrar no fluxo alternativo de resposta
          item.fluxo_atual_id = novoFluxoId
          item.fluxo_origem_id = fluxoAtualId
          item.fluxo_origem_nome = nomeFluxoAtual
          item.status = 'pendente' // reabre na fila do novo fluxo
          item.motivo_saida = `Ramificação de resposta: entrou no fluxo "${nomeNovoFluxo}"`

          item.trilha.push({
            fluxo_id: novoFluxoId,
            fluxo_nome: nomeNovoFluxo,
            fluxo_anterior_id: fluxoAtualId,
            fluxo_anterior_nome: nomeFluxoAtual,
            motivo: `Resposta detectada automaticamente → Entrou no fluxo alternativo "${nomeNovoFluxo}"`,
            data: agoraIso,
          })

          // Carregar etapas do novo fluxo
          const etapasNovoFluxo = carregarEtapasDoFluxo(app, novoFluxoId)
          if (etapasNovoFluxo.length > 0) {
            const primeiraEtapaNova = etapasNovoFluxo[0]
            item.etapa_atual_ordem = primeiraEtapaNova.ordem
            item.etapa_atual_nome = primeiraEtapaNova.nome

            // Se dias_apos === 0 (etapa imediata) -> agendar envio na hora da resposta
            if (primeiraEtapaNova.dias_apos === 0) {
              const agendadoParaIso = agoraIso
              let textoFinal = primeiraEtapaNova.mensagem || ''
              textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, item.nome || 'Cliente')
              textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
              textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
              textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, item.nome || 'Cliente')

              let cleanPhone = itemTelLimpo || telefoneRecebido
              if (
                cleanPhone.length >= 10 &&
                cleanPhone.length <= 11 &&
                !cleanPhone.startsWith('55')
              ) {
                cleanPhone = '55' + cleanPhone
              }

              if (textoFinal) {
                const novaMsg = new Record(msgsCol)
                if (item.cliente_id && !item.cliente_id.startsWith('demo_')) {
                  novaMsg.set('cliente_id', item.cliente_id)
                }
                novaMsg.set('telefone_destino', cleanPhone)
                novaMsg.set('conteudo_final', textoFinal)
                novaMsg.set('status', 'agendada')
                novaMsg.set('agendado_para', agendadoParaIso)
                novaMsg.set(
                  'tipo_disparo',
                  `massa_fluxo_resposta_imediata_${primeiraEtapaNova.ordem}`,
                )
                novaMsg.set(
                  'referencia_id',
                  `lote_${lote.id}_resp_f${novoFluxoId}_e${primeiraEtapaNova.ordem}_${item.cliente_id || cleanPhone}`,
                )
                app.save(novaMsg)

                if (!Array.isArray(item.etapas_executadas)) {
                  item.etapas_executadas = []
                }
                item.etapas_executadas.push({
                  ordem: primeiraEtapaNova.ordem,
                  etapa_id: primeiraEtapaNova.id,
                  fluxo_id: novoFluxoId,
                  nome: primeiraEtapaNova.nome,
                  enviado_em: agendadoParaIso,
                  mensagem_id: novaMsg.id,
                })
              }

              // Calcular próximo envio da subsequente se houver
              const subsequente = etapasNovoFluxo.find((e) => e.ordem > primeiraEtapaNova.ordem)
              if (subsequente) {
                const proxDias = Math.max(1, subsequente.dias_apos || 1)
                item.proximo_envio_data = new Date(
                  agora.getTime() + proxDias * 24 * 60 * 60 * 1000,
                ).toISOString()
                item.proxima_etapa_nome = subsequente.nome
              } else {
                item.proximo_envio_data = undefined
                item.proxima_etapa_nome = undefined
              }
            } else {
              // Etapa não imediata (dias_apos > 0)
              const proxDias = Math.max(1, primeiraEtapaNova.dias_apos || 1)
              item.proximo_envio_data = new Date(
                agora.getTime() + proxDias * 24 * 60 * 60 * 1000,
              ).toISOString()
              item.proxima_etapa_nome = primeiraEtapaNova.nome
            }
          }
        }
      } else {
        // Encerra o fluxo atual sem ramificação
        item.proximo_envio_data = undefined
        item.proxima_etapa_nome = undefined
      }

      loteModificado = true
      matchesEncontrados++
      console.log(
        `[FASE 4 DETECCAO] Resposta detectada automaticamente para ${item.nome} (${itemTelLimpo}). Lote ${lote.id}, fluxo ${fluxoAtualId}. Ramificou: ${Boolean(temRamificacao)}`,
      )
    }

    if (loteModificado) {
      // Recalcular estatísticas
      const stats = {
        total: dests.length,
        pendentes: dests.filter(
          (d) =>
            d.status === 'pendente' ||
            d.status === 'reenvio_1_agendado' ||
            d.status === 'reenvio_2_agendado',
        ).length,
        respondidos: dests.filter((d) => d.status === 'respondido').length,
        atendidos: dests.filter((d) => d.status === 'atendido').length,
        bloqueados: dests.filter((d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp')
          .length,
        finalizados: dests.filter(
          (d) =>
            d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe',
        ).length,
        reenvios_1_enviados: dests.filter(
          (d) =>
            Boolean(d.reenvio_1_data) || (d.etapas_executadas && d.etapas_executadas.length >= 1),
        ).length,
        reenvios_2_enviados: dests.filter(
          (d) =>
            Boolean(d.reenvio_2_data) || (d.etapas_executadas && d.etapas_executadas.length >= 2),
        ).length,
        ultima_verificacao: agoraIso,
      }

      lote.set('destinatarios', dests)
      lote.set('estatisticas', stats)
      if (stats.pendentes === 0) {
        lote.set('status', 'concluido')
      }
      app.save(lote)
    }
  }

  return {
    processado: true,
    matchesEncontrados,
  }
}

/**
 * Inscreve manualmente um cliente num fluxo de follow-up a partir do painel de acompanhamento.
 * Reutiliza o mesmo mecanismo de entrada e idempotência de avaliarEntradaAutomaticaEstagio,
 * atribuindo origem_entrada = 'movimento_manual'.
 * Se a 1ª etapa tiver dias_apos = 0 (imediata), agenda envio na fila de whatsapp_mensagens na hora.
 */
function moverClienteParaFluxoManual(app, params) {
  const clienteId = params.clienteId || ''
  const fluxoId = params.fluxoId || ''
  const operadorNome = params.operadorNome || 'operador'
  const agora = new Date()
  const agoraIso = agora.toISOString()

  if (!clienteId || clienteId.startsWith('demo_')) {
    return { sucesso: false, motivo: 'Cliente inválido' }
  }

  if (!fluxoId) {
    return { sucesso: false, motivo: 'Fluxo não informado' }
  }

  let clienteRec = null
  try {
    clienteRec = app.findRecordById('clientes', clienteId)
  } catch (_) {}

  if (!clienteRec) {
    return { sucesso: false, motivo: 'Cliente não encontrado' }
  }

  const clienteNome = clienteRec.getString('nome') || 'Cliente'
  const telBruto = clienteRec.getString('whatsapp') || clienteRec.getString('telefone') || ''
  const telefoneLimpo = telBruto.replace(/\D/g, '')

  if (!telefoneLimpo || telefoneLimpo.length < 10) {
    return { sucesso: false, motivo: 'Cliente sem telefone/WhatsApp válido' }
  }

  let fluxoRec = null
  try {
    fluxoRec = app.findRecordById('fluxos_follow_up', fluxoId)
  } catch (_) {}

  if (!fluxoRec || !fluxoRec.getBool('ativo')) {
    return { sucesso: false, motivo: 'Fluxo inexistente ou inativo' }
  }

  const fluxoNome = fluxoRec.getString('nome') || 'Fluxo Follow-up'

  // Checagem estrita de idempotência no fluxo de destino:
  let jaAtivoNesseFluxo = false
  try {
    const lotesDoFluxo = app.findRecordsByFilter(
      'disparos_massa',
      `fluxo_id = '${fluxoId}' && status = 'ativo'`,
      '-created',
      50,
      0,
    )

    for (let l = 0; l < lotesDoFluxo.length; l++) {
      let dests = []
      try {
        const rawD = lotesDoFluxo[l].get('destinatarios')
        dests = typeof rawD === 'string' ? JSON.parse(rawD) : rawD || []
      } catch (_) {}

      const matchDest = dests.find(
        (d) =>
          d.cliente_id === clienteId &&
          d.status !== 'finalizado' &&
          d.status !== 'arquivado' &&
          d.status !== 'respondido' &&
          d.status !== 'atendido' &&
          d.status !== 'nao_perturbe' &&
          d.status !== 'bloqueado' &&
          d.status !== 'sem_whatsapp',
      )

      if (matchDest) {
        jaAtivoNesseFluxo = true
        break
      }
    }
  } catch (errCheck) {
    console.log('[MOVER MANUAL FLUXO] Erro ao checar idempotência do lote:', errCheck)
  }

  if (jaAtivoNesseFluxo) {
    return {
      sucesso: false,
      jaAtivo: true,
      motivo: `O cliente "${clienteNome}" já está em acompanhamento ativo no fluxo "${fluxoNome}".`,
    }
  }

  // Carregar 1ª etapa ativa do fluxo
  const etapas = carregarEtapasDoFluxo(app, fluxoId)
  const primeiraEtapa = etapas.length > 0 ? etapas[0] : null
  const isImediata = primeiraEtapa && primeiraEtapa.dias_apos === 0
  const prazoDias = primeiraEtapa
    ? primeiraEtapa.dias_apos === 0
      ? 0
      : Math.max(1, primeiraEtapa.dias_apos || 1)
    : 3
  const dataPrevistaIso = new Date(agora.getTime() + prazoDias * 24 * 60 * 60 * 1000).toISOString()

  // Montar objeto destinatário com origem_entrada = movimento_manual e trilha
  const dataFormatadaTrilha = agora.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const novoDestinatario = {
    cliente_id: clienteId,
    nome: clienteNome,
    telefone: telefoneLimpo,
    status: 'pendente',
    origem_entrada: 'movimento_manual',
    data_envio_inicial: agoraIso,
    fluxo_atual_id: fluxoId,
    proximo_envio_data: dataPrevistaIso,
    proxima_etapa_nome: primeiraEtapa ? primeiraEtapa.nome : '1º Follow-up',
    etapas_executadas: [],
    trilha: [
      {
        fluxo_id: fluxoId,
        fluxo_nome: fluxoNome,
        origem_entrada: 'movimento_manual',
        motivo: `Movido manualmente para o fluxo "${fluxoNome}" pelo operador (${operadorNome}) em ${dataFormatadaTrilha}`,
        data: agoraIso,
      },
    ],
  }

  // Localizar ou criar lote dedicado do fluxo com origem_entrada = 'movimento_manual'
  let loteId = ''
  try {
    const disparosCol = app.findCollectionByNameOrId('disparos_massa')
    const filtroLoteManual = `fluxo_id = '${fluxoId}' && origem_entrada = 'movimento_manual' && status = 'ativo'`
    const lotesManual = app.findRecordsByFilter(
      'disparos_massa',
      filtroLoteManual,
      '-created',
      1,
      0,
    )

    let loteParaAtualizar = null
    if (lotesManual && lotesManual.length > 0) {
      loteParaAtualizar = lotesManual[0]
      let dests = []
      try {
        const raw = loteParaAtualizar.get('destinatarios')
        dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
      } catch (_) {}
      dests.push(novoDestinatario)
      loteParaAtualizar.set('destinatarios', dests)
      loteParaAtualizar.set('total_destinatarios', dests.length)
      app.save(loteParaAtualizar)
      loteId = loteParaAtualizar.id
    } else {
      loteParaAtualizar = new Record(disparosCol)
      loteParaAtualizar.set('titulo', `Follow-up Manual: ${fluxoNome}`)
      loteParaAtualizar.set('status', 'ativo')
      loteParaAtualizar.set('segmento', 'movimento_manual')
      loteParaAtualizar.set('total_destinatarios', 1)
      loteParaAtualizar.set('intervalo_segundos', 60)
      loteParaAtualizar.set('data_disparo', agoraIso)
      loteParaAtualizar.set(
        'mensagem_original',
        `Entrada manual no fluxo "${fluxoNome}" realizada pelo operador`,
      )
      loteParaAtualizar.set('reenvio_ativo', true)
      loteParaAtualizar.set('fluxo_id', fluxoId)
      loteParaAtualizar.set('origem_entrada', 'movimento_manual')
      loteParaAtualizar.set('destinatarios', [novoDestinatario])
      loteParaAtualizar.set('estatisticas', {
        total: 1,
        pendentes: 1,
        respondidos: 0,
        atendidos: 0,
        bloqueados: 0,
        finalizados: 0,
        reenvios_1_enviados: 0,
        reenvios_2_enviados: 0,
        ultima_verificacao: agoraIso,
      })
      app.save(loteParaAtualizar)
      loteId = loteParaAtualizar.id
    }
  } catch (errSaveLote) {
    console.log('[MOVER MANUAL FLUXO] Erro ao salvar lote de acompanhamento:', errSaveLote)
    return { sucesso: false, motivo: 'Erro ao gravar lote: ' + String(errSaveLote) }
  }

  // Se a 1ª etapa do fluxo for imediata (dias_apos = 0), enfileira a mensagem agora
  let msgAgendadaId = ''
  if (isImediata && primeiraEtapa && primeiraEtapa.mensagem) {
    try {
      const msgsCol = app.findCollectionByNameOrId('whatsapp_mensagens')
      let textoFinal = primeiraEtapa.mensagem || ''
      textoFinal = textoFinal.replace(/\[nome do cliente\]/gi, clienteNome)
      textoFinal = textoFinal.replace(/\[nome da empresa\]/gi, 'Delfos Solar')
      textoFinal = textoFinal.replace(/\[empresa\]/gi, 'Delfos Solar')
      textoFinal = textoFinal.replace(/\{\{nome_cliente\}\}/g, clienteNome)

      let cleanPhone = telefoneLimpo
      if (cleanPhone.length >= 10 && cleanPhone.length <= 11 && !cleanPhone.startsWith('55')) {
        cleanPhone = '55' + cleanPhone
      }

      const novaMsg = new Record(msgsCol)
      novaMsg.set('cliente_id', clienteId)
      novaMsg.set('telefone_destino', cleanPhone)
      novaMsg.set('conteudo_final', textoFinal)
      novaMsg.set('status', 'agendada')
      novaMsg.set('agendado_para', agoraIso)
      novaMsg.set('tipo_disparo', `massa_fluxo_etapa_${primeiraEtapa.ordem}`)
      novaMsg.set(
        'referencia_id',
        `lote_${loteId}_manual_f${fluxoId}_e${primeiraEtapa.ordem}_${clienteId || cleanPhone}`,
      )
      app.save(novaMsg)
      msgAgendadaId = novaMsg.id

      // Atualizar no lote o registro da etapa executada
      try {
        const loteRec = app.findRecordById('disparos_massa', loteId)
        let dests = []
        try {
          const raw = loteRec.get('destinatarios')
          dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
        } catch (_) {}

        const targetDest = dests.find((d) => d.cliente_id === clienteId)
        if (targetDest) {
          if (!Array.isArray(targetDest.etapas_executadas)) {
            targetDest.etapas_executadas = []
          }
          targetDest.etapas_executadas.push({
            ordem: primeiraEtapa.ordem,
            etapa_id: primeiraEtapa.id,
            fluxo_id: fluxoId,
            nome: primeiraEtapa.nome,
            enviado_em: agoraIso,
            mensagem_id: novaMsg.id,
          })
          targetDest.etapa_atual_ordem = primeiraEtapa.ordem
          targetDest.etapa_atual_nome = primeiraEtapa.nome
          if (primeiraEtapa.ordem === 1) {
            targetDest.status = 'reenvio_1_agendado'
            targetDest.reenvio_1_data = agoraIso
            targetDest.reenvio_1_msg_id = novaMsg.id
          }

          // Calcular próxima etapa
          const subsequente = etapas.find((e) => e.ordem > primeiraEtapa.ordem)
          if (subsequente) {
            const proxDias = Math.max(1, subsequente.dias_apos || 1)
            targetDest.proximo_envio_data = new Date(
              agora.getTime() + proxDias * 24 * 60 * 60 * 1000,
            ).toISOString()
            targetDest.proxima_etapa_nome = subsequente.nome
          } else {
            targetDest.proximo_envio_data = undefined
            targetDest.proxima_etapa_nome = undefined
          }

          loteRec.set('destinatarios', dests)
          app.save(loteRec)
        }
      } catch (errUpdateEtapa) {
        console.log(
          '[MOVER MANUAL FLUXO] Aviso ao atualizar etapa imediata no lote:',
          errUpdateEtapa,
        )
      }
    } catch (errMsg) {
      console.log('[MOVER MANUAL FLUXO] Erro ao enfileirar mensagem imediata:', errMsg)
    }
  }

  return {
    sucesso: true,
    loteId,
    clienteId,
    clienteNome,
    fluxoId,
    fluxoNome,
    imediata: isImediata,
    mensagemEnfileirada: Boolean(msgAgendadaId),
  }
}

/**
 * BUG 2: Reconciliação retroativa de respostas de clientes em lotes de disparos_massa.
 *
 * Percorre todos os lotes de disparos_massa (ou um loteId específico se informado),
 * cruza cada destinatário com mensagens recebidas em whatsapp_mensagens após data_disparo,
 * e atualiza o destinatário:
 *   status: 'respondido'
 *   marcacao_resposta: 'respondeu'
 *   respondido_em: data da mensagem recebida
 *   motivo_saida: 'Resposta detectada retroativamente via WhatsApp'
 *
 * Atualiza também as estatísticas do lote e o status do lote se necessário.
 * Idempotente: rodar mais de uma vez não duplica marcações nem sobrescreve dados já respondidos.
 */
function reconciliarRespostasDisparosMassa(app, options) {
  const opts = options || {}
  const loteIdFiltro = opts.loteId || ''
  const agora = new Date()
  const agoraIso = agora.toISOString()

  let lotes = []
  try {
    if (loteIdFiltro) {
      try {
        const rec = app.findRecordById('disparos_massa', loteIdFiltro)
        if (rec) lotes = [rec]
      } catch (_) {}
    } else {
      lotes = app.findRecordsByFilter('disparos_massa', "status != 'cancelado'", '-created', 200, 0)
    }
  } catch (errLotes) {
    console.log('[RECONCILIACAO RESPOSTAS] Erro ao buscar lotes:', errLotes)
    return { sucesso: false, error: String(errLotes) }
  }

  const resultados = []
  let totalReconciliados = 0

  for (let l = 0; l < lotes.length; l++) {
    const lote = lotes[l]
    let dests = []
    try {
      const raw = lote.get('destinatarios')
      dests = typeof raw === 'string' ? JSON.parse(raw) : raw || []
    } catch (_) {
      dests = []
    }

    if (!Array.isArray(dests) || dests.length === 0) continue

    const dataDisparoStr = lote.getString('data_disparo') || lote.getString('created')
    const dataDisparoMs = new Date(dataDisparoStr).getTime()
    // Buscar mensagens recebidas a partir de um instante antes da data de disparo (buffer de 5 minutos para envios em andamento)
    const dataInicioBuscaIso = new Date(Math.max(0, dataDisparoMs - 5 * 60 * 1000))
      .toISOString()
      .replace('T', ' ')

    let loteModificado = false
    let reconciliadosNoLote = 0

    for (let d = 0; d < dests.length; d++) {
      const item = dests[d]
      if (!item) continue

      // Se já está marcado como respondido, não mexer (idempotência)
      if (item.status === 'respondido' || item.marcacao_resposta === 'respondeu') {
        continue
      }

      const telItem = (item.telefone || '').replace(/\D/g, '')
      const cliId = item.cliente_id || ''

      let msgRecebidaEncontrada = null

      // 1. Tentar buscar por cliente_id
      if (cliId && !cliId.startsWith('demo_')) {
        try {
          const filtroCli = `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && cliente_id = '${cliId}'`
          const msgsCli = app.findRecordsByFilter('whatsapp_mensagens', filtroCli, 'created', 1, 0)
          if (msgsCli && msgsCli.length > 0) {
            msgRecebidaEncontrada = msgsCli[0]
          }
        } catch (_) {}
      }

      // 2. Tentar buscar por telefone (com normalização bidirecional e tolerância a 9º dígito)
      if (!msgRecebidaEncontrada && telItem && telItem.length >= 8) {
        try {
          const ult8 = telItem.slice(-8)
          const filtroTel = `direcao = 'recebida' && created >= '${dataInicioBuscaIso}' && (telefone_destino ~ '${ult8}' || cliente_id = '${cliId}')`
          const msgsTel = app.findRecordsByFilter('whatsapp_mensagens', filtroTel, 'created', 20, 0)
          for (let m = 0; m < msgsTel.length; m++) {
            const cand = msgsTel[m]
            const destTel = cand.getString('telefone_destino') || ''
            const candCli = cand.getString('cliente_id') || ''
            if (
              (candCli && candCli === cliId) ||
              telefonesCasamBidirecional(destTel, telItem) ||
              (ult8 && destTel.replace(/\D/g, '').endsWith(ult8))
            ) {
              msgRecebidaEncontrada = cand
              break
            }
          }
        } catch (errBuscaTel) {
          console.log('[RECONCILIACAO] Erro ao buscar mensagem por telefone:', errBuscaTel)
        }
      }

      if (msgRecebidaEncontrada) {
        const dataMsgIso =
          msgRecebidaEncontrada.getString('enviado_em') ||
          msgRecebidaEncontrada.getString('created') ||
          agoraIso

        item.status = 'respondido'
        item.marcacao_resposta = 'respondeu'
        item.marcacao_data = dataMsgIso
        item.respondido_em = dataMsgIso
        item.motivo_saida = 'Resposta detectada retroativamente via WhatsApp'
        item.proximo_envio_data = undefined
        item.proxima_etapa_nome = undefined

        if (!Array.isArray(item.trilha)) {
          item.trilha = []
        }
        item.trilha.push({
          fluxo_id: item.fluxo_atual_id || lote.getString('fluxo_id'),
          fluxo_nome: carregarNomeFluxo(app, item.fluxo_atual_id || lote.getString('fluxo_id')),
          motivo: 'Resposta detectada retroativamente via WhatsApp',
          resposta_detectada: true,
          preview_mensagem: (msgRecebidaEncontrada.getString('conteudo_final') || '').substring(
            0,
            80,
          ),
          data: dataMsgIso,
        })

        loteModificado = true
        reconciliadosNoLote++
        totalReconciliados++
        console.log(
          `[RECONCILIACAO] Destinatário ${item.nome} (${telItem}) do lote ${lote.id} reconciliado com resposta em ${dataMsgIso}.`,
        )
      }
    }

    if (loteModificado) {
      const stats = {
        total: dests.length,
        pendentes: dests.filter(
          (d) =>
            d.status === 'pendente' ||
            d.status === 'reenvio_1_agendado' ||
            d.status === 'reenvio_2_agendado',
        ).length,
        respondidos: dests.filter((d) => d.status === 'respondido').length,
        atendidos: dests.filter((d) => d.status === 'atendido').length,
        bloqueados: dests.filter((d) => d.status === 'bloqueado' || d.status === 'sem_whatsapp')
          .length,
        finalizados: dests.filter(
          (d) =>
            d.status === 'finalizado' || d.status === 'arquivado' || d.status === 'nao_perturbe',
        ).length,
        reenvios_1_enviados: dests.filter(
          (d) =>
            Boolean(d.reenvio_1_data) || (d.etapas_executadas && d.etapas_executadas.length >= 1),
        ).length,
        reenvios_2_enviados: dests.filter(
          (d) =>
            Boolean(d.reenvio_2_data) || (d.etapas_executadas && d.etapas_executadas.length >= 2),
        ).length,
        ultima_verificacao: agoraIso,
      }

      lote.set('destinatarios', dests)
      lote.set('estatisticas', stats)
      app.save(lote)

      resultados.push({
        loteId: lote.id,
        titulo: lote.getString('titulo'),
        reconciliados: reconciliadosNoLote,
        novosRespondidos: stats.respondidos,
        novosPendentes: stats.pendentes,
      })
    }
  }

  return {
    sucesso: true,
    totalReconciliados,
    lotesAfetados: resultados.length,
    detalhes: resultados,
  }
}

module.exports = {
  processarReenviosDisparosMassa,
  processarRespostaAutomaticaCliente,
  reconciliarRespostasDisparosMassa,
  avaliarEntradaAutomaticaEstagio,
  moverClienteParaFluxoManual,
  gerarVariacoesTelefone,
  telefonesCasamBidirecional,
  normalizarEstagioComparacao,
  carregarEtapasDoFluxo,
  carregarNomeFluxo,
  carregarFluxoPadraoId,
}

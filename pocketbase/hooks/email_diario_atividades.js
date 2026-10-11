// pocketbase/hooks/email_diario_atividades.js
// E-mail diário automático de atividades para os usuários do CRM Delfos Solar
// Job agendado para rodar diariamente às 7:00 horário de Brasília (10:00 UTC)
// Remetente oficial: "Delfos Solar" <solar@updates.delfos.eng.br>
//
// NOTA DE ESCOPO POCKETBASE JSVM (Goja):
// Toda lógica de execução é embutida diretamente dentro dos callbacks (inline)
// para evitar erros de scoping entre pools de VM.

// -------------------------------------------------------------
// 1. REGISTRO DO JOB AGENDADO DIÁRIO ÀS 7:00 HORÁRIO DE BRASÍLIA
// Brasília = UTC-3 sem horário de verão (Decreto 9.772/2019)
// 7:00 BRT = 10:00 UTC -> Expressão cron: '0 10 * * *'
// -------------------------------------------------------------
cronAdd('email_diario_atividades_worker', '0 10 * * *', () => {
  try {
    const agora = new Date()

    // Converte data UTC para componentes no horário de Brasília (UTC-3 fixo)
    const brMs = agora.getTime() - 3 * 60 * 60 * 1000
    const brDate = new Date(brMs)
    const pad = (n) => (n < 10 ? '0' + n : String(n))
    const hojeY = brDate.getUTCFullYear()
    const hojeM = brDate.getUTCMonth() + 1
    const hojeD = brDate.getUTCDate()
    const hojeYmd = `${hojeY}-${pad(hojeM)}-${pad(hojeD)}`
    const hojeFormatado = `${pad(hojeD)}/${pad(hojeM)}/${hojeY}`

    console.log(
      `[CRON email_diario_atividades_worker] Disparo agendado iniciado às 7h Brasília (10h UTC). Data referência: ${hojeYmd} (${hojeFormatado})`,
    )

    const apiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
    if (!apiKey) {
      console.error(
        '[CRON email_diario_atividades_worker] RESEND_API_KEY não configurada no backend. Disparo abortado.',
      )
      return
    }

    // Remetente padrão obrigatório: "Delfos Solar" <solar@updates.delfos.eng.br>
    const sender = 'Delfos Solar <solar@updates.delfos.eng.br>'
    let appUrl = ($os.getenv('SITE_URL') || '').trim().replace(/\/+$/, '')
    if (!appUrl) {
      appUrl = 'https://crm.delfos.eng.br'
    }

    // 1. Carregar usuários ativos
    let usuarios = []
    try {
      usuarios = $app.findRecordsByFilter('users', "ativo = true || ativo = ''", 'name', 200, 0)
    } catch (errUsers) {
      console.error('[CRON email_diario_atividades_worker] Erro ao carregar usuários:', errUsers)
      return
    }

    if (!usuarios || usuarios.length === 0) {
      console.log('[CRON email_diario_atividades_worker] Nenhum usuário ativo encontrado.')
      return
    }

    // 2. Carregar atividades em aberto
    const filterAtividades =
      "(status = 'pendente' || status = 'agendada' || status = 'em_execucao')"
    let atividadesAbertas = []
    try {
      atividadesAbertas = $app.findRecordsByFilter('atividades', filterAtividades, 'data', 1500, 0)
    } catch (errAtv) {
      console.error('[CRON email_diario_atividades_worker] Erro ao carregar atividades:', errAtv)
      return
    }

    console.log(
      `[CRON email_diario_atividades_worker] Total atividades abertas: ${atividadesAbertas.length} | Usuários: ${usuarios.length}`,
    )

    // Helper de escape HTML inline
    const escapeHtml = (str) => {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }

    // Helper de formatação de tipo inline
    const formatarTipoInline = (tipo, subtipo, tipoUnificado) => {
      if (tipoUnificado && String(tipoUnificado).trim() !== '') {
        return String(tipoUnificado).trim()
      }
      if (subtipo && String(subtipo).trim() !== '' && subtipo !== tipo) {
        return String(subtipo).trim()
      }
      const map = {
        contato_ligacao: 'Ligação Telefônica',
        ligacao: 'Ligação Telefônica',
        reuniao_presencial: 'Reunião Presencial',
        reuniao: 'Reunião',
        visita_tecnica: 'Visita Técnica',
        follow_up: 'Follow-up Comercial',
        instalacao: 'Instalação Solar',
        proposta: 'Proposta Comercial',
        limpeza: 'Limpeza dos Módulos',
        manutencao_preventiva: 'Manutenção Preventiva',
        manutencao_corretiva: 'Manutenção Corretiva',
        limpeza_manutencao: 'Limpeza dos Módulos',
        auto_leitura_rge: 'Auto Leitura RGE',
        lembrete_auto_leitura: 'Lembrete Auto Leitura',
        solicitar_contas_rge: 'Solicitar Contas RGE',
        analise_fatura: 'Análise de Fatura RGE',
        mudanca_estagio: 'Mudança de Estágio',
        anotacao: 'Anotação Interna',
        garantia_equipamento: 'Garantia de Equipamento',
        configuracao_datalogger: 'Configuração de Datalogger',
        relatorio_solarview: 'Relatório SolarView',
        mensagem_enviada: 'Mensagem Enviada',
        oferecer_limpeza_avulsa: 'Oferta Limpeza Avulsa',
        gerar_contrato: 'Gerar Contrato',
        gerar_procuracao: 'Gerar Procuração',
        custom: 'Atividade Personalizada',
      }
      const t = (tipo || '').toLowerCase().trim()
      return map[t] || (t ? t.replace(/_/g, ' ') : 'Atividade')
    }

    // Helper de agendamento inline
    const extrairInfoInline = (atv) => {
      const dataStr = atv.getString('data') || atv.getString('created') || ''
      let dataBr = '-'
      let ymd = ''
      let horaIso = ''
      let ms = 0

      if (dataStr) {
        const dObj = new Date(dataStr)
        if (!isNaN(dObj.getTime())) {
          ms = dObj.getTime()
          const bMs = ms - 3 * 60 * 60 * 1000
          const bDate = new Date(bMs)
          const y = bDate.getUTCFullYear()
          const m = bDate.getUTCMonth() + 1
          const day = bDate.getUTCDate()
          const h = bDate.getUTCHours()
          const min = bDate.getUTCMinutes()
          ymd = `${y}-${pad(m)}-${pad(day)}`
          dataBr = `${pad(day)}/${pad(m)}/${y}`
          horaIso = `${pad(h)}:${pad(min)}`
        }
      }

      const hInicio = (atv.getString('horario_inicio') || '').trim()
      const hFim = (atv.getString('horario_fim') || '').trim()

      let horaFormatada = ''
      if (hInicio && hFim) {
        horaFormatada = `${hInicio} às ${hFim}`
      } else if (hInicio) {
        horaFormatada = hInicio
      } else if (horaIso && horaIso !== '00:00') {
        horaFormatada = horaIso
      }

      return { dataBr, ymd, horaFormatada, timestamp: ms }
    }

    // Cache de clientes inline
    const clientesCache = {}
    const getClienteInfo = (clienteId) => {
      if (!clienteId) return null
      if (clientesCache[clienteId] !== undefined) return clientesCache[clienteId]
      try {
        const cliList = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)
        if (cliList && cliList.length > 0) {
          const cli = cliList[0]
          const nome = cli.getString('nome') || cli.getString('nome_fantasia') || ''
          const cidade = cli.getString('cidade') || ''
          clientesCache[clienteId] = { nome, cidade }
          return clientesCache[clienteId]
        }
      } catch (_) {}
      clientesCache[clienteId] = null
      return null
    }

    let countEnviados = 0
    let countPulados = 0
    let countFalhas = 0

    for (let u = 0; u < usuarios.length; u++) {
      const user = usuarios[u]
      const userId = user.id
      const userEmail = (user.getString('email') || '').trim()
      const userName = user.getString('name') || 'Colaborador'
      const userAtivo = user.getBool('ativo')

      if (userAtivo === false || !userEmail) {
        countPulados++
        continue
      }

      const atrasadas = []
      const doDia = []

      for (let a = 0; a < atividadesAbertas.length; a++) {
        const atv = atividadesAbertas[a]
        const respId = (atv.getString('responsavel_id') || '').trim()
        if (respId !== userId) continue

        const infoAg = extrairInfoInline(atv)
        const ymdAtv = infoAg.ymd
        if (!ymdAtv) continue

        const clienteId = atv.getString('cliente_id')
        const cliInfo = getClienteInfo(clienteId)
        const clienteNome = cliInfo ? cliInfo.nome : ''
        const clienteCidade = cliInfo ? cliInfo.cidade : ''

        const tipoFormatado = formatarTipoInline(
          atv.getString('tipo'),
          atv.getString('subtipo'),
          atv.getString('tipo_unificado'),
        )
        const titulo = (atv.getString('titulo') || '').trim() || tipoFormatado

        const itemData = {
          id: atv.id,
          titulo,
          tipoFormatado,
          clienteNome,
          clienteCidade,
          dataBr: infoAg.dataBr,
          ymd: ymdAtv,
          horaFormatada: infoAg.horaFormatada,
          timestamp: infoAg.timestamp,
        }

        if (ymdAtv < hojeYmd) {
          let diasAtraso = 1
          try {
            const d1 = new Date(ymdAtv + 'T12:00:00Z').getTime()
            const d2 = new Date(hojeYmd + 'T12:00:00Z').getTime()
            const diff = Math.floor((d2 - d1) / (24 * 60 * 60 * 1000))
            diasAtraso = diff > 0 ? diff : 1
          } catch (_) {}
          itemData.diasAtraso = diasAtraso
          atrasadas.push(itemData)
        } else if (ymdAtv === hojeYmd) {
          doDia.push(itemData)
        }
      }

      // Regra 3: Só envia para quem tem atividades
      if (atrasadas.length === 0 && doDia.length === 0) {
        countPulados++
        continue
      }

      atrasadas.sort((x, y) => x.timestamp - y.timestamp)
      doDia.sort((x, y) => x.timestamp - y.timestamp)

      // Assunto
      let subject = ''
      if (atrasadas.length > 0 && doDia.length > 0) {
        subject = `Delfos Solar: ${doDia.length} ${doDia.length === 1 ? 'atividade para hoje' : 'atividades para hoje'} e ${atrasadas.length} ${atrasadas.length === 1 ? 'atrasada' : 'atrasadas'}`
      } else if (doDia.length > 0) {
        subject = `Delfos Solar: Suas ${doDia.length} ${doDia.length === 1 ? 'atividade de hoje' : 'atividades de hoje'} (${hojeFormatado})`
      } else {
        subject = `Delfos Solar: Você tem ${atrasadas.length} ${atrasadas.length === 1 ? 'atividade atrasada' : 'atividades atrasadas'}`
      }

      // Texto plano
      const textLines = [
        `Olá, ${userName}!`,
        '',
        `Aqui está o seu resumo de atividades para hoje (${hojeFormatado}).`,
        '',
      ]

      if (atrasadas.length > 0) {
        textLines.push(`=== ATIVIDADES ATRASADAS (${atrasadas.length}) ===`)
        for (let idx = 0; idx < atrasadas.length; idx++) {
          const itemAt = atrasadas[idx]
          let s = `• ${itemAt.titulo} [${itemAt.tipoFormatado}] — Atrasada há ${itemAt.diasAtraso} ${itemAt.diasAtraso === 1 ? 'dia' : 'dias'} (Prevista para: ${itemAt.dataBr}${itemAt.horaFormatada ? ' às ' + itemAt.horaFormatada : ''})`
          if (itemAt.clienteNome) {
            s += ` | Cliente: ${itemAt.clienteNome}`
            if (itemAt.clienteCidade) s += ` (${itemAt.clienteCidade})`
          }
          textLines.push(s)
        }
        textLines.push('')
      }

      if (doDia.length > 0) {
        textLines.push(`=== ATIVIDADES DE HOJE (${doDia.length}) ===`)
        for (let idx = 0; idx < doDia.length; idx++) {
          const itemD = doDia[idx]
          let s = `• ${itemD.titulo} [${itemD.tipoFormatado}]${itemD.horaFormatada ? ' — Horário: ' + itemD.horaFormatada : ' — Sem horário fixo'}`
          if (itemD.clienteNome) {
            s += ` | Cliente: ${itemD.clienteNome}`
            if (itemD.clienteCidade) s += ` (${itemD.clienteCidade})`
          }
          textLines.push(s)
        }
        textLines.push('')
      }

      textLines.push('Acesse a Central de Atividades para gerenciá-las:')
      textLines.push(`${appUrl}/central-atividades`)
      textLines.push('')
      textLines.push('— Equipe Delfos Solar')
      const plainText = textLines.join('\n')

      // HTML
      const htmlBlocks = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        `<title>${escapeHtml(subject)}</title>`,
        '</head>',
        '<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">',
        '<div style="max-width: 620px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">',
        '<div style="background: linear-gradient(135deg, #047857 0%, #065f46 100%); padding: 24px 28px; color: #ffffff;">',
        '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
        '<tr>',
        '<td>',
        '<h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: #ffffff;">Delfos Solar</h1>',
        `<p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5;">Resumo Diário de Atividades • ${escapeHtml(hojeFormatado)}</p>`,
        '</td>',
        '<td align="right" style="font-size: 12px; color: #a7f3d0;">7h Brasília</td>',
        '</tr>',
        '</table>',
        '</div>',
        '<div style="padding: 28px;">',
        `<p style="font-size: 16px; margin: 0 0 16px 0; color: #0f172a;">Olá, <strong>${escapeHtml(userName)}</strong>!</p>`,
        '<p style="font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; color: #475569;">Confira abaixo as atividades sob sua responsabilidade que exigem atenção hoje:</p>',
      ]

      if (atrasadas.length > 0) {
        htmlBlocks.push(
          '<div style="margin-bottom: 24px;">',
          '<div style="display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #fee2e2;">',
          '<span style="background-color: #ef4444; color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; margin-right: 8px;">Atenção</span>',
          `<h2 style="margin: 0; font-size: 15px; color: #991b1b; font-weight: 700;">Atividades Atrasadas (${atrasadas.length})</h2>`,
          '</div>',
        )
        for (let i = 0; i < atrasadas.length; i++) {
          const aItem = atrasadas[i]
          const diasTexto =
            aItem.diasAtraso === 1 ? 'Atrasada há 1 dia' : `Atrasada há ${aItem.diasAtraso} dias`
          htmlBlocks.push(
            '<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">',
            '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
            '<tr>',
            '<td style="vertical-align: top;">',
            `<div style="font-size: 14px; font-weight: 600; color: #7f1d1d; margin-bottom: 4px;">${escapeHtml(aItem.titulo)}</div>`,
            `<div style="font-size: 12px; color: #991b1b; margin-bottom: 4px;"><strong>Tipo:</strong> ${escapeHtml(aItem.tipoFormatado)}</div>`,
          )
          if (aItem.clienteNome) {
            htmlBlocks.push(
              `<div style="font-size: 12px; color: #475569; margin-bottom: 2px;"><strong>Cliente:</strong> ${escapeHtml(aItem.clienteNome)}${aItem.clienteCidade ? ' (' + escapeHtml(aItem.clienteCidade) + ')' : ''}</div>`,
            )
          }
          htmlBlocks.push(
            `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Data prevista: ${escapeHtml(aItem.dataBr)}${aItem.horaFormatada ? ' às ' + escapeHtml(aItem.horaFormatada) : ''}</div>`,
            '</td>',
            '<td align="right" style="vertical-align: top; white-space: nowrap; padding-left: 10px;">',
            `<span style="background-color: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-block;">${escapeHtml(diasTexto)}</span>`,
            '</td>',
            '</tr>',
            '</table>',
            '</div>',
          )
        }
        htmlBlocks.push('</div>')
      }

      if (doDia.length > 0) {
        htmlBlocks.push(
          '<div style="margin-bottom: 24px;">',
          '<div style="display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e0e7ff;">',
          '<span style="background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; margin-right: 8px;">Para Hoje</span>',
          `<h2 style="margin: 0; font-size: 15px; color: #0369a1; font-weight: 700;">Atividades do Dia (${doDia.length})</h2>`,
          '</div>',
        )
        for (let i = 0; i < doDia.length; i++) {
          const dItem = doDia[i]
          const horarioBadge = dItem.horaFormatada ? dItem.horaFormatada : 'Sem horário'
          htmlBlocks.push(
            '<div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">',
            '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
            '<tr>',
            '<td style="vertical-align: top;">',
            `<div style="font-size: 14px; font-weight: 600; color: #0c4a6e; margin-bottom: 4px;">${escapeHtml(dItem.titulo)}</div>`,
            `<div style="font-size: 12px; color: #0369a1; margin-bottom: 4px;"><strong>Tipo:</strong> ${escapeHtml(dItem.tipoFormatado)}</div>`,
          )
          if (dItem.clienteNome) {
            htmlBlocks.push(
              `<div style="font-size: 12px; color: #475569; margin-bottom: 2px;"><strong>Cliente:</strong> ${escapeHtml(dItem.clienteNome)}${dItem.clienteCidade ? ' (' + escapeHtml(dItem.clienteCidade) + ')' : ''}</div>`,
            )
          }
          htmlBlocks.push(
            `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Data: ${escapeHtml(dItem.dataBr)}${dItem.horaFormatada ? ' às ' + escapeHtml(dItem.horaFormatada) : ''}</div>`,
            '</td>',
            '<td align="right" style="vertical-align: top; white-space: nowrap; padding-left: 10px;">',
            `<span style="background-color: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-block;">${escapeHtml(horarioBadge)}</span>`,
            '</td>',
            '</tr>',
            '</table>',
            '</div>',
          )
        }
        htmlBlocks.push('</div>')
      }

      const centralUrl = `${appUrl}/central-atividades`
      htmlBlocks.push(
        '<div style="text-align: center; margin: 32px 0 16px 0;">',
        `<a href="${centralUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(5,150,105,0.2);">Abrir Central de Atividades</a>`,
        '</div>',
        '</div>',
        '<div style="background-color: #f1f5f9; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">',
        '<p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Delfos Engenharia & Energia Solar</p>',
        '<p style="margin: 0 0 6px 0;">Rua Espírito Santo, 275 • Erechim - RS</p>',
        '<p style="margin: 0; color: #94a3b8;">Este é um e-mail automático gerado às 7h pelo CRM Delfos Solar.</p>',
        '</div>',
        '</div>',
        '</body>',
        '</html>',
      )
      const htmlContent = htmlBlocks.join('\n')

      const payload = {
        from: sender,
        to: [userEmail],
        subject: subject,
        html: htmlContent,
        text: plainText,
        reply_to: 'delfos.usinas@gmail.com',
      }

      try {
        console.log(
          `[CRON email_diario_atividades_worker] Enviando via Resend para ${userEmail} (${userName})...`,
        )
        const res = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 25,
        })

        let parsed = null
        try {
          parsed = res.json || (res.raw ? JSON.parse(res.raw) : null)
        } catch (_) {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const emailId = (parsed && parsed.id) || (parsed && parsed.data && parsed.data.id) || ''
          countEnviados++
          console.log(
            `[CRON email_diario_atividades_worker] E-mail enviado com SUCESSO para ${userEmail} | Resend ID: ${emailId}`,
          )
        } else {
          const errDetail =
            (parsed && (parsed.message || parsed.error)) ||
            (res.raw ? res.raw.substring(0, 200) : 'HTTP ' + res.statusCode)
          countFalhas++
          console.error(
            `[CRON email_diario_atividades_worker] FALHA ao enviar para ${userEmail} | Status: ${res.statusCode} | Erro: ${errDetail}`,
          )
        }
      } catch (sendErr) {
        countFalhas++
        const msgErr = sendErr && sendErr.message ? sendErr.message : String(sendErr)
        console.error(
          `[CRON email_diario_atividades_worker] EXCEÇÃO ao enviar para ${userEmail}: ${msgErr}`,
        )
      }
    }

    console.log(
      `[CRON email_diario_atividades_worker] Concluído. Total: ${usuarios.length} | Enviados: ${countEnviados} | Pulados (sem atividades ou inativos): ${countPulados} | Falhas: ${countFalhas}`,
    )
  } catch (errCron) {
    console.error('[CRON email_diario_atividades_worker ERRO GERAL]', errCron)
  }
})

// -------------------------------------------------------------
// 2. ENDPOINT MANUAL PARA DISPARO OU TESTE CONTROLADO
// POST /backend/v1/email-diario/executar
// Suporta dry_run: true (não envia Resend real) e user_id (para testar usuário específico)
// -------------------------------------------------------------
routerAdd('POST', '/backend/v1/email-diario/executar', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const body = e.requestInfo().body || {}
    const dryRun = body.dry_run !== undefined ? Boolean(body.dry_run) : false
    const forceUserId = body.user_id ? String(body.user_id).trim() : ''

    const agora = new Date()
    const brMs = agora.getTime() - 3 * 60 * 60 * 1000
    const brDate = new Date(brMs)
    const pad = (n) => (n < 10 ? '0' + n : String(n))
    const hojeY = brDate.getUTCFullYear()
    const hojeM = brDate.getUTCMonth() + 1
    const hojeD = brDate.getUTCDate()
    const hojeYmd = `${hojeY}-${pad(hojeM)}-${pad(hojeD)}`
    const hojeFormatado = `${pad(hojeD)}/${pad(hojeM)}/${hojeY}`

    console.log(
      `[ENDPOINT /backend/v1/email-diario/executar] Disparado por ${authUser.getString('email') || authUser.id}. Data Brasília: ${hojeYmd} | dryRun: ${dryRun} | forceUser: ${forceUserId || 'todos'}`,
    )

    const apiKey = ($os.getenv('RESEND_API_KEY') || '').trim()
    if (!apiKey && !dryRun) {
      return e.json(200, {
        ok: false,
        error: 'RESEND_API_KEY não configurada no backend',
        enviados: 0,
        pulados: 0,
        falhas: 0,
      })
    }

    const sender = 'Delfos Solar <solar@updates.delfos.eng.br>'
    let appUrl = ($os.getenv('SITE_URL') || '').trim().replace(/\/+$/, '')
    if (!appUrl) appUrl = 'https://crm.delfos.eng.br'

    let filterUsers = "ativo = true || ativo = ''"
    if (forceUserId) {
      filterUsers = `id = '${forceUserId}'`
    }
    const usuarios = $app.findRecordsByFilter('users', filterUsers, 'name', 200, 0)

    const filterAtividades =
      "(status = 'pendente' || status = 'agendada' || status = 'em_execucao')"
    const atividadesAbertas = $app.findRecordsByFilter(
      'atividades',
      filterAtividades,
      'data',
      1500,
      0,
    )

    const escapeHtml = (str) => {
      if (!str) return ''
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
    }

    const formatarTipoInline = (tipo, subtipo, tipoUnificado) => {
      if (tipoUnificado && String(tipoUnificado).trim() !== '') return String(tipoUnificado).trim()
      if (subtipo && String(subtipo).trim() !== '' && subtipo !== tipo)
        return String(subtipo).trim()
      const map = {
        contato_ligacao: 'Ligação Telefônica',
        ligacao: 'Ligação Telefônica',
        reuniao_presencial: 'Reunião Presencial',
        reuniao: 'Reunião',
        visita_tecnica: 'Visita Técnica',
        follow_up: 'Follow-up Comercial',
        instalacao: 'Instalação Solar',
        proposta: 'Proposta Comercial',
        limpeza: 'Limpeza dos Módulos',
        manutencao_preventiva: 'Manutenção Preventiva',
        manutencao_corretiva: 'Manutenção Corretiva',
        limpeza_manutencao: 'Limpeza dos Módulos',
        auto_leitura_rge: 'Auto Leitura RGE',
        lembrete_auto_leitura: 'Lembrete Auto Leitura',
        solicitar_contas_rge: 'Solicitar Contas RGE',
        analise_fatura: 'Análise de Fatura RGE',
        mudanca_estagio: 'Mudança de Estágio',
        anotacao: 'Anotação Interna',
        garantia_equipamento: 'Garantia de Equipamento',
        configuracao_datalogger: 'Configuração de Datalogger',
        relatorio_solarview: 'Relatório SolarView',
        mensagem_enviada: 'Mensagem Enviada',
        oferecer_limpeza_avulsa: 'Oferta Limpeza Avulsa',
        gerar_contrato: 'Gerar Contrato',
        gerar_procuracao: 'Gerar Procuração',
        custom: 'Atividade Personalizada',
      }
      const t = (tipo || '').toLowerCase().trim()
      return map[t] || (t ? t.replace(/_/g, ' ') : 'Atividade')
    }

    const extrairInfoInline = (atv) => {
      const dataStr = atv.getString('data') || atv.getString('created') || ''
      let dataBr = '-'
      let ymd = ''
      let horaIso = ''
      let ms = 0

      if (dataStr) {
        const dObj = new Date(dataStr)
        if (!isNaN(dObj.getTime())) {
          ms = dObj.getTime()
          const bMs = ms - 3 * 60 * 60 * 1000
          const bDate = new Date(bMs)
          const y = bDate.getUTCFullYear()
          const m = bDate.getUTCMonth() + 1
          const day = bDate.getUTCDate()
          const h = bDate.getUTCHours()
          const min = bDate.getUTCMinutes()
          ymd = `${y}-${pad(m)}-${pad(day)}`
          dataBr = `${pad(day)}/${pad(m)}/${y}`
          horaIso = `${pad(h)}:${pad(min)}`
        }
      }

      const hInicio = (atv.getString('horario_inicio') || '').trim()
      const hFim = (atv.getString('horario_fim') || '').trim()

      let horaFormatada = ''
      if (hInicio && hFim) horaFormatada = `${hInicio} às ${hFim}`
      else if (hInicio) horaFormatada = hInicio
      else if (horaIso && horaIso !== '00:00') horaFormatada = horaIso

      return { dataBr, ymd, horaFormatada, timestamp: ms }
    }

    const clientesCache = {}
    const getClienteInfo = (clienteId) => {
      if (!clienteId) return null
      if (clientesCache[clienteId] !== undefined) return clientesCache[clienteId]
      try {
        const cliList = $app.findRecordsByFilter('clientes', `id = '${clienteId}'`, '', 1, 0)
        if (cliList && cliList.length > 0) {
          const cli = cliList[0]
          const nome = cli.getString('nome') || cli.getString('nome_fantasia') || ''
          const cidade = cli.getString('cidade') || ''
          clientesCache[clienteId] = { nome, cidade }
          return clientesCache[clienteId]
        }
      } catch (_) {}
      clientesCache[clienteId] = null
      return null
    }

    let countEnviados = 0
    let countPulados = 0
    let countFalhas = 0
    const detalhes = []

    for (let u = 0; u < usuarios.length; u++) {
      const user = usuarios[u]
      const userId = user.id
      const userEmail = (user.getString('email') || '').trim()
      const userName = user.getString('name') || 'Colaborador'
      const userAtivo = user.getBool('ativo')

      if (userAtivo === false || !userEmail) {
        countPulados++
        detalhes.push({ userId, name: userName, status: 'pulado_inativo_ou_sem_email' })
        continue
      }

      const atrasadas = []
      const doDia = []

      for (let a = 0; a < atividadesAbertas.length; a++) {
        const atv = atividadesAbertas[a]
        const respId = (atv.getString('responsavel_id') || '').trim()
        if (respId !== userId) continue

        const infoAg = extrairInfoInline(atv)
        const ymdAtv = infoAg.ymd
        if (!ymdAtv) continue

        const clienteId = atv.getString('cliente_id')
        const cliInfo = getClienteInfo(clienteId)
        const clienteNome = cliInfo ? cliInfo.nome : ''
        const clienteCidade = cliInfo ? cliInfo.cidade : ''

        const tipoFormatado = formatarTipoInline(
          atv.getString('tipo'),
          atv.getString('subtipo'),
          atv.getString('tipo_unificado'),
        )
        const titulo = (atv.getString('titulo') || '').trim() || tipoFormatado

        const itemData = {
          id: atv.id,
          titulo,
          tipoFormatado,
          clienteNome,
          clienteCidade,
          dataBr: infoAg.dataBr,
          ymd: ymdAtv,
          horaFormatada: infoAg.horaFormatada,
          timestamp: infoAg.timestamp,
        }

        if (ymdAtv < hojeYmd) {
          let diasAtraso = 1
          try {
            const d1 = new Date(ymdAtv + 'T12:00:00Z').getTime()
            const d2 = new Date(hojeYmd + 'T12:00:00Z').getTime()
            const diff = Math.floor((d2 - d1) / (24 * 60 * 60 * 1000))
            diasAtraso = diff > 0 ? diff : 1
          } catch (_) {}
          itemData.diasAtraso = diasAtraso
          atrasadas.push(itemData)
        } else if (ymdAtv === hojeYmd) {
          doDia.push(itemData)
        }
      }

      if (atrasadas.length === 0 && doDia.length === 0) {
        countPulados++
        detalhes.push({
          userId,
          name: userName,
          email: userEmail,
          status: 'pulado_sem_atividades',
          atrasadas: 0,
          doDia: 0,
        })
        continue
      }

      atrasadas.sort((x, y) => x.timestamp - y.timestamp)
      doDia.sort((x, y) => x.timestamp - y.timestamp)

      let subject = ''
      if (atrasadas.length > 0 && doDia.length > 0) {
        subject = `Delfos Solar: ${doDia.length} ${doDia.length === 1 ? 'atividade para hoje' : 'atividades para hoje'} e ${atrasadas.length} ${atrasadas.length === 1 ? 'atrasada' : 'atrasadas'}`
      } else if (doDia.length > 0) {
        subject = `Delfos Solar: Suas ${doDia.length} ${doDia.length === 1 ? 'atividade de hoje' : 'atividades de hoje'} (${hojeFormatado})`
      } else {
        subject = `Delfos Solar: Você tem ${atrasadas.length} ${atrasadas.length === 1 ? 'atividade atrasada' : 'atividades atrasadas'}`
      }

      const textLines = [
        `Olá, ${userName}!`,
        '',
        `Aqui está o seu resumo de atividades para hoje (${hojeFormatado}).`,
        '',
      ]

      if (atrasadas.length > 0) {
        textLines.push(`=== ATIVIDADES ATRASADAS (${atrasadas.length}) ===`)
        for (let idx = 0; idx < atrasadas.length; idx++) {
          const itemAt = atrasadas[idx]
          let s = `• ${itemAt.titulo} [${itemAt.tipoFormatado}] — Atrasada há ${itemAt.diasAtraso} ${itemAt.diasAtraso === 1 ? 'dia' : 'dias'} (Prevista para: ${itemAt.dataBr}${itemAt.horaFormatada ? ' às ' + itemAt.horaFormatada : ''})`
          if (itemAt.clienteNome) {
            s += ` | Cliente: ${itemAt.clienteNome}`
            if (itemAt.clienteCidade) s += ` (${itemAt.clienteCidade})`
          }
          textLines.push(s)
        }
        textLines.push('')
      }

      if (doDia.length > 0) {
        textLines.push(`=== ATIVIDADES DE HOJE (${doDia.length}) ===`)
        for (let idx = 0; idx < doDia.length; idx++) {
          const itemD = doDia[idx]
          let s = `• ${itemD.titulo} [${itemD.tipoFormatado}]${itemD.horaFormatada ? ' — Horário: ' + itemD.horaFormatada : ' — Sem horário fixo'}`
          if (itemD.clienteNome) {
            s += ` | Cliente: ${itemD.clienteNome}`
            if (itemD.clienteCidade) s += ` (${itemD.clienteCidade})`
          }
          textLines.push(s)
        }
        textLines.push('')
      }

      textLines.push('Acesse a Central de Atividades para gerenciá-las:')
      textLines.push(`${appUrl}/central-atividades`)
      textLines.push('')
      textLines.push('— Equipe Delfos Solar')
      const plainText = textLines.join('\n')

      const htmlBlocks = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        `<title>${escapeHtml(subject)}</title>`,
        '</head>',
        '<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">',
        '<div style="max-width: 620px; margin: 24px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">',
        '<div style="background: linear-gradient(135deg, #047857 0%, #065f46 100%); padding: 24px 28px; color: #ffffff;">',
        '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
        '<tr>',
        '<td>',
        '<h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: #ffffff;">Delfos Solar</h1>',
        `<p style="margin: 4px 0 0 0; font-size: 13px; color: #d1fae5;">Resumo Diário de Atividades • ${escapeHtml(hojeFormatado)}</p>`,
        '</td>',
        '<td align="right" style="font-size: 12px; color: #a7f3d0;">7h Brasília</td>',
        '</tr>',
        '</table>',
        '</div>',
        '<div style="padding: 28px;">',
        `<p style="font-size: 16px; margin: 0 0 16px 0; color: #0f172a;">Olá, <strong>${escapeHtml(userName)}</strong>!</p>`,
        '<p style="font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; color: #475569;">Confira abaixo as atividades sob sua responsabilidade que exigem atenção hoje:</p>',
      ]

      if (atrasadas.length > 0) {
        htmlBlocks.push(
          '<div style="margin-bottom: 24px;">',
          '<div style="display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #fee2e2;">',
          '<span style="background-color: #ef4444; color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; margin-right: 8px;">Atenção</span>',
          `<h2 style="margin: 0; font-size: 15px; color: #991b1b; font-weight: 700;">Atividades Atrasadas (${atrasadas.length})</h2>`,
          '</div>',
        )
        for (let i = 0; i < atrasadas.length; i++) {
          const aItem = atrasadas[i]
          const diasTexto =
            aItem.diasAtraso === 1 ? 'Atrasada há 1 dia' : `Atrasada há ${aItem.diasAtraso} dias`
          htmlBlocks.push(
            '<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">',
            '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
            '<tr>',
            '<td style="vertical-align: top;">',
            `<div style="font-size: 14px; font-weight: 600; color: #7f1d1d; margin-bottom: 4px;">${escapeHtml(aItem.titulo)}</div>`,
            `<div style="font-size: 12px; color: #991b1b; margin-bottom: 4px;"><strong>Tipo:</strong> ${escapeHtml(aItem.tipoFormatado)}</div>`,
          )
          if (aItem.clienteNome) {
            htmlBlocks.push(
              `<div style="font-size: 12px; color: #475569; margin-bottom: 2px;"><strong>Cliente:</strong> ${escapeHtml(aItem.clienteNome)}${aItem.clienteCidade ? ' (' + escapeHtml(aItem.clienteCidade) + ')' : ''}</div>`,
            )
          }
          htmlBlocks.push(
            `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Data prevista: ${escapeHtml(aItem.dataBr)}${aItem.horaFormatada ? ' às ' + escapeHtml(aItem.horaFormatada) : ''}</div>`,
            '</td>',
            '<td align="right" style="vertical-align: top; white-space: nowrap; padding-left: 10px;">',
            `<span style="background-color: #fee2e2; color: #b91c1c; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-block;">${escapeHtml(diasTexto)}</span>`,
            '</td>',
            '</tr>',
            '</table>',
            '</div>',
          )
        }
        htmlBlocks.push('</div>')
      }

      if (doDia.length > 0) {
        htmlBlocks.push(
          '<div style="margin-bottom: 24px;">',
          '<div style="display: flex; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #e0e7ff;">',
          '<span style="background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase; margin-right: 8px;">Para Hoje</span>',
          `<h2 style="margin: 0; font-size: 15px; color: #0369a1; font-weight: 700;">Atividades do Dia (${doDia.length})</h2>`,
          '</div>',
        )
        for (let i = 0; i < doDia.length; i++) {
          const dItem = doDia[i]
          const horarioBadge = dItem.horaFormatada ? dItem.horaFormatada : 'Sem horário'
          htmlBlocks.push(
            '<div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid #0284c7; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">',
            '<table width="100%" cellpadding="0" cellspacing="0" border="0">',
            '<tr>',
            '<td style="vertical-align: top;">',
            `<div style="font-size: 14px; font-weight: 600; color: #0c4a6e; margin-bottom: 4px;">${escapeHtml(dItem.titulo)}</div>`,
            `<div style="font-size: 12px; color: #0369a1; margin-bottom: 4px;"><strong>Tipo:</strong> ${escapeHtml(dItem.tipoFormatado)}</div>`,
          )
          if (dItem.clienteNome) {
            htmlBlocks.push(
              `<div style="font-size: 12px; color: #475569; margin-bottom: 2px;"><strong>Cliente:</strong> ${escapeHtml(dItem.clienteNome)}${dItem.clienteCidade ? ' (' + escapeHtml(dItem.clienteCidade) + ')' : ''}</div>`,
            )
          }
          htmlBlocks.push(
            `<div style="font-size: 11px; color: #64748b; margin-top: 4px;">Data: ${escapeHtml(dItem.dataBr)}${dItem.horaFormatada ? ' às ' + escapeHtml(dItem.horaFormatada) : ''}</div>`,
            '</td>',
            '<td align="right" style="vertical-align: top; white-space: nowrap; padding-left: 10px;">',
            `<span style="background-color: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; display: inline-block;">${escapeHtml(horarioBadge)}</span>`,
            '</td>',
            '</tr>',
            '</table>',
            '</div>',
          )
        }
        htmlBlocks.push('</div>')
      }

      const centralUrl = `${appUrl}/central-atividades`
      htmlBlocks.push(
        '<div style="text-align: center; margin: 32px 0 16px 0;">',
        `<a href="${centralUrl}" style="background-color: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(5,150,105,0.2);">Abrir Central de Atividades</a>`,
        '</div>',
        '</div>',
        '<div style="background-color: #f1f5f9; padding: 20px 28px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">',
        '<p style="margin: 0 0 6px 0; font-weight: 600; color: #334155;">Delfos Engenharia & Energia Solar</p>',
        '<p style="margin: 0 0 6px 0;">Rua Espírito Santo, 275 • Erechim - RS</p>',
        '<p style="margin: 0; color: #94a3b8;">Este é um e-mail automático gerado às 7h pelo CRM Delfos Solar.</p>',
        '</div>',
        '</div>',
        '</body>',
        '</html>',
      )
      const htmlContent = htmlBlocks.join('\n')

      const payload = {
        from: sender,
        to: [userEmail],
        subject: subject,
        html: htmlContent,
        text: plainText,
        reply_to: 'delfos.usinas@gmail.com',
      }

      if (dryRun) {
        countEnviados++
        detalhes.push({
          userId,
          name: userName,
          email: userEmail,
          status: 'simulado_dry_run',
          atrasadas: atrasadas.length,
          doDia: doDia.length,
          subject,
        })
        console.log(
          `[ENDPOINT /backend/v1/email-diario/executar] [DRY RUN] ${userEmail} (${userName}) - Atrasadas: ${atrasadas.length} | Do dia: ${doDia.length}`,
        )
        continue
      }

      try {
        const res = $http.send({
          url: 'https://api.resend.com/emails',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 25,
        })

        let parsed = null
        try {
          parsed = res.json || (res.raw ? JSON.parse(res.raw) : null)
        } catch (_) {}

        if (res.statusCode >= 200 && res.statusCode < 300) {
          const emailId = (parsed && parsed.id) || (parsed && parsed.data && parsed.data.id) || ''
          countEnviados++
          detalhes.push({
            userId,
            name: userName,
            email: userEmail,
            status: 'enviado',
            resendId: emailId,
            atrasadas: atrasadas.length,
            doDia: doDia.length,
          })
        } else {
          const errDetail =
            (parsed && (parsed.message || parsed.error)) ||
            (res.raw ? res.raw.substring(0, 200) : 'HTTP ' + res.statusCode)
          countFalhas++
          detalhes.push({
            userId,
            name: userName,
            email: userEmail,
            status: 'falha',
            statusCode: res.statusCode,
            error: errDetail,
          })
        }
      } catch (sendErr) {
        countFalhas++
        const msgErr = sendErr && sendErr.message ? sendErr.message : String(sendErr)
        detalhes.push({
          userId,
          name: userName,
          email: userEmail,
          status: 'erro_excecao',
          error: msgErr,
        })
      }
    }

    return e.json(200, {
      ok: countFalhas === 0,
      hoje: hojeFormatado,
      totalUsuarios: usuarios.length,
      enviados: countEnviados,
      pulados: countPulados,
      falhas: countFalhas,
      detalhes,
    })
  } catch (errEndpoint) {
    const msg = errEndpoint && errEndpoint.message ? errEndpoint.message : String(errEndpoint)
    console.error('[ENDPOINT /backend/v1/email-diario/executar ERRO]', msg)
    return e.json(500, { ok: false, error: msg })
  }
})

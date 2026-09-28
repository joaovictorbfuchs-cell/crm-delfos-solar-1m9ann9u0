migrate(
  (app) => {
    // Atualizar filhas de demonstração da atividade mãe l9lvqxmw8kn2gls para mostrar os 3 estados
    // 15/01/2027 -> 'concluida' com dados_leitura_registrados e status concluída
    // 15/02/2027 -> 'enviado' (lembrete enviado)
    // 15/03/2027 -> 'pendente' (aguardando envio de lembrete)

    try {
      // Filha 1: 15/01/2027 (id anws55ppja0o6a8)
      const filha1 = app.findRecordById('atividades', 'anws55ppja0o6a8')
      if (filha1) {
        filha1.set('status', 'concluida')
        filha1.set(
          'dados_leitura_registrados',
          'Leitura realizada: Leitura 45892 kWh. Protocolo RGE: 2027-0115-9982. Data de envio: 15/01/2027. Obs: Medidor em perfeito estado, leitura confirmada.',
        )
        filha1.set('lembrete_whatsapp_enviado_em', '2027-01-13T08:00:00.000Z')
        app.save(filha1)
      }
    } catch (e) {
      console.log('[0174] Aviso ao atualizar filha 1:', e)
    }

    try {
      // Filha 2: 15/02/2027 (id sjwwkzofwhr5ol9)
      const filha2 = app.findRecordById('atividades', 'sjwwkzofwhr5ol9')
      if (filha2) {
        filha2.set('status', 'enviado')
        filha2.set('lembrete_whatsapp_enviado_em', '2027-02-13T08:00:00.000Z')
        app.save(filha2)
      }
    } catch (e) {
      console.log('[0174] Aviso ao atualizar filha 2:', e)
    }

    try {
      // Filha 3: 15/03/2027 (id 3s8b305yf4c9y5u)
      const filha3 = app.findRecordById('atividades', '3s8b305yf4c9y5u')
      if (filha3) {
        filha3.set('status', 'pendente')
        app.save(filha3)
      }
    } catch (e) {
      console.log('[0174] Aviso ao atualizar filha 3:', e)
    }
  },
  (app) => {
    // Reverter estados demo se necessário
    try {
      const filha1 = app.findRecordById('atividades', 'anws55ppja0o6a8')
      if (filha1) {
        filha1.set('status', 'pendente')
        filha1.set('dados_leitura_registrados', '')
        app.save(filha1)
      }
      const filha2 = app.findRecordById('atividades', 'sjwwkzofwhr5ol9')
      if (filha2) {
        filha2.set('status', 'pendente')
        app.save(filha2)
      }
    } catch (_) {}
  },
)

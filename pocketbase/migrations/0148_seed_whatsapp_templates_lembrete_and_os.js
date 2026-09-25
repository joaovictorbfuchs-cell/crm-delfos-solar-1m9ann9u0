migrate(
  (app) => {
    const templatesCol = app.findCollectionByNameOrId('whatsapp_templates')

    // 1. Template: Lembrete Auto Leitura RGE
    // slug: lembrete_auto_leitura_rge
    const textoAutoLeitura =
      'Olá, boa tarde! Chegou o momento da leitura do medidor de energia na instalação da {{usina}}, instalação consumidora {{numero_uc}} e endereço {{endereco}}. Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, onde apareçam claramente as seguintes grandezas: 03 – Energia consumida (kWh) e 103 – Energia injetada (kWh). Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, para conferência e validação dos dados antes do envio à RGE.'

    let tplLeitura = null
    try {
      tplLeitura = app.findFirstRecordByData(
        'whatsapp_templates',
        'slug',
        'lembrete_auto_leitura_rge',
      )
    } catch (_) {}

    if (!tplLeitura) {
      const record = new Record(templatesCol)
      record.set('titulo', 'Lembrete Auto Leitura RGE')
      record.set('slug', 'lembrete_auto_leitura_rge')
      record.set('conteudo', textoAutoLeitura)
      record.set('tipo_gatilho', 'operacional')
      record.set('variaveis_disponiveis', ['nome_cliente', 'usina', 'numero_uc', 'endereco'])
      record.set('ativo', true)
      app.save(record)
    } else {
      tplLeitura.set('titulo', 'Lembrete Auto Leitura RGE')
      tplLeitura.set('conteudo', textoAutoLeitura)
      tplLeitura.set('tipo_gatilho', 'operacional')
      tplLeitura.set('variaveis_disponiveis', ['nome_cliente', 'usina', 'numero_uc', 'endereco'])
      tplLeitura.set('ativo', true)
      app.save(tplLeitura)
    }

    // 2. Template: Notificação de OS para Técnico
    // slug: os_atribuida_instalador
    const textoOS =
      '📋 *Nova Ordem de Serviço atribuída*\n👤 Cliente: {{nome_cliente}}\n🔧 Serviço: {{tipo_servico}}\n📍 Endereço: {{endereco}}\n📅 Data: {{data_agendada}}\n👨‍🔧 Técnico: {{nome_instalador}}\n\nAcesse o CRM para ver a ficha de execução.'

    let tplOS = null
    try {
      tplOS = app.findFirstRecordByData('whatsapp_templates', 'slug', 'os_atribuida_instalador')
    } catch (_) {}

    if (!tplOS) {
      const record = new Record(templatesCol)
      record.set('titulo', 'Notificação de OS para Técnico')
      record.set('slug', 'os_atribuida_instalador')
      record.set('conteudo', textoOS)
      record.set('tipo_gatilho', 'operacional')
      record.set('variaveis_disponiveis', [
        'nome_cliente',
        'tipo_servico',
        'endereco',
        'data_agendada',
        'nome_instalador',
        'id_os',
      ])
      record.set('ativo', true)
      app.save(record)
    } else {
      tplOS.set('titulo', 'Notificação de OS para Técnico')
      tplOS.set('tipo_gatilho', 'operacional')
      tplOS.set('variaveis_disponiveis', [
        'nome_cliente',
        'tipo_servico',
        'endereco',
        'data_agendada',
        'nome_instalador',
        'id_os',
      ])
      tplOS.set('ativo', true)
      app.save(tplOS)
    }
  },
  (app) => {
    try {
      const tpl = app.findFirstRecordByData(
        'whatsapp_templates',
        'slug',
        'lembrete_auto_leitura_rge',
      )
      if (tpl) {
        app.delete(tpl)
      }
    } catch (_) {}
  },
)

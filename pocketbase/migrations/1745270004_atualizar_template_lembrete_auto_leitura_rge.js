/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const textoAtualizado =
      'Olá, {{nome_cliente}}! Chegou o momento da leitura do medidor de energia na usina {{usina}}, instalação consumidora {{numero_uc}} e endereço {{endereco}}. Solicitamos a leitura referente a {{data}}. Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, onde apareçam claramente as seguintes grandezas: 03 – Energia consumida (kWh) e 103 – Energia injetada (kWh). Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, para conferência e validação dos dados antes do envio à RGE.'

    let tpl = null
    try {
      tpl = app.findRecordById('whatsapp_templates', 'qvmkpl0mj2pun1i')
    } catch (_) {
      try {
        tpl = app.findFirstRecordByData('whatsapp_templates', 'slug', 'lembrete_auto_leitura_rge')
      } catch (__) {}
    }

    if (tpl) {
      tpl.set('conteudo', textoAtualizado)
      const vars = tpl.get('variaveis_disponiveis') || []
      const lista = Array.isArray(vars) ? vars.slice() : []
      if (lista.indexOf('data') === -1) lista.push('data')
      if (lista.indexOf('nome_cliente') === -1) lista.push('nome_cliente')
      tpl.set('variaveis_disponiveis', lista)
      app.save(tpl)
    }
  },
  (app) => {
    // Reverter (opcional)
    try {
      const tpl = app.findFirstRecordByData(
        'whatsapp_templates',
        'slug',
        'lembrete_auto_leitura_rge',
      )
      if (tpl) {
        tpl.set(
          'conteudo',
          'Olá, boa tarde! Chegou o momento da leitura do medidor de energia na instalação da {{usina}}, instalação consumidora {{numero_uc}} e endereço {{endereco}}. Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, onde apareçam claramente as seguintes grandezas: 03 – Energia consumida (kWh) e 103 – Energia injetada (kWh). Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, para conferência e validação dos dados antes do envio à RGE.',
        )
        app.save(tpl)
      }
    } catch (_) {}
  },
)

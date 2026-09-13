migrate(
  (app) => {
    const tmplCol = app.findCollectionByNameOrId('os_templates')
    const osCol = app.findCollectionByNameOrId('ordens_servico')

    // 1. Templates de Instruções
    const templates = [
      {
        tipo_servico: 'Limpeza',
        instrucoes:
          '1. Fazer inspeção visual 360º de todo o arranjo fotovoltaico antes de aplicar água.\n' +
          '2. Desligar o disjuntor CA e a chave seccionadora CC do inversor por segurança.\n' +
          '3. Utilizar água desmineralizada ou com baixo teor de calcário e escova telescópica com cerdas macias anti-risco.\n' +
          '4. Nunca pisar ou apoiar peso sobre os módulos fotovoltaicos.\n' +
          '5. Após lavagem completa, religar as proteções CC e CA e aguardar sincronização do inversor na rede.\n' +
          '6. Registrar foto de antes e depois dos módulos e tela de operação do inversor.',
      },
      {
        tipo_servico: 'Instalação',
        instrucoes:
          '1. Conferir lista de materiais contra o projeto executivo (módulos, trilhos, grampos intermediários/finais, cabos solares, conectores MC4 e DPS).\n' +
          '2. Montar estrutura e fixadores respeitando o espaçamento das terças e torque recomendado pelo fabricante.\n' +
          '3. Assentar os módulos garantindo alinhamento e aperto uniforme com chave dinamométrica.\n' +
          '4. Confeccionar e crimpar conectores MC4 com alicate próprio, respeitando polaridade e travamento do conector.\n' +
          '5. Fixar e energizar inversor, conferir aterramento (BEP) e medir tensão de circuito aberto (Voc) de cada string antes de plugar.\n' +
          '6. Registrar fotos gerais da usina, padrão de entrada e cabeamento.',
      },
      {
        tipo_servico: 'Manutenção',
        instrucoes:
          '1. Realizar inspeção termográfica nos módulos e caixas de junção (Stringbox) para detecção de pontos quentes (hotspots).\n' +
          '2. Verificar aperto mecânico de todos os bornes de disjuntores, fusíveis e DPS com torquímetro.\n' +
          '3. Medir resistência de aterramento e isolação dos condutores CC.\n' +
          '4. Inspecionar estado dos cabos contra intempéries, mordeduras e ressecamento.\n' +
          '5. Limpar saídas de ventilação e dissipadores do inversor para evitar derating térmico.',
      },
      {
        tipo_servico: 'Garantia',
        instrucoes:
          '1. Fotografar placa de identificação com número de série (SN) e modelo do equipamento avariado.\n' +
          '2. Coletar medições elétricas de entrada CC (Voc, Isc) e saída CA (tensão de fase, frequência).\n' +
          '3. Registrar código e histórico de alarmes exibidos no display do inversor ou datalogger.\n' +
          '4. Coletar fotos nítidas do dano físico, queima ou corrosão para abertura de chamado junto ao fabricante/distribuidor.\n' +
          '5. Preencher termo de vistoria técnica com assinatura do cliente.',
      },
      {
        tipo_servico: 'Configuração de Datalogger',
        instrucoes:
          '1. Ligar o datalogger/antena Wi-Fi na porta USB/RS485 do inversor.\n' +
          '2. Conectar smartphone à rede Wi-Fi local do datalogger (SSID de configuração).\n' +
          '3. Acessar o assistente de configuração e conectar o datalogger à rede Wi-Fi 2.4GHz do cliente com senha.\n' +
          '4. Cadastrar o inversor no portal de monitoramento da Delfos Solar (ou app SolarView / fabricante).\n' +
          '5. Testar envio de pacotes e verificar se a geração em tempo real aparece no aplicativo do cliente.',
      },
    ]

    for (const t of templates) {
      try {
        app.findFirstRecordByData('os_templates', 'tipo_servico', t.tipo_servico)
      } catch (_) {
        const rec = new Record(tmplCol)
        rec.set('tipo_servico', t.tipo_servico)
        rec.set('instrucoes', t.instrucoes)
        app.save(rec)
      }
    }

    // 2. Ordens de Serviço de Exemplo
    // Clientes existentes no seed:
    // - Marcelo Becker (id: 9ozpqdm9sgwmdzr, Fazenda Três Palmeiras, Linha São João, Km 12, Passo Fundo/RS)
    // - Maria Santos (id: pp4572amhvqgm81, Mercado Santos & Filhos, Rua Itália, nº 450, Centro, Erechim/RS)
    // - João Pedro Oliveira (id: v339t6jz7wy93df, Residencial Oliveira, Av. Brasil Oeste, 1280, Passo Fundo/RS)
    // - Carlos Alberto Lima (id: vtszbseb345heif, Frigorífico Lima, Av. Getúlio Vargas, 2100, Chapecó/SC)

    // OS 1 (Pendente): Limpeza em Marcelo Becker
    try {
      app.findFirstRecordByData(
        'ordens_servico',
        'endereco',
        'Linha São João, Km 12 - Zona Rural, Passo Fundo/RS',
      )
    } catch (_) {
      const os1 = new Record(osCol)
      os1.set('cliente_id', '9ozpqdm9sgwmdzr')
      os1.set('tipo_servico', 'Limpeza')
      os1.set('endereco', 'Linha São João, Km 12 - Zona Rural, Passo Fundo/RS')
      os1.set('data_agendada', '2026-04-10 09:00:00.000Z')
      os1.set('status', 'pendente')
      os1.set('atribuida_a', 'Diego Fernandes')
      os1.set('instrucoes', templates[0].instrucoes)
      os1.set('checklist', [
        { id: '1', item: 'Chegou no local da usina', concluido: false },
        { id: '2', item: 'Verificou estado físico dos módulos e sujeira', concluido: false },
        { id: '3', item: 'Limpou os 64 módulos com água tratada e escova macia', concluido: false },
        { id: '4', item: 'Verificou status operacional do inversor Growatt MAX', concluido: false },
        { id: '5', item: 'Testou geração instantânea e sincronismo na rede', concluido: false },
      ])
      os1.set('detalhes_execucao', '')
      app.save(os1)
    }

    // OS 2 (Pendente): Instalação em Maria Santos
    try {
      app.findFirstRecordByData(
        'ordens_servico',
        'endereco',
        'Rua Itália, nº 450, Centro - Sala 02, Erechim/RS',
      )
    } catch (_) {
      const os2 = new Record(osCol)
      os2.set('cliente_id', 'pp4572amhvqgm81')
      os2.set('tipo_servico', 'Instalação')
      os2.set('endereco', 'Rua Itália, nº 450, Centro - Sala 02, Erechim/RS')
      os2.set('data_agendada', '2026-04-14 08:30:00.000Z')
      os2.set('status', 'pendente')
      os2.set('atribuida_a', 'Marcos Vinícius Silveira')
      os2.set('instrucoes', templates[1].instrucoes)
      os2.set('checklist', [
        { id: '1', item: 'Conferiu materiais recebidos contra projeto', concluido: false },
        { id: '2', item: 'Fixou suportes e perfis na estrutura metálica', concluido: false },
        { id: '3', item: 'Instalou os 30 módulos Canadian Solar', concluido: false },
        { id: '4', item: 'Conectou inversor Fronius Symo 12kW e Stringbox', concluido: false },
        { id: '5', item: 'Testou funcionamento e parâmetros elétricos', concluido: false },
      ])
      os2.set('detalhes_execucao', '')
      app.save(os2)
    }

    // OS 3 (Pendente): Configuração de Datalogger em João Pedro Oliveira
    try {
      app.findFirstRecordByData(
        'ordens_servico',
        'endereco',
        'Av. Brasil Oeste, 1280, Boqueirão, Passo Fundo/RS',
      )
    } catch (_) {
      const os3 = new Record(osCol)
      os3.set('cliente_id', 'v339t6jz7wy93df')
      os3.set('tipo_servico', 'Configuração de Datalogger')
      os3.set('endereco', 'Av. Brasil Oeste, 1280, Boqueirão, Passo Fundo/RS')
      os3.set('data_agendada', '2026-04-18 14:00:00.000Z')
      os3.set('status', 'pendente')
      os3.set('atribuida_a', 'Rafael Bortolini')
      os3.set('instrucoes', templates[4].instrucoes)
      os3.set('checklist', [
        { id: '1', item: 'Chegou no local e validou sinal Wi-Fi do cliente', concluido: false },
        { id: '2', item: 'Conectou o datalogger na porta do inversor Growatt', concluido: false },
        { id: '3', item: 'Vinculou à rede sem fio 2.4GHz', concluido: false },
        { id: '4', item: 'Registrou planta no portal de monitoramento Delfos', concluido: false },
        { id: '5', item: 'Validou geração em tempo real no app do cliente', concluido: false },
      ])
      os3.set('detalhes_execucao', '')
      app.save(os3)
    }

    // OS 4 (Concluída): Manutenção em Carlos Alberto Lima
    try {
      app.findFirstRecordByData(
        'ordens_servico',
        'endereco',
        'Av. Getúlio Vargas, 2100, Centro, Chapecó/SC',
      )
    } catch (_) {
      const os4 = new Record(osCol)
      os4.set('cliente_id', 'vtszbseb345heif')
      os4.set('tipo_servico', 'Manutenção')
      os4.set('endereco', 'Av. Getúlio Vargas, 2100, Centro, Chapecó/SC')
      os4.set('data_agendada', '2026-03-25 10:00:00.000Z')
      os4.set('status', 'concluida')
      os4.set('atribuida_a', 'Lucas Gabriel Zanin')
      os4.set('instrucoes', templates[2].instrucoes)
      os4.set('checklist', [
        { id: '1', item: 'Chegou no local e fez inspeção visual da usina', concluido: true },
        { id: '2', item: 'Realizou termografia nos 200 módulos e conexões', concluido: true },
        { id: '3', item: 'Reapertou bornes e conexões elétricas da Stringbox', concluido: true },
        {
          id: '4',
          item: 'Verificou ventilação e refrigeração do inversor Huawei 75kW',
          concluido: true,
        },
        { id: '5', item: 'Aferiu geração e medição de isolamento', concluido: true },
      ])
      os4.set(
        'detalhes_execucao',
        'Manutenção preventiva concluída com sucesso. Realizado reaperto com torquímetro em todos os barramentos da cabine e conferência de temperatura dos módulos com câmera termográfica. Sem anomalias ou aquecimento excessivo detectado. Geração instantânea em 68.4 kWp às 11h30 com céu claro. Cliente acompanhou a medição e assinou a liberação técnica.',
      )
      os4.set('concluida_em', '2026-03-25 12:45:00.000Z')
      app.save(os4)
    }
  },
  (app) => {
    try {
      const osCol = app.findCollectionByNameOrId('ordens_servico')
      const recs = app.findRecordsByFilter(
        'ordens_servico',
        "endereco ~ 'Passo Fundo' || endereco ~ 'Erechim' || endereco ~ 'Chapecó'",
      )
      for (const r of recs) {
        app.delete(r)
      }
    } catch (_) {}

    try {
      const tmplCol = app.findCollectionByNameOrId('os_templates')
      const tmpls = app.findRecordsByFilter('os_templates', "tipo_servico != ''")
      for (const t of tmpls) {
        app.delete(t)
      }
    } catch (_) {}
  },
)

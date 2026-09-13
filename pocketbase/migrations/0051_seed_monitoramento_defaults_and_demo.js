migrate(
  (app) => {
    const colMarcas = app.findCollectionByNameOrId('monitoramento_marcas')
    const colClientes = app.findCollectionByNameOrId('clientes')
    const colSistemas = app.findCollectionByNameOrId('sistemas')

    // 1. Cadastrar padrões das marcas mais comuns (especialmente SolarEdge e Growatt, mais Fronius, Huawei, Deye)
    const defaultsMarcas = [
      {
        marca: 'SolarEdge',
        app_nome: 'mySolarEdge',
        login_padrao: 'suporte@delfosengenharia.com.br',
        senha_padrao: 'DelfosSolarEdge@2025',
        datalogger_url: 'https://www.solaredge.com/setapp-help',
        instrucoes:
          'Conectar ao Wi-Fi local do inversor ou utilizar o aplicativo SetApp / mySolarEdge via QR Code.',
      },
      {
        marca: 'Growatt',
        app_nome: 'ShinePhone',
        login_padrao: 'delfos_monitoramento',
        senha_padrao: 'Growatt@Delfos2025',
        datalogger_url: 'http://192.168.10.100',
        instrucoes:
          'Acessar o IP do ShineWiFi 192.168.10.100 (senha padrão admin) ou parear via Bluetooth no ShinePhone.',
      },
      {
        marca: 'Fronius',
        app_nome: 'Fronius Solar.web',
        login_padrao: 'monitoramento@delfosengenharia.com.br',
        senha_padrao: 'Fronius@Delfos2025',
        datalogger_url: 'http://192.168.250.181',
        instrucoes:
          'Pressionar o botão no Datamanager para ativar ponto de acesso Wi-Fi do inversor Fronius.',
      },
      {
        marca: 'Huawei',
        app_nome: 'FusionSolar',
        login_padrao: 'delfos.fusionsolar@delfos.com.br',
        senha_padrao: 'HuaweiSolar@2025',
        datalogger_url: 'https://intl.fusionsolar.huawei.com',
        instrucoes:
          'Acessar portal FusionSolar ou conectar no Wi-Fi interno do SmartLogger / Dongle.',
      },
      {
        marca: 'Deye',
        app_nome: 'SOLARMAN Smart',
        login_padrao: 'delfos.solarman',
        senha_padrao: 'DeyeSolar@2025',
        datalogger_url: 'http://10.10.100.254',
        instrucoes:
          'Conectar à rede Wi-Fi AP do Datalogger Deye e configurar a rede do cliente pelo IP 10.10.100.254.',
      },
    ]

    for (const item of defaultsMarcas) {
      try {
        app.findFirstRecordByData('monitoramento_marcas', 'marca', item.marca)
      } catch (_) {
        const rec = new Record(colMarcas)
        rec.set('marca', item.marca)
        rec.set('app_nome', item.app_nome)
        rec.set('login_padrao', item.login_padrao)
        rec.set('senha_padrao', item.senha_padrao)
        rec.set('datalogger_url', item.datalogger_url)
        rec.set('instrucoes', item.instrucoes)
        app.save(rec)
      }
    }

    // 2. Atualizar cliente Growatt existente (Marcelo Becker) com os dados de exemplo do Growatt (app ShinePhone)
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      marcelo.set('inversor_marca', 'Growatt')
      marcelo.set('inversor_modelo', 'Growatt MAX 30KTL3-X LV')
      marcelo.set('monitoramento_app_nome', 'ShinePhone')
      marcelo.set('monitoramento_login', 'marcelo.growatt@fazenda3p.com.br')
      marcelo.set('monitoramento_senha', 'Growatt@Becker2025')
      marcelo.set('monitoramento_datalogger_url', 'http://192.168.10.100')
      app.save(marcelo)

      // Atualizar também na tabela sistemas se houver
      try {
        const sistemaMarcelo = app.findFirstRecordByData('sistemas', 'cliente_id', marcelo.id)
        sistemaMarcelo.set('fabricante_inversores', 'Growatt')
        sistemaMarcelo.set('modelo_inversores', 'Growatt MAX 30KTL3-X LV')
        sistemaMarcelo.set('monitoramento_app_nome', 'ShinePhone')
        sistemaMarcelo.set('monitoramento_login', 'marcelo.growatt@fazenda3p.com.br')
        sistemaMarcelo.set('monitoramento_senha', 'Growatt@Becker2025')
        sistemaMarcelo.set('monitoramento_datalogger_url', 'http://192.168.10.100')
        app.save(sistemaMarcelo)
      } catch (_) {}
    } catch (_) {}

    // 3. Atualizar outro cliente Growatt (João Pedro Oliveira) para já vir com dados preenchidos
    try {
      const joaoPedro = app.findFirstRecordByData('clientes', 'nome', 'João Pedro Oliveira')
      joaoPedro.set('inversor_marca', 'Growatt')
      joaoPedro.set('monitoramento_app_nome', 'ShinePhone')
      joaoPedro.set('monitoramento_login', 'joaopedro.shine@gmail.com')
      joaoPedro.set('monitoramento_senha', 'ShinePass#2025')
      joaoPedro.set('monitoramento_datalogger_url', 'http://192.168.10.100')
      app.save(joaoPedro)
    } catch (_) {}

    // 4. Cadastrar / Atualizar cliente com inversor SolarEdge (app mySolarEdge)
    // Usaremos Roberto Almeida ou criaremos um cliente dedicado "Supermercado Almeida (SolarEdge)"
    try {
      let clienteSolarEdge = null
      try {
        clienteSolarEdge = app.findFirstRecordByData(
          'clientes',
          'nome',
          'Roberto Almeida (Supermercado Almeida)',
        )
      } catch (_) {
        clienteSolarEdge = null
      }

      if (clienteSolarEdge) {
        clienteSolarEdge.set('inversor_marca', 'SolarEdge')
        clienteSolarEdge.set('inversor_modelo', 'SolarEdge SE30K com Otimizadores P850')
        clienteSolarEdge.set('placas_marca', 'Canadian Solar 550W')
        clienteSolarEdge.set('placas_qtd', 60)
        clienteSolarEdge.set('potencia_kwp', 32.5)
        clienteSolarEdge.set('telhado_tipo', 'metalico')
        clienteSolarEdge.set('monitoramento_app_nome', 'mySolarEdge')
        clienteSolarEdge.set('monitoramento_login', 'roberto.almeida@solaredge-delfos.com.br')
        clienteSolarEdge.set('monitoramento_senha', 'SolarEdge@Almeida2025!')
        clienteSolarEdge.set(
          'monitoramento_datalogger_url',
          'https://www.solaredge.com/setapp-help',
        )
        app.save(clienteSolarEdge)

        // Sistema para Roberto Almeida
        try {
          const sis = app.findFirstRecordByData('sistemas', 'cliente_id', clienteSolarEdge.id)
          sis.set('fabricante_inversores', 'SolarEdge')
          sis.set('modelo_inversores', 'SolarEdge SE30K com Otimizadores P850')
          sis.set('potencia_total_kwp', 32.5)
          sis.set('potencia_pico_inversores_kwp', 30.0)
          sis.set('potencia_pico_modulos_kwp', 33.0)
          sis.set('quantidade_modulos', 60)
          sis.set('fabricante_modulos', 'Canadian Solar')
          sis.set('monitoramento_app_nome', 'mySolarEdge')
          sis.set('monitoramento_login', 'roberto.almeida@solaredge-delfos.com.br')
          sis.set('monitoramento_senha', 'SolarEdge@Almeida2025!')
          sis.set('monitoramento_datalogger_url', 'https://www.solaredge.com/setapp-help')
          app.save(sis)
        } catch (_) {
          const sis = new Record(colSistemas)
          sis.set('cliente_id', clienteSolarEdge.id)
          sis.set('fabricante_inversores', 'SolarEdge')
          sis.set('modelo_inversores', 'SolarEdge SE30K com Otimizadores P850')
          sis.set('potencia_total_kwp', 32.5)
          sis.set('potencia_pico_inversores_kwp', 30.0)
          sis.set('potencia_pico_modulos_kwp', 33.0)
          sis.set('quantidade_modulos', 60)
          sis.set('fabricante_modulos', 'Canadian Solar')
          sis.set('monitoramento_app_nome', 'mySolarEdge')
          sis.set('monitoramento_login', 'roberto.almeida@solaredge-delfos.com.br')
          sis.set('monitoramento_senha', 'SolarEdge@Almeida2025!')
          sis.set('monitoramento_datalogger_url', 'https://www.solaredge.com/setapp-help')
          app.save(sis)
        }
      } else {
        // Se Roberto Almeida não existir, criar cliente SolarEdge demonstrativo
        const rec = new Record(colClientes)
        rec.set('nome', 'Supermercado Central SolarEdge')
        rec.set('telefone', '(54) 99654-3210')
        rec.set('whatsapp', '(54) 99654-3210')
        rec.set('cidade', 'Erechim/RS')
        rec.set('endereco', 'Av. Sete de Setembro, 850')
        rec.set('status', 'Fechado')
        rec.set('produto', 'Energia Solar')
        rec.set('potencia_kwp', 35.0)
        rec.set('valor_estimado', 145000)
        rec.set('inversor_marca', 'SolarEdge')
        rec.set('inversor_modelo', 'SolarEdge SE33.3K')
        rec.set('placas_marca', 'JA Solar 550W')
        rec.set('placas_qtd', 64)
        rec.set('telhado_tipo', 'metalico')
        rec.set('monitoramento_app_nome', 'mySolarEdge')
        rec.set('monitoramento_login', 'admin@supermercadocentral.com.br')
        rec.set('monitoramento_senha', 'SolarEdge@Central2025')
        rec.set('monitoramento_datalogger_url', 'https://www.solaredge.com/setapp-help')
        app.save(rec)

        const sis = new Record(colSistemas)
        sis.set('cliente_id', rec.id)
        sis.set('fabricante_inversores', 'SolarEdge')
        sis.set('modelo_inversores', 'SolarEdge SE33.3K')
        sis.set('potencia_total_kwp', 35.0)
        sis.set('potencia_pico_inversores_kwp', 33.3)
        sis.set('quantidade_modulos', 64)
        sis.set('monitoramento_app_nome', 'mySolarEdge')
        sis.set('monitoramento_login', 'admin@supermercadocentral.com.br')
        sis.set('monitoramento_senha', 'SolarEdge@Central2025')
        sis.set('monitoramento_datalogger_url', 'https://www.solaredge.com/setapp-help')
        app.save(sis)
      }
    } catch (_) {}
  },
  (app) => {
    // Rollback simples de dados se necessário
  },
)

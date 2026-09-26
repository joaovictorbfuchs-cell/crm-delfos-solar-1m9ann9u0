migrate(
  (app) => {
    // Buscar ordens concluídas existentes e enriquecer com detalhes ricos de demonstração
    const ordensConcluidas = app.findRecordsByFilter(
      'ordens_servico',
      "status = 'concluida'",
      '-created',
      5,
      0,
    )

    if (ordensConcluidas.length > 0) {
      const os1 = ordensConcluidas[0]
      os1.set(
        'detalhes_execucao',
        '[INÍCIO DO ATENDIMENTO: 19/09/2026 às 08:30]\n' +
          'Instalação concluída com sucesso. Sistema comissionado e gerando em plena carga (7.1 kWp). ' +
          'Montagem da estrutura de fixação em perfil de alumínio anodizado, fixação de 13 módulos solares 550W, ' +
          'passagem de cabos CC com proteção UV e ligação no inversor. Conexões MC4 crimpadas e aferição de Voc em 382V.',
      )
      app.save(os1)
    }

    if (ordensConcluidas.length > 1) {
      const os2 = ordensConcluidas[1]
      os2.set(
        'detalhes_execucao',
        '[INÍCIO DO ATENDIMENTO: 23/09/2026 às 14:00]\n' +
          'Lavagem de rotina de 13 placas Canadian Solar com água desmineralizada e escova macia específica. ' +
          'Remoção de sujidade e biofilme acumulado. Inspeção visual dos conectores MC4 e cabos sem avarias. ' +
          'Geração instantânea restabelecida a 100% da capacidade nominal com ganhos imediatos de rendimento.',
      )
      app.save(os2)
    }
  },
  (app) => {},
)

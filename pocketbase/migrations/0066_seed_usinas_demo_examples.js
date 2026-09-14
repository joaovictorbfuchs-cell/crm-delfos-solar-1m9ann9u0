migrate(
  (app) => {
    const usinasCol = app.findCollectionByNameOrId('usinas')
    const contratosCol = app.findCollectionByNameOrId('contratos_om')
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // Helper para buscar ou atualizar cliente
    let mariaCliente = null
    try {
      mariaCliente = app.findFirstRecordByData('clientes', 'nome', 'Maria Santos')
    } catch (_) {
      try {
        const res = app.findRecordsByFilter('clientes', 'nome ~ "Maria Santos"', '', 1, 0)
        if (res.length > 0) mariaCliente = res[0]
      } catch (_) {}
    }

    let marceloCliente = null
    try {
      marceloCliente = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
    } catch (_) {
      try {
        const res = app.findRecordsByFilter('clientes', 'nome ~ "Marcelo Becker"', '', 1, 0)
        if (res.length > 0) marceloCliente = res[0]
      } catch (_) {}
    }

    let robertoCliente = null
    try {
      const res = app.findRecordsByFilter('clientes', 'nome ~ "Roberto Almeida"', '', 1, 0)
      if (res.length > 0) robertoCliente = res[0]
    } catch (_) {}

    // 1. Cliente Maria Santos: 1 usina com contrato Ativo (Prevenção R$ 450,00/mês)
    if (mariaCliente) {
      // Contrato de Maria Santos
      let contratoMaria = null
      try {
        const cRes = app.findRecordsByFilter(
          'contratos_om',
          `cliente_id = "${mariaCliente.id}"`,
          '-created',
          1,
          0,
        )
        if (cRes.length > 0) {
          contratoMaria = cRes[0]
          contratoMaria.set('numero_contrato', 'OM-2025-0042')
          contratoMaria.set('plano', 'Prevenção')
          contratoMaria.set('status', 'Ativo')
          contratoMaria.set('valor_mensal', 450)
          contratoMaria.set('valor_anual', 5400)
          contratoMaria.set('data_inicio', '2025-09-10 10:00:00.000Z')
          contratoMaria.set('data_vencimento', '2026-09-10 10:00:00.000Z')
          app.save(contratoMaria)
        }
      } catch (_) {}

      // Remover usinas prévias de Maria para garantir seed limpo
      try {
        const exist = app.findRecordsByFilter(
          'usinas',
          `cliente_id = "${mariaCliente.id}"`,
          '',
          100,
          0,
        )
        for (const u of exist) app.delete(u)
      } catch (_) {}

      const usinaMaria = new Record(usinasCol)
      usinaMaria.set('cliente_id', mariaCliente.id)
      usinaMaria.set('nome', 'Usina Mercado Matriz')
      usinaMaria.set('endereco', 'Rua Itália, nº 450, Centro, Erechim/RS')
      usinaMaria.set('potencia_kwp', 12)
      usinaMaria.set('qtd_modulos', 30)
      usinaMaria.set('inversores_info', 'Fronius Symo 12.0-3-M (12 kWp)')
      usinaMaria.set('tipo_estrutura', 'telhado')
      if (contratoMaria) {
        usinaMaria.set('contrato_id', contratoMaria.id)
      }
      app.save(usinaMaria)

      mariaCliente.set('potencia_kwp', 12)
      mariaCliente.set('placas_qtd', 30)
      mariaCliente.set('inversor_marca', 'Fronius')
      mariaCliente.set('inversor_modelo', 'Fronius Symo 12.0-3-M')
      mariaCliente.set('endereco', 'Rua Itália, nº 450, Centro, Erechim/RS')
      mariaCliente.set('telhado_tipo', 'metalico')
      app.save(mariaCliente)
    }

    // 2. Cliente Marcelo Becker: 2 usinas em endereços diferentes
    // - Usina 1: "Usina Galpão Principal - Fazenda" 28,5 kWp Growatt com contrato Completo Ativo
    // - Usina 2: "Usina Extensão Galpão 2 - Granja" 15 kWp SolarEdge, estrutura solo, sem contrato
    if (marceloCliente) {
      // Contrato ativo de Marcelo
      let contratoMarcelo = null
      try {
        const cRes = app.findRecordsByFilter(
          'contratos_om',
          `cliente_id = "${marceloCliente.id}"`,
          '-created',
          1,
          0,
        )
        if (cRes.length > 0) {
          contratoMarcelo = cRes[0]
          contratoMarcelo.set('numero_contrato', 'OM-2025-0108')
          contratoMarcelo.set('plano', 'Completo')
          contratoMarcelo.set('status', 'Ativo')
          contratoMarcelo.set('valor_mensal', 680)
          contratoMarcelo.set('valor_anual', 8160)
          contratoMarcelo.set('data_inicio', '2025-06-01 10:00:00.000Z')
          contratoMarcelo.set('data_vencimento', '2026-06-01 10:00:00.000Z')
          app.save(contratoMarcelo)
        }
      } catch (_) {}

      try {
        const exist = app.findRecordsByFilter(
          'usinas',
          `cliente_id = "${marceloCliente.id}"`,
          '',
          100,
          0,
        )
        for (const u of exist) app.delete(u)
      } catch (_) {}

      // Usina 1 (com contrato Completo Ativo)
      const u1 = new Record(usinasCol)
      u1.set('cliente_id', marceloCliente.id)
      u1.set('nome', 'Usina Galpão Principal - Fazenda')
      u1.set('endereco', 'Linha São João, Km 12 - Fazenda Três Palmeiras, Passo Fundo/RS')
      u1.set('potencia_kwp', 28.5)
      u1.set('qtd_modulos', 64)
      u1.set('inversores_info', 'Growatt MAX 30KTL3-X LV (30 kWp)')
      u1.set('tipo_estrutura', 'telhado')
      if (contratoMarcelo) {
        u1.set('contrato_id', contratoMarcelo.id)
      }
      app.save(u1)

      // Usina 2 (sem contrato, estrutura solo)
      const u2 = new Record(usinasCol)
      u2.set('cliente_id', marceloCliente.id)
      u2.set('nome', 'Usina Extensão Galpão 2 - Granja')
      u2.set('endereco', 'Rodovia RS-324, Km 18 - Granja Santa Lúcia, Passo Fundo/RS')
      u2.set('potencia_kwp', 15)
      u2.set('qtd_modulos', 34)
      u2.set('inversores_info', 'SolarEdge SE15K com Otimizadores')
      u2.set('tipo_estrutura', 'solo')
      app.save(u2)

      // Manter soma da potência em clientes (28.5 + 15 = 43.5 kWp)
      marceloCliente.set('potencia_kwp', 43.5)
      marceloCliente.set('placas_qtd', 98)
      app.save(marceloCliente)
    }

    // 3. Cliente Roberto Almeida: 3 usinas
    // - Usina 1: "Usina Supermercado Matriz" 32,5 kWp com contrato Encerrado — botão Renovar
    // - Usina 2: "Usina Centro de Distribuição Sul" 45 kWp contrato Ativo
    // - Usina 3: "Usina Fazenda Solar Almeida" 20 kWp solo sem contrato
    if (robertoCliente) {
      try {
        const exist = app.findRecordsByFilter(
          'usinas',
          `cliente_id = "${robertoCliente.id}"`,
          '',
          100,
          0,
        )
        for (const u of exist) app.delete(u)
      } catch (_) {}

      // Contrato 1: Encerrado (Supermercado Matriz)
      let contratoEncerrado = null
      try {
        const cRes = app.findRecordsByFilter(
          'contratos_om',
          `cliente_id = "${robertoCliente.id}"`,
          '-created',
          1,
          0,
        )
        if (cRes.length > 0) {
          contratoEncerrado = cRes[0]
          contratoEncerrado.set('numero_contrato', 'OM-2024-0019')
          contratoEncerrado.set('plano', 'Essencial')
          contratoEncerrado.set('status', 'Encerrado')
          contratoEncerrado.set('status_encerramento', 'encerrado')
          contratoEncerrado.set('motivo_encerramento', 'Não renovação')
          contratoEncerrado.set('data_encerramento', '2026-08-29 10:00:00.000Z')
          contratoEncerrado.set('valor_mensal', 390)
          contratoEncerrado.set('valor_anual', 4680)
          contratoEncerrado.set('data_inicio', '2025-08-29 10:00:00.000Z')
          contratoEncerrado.set('data_vencimento', '2026-08-29 10:00:00.000Z')
          app.save(contratoEncerrado)
        }
      } catch (_) {}

      // Contrato 2: Ativo (Centro de Distribuição Sul)
      let contratoAtivoRoberto = null
      try {
        const rec = new Record(contratosCol)
        rec.set('cliente_id', robertoCliente.id)
        rec.set('numero_contrato', 'OM-2025-0215')
        rec.set('plano', 'Completo')
        rec.set('status', 'Ativo')
        rec.set('valor_mensal', 850)
        rec.set('valor_anual', 10200)
        rec.set('data_inicio', '2025-11-01 10:00:00.000Z')
        rec.set('data_vencimento', '2026-11-01 10:00:00.000Z')
        rec.set('observacoes', 'Contrato Completo atendendo Centro de Distribuição Sul.')
        app.save(rec)
        contratoAtivoRoberto = rec
      } catch (_) {}

      // Usina 1 (Supermercado Matriz - contrato Encerrado)
      const u1 = new Record(usinasCol)
      u1.set('cliente_id', robertoCliente.id)
      u1.set('nome', 'Usina Supermercado Matriz')
      u1.set('endereco', 'Av. Severiano de Almeida, 850, Centro, Getúlio Vargas/RS')
      u1.set('potencia_kwp', 32.5)
      u1.set('qtd_modulos', 60)
      u1.set('inversores_info', 'SolarEdge SE30K com Otimizadores P850')
      u1.set('tipo_estrutura', 'telhado')
      if (contratoEncerrado) {
        u1.set('contrato_id', contratoEncerrado.id)
      }
      app.save(u1)

      // Usina 2 (Centro de Distribuição Sul - contrato Ativo)
      const u2 = new Record(usinasCol)
      u2.set('cliente_id', robertoCliente.id)
      u2.set('nome', 'Usina Centro de Distribuição Sul')
      u2.set('endereco', 'Perimetral Norte, s/n, Distrito Industrial, Erechim/RS')
      u2.set('potencia_kwp', 45)
      u2.set('qtd_modulos', 100)
      u2.set('inversores_info', 'Huawei SUN2000-40KTL-M3')
      u2.set('tipo_estrutura', 'telhado')
      if (contratoAtivoRoberto) {
        u2.set('contrato_id', contratoAtivoRoberto.id)
      }
      app.save(u2)

      // Usina 3 (Fazenda Solar Almeida - 20 kWp solo sem contrato)
      const u3 = new Record(usinasCol)
      u3.set('cliente_id', robertoCliente.id)
      u3.set('nome', 'Usina Fazenda Solar Almeida')
      u3.set('endereco', 'Linha 4 Oeste, Gleba 2, Getúlio Vargas/RS')
      u3.set('potencia_kwp', 20)
      u3.set('qtd_modulos', 44)
      u3.set('inversores_info', 'Growatt MID 20KTL3-X')
      u3.set('tipo_estrutura', 'solo')
      app.save(u3)

      // Sincronizar soma de potência em clientes (32.5 + 45 + 20 = 97.5 kWp)
      robertoCliente.set('potencia_kwp', 97.5)
      robertoCliente.set('placas_qtd', 204)
      app.save(robertoCliente)
    }
  },
  (app) => {
    // Reversão
  },
)

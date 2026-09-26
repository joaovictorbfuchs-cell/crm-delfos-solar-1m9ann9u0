migrate(
  (app) => {
    // 1. Atualizar referências em atividades existentes que possam usar os nomes ou IDs antigos
    try {
      // Atualizar títulos e tipos em atividades
      app
        .db()
        .newQuery(
          `UPDATE atividades 
           SET titulo = 'Manutenção Corretiva de Inversor' 
           WHERE titulo = 'Troca de Inversor' OR titulo = 'Manutenção Corretiva / Inversor'`,
        )
        .execute()

      app
        .db()
        .newQuery(
          `UPDATE atividades 
           SET titulo = 'Revisão Elétrica e Reaperto' 
           WHERE titulo = 'Verificação Elétrica'`,
        )
        .execute()
    } catch (err) {
      console.log('Aviso ao atualizar atividades existentes:', err)
    }

    // 2. Unificar 4 ("Manutenção Corretiva / Inversor", id 09t9x3kh9u5ir7r) e 7 ("Troca de Inversor", id co9fbk8trz5srl6)
    // Manter o registro 09t9x3kh9u5ir7r atualizado com as informações completas e remover co9fbk8trz5srl6
    try {
      let mantidoInversor = null
      let duplicataInversor = null

      try {
        mantidoInversor = app.findFirstRecordByData(
          'tipos_atividades_custom',
          'id',
          '09t9x3kh9u5ir7r',
        )
      } catch (_) {
        try {
          const list = app.findRecordsByFilter(
            'tipos_atividades_custom',
            `nome = "Manutenção Corretiva / Inversor" || nome = "Manutenção Corretiva de Inversor"`,
            '',
            1,
            0,
          )
          if (list && list.length > 0) mantidoInversor = list[0]
        } catch (_) {}
      }

      try {
        duplicataInversor = app.findFirstRecordByData(
          'tipos_atividades_custom',
          'id',
          'co9fbk8trz5srl6',
        )
      } catch (_) {
        try {
          const list = app.findRecordsByFilter(
            'tipos_atividades_custom',
            `nome = "Troca de Inversor"`,
            '',
            1,
            0,
          )
          if (list && list.length > 0) duplicataInversor = list[0]
        } catch (_) {}
      }

      if (mantidoInversor) {
        mantidoInversor.set('nome', 'Manutenção Corretiva de Inversor')
        mantidoInversor.set('categoria', 'manutencao')
        mantidoInversor.set('cor', '#DC2626')
        mantidoInversor.set('icone', 'Settings')
        mantidoInversor.set(
          'descricao',
          'Diagnóstico de falhas, substituição de componentes/fusíveis/DPS ou troca completa de inversor central e microinversores com suporte e descarte/RMA',
        )
        mantidoInversor.set('valor_base', 850)
        mantidoInversor.set('frequencia_meses', 0)
        mantidoInversor.set('tipo_execucao', 'fornecedor_externo')
        mantidoInversor.set(
          'orientacoes_tecnicas',
          'Desligar lado CC e lado CA antes de qualquer intervenção. Aguardar descarga capacitiva de no mínimo 5 minutos indicada no frontal do inversor. Testar ausência de tensão com multímetro CAT III 1000V. Seguir procedimento de garantia e RMA do fabricante (Deye, Sungrow, Growatt, Fronius). Coletar número de série de ambos os equipamentos para atualização junto à concessionária de energia e sistema de monitoramento.',
        )
        mantidoInversor.set(
          'links_uteis',
          'https://deyeinverters.com/support/rma-procedimentos.pdf\nhttps://delfosengenharia.com.br/rma/protocolo-troca-inversores.pdf\nhttps://deyeinverters.com/rma',
        )
        mantidoInversor.set('is_padrao', true)
        mantidoInversor.set('ativo', true)
        app.save(mantidoInversor)
      }

      if (duplicataInversor && mantidoInversor && duplicataInversor.id !== mantidoInversor.id) {
        app.delete(duplicataInversor)
      }
    } catch (err) {
      console.log('Erro ao consolidar Manutenção Corretiva de Inversor:', err)
    }

    // 3. Unificar 6 ("Revisão Elétrica e Reaperto", id oicvkh8wl5gzeaw) e 8 ("Verificação Elétrica", id 65z47b5hiqe8gja)
    // Manter o registro oicvkh8wl5gzeaw atualizado com as informações completas e remover 65z47b5hiqe8gja
    try {
      let mantidoEletrica = null
      let duplicataEletrica = null

      try {
        mantidoEletrica = app.findFirstRecordByData(
          'tipos_atividades_custom',
          'id',
          'oicvkh8wl5gzeaw',
        )
      } catch (_) {
        try {
          const list = app.findRecordsByFilter(
            'tipos_atividades_custom',
            `nome = "Revisão Elétrica e Reaperto"`,
            '',
            1,
            0,
          )
          if (list && list.length > 0) mantidoEletrica = list[0]
        } catch (_) {}
      }

      try {
        duplicataEletrica = app.findFirstRecordByData(
          'tipos_atividades_custom',
          'id',
          '65z47b5hiqe8gja',
        )
      } catch (_) {
        try {
          const list = app.findRecordsByFilter(
            'tipos_atividades_custom',
            `nome = "Verificação Elétrica"`,
            '',
            1,
            0,
          )
          if (list && list.length > 0) duplicataEletrica = list[0]
        } catch (_) {}
      }

      if (mantidoEletrica) {
        mantidoEletrica.set('nome', 'Revisão Elétrica e Reaperto')
        mantidoEletrica.set('categoria', 'manutencao')
        mantidoEletrica.set('cor', '#F59E0B')
        mantidoEletrica.set('icone', 'Zap')
        mantidoEletrica.set(
          'descricao',
          'Revisão de quadros elétricos CC/CA, reaperto de bornes com torque dinamométrico, medição de curvas I-V, ensaio de isolamento/continuidade e inspeção termográfica',
        )
        mantidoEletrica.set('valor_base', 680)
        mantidoEletrica.set('frequencia_meses', 12)
        mantidoEletrica.set('tipo_execucao', 'equipe_interna')
        mantidoEletrica.set(
          'orientacoes_tecnicas',
          'Utilizar chave de fenda dinamométrica calibrada com o torque especificado pelo fabricante das chaves seccionadoras e disjuntores. Realizar termografia com câmera calibrada e emissividade configurada em 0,95. Realizar medição de resistência de isolamento (Megôhmetro) com 1000Vcc entre polos e aterramento. Registrar medições em conformidade com a NBR 16274.',
        )
        mantidoEletrica.set(
          'links_uteis',
          'https://delfosengenharia.com.br/normas/nbr-5410-torque-quadros.pdf\nhttps://delfosengenharia.com.br/normas/nbr-16274-ensaio-eletrico.pdf',
        )
        mantidoEletrica.set('is_padrao', true)
        mantidoEletrica.set('ativo', true)
        app.save(mantidoEletrica)
      }

      if (duplicataEletrica && mantidoEletrica && duplicataEletrica.id !== mantidoEletrica.id) {
        app.delete(duplicataEletrica)
      }
    } catch (err) {
      console.log('Erro ao consolidar Revisão Elétrica e Reaperto:', err)
    }

    // 4. Limpeza final defensiva caso ainda existam itens pelo nome antigo
    try {
      app
        .db()
        .newQuery(
          `DELETE FROM tipos_atividades_custom 
           WHERE categoria = 'manutencao' AND nome = 'Troca de Inversor'`,
        )
        .execute()

      app
        .db()
        .newQuery(
          `DELETE FROM tipos_atividades_custom 
           WHERE categoria = 'manutencao' AND nome = 'Verificação Elétrica'`,
        )
        .execute()
    } catch (err) {
      console.log('Aviso ao limpar duplicatas remanescentes por nome:', err)
    }
  },
  (app) => {
    // Reverter unificação caso necessário
  },
)

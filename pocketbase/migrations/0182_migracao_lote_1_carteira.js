migrate(
  (app) => {
    const colAtividades = app.findCollectionByNameOrId('atividades')

    // Garantir campo aditivo opcional registro_original_id para rastreabilidade
    if (!colAtividades.fields.getByName('registro_original_id')) {
      colAtividades.fields.add(new TextField({ name: 'registro_original_id', required: false }))
      app.save(colAtividades)
    }

    // LOTE 1: Primeiros 15 clientes em ordem alfabética de nome (excluindo pilotos)
    const CLIENTES_LOTE_1 = [
      { id: 'pem8yo7fjahiujd', nome: 'ADRIANA AMARO' },
      { id: 'n1wqa6x1pultp6h', nome: 'ADRIANO GELAIN MACHADO' },
      { id: 'mnk5er2gjae567d', nome: 'ANDRE MARTINOVSKI' },
      { id: 'qhb5rqvhztqz122', nome: 'ANDRE PAULO ARTIFON LTDA' },
      { id: 'q31sk7g6ka5wabg', nome: 'ARFES Refrigeração Industria e Comércio LTDA' },
      { id: '8y5za5eev133t1m', nome: 'ARNALDO CECHET' },
      { id: '163b7uu7a5gvrvn', nome: 'AUTO ELETRICA ERECHIM' },
      { id: 'yoo0nzj6ncg7uvq', nome: 'AUTO POSTO FENIX' },
      { id: '2nrgk1755b7pbqa', nome: 'Academia Pro Gym' },
      { id: 'kkcl52ylyomgdzd', nome: 'Academia Spartacus Gym' },
      { id: 'rvkvuvn4uz9o65a', nome: 'Ademar Emílio Berlanda' },
      { id: 'uyapr4p2xmf1cwj', nome: 'Ademar Fiorini' },
      { id: 'ubp8yld8rd4nke9', nome: 'Adenilse Pasine' },
      { id: 'y5et4jlz5tfrg4x', nome: 'Adenilse Pasini' },
      { id: 'y1iop4s50te1jim', nome: 'Adriana Machado' },
    ]

    const clientesIds = CLIENTES_LOTE_1.map((c) => c.id)

    // Dicionário de rótulos amigáveis para tipo_unificado a partir de tipos legados
    const tipoAtividadeMap = {
      contato_ligacao: 'Ligação Telefônica',
      ligacao: 'Ligação Telefônica',
      reuniao_presencial: 'Reunião Presencial',
      reuniao: 'Reunião',
      visita_tecnica: 'Visita Técnica',
      follow_up: 'Follow-up Comercial',
      instalacao: 'Instalação Solar',
      proposta: 'Proposta Comercial',
      limpeza_manutencao: 'Limpeza & Manutenção',
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
    }

    console.log(`[LOTE 1] Iniciando migração para ${clientesIds.length} clientes...`)

    let totalNativasModificadas = 0
    let totalOSCopias = 0
    let totalSACopias = 0
    let totalTMCopias = 0
    let totalAnomaliasCopias = 0
    let totalManutencoesCopias = 0

    for (let c = 0; c < clientesIds.length; c++) {
      const clienteId = clientesIds[c]
      const clienteNome = CLIENTES_LOTE_1[c].nome

      // -------------------------------------------------------------
      // FONTE 1: Atividades nativas desses clientes
      // Preencher campos aditivos apenas quando vazios
      // chave_importacao = 'lote1-atividade-<id>', origem='atividade'
      // Preservar parent_id intacto.
      // -------------------------------------------------------------
      const atividadesNativas = app.findRecordsByFilter(
        'atividades',
        `cliente_id = '${clienteId}' && (origem = '' || origem = null || origem = 'atividade')`,
        'created',
        500,
        0,
      )

      for (let i = 0; i < atividadesNativas.length; i++) {
        const atv = atividadesNativas[i]
        const chaveDesejada = `lote1-atividade-${atv.id}`
        const tipoLegado = atv.getString('tipo') || 'anotacao'
        const tipoUnificado = tipoAtividadeMap[tipoLegado] || tipoLegado.replace(/_/g, ' ')

        let modificado = false

        if (!atv.getString('chave_importacao')) {
          atv.set('chave_importacao', chaveDesejada)
          modificado = true
        }
        if (!atv.getString('origem')) {
          atv.set('origem', 'atividade')
          modificado = true
        }
        if (!atv.getString('tipo_unificado')) {
          atv.set('tipo_unificado', tipoUnificado)
          modificado = true
        }
        if (!atv.getString('subtipo')) {
          atv.set('subtipo', tipoLegado)
          modificado = true
        }
        if (!atv.getString('registro_original_id')) {
          atv.set('registro_original_id', atv.id)
          modificado = true
        }

        if (modificado) {
          app.save(atv)
          totalNativasModificadas++
        }
      }

      // -------------------------------------------------------------
      // FONTE 2: ordens_servico -> cópia em atividades
      // chave 'lote1-ordem_servico-<id>'
      // Replicar tratamento do piloto 2 (instruções/execução/endereço/relatorio_pdf, documentos_anexados referencial)
      // -------------------------------------------------------------
      const ordensServico = app.findRecordsByFilter(
        'ordens_servico',
        `cliente_id = '${clienteId}'`,
        'created',
        500,
        0,
      )

      for (let i = 0; i < ordensServico.length; i++) {
        const os = ordensServico[i]
        const chave = `lote1-ordem_servico-${os.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao = '${chave}'`,
          '',
          1,
          0,
        )

        if (jaExiste && jaExiste.length > 0) {
          continue
        }

        const tipoServico = os.getString('tipo_servico') || 'Serviço de Campo'
        const copia = new Record(colAtividades)
        copia.set('cliente_id', os.getString('cliente_id'))
        copia.set('titulo', `OS #${os.id.slice(-6).toUpperCase()} — ${tipoServico}`)
        copia.set('tipo', 'limpeza_manutencao')
        copia.set('tipo_unificado', `OS: ${tipoServico}`)
        copia.set('subtipo', tipoServico)
        copia.set('origem', 'ordem_servico')
        copia.set('chave_importacao', chave)
        copia.set('registro_original_id', os.id)
        copia.set('data', os.getString('data_agendada') || os.getString('created'))
        copia.set('status', os.getString('status') || 'pendente')
        copia.set('autor', os.getString('atribuida_a') || 'Equipe Técnica')
        copia.set('responsavel_nome', os.getString('atribuida_a') || '')
        copia.set('responsavel_id', os.getString('responsavel_usuario_id') || '')

        const partesDesc = []
        if (os.getString('instrucoes')) partesDesc.push(`Instruções: ${os.getString('instrucoes')}`)
        if (os.getString('detalhes_execucao'))
          partesDesc.push(`Execução: ${os.getString('detalhes_execucao')}`)
        if (os.getString('endereco')) partesDesc.push(`Endereço: ${os.getString('endereco')}`)
        if (os.getString('relatorio_pdf')) {
          partesDesc.push(`Relatório Técnico PDF: ${os.getString('relatorio_pdf')}`)
        }
        copia.set('descricao', partesDesc.join('\n\n'))

        // Vinculação referencial de checklist e relatório PDF sem duplicar arquivos físicos
        const checklistData = os.get('checklist')
        const docRef = []
        if (os.getString('relatorio_pdf')) {
          docRef.push({
            tipo: 'relatorio_pdf',
            arquivo: os.getString('relatorio_pdf'),
            colecao: 'ordens_servico',
            registro_id: os.id,
          })
        }
        if (Array.isArray(checklistData) && checklistData.length > 0) {
          docRef.push({
            tipo: 'checklist',
            itens_total: checklistData.length,
            concluidos: checklistData.filter((item) => item && item.concluido).length,
            itens: checklistData,
          })
        }
        if (docRef.length > 0) {
          copia.set('documentos_anexados', docRef)
        }

        app.save(copia)
        totalOSCopias++
      }

      // -------------------------------------------------------------
      // FONTE 3: servicos_avulsos -> cópia em atividades
      // chave 'lote1-servico_avulso-<id>'
      // -------------------------------------------------------------
      const servicosAvulsos = app.findRecordsByFilter(
        'servicos_avulsos',
        `cliente_id = '${clienteId}'`,
        'created',
        500,
        0,
      )

      for (let i = 0; i < servicosAvulsos.length; i++) {
        const sa = servicosAvulsos[i]
        const chave = `lote1-servico_avulso-${sa.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao = '${chave}'`,
          '',
          1,
          0,
        )

        if (jaExiste && jaExiste.length > 0) {
          continue
        }

        const tipoSa = sa.getString('tipo_servico') || 'outro'
        const copia = new Record(colAtividades)
        copia.set('cliente_id', sa.getString('cliente_id'))
        copia.set('titulo', `Serviço Avulso: ${tipoSa}`)
        copia.set('tipo', 'limpeza_manutencao')
        copia.set('tipo_unificado', `Serviço Avulso: ${tipoSa}`)
        copia.set('subtipo', tipoSa)
        copia.set('origem', 'servico_avulso')
        copia.set('chave_importacao', chave)
        copia.set('registro_original_id', sa.id)
        copia.set('data', sa.getString('data_servico') || sa.getString('created'))
        copia.set('status', sa.getString('status') || 'pendente')
        copia.set('autor', 'Equipe Técnica')
        copia.set(
          'descricao',
          sa.getString('observacoes_tecnicas') || sa.getString('observacoes_equipe') || '',
        )
        copia.set('valor_servico', sa.getFloat('valor_cobrado') || 0)

        app.save(copia)
        totalSACopias++
      }

      // -------------------------------------------------------------
      // FONTE 4: timeline_om -> cópia em atividades
      // chave 'lote1-timeline_om-<id>'
      // -------------------------------------------------------------
      const timelineOM = app.findRecordsByFilter(
        'timeline_om',
        `cliente_id = '${clienteId}'`,
        'created',
        500,
        0,
      )

      for (let i = 0; i < timelineOM.length; i++) {
        const tm = timelineOM[i]
        const chave = `lote1-timeline_om-${tm.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao = '${chave}'`,
          '',
          1,
          0,
        )

        if (jaExiste && jaExiste.length > 0) {
          continue
        }

        const tipoTm = tm.getString('tipo') || 'interacao'
        const copia = new Record(colAtividades)
        copia.set('cliente_id', tm.getString('cliente_id'))
        copia.set('titulo', tm.getString('titulo') || 'Registro Linha do Tempo O&M')
        copia.set('tipo', 'anotacao')
        copia.set('tipo_unificado', `Linha do Tempo O&M: ${tipoTm}`)
        copia.set('subtipo', tipoTm)
        copia.set('origem', 'timeline_om')
        copia.set('chave_importacao', chave)
        copia.set('registro_original_id', tm.id)
        copia.set('data', tm.getString('data') || tm.getString('created'))
        copia.set('status', 'concluida')
        copia.set('autor', tm.getString('autor') || 'Equipe Delfos')
        copia.set('descricao', tm.getString('descricao') || '')

        app.save(copia)
        totalTMCopias++
      }

      // -------------------------------------------------------------
      // FONTE 5: anomalias_om -> cópia em atividades
      // chave 'lote1-anomalia_om-<id>'
      // -------------------------------------------------------------
      const anomaliasOM = app.findRecordsByFilter(
        'anomalias_om',
        `cliente_id = '${clienteId}'`,
        'created',
        500,
        0,
      )

      for (let i = 0; i < anomaliasOM.length; i++) {
        const anom = anomaliasOM[i]
        const chave = `lote1-anomalia_om-${anom.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao = '${chave}'`,
          '',
          1,
          0,
        )

        if (jaExiste && jaExiste.length > 0) {
          continue
        }

        const severidade = anom.getString('severidade') || 'Média'
        const codigo = anom.getString('codigo')
        const tituloAnom = `${codigo ? `[${codigo}] ` : ''}${anom.getString('titulo') || 'Anomalia O&M'}`

        const copia = new Record(colAtividades)
        copia.set('cliente_id', anom.getString('cliente_id'))
        copia.set('titulo', tituloAnom)
        copia.set('tipo', 'garantia_equipamento')
        copia.set('tipo_unificado', `Anomalia O&M [${severidade}]`)
        copia.set('subtipo', severidade)
        copia.set('origem', 'anomalia_om')
        copia.set('chave_importacao', chave)
        copia.set('registro_original_id', anom.id)
        copia.set('data', anom.getString('data_abertura') || anom.getString('created'))
        copia.set('status', anom.getString('status') || 'pendente')
        copia.set('autor', anom.getString('tecnico_nome') || 'Equipe O&M')
        copia.set('responsavel_nome', anom.getString('tecnico_nome') || '')
        copia.set(
          'descricao',
          anom.getString('descricao') || anom.getString('solucao_adotada') || '',
        )
        copia.set('valor_servico', anom.getFloat('valor_faturamento') || 0)

        app.save(copia)
        totalAnomaliasCopias++
      }

      // -------------------------------------------------------------
      // FONTE 6: manutencoes -> cópia em atividades
      // chave 'lote1-manutencao-<id>'
      // -------------------------------------------------------------
      const manutencoes = app.findRecordsByFilter(
        'manutencoes',
        `cliente_id = '${clienteId}'`,
        'created',
        500,
        0,
      )

      for (let i = 0; i < manutencoes.length; i++) {
        const m = manutencoes[i]
        const chave = `lote1-manutencao-${m.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao = '${chave}'`,
          '',
          1,
          0,
        )

        if (jaExiste && jaExiste.length > 0) {
          continue
        }

        const tipoM = m.getString('tipo') || 'Geral'
        const copia = new Record(colAtividades)
        copia.set('cliente_id', m.getString('cliente_id'))
        copia.set('titulo', `Manutenção: ${tipoM}`)
        copia.set('tipo', 'limpeza_manutencao')
        copia.set('tipo_unificado', `Manutenção: ${tipoM}`)
        copia.set('subtipo', tipoM)
        copia.set('origem', 'manutencao')
        copia.set('chave_importacao', chave)
        copia.set('registro_original_id', m.id)
        copia.set('data', m.getString('data') || m.getString('created'))
        copia.set('status', m.getString('status') || 'Agendado')
        copia.set('autor', m.getString('tecnico') || 'Equipe Técnica')
        copia.set('descricao', m.getString('descricao') || '')

        app.save(copia)
        totalManutencoesCopias++
      }
    }

    console.log(
      `[LOTE 1] Migração concluída com sucesso! Resultados:` +
        ` Nativas atualizadas: ${totalNativasModificadas},` +
        ` Cópias OS: ${totalOSCopias},` +
        ` Cópias Serviços Avulsos: ${totalSACopias},` +
        ` Cópias Timeline O&M: ${totalTMCopias},` +
        ` Cópias Anomalias: ${totalAnomaliasCopias},` +
        ` Cópias Manutenções: ${totalManutencoesCopias}`,
    )
  },
  (app) => {
    // Reversão segura e idempotente do LOTE 1
    const CLIENTES_LOTE_1 = [
      'pem8yo7fjahiujd',
      'n1wqa6x1pultp6h',
      'mnk5er2gjae567d',
      'qhb5rqvhztqz122',
      'q31sk7g6ka5wabg',
      '8y5za5eev133t1m',
      '163b7uu7a5gvrvn',
      'yoo0nzj6ncg7uvq',
      '2nrgk1755b7pbqa',
      'kkcl52ylyomgdzd',
      'rvkvuvn4uz9o65a',
      'uyapr4p2xmf1cwj',
      'ubp8yld8rd4nke9',
      'y5et4jlz5tfrg4x',
      'y1iop4s50te1jim',
    ]

    for (let c = 0; c < CLIENTES_LOTE_1.length; c++) {
      const clienteId = CLIENTES_LOTE_1[c]

      // 1. Excluir cópias criadas pelo Lote 1 (origem != 'atividade' e chave ~ 'lote1-')
      const copias = app.findRecordsByFilter(
        'atividades',
        `cliente_id = '${clienteId}' && chave_importacao ~ 'lote1-' && origem != 'atividade'`,
        '',
        500,
        0,
      )

      for (let i = 0; i < copias.length; i++) {
        app.delete(copias[i])
      }

      // 2. Limpar campos preenchidos nos registros nativos da coleção atividades
      const nativos = app.findRecordsByFilter(
        'atividades',
        `cliente_id = '${clienteId}' && chave_importacao ~ 'lote1-atividade-'`,
        '',
        500,
        0,
      )

      for (let i = 0; i < nativos.length; i++) {
        const atv = nativos[i]
        atv.set('chave_importacao', '')
        atv.set('origem', '')
        atv.set('tipo_unificado', '')
        atv.set('subtipo', '')
        atv.set('registro_original_id', '')
        app.save(atv)
      }
    }
  },
)

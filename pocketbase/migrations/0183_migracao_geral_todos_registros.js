migrate(
  (app) => {
    const colAtividades = app.findCollectionByNameOrId('atividades')

    // Garantir campo aditivo opcional registro_original_id para rastreabilidade
    if (!colAtividades.fields.getByName('registro_original_id')) {
      colAtividades.fields.add(new TextField({ name: 'registro_original_id', required: false }))
      app.save(colAtividades)
    }

    // Dicionário canônico de rótulos amigáveis para tipo_unificado a partir de tipos legados
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
      anexo_g: 'Anexo G',
      troca_titularidade: 'Troca de Titularidade',
      transferencia_creditos: 'Transferência de Créditos',
      contato_reativacao: 'Contato de Reativação',
      ligar_indicacao: 'Ligar para Indicação',
    }

    console.log(
      '[MIGRAÇÃO GERAL] Iniciando migração unificada para todos os registros restantes...',
    )

    let totalNativasModificadas = 0
    let totalOSCopias = 0
    let totalSACopias = 0
    let totalTMCopias = 0
    let totalAnomaliasCopias = 0
    let totalManutencoesCopias = 0

    // -----------------------------------------------------------------
    // FONTE 1: Atividades nativas pendentes de unificação
    // Apenas registros onde origem está vazia ou nula
    // Preenche tipo_unificado, subtipo, origem = 'atividade', chave_importacao, registro_original_id
    // Preserva parent_id e todo relacionamento hierárquico
    // -----------------------------------------------------------------
    let pageAtv = 0
    const pageSize = 500

    while (true) {
      const atividadesPendentes = app.findRecordsByFilter(
        'atividades',
        "origem = '' || origem = null",
        'created',
        pageSize,
        pageAtv * pageSize,
      )

      if (!atividadesPendentes || atividadesPendentes.length === 0) {
        break
      }

      for (let i = 0; i < atividadesPendentes.length; i++) {
        const atv = atividadesPendentes[i]
        const chaveDesejada = `geral-atividade-${atv.id}`
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

      pageAtv++
      if (atividadesPendentes.length < pageSize) {
        break
      }
    }

    // -----------------------------------------------------------------
    // FONTE 2: Ordens de Serviço (ordens_servico)
    // Para cada OS existente, verifica se já foi migrada anteriormente
    // (chaves com sufixo `ordem_servico-${os.id}`)
    // Cria cópia em atividades com origem = 'ordem_servico' e chave 'geral-ordem_servico-<id>'
    // -----------------------------------------------------------------
    let pageOS = 0
    while (true) {
      const ordens = app.findRecordsByFilter(
        'ordens_servico',
        '',
        'created',
        pageSize,
        pageOS * pageSize,
      )
      if (!ordens || ordens.length === 0) break

      for (let i = 0; i < ordens.length; i++) {
        const os = ordens[i]
        const chave = `geral-ordem_servico-${os.id}`
        const sufixo = `ordem_servico-${os.id}`

        // Idempotência abrangente: checa se já existe qualquer atividade com chave_importacao terminando em ordem_servico-<id> ou registro_original_id = os.id
        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao ~ '${sufixo}' || (origem = 'ordem_servico' && registro_original_id = '${os.id}')`,
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

      pageOS++
      if (ordens.length < pageSize) break
    }

    // -----------------------------------------------------------------
    // FONTE 3: Serviços Avulsos (servicos_avulsos)
    // -----------------------------------------------------------------
    let pageSA = 0
    while (true) {
      const servicos = app.findRecordsByFilter(
        'servicos_avulsos',
        '',
        'created',
        pageSize,
        pageSA * pageSize,
      )
      if (!servicos || servicos.length === 0) break

      for (let i = 0; i < servicos.length; i++) {
        const sa = servicos[i]
        const chave = `geral-servico_avulso-${sa.id}`
        const sufixo = `servico_avulso-${sa.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao ~ '${sufixo}' || (origem = 'servico_avulso' && registro_original_id = '${sa.id}')`,
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

      pageSA++
      if (servicos.length < pageSize) break
    }

    // -----------------------------------------------------------------
    // FONTE 4: Linha do Tempo O&M (timeline_om)
    // -----------------------------------------------------------------
    let pageTM = 0
    while (true) {
      const timeline = app.findRecordsByFilter(
        'timeline_om',
        '',
        'created',
        pageSize,
        pageTM * pageSize,
      )
      if (!timeline || timeline.length === 0) break

      for (let i = 0; i < timeline.length; i++) {
        const tm = timeline[i]
        const chave = `geral-timeline_om-${tm.id}`
        const sufixo = `timeline_om-${tm.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao ~ '${sufixo}' || (origem = 'timeline_om' && registro_original_id = '${tm.id}')`,
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

      pageTM++
      if (timeline.length < pageSize) break
    }

    // -----------------------------------------------------------------
    // FONTE 5: Anomalias O&M (anomalias_om)
    // -----------------------------------------------------------------
    let pageAnom = 0
    while (true) {
      const anomalias = app.findRecordsByFilter(
        'anomalias_om',
        '',
        'created',
        pageSize,
        pageAnom * pageSize,
      )
      if (!anomalias || anomalias.length === 0) break

      for (let i = 0; i < anomalias.length; i++) {
        const anom = anomalias[i]
        const chave = `geral-anomalia_om-${anom.id}`
        const sufixo = `anomalia_om-${anom.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao ~ '${sufixo}' || (origem = 'anomalia_om' && registro_original_id = '${anom.id}')`,
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

      pageAnom++
      if (anomalias.length < pageSize) break
    }

    // -----------------------------------------------------------------
    // FONTE 6: Manutenções (manutencoes)
    // -----------------------------------------------------------------
    let pageManut = 0
    while (true) {
      const manutencoes = app.findRecordsByFilter(
        'manutencoes',
        '',
        'created',
        pageSize,
        pageManut * pageSize,
      )
      if (!manutencoes || manutencoes.length === 0) break

      for (let i = 0; i < manutencoes.length; i++) {
        const m = manutencoes[i]
        const chave = `geral-manutencao-${m.id}`
        const sufixo = `manutencao-${m.id}`

        const jaExiste = app.findRecordsByFilter(
          'atividades',
          `chave_importacao ~ '${sufixo}' || (origem = 'manutencao' && registro_original_id = '${m.id}')`,
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

      pageManut++
      if (manutencoes.length < pageSize) break
    }

    console.log(
      `[MIGRAÇÃO GERAL] Concluída com sucesso! Resultados:` +
        ` Nativas atualizadas: ${totalNativasModificadas},` +
        ` Cópias OS: ${totalOSCopias},` +
        ` Cópias Serviços Avulsos: ${totalSACopias},` +
        ` Cópias Timeline O&M: ${totalTMCopias},` +
        ` Cópias Anomalias: ${totalAnomaliasCopias},` +
        ` Cópias Manutenções: ${totalManutencoesCopias}`,
    )
  },
  (app) => {
    // Reversão segura e idempotente da Migração Geral
    // 1. Excluir cópias criadas pela migração geral (chave_importacao com prefixo geral- e origem != 'atividade')
    let pageDel = 0
    const pageSize = 500
    while (true) {
      const copias = app.findRecordsByFilter(
        'atividades',
        "chave_importacao ~ 'geral-' && origem != 'atividade'",
        '',
        pageSize,
        0,
      )
      if (!copias || copias.length === 0) break

      for (let i = 0; i < copias.length; i++) {
        app.delete(copias[i])
      }
      if (copias.length < pageSize) break
    }

    // 2. Limpar campos preenchidos nos registros nativos da coleção atividades com prefixo geral-
    while (true) {
      const nativos = app.findRecordsByFilter(
        'atividades',
        "chave_importacao ~ 'geral-atividade-'",
        '',
        pageSize,
        0,
      )
      if (!nativos || nativos.length === 0) break

      for (let i = 0; i < nativos.length; i++) {
        const atv = nativos[i]
        atv.set('chave_importacao', '')
        atv.set('origem', '')
        atv.set('tipo_unificado', '')
        atv.set('subtipo', '')
        atv.set('registro_original_id', '')
        app.save(atv)
      }
      if (nativos.length < pageSize) break
    }
  },
)

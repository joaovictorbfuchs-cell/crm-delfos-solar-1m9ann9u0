migrate(
  (app) => {
    const colAtividades = app.findCollectionByNameOrId('atividades')

    // 1. Garantir campo aditivo opcional registro_original_id para rastreabilidade
    if (!colAtividades.fields.getByName('registro_original_id')) {
      colAtividades.fields.add(new TextField({ name: 'registro_original_id', required: false }))
      app.save(colAtividades)
    }

    // Cliente Piloto 2: João Victor Bagetti Fuchs
    // Possui registros reais em ordens_servico (3 OSs: Instalação, Limpeza e Garantia), usinas e atividades do CRM
    const PILOTO_CLIENTE_ID = '4bb6q12dbgk5sa4'

    // Dicionário de rótulos amigáveis para tipo_unificado a partir de tipos de atividade legados
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

    // -------------------------------------------------------------
    // FONTE 1: atividades do cliente piloto 2
    // Apenas preencher campos aditivos nos registros já existentes na coleção:
    // tipo_unificado, subtipo, origem = 'atividade', chave_importacao = 'piloto2-atividade-<id>'
    // Relação pai/filho via parent_id é PRESERVADA intacta.
    // -------------------------------------------------------------
    const atividadesPiloto = app.findRecordsByFilter(
      'atividades',
      `cliente_id = '${PILOTO_CLIENTE_ID}' && (origem = '' || origem = null || origem = 'atividade')`,
      'created',
      500,
      0,
    )

    console.log(
      `[PILOTO 2] Atividades encontradas para o cliente piloto 2: ${atividadesPiloto.length}`,
    )

    for (let i = 0; i < atividadesPiloto.length; i++) {
      const atv = atividadesPiloto[i]
      const chaveDesejada = `piloto2-atividade-${atv.id}`
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
      }
    }

    // -------------------------------------------------------------
    // FONTE 2: ordens_servico do cliente piloto 2
    // Criar cópia na coleção atividades preenchendo os campos unificados
    // Mantém referências a checklists e relatorio_pdf nos metadados/documentos
    // Idempotência: chave_importacao = 'piloto2-ordem_servico-<id>'
    // -------------------------------------------------------------
    const ordensPiloto = app.findRecordsByFilter(
      'ordens_servico',
      `cliente_id = '${PILOTO_CLIENTE_ID}'`,
      'created',
      500,
      0,
    )

    console.log(`[PILOTO 2] Ordens de serviço encontradas: ${ordensPiloto.length}`)

    for (let i = 0; i < ordensPiloto.length; i++) {
      const os = ordensPiloto[i]
      const chave = `piloto2-ordem_servico-${os.id}`

      const jaExiste = app.findRecordsByFilter(
        'atividades',
        `chave_importacao = '${chave}'`,
        '',
        1,
        0,
      )

      if (jaExiste && jaExiste.length > 0) {
        console.log(`[PILOTO 2] OS ${os.id} já migrada anteriormente (chave: ${chave})`)
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

      // Detalhes, endereço e referências a anexos/relatório PDF
      const partesDesc = []
      if (os.getString('instrucoes')) partesDesc.push(`Instruções: ${os.getString('instrucoes')}`)
      if (os.getString('detalhes_execucao'))
        partesDesc.push(`Execução: ${os.getString('detalhes_execucao')}`)
      if (os.getString('endereco')) partesDesc.push(`Endereço: ${os.getString('endereco')}`)
      if (os.getString('relatorio_pdf')) {
        partesDesc.push(`Relatório Técnico PDF: ${os.getString('relatorio_pdf')}`)
      }

      copia.set('descricao', partesDesc.join('\n\n'))

      // Vinculação referencial de checklist e anexo (sem duplicar arquivos físicos)
      const checklistData = os.get('checklist')
      if (checklistData) {
        // Armazenado referencialmente no JSON leituras_programadas_distribuidora ou documentos_anexados
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
            concluidos: checklistData.filter((c) => c && c.concluido).length,
            itens: checklistData,
          })
        }
        if (docRef.length > 0) {
          copia.set('documentos_anexados', docRef)
        }
      }

      app.save(copia)
    }

    // -------------------------------------------------------------
    // FONTE 3: servicos_avulsos do cliente piloto 2 (idempotente)
    // -------------------------------------------------------------
    const servicosPiloto = app.findRecordsByFilter(
      'servicos_avulsos',
      `cliente_id = '${PILOTO_CLIENTE_ID}'`,
      'created',
      500,
      0,
    )

    console.log(`[PILOTO 2] Serviços avulsos encontrados: ${servicosPiloto.length}`)

    for (let i = 0; i < servicosPiloto.length; i++) {
      const sa = servicosPiloto[i]
      const chave = `piloto2-servico_avulso-${sa.id}`

      const jaExiste = app.findRecordsByFilter(
        'atividades',
        `chave_importacao = '${chave}'`,
        '',
        1,
        0,
      )

      if (jaExiste && jaExiste.length > 0) {
        console.log(`[PILOTO 2] Serviço avulso ${sa.id} já migrado (chave: ${chave})`)
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
    }

    // -------------------------------------------------------------
    // FONTE 4: timeline_om do cliente piloto 2 (idempotente)
    // -------------------------------------------------------------
    const timelinePiloto = app.findRecordsByFilter(
      'timeline_om',
      `cliente_id = '${PILOTO_CLIENTE_ID}'`,
      'created',
      500,
      0,
    )

    console.log(`[PILOTO 2] Linha do tempo O&M encontrada: ${timelinePiloto.length}`)

    for (let i = 0; i < timelinePiloto.length; i++) {
      const tm = timelinePiloto[i]
      const chave = `piloto2-timeline_om-${tm.id}`

      const jaExiste = app.findRecordsByFilter(
        'atividades',
        `chave_importacao = '${chave}'`,
        '',
        1,
        0,
      )

      if (jaExiste && jaExiste.length > 0) {
        console.log(`[PILOTO 2] Timeline ${tm.id} já migrada (chave: ${chave})`)
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
    }

    // -------------------------------------------------------------
    // FONTE 5: anomalias_om do cliente piloto 2 (idempotente)
    // -------------------------------------------------------------
    const anomaliasPiloto = app.findRecordsByFilter(
      'anomalias_om',
      `cliente_id = '${PILOTO_CLIENTE_ID}'`,
      'created',
      500,
      0,
    )

    console.log(`[PILOTO 2] Anomalias O&M encontradas: ${anomaliasPiloto.length}`)

    for (let i = 0; i < anomaliasPiloto.length; i++) {
      const anom = anomaliasPiloto[i]
      const chave = `piloto2-anomalia_om-${anom.id}`

      const jaExiste = app.findRecordsByFilter(
        'atividades',
        `chave_importacao = '${chave}'`,
        '',
        1,
        0,
      )

      if (jaExiste && jaExiste.length > 0) {
        console.log(`[PILOTO 2] Anomalia ${anom.id} já migrada (chave: ${chave})`)
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
      copia.set('descricao', anom.getString('descricao') || anom.getString('solucao_adotada') || '')
      copia.set('valor_servico', anom.getFloat('valor_faturamento') || 0)

      app.save(copia)
    }

    // -------------------------------------------------------------
    // FONTE 6: manutencoes do cliente piloto 2 (idempotente)
    // -------------------------------------------------------------
    const manutencoesPiloto = app.findRecordsByFilter(
      'manutencoes',
      `cliente_id = '${PILOTO_CLIENTE_ID}'`,
      'created',
      500,
      0,
    )

    console.log(`[PILOTO 2] Manutenções encontradas: ${manutencoesPiloto.length}`)

    for (let i = 0; i < manutencoesPiloto.length; i++) {
      const m = manutencoesPiloto[i]
      const chave = `piloto2-manutencao-${m.id}`

      const jaExiste = app.findRecordsByFilter(
        'atividades',
        `chave_importacao = '${chave}'`,
        '',
        1,
        0,
      )

      if (jaExiste && jaExiste.length > 0) {
        console.log(`[PILOTO 2] Manutenção ${m.id} já migrada (chave: ${chave})`)
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
    }

    console.log('[PILOTO 2] Migração do cliente João Victor Bagetti Fuchs concluída com sucesso!')
  },
  (app) => {
    // Reversão limpa e segura do piloto 2
    const PILOTO_CLIENTE_ID = '4bb6q12dbgk5sa4'

    // 1. Excluir cópias criadas na migração piloto 2 (preserva originais intactos)
    const copias = app.findRecordsByFilter(
      'atividades',
      `cliente_id = '${PILOTO_CLIENTE_ID}' && chave_importacao ~ 'piloto2-' && origem != 'atividade'`,
      '',
      500,
      0,
    )

    for (let i = 0; i < copias.length; i++) {
      app.delete(copias[i])
    }

    // 2. Limpar campos preenchidos nos registros nativos da coleção atividades do cliente piloto 2
    const nativos = app.findRecordsByFilter(
      'atividades',
      `cliente_id = '${PILOTO_CLIENTE_ID}' && chave_importacao ~ 'piloto2-atividade-'`,
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
  },
)

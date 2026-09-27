/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')

    // 1. Expandir valores aceitos no select 'tipo'
    const tipoField = col.fields.getByName('tipo')
    if (tipoField) {
      const allowed = new Set(tipoField.values || [])
      allowed.add('solicitar_contas_rge')
      tipoField.values = Array.from(allowed)
    }

    // 2. Adicionar novos campos para suporte completo à solicitação de contas RGE
    if (!col.fields.getByName('numero_uc')) {
      col.fields.add(new TextField({ name: 'numero_uc' }))
    }
    if (!col.fields.getByName('endereco_uc')) {
      col.fields.add(new TextField({ name: 'endereco_uc' }))
    }
    if (!col.fields.getByName('documento_titular')) {
      col.fields.add(new TextField({ name: 'documento_titular' }))
    }
    if (!col.fields.getByName('responsavel_email')) {
      col.fields.add(new TextField({ name: 'responsavel_email' }))
    }
    if (!col.fields.getByName('responsavel_cargo')) {
      col.fields.add(new TextField({ name: 'responsavel_cargo' }))
    }
    if (!col.fields.getByName('email_destinatario')) {
      col.fields.add(new TextField({ name: 'email_destinatario' }))
    }
    if (!col.fields.getByName('email_enviado_em')) {
      col.fields.add(new DateField({ name: 'email_enviado_em' }))
    }
    if (!col.fields.getByName('email_envio_status')) {
      col.fields.add(new TextField({ name: 'email_envio_status' }))
    }
    if (!col.fields.getByName('email_resend_id')) {
      col.fields.add(new TextField({ name: 'email_resend_id' }))
    }
    if (!col.fields.getByName('protocolo_atendimento')) {
      col.fields.add(new TextField({ name: 'protocolo_atendimento' }))
    }
    if (!col.fields.getByName('retorno_rge')) {
      col.fields.add(new TextField({ name: 'retorno_rge' }))
    }
    if (!col.fields.getByName('prazo_conclusao_rge')) {
      col.fields.add(new DateField({ name: 'prazo_conclusao_rge' }))
    }
    if (!col.fields.getByName('documentos_anexados')) {
      col.fields.add(new JSONField({ name: 'documentos_anexados' }))
    }

    app.save(col)

    // 3. Cadastrar ou assegurar tipo em tipos_atividades_custom para exibição transparente no catálogo
    try {
      const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')
      if (tiposCol) {
        let existe = false
        try {
          const achados = app.findRecordsByFilter(
            'tipos_atividades_custom',
            "nome ~ 'Solicitar contas RGE'",
            '-created',
            1,
          )
          if (achados && achados.length > 0) existe = true
        } catch (_) {}

        if (!existe) {
          const novoTipoCustom = new Record(tiposCol, {
            nome: 'Solicitar contas RGE',
            categoria: 'administrativo_pos_venda',
            cor: '#0284C7',
            icone: 'FileText',
            descricao:
              'Solicitação oficial de histórico de faturas dos últimos 5 anos à concessionária RGE',
            is_padrao: true,
            ativo: true,
            orientacoes_tecnicas:
              'Enviar Procuração assinada e documento oficial com foto do titular da UC para o canal de atendimento da concessionária.',
            documento_modelo: 'Procuração Particular O&M Delfos',
          })
          app.save(novoTipoCustom)
        }
      }
    } catch (eTipo) {
      console.log('[MIGRATION 0160 aviso tipos_atividades_custom]', eTipo)
    }

    // 4. Inserir dados de demonstração: 1 atividade com prazo próximo (laranja) e 1 com prazo vencido (vermelho)
    try {
      const clienteJoao = '4bb6q12dbgk5sa4' // João Victor Bagetti Fuchs
      const clienteAdemar = 'rvkvuvn4uz9o65a' // Ademar Emílio Berlanda

      const agora = new Date()

      // Demo 1: Prazo próximo (daqui a ~1 dia -> indicador laranja)
      const dataPrazoProximo = new Date(agora.getTime() + 1.5 * 24 * 60 * 60 * 1000)
      const dataEnvioDemo1 = new Date(agora.getTime() - 3 * 24 * 60 * 60 * 1000)

      const recDemo1 = new Record(col, {
        cliente_id: clienteJoao,
        tipo: 'solicitar_contas_rge',
        titulo: 'Solicitar contas RGE — UC 1009845231',
        descricao:
          'Solicitação das faturas dos últimos 5 anos enviada por e-mail para a RGE. Aguardando retorno da concessionária.',
        status: 'pendente',
        autor: 'Daniel Rotava',
        responsavel_nome: 'Daniel Rotava',
        responsavel_email: 'daniel@delfosengenharia.com.br',
        responsavel_cargo: 'Engenheiro Responsável',
        numero_uc: '1009845231',
        endereco_uc: 'Rua Pedro Alvares Cabral, Centro, Erechim/RS',
        documento_titular: '811.562.780-15',
        email_destinatario: 'atendimento-rs@cpfl.com.br',
        email_enviado_em: dataEnvioDemo1.toISOString(),
        email_envio_status: 'enviado',
        email_resend_id: 'resend_demo_uc1009845231',
        protocolo_atendimento: 'RGE-2026-981244',
        retorno_rge:
          'Protocolo gerado pelo atendimento. Concessionária informou que a emissão das segundas vias está em processamento pelo setor de faturamento.',
        prazo_conclusao_rge: dataPrazoProximo.toISOString(),
        documentos_anexados: [
          { nome: 'procuracao_assinada_joao.pdf', tamanho: 145020 },
          { nome: 'cnh_titular.pdf', tamanho: 284100 },
        ],
        data: agora.toISOString(),
      })
      app.save(recDemo1)

      // Demo 2: Prazo vencido (venceu há 2 dias -> indicador vermelho)
      const dataPrazoVencido = new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000)
      const dataEnvioDemo2 = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000)

      const recDemo2 = new Record(col, {
        cliente_id: clienteAdemar,
        tipo: 'solicitar_contas_rge',
        titulo: 'Solicitar contas RGE — UC 2048591024',
        descricao:
          'Pedido de contas dos últimos 5 anos com prazo excedido pela RGE. Necessário cobrar posicionamento via Ouvidoria.',
        status: 'pendente',
        autor: 'João Victor Bagetti Fuchs',
        responsavel_nome: 'João Victor Bagetti Fuchs',
        responsavel_email: 'joao@delfosengenharia.com.br',
        responsavel_cargo: 'Diretor Técnico',
        numero_uc: '2048591024',
        endereco_uc: 'Rua Camilo Ghettino, Centro, Erechim/RS',
        documento_titular: '371.942.080-91',
        email_destinatario: 'atendimento-rs@cpfl.com.br',
        email_enviado_em: dataEnvioDemo2.toISOString(),
        email_envio_status: 'enviado',
        email_resend_id: 'resend_demo_uc2048591024',
        protocolo_atendimento: 'RGE-2026-773190',
        retorno_rge:
          'Solicitação encaminhada ao setor de cadastro técnico. Prazo inicial informado expirou sem envio do arquivo consolidado.',
        prazo_conclusao_rge: dataPrazoVencido.toISOString(),
        documentos_anexados: [
          { nome: 'autorizacao_faturas_ademar.pdf', tamanho: 182300 },
          { nome: 'contrato_comodato.pdf', tamanho: 340500 },
        ],
        data: agora.toISOString(),
      })
      app.save(recDemo2)
    } catch (eDemo) {
      console.log('[MIGRATION 0160 aviso seed dados demo]', eDemo)
    }
  },
  (app) => {
    // Reverter
  },
)

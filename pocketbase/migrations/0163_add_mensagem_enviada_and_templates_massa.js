/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Expandir valores aceitos no select 'tipo' da coleção atividades para incluir 'mensagem_enviada'
    const col = app.findCollectionByNameOrId('atividades')
    const tipoField = col.fields.getByName('tipo')
    if (tipoField) {
      const allowed = new Set(tipoField.values || [])
      allowed.add('mensagem_enviada')
      tipoField.values = Array.from(allowed)
      app.save(col)
    }

    // 2. Cadastrar tipo no catálogo de tipos de atividades (tipos_atividades_custom) se não existir
    try {
      const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')
      if (tiposCol) {
        let existe = false
        try {
          const achados = app.findRecordsByFilter(
            'tipos_atividades_custom',
            "nome ~ 'Mensagem Enviada'",
            '-created',
            1,
          )
          if (achados && achados.length > 0) existe = true
        } catch (_) {}

        if (!existe) {
          const novoTipoCustom = new Record(tiposCol, {
            nome: 'Mensagem Enviada',
            categoria: 'comercial',
            cor: '#0284C7',
            icone: 'MessageSquare',
            descricao: 'Disparo de mensagem de WhatsApp (individual ou em massa)',
            is_padrao: true,
            ativo: true,
            orientacoes_tecnicas:
              'Registro automático gerado após disparo de WhatsApp pela Z-API com status, data/hora e conteúdo.',
          })
          app.save(novoTipoCustom)
        }
      }
    } catch (eTipo) {
      console.log('[MIGRATION 0163 aviso tipos_atividades_custom]', eTipo)
    }

    // 3. Cadastrar templates pré-definidos solicitados na coleção whatsapp_templates
    // "Lembrete de manutenção", "Oferta especial", "Fatura em atraso"
    try {
      const tplsCol = app.findCollectionByNameOrId('whatsapp_templates')
      if (tplsCol) {
        const templatesIniciais = [
          {
            slug: 'lembrete_manutencao_massa',
            titulo: 'Lembrete de manutenção',
            categoria: 'Operação e Manutenção (O&M)',
            conteudo:
              'Olá, [nome do cliente]! Tudo bem? Aqui é da equipe Delfos Solar. Passando para lembrar sobre a importância da manutenção preventiva e limpeza periódica dos módulos da sua usina em [cidade]. Com módulos limpos, sua geração pode render até 25% a mais. Deseja agendar a próxima revisão com nossa equipe?',
            tipo_gatilho: 'massa',
            variaveis_disponiveis: [
              'nome do cliente',
              'nome da empresa',
              'cidade',
              'data atual',
              'potência',
            ],
            ativo: true,
          },
          {
            slug: 'oferta_especial_massa',
            titulo: 'Oferta especial',
            categoria: 'Comercial',
            conteudo:
              'Olá, [nome do cliente]! Temos uma condição especial exclusiva este mês na Delfos Solar para ampliação do seu sistema solar, inclusão de baterias ou plano de monitoramento em [cidade]. Gostaria de receber uma simulação sem compromisso hoje, [data atual]?',
            tipo_gatilho: 'massa',
            variaveis_disponiveis: [
              'nome do cliente',
              'nome da empresa',
              'cidade',
              'data atual',
              'potência',
            ],
            ativo: true,
          },
          {
            slug: 'fatura_em_atraso_massa',
            titulo: 'Fatura em atraso',
            categoria: 'Financeiro',
            conteudo:
              'Olá, [nome do cliente]! Constatamos uma pendência financeira referente à sua fatura de serviços da Delfos Solar em [cidade], com vencimento recente. Para que possamos regularizar e emitir a 2ª via sem encargos adicionais, por gentileza responda a esta mensagem para enviarmos o código de barras ou Pix.',
            tipo_gatilho: 'massa',
            variaveis_disponiveis: ['nome do cliente', 'nome da empresa', 'cidade', 'data atual'],
            ativo: true,
          },
        ]

        for (const tpl of templatesIniciais) {
          let rec = null
          try {
            const achados = app.findRecordsByFilter(
              'whatsapp_templates',
              `slug = '${tpl.slug}'`,
              '',
              1,
              0,
            )
            if (achados && achados.length > 0) rec = achados[0]
          } catch (_) {}

          if (!rec) {
            const novo = new Record(tplsCol, tpl)
            app.save(novo)
          }
        }
      }
    } catch (eTpls) {
      console.log('[MIGRATION 0163 aviso whatsapp_templates]', eTpls)
    }
  },
  (app) => {
    // Reverter (opcional)
  },
)

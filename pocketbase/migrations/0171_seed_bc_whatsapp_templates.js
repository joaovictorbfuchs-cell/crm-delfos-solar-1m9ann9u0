/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('whatsapp_templates')

    // 1. Backfill dos 3 que ficaram com categoria / etapa desatualizada
    const updates = [
      {
        slug: 'oferta_especial_massa',
        categoria: 'Comercial',
        etapa: 'Orçamento enviado',
      },
      {
        slug: 'lembrete_manutencao_massa',
        categoria: 'O&M & Pós-Venda',
        etapa: 'Renovação O&M',
      },
      {
        slug: 'fatura_em_atraso_massa',
        categoria: 'Financeiro/Cobrança',
        etapa: 'Cobrança',
      },
    ]

    for (const item of updates) {
      try {
        const res = app.findRecordsByFilter('whatsapp_templates', `slug = '${item.slug}'`, '', 1, 0)
        if (res && res.length > 0) {
          res[0].set('categoria', item.categoria)
          res[0].set('etapa', item.etapa)
          app.save(res[0])
        }
      } catch (err) {
        console.log('[MIGRATION 0171] Erro atualizando ' + item.slug, err)
      }
    }

    // 2. Criar os templates da Base de Conhecimento
    const templatesNovosBC = [
      {
        titulo: 'Follow-up Fase 1 — Checagem de recebimento',
        slug: 'bc_followup_fase_1_checagem',
        categoria: 'Comercial',
        etapa: 'Follow-up Fase 1',
        conteudo:
          'Olá, {{nome}}! Tudo bem?\nPassando rapidinho para confirmar se você conseguiu abrir e dar uma olhada na proposta de energia solar que enviamos.\nSe tiver ficado alguma dúvida sobre os números ou sobre o dimensionamento do sistema, fico à disposição!',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Follow-up Fase 1 — Destaque de benefício e economia',
        slug: 'bc_followup_fase_1_destaque_economia',
        categoria: 'Comercial',
        etapa: 'Follow-up Fase 1',
        conteudo:
          'Olá, {{nome}}! Pensando no seu projeto, fiz questão de destacar um ponto: com essa proposta, sua economia estimada anual chega a um valor muito expressivo. O payback fica excelente!\nQuer marcar 10 minutinhos para passarmos juntos pelos detalhes técnicos e prazos?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Follow-up Fase 2 — Comparativo de opções e ajustes',
        slug: 'bc_followup_fase_2_ajustes',
        categoria: 'Comercial',
        etapa: 'Follow-up Fase 2',
        conteudo:
          'Oi, {{nome}}, tudo bem?\nSei que a rotina é corrida. Queria saber se você gostaria de avaliar uma opção com outro arranjo de potência ou até parcelamento em mais vezes.\nConseguimos adequar o fluxo para ficar bem confortável no seu orçamento.',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Follow-up Fase 2 — Prova social e instalação similar',
        slug: 'bc_followup_fase_2_prova_social',
        categoria: 'Comercial',
        etapa: 'Follow-up Fase 2',
        conteudo:
          'Olá, {{nome}}! Tudo certo?\nFinalizamos recentemente uma instalação muito parecida com a que projetamos para você, gerando resultados acima da média logo no primeiro mês.\nSe quiser, te mando umas fotos da obra pronta e o relatório de geração real para você conferir a qualidade do padrão Delfos Solar.',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Follow-up Fase 3 — Última chamada / Reserva de lote',
        slug: 'bc_followup_fase_3_ultima_chamada',
        categoria: 'Comercial',
        etapa: 'Follow-up Fase 3',
        conteudo:
          'Olá, {{nome}}! Estamos fechando o lote de pedidos desta quinzena com a distribuidora para segurar as condições e preços dos módulos e inversores.\nConsigo segurar a sua condição se definirmos até esta semana. O que acha de alinharmos os próximos passos?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Follow-up Fase 3 — Break-up (Fechamento amigável)',
        slug: 'bc_followup_breakup_amigavel',
        categoria: 'Comercial',
        etapa: 'Break-up',
        conteudo:
          'Olá, {{nome}}! Imagino que agora não seja o momento ideal para avançar com o projeto solar, então não quero te incomodar.\nVou arquivar sua proposta por enquanto, mas se no futuro quiser retomar, seu estudo fica guardado aqui com a gente na Delfos Solar. Sucesso nos seus projetos!',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Atendimento — 1º Contato / Recepção de Lead',
        slug: 'bc_atendimento_1o_contato_recepcao',
        categoria: 'Atendimento',
        etapa: '1º contato',
        conteudo:
          'Olá, {{nome}}! Tudo bem? Sou da Delfos Solar. Vi que você tem interesse em energia solar fotovoltaica para reduzir sua conta de luz.\nPara montarmos um estudo sob medida sem nenhum custo, você poderia nos enviar uma foto ou o PDF da sua conta de energia mais recente?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Atendimento — Qualificação e dados da fatura',
        slug: 'bc_atendimento_qualificacao_fatura',
        categoria: 'Atendimento',
        etapa: '1º contato',
        conteudo:
          'Obrigado pelo retorno, {{nome}}! Além da conta de luz, o imóvel possui telhado com boa incidência de sol (fibrocimento, cerâmico, metálico ou laje)?\nSe preferir, também temos soluções com geração em solo ou estrutura personalizada.',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Atendimento — Agendamento de visita técnica',
        slug: 'bc_atendimento_agendamento_visita',
        categoria: 'Atendimento',
        etapa: 'Visita técnica',
        conteudo:
          'Olá, {{nome}}! Seu estudo prévio ficou pronto. O próximo passo recomendado é fazermos uma visita técnica rápida no local para avaliar o telhado, quadro elétrico e padrão de entrada.\nVocê teria disponibilidade nesta semana para receber nosso engenheiro técnico?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Atendimento — Envio de Orçamento / Proposta',
        slug: 'bc_atendimento_envio_proposta',
        categoria: 'Comercial',
        etapa: 'Orçamento enviado',
        conteudo:
          'Olá, {{nome}}! Segue a sua proposta técnico-comercial personalizada da Delfos Solar no valor de {{valor}}.\nNela detalhamos a potência estimada, os equipamentos de primeira linha, a economia mensal e o tempo de retorno do investimento. Fico à disposição para tirar qualquer dúvida!',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Cobrança — Lembrete preventivo (D-2 a D-1)',
        slug: 'bc_cobranca_lembrete_preventivo',
        categoria: 'Financeiro/Cobrança',
        etapa: 'Cobrança',
        conteudo:
          'Olá, {{nome}}! Passando apenas para lembrar que a fatura referente aos serviços da Delfos Solar no valor de {{valor}} vence em {{data}}.\nCaso precise da 2ª via do boleto ou da chave PIX, é só nos responder por aqui. Tenha um ótimo dia!',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Cobrança — Aviso amigável no dia do vencimento (D0)',
        slug: 'bc_cobranca_vencimento_hoje',
        categoria: 'Financeiro/Cobrança',
        etapa: 'Cobrança',
        conteudo:
          'Olá, {{nome}}! Lembramos que a sua fatura no valor de {{valor}} tem vencimento programado para hoje ({{data}}).\nSe já realizou o pagamento, por favor desconsidere este aviso. Caso necessite de apoio ou reenvio dos dados de pagamento, estamos à disposição!',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Cobrança — 1º Aviso de atraso suave (D+3 a D+5)',
        slug: 'bc_cobranca_atraso_suave',
        categoria: 'Financeiro/Cobrança',
        etapa: 'Cobrança',
        conteudo:
          'Olá, {{nome}}, tudo bem?\nConstatamos que a fatura de {{valor}} com vencimento em {{data}} ainda não consta liquidada em nosso sistema.\nPode ter ocorrido algum imprevisto na compensação. Gostaria que enviássemos uma 2ª via atualizada com nova data para facilitar?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Cobrança — 2º Aviso formal de pendência (D+10 a D+15)',
        slug: 'bc_cobranca_aviso_formal',
        categoria: 'Financeiro/Cobrança',
        etapa: 'Cobrança',
        conteudo:
          'Olá, {{nome}}! Entramos em contato referente à pendência financeira no valor de {{valor}}, vencida desde {{data}}.\nSolicitamos a gentileza de regularizar para evitar a suspensão temporária dos serviços de monitoramento e manutenção contratados. Podemos gerar um novo PIX agora?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Cobrança — Notificação pré-bloqueio / Renegociação (D+20+)',
        slug: 'bc_cobranca_notificacao_pre_bloqueio',
        categoria: 'Financeiro/Cobrança',
        etapa: 'Cobrança',
        conteudo:
          'Prezado(a) {{nome}}, seu contrato possui fatura em aberto de {{valor}} desde {{data}}.\nPara mantermos o fornecimento dos serviços e evitar restrições cadastrais, pedimos que entre em contato urgente com nosso setor financeiro para alinharmos um acordo.',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'O&M — Lembrete de Limpeza e Manutenção Preventiva',
        slug: 'bc_om_lembrete_limpeza_preventiva',
        categoria: 'O&M & Pós-Venda',
        etapa: 'Renovação O&M',
        conteudo:
          'Olá, {{nome}}! Como vai o funcionamento da sua usina solar?\nA poeira e fuligem acumuladas nos módulos reduzem a geração em até 20%. Recomendamos realizar a limpeza técnica e reaperto das conexões periodicamente.\nPodemos agendar a visita da equipe técnica para esta semana?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Pós-Venda — Checagem de 30 dias após instalação',
        slug: 'bc_pos_venda_30_dias',
        categoria: 'O&M & Pós-Venda',
        etapa: 'Pós-instalação',
        conteudo:
          'Olá, {{nome}}! Faz 30 dias que sua usina solar Delfos foi instalada e comissionada.\nComo está sendo a sua experiência com o aplicativo de monitoramento? Os créditos na conta de energia já começaram a aparecer? Qualquer dúvida técnica, nossa equipe de pós-vendas está aqui!',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'O&M — Proposta de Plano Anual de Manutenção',
        slug: 'bc_om_proposta_plano_anual',
        categoria: 'O&M & Pós-Venda',
        etapa: 'Renovação O&M',
        conteudo:
          'Olá, {{nome}}! Para garantir a máxima eficiência e a longevidade do seu investimento solar, preparamos uma proposta para o Plano Anual de O&M Delfos no valor de {{valor}}.\nEle inclui monitoramento contínuo, limpezas periódicas e vistorias elétricas preventivas. Quer que eu te envie a lâmina com os detalhes?',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
      {
        titulo: 'Reativação — Cliente inativo / Ampliação de Usina',
        slug: 'bc_reativacao_ampliacao_usina',
        categoria: 'Comercial',
        etapa: '1º contato',
        conteudo:
          'Olá, {{nome}}! Tudo bem?\nCom o aumento do consumo elétrico (ar-condicionado, novos equipamentos ou veículos elétricos), muitos clientes optam por ampliar o sistema solar existente.\nSe você estiver sentindo necessidade de gerar mais energia, podemos fazer um estudo de expansão rápido sem compromisso!',
        tipo_gatilho: 'manual',
        origem_base_conhecimento: true,
        variaveis_disponiveis: ['nome', 'empresa', 'valor', 'data'],
      },
    ]

    for (const tpl of templatesNovosBC) {
      try {
        let achado = null
        try {
          const res = app.findRecordsByFilter(
            'whatsapp_templates',
            `slug = '${tpl.slug}'`,
            '',
            1,
            0,
          )
          if (res && res.length > 0) achado = res[0]
        } catch (_) {}

        if (achado) {
          achado.set('titulo', tpl.titulo)
          achado.set('categoria', tpl.categoria)
          achado.set('etapa', tpl.etapa)
          achado.set('conteudo', tpl.conteudo)
          achado.set('origem_base_conhecimento', true)
          achado.set('variaveis_disponiveis', tpl.variaveis_disponiveis)
          app.save(achado)
        } else {
          const novo = new Record(col, tpl)
          novo.set('ativo', true)
          app.save(novo)
        }
      } catch (errTpl) {
        console.log(`[MIGRATION 0171] Erro ao cadastrar template ${tpl.slug}:`, errTpl)
      }
    }
  },
  (app) => {
    // Reversão
  },
)

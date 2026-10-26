/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Criar collection whatsapp_template_categorias
    let colCategorias = null
    try {
      colCategorias = app.findCollectionByNameOrId('whatsapp_template_categorias')
    } catch (_) {}

    if (!colCategorias) {
      colCategorias = new Collection({
        name: 'whatsapp_template_categorias',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'ordem', type: 'number', required: false },
          { name: 'cor', type: 'text', required: false },
          { name: 'descricao', type: 'text', required: false },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_wtt_cat_nome ON whatsapp_template_categorias (nome)'],
      })
      app.save(colCategorias)
    }

    // 2. Criar collection whatsapp_template_etapas
    let colEtapas = null
    try {
      colEtapas = app.findCollectionByNameOrId('whatsapp_template_etapas')
    } catch (_) {}

    if (!colEtapas) {
      colEtapas = new Collection({
        name: 'whatsapp_template_etapas',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'ordem', type: 'number', required: false },
          { name: 'cor', type: 'text', required: false },
          { name: 'descricao', type: 'text', required: false },
          { name: 'ativo', type: 'bool', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_wtt_etapa_nome ON whatsapp_template_etapas (nome)'],
      })
      app.save(colEtapas)
    }

    // 3. Seed idempotente de Categorias
    const categoriasIniciais = [
      {
        nome: 'Comercial',
        ordem: 1,
        cor: 'emerald',
        descricao: 'Propostas, orçamentos, fechamento e negociação',
      },
      {
        nome: 'Atendimento',
        ordem: 2,
        cor: 'blue',
        descricao: 'Primeiro contato, qualificação e agendamentos',
      },
      {
        nome: 'O&M & Pós-Venda',
        ordem: 3,
        cor: 'purple',
        descricao: 'Operação, manutenção, planos anuais e pós-instalação',
      },
      {
        nome: 'Financeiro/Cobrança',
        ordem: 4,
        cor: 'amber',
        descricao: 'Lembretes de fatura, cobrança e 2ª via',
      },
      {
        nome: 'Operacional/RGE',
        ordem: 5,
        cor: 'orange',
        descricao: 'Auto leitura RGE, ordens de serviço e concessionária',
      },
    ]

    for (const cat of categoriasIniciais) {
      try {
        let existente = null
        try {
          const res = app.findRecordsByFilter(
            'whatsapp_template_categorias',
            `nome = '${cat.nome}'`,
            '',
            1,
            0,
          )
          if (res && res.length > 0) existente = res[0]
        } catch (_) {}

        if (!existente) {
          const rec = new Record(colCategorias, {
            nome: cat.nome,
            ordem: cat.ordem,
            cor: cat.cor,
            descricao: cat.descricao,
            ativo: true,
          })
          app.save(rec)
        }
      } catch (errCat) {
        console.log('[MIGRATION 1745260069] Erro seed categoria:', cat.nome, errCat)
      }
    }

    // 4. Seed idempotente de Etapas
    const etapasIniciais = [
      { nome: '1º contato', ordem: 1, descricao: 'Recepção e qualificação inicial do lead' },
      {
        nome: 'Orçamento enviado',
        ordem: 2,
        descricao: 'Envio de estudo prévio ou proposta solar',
      },
      {
        nome: 'Follow-up Fase 1',
        ordem: 3,
        descricao: 'Checagem de recebimento e esclarecimento de dúvidas',
      },
      {
        nome: 'Follow-up Fase 2',
        ordem: 4,
        descricao: 'Prova social, comparativo e ajustes técnicos',
      },
      { nome: 'Follow-up Fase 3', ordem: 5, descricao: 'Última chamada e reserva de condições' },
      { nome: 'Break-up', ordem: 6, descricao: 'Fechamento amigável e arquivamento temporário' },
      {
        nome: 'Visita técnica',
        ordem: 7,
        descricao: 'Agendamento e confirmação de vistoria em campo',
      },
      {
        nome: 'Assinatura/documentos',
        ordem: 8,
        descricao: 'Contrato, procuração e anexos para homologação',
      },
      {
        nome: 'Pós-instalação',
        ordem: 9,
        descricao: 'Acompanhamento pós-obra, leitura e comissionamento',
      },
      {
        nome: 'Renovação O&M',
        ordem: 10,
        descricao: 'Oferta de limpeza, manutenção preventiva e contrato O&M',
      },
      { nome: 'Cobrança', ordem: 11, descricao: 'Lembretes de vencimento e avisos de pendência' },
    ]

    for (const etapa of etapasIniciais) {
      try {
        let existente = null
        try {
          const res = app.findRecordsByFilter(
            'whatsapp_template_etapas',
            `nome = '${etapa.nome}'`,
            '',
            1,
            0,
          )
          if (res && res.length > 0) existente = res[0]
        } catch (_) {}

        if (!existente) {
          const rec = new Record(colEtapas, {
            nome: etapa.nome,
            ordem: etapa.ordem,
            descricao: etapa.descricao,
            ativo: true,
          })
          app.save(rec)
        }
      } catch (errEtapa) {
        console.log('[MIGRATION 1745260069] Erro seed etapa:', etapa.nome, errEtapa)
      }
    }
  },
  (app) => {
    try {
      const c1 = app.findCollectionByNameOrId('whatsapp_template_categorias')
      if (c1) app.delete(c1)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('whatsapp_template_etapas')
      if (c2) app.delete(c2)
    } catch (_) {}
  },
)

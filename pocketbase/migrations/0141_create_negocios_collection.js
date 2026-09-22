migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')

    // 1. Criar coleção 'negocios'
    const negociosCol = new Collection({
      name: 'negocios',
      type: 'base',
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      fields: [
        {
          name: 'cliente_id',
          type: 'relation',
          required: true,
          collectionId: clientesCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'tipo_negocio',
          type: 'select',
          required: false,
          values: ['venda usina', 'bateria', 'expansão', 'renovação', 'serviço'],
          maxSelect: 1,
        },
        {
          name: 'valor_estimado',
          type: 'number',
          required: false,
        },
        {
          name: 'valor_final',
          type: 'number',
          required: false,
        },
        {
          name: 'etapa_funil',
          type: 'select',
          required: false,
          values: [
            'novo lead',
            'qualificado',
            'proposta enviada',
            'negociação',
            'contrato assinado',
          ],
          maxSelect: 1,
        },
        {
          name: 'probabilidade',
          type: 'number',
          required: false,
        },
        {
          name: 'data_previsao_fechamento',
          type: 'date',
          required: false,
        },
        {
          name: 'data_fechamento',
          type: 'date',
          required: false,
        },
        {
          name: 'status',
          type: 'select',
          required: false,
          values: ['em andamento', 'ganho', 'perdido'],
          maxSelect: 1,
        },
        {
          name: 'motivo_perda',
          type: 'text',
          required: false,
        },
        {
          name: 'reabertura',
          type: 'bool',
          required: false,
        },
        {
          name: 'motivo_reabertura',
          type: 'text',
          required: false,
        },
        {
          name: 'condicao_pagamento',
          type: 'text',
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_negocios_cliente ON negocios (cliente_id)',
        'CREATE INDEX idx_negocios_status ON negocios (status)',
        'CREATE INDEX idx_negocios_etapa ON negocios (etapa_funil)',
      ],
    })

    app.save(negociosCol)

    // Helper para normalizar status
    function mapearStatusNegocio(cliStatus) {
      const s = (cliStatus || '').toLowerCase()
      if (s === 'fechado') return 'ganho'
      if (s === 'perdido') return 'perdido'
      return 'em andamento'
    }

    // Helper para mapear etapa_funil
    function mapearEtapaFunil(cliStatus) {
      const s = (cliStatus || '').toLowerCase()
      if (s === 'novo lead') return 'novo lead'
      if (s === 'levantamento') return 'qualificado'
      if (s === 'orçamento') return 'proposta enviada'
      if (s === 'negociação') return 'negociação'
      if (s === 'fechado') return 'contrato assinado'
      return 'novo lead'
    }

    // Helper para mapear probabilidade
    function mapearProbabilidade(cliStatus) {
      const s = (cliStatus || '').toLowerCase()
      if (s === 'fechado') return 100
      if (s === 'negociação') return 75
      if (s === 'orçamento') return 50
      if (s === 'levantamento') return 25
      if (s === 'perdido') return 0
      return 10
    }

    // Helper para mapear tipo_negocio
    function mapearTipoNegocio(cliTipoNegocio, cliProduto) {
      const raw = `${cliTipoNegocio || ''} ${cliProduto || ''}`.toLowerCase()
      if (raw.includes('bateria')) return 'bateria'
      if (raw.includes('expans') || raw.includes('amplia')) return 'expansão'
      if (raw.includes('renov') || raw.includes('o&m') || raw.includes('plano')) return 'renovação'
      if (
        raw.includes('manuten') ||
        raw.includes('serviço') ||
        raw.includes('servico') ||
        raw.includes('limpeza')
      )
        return 'serviço'
      return 'venda usina'
    }

    // 2. Migrar dados existentes de negócios dos clientes para a nova coleção 'negocios'
    // Mantendo dados intactos em clientes sempre que a remoção for arriscada
    // O campo WhatsApp é autoritativo — telefone é que se iguala ao WhatsApp quando divergem
    try {
      const allClientes = app.findRecordsByFilter('clientes', 'id != ""', 'created', 2000, 0)
      for (const cli of allClientes) {
        // Garantir regra do WhatsApp autoritativo sobre telefone
        const zap = (cli.getString('whatsapp') || '').trim()
        const tel = (cli.getString('telefone') || '').trim()
        if (zap && zap !== tel) {
          cli.set('telefone', zap)
          app.save(cli)
        } else if (!zap && tel) {
          cli.set('whatsapp', tel)
          app.save(cli)
        }

        const valEst = cli.getInt('valor_estimado') || cli.get('valor_estimado') || 0
        const valFin = cli.getInt('valor_final') || cli.get('valor_final') || 0
        const cliStatus = cli.getString('status') || ''
        const cliTipoNeg = cli.getString('tipo_negocio') || ''
        const cliProd = cli.getString('produto') || ''
        const reab = cli.getBool('reabertura')
        const motPerda = cli.getString('motivo_perda') || ''
        const condPag = cli.getString('condicao_pagamento') || ''
        const dtPrev = cli.getString('data_previsao_fechamento') || ''
        const dtFech = cli.getString('data_fechamento') || ''
        const motReab =
          cli.getString('motivo_reabertura') || cli.getString('descricao_reabertura') || ''

        // Se o cliente tem dados de negócio, cria o registro em negocios
        if (
          valEst > 0 ||
          valFin > 0 ||
          cliTipoNeg ||
          cliStatus ||
          reab ||
          motPerda ||
          dtFech ||
          dtPrev
        ) {
          const negRec = new Record(negociosCol)
          negRec.set('cliente_id', cli.id)
          negRec.set('tipo_negocio', mapearTipoNegocio(cliTipoNeg, cliProd))
          negRec.set('valor_estimado', Number(valEst) || 0)
          negRec.set('valor_final', Number(valFin) || 0)
          negRec.set('etapa_funil', mapearEtapaFunil(cliStatus))
          negRec.set('probabilidade', mapearProbabilidade(cliStatus))
          if (dtPrev) negRec.set('data_previsao_fechamento', dtPrev)
          if (dtFech) negRec.set('data_fechamento', dtFech)
          negRec.set('status', mapearStatusNegocio(cliStatus))
          negRec.set('motivo_perda', motPerda)
          negRec.set('reabertura', Boolean(reab))
          negRec.set('motivo_reabertura', motReab)
          negRec.set('condicao_pagamento', condPag)

          app.save(negRec)
        }
      }
    } catch (migErr) {
      console.warn('Aviso durante migração de negocios dos clientes:', migErr)
    }

    // 3. Cadastrar ou atualizar cliente de exemplo: "Arthur Paulo Medeiros" com 2 negócios:
    // Uma venda de 75 kWp em 2025 e uma expansão de 30 kWp em 2026
    try {
      let arthurCli = null
      try {
        arthurCli = app.findFirstRecordByData('clientes', 'nome', 'Arthur Paulo Medeiros')
      } catch (_) {
        // não encontrou
      }

      if (!arthurCli) {
        arthurCli = new Record(clientesCol)
        arthurCli.set('nome', 'Arthur Paulo Medeiros')
        arthurCli.set('cpf', '719.842.109-85')
        arthurCli.set('data_nascimento_fundacao', '1984-06-15')
        arthurCli.set('endereco', 'Rua das Palmeiras')
        arthurCli.set('numero', '450')
        arthurCli.set('bairro', 'Bela Vista')
        arthurCli.set('cidade', 'Erechim')
        arthurCli.set('estado', 'RS')
        arthurCli.set('cep', '99700-000')
        arthurCli.set('whatsapp', '(54) 99882-3411')
        arthurCli.set('telefone', '(54) 99882-3411')
        arthurCli.set('email', 'arthur.medeiros@exemplo.com.br')
        arthurCli.set('origem_lead', 'Indicação')
        arthurCli.set('como_conheceu', 'Indicação de cliente')
        arthurCli.set(
          'observacoes',
          'Cliente industrial com usina principal instalada em 2025 e projeto de expansão.',
        )
        arthurCli.set('status', 'Fechado')
        app.save(arthurCli)
      } else {
        // Garantir dados cadastrais preservados e zap autoritativo
        arthurCli.set('whatsapp', '(54) 99882-3411')
        arthurCli.set('telefone', '(54) 99882-3411')
        app.save(arthurCli)
      }

      // Remover eventuais negócios pré-existentes de Arthur para idempotência
      try {
        const arthurNegociosExistentes = app.findRecordsByFilter(
          'negocios',
          `cliente_id = "${arthurCli.id}"`,
          'created',
          50,
          0,
        )
        for (const n of arthurNegociosExistentes) {
          app.delete(n)
        }
      } catch (_) {}

      // Negócio 1: Venda usina de 75 kWp em 2025 (Ganho / Contrato assinado)
      const negocio1 = new Record(negociosCol)
      negocio1.set('cliente_id', arthurCli.id)
      negocio1.set('tipo_negocio', 'venda usina')
      negocio1.set('valor_estimado', 265000)
      negocio1.set('valor_final', 255000)
      negocio1.set('etapa_funil', 'contrato assinado')
      negocio1.set('probabilidade', 100)
      negocio1.set('data_previsao_fechamento', '2025-04-10 12:00:00.000Z')
      negocio1.set('data_fechamento', '2025-04-18 15:30:00.000Z')
      negocio1.set('status', 'ganho')
      negocio1.set('condicao_pagamento', 'Entrada 30% + Financiamento bancário em 60x')
      negocio1.set('reabertura', false)
      app.save(negocio1)

      // Negócio 2: Expansão de 30 kWp em 2026 (Em andamento / Negociação)
      const negocio2 = new Record(negociosCol)
      negocio2.set('cliente_id', arthurCli.id)
      negocio2.set('tipo_negocio', 'expansão')
      negocio2.set('valor_estimado', 115000)
      negocio2.set('valor_final', 0)
      negocio2.set('etapa_funil', 'negociação')
      negocio2.set('probabilidade', 80)
      negocio2.set('data_previsao_fechamento', '2026-11-20 12:00:00.000Z')
      negocio2.set('status', 'em andamento')
      negocio2.set('condicao_pagamento', 'Financiamento Santander Solar em 48x')
      negocio2.set('reabertura', true)
      negocio2.set(
        'motivo_reabertura',
        'Ampliação do sistema existente para nova linha de produção',
      )
      app.save(negocio2)
    } catch (seedErr) {
      console.warn('Aviso no seed do cliente Arthur Paulo Medeiros:', seedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('negocios')
      app.delete(col)
    } catch (_) {}
  },
)

migrate(
  (app) => {
    // 1. Criar coleção tipos_atividades_custom para tipos de atividade personalizados pelo usuário/admin
    let customCol = null
    try {
      customCol = app.findCollectionByNameOrId('tipos_atividades_custom')
    } catch (_) {}

    if (!customCol) {
      customCol = new Collection({
        name: 'tipos_atividades_custom',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          {
            name: 'nome',
            type: 'text',
            required: true,
          },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['comercial', 'manutencao', 'administrativo_pos_venda'],
            maxSelect: 1,
          },
          {
            name: 'cor',
            type: 'text',
            required: false,
          },
          {
            name: 'icone',
            type: 'text',
            required: false,
          },
          {
            name: 'descricao',
            type: 'text',
            required: false,
          },
          {
            name: 'is_padrao',
            type: 'bool',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_tipos_ativ_cat ON tipos_atividades_custom (categoria)',
          'CREATE INDEX idx_tipos_ativ_nome ON tipos_atividades_custom (nome)',
        ],
      })
      app.save(customCol)
    }

    // 2. Expandir a lista de valores permitidos no select `tipo` da tabela `atividades` caso seja um select
    try {
      const atividades = app.findCollectionByNameOrId('atividades')
      const tipoField = atividades.fields.getByName('tipo')
      if (tipoField) {
        const novosTipos = [
          'contato_ligacao',
          'reuniao_presencial',
          'follow_up',
          'proposta',
          'ligar_indicacao',
          'contato_reativacao',
          'instalacao',
          'limpeza_manutencao',
          'configuracao_datalogger',
          'garantia_equipamento',
          'auto_leitura_rge',
          'relatorio_solarview',
          'anexo_g',
          'troca_titularidade',
          'transferencia_creditos',
          'anotacao',
          'ligacao',
          'reuniao',
          'visita_tecnica',
          'mudanca_estagio',
          'custom',
        ]
        const currentVals = new Set(tipoField.values || [])
        for (const v of novosTipos) {
          currentVals.add(v)
        }
        tipoField.values = Array.from(currentVals)
        app.save(atividades)
      }
    } catch (e) {
      console.log('Erro ao atualizar valores de tipo em atividades:', e)
    }

    // 3. Semear dados de exemplo com atividades reais nas três categorias para Marcelo Becker (cliente_id: 9ozpqdm9sgwmdzr)
    // 1. Follow-up (Comercial)
    // 2. Limpeza e Manutenção (Manutenção)
    // 3. Auto Leitura - RGE (Administrativas/RGE/Pós-Venda)
    try {
      let marcelo = null
      try {
        marcelo = app.findFirstRecordByData('clientes', 'id', '9ozpqdm9sgwmdzr')
      } catch (_) {
        try {
          marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
        } catch (_) {}
      }

      if (marcelo) {
        const ativCol = app.findCollectionByNameOrId('atividades')

        const seedExemplos = [
          {
            cliente_id: marcelo.id,
            tipo: 'follow_up',
            titulo: 'Follow-up de Negociação da Usina 28.5 kWp',
            descricao:
              'Alinhamento com o produtor Marcelo Becker sobre as opções de financiamento rural Sicredi Agro e fechamento do cronograma de instalação dos 52 módulos.',
            data: '2026-03-12 14:30:00.000Z',
            autor: 'João Silva',
            responsavel_nome: 'João Silva',
            status: 'pendente',
          },
          {
            cliente_id: marcelo.id,
            tipo: 'limpeza_manutencao',
            titulo: 'Limpeza e Manutenção Preventiva dos Painéis Rurais',
            descricao:
              'Lavagem técnica com água desmineralizada e verificação de conectores MC4 e aterramento dos 52 módulos da Fazenda Três Palmeiras após período de estiagem.',
            data: '2026-03-14 09:00:00.000Z',
            autor: 'Carlos Mendes',
            responsavel_nome: 'Carlos Mendes',
            status: 'pendente',
          },
          {
            cliente_id: marcelo.id,
            tipo: 'auto_leitura_rge',
            titulo: 'Auto Leitura - RGE e Conferência de Créditos Injetados',
            descricao:
              'Registro fotográfico do medidor bidirecional da UC 4091823719 para protocolo de conferência de saldo de geração injetado na concessionária RGE.',
            data: '2026-03-16 11:15:00.000Z',
            autor: 'Fernanda Lima',
            responsavel_nome: 'Fernanda Lima',
            status: 'pendente',
          },
        ]

        for (const item of seedExemplos) {
          try {
            const found = app.findRecordsByFilter(
              'atividades',
              `cliente_id='${item.cliente_id}' && tipo='${item.tipo}' && titulo='${item.titulo.replace(/'/g, "\\'")}'`,
              'created',
              1,
              0,
            )
            if (found && found.length > 0) continue
          } catch (_) {}

          try {
            const rec = new Record(ativCol)
            rec.set('cliente_id', item.cliente_id)
            rec.set('tipo', item.tipo)
            rec.set('titulo', item.titulo)
            rec.set('descricao', item.descricao)
            rec.set('data', item.data)
            rec.set('autor', item.autor)
            rec.set('responsavel_nome', item.responsavel_nome)
            rec.set('status', item.status)
            app.save(rec)
          } catch (err) {
            console.log('Erro ao semear atividade:', item.titulo, err)
          }
        }
      }
    } catch (e) {
      console.log('Erro ao semear atividades de exemplo para Marcelo Becker:', e)
    }
  },
  (app) => {
    try {
      const customCol = app.findCollectionByNameOrId('tipos_atividades_custom')
      if (customCol) app.delete(customCol)
    } catch (_) {}
  },
)

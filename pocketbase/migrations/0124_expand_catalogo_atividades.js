migrate(
  (app) => {
    const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')

    // 1. Estender a coleção tipos_atividades_custom com os campos requeridos pela spec:
    // - valor_base (number)
    // - frequencia_meses (number)
    // - tipo_execucao (select: 'equipe_interna' | 'fornecedor_externo')
    // - orientacoes_tecnicas (text)
    // - links_uteis (text ou json)
    // - documento_modelo (file)
    // - ativo (bool, padrão true)

    if (!tiposCol.fields.getByName('valor_base')) {
      tiposCol.fields.add(
        new NumberField({
          name: 'valor_base',
          required: false,
          min: 0,
        }),
      )
    }

    if (!tiposCol.fields.getByName('frequencia_meses')) {
      tiposCol.fields.add(
        new NumberField({
          name: 'frequencia_meses',
          required: false,
          min: 0,
        }),
      )
    }

    if (!tiposCol.fields.getByName('tipo_execucao')) {
      tiposCol.fields.add(
        new SelectField({
          name: 'tipo_execucao',
          required: false,
          values: ['equipe_interna', 'fornecedor_externo'],
          maxSelect: 1,
        }),
      )
    }

    if (!tiposCol.fields.getByName('orientacoes_tecnicas')) {
      tiposCol.fields.add(
        new TextField({
          name: 'orientacoes_tecnicas',
          required: false,
        }),
      )
    }

    if (!tiposCol.fields.getByName('links_uteis')) {
      tiposCol.fields.add(
        new TextField({
          name: 'links_uteis',
          required: false,
        }),
      )
    }

    if (!tiposCol.fields.getByName('documento_modelo')) {
      tiposCol.fields.add(
        new FileField({
          name: 'documento_modelo',
          required: false,
          maxSelect: 1,
          maxSize: 10485760, // 10MB
        }),
      )
    }

    if (!tiposCol.fields.getByName('ativo')) {
      tiposCol.fields.add(
        new BoolField({
          name: 'ativo',
          required: false,
        }),
      )
    }

    app.save(tiposCol)

    // 2. Atualizar registros existentes e semear catálogo completo
    const seedServicos = [
      {
        nome: 'Limpeza e Lavagem de Placas',
        categoria: 'manutencao',
        cor: '#0284C7',
        icone: 'Droplets',
        descricao:
          'Lavagem técnica dos módulos com água desmineralizada e remoção de sujidades e biofilme',
        valor_base: 450,
        frequencia_meses: 6,
        tipo_execucao: 'equipe_interna',
        orientacoes_tecnicas:
          'Utilizar água desmineralizada e escovas rotativas com cerdas macias anti-risco. Nunca pisar nos módulos fotovoltaicos. Realizar a lavagem nas primeiras horas da manhã ou final da tarde para evitar choque térmico nas placas.',
        links_uteis:
          'https://delfosengenharia.com.br/manuais/checklist-lavagem-solar.pdf\nhttps://abgd.com.br/boas-praticas-limpeza-fotovoltaica',
        ativo: true,
      },
      {
        nome: 'Revisão Elétrica e Reaperto',
        categoria: 'manutencao',
        cor: '#F59E0B',
        icone: 'Zap',
        descricao: 'Revisão de quadros elétricos CC/CA, reaperto de bornes e inspeção termográfica',
        valor_base: 680,
        frequencia_meses: 12,
        tipo_execucao: 'equipe_interna',
        orientacoes_tecnicas:
          'Utilizar chave de fenda dinamométrica calibrada com o torque especificado pelo fabricante das chaves seccionadoras e disjuntores. Realizar termografia com câmera calibrada e emissividade configurada em 0,95.',
        links_uteis: 'https://delfosengenharia.com.br/normas/nbr-5410-torque-quadros.pdf',
        ativo: true,
      },
      {
        nome: 'Manutenção Preventiva',
        categoria: 'manutencao',
        cor: '#16A34A',
        icone: 'Wrench',
        descricao:
          'Inspeção geral de cabeamento solar, conectores MC4, estrutura de fixação e aterramento',
        valor_base: 550,
        frequencia_meses: 12,
        tipo_execucao: 'equipe_interna',
        orientacoes_tecnicas:
          'Conferir integridade do aterramento das estruturas de telhado, oxidação em terminais de aterramento e fixadores mecânicos.',
        links_uteis: 'https://delfosengenharia.com.br/manuais/checklist-preventiva-anual.pdf',
        ativo: true,
      },
      {
        nome: 'Manutenção Corretiva / Inversor',
        categoria: 'manutencao',
        cor: '#DC2626',
        icone: 'Settings',
        descricao: 'Diagnóstico de falhas, substituição de fusíveis/DPS ou troca de inversor',
        valor_base: 850,
        frequencia_meses: 0,
        tipo_execucao: 'fornecedor_externo',
        orientacoes_tecnicas:
          'Desligar lado CC e lado CA antes de qualquer intervenção. Aguardar descarga capacitiva de no mínimo 5 minutos indicada no frontal do inversor. Testar ausência de tensão com multímetro CAT III 1000V.',
        links_uteis: 'https://deyeinverters.com/support/rma-procedimentos.pdf',
        ativo: true,
      },
      {
        nome: 'Configuração e Teste de Datalogger',
        categoria: 'manutencao',
        cor: '#4F46E5',
        icone: 'Wifi',
        descricao:
          'Alinhamento de telemetria, sinal Wi-Fi e sincronização no monitoramento Solarview/Deye Cloud',
        valor_base: 250,
        frequencia_meses: 0,
        tipo_execucao: 'equipe_interna',
        orientacoes_tecnicas:
          'Verificar sinal 2.4 GHz da rede Wi-Fi do cliente. Confirmar IP fixo ou reserva DHCP. Validar envio de pacotes para o servidor da nuvem a cada 5 minutos.',
        links_uteis: 'https://solarview.com.br/ajuda/datalogger-setup',
        ativo: true,
      },
      {
        nome: 'Vistoria Técnica In Loco',
        categoria: 'manutencao',
        cor: '#059669',
        icone: 'ShieldCheck',
        descricao: 'Vistoria presencial pós-instalação ou para auditoria de desempenho e segurança',
        valor_base: 400,
        frequencia_meses: 24,
        tipo_execucao: 'equipe_interna',
        orientacoes_tecnicas:
          'Checar conformidade da usina com a ART de projeto. Preencher o formulário de entrega técnica e colher assinatura do cliente.',
        links_uteis: 'https://delfosengenharia.com.br/documentos/termo-vistoria-tecnica.pdf',
        ativo: true,
      },
      {
        nome: 'Troca de Inversor',
        categoria: 'manutencao',
        cor: '#E11D48',
        icone: 'Cpu',
        descricao:
          'Substituição completa de inversor central ou microinversores com descarte/RMA do antigo',
        valor_base: 1200,
        frequencia_meses: 0,
        tipo_execucao: 'fornecedor_externo',
        orientacoes_tecnicas:
          'Seguir procedimento de garantia e RMA do fabricante (Deye, Sungrow, Growatt, Fronius). Coletar número de série de ambos os equipamentos para atualização junto à concessionária de energia e sistema de monitoramento.',
        links_uteis:
          'https://delfosengenharia.com.br/rma/protocolo-troca-inversores.pdf\nhttps://deyeinverters.com/rma',
        ativo: true,
      },
      {
        nome: 'Verificação Elétrica',
        categoria: 'manutencao',
        cor: '#D97706',
        icone: 'Zap',
        descricao:
          'Medição de curvas I-V, isolamento de condutores e ensaio de continuidade de proteção',
        valor_base: 500,
        frequencia_meses: 12,
        tipo_execucao: 'equipe_interna',
        orientacoes_tecnicas:
          'Realizar medição de resistência de isolamento (Megôhmetro) com 1000Vcc entre polos e aterramento. Registrar medições em conformidade com a NBR 16274.',
        links_uteis: 'https://delfosengenharia.com.br/normas/nbr-16274-ensaio-eletrico.pdf',
        ativo: true,
      },
      {
        nome: 'Inspeção Termográfica Aérea (Drone)',
        categoria: 'manutencao',
        cor: '#8B5CF6',
        icone: 'Camera',
        descricao:
          'Varredura infravermelha com drone para identificação de hotspots, diodos abertos e trincas térmicas',
        valor_base: 950,
        frequencia_meses: 24,
        tipo_execucao: 'fornecedor_externo',
        orientacoes_tecnicas:
          'Voar em condições de irradiância solar superior a 700 W/m² e ângulo de insolação favorável sem nuvens passageiras.',
        links_uteis: 'https://delfosengenharia.com.br/manuais/inspecao-termografica-drone.pdf',
        ativo: true,
      },
    ]

    for (const item of seedServicos) {
      try {
        const found = app.findRecordsByFilter(
          'tipos_atividades_custom',
          `nome = "${item.nome.replace(/"/g, '\\"')}"`,
          '',
          1,
          0,
        )

        let rec = null
        if (found && found.length > 0) {
          rec = found[0]
        } else {
          rec = new Record(tiposCol)
        }

        rec.set('nome', item.nome)
        rec.set('categoria', item.categoria)
        rec.set('cor', item.cor)
        rec.set('icone', item.icone)
        rec.set('descricao', item.descricao)
        rec.set('is_padrao', true)
        rec.set('valor_base', item.valor_base)
        rec.set('frequencia_meses', item.frequencia_meses)
        rec.set('tipo_execucao', item.tipo_execucao)
        rec.set('orientacoes_tecnicas', item.orientacoes_tecnicas)
        rec.set('links_uteis', item.links_uteis)
        rec.set('ativo', item.ativo)

        app.save(rec)
      } catch (err) {
        console.log('Erro ao salvar item no catálogo de atividades:', item.nome, err)
      }
    }

    // Garantir que todos os outros registros em tipos_atividades_custom que não têm 'ativo' preenchido fiquem ativo=true
    try {
      app
        .db()
        .newQuery('UPDATE tipos_atividades_custom SET ativo = 1 WHERE ativo IS NULL')
        .execute()
    } catch (_) {}
  },
  (app) => {
    try {
      const tiposCol = app.findCollectionByNameOrId('tipos_atividades_custom')
      const fieldsToRemove = [
        'valor_base',
        'frequencia_meses',
        'tipo_execucao',
        'orientacoes_tecnicas',
        'links_uteis',
        'documento_modelo',
        'ativo',
      ]
      for (const fn of fieldsToRemove) {
        const f = tiposCol.fields.getByName(fn)
        if (f) tiposCol.fields.remove(f)
      }
      app.save(tiposCol)
    } catch (_) {}
  },
)

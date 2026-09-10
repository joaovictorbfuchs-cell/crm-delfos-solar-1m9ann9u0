migrate(
  (app) => {
    const clientesCol = app.findCollectionByNameOrId('clientes')
    const sistemasCol = app.findCollectionByNameOrId('sistemas')
    const atividadesCol = app.findCollectionByNameOrId('atividades')
    const contratosCol = app.findCollectionByNameOrId('contratos_om')
    const anomaliasCol = app.findCollectionByNameOrId('anomalias_om')
    const adicionaisCol = app.findCollectionByNameOrId('servicos_adicionais_om')
    const timelineOmCol = app.findCollectionByNameOrId('timeline_om')
    const projetosCol = app.findCollectionByNameOrId('projetos')
    const projetoEventosCol = app.findCollectionByNameOrId('projeto_eventos')

    // Obter responsáveis (usuários ou nomes)
    let joaoId = ''
    let carlosId = ''
    let fernandaId = ''
    try {
      joaoId = app.findAuthRecordByEmail('_pb_users_auth_', 'joao@delfosengenharia.com.br').id
    } catch (_) {}
    try {
      carlosId = app.findAuthRecordByEmail('_pb_users_auth_', 'carlos@delfosengenharia.com.br').id
    } catch (_) {}
    try {
      fernandaId = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'fernanda@delfosengenharia.com.br',
      ).id
    } catch (_) {}

    const tecManutencao = 'Lucas Gabriel Zanin'
    const tecLimpeza = 'Diego Fernandes'
    const tecProjeto = 'Eng. Mateus Fontana'
    const tecInstalacao = 'Marcos Vinícius Silveira'

    // Definição dos 6 clientes solicitados:
    // 1. Ricardo Alves (Erechim/RS) - Sem plano (Oportunidade)
    // 2. Ana Paula Martins (Chapecó/SC) - Sem plano (Oportunidade)
    // 3. Marcelo Becker (Passo Fundo/RS) - Com serviço avulso em andamento (limpeza avulsa em execução)
    // 4. Cooperativa Agrícola Aurora (Chapecó/SC) - Com serviço avulso em andamento (inspeção termográfica em execução)
    // 5. Frigorífico Lima (Chapecó/SC) - Com plano O&M ativo (Completo)
    // 6. Maria Santos - Mercado Santos (Erechim/RS) - Com plano O&M ativo (Prevenção)

    // A) Inserir ou atualizar os dois novos clientes para garantir os 6 clientes
    // Cliente 3 (Marcelo Becker)
    let marceloId = 'cli_marcelo_becker_01'
    try {
      const rec = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      marceloId = rec.id
    } catch (_) {
      try {
        const c = new Record(clientesCol)
        c.set('nome', 'Marcelo Becker')
        c.set('nome_fantasia', 'Fazenda Três Palmeiras')
        c.set('razao_social', 'Marcelo Becker Agropecuária')
        c.set('cpf', '412.589.630-18')
        c.set('email', 'marcelo.becker@fazenda3palmeiras.com.br')
        c.set('telefone', '(54) 99712-8844')
        c.set('endereco', 'Linha São João, Km 12')
        c.set('numero', 'S/N')
        c.set('bairro', 'Zona Rural')
        c.set('cidade', 'Passo Fundo/RS')
        c.set('estado', 'RS')
        c.set('cep', '99080-000')
        c.set('contato', 'Marcelo Becker (Proprietário)')
        c.set('status', 'Fechado')
        c.set('produto', 'Energia Solar')
        c.set('potencia_kwp', 28.5)
        c.set('valor_estimado', 125000)
        c.set('uc', '4091823719')
        c.set('data_instalacao', '2024-05-18 10:00:00.000Z')
        c.set('telhado_tipo', 'metalico')
        c.set('placas_marca', 'Canadian Solar 450W')
        c.set('placas_qtd', 64)
        c.set('inversor_marca', 'Growatt')
        c.set('inversor_modelo', 'Growatt MAX 30KTL3-X LV')
        app.save(c)
        marceloId = c.id
      } catch (e) {
        console.log('Erro ao criar cliente Marcelo:', e)
      }
    }

    // Criar sistema do Marcelo Becker se não existir
    try {
      app.findFirstRecordByData('sistemas', 'cliente_id', marceloId)
    } catch (_) {
      try {
        const sis = new Record(sistemasCol)
        sis.set('cliente_id', marceloId)
        sis.set('potencia_total_kwp', 28.5)
        sis.set('quantidade_modulos', 64)
        sis.set('fabricante_modulos', 'Canadian Solar')
        sis.set('modelo_modulos', 'CS3W-450MS 450Wp')
        sis.set('fabricante_inversores', 'Growatt')
        sis.set('modelo_inversores', 'Growatt MAX 30KTL3-X')
        sis.set('tipo_telhado', 'metalico')
        sis.set('numero_uc', '4091823719')
        sis.set('geracao_media_mensal_kwh', 3560)
        sis.set('data_instalacao', '2024-05-18 10:00:00.000Z')
        sis.set('padrao_entrada', 'RIC BT Categoria C3')
        sis.set('tipo_atendimento', 'aéreo')
        sis.set('numero_fases', 'trifásico')
        sis.set('amperagem_disjuntor', '80 A')
        app.save(sis)
      } catch (_) {}
    }

    // Cliente 4 (Cooperativa Aurora Agro)
    let cooperativaId = 'cli_cooperativa_aurora_01'
    try {
      const rec = app.findFirstRecordByData('clientes', 'nome', 'Cooperativa Agrícola Aurora')
      cooperativaId = rec.id
    } catch (_) {
      try {
        const c = new Record(clientesCol)
        c.set('nome', 'Cooperativa Agrícola Aurora')
        c.set('nome_fantasia', 'Unidade de Grãos Aurora')
        c.set('razao_social', 'Cooperativa Central Agrícola Aurora LTDA')
        c.set('cnpj', '82.910.456/0002-19')
        c.set('inscricao_estadual', '258.910.334')
        c.set('email', 'operacoes@coopaurora.com.br')
        c.set('telefone', '(49) 3328-9000')
        c.set('endereco', 'Rodovia SC-480, Km 15')
        c.set('numero', 'Km 15')
        c.set('bairro', 'Distrito Agroindustrial')
        c.set('cidade', 'Chapecó/SC')
        c.set('estado', 'SC')
        c.set('cep', '89815-000')
        c.set('contato', 'Eng. Guilherme Fontes')
        c.set('status', 'Fechado')
        c.set('produto', 'Energia Solar')
        c.set('potencia_kwp', 120.0)
        c.set('valor_estimado', 510000)
        c.set('uc', '7019283741')
        c.set('data_instalacao', '2024-08-10 10:00:00.000Z')
        c.set('telhado_tipo', 'metalico')
        c.set('placas_marca', 'JA Solar 550W')
        c.set('placas_qtd', 220)
        c.set('inversor_marca', 'Huawei')
        c.set('inversor_modelo', 'Huawei SUN2000-100KTL-M2')
        app.save(c)
        cooperativaId = c.id
      } catch (e) {
        console.log('Erro ao criar Cooperativa Aurora:', e)
      }
    }

    // Criar sistema da Cooperativa Aurora se não existir
    try {
      app.findFirstRecordByData('sistemas', 'cliente_id', cooperativaId)
    } catch (_) {
      try {
        const sis = new Record(sistemasCol)
        sis.set('cliente_id', cooperativaId)
        sis.set('potencia_total_kwp', 120.0)
        sis.set('quantidade_modulos', 220)
        sis.set('fabricante_modulos', 'JA Solar')
        sis.set('modelo_modulos', 'JAM72S30-550/MR 550Wp')
        sis.set('fabricante_inversores', 'Huawei')
        sis.set('modelo_inversores', 'Huawei SUN2000-100KTL-M2')
        sis.set('tipo_telhado', 'metalico')
        sis.set('numero_uc', '7019283741')
        sis.set('geracao_media_mensal_kwh', 15000)
        sis.set('data_instalacao', '2024-08-10 10:00:00.000Z')
        sis.set('padrao_entrada', 'RIC MT Cabine Primária')
        sis.set('tipo_atendimento', 'subterrâneo')
        sis.set('numero_fases', 'trifásico')
        sis.set('amperagem_disjuntor', '200 A')
        app.save(sis)
      } catch (_) {}
    }

    // IDs dos clientes existentes
    const ricardoId = 'm81l8oixqbpglmv' // Ricardo Alves (Sem plano)
    const anaPaulaId = 'f3eass5h5tg8wli' // Ana Paula Martins (Sem plano)
    const frigorificoId = 'vtszbseb345heif' // Carlos Alberto Lima (Com plano Ativo)
    const mercadoSantosId = 'pp4572amhvqgm81' // Maria Santos (Com plano Ativo)

    // Garantir que Marcelo Becker e Cooperativa Aurora NÃO possuam contrato O&M ativo para que seu status principal seja "com serviço avulso em andamento"
    try {
      const contratosDel = app.findRecordsByFilter(
        'contratos_om',
        `cliente_id='${marceloId}' || cliente_id='${cooperativaId}'`,
        '',
        10,
        0,
      )
      for (const cd of contratosDel) {
        app.delete(cd)
      }
    } catch (_) {}

    // B) Semear Serviços Avulsos em andamento para Marcelo Becker e Cooperativa Aurora
    // 1. Marcelo Becker: Limpeza avulsa em execução
    try {
      const existing = app.findRecordsByFilter(
        'servicos_adicionais_om',
        `cliente_id='${marceloId}' && status='em execução'`,
        '',
        1,
        0,
      )
      if (existing.length === 0) {
        const s = new Record(adicionaisCol)
        s.set('cliente_id', marceloId)
        s.set('tipo', 'limpeza_avulsa')
        s.set(
          'descricao',
          'Limpeza avulsa pós-colheita dos 64 módulos solares com água desmineralizada e escova rotativa',
        )
        s.set('valor', 650)
        s.set('status', 'em execução')
        s.set('data', '2026-03-08 08:30:00.000Z')
        s.set('tecnico_nome', tecLimpeza)
        app.save(s)
      }
    } catch (e) {
      console.log('Erro ao semear servico avulso Marcelo:', e)
    }

    // 2. Cooperativa Aurora: Inspeção termográfica em execução
    try {
      const existing = app.findRecordsByFilter(
        'servicos_adicionais_om',
        `cliente_id='${cooperativaId}' && status='em execução'`,
        '',
        1,
        0,
      )
      if (existing.length === 0) {
        const s = new Record(adicionaisCol)
        s.set('cliente_id', cooperativaId)
        s.set('tipo', 'inspecao_termografica')
        s.set(
          'descricao',
          'Inspeção termográfica de conformidade e detecção de pontos quentes em 220 módulos industriais',
        )
        s.set('valor', 1400)
        s.set('status', 'em execução')
        s.set('data', '2026-03-09 10:00:00.000Z')
        s.set('tecnico_nome', tecProjeto)
        app.save(s)
      }
    } catch (e) {
      console.log('Erro ao semear servico avulso Cooperativa:', e)
    }

    // C) SEMEAR HISTÓRICO COMPLETO EM ATIVIDADES PARA OS 6 CLIENTES
    // Desde o lead inicial, proposta, visita, projeto, até O&M e momento atual
    const timelineSeeds = [
      // ==========================================
      // 1. RICARDO ALVES (Sem plano - Oportunidade)
      // ==========================================
      {
        cliente_id: ricardoId,
        tipo: 'contato_ligacao',
        titulo: 'Primeiro contato - Lead pelo site',
        descricao:
          'Cliente entrou em contato buscando reduzir custo da fatura de R$ 980,00/mês na residência. Solicitou simulação de economia.',
        data: '2024-03-05 14:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: ricardoId,
        tipo: 'reuniao_presencial',
        titulo: 'Visita técnica no telhado',
        descricao:
          'Vistoria no telhado de laje plana. Identificada ótima orientação para o Norte sem sombras significativas.',
        data: '2024-03-12 10:30:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: 'Carlos Mendes',
      },
      {
        cliente_id: ricardoId,
        tipo: 'proposta',
        titulo: 'Apresentação de proposta solar 10 kWp',
        descricao:
          'Proposta comercial entregue no valor de R$ 47.300,00 com 24 módulos JA Solar e inversor Huawei 10kW.',
        data: '2024-03-18 16:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: ricardoId,
        tipo: 'mudanca_estagio',
        titulo: 'Contrato comercial fechado',
        descricao:
          'Mudança de estágio no funil comercial para "Fechado". Financiamento solar contratado via cooperativa de crédito.',
        data: '2024-04-02 11:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: ricardoId,
        tipo: 'instalacao',
        titulo: 'Instalação e comissionamento concluídos',
        descricao:
          'Instalação elétrica e mecânica finalizada. Conexão vistoriada pela RGE com troca do medidor bidirecional.',
        data: '2024-06-03 17:00:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecInstalacao,
      },
      {
        cliente_id: ricardoId,
        tipo: 'anotacao',
        titulo: 'Oportunidade O&M identificada',
        descricao:
          'Sistema solar completando 2 anos de operação contínua sem nenhum contrato de manutenção ou limpeza periódica registrada.',
        data: '2026-02-10 09:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: ricardoId,
        tipo: 'follow_up',
        titulo: 'Prospecção: Apresentar Plano O&M Essencial',
        descricao:
          'Ligar para Ricardo e apresentar proposta do Plano O&M Essencial (R$ 190/mês) incluindo limpeza anual e monitoramento de falhas.',
        data: '2026-03-15 14:00:00.000Z',
        status: 'pendente',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },

      // ==========================================
      // 2. ANA PAULA MARTINS (Sem plano - Oportunidade)
      // ==========================================
      {
        cliente_id: anaPaulaId,
        tipo: 'contato_ligacao',
        titulo: 'Contato inicial via indicação de arquiteto',
        descricao:
          'Indicação do Arq. Bruno para projeto fotovoltaico de 15 kWp em residência de alto padrão.',
        data: '2024-06-14 11:30:00.000Z',
        status: 'concluida',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        autor: 'Fernanda Lima',
      },
      {
        cliente_id: anaPaulaId,
        tipo: 'proposta',
        titulo: 'Proposta personalizada 15 kWp',
        descricao:
          'Dimensionamento para 36 placas Canadian Solar e inversor Growatt 15kW. Economia média estimada de R$ 1.650/mês.',
        data: '2024-07-02 15:00:00.000Z',
        status: 'concluida',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        autor: 'Fernanda Lima',
      },
      {
        cliente_id: anaPaulaId,
        tipo: 'instalacao',
        titulo: 'Conclusão da montagem em telhado cerâmico',
        descricao:
          'Montagem mecânica com ganchos inox em telha colonial e inversor Growatt conectado à rede Wi-Fi da residência.',
        data: '2024-09-21 16:30:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecInstalacao,
      },
      {
        cliente_id: anaPaulaId,
        tipo: 'anotacao',
        titulo: 'Anotação técnica: Poeira de estrada de chão',
        descricao:
          'Residência próxima a via não pavimentada. Placas acumulam camada visível de pó após 3 meses secos.',
        data: '2026-01-20 14:00:00.000Z',
        status: 'concluida',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        autor: 'Fernanda Lima',
      },
      {
        cliente_id: anaPaulaId,
        tipo: 'contato_reativacao',
        titulo: 'Ofertar Plano O&M Prevenção ou Limpeza Avulsa',
        descricao:
          'Agendar contato telefônico para apresentar vantagens do Plano Prevenção com 2 limpezas anuais inclusas ou agendamento de limpeza avulsa.',
        data: '2026-03-16 10:00:00.000Z',
        status: 'pendente',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        autor: 'Fernanda Lima',
      },

      // ==========================================
      // 3. MARCELO BECKER (Serviço Avulso em Andamento)
      // ==========================================
      {
        cliente_id: marceloId,
        tipo: 'contato_ligacao',
        titulo: 'Primeiro contato - Demanda de bombeamento solar',
        descricao:
          'Cliente procurou a Delfos para alimentar pivô de irrigação e sede da Fazenda Três Palmeiras.',
        data: '2024-02-15 09:00:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: 'Carlos Mendes',
      },
      {
        cliente_id: marceloId,
        tipo: 'instalacao',
        titulo: 'Comissionamento do sistema rural 28.5 kWp',
        descricao:
          'Entrada em operação dos 64 módulos em estrutura metálica com inversor Growatt 30kW.',
        data: '2024-05-18 17:00:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecInstalacao,
      },
      {
        cliente_id: marceloId,
        tipo: 'relatorio_solarview',
        titulo: 'Relatório de geração do 1º ano',
        descricao: 'Sistema gerou 41.200 kWh no primeiro ano, atingindo 108% da meta projetada.',
        data: '2025-05-20 11:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: marceloId,
        tipo: 'contato_ligacao',
        titulo: 'Solicitação de serviço avulso de limpeza',
        descricao:
          'Cliente ligou informando que a colheita de soja gerou muita poeira sobre os módulos rurais. Contratou serviço avulso de limpeza (R$ 650,00).',
        data: '2026-03-05 15:30:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: marceloId,
        tipo: 'limpeza_manutencao',
        titulo: 'Execução: Limpeza avulsa dos 64 módulos rurais',
        descricao:
          'Ordem de serviço em execução pelo técnico Diego Fernandes. Lavagem com escovação rotativa e conferência visual de fixação.',
        data: '2026-03-08 08:30:00.000Z',
        status: 'pendente',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecLimpeza,
      },

      // ==========================================
      // 4. COOPERATIVA AURORA (Serviço Avulso em Andamento)
      // ==========================================
      {
        cliente_id: cooperativaId,
        tipo: 'reuniao_presencial',
        titulo: 'Reunião comercial de engenharia - Usina 120 kWp',
        descricao:
          'Definição da usina fotovoltaica no telhado do pavilhão de secagem e armazenagem de grãos.',
        data: '2024-04-10 14:00:00.000Z',
        status: 'concluida',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        autor: 'Fernanda Lima',
      },
      {
        cliente_id: cooperativaId,
        tipo: 'instalacao',
        titulo: 'Entrega técnica da usina de 120 kWp',
        descricao:
          '220 módulos JA Solar conectados à cabine primária da cooperativa em tensão média.',
        data: '2024-08-10 16:00:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecInstalacao,
      },
      {
        cliente_id: cooperativaId,
        tipo: 'anotacao',
        titulo: 'Exigência da seguradora industrial',
        descricao:
          'Seguradora Zurich solicitou laudo de termografia aérea anual para renovação da apólice patrimonial da cooperativa.',
        data: '2026-03-02 09:30:00.000Z',
        status: 'concluida',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        autor: 'Fernanda Lima',
      },
      {
        cliente_id: cooperativaId,
        tipo: 'limpeza_manutencao',
        titulo: 'Execução: Inspeção termográfica dos 220 módulos',
        descricao:
          'Ordem de serviço avulsa em andamento com o Eng. Mateus Fontana. Voo com câmera térmica FLIR para emissão de laudo técnico (R$ 1.400,00).',
        data: '2026-03-09 10:00:00.000Z',
        status: 'pendente',
        responsavel_id: fernandaId,
        responsavel_nome: 'Fernanda Lima',
        autor: tecProjeto,
      },

      // ==========================================
      // 5. FRIGORÍFICO LIMA (Plano O&M Ativo - Completo)
      // ==========================================
      {
        cliente_id: frigorificoId,
        tipo: 'contato_ligacao',
        titulo: 'Primeiro contato - Demanda de alta potência',
        descricao: 'Diretoria do Frigorífico solicitou estudo para 75 kWp em laje industrial.',
        data: '2024-10-10 10:00:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: 'Carlos Mendes',
      },
      {
        cliente_id: frigorificoId,
        tipo: 'instalacao',
        titulo: 'Comissionamento usina Frigorífico 75 kWp',
        descricao: 'Instalação completa e vistoriada com inversor Huawei SUN2000-75KTL.',
        data: '2025-02-08 17:00:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecInstalacao,
      },
      {
        cliente_id: frigorificoId,
        tipo: 'proposta',
        titulo: 'Contratação do Plano O&M Completo',
        descricao:
          'Assinatura do contrato de O&M Completo no valor de R$ 1.450/mês cobrindo monitoramento diário, limpezas semestrais e manutenções preventivas.',
        data: '2025-08-01 10:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: frigorificoId,
        tipo: 'limpeza_manutencao',
        titulo: 'O&M: Limpeza semestral dos 200 módulos na laje',
        descricao:
          'Serviço do plano realizado pela equipe com água desmineralizada e detergente neutro para fotovoltaico.',
        data: '2026-01-15 08:30:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecLimpeza,
      },
      {
        cliente_id: frigorificoId,
        tipo: 'garantia_equipamento',
        titulo: 'Anomalia ANO-2026-004: Ponto quente detectado',
        descricao:
          'Telemetria identificou desvio térmico na string 4. Diagnóstico in loco agendado com substituição de conectores.',
        data: '2026-03-04 14:15:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecProjeto,
      },
      {
        cliente_id: frigorificoId,
        tipo: 'limpeza_manutencao',
        titulo: 'O&M: Inspeção termográfica e reaperto em média tensão',
        descricao:
          'Próximo atendimento programado do plano completo: revisão de quadros da subestação e curvas I-V.',
        data: '2026-03-18 09:00:00.000Z',
        status: 'pendente',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecProjeto,
      },

      // ==========================================
      // 6. MERCADO SANTOS (Plano O&M Ativo - Prevenção)
      // ==========================================
      {
        cliente_id: mercadoSantosId,
        tipo: 'contato_ligacao',
        titulo: 'Primeiro contato - Faturas elevadas do comércio',
        descricao:
          'Maria Santos buscou alternativa para os R$ 2.400/mês gastos com câmaras frias no mercado.',
        data: '2023-11-20 15:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: mercadoSantosId,
        tipo: 'instalacao',
        titulo: 'Instalação comercial 12 kWp concluída',
        descricao:
          '30 módulos Canadian Solar montados em telhado metálico e inversor Fronius Symo 12kW com datalogger Solar.web.',
        data: '2024-03-15 16:00:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecInstalacao,
      },
      {
        cliente_id: mercadoSantosId,
        tipo: 'proposta',
        titulo: 'Contratação do Plano O&M Prevenção',
        descricao:
          'Contratação anual do Plano O&M Prevenção (R$ 450/mês) garantindo monitoramento e limpeza técnica anual.',
        data: '2025-09-10 10:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'João Delfos',
      },
      {
        cliente_id: mercadoSantosId,
        tipo: 'relatorio_solarview',
        titulo: 'O&M: Relatório mensal de desempenho de Fevereiro',
        descricao: 'Geração atingiu 1.480 kWh. Economia acumulada no ano de R$ 3.120,00.',
        data: '2026-03-02 14:00:00.000Z',
        status: 'concluida',
        responsavel_id: joaoId,
        responsavel_nome: 'João Victor Bagetti Fuchs',
        autor: 'Sistema Delfos O&M',
      },
      {
        cliente_id: mercadoSantosId,
        tipo: 'garantia_equipamento',
        titulo: 'Anomalia ANO-2026-002: Falha de aterramento intermitente',
        descricao:
          'Alerta remoto State Code 509 Fronius registrado em dias chuvosos. Triagem remota em andamento.',
        data: '2026-03-06 08:20:00.000Z',
        status: 'concluida',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecManutencao,
      },
      {
        cliente_id: mercadoSantosId,
        tipo: 'limpeza_manutencao',
        titulo: 'O&M: Reaperto preventivo de conectores e teste de isolação',
        descricao:
          'Visita preventiva agendada para reaperto de grampos e teste de isolamento de aterramento com megôhmetro.',
        data: '2026-03-28 13:30:00.000Z',
        status: 'pendente',
        responsavel_id: carlosId,
        responsavel_nome: 'Carlos Mendes',
        autor: tecManutencao,
      },
    ]

    for (const item of timelineSeeds) {
      try {
        const found = app.findRecordsByFilter(
          'atividades',
          `cliente_id='${item.cliente_id}' && titulo='${item.titulo.replace(/'/g, "\\'")}'`,
          'created',
          1,
          0,
        )
        if (found && found.length > 0) continue
      } catch (_) {}

      try {
        const rec = new Record(atividadesCol)
        rec.set('cliente_id', item.cliente_id)
        rec.set('tipo', item.tipo)
        rec.set('titulo', item.titulo)
        rec.set('descricao', item.descricao)
        rec.set('data', item.data)
        rec.set('status', item.status)
        if (item.responsavel_id) rec.set('responsavel_id', item.responsavel_id)
        if (item.responsavel_nome) rec.set('responsavel_nome', item.responsavel_nome)
        rec.set('autor', item.autor)
        app.save(rec)
      } catch (err) {
        console.log('Erro ao salvar atividade seed:', item.titulo, err)
      }
    }
  },
  (app) => {
    // Reversão opcional se necessário
  },
)

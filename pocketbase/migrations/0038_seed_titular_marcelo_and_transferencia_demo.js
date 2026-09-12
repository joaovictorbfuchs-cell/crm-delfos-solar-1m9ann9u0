migrate(
  (app) => {
    // 1. Atualizar dados do titular da UC para Marcelo Becker (id: 9ozpqdm9sgwmdzr)
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      marcelo.set('titular_nome', 'Marcelo Becker')
      marcelo.set('titular_cpf', '412.589.630-18')
      marcelo.set('titular_telefone', '(54) 99712-8844')
      marcelo.set('titular_email', 'marcelo.becker@fazenda3palmeiras.com.br')
      app.save(marcelo)
    } catch (e) {
      console.log('Erro ao atualizar titular de Marcelo Becker:', e)
    }

    // 2. Garantir que a proposta de Marcelo Becker (Revisão 2 ou Revisão 3) esteja com status 'Aprovado' / 'aprovada'
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      const orcamentos = app.findRecordsByFilter(
        'orcamentos_solar',
        `cliente_id='${marcelo.id}'`,
        '-numero_revisao',
        5,
        0,
      )

      if (orcamentos.length > 0) {
        // Encontrar a revisão mais alta ou a revisão 2
        const revAprovar = orcamentos[0]
        revAprovar.set('status', 'Aprovado')
        revAprovar.set('status_revisao', 'aprovada')
        app.save(revAprovar)
      }
    } catch (e) {
      console.log('Erro ao atualizar status de proposta de Marcelo Becker:', e)
    }

    // 3. Garantir que exista um projeto para Marcelo Becker na tabela 'projetos'
    // para que a aba de projetos do cliente exiba seu projeto operacional
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      let projMarcelo = null
      try {
        projMarcelo = app.findFirstRecordByData('projetos', 'cliente_id', marcelo.id)
      } catch (_) {}

      if (!projMarcelo) {
        const projCol = app.findCollectionByNameOrId('projetos')
        const newProj = new Record(projCol)
        newProj.set('cliente_id', marcelo.id)
        newProj.set('etapa', 'Elaboração de Projeto')
        newProj.set('potencia_kwp', 28.5)
        newProj.set('cidade', 'Passo Fundo/RS')
        newProj.set('profissional_nome', 'Eng. Mateus Fontana')
        newProj.set(
          'observacoes',
          'Projeto executivo de usina rural 28.5 kWp com homologação RGE e documentação técnica em andamento.',
        )
        app.save(newProj)

        // Criar evento de projeto
        const eventosCol = app.findCollectionByNameOrId('projeto_eventos')
        const ev1 = new Record(eventosCol)
        ev1.set('projeto_id', newProj.id)
        ev1.set('etapa_anterior', 'Levantamento de Informações')
        ev1.set('etapa_nova', 'Elaboração de Projeto')
        ev1.set('profissional_nome', 'Eng. Mateus Fontana')
        ev1.set('autor', 'Eng. Mateus Fontana')
        ev1.set('data', '2026-03-10 14:00:00.000Z')
        ev1.set(
          'descricao',
          'Proposta aprovada pelo cliente. Início da elaboração dos anexos técnicos e contrato.',
        )
        app.save(ev1)
      }
    } catch (e) {
      console.log('Erro ao garantir projeto para Marcelo Becker:', e)
    }

    // 4. Semear pelo menos uma transferência de créditos de demonstração para Marcelo Becker
    try {
      const marcelo = app.findFirstRecordByData('clientes', 'nome', 'Marcelo Becker')
      const transfCol = app.findCollectionByNameOrId('transferencias_creditos')

      const existingTransf = app.findRecordsByFilter(
        'transferencias_creditos',
        `cliente_origem_id='${marcelo.id}'`,
        'created',
        1,
        0,
      )

      if (existingTransf.length === 0) {
        // Encontrar outro cliente para destino ou usar nome descritivo
        let destinoId = ''
        try {
          const outroCliente = app.findFirstRecordByData('clientes', 'nome', 'Cooperativa Aurora')
          destinoId = outroCliente.id
        } catch (_) {}

        const transfRec = new Record(transfCol)
        transfRec.set('cliente_origem_id', marcelo.id)
        transfRec.set('cliente_origem_nome', marcelo.get('nome'))
        if (destinoId) {
          transfRec.set('cliente_destino_id', destinoId)
        }
        transfRec.set('cliente_destino_nome', 'Fazenda Três Palmeiras - Sede Administrativa')
        transfRec.set('uc_destino', '3098124501')
        transfRec.set('quantidade_creditos', 1200) // 1.200 kWh/mês
        transfRec.set('data_solicitacao', '2026-03-15 10:30:00.000Z')
        transfRec.set('status', 'Homologada')
        transfRec.set('protocolo_concessionaria', 'RGE-2026-TR88921')
        transfRec.set(
          'observacoes',
          'Rateio de excedente de geração da usina de 28.5 kWp (UC Geradora 4091823719) para a UC da Sede Administrativa.',
        )
        app.save(transfRec)

        // Registrar também na Linha do Tempo Unificada do cliente (tabela atividades)
        const ativCol = app.findCollectionByNameOrId('atividades')
        const ativ = new Record(ativCol)
        ativ.set('cliente_id', marcelo.id)
        ativ.set('tipo', 'anotacao')
        ativ.set('titulo', 'Transferência de Créditos: 1.200 kWh/mês')
        ativ.set(
          'descricao',
          'Solicitação de transferência de créditos aprovada na concessionária RGE. Origem: Marcelo Becker (UC 4091823719) → Destino: Fazenda Três Palmeiras - Sede Administrativa (UC 3098124501). Quantidade: 1.200 kWh/mês. Protocolo: RGE-2026-TR88921. Status: Homologada.',
        )
        ativ.set('data', '2026-03-15 10:30:00.000Z')
        ativ.set('autor', 'Pós-Venda Delfos')
        ativ.set('status', 'concluida')
        app.save(ativ)
      }
    } catch (e) {
      console.log('Erro ao semear transferência de créditos:', e)
    }
  },
  (app) => {
    // Reversão
  },
)

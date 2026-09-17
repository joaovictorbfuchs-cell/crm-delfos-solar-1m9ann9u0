migrate(
  (app) => {
    const colClientes = app.findCollectionByNameOrId('clientes')
    const colContratos = app.findCollectionByNameOrId('contratos_om')

    // Lista dos 34 contratos ATIVOS extraídos do PDF
    const contratosPDF = [
      {
        numero: '89',
        cliente: 'Alisson Monteiro',
        data_inicio: '2026-08-28',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-07-28',
        valor_mensal: 99.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '57',
        cliente: 'Antonio Luiz Serraglio',
        data_inicio: '2025-09-02',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-08-09',
        valor_mensal: 125.77,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '82',
        cliente: 'AUTO ELETRICA ERECHIM',
        data_inicio: '2026-07-27',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-27',
        valor_mensal: 109.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '76',
        cliente: 'Bem Estar Móveis',
        data_inicio: '2026-05-10',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-05-12',
        valor_mensal: 159.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '63',
        cliente: 'Carlos Ortiz',
        data_inicio: '2025-11-10',
        proximo_vencimento: '2026-10-10',
        data_termino: '2026-10-10',
        valor_mensal: 99.9,
        situacao: 'Próximo do término',
        proximo_termino: true,
      },
      {
        numero: '73',
        cliente: 'CASSUL DISTRIB DE PROD AGROPECS LTDA',
        data_inicio: '2026-06-05',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-05-05',
        valor_mensal: 110.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '62',
        cliente: 'CASSUL - DISTRIBUIDORA DE PRODUTOS AGROPECUARIOS LTDA',
        data_inicio: '2025-11-01',
        proximo_vencimento: '2026-10-10',
        data_termino: '2026-10-10',
        valor_mensal: 858.0,
        situacao: 'Próximo do término',
        proximo_termino: true,
      },
      {
        numero: '86',
        cliente: 'Clóvis Meneguel',
        data_inicio: '2026-08-12',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-07-12',
        valor_mensal: 192.86,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '37',
        cliente: 'Edson Luiz Goral Pagliosa',
        data_inicio: '2024-11-06',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-01-07',
        valor_mensal: 99.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '88',
        cliente: 'Geison Luis Rigo',
        data_inicio: '2026-09-01',
        proximo_vencimento: '2026-10-01',
        data_termino: '2027-08-01',
        valor_mensal: 107.23,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '72',
        cliente: 'GERVEJARIA GURI & KIGELO',
        data_inicio: '2026-05-29',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-04-29',
        valor_mensal: 529.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '65',
        cliente: 'Gleison Szady da Luz',
        data_inicio: '2026-01-27',
        proximo_vencimento: '2026-10-10',
        data_termino: '2026-12-30',
        valor_mensal: 49.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '67',
        cliente: 'Gustavo Camerini',
        data_inicio: '2026-04-10',
        proximo_vencimento: '2026-09-20',
        data_termino: '2027-03-10',
        valor_mensal: 240.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '84',
        cliente: 'Hauschild Agro Florestal LTDA',
        data_inicio: '2026-07-27',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-27',
        valor_mensal: 318.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '60',
        cliente: 'Laudir da Silva Reis - IRONES MARIA CEOLIN REIS',
        data_inicio: '2025-09-23',
        proximo_vencimento: '2026-09-30',
        data_termino: '2027-08-23',
        valor_mensal: 99.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '80',
        cliente: 'Lindoia Guinchos Ltda',
        data_inicio: '2026-07-21',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-21',
        valor_mensal: 185.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '69',
        cliente: 'Loery Valentin Fusinato',
        data_inicio: '2026-04-23',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-03-28',
        valor_mensal: 49.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '75',
        cliente: 'Luciane Brandão',
        data_inicio: '2026-06-12',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-05-12',
        valor_mensal: 108.89,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '64',
        cliente: 'Marcelo Bigolin',
        data_inicio: '2025-11-21',
        proximo_vencimento: '2026-10-10',
        data_termino: '2026-10-21',
        valor_mensal: 295.0,
        situacao: 'Próximo do término',
        proximo_termino: true,
      },
      {
        numero: '24',
        cliente: 'Mauro Antônio Serraglio',
        data_inicio: '2024-08-08',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-07-10',
        valor_mensal: 116.6,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '77',
        cliente: 'Mauro Antônio Serraglio',
        data_inicio: '2026-06-23',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-05-23',
        valor_mensal: 111.3,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '83',
        cliente: 'MOVEIS DAL PRA',
        data_inicio: '2026-07-27',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-27',
        valor_mensal: 85.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '87',
        cliente: 'PANIFICADORA GARCIA',
        data_inicio: '2026-08-13',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-09-06',
        valor_mensal: 726.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '71',
        cliente: 'PAULO RICARDO ZANELLA',
        data_inicio: '2026-05-28',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-04-30',
        valor_mensal: 141.85,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '10',
        cliente: 'Pedrinho Spassini',
        data_inicio: '2024-05-31',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-09-30',
        valor_mensal: 81.33,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '81',
        cliente: 'RAMPI AUTO PECAS LTDA',
        data_inicio: '2026-07-27',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-24',
        valor_mensal: 170.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '68',
        cliente: 'RAVENA BEACH',
        data_inicio: '2026-04-15',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-03-15',
        valor_mensal: 129.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '85',
        cliente: 'Renan Hlavac Badalotti',
        data_inicio: '2026-07-27',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-27',
        valor_mensal: 183.23,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '52',
        cliente: 'SILVIA LUISA TESSARO',
        data_inicio: '2025-07-01',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-27',
        valor_mensal: 310.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '74',
        cliente: 'System Sistemas de Gestão',
        data_inicio: '2026-06-05',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-05-05',
        valor_mensal: 280.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '66',
        cliente: 'Vagner Rovani',
        data_inicio: '2026-02-24',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-01-31',
        valor_mensal: 137.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '70',
        cliente: 'Valdemar Gaz',
        data_inicio: '2026-05-28',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-04-30',
        valor_mensal: 57.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '78',
        cliente: 'Valdir Farina',
        data_inicio: '2026-06-11',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-07-07',
        valor_mensal: 225.0,
        situacao: 'Ativo',
        proximo_termino: false,
      },
      {
        numero: '79',
        cliente: 'Volmir Jair Fusinato (LYON)',
        data_inicio: '2026-06-10',
        proximo_vencimento: '2026-10-10',
        data_termino: '2027-06-10',
        valor_mensal: 69.9,
        situacao: 'Ativo',
        proximo_termino: false,
      },
    ]

    // Função auxiliar para encontrar cliente por aproximação ou nome exato
    const encontrarOuCriarCliente = (nomeCompleto) => {
      // 1. Tentar nome exato
      try {
        const c1 = app.findFirstRecordByData('clientes', 'nome', nomeCompleto)
        if (c1) return c1
      } catch (_) {}

      // 2. Extrair primeiro termo e tentar buscar por filtro
      const primeiroNome = nomeCompleto.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '')
      if (primeiroNome && primeiroNome.length >= 3) {
        try {
          const res = app.findRecordsByFilter(
            'clientes',
            "nome ~ '" + primeiroNome + "'",
            '-created',
            10,
            0,
          )
          if (res && res.length > 0) {
            // Procurar melhor casamento
            for (let i = 0; i < res.length; i++) {
              const r = res[i]
              const rNome = r.getString('nome').toLowerCase()
              const target = nomeCompleto.toLowerCase()
              if (
                rNome === target ||
                target.indexOf(rNome) !== -1 ||
                rNome.indexOf(target) !== -1
              ) {
                return r
              }
            }
            return res[0]
          }
        } catch (_) {}
      }

      // 3. Se não encontrar, criar cliente com nome do contrato
      const novoCliente = new Record(colClientes)
      novoCliente.set('nome', nomeCompleto)
      novoCliente.set('cidade', 'Erechim')
      novoCliente.set('estado', 'RS')
      novoCliente.set('status', 'Fechado')
      novoCliente.set('produto', 'Plano de O&M')
      novoCliente.set('transferido_pos_vendas', true)
      novoCliente.set(
        'observacoes',
        'Cadastrado automaticamente via atualização de contratos O&M PDF.',
      )
      app.save(novoCliente)
      return novoCliente
    }

    // Processar cada um dos 34 contratos
    for (let i = 0; i < contratosPDF.length; i++) {
      const item = contratosPDF[i]
      const numContrato = item.numero

      // 1. Verificar se já existe contrato com este numero_contrato
      let contratoRec = null
      try {
        contratoRec = app.findFirstRecordByData('contratos_om', 'numero_contrato', numContrato)
      } catch (_) {}

      // Se não encontrou pelo número exato, tentar localizar por formato legado "nº X" ou "CT-X"
      if (!contratoRec) {
        try {
          const recsNum = app.findRecordsByFilter(
            'contratos_om',
            "numero_contrato = 'nº " +
              numContrato +
              "' || numero_contrato = 'CT-" +
              numContrato +
              "' || numero_contrato = 'OM-" +
              numContrato +
              "'",
            '-created',
            1,
            0,
          )
          if (recsNum && recsNum.length > 0) {
            contratoRec = recsNum[0]
          }
        } catch (_) {}
      }

      // Encontrar ou associar o cliente
      let clienteRec = null
      if (contratoRec && contratoRec.getString('cliente_id')) {
        try {
          clienteRec = app.findFirstRecordByData(
            'clientes',
            'id',
            contratoRec.getString('cliente_id'),
          )
        } catch (_) {}
      }

      if (!clienteRec) {
        clienteRec = encontrarOuCriarCliente(item.cliente)
      }

      // Se não encontrou o contrato pelo número, verificar se o cliente já tem algum contrato legado
      if (!contratoRec && clienteRec) {
        try {
          const recsCliente = app.findRecordsByFilter(
            'contratos_om',
            "cliente_id = '" + clienteRec.id + "'",
            '-created',
            5,
            0,
          )
          // Se houver contrato do cliente sem número definido ou com número parecido
          if (recsCliente && recsCliente.length > 0) {
            contratoRec = recsCliente[0]
          }
        } catch (_) {}
      }

      // Se ainda não existir registro, criar um novo
      if (!contratoRec) {
        contratoRec = new Record(colContratos)
      }

      // Converter datas para formato ISO compatível PocketBase
      const dtInicioISO = new Date(item.data_inicio + 'T12:00:00.000Z').toISOString()
      const dtVencISO = new Date(item.data_termino + 'T12:00:00.000Z').toISOString()
      const dtProxVencISO = new Date(item.proximo_vencimento + 'T12:00:00.000Z').toISOString()

      // Definir status: contratos com "Próximo do término" ganham status 'Vencendo em 30 dias'
      const statusFinal = item.proximo_termino ? 'Vencendo em 30 dias' : 'Ativo'

      // Definir plano O&M com base no valor ou manter se já existir
      let planoFinal = contratoRec.getString('plano')
      if (!planoFinal || planoFinal === '') {
        if (item.valor_mensal >= 300) {
          planoFinal = 'Completo'
        } else if (item.valor_mensal >= 150) {
          planoFinal = 'Prevenção'
        } else {
          planoFinal = 'Essencial'
        }
      }

      contratoRec.set('cliente_id', clienteRec.id)
      contratoRec.set('numero_contrato', numContrato)
      contratoRec.set('plano', planoFinal)
      contratoRec.set('status', statusFinal)
      contratoRec.set('status_encerramento', 'vigente')
      contratoRec.set('data_encerramento', '')
      contratoRec.set('motivo_encerramento', '')
      contratoRec.set('observacoes_encerramento', '')
      contratoRec.set('valor_mensal', item.valor_mensal)
      contratoRec.set('valor_anual', Math.round(item.valor_mensal * 12 * 100) / 100)
      contratoRec.set('data_inicio', dtInicioISO)
      contratoRec.set('data_vencimento', dtVencISO)

      const obsTexto =
        'Contrato O&M nº ' +
        numContrato +
        ' importado/sincronizado do PDF oficial. Próximo vencimento da parcela: ' +
        item.proximo_vencimento.split('-').reverse().join('/') +
        '. Situação no relatório: ' +
        item.situacao +
        '.'
      contratoRec.set('observacoes', obsTexto)

      // Se não tiver próxima atividade agendada, cadastrar sugestão padrão
      if (!contratoRec.getString('proxima_atividade_data')) {
        contratoRec.set('proxima_atividade_data', dtProxVencISO)
        contratoRec.set(
          'proxima_atividade_titulo',
          item.proximo_termino
            ? 'Renovação e revisão preventiva final (término em breve)'
            : 'Revisão periódica preventiva e monitoramento O&M',
        )
      }

      app.save(contratoRec)

      // Garantir que o cliente associado esteja com status Fechado e transferido_pos_vendas
      if (clienteRec) {
        let mudou = false
        if (clienteRec.getString('status') !== 'Fechado') {
          clienteRec.set('status', 'Fechado')
          mudou = true
        }
        if (!clienteRec.getBool('transferido_pos_vendas')) {
          clienteRec.set('transferido_pos_vendas', true)
          mudou = true
        }
        if (mudou) {
          app.save(clienteRec)
        }
      }
    }
  },
  (app) => {
    // Reversão segura: não remove contratos para preservar integridade
  },
)

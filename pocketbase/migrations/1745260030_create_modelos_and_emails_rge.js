migrate(
  (app) => {
    // 1. Criar a coleção modelos_email_rge
    let colModelos
    try {
      colModelos = app.findCollectionByNameOrId('modelos_email_rge')
    } catch (_) {
      colModelos = new Collection({
        name: 'modelos_email_rge',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'tipo', type: 'text' },
          { name: 'assunto', type: 'text' },
          { name: 'texto', type: 'text', required: true },
          { name: 'email_destino', type: 'text' },
          { name: 'is_padrao', type: 'bool' },
          { name: 'ordem', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_modelos_email_rge_nome ON modelos_email_rge (nome)'],
      })
      app.save(colModelos)
    }

    // 2. Criar a coleção emails_rge (lista de e-mails gerenciáveis)
    let colEmails
    try {
      colEmails = app.findCollectionByNameOrId('emails_rge')
    } catch (_) {
      colEmails = new Collection({
        name: 'emails_rge',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'email', type: 'text', required: true },
          { name: 'rotulo', type: 'text' },
          { name: 'descricao', type: 'text' },
          { name: 'is_padrao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_emails_rge_email ON emails_rge (email)'],
      })
      app.save(colEmails)
    }

    // 3. Semear os 3 modelos iniciais (todos configuráveis / editáveis)
    try {
      const targetCol = app.findCollectionByNameOrId('modelos_email_rge')

      const textoSolicitarContas = `Prezados,

Venho por meio deste solicitar o envio das faturas/contas de energia elétrica dos últimos 5 (cinco) anos, referentes à Unidade Consumidora de número [número da UC], localizada em [endereço da UC].

Os dados do titular/consumidor são:
Nome: [nome do cliente]
CPF/CNPJ: [CPF/CNPJ]
Endereço: [endereço da UC]

Segue em anexo a procuração/autorização e demais documentos necessários para a solicitação.

Desde já, agradeço a atenção e coloco-me à disposição para quaisquer esclarecimentos.

Atenciosamente,
[nome do responsável]
[cargo do responsável]
Delfos Engenharia Ltda
[telefone Delfos] | [email Delfos]
www.delfosengenharia.com.br`

      const textoTrocaTitularidade = `Prezados,

Solicitamos por meio deste o procedimento de Troca de Titularidade referente à Unidade Consumidora de número [número da UC], situada em [endereço da UC].

Dados do novo titular:
Nome: [nome do cliente]
CPF/CNPJ: [CPF/CNPJ]
Endereço da UC: [endereço da UC]

Seguem em anexo os documentos comprobatórios de posse/propriedade, documento de identificação com foto do titular e termo/procuração assinado.

Solicitamos a confirmação do protocolo de recebimento e o prazo estimado para conclusão.

Atenciosamente,
[nome do responsável]
[cargo do responsável]
Delfos Engenharia Ltda
[telefone Delfos] | [email Delfos]
www.delfosengenharia.com.br`

      const textoTransferenciaCreditos = `Prezados,

Venho por meio deste solicitar a Transferência de Créditos de Energia Solar entre unidades consumidoras vinculadas ao mesmo titular/grupo de rateio, conforme resolução normativa aplicável.

Unidade Geradora / Origem: [número da UC]
Endereço da Geradora: [endereço da UC]
Titular: [nome do cliente] (CPF/CNPJ: [CPF/CNPJ])

Seguem em anexo a tabela de rateio/compensação com as UCs beneficiárias, percentuais de crédito e procuração autorizativa.

Ficamos à disposição para quaisquer esclarecimentos técnicos adicionais.

Atenciosamente,
[nome do responsável]
[cargo do responsável]
Delfos Engenharia Ltda
[telefone Delfos] | [email Delfos]
www.delfosengenharia.com.br`

      const modelosIniciais = [
        {
          nome: 'Solicitar contas RGE',
          tipo: 'solicitar_contas_rge',
          assunto: 'Solicitação de faturas de energia — UC [número da UC] — [nome do cliente]',
          texto: textoSolicitarContas,
          email_destino: 'joao@delfosengenharia.com.br',
          is_padrao: true,
          ordem: 1,
        },
        {
          nome: 'Troca de titularidade',
          tipo: 'troca_titularidade',
          assunto: 'Troca de Titularidade — UC [número da UC] — [nome do cliente]',
          texto: textoTrocaTitularidade,
          email_destino: 'joao@delfosengenharia.com.br',
          is_padrao: true,
          ordem: 2,
        },
        {
          nome: 'Transferência de créditos entre unidades consumidoras',
          tipo: 'transferencia_creditos',
          assunto:
            'Transferência de Créditos entre Unidades Consumidoras — UC [número da UC] — [nome do cliente]',
          texto: textoTransferenciaCreditos,
          email_destino: 'joao@delfosengenharia.com.br',
          is_padrao: true,
          ordem: 3,
        },
      ]

      for (const m of modelosIniciais) {
        const existing = app.findRecordsByFilter(
          'modelos_email_rge',
          `nome = '${m.nome.replace(/'/g, "\\'")}'`,
        )
        if (!existing || existing.length === 0) {
          const rec = new Record(targetCol)
          rec.set('nome', m.nome)
          rec.set('tipo', m.tipo)
          rec.set('assunto', m.assunto)
          rec.set('texto', m.texto)
          rec.set('email_destino', m.email_destino)
          rec.set('is_padrao', m.is_padrao)
          rec.set('ordem', m.ordem)
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Aviso ao semear modelos_email_rge:', err)
    }

    // 4. Semear emails iniciais na lista emails_rge
    try {
      const colE = app.findCollectionByNameOrId('emails_rge')
      const emailsIniciais = [
        {
          email: 'joao@delfosengenharia.com.br',
          rotulo: 'João (Delfos Solar)',
          descricao: 'E-mail interno responsável pelos processos da concessionária',
          is_padrao: true,
        },
        {
          email: 'atendimentocomercialrge@cpfl.com.br',
          rotulo: 'Atendimento Comercial RGE / CPFL',
          descricao: 'Canal oficial de atendimento de faturamento da RGE',
          is_padrao: false,
        },
        {
          email: 'delfos.usinas@gmail.com',
          rotulo: 'Delfos Usinas (Geral)',
          descricao: 'Caixa de entrada geral de usinas e projetos',
          is_padrao: false,
        },
      ]

      for (const e of emailsIniciais) {
        const existing = app.findRecordsByFilter(
          'emails_rge',
          `email = '${e.email.replace(/'/g, "\\'")}'`,
        )
        if (!existing || existing.length === 0) {
          const rec = new Record(colE)
          rec.set('email', e.email)
          rec.set('rotulo', e.rotulo)
          rec.set('descricao', e.descricao)
          rec.set('is_padrao', e.is_padrao)
          app.save(rec)
        }
      }
    } catch (err) {
      console.warn('Aviso ao semear emails_rge:', err)
    }
  },
  (app) => {
    try {
      const colModelos = app.findCollectionByNameOrId('modelos_email_rge')
      app.delete(colModelos)
    } catch (_) {}
    try {
      const colEmails = app.findCollectionByNameOrId('emails_rge')
      app.delete(colEmails)
    } catch (_) {}
  },
)

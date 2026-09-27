/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Assegura existência da coleção whatsapp_templates ou busca
    const col = app.findCollectionByNameOrId('whatsapp_templates')
    if (!col) return

    // Verifica se já existe o template de email RGE
    try {
      const existing = app.findRecordsByFilter(
        'whatsapp_templates',
        "slug = 'email_solicitar_contas_rge'",
        '-created',
        1,
      )
      if (existing && existing.length > 0) {
        return
      }
    } catch (_) {}

    const corpoPadraoTexto = `Prezados,

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

    const rec = new Record(col, {
      titulo: 'Solicitação de faturas de energia — UC [número da UC] — [nome do cliente]',
      slug: 'email_solicitar_contas_rge',
      conteudo: corpoPadraoTexto,
      tipo_gatilho: 'email_concessionaria',
      categoria: 'Concessionária / RGE',
      ativo: true,
      variaveis_disponiveis: [
        'número da UC',
        'nome do cliente',
        'CPF/CNPJ',
        'endereço da UC',
        'nome do responsável',
        'cargo do responsável',
        'telefone Delfos',
        'email Delfos',
      ],
    })

    app.save(rec)
  },
  (app) => {
    try {
      const records = app.findRecordsByFilter(
        'whatsapp_templates',
        "slug = 'email_solicitar_contas_rge'",
        '-created',
        1,
      )
      if (records && records.length > 0) {
        app.delete(records[0])
      }
    } catch (_) {}
  },
)

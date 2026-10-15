routerAdd('POST', '/backend/v1/propostas-om/public/{token}', (e) => {
  const token = e.request.pathValue('token')
  if (!token || token.length !== 48) return e.notFoundError('Este link não é válido.')

  let proposal
  try {
    proposal = $app.findFirstRecordByData(
      'propostas_om',
      'link_token_hash',
      $security.sha256(token),
    )
  } catch (_) {
    return e.notFoundError('A proposta não foi encontrada ou o link expirou.')
  }

  const body = e.requestInfo().body || {}
  const nome = String(body.nome || '').trim()
  const documento = String(body.documento || '').replace(/\D/g, '')
  const planoRaw = String(body.plano || '').trim()
  const confirmado = body.confirmado === true
  const planoAlias = ['Essencial', 'Inspeção', 'Completo', 'Prevenção']
  if (nome.length < 3 || nome.length > 160)
    return e.badRequestError('Informe o nome completo do responsável.')
  if (!planoAlias.includes(planoRaw))
    return e.badRequestError('Selecione um dos planos disponíveis.')
  if (!confirmado) return e.badRequestError('Confirme que leu e aceita os termos da proposta.')

  const validarCpf = (cpf) => {
    if (!/^\d{11}$/.test(cpf) || /^([0-9])\1{10}$/.test(cpf)) return false
    let soma = 0
    for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i)
    let digito = (soma * 10) % 11
    if (digito === 10) digito = 0
    if (digito !== Number(cpf[9])) return false
    soma = 0
    for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i)
    digito = (soma * 10) % 11
    if (digito === 10) digito = 0
    return digito === Number(cpf[10])
  }

  const validarCnpj = (cnpj) => {
    if (!/^\d{14}$/.test(cnpj) || /^([0-9])\1{13}$/.test(cnpj)) return false
    const calcularDigito = (base, pesos) => {
      const soma = base
        .split('')
        .reduce((total, caractere, indice) => total + Number(caractere) * pesos[indice], 0)
      const resto = soma % 11
      return resto < 2 ? 0 : 11 - resto
    }
    const primeiro = calcularDigito(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    const segundo = calcularDigito(
      cnpj.slice(0, 12) + primeiro,
      [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    )
    return Number(cnpj[12]) === primeiro && Number(cnpj[13]) === segundo
  }

  if (!validarCpf(documento) && !validarCnpj(documento)) {
    return e.badRequestError('CPF ou CNPJ inválido. Confira os dígitos informados.')
  }

  const planoSolicitado = planoRaw === 'Prevenção' ? 'Inspeção' : planoRaw
  const campoValor =
    planoSolicitado === 'Essencial'
      ? 'valor_plano_essencial'
      : planoSolicitado === 'Completo'
        ? 'valor_plano_completo'
        : 'valor_plano_inspecao'

  let mensal = 0
  let planoFinal = planoSolicitado
  let nomeFinal = nome
  let aceiteEm = ''
  let alreadyAccepted = false
  let propostaAtualizada = false

  try {
    $app.runInTransaction((txApp) => {
      const atual = txApp.findRecordById('propostas_om', proposal.id)
      const atualHash = atual.getString('link_token_hash')
      if (!atualHash || atualHash !== $security.sha256(token)) {
        throw new Error('Este link foi substituído. Solicite um novo link à Delfos Solar.')
      }
      const atualExpira = new Date(atual.getString('link_expira_em'))
      if (Number.isNaN(atualExpira.getTime()) || atualExpira.getTime() < Date.now()) {
        throw new Error('Este link expirou. Solicite um novo link à Delfos Solar.')
      }
      if (/aprovad/i.test(atual.getString('status'))) {
        alreadyAccepted = true
        planoFinal = atual.getString('plano_escolhido') || planoSolicitado
        nomeFinal = atual.getString('aceite_cliente_nome') || nome
        mensal = atual.getFloat('valor_mensal_plano')
        aceiteEm = atual.getString('aceite_cliente_em')
        return
      }

      mensal = atual.getFloat(campoValor)
      if (!Number.isFinite(mensal) || mensal <= 0) {
        throw new Error(
          'O valor deste plano não está disponível. Entre em contato com a Delfos Solar.',
        )
      }

      aceiteEm = new Date().toISOString()
      atual.set('plano_escolhido', planoSolicitado)
      atual.set('valor_mensal_plano', mensal)
      atual.set('valor_anual_plano', Math.round(mensal * 12 * 100) / 100)
      atual.set('status', 'Aprovada')
      atual.set('aceite_cliente_nome', nome)
      atual.set('aceite_cliente_documento', documento)
      atual.set('aceite_cliente_em', aceiteEm)
      txApp.save(atual)

      const cliente = txApp.findRecordById('clientes', atual.getString('cliente_id'))
      cliente.set('proposta_om_id', atual.id)
      txApp.save(cliente)

      const timeline = new Record(txApp.findCollectionByNameOrId('timeline_om'))
      timeline.set('cliente_id', atual.getString('cliente_id'))
      timeline.set('tipo', 'interacao')
      timeline.set('titulo', 'Proposta O&M aceita pelo cliente')
      timeline.set(
        'descricao',
        'Cliente confirmou o aceite do Plano ' +
          planoSolicitado +
          ' (' +
          mensal.toFixed(2) +
          ' por mês). Responsável: ' +
          nome +
          '.',
      )
      timeline.set('data', aceiteEm)
      timeline.set('autor', nome)
      timeline.set('status_tag', 'Aprovada')
      timeline.set('referencia_id', atual.id)
      txApp.save(timeline)
      propostaAtualizada = true
    })
  } catch (err) {
    const message = err && err.message ? err.message : String(err)
    if (/expired|expirou|substituído/i.test(message)) return e.notFoundError(message)
    return e.badRequestError(message)
  }

  if (alreadyAccepted && !proposal.getString('aceite_cliente_em')) {
    aceiteEm = new Date().toISOString()
  }

  return e.json(200, {
    ok: true,
    alreadyAccepted,
    status: 'Aprovada',
    plano: planoFinal,
    nome: nomeFinal,
    mensal,
    anual: Math.round(mensal * 12 * 100) / 100,
    acceptedAt: aceiteEm,
    propostaAtualizada,
  })
})

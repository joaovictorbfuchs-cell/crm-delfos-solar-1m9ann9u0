routerAdd('GET', '/backend/v1/propostas-om/public/{token}', (e) => {
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

  const expiresRaw = proposal.getString('link_expira_em')
  const expiresAt = new Date(expiresRaw)
  if (!expiresRaw || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return e.notFoundError('Este link expirou. Solicite um novo link à Delfos Solar.')
  }

  let client
  try {
    client = $app.findRecordById('clientes', proposal.getString('cliente_id'))
  } catch (_) {
    return e.notFoundError('Não foi possível localizar o cliente desta proposta.')
  }

  let content = null
  let negotiatedValues = {}
  try {
    const raw = proposal.getString('conteudo_proposta')
    if (raw) content = JSON.parse(raw)
  } catch (_) {
    content = null
  }
  try {
    const raw = proposal.getString('valores_negociados_json')
    if (raw) negotiatedValues = JSON.parse(raw)
  } catch (_) {
    negotiatedValues = {}
  }

  const nomeCliente = client.getString('nome_fantasia')
    ? client.getString('nome') + ' (' + client.getString('nome_fantasia') + ')'
    : client.getString('razao_social') || client.getString('nome')
  const documentoCliente = client.getString('cnpj') || client.getString('cpf') || ''
  const aceitoEm = proposal.getString('aceite_cliente_em')

  let negocioTitulo = ''
  const negocioId = proposal.getString('negocio_id')
  if (negocioId) {
    try {
      const neg = $app.findRecordById('negocios', negocioId)
      negocioTitulo = neg.getString('titulo') || ''
    } catch (_) {
      negocioTitulo = ''
    }
  }

  const numeroPropostaValido = proposal.getString('numero_proposta') || ''

  return e.json(200, {
    status: proposal.getString('status') || 'Proposta Enviada',
    dataProposta: proposal.getString('data_proposta'),
    dataEmissao: proposal.getString('data_proposta'),
    observacoes: proposal.getString('observacoes'),
    cliente: {
      nome: nomeCliente,
      cpfOuCnpj: documentoCliente,
      endereco: (() => {
        const rawNum = (client.getString('numero') || '').trim()
        const numFmt = rawNum && rawNum.toUpperCase() !== 'S/N' ? `nº ${rawNum}` : ''
        return [client.getString('endereco'), numFmt, client.getString('bairro')]
          .filter(Boolean)
          .join(', ')
      })(),
      municipio: client.getString('cidade') || 'Erechim/RS',
      email: client.getString('email'),
      telefone: client.getString('whatsapp') || client.getString('telefone'),
    },
    tecnico: {
      potenciaKwp: proposal.getFloat('potencia_kwp'),
      geracaoMediaKwh: proposal.getFloat('geracao_mensal_kwh'),
      marcaInversores: proposal.getString('marca_inversores'),
      tipoInstalacao: proposal.getString('tipo_instalacao'),
      numeroModulos: proposal.getFloat('numero_modulos'),
      municipio: client.getString('cidade') || 'Erechim/RS',
    },
    parametros: {
      valorKwh: proposal.getFloat('valor_kwh'),
      distanciaKm: proposal.getFloat('distancia_km'),
      valorKm: proposal.getFloat('valor_km'),
      valorPorPlaca: proposal.getFloat('valor_por_placa'),
      planoEscolhido: proposal.getString('plano_escolhido'),
      valoresNegociados: negotiatedValues,
    },
    calculos: {
      valorAtivoProtegido: proposal.getFloat('valor_ativo_protegido'),
      perda15Ano: proposal.getFloat('perda_15_ano'),
      perda20Ano: proposal.getFloat('perda_20_ano'),
      prejuizo20Dias: proposal.getFloat('prejuizo_20_dias'),
      prejuizo30Dias: proposal.getFloat('prejuizo_30_dias'),
      planos: {
        Essencial: {
          mensal: proposal.getFloat('valor_plano_essencial'),
          anual: proposal.getFloat('valor_plano_essencial') * 12,
        },
        Inspeção: {
          mensal: proposal.getFloat('valor_plano_inspecao'),
          anual: proposal.getFloat('valor_plano_inspecao') * 12,
        },
        Completo: {
          mensal: proposal.getFloat('valor_plano_completo'),
          anual: proposal.getFloat('valor_plano_completo') * 12,
        },
      },
    },
    referenciaProposta: proposal.id,
    numeroProposta: numeroPropostaValido,
    negocioId: negocioId,
    negocioTitulo: negocioTitulo,
    autor: proposal.getString('autor'),
    conteudo: content,
    aceite: aceitoEm
      ? {
          nome: proposal.getString('aceite_cliente_nome'),
          documento: proposal.getString('aceite_cliente_documento'),
          data: aceitoEm,
        }
      : null,
  })
})

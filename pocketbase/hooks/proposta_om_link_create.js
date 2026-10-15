routerAdd(
  'POST',
  '/backend/v1/propostas-om/{id}/link',
  (e) => {
    const proposalId = e.request.pathValue('id')
    if (!proposalId) return e.badRequestError('Proposta O&M inválida.')

    let proposal
    try {
      proposal = $app.findRecordById('propostas_om', proposalId)
    } catch (_) {
      return e.notFoundError('Proposta O&M não encontrada.')
    }

    const token = $security.randomString(48)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    proposal.set('link_token_hash', $security.sha256(token))
    proposal.set('link_expira_em', expiresAt)
    $app.save(proposal)

    return e.json(200, { token, expiresAt })
  },
  $apis.requireAuth(),
)

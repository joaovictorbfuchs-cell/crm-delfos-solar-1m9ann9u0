// Endpoint seguro para retornar status das configurações do gateway (sem expor a chave secreta nem tokens de URL)
routerAdd('GET', '/backend/v1/whatsapp/config-status', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
    const apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()
    const originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim()

    let gatewayProvider = 'desconhecido'
    let isZApi = false
    let isEvolution = false
    let isUrlWellFormed = false
    let apiUrlMasked = ''
    let formatHint = ''

    if (rawApiUrl) {
      const lowerUrl = rawApiUrl.toLowerCase()
      if (lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1) {
        gatewayProvider = 'z-api'
        isZApi = true

        const match = rawApiUrl.match(/(https?:\/\/[^/]+\/instances\/)([^/]+)(\/token\/)([^/?#]+)/i)
        if (match) {
          isUrlWellFormed = true
          const prefix = match[1]
          const instId = match[2]
          const tokenStr = match[4]
          const tokenMasked = tokenStr.length > 4 ? '••••' + tokenStr.slice(-4) : '••••'
          apiUrlMasked = prefix + instId + '/token/' + tokenMasked
        } else {
          isUrlWellFormed = false
          apiUrlMasked = rawApiUrl.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
          formatHint =
            'Aviso: Formato recomendado da Z-API: https://api.z-api.com/instances/{instanceId}/token/{token}'
        }
      } else {
        gatewayProvider = 'evolution_ou_generico'
        isEvolution = true
        isUrlWellFormed = true
        apiUrlMasked = rawApiUrl.substring(0, 35) + (rawApiUrl.length > 35 ? '...' : '')
      }
    }

    return e.json(200, {
      ok: true,
      configured: Boolean(rawApiUrl),
      hasApiUrl: Boolean(rawApiUrl),
      apiUrlPreview: apiUrlMasked,
      apiUrlMasked: apiUrlMasked,
      isZApi: isZApi,
      isEvolution: isEvolution,
      isUrlWellFormed: isUrlWellFormed,
      formatHint: formatHint,
      provider: gatewayProvider,
      hasApiKey: Boolean(apiKey),
      apiKeyMasked: apiKey ? '••••••••' + apiKey.slice(-4) : '',
      originNumber: originNumber || '',
      secretsRequired: ['WHATSAPP_API_URL', 'WHATSAPP_API_KEY', 'WHATSAPP_ORIGIN_NUMBER'],
    })
  } catch (err) {
    let msg = 'Erro ao verificar configurações'
    if (err && err.message) msg = err.message
    return e.json(500, { error: msg, ok: false })
  }
})

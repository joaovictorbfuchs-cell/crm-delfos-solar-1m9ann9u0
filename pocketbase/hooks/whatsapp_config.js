// Endpoint seguro para retornar status das configurações do gateway (sem expor a chave secreta nem tokens de URL)
routerAdd('GET', '/backend/v1/whatsapp/config-status', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    let rawApiUrl = ($os.getenv('WHATSAPP_API_URL') || '').trim()
    rawApiUrl = rawApiUrl.replace(/[\r\n\t]/g, '').trim()

    let apiKey = ($os.getenv('WHATSAPP_API_KEY') || '').trim()
    apiKey = apiKey.replace(/[\r\n\t]/g, '').trim()

    let originNumber = ($os.getenv('WHATSAPP_ORIGIN_NUMBER') || '').trim()
    originNumber = originNumber.replace(/[\r\n\t]/g, '').trim()

    let gatewayProvider = 'desconhecido'
    let isZApi = false
    let isEvolution = false
    let isUrlWellFormed = false
    let apiUrlMasked = ''
    let formatHint = ''

    if (rawApiUrl) {
      let cleanUrl = rawApiUrl.replace(/\/+$/, '')
      if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl
      }

      const lowerUrl = cleanUrl.toLowerCase()
      if (lowerUrl.indexOf('z-api.com') !== -1 || lowerUrl.indexOf('z-api.io') !== -1) {
        gatewayProvider = 'z-api'
        isZApi = true

        // Normalizar removendo qualquer /send-text do final
        const baseWithoutSuffix = cleanUrl.replace(/\/+send-text\/?$/i, '').replace(/\/+$/, '')

        // Validar formato canônico: https://api.z-api.io/instances/{id}/token/{token}
        const match = baseWithoutSuffix.match(
          /^(https?:\/\/[^/]+)\/instances\/([^/]+)\/token\/([^/?#]+)$/i,
        )

        if (match) {
          isUrlWellFormed = true
          const prefix = match[1]
          const instId = match[2]
          const tokenStr = match[3]
          const tokenMasked = tokenStr.length > 4 ? '••••' + tokenStr.slice(-4) : '••••'
          // Mostra a URL base e informa que o CRM anexa /send-text
          apiUrlMasked = `${prefix}/instances/${instId}/token/${tokenMasked}`
        } else {
          isUrlWellFormed = false
          apiUrlMasked = baseWithoutSuffix.replace(/\/token\/[^/?#]+/i, '/token/••••••••')
          formatHint =
            'Aviso: A URL configurada não segue o formato padrão da Z-API: https://api.z-api.io/instances/{instanceId}/token/{token}. Verifique o Secret WHATSAPP_API_URL.'
        }
      } else {
        gatewayProvider = 'evolution_ou_generico'
        isEvolution = true
        isUrlWellFormed = true
        apiUrlMasked = cleanUrl.substring(0, 35) + (cleanUrl.length > 35 ? '...' : '')
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

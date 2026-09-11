// Endpoint seguro para retornar status das configurações do gateway (sem expor a chave secreta)
routerAdd('GET', '/backend/v1/whatsapp/config-status', (e) => {
  try {
    const authUser = e.auth
    if (!authUser) {
      return e.json(401, { error: 'Autenticação necessária', ok: false })
    }

    const apiUrl = $os.getenv('WHATSAPP_API_URL') || ''
    const apiKey = $os.getenv('WHATSAPP_API_KEY') || ''
    const originNumber = $os.getenv('WHATSAPP_ORIGIN_NUMBER') || ''

    return e.json(200, {
      ok: true,
      configured: Boolean(apiUrl),
      hasApiUrl: Boolean(apiUrl),
      apiUrlPreview: apiUrl ? apiUrl.substring(0, 35) + (apiUrl.length > 35 ? '...' : '') : '',
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

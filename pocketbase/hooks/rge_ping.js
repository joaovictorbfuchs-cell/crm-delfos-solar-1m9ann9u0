// Diagnóstico: hook mínimo para confirmar que rotas novas são registradas.
routerAdd('GET', '/backend/v1/rge/ping', (e) => {
  return e.json(200, { ok: true, ping: 'rge', at: new Date().toISOString() })
})

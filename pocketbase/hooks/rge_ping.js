// Diagnóstico: duas rotas, uma sem middleware e outra com autenticação,
// para saber qual das duas registra em produção.
routerAdd('GET', '/backend/v1/rge/ping', (e) => {
  return e.json(200, { ok: true, ping: 'rge', at: new Date().toISOString() })
})

routerAdd(
  'GET',
  '/backend/v1/rge/ping-auth',
  (e) => {
    return e.json(200, { ok: true, temAuth: !!(e.auth && e.auth.id) })
  },
  $apis.requireAuth(),
)

// Retired endpoint: the former implementation exported bulk customer/contact data.
// Keep a minimal authenticated tombstone so hook synchronization can converge even
// if this file was not present on a pod during an earlier deploy.
routerAdd(
  'GET',
  '/backend/v1/auditoria-dados',
  (e) => e.notFoundError('Este endpoint de auditoria foi desativado.'),
  $apis.requireAuth(),
)

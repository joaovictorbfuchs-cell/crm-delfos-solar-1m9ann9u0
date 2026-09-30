// Sincronização e prioridade entre campos de telefone e WhatsApp na coleção 'clientes'
// Regra de negócio (WhatsApp é a fonte da verdade):
// 1. Se whatsapp preenchido e telefone vazio ou diferente -> telefone = whatsapp (copia WhatsApp para telefone)
// 2. Se whatsapp vazio e telefone preenchido -> whatsapp = telefone (mantém comportamento de importação/criação onde só existe telefone)

// Regra atualizada: telefone e whatsapp são campos independentes.
// Não há mais cópia automática de WhatsApp para Telefone nem de Telefone para WhatsApp.

onRecordCreate((e) => {
  return e.next()
}, 'clientes')

onRecordUpdate((e) => {
  return e.next()
}, 'clientes')

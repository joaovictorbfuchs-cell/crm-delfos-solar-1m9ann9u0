// Sincronização e prioridade entre campos de telefone e WhatsApp na coleção 'clientes'
// Regra mantida: telefone e whatsapp são campos independentes.
//
// REGRA CRÍTICA DE OURO (anti-cross-contamination):
// O campo `numero` de `whatsapp_conversas` é IMUTÁVEL por sincronização do cadastro do cliente.
// Sobrescrever o número da conversa causava contaminação cruzada grave (ex: telefone de outro cliente
// salvo acidentalmente no cadastro sobrescrevia conversas de clientes distintos).
// As rotinas de sobrescrita de conv.numero foram neutralizadas. O histórico de cada conversa
// pertence ao número que de fato trocou mensagens via webhook / canal telefônico.

onRecordCreate((e) => {
  e.next()
  // Neutralizado: conversas preservam seu próprio número imutável.
}, 'clientes')

onRecordUpdate((e) => {
  e.next()
  // Neutralizado: conversas preservam seu próprio número imutável.
}, 'clientes')

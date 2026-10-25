// pocketbase/hooks/negocios_estagio_followup.js
// Hook de gatilho para entrada automática em fluxos de follow-up ao mudar estágio do negócio (Fase 3)

onRecordAfterUpdateSuccess((e) => {
  try {
    const record = e.record
    if (!record || record.collection().name !== 'negocios') {
      return e.next()
    }

    const novaEtapa = record.getString('etapa_funil')
    const etapaAnterior = record.original() ? record.original().getString('etapa_funil') : ''

    if (novaEtapa && novaEtapa !== etapaAnterior) {
      try {
        const helper = require(`${__hooks}/whatsapp_reenvio_helper.js`)
        if (helper && typeof helper.avaliarEntradaAutomaticaEstagio === 'function') {
          helper.avaliarEntradaAutomaticaEstagio($app, record, novaEtapa, etapaAnterior)
        }
      } catch (errHelper) {
        console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro ao avaliar regras de estágio:', errHelper)
      }
    }
  } catch (err) {
    console.log('[HOOK NEGOCIOS FOLLOW-UP] Erro geral:', err)
  }

  return e.next()
})

onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    if (!record || record.collection().name !== 'negocios') {
      return e.next()
    }

    const etapa = record.getString('etapa_funil')
    if (etapa) {
      try {
        const helper = require(`${__hooks}/whatsapp_reenvio_helper.js`)
        if (helper && typeof helper.avaliarEntradaAutomaticaEstagio === 'function') {
          helper.avaliarEntradaAutomaticaEstagio($app, record, etapa, '')
        }
      } catch (errHelper) {
        console.log('[HOOK NEGOCIOS CRIADO FOLLOW-UP] Erro:', errHelper)
      }
    }
  } catch (err) {
    console.log('[HOOK NEGOCIOS CRIADO FOLLOW-UP] Erro geral:', err)
  }

  return e.next()
})

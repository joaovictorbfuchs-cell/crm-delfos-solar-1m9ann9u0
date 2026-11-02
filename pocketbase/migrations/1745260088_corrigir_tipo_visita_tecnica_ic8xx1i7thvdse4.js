/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Correção pontual e idempotente da atividade ic8xx1i7thvdse4:
    // Título "Visita Técnica", tipo era 'instalacao', deve ser 'visita_tecnica'
    // No-op em banco vazio ou caso o registro não exista
    try {
      const record = app.findRecordById('atividades', 'ic8xx1i7thvdse4')
      if (record) {
        const tipoAtual = record.get('tipo')
        if (tipoAtual !== 'visita_tecnica') {
          record.set('tipo', 'visita_tecnica')
          app.save(record)
        }
      }
    } catch (e) {
      // Registro não existe neste ambiente (ex: banco vazio de preview ou testes) - no-op
    }
  },
  (app) => {
    try {
      const record = app.findRecordById('atividades', 'ic8xx1i7thvdse4')
      if (record) {
        record.set('tipo', 'instalacao')
        app.save(record)
      }
    } catch (e) {
      // no-op
    }
  },
)

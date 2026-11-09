/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    try {
      const record = app.findRecordById('atividades', 'r98if0d7pjp6h8t')
      if (record) {
        record.set('horario_inicio', '14:00')
        record.set('horario_fim', '16:00')
        record.set('duracao_minutos', 90)
        record.set(
          'pendencias_recomendacoes',
          'Reparo concluído com sucesso. Micro inversor reposicionado em local ventilado.',
        )
        app.save(record)
      }
    } catch (e) {
      // Registro pode não existir em outro ambiente
    }
  },
  (app) => {
    try {
      const record = app.findRecordById('atividades', 'r98if0d7pjp6h8t')
      if (record) {
        record.set('horario_inicio', '')
        record.set('horario_fim', '')
        record.set('duracao_minutos', 0)
        record.set('pendencias_recomendacoes', '')
        app.save(record)
      }
    } catch (e) {
      // No-op
    }
  },
)

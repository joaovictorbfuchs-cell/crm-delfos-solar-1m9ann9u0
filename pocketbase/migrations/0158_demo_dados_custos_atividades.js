/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  // Preencher valores de demonstração nas atividades de manutenção existentes
  try {
    const records = app.findRecordsByFilter(
      'atividades',
      'tipo = "limpeza_manutencao" && custo_total = 0',
      '-created',
      2,
    )

    if (records && records.length > 0) {
      // Atividade 1: Cobrança por placa (32 placas x R$ 12,50) + Deslocamento 35 km ida e volta (70 km x R$ 1,20 = R$ 84,00) = R$ 484,00
      const rec1 = records[0]
      rec1.set('valor_servico', 250)
      rec1.set('valor_por_placa', 12.5)
      rec1.set('qtd_modulos', 32)
      rec1.set('cobrar_deslocamento', true)
      rec1.set('distancia_km', 35)
      rec1.set('valor_km', 1.2)
      rec1.set('custo_deslocamento', 84)
      rec1.set('custo_placas', 400)
      rec1.set('custo_total', 484)
      app.save(rec1)

      // Atividade 2: Cobrança por valor fixo de serviço R$ 350,00 + Deslocamento 24 km ida e volta (48 km x R$ 1,20 = R$ 57,60) = R$ 407,60
      if (records.length > 1) {
        const rec2 = records[1]
        rec2.set('valor_servico', 350)
        rec2.set('valor_por_placa', 0)
        rec2.set('qtd_modulos', 24)
        rec2.set('cobrar_deslocamento', true)
        rec2.set('distancia_km', 24)
        rec2.set('valor_km', 1.2)
        rec2.set('custo_deslocamento', 57.6)
        rec2.set('custo_placas', 0)
        rec2.set('custo_total', 407.6)
        app.save(rec2)
      }
    }
  } catch (err) {
    console.log('Aviso ao atualizar atividades demo com custos:', err)
  }
})

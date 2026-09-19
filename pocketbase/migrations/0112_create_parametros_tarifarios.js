migrate(
  (app) => {
    // 1. Criar a coleção parametros_tarifarios
    const collection = new Collection({
      name: 'parametros_tarifarios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'ano', type: 'number', required: true, onlyInt: true },
        {
          name: 'classe',
          type: 'select',
          required: true,
          values: ['residencial', 'comercial'],
          maxSelect: 1,
        },
        { name: 'tarifa', type: 'number' },
        { name: 'fio_b', type: 'number' },
        { name: 'fs', type: 'number' },
        { name: 'gd_eco_liquida', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_param_tarif_classe_ano ON parametros_tarifarios (classe, ano)'],
    })
    app.save(collection)

    // 2. Dados reais extraídos da planilha de orçamento oficial 2026-2051
    const dadosResidencial = [
      { ano: 2026, tarifa: 1.1979, fio_b: 0.2239, fs: 0.3, gd_eco_liquida: 1.1039 },
      { ano: 2027, tarifa: 1.3057, fio_b: 0.2441, fs: 0.3, gd_eco_liquida: 1.1775 },
      { ano: 2028, tarifa: 1.4232, fio_b: 0.266, fs: 0.3, gd_eco_liquida: 1.2556 },
      { ano: 2029, tarifa: 1.5513, fio_b: 0.29, fs: 0.3, gd_eco_liquida: 1.3686 },
      { ano: 2030, tarifa: 1.6909, fio_b: 0.3161, fs: 0.3, gd_eco_liquida: 1.4918 },
      { ano: 2031, tarifa: 1.8431, fio_b: 0.3445, fs: 0.3, gd_eco_liquida: 1.6261 },
      { ano: 2032, tarifa: 2.009, fio_b: 0.3755, fs: 0.3, gd_eco_liquida: 1.7724 },
      { ano: 2033, tarifa: 2.1898, fio_b: 0.4093, fs: 0.3, gd_eco_liquida: 1.9319 },
      { ano: 2034, tarifa: 2.3869, fio_b: 0.4462, fs: 0.3, gd_eco_liquida: 2.1058 },
      { ano: 2035, tarifa: 2.6017, fio_b: 0.4863, fs: 0.3, gd_eco_liquida: 2.2953 },
      { ano: 2036, tarifa: 2.8359, fio_b: 0.5301, fs: 0.3, gd_eco_liquida: 2.5019 },
      { ano: 2037, tarifa: 3.0911, fio_b: 0.5778, fs: 0.3, gd_eco_liquida: 2.7271 },
      { ano: 2038, tarifa: 3.3693, fio_b: 0.6298, fs: 0.3, gd_eco_liquida: 2.9725 },
      { ano: 2039, tarifa: 3.6725, fio_b: 0.6865, fs: 0.3, gd_eco_liquida: 3.24 },
      { ano: 2040, tarifa: 4.003, fio_b: 0.7483, fs: 0.3, gd_eco_liquida: 3.5316 },
      { ano: 2041, tarifa: 4.3633, fio_b: 0.8156, fs: 0.3, gd_eco_liquida: 3.8495 },
      { ano: 2042, tarifa: 4.756, fio_b: 0.889, fs: 0.3, gd_eco_liquida: 4.1959 },
      { ano: 2043, tarifa: 5.184, fio_b: 0.969, fs: 0.3, gd_eco_liquida: 4.5735 },
      { ano: 2044, tarifa: 5.6506, fio_b: 1.0562, fs: 0.3, gd_eco_liquida: 4.9852 },
      { ano: 2045, tarifa: 6.1592, fio_b: 1.1513, fs: 0.3, gd_eco_liquida: 5.4339 },
      { ano: 2046, tarifa: 6.7135, fio_b: 1.2549, fs: 0.3, gd_eco_liquida: 5.9229 },
      { ano: 2047, tarifa: 7.3177, fio_b: 1.3678, fs: 0.3, gd_eco_liquida: 6.456 },
      { ano: 2048, tarifa: 7.9763, fio_b: 1.4909, fs: 0.3, gd_eco_liquida: 7.037 },
      { ano: 2049, tarifa: 8.6942, fio_b: 1.6251, fs: 0.3, gd_eco_liquida: 7.6704 },
      { ano: 2050, tarifa: 9.4766, fio_b: 1.7714, fs: 0.3, gd_eco_liquida: 8.3606 },
      { ano: 2051, tarifa: 10.3295, fio_b: 1.9308, fs: 0.3, gd_eco_liquida: 9.1131 },
    ]

    const dadosComercial = [
      { ano: 2026, tarifa: 1.1979, fio_b: 0.2239, fs: 0.7, gd_eco_liquida: 1.1576 },
      { ano: 2027, tarifa: 1.3057, fio_b: 0.2441, fs: 0.7, gd_eco_liquida: 1.2508 },
      { ano: 2028, tarifa: 1.4232, fio_b: 0.266, fs: 0.7, gd_eco_liquida: 1.3514 },
      { ano: 2029, tarifa: 1.5513, fio_b: 0.29, fs: 0.7, gd_eco_liquida: 1.473 },
      { ano: 2030, tarifa: 1.6909, fio_b: 0.3161, fs: 0.7, gd_eco_liquida: 1.6056 },
      { ano: 2031, tarifa: 1.8431, fio_b: 0.3445, fs: 0.7, gd_eco_liquida: 1.7501 },
      { ano: 2032, tarifa: 2.009, fio_b: 0.3755, fs: 0.7, gd_eco_liquida: 1.9076 },
      { ano: 2033, tarifa: 2.1898, fio_b: 0.4093, fs: 0.7, gd_eco_liquida: 2.0793 },
      { ano: 2034, tarifa: 2.3869, fio_b: 0.4462, fs: 0.7, gd_eco_liquida: 2.2664 },
      { ano: 2035, tarifa: 2.6017, fio_b: 0.4863, fs: 0.7, gd_eco_liquida: 2.4704 },
      { ano: 2036, tarifa: 2.8359, fio_b: 0.5301, fs: 0.7, gd_eco_liquida: 2.6928 },
      { ano: 2037, tarifa: 3.0911, fio_b: 0.5778, fs: 0.7, gd_eco_liquida: 2.9351 },
      { ano: 2038, tarifa: 3.3693, fio_b: 0.6298, fs: 0.7, gd_eco_liquida: 3.1993 },
      { ano: 2039, tarifa: 3.6725, fio_b: 0.6865, fs: 0.7, gd_eco_liquida: 3.4871 },
      { ano: 2040, tarifa: 4.003, fio_b: 0.7483, fs: 0.7, gd_eco_liquida: 3.801 },
      { ano: 2041, tarifa: 4.3633, fio_b: 0.8156, fs: 0.7, gd_eco_liquida: 4.1431 },
      { ano: 2042, tarifa: 4.756, fio_b: 0.889, fs: 0.7, gd_eco_liquida: 4.516 },
      { ano: 2043, tarifa: 5.184, fio_b: 0.969, fs: 0.7, gd_eco_liquida: 4.9224 },
      { ano: 2044, tarifa: 5.6506, fio_b: 1.0562, fs: 0.7, gd_eco_liquida: 5.3654 },
      { ano: 2045, tarifa: 6.1592, fio_b: 1.1513, fs: 0.7, gd_eco_liquida: 5.8483 },
      { ano: 2046, tarifa: 6.7136, fio_b: 1.2549, fs: 0.7, gd_eco_liquida: 6.3747 },
      { ano: 2047, tarifa: 7.3179, fio_b: 1.3678, fs: 0.7, gd_eco_liquida: 6.9484 },
      { ano: 2048, tarifa: 7.9763, fio_b: 1.4909, fs: 0.7, gd_eco_liquida: 7.5738 },
      { ano: 2049, tarifa: 8.6942, fio_b: 1.6251, fs: 0.7, gd_eco_liquida: 8.2554 },
      { ano: 2050, tarifa: 9.4766, fio_b: 1.7714, fs: 0.7, gd_eco_liquida: 8.9983 },
      { ano: 2051, tarifa: 10.3295, fio_b: 1.9308, fs: 0.7, gd_eco_liquida: 9.8082 },
    ]

    const targetCol = app.findCollectionByNameOrId('parametros_tarifarios')

    // Inserir Residencial
    for (let i = 0; i < dadosResidencial.length; i++) {
      const d = dadosResidencial[i]
      const rec = new Record(targetCol)
      rec.set('ano', d.ano)
      rec.set('classe', 'residencial')
      rec.set('tarifa', d.tarifa)
      rec.set('fio_b', d.fio_b)
      rec.set('fs', d.fs)
      rec.set('gd_eco_liquida', d.gd_eco_liquida)
      app.save(rec)
    }

    // Inserir Comercial
    for (let i = 0; i < dadosComercial.length; i++) {
      const d = dadosComercial[i]
      const rec = new Record(targetCol)
      rec.set('ano', d.ano)
      rec.set('classe', 'comercial')
      rec.set('tarifa', d.tarifa)
      rec.set('fio_b', d.fio_b)
      rec.set('fs', d.fs)
      rec.set('gd_eco_liquida', d.gd_eco_liquida)
      app.save(rec)
    }
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('parametros_tarifarios')
      app.delete(collection)
    } catch (_) {}
  },
)

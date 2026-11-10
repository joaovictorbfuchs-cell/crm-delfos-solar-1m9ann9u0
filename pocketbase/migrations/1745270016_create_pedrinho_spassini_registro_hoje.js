migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atividades')
    const clienteId = 'tvjy2sa66y03jii' // Pedrinho Spassini
    const usinaId = 'xiwsbt9eksrv9k3'
    const parentId = 'jkq75wxhjgsuf6n' // Auto Leitura RGE de Pedrinho Spassini
    const uc = '196.880.001-93'

    // Checar se já existe registro_auto_leitura para hoje (2026-11-10) de Pedrinho Spassini
    const existentes = app.findRecordsByFilter(
      'atividades',
      `cliente_id = '${clienteId}' && tipo = 'registro_auto_leitura' && data_leitura ~ '2026-11-10'`,
      '',
      1,
    )

    if (existentes && existentes.length > 0) {
      console.log('Registro para hoje de Pedrinho Spassini já existe.')
      return
    }

    const regHoje = new Record(col)
    regHoje.set('tipo', 'registro_auto_leitura')
    regHoje.set('titulo', 'Registro de auto leitura — 10/11/2026')
    regHoje.set(
      'descricao',
      'Atividade de registro de auto leitura para a UC 196.880.001-93. Preencher as grandezas 03 e A3 e clicar em "Enviar para RGE".',
    )
    regHoje.set('status', 'pendente')
    regHoje.set('data', '2026-11-10 12:00:00')
    regHoje.set('data_leitura', '2026-11-10 12:00:00')
    regHoje.set('parent_id', parentId)
    regHoje.set('cliente_id', clienteId)
    regHoje.set('usina_id', usinaId)
    regHoje.set('numero_uc', uc)
    regHoje.set('autor', 'Sistema Delfos')
    regHoje.set('responsavel_nome', 'Daniel Rotava')
    regHoje.set('responsavel_id', 'vjz4lj6ky7coh7j')
    app.save(regHoje)
  },
  () => {},
)

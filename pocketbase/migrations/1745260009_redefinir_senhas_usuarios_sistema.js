migrate(
  (app) => {
    // 1745260009: Garantir senha válida para Instalador Delfos (delfos.usinas@gmail.com) e revisar os demais usuários
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Instalador Delfos (delfos.usinas@gmail.com)
    try {
      const rec = app.findAuthRecordByEmail('_pb_users_auth_', 'delfos.usinas@gmail.com')
      rec.setPassword('Delfos@2026')
      rec.setVerified(true)
      rec.set('ativo', true)
      rec.set('role', 'instalador')
      app.save(rec)
      console.log('[1745260009] Senha definida para delfos.usinas@gmail.com com sucesso!')
    } catch (err) {
      console.warn('[1745260009] Erro ao definir senha para delfos.usinas@gmail.com:', err)
    }

    // 2. João Victor Bagetti Fuchs (joao@delfosengenharia.com.br)
    try {
      const joao = app.findAuthRecordByEmail('_pb_users_auth_', 'joao@delfosengenharia.com.br')
      joao.setPassword('Skip@Pass')
      joao.setVerified(true)
      joao.set('ativo', true)
      joao.set('role', 'admin')
      app.save(joao)
    } catch (err) {
      console.warn('[1745260009] Aviso ao revisar joao@delfosengenharia.com.br:', err)
    }

    // 3. Daniel Rotava (daniel@delfosengenharia.com.br)
    try {
      const daniel = app.findAuthRecordByEmail('_pb_users_auth_', 'daniel@delfosengenharia.com.br')
      daniel.setPassword('Delfos@2026')
      daniel.setVerified(true)
      daniel.set('ativo', true)
      daniel.set('role', 'admin')
      app.save(daniel)
    } catch (err) {
      console.warn('[1745260009] Aviso ao revisar daniel@delfosengenharia.com.br:', err)
    }

    // 4. Cassio Navarini (cassio.navarini@gmail.com)
    try {
      const cassio = app.findAuthRecordByEmail('_pb_users_auth_', 'cassio.navarini@gmail.com')
      cassio.setPassword('Delfos@2026')
      cassio.setVerified(true)
      cassio.set('ativo', true)
      cassio.set('role', 'instalador')
      app.save(cassio)
    } catch (err) {
      console.warn('[1745260009] Aviso ao revisar cassio.navarini@gmail.com:', err)
    }
  },
  (app) => {},
)

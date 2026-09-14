migrate(
  (app) => {
    // 0077: Reset password for joao@delfosengenharia.com.br to guarantee Skip@Pass
    try {
      const joao = app.findAuthRecordByEmail('_pb_users_auth_', 'joao@delfosengenharia.com.br')
      joao.setPassword('Skip@Pass')
      joao.setVerified(true)
      joao.set('ativo', true)
      joao.set('role', 'admin')
      app.save(joao)
    } catch (err) {
      console.warn('Erro ao atualizar senha de joao na migration 0077:', err)
      throw err
    }
  },
  (app) => {},
)

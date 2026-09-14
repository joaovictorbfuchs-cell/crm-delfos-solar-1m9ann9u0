migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const osCol = app.findCollectionByNameOrId('ordens_servico')

    // 1. Garantir que joao@ é admin e ativo = true
    try {
      const joao = app.findAuthRecordByEmail('_pb_users_auth_', 'joao@delfosengenharia.com.br')
      joao.set('role', 'admin')
      joao.set('ativo', true)
      app.save(joao)
    } catch (_) {}

    // 2. Administrador 2: Inativo (ex: Ricardo Souza - ricardo.admin@delfosengenharia.com.br / Delfos@123)
    let adminInativoId = null
    try {
      const existing = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'ricardo.admin@delfosengenharia.com.br',
      )
      existing.set('role', 'admin')
      existing.set('ativo', false)
      app.save(existing)
      adminInativoId = existing.id
    } catch (_) {
      const adminInativo = new Record(usersCol)
      adminInativo.setEmail('ricardo.admin@delfosengenharia.com.br')
      adminInativo.setPassword('Delfos@123')
      adminInativo.setVerified(true)
      adminInativo.set('name', 'Ricardo Souza (Admin Inativo)')
      adminInativo.set('role', 'admin')
      adminInativo.set('ativo', false)
      app.save(adminInativo)
      adminInativoId = adminInativo.id
    }

    // 3. Instalador 1 (Ativo): Carlos Silva (carlos.instalador@delfosengenharia.com.br / Delfos@123)
    let instalador1Id = null
    try {
      const existing = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'carlos.instalador@delfosengenharia.com.br',
      )
      existing.set('role', 'instalador')
      existing.set('ativo', true)
      app.save(existing)
      instalador1Id = existing.id
    } catch (_) {
      const inst1 = new Record(usersCol)
      inst1.setEmail('carlos.instalador@delfosengenharia.com.br')
      inst1.setPassword('Delfos@123')
      inst1.setVerified(true)
      inst1.set('name', 'Carlos Silva')
      inst1.set('role', 'instalador')
      inst1.set('ativo', true)
      app.save(inst1)
      instalador1Id = inst1.id
    }

    // 4. Instalador 2 (Ativo): Anderson Pereira (anderson.instalador@delfosengenharia.com.br / Delfos@123)
    let instalador2Id = null
    try {
      const existing = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'anderson.instalador@delfosengenharia.com.br',
      )
      existing.set('role', 'instalador')
      existing.set('ativo', true)
      app.save(existing)
      instalador2Id = existing.id
    } catch (_) {
      const inst2 = new Record(usersCol)
      inst2.setEmail('anderson.instalador@delfosengenharia.com.br')
      inst2.setPassword('Delfos@123')
      inst2.setVerified(true)
      inst2.set('name', 'Anderson Pereira')
      inst2.set('role', 'instalador')
      inst2.set('ativo', true)
      app.save(inst2)
      instalador2Id = inst2.id
    }

    // 5. Instalador 3 (Inativo): Lucas Mendes (lucas.instalador@delfosengenharia.com.br / Delfos@123)
    let instalador3Id = null
    try {
      const existing = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'lucas.instalador@delfosengenharia.com.br',
      )
      existing.set('role', 'instalador')
      existing.set('ativo', false)
      app.save(existing)
      instalador3Id = existing.id
    } catch (_) {
      const inst3 = new Record(usersCol)
      inst3.setEmail('lucas.instalador@delfosengenharia.com.br')
      inst3.setPassword('Delfos@123')
      inst3.setVerified(true)
      inst3.set('name', 'Lucas Mendes (Instalador Inativo)')
      inst3.set('role', 'instalador')
      inst3.set('ativo', false)
      app.save(inst3)
      instalador3Id = inst3.id
    }

    // 6. Atribuir OS existentes aos instaladores ativos
    // OS 1: Limpeza Marcelo Becker -> atribuída a Carlos Silva
    // OS 2: Instalação Maria Santos -> atribuída a Carlos Silva
    // OS 3: Configuração Datalogger João Pedro Oliveira -> atribuída a Anderson Pereira
    try {
      const osList = app.findRecordsByFilter('ordens_servico', "status != ''", 'created', 20, 0)
      for (const os of osList) {
        const endereco = os.getString('endereco') || ''
        if (endereco.indexOf('Linha São João') >= 0 && instalador1Id) {
          os.set('responsavel_usuario_id', instalador1Id)
          os.set('atribuida_a', 'Carlos Silva')
          app.save(os)
        } else if (endereco.indexOf('Itália') >= 0 && instalador1Id) {
          os.set('responsavel_usuario_id', instalador1Id)
          os.set('atribuida_a', 'Carlos Silva')
          app.save(os)
        } else if (endereco.indexOf('Brasil Oeste') >= 0 && instalador2Id) {
          os.set('responsavel_usuario_id', instalador2Id)
          os.set('atribuida_a', 'Anderson Pereira')
          app.save(os)
        } else if (endereco.indexOf('Getúlio Vargas') >= 0 && instalador2Id) {
          os.set('responsavel_usuario_id', instalador2Id)
          os.set('atribuida_a', 'Anderson Pereira')
          app.save(os)
        }
      }
    } catch (err) {
      console.log('Erro ao atribuir OS aos instaladores:', err)
    }
  },
  (app) => {
    // Reverter seeds criados
    const emailsToDelete = [
      'ricardo.admin@delfosengenharia.com.br',
      'carlos.instalador@delfosengenharia.com.br',
      'anderson.instalador@delfosengenharia.com.br',
      'lucas.instalador@delfosengenharia.com.br',
    ]
    for (const email of emailsToDelete) {
      try {
        const rec = app.findAuthRecordByEmail('_pb_users_auth_', email)
        app.delete(rec)
      } catch (_) {}
    }
  },
)

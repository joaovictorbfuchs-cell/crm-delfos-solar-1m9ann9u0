// pocketbase/migrations/1745260086_allow_public_os_concluida_read.js
// Permite leitura pública de atividades e ordens de serviço concluídas ou em execução,
// para visualização de relatórios públicos por clientes e colaboradores sem depender de restrição por usuário/responsável.

migrate(
  (app) => {
    // 1. Coleção atividades: manter autenticados com acesso total, e permitir leitura anônima/pública
    // para registros concluídos, finalizados, em execução ou com dados registrados
    try {
      const atividades = app.findCollectionByNameOrId('atividades')
      atividades.listRule =
        '@request.auth.id != "" || status = "concluida" || status = "finalizada" || status = "em_execucao" || status = "dados_registrados" || status = "enviado"'
      atividades.viewRule =
        '@request.auth.id != "" || status = "concluida" || status = "finalizada" || status = "em_execucao" || status = "dados_registrados" || status = "enviado"'
      app.save(atividades)
    } catch (e) {
      console.log('Erro ao atualizar regras da coleção atividades:', e)
    }

    // 2. Coleção ordens_servico: regras semelhantes para leitura pública de ordens concluídas
    try {
      const ordensServico = app.findCollectionByNameOrId('ordens_servico')
      ordensServico.listRule =
        '@request.auth.id != "" || status = "concluida" || status = "finalizada" || status = "em_execucao"'
      ordensServico.viewRule =
        '@request.auth.id != "" || status = "concluida" || status = "finalizada" || status = "em_execucao"'
      app.save(ordensServico)
    } catch (e) {
      console.log('Erro ao atualizar regras da coleção ordens_servico:', e)
    }

    // 3. Coleção clientes: garantir leitura pública necessária para exibição do cabeçalho do relatório
    try {
      const clientes = app.findCollectionByNameOrId('clientes')
      if (clientes.viewRule !== '') {
        // Permitir viewRule aberto para carregar dados públicos de relatórios/propostas
        clientes.viewRule = ''
        app.save(clientes)
      }
    } catch (e) {
      console.log('Erro ao atualizar viewRule da coleção clientes:', e)
    }

    // 4. Coleção usinas: garantir viewRule pública
    try {
      const usinas = app.findCollectionByNameOrId('usinas')
      if (usinas.viewRule !== '') {
        usinas.viewRule = ''
        app.save(usinas)
      }
    } catch (e) {
      console.log('Erro ao atualizar viewRule da coleção usinas:', e)
    }

    // 5. Coleção usina_equipamentos e ativos: viewRule pública para equipamentos no relatório
    try {
      const ue = app.findCollectionByNameOrId('usina_equipamentos')
      if (ue.listRule !== '') {
        ue.listRule = ''
        ue.viewRule = ''
        app.save(ue)
      }
    } catch (_) {}

    try {
      const eq = app.findCollectionByNameOrId('equipamentos')
      if (eq.viewRule !== '') {
        eq.viewRule = ''
        app.save(eq)
      }
    } catch (_) {}
  },
  (app) => {
    // Reverter para regra autenticada
    try {
      const atividades = app.findCollectionByNameOrId('atividades')
      atividades.listRule = '@request.auth.id != ""'
      atividades.viewRule = '@request.auth.id != ""'
      app.save(atividades)
    } catch (_) {}

    try {
      const ordensServico = app.findCollectionByNameOrId('ordens_servico')
      ordensServico.listRule = '@request.auth.id != ""'
      ordensServico.viewRule = '@request.auth.id != ""'
      app.save(ordensServico)
    } catch (_) {}
  },
)

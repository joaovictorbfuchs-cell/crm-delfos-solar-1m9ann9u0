// pocketbase/hooks/relatorio_os_public_get.js
// Endpoint público e restrito a somente-leitura de relatórios de OS / atividades concluídas.
// Permite que qualquer pessoa com o link visualize o relatório sem depender de login ou regras user-scoped.

routerAdd('GET', '/backend/v1/relatorio-os/public/{id}', (e) => {
  const id = e.request.pathValue('id')
  if (!id || id.trim() === '') {
    return e.json(400, { ok: false, error: 'Identificador do relatório não informado.' })
  }

  const cleanId = id.trim()
  let registro = null
  let sourceCollection = ''

  // 1. Tentar encontrar por ID direto na coleção atividades
  try {
    const rec = $app.findRecordById('atividades', cleanId)
    if (rec) {
      registro = rec
      sourceCollection = 'atividades'
    }
  } catch (_) {}

  // 2. Tentar encontrar por ID direto na coleção ordens_servico
  if (!registro) {
    try {
      const rec = $app.findRecordById('ordens_servico', cleanId)
      if (rec) {
        registro = rec
        sourceCollection = 'ordens_servico'
      }
    } catch (_) {}
  }

  // 3. Fallback por registro_original_id ou chave_importacao em atividades
  if (!registro) {
    try {
      const filter = `registro_original_id = '${cleanId}' || chave_importacao ~ '${cleanId}'`
      const records = $app.findRecordsByFilter('atividades', filter, '-created', 1, 0)
      if (records && records.length > 0) {
        registro = records[0]
        sourceCollection = 'atividades'
      }
    } catch (_) {}
  }

  // 4. Fallback por registro_original_id ou chave_importacao em ordens_servico
  if (!registro) {
    try {
      // ordens_servico pode ter chave_importacao ou ser buscada por id
      const filter = `id = '${cleanId}'`
      const records = $app.findRecordsByFilter('ordens_servico', filter, '-created', 1, 0)
      if (records && records.length > 0) {
        registro = records[0]
        sourceCollection = 'ordens_servico'
      }
    } catch (_) {}
  }

  if (!registro) {
    return e.json(404, {
      ok: false,
      error: 'Relatório não encontrado no sistema.',
    })
  }

  // Restrição de segurança: link público somente-leitura deve ser de serviços com status válido
  // (concluida, em_execucao ou dados_registrados / enviado)
  const status = String(registro.getString('status') || '').toLowerCase()
  const allowedStatuses = ['concluida', 'em_execucao', 'dados_registrados', 'enviado']
  if (status && !allowedStatuses.includes(status)) {
    // Se não estiver concluída/em execução e requisição for anônima, negar
    const authUser = e.auth
    if (!authUser) {
      return e.json(403, {
        ok: false,
        error: 'Este relatório ainda não está disponível publicamente.',
      })
    }
  }

  // Buscar cliente vinculado
  let cliente = null
  const clienteId = registro.getString('cliente_id')
  if (clienteId) {
    try {
      cliente = $app.findRecordById('clientes', clienteId)
    } catch (_) {}
  }

  // Buscar usina vinculada (ou sistema legado)
  let usina = null
  const usinaId = registro.getString('usina_id') || registro.getString('sistema_id')
  if (usinaId) {
    try {
      usina = $app.findRecordById('usinas', usinaId)
    } catch (_) {
      try {
        usina = $app.findRecordById('sistemas', usinaId)
      } catch (_) {}
    }
  }

  // Buscar contrato O&M ativo do cliente se houver
  let contratoOM = null
  let temContratoOMAtivo = false
  if (clienteId) {
    try {
      const contratos = $app.findRecordsByFilter(
        'contratos_om',
        `cliente_id = '${clienteId}'`,
        '-created',
        5,
        0,
      )
      if (contratos && contratos.length > 0) {
        const ativo = contratos.find((c) => {
          const st = String(c.getString('status') || '').toLowerCase()
          const enc = String(c.getString('status_encerramento') || '').toLowerCase()
          return (
            !st.includes('encerrado') && !st.includes('cancelado') && !enc.includes('encerrado')
          )
        })
        contratoOM = ativo || contratos[0]
        if (contratoOM) {
          const st = String(contratoOM.getString('status') || '').toLowerCase()
          const enc = String(contratoOM.getString('status_encerramento') || '').toLowerCase()
          temContratoOMAtivo =
            !st.includes('encerrado') && !st.includes('cancelado') && !enc.includes('encerrado')
        }
      }
    } catch (_) {}
  }

  // Buscar equipamentos vinculados à usina
  let equipamentosUsina = []
  let ativosUsina = []
  const usinaIdFinal = usina ? usina.id : usinaId
  if (usinaIdFinal) {
    try {
      const eqRecords = $app.findRecordsByFilter(
        'usina_equipamentos',
        `usina_id = '${usinaIdFinal}'`,
        '-created',
        50,
        0,
      )
      if (eqRecords && eqRecords.length > 0) {
        equipamentosUsina = eqRecords.map((item) => {
          let eqDetails = null
          const eqId = item.getString('equipamento_id')
          if (eqId) {
            try {
              const eqRec = $app.findRecordById('equipamentos', eqId)
              if (eqRec) {
                eqDetails = {
                  id: eqRec.id,
                  tipo: eqRec.getString('tipo'),
                  marca: eqRec.getString('marca'),
                  modelo: eqRec.getString('modelo'),
                  potencia_w: eqRec.getFloat('potencia_w'),
                  garantia_anos: eqRec.getFloat('garantia_anos'),
                  descricao_padrao: eqRec.getString('descricao_padrao'),
                }
              }
            } catch (_) {}
          }
          return {
            id: item.id,
            usina_id: item.getString('usina_id'),
            equipamento_id: eqId,
            quantidade: item.getFloat('quantidade'),
            numero_serie: item.getString('numero_serie'),
            observacoes: item.getString('observacoes'),
            expand: eqDetails ? { equipamento_id: eqDetails } : undefined,
          }
        })
      }
    } catch (_) {}

    try {
      const ativosRecs = $app.findRecordsByFilter(
        'ativos',
        `usina_id = '${usinaIdFinal}'`,
        'tipo,fabricante,modelo',
        50,
        0,
      )
      if (ativosRecs && ativosRecs.length > 0) {
        ativosUsina = ativosRecs.map((a) => ({
          id: a.id,
          tipo: a.getString('tipo'),
          tipo_outro_descricao: a.getString('tipo_outro_descricao'),
          fabricante: a.getString('fabricante'),
          modelo: a.getString('modelo'),
          numero_serie: a.getString('numero_serie'),
          status_operacional: a.getString('status_operacional'),
          data_instalacao: a.getString('data_instalacao'),
          data_fim_garantia: a.getString('data_fim_garantia'),
          observacoes: a.getString('observacoes'),
        }))
      }
    } catch (_) {}
  }

  // Buscar responsável se houver
  let responsavelObj = null
  const respId =
    registro.getString('responsavel_id') || registro.getString('responsavel_usuario_id')
  if (respId) {
    try {
      const u = $app.findRecordById('users', respId)
      if (u) {
        responsavelObj = {
          id: u.id,
          name: u.getString('name'),
          phone: u.getString('phone'),
          email: u.getString('email'),
        }
      }
    } catch (_) {}
  }

  // Montar payload completo serializado para resposta JSON
  const rawData = {}
  const columnNames = [
    'id',
    'cliente_id',
    'usina_id',
    'data',
    'descricao',
    'titulo',
    'autor',
    'status',
    'responsavel_id',
    'responsavel_nome',
    'responsavel_cargo',
    'responsavel_email',
    'tipo',
    'tipo_unificado',
    'subtipo',
    'chave_importacao',
    'registro_original_id',
    'horario_inicio',
    'horario_fim',
    'duracao_minutos',
    'numero_uc',
    'endereco_uc',
    'valor_servico',
    'valor_por_placa',
    'qtd_modulos',
    'custo_placas',
    'cobrar_deslocamento',
    'distancia_km',
    'valor_km',
    'custo_deslocamento',
    'custo_total',
    'protocolo_atendimento',
    'protocolo_rge',
    'tipo_servico',
    'detalhes_execucao',
    'pendencias_recomendacoes',
    'solicitar_avaliacao_google',
    'avaliacao_google_texto',
    'avaliacao_google_link',
    'created',
    'updated',
  ]

  for (let i = 0; i < columnNames.length; i++) {
    const col = columnNames[i]
    try {
      const val = registro.get(col)
      if (val !== undefined && val !== null) {
        rawData[col] = val
      }
    } catch (_) {}
  }

  // Campos JSON especiais
  try {
    rawData.checklist = registro.get('checklist') || null
  } catch (_) {}
  try {
    rawData.fotos = registro.get('fotos') || []
  } catch (_) {}
  try {
    rawData.foto_medidor = registro.getString('foto_medidor') || ''
  } catch (_) {}
  try {
    rawData.fotos_metadados = registro.get('fotos_metadados') || []
  } catch (_) {}
  try {
    rawData.blocos_relatorio = registro.get('blocos_relatorio') || null
  } catch (_) {}

  rawData.collectionName = sourceCollection
  rawData.expand = {
    cliente_id: cliente
      ? {
          id: cliente.id,
          nome: cliente.getString('nome'),
          nome_fantasia: cliente.getString('nome_fantasia'),
          razao_social: cliente.getString('razao_social'),
          cnpj: cliente.getString('cnpj'),
          cpf: cliente.getString('cpf'),
          endereco: cliente.getString('endereco'),
          numero: cliente.getString('numero'),
          bairro: cliente.getString('bairro'),
          cidade: cliente.getString('cidade'),
          estado: cliente.getString('estado'),
          cep: cliente.getString('cep'),
          telefone: cliente.getString('telefone'),
          whatsapp: cliente.getString('whatsapp'),
          email: cliente.getString('email'),
          titular_nome: cliente.getString('titular_nome'),
          titular_cpf: cliente.getString('titular_cpf'),
          titular_telefone: cliente.getString('titular_telefone'),
          titular_email: cliente.getString('titular_email'),
          uc: cliente.getString('uc'),
        }
      : null,
    usina_id: usina
      ? {
          id: usina.id,
          nome: usina.getString('nome'),
          endereco: usina.getString('endereco'),
          cidade: usina.getString('cidade'),
          estado: usina.getString('estado'),
          potencia_kwp: usina.getFloat('potencia_kwp'),
          qtd_modulos: usina.getFloat('qtd_modulos'),
          quantidade_placas: usina.getFloat('quantidade_placas') || usina.getFloat('qtd_modulos'),
          marca_placas: usina.getString('marca_placas') || usina.getString('fabricante_modulos'),
          fabricante_modulos: usina.getString('fabricante_modulos'),
          modelo_modulos: usina.getString('modelo_modulos'),
          fabricante_inversores: usina.getString('fabricante_inversores'),
          modelo_inversores: usina.getString('modelo_inversores'),
          inversores_info: usina.getString('inversores_info'),
          geracao_estimada_kwh: usina.getFloat('geracao_estimada_kwh'),
          numero_uc: usina.getString('numero_uc'),
        }
      : null,
    responsavel_id: responsavelObj,
    responsavel_usuario_id: responsavelObj,
  }

  // Serialização do cliente
  let clienteData = null
  if (cliente) {
    clienteData = rawData.expand.cliente_id
  }

  // Serialização da usina
  let usinaData = null
  if (usina) {
    usinaData = rawData.expand.usina_id
  }

  // Serialização do contrato O&M
  let contratoOMData = null
  if (contratoOM) {
    contratoOMData = {
      id: contratoOM.id,
      cliente_id: contratoOM.getString('cliente_id'),
      plano: contratoOM.getString('plano'),
      status: contratoOM.getString('status'),
      status_encerramento: contratoOM.getString('status_encerramento'),
      numero_contrato: contratoOM.getString('numero_contrato'),
      valor_mensal: contratoOM.getFloat('valor_mensal'),
      valor_anual: contratoOM.getFloat('valor_anual'),
      data_inicio: contratoOM.getString('data_inicio'),
      data_vencimento: contratoOM.getString('data_vencimento'),
      proxima_atividade_data: contratoOM.getString('proxima_atividade_data'),
      proxima_atividade_titulo: contratoOM.getString('proxima_atividade_titulo'),
    }
  }

  return e.json(200, {
    ok: true,
    registro: rawData,
    cliente: clienteData,
    usina: usinaData,
    contratoOM: contratoOMData,
    temContratoOMAtivo: temContratoOMAtivo,
    equipamentosUsina: equipamentosUsina,
    ativosUsina: ativosUsina,
  })
})

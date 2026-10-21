import pb from '@/lib/pocketbase/client'
import type { PropostaCarregador, Cliente } from '@/types/crm'

export interface ItemMaterialInfraestrutura {
  id: string
  descricao: string
  quantidade: number
  valor_unitario: number
}

export interface SalvarPropostaCarregadorInput {
  id?: string
  numero_proposta?: string
  cliente_id: string
  negocio_id?: string
  data_emissao?: string
  validade_dias?: number
  status?: PropostaCarregador['status']
  autor?: string

  // Dados do cliente e instalação
  cliente_nome?: string
  cliente_documento?: string
  cliente_contato?: string
  endereco_instalacao?: string
  responsavel_acompanhante?: string
  tipo_local?: string

  // Projeção de economia
  custo_proprio_min?: number
  custo_proprio_max?: number
  custo_publico_min?: number
  custo_publico_max?: number

  // Modo do carregador: 'padrao_dois_modelos' (7,4 kW e 22 kW) ou 'adquirido' (cliente já possui)
  modo_carregador?: 'padrao_dois_modelos' | 'adquirido'
  carregador_adquirido?: boolean
  equipamento_id?: string

  // Opções de carregador
  opcao_selecionada?: string
  opcao1_titulo?: string
  opcao1_potencia?: string
  opcao1_tensao?: string
  opcao1_tempo_recarga?: string
  opcao1_valor?: number

  opcao2_titulo?: string
  opcao2_potencia?: string
  opcao2_tensao?: string
  opcao2_tempo_recarga?: string
  opcao2_valor?: number

  // Carregador específico selecionado
  carregador_modelo?: string
  carregador_potencia?: string
  carregador_valor?: number

  // Lista de materiais da infraestrutura de instalação
  materiais_infraestrutura?: ItemMaterialInfraestrutura[]
  subtotal_materiais?: number

  // Serviços unificados (instalação + engenharia)
  valor_servicos?: number
  valor_servicos_instalacao?: number
  valor_servicos_engenharia?: number

  // Investimento e Condições Comerciais (compatibilidade e consolidação)
  valor_estacao_materiais?: number
  valor_total?: number
  condicoes_pagamento?: string

  // Prazos, Garantia & Engenheiro Responsável
  prazo_execucao?: string
  garantias?: string
  premissas_orcamento_previo?: string
  engenheiro_nome?: string
  engenheiro_crea?: string

  observacoes?: string
  dados_json?: Record<string, unknown>
}

export const MATERIAIS_INFRAESTRUTURA_PADRAO: ItemMaterialInfraestrutura[] = [
  {
    id: 'mat-1',
    descricao: 'Cabo flexível antichama de cobre (750V/1kV) 10mm² — até 15 metros',
    quantidade: 1,
    valor_unitario: 890,
  },
  {
    id: 'mat-2',
    descricao: 'Quadro de distribuição sobrepor termoplástico estanque IP65 com trilho DIN',
    quantidade: 1,
    valor_unitario: 420,
  },
  {
    id: 'mat-3',
    descricao: 'Disjuntor termomagnético bipolar/tripolar curva C conforme NBR 5410',
    quantidade: 1,
    valor_unitario: 350,
  },
  {
    id: 'mat-4',
    descricao: 'Interruptor Diferencial Residual (DR Tipo A / sensor DC 6mA integrado)',
    quantidade: 1,
    valor_unitario: 1250,
  },
  {
    id: 'mat-5',
    descricao: 'Dispositivo Protetor de Surtos (DPS Classe II 20/40kA multipolar)',
    quantidade: 1,
    valor_unitario: 680,
  },
  {
    id: 'mat-6',
    descricao: 'Eletrodutos rígidos/metálicos aparentes, conexões, curvas e abraçadeiras',
    quantidade: 1,
    valor_unitario: 580,
  },
  {
    id: 'mat-7',
    descricao: 'Kit de fixação mecânica, prensa-cabos estanques e barra de aterramento',
    quantidade: 1,
    valor_unitario: 380,
  },
]

/**
 * Carrega a lista de propostas de carregadores veiculares com expansão de cliente e negócio.
 */
export async function getPropostasCarregador(): Promise<PropostaCarregador[]> {
  try {
    const records = await pb.collection('propostas_carregador').getFullList<PropostaCarregador>({
      sort: '-created',
      expand: 'cliente_id,negocio_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar propostas de carregador veicular:', err)
    return []
  }
}

/**
 * Cria ou atualiza uma proposta de carregador veicular no PocketBase.
 */
export async function salvarPropostaCarregador(
  input: SalvarPropostaCarregadorInput,
): Promise<PropostaCarregador> {
  const { id, ...dadosBrutos } = input

  // Garante que o valor unificado de serviços esteja consistente:
  // Se valor_servicos foi fornecido, usa ele; senão soma instalação + engenharia; default 3050.
  const valorServicosTotal =
    typeof dadosBrutos.valor_servicos === 'number'
      ? dadosBrutos.valor_servicos
      : (typeof dadosBrutos.valor_servicos_instalacao === 'number'
          ? dadosBrutos.valor_servicos_instalacao
          : 1850) +
        (typeof dadosBrutos.valor_servicos_engenharia === 'number'
          ? dadosBrutos.valor_servicos_engenharia
          : 1200)

  // Subtotal de materiais recalculado fielmente
  const materiaisLista = Array.isArray(dadosBrutos.materiais_infraestrutura)
    ? dadosBrutos.materiais_infraestrutura
    : []
  const subtotalMateriais =
    typeof dadosBrutos.subtotal_materiais === 'number'
      ? dadosBrutos.subtotal_materiais
      : materiaisLista.reduce(
          (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0),
          0,
        )

  // Serializa TODOS os campos vivos no dados_json para que absolutamente NADA se perca ao recarregar
  const dadosJsonPayload: Record<string, unknown> = {
    ...(dadosBrutos.dados_json || {}),
    modo_carregador: dadosBrutos.modo_carregador,
    carregador_adquirido: dadosBrutos.carregador_adquirido,
    equipamento_id: dadosBrutos.equipamento_id,
    carregador_modelo: dadosBrutos.carregador_modelo,
    carregador_potencia: dadosBrutos.carregador_potencia,
    carregador_valor: dadosBrutos.carregador_valor,
    materiais_infraestrutura: materiaisLista,
    subtotal_materiais: subtotalMateriais,
    valor_servicos: valorServicosTotal,
    valor_servicos_instalacao:
      typeof dadosBrutos.valor_servicos_instalacao === 'number'
        ? dadosBrutos.valor_servicos_instalacao
        : valorServicosTotal,
    valor_servicos_engenharia:
      typeof dadosBrutos.valor_servicos_engenharia === 'number'
        ? dadosBrutos.valor_servicos_engenharia
        : 0,
    opcao_selecionada: dadosBrutos.opcao_selecionada,
    opcao1_titulo: dadosBrutos.opcao1_titulo,
    opcao1_potencia: dadosBrutos.opcao1_potencia,
    opcao1_tensao: dadosBrutos.opcao1_tensao,
    opcao1_tempo_recarga: dadosBrutos.opcao1_tempo_recarga,
    opcao1_valor: dadosBrutos.opcao1_valor,
    opcao2_titulo: dadosBrutos.opcao2_titulo,
    opcao2_potencia: dadosBrutos.opcao2_potencia,
    opcao2_tensao: dadosBrutos.opcao2_tensao,
    opcao2_tempo_recarga: dadosBrutos.opcao2_tempo_recarga,
    opcao2_valor: dadosBrutos.opcao2_valor,
    custo_proprio_min: dadosBrutos.custo_proprio_min,
    custo_proprio_max: dadosBrutos.custo_proprio_max,
    custo_publico_min: dadosBrutos.custo_publico_min,
    custo_publico_max: dadosBrutos.custo_publico_max,
    condicoes_pagamento: dadosBrutos.condicoes_pagamento,
    prazo_execucao: dadosBrutos.prazo_execucao,
    garantias: dadosBrutos.garantias,
    premissas_orcamento_previo: dadosBrutos.premissas_orcamento_previo,
    engenheiro_nome: dadosBrutos.engenheiro_nome,
    engenheiro_crea: dadosBrutos.engenheiro_crea,
    valor_total: dadosBrutos.valor_total,
    valor_estacao_materiais: dadosBrutos.valor_estacao_materiais,
  }

  const dadosProntos = {
    ...dadosBrutos,
    subtotal_materiais: subtotalMateriais,
    valor_servicos: valorServicosTotal,
    // Garante preenchimento nos campos de coluna nativos (retrocompatibilidade PocketBase)
    valor_servicos_engenharia: valorServicosTotal,
    valor_estacao_materiais:
      typeof dadosBrutos.valor_estacao_materiais === 'number'
        ? dadosBrutos.valor_estacao_materiais
        : subtotalMateriais,
    dados_json: dadosJsonPayload,
  }

  if (id) {
    return await pb
      .collection('propostas_carregador')
      .update<PropostaCarregador>(id, dadosProntos, {
        expand: 'cliente_id,negocio_id',
      })
  }

  // Gera número sequencial se não fornecido (ex: PROP-2025-084)
  if (!dadosProntos.numero_proposta) {
    const ano = new Date().getFullYear()
    const rand = Math.floor(100 + Math.random() * 900)
    dadosProntos.numero_proposta = `PROP-${ano}-${rand}`
  }

  if (!dadosProntos.status) {
    dadosProntos.status = 'Em elaboração'
  }

  return await pb.collection('propostas_carregador').create<PropostaCarregador>(dadosProntos, {
    expand: 'cliente_id,negocio_id',
  })
}

/**
 * Atualiza o status de uma proposta de carregador veicular.
 */
export async function updateStatusPropostaCarregador(
  id: string,
  novoStatus: PropostaCarregador['status'],
): Promise<PropostaCarregador> {
  return await pb
    .collection('propostas_carregador')
    .update<PropostaCarregador>(id, { status: novoStatus }, { expand: 'cliente_id,negocio_id' })
}

/**
 * Exclui uma proposta de carregador veicular.
 */
export async function deletePropostaCarregador(id: string): Promise<boolean> {
  try {
    await pb.collection('propostas_carregador').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir proposta de carregador veicular:', err)
    throw err
  }
}

/**
 * Converte um registro de PropostaCarregador (PocketBase) em SalvarPropostaCarregadorInput,
 * reconstituindo fielmente materiais_infraestrutura, modo_carregador, carregador_adquirido,
 * subtotal_materiais, valor_servicos e todos os campos salvos em dados_json.
 */
/**
 * Converte SalvarPropostaCarregadorInput de volta para PropostaCarregador (para visualizadores e modais de envio).
 */
export function converterInputParaPropostaCarregador(
  formData: SalvarPropostaCarregadorInput,
  clienteId?: string,
): PropostaCarregador {
  const dJson = formData.dados_json || {
    materiais_infraestrutura: formData.materiais_infraestrutura,
    subtotal_materiais: formData.subtotal_materiais,
    modo_carregador: formData.modo_carregador,
    carregador_adquirido: formData.carregador_adquirido,
    equipamento_id: formData.equipamento_id,
    carregador_modelo: formData.carregador_modelo,
    carregador_potencia: formData.carregador_potencia,
    carregador_valor: formData.carregador_valor,
    valor_servicos: formData.valor_servicos,
    valor_servicos_instalacao: formData.valor_servicos_instalacao,
    valor_servicos_engenharia: formData.valor_servicos_engenharia,
  }

  return {
    id: formData.id || '',
    collectionId: 'propostas_carregador',
    collectionName: 'propostas_carregador',
    numero_proposta: formData.numero_proposta,
    cliente_id: clienteId || formData.cliente_id || '',
    negocio_id: formData.negocio_id,
    data_emissao: formData.data_emissao,
    validade_dias: formData.validade_dias,
    status: (formData.status as PropostaCarregador['status']) || 'Em elaboração',
    autor: formData.autor,

    cliente_nome: formData.cliente_nome,
    cliente_documento: formData.cliente_documento,
    cliente_contato: formData.cliente_contato,
    endereco_instalacao: formData.endereco_instalacao,
    responsavel_acompanhante: formData.responsavel_acompanhante,
    tipo_local: formData.tipo_local,

    custo_proprio_min: formData.custo_proprio_min,
    custo_proprio_max: formData.custo_proprio_max,
    custo_publico_min: formData.custo_publico_min,
    custo_publico_max: formData.custo_publico_max,

    opcao_selecionada: formData.opcao_selecionada,
    opcao1_titulo: formData.opcao1_titulo,
    opcao1_potencia: formData.opcao1_potencia,
    opcao1_tensao: formData.opcao1_tensao,
    opcao1_tempo_recarga: formData.opcao1_tempo_recarga,
    opcao1_valor: formData.opcao1_valor,

    opcao2_titulo: formData.opcao2_titulo,
    opcao2_potencia: formData.opcao2_potencia,
    opcao2_tensao: formData.opcao2_tensao,
    opcao2_tempo_recarga: formData.opcao2_tempo_recarga,
    opcao2_valor: formData.opcao2_valor,

    valor_estacao_materiais: formData.valor_estacao_materiais,
    valor_servicos: formData.valor_servicos,
    valor_servicos_instalacao: formData.valor_servicos_instalacao,
    valor_servicos_engenharia: formData.valor_servicos_engenharia,
    valor_total: formData.valor_total,
    condicoes_pagamento: formData.condicoes_pagamento,

    prazo_execucao: formData.prazo_execucao,
    garantias: formData.garantias,
    premissas_orcamento_previo: formData.premissas_orcamento_previo,
    engenheiro_nome: formData.engenheiro_nome,
    engenheiro_crea: formData.engenheiro_crea,
    observacoes: formData.observacoes,
    dados_json: dJson,
    created: '',
    updated: '',
  }
}

export function normalizarPropostaCarregadorParaInput(
  p: PropostaCarregador,
): SalvarPropostaCarregadorInput {
  const dJson = (p.dados_json || {}) as Record<string, any>
  const modo =
    dJson.modo_carregador || (dJson.carregador_adquirido ? 'adquirido' : 'padrao_dois_modelos')
  const adquirido = Boolean(dJson.carregador_adquirido ?? modo === 'adquirido')

  const mats: ItemMaterialInfraestrutura[] = Array.isArray(dJson.materiais_infraestrutura)
    ? dJson.materiais_infraestrutura
    : [...MATERIAIS_INFRAESTRUTURA_PADRAO]

  const subtotalMats =
    typeof dJson.subtotal_materiais === 'number'
      ? dJson.subtotal_materiais
      : mats.reduce(
          (acc, it) => acc + (Number(it.quantidade) || 0) * (Number(it.valor_unitario) || 0),
          0,
        )

  // Serviços unificados (instalação e engenharia consolidados em um item só)
  const servTotal =
    typeof dJson.valor_servicos === 'number'
      ? dJson.valor_servicos
      : typeof p.valor_servicos === 'number'
        ? p.valor_servicos
        : (typeof dJson.valor_servicos_instalacao === 'number'
            ? dJson.valor_servicos_instalacao
            : typeof p.valor_servicos_instalacao === 'number'
              ? p.valor_servicos_instalacao
              : 1850) +
          (typeof dJson.valor_servicos_engenharia === 'number'
            ? dJson.valor_servicos_engenharia
            : typeof p.valor_servicos_engenharia === 'number'
              ? p.valor_servicos_engenharia
              : 1200)

  const servInstalacao =
    typeof dJson.valor_servicos_instalacao === 'number'
      ? dJson.valor_servicos_instalacao
      : typeof p.valor_servicos_instalacao === 'number'
        ? p.valor_servicos_instalacao
        : servTotal

  const servEngenharia =
    typeof dJson.valor_servicos_engenharia === 'number'
      ? dJson.valor_servicos_engenharia
      : typeof p.valor_servicos_engenharia === 'number'
        ? p.valor_servicos_engenharia
        : 0

  const carregadorValor = adquirido
    ? 0
    : typeof dJson.carregador_valor === 'number'
      ? dJson.carregador_valor
      : (p.opcao2_valor ?? 9450)

  const totalRecalculado =
    typeof p.valor_total === 'number' && p.valor_total > 0
      ? p.valor_total
      : carregadorValor + subtotalMats + servTotal

  return {
    id: p.id,
    numero_proposta: p.numero_proposta,
    cliente_id: p.cliente_id,
    negocio_id: p.negocio_id,
    data_emissao: p.data_emissao,
    validade_dias: p.validade_dias ?? 10,
    status: p.status,
    autor: p.autor,

    cliente_nome: p.cliente_nome,
    cliente_documento: p.cliente_documento,
    cliente_contato: p.cliente_contato,
    endereco_instalacao: p.endereco_instalacao,
    responsavel_acompanhante: p.responsavel_acompanhante,
    tipo_local: p.tipo_local,

    custo_proprio_min: p.custo_proprio_min ?? 18,
    custo_proprio_max: p.custo_proprio_max ?? 25,
    custo_publico_min: p.custo_publico_min ?? 70,
    custo_publico_max: p.custo_publico_max ?? 90,

    modo_carregador: modo,
    carregador_adquirido: adquirido,
    equipamento_id: dJson.equipamento_id || '',
    carregador_modelo: dJson.carregador_modelo || p.opcao2_titulo || 'Wallbox AC 22 kW',
    carregador_potencia: dJson.carregador_potencia || p.opcao2_potencia || '22 kW (32A)',
    carregador_valor: carregadorValor,

    opcao_selecionada: p.opcao_selecionada ?? 'ambas',
    opcao1_titulo: p.opcao1_titulo ?? 'Opção 01: Wallbox AC 7,4 kW',
    opcao1_potencia: p.opcao1_potencia ?? '7,4 kW (32A)',
    opcao1_tensao: p.opcao1_tensao ?? 'Monofásico / Bifásico 220V',
    opcao1_tempo_recarga: p.opcao1_tempo_recarga ?? '~7h a 8h (bateria 50–60 kWh)',
    opcao1_valor: p.opcao1_valor ?? 6890,

    opcao2_titulo: p.opcao2_titulo ?? 'Opção 02: Wallbox AC 22 kW',
    opcao2_potencia: p.opcao2_potencia ?? '22 kW (32A trifásico)',
    opcao2_tensao: p.opcao2_tensao ?? 'Trifásico 380V (ou 11kW em 220V)',
    opcao2_tempo_recarga: p.opcao2_tempo_recarga ?? '~3h a 4h (bateria 50–60 kWh)',
    opcao2_valor: p.opcao2_valor ?? 9450,

    materiais_infraestrutura: mats,
    subtotal_materiais: subtotalMats,
    valor_servicos: servTotal,
    valor_servicos_instalacao: servInstalacao,
    valor_servicos_engenharia: servEngenharia,

    valor_estacao_materiais: p.valor_estacao_materiais ?? subtotalMats + carregadorValor,
    valor_total: totalRecalculado,
    condicoes_pagamento: p.condicoes_pagamento,

    prazo_execucao: p.prazo_execucao,
    garantias: p.garantias,
    premissas_orcamento_previo: p.premissas_orcamento_previo,
    engenheiro_nome: p.engenheiro_nome,
    engenheiro_crea: p.engenheiro_crea,
    observacoes: p.observacoes,
    dados_json: dJson,
  }
}

/**
 * Prepara valores padrão fiéis ao modelo de anexo ("Modelo de Proposta — Carregador Veicular Delfos")
 * preenchendo automaticamente com os dados do cliente se disponíveis.
 */
export function gerarValoresIniciaisPropostaCarregador(
  cliente?: Cliente | null,
  autorNome: string = 'Eng. Eletricista João Victor Bagetti Fuchs',
): SalvarPropostaCarregadorInput {
  const hoje = new Date()
  const dataIso = hoje.toISOString().split('T')[0]
  const ano = hoje.getFullYear()
  const randNum = String(Math.floor(10 + Math.random() * 90)).padStart(3, '0')

  const doc = cliente?.cnpj || cliente?.cpf || '[00.000.000/0001-00]'
  const tel = cliente?.whatsapp || cliente?.telefone || '(54) 99999-0000'
  const contatoStr = [cliente?.contato || cliente?.contato_principal, tel]
    .filter(Boolean)
    .join(' — ')

  const enderecoPartes = [
    cliente?.endereco,
    cliente?.numero ? `nº ${cliente.numero}` : '',
    cliente?.bairro ? `Bairro ${cliente.bairro}` : '',
    cliente?.cidade || 'Erechim',
    cliente?.estado || 'RS',
  ].filter(Boolean)

  const enderecoFinal =
    enderecoPartes.length > 0
      ? enderecoPartes.join(' — ')
      : '[Rua Exemplo, nº 123 — Bairro, Erechim/RS]'

  return {
    numero_proposta: `PROP-${ano}-${randNum}`,
    cliente_id: cliente?.id || '',
    data_emissao: dataIso,
    validade_dias: 10,
    status: 'Em elaboração',
    autor: autorNome,

    // Seção 1
    cliente_nome: cliente?.razao_social || cliente?.nome || '[Nome do Cliente / Empresa Ltda]',
    cliente_documento: doc,
    cliente_contato: contatoStr || '[Nome do Contato — (54) 99999-0000]',
    endereco_instalacao: enderecoFinal,
    responsavel_acompanhante: '[Engº ou Gestor Responsável]',
    tipo_local:
      cliente?.tipo_cliente === 'comercial'
        ? 'Comercial'
        : cliente?.tipo_cliente === 'industrial'
          ? 'Industrial'
          : cliente?.tipo_cliente === 'rural'
            ? 'Rural'
            : 'Residencial / Condomínio',

    // Seção 2
    custo_proprio_min: 18,
    custo_proprio_max: 25,
    custo_publico_min: 70,
    custo_publico_max: 90,

    // Seção 3
    modo_carregador: 'padrao_dois_modelos',
    carregador_adquirido: false,
    equipamento_id: '',
    carregador_modelo: 'Wallbox AC 22 kW Inteligente',
    carregador_potencia: '22 kW (32A)',
    carregador_valor: 9450,

    opcao_selecionada: 'ambas',
    opcao1_titulo: 'Opção 01: Wallbox AC 7,4 kW',
    opcao1_potencia: '7,4 kW (32A)',
    opcao1_tensao: 'Monofásico / Bifásico 220V',
    opcao1_tempo_recarga: '~7h a 8h (bateria 50–60 kWh)',
    opcao1_valor: 6890,

    opcao2_titulo: 'Opção 02: Wallbox AC 22 kW',
    opcao2_potencia: '22 kW (32A trifásico)',
    opcao2_tensao: 'Trifásico 380V (ou 11kW em 220V)',
    opcao2_tempo_recarga: '~3h a 4h (bateria 50–60 kWh)',
    opcao2_valor: 9450,

    // Lista de Materiais da Infraestrutura
    materiais_infraestrutura: [...MATERIAIS_INFRAESTRUTURA_PADRAO],
    subtotal_materiais: 4550,

    // Serviços unificados (instalação e engenharia consolidados em um item só)
    valor_servicos: 3050, // 1850 + 1200
    valor_servicos_instalacao: 1850,
    valor_servicos_engenharia: 1200,

    // Seção 5 (Valores de compatibilidade)
    valor_estacao_materiais: 5950,
    valor_total: 7600, // Subtotal materiais (4550) + Serviços unificados (3050) = 7600
    condicoes_pagamento:
      '50% de sinal no aceite desta proposta e 50% no comissionamento e entrega técnica operacional. Opção de parcelamento via cartão em até 12x (consulte taxas) ou faturamento direto PJ sob análise prévia.',

    // Seção 6
    prazo_execucao:
      'Instalação concluída em até 5 dias úteis após a assinatura e liberação do local de passagem. Instalação física realizada em 1 único dia útil com mínimo impacto na rotina.',
    garantias:
      '1 ano integral de garantia da Delfos Engenharia para toda a mão de obra e infraestrutura elétrica. Equipamento carregador com garantia de fábrica (12 a 24 meses).',
    premissas_orcamento_previo:
      'Disponível sob orçamento prévio após vistoria: obras civis de alvenaria/abertura de piso, acréscimo de potência junto à concessionária e cabeamentos excedentes a 15 metros.',

    // Seção 7
    engenheiro_nome: 'Eng. Eletricista João Victor Bagetti Fuchs',
    engenheiro_crea: 'CREA-RS 151894',

    observacoes: '',
  }
}

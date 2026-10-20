import pb from '@/lib/pocketbase/client'
import type { PropostaCarregador, Cliente } from '@/types/crm'

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

  // Investimento e Condições Comerciais
  valor_estacao_materiais?: number
  valor_servicos_engenharia?: number
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
  const { id, ...dados } = input

  if (id) {
    return await pb.collection('propostas_carregador').update<PropostaCarregador>(id, dados, {
      expand: 'cliente_id,negocio_id',
    })
  }

  // Gera número sequencial se não fornecido (ex: PROP-2025-084)
  if (!dados.numero_proposta) {
    const ano = new Date().getFullYear()
    const rand = Math.floor(100 + Math.random() * 900)
    dados.numero_proposta = `PROP-${ano}-${rand}`
  }

  if (!dados.status) {
    dados.status = 'Em elaboração'
  }

  return await pb.collection('propostas_carregador').create<PropostaCarregador>(dados, {
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

    // Seção 5
    valor_estacao_materiais: 5950,
    valor_servicos_engenharia: 2450,
    valor_total: 8400,
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

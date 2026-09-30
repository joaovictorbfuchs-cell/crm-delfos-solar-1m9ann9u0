import pb from '@/lib/pocketbase/client'
import type {
  Cliente,
  ClienteStatus,
  ContatoAdicional,
  ContatoUnico,
  PapelContatoUnico,
} from '@/types/crm'
import { cleanPhoneDigits } from '@/lib/formatters'

/**
 * Aplica a regra de ouro do WhatsApp autoritativo da Delfos Solar:
 * - O WhatsApp é o número autoritativo do cliente/contato.
 * - Quando telefone e WhatsApp divergirem, o telefone deve ser igualado ao WhatsApp (nunca o contrário).
 * - O telefone só é copiado para o WhatsApp quando o WhatsApp está vazio.
 */
export function aplicarRegraWhatsAppAutoritativo(dados: { telefone?: string; whatsapp?: string }): {
  telefone: string
  whatsapp: string
} {
  // Regra atualizada: telefone e WhatsApp agora são independentes e mantêm seus próprios valores
  return {
    whatsapp: (dados.whatsapp || '').trim(),
    telefone: (dados.telefone || '').trim(),
  }
}

/**
 * Normaliza número de telefone/WhatsApp para chave de comparação única.
 * Remove prefixo 55 se houver mais de 11 dígitos e descarta zeros como "00000000000".
 */
export function normalizarChaveTelefone(tel?: string | null): string {
  if (!tel) return ''
  let digits = cleanPhoneDigits(tel)
  if (!digits || digits === '00000000000' || digits.length < 8) return ''
  if (digits.length >= 12 && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  return digits
}

/**
 * Determina o papel do contato baseado no status do cliente no funil comercial.
 * Clientes com status comercial 'Fechado' recebem papel 'cliente'.
 * Oportunidades em funil (Novo Lead, Negociação, Orçamento, Levantamento, etc.) recebem papel 'lead'.
 */
export function determinarPapelCliente(status?: ClienteStatus | string): PapelContatoUnico {
  if (!status) return 'cliente'
  const s = status.toLowerCase()
  if (s.includes('fechado')) {
    return 'cliente'
  }
  return 'lead'
}

/**
 * Mapeia o papel de um contato adicional para os papéis da tela unificada.
 */
export function normalizarPapelContatoAdicional(
  papel?: string | null,
  cargo?: string | null,
): PapelContatoUnico {
  const p = (papel || '').toLowerCase().trim()
  const c = (cargo || '').toLowerCase().trim()

  if (
    p === 'tecnico' ||
    c.includes('tecnico') ||
    c.includes('instalador') ||
    c.includes('engenheiro')
  ) {
    return 'tecnico'
  }
  if (p === 'financeiro' || c.includes('financeiro') || c.includes('contabil')) {
    return 'financeiro'
  }
  if (p === 'responsavel' || c.includes('gerente') || c.includes('responsavel')) {
    return 'responsavel'
  }
  if (p === 'principal' || p === 'cliente') {
    return 'cliente'
  }
  if (
    c.includes('familiar') ||
    c.includes('conjuge') ||
    c.includes('esposa') ||
    c.includes('filho')
  ) {
    return 'familiar'
  }
  if (p === 'outro') return 'outro'
  return 'outro'
}

export interface ConsolidarContatosOptions {
  contatosCadastrados: ContatoUnico[]
  clientes: Cliente[]
  contatosAdicionais: ContatoAdicional[]
}

/**
 * Consolida as 3 fontes em uma única lista deduplicada:
 * 1. Coleção `contatos` (registros persistidos no cadastro único)
 * 2. Coleção `clientes` (titular/contato principal dos clientes da base viva e leads)
 * 3. Coleção `contatos_adicionais` (contatos secundários vinculados aos clientes)
 *
 * Aplica deduplicação autoritativa por WhatsApp (ou nome + telefone quando WhatsApp ausente),
 * igualando o telefone ao WhatsApp em caso de divergência.
 */
export function consolidarContatosDeduplicados(params: ConsolidarContatosOptions): ContatoUnico[] {
  const { contatosCadastrados, clientes, contatosAdicionais } = params

  const resultado: ContatoUnico[] = []
  // Mapeamentos para deduplicação rápida
  const mapPorWhatsApp = new Map<string, ContatoUnico>()
  const mapPorNomeTelefone = new Map<string, ContatoUnico>()

  const registrarContato = (contato: ContatoUnico): void => {
    resultado.push(contato)
    const chaveWpp = normalizarChaveTelefone(contato.whatsapp)
    if (chaveWpp) {
      mapPorWhatsApp.set(chaveWpp, contato)
    }
    const chaveTel = normalizarChaveTelefone(contato.telefone)
    if (chaveTel) {
      const chaveNomeTel = `${(contato.nome || '').toLowerCase().trim()}|${chaveTel}`
      mapPorNomeTelefone.set(chaveNomeTel, contato)
    }
  }

  const tentarMesclarNoExistente = (candidato: {
    nome: string
    telefone: string
    whatsapp: string
    clienteId?: string
    email?: string
    cargo?: string
  }): ContatoUnico | null => {
    const chaveWpp = normalizarChaveTelefone(candidato.whatsapp)
    if (chaveWpp && mapPorWhatsApp.has(chaveWpp)) {
      const existente = mapPorWhatsApp.get(chaveWpp)!
      if (candidato.clienteId) {
        const vincs = Array.isArray(existente.clientes_vinculados)
          ? existente.clientes_vinculados
          : []
        if (!vincs.includes(candidato.clienteId)) {
          existente.clientes_vinculados = [...vincs, candidato.clienteId]
        }
      }
      if (!existente.email && candidato.email) {
        existente.email = candidato.email
      }
      if (!existente.cargo && candidato.cargo) {
        existente.cargo = candidato.cargo
      }
      return existente
    }

    const chaveTel = normalizarChaveTelefone(candidato.telefone)
    if (chaveTel) {
      const chaveNomeTel = `${candidato.nome.toLowerCase().trim()}|${chaveTel}`
      if (mapPorNomeTelefone.has(chaveNomeTel)) {
        const existente = mapPorNomeTelefone.get(chaveNomeTel)!
        if (candidato.clienteId) {
          const vincs = Array.isArray(existente.clientes_vinculados)
            ? existente.clientes_vinculados
            : []
          if (!vincs.includes(candidato.clienteId)) {
            existente.clientes_vinculados = [...vincs, candidato.clienteId]
          }
        }
        if (!existente.email && candidato.email) {
          existente.email = candidato.email
        }
        if (!existente.cargo && candidato.cargo) {
          existente.cargo = candidato.cargo
        }
        return existente
      }
    }

    return null
  }

  // 1. Inicia com os contatos da coleção unificada `contatos`
  for (const c of contatosCadastrados) {
    const telefones = aplicarRegraWhatsAppAutoritativo({
      telefone: c.telefone,
      whatsapp: c.whatsapp,
    })
    const contatoNormalizado: ContatoUnico = {
      ...c,
      telefone: telefones.telefone,
      whatsapp: telefones.whatsapp,
      clientes_vinculados: Array.isArray(c.clientes_vinculados) ? [...c.clientes_vinculados] : [],
      negocios_vinculados: Array.isArray(c.negocios_vinculados) ? [...c.negocios_vinculados] : [],
    }
    registrarContato(contatoNormalizado)
  }

  // 2. Clientes vivos (clientes e leads do CRM)
  for (const cli of clientes) {
    if (!cli.nome) continue
    const telefones = aplicarRegraWhatsAppAutoritativo({
      telefone: cli.telefone,
      whatsapp: cli.whatsapp,
    })

    const mesclado = tentarMesclarNoExistente({
      nome: cli.nome,
      telefone: telefones.telefone,
      whatsapp: telefones.whatsapp,
      clienteId: cli.id,
      email: cli.email,
    })

    if (!mesclado) {
      const papel = determinarPapelCliente(cli.status)
      const novoVirtual: ContatoUnico = {
        id: `cli_${cli.id}`,
        collectionId: 'pbc_3276878597',
        collectionName: 'contatos',
        nome: cli.nome.trim(),
        telefone: telefones.telefone,
        whatsapp: telefones.whatsapp,
        email: cli.email || '',
        papel,
        cargo: cli.contato_principal || cli.contato || '',
        observacoes: cli.observacoes || '',
        clientes_vinculados: [cli.id],
        negocios_vinculados: [],
        origem_registro: 'cliente_base_viva',
        created: cli.created || new Date().toISOString(),
        updated: cli.updated || new Date().toISOString(),
      }
      registrarContato(novoVirtual)
    }
  }

  // 3. Contatos adicionais vinculados aos clientes
  for (const ca of contatosAdicionais) {
    if (!ca.nome) continue
    const telefones = aplicarRegraWhatsAppAutoritativo({
      telefone: ca.telefone,
      whatsapp: ca.is_whatsapp ? ca.telefone : '',
    })

    const mesclado = tentarMesclarNoExistente({
      nome: ca.nome,
      telefone: telefones.telefone,
      whatsapp: telefones.whatsapp,
      clienteId: ca.cliente,
      email: ca.email,
      cargo: ca.cargo,
    })

    if (!mesclado) {
      const papel = normalizarPapelContatoAdicional(ca.papel, ca.cargo)
      const novoAdicional: ContatoUnico = {
        id: `ca_${ca.id}`,
        collectionId: 'pbc_3276878597',
        collectionName: 'contatos',
        nome: ca.nome.trim(),
        telefone: telefones.telefone,
        whatsapp: telefones.whatsapp,
        email: ca.email || '',
        papel,
        cargo: ca.cargo || '',
        observacoes: '',
        clientes_vinculados: ca.cliente ? [ca.cliente] : [],
        negocios_vinculados: [],
        origem_registro: 'contato_adicional',
        created: ca.created || new Date().toISOString(),
        updated: ca.updated || new Date().toISOString(),
      }
      registrarContato(novoAdicional)
    }
  }

  return resultado
}

/**
 * Busca todos os contatos da área única (apenas registros persistidos na coleção `contatos`)
 */
export async function fetchContatosUnicos(options?: {
  busca?: string
  papel?: string
  clienteId?: string
}): Promise<ContatoUnico[]> {
  try {
    const filters: string[] = []

    if (options?.papel && options.papel !== 'todos') {
      filters.push(`papel = '${options.papel}'`)
    }

    if (options?.clienteId && options.clienteId !== 'todos') {
      filters.push(`clientes_vinculados ~ '${options.clienteId}'`)
    }

    const filterStr = filters.length > 0 ? filters.join(' && ') : undefined

    const records = await pb.collection('contatos').getFullList<ContatoUnico>({
      filter: filterStr,
      sort: '-created',
      expand: 'clientes_vinculados,negocios_vinculados',
      requestKey: null,
    })

    return records
  } catch (err) {
    console.error('Erro ao buscar contatos únicos:', err)
    return []
  }
}

/**
 * Busca e consolida todas as fontes de contatos do sistema:
 * 1. Coleção `contatos`
 * 2. Coleção `clientes` (titular/contato principal de clientes vivos e leads)
 * 3. Coleção `contatos_adicionais` (contatos secundários vinculados aos clientes)
 *
 * Aplica a regra de ouro do WhatsApp autoritativo e a deduplicação.
 */
export async function fetchContatosConsolidados(options?: {
  clientesPrecarregados?: Cliente[]
  contatosAdicionaisPrecarregados?: ContatoAdicional[]
}): Promise<ContatoUnico[]> {
  try {
    const [contatosCadastrados, clientes, contatosAdicionais] = await Promise.all([
      fetchContatosUnicos(),
      options?.clientesPrecarregados && options.clientesPrecarregados.length > 0
        ? Promise.resolve(options.clientesPrecarregados)
        : pb.collection('clientes').getFullList<Cliente>({ sort: 'nome', requestKey: null }),
      options?.contatosAdicionaisPrecarregados && options.contatosAdicionaisPrecarregados.length > 0
        ? Promise.resolve(options.contatosAdicionaisPrecarregados)
        : pb.collection('contatos_adicionais').getFullList<ContatoAdicional>({
            sort: 'created',
            requestKey: null,
          }),
    ])

    return consolidarContatosDeduplicados({
      contatosCadastrados,
      clientes,
      contatosAdicionais,
    })
  } catch (err) {
    console.error('Erro ao buscar contatos consolidados:', err)
    // Fallback gracioso para a lista de contatos únicos
    return fetchContatosUnicos()
  }
}

/**
 * Cria um novo contato no cadastro unificado
 * Também cria de forma compatível/aditiva em outros_contatos para manter 100% retrocompatível
 */
export async function createContatoUnico(dados: {
  nome: string
  telefone?: string
  whatsapp?: string
  email?: string
  papel: PapelContatoUnico | string
  cargo?: string
  observacoes?: string
  clientes_vinculados?: string[]
  negocios_vinculados?: string[]
  conversa_id?: string
  origem_registro?: string
}): Promise<ContatoUnico> {
  const telefonesNormalizados = aplicarRegraWhatsAppAutoritativo({
    telefone: dados.telefone,
    whatsapp: dados.whatsapp,
  })

  const payload = {
    nome: dados.nome.trim(),
    telefone: telefonesNormalizados.telefone,
    whatsapp: telefonesNormalizados.whatsapp,
    email: dados.email?.trim() || '',
    papel: dados.papel || 'outro',
    cargo: dados.cargo?.trim() || '',
    observacoes: dados.observacoes || '',
    clientes_vinculados: dados.clientes_vinculados || [],
    negocios_vinculados: dados.negocios_vinculados || [],
    conversa_id: dados.conversa_id || '',
    origem_registro: dados.origem_registro || 'manual',
  }

  const created = await pb.collection('contatos').create<ContatoUnico>(payload, {
    expand: 'clientes_vinculados,negocios_vinculados',
  })

  // Compatibilidade aditiva: espelha em outros_contatos se não houver cliente direto
  // (para manter qualquer código legado que consulte outros_contatos)
  try {
    let tipoContato: 'fornecedor' | 'instalador' | 'parceiro' | 'outro' = 'outro'
    if (dados.papel === 'fornecedor') tipoContato = 'fornecedor'
    else if (dados.papel === 'tecnico') tipoContato = 'instalador'
    else if (dados.papel === 'parceiro') tipoContato = 'parceiro'

    await pb.collection('outros_contatos').create({
      nome: payload.nome,
      telefone: payload.whatsapp || payload.telefone || '00000000000',
      tipo_contato: tipoContato,
      observacao: payload.observacoes || '',
      conversa_id: payload.conversa_id || '',
    })
  } catch (mirrorErr) {
    console.warn('Espelhamento em outros_contatos omitido/falhou:', mirrorErr)
  }

  return created
}

/**
 * Atualiza um contato existente aplicando a regra do WhatsApp autoritativo
 */
export async function updateContatoUnico(
  id: string,
  dados: Partial<{
    nome: string
    telefone: string
    whatsapp: string
    email: string
    papel: PapelContatoUnico | string
    cargo: string
    observacoes: string
    clientes_vinculados: string[]
    negocios_vinculados: string[]
    conversa_id: string
  }>,
): Promise<ContatoUnico> {
  const updatePayload: Record<string, any> = { ...dados }

  if (dados.telefone !== undefined || dados.whatsapp !== undefined) {
    const normalizados = aplicarRegraWhatsAppAutoritativo({
      telefone: dados.telefone,
      whatsapp: dados.whatsapp,
    })
    updatePayload.telefone = normalizados.telefone
    updatePayload.whatsapp = normalizados.whatsapp
  }

  return pb.collection('contatos').update<ContatoUnico>(id, updatePayload, {
    expand: 'clientes_vinculados,negocios_vinculados',
  })
}

/**
 * Remove um contato do cadastro único
 */
export async function deleteContatoUnico(id: string): Promise<boolean> {
  await pb.collection('contatos').delete(id)
  return true
}

/**
 * Vincula um cliente ao contato (N:N aditivo, sem duplicar)
 */
export async function vincularClienteAoContato(
  contatoId: string,
  clienteId: string,
): Promise<ContatoUnico> {
  const contato = await pb.collection('contatos').getOne<ContatoUnico>(contatoId)
  const atuais = Array.isArray(contato.clientes_vinculados) ? contato.clientes_vinculados : []

  if (!atuais.includes(clienteId)) {
    return pb.collection('contatos').update<ContatoUnico>(
      contatoId,
      {
        clientes_vinculados: [...atuais, clienteId],
      },
      {
        expand: 'clientes_vinculados,negocios_vinculados',
      },
    )
  }

  return contato
}

/**
 * Desvincula um cliente do contato
 */
export async function desvincularClienteDoContato(
  contatoId: string,
  clienteId: string,
): Promise<ContatoUnico> {
  const contato = await pb.collection('contatos').getOne<ContatoUnico>(contatoId)
  const atuais = Array.isArray(contato.clientes_vinculados) ? contato.clientes_vinculados : []
  const atualizados = atuais.filter((id) => id !== clienteId)

  return pb.collection('contatos').update<ContatoUnico>(
    contatoId,
    {
      clientes_vinculados: atualizados,
    },
    {
      expand: 'clientes_vinculados,negocios_vinculados',
    },
  )
}

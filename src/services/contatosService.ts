import pb from '@/lib/pocketbase/client'
import type { ContatoUnico, PapelContatoUnico } from '@/types/crm'

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
  const tel = (dados.telefone || '').trim()
  const wpp = (dados.whatsapp || '').trim()

  // Se WhatsApp preenchido, ele é o autoritativo: telefone se iguala a ele se divergirem
  if (wpp) {
    return {
      whatsapp: wpp,
      telefone: wpp,
    }
  }

  // Se WhatsApp vazio e telefone preenchido: copia telefone para WhatsApp
  if (tel) {
    return {
      whatsapp: tel,
      telefone: tel,
    }
  }

  return {
    whatsapp: '',
    telefone: '',
  }
}

/**
 * Busca todos os contatos da área única
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

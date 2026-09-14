import pb from '@/lib/pocketbase/client'
import type { SistemaUsuario, UserRole } from '@/types/crm'

export interface NovoUsuarioInput {
  name: string
  email: string
  password: string
  passwordConfirm: string
  role: UserRole
  ativo?: boolean
}

export interface EditarUsuarioInput {
  name?: string
  email?: string
  role?: UserRole
  ativo?: boolean
  password?: string
  passwordConfirm?: string
}

/**
 * Lista todos os usuários do sistema
 */
export async function fetchUsuariosSistema(): Promise<SistemaUsuario[]> {
  try {
    const records = await pb.collection('users').getFullList<any>({
      sort: '-created',
    })
    return records.map((r) => ({
      id: r.id,
      name: r.name || 'Sem Nome',
      email: r.email,
      avatar: r.avatar,
      role: (r.role as UserRole) || 'admin',
      ativo: r.ativo !== false,
    }))
  } catch (err) {
    console.error('Erro ao listar usuários do sistema:', err)
    throw err
  }
}

/**
 * Cria um novo usuário
 */
export async function createUsuarioSistema(data: NovoUsuarioInput): Promise<SistemaUsuario> {
  try {
    const record = await pb.collection('users').create<any>({
      name: data.name,
      email: data.email,
      password: data.password,
      passwordConfirm: data.passwordConfirm,
      emailVisibility: false,
      role: data.role,
      ativo: data.ativo ?? true,
      verified: true,
    })

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      avatar: record.avatar,
      role: record.role,
      ativo: record.ativo !== false,
    }
  } catch (err) {
    console.error('Erro ao criar usuário:', err)
    throw err
  }
}

/**
 * Atualiza um usuário existente
 */
export async function updateUsuarioSistema(
  id: string,
  data: EditarUsuarioInput,
): Promise<SistemaUsuario> {
  try {
    const payload: any = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.email !== undefined) payload.email = data.email
    if (data.role !== undefined) payload.role = data.role
    if (data.ativo !== undefined) payload.ativo = data.ativo

    if (data.password) {
      payload.password = data.password
      payload.passwordConfirm = data.passwordConfirm || data.password
    }

    const record = await pb.collection('users').update<any>(id, payload)

    return {
      id: record.id,
      name: record.name,
      email: record.email,
      avatar: record.avatar,
      role: record.role,
      ativo: record.ativo !== false,
    }
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err)
    throw err
  }
}

/**
 * Alterna status ativo/inativo de um usuário
 */
export async function toggleAtivoUsuario(id: string, ativoAtual: boolean): Promise<SistemaUsuario> {
  return updateUsuarioSistema(id, { ativo: !ativoAtual })
}

/**
 * Exclui um usuário do sistema
 */
export async function deleteUsuarioSistema(id: string): Promise<boolean> {
  try {
    await pb.collection('users').delete(id)
    return true
  } catch (err) {
    console.error('Erro ao excluir usuário:', err)
    throw err
  }
}

/**
 * Busca apenas instaladores ativos (para seleção em atribuição de OS)
 */
export async function fetchInstaladoresAtivos(): Promise<SistemaUsuario[]> {
  try {
    const records = await pb.collection('users').getFullList<any>({
      filter: "role = 'instalador' && ativo = true",
      sort: 'name',
    })
    return records.map((r) => ({
      id: r.id,
      name: r.name || 'Instalador',
      email: r.email,
      avatar: r.avatar,
      role: 'instalador',
      ativo: true,
    }))
  } catch (err) {
    console.warn('Erro ao carregar instaladores:', err)
    return []
  }
}

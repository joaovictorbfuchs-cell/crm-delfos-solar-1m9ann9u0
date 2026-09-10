import pb from '@/lib/pocketbase/client'
import type {
  Cliente,
  Sistema,
  Manutencao,
  Atividade,
  AtividadeTipo,
  AtividadeStatus,
  SistemaUsuario,
  ManutencaoTipo,
  ManutencaoStatus,
  Profissional,
  Projeto,
  ProjetoEvento,
  ProjetoEtapa,
} from '@/types/crm'

export async function fetchClientes(): Promise<Cliente[]> {
  const records = await pb.collection('clientes').getFullList<Cliente>({
    sort: 'nome',
  })
  return records
}

export async function fetchSistemas(): Promise<Sistema[]> {
  const records = await pb.collection('sistemas').getFullList<Sistema>({
    sort: '-created',
  })
  return records
}

export async function fetchSistemaByClienteId(clienteId: string): Promise<Sistema | null> {
  try {
    const record = await pb
      .collection('sistemas')
      .getFirstListItem<Sistema>(`cliente_id='${clienteId}'`)
    return record
  } catch (_) {
    return null
  }
}

export async function fetchManutencoes(): Promise<Manutencao[]> {
  const records = await pb.collection('manutencoes').getFullList<Manutencao>({
    sort: '-data',
    expand: 'cliente_id',
  })
  return records
}

export async function fetchAtividades(): Promise<Atividade[]> {
  const records = await pb.collection('atividades').getFullList<Atividade>({
    sort: '-data',
    expand: 'cliente_id,responsavel_id',
  })
  return records
}

export async function fetchUsuarios(): Promise<SistemaUsuario[]> {
  try {
    const records = await pb.collection('users').getFullList<SistemaUsuario>({
      sort: 'name',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar usuários:', err)
    return []
  }
}

export async function createAtividade(data: {
  cliente_id: string
  tipo: AtividadeTipo
  titulo?: string
  descricao?: string
  data?: string
  autor?: string
  status?: AtividadeStatus
  responsavel_id?: string
  responsavel_nome?: string
}): Promise<Atividade> {
  const payload = {
    ...data,
    descricao: data.descricao || '',
    status: data.status || 'pendente',
    data: data.data || new Date().toISOString(),
    autor: data.autor || 'João Delfos',
  }
  const record = await pb.collection('atividades').create<Atividade>(payload, {
    expand: 'cliente_id,responsavel_id',
  })
  return record
}

export async function updateAtividade(id: string, data: Partial<Atividade>): Promise<Atividade> {
  const record = await pb.collection('atividades').update<Atividade>(id, data, {
    expand: 'cliente_id,responsavel_id',
  })
  return record
}

export async function deleteAtividade(id: string): Promise<boolean> {
  await pb.collection('atividades').delete(id)
  return true
}

export async function createManutencao(data: {
  cliente_id: string
  data: string
  tipo: ManutencaoTipo
  status: ManutencaoStatus
  tecnico?: string
  descricao?: string
}): Promise<Manutencao> {
  const record = await pb.collection('manutencoes').create<Manutencao>(data)
  return record
}

export async function createCliente(data: Partial<Cliente> & { nome: string }): Promise<Cliente> {
  const record = await pb.collection('clientes').create<Cliente>(data)
  return record
}

export async function updateCliente(id: string, data: Partial<Cliente>): Promise<Cliente> {
  const record = await pb.collection('clientes').update<Cliente>(id, data)
  return record
}

export async function updateClienteStatus(id: string, status: Cliente['status']): Promise<Cliente> {
  return updateCliente(id, { status })
}

export async function createSistema(
  data: Partial<Sistema> & { cliente_id: string },
): Promise<Sistema> {
  const record = await pb.collection('sistemas').create<Sistema>(data)
  return record
}

export async function updateSistema(id: string, data: Partial<Sistema>): Promise<Sistema> {
  const record = await pb.collection('sistemas').update<Sistema>(id, data)
  return record
}

export async function upsertSistemaForCliente(
  clienteId: string,
  data: Partial<Sistema>,
  existingSistemaId?: string,
): Promise<Sistema> {
  if (existingSistemaId) {
    return updateSistema(existingSistemaId, data)
  }
  const existing = await fetchSistemaByClienteId(clienteId)
  if (existing) {
    return updateSistema(existing.id, data)
  }
  return createSistema({ ...data, cliente_id: clienteId })
}

// -------------------------------------------------------------
// Profissionais & Projetos Services
// -------------------------------------------------------------

export async function fetchProfissionais(): Promise<Profissional[]> {
  const records = await pb.collection('profissionais').getFullList<Profissional>({
    sort: 'nome',
  })
  return records
}

export async function createProfissional(
  data: Omit<Partial<Profissional>, 'id'> & {
    nome: string
    especialidade: Profissional['especialidade']
  },
): Promise<Profissional> {
  const record = await pb.collection('profissionais').create<Profissional>(data)
  return record
}

export async function updateProfissional(
  id: string,
  data: Partial<Profissional>,
): Promise<Profissional> {
  const record = await pb.collection('profissionais').update<Profissional>(id, data)
  return record
}

export async function deleteProfissional(id: string): Promise<boolean> {
  await pb.collection('profissionais').delete(id)
  return true
}

export async function fetchProjetos(): Promise<Projeto[]> {
  const records = await pb.collection('projetos').getFullList<Projeto>({
    sort: '-updated',
    expand: 'cliente_id,profissional_id',
  })
  return records
}

export async function fetchProjetoByClienteId(clienteId: string): Promise<Projeto | null> {
  try {
    const record = await pb
      .collection('projetos')
      .getFirstListItem<Projeto>(`cliente_id='${clienteId}'`, {
        expand: 'cliente_id,profissional_id',
      })
    return record
  } catch (_) {
    return null
  }
}

export async function createProjeto(data: {
  cliente_id: string
  etapa: ProjetoEtapa
  potencia_kwp?: number
  cidade?: string
  profissional_id?: string
  profissional_nome?: string
  observacoes?: string
}): Promise<Projeto> {
  const record = await pb.collection('projetos').create<Projeto>(data, {
    expand: 'cliente_id,profissional_id',
  })
  return record
}

export async function updateProjeto(id: string, data: Partial<Projeto>): Promise<Projeto> {
  const record = await pb.collection('projetos').update<Projeto>(id, data, {
    expand: 'cliente_id,profissional_id',
  })
  return record
}

export async function deleteProjeto(id: string): Promise<boolean> {
  await pb.collection('projetos').delete(id)
  return true
}

export async function fetchProjetoEventos(projetoId?: string): Promise<ProjetoEvento[]> {
  const filter = projetoId ? `projeto_id='${projetoId}'` : ''
  const records = await pb.collection('projeto_eventos').getFullList<ProjetoEvento>({
    filter,
    sort: '-data',
  })
  return records
}

export async function createProjetoEvento(data: {
  projeto_id: string
  etapa_anterior?: string
  etapa_nova: string
  profissional_nome?: string
  autor?: string
  data?: string
  descricao?: string
}): Promise<ProjetoEvento> {
  const payload = {
    ...data,
    data: data.data || new Date().toISOString(),
    autor: data.autor || 'João Silva',
  }
  const record = await pb.collection('projeto_eventos').create<ProjetoEvento>(payload)
  return record
}

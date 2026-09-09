import pb from '@/lib/pocketbase/client'
import type {
  Cliente,
  Sistema,
  Manutencao,
  Atividade,
  ManutencaoTipo,
  ManutencaoStatus,
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
    expand: 'cliente_id',
  })
  return records
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

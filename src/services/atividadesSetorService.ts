import pb from '@/lib/pocketbase/client'
import type { AtividadeSetorItem } from '@/types/crm'

export const ATIVIDADES_SETOR_PADRAO = [
  'Instalador',
  'Fornecedor de Equipamentos',
  'Engenharia',
  'Consultoria',
  'Manutenção',
  'Financiamento',
  'Outros',
]

/**
 * Busca todas as atividades cadastradas no banco PocketBase
 */
export async function fetchAtividadesSetor(): Promise<string[]> {
  try {
    const records = await pb.collection('atividades_setor').getFullList<AtividadeSetorItem>({
      sort: 'nome',
    })
    const nomes = records.map((r) => r.nome.trim()).filter(Boolean)
    // Mescla com a lista padrão para garantir que nenhuma atividade padrão falte
    const unicos = Array.from(new Set([...ATIVIDADES_SETOR_PADRAO, ...nomes]))
    return unicos
  } catch (err) {
    console.warn('Falha ao buscar atividades_setor no PocketBase, usando lista padrão:', err)
    return ATIVIDADES_SETOR_PADRAO
  }
}

/**
 * Cadastra uma nova atividade no banco PocketBase
 */
export async function cadastrarNovaAtividadeSetor(nome: string): Promise<string> {
  const nomeTrim = nome.trim()
  if (!nomeTrim) {
    throw new Error('Informe o nome da atividade')
  }

  try {
    const existing = await pb
      .collection('atividades_setor')
      .getFirstListItem<AtividadeSetorItem>(`nome ~ '${nomeTrim}'`)
    if (existing) {
      return existing.nome
    }
  } catch (_) {
    // Não existe, prossegue para criar
  }

  const record = await pb.collection('atividades_setor').create<AtividadeSetorItem>({
    nome: nomeTrim,
  })
  return record.nome
}

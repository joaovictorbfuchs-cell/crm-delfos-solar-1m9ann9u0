import pb from '@/lib/pocketbase/client'
import type { InstalacaoGaleria } from '@/types/instalacoesGaleria'

export async function fetchInstalacoesGaleria(): Promise<InstalacaoGaleria[]> {
  try {
    const records = await pb.collection('instalacoes_galeria').getFullList<InstalacaoGaleria>({
      sort: 'ordem,created',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar fotos da galeria de instalações:', err)
    return []
  }
}

export interface SalvarInstalacaoDados {
  titulo: string
  cidade?: string
  potencia_kwp?: number | null
  foto_url?: string
  ordem?: number
  destaque?: boolean
}

const CAMPOS_PERMITIDOS_INSTALACAO = [
  'titulo',
  'cidade',
  'potencia_kwp',
  'foto_url',
  'ordem',
  'destaque',
]

export async function createInstalacaoGaleria(
  dados: SalvarInstalacaoDados,
  arquivoFoto?: File,
): Promise<InstalacaoGaleria> {
  const cleaned: Record<string, any> = {
    titulo: dados.titulo.trim(),
  }

  if (dados.cidade !== undefined && dados.cidade !== null) {
    cleaned.cidade = dados.cidade.trim()
  }
  if (typeof dados.potencia_kwp === 'number' && !isNaN(dados.potencia_kwp)) {
    cleaned.potencia_kwp = dados.potencia_kwp
  }
  if (dados.foto_url !== undefined && dados.foto_url !== null) {
    cleaned.foto_url = dados.foto_url.trim()
  }
  if (typeof dados.ordem === 'number' && !isNaN(dados.ordem)) {
    cleaned.ordem = dados.ordem
  }
  if (typeof dados.destaque === 'boolean') {
    cleaned.destaque = dados.destaque
  }

  if (arquivoFoto) {
    const formData = new FormData()
    Object.entries(cleaned).forEach(([k, v]) => {
      formData.append(k, String(v))
    })
    formData.append('foto', arquivoFoto)
    return await pb.collection('instalacoes_galeria').create<InstalacaoGaleria>(formData)
  }

  return await pb.collection('instalacoes_galeria').create<InstalacaoGaleria>(cleaned)
}

export async function updateInstalacaoGaleria(
  id: string,
  dados: Partial<SalvarInstalacaoDados>,
  arquivoFoto?: File,
): Promise<InstalacaoGaleria> {
  const cleaned: Record<string, any> = {}

  if (dados.titulo !== undefined) {
    cleaned.titulo = dados.titulo.trim()
  }
  if (dados.cidade !== undefined) {
    cleaned.cidade = dados.cidade ? dados.cidade.trim() : ''
  }
  if (dados.potencia_kwp !== undefined) {
    if (dados.potencia_kwp === null || isNaN(dados.potencia_kwp)) {
      cleaned.potencia_kwp = null
    } else {
      cleaned.potencia_kwp = dados.potencia_kwp
    }
  }
  if (dados.foto_url !== undefined) {
    cleaned.foto_url = dados.foto_url ? dados.foto_url.trim() : ''
  }
  if (typeof dados.ordem === 'number' && !isNaN(dados.ordem)) {
    cleaned.ordem = dados.ordem
  }
  if (typeof dados.destaque === 'boolean') {
    cleaned.destaque = dados.destaque
  }

  if (arquivoFoto) {
    const formData = new FormData()
    Object.entries(cleaned).forEach(([k, v]) => {
      if (CAMPOS_PERMITIDOS_INSTALACAO.includes(k)) {
        if (v === null || v === undefined) {
          formData.append(k, '')
        } else {
          formData.append(k, String(v))
        }
      }
    })
    formData.append('foto', arquivoFoto)
    return await pb.collection('instalacoes_galeria').update<InstalacaoGaleria>(id, formData)
  }

  return await pb.collection('instalacoes_galeria').update<InstalacaoGaleria>(id, cleaned)
}

export async function deleteInstalacaoGaleria(id: string): Promise<boolean> {
  await pb.collection('instalacoes_galeria').delete(id)
  return true
}

export function getFotoUrl(instalacao: InstalacaoGaleria): string {
  if (instalacao.foto) {
    return pb.files.getURL(instalacao, instalacao.foto)
  }
  if (instalacao.foto_url) {
    return instalacao.foto_url
  }
  return 'https://img.usecurling.com/p/800/600?q=solar+plant&color=green'
}

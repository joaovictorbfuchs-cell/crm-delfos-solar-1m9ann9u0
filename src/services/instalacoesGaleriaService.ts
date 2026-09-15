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

export async function createInstalacaoGaleria(
  dados: {
    titulo: string
    cidade?: string
    potencia_kwp?: number
    foto_url?: string
    ordem?: number
    destaque?: boolean
  },
  arquivoFoto?: File,
): Promise<InstalacaoGaleria> {
  const formData = new FormData()
  formData.append('titulo', dados.titulo)
  if (dados.cidade) formData.append('cidade', dados.cidade)
  if (dados.potencia_kwp !== undefined) formData.append('potencia_kwp', String(dados.potencia_kwp))
  if (dados.foto_url) formData.append('foto_url', dados.foto_url)
  if (dados.ordem !== undefined) formData.append('ordem', String(dados.ordem))
  if (dados.destaque !== undefined) formData.append('destaque', String(dados.destaque))

  if (arquivoFoto) {
    formData.append('foto', arquivoFoto)
  }

  const record = await pb.collection('instalacoes_galeria').create<InstalacaoGaleria>(formData)
  return record
}

export async function updateInstalacaoGaleria(
  id: string,
  dados: Partial<InstalacaoGaleria>,
  arquivoFoto?: File,
): Promise<InstalacaoGaleria> {
  if (arquivoFoto) {
    const formData = new FormData()
    Object.entries(dados).forEach(([k, v]) => {
      if (v !== undefined && v !== null && k !== 'foto') {
        formData.append(k, String(v))
      }
    })
    formData.append('foto', arquivoFoto)
    return await pb.collection('instalacoes_galeria').update<InstalacaoGaleria>(id, formData)
  }

  return await pb.collection('instalacoes_galeria').update<InstalacaoGaleria>(id, dados)
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

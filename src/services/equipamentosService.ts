import pb from '@/lib/pocketbase/client'
import type { Equipamento, SalvarEquipamentoDados, TipoEquipamento } from '@/types/equipamentos'

export async function fetchEquipamentos(tipo?: TipoEquipamento): Promise<Equipamento[]> {
  try {
    const filter = tipo ? `tipo = '${tipo}'` : ''
    const records = await pb.collection('equipamentos').getFullList<Equipamento>({
      filter: filter || undefined,
      sort: 'tipo,marca,modelo',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar equipamentos:', err)
    return []
  }
}

export async function createEquipamento(
  dados: SalvarEquipamentoDados,
  arquivoFoto?: File,
  arquivoDatasheet?: File,
): Promise<Equipamento> {
  const cleaned: Record<string, any> = {
    tipo: dados.tipo,
    marca: dados.marca.trim(),
    modelo: dados.modelo.trim(),
    potencia_w: Number(dados.potencia_w),
    descricao_padrao: dados.descricao_padrao ? dados.descricao_padrao.trim() : '',
  }

  if (
    dados.garantia_anos !== undefined &&
    dados.garantia_anos !== null &&
    !isNaN(Number(dados.garantia_anos))
  ) {
    cleaned.garantia_anos = Number(dados.garantia_anos)
  }

  if (arquivoFoto || arquivoDatasheet) {
    const formData = new FormData()
    Object.entries(cleaned).forEach(([k, v]) => {
      formData.append(k, String(v))
    })
    if (arquivoFoto) {
      formData.append('foto', arquivoFoto)
    }
    if (arquivoDatasheet) {
      formData.append('datasheet_pdf', arquivoDatasheet)
    }
    return await pb.collection('equipamentos').create<Equipamento>(formData)
  }

  return await pb.collection('equipamentos').create<Equipamento>(cleaned)
}

export async function updateEquipamento(
  id: string,
  dados: Partial<SalvarEquipamentoDados>,
  arquivoFoto?: File,
  removerFoto?: boolean,
  arquivoDatasheet?: File,
  removerDatasheet?: boolean,
): Promise<Equipamento> {
  const cleaned: Record<string, any> = {}

  if (dados.tipo !== undefined) {
    cleaned.tipo = dados.tipo
  }
  if (dados.marca !== undefined) {
    cleaned.marca = dados.marca.trim()
  }
  if (dados.modelo !== undefined) {
    cleaned.modelo = dados.modelo.trim()
  }
  if (dados.potencia_w !== undefined) {
    cleaned.potencia_w = Number(dados.potencia_w)
  }
  if (dados.descricao_padrao !== undefined) {
    cleaned.descricao_padrao = dados.descricao_padrao ? dados.descricao_padrao.trim() : ''
  }
  if (dados.garantia_anos !== undefined) {
    if (dados.garantia_anos === null || isNaN(Number(dados.garantia_anos))) {
      cleaned.garantia_anos = null
    } else {
      cleaned.garantia_anos = Number(dados.garantia_anos)
    }
  }

  if (removerFoto && !arquivoFoto) {
    cleaned.foto = null
  }
  if (removerDatasheet && !arquivoDatasheet) {
    cleaned.datasheet_pdf = null
  }

  if (arquivoFoto || arquivoDatasheet) {
    const formData = new FormData()
    Object.entries(cleaned).forEach(([k, v]) => {
      if (v !== undefined) {
        formData.append(k, v === null ? '' : String(v))
      }
    })
    if (arquivoFoto) {
      formData.append('foto', arquivoFoto)
    }
    if (arquivoDatasheet) {
      formData.append('datasheet_pdf', arquivoDatasheet)
    }
    return await pb.collection('equipamentos').update<Equipamento>(id, formData)
  }

  return await pb.collection('equipamentos').update<Equipamento>(id, cleaned)
}

export async function deleteEquipamento(id: string): Promise<boolean> {
  await pb.collection('equipamentos').delete(id)
  return true
}

export function getFotoEquipamentoUrl(equipamento: Equipamento): string | null {
  if (equipamento.foto) {
    return pb.files.getURL(equipamento, equipamento.foto)
  }
  return null
}

export function getDatasheetEquipamentoUrl(equipamento: Equipamento): string | null {
  if (equipamento.datasheet_pdf) {
    return pb.files.getURL(equipamento, equipamento.datasheet_pdf)
  }
  return null
}

export function formatarPotenciaEquipamento(potenciaW: number): string {
  if (!potenciaW || isNaN(potenciaW)) return '0 W'
  if (potenciaW >= 1000) {
    const kw = potenciaW / 1000
    // Se for redondo (ex 6.0 kW => 6 kW ou 5.5 kW)
    const formattedKw = Number.isInteger(kw) ? `${kw} kW` : `${kw.toFixed(1).replace('.', ',')} kW`
    const formattedW = `${potenciaW.toLocaleString('pt-BR')} W`
    return `${formattedW} (${formattedKw})`
  }
  return `${potenciaW.toLocaleString('pt-BR')} W`
}

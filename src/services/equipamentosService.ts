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

// -------------------------------------------------------------
// Correspondência tolerante para Equipamento e Datasheet
// -------------------------------------------------------------

// Sinônimos e mapeamento de marcas conhecidas para um radical normalizado
const MARCA_SYNONYMS: Record<string, string[]> = {
  canadian: ['canadian', 'canadiansolar', 'canadian solar'],
  growatt: ['growatt'],
  solis: ['solis', 'ginlong', 'ginlong solis', 'ginlongsolis'],
  huawei: ['huawei'],
  deye: ['deye'],
  fronius: ['fronius'],
  sungrow: ['sungrow'],
  solaredge: ['solaredge', 'solar edge'],
  goodwe: ['goodwe', 'good we'],
  sma: ['sma', 'sma solar'],
  ronma: ['ronma', 'ronma solar', 'ronmasolar'],
  trina: ['trina', 'trina solar', 'trinasolar'],
  ja: ['ja solar', 'jasolar', 'ja'],
  jinko: ['jinko', 'jinko solar', 'jinkosolar'],
  longi: ['longi', 'longi solar', 'longisolar'],
  risen: ['risen', 'risen energy'],
  astronergy: ['astronergy', 'chint'],
  dah: ['dah solar', 'dahsolar', 'dah'],
  byd: ['byd'],
  talesun: ['talesun'],
  osda: ['osda', 'osda solar'],
  ae: ['ae solar', 'ae'],
  sunova: ['sunova', 'sunova solar'],
  suntech: ['suntech'],
  luxen: ['luxen', 'luxen solar'],
  gokin: ['gokin', 'gokin solar'],
  hy: ['hy', 'hy solar', 'hysolar'],
}

/**
 * Normaliza uma string removendo caracteres especiais, pontuação redundante e múltiplos espaços.
 */
function cleanString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
}

/**
 * Verifica se duas strings de marcas são equivalentes considerando sinônimos.
 */
export function marcasEquivalentes(marcaA?: string, marcaB?: string): boolean {
  if (!marcaA || !marcaB) return false
  const a = cleanString(marcaA).replace(/[^a-z0-9]/g, '')
  const b = cleanString(marcaB).replace(/[^a-z0-9]/g, '')
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true

  for (const list of Object.values(MARCA_SYNONYMS)) {
    const listClean = list.map((s) => cleanString(s).replace(/[^a-z0-9]/g, ''))
    const matchA = listClean.some((item) => a === item || a.includes(item) || item.includes(a))
    const matchB = listClean.some((item) => b === item || b.includes(item) || item.includes(b))
    if (matchA && matchB) return true
  }

  return false
}

/**
 * Extrai o radical ou tokens principais do modelo para comparação tolerante
 * Ex: "CS3W-450MS MONOCRISTAL 450Wp" -> tokens ['cs3w-450ms', 'cs3w', '450ms']
 * Ex: "CS3W-450MS" casa com "CS3W-450MS-AG"
 */
export function modelosEquivalentes(modeloA?: string, modeloB?: string): boolean {
  if (!modeloA || !modeloB) return false
  const a = cleanString(modeloA)
  const b = cleanString(modeloB)
  if (!a || !b) return false

  // Se forem idênticos
  if (a === b) return true

  // Remoção de separadores
  const aCompact = a.replace(/[^a-z0-9]/g, '')
  const bCompact = b.replace(/[^a-z0-9]/g, '')
  if (aCompact.length >= 4 && bCompact.length >= 4) {
    if (aCompact === bCompact || aCompact.includes(bCompact) || bCompact.includes(aCompact)) {
      return true
    }
  }

  // Tokens com radical de código (letras seguidas de números ou hífen: CS3W, 450MS, SUN2000, etc.)
  const regexCode = /\b([a-z0-9]+(?:-[a-z0-9]+)*)\b/g
  const tokensA: string[] = (a.match(regexCode) ?? []).filter((t: string) => t.length >= 3)
  const tokensB: string[] = (b.match(regexCode) ?? []).filter((t: string) => t.length >= 3)

  for (const ta of tokensA) {
    // Ignora palavras genéricas soltas
    if (
      /^(monocristal|monocristalino|policristalino|bifacial|topcon|inversor|modulo|painel|solar|frame|kw|kwp|wp)$/i.test(
        ta,
      )
    ) {
      continue
    }
    for (const tb of tokensB) {
      if (
        /^(monocristal|monocristalino|policristalino|bifacial|topcon|inversor|modulo|painel|solar|frame|kw|kwp|wp)$/i.test(
          tb,
        )
      ) {
        continue
      }
      const taClean = ta.replace(/[^a-z0-9]/g, '')
      const tbClean = tb.replace(/[^a-z0-9]/g, '')
      if (taClean.length >= 4 && tbClean.length >= 4) {
        if (taClean === tbClean || taClean.includes(tbClean) || tbClean.includes(taClean)) {
          return true
        }
      }
    }
  }

  return false
}

export interface MatchEquipamentoOptions {
  marca?: string
  modelo?: string
  tipo?: TipoEquipamento
  apenasComDatasheet?: boolean
}

/**
 * Encontra no catálogo de equipamentos aquele que melhor corresponde à marca + modelo passados,
 * tolerante a variações de grafia, sinônimos e sufixos de modelo.
 */
export function encontrarEquipamentoCorrespondente(
  catalogo: Equipamento[],
  options: MatchEquipamentoOptions,
): Equipamento | null {
  if (!catalogo || catalogo.length === 0) return null

  const { marca = '', modelo = '', tipo, apenasComDatasheet = true } = options
  const marcaBuscada = cleanString(marca)
  const modeloBuscado = cleanString(modelo)

  if (!marcaBuscada && !modeloBuscado) return null

  // Filtra por tipo e presença de datasheet (se exigido)
  const candidatos = catalogo.filter((eq) => {
    if (apenasComDatasheet && !eq.datasheet_pdf) return false
    if (tipo && eq.tipo !== tipo) return false
    return true
  })

  if (candidatos.length === 0) return null

  // 1. Tentar correspondência exata ou tolerante de Marca + Modelo
  if (marcaBuscada && modeloBuscado) {
    const matchMarcaEModelo = candidatos.find((eq) => {
      const marcaOk = marcasEquivalentes(eq.marca, marcaBuscada)
      const modeloOk = modelosEquivalentes(eq.modelo, modeloBuscado)
      return marcaOk && modeloOk
    })
    if (matchMarcaEModelo) return matchMarcaEModelo
  }

  // 2. Tentar modelo que contenha código forte (ex: CS3W-450 ou similar), mesmo se marca estiver omitida ou divergente
  if (modeloBuscado) {
    const matchModelo = candidatos.find((eq) => modelosEquivalentes(eq.modelo, modeloBuscado))
    if (matchModelo) {
      // Se tiver marca informada, preferencialmente confira se não é uma marca claramente conflitante
      if (!marcaBuscada || marcasEquivalentes(matchModelo.marca, marcaBuscada)) {
        return matchModelo
      }
    }
  }

  // 3. Tentar achar por texto completo do modelo (caso venha tudo no campo modelo ou vice-versa)
  const textoCompleto = `${marcaBuscada} ${modeloBuscado}`.trim()
  if (textoCompleto) {
    const matchCompleto = candidatos.find((eq) => {
      const eqTexto = `${eq.marca} ${eq.modelo}`.toLowerCase()
      if (modelosEquivalentes(eqTexto, textoCompleto)) return true
      const marcaEq = marcasEquivalentes(eq.marca, textoCompleto)
      const modeloEq = eq.modelo && cleanString(textoCompleto).includes(cleanString(eq.modelo))
      return marcaEq && modeloEq
    })
    if (matchCompleto) return matchCompleto
  }

  return null
}

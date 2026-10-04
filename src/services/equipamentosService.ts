import pb from '@/lib/pocketbase/client'
import type { Equipamento, SalvarEquipamentoDados, TipoEquipamento } from '@/types/equipamentos'

export async function fetchEquipamentos(tipo?: TipoEquipamento): Promise<Equipamento[]> {
  try {
    const filter = tipo ? `tipo = '${tipo}'` : ''
    const records = await pb.collection('equipamentos').getFullList<Equipamento>({
      filter: filter || undefined,
      sort: 'tipo,marca,modelo',
      expand: 'fornecedor_id,configuracao_monitoramento_id',
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

  if (dados.datasheet_url !== undefined) {
    cleaned.datasheet_url = dados.datasheet_url ? dados.datasheet_url.trim() : ''
  }
  if (dados.datalogger_url !== undefined) {
    cleaned.datalogger_url = dados.datalogger_url ? dados.datalogger_url.trim() : ''
  }
  if (dados.configuracao_monitoramento_id !== undefined) {
    cleaned.configuracao_monitoramento_id = dados.configuracao_monitoramento_id || null
  }
  if (dados.fornecedor_id !== undefined) {
    cleaned.fornecedor_id = dados.fornecedor_id || null
  }
  if (dados.telefone_suporte_fornecedor !== undefined) {
    cleaned.telefone_suporte_fornecedor = dados.telefone_suporte_fornecedor
      ? dados.telefone_suporte_fornecedor.trim()
      : ''
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
  if (dados.datasheet_url !== undefined) {
    cleaned.datasheet_url = dados.datasheet_url ? dados.datasheet_url.trim() : ''
  }
  if (dados.datalogger_url !== undefined) {
    cleaned.datalogger_url = dados.datalogger_url ? dados.datalogger_url.trim() : ''
  }
  if (dados.configuracao_monitoramento_id !== undefined) {
    cleaned.configuracao_monitoramento_id = dados.configuracao_monitoramento_id || null
  }
  if (dados.fornecedor_id !== undefined) {
    cleaned.fornecedor_id = dados.fornecedor_id || null
  }
  if (dados.telefone_suporte_fornecedor !== undefined) {
    cleaned.telefone_suporte_fornecedor = dados.telefone_suporte_fornecedor
      ? dados.telefone_suporte_fornecedor.trim()
      : ''
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

export function getFotoEquipamentoUrl(equipamento?: Equipamento | null): string | null {
  if (
    !equipamento ||
    !equipamento.foto ||
    typeof equipamento.foto !== 'string' ||
    !equipamento.foto.trim()
  ) {
    return null
  }
  try {
    return pb.files.getURL(equipamento, equipamento.foto)
  } catch (err) {
    console.error('Erro ao obter URL da foto do equipamento:', err)
    return null
  }
}

export function getDatasheetEquipamentoUrl(equipamento?: Equipamento | null): string | null {
  if (!equipamento) return null
  if (
    equipamento.datasheet_url &&
    typeof equipamento.datasheet_url === 'string' &&
    equipamento.datasheet_url.trim()
  ) {
    return equipamento.datasheet_url.trim()
  }
  if (
    equipamento.datasheet_pdf &&
    typeof equipamento.datasheet_pdf === 'string' &&
    equipamento.datasheet_pdf.trim()
  ) {
    try {
      return pb.files.getURL(equipamento, equipamento.datasheet_pdf)
    } catch (err) {
      console.error('Erro ao obter URL do datasheet PDF:', err)
      return null
    }
  }
  return null
}

export function getDataloggerEquipamentoUrl(equipamento?: Equipamento | null): string | null {
  if (
    !equipamento ||
    !equipamento.datalogger_url ||
    typeof equipamento.datalogger_url !== 'string' ||
    !equipamento.datalogger_url.trim()
  ) {
    return null
  }
  return equipamento.datalogger_url.trim()
}

export type UnidadePotenciaTipo = 'W' | 'kW'

/**
 * Retorna a unidade padrão de potência de acordo com o tipo do equipamento:
 * - Placa solar / Módulo fotovoltaico unitário: SEMPRE Watts ("W")
 * - Inversor: SEMPRE "kW"
 * - Outros / Geral: "kW"
 *
 * (Para potência de pico / soma das placas, a regra é SEMPRE "kW").
 */
export function getUnidadePorTipo(tipo?: TipoEquipamento | string | null): UnidadePotenciaTipo {
  if (tipo === 'modulo_fv') return 'W'
  return 'kW'
}

/**
 * Retorna o rótulo do campo de entrada conforme o tipo do equipamento.
 */
export function getRotuloCampoPotencia(tipo?: TipoEquipamento | string | null): string {
  return tipo === 'modulo_fv' ? 'Potência (W)' : 'Potência (kW)'
}

/**
 * Formata um valor de potência (em Watts do banco) de forma condicional ao tipo de equipamento:
 * 1. Placa solar / Módulo FV: "550 W" (ou "550 W (0,55 kW)" se incluirReferencia = true)
 * 2. Inversor: "6 kW" (ou "6 kW (6.000 W)" se incluirReferencia = true)
 * 3. Outro: padrão inversor "kW"
 */
export function formatarPotenciaPorTipo(
  potenciaW: number | null | undefined,
  tipo?: TipoEquipamento | string | null,
  opcoes?: { incluirReferencia?: boolean },
): string {
  const pot = Number(potenciaW) || 0
  if (pot <= 0 || isNaN(pot)) {
    return tipo === 'modulo_fv' ? '0 W' : '0 kW'
  }

  const incluirRef = opcoes?.incluirReferencia ?? true
  const isModulo = tipo === 'modulo_fv'

  const kw = pot / 1000
  const kwFormatado = parseFloat(kw.toFixed(4)).toLocaleString('pt-BR', {
    maximumFractionDigits: 3,
  })
  const wFormatado = Math.round(pot).toLocaleString('pt-BR')

  if (isModulo) {
    if (!incluirRef) return `${wFormatado} W`
    return `${wFormatado} W (${kwFormatado} kW)`
  }

  if (!incluirRef) return `${kwFormatado} kW`
  return `${kwFormatado} kW (${wFormatado} W)`
}

/**
 * Formata a potência de pico (soma das placas) sempre em kW / kWp.
 * Ex: 7.32 -> "7,32 kW" (ou "7,32 kWp" se sulfixoKwp = true).
 */
export function formatarPotenciaPico(
  potenciaKwOuWatts: number | null | undefined,
  opcoes?: { valorJaEmKw?: boolean; sufixoKwp?: boolean },
): string {
  const val = Number(potenciaKwOuWatts) || 0
  if (val <= 0 || isNaN(val)) {
    return opcoes?.sufixoKwp ? '0 kWp' : '0 kW'
  }

  // Se o valor estiver em Watts (> 100 por convenção ou indicado explicitamente)
  const kw =
    opcoes?.valorJaEmKw !== undefined
      ? opcoes.valorJaEmKw
        ? val
        : val / 1000
      : val > 500
        ? val / 1000
        : val

  const kwFormatado = parseFloat(kw.toFixed(3)).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })
  const sufixo = opcoes?.sufixoKwp ? 'kWp' : 'kW'
  return `${kwFormatado} ${sufixo}`
}

/**
 * Converte valor digitado no input (seja em W para placa solar ou em kW para inversor)
 * para Watts inteiros para armazenamento no banco de dados.
 */
export function converterInputParaWatts(
  valorInput: number | string | null | undefined,
  tipo?: TipoEquipamento | string | null,
): number {
  if (valorInput === null || valorInput === undefined) return 0
  const normalizado =
    typeof valorInput === 'number'
      ? valorInput
      : parseFloat(String(valorInput).trim().replace(',', '.'))
  if (isNaN(normalizado) || normalizado <= 0) return 0

  if (tipo === 'modulo_fv') {
    // Placa solar é digitada em Watts. Se o usuário digitar um decimal menor que 5 (ex: 0.55),
    // interpretamos defensivamente como kW e convertemos para Watts.
    if (normalizado < 5) {
      return Math.round(normalizado * 1000)
    }
    return Math.round(normalizado)
  }

  // Inversor ou Outro é digitado em kW. Se o usuário digitar algo > 500 (ex: 5000),
  // interpretamos defensivamente que já digitou em Watts diretos.
  if (normalizado >= 500) {
    return Math.round(normalizado)
  }
  return Math.round(normalizado * 1000)
}

/**
 * Converte valor em Watts do banco para string amigável de edição no input dependendo do tipo:
 * - Módulo FV (W): 550 W -> "550", 585 W -> "585"
 * - Inversor (kW): 6000 W -> "6", 5500 W -> "5.5"
 */
export function converterWattsParaInput(
  potenciaW: number | null | undefined,
  tipo?: TipoEquipamento | string | null,
): string {
  if (potenciaW === null || potenciaW === undefined || isNaN(potenciaW) || potenciaW <= 0) {
    return ''
  }
  if (tipo === 'modulo_fv') {
    return String(Math.round(potenciaW))
  }
  const kw = potenciaW / 1000
  return String(parseFloat(kw.toFixed(4)))
}

export function formatarPotenciaEquipamento(
  potenciaW: number,
  tipo?: TipoEquipamento | string | null,
): string {
  if (!potenciaW || isNaN(potenciaW)) {
    return tipo === 'modulo_fv' ? '0 W' : '0 kW'
  }
  // Se o tipo foi informado, aplica a regra oficial
  if (tipo) {
    return formatarPotenciaPorTipo(potenciaW, tipo, { incluirReferencia: true })
  }
  // Se não foi informado tipo, se for <= 800W deduz módulo FV, senão inversor
  const tipoDeduzido = potenciaW <= 800 ? 'modulo_fv' : 'inversor'
  return formatarPotenciaPorTipo(potenciaW, tipoDeduzido, { incluirReferencia: true })
}

/**
 * Converte valor em kW (número ou string digitada pelo usuário, ex "6" ou "0,55" ou "0.55")
 * para Watts inteiros para armazenamento no banco de dados.
 * Mantida para retrocompatibilidade total.
 */
export function converterKwParaWatts(valorKw: number | string | null | undefined): number {
  if (valorKw === null || valorKw === undefined) return 0
  const normalizado =
    typeof valorKw === 'number' ? valorKw : parseFloat(String(valorKw).trim().replace(',', '.'))
  if (isNaN(normalizado) || normalizado <= 0) return 0
  return Math.round(normalizado * 1000)
}

/**
 * Converte valor em Watts (armazenado no banco) para string amigável de kW para edição em input.
 * Ex: 6000 W -> "6", 5500 W -> "5.5", 550 W -> "0.55", 585 W -> "0.585".
 * Mantida para retrocompatibilidade total.
 */
export function converterWattsParaKwString(potenciaW: number | null | undefined): string {
  if (potenciaW === null || potenciaW === undefined || isNaN(potenciaW) || potenciaW <= 0) {
    return ''
  }
  const kw = potenciaW / 1000
  // Retorna string numérica limpa (usando ponto para input type="number")
  return String(parseFloat(kw.toFixed(4)))
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
    if (apenasComDatasheet && !eq.datasheet_pdf && !eq.datasheet_url) return false
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

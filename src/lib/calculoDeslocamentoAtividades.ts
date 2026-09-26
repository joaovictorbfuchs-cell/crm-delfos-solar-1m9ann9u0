/**
 * Utilidades para cálculo de distância e custos de deslocamento / placas
 * nas atividades de manutenção da Delfos Solar.
 */

export interface ConfiguracaoDeslocamentoDelfos {
  baseEndereco: string
  baseCidade: string
  baseUf: string
  baseCep: string
  baseLatitude: number
  baseLongitude: number
  valorKmPadrao: number
  cobrarIdaEVolta: boolean
}

// Configuração padrão da sede da Delfos Solar em Erechim/RS
export const CONFIG_DESLOCAMENTO_PADRAO: ConfiguracaoDeslocamentoDelfos = {
  baseEndereco: 'Rua Itália, 245 - Centro',
  baseCidade: 'Erechim',
  baseUf: 'RS',
  baseCep: '99700-000',
  baseLatitude: -27.6341,
  baseLongitude: -52.2739,
  valorKmPadrao: 1.2, // R$ 1,20 por KM rodado
  cobrarIdaEVolta: true, // Ida e volta por padrão (× 2)
}

const STORAGE_KEY_CONFIG_DESLOCAMENTO = 'delfos_config_deslocamento_v1'

export function getConfiguracaoDeslocamento(): ConfiguracaoDeslocamentoDelfos {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG_DESLOCAMENTO)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        ...CONFIG_DESLOCAMENTO_PADRAO,
        ...parsed,
      }
    }
  } catch (_e) {
    // fallback
  }
  return CONFIG_DESLOCAMENTO_PADRAO
}

export function saveConfiguracaoDeslocamento(
  config: Partial<ConfiguracaoDeslocamentoDelfos>,
): ConfiguracaoDeslocamentoDelfos {
  const current = getConfiguracaoDeslocamento()
  const updated: ConfiguracaoDeslocamentoDelfos = {
    ...current,
    ...config,
  }
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG_DESLOCAMENTO, JSON.stringify(updated))
  } catch (_e) {
    // fallback
  }
  return updated
}

// Tabela de distâncias rodoviárias aproximadas conhecidas a partir de Erechim/RS (sede Delfos)
// para as principais cidades do Alto Uruguai / Norte Gaúcho / SC
const DISTANCIAS_ERECHIM_KM: Record<string, number> = {
  erechim: 0,
  'getúlio vargas': 31,
  'getulio vargas': 31,
  gaurama: 24,
  aratiba: 36,
  'barão de cotegipe': 16,
  'barao de cotegipe': 16,
  estação: 36,
  estacao: 36,
  sertão: 45,
  sertao: 45,
  'passo fundo': 78,
  marau: 110,
  concordia: 88,
  concórdia: 88,
  chapecó: 102,
  chapeco: 102,
  viadutos: 48,
  marcelino: 42,
  'marcelino ramos': 42,
  'três arroios': 28,
  'tres arroios': 28,
  severiano: 32,
  'severiano de almeida': 32,
  campinas: 44,
  'campinas do sul': 44,
  quatro: 22,
  'quatro irmãos': 22,
  'quatro irmaos': 22,
  jacutinga: 38,
  ponte: 42,
  'ponte preta': 42,
  itativa: 58,
  'itativa do sul': 58,
  erico: 34,
  'érrico veríssimo': 34,
  'erico verissimo': 34,
  centenario: 46,
  centenário: 46,
  carlos: 52,
  'carlos gomes': 52,
  aurea: 32,
  áurea: 32,
  machadinho: 75,
  sananduva: 85,
  tapejara: 68,
  ibiaçá: 80,
  ibiasa: 80,
  maximiliano: 55,
  'maximiliano de almeida': 55,
  barracon: 60,
  barracão: 60,
  joacaba: 140,
  joaçaba: 140,
  soledade: 145,
  carazinho: 115,
  'porto alegre': 365,
  caxias: 270,
  'caxias do sul': 270,
}

// Coordenadas aproximadas de cidades para cálculo Haversine com fator de curvatura rodoviária
const COORDENADAS_CIDADES: Record<string, { lat: number; lng: number }> = {
  erechim: { lat: -27.6341, lng: -52.2739 },
  'getúlio vargas': { lat: -27.8903, lng: -52.2269 },
  'getulio vargas': { lat: -27.8903, lng: -52.2269 },
  gaurama: { lat: -27.5817, lng: -52.0911 },
  aratiba: { lat: -27.3917, lng: -52.3167 },
  'barão de cotegipe': { lat: -27.6231, lng: -52.3789 },
  'barao de cotegipe': { lat: -27.6231, lng: -52.3789 },
  'passo fundo': { lat: -28.2628, lng: -52.4067 },
  chapecó: { lat: -27.1004, lng: -52.6152 },
  chapeco: { lat: -27.1004, lng: -52.6152 },
  concordia: { lat: -27.2333, lng: -52.0333 },
  concórdia: { lat: -27.2333, lng: -52.0333 },
  marau: { lat: -28.4489, lng: -52.2003 },
  'marcelino ramos': { lat: -27.4611, lng: -51.9056 },
  'porto alegre': { lat: -30.0346, lng: -51.2177 },
}

function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Fórmula de Haversine para cálculo de distância em linha reta,
 * multiplicada por fator rodoviário médio (1.28x para topografia do norte gaúcho).
 */
function calcularHaversineComCurvatura(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  fatorRodoviario = 1.28,
): number {
  const R = 6371 // Raio da Terra em KM
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanciaLinhaReta = R * c
  return Math.round(distanciaLinhaReta * fatorRodoviario)
}

export interface EstimativaDistanciaResultado {
  distanciaKm: number
  cidadeOrigem: string
  cidadeDestino: string
  metodo: 'mesma_cidade' | 'tabela_regional' | 'coordenadas' | 'estimativa_padrao'
  detalhe: string
}

/**
 * Estima a distância em KM entre a sede da Delfos (Erechim/RS) e o endereço do cliente/usina.
 */
export function estimarDistanciaDelfosCliente(
  enderecoOuCidadeCliente?: string,
  cidadeCliente?: string,
  coordsCliente?: { lat?: number; lng?: number },
): EstimativaDistanciaResultado {
  const config = getConfiguracaoDeslocamento()
  const origemCidade = config.baseCidade || 'Erechim'

  // Identifica a cidade do cliente
  let destinoCidade = ''
  if (cidadeCliente && cidadeCliente.trim()) {
    destinoCidade = cidadeCliente.trim()
  } else if (enderecoOuCidadeCliente) {
    // Tenta extrair a cidade do endereço no formato "Rua X, 123 - Bairro, Cidade/UF"
    const partes = enderecoOuCidadeCliente.split(/[-–,/]/).map((p) => p.trim())
    for (let i = partes.length - 1; i >= 0; i--) {
      const p = partes[i]
      if (
        p &&
        !/^\d+$/.test(p) &&
        p.length >= 3 &&
        p.toUpperCase() !== 'RS' &&
        p.toUpperCase() !== 'SC'
      ) {
        destinoCidade = p
        break
      }
    }
    if (!destinoCidade) {
      destinoCidade = enderecoOuCidadeCliente.trim()
    }
  }

  if (!destinoCidade) {
    return {
      distanciaKm: 15,
      cidadeOrigem: origemCidade,
      cidadeDestino: 'Não informada',
      metodo: 'estimativa_padrao',
      detalhe: 'Distância padrão de 15 km adotada (endereço não informado)',
    }
  }

  const normOrigem = normalizarTexto(origemCidade)
  const normDestino = normalizarTexto(destinoCidade)

  // Mesma cidade (ex.: Erechim -> Erechim)
  if (
    normOrigem === normDestino ||
    normDestino.includes(normOrigem) ||
    normOrigem.includes(normDestino)
  ) {
    return {
      distanciaKm: 8, // Deslocamento urbano médio de 8 km dentro de Erechim
      cidadeOrigem: origemCidade,
      cidadeDestino: destinoCidade,
      metodo: 'mesma_cidade',
      detalhe: `Deslocamento urbano em ${origemCidade} (estimativa de 8 km)`,
    }
  }

  // Busca na tabela de distâncias regionais diretas
  if (DISTANCIAS_ERECHIM_KM[normDestino] !== undefined) {
    return {
      distanciaKm: DISTANCIAS_ERECHIM_KM[normDestino],
      cidadeOrigem: origemCidade,
      cidadeDestino: destinoCidade,
      metodo: 'tabela_regional',
      detalhe: `Distância rodoviária tabelada entre ${origemCidade} e ${destinoCidade}`,
    }
  }

  // Busca parcial (ex: "Passo Fundo - RS" contendo "passo fundo")
  for (const [chave, km] of Object.entries(DISTANCIAS_ERECHIM_KM)) {
    if (normDestino.includes(chave) || chave.includes(normDestino)) {
      return {
        distanciaKm: km,
        cidadeOrigem: origemCidade,
        cidadeDestino: destinoCidade,
        metodo: 'tabela_regional',
        detalhe: `Distância rodoviária aproximada entre ${origemCidade} e ${destinoCidade}`,
      }
    }
  }

  // Se o cliente tiver coordenadas salvas na usina
  if (
    coordsCliente?.lat &&
    coordsCliente?.lng &&
    !isNaN(coordsCliente.lat) &&
    !isNaN(coordsCliente.lng) &&
    coordsCliente.lat !== 0
  ) {
    const km = calcularHaversineComCurvatura(
      config.baseLatitude,
      config.baseLongitude,
      coordsCliente.lat,
      coordsCliente.lng,
    )
    return {
      distanciaKm: Math.max(5, km),
      cidadeOrigem: origemCidade,
      cidadeDestino: destinoCidade,
      metodo: 'coordenadas',
      detalhe: `Calculado via coordenadas geográficas da usina (${km} km)`,
    }
  }

  // Se tiver coordenadas cadastradas da cidade destino
  const coordCidade = COORDENADAS_CIDADES[normDestino]
  if (coordCidade) {
    const km = calcularHaversineComCurvatura(
      config.baseLatitude,
      config.baseLongitude,
      coordCidade.lat,
      coordCidade.lng,
    )
    return {
      distanciaKm: km,
      cidadeOrigem: origemCidade,
      cidadeDestino: destinoCidade,
      metodo: 'coordenadas',
      detalhe: `Calculado via coordenadas de ${destinoCidade} (${km} km)`,
    }
  }

  // Fallback seguro: estimativa regional média para o Norte do RS (35 km)
  return {
    distanciaKm: 35,
    cidadeOrigem: origemCidade,
    cidadeDestino: destinoCidade,
    metodo: 'estimativa_padrao',
    detalhe: `Estimativa regional padrão de 35 km para ${destinoCidade}`,
  }
}

export interface CalculoCustoAtividadeParams {
  valorServico: number
  valorPorPlaca?: number
  qtdModulos?: number
  cobrarDeslocamento: boolean
  distanciaKm: number
  valorKm: number
  cobrarIdaEVolta?: boolean
}

export interface CalculoCustoAtividadeResultado {
  custoServicoEfetivo: number
  isCobrancaPorPlaca: boolean
  custoPlacas: number
  kmTotalRodado: number
  custoDeslocamento: number
  custoTotal: number
}

/**
 * Realiza o cálculo unificado de custos de serviço e deslocamento.
 * Regra do usuário:
 * - Se houver valor por placa informado e quantidade de placas > 0, o custo do serviço é calculado por placas (ou mantido valor_servico base se valor_por_placa for 0)
 * - Se checkbox "Cobrar deslocamento?" estiver ativo, deslocamento = distância × valor_km (ida e volta x2 por padrão)
 * - Custo total = custo do serviço + deslocamento
 */
export function calcularCustosAtividade(
  params: CalculoCustoAtividadeParams,
): CalculoCustoAtividadeResultado {
  const {
    valorServico,
    valorPorPlaca,
    qtdModulos,
    cobrarDeslocamento,
    distanciaKm,
    valorKm,
    cobrarIdaEVolta = true,
  } = params

  const numValorServico = Math.max(0, Number(valorServico) || 0)
  const numValorPlaca = Math.max(0, Number(valorPorPlaca) || 0)
  const numModulos = Math.max(0, Number(qtdModulos) || 0)
  const numDistancia = Math.max(0, Number(distanciaKm) || 0)
  const numValorKm = Math.max(0, Number(valorKm) || 0)

  // Custo por placas
  let isCobrancaPorPlaca = false
  let custoPlacas = 0
  let custoServicoEfetivo = numValorServico

  if (numValorPlaca > 0 && numModulos > 0) {
    isCobrancaPorPlaca = true
    custoPlacas = Math.round(numValorPlaca * numModulos * 100) / 100
    // Quando cobrado por placa, o custo de serviço reflete a quantidade multiplicada
    custoServicoEfetivo = custoPlacas
  }

  // Custo deslocamento
  const multiplicadorIdaVolta = cobrarIdaEVolta ? 2 : 1
  const kmTotalRodado = numDistancia * multiplicadorIdaVolta
  const custoDeslocamento = cobrarDeslocamento
    ? Math.round(kmTotalRodado * numValorKm * 100) / 100
    : 0

  const custoTotal = Math.round((custoServicoEfetivo + custoDeslocamento) * 100) / 100

  return {
    custoServicoEfetivo,
    isCobrancaPorPlaca,
    custoPlacas,
    kmTotalRodado,
    custoDeslocamento,
    custoTotal,
  }
}

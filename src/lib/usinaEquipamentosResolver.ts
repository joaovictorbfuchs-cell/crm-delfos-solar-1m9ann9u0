import { pb } from '@/lib/pocketbase'

export interface InversorEquipamentoRelatorio {
  id: string
  marca?: string
  modelo?: string
  potencia_w?: number
  quantidade: number
  numero_serie?: string
  datasheetUrl?: string | null
  dataloggerUrl?: string | null
  configMonitoramento?: any
}

export interface ModuloEquipamentoRelatorio {
  id: string
  marca?: string
  modelo?: string
  potencia_w?: number
  quantidade: number
  datasheetUrl?: string | null
}

export interface EquipamentosUsinaRelatorio {
  temUsinaVinculada: boolean
  temEquipamentos: boolean
  inversores: InversorEquipamentoRelatorio[]
  modulos: ModuloEquipamentoRelatorio[]
}

export interface ResolverEquipamentosParams {
  os?: any
  usina?: any
  cliente?: any
  equipamentosUsina?: any[]
  ativosUsina?: any[]
  inversoresLista?: any[]
}

/**
 * Resolve e deduplica inversores e módulos fotovoltaicos da usina vinculada à OS.
 * Fontes priorizadas:
 * 1. Coleção Ativos (ativos da usina com tipo inversor / placa_solar)
 * 2. Tabela de vínculos usina_equipamentos (expand equipamento_id)
 * 3. Fallback: campos diretos da usina vinculada (fabricante_inversores, modelo_modulos, etc.)
 * 4. Fallback legado do cliente
 *
 * Se a OS não tiver usina vinculada, temUsinaVinculada retorna false.
 */
export function resolverEquipamentosUsina({
  os,
  usina,
  cliente,
  equipamentosUsina = [],
  ativosUsina = [],
  inversoresLista = [],
}: ResolverEquipamentosParams): EquipamentosUsinaRelatorio {
  const usinaVinculada = usina || os?.expand?.usina_id || os?.expand?.sistema_id || null
  const temUsinaVinculada = Boolean(
    usinaVinculada?.id ||
    os?.usina_id ||
    os?.sistema_id ||
    (os?.expand?.usina_id && typeof os.expand.usina_id === 'object') ||
    (os?.expand?.sistema_id && typeof os.expand.sistema_id === 'object'),
  )

  if (!temUsinaVinculada) {
    return {
      temUsinaVinculada: false,
      temEquipamentos: false,
      inversores: [],
      modulos: [],
    }
  }

  // 1. Resolução de Inversores
  const atvsInversores: InversorEquipamentoRelatorio[] = (
    Array.isArray(ativosUsina) ? ativosUsina : []
  )
    .filter((a) => a?.tipo === 'inversor' || (a?.tipo as string) === 'inversores')
    .map((a) => {
      const marca = a.fabricante || ''
      const dataloggerUrl =
        usinaVinculada?.monitoramento_datalogger_url ||
        cliente?.monitoramento_datalogger_url ||
        null
      const datasheetUrl = usinaVinculada?.datasheet_inversor_url || null
      return {
        id: a.id,
        marca,
        modelo: a.modelo || '',
        potencia_w: (a as any).potencia_w || undefined,
        quantidade: 1,
        numero_serie: a.numero_serie || undefined,
        datasheetUrl,
        dataloggerUrl,
      }
    })

  const eqsInversores: InversorEquipamentoRelatorio[] = (
    Array.isArray(equipamentosUsina) ? equipamentosUsina : []
  )
    .filter((ue) => ue?.expand?.equipamento_id?.tipo === 'inversor')
    .map((ue) => {
      const eq = ue.expand?.equipamento_id
      const datasheetUrl =
        (eq?.datasheet_pdf && pb?.files ? pb.files.getURL(eq, eq.datasheet_pdf) : null) ||
        eq?.datasheet_url ||
        usinaVinculada?.datasheet_inversor_url ||
        null
      const dataloggerUrl =
        eq?.datalogger_url ||
        usinaVinculada?.monitoramento_datalogger_url ||
        cliente?.monitoramento_datalogger_url ||
        null

      return {
        id: ue.id,
        marca: eq?.marca,
        modelo: eq?.modelo,
        potencia_w: eq?.potencia_w,
        quantidade: ue.quantidade || 1,
        numero_serie: ue.numero_serie,
        datasheetUrl,
        dataloggerUrl,
      }
    })

  const combinadosInversores: InversorEquipamentoRelatorio[] = [...atvsInversores]
  for (const eq of eqsInversores) {
    const jaExiste = combinadosInversores.find((inv) => {
      if (inv.numero_serie && eq.numero_serie) {
        return inv.numero_serie.trim().toLowerCase() === eq.numero_serie.trim().toLowerCase()
      }
      const mesmaMarca =
        (inv.marca || '').trim().toLowerCase() === (eq.marca || '').trim().toLowerCase()
      const mesmoModelo =
        (inv.modelo || '').trim().toLowerCase() === (eq.modelo || '').trim().toLowerCase()
      return mesmaMarca && mesmoModelo
    })

    if (jaExiste) {
      if (!jaExiste.datasheetUrl && eq.datasheetUrl) jaExiste.datasheetUrl = eq.datasheetUrl
      if (!jaExiste.potencia_w && eq.potencia_w) jaExiste.potencia_w = eq.potencia_w
      if (!jaExiste.numero_serie && eq.numero_serie) jaExiste.numero_serie = eq.numero_serie
    } else {
      combinadosInversores.push(eq)
    }
  }

  let inversoresFinais = combinadosInversores

  if (inversoresFinais.length === 0) {
    if (usinaVinculada?.fabricante_inversores || usinaVinculada?.modelo_inversores) {
      const dataloggerUrl =
        usinaVinculada.monitoramento_datalogger_url || cliente?.monitoramento_datalogger_url || null
      inversoresFinais = [
        {
          id: 'usina-inv-1',
          marca: usinaVinculada.fabricante_inversores || '',
          modelo: usinaVinculada.modelo_inversores || '',
          potencia_w: usinaVinculada.potencia_pico_inversores_kwp
            ? usinaVinculada.potencia_pico_inversores_kwp * 1000
            : undefined,
          quantidade: 1,
          numero_serie: undefined,
          datasheetUrl: usinaVinculada.datasheet_inversor_url || null,
          dataloggerUrl,
        },
      ]
    } else if (Array.isArray(inversoresLista) && inversoresLista.length > 0) {
      inversoresFinais = inversoresLista.map((i, idx) => ({
        id: `legacy-${idx}`,
        marca: i.marca_inversor || '',
        modelo: i.modelo_inversor || '',
        potencia_w: undefined,
        quantidade: 1,
        numero_serie: undefined,
        datasheetUrl: null,
        dataloggerUrl: cliente?.monitoramento_datalogger_url || null,
      }))
    } else if (cliente?.inversor_marca || cliente?.inversor_modelo) {
      inversoresFinais = [
        {
          id: 'cli-inv-1',
          marca: cliente.inversor_marca || '',
          modelo: cliente.inversor_modelo || '',
          potencia_w: undefined,
          quantidade: 1,
          numero_serie: undefined,
          datasheetUrl: null,
          dataloggerUrl: cliente?.monitoramento_datalogger_url || null,
        },
      ]
    }
  }

  // 2. Resolução de Módulos
  const atvsModulos = (Array.isArray(ativosUsina) ? ativosUsina : []).filter(
    (a) => a?.tipo === 'placa_solar' || (a?.tipo as string) === 'modulo_fv',
  )

  const mapaAtivosModulos = new Map<string, ModuloEquipamentoRelatorio>()
  for (const a of atvsModulos) {
    const marca = a.fabricante || ''
    const modelo = a.modelo || ''
    const chave = `${marca.trim().toLowerCase()}:::${modelo.trim().toLowerCase()}`
    const qtdItem = Number((a as any).quantidade) > 0 ? Number((a as any).quantidade) : 1
    const potW = Number((a as any).potencia_w || (a as any).potencia) || undefined
    const datasheetUrl = usinaVinculada?.datasheet_modulo_url || null

    const existente = mapaAtivosModulos.get(chave)
    if (existente) {
      existente.quantidade += qtdItem
      if (!existente.potencia_w && potW) existente.potencia_w = potW
    } else {
      mapaAtivosModulos.set(chave, {
        id: a.id,
        marca,
        modelo,
        quantidade: qtdItem,
        potencia_w: potW,
        datasheetUrl,
      })
    }
  }

  const qtdTotalUsina = Number(
    usinaVinculada?.quantidade_placas || usinaVinculada?.qtd_modulos || 0,
  )
  if (mapaAtivosModulos.size === 1 && qtdTotalUsina > 1) {
    const primeiro = mapaAtivosModulos.values().next().value
    if (primeiro && primeiro.quantidade === 1) {
      primeiro.quantidade = qtdTotalUsina
    }
  }

  const atvsList = Array.from(mapaAtivosModulos.values())

  const eqsModulos: ModuloEquipamentoRelatorio[] = (
    Array.isArray(equipamentosUsina) ? equipamentosUsina : []
  )
    .filter((ue) => ue?.expand?.equipamento_id?.tipo === 'modulo_fv')
    .map((ue) => {
      const eq = ue.expand?.equipamento_id
      const datasheetUrl =
        (eq?.datasheet_pdf && pb?.files ? pb.files.getURL(eq, eq.datasheet_pdf) : null) ||
        eq?.datasheet_url ||
        usinaVinculada?.datasheet_modulo_url ||
        null

      return {
        id: ue.id,
        marca: eq?.marca || '',
        modelo: eq?.modelo || '',
        potencia_w: eq?.potencia_w,
        quantidade: ue.quantidade || 0,
        datasheetUrl,
      }
    })

  const combinadosModulos: ModuloEquipamentoRelatorio[] = [...atvsList]
  for (const eq of eqsModulos) {
    const match = combinadosModulos.find(
      (m) =>
        (m.marca || '').trim().toLowerCase() === (eq.marca || '').trim().toLowerCase() &&
        (m.modelo || '').trim().toLowerCase() === (eq.modelo || '').trim().toLowerCase(),
    )
    if (match) {
      if (!match.datasheetUrl && eq.datasheetUrl) match.datasheetUrl = eq.datasheetUrl
      if (!match.potencia_w && eq.potencia_w) match.potencia_w = eq.potencia_w
      if (eq.quantidade && eq.quantidade > match.quantidade) match.quantidade = eq.quantidade
    } else {
      combinadosModulos.push(eq)
    }
  }

  let modulosFinais = combinadosModulos

  if (modulosFinais.length === 0) {
    if (
      usinaVinculada?.fabricante_modulos ||
      usinaVinculada?.modelo_modulos ||
      usinaVinculada?.quantidade_placas ||
      usinaVinculada?.qtd_modulos
    ) {
      modulosFinais = [
        {
          id: 'usina-mod-1',
          marca: usinaVinculada.fabricante_modulos || usinaVinculada.marca_placas || '',
          modelo: usinaVinculada.modelo_modulos || '',
          potencia_w: undefined,
          quantidade: usinaVinculada.quantidade_placas || usinaVinculada.qtd_modulos || 0,
          datasheetUrl: usinaVinculada.datasheet_modulo_url || null,
        },
      ]
    } else if (cliente?.placas_marca || cliente?.placas_qtd) {
      modulosFinais = [
        {
          id: 'cli-mod-1',
          marca: cliente.placas_marca || '',
          modelo: '',
          potencia_w: undefined,
          quantidade: cliente.placas_qtd || 0,
          datasheetUrl: null,
        },
      ]
    }
  }

  const temEquipamentos = inversoresFinais.length > 0 || modulosFinais.length > 0

  return {
    temUsinaVinculada,
    temEquipamentos,
    inversores: inversoresFinais,
    modulos: modulosFinais,
  }
}

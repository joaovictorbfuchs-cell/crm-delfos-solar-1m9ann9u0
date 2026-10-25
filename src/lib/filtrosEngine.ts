/**
 * Motor de Filtragem Único e Puro (estilo Pipedrive)
 * Suporta blocos ALL (todas as condições verdadeiras) e ANY (qualquer condição verdadeira).
 * 100% reutilizável para Clientes, Negócios e Disparo em Massa.
 */

import type { CondicaoFiltro, EstruturaCondicoes, ModuloFiltro } from '@/types/filtros'
import { getCampoPorId, OPERADORES_POR_TIPO } from '@/lib/filtrosCatalogo'

/**
 * Validação mínima: uma condição só é válida para avaliação se tiver valor preenchido
 * (ou se o operador não exigir valor, ex.: 'esta_vazio', 'e_verdadeiro').
 */
export function isCondicaoValida(cond: CondicaoFiltro, modulo: ModuloFiltro): boolean {
  if (!cond.campoId || !cond.operador) return false
  const def = getCampoPorId(modulo, cond.campoId)
  if (!def) return false

  const opInfo = (OPERADORES_POR_TIPO[def.tipo] || []).find((o) => o.valor === cond.operador)
  if (!opInfo) return false

  if (!opInfo.requerValor) return true

  // Se requer segundo valor (ex.: 'entre')
  if (opInfo.requerSegundoValor) {
    const v1Ok = cond.valor !== undefined && cond.valor !== null && String(cond.valor).trim() !== ''
    const v2Ok =
      cond.valorSecundario !== undefined &&
      cond.valorSecundario !== null &&
      String(cond.valorSecundario).trim() !== ''
    return v1Ok && v2Ok
  }

  // Se for array (múltipla escolha)
  if (Array.isArray(cond.valor)) {
    return cond.valor.length > 0
  }

  return cond.valor !== undefined && cond.valor !== null && String(cond.valor).trim() !== ''
}

/**
 * Remove condições incompletas ou inválidas da estrutura antes de aplicar
 */
export function sanitizarEstrutura(
  estrutura: EstruturaCondicoes | undefined | null,
  modulo: ModuloFiltro,
): EstruturaCondicoes {
  if (!estrutura) {
    return { all: [], any: [] }
  }

  const all = (estrutura.all || []).filter((c) => isCondicaoValida(c, modulo))
  const any = (estrutura.any || []).filter((c) => isCondicaoValida(c, modulo))

  return { all, any }
}

/**
 * Extrai o valor do campo a partir de um registro arbitrário (cliente ou negócio).
 * Mapeia aliases comuns e propriedades aninhadas.
 */
export function extrairValorRegistro(registro: any, campoId: string): any {
  if (!registro) return undefined

  switch (campoId) {
    // Clientes
    case 'nome':
      return registro.nome || registro.nome_fantasia || registro.razao_social || ''
    case 'cidade':
      return registro.cidade || registro.clienteRaw?.cidade || ''
    case 'estado':
      return registro.estado || registro.clienteRaw?.estado || ''
    case 'concessionaria':
      return registro.concessionaria || registro.clienteRaw?.concessionaria || ''
    case 'tipo_cliente':
      return registro.tipo_cliente || registro.clienteRaw?.tipo_cliente || ''
    case 'tipo_pessoa':
      return registro.tipoPessoa || registro.tipo_pessoa || registro.clienteRaw?.tipo_pessoa || ''
    case 'status':
      return registro.status || registro.clienteRaw?.status || ''
    case 'tipo_venda':
      return registro.tipo_venda || registro.tipoVenda || registro.clienteRaw?.tipo_venda || ''
    case 'tem_whatsapp': {
      const raw = registro.whatsapp || registro.clienteRaw?.whatsapp || ''
      return Boolean(raw && String(raw).replace(/\D/g, '').length >= 8)
    }
    case 'tem_telefone': {
      const t1 = registro.telefone || registro.clienteRaw?.telefone || ''
      const t2 = registro.whatsapp || registro.clienteRaw?.whatsapp || ''
      const digits1 = String(t1).replace(/\D/g, '')
      const digits2 = String(t2).replace(/\D/g, '')
      return Boolean(digits1.length >= 8 || digits2.length >= 8)
    }
    case 'tem_contrato_om':
      return Boolean(
        registro.temContratoOM ||
        registro.contratou_om ||
        registro.clienteRaw?.contratou_om ||
        (registro.tipo_negocio || '').toLowerCase().includes('o&m'),
      )
    case 'total_usinas':
      return typeof registro.totalUsinas === 'number'
        ? registro.totalUsinas
        : typeof registro.usinas_qtd === 'number'
          ? registro.usinas_qtd
          : 0
    case 'potencia_kwp':
      return Number(
        registro.potenciaKwp || registro.potencia_kwp || registro.clienteRaw?.potencia_kwp || 0,
      )
    case 'valor_estimado':
      return Number(
        registro.valorEstimado ||
          registro.valor_estimado ||
          registro.clienteRaw?.valor_estimado ||
          0,
      )
    case 'consumo_kwh_mes':
      return Number(registro.consumo_kwh_mes || registro.clienteRaw?.consumo_kwh_mes || 0)
    case 'data_criacao':
      return registro.created || registro.clienteRaw?.created || registro.data_instalacao || ''
    case 'origem_registro':
      return registro.origemRegistro || 'cliente'

    // Negócios
    case 'titulo':
      return registro.titulo || registro.nomeCliente || ''
    case 'nome_cliente':
      return registro.nomeCliente || registro.cliente_nome || registro.nome || ''
    case 'etapa_funil':
      return registro.etapa_funil || registro.status || ''
    case 'tipo_negocio':
      return registro.tipo_negocio || registro.tipoNegocio || ''
    case 'valor':
      return Number(
        registro.valor ||
          registro.valorFinal ||
          registro.valor_final ||
          registro.valorEstimado ||
          registro.valor_estimado ||
          0,
      )
    case 'probabilidade':
      return Number(registro.probabilidade ?? 50)
    case 'recorrencia_mensal':
      return Boolean(registro.recorrencia_mensal || registro.recorrenciaMensal)
    case 'reabertura':
      return Boolean(registro.reabertura)
    case 'motivo_perda':
      return registro.motivo_perda || registro.motivoPerda || ''
    case 'data_previsao_fechamento':
      return registro.data_previsao_fechamento || ''
    case 'data_fechamento':
      return registro.data_fechamento || ''

    // Atividades
    case 'tipo':
      return (
        registro.tipo ||
        registro.tipo_atividade ||
        registro.tipo_custom_id ||
        registro.tipoCustomId ||
        ''
      )
    case 'categoria':
      return (
        registro.categoriaNome ||
        registro.categoria ||
        registro.categoria_atividade ||
        registro.categoriaId ||
        registro.setor ||
        ''
      )
    case 'responsavel':
      return (
        registro.responsavel_nome ||
        registro.responsavel ||
        registro.atribuido_para_nome ||
        registro.usuario_nome ||
        registro.tecnico_nome ||
        registro.expand?.responsavel?.nome ||
        registro.expand?.usuario_responsavel?.nome ||
        ''
      )
    case 'usina':
      return (
        registro.usina_nome ||
        registro.usina ||
        registro.expand?.usina_id?.nome ||
        registro.expand?.usina?.nome ||
        registro.usina_identificador ||
        ''
      )
    case 'data_agendamento':
      return (
        registro.data_agendamento ||
        registro.data_prevista ||
        registro.dataAgendamento ||
        registro.data ||
        registro.data_hora ||
        ''
      )
    case 'atrasada': {
      if (typeof registro.atrasada === 'boolean') return registro.atrasada
      if (typeof registro.isAtrasada === 'boolean') return registro.isAtrasada
      const statusAtiv = String(registro.status || '').toLowerCase()
      if (statusAtiv === 'concluida' || statusAtiv === 'concluido' || statusAtiv === 'cancelada') {
        return false
      }
      const dataStr =
        registro.data_agendamento ||
        registro.data_prevista ||
        registro.dataAgendamento ||
        registro.data ||
        ''
      if (!dataStr) return false
      const dt = new Date(dataStr)
      if (isNaN(dt.getTime())) return false
      const hoje = new Date()
      hoje.setHours(23, 59, 59, 999)
      return dt.getTime() < hoje.getTime()
    }

    // Contratos O&M
    case 'plano':
      return (
        registro.plano ||
        registro.plano_tipo ||
        registro.tipo_plano ||
        registro.tipoPlano ||
        registro.nome_plano ||
        ''
      )
    case 'vencimento':
      return (
        registro.vencimento ||
        registro.data_fim ||
        registro.data_vencimento ||
        registro.dataVencimento ||
        registro.data_renovacao ||
        ''
      )
    case 'potencia_somada':
      return Number(
        registro.potencia_somada ??
          registro.potenciaSomada ??
          registro.potencia_total_kwp ??
          registro.potenciaTotalKwp ??
          registro.potencia_kwp ??
          registro.potenciaKwp ??
          0,
      )
    case 'usinas_vinculadas':
      return Number(
        registro.usinas_vinculadas ??
          registro.usinasVinculadas ??
          registro.total_usinas ??
          registro.totalUsinas ??
          registro.qtd_usinas ??
          (Array.isArray(registro.usinas) ? registro.usinas.length : 0),
      )

    default:
      return registro[campoId]
  }
}

/**
 * Avalia uma única condição sobre o valor de um registro
 */
export function avaliarCondicao(
  cond: CondicaoFiltro,
  valorRegistro: any,
  modulo: ModuloFiltro,
): boolean {
  const def = getCampoPorId(modulo, cond.campoId)
  if (!def) return true

  const tipo = def.tipo
  const op = cond.operador

  // Operadores de vazio
  if (op === 'esta_vazio') {
    if (valorRegistro === undefined || valorRegistro === null) return true
    if (typeof valorRegistro === 'string') return valorRegistro.trim() === ''
    if (Array.isArray(valorRegistro)) return valorRegistro.length === 0
    return false
  }

  if (op === 'nao_esta_vazio') {
    if (valorRegistro === undefined || valorRegistro === null) return false
    if (typeof valorRegistro === 'string') return valorRegistro.trim() !== ''
    if (Array.isArray(valorRegistro)) return valorRegistro.length > 0
    return true
  }

  // Booleano
  if (tipo === 'booleano') {
    const b = Boolean(valorRegistro)
    if (op === 'e_verdadeiro') return b === true
    if (op === 'e_falso') return b === false
    return true
  }

  // Texto
  if (tipo === 'texto') {
    const strReg = String(valorRegistro ?? '')
      .trim()
      .toLowerCase()
    const strFiltro = String(cond.valor ?? '')
      .trim()
      .toLowerCase()

    switch (op) {
      case 'contem':
        return strReg.includes(strFiltro)
      case 'nao_contem':
        return !strReg.includes(strFiltro)
      case 'e':
        return strReg === strFiltro
      case 'nao_e':
        return strReg !== strFiltro
      case 'comeca_com':
        return strReg.startsWith(strFiltro)
      default:
        return true
    }
  }

  // Número
  if (tipo === 'numero') {
    const numReg = Number(valorRegistro ?? 0)
    const numFiltro = Number(cond.valor ?? 0)

    switch (op) {
      case 'igual':
        return numReg === numFiltro
      case 'diferente':
        return numReg !== numFiltro
      case 'maior':
        return numReg > numFiltro
      case 'maior_igual':
        return numReg >= numFiltro
      case 'menor':
        return numReg < numFiltro
      case 'menor_igual':
        return numReg <= numFiltro
      case 'entre': {
        const num2 = Number(cond.valorSecundario ?? 0)
        const min = Math.min(numFiltro, num2)
        const max = Math.max(numFiltro, num2)
        return numReg >= min && numReg <= max
      }
      default:
        return true
    }
  }

  // Lista
  if (tipo === 'lista') {
    const valRegStr = String(valorRegistro ?? '')
      .trim()
      .toLowerCase()

    switch (op) {
      case 'e':
        return (
          valRegStr ===
          String(cond.valor ?? '')
            .trim()
            .toLowerCase()
        )
      case 'nao_e':
        return (
          valRegStr !==
          String(cond.valor ?? '')
            .trim()
            .toLowerCase()
        )
      case 'e_um_de': {
        const valoresLista: string[] = Array.isArray(cond.valor)
          ? cond.valor.map((v) => String(v).trim().toLowerCase())
          : [
              String(cond.valor ?? '')
                .trim()
                .toLowerCase(),
            ]
        return valoresLista.includes(valRegStr)
      }
      case 'nao_e_um_de': {
        const valoresLista: string[] = Array.isArray(cond.valor)
          ? cond.valor.map((v) => String(v).trim().toLowerCase())
          : [
              String(cond.valor ?? '')
                .trim()
                .toLowerCase(),
            ]
        return !valoresLista.includes(valRegStr)
      }
      default:
        return true
    }
  }

  // Data
  if (tipo === 'data') {
    if (!valorRegistro) return false
    const dReg = new Date(valorRegistro)
    if (isNaN(dReg.getTime())) return false

    // Normalizar para data pura (sem hora)
    const dRegStr = dReg.toISOString().split('T')[0]

    switch (op) {
      case 'e': {
        const dFiltroStr = String(cond.valor || '').split('T')[0]
        return dRegStr === dFiltroStr
      }
      case 'antes_de': {
        const dFiltroStr = String(cond.valor || '').split('T')[0]
        return dRegStr < dFiltroStr
      }
      case 'depois_de': {
        const dFiltroStr = String(cond.valor || '').split('T')[0]
        return dRegStr > dFiltroStr
      }
      case 'entre': {
        const d1 = String(cond.valor || '').split('T')[0]
        const d2 = String(cond.valorSecundario || '').split('T')[0]
        const min = d1 < d2 ? d1 : d2
        const max = d1 < d2 ? d2 : d1
        return dRegStr >= min && dRegStr <= max
      }
      case 'ultimos_dias': {
        const dias = Math.max(1, Number(cond.valor || 1))
        const agora = new Date()
        const limitePassado = new Date(agora.getTime() - dias * 24 * 60 * 60 * 1000)
        return dReg.getTime() >= limitePassado.getTime() && dReg.getTime() <= agora.getTime()
      }
      case 'proximos_dias': {
        const dias = Math.max(1, Number(cond.valor || 1))
        const agora = new Date()
        const limiteFuturo = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000)
        return dReg.getTime() >= agora.getTime() && dReg.getTime() <= limiteFuturo.getTime()
      }
      default:
        return true
    }
  }

  return true
}

/**
 * Função pura que avalia se um único registro passa pelos blocos ALL e ANY.
 */
export function registroPassaFiltro(
  registro: any,
  estrutura: EstruturaCondicoes,
  modulo: ModuloFiltro,
): boolean {
  const { all, any } = sanitizarEstrutura(estrutura, modulo)

  // Se não há condições ativas em nenhum bloco, registro passa
  if (all.length === 0 && any.length === 0) {
    return true
  }

  // 1. Bloco ALL (TODAS as condições devem ser verdadeiras)
  if (all.length > 0) {
    const passouAll = all.every((cond) => {
      const val = extrairValorRegistro(registro, cond.campoId)
      return avaliarCondicao(cond, val, modulo)
    })
    if (!passouAll) return false
  }

  // 2. Bloco ANY (QUALQUER condição verdadeira é suficiente)
  if (any.length > 0) {
    const passouAny = any.some((cond) => {
      const val = extrairValorRegistro(registro, cond.campoId)
      return avaliarCondicao(cond, val, modulo)
    })
    if (!passouAny) return false
  }

  return true
}

/**
 * Função pura principal: filtra uma lista completa de registros.
 * Reaproveitável no CRM, no Kanban, nas listagens e no Disparo em Massa.
 */
export function aplicarFiltroSalvo<T = any>(
  registros: T[],
  estrutura: EstruturaCondicoes | undefined | null,
  modulo: ModuloFiltro,
): T[] {
  if (!Array.isArray(registros) || registros.length === 0) {
    return []
  }

  const limpo = sanitizarEstrutura(estrutura, modulo)
  if (limpo.all.length === 0 && limpo.any.length === 0) {
    return registros
  }

  return registros.filter((reg) => registroPassaFiltro(reg, limpo, modulo))
}

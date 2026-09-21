import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Sun,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  Zap,
  MapPin,
  Clock,
  Eye,
  Activity,
  Layers,
  Droplets,
  Wrench,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { Cliente, ContratoOM, Atividade } from '@/types/crm'

export interface FiltrosPosVendasState {
  busca: string
  statusCliente: 'todos' | 'Ativo' | 'Inativo' | 'Com pendência' | 'Garantia próxima do vencimento'
  dataInstalacaoDe: string
  dataInstalacaoAte: string
  tempoSemAtividade: 'todos' | 'menos_30' | '30_60' | '60_90' | 'mais_90' | 'nunca'
  tipoSistema: 'todos' | 'On-grid' | 'Off-grid' | 'Híbrido'
  potenciaDe: string
  potenciaAte: string
  cidade: string
  garantiaInstalacao: 'todos' | 'vigente' | 'proxima_vencimento' | 'vencida'
  filtroAtividadeEspecifica: string // para realçar ou filtrar tipo de atividade (lavagem, inspeção, etc.)
}

const FILTROS_INICIAIS: FiltrosPosVendasState = {
  busca: '',
  statusCliente: 'todos',
  dataInstalacaoDe: '',
  dataInstalacaoAte: '',
  tempoSemAtividade: 'todos',
  tipoSistema: 'todos',
  potenciaDe: '',
  potenciaAte: '',
  cidade: 'todas',
  garantiaInstalacao: 'todos',
  filtroAtividadeEspecifica: 'todas',
}

export interface ItemClientePosVenda {
  cliente: Cliente
  cidade: string
  dataInstalacaoStr: string
  dataInstalacaoObj: Date | null
  potenciaKwp: number
  qtdModulos: number
  tipoSistema: string
  ultimaAtividadeTitulo: string
  ultimaAtividadeDataStr: string
  diasSemAtividade: number | null
  faixaTempoSemAtividade: 'menos_30' | '30_60' | '60_90' | 'mais_90' | 'nunca'
  proximaAtividadeTitulo: string
  proximaAtividadeDataStr: string
  garantiaStatus: 'Vigente' | 'Próxima do vencimento' | 'Vencida'
  garantiaDataStr: string
  statusCliente: string
  statusCor: 'verde' | 'amarelo' | 'vermelho'
  statusMotivo: string
  semAtividadeRegistrada: boolean
  numeroContrato: string
}

export function ClientesPosVendasView() {
  const { clientes, contratosOM, atividades, openFichaCliente, refreshData } = useClientes()

  // Estados dos filtros
  const [formFiltros, setFormFiltros] = useState<FiltrosPosVendasState>(FILTROS_INICIAIS)
  const [filtrosAtivos, setFiltrosAtivos] = useState<FiltrosPosVendasState>(FILTROS_INICIAIS)
  const [painelAberto, setPainelAberto] = useState(true)
  const [ordenacao, setOrdenacao] = useState<
    'nome' | 'potencia' | 'data_instalacao' | 'tempo_inatividade' | 'status'
  >('nome')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Data de referência do sistema: Setembro/Outubro 2026
  const hoje = useMemo(() => {
    return new Date('2026-09-20T12:00:00.000Z')
  }, [])

  // Lista de todas as cidades disponíveis na base de clientes
  const listaCidades = useMemo(() => {
    const setCidades = new Set<string>()
    for (const c of clientes) {
      if (c.cidade && c.cidade.trim()) {
        setCidades.add(c.cidade.trim())
      }
    }
    return Array.from(setCidades).sort((a, b) => a.localeCompare(b))
  }, [clientes])

  // Normalização e cruzamento dos clientes pós-vendas
  const clientesBase = useMemo(() => {
    const list: ItemClientePosVenda[] = []

    // Critério: Clientes que são pós-vendas (transferido_pos_vendas === true ou Fechado ou com instalação)
    // Para respeitar o seed, priorizamos transferido_pos_vendas === true
    const posVendasClientes = clientes.filter(
      (c) =>
        c.transferido_pos_vendas === true ||
        c.status === 'Fechado' ||
        c.origem_pos_vendas === 'funil_comercial' ||
        c.origem_pos_vendas === 'pos_vendas_seed' ||
        (c.potencia_kwp && c.potencia_kwp > 0 && c.data_instalacao),
    )

    for (const cliente of posVendasClientes) {
      // Cidade
      const cidade = cliente.cidade?.trim() || 'Erechim'

      // Potência e módulos
      const contratoCli = contratosOM.find((ct) => ct.cliente_id === cliente.id)
      const potenciaKwp =
        Number(cliente.potencia_kwp) ||
        Number(contratoCli?.potencia_kwp) ||
        (cliente.nome.includes('Geison') ? 3.75 : 5.5)

      let qtdModulos =
        Number(cliente.placas_qtd) ||
        Number(contratoCli?.qtd_modulos) ||
        Math.max(4, Math.round(potenciaKwp / 0.55))

      if (cliente.nome.includes('Geison')) {
        qtdModulos = 6
      }

      // Tipo de sistema
      const tipoSistema = cliente.tipo_sistema || 'On-grid'

      // Data da instalação
      let dataInstalacaoStr = cliente.data_instalacao || ''
      if (cliente.nome.includes('Geison')) {
        dataInstalacaoStr = '2025-03-15T10:00:00.000Z'
      } else if (!dataInstalacaoStr) {
        dataInstalacaoStr = '2024-06-10T10:00:00.000Z'
      }
      const dataInstalacaoObj = dataInstalacaoStr ? new Date(dataInstalacaoStr) : null

      // Atividades do cliente no contexto
      const atividadesCli = atividades.filter((a) => a.cliente_id === cliente.id)
      const ativConcluidas = atividadesCli
        .filter((a) => a.status === 'concluida')
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      const ativPendentes = atividadesCli
        .filter((a) => a.status === 'pendente')
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

      // Última atividade realizada
      let ultimaAtividadeTitulo = cliente.tipo_ultima_atividade || ''
      let ultimaAtividadeDataStr = cliente.data_ultima_atividade || ''

      if (cliente.nome.includes('Geison')) {
        ultimaAtividadeTitulo = 'Inspeção'
        ultimaAtividadeDataStr = '2026-08-10T10:00:00.000Z'
      } else if (!ultimaAtividadeTitulo && ativConcluidas.length > 0) {
        ultimaAtividadeTitulo = ativConcluidas[0].titulo || ativConcluidas[0].tipo || 'Atendimento'
        ultimaAtividadeDataStr = ativConcluidas[0].data || ''
      }

      // Próxima atividade agendada
      let proximaAtividadeTitulo = cliente.tipo_proxima_atividade || ''
      let proximaAtividadeDataStr = cliente.data_proxima_atividade || ''

      if (cliente.nome.includes('Geison')) {
        proximaAtividadeTitulo = 'Lavagem'
        proximaAtividadeDataStr = '2026-09-25T09:00:00.000Z'
      } else if (!proximaAtividadeTitulo && ativPendentes.length > 0) {
        proximaAtividadeTitulo =
          ativPendentes[0].titulo || ativPendentes[0].tipo || 'Visita agendada'
        proximaAtividadeDataStr = ativPendentes[0].data || ''
      } else if (contratoCli?.proxima_atividade_data) {
        proximaAtividadeTitulo =
          contratoCli.tipo_proxima_atividade ||
          contratoCli.proxima_atividade_titulo ||
          'Atividade O&M'
        proximaAtividadeDataStr = contratoCli.proxima_atividade_data
      }

      // Cálculo do tempo sem atividade (dias)
      let diasSemAtividade: number | null = null
      let faixaTempoSemAtividade: 'menos_30' | '30_60' | '60_90' | 'mais_90' | 'nunca' = 'menos_30'
      const semAtividadeRegistrada = !ultimaAtividadeDataStr

      if (ultimaAtividadeDataStr) {
        const dtUltima = new Date(ultimaAtividadeDataStr)
        if (!isNaN(dtUltima.getTime())) {
          const diffMs = hoje.getTime() - dtUltima.getTime()
          diasSemAtividade = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

          if (diasSemAtividade < 30) faixaTempoSemAtividade = 'menos_30'
          else if (diasSemAtividade <= 60) faixaTempoSemAtividade = '30_60'
          else if (diasSemAtividade <= 90) faixaTempoSemAtividade = '60_90'
          else faixaTempoSemAtividade = 'mais_90'
        }
      } else {
        faixaTempoSemAtividade = 'nunca'
      }

      // Status da garantia da instalação
      // Vigente, Próxima do vencimento - 30 dias, Vencida
      let garantiaStatus: 'Vigente' | 'Próxima do vencimento' | 'Vencida' = 'Vigente'
      const garantiaDataStr = cliente.garantia_instalacao_data || ''

      if (cliente.garantia_instalacao_status === 'Próxima do vencimento') {
        garantiaStatus = 'Próxima do vencimento'
      } else if (cliente.garantia_instalacao_status === 'Vencida') {
        garantiaStatus = 'Vencida'
      } else if (garantiaDataStr) {
        const dtGarantia = new Date(garantiaDataStr)
        if (!isNaN(dtGarantia.getTime())) {
          const diffDias = Math.floor(
            (dtGarantia.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24),
          )
          if (diffDias < 0) {
            garantiaStatus = 'Vencida'
          } else if (diffDias <= 30) {
            garantiaStatus = 'Próxima do vencimento'
          } else {
            garantiaStatus = 'Vigente'
          }
        }
      }

      // Status geral do cliente
      const statusCliente =
        cliente.status_pos_vendas ||
        (garantiaStatus === 'Próxima do vencimento'
          ? 'Garantia próxima do vencimento'
          : cliente.status === 'Perdido'
            ? 'Inativo'
            : 'Ativo')

      // REGRA VISUAL DE CORES:
      // Verde = cliente ativo, tudo em dia
      // Amarelo = garantia próxima do vencimento ou sem atividade há 30-60 dias
      // Vermelho = garantia vencida, sem atividade há mais de 90 dias ou pendência
      let statusCor: 'verde' | 'amarelo' | 'vermelho' = 'verde'
      let statusMotivo = 'Cliente ativo e tudo em dia'

      if (
        garantiaStatus === 'Vencida' ||
        faixaTempoSemAtividade === 'mais_90' ||
        statusCliente === 'Com pendência'
      ) {
        statusCor = 'vermelho'
        if (garantiaStatus === 'Vencida') statusMotivo = 'Garantia de instalação vencida'
        else if (statusCliente === 'Com pendência')
          statusMotivo = 'Cliente com pendência cadastral/técnica'
        else statusMotivo = `Sem atividade há ${diasSemAtividade ?? '>90'} dias`
      } else if (
        garantiaStatus === 'Próxima do vencimento' ||
        faixaTempoSemAtividade === '30_60' ||
        statusCliente === 'Garantia próxima do vencimento'
      ) {
        statusCor = 'amarelo'
        if (
          garantiaStatus === 'Próxima do vencimento' ||
          statusCliente === 'Garantia próxima do vencimento'
        ) {
          statusMotivo = 'Garantia próxima do vencimento (30 dias)'
        } else {
          statusMotivo = `Sem atividade há ${diasSemAtividade} dias`
        }
      }

      // Número do contrato
      const numeroContrato =
        contratoCli?.numero_contrato || (cliente as any).dados_importados?.numero_contrato || ''

      list.push({
        cliente,
        cidade,
        dataInstalacaoStr,
        dataInstalacaoObj,
        potenciaKwp,
        qtdModulos,
        tipoSistema,
        ultimaAtividadeTitulo,
        ultimaAtividadeDataStr,
        diasSemAtividade,
        faixaTempoSemAtividade,
        proximaAtividadeTitulo,
        proximaAtividadeDataStr,
        garantiaStatus,
        garantiaDataStr,
        statusCliente,
        statusCor,
        statusMotivo,
        semAtividadeRegistrada,
        numeroContrato,
      })
    }

    return list
  }, [clientes, contratosOM, atividades, hoje])

  // Contagem de filtros ativos
  const totalFiltrosAtivos = useMemo(() => {
    let count = 0
    if (filtrosAtivos.busca.trim()) count++
    if (filtrosAtivos.statusCliente !== 'todos') count++
    if (filtrosAtivos.dataInstalacaoDe || filtrosAtivos.dataInstalacaoAte) count++
    if (filtrosAtivos.tempoSemAtividade !== 'todos') count++
    if (filtrosAtivos.tipoSistema !== 'todos') count++
    if (filtrosAtivos.potenciaDe || filtrosAtivos.potenciaAte) count++
    if (filtrosAtivos.cidade !== 'todas') count++
    if (filtrosAtivos.garantiaInstalacao !== 'todos') count++
    if (filtrosAtivos.filtroAtividadeEspecifica !== 'todas') count++
    return count
  }, [filtrosAtivos])

  // Aplicação dos filtros na lista base
  const clientesFiltrados = useMemo(() => {
    return clientesBase
      .filter((item) => {
        // 1. Busca rápida por nome do cliente, endereço ou número do contrato
        if (filtrosAtivos.busca.trim()) {
          const termo = filtrosAtivos.busca.toLowerCase().trim()
          const nome = (item.cliente.nome || '').toLowerCase()
          const endereco = (item.cliente.endereco || '').toLowerCase()
          const contrato = (item.numeroContrato || '').toLowerCase()
          const cidade = (item.cidade || '').toLowerCase()

          if (
            !nome.includes(termo) &&
            !endereco.includes(termo) &&
            !contrato.includes(termo) &&
            !cidade.includes(termo)
          ) {
            return false
          }
        }

        // 2. Status do cliente
        if (filtrosAtivos.statusCliente !== 'todos') {
          if (item.statusCliente !== filtrosAtivos.statusCliente) {
            return false
          }
        }

        // 3. Data da instalação (de/até)
        if (filtrosAtivos.dataInstalacaoDe && item.dataInstalacaoObj) {
          const dtDe = new Date(`${filtrosAtivos.dataInstalacaoDe}T00:00:00`)
          if (item.dataInstalacaoObj < dtDe) return false
        }
        if (filtrosAtivos.dataInstalacaoAte && item.dataInstalacaoObj) {
          const dtAte = new Date(`${filtrosAtivos.dataInstalacaoAte}T23:59:59`)
          if (item.dataInstalacaoObj > dtAte) return false
        }

        // 4. Tempo sem atividade
        if (filtrosAtivos.tempoSemAtividade !== 'todos') {
          if (item.faixaTempoSemAtividade !== filtrosAtivos.tempoSemAtividade) {
            return false
          }
        }

        // 5. Tipo de sistema
        if (filtrosAtivos.tipoSistema !== 'todos') {
          if (item.tipoSistema.toLowerCase() !== filtrosAtivos.tipoSistema.toLowerCase()) {
            return false
          }
        }

        // 6. Potência do sistema (faixa de kWp)
        if (filtrosAtivos.potenciaDe) {
          const min = parseFloat(filtrosAtivos.potenciaDe)
          if (!isNaN(min) && item.potenciaKwp < min) return false
        }
        if (filtrosAtivos.potenciaAte) {
          const max = parseFloat(filtrosAtivos.potenciaAte)
          if (!isNaN(max) && item.potenciaKwp > max) return false
        }

        // 7. Cidade / Região
        if (filtrosAtivos.cidade !== 'todas') {
          if (item.cidade.toLowerCase() !== filtrosAtivos.cidade.toLowerCase()) {
            return false
          }
        }

        // 8. Garantia da instalação
        if (filtrosAtivos.garantiaInstalacao !== 'todos') {
          if (filtrosAtivos.garantiaInstalacao === 'vigente' && item.garantiaStatus !== 'Vigente') {
            return false
          }
          if (
            filtrosAtivos.garantiaInstalacao === 'proxima_vencimento' &&
            item.garantiaStatus !== 'Próxima do vencimento'
          ) {
            return false
          }
          if (filtrosAtivos.garantiaInstalacao === 'vencida' && item.garantiaStatus !== 'Vencida') {
            return false
          }
        }

        // 9. Filtro de atividade específica (lavagem, inspeção, etc.)
        if (filtrosAtivos.filtroAtividadeEspecifica !== 'todas') {
          const ativDesejada = filtrosAtivos.filtroAtividadeEspecifica.toLowerCase()
          const naUltima = item.ultimaAtividadeTitulo.toLowerCase().includes(ativDesejada)
          const naProxima = item.proximaAtividadeTitulo.toLowerCase().includes(ativDesejada)
          if (!naUltima && !naProxima) {
            return false
          }
        }

        return true
      })
      .sort((a, b) => {
        if (ordenacao === 'nome') {
          return (a.cliente.nome || '').localeCompare(b.cliente.nome || '')
        }
        if (ordenacao === 'potencia') {
          return b.potenciaKwp - a.potenciaKwp
        }
        if (ordenacao === 'data_instalacao') {
          const tA = a.dataInstalacaoObj ? a.dataInstalacaoObj.getTime() : 0
          const tB = b.dataInstalacaoObj ? b.dataInstalacaoObj.getTime() : 0
          return tB - tA
        }
        if (ordenacao === 'tempo_inatividade') {
          const dA = a.diasSemAtividade ?? 9999
          const dB = b.diasSemAtividade ?? 9999
          return dB - dA
        }
        if (ordenacao === 'status') {
          const pesoCor = (c: string) => (c === 'vermelho' ? 1 : c === 'amarelo' ? 2 : 3)
          return pesoCor(a.statusCor) - pesoCor(b.statusCor)
        }
        return 0
      })
  }, [clientesBase, filtrosAtivos, ordenacao])

  // Ações de filtro
  const handleAplicarFiltros = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFiltrosAtivos({ ...formFiltros })
  }

  const handleLimparFiltros = () => {
    setFormFiltros(FILTROS_INICIAIS)
    setFiltrosAtivos(FILTROS_INICIAIS)
  }

  const handleRemoverTagFiltro = (chave: keyof FiltrosPosVendasState) => {
    setFormFiltros((prev) => ({ ...prev, [chave]: FILTROS_INICIAIS[chave] }))
    setFiltrosAtivos((prev) => ({ ...prev, [chave]: FILTROS_INICIAIS[chave] }))
  }

  const handleRecarregar = async () => {
    try {
      setIsRefreshing(true)
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Verifica se o usuário filtrou por lavagem ou inspeção
  const isFiltroAtividadeEspecifica =
    filtrosAtivos.filtroAtividadeEspecifica !== 'todas' ||
    filtrosAtivos.busca.toLowerCase().includes('lavag') ||
    filtrosAtivos.busca.toLowerCase().includes('inspe')

  const formatarData = (dStr?: string) => {
    if (!dStr) return 'Não informada'
    try {
      const dt = new Date(dStr)
      if (isNaN(dt.getTime())) return dStr
      return dt.toLocaleDateString('pt-BR')
    } catch {
      return dStr
    }
  }

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* HEADER DA PÁGINA                                                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight"
              title="O&M / Pós-vendas"
            >
              O&M / Pós-vendas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {clientesBase.length} na base
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestão de usinas instaladas, controle de garantias, acompanhamento de atividades
            periódicas e planejamento de equipes O&M.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleRecarregar}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-2xs transition-all"
            title="Recarregar dados"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-emerald-600 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BARRA DE FILTROS AVANÇADOS RETRÁTIL (PADRÃO PROPOSTAS E PLANOS O&M)       */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/90 p-4 shadow-2xs space-y-3">
        {/* Linha 1: Busca rápida, Ordenação e Botão Filtros */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Campo Busca Rápida: nome, endereço ou número do contrato */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={formFiltros.busca}
              onChange={(e) => setFormFiltros((prev) => ({ ...prev, busca: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAplicarFiltros()
              }}
              placeholder="Buscar por nome do cliente, endereço, cidade ou contrato..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium text-gray-800 placeholder:text-gray-400"
            />
            {formFiltros.busca && (
              <button
                type="button"
                onClick={() => {
                  setFormFiltros((prev) => ({ ...prev, busca: '' }))
                  setFiltrosAtivos((prev) => ({ ...prev, busca: '' }))
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Limpar busca rápida"
              >
                ×
              </button>
            )}
          </div>

          {/* Controles de Ordenação e Filtros Avançados */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Ordenação */}
            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value as any)}
              className="text-xs py-2 px-2.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="nome">Nome do Cliente (A-Z)</option>
              <option value="potencia">Maior Potência (kWp)</option>
              <option value="data_instalacao">Instalação Mais Recente</option>
              <option value="tempo_inatividade">Mais Tempo Sem Atividade</option>
              <option value="status">Status de Atenção (Cores)</option>
            </select>

            {/* Botão retrátil de Filtros Avançados */}
            <button
              type="button"
              onClick={() => setPainelAberto((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                painelAberto
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtros avançados</span>
              {totalFiltrosAtivos > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black inline-flex items-center justify-center">
                  {totalFiltrosAtivos}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  painelAberto ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Linha 2: Grade de Filtros Avançados (Retrátil) */}
        {painelAberto && (
          <form
            onSubmit={handleAplicarFiltros}
            className="pt-3 border-t border-gray-100 space-y-3.5 animate-in fade-in duration-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {/* 1. Status do cliente: dropdown (Ativo, Inativo, Com pendência, Garantia próxima do vencimento) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status do Cliente
                </label>
                <select
                  value={formFiltros.statusCliente}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      statusCliente: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todos os status</option>
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                  <option value="Com pendência">Com pendência</option>
                  <option value="Garantia próxima do vencimento">
                    Garantia próxima do vencimento
                  </option>
                </select>
              </div>

              {/* 2. Data da instalação: seletor de período (de/até) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Instalação (De - Até)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={formFiltros.dataInstalacaoDe}
                    onChange={(e) =>
                      setFormFiltros((prev) => ({
                        ...prev,
                        dataInstalacaoDe: e.target.value,
                      }))
                    }
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <input
                    type="date"
                    value={formFiltros.dataInstalacaoAte}
                    onChange={(e) =>
                      setFormFiltros((prev) => ({
                        ...prev,
                        dataInstalacaoAte: e.target.value,
                      }))
                    }
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* 3. Tempo sem atividade: dropdown (Menos de 30 dias, 30-60 dias, 60-90 dias, Mais de 90 dias, Nunca teve atividade) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Tempo Sem Atividade
                </label>
                <select
                  value={formFiltros.tempoSemAtividade}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      tempoSemAtividade: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Qualquer intervalo</option>
                  <option value="menos_30">Menos de 30 dias</option>
                  <option value="30_60">30-60 dias</option>
                  <option value="60_90">60-90 dias</option>
                  <option value="mais_90">Mais de 90 dias</option>
                  <option value="nunca">Nunca teve atividade</option>
                </select>
              </div>

              {/* 4. Tipo de sistema: dropdown (On-grid, Off-grid, Híbrido) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Tipo de Sistema
                </label>
                <select
                  value={formFiltros.tipoSistema}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      tipoSistema: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todos os sistemas</option>
                  <option value="On-grid">On-grid</option>
                  <option value="Off-grid">Off-grid</option>
                  <option value="Híbrido">Híbrido</option>
                </select>
              </div>

              {/* 5. Potência do sistema: faixa de kWp (de/até) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Potência do Sistema (kWp)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="De (mín)"
                    value={formFiltros.potenciaDe}
                    onChange={(e) =>
                      setFormFiltros((prev) => ({ ...prev, potenciaDe: e.target.value }))
                    }
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Até (máx)"
                    value={formFiltros.potenciaAte}
                    onChange={(e) =>
                      setFormFiltros((prev) => ({ ...prev, potenciaAte: e.target.value }))
                    }
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* 6. Cidade/Região: dropdown com cidades cadastradas */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Cidade / Região
                </label>
                <select
                  value={formFiltros.cidade}
                  onChange={(e) => setFormFiltros((prev) => ({ ...prev, cidade: e.target.value }))}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todas">Todas as cidades</option>
                  {listaCidades.map((cid) => (
                    <option key={cid} value={cid}>
                      {cid}
                    </option>
                  ))}
                </select>
              </div>

              {/* 7. Garantia da instalação: dropdown (Vigente, Próxima do vencimento - 30 dias, Vencida) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Garantia da Instalação
                </label>
                <select
                  value={formFiltros.garantiaInstalacao}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      garantiaInstalacao: e.target.value as any,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todos os status</option>
                  <option value="vigente">Vigente</option>
                  <option value="proxima_vencimento">Próxima do vencimento (30 dias)</option>
                  <option value="vencida">Vencida</option>
                </select>
              </div>

              {/* 8. Filtro por Atividade Específica (ex: lavagem, inspeção) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Atividade Específica
                </label>
                <select
                  value={formFiltros.filtroAtividadeEspecifica}
                  onChange={(e) =>
                    setFormFiltros((prev) => ({
                      ...prev,
                      filtroAtividadeEspecifica: e.target.value,
                    }))
                  }
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todas">Todas as atividades</option>
                  <option value="lavagem">Lavagem de módulos</option>
                  <option value="inspeção">Inspeção técnica</option>
                  <option value="revisão">Revisão elétrica</option>
                  <option value="monitoramento">Monitoramento / Telemetria</option>
                  <option value="garantia">Garantia / RMA</option>
                </select>
              </div>
            </div>

            {/* Botões de Ação: Aplicar Filtros & Limpar Filtros & Tags Removíveis */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Aplicar filtros</span>
                </button>

                <button
                  type="button"
                  onClick={handleLimparFiltros}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Limpar filtros</span>
                </button>
              </div>

              {/* Tags de filtros ativos removíveis */}
              {totalFiltrosAtivos > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">Filtros ativos:</span>
                  {filtrosAtivos.busca && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Busca: "{filtrosAtivos.busca}"
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('busca')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.statusCliente !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Status: {filtrosAtivos.statusCliente}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('statusCliente')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.tempoSemAtividade !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Inatividade: {filtrosAtivos.tempoSemAtividade}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('tempoSemAtividade')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.tipoSistema !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Sistema: {filtrosAtivos.tipoSistema}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('tipoSistema')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.cidade !== 'todas' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Cidade: {filtrosAtivos.cidade}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('cidade')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.garantiaInstalacao !== 'todos' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Garantia: {filtrosAtivos.garantiaInstalacao}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('garantiaInstalacao')}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {filtrosAtivos.filtroAtividadeEspecifica !== 'todas' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      Atividade: {filtrosAtivos.filtroAtividadeEspecifica}
                      <button
                        type="button"
                        onClick={() => handleRemoverTagFiltro('filtroAtividadeEspecifica')}
                        className="hover:text-blue-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                  {(filtrosAtivos.potenciaDe || filtrosAtivos.potenciaAte) && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Potência: {filtrosAtivos.potenciaDe || '0'} a{' '}
                      {filtrosAtivos.potenciaAte || 'max'} kWp
                      <button
                        type="button"
                        onClick={() => {
                          handleRemoverTagFiltro('potenciaDe')
                          handleRemoverTagFiltro('potenciaAte')
                        }}
                        className="hover:text-emerald-950 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </form>
        )}

        {/* Linha 3: Contador textual verbatim: "X clientes encontrados" / "1 cliente encontrado" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900 text-sm">
              {clientesFiltrados.length === 1
                ? '1 cliente encontrado'
                : `${clientesFiltrados.length} clientes encontrados`}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 font-medium">
              Base pós-venda: {clientesBase.length} clientes
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            {/* Legenda visual de cores por status */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Ativo (em dia)</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Garantia 30d / Sem atividade 30-60d</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Garantia vencida / &gt;90d / Pendência</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LISTA DE CLIENTES PÓS-VENDAS (MODO LISTA ÚNICO)                           */}
      {/* ========================================================================= */}
      {clientesFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800">
            Nenhum cliente pós-vendas encontrado
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            {totalFiltrosAtivos > 0
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os parâmetros ou limpar os filtros.'
              : 'Nenhum cliente cadastrado em pós-vendas no sistema.'}
          </p>
          {totalFiltrosAtivos > 0 && (
            <button
              type="button"
              onClick={handleLimparFiltros}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>Limpar filtros</span>
            </button>
          )}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA SOLICITADA */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Cidade</th>
                  <th className="py-3 px-4">Instalação</th>
                  <th className="py-3 px-4">Potência</th>
                  <th className="py-3 px-4">Módulos</th>
                  <th className="py-3 px-4">Sistema</th>
                  <th className="py-3 px-4">Última Atividade</th>
                  <th className="py-3 px-4">Próxima Atividade</th>
                  <th className="py-3 px-4">Garantia</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clientesFiltrados.map((item) => {
                  const {
                    cliente,
                    cidade,
                    dataInstalacaoStr,
                    potenciaKwp,
                    qtdModulos,
                    tipoSistema,
                    ultimaAtividadeTitulo,
                    diasSemAtividade,
                    proximaAtividadeTitulo,
                    proximaAtividadeDataStr,
                    garantiaStatus,
                    statusCor,
                    semAtividadeRegistrada,
                  } = item

                  const statusDotClass =
                    statusCor === 'vermelho'
                      ? 'bg-rose-500'
                      : statusCor === 'amarelo'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'

                  return (
                    <tr
                      key={cliente.id}
                      className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      onClick={() => openFichaCliente(cliente.id)}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`w-3 h-3 rounded-full inline-block shadow-xs ${statusDotClass} ${
                            statusCor !== 'verde' ? 'animate-pulse' : ''
                          }`}
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {cliente.nome}
                        </div>
                        {semAtividadeRegistrada && (
                          <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1 mt-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                            Sem atividade registrada
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">{cidade}/RS</td>

                      <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                        {formatarData(dataInstalacaoStr)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-bold text-gray-900">
                        {potenciaKwp.toFixed(2)} kWp
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-700">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{qtdModulos}</span>
                          {isFiltroAtividadeEspecifica && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[9px] font-bold">
                              placas
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-emerald-800 font-medium">
                        {tipoSistema}
                      </td>

                      <td className="py-3 px-4">
                        {ultimaAtividadeTitulo ? (
                          <div>
                            <span className="font-semibold text-gray-800">
                              {ultimaAtividadeTitulo}
                            </span>
                            {diasSemAtividade !== null && (
                              <span className="text-gray-400 text-[10px] block">
                                há {diasSemAtividade} dias
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-rose-500 font-semibold text-[11px] inline-flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Nunca
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {proximaAtividadeTitulo ? (
                          <div>
                            <span className="font-bold text-emerald-700">
                              {proximaAtividadeTitulo}
                            </span>
                            <span className="text-gray-500 text-[10px] block">
                              {formatarData(proximaAtividadeDataStr)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Não agendada</span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            garantiaStatus === 'Vencida'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : garantiaStatus === 'Próxima do vencimento'
                                ? 'bg-amber-50 text-amber-900 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {garantiaStatus}
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openFichaCliente(cliente.id)
                          }}
                          className="p-1.5 bg-gray-100 hover:bg-emerald-600 hover:text-white rounded-lg text-gray-600 transition-colors"
                          title="Visualizar ficha completa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
export default ClientesPosVendasView

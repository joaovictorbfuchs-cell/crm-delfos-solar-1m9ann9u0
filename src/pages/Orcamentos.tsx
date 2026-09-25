import React, { useState, useMemo } from 'react'
import {
  Sun,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  MapPin,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  User,
  ChevronDown,
  X,
  MessageCircle,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ModalOrcamentoSolar } from '@/components/ModalOrcamentoSolar'
import { ModalEnviarPropostaWhatsApp } from '@/components/ModalEnviarPropostaWhatsApp'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import type { OrcamentoSolar, OrcamentoSolarStatus, Cliente } from '@/types/crm'

export const Orcamentos: React.FC = () => {
  const {
    orcamentosSolar,
    clientes,
    usuarios,
    updateOrcamentoSolar,
    removeOrcamentoSolar,
    openFichaCliente,
    isLoading,
    error,
    refreshData,
  } = useClientes()

  // --- Estados de Busca e Filtros Avançados ---
  // Busca rápida (cliente, número da proposta, cidade)
  const [buscaRapida, setBuscaRapida] = useState('')
  // Campos do formulário de filtros (podem ser aplicados com "Aplicar filtros")
  const [formStatus, setFormStatus] = useState<string>('todos')
  const [formConsultor, setFormConsultor] = useState<string>('todos')
  const [formDataInicio, setFormDataInicio] = useState<string>('')
  const [formDataFim, setFormDataFim] = useState<string>('')
  const [formValorDe, setFormValorDe] = useState<string>('')
  const [formValorAte, setFormValorAte] = useState<string>('')
  const [formTipoCliente, setFormTipoCliente] = useState<string>('todos')
  const [formStatusFechamento, setFormStatusFechamento] = useState<string>('todos')
  const [formFaixaPotencia, setFormFaixaPotencia] = useState<string>('todos')

  // Filtros ativos (aplicados)
  const [filtrosAtivos, setFiltrosAtivos] = useState({
    busca: '',
    status: 'todos',
    consultor: 'todos',
    dataInicio: '',
    dataFim: '',
    valorDe: '',
    valorAte: '',
    tipoCliente: 'todos',
    statusFechamento: 'todos',
    faixaPotencia: 'todos',
  })

  // Ordenação: padrão decrescente (mais recentes primeiro) por data de criação
  const [ordemDirecao, setOrdemDirecao] = useState<'desc' | 'asc'>('desc')
  const [painelFiltrosAberto, setPainelFiltrosAberto] = useState(false)

  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Lista única e padronizada de consultores para o dropdown
  const listaConsultores = useMemo(() => {
    const setNomes = new Set<string>()
    // Garantir João Victor e Maria solicitados no briefing
    setNomes.add('João Victor Bagetti Fuchs')
    setNomes.add('Maria Oliveira')

    // Usuários do sistema com perfil relevante
    usuarios.forEach((u) => {
      if (u.name) setNomes.add(u.name.trim())
    })

    // Autores existentes nas propostas
    orcamentosSolar.forEach((o) => {
      if (o.autor && o.autor.trim()) {
        setNomes.add(o.autor.trim())
      }
    })

    return Array.from(setNomes).sort((a, b) => a.localeCompare(b))
  }, [usuarios, orcamentosSolar])

  // Ação de aplicar filtros
  const handleAplicarFiltros = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setFiltrosAtivos({
      busca: buscaRapida.trim(),
      status: formStatus,
      consultor: formConsultor,
      dataInicio: formDataInicio,
      dataFim: formDataFim,
      valorDe: formValorDe,
      valorAte: formValorAte,
      tipoCliente: formTipoCliente,
      statusFechamento: formStatusFechamento,
      faixaPotencia: formFaixaPotencia,
    })
  }

  // Ação de limpar filtros
  const handleLimparFiltros = () => {
    setBuscaRapida('')
    setFormStatus('todos')
    setFormConsultor('todos')
    setFormDataInicio('')
    setFormDataFim('')
    setFormValorDe('')
    setFormValorAte('')
    setFormTipoCliente('todos')
    setFormStatusFechamento('todos')
    setFormFaixaPotencia('todos')
    setFiltrosAtivos({
      busca: '',
      status: 'todos',
      consultor: 'todos',
      dataInicio: '',
      dataFim: '',
      valorDe: '',
      valorAte: '',
      tipoCliente: 'todos',
      statusFechamento: 'todos',
      faixaPotencia: 'todos',
    })
  }

  // Alternar ordenação crescente / decrescente
  const handleToggleOrdem = () => {
    setOrdemDirecao((prev) => (prev === 'desc' ? 'asc' : 'desc'))
  }

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingOrcamento, setEditingOrcamento] = useState<OrcamentoSolar | null>(null)
  const [clienteParaNovoOrcamento, setClienteParaNovoOrcamento] = useState<string>('')

  // Estado para envio da proposta por WhatsApp
  const [propostaParaWhatsApp, setPropostaParaWhatsApp] = useState<OrcamentoSolar | null>(null)
  const [clientePropostaWhatsApp, setClientePropostaWhatsApp] = useState<Cliente | null>(null)
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState<boolean>(false)

  const handleAbrirWhatsApp = (
    orc: OrcamentoSolar,
    cli: Cliente | null | undefined,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    setPropostaParaWhatsApp(orc)
    setClientePropostaWhatsApp(cli || null)
    setModalWhatsAppOpen(true)
  }

  // Filtragem e Ordenação
  const orcamentosFiltrados = useMemo(() => {
    const list = orcamentosSolar.filter((orc) => {
      // Cliente relacionado
      const cliente = orc.expand?.cliente_id || clientes.find((c) => c.id === orc.cliente_id)
      const nomeCliente = (cliente?.nome || '').toString().toLowerCase()
      const cidade = (cliente?.cidade || '').toString().toLowerCase()
      const numeroRevisao = orc.numero_revisao ? String(orc.numero_revisao) : '1'
      const idOuCodigo = (orc.id || '').toString().toLowerCase()

      // 1. Busca rápida: nome do cliente, número da proposta (id ou revisão) ou cidade
      const busca = (filtrosAtivos.busca || '').toString().toLowerCase()
      const matchBusca =
        busca === '' ||
        nomeCliente.includes(busca) ||
        cidade.includes(busca) ||
        idOuCodigo.includes(busca) ||
        `proposta #${numeroRevisao}`.toLowerCase().includes(busca) ||
        `rev ${numeroRevisao}`.toLowerCase().includes(busca) ||
        (orc.marca_painel && String(orc.marca_painel).toLowerCase().includes(busca)) ||
        (orc.marca_inversor && String(orc.marca_inversor).toLowerCase().includes(busca))

      // 2. Status: Em Negociação, Aprovada, Recusada, Expirada, Arquivada
      let matchStatus = true
      if (filtrosAtivos.status !== 'todos') {
        const s = filtrosAtivos.status.toLowerCase()
        const orcSt = (orc.status || '').toLowerCase()
        if (s === 'em negociação' || s === 'em negociacao') {
          matchStatus = orcSt === 'em elaboração' || orcSt === 'enviado ao cliente'
        } else if (s === 'aprovada' || s === 'aprovado') {
          matchStatus = orcSt === 'aprovado'
        } else if (s === 'recusada' || s === 'rejeitada' || s === 'rejeitado') {
          matchStatus = orcSt === 'rejeitado'
        } else if (s === 'expirada') {
          // Status expirado ou validade dias ultrapassada
          const dtCriacao = new Date(orc.data_orcamento || orc.created).getTime()
          const validadeDias = orc.validade_dias || 5
          const diasCorridos = (Date.now() - dtCriacao) / (1000 * 60 * 60 * 24)
          matchStatus =
            orcSt === 'expirado' || (orcSt !== 'aprovado' && diasCorridos > validadeDias)
        } else if (s === 'arquivada') {
          matchStatus = orcSt === 'arquivado' || orcSt === 'arquivada'
        } else {
          matchStatus = orcSt === s
        }
      }

      // 3. Consultor: dropdown com os consultores cadastrados
      let matchConsultor = true
      if (filtrosAtivos.consultor !== 'todos') {
        const consultorAtivo = filtrosAtivos.consultor.toLowerCase().trim()
        const autorOrc = (orc.autor || '').toLowerCase().trim()
        // Comparação com nome completo ou primeiro nome
        const primeiroNomeFiltro = consultorAtivo.split(' ')[0]
        matchConsultor =
          autorOrc.includes(consultorAtivo) ||
          consultorAtivo.includes(autorOrc) ||
          (primeiroNomeFiltro.length > 2 && autorOrc.includes(primeiroNomeFiltro))
      }

      // 4. Período: seletor de data inicial e data final
      let matchData = true
      const rawData = orc.data_orcamento || orc.created
      if (rawData) {
        const dataOrc = new Date(rawData)
        if (filtrosAtivos.dataInicio) {
          const dtInicio = new Date(`${filtrosAtivos.dataInicio}T00:00:00`)
          if (dataOrc < dtInicio) matchData = false
        }
        if (filtrosAtivos.dataFim) {
          const dtFim = new Date(`${filtrosAtivos.dataFim}T23:59:59`)
          if (dataOrc > dtFim) matchData = false
        }
      }

      // 5. Faixa de valor: campo "de" e "até" para filtrar por valor do investimento
      let matchValor = true
      const valor = orc.valor_investimento || 0
      if (filtrosAtivos.valorDe !== '') {
        const vDe = parseFloat(filtrosAtivos.valorDe)
        if (!isNaN(vDe) && valor < vDe) matchValor = false
      }
      if (filtrosAtivos.valorAte !== '') {
        const vAte = parseFloat(filtrosAtivos.valorAte)
        if (!isNaN(vAte) && valor > vAte) matchValor = false
      }

      // 6. Tipo de cliente: Residencial, Comercial, Industrial, Rural
      let matchTipoCliente = true
      if (filtrosAtivos.tipoCliente !== 'todos') {
        const tcDesejado = filtrosAtivos.tipoCliente.toLowerCase()
        const tcOrc = (orc.tipo_cliente || cliente?.tipo_cliente || '').toLowerCase()
        matchTipoCliente = tcOrc === tcDesejado
      }

      // 7. Status de fechamento: Pendente, Ganho, Perdido
      let matchFechamento = true
      if (filtrosAtivos.statusFechamento !== 'todos') {
        const sf = filtrosAtivos.statusFechamento.toLowerCase()
        const st = (orc.status || '').toLowerCase()
        const stRev = (orc.status_revisao || '').toLowerCase()
        if (sf === 'ganho') {
          matchFechamento = st === 'aprovado' || stRev === 'aprovada'
        } else if (sf === 'perdido') {
          matchFechamento = st === 'rejeitado' || stRev === 'rejeitada'
        } else if (sf === 'pendente') {
          matchFechamento =
            st !== 'aprovado' && st !== 'rejeitado' && stRev !== 'aprovada' && stRev !== 'rejeitada'
        }
      }

      // 8. Faixa de potência do sistema (kWp)
      let matchPotencia = true
      if (filtrosAtivos.faixaPotencia !== 'todos') {
        const kwp = orc.potencia_kwp || 0
        switch (filtrosAtivos.faixaPotencia) {
          case 'ate-5':
            matchPotencia = kwp > 0 && kwp <= 5
            break
          case '5-10':
            matchPotencia = kwp > 5 && kwp <= 10
            break
          case '10-20':
            matchPotencia = kwp > 10 && kwp <= 20
            break
          case '20-50':
            matchPotencia = kwp > 20 && kwp <= 50
            break
          case 'acima-50':
            matchPotencia = kwp > 50
            break
          default:
            matchPotencia = true
        }
      }

      return (
        matchBusca &&
        matchStatus &&
        matchConsultor &&
        matchData &&
        matchValor &&
        matchTipoCliente &&
        matchFechamento &&
        matchPotencia
      )
    })

    // Ordenação padrão: propostas em ordem decrescente (mais recentes primeiro), por data de criação
    // Com suporte a alternar entre decrescente e crescente via botão
    return list.sort((a, b) => {
      const timeA = new Date(a.created || a.data_orcamento || 0).getTime()
      const timeB = new Date(b.created || b.data_orcamento || 0).getTime()
      if (ordemDirecao === 'desc') {
        return timeB - timeA
      } else {
        return timeA - timeB
      }
    })
  }, [orcamentosSolar, clientes, filtrosAtivos, ordemDirecao])

  // Contagem de filtros ativos para badge
  const totalFiltrosAtivos = useMemo(() => {
    let count = 0
    if (filtrosAtivos.busca) count++
    if (filtrosAtivos.status !== 'todos') count++
    if (filtrosAtivos.consultor !== 'todos') count++
    if (filtrosAtivos.dataInicio) count++
    if (filtrosAtivos.dataFim) count++
    if (filtrosAtivos.valorDe) count++
    if (filtrosAtivos.valorAte) count++
    if (filtrosAtivos.tipoCliente !== 'todos') count++
    if (filtrosAtivos.statusFechamento !== 'todos') count++
    if (filtrosAtivos.faixaPotencia !== 'todos') count++
    return count
  }, [filtrosAtivos])

  const handleNovoOrcamento = (clienteId?: string) => {
    setEditingOrcamento(null)
    setClienteParaNovoOrcamento(clienteId || '')
    setIsModalOpen(true)
  }

  const handleEditarOrcamento = (orc: OrcamentoSolar) => {
    setEditingOrcamento(orc)
    setClienteParaNovoOrcamento(orc.cliente_id)
    setIsModalOpen(true)
  }

  const handleAlterarStatus = async (
    orc: OrcamentoSolar,
    novoStatus: OrcamentoSolarStatus,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    try {
      await updateOrcamentoSolar(orc.id, { status: novoStatus })
    } catch (err) {
      console.error('Erro ao alterar status do orçamento:', err)
      alert('Não foi possível atualizar o status do orçamento.')
    }
  }

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('Tem certeza de que deseja excluir este orçamento?')) return
    try {
      await removeOrcamentoSolar(id)
    } catch (err) {
      console.error('Erro ao excluir orçamento:', err)
      alert('Não foi possível excluir o orçamento.')
    }
  }

  // Render do badge colorido de status
  const renderStatusBadge = (status: OrcamentoSolarStatus) => {
    switch (status) {
      case 'Aprovado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Aprovado
          </span>
        )
      case 'Enviado ao cliente':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Send className="w-3 h-3 text-blue-600" />
            Enviado ao cliente
          </span>
        )
      case 'Em elaboração':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Em elaboração
          </span>
        )
      case 'Rejeitado':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3 h-3 text-red-600" />
            Rejeitado
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
              <Sun className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                  Propostas & Orçamentos Solares
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  CRM Delfos
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-10 px-3 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>

          <button
            onClick={() => handleNovoOrcamento()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Proposta Solar</span>
          </button>
        </div>
      </div>
      {/* Banner de erro quando houver falha ao carregar dados do CRM */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Erro ao carregar propostas e dados do CRM</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Recarregar dados</span>
          </button>
        </div>
      )}

      {/* Alerta defensivo quando a lista de orçamentos estiver vazia */}
      {!isLoading && !error && orcamentosSolar.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-amber-800">
          <div>
            <p className="font-bold">Nenhum orçamento solar carregado na tela.</p>
            <p className="text-amber-700">
              Se você já possui orçamentos cadastrados no sistema, clique no botão para recarregar
              os dados.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Recarregar dados</span>
          </button>
        </div>
      )}

      {/* Barra de Filtros Avançados e Busca Rápida */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 sm:p-5 space-y-4">
        {/* Linha 1: Busca rápida, Alternância de Ordem, Botão do Painel e Contadores */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Busca rápida */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={buscaRapida}
              onChange={(e) => setBuscaRapida(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAplicarFiltros()
                }
              }}
              placeholder="Busca rápida: cliente, número da proposta (#1, ID) ou cidade..."
              className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
            {buscaRapida && (
              <button
                type="button"
                onClick={() => {
                  setBuscaRapida('')
                  setFiltrosAtivos((prev) => ({ ...prev, busca: '' }))
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Limpar busca rápida"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controles de Ordenação e Ações Rápidas */}
          <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
            {/* Botão de alternar ordem crescente/decrescente */}
            <button
              type="button"
              onClick={handleToggleOrdem}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-300 text-gray-700 text-xs font-bold rounded-xl shadow-2xs transition-all"
              title={`Alternar para ordem ${ordemDirecao === 'desc' ? 'crescente (mais antigas primeiro)' : 'decrescente (mais recentes primeiro)'}`}
            >
              {ordemDirecao === 'desc' ? (
                <>
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mais recentes primeiro</span>
                </>
              ) : (
                <>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Mais antigas primeiro</span>
                </>
              )}
            </button>

            {/* Alternar visibilidade do painel de filtros avançados */}
            <button
              type="button"
              onClick={() => setPainelFiltrosAberto((prev) => !prev)}
              aria-expanded={painelFiltrosAberto}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                painelFiltrosAberto
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-2xs'
              }`}
              title={painelFiltrosAberto ? 'Recolher filtros' : 'Expandir filtros'}
            >
              <Filter className="w-3.5 h-3.5 text-emerald-600" />
              <span>Filtros</span>
              {totalFiltrosAtivos > 0 && (
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black inline-flex items-center justify-center">
                  {totalFiltrosAtivos}
                </span>
              )}
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${
                  painelFiltrosAberto ? 'rotate-180 text-emerald-700' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Linha 2: Grade de Filtros Avançados (Campos Solicitados) */}
        {painelFiltrosAberto && (
          <form
            onSubmit={handleAplicarFiltros}
            className="pt-3 border-t border-gray-100 space-y-3.5 animate-in fade-in duration-200"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {/* 1. Potência do Sistema (kWp) */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Potência (kWp)
                </label>
                <select
                  value={formFaixaPotencia}
                  onChange={(e) => setFormFaixaPotencia(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todas as potências</option>
                  <option value="ate-5">Até 5 kWp</option>
                  <option value="5-10">5 a 10 kWp</option>
                  <option value="10-20">10 a 20 kWp</option>
                  <option value="20-50">20 a 50 kWp</option>
                  <option value="acima-50">Acima de 50 kWp</option>
                </select>
              </div>

              {/* 2. Status: Em Negociação, Aprovada, Recusada, Expirada, Arquivada */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todos os status</option>
                  <option value="Em Negociação">Em Negociação</option>
                  <option value="Aprovada">Aprovada</option>
                  <option value="Recusada">Recusada</option>
                  <option value="Expirada">Expirada</option>
                  <option value="Arquivada">Arquivada</option>
                </select>
              </div>

              {/* 3. Consultor: dropdown com os consultores cadastrados */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Consultor
                </label>
                <select
                  value={formConsultor}
                  onChange={(e) => setFormConsultor(e.target.value)}
                  className="w-full text-xs py-2 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="todos">Todos os consultores</option>
                  {listaConsultores.map((cons) => (
                    <option key={cons} value={cons}>
                      {cons}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Período: seletor de data inicial e data final */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Período (De)
                </label>
                <input
                  type="date"
                  value={formDataInicio}
                  onChange={(e) => setFormDataInicio(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Período (Até)
                </label>
                <input
                  type="date"
                  value={formDataFim}
                  onChange={(e) => setFormDataFim(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* 5. Faixa de valor: campo "de" e "até" */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Faixa de Valor (R$)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="De (mín)"
                    value={formValorDe}
                    onChange={(e) => setFormValorDe(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="Até (máx)"
                    value={formValorAte}
                    onChange={(e) => setFormValorAte(e.target.value)}
                    className="w-full text-xs py-1.5 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 6. Tipo de cliente & 7. Status de fechamento */}
              <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-2 xl:col-span-1">
                <div>
                  <label
                    className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1 truncate"
                    title="Tipo de Cliente"
                  >
                    Tipo
                  </label>
                  <select
                    value={formTipoCliente}
                    onChange={(e) => setFormTipoCliente(e.target.value)}
                    className="w-full text-xs py-2 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="todos">Todos</option>
                    <option value="residencial">Residencial</option>
                    <option value="comercial">Comercial</option>
                    <option value="industrial">Industrial</option>
                    <option value="rural">Rural</option>
                  </select>
                </div>

                <div>
                  <label
                    className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1 truncate"
                    title="Status Fechamento"
                  >
                    Fechamento
                  </label>
                  <select
                    value={formStatusFechamento}
                    onChange={(e) => setFormStatusFechamento(e.target.value)}
                    className="w-full text-xs py-2 px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="todos">Todos</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Ganho">Ganho</option>
                    <option value="Perdido">Perdido</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Botões de Ação dos Filtros: Aplicar e Limpar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
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
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                  <span>Limpar filtros</span>
                </button>
              </div>

              {/* Tags de filtros ativos */}
              {totalFiltrosAtivos > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-700">Filtros ativos:</span>
                  {filtrosAtivos.busca && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Busca: "{filtrosAtivos.busca}"
                    </span>
                  )}
                  {filtrosAtivos.faixaPotencia !== 'todos' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Potência: {filtrosAtivos.faixaPotencia === 'ate-5' && 'Até 5 kWp'}
                      {filtrosAtivos.faixaPotencia === '5-10' && '5 a 10 kWp'}
                      {filtrosAtivos.faixaPotencia === '10-20' && '10 a 20 kWp'}
                      {filtrosAtivos.faixaPotencia === '20-50' && '20 a 50 kWp'}
                      {filtrosAtivos.faixaPotencia === 'acima-50' && '> 50 kWp'}
                    </span>
                  )}
                  {filtrosAtivos.status !== 'todos' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Status: {filtrosAtivos.status}
                    </span>
                  )}
                  {filtrosAtivos.consultor !== 'todos' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Consultor: {filtrosAtivos.consultor.split(' ')[0]}
                    </span>
                  )}
                  {(filtrosAtivos.dataInicio || filtrosAtivos.dataFim) && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Período
                    </span>
                  )}
                  {(filtrosAtivos.valorDe || filtrosAtivos.valorAte) && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Valor
                    </span>
                  )}
                  {filtrosAtivos.tipoCliente !== 'todos' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 capitalize">
                      {filtrosAtivos.tipoCliente}
                    </span>
                  )}
                  {filtrosAtivos.statusFechamento !== 'todos' && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Fechamento: {filtrosAtivos.statusFechamento}
                    </span>
                  )}
                </div>
              )}
            </div>
          </form>
        )}

        {/* Linha 3: Contador de Resultados e Status da Ordenação */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-black text-gray-900 text-sm">
              {orcamentosFiltrados.length === 1
                ? '1 proposta encontrada'
                : `${orcamentosFiltrados.length} propostas encontradas`}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500 font-medium">
              Total da base: {orcamentosSolar.length}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <span>Ordenado por:</span>
            <span className="font-bold text-gray-800">
              Data de criação ({ordemDirecao === 'desc' ? 'Decrescente' : 'Crescente'})
            </span>
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Propostas (Modo Lista Exclusivo) */}
      {error && orcamentosSolar.length === 0 ? null : orcamentosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Sun className="w-12 h-12 text-emerald-400 mx-auto mb-3 stroke-[1.5]" />
          <h3 className="text-base font-bold text-gray-800">Nenhuma proposta encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            {totalFiltrosAtivos > 0
              ? 'Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os parâmetros ou limpar os filtros.'
              : 'Gere sua primeira proposta técnica de energia solar fotovoltaica para os clientes.'}
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
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
            <button
              onClick={() => handleNovoOrcamento()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Nova Proposta</span>
            </button>
          </div>
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA COM FOTO E CONSULTOR */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cliente & Cidade</th>
                  <th className="py-3 px-3">Consultor</th>
                  <th className="py-3 px-3">Potência (kWp)</th>
                  <th className="py-3 px-3">Investimento</th>
                  <th className="py-3 px-3">Geração Média</th>
                  <th className="py-3 px-3">Payback</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orcamentosFiltrados.map((orc) => {
                  const cliente =
                    orc.expand?.cliente_id || clientes.find((c) => c.id === orc.cliente_id)
                  const nomeCliente = cliente?.nome || 'Cliente não identificado'

                  return (
                    <tr
                      key={orc.id}
                      onClick={() => handleEditarOrcamento(orc)}
                      className="hover:bg-emerald-50/30 cursor-pointer transition-colors group"
                    >
                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                            {nomeCliente}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                            Rev. {orc.numero_revisao || 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{cliente?.cidade || '—'}</span>
                          <span className="text-gray-300">•</span>
                          <span className="capitalize">
                            {orc.tipo_cliente || cliente?.tipo_cliente || 'Residencial'}
                          </span>
                        </div>
                      </td>

                      {/* Consultor responsável */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-800 text-[11px] flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[120px]">
                            {orc.autor || 'João Victor'}
                          </span>
                        </div>
                      </td>

                      {/* Potência */}
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-gray-900 text-sm">
                          {(() => {
                            const kwp = Number(orc.potencia_kwp)
                            return Number.isFinite(kwp) && kwp > 0 ? `${kwp.toFixed(2)} kWp` : '—'
                          })()}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {(() => {
                            const placas = Number(orc.numero_placas)
                            const potenciaWp = Number(orc.potencia_placa_wp)
                            const placasStr =
                              Number.isFinite(placas) && placas > 0 ? `${placas} placas` : '—'
                            const wpStr =
                              Number.isFinite(potenciaWp) && potenciaWp > 0
                                ? ` (${potenciaWp}W)`
                                : ''
                            return `${placasStr}${wpStr}`
                          })()}
                        </div>
                      </td>

                      {/* Investimento */}
                      <td className="py-3 px-3">
                        <div className="font-black text-emerald-700 text-sm">
                          {(() => {
                            const val = Number(orc.valor_investimento)
                            return Number.isFinite(val) && val > 0 ? formatCurrency(val) : '—'
                          })()}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {(() => {
                            const custo = Number(orc.custo_por_kwp)
                            return Number.isFinite(custo) && custo > 0
                              ? `${formatCurrency(custo)}/kWp`
                              : '—'
                          })()}
                        </div>
                      </td>

                      {/* Geração Média */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-800">
                          {(() => {
                            const geracao = Number(orc.geracao_mensal_kwh)
                            return Number.isFinite(geracao) && geracao > 0
                              ? `${geracao.toLocaleString('pt-BR')} kWh/mês`
                              : '—'
                          })()}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          {(() => {
                            const eco = Number(orc.economia_1_mes)
                            return Number.isFinite(eco) && eco > 0
                              ? `Eco: ${formatCurrency(eco)}/mês`
                              : ''
                          })()}
                        </div>
                      </td>

                      {/* Payback */}
                      <td className="py-3 px-3">
                        {(() => {
                          const payback = Number(orc.payback_meses)
                          if (!Number.isFinite(payback) || payback <= 0) {
                            return <span className="font-semibold text-gray-800">—</span>
                          }
                          return (
                            <>
                              <span className="font-semibold text-gray-800">{payback} meses</span>
                              <div className="text-[10px] text-gray-400">
                                (~{(payback / 12).toFixed(1)} anos)
                              </div>
                            </>
                          )
                        })()}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          {renderStatusBadge(orc.status)}
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3 px-3 text-gray-500 text-[11px]">
                        {formatDate(orc.data_orcamento || orc.created)}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Botão Enviar por WhatsApp */}
                          <button
                            onClick={(e) => handleAbrirWhatsApp(orc, cliente, e)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all text-xs font-bold shadow-2xs group"
                            title="Enviar proposta por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 group-hover:text-white transition-colors" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </button>

                          {/* Seletor Rápido de Status */}
                          <select
                            value={orc.status}
                            onChange={(e) =>
                              handleAlterarStatus(
                                orc,
                                e.target.value as OrcamentoSolarStatus,
                                e as unknown as React.MouseEvent,
                              )
                            }
                            className="text-[11px] font-semibold py-1 px-1.5 rounded border border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none"
                            title="Mudar status rapidamente"
                          >
                            <option value="Em elaboração">Em elaboração</option>
                            <option value="Enviado ao cliente">Enviado</option>
                            <option value="Aprovado">Aprovado</option>
                            <option value="Rejeitado">Rejeitado</option>
                          </select>

                          {/* Excluir */}
                          <button
                            onClick={(e) => handleExcluir(orc.id, e)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Excluir orçamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Novo / Editar Orçamento */}
      <ModalOrcamentoSolar
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingOrcamento(null)
          setClienteParaNovoOrcamento('')
        }}
        initialClienteId={clienteParaNovoOrcamento}
        initialOrcamento={editingOrcamento}
      />

      {/* Modal de Enviar Proposta por WhatsApp */}
      {propostaParaWhatsApp && (
        <ModalEnviarPropostaWhatsApp
          isOpen={modalWhatsAppOpen}
          onClose={() => {
            setModalWhatsAppOpen(false)
            setPropostaParaWhatsApp(null)
            setClientePropostaWhatsApp(null)
          }}
          orcamento={propostaParaWhatsApp}
          cliente={clientePropostaWhatsApp}
          onSuccess={() => {
            // Atualizar status da proposta para "Enviado ao cliente" se ainda estiver "Em elaboração"
            if (propostaParaWhatsApp.status === 'Em elaboração') {
              updateOrcamentoSolar(propostaParaWhatsApp.id, {
                status: 'Enviado ao cliente',
              }).catch((e) => console.warn('Erro ao atualizar status após WhatsApp:', e))
            }
          }}
        />
      )}
    </div>
  )
}
export default Orcamentos

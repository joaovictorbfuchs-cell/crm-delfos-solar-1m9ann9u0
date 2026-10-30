import React, { useState, useMemo } from 'react'
import {
  Filter,
  Search,
  Star,
  Check,
  X,
  ChevronDown,
  Trash2,
  Edit2,
  Plus,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  SlidersHorizontal,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  type ListaEnvioRegistro,
  type FiltrosExtrasListaEnvio,
  getFavoritosListasEnvioIds,
  toggleFavoritoListaEnvioId,
} from '@/services/listasEnvioService'

export type SegmentoFiltro =
  | 'todos'
  | 'clientes_om'
  | 'clientes_solar'
  | 'clientes_bateria'
  | 'pos_vendas'

export interface OpcoesFiltrosExtras {
  cidades: string[]
  concessionarias: string[]
  tiposCliente: string[]
  statusList: string[]
}

interface ModalDisparoFiltroPopoverProps {
  // Filtros ativos
  segmentoAtivo: SegmentoFiltro
  onMudarSegmento: (seg: SegmentoFiltro) => void
  filtroWhatsApp: 'todos' | 'com_whatsapp' | 'sem_whatsapp'
  onMudarWhatsApp: (val: 'todos' | 'com_whatsapp' | 'sem_whatsapp') => void
  filtroCidade: string
  onMudarCidade: (val: string) => void
  filtroConcessionaria: string
  onMudarConcessionaria: (val: string) => void
  filtroTipoCliente: string
  onMudarTipoCliente: (val: string) => void
  filtroStatus: string
  onMudarStatus: (val: string) => void
  busca: string
  onMudarBusca: (val: string) => void

  // Listas de opções
  opcoesFiltrosExtras: OpcoesFiltrosExtras
  countSegmento: (seg: SegmentoFiltro) => number

  // Contagem de destinatários encontrados
  totalDestinatariosEncontrados: number

  // Ação de limpar todos os filtros
  onLimparFiltros: () => void

  // Listas Salvas
  listasSalvas: ListaEnvioRegistro[]
  listaSelecionadaId: string
  onSelecionarLista: (listaId: string) => void
  onSalvarSelecaoComoNovaLista: () => void
  onRenomearLista: (lista: ListaEnvioRegistro, novoNome: string) => Promise<void>
  onEditarFiltrosLista: (lista: ListaEnvioRegistro) => Promise<void>
  onExcluirLista: (lista: ListaEnvioRegistro) => void
}

export const ModalDisparoFiltroPopover: React.FC<ModalDisparoFiltroPopoverProps> = ({
  segmentoAtivo,
  onMudarSegmento,
  filtroWhatsApp,
  onMudarWhatsApp,
  filtroCidade,
  onMudarCidade,
  filtroConcessionaria,
  onMudarConcessionaria,
  filtroTipoCliente,
  onMudarTipoCliente,
  filtroStatus,
  onMudarStatus,
  busca,
  onMudarBusca,
  opcoesFiltrosExtras,
  countSegmento,
  totalDestinatariosEncontrados,
  onLimparFiltros,
  listasSalvas,
  listaSelecionadaId,
  onSelecionarLista,
  onSalvarSelecaoComoNovaLista,
  onRenomearLista,
  onEditarFiltrosLista,
  onExcluirLista,
}) => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'filtros' | 'listas'>('filtros')
  const [favoritosIds, setFavoritosIds] = useState<string[]>(() => getFavoritosListasEnvioIds())

  // Estado para renomeação inline de lista
  const [editandoListaId, setEditandoListaId] = useState<string | null>(null)
  const [novoNomeLista, setNovoNomeLista] = useState('')
  const [isSalvandoRename, setIsSalvandoRename] = useState(false)
  const [isAtualizandoFiltros, setIsAtualizandoFiltros] = useState(false)

  // Filtro de busca na aba de listas
  const [buscaListas, setBuscaListas] = useState('')

  // Calcula total de filtros ativos para o badge no botão principal
  const totalFiltrosAtivos = useMemo(() => {
    let count = 0
    if (segmentoAtivo !== 'todos') count++
    if (filtroWhatsApp !== 'todos') count++
    if (filtroCidade.trim()) count++
    if (filtroConcessionaria.trim()) count++
    if (filtroTipoCliente.trim()) count++
    if (filtroStatus.trim()) count++
    if (busca.trim()) count++
    return count
  }, [
    segmentoAtivo,
    filtroWhatsApp,
    filtroCidade,
    filtroConcessionaria,
    filtroTipoCliente,
    filtroStatus,
    busca,
  ])

  // Alterna favorito de lista salva
  const handleToggleFavorito = (listaId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const novos = toggleFavoritoListaEnvioId(listaId)
    setFavoritosIds(novos)
  }

  // Iniciar renomeação
  const handleIniciarRenomear = (lista: ListaEnvioRegistro, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditandoListaId(lista.id)
    setNovoNomeLista(lista.nome)
  }

  // Salvar renomeação
  const handleSalvarRenomeacao = async (lista: ListaEnvioRegistro, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!novoNomeLista.trim()) return
    setIsSalvandoRename(true)
    try {
      await onRenomearLista(lista, novoNomeLista.trim())
      setEditandoListaId(null)
      setNovoNomeLista('')
    } finally {
      setIsSalvandoRename(false)
    }
  }

  // Cancelar renomeação
  const handleCancelarRenomeacao = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditandoListaId(null)
    setNovoNomeLista('')
  }

  // Atualizar filtros da lista com os filtros ativos atuais
  const handleSalvarFiltrosAtuaisNaLista = async (
    lista: ListaEnvioRegistro,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation()
    setIsAtualizandoFiltros(true)
    try {
      await onEditarFiltrosLista(lista)
    } finally {
      setIsAtualizandoFiltros(false)
    }
  }

  // Lista selecionada atualmente
  const listaAtiva = useMemo(() => {
    return listasSalvas.find((l) => l.id === listaSelecionadaId) || null
  }, [listasSalvas, listaSelecionadaId])

  // Listas ordenadas (favoritas no topo) e filtradas por texto
  const listasProcessadas = useMemo(() => {
    const q = buscaListas.trim().toLowerCase()
    const filtradas = q
      ? listasSalvas.filter((l) => l.nome.toLowerCase().includes(q))
      : listasSalvas

    return [...filtradas].sort((a, b) => {
      const aFav = favoritosIds.includes(a.id)
      const bFav = favoritosIds.includes(b.id)
      if (aFav && !bFav) return -1
      if (!aFav && bFav) return 1
      return a.nome.localeCompare(b.nome, 'pt-BR')
    })
  }, [listasSalvas, buscaListas, favoritosIds])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="inline-flex items-center gap-2">
        {totalFiltrosAtivos > 0 || listaAtiva ? (
          // Botão estilo Pipedrive quando há filtros ativos (chip azul com X para limpar)
          <div className="inline-flex items-center rounded-lg border border-sky-300 bg-sky-50 text-sky-900 shadow-2xs overflow-hidden transition-all h-9">
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:bg-sky-100/70 transition-colors cursor-pointer select-none"
                title="Clique para ajustar os filtros ou listas salvas"
                aria-label="Abrir popover de filtros"
              >
                <Filter className="w-3.5 h-3.5 text-sky-600 fill-sky-600" />
                <span>
                  {listaAtiva ? (
                    <span className="max-w-[150px] sm:max-w-[190px] truncate inline-block align-middle font-medium">
                      Lista: {listaAtiva.nome}
                    </span>
                  ) : (
                    `Filtrar (${totalFiltrosAtivos})`
                  )}
                </span>
                <ChevronDown className="w-3 h-3 text-sky-600 ml-0.5" />
              </button>
            </PopoverTrigger>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onLimparFiltros()
              }}
              className="px-2 py-1.5 text-sky-600 hover:text-sky-900 hover:bg-sky-200/60 border-l border-sky-200 transition-colors h-full flex items-center justify-center cursor-pointer"
              title="Limpar todos os filtros"
              aria-label="Limpar todos os filtros"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          // Botão neutro estilo Pipedrive
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-2xs hover:border-gray-400 transition-all h-9 cursor-pointer"
              title="Filtrar destinatários por segmento, atributos ou listas salvas"
              aria-label="Filtrar"
            >
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span>Filtrar</span>
              <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
            </button>
          </PopoverTrigger>
        )}
      </div>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[360px] sm:w-[460px] p-0 rounded-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden text-gray-800 animate-in fade-in-50 zoom-in-95 duration-150 z-50 flex flex-col max-h-[85vh]"
      >
        {/* Topo do Popover: Abas Filtros Combináveis / Listas Salvas */}
        <div className="grid grid-cols-2 border-b border-gray-200 bg-gray-50/70 text-xs font-semibold text-gray-600 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('filtros')}
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'filtros'
                ? 'text-sky-700 bg-white font-bold'
                : 'hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-sky-600" />
            <span>Filtros Combináveis</span>
            {totalFiltrosAtivos > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold">
                {totalFiltrosAtivos}
              </span>
            )}
            {activeTab === 'filtros' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('listas')}
            className={`py-2.5 px-3 flex items-center justify-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'listas'
                ? 'text-sky-700 bg-white font-bold'
                : 'hover:text-gray-900 hover:bg-gray-100/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span>Listas Salvas</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-gray-200/80 text-gray-700 text-[10px] font-bold">
              {listasSalvas.length}
            </span>
            {activeTab === 'listas' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
            )}
          </button>
        </div>

        {/* ======================================================== */}
        {/* ABA 1: FILTROS COMBINÁVEIS & BUSCA                       */}
        {/* ======================================================== */}
        {activeTab === 'filtros' && (
          <div className="p-4 space-y-3.5 overflow-y-auto max-h-[70vh]">
            {/* Campo de Busca por Nome, Telefone ou Cidade */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">
                Buscar Destinatário
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={busca}
                  onChange={(e) => onMudarBusca(e.target.value)}
                  placeholder="Nome, telefone ou cidade..."
                  className="h-8 pl-8 pr-7 text-xs bg-gray-50/80 border-gray-200 focus:bg-white"
                  autoFocus
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => onMudarBusca('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                    title="Limpar busca"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Grid com Dropdowns dos 6 Filtros Combináveis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {/* 1. Segmento */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Segmento
                </label>
                <select
                  value={segmentoAtivo}
                  onChange={(e) => onMudarSegmento(e.target.value as SegmentoFiltro)}
                  className="w-full h-8 text-xs font-semibold px-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
                  aria-label="Filtro de segmento"
                >
                  <option value="todos">Todos ({countSegmento('todos')})</option>
                  <option value="clientes_om">Clientes O&M ({countSegmento('clientes_om')})</option>
                  <option value="clientes_solar">
                    Clientes Solar ({countSegmento('clientes_solar')})
                  </option>
                  <option value="clientes_bateria">
                    Clientes Bateria ({countSegmento('clientes_bateria')})
                  </option>
                  <option value="pos_vendas">Pós-Venda ({countSegmento('pos_vendas')})</option>
                </select>
              </div>

              {/* 2. WhatsApp */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  WhatsApp
                </label>
                <select
                  value={filtroWhatsApp}
                  onChange={(e) =>
                    onMudarWhatsApp(e.target.value as 'todos' | 'com_whatsapp' | 'sem_whatsapp')
                  }
                  className="w-full h-8 text-xs font-semibold px-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
                  aria-label="Filtro de WhatsApp"
                >
                  <option value="todos">WhatsApp: Todos</option>
                  <option value="com_whatsapp">Só com WhatsApp</option>
                  <option value="sem_whatsapp">Sem WhatsApp cadastrado</option>
                </select>
              </div>

              {/* 3. Cidade */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Cidade
                </label>
                <select
                  value={filtroCidade}
                  onChange={(e) => onMudarCidade(e.target.value)}
                  className="w-full h-8 text-xs font-medium px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
                  aria-label="Filtro de cidade"
                >
                  <option value="">Cidade: Todas</option>
                  {opcoesFiltrosExtras.cidades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Concessionária */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Concessionária
                </label>
                <select
                  value={filtroConcessionaria}
                  onChange={(e) => onMudarConcessionaria(e.target.value)}
                  className="w-full h-8 text-xs font-medium px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
                  aria-label="Filtro de concessionária"
                >
                  <option value="">Concessionária: Todas</option>
                  {opcoesFiltrosExtras.concessionarias.map((conc) => (
                    <option key={conc} value={conc}>
                      {conc}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Tipo de Cliente */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Tipo de Cliente
                </label>
                <select
                  value={filtroTipoCliente}
                  onChange={(e) => onMudarTipoCliente(e.target.value)}
                  className="w-full h-8 text-xs font-medium px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
                  aria-label="Filtro de tipo de cliente"
                >
                  <option value="">Tipo: Todos</option>
                  {opcoesFiltrosExtras.tiposCliente.map((tc) => (
                    <option key={tc} value={tc}>
                      {tc}
                    </option>
                  ))}
                </select>
              </div>

              {/* 6. Status */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Status
                </label>
                <select
                  value={filtroStatus}
                  onChange={(e) => onMudarStatus(e.target.value)}
                  className="w-full h-8 text-xs font-medium px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
                  aria-label="Filtro de status"
                >
                  <option value="">Status: Todos</option>
                  {opcoesFiltrosExtras.statusList.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Atalho para lista salva atual ou salvar como nova */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-gray-500">
                <strong>{totalDestinatariosEncontrados}</strong> destinatário(s) encontrados
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSalvarSelecaoComoNovaLista()
                    setOpen(false)
                  }}
                  className="h-7 text-[11px] font-semibold text-sky-800 border-sky-300 hover:bg-sky-50 shadow-2xs flex items-center gap-1 px-2.5"
                  title="Salvar esta seleção como uma nova lista salva"
                >
                  <Plus className="w-3 h-3 text-sky-600" />
                  <span>Salvar como lista</span>
                </Button>
              </div>
            </div>

            {/* Rodapé: Botões de Ação */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onLimparFiltros}
                className="text-xs font-semibold text-gray-500 hover:text-gray-900 underline flex items-center gap-1 px-1 py-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Limpar filtros</span>
              </button>

              <Button
                type="button"
                size="sm"
                onClick={() => setOpen(false)}
                className="bg-[#0284C7] hover:bg-[#0369a1] text-white text-xs font-bold h-8 px-4"
              >
                Aplicar
              </Button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* ABA 2: LISTAS SALVAS (Dropdown, Estrela, Salvar, Editar, Excluir) */}
        {/* ======================================================== */}
        {activeTab === 'listas' && (
          <div className="p-3.5 space-y-3 overflow-y-auto max-h-[70vh]">
            {/* Topo da Aba de Listas: Busca e Botão de Salvar Nova Lista */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={buscaListas}
                  onChange={(e) => setBuscaListas(e.target.value)}
                  placeholder="Buscar lista salva..."
                  className="h-8 pl-8 pr-6 text-xs bg-gray-50/80 border-gray-200"
                />
                {buscaListas && (
                  <button
                    type="button"
                    onClick={() => setBuscaListas('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  onSalvarSelecaoComoNovaLista()
                  setOpen(false)
                }}
                className="h-8 text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white shrink-0 shadow-2xs flex items-center gap-1"
                title="Salvar a seleção/filtros ativos no momento como uma nova lista"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nova Lista</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </div>

            {/* Dropdown nativo rápido como opção secundária */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">
                Seletor rápido de listas salvas
              </label>
              <select
                value={listaSelecionadaId}
                onChange={(e) => {
                  onSelecionarLista(e.target.value)
                  if (e.target.value) setOpen(false)
                }}
                className="w-full h-8 text-xs font-medium px-2 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0284C7] shadow-2xs"
                aria-label="Seletor de listas salvas"
              >
                <option value="">Selecione uma lista salva...</option>
                {listasSalvas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {favoritosIds.includes(l.id) ? '★ ' : ''}
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista interativa com Estrela de Favorito, Renomear, Editar Filtros e Excluir */}
            <div className="space-y-1 divide-y divide-gray-100 max-h-64 overflow-y-auto pr-0.5">
              {listasProcessadas.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-xs">
                  {buscaListas
                    ? 'Nenhuma lista salva encontrada para esta busca.'
                    : 'Nenhuma lista salva cadastrada ainda.'}
                </div>
              ) : (
                listasProcessadas.map((lista) => {
                  const isSelected = listaSelecionadaId === lista.id
                  const isFav = favoritosIds.includes(lista.id)
                  const isEditing = editandoListaId === lista.id
                  const fx = (lista.filtros || {}) as FiltrosExtrasListaEnvio

                  return (
                    <div
                      key={lista.id}
                      onClick={() => {
                        if (!isEditing) {
                          onSelecionarLista(lista.id)
                          setOpen(false)
                        }
                      }}
                      className={`pt-1.5 pb-1.5 px-2 rounded-lg flex flex-col gap-1 transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-sky-50/80 border border-sky-300'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      {isEditing ? (
                        // MODO DE RENOMEAÇÃO INLINE
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            value={novoNomeLista}
                            onChange={(e) => setNovoNomeLista(e.target.value)}
                            className="h-7 text-xs bg-white flex-1"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSalvarRenomeacao(lista, e as any)
                              } else if (e.key === 'Escape') {
                                handleCancelarRenomeacao(e as any)
                              }
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={isSalvandoRename || !novoNomeLista.trim()}
                            onClick={(e) => handleSalvarRenomeacao(lista, e)}
                            className="h-7 px-2 text-xs bg-sky-600 hover:bg-sky-700 text-white"
                            title="Salvar novo nome"
                          >
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelarRenomeacao}
                            className="h-7 px-2 text-xs"
                            title="Cancelar"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        // MODO DE EXIBIÇÃO NORMAL
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {/* Estrela de Favorito */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorito(lista.id, e)}
                              className="p-1 rounded text-gray-400 hover:text-amber-500 transition-colors shrink-0"
                              title={isFav ? 'Remover dos favoritos' : 'Favoritar lista'}
                              aria-label={isFav ? 'Remover favorito' : 'Favoritar lista'}
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  isFav ? 'text-amber-500 fill-amber-500' : ''
                                }`}
                              />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`text-xs font-semibold truncate ${
                                    isSelected ? 'text-sky-950 font-bold' : 'text-gray-900'
                                  }`}
                                >
                                  {lista.nome}
                                </span>
                                {fx.tipo_selecao === 'manual' && (
                                  <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                                    Manual ({fx.total_clientes_selecionados || 'N'})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Ações: Editar Filtros da Lista, Renomear, Excluir, Check de ativa */}
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Atualizar filtros da lista com os atuais */}
                            <button
                              type="button"
                              disabled={isAtualizandoFiltros}
                              onClick={(e) => handleSalvarFiltrosAtuaisNaLista(lista, e)}
                              className="p-1 text-gray-400 hover:text-sky-700 hover:bg-sky-100/70 rounded transition-colors"
                              title="Atualizar os filtros desta lista com a configuração ativa no momento"
                              aria-label="Atualizar filtros da lista"
                            >
                              <SlidersHorizontal className="w-3 h-3" />
                            </button>

                            {/* Renomear */}
                            <button
                              type="button"
                              onClick={(e) => handleIniciarRenomear(lista, e)}
                              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded transition-colors"
                              title="Renomear lista"
                              aria-label="Renomear lista"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            {/* Excluir */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onExcluirLista(lista)
                              }}
                              className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Excluir lista salva"
                              aria-label="Excluir lista salva"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>

                            {isSelected && <Check className="w-4 h-4 text-sky-600 ml-1" />}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Rodapé com atalho de limpar lista selecionada */}
            {listaSelecionadaId && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onSelecionarLista('')
                    setOpen(false)
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 underline font-medium"
                >
                  Desmarcar lista salva ativa
                </button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="text-xs h-7"
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export default ModalDisparoFiltroPopover

import React, { useState, useMemo } from 'react'
import {
  Kanban,
  List,
  History,
  ArchiveX,
  Plus,
  ChevronDown,
  Filter,
  X,
  Search,
  Check,
  Star,
  User as UserIcon,
  HelpCircle,
  MoreHorizontal,
  ArrowUpDown,
  Lock,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { Cliente } from '@/types/crm'

export type ViewMode = 'kanban' | 'list' | 'perdidos'

export type OrdenacaoOpcao =
  | 'proxima_atividade'
  | 'valor_maior'
  | 'valor_menor'
  | 'nome_az'
  | 'recente'

export interface ComercialActionBarProps {
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  totalNegocios: number
  totalPerdidos?: number
  // Ações de criação
  onNovoNegocio: () => void
  onNovoLead?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  // Filtro de Responsável
  filtroResponsavel: string
  onFiltroResponsavelChange: (id: string) => void
  usuarios: Array<{ id: string; name: string; avatar?: string; email?: string; ativo?: boolean }>
  currentUserId?: string
  currentUserName?: string
  // Filtro de Estado
  filtroEstado: string
  onFiltroEstadoChange: (estado: string) => void
  // Ordenação
  ordenacao?: OrdenacaoOpcao
  onOrdenacaoChange?: (ord: OrdenacaoOpcao) => void
  // Ação de varredura/limpeza existente
  onLimparNegocios?: () => void
  isLimpandoNegocios?: boolean
}

export const ComercialActionBar: React.FC<ComercialActionBarProps> = ({
  viewMode,
  onViewModeChange,
  totalNegocios,
  totalPerdidos = 0,
  onNovoNegocio,
  onNovoLead,
  onRefresh,
  isRefreshing = false,
  filtroResponsavel,
  onFiltroResponsavelChange,
  usuarios,
  currentUserId,
  currentUserName,
  filtroEstado,
  onFiltroEstadoChange,
  ordenacao = 'proxima_atividade',
  onOrdenacaoChange,
  onLimparNegocios,
  isLimpandoNegocios = false,
}) => {
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'favoritos' | 'proprietarios' | 'filtros'>(
    'proprietarios',
  )
  const [searchQuery, setSearchQuery] = useState('')

  // Identifica o nome do responsável ativo
  const responsavelAtivo = useMemo(() => {
    if (filtroResponsavel === 'todos') return null
    if (filtroResponsavel === 'sem_responsavel') {
      return { id: 'sem_responsavel', name: 'Sem responsável' }
    }
    const found = usuarios.find((u) => u.id === filtroResponsavel)
    if (found) return found
    if (currentUserId && filtroResponsavel === currentUserId) {
      return { id: currentUserId, name: currentUserName || 'Você' }
    }
    return { id: filtroResponsavel, name: 'Responsável selecionado' }
  }, [filtroResponsavel, usuarios, currentUserId, currentUserName])

  // Identifica o filtro de estado ativo
  const estadoAtivoLabel = useMemo(() => {
    if (filtroEstado === 'todos') return null
    if (filtroEstado === 'abertos') return 'Negócios em aberto'
    if (filtroEstado === 'ganhos') return 'Negócios ganhos'
    if (filtroEstado === 'perdidos') return 'Negócios perdidos'
    return filtroEstado
  }, [filtroEstado])

  // Se há algum filtro customizado aplicado além do padrão ("todos" e "todos")
  const isFiltroAtivo = filtroResponsavel !== 'todos' || filtroEstado !== 'todos'

  // Limpa todos os filtros para o estado padrão
  const handleLimparFiltros = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    onFiltroResponsavelChange('todos')
    onFiltroEstadoChange('todos')
  }

  // Filtragem dos proprietários pela busca interna do popover
  const qLower = searchQuery.toLowerCase().trim()
  const usuariosAtivos = useMemo(() => {
    return usuarios.filter((u) => u.ativo !== false)
  }, [usuarios])

  const usuariosInativos = useMemo(() => {
    return usuarios.filter((u) => u.ativo === false)
  }, [usuarios])

  const usuariosFiltrados = useMemo(() => {
    if (!qLower) return usuariosAtivos
    return usuariosAtivos.filter(
      (u) =>
        u.name.toLowerCase().includes(qLower) ||
        (u.email && u.email.toLowerCase().includes(qLower)),
    )
  }, [usuariosAtivos, qLower])

  const usuariosInativosFiltrados = useMemo(() => {
    if (!qLower) return usuariosInativos
    return usuariosInativos.filter(
      (u) =>
        u.name.toLowerCase().includes(qLower) ||
        (u.email && u.email.toLowerCase().includes(qLower)),
    )
  }, [usuariosInativos, qLower])

  // Filtros predefinidos de estado/status disponíveis
  const opcoesFiltrosPredefinidos = [
    { id: 'todos', label: 'Todos os negócios', count: totalNegocios },
    { id: 'abertos', label: 'Todos os negócios em aberto' },
    { id: 'ganhos', label: 'Todos os negócios ganhos' },
    { id: 'perdidos', label: 'Todos os negócios perdidos' },
  ]

  const filtrosFiltrados = useMemo(() => {
    if (!qLower) return opcoesFiltrosPredefinidos
    return opcoesFiltrosPredefinidos.filter((f) => f.label.toLowerCase().includes(qLower))
  }, [qLower, totalNegocios])

  // Rótulo amigável da ordenação
  const ordenacaoLabels: Record<OrdenacaoOpcao, string> = {
    proxima_atividade: 'Próxima atividade',
    recente: 'Mais recente',
    valor_maior: 'Maior valor',
    valor_menor: 'Menor valor',
    nome_az: 'Nome (A-Z)',
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-2.5">
        {/* Linha Principal de Ferramentas */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Lado Esquerdo: Segmented Control + Botão Verde Split "+ Negócio" */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Segmented control no estilo Pipedrive (bordas arredondadas, ícones compactos) */}
            <div className="inline-flex items-center p-0.5 bg-white border border-slate-300 rounded-md shadow-2xs">
              {/* Botão Kanban */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onViewModeChange('kanban')}
                    aria-label="Visualização em Funil (Kanban)"
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-sm transition-all ${
                      viewMode === 'kanban'
                        ? 'bg-blue-50 text-blue-600 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Kanban className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Visualização em Funil (Kanban)
                </TooltipContent>
              </Tooltip>

              <div className="w-[1px] h-4 bg-slate-200 my-auto" />

              {/* Botão Lista */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onViewModeChange('list')}
                    aria-label="Visualização em Lista"
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-sm transition-all ${
                      viewMode === 'list'
                        ? 'bg-blue-50 text-blue-600 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <List className="w-4 h-4 stroke-[2.2]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Visualização em Lista
                </TooltipContent>
              </Tooltip>

              <div className="w-[1px] h-4 bg-slate-200 my-auto" />

              {/* Botão Oportunidades Perdidas */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onViewModeChange('perdidos')}
                    aria-label="Oportunidades Perdidas"
                    className={`inline-flex items-center justify-center w-8 h-8 rounded-sm relative transition-all ${
                      viewMode === 'perdidos'
                        ? 'bg-rose-50 text-rose-600 shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-rose-600 hover:bg-slate-100'
                    }`}
                  >
                    <ArchiveX className="w-4 h-4 stroke-[2.2]" />
                    {totalPerdidos > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                        {totalPerdidos > 99 ? '99+' : totalPerdidos}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Oportunidades Perdidas ({totalPerdidos})
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Botão Primário Verde Split "+ Negócio" no estilo exato Pipedrive */}
            <div className="inline-flex rounded-md shadow-xs">
              <button
                type="button"
                onClick={onNovoNegocio}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] active:bg-[#166534] text-white font-semibold text-xs sm:text-sm rounded-l-md transition-colors cursor-pointer"
                title="Criar novo negócio"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Negócio</span>
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Mais opções de criação"
                    className="inline-flex items-center justify-center px-2 py-1.5 bg-[#15803D] hover:bg-[#166534] text-white border-l border-emerald-700/50 rounded-r-md transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem
                    onClick={onNovoNegocio}
                    className="cursor-pointer gap-2 text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Novo negócio</span>
                  </DropdownMenuItem>
                  {onNovoLead && (
                    <DropdownMenuItem
                      onClick={onNovoLead}
                      className="cursor-pointer gap-2 text-xs font-medium"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                      <span>Novo lead</span>
                    </DropdownMenuItem>
                  )}
                  {onLimparNegocios && (
                    <DropdownMenuItem
                      onClick={onLimparNegocios}
                      disabled={isLimpandoNegocios}
                      className="cursor-pointer gap-2 text-xs text-slate-700 font-medium"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isLimpandoNegocios ? 'Varrendo...' : 'Limpar fora do funil'}</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Lado Direito: Contador + Seletor de Funil + Botão Filtro Pipedrive + Mais opções */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
            {/* Contador de Negócios + Ícone de Info */}
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Informações do funil"
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                  ></button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-xs">
                  Total de negócios em aberto no funil comercial com os filtros atuais.
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Seletor do Funil: "Comercial" com ícone de funil/kanban */}

            {/* BOTÃO DE FILTRO PIPEDRIVE COM POPOVER FLUTUANTE */}
            <Popover open={isFilterPopoverOpen} onOpenChange={setIsFilterPopoverOpen}>
              <PopoverTrigger asChild>
                {/* Chip normal (cinza) ou Chip ativo (azul com x) */}
                {isFiltroAtivo ? (
                  <div className="inline-flex items-center rounded-md border border-blue-400 bg-blue-50 text-blue-800 text-xs font-semibold shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-blue-100/70 transition-colors cursor-pointer"
                    >
                      <Filter className="w-3.5 h-3.5 text-blue-600" />
                      <span className="max-w-[140px] truncate">
                        {responsavelAtivo?.name || estadoAtivoLabel || 'Filtro'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-blue-600 ml-0.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleLimparFiltros}
                      className="px-1.5 py-1.5 hover:bg-blue-200/80 text-blue-700 transition-colors border-l border-blue-200"
                      title="Limpar filtro"
                      aria-label="Limpar filtro"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold text-slate-800 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Filter className="w-3.5 h-3.5 text-slate-500" />
                    <span>Filtro</span>
                    <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                  </button>
                )}
              </PopoverTrigger>

              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-80 p-0 rounded-xl shadow-xl border border-slate-200 bg-white"
              >
                {/* Campo de Busca no Topo do Popover */}
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar proprietário ou filtro"
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-800"
                    />
                  </div>
                </div>

                {/* Abas: Favoritos / Proprietários / Filtros */}
                <div className="grid grid-cols-3 border-b border-slate-200 text-xs font-medium text-slate-600 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setActiveTab('favoritos')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 transition-all border-b-2 ${
                      activeTab === 'favoritos'
                        ? 'border-blue-600 text-blue-600 font-semibold bg-white'
                        : 'border-transparent hover:text-slate-900'
                    }`}
                  >
                    <Star className="w-4 h-4" />
                    <span className="text-[11px]">Favoritos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('proprietarios')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 transition-all border-b-2 ${
                      activeTab === 'proprietarios'
                        ? 'border-blue-600 text-blue-600 font-semibold bg-white'
                        : 'border-transparent hover:text-slate-900'
                    }`}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span className="text-[11px]">Proprietários</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('filtros')}
                    className={`flex flex-col items-center justify-center gap-1 py-2 px-1 transition-all border-b-2 ${
                      activeTab === 'filtros'
                        ? 'border-blue-600 text-blue-600 font-semibold bg-white'
                        : 'border-transparent hover:text-slate-900'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-[11px]">Filtros</span>
                  </button>
                </div>

                {/* Conteúdo da Aba Selecionada */}
                <div className="max-h-72 overflow-y-auto py-1.5 text-xs">
                  {/* ABA: PROPRIETÁRIOS */}
                  {activeTab === 'proprietarios' && (
                    <div className="space-y-0.5 px-1.5">
                      {/* Opção "Todos" */}
                      <button
                        type="button"
                        onClick={() => {
                          onFiltroResponsavelChange('todos')
                          setIsFilterPopoverOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                          filtroResponsavel === 'todos'
                            ? 'bg-blue-600 text-white font-medium'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <span className="font-semibold">Todos</span>
                        <div className="flex items-center gap-1">
                          {filtroResponsavel === 'todos' && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </div>
                      </button>

                      {/* Usuário Logado Destacado ("Nome (você)") */}
                      {currentUserId && (
                        <button
                          type="button"
                          onClick={() => {
                            onFiltroResponsavelChange(currentUserId)
                            setIsFilterPopoverOpen(false)
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                            filtroResponsavel === currentUserId
                              ? 'bg-blue-600 text-white font-medium'
                              : 'hover:bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                filtroResponsavel === currentUserId
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              <UserIcon className="w-3 h-3" />
                            </div>
                            <span className="truncate">{currentUserName || 'Você'} (você)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                            {filtroResponsavel === currentUserId && (
                              <Check className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </button>
                      )}

                      {/* Opção "Sem responsável" */}
                      <button
                        type="button"
                        onClick={() => {
                          onFiltroResponsavelChange('sem_responsavel')
                          setIsFilterPopoverOpen(false)
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                          filtroResponsavel === 'sem_responsavel'
                            ? 'bg-blue-600 text-white font-medium'
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                              filtroResponsavel === 'sem_responsavel'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            <UserIcon className="w-3 h-3" />
                          </div>
                          <span>Sem responsável</span>
                        </div>
                        {filtroResponsavel === 'sem_responsavel' && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </button>

                      {/* Lista dos Usuários Ativos */}
                      {usuariosFiltrados
                        .filter((u) => u.id !== currentUserId)
                        .map((u) => {
                          const isSelected = filtroResponsavel === u.id
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                onFiltroResponsavelChange(u.id)
                                setIsFilterPopoverOpen(false)
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white font-medium'
                                  : 'hover:bg-slate-100 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <div
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="truncate">{u.name}</span>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-white" />}
                            </button>
                          )
                        })}

                      {/* Se houver usuários desativados */}
                      {usuariosInativosFiltrados.length > 0 && (
                        <>
                          <div className="pt-2 pb-1 px-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-t border-slate-100 mt-1">
                            Usuários desativados ({usuariosInativosFiltrados.length})
                          </div>
                          {usuariosInativosFiltrados.map((u) => {
                            const isSelected = filtroResponsavel === u.id
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => {
                                  onFiltroResponsavelChange(u.id)
                                  setIsFilterPopoverOpen(false)
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors ${
                                  isSelected
                                    ? 'bg-blue-600 text-white font-medium'
                                    : 'hover:bg-slate-100 text-slate-500'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                                    {u.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate">{u.name}</span>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </button>
                            )
                          })}
                        </>
                      )}
                    </div>
                  )}

                  {/* ABA: FILTROS (Estados/Status do Pipedrive) */}
                  {activeTab === 'filtros' && (
                    <div className="space-y-0.5 px-1.5">
                      {filtrosFiltrados.map((item) => {
                        const isSelected = filtroEstado === item.id
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onFiltroEstadoChange(item.id)
                              setIsFilterPopoverOpen(false)
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-colors ${
                              isSelected
                                ? 'bg-blue-600 text-white font-medium'
                                : 'hover:bg-slate-100 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Lock
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isSelected ? 'text-white' : 'text-slate-400'
                                }`}
                              />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* ABA: FAVORITOS */}
                  {activeTab === 'favoritos' && (
                    <div className="p-6 text-center text-slate-400">
                      <Star className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                      <p className="text-xs font-medium text-slate-600">Nenhum favorito salvo</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Filtros e proprietários favoritos aparecerão aqui.
                      </p>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Menu 3 Pontinhos com Ações Adicionais */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Mais opções"
                  className="inline-flex items-center justify-center w-8 h-8 bg-white hover:bg-slate-50 border border-slate-300 rounded-md text-slate-600 transition-colors cursor-pointer shadow-2xs"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {onRefresh && (
                  <DropdownMenuItem
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <History className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Recarregar dados</span>
                  </DropdownMenuItem>
                )}
                {onLimparNegocios && (
                  <DropdownMenuItem
                    onClick={onLimparNegocios}
                    disabled={isLimpandoNegocios}
                    className="cursor-pointer gap-2 text-xs"
                  >
                    <ArchiveX className="w-3.5 h-3.5 text-slate-500" />
                    <span>Varredura de negócios</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={handleLimparFiltros}
                  className="cursor-pointer gap-2 text-xs text-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar todos os filtros</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Linha Auxiliar Inferior (Estilo Pipedrive): Ordenação e Mostrar Fechados/Perdidos */}
      </div>
    </TooltipProvider>
  )
}
export default ComercialActionBar

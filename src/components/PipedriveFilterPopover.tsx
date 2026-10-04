import React, { useState, useMemo } from 'react'
import {
  Filter,
  Search,
  Star,
  User,
  Users,
  Check,
  X,
  Lock,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { Usuario } from '@/types/crm'

export interface FiltroState {
  responsavelId: string // 'todos' | 'sem_responsavel' | userId
  filtroEstado: string // 'todos' | 'ganhos' | 'perdidos' | 'abertos'
}

interface PipedriveFilterPopoverProps {
  usuarios: Usuario[]
  usuarioAtual?: { id?: string; name?: string } | null
  filtroResponsavel: string
  onSelectResponsavel: (id: string) => void
  filtroEstado?: string
  onSelectFiltroEstado?: (estado: string) => void
  // Contadores opcionais para exibir nos itens
  totalGeral?: number
  totalPorResponsavel?: Record<string, number>
}

export const PipedriveFilterPopover: React.FC<PipedriveFilterPopoverProps> = ({
  usuarios,
  usuarioAtual,
  filtroResponsavel,
  onSelectResponsavel,
  filtroEstado = 'todos',
  onSelectFiltroEstado,
  totalGeral,
  totalPorResponsavel = {},
}) => {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'favoritos' | 'proprietarios' | 'filtros'>(
    'proprietarios',
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [favoritosIds, setFavoritosIds] = useState<string[]>(['todos'])

  const toggleFavorito = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setFavoritosIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Nome amigável do filtro ativo para o chip no botão
  const responsavelAtivo = useMemo(() => {
    if (filtroResponsavel === 'todos') return null
    if (filtroResponsavel === 'sem_responsavel') return 'Sem responsável'
    const u = usuarios.find((user) => user.id === filtroResponsavel)
    if (u) {
      if (usuarioAtual?.id && u.id === usuarioAtual.id) {
        return `${u.name} (você)`
      }
      return u.name
    }
    return 'Responsável'
  }, [filtroResponsavel, usuarios, usuarioAtual])

  const estadoAtivoNome = useMemo(() => {
    if (filtroEstado === 'todos') return null
    if (filtroEstado === 'abertos') return 'Negócios em aberto'
    if (filtroEstado === 'ganhos') return 'Negócios ganhos'
    if (filtroEstado === 'perdidos') return 'Negócios perdidos'
    return null
  }, [filtroEstado])

  const hasFiltroAtivo = Boolean(responsavelAtivo || estadoAtivoNome)

  // Separar usuário logado dos demais
  const { usuarioLogadoItem, outrosUsuarios } = useMemo(() => {
    let logado: Usuario | null = null
    const outros: Usuario[] = []

    usuarios.forEach((u) => {
      if (usuarioAtual?.id && u.id === usuarioAtual.id) {
        logado = u
      } else {
        outros.push(u)
      }
    })

    return { usuarioLogadoItem: logado, outrosUsuarios: outros }
  }, [usuarios, usuarioAtual])

  // Filtragem da busca textual no popover
  const query = searchQuery.trim().toLowerCase()

  const outrosUsuariosFiltrados = useMemo(() => {
    if (!query) return outrosUsuarios
    return outrosUsuarios.filter((u) => u.name.toLowerCase().includes(query))
  }, [outrosUsuarios, query])

  const listaFiltrosPadrao = [
    { id: 'todos', label: 'Todos os negócios' },
    { id: 'abertos', label: 'Todos os negócios em aberto' },
    { id: 'ganhos', label: 'Todos os negócios ganhos' },
    { id: 'perdidos', label: 'Todos os negócios perdidos' },
  ]

  const filtrosFiltrados = useMemo(() => {
    if (!query) return listaFiltrosPadrao
    return listaFiltrosPadrao.filter((f) => f.label.toLowerCase().includes(query))
  }, [listaFiltrosPadrao, query])

  const handleClearFiltro = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectResponsavel('todos')
    if (onSelectFiltroEstado) {
      onSelectFiltroEstado('todos')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="inline-flex items-center">
        {hasFiltroAtivo ? (
          // Chip ativo estilo Pipedrive (azul com botão 'X')
          <div className="inline-flex items-center rounded-lg border border-sky-300 bg-sky-50 text-sky-900 shadow-2xs overflow-hidden transition-all h-9">
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold hover:bg-sky-100/70 transition-colors cursor-pointer select-none"
                title="Clique para alterar filtros"
              >
                <Filter className="w-3.5 h-3.5 text-sky-600 fill-sky-600" />
                <span className="max-w-[130px] sm:max-w-[180px] truncate font-medium">
                  {responsavelAtivo || estadoAtivoNome}
                </span>
                <ChevronDown className="w-3 h-3 text-sky-600 ml-0.5" />
              </button>
            </PopoverTrigger>
            <button
              type="button"
              onClick={handleClearFiltro}
              className="px-2 py-1.5 text-sky-600 hover:text-sky-900 hover:bg-sky-200/60 border-l border-sky-200 transition-colors h-full flex items-center justify-center cursor-pointer"
              title="Limpar filtro"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          // Botão neutro de Filtro no padrão Pipedrive
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg shadow-2xs hover:border-gray-400 transition-all h-9 cursor-pointer"
              title="Filtrar por responsável ou estado"
            >
              <Filter className="w-3.5 h-3.5 text-gray-500" />
              <span>Filtro</span>
              <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
            </button>
          </PopoverTrigger>
        )}
      </div>

      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-80 p-0 rounded-2xl shadow-xl border border-gray-200 bg-white overflow-hidden text-gray-800 animate-in fade-in-50 zoom-in-95 duration-150 z-50"
      >
        {/* Campo de Busca no Topo */}
        <div className="p-3 border-b border-gray-100">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar responsável ou filtro"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50/80 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all placeholder:text-gray-400"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Três Abas: Favoritos / Proprietários / Filtros (ícone acima do texto) */}
        <div className="grid grid-cols-3 border-b border-gray-200 bg-gray-50/50 text-[11px] font-semibold text-gray-500 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('favoritos')}
            className={`py-2 px-1 flex flex-col items-center justify-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'favoritos'
                ? 'text-sky-600 bg-white font-bold'
                : 'hover:text-gray-800 hover:bg-gray-100/60'
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                activeTab === 'favoritos' ? 'text-sky-600 fill-sky-600' : 'text-gray-400'
              }`}
            />
            <span>Favoritos</span>
            {activeTab === 'favoritos' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('proprietarios')}
            className={`py-2 px-1 flex flex-col items-center justify-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'proprietarios'
                ? 'text-sky-600 bg-white font-bold'
                : 'hover:text-gray-800 hover:bg-gray-100/60'
            }`}
          >
            <User
              className={`w-4 h-4 ${
                activeTab === 'proprietarios' ? 'text-sky-600 stroke-[2.2]' : 'text-gray-400'
              }`}
            />
            <span>Proprietários</span>
            {activeTab === 'proprietarios' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('filtros')}
            className={`py-2 px-1 flex flex-col items-center justify-center gap-1 transition-colors relative cursor-pointer ${
              activeTab === 'filtros'
                ? 'text-sky-600 bg-white font-bold'
                : 'hover:text-gray-800 hover:bg-gray-100/60'
            }`}
          >
            <Filter
              className={`w-4 h-4 ${
                activeTab === 'filtros' ? 'text-sky-600 stroke-[2.2]' : 'text-gray-400'
              }`}
            />
            <span>Filtros</span>
            {activeTab === 'filtros' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
            )}
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 text-xs">
          {/* ABA 1: PROPRIETÁRIOS */}
          {activeTab === 'proprietarios' && (
            <>
              {/* Item "Todos" */}
              {(!query || 'todos'.includes(query)) && (
                <div
                  onClick={() => {
                    onSelectResponsavel('todos')
                    setOpen(false)
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filtroResponsavel === 'todos'
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'hover:bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Users
                      className={`w-4 h-4 ${
                        filtroResponsavel === 'todos' ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                    <span className="truncate">Todos</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => toggleFavorito('todos', e)}
                      className={`p-1 rounded hover:scale-110 transition-transform ${
                        filtroResponsavel === 'todos'
                          ? 'text-white'
                          : 'text-gray-400 hover:text-amber-500'
                      }`}
                      title="Favoritar"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          favoritosIds.includes('todos')
                            ? filtroResponsavel === 'todos'
                              ? 'fill-white text-white'
                              : 'fill-amber-400 text-amber-500'
                            : ''
                        }`}
                      />
                    </button>
                    {filtroResponsavel === 'todos' && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              )}

              {/* Usuário Logado em Destaque "(você)" */}
              {usuarioLogadoItem &&
                (!query ||
                  usuarioLogadoItem.name.toLowerCase().includes(query) ||
                  'você'.includes(query)) && (
                  <div
                    onClick={() => {
                      onSelectResponsavel(usuarioLogadoItem.id)
                      setOpen(false)
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      filtroResponsavel === usuarioLogadoItem.id
                        ? 'bg-sky-600 text-white font-bold shadow-xs'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          filtroResponsavel === usuarioLogadoItem.id
                            ? 'bg-white/20 text-white'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {usuarioLogadoItem.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">
                        {usuarioLogadoItem.name}{' '}
                        <span
                          className={
                            filtroResponsavel === usuarioLogadoItem.id
                              ? 'text-sky-100 font-normal'
                              : 'text-gray-400 font-normal'
                          }
                        >
                          (você)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorito(usuarioLogadoItem.id, e)}
                        className={`p-1 rounded hover:scale-110 transition-transform ${
                          filtroResponsavel === usuarioLogadoItem.id
                            ? 'text-white'
                            : 'text-gray-400 hover:text-amber-500'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            favoritosIds.includes(usuarioLogadoItem.id)
                              ? filtroResponsavel === usuarioLogadoItem.id
                                ? 'fill-white text-white'
                                : 'fill-amber-400 text-amber-500'
                              : ''
                          }`}
                        />
                      </button>
                      {filtroResponsavel === usuarioLogadoItem.id && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                )}

              {/* Sem Responsável (preservado conforme regras do Delfos) */}
              {(!query || 'sem responsável'.includes(query) || 'nao atribuido'.includes(query)) && (
                <div
                  onClick={() => {
                    onSelectResponsavel('sem_responsavel')
                    setOpen(false)
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    filtroResponsavel === 'sem_responsavel'
                      ? 'bg-sky-600 text-white font-bold shadow-xs'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <User
                      className={`w-4 h-4 ${
                        filtroResponsavel === 'sem_responsavel' ? 'text-white' : 'text-gray-400'
                      }`}
                    />
                    <span className="truncate italic">Sem responsável</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {filtroResponsavel === 'sem_responsavel' && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>
              )}

              {/* Divisor "EQUIPE" / "DEMAIS RESPONSÁVEIS" */}
              {outrosUsuariosFiltrados.length > 0 && (
                <div className="px-3 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-t border-gray-100 mt-1">
                  Equipe ({outrosUsuariosFiltrados.length})
                </div>
              )}

              {/* Lista dos outros usuários */}
              {outrosUsuariosFiltrados.map((u) => {
                const isSelected = filtroResponsavel === u.id
                return (
                  <div
                    key={u.id}
                    onClick={() => {
                      onSelectResponsavel(u.id)
                      setOpen(false)
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white font-bold shadow-xs'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{u.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorito(u.id, e)}
                        className={`p-1 rounded hover:scale-110 transition-transform ${
                          isSelected ? 'text-white' : 'text-gray-400 hover:text-amber-500'
                        }`}
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            favoritosIds.includes(u.id)
                              ? isSelected
                                ? 'fill-white text-white'
                                : 'fill-amber-400 text-amber-500'
                              : ''
                          }`}
                        />
                      </button>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>
                )
              })}

              {outrosUsuariosFiltrados.length === 0 && query && (
                <p className="p-3 text-center text-xs text-gray-400">
                  Nenhum usuário corresponde à busca.
                </p>
              )}
            </>
          )}

          {/* ABA 2: FILTROS (Mapeados 1:1 para estados já existentes) */}
          {activeTab === 'filtros' && (
            <>
              {filtrosFiltrados.map((f) => {
                const isSelected = filtroEstado === f.id
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      if (onSelectFiltroEstado) {
                        onSelectFiltroEstado(f.id)
                      }
                      setOpen(false)
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white font-bold shadow-xs'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Lock
                        className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-gray-400'}`}
                      />
                      <span className="truncate">{f.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </div>
                )
              })}

              {filtrosFiltrados.length === 0 && query && (
                <p className="p-3 text-center text-xs text-gray-400">
                  Nenhum filtro corresponde à busca.
                </p>
              )}
            </>
          )}

          {/* ABA 3: FAVORITOS */}
          {activeTab === 'favoritos' && (
            <>
              {favoritosIds.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Star className="w-8 h-8 mx-auto text-gray-300 mb-1" />
                  <p className="text-xs font-semibold text-gray-600">Nenhum favorito</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Clique na estrela ao lado de um responsável ou filtro para adicioná-lo aos
                    favoritos.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {favoritosIds.map((favId) => {
                    const isTodos = favId === 'todos'
                    const userObj = usuarios.find((u) => u.id === favId)
                    const label = isTodos ? 'Todos' : userObj ? userObj.name : favId
                    const isSelected = filtroResponsavel === favId

                    return (
                      <div
                        key={favId}
                        onClick={() => {
                          onSelectResponsavel(favId)
                          setOpen(false)
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-sky-600 text-white font-bold shadow-xs'
                            : 'hover:bg-gray-100 text-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Star
                            className={`w-4 h-4 ${
                              isSelected ? 'text-white fill-white' : 'text-amber-500 fill-amber-400'
                            }`}
                          />
                          <span className="truncate">{label}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Filter,
  Search,
  Star,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  Globe,
  Lock,
  Layers,
  Sparkles,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import type { FiltroSalvoRecord, ModuloFiltro } from '@/types/filtros'
import {
  fetchFiltrosSalvos,
  createFiltroSalvo,
  updateFiltroSalvo,
  deleteFiltroSalvo,
  getFavoritosFiltrosIds,
  toggleFavoritoFiltroId,
} from '@/services/filtrosSalvosService'
import { getFiltrosSistema, isFiltroSistema } from '@/lib/filtrosSistema'
import { ModalCompositorFiltro } from './ModalCompositorFiltro'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export interface FiltroSalvoBarProps {
  modulo: ModuloFiltro
  filtroAtivo: FiltroSalvoRecord | null
  onSelectFiltro: (filtro: FiltroSalvoRecord | null) => void
  // Contadores para exibição
  totalFiltrado?: number
  totalOriginal?: number
  // Botão customizado ou alinhamento
  className?: string
}

export const FiltroSalvoBar: React.FC<FiltroSalvoBarProps> = ({
  modulo,
  filtroAtivo,
  onSelectFiltro,
  totalFiltrado,
  totalOriginal,
  className = '',
}) => {
  const { toast } = useToast()
  const currentUserId = pb.authStore.record?.id

  const [openPopover, setOpenPopover] = useState(false)
  const [activeTab, setActiveTab] = useState<'filtros' | 'favoritos'>('filtros')
  const [searchQuery, setSearchQuery] = useState('')
  const [filtros, setFiltros] = useState<FiltroSalvoRecord[]>([])
  const [favoritosIds, setFavoritosIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Filtros de sistema pré-definidos para este módulo (constantes em código)
  const filtrosSistema = useMemo(() => getFiltrosSistema(modulo), [modulo])

  // Estado do Modal Compositor
  const [modalCompositorOpen, setModalCompositorOpen] = useState(false)
  const [filtroEmEdicao, setFiltroEmEdicao] = useState<FiltroSalvoRecord | null>(null)

  const carregarFiltros = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchFiltrosSalvos(modulo)
      setFiltros(data)
      setFavoritosIds(getFavoritosFiltrosIds(modulo))
    } catch (e) {
      console.error('Erro ao carregar filtros salvos:', e)
    } finally {
      setLoading(false)
    }
  }, [modulo])

  useEffect(() => {
    carregarFiltros()
  }, [carregarFiltros])

  const handleToggleFavorito = (filtroId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const novos = toggleFavoritoFiltroId(modulo, filtroId)
    setFavoritosIds(novos)
  }

  const handleAbrirCriar = () => {
    setFiltroEmEdicao(null)
    setOpenPopover(false)
    setModalCompositorOpen(true)
  }

  const handleAbrirEditar = (filtro: FiltroSalvoRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    setFiltroEmEdicao(filtro)
    setOpenPopover(false)
    setModalCompositorOpen(true)
  }

  const handleExcluir = async (filtro: FiltroSalvoRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    const confirmou = window.confirm(`Deseja realmente excluir o filtro "${filtro.nome}"?`)
    if (!confirmou) return

    try {
      await deleteFiltroSalvo(filtro.id)
      if (filtroAtivo?.id === filtro.id) {
        onSelectFiltro(null)
      }
      toast({
        title: 'Filtro excluído',
        description: `O filtro "${filtro.nome}" foi removido com sucesso.`,
      })
      await carregarFiltros()
    } catch (err) {
      console.error('Erro ao excluir filtro:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível remover o filtro salvo.',
      })
    }
  }

  const handleSalvarFiltro = async (dados: any) => {
    if (filtroEmEdicao) {
      const atualizado = await updateFiltroSalvo(filtroEmEdicao.id, dados)
      toast({
        title: 'Filtro atualizado!',
        description: `O filtro "${atualizado.nome}" foi salvo com sucesso.`,
      })
      if (filtroAtivo?.id === atualizado.id) {
        onSelectFiltro(atualizado)
      }
    } else {
      const criado = await createFiltroSalvo(dados)
      toast({
        title: 'Filtro criado!',
        description: `O filtro "${criado.nome}" foi criado e aplicado.`,
      })
      onSelectFiltro(criado)
    }
    await carregarFiltros()
  }

  const query = searchQuery.trim().toLowerCase()

  // Filtros de sistema filtrados pela busca
  const filtrosSistemaFiltrados = useMemo(() => {
    if (!query) return filtrosSistema
    return filtrosSistema.filter((f) => f.nome.toLowerCase().includes(query))
  }, [filtrosSistema, query])

  // Filtros de usuários salvos no banco, excluindo eventuais colisões
  const filtrosUsuarioFiltrados = useMemo(() => {
    if (!query) return filtros
    return filtros.filter((f) => f.nome.toLowerCase().includes(query))
  }, [filtros, query])

  // Total combinado de filtros disponíveis (sistema + usuário)
  const totalFiltrosDisponiveis = useMemo(() => {
    return filtrosSistema.length + filtros.length
  }, [filtrosSistema.length, filtros.length])

  // Lista combinada de favoritos (pode conter filtros de sistema ou de usuário)
  const todosFiltros = useMemo(() => {
    return [...filtrosSistema, ...filtros]
  }, [filtrosSistema, filtros])

  const favoritosList = useMemo(() => {
    return todosFiltros.filter((f) => favoritosIds.includes(f.id))
  }, [todosFiltros, favoritosIds])

  const favoritosFiltrados = useMemo(() => {
    if (!query) return favoritosList
    return favoritosList.filter((f) => f.nome.toLowerCase().includes(query))
  }, [favoritosList, query])

  const isDono = (filtro: FiltroSalvoRecord) => {
    if (isFiltroSistema(filtro)) return false
    return Boolean(currentUserId && filtro.dono === currentUserId)
  }

  return (
    <>
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {filtroAtivo ? (
          // Chip Ativo estilo Pipedrive (azul / esmeralda) com botão X, lápis de edição e estrela
          <div className="inline-flex items-center rounded-xl border border-sky-300 bg-sky-50 text-sky-950 shadow-xs overflow-hidden transition-all h-9">
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold hover:bg-sky-100/80 transition-colors cursor-pointer select-none max-w-[210px] sm:max-w-[260px] truncate"
                  title={`Filtro ativo: ${filtroAtivo.nome}. Clique para trocar.`}
                >
                  <Filter className="w-3.5 h-3.5 text-sky-600 fill-sky-600 shrink-0" />
                  <span className="truncate">{filtroAtivo.nome}</span>
                  {isFiltroSistema(filtroAtivo) && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-bold rounded bg-sky-200/80 text-sky-900 border border-sky-300">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      <span>Sistema</span>
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-sky-600 shrink-0 ml-0.5" />
                </button>
              </PopoverTrigger>

              {/* Conteúdo do Dropdown ancorado */}
              <PopoverContent
                align="end"
                sideOffset={6}
                className="w-80 p-0 rounded-2xl shadow-xl border border-slate-200 bg-white overflow-hidden text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150 z-50"
              >
                {renderDropdownContent()}
              </PopoverContent>
            </Popover>

            {/* Ação de Favoritar o filtro ativo */}
            <button
              type="button"
              onClick={(e) => handleToggleFavorito(filtroAtivo.id, e)}
              className="px-2 py-1.5 text-slate-400 hover:text-amber-500 hover:bg-sky-100/70 border-l border-sky-200 transition-colors h-full flex items-center justify-center cursor-pointer"
              title={
                favoritosIds.includes(filtroAtivo.id)
                  ? 'Remover dos favoritos'
                  : 'Adicionar aos favoritos'
              }
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  favoritosIds.includes(filtroAtivo.id)
                    ? 'fill-amber-400 text-amber-500'
                    : 'text-slate-400'
                }`}
              />
            </button>

            {/* Ação de Editar (apenas se for o dono) */}
            {isDono(filtroAtivo) && (
              <button
                type="button"
                onClick={(e) => handleAbrirEditar(filtroAtivo, e)}
                className="px-2 py-1.5 text-sky-700 hover:text-sky-950 hover:bg-sky-100/70 border-l border-sky-200 transition-colors h-full flex items-center justify-center cursor-pointer"
                title="Editar este filtro"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}

            {/* Ação de Limpar (X) */}
            <button
              type="button"
              onClick={() => onSelectFiltro(null)}
              className="px-2.5 py-1.5 text-sky-700 hover:text-rose-600 hover:bg-rose-50 border-l border-sky-200 transition-colors h-full flex items-center justify-center cursor-pointer"
              title="Limpar filtro aplicado (desativar)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          // Botão Neutro de Filtro no canto superior direito
          <Popover open={openPopover} onOpenChange={setOpenPopover}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-2xs hover:border-slate-400 transition-all h-9 cursor-pointer"
                title="Filtros salvos estilo Pipedrive"
              >
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span>Filtros Salvos</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              sideOffset={6}
              className="w-80 p-0 rounded-2xl shadow-xl border border-slate-200 bg-white overflow-hidden text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150 z-50"
            >
              {renderDropdownContent()}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Modal Compositor de Filtro */}
      <ModalCompositorFiltro
        open={modalCompositorOpen}
        onOpenChange={setModalCompositorOpen}
        modulo={modulo}
        filtroEdicao={filtroEmEdicao}
        onSalvar={handleSalvarFiltro}
      />
    </>
  )

  function renderDropdownContent() {
    return (
      <div className="flex flex-col">
        {/* Barra de Pesquisa */}
        <div className="p-2.5 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar filtros salvos..."
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:bg-white transition-all placeholder:text-slate-400"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Abas: Filtros / Favoritos */}
        <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/60 text-[11px] font-bold text-slate-500 select-none">
          <button
            type="button"
            onClick={() => setActiveTab('filtros')}
            className={`py-2 px-1 flex items-center justify-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'filtros'
                ? 'text-sky-700 bg-white font-bold'
                : 'hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Filter
              className={`w-3.5 h-3.5 ${
                activeTab === 'filtros' ? 'text-sky-600 fill-sky-600' : 'text-slate-400'
              }`}
            />
            <span>Filtros ({totalFiltrosDisponiveis})</span>
            {activeTab === 'filtros' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favoritos')}
            className={`py-2 px-1 flex items-center justify-center gap-1.5 transition-colors relative cursor-pointer ${
              activeTab === 'favoritos'
                ? 'text-sky-700 bg-white font-bold'
                : 'hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                activeTab === 'favoritos' ? 'text-amber-500 fill-amber-400' : 'text-slate-400'
              }`}
            />
            <span>Favoritos ({favoritosList.length})</span>
            {activeTab === 'favoritos' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-600" />
            )}
          </button>
        </div>

        {/* Lista de Filtros */}
        <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5 text-xs">
          {/* Opção para desmarcar / Todos os registros */}
          <div
            onClick={() => {
              onSelectFiltro(null)
              setOpenPopover(false)
            }}
            className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
              !filtroAtivo
                ? 'bg-sky-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-100 text-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Layers className={`w-3.5 h-3.5 ${!filtroAtivo ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">Todos os registros (sem filtro)</span>
            </div>
            {!filtroAtivo && <Check className="w-4 h-4 text-white shrink-0" />}
          </div>

          {activeTab === 'filtros' && (
            <>
              {/* SEÇÃO 1: FILTROS DE SISTEMA (FIXOS NO TOPO, NÃO EDITÁVEIS, NÃO EXCLUÍVEIS) */}
              {filtrosSistemaFiltrados.length > 0 && (
                <div className="pt-1 pb-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1 text-sky-700">
                      <ShieldCheck className="w-3 h-3 text-sky-600" />
                      <span>Filtros de Sistema</span>
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 lowercase">
                      (fixos • pré-definidos)
                    </span>
                  </div>

                  {filtrosSistemaFiltrados.map((filtro) => {
                    const isSelected = filtroAtivo?.id === filtro.id
                    const isFav = favoritosIds.includes(filtro.id)

                    return (
                      <div
                        key={filtro.id}
                        onClick={() => {
                          onSelectFiltro(filtro)
                          setOpenPopover(false)
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                          isSelected
                            ? 'bg-sky-600 text-white font-bold shadow-2xs'
                            : 'hover:bg-sky-50/70 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span title="Filtro de Sistema Oficial" className="inline-flex shrink-0">
                            <ShieldCheck
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-white' : 'text-sky-600'
                              }`}
                            />
                          </span>
                          <div className="truncate flex items-center gap-1.5 min-w-0">
                            <span className="truncate block font-medium">{filtro.nome}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${
                                isSelected
                                  ? 'bg-sky-700/60 text-sky-100 border-sky-400'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              Sistema
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {/* Botão Favoritar para filtro de sistema */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorito(filtro.id, e)}
                            className={`p-1 rounded hover:scale-110 transition-transform ${
                              isSelected ? 'text-white' : 'text-slate-400 hover:text-amber-500'
                            }`}
                            title="Favoritar filtro de sistema"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isFav
                                  ? isSelected
                                    ? 'fill-white text-white'
                                    : 'fill-amber-400 text-amber-500'
                                  : ''
                              }`}
                            />
                          </button>

                          {/* NÃO possui botão de editar nem excluir por ser de sistema */}

                          {isSelected && <Check className="w-4 h-4 text-white ml-0.5 shrink-0" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* SEÇÃO 2: FILTROS DO USUÁRIO / SALVOS */}
              <div className="pt-1">
                {filtrosSistemaFiltrados.length > 0 && filtrosUsuarioFiltrados.length > 0 && (
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between border-t border-slate-100 mt-1">
                    <span>Meus Filtros e Compartilhados</span>
                  </div>
                )}

                {filtrosUsuarioFiltrados.map((filtro) => {
                  const isSelected = filtroAtivo?.id === filtro.id
                  const isFav = favoritosIds.includes(filtro.id)
                  const podeEditar = isDono(filtro)

                  return (
                    <div
                      key={filtro.id}
                      onClick={() => {
                        onSelectFiltro(filtro)
                        setOpenPopover(false)
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                        isSelected
                          ? 'bg-sky-600 text-white font-bold shadow-2xs'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {filtro.visibilidade === 'shared' ? (
                          <span title="Filtro Compartilhado" className="inline-flex">
                            <Globe
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-white' : 'text-emerald-600'
                              }`}
                            />
                          </span>
                        ) : (
                          <span title="Filtro Privado" className="inline-flex">
                            <Lock
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-white' : 'text-slate-400'
                              }`}
                            />
                          </span>
                        )}
                        <div className="truncate">
                          <span className="truncate block">{filtro.nome}</span>
                          {filtro.visibilidade === 'shared' && filtro.dono_nome && (
                            <span
                              className={`text-[10px] block truncate ${
                                isSelected ? 'text-sky-100' : 'text-slate-400'
                              }`}
                            >
                              Por {filtro.dono_nome}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {/* Botão Favoritar */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorito(filtro.id, e)}
                          className={`p-1 rounded hover:scale-110 transition-transform ${
                            isSelected ? 'text-white' : 'text-slate-400 hover:text-amber-500'
                          }`}
                          title="Favoritar filtro"
                        >
                          <Star
                            className={`w-3.5 h-3.5 ${
                              isFav
                                ? isSelected
                                  ? 'fill-white text-white'
                                  : 'fill-amber-400 text-amber-500'
                                : ''
                            }`}
                          />
                        </button>

                        {/* Botão Editar (apenas dono) */}
                        {podeEditar && (
                          <button
                            type="button"
                            onClick={(e) => handleAbrirEditar(filtro, e)}
                            className={`p-1 rounded transition-colors opacity-70 group-hover:opacity-100 ${
                              isSelected
                                ? 'text-white hover:bg-white/20'
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Editar regras deste filtro"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}

                        {/* Botão Excluir (apenas dono) */}
                        {podeEditar && (
                          <button
                            type="button"
                            onClick={(e) => handleExcluir(filtro, e)}
                            className={`p-1 rounded transition-colors opacity-70 group-hover:opacity-100 ${
                              isSelected
                                ? 'text-white hover:bg-rose-500'
                                : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Excluir filtro"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        {isSelected && <Check className="w-4 h-4 text-white ml-0.5 shrink-0" />}
                      </div>
                    </div>
                  )
                })}
              </div>

              {filtrosSistemaFiltrados.length === 0 && filtrosUsuarioFiltrados.length === 0 && (
                <div className="py-6 text-center text-slate-400">
                  <Filter className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs">Nenhum filtro encontrado</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'favoritos' && (
            <>
              {favoritosFiltrados.map((filtro) => {
                const isSelected = filtroAtivo?.id === filtro.id
                return (
                  <div
                    key={filtro.id}
                    onClick={() => {
                      onSelectFiltro(filtro)
                      setOpenPopover(false)
                    }}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-600 text-white font-bold shadow-2xs'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Star
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-white fill-white' : 'text-amber-500 fill-amber-400'
                        }`}
                      />
                      <span className="truncate">{filtro.nome}</span>
                      {isFiltroSistema(filtro) && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${
                            isSelected
                              ? 'bg-sky-700/60 text-sky-100 border-sky-400'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          Sistema
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                  </div>
                )
              })}

              {favoritosFiltrados.length === 0 && (
                <div className="py-6 text-center text-slate-400">
                  <Star className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                  <p className="text-xs">Nenhum filtro favorito</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Clique na estrela ao lado de um filtro para adicioná-lo aos favoritos.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Rodapé: Botão "+ Novo Filtro" */}
        <div className="p-2 border-t border-slate-100 bg-slate-50">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAbrirCriar}
            className="w-full text-xs font-bold text-sky-700 hover:text-sky-800 hover:bg-sky-50 border-sky-200 h-8 rounded-lg shadow-2xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Criar Novo Filtro</span>
          </Button>
        </div>
      </div>
    )
  }
}

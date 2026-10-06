import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  Clock,
  ListTodo,
  CalendarDays,
  Plus,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { AtividadeItem } from '@/components/AtividadeItem'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'
import { ModalDisparoMensagensMassa } from '@/components/ModalDisparoMensagensMassa'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AtividadesCalendario } from '@/components/AtividadesCalendario'
import { AtividadesPendentesList } from '@/components/AtividadesPendentesList'
import type { Atividade, AtividadeTipo, AtividadeStatus } from '@/types/crm'

export const Atividades: React.FC = () => {
  const { isAdmin } = useAuth()
  const {
    clientes,
    atividades,
    usuarios,
    updateAtividadeStatus,
    removeAtividade,
    openFichaCliente,
    error,
    refreshData,
  } = useClientes()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshData()
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const handleRecarregar = () => {
      handleRefresh()
    }
    window.addEventListener('delfos:recarregar-dados', handleRecarregar)
    return () => window.removeEventListener('delfos:recarregar-dados', handleRecarregar)
  }, [])

  // Usuário selecionado no filtro global da página de atividades (padrão: usuário logado ou "todos")
  const [usuarioFiltroId, setUsuarioFiltroId] = useState<string>('todos')

  useEffect(() => {
    const handleMobileFilterChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ responsavelId?: string }>
      if (customEvent.detail && customEvent.detail.responsavelId !== undefined) {
        setUsuarioFiltroId(customEvent.detail.responsavelId)
      }
    }
    window.addEventListener('delfos:mobile-filter-change', handleMobileFilterChange)
    return () => {
      window.removeEventListener('delfos:mobile-filter-change', handleMobileFilterChange)
    }
  }, [])

  // Controle do modal de agendamento acionado pelo botão nova atividade
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMensagemMassaOpen, setModalMensagemMassaOpen] = useState(false)
  const [modalInitialTipo, setModalInitialTipo] = useState<AtividadeTipo | null>(null)

  // Ouvinte para abrir modal de nova atividade via header mobile (+)
  useEffect(() => {
    const handleOpenNovaAtividade = () => {
      setModalInitialTipo(null)
      setModalOpen(true)
    }
    window.addEventListener('delfos:abrir-novo-lead', handleOpenNovaAtividade)
    return () => {
      window.removeEventListener('delfos:abrir-novo-lead', handleOpenNovaAtividade)
    }
  }, [])
  const [atividadeParaExcluir, setAtividadeParaExcluir] = useState<{
    id: string
    titulo: string
  } | null>(null)
  const [isDeletingAtividade, setIsDeletingAtividade] = useState(false)

  // Modo de exibição: Calendário vs Fila de Pendentes vs Timeline Geral
  const [activeView, setActiveView] = useState<'calendario' | 'pendentes' | 'timeline'>(
    'calendario',
  )

  // Filtros da timeline geral
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClienteId, setFilterClienteId] = useState<string>('todos')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus: AtividadeStatus = currentStatus === 'concluida' ? 'pendente' : 'concluida'
    await updateAtividadeStatus(id, nextStatus)
  }

  // Filtragem da Timeline Geral
  const filteredTimelineAtividades = useMemo(() => {
    return atividades
      .filter((a) => {
        if (filterClienteId !== 'todos' && a.cliente_id !== filterClienteId) {
          return false
        }
        if (filterTipo !== 'todos' && a.tipo !== filterTipo) {
          return false
        }
        if (filterStatus === 'pendente' && a.status === 'concluida') {
          return false
        }
        if (filterStatus === 'concluida' && a.status !== 'concluida') {
          return false
        }
        if (usuarioFiltroId !== 'todos') {
          const matchId = a.responsavel_id === usuarioFiltroId
          const u = usuarios.find((x) => x.id === usuarioFiltroId)
          const matchName = u && a.responsavel_nome?.toLowerCase().includes(u.name.toLowerCase())
          if (!matchId && !matchName) return false
        }
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase()
          const descMatch = (a.descricao || '').toLowerCase().includes(term)
          const titMatch = (a.titulo || '').toLowerCase().includes(term)
          const clientMatch = (a.expand?.cliente_id?.nome || '').toLowerCase().includes(term)
          const respMatch = (a.responsavel_nome || '').toLowerCase().includes(term)
          if (!descMatch && !titMatch && !clientMatch && !respMatch) return false
        }
        return true
      })
      .sort(
        (a, b) => new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
      )
  }, [atividades, filterClienteId, filterTipo, filterStatus, usuarioFiltroId, searchTerm, usuarios])

  // Contagens para os badges
  const totalPendentesGerais = useMemo(() => {
    return atividades.filter((a) => a.status !== 'concluida').length
  }, [atividades])

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* Barra Única Compacta: Abas à esquerda e Ações (Recarregar + Nova Atividade) à direita */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Abas: Calendário / Fila de Pendências / Timeline (botões com ícones apenas no estilo h-9 px-2.5 rounded-xl border com tooltip) */}
        <div className="inline-flex items-center gap-1.5 w-fit">
          <button
            type="button"
            onClick={() => setActiveView('pendentes')}
            className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-all shadow-2xs inline-flex items-center justify-center gap-1 cursor-pointer ${
              activeView === 'pendentes'
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title={`Fila de Pendências (${totalPendentesGerais} pendentes)`}
            aria-label={`Fila de Pendências (${totalPendentesGerais} pendentes)`}
          >
            <ListTodo
              className={`w-4 h-4 ${activeView === 'pendentes' ? 'text-white' : 'text-amber-500'}`}
            />
            {totalPendentesGerais > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeView === 'pendentes'
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {totalPendentesGerais}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('calendario')}
            className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-all shadow-2xs inline-flex items-center justify-center cursor-pointer ${
              activeView === 'calendario'
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title="Visualização em Calendário"
            aria-label="Visualização em Calendário"
          >
            <CalendarDays
              className={`w-4 h-4 ${activeView === 'calendario' ? 'text-white' : 'text-emerald-600'}`}
            />
          </button>

          <button
            type="button"
            onClick={() => setActiveView('timeline')}
            className={`h-9 px-2.5 rounded-xl border text-xs font-bold transition-all shadow-2xs inline-flex items-center justify-center gap-1 cursor-pointer ${
              activeView === 'timeline'
                ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400/30'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
            title={`Timeline Geral (${atividades.length} atividades)`}
            aria-label={`Timeline Geral (${atividades.length} atividades)`}
          >
            <Clock
              className={`w-4 h-4 ${activeView === 'timeline' ? 'text-white' : 'text-blue-500'}`}
            />
            {atividades.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeView === 'timeline' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {atividades.length}
              </span>
            )}
          </button>
        </div>
        {/* Controles à direita: Botão padronizado Atualizar + Disparar Mensagens + Nova Atividade */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 px-3 rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            type="button"
            onClick={() => setModalMensagemMassaOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#0284C7] hover:bg-[#0369a1] text-white font-semibold shadow-xs inline-flex items-center gap-1.5"
            title="Disparar mensagens em massa via WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
            Disparar Mensagens
          </Button>
          <Button
            type="button"
            onClick={() => {
              setModalOpen(true)
            }}
            className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-medium shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Atividade
          </Button>
        </div>{' '}
      </div>

      {/* Banner de erro quando houver falha ao carregar dados do CRM */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Erro ao carregar dados do CRM</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shrink-0 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* 4. Conteúdo da visão ativa */}
      {activeView === 'calendario' && (
        <AtividadesCalendario
          atividades={atividades}
          usuarios={usuarios}
          usuarioSelecionadoId={usuarioFiltroId}
          onSelectUsuario={setUsuarioFiltroId}
          onToggleStatus={handleToggleStatus}
          onOpenCliente={openFichaCliente}
        />
      )}

      {activeView === 'pendentes' && (
        <AtividadesPendentesList
          atividades={atividades}
          usuarios={usuarios}
          usuarioSelecionadoId={usuarioFiltroId}
          onSelectUsuario={setUsuarioFiltroId}
          onToggleStatus={handleToggleStatus}
          onOpenCliente={openFichaCliente}
          onDeleteAtividade={
            isAdmin
              ? (id) => {
                  const target = atividades.find((a) => a.id === id)
                  setAtividadeParaExcluir({
                    id,
                    titulo: target?.titulo || 'Atividade',
                  })
                }
              : undefined
          }
        />
      )}

      {activeView === 'timeline' && (
        <div className="space-y-4">
          {/* Barra de Filtros e Busca */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-3.5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar em títulos, clientes, notas ou responsáveis..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={usuarioFiltroId}
                  onChange={(e) => setUsuarioFiltroId(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white max-w-[170px] truncate font-medium text-gray-800"
                >
                  <option value="todos">Todos os responsáveis</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterClienteId}
                  onChange={(e) => setFilterClienteId(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white max-w-[160px] truncate"
                >
                  <option value="todos">Todos os clientes</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>

                <select
                  value={filterTipo}
                  onChange={(e) => setFilterTipo(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="todos">Todos os tipos</option>
                  <option value="contato_ligacao">Entrar em contato</option>
                  <option value="reuniao_presencial">Reunião Presencial</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="instalacao">Instalação</option>
                  <option value="proposta">Proposta</option>
                  <option value="limpeza">Limpeza dos Módulos</option>
                  <option value="auto_leitura_rge">Auto Leitura - RGE</option>
                  <option value="ligar_indicacao">Solicitar indicação</option>
                  <option value="configuracao_datalogger">Configuração Datalogger</option>
                  <option value="garantia_equipamento">Garantia equipamento</option>
                  <option value="relatorio_solarview">Relatório Solarview</option>
                  <option value="contato_reativacao">Reativar Cliente</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs px-2.5 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="todos">Status: Todos</option>
                  <option value="pendente">Apenas Pendentes</option>
                  <option value="concluida">Apenas Concluídas</option>
                </select>
              </div>
            </div>

            {/* Chips de contagem rápida */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100 text-[11px] text-gray-500">
              <span className="font-semibold text-gray-700">Filtrados:</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded font-bold text-gray-800">
                {filteredTimelineAtividades.length} atividades
              </span>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="text-emerald-700 hover:underline ml-1"
                >
                  Limpar busca
                </button>
              )}
            </div>
          </div>

          {/* Timeline de cards */}
          {filteredTimelineAtividades.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-gray-800">Nenhuma atividade encontrada</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Tente alterar os filtros acima ou registre uma nova atividade usando o botão Nova
                Atividade.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Timeline Geral de Atividades ({filteredTimelineAtividades.length})
                </h3>
                <span className="text-[11px] text-gray-400">Mais recentes no topo</span>
              </div>

              <div className="space-y-1">
                {filteredTimelineAtividades.map((atv) => (
                  <div key={atv.id} className="relative">
                    <AtividadeItem
                      atividade={atv}
                      onDelete={
                        isAdmin
                          ? (id) => {
                              const target = atividades.find((a) => a.id === id)
                              setAtividadeParaExcluir({
                                id,
                                titulo: target?.titulo || atv.titulo || 'Atividade',
                              })
                            }
                          : undefined
                      }
                      onToggleStatus={handleToggleStatus}
                      showClienteName={true}
                    />
                    {/* Botão para abrir a ficha do cliente correspondente */}
                    {atv.cliente_id && (
                      <div className="absolute right-3.5 top-3.5">
                        <button
                          type="button"
                          onClick={() => openFichaCliente(atv.cliente_id)}
                          className="text-[10px] text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 font-semibold transition-colors"
                        >
                          Ver ficha →
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Modal de criação de atividade (acionado pelo botão Nova Atividade) */}
      <ModalNovaAtividade
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setModalInitialTipo(null)
        }}
      />

      {/* 4. Modal Disparar Mensagens em Massa WhatsApp */}
      <ModalDisparoMensagensMassa
        open={modalMensagemMassaOpen}
        onOpenChange={setModalMensagemMassaOpen}
        segmentoInicial="todos"
        titulo="Disparar Mensagens em Massa via WhatsApp"
        descricao="Envie mensagens personalizadas via Z-API para clientes do CRM com registro automático de atividade comercial."
      />

      {/* Confirmação Segura de Exclusão de Atividade */}
      <AlertDialog
        open={Boolean(atividadeParaExcluir)}
        onOpenChange={(open) => {
          if (!open && !isDeletingAtividade) {
            setAtividadeParaExcluir(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Atividade</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir a atividade{' '}
              <strong className="text-gray-900 font-semibold">
                {atividadeParaExcluir?.titulo}
              </strong>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAtividade}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingAtividade}
              onClick={async (e) => {
                e.preventDefault()
                if (!atividadeParaExcluir) return
                try {
                  setIsDeletingAtividade(true)
                  await removeAtividade(atividadeParaExcluir.id)
                  setAtividadeParaExcluir(null)
                } catch (err) {
                  console.error('Erro ao excluir atividade:', err)
                  alert('Ocorreu um erro ao excluir a atividade. Tente novamente.')
                } finally {
                  setIsDeletingAtividade(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {isDeletingAtividade ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Atividades

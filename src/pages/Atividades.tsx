import React, { useState, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
  Search,
  Clock,
  User,
  ListTodo,
  CalendarDays,
  Plus,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { AtividadeItem } from '@/components/AtividadeItem'
import { AtividadesGridIcones } from '@/components/AtividadesGridIcones'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'
import { AtividadesCalendario } from '@/components/AtividadesCalendario'
import { AtividadesPendentesList } from '@/components/AtividadesPendentesList'
import type { TipoAtividadeDef } from '@/constants/atividadesTipos'
import type { AtividadeTipo, AtividadeStatus } from '@/types/crm'

export const Atividades: React.FC = () => {
  const {
    clientes,
    atividades,
    usuarios,
    updateAtividadeStatus,
    removeAtividade,
    openFichaCliente,
  } = useClientes()
  const { user } = useAuth()

  // Usuário selecionado no filtro global da página de atividades (padrão: usuário logado ou "todos")
  const [usuarioFiltroId, setUsuarioFiltroId] = useState<string>('todos')

  // Controle do modal de agendamento acionado pelo grid de 12 ícones ou botão novo
  const [modalOpen, setModalOpen] = useState(false)
  const [modalInitialTipo, setModalInitialTipo] = useState<AtividadeTipo | null>(null)

  // Modo de exibição: Calendário vs Fila de Pendentes vs Timeline Geral
  const [activeView, setActiveView] = useState<'calendario' | 'pendentes' | 'timeline'>(
    'calendario',
  )

  // Filtros da timeline geral
  const [searchTerm, setSearchTerm] = useState('')
  const [filterClienteId, setFilterClienteId] = useState<string>('todos')
  const [filterTipo, setFilterTipo] = useState<string>('todos')
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  // Ao clicar em qualquer um dos 12 ícones:
  // "Ao clicar em um ícone de atividade, abrir um formulário para registrar a atividade.
  // O nome do tipo clicado deve virar AUTOMATICAMENTE o título da atividade.
  // O campo de descrição detalhada deve existir mas NÃO ser obrigatório.
  // O formulário deve ter também um campo para selecionar qual usuário do sistema vai ficar responsável"
  const handleSelectIconeTipo = (item: TipoAtividadeDef) => {
    setModalInitialTipo(item.id)
    setModalOpen(true)
  }

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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header com resumo e botão de ação rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-emerald-600" />
            Central de Atividades & Tarefas
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Planejamento diário, calendário com chips coloridos e acompanhamento de tarefas por
            responsável.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Seletor global do usuário */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-gray-200 text-xs shadow-2xs">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-gray-500 hidden sm:inline">Filtrar por:</span>
            <select
              value={usuarioFiltroId}
              onChange={(e) => setUsuarioFiltroId(e.target.value)}
              className="bg-transparent font-bold text-gray-800 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos os Usuários</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              setModalInitialTipo('contato_ligacao')
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Atividade</span>
          </button>
        </div>
      </div>

      {/* 2. BARRA COM OS 12 ÍCONES DE ATIVIDADES (com tooltip e clique para abrir form com título preenchido automaticamente) */}
      <AtividadesGridIcones onSelectTipo={handleSelectIconeTipo} tipoAtivo={modalInitialTipo} />

      {/* 3. Alternador de Visões: Calendário Mensal / Lista de Pendências / Timeline Geral */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveView('calendario')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeView === 'calendario'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>Calendário Mensal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('pendentes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeView === 'pendentes'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ListTodo className="w-4 h-4 text-amber-500" />
            <span>Fila de Pendências</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold">
              {totalPendentesGerais}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('timeline')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all ${
              activeView === 'timeline'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Timeline Completa</span>
            <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded-full font-bold">
              {atividades.length}
            </span>
          </button>
        </div>

        <div className="text-xs text-gray-500 font-medium">
          {activeView === 'calendario' && (
            <span>Clique nos dias ou nos chips para ver detalhes e marcar como concluída</span>
          )}
          {activeView === 'pendentes' && (
            <span>Marque as tarefas pelo círculo à esquerda para dar baixa</span>
          )}
          {activeView === 'timeline' && (
            <span>Histórico cronológico detalhado com filtros avançados</span>
          )}
        </div>
      </div>

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
                  <option value="limpeza_manutencao">Limpeza e Manutenção</option>
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
                Tente alterar os filtros acima ou registre uma nova atividade clicando em um dos 12
                ícones no topo.
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
                      onDelete={removeAtividade}
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

      {/* 5. Modal de criação de atividade (acionado pelos 12 ícones ou pelo botão Nova Atividade) */}
      <ModalNovaAtividade
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTipo={modalInitialTipo}
      />
    </div>
  )
}

export default Atividades

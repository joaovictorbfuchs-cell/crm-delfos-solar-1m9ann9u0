import React, { useState, useMemo } from 'react'
import {
  Clock,
  CheckCircle2,
  Circle,
  User,
  Calendar,
  Building,
  ArrowRight,
  Filter,
  Search,
} from 'lucide-react'
import type { Atividade, SistemaUsuario } from '@/types/crm'
import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'
import { formatDateTime } from '@/lib/formatters'

interface AtividadesPendentesListProps {
  atividades: Atividade[]
  usuarios: SistemaUsuario[]
  usuarioSelecionadoId: string
  onSelectUsuario: (id: string) => void
  onToggleStatus: (id: string, currentStatus: string) => void
  onOpenCliente: (clienteId: string) => void
}

export const AtividadesPendentesList: React.FC<AtividadesPendentesListProps> = ({
  atividades,
  usuarios,
  usuarioSelecionadoId,
  onSelectUsuario,
  onToggleStatus,
  onOpenCliente,
}) => {
  const [tabStatus, setTabStatus] = useState<'pendentes' | 'concluidas' | 'todas'>('pendentes')
  const [searchTerm, setSearchTerm] = useState('')

  // Filtrar atividades pelo usuário
  const atividadesDoUsuario = useMemo(() => {
    if (usuarioSelecionadoId === 'todos') {
      return atividades
    }
    return atividades.filter((a) => {
      if (a.responsavel_id === usuarioSelecionadoId) return true
      const user = usuarios.find((u) => u.id === usuarioSelecionadoId)
      if (user) {
        if (
          a.responsavel_nome &&
          a.responsavel_nome.toLowerCase().includes(user.name.toLowerCase())
        )
          return true
        if (a.autor && a.autor.toLowerCase().includes(user.name.toLowerCase())) return true
      }
      return false
    })
  }, [atividades, usuarioSelecionadoId, usuarios])

  // Contagens
  const countPendentes = useMemo(() => {
    return atividadesDoUsuario.filter((a) => a.status !== 'concluida').length
  }, [atividadesDoUsuario])

  const countConcluidas = useMemo(() => {
    return atividadesDoUsuario.filter((a) => a.status === 'concluida').length
  }, [atividadesDoUsuario])

  // Filtragem final por status e busca
  const filteredList = useMemo(() => {
    return atividadesDoUsuario
      .filter((a) => {
        if (tabStatus === 'pendentes' && a.status === 'concluida') return false
        if (tabStatus === 'concluidas' && a.status !== 'concluida') return false

        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase()
          const matchTit = (a.titulo || '').toLowerCase().includes(term)
          const matchDesc = (a.descricao || '').toLowerCase().includes(term)
          const matchCli = (a.expand?.cliente_id?.nome || '').toLowerCase().includes(term)
          const matchResp = (a.responsavel_nome || '').toLowerCase().includes(term)
          if (!matchTit && !matchDesc && !matchCli && !matchResp) return false
        }
        return true
      })
      .sort((a, b) => {
        // Para pendentes: ordenamos por data crescente (mais urgentes/próximas primeiro)
        if (tabStatus === 'pendentes') {
          return new Date(a.data || a.created).getTime() - new Date(b.data || b.created).getTime()
        }
        // Para concluídas ou todas: mais recentes primeiro
        return new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime()
      })
  }, [atividadesDoUsuario, tabStatus, searchTerm])

  const usuarioAtivoNome = useMemo(() => {
    if (usuarioSelecionadoId === 'todos') return 'Todos os Usuários'
    const found = usuarios.find((u) => u.id === usuarioSelecionadoId)
    return found ? found.name : 'Usuário'
  }, [usuarioSelecionadoId, usuarios])

  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Header com Abas e Filtro de Usuário */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Tarefas & Atividades do Usuário
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Fila de trabalho de <strong className="text-emerald-700">{usuarioAtivoNome}</strong>
          </p>
        </div>

        {/* Alternador de status (Pendentes / Concluídas) */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTabStatus('pendentes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              tabStatus === 'pendentes'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Circle className="w-3.5 h-3.5 text-amber-500" />
            <span>Pendentes</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {countPendentes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabStatus('concluidas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              tabStatus === 'concluidas'
                ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Concluídas</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
              {countConcluidas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTabStatus('todas')}
            className={`px-2.5 py-1.5 rounded-lg transition-all ${
              tabStatus === 'todas'
                ? 'bg-white text-gray-900 shadow-2xs font-bold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Barra de busca rápida */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar por título, cliente, descrição ou responsável..."
          className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
        />
      </div>

      {/* Lista de cards */}
      {filteredList.length === 0 ? (
        <div className="py-10 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200 space-y-2">
          <Clock className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-xs font-semibold text-gray-600">
            Nenhuma atividade {tabStatus === 'pendentes' ? 'pendente' : 'encontrada'}
          </p>
          <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
            {tabStatus === 'pendentes'
              ? 'Tudo em dia! Nenhuma tarefa pendente para o filtro selecionado.'
              : 'Nenhum registro atende aos filtros de busca aplicados.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredList.map((atv) => {
            const conf = getTipoAtividadeConfig(atv.tipo)
            const Icon = conf.icon
            const isConcluida = atv.status === 'concluida'
            const isOverdue =
              !isConcluida && atv.data && new Date(atv.data).getTime() < new Date().getTime()

            return (
              <div
                key={atv.id}
                className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                  isConcluida
                    ? 'border-gray-200 bg-gray-50/60 opacity-80'
                    : isOverdue
                      ? 'border-amber-300 bg-amber-50/30 shadow-2xs'
                      : 'border-gray-200 bg-white shadow-2xs hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Botão de marcar status */}
                    <button
                      type="button"
                      onClick={() => onToggleStatus(atv.id, atv.status || 'pendente')}
                      className="mt-0.5 text-gray-400 hover:text-emerald-600 transition-colors shrink-0"
                      title={isConcluida ? 'Marcar como pendente' : 'Marcar como concluída'}
                    >
                      {isConcluida ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4 text-amber-500 hover:text-emerald-600" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${conf.badgeClass}`}
                        >
                          {conf.tituloPadrao}
                        </span>

                        {isOverdue && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            Atrasada
                          </span>
                        )}

                        <div className="flex items-center text-[11px] text-gray-500 gap-1 ml-auto">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{formatDateTime(atv.data)}</span>
                        </div>
                      </div>

                      <h4
                        className={`text-xs font-bold leading-tight ${
                          isConcluida ? 'text-gray-500 line-through' : 'text-gray-900'
                        }`}
                      >
                        {atv.titulo || conf.tituloPadrao}
                      </h4>

                      {atv.descricao && (
                        <p className="text-[11px] text-gray-600 mt-1 whitespace-pre-wrap leading-relaxed line-clamp-3">
                          {atv.descricao}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rodapé do card: Cliente vinculado e Usuário Responsável */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-600">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-semibold text-emerald-900 truncate">
                      {atv.responsavel_nome || atv.autor || 'João Delfos'}
                    </span>
                  </div>

                  {atv.cliente_id && (
                    <button
                      type="button"
                      onClick={() => onOpenCliente(atv.cliente_id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors"
                    >
                      <Building className="w-3 h-3" />
                      <span className="truncate max-w-[140px]">
                        {atv.expand?.cliente_id?.nome || 'Ver Cliente'}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

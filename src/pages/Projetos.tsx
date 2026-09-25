import React, { useState, useMemo } from 'react'
import { FolderKanban, Plus, Search, RefreshCw } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { SessaoExpiradaAlert } from '@/components/SessaoExpiradaAlert'
import { Button } from '@/components/ui/button'
import { KanbanProjetos } from '@/components/KanbanProjetos'
import { ModalAtribuirProfissional } from '@/components/ModalAtribuirProfissional'
import { ModalNovoProjeto } from '@/components/ModalNovoProjeto'
import type { Projeto, ProjetoEtapa } from '@/types/crm'

export const Projetos: React.FC = () => {
  const {
    isSessionExpired,
    authError,
    projetos,
    clientes,
    profissionais,
    isLoading,
    addProjeto,
    assignProjetoProfissional,
    updateProjetoEtapa,
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

  const [searchTerm, setSearchTerm] = useState('')

  // Modais
  const [isNovoProjetoModalOpen, setIsNovoProjetoModalOpen] = useState(false)
  const [atribuirModalState, setAtribuirModalState] = useState<{
    isOpen: boolean
    projeto: Projeto | null
    targetEtapa?: ProjetoEtapa | null
  }>({
    isOpen: false,
    projeto: null,
    targetEtapa: null,
  })

  // IDs de clientes com projeto
  const existingClienteIdsWithProjeto = useMemo(() => projetos.map((p) => p.cliente_id), [projetos])

  // Filtragem de projetos
  const filteredProjetos = useMemo(() => {
    return projetos.filter((p) => {
      const q = searchTerm.toLowerCase()
      const clienteNome = (p.expand?.cliente_id?.nome || '').toLowerCase()
      const cidade = (p.cidade || p.expand?.cliente_id?.cidade || '').toLowerCase()
      const profNome = (p.profissional_nome || p.expand?.profissional_id?.nome || '').toLowerCase()

      return (
        !q ||
        clienteNome.includes(q) ||
        cidade.includes(q) ||
        profNome.includes(q) ||
        p.etapa.toLowerCase().includes(q)
      )
    })
  }, [projetos, searchTerm])

  const handleOpenAtribuirModal = (projeto: Projeto, targetEtapa?: ProjetoEtapa) => {
    setAtribuirModalState({
      isOpen: true,
      projeto,
      targetEtapa,
    })
  }

  const handleConfirmAtribuir = async (
    profissionalId: string | null,
    profissionalNome: string | null,
  ) => {
    if (!atribuirModalState.projeto) return
    const projId = atribuirModalState.projeto.id

    // Se havia uma etapa alvo diferente da atual
    if (
      atribuirModalState.targetEtapa &&
      atribuirModalState.targetEtapa !== atribuirModalState.projeto.etapa
    ) {
      await updateProjetoEtapa(projId, atribuirModalState.targetEtapa, {
        profissional_id: profissionalId || undefined,
        profissional_nome: profissionalNome || undefined,
      })
    } else {
      await assignProjetoProfissional(projId, profissionalId, profissionalNome)
    }
  }

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto">
      {/* Alerta de Sessão Expirada no topo quando o token expira */}
      {isSessionExpired && (
        <SessaoExpiradaAlert
          mensagem={
            authError ||
            'Por motivos de segurança, sua sessão foi encerrada após um período de inatividade ou o token de acesso tornou-se inválido. Por favor, faça login novamente para continuar.'
          }
        />
      )}

      {/* Top Bar com Título, Métricas e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <FolderKanban className="w-4 h-4 text-emerald-700" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight whitespace-nowrap">
              Funil de Projetos & Engenharia
            </h1>
          </div>
        </div>

        {/* Ações e Busca */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Campo de Busca no lugar do botão de profissionais */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, cidade ou profissional..."
              className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
            />
          </div>

          {/* Botão padronizado Atualizar */}
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

          {/* Botão Novo Projeto */}
          <button
            type="button"
            onClick={() => setIsNovoProjetoModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Funil Visual Kanban */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs min-h-[460px]">
        {isSessionExpired ? (
          <div className="py-12 text-center text-xs text-amber-800">
            Sua sessão expirou. Clique em &quot;Fazer Login Novamente&quot; acima para carregar o
            funil de projetos.
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-500 text-xs">
            Carregando projetos...
          </div>
        ) : (
          <KanbanProjetos
            projetos={filteredProjetos}
            profissionais={profissionais}
            onOpenAtribuirModal={handleOpenAtribuirModal}
          />
        )}
      </div>

      {/* Modais */}
      <ModalAtribuirProfissional
        isOpen={atribuirModalState.isOpen}
        onClose={() => setAtribuirModalState({ isOpen: false, projeto: null, targetEtapa: null })}
        projeto={atribuirModalState.projeto}
        targetEtapa={atribuirModalState.targetEtapa}
        profissionais={profissionais}
        onConfirm={handleConfirmAtribuir}
      />

      <ModalNovoProjeto
        isOpen={isNovoProjetoModalOpen}
        onClose={() => setIsNovoProjetoModalOpen(false)}
        clientes={clientes}
        profissionais={profissionais}
        existingClienteIdsWithProjeto={existingClienteIdsWithProjeto}
        onCreateProjeto={async (data) => {
          await addProjeto(data)
        }}
      />
    </div>
  )
}

export default Projetos

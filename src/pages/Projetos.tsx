import React, { useState, useMemo } from 'react'
import {
  FolderKanban,
  UserCheck,
  Plus,
  Zap,
  Search,
  Users,
  HardHat,
  Filter,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { KanbanProjetos } from '@/components/KanbanProjetos'
import { ModalGerenciarProfissionais } from '@/components/ModalGerenciarProfissionais'
import { ModalAtribuirProfissional } from '@/components/ModalAtribuirProfissional'
import { ModalNovoProjeto } from '@/components/ModalNovoProjeto'
import type { Projeto, ProjetoEtapa } from '@/types/crm'

export const Projetos: React.FC = () => {
  const {
    projetos,
    clientes,
    profissionais,
    isLoading,
    addProfissional,
    updateProfissional,
    removeProfissional,
    addProjeto,
    assignProjetoProfissional,
    updateProjetoEtapa,
  } = useClientes()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProfissionalFilter, setSelectedProfissionalFilter] = useState<string>('all')

  // Modais
  const [isProfissionaisModalOpen, setIsProfissionaisModalOpen] = useState(false)
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

      const matchesSearch =
        !q ||
        clienteNome.includes(q) ||
        cidade.includes(q) ||
        profNome.includes(q) ||
        p.etapa.toLowerCase().includes(q)

      const matchesProf =
        selectedProfissionalFilter === 'all' ||
        (selectedProfissionalFilter === 'none' && !p.profissional_id) ||
        p.profissional_id === selectedProfissionalFilter

      return matchesSearch && matchesProf
    })
  }, [projetos, searchTerm, selectedProfissionalFilter])

  // Métricas rápidas de topo
  const totalKwp = useMemo(
    () => filteredProjetos.reduce((acc, p) => acc + (p.potencia_kwp || 0), 0),
    [filteredProjetos],
  )

  const concluidosCount = useMemo(
    () => filteredProjetos.filter((p) => p.etapa === 'Concluído').length,
    [filteredProjetos],
  )

  const instalacaoCount = useMemo(
    () => filteredProjetos.filter((p) => p.etapa === 'Instalação').length,
    [filteredProjetos],
  )

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
      {/* Top Bar com Título, Métricas e Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FolderKanban className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Funil de Projetos & Engenharia
              </h1>
              <p className="text-xs text-gray-500">
                Acompanhamento operacional das 6 etapas de execução solar
              </p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão para gerenciar profissionais / instaladores */}
          <button
            type="button"
            onClick={() => setIsProfissionaisModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-gray-300 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <HardHat className="w-4 h-4 text-emerald-600" />
            <span>Profissionais & Técnicos ({profissionais.length})</span>
          </button>

          {/* Botão Novo Projeto */}
          <button
            type="button"
            onClick={() => setIsNovoProjetoModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Projeto</span>
          </button>
        </div>
      </div>

      {/* Mini Cards de Métricas e Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-400 uppercase">Total de Projetos</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{filteredProjetos.length}</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs">
          <div className="text-[11px] font-semibold text-gray-400 uppercase flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Potência em Obras
          </div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">
            {totalKwp.toFixed(1)} <span className="text-xs text-gray-500 font-bold">kWp</span>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-orange-200 bg-orange-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-orange-700 uppercase flex items-center gap-1">
            <HardHat className="w-3.5 h-3.5 text-orange-600" />
            Em Instalação
          </div>
          <div className="text-xl font-black text-orange-700 mt-0.5">{instalacaoCount}</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Concluídos / Ligados
          </div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{concluidosCount}</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, cidade ou profissional..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
            Filtrar responsável:
          </span>
          <select
            value={selectedProfissionalFilter}
            onChange={(e) => setSelectedProfissionalFilter(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
          >
            <option value="all">Todos os profissionais</option>
            <option value="none">Sem profissional atribuído</option>
            {profissionais.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.especialidade})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Funil Visual Kanban */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs min-h-[460px]">
        {isLoading ? (
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
      <ModalGerenciarProfissionais
        isOpen={isProfissionaisModalOpen}
        onClose={() => setIsProfissionaisModalOpen(false)}
        profissionais={profissionais}
        onAddProfissional={addProfissional}
        onUpdateProfissional={updateProfissional}
        onRemoveProfissional={removeProfissional}
      />

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

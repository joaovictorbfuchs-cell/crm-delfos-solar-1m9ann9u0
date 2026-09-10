import React, { useState } from 'react'
import {
  X,
  Plus,
  UserCheck,
  Phone,
  Briefcase,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
} from 'lucide-react'
import type { Profissional, ProfissionalEspecialidade } from '@/types/crm'

interface ModalGerenciarProfissionaisProps {
  isOpen: boolean
  onClose: () => void
  profissionais: Profissional[]
  onAddProfissional: (data: {
    nome: string
    telefone: string
    especialidade: ProfissionalEspecialidade
  }) => Promise<Profissional>
  onUpdateProfissional: (id: string, data: Partial<Profissional>) => Promise<Profissional>
  onRemoveProfissional: (id: string) => Promise<void>
}

const ESPECIALIDADES: {
  value: ProfissionalEspecialidade
  label: string
  color: string
}[] = [
  {
    value: 'Instalação',
    label: 'Instalação',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    value: 'Manutenção',
    label: 'Manutenção',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    value: 'Limpeza',
    label: 'Limpeza',
    color: 'bg-sky-100 text-sky-800 border-sky-200',
  },
  {
    value: 'Projeto Elétrico',
    label: 'Projeto Elétrico',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    value: 'Almoxarifado',
    label: 'Almoxarifado',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
]

export const ModalGerenciarProfissionais: React.FC<ModalGerenciarProfissionaisProps> = ({
  isOpen,
  onClose,
  profissionais,
  onAddProfissional,
  onUpdateProfissional,
  onRemoveProfissional,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [especialidade, setEspecialidade] = useState<ProfissionalEspecialidade>('Instalação')
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!isOpen) return null

  const handleStartEdit = (p: Profissional) => {
    setEditingId(p.id)
    setNome(p.nome)
    setTelefone(p.telefone || '')
    setEspecialidade(p.especialidade)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setNome('')
    setTelefone('')
    setEspecialidade('Instalação')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    setIsSaving(true)
    try {
      if (editingId) {
        await onUpdateProfissional(editingId, {
          nome: nome.trim(),
          telefone: telefone.trim(),
          especialidade,
        })
        setFeedback('Profissional atualizado!')
      } else {
        await onAddProfissional({
          nome: nome.trim(),
          telefone: telefone.trim(),
          especialidade,
        })
        setFeedback('Profissional cadastrado!')
      }
      handleCancelEdit()
      setTimeout(() => setFeedback(null), 3000)
    } catch (err) {
      console.error('Erro ao salvar profissional:', err)
      alert('Falha ao salvar profissional.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, pNome: string) => {
    if (!confirm(`Deseja realmente remover o profissional "${pNome}"?`)) return
    try {
      await onRemoveProfissional(id)
    } catch (err) {
      console.error('Erro ao remover profissional:', err)
      alert('Não foi possível remover o profissional.')
    }
  }

  const filtered = profissionais.filter((p) => {
    const q = searchTerm.toLowerCase()
    return (
      p.nome.toLowerCase().includes(q) ||
      (p.telefone && p.telefone.toLowerCase().includes(q)) ||
      p.especialidade.toLowerCase().includes(q)
    )
  })

  const getEspecialidadeBadge = (esp: ProfissionalEspecialidade) => {
    const found = ESPECIALIDADES.find((e) => e.value === esp)
    const color = found ? found.color : 'bg-gray-100 text-gray-800 border-gray-200'
    return (
      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${color}`}>
        {esp}
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Instaladores e Profissionais Técnicos
              </h2>
              <p className="text-xs text-emerald-100">
                Cadastro de instaladores, eletricistas e técnicos de campo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-200 flex items-center gap-2 text-xs font-semibold text-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Form de Cadastro / Edição */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-xl border border-emerald-200/90 bg-emerald-50/30 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                {editingId ? (
                  <>
                    <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                    Editar Profissional
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    Cadastrar Novo Profissional
                  </>
                )}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                >
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Carlos Oliveira"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(54) 99999-9999"
                  className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  Especialidade *
                </label>
                <select
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value as ProfissionalEspecialidade)}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer font-medium"
                >
                  {ESPECIALIDADES.map((esp) => (
                    <option key={esp.value} value={esp.value}>
                      {esp.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSaving || !nome.trim()}
                className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                {editingId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Profissional</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Listagem com busca */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <span>Profissionais Cadastrados ({profissionais.length})</span>
              </div>

              {/* Busca rápida */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar profissional..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Nenhum profissional encontrado.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filtered.map((p) => {
                  const initial = p.nome.charAt(0).toUpperCase()
                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-white rounded-xl border border-gray-200 shadow-2xs hover:border-emerald-300 transition-all flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200">
                          {initial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-xs text-gray-900 truncate">
                            {p.nome}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                            {p.telefone ? (
                              <span className="flex items-center gap-1 truncate">
                                <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                                {p.telefone}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Sem telefone</span>
                            )}
                          </div>
                          <div className="mt-1">{getEspecialidadeBadge(p.especialidade)}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.nome)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Total de {profissionais.length} profissionais disponíveis para o funil
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-semibold rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

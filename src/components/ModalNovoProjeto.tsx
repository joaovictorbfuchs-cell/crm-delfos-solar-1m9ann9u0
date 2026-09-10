import React, { useState } from 'react'
import { X, Plus, Zap, MapPin, FolderKanban, UserCheck, CheckCircle2 } from 'lucide-react'
import type { Cliente, Profissional, ProjetoEtapa } from '@/types/crm'

interface ModalNovoProjetoProps {
  isOpen: boolean
  onClose: () => void
  clientes: Cliente[]
  profissionais: Profissional[]
  existingClienteIdsWithProjeto: string[]
  onCreateProjeto: (data: {
    cliente_id: string
    etapa: ProjetoEtapa
    potencia_kwp: number
    cidade: string
    profissional_id?: string
    profissional_nome?: string
    observacoes?: string
  }) => Promise<void>
}

const ETAPAS: ProjetoEtapa[] = [
  'Levantamento de Informações',
  'Elaboração de Projeto',
  'Pedido de Compra',
  'Aguardando Material',
  'Instalação',
  'Concluído',
]

export const ModalNovoProjeto: React.FC<ModalNovoProjetoProps> = ({
  isOpen,
  onClose,
  clientes,
  profissionais,
  existingClienteIdsWithProjeto,
  onCreateProjeto,
}) => {
  const [selectedClienteId, setSelectedClienteId] = useState('')
  const [etapa, setEtapa] = useState<ProjetoEtapa>('Levantamento de Informações')
  const [potenciaKwp, setPotenciaKwp] = useState<number>(0)
  const [cidade, setCidade] = useState('')
  const [profissionalId, setProfissionalId] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  // Filtrar clientes que ainda não possuem projeto ou permitir selecionar qualquer um
  const handleSelectCliente = (clienteId: string) => {
    setSelectedClienteId(clienteId)
    const client = clientes.find((c) => c.id === clienteId)
    if (client) {
      setPotenciaKwp(client.potencia_kwp || 0)
      setCidade(client.cidade || '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClienteId) return

    setIsSubmitting(true)
    try {
      const prof = profissionais.find((p) => p.id === profissionalId)
      await onCreateProjeto({
        cliente_id: selectedClienteId,
        etapa,
        potencia_kwp: Number(potenciaKwp) || 0,
        cidade: cidade.trim(),
        profissional_id: prof ? prof.id : undefined,
        profissional_nome: prof ? prof.nome : undefined,
        observacoes: observacoes.trim(),
      })
      onClose()
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      alert('Falha ao criar projeto.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#166534] to-[#16A34A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-xs">
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Criar Novo Projeto Solar</h2>
              <p className="text-xs text-emerald-100">
                Adicione um cliente ao funil operacional de projetos
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-emerald-100 hover:text-white rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Cliente *</label>
            <select
              required
              value={selectedClienteId}
              onChange={(e) => handleSelectCliente(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer font-medium"
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((c) => {
                const hasProj = existingClienteIdsWithProjeto.includes(c.id)
                return (
                  <option key={c.id} value={c.id}>
                    {c.nome} {c.cidade ? `(${c.cidade})` : ''} {hasProj ? '• [Já tem projeto]' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Etapa Inicial *</label>
              <select
                value={etapa}
                onChange={(e) => setEtapa(e.target.value as ProjetoEtapa)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer font-medium"
              >
                {ETAPAS.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Potência Total (kWp)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={potenciaKwp}
                  onChange={(e) => setPotenciaKwp(Number(e.target.value))}
                  placeholder="12.0"
                  className="w-full text-xs pl-3 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                  kWp
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Cidade / UF</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Ex: Erechim/RS"
                className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Profissional Técnico / Instalador
              </label>
              <select
                value={profissionalId}
                onChange={(e) => setProfissionalId(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer font-medium"
              >
                <option value="">Nenhum (atribuir depois)</option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} ({p.especialidade})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Observações Iniciais
            </label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Detalhes sobre a instalação, prazos ou particularidades do telhado..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedClienteId}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Criar Projeto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

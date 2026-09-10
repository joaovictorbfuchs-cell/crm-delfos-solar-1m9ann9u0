import React, { useState } from 'react'
import { X, HardHat, UserCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Projeto, Profissional, ProjetoEtapa } from '@/types/crm'

interface ModalAtribuirProfissionalProps {
  isOpen: boolean
  onClose: () => void
  projeto: Projeto | null
  targetEtapa?: ProjetoEtapa | null
  profissionais: Profissional[]
  onConfirm: (profissionalId: string | null, profissionalNome: string | null) => Promise<void>
}

export const ModalAtribuirProfissional: React.FC<ModalAtribuirProfissionalProps> = ({
  isOpen,
  onClose,
  projeto,
  targetEtapa,
  profissionais,
  onConfirm,
}) => {
  const [selectedProfId, setSelectedProfId] = useState<string>(projeto?.profissional_id || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !projeto) return null

  const etapaNome = targetEtapa || projeto.etapa

  // Filtrar profissionais sugeridos para instalação / manutenção / limpeza se houver match
  const filteredProfissionais = profissionais

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const chosen = profissionais.find((p) => p.id === selectedProfId)
      await onConfirm(chosen ? chosen.id : null, chosen ? chosen.nome : null)
      onClose()
    } catch (err) {
      console.error('Erro ao atribuir profissional:', err)
      alert('Falha ao atribuir profissional.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipWithoutProf = async () => {
    setIsSubmitting(true)
    try {
      await onConfirm(null, null)
      onClose()
    } catch (err) {
      console.error('Erro:', err)
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

      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <HardHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Atribuir Profissional Responsável</h3>
              <p className="text-[11px] text-emerald-100">Etapa: {etapaNome}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-emerald-100 hover:text-white rounded-md">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-700" />
              <span>Cliente: {projeto.expand?.cliente_id?.nome || 'Cliente'}</span>
            </div>
            <div className="text-[11px] text-emerald-800">
              Cidade: {projeto.cidade || 'N/A'} • Potência:{' '}
              {projeto.potencia_kwp ? `${projeto.potencia_kwp} kWp` : 'N/A'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Selecione o profissional técnico / instalador:
            </label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {filteredProfissionais.map((p) => {
                const isSelected = selectedProfId === p.id
                return (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 font-semibold ring-1 ring-emerald-500'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="radio"
                        name="prof"
                        value={p.id}
                        checked={isSelected}
                        onChange={() => setSelectedProfId(p.id)}
                        className="text-emerald-600 focus:ring-emerald-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{p.nome}</div>
                        <div className="text-[11px] text-gray-500">
                          {p.especialidade} {p.telefone ? `• ${p.telefone}` : ''}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 shrink-0 ml-1">
                      {p.especialidade}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Dica informativa */}
          <div className="flex items-start gap-2 p-2.5 bg-gray-50 rounded-lg text-[11px] text-gray-500 border border-gray-200">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              O nome do profissional atribuído aparecerá com destaque no card do projeto e na aba
              Projeto da ficha do cliente.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSkipWithoutProf}
              disabled={isSubmitting}
              className="text-xs text-gray-500 hover:text-gray-800 font-medium underline"
            >
              Manter sem profissional
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedProfId}
                className="px-4 py-1.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

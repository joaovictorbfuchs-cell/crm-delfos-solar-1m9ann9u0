import React, { useState } from 'react'
import { Wrench, Loader2, CheckCircle2, Clock, Calendar } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ManutencoesList } from '@/components/ManutencoesList'
import { NovaManutencaoModal } from '@/components/NovaManutencaoModal'

export default function Manutencoes() {
  const { manutencoes, isLoading } = useClientes()
  const [isNovaManutencaoOpen, setIsNovaManutencaoOpen] = useState(false)

  const concluidas = manutencoes.filter((m) => m.status === 'Concluído').length
  const emAndamento = manutencoes.filter((m) => m.status === 'Em andamento').length
  const agendadas = manutencoes.filter((m) => m.status === 'Agendado').length

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando ordens de manutenção...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Agendadas
            </span>
            <div className="text-2xl font-bold text-blue-600 mt-0.5">{agendadas}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Em Andamento
            </span>
            <div className="text-2xl font-bold text-amber-600 mt-0.5">{emAndamento}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Concluídas
            </span>
            <div className="text-2xl font-bold text-emerald-600 mt-0.5">{concluidas}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table / Cards List */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs">
        <ManutencoesList onOpenNovaManutencao={() => setIsNovaManutencaoOpen(true)} />
      </div>

      <NovaManutencaoModal
        isOpen={isNovaManutencaoOpen}
        onClose={() => setIsNovaManutencaoOpen(false)}
      />
    </div>
  )
}

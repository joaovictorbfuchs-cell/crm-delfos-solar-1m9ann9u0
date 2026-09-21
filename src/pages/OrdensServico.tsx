import React from 'react'
import { Wrench } from 'lucide-react'
import { GestaoOrdensServico } from '@/components/GestaoOrdensServico'

export default function OrdensServico() {
  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
            <Wrench className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Ordens de Serviço (Campo)
            </h2>
            <p className="text-xs text-gray-500">
              Gestão de ordens de serviço, checklist técnico e atribuição de instaladores
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal com a view GestaoOrdensServico */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs">
        <GestaoOrdensServico />
      </div>
    </div>
  )
}

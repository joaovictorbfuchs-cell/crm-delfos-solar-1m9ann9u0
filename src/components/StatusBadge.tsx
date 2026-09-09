import React from 'react'

export interface StatusBadgeProps {
  status: string
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'Agendado':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 ${className}`}
        >
          Agendado
        </span>
      )
    case 'Em andamento':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
        >
          Em andamento
        </span>
      )
    case 'Concluído':
    case 'Fechado':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
        >
          {status}
        </span>
      )
    case 'Perdido':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
        >
          Perdido
        </span>
      )
    case 'Lead':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 ${className}`}
        >
          Lead
        </span>
      )
    case 'Orçamento Enviado':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 ${className}`}
        >
          Orçamento Enviado
        </span>
      )
    case 'Proposta':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800 border border-teal-200 ${className}`}
        >
          Proposta
        </span>
      )
    case 'Negociação':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-900 border border-green-300 font-semibold ${className}`}
        >
          Negociação
        </span>
      )
    default:
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 ${className}`}
        >
          {status}
        </span>
      )
  }
}

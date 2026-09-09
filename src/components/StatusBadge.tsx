import React from 'react'

import type { ProdutoTipo } from '@/types/crm'

export interface ProductBadgeProps {
  produto?: ProdutoTipo | string
  className?: string
  size?: 'sm' | 'md'
}

export const ProductBadge: React.FC<ProductBadgeProps> = ({
  produto = 'Energia Solar',
  className = '',
  size = 'sm',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'

  switch (produto) {
    case 'Energia Solar':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
          Energia Solar
        </span>
      )
    case 'Manutenção avulsa':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0" />
          Manutenção avulsa
        </span>
      )
    case 'Plano de O&M':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 shrink-0" />
          Plano de O&M
        </span>
      )
    case 'Sistemas Híbridos':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-purple-50 text-purple-800 border border-purple-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 shrink-0" />
          Sistemas Híbridos
        </span>
      )
    case 'Carregadores veiculares':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-1.5 shrink-0" />
          Carregadores veiculares
        </span>
      )
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-md bg-gray-50 text-gray-700 border border-gray-200 ${sizeClasses} ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5 shrink-0" />
          {produto || 'Energia Solar'}
        </span>
      )
  }
}

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
    case 'Novo Lead':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200 ${className}`}
        >
          Novo Lead
        </span>
      )
    case 'Levantamento':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800 border border-sky-200 ${className}`}
        >
          Levantamento
        </span>
      )
    case 'Orçamento':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 ${className}`}
        >
          Orçamento
        </span>
      )
    case 'Negociação':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300 font-semibold ${className}`}
        >
          Negociação
        </span>
      )
    case 'Contato Futuro':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
        >
          Contato Futuro
        </span>
      )
    // Compatibilidade com valores legados
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
    case 'Perdido':
      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 ${className}`}
        >
          Perdido
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

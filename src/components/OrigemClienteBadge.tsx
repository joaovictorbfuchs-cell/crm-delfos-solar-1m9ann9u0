import React from 'react'
import { FileSpreadsheet, Building, Database, UserPlus, Layers } from 'lucide-react'
import { identificarOrigemCliente, OrigemClienteInfo, OrigemClienteTipo } from '@/lib/origemCliente'
import { Cliente } from '@/types/crm'

interface OrigemClienteBadgeProps {
  cliente?: Partial<Cliente> | null
  origemInfo?: OrigemClienteInfo
  showSublabel?: boolean
  className?: string
}

export function OrigemClienteBadge({
  cliente,
  origemInfo,
  showSublabel = false,
  className = '',
}: OrigemClienteBadgeProps) {
  const info = origemInfo || identificarOrigemCliente(cliente)

  const renderIcon = () => {
    switch (info.tipo) {
      case 'conta_azul':
        return <Building className="w-3 h-3 text-blue-600 shrink-0" />
      case 'pipedrive':
        return <Database className="w-3 h-3 text-emerald-700 shrink-0" />
      case 'pipedrive_conta_azul':
        return <Layers className="w-3 h-3 text-purple-600 shrink-0" />
      case 'planilha':
        return <FileSpreadsheet className="w-3 h-3 text-teal-600 shrink-0" />
      case 'manual':
      default:
        return <UserPlus className="w-3 h-3 text-gray-500 shrink-0" />
    }
  }

  const getStyleClasses = () => {
    switch (info.tipo) {
      case 'conta_azul':
        return 'bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100/70'
      case 'pipedrive':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/70'
      case 'pipedrive_conta_azul':
        return 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100/70'
      case 'planilha':
        return 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100/70'
      case 'manual':
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200/60'
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border transition-colors ${getStyleClasses()} ${className}`}
      title={info.sublabel ? `${info.label} (${info.sublabel})` : info.label}
    >
      {renderIcon()}
      <span className="truncate">{info.label}</span>
      {showSublabel && info.sublabel && (
        <span className="text-[10px] opacity-75 font-normal hidden sm:inline">
          • {info.sublabel}
        </span>
      )}
    </span>
  )
}
export type { OrigemClienteTipo, OrigemClienteInfo }

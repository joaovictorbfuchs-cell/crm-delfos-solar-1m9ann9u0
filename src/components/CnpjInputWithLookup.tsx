import React from 'react'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  Info,
  RotateCw,
} from 'lucide-react'
import { CnpjLookupStatus } from '@/services/cnpjLookupService'
import { formatarCNPJ } from '@/lib/orcamentoParser'

export interface CnpjConflictField {
  campo: string
  label: string
  valorAtual: string
  valorReceita: string
}

interface CnpjInputWithLookupProps {
  value: string
  onChange: (value: string) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  onLookupClick?: () => void
  status: CnpjLookupStatus
  errorMessage?: string | null
  isLoading?: boolean
  disabled?: boolean
  className?: string
  id?: string
  placeholder?: string
  label?: string
  required?: boolean
  helperText?: string
  origemApi?: 'brasilapi' | 'publicacnpj'
}

export const CnpjInputWithLookup: React.FC<CnpjInputWithLookupProps> = ({
  value,
  onChange,
  onBlur,
  onLookupClick,
  status,
  errorMessage,
  isLoading = false,
  disabled = false,
  className = '',
  id = 'cnpj-input',
  placeholder = '00.000.000/0000-00',
  label = 'CNPJ',
  required = false,
  helperText,
  origemApi,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const formatted = formatarCNPJ(raw)
    onChange(formatted)
  }

  const rawDigits = (value || '').replace(/\D/g, '')
  const isComplete = rawDigits.length === 14

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="font-semibold text-gray-700 text-xs block">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          {isComplete && !isLoading && status !== 'success' && onLookupClick && (
            <button
              type="button"
              onClick={onLookupClick}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 transition-colors"
            >
              <RotateCw className="w-3 h-3" />
              <span>Consultar Receita</span>
            </button>
          )}
        </div>
      )}

      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          maxLength={18}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className={`w-full px-3 py-2 text-xs font-mono rounded-lg border transition-all pr-9 ${
            status === 'error' || (errorMessage && status !== 'loading')
              ? 'border-red-400 bg-red-50/20 focus:ring-red-400'
              : status === 'success'
                ? 'border-emerald-400 bg-emerald-50/20 focus:ring-emerald-500'
                : 'border-gray-300 focus:ring-emerald-500'
          } focus:outline-none focus:ring-2 ${className}`}
        />

        {/* Ícone de status à direita */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
          ) : status === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : status === 'not_found' || status === 'error' ? (
            <AlertCircle className="w-4 h-4 text-amber-500" />
          ) : (
            <Building2 className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Badges e avisos de status */}
      {isLoading && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
          <span>Consultando Receita Federal...</span>
        </div>
      )}

      {!isLoading && status === 'success' && (
        <div className="flex items-center justify-between text-[11px] text-emerald-700 bg-emerald-50/90 border border-emerald-200 px-2.5 py-1 rounded-md">
          <span className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            Dados obtidos da Receita Federal
            {origemApi && (
              <span className="text-[10px] text-emerald-600/80 font-normal">
                ({origemApi === 'brasilapi' ? 'BrasilAPI' : 'Publica CNPJ'})
              </span>
            )}
          </span>
          {onLookupClick && (
            <button
              type="button"
              onClick={onLookupClick}
              className="text-[10px] font-bold underline hover:text-emerald-900 ml-2"
            >
              Reconsultar
            </button>
          )}
        </div>
      )}

      {!isLoading && (status === 'not_found' || (status === 'error' && errorMessage)) && (
        <div className="p-2 bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] rounded-md flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>
              {errorMessage ||
                'CNPJ não encontrado na Receita Federal — você pode preencher os dados manualmente.'}
            </span>
          </div>
        </div>
      )}

      {helperText && !errorMessage && status === 'idle' && (
        <p className="text-[11px] text-gray-500 flex items-center gap-1">
          <Info className="w-3 h-3 text-gray-400" />
          {helperText}
        </p>
      )}
    </div>
  )
}

/**
 * Banner de conflito amigável quando a Receita Federal retorna campos diferentes dos já digitados
 */
interface CnpjConflictBannerProps {
  conflitos: CnpjConflictField[]
  onManterMeusDados: () => void
  onUsarDadosReceita: () => void
}

export const CnpjConflictBanner: React.FC<CnpjConflictBannerProps> = ({
  conflitos,
  onManterMeusDados,
  onUsarDadosReceita,
}) => {
  if (!conflitos || conflitos.length === 0) return null

  return (
    <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 animate-in fade-in duration-150">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-bold">
          A Receita Federal retornou dados diferentes dos já preenchidos ({conflitos.length}{' '}
          {conflitos.length === 1 ? 'campo divergente' : 'campos divergentes'}):
        </span>
      </div>

      <div className="bg-white/80 rounded-lg p-2 border border-amber-200 divide-y divide-amber-100 max-h-40 overflow-y-auto">
        {conflitos.map((c) => (
          <div key={c.campo} className="py-1 text-[11px] grid grid-cols-1 sm:grid-cols-3 gap-1">
            <span className="font-semibold text-gray-700">{c.label}:</span>
            <span className="text-gray-500 line-through truncate" title={c.valorAtual}>
              Seu dado: {c.valorAtual || '(vazio)'}
            </span>
            <span
              className="text-emerald-800 font-medium truncate sm:text-right"
              title={c.valorReceita}
            >
              Receita: {c.valorReceita}
            </span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onManterMeusDados}
          className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-semibold text-[11px] transition-colors"
        >
          Manter meus dados
        </button>
        <button
          type="button"
          onClick={onUsarDadosReceita}
          className="px-3 py-1 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          Usar dados da Receita
        </button>
      </div>
    </div>
  )
}

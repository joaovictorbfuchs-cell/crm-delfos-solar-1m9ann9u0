import React, { useState, useEffect, useRef } from 'react'
import { Pencil, Check, X, Loader2 } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

export interface InlineEditFieldProps {
  label?: string
  value: string | number | undefined | null
  displayValue?: React.ReactNode
  type?: 'text' | 'number' | 'date' | 'select'
  options?: SelectOption[]
  placeholder?: string
  unit?: string
  step?: string | number
  min?: number
  max?: number
  onSave: (val: string | number) => Promise<void>
  className?: string
  inputClassName?: string
  badgeMode?: boolean
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  displayValue,
  type = 'text',
  options,
  placeholder = 'Não informado',
  unit,
  step,
  min,
  max,
  onSave,
  className = '',
  inputClassName = '',
  badgeMode = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [currentVal, setCurrentVal] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  // Sincroniza o valor atual quando entra em modo de edição ou o valor externo muda
  useEffect(() => {
    if (!isEditing) {
      if (value === undefined || value === null) {
        setCurrentVal('')
      } else if (type === 'date' && typeof value === 'string') {
        // Se a data vier como ISO (ex: 2024-03-15T00:00:00.000Z), extrair apenas YYYY-MM-DD para o input[type="date"]
        const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/)
        setCurrentVal(dateMatch ? dateMatch[0] : value)
      } else {
        setCurrentVal(String(value))
      }
      setError(null)
    }
  }, [value, isEditing, type])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement && type !== 'date') {
        inputRef.current.select()
      }
    }
  }, [isEditing, type])

  const handleStartEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    setError(null)
  }

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (value === undefined || value === null) {
      setCurrentVal('')
    } else if (type === 'date' && typeof value === 'string') {
      const dateMatch = value.match(/^\d{4}-\d{2}-\d{2}/)
      setCurrentVal(dateMatch ? dateMatch[0] : value)
    } else {
      setCurrentVal(String(value))
    }
    setError(null)
    setIsEditing(false)
  }

  const handleSave = async (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (isSaving) return

    let finalValue: string | number = currentVal.trim()

    if (type === 'number') {
      if (finalValue === '') {
        finalValue = 0
      } else {
        const num = Number(finalValue)
        if (isNaN(num)) {
          setError('Número inválido')
          return
        }
        if (min !== undefined && num < min) {
          setError(`Mínimo: ${min}`)
          return
        }
        if (max !== undefined && num > max) {
          setError(`Máximo: ${max}`)
          return
        }
        finalValue = num
      }
    }

    try {
      setIsSaving(true)
      setError(null)
      await onSave(finalValue)
      setIsEditing(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar campo inline:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  if (isEditing) {
    return (
      <div
        className={`inline-flex flex-col gap-1 z-10 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center gap-1.5 flex-wrap">
          {type === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={currentVal}
              disabled={isSaving}
              onChange={(e) => setCurrentVal(e.target.value)}
              onKeyDown={handleKeyDown}
              className={`text-xs py-1 px-2 border rounded-md bg-white text-gray-900 border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs ${inputClassName}`}
            >
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="relative inline-flex items-center">
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={type}
                step={step}
                min={min}
                max={max}
                value={currentVal}
                disabled={isSaving}
                placeholder={placeholder}
                onChange={(e) => setCurrentVal(e.target.value)}
                onKeyDown={handleKeyDown}
                className={`text-xs py-1 px-2 border rounded-md bg-white text-gray-900 border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-xs ${
                  unit ? 'pr-7' : ''
                } ${inputClassName}`}
              />
              {unit && (
                <span className="absolute right-2 text-[10px] text-gray-400 font-medium pointer-events-none">
                  {unit}
                </span>
              )}
            </div>
          )}

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
              title="Confirmar (Enter)"
              aria-label="Confirmar alteração"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50"
              title="Cancelar (Esc)"
              aria-label="Cancelar alteração"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && <span className="text-[11px] text-red-500 font-medium">{error}</span>}
      </div>
    )
  }

  const renderContent = () => {
    if (displayValue !== undefined && displayValue !== null) {
      return displayValue
    }
    if (value === undefined || value === null || value === '') {
      return <span className="text-gray-400 italic">{placeholder}</span>
    }
    return <span>{String(value)}</span>
  }

  return (
    <div className={`group/field inline-flex items-center gap-1.5 max-w-full ${className}`}>
      <div className="truncate">{renderContent()}</div>
      <button
        type="button"
        onClick={handleStartEditing}
        className="p-1 rounded text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors opacity-70 group-hover/field:opacity-100 focus:opacity-100 shrink-0"
        title="Editar campo"
        aria-label="Editar campo"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

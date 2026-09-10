import React, { useState, useEffect, useRef, useId } from 'react'
import { Search, X, MapPin, Check, ChevronDown } from 'lucide-react'
import type { Cliente } from '@/types/crm'

interface ClienteAutocompleteProps {
  clientes: Cliente[]
  value: string // clienteId selecionado
  onChange: (clienteId: string, cliente?: Cliente) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: boolean
  id?: string
}

export const ClienteAutocomplete: React.FC<ClienteAutocompleteProps> = ({
  clientes,
  value,
  onChange,
  placeholder = 'Buscar cliente por nome...',
  required = false,
  disabled = false,
  error = false,
  id,
}) => {
  const generatedId = useId()
  const inputId = id || generatedId

  // Cliente atualmente selecionado
  const selectedCliente = clientes.find((c) => c.id === value)

  // Estado do texto de busca
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Sincroniza o valor de exibição quando o cliente selecionado mudar externamente
  useEffect(() => {
    if (selectedCliente) {
      setSearchTerm(selectedCliente.nome)
    } else if (!value) {
      setSearchTerm('')
    }
  }, [selectedCliente, value])

  // Filtragem dos clientes (case-insensitive por nome)
  const filteredClientes = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return clientes

    // Se o termo digitado for idêntico ao nome do cliente já selecionado, mostra lista completa para facilitar troca
    if (selectedCliente && selectedCliente.nome.toLowerCase() === term) {
      return clientes
    }

    return clientes.filter((c) => c.nome.toLowerCase().includes(term))
  }, [clientes, searchTerm, selectedCliente])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        // Se fechou sem selecionar e o que está digitado não corresponde ao selecionado, restaura ou limpa
        if (selectedCliente) {
          setSearchTerm(selectedCliente.nome)
        } else {
          setSearchTerm('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedCliente])

  // Ajusta scroll do item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex])

  const handleSelectCliente = (cliente: Cliente) => {
    setSearchTerm(cliente.nome)
    onChange(cliente.id, cliente)
    setIsOpen(false)
    setHighlightedIndex(-1)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchTerm('')
    onChange('', undefined)
    setIsOpen(true)
    setHighlightedIndex(-1)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setSearchTerm(text)
    setIsOpen(true)
    setHighlightedIndex(0)

    // Se o usuário apagou o texto ou alterou em relação ao selecionado, desvincula a seleção
    if (value && (!text || text !== selectedCliente?.nome)) {
      onChange('', undefined)
    }
  }

  const handleInputFocus = () => {
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setHighlightedIndex(0)
      } else if (filteredClientes.length > 0) {
        setHighlightedIndex((prev) => (prev < filteredClientes.length - 1 ? prev + 1 : 0))
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setHighlightedIndex(filteredClientes.length - 1)
      } else if (filteredClientes.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredClientes.length - 1))
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredClientes[highlightedIndex]) {
        e.preventDefault()
        handleSelectCliente(filteredClientes[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      if (selectedCliente) {
        setSearchTerm(selectedCliente.nome)
      } else {
        setSearchTerm('')
      }
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Campo de input com autocomplete */}
      <div className="relative flex items-center">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          required={required && !value}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className={`w-full text-xs pl-8 pr-16 py-2.5 rounded-xl border font-medium transition-all ${
            error
              ? 'border-red-300 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
              : 'border-gray-200 bg-gray-50 focus:bg-white text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
          } focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed`}
        />

        {/* Botões à direita (Limpar + Indicador) */}
        <div className="absolute right-2.5 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
              title="Limpar seleção"
              aria-label="Limpar cliente selecionado"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            onClick={() => {
              if (!disabled) {
                setIsOpen((prev) => !prev)
                inputRef.current?.focus()
              }
            }}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Abrir opções de clientes"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown de sugestões */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          {filteredClientes.length === 0 ? (
            <div className="p-3 text-center text-xs text-gray-500">Nenhum cliente encontrado</div>
          ) : (
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-56 overflow-y-auto py-1 divide-y divide-gray-50"
            >
              {filteredClientes.map((cliente, idx) => {
                const isSelected = cliente.id === value
                const isHighlighted = idx === highlightedIndex

                return (
                  <li
                    key={cliente.id}
                    role="option"
                    aria-selected={isSelected}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => {
                      // Usar onMouseDown para evitar que o onBlur do input feche antes do click disparar
                      e.preventDefault()
                      handleSelectCliente(cliente)
                    }}
                    className={`px-3 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                      isHighlighted
                        ? 'bg-emerald-50/80 text-emerald-950'
                        : isSelected
                          ? 'bg-emerald-50/40 text-gray-900'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-semibold truncate flex items-center gap-1.5">
                        <span className={isSelected ? 'text-emerald-800' : 'text-gray-900'}>
                          {cliente.nome}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate">{cliente.cidade || 'Cidade não informada'}</span>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1" />}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

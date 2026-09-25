import React, { useState, useEffect, useRef, useId, useMemo } from 'react'
import { Search, X, MapPin, Check, ChevronDown } from 'lucide-react'
import type { Cliente } from '@/types/crm'

/**
 * Utilitário para destacar trechos de texto que batem com a busca,
 * garantindo contraste alto, texto legível e suporte a acentos no português.
 */
export function HighlightMatch({
  text,
  query,
  className = '',
}: {
  text: string
  query?: string
  className?: string
}) {
  if (!query || !query.trim() || !text) {
    return <span>{text}</span>
  }

  const trimmed = query.trim()
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const textNorm = normalize(text)
  const queryNorm = normalize(trimmed)

  if (!queryNorm || !textNorm.includes(queryNorm)) {
    return <span>{text}</span>
  }

  const segments: React.ReactNode[] = []
  let lastIdx = 0
  let matchIdx = textNorm.indexOf(queryNorm, lastIdx)

  while (matchIdx !== -1) {
    if (matchIdx > lastIdx) {
      segments.push(<span key={`text-${lastIdx}`}>{text.slice(lastIdx, matchIdx)}</span>)
    }
    const endIdx = matchIdx + queryNorm.length
    const matchedOriginalText = text.slice(matchIdx, endIdx)
    segments.push(
      <mark
        key={`match-${matchIdx}`}
        className={`bg-emerald-100 text-emerald-950 font-bold px-0.5 rounded-xs ${className}`}
        style={{
          backgroundColor: '#d1fae5',
          color: '#064e3b',
          fontWeight: 700,
        }}
      >
        {matchedOriginalText}
      </mark>,
    )
    lastIdx = endIdx
    matchIdx = textNorm.indexOf(queryNorm, lastIdx)
  }

  if (lastIdx < text.length) {
    segments.push(<span key={`text-${lastIdx}`}>{text.slice(lastIdx)}</span>)
  }

  return <span>{segments}</span>
}

export interface ClienteAutocompleteProps {
  clientes: Cliente[]
  value: string // clienteId selecionado
  onChange: (clienteId: string, cliente?: Cliente) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: boolean
  id?: string
  className?: string
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
  className = '',
}) => {
  const generatedId = useId()
  const inputId = id || generatedId

  // Cliente atualmente selecionado
  const selectedCliente = useMemo(() => clientes.find((c) => c.id === value), [clientes, value])

  // Estado do texto de busca
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const lastSyncedValueRef = useRef<string>(value)

  // Sincroniza o valor de exibição quando o cliente selecionado mudar externamente
  useEffect(() => {
    if (selectedCliente) {
      lastSyncedValueRef.current = selectedCliente.id
      setSearchTerm(selectedCliente.nome)
    } else if (!value) {
      lastSyncedValueRef.current = ''
      // Só limpa se o usuário não estiver com o campo em foco digitando ativamente
      if (document.activeElement !== inputRef.current) {
        setSearchTerm('')
      }
    }
  }, [selectedCliente, value])

  // Normalizador de texto para busca case-insensitive e acentos
  const normalize = (str?: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  // Filtragem e ordenação inteligente dos clientes
  const filteredClientes = useMemo(() => {
    const rawTerm = searchTerm.trim()
    const normTerm = normalize(rawTerm)
    if (!normTerm) return clientes

    // Se o termo digitado for idêntico ao nome do cliente já selecionado, mostra lista completa para facilitar troca
    if (selectedCliente && normalize(selectedCliente.nome) === normTerm) {
      return clientes
    }

    const matches: Array<{ cliente: Cliente; score: number }> = []

    for (const c of clientes) {
      const nomeNorm = normalize(c.nome)
      const fantasiaNorm = normalize(c.nome_fantasia)
      const razaoNorm = normalize(c.razao_social)
      const cidadeNorm = normalize(c.cidade)
      const docNorm = normalize(`${c.cpf || ''} ${c.cnpj || ''}`)

      let score = -1

      if (nomeNorm.startsWith(normTerm)) {
        score = 100 // Melhor match: nome começa com o termo
      } else if (
        nomeNorm.includes(` ${normTerm}`) ||
        nomeNorm.includes(`(${normTerm}`) ||
        nomeNorm.includes(`-${normTerm}`)
      ) {
        score = 80 // Alguma palavra do nome começa com o termo
      } else if (nomeNorm.includes(normTerm)) {
        score = 60 // Contém o termo no meio de uma palavra
      } else if (fantasiaNorm.startsWith(normTerm) || razaoNorm.startsWith(normTerm)) {
        score = 50
      } else if (fantasiaNorm.includes(normTerm) || razaoNorm.includes(normTerm)) {
        score = 40
      } else if (cidadeNorm.startsWith(normTerm)) {
        score = 30
      } else if (cidadeNorm.includes(normTerm)) {
        score = 20
      } else if (docNorm.includes(normTerm)) {
        score = 10
      }

      if (score >= 0) {
        matches.push({ cliente: c, score })
      }
    }

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR')
    })

    return matches.map((m) => m.cliente)
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
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? 'z-50' : 'z-auto'} ${className}`}
    >
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
          aria-controls={`${inputId}-listbox`}
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
        <div
          id={`${inputId}-listbox`}
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 min-w-full"
          style={{ minWidth: '100%' }}
        >
          {filteredClientes.length === 0 ? (
            <div className="p-3.5 text-center text-xs text-gray-500">
              Nenhum cliente encontrado para "{searchTerm}"
            </div>
          ) : (
            <>
              {/* Cabeçalho informativo com total de resultados */}
              <div className="px-3 py-1.5 bg-gray-50/90 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                <span>
                  {filteredClientes.length}{' '}
                  {filteredClientes.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
                </span>
                <span className="text-[10px] text-gray-400 hidden sm:inline">
                  Navegue com ↑↓ e Enter
                </span>
              </div>

              <ul
                ref={listRef}
                role="listbox"
                className="max-h-60 sm:max-h-72 overflow-y-auto py-1 divide-y divide-gray-50"
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
                      className={`px-3 py-2.5 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-50 text-emerald-950 font-medium'
                          : isSelected
                            ? 'bg-emerald-50/40 text-gray-900'
                            : 'text-gray-700 hover:bg-gray-50/90'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        {/* Nome do cliente com destaque da busca, sem corte de texto */}
                        <div className="font-semibold text-xs leading-snug flex items-center gap-1.5 flex-wrap">
                          <span
                            className={isSelected ? 'text-emerald-900 font-bold' : 'text-gray-900'}
                          >
                            <HighlightMatch text={cliente.nome} query={searchTerm} />
                          </span>
                          {cliente.nome_fantasia &&
                            normalize(cliente.nome_fantasia) !== normalize(cliente.nome) && (
                              <span className="text-[10px] font-normal text-gray-500">
                                (<HighlightMatch text={cliente.nome_fantasia} query={searchTerm} />)
                              </span>
                            )}
                        </div>

                        {/* Detalhes: Cidade, documento e contato */}
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-0.5 text-gray-600">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <HighlightMatch
                              text={cliente.cidade || 'Cidade não informada'}
                              query={searchTerm}
                            />
                          </span>

                          {(cliente.cpf || cliente.cnpj) && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-400 text-[10px]">
                                {cliente.cnpj ? `CNPJ: ${cliente.cnpj}` : `CPF: ${cliente.cpf}`}
                              </span>
                            </>
                          )}

                          {(cliente.telefone || cliente.whatsapp) && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-gray-500 text-[10px]">
                                {cliente.whatsapp || cliente.telefone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="shrink-0 ml-1.5 p-1 rounded-full bg-emerald-100 text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}

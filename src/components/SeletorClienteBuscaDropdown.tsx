import React, { useState, useEffect, useRef, useId, useMemo, useCallback } from 'react'
import {
  Search,
  X,
  Users,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Check,
  ChevronDown,
  CornerDownLeft,
  Plus,
} from 'lucide-react'
import type { Cliente } from '@/types/crm'

export interface SeletorClienteBuscaDropdownProps {
  clientes: Cliente[]
  value: string // clienteId selecionado
  onChange: (clienteId: string, cliente?: Cliente) => void
  onNovoClienteClick?: () => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: boolean
  id?: string
  className?: string
}

/**
 * Utilitário de highlight com suporte a multi-token e acentuação em pt-BR,
 * idêntico ao padrão da Barra de Busca Global do topo da aplicação.
 */
function HighlightMatch({ text, query }: { text?: string | null | number; query?: string | null }) {
  const safeText = text != null ? String(text) : ''
  const safeQuery = query != null ? String(query) : ''

  if (!safeText) return null
  const trimmed = safeQuery.trim()
  if (!trimmed) return <span>{safeText}</span>

  const normalizeToken = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  const tokens = Array.from(
    new Set(
      trimmed
        .split(/\s+/)
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  )

  const searchPatterns = [trimmed, ...tokens].sort((a, b) => b.length - a.length)
  const escapedPatterns = searchPatterns
    .filter((pat, idx, self) => pat.length > 0 && self.indexOf(pat) === idx)
    .map((pat) => pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (escapedPatterns.length === 0) return <span>{safeText}</span>

  const normalizedTokensSet = new Set(tokens.map((t) => normalizeToken(t)).filter(Boolean))
  const normalizedTrimmed = normalizeToken(trimmed)

  const regex = new RegExp(`(${escapedPatterns.join('|')})`, 'gi')
  const parts = safeText.split(regex)

  return (
    <span>
      {parts.map((part, i) => {
        if (!part) return null
        const partNorm = normalizeToken(part)
        const isMatch =
          part.toLowerCase() === trimmed.toLowerCase() ||
          partNorm === normalizedTrimmed ||
          normalizedTokensSet.has(partNorm) ||
          tokens.some((t) => normalizeToken(t) === partNorm)

        return isMatch ? (
          <mark key={i} className="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      })}
    </span>
  )
}

/**
 * Componente de busca e seleção de clientes no padrão visual e comportamental
 * da Barra de Busca Global do cabeçalho da página inicial.
 * Permite buscar por nome, razão social, nome fantasia, CPF/CNPJ, cidade, telefone, email.
 * Possui opção de atalho "+ Cadastrar novo cliente" inline.
 */
export const SeletorClienteBuscaDropdown: React.FC<SeletorClienteBuscaDropdownProps> = ({
  clientes,
  value,
  onChange,
  onNovoClienteClick,
  placeholder = 'Buscar cliente por nome, documento, cidade, telefone...',
  required = false,
  disabled = false,
  error = false,
  id,
  className = '',
}) => {
  const generatedId = useId()
  const inputId = id || generatedId

  const selectedCliente = useMemo(() => clientes.find((c) => c.id === value), [clientes, value])

  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Sincroniza o valor de exibição quando o cliente selecionado mudar externamente
  useEffect(() => {
    if (selectedCliente) {
      setSearchTerm(selectedCliente.razao_social || selectedCliente.nome || '')
    } else if (!value) {
      if (document.activeElement !== inputRef.current) {
        setSearchTerm('')
      }
    }
  }, [selectedCliente, value])

  const normalize = (str?: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()

  const trimmedQuery = searchTerm.trim()
  const normalizedQuery = normalize(trimmedQuery)

  const queryTokens = useMemo(() => {
    return normalizedQuery.split(/\s+/).filter(Boolean)
  }, [normalizedQuery])

  const matchMultiToken = useCallback(
    (campos: (string | undefined | null | number)[]): boolean => {
      if (queryTokens.length === 0) return true

      const normalizados = campos
        .map((c) => (c !== undefined && c !== null ? normalize(String(c)) : ''))
        .filter(Boolean)

      if (normalizados.length === 0) return false

      // 1. Substring contígua direta
      const hasContiguousMatch = normalizados.some((campo) => campo.includes(normalizedQuery))
      if (hasContiguousMatch) return true

      // 2. Multi-token
      const consolidated = normalizados.join(' ')
      return queryTokens.every((token) => consolidated.includes(token))
    },
    [normalizedQuery, queryTokens],
  )

  // Filtragem e pontuação de relevância
  const filteredClientes = useMemo(() => {
    if (!trimmedQuery) {
      return clientes.slice(0, 30)
    }

    // Se o termo digitado for exatamente o nome do cliente já selecionado, exibe os clientes
    if (
      selectedCliente &&
      (normalize(selectedCliente.nome) === normalizedQuery ||
        normalize(selectedCliente.razao_social) === normalizedQuery)
    ) {
      return clientes.slice(0, 30)
    }

    const matches: Array<{ cliente: Cliente; score: number }> = []

    for (const c of clientes) {
      const match = matchMultiToken([
        c.nome,
        c.nome_fantasia,
        c.razao_social,
        c.cidade,
        c.estado,
        c.email,
        c.telefone,
        c.whatsapp,
        c.cnpj,
        c.cpf,
      ])

      if (match) {
        const nomeNorm = normalize(c.nome)
        const razaoNorm = normalize(c.razao_social)
        let score = 10

        if (nomeNorm.startsWith(normalizedQuery) || razaoNorm.startsWith(normalizedQuery)) {
          score = 100
        } else if (
          nomeNorm.includes(` ${normalizedQuery}`) ||
          razaoNorm.includes(` ${normalizedQuery}`)
        ) {
          score = 80
        } else if (nomeNorm.includes(normalizedQuery) || razaoNorm.includes(normalizedQuery)) {
          score = 60
        }

        matches.push({ cliente: c, score })
      }
    }

    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const nomeA = a.cliente.razao_social || a.cliente.nome || ''
      const nomeB = b.cliente.razao_social || b.cliente.nome || ''
      return nomeA.localeCompare(nomeB, 'pt-BR')
    })

    return matches.map((m) => m.cliente).slice(0, 40)
  }, [clientes, trimmedQuery, normalizedQuery, matchMultiToken, selectedCliente])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        if (selectedCliente) {
          setSearchTerm(selectedCliente.razao_social || selectedCliente.nome || '')
        } else {
          setSearchTerm('')
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedCliente])

  const handleSelectCliente = (cliente: Cliente) => {
    setSearchTerm(cliente.razao_social || cliente.nome || '')
    onChange(cliente.id, cliente)
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSearchTerm('')
    onChange('', undefined)
    setIsOpen(true)
    setSelectedIndex(0)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setSearchTerm(text)
    setIsOpen(true)
    setSelectedIndex(0)

    const nomeSel = selectedCliente?.razao_social || selectedCliente?.nome || ''
    if (value && (!text || text !== nomeSel)) {
      onChange('', undefined)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setSelectedIndex(0)
      } else if (filteredClientes.length > 0) {
        setSelectedIndex((prev) => (prev < filteredClientes.length - 1 ? prev + 1 : 0))
        scrollActiveIntoView(selectedIndex < filteredClientes.length - 1 ? selectedIndex + 1 : 0)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setSelectedIndex(filteredClientes.length - 1)
      } else if (filteredClientes.length > 0) {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredClientes.length - 1))
        scrollActiveIntoView(selectedIndex > 0 ? selectedIndex - 1 : filteredClientes.length - 1)
      }
    } else if (e.key === 'Enter') {
      if (isOpen && selectedIndex >= 0 && filteredClientes[selectedIndex]) {
        e.preventDefault()
        handleSelectCliente(filteredClientes[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      if (selectedCliente) {
        setSearchTerm(selectedCliente.razao_social || selectedCliente.nome || '')
      } else {
        setSearchTerm('')
      }
      inputRef.current?.blur()
    }
  }

  const scrollActiveIntoView = (index: number) => {
    if (!listRef.current) return
    const items = listRef.current.querySelectorAll('[data-client-item]')
    const target = items[index] as HTMLElement | undefined
    if (target) {
      target.scrollIntoView({ block: 'nearest' })
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${isOpen ? 'z-50' : 'z-auto'} ${className}`}
    >
      {/* Input de Busca Estilo Barra Global */}
      <div className="relative flex items-center w-full">
        <div className="absolute left-3 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4 text-emerald-600" />
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          required={required && !value}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          className={`w-full text-xs pl-9 pr-20 py-2.5 rounded-xl border font-medium transition-all outline-hidden ${
            error
              ? 'border-red-300 bg-red-50/40 text-red-900 focus:ring-2 focus:ring-red-400'
              : 'border-gray-200 bg-white hover:bg-gray-50/80 focus:bg-white text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs'
          } disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-gray-400`}
        />

        {/* Ações à direita */}
        <div className="absolute right-2 flex items-center gap-1">
          {searchTerm && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
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
            aria-label="Alternar dropdown de clientes"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Estilo BarraBuscaGlobal */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-gray-200/90 overflow-hidden z-50 flex flex-col animate-in fade-in-0 zoom-in-95 duration-150 max-h-[380px]"
        >
          {/* Cabeçalho do Dropdown com total de resultados + Ação Inline de Cadastrar */}
          <div className="px-3.5 py-2 bg-gray-50/90 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-700">
                {filteredClientes.length} cliente{filteredClientes.length === 1 ? '' : 's'}
              </span>
              {trimmedQuery && (
                <span className="text-[11px] truncate max-w-[140px] sm:max-w-xs">
                  para &ldquo;{trimmedQuery}&rdquo;
                </span>
              )}
            </div>

            {onNovoClienteClick && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsOpen(false)
                  onNovoClienteClick()
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer"
                title="Cadastrar novo cliente agora"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Cadastrar novo cliente</span>
              </button>
            )}
          </div>

          {/* Lista de Resultados com Scroll */}
          <div className="overflow-y-auto p-1.5 space-y-1 divide-y divide-gray-50">
            {filteredClientes.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-xs font-bold text-gray-800">
                  Nenhum cliente encontrado para &ldquo;{trimmedQuery}&rdquo;
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5 max-w-xs mx-auto">
                  Deseja cadastrar este cliente agora mesmo sem sair do fluxo?
                </p>
                {onNovoClienteClick && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setIsOpen(false)
                      onNovoClienteClick()
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar &ldquo;{trimmedQuery}&rdquo; agora</span>
                  </button>
                )}
              </div>
            ) : (
              filteredClientes.map((c, idx) => {
                const isSelected = c.id === value
                const isHighlighted = idx === selectedIndex
                const nomeExibicao = c.razao_social || c.nome || 'Cliente sem nome'
                const documento = c.cnpj || c.cpf
                const contato = c.whatsapp || c.telefone

                const detalhes: string[] = []
                if (c.cidade) detalhes.push(`${c.cidade}/${c.estado || 'RS'}`)
                if (documento) detalhes.push(documento)
                if (contato) detalhes.push(contato)
                if (c.email) detalhes.push(c.email)

                return (
                  <button
                    key={c.id}
                    type="button"
                    data-client-item
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      handleSelectCliente(c)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                      isHighlighted
                        ? 'bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-500/30'
                        : isSelected
                          ? 'bg-emerald-50/50 text-gray-900 font-semibold'
                          : 'hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isHighlighted
                            ? 'bg-emerald-600 text-white'
                            : isSelected
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                        }`}
                      >
                        {c.tipo_pessoa === 'juridica' || c.cnpj ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <HighlightMatch text={nomeExibicao} query={trimmedQuery} />
                          {c.cidade && (
                            <span className="inline-flex text-[10px] font-bold px-1.5 py-0.2 rounded-md border shrink-0 bg-gray-100 text-gray-700 border-gray-200">
                              {c.cidade}
                            </span>
                          )}
                        </div>
                        {detalhes.length > 0 && (
                          <p className="text-[11px] text-gray-500 truncate mt-0.5">
                            <HighlightMatch text={detalhes.join(' • ')} query={trimmedQuery} />
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                      {isHighlighted && !isSelected && (
                        <span className="text-[11px] font-medium text-emerald-700 hidden sm:flex items-center gap-0.5">
                          Selecionar <CornerDownLeft className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Rodapé informativo */}
          <div className="p-2 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 px-3.5 shrink-0">
            <span className="hidden sm:inline">
              Use <kbd className="px-1 py-0.2 bg-white border rounded text-[10px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.2 bg-white border rounded text-[10px]">↓</kbd> e{' '}
              <kbd className="px-1.5 py-0.2 bg-white border rounded text-[10px]">Enter</kbd>
            </span>
            {onNovoClienteClick && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  setIsOpen(false)
                  onNovoClienteClick()
                }}
                className="text-emerald-700 font-bold hover:underline cursor-pointer ml-auto"
              >
                + Não encontrou? Cadastre aqui
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SeletorClienteBuscaDropdown

import React, { useState, useMemo } from 'react'
import { Filter, Search, Check, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ModuloFiltro, QuickFilterDef } from '@/types/filtros'
import { extrairValorCampo } from '@/lib/filtrosEngine'
import { criarQuickFilterColuna } from '@/lib/quickFiltersCatalogo'

export interface ColunaQuickFilterProps {
  /** Rótulo legível exibido no cabeçalho */
  titulo: React.ReactNode
  /** Id do campo canônico correspondente no catálogo de filtros (ex: 'status', 'tipo', 'cidade') */
  campoId: string
  /** Nome legível do campo para o chip (ex: 'Status', 'Cidade') */
  campoLabel: string
  /** Módulo do filtro salvo correspondente */
  modulo: ModuloFiltro
  /** Dados brutos ou filtrados da tabela para extrair os valores únicos e suas contagens */
  dados: any[]
  /** Quick filters atualmente ativos na tela */
  activeQuickFilters: QuickFilterDef[]
  /** Callback para alternar/adicionar/remover um quick filter */
  onToggleQuickFilter: (qf: QuickFilterDef) => void
  /** Callback opcional quando um quick filter é criado ou atualizado diretamente */
  onAplicarQuickFilterColuna?: (qf: QuickFilterDef | null) => void
  /** Classes extras para o contêiner <th> ou <div> */
  className?: string
  /** Alinhamento do conteúdo: 'left' | 'center' | 'right' */
  align?: 'left' | 'center' | 'right'
}

interface ValorContagem {
  valor: string
  label: string
  contagem: number
}

export const ColunaQuickFilter: React.FC<ColunaQuickFilterProps> = ({
  titulo,
  campoId,
  campoLabel,
  modulo,
  dados,
  activeQuickFilters,
  onToggleQuickFilter,
  onAplicarQuickFilterColuna,
  className = '',
  align = 'left',
}) => {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')

  const idQuickFilterColuna = `qf_col_${modulo}_${campoId}`

  // Verificar se há quick filter desta coluna ativo
  const quickFilterAtivo = useMemo(() => {
    return activeQuickFilters.find((q) => q.id === idQuickFilterColuna) || null
  }, [activeQuickFilters, idQuickFilterColuna])

  // Valores selecionados atualmente
  const valoresSelecionados = useMemo<string[]>(() => {
    if (!quickFilterAtivo?.condicoes?.all) return []
    const cond = quickFilterAtivo.condicoes.all.find((c) => c.campoId === campoId)
    if (!cond) return []
    if (Array.isArray(cond.valor)) {
      return cond.valor.map(String)
    }
    if (cond.valor !== undefined && cond.valor !== '') {
      return [String(cond.valor)]
    }
    return []
  }, [quickFilterAtivo, campoId])

  // Extrair valores únicos com contagem (máximo 20 visíveis após busca)
  const listaValores = useMemo<ValorContagem[]>(() => {
    if (!dados || dados.length === 0) return []

    const contagens = new Map<string, { label: string; contagem: number }>()

    for (const item of dados) {
      const v = extrairValorCampo(item, campoId, modulo)
      if (v === undefined || v === null) continue

      let strVal = ''
      let strLabel = ''

      if (typeof v === 'boolean') {
        strVal = v ? 'true' : 'false'
        strLabel = v ? 'Sim' : 'Não'
      } else if (typeof v === 'number') {
        strVal = String(v)
        strLabel = String(v)
      } else if (typeof v === 'string') {
        const trimmed = v.trim()
        if (!trimmed) continue
        strVal = trimmed
        strLabel = trimmed
      } else {
        strVal = String(v)
        strLabel = strVal
      }

      const chave = strVal.toLowerCase()
      const anterior = contagens.get(chave)
      if (anterior) {
        anterior.contagem += 1
      } else {
        contagens.set(chave, { label: strLabel, contagem: 1 })
      }
    }

    const resultado: ValorContagem[] = []
    for (const [chave, dadosContagem] of contagens.entries()) {
      resultado.push({
        valor: chave,
        label: dadosContagem.label,
        contagem: dadosContagem.contagem,
      })
    }

    // Ordenar por contagem decrescente
    resultado.sort((a, b) => b.contagem - a.contagem)
    return resultado
  }, [dados, campoId, modulo])

  // Filtrar valores pela busca e limitar a 20
  const valoresExibidos = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const filtrados = termo
      ? listaValores.filter(
          (item) =>
            item.label.toLowerCase().includes(termo) || item.valor.toLowerCase().includes(termo),
        )
      : listaValores

    return filtrados.slice(0, 20)
  }, [listaValores, busca])

  const handleToggleValor = (val: string) => {
    const jaSelecionado = valoresSelecionados.includes(val)
    const novos = jaSelecionado
      ? valoresSelecionados.filter((v) => v !== val)
      : [...valoresSelecionados, val]

    if (novos.length === 0) {
      if (quickFilterAtivo) {
        onToggleQuickFilter(quickFilterAtivo)
      }
      if (onAplicarQuickFilterColuna) {
        onAplicarQuickFilterColuna(null)
      }
      return
    }

    const novoQF = criarQuickFilterColuna(modulo, campoId, campoLabel, novos)
    if (novoQF) {
      if (onAplicarQuickFilterColuna) {
        onAplicarQuickFilterColuna(novoQF)
      } else {
        // Se já existe substitui, senão adiciona
        if (quickFilterAtivo) {
          onToggleQuickFilter(quickFilterAtivo)
        }
        onToggleQuickFilter(novoQF)
      }
    }
  }

  const handleLimparFiltroColuna = () => {
    if (quickFilterAtivo) {
      onToggleQuickFilter(quickFilterAtivo)
    }
    if (onAplicarQuickFilterColuna) {
      onAplicarQuickFilterColuna(null)
    }
  }

  const isAtivo = Boolean(quickFilterAtivo && valoresSelecionados.length > 0)

  return (
    <div
      className={`group/col inline-flex items-center gap-1 cursor-default select-none ${
        align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
      } ${className}`}
    >
      <span className="truncate">{titulo}</span>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
            }}
            className={`p-1 rounded-md transition-all cursor-pointer inline-flex items-center justify-center shrink-0 ${
              isAtivo
                ? 'bg-sky-100 text-sky-700 opacity-100 ring-1 ring-sky-300'
                : 'text-slate-400 opacity-0 group-hover/col:opacity-100 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={
              isAtivo
                ? `Filtro ativo em "${campoLabel}": ${valoresSelecionados.length} selecionado(s)`
                : `Filtrar coluna "${campoLabel}"`
            }
          >
            <Filter className={`w-3.5 h-3.5 ${isAtivo ? 'fill-sky-500' : ''}`} />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align={align === 'right' ? 'end' : 'start'}
          className="w-64 p-2 shadow-lg border-slate-200 z-50 text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5 min-w-0">
                <Filter className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span className="font-bold text-xs truncate text-slate-900">
                  Filtrar {campoLabel}
                </span>
              </div>
              {isAtivo && (
                <button
                  type="button"
                  onClick={handleLimparFiltroColuna}
                  className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Campo de busca rápida no popover */}
            {listaValores.length > 5 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar valor..."
                  className="w-full pl-7 pr-6 py-1 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 bg-slate-50 focus:bg-white"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca('')}
                    className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* Lista de valores únicos ordenados por contagem */}
            <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-thin py-0.5">
              {valoresExibidos.length === 0 ? (
                <p className="text-center py-3 text-slate-400 text-xs italic">
                  Nenhum valor encontrado.
                </p>
              ) : (
                valoresExibidos.map((item) => {
                  const selecionado = valoresSelecionados.includes(item.valor)
                  return (
                    <button
                      key={item.valor}
                      type="button"
                      onClick={() => handleToggleValor(item.valor)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md text-left transition-colors cursor-pointer ${
                        selecionado
                          ? 'bg-sky-50 font-semibold text-sky-900'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-1">
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                            selecionado
                              ? 'bg-sky-600 border-sky-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selecionado && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-1 bg-slate-100 px-1.5 py-0.5 rounded-full">
                        {item.contagem}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {listaValores.length > 20 && !busca && (
              <p className="text-[10px] text-center text-slate-400 border-t border-slate-100 pt-1">
                Mostrando top 20 de {listaValores.length} valores. Use a busca para refinar.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default ColunaQuickFilter

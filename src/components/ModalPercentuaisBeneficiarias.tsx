import React, { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, History, ArrowUp, ArrowDown, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Credencial, Beneficiaria } from '@/pages/IntegracoesRge'

export interface ItemBeneficiariaForm {
  id?: string
  uc: string
  rotulo?: string
  percentual: number
  cliente_id?: string
  usina_id?: string
}

export interface VersaoBeneficiarias {
  id: string
  numero: number
  vigencia_inicio?: string
  vigencia_fim?: string
  tipo?: string
  total_distribuido?: number
  resumo?: Array<{ uc: string; rotulo?: string; percentual: number }>
  created?: string
}

export interface SugestaoUc {
  uc: string
  nome?: string
  endereco?: string
  usina_id?: string
  cliente_id?: string
}

interface ModalPercentuaisBeneficiariasProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  cred: Credencial | null
  nomeGeradora: string
  beneficiarias: Beneficiaria[]
  historico: VersaoBeneficiarias[]
  sugestoes: SugestaoUc[]
  salvando: boolean
  onSalvar: (payload: {
    vigencia_inicio: string
    vigencia_fim: string
    itens: ItemBeneficiariaForm[]
  }) => void
}

function formatarData(d?: string): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('pt-BR')
}

function hojeIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function ModalPercentuaisBeneficiarias({
  open,
  onOpenChange,
  cred,
  nomeGeradora,
  beneficiarias,
  historico,
  sugestoes,
  salvando,
  onSalvar,
}: ModalPercentuaisBeneficiariasProps) {
  const [itens, setItens] = useState<ItemBeneficiariaForm[]>([])
  const [modo, setModo] = useState<'percentual' | 'prioridade'>('percentual')
  const [vigInicio, setVigInicio] = useState('')
  const [vigFim, setVigFim] = useState('')
  const [novaUc, setNovaUc] = useState('')
  const [novoRotulo, setNovoRotulo] = useState('')
  const [mostrarHistorico, setMostrarHistorico] = useState(false)

  // (Re)inicializa o formulário com as beneficiárias atuais da geradora
  useEffect(() => {
    if (!open) return
    const base: ItemBeneficiariaForm[] = (beneficiarias || [])
      .filter((b) => b.ativo !== false)
      .map((b) => ({
        id: b.id,
        uc: b.uc,
        rotulo: b.rotulo || '',
        percentual: typeof b.percentual === 'number' ? b.percentual : 0,
        cliente_id: b.cliente_id || '',
        usina_id: b.usina_id || '',
      }))
    setItens(base)
    setModo('percentual')
    setNovaUc('')
    setNovoRotulo('')
    setVigInicio(hojeIso())
    setVigFim('')
    setMostrarHistorico(false)
  }, [open, cred?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Distribuição automática por prioridade: divide igual entre as beneficiárias
  const redistribuirPorPrioridade = (lista: ItemBeneficiariaForm[]): ItemBeneficiariaForm[] => {
    const n = lista.length
    if (n === 0) return lista
    const bruto = 100 / n
    let acumulado = 0
    return lista.map((it, i) => {
      let p: number
      if (i === n - 1) {
        p = Math.round((100 - acumulado) * 100) / 100
      } else {
        p = Math.round(bruto * 100) / 100
        acumulado += p
      }
      return { ...it, percentual: p }
    })
  }

  const alternarModo = (m: 'percentual' | 'prioridade') => {
    setModo(m)
    if (m === 'prioridade') setItens((prev) => redistribuirPorPrioridade(prev))
  }

  const mover = (idx: number, dir: -1 | 1) => {
    setItens((prev) => {
      const alvo = idx + dir
      if (alvo < 0 || alvo >= prev.length) return prev
      const copia = [...prev]
      const tmp = copia[idx]
      copia[idx] = copia[alvo]
      copia[alvo] = tmp
      return modo === 'prioridade' ? redistribuirPorPrioridade(copia) : copia
    })
  }

  const adicionar = (sug?: SugestaoUc) => {
    const uc = (sug ? sug.uc : novaUc).replace(/\D/g, '')
    if (!uc) return
    if (itens.some((i) => i.uc === uc)) return
    setItens((prev) => {
      const novo: ItemBeneficiariaForm = {
        uc,
        rotulo: sug ? sug.nome || sug.endereco || '' : novoRotulo,
        percentual: 0,
        cliente_id: sug?.cliente_id || cred?.cliente_id || '',
        usina_id: sug?.usina_id || '',
      }
      const lista = [...prev, novo]
      return modo === 'prioridade' ? redistribuirPorPrioridade(lista) : lista
    })
    setNovaUc('')
    setNovoRotulo('')
  }

  const remover = (idx: number) => {
    setItens((prev) => {
      const lista = prev.filter((_, i) => i !== idx)
      return modo === 'prioridade' ? redistribuirPorPrioridade(lista) : lista
    })
  }

  const setPercentual = (idx: number, v: string) => {
    const p = Number(String(v).replace(',', '.'))
    setItens((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, percentual: isNaN(p) ? 0 : Math.max(0, Math.min(100, p)) } : it,
      ),
    )
  }

  const totalDistribuido = useMemo(
    () =>
      Math.round(
        itens.reduce((s, it) => s + (typeof it.percentual === 'number' ? it.percentual : 0), 0) *
          100,
      ) / 100,
    [itens],
  )
  const naoDistribuido = Math.round(Math.max(0, 100 - totalDistribuido) * 100) / 100

  const carregarVersao = (v: VersaoBeneficiarias) => {
    const resumo = Array.isArray(v.resumo) ? v.resumo : []
    setItens(
      resumo.map((r) => ({
        uc: r.uc,
        rotulo: r.rotulo || '',
        percentual: typeof r.percentual === 'number' ? r.percentual : 0,
      })),
    )
    setModo('percentual')
    setVigInicio(v.vigencia_inicio ? v.vigencia_inicio.slice(0, 10) : '')
    setVigFim(v.vigencia_fim ? v.vigencia_fim.slice(0, 10) : '')
    setMostrarHistorico(false)
  }

  const salvar = () => {
    if (!onSalvar) return
    if (!vigInicio) return
    const itensLimpos = itens
      .filter((i) => i.uc)
      .map((i) => ({ ...i, percentual: Number(i.percentual) || 0 }))
    onSalvar({
      vigencia_inicio: vigInicio,
      vigencia_fim: vigFim,
      itens: itensLimpos,
    })
  }

  const sugestoesLivres = useMemo(
    () => sugestoes.filter((s) => s.uc && !itens.some((i) => i.uc === s.uc)),
    [sugestoes, itens],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">
            Percentuais das beneficiárias — {nomeGeradora || `UC ${cred?.uc || ''}`}
          </DialogTitle>
        </DialogHeader>

        {/* Vigência */}
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Vigência — a partir de
            </label>
            <Input
              type="date"
              value={vigInicio}
              onChange={(e) => setVigInicio(e.target.value)}
              className="h-9 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Até
            </label>
            <Input
              type="date"
              value={vigFim}
              onChange={(e) => setVigFim(e.target.value)}
              className="h-9 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Distribuição
            </label>
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => alternarModo('percentual')}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  modo === 'percentual'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Percentual
              </button>
              <button
                type="button"
                onClick={() => alternarModo('prioridade')}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  modo === 'prioridade'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Prioridade
              </button>
            </div>
          </div>
        </div>

        {/* Tabela das beneficiárias */}
        <div className="rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {modo === 'prioridade' && <th className="py-2.5 px-3 w-16">ORDEM</th>}
                <th className="py-2.5 px-3">UNIDADE BENEFICIÁRIA</th>
                <th className="py-2.5 px-3">CÓD. INSTALAÇÃO</th>
                <th className="py-2.5 px-3 w-28 text-center">
                  {modo === 'prioridade' ? 'DISTRIBUIÇÃO' : 'PERCENTUAL (%)'}
                </th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {itens.length === 0 ? (
                <tr>
                  <td
                    colSpan={modo === 'prioridade' ? 5 : 4}
                    className="py-6 text-center text-slate-500"
                  >
                    Nenhuma beneficiária. Adicione uma abaixo.
                  </td>
                </tr>
              ) : (
                itens.map((it, idx) => (
                  <tr key={`${it.uc}-${idx}`} className="hover:bg-slate-50/50">
                    {modo === 'prioridade' && (
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-0.5">
                          <span className="text-xs font-bold text-slate-600 w-4">{idx + 1}º</span>
                          <button
                            type="button"
                            aria-label="Subir prioridade"
                            onClick={() => mover(idx, -1)}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label="Descer prioridade"
                            onClick={() => mover(idx, 1)}
                            className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-slate-700">{it.rotulo || `UC ${it.uc}`}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-slate-600">{it.uc}</td>
                    <td className="py-2 px-3 text-center">
                      {modo === 'percentual' ? (
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          value={String(it.percentual)}
                          onChange={(e) => setPercentual(idx, e.target.value)}
                          className="h-8 w-24 mx-auto text-sm text-center"
                          aria-label={`Percentual da UC ${it.uc}`}
                        />
                      ) : (
                        <span className="font-semibold text-slate-700">
                          {String(it.percentual).replace('.', ',')}%
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <button
                        type="button"
                        aria-label="Remover beneficiária"
                        onClick={() => remover(idx)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Adicionar beneficiária */}
        <div className="rounded-lg border border-dashed border-slate-300 p-3 space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                UC da beneficiária
              </label>
              <Input
                value={novaUc}
                onChange={(e) => setNovaUc(e.target.value)}
                placeholder="Ex.: 1203456789"
                className="h-9 w-44 text-sm font-mono"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                Rótulo (nome / endereço)
              </label>
              <Input
                value={novoRotulo}
                onChange={(e) => setNovoRotulo(e.target.value)}
                placeholder="Ex.: Filial Centro"
                className="h-9 text-sm"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => adicionar()}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!novaUc.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </div>

          {sugestoesLivres.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                Sugestões — UCs já cadastradas deste cliente
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sugestoesLivres.map((s) => (
                  <button
                    key={`${s.uc}-${s.usina_id || ''}`}
                    type="button"
                    onClick={() => adicionar(s)}
                    title={s.endereco || s.nome || s.uc}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {s.nome || s.endereco || `UC ${s.uc}`}
                    <span className="font-mono text-[10px] text-blue-500">{s.uc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé de totais */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-4 py-2.5 text-sm">
          <span className="font-semibold text-slate-700">
            Total distribuído:{' '}
            <span className={totalDistribuido > 100 ? 'text-rose-600' : 'text-emerald-700'}>
              {String(totalDistribuido).replace('.', ',')}%
            </span>
          </span>
          <span className="text-slate-600">
            Percentual não distribuído (fica com a geradora):{' '}
            <span className="font-semibold text-amber-600">
              {String(naoDistribuido).replace('.', ',')}%
            </span>
          </span>
        </div>

        {/* Histórico de vigência */}
        <div>
          <button
            type="button"
            onClick={() => setMostrarHistorico((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors"
          >
            <History className="w-4 h-4" />
            Histórico de vigência ({historico.length})
          </button>
          {mostrarHistorico && (
            <div className="mt-2 rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {historico.length === 0 ? (
                <p className="p-3 text-xs text-slate-500">
                  Nenhuma versão registrada ainda. Cada salvamento cria uma versão nova.
                </p>
              ) : (
                historico.map((v) => (
                  <div key={v.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">v{v.numero}</span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                          {v.tipo === 'inicial' ? 'inicial' : 'alteração'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {formatarData(v.vigencia_inicio)}
                          {v.vigencia_fim ? ` até ${formatarData(v.vigencia_fim)}` : ' em diante'}
                          {' · '}
                          {formatarData(v.created)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 truncate max-w-[420px]">
                        {(v.resumo || [])
                          .map((r) => `${r.uc} ${String(r.percentual).replace('.', ',')}%`)
                          .join(' · ') || 'Sem beneficiárias'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => carregarVersao(v)}
                      className="h-7 text-xs flex-shrink-0"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Carregar
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={salvar}
            disabled={salvando || !vigInicio}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {salvando ? 'Salvando...' : 'Salvar distribuição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalPercentuaisBeneficiarias

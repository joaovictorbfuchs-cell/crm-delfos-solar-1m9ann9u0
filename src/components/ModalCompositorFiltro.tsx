import React, { useState, useEffect } from 'react'
import {
  Plus,
  Trash2,
  Filter,
  Layers,
  Sparkles,
  Info,
  Globe,
  Lock,
  Check,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  CondicaoFiltro,
  EstruturaCondicoes,
  FiltroSalvoRecord,
  ModuloFiltro,
  VisibilidadeFiltro,
} from '@/types/filtros'
import { getCatalogoPorModulo, getCampoPorId, OPERADORES_POR_TIPO } from '@/lib/filtrosCatalogo'
import { isCondicaoValida } from '@/lib/filtrosEngine'
import { detectarContradicoesAll } from '@/lib/filtrosContradicao'

export const LIMITE_MAXIMO_CONDICOES = 16

export interface ColunaConfiguravel {
  id: string
  label: string
}

interface ModalCompositorFiltroProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modulo: ModuloFiltro
  filtroEdicao?: FiltroSalvoRecord | null
  // Colunas configuráveis disponíveis na tabela atual (quando houver)
  colunasDisponiveis?: ColunaConfiguravel[]
  // Grade de colunas atualmente visíveis na tabela
  colunasAtuaisVisiveis?: string[]
  onSalvar: (dados: {
    nome: string
    modulo: ModuloFiltro
    condicoes: EstruturaCondicoes
    visibilidade: VisibilidadeFiltro
    colunas?: string[]
  }) => Promise<void>
}

function gerarId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export const ModalCompositorFiltro: React.FC<ModalCompositorFiltroProps> = ({
  open,
  onOpenChange,
  modulo,
  filtroEdicao,
  colunasDisponiveis = [],
  colunasAtuaisVisiveis = [],
  onSalvar,
}) => {
  const campos = getCatalogoPorModulo(modulo)

  const [nome, setNome] = useState('')
  const [visibilidade, setVisibilidade] = useState<VisibilidadeFiltro>('private')
  const [condicoesAll, setCondicoesAll] = useState<CondicaoFiltro[]>([])
  const [condicoesAny, setCondicoesAny] = useState<CondicaoFiltro[]>([])
  const [salvarColunasJunto, setSalvarColunasJunto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const totalCondicoes = condicoesAll.length + condicoesAny.length
  const atingiuLimiteCondicoes = totalCondicoes >= LIMITE_MAXIMO_CONDICOES

  // Ajuste 1: Detecção de contradições no bloco TODAS
  const contradicoesAll = React.useMemo(() => {
    return detectarContradicoesAll(condicoesAll, modulo)
  }, [condicoesAll, modulo])

  // Função para mover uma condição de TODAS para QUALQUER
  const handleMoverParaAny = (id: string) => {
    const condParaMover = condicoesAll.find((c) => c.id === id)
    if (!condParaMover) return
    setCondicoesAll((prev) => prev.filter((c) => c.id !== id))
    setCondicoesAny((prev) => [...prev, condParaMover])
  }

  // Flag indicando se a tabela deste módulo tem colunas configuráveis
  const temColunasConfiguraveis = Boolean(
    colunasDisponiveis && colunasDisponiveis.length > 0 && colunasAtuaisVisiveis,
  )

  // Inicialização ao abrir modal ou trocar o filtro em edição
  useEffect(() => {
    if (open) {
      setErro(null)
      if (filtroEdicao) {
        setNome(filtroEdicao.nome)
        setVisibilidade(filtroEdicao.visibilidade || 'private')
        setCondicoesAll(filtroEdicao.condicoes?.all || [])
        setCondicoesAny(filtroEdicao.condicoes?.any || [])
        setSalvarColunasJunto(Boolean(filtroEdicao.colunas && filtroEdicao.colunas.length > 0))
      } else {
        setNome('')
        setVisibilidade('private')
        setSalvarColunasJunto(Boolean(temColunasConfiguraveis))
        // Iniciar com uma condição inicial no bloco TODAS
        const primeiroCampo = campos[0]?.id || ''
        const def = getCampoPorId(modulo, primeiroCampo)
        const primeiroOp = def ? OPERADORES_POR_TIPO[def.tipo][0].valor : 'contem'

        setCondicoesAll([
          {
            id: gerarId(),
            campoId: primeiroCampo,
            operador: primeiroOp,
            valor: '',
          },
        ])
        setCondicoesAny([])
      }
    }
  }, [open, filtroEdicao, modulo])

  const handleAddCondicaoAll = () => {
    if (totalCondicoes >= LIMITE_MAXIMO_CONDICOES) return
    const primeiroCampo = campos[0]?.id || ''
    const def = getCampoPorId(modulo, primeiroCampo)
    const primeiroOp = def ? OPERADORES_POR_TIPO[def.tipo][0].valor : 'contem'

    setCondicoesAll((prev) => [
      ...prev,
      {
        id: gerarId(),
        campoId: primeiroCampo,
        operador: primeiroOp,
        valor: '',
      },
    ])
  }

  const handleRemoveCondicaoAll = (id: string) => {
    setCondicoesAll((prev) => prev.filter((c) => c.id !== id))
  }

  const handleUpdateCondicaoAll = (id: string, patch: Partial<CondicaoFiltro>) => {
    setCondicoesAll((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const atualizado = { ...c, ...patch }
        // Se mudou o campo, reseta o operador padrão para o novo tipo
        if (patch.campoId && patch.campoId !== c.campoId) {
          const novoDef = getCampoPorId(modulo, patch.campoId)
          if (novoDef) {
            atualizado.operador = OPERADORES_POR_TIPO[novoDef.tipo][0].valor
            atualizado.valor = novoDef.tipo === 'booleano' ? undefined : ''
            atualizado.valorSecundario = undefined
          }
        }
        return atualizado
      }),
    )
  }

  const handleAddCondicaoAny = () => {
    if (totalCondicoes >= LIMITE_MAXIMO_CONDICOES) return
    const primeiroCampo = campos[0]?.id || ''
    const def = getCampoPorId(modulo, primeiroCampo)
    const primeiroOp = def ? OPERADORES_POR_TIPO[def.tipo][0].valor : 'contem'

    setCondicoesAny((prev) => [
      ...prev,
      {
        id: gerarId(),
        campoId: primeiroCampo,
        operador: primeiroOp,
        valor: '',
      },
    ])
  }

  const handleRemoveCondicaoAny = (id: string) => {
    setCondicoesAny((prev) => prev.filter((c) => c.id !== id))
  }

  const handleUpdateCondicaoAny = (id: string, patch: Partial<CondicaoFiltro>) => {
    setCondicoesAny((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const atualizado = { ...c, ...patch }
        if (patch.campoId && patch.campoId !== c.campoId) {
          const novoDef = getCampoPorId(modulo, patch.campoId)
          if (novoDef) {
            atualizado.operador = OPERADORES_POR_TIPO[novoDef.tipo][0].valor
            atualizado.valor = novoDef.tipo === 'booleano' ? undefined : ''
            atualizado.valorSecundario = undefined
          }
        }
        return atualizado
      }),
    )
  }

  const handleSalvarFiltro = async () => {
    setErro(null)
    if (!nome.trim()) {
      setErro('Por favor, informe um nome para o filtro.')
      return
    }

    const totalCondicoes = condicoesAll.length + condicoesAny.length
    if (totalCondicoes === 0) {
      setErro('Adicione ao menos uma condição para salvar o filtro.')
      return
    }

    // Validação mínima de valores
    const allValidas = condicoesAll.filter((c) => isCondicaoValida(c, modulo))
    const anyValidas = condicoesAny.filter((c) => isCondicaoValida(c, modulo))

    if (allValidas.length === 0 && anyValidas.length === 0) {
      setErro('Preencha os valores das condições do filtro antes de salvar.')
      return
    }

    setSalvando(true)
    try {
      const colunasParaSalvar =
        temColunasConfiguraveis && salvarColunasJunto && colunasAtuaisVisiveis
          ? colunasAtuaisVisiveis
          : undefined

      await onSalvar({
        nome: nome.trim(),
        modulo,
        condicoes: {
          all: allValidas,
          any: anyValidas,
        },
        visibilidade,
        colunas: colunasParaSalvar,
      })
      onOpenChange(false)
    } catch (e: any) {
      console.error('Erro ao salvar filtro:', e)
      setErro(e.message || 'Erro ao salvar filtro no sistema.')
    } finally {
      setSalvando(false)
    }
  }

  const renderLinhaCondicao = (
    cond: CondicaoFiltro,
    onUpdate: (id: string, patch: Partial<CondicaoFiltro>) => void,
    onRemove: (id: string) => void,
  ) => {
    const campoDef = getCampoPorId(modulo, cond.campoId) || campos[0]
    const operadores = OPERADORES_POR_TIPO[campoDef?.tipo || 'texto'] || []
    const operadorAtual = operadores.find((o) => o.valor === cond.operador) || operadores[0]

    return (
      <div
        key={cond.id}
        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-xl bg-slate-50 border border-slate-200/90 text-xs shadow-2xs group"
      >
        {/* Campo */}
        <div className="w-full sm:w-1/3 min-w-[170px]">
          <select
            value={cond.campoId}
            onChange={(e) => onUpdate(cond.id, { campoId: e.target.value })}
            className="w-full h-8 text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs text-slate-800"
          >
            {campos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.categoria ? `[${c.categoria}] ` : ''}
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Operador Dinâmico */}
        <div className="w-full sm:w-1/3 min-w-[150px]">
          <select
            value={cond.operador}
            onChange={(e) => onUpdate(cond.id, { operador: e.target.value as any })}
            className="w-full h-8 text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs text-sky-900"
          >
            {operadores.map((op) => (
              <option key={op.valor} value={op.valor}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        {/* Valor Dinâmico */}
        <div className="flex-1 min-w-[140px] flex items-center gap-1.5">
          {!operadorAtual.requerValor ? (
            <div className="text-[11px] text-slate-400 italic px-2 py-1 bg-slate-100 rounded-md border border-slate-200 w-full">
              Sem valor adicional
            </div>
          ) : operadorAtual.requerSegundoValor ? (
            <div className="flex items-center gap-1 w-full">
              <input
                type={campoDef.tipo === 'data' ? 'date' : 'number'}
                value={cond.valor ?? ''}
                onChange={(e) => onUpdate(cond.id, { valor: e.target.value })}
                placeholder="De"
                className="w-1/2 h-8 text-xs bg-white border border-slate-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <span className="text-slate-400 text-[10px]">e</span>
              <input
                type={campoDef.tipo === 'data' ? 'date' : 'number'}
                value={cond.valorSecundario ?? ''}
                onChange={(e) => onUpdate(cond.id, { valorSecundario: e.target.value })}
                placeholder="Até"
                className="w-1/2 h-8 text-xs bg-white border border-slate-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          ) : campoDef.tipo === 'lista' && campoDef.opcoes ? (
            cond.operador === 'e_um_de' || cond.operador === 'nao_e_um_de' ? (
              // Multi-select simples via input/select combinado
              <select
                multiple
                value={Array.isArray(cond.valor) ? cond.valor : cond.valor ? [cond.valor] : []}
                onChange={(e) => {
                  const selecionados = Array.from(e.target.selectedOptions, (o) => o.value)
                  onUpdate(cond.id, { valor: selecionados })
                }}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1 max-h-16 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                {campoDef.opcoes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={cond.valor ?? ''}
                onChange={(e) => onUpdate(cond.id, { valor: e.target.value })}
                className="w-full h-8 text-xs bg-white border border-slate-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">Selecione uma opção...</option>
                {campoDef.opcoes.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )
          ) : campoDef.tipo === 'data' ? (
            cond.operador === 'ultimos_dias' || cond.operador === 'proximos_dias' ? (
              <div className="flex items-center gap-1 w-full">
                <input
                  type="number"
                  min="1"
                  value={cond.valor ?? 7}
                  onChange={(e) => onUpdate(cond.id, { valor: e.target.value })}
                  className="w-full h-8 text-xs bg-white border border-slate-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  placeholder="Ex: 30"
                />
                <span className="text-slate-500 text-[10px] whitespace-nowrap">dias</span>
              </div>
            ) : (
              <input
                type="date"
                value={cond.valor ?? ''}
                onChange={(e) => onUpdate(cond.id, { valor: e.target.value })}
                className="w-full h-8 text-xs bg-white border border-slate-300 rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            )
          ) : (
            <input
              type={campoDef.tipo === 'numero' ? 'number' : 'text'}
              value={cond.valor ?? ''}
              onChange={(e) => onUpdate(cond.id, { valor: e.target.value })}
              placeholder={campoDef.placeholder || 'Informe o valor...'}
              className="w-full h-8 text-xs bg-white border border-slate-300 rounded-lg px-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-400"
            />
          )}

          <button
            type="button"
            onClick={() => onRemove(cond.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Remover condição"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl border-slate-200">
        <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <Filter className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {filtroEdicao ? 'Editar Filtro Salvo' : 'Novo Filtro Personalizado'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Módulo:{' '}
                <strong className="text-slate-800 uppercase tracking-wider">
                  {modulo === 'clientes' ? 'Clientes' : 'Negócios (Funil & Listas)'}
                </strong>{' '}
                • Defina regras combinadas estilo Pipedrive
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-5 text-xs text-slate-800">
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          {/* Nome e Visibilidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Nome do Filtro <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Clientes RGE sem WhatsApp, Negócios > 50k..."
                className="h-9 text-xs border-slate-300 focus-visible:ring-sky-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Visibilidade
              </label>
              <select
                value={visibilidade}
                onChange={(e) => setVisibilidade(e.target.value as VisibilidadeFiltro)}
                className="w-full h-9 text-xs font-semibold bg-white border border-slate-300 rounded-md px-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer shadow-2xs text-slate-800"
              >
                <option value="private">Privado (só você vê)</option>
                <option value="shared">Compartilhado (todos vêem)</option>
              </select>
            </div>
          </div>

          {/* Checkbox "Salvar colunas junto ao filtro": visível apenas quando a tabela tem colunas configuráveis */}
          {temColunasConfiguraveis && (
            <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl flex items-start gap-3">
              <input
                id="checkbox-salvar-colunas"
                type="checkbox"
                checked={salvarColunasJunto}
                onChange={(e) => setSalvarColunasJunto(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer shrink-0"
              />
              <label
                htmlFor="checkbox-salvar-colunas"
                className="cursor-pointer select-none text-xs text-slate-700"
              >
                <span className="font-bold text-slate-900 block">
                  Salvar colunas junto ao filtro
                </span>
                <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                  Serializa a grade atual de {colunasAtuaisVisiveis?.length || 0} colunas visíveis
                  neste filtro. Ao carregar ou aplicar o filtro, essa configuração de colunas será
                  reaplicada automaticamente na tabela.
                </span>
              </label>
            </div>
          )}

          {/* Teto de 16 condições: alerta quando atingido */}
          {atingiuLimiteCondicoes && (
            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Limite de 16 condições atingido ({totalCondicoes}/16).</span>
              </div>
              <span className="text-[11px] text-amber-700 font-normal">
                Remova uma condição para poder adicionar outra.
              </span>
            </div>
          )}

          {/* BLOCO 1: TODAS AS CONDIÇÕES (ALL / E) */}
          <div className="space-y-2 border border-slate-200 rounded-2xl p-3.5 bg-white shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-extrabold text-[10px] tracking-wider uppercase">
                  TODAS (ALL)
                </span>
                <span className="text-[11px] text-slate-500">
                  O registro precisa cumprir <strong>todas</strong> estas condições abaixo:
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={atingiuLimiteCondicoes}
                onClick={handleAddCondicaoAll}
                className={`h-7 text-xs font-bold text-sky-700 hover:text-sky-800 hover:bg-sky-50 border-sky-200 inline-flex items-center gap-1 ${
                  atingiuLimiteCondicoes ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                title={
                  atingiuLimiteCondicoes
                    ? 'Limite de 16 condições atingido'
                    : 'Adicionar nova condição restritiva'
                }
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar condição</span>
              </Button>
            </div>

            {/* Ajuste 1: Avisos de contradição inline no bloco TODAS */}
            {contradicoesAll.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {contradicoesAll.map((aviso, idx) => (
                  <div
                    key={`${aviso.campoId}-${idx}`}
                    className="p-2.5 bg-amber-50/90 border border-amber-300/90 rounded-xl text-amber-900 text-xs flex items-start justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block text-amber-950">
                          Aviso de contradição lógica
                        </span>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          {aviso.mensagem}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleMoverParaAny(aviso.condicaoIdB)}
                      className="shrink-0 px-2 py-1 text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-200/70 hover:bg-amber-200 border border-amber-300 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                      title="Mover segunda condição para o bloco QUALQUER (ANY)"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Mover p/ QUALQUER</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {condicoesAll.length === 0 ? (
              <p className="text-center py-3 text-slate-400 text-xs italic">
                Nenhuma condição restritiva em TODAS.
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {condicoesAll.map((cond) =>
                  renderLinhaCondicao(cond, handleUpdateCondicaoAll, handleRemoveCondicaoAll),
                )}
              </div>
            )}
          </div>

          {/* BLOCO 2: QUALQUER UMA DAS CONDIÇÕES (ANY / OU) */}
          <div className="space-y-2 border border-slate-200 rounded-2xl p-3.5 bg-white shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[10px] tracking-wider uppercase">
                  QUALQUER (ANY)
                </span>
                <span className="text-[11px] text-slate-500">
                  O registro precisa cumprir <strong>pelo menos uma</strong> destas condições:
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={atingiuLimiteCondicoes}
                onClick={handleAddCondicaoAny}
                className={`h-7 text-xs font-bold text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 inline-flex items-center gap-1 ${
                  atingiuLimiteCondicoes ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                title={
                  atingiuLimiteCondicoes
                    ? 'Limite de 16 condições atingido'
                    : 'Adicionar nova condição alternativa'
                }
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar condição</span>
              </Button>
            </div>

            {condicoesAny.length === 0 ? (
              <p className="text-center py-3 text-slate-400 text-xs italic">
                Nenhuma condição alternativa em QUALQUER (opcional).
              </p>
            ) : (
              <div className="space-y-2 pt-1">
                {condicoesAny.map((cond) =>
                  renderLinhaCondicao(cond, handleUpdateCondicaoAny, handleRemoveCondicaoAny),
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-slate-600 hover:text-slate-900"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={salvando}
            onClick={handleSalvarFiltro}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs"
          >
            {salvando ? 'Salvando...' : filtroEdicao ? 'Salvar Alterações' : 'Criar Filtro Salvo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

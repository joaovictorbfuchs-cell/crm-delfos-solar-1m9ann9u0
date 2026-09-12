import React, { useState } from 'react'
import {
  X,
  CheckCircle2,
  Building2,
  DollarSign,
  Cpu,
  Layers,
  Wrench,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { FornecedorOrcamento } from '@/types/crm'
import { formatCurrency, formatDate } from '@/lib/formatters'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'

interface ModalCompararFornecedoresProps {
  isOpen: boolean
  onClose: () => void
  orcamentos: FornecedorOrcamento[]
  orcamentoSolarId?: string
  clienteId?: string
  onSelecionarFornecedor: (orcamentoId: string) => Promise<void>
  onAplicarAoProjeto?: (dados: {
    marcaPainel?: string
    numeroPlacas?: number
    marcaInversor?: string
    quantidadeInversores?: number
    valorTotal?: number
  }) => void
}

export function ModalCompararFornecedores({
  isOpen,
  onClose,
  orcamentos,
  onSelecionarFornecedor,
  onAplicarAoProjeto,
}: ModalCompararFornecedoresProps) {
  const [salvandoId, setSalvandoId] = useState<string | null>(null)

  if (!isOpen) return null

  // Orçamento com menor valor para destacar melhor custo-benefício
  const menorValor = orcamentos.reduce((min, cur) => {
    return cur.valor_total > 0 && cur.valor_total < min ? cur.valor_total : min
  }, Infinity)

  const handleSelecionar = async (orc: FornecedorOrcamento) => {
    setSalvandoId(orc.id)
    try {
      await onSelecionarFornecedor(orc.id)
      toast.success(`${orc.nome_fornecedor} marcado como fornecedor selecionado da proposta!`)
    } catch (err) {
      console.error('Erro ao selecionar fornecedor:', err)
      toast.error('Não foi possível salvar a seleção do fornecedor.')
    } finally {
      setSalvandoId(null)
    }
  }

  const handleAplicar = (orc: FornecedorOrcamento) => {
    if (!onAplicarAoProjeto) return
    const m = orc.modulos?.[0]
    const inv = orc.inversores?.[0]
    onAplicarAoProjeto({
      marcaPainel: m?.descricao,
      numeroPlacas: m?.quantidade,
      marcaInversor: inv?.descricao,
      quantidadeInversores: inv?.quantidade,
      valorTotal: orc.valor_total,
    })
    toast.success(
      `Equipamentos e valores de ${orc.nome_fornecedor} aplicados à proposta comercial!`,
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Comparação Lado a Lado de Orçamentos de Fornecedores
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {orcamentos.length} Cotações
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Compare equipamentos, quantidades e valores de cada fornecedor e selecione qual será
                utilizado para compor a proposta do cliente.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com Grid Lado a Lado */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 bg-gray-50/60">
          <div
            className="grid gap-4 items-stretch min-w-[700px]"
            style={{
              gridTemplateColumns: `repeat(${Math.max(orcamentos.length, 2)}, minmax(280px, 1fr))`,
            }}
          >
            {orcamentos.map((orc) => {
              const isAtivo = Boolean(orc.selecionado)
              const isMaisBarato = orc.valor_total === menorValor && menorValor !== Infinity

              return (
                <div
                  key={orc.id}
                  className={`flex flex-col justify-between rounded-2xl transition-all relative ${
                    isAtivo
                      ? 'bg-white border-2 border-emerald-600 shadow-lg ring-4 ring-emerald-500/10'
                      : 'bg-white border border-gray-200 hover:border-gray-300 shadow-xs'
                  }`}
                >
                  {/* Badge de Selecionado / Ativo */}
                  {isAtivo && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white text-[11px] font-extrabold uppercase tracking-wide rounded-full shadow-md">
                        <Check className="w-3.5 h-3.5" />
                        Fornecedor Selecionado (Ativo)
                      </span>
                    </div>
                  )}

                  <div className="p-5 space-y-4">
                    {/* Topo do Card */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Revisão: {orc.numero_revisao || 'REV-01'}
                        </span>
                        {isMaisBarato && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Melhor Preço
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-extrabold text-gray-900 leading-snug">
                        {orc.nome_fornecedor}
                      </h4>
                      <p className="text-[11px] text-gray-500">Cotação de {formatDate(orc.data)}</p>
                    </div>

                    {/* Preço Total em Destaque */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        isAtivo
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-gray-50 border-gray-100 text-gray-900'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase text-gray-500 block">
                        Valor Total da Cotação
                      </span>
                      <div className="text-2xl font-black text-emerald-700 tracking-tight">
                        {formatCurrency(orc.valor_total)}
                      </div>
                    </div>

                    {/* Radio Button: Usar este fornecedor na proposta */}
                    <div
                      onClick={() => handleSelecionar(orc)}
                      className={`p-3 rounded-xl border cursor-pointer select-none transition-all flex items-center justify-between ${
                        isAtivo
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                          : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold">
                        <input
                          type="radio"
                          name="fornecedor_selecionado_radio"
                          checked={isAtivo}
                          onChange={() => handleSelecionar(orc)}
                          disabled={salvandoId === orc.id}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Usar este fornecedor na proposta</span>
                      </label>
                      {isAtivo && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                    </div>

                    {/* 1. Módulos Fotovoltaicos */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700 font-bold uppercase text-[11px]">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Módulos Fotovoltaicos</span>
                      </div>
                      {orc.modulos && orc.modulos.length > 0 ? (
                        <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {orc.modulos.map((m, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-2">
                              <span className="text-[11px] text-gray-800 font-medium leading-tight">
                                {m.descricao}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                {m.quantidade} un
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic block">
                          Nenhum módulo listado
                        </span>
                      )}
                    </div>

                    {/* 2. Inversores */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700 font-bold uppercase text-[11px]">
                        <Cpu className="w-3.5 h-3.5 text-blue-600" />
                        <span>Inversores Solares</span>
                      </div>
                      {orc.inversores && orc.inversores.length > 0 ? (
                        <div className="space-y-1.5 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {orc.inversores.map((inv, idx) => (
                            <div key={idx} className="flex items-start justify-between gap-2">
                              <span className="text-[11px] text-gray-800 font-medium leading-tight">
                                {inv.descricao}
                              </span>
                              <span className="text-[11px] font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                                {inv.quantidade} un
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic block">
                          Nenhum inversor listado
                        </span>
                      )}
                    </div>

                    {/* 3. Acessórios e Estrutura */}
                    <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-700 font-bold uppercase text-[11px]">
                        <Wrench className="w-3.5 h-3.5 text-purple-600" />
                        <span>Acessórios & Estrutura ({orc.acessorios?.length || 0})</span>
                      </div>
                      {orc.acessorios && orc.acessorios.length > 0 ? (
                        <ul className="space-y-1 bg-gray-50 p-2.5 rounded-lg border border-gray-100 text-[11px] max-h-36 overflow-y-auto">
                          {orc.acessorios.map((a, idx) => (
                            <li
                              key={idx}
                              className="flex items-center justify-between gap-1 text-gray-700"
                            >
                              <span className="truncate" title={a.descricao}>
                                • {a.descricao}
                              </span>
                              <span className="text-[10px] font-semibold text-gray-500 shrink-0">
                                {a.quantidade}x
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic block">
                          Nenhum acessório adicional
                        </span>
                      )}
                    </div>

                    {/* Observações da Cotação */}
                    {orc.observacoes && (
                      <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 bg-gray-50/50 p-2 rounded-lg">
                        <strong>Obs:</strong> {orc.observacoes}
                      </div>
                    )}
                  </div>

                  {/* Rodapé da Coluna com Ações */}
                  <div className="p-4 pt-2 border-t border-gray-100 bg-gray-50/40 rounded-b-2xl space-y-2">
                    {/* Botão Aplicar ao Projeto */}
                    <button
                      type="button"
                      onClick={() => handleAplicar(orc)}
                      className={`w-full py-2 px-3 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                        isAtivo
                          ? 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-emerald-600/20'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{isAtivo ? 'Aplicado ao Projeto' : 'Aplicar ao Projeto'}</span>
                    </button>

                    {orc.arquivo && (
                      <div className="text-center">
                        <a
                          href={pb.files.getURL(orc, orc.arquivo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Visualizar PDF da cotação</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-between flex-wrap gap-2 shrink-0">
          <div className="text-xs text-gray-500">
            A seleção do fornecedor ativo é persistida automaticamente no banco e garante 1
            fornecedor ativo por projeto.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Fechar Comparação
          </button>
        </div>
      </div>
    </div>
  )
}
export default ModalCompararFornecedores

import React, { useState } from 'react'
import { Building2, Check, Plus, Trash2, ExternalLink, Info } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate } from '@/lib/formatters'
import pb from '@/lib/pocketbase/client'
import { toast } from 'sonner'
import type { FornecedorOrcamento } from '@/types/crm'

interface SecaoComparativoFornecedoresCustosProps {
  orcamentoSolarId?: string
  clienteId?: string
  fornecedorSelecionadoId?: string
  onSelecionarFornecedor: (fornecedor: FornecedorOrcamento) => void
}

/**
 * Tabela de Comparativo de Fornecedores na Aba de Custos.
 * Atende ao Requisito 7:
 * "Comparativo de fornecedores: adicione uma seção com uma tabela para cadastrar orçamentos de diferentes fornecedores.
 *  Colunas: nome do fornecedor, materiais ofertados (placas e inversores), valor total do orçamento.
 *  Cada linha deve ter um botão de radio para selecionar qual fornecedor será usado no cálculo final do orçamento.
 *  Os materiais do fornecedor escolhido alimentam o valor de materiais da aba anterior."
 */
export const SecaoComparativoFornecedoresCustos: React.FC<
  SecaoComparativoFornecedoresCustosProps
> = ({ orcamentoSolarId, clienteId, fornecedorSelecionadoId, onSelecionarFornecedor }) => {
  const {
    fornecedores,
    fornecedoresOrcamentos,
    addFornecedorOrcamento,
    removeFornecedorOrcamento,
    selecionarFornecedorOrcamento,
  } = useClientes()

  // Estado do formulário inline de adição rápida de fornecedor
  const [isAdding, setIsAdding] = useState(false)
  const [novoNomeFornecedor, setNovoNomeFornecedor] = useState('')
  const [novoDescricaoPlacas, setNovoDescricaoPlacas] = useState('')
  const [novoQtdPlacas, setNovoQtdPlacas] = useState<number>(10)
  const [novoDescricaoInversores, setNovoDescricaoInversores] = useState('')
  const [novoQtdInversores, setNovoQtdInversores] = useState<number>(1)
  const [novoValorTotal, setNovoValorTotal] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtra fornecedores vinculados ao orçamento solar atual ou cliente
  // Se não houver vínculo específico, exibe os orçamentos existentes do cliente ou disponíveis
  const orcamentosVinculados = React.useMemo(() => {
    return fornecedoresOrcamentos.filter((o) => {
      if (orcamentoSolarId && o.orcamento_solar_id === orcamentoSolarId) return true
      if (clienteId && o.cliente_id === clienteId) return true
      return false
    })
  }, [fornecedoresOrcamentos, orcamentoSolarId, clienteId])

  // Identifica o ID selecionado
  const activeSelectedId = React.useMemo(() => {
    if (fornecedorSelecionadoId) return fornecedorSelecionadoId
    const marcado = orcamentosVinculados.find((o) => o.selecionado)
    return marcado?.id || ''
  }, [fornecedorSelecionadoId, orcamentosVinculados])

  const handleCadastrarFornecedorInline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNomeFornecedor.trim()) {
      toast.error('Informe o nome do fornecedor.')
      return
    }
    if (!novoValorTotal || novoValorTotal <= 0) {
      toast.error('Informe o valor total do orçamento do fornecedor.')
      return
    }

    setIsSubmitting(true)
    try {
      // Busca se já existe fornecedor cadastrado com o mesmo nome para vincular fornecedor_id
      const fornMatch = fornecedores.find(
        (f) => f.nome_empresa.trim().toLowerCase() === novoNomeFornecedor.trim().toLowerCase(),
      )

      const modulos = novoDescricaoPlacas.trim()
        ? [{ descricao: novoDescricaoPlacas.trim(), quantidade: Math.max(1, novoQtdPlacas || 1) }]
        : []

      const inversores = novoDescricaoInversores.trim()
        ? [
            {
              descricao: novoDescricaoInversores.trim(),
              quantidade: Math.max(1, novoQtdInversores || 1),
            },
          ]
        : []

      const payload: Partial<FornecedorOrcamento> = {
        nome_fornecedor: novoNomeFornecedor.trim(),
        fornecedor_id: fornMatch?.id || undefined,
        cliente_id: clienteId || undefined,
        orcamento_solar_id: orcamentoSolarId || undefined,
        data: new Date().toISOString(),
        numero_revisao: 'REV-01',
        valor_total: novoValorTotal,
        modulos,
        inversores,
        acessorios: [],
        selecionado: orcamentosVinculados.length === 0, // Se for o primeiro, já seleciona
      }

      const criado = await addFornecedorOrcamento(payload)
      toast.success(`Fornecedor ${novoNomeFornecedor} adicionado ao comparativo!`)

      // Se for o primeiro ou selecionado, dispara callback
      if (orcamentosVinculados.length === 0 && criado) {
        onSelecionarFornecedor(criado)
      }

      // Reset
      setNovoNomeFornecedor('')
      setNovoDescricaoPlacas('')
      setNovoQtdPlacas(10)
      setNovoDescricaoInversores('')
      setNovoQtdInversores(1)
      setNovoValorTotal(0)
      setIsAdding(false)
    } catch (err) {
      console.error('Erro ao adicionar fornecedor no comparativo:', err)
      toast.error('Erro ao cadastrar fornecedor. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSelectRadio = async (fornOrc: FornecedorOrcamento) => {
    try {
      await selecionarFornecedorOrcamento(fornOrc.id, {
        orcamentoSolarId,
        clienteId,
      })
      onSelecionarFornecedor(fornOrc)
      toast.success(
        `Fornecedor "${fornOrc.nome_fornecedor}" selecionado! Valor de ${formatCurrency(
          fornOrc.valor_total,
        )} aplicado em materiais.`,
      )
    } catch (err) {
      console.error('Erro ao selecionar fornecedor:', err)
      // Dispara o callback mesmo assim para a UI local
      onSelecionarFornecedor(fornOrc)
    }
  }

  const handleExcluirLinha = async (id: string, nome: string) => {
    if (!confirm(`Deseja remover o orçamento do fornecedor "${nome}"?`)) return
    try {
      await removeFornecedorOrcamento(id)
      toast.success('Fornecedor removido do comparativo.')
    } catch (err) {
      console.error('Erro ao excluir orçamento de fornecedor:', err)
      toast.error('Erro ao remover fornecedor.')
    }
  }

  return (
    <div className="space-y-3">
      {/* Barra de Ações Superior */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>
            Selecione no <strong>botão de rádio</strong> qual fornecedor será usado no cálculo
            final. Os materiais do fornecedor escolhido alimentam automaticamente o campo de
            materiais extras/equipamentos.
          </span>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Novo Fornecedor</span>
          </button>
        )}
      </div>

      {/* Formulário Inline para Cadastrar Fornecedor (Requisito 7) */}
      {isAdding && (
        <form
          onSubmit={handleCadastrarFornecedorInline}
          className="p-3.5 bg-gray-50/90 rounded-xl border border-emerald-200 space-y-3 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              Novo Fornecedor para o Comparativo
            </span>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* 1. Nome do Fornecedor */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Nome do Fornecedor *
              </label>
              <input
                type="text"
                value={novoNomeFornecedor}
                onChange={(e) => setNovoNomeFornecedor(e.target.value)}
                placeholder="Ex: Aldo Solar, Belenus, Edeltec"
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            {/* 2. Placas / Módulos ofertados */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Placas ofertadas
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={novoQtdPlacas}
                  onChange={(e) => setNovoQtdPlacas(Number(e.target.value))}
                  placeholder="Qtd"
                  className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                  title="Quantidade de placas"
                />
                <input
                  type="text"
                  value={novoDescricaoPlacas}
                  onChange={(e) => setNovoDescricaoPlacas(e.target.value)}
                  placeholder="Ex: Canadian 550W Bifacial"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* 3. Inversores ofertados */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Inversores ofertados
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min={1}
                  value={novoQtdInversores}
                  onChange={(e) => setNovoQtdInversores(Number(e.target.value))}
                  placeholder="Qtd"
                  className="w-16 px-2 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                  title="Quantidade de inversores"
                />
                <input
                  type="text"
                  value={novoDescricaoInversores}
                  onChange={(e) => setNovoDescricaoInversores(e.target.value)}
                  placeholder="Ex: Deye 5kW Monofásico"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            {/* 4. Valor total do orçamento */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Valor Total do Orçamento (R$) *
              </label>
              <input
                type="number"
                min={0}
                step={50}
                value={novoValorTotal || ''}
                onChange={(e) => setNovoValorTotal(Number(e.target.value))}
                placeholder="Ex: 14500,00"
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg bg-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Salvando...' : 'Salvar Fornecedor'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tabela de Fornecedores Cadastrados */}
      <div className="overflow-x-auto border border-gray-200 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th
                className="py-2.5 px-3 w-12 text-center"
                title="Selecionar fornecedor ativo para o cálculo final"
              >
                Ativo
              </th>
              <th className="py-2.5 px-3 min-w-[140px]">Nome do Fornecedor</th>
              <th className="py-2.5 px-3 min-w-[220px]">
                Materiais Ofertados (Placas e Inversores)
              </th>
              <th className="py-2.5 px-3 min-w-[120px] text-right">Valor Total (R$)</th>
              <th className="py-2.5 px-3 w-16 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {orcamentosVinculados.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-400">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Building2 className="w-6 h-6 text-gray-300" />
                    <span>Nenhum fornecedor cadastrado para este orçamento.</span>
                    <button
                      type="button"
                      onClick={() => setIsAdding(true)}
                      className="text-xs text-emerald-700 hover:underline font-bold mt-1"
                    >
                      Clique aqui para adicionar o primeiro fornecedor
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              orcamentosVinculados.map((orc) => {
                const isSelected = activeSelectedId === orc.id || Boolean(orc.selecionado)
                const modulosTexto =
                  orc.modulos && orc.modulos.length > 0
                    ? orc.modulos.map((m) => `${m.quantidade}x ${m.descricao}`).join(', ')
                    : 'Não especificado'
                const inversoresTexto =
                  orc.inversores && orc.inversores.length > 0
                    ? orc.inversores.map((inv) => `${inv.quantidade}x ${inv.descricao}`).join(', ')
                    : ''

                return (
                  <tr
                    key={orc.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-emerald-50/50 hover:bg-emerald-50/70' : 'hover:bg-gray-50/80'
                    }`}
                  >
                    {/* Botão de Rádio para Selecionar Fornecedor Usado no Cálculo Final */}
                    <td className="py-3 px-3 text-center align-middle">
                      <input
                        type="radio"
                        name="fornecedor_selecionado_radio"
                        checked={isSelected}
                        onChange={() => handleSelectRadio(orc)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        title={
                          isSelected
                            ? 'Fornecedor ativo alimentando os materiais da aba anterior'
                            : 'Clique para selecionar este fornecedor no cálculo final'
                        }
                      />
                    </td>

                    {/* Nome do Fornecedor */}
                    <td className="py-3 px-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-900">{orc.nome_fornecedor}</span>
                        {isSelected && (
                          <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 block">
                        Revisão: {orc.numero_revisao || 'REV-01'} • {formatDate(orc.data)}
                      </span>
                    </td>

                    {/* Materiais Ofertados (Placas e Inversores) */}
                    <td className="py-3 px-3 align-middle text-[11px] text-gray-700 space-y-0.5">
                      <div>
                        <strong className="text-gray-900">Placas:</strong> {modulosTexto}
                      </div>
                      {inversoresTexto && (
                        <div>
                          <strong className="text-gray-900">Inversor:</strong> {inversoresTexto}
                        </div>
                      )}
                    </td>

                    {/* Valor Total do Orçamento */}
                    <td className="py-3 px-3 align-middle text-right font-black text-xs text-emerald-800">
                      {formatCurrency(orc.valor_total)}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-3 align-middle text-center">
                      <div className="flex items-center justify-center gap-1">
                        {orc.arquivo && (
                          <a
                            href={pb.files.getURL(orc, orc.arquivo)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="Ver arquivo anexo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleExcluirLinha(orc.id, orc.nome_fornecedor)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Remover fornecedor do comparativo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
export default SecaoComparativoFornecedoresCustos

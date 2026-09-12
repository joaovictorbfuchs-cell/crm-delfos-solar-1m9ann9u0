import React, { useState, useRef } from 'react'
import {
  FileText,
  UploadCloud,
  Loader2,
  CheckCircle2,
  Trash2,
  Plus,
  Building2,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import {
  FornecedorOrcamentoExtraido,
  FornecedorItemOrcamento,
  FornecedorOrcamento,
} from '@/types/crm'
import { extrairOrcamentoFotovoltaicoPDF } from '@/lib/orcamentoParser'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

interface SecaoOrcamentosFornecedoresProps {
  clienteId?: string
  orcamentoSolarId?: string
  onUsarEquipamentos?: (dados: {
    marcaPainel?: string
    numeroPlacas?: number
    marcaInversor?: string
    quantidadeInversores?: number
    valorTotal?: number
  }) => void
}

export function SecaoOrcamentosFornecedores({
  clienteId,
  orcamentoSolarId,
  onUsarEquipamentos,
}: SecaoOrcamentosFornecedoresProps) {
  const {
    fornecedores,
    fornecedoresOrcamentos,
    addFornecedorOrcamento,
    removeFornecedorOrcamento,
  } = useClientes()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzedFile, setAnalyzedFile] = useState<File | null>(null)
  const [tabelaRevisaoAberta, setTabelaRevisaoAberta] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Estado editável da tabela de revisão
  const [revisaoDados, setRevisaoDados] = useState<FornecedorOrcamentoExtraido | null>(null)

  // Lista de orçamentos já vinculados a este cliente ou orçamento solar
  const orcamentosVinculados = React.useMemo(() => {
    return fornecedoresOrcamentos.filter((o) => {
      if (orcamentoSolarId && o.orcamento_solar_id === orcamentoSolarId) return true
      if (clienteId && o.cliente_id === clienteId) return true
      return false
    })
  }, [fornecedoresOrcamentos, orcamentoSolarId, clienteId])

  // Lidar com seleção e upload de PDF
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('Por favor, selecione um arquivo em formato PDF.')
      return
    }

    setAnalyzedFile(file)
    setIsAnalyzing(true)

    try {
      const extraido = await extrairOrcamentoFotovoltaicoPDF(file, fornecedores)

      // Verificar se o PDF tinha texto legível ou se foi escaneado/sem texto
      const semItens =
        extraido.modulos.length === 0 &&
        extraido.inversores.length === 0 &&
        extraido.acessorios.length === 0
      const semNomeReal =
        !extraido.nome_fornecedor ||
        extraido.nome_fornecedor === 'Fornecedor Solar' ||
        extraido.nome_fornecedor === file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')

      if (semItens && extraido.valor_total === 0 && semNomeReal) {
        toast.warning(
          'PDF sem texto legível detectado (pode ser imagem escaneada). Os campos foram abertos para preenchimento manual na tabela de revisão.',
          { duration: 6000 },
        )
        // Garante ao menos 1 linha para preenchimento de módulos e inversores
        setRevisaoDados({
          ...extraido,
          modulos:
            extraido.modulos.length > 0 ? extraido.modulos : [{ descricao: '', quantidade: 1 }],
          inversores:
            extraido.inversores.length > 0
              ? extraido.inversores
              : [{ descricao: '', quantidade: 1 }],
        })
      } else {
        toast.success('PDF analisado com sucesso! Revise os dados na tabela antes de confirmar.')
        // Garantir que haja pelo menos um campo para preenchimento fácil se vazio
        setRevisaoDados({
          ...extraido,
          modulos:
            extraido.modulos.length > 0 ? extraido.modulos : [{ descricao: '', quantidade: 1 }],
          inversores:
            extraido.inversores.length > 0
              ? extraido.inversores
              : [{ descricao: '', quantidade: 1 }],
        })
      }

      setTabelaRevisaoAberta(true)
    } catch (err) {
      console.error('Erro ao analisar PDF de orçamento:', err)
      toast.warning(
        'PDF sem texto legível detectado (pode ser imagem escaneada). Os campos foram abertos para preenchimento manual na tabela de revisão.',
        { duration: 6000 },
      )
      setRevisaoDados({
        nome_fornecedor: file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '),
        numero_revisao: 'REV-01',
        data: new Date().toISOString(),
        valor_total: 0,
        modulos: [{ descricao: '', quantidade: 1 }],
        inversores: [{ descricao: '', quantidade: 1 }],
        acessorios: [],
        observacoes: `Arquivo: ${file.name}`,
      })
      setTabelaRevisaoAberta(true)
    } finally {
      setIsAnalyzing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Manipulação de linhas de itens
  const handleItemChange = (
    tipo: 'modulos' | 'inversores' | 'acessorios',
    index: number,
    field: 'descricao' | 'quantidade',
    value: string | number,
  ) => {
    if (!revisaoDados) return
    const list = [...revisaoDados[tipo]]
    if (field === 'quantidade') {
      list[index] = { ...list[index], quantidade: Math.max(1, Number(value) || 1) }
    } else {
      list[index] = { ...list[index], descricao: String(value) }
    }
    setRevisaoDados({ ...revisaoDados, [tipo]: list })
  }

  const handleAddItem = (tipo: 'modulos' | 'inversores' | 'acessorios') => {
    if (!revisaoDados) return
    const list = [...revisaoDados[tipo], { descricao: '', quantidade: 1 }]
    setRevisaoDados({ ...revisaoDados, [tipo]: list })
  }

  const handleRemoveItem = (tipo: 'modulos' | 'inversores' | 'acessorios', index: number) => {
    if (!revisaoDados) return
    const list = revisaoDados[tipo].filter((_, i) => i !== index)
    setRevisaoDados({ ...revisaoDados, [tipo]: list })
  }

  // Confirmar e salvar orçamento de fornecedor
  const handleSalvarOrcamento = async () => {
    if (!revisaoDados) return
    if (!revisaoDados.nome_fornecedor.trim()) {
      toast.error('Informe o nome do fornecedor.')
      return
    }

    setIsSaving(true)
    try {
      // Procurar id de fornecedor pelo nome caso não esteja associado
      let fornId = revisaoDados.fornecedor_id
      if (!fornId) {
        const matching = fornecedores.find(
          (f) => f.nome_empresa.toLowerCase() === revisaoDados.nome_fornecedor.toLowerCase(),
        )
        if (matching) fornId = matching.id
      }

      const payload: Partial<FornecedorOrcamento> = {
        nome_fornecedor: revisaoDados.nome_fornecedor,
        fornecedor_id: fornId,
        cliente_id: clienteId || undefined,
        orcamento_solar_id: orcamentoSolarId || undefined,
        data: revisaoDados.data || new Date().toISOString(),
        numero_revisao: revisaoDados.numero_revisao || 'REV-01',
        valor_total: revisaoDados.valor_total || 0,
        modulos: revisaoDados.modulos.filter((m) => m.descricao.trim().length > 0),
        inversores: revisaoDados.inversores.filter((inv) => inv.descricao.trim().length > 0),
        acessorios: revisaoDados.acessorios.filter((a) => a.descricao.trim().length > 0),
        observacoes: revisaoDados.observacoes || undefined,
      }

      await addFornecedorOrcamento(payload, analyzedFile || undefined)
      toast.success('Orçamento de fornecedor salvo com sucesso!')

      // Se tiver callback para preencher a proposta técnica
      if (onUsarEquipamentos) {
        const primeiroModulo = revisaoDados.modulos[0]
        const primeiroInversor = revisaoDados.inversores[0]
        onUsarEquipamentos({
          marcaPainel: primeiroModulo?.descricao,
          numeroPlacas: primeiroModulo?.quantidade,
          marcaInversor: primeiroInversor?.descricao,
          quantidadeInversores: primeiroInversor?.quantidade,
          valorTotal: revisaoDados.valor_total,
        })
      }

      // Fechar tabela de revisão e limpar arquivo
      setTabelaRevisaoAberta(false)
      setRevisaoDados(null)
      setAnalyzedFile(null)
    } catch (err) {
      console.error('Erro ao salvar orçamento de fornecedor:', err)
      toast.error('Erro ao salvar orçamento de fornecedor.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Orçamentos de Fornecedores
          </h3>
          <p className="text-[11px] text-gray-500">
            Faça upload do PDF da cotação recebida para extrair módulos, inversores, acessórios e
            valores automaticamente.
          </p>
        </div>

        {/* Botão de Upload com Input Oculto */}
        <div>
          <input
            ref={fileInputRef}
            id="input-orcamento-fornecedor-pdf"
            type="file"
            accept="application/pdf,.pdf"
            onChange={handleFileChange}
            className="sr-only"
          />
          <label
            htmlFor="input-orcamento-fornecedor-pdf"
            onClick={() => {
              // Fallback para assegurar que o clique funcione mesmo em cenários de overlay
              if (fileInputRef.current && !isAnalyzing) {
                fileInputRef.current.click()
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] cursor-pointer select-none ${
              isAnalyzing ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analisando PDF...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <UploadCloud className="w-4 h-4" />
                <span>Adicionar Orçamento</span>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Banner de carregamento ativo */}
      {isAnalyzing && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-emerald-700 animate-spin shrink-0" />
          <div className="text-xs text-emerald-900">
            <strong>Lendo e analisando arquivo PDF...</strong>
            <p className="text-[11px] text-emerald-700">
              Identificando fornecedor, quantidade e descrição de módulos solares, inversores, lista
              de acessórios e valor total.
            </p>
          </div>
        </div>
      )}

      {/* TABELA DE REVISÃO EDITÁVEL (AO FAZER UPLOAD) */}
      {tabelaRevisaoAberta && revisaoDados && (
        <div className="p-4 bg-gray-50 rounded-xl border-2 border-emerald-500 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                Tabela de Revisão dos Dados Extraídos do PDF
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setTabelaRevisaoAberta(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>

          <div className="text-[11px] text-gray-600">
            Revise os dados abaixo. Você pode corrigir ou complementar qualquer informação antes de
            confirmar a gravação.
          </div>

          {/* Dados gerais do orçamento extraído */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* Fornecedor */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Nome do Fornecedor *
              </label>
              <div className="space-y-1">
                <input
                  type="text"
                  value={revisaoDados.nome_fornecedor}
                  onChange={(e) =>
                    setRevisaoDados({ ...revisaoDados, nome_fornecedor: e.target.value })
                  }
                  list="fornecedores-sugeridos"
                  placeholder="Ex: Sol tecno Distribuidora"
                  className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <datalist id="fornecedores-sugeridos">
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.nome_empresa} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Número da Revisão */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Número da Revisão / Cotação
              </label>
              <input
                type="text"
                value={revisaoDados.numero_revisao || ''}
                onChange={(e) =>
                  setRevisaoDados({ ...revisaoDados, numero_revisao: e.target.value })
                }
                placeholder="Ex: ST-2026-REV01"
                className="w-full px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Valor Total do Orçamento */}
            <div>
              <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                Valor Total (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                value={revisaoDados.valor_total || ''}
                onChange={(e) =>
                  setRevisaoDados({
                    ...revisaoDados,
                    valor_total: Number(e.target.value) || 0,
                  })
                }
                placeholder="0,00"
                className="w-full px-3 py-1.5 text-xs font-black text-emerald-700 rounded-lg border border-emerald-300 bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 1. Módulos Solares */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Módulos Fotovoltaicos Extraídos
              </label>
              <button
                type="button"
                onClick={() => handleAddItem('modulos')}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar Módulo</span>
              </button>
            </div>

            {revisaoDados.modulos.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">Nenhum módulo identificado.</p>
            ) : (
              <div className="space-y-1.5">
                {revisaoDados.modulos.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) =>
                        handleItemChange('modulos', idx, 'descricao', e.target.value)
                      }
                      placeholder="Descrição do módulo (Ex: Módulo Canadian Solar 550W BiHiKu7)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-gray-400 font-semibold">Qtd:</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) =>
                          handleItemChange('modulos', idx, 'quantidade', e.target.value)
                        }
                        className="w-20 px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('modulos', idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Inversores */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Inversores Extraídos
              </label>
              <button
                type="button"
                onClick={() => handleAddItem('inversores')}
                className="text-[11px] font-bold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar Inversor</span>
              </button>
            </div>

            {revisaoDados.inversores.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">Nenhum inversor identificado.</p>
            ) : (
              <div className="space-y-1.5">
                {revisaoDados.inversores.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) =>
                        handleItemChange('inversores', idx, 'descricao', e.target.value)
                      }
                      placeholder="Descrição do inversor (Ex: Inversor Growatt MAX 30KTL3-X)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-gray-400 font-semibold">Qtd:</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) =>
                          handleItemChange('inversores', idx, 'quantidade', e.target.value)
                        }
                        className="w-20 px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('inversores', idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Acessórios */}
          <div className="space-y-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                Lista de Acessórios & Componentes Extraídos
              </label>
              <button
                type="button"
                onClick={() => handleAddItem('acessorios')}
                className="text-[11px] font-bold text-purple-700 hover:text-purple-800 inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Adicionar Acessório</span>
              </button>
            </div>

            {revisaoDados.acessorios.length === 0 ? (
              <p className="text-[11px] text-gray-400 italic">Nenhum acessório identificado.</p>
            ) : (
              <div className="space-y-1.5">
                {revisaoDados.acessorios.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) =>
                        handleItemChange('acessorios', idx, 'descricao', e.target.value)
                      }
                      placeholder="Descrição do acessório (Ex: String Box CC, Cabos 6mm, Conectores MC4)"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[11px] text-gray-400 font-semibold">Qtd:</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) =>
                          handleItemChange('acessorios', idx, 'quantidade', e.target.value)
                        }
                        className="w-20 px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem('acessorios', idx)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botões de Confirmação da Tabela de Revisão */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] text-gray-500">
              Arquivo anexado: <strong>{analyzedFile?.name || 'PDF Carregado'}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTabelaRevisaoAberta(false)
                  setRevisaoDados(null)
                  setAnalyzedFile(null)
                }}
                className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-colors"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={handleSalvarOrcamento}
                disabled={isSaving}
                className="px-4 py-1.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-all inline-flex items-center gap-1.5"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Salvar Orçamento do Fornecedor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LISTA DE ORÇAMENTOS DE FORNECEDORES JÁ SALVOS NESTE CLIENTE/ORÇAMENTO */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
          Orçamentos de Fornecedores Cadastrados / Extraídos ({orcamentosVinculados.length})
        </h4>

        {orcamentosVinculados.length === 0 ? (
          <div className="p-5 text-center rounded-xl bg-gray-50/70 border border-dashed border-gray-200 text-xs text-gray-500 space-y-3">
            <p>
              Nenhum orçamento de fornecedor anexado ainda. Faça upload de um PDF de cotação para
              extrair módulos, inversores, acessórios e valores automaticamente.
            </p>
            <label
              htmlFor="input-orcamento-fornecedor-pdf"
              onClick={() => {
                if (fileInputRef.current && !isAnalyzing) {
                  fileInputRef.current.click()
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] cursor-pointer select-none ${
                isAnalyzing ? 'opacity-60 pointer-events-none' : ''
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Analisando PDF...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <UploadCloud className="w-4 h-4" />
                  <span>Adicionar Orçamento</span>
                </>
              )}
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orcamentosVinculados.map((orc) => (
              <div
                key={orc.id}
                className="p-3 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 transition-colors shadow-2xs space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-gray-900">{orc.nome_fornecedor}</h5>
                    <span className="text-[10px] text-gray-500">
                      Revisão: <strong>{orc.numero_revisao || 'REV-01'}</strong> •{' '}
                      {formatDate(orc.data)}
                    </span>
                  </div>
                  <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {formatCurrency(orc.valor_total)}
                  </span>
                </div>

                <div className="text-[11px] text-gray-600 space-y-0.5">
                  {orc.modulos && orc.modulos.length > 0 && (
                    <div className="truncate">
                      <strong>Módulos:</strong> {orc.modulos[0].quantidade}x{' '}
                      {orc.modulos[0].descricao}
                    </div>
                  )}
                  {orc.inversores && orc.inversores.length > 0 && (
                    <div className="truncate">
                      <strong>Inversor:</strong> {orc.inversores[0].quantidade}x{' '}
                      {orc.inversores[0].descricao}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  {orc.arquivo && (
                    <a
                      href={pb.files.getURL(orc, orc.arquivo)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Ver PDF</span>
                    </a>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {onUsarEquipamentos && (
                      <button
                        type="button"
                        onClick={() => {
                          const m = orc.modulos?.[0]
                          const inv = orc.inversores?.[0]
                          onUsarEquipamentos({
                            marcaPainel: m?.descricao,
                            numeroPlacas: m?.quantidade,
                            marcaInversor: inv?.descricao,
                            quantidadeInversores: inv?.quantidade,
                            valorTotal: orc.valor_total,
                          })
                          toast.success('Equipamentos aplicados aos campos do sistema!')
                        }}
                        className="text-emerald-700 hover:text-emerald-800 font-bold"
                      >
                        Aplicar ao Projeto
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Deseja excluir este orçamento de fornecedor?')) {
                          await removeFornecedorOrcamento(orc.id)
                          toast.success('Orçamento removido.')
                        }
                      }}
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SecaoOrcamentosFornecedores

import React, { useState, useEffect } from 'react'
import {
  X,
  CheckCircle2,
  Cpu,
  Zap,
  PackagePlus,
  DollarSign,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Eye,
  Building2,
  FileText,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import type { Fornecedor, FornecedorItemOrcamento, FornecedorOrcamentoExtraido } from '@/types/crm'
import type { AnaliseImagemResultado, LinhaDetectadaOCR } from '@/services/ocrImagemService'
import { formatCurrency } from '@/lib/formatters'

export interface ItemClassificadoModulo {
  id: string
  linhaId?: string
  modelo: string
  potenciaWp?: number | ''
  quantidade: number
}

export interface ItemClassificadoInversor {
  id: string
  linhaId?: string
  marca: string
  modelo: string
  quantidade: number
}

export interface ItemClassificadoAcessorio {
  id: string
  linhaId?: string
  descricao: string
  quantidade: number
}

export interface ModalClassificacaoOrcamentoImagemProps {
  isOpen: boolean
  onClose: () => void
  resultadoAnalise: AnaliseImagemResultado | null
  imagemFile: File | null
  fornecedores: Fornecedor[]
  onConfirmarClassificacao: (dadosProntos: {
    nome_fornecedor: string
    fornecedor_id?: string
    numero_revisao: string
    valor_total: number
    modulos: FornecedorItemOrcamento[]
    inversores: FornecedorItemOrcamento[]
    acessorios: FornecedorItemOrcamento[]
    observacoes: string
    arquivoOriginal: File | null
  }) => void
}

export function ModalClassificacaoOrcamentoImagem({
  isOpen,
  onClose,
  resultadoAnalise,
  imagemFile,
  fornecedores,
  onConfirmarClassificacao,
}: ModalClassificacaoOrcamentoImagemProps) {
  // Etapa ativa: 1 = Módulos, 2 = Inversores, 3 = Acessórios, 4 = Valor Total & Fornecedor
  const [etapaAtual, setEtapaAtual] = useState<1 | 2 | 3 | 4>(1)

  // Itens selecionados e editáveis por categoria
  const [modulos, setModulos] = useState<ItemClassificadoModulo[]>([])
  const [inversores, setInversores] = useState<ItemClassificadoInversor[]>([])
  const [acessorios, setAcessorios] = useState<ItemClassificadoAcessorio[]>([])

  // IDs das linhas selecionadas em cada categoria (para visualização dos checkboxes na lista do OCR)
  const [linhasModulosIds, setLinhasModulosIds] = useState<Set<string>>(new Set())
  const [linhasInversoresIds, setLinhasInversoresIds] = useState<Set<string>>(new Set())
  const [linhasAcessoriosIds, setLinhasAcessoriosIds] = useState<Set<string>>(new Set())

  // Valor total: selecionado na lista ou digitado manualmente
  const [valorTotalManual, setValorTotalManual] = useState<number | ''>('')
  const [valorSelecionadoIndex, setValorSelecionadoIndex] = useState<number | null>(null)

  // Fornecedor e revisão
  const [fornecedorNome, setFornecedorNome] = useState('')
  const [fornecedorId, setFornecedorId] = useState<string | undefined>()
  const [numeroRevisao, setNumeroRevisao] = useState('REV-01')

  // Preview da imagem anexada
  const [imagemPreviewUrl, setImagemPreviewUrl] = useState<string | null>(null)
  const [mostrarPreviewImagem, setMostrarPreviewImagem] = useState(false)

  // Inicializar estado ao receber resultado da análise
  useEffect(() => {
    if (!isOpen || !resultadoAnalise) return

    setEtapaAtual(1)

    // Fornecedor sugerido
    const fNome = resultadoAnalise.fornecedorDetectado || ''
    setFornecedorNome(fNome)
    setFornecedorId(resultadoAnalise.fornecedorIdDetectado)
    setNumeroRevisao(resultadoAnalise.numeroRevisaoDetectado || 'REV-01')

    // Valores
    setValorTotalManual(resultadoAnalise.valorTotalSugerido || '')
    const idxVal = resultadoAnalise.valoresDetectados.indexOf(resultadoAnalise.valorTotalSugerido)
    setValorSelecionadoIndex(idxVal >= 0 ? idxVal : null)

    // Pré-classificar módulos com base na heurística
    const modLines = resultadoAnalise.linhas.filter((l) => l.tipoDetectado === 'modulo')
    const modIds = new Set<string>()
    const modItens: ItemClassificadoModulo[] = []

    modLines.forEach((l, i) => {
      modIds.add(l.id)
      modItens.push({
        id: `mod-${i}-${l.id}`,
        linhaId: l.id,
        modelo: l.modeloSugerido || l.textoLimpo,
        potenciaWp: l.potenciaWpSugerida || '',
        quantidade: l.quantidadeSugerida || 1,
      })
    })

    // Pré-classificar inversores
    const invLines = resultadoAnalise.linhas.filter((l) => l.tipoDetectado === 'inversor')
    const invIds = new Set<string>()
    const invItens: ItemClassificadoInversor[] = []

    invLines.forEach((l, i) => {
      invIds.add(l.id)
      invItens.push({
        id: `inv-${i}-${l.id}`,
        linhaId: l.id,
        marca: l.marcaSugerida || '',
        modelo: l.modeloSugerido || l.textoLimpo,
        quantidade: l.quantidadeSugerida || 1,
      })
    })

    // Pré-classificar acessórios
    const acLines = resultadoAnalise.linhas.filter((l) => l.tipoDetectado === 'acessorio')
    const acIds = new Set<string>()
    const acItens: ItemClassificadoAcessorio[] = []

    acLines.forEach((l, i) => {
      acIds.add(l.id)
      acItens.push({
        id: `ac-${i}-${l.id}`,
        linhaId: l.id,
        descricao: l.textoLimpo,
        quantidade: l.quantidadeSugerida || 1,
      })
    })

    setLinhasModulosIds(modIds)
    setModulos(
      modItens.length > 0
        ? modItens
        : [{ id: `mod-init`, modelo: '', potenciaWp: '', quantidade: 1 }],
    )

    setLinhasInversoresIds(invIds)
    setInversores(
      invItens.length > 0 ? invItens : [{ id: `inv-init`, marca: '', modelo: '', quantidade: 1 }],
    )

    setLinhasAcessoriosIds(acIds)
    setAcessorios(acItens)
  }, [isOpen, resultadoAnalise])

  // Gerar preview da imagem
  useEffect(() => {
    if (imagemFile) {
      const url = URL.createObjectURL(imagemFile)
      setImagemPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setImagemPreviewUrl(null)
  }, [imagemFile])

  if (!isOpen || !resultadoAnalise) return null

  // Alternar checkbox de módulo
  const toggleLinhaModulo = (linha: LinhaDetectadaOCR) => {
    const nextSet = new Set(linhasModulosIds)
    if (nextSet.has(linha.id)) {
      nextSet.delete(linha.id)
      setModulos((prev) => prev.filter((m) => m.linhaId !== linha.id))
    } else {
      nextSet.add(linha.id)
      // Remove se estava em outras categorias para não duplicar
      linhasInversoresIds.delete(linha.id)
      linhasAcessoriosIds.delete(linha.id)
      setInversores((prev) => prev.filter((inv) => inv.linhaId !== linha.id))
      setAcessorios((prev) => prev.filter((ac) => ac.linhaId !== linha.id))

      setModulos((prev) => [
        ...prev.filter((m) => m.modelo.trim().length > 0),
        {
          id: `mod-${Date.now()}-${linha.id}`,
          linhaId: linha.id,
          modelo: linha.modeloSugerido || linha.textoLimpo,
          potenciaWp: linha.potenciaWpSugerida || '',
          quantidade: linha.quantidadeSugerida || 1,
        },
      ])
    }
    setLinhasModulosIds(nextSet)
  }

  // Alternar checkbox de inversor
  const toggleLinhaInversor = (linha: LinhaDetectadaOCR) => {
    const nextSet = new Set(linhasInversoresIds)
    if (nextSet.has(linha.id)) {
      nextSet.delete(linha.id)
      setInversores((prev) => prev.filter((inv) => inv.linhaId !== linha.id))
    } else {
      nextSet.add(linha.id)
      linhasModulosIds.delete(linha.id)
      linhasAcessoriosIds.delete(linha.id)
      setModulos((prev) => prev.filter((m) => m.linhaId !== linha.id))
      setAcessorios((prev) => prev.filter((ac) => ac.linhaId !== linha.id))

      setInversores((prev) => [
        ...prev.filter((inv) => inv.modelo.trim().length > 0),
        {
          id: `inv-${Date.now()}-${linha.id}`,
          linhaId: linha.id,
          marca: linha.marcaSugerida || '',
          modelo: linha.modeloSugerido || linha.textoLimpo,
          quantidade: linha.quantidadeSugerida || 1,
        },
      ])
    }
    setLinhasInversoresIds(nextSet)
  }

  // Alternar checkbox de acessório
  const toggleLinhaAcessorio = (linha: LinhaDetectadaOCR) => {
    const nextSet = new Set(linhasAcessoriosIds)
    if (nextSet.has(linha.id)) {
      nextSet.delete(linha.id)
      setAcessorios((prev) => prev.filter((ac) => ac.linhaId !== linha.id))
    } else {
      nextSet.add(linha.id)
      linhasModulosIds.delete(linha.id)
      linhasInversoresIds.delete(linha.id)
      setModulos((prev) => prev.filter((m) => m.linhaId !== linha.id))
      setInversores((prev) => prev.filter((inv) => inv.linhaId !== linha.id))

      setAcessorios((prev) => [
        ...prev,
        {
          id: `ac-${Date.now()}-${linha.id}`,
          linhaId: linha.id,
          descricao: linha.textoLimpo,
          quantidade: linha.quantidadeSugerida || 1,
        },
      ])
    }
    setLinhasAcessoriosIds(nextSet)
  }

  // Concluir e enviar os dados para o formulário / salvar
  const handleFinalizar = () => {
    const modulosFinais: FornecedorItemOrcamento[] = modulos
      .filter((m) => m.modelo.trim().length > 0)
      .map((m) => {
        let desc = m.modelo.trim()
        if (m.potenciaWp && !desc.toLowerCase().includes(`${m.potenciaWp}w`)) {
          desc = `${desc} ${m.potenciaWp}Wp`
        }
        return {
          descricao: desc,
          quantidade: m.quantidade > 0 ? m.quantidade : 1,
        }
      })

    const inversoresFinais: FornecedorItemOrcamento[] = inversores
      .filter((inv) => inv.modelo.trim().length > 0 || inv.marca.trim().length > 0)
      .map((inv) => {
        let desc = inv.modelo.trim()
        if (inv.marca.trim() && !desc.toLowerCase().includes(inv.marca.toLowerCase())) {
          desc = `${inv.marca.trim()} ${desc}`.trim()
        }
        return {
          descricao: desc || 'Inversor Solar',
          quantidade: inv.quantidade > 0 ? inv.quantidade : 1,
        }
      })

    const acessoriosFinais: FornecedorItemOrcamento[] = acessorios
      .filter((a) => a.descricao.trim().length > 0)
      .map((a) => ({
        descricao: a.descricao.trim(),
        quantidade: a.quantidade > 0 ? a.quantidade : 1,
      }))

    const valorFinal = typeof valorTotalManual === 'number' ? valorTotalManual : 0

    onConfirmarClassificacao({
      nome_fornecedor: fornecedorNome.trim() || 'Fornecedor Solar',
      fornecedor_id: fornecedorId,
      numero_revisao: numeroRevisao.trim() || 'REV-01',
      valor_total: valorFinal,
      modulos: modulosFinais,
      inversores: inversoresFinais,
      acessorios: acessoriosFinais,
      observacoes: `Orçamento extraído via análise visual OCR da imagem: ${imagemFile?.name || 'arquivo_imagem'}`,
      arquivoOriginal: imagemFile,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-emerald-100 w-full max-w-4xl my-4 flex flex-col max-h-[94vh] overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-classificacao-imagem-title"
      >
        {/* Cabeçalho Verde Solar Delfos */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-5 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3
                id="modal-classificacao-imagem-title"
                className="text-base font-bold text-white flex items-center gap-2 leading-tight"
              >
                Classificação Guiada do Orçamento (Análise Visual OCR)
              </h3>
              <p className="text-xs text-emerald-100/90">
                Selecione os itens detectados na imagem e confirme as 4 perguntas guiadas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {imagemPreviewUrl && (
              <button
                type="button"
                onClick={() => setMostrarPreviewImagem(!mostrarPreviewImagem)}
                className={`p-2 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  mostrarPreviewImagem
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
                title="Ver foto/print original"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {mostrarPreviewImagem ? 'Ocultar Foto' : 'Ver Foto'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title="Fechar"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barra de Progresso das 4 Etapas */}
        <div className="bg-emerald-950/5 border-b border-gray-200 px-5 py-3">
          <div className="grid grid-cols-4 gap-2">
            {/* Etapa 1 */}
            <button
              type="button"
              onClick={() => setEtapaAtual(1)}
              className={`p-2 rounded-lg text-left transition-all border ${
                etapaAtual === 1
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs font-bold'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
                <span>Passo 1</span>
                {modulos.filter((m) => m.modelo.trim()).length > 0 && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-300 ml-auto" />
                )}
              </div>
              <div className="text-xs font-bold truncate flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 shrink-0" />
                <span>Módulos ({modulos.filter((m) => m.modelo.trim()).length})</span>
              </div>
            </button>

            {/* Etapa 2 */}
            <button
              type="button"
              onClick={() => setEtapaAtual(2)}
              className={`p-2 rounded-lg text-left transition-all border ${
                etapaAtual === 2
                  ? 'bg-blue-600 text-white border-blue-700 shadow-2xs font-bold'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
                <span>Passo 2</span>
                {inversores.filter((inv) => inv.modelo.trim()).length > 0 && (
                  <CheckCircle2 className="w-3 h-3 text-blue-300 ml-auto" />
                )}
              </div>
              <div className="text-xs font-bold truncate flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>Inversores ({inversores.filter((inv) => inv.modelo.trim()).length})</span>
              </div>
            </button>

            {/* Etapa 3 */}
            <button
              type="button"
              onClick={() => setEtapaAtual(3)}
              className={`p-2 rounded-lg text-left transition-all border ${
                etapaAtual === 3
                  ? 'bg-purple-600 text-white border-purple-700 shadow-2xs font-bold'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
                <span>Passo 3</span>
                {acessorios.filter((a) => a.descricao.trim()).length > 0 && (
                  <CheckCircle2 className="w-3 h-3 text-purple-300 ml-auto" />
                )}
              </div>
              <div className="text-xs font-bold truncate flex items-center gap-1">
                <PackagePlus className="w-3.5 h-3.5 shrink-0" />
                <span>Acessórios ({acessorios.filter((a) => a.descricao.trim()).length})</span>
              </div>
            </button>

            {/* Etapa 4 */}
            <button
              type="button"
              onClick={() => setEtapaAtual(4)}
              className={`p-2 rounded-lg text-left transition-all border ${
                etapaAtual === 4
                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs font-bold'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
                <span>Passo 4</span>
                {typeof valorTotalManual === 'number' && valorTotalManual > 0 && (
                  <CheckCircle2 className="w-3 h-3 text-amber-300 ml-auto" />
                )}
              </div>
              <div className="text-xs font-bold truncate flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 shrink-0" />
                <span>Valor & Fornecedor</span>
              </div>
            </button>
          </div>
        </div>

        {/* Modal Body: Flex row se preview ativo */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Painel de Foto / Imagem Original (colapsável) */}
          {mostrarPreviewImagem && imagemPreviewUrl && (
            <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 bg-gray-900 flex flex-col h-60 md:h-auto overflow-hidden">
              <div className="p-2.5 bg-black/40 text-white text-[11px] font-bold flex items-center justify-between">
                <span>Imagem do Orçamento</span>
                <span className="text-[10px] text-gray-400">{imagemFile?.name}</span>
              </div>
              <div className="flex-1 overflow-auto p-2 flex items-center justify-center">
                <img
                  src={imagemPreviewUrl}
                  alt="Orçamento do Fornecedor"
                  className="max-h-full max-w-full object-contain rounded shadow-lg"
                />
              </div>
            </div>
          )}

          {/* Área Principal de Conteúdo das Etapas */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
            {/* =============================================================== */}
            {/* PERGUNTA 1: MÓDULOS SOLARES                                     */}
            {/* =============================================================== */}
            {etapaAtual === 1 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 bg-emerald-50/80 rounded-xl border border-emerald-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-emerald-950">
                        Quais destes itens são módulos solares (placas)?
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Marque na lista abaixo as linhas correspondentes aos módulos fotovoltaicos.
                        Você pode editar o modelo, potência (Wp) e quantidade de cada placa.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Linhas detectadas pelo OCR para seleção */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    <span>
                      Linhas Detectadas na Imagem pelo OCR ({resultadoAnalise.linhas.length})
                    </span>
                    <span className="text-emerald-700 font-semibold normal-case">
                      {linhasModulosIds.size} linha(s) selecionada(s) como módulo
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200">
                    {resultadoAnalise.linhas.map((linha) => {
                      const isSelected = linhasModulosIds.has(linha.id)
                      const isInOther =
                        linhasInversoresIds.has(linha.id) || linhasAcessoriosIds.has(linha.id)
                      return (
                        <div
                          key={linha.id}
                          onClick={() => toggleLinhaModulo(linha)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold shadow-2xs'
                              : isInOther
                                ? 'bg-gray-100/60 border-gray-200 text-gray-400 opacity-60'
                                : 'bg-white border-gray-200 hover:border-emerald-300 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // tratado pelo container
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                            />
                            <div className="truncate">
                              <span className="text-gray-900 font-medium">
                                {linha.textoOriginal}
                              </span>
                              {linha.potenciaWpSugerida && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold">
                                  {linha.potenciaWpSugerida}Wp
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            {linha.quantidadeSugerida > 1 && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-bold">
                                Qtd: {linha.quantidadeSugerida}
                              </span>
                            )}
                            {linha.tipoDetectado === 'modulo' && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded font-bold">
                                Sugerido
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Módulos confirmados e campos editáveis (modelo, Wp, quantidade) */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-600" />
                      <span>Módulos Confirmados para o Orçamento ({modulos.length})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setModulos((prev) => [
                          ...prev,
                          {
                            id: `mod-add-${Date.now()}`,
                            modelo: '',
                            potenciaWp: '',
                            quantidade: 1,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Módulo Manualmente</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {modulos.map((mod, idx) => (
                      <div
                        key={mod.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-gray-50/70 p-3 rounded-xl border border-gray-200"
                      >
                        <div className="sm:col-span-6">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                            Modelo / Marca da Placa
                          </label>
                          <input
                            type="text"
                            value={mod.modelo}
                            onChange={(e) => {
                              const val = e.target.value
                              setModulos((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, modelo: val } : m)),
                              )
                            }}
                            placeholder="Ex: Canadian Solar 550W BiHiKu7"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                            Potência (Wp)
                          </label>
                          <input
                            type="number"
                            value={mod.potenciaWp}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value)
                              setModulos((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, potenciaWp: val } : m)),
                              )
                            }}
                            placeholder="Ex: 550"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={mod.quantidade}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1)
                              setModulos((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, quantidade: val } : m)),
                              )
                            }}
                            className="w-full px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end sm:pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (mod.linhaId) {
                                const nextSet = new Set(linhasModulosIds)
                                nextSet.delete(mod.linhaId)
                                setLinhasModulosIds(nextSet)
                              }
                              setModulos((prev) =>
                                prev.length <= 1
                                  ? [{ id: 'mod-clear', modelo: '', potenciaWp: '', quantidade: 1 }]
                                  : prev.filter((_, i) => i !== idx),
                              )
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Remover módulo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* PERGUNTA 2: INVERSORES                                          */}
            {/* =============================================================== */}
            {etapaAtual === 2 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 bg-blue-50/80 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-blue-950">
                        Quais destes itens são inversores?
                      </h4>
                      <p className="text-xs text-blue-800 mt-0.5">
                        Marque na lista abaixo os inversores ou microinversores da cotação. Confirme
                        a marca, modelo e quantidade de inversores.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de linhas detectadas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    <span>
                      Linhas Detectadas na Imagem pelo OCR ({resultadoAnalise.linhas.length})
                    </span>
                    <span className="text-blue-700 font-semibold normal-case">
                      {linhasInversoresIds.size} linha(s) selecionada(s) como inversor
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200">
                    {resultadoAnalise.linhas.map((linha) => {
                      const isSelected = linhasInversoresIds.has(linha.id)
                      const isInOther =
                        linhasModulosIds.has(linha.id) || linhasAcessoriosIds.has(linha.id)
                      return (
                        <div
                          key={linha.id}
                          onClick={() => toggleLinhaInversor(linha)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? 'bg-blue-50 border-blue-400 text-blue-950 font-semibold shadow-2xs'
                              : isInOther
                                ? 'bg-gray-100/60 border-gray-200 text-gray-400 opacity-60'
                                : 'bg-white border-gray-200 hover:border-blue-300 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 shrink-0"
                            />
                            <div className="truncate">
                              <span className="text-gray-900 font-medium">
                                {linha.textoOriginal}
                              </span>
                              {linha.marcaSugerida && (
                                <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold">
                                  {linha.marcaSugerida}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            {linha.quantidadeSugerida > 1 && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-bold">
                                Qtd: {linha.quantidadeSugerida}
                              </span>
                            )}
                            {linha.tipoDetectado === 'inversor' && (
                              <span className="text-[10px] text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded font-bold">
                                Sugerido
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Inversores confirmados e campos editáveis (marca, modelo, quantidade) */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-600" />
                      <span>Inversores Confirmados para o Orçamento ({inversores.length})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setInversores((prev) => [
                          ...prev,
                          {
                            id: `inv-add-${Date.now()}`,
                            marca: '',
                            modelo: '',
                            quantidade: 1,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Inversor Manualmente</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {inversores.map((inv, idx) => (
                      <div
                        key={inv.id}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-gray-50/70 p-3 rounded-xl border border-gray-200"
                      >
                        <div className="sm:col-span-4">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                            Marca
                          </label>
                          <input
                            type="text"
                            value={inv.marca}
                            onChange={(e) => {
                              const val = e.target.value
                              setInversores((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, marca: val } : item)),
                              )
                            }}
                            placeholder="Ex: Growatt / Deye / Huawei"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-5">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                            Modelo do Inversor
                          </label>
                          <input
                            type="text"
                            value={inv.modelo}
                            onChange={(e) => {
                              const val = e.target.value
                              setInversores((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, modelo: val } : item,
                                ),
                              )
                            }}
                            placeholder="Ex: MAX 30KTL3-X LV Trifásico"
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                            Quantidade
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={inv.quantidade}
                            onChange={(e) => {
                              const val = Math.max(1, Number(e.target.value) || 1)
                              setInversores((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, quantidade: val } : item,
                                ),
                              )
                            }}
                            className="w-full px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        <div className="sm:col-span-1 flex justify-end sm:pt-4">
                          <button
                            type="button"
                            onClick={() => {
                              if (inv.linhaId) {
                                const nextSet = new Set(linhasInversoresIds)
                                nextSet.delete(inv.linhaId)
                                setLinhasInversoresIds(nextSet)
                              }
                              setInversores((prev) =>
                                prev.length <= 1
                                  ? [{ id: 'inv-clear', marca: '', modelo: '', quantidade: 1 }]
                                  : prev.filter((_, i) => i !== idx),
                              )
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                            title="Remover inversor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* PERGUNTA 3: ACESSÓRIOS                                          */}
            {/* =============================================================== */}
            {etapaAtual === 3 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 bg-purple-50/80 rounded-xl border border-purple-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-purple-950">
                        Quais destes itens são acessórios?
                      </h4>
                      <p className="text-xs text-purple-800 mt-0.5">
                        Selecione os itens restantes (string box, cabos solares, conectores MC4,
                        estruturas, DPS, disjuntores). Confirme a descrição e quantidade.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lista de linhas detectadas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                    <span>
                      Linhas Detectadas na Imagem pelo OCR ({resultadoAnalise.linhas.length})
                    </span>
                    <span className="text-purple-700 font-semibold normal-case">
                      {linhasAcessoriosIds.size} linha(s) selecionada(s) como acessório
                    </span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200">
                    {resultadoAnalise.linhas.map((linha) => {
                      const isSelected = linhasAcessoriosIds.has(linha.id)
                      const isInOther =
                        linhasModulosIds.has(linha.id) || linhasInversoresIds.has(linha.id)
                      return (
                        <div
                          key={linha.id}
                          onClick={() => toggleLinhaAcessorio(linha)}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                            isSelected
                              ? 'bg-purple-50 border-purple-400 text-purple-950 font-semibold shadow-2xs'
                              : isInOther
                                ? 'bg-gray-100/60 border-gray-200 text-gray-400 opacity-60'
                                : 'bg-white border-gray-200 hover:border-purple-300 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 shrink-0"
                            />
                            <div className="truncate">
                              <span className="text-gray-900 font-medium">
                                {linha.textoOriginal}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            {linha.quantidadeSugerida > 1 && (
                              <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-bold">
                                Qtd: {linha.quantidadeSugerida}
                              </span>
                            )}
                            {linha.tipoDetectado === 'acessorio' && (
                              <span className="text-[10px] text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded font-bold">
                                Sugerido
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Acessórios confirmados e campos editáveis */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                      <PackagePlus className="w-4 h-4 text-purple-600" />
                      <span>Acessórios Confirmados para o Orçamento ({acessorios.length})</span>
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setAcessorios((prev) => [
                          ...prev,
                          {
                            id: `ac-add-${Date.now()}`,
                            descricao: '',
                            quantidade: 1,
                          },
                        ])
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-800 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Acessório Manualmente</span>
                    </button>
                  </div>

                  {acessorios.length === 0 ? (
                    <div className="text-center py-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs">
                      Nenhum acessório selecionado. Marque nas linhas acima ou adicione manualmente.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {acessorios.map((ac, idx) => (
                        <div
                          key={ac.id}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-gray-50/70 p-3 rounded-xl border border-gray-200"
                        >
                          <div className="sm:col-span-9">
                            <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                              Descrição do Acessório
                            </label>
                            <input
                              type="text"
                              value={ac.descricao}
                              onChange={(e) => {
                                const val = e.target.value
                                setAcessorios((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, descricao: val } : item,
                                  ),
                                )
                              }}
                              placeholder="Ex: String Box CC, Cabos 6mm, Conectores MC4"
                              className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] text-gray-500 font-semibold mb-0.5">
                              Quantidade
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={ac.quantidade}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value) || 1)
                                setAcessorios((prev) =>
                                  prev.map((item, i) =>
                                    i === idx ? { ...item, quantidade: val } : item,
                                  ),
                                )
                              }}
                              className="w-full px-2 py-1.5 text-xs text-center font-bold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end sm:pt-4">
                            <button
                              type="button"
                              onClick={() => {
                                if (ac.linhaId) {
                                  const nextSet = new Set(linhasAcessoriosIds)
                                  nextSet.delete(ac.linhaId)
                                  setLinhasAcessoriosIds(nextSet)
                                }
                                setAcessorios((prev) => prev.filter((_, i) => i !== idx))
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                              title="Remover acessório"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =============================================================== */}
            {/* PERGUNTA 4: VALOR TOTAL E FORNECEDOR                            */}
            {/* =============================================================== */}
            {etapaAtual === 4 && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="p-4 bg-amber-50/80 rounded-xl border border-amber-200">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 font-bold">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-950">
                        Qual é o valor total do orçamento?
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Aponte o valor total na lista de valores detectados ou digite manualmente.
                        Confirme também o fornecedor do orçamento.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seleção do valor total detectado na lista com Radio */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wider block">
                    Valores Detectados pelo OCR na Imagem (
                    {resultadoAnalise.valoresDetectados.length})
                  </label>

                  {resultadoAnalise.valoresDetectados.length === 0 ? (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
                      Nenhum valor monetário com padrão &quot;R$&quot; foi detectado
                      automaticamente. Digite o valor total no campo abaixo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {resultadoAnalise.valoresDetectados.map((val, idx) => {
                        const isSelected = valorTotalManual === val
                        return (
                          <label
                            key={idx}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 font-bold'
                                : 'bg-white border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="radio-valor-total"
                                checked={isSelected}
                                onChange={() => {
                                  setValorTotalManual(val)
                                  setValorSelecionadoIndex(idx)
                                }}
                                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="text-sm font-black text-emerald-800">
                                {formatCurrency(val)}
                              </span>
                            </div>
                            {val === resultadoAnalise.valorTotalSugerido && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                Maior Valor / Sugerido
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {/* Campo de digitação manual de valor */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <label className="text-xs font-bold text-gray-800 block">
                      Ou digite / ajuste o Valor Total (R$):
                    </label>
                    <div className="relative max-w-sm">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-emerald-700 text-xs">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={valorTotalManual}
                        onChange={(e) => {
                          const val = e.target.value === '' ? '' : Number(e.target.value)
                          setValorTotalManual(val)
                          setValorSelecionadoIndex(null)
                        }}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2 text-sm font-black text-emerald-900 rounded-lg border border-emerald-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Fornecedor e Revisão */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span>Identificação do Fornecedor</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Nome do Fornecedor *
                      </label>
                      <input
                        type="text"
                        list="fornecedores-lista-classificacao"
                        value={fornecedorNome}
                        onChange={(e) => {
                          const val = e.target.value
                          setFornecedorNome(val)
                          const match = fornecedores.find(
                            (f) => f.nome_empresa.toLowerCase() === val.trim().toLowerCase(),
                          )
                          setFornecedorId(match ? match.id : undefined)
                        }}
                        placeholder="Ex: Sol tecno Distribuidora"
                        className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <datalist id="fornecedores-lista-classificacao">
                        {fornecedores.map((f) => (
                          <option key={f.id} value={f.nome_empresa} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        Revisão / Cotação Nº
                      </label>
                      <input
                        type="text"
                        value={numeroRevisao}
                        onChange={(e) => setNumeroRevisao(e.target.value)}
                        placeholder="Ex: REV-01"
                        className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumo Geral Pré-Confirmação */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 block">
                    Resumo dos Itens Classificados:
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-gray-500 text-[10px] uppercase font-bold">Módulos</div>
                      <div className="font-extrabold text-emerald-800">
                        {modulos.filter((m) => m.modelo.trim()).length} modelo(s)
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-blue-200">
                      <div className="text-gray-500 text-[10px] uppercase font-bold">
                        Inversores
                      </div>
                      <div className="font-extrabold text-blue-800">
                        {inversores.filter((inv) => inv.modelo.trim()).length} modelo(s)
                      </div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-purple-200">
                      <div className="text-gray-500 text-[10px] uppercase font-bold">
                        Acessórios
                      </div>
                      <div className="font-extrabold text-purple-800">
                        {acessorios.filter((a) => a.descricao.trim()).length} item(ns)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Navegação Entre Passos e Confirmação Final */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3 shrink-0">
          <div>
            {etapaAtual > 1 && (
              <button
                type="button"
                onClick={() => setEtapaAtual((prev) => (prev - 1) as any)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-bold transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Passo Anterior</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-gray-500 hover:text-gray-700 text-xs font-semibold"
            >
              Cancelar
            </button>

            {etapaAtual < 4 ? (
              <button
                type="button"
                onClick={() => setEtapaAtual((prev) => (prev + 1) as any)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
              >
                <span>Próximo Passo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizar}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-bold shadow-xs transition-all hover:scale-[1.01]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Preencher Orçamento</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalClassificacaoOrcamentoImagem

import React, { useState, useRef } from 'react'
import {
  FileText,
  UploadCloud,
  Loader2,
  Trash2,
  Building2,
  ExternalLink,
  Columns3,
  Check,
  Image as ImageIcon,
} from 'lucide-react'
import { ModalCompararFornecedores } from './ModalCompararFornecedores'
import { ModalClassificacaoOrcamentoImagem } from './ModalClassificacaoOrcamentoImagem'
import { useClientes } from '@/contexts/ClientesContext'
import { FornecedorItemOrcamento, FornecedorOrcamento } from '@/types/crm'
import { extrairOrcamentoFotovoltaicoPDF } from '@/lib/orcamentoParser'
import { analisarImagemOrcamento, AnaliseImagemResultado } from '@/services/ocrImagemService'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { ModalOrcamentoFornecedorForm } from './ModalOrcamentoFornecedorForm'

interface SecaoOrcamentosFornecedoresProps {
  clienteId?: string
  orcamentoSolarId?: string
  fornecedorSelecionadoId?: string
  onUsarEquipamentos?: (dados: {
    marcaPainel?: string
    numeroPlacas?: number
    marcaInversor?: string
    quantidadeInversores?: number
    valorTotal?: number
  }) => void
  onAplicarAoProjeto?: (fornecedorOrc: FornecedorOrcamento) => void
}

export function SecaoOrcamentosFornecedores({
  clienteId,
  orcamentoSolarId,
  fornecedorSelecionadoId,
  onUsarEquipamentos,
  onAplicarAoProjeto,
}: SecaoOrcamentosFornecedoresProps) {
  const {
    fornecedores,
    fornecedoresOrcamentos,
    addFornecedorOrcamento,
    removeFornecedorOrcamento,
    selecionarFornecedorOrcamento,
  } = useClientes()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzingMessage, setAnalyzingMessage] = useState('Analisando arquivo PDF...')
  const [analyzedFile, setAnalyzedFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isModalCompararOpen, setIsModalCompararOpen] = useState(false)
  const [isModalFormOpen, setIsModalFormOpen] = useState(false)

  // Estados específicos para o upload por imagem e OCR
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [imageOcrProgress, setImageOcrProgress] = useState<{ status: string; percent: number }>({
    status: 'Iniciando análise visual...',
    percent: 0,
  })
  const [imageFileSelected, setImageFileSelected] = useState<File | null>(null)
  const [ocrResultado, setOcrResultado] = useState<AnaliseImagemResultado | null>(null)
  const [isModalClassificacaoOpen, setIsModalClassificacaoOpen] = useState(false)

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
    setAnalyzingMessage('Lendo e analisando arquivo PDF...')

    try {
      const extraido = await extrairOrcamentoFotovoltaicoPDF(file, fornecedores)

      // Salva diretamente o orçamento extraído sem exigir modal de preenchimento redundante
      await executarSalvarOrcamento({
        nome_fornecedor:
          extraido.nome_fornecedor ||
          file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') ||
          'Fornecedor Solar',
        fornecedor_id: extraido.fornecedor_id,
        numero_revisao: extraido.numero_revisao || 'REV-01',
        valor_total: extraido.valor_total || 0,
        modulos: extraido.modulos || [],
        inversores: extraido.inversores || [],
        acessorios: extraido.acessorios || [],
        observacoes: extraido.observacoes || `Arquivo: ${file.name}`,
        arquivo: file,
      })
    } catch (err) {
      console.error('Erro ao analisar PDF de orçamento:', err)
      toast.error('Não foi possível processar ou salvar o orçamento a partir do PDF.')
    } finally {
      setIsAnalyzing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Lidar com seleção e upload de IMAGEM (JPG, PNG, WEBP)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp']
    const nameLower = file.name.toLowerCase()
    const isValidExt = validExtensions.some((ext) => nameLower.endsWith(ext))
    const isValidMime =
      file.type.startsWith('image/jpeg') ||
      file.type.startsWith('image/png') ||
      file.type.startsWith('image/webp')

    if (!isValidExt && !isValidMime) {
      toast.error('Por favor, selecione uma imagem válida (JPG, PNG ou WEBP).')
      return
    }

    setImageFileSelected(file)
    setIsAnalyzingImage(true)
    setImageOcrProgress({ status: 'Preparando imagem para OCR...', percent: 5 })

    try {
      const resultado = await analisarImagemOrcamento(file, fornecedores, (p) => {
        setImageOcrProgress(p)
      })

      // Verificar se o OCR detectou algo utilizável
      const semItens =
        resultado.modulosSugeridos.length === 0 &&
        resultado.inversoresSugeridos.length === 0 &&
        resultado.acessoriosSugeridos.length === 0
      const semLinhasRelevantes = resultado.linhas.length === 0
      const semValor = resultado.valorTotalSugerido === 0

      if (semItens && semLinhasRelevantes && semValor) {
        toast.error(
          'Não foi possível extrair textos da imagem (baixa nitidez, reflexo ou iluminação insuficiente). Use o Preenchimento Manual para registrar a cotação.',
        )
      } else {
        setOcrResultado(resultado)
        setIsModalClassificacaoOpen(true)
        toast.success('Imagem analisada! Classifique os itens detectados.')
      }
    } catch (err) {
      console.error('Erro na análise OCR da imagem:', err)
      toast.error('Falha ao processar imagem via OCR.')
    } finally {
      setIsAnalyzingImage(false)
      if (imageInputRef.current) {
        imageInputRef.current.value = ''
      }
    }
  }

  // Confirmar e salvar orçamento de fornecedor (comum para formulário manual e salvamento direto)
  const executarSalvarOrcamento = async (dados: {
    nome_fornecedor: string
    fornecedor_id?: string
    numero_revisao?: string
    valor_total: number
    modulos: FornecedorItemOrcamento[]
    inversores: FornecedorItemOrcamento[]
    acessorios: FornecedorItemOrcamento[]
    observacoes?: string
    arquivo?: File | null
  }) => {
    if (!dados.nome_fornecedor.trim()) {
      toast.error('Informe o nome do fornecedor.')
      return
    }

    setIsSaving(true)
    try {
      // Procurar id de fornecedor pelo nome caso não esteja associado
      let fornId = dados.fornecedor_id
      if (!fornId) {
        const matching = fornecedores.find(
          (f) => f.nome_empresa.toLowerCase() === dados.nome_fornecedor.toLowerCase(),
        )
        if (matching) fornId = matching.id
      }

      const payload: Partial<FornecedorOrcamento> = {
        nome_fornecedor: dados.nome_fornecedor,
        fornecedor_id: fornId,
        cliente_id: clienteId || undefined,
        orcamento_solar_id: orcamentoSolarId || undefined,
        data: new Date().toISOString(),
        numero_revisao: dados.numero_revisao || 'REV-01',
        valor_total: dados.valor_total || 0,
        modulos: dados.modulos.filter((m) => m.descricao && m.descricao.trim().length > 0),
        inversores: dados.inversores.filter(
          (inv) => inv.descricao && inv.descricao.trim().length > 0,
        ),
        acessorios: dados.acessorios.filter((a) => a.descricao && a.descricao.trim().length > 0),
        observacoes: dados.observacoes || undefined,
      }

      const arquivoParaGravar = dados.arquivo !== undefined ? dados.arquivo : analyzedFile

      await addFornecedorOrcamento(payload, arquivoParaGravar || undefined)
      toast.success('Orçamento de fornecedor salvo com sucesso!')

      // Se tiver callback para preencher a proposta técnica
      if (onUsarEquipamentos) {
        const primeiroModulo = payload.modulos?.[0]
        const primeiroInversor = payload.inversores?.[0]
        onUsarEquipamentos({
          marcaPainel: primeiroModulo?.descricao,
          numeroPlacas: primeiroModulo?.quantidade,
          marcaInversor: primeiroInversor?.descricao,
          quantidadeInversores: primeiroInversor?.quantidade,
          valorTotal: payload.valor_total,
        })
      }

      // Fechar modal e limpar arquivo
      setIsModalFormOpen(false)
      setAnalyzedFile(null)
    } catch (err) {
      console.error('Erro ao salvar orçamento de fornecedor:', err)
      const backendMotivo = getErrorMessage(err)
      const motivoAmigavel =
        backendMotivo && backendMotivo !== 'Failed to create record.'
          ? `Erro ao salvar orçamento: ${backendMotivo}`
          : 'Erro ao salvar orçamento de fornecedor. Verifique os dados informados e tente novamente.'
      toast.error(motivoAmigavel)
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

        {/* Botão de Comparação e Botão de Upload com Input Oculto */}
        <div className="flex items-center gap-2 flex-wrap">
          {orcamentosVinculados.length >= 2 && (
            <button
              type="button"
              onClick={() => setIsModalCompararOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-all hover:scale-[1.01]"
            >
              <Columns3 className="w-4 h-4 text-emerald-700" />
              <span>Comparar Orçamentos ({orcamentosVinculados.length})</span>
            </button>
          )}

          {/* 1. Upload de PDF */}
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
              if (fileInputRef.current && !isAnalyzing && !isAnalyzingImage) {
                fileInputRef.current.click()
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] cursor-pointer select-none ${
              isAnalyzing || isAnalyzingImage ? 'opacity-60 pointer-events-none' : ''
            }`}
            title="Upload de cotação em PDF"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analisando PDF...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Adicionar Orçamento (PDF)</span>
              </>
            )}
          </label>

          {/* 2. Upload por Imagem (Foto / Scan / Print) */}
          <input
            ref={imageInputRef}
            id="input-orcamento-fornecedor-imagem"
            type="file"
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={handleImageChange}
            className="sr-only"
          />
          <label
            htmlFor="input-orcamento-fornecedor-imagem"
            onClick={() => {
              if (imageInputRef.current && !isAnalyzing && !isAnalyzingImage) {
                imageInputRef.current.click()
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] cursor-pointer select-none ${
              isAnalyzing || isAnalyzingImage ? 'opacity-60 pointer-events-none' : ''
            }`}
            title="Upload de foto, scan ou print do orçamento (JPG, PNG, WEBP)"
          >
            {isAnalyzingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Analisando imagem...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>Upload por Imagem</span>
              </>
            )}
          </label>

          {/* 3. Preenchimento Manual */}
          <button
            type="button"
            onClick={() => {
              setAnalyzedFile(null)
              setIsModalFormOpen(true)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold shadow-2xs transition-all"
            title="Preencher manualmente sem enviar arquivo"
          >
            <FileText className="w-3.5 h-3.5 text-gray-600" />
            <span>Preenchimento Manual</span>
          </button>
        </div>
      </div>

      {/* Banner de carregamento ativo para PDF */}
      {isAnalyzing && (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-emerald-700 animate-spin shrink-0" />
          <div className="text-xs text-emerald-900">
            <strong>{analyzingMessage}</strong>
            <p className="text-[11px] text-emerald-700">
              Identificando fornecedor, quantidade e descrição de módulos solares, inversores, lista
              de acessórios e valor total.
            </p>
          </div>
        </div>
      )}

      {/* Banner de carregamento ativo para Imagem (OCR) */}
      {isAnalyzingImage && (
        <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-teal-700 animate-spin shrink-0" />
          <div className="text-xs text-teal-950 flex-1">
            <div className="flex items-center justify-between">
              <strong>Analisando imagem...</strong>
              <span className="font-bold text-teal-700">{imageOcrProgress.percent}%</span>
            </div>
            <p className="text-[11px] text-teal-700 mt-0.5">
              {imageOcrProgress.status ||
                'Processando OCR com Tesseract.js (português + inglês)...'}
            </p>
            {/* Barra de progresso visual */}
            <div className="w-full bg-teal-200/60 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(10, imageOcrProgress.percent)}%` }}
              />
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
              Nenhum orçamento de fornecedor anexado ainda. Faça upload do PDF ou de uma imagem
              (foto/scan/print) da cotação para extrair módulos, inversores, acessórios e valores.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <label
                htmlFor="input-orcamento-fornecedor-pdf"
                onClick={() => {
                  if (fileInputRef.current && !isAnalyzing && !isAnalyzingImage) {
                    fileInputRef.current.click()
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] cursor-pointer select-none ${
                  isAnalyzing || isAnalyzingImage ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Adicionar Orçamento (PDF)</span>
              </label>

              <label
                htmlFor="input-orcamento-fornecedor-imagem"
                onClick={() => {
                  if (imageInputRef.current && !isAnalyzing && !isAnalyzingImage) {
                    imageInputRef.current.click()
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all hover:scale-[1.01] cursor-pointer select-none ${
                  isAnalyzing || isAnalyzingImage ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Upload por Imagem</span>
              </label>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orcamentosVinculados.map((orc) => {
              const isSelected =
                (fornecedorSelecionadoId && orc.id === fornecedorSelecionadoId) ||
                Boolean(orc.selecionado)

              return (
                <div
                  key={orc.id}
                  className={`p-3 rounded-xl border transition-all shadow-2xs space-y-2 text-xs relative ${
                    isSelected
                      ? 'border-2 border-emerald-600 bg-emerald-50/25 ring-2 ring-emerald-500/15 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -top-2.5 right-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                        <Check className="w-3 h-3" />
                        Aplicado ✓
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-bold text-gray-900 flex items-center gap-1.5">
                        {orc.nome_fornecedor}
                      </h5>
                      <span className="text-[10px] text-gray-500">
                        Revisão: <strong>{orc.numero_revisao || 'REV-01'}</strong> •{' '}
                        {formatDate(orc.data)}
                      </span>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {formatCurrency(orc.valor_total)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (onAplicarAoProjeto) {
                            onAplicarAoProjeto(orc)
                          } else {
                            await selecionarFornecedorOrcamento(orc.id, {
                              orcamentoSolarId,
                              clienteId,
                            })
                            toast.success(`${orc.nome_fornecedor} marcado como ativo!`)
                          }
                        }}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded border transition-colors inline-flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                        title={
                          isSelected
                            ? 'Fornecedor atualmente aplicado ao projeto'
                            : 'Selecionar e aplicar este fornecedor ao projeto'
                        }
                      >
                        <Check className="w-3 h-3" />
                        <span>{isSelected ? 'Fornecedor Ativo' : 'Tornar Ativo'}</span>
                      </button>

                      {orc.arquivo && (
                        <a
                          href={pb.files.getURL(orc, orc.arquivo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => {
                          if (onAplicarAoProjeto) {
                            onAplicarAoProjeto(orc)
                          } else if (onUsarEquipamentos) {
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
                          }
                        }}
                        className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all inline-flex items-center gap-1 ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 hover:scale-[1.02]'
                        }`}
                        title="Aplica o valor total deste fornecedor ao campo 'Materiais / Equipamentos' na aba Custos recalculando todos os totais"
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Aplicado ✓</span>
                          </>
                        ) : (
                          <span>Aplicar ao Projeto</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm('Deseja excluir este orçamento de fornecedor?')) {
                            await removeFornecedorOrcamento(orc.id)
                            toast.success('Orçamento removido.')
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Excluir Cotação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Preenchimento Manual (aberto exclusivamente pelo botão "Preenchimento Manual") */}
      <ModalOrcamentoFornecedorForm
        isOpen={isModalFormOpen}
        onClose={() => {
          setIsModalFormOpen(false)
        }}
        fornecedores={fornecedores}
        arquivoOriginal={analyzedFile}
        onSalvar={executarSalvarOrcamento}
        isSaving={isSaving}
      />

      {/* Modal de Seleção e Classificação Guiada por Imagem (OCR) */}
      <ModalClassificacaoOrcamentoImagem
        isOpen={isModalClassificacaoOpen}
        onClose={() => {
          setIsModalClassificacaoOpen(false)
          setOcrResultado(null)
          setImageFileSelected(null)
        }}
        resultadoAnalise={ocrResultado}
        imagemFile={imageFileSelected}
        fornecedores={fornecedores}
        onConfirmarClassificacao={async (dadosProntos) => {
          setIsModalClassificacaoOpen(false)
          // Salva diretamente o orçamento classificado sem passar pelo modal redundante
          await executarSalvarOrcamento({
            nome_fornecedor: dadosProntos.nome_fornecedor,
            fornecedor_id: dadosProntos.fornecedor_id,
            numero_revisao: dadosProntos.numero_revisao,
            valor_total: dadosProntos.valor_total,
            modulos: dadosProntos.modulos,
            inversores: dadosProntos.inversores,
            acessorios: dadosProntos.acessorios,
            observacoes: dadosProntos.observacoes,
            arquivo: dadosProntos.arquivoOriginal,
          })
        }}
      />

      {/* Modal de Comparação Lado a Lado */}
      <ModalCompararFornecedores
        isOpen={isModalCompararOpen}
        onClose={() => setIsModalCompararOpen(false)}
        orcamentos={orcamentosVinculados}
        orcamentoSolarId={orcamentoSolarId}
        clienteId={clienteId}
        onSelecionarFornecedor={async (orcId) => {
          await selecionarFornecedorOrcamento(orcId, {
            orcamentoSolarId,
            clienteId,
          })
        }}
        onAplicarAoProjeto={(dados) => {
          if (onUsarEquipamentos) {
            onUsarEquipamentos(dados)
          }
          if (onAplicarAoProjeto) {
            const fornEncontrado = orcamentosVinculados.find(
              (o) => o.valor_total === dados.valorTotal || o.nome_fornecedor === dados.marcaPainel,
            )
            if (fornEncontrado) {
              onAplicarAoProjeto(fornEncontrado)
            }
          }
        }}
      />
    </div>
  )
}

export default SecaoOrcamentosFornecedores

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
  Sun,
  Cpu,
  PlusCircle,
  Zap,
  Hash,
} from 'lucide-react'
import { ModalCompararFornecedores } from './ModalCompararFornecedores'
import { ModalClassificacaoOrcamentoImagem } from './ModalClassificacaoOrcamentoImagem'
import { ModalCadastroEquipamentoRapido } from './ModalCadastroEquipamentoRapido'
import { useClientes } from '@/contexts/ClientesContext'
import { FornecedorItemOrcamento, FornecedorOrcamento } from '@/types/crm'
import type { Equipamento, TipoEquipamento } from '@/types/equipamentos'
import { extrairOrcamentoFotovoltaicoPDF } from '@/lib/orcamentoParser'
import { analisarImagemOrcamento, AnaliseImagemResultado } from '@/services/ocrImagemService'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { formatarPotenciaEquipamento, fetchEquipamentos } from '@/services/equipamentosService'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import { ModalOrcamentoFornecedorForm } from './ModalOrcamentoFornecedorForm'

// Helpers de extração heurística de marca, potência e modelo a partir da descrição
export const MARCAS_MODULOS_CONHECIDAS = [
  'RONMA',
  'LUXEN',
  'ERA',
  'Canadian Solar',
  'JA Solar',
  'Jinko',
  'Trina',
  'Longi',
  'Risen',
  'Osda',
  'BYD',
  'Ahn-Solar',
  'Dah Solar',
  'Talesun',
  'Suntech',
  'GCL',
  'Leapton',
  'Astronergy',
  'Chint',
  'WEG',
]

export const MARCAS_INVERSORES_CONHECIDAS = [
  'SOFAR',
  'TSUNESS',
  'DEYE',
  'GROWATT',
  'HUAWEI',
  'SOLIS',
  'SUNGROW',
  'FRONIUS',
  'GOODWE',
  'HOYMILES',
  'SAJ',
  'WEG',
  'APSYSTEMS',
  'ABB',
  'SMA',
  'CHINT',
  'KEHUA',
]

export function extrairInfoModulo(desc: string, qtd: number) {
  const limpa = (desc || '').trim()

  // Extrair potência em Wp: ex "610W", "625W", "620 W", "550 Wp"
  let potenciaWp = 0
  const matchW = limpa.match(/(\d{3,4})\s*W(?:p|\b)/i)
  if (matchW && matchW[1]) {
    const num = parseInt(matchW[1], 10)
    if (num >= 200 && num <= 900) {
      potenciaWp = num
    }
  }

  // Detectar marca
  let marca = ''
  for (const m of MARCAS_MODULOS_CONHECIDAS) {
    const regex = new RegExp(`\\b${m}\\b`, 'i')
    if (regex.test(limpa)) {
      marca = m.toUpperCase()
      break
    }
  }

  // Se não achou na lista conhecida, tenta extrair a primeira palavra que não seja código numérico
  if (!marca) {
    const tokens = limpa.replace(/^\d+\s+/, '').split(/\s+/)
    if (tokens[0] && tokens[0].length >= 3) {
      marca = tokens[0].toUpperCase()
    } else {
      marca = 'Módulo FV'
    }
  }

  // Modelo: descrição sem o código do item inicial se houver (ex: "18197 RONMA 610W..." => modelo limpo)
  const modelo = limpa.replace(/^\d+\s+/, '').trim() || limpa

  return {
    marca,
    modelo,
    potenciaWp,
    quantidade: Math.max(1, qtd || 1),
    descricaoOriginal: limpa,
  }
}

export function extrairInfoInversor(desc: string, qtd: number) {
  const limpa = (desc || '').trim()

  // Extrair potência: pode vir em kW ("10KW", "2.5 kW", "2.5kW", "7.3KTLM", "2.25 kW") ou W ("5000W")
  let potenciaW = 0
  const matchKw = limpa.match(/(\d+(?:[.,]\d+)?)\s*k(?:w|tlm)?\b/i)
  if (matchKw && matchKw[1]) {
    const kw = parseFloat(matchKw[1].replace(',', '.'))
    if (kw > 0 && kw < 200) {
      potenciaW = Math.round(kw * 1000)
    }
  }

  if (potenciaW === 0) {
    // Tenta em W
    const matchW = limpa.match(/(\d{3,5})\s*W\b/i)
    if (matchW && matchW[1]) {
      const w = parseInt(matchW[1], 10)
      if (w >= 1000 && w <= 200000) {
        potenciaW = w
      }
    }
  }

  // Detectar marca
  let marca = ''
  for (const m of MARCAS_INVERSORES_CONHECIDAS) {
    const regex = new RegExp(`\\b${m}\\b`, 'i')
    if (regex.test(limpa)) {
      marca = m.toUpperCase()
      break
    }
  }

  if (!marca) {
    const tokens = limpa.replace(/^\d+\s+/, '').split(/\s+/)
    if (tokens[0] && tokens[0].length >= 3) {
      marca = tokens[0].toUpperCase()
    } else {
      marca = 'Inversor'
    }
  }

  const modelo = limpa.replace(/^\d+\s+/, '').trim() || limpa

  return {
    marca,
    modelo,
    potenciaW,
    quantidade: Math.max(1, qtd || 1),
    descricaoOriginal: limpa,
  }
}

function normalizar(str: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

interface SecaoOrcamentosFornecedoresProps {
  clienteId?: string
  orcamentoSolarId?: string
  fornecedorSelecionadoId?: string
  equipamentos?: Equipamento[]
  onEquipamentoCadastrado?: (novo: Equipamento) => void
  onUsarEquipamentos?: (dados: {
    marcaPainel?: string
    potenciaPlacaWp?: number
    numeroPlacas?: number
    marcaInversor?: string
    quantidadeInversores?: number
    valorTotal?: number
    garantiaModulosFabricacaoAnos?: number
    garantiaInversorAnos?: number
  }) => void
  onAplicarAoProjeto?: (fornecedorOrc: FornecedorOrcamento) => void
}

export function SecaoOrcamentosFornecedores({
  clienteId,
  orcamentoSolarId,
  fornecedorSelecionadoId,
  equipamentos: propEquipamentos,
  onEquipamentoCadastrado,
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

  // Lista de equipamentos para checar se já constam cadastrados no banco
  const [equipamentosInternos, setEquipamentosInternos] = useState<Equipamento[]>([])

  React.useEffect(() => {
    if (!propEquipamentos) {
      Promise.all([fetchEquipamentos('modulo_fv'), fetchEquipamentos('inversor')])
        .then(([m, inv]) => setEquipamentosInternos([...(m || []), ...(inv || [])]))
        .catch((err) =>
          console.warn('Erro ao carregar equipamentos no SecaoOrcamentosFornecedores:', err),
        )
    }
  }, [propEquipamentos])

  const listaEquipamentos = propEquipamentos || equipamentosInternos

  // Estado do modal de cadastro rápido de equipamento
  const [modalCadastro, setModalCadastro] = useState<{
    isOpen: boolean
    tipo: TipoEquipamento
    marca: string
    modelo: string
    potenciaW: number
    fornecedorNome: string
  }>({
    isOpen: false,
    tipo: 'modulo_fv',
    marca: '',
    modelo: '',
    potenciaW: 0,
    fornecedorNome: '',
  })

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {orcamentosVinculados.map((orc) => {
              // Seleção exclusiva: um card está aplicado somente se fornecedorSelecionadoId === orc.id
              // (ou fallback exclusivo pelo primeiro se orc.selecionado e fornecedorSelecionadoId não estiver definido)
              const isSelected = fornecedorSelecionadoId
                ? orc.id === fornecedorSelecionadoId
                : Boolean(orc.selecionado)

              // Extrair dados do Módulo Fotovoltaico
              const itemModuloOriginal = orc.modulos?.[0]
              const infoModulo = itemModuloOriginal?.descricao
                ? extrairInfoModulo(itemModuloOriginal.descricao, itemModuloOriginal.quantidade)
                : null

              // Extrair dados do Inversor Fotovoltaico
              const itemInversorOriginal = orc.inversores?.[0]
              const infoInversor = itemInversorOriginal?.descricao
                ? extrairInfoInversor(
                    itemInversorOriginal.descricao,
                    itemInversorOriginal.quantidade,
                  )
                : null

              // Verificar se módulo já existe no banco de equipamentos
              let moduloEncontrado: Equipamento | null = null
              if (infoModulo) {
                const modulosBanco = listaEquipamentos.filter((e) => e.tipo === 'modulo_fv')
                const marcaNorm = normalizar(infoModulo.marca)
                const modeloNorm = normalizar(infoModulo.modelo)

                for (const eq of modulosBanco) {
                  const eqMarca = normalizar(eq.marca)
                  const eqModelo = normalizar(eq.modelo)
                  if (
                    (eqMarca && marcaNorm.includes(eqMarca)) ||
                    (marcaNorm && eqMarca.includes(marcaNorm))
                  ) {
                    if (infoModulo.potenciaWp > 0 && eq.potencia_w === infoModulo.potenciaWp) {
                      moduloEncontrado = eq
                      break
                    }
                    if (
                      eqModelo &&
                      (modeloNorm.includes(eqModelo) || eqModelo.includes(modeloNorm))
                    ) {
                      moduloEncontrado = eq
                      break
                    }
                  }
                }

                if (!moduloEncontrado && infoModulo.potenciaWp > 0) {
                  const porPot = modulosBanco.filter((e) => e.potencia_w === infoModulo.potenciaWp)
                  if (
                    porPot.length === 1 &&
                    marcaNorm &&
                    normalizar(porPot[0].marca).includes(marcaNorm)
                  ) {
                    moduloEncontrado = porPot[0]
                  }
                }
              }

              // Verificar se inversor já existe no banco de equipamentos
              let inversorEncontrado: Equipamento | null = null
              if (infoInversor) {
                const inversoresBanco = listaEquipamentos.filter((e) => e.tipo === 'inversor')
                const marcaNorm = normalizar(infoInversor.marca)
                const modeloNorm = normalizar(infoInversor.modelo)

                for (const eq of inversoresBanco) {
                  const eqMarca = normalizar(eq.marca)
                  const eqModelo = normalizar(eq.modelo)
                  if (
                    (eqMarca && marcaNorm.includes(eqMarca)) ||
                    (marcaNorm && eqMarca.includes(marcaNorm))
                  ) {
                    if (
                      infoInversor.potenciaW > 0 &&
                      Math.abs(eq.potencia_w - infoInversor.potenciaW) < 100
                    ) {
                      inversorEncontrado = eq
                      break
                    }
                    if (
                      eqModelo &&
                      (modeloNorm.includes(eqModelo) || eqModelo.includes(modeloNorm))
                    ) {
                      inversorEncontrado = eq
                      break
                    }
                  }
                }
              }

              return (
                <div
                  key={orc.id}
                  className={`p-3.5 rounded-xl border transition-all shadow-2xs space-y-3 text-xs relative flex flex-col justify-between ${
                    isSelected
                      ? 'border-2 border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-500/15 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-emerald-300'
                  }`}
                >
                  {/* Badge de topo: apenas o card aplicado exibe '✓ APLICADO ✓' */}
                  {isSelected && (
                    <div className="absolute -top-2.5 right-3">
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs tracking-wider">
                        <Check className="w-3 h-3" />
                        APLICADO ✓
                      </span>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Topo do card: Fornecedor, Revisão e Preço Total */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 leading-snug">
                          {orc.nome_fornecedor}
                        </h5>
                        <span className="text-[10px] text-gray-500">
                          Revisão: <strong>{orc.numero_revisao || 'REV-01'}</strong> •{' '}
                          {formatDate(orc.data)}
                        </span>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 whitespace-nowrap">
                        {formatCurrency(orc.valor_total)}
                      </span>
                    </div>

                    {/* Resumo compacto dos equipamentos extraídos: MÓDULO e INVERSOR */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {/* Subcard Módulo Fotovoltaico */}
                      <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 flex flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                                <Sun className="w-3 h-3 text-amber-600" />
                              </div>
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-800 truncate">
                                Módulo FV
                              </span>
                            </div>

                            {moduloEncontrado ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                ✓ No Banco
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalCadastro({
                                    isOpen: true,
                                    tipo: 'modulo_fv',
                                    marca: infoModulo?.marca || '',
                                    modelo:
                                      infoModulo?.modelo || infoModulo?.descricaoOriginal || '',
                                    potenciaW: infoModulo?.potenciaWp || 550,
                                    fornecedorNome: orc.nome_fornecedor || '',
                                  })
                                }
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white text-emerald-800 border border-emerald-400 hover:bg-emerald-50 transition-colors shadow-2xs whitespace-nowrap"
                                title="Cadastrar este módulo no banco permanente de equipamentos"
                              >
                                <PlusCircle className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Cadastrar no Banco</span>
                              </button>
                            )}
                          </div>

                          {/* Descrição extraída da cotação */}
                          <div className="p-1.5 rounded bg-white border border-gray-200/80">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block leading-tight">
                              Descrição extraída
                            </span>
                            <p
                              className="text-[11px] font-semibold text-gray-900 break-words leading-tight mt-0.5 line-clamp-2"
                              title={infoModulo?.descricaoOriginal || itemModuloOriginal?.descricao}
                            >
                              {infoModulo?.descricaoOriginal || itemModuloOriginal?.descricao || (
                                <span className="text-gray-400 italic">
                                  Módulo não discriminado
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Métricas: Marca / Potência / Quantidade */}
                          <div className="grid grid-cols-3 gap-1 text-center pt-0.5">
                            <div className="bg-white p-1 rounded border border-gray-200">
                              <span className="text-[8.5px] font-bold text-gray-400 uppercase block">
                                Marca
                              </span>
                              <span className="text-[10px] font-bold text-gray-800 truncate block">
                                {moduloEncontrado?.marca || infoModulo?.marca || '—'}
                              </span>
                            </div>
                            <div className="bg-white p-1 rounded border border-gray-200">
                              <span className="text-[8.5px] font-bold text-gray-400 uppercase block">
                                Potência
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 text-emerald-500" />
                                {infoModulo?.potenciaWp ? `${infoModulo.potenciaWp} Wp` : '—'}
                              </span>
                            </div>
                            <div className="bg-white p-1 rounded border border-gray-200">
                              <span className="text-[8.5px] font-bold text-gray-400 uppercase block">
                                Qtd
                              </span>
                              <span className="text-[10px] font-black text-gray-900 flex items-center justify-center gap-0.5">
                                <Hash className="w-2.5 h-2.5 text-gray-400" />
                                {infoModulo?.quantidade ?? itemModuloOriginal?.quantidade ?? 0} un
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Subcard Inversor Fotovoltaico */}
                      <div className="p-2.5 rounded-lg border border-gray-200 bg-gray-50/70 flex flex-col justify-between space-y-2">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                                <Cpu className="w-3 h-3 text-blue-600" />
                              </div>
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-800 truncate">
                                Inversor FV
                              </span>
                            </div>

                            {inversorEncontrado ? (
                              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                                ✓ No Banco
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalCadastro({
                                    isOpen: true,
                                    tipo: 'inversor',
                                    marca: infoInversor?.marca || '',
                                    modelo:
                                      infoInversor?.modelo || infoInversor?.descricaoOriginal || '',
                                    potenciaW: infoInversor?.potenciaW || 5000,
                                    fornecedorNome: orc.nome_fornecedor || '',
                                  })
                                }
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white text-emerald-800 border border-emerald-400 hover:bg-emerald-50 transition-colors shadow-2xs whitespace-nowrap"
                                title="Cadastrar este inversor no banco permanente de equipamentos"
                              >
                                <PlusCircle className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Cadastrar no Banco</span>
                              </button>
                            )}
                          </div>

                          {/* Descrição extraída da cotação */}
                          <div className="p-1.5 rounded bg-white border border-gray-200/80">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block leading-tight">
                              Descrição extraída
                            </span>
                            <p
                              className="text-[11px] font-semibold text-gray-900 break-words leading-tight mt-0.5 line-clamp-2"
                              title={
                                infoInversor?.descricaoOriginal || itemInversorOriginal?.descricao
                              }
                            >
                              {infoInversor?.descricaoOriginal ||
                                itemInversorOriginal?.descricao || (
                                  <span className="text-gray-400 italic">
                                    Inversor não discriminado
                                  </span>
                                )}
                            </p>
                          </div>

                          {/* Métricas: Marca / Potência / Quantidade */}
                          <div className="grid grid-cols-3 gap-1 text-center pt-0.5">
                            <div className="bg-white p-1 rounded border border-gray-200">
                              <span className="text-[8.5px] font-bold text-gray-400 uppercase block">
                                Marca
                              </span>
                              <span className="text-[10px] font-bold text-gray-800 truncate block">
                                {inversorEncontrado?.marca || infoInversor?.marca || '—'}
                              </span>
                            </div>
                            <div className="bg-white p-1 rounded border border-gray-200">
                              <span className="text-[8.5px] font-bold text-gray-400 uppercase block">
                                Potência
                              </span>
                              <span className="text-[10px] font-bold text-blue-700 flex items-center justify-center gap-0.5">
                                <Zap className="w-2.5 h-2.5 text-blue-500" />
                                {infoInversor?.potenciaW
                                  ? formatarPotenciaEquipamento(infoInversor.potenciaW)
                                  : '—'}
                              </span>
                            </div>
                            <div className="bg-white p-1 rounded border border-gray-200">
                              <span className="text-[8.5px] font-bold text-gray-400 uppercase block">
                                Qtd
                              </span>
                              <span className="text-[10px] font-black text-gray-900 flex items-center justify-center gap-0.5">
                                <Hash className="w-2.5 h-2.5 text-gray-400" />
                                {infoInversor?.quantidade ??
                                  itemInversorOriginal?.quantidade ??
                                  0}{' '}
                                un
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé do Card: Link PDF e Ação Exclusiva de Aplicação */}
                  <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] flex-wrap gap-2 mt-auto">
                    <div className="flex items-center gap-2">
                      {orc.arquivo && (
                        <a
                          href={pb.files.getURL(orc, orc.arquivo)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>PDF</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
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
                            if (onUsarEquipamentos) {
                              onUsarEquipamentos({
                                marcaPainel: moduloEncontrado
                                  ? `${moduloEncontrado.marca} ${moduloEncontrado.modelo}`
                                  : infoModulo?.descricaoOriginal || itemModuloOriginal?.descricao,
                                potenciaPlacaWp:
                                  moduloEncontrado?.potencia_w || infoModulo?.potenciaWp || 550,
                                numeroPlacas:
                                  infoModulo?.quantidade || itemModuloOriginal?.quantidade || 10,
                                marcaInversor: inversorEncontrado
                                  ? `${inversorEncontrado.marca} ${inversorEncontrado.modelo}`
                                  : infoInversor?.descricaoOriginal ||
                                    itemInversorOriginal?.descricao,
                                quantidadeInversores:
                                  infoInversor?.quantidade || itemInversorOriginal?.quantidade || 1,
                                valorTotal: orc.valor_total,
                                garantiaModulosFabricacaoAnos:
                                  moduloEncontrado?.garantia_anos || undefined,
                                garantiaInversorAnos:
                                  inversorEncontrado?.garantia_anos || undefined,
                              })
                            }
                            toast.success(`${orc.nome_fornecedor} aplicado ao projeto!`)
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all inline-flex items-center gap-1.5 shadow-2xs ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-xs cursor-default'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 hover:scale-[1.02] cursor-pointer'
                        }`}
                        title={
                          isSelected
                            ? 'Cotação atualmente aplicada ao projeto'
                            : 'Aplica o valor e equipamentos desta cotação ao projeto, recalculando a planilha de custos'
                        }
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>✓ Aplicado</span>
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
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
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

      {/* Modal de Cadastro Rápido de Equipamento */}
      <ModalCadastroEquipamentoRapido
        isOpen={modalCadastro.isOpen}
        onClose={() => setModalCadastro((prev) => ({ ...prev, isOpen: false }))}
        tipoInicial={modalCadastro.tipo}
        marcaInicial={modalCadastro.marca}
        modeloInicial={modalCadastro.modelo}
        potenciaInicial={modalCadastro.potenciaW}
        fornecedorNome={modalCadastro.fornecedorNome}
        onEquipamentoCadastrado={(novo) => {
          setEquipamentosInternos((prev) => [novo, ...prev.filter((e) => e.id !== novo.id)])
          onEquipamentoCadastrado?.(novo)
        }}
      />
    </div>
  )
}

export default SecaoOrcamentosFornecedores

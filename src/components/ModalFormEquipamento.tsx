import React, { useState, useEffect, useRef } from 'react'
import {
  Cpu,
  Sun,
  Wrench,
  AlertCircle,
  X,
  FileText,
  ExternalLink,
  CheckCircle2,
  FileUp,
  AlertTriangle,
  Link as LinkIcon,
  Phone,
  Building2,
  Settings,
  Info,
  Upload,
  RefreshCw,
  Plus,
  Edit2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Equipamento, TipoEquipamento, ConfiguracaoMonitoramento } from '@/types/equipamentos'
import type { Fornecedor } from '@/types/crm'
import {
  createEquipamento,
  updateEquipamento,
  getFotoEquipamentoUrl,
  getDatasheetEquipamentoUrl,
  converterInputParaWatts,
  converterWattsParaInput,
  getUnidadePorTipo,
  getRotuloCampoPotencia,
} from '@/services/equipamentosService'
import {
  fetchConfiguracoesMonitoramento,
  sugerirConfiguracaoPorMarca,
  getProcedimentoMonitoramentoUrl,
} from '@/services/configuracoesMonitoramentoService'
import { fetchFornecedores } from '@/services/crmService'
import { extractDatasheetFromPdf } from '@/lib/datasheetExtractor'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { MonitoramentoConfigBadge } from './MonitoramentoConfigBadge'

export interface ModalFormEquipamentoProps {
  isOpen: boolean
  onClose: () => void
  editingItem?: Equipamento | null
  tipoInicial?: TipoEquipamento
  fornecedores?: Fornecedor[]
  configuracoesMonitoramento?: ConfiguracaoMonitoramento[]
  onSalvo?: (equipamentoSalvo: Equipamento, isEdicao: boolean) => void | Promise<void>
}

export function ModalFormEquipamento({
  isOpen,
  onClose,
  editingItem = null,
  tipoInicial = 'inversor',
  fornecedores: fornecedoresProp,
  configuracoesMonitoramento: configuracoesProp,
  onSalvo,
}: ModalFormEquipamentoProps) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(fornecedoresProp || [])
  const [configuracoesMonitoramento, setConfiguracoesMonitoramento] = useState<
    ConfiguracaoMonitoramento[]
  >(configuracoesProp || [])

  // Campos do formulário
  const [tipo, setTipo] = useState<TipoEquipamento>(tipoInicial)
  const [marca, setMarca] = useState<string>('')
  const [modelo, setModelo] = useState<string>('')
  const [potenciaInput, setPotenciaInput] = useState<string>('')
  const [descricaoPadrao, setDescricaoPadrao] = useState<string>('')
  const [garantiaAnos, setGarantiaAnos] = useState<string>('')
  const [datasheetUrl, setDatasheetUrl] = useState<string>('')
  const [dataloggerUrl, setDataloggerUrl] = useState<string>('')
  const [configuracaoMonitoramentoId, setConfiguracaoMonitoramentoId] = useState<string>('')
  const [configuracaoAlteradaManualmente, setConfiguracaoAlteradaManualmente] =
    useState<boolean>(false)
  const [fornecedorId, setFornecedorId] = useState<string>('')
  const [telefoneSuporte, setTelefoneSuporte] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removerFotoExistente, setRemoverFotoExistente] = useState<boolean>(false)

  // Datasheet PDF
  const [selectedDatasheetFile, setSelectedDatasheetFile] = useState<File | null>(null)
  const [datasheetExistenteUrl, setDatasheetExistenteUrl] = useState<string | null>(null)
  const [removerDatasheetExistente, setRemoverDatasheetExistente] = useState<boolean>(false)
  const [isExtractingPdf, setIsExtractingPdf] = useState<boolean>(false)
  const [extracaoStatus, setExtracaoStatus] = useState<
    | { tipo: 'sucesso'; camposQtd: number; campos: string }
    | { tipo: 'aviso'; mensagem: string }
    | null
  >(null)
  const datasheetInputRef = useRef<HTMLInputElement>(null)

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carregar fornecedores e configurações de monitoramento caso não tenham sido passados por prop
  useEffect(() => {
    if (fornecedoresProp && fornecedoresProp.length > 0) {
      setFornecedores(fornecedoresProp)
    } else if (isOpen) {
      fetchFornecedores()
        .then((data) => setFornecedores(data || []))
        .catch((err) => console.error('Erro ao carregar fornecedores no modal:', err))
    }

    if (configuracoesProp && configuracoesProp.length > 0) {
      setConfiguracoesMonitoramento(configuracoesProp)
    } else if (isOpen) {
      fetchConfiguracoesMonitoramento()
        .then((data) => setConfiguracoesMonitoramento(data || []))
        .catch((err) => console.error('Erro ao carregar configurações de monitoramento:', err))
    }
  }, [fornecedoresProp, configuracoesProp, isOpen])

  // Resetar/popular campos quando o modal abre ou editingItem muda
  useEffect(() => {
    if (!isOpen) return

    if (editingItem) {
      setTipo(editingItem.tipo)
      setMarca(editingItem.marca || '')
      setModelo(editingItem.modelo || '')
      setPotenciaInput(converterWattsParaInput(editingItem.potencia_w, editingItem.tipo))
      setDescricaoPadrao(editingItem.descricao_padrao || '')
      setGarantiaAnos(
        editingItem.garantia_anos !== undefined && editingItem.garantia_anos !== null
          ? String(editingItem.garantia_anos)
          : '',
      )
      setDatasheetUrl(editingItem.datasheet_url || '')
      setDataloggerUrl(editingItem.datalogger_url || '')
      setConfiguracaoMonitoramentoId(editingItem.configuracao_monitoramento_id || '')
      setConfiguracaoAlteradaManualmente(Boolean(editingItem.configuracao_monitoramento_id))
      setFornecedorId(editingItem.fornecedor_id || '')
      setTelefoneSuporte(editingItem.telefone_suporte_fornecedor || '')
      setSelectedFile(null)
      setRemoverFotoExistente(false)
      const urlAtual = getFotoEquipamentoUrl(editingItem)
      setPreviewUrl(urlAtual)

      setSelectedDatasheetFile(null)
      const urlDatasheet = getDatasheetEquipamentoUrl(editingItem)
      setDatasheetExistenteUrl(urlDatasheet)
      setRemoverDatasheetExistente(false)
      setExtracaoStatus(null)
      setErrorMessage(null)
    } else {
      setTipo(tipoInicial)
      setMarca('')
      setModelo('')
      setPotenciaInput('')
      setDescricaoPadrao('')
      setGarantiaAnos('')
      setDatasheetUrl('')
      setDataloggerUrl('')
      setConfiguracaoMonitoramentoId('')
      setConfiguracaoAlteradaManualmente(false)
      setFornecedorId('')
      setTelefoneSuporte('')
      setSelectedFile(null)
      setPreviewUrl(null)
      setRemoverFotoExistente(false)
      setSelectedDatasheetFile(null)
      setDatasheetExistenteUrl(null)
      setRemoverDatasheetExistente(false)
      setExtracaoStatus(null)
      setErrorMessage(null)
    }
  }, [isOpen, editingItem, tipoInicial])

  // Sugestão automática de configuração de monitoramento ao alterar a marca (apenas se tipo === 'inversor')
  const handleMarcaChange = (novaMarca: string) => {
    setMarca(novaMarca)
    if (errorMessage) setErrorMessage(null)

    // Se o usuário não alterou manualmente a configuração e for inversor, tenta sugerir por marca
    if (tipo === 'inversor' && !configuracaoAlteradaManualmente) {
      const sugestao = sugerirConfiguracaoPorMarca(novaMarca, configuracoesMonitoramento)
      if (sugestao) {
        setConfiguracaoMonitoramentoId(sugestao.id)
      } else if (!novaMarca.trim()) {
        setConfiguracaoMonitoramentoId('')
      }
    }
  }

  // Preencher telefone de suporte se mudar o fornecedor e o campo estiver vazio
  const handleFornecedorChange = (novoId: string) => {
    setFornecedorId(novoId)
    if (novoId) {
      const forn = fornecedores.find((f) => f.id === novoId)
      if (forn && (!telefoneSuporte || !telefoneSuporte.trim())) {
        const tel = forn.telefone_suporte || forn.telefone || forn.whatsapp || ''
        if (tel) setTelefoneSuporte(tel)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const maxBytes = 10 * 1024 * 1024
      if (file.size > maxBytes) {
        const msg = `O arquivo selecionado (${(file.size / (1024 * 1024)).toFixed(1)} MB) ultrapassa o limite máximo de 10 MB.`
        setErrorMessage(msg)
        toast.error(msg)
        return
      }
      setErrorMessage(null)
      setSelectedFile(file)
      setRemoverFotoExistente(false)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemoverFotoExistente(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDatasheetFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Por favor, selecione um arquivo em formato PDF.')
      return
    }

    const maxBytes = 10 * 1024 * 1024
    if (file.size > maxBytes) {
      toast.error('O arquivo PDF ultrapassa o limite de 10 MB.')
      return
    }

    setSelectedDatasheetFile(file)
    setRemoverDatasheetExistente(false)

    // Extração automática via PDF
    setIsExtractingPdf(true)
    setExtracaoStatus(null)

    try {
      const extraidos = await extractDatasheetFromPdf(file)

      const camposPreenchidos: string[] = []

      if (extraidos.marca) {
        setMarca(extraidos.marca)
        camposPreenchidos.push('Marca')
        // Sugerir configuração de monitoramento compatível
        if ((extraidos.tipo || tipo) === 'inversor' && !configuracaoAlteradaManualmente) {
          const sug = sugerirConfiguracaoPorMarca(extraidos.marca, configuracoesMonitoramento)
          if (sug) {
            setConfiguracaoMonitoramentoId(sug.id)
            camposPreenchidos.push('Config. Monitoramento')
          }
        }
      }
      if (extraidos.modelo) {
        setModelo(extraidos.modelo)
        camposPreenchidos.push('Modelo')
      }
      const tipoFinal = extraidos.tipo || tipo
      if (extraidos.potencia_w) {
        setPotenciaInput(converterWattsParaInput(extraidos.potencia_w, tipoFinal))
        camposPreenchidos.push('Potência')
      }
      if (extraidos.garantia_anos !== undefined && extraidos.garantia_anos !== null) {
        setGarantiaAnos(String(extraidos.garantia_anos))
        camposPreenchidos.push('Garantia')
      }
      if (extraidos.descricao_padrao) {
        setDescricaoPadrao(extraidos.descricao_padrao)
        camposPreenchidos.push('Descrição')
      }
      if (extraidos.tipo) {
        setTipo(extraidos.tipo)
      }

      if (camposPreenchidos.length > 0) {
        setExtracaoStatus({
          tipo: 'sucesso',
          camposQtd: camposPreenchidos.length,
          campos: camposPreenchidos.join(', '),
        })
        toast.success(
          `Dados extraídos (${camposPreenchidos.join(', ')})! Revise os campos antes de salvar.`,
          { duration: 5000 },
        )
      } else if (extraidos.isScanSemTexto) {
        setExtracaoStatus({
          tipo: 'aviso',
          mensagem: 'PDF parece ser digitalizado/imagem — preencha manualmente',
        })
        toast.warning(
          'Não foi possível ler o PDF automaticamente — o arquivo parece ser digitalizado/imagem; preencha os dados manualmente.',
          { duration: 6000 },
        )
      } else {
        setExtracaoStatus({
          tipo: 'aviso',
          mensagem: 'PDF lido, mas nenhum dado foi reconhecido — preencha manualmente',
        })
        toast.info(
          'Datasheet lido, mas nenhum dado técnico foi reconhecido com certeza. Preencha os campos manualmente.',
          { duration: 6000 },
        )
      }
    } catch (err) {
      console.error('Erro na extração do datasheet PDF:', err)
      setExtracaoStatus({
        tipo: 'aviso',
        mensagem: 'Falha na leitura automática do PDF — preencha manualmente',
      })
      toast.warning(
        'Datasheet anexado, mas houve falha na leitura dos dados. Preencha os campos manualmente.',
      )
    } finally {
      setIsExtractingPdf(false)
    }
  }

  const handleRemoveDatasheet = () => {
    setSelectedDatasheetFile(null)
    setDatasheetExistenteUrl(null)
    setRemoverDatasheetExistente(true)
    setExtracaoStatus(null)
    if (datasheetInputRef.current) {
      datasheetInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!marca.trim()) {
      setErrorMessage('Por favor, informe a marca do equipamento.')
      return
    }
    if (!modelo.trim()) {
      setErrorMessage('Por favor, informe o modelo do equipamento.')
      return
    }

    const cleanedPotencia = potenciaInput.trim().replace(',', '.')
    const potenciaNum = parseFloat(cleanedPotencia)
    if (!cleanedPotencia || isNaN(potenciaNum) || potenciaNum <= 0) {
      setErrorMessage(
        tipo === 'modulo_fv'
          ? 'Por favor, informe uma potência válida em Watts (W) para a placa solar (ex: 550 ou 585).'
          : 'Por favor, informe uma potência válida em kW para o inversor (ex: 5 ou 6).',
      )
      return
    }
    const potenciaWatts = converterInputParaWatts(potenciaNum, tipo)

    let garantiaNum: number | null = null
    if (garantiaAnos.trim()) {
      const g = parseInt(garantiaAnos.trim(), 10)
      if (isNaN(g) || g < 0) {
        setErrorMessage('Por favor, informe um número válido de anos para a garantia.')
        return
      }
      garantiaNum = g
    }

    try {
      setIsSubmitting(true)

      const payload = {
        tipo,
        marca: marca.trim(),
        modelo: modelo.trim(),
        potencia_w: potenciaWatts,
        descricao_padrao: descricaoPadrao.trim(),
        garantia_anos: garantiaNum,
        datasheet_url: datasheetUrl.trim(),
        datalogger_url: dataloggerUrl.trim(),
        configuracao_monitoramento_id: configuracaoMonitoramentoId || undefined,
        fornecedor_id: fornecedorId || undefined,
        telefone_suporte_fornecedor: telefoneSuporte.trim(),
      }

      let salvo: Equipamento
      if (editingItem) {
        salvo = await updateEquipamento(
          editingItem.id,
          payload,
          selectedFile || undefined,
          removerFotoExistente,
          selectedDatasheetFile || undefined,
          removerDatasheetExistente,
        )
        toast.success('Equipamento atualizado com sucesso!')
      } else {
        salvo = await createEquipamento(
          payload,
          selectedFile || undefined,
          selectedDatasheetFile || undefined,
        )
        toast.success('Equipamento cadastrado com sucesso!')
      }

      if (onSalvo) {
        await onSalvo(salvo, Boolean(editingItem))
      }
      onClose()
    } catch (err: any) {
      console.error('Erro ao salvar equipamento:', err)
      let mensagemDetalhada = 'Falha ao salvar equipamento. Verifique os dados e tente novamente.'

      const fieldErrors = extractFieldErrors(err)
      const errorKeys = Object.keys(fieldErrors)

      if (errorKeys.length > 0) {
        const detalhes = errorKeys
          .map((k) => {
            const rotulos: Record<string, string> = {
              tipo: 'Tipo',
              marca: 'Marca',
              modelo: 'Modelo',
              potencia_w: tipo === 'modulo_fv' ? 'Potência (W)' : 'Potência (kW)',
              descricao_padrao: 'Descrição Padrão',
              garantia_anos: 'Garantia (anos)',
              foto: 'Foto',
            }
            const nomeCampo = rotulos[k] || k
            return `${nomeCampo}: ${fieldErrors[k]}`
          })
          .join('. ')
        mensagemDetalhada = `Erro de validação: ${detalhes}`
      } else if (err?.message) {
        if (err.message.includes('file too large') || err.message.includes('maxSize')) {
          mensagemDetalhada = 'O arquivo de imagem enviado é muito grande (máximo 10MB).'
        } else {
          mensagemDetalhada = `Erro: ${err.message}`
        }
      }

      setErrorMessage(mensagemDetalhada)
      toast.error(mensagemDetalhada)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Topo do Modal */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              {editingItem ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h2>
              <p className="text-[11px] text-gray-500">
                Preencha as especificações para uso nas propostas comerciais e ativos de usina
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Alerta de erro */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex items-start gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Não foi possível salvar</p>
                <p className="text-red-700 mt-0.5">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-red-400 hover:text-red-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Tipo de Equipamento */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1.5">
              Tipo de Equipamento *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (tipo !== 'inversor') {
                    // Se estiver trocando de módulo (W) para inversor (kW), converte valor se existir
                    const num = parseFloat(potenciaInput.replace(',', '.'))
                    if (!isNaN(num) && num > 0) {
                      const potW = converterInputParaWatts(num, tipo)
                      setPotenciaInput(converterWattsParaInput(potW, 'inversor'))
                    }
                    setTipo('inversor')
                  }
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  tipo === 'inversor'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Cpu
                  className={`w-4 h-4 ${tipo === 'inversor' ? 'text-blue-600' : 'text-gray-400'}`}
                />
                <span>Inversor</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tipo !== 'modulo_fv') {
                    // Se estiver trocando de inversor (kW) para módulo (W), converte valor se existir
                    const num = parseFloat(potenciaInput.replace(',', '.'))
                    if (!isNaN(num) && num > 0) {
                      const potW = converterInputParaWatts(num, tipo)
                      setPotenciaInput(converterWattsParaInput(potW, 'modulo_fv'))
                    }
                    setTipo('modulo_fv')
                  }
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  tipo === 'modulo_fv'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-1 ring-amber-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Sun
                  className={`w-4 h-4 ${tipo === 'modulo_fv' ? 'text-amber-600' : 'text-gray-400'}`}
                />
                <span>Módulo FV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (tipo !== 'outro') {
                    const num = parseFloat(potenciaInput.replace(',', '.'))
                    if (!isNaN(num) && num > 0) {
                      const potW = converterInputParaWatts(num, tipo)
                      setPotenciaInput(converterWattsParaInput(potW, 'outro'))
                    }
                    setTipo('outro')
                  }
                }}
                className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  tipo === 'outro'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs ring-1 ring-purple-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Wrench
                  className={`w-4 h-4 ${tipo === 'outro' ? 'text-purple-600' : 'text-gray-400'}`}
                />
                <span>Outro</span>
              </button>
            </div>
          </div>

          {/* Marca e Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Marca *
              </label>
              <input
                type="text"
                required
                value={marca}
                onChange={(e) => handleMarcaChange(e.target.value)}
                placeholder="Ex: Huawei, Growatt, JA Solar"
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Modelo *
              </label>
              <input
                type="text"
                required
                value={modelo}
                onChange={(e) => {
                  setModelo(e.target.value)
                  if (errorMessage) setErrorMessage(null)
                }}
                placeholder="Ex: SUN2000-6KTL-L1, JAM66D45LB"
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Potência (W para Placas, kW para Inversores) e Garantia (anos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                {getRotuloCampoPotencia(tipo)} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  required
                  value={potenciaInput}
                  onChange={(e) => {
                    setPotenciaInput(e.target.value)
                    if (errorMessage) setErrorMessage(null)
                  }}
                  placeholder={
                    tipo === 'modulo_fv'
                      ? 'Ex: 550 para painel de 550 W'
                      : 'Ex: 6 para inversor de 6 kW'
                  }
                  className="w-full text-xs font-semibold pl-3 pr-10 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 pointer-events-none">
                  {getUnidadePorTipo(tipo)}
                </span>
              </div>
              <span className="text-[10px] text-gray-500 block mt-1">
                {(() => {
                  const potNum = parseFloat((potenciaInput || '').replace(',', '.'))
                  if (isNaN(potNum) || potNum <= 0) {
                    return tipo === 'modulo_fv'
                      ? 'Placa solar unitária: sempre em Watts (W). Ex: 550 W, 585 W.'
                      : 'Inversor: sempre em kW. Ex: 5 kW, 6 kW, 7.5 kW.'
                  }
                  const potWatts = converterInputParaWatts(potNum, tipo)
                  const potKw = (potWatts / 1000).toLocaleString('pt-BR', {
                    maximumFractionDigits: 3,
                  })
                  const potW = Math.round(potWatts).toLocaleString('pt-BR')
                  return tipo === 'modulo_fv'
                    ? `Equivale a ${potKw} kW no sistema (${potW} W)`
                    : `Equivale a ${potW} W no sistema (${potKw} kW)`
                })()}
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Garantia (anos)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={garantiaAnos}
                  onChange={(e) => setGarantiaAnos(e.target.value)}
                  placeholder="Ex: 5, 10 ou 12"
                  className="w-full text-xs font-semibold pl-3 pr-14 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 pointer-events-none">
                  anos
                </span>
              </div>
              <span className="text-[10px] text-gray-400 block mt-1">
                Tempo de garantia legal/de fábrica
              </span>
            </div>
          </div>

          {/* Links Técnicos: Datasheet URL e Datalogger URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1 mb-1">
                <LinkIcon className="w-3 h-3 text-emerald-600" />
                <span>Link do Datasheet (URL)</span>
              </label>
              <input
                type="url"
                value={datasheetUrl}
                onChange={(e) => setDatasheetUrl(e.target.value)}
                placeholder="https://exemplo.com/datasheet.pdf"
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-[10px] text-gray-400 block mt-1">
                Link direto do fabricante ou catálogo online
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1 mb-1">
                <Settings className="w-3 h-3 text-blue-600" />
                <span>Link Datalogger (URL)</span>
              </label>
              <input
                type="url"
                value={dataloggerUrl}
                onChange={(e) => setDataloggerUrl(e.target.value)}
                placeholder="https://server.growatt.com ou IP local"
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-[10px] text-gray-400 block mt-1">
                Link para configurar o monitoramento/datalogger
              </span>
            </div>
          </div>

          {/* Bloco Configuração de Monitoramento (Específico para Inversor) */}
          {tipo === 'inversor' && (
            <div className="p-3.5 bg-gradient-to-r from-emerald-50/70 to-blue-50/70 rounded-2xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-gray-800 uppercase flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Configuração de Monitoramento (Datalogger)</span>
                </label>
                {configuracaoMonitoramentoId && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300">
                    Vínculo ativo
                  </span>
                )}
              </div>

              <p className="text-[11px] text-gray-600 leading-relaxed">
                O sistema sugere automaticamente o procedimento compatível com base na marca
                informada. Você pode selecionar ou trocar para outra configuração se desejar.
              </p>

              <div className="space-y-2 pt-1">
                <select
                  value={configuracaoMonitoramentoId}
                  onChange={(e) => {
                    setConfiguracaoMonitoramentoId(e.target.value)
                    setConfiguracaoAlteradaManualmente(true)
                  }}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="">Nenhuma configuração vinculada</option>
                  {configuracoesMonitoramento.map((cfg) => {
                    const rotuloTipo = cfg.arquivo_pdf ? 'PDF' : 'Link'
                    return (
                      <option key={cfg.id} value={cfg.id}>
                        {cfg.marca} - {cfg.titulo || 'Configuração'} ({rotuloTipo})
                      </option>
                    )
                  })}
                </select>

                {/* Exibição do Item Anexado (estilo datasheet) */}
                {configuracaoMonitoramentoId &&
                  (() => {
                    const cfgSelecionada = configuracoesMonitoramento.find(
                      (c) => c.id === configuracaoMonitoramentoId,
                    )
                    if (!cfgSelecionada) return null

                    const { url, tipo: tipoItem } = getProcedimentoMonitoramentoUrl(cfgSelecionada)

                    return (
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between gap-2 shadow-2xs">
                        <div className="flex items-center gap-2 min-w-0">
                          {tipoItem === 'pdf' ? (
                            <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="text-xs font-bold text-gray-800 block truncate">
                              {cfgSelecionada.titulo ||
                                `Configuração Datalogger - ${cfgSelecionada.marca}`}
                            </span>
                            <span className="text-[10px] text-gray-500 block truncate">
                              Marca: {cfgSelecionada.marca} • Formato:{' '}
                              {tipoItem === 'pdf' ? 'Documento PDF' : 'Link / Vídeo'}
                            </span>
                          </div>
                        </div>

                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors shrink-0"
                            title={
                              tipoItem === 'pdf'
                                ? 'Abrir PDF do passo a passo'
                                : 'Acessar link do procedimento'
                            }
                          >
                            <span>{tipoItem === 'pdf' ? 'Abrir PDF' : 'Acessar Link'}</span>
                            <ExternalLink className="w-3 h-3 text-emerald-700 ml-0.5" />
                          </a>
                        )}
                      </div>
                    )
                  })()}
              </div>
            </div>
          )}

          {/* Fornecedor e Telefone do Suporte */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1 mb-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                <span>Fornecedor (Menu Fornecedores)</span>
              </label>
              <select
                value={fornecedorId}
                onChange={(e) => handleFornecedorChange(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
              >
                <option value="">Selecione um fornecedor cadastrado...</option>
                {fornecedores.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_empresa} {f.cidade ? `(${f.cidade}/${f.uf || ''})` : ''}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gray-400 block mt-1">
                Vinculado ao menu de fornecedores do CRM
              </span>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>Telefone Suporte do Fornecedor</span>
              </label>
              <input
                type="text"
                value={telefoneSuporte}
                onChange={(e) => setTelefoneSuporte(e.target.value)}
                placeholder="(54) 99999-9999 ou 0800..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="text-[10px] text-gray-400 block mt-1">
                Suporte técnico / WhatsApp da garantia
              </span>
            </div>
          </div>

          {/* Descrição Padrão */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-gray-700 uppercase block">
                Descrição padrão
              </label>
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                <Info className="w-3 h-3" />
                Texto que aparecerá na proposta
              </span>
            </div>
            <textarea
              rows={3}
              value={descricaoPadrao}
              onChange={(e) => setDescricaoPadrao(e.target.value)}
              placeholder="Ex: Inversor monofásico com 2 MPPTs, Wi-Fi integrado e monitoramento inteligente..."
              className="w-full text-xs px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-y"
            />
          </div>

          {/* Foto do Equipamento */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1.5">
              Foto do equipamento (opcional)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors border border-gray-200 active:scale-95"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-700" />
                <span>Selecionar Imagem</span>
              </button>

              {previewUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                >
                  Remover Foto
                </button>
              )}
            </div>
            <span className="text-[10px] text-gray-400 block mt-1">
              JPG, PNG ou WEBP com fundo branco ou transparente (máx. 10 MB).
            </span>

            {/* Preview */}
            {previewUrl && (
              <div className="mt-3">
                <span className="text-[10px] font-bold text-gray-500 block mb-1">
                  Pré-visualização:
                </span>
                <div className="relative h-36 bg-gray-50 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center p-2">
                  <img
                    src={previewUrl}
                    alt="Pré-visualização do equipamento"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Upload do Datasheet (PDF) com Extração Automática */}
          <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Upload do Datasheet Técnico (PDF)</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                Extração Automática
              </span>
            </div>

            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Envie o PDF do datasheet para preencher automaticamente marca, modelo, potência (em W
              para placas e kW para inversores), garantia, eficiência e descrição técnica
              priorizando a tabela técnica. Você poderá revisar e corrigir antes de salvar.
            </p>

            <input
              type="file"
              ref={datasheetInputRef}
              accept="application/pdf"
              onChange={handleDatasheetFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => datasheetInputRef.current?.click()}
                disabled={isExtractingPdf}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95 disabled:opacity-50"
              >
                {isExtractingPdf ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extraindo dados do PDF...</span>
                  </>
                ) : (
                  <>
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Selecionar PDF do Datasheet</span>
                  </>
                )}
              </button>

              {(selectedDatasheetFile || (datasheetExistenteUrl && !removerDatasheetExistente)) && (
                <button
                  type="button"
                  onClick={handleRemoveDatasheet}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
                >
                  Remover PDF
                </button>
              )}

              {datasheetExistenteUrl && !selectedDatasheetFile && !removerDatasheetExistente && (
                <a
                  href={datasheetExistenteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 rounded-xl transition-colors border border-emerald-300 inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ver PDF Atual</span>
                </a>
              )}
            </div>

            {/* Status do Arquivo Selecionado */}
            {selectedDatasheetFile && (
              <div className="mt-2 p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold text-gray-800 truncate">
                    {selectedDatasheetFile.name}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    ({(selectedDatasheetFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>

                {extracaoStatus?.tipo === 'sucesso' && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0"
                    title={`Campos extraídos: ${extracaoStatus.campos}`}
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Dados extraídos ({extracaoStatus.camposQtd})
                  </span>
                )}

                {extracaoStatus?.tipo === 'aviso' && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300 shrink-0 max-w-[240px] truncate"
                    title={extracaoStatus.mensagem}
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">{extracaoStatus.mensagem}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Equipamento'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
export default ModalFormEquipamento

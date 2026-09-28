import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  FileText,
  Camera,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  User,
  MapPin,
  Zap,
  BarChart3,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react'
import {
  analisarFaturaRGEGemini,
  type FaturaRGEDadosExtraidos,
  type HistoricoConsumoItem,
} from '@/services/faturaRGEService'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'

export interface DadosImportadosContaRGE {
  nome?: string
  razao_social?: string
  cpf_cnpj?: string
  cnpj?: string
  cpf?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  uc?: string
  numero_uc?: string
  classificacao_grupo_subgrupo?: string
  tipo_fornecimento?: string
  tensao_nominal?: string
  consumo_kwh_mes?: number
  consumo_medio?: number
  consumo_anual_kwh?: number
  tarifa?: number
  historico_consumo_fatura?: HistoricoConsumoItem[]
}

interface ModalImportarContaRGEProps {
  isOpen: boolean
  onClose: () => void
  onConfirmar: (dados: DadosImportadosContaRGE) => void
}

const NAO_IDENTIFICADO = 'Não identificado na fatura'

const normalizarCampo = (v?: string | null): string => {
  if (!v || typeof v !== 'string') return ''
  const trimmed = v.trim()
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'não informado na fatura' ||
    trimmed.toLowerCase() === 'nao informado na fatura' ||
    trimmed.toLowerCase() === 'não identificado na fatura' ||
    trimmed.toLowerCase() === 'nao identificado na fatura'
  ) {
    return ''
  }
  return trimmed
}

export const ModalImportarContaRGE: React.FC<ModalImportarContaRGEProps> = ({
  isOpen,
  onClose,
  onConfirmar,
}) => {
  const isMobile = useIsMobile()
  const { toast } = useToast()

  // Estados do fluxo: 'upload' | 'analisando' | 'revisao'
  const [etapa, setEtapa] = useState<'upload' | 'analisando' | 'revisao'>('upload')
  const [progressMsg, setProgressMsg] = useState('Enviando fatura para análise...')
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [erroAnalise, setErroAnalise] = useState<string | null>(null)

  // Referências para inputs de arquivo
  const inputArquivoGeralRef = useRef<HTMLInputElement>(null)
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const inputGaleriaRef = useRef<HTMLInputElement>(null)

  // Campos editáveis na tela de revisão
  const [revNome, setRevNome] = useState('')
  const [revCpfCnpj, setRevCpfCnpj] = useState('')
  const [revEndereco, setRevEndereco] = useState('')
  const [revNumero, setRevNumero] = useState('')
  const [revComplemento, setRevComplemento] = useState('')
  const [revBairro, setRevBairro] = useState('')
  const [revCidade, setRevCidade] = useState('')
  const [revEstado, setRevEstado] = useState('RS')
  const [revCep, setRevCep] = useState('')
  const [revUc, setRevUc] = useState('')
  const [revClassificacao, setRevClassificacao] = useState('')
  const [revTipoFornecimento, setRevTipoFornecimento] = useState('')
  const [revTensaoNominal, setRevTensaoNominal] = useState('')
  const [revConsumoMedio, setRevConsumoMedio] = useState<string>('')
  const [revConsumoAnual, setRevConsumoAnual] = useState<string>('')
  const [revTarifa, setRevTarifa] = useState<string>('')
  const [revHistorico, setRevHistorico] = useState<HistoricoConsumoItem[]>([])

  useEffect(() => {
    if (!isOpen) {
      // Resetar estado ao fechar
      setEtapa('upload')
      setProgressMsg('Enviando fatura para análise...')
      setArquivoSelecionado(null)
      setIsDragging(false)
      setErroAnalise(null)
      setRevNome('')
      setRevCpfCnpj('')
      setRevEndereco('')
      setRevNumero('')
      setRevComplemento('')
      setRevBairro('')
      setRevCidade('')
      setRevEstado('RS')
      setRevCep('')
      setRevUc('')
      setRevClassificacao('')
      setRevTipoFornecimento('')
      setRevTensaoNominal('')
      setRevConsumoMedio('')
      setRevConsumoAnual('')
      setRevTarifa('')
      setRevHistorico([])
    }
  }, [isOpen])

  if (!isOpen) return null

  const processarArquivo = async (file: File) => {
    setArquivoSelecionado(file)
    setErroAnalise(null)
    setEtapa('analisando')
    setProgressMsg('Preparando arquivo para análise com Google Gemini...')

    try {
      const res = await analisarFaturaRGEGemini(file, {
        onProgress: (m) => setProgressMsg(m),
      })

      if (!res.ok || !res.data) {
        throw new Error(
          res.error ||
            'Não foi possível analisar a fatura da RGE. Verifique se a imagem ou PDF está legível.',
        )
      }

      const d = res.data

      // Normalizar campos extraídos
      const nomeTitular = normalizarCampo(d.titular_nome)
      const docIdent = normalizarCampo(d.cpf_cnpj)
      const ucVal = normalizarCampo(d.uc)
      const classif = normalizarCampo(d.classificacao_grupo_subgrupo)
      const tipoForn = normalizarCampo(d.tipo_fornecimento)
      const tensao = normalizarCampo(d.tensao_nominal)

      const end = d.endereco_completo || {}
      const rua = normalizarCampo(end.rua)
      const num = normalizarCampo(end.numero)
      const comp = normalizarCampo(end.complemento)
      const bai = normalizarCampo(end.bairro)
      const cid = normalizarCampo(end.cidade)
      const uf = normalizarCampo(end.estado) || 'RS'
      const cep = normalizarCampo(end.cep)

      // Consumos calculados
      const mediaCalculada = d.calculos?.media_mensal_consumo_kwh ?? d.consumo_medio ?? null
      const anualCalculado = d.calculos?.somatorio_consumo_anual_kwh ?? null
      const tarifaTotal =
        d.detalhes_tarifa?.tarifa_total_com_tributos ?? d.tarifa_com_tributos ?? null

      setRevNome(nomeTitular)
      setRevCpfCnpj(docIdent)
      setRevEndereco(rua)
      setRevNumero(num)
      setRevComplemento(comp)
      setRevBairro(bai)
      setRevCidade(cid ? `${cid}/${uf}` : 'Erechim/RS')
      setRevEstado(uf)
      setRevCep(cep)
      setRevUc(ucVal)
      setRevClassificacao(classif)
      setRevTipoFornecimento(tipoForn)
      setRevTensaoNominal(tensao)
      setRevConsumoMedio(
        mediaCalculada !== null && mediaCalculada !== undefined
          ? String(Math.round(mediaCalculada))
          : '',
      )
      setRevConsumoAnual(
        anualCalculado !== null && anualCalculado !== undefined
          ? String(Math.round(anualCalculado))
          : '',
      )
      setRevTarifa(
        tarifaTotal !== null && tarifaTotal !== undefined ? Number(tarifaTotal).toFixed(4) : '',
      )
      setRevHistorico(Array.isArray(d.historico_consumo) ? d.historico_consumo : [])

      setEtapa('revisao')

      toast({
        title: 'Fatura analisada com sucesso!',
        description: 'Revise os dados extraídos abaixo antes de confirmar o preenchimento.',
      })
    } catch (err: unknown) {
      console.error('[ModalImportarContaRGE] Erro na análise:', err)
      const msg =
        err instanceof Error ? err.message : 'Falha na análise da fatura RGE. Tente novamente.'
      setErroAnalise(msg)
      setEtapa('upload')
      toast({
        variant: 'destructive',
        title: 'Erro na análise da fatura',
        description: msg,
      })
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      processarArquivo(files[0])
    }
    // Limpar o valor do input para permitir selecionar o mesmo arquivo novamente
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files[0]) {
      processarArquivo(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleConfirmarRevisao = () => {
    const rawDoc = revCpfCnpj.replace(/\D/g, '')
    const isCnpj = rawDoc.length === 14
    const isCpf = rawDoc.length === 11

    const numConsumo = revConsumoMedio ? Number(revConsumoMedio) : undefined
    const numAnual = revConsumoAnual ? Number(revConsumoAnual) : undefined
    const numTarifa = revTarifa ? Number(revTarifa.replace(',', '.')) : undefined

    const cidadeFinal = revCidade.trim() || 'Erechim/RS'

    const dadosMapeados: DadosImportadosContaRGE = {
      nome: revNome.trim() || undefined,
      razao_social: isCnpj ? revNome.trim() || undefined : undefined,
      cpf_cnpj: revCpfCnpj.trim() || undefined,
      cnpj: isCnpj ? revCpfCnpj.trim() : undefined,
      cpf: isCpf ? revCpfCnpj.trim() : undefined,
      endereco: revEndereco.trim() || undefined,
      numero: revNumero.trim() || undefined,
      complemento: revComplemento.trim() || undefined,
      bairro: revBairro.trim() || undefined,
      cidade: cidadeFinal,
      estado: revEstado.trim() || 'RS',
      cep: revCep.trim() || undefined,
      uc: revUc.trim() || undefined,
      numero_uc: revUc.trim() || undefined,
      classificacao_grupo_subgrupo: revClassificacao.trim() || undefined,
      tipo_fornecimento: revTipoFornecimento.trim() || undefined,
      tensao_nominal: revTensaoNominal.trim() || undefined,
      consumo_kwh_mes: numConsumo,
      consumo_medio: numConsumo,
      consumo_anual_kwh: numAnual,
      tarifa: numTarifa,
      historico_consumo_fatura: revHistorico.length > 0 ? revHistorico : undefined,
    }

    onConfirmar(dadosMapeados)
    toast({
      title: 'Dados importados da conta!',
      description: 'Os campos do lead foram preenchidos com os dados da fatura.',
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (etapa !== 'analisando') onClose()
        }}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Importar dados da conta RGE
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  Gemini AI
                </span>
              </div>
              <p className="text-xs text-gray-600">
                {etapa === 'upload' &&
                  'Anexe a fatura para preenchimento inteligente dos dados do lead'}
                {etapa === 'analisando' && 'Processando fatura com visão computacional'}
                {etapa === 'revisao' && 'Confira e edite os dados extraídos antes de aplicar'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={etapa === 'analisando'}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-40"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs ocultos para os seletores de arquivo */}
        {/* Input geral (desktop): PDF e Imagens */}
        <input
          ref={inputArquivoGeralRef}
          type="file"
          accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
        />
        {/* Input Câmera Nativa do Celular (mobile) com capture="environment" */}
        <input
          ref={inputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileInputChange}
        />
        {/* Input Galeria / Arquivos do Celular (mobile) */}
        <input
          ref={inputGaleriaRef}
          type="file"
          accept=".pdf,application/pdf,image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* Corpo do Modal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* ================= ETAPA: UPLOAD ================= */}
          {etapa === 'upload' && (
            <div className="space-y-4">
              {erroAnalise && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Falha ao processar fatura</p>
                    <p className="text-red-700 mt-0.5">{erroAnalise}</p>
                    <p className="text-[11px] text-red-600 mt-1">
                      Certifique-se de que a conta é da RGE / CPFL e que o documento esteja nítido.
                    </p>
                  </div>
                </div>
              )}

              {/* Modo Desktop / Mobile com alternativas claras */}
              {isMobile ? (
                /* Layout Mobile: 2 Botões de destaque */
                <div className="space-y-3">
                  <div className="text-center py-2">
                    <p className="text-xs text-gray-600">
                      Escolha como deseja enviar a fatura da concessionária RGE:
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => inputCameraRef.current?.click()}
                    className="w-full flex items-center justify-between p-4 bg-emerald-600 active:bg-emerald-700 text-white rounded-xl shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/20 rounded-lg">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold">Tirar foto da conta</div>
                        <div className="text-xs text-emerald-100">
                          Abre a câmera nativa do celular
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/80" />
                  </button>

                  <button
                    type="button"
                    onClick={() => inputGaleriaRef.current?.click()}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 border-2 border-slate-200 active:border-emerald-500 rounded-xl transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
                        <ImageIcon className="w-6 h-6 text-slate-700" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-gray-900">Selecionar da galeria</div>
                        <div className="text-xs text-gray-500">
                          Escolher imagem ou PDF salvo no celular
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              ) : (
                /* Layout Desktop: Dropzone para PDF/Imagem com opção de clique */
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => inputArquivoGeralRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/60 scale-[1.01]'
                      : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20'
                  }`}
                >
                  <div className="mx-auto w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mb-3 shadow-xs">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800">
                    Arraste a fatura RGE ou clique para selecionar
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Formatos suportados: <strong>PDF</strong>, <strong>PNG</strong>,{' '}
                    <strong>JPG</strong> ou <strong>JPEG</strong>.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Extração automática de Titular, CPF/CNPJ, Endereço, UC e Histórico
                  </div>
                </div>
              )}

              {/* Informações sobre o que é extraído */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  O que o Gemini extrai automaticamente:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 pl-5">
                  <div>• Nome do titular / Razão Social</div>
                  <div>• CPF ou CNPJ formatado</div>
                  <div>• Endereço completo da UC</div>
                  <div>• Número da UC (ex: 200.419.001-19)</div>
                  <div>• Fornecimento (Mono/Bi/Trifásico)</div>
                  <div>• Média de consumo (kWh/mês)</div>
                  <div>• Histórico de até 12/13 meses</div>
                  <div>• Tarifa calculada (TUSD + TE)</div>
                </div>
              </div>
            </div>
          )}

          {/* ================= ETAPA: ANALISANDO ================= */}
          {etapa === 'analisando' && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200 animate-ping opacity-40" />
                <div className="w-14 h-14 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-900">Analisando fatura da RGE...</h4>
                <p className="text-xs text-gray-600 max-w-sm mx-auto">{progressMsg}</p>
                {arquivoSelecionado && (
                  <p className="text-[11px] text-gray-600 mt-2">
                    Arquivo: <span className="font-medium">{arquivoSelecionado.name}</span>
                  </p>
                )}
              </div>
              <div className="pt-2 text-[11px] text-gray-600">
                Aguarde alguns instantes enquanto a IA lê os dados do documento...
              </div>
            </div>
          )}

          {/* ================= ETAPA: REVISÃO ================= */}
          {etapa === 'revisao' && (
            <div className="space-y-5">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Revise os dados extraídos da fatura.</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Você pode corrigir qualquer informação antes de confirmar o preenchimento do
                    lead. Campos não identificados aparecem sinalizados em cinza.
                  </p>
                </div>
              </div>

              {/* SEÇÃO 1: DADOS DO CLIENTE */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <User className="w-4 h-4 text-emerald-600" />
                  1. Dados do Cliente
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Nome do Titular / Razão Social
                    </label>
                    <input
                      type="text"
                      value={revNome}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevNome(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                        !revNome ? 'placeholder:text-gray-400 placeholder:italic' : ''
                      }`}
                    />
                    {!revNome && (
                      <span className="text-[10px] text-gray-500 italic mt-0.5 block">
                        Não identificado na fatura — digite manualmente se souber
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      CPF / CNPJ do Titular
                    </label>
                    <input
                      type="text"
                      value={revCpfCnpj}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevCpfCnpj(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                        !revCpfCnpj ? 'placeholder:text-gray-400 placeholder:italic' : ''
                      }`}
                    />
                    {!revCpfCnpj && (
                      <span className="text-[10px] text-gray-500 italic mt-0.5 block">
                        Não identificado na fatura
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: DADOS DA UNIDADE CONSUMIDORA (UC) */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  2. Dados da Unidade Consumidora (UC)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Número da UC (com pontos e hífen)
                    </label>
                    <input
                      type="text"
                      value={revUc}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevUc(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-mono ${
                        !revUc ? 'placeholder:text-gray-400 placeholder:italic' : ''
                      }`}
                    />
                    {!revUc ? (
                      <span className="text-[10px] text-gray-500 italic mt-0.5 block">
                        Não identificado na fatura
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 mt-0.5 block">
                        Formato oficial RGE validado
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Tipo de Fornecimento
                    </label>
                    <select
                      value={revTipoFornecimento}
                      onChange={(e) => setRevTipoFornecimento(e.target.value)}
                      className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">Não identificado na fatura</option>
                      <option value="Monofásico">Monofásico</option>
                      <option value="Bifásico">Bifásico</option>
                      <option value="Trifásico">Trifásico</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Classificação (Grupo/Subgrupo)
                    </label>
                    <input
                      type="text"
                      value={revClassificacao}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevClassificacao(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                        !revClassificacao ? 'placeholder:text-gray-400 placeholder:italic' : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      Tensão Nominal
                    </label>
                    <input
                      type="text"
                      value={revTensaoNominal}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevTensaoNominal(e.target.value)}
                      className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white ${
                        !revTensaoNominal ? 'placeholder:text-gray-400 placeholder:italic' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Endereço da UC */}
                <div className="pt-2 border-t border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Endereço da Unidade Consumidora:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Logradouro / Rua
                      </label>
                      <input
                        type="text"
                        value={revEndereco}
                        placeholder={NAO_IDENTIFICADO}
                        onChange={(e) => setRevEndereco(e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white ${
                          !revEndereco ? 'placeholder:text-gray-400 placeholder:italic' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Número
                      </label>
                      <input
                        type="text"
                        value={revNumero}
                        placeholder={NAO_IDENTIFICADO}
                        onChange={(e) => setRevNumero(e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white ${
                          !revNumero ? 'placeholder:text-gray-400 placeholder:italic' : ''
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={revBairro}
                        placeholder={NAO_IDENTIFICADO}
                        onChange={(e) => setRevBairro(e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white ${
                          !revBairro ? 'placeholder:text-gray-400 placeholder:italic' : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        Cidade / UF
                      </label>
                      <input
                        type="text"
                        value={revCidade}
                        placeholder="Erechim/RS"
                        onChange={(e) => setRevCidade(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">
                        CEP
                      </label>
                      <input
                        type="text"
                        value={revCep}
                        placeholder={NAO_IDENTIFICADO}
                        onChange={(e) => setRevCep(e.target.value)}
                        className={`w-full px-2.5 py-1.5 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white ${
                          !revCep ? 'placeholder:text-gray-400 placeholder:italic' : ''
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: CONSUMO E HISTÓRICO */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  3. Consumo e Histórico de 12 Meses
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                      Consumo Médio (kWh/mês)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={revConsumoMedio}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevConsumoMedio(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-bold text-emerald-900 border border-emerald-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                      Recalculado: soma ÷ meses
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Somatório Anual (kWh)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={revConsumoAnual}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevConsumoAnual(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Total dos meses registrados
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-100 rounded-lg border border-slate-200">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                      Tarifa RGE (TUSD+TE com trib.)
                    </label>
                    <input
                      type="text"
                      value={revTarifa}
                      placeholder={NAO_IDENTIFICADO}
                      onChange={(e) => setRevTarifa(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm font-semibold text-slate-800 border border-slate-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">R$/kWh faturado</span>
                  </div>
                </div>

                {/* Tabela do Histórico de Consumo se houver */}
                {revHistorico.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-slate-700">
                        Histórico extraído ({revHistorico.length} meses encontrados):
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        Extração concluída via Gemini
                      </span>
                    </div>

                    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-[11px] text-left">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-3 py-1.5 font-semibold">Mês/Ano</th>
                            <th className="px-3 py-1.5 font-semibold text-right">Consumo (kWh)</th>
                            <th className="px-3 py-1.5 font-semibold text-right">Dias do Ciclo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {revHistorico.map((h, i) => (
                            <tr key={`${h.mes_ano}-${i}`} className="hover:bg-slate-50/60">
                              <td className="px-3 py-1 text-slate-800 font-medium">{h.mes_ano}</td>
                              <td className="px-3 py-1 text-right font-mono text-slate-900">
                                {h.consumo_kwh}
                              </td>
                              <td className="px-3 py-1 text-right text-slate-500">
                                {h.dias_ciclo || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-slate-50">
          {etapa === 'revisao' ? (
            <>
              <button
                type="button"
                onClick={() => setEtapa('upload')}
                className="px-3.5 py-2 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-200/60 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Analisar outro arquivo
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmarRevisao}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirmar e preencher
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Seu cadastro manual permanece intacto
              </span>
              <button
                type="button"
                onClick={onClose}
                disabled={etapa === 'analisando'}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-200/50 rounded-lg transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

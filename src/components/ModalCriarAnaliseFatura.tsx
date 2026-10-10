import React, { useState, useRef, useMemo } from 'react'
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  AlertCircle,
  Building,
  CheckCircle2,
  Trash2,
  Loader2,
  Zap,
  ExternalLink,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { ClienteAutocomplete } from '@/components/ClienteAutocomplete'
import {
  executarAnaliseFaturaRGECompleta,
  registrarAtividadeAnaliseFatura,
  type AnaliseFaturaCompletaDados,
} from '@/services/analiseFaturaService'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export interface ModalCriarAnaliseFaturaProps {
  isOpen: boolean
  onClose: () => void
  initialClienteId?: string
  onAnaliseConcluida?: (token: string, analise: AnaliseFaturaCompletaDados) => void
}

export const ModalCriarAnaliseFatura: React.FC<ModalCriarAnaliseFaturaProps> = ({
  isOpen,
  onClose,
  initialClienteId,
  onAnaliseConcluida,
}) => {
  const { clientes } = useClientes()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [clienteId, setClienteId] = useState<string>(initialClienteId || '')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Atualizar cliente se mudar a prop
  React.useEffect(() => {
    if (initialClienteId) {
      setClienteId(initialClienteId)
    }
  }, [initialClienteId])

  const clienteSelecionado = useMemo(() => {
    return clientes.find((c) => c.id === clienteId)
  }, [clientes, clienteId])

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const novos = Array.from(e.target.files)
      setArquivos((prev) => [...prev, ...novos])
      setErrorMsg(null)
    }
  }

  const handleRemoverArquivo = (index: number) => {
    setArquivos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const novos = Array.from(e.dataTransfer.files)
      setArquivos((prev) => [...prev, ...novos])
      setErrorMsg(null)
    }
  }

  const handleAnalisarFatura = async () => {
    if (!clienteId) {
      setErrorMsg('Por favor, selecione o cliente vinculado.')
      return
    }
    if (arquivos.length === 0) {
      setErrorMsg('Por favor, anexe ao menos uma fatura de energia da RGE.')
      return
    }

    try {
      setIsProcessing(true)
      setErrorMsg(null)
      setStatusMsg('Enviando arquivos e iniciando auditoria com Gemini...')

      const resp = await executarAnaliseFaturaRGECompleta({
        cliente_id: clienteId,
        files: arquivos,
        onProgress: (m) => setStatusMsg(m),
      })

      if (!resp.ok || !resp.token || !resp.data) {
        throw new Error(resp.error || 'A IA não conseguiu interpretar os dados da fatura.')
      }

      setStatusMsg('Registrando atividade administrativa e gerando relatório...')

      // Registrar atividade administrativa
      const competencia = resp.data.periodo?.mes_referencia || 'Mês Atual'
      const ucFatura = resp.data.dados_cadastrais_fatura?.uc || clienteSelecionado?.uc || ''
      const totalPagar = resp.data.totais?.total_a_pagar_rs || 0
      const economiaEstimada = resp.data.indicadores?.economia_estimada_mes_rs || 0

      await registrarAtividadeAnaliseFatura({
        cliente_id: clienteId,
        titulo: `Análise de Fatura RGE - ${competencia}`,
        descricao: `Análise técnica e regulatória realizada via Gemini. UC: ${ucFatura}. Total: R$ ${totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Economia apurada: R$ ${economiaEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        token_relatorio: resp.token,
        analise_id: resp.analise_id,
        total_pagar: totalPagar,
        economia_rs: economiaEstimada,
      })

      toast({
        title: 'Análise de Fatura Concluída!',
        description: 'O relatório completo e interativo foi gerado com sucesso.',
      })

      if (onAnaliseConcluida) {
        onAnaliseConcluida(resp.token, resp.data)
      }

      onClose()
      navigate(`/relatorio-fatura/${resp.token}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao analisar fatura.'
      setErrorMsg(msg)
    } finally {
      setIsProcessing(false)
      setStatusMsg('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={isProcessing ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-50 w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-emerald-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
              <Sparkles className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                Nova Atividade: Análise de Fatura
              </h2>
              <p className="text-xs text-emerald-100">
                Auditoria tarifária, arranjo de GD, saldo de energia e simulação tributária RGE
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do formulário */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Seleção do Cliente Obrigatória */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-4 h-4 text-emerald-600" />
              <span>1. Cliente Vinculado (Obrigatório)</span>
              <span className="text-red-500">*</span>
            </label>
            <ClienteAutocomplete
              clientes={clientes}
              value={clienteId}
              onChange={(id) => {
                setClienteId(id)
                setErrorMsg(null)
              }}
              placeholder="Pesquise o cliente por nome..."
              required
            />
            {clienteSelecionado && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs space-y-1 text-emerald-900">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{clienteSelecionado.nome}</span>
                  <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                    {clienteSelecionado.tipo_cliente || 'Cliente'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-gray-600">
                  <div>
                    <strong>UC Cadastrada:</strong> {clienteSelecionado.uc || 'Não cadastrada'}
                  </div>
                  <div>
                    <strong>Cidade:</strong> {clienteSelecionado.cidade || 'Não informada'}
                  </div>
                  <div className="col-span-2">
                    <strong>Endereço:</strong> {clienteSelecionado.endereco || 'Não informado'}
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700 italic pt-1">
                  💡 Os dados de UC e endereço serão cruzados automaticamente com a fatura. Caso
                  haja divergência ou ausência, a IA sugerirá o preenchimento.
                </p>
              </div>
            )}
          </div>

          {/* Área de Upload de Faturas */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>2. Anexar Fatura(s) de Energia da RGE (PDF ou Imagem)</span>
              <span className="text-red-500">*</span>
            </label>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 hover:border-emerald-500 bg-gray-50/70 hover:bg-emerald-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto rounded-full bg-white shadow-xs flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-800">
                  Clique ou arraste as faturas da RGE aqui
                </p>
                <p className="text-[11px] text-gray-500">
                  Suporta PDF, JPG, PNG e WEBP. É possível selecionar mais de uma fatura para
                  arranjos com múltiplas UCs.
                </p>
              </div>
            </div>

            {/* Lista de Arquivos Selecionados */}
            {arquivos.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-gray-600">
                  {arquivos.length} arquivo(s) pronto(s) para análise:
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {arquivos.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-white border border-gray-200 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium text-gray-800">{file.name}</span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoverArquivo(idx)
                        }}
                        className="text-gray-400 hover:text-red-500 p-1 rounded-md transition-colors"
                        title="Remover arquivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mensagens de Status / Erro */}
          {statusMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">Atenção</span>
                <span>{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Destaque das Análises que o Gemini fará */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-gray-600 space-y-1.5">
            <span className="font-bold text-gray-700 block uppercase tracking-wider text-[10px]">
              O que será extraído e analisado automaticamente:
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 list-disc list-inside text-gray-600">
              <li>Leituras, ciclo, vencimento e NF</li>
              <li>Papel da UC (Geradora, Receptora, Mista)</li>
              <li>Consumo vs. Injeção e Saldo a expirar</li>
              <li>Desdobramento TUSD, TE, CIP e Tributos</li>
              <li>Simulação IBS/CBS (LC 214/2025)</li>
              <li>Projeção tarifária de 9% ao ano</li>
            </ul>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-200/60 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isProcessing || !clienteId || arquivos.length === 0}
            onClick={handleAnalisarFatura}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            {isProcessing ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando fatura com IA...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Analisar fatura</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalCriarAnaliseFatura

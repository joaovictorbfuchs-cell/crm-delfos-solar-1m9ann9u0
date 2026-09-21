import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  Gauge,
  Calendar,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  FileCheck2,
  Clock,
  ShieldCheck,
  Send,
  Building,
  User,
  History,
  Info,
  ExternalLink,
  Loader2,
  MessageSquare,
  Eye,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/lib/formatters'
import pb from '@/lib/pocketbase/client'
import type { Atividade, Cliente } from '@/types/crm'
import {
  type CronogramaDataItem,
  type AutoLeituraDadosConclusao,
  salvarAtividadeAutoLeitura,
  dispararGeracaoLembretesBackend,
  buscarHistoricoAutoLeituraCliente,
} from '@/services/autoLeituraService'

interface ModalAutoLeituraRGEProps {
  isOpen: boolean
  onClose: () => void
  atividade: Atividade | null
  onUpdated?: (updated: Atividade) => void
}

export const ModalAutoLeituraRGE: React.FC<ModalAutoLeituraRGEProps> = ({
  isOpen,
  onClose,
  atividade,
  onUpdated,
}) => {
  const { clientes, openFichaCliente, refreshData } = useClientes()
  const { user } = useAuth()

  // Arquivo do cronograma
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cronogramaFile, setCronogramaFile] = useState<File | null>(null)
  const [existingFileName, setExistingFileName] = useState<string>('')

  // Lista de datas cadastradas
  const [datasCronograma, setDatasCronograma] = useState<CronogramaDataItem[]>([])

  // Formulário de inclusão manual de data
  const [novaData, setNovaData] = useState<string>('')
  const [novoResponsavel, setNovoResponsavel] = useState<'Cliente' | 'Distribuidora'>('Cliente')
  const [novaObs, setNovaObs] = useState<string>('')

  // 3 Requisitos de Conclusão obrigatórios:
  // (a) cliente enviou as fotos ou vídeo do medidor
  // (b) os valores das grandezas 03 e 103 foram informados
  // (c) o protocolo na RGE foi realizado
  const [fotosEnviadas, setFotosEnviadas] = useState<boolean>(false)
  const [valoresInformados, setValoresInformados] = useState<boolean>(false)
  const [protocoloRealizado, setProtocoloRealizado] = useState<boolean>(false)

  // Campos de texto para registrar as grandezas e protocolo
  const [valor03, setValor03] = useState<string>('')
  const [valor103, setValor103] = useState<string>('')
  const [numeroProtocolo, setNumeroProtocolo] = useState<string>('')
  const [autoLeituraObs, setAutoLeituraObs] = useState<string>('')

  // Histórico de leituras para este cliente
  const [historicoLeituras, setHistoricoLeituras] = useState<Atividade[]>([])
  const [loadingHistorico, setLoadingHistorico] = useState<boolean>(false)

  // Status e controle de gravação
  const [status, setStatus] = useState<'pendente' | 'concluida'>('pendente')
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{
    tipo: 'sucesso' | 'erro'
    texto: string
  } | null>(null)

  // Cliente atual
  const clienteAtual: Cliente | undefined = useMemo(() => {
    if (!atividade?.cliente_id) return undefined
    return clientes.find((c) => c.id === atividade.cliente_id) || atividade.expand?.cliente_id
  }, [atividade, clientes])

  // Inicializar estado a partir da atividade recebida
  useEffect(() => {
    if (!isOpen || !atividade) return

    setStatus(atividade.status === 'concluida' ? 'concluida' : 'pendente')
    setExistingFileName(atividade.cronograma_arquivo || '')
    setCronogramaFile(null)

    // Parse cronograma_datas
    let parsedDatas: CronogramaDataItem[] = []
    if (atividade.cronograma_datas) {
      if (Array.isArray(atividade.cronograma_datas)) {
        parsedDatas = atividade.cronograma_datas as CronogramaDataItem[]
      } else if (typeof atividade.cronograma_datas === 'string') {
        try {
          parsedDatas = JSON.parse(atividade.cronograma_datas)
        } catch {
          /* intentionally ignored */
        }
      }
    }
    setDatasCronograma(parsedDatas)

    // Parse auto_leitura_dados
    let parsedDados: Partial<AutoLeituraDadosConclusao> = {}
    if (atividade.auto_leitura_dados) {
      if (typeof atividade.auto_leitura_dados === 'object') {
        parsedDados = atividade.auto_leitura_dados as Partial<AutoLeituraDadosConclusao>
      } else if (typeof atividade.auto_leitura_dados === 'string') {
        try {
          parsedDados = JSON.parse(atividade.auto_leitura_dados)
        } catch {
          /* intentionally ignored */
        }
      }
    }

    setFotosEnviadas(Boolean(parsedDados.fotosEnviadas))
    setValoresInformados(Boolean(parsedDados.valoresInformados))
    setProtocoloRealizado(Boolean(parsedDados.protocoloRealizado))
    setValor03(parsedDados.valor03Consumo || '')
    setValor103(parsedDados.valor103Injetada || '')
    setNumeroProtocolo(parsedDados.protocoloRGE || '')
    setAutoLeituraObs(atividade.auto_leitura_obs || '')
    setFeedbackMsg(null)

    // Carregar histórico de leituras do cliente
    if (atividade.cliente_id) {
      setLoadingHistorico(true)
      buscarHistoricoAutoLeituraCliente(atividade.cliente_id)
        .then((res) => {
          setHistoricoLeituras(res)
        })
        .finally(() => {
          setLoadingHistorico(false)
        })
    }
  }, [isOpen, atividade])

  if (!isOpen || !atividade) return null

  // Validação dos 3 requisitos para poder concluir
  const todosRequisitosPreenchidos = fotosEnviadas && valoresInformados && protocoloRealizado

  // URL do arquivo existente
  const arquivoUrl = existingFileName
    ? `${import.meta.env.VITE_POCKETBASE_URL || ''}/api/files/atividades/${atividade.id}/${existingFileName}`
    : ''

  // Handler de seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setCronogramaFile(file)
      setExistingFileName(file.name)
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: `Arquivo "${file.name}" selecionado para upload. Salve as alterações para confirmar.`,
      })
    }
  }

  // Handler de adição de data manual
  const handleAdicionarData = () => {
    if (!novaData) {
      setFeedbackMsg({
        tipo: 'erro',
        texto: 'Informe a data prevista para adicionar ao cronograma.',
      })
      return
    }

    const novoItem: CronogramaDataItem = {
      id: `dt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      data: novaData,
      responsavel: novoResponsavel,
      observacao: novaObs.trim() || undefined,
    }

    const listaAtualizada = [...datasCronograma, novoItem].sort((a, b) =>
      a.data.localeCompare(b.data),
    )
    setDatasCronograma(listaAtualizada)
    setNovaData('')
    setNovaObs('')
    setFeedbackMsg({
      tipo: 'sucesso',
      texto: `Data ${novoItem.data} cadastrada com Responsável: ${novoResponsavel}. Lembretes serão gerados automaticamente para o Cliente.`,
    })
  }

  // Remover data
  const handleRemoverData = (id: string) => {
    setDatasCronograma((prev) => prev.filter((d) => d.id !== id))
  }

  // Salvar alterações
  const handleSalvar = async (tentarConcluir: boolean = false) => {
    if (!atividade) return

    if (tentarConcluir && !todosRequisitosPreenchidos) {
      setFeedbackMsg({
        tipo: 'erro',
        texto:
          'Para concluir a atividade é obrigatório cumprir os 3 requisitos: (a) Fotos/vídeos enviados, (b) Valores 03 e 103 informados e (c) Protocolo na RGE realizado.',
      })
      return
    }

    try {
      setIsSaving(true)
      setFeedbackMsg(null)

      const dadosConclusao: AutoLeituraDadosConclusao = {
        fotosEnviadas,
        valoresInformados,
        protocoloRealizado,
        valor03Consumo: valor03.trim(),
        valor103Injetada: valor103.trim(),
        protocoloRGE: numeroProtocolo.trim(),
        concluidoEm: tentarConcluir ? new Date().toISOString() : undefined,
        concluidoPor: tentarConcluir ? user?.name || 'Operador Delfos' : undefined,
      }

      const statusFinal = tentarConcluir ? 'concluida' : status

      const updated = await salvarAtividadeAutoLeitura({
        atividadeId: atividade.id,
        cronogramaDatas: datasCronograma,
        cronogramaArquivo: cronogramaFile,
        autoLeituraDados: dadosConclusao,
        autoLeituraObs: autoLeituraObs.trim(),
        status: statusFinal,
      })

      // Disparar sincronização no backend para ler as datas, excluir Distribuidora e gerar lembretes de Cliente
      await dispararGeracaoLembretesBackend(atividade.id)

      setStatus(statusFinal)
      setFeedbackMsg({
        tipo: 'sucesso',
        texto: tentarConcluir
          ? 'Atividade concluída com sucesso!'
          : 'Alterações salvas e cronograma sincronizado!',
      })

      if (onUpdated) {
        onUpdated(updated)
      }
      refreshData()

      // Atualizar histórico de leituras
      if (atividade.cliente_id) {
        buscarHistoricoAutoLeituraCliente(atividade.cliente_id).then(setHistoricoLeituras)
      }

      if (tentarConcluir) {
        setTimeout(() => {
          onClose()
        }, 1200)
      }
    } catch (err: unknown) {
      console.error('Erro ao salvar Auto Leitura RGE:', err)
      setFeedbackMsg({
        tipo: 'erro',
        texto: 'Erro ao salvar informações da Auto Leitura. Verifique a conexão e tente novamente.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Reabrir atividade
  const handleReabrir = async () => {
    try {
      setIsSaving(true)
      const updated = await salvarAtividadeAutoLeitura({
        atividadeId: atividade.id,
        status: 'pendente',
      })
      setStatus('pendente')
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Atividade reaberta como Pendente.' })
      if (onUpdated) onUpdated(updated)
      refreshData()
    } catch (err) {
      console.error('Erro ao reabrir atividade:', err)
      setFeedbackMsg({ tipo: 'erro', texto: 'Erro ao reabrir atividade.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />

      {/* Janela Modal */}
      <div className="relative z-50 w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Topo do modal com identificação da atividade existente */}
        <div className="px-5 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50/80 via-white to-orange-50/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shadow-2xs shrink-0">
              <Gauge className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                  Auto Leitura - RGE
                </h2>
                {status === 'concluida' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Concluída
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {clienteAtual
                  ? `Cliente: ${clienteAtual.nome}`
                  : 'Cronograma e conferência de leitura do medidor'}
                {clienteAtual?.cidade ? ` • ${clienteAtual.cidade}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {clienteAtual && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  openFichaCliente(clienteAtual.id)
                }}
                className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                title="Abrir ficha do cliente"
              >
                <span>Ficha do Cliente</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback visual de aviso ou sucesso */}
        {feedbackMsg && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center justify-between border-b ${
              feedbackMsg.tipo === 'sucesso'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 font-medium'
                : 'bg-rose-50 text-rose-900 border-rose-200 font-medium'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMsg.tipo === 'sucesso' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.texto}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-xs underline ml-2 opacity-75 hover:opacity-100"
            >
              fechar
            </button>
          </div>
        )}

        {/* Corpo do modal com scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* SEÇÃO 1: Botões de Anexar Cronograma e Cadastrar Datas Manualmente */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  1. Cronograma de Leitura da Concessionária
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Anexe o documento fornecido pela RGE (imagem ou PDF) ou digite as datas
                  manualmente.
                </p>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-orange-50 text-orange-700 hover:text-orange-900 border border-orange-200 rounded-xl text-xs font-bold shadow-2xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-orange-600" />
                  <span>Anexar Cronograma de Leitura</span>
                </button>
              </div>
            </div>

            {/* Visualizador do Cronograma Anexado (se houver arquivo) */}
            {(existingFileName || cronogramaFile) && (
              <div className="p-3 bg-white rounded-xl border border-orange-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <p className="font-bold text-gray-900 truncate">
                      {cronogramaFile ? cronogramaFile.name : existingFileName}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {cronogramaFile
                        ? `Novo arquivo anexado (${Math.round(cronogramaFile.size / 1024)} KB) — clique em Salvar`
                        : 'Cronograma já anexado ao sistema'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {arquivoUrl && !cronogramaFile && (
                    <a
                      href={arquivoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Visualizar</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setCronogramaFile(null)
                      setExistingFileName('')
                      setFeedbackMsg({
                        tipo: 'sucesso',
                        texto: 'Arquivo removido. Salve as alterações para persistir.',
                      })
                    }}
                    className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remover anexo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Cadastro manual de datas */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-gray-700 block">
                Cadastrar datas manualmente:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-4">
                  <label className="text-[10px] text-gray-500 block mb-0.5">Data Prevista</label>
                  <input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-[10px] text-gray-500 block mb-0.5">Responsável</label>
                  <select
                    value={novoResponsavel}
                    onChange={(e) =>
                      setNovoResponsavel(e.target.value as 'Cliente' | 'Distribuidora')
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="Cliente">Cliente (faz a leitura)</option>
                    <option value="Distribuidora">Distribuidora (leitura da concessionária)</option>
                  </select>
                </div>

                <div className="sm:col-span-4 flex items-end">
                  <button
                    type="button"
                    onClick={handleAdicionarData}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg text-xs shadow-2xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Data</span>
                  </button>
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Tabela de Estrutura do Cronograma (Data Prevista e Responsável) */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800">
                  Datas do Cronograma ({datasCronograma.length})
                </span>
                <span className="text-[11px] text-gray-500">
                  Datas de <strong>Cliente</strong> geram lembretes 2 dias antes;{' '}
                  <strong>Distribuidora</strong> são ignoradas.
                </span>
              </div>

              {datasCronograma.length === 0 ? (
                <div className="p-4 bg-white rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-500">
                  Nenhuma data cadastrada no cronograma. Adicione as datas acima ou anexe o
                  documento.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                        <th className="p-2.5">Data Prevista</th>
                        <th className="p-2.5">Responsável</th>
                        <th className="p-2.5">Lembrete Automático</th>
                        <th className="p-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {datasCronograma.map((item) => {
                        const isCliente = item.responsavel === 'Cliente'
                        const parts = item.data.split('-')
                        const dataBr =
                          parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : item.data

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-2.5 font-bold text-gray-900">{dataBr}</td>
                            <td className="p-2.5">
                              {isCliente ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-orange-900 bg-orange-100/90 border border-orange-200 px-2 py-0.5 rounded-full text-[11px]">
                                  <User className="w-3 h-3 text-orange-600" />
                                  Cliente (faz a leitura)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full text-[11px]">
                                  <Building className="w-3 h-3 text-slate-500" />
                                  Distribuidora (dispensa lembrete)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px]">
                              {isCliente ? (
                                <span className="text-emerald-800 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Gera lembrete 2 dias antes + WhatsApp
                                </span>
                              ) : (
                                <span className="text-gray-400">Não gera lembrete</span>
                              )}
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoverData(item.id)}
                                className="text-gray-400 hover:text-rose-600 p-1 rounded transition-colors"
                                title="Remover data"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* SEÇÃO 3 & 4: Regras de Mensagem Z-API e Lembretes */}
          <div className="bg-emerald-50/70 rounded-2xl border border-emerald-200 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
              <span>Automação WhatsApp Z-API (Disparo 2 dias antes)</span>
            </div>
            <p className="text-emerald-900 leading-relaxed text-[11px]">
              Quando faltarem <strong>2 dias</strong> para a data da leitura do Cliente, o sistema
              agenda a tarefa <code>"Lembrete Auto Leitura RGE - [data]"</code> com status{' '}
              <strong>Pendente</strong> e envia automaticamente a mensagem no WhatsApp oficial do
              cliente:
            </p>
            <div className="bg-white/90 p-3 rounded-xl border border-emerald-200/80 font-mono text-[11px] text-gray-800 whitespace-pre-wrap leading-relaxed shadow-2xs">
              {`Olá, boa tarde!
Chegou o momento da leitura do seu medidor de energia na instalação da ${clienteAtual?.nome || '[Nome da Usina ou Cliente]'}.
Instalação consumidora: ${clienteAtual?.uc || '[Número da Instalação]'} Endereço: ${clienteAtual?.endereco || '[Endereço da Instalação]'}
Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, onde apareçam claramente as seguintes grandezas:
• 03 – Energia consumida (kWh)
• 103 – Energia injetada (kWh)
Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, para conferência e validação dos dados antes do envio à RGE.`}
            </div>
          </div>

          {/* SEÇÃO 5: Requisitos Obrigatórios para Conclusão da Atividade */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  5. Requisitos de Conclusão da Auto Leitura
                </h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  todosRequisitosPreenchidos
                    ? 'bg-emerald-100 text-emerald-900'
                    : 'bg-amber-100 text-amber-900'
                }`}
              >
                {todosRequisitosPreenchidos ? 'Requisitos atendidos' : 'Pendente de validação'}
              </span>
            </div>

            <p className="text-xs text-gray-600">
              Esta atividade só pode ser marcada como concluída quando todos os 3 requisitos forem
              confirmados:
            </p>

            <div className="space-y-3">
              {/* Requisito A */}
              <label className="flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer bg-slate-50/70 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={fotosEnviadas}
                  onChange={(e) => setFotosEnviadas(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="font-bold text-gray-900 block">
                    (a) O cliente enviou as fotos ou vídeo do medidor
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Conferido imagens com visibilidade nítida do mostrador do relógio bidirecional
                  </span>
                </div>
              </label>

              {/* Requisito B */}
              <div className="p-3 rounded-xl border bg-slate-50/70 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={valoresInformados}
                    onChange={(e) => setValoresInformados(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 block">
                      (b) Os valores das grandezas 03 e 103 foram informados por escrito
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Validação e confronto dos números escritos com as imagens enviadas
                    </span>
                  </div>
                </label>

                {/* Campos de texto para registrar 03 e 103 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-7">
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                      Grandeza 03 – Energia Consumida (kWh):
                    </label>
                    <input
                      type="text"
                      value={valor03}
                      onChange={(e) => setValor03(e.target.value)}
                      placeholder="Ex: 12450"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                      Grandeza 103 – Energia Injetada (kWh):
                    </label>
                    <input
                      type="text"
                      value={valor103}
                      onChange={(e) => setValor103(e.target.value)}
                      placeholder="Ex: 8930"
                      className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Requisito C */}
              <div className="p-3 rounded-xl border bg-slate-50/70 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={protocoloRealizado}
                    onChange={(e) => setProtocoloRealizado(e.target.checked)}
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-gray-900 block">
                      (c) O protocolo na RGE foi realizado
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Registro de auto leitura concluído com êxito nos canais da concessionária
                    </span>
                  </div>
                </label>

                <div className="pt-1 pl-7">
                  <label className="text-[10px] font-semibold text-gray-600 block mb-0.5">
                    Número do Protocolo RGE:
                  </label>
                  <input
                    type="text"
                    value={numeroProtocolo}
                    onChange={(e) => setNumeroProtocolo(e.target.value)}
                    placeholder="Ex: 2026-RGE-9831204"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Campo de texto aberto para observações gerais da atividade */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700 block">
                  Campo de texto para registrar as informações / notas da leitura:
                </label>
                <textarea
                  rows={3}
                  value={autoLeituraObs}
                  onChange={(e) => setAutoLeituraObs(e.target.value)}
                  placeholder="Registre aqui informações adicionais da validação, conferência de créditos ou orientações passadas ao cliente..."
                  className="w-full text-xs p-3 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 6: Histórico de Leituras Já Realizadas para aquele Cliente */}
          <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-orange-600" />
                <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                  6. Histórico de Leituras Deste Cliente
                </h3>
              </div>
              <span className="text-[11px] text-gray-500">
                {historicoLeituras.length} leitura(s) registradas
              </span>
            </div>

            {loadingHistorico ? (
              <div className="py-6 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                <span>Carregando histórico do cliente...</span>
              </div>
            ) : historicoLeituras.length === 0 ? (
              <div className="p-3 bg-white rounded-xl border border-gray-200 text-center text-xs text-gray-500">
                Nenhuma leitura anterior registrada para este cliente.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {historicoLeituras.map((item) => {
                  let dadosParsed: Partial<AutoLeituraDadosConclusao> = {}
                  if (item.auto_leitura_dados) {
                    if (typeof item.auto_leitura_dados === 'object')
                      dadosParsed = item.auto_leitura_dados as Partial<AutoLeituraDadosConclusao>
                    else if (typeof item.auto_leitura_dados === 'string') {
                      try {
                        dadosParsed = JSON.parse(item.auto_leitura_dados)
                      } catch {
                        /* intentionally ignored */
                      }
                    }
                  }

                  const isAtual = item.id === atividade.id

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-xl border bg-white transition-all text-xs space-y-1.5 ${
                        isAtual
                          ? 'border-orange-300 ring-1 ring-orange-300 bg-orange-50/20'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {item.titulo || 'Auto Leitura - RGE'}
                          </span>
                          {isAtual && (
                            <span className="text-[9px] font-bold bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded uppercase">
                              Atividade Atual
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'concluida'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'concluida' ? 'Concluída' : 'Pendente'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Data:</span>
                          <span className="font-medium">
                            {formatDateTime(item.data || item.created)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Grandeza 03:</span>
                          <span className="font-bold text-gray-800">
                            {dadosParsed.valor03Consumo ? `${dadosParsed.valor03Consumo} kWh` : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Grandeza 103:</span>
                          <span className="font-bold text-gray-800">
                            {dadosParsed.valor103Injetada
                              ? `${dadosParsed.valor103Injetada} kWh`
                              : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Protocolo RGE:</span>
                          <span className="font-mono text-emerald-800">
                            {dadosParsed.protocoloRGE || '—'}
                          </span>
                        </div>
                      </div>

                      {item.auto_leitura_obs && (
                        <p className="text-[11px] text-gray-700 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                          "{item.auto_leitura_obs}"
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {status === 'concluida' ? (
              <button
                type="button"
                onClick={handleReabrir}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Reabrir Atividade como Pendente</span>
              </button>
            ) : (
              <span className="text-xs text-gray-500">
                {todosRequisitosPreenchidos
                  ? 'Pronto para concluir: todos os 3 requisitos foram marcados.'
                  : 'Para concluir, marque todos os 3 requisitos obrigatórios.'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors"
            >
              Fechar
            </button>

            {/* Salvar dados / cronograma */}
            <button
              type="button"
              onClick={() => handleSalvar(false)}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-bold rounded-xl text-xs shadow-2xs transition-colors"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Salvar Cronograma / Dados</span>
            </button>

            {/* Concluir Atividade (bloqueado se não cumprir os 3 requisitos) */}
            {status !== 'concluida' && (
              <button
                type="button"
                onClick={() => handleSalvar(true)}
                disabled={isSaving || !todosRequisitosPreenchidos}
                title={
                  !todosRequisitosPreenchidos
                    ? 'Bloqueado: Requer (a) Fotos/vídeos, (b) Grandezas 03 e 103 e (c) Protocolo RGE'
                    : 'Concluir atividade'
                }
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors ${
                  todosRequisitosPreenchidos
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                }`}
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Concluir Atividade</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

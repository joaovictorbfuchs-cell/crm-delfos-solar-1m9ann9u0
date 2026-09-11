import React, { useState, useMemo } from 'react'
import {
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock4,
  Check,
  CheckCheck,
  Sparkles,
  Phone,
  FileText,
  AlertTriangle,
  RefreshCw,
  Settings,
  MessageSquare,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { Cliente, WhatsAppTemplate } from '@/types/crm'
import { formatDateTime, formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'

interface FichaClienteWhatsAppProps {
  cliente: Cliente
  onOpenTemplatesModal?: () => void
}

export const FichaClienteWhatsApp: React.FC<FichaClienteWhatsAppProps> = ({
  cliente,
  onOpenTemplatesModal,
}) => {
  const {
    whatsAppTemplates,
    whatsAppMensagens,
    whatsAppConfig,
    sendWhatsAppMessage,
    updateCliente,
    addAtividade,
    orcamentosSolar,
    refreshWhatsAppConfig,
  } = useClientes()

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [telefoneDestino, setTelefoneDestino] = useState<string>(
    cliente.whatsapp || cliente.telefone || '',
  )
  const [mensagemTexto, setMensagemTexto] = useState<string>('')
  const [agendarEnvio, setAgendarEnvio] = useState<boolean>(false)
  const [dataHoraAgendada, setDataHoraAgendada] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{
    tipo: 'success' | 'warning' | 'error'
    texto: string
  } | null>(null)

  // Mensagens enviadas a este cliente específico (ordenadas da mais recente para a mais antiga)
  const mensagensCliente = useMemo(() => {
    return whatsAppMensagens
      .filter((m) => m.cliente_id === cliente.id)
      .sort(
        (a, b) =>
          new Date(b.created || b.enviado_em || 0).getTime() -
          new Date(a.created || a.enviado_em || 0).getTime(),
      )
  }, [whatsAppMensagens, cliente.id])

  // Último orçamento solar do cliente (para preenchimento automático das variáveis)
  const ultimoOrcamento = useMemo(() => {
    const list = orcamentosSolar.filter((o) => o.cliente_id === cliente.id)
    return list.length > 0 ? list[0] : null
  }, [orcamentosSolar, cliente.id])

  // Substituição de variáveis do template com dados do cliente
  const aplicarVariaveisTemplate = (template: WhatsAppTemplate) => {
    let texto = template.conteudo

    // Variável {{nome_cliente}}
    const nomeCliente = cliente.nome || 'Cliente'
    texto = texto.replace(/\{\{nome_cliente\}\}/g, nomeCliente)

    // Variável {{valor_proposta}}
    const valorNum = ultimoOrcamento?.valor_investimento || cliente.valor_estimado || 0
    const valorStr = valorNum > 0 ? formatCurrency(valorNum) : 'sob consulta'
    texto = texto.replace(/\{\{valor_proposta\}\}/g, valorStr)

    // Variável {{endereco}}
    const enderecoFormatado =
      [cliente.endereco, cliente.numero, cliente.bairro, cliente.cidade]
        .filter(Boolean)
        .join(', ') ||
      cliente.cidade ||
      'endereço cadastrado'
    texto = texto.replace(/\{\{endereco\}\}/g, enderecoFormatado)

    // Variável {{data}}
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    texto = texto.replace(/\{\{data\}\}/g, dataAtual)

    return texto
  }

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId)
    if (!templateId) return

    const tpl = whatsAppTemplates.find((t) => t.id === templateId)
    if (tpl) {
      const parsedTexto = aplicarVariaveisTemplate(tpl)
      setMensagemTexto(parsedTexto)
    }
  }

  const handleEnviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    const tel = telefoneDestino.trim()
    const msg = mensagemTexto.trim()

    if (!tel) {
      setFeedback({
        tipo: 'error',
        texto: 'Por favor, informe o número de WhatsApp do destinatário.',
      })
      return
    }

    if (!msg) {
      setFeedback({
        tipo: 'error',
        texto: 'A mensagem de texto não pode estar vazia.',
      })
      return
    }

    // Se agendado, verificar se a data é futura
    if (agendarEnvio && !dataHoraAgendada) {
      setFeedback({
        tipo: 'error',
        texto: 'Selecione a data e hora para agendar o envio da mensagem.',
      })
      return
    }

    if (agendarEnvio && dataHoraAgendada) {
      const scheduleTime = new Date(dataHoraAgendada).getTime()
      if (scheduleTime <= Date.now() + 60 * 1000) {
        setFeedback({
          tipo: 'error',
          texto: 'A data/hora de agendamento deve ser posterior ao momento atual.',
        })
        return
      }
    }

    setIsSending(true)
    try {
      // Salva o número no cadastro do cliente se tiver sido atualizado/digitado
      if (tel !== cliente.whatsapp) {
        await updateCliente(cliente.id, {
          whatsapp: formatWhatsAppPhone(tel),
        })
      }

      const res = await sendWhatsAppMessage({
        cliente_id: cliente.id,
        telefone_destino: tel,
        conteudo_final: msg,
        template_id: selectedTemplateId || undefined,
        agendado_para:
          agendarEnvio && dataHoraAgendada ? new Date(dataHoraAgendada).toISOString() : null,
        tipo_disparo: 'manual',
      })

      // Registrar atividade na timeline unificada do cliente
      try {
        await addAtividade({
          cliente_id: cliente.id,
          tipo: 'contato_ligacao',
          titulo: agendarEnvio ? 'WhatsApp Agendado na Fila' : 'Mensagem WhatsApp Enviada',
          descricao: `Destino: ${tel}\nStatus: ${res.status || 'enviada'}\nConteúdo: "${msg.slice(0, 160)}${msg.length > 160 ? '...' : ''}"`,
          data: new Date().toISOString(),
          status: 'concluida',
          responsavel_nome: 'Atendimento WhatsApp',
        })
      } catch {
        /* intentionally ignored */
      }

      if (agendarEnvio) {
        setFeedback({
          tipo: 'success',
          texto: `Mensagem agendada com sucesso para ${formatDateTime(dataHoraAgendada)}! Ela será processada pela fila automática.`,
        })
      } else if (res.sent) {
        setFeedback({
          tipo: 'success',
          texto: 'Mensagem enviada com sucesso ao WhatsApp do cliente!',
        })
      } else if (res.gatewayConfigured === false) {
        setFeedback({
          tipo: 'warning',
          texto:
            'Mensagem registrada no histórico com status "falha", pois as credenciais de WhatsApp (WHATSAPP_API_URL / WHATSAPP_API_KEY) ainda não foram configuradas nos Secrets do backend.',
        })
      } else {
        setFeedback({
          tipo: 'warning',
          texto: `Mensagem registrada no histórico: ${res.message || 'Status retornado: ' + (res.status || 'falha')}`,
        })
      }

      // Limpar campos de composição
      setMensagemTexto('')
      setSelectedTemplateId('')
      setAgendarEnvio(false)
      setDataHoraAgendada('')
    } catch (err: unknown) {
      console.error('Erro ao enviar mensagem WhatsApp:', err)
      const errStr = err instanceof Error ? err.message : String(err)
      setFeedback({
        tipo: 'error',
        texto: `Falha ao processar mensagem: ${errStr}`,
      })
    } finally {
      setIsSending(false)
    }
  }

  // Render do ícone e badge de status da mensagem
  const renderStatusBadge = (status: string, agendadoPara?: string) => {
    switch (status) {
      case 'enviada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Check className="w-3 h-3 text-blue-600" />
            Enviada
          </span>
        )
      case 'entregue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCheck className="w-3 h-3 text-emerald-600" />
            Entregue
          </span>
        )
      case 'agendada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock4 className="w-3 h-3 text-amber-600" />
            Agendada {agendadoPara ? `(${formatDateTime(agendadoPara)})` : ''}
          </span>
        )
      case 'falha':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            Falha
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <Clock className="w-3 h-3 text-gray-500" />
            {status || 'Pendente'}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner de status do Gateway */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center justify-between flex-wrap gap-3 text-xs ${
          whatsAppConfig?.hasApiUrl
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              whatsAppConfig?.hasApiUrl
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {whatsAppConfig?.hasApiUrl ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            )}
          </div>
          <div>
            <div className="font-bold flex items-center gap-1.5">
              <span>Status do Gateway WhatsApp:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  whatsAppConfig?.hasApiUrl
                    ? 'bg-emerald-200 text-emerald-900'
                    : 'bg-amber-200 text-amber-900'
                }`}
              >
                {whatsAppConfig?.hasApiUrl ? 'Conectado' : 'Secrets Pendentes'}
              </span>
            </div>
            <p className="text-[11px] opacity-85 mt-0.5">
              {whatsAppConfig?.hasApiUrl
                ? `Gateway configurado (${whatsAppConfig.apiUrlPreview}). Disparos e respostas ativas.`
                : 'Defina WHATSAPP_API_URL e WHATSAPP_API_KEY nos Secrets para envio real via HTTP.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTemplatesModal && (
            <button
              type="button"
              onClick={onOpenTemplatesModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-lg font-bold shadow-2xs hover:shadow-xs transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Gerenciar Templates</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => refreshWhatsAppConfig()}
            className="p-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 rounded-lg shadow-2xs transition-colors"
            title="Recarregar status da configuração"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Formulário de Composição / Envio de Mensagem */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <MessageSquare className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Nova Mensagem WhatsApp</h3>
              <p className="text-xs text-gray-500">
                Selecione um modelo pronto com variáveis ou escreva uma mensagem personalizada.
              </p>
            </div>
          </div>

          {/* Quick info do número atual */}
          <div className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-900 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Destino: {cliente.whatsapp || cliente.telefone || 'Sem número'}</span>
          </div>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
              feedback.tipo === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : feedback.tipo === 'warning'
                  ? 'bg-amber-50 border border-amber-200 text-amber-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {feedback.tipo === 'success' && (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {feedback.tipo === 'warning' && (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            {feedback.tipo === 'error' && (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{feedback.texto}</div>
          </div>
        )}

        <form onSubmit={handleEnviarMensagem} className="space-y-4">
          {/* Seletor de Templates e Telefone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Escolher Modelo */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Modelo de Mensagem (Template)</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
              >
                <option value="">Mensagem em branco (personalizada)</option>
                {whatsAppTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.titulo} {tpl.tipo_gatilho ? `(${tpl.tipo_gatilho})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Telefone de Destino */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Número WhatsApp</span>
              </label>
              <input
                type="text"
                value={telefoneDestino}
                onChange={(e) => setTelefoneDestino(formatWhatsAppPhone(e.target.value))}
                placeholder="(54) 99876-5432"
                className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          {/* Área de Texto da Mensagem */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Conteúdo da Mensagem
              </label>
              <div className="text-[11px] text-gray-400">
                Variáveis suportadas:{' '}
                <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                  {'{{nome_cliente}}'}
                </code>{' '}
                <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                  {'{{valor_proposta}}'}
                </code>{' '}
                <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                  {'{{endereco}}'}
                </code>{' '}
                <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">
                  {'{{data}}'}
                </code>
              </div>
            </div>
            <textarea
              rows={4}
              value={mensagemTexto}
              onChange={(e) => setMensagemTexto(e.target.value)}
              placeholder="Digite o texto da mensagem que será enviada via WhatsApp..."
              className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
          </div>

          {/* Opção de Agendamento */}
          <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                <input
                  type="checkbox"
                  checked={agendarEnvio}
                  onChange={(e) => setAgendarEnvio(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                />
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span>Agendar envio para data e hora futura (Fila de envio)</span>
              </label>
            </div>

            {agendarEnvio && (
              <div className="pt-2 border-t border-gray-200 flex items-center gap-3 flex-wrap animate-in fade-in duration-150">
                <div className="flex-1 min-w-[220px]">
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Data e Horário de Envio:
                  </label>
                  <input
                    type="datetime-local"
                    value={dataHoraAgendada}
                    onChange={(e) => setDataHoraAgendada(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>
                <div className="text-[11px] text-gray-500 max-w-sm pt-4">
                  A mensagem ficará salva com status <strong>"agendada"</strong> e o worker
                  periódico do backend processará e enviará automaticamente via gateway no horário
                  marcado.
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setMensagemTexto('')
                setSelectedTemplateId('')
                setAgendarEnvio(false)
                setDataHoraAgendada('')
                setFeedback(null)
              }}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Limpar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all duration-150 flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : agendarEnvio ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Salvar na Fila de Agendamento</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Disparar Mensagem Agora</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Histórico Cronológico de Conversas / Mensagens Enviadas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Histórico de Mensagens WhatsApp</span>
            <span className="text-[11px] font-normal text-gray-400">
              ({mensagensCliente.length} {mensagensCliente.length === 1 ? 'registro' : 'registros'})
            </span>
          </div>
        </div>

        {mensagensCliente.length === 0 ? (
          <div className="p-8 text-center bg-gray-50/70 rounded-2xl border-2 border-dashed border-gray-200 space-y-2">
            <MessageSquare className="w-8 h-8 text-emerald-600 mx-auto opacity-60" />
            <h4 className="text-xs font-bold text-gray-800">
              Nenhuma mensagem WhatsApp registrada para este cliente
            </h4>
            <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
              Utilize o formulário acima para enviar ou agendar a primeira mensagem, ou aguarde os
              disparos automáticos por mudança de status e visitas.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {mensagensCliente.map((msg) => {
              const dataExibida = msg.enviado_em || msg.agendado_para || msg.created
              const tplUtilizado = whatsAppTemplates.find((t) => t.id === msg.template_id)

              return (
                <div
                  key={msg.id}
                  className="p-4 bg-white rounded-2xl border border-gray-200 shadow-2xs hover:border-emerald-300 transition-colors space-y-2"
                >
                  {/* Top Header do Card de Mensagem */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      {renderStatusBadge(msg.status, msg.agendado_para)}

                      {msg.tipo_disparo && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                          {msg.tipo_disparo === 'manual'
                            ? 'Envio Manual'
                            : msg.tipo_disparo === 'proposta_aprovada'
                              ? 'Automático: Proposta Aprovada'
                              : msg.tipo_disparo === 'lembrete_visita'
                                ? 'Automático: Lembrete de Visita'
                                : msg.tipo_disparo === 'followup_posvenda'
                                  ? 'Automático: Follow-up Pós-Venda'
                                  : msg.tipo_disparo}
                        </span>
                      )}

                      {tplUtilizado && (
                        <span className="text-[11px] font-medium text-emerald-800">
                          Modelo: <strong>{tplUtilizado.titulo}</strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{formatDateTime(dataExibida)}</span>
                    </div>
                  </div>

                  {/* Conteúdo da Mensagem em estilo balão WhatsApp */}
                  <div className="p-3 bg-emerald-50/40 border border-emerald-100 rounded-xl text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-sans">
                    {msg.conteudo_final}
                  </div>

                  {/* Metadados e Log de Erro (se houver) */}
                  <div className="flex items-center justify-between flex-wrap gap-2 text-[11px] text-gray-400 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-gray-600 font-medium">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        Destino: {msg.telefone_destino}
                      </span>
                      {msg.id_externo_gateway && (
                        <span className="font-mono text-[10px] bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                          ID: {msg.id_externo_gateway}
                        </span>
                      )}
                    </div>

                    {msg.log_erro && (
                      <div className="text-rose-600 font-medium flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-[10px]">
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>{msg.log_erro}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

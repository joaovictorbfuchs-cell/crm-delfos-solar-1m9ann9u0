import React, { useState } from 'react'
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  Link2,
  Copy,
  Check,
  Building,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { AnaliseFaturaRegistro } from '@/services/analiseFaturaService'
import {
  resolverNumeroDestinoCliente,
  MENSAGEM_ALERTA_SEM_NUMERO,
  type OrigemNumeroDestino,
} from '@/lib/resolverNumeroDestinoCliente'

export interface ModalEnviarAnaliseWhatsAppProps {
  isOpen: boolean
  onClose: () => void
  analise: AnaliseFaturaRegistro
  linkRelatorio: string
  telefoneDestino?: string
  clienteId?: string
  onEnviadoSucesso?: () => void
}

export const ModalEnviarAnaliseWhatsApp: React.FC<ModalEnviarAnaliseWhatsAppProps> = ({
  isOpen,
  onClose,
  analise,
  linkRelatorio,
  telefoneDestino,
  onEnviadoSucesso,
}) => {
  const { toast } = useToast()

  const clienteNome = analise.cliente_nome || 'Cliente'
  const uc = analise.uc || 'não informado'
  const competencia = analise.competencia || 'Mês Atual'
  const consumo = analise.consumo_kwh
    ? `${analise.consumo_kwh.toLocaleString('pt-BR')} kWh`
    : 'Não informado'
  const saldo = analise.saldo_energia_kwh
    ? `${analise.saldo_energia_kwh.toLocaleString('pt-BR')} kWh`
    : '0 kWh'
  const economia = analise.economia_estimada_rs
    ? `R$ ${analise.economia_estimada_rs.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : 'R$ 0,00'
  const totalPagar = analise.total_pagar
    ? `R$ ${analise.total_pagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : 'R$ 0,00'

  // Mensagem padrão pré-formatada
  const textoPadrao = useMemoTextoPadrao({
    clienteNome,
    uc,
    competencia,
    consumo,
    saldo,
    economia,
    totalPagar,
    linkRelatorio,
  })

  const [telefone, setTelefone] = useState(telefoneDestino || '')
  const [origemNumero, setOrigemNumero] = useState<OrigemNumeroDestino | 'manual' | null>(null)
  const [contatoAdicionalNome, setContatoAdicionalNome] = useState<string | undefined>(undefined)
  const [resolvendoNumero, setResolvendoNumero] = useState(false)
  const [mensagem, setMensagem] = useState(textoPadrao)
  const [isSending, setIsSending] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Ao abrir ou mudar de análise/telefone, resolver número via utilitário central
  React.useEffect(() => {
    let cancelado = false

    async function resolverDestino() {
      const cliId = analise.cliente_id
      if (cliId) {
        setResolvendoNumero(true)
        try {
          const cli = await pb.collection('clientes').getOne(cliId)
          let contatosDoCli: any[] = []
          try {
            const cas = await pb.collection('contatos_adicionais').getFullList({
              filter: `cliente_id = "${cliId}"`,
            })
            contatosDoCli = cas
          } catch {
            /* ignore */
          }

          if (cancelado) return

          const resolucao = await resolverNumeroDestinoCliente(cli, {
            contatosAdicionais: contatosDoCli,
          })

          if (cancelado) return

          setOrigemNumero(resolucao.origem)
          setContatoAdicionalNome(resolucao.contatoAdicionalNome)
          if (resolucao.numeroFormatado || resolucao.numero) {
            setTelefone(resolucao.numeroFormatado || resolucao.numero)
          } else if (telefoneDestino) {
            setTelefone(telefoneDestino)
          } else {
            setTelefone('')
          }
          return
        } catch {
          /* fallback */
        } finally {
          if (!cancelado) setResolvendoNumero(false)
        }
      }

      // Se não há cliente_id ou falhou a busca remota, usar telefoneDestino passado
      if (telefoneDestino) {
        setTelefone(telefoneDestino)
      }
    }

    if (isOpen) {
      resolverDestino()
    }

    return () => {
      cancelado = true
    }
  }, [isOpen, analise.cliente_id, telefoneDestino])

  React.useEffect(() => {
    setMensagem(textoPadrao)
  }, [textoPadrao])

  if (!isOpen) return null

  const handleCopiarLink = () => {
    navigator.clipboard.writeText(linkRelatorio)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
    toast({
      title: 'Link copiado!',
      description: 'O link exclusivo da análise foi copiado para sua área de transferência.',
    })
  }

  const handleInserirTag = (tag: string) => {
    let valorTag = ''
    switch (tag) {
      case 'nome':
        valorTag = clienteNome
        break
      case 'uc':
        valorTag = uc
        break
      case 'competencia':
        valorTag = competencia
        break
      case 'consumo':
        valorTag = consumo
        break
      case 'saldo':
        valorTag = saldo
        break
      case 'economia':
        valorTag = economia
        break
      case 'link':
        valorTag = linkRelatorio
        break
      default:
        valorTag = ''
    }
    setMensagem((prev) => `${prev} ${valorTag}`.trim())
  }

  const handleEnviarWhatsApp = async () => {
    const rawDigitos = telefone.replace(/\D/g, '')
    if (!rawDigitos || rawDigitos.length < 10) {
      toast({
        title: 'Envio não realizado',
        description: MENSAGEM_ALERTA_SEM_NUMERO,
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSending(true)

      const payload = {
        cliente_id: analise.cliente_id || '',
        telefone_destino: telefone,
        conteudo_final: mensagem,
        tipo_disparo: 'analise_fatura',
        referencia_id: analise.id,
      }

      const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const authToken = pb.authStore.token

      const res = await fetch(`${baseUrl}/backend/v1/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {}),
        },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        throw new Error(json.error || json.message || 'Falha ao despachar mensagem pelo gateway.')
      }

      // Marcar na coleção analises_fatura que foi enviada
      try {
        await pb.collection('analises_fatura').update(analise.id, {
          whatsapp_enviado: true,
          whatsapp_enviado_em: new Date().toISOString(),
        })
      } catch (e) {
        console.warn('Erro ao atualizar flag de whatsapp_enviado:', e)
      }

      // Registrar também na timeline do cliente se houver cliente_id
      if (analise.cliente_id) {
        try {
          await pb.collection('atividades').create({
            cliente_id: analise.cliente_id,
            tipo: 'mensagem_enviada',
            titulo: 'Análise de Fatura enviada via WhatsApp',
            descricao: `Relatório da fatura (${competencia}) enviado via Z-API para o WhatsApp ${telefone}. Link gerado: ${linkRelatorio}`,
            data: new Date().toISOString(),
            status: 'concluida',
            autor: pb.authStore.record?.name || 'Sistema Delfos',
          })
        } catch (e) {
          console.warn('Erro ao registrar atividade de envio WhatsApp:', e)
        }
      }

      toast({
        title: 'Mensagem enviada com sucesso!',
        description:
          'A análise de fatura foi disparada e já consta no histórico do cliente e na Central de Atendimento.',
      })

      if (onEnviadoSucesso) onEnviadoSucesso()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar WhatsApp.'
      toast({
        title: 'Aviso de envio',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={isSending ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="relative z-50 w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 to-emerald-800 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Enviar Análise de Fatura via WhatsApp
              </h2>
              <p className="text-xs text-emerald-100">
                Disparo via Z-API com link interativo e registro automático no histórico
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Informações do destinatário */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>Destinatário e Telefone (WhatsApp)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                disabled
                value={clienteNome}
                className="w-full px-3 py-2 bg-gray-100 rounded-xl border border-gray-200 text-gray-700 font-medium cursor-not-allowed"
              />
              <input
                type="tel"
                value={telefone}
                onChange={(e) => {
                  setTelefone(e.target.value)
                  setOrigemNumero('manual')
                }}
                placeholder={resolvendoNumero ? 'Identificando número...' : 'Ex: (54) 99999-8888'}
                className="w-full px-3 py-2 bg-white rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900"
              />
            </div>
            {origemNumero === 'contato_adicional_whatsapp' && (
              <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 font-medium">
                Contato adicional: {contatoAdicionalNome || 'Contato'} (utilizado como alternativa)
              </p>
            )}
            {origemNumero === 'cliente_telefone' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium">
                Aviso: Utilizando o telefone geral do cliente (sem WhatsApp cadastrado).
              </p>
            )}
            {!telefone.trim() && !resolvendoNumero && (
              <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {MENSAGEM_ALERTA_SEM_NUMERO}
              </p>
            )}
          </div>

          {/* Tags rápidas para personalização */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-700">Tags disponíveis para inserir:</span>
              <span className="text-[10px] text-gray-400">Clique para adicionar ao texto</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { tag: 'nome', label: 'Nome do Cliente' },
                { tag: 'uc', label: 'UC' },
                { tag: 'competencia', label: 'Mês/Competência' },
                { tag: 'consumo', label: 'Consumo (kWh)' },
                { tag: 'saldo', label: 'Saldo Atual' },
                { tag: 'economia', label: 'Economia' },
                { tag: 'link', label: 'Link do Relatório' },
              ].map((t) => (
                <button
                  key={t.tag}
                  type="button"
                  onClick={() => handleInserirTag(t.tag)}
                  className="px-2 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 rounded-lg border border-gray-200 text-[11px] font-medium transition-colors"
                >
                  +{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Campo Editável de Mensagem */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 uppercase tracking-wide block">
              Mensagem a ser enviada (editável):
            </label>
            <textarea
              rows={8}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full p-3 font-mono text-[11px] leading-relaxed rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 bg-white resize-y"
            />
          </div>

          {/* Link público da Análise */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 truncate text-emerald-900">
              <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate font-mono text-[11px]">{linkRelatorio}</span>
            </div>
            <button
              type="button"
              onClick={handleCopiarLink}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 transition-colors shrink-0 shadow-2xs"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar link</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-gray-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Ao enviar, a mensagem é despachada via <strong>Z-API</strong> para o WhatsApp
              cadastrado, aparece na conversa da <strong>Central de Atendimento</strong> e fica
              registrada na <strong>timeline do cliente</strong>.
            </span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={isSending}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-200/60 transition-colors"
          >
            Cancelar
          </button>

          <button
            type="button"
            disabled={isSending || !telefone.trim() || !mensagem.trim()}
            onClick={handleEnviarWhatsApp}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-all"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando pelo WhatsApp...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Disparar WhatsApp</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function useMemoTextoPadrao(params: {
  clienteNome: string
  uc: string
  competencia: string
  consumo: string
  saldo: string
  economia: string
  totalPagar: string
  linkRelatorio: string
}): string {
  return `Olá, ${params.clienteNome}! Tudo bem? Aqui é da equipe Delfos Solar. ☀️

Acabamos de realizar a auditoria técnica da sua fatura de energia da RGE referente ao ciclo de ${params.competencia} (UC: ${params.uc}).

Confira os principais destaques:
⚡ Consumo no período: ${params.consumo}
💰 Valor total a pagar: ${params.totalPagar}
🌱 Economia estimada com solar: ${params.economia}
📊 Saldo acumulado de energia: ${params.saldo}

Acesse o seu relatório interativo completo com o desdobramento de tarifas, impostos e recomendações no link abaixo:
🔗 ${params.linkRelatorio}

Ficamos à total disposição caso tenha dúvidas sobre os seus créditos ou faturamento!`
}

export default ModalEnviarAnaliseWhatsApp

import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  MessageSquare,
  Building,
  Loader2,
  AlertCircle,
  Clock,
  Phone,
  CheckCircle2,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import type { Atividade, Cliente } from '@/types/crm'
import { formatarDataParaDDMMAAAA } from '@/services/autoLeituraService'

export interface ModalEnviarLembreteAutoLeituraWhatsAppProps {
  isOpen: boolean
  onClose: () => void
  atividade: Atividade
  cliente?: Cliente | null
  onEnviadoSucesso?: (atividadeAtualizada?: Atividade) => void
}

export const ModalEnviarLembreteAutoLeituraWhatsApp: React.FC<
  ModalEnviarLembreteAutoLeituraWhatsAppProps
> = ({ isOpen, onClose, atividade, cliente, onEnviadoSucesso }) => {
  const { toast } = useToast()

  const clienteNome = cliente?.nome || atividade.expand?.cliente_id?.nome || 'Cliente'

  // Data de leitura formatada
  const dataLeituraStr = atividade.data_leitura || atividade.data || ''
  const dataVencimentoFormatada = dataLeituraStr
    ? formatarDataParaDDMMAAAA(dataLeituraStr.slice(0, 10))
    : 'data agendada'

  // Texto pré-preenchido conforme requisito do usuário:
  // "Olá [nome do cliente], tudo bem? Aqui é da Delfos Solar. Estamos próximos da data de leitura do seu relógio de energia (vencimento: [data]). Poderia nos enviar uma foto do medidor e o número da leitura? Agradecemos!"
  const textoPadrao = `Olá ${clienteNome}, tudo bem? Aqui é da Delfos Solar. Estamos próximos da data de leitura do seu relógio de energia (vencimento: ${dataVencimentoFormatada}). Poderia nos enviar uma foto do medidor e o número da leitura? Agradecemos!`

  // Telefone autoritativo do WhatsApp do cliente
  const telefoneAutoritativo =
    cliente?.whatsapp ||
    cliente?.telefone ||
    atividade.expand?.cliente_id?.whatsapp ||
    atividade.expand?.cliente_id?.telefone ||
    ''

  const [telefone, setTelefone] = useState(telefoneAutoritativo)
  const [mensagem, setMensagem] = useState(textoPadrao)
  const [isSending, setIsSending] = useState(false)
  const [etapaStatus, setEtapaStatus] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTelefone(telefoneAutoritativo)
      setMensagem(textoPadrao)
      setEtapaStatus(null)
    }
  }, [isOpen, telefoneAutoritativo, textoPadrao])

  if (!isOpen) return null

  const semWhatsApp = !telefoneAutoritativo.trim()

  const handleEnviarWhatsApp = async () => {
    const phoneToUse = telefone.trim() || telefoneAutoritativo.trim()

    if (!phoneToUse) {
      toast({
        title: 'WhatsApp não cadastrado',
        description:
          'O cliente não possui número de WhatsApp informado. Preencha o WhatsApp antes de enviar.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSending(true)
      setEtapaStatus('Conectando ao gateway Z-API...')

      const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
      const authToken = pb.authStore.token

      setEtapaStatus('Enviando lembrete de auto leitura...')

      const response = await fetch(`${baseUrl}/backend/v1/whatsapp/enviar-lembrete-auto-leitura`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: authToken } : {}),
        },
        body: JSON.stringify({
          atividade_id: atividade.id,
          telefone_destino: phoneToUse,
          mensagem_personalizada: mensagem.trim(),
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || data.message || 'Falha ao enviar lembrete via WhatsApp Z-API.',
        )
      }

      setEtapaStatus('Lembrete enviado!')

      toast({
        title: 'Lembrete enviado com sucesso!',
        description: `Mensagem enviada para ${phoneToUse}. Status da atividade atualizado para "Enviado".`,
      })

      // Busca atividade atualizada para refletir imediatamente
      let atualizada: Atividade | undefined
      try {
        atualizada = await pb.collection('atividades').getOne<Atividade>(atividade.id, {
          expand: 'cliente_id,usina_id,responsavel_id,parent_id',
        })
      } catch {
        /* intentionally ignored */
      }

      if (onEnviadoSucesso) {
        onEnviadoSucesso(atualizada)
      }

      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar lembrete via WhatsApp.'
      console.error('Erro ao enviar lembrete:', err)
      toast({
        title: 'Não foi possível enviar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
      setEtapaStatus(null)
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

      <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <MessageSquare className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                Enviar Lembrete por WhatsApp
              </h2>
              <p className="text-[11px] text-emerald-100">Disparo via Z-API oficial Delfos Solar</p>
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
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {/* Alerta de ausência de WhatsApp */}
          {semWhatsApp && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Cliente sem WhatsApp cadastrado</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Informe o número abaixo para realizar o envio. Esse número passará a ser o
                  WhatsApp autoritativo do cliente.
                </p>
              </div>
            </div>
          )}

          {/* Destinatário */}
          <div className="space-y-1.5">
            <label className="font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cliente e Telefone WhatsApp</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                disabled
                value={clienteNome}
                className="w-full px-3 py-2 bg-gray-100 rounded-xl border border-gray-200 text-gray-700 font-medium cursor-not-allowed"
              />
              <div className="relative">
                <input
                  type="tel"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Ex: 54999998888"
                  className="w-full pl-8 pr-3 py-2 bg-white rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900"
                />
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* Informações da leitura */}
          <div className="p-3 bg-orange-50/70 border border-orange-200 rounded-xl text-orange-950 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600 shrink-0" />
              <div>
                <span className="font-bold text-[11px] block">
                  Data prevista de leitura: {dataVencimentoFormatada}
                </span>
                {atividade.numero_uc && (
                  <span className="text-[10px] text-orange-800 font-mono">
                    UC: {atividade.numero_uc}
                  </span>
                )}
              </div>
            </div>
            {atividade.status === 'enviado' && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                Já enviado anteriormente
              </span>
            )}
          </div>

          {/* Mensagem editável */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-gray-700 uppercase tracking-wide block">
                Texto do Lembrete (editável):
              </label>
              <button
                type="button"
                onClick={() => setMensagem(textoPadrao)}
                className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold"
              >
                Restaurar padrão
              </button>
            </div>
            <textarea
              rows={6}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full p-3 font-sans text-xs leading-relaxed rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 bg-white resize-y"
              placeholder="Digite a mensagem do lembrete..."
            />
          </div>

          {/* Feedback de Etapa */}
          {etapaStatus && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
              <span className="font-medium">{etapaStatus}</span>
            </div>
          )}

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-gray-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Ao confirmar o envio, o lembrete será disparado pelo WhatsApp oficial via{' '}
              <strong>Z-API</strong>, o status da atividade mudará para <strong>Enviado</strong> e a
              mensagem ficará registrada no histórico do cliente.
            </span>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-all"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>
                  {atividade.status === 'enviado' ? 'Reenviar Lembrete' : 'Enviar Lembrete'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalEnviarLembreteAutoLeituraWhatsApp

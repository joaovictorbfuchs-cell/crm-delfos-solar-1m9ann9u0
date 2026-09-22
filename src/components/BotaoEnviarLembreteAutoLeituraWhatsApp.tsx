import React, { useState } from 'react'
import { MessageSquare, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { sendLembreteAutoLeituraWhatsApp } from '@/services/crmService'
import { useToast } from '@/hooks/use-toast'
import type { Atividade } from '@/types/crm'

interface BotaoEnviarLembreteAutoLeituraWhatsAppProps {
  atividade: Atividade
  onEnviado?: (updatedAtividade: Atividade) => void
  variant?: 'card' | 'modal' | 'icon'
  className?: string
}

export const BotaoEnviarLembreteAutoLeituraWhatsApp: React.FC<
  BotaoEnviarLembreteAutoLeituraWhatsAppProps
> = ({ atividade, onEnviado, variant = 'card', className = '' }) => {
  const [isSending, setIsSending] = useState(false)
  const { toast } = useToast()

  const handleEnviar = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    if (isSending) return

    try {
      setIsSending(true)
      const res = await sendLembreteAutoLeituraWhatsApp(atividade.id)

      if (res.ok && res.sent) {
        toast({
          title: 'Lembrete enviado!',
          description: `Mensagem enviada com sucesso para ${res.telefone_destino || 'o cliente'}.`,
        })

        // Retorna a atividade atualizada com lembrete_whatsapp_enviado_em
        const atvAtualizada: Atividade = res.atividade || {
          ...atividade,
          lembrete_whatsapp_enviado_em:
            res.lembrete_whatsapp_enviado_em || new Date().toISOString(),
        }

        if (onEnviado) {
          onEnviado(atvAtualizada)
        }
      } else {
        const errorMsg =
          res.error ||
          res.message ||
          'Falha ao enviar lembrete. Verifique as credenciais Z-API nos Secrets do Skip Cloud.'

        toast({
          variant: 'destructive',
          title: res.gatewayConfigured === false ? 'Z-API não configurada' : 'Falha no envio Z-API',
          description: errorMsg,
        })
      }
    } catch (err: any) {
      console.error('Erro ao enviar lembrete Auto Leitura:', err)
      const msg =
        err?.data?.error ||
        err?.message ||
        'Erro ao conectar com o serviço de WhatsApp. Verifique as credenciais Z-API nos Secrets.'

      toast({
        variant: 'destructive',
        title: 'Erro no envio WhatsApp',
        description: msg,
      })
    } finally {
      setIsSending(false)
    }
  }

  const jaEnviado = Boolean(atividade.lembrete_whatsapp_enviado_em)

  if (variant === 'modal') {
    return (
      <button
        type="button"
        onClick={handleEnviar}
        disabled={isSending}
        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
          jaEnviado
            ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        } disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        title={
          jaEnviado
            ? `Lembrete já enviado em ${new Date(atividade.lembrete_whatsapp_enviado_em!).toLocaleString('pt-BR')}. Clique para reenviar.`
            : 'Enviar lembrete de leitura do medidor via WhatsApp (Z-API)'
        }
      >
        {isSending ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Enviando WhatsApp...</span>
          </>
        ) : (
          <>
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{jaEnviado ? 'Reenviar lembrete WhatsApp' : 'Enviar lembrete WhatsApp'}</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleEnviar}
      disabled={isSending}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
        jaEnviado
          ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 hover:border-emerald-400'
      } disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      title={
        jaEnviado
          ? 'Lembrete já enviado. Clique para reenviar se necessário.'
          : 'Enviar lembrete de leitura do medidor via WhatsApp (Z-API)'
      }
    >
      {isSending ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
          <span>Enviando...</span>
        </>
      ) : (
        <>
          <MessageSquare
            className={`w-3 h-3 ${jaEnviado ? 'text-amber-600' : 'text-emerald-600'}`}
          />
          <span>{jaEnviado ? 'Reenviar WhatsApp' : 'Enviar lembrete WhatsApp'}</span>
        </>
      )}
    </button>
  )
}

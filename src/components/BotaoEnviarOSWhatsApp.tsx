import React, { useState } from 'react'
import { Send, Check, Loader2, AlertCircle, Phone, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enviarNotificacaoOSManual } from '@/services/crmService'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface BotaoEnviarOSWhatsAppProps {
  osId: string
  responsavelNome?: string
  responsavelTelefone?: string
  responsavelId?: string
  variant?: 'default' | 'outline' | 'ghost' | 'secondary'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showLabel?: boolean
  label?: string
  onSentSuccess?: (result: any) => void
}

export const BotaoEnviarOSWhatsApp: React.FC<BotaoEnviarOSWhatsAppProps> = ({
  osId,
  responsavelNome,
  responsavelTelefone,
  responsavelId,
  variant = 'outline',
  size = 'sm',
  className = '',
  showLabel = true,
  label = 'Enviar OS por WhatsApp',
  onSentSuccess,
}) => {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [feedbackMsg, setFeedbackMsg] = useState<string>('')

  const handleEnviar = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (!osId) {
      toast.error('Identificador da OS inválido')
      return
    }

    if (!responsavelId && !responsavelNome) {
      toast.error('Nenhum instalador responsável atribuído a esta OS', {
        description: 'Atribua um técnico à OS antes de disparar o WhatsApp.',
      })
      return
    }

    setStatus('loading')
    setFeedbackMsg('')

    try {
      const res = await enviarNotificacaoOSManual(osId)

      if (res.ok) {
        if (res.sent) {
          setStatus('success')
          setFeedbackMsg('Enviado com sucesso!')
          toast.success('OS enviada por WhatsApp!', {
            description: `Notificação enviada com sucesso para ${res.destinatario?.nome || responsavelNome || 'o instalador'}.`,
          })
        } else {
          // Registrado mas o gateway retornou falha ou não configurado
          setStatus('error')
          setFeedbackMsg(res.message || 'Falha no gateway')
          toast.warning('Disparo registrado com falha', {
            description: res.message || 'Verifique as credenciais da Z-API nos Secrets do backend.',
          })
        }

        if (onSentSuccess) {
          onSentSuccess(res)
        }

        // Retorna ao estado normal após 4 segundos
        setTimeout(() => {
          setStatus('idle')
          setFeedbackMsg('')
        }, 4000)
      } else {
        setStatus('error')
        const errMsg = res.message || 'Não foi possível enviar a OS por WhatsApp'
        setFeedbackMsg(errMsg)

        if (res.code === 'SEM_TELEFONE') {
          toast.error('Técnico sem WhatsApp cadastrado', {
            description: 'Cadastre o WhatsApp do técnico em Gerenciar Usuários.',
            action: {
              label: 'Ir para Usuários',
              onClick: () => navigate('/usuarios'),
            },
            duration: 7000,
          })
        } else if (res.code === 'SEM_RESPONSAVEL') {
          toast.error('OS sem responsável', {
            description: 'Atribua um técnico à ordem de serviço antes de enviar.',
          })
        } else {
          toast.error('Erro ao enviar OS', { description: errMsg })
        }

        setTimeout(() => {
          setStatus('idle')
          setFeedbackMsg('')
        }, 4500)
      }
    } catch (err: any) {
      console.error('Erro ao enviar OS por WhatsApp:', err)
      setStatus('error')
      const msg = err?.data?.error || err?.message || 'Falha de conexão com o servidor'
      setFeedbackMsg(msg)

      if (
        err?.data?.code === 'SEM_TELEFONE' ||
        msg.includes('telefone') ||
        msg.includes('WhatsApp')
      ) {
        toast.error('Técnico sem telefone', {
          description: 'Cadastre o WhatsApp do técnico em Gerenciar Usuários.',
          action: {
            label: 'Gerenciar Usuários',
            onClick: () => navigate('/usuarios'),
          },
          duration: 7000,
        })
      } else {
        toast.error('Erro ao disparar WhatsApp da OS', {
          description: msg,
        })
      }

      setTimeout(() => {
        setStatus('idle')
        setFeedbackMsg('')
      }, 4500)
    }
  }

  const hasNoPhone = responsavelId && !responsavelTelefone

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={status === 'success' ? 'default' : variant}
            size={size}
            onClick={handleEnviar}
            disabled={status === 'loading'}
            className={`transition-all duration-150 inline-flex items-center gap-1.5 font-medium select-none ${
              status === 'success'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                : status === 'error'
                  ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                  : 'hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/60'
            } ${className}`}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                {showLabel && <span className="text-xs">Enviando...</span>}
              </>
            ) : status === 'success' ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                {showLabel && <span className="text-xs font-bold text-white">Enviado ✓</span>}
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                {showLabel && (
                  <span className="text-xs text-rose-700 font-semibold">Tentar envio</span>
                )}
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {showLabel && <span className="text-xs">{label}</span>}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          {hasNoPhone ? (
            <p className="text-amber-300 font-semibold">
              ⚠️ Técnico sem telefone cadastrado. Clique para validar ou cadastre em Gerenciar
              Usuários.
            </p>
          ) : (
            <p>
              Enviar notificação desta OS via WhatsApp Z-API para o técnico{' '}
              {responsavelNome ? <strong>{responsavelNome}</strong> : 'responsável'}.
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

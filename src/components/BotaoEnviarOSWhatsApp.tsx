import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { Check, Loader2, AlertCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { enviarNotificacaoOSManual, fetchOrdemServicoById } from '@/services/crmService'
import { useClientes } from '@/contexts/ClientesContext'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ModalConfirmarEnvioWhatsApp } from './ModalConfirmarEnvioWhatsApp'

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
  const { whatsAppTemplates, clientes, refreshMensagens, refreshConversas } = useClientes()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [feedbackMsg, setFeedbackMsg] = useState<string>('')
  const [modalConferenciaAberto, setModalConferenciaAberto] = useState(false)
  const [osDetalhes, setOsDetalhes] = useState<any>(null)

  const isMountedRef = useRef(true)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current !== null) {
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      clearResetTimer()
    }
  }, [clearResetTimer])

  const handleFecharModal = useCallback(() => {
    setModalConferenciaAberto(false)
    // Se estava em loading mas o usuário cancelou/fechou o modal, libera o status para idle
    setStatus((prev) => (prev === 'loading' ? 'idle' : prev))
    setFeedbackMsg('')
    clearResetTimer()
  }, [clearResetTimer])

  // Template de OS com fallback seguro se whatsAppTemplates for undefined/vazio
  const templateOS = useMemo(() => {
    const lista = Array.isArray(whatsAppTemplates) ? whatsAppTemplates : []
    const doBanco = lista.find(
      (t) =>
        t?.slug === 'os_atribuida_instalador' ||
        (typeof t?.titulo === 'string' && t.titulo.toLowerCase().includes('os atribu')),
    )
    if (doBanco && typeof doBanco.conteudo === 'string') return doBanco

    return {
      id: 'os_atribuida_instalador',
      titulo: 'Notificação de OS para Técnico',
      slug: 'os_atribuida_instalador',
      conteudo:
        '📋 *Nova Ordem de Serviço atribuída*\n👤 Cliente: {nome_cliente}\n🔧 Serviço: {tipo_servico}\n📍 Endereço: {endereco}\n📅 Data: {data_agendada}\n👨‍🔧 Técnico: {nome_instalador}\n\nAcesse o CRM para ver a ficha de execução.',
      tipo_gatilho: 'operacional',
      ativo: true,
    }
  }, [whatsAppTemplates])

  const templatesParaModal = useMemo(() => {
    const conteudoSeguro =
      templateOS && typeof templateOS.conteudo === 'string'
        ? templateOS.conteudo
        : '📋 *Nova Ordem de Serviço atribuída*\n👤 Cliente: {nome_cliente}\n🔧 Serviço: {tipo_servico}'
    return [
      {
        id: templateOS?.id || 'os_atribuida_instalador',
        titulo: templateOS?.titulo || 'Notificação de OS para Técnico',
        conteudo: conteudoSeguro,
        descricao: 'Notificação de atribuição de OS ao instalador',
      },
    ]
  }, [templateOS])

  // Contexto de variáveis da OS
  const contextoVariaveis = useMemo(() => {
    const cliEncontrado = osDetalhes?.cliente_id
      ? clientes.find((c) => c.id === osDetalhes.cliente_id)
      : null

    const nomeCli =
      cliEncontrado?.nome ||
      cliEncontrado?.razao_social ||
      osDetalhes?.expand?.cliente_id?.nome ||
      'Cliente'

    const enderecoCli =
      osDetalhes?.endereco ||
      cliEncontrado?.endereco ||
      cliEncontrado?.cidade ||
      'Endereço a confirmar no CRM'

    let dataFmt = 'A definir'
    if (osDetalhes?.data_agendada) {
      try {
        const d = new Date(osDetalhes.data_agendada)
        if (!isNaN(d.getTime())) {
          dataFmt = d.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
          const horas = d.toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit',
          })
          if (horas && horas !== '00:00') {
            dataFmt = `${dataFmt} às ${horas}`
          }
        }
      } catch (_) {
        dataFmt = String(osDetalhes.data_agendada).slice(0, 10)
      }
    }

    return {
      nome_cliente: nomeCli || 'Cliente',
      tipo_servico: osDetalhes?.tipo_servico || osDetalhes?.titulo || 'Serviço em Campo',
      endereco: enderecoCli || 'Endereço a confirmar',
      data_agendada: dataFmt || 'A definir',
      nome_instalador: responsavelNome || osDetalhes?.atribuida_a || 'Instalador',
      id_os: osId || '',
    }
  }, [osDetalhes, clientes, responsavelNome, osId])

  const handleAbrirConferencia = async (e: React.MouseEvent) => {
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

    // Carrega dados da OS para preenchimento de variáveis
    try {
      const os = await fetchOrdemServicoById(osId)
      if (os) {
        setOsDetalhes(os)
      }
    } catch (err) {
      console.warn('Aviso ao carregar dados da OS para o modal:', err)
    }

    setModalConferenciaAberto(true)
  }

  const handleConfirmarEnvioModal = async ({
    telefone,
    mensagem,
  }: {
    telefone: string
    mensagem: string
  }) => {
    setStatus('loading')
    setFeedbackMsg('')

    try {
      // Interpolação defensiva completa de marcadores antes do disparo manual
      let mensagemProcessada = mensagem || ''
      mensagemProcessada = mensagemProcessada.replace(
        /\{Delfos Engenharia Ltda\}/g,
        'Delfos Engenharia Ltda',
      )

      const mapaSubstituicao: Record<string, string> = {
        nome_cliente: contextoVariaveis.nome_cliente || 'Cliente',
        tipo_servico: contextoVariaveis.tipo_servico || 'Serviço em Campo',
        endereco: contextoVariaveis.endereco || 'Endereço a confirmar',
        data_agendada: contextoVariaveis.data_agendada || 'A definir',
        nome_instalador: contextoVariaveis.nome_instalador || responsavelNome || 'Instalador',
        id_os: contextoVariaveis.id_os || osId || '',
      }

      Object.entries(mapaSubstituicao).forEach(([tag, val]) => {
        mensagemProcessada = mensagemProcessada.replace(new RegExp(`\\{${tag}\\}`, 'gi'), val)
        mensagemProcessada = mensagemProcessada.replace(new RegExp(`\\{\\{${tag}\\}\\}`, 'gi'), val)
      })

      // Limpeza de quaisquer marcadores remanescentes (nunca enviar chaves literais)
      mensagemProcessada = mensagemProcessada.replace(/\{[a-zA-Z0-9_-]+\}/g, '').trim()

      const res = await enviarNotificacaoOSManual(osId, {
        telefone_destino: telefone,
        mensagem_personalizada: mensagemProcessada,
      })

      if (res.ok) {
        // Sincronizar mensagens e conversas para refletir imediatamente na Central de Atendimento sem F5
        try {
          await Promise.allSettled([refreshMensagens(), refreshConversas()])
        } catch {
          /* intentionally ignored */
        }

        if (res.sent) {
          setStatus('success')
          setFeedbackMsg('Enviado com sucesso!')
          toast.success('OS enviada por WhatsApp!', {
            description: `Notificação enviada com sucesso para ${res.destinatario?.nome || responsavelNome || 'o instalador'}.`,
          })
        } else {
          setStatus('error')
          setFeedbackMsg(res.message || 'Falha no gateway')
          toast.warning('Disparo registrado com falha', {
            description: res.message || 'Verifique as credenciais da Z-API nos Secrets do backend.',
          })
        }

        if (onSentSuccess) {
          onSentSuccess(res)
        }

        clearResetTimer()
        resetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus('idle')
            setFeedbackMsg('')
          }
        }, 4000)

        return {
          ok: res.ok,
          sent: res.sent,
          message: res.message,
        }
      } else {
        if (!isMountedRef.current) return { ok: false, sent: false }
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

        clearResetTimer()
        resetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus('idle')
            setFeedbackMsg('')
          }
        }, 4500)

        return {
          ok: false,
          sent: false,
          message: errMsg,
        }
      }
    } catch (err: any) {
      console.error('Erro ao enviar OS por WhatsApp:', err)
      const msg =
        err?.data?.error ||
        err?.response?.error ||
        err?.message ||
        'Não foi possível concluir o envio por WhatsApp.'

      if (isMountedRef.current) {
        setStatus('error')
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
        } else if (err?.data?.code === 'SEM_RESPONSAVEL') {
          toast.error('OS sem responsável', {
            description: 'Atribua um técnico à ordem de serviço antes de enviar.',
          })
        } else {
          toast.error('Erro ao disparar WhatsApp da OS', {
            description: msg,
          })
        }

        clearResetTimer()
        resetTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setStatus('idle')
            setFeedbackMsg('')
          }
        }, 4500)
      }

      // Retornar objeto de falha em vez de relançar erro não tratado para não estourar o ErrorBoundary
      return {
        ok: false,
        sent: false,
        message: msg,
        error: msg,
      }
    }
  }

  const hasNoPhone = responsavelId && !responsavelTelefone

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={status === 'success' ? 'default' : variant}
              size={size}
              onClick={handleAbrirConferencia}
              disabled={status === 'loading'}
              className={`h-8 px-2.5 text-[11px] transition-all duration-150 inline-flex items-center gap-1.5 font-medium select-none ${
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
                  {showLabel && <span className="text-[11px]">Enviando...</span>}
                </>
              ) : status === 'success' ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3] text-white" />
                  {showLabel && <span className="text-[11px] font-bold text-white">Enviado ✓</span>}
                </>
              ) : status === 'error' ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  {showLabel && (
                    <span className="text-[11px] text-rose-700 font-semibold">Tentar envio</span>
                  )}
                </>
              ) : (
                <>
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {showLabel && <span className="text-[11px]">{label}</span>}
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-xs">
            {hasNoPhone ? (
              <p className="text-amber-300 font-semibold">
                ⚠️ Técnico sem telefone cadastrado. Clique para conferir número ou cadastrar em
                Gerenciar Usuários.
              </p>
            ) : (
              <p>
                Conferir e enviar notificação desta OS via WhatsApp Z-API para o técnico{' '}
                {responsavelNome ? <strong>{responsavelNome}</strong> : 'responsável'}.
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ModalConfirmarEnvioWhatsApp
        isOpen={modalConferenciaAberto}
        onClose={handleFecharModal}
        titulo="Conferência de Notificação de OS (WhatsApp)"
        subtitulo="Verifique o número do técnico responsável e o texto da OS antes do disparo."
        destinatarioNome={responsavelNome || 'Técnico Responsável'}
        telefoneInicial={responsavelTelefone || ''}
        mensagemInicial={templateOS?.conteudo || ''}
        templates={templatesParaModal}
        templatePadraoId={templateOS?.id || 'os_atribuida_instalador'}
        contextoVariaveis={contextoVariaveis}
        onConfirmarEnvio={handleConfirmarEnvioModal}
        confirmLabel="Confirmar e Enviar OS ao Técnico"
      />
    </>
  )
}

export default BotaoEnviarOSWhatsApp

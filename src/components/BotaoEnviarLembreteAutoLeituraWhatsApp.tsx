import React, { useState, useMemo } from 'react'
import { MessageSquare, Loader2, CheckCircle2 } from 'lucide-react'
import { sendLembreteAutoLeituraWhatsApp } from '@/services/crmService'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import type { Atividade } from '@/types/crm'
import { ModalConfirmarEnvioWhatsApp } from './ModalConfirmarEnvioWhatsApp'

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
  const [modalConferenciaAberto, setModalConferenciaAberto] = useState(false)
  const { toast } = useToast()
  const { clientes, sistemas, whatsAppTemplates, updateCliente } = useClientes()

  // Buscar cliente vinculado
  const cliente = useMemo(() => {
    return clientes.find((c) => c.id === atividade.cliente_id)
  }, [clientes, atividade.cliente_id])

  // Buscar usina vinculada (expand ou fallback em sistemas)
  const usina = useMemo(() => {
    if (atividade.expand?.usina_id) {
      return atividade.expand.usina_id
    }
    return sistemas.find((u) => u.id === atividade.usina_id)
  }, [atividade.expand, sistemas, atividade.usina_id])

  // Telefone inicial: WhatsApp é o número autoritativo do cliente
  const telefoneInicial = cliente?.whatsapp || cliente?.telefone || ''

  // Contexto de interpolação
  const contextoVariaveis = useMemo(() => {
    const nomeCliente = cliente?.nome || cliente?.razao_social || 'Cliente'
    const nomeUsina = usina?.nome || nomeCliente || 'sua unidade'
    const uc = usina?.numero_uc || cliente?.uc || 'não informado'
    const endereco =
      usina?.endereco || cliente?.endereco || cliente?.cidade || 'endereço cadastrado'

    return {
      nome_cliente: nomeCliente,
      usina: nomeUsina,
      numero_uc: uc,
      endereco: endereco,
    }
  }, [cliente, usina])

  // Template do banco ou default verbatim
  const templateLembrete = useMemo(() => {
    const doBanco = whatsAppTemplates.find(
      (t) =>
        t.slug === 'lembrete_auto_leitura_rge' || t.titulo.toLowerCase().includes('auto leitura'),
    )
    if (doBanco) return doBanco

    return {
      id: 'lembrete_auto_leitura_rge',
      titulo: 'Lembrete Auto Leitura RGE',
      slug: 'lembrete_auto_leitura_rge',
      conteudo:
        'Olá, boa tarde! Chegou o momento da leitura do medidor de energia na instalação da {usina}, instalação consumidora {numero_uc} e endereço {endereco}. Para garantirmos o correto envio das informações à RGE, pedimos que nos encaminhe um vídeo ou fotos do medidor, onde apareçam claramente as seguintes grandezas: 03 – Energia consumida (kWh) e 103 – Energia injetada (kWh). Após o envio das imagens, pedimos também que nos informe por escrito os valores das grandezas 03 e 103, para conferência e validação dos dados antes do envio à RGE.',
      tipo_gatilho: 'operacional',
      ativo: true,
    }
  }, [whatsAppTemplates])

  const templatesParaModal = useMemo(() => {
    return [
      {
        id: templateLembrete.id,
        titulo: templateLembrete.titulo,
        conteudo: templateLembrete.conteudo,
        descricao: 'Solicitação de fotos/vídeos e leitura grandezas 03 e 103',
      },
    ]
  }, [templateLembrete])

  const handleAbrirConferencia = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
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
    setIsSending(true)
    try {
      const res = await sendLembreteAutoLeituraWhatsApp(atividade.id, {
        telefone_destino: telefone,
        mensagem_personalizada: mensagem,
      })

      if (res.ok && res.sent) {
        toast({
          title: 'Lembrete enviado!',
          description: `Mensagem enviada com sucesso para ${res.telefone_destino || telefone || 'o cliente'}.`,
        })

        const atvAtualizada: Atividade = res.atividade || {
          ...atividade,
          lembrete_whatsapp_enviado_em:
            res.lembrete_whatsapp_enviado_em || new Date().toISOString(),
        }

        if (onEnviado) {
          onEnviado(atvAtualizada)
        }

        return { ok: true, sent: true }
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

        return {
          ok: false,
          sent: false,
          message: errorMsg,
        }
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

      throw err
    } finally {
      setIsSending(false)
    }
  }

  // Sincronizar número autoritativo do cliente caso editado no modal
  const handleSincronizarTelefone = async (novoTelefone: string) => {
    if (cliente && novoTelefone && novoTelefone !== cliente.whatsapp) {
      try {
        await updateCliente(cliente.id, {
          whatsapp: novoTelefone,
        })
      } catch (err) {
        console.warn('Aviso ao sincronizar telefone do cliente:', err)
      }
    }
  }

  const jaEnviado = Boolean(atividade.lembrete_whatsapp_enviado_em)

  if (variant === 'modal') {
    return (
      <>
        <button
          type="button"
          onClick={handleAbrirConferencia}
          disabled={isSending}
          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
            jaEnviado
              ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          } disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
          title={
            jaEnviado
              ? `Lembrete já enviado em ${new Date(atividade.lembrete_whatsapp_enviado_em!).toLocaleString('pt-BR')}. Clique para conferir e reenviar.`
              : 'Conferir e enviar lembrete de leitura do medidor via WhatsApp'
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

        <ModalConfirmarEnvioWhatsApp
          isOpen={modalConferenciaAberto}
          onClose={() => setModalConferenciaAberto(false)}
          titulo="Conferência de Lembrete Auto Leitura RGE"
          subtitulo="Revise o número do WhatsApp do cliente e a mensagem antes de disparar."
          destinatarioNome={cliente?.nome || cliente?.razao_social || 'Cliente'}
          telefoneInicial={telefoneInicial}
          mensagemInicial={templateLembrete.conteudo}
          templates={templatesParaModal}
          templatePadraoId={templateLembrete.id}
          contextoVariaveis={contextoVariaveis}
          onConfirmarEnvio={handleConfirmarEnvioModal}
          confirmLabel={jaEnviado ? 'Confirmar e Reenviar Lembrete' : 'Confirmar e Enviar Lembrete'}
          onSincronizarTelefone={handleSincronizarTelefone}
        />
      </>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={handleAbrirConferencia}
        disabled={isSending}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
          jaEnviado
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 hover:border-emerald-400'
        } disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        title={
          jaEnviado
            ? 'Lembrete já enviado. Clique para conferir e reenviar se necessário.'
            : 'Conferir e enviar lembrete de leitura do medidor via WhatsApp'
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

      <ModalConfirmarEnvioWhatsApp
        isOpen={modalConferenciaAberto}
        onClose={() => setModalConferenciaAberto(false)}
        titulo="Conferência de Lembrete Auto Leitura RGE"
        subtitulo="Revise o número do WhatsApp do cliente e a mensagem antes de disparar."
        destinatarioNome={cliente?.nome || cliente?.razao_social || 'Cliente'}
        telefoneInicial={telefoneInicial}
        mensagemInicial={templateLembrete.conteudo}
        templates={templatesParaModal}
        templatePadraoId={templateLembrete.id}
        contextoVariaveis={contextoVariaveis}
        onConfirmarEnvio={handleConfirmarEnvioModal}
        confirmLabel={jaEnviado ? 'Confirmar e Reenviar Lembrete' : 'Confirmar e Enviar Lembrete'}
        onSincronizarTelefone={handleSincronizarTelefone}
      />
    </>
  )
}

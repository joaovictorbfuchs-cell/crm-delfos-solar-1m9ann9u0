import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, ExternalLink, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import type { PropostaCarregador } from '@/types/crm'
import pb from '@/lib/pocketbase/client'

interface ModalEnviarPropostaCarregadorWhatsAppProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposta: PropostaCarregador
  clienteTelefone?: string
}

export const ModalEnviarPropostaCarregadorWhatsApp: React.FC<
  ModalEnviarPropostaCarregadorWhatsAppProps
> = ({ open, onOpenChange, proposta, clienteTelefone = '' }) => {
  const { toast } = useToast()
  const [telefone, setTelefone] = useState(clienteTelefone)
  const [copiado, setCopiado] = useState(false)

  const valorTotalStr = formatCurrency(proposta.valor_total || 8400)

  const mensagemPadrao =
    `Olá, ${proposta.cliente_nome || 'Prezado(a)'}! Tudo bem?\n\n` +
    `Aqui é da *Delfos Engenharia*. Conforme alinhado, elaborei a sua *Proposta Comercial de Infraestrutura de Recarga Veicular (Wallbox)*.\n\n` +
    `📄 *Proposta Nº:* ${proposta.numero_proposta || 'PROP-2025'}\n` +
    `⚡ *Normas:* 100% conforme NBR 5410 e NBR 17019 com ART no CREA-RS\n` +
    `💰 *Investimento Total:* ${valorTotalStr}\n` +
    `⏱️ *Validade das Condições:* 10 dias corridos\n\n` +
    `Fico à disposição para tirar qualquer dúvida e agendarmos a vistoria técnica!\n\n` +
    `*DELFOS ENGENHARIA SOLAR*`

  const [mensagem, setMensagem] = useState(mensagemPadrao)

  React.useEffect(() => {
    if (clienteTelefone && !telefone) {
      setTelefone(clienteTelefone)
    }
  }, [clienteTelefone, telefone])

  const sanitizarNumero = (num: string): string => {
    const limpo = num.replace(/\D/g, '')
    if (!limpo) return ''
    if (limpo.startsWith('55')) return limpo
    return `55${limpo}`
  }

  const handleCopiar = () => {
    navigator.clipboard.writeText(mensagem)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
    toast({
      title: 'Mensagem copiada!',
      description: 'Texto copiado para a área de transferência.',
    })
  }

  const handleAbrirWhatsApp = async () => {
    const foneSanitizado = sanitizarNumero(telefone)
    if (!foneSanitizado || foneSanitizado.length < 10) {
      toast({
        title: 'Telefone inválido',
        description: 'Por favor, informe um número de WhatsApp com DDD.',
        variant: 'destructive',
      })
      return
    }

    // Registra atividade no histórico do cliente
    try {
      if (proposta.cliente_id) {
        await pb.collection('atividades').create({
          cliente_id: proposta.cliente_id,
          negocio_id: proposta.negocio_id || null,
          tipo: 'contato',
          titulo: `Proposta de Carregador Veicular enviada via WhatsApp (${proposta.numero_proposta})`,
          descricao: `Enviada para o número ${foneSanitizado}.`,
          concluida: true,
          data_conclusao: new Date().toISOString(),
        })
      }
    } catch (logErr) {
      console.warn('Erro ao registrar histórico:', logErr)
    }

    const url = `https://wa.me/${foneSanitizado}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <MessageSquare className="w-5 h-5 text-[#25D366]" />
            Enviar Proposta via WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="tel-zap" className="text-xs font-semibold text-slate-700">
              Número de WhatsApp (com DDD)
            </Label>
            <Input
              id="tel-zap"
              placeholder="(54) 99999-0000"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="msg-zap" className="text-xs font-semibold text-slate-700">
              Mensagem para o Cliente
            </Label>
            <Textarea
              id="msg-zap"
              rows={8}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="mt-1 text-xs font-sans"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={handleCopiar} className="gap-1.5">
            {copiado ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copiado ? 'Copiado!' : 'Copiar Texto'}
          </Button>

          <Button
            type="button"
            onClick={handleAbrirWhatsApp}
            className="bg-[#25D366] hover:bg-[#20ba59] text-white gap-1.5 font-semibold"
          >
            <ExternalLink className="w-4 h-4" />
            Abrir no WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

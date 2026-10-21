import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  MessageSquare,
  ExternalLink,
  Copy,
  Check,
  Link as LinkIcon,
  FileText,
  Loader2,
  Send,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/formatters'
import type { PropostaCarregador } from '@/types/crm'
import pb from '@/lib/pocketbase/client'
import { sendWhatsAppDocumento } from '@/services/crmService'
import { gerarBase64PropostaCarregador } from '@/lib/pdfWhatsAppService'

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
  const [modoEnvio, setModoEnvio] = useState<'link' | 'pdf'>('link')
  const [enviandoPdf, setEnviandoPdf] = useState(false)

  const valorTotalStr = formatCurrency(proposta?.valor_total || 0)
  const clienteNome = proposta?.cliente_nome || 'Cliente'
  const numProp = proposta?.numero_proposta || 'PROP'

  const origem = typeof window !== 'undefined' ? window.location.origin : ''
  const linkVisualizacao = proposta?.id
    ? `${origem}/propostas?tab=carregadores&id=${proposta.id}&preview=1`
    : `${origem}/propostas?tab=carregadores`

  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    if (clienteTelefone && !telefone) {
      setTelefone(clienteTelefone)
    }
  }, [clienteTelefone, telefone])

  useEffect(() => {
    if (modoEnvio === 'link') {
      setMensagem(
        `Olá, ${clienteNome}! Tudo bem?\n\n` +
          `Aqui é da *Delfos Engenharia*. Conforme alinhado, elaborei a sua *Proposta Comercial de Infraestrutura de Recarga Veicular (Wallbox)*.\n\n` +
          `📄 *Proposta Nº:* ${numProp}\n` +
          `⚡ *Normas:* 100% conforme NBR 5410 e NBR 17019 com ART no CREA-RS\n` +
          `💰 *Investimento Total:* ${valorTotalStr}\n` +
          `⏱️ *Validade das Condições:* 10 dias corridos\n\n` +
          `🔗 *Acesse a proposta completa no link abaixo:*\n` +
          `${linkVisualizacao}\n\n` +
          `Fico à disposição para tirar qualquer dúvida e agendarmos a vistoria técnica!\n\n` +
          `*DELFOS ENGENHARIA SOLAR*`,
      )
    } else {
      setMensagem(
        `Olá, ${clienteNome}! Tudo bem?\n\n` +
          `Segue o PDF oficial da sua *Proposta Comercial de Infraestrutura de Recarga Veicular (Wallbox)* pela *Delfos Engenharia*.\n\n` +
          `📄 *Proposta Nº:* ${numProp}\n` +
          `💰 *Investimento Total:* ${valorTotalStr}\n` +
          `⚡ *Normas:* Conforme NBR 5410 e NBR 17019 com emissão de ART/CREA-RS.\n\n` +
          `Fico à disposição para tirar qualquer dúvida e agendarmos a vistoria técnica!\n\n` +
          `*DELFOS ENGENHARIA SOLAR*`,
      )
    }
  }, [modoEnvio, clienteNome, numProp, valorTotalStr, linkVisualizacao])

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

  const registrarHistorico = async (foneSanitizado: string, formato: string) => {
    try {
      if (proposta?.cliente_id) {
        await pb.collection('atividades').create({
          cliente_id: proposta.cliente_id,
          negocio_id: proposta.negocio_id || null,
          tipo: 'contato',
          titulo: `Proposta de Carregador Veicular enviada via WhatsApp (${formato}) - ${numProp}`,
          descricao: `Enviada para o número ${foneSanitizado}. Formato: ${formato}.`,
          concluida: true,
          data_conclusao: new Date().toISOString(),
        })
      }
    } catch (logErr) {
      console.warn('Erro ao registrar histórico:', logErr)
    }
  }

  const handleAbrirWhatsAppLink = async () => {
    const foneSanitizado = sanitizarNumero(telefone)
    if (!foneSanitizado || foneSanitizado.length < 10) {
      toast({
        title: 'Telefone inválido',
        description: 'Por favor, informe um número de WhatsApp com DDD.',
        variant: 'destructive',
      })
      return
    }

    await registrarHistorico(foneSanitizado, 'Link')

    const url = `https://wa.me/${foneSanitizado}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    toast({
      title: 'WhatsApp aberto com link!',
      description: 'Conversa iniciada com a proposta e o link direto.',
    })
    onOpenChange(false)
  }

  const handleEnviarWhatsAppPdf = async () => {
    const foneSanitizado = sanitizarNumero(telefone)
    if (!foneSanitizado || foneSanitizado.length < 10) {
      toast({
        title: 'Telefone inválido',
        description: 'Por favor, informe um número de WhatsApp com DDD.',
        variant: 'destructive',
      })
      return
    }

    setEnviandoPdf(true)
    try {
      toast({
        title: 'Gerando PDF da proposta...',
        description: 'Aguarde a renderização do arquivo A4.',
      })

      const { base64, fileName } = await gerarBase64PropostaCarregador(proposta as any)
      if (!base64) {
        throw new Error('Falha ao gerar o PDF da proposta em formato base64.')
      }

      // Tenta envio via API de documentos WhatsApp do sistema
      try {
        const resposta = await sendWhatsAppDocumento({
          cliente_id: proposta.cliente_id,
          telefone_destino: foneSanitizado,
          tipo: 'documento',
          referencia_id: proposta.id,
          legenda: mensagem,
          nome_arquivo: fileName,
          base64,
        })

        if (resposta && (resposta.sent || resposta.ok || resposta.status === 'ok')) {
          await registrarHistorico(foneSanitizado, 'PDF via API')
          toast({
            title: 'PDF enviado com sucesso!',
            description: `A proposta foi enviada para ${clienteNome}.`,
          })
          onOpenChange(false)
          return
        }
      } catch (gatewayErr) {
        console.warn('Envio direto via API falhou ou gateway sem conexão:', gatewayErr)
      }

      // Fallback: faz o download automático do PDF e abre a conversa do WhatsApp para o usuário anexar
      toast({
        title: 'PDF gerado e baixado!',
        description: 'Abrindo o WhatsApp para você enviar o arquivo baixado.',
      })

      const link = document.createElement('a')
      link.href = base64
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      await registrarHistorico(foneSanitizado, 'PDF gerado')

      const url = `https://wa.me/${foneSanitizado}?text=${encodeURIComponent(mensagem)}`
      window.open(url, '_blank', 'noopener,noreferrer')
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao gerar/enviar PDF por WhatsApp:', err)
      toast({
        title: 'Erro ao gerar PDF',
        description: err?.message || 'Não foi possível gerar o PDF. Você pode enviar por link.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoPdf(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <MessageSquare className="w-5 h-5 text-[#25D366]" />
            Enviar Proposta via WhatsApp
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Envie a proposta comercial de recarga veicular por link direto ou em PDF oficial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seletor do Formato de Envio */}
          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <Label className="text-xs font-semibold text-slate-800">Opção de Envio</Label>
            <RadioGroup
              value={modoEnvio}
              onValueChange={(v: 'link' | 'pdf') => setModoEnvio(v)}
              className="grid grid-cols-2 gap-2"
            >
              <label
                htmlFor="opt-zap-link"
                className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer text-xs font-medium transition-all ${
                  modoEnvio === 'link'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="link" id="opt-zap-link" />
                <LinkIcon className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Por Link da Proposta</span>
              </label>

              <label
                htmlFor="opt-zap-pdf"
                className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer text-xs font-medium transition-all ${
                  modoEnvio === 'pdf'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="pdf" id="opt-zap-pdf" />
                <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Por Arquivo PDF</span>
              </label>
            </RadioGroup>
          </div>

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
              className="mt-1 text-xs font-sans leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCopiar}
            className="gap-1.5"
            disabled={enviandoPdf}
          >
            {copiado ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copiado ? 'Copiado!' : 'Copiar Texto'}
          </Button>

          {modoEnvio === 'link' ? (
            <Button
              type="button"
              onClick={handleAbrirWhatsAppLink}
              className="bg-[#25D366] hover:bg-[#20ba59] text-white gap-1.5 font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir WhatsApp (Link)
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleEnviarWhatsAppPdf}
              disabled={enviandoPdf}
              className="bg-[#25D366] hover:bg-[#20ba59] text-white gap-1.5 font-semibold"
            >
              {enviandoPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar WhatsApp (PDF)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

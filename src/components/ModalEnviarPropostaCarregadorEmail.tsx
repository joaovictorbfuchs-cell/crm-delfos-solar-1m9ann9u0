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
import { Mail, Loader2, Paperclip, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { emailService } from '@/lib/emailService'
import { gerarHTMLPropostaCarregador } from '@/lib/propostaCarregadorGenerator'
import type { PropostaCarregador } from '@/types/crm'
import pb from '@/lib/pocketbase/client'

interface ModalEnviarPropostaCarregadorEmailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposta: PropostaCarregador
  clienteEmail?: string
  onEnviado?: () => void
}

export const ModalEnviarPropostaCarregadorEmail: React.FC<
  ModalEnviarPropostaCarregadorEmailProps
> = ({ open, onOpenChange, proposta, clienteEmail = '', onEnviado }) => {
  const { toast } = useToast()
  const [destinatario, setDestinatario] = useState(clienteEmail)
  const [assunto, setAssunto] = useState(
    `Proposta Comercial — Carregador Veicular Wallbox (${proposta.numero_proposta || 'Delfos'})`,
  )
  const [mensagem, setMensagem] = useState(
    `Olá, ${proposta.cliente_nome || 'Cliente'}!\n\n` +
      `Segue a Proposta Comercial da Delfos Engenharia para fornecimento e instalação técnica de infraestrutura de recarga veicular Wallbox.\n\n` +
      `Estamos à disposição para esclarecer quaisquer dúvidas técnicas ou comerciais.\n\n` +
      `Atenciosamente,\n` +
      `Delfos Engenharia Solar\n` +
      `Erechim – RS | (54) 3522-0000`,
  )
  const [enviando, setEnviando] = useState(false)

  // Atualiza destinatário se clienteEmail mudar
  React.useEffect(() => {
    if (clienteEmail && !destinatario) {
      setDestinatario(clienteEmail)
    }
  }, [clienteEmail, destinatario])

  const handleEnviar = async () => {
    if (!destinatario || !destinatario.includes('@')) {
      toast({
        title: 'E-mail inválido',
        description: 'Por favor, informe um endereço de e-mail de destino válido.',
        variant: 'destructive',
      })
      return
    }

    setEnviando(true)
    try {
      // 1. Gera o HTML completo da proposta
      const htmlProposta = gerarHTMLPropostaCarregador(proposta)

      // 2. Converte HTML para anexo em base64 (HTML renderizável/PDF-like)
      const htmlBase64 = btoa(unescape(encodeURIComponent(htmlProposta)))
      const nomeAnexo = `${proposta.numero_proposta || 'Proposta-Carregador'}.html`

      // 3. Monta corpo de e-mail formatado
      const corpoEmail = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6; max-width: 600px;">
          <h2 style="color: #047857; margin-bottom: 12px;">Delfos Engenharia — Proposta de Recarga Veicular</h2>
          <p>${mensagem.replace(/\n/g, '<br>')}</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <div style="background: #f8fafc; padding: 12px 16px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <p style="margin: 0; font-size: 13px; color: #64748b;">
              <strong>Anexo:</strong> ${nomeAnexo} (Proposta Comercial Wallbox completa com especificações NBR 5410/17019 e ART CREA-RS).
            </p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
            Delfos Engenharia Ltda • CNPJ: 21.379.952/0001-38 • Erechim – RS
          </p>
        </div>
      `

      // 4. Envia via emailService padrão (solar@updates.delfos.eng.br com remetente Delfos Solar)
      await emailService.enviarEmail({
        destinatario,
        assunto,
        corpoHtml: corpoEmail,
        anexos: [
          {
            filename: nomeAnexo,
            content: htmlBase64,
          },
        ],
      })

      // 5. Registra atividade no histórico do cliente / negócio
      try {
        if (proposta.cliente_id) {
          await pb.collection('atividades').create({
            cliente_id: proposta.cliente_id,
            negocio_id: proposta.negocio_id || null,
            tipo: 'contato',
            titulo: `Proposta de Carregador Veicular enviada por e-mail (${proposta.numero_proposta})`,
            descricao: `Enviada para ${destinatario} com assunto "${assunto}".`,
            concluida: true,
            data_conclusao: new Date().toISOString(),
          })
        }
      } catch (logErr) {
        console.warn('Não foi possível gravar histórico em atividades:', logErr)
      }

      // 6. Atualiza status da proposta para "Enviado ao cliente" se estiver "Em elaboração"
      if (proposta.id && proposta.status === 'Em elaboração') {
        try {
          await pb.collection('propostas_carregador').update(proposta.id, {
            status: 'Enviado ao cliente',
          })
        } catch (statusErr) {
          console.warn('Erro ao atualizar status da proposta:', statusErr)
        }
      }

      toast({
        title: 'E-mail enviado com sucesso!',
        description: `A proposta foi enviada para ${destinatario}.`,
      })

      onEnviado?.()
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao enviar e-mail da proposta:', err)
      const msg = err instanceof Error ? err.message : 'Falha desconhecida no envio de e-mail.'
      toast({
        title: 'Erro ao enviar e-mail',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Mail className="w-5 h-5 text-[#047857]" />
            Enviar Proposta por E-mail
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
            Remetente oficial: <strong>Delfos Solar</strong> (solar@updates.delfos.eng.br)
          </div>

          <div>
            <Label htmlFor="destinatario" className="text-xs font-semibold text-slate-700">
              E-mail do Destinatário *
            </Label>
            <Input
              id="destinatario"
              type="email"
              placeholder="cliente@exemplo.com.br"
              value={destinatario}
              onChange={(e) => setDestinatario(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="assunto" className="text-xs font-semibold text-slate-700">
              Assunto
            </Label>
            <Input
              id="assunto"
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="mensagem" className="text-xs font-semibold text-slate-700">
              Mensagem
            </Label>
            <Textarea
              id="mensagem"
              rows={5}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-xs font-medium">
            <Paperclip className="w-4 h-4 shrink-0 text-[#047857]" />
            <span>
              Anexo automático: <strong>{proposta.numero_proposta || 'Proposta'}.html</strong>
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleEnviar}
            disabled={enviando}
            className="bg-[#047857] hover:bg-[#065f46] text-white gap-1.5"
          >
            {enviando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Enviar Proposta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Tipos para envio de e-mails via backend Delfos Solar (Resend API)
 */

export interface EmailAttachment {
  filename: string
  /** Conteúdo do anexo codificado em Base64 */
  content: string
}

export interface SendEmailPayload {
  /** Destinatário único ou lista de destinatários */
  to: string | string[]
  /** Assunto da mensagem */
  subject: string
  /** Conteúdo HTML do e-mail */
  html: string
  /** Remetente customizado opcional (padrão Delfos Solar <delfos.usinas@gmail.com>) */
  from?: string
  /** Anexo opcional único */
  attachment?: {
    filename: string
    contentBase64?: string
    content?: string
  }
  /** Múltiplos anexos opcionais */
  attachments?: EmailAttachment[]
}

export interface SendEmailResponse {
  ok: boolean
  id?: string
  message?: string
  error?: string
}

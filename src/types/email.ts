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
  /** Conteúdo HTML ou texto do e-mail */
  html?: string
  body?: string
  corpo?: string
  /** Remetente customizado opcional (padrão Delfos Solar <delfos.usinas@gmail.com>) */
  from?: string
  /** Anexo opcional único */
  attachment?: {
    filename?: string
    name?: string
    contentBase64?: string
    content?: string
  }
  /** Múltiplos anexos opcionais */
  attachments?: EmailAttachment[]
}

export interface SendEmailResponse {
  ok: boolean
  sucesso?: boolean
  id?: string
  message_id?: string
  message?: string
  error?: string
  provedor?: string
}

/**
 * Parâmetros da função "Enviar Email via Gmail" (Composio / delfos.usinas@gmail.com)
 * Conforme especificação: Destinatário (email), Assunto, Corpo da mensagem (texto ou HTML), Anexos (opcional).
 */
export interface EnviarEmailViaGmailParams {
  destinatario: string | string[]
  assunto: string
  corpo: string
  anexos?: Array<{
    filename: string
    content: string
  }>
}

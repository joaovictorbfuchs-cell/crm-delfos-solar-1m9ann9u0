import pb from '@/lib/pocketbase/client'
import type { SendEmailPayload, SendEmailResponse } from '@/types/email'

export const DEFAULT_EMAIL_FROM = 'Delfos Solar <delfos.usinas@gmail.com>'

/**
 * Envia um e-mail através do backend Delfos Solar (Resend API).
 * Requer usuário autenticado no PocketBase.
 */
export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  if (!pb.authStore.isValid) {
    throw new Error('Usuário não autenticado. Faça login para enviar e-mails.')
  }

  if (!payload.to || (Array.isArray(payload.to) && payload.to.length === 0)) {
    throw new Error('Destinatário (to) é obrigatório.')
  }

  if (!payload.subject || !payload.subject.trim()) {
    throw new Error('Assunto (subject) é obrigatório.')
  }

  if (!payload.html || !payload.html.trim()) {
    throw new Error('Conteúdo HTML (html) é obrigatório.')
  }

  // Normalizar payload antes de enviar para o endpoint
  const bodyPayload: Record<string, unknown> = {
    to: payload.to,
    subject: payload.subject.trim(),
    html: payload.html,
    from: payload.from || DEFAULT_EMAIL_FROM,
  }

  if (payload.attachment) {
    bodyPayload.attachment = {
      filename: payload.attachment.filename,
      content: payload.attachment.content || payload.attachment.contentBase64 || '',
    }
  }

  if (payload.attachments && payload.attachments.length > 0) {
    bodyPayload.attachments = payload.attachments
  }

  const response = await pb.send<SendEmailResponse>('/backend/v1/email/send', {
    method: 'POST',
    body: bodyPayload,
  })

  if (!response.ok) {
    throw new Error(response.error || 'Falha ao enviar e-mail via Resend.')
  }

  return response
}

export const emailService = {
  sendEmail,
  DEFAULT_EMAIL_FROM,
}

export default emailService

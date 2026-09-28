import pb from '@/lib/pocketbase/client'
import type { EnviarEmailViaGmailParams, SendEmailPayload, SendEmailResponse } from '@/types/email'

export const DEFAULT_EMAIL_FROM = 'Delfos Solar <delfos.usinas@gmail.com>'
export const DEFAULT_GMAIL_SENDER = 'delfos.usinas@gmail.com'

/**
 * Função backend "Enviar Email via Gmail"
 * Usa a integração do Gmail conectada via Composio (conta delfos.usinas@gmail.com).
 * Parâmetros: Destinatário (email), Assunto, Corpo da mensagem (texto ou HTML), Anexos (opcional).
 * Retorna { ok, id, message, error }.
 */
export async function enviarEmailViaGmail(
  params: EnviarEmailViaGmailParams,
): Promise<SendEmailResponse> {
  if (!pb.authStore.isValid) {
    throw new Error('Usuário não autenticado. Faça login para enviar e-mails.')
  }

  const { destinatario, assunto, corpo, anexos } = params

  if (!destinatario || (Array.isArray(destinatario) && destinatario.length === 0)) {
    throw new Error('Destinatário (email) é obrigatório.')
  }

  if (!assunto || !assunto.trim()) {
    throw new Error('Assunto é obrigatório.')
  }

  if (!corpo || !corpo.trim()) {
    throw new Error('Corpo da mensagem (texto ou HTML) é obrigatório.')
  }

  const bodyPayload: Record<string, unknown> = {
    destinatario: destinatario,
    to: destinatario,
    assunto: assunto.trim(),
    subject: assunto.trim(),
    corpo: corpo,
    body: corpo,
    html: corpo,
  }

  if (anexos && anexos.length > 0) {
    bodyPayload.anexos = anexos
    bodyPayload.attachments = anexos
  }

  try {
    const response = await pb.send<SendEmailResponse>('/backend/v1/gmail/send', {
      method: 'POST',
      body: bodyPayload,
    })

    if (!response.ok && !response.sucesso) {
      throw new Error(response.error || 'Falha ao enviar e-mail via Gmail.')
    }

    return {
      ok: true,
      sucesso: true,
      id: response.id || response.message_id || '',
      message:
        response.message || 'E-mail enviado com sucesso via Gmail (delfos.usinas@gmail.com).',
      provedor: response.provedor || 'composio_gmail',
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object') {
      const pbErr = err as {
        status?: number
        statusCode?: number
        response?: { data?: Record<string, unknown>; message?: string; error?: string }
        data?: { message?: string; error?: string }
        message?: string
      }

      const backendMsg =
        pbErr.response?.data?.error ||
        pbErr.response?.data?.message ||
        pbErr.response?.error ||
        pbErr.data?.error ||
        pbErr.data?.message ||
        (pbErr.response?.data && typeof pbErr.response.data === 'string' ? pbErr.response.data : '')

      if (typeof backendMsg === 'string' && backendMsg.trim()) {
        throw new Error(backendMsg)
      }
    }
    throw err
  }
}

/**
 * Envia um e-mail através da função padrão do CRM.
 * Por padrão, delega para a nova integração "Enviar Email via Gmail".
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

  const corpo = payload.html || payload.body || payload.corpo || ''
  if (!corpo.trim()) {
    throw new Error('Conteúdo da mensagem (html/body) é obrigatório.')
  }

  // Normalizar lista de anexos
  const anexosList: Array<{ filename: string; content: string }> = []
  if (payload.attachments && payload.attachments.length > 0) {
    for (const a of payload.attachments) {
      if (a && a.filename && a.content) {
        anexosList.push({ filename: a.filename, content: a.content })
      }
    }
  } else if (payload.attachment) {
    const fn = payload.attachment.filename || payload.attachment.name || 'anexo'
    const ct = payload.attachment.content || payload.attachment.contentBase64 || ''
    if (ct) {
      anexosList.push({ filename: fn, content: ct })
    }
  }

  // Tentar primeiro via "Enviar Email via Gmail" (Composio)
  try {
    return await enviarEmailViaGmail({
      destinatario: payload.to,
      assunto: payload.subject,
      corpo: corpo,
      anexos: anexosList.length > 0 ? anexosList : undefined,
    })
  } catch (gmailErr: unknown) {
    console.warn(
      '[EMAIL SERVICE] Envio via Gmail reportou erro. Tentando endpoint legado /backend/v1/email/send...',
      gmailErr,
    )
  }

  // Fallback para /backend/v1/email/send se o envio via Gmail falhar
  const bodyPayload: Record<string, unknown> = {
    to: payload.to,
    subject: payload.subject.trim(),
    html: corpo,
    from: payload.from || DEFAULT_EMAIL_FROM,
  }

  if (anexosList.length > 0) {
    bodyPayload.attachments = anexosList
  }

  try {
    const response = await pb.send<SendEmailResponse>('/backend/v1/email/send', {
      method: 'POST',
      body: bodyPayload,
    })

    if (!response.ok) {
      throw new Error(response.error || 'Falha ao enviar e-mail.')
    }

    return response
  } catch (err: unknown) {
    // Se for ClientResponseError do PocketBase ou objeto de erro HTTP, extrair mensagem detalhada do backend
    if (err && typeof err === 'object') {
      const pbErr = err as {
        status?: number
        statusCode?: number
        response?: { data?: Record<string, unknown>; message?: string; error?: string }
        data?: { message?: string; error?: string }
        message?: string
      }

      const backendMsg =
        pbErr.response?.data?.error ||
        pbErr.response?.data?.message ||
        pbErr.response?.error ||
        pbErr.data?.error ||
        pbErr.data?.message ||
        (pbErr.response?.data && typeof pbErr.response.data === 'string' ? pbErr.response.data : '')

      if (typeof backendMsg === 'string' && backendMsg.trim()) {
        throw new Error(backendMsg)
      }

      if (pbErr.status === 403 || pbErr.statusCode === 403) {
        if (
          pbErr.message &&
          pbErr.message !== 'Something went wrong.' &&
          !pbErr.message.includes('403')
        ) {
          throw new Error(pbErr.message)
        }
        throw new Error(
          'Permissão negada (HTTP 403) pelo serviço de e-mail. Verifique o remetente configurado ou a chave de API.',
        )
      }

      if (pbErr.message && pbErr.message !== 'Something went wrong.') {
        throw new Error(pbErr.message)
      }
    }

    throw err
  }
}

export const emailService = {
  sendEmail,
  enviarEmailViaGmail,
  DEFAULT_EMAIL_FROM,
  DEFAULT_GMAIL_SENDER,
}

export default emailService

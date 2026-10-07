import pb from '@/lib/pocketbase/client'
import type {
  EmailAttachment,
  SendEmailPayload,
  SendEmailResponse,
  EnviarEmailParams,
} from '@/types/email'

/**
 * Remetente oficial padrão da Delfos Solar utilizando o domínio da empresa verificado no Resend.
 * Configurável via Secret RESEND_EMAIL_FROM no backend ou passando `from` no envio.
 */
export const DEFAULT_EMAIL_FROM = 'Delfos Solar <nao-responda@delfosengenharia.com.br>'
export const DEFAULT_EMAIL_DOMAIN = 'delfosengenharia.com.br'

/**
 * Recurso reutilizável em qualquer tela do projeto para envio de e-mails via serviço Resend (backend Skip Cloud / pb_hooks).
 *
 * Aceita:
 * - destinatario (string ou lista de e-mails)
 * - assunto
 * - corpoTexto (texto simples) e/ou corpoHtml (HTML estilizado)
 * - anexo (único) ou anexos (lista com { filename, content: base64 })
 * - from (remetente customizado opcional)
 *
 * Não expõe chave de API no frontend — toda a comunicação é autenticada e enviada via endpoint server-side.
 */
export async function enviarEmail(params: EnviarEmailParams): Promise<SendEmailResponse> {
  if (!pb.authStore.isValid) {
    throw new Error('Usuário não autenticado. Faça login para enviar e-mails.')
  }

  const { destinatario, assunto, corpoTexto, corpoHtml, anexo, anexos, from } = params

  if (!destinatario || (Array.isArray(destinatario) && destinatario.length === 0)) {
    throw new Error('Destinatário do e-mail é obrigatório.')
  }

  if (!assunto || !assunto.trim()) {
    throw new Error('Assunto do e-mail é obrigatório.')
  }

  // Define corpo da mensagem (HTML tem precedência; se houver texto simples, converte quebras em HTML)
  let htmlFinal = corpoHtml || ''
  if (!htmlFinal.trim() && corpoTexto) {
    const linhas = corpoTexto.split('\n')
    htmlFinal = `<!DOCTYPE html><html><body style="font-family: sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">${linhas
      .map((l) => (l.trim() ? `<p style="margin: 0 0 12px 0;">${l}</p>` : '<br/>'))
      .join('')}</body></html>`
  }

  if (!htmlFinal.trim() && !corpoTexto?.trim()) {
    throw new Error('Corpo da mensagem (texto simples ou HTML) é obrigatório.')
  }

  // Normalizar lista de anexos em base64
  const anexosList: EmailAttachment[] = []
  if (anexos && anexos.length > 0) {
    for (const a of anexos) {
      if (a && a.filename && a.content) {
        anexosList.push({ filename: a.filename, content: a.content })
      }
    }
  } else if (anexo) {
    const filename = anexo.filename || 'anexo'
    const content = anexo.content || ''
    if (content) {
      anexosList.push({ filename, content })
    }
  }

  const payload: Record<string, unknown> = {
    to: destinatario,
    subject: assunto.trim(),
    html: htmlFinal,
    from: from || DEFAULT_EMAIL_FROM,
  }

  if (anexosList.length > 0) {
    payload.attachments = anexosList
  }

  try {
    const response = await pb.send<SendEmailResponse>('/backend/v1/email/send', {
      method: 'POST',
      body: payload,
    })

    if (!response.ok && !response.sucesso) {
      throw new Error(response.error || 'Falha ao enviar e-mail via Resend.')
    }

    return {
      ok: true,
      sucesso: true,
      id: response.id || response.message_id || '',
      message: response.message || 'E-mail enviado com sucesso via Resend.',
      provedor: 'resend',
    }
  } catch (err: unknown) {
    if (err && typeof err === 'object') {
      const pbErr = err as {
        status?: number
        statusCode?: number
        response?: {
          data?: Record<string, unknown> | string
          message?: string
          error?: string
          resendError?: string
        }
        data?: { message?: string; error?: string; resendError?: string }
        message?: string
      }

      const rawBackendData = pbErr.response?.data
      const rawDataObj =
        typeof rawBackendData === 'object' && rawBackendData !== null ? rawBackendData : null

      const backendMsg =
        (rawDataObj?.error as string) ||
        (rawDataObj?.message as string) ||
        pbErr.response?.error ||
        pbErr.response?.message ||
        pbErr.data?.error ||
        pbErr.data?.message ||
        (typeof rawBackendData === 'string' ? rawBackendData : '') ||
        ''

      const originalDetail =
        (rawDataObj?.resendError as string) ||
        pbErr.data?.resendError ||
        backendMsg ||
        pbErr.message ||
        ''

      const combinedLower = `${backendMsg} ${originalDetail} ${pbErr.message || ''}`.toLowerCase()

      // 1. Caso específico: Domínio do remetente não verificado no Resend
      if (
        combinedLower.includes('domain is not verified') ||
        combinedLower.includes('is not verified') ||
        (combinedLower.includes('domain') && combinedLower.includes('resend.com/domains'))
      ) {
        throw new Error(
          'O domínio do remetente ainda não está verificado no Resend. Acesse https://resend.com/domains, adicione o domínio delfosengenharia.com.br e configure os registros DNS (SPF/DKIM) indicados pelo Resend. Enquanto o domínio não estiver verificado, o envio pelo remetente da empresa não funcionará.',
        )
      }

      // 2. Caso específico: Modo teste do Resend (só permite enviar para o e-mail da conta Resend)
      if (
        combinedLower.includes('you can only send testing emails') ||
        combinedLower.includes('testing emails to your own email address')
      ) {
        throw new Error(
          'O Resend está em modo de teste: enquanto não houver um domínio verificado, só é possível enviar e-mails para o próprio endereço da conta Resend (delfos.usinas@gmail.com). Para liberar o envio para qualquer destinatário, cadastre e verifique o domínio delfosengenharia.com.br em https://resend.com/domains.',
        )
      }

      // 3. Caso específico: Chave de API inválida ou sem permissão
      if (
        combinedLower.includes('invalid api key') ||
        combinedLower.includes('restricted api key') ||
        combinedLower.includes('missing api key') ||
        pbErr.status === 401 ||
        pbErr.statusCode === 401 ||
        ((pbErr.status === 403 || pbErr.statusCode === 403) && combinedLower.includes('api key'))
      ) {
        throw new Error('Chave de API do Resend inválida ou sem permissão.')
      }

      // Se o backend retornou mensagem customizada (incluindo tratamento de 403), repassa
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
          'Permissão negada (HTTP 403) pelo serviço Resend. Verifique o remetente configurado ou a chave RESEND_API_KEY.',
        )
      }

      if (pbErr.message && pbErr.message !== 'Something went wrong.') {
        throw new Error(pbErr.message)
      }
    }
    throw err
  }
}

/**
 * Função utilitária que converte um objeto File do navegador para string base64 limpa.
 */
export async function converterArquivoParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove prefixo data:*/*;base64,
      const cleanBase64 = result.includes(',') ? result.split(',')[1] : result
      resolve(cleanBase64)
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

/**
 * Export padrão e nomeado do serviço
 */
export const emailService = {
  enviarEmail,
  converterArquivoParaBase64,
  DEFAULT_EMAIL_FROM,
  DEFAULT_EMAIL_DOMAIN,
}

export default emailService

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  sendEmail,
  enviarEmail,
  enviarEmailViaGmail,
  DEFAULT_EMAIL_FROM,
  DEFAULT_GMAIL_SENDER,
  emailService,
} from './emailService'
import pb from '@/lib/pocketbase/client'

vi.mock('@/lib/pocketbase/client', () => {
  return {
    default: {
      authStore: {
        isValid: true,
      },
      send: vi.fn(),
    },
    pb: {
      authStore: {
        isValid: true,
      },
      send: vi.fn(),
    },
  }
})

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Por padrão usuário autenticado
    Object.defineProperty(pb.authStore, 'isValid', {
      value: true,
      configurable: true,
      writable: true,
    })
  })

  it('deve exportar o remetente padrão correto Delfos Solar com domínio da empresa e Gmail', () => {
    expect(DEFAULT_EMAIL_FROM).toBe('Delfos Solar <nao-responda@updates.delfos.eng.br>')
    expect(DEFAULT_GMAIL_SENDER).toBe('delfos.usinas@gmail.com')
    expect(emailService.DEFAULT_EMAIL_FROM).toBe(
      'Delfos Solar <nao-responda@updates.delfos.eng.br>',
    )
    expect(emailService.DEFAULT_GMAIL_SENDER).toBe('delfos.usinas@gmail.com')
  })

  describe('enviarEmail (recurso reutilizável Resend)', () => {
    it('deve validar parâmetros obrigatórios (destinatario, assunto, corpo)', async () => {
      await expect(
        enviarEmail({
          destinatario: '',
          assunto: 'Assunto',
          corpoTexto: 'Corpo',
        }),
      ).rejects.toThrow('Destinatário do e-mail é obrigatório')

      await expect(
        enviarEmail({
          destinatario: 'joao@delfosengenharia.com.br',
          assunto: '   ',
          corpoTexto: 'Corpo',
        }),
      ).rejects.toThrow('Assunto do e-mail é obrigatório')

      await expect(
        enviarEmail({
          destinatario: 'joao@delfosengenharia.com.br',
          assunto: 'Assunto',
          corpoTexto: '   ',
          corpoHtml: '',
        }),
      ).rejects.toThrow('Corpo da mensagem (texto simples ou HTML) é obrigatório')
    })

    it('deve chamar /backend/v1/email/send com os dados corretos e anexo em base64', async () => {
      vi.mocked(pb.send).mockResolvedValueOnce({
        ok: true,
        sucesso: true,
        id: 'msg_resend_123',
        message: 'E-mail enviado com sucesso',
      })

      const res = await enviarEmail({
        destinatario: 'joao@delfosengenharia.com.br',
        assunto: 'Solicitação de Faturas RGE',
        corpoHtml: '<p>Solicitação de faturas dos últimos 5 anos</p>',
        anexo: {
          filename: 'procuracao.pdf',
          content: 'JVBERi0xLjQK...',
        },
      })

      expect(pb.send).toHaveBeenCalledWith('/backend/v1/email/send', {
        method: 'POST',
        body: expect.objectContaining({
          to: 'joao@delfosengenharia.com.br',
          subject: 'Solicitação de Faturas RGE',
          html: '<p>Solicitação de faturas dos últimos 5 anos</p>',
          from: 'Delfos Solar <nao-responda@updates.delfos.eng.br>',
          attachments: [
            {
              filename: 'procuracao.pdf',
              content: 'JVBERi0xLjQK...',
            },
          ],
        }),
      })

      expect(res.ok).toBe(true)
      expect(res.id).toBe('msg_resend_123')
      expect(res.provedor).toBe('resend')
    })

    it('converte texto simples com quebras em HTML se corpoHtml não for fornecido', async () => {
      vi.mocked(pb.send).mockResolvedValueOnce({
        ok: true,
        id: 'msg_text_only',
      })

      await enviarEmail({
        destinatario: 'joao@delfosengenharia.com.br',
        assunto: 'Texto simples',
        corpoTexto: 'Linha 1\nLinha 2',
      })

      expect(pb.send).toHaveBeenCalledWith('/backend/v1/email/send', {
        method: 'POST',
        body: expect.objectContaining({
          html: expect.stringContaining('Linha 1'),
        }),
      })
    })
  })

  describe('enviarEmailViaGmail', () => {
    it('deve validar parâmetros obrigatórios (destinatario, assunto, corpo)', async () => {
      await expect(
        enviarEmailViaGmail({
          destinatario: '',
          assunto: 'Assunto',
          corpo: 'Corpo',
        }),
      ).rejects.toThrow('Destinatário (email) é obrigatório')

      await expect(
        enviarEmailViaGmail({
          destinatario: 'joao@delfosengenharia.com.br',
          assunto: '  ',
          corpo: 'Corpo',
        }),
      ).rejects.toThrow('Assunto é obrigatório')

      await expect(
        enviarEmailViaGmail({
          destinatario: 'joao@delfosengenharia.com.br',
          assunto: 'Assunto',
          corpo: '  ',
        }),
      ).rejects.toThrow('Corpo da mensagem (texto ou HTML) é obrigatório')
    })

    it('deve chamar /backend/v1/gmail/send com os dados corretos', async () => {
      vi.mocked(pb.send).mockResolvedValueOnce({
        ok: true,
        sucesso: true,
        id: 'msg_gmail_12345',
        message: 'E-mail enviado via Gmail (delfos.usinas@gmail.com) com sucesso.',
        provedor: 'composio_gmail',
      })

      const res = await enviarEmailViaGmail({
        destinatario: 'joao@delfosengenharia.com.br',
        assunto: 'Solicitação de Faturas RGE - Teste',
        corpo: '<p>Olá João, teste de envio via Gmail.</p>',
        anexos: [{ filename: 'doc.pdf', content: 'JVBERi0xLjQK...' }],
      })

      expect(pb.send).toHaveBeenCalledWith('/backend/v1/gmail/send', {
        method: 'POST',
        body: expect.objectContaining({
          destinatario: 'joao@delfosengenharia.com.br',
          assunto: 'Solicitação de Faturas RGE - Teste',
          corpo: '<p>Olá João, teste de envio via Gmail.</p>',
          anexos: [{ filename: 'doc.pdf', content: 'JVBERi0xLjQK...' }],
        }),
      })
      expect(res.ok).toBe(true)
      expect(res.id).toBe('msg_gmail_12345')
      expect(res.provedor).toBe('composio_gmail')
    })
  })

  it('deve falhar se usuário não estiver autenticado', async () => {
    Object.defineProperty(pb.authStore, 'isValid', {
      value: false,
      configurable: true,
      writable: true,
    })

    await expect(
      sendEmail({
        to: 'cliente@exemplo.com',
        subject: 'Teste',
        html: '<p>Teste</p>',
      }),
    ).rejects.toThrow('Usuário não autenticado')
  })

  it('deve validar parâmetros obrigatórios (to, subject, html)', async () => {
    await expect(
      sendEmail({
        to: '',
        subject: 'Assunto',
        html: '<p>Olá</p>',
      }),
    ).rejects.toThrow('Destinatário (to) é obrigatório')

    await expect(
      sendEmail({
        to: 'cliente@exemplo.com',
        subject: '   ',
        html: '<p>Olá</p>',
      }),
    ).rejects.toThrow('Assunto (subject) é obrigatório')

    await expect(
      sendEmail({
        to: 'cliente@exemplo.com',
        subject: 'Assunto',
        html: '  ',
      }),
    ).rejects.toThrow('Conteúdo da mensagem (html/body) é obrigatório')
  })

  it('deve chamar pb.send com o payload correto e retornar o resultado', async () => {
    const mockResponse = {
      ok: true,
      id: 'gmail_email_12345',
      message: 'E-mail enviado com sucesso',
    }
    vi.mocked(pb.send).mockResolvedValueOnce(mockResponse)

    const result = await sendEmail({
      to: 'cliente@exemplo.com',
      subject: 'Proposta Comercial Delfos',
      html: '<h1>Sua Proposta</h1><p>Segue proposta em anexo.</p>',
      attachment: {
        filename: 'proposta.pdf',
        contentBase64: 'JVBERi0xLjQK...',
      },
    })

    expect(pb.send).toHaveBeenCalledTimes(1)
    expect(pb.send).toHaveBeenCalledWith('/backend/v1/gmail/send', {
      method: 'POST',
      body: expect.objectContaining({
        destinatario: 'cliente@exemplo.com',
        assunto: 'Proposta Comercial Delfos',
        corpo: '<h1>Sua Proposta</h1><p>Segue proposta em anexo.</p>',
      }),
    })
    expect(result.ok).toBe(true)
    expect(result.id).toBe('gmail_email_12345')
  })

  it('deve tratar resposta ok: false lançando erro claro', async () => {
    vi.mocked(pb.send).mockResolvedValueOnce({
      ok: false,
      error: 'Falha na API do Resend (HTTP 500): Internal server error',
    })

    await expect(
      sendEmail({
        to: 'cliente@exemplo.com',
        subject: 'Assunto',
        html: '<p>Corpo</p>',
      }),
    ).rejects.toThrow('Internal server error')
  })

  it('deve extrair mensagem de domínio não verificado do Resend com instruções claras em português', async () => {
    const errorWithResponse = {
      status: 403,
      message: 'Something went wrong.',
      response: {
        data: {
          error:
            'The updates.delfos.eng.br domain is not verified. Please, add and verify your domain on https://resend.com/domains',
        },
      },
    }
    vi.mocked(pb.send).mockRejectedValueOnce(errorWithResponse)

    await expect(
      sendEmail({
        to: 'cliente@exemplo.com',
        subject: 'Assunto',
        html: '<p>Corpo</p>',
      }),
    ).rejects.toThrow('O domínio do remetente ainda não está verificado no Resend')
  })

  it('enviarEmail distingue erro de domínio não verificado vs chave de API inválida', async () => {
    // 1. Caso domínio não verificado (HTTP 403 do Resend)
    vi.mocked(pb.send).mockRejectedValueOnce({
      status: 403,
      statusCode: 403,
      message:
        'The updates.delfos.eng.br domain is not verified. Please, add and verify your domain on https://resend.com/domains',
      response: {
        data: {
          error:
            'The updates.delfos.eng.br domain is not verified. Please, add and verify your domain on https://resend.com/domains',
        },
      },
    })

    await expect(
      enviarEmail({
        destinatario: 'joao@delfosengenharia.com.br',
        assunto: 'Teste Domínio',
        corpoTexto: 'Texto do teste',
      }),
    ).rejects.toThrow(
      'O domínio do remetente ainda não está verificado no Resend. Acesse https://resend.com/domains',
    )

    // 2. Caso chave de API inválida (HTTP 401 ou 403 com texto de API key)
    vi.mocked(pb.send).mockRejectedValueOnce({
      status: 401,
      statusCode: 401,
      message: 'API key is invalid',
      response: {
        data: {
          error: 'API key is invalid',
        },
      },
    })

    await expect(
      enviarEmail({
        destinatario: 'joao@delfosengenharia.com.br',
        assunto: 'Teste Chave',
        corpoTexto: 'Texto do teste',
      }),
    ).rejects.toThrow('Chave de API do Resend inválida ou sem permissão')
  })
})

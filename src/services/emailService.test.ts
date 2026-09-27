import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendEmail, DEFAULT_EMAIL_FROM, emailService } from './emailService'
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

  it('deve exportar o remetente padrão correto Delfos Solar', () => {
    expect(DEFAULT_EMAIL_FROM).toBe('Delfos Solar <delfos.usinas@gmail.com>')
    expect(emailService.DEFAULT_EMAIL_FROM).toBe('Delfos Solar <delfos.usinas@gmail.com>')
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
    ).rejects.toThrow('Conteúdo HTML (html) é obrigatório')
  })

  it('deve chamar pb.send com o payload correto e retornar o resultado', async () => {
    const mockResponse = {
      ok: true,
      id: 'resend_email_12345',
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
    expect(pb.send).toHaveBeenCalledWith('/backend/v1/email/send', {
      method: 'POST',
      body: {
        to: 'cliente@exemplo.com',
        subject: 'Proposta Comercial Delfos',
        html: '<h1>Sua Proposta</h1><p>Segue proposta em anexo.</p>',
        from: DEFAULT_EMAIL_FROM,
        attachment: {
          filename: 'proposta.pdf',
          content: 'JVBERi0xLjQK...',
        },
      },
    })
    expect(result).toEqual(mockResponse)
    expect(result.id).toBe('resend_email_12345')
  })

  it('deve tratar resposta ok: false lançando erro claro', async () => {
    vi.mocked(pb.send).mockResolvedValueOnce({
      ok: false,
      error: 'Falha na API do Resend (403): domain not verified',
    })

    await expect(
      sendEmail({
        to: 'cliente@exemplo.com',
        subject: 'Assunto',
        html: '<p>Corpo</p>',
      }),
    ).rejects.toThrow('domain not verified')
  })
})

import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  FileCheck,
  Wrench,
  Download,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { aplicarPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import type { OrdemServico, Cliente, Sistema } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { gerarPdfRelatorioOS } from '@/lib/relatorioOSPdf'
import { enviarEmail } from '@/lib/emailService'
import pb from '@/lib/pocketbase/client'

export interface ModalEnviarRelatorioClienteProps {
  isOpen: boolean
  onClose: () => void
  os: OrdemServico
  cliente?: Cliente
  sistema?: Sistema | null
  onSuccess?: () => void
}

export const ModalEnviarRelatorioCliente: React.FC<ModalEnviarRelatorioClienteProps> = ({
  isOpen,
  onClose,
  os,
  cliente = os.expand?.cliente_id,
  sistema,
  onSuccess,
}) => {
  const { sendWhatsAppDocument, updateCliente, whatsAppConfig } = useClientes()

  // Destinatários
  const [emailCliente, setEmailCliente] = useState<string>('')
  const [telefoneCliente, setTelefoneCliente] = useState<string>('')

  // Seleção de canais para envio
  const [enviarPorEmail, setEnviarPorEmail] = useState<boolean>(true)
  const [enviarPorWhatsApp, setEnviarPorWhatsApp] = useState<boolean>(true)
  const [enviarApenasLink, setEnviarApenasLink] = useState<boolean>(false)

  // Link público do relatório
  const linkRelatorio = `${window.location.origin}/relatorio-os/${os.id}`

  // Conteúdo e PDF
  const [mensagem, setMensagem] = useState<string>('')
  const [assuntoEmail, setAssuntoEmail] = useState<string>('')
  const [nomeArquivo, setNomeArquivo] = useState<string>('')
  const [base64Doc, setBase64Doc] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(true)
  const [isSending, setIsSending] = useState<boolean>(false)

  // Feedback individual por canal
  const [statusEmail, setStatusEmail] = useState<{
    status: 'idle' | 'enviando' | 'sucesso' | 'erro'
    mensagem?: string
  }>({ status: 'idle' })

  const [statusWhatsApp, setStatusWhatsApp] = useState<{
    status: 'idle' | 'enviando' | 'sucesso' | 'erro' | 'aviso'
    mensagem?: string
  }>({ status: 'idle' })

  const handleSafeClose = () => {
    setIsSending(false)
    setStatusEmail({ status: 'idle' })
    setStatusWhatsApp({ status: 'idle' })
    onClose()
  }

  // Listener para tecla Escape
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        handleSafeClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Inicialização de dados do cliente e compilação do relatório
  useEffect(() => {
    if (!isOpen) return

    // E-mail do cliente
    const emailCli = cliente?.email || (os as any).cliente_email || ''
    setEmailCliente(emailCli)
    if (!emailCli) {
      setEnviarPorEmail(false)
    } else {
      setEnviarPorEmail(true)
    }

    // Telefone / WhatsApp do cliente
    import('@/lib/resolverNumeroDestinoCliente').then(({ resolverNumeroDestinoCliente }) => {
      resolverNumeroDestinoCliente(cliente).then((res) => {
        if (res.numeroFormatado) {
          setTelefoneCliente(res.numeroFormatado)
          setEnviarPorWhatsApp(true)
        } else {
          const tel = cliente?.whatsapp || cliente?.telefone || ''
          setTelefoneCliente(tel)
          setEnviarPorWhatsApp(Boolean(tel))
        }
      })
    })

    const clientePrimeiroNome = cliente?.nome ? cliente.nome.split(' ')[0] : 'Cliente'
    const osIdCurto = os.id.slice(-6).toUpperCase()
    const defaultFileName = `Relatorio_OS_${osIdCurto}.pdf`
    setNomeArquivo(defaultFileName)

    setAssuntoEmail(`Delfos Solar - Relatório Técnico de Execução • OS #${osIdCurto}`)

    const urlRelatorioOS = `${window.location.origin}/relatorio-os/${os.id}`
    const msgSugerida = `Olá ${clientePrimeiroNome}! Segue o Relatório Técnico de Execução da Ordem de Serviço #${osIdCurto} (${os.tipo_servico || 'Serviço em Campo'}) realizada pela equipe da Delfos Solar.\n\nVocê também pode acessar o relatório online pelo link:\n${urlRelatorioOS}\n\nQualquer dúvida, estamos à disposição!`
    setMensagem(msgSugerida)

    setStatusEmail({ status: 'idle' })
    setStatusWhatsApp({ status: 'idle' })
    setIsGenerating(true)

    async function prepararRelatorio() {
      try {
        let url = ''
        if (os.relatorio_pdf) {
          try {
            url = pb.files.getURL(os, os.relatorio_pdf)
          } catch {
            url = ''
          }
        }

        let base64Pronto = ''
        if (url) {
          try {
            const resp = await fetch(url)
            const blob = await resp.blob()
            base64Pronto = await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onload = () => resolve(String(reader.result || ''))
              reader.onerror = () => resolve('')
              reader.readAsDataURL(blob)
            })
          } catch (e) {
            console.warn('Falha ao baixar PDF existente para base64:', e)
          }
        }

        if (!base64Pronto) {
          const res = await gerarPdfRelatorioOS(os, {
            cliente,
            sistema,
          })
          base64Pronto = res.base64
          setNomeArquivo(res.fileName || defaultFileName)
        }

        setBase64Doc(base64Pronto)
      } catch (err) {
        console.error('Erro ao compilar relatório de OS:', err)
        setBase64Doc('')
      } finally {
        setIsGenerating(false)
      }
    }

    prepararRelatorio()
  }, [isOpen, os, cliente, sistema])

  if (!isOpen) return null

  const temEmailValido = Boolean(
    emailCliente.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCliente.trim()),
  )
  const temTelefoneValido = Boolean(telefoneCliente.trim().replace(/\D/g, '').length >= 10)

  const podeEnviar =
    (enviarApenasLink || Boolean(base64Doc)) &&
    (!isGenerating || enviarApenasLink) &&
    !isSending &&
    ((enviarPorEmail && temEmailValido) || (enviarPorWhatsApp && temTelefoneValido))

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podeEnviar) return

    setIsSending(true)
    setStatusEmail({ status: 'idle' })
    setStatusWhatsApp({ status: 'idle' })

    const cleanBase64 = base64Doc.includes(',') ? base64Doc.split(',')[1] : base64Doc
    const fileNomeFinal = nomeArquivo || `Relatorio_OS_${os.id.slice(-6).toUpperCase()}.pdf`
    let canalSucesso = 0

    // 1. Envio por E-mail via Resend (remetente oficial updates.delfos.eng.br)
    if (enviarPorEmail) {
      if (!temEmailValido) {
        setStatusEmail({ status: 'erro', mensagem: 'E-mail do cliente inválido ou ausente.' })
      } else {
        setStatusEmail({ status: 'enviando', mensagem: 'Enviando e-mail via Delfos Solar...' })
        try {
          const clienteNome = cliente?.nome || cliente?.razao_social || 'Cliente Solar'
          const osIdCurto = os.id.slice(-6).toUpperCase()

          const corpoHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8" /></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1E293B; background: #F8FAFC; padding: 20px;">
              <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0;">
                <div style="background: #0F172A; padding: 24px; border-bottom: 3px solid #16A34A; text-align: center;">
                  <h1 style="color: #FFFFFF; font-size: 20px; margin: 0; font-weight: 900; letter-spacing: 0.05em;">DELFOS SOLAR</h1>
                  <p style="color: #16A34A; font-size: 11px; margin: 4px 0 0 0; font-weight: 800; text-transform: uppercase;">Relatório Técnico de Execução em Campo</p>
                </div>
                <div style="padding: 24px;">
                  <p style="font-size: 14px; margin-top: 0;">Olá, <strong>${clienteNome}</strong>!</p>
                  <p style="font-size: 13px; color: #475569;">
                    Apresentamos o Relatório Técnico oficial referente à conclusão da <strong>Ordem de Serviço #${osIdCurto}</strong> (${os.tipo_servico || 'Serviço em Campo'}).
                  </p>
                  <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; font-size: 12px; color: #166534; font-weight: bold;">
                      ✓ Serviço finalizado com sucesso e validado pela equipe técnica Delfos Solar.
                    </p>
                  </div>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${linkRelatorio}" style="background-color: #16A34A; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
                      Acessar Relatório Técnico Completo Online
                    </a>
                    <p style="font-size: 11px; color: #64748B; margin-top: 8px;">
                      Ou cole o link no seu navegador: <br /><a href="${linkRelatorio}" style="color: #16A34A;">${linkRelatorio}</a>
                    </p>
                  </div>
                  <p style="font-size: 12px; color: #64748B; margin-bottom: 0;">
                    Em caso de dúvidas, estamos à disposição pelo WhatsApp (54) 99129-2121 ou pelo e-mail solar@updates.delfos.eng.br.
                  </p>
                </div>
                <div style="background: #F1F5F9; padding: 12px 24px; font-size: 11px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0;">
                  Delfos Engenharia Ltda • Rua Espírito Santo, 275 – Erechim/RS • www.delfos.eng.br
                </div>
              </div>
            </body>
            </html>
          `

          await enviarEmail({
            destinatario: emailCliente.trim(),
            assunto: assuntoEmail.trim() || `Delfos Solar - Relatório Técnico • OS #${osIdCurto}`,
            corpoHtml,
            from: 'Delfos Solar <solar@updates.delfos.eng.br>',
            anexo: enviarApenasLink
              ? undefined
              : {
                  filename: fileNomeFinal,
                  content: cleanBase64,
                },
          })

          setStatusEmail({
            status: 'sucesso',
            mensagem: `E-mail enviado com sucesso para ${emailCliente.trim()}`,
          })
          canalSucesso += 1
        } catch (err: unknown) {
          console.error('Erro ao enviar e-mail de relatório:', err)
          const msg = err instanceof Error ? err.message : String(err)
          setStatusEmail({
            status: 'erro',
            mensagem: `Falha no envio de e-mail: ${msg}`,
          })
        }
      }
    }

    // 2. Envio por WhatsApp (disparo explícito acionado pelo usuário)
    if (enviarPorWhatsApp) {
      const telLimpo = telefoneCliente.trim()
      if (!temTelefoneValido) {
        setStatusWhatsApp({
          status: 'erro',
          mensagem: 'Telefone de WhatsApp inválido ou sem DDD.',
        })
      } else {
        setStatusWhatsApp({
          status: 'enviando',
          mensagem: 'Disparando relatório via WhatsApp...',
        })
        try {
          if (cliente?.id && telLimpo !== cliente.whatsapp) {
            try {
              await updateCliente(cliente.id, {
                whatsapp: formatWhatsAppPhone(telLimpo),
              })
            } catch {
              /* ignore */
            }
          }

          let textoMensagem = mensagem.trim()
          if (!textoMensagem.includes(linkRelatorio)) {
            textoMensagem = `${textoMensagem}\n\nLink do relatório: ${linkRelatorio}`.trim()
          }
          const legendaComPrefixo = textoMensagem ? aplicarPrefixoMensagemManual(textoMensagem) : ''

          let res: any
          if (enviarApenasLink) {
            // Dispara via mensagem de texto com o link embutido
            const { sendWhatsAppMensagem } = await import('@/services/crmService')
            res = await sendWhatsAppMensagem({
              cliente_id: cliente?.id,
              telefone_destino: telLimpo,
              mensagem: legendaComPrefixo,
              referencia_id: os.id,
              tipo_disparo: 'manual',
            })
          } else {
            // Dispara documento em anexo com a legenda contendo o link
            res = await sendWhatsAppDocument({
              cliente_id: cliente?.id,
              telefone_destino: telLimpo,
              tipo: 'documento',
              referencia_id: os.id,
              legenda: legendaComPrefixo,
              nome_arquivo: fileNomeFinal,
              base64: base64Doc,
            })
          }

          if (res.sent) {
            setStatusWhatsApp({
              status: 'sucesso',
              mensagem: `Relatório enviado com sucesso via WhatsApp para ${telLimpo}`,
            })
            canalSucesso += 1
          } else if (res.gatewayConfigured === false) {
            setStatusWhatsApp({
              status: 'aviso',
              mensagem: 'Registrado: gateway Z-API ainda não configurado para envio em tempo real.',
            })
          } else {
            setStatusWhatsApp({
              status: 'aviso',
              mensagem: `WhatsApp registrado: ${res.message || 'Status: ' + (res.status || 'pendente')}`,
            })
          }
        } catch (err: unknown) {
          console.error('Erro ao enviar relatório via WhatsApp:', err)
          const msg = err instanceof Error ? err.message : String(err)
          setStatusWhatsApp({
            status: 'erro',
            mensagem: `Falha no envio via WhatsApp: ${msg}`,
          })
        }
      }
    }

    setIsSending(false)

    if (canalSucesso > 0 && onSuccess) {
      onSuccess()
    }
  }

  const handleDownloadPdf = () => {
    if (!base64Doc) return
    const a = document.createElement('a')
    a.href = base64Doc
    a.download = nomeArquivo || `Relatorio_OS_${os.id.slice(-6).toUpperCase()}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSafeClose()
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden"
      >
        {/* Header do Modal */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Enviar Relatório ao Cliente
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  OS #{os.id.slice(-6).toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Dispara o PDF oficial do relatório técnico por e-mail e/ou WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSafeClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Fechar"
            aria-label="Fechar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <form onSubmit={handleEnviar} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Opção de Enviar Apenas Link */}
          <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-200 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enviarApenasLink}
                onChange={(e) => setEnviarApenasLink(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-emerald-950">
                Enviar apenas o link (sem anexo PDF)
              </span>
            </label>
            <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-emerald-100 flex items-center justify-between gap-2 overflow-hidden">
              <span className="truncate font-mono text-[10px] text-slate-700">{linkRelatorio}</span>
              <a
                href={linkRelatorio}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold shrink-0 underline"
              >
                Abrir link
              </a>
            </div>
          </div>

          {/* Card do PDF Anexo (só relevante se não for apenas link) */}
          <div
            className={`p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center justify-between gap-3 ${
              enviarApenasLink ? 'opacity-50' : ''
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                <FileCheck className="w-4 h-4 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate">
                  {nomeArquivo || 'Relatorio_OS.pdf'}
                </div>
                <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                  <span>
                    {enviarApenasLink
                      ? 'Anexo desativado pelo envio por link'
                      : 'Relatório Técnico Oficial Delfos Solar'}
                  </span>
                  {!enviarApenasLink && isGenerating && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Processando PDF...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {base64Doc && (
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  title="Baixar cópia do PDF"
                  className="p-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white border border-emerald-300 text-emerald-800">
                {enviarApenasLink
                  ? 'Link direto'
                  : base64Doc
                    ? 'Pronto'
                    : isGenerating
                      ? 'Gerando...'
                      : 'Pendente'}
              </span>
            </div>
          </div>

          {/* Feedback Individual de E-mail */}
          {statusEmail.status !== 'idle' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                statusEmail.status === 'sucesso'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : statusEmail.status === 'enviando'
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {statusEmail.status === 'sucesso' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {statusEmail.status === 'enviando' && (
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              )}
              {statusEmail.status === 'erro' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">
                <strong>E-mail:</strong> {statusEmail.mensagem}
              </div>
            </div>
          )}

          {/* Feedback Individual de WhatsApp */}
          {statusWhatsApp.status !== 'idle' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                statusWhatsApp.status === 'sucesso'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : statusWhatsApp.status === 'enviando'
                    ? 'bg-blue-50 border border-blue-200 text-blue-900'
                    : statusWhatsApp.status === 'aviso'
                      ? 'bg-amber-50 border border-amber-200 text-amber-900'
                      : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {statusWhatsApp.status === 'sucesso' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {statusWhatsApp.status === 'enviando' && (
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              )}
              {statusWhatsApp.status === 'aviso' && (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              {statusWhatsApp.status === 'erro' && (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">
                <strong>WhatsApp:</strong> {statusWhatsApp.mensagem}
              </div>
            </div>
          )}

          {/* Destinatário 1: E-mail do Cliente */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enviarPorEmail}
                  onChange={(e) => setEnviarPorEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Enviar por E-mail</span>
              </label>
              <span className="text-[11px] text-gray-500">
                Remetente: solar@updates.delfos.eng.br
              </span>
            </div>

            {enviarPorEmail && (
              <div>
                <input
                  type="email"
                  value={emailCliente}
                  onChange={(e) => setEmailCliente(e.target.value)}
                  placeholder="cliente@email.com"
                  className={`w-full text-xs font-semibold px-3 py-2 rounded-lg border ${
                    !temEmailValido ? 'border-amber-400 bg-amber-50/30' : 'border-gray-300 bg-white'
                  } text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs`}
                />
                {!temEmailValido && (
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Informe o e-mail do cliente para disparar este canal.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Destinatário 2: WhatsApp do Cliente */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enviarPorWhatsApp}
                  onChange={(e) => setEnviarPorWhatsApp(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enviar por WhatsApp</span>
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {whatsAppConfig?.isZApi ? 'Gateway Z-API Conectado' : 'Gateway Ativo'}
              </span>
            </div>

            {enviarPorWhatsApp && (
              <div>
                <input
                  type="text"
                  value={telefoneCliente}
                  onChange={(e) => setTelefoneCliente(formatWhatsAppPhone(e.target.value))}
                  placeholder="(54) 99999-9999"
                  className={`w-full text-xs font-semibold px-3 py-2 rounded-lg border ${
                    !temTelefoneValido
                      ? 'border-amber-400 bg-amber-50/30'
                      : 'border-gray-300 bg-white'
                  } text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs`}
                />
                {!temTelefoneValido && (
                  <p className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    Informe o telefone com DDD (ex: 54 99999-9999).
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Mensagem / Legenda */}
          {enviarPorWhatsApp && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Mensagem WhatsApp de Acompanhamento
                </label>
                <span className="text-[11px] text-gray-400">Texto padrão sugerido</span>
              </div>
              <textarea
                rows={3}
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
                placeholder="Mensagem para o cliente..."
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
              />
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleSafeClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Fechar
            </button>

            <button
              type="submit"
              disabled={!podeEnviar}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.02]"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Enviando Relatório...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Confirmar e Enviar Relatório</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ModalEnviarRelatorioCliente

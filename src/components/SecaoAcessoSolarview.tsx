import React, { useState, useEffect } from 'react'
import {
  Smartphone,
  User,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Save,
  CheckCircle2,
  Info,
  Send,
  AlertCircle,
  Apple,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Cliente, Sistema } from '@/types/crm'
import { DEFAULT_SOLARVIEW_CONFIG, sendWhatsAppMensagem } from '@/services/crmService'
import { cleanPhoneDigits } from '@/lib/formatters'
import { getFriendlyWhatsAppErrorMessage } from '@/lib/whatsappGateway'

interface SecaoAcessoSolarviewProps {
  cliente: Cliente
  sistema?: Sistema | null
  onUpdateClienteField: (field: keyof Cliente, value: any) => Promise<void>
  onUpdateSistemaField?: (field: keyof Sistema, value: any) => Promise<void>
}

export const SecaoAcessoSolarview: React.FC<SecaoAcessoSolarviewProps> = ({
  cliente,
  sistema,
  onUpdateClienteField,
  onUpdateSistemaField,
}) => {
  // Estado local dos campos do Solarview
  const [login, setLogin] = useState(cliente.solarview_login || sistema?.solarview_login || '')
  const [senha, setSenha] = useState(cliente.solarview_senha || sistema?.solarview_senha || '')
  const [linkIos, setLinkIos] = useState(
    cliente.solarview_link_ios || sistema?.solarview_link_ios || DEFAULT_SOLARVIEW_CONFIG.link_ios,
  )
  const [linkAndroid, setLinkAndroid] = useState(
    cliente.solarview_link_android ||
      sistema?.solarview_link_android ||
      DEFAULT_SOLARVIEW_CONFIG.link_android,
  )
  const [linkTexto, setLinkTexto] = useState(
    cliente.solarview_link_texto ||
      sistema?.solarview_link_texto ||
      DEFAULT_SOLARVIEW_CONFIG.link_texto,
  )

  // Controle de exibição da senha e cópia
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false)

  // Sincroniza estado quando cliente mudar
  useEffect(() => {
    setLogin(cliente.solarview_login || sistema?.solarview_login || '')
    setSenha(cliente.solarview_senha || sistema?.solarview_senha || '')
    setLinkIos(
      cliente.solarview_link_ios ||
        sistema?.solarview_link_ios ||
        DEFAULT_SOLARVIEW_CONFIG.link_ios,
    )
    setLinkAndroid(
      cliente.solarview_link_android ||
        sistema?.solarview_link_android ||
        DEFAULT_SOLARVIEW_CONFIG.link_android,
    )
    setLinkTexto(
      cliente.solarview_link_texto ||
        sistema?.solarview_link_texto ||
        DEFAULT_SOLARVIEW_CONFIG.link_texto,
    )
  }, [
    cliente.id,
    cliente.solarview_login,
    cliente.solarview_senha,
    cliente.solarview_link_ios,
    cliente.solarview_link_android,
    cliente.solarview_link_texto,
    sistema?.solarview_login,
    sistema?.solarview_senha,
    sistema?.solarview_link_ios,
    sistema?.solarview_link_android,
    sistema?.solarview_link_texto,
  ])

  // Copiar valor para área de transferência
  const handleCopy = async (field: string, text: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      toast.success('Copiado para a área de transferência!')
      setTimeout(() => setCopiedField(null), 2000)
    } catch (_) {
      toast.error('Não foi possível copiar.')
    }
  }

  // Preencher links padrão do Solarview
  const handleRestaurarPadraoLinks = () => {
    setLinkIos(DEFAULT_SOLARVIEW_CONFIG.link_ios)
    setLinkAndroid(DEFAULT_SOLARVIEW_CONFIG.link_android)
    setLinkTexto(DEFAULT_SOLARVIEW_CONFIG.link_texto)
    toast.success('Links e texto padrão do Solarview preenchidos!')
  }

  // Salvar no cliente e no sistema
  const handleSalvar = async () => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      // 1. Atualizar cliente
      await onUpdateClienteField('solarview_login', login.trim())
      await onUpdateClienteField('solarview_senha', senha.trim())
      await onUpdateClienteField('solarview_link_ios', linkIos.trim())
      await onUpdateClienteField('solarview_link_android', linkAndroid.trim())
      await onUpdateClienteField('solarview_link_texto', linkTexto.trim())

      // 2. Atualizar sistema se existir
      if (onUpdateSistemaField && sistema) {
        await onUpdateSistemaField('solarview_login', login.trim())
        await onUpdateSistemaField('solarview_senha', senha.trim())
        await onUpdateSistemaField('solarview_link_ios', linkIos.trim())
        await onUpdateSistemaField('solarview_link_android', linkAndroid.trim())
        await onUpdateSistemaField('solarview_link_texto', linkTexto.trim())
      }

      setSaveSuccess(true)
      toast.success('Dados de acesso ao Solarview salvos com sucesso!')
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar dados do Solarview: ' + (err?.message || 'Tente novamente'))
    } finally {
      setIsSaving(false)
    }
  }

  // Tratar links
  const getHref = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
  }

  // Validação do telefone para envio via WhatsApp
  const telefoneCru = cliente.whatsapp || cliente.telefone || ''
  const telefoneDigitos = cleanPhoneDigits(telefoneCru)
  const temTelefoneValido = telefoneDigitos.length >= 10

  // Disparo de credenciais Solarview pelo WhatsApp diretamente via Z-API
  const handleEnviarWhatsAppSolarview = async () => {
    if (!temTelefoneValido) {
      toast.error('O cliente não possui telefone de contato cadastrado na ficha.')
      return
    }

    const primeiroNome = (cliente.nome || 'Cliente').split(' ')[0]

    const linhasMensagem = [
      `Olá ${primeiroNome}! Seguem seus dados de acesso ao aplicativo *Solarview*:`,
      '',
      login ? `👤 *Login:* ${login}` : null,
      senha ? `🔒 *Senha:* ${senha}` : null,
      linkTexto ? `📝 ${linkTexto}` : null,
      '',
      linkIos ? `🍏 *Download iOS (App Store):* ${linkIos}` : null,
      linkAndroid ? `🤖 *Download Android (Google Play):* ${linkAndroid}` : null,
      '',
      'Acesse o aplicativo para acompanhar a geração do seu sistema em tempo real. Qualquer dúvida estamos à disposição!',
    ].filter((l) => l !== null)

    const textoFormatado = linhasMensagem.join('\n')

    setIsSendingWhatsApp(true)
    try {
      const res = await sendWhatsAppMensagem({
        clienteId: cliente.id,
        telefone: telefoneDigitos,
        mensagem: textoFormatado,
        origem: 'secao_solarview',
      })

      if (res.ok && res.sent) {
        toast.success('Dados de acesso ao Solarview enviados via WhatsApp!')
      } else {
        const errorMsg = getFriendlyWhatsAppErrorMessage(res)
        toast.error(errorMsg)
      }
    } catch (err: any) {
      console.error('Erro ao enviar credenciais Solarview via WhatsApp:', err)
      toast.error(err?.message || 'Falha de comunicação ao disparar WhatsApp.')
    } finally {
      setIsSendingWhatsApp(false)
    }
  }

  return (
    <div className="p-3.5 bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-yellow-50/50 rounded-xl border border-amber-200/80 shadow-xs space-y-3.5">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200/70 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
              Acesso ao App Solarview
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-300">
                Solarview
              </span>
            </h4>
            <p className="text-[11px] text-amber-800/80">
              Credenciais e links de download para o cliente monitorar a geração solar
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRestaurarPadraoLinks}
          title="Restaurar links e texto padrão do Solarview"
          className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-white hover:bg-amber-100/60 border border-amber-300 px-2 py-0.5 rounded-full transition-colors shadow-2xs"
        >
          <RotateCcw className="w-3 h-3 text-amber-600" />
          Restaurar Links Padrão
        </button>
      </div>

      {/* Grid de Campos: Login e Senha */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Campo 1: Login do Solarview */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-950">
              <User className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Login do Solarview
            </span>
            <span className="text-[10px] text-gray-400 font-normal">E-mail ou Usuário</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Ex.: cliente@email.com ou usuario_solarview"
              className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs font-mono"
            />
            {login && (
              <button
                type="button"
                onClick={() => handleCopy('solarview_login', login)}
                title="Copiar login"
                className="absolute right-2 p-1 text-gray-400 hover:text-amber-600 transition-colors"
              >
                {copiedField === 'solarview_login' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Campo 2: Senha do Solarview */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-950">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Senha do Solarview
            </span>
            <span className="text-[10px] text-gray-400 font-normal">Acesso do cliente</span>
          </label>
          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-16 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs font-mono"
            />
            <div className="absolute right-1.5 flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                className="p-1 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
              </button>
              {senha && (
                <button
                  type="button"
                  onClick={() => handleCopy('solarview_senha', senha)}
                  title="Copiar senha"
                  className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                >
                  {copiedField === 'solarview_senha' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Links de Download: iOS e Android */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Link iOS */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-gray-900">
              <Apple className="w-3.5 h-3.5 text-gray-700 shrink-0" />
              Link iOS (App Store)
            </span>
            <span className="text-[10px] text-gray-400 font-normal">iPhone / iPad</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={linkIos}
              onChange={(e) => setLinkIos(e.target.value)}
              placeholder="https://apps.apple.com/..."
              className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-16 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs font-mono text-[11px]"
            />
            <div className="absolute right-1.5 flex items-center gap-0.5">
              {linkIos && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopy('solarview_ios', linkIos)}
                    title="Copiar link iOS"
                    className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    {copiedField === 'solarview_ios' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={getHref(linkIos)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir App Store"
                    className="p-1 text-amber-700 hover:text-amber-900 transition-colors inline-flex items-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Link Android */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-emerald-950">
              <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Link Android (Google Play)
            </span>
            <span className="text-[10px] text-gray-400 font-normal">Google Play Store</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={linkAndroid}
              onChange={(e) => setLinkAndroid(e.target.value)}
              placeholder="https://play.google.com/..."
              className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-16 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs font-mono text-[11px]"
            />
            <div className="absolute right-1.5 flex items-center gap-0.5">
              {linkAndroid && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopy('solarview_android', linkAndroid)}
                    title="Copiar link Android"
                    className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                  >
                    {copiedField === 'solarview_android' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={getHref(linkAndroid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir Google Play Store"
                    className="p-1 text-amber-700 hover:text-amber-900 transition-colors inline-flex items-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Campo de Instruções / Texto do Link para o Cliente */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-amber-950">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            Texto do link / Instruções para o cliente
          </span>
          <span className="text-[10px] text-gray-400 font-normal">
            Incluído no envio de WhatsApp
          </span>
        </label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={linkTexto}
            onChange={(e) => setLinkTexto(e.target.value)}
            placeholder="Ex.: Baixe o app Solarview para acompanhar a geração em tempo real..."
            className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all shadow-2xs"
          />
          {linkTexto && (
            <button
              type="button"
              onClick={() => handleCopy('solarview_texto', linkTexto)}
              title="Copiar texto de instruções"
              className="absolute right-2 p-1 text-gray-400 hover:text-amber-600 transition-colors"
            >
              {copiedField === 'solarview_texto' ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Nota informativa */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-amber-100 text-[11px] text-gray-600">
        <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <span>
            Os dados do <strong className="text-amber-950 font-semibold">Solarview</strong> são
            salvos no cadastro do cliente e podem ser enviados com 1 clique para o WhatsApp dele,
            incluindo os links diretos de download para celulares Android e iOS.
          </span>
        </div>
      </div>

      {/* Barra de Ações: Enviar WhatsApp Solarview & Salvar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-amber-200/70">
        <div className="flex items-center gap-1.5 text-[11px]">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Salvo com sucesso!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Enviar Dados Solarview pelo WhatsApp */}
          <button
            type="button"
            onClick={handleEnviarWhatsAppSolarview}
            disabled={!temTelefoneValido || isSendingWhatsApp}
            title={
              temTelefoneValido
                ? `Enviar dados Solarview via WhatsApp para ${telefoneCru}`
                : 'Cliente sem telefone de contato cadastrado na ficha'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-2xs ${
              temTelefoneValido && !isSendingWhatsApp
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer hover:scale-[1.01]'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-70'
            }`}
          >
            {isSendingWhatsApp ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>
              {isSendingWhatsApp ? 'Enviando WhatsApp...' : 'Enviar dados Solarview pelo WhatsApp'}
            </span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSalvar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Salvando...' : 'Salvar Dados Solarview'}
          </button>
        </div>
      </div>

      {/* Aviso caso cliente não tenha telefone */}
      {!temTelefoneValido && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Cliente sem telefone cadastrado. Cadastre o número para habilitar o envio dos dados do
            Solarview via WhatsApp.
          </span>
        </div>
      )}
    </div>
  )
}

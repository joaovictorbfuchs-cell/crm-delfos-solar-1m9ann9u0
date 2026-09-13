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
  Wifi,
  Sparkles,
  Save,
  CheckCircle2,
  Info,
  Send,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Cliente, Sistema, MonitoramentoMarca } from '@/types/crm'
import { fetchMonitoramentoMarcas, saveOrUpdateMonitoramentoMarca } from '@/services/crmService'
import { cleanPhoneDigits } from '@/lib/formatters'

interface SecaoMonitoramentoInversorProps {
  cliente: Cliente
  sistema: Sistema | null
  onUpdateClienteField: (field: keyof Cliente, value: any) => Promise<void>
  onUpdateSistemaField?: (field: keyof Sistema, value: any) => Promise<void>
}

export const SecaoMonitoramentoInversor: React.FC<SecaoMonitoramentoInversorProps> = ({
  cliente,
  sistema,
  onUpdateClienteField,
  onUpdateSistemaField,
}) => {
  // Estado local para os campos de monitoramento
  const [appNome, setAppNome] = useState(
    cliente.monitoramento_app_nome || sistema?.monitoramento_app_nome || '',
  )
  const [login, setLogin] = useState(
    cliente.monitoramento_login || sistema?.monitoramento_login || '',
  )
  const [senha, setSenha] = useState(
    cliente.monitoramento_senha || sistema?.monitoramento_senha || '',
  )
  const [dataloggerUrl, setDataloggerUrl] = useState(
    cliente.monitoramento_datalogger_url || sistema?.monitoramento_datalogger_url || '',
  )

  // Controle de exibição da senha e cópia
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Padrões cadastrados por marca
  const [marcasCadastradas, setMarcasCadastradas] = useState<MonitoramentoMarca[]>([])
  const [padraoAplicavel, setPadraoAplicavel] = useState<MonitoramentoMarca | null>(null)

  // Marca ativa do inversor
  const marcaAtual = (sistema?.fabricante_inversores || cliente.inversor_marca || '').trim()

  // Sincroniza estado inicial quando cliente mudar
  useEffect(() => {
    setAppNome(cliente.monitoramento_app_nome || sistema?.monitoramento_app_nome || '')
    setLogin(cliente.monitoramento_login || sistema?.monitoramento_login || '')
    setSenha(cliente.monitoramento_senha || sistema?.monitoramento_senha || '')
    setDataloggerUrl(
      cliente.monitoramento_datalogger_url || sistema?.monitoramento_datalogger_url || '',
    )
  }, [
    cliente.id,
    cliente.monitoramento_app_nome,
    cliente.monitoramento_login,
    cliente.monitoramento_senha,
    cliente.monitoramento_datalogger_url,
    sistema?.monitoramento_app_nome,
    sistema?.monitoramento_login,
    sistema?.monitoramento_senha,
    sistema?.monitoramento_datalogger_url,
  ])

  // Carrega catálogo de marcas
  useEffect(() => {
    let isMounted = true
    fetchMonitoramentoMarcas().then((lista) => {
      if (isMounted) setMarcasCadastradas(lista)
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Identifica se há padrão para a marca atual
  useEffect(() => {
    if (!marcaAtual || marcasCadastradas.length === 0) {
      setPadraoAplicavel(null)
      return
    }

    const mLower = marcaAtual.toLowerCase()
    const encontrada = marcasCadastradas.find((m) => {
      const dbLower = m.marca.toLowerCase()
      return mLower.includes(dbLower) || dbLower.includes(mLower)
    })

    setPadraoAplicavel(encontrada || null)
  }, [marcaAtual, marcasCadastradas])

  // Preenchimento automático com padrão da marca se os campos estiverem vazios
  useEffect(() => {
    if (!padraoAplicavel) return

    // Se todos ou a maioria estiver vazia no cliente, pré-popula automaticamente
    const clienteTemDados =
      Boolean(cliente.monitoramento_app_nome) ||
      Boolean(cliente.monitoramento_login) ||
      Boolean(cliente.monitoramento_senha) ||
      Boolean(cliente.monitoramento_datalogger_url)

    if (!clienteTemDados) {
      if (padraoAplicavel.app_nome && !appNome) {
        setAppNome(padraoAplicavel.app_nome)
      }
      if (padraoAplicavel.login_padrao && !login) {
        setLogin(padraoAplicavel.login_padrao)
      }
      if (padraoAplicavel.senha_padrao && !senha) {
        setSenha(padraoAplicavel.senha_padrao)
      }
      if (padraoAplicavel.datalogger_url && !dataloggerUrl) {
        setDataloggerUrl(padraoAplicavel.datalogger_url)
      }
    }
  }, [padraoAplicavel, cliente.id])

  // Aplicar padrão da marca explicitamente
  const handleAplicarPadrao = () => {
    if (!padraoAplicavel) return
    if (padraoAplicavel.app_nome) setAppNome(padraoAplicavel.app_nome)
    if (padraoAplicavel.login_padrao) setLogin(padraoAplicavel.login_padrao)
    if (padraoAplicavel.senha_padrao) setSenha(padraoAplicavel.senha_padrao)
    if (padraoAplicavel.datalogger_url) setDataloggerUrl(padraoAplicavel.datalogger_url)
    toast.success(
      `Valores padrão da marca ${padraoAplicavel.marca} preenchidos! Clique em salvar para confirmar.`,
    )
  }

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

  // Salvar no cliente (e sistema) + memorizar como padrão da marca
  const handleSalvar = async (salvarTambemPadraoMarca = true) => {
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      // 1. Atualizar cliente
      await onUpdateClienteField('monitoramento_app_nome', appNome.trim())
      await onUpdateClienteField('monitoramento_login', login.trim())
      await onUpdateClienteField('monitoramento_senha', senha.trim())
      await onUpdateClienteField('monitoramento_datalogger_url', dataloggerUrl.trim())

      // 2. Atualizar sistema se houver
      if (onUpdateSistemaField && sistema) {
        await onUpdateSistemaField('monitoramento_app_nome', appNome.trim())
        await onUpdateSistemaField('monitoramento_login', login.trim())
        await onUpdateSistemaField('monitoramento_senha', senha.trim())
        await onUpdateSistemaField('monitoramento_datalogger_url', dataloggerUrl.trim())
      }

      // 3. Memorizar como padrão para a marca do inversor (quando houver marca preenchida)
      if (salvarTambemPadraoMarca && marcaAtual) {
        try {
          const salvoMarca = await saveOrUpdateMonitoramentoMarca({
            marca: marcaAtual,
            app_nome: appNome.trim(),
            login_padrao: login.trim(),
            senha_padrao: senha.trim(),
            datalogger_url: dataloggerUrl.trim(),
          })
          setPadraoAplicavel(salvoMarca)
          // Atualiza lista em memória
          setMarcasCadastradas((prev) => {
            const semEsta = prev.filter(
              (m) =>
                m.id !== salvoMarca.id && m.marca.toLowerCase() !== salvoMarca.marca.toLowerCase(),
            )
            return [...semEsta, salvoMarca]
          })
        } catch (err) {
          console.warn('Erro ao salvar padrão da marca:', err)
        }
      }

      setSaveSuccess(true)
      toast.success(
        salvarTambemPadraoMarca && marcaAtual
          ? `Dados de monitoramento salvos no cliente e definidos como padrão para "${marcaAtual}"!`
          : 'Dados de monitoramento do cliente atualizados com sucesso!',
      )
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao salvar dados de monitoramento: ' + (err?.message || 'Tente novamente'))
    } finally {
      setIsSaving(false)
    }
  }

  // Tratar URL do datalogger para link seguro (adiciona http:// se necessário)
  const getHrefDatalogger = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `http://${trimmed}`
  }

  const linkHref = getHrefDatalogger(dataloggerUrl)

  // Validação de telefone para envio pelo WhatsApp
  const telefoneCru = cliente.whatsapp || cliente.telefone || ''
  const telefoneDigitos = cleanPhoneDigits(telefoneCru)
  const temTelefoneValido = telefoneDigitos.length >= 10

  // Disparo de credenciais pelo WhatsApp (wa.me)
  const handleEnviarWhatsApp = () => {
    if (!temTelefoneValido) {
      toast.error('O cliente não possui telefone de contato cadastrado na ficha.')
      return
    }

    const ddiNumero = telefoneDigitos.startsWith('55') ? telefoneDigitos : `55${telefoneDigitos}`
    const primeiroNome = (cliente.nome || 'Cliente').split(' ')[0]

    const linhasMensagem = [
      `Olá ${primeiroNome}! Seguem seus dados de acesso ao monitoramento do inversor:`,
      '',
      appNome ? `📱 *Aplicativo:* ${appNome}` : null,
      login ? `👤 *Login:* ${login}` : null,
      senha ? `🔒 *Senha:* ${senha}` : null,
      dataloggerUrl ? `📶 *Link do Datalogger:* ${dataloggerUrl}` : null,
      marcaAtual ? `⚡ *Inversor:* ${marcaAtual}` : null,
      '',
      'Qualquer dúvida sobre a configuração ou primeiro acesso, estamos à disposição!',
    ].filter((l) => l !== null)

    const textoFormatado = linhasMensagem.join('\n')
    const url = `https://wa.me/${ddiNumero}?text=${encodeURIComponent(textoFormatado)}`
    window.open(url, '_blank')
    toast.success('WhatsApp aberto com os dados de acesso ao monitoramento!')
  }

  return (
    <div className="p-3.5 bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-blue-50/50 rounded-xl border border-purple-200/80 shadow-xs space-y-3.5">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-purple-200/70 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-purple-950 flex items-center gap-1.5">
              Aplicativo & Monitoramento do Inversor
            </h4>
            <p className="text-[11px] text-purple-800/80">
              Credenciais de acesso e configuração do datalogger Wi-Fi/4G
            </p>
          </div>
        </div>

        {/* Badge da Marca & Botão de Aplicar Padrão */}
        <div className="flex items-center gap-2">
          {marcaAtual ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-purple-700 bg-purple-100/80 border border-purple-200 px-2 py-0.5 rounded-full">
                Marca: <strong className="font-bold">{marcaAtual}</strong>
              </span>

              {padraoAplicavel && (
                <button
                  type="button"
                  onClick={handleAplicarPadrao}
                  title={`Preencher campos com o padrão memorizado para "${padraoAplicavel.marca}"`}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  Padrão {padraoAplicavel.marca}
                </button>
              )}
            </div>
          ) : (
            <span className="text-[10px] text-gray-500 italic">
              Defina o fabricante acima para carregar padrões
            </span>
          )}
        </div>
      </div>

      {/* Grid de Campos Editáveis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* Campo 1: Nome do Aplicativo (App Store / Google Play) */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-purple-900">
              <Smartphone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              Nome do Aplicativo
            </span>
            <span className="text-[10px] text-gray-400 font-normal">App Store / Google Play</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={appNome}
              onChange={(e) => setAppNome(e.target.value)}
              placeholder="Ex.: mySolarEdge, ShinePhone, Solar.web"
              className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs"
            />
            {appNome && (
              <button
                type="button"
                onClick={() => handleCopy('app', appNome)}
                title="Copiar nome do aplicativo"
                className="absolute right-2 p-1 text-gray-400 hover:text-purple-600 transition-colors"
              >
                {copiedField === 'app' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Campo 2: Login do Aplicativo */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-indigo-900">
              <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              Login do Aplicativo
            </span>
            <span className="text-[10px] text-gray-400 font-normal">E-mail ou Usuário</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Ex.: cliente@email.com ou usuario_solaredge"
              className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all shadow-2xs font-mono"
            />
            {login && (
              <button
                type="button"
                onClick={() => handleCopy('login', login)}
                title="Copiar login"
                className="absolute right-2 p-1 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                {copiedField === 'login' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Campo 3: Senha do Aplicativo (com Toggle de Visualização e Botão Copiar) */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-amber-900">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Senha do Aplicativo
            </span>
            <span className="text-[10px] text-gray-400 font-normal">Acesso do cliente/suporte</span>
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
                  onClick={() => handleCopy('senha', senha)}
                  title="Copiar senha"
                  className="p-1 text-gray-400 hover:text-amber-600 transition-colors"
                >
                  {copiedField === 'senha' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Campo 4: Link de Configuração do Datalogger (com Botão Abrir em Nova Aba) */}
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-blue-900">
              <Wifi className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              Configurar Datalogger / IP Wi-Fi
            </span>
            <span className="text-[10px] text-gray-400 font-normal">Portal ou IP local</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={dataloggerUrl}
              onChange={(e) => setDataloggerUrl(e.target.value)}
              placeholder="Ex.: http://192.168.10.100 ou https://solaredge.com/setapp-help"
              className="w-full bg-white border border-gray-300 rounded-lg pl-3 pr-16 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all shadow-2xs font-mono"
            />
            <div className="absolute right-1.5 flex items-center gap-0.5">
              {dataloggerUrl && (
                <>
                  <button
                    type="button"
                    onClick={() => handleCopy('datalogger', dataloggerUrl)}
                    title="Copiar link"
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {copiedField === 'datalogger' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <a
                    href={linkHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Abrir ${linkHref} em nova aba`}
                    className="p-1 text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nota informativa sobre padrões memorizados */}
      <div className="flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-purple-100 text-[11px] text-gray-600">
        <Info className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <span>
            Ao salvar, estes dados são gravados no cliente e também memorizados como{' '}
            <strong className="text-purple-900 font-semibold">
              padrão de acesso para a marca "{marcaAtual || 'do inversor'}"
            </strong>
            . Ao abrir qualquer outro cliente com inversor desta mesma marca, os campos virão
            pré-preenchidos automaticamente.
          </span>
        </div>
      </div>

      {/* Barra de Ações: Salvar no Cliente e Como Padrão */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-purple-100">
        <div className="flex items-center gap-1.5 text-[11px]">
          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Salvo com sucesso!
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Botão de Enviar Credenciais de Monitoramento pelo WhatsApp */}
          <button
            type="button"
            onClick={handleEnviarWhatsApp}
            disabled={!temTelefoneValido}
            title={
              temTelefoneValido
                ? `Enviar credenciais via WhatsApp para ${telefoneCru}`
                : 'Cliente sem telefone de contato cadastrado na ficha'
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shadow-2xs ${
              temTelefoneValido
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white cursor-pointer hover:scale-[1.01]'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed opacity-70'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar credenciais pelo WhatsApp</span>
          </button>

          {marcaAtual && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSalvar(false)}
              title="Salva apenas no cliente atual sem sobrescrever o padrão geral da marca"
              className="px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
            >
              Salvar só neste cliente
            </button>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSalvar(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 active:bg-purple-900 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Salvando...' : 'Salvar e Memorizar para Marca'}
          </button>
        </div>
      </div>

      {/* Aviso caso cliente não tenha telefone */}
      {!temTelefoneValido && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50/80 border border-amber-200 text-[11px] text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            Cliente sem telefone/WhatsApp válido cadastrado. Cadastre o telefone na coluna da
            direita para habilitar o envio por WhatsApp com um clique.
          </span>
        </div>
      )}
    </div>
  )
}

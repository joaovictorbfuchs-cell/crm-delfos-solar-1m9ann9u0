import React, { useState } from 'react'
import { useNavigate, Navigate, useLocation } from 'react-router-dom'
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  ArrowLeft,
  MailCheck,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { DelfosLogo } from '@/components/DelfosLogo'

export default function Login() {
  const { login, isAuthenticated, isInstalador, isLoading: isAuthLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const fromLocation = (location.state as any)?.from as string | undefined

  const [email, setEmail] = useState('joao@delfosengenharia.com.br')
  const [password, setPassword] = useState('Skip@Pass')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Estado para fluxo de "Esqueci minha senha"
  const [isForgotMode, setIsForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  // Inicialização defensiva: enquanto o AuthContext estiver verificando a sessão (isLoading),
  // exibe o spinner com a identidade visual da Delfos Solar e NÃO tenta redirecionamento condicional prematuro
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-[#F8FAF9] to-slate-100 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center gap-4">
          <DelfosLogo height={64} />
          <div className="flex items-center gap-2 text-emerald-800 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin text-[#16A34A]" />
            <span>Carregando painel de acesso...</span>
          </div>
        </div>
      </div>
    )
  }

  // Se já autenticado e o carregamento terminou, redireciona conforme o perfil
  if (isAuthenticated) {
    if (isInstalador) {
      return <Navigate to="/execucao-os" replace />
    }
    if (fromLocation && fromLocation.startsWith('/')) {
      return <Navigate to={fromLocation} replace />
    }
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !password) {
      setError('Por favor preencha o e-mail e a senha.')
      return
    }

    try {
      setIsLoading(true)
      const profile = await login(cleanEmail, password)

      // Redirecionamento por perfil
      if (profile?.role === 'instalador') {
        navigate('/execucao-os', { replace: true })
      } else if (fromLocation && fromLocation.startsWith('/')) {
        navigate(fromLocation, { replace: true })
      } else {
        navigate('/', { replace: true })
      }
    } catch (err: any) {
      console.error('Erro no login:', err)
      if (err?.message === 'USUARIO_DESATIVADO') {
        setError('Usuário desativado. Fale com o administrador do sistema.')
      } else if (err?.data?.message || err?.message?.includes('Failed to authenticate')) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.')
      } else if (err?.name === 'ClientResponseError' && err?.status === 400) {
        setError('E-mail ou senha incorretos. Por favor, tente novamente.')
      } else if (err?.name === 'ClientResponseError' && err?.status === 0) {
        setError('Falha de conexão com o servidor. Verifique sua rede e tente novamente.')
      } else {
        setError(
          err?.message || 'Erro ao realizar login. Verifique suas credenciais e tente novamente.',
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-[#F8FAF9] to-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Decorative background gradients (azul e verde-dourado da marca) */}
      <div className="absolute top-10 left-1/4 w-80 h-80 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-amber-300/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100/80 p-8 relative z-10 transition-all">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="mb-3 py-1 px-4 flex items-center justify-center hover:scale-105 transition-transform duration-300">
            <DelfosLogo height={72} />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Painel de Acesso</h1>
          <p className="text-xs text-emerald-800 font-semibold mt-1">
            CRM & Gestão Operacional de Usinas Fotovoltaicas
          </p>
        </div>

        {error && !isForgotMode && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!isForgotMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@delfosengenharia.com.br"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsForgotMode(true)
                  setForgotEmail(email)
                  setForgotError(null)
                  setForgotSuccess(false)
                }}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all duration-120 flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>
        ) : (
          /* Formulário de Esqueci Minha Senha */
          <div className="space-y-4">
            {forgotSuccess ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-semibold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Instruções enviadas!</span>
                  </div>
                  <p className="leading-relaxed">
                    Se o endereço <strong>{forgotEmail}</strong> estiver cadastrado no sistema
                    Delfos Solar, um e-mail com o link de redefinição de senha foi enviado.
                    Verifique sua caixa de entrada e spam.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotMode(false)
                    setForgotSuccess(false)
                    setForgotError(null)
                  }}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Voltar para tela de login
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  setForgotError(null)
                  const targetEmail = forgotEmail.trim().toLowerCase()
                  if (!targetEmail) {
                    setForgotError('Por favor, informe seu e-mail cadastrado.')
                    return
                  }

                  try {
                    setForgotLoading(true)
                    await pb.collection('users').requestPasswordReset(targetEmail)
                    setForgotSuccess(true)
                  } catch (err: any) {
                    console.error('Erro no requestPasswordReset:', err)
                    // Tratamento amigável para o usuário
                    const msg =
                      err?.data?.message ||
                      err?.message ||
                      'Não foi possível enviar o email de redefinição no momento. Tente novamente mais tarde.'
                    setForgotError(msg)
                  } finally {
                    setForgotLoading(false)
                  }
                }}
                className="space-y-4"
              >
                {forgotError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-900 text-xs flex items-start gap-2">
                  <MailCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Digite seu e-mail cadastrado. Enviaremos um link exclusivo para você criar uma
                    nova senha.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                    Seu E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="seu.nome@delfosengenharia.com.br"
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all duration-120 flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
                >
                  {forgotLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Enviando link...</span>
                    </>
                  ) : (
                    'Enviar Link de Redefinição'
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotMode(false)
                      setForgotError(null)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar para o login
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-6 pt-3 text-center">
          <p className="text-[11px] text-gray-400">
            Acesso exclusivo para colaboradores da Delfos Solar (Erechim/RS)
          </p>
        </div>
      </div>
    </div>
  )
}

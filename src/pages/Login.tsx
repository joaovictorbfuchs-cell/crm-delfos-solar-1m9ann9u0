import React, { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import {
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  Shield,
  Wrench,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  MailCheck,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { pb } from '@/lib/pocketbase/client'
import { DelfosLogo } from '@/components/DelfosLogo'

export default function Login() {
  const { login, isAuthenticated, isAdmin, isInstalador } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('joao@delfosengenharia.com.br')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Estado para fluxo de "Esqueci minha senha"
  const [isForgotMode, setIsForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotSuccess, setForgotSuccess] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)

  // Se já autenticado, redireciona conforme o perfil
  if (isAuthenticated) {
    if (isInstalador) {
      return <Navigate to="/execucao-os" replace />
    }
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Por favor preencha o e-mail e a senha.')
      return
    }

    try {
      setIsLoading(true)
      const profile = await login(email, password)

      // Redirecionamento por perfil
      if (profile.role === 'instalador') {
        navigate('/execucao-os')
      } else {
        navigate('/')
      }
    } catch (err: any) {
      console.error(err)
      if (err?.message === 'USUARIO_DESATIVADO') {
        setError('Usuário desativado. Fale com o administrador do sistema.')
      } else {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Preencher credenciais de demonstração com 1 clique
  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center items-center p-4">
      {/* Decorative background sun radial blur */}
      <div className="absolute top-1/4 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-3 py-1 flex items-center justify-center">
            <DelfosLogo height={64} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Painel de Acesso</h1>
          <p className="text-xs text-gray-500 mt-1">CRM & Gestão Operacional de Energia Solar</p>
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
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
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

        {/* Bloco Discreto de Acessos de Demonstração para Testar Ambos os Perfis */}
        <div className="mt-6 pt-5 border-t border-gray-100 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span className="flex items-center gap-1 text-gray-700">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Acessos de demonstração:
            </span>
            <span className="text-[11px] text-gray-400">Clique para preencher</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Demonstração Admin */}
            <button
              type="button"
              onClick={() => setDemoCredentials('joao@delfosengenharia.com.br', 'Skip@Pass')}
              className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/80 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  Admin
                </span>
                <ArrowRight className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[10px] text-emerald-950 font-medium truncate mt-0.5">
                João Victor (Admin)
              </p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Skip@Pass</p>
            </button>

            {/* Demonstração Instalador */}
            <button
              type="button"
              onClick={() =>
                setDemoCredentials('carlos.instalador@delfosengenharia.com.br', 'Delfos@123')
              }
              className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-100/80 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-blue-600" />
                  Instalador
                </span>
                <ArrowRight className="w-3 h-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[10px] text-blue-950 font-medium truncate mt-0.5">
                Carlos Silva (Campo)
              </p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">Delfos@123</p>
            </button>
          </div>
        </div>

        <div className="mt-4 pt-3 text-center">
          <p className="text-[11px] text-gray-400">
            Acesso exclusivo para colaboradores da Delfos Solar (Erechim/RS)
          </p>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Sun, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function Login() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('joao@delfosengenharia.com.br')
  const [password, setPassword] = useState('Skip@Pass')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  if (isAuthenticated) {
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
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      console.error(err)
      setError('Credenciais inválidas. Verifique seu e-mail e senha.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center items-center p-4">
      {/* Decorative background sun radial blur */}
      <div className="absolute top-1/4 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#166534] to-[#16A34A] flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 mb-3">
            <Sun className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">DELFOS SOLAR</h1>
          <p className="text-sm text-gray-500 mt-1">CRM & Gestão Operacional de Energia Solar</p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all duration-120 flex items-center justify-center gap-2 hover:scale-[1.01] disabled:opacity-50"
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

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Acesso exclusivo para colaboradores da Delfos Solar (Erechim/RS)
          </p>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'instalador'
}

let lastToastTime = 0

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, isAdmin, isInstalador } = useAuth()
  const location = useLocation()
  const [safetyTimeoutReached, setSafetyTimeoutReached] = React.useState(false)

  // Fallback de segurança: se por qualquer razão o AuthContext ficar com isLoading=true por mais de 3s,
  // desbloqueia o render para evitar travamento em tela branca com spinner infinito
  React.useEffect(() => {
    if (!isLoading) {
      setSafetyTimeoutReached(false)
      return
    }
    const timer = setTimeout(() => {
      console.warn('Timeout de segurança atingido no ProtectedRoute. Liberando render.')
      setSafetyTimeoutReached(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [isLoading])

  const isPbAuthValid = Boolean(pb.authStore.isValid)

  // Se a sessão expirou ou não for válida no PocketBase, exibir toast informativo
  // apenas se o usuário tinha alguma credencial/token prévia que expirou (evitando toast falso ao entrar pela primeira vez deslogado)
  React.useEffect(() => {
    if (isLoading) return
    const hadPreviousToken = Boolean(pb.authStore.token)
    if ((!isAuthenticated || !isPbAuthValid) && hadPreviousToken) {
      const now = Date.now()
      if (now - lastToastTime > 5000) {
        lastToastTime = now
        toast({
          title: 'Sessão expirada',
          description: 'Sua sessão expirou ou não é válida. Faça login novamente para continuar.',
          variant: 'destructive',
        })
      }
    }
  }, [isLoading, isAuthenticated, isPbAuthValid])

  if (isLoading && !safetyTimeoutReached) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#F8FAF9] text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <span className="text-xs font-medium">Validando acesso ao Delfos Solar...</span>
      </div>
    )
  }

  const currentPath = location.pathname + (location.search || '') + (location.hash || '')

  // Se o usuário não está autenticado ou o token não é válido, redireciona para o login
  if (!isAuthenticated || !isPbAuthValid) {
    return <Navigate to="/login" state={{ from: currentPath }} replace />
  }

  // Se rota requer admin e usuário não for admin (ex.: instalador), redireciona para Serviços de Campo
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/servicos-campo" replace />
  }

  // Se for instalador e tentar acessar rota restrita (não sendo permitido a instalador), redireciona para Serviços de Campo
  if (isInstalador && requiredRole !== 'instalador' && requiredRole !== undefined) {
    return <Navigate to="/servicos-campo" replace />
  }

  // Se não houver children ou se for a rota pai do layout sem sub-conteúdo
  if (!children) {
    return null
  }

  return <>{children}</>
}
export default ProtectedRoute

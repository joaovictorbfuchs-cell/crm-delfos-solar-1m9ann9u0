import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'instalador'
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, isAdmin, isInstalador } = useAuth()
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

  if (isLoading && !safetyTimeoutReached) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAF9]">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Se rota requer admin e usuário for instalador, redireciona para /execucao-os
  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/execucao-os" replace />
  }

  // Se for instalador e não for uma rota permitida a instalador
  if (isInstalador && requiredRole !== 'instalador' && requiredRole !== undefined) {
    return <Navigate to="/execucao-os" replace />
  }

  return <>{children}</>
}
export default ProtectedRoute

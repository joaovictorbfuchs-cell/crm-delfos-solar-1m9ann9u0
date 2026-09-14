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

  if (isLoading) {
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

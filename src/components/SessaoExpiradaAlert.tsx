import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldAlert, LogIn } from 'lucide-react'
import { pb } from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'

interface SessaoExpiradaAlertProps {
  mensagem?: string
  className?: string
}

export function SessaoExpiradaAlert({
  mensagem = 'Por motivos de segurança, sua sessão foi encerrada após um período de inatividade ou o token de acesso tornou-se inválido. Por favor, faça login novamente para continuar.',
  className = '',
}: SessaoExpiradaAlertProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLoginNovamente = () => {
    try {
      pb.authStore.clear()
    } catch (e) {
      console.warn('Erro ao limpar authStore:', e)
    }
    const currentPath = location.pathname + (location.search || '')
    navigate('/login', {
      replace: true,
      state: { from: currentPath },
    })
  }

  return (
    <div
      role="alert"
      className={`rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-6 md:p-8 shadow-sm text-amber-950 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="p-3 bg-amber-100 rounded-xl text-amber-700 shrink-0 border border-amber-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-1">
          <h2 className="text-lg font-bold text-amber-900 tracking-tight">Sua sessão expirou</h2>
          <p className="text-sm text-amber-800 leading-relaxed max-w-2xl">{mensagem}</p>
        </div>
        <div className="pt-2 sm:pt-0 sm:shrink-0 w-full sm:w-auto">
          <Button
            type="button"
            onClick={handleLoginNovamente}
            className="w-full sm:w-auto bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold shadow-sm flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Fazer Login Novamente</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SessaoExpiradaAlert

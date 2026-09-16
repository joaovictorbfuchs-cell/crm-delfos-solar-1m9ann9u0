import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { DelfosLogo } from '@/components/DelfosLogo'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[RootErrorBoundary] Erro crítico na raiz capturado:', error, errorInfo)
  }

  handleReload = () => {
    try {
      window.location.reload()
    } catch {
      window.location.href = '/'
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-[#F8FAF9] to-slate-100 flex flex-col justify-center items-center p-4 relative font-sans">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-emerald-100 p-8 flex flex-col items-center text-center">
            {/* Logo Delfos com fallback seguro */}
            <div className="mb-4">
              <DelfosLogo height={64} />
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">Ocorreu um erro inesperado</h1>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              O sistema Delfos Solar encontrou uma instabilidade ao inicializar a interface. Clique
              abaixo para recarregar a aplicação.
            </p>

            {this.state.error?.message && (
              <div className="w-full mb-6 p-3 bg-red-50 border border-red-200 rounded-xl text-left">
                <p className="text-[11px] font-mono text-red-700 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full py-3 bg-[#16A34A] hover:bg-[#15803D] text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default RootErrorBoundary

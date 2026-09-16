import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  /** Mensagem customizada de erro a ser exibida no fallback padrão */
  errorMessage?: string
  /** Se true, exibe um card isolado mais compacto (ideal para seções de página/modais) */
  compact?: boolean
  /** Callback opcional quando um erro for capturado */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary capturou uma exceção:', error, errorInfo)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const mensagem = this.props.errorMessage || 'Não foi possível exibir esta seção'

      if (this.props.compact) {
        return (
          <div
            role="alert"
            className="p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-900 flex items-center justify-between gap-3 text-xs my-2"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <p className="font-semibold text-amber-950">{mensagem}</p>
                <p className="text-[11px] text-amber-800">
                  Os outros dados continuam funcionando normalmente.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 transition-colors inline-flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Tentar novamente</span>
            </button>
          </div>
        )
      }

      return (
        <div
          role="alert"
          className="min-h-[220px] p-6 rounded-2xl border border-red-200 bg-red-50/50 flex flex-col items-center justify-center text-center gap-3 my-4"
        >
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="max-w-md">
            <h4 className="text-sm font-bold text-gray-900 mb-1">{mensagem}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              Ocorreu um erro inesperado ao carregar este componente. O restante do aplicativo
              continua disponível.
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-1 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Recarregar seção</span>
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

import React from 'react'
import { Users, MessageSquare, Clock, CheckCircle } from 'lucide-react'

export type EtapaAssistente = 1 | 2 | 3 | 4

export interface AssistenteProgressoProps {
  etapaAtual: EtapaAssistente
  onSelecionarEtapa?: (etapa: EtapaAssistente) => void
  totalSelecionados: number
  podeAvancar?: boolean
}

interface EtapaDef {
  numero: EtapaAssistente
  titulo: string
  subtitulo: string
  icone: React.ComponentType<{ className?: string }>
}

const ETAPAS: EtapaDef[] = [
  {
    numero: 1,
    titulo: 'Destinatários',
    subtitulo: 'Seleção e filtros',
    icone: Users,
  },
  {
    numero: 2,
    titulo: 'Mensagem',
    subtitulo: 'Modelo e prévia',
    icone: MessageSquare,
  },
  {
    numero: 3,
    titulo: 'Momento e Régua',
    subtitulo: 'Agendamento e follow-up',
    icone: Clock,
  },
  {
    numero: 4,
    titulo: 'Revisão e Envio',
    subtitulo: 'Conferência final',
    icone: CheckCircle,
  },
]

export const AssistenteProgresso: React.FC<AssistenteProgressoProps> = ({
  etapaAtual,
  onSelecionarEtapa,
  totalSelecionados,
}) => {
  return (
    <div className="w-full bg-slate-50 border-b border-slate-200 px-4 py-3 select-none">
      <div className="max-w-5xl mx-auto flex items-center justify-between relative">
        {/* Linha de conexão de fundo */}
        <div
          className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-0 hidden sm:block"
          aria-hidden="true"
        />

        {ETAPAS.map((etapa, idx) => {
          const isAtiva = etapaAtual === etapa.numero
          const isConcluida = etapaAtual > etapa.numero
          const Icone = etapa.icone

          const podeClicar = Boolean(onSelecionarEtapa)

          return (
            <button
              key={etapa.numero}
              type="button"
              disabled={!podeClicar}
              onClick={() => onSelecionarEtapa && onSelecionarEtapa(etapa.numero)}
              className={`relative z-10 flex items-center gap-2 sm:gap-3 py-1 px-2 sm:px-3 rounded-xl transition-all text-left ${
                podeClicar ? 'cursor-pointer hover:bg-white/80' : 'cursor-default'
              } ${isAtiva ? 'bg-white shadow-xs border border-sky-200' : ''}`}
              aria-current={isAtiva ? 'step' : undefined}
            >
              {/* Círculo do número / ícone */}
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-all ${
                  isAtiva
                    ? 'bg-[#0284C7] text-white ring-4 ring-sky-100 shadow-xs'
                    : isConcluida
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-500 border border-slate-300'
                }`}
              >
                {isConcluida ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <Icone className="w-4 h-4" />
                )}
              </div>

              {/* Textos da etapa */}
              <div className="hidden md:flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Etapa {etapa.numero}
                </span>
                <span
                  className={`text-xs font-bold leading-tight ${
                    isAtiva ? 'text-[#0284C7]' : isConcluida ? 'text-emerald-700' : 'text-slate-700'
                  }`}
                >
                  {etapa.titulo}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default AssistenteProgresso

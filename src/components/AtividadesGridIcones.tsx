import React from 'react'
import { ATIVIDADES_12_TIPOS, type TipoAtividadeDef } from '@/constants/atividadesTipos'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface AtividadesGridIconesProps {
  onSelectTipo: (tipo: TipoAtividadeDef) => void
  tipoAtivo?: string | null
}

export const AtividadesGridIcones: React.FC<AtividadesGridIconesProps> = ({
  onSelectTipo,
  tipoAtivo,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3.5">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Tipos de Atividades Operacionais
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Clique em qualquer um dos 12 ícones para abrir o registro rápido com o título preenchido
            automaticamente
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200/60 hidden sm:inline-block">
          12 Tipos Padrão Delfos
        </span>
      </div>

      <TooltipProvider delayDuration={120}>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 sm:gap-2.5">
          {ATIVIDADES_12_TIPOS.map((item) => {
            const Icon = item.icon
            const isSelected = tipoAtivo === item.id
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onSelectTipo(item)}
                    className={`group relative flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-xl border text-center transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500 scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30 hover:shadow-xs'
                    }`}
                    aria-label={item.tituloPadrao}
                  >
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-2xs ${item.iconBg}`}
                      style={{ color: item.corHex }}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    <span className="text-[10px] sm:text-[11px] font-semibold text-gray-700 mt-1.5 leading-tight line-clamp-2 h-7 flex items-center justify-center text-center">
                      {item.tituloPadrao}
                    </span>

                    {/* Pequeno indicador visual de cor */}
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1"
                      style={{ backgroundColor: item.corHex }}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-center z-50">
                  <div className="font-bold text-xs">{item.tituloPadrao}</div>
                  <div className="text-[10px] text-gray-300 mt-0.5">{item.descricaoAjuda}</div>
                  <div className="text-[9px] text-emerald-300 mt-1 font-semibold">
                    Clique para registrar atividade
                  </div>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </TooltipProvider>
    </div>
  )
}

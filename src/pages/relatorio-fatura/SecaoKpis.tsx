import React from 'react'
import { LabelCampo, formatarMoeda } from './CardSecao'
import { num } from './safeGuards'
import type { GdCalculada } from './tipos'

/** KPIs do topo — 4 cards (sem "Total a Pagar", que repete o quadro). */
export const SecaoKpis: React.FC<{ medicao: any; gd: GdCalculada; indicadores: any }> = ({
  medicao,
  gd,
  indicadores,
}) => {
  const consumo = num(medicao?.energia_ativa_consumida?.consumo_mes_kwh)
  const economia = num(indicadores?.economia_estimada_mes_rs)
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
        <LabelCampo>Consumo do Mês</LabelCampo>
        <div className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-baseline gap-1">
          {consumo.toLocaleString('pt-BR')}
          <span className="text-xs text-gray-400 font-normal">kWh</span>
        </div>
        <span className="text-[10px] text-gray-400 block">Medido pela distribuidora</span>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
        <LabelCampo className="!text-emerald-700">Energia Injetada</LabelCampo>
        <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 flex items-baseline gap-1">
          {gd.injetada.toLocaleString('pt-BR')}
          <span className="text-xs text-emerald-600/70 font-normal">kWh</span>
        </div>
        <span className="text-[10px] text-gray-400 block">Injetada na rede</span>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-1">
        <LabelCampo className="!text-sky-700">Compensados no Mês</LabelCampo>
        <div className="text-xl sm:text-2xl font-extrabold text-sky-600 flex items-baseline gap-1">
          {gd.compensadosMesAtual.toLocaleString('pt-BR')}
          <span className="text-xs text-sky-600/70 font-normal">kWh</span>
        </div>
        <span className="text-[10px] text-gray-400 block">Abatidos nesta fatura</span>
      </div>
      <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs space-y-1">
        <LabelCampo className="!text-emerald-800">Economia no Ciclo</LabelCampo>
        <div className="text-xl sm:text-2xl font-extrabold text-emerald-700">
          {formatarMoeda(economia)}
        </div>
        <span className="text-[10px] text-emerald-700/70 block">Estimativa deste ciclo</span>
      </div>
    </section>
  )
}

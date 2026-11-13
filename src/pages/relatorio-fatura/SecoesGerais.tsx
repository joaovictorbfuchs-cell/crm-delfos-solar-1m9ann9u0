import React from 'react'
import { CalendarClock, TrendingUp, User } from 'lucide-react'
import { CardSecao, BadgeSecao, LabelCampo } from './CardSecao'
import { safeStr } from './safeGuards'
import type { ConsumoHistoricoItem } from './tipos'

/** Cabeçalho do relatório — dados cadastrais + período consolidados (sem seção de período separada). */
export const CabecalhoRelatorio: React.FC<{
  cad: Record<string, any>
  periodo: Record<string, any>
  concessionaria: string
  competencia: string
}> = ({ cad, periodo, concessionaria, competencia }) => {
  const campos: Array<[string, string]> = [
    ['Unidade Consumidora', safeStr(cad.uc) || '—'],
    ['Titular', safeStr(cad.titular) || '—'],
    ['Concessionária', concessionaria || '—'],
    ['Competência', competencia || safeStr(periodo.mes_referencia) || '—'],
    ['Emissão', safeStr(periodo.data_emissao) || '—'],
    ['Vencimento', safeStr(periodo.vencimento) || '—'],
    ['Endereço', safeStr(cad.endereco) || '—'],
    ['Cidade/UF', safeStr(cad.cidade) || '—'],
  ]
  return (
    <CardSecao
      title="Dados da Fatura"
      icon={<User className="h-4 w-4 text-gray-400" />}
      right={<BadgeSecao tone="sky">{safeStr(cad.tipo_fornecimento) || 'Fornecimento'}</BadgeSecao>}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
        {campos.map(([rotulo, valor]) => (
          <div key={rotulo}>
            <LabelCampo>{rotulo}</LabelCampo>
            <span className="text-sm font-semibold text-gray-900">{valor}</span>
          </div>
        ))}
      </div>
    </CardSecao>
  )
}

/** Histórico de consumo — gráfico de barras com max/min marcados. */
export const SecaoHistoricoConsumo: React.FC<{
  historico: ConsumoHistoricoItem[]
  media: number
  maior: ConsumoHistoricoItem | null
  menor: ConsumoHistoricoItem | null
}> = ({ historico, media, maior, menor }) => {
  if (!historico.length) return null
  const max = Math.max(...historico.map((x) => x.consumo_kwh)) || 1
  return (
    <CardSecao
      title="Histórico de Consumo"
      icon={<TrendingUp className="h-4 w-4 text-gray-400" />}
      right={<BadgeSecao tone="slate">média {media.toLocaleString('pt-BR')} kWh</BadgeSecao>}
    >
      <div className="flex items-end gap-2 h-40">
        {historico.map((h, i) => {
          const pct = Math.max(4, (h.consumo_kwh / max) * 100)
          const isMax = maior?.mes === h.mes
          const isMin = menor?.mes === h.mes
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[10px] font-bold text-gray-600">
                {h.consumo_kwh.toLocaleString('pt-BR')}
              </span>
              <div
                className={
                  'w-full rounded-t-md transition-colors ' +
                  (isMax ? 'bg-amber-400' : isMin ? 'bg-sky-300' : 'bg-emerald-400')
                }
                style={{ height: `${pct}%` }}
              />
              <span className="text-[10px] text-gray-500 whitespace-nowrap">{h.mes}</span>
            </div>
          )
        })}
      </div>
      {historico.some((h) => h.dias_ciclo) && (
        <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
          <CalendarClock className="h-3 w-3" />
          Barra âmbar = maior consumo · barra azul = menor consumo.
        </p>
      )}
    </CardSecao>
  )
}

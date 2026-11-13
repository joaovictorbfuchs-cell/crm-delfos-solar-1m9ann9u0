import React from 'react'
import { Gauge } from 'lucide-react'
import { CardSecao, BadgeSecao } from './CardSecao'
import { safeObj, safeArr, num, safeStr } from './safeGuards'
import type { GdCalculada } from './tipos'

interface Props {
  medicao: Record<string, any>
  papelGd: Record<string, any>
  gd: GdCalculada
}

const th = 'px-3 py-2 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider'
const td = 'px-3 py-2 text-sm text-gray-700'

/** Uma linha da tabela de medição (leitura anterior/atual/multiplicador). */
const LinhaMedicao: React.FC<{ rotulo: string; obj: Record<string, any> }> = ({ rotulo, obj }) => {
  const anterior = num(obj?.leitura_anterior)
  const atual = num(obj?.leitura_atual)
  const mult = num(obj?.multiplicador) || 1
  const total = (atual - anterior) * mult
  return (
    <tr className="border-t border-gray-100">
      <td className={td + ' font-medium text-gray-800'}>{rotulo}</td>
      <td className={td + ' text-right'}>{anterior.toLocaleString('pt-BR')}</td>
      <td className={td + ' text-right'}>{atual.toLocaleString('pt-BR')}</td>
      <td className={td + ' text-right'}>{mult !== 1 ? `×${mult}` : '—'}</td>
      <td className={td + ' text-right font-bold text-gray-900'}>
        {total.toLocaleString('pt-BR')} kWh
      </td>
    </tr>
  )
}

export const SecaoMedicaoGd: React.FC<Props> = ({ medicao, papelGd, gd }) => {
  const consumo = safeObj(medicao?.energia_ativa_consumida)
  const injetada = safeObj(medicao?.energia_injetada_geracao)
  const creditos = safeObj(medicao?.creditos)
  const saldo = safeObj(medicao?.saldo_energia)
  const papel = safeStr(papelGd?.papel_uc, gd.detalheFluxo ? 'mista' : '')

  return (
    <CardSecao
      title="Medição, Créditos e Balanço do Ciclo"
      icon={<Gauge className="h-4 w-4 text-gray-400" />}
      bodyClassName="space-y-4"
    >
      {/* Tabela de medição */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className={th}>Medidor</th>
              <th className={th + ' text-right'}>Leitura anterior</th>
              <th className={th + ' text-right'}>Leitura atual</th>
              <th className={th + ' text-right'}>Mult.</th>
              <th className={th + ' text-right'}>Total do ciclo</th>
            </tr>
          </thead>
          <tbody>
            <LinhaMedicao rotulo="Energia ativa consumida" obj={consumo} />
            <LinhaMedicao rotulo="Energia injetada (geração)" obj={injetada} />
          </tbody>
        </table>
      </div>

      {/* Balanço de créditos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Créditos recebidos
          </span>
          <span className="text-lg font-extrabold text-sky-700">
            {num(creditos?.total_creditos_recebidos_kwh).toLocaleString('pt-BR')} kWh
          </span>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Compensados no mês
          </span>
          <span className="text-lg font-extrabold text-sky-700">
            {num(creditos?.creditos_compensados_mes_atual_kwh).toLocaleString('pt-BR')} kWh
          </span>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Saldo da instalação
          </span>
          <span className="text-lg font-extrabold text-gray-800">
            {num(saldo?.saldo_atual_instalacao_kwh).toLocaleString('pt-BR')} kWh
          </span>
        </div>
      </div>

      {/* Balanço GD — sem repetir o papel nem os números da tabela */}
      <div className="rounded-xl border border-gray-200 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <BadgeSecao tone="slate">
            Arranjo: {papel ? papel.toUpperCase() : 'não identificado'}
          </BadgeSecao>
          {gd.participacao > 0 && (
            <BadgeSecao tone="emerald">
              {gd.retidoPercent}% da geração usada na própria instalação
            </BadgeSecao>
          )}
          {gd.kwhEnviados > 0 && (
            <BadgeSecao tone="sky">
              {gd.kwhEnviados.toLocaleString('pt-BR')} kWh enviados a outras unidades
            </BadgeSecao>
          )}
        </div>
        {gd.detalheFluxo && (
          <p className="text-xs text-gray-600 leading-relaxed">{safeStr(gd.detalheFluxo)}</p>
        )}
        {gd.saldoGeradoNaoUsado > 0 && (
          <p className="text-xs text-gray-500">
            {gd.saldoGeradoNaoUsado.toLocaleString('pt-BR')} kWh gerados neste ciclo ficaram de
            saldo para o próximo.
          </p>
        )}
      </div>
    </CardSecao>
  )
}

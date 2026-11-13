import React from 'react'
import { Receipt } from 'lucide-react'
import { CardSecao, BadgeSecao, formatarMoeda } from './CardSecao'
import { num } from './safeGuards'
import type { DemonstrativoResultado } from './demonstrativo'

const linhaCelula = 'px-3 py-2.5 align-middle'

/** Uma parcela do quadro — crédito (abatimento), atípica ou comum. */
const LinhaParcelaRow: React.FC<{ p: DemonstrativoResultado['itens'][number] }> = ({ p }) => {
  if (p.valor < 0) {
    return (
      <tr className="bg-emerald-50/50">
        <td className={linhaCelula}>
          <span className="text-sm text-gray-800">{p.nome}</span>
          <span className="text-[10px] text-emerald-700 font-semibold uppercase ml-2">
            abatimento
          </span>
        </td>
        <td className={linhaCelula + ' text-right text-sm text-gray-500'}>
          {p.kwh ? p.kwh.toLocaleString('pt-BR') : '—'}
        </td>
        <td className={linhaCelula + ' text-right text-sm font-bold text-emerald-600'}>
          {'- ' + formatarMoeda(Math.abs(p.valor))}
        </td>
      </tr>
    )
  }
  if (p.atipico) {
    return (
      <tr className="bg-amber-50/60">
        <td className={linhaCelula}>
          <span className="text-sm font-medium text-amber-900">{p.nome}</span>
          <BadgeSecao tone="amber" className="ml-2">
            Parcela atípica
          </BadgeSecao>
          <p className="text-xs text-amber-800/80 mt-0.5">
            Custo incomum neste ciclo — não é consumo de energia nem abatimento. Verifique com a
            distribuidora.
          </p>
        </td>
        <td className={linhaCelula + ' text-right text-sm text-gray-500'}>
          {p.kwh ? p.kwh.toLocaleString('pt-BR') : '—'}
        </td>
        <td className={linhaCelula + ' text-right text-sm font-bold text-amber-900'}>
          {formatarMoeda(p.valor)}
        </td>
      </tr>
    )
  }
  return (
    <tr className="border-t border-gray-100">
      <td className={linhaCelula}>
        <span className="text-sm text-gray-800">{p.nome}</span>
        {p.fio_b && (
          <BadgeSecao tone="sky" className="ml-2">
            Lei 14.300
          </BadgeSecao>
        )}
        {p.estimativa_ja_inclusa ? (
          <BadgeSecao tone="gray" className="ml-2">
            Estimativa (já incluso no total da fatura)
          </BadgeSecao>
        ) : (
          p.origem_fio_b && (
            <BadgeSecao tone="gray" className="ml-1">
              {p.origem_fio_b === 'fatura' ? 'Valor da fatura' : 'Estimativa'}
            </BadgeSecao>
          )
        )}
      </td>
      <td className={linhaCelula + ' text-right text-sm text-gray-600'}>
        {p.kwh ? p.kwh.toLocaleString('pt-BR') : '—'}
      </td>
      <td className={linhaCelula + ' text-right text-sm text-gray-700'}>
        {formatarMoeda(p.valor)}
      </td>
    </tr>
  )
}

/** Quadro único "Demonstrativo do Ciclo" — consolidado e reconciliado. */
export const SecaoDemonstrativo: React.FC<{ demo: DemonstrativoResultado }> = ({ demo }) => {
  const totalAbatimentos = num(demo.abatimentos)
  const totalFaturado = num(demo.total_faturado)
  // Fonte da verdade = total impresso da fatura (headline); soma recalculada = detalhe.
  const totalPagar = num(demo.total_a_pagar_exibido)
  const totalPagarCalculado = num(demo.total_a_pagar_calculado)
  const divergencia = num(demo.divergencia_rs)
  return (
    <CardSecao
      title="Demonstrativo do Ciclo"
      icon={<Receipt className="h-4 w-4 text-gray-400" />}
      bodyClassName="space-y-4"
    >
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Parcela
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                kWh
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Valor
              </th>
            </tr>
          </thead>
          <tbody>
            {demo.itens.map((p, i) => (
              <LinhaParcelaRow key={i} p={p} />
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50/60 border-t border-gray-200">
              <td className={linhaCelula + ' text-sm font-bold text-gray-700'} colSpan={2}>
                Tributos inclusos (ICMS + PIS + COFINS)
              </td>
              <td className={linhaCelula + ' text-right text-sm font-bold text-gray-700'}>
                {formatarMoeda(num(demo.tributos_total))}
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className={linhaCelula + ' text-sm font-bold text-gray-800'} colSpan={2}>
                Total faturado
              </td>
              <td className={linhaCelula + ' text-right text-sm font-bold text-gray-900'}>
                {formatarMoeda(totalFaturado)}
              </td>
            </tr>
            <tr className="bg-emerald-50 border-t-2 border-emerald-300">
              <td className={linhaCelula + ' text-sm font-extrabold text-emerald-900'} colSpan={2}>
                Total a pagar
              </td>
              <td className={linhaCelula + ' text-right text-lg font-extrabold text-emerald-700'}>
                {formatarMoeda(totalPagar)}
                {totalAbatimentos > 0 && (
                  <span className="ml-2 text-[10px] font-semibold text-emerald-600/80 uppercase">
                    inclui {formatarMoeda(totalAbatimentos)} em abatimentos
                  </span>
                )}
              </td>
            </tr>
            {divergencia > 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-1.5 text-right">
                  <span className="text-[10px] text-gray-400">
                    Detalhe das parcelas difere em {formatarMoeda(divergencia)} do total impresso
                    pela fatura
                  </span>
                </td>
              </tr>
            )}
            {Math.abs(totalPagarCalculado - totalPagar) <= 0.5 &&
              totalAbatimentos > 0 &&
              totalPagarCalculado !== totalPagar && (
                <tr>
                  <td colSpan={3} className="px-3 py-1.5 text-right">
                    <span className="text-[10px] text-gray-400">
                      Soma das parcelas: {formatarMoeda(totalPagarCalculado)}
                    </span>
                  </td>
                </tr>
              )}
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-gray-400">
        Valores em reais (R$). Créditos de energia aparecem como abatimento (verde) e reduzem o
        total a pagar. Fio B sobre energia compensada conforme Lei 14.300/2022 — valor estimado
        quando não impresso na fatura.
      </p>
    </CardSecao>
  )
}

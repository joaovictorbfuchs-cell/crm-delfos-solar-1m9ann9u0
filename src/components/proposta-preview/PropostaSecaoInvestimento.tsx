import React from 'react'
import type { PropostaSolarPDFInput } from '@/lib/propostaSolarGenerator'
import { DollarSign, CreditCard, Landmark, CheckCircle, Clock } from 'lucide-react'

export interface PropostaSecaoInvestimentoProps {
  propostaData: PropostaSolarPDFInput
  onEdit?: () => void
}

/**
 * Seção individual do Preview: Investimento e Condições de Pagamento
 * Identificável pelo recurso "Selecionar Elementos".
 */
export const PropostaSecaoInvestimento: React.FC<PropostaSecaoInvestimentoProps> = ({
  propostaData,
  onEdit,
}) => {
  const investimento = propostaData.investimento
  const parcelamento = propostaData.parcelamento
  const conteudo = propostaData.conteudo

  const valorTotal = investimento?.valorTotal || 0
  const tituloSecao =
    conteudo?.secaoInvestimento?.titulo || 'Investimento e Condições de Pagamento'
  const subtituloCondicoes =
    conteudo?.secaoInvestimento?.subtituloCondicoes || 'FORMAS DE PAGAMENTO FACILITADAS'

  const aVista = parcelamento?.aVista
  const cartao = parcelamento?.cartao
  const finanA = parcelamento?.financiamentoA
  const finanB = parcelamento?.financiamentoB

  const formatarMoeda = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <section
      id="preview-secao-investimento-condicoes"
      data-section="investimento-condicoes"
      data-section-title="Investimento e Condições de Pagamento"
      className="relative bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs hover:border-emerald-500 hover:ring-1 hover:ring-emerald-500/30 transition-all p-5"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
            <DollarSign className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
              {tituloSecao}
            </h3>
            <p className="text-[11px] text-gray-500">{subtituloCondicoes}</p>
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-md transition-colors"
          >
            Editar Condições
          </button>
        )}
      </div>

      {/* Destaque do Valor Total */}
      <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/40 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            Valor Total do Investimento (Turnkey Completo)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-0.5">
            {formatarMoeda(valorTotal)}
          </div>
          <p className="text-xs text-emerald-800 mt-1">
            Inclui projeto, homologação com concessionária, equipamentos Tier-1 e montagem.
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/90 text-emerald-900 border border-emerald-300 shadow-2xs shrink-0 flex items-center gap-1.5">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Sem surpresas ou custos ocultos</span>
        </div>
      </div>

      {/* Grid de Formas de Pagamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
        {/* À Vista */}
        <div className="p-3.5 bg-white border-2 border-emerald-500 rounded-xl flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-emerald-800">
              <span>À Vista</span>
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px]">
                Sem Juros
              </span>
            </div>
            <div className="text-lg font-black text-emerald-900 mt-2">
              {formatarMoeda(aVista?.valorTotalComDesconto || valorTotal)}
            </div>
            {aVista?.desconto && aVista.desconto > 0 ? (
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                Desconto de {formatarMoeda(aVista.desconto)}
              </div>
            ) : (
              <div className="text-[11px] text-gray-500 mt-1">
                Pagamento único na aprovação / entrega
              </div>
            )}
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-100 text-[10px] text-emerald-800 font-medium">
            Maior retorno imediato do investimento
          </div>
        </div>

        {/* Cartão de Crédito */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-slate-700">
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3" />
                <span>Cartão</span>
              </span>
              <span className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded text-[9px]">
                {cartao?.parcelas || 12}x
              </span>
            </div>
            <div className="text-lg font-black text-slate-900 mt-2">
              {formatarMoeda(cartao?.valorParcela || (valorTotal / 12))}
            </div>
            <div className="text-[11px] text-slate-600 mt-1">
              {cartao?.entrada && cartao.entrada > 0 ? `Entrada: ${formatarMoeda(cartao.entrada)} • ` : ''}
              {cartao?.parcelas || 12} parcelas mensais
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
            Parcelamento via cartão de crédito
          </div>
        </div>

        {/* Financiamento A */}
        <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-900">
              <span className="flex items-center gap-1">
                <Landmark className="w-3 h-3 text-blue-600" />
                <span className="truncate max-w-[120px]">{finanA?.nomeBanco || 'Financiamento'}</span>
              </span>
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">
                {finanA?.parcelas || 60}x
              </span>
            </div>
            <div className="text-lg font-black text-blue-950 mt-2">
              {formatarMoeda(finanA?.valorParcela || 0)}
            </div>
            <div className="text-[11px] text-blue-800 mt-1">
              Parcela aproximada com carência
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-100 text-[10px] text-blue-700 font-medium">
            A parcela é paga com a própria economia
          </div>
        </div>

        {/* Financiamento B */}
        <div className="p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold uppercase text-blue-900">
              <span className="flex items-center gap-1">
                <Landmark className="w-3 h-3 text-blue-600" />
                <span className="truncate max-w-[120px]">{finanB?.nomeBanco || 'Opção Bancária'}</span>
              </span>
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px]">
                {finanB?.parcelas || 84}x
              </span>
            </div>
            <div className="text-lg font-black text-blue-950 mt-2">
              {formatarMoeda(finanB?.valorParcela || 0)}
            </div>
            <div className="text-[11px] text-blue-800 mt-1">
              Prazo estendido em até {finanB?.parcelas || 84} meses
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-blue-100 text-[10px] text-blue-700 font-medium">
            Financiamento solar facilitado
          </div>
        </div>
      </div>

      {/* Prazo de Entrega */}
      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs text-slate-700">
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Prazo de entrega e comissionamento:</span>
          <strong className="text-slate-900">{propostaData.prazoEntregaDias || 30} dias úteis</strong>
        </span>
        <span className="text-[11px] text-slate-500">
          Após aprovação do projeto pela concessionária
        </span>
      </div>
    </section>
  )
}

export default PropostaSecaoInvestimento

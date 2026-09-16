import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  Zap,
  Building2,
  Home,
  Clock,
  Sparkles,
  Info,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Table as TableIcon,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts'
import {
  calcularProjecaoEconomia,
  type ResumoProjecaoEconomia,
} from '@/lib/calculoProjecaoEconomia'
import {
  CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
  type TipoClienteProjecao,
} from '@/data/planilhaBaseProjecao'
import { formatCurrency } from '@/lib/formatters'

export interface SecaoProjecaoEconomiaProps {
  /** Consumo anual do cliente em kWh/ano (se nulo, usa exemplo padrão de 4.807,08) */
  consumoAnualCadastradoKwh?: number | null
  /** Tipo inicial do cliente (residencial ou comercial) */
  tipoClienteInicial?: TipoClienteProjecao
  /** Tarifa de referência inicial R$/kWh opcional */
  tarifaReferenciaInicial?: number | null
  /** Nome do cliente para contextualização */
  nomeCliente?: string
  /** Se deve permitir edição manual do consumo para simulação */
  permitirAjusteConsumo?: boolean
  className?: string
}

export const SecaoProjecaoEconomia: React.FC<SecaoProjecaoEconomiaProps> = ({
  consumoAnualCadastradoKwh,
  tipoClienteInicial = 'residencial',
  tarifaReferenciaInicial,
  nomeCliente,
  permitirAjusteConsumo = true,
  className = '',
}) => {
  // Estado de tipo de cliente: Residencial (30% simultaneidade) ou Comercial (70% simultaneidade)
  const [tipoCliente, setTipoCliente] = useState<TipoClienteProjecao>(tipoClienteInicial)

  // Estado para consumo anual
  const consumoBaseInicial = useMemo(() => {
    if (
      consumoAnualCadastradoKwh !== undefined &&
      consumoAnualCadastradoKwh !== null &&
      consumoAnualCadastradoKwh > 0
    ) {
      return Number(consumoAnualCadastradoKwh.toFixed(2))
    }
    return CONSUMO_EXEMPLO_PADRAO_KWH_ANO
  }, [consumoAnualCadastradoKwh])

  const [consumoAnual, setConsumoAnual] = useState<number>(consumoBaseInicial)
  const [usandoExemplo, setUsandoExemplo] = useState<boolean>(
    !consumoAnualCadastradoKwh || consumoAnualCadastradoKwh <= 0,
  )

  // Recalcula projeção completa
  const projecao: ResumoProjecaoEconomia = useMemo(() => {
    return calcularProjecaoEconomia({
      tipoCliente,
      consumoKwhAno: consumoAnual,
      tarifaPersonalizadaPrimeiroAno: tarifaReferenciaInicial || undefined,
    })
  }, [tipoCliente, consumoAnual, tarifaReferenciaInicial])

  // Formatação para o gráfico Recharts
  const dadosGrafico = useMemo(() => {
    return projecao.linhas.map((linha) => ({
      ano: String(linha.ano),
      'Economia Acumulada': Math.round(linha.economiaAcumulada),
      'Gasto s/ Solar': Math.round(linha.gastoSemSolarAcumulado),
      gdEcoLiquida: Number(linha.gdEcoLiquidaKwh.toFixed(3)),
    }))
  }, [projecao.linhas])

  const formatarKwh = (val: number) =>
    val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const formatarMoedaCompacta = (val: number) => {
    if (val >= 1_000_000) {
      return `R$ ${(val / 1_000_000).toFixed(1).replace('.', ',')}M`
    }
    if (val >= 1_000) {
      return `R$ ${(val / 1_000).toFixed(0)}k`
    }
    return `R$ ${Math.round(val)}`
  }

  return (
    <section
      className={`bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden ${className}`}
      aria-label="Projeção de Economia na Conta de Energia"
    >
      {/* Cabeçalho da Seção com Identidade Solar Delfos */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-green-700 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/15 text-emerald-100 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Marco Legal da GD (Lei 14.300/2022)</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
            Projeção de Economia na Conta de Energia
          </h3>
          <p className="text-xs text-emerald-100/90 max-w-2xl leading-relaxed">
            Simulação de 26 anos (2026 a 2051) com aplicação automática do fator de simultaneidade,
            componente do Fio B da distribuidora e GD Eco Líquida.
            {nomeCliente && (
              <span className="block mt-0.5 text-emerald-200 font-semibold">
                Cliente: {nomeCliente}
              </span>
            )}
          </p>
        </div>

        {/* Fator de Simultaneidade em Destaque */}
        <div className="bg-emerald-950/40 border border-white/15 rounded-xl p-3 text-right self-start md:self-auto shrink-0 backdrop-blur-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-200 block">
            Fator de Simultaneidade
          </span>
          <span className="text-2xl font-black text-amber-300">
            {Math.round(projecao.fatorSimultaneidade * 100)}%
          </span>
          <span className="text-[10px] text-emerald-100 block">
            {tipoCliente === 'residencial' ? 'Autoconsumo Residencial' : 'Autoconsumo Comercial'}
          </span>
        </div>
      </div>

      {/* Barra de Controles: Seletor Residencial / Comercial e Consumo Anual */}
      <div className="p-4 bg-emerald-50/40 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* 1. SELEÇÃO DO TIPO DE CLIENTE */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
              1
            </span>
            Tipo de Cliente & Simultaneidade
          </label>
          <div className="inline-flex rounded-xl p-1 bg-white border border-gray-300 shadow-2xs">
            <button
              type="button"
              onClick={() => setTipoCliente('residencial')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                tipoCliente === 'residencial'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Residencial (30%)</span>
            </button>
            <button
              type="button"
              onClick={() => setTipoCliente('comercial')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                tipoCliente === 'comercial'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Comercial (70%)</span>
            </button>
          </div>
        </div>

        {/* 2. CONSUMO ANUAL (FICHA OU DEMONSTRAÇÃO) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                2
              </span>
              Consumo Anual (kWh/ano)
            </label>
            <button
              type="button"
              onClick={() => {
                setConsumoAnual(CONSUMO_EXEMPLO_PADRAO_KWH_ANO)
                setUsandoExemplo(true)
              }}
              className="text-[10px] text-emerald-700 hover:underline font-bold"
              title="Carregar 4.807,08 kWh/ano para demonstrar a proposta"
            >
              Usar exemplo (4.807,08)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="100"
                disabled={!permitirAjusteConsumo}
                value={consumoAnual}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0
                  setConsumoAnual(val)
                  setUsandoExemplo(false)
                }}
                className="w-40 sm:w-44 text-xs font-black text-gray-900 px-3 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                kWh/ano
              </span>
            </div>

            {usandoExemplo ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-1 rounded-md border border-amber-300">
                <CheckCircle2 className="w-3 h-3 text-amber-700" />
                Exemplo solicitado
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 font-medium">
                (~{(consumoAnual / 12).toFixed(1)} kWh/mês)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AVISO INFORMATIVO DA PLANILHA BASE */}
      <div className="mx-4 sm:mx-5 mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-0.5">
          <p className="font-semibold text-blue-950">
            Valores de Tarifa, Fio B e GD Eco Líquida calculados pela Planilha Base do Sistema:
          </p>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Residencial aplica <strong>30% de simultaneidade</strong> (70% sujeito ao Fio B
            escalonado da Lei 14.300) e Comercial aplica <strong>70% de simultaneidade</strong> (30%
            sujeito ao Fio B). Os valores de Tarifa e Fio B crescem com reajuste anual de ~8% a.a. e
            GD Eco Líquida é calculada como <em>Tarifa - (Fio B × (1 - Fator))</em>.
          </p>
        </div>
      </div>

      {/* GRÁFICO RECHARTS: EVOLUÇÃO DA ECONOMIA ACUMULADA */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-800">
              Evolução da Economia Acumulada x Gasto sem Solar (2026–2051)
            </h4>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 self-start sm:self-auto">
            Cenário: {tipoCliente === 'residencial' ? 'Residencial (30%)' : 'Comercial (70%)'}
          </span>
        </div>

        <div className="bg-slate-50/70 rounded-xl p-3 border border-gray-200">
          <div className="w-full h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosGrafico} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="ano"
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  tickFormatter={formatarMoedaCompacta}
                  width={68}
                />
                <RechartsTooltip
                  formatter={(value: unknown, name: unknown) => {
                    const num = typeof value === 'number' ? value : Number(value) || 0
                    const label = String(name || '')
                    return [formatCurrency(num), label]
                  }}
                  labelFormatter={(label) => `Ano ${label}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '0.75rem',
                    border: '1px solid #d1d5db',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="Economia Acumulada"
                  stroke="#16A34A"
                  strokeWidth={3}
                  dot={{ r: 2, fill: '#16A34A' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="Gasto s/ Solar"
                  stroke="#DC2626"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TABELA ANO A ANO (2026 A 2051 - 26 ANOS) */}
      <div className="p-4 sm:p-5 pt-0 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-800">
              Tabela Projeção Ano a Ano (2026–2051)
            </h4>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            26 anos • Scroll horizontal/vertical
          </span>
        </div>

        {/* Container compacto com scroll vertical (máx 340px) */}
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100/90 sticky top-0 z-10 border-b border-gray-200 text-gray-600 uppercase text-[10px] font-black tracking-wider shadow-2xs">
                <tr>
                  <th className="py-2.5 px-3 whitespace-nowrap">Ano</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Consumo (kWh)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Tarifa (R$/kWh)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap">Fio B (R$/kWh)</th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap bg-emerald-50 text-emerald-900 font-black">
                    GD Eco Líquida (R$/kWh)
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap text-emerald-800 font-black">
                    Economia Acumulada (R$)
                  </th>
                  <th className="py-2.5 px-3 text-right whitespace-nowrap text-red-700 font-bold">
                    Gasto Acumulado sem Solar (R$)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projecao.linhas.map((linha, index) => {
                  const isPar = index % 2 === 0
                  const isAno25 = linha.ano === 2050
                  return (
                    <tr
                      key={linha.ano}
                      className={`hover:bg-emerald-50/50 transition-colors ${
                        isAno25
                          ? 'bg-amber-50/60 font-semibold'
                          : isPar
                            ? 'bg-white'
                            : 'bg-gray-50/40'
                      }`}
                    >
                      <td className="py-2 px-3 font-bold text-gray-900 whitespace-nowrap">
                        {linha.ano}
                        {linha.ano === 2026 && (
                          <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                            Ano 1
                          </span>
                        )}
                        {isAno25 && (
                          <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-amber-200 text-amber-900 font-bold">
                            25 anos
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">
                        {formatarKwh(linha.consumoKwhAno)}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700 whitespace-nowrap">
                        R$ {linha.tarifaKwh.toFixed(3).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-600 whitespace-nowrap">
                        R$ {linha.fioBKwh.toFixed(3).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 bg-emerald-50/40 whitespace-nowrap">
                        R$ {linha.gdEcoLiquidaKwh.toFixed(3).replace('.', ',')}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-emerald-700 whitespace-nowrap">
                        {formatCurrency(linha.economiaAcumulada)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-red-700 whitespace-nowrap">
                        {formatCurrency(linha.gastoSemSolarAcumulado)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* PARTE INFERIOR: RESUMO CONSOLIDADO (25 ANOS, SEM SOLAR E VALOR PERDIDO POR MÊS) */}
      <div className="p-4 sm:p-5 bg-gradient-to-br from-gray-50 to-emerald-50/30 border-t border-gray-200 space-y-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-700" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
            Resumo Consolidado do Investimento Solar
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Economia Total Acumulada em 25 anos */}
          <div className="bg-white p-4 rounded-xl border border-emerald-300 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 block">
                Economia Total em 25 Anos
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
                {formatCurrency(projecao.economiaTotal25Anos)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Acumulado líquido de 2026 a 2050 (em 26 anos:{' '}
                {formatCurrency(projecao.economiaTotal26Anos)})
              </p>
            </div>
            <div className="pt-2 mt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-emerald-800 font-semibold">
              <span>Fator: {Math.round(projecao.fatorSimultaneidade * 100)}%</span>
              <span>Protegido de reajustes</span>
            </div>
          </div>

          {/* Card 2: Gasto Total Sem Solar em 25 anos */}
          <div className="bg-white p-4 rounded-xl border border-red-200 shadow-2xs flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full pointer-events-none" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-red-900 block">
                Gasto Total Sem Solar em 25 Anos
              </span>
              <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1">
                {formatCurrency(projecao.gastoTotalSemSolar25Anos)}
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Valor pago à concessionária sem retorno (em 26 anos:{' '}
                {formatCurrency(projecao.gastoTotalSemSolar26Anos)})
              </p>
            </div>
            <div className="pt-2 mt-3 border-t border-gray-100 flex items-center justify-between text-[10px] text-red-800 font-semibold">
              <span>Dinheiro desperdiçado</span>
              <span>Inflação tarifária contínua</span>
            </div>
          </div>

          {/* Card 3: Valor Perdido a Cada Mês de Postergação (DESTAQUE MÁXIMO) */}
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white p-4 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-3 -right-3 w-16 h-16 bg-white/10 rounded-full pointer-events-none" />
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Custo de Postergação</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                {formatCurrency(projecao.valorPerdidoPorMesPostergacao)}
                <span className="text-sm font-bold text-amber-100"> /mês</span>
              </div>
              <p className="text-[11px] text-amber-100 mt-1 leading-snug">
                Cada mês sem instalar energia solar custa{' '}
                <strong>{formatCurrency(projecao.valorPerdidoPorMesPostergacao)}</strong> pagos à
                concessionária que não retornam mais.
              </p>
            </div>
            <div className="pt-2 mt-3 border-t border-white/20 flex items-center justify-between text-[10px] text-amber-100 font-bold">
              <span>Economia Ano 1: {formatCurrency(projecao.economiaPrimeiroAno)}</span>
              <span>÷ 12 meses</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
export default SecaoProjecaoEconomia

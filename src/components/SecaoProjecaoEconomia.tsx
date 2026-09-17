import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  AlertTriangle,
  Building2,
  Home,
  Sparkles,
  Info,
  CheckCircle2,
  Database,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import {
  calcularProjecaoEconomia,
  type ResumoProjecaoEconomia,
} from '@/lib/calculoProjecaoEconomia'
import {
  CONSUMO_EXEMPLO_PADRAO_KWH_ANO,
  type TipoClienteProjecao,
} from '@/data/planilhaBaseProjecao'
import {
  fetchProjecoesTarifarias,
  type ProjecaoTarifariaRecord,
} from '@/services/projecaoTarifariaService'
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
  /** Payback em meses (calculado ou persistido no orçamento) */
  paybackMeses?: number | null
  /** Texto personalizado de payback (ex: '4 anos e 2 meses') */
  paybackTexto?: string | null
  /** Valor do investimento total (R$) para cálculo de payback se não fornecido */
  valorInvestimento?: number | null
  className?: string
}

export const SecaoProjecaoEconomia: React.FC<SecaoProjecaoEconomiaProps> = ({
  consumoAnualCadastradoKwh,
  tipoClienteInicial = 'residencial',
  tarifaReferenciaInicial,
  nomeCliente,
  permitirAjusteConsumo = true,
  paybackMeses,
  paybackTexto,
  valorInvestimento,
  className = '',
}) => {
  // Estado de tipo de cliente: Residencial (30% simultaneidade) ou Comercial (70% simultaneidade)
  const [tipoCliente, setTipoCliente] = useState<TipoClienteProjecao>(tipoClienteInicial)
  const [dadosTarifariosCustomizados, setDadosTarifariosCustomizados] = useState<
    ProjecaoTarifariaRecord[]
  >([])
  const [carregandoTarifas, setCarregandoTarifas] = useState(false)

  // Carregar dados de projecao_tarifaria do PocketBase
  const carregarTarifasDoBanco = useCallback(async () => {
    setCarregandoTarifas(true)
    try {
      const records = await fetchProjecoesTarifarias()
      setDadosTarifariosCustomizados(records)
    } catch (err) {
      console.warn('Erro ao carregar tarifas:', err)
    } finally {
      setCarregandoTarifas(false)
    }
  }, [])

  useEffect(() => {
    carregarTarifasDoBanco()
  }, [carregarTarifasDoBanco])

  // Estado para consumo anual
  const consumoBaseInicial = useMemo(() => {
    const num = Number(consumoAnualCadastradoKwh)
    if (!isNaN(num) && num > 0) {
      return Number(num.toFixed(2))
    }
    return CONSUMO_EXEMPLO_PADRAO_KWH_ANO
  }, [consumoAnualCadastradoKwh])

  const [consumoAnual, setConsumoAnual] = useState<number>(consumoBaseInicial)
  const [usandoExemplo, setUsandoExemplo] = useState<boolean>(() => {
    const num = Number(consumoAnualCadastradoKwh)
    return isNaN(num) || num <= 0
  })

  // Recalcula projeção completa consumindo dados do banco ou do fallback estimado
  const projecao: ResumoProjecaoEconomia = useMemo(() => {
    return calcularProjecaoEconomia({
      tipoCliente,
      consumoKwhAno: consumoAnual,
      tarifaPersonalizadaPrimeiroAno: tarifaReferenciaInicial || undefined,
      dadosTarifariosCustomizados,
    })
  }, [tipoCliente, consumoAnual, tarifaReferenciaInicial, dadosTarifariosCustomizados])

  const possuiDadosBancoParaTipo = useMemo(() => {
    return dadosTarifariosCustomizados.some((d) => d.tipo_cliente === tipoCliente)
  }, [dadosTarifariosCustomizados, tipoCliente])

  // Resolução do Payback estimado
  const infoPayback = useMemo(() => {
    if (paybackTexto) {
      return {
        texto: paybackTexto,
        anos: null,
        meses: null,
      }
    }
    const mesesTotais =
      paybackMeses !== undefined && paybackMeses !== null && paybackMeses > 0
        ? paybackMeses
        : valorInvestimento && valorInvestimento > 0 && projecao.valorPerdidoPorMesPostergacao > 0
          ? Math.round((valorInvestimento / projecao.valorPerdidoPorMesPostergacao) * 10) / 10
          : 50

    const anos = Math.floor(mesesTotais / 12)
    const meses = Math.round(mesesTotais % 12)
    const anoCalendario = (projecao.anoInicial || 2026) + anos

    let texto = `${anos} anos`
    if (meses > 0) {
      texto = `${anos} anos e ${meses} meses`
    }

    return {
      texto,
      anos,
      meses,
      anoCalendario,
      mesesTotais,
    }
  }, [
    paybackTexto,
    paybackMeses,
    valorInvestimento,
    projecao.valorPerdidoPorMesPostergacao,
    projecao.anoInicial,
  ])

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
            <span className="block mt-0.5 text-amber-200/95 font-medium">
              Projeção considera degradação dos painéis: LID 2% no 1º ano + 0,55% a.a.
            </span>
            {nomeCliente && (
              <span className="block mt-0.5 text-emerald-200 font-semibold">
                Cliente: {nomeCliente}
              </span>
            )}
          </p>
        </div>

        {/* Fator de Simultaneidade */}
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

      {/* STATUS DA ORIGEM DOS DADOS (BANCO vs FALLBACK ESTIMADO) */}
      <div className="mx-4 sm:mx-5 mt-4">
        {possuiDadosBancoParaTipo ? (
          <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-emerald-950">
                  Valores oficiais carregados da planilha do usuário (
                  {tipoCliente === 'residencial' ? 'Residencial' : 'Comercial'})
                </p>
                <p className="text-[11px] text-emerald-800">
                  Tarifas, Fio B e GD Eco Líquida sincronizados com a coleção oficial no banco de
                  dados.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs text-amber-950">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Valores de referência estimados</p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Esta projeção está utilizando a{' '}
                  <strong>tabela interna com reajuste estimado de 9% a.a.</strong> (Lei 14.300).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CORPO DA SEÇÃO: CARDS DO RESUMO DA PROJEÇÃO DE ECONOMIA + CARD DO PAYBACK ABAIXO */}
      <div className="p-5 sm:p-6 bg-gradient-to-br from-gray-50/70 to-emerald-50/30 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-900">
              Resumo da Projeção de Economia
            </h4>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {tipoCliente === 'residencial'
                ? 'Autoconsumo Residencial (30%)'
                : 'Autoconsumo Comercial (70%)'}
            </span>
            <span
              className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-300"
              title="Degradação dos módulos: LID 2% no 1º ano e 0,55% a.a."
            >
              Degradação: LID 2% + 0,55% a.a.
            </span>
          </div>
        </div>

        {/* CARDS GRANDES DE RESUMO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Economia Total Acumulada em 25 anos */}
          <div className="bg-white p-5 rounded-2xl border border-emerald-300 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-emerald-400 transition-all">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 block">
                Economia Total em 25 Anos
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 tracking-tight">
                {formatCurrency(projecao.economiaTotal25Anos)}
              </div>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Total acumulado líquido economizado na fatura durante o ciclo de 25 anos com
                degradação considerada.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
              <span>Período total (26 anos):</span>
              <span className="font-bold">{formatCurrency(projecao.economiaTotal26Anos)}</span>
            </div>
          </div>

          {/* Card 2: Gasto Total Sem Solar em 25 anos */}
          <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-red-300 transition-all">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-bl-full pointer-events-none" />
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wide text-red-900 block">
                Gasto Total Sem Solar em 25 Anos
              </span>
              <div className="text-2xl sm:text-3xl font-black text-red-700 mt-1 tracking-tight">
                {formatCurrency(projecao.gastoTotalSemSolar25Anos)}
              </div>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Total desembolsado à concessionária sem retorno patrimonial, considerando a inflação
                da tarifa de energia.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-gray-100 flex items-center justify-between text-[11px] text-red-800 font-semibold">
              <span>Período total (26 anos):</span>
              <span className="font-bold">{formatCurrency(projecao.gastoTotalSemSolar26Anos)}</span>
            </div>
          </div>

          {/* Card 3: Custo de Postergação (Valor Perdido por Mês) */}
          <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -top-3 -right-3 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-100">
                <AlertTriangle className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Custo de Postergação</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
                {formatCurrency(projecao.valorPerdidoPorMesPostergacao)}
                <span className="text-sm font-bold text-amber-100"> /mês</span>
              </div>
              <p className="text-xs text-amber-100 mt-1.5 leading-snug">
                Cada mês sem energia solar representa{' '}
                <strong>{formatCurrency(projecao.valorPerdidoPorMesPostergacao)}</strong> pagos à
                concessionária que não retornam.
              </p>
            </div>
            <div className="pt-3 mt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-amber-100 font-bold">
              <span>Economia Ano 1: {formatCurrency(projecao.economiaPrimeiroAno)}</span>
              <span>÷ 12 meses</span>
            </div>
          </div>
        </div>

        {/* CARD DO PAYBACK ABAIXO DOS CARDS DE RESUMO */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-amber-400/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-amber-400/10 rounded-full pointer-events-none" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="w-6 h-6 text-amber-700" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                  Tempo de Retorno do Investimento
                </span>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Retorno Garantido
                </span>
              </div>
              <h4 className="text-sm font-bold text-gray-800">Payback Estimado</h4>
              <p className="text-xs text-gray-600 max-w-xl leading-relaxed">
                Tempo necessário para que a economia na conta de energia pague 100% do investimento
                no sistema solar. Após esse prazo, toda a economia gerada passa a ser lucro líquido
                direto.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-3.5 sm:p-4 text-center sm:text-right shrink-0 w-full sm:w-auto shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-800 block">
              Payback do Sistema
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 tracking-tight my-0.5">
              {infoPayback.texto}
            </div>
            {infoPayback.anoCalendario && (
              <span className="text-[11px] font-semibold text-amber-900 block">
                Quitação prevista: ~{infoPayback.anoCalendario}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
export default SecaoProjecaoEconomia

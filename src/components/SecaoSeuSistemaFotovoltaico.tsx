import React from 'react'
import {
  Zap,
  TrendingUp,
  CircuitBoard,
  Maximize2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

/**
 * Ícone representativo de um módulo/painel solar fotovoltaico:
 * grade retangular de células fotovoltaicas com moldura externa e linhas de células.
 */
const ModuloSolarIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Moldura externa do painel */}
    <rect x="3" y="3" width="18" height="18" rx="2" />
    {/* Linha vertical central divisória das células */}
    <line x1="12" y1="3" x2="12" y2="21" />
    {/* Linhas horizontais divisórias das células */}
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    {/* Células internas com detalhe sutil */}
    <circle cx="7.5" cy="6" r="0.6" fill="currentColor" />
    <circle cx="16.5" cy="6" r="0.6" fill="currentColor" />
    <circle cx="7.5" cy="12" r="0.6" fill="currentColor" />
    <circle cx="16.5" cy="12" r="0.6" fill="currentColor" />
    <circle cx="7.5" cy="18" r="0.6" fill="currentColor" />
    <circle cx="16.5" cy="18" r="0.6" fill="currentColor" />
  </svg>
)

export interface SecaoSeuSistemaFotovoltaicoProps {
  /** Potência do sistema em kWp */
  potenciaKwp?: number | null
  /** Geração mensal estimada em kWh/mês */
  geracaoMensalKwh?: number | null
  /** Economia mensal estimada em R$/mês */
  economiaMensal?: number | null
  /** Número de placas/módulos */
  numeroPlacas?: number | null
  /** Marca e modelo do painel */
  marcaPainel?: string | null
  /** Potência individual do módulo em Wp */
  potenciaPlacaWp?: number | null
  /** Tecnologia do módulo (ex: Bifacial N-type, Monocristalino Half-Cell) */
  tecnologiaModulo?: string | null
  /** Marca e modelo do inversor */
  marcaInversor?: string | null
  /** Quantidade de inversores */
  quantidadeInversores?: number | null
  /** Quantidade de MPPT do inversor */
  mpptInversor?: number | string | null
  /** Potência nominal do inversor em kW */
  potenciaInversorKw?: number | null
  /** Área necessária em m² */
  areaNecessariaM2?: number | null
  /** Garantia dos módulos em anos (performance / degradação - padrão 30) */
  garantiaModulosAnos?: number | null
  /** Garantia contra defeitos de fabricação dos módulos em anos (padrão 15) */
  garantiaModulosFabricacaoAnos?: number | null
  /** Garantia do inversor em anos (fábrica - padrão 10) */
  garantiaInversorAnos?: number | null
  /** Garantia da instalação Delfos em anos ou texto */
  garantiaInstalacaoTexto?: string | null
  /** Garantia da instalação em anos numérico */
  garantiaInstalacaoAnos?: number | null
  /** Nome do cliente para personalização suave */
  nomeCliente?: string | null
  className?: string
}

/**
 * Seção "Seu Sistema Fotovoltaico" da proposta comercial.
 * Apresenta uma visão consolidada, moderna e 100% visual de todos os dados técnicos
 * e garantias em cards com ícones minimalistas, sem tabelas.
 */
export const SecaoSeuSistemaFotovoltaico: React.FC<SecaoSeuSistemaFotovoltaicoProps> = ({
  potenciaKwp,
  geracaoMensalKwh,
  economiaMensal,
  numeroPlacas,
  marcaPainel,
  potenciaPlacaWp,
  tecnologiaModulo,
  marcaInversor,
  quantidadeInversores = 1,
  mpptInversor,
  potenciaInversorKw,
  areaNecessariaM2,
  garantiaModulosAnos,
  garantiaModulosFabricacaoAnos,
  garantiaInversorAnos,
  garantiaInstalacaoTexto,
  garantiaInstalacaoAnos,
  nomeCliente,
  className = '',
}) => {
  // Dados de fallback para demonstração conforme especificado pelo usuário:
  // "sistema de 8,54 kWp, 14 módulos JA Solar 610W bifacial N-type,
  //  inversor Huawei SUN2000-6KTL-L1 220V 2 MPPT, geração 1.106 kWh/mês,
  //  economia R$ 928,75/mês, área 37,80 m², garantia módulos degradação 30 anos,
  //  defeitos fabricação 15 anos, inversor 10 anos, instalação 12 meses."

  const potenciaFinal =
    potenciaKwp !== undefined && potenciaKwp !== null && potenciaKwp > 0 ? potenciaKwp : 8.54

  const geracaoFinal =
    geracaoMensalKwh !== undefined && geracaoMensalKwh !== null && geracaoMensalKwh > 0
      ? geracaoMensalKwh
      : 1106

  const economiaFinal =
    economiaMensal !== undefined && economiaMensal !== null && economiaMensal > 0
      ? economiaMensal
      : 928.75

  const placasQtdFinal =
    numeroPlacas !== undefined && numeroPlacas !== null && numeroPlacas > 0 ? numeroPlacas : 14

  const placasPotenciaWpFinal =
    potenciaPlacaWp !== undefined && potenciaPlacaWp !== null && potenciaPlacaWp > 0
      ? potenciaPlacaWp
      : 610

  const marcaModuloFinal = (marcaPainel && marcaPainel.trim()) || 'JA Solar'
  const tecnologiaModuloFinal = (tecnologiaModulo && tecnologiaModulo.trim()) || 'bifacial N-type'

  const marcaInversorFinal =
    (marcaInversor && marcaInversor.trim()) || 'Huawei SUN2000-6KTL-L1 220V'

  const mpptFinal = mpptInversor || 2

  const potenciaInversorFinalKw =
    potenciaInversorKw !== undefined && potenciaInversorKw !== null && potenciaInversorKw > 0
      ? potenciaInversorKw
      : potenciaFinal > 0
        ? Math.round(potenciaFinal * 0.8 * 10) / 10 || 6
        : 6

  const areaFinalM2 =
    areaNecessariaM2 !== undefined && areaNecessariaM2 !== null && areaNecessariaM2 > 0
      ? areaNecessariaM2
      : 37.8

  // Garantias dinâmicas com padrões cadastráveis:
  // - Degradação/performance dos módulos: 30 anos
  // - Defeitos de fabricação dos módulos: 15 anos
  // - Inversor: 10 anos
  // - Instalação: 12 meses (ou texto personalizado)
  const garantiaModulosDegradacaoFinal =
    garantiaModulosAnos !== undefined && garantiaModulosAnos !== null && garantiaModulosAnos > 0
      ? garantiaModulosAnos
      : 30

  const garantiaModulosFabricacaoFinal =
    garantiaModulosFabricacaoAnos !== undefined &&
    garantiaModulosFabricacaoAnos !== null &&
    garantiaModulosFabricacaoAnos > 0
      ? garantiaModulosFabricacaoAnos
      : 15

  const garantiaInversorFinalAnos =
    garantiaInversorAnos !== undefined && garantiaInversorAnos !== null && garantiaInversorAnos > 0
      ? garantiaInversorAnos
      : 10

  const garantiaInstalacaoFinalTexto =
    garantiaInstalacaoTexto ||
    (garantiaInstalacaoAnos ? `${garantiaInstalacaoAnos} anos` : '12 meses')

  return (
    <section
      className={`bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden transition-all ${className}`}
      aria-label="Seu Sistema Fotovoltaico"
    >
      {/* ========================================================================= */}
      {/* TOPO: HERO VISUAL COM BACKGROUND SUAVE DE USINA SOLAR & TÍTULO GRANDE     */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 md:p-10">
        {/* Padrão SVG Decorativo Geométrico de Usina Fotovoltaica / Céu Solar */}
        <div className="absolute inset-0 opacity-15 pointer-events-none" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-solar-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.75"
                  className="text-white"
                />
                <circle cx="20" cy="20" r="1.5" fill="currentColor" className="text-emerald-300" />
              </pattern>
              <radialGradient id="sun-glow-bg" cx="80%" cy="20%" r="60%">
                <stop offset="0%" stopColor="#34D399" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#064E3B" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#sun-glow-bg)" />
            <rect width="100%" height="100%" fill="url(#grid-solar-pattern)" />
          </svg>
        </div>

        {/* Círculo luminoso suave representando o sol */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Conteúdo do Topo */}
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-emerald-100 border border-white/20 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="uppercase tracking-wider">Seu Sistema Fotovoltaico</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Conheça sua usina solar
          </h2>

          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-normal">
            Engenharia de precisão planejada sob medida para{' '}
            {nomeCliente ? <strong>{nomeCliente}</strong> : 'você'}. Todos os dados técnicos
            consolidados em uma apresentação clara, moderna e transparente — sem letras miúdas.
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CORPO: GRID DE CARDS VISUAIS COM ÍCONES E FONTES GRANDES                  */}
      {/* ========================================================================= */}
      <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 bg-[#FBFDFB]">
        {/* Grid de 6 cards principais (2 ou 3 colunas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Card 1: ⚡ Potência do sistema */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform shadow-2xs">
                <Zap className="w-6 h-6 fill-amber-500 text-amber-600" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Capacidade Nominal
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Potência do sistema
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 tracking-tight">
                {(Number(potenciaFinal) || 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-lg font-bold text-emerald-700">kWp</span>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 leading-snug">
                Potência total instalada com módulos fotovoltaicos de alta eficiência energética.
              </p>
            </div>
          </div>

          {/* Card 2: 📊 Geração estimada + economia */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform shadow-2xs">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                Alta Produção
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Geração estimada
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 tracking-tight">
                {Math.round(Number(geracaoFinal) || 0).toLocaleString('pt-BR')}{' '}
                <span className="text-lg font-bold text-gray-600">kWh/mês</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Economia de {formatCurrency(economiaFinal)}/mês</span>
              </div>
            </div>
          </div>

          {/* Card 3: 🔆 Módulos Fotovoltaicos com ícone representativo e garantias no rodapé */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 group-hover:scale-105 transition-transform shadow-2xs">
                  <ModuloSolarIcon className="w-6 h-6 text-amber-600" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Tier-1 Global
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Módulos Fotovoltaicos
                </div>
                <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 tracking-tight">
                  {placasQtdFinal} <span className="text-lg font-bold text-gray-600">unidades</span>
                </div>
                <p className="text-xs text-gray-700 font-semibold mt-1.5 leading-snug">
                  {marcaModuloFinal} — {placasPotenciaWpFinal}W cada
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Tecnologia {tecnologiaModuloFinal}
                </p>
              </div>
            </div>

            {/* Rodapé do Card: Garantias dos Módulos (Degradação/Performance & Fabricação) */}
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span className="font-medium text-gray-500">
                  Garantia de performance (degradação):
                </span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                  {garantiaModulosDegradacaoFinal} anos
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span className="font-medium text-gray-500">
                  Garantia contra defeitos de fabricação:
                </span>
                <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                  {garantiaModulosFabricacaoFinal} anos
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: 🔌 Inversor Solar com ícone CircuitBoard e garantias no rodapé */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-600 group-hover:scale-105 transition-transform shadow-2xs">
                  <CircuitBoard className="w-6 h-6 text-teal-600" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  {quantidadeInversores} {quantidadeInversores > 1 ? 'Inversores' : 'Inversor'}
                </span>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Inversor Solar
                </div>
                <div className="text-lg sm:text-xl font-black text-gray-900 mt-1 tracking-tight leading-snug">
                  {marcaInversorFinal}
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-bold border border-gray-200">
                    {mpptFinal} MPPT
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                    {potenciaInversorFinalKw} kW
                  </span>
                </div>
              </div>
            </div>

            {/* Rodapé do Card: Garantia do Inversor + Garantia da Instalação */}
            <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span className="font-medium text-gray-500">Garantia do inversor:</span>
                <span className="font-extrabold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/70">
                  {garantiaInversorFinalAnos} anos
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-600">
                <span className="font-medium text-gray-500">Garantia da instalação:</span>
                <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70">
                  {garantiaInstalacaoFinalTexto}
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: 📐 Área necessária */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform shadow-2xs">
                <Maximize2 className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                Telhado / Espaço
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Área necessária
              </div>
              <div className="text-2xl sm:text-3xl font-black text-gray-900 mt-1 tracking-tight">
                {(Number(areaFinalM2) || 0).toLocaleString('pt-BR', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 2,
                })}{' '}
                <span className="text-lg font-bold text-gray-600">m²</span>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 leading-snug">
                Área útil estimada para disposição e fixação otimizada dos painéis solares.
              </p>
            </div>
          </div>

          {/* Card 6: 🛡️ Garantia instalação Delfos */}
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs hover:shadow-md transition-all group flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform shadow-2xs">
                <ShieldCheck className="w-6 h-6 text-emerald-700" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Engenharia Própria
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Garantia de Instalação
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1 tracking-tight">
                {garantiaInstalacaoFinalTexto}
              </div>
              <p className="text-xs text-gray-600 mt-1.5 leading-snug">
                Garantia integral Delfos sobre mão de obra especializada, cabos, proteções e ART
                emitida.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* FAIXA DE MONITORAMENTO 24/7 INCLUSO                                       */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-2xs">
              <Smartphone className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-extrabold text-white">
                  Monitoramento 24/7 incluso
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-emerald-100 border border-white/20">
                  Aplicativo Mobile
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium mt-0.5">
                Acompanhe sua produção em tempo real pelo celular — geração diária, economia
                acumulada e alertas inteligentes.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-800 text-xs font-bold shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>iOS & Android</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SecaoSeuSistemaFotovoltaico

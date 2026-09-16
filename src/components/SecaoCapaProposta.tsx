import React from 'react'
import { Sparkles, Calendar, User, ShieldCheck } from 'lucide-react'
import { DelfosLogo } from '@/components/DelfosLogo'
import { formatCurrency, formatDate } from '@/lib/formatters'

export interface SecaoCapaPropostaProps {
  /** Nome do cliente em destaque */
  nomeCliente?: string | null
  /** Economia mensal estimada em R$/mês */
  economiaMensal?: number | null
  /** Data da proposta (ISO string ou formatada) */
  dataOrcamento?: string | null
  /** Nome do consultor / autor do orçamento */
  consultor?: string | null
  /** Potência do sistema em kWp (opcional, para selo complementar) */
  potenciaKwp?: number | null
  className?: string
}

/**
 * Seção 1 — Capa da Proposta Comercial Delfos Solar.
 * Design visual de alto impacto:
 * - Fundo escuro com gradiente elegante e decoração solar sutil (painéis, brilho e glows esmeralda/dourado)
 * - Nome do cliente em tipografia grande e refinada
 * - Frase principal em verde solar e negrito
 * - Subtítulo oficial
 * - Logo oficial Delfos Solar no topo direito
 * - Metadados: Data da proposta formatada em pt-BR e Consultor responsável
 */
export const SecaoCapaProposta: React.FC<SecaoCapaPropostaProps> = ({
  nomeCliente,
  economiaMensal,
  dataOrcamento,
  consultor,
  potenciaKwp,
  className = '',
}) => {
  const clienteFinal = (nomeCliente && nomeCliente.trim()) || 'Cliente Especial'
  const economiaFinal =
    economiaMensal !== undefined && economiaMensal !== null && economiaMensal > 0
      ? economiaMensal
      : 928.75

  // Formatação de data em pt-BR (fallback para data de hoje)
  let dataFormatada = '-'
  if (dataOrcamento) {
    dataFormatada = formatDate(dataOrcamento)
  }
  if (!dataFormatada || dataFormatada === '-') {
    const hoje = new Date()
    const dia = String(hoje.getDate()).padStart(2, '0')
    const mes = String(hoje.getMonth() + 1).padStart(2, '0')
    const ano = hoje.getFullYear()
    dataFormatada = `${dia}/${mes}/${ano}`
  }

  const consultorFinal = (consultor && consultor.trim()) || 'Consultoria Delfos Solar'

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071311] via-[#0b241c] to-[#04100d] text-white border border-emerald-900/60 shadow-xl ${className}`}
      aria-label="Capa da Proposta Comercial"
    >
      {/* ========================================================================= */}
      {/* DECORAÇÃO SOLAR DE FUNDO (Painéis solares estilizados, glows e raios)     */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        {/* Glows esmeralda e dourado nas pontas */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />

        {/* Padrão SVG de malha geométrica / células fotovoltaicas */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="capa-solar-grid"
              width="60"
              height="40"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(12)"
            >
              <rect
                x="2"
                y="2"
                width="56"
                height="36"
                rx="3"
                fill="none"
                stroke="#34D399"
                strokeWidth="0.8"
                strokeOpacity="0.4"
              />
              <line
                x1="2"
                y1="14"
                x2="58"
                y2="14"
                stroke="#34D399"
                strokeWidth="0.4"
                strokeOpacity="0.25"
              />
              <line
                x1="2"
                y1="26"
                x2="58"
                y2="26"
                stroke="#34D399"
                strokeWidth="0.4"
                strokeOpacity="0.25"
              />
              <line
                x1="30"
                y1="2"
                x2="30"
                y2="38"
                stroke="#34D399"
                strokeWidth="0.4"
                strokeOpacity="0.25"
              />
            </pattern>
            <linearGradient id="capa-mask-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#capa-solar-grid)" />
        </svg>

        {/* Feixe diagonal sutil de luz solar */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-400/5 to-amber-300/10"
          style={{ mixBlendMode: 'screen' }}
        />
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO PRINCIPAL DA CAPA                                                */}
      {/* ========================================================================= */}
      <div className="relative z-10 p-6 sm:p-9 md:p-12 flex flex-col justify-between min-h-[380px] sm:min-h-[420px]">
        {/* Topo: Tag de Boas-vindas à esquerda + Logo Delfos Solar à direita */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span className="uppercase tracking-widest text-[11px] font-bold">
              Proposta Comercial Exclusiva
            </span>
            {potenciaKwp && potenciaKwp > 0 && (
              <span className="ml-1 pl-2 border-l border-emerald-500/40 text-emerald-200 font-bold">
                {potenciaKwp.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kWp
              </span>
            )}
          </div>

          {/* Logo Delfos Solar no Topo Direito em card sutil para contraste elegante */}
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-white/40 flex items-center shrink-0">
            <DelfosLogo height={36} width={130} variant="svg" />
          </div>
        </div>

        {/* Miolo: Nome do Cliente + Frase Principal em Verde Solar + Subtítulo */}
        <div className="my-8 sm:my-10 space-y-4 max-w-4xl">
          {/* Label e Nome do Cliente */}
          <div className="space-y-1">
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-emerald-400/90 flex items-center gap-2">
              <span className="w-6 h-[2px] bg-emerald-400 inline-block rounded-full" />
              Proposta preparada para
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15] drop-shadow-sm">
              {clienteFinal}
            </h1>
          </div>

          {/* Frase Principal em Verde e Negrito */}
          <div className="pt-2">
            <p className="text-xl sm:text-2xl md:text-3xl lg:text-[2rem] font-extrabold text-[#22c55e] leading-snug drop-shadow-xs">
              Economize {formatCurrency(economiaFinal)} por mês com sua própria usina solar
            </p>
          </div>

          {/* Subtítulo Solicitado */}
          <p className="text-sm sm:text-base md:text-lg text-emerald-100/85 font-medium leading-relaxed max-w-2xl">
            Independência energética projetada exclusivamente para você
          </p>
        </div>

        {/* Rodapé da Capa: Data da Proposta e Nome do Consultor */}
        <div className="pt-5 border-t border-emerald-900/80 flex items-center justify-between flex-wrap gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-6 flex-wrap">
            {/* Consultor */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400/80 block leading-none">
                  Consultor Responsável
                </span>
                <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block">
                  {consultorFinal}
                </span>
              </div>
            </div>

            {/* Data da Proposta */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-400/80 block leading-none">
                  Data da Proposta
                </span>
                <span className="text-xs sm:text-sm font-bold text-white mt-0.5 block">
                  {dataFormatada}
                </span>
              </div>
            </div>
          </div>

          {/* Selo Delfos de Engenharia */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-emerald-200 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Engenharia Própria Delfos</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SecaoCapaProposta

import React from 'react'
import { logoOficialPng } from '@/components/DelfosLogo'

export interface SecaoCapaPropostaProps {
  /** Nome do cliente em destaque (ex: Dr. Roberto Silva Albuquerque) */
  nomeCliente?: string | null
  /** Tipo de imóvel / cliente (ex: "Residência", "Comércio", "Indústria", "Rural") */
  tipoImovel?: string | null
  /** Cidade e UF (ex: "Passo Fundo - RS") */
  cidade?: string | null
  /** Nome do consultor / autor do orçamento (ex: João Victor Bagetti Fuchs) */
  consultor?: string | null
  /** Telefone do consultor (padrão: (54) 99129-2121) */
  telefoneConsultor?: string | null
  /** Site oficial (padrão: www.delfos.eng.br) */
  site?: string | null
  /** E-mail oficial (padrão: contato@delfos.eng.br) */
  email?: string | null
  /** Economia mensal estimada em R$/mês (mantido para retrocompatibilidade) */
  economiaMensal?: number | null
  /** Data da proposta */
  dataOrcamento?: string | null
  /** Potência do sistema em kWp (mantido para retrocompatibilidade de props) */
  potenciaKwp?: number | null
  className?: string
}

/**
 * Seção 1 — Capa Oficial da Proposta Técnico-Comercial Delfos Solar.
 *
 * Reproduz fielmente a arte solicitada pelo cliente:
 * - Fundo claro com suave degradê esverdeado (#F3F9F4 -> #E8F5EB -> #FFFFFF)
 * - Ilustração à direita com o sol amarelo/laranja radiante e ondas verdes orgânicas e suaves
 * - Logo oficial da Delfos Solar centralizado no topo (com faixa de contatos removida/ocultada via crop seguro)
 * - Badge arredondado amarelo (#F3BE56 / #F9C349) com "PROPOSTA TÉCNICO-COMERCIAL" em verde bem escuro e espaçado
 * - Título imponente em verde escuro (#0D382B): "Energia que\ngera retorno"
 * - Subtítulo: "Sistema fotovoltaico projetado exclusivamente para você" em cinza escuro (#52605B)
 * - Bloco alinhado à esquerda com filete vertical amarelo ouro (#E9A224):
 *   - "PREPARADA PARA:" em cinza escuro caixa-alta
 *   - Nome do cliente em verde escuro grande e em negrito (#0D382B)
 *   - Sublinha dinâmica: "Residência • Passo Fundo - RS" (ou tipoImovel • cidade)
 * - Linha do consultor com ícone sutil de pessoa: "Consultor: [Nome do Autor] • (54) 99129-2121"
 * - Rodapé centralizado discreto: "www.delfos.eng.br • contato@delfos.eng.br"
 */
export const SecaoCapaProposta: React.FC<SecaoCapaPropostaProps> = ({
  nomeCliente,
  tipoImovel,
  cidade,
  consultor,
  telefoneConsultor,
  site = 'www.delfos.eng.br',
  email = 'contato@delfos.eng.br',
  className = '',
}) => {
  const clienteFinal = (nomeCliente && nomeCliente.trim()) || 'Cliente Especial'
  const tipoImovelFinal = (tipoImovel && tipoImovel.trim()) || 'Residência'
  const cidadeFinal = (cidade && cidade.trim()) || 'Passo Fundo - RS'
  const consultorFinal = (consultor && consultor.trim()) || 'João Victor Bagetti Fuchs'
  const telefoneFinal = (telefoneConsultor && telefoneConsultor.trim()) || '(54) 99129-2121'

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-[#F6FBF7] text-[#0D382B] border border-emerald-100 shadow-xl select-none ${className}`}
      aria-label="Capa da Proposta Técnico-Comercial"
      style={{
        background: 'linear-gradient(155deg, #F9FCFA 0%, #EFF8F2 45%, #E3F3E8 100%)',
      }}
    >
      {/* ========================================================================= */}
      {/* ILUSTRAÇÃO SOLAR E ONDAS VERDES À DIREITA (SVG Vetorial Fiel ao Modelo)   */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <svg
          viewBox="0 0 800 1150"
          preserveAspectRatio="xMaxYMid slice"
          className="absolute right-0 top-0 w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradiente do Sol Núcleo */}
            <radialGradient id="capa-sol-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#F98A28" />
              <stop offset="45%" stopColor="#FCA429" />
              <stop offset="85%" stopColor="#FDBF37" />
              <stop offset="100%" stopColor="#FECD48" />
            </radialGradient>

            {/* Gradiente Anéis Externos do Sol */}
            <radialGradient id="capa-sol-ring1" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FECD48" stopOpacity="0.85" />
              <stop offset="70%" stopColor="#FED867" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FFEAA0" stopOpacity="0.6" />
            </radialGradient>

            <radialGradient id="capa-sol-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE79A" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#FFF2C6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FFF9E6" stopOpacity="0" />
            </radialGradient>

            {/* Gradientes das Ondas Verdes Suaves */}
            <linearGradient id="capa-wave-green-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#BFE3CE" stopOpacity="0.65" />
              <stop offset="50%" stopColor="#A8DABF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8FCFAA" stopOpacity="0.25" />
            </linearGradient>

            <linearGradient id="capa-wave-green-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4ECD9" stopOpacity="0.75" />
              <stop offset="60%" stopColor="#C2E6CC" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#AEE0BD" stopOpacity="0.3" />
            </linearGradient>

            <linearGradient id="capa-wave-green-3" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EAF7ED" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#D8F0DE" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#C4E9CE" stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Halo Solar Amplo */}
          <circle cx="750" cy="460" r="260" fill="url(#capa-sol-glow)" />

          {/* Raios do Sol em Laranja/Amarelo */}
          <g stroke="#F8A738" strokeWidth="6" strokeLinecap="round" opacity="0.9">
            {/* Raio superior */}
            <line x1="710" y1="285" x2="715" y2="330" />
            {/* Raio noroeste */}
            <line x1="595" y1="340" x2="635" y2="368" />
            {/* Raio oeste horizontal */}
            <line x1="545" y1="460" x2="598" y2="460" />
            {/* Raio sudoeste */}
            <line x1="585" y1="550" x2="628" y2="522" />
            {/* Raio sul-sudoeste */}
            <line x1="720" y1="625" x2="724" y2="585" />
          </g>

          {/* Anel Externo Translúcido do Sol */}
          <circle cx="750" cy="460" r="160" fill="url(#capa-sol-ring1)" />

          {/* Anel Médio do Sol */}
          <circle cx="750" cy="460" r="120" fill="#FED867" opacity="0.9" />

          {/* Núcleo Dourado/Laranja Vibrante do Sol */}
          <circle cx="750" cy="460" r="82" fill="url(#capa-sol-core)" />

          {/* Onda Verde Suave Superior (atrás do sol) */}
          <path
            d="M 380 720 C 500 620, 640 540, 800 510 L 800 800 L 380 800 Z"
            fill="url(#capa-wave-green-1)"
          />

          {/* Onda Verde Suave Intermediária */}
          <path
            d="M 320 800 C 460 670, 620 570, 800 550 L 800 1150 L 320 1150 Z"
            fill="url(#capa-wave-green-2)"
          />

          {/* Onda Verde Suave Principal (em primeiro plano da ilustração) */}
          <path
            d="M 280 880 C 440 730, 620 620, 800 590 L 800 1150 L 280 1150 Z"
            fill="url(#capa-wave-green-3)"
          />
        </svg>
      </div>

      {/* ========================================================================= */}
      {/* CONTEÚDO PRINCIPAL DA CAPA (Estrutura Fiel ao Modelo)                     */}
      {/* ========================================================================= */}
      <div className="relative z-10 p-7 sm:p-10 md:p-14 flex flex-col justify-between min-h-[580px] sm:min-h-[640px] max-w-4xl mx-auto">
        {/* Topo Centralizado: Logo Oficial Delfos Solar (sem contatos) + Badge */}
        <div className="flex flex-col items-center text-center">
          {/* Logo da Delfos Solar com crop seguro dos contatos inferiores */}
          <div className="relative overflow-hidden flex items-center justify-center w-[230px] sm:w-[260px] h-[95px] sm:h-[110px]">
            <img
              src={logoOficialPng}
              alt="Delfos Solar"
              className="w-full h-auto object-cover select-none pointer-events-none"
              style={{
                objectPosition: 'center 15%',
                transform: 'scale(1.02)',
              }}
            />
          </div>

          {/* Badge Amarelo Arredondado */}
          <div className="mt-4 sm:mt-5 inline-flex items-center px-6 sm:px-8 py-2 rounded-full bg-[#F3BE56] shadow-sm">
            <span
              className="text-[#0D382B] text-xs sm:text-sm font-extrabold uppercase tracking-[0.2em]"
              style={{ fontFamily: 'Arial, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              PROPOSTA TÉCNICO-COMERCIAL
            </span>
          </div>
        </div>

        {/* Miolo: Título Grande + Subtítulo + Bloco Preparada Para + Consultor */}
        <div className="my-8 sm:my-10 space-y-6 sm:space-y-7 max-w-2xl">
          {/* Título Grande quebrado em duas linhas */}
          <div>
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-black text-[#0D382B] tracking-tight leading-[1.08]"
              style={{ fontFamily: 'Arial, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              Energia que
              <br />
              gera retorno
            </h1>
            <p className="mt-3 sm:mt-4 text-base sm:text-lg md:text-xl text-[#4A5D54] font-medium leading-relaxed">
              Sistema fotovoltaico projetado exclusivamente para você
            </p>
          </div>

          {/* Bloco Alinhado à Esquerda com Filete Vertical Amarelo */}
          <div className="pl-4 sm:pl-5 border-l-4 border-[#E9A224] py-1 space-y-1">
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#6E7E76]">
              PREPARADA PARA:
            </div>
            <div
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#0D382B] tracking-tight leading-snug"
              style={{ fontFamily: 'Arial, -apple-system, BlinkMacSystemFont, sans-serif' }}
            >
              {clienteFinal}
            </div>
            <div className="text-sm sm:text-base text-[#6E7E76] font-medium">
              {tipoImovelFinal} • {cidadeFinal}
            </div>
          </div>

          {/* Linha com Ícone de Pessoa e Dados do Consultor */}
          <div className="pt-2 flex items-center gap-2.5 text-xs sm:text-sm md:text-base text-[#4A5D54] font-medium">
            <svg
              className="w-5 h-5 text-[#5D7066] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>
              Consultor: <strong className="text-[#0D382B] font-bold">{consultorFinal}</strong> •{' '}
              {telefoneFinal}
            </span>
          </div>
        </div>

        {/* Rodapé Centralizado da Capa (Discreto e Elegante) */}
        <div className="pt-6 border-t border-[#DDECE2] text-center text-xs sm:text-sm text-[#7D8F85] font-medium tracking-wide">
          <span>{site}</span>
          <span className="mx-2 text-[#9FB3A7]">•</span>
          <span>{email}</span>
        </div>
      </div>
    </section>
  )
}

export default SecaoCapaProposta

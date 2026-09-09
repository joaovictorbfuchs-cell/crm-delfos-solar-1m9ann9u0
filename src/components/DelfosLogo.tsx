import React from 'react'
import logoPng from '@/assets/delfos-solar-a46ea.png'

interface DelfosLogoProps {
  className?: string
  /**
   * Largura ou estilo personalizado.
   * Por padrão viewBox é 480 280 (aspect ratio ~ 1.71).
   */
  height?: number | string
  width?: number | string
  /**
   * Se true, renderiza a imagem PNG original salva dos assets se preferir bitmap,
   * mas por padrão renderizamos o SVG vetorial nítido e responsivo.
   */
  variant?: 'svg' | 'image'
}

/**
 * Componente do Logo Oficial da Delfos Solar
 *
 * Swoosh elíptico dinâmico em gradiente:
 * - Arco superior: começa em azul (#1B5FAA) na esquerda/ponta inferior, sobe em verde (#4C9F38) no topo e transiciona para amarelo ouro (#F2C500) na ponta direita
 * - Arco inferior: começa em amarelo ouro (#F2C500) na ponta esquerda inferior, passa por verde (#4C9F38 / teal #1B7B8C) e fecha em azul (#1B5FAA) na direita
 *
 * Ao centro:
 * - "delfos" em minúsculas, tipografia bold sans arredondada / moderna (#1B5FAA)
 * - "solar" em minúsculas/espaçadas, traço limpo (#1B5FAA)
 */
export const DelfosLogo: React.FC<DelfosLogoProps> = ({
  className = '',
  height = 42,
  width,
  variant = 'svg',
}) => {
  if (variant === 'image') {
    return (
      <img
        src={logoPng}
        alt="Delfos Solar"
        className={`object-contain select-none ${className}`}
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto',
        }}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 520 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        width: width ? (typeof width === 'number' ? `${width}px` : width) : 'auto',
      }}
      aria-label="Delfos Solar Logo"
      role="img"
    >
      <defs>
        {/* Gradiente do Swoosh Superior:
            Ponta esquerda em azul (#185A9D), arco central em verde (#4C9F38 / #5DB63F),
            transicionando para verde-dourado e ponta direita em amarelo vibrante (#F5C400) */}
        <linearGradient id="delfos-swoosh-top" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1B5FAA" />
          <stop offset="18%" stopColor="#1E7A96" />
          <stop offset="42%" stopColor="#439E3B" />
          <stop offset="68%" stopColor="#81B939" />
          <stop offset="88%" stopColor="#DCBE09" />
          <stop offset="100%" stopColor="#F5C400" />
        </linearGradient>

        {/* Gradiente do Swoosh Inferior:
            Ponta esquerda em amarelo (#F5C400), passando por verde dourado (#92BF33),
            verde (#439E3B), verde azulado / teal (#1D7A8F) e finalizando em azul (#1B5FAA) */}
        <linearGradient id="delfos-swoosh-bottom" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F5C400" />
          <stop offset="15%" stopColor="#DCBE09" />
          <stop offset="35%" stopColor="#81B939" />
          <stop offset="60%" stopColor="#3E9B40" />
          <stop offset="82%" stopColor="#1E7A96" />
          <stop offset="100%" stopColor="#1B5FAA" />
        </linearGradient>
      </defs>

      {/* Swoosh Superior */}
      {/*
        Forma de pincelada curva em arco que envolve a parte de cima:
        começa numa ponta afunilada à esquerda em torno de (6, 95),
        engrossa até o topo central (260, 20) com espessura até (260, 48),
        e se estreita na ponta direita arredondada/afilada em torno de (514, 88).
      */}
      <path
        d="M 12 96 C 35 62, 105 18, 260 18 C 390 18, 480 55, 514 88 C 470 54, 385 36, 260 36 C 135 36, 52 68, 12 96 Z"
        fill="url(#delfos-swoosh-top)"
      />
      {/* Camada interna para dar o corpo e volume mais grosso do swoosh idêntico à imagem */}
      <path
        d="M 10 96 C 45 48, 130 14, 260 14 C 400 14, 485 52, 514 88 C 450 44, 360 28, 260 28 C 145 28, 55 58, 10 96 Z"
        fill="url(#delfos-swoosh-top)"
        opacity="0.95"
      />

      {/* Swoosh Inferior */}
      {/*
        Forma de pincelada curva invertida que envolve a parte de baixo:
        começa na ponta esquerda afilada em torno de (6, 184),
        engrossa no ventre inferior central (260, 266) com topo em (260, 240),
        e termina na ponta direita em (514, 192).
      */}
      <path
        d="M 10 184 C 55 222, 145 252, 260 252 C 360 252, 450 236, 514 192 C 485 228, 400 266, 260 266 C 130 266, 45 232, 10 184 Z"
        fill="url(#delfos-swoosh-bottom)"
        opacity="0.95"
      />
      <path
        d="M 12 184 C 52 212, 135 244, 260 244 C 385 244, 470 226, 514 192 C 480 225, 390 262, 260 262 C 105 262, 35 218, 12 184 Z"
        fill="url(#delfos-swoosh-bottom)"
      />

      {/* Texto Central: "delfos" */}
      <g fill="#175EA8">
        <text
          x="260"
          y="162"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontSize="92"
          fontWeight="800"
          letterSpacing="0.22em"
        >
          delfos
        </text>

        {/* Texto Inferior: "solar" */}
        <text
          x="264"
          y="200"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontSize="24"
          fontWeight="700"
          letterSpacing="0.68em"
        >
          solar
        </text>
      </g>
    </svg>
  )
}

export default DelfosLogo

import React from 'react'
import logoPng from '@/assets/delfos-solar-09ea2.png'

export { logoPng as delfosLogoAsset }

export interface DelfosLogoProps {
  className?: string
  /**
   * Largura ou altura personalizada.
   */
  height?: number | string
  width?: number | string
  /**
   * 'image' usa o asset PNG oficial de alta fidelidade salvo pelo usuário.
   * 'svg' usa a versão vetorial cristalina com os gradientes precisos da marca.
   * Padrão: 'svg' para nitidez vetorial máxima e carregamento instantâneo.
   */
  variant?: 'svg' | 'image'
  /**
   * Se true, renderiza versão compactada ideal para sidebar recolhida.
   */
  collapsed?: boolean
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
  collapsed = false,
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
            Azul profundo (#0B5AA8) -> Teal (#1A8E9A) -> Verde folha (#3EAF3F) -> Verde-dourado (#9CC52E) -> Amarelo solar (#FCD200) */}
        <linearGradient id="delfos-grad-top" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0B5AA8" />
          <stop offset="18%" stopColor="#12789E" />
          <stop offset="42%" stopColor="#2E9E43" />
          <stop offset="68%" stopColor="#7EBE32" />
          <stop offset="88%" stopColor="#DECA09" />
          <stop offset="100%" stopColor="#FCD200" />
        </linearGradient>

        {/* Gradiente do Swoosh Inferior:
            Amarelo solar (#FCD200) -> Dourado (#DECA09) -> Verde (#3EAF3F) -> Teal (#12789E) -> Azul (#0B5AA8) */}
        <linearGradient id="delfos-grad-bottom" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD200" />
          <stop offset="14%" stopColor="#DECA09" />
          <stop offset="36%" stopColor="#7EBE32" />
          <stop offset="62%" stopColor="#2E9E43" />
          <stop offset="84%" stopColor="#12789E" />
          <stop offset="100%" stopColor="#0B5AA8" />
        </linearGradient>
      </defs>

      {/* Swoosh Superior */}
      <path
        d="M 10 96 C 45 42, 135 12, 260 12 C 390 12, 475 46, 514 88 C 450 42, 360 26, 260 26 C 145 26, 55 56, 10 96 Z"
        fill="url(#delfos-grad-top)"
      />
      <path
        d="M 12 96 C 40 48, 130 16, 260 16 C 395 16, 480 50, 514 88 C 455 42, 365 28, 260 28 C 145 28, 55 58, 12 96 Z"
        fill="url(#delfos-grad-top)"
        opacity="0.95"
      />

      {/* Swoosh Inferior */}
      <path
        d="M 10 184 C 55 226, 145 258, 260 258 C 375 258, 465 228, 514 192 C 480 228, 395 268, 260 268 C 130 268, 45 232, 10 184 Z"
        fill="url(#delfos-grad-bottom)"
      />
      <path
        d="M 12 184 C 52 214, 135 246, 260 246 C 385 246, 470 224, 514 192 C 480 226, 390 264, 260 264 C 105 264, 35 218, 12 184 Z"
        fill="url(#delfos-grad-bottom)"
        opacity="0.95"
      />

      {/* Texto Central: "delfos" */}
      {!collapsed && (
        <g fill="#0A539E">
          <text
            x="260"
            y="160"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
            fontSize="94"
            fontWeight="900"
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
            fontSize="25"
            fontWeight="800"
            letterSpacing="0.68em"
          >
            solar
          </text>
        </g>
      )}

      {/* Versão compactada para sidebar recolhida: Letra 'd' emblemática no centro */}
      {collapsed && (
        <g fill="#0A539E">
          <text
            x="260"
            y="178"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
            fontSize="120"
            fontWeight="900"
          >
            d
          </text>
        </g>
      )}
    </svg>
  )
}

export default DelfosLogo

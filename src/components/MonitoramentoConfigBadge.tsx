import React from 'react'
import { FileText, ExternalLink, Settings, Video } from 'lucide-react'
import type { ConfiguracaoMonitoramento } from '@/types/equipamentos'
import { getProcedimentoMonitoramentoUrl } from '@/services/configuracoesMonitoramentoService'

interface MonitoramentoConfigBadgeProps {
  configuracao?: ConfiguracaoMonitoramento | null
  className?: string
  /**
   * Texto alternativo curto ou detalhado
   */
  rotulo?: string
  /**
   * Mostrar detalhes como a marca ou tipo de procedimento
   */
  mostrarTipo?: boolean
}

/**
 * Badge visual de "Configuração de Monitoramento" anexada ao inversor,
 * no MESMO FORMATO em que o download do datasheet fica anexado ao equipamento.
 *
 * - Se for PDF: abre/baixa o PDF oficial com o passo a passo.
 * - Se for LINK: abre o link em nova aba (target _blank) com rel="noopener noreferrer".
 */
export const MonitoramentoConfigBadge: React.FC<MonitoramentoConfigBadgeProps> = ({
  configuracao,
  className = '',
  rotulo = 'Configuração de monitoramento',
  mostrarTipo = false,
}) => {
  if (!configuracao) return null

  const { url, tipo } = getProcedimentoMonitoramentoUrl(configuracao)
  if (!url) return null

  const isPdf = tipo === 'pdf'
  const isVideoOrLink = tipo === 'link'

  const tituloTooltip = isPdf
    ? `Abrir PDF com passo a passo de configuração do datalogger (${configuracao.marca})`
    : `Acessar link/vídeo de instrução de configuração do datalogger (${configuracao.marca}): ${url}`

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-200 transition-colors shrink-0 shadow-2xs ${className}`}
      title={tituloTooltip}
    >
      {isPdf ? (
        <FileText className="w-3 h-3 text-emerald-600 shrink-0" />
      ) : (
        <ExternalLink className="w-3 h-3 text-emerald-600 shrink-0" />
      )}
      <span>{rotulo}</span>
      {mostrarTipo && (
        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100/60 px-1 py-0.2 rounded ml-0.5">
          {isPdf ? 'PDF' : 'Link'}
        </span>
      )}
      <ExternalLink className="w-2.5 h-2.5 text-emerald-600 ml-0.5 shrink-0" />
    </a>
  )
}

export default MonitoramentoConfigBadge

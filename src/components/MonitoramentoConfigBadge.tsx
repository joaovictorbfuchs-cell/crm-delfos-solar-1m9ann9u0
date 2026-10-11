import React from 'react'
import { FileText, ExternalLink } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export interface ConfiguracaoMonitoramentoLike {
  id?: string
  fabricante?: string
  marca?: string
  titulo?: string
  tipo_procedimento?: 'pdf' | 'link' | 'ambos' | string
  arquivo_pdf?: string
  link_procedimento?: string
  link_externo?: string
  collectionId?: string
  collectionName?: string
  [key: string]: any
}

export interface MonitoramentoConfigBadgeProps {
  configuracao?: ConfiguracaoMonitoramentoLike | null
  apenasIcone?: boolean
  iconeApenas?: boolean
  mostrarTipo?: boolean
  tamanho?: 'sm' | 'md' | 'lg'
  className?: string
  rotulo?: string
}

export function getUrlConfiguracaoMonitoramentoPdf(
  cfg: ConfiguracaoMonitoramentoLike,
): string | null {
  if (!cfg || !cfg.arquivo_pdf) return null
  if (cfg.arquivo_pdf.startsWith('http://') || cfg.arquivo_pdf.startsWith('https://')) {
    return cfg.arquivo_pdf
  }
  try {
    return pb.files.getURL(cfg as any, cfg.arquivo_pdf)
  } catch {
    const baseUrl = import.meta.env.VITE_POCKETBASE_URL || ''
    const col = cfg.collectionName || cfg.collectionId || 'configuracoes_monitoramento'
    return `${baseUrl}/api/files/${col}/${cfg.id}/${cfg.arquivo_pdf}`
  }
}

export const MonitoramentoConfigBadge: React.FC<MonitoramentoConfigBadgeProps> = ({
  configuracao,
  apenasIcone = false,
  iconeApenas = false,
  mostrarTipo: _mostrarTipo = false,
  tamanho = 'md',
  className = '',
  rotulo = 'Monitoramento',
}) => {
  if (!configuracao) return null

  const somenteIcone = Boolean(apenasIcone || iconeApenas)

  const rawLink =
    (typeof configuracao.link_procedimento === 'string' && configuracao.link_procedimento.trim()) ||
    (typeof configuracao.link_externo === 'string' && configuracao.link_externo.trim()) ||
    (typeof configuracao.link === 'string' && configuracao.link.trim()) ||
    ''

  const temPdf = Boolean(configuracao.arquivo_pdf && String(configuracao.arquivo_pdf).trim())
  const temLink = Boolean(rawLink)

  if (!temPdf && !temLink) return null

  const pdfUrl = getUrlConfiguracaoMonitoramentoPdf(configuracao)
  const linkUrl = rawLink

  const sizeClasses =
    tamanho === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : tamanho === 'lg'
        ? 'px-3 py-1.5 text-xs font-semibold'
        : 'px-2.5 py-1 text-[11px] font-medium'

  const iconSize = tamanho === 'sm' ? 'w-3 h-3' : tamanho === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5'

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {temPdf && pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 font-bold rounded-lg border bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 transition-colors shadow-2xs ${sizeClasses}`}
          title={`Procedimento PDF - ${configuracao.titulo || configuracao.fabricante || configuracao.marca || 'Monitoramento'}`}
        >
          <FileText className={`${iconSize} text-emerald-700 shrink-0`} />
          {!somenteIcone && (
            <span>
              {temLink ? `${rotulo || 'Monitoramento'} (PDF)` : rotulo || 'Monitoramento'}
            </span>
          )}
          <ExternalLink className="w-2.5 h-2.5 text-emerald-600 ml-0.5 shrink-0" />
        </a>
      )}

      {temLink && linkUrl && (
        <a
          href={linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 font-bold rounded-lg border bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-300 transition-colors shadow-2xs ${sizeClasses}`}
          title={`Vídeo / Procedimento Online - ${configuracao.titulo || configuracao.fabricante || configuracao.marca || 'Monitoramento'}`}
        >
          <ExternalLink className={`${iconSize} text-blue-700 shrink-0`} />
          {!somenteIcone && (
            <span>
              {temPdf ? `${rotulo || 'Monitoramento'} (Vídeo)` : rotulo || 'Monitoramento'}
            </span>
          )}
          <ExternalLink className="w-2.5 h-2.5 text-blue-600 ml-0.5 shrink-0" />
        </a>
      )}
    </div>
  )
}

export default MonitoramentoConfigBadge

/**
 * Componentes visuais compartilhados do relatório de fatura —
 * tipografia e spacing padronizados (item 6 do redesign).
 */
import React from 'react'
import { cn } from '@/lib/utils'

/** Card de seção: padrão único (rounded-2xl, padding 6, borda cinza 200, sombra 2xs). */
export const CardSecao: React.FC<{
  title?: React.ReactNode
  icon?: React.ReactNode
  right?: React.ReactNode
  className?: string
  bodyClassName?: string
  children?: React.ReactNode
}> = ({ title, icon, right, className, bodyClassName, children }) => (
  <section
    className={cn('bg-white rounded-2xl border border-gray-200 shadow-2xs p-5 sm:p-6', className)}
  >
    {(title || right) && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </h3>
        {right}
      </div>
    )}
    <div className={cn(bodyClassName)}>{children}</div>
  </section>
)

/** Rótulo de campo em cinza padronizado (text-[11px] uppercase). */
export const LabelCampo: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'text-[11px] font-semibold text-gray-500 uppercase tracking-wider block',
      className,
    )}
  >
    {children}
  </span>
)

/** Valor monetário padronizado (mono, 2 decimais, pt-BR). */
export const formatarMoeda = (v: number): string =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Badge padronizado (text-[10px], pill, borda colorida). */
export const BadgeSecao: React.FC<{
  children: React.ReactNode
  tone?: 'emerald' | 'amber' | 'sky' | 'slate' | 'gray'
  className?: string
}> = ({ children, tone = 'slate', className }) => {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    sky: 'bg-sky-50 text-sky-800 border-sky-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle2, FileSpreadsheet, Wrench, ArrowRight } from 'lucide-react'
import type { Cliente } from '@/types/crm'

interface ModalMarcarGanhoProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (area: 'projetos' | 'om') => Promise<void>
}

export const ModalMarcarGanho: React.FC<ModalMarcarGanhoProps> = ({
  cliente,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [areaSelecionada, setAreaSelecionada] = useState<'projetos' | 'om' | null>('projetos')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!cliente) return null

  const handleConfirm = async () => {
    if (!areaSelecionada || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onConfirm(areaSelecionada)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Negócio Ganho • Fechamento Comercial
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Para qual área enviar este cliente?
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Cliente: <strong className="text-gray-800">{cliente.nome}</strong>. Selecione o destino
            deste negócio para prosseguir com a esteira operacional.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-3">
          {/* Opção 1: Projetos / Levantamento de Informações */}
          <button
            type="button"
            onClick={() => setAreaSelecionada('projetos')}
            className={`flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all ${
              areaSelecionada === 'projetos'
                ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                areaSelecionada === 'projetos'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-gray-900">
                  Levantamento de Informações
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  Área de Projetos
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Para negócios de energia solar fotovoltaica. Cria/organiza o projeto diretamente na
                etapa &ldquo;Levantamento de Informações&rdquo; para engenharia e homologação.
              </p>
            </div>
          </button>

          {/* Opção 2: O&M / Clientes com Plano de Manutenção */}
          <button
            type="button"
            onClick={() => setAreaSelecionada('om')}
            className={`flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all ${
              areaSelecionada === 'om'
                ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-1 ring-emerald-600'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
            }`}
          >
            <div
              className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                areaSelecionada === 'om'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              <Wrench className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm text-gray-900">
                  Clientes com Plano de Manutenção
                </span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                  Área de O&M
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Para negócios de plano de manutenção e operação (O&M). Disponibiliza o cliente para
                elaboração e gestão de contratos de monitoramento e preventivas.
              </p>
            </div>
          </button>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!areaSelecionada || isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              'Confirmando...'
            ) : (
              <>
                Confirmar Ganho <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

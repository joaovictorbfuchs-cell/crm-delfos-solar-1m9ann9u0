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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { XCircle, AlertCircle, DollarSign, Building2, UserX, HelpCircle } from 'lucide-react'
import type { Cliente } from '@/types/crm'

interface ModalMarcarPerdidoProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    motivo: 'preco' | 'concorrente' | 'desistiu' | 'outro',
    observacao?: string,
  ) => Promise<void>
}

const MOTIVOS_OPCOES = [
  {
    id: 'preco' as const,
    label: 'Preço',
    descricao: 'Valor acima do orçamento do cliente ou achou caro.',
    icon: DollarSign,
    iconColor: 'text-amber-600',
    bgActive: 'bg-amber-50/70 border-amber-500 ring-1 ring-amber-500',
  },
  {
    id: 'concorrente' as const,
    label: 'Concorrente',
    descricao: 'Fechou com outra empresa instaladora/integradora.',
    icon: Building2,
    iconColor: 'text-blue-600',
    bgActive: 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500',
  },
  {
    id: 'desistiu' as const,
    label: 'Desistiu',
    descricao: 'Desistiu do projeto fotovoltaico ou adiou indefinidamente.',
    icon: UserX,
    iconColor: 'text-purple-600',
    bgActive: 'bg-purple-50/70 border-purple-500 ring-1 ring-purple-500',
  },
  {
    id: 'outro' as const,
    label: 'Outro',
    descricao: 'Outro motivo específico (detalhar no campo abaixo).',
    icon: HelpCircle,
    iconColor: 'text-gray-600',
    bgActive: 'bg-rose-50/70 border-rose-500 ring-1 ring-rose-500',
  },
]

export const ModalMarcarPerdido: React.FC<ModalMarcarPerdidoProps> = ({
  cliente,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [motivo, setMotivo] = useState<'preco' | 'concorrente' | 'desistiu' | 'outro' | null>(null)
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!cliente) return null

  const handleConfirm = async () => {
    if (!motivo) {
      setErro('Selecione o motivo da perda do negócio.')
      return
    }
    if (motivo === 'outro' && !observacao.trim()) {
      setErro('Ao selecionar a opção "Outro", é obrigatório descrever o motivo.')
      return
    }

    setErro(null)
    setIsSubmitting(true)
    try {
      await onConfirm(motivo, observacao.trim() || undefined)
      onOpenChange(false)
      // reset
      setMotivo(null)
      setObservacao('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setErro(null)
      setMotivo(null)
      setObservacao('')
      onOpenChange(false)
    }
  }

  const podeConfirmar =
    Boolean(motivo) && (motivo !== 'outro' || Boolean(observacao.trim())) && !isSubmitting

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleClose() : onOpenChange(val))}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <XCircle className="w-5 h-5 text-rose-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
              Registrar Perda de Oportunidade
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Marcar negócio como Perdido
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Cliente: <strong className="text-gray-800">{cliente.nome}</strong>. Selecione o motivo
            principal da perda para manter as métricas comerciais e o histórico de atividades
            atualizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {erro && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-gray-700 block mb-2">
              Motivo da perda <span className="text-rose-500">* (obrigatório)</span>
            </Label>
            <RadioGroup
              value={motivo || ''}
              onValueChange={(val) => {
                setMotivo(val as 'preco' | 'concorrente' | 'desistiu' | 'outro')
                setErro(null)
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-2"
            >
              {MOTIVOS_OPCOES.map((opt) => {
                const IconComponent = opt.icon
                const isSelected = motivo === opt.id
                return (
                  <label
                    key={opt.id}
                    htmlFor={`motivo-${opt.id}`}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? opt.bgActive
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <RadioGroupItem
                      value={opt.id}
                      id={`motivo-${opt.id}`}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <IconComponent className={`w-3.5 h-3.5 shrink-0 ${opt.iconColor}`} />
                        <span className="font-semibold text-xs text-gray-900">{opt.label}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                        {opt.descricao}
                      </p>
                    </div>
                  </label>
                )
              })}
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="observacao-perda" className="text-xs font-semibold text-gray-700">
                Observações / Detalhes
                {motivo === 'outro' && (
                  <span className="text-rose-500 ml-1 font-bold">* (obrigatório)</span>
                )}
              </Label>
              {motivo !== 'outro' && <span className="text-[10px] text-gray-400">Opcional</span>}
            </div>
            <Textarea
              id="observacao-perda"
              value={observacao}
              onChange={(e) => {
                setObservacao(e.target.value)
                if (erro) setErro(null)
              }}
              placeholder={
                motivo === 'outro'
                  ? 'Descreva obrigatoriamente qual foi o motivo da perda...'
                  : 'Descreva eventuais detalhes adicionais (ex: valor da proposta do concorrente, feedback do cliente)...'
              }
              rows={3}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!podeConfirmar}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isSubmitting ? 'Registrando...' : 'Confirmar Perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

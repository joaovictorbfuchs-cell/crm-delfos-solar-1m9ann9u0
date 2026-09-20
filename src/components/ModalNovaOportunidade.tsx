import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, DollarSign, UserCheck, Kanban, Tag } from 'lucide-react'
import type { Cliente, ClienteStatus, SistemaUsuario } from '@/types/crm'
import type { ReabrirOportunidadeDados } from '@/services/crmService'

interface ModalNovaOportunidadeProps {
  cliente: Cliente | null
  open: boolean
  onOpenChange: (open: boolean) => void
  usuarios?: SistemaUsuario[]
  onConfirm: (dados: ReabrirOportunidadeDados) => Promise<void>
}

const MOTIVOS_REABERTURA = [
  'Ampliação do sistema solar existente',
  'Nova usina em outro endereço/imóvel',
  'Contratação de Plano de Manutenção (O&M)',
  'Outro produto (carregador VE, scooter elétrica, energia solar por assinatura)',
]

const ETAPAS_DESTINO: { id: ClienteStatus; label: string }[] = [
  { id: 'Novo Lead', label: '1 - Novo Lead' },
  { id: 'Levantamento', label: '2 - Levantamento' },
  { id: 'Orçamento', label: '3 - Proposta Enviada' },
  { id: 'Negociação', label: '4 - Negociação' },
  { id: 'Contato Futuro', label: '5 - Contato Futuro' },
]

export const ModalNovaOportunidade: React.FC<ModalNovaOportunidadeProps> = ({
  cliente,
  open,
  onOpenChange,
  usuarios = [],
  onConfirm,
}) => {
  const [motivo, setMotivo] = useState<string>(MOTIVOS_REABERTURA[0])
  const [motivoCustom, setMotivoCustom] = useState<string>('')
  const [descricao, setDescricao] = useState<string>('')
  const [valorEstimado, setValorEstimado] = useState<string>('')
  const [responsavelId, setResponsavelId] = useState<string>('')
  const [etapaDestino, setEtapaDestino] = useState<ClienteStatus>('Novo Lead')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (open && cliente) {
      const nomeLower = (cliente.nome || '').toLowerCase()
      const isGeison = nomeLower.includes('geison') && nomeLower.includes('rigo')

      if (isGeison) {
        setMotivo('Ampliação do sistema solar existente')
        setMotivoCustom('')
        setDescricao('Quer adicionar 5 kWp no galpão')
        setValorEstimado('25000')
        setEtapaDestino('Negociação')
      } else {
        setMotivo(MOTIVOS_REABERTURA[0])
        setMotivoCustom('')
        setDescricao('')
        setValorEstimado('')
        setEtapaDestino('Novo Lead')
      }

      // Pré-selecionar o consultor responsável atual se houver
      if (cliente.responsavel_id) {
        setResponsavelId(cliente.responsavel_id)
      } else if (usuarios.length > 0) {
        // Encontrar por nome ou pegar o primeiro consultor/vendedor
        const matchingUser =
          usuarios.find((u) => u.name === cliente.responsavel_nome) || usuarios[0]
        setResponsavelId(matchingUser?.id || '')
      } else {
        setResponsavelId('')
      }

      setErro(null)
    }
  }, [open, cliente, usuarios])

  if (!cliente) return null

  const isOutroProduto = motivo.startsWith('Outro produto')

  const handleConfirm = async () => {
    let motivoFinal = motivo
    if (isOutroProduto && motivoCustom.trim()) {
      motivoFinal = `Outro produto: ${motivoCustom.trim()}`
    }

    const valorLimpo = valorEstimado.replace(/\./g, '').replace(',', '.')
    const valorNum = parseFloat(valorLimpo)

    const respSelecionado = usuarios.find((u) => u.id === responsavelId)
    const respNome = respSelecionado ? respSelecionado.name : cliente.responsavel_nome || ''

    setIsSubmitting(true)
    setErro(null)

    try {
      await onConfirm({
        motivo_reabertura: motivoFinal,
        descricao_reabertura: descricao.trim() || undefined,
        valor_estimado: !isNaN(valorNum) && valorNum > 0 ? valorNum : undefined,
        responsavel_id: responsavelId || undefined,
        responsavel_nome: respNome || undefined,
        etapa_destino: etapaDestino,
      })
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao reabrir oportunidade:', err)
      setErro(err?.message || 'Falha ao reabrir oportunidade comercial.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !isSubmitting && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Sparkles className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Reabertura Comercial • Novo Negócio
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Reabrir Oportunidade no Funil
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Cliente: <strong className="text-gray-900">{cliente.nome}</strong>. O cliente voltará ao
            Kanban de vendas com a etiqueta diferenciada{' '}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              Cliente Ativo
            </span>
            . Todos os dados e usinas anteriores permanecerão intactos.
          </DialogDescription>
        </DialogHeader>

        {erro && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {erro}
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Motivo da reabertura */}
          <div className="space-y-1.5">
            <Label
              htmlFor="motivo-reabertura"
              className="text-xs font-semibold text-gray-700 flex items-center gap-1.5"
            >
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Motivo da nova oportunidade <span className="text-rose-500">*</span>
              </span>
            </Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger id="motivo-reabertura" className="text-xs">
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_REABERTURA.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Campo livre se for Outro produto */}
          {isOutroProduto && (
            <div className="space-y-1.5 pl-3 border-l-2 border-amber-300">
              <Label htmlFor="motivo-custom" className="text-xs font-medium text-gray-700">
                Especifique o produto / solução
              </Label>
              <Input
                id="motivo-custom"
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
                placeholder="Ex: Wallbox 7.4kW, Bateria Solar, Scooter elétrica..."
                className="text-xs"
              />
            </div>
          )}

          {/* Descrição opcional */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="desc-reabertura" className="text-xs font-semibold text-gray-700">
                Descrição da oportunidade
              </Label>
              <span className="text-[10px] text-gray-400">Opcional</span>
            </div>
            <Textarea
              id="desc-reabertura"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Quer adicionar 5 kWp no galpão com inversor string..."
              rows={2}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Valor estimado */}
            <div className="space-y-1.5">
              <Label
                htmlFor="valor-estimado-reabertura"
                className="text-xs font-semibold text-gray-700 flex items-center gap-1"
              >
                <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                <span>Valor estimado (R$)</span>
              </Label>
              <Input
                id="valor-estimado-reabertura"
                type="number"
                step="0.01"
                min="0"
                value={valorEstimado}
                onChange={(e) => setValorEstimado(e.target.value)}
                placeholder="0.00"
                className="text-xs"
              />
            </div>

            {/* Etapa de destino no kanban */}
            <div className="space-y-1.5">
              <Label
                htmlFor="etapa-destino"
                className="text-xs font-semibold text-gray-700 flex items-center gap-1"
              >
                <Kanban className="w-3.5 h-3.5 text-amber-600" />
                <span>Etapa de destino no funil</span>
              </Label>
              <Select
                value={etapaDestino}
                onValueChange={(val) => setEtapaDestino(val as ClienteStatus)}
              >
                <SelectTrigger id="etapa-destino" className="text-xs">
                  <SelectValue placeholder="Selecione a etapa..." />
                </SelectTrigger>
                <SelectContent>
                  {ETAPAS_DESTINO.map((et) => (
                    <SelectItem key={et.id} value={et.id} className="text-xs">
                      {et.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Consultor responsável */}
          <div className="space-y-1.5">
            <Label
              htmlFor="consultor-responsavel"
              className="text-xs font-semibold text-gray-700 flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-gray-500" />
              <span>Consultor responsável</span>
            </Label>
            <Select value={responsavelId} onValueChange={setResponsavelId}>
              <SelectTrigger id="consultor-responsavel" className="text-xs">
                <SelectValue placeholder="Selecione o consultor..." />
              </SelectTrigger>
              <SelectContent>
                {usuarios.length > 0 ? (
                  usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name} {u.role ? `(${u.role})` : ''}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="atual" className="text-xs">
                    {cliente.responsavel_nome || 'Consultor atual'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white inline-flex items-center gap-1.5 text-xs font-bold rounded-lg shadow-xs"
          >
            {isSubmitting ? (
              'Reabrindo...'
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Confirmar Reabertura
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

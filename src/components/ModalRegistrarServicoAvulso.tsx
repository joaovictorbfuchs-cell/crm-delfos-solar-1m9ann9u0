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
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import type { Cliente, ServicoAvulsoTipo, ServicoAvulsoStatus } from '@/types/crm'
import {
  Wrench,
  Calendar,
  DollarSign,
  Upload,
  X,
  FileImage,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

export interface ModalRegistrarServicoAvulsoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente
  onSuccess?: () => void
}

const TIPOS_SERVICO: { value: ServicoAvulsoTipo; label: string; desc: string }[] = [
  {
    value: 'limpeza',
    label: 'Limpeza dos módulos',
    desc: 'Lavagem técnica dos painéis com água desmineralizada',
  },
  {
    value: 'troca_equipamento',
    label: 'Troca de equipamento',
    desc: 'Inversor, microinversor, módulo ou stringbox',
  },
  {
    value: 'visita_tecnica',
    label: 'Visita técnica',
    desc: 'Vistoria, diagnóstico de falha ou auditoria in loco',
  },
  {
    value: 'reaperto',
    label: 'Reaperto elétrico/mecânico',
    desc: 'Revisão de torque em bornes, conectores e fixação',
  },
  {
    value: 'outro',
    label: 'Outro serviço',
    desc: 'Reparo civil, substituição de cabeamento, etc.',
  },
]

const STATUS_SERVICO: { value: ServicoAvulsoStatus; label: string; color: string }[] = [
  { value: 'agendado', label: 'Agendado', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  {
    value: 'em_andamento',
    label: 'Em andamento',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    value: 'concluido',
    label: 'Concluído',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
]

export const ModalRegistrarServicoAvulso: React.FC<ModalRegistrarServicoAvulsoProps> = ({
  open,
  onOpenChange,
  cliente,
  onSuccess,
}) => {
  const { addServicoAvulso } = useClientes()
  const { toast } = useToast()

  const today = new Date().toISOString().split('T')[0]
  const [dataServico, setDataServico] = useState<string>(today)
  const [tipoServico, setTipoServico] = useState<ServicoAvulsoTipo>('limpeza')
  const [valorCobrado, setValorCobrado] = useState<string>('')
  const [status, setStatus] = useState<ServicoAvulsoStatus>('agendado')
  const [observacoesTecnicas, setObservacoesTecnicas] = useState<string>('')
  const [observacoesEquipe, setObservacoesEquipe] = useState<string>('')
  const [fotos, setFotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<{ name: string; url: string; size: string }[]>([])
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const selectedFiles = Array.from(e.target.files)
    const newFotos = [...fotos, ...selectedFiles].slice(0, 8)
    setFotos(newFotos)

    // Gera previews
    const newPreviews = newFotos.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
    }))
    setPreviews(newPreviews)
  }

  const handleRemoveFoto = (index: number) => {
    const updated = fotos.filter((_, i) => i !== index)
    setFotos(updated)
    const updatedPreviews = previews.filter((_, i) => i !== index)
    setPreviews(updatedPreviews)
  }

  const resetForm = () => {
    setDataServico(today)
    setTipoServico('limpeza')
    setValorCobrado('')
    setStatus('agendado')
    setObservacoesTecnicas('')
    setObservacoesEquipe('')
    setFotos([])
    setPreviews([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dataServico) {
      toast({
        title: 'Data obrigatória',
        description: 'Informe a data agendada ou realizada do serviço.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const numValor = valorCobrado ? parseFloat(valorCobrado.replace(',', '.')) : 0

      await addServicoAvulso({
        cliente_id: cliente.id,
        data_servico: new Date(dataServico).toISOString(),
        tipo_servico: tipoServico,
        valor_cobrado: isNaN(numValor) ? 0 : numValor,
        observacoes_tecnicas: observacoesTecnicas.trim(),
        status,
        observacoes_equipe: observacoesEquipe.trim(),
        fotos,
      })

      toast({
        title: 'Serviço avulso registrado!',
        description: `${cliente.nome} agora faz parte da lista de Clientes Pós-Vendas da aba O&M.`,
      })

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      console.error('Erro ao registrar serviço avulso:', err)
      toast({
        title: 'Erro ao registrar',
        description:
          err instanceof Error ? err.message : 'Não foi possível salvar o serviço avulso.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                Oferecer Serviço Avulso
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                Cliente: <span className="font-semibold text-slate-700">{cliente.nome}</span>
                {cliente.cidade ? ` • ${cliente.cidade}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Informação sobre Pós-Vendas */}
          <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-3.5 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-semibold">Integração O&M Pós-Vendas:</span> Ao salvar este
              serviço avulso, este cliente será automaticamente listado na aba{' '}
              <strong>O&M (Manutenções)</strong> na seção <strong>Clientes Pós-Vendas</strong>.
            </div>
          </div>

          {/* Linha 1: Tipo de Serviço e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Serviço *</Label>
              <Select
                value={tipoServico}
                onValueChange={(val) => setTipoServico(val as ServicoAvulsoTipo)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_SERVICO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="font-medium">{t.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-400">
                {TIPOS_SERVICO.find((t) => t.value === tipoServico)?.desc}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status do Serviço *</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as ServicoAvulsoStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o status..." />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_SERVICO.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Linha 2: Data e Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Data do Serviço *
              </Label>
              <Input
                type="date"
                value={dataServico}
                onChange={(e) => setDataServico(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Valor Cobrado (R$)
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 450,00"
                value={valorCobrado}
                onChange={(e) => setValorCobrado(e.target.value)}
              />
            </div>
          </div>

          {/* Linha 3: Observações Técnicas */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Observações Técnicas</Label>
            <Textarea
              rows={3}
              placeholder="Descreva itens inspecionados, medições, ferramentas utilizadas, condições do telhado/inversor, etc."
              value={observacoesTecnicas}
              onChange={(e) => setObservacoesTecnicas(e.target.value)}
            />
          </div>

          {/* Linha 4: Observações da Equipe */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Observações da Equipe</Label>
            <Textarea
              rows={2}
              placeholder="Técnicos responsáveis, recados internos, retorno do cliente ou sugestão de plano O&M futuro..."
              value={observacoesEquipe}
              onChange={(e) => setObservacoesEquipe(e.target.value)}
            />
          </div>

          {/* Linha 5: Upload de Fotos do Serviço */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              Upload de Fotos do Serviço
            </Label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-colors">
              <input
                id="foto-upload"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="foto-upload"
                className="cursor-pointer flex flex-col items-center justify-center gap-1 text-xs text-slate-600"
              >
                <div className="p-2 rounded-full bg-emerald-100 text-emerald-700">
                  <FileImage className="w-5 h-5" />
                </div>
                <span className="font-semibold text-emerald-700 mt-1">
                  Clique para anexar fotos
                </span>
                <span className="text-[11px] text-slate-400">
                  Formatos aceitos: JPG, PNG, WEBP (máx. 10MB cada)
                </span>
              </label>
            </div>

            {previews.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                {previews.map((prev, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg border border-slate-200 overflow-hidden bg-slate-100 aspect-video flex items-center justify-center"
                  >
                    <img src={prev.url} alt={prev.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5 text-white">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveFoto(idx)}
                          className="p-1 rounded-full bg-red-600 hover:bg-red-700 text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-[10px] truncate">{prev.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2"
              disabled={isSubmitting}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar Serviço Avulso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default ModalRegistrarServicoAvulso

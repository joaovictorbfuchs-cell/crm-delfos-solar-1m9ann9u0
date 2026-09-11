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
import { formatWhatsAppPhone } from '@/lib/formatters'
import { Contact, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { OutroContatoTipo } from '@/types/crm'

interface ModalCadastrarOutroContatoWhatsAppProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversaNumero: string
  conversaNome?: string
  onSubmit: (data: {
    nome: string
    telefone: string
    tipo_contato: OutroContatoTipo
    observacao?: string
  }) => Promise<void>
}

export const ModalCadastrarOutroContatoWhatsApp: React.FC<
  ModalCadastrarOutroContatoWhatsAppProps
> = ({ open, onOpenChange, conversaNumero, conversaNome, onSubmit }) => {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [tipoContato, setTipoContato] = useState<OutroContatoTipo>('parceiro')
  const [observacao, setObservacao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const nomeSugerido =
        conversaNome && conversaNome.trim() && conversaNome !== conversaNumero ? conversaNome : ''
      setNome(nomeSugerido)
      setTelefone(formatWhatsAppPhone(conversaNumero) || conversaNumero)
      setTipoContato('parceiro')
      setObservacao('')
      setErrorMsg(null)
    }
  }, [open, conversaNumero, conversaNome])

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsAppPhone(e.target.value)
    setTelefone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!nome.trim()) {
      setErrorMsg('O nome do contato é obrigatório.')
      return
    }

    if (!telefone.trim()) {
      setErrorMsg('O telefone do contato é obrigatório.')
      return
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        nome: nome.trim(),
        telefone: telefone.trim(),
        tipo_contato: tipoContato,
        observacao: observacao.trim() || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao cadastrar contato:', err)
      const rawMsg = err instanceof Error ? err.message : String(err || '')
      if (
        !rawMsg ||
        rawMsg.toLowerCase().includes('failed to create record') ||
        rawMsg.toLowerCase().includes('an unexpected error occurred')
      ) {
        setErrorMsg('Não foi possível salvar o contato. Verifique os campos e tente novamente.')
      } else {
        setErrorMsg(rawMsg)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
              <Contact className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Cadastrar como Outro Contato</DialogTitle>
              <DialogDescription className="text-xs">
                Registre fornecedores, parceiros ou instaladores. A conversa será finalizada e sairá
                da Fila de Novos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-500 text-xs rounded-md border border-red-500/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="contato-nome" className="text-xs font-medium">
              Nome <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contato-nome"
              placeholder="Ex: Distribuidora Solar Sul, Eletricista João..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-9 text-sm"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contato-telefone" className="text-xs font-medium">
              Telefone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="contato-telefone"
              placeholder="(00) 00000-0000"
              value={telefone}
              onChange={handlePhoneChange}
              className="h-9 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contato-tipo" className="text-xs font-medium">
              Tipo de Contato <span className="text-red-500">*</span>
            </Label>
            <Select
              value={tipoContato}
              onValueChange={(val) => setTipoContato(val as OutroContatoTipo)}
            >
              <SelectTrigger id="contato-tipo" className="h-9 text-sm">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fornecedor">Fornecedor</SelectItem>
                <SelectItem value="instalador">Instalador</SelectItem>
                <SelectItem value="parceiro">Parceiro</SelectItem>
                <SelectItem value="outro">Outro Contato</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contato-obs" className="text-xs font-medium">
              Observação
            </Label>
            <Textarea
              id="contato-obs"
              placeholder="Anotações sobre a parceria, produtos fornecidos, etc."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="text-sm min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-2 flex flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Salvar e Remover da Fila
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default ModalCadastrarOutroContatoWhatsApp

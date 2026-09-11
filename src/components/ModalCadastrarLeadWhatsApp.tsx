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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { UserPlus, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { ProdutoTipo } from '@/types/crm'

interface ModalCadastrarLeadWhatsAppProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversaNumero: string
  conversaNome?: string
  onSubmit: (data: {
    nome: string
    telefone: string
    email?: string
    cpf?: string
    endereco?: string
    produto: ProdutoTipo
    origem_lead: import('@/types/crm').OrigemLeadTipo
  }) => Promise<void>
}

export const ModalCadastrarLeadWhatsApp: React.FC<ModalCadastrarLeadWhatsAppProps> = ({
  open,
  onOpenChange,
  conversaNumero,
  conversaNome,
  onSubmit,
}) => {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [endereco, setEndereco] = useState('')
  const [produto, setProduto] = useState<ProdutoTipo>('residencial')
  const [origemLead, setOrigemLead] = useState('WhatsApp')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Atualizar valores padrão quando o modal abrir ou a conversa mudar
  useEffect(() => {
    if (open) {
      // Se conversaNome for diferente do número ou não parecer apenas dígitos, usar como sugestão
      const nomeSugerido =
        conversaNome && conversaNome.trim() && conversaNome !== conversaNumero ? conversaNome : ''
      setNome(nomeSugerido)
      setTelefone(formatWhatsAppPhone(conversaNumero) || conversaNumero)
      setEmail('')
      setCpf('')
      setEndereco('')
      setProduto('residencial')
      setOrigemLead('WhatsApp')
      setErrorMsg(null)
    }
  }, [open, conversaNumero, conversaNome])

  const formatCpf = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11)
    if (raw.length <= 3) return raw
    if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`
    if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`
    return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9, 11)}`
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsAppPhone(e.target.value)
    setTelefone(formatted)
  }

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!nome.trim()) {
      setErrorMsg('O nome completo do cliente é obrigatório.')
      return
    }

    if (!telefone.trim()) {
      setErrorMsg('O telefone do cliente é obrigatório.')
      return
    }

    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email.trim())) {
        setErrorMsg('Informe um endereço de e-mail válido.')
        return
      }
    }

    if (cpf.trim()) {
      const rawCpf = cpf.replace(/\D/g, '')
      if (rawCpf.length !== 11) {
        setErrorMsg('O CPF deve conter 11 dígitos.')
        return
      }
    }

    try {
      setIsSubmitting(true)
      await onSubmit({
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim() || undefined,
        cpf: cpf.trim() || undefined,
        endereco: endereco.trim() || undefined,
        produto,
        origem_lead: (origemLead.trim() || 'WhatsApp') as import('@/types/crm').OrigemLeadTipo,
      })
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao cadastrar lead:', err)
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao cadastrar lead.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Cadastrar como Novo Lead</DialogTitle>
              <DialogDescription className="text-xs">
                Crie a ficha do cliente a partir do contato do WhatsApp e assuma a conversa na Fila
                de Atendimento.
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
            <Label htmlFor="lead-nome" className="text-xs font-medium">
              Nome Completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lead-nome"
              placeholder="Ex: Carlos Eduardo de Oliveira"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="h-9 text-sm"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-telefone" className="text-xs font-medium">
                Telefone / WhatsApp <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lead-telefone"
                placeholder="(00) 00000-0000"
                value={telefone}
                onChange={handlePhoneChange}
                className="h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-email" className="text-xs font-medium">
                E-mail
              </Label>
              <Input
                id="lead-email"
                type="email"
                placeholder="cliente@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-cpf" className="text-xs font-medium">
                CPF
              </Label>
              <Input
                id="lead-cpf"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead-tipo" className="text-xs font-medium">
                Tipo de Cliente
              </Label>
              <Select value={produto} onValueChange={(val) => setProduto(val as ProdutoTipo)}>
                <SelectTrigger id="lead-tipo" className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residencial">Residencial</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="rural">Rural</SelectItem>
                  <SelectItem value="investidor">Investidor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-endereco" className="text-xs font-medium">
              Endereço da Usina / Imóvel
            </Label>
            <Input
              id="lead-endereco"
              placeholder="Rua, número, bairro, cidade - UF"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lead-origem" className="text-xs font-medium text-muted-foreground">
              Origem do Contato
            </Label>
            <Input
              id="lead-origem"
              value={origemLead}
              onChange={(e) => setOrigemLead(e.target.value)}
              className="h-9 text-sm bg-muted/50"
              readOnly
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
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Salvar e Iniciar Atendimento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default ModalCadastrarLeadWhatsApp

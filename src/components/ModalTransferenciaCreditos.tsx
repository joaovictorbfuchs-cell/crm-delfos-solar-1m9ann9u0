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
import { ArrowRightLeft, CheckCircle2, Calendar, FileText } from 'lucide-react'
import type { Cliente, TransferenciaCreditoStatus } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'

interface ModalTransferenciaCreditosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clienteOrigem: Cliente
  onSuccess?: () => void
}

export const ModalTransferenciaCreditos: React.FC<ModalTransferenciaCreditosProps> = ({
  open,
  onOpenChange,
  clienteOrigem,
  onSuccess,
}) => {
  const { clientes, addTransferenciaCredito, addAtividade } = useClientes()

  const [clienteDestinoId, setClienteDestinoId] = useState<string>('')
  const [clienteDestinoNome, setClienteDestinoNome] = useState<string>('')
  const [ucDestino, setUcDestino] = useState<string>('')
  const [quantidadeCreditos, setQuantidadeCreditos] = useState<number>(500)
  const [dataSolicitacao, setDataSolicitacao] = useState<string>(
    new Date().toISOString().slice(0, 10),
  )
  const [status, setStatus] = useState<TransferenciaCreditoStatus>('Pendente')
  const [protocolo, setProtocolo] = useState<string>('')
  const [observacoes, setObservacoes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const outrosClientes = clientes.filter((c) => c.id !== clienteOrigem.id)

  const handleClienteDestinoChange = (val: string) => {
    setClienteDestinoId(val)
    if (val === 'outro') {
      setClienteDestinoNome('')
    } else {
      const achado = clientes.find((c) => c.id === val)
      if (achado) {
        setClienteDestinoNome(achado.nome)
        if (achado.numero_uc) {
          setUcDestino(achado.numero_uc)
        }
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteDestinoNome.trim()) {
      alert('Por favor informe o cliente de destino.')
      return
    }
    if (!quantidadeCreditos || quantidadeCreditos <= 0) {
      alert('Por favor informe a quantidade de créditos (kWh/mês).')
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Salvar no banco via addTransferenciaCredito
      const dateIso = new Date(dataSolicitacao).toISOString()
      await addTransferenciaCredito({
        cliente_origem_id: clienteOrigem.id,
        cliente_origem_nome: clienteOrigem.nome,
        cliente_destino_id:
          clienteDestinoId && clienteDestinoId !== 'outro' ? clienteDestinoId : undefined,
        cliente_destino_nome: clienteDestinoNome.trim(),
        uc_destino: ucDestino.trim(),
        quantidade_creditos: Number(quantidadeCreditos),
        data_solicitacao: dateIso,
        status,
        protocolo_concessionaria: protocolo.trim(),
        observacoes: observacoes.trim(),
      })

      // 2. Registrar na Linha do Tempo Unificada do cliente (atividades)
      await addAtividade({
        cliente_id: clienteOrigem.id,
        tipo: 'anotacao',
        titulo: `Transferência de Créditos: ${quantidadeCreditos} kWh/mês`,
        descricao: `Solicitação de transferência de excedente de geração: ${quantidadeCreditos} kWh/mês para "${clienteDestinoNome.trim()}" (UC: ${ucDestino || 'N/I'}). Status: ${status}.${protocolo ? ` Protocolo: ${protocolo}.` : ''}${observacoes ? ` Obs: ${observacoes}` : ''}`,
        data: dateIso,
        autor: 'Pós-Venda Delfos',
        status: 'concluida',
      })

      // Se houver cliente de destino cadastrado no CRM, registra na timeline dele também
      if (clienteDestinoId && clienteDestinoId !== 'outro') {
        try {
          await addAtividade({
            cliente_id: clienteDestinoId,
            tipo: 'anotacao',
            titulo: `Recebimento de Créditos Solares: ${quantidadeCreditos} kWh/mês`,
            descricao: `Transferência de créditos recebida da UC de ${clienteOrigem.nome}. Quantidade: ${quantidadeCreditos} kWh/mês. Status: ${status}.${protocolo ? ` Protocolo: ${protocolo}.` : ''}`,
            data: dateIso,
            autor: 'Pós-Venda Delfos',
            status: 'concluida',
          })
        } catch {
          /* intentionally ignored */
        }
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao salvar transferência de créditos:', err)
      alert('Erro ao registrar transferência de créditos. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
              <ArrowRightLeft className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Transferência de Créditos de Energia
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Registrar distribuição e rateio de excedentes de geração para outra Unidade
                Consumidora (UC).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1 text-xs">
          {/* Origem */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
              Cliente de Origem (Gerador)
            </span>
            <div className="font-medium text-slate-900 text-sm">{clienteOrigem.nome}</div>
            <div className="text-[11px] text-slate-500">
              UC Geradora: {clienteOrigem.numero_uc || '4091823719'} &bull; CPF/CNPJ:{' '}
              {clienteOrigem.cpf || '—'}
            </div>
          </div>

          {/* Destino */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Cliente de Destino</Label>
            <Select value={clienteDestinoId} onValueChange={handleClienteDestinoChange}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione um cliente existente ou informe outro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="outro">-- Outro favorecido / UC Externa --</SelectItem>
                {outrosClientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} {c.numero_uc ? `(UC: ${c.numero_uc})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div>
              <Label className="text-[11px] text-slate-500">
                Nome do Titular / Razão Social de Destino
              </Label>
              <Input
                className="h-8 text-xs mt-1"
                placeholder="Ex: Fazenda Três Palmeiras - Sede"
                value={clienteDestinoNome}
                onChange={(e) => setClienteDestinoNome(e.target.value)}
                required
              />
            </div>

            <div>
              <Label className="text-[11px] text-slate-500">
                Nº da UC de Destino (Beneficiária)
              </Label>
              <Input
                className="h-8 text-xs mt-1 font-mono"
                placeholder="Ex: 3098124501"
                value={ucDestino}
                onChange={(e) => setUcDestino(e.target.value)}
              />
            </div>
          </div>

          {/* Quantidade e Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Créditos (kWh/mês)</Label>
              <Input
                type="number"
                min="1"
                step="1"
                className="h-8 text-xs mt-1 font-semibold text-emerald-800"
                value={quantidadeCreditos}
                onChange={(e) => setQuantidadeCreditos(Number(e.target.value))}
                required
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">Data da Solicitação</Label>
              <Input
                type="date"
                className="h-8 text-xs mt-1"
                value={dataSolicitacao}
                onChange={(e) => setDataSolicitacao(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Status e Protocolo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as TransferenciaCreditoStatus)}
              >
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Em análise">Em análise</SelectItem>
                  <SelectItem value="Homologada">Homologada</SelectItem>
                  <SelectItem value="Rejeitada">Rejeitada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Protocolo Distribuidora
              </Label>
              <Input
                className="h-8 text-xs mt-1 font-mono"
                placeholder="Ex: RGE-2026-TR12345"
                value={protocolo}
                onChange={(e) => setProtocolo(e.target.value)}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className="text-[11px] text-slate-600">
              Observações Técnicas / Concessionária
            </Label>
            <Textarea
              className="text-xs mt-1 resize-none h-16"
              placeholder="Descreva particularidades do rateio, porcentagem ou documentos anexados..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium"
            >
              {isSubmitting ? 'Salvando...' : 'Registrar Transferência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

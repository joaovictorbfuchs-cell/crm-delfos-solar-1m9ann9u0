import React, { useState } from 'react'
import { X, Calendar, Wrench, User, AlertCircle, Loader2 } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import type { ManutencaoTipo, ManutencaoStatus } from '@/types/crm'

interface NovaManutencaoModalProps {
  isOpen: boolean
  onClose: () => void
  defaultClienteId?: string
}

export const NovaManutencaoModal: React.FC<NovaManutencaoModalProps> = ({
  isOpen,
  onClose,
  defaultClienteId,
}) => {
  const { clientes, addManutencao } = useClientes()
  const { toast } = useToast()

  const [clienteId, setClienteId] = useState<string>(defaultClienteId || clientes[0]?.id || '')
  const [data, setData] = useState<string>(() => {
    const today = new Date().toISOString().slice(0, 10)
    return today
  })
  const [tipo, setTipo] = useState<ManutencaoTipo>('Limpeza')
  const [status, setStatus] = useState<ManutencaoStatus>('Agendado')
  const [tecnico, setTecnico] = useState<string>('Rafael Souza')
  const [descricao, setDescricao] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  if (!isOpen) return null

  const validate = () => {
    const newErrors: { [key: string]: string } = {}
    if (!clienteId) newErrors.clienteId = 'Selecione o cliente'
    if (!data) newErrors.data = 'Selecione a data da manutenção'
    if (!tipo) newErrors.tipo = 'Selecione o tipo de serviço'
    if (!status) newErrors.status = 'Selecione o status'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setIsSubmitting(true)
      await addManutencao({
        cliente_id: clienteId,
        data: new Date(data + 'T12:00:00.000Z').toISOString(),
        tipo,
        status,
        tecnico,
        descricao,
      })

      toast({
        title: 'Manutenção registrada!',
        description: 'A ordem de manutenção foi salva com sucesso no sistema.',
      })
      onClose()
    } catch (err: unknown) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar manutenção',
        description: err instanceof Error ? err.message : 'Tente novamente.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Wrench className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Registrar Nova Manutenção</h2>
              <p className="text-xs text-gray-500">Agende ou registre um serviço técnico</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Cliente */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Cliente <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                  errors.clienteId ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                }`}
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({c.cidade} — {c.potencia_kwp} kWp)
                  </option>
                ))}
              </select>
            </div>
            {errors.clienteId && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errors.clienteId}
              </p>
            )}
          </div>

          {/* Grid: Data e Tipo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Data do Serviço <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    errors.data ? 'border-red-500 bg-red-50/20' : 'border-gray-200'
                  }`}
                />
              </div>
              {errors.data && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.data}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Tipo de Serviço <span className="text-red-500">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as ManutencaoTipo)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <option value="Limpeza">Limpeza</option>
                <option value="Revisão Elétrica">Revisão Elétrica</option>
                <option value="Troca de Inversor">Troca de Inversor</option>
              </select>
            </div>
          </div>

          {/* Grid: Status e Técnico */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ManutencaoStatus)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              >
                <option value="Agendado">Agendado</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
                Técnico Responsável
              </label>
              <input
                type="text"
                placeholder="Ex: Rafael Souza"
                value={tecnico}
                onChange={(e) => setTecnico(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1.5">
              Descrição do Serviço / Observações
            </label>
            <textarea
              rows={3}
              placeholder="Descreva as atividades, medições ou peças substituídas..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-120 flex items-center gap-2 hover:scale-[1.02] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Manutenção'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

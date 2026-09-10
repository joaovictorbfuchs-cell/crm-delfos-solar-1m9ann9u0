import React, { useState } from 'react'
import { X, ShieldCheck, Calendar, DollarSign, User, Zap } from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { OMPlanoTipo, OMStatusPlano } from '@/types/crm'

interface ModalNovoContratoOMProps {
  isOpen: boolean
  onClose: () => void
}

export const ModalNovoContratoOM: React.FC<ModalNovoContratoOMProps> = ({ isOpen, onClose }) => {
  const { clientes, contratosOM, addContratoOM } = useClientes()

  const [clienteId, setClienteId] = useState('')
  const [plano, setPlano] = useState<OMPlanoTipo>('Essencial')
  const [valorMensal, setValorMensal] = useState<number>(250)
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [dataVencimento, setDataVencimento] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split('T')[0]
  })
  const [proximaTitulo, setProximaTitulo] = useState('Inspeção preventiva semestral')
  const [proximaData, setProximaData] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().split('T')[0]
  })
  const [observacoes, setObservacoes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  // Clientes que ainda não têm contrato de O&M
  const clientesDisponiveis = clientes.filter(
    (c) => !contratosOM.some((cont) => cont.cliente_id === c.id),
  )

  const handlePlanoChange = (novoPlano: OMPlanoTipo) => {
    setPlano(novoPlano)
    if (novoPlano === 'Essencial') setValorMensal(250)
    else if (novoPlano === 'Prevenção') setValorMensal(450)
    else if (novoPlano === 'Completo') setValorMensal(1200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId) {
      alert('Por favor, selecione um cliente.')
      return
    }

    setIsSubmitting(true)
    try {
      const vMensal = Number(valorMensal) || 0
      const vAnual = vMensal * 12

      // Determinar status inicial baseado no vencimento
      const diasRestantes = Math.ceil(
        (new Date(dataVencimento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )
      let status: OMStatusPlano = 'Ativo'
      if (diasRestantes <= 0) status = 'Vencido'
      else if (diasRestantes <= 30) status = 'Vencendo em 30 dias'

      await addContratoOM({
        cliente_id: clienteId,
        plano,
        status,
        valor_mensal: vMensal,
        valor_anual: vAnual,
        data_inicio: new Date(dataInicio).toISOString(),
        data_vencimento: new Date(dataVencimento).toISOString(),
        proxima_atividade_titulo: proximaTitulo,
        proxima_atividade_data: new Date(proximaData).toISOString(),
        observacoes,
        servicos_realizados: ['Monitoramento da geração em horários comerciais'],
        servicos_agendados: [
          'Relatório mensal de desempenho',
          'Inspeção preventiva anual',
          'Reaperto de conexões e grampos',
        ],
      })

      onClose()
    } catch (err) {
      console.error('Erro ao criar contrato O&M:', err)
      alert('Falha ao registrar novo contrato de O&M.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative z-50 bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 p-6 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Novo Contrato de O&M</h3>
              <p className="text-xs text-gray-500">
                Atribua um plano de operação e manutenção a um cliente
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Selecionar Cliente */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Cliente *</label>
            <select
              required
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="">Selecione um cliente...</option>
              {clientesDisponiveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.cidade || 'Erechim/RS'} ({c.potencia_kwp || 0} kWp)
                </option>
              ))}
            </select>
          </div>

          {/* Plano & Valor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Plano Contratado *</label>
              <select
                value={plano}
                onChange={(e) => handlePlanoChange(e.target.value as OMPlanoTipo)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs bg-white"
              >
                <option value="Essencial">Essencial</option>
                <option value="Prevenção">Prevenção</option>
                <option value="Completo">Completo</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Valor Mensal (R$) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={valorMensal}
                onChange={(e) => setValorMensal(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Vigência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Início da Vigência *</label>
              <input
                type="date"
                required
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Data de Vencimento *</label>
              <input
                type="date"
                required
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Próxima Atividade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Próxima Atividade</label>
              <input
                type="text"
                value={proximaTitulo}
                onChange={(e) => setProximaTitulo(e.target.value)}
                placeholder="Ex: Inspeção semestral"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Data da Atividade</label>
              <input
                type="date"
                value={proximaData}
                onChange={(e) => setProximaData(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Observações</label>
            <textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Notas contratuais adicionais..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-xs font-semibold hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'Cadastrar Contrato O&M'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

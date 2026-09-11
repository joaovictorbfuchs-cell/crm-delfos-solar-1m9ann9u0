import React, { useState, useMemo } from 'react'
import { Search, UserPlus, Building2, MapPin, Check, AlertCircle, X } from 'lucide-react'
import type { Cliente, WhatsAppConversa } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'

interface ModalVincularClienteProps {
  isOpen: boolean
  onClose: () => void
  conversa: WhatsAppConversa | null
  clientes: Cliente[]
  onVincular: (clienteId: string) => Promise<void>
}

export const ModalVincularCliente: React.FC<ModalVincularClienteProps> = ({
  isOpen,
  onClose,
  conversa,
  clientes,
  onVincular,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtrar clientes por Nome, CPF/CNPJ ou Endereço da Usina / Localização
  const clientesFiltrados = useMemo(() => {
    if (!isOpen || !conversa) return []
    const term = searchTerm.trim().toLowerCase()
    if (!term) return clientes.slice(0, 15)

    return clientes
      .filter((c) => {
        const matchNome = (c.nome || '').toLowerCase().includes(term)
        const matchDoc = (c.cpf_cnpj || '').replace(/\D/g, '').includes(term.replace(/\D/g, ''))
        const matchDocRaw = (c.cpf_cnpj || '').toLowerCase().includes(term)
        const matchEndereco = [
          c.endereco,
          c.numero,
          c.bairro,
          c.cidade,
          c.estado,
          c.cep,
          c.usina_endereco,
          c.unidade_consumidora,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
        const matchWhats = (c.whatsapp || c.telefone || '')
          .replace(/\D/g, '')
          .includes(term.replace(/\D/g, ''))

        return matchNome || matchDoc || matchDocRaw || matchEndereco || matchWhats
      })
      .slice(0, 20)
  }, [clientes, searchTerm])

  if (!isOpen || !conversa) return null

  const handleConfirmar = async () => {
    if (!selectedClienteId) return
    setIsSubmitting(true)
    setError(null)
    try {
      await onVincular(selectedClienteId)
      onClose()
    } catch (err: unknown) {
      console.error('Erro ao vincular conversa:', err)
      setError(err instanceof Error ? err.message : 'Falha ao vincular conversa ao cliente')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <UserPlus className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Vincular Número a Cliente Existente
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Associando número{' '}
                <span className="font-mono font-bold text-emerald-700">
                  {formatWhatsAppPhone(conversa.numero)}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mensagem da conversa */}
        {conversa.ultima_mensagem_preview && (
          <div className="px-5 py-3 bg-emerald-50/60 border-b border-emerald-100 text-xs text-emerald-950 flex items-start gap-2">
            <span className="font-bold shrink-0">Última mensagem:</span>
            <span className="italic truncate text-gray-700">
              "{conversa.ultima_mensagem_preview}"
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Buscar cliente existente por Nome, CPF/CNPJ ou Endereço da Usina:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Ex: João Silva, 123.456, Erechim, Rua das Flores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Lista de Resultados */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {clientesFiltrados.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200">
                Nenhum cliente encontrado com os critérios digitados.
              </div>
            ) : (
              clientesFiltrados.map((cliente) => {
                const isSelected = selectedClienteId === cliente.id
                const enderecoUsina =
                  cliente.usina_endereco ||
                  [cliente.endereco, cliente.numero, cliente.cidade].filter(Boolean).join(', ')

                return (
                  <div
                    key={cliente.id}
                    onClick={() => setSelectedClienteId(cliente.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white hover:bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="space-y-1 text-left flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 truncate">
                          {cliente.nome}
                        </span>
                        {cliente.status && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {cliente.status}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500">
                        {cliente.cpf_cnpj && (
                          <span className="font-mono">Doc: {cliente.cpf_cnpj}</span>
                        )}
                        {(cliente.whatsapp || cliente.telefone) && (
                          <span>Cadastrado: {cliente.whatsapp || cliente.telefone}</span>
                        )}
                        {cliente.cidade && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-gray-400" />
                            {cliente.cidade}
                          </span>
                        )}
                      </div>

                      {enderecoUsina && (
                        <div className="flex items-center gap-1 text-[11px] text-emerald-800 truncate">
                          <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">Usina/Local: {enderecoUsina}</span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 pt-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          isSelected
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedClienteId || isSubmitting}
            onClick={handleConfirmar}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            {isSubmitting ? (
              <span>Vinculando...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Vincular e Iniciar Atendimento</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

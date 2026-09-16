import React, { useState, useMemo } from 'react'
import {
  Search,
  UserPlus,
  Building2,
  MapPin,
  Check,
  AlertCircle,
  X,
  RefreshCw,
  Plus,
} from 'lucide-react'
import type { Cliente, WhatsAppConversa } from '@/types/crm'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { useClientes } from '@/contexts/ClientesContext'

interface ModalVincularClienteProps {
  isOpen: boolean
  onClose: () => void
  conversa: WhatsAppConversa | null
  clientes: Cliente[]
  onVincular: (clienteId: string) => Promise<void>
  onCadastrarLead?: (conversa: WhatsAppConversa) => void
}

export const ModalVincularCliente: React.FC<ModalVincularClienteProps> = ({
  isOpen,
  onClose,
  conversa,
  clientes,
  onVincular,
  onCadastrarLead,
}) => {
  const { refreshData } = useClientes()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReloading, setIsReloading] = useState(false)

  const handleRecarregarClientes = async () => {
    try {
      setIsReloading(true)
      await refreshData()
    } catch (e) {
      console.error('Erro ao recarregar clientes:', e)
    } finally {
      setIsReloading(false)
    }
  }

  // Filtrar clientes por Nome, CPF/CNPJ ou Endereço da Usina / Localização
  const clientesFiltrados = useMemo(() => {
    if (!isOpen || !conversa) return []
    const term = searchTerm.trim().toLowerCase()
    if (!term) return clientes.slice(0, 15)

    const digitsOnly = term.replace(/\D/g, '')

    return clientes
      .filter((c) => {
        const nome = (c.nome || '').toLowerCase()
        const razaoSocial = (c.razao_social || '').toLowerCase()
        const nomeFantasia = (c.nome_fantasia || '').toLowerCase()
        const contato = (c.contato || '').toLowerCase()
        const contatoPrincipal = (c.contato_principal || '').toLowerCase()

        const matchNome =
          nome.includes(term) ||
          razaoSocial.includes(term) ||
          nomeFantasia.includes(term) ||
          contato.includes(term) ||
          contatoPrincipal.includes(term)

        const cpf = c.cpf || ''
        const cnpj = c.cnpj || ''
        const cpfDigits = cpf.replace(/\D/g, '')
        const cnpjDigits = cnpj.replace(/\D/g, '')

        const matchDoc =
          (digitsOnly.length > 0 &&
            (cpfDigits.includes(digitsOnly) || cnpjDigits.includes(digitsOnly))) ||
          cpf.toLowerCase().includes(term) ||
          cnpj.toLowerCase().includes(term)

        const matchEndereco = [
          c.endereco,
          c.numero,
          c.bairro,
          c.cidade,
          c.estado,
          c.cep,
          c.usina_endereco,
          c.uc,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)

        const telDigits = (c.telefone || '').replace(/\D/g, '')
        const whatsDigits = (c.whatsapp || '').replace(/\D/g, '')
        const secDigits = (c.telefone_secundario || '').replace(/\D/g, '')

        const matchWhats =
          (digitsOnly.length > 0 &&
            (telDigits.includes(digitsOnly) ||
              whatsDigits.includes(digitsOnly) ||
              secDigits.includes(digitsOnly))) ||
          (c.whatsapp || '').toLowerCase().includes(term) ||
          (c.telefone || '').toLowerCase().includes(term)

        return matchNome || matchDoc || matchEndereco || matchWhats
      })
      .slice(0, 30)
  }, [clientes, searchTerm, isOpen, conversa])

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
                className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="p-1 text-gray-400 hover:text-gray-700 absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full"
                  title="Limpar busca"
                  aria-label="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Contador e Ajuda de Resultados */}
          <div className="flex items-center justify-between text-[11px] text-gray-500 px-0.5">
            <span>
              {searchTerm.trim() ? (
                <>
                  Resultados para "<strong className="text-gray-700">{searchTerm.trim()}</strong>":{' '}
                  {clientesFiltrados.length} cliente(s)
                </>
              ) : (
                <>
                  Mostrando {clientesFiltrados.length} clientes recentes. Digite acima para filtrar.
                </>
              )}
            </span>
            {selectedClienteId && (
              <span className="text-emerald-700 font-semibold">1 cliente selecionado</span>
            )}
          </div>

          {/* Lista de Resultados */}
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {clientes.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-500 text-xs bg-amber-50/60 rounded-xl border border-amber-200 space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mx-auto">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    Nenhum cliente carregado na base de dados ou ocorreu uma falha de sincronização.
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Você pode refazer a carga dos clientes para sincronizar com o servidor.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isReloading}
                    onClick={handleRecarregarClientes}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 rounded-lg font-medium text-xs transition shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReloading ? 'animate-spin' : ''}`} />
                    {isReloading ? 'Recarregando...' : 'Recarregar Clientes'}
                  </button>
                  {onCadastrarLead && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onCadastrarLead(conversa)
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg font-semibold text-xs transition shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Cadastrar como Novo Lead
                    </button>
                  )}
                </div>
              </div>
            ) : clientesFiltrados.length === 0 ? (
              <div className="text-center py-8 px-4 text-gray-500 text-xs bg-gray-50 rounded-xl border border-dashed border-gray-200 space-y-2">
                <p className="font-medium text-gray-700">
                  Nenhum cliente encontrado para "{searchTerm}"
                </p>
                <p className="text-[11px] text-gray-400">
                  Tente buscar por partes do nome, telefone sem máscara ou cidade.
                </p>
                {onCadastrarLead && conversa && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose()
                      onCadastrarLead(conversa)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Cadastrar como novo lead com este número</span>
                  </button>
                )}
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
                        {(cliente.cpf || cliente.cnpj) && (
                          <span className="font-mono">Doc: {cliente.cpf || cliente.cnpj}</span>
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

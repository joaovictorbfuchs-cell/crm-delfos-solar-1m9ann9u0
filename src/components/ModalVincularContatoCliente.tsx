import React, { useState, useMemo } from 'react'
import {
  Search,
  UserCheck,
  Building2,
  Phone,
  Check,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Mail,
} from 'lucide-react'
import type { Cliente } from '@/types/crm'
import type { ItemImportacaoContatoCelular } from '@/services/importacaoContatosCelularService'
import { formatWhatsAppPhone } from '@/lib/formatters'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ModalVincularContatoClienteProps {
  isOpen: boolean
  onClose: () => void
  item: ItemImportacaoContatoCelular | null
  clientes: Cliente[]
  onConfirmarVinculacao: (item: ItemImportacaoContatoCelular, cliente: Cliente) => Promise<void>
}

export const ModalVincularContatoCliente: React.FC<ModalVincularContatoClienteProps> = ({
  isOpen,
  onClose,
  item,
  clientes,
  onConfirmarVinculacao,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const [etapa, setEtapa] = useState<'selecionar' | 'confirmar'>('selecionar')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  // Reseta o estado quando o modal abre ou troca de item
  React.useEffect(() => {
    if (isOpen) {
      setSearchTerm('')
      setSelectedCliente(null)
      setEtapa('selecionar')
      setErro(null)
      setIsSubmitting(false)
    }
  }, [isOpen, item])

  // Filtra clientes por nome, telefone, whatsapp, e-mail, cidade ou documento
  const clientesFiltrados = useMemo(() => {
    if (!isOpen || !item) return []
    const term = searchTerm.trim().toLowerCase()
    if (!term) return clientes.slice(0, 20)

    const termDigits = term.replace(/\D/g, '')

    return clientes
      .filter((c) => {
        const matchNome = (c.nome || '').toLowerCase().includes(term)
        const matchFantasia = (c.nome_fantasia || '').toLowerCase().includes(term)
        const matchRazao = (c.razao_social || '').toLowerCase().includes(term)
        const matchCidade = (c.cidade || '').toLowerCase().includes(term)
        const matchEmail = (c.email || '').toLowerCase().includes(term)

        const matchTelefone =
          termDigits.length > 0 &&
          ((c.telefone || '').replace(/\D/g, '').includes(termDigits) ||
            (c.whatsapp || '').replace(/\D/g, '').includes(termDigits) ||
            (c.telefone_secundario || '').replace(/\D/g, '').includes(termDigits) ||
            (c.titular_telefone || '').replace(/\D/g, '').includes(termDigits))

        const matchDoc =
          termDigits.length > 0 &&
          ((c.cpf || '').replace(/\D/g, '').includes(termDigits) ||
            (c.cnpj || '').replace(/\D/g, '').includes(termDigits) ||
            (c.cpf_cnpj || '').replace(/\D/g, '').includes(termDigits))

        return (
          matchNome ||
          matchFantasia ||
          matchRazao ||
          matchCidade ||
          matchEmail ||
          matchTelefone ||
          matchDoc
        )
      })
      .slice(0, 30)
  }, [clientes, searchTerm, isOpen, item])

  if (!isOpen || !item) return null

  const temTelefoneValido = Boolean(item.telefoneCsv && item.telefoneCsv.trim().length > 0)

  const handleSelecionarCliente = (cli: Cliente) => {
    setSelectedCliente(cli)
    setErro(null)
  }

  const handleAvancarParaConfirmacao = () => {
    if (!selectedCliente) return
    setEtapa('confirmar')
  }

  const handleConfirmar = async () => {
    if (!selectedCliente || !item) return
    setIsSubmitting(true)
    setErro(null)
    try {
      await onConfirmarVinculacao(item, selectedCliente)
      onClose()
    } catch (err: unknown) {
      console.error('Erro ao vincular contato ao cliente:', err)
      setErro(err instanceof Error ? err.message : 'Falha ao vincular contato ao cliente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-xl p-0 overflow-hidden sm:rounded-2xl">
        {etapa === 'selecionar' ? (
          <div>
            <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-[#16A34A]" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-gray-900">
                    Vincular a Cliente Existente
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-500 mt-0.5">
                    Associando contato do celular:{' '}
                    <strong className="text-gray-800">{item.nomeCsv}</strong>
                    {item.telefoneCsv && (
                      <span className="font-mono text-emerald-700 font-semibold ml-1">
                        ({item.telefoneCsv})
                      </span>
                    )}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-5 space-y-3.5">
              {/* Campo de Busca */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Buscar cliente existente no CRM:
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Busque por nome, telefone, e-mail ou cidade..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 focus:bg-white border border-gray-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Exibindo {clientesFiltrados.length} clientes encontrados. Dê duplo clique ou
                  selecione e clique em Avançar.
                </p>
              </div>

              {erro && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{erro}</span>
                </div>
              )}

              {/* Lista de Resultados Rolável */}
              <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1 border border-gray-100 rounded-xl p-1 bg-gray-50/40">
                {clientesFiltrados.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs bg-white rounded-lg border border-dashed border-gray-200">
                    Nenhum cliente encontrado com os critérios digitados.
                  </div>
                ) : (
                  clientesFiltrados.map((cliente) => {
                    const isSelected = selectedCliente?.id === cliente.id
                    const telefoneExibicao =
                      cliente.telefone || cliente.whatsapp || cliente.titular_telefone || ''

                    return (
                      <div
                        key={cliente.id}
                        onClick={() => handleSelecionarCliente(cliente)}
                        onDoubleClick={() => {
                          handleSelecionarCliente(cliente)
                          handleAvancarParaConfirmacao()
                        }}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-white hover:bg-gray-50/80 border-gray-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-900 truncate">
                              {cliente.nome}
                            </span>
                            {cliente.status && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                {cliente.status}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                            {telefoneExibicao && (
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-3 h-3 text-gray-400" />
                                {formatWhatsAppPhone(telefoneExibicao)}
                              </span>
                            )}
                            {cliente.cidade && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {cliente.cidade}
                              </span>
                            )}
                            {cliente.email && (
                              <span className="flex items-center gap-1 truncate max-w-[180px]">
                                <Mail className="w-3 h-3 text-gray-400" />
                                {cliente.email}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
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

            <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!selectedCliente}
                onClick={handleAvancarParaConfirmacao}
                className="bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
              >
                <span>Avançar para Confirmação</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Etapa 2: Confirmação Obrigatória */
          <div>
            <DialogHeader className="p-5 pb-3 border-b border-gray-100 bg-gray-50/70">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#166534] flex items-center justify-center mb-1">
                <ShieldCheck className="w-5 h-5 text-[#16A34A]" />
              </div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Confirmar vinculação de cliente
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-600 pt-2 leading-relaxed">
                {temTelefoneValido ? (
                  <>
                    O contato <strong className="text-gray-900 font-bold">{item.nomeCsv}</strong>{' '}
                    será vinculado ao cliente{' '}
                    <strong className="text-gray-900 font-bold">{selectedCliente?.nome}</strong>. Se
                    o contato tiver telefone válido, o telefone do cliente será atualizado para{' '}
                    <strong className="text-emerald-700 font-mono font-bold">
                      {item.telefoneCsv}
                    </strong>
                    . Confirma?
                  </>
                ) : (
                  <>
                    O contato <strong className="text-gray-900 font-bold">{item.nomeCsv}</strong>{' '}
                    será vinculado ao cliente{' '}
                    <strong className="text-gray-900 font-bold">{selectedCliente?.nome}</strong>.
                    Confirma?
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-3">
              {/* Comparativo Visual */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs text-gray-600 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 font-medium">Contato do Celular:</span>
                  <span className="font-bold text-gray-900">{item.nomeCsv}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500 font-medium">Cliente Selecionado no CRM:</span>
                  <span className="font-bold text-emerald-800">{selectedCliente?.nome}</span>
                </div>
                {selectedCliente?.telefone && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-medium">
                      Telefone cadastrado anteriormente:
                    </span>
                    <span className="font-mono text-gray-700">{selectedCliente.telefone}</span>
                  </div>
                )}
                {temTelefoneValido && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-gray-200">
                    <span className="text-emerald-700 font-bold">
                      Novo telefone que será salvo:
                    </span>
                    <span className="font-mono text-emerald-800 font-bold">{item.telefoneCsv}</span>
                  </div>
                )}
              </div>

              {erro && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{erro}</span>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setEtapa('selecionar')}
                className="text-xs"
              >
                Voltar à busca
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isSubmitting}
                onClick={handleConfirmar}
                className="bg-[#16A34A] hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Vinculando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirmar Vinculação</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

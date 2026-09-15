import React, { useState } from 'react'
import {
  Users,
  User,
  Plus,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Loader2,
  Check,
  X,
  UserCheck,
} from 'lucide-react'
import { Cliente, ContatoAdicional } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { toast } from 'sonner'

interface SecaoContatosAdicionaisProps {
  cliente: Cliente
}

export const SecaoContatosAdicionais: React.FC<SecaoContatosAdicionaisProps> = ({ cliente }) => {
  const { contatosAdicionais, addContatoAdicional, removeContatoAdicional } = useClientes()

  const [isAdding, setIsAdding] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Form state
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')

  // Filtrar contatos adicionais vinculados ao cliente
  const contatosDoCliente = contatosAdicionais.filter((c) => c.cliente === cliente.id)

  const handleResetForm = () => {
    setNome('')
    setCargo('')
    setTelefone('')
    setEmail('')
    setIsAdding(false)
  }

  const handleSalvarNovoContato = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!nome.trim()) {
      toast.error('Informe o nome do contato')
      return
    }

    setIsSaving(true)
    try {
      await addContatoAdicional({
        cliente: cliente.id,
        nome: nome.trim(),
        cargo: cargo.trim() || undefined,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
      })
      toast.success('Contato adicional cadastrado com sucesso!')
      handleResetForm()
    } catch (err) {
      console.error('Erro ao adicionar contato adicional:', err)
      toast.error('Erro ao cadastrar contato adicional')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExcluirContato = async (id: string, nomeContato: string) => {
    if (!window.confirm(`Deseja realmente remover o contato adicional "${nomeContato}"?`)) {
      return
    }

    setDeletingId(id)
    try {
      await removeContatoAdicional(id)
      toast.success(`Contato "${nomeContato}" removido com sucesso.`)
    } catch (err) {
      console.error('Erro ao excluir contato adicional:', err)
      toast.error('Erro ao excluir contato adicional')
    } finally {
      setDeletingId(null)
    }
  }

  // Contato Principal deduzido dos dados já cadastrados do cliente
  const contatoPrincipalNome =
    cliente.contato_principal?.trim() ||
    cliente.contato?.trim() ||
    cliente.nome?.trim() ||
    'Contato Principal'

  // Se cliente for PJ e tiver contato específico, podemos inferir o cargo ou usar o texto
  const contatoPrincipalCargo =
    cliente.contato && cliente.contato !== cliente.nome
      ? 'Responsável / Contato Direto'
      : cliente.tipo_pessoa === 'PJ'
        ? 'Representante Legal / Titular'
        : 'Titular / Proprietário'

  const contatoPrincipalTelefone = cliente.telefone || cliente.whatsapp || 'Não informado'
  const contatoPrincipalEmail = cliente.email || 'Não informado'

  return (
    <div
      data-testid="secao-contatos-adicionais"
      className="bg-white rounded-xl p-4 border border-emerald-200/90 shadow-xs space-y-3.5"
    >
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              Contatos Adicionais
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                {1 + contatosDoCliente.length}
              </span>
            </h4>
            <p className="text-[10px] text-gray-500">
              Pessoas de contato vinculadas a este cliente (sócios, financeiro, operacional)
            </p>
          </div>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Adicionar contato</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {/* Contato Principal (sempre visível no topo da seção) */}
        <div className="bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 border border-emerald-200 rounded-lg p-3">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                <UserCheck className="w-3 h-3" />
              </span>
              <span className="text-xs font-bold text-gray-900">{contatoPrincipalNome}</span>
              <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                Contato Principal
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 pt-1 border-t border-emerald-100/80">
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-gray-500">Cargo:</span>
              <span className="font-medium text-gray-800 truncate" title={contatoPrincipalCargo}>
                {contatoPrincipalCargo}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-gray-500">Tel:</span>
              <span className="font-medium text-gray-800 truncate">{contatoPrincipalTelefone}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-gray-500">E-mail:</span>
              <span className="font-medium text-gray-800 truncate" title={contatoPrincipalEmail}>
                {contatoPrincipalEmail}
              </span>
            </div>
          </div>
        </div>

        {/* Lista de Contatos Adicionais */}
        {contatosDoCliente.map((contato) => (
          <div
            key={contato.id}
            data-testid={`contato-adicional-${contato.id}`}
            className="group bg-gray-50/70 hover:bg-gray-50 border border-gray-200 rounded-lg p-3 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px]">
                  <User className="w-3 h-3" />
                </span>
                <span className="text-xs font-bold text-gray-900">{contato.nome}</span>
                {contato.cargo && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                    {contato.cargo}
                  </span>
                )}
              </div>

              {/* Botão de Excluir Contato Adicional */}
              <button
                type="button"
                onClick={() => handleExcluirContato(contato.id, contato.nome)}
                disabled={deletingId === contato.id}
                title="Remover contato adicional"
                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deletingId === contato.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 pt-1 border-t border-gray-200/60">
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500">Cargo:</span>
                <span className="font-medium text-gray-800 truncate">
                  {contato.cargo || 'Não informado'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500">Tel:</span>
                <span className="font-medium text-gray-800 truncate">
                  {contato.telefone || 'Não informado'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500">E-mail:</span>
                <span className="font-medium text-gray-800 truncate" title={contato.email}>
                  {contato.email || 'Não informado'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Formulário Inline de Adicionar Contato Adicional */}
        {isAdding && (
          <form
            onSubmit={handleSalvarNovoContato}
            className="p-3 bg-emerald-50/50 border border-emerald-300 rounded-lg space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                Novo Contato Adicional
              </span>
              <button
                type="button"
                onClick={handleResetForm}
                className="text-gray-400 hover:text-gray-600 p-0.5"
                title="Cancelar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João da Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Cargo / Função
                </label>
                <input
                  type="text"
                  placeholder="Ex: Gerente Financeiro, Sócio"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Telefone / Celular
                </label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatWhatsAppPhone(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="contato@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-200/60">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={isSaving}
                className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving || !nome.trim()}
                className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar contato</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
export default SecaoContatosAdicionais

import React, { useState } from 'react'
import {
  Plus,
  Droplets,
  Zap,
  Settings,
  Wrench,
  User,
  Calendar,
  Trash2,
  AlertTriangle,
  UserX,
} from 'lucide-react'
import type { Manutencao } from '@/types/crm'
import { formatDate } from '@/lib/formatters'
import { StatusBadge } from '@/components/StatusBadge'
import { useClientes } from '@/contexts/ClientesContext'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ManutencoesListProps {
  onOpenNovaManutencao: () => void
}

export const ManutencoesList: React.FC<ManutencoesListProps> = ({ onOpenNovaManutencao }) => {
  const { manutencoes, clientes, openFichaCliente, removeManutencao } = useClientes()
  const [manutencaoParaExcluir, setManutencaoParaExcluir] = useState<Manutencao | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const isClienteOrfao = (m: Manutencao) => {
    if (!m.cliente_id) return true
    const existe = clientes.some((c) => c.id === m.cliente_id)
    return !existe
  }

  const getClientName = (m: Manutencao) => {
    if (m.expand?.cliente_id?.nome) return m.expand.cliente_id.nome
    const found = clientes.find((c) => c.id === m.cliente_id)
    if (found) return found.nome
    return 'Cliente Removido'
  }

  const getClientCity = (m: Manutencao) => {
    if (m.expand?.cliente_id?.cidade) return m.expand.cliente_id.cidade
    const found = clientes.find((c) => c.id === m.cliente_id)
    return found ? found.cidade : ''
  }

  const getServiceIcon = (tipo: string) => {
    switch (tipo) {
      case 'Limpeza':
        return <Droplets className="w-4 h-4 text-blue-500" />
      case 'Revisão Elétrica':
        return <Zap className="w-4 h-4 text-amber-500" />
      case 'Troca de Inversor':
        return <Settings className="w-4 h-4 text-purple-500" />
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />
    }
  }

  const handleItemClick = (m: Manutencao) => {
    if (isClienteOrfao(m)) {
      toast.info('Cliente não encontrado', {
        description: 'Este registro pertence a um cliente que foi removido do sistema.',
      })
      return
    }
    openFichaCliente(m.cliente_id)
  }

  const handleConfirmDelete = async () => {
    if (!manutencaoParaExcluir) return
    setIsDeleting(true)
    try {
      await removeManutencao(manutencaoParaExcluir.id)
      toast.success('Manutenção excluída com sucesso!')
      setManutencaoParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir manutenção:', err)
      toast.error('Não foi possível excluir o registro de manutenção.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Ordens de Serviço e Manutenções</h3>
          <p className="text-xs text-gray-500">
            Acompanhamento de revisões elétricas, limpezas e suporte a inversores
          </p>
        </div>
        <button
          onClick={onOpenNovaManutencao}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-120 hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Nova Manutenção
        </button>
      </div>

      {manutencoes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200">
          <Wrench className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-gray-800">Nenhuma manutenção agendada</h4>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            Cadastre novas ordens de serviço e revisões periódicas para sua carteira.
          </p>
          <button
            onClick={onOpenNovaManutencao}
            className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            Nova Manutenção
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Data do Serviço</th>
                  <th className="py-3.5 px-4">Tipo de Serviço</th>
                  <th className="py-3.5 px-4">Técnico</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {manutencoes.map((m) => {
                  const orfao = isClienteOrfao(m)
                  return (
                    <tr
                      key={m.id}
                      onClick={() => handleItemClick(m)}
                      className={`transition-colors group ${
                        orfao
                          ? 'bg-amber-50/20 hover:bg-amber-50/40 cursor-default'
                          : 'hover:bg-emerald-50/40 cursor-pointer'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold transition-colors ${
                              orfao
                                ? 'text-gray-600 italic'
                                : 'text-gray-900 group-hover:text-emerald-700'
                            }`}
                          >
                            {getClientName(m)}
                          </span>
                          {orfao && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <UserX className="w-3 h-3 text-amber-700" />
                              Cliente Removido
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">
                          {getClientCity(m) || (orfao ? 'Não vinculado' : '')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700 font-medium whitespace-nowrap">
                        {formatDate(m.data)}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {getServiceIcon(m.tipo)}
                          <span className="font-medium text-gray-800">{m.tipo}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {m.tecnico ? (
                          <span className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            {m.tecnico}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Não atribuído</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={m.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {orfao ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toast.info('Cliente removido', {
                                    description:
                                      'Este registro pertence a um cliente que foi removido do sistema.',
                                  })
                                }}
                                className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded border border-amber-200 transition-colors"
                              >
                                Não vinculado
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setManutencaoParaExcluir(m)
                                }}
                                className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                title="Excluir manutenção órfã"
                                aria-label="Excluir manutenção órfã"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-xs font-medium text-emerald-600 group-hover:text-emerald-800 group-hover:underline">
                              Ver ficha →
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {manutencoes.map((m) => {
              const orfao = isClienteOrfao(m)
              return (
                <div
                  key={m.id}
                  onClick={() => handleItemClick(m)}
                  className={`bg-white rounded-xl p-4 border shadow-xs transition-colors space-y-2.5 ${
                    orfao
                      ? 'border-amber-200 hover:border-amber-300 cursor-default'
                      : 'border-gray-200 hover:border-emerald-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4
                          className={`font-semibold text-sm ${
                            orfao ? 'text-gray-600 italic' : 'text-gray-900'
                          }`}
                        >
                          {getClientName(m)}
                        </h4>
                        {orfao && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Cliente Removido
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {getClientCity(m) || (orfao ? 'Não vinculado' : '')}
                      </p>
                    </div>
                    <StatusBadge status={m.status} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      {getServiceIcon(m.tipo)}
                      <span className="font-medium">{m.tipo}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(m.data)}</span>
                    </div>
                  </div>

                  {m.tecnico && (
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-gray-400" />
                      <span>Técnico: {m.tecnico}</span>
                    </div>
                  )}

                  {orfao && (
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-amber-700 italic">
                        Cliente excluído do sistema
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setManutencaoParaExcluir(m)
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir registro</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog
        open={Boolean(manutencaoParaExcluir)}
        onOpenChange={(open) => {
          if (!open) setManutencaoParaExcluir(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <AlertDialogTitle>Excluir Manutenção</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 text-xs text-gray-600">
              <p>
                Tem certeza que deseja excluir esta manutenção órfã agendada para{' '}
                <strong>
                  {manutencaoParaExcluir ? formatDate(manutencaoParaExcluir.data) : ''}
                </strong>
                ?
              </p>
              <p className="text-gray-500">
                Esta ação removerá permanentemente a ordem de serviço da base de dados e não poderá
                ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault()
                handleConfirmDelete()
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

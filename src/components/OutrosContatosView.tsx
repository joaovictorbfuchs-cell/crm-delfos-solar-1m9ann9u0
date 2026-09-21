import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Search,
  Trash2,
  Phone,
  Calendar,
  FileText,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
  Info,
  UserCheck,
  Building,
  Wrench,
  Users,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react'
import { OutroContato, OutroContatoTipo } from '@/types/crm'
import { fetchOutrosContatos, deleteOutroContato } from '@/services/crmService'
import { formatDateTime, formatWhatsAppPhone, cleanPhoneDigits } from '@/lib/formatters'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'

interface OutrosContatosViewProps {
  onTotalChange?: (total: number) => void
}

export function OutrosContatosView({ onTotalChange }: OutrosContatosViewProps) {
  const [contatos, setContatos] = useState<OutroContato[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')

  // Modais de detalhes e de exclusão
  const [contatoDetalhes, setContatoDetalhes] = useState<OutroContato | null>(null)
  const [contatoParaExcluir, setContatoParaExcluir] = useState<OutroContato | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Carregar contatos
  const carregarContatos = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }
        const data = await fetchOutrosContatos()
        setContatos(data)
        if (onTotalChange) {
          onTotalChange(data.length)
        }
      } catch (err) {
        console.error('Erro ao buscar outros contatos:', err)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [onTotalChange],
  )

  useEffect(() => {
    carregarContatos()
  }, [carregarContatos])

  // Exclusão individual
  const handleConfirmarExclusao = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!contatoParaExcluir) return

    try {
      setIsDeleting(true)
      await deleteOutroContato(contatoParaExcluir.id)
      setContatos((prev) => {
        const updated = prev.filter((c) => c.id !== contatoParaExcluir.id)
        if (onTotalChange) {
          onTotalChange(updated.length)
        }
        return updated
      })
      setContatoParaExcluir(null)
    } catch (err) {
      console.error('Erro ao excluir contato:', err)
      alert('Erro ao excluir o contato. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Filtragem
  const contatosFiltrados = useMemo(() => {
    return contatos.filter((c) => {
      // Filtro de tipo
      if (filtroTipo !== 'todos' && c.tipo_contato !== filtroTipo) {
        return false
      }

      // Busca por nome ou telefone
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const termoDigitos = cleanPhoneDigits(termo)
        const nomeMatch = (c.nome || '').toLowerCase().includes(termo)
        const telDigitos = cleanPhoneDigits(c.telefone || '')
        const telCru = (c.telefone || '').toLowerCase()
        const telMatch =
          telCru.includes(termo) || (termoDigitos.length > 0 && telDigitos.includes(termoDigitos))

        if (!nomeMatch && !telMatch) {
          return false
        }
      }

      return true
    })
  }, [contatos, busca, filtroTipo])

  // Helpers de formatação do WhatsApp
  const renderWhatsAppLink = (telefoneCru: string | undefined) => {
    if (!telefoneCru) return null
    const digitos = cleanPhoneDigits(telefoneCru)
    if (!digitos || digitos === '00000000000' || digitos.length < 8) {
      return (
        <span className="text-gray-400 italic text-xs flex items-center gap-1">
          <Phone className="w-3.5 h-3.5 text-gray-300" />
          Não informado
        </span>
      )
    }

    const telFormatado = formatWhatsAppPhone(telefoneCru)
    const ddi = digitos.startsWith('55') ? digitos : `55${digitos}`

    return (
      <a
        href={`https://wa.me/${ddi}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-semibold group/wa transition-colors text-xs"
        title="Abrir conversa no WhatsApp"
      >
        <span className="w-5 h-5 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover/wa:bg-emerald-200 transition-colors">
          <Phone className="w-3 h-3 text-emerald-700" />
        </span>
        <span className="underline decoration-emerald-300 underline-offset-2">{telFormatado}</span>
        <ExternalLink className="w-3 h-3 text-emerald-500 opacity-70 group-hover/wa:opacity-100" />
      </a>
    )
  }

  // Helper de badge de tipo de contato
  const renderTipoBadge = (tipo: OutroContatoTipo | string) => {
    switch (tipo) {
      case 'fornecedor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
            <Building className="w-3 h-3 text-purple-600" />
            Fornecedor
          </span>
        )
      case 'instalador':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
            <Wrench className="w-3 h-3 text-amber-600" />
            Instalador
          </span>
        )
      case 'parceiro':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
            <UserCheck className="w-3 h-3 text-blue-600" />
            Parceiro
          </span>
        )
      case 'outro':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-800 border border-gray-200 shadow-2xs">
            <Users className="w-3 h-3 text-gray-500" />
            Outro Contato
          </span>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="h-[50vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando lista de outros contatos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Banner Explicativo amigável para usuário leigo */}
      <div className="rounded-xl bg-gradient-to-r from-blue-50/80 via-emerald-50/60 to-white border border-blue-200/80 p-4 flex items-start justify-between gap-4 shadow-2xs">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-800 rounded-xl shrink-0">
            <Sparkles className="w-5 h-5 text-blue-700" />
          </div>
          <div className="text-xs text-slate-700 leading-relaxed">
            <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>Outros Contatos e Histórico do Funil</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {contatos.length} {contatos.length === 1 ? 'registro' : 'registros'}
              </span>
            </p>
            <p className="mt-1 leading-relaxed text-slate-600">
              Esta lista reúne parceiros, fornecedores, instaladores e leads movidos do funil
              comercial pela ação{' '}
              <strong className="text-blue-900 font-semibold">"Mover para contatos"</strong>. Todos
              os dados originais (etapa anterior, e-mail, CPF/CNPJ, potência, endereço e
              observações) foram consolidados na observação de cada contato.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => carregarContatos(true)}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-semibold transition-all shrink-0 shadow-2xs disabled:opacity-50"
          title="Recarregar lista"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}
          />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="bg-white rounded-xl border border-gray-200/90 p-3.5 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Campo Busca */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou telefone..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/70 focus:bg-white transition-colors"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro de Categoria e Contador */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 font-medium">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-medium text-gray-700 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="todos">Todos os tipos ({contatos.length})</option>
              <option value="outro">Outro Contato</option>
              <option value="fornecedor">Fornecedor</option>
              <option value="instalador">Instalador</option>
              <option value="parceiro">Parceiro</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 flex items-center gap-1 pl-2 border-l border-gray-200">
            <span>Mostrando:</span>
            <strong className="text-gray-800 font-bold">{contatosFiltrados.length}</strong>
            <span>de</span>
            <strong className="text-gray-800 font-bold">{contatos.length}</strong>
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Contatos */}
      {contatosFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-gray-200/90 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-blue-500" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">
            {busca || filtroTipo !== 'todos' ? 'Nenhum contato encontrado' : 'Nenhum contato aqui'}
          </h4>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            {busca || filtroTipo !== 'todos'
              ? 'Nenhum resultado corresponde à sua pesquisa. Tente limpar os filtros ou o termo de busca.'
              : 'Os contatos movidos do funil de vendas aparecem nesta lista.'}
          </p>
          {(busca || filtroTipo !== 'todos') && (
            <button
              type="button"
              onClick={() => {
                setBusca('')
                setFiltroTipo('todos')
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpar busca e filtros
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tabela Desktop */}
          <div className="hidden lg:block bg-white rounded-xl border border-gray-200/90 shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nome do Contato</th>
                  <th className="py-3 px-4">Telefone / WhatsApp</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Data de Criação</th>
                  <th className="py-3 px-4 min-w-[280px]">Observações / Detalhes</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contatosFiltrados.map((contato) => {
                  const obs = (contato.observacao || '').trim()
                  const obsLinhas = obs ? obs.split('\n') : []
                  const primeiraLinhaObs = obsLinhas[0] || ''

                  return (
                    <tr key={contato.id} className="hover:bg-blue-50/30 transition-colors group">
                      {/* Nome */}
                      <td className="py-3.5 px-4 font-bold text-gray-900 group-hover:text-blue-900 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(contato.nome || 'C').charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[220px]" title={contato.nome}>
                            {contato.nome || 'Sem nome'}
                          </span>
                        </div>
                      </td>

                      {/* Telefone com wa.me */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderWhatsAppLink(contato.telefone)}
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderTipoBadge(contato.tipo_contato)}
                      </td>

                      {/* Data de criação (pt-BR) */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-gray-500">
                        <div className="flex items-center gap-1.5" title={contato.created}>
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{formatDateTime(contato.created)}</span>
                        </div>
                      </td>

                      {/* Observações multi-linha truncadas com botão de expandir */}
                      <td className="py-3.5 px-4 max-w-[340px]">
                        {obs ? (
                          <div className="flex items-start justify-between gap-2">
                            <div className="text-gray-600 line-clamp-2 leading-relaxed" title={obs}>
                              {primeiraLinhaObs && (
                                <span className="text-[11px] font-semibold text-slate-800 block truncate">
                                  {primeiraLinhaObs}
                                </span>
                              )}
                              {obsLinhas.length > 1 && (
                                <span className="text-[11px] text-gray-500 block truncate">
                                  {obsLinhas.slice(1).join(' • ')}
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => setContatoDetalhes(contato)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline shrink-0 px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                              title="Ver observação completa"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ver detalhes</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">
                            Sem observação registrada
                          </span>
                        )}
                      </td>

                      {/* Ações (Excluir) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {obs && (
                            <button
                              type="button"
                              onClick={() => setContatoDetalhes(contato)}
                              className="p-1.5 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Ver detalhes completos"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setContatoParaExcluir(contato)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={`Excluir "${contato.nome}"`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile (< lg) */}
          <div className="lg:hidden space-y-2.5">
            {contatosFiltrados.map((contato) => {
              const obs = (contato.observacao || '').trim()

              return (
                <div
                  key={contato.id}
                  className="bg-white rounded-xl border border-gray-200/90 p-3.5 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {(contato.nome || 'C').charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{contato.nome}</h4>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {formatDateTime(contato.created)}
                        </span>
                      </div>
                    </div>
                    {renderTipoBadge(contato.tipo_contato)}
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                    <div>{renderWhatsAppLink(contato.telefone)}</div>

                    <div className="flex items-center gap-1">
                      {obs && (
                        <button
                          type="button"
                          onClick={() => setContatoDetalhes(contato)}
                          className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Detalhes</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setContatoParaExcluir(contato)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {obs && (
                    <div className="bg-gray-50 rounded-lg p-2 text-[11px] text-gray-600 line-clamp-2">
                      {obs}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Dialog Detalhes da Observação (quebra de linha preservada) */}
      <Dialog
        open={Boolean(contatoDetalhes)}
        onOpenChange={(open) => !open && setContatoDetalhes(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                <FileText className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <DialogTitle className="text-base text-gray-900 font-bold">
                  {contatoDetalhes?.nome}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-500">
                  Criado em {formatDateTime(contatoDetalhes?.created)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {/* Informações básicas */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  Tipo de Contato
                </span>
                <span className="font-semibold text-gray-800 capitalize">
                  {contatoDetalhes?.tipo_contato === 'outro'
                    ? 'Outro Contato'
                    : contatoDetalhes?.tipo_contato}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">
                  WhatsApp / Telefone
                </span>
                <div className="mt-0.5">{renderWhatsAppLink(contatoDetalhes?.telefone)}</div>
              </div>
            </div>

            {/* Observação com quebra de linha preservada */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Histórico e Observações Consolidadas
              </span>
              <div className="bg-slate-900 text-slate-100 rounded-xl p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-[320px] overflow-y-auto border border-slate-800 shadow-inner select-text">
                {contatoDetalhes?.observacao || 'Nenhuma observação registrada.'}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setContatoDetalhes(null)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão Individual */}
      <AlertDialog
        open={Boolean(contatoParaExcluir)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setContatoParaExcluir(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertCircle className="w-5 h-5" />
              <AlertDialogTitle>Excluir Contato</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm text-gray-600">
              Tem certeza que deseja excluir o contato{' '}
              <strong className="text-gray-900 font-semibold">"{contatoParaExcluir?.nome}"</strong>?
              Esta ação removerá o registro permanentemente da lista de Outros Contatos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} onClick={() => setContatoParaExcluir(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={handleConfirmarExclusao}
              className="bg-red-600 hover:bg-red-700 text-white focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Confirmar Exclusão'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default OutrosContatosView

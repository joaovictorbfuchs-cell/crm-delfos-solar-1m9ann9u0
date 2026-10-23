import React, { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  ShieldCheck,
  Search,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Plus,
  User,
  MapPin,
  Zap,
  X,
  FileText,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { Cliente, PropostaOM } from '@/types/crm'
import { formatDateShort } from '@/lib/formatters'

export interface ModalSelecionarClienteContratoOMProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContratoIniciado: (cliente: Cliente, propostaAprovada: PropostaOM) => void
  onCriarPropostaParaCliente?: (clienteId: string) => void
  initialClienteId?: string
}

export const ModalSelecionarClienteContratoOM: React.FC<ModalSelecionarClienteContratoOMProps> = ({
  open,
  onOpenChange,
  onContratoIniciado,
  onCriarPropostaParaCliente,
  initialClienteId,
}) => {
  const { clientes, propostasOM, contratosOM } = useClientes()
  const [busca, setBusca] = useState('')
  const [clienteSelecionadoId, setClienteSelecionadoId] = useState<string | null>(null)
  const [abaFiltro, setAbaFiltro] = useState<'aprovados' | 'todos'>('aprovados')

  // Ao abrir com initialClienteId, verificar se o cliente tem proposta aprovada
  React.useEffect(() => {
    if (open && initialClienteId) {
      const cli = clientes.find((c) => c.id === initialClienteId)
      if (cli) {
        const aprovadas = propostasOM.filter(
          (p) =>
            p.cliente_id === initialClienteId &&
            ['aprovada', 'aprovado'].includes((p.status || '').toLowerCase().trim()),
        )
        if (aprovadas.length > 0) {
          aprovadas.sort((a, b) => {
            const timeA = new Date(a.data_proposta || a.created || 0).getTime()
            const timeB = new Date(b.data_proposta || b.created || 0).getTime()
            return timeB - timeA
          })
          onContratoIniciado(cli, aprovadas[0])
          onOpenChange(false)
        } else {
          setClienteSelecionadoId(initialClienteId)
          setAbaFiltro('todos')
        }
      }
    }
  }, [open, initialClienteId, clientes, propostasOM, onContratoIniciado, onOpenChange])

  // Mapeia propostas aprovadas por cliente (mais recente primeiro)
  const propostasAprovadasPorCliente = useMemo(() => {
    const mapa = new Map<string, PropostaOM[]>()
    const aprovadas = propostasOM.filter((p) => {
      const s = (p.status || '').toLowerCase().trim()
      return s === 'aprovada' || s === 'aprovado'
    })

    // Ordenar mais recentes primeiro
    aprovadas.sort((a, b) => {
      const timeA = new Date(a.data_proposta || a.created || 0).getTime()
      const timeB = new Date(b.data_proposta || b.created || 0).getTime()
      return timeB - timeA
    })

    for (const prop of aprovadas) {
      if (!prop.cliente_id) continue
      const list = mapa.get(prop.cliente_id) || []
      list.push(prop)
      mapa.set(prop.cliente_id, list)
    }
    return mapa
  }, [propostasOM])

  // Total de clientes com proposta aprovada
  const clientesComPropostaAprovada = useMemo(() => {
    return clientes.filter((c) => propostasAprovadasPorCliente.has(c.id))
  }, [clientes, propostasAprovadasPorCliente])

  // Lista filtrada de clientes com base na busca e na sub-aba
  const clientesFiltrados = useMemo(() => {
    const base = abaFiltro === 'aprovados' ? clientesComPropostaAprovada : clientes
    const termo = busca.toLowerCase().trim()

    if (!termo) return base

    return base.filter((c) => {
      const nome = (c.nome || '').toLowerCase()
      const razao = (c.razao_social || '').toLowerCase()
      const doc = (c.cpf || c.cnpj || '').toLowerCase()
      const cidade = (c.cidade || '').toLowerCase()
      return (
        nome.includes(termo) ||
        razao.includes(termo) ||
        doc.includes(termo) ||
        cidade.includes(termo)
      )
    })
  }, [clientes, clientesComPropostaAprovada, abaFiltro, busca])

  // Cliente atualmente selecionado para inspeção
  const clienteSelecionado = useMemo(() => {
    if (!clienteSelecionadoId) return null
    return clientes.find((c) => c.id === clienteSelecionadoId) || null
  }, [clientes, clienteSelecionadoId])

  // Propostas de qualquer status do cliente selecionado
  const propostasDoCliente = useMemo(() => {
    if (!clienteSelecionadoId) return []
    return propostasOM
      .filter((p) => p.cliente_id === clienteSelecionadoId)
      .sort((a, b) => {
        const timeA = new Date(a.data_proposta || a.created || 0).getTime()
        const timeB = new Date(b.data_proposta || b.created || 0).getTime()
        return timeB - timeA
      })
  }, [propostasOM, clienteSelecionadoId])

  // Proposta aprovada mais recente do cliente selecionado (se houver)
  const propostaAprovadaRecente = useMemo(() => {
    if (!clienteSelecionadoId) return null
    const aprovadas = propostasAprovadasPorCliente.get(clienteSelecionadoId)
    return aprovadas && aprovadas.length > 0 ? aprovadas[0] : null
  }, [propostasAprovadasPorCliente, clienteSelecionadoId])

  const handleSelecionarCliente = (cliente: Cliente) => {
    setClienteSelecionadoId(cliente.id)
    const aprovadas = propostasAprovadasPorCliente.get(cliente.id)
    if (aprovadas && aprovadas.length > 0) {
      // Iniciar fluxo canônico diretamente com a proposta aprovada mais recente
      onContratoIniciado(cliente, aprovadas[0])
      onOpenChange(false)
      setClienteSelecionadoId(null)
      setBusca('')
    }
  }

  const handleGerarContratoComProposta = (cliente: Cliente, proposta: PropostaOM) => {
    onContratoIniciado(cliente, proposta)
    onOpenChange(false)
    setClienteSelecionadoId(null)
    setBusca('')
  }

  const handleFechar = () => {
    onOpenChange(false)
    setClienteSelecionadoId(null)
    setBusca('')
  }

  return (
    <Dialog open={open} onOpenChange={handleFechar}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-[#F9FAFB]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-gray-900">
                Novo Contrato O&amp;M — Selecionar Cliente
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                O contrato O&amp;M canônico é gerado a partir de uma proposta O&amp;M aprovada pelo
                cliente.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Corpo com busca e lista */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Seletor de abas: Aprovados vs Todos */}
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAbaFiltro('aprovados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  abaFiltro === 'aprovados'
                    ? 'bg-emerald-100 text-emerald-800 shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                Prontos para Contrato ({clientesComPropostaAprovada.length})
              </button>
              <button
                type="button"
                onClick={() => setAbaFiltro('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  abaFiltro === 'todos'
                    ? 'bg-gray-800 text-white shadow-2xs'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                Todos os Clientes ({clientes.length})
              </button>
            </div>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente por nome, documento ou cidade..."
              className="pl-9 pr-8 text-xs h-9 bg-gray-50/50 hover:bg-white focus:bg-white"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Alerta orientador quando um cliente sem proposta aprovada for selecionado */}
          {clienteSelecionado && !propostaAprovadaRecente && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-xs text-amber-950">
                    Este cliente não tem proposta O&amp;M aprovada.
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Aprove ou crie uma proposta antes de gerar o contrato. O contrato O&amp;M
                    oficial utiliza os cálculos dos planos, equipamentos e anexo II validados na
                    proposta comercial.
                  </p>
                </div>
              </div>

              {propostasDoCliente.length > 0 ? (
                <div className="bg-white/80 rounded-lg p-3 border border-amber-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-600" />
                    <span>Propostas O&amp;M cadastradas deste cliente:</span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {propostasDoCliente.map((prop) => (
                      <div
                        key={prop.id}
                        className="flex items-center justify-between text-xs p-2 rounded-md bg-amber-50/50 border border-amber-100"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">
                            {prop.numero_proposta || prop.id}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Plano {prop.plano_escolhido || 'Essencial'}
                          </span>
                          <Badge className="text-[10px] bg-blue-50 text-blue-800 border-blue-200">
                            {prop.status || 'Proposta Enviada'}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatDateShort(prop.data_proposta || prop.created)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-amber-900 font-medium pt-1">
                    💡 Para emitir o contrato agora, altere o status da proposta para{' '}
                    <strong>"Aprovada"</strong> na tabela da aba O&amp;M.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-amber-800 italic">
                  Nenhuma proposta O&amp;M foi cadastrada ainda para{' '}
                  <strong>{clienteSelecionado.nome}</strong>.
                </p>
              )}

              <div className="flex items-center gap-2 pt-1">
                {onCriarPropostaParaCliente && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      onOpenChange(false)
                      onCriarPropostaParaCliente(clienteSelecionado.id)
                    }}
                    className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Criar Proposta O&amp;M para {clienteSelecionado.nome.split(' ')[0]}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClienteSelecionadoId(null)}
                  className="text-xs"
                >
                  Voltar à lista
                </Button>
              </div>
            </div>
          )}

          {/* Lista de Clientes */}
          <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {clientesFiltrados.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                {abaFiltro === 'aprovados' && !busca ? (
                  <div className="space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="font-bold text-gray-800">
                      Nenhum cliente possui proposta O&amp;M aprovada no momento.
                    </p>
                    <p className="text-gray-500 max-w-sm mx-auto">
                      Aprove uma proposta existente na aba O&amp;M ou crie uma nova proposta para
                      avançar para a emissão do contrato.
                    </p>
                    <button
                      type="button"
                      onClick={() => setAbaFiltro('todos')}
                      className="text-xs font-bold text-emerald-700 hover:underline pt-1 inline-block"
                    >
                      Ver todos os clientes cadastrados
                    </button>
                  </div>
                ) : (
                  <p>Nenhum cliente encontrado para os critérios informados.</p>
                )}
              </div>
            ) : (
              clientesFiltrados.map((cli) => {
                const aprovadas = propostasAprovadasPorCliente.get(cli.id) || []
                const temAprovada = aprovadas.length > 0
                const isSelected = clienteSelecionadoId === cli.id

                return (
                  <div
                    key={cli.id}
                    onClick={() => handleSelecionarCliente(cli)}
                    className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-gray-900 truncate">{cli.nome}</span>
                        {temAprovada ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {aprovadas.length}{' '}
                            {aprovadas.length === 1 ? 'proposta aprovada' : 'propostas aprovadas'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                            Sem proposta aprovada
                          </span>
                        )}
                        {(() => {
                          const contratosCli = (contratosOM || []).filter(
                            (ct) =>
                              ct.cliente_id === cli.id &&
                              ct.status !== 'Encerrado' &&
                              ct.status !== 'Cancelado' &&
                              ct.status_encerramento !== 'encerrado',
                          )
                          if (contratosCli.length === 0) return null
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              {contratosCli.length}{' '}
                              {contratosCli.length === 1 ? 'contrato ativo' : 'contratos ativos'}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {cli.cidade || 'Erechim/RS'}
                        </span>
                        {(cli.cpf || cli.cnpj) && (
                          <>
                            <span>•</span>
                            <span>{cli.cpf || cli.cnpj}</span>
                          </>
                        )}
                        {cli.potencia_kwp ? (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                              <Zap className="w-3 h-3" />
                              {cli.potencia_kwp} kWp
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {temAprovada ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleGerarContratoComProposta(cli, aprovadas[0])
                          }}
                          className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold h-8 px-3"
                        >
                          <FileCheck className="w-3.5 h-3.5 mr-1" />
                          Gerar Contrato
                        </Button>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-400 group-hover:text-gray-600">
                          Selecionar
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>
            {clientesComPropostaAprovada.length} cliente(s) pronto(s) para contrato O&amp;M
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFechar}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

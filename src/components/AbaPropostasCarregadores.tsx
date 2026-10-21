import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Zap,
  Plus,
  Search,
  Printer,
  Mail,
  MessageSquare,
  Edit,
  Trash2,
  Calendar,
  Loader2,
  FileText,
  MapPin,
  User,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDateShort } from '@/lib/formatters'
import { formatarDataBr } from '@/lib/propostaCarregadorGenerator'
import type { PropostaCarregador } from '@/types/crm'
import {
  getPropostasCarregador,
  updateStatusPropostaCarregador,
  deletePropostaCarregador,
} from '@/services/propostasCarregadorService'
import { ModalGerarPropostaCarregador } from './ModalGerarPropostaCarregador'
import { PreviewPropostaCarregadorDocumento } from './PreviewPropostaCarregadorDocumento'
import { ModalEnviarPropostaCarregadorEmail } from './ModalEnviarPropostaCarregadorEmail'
import { ModalEnviarPropostaCarregadorWhatsApp } from './ModalEnviarPropostaCarregadorWhatsApp'

export const AbaPropostasCarregadores: React.FC = () => {
  const { toast } = useToast()
  const { clientes } = useClientes()

  const [propostas, setPropostas] = useState<PropostaCarregador[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Modais de Criação/Edição e Visualização
  const [modalCriarOpen, setModalCriarOpen] = useState(false)
  const [propostaEmEdicao, setPropostaEmEdicao] = useState<PropostaCarregador | null>(null)

  const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false)
  const [propostaVisualizando, setPropostaVisualizando] = useState<PropostaCarregador | null>(null)

  // Modais de Disparo E-mail e WhatsApp
  const [modalEmailOpen, setModalEmailOpen] = useState(false)
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false)
  const [propostaParaDisparo, setPropostaParaDisparo] = useState<PropostaCarregador | null>(null)

  const carregarPropostas = async () => {
    setLoading(true)
    try {
      const lista = await getPropostasCarregador()
      setPropostas(lista)
    } catch (err) {
      console.error('Erro ao carregar propostas de carregador:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as propostas de carregadores veiculares.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarPropostas()
  }, [])

  const handleExcluir = async (p: PropostaCarregador, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!window.confirm(`Deseja realmente excluir a proposta ${p.numero_proposta}?`)) {
      return
    }
    try {
      await deletePropostaCarregador(p.id)
      setPropostas((prev) => prev.filter((item) => item.id !== p.id))
      toast({
        title: 'Proposta excluída',
        description: `Proposta ${p.numero_proposta} removida com sucesso.`,
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir proposta.',
        variant: 'destructive',
      })
    }
  }

  const handleMudarStatus = async (
    p: PropostaCarregador,
    novoStatus: PropostaCarregador['status'],
    e?: React.MouseEvent,
  ) => {
    if (e) e.stopPropagation()
    try {
      const atualizada = await updateStatusPropostaCarregador(p.id, novoStatus)
      setPropostas((prev) => prev.map((item) => (item.id === p.id ? atualizada : item)))
      toast({
        title: 'Status atualizado',
        description: `Proposta ${p.numero_proposta} agora está "${novoStatus}".`,
      })
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status.',
        variant: 'destructive',
      })
    }
  }

  const propostasFiltradas = useMemo(() => {
    return propostas.filter((p) => {
      const termo = busca.toLowerCase()
      const matchBusca =
        !termo ||
        (p.numero_proposta && p.numero_proposta.toLowerCase().includes(termo)) ||
        (p.cliente_nome && p.cliente_nome.toLowerCase().includes(termo)) ||
        (p.endereco_instalacao && p.endereco_instalacao.toLowerCase().includes(termo))

      const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
      return matchBusca && matchStatus
    })
  }, [propostas, busca, filtroStatus])

  return (
    <div className="space-y-4 w-full">
      {/* Barra de Filtros e Busca Padronizada */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-xl w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente, nº ou endereço..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 text-xs py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full sm:w-48 text-xs bg-white rounded-xl border-gray-200">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Em elaboração">Em elaboração</SelectItem>
                <SelectItem value="Enviado ao cliente">Enviado ao cliente</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Rejeitado">Rejeitado</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={carregarPropostas}
              className="gap-1.5 text-xs shrink-0 rounded-xl"
              title="Recarregar propostas"
            >
              <Loader2 className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela de Propostas ou Estado Vazio */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#047857]" />
          <p className="text-sm">Carregando propostas de carregadores veiculares...</p>
        </div>
      ) : propostasFiltradas.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-[#047857]">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Nenhuma proposta de carregador encontrada
            </h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Crie a primeira proposta comercial Wallbox para clientes residenciais, comércios ou
              frotas com o modelo oficial da Delfos Engenharia.
            </p>
            <Button
              onClick={() => {
                setPropostaEmEdicao(null)
                setModalCriarOpen(true)
              }}
              className="bg-[#047857] hover:bg-[#065f46] text-white gap-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              Criar Proposta de Carregador
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden w-full">
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={150}>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Cliente &amp; Cidade</th>
                    <th className="py-3 px-3 whitespace-nowrap">Equipamento / Modelo</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Potência</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">Investimento Total</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 text-center whitespace-nowrap">Data</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {propostasFiltradas.map((p) => {
                    const clienteObj = clientes.find((c) => c.id === p.cliente_id)
                    const nomeCliente =
                      p.cliente_nome ||
                      clienteObj?.razao_social ||
                      clienteObj?.nome ||
                      'Cliente não identificado'

                    const cidadeStr =
                      p.endereco_instalacao || clienteObj?.cidade || 'Endereço não informado'
                    const modeloCarregador =
                      p.carregador_modelo ||
                      (p.carregador_adquirido ? 'Carregador Adquirido' : 'Wallbox Homologado')
                    const potenciaStr =
                      p.carregador_potencia ||
                      (p.opcao2_potencia ? p.opcao2_potencia : '7,4 kW / 22 kW')
                    const valorTotal = p.valor_total || 0

                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          setPropostaVisualizando(p)
                          setModalVisualizarOpen(true)
                        }}
                        className="hover:bg-emerald-50/30 cursor-pointer transition-colors group"
                      >
                        {/* Cliente & Cidade */}
                        <td className="py-3 px-4 min-w-[200px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {nomeCliente}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                              {p.numero_proposta || 'PROP'}
                            </span>
                            {p.carregador_adquirido && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                Adquirido
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                            <span className="truncate max-w-[280px]">{cidadeStr}</span>
                            <span className="text-gray-300">•</span>
                            <span className="capitalize">
                              {p.tipo_local || 'Residencial / Comercial'}
                            </span>
                          </div>
                        </td>

                        {/* Equipamento / Modelo */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-gray-800 text-[11px] flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                            <span className="truncate max-w-[220px]">{modeloCarregador}</span>
                          </div>
                        </td>

                        {/* Potência */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="font-bold text-gray-900 text-xs tabular-nums">
                            {potenciaStr}
                          </span>
                        </td>

                        {/* Investimento Total */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="font-black text-[#047857] text-sm tabular-nums leading-tight">
                            {formatCurrency(valorTotal)}
                          </div>
                        </td>

                        {/* Seletor Rápido de Status */}
                        <td
                          className="py-3 px-3 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={p.status}
                            onChange={(e) =>
                              handleMudarStatus(
                                p,
                                e.target.value as PropostaCarregador['status'],
                                e as unknown as React.MouseEvent,
                              )
                            }
                            className="text-[11px] font-semibold py-1 px-1.5 rounded border border-gray-200 bg-white text-gray-700 hover:border-gray-300 focus:outline-none shrink-0"
                            title="Mudar status rapidamente"
                          >
                            <option value="Em elaboração">Em elaboração</option>
                            <option value="Enviado ao cliente">Enviado ao cliente</option>
                            <option value="Aprovado">Aprovado</option>
                            <option value="Rejeitado">Rejeitado</option>
                          </select>
                        </td>

                        {/* Data */}
                        <td className="py-3 px-3 text-center text-gray-500 text-[11px] whitespace-nowrap font-medium tabular-nums">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>{formatDateShort(p.data_emissao || p.created)}</span>
                          </div>
                        </td>

                        {/* 4 Ícones de Ação mantidos + Excluir */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* 1. Visualizar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPropostaVisualizando(p)
                                    setModalVisualizarOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg bg-gray-50 text-slate-700 border border-gray-200 hover:bg-emerald-50 hover:text-[#047857] hover:border-emerald-300 transition-all shadow-2xs shrink-0 cursor-pointer"
                                  aria-label="Visualizar proposta"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Visualizar proposta</span>
                              </TooltipContent>
                            </Tooltip>

                            {/* 2. E-mail */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPropostaParaDisparo(p)
                                    setModalEmailOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg bg-gray-50 text-slate-700 border border-gray-200 hover:bg-emerald-50 hover:text-[#047857] hover:border-emerald-300 transition-all shadow-2xs shrink-0 cursor-pointer"
                                  aria-label="Enviar por E-mail"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Enviar por E-mail</span>
                              </TooltipContent>
                            </Tooltip>

                            {/* 3. WhatsApp */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPropostaParaDisparo(p)
                                    setModalWhatsAppOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg bg-gray-50 text-slate-700 border border-gray-200 hover:bg-emerald-50 hover:text-[#25D366] hover:border-emerald-300 transition-all shadow-2xs shrink-0 cursor-pointer"
                                  aria-label="Enviar via WhatsApp"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Enviar via WhatsApp</span>
                              </TooltipContent>
                            </Tooltip>

                            {/* 4. Editar */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPropostaEmEdicao(p)
                                    setModalCriarOpen(true)
                                  }}
                                  className="p-1.5 rounded-lg bg-gray-50 text-slate-700 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-2xs shrink-0 cursor-pointer"
                                  aria-label="Editar proposta"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span>Editar proposta</span>
                              </TooltipContent>
                            </Tooltip>

                            {/* Excluir */}
                            <button
                              type="button"
                              onClick={(e) => handleExcluir(p, e)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer ml-1"
                              title="Excluir proposta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TooltipProvider>
          </div>
        </div>
      )}

      {/* Modal Gerador / Editor de Proposta */}
      <ModalGerarPropostaCarregador
        open={modalCriarOpen}
        onOpenChange={setModalCriarOpen}
        propostaExistente={propostaEmEdicao}
        onSalvo={(salva) => {
          setPropostas((prev) => {
            const idx = prev.findIndex((item) => item.id === salva.id)
            if (idx >= 0) {
              const copy = [...prev]
              copy[idx] = salva
              return copy
            }
            return [salva, ...prev]
          })
        }}
      />

      {/* Modal de Visualização Completa do Documento A4 */}
      <Dialog open={modalVisualizarOpen} onOpenChange={setModalVisualizarOpen}>
        <DialogContent className="max-w-5xl w-full h-[90vh] max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="no-print px-6 py-3 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#047857]" />
              Visualização da Proposta — {propostaVisualizando?.numero_proposta}
            </DialogTitle>
            <div className="flex items-center gap-2 pr-6">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="text-xs gap-1.5 border-slate-300 hover:bg-slate-50 cursor-pointer"
                title="Imprimir ou Salvar em PDF (A4 sem barras)"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                Imprimir / Salvar PDF
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  if (propostaVisualizando) {
                    setPropostaParaDisparo(propostaVisualizando)
                    setModalWhatsAppOpen(true)
                  }
                }}
                className="bg-[#25D366] hover:bg-[#20ba59] text-white text-xs gap-1.5 font-semibold cursor-pointer"
                title="Enviar por WhatsApp (Link com URL ou PDF anexado)"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                WhatsApp
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  if (propostaVisualizando) {
                    setPropostaParaDisparo(propostaVisualizando)
                    setModalEmailOpen(true)
                  }
                }}
                className="bg-[#047857] hover:bg-[#065f46] text-white text-xs gap-1.5 cursor-pointer"
                title="Enviar por E-mail"
              >
                <Mail className="w-3.5 h-3.5" />
                E-mail
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100">
            {propostaVisualizando && (
              <PreviewPropostaCarregadorDocumento dados={propostaVisualizando} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Enviar E-mail */}
      {propostaParaDisparo && (
        <ModalEnviarPropostaCarregadorEmail
          open={modalEmailOpen}
          onOpenChange={setModalEmailOpen}
          proposta={propostaParaDisparo}
          clienteEmail={clientes.find((c) => c.id === propostaParaDisparo.cliente_id)?.email}
          onEnviado={() => carregarPropostas()}
        />
      )}

      {/* Modal Enviar WhatsApp */}
      {propostaParaDisparo && (
        <ModalEnviarPropostaCarregadorWhatsApp
          open={modalWhatsAppOpen}
          onOpenChange={setModalWhatsAppOpen}
          proposta={propostaParaDisparo}
          clienteTelefone={
            clientes.find((c) => c.id === propostaParaDisparo.cliente_id)?.whatsapp ||
            clientes.find((c) => c.id === propostaParaDisparo.cliente_id)?.telefone
          }
        />
      )}
    </div>
  )
}
export default AbaPropostasCarregadores

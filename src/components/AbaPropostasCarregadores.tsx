import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  Building,
  DollarSign,
  Loader2,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency } from '@/lib/formatters'
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

  const handleExcluir = async (p: PropostaCarregador) => {
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
    } catch (err) {
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
  ) => {
    try {
      const atualizada = await updateStatusPropostaCarregador(p.id, novoStatus)
      setPropostas((prev) => prev.map((item) => (item.id === p.id ? atualizada : item)))
      toast({
        title: 'Status atualizado',
        description: `Proposta ${p.numero_proposta} agora está "${novoStatus}".`,
      })
    } catch (err) {
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

  const getBadgeStatusColor = (status: PropostaCarregador['status']) => {
    switch (status) {
      case 'Aprovado':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300'
      case 'Enviado ao cliente':
        return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'Rejeitado':
        return 'bg-rose-100 text-rose-800 border-rose-300'
      default:
        return 'bg-amber-100 text-amber-800 border-amber-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner Informativo Superior da Nova Linha de Carregadores */}

      {/* Barra de Filtros e Busca */}
      <Card className="border-slate-200 shadow-2xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por cliente, nº ou endereço..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-full sm:w-48 text-xs bg-white">
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
                className="gap-1 text-xs shrink-0"
                title="Recarregar propostas"
              >
                <Loader2 className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Propostas ou Estado Vazio */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {propostasFiltradas.map((p) => {
            const clienteObj = clientes.find((c) => c.id === p.cliente_id)
            return (
              <Card
                key={p.id}
                className="border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {p.numero_proposta || 'PROP'}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${getBadgeStatusColor(p.status)}`}
                    >
                      {p.status}
                    </Badge>
                  </div>

                  <CardTitle className="text-sm font-bold text-slate-900 line-clamp-1">
                    {p.cliente_nome || clienteObj?.razao_social || clienteObj?.nome || 'Cliente'}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 line-clamp-1">
                    {p.endereco_instalacao || 'Endereço não informado'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3">
                  <div className="bg-slate-50 rounded p-2.5 space-y-1.5 text-xs border border-slate-100">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Investimento Total:</span>
                      <strong className="text-[#047857] text-sm">
                        {formatCurrency(p.valor_total || 8400)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Emissão:</span>
                      <span>{formatarDataBr(p.data_emissao) || 'Hoje'}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>Local:</span>
                      <span>{p.tipo_local || 'Residencial / Comercial'}</span>
                    </div>
                  </div>

                  {/* Alterar Status Rápido */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Status:</span>
                    <select
                      value={p.status}
                      onChange={(e) =>
                        handleMudarStatus(p, e.target.value as PropostaCarregador['status'])
                      }
                      className="text-xs bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-emerald-500 flex-1"
                    >
                      <option value="Em elaboração">Em elaboração</option>
                      <option value="Enviado ao cliente">Enviado ao cliente</option>
                      <option value="Aprovado">Aprovado</option>
                      <option value="Rejeitado">Rejeitado</option>
                    </select>
                  </div>

                  {/* Barra de Ações Rápidas do Card */}
                  <div className="grid grid-cols-4 gap-1 pt-1 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPropostaVisualizando(p)
                        setModalVisualizarOpen(true)
                      }}
                      className="h-8 p-0 text-slate-700 hover:text-[#047857]"
                      title="Visualizar documento"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPropostaParaDisparo(p)
                        setModalEmailOpen(true)
                      }}
                      className="h-8 p-0 text-slate-700 hover:text-[#047857]"
                      title="Enviar por E-mail"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPropostaParaDisparo(p)
                        setModalWhatsAppOpen(true)
                      }}
                      className="h-8 p-0 text-slate-700 hover:text-[#25D366]"
                      title="Enviar via WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPropostaEmEdicao(p)
                        setModalCriarOpen(true)
                      }}
                      className="h-8 p-0 text-slate-700 hover:text-blue-600"
                      title="Editar Proposta"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Botão de Excluir */}
                  <div className="flex justify-end pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluir(p)}
                      className="h-6 px-2 text-[10px] text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
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

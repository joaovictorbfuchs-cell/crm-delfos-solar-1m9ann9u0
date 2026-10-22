import React, { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import {
  BatteryCharging,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Printer,
  Trash2,
  Edit,
  ExternalLink,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
} from 'lucide-react'
import { formatCurrency, formatDateShort } from '@/lib/formatters'
import type { BateriaOrcamento, Cliente, Negocio } from '@/types/crm'
import {
  getBateriasOrcamentos,
  updateStatusBateriaOrcamento,
  deleteBateriaOrcamento,
} from '@/services/bateriasOrcamentosService'
import {
  compilarDadosDocumentoBateria,
  gerarHTMLPropostaBateria,
} from '@/lib/propostaBateriaGenerator'

interface AbaPropostasBateriasProps {
  clientes: Cliente[]
  negocios?: Negocio[]
  onAbrirGeradorBateria: (orcamento?: BateriaOrcamento) => void
}

export const AbaPropostasBaterias: React.FC<AbaPropostasBateriasProps> = ({
  clientes,
  negocios = [],
  onAbrirGeradorBateria,
}) => {
  const { toast } = useToast()
  const [orcamentos, setOrcamentos] = useState<BateriaOrcamento[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Carregar lista de orçamentos de baterias
  const carregarDados = async () => {
    try {
      setCarregando(true)
      const lista = await getBateriasOrcamentos()
      setOrcamentos(lista)
    } catch (err) {
      console.error('Erro ao carregar orçamentos de bateria:', err)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível buscar as propostas de bateria.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Filtragem
  const orcamentosFiltrados = useMemo(() => {
    return orcamentos.filter((o) => {
      if (filtroStatus !== 'todos' && o.status !== filtroStatus) return false

      if (!busca.trim()) return true
      const b = busca.toLowerCase()
      const num = (o.numero_proposta || '').toLowerCase()
      const cli = (
        o.expand?.cliente_id?.razao_social ||
        o.expand?.cliente_id?.nome ||
        ''
      ).toLowerCase()
      const mod = (o.modelo_bateria || '').toLowerCase()
      const autor = (o.autor || '').toLowerCase()

      return num.includes(b) || cli.includes(b) || mod.includes(b) || autor.includes(b)
    })
  }, [orcamentos, busca, filtroStatus])

  // Métricas
  const metricas = useMemo(() => {
    const total = orcamentos.length
    const aprovados = orcamentos.filter((o) => o.status === 'Aprovado')
    const valorTotal = orcamentos.reduce((acc, curr) => acc + (curr.valor_investimento || 0), 0)
    const valorAprovado = aprovados.reduce((acc, curr) => acc + (curr.valor_investimento || 0), 0)
    const capTotalKwh = orcamentos.reduce((acc, curr) => acc + (curr.capacidade_kwh || 0), 0)

    return { total, aprovados: aprovados.length, valorTotal, valorAprovado, capTotalKwh }
  }, [orcamentos])

  // Ações de Proposta
  const handleAlterarStatus = async (id: string, novoStatus: BateriaOrcamento['status']) => {
    try {
      await updateStatusBateriaOrcamento(id, novoStatus)
      setOrcamentos((prev) => prev.map((o) => (o.id === id ? { ...o, status: novoStatus } : o)))
      toast({
        title: 'Status atualizado',
        description: `Proposta marcada como "${novoStatus}".`,
      })
    } catch {
      toast({
        title: 'Erro ao atualizar status',
        variant: 'destructive',
      })
    }
  }

  const handleExcluir = async (id: string, numero: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a proposta de bateria ${numero}?`)) {
      return
    }

    try {
      await deleteBateriaOrcamento(id)
      setOrcamentos((prev) => prev.filter((o) => o.id !== id))
      toast({
        title: 'Proposta excluída',
        description: `Proposta ${numero} removida com sucesso.`,
      })
    } catch {
      toast({
        title: 'Erro ao excluir proposta',
        variant: 'destructive',
      })
    }
  }

  const handleImprimir = (orcamento: BateriaOrcamento) => {
    const cli =
      clientes.find((c) => c.id === orcamento.cliente_id) || orcamento.expand?.cliente_id || null
    const dados = compilarDadosDocumentoBateria(orcamento, cli)
    const html = gerarHTMLPropostaBateria(dados)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.focus()
      setTimeout(() => {
        win.print()
      }, 350)
    }
  }

  const getStatusBadge = (status: BateriaOrcamento['status']) => {
    switch (status) {
      case 'Aprovado':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300 font-semibold gap-1 text-[11px]">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </Badge>
        )
      case 'Enviado ao cliente':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300 font-semibold gap-1 text-[11px]">
            <Clock className="h-3 w-3" />
            Enviado ao cliente
          </Badge>
        )
      case 'Rejeitado':
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 border-rose-300 font-semibold gap-1 text-[11px]">
            <AlertCircle className="h-3 w-3" />
            Rejeitado
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="bg-slate-100 text-slate-700 font-semibold gap-1 text-[11px]"
          >
            Em elaboração
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total de Propostas Baterias
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{metricas.total}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            Volume: {formatCurrency(metricas.valorTotal)}
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Propostas Aprovadas
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{metricas.aprovados}</div>
          <div className="text-xs text-emerald-600 mt-0.5 font-medium">
            {formatCurrency(metricas.valorAprovado)} fechados
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Capacidade Total Ofertada
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {metricas.capTotalKwh.toFixed(1)} kWh
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Em sistemas de armazenamento</div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-green-100 border-emerald-200 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Gerador de Baterias
            </div>
            <p className="text-xs text-emerald-900 mt-0.5">
              Criar nova proposta técnica comercial de baterias
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => onAbrirGeradorBateria()}
            className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nova Proposta de Bateria
          </Button>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="p-3 bg-white border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por cliente, proposta, modelo..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-8 text-xs h-9 bg-slate-50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white text-xs text-slate-700 font-medium"
          >
            <option value="todos">Todos os status</option>
            <option value="Em elaboração">Em elaboração</option>
            <option value="Enviado ao cliente">Enviado ao cliente</option>
            <option value="Aprovado">Aprovado</option>
            <option value="Rejeitado">Rejeitado</option>
          </select>
          <Button variant="outline" size="sm" onClick={carregarDados} className="text-xs h-9">
            Atualizar
          </Button>
        </div>
      </Card>

      {/* Lista de Propostas */}
      {carregando ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-lg border">
          Carregando propostas de baterias...
        </div>
      ) : orcamentosFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border space-y-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
            <BatteryCharging className="h-6 w-6" />
          </div>
          <h4 className="font-bold text-slate-800 text-sm">
            Nenhuma proposta de bateria encontrada
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {busca || filtroStatus !== 'todos'
              ? 'Tente ajustar os filtros ou termo de busca acima.'
              : 'Clique no botão "Nova Proposta de Bateria" para dimensionar o primeiro sistema de armazenamento.'}
          </p>
          <Button
            size="sm"
            onClick={() => onAbrirGeradorBateria()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar Proposta de Bateria
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orcamentosFiltrados.map((orc) => {
            const clienteNome =
              orc.expand?.cliente_id?.razao_social ||
              orc.expand?.cliente_id?.nome ||
              'Cliente não identificado'

            return (
              <Card
                key={orc.id}
                className="p-4 bg-white border-slate-200 hover:border-emerald-300 transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {orc.numero_proposta}
                      </span>
                      {getStatusBadge(orc.status)}
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-slate-50 text-slate-600 font-medium"
                      >
                        {orc.tipo_aplicacao === 'backup' && 'Backup / No-Break'}
                        {orc.tipo_aplicacao === 'peak_shaving' && 'Peak Shaving'}
                        {orc.tipo_aplicacao === 'autoconsumo' && 'Autoconsumo'}
                        {orc.tipo_aplicacao === 'off_grid' && 'Off-Grid'}
                        {!['backup', 'peak_shaving', 'autoconsumo', 'off_grid'].includes(
                          orc.tipo_aplicacao || '',
                        ) &&
                          (orc.tipo_aplicacao || 'Baterias')}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-bold text-slate-900">{clienteNome}</span>
                      <span>•</span>
                      <span>
                        {orc.capacidade_kwh} kWh ({orc.quantidade_baterias}x baterias)
                      </span>
                      <span>•</span>
                      <span>Inversor {orc.potencia_inversor_kw} kW</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateShort(orc.data_orcamento || orc.created)}
                      </span>
                      <span>•</span>
                      <span>Consultor: {orc.autor || 'João Victor Bagetti Fuchs'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                        Investimento Turnkey
                      </div>
                      <div className="text-base font-black text-emerald-700">
                        {formatCurrency(orc.valor_investimento || 0)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImprimir(orc)}
                        className="text-xs h-8 gap-1 text-slate-700"
                        title="Imprimir / Exportar Proposta PDF"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        PDF
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAbrirGeradorBateria(orc)}
                        className="text-xs h-8 gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        title="Editar proposta"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Editar
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => handleAlterarStatus(orc.id, 'Em elaboração')}
                          >
                            Marcar como Em elaboração
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAlterarStatus(orc.id, 'Enviado ao cliente')}
                          >
                            Marcar como Enviado ao cliente
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAlterarStatus(orc.id, 'Aprovado')}>
                            Marcar como Aprovado
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleAlterarStatus(orc.id, 'Rejeitado')}
                          >
                            Marcar como Rejeitado
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExcluir(orc.id, orc.numero_proposta || '')}
                            className="text-rose-600 font-semibold"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Excluir Proposta
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

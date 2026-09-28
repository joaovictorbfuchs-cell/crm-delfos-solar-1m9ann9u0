import React, { useState, useEffect, useMemo } from 'react'
import {
  Cpu,
  Sun,
  Layers,
  Battery,
  Box,
  Plus,
  Trash2,
  Edit2,
  Search,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Building,
  CheckCircle2,
  X,
  Filter,
  User,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  AtivoUsina,
  TipoAtivo,
  StatusOperacionalAtivo,
  SalvarAtivoDados,
} from '@/types/ativos'
import type { UsinaCliente } from '@/types/crm'
import {
  fetchAtivos,
  createAtivo,
  updateAtivo,
  deleteAtivo,
  fetchAllUsinasComCliente,
  calcularStatusGarantia,
  getLabelTipoAtivo,
  OPCOES_TIPO_ATIVO,
} from '@/services/ativosService'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function AtivosPage() {
  const { user } = useAuth()
  const [ativos, setAtivos] = useState<AtivoUsina[]>([])
  const [usinas, setUsinas] = useState<UsinaCliente[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Filtros
  const [usinaFiltro, setUsinaFiltro] = useState<string>('todas')
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos')
  const [garantiaFiltro, setGarantiaFiltro] = useState<string>('todos')
  const [busca, setBusca] = useState<string>('')

  // Modais de Criação / Edição
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<AtivoUsina | null>(null)
  const [modalDeleteOpen, setModalDeleteOpen] = useState<boolean>(false)
  const [itemParaExcluir, setItemParaExcluir] = useState<AtivoUsina | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  // Campos do formulário
  const [formUsinaId, setFormUsinaId] = useState<string>('')
  const [formTipo, setFormTipo] = useState<TipoAtivo>('inversor')
  const [formTipoOutroDescricao, setFormTipoOutroDescricao] = useState<string>('')
  const [formFabricante, setFormFabricante] = useState<string>('')
  const [formModelo, setFormModelo] = useState<string>('')
  const [formNumeroSerie, setFormNumeroSerie] = useState<string>('')
  const [formDataInstalacao, setFormDataInstalacao] = useState<string>('')
  const [formDataFimGarantia, setFormDataFimGarantia] = useState<string>('')
  const [formStatusOperacional, setFormStatusOperacional] =
    useState<StatusOperacionalAtivo>('operacional')
  const [formObservacoes, setFormObservacoes] = useState<string>('')

  const carregarDados = async () => {
    setLoading(true)
    try {
      const [ativosData, usinasData] = await Promise.all([
        fetchAtivos(),
        fetchAllUsinasComCliente(),
      ])
      setAtivos(ativosData)
      setUsinas(usinasData)
    } catch (err) {
      console.error('Erro ao carregar dados de ativos:', err)
      toast.error('Erro ao carregar lista de ativos das usinas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Filtragem dos ativos
  const ativosFiltrados = useMemo(() => {
    return ativos.filter((ativo) => {
      if (usinaFiltro !== 'todas' && ativo.usina_id !== usinaFiltro) {
        return false
      }
      if (tipoFiltro !== 'todos' && ativo.tipo !== tipoFiltro) {
        return false
      }
      if (garantiaFiltro !== 'todos') {
        const info = calcularStatusGarantia(ativo.data_fim_garantia)
        if (info.status !== garantiaFiltro) {
          return false
        }
      }
      if (busca.trim()) {
        const q = busca.toLowerCase()
        const usinaNome = ativo.expand?.usina_id?.nome?.toLowerCase() || ''
        const clienteNome =
          (ativo.expand?.usina_id?.expand as any)?.cliente_id?.nome?.toLowerCase() || ''
        const match =
          ativo.fabricante.toLowerCase().includes(q) ||
          ativo.modelo.toLowerCase().includes(q) ||
          (ativo.numero_serie && ativo.numero_serie.toLowerCase().includes(q)) ||
          (ativo.tipo_outro_descricao && ativo.tipo_outro_descricao.toLowerCase().includes(q)) ||
          usinaNome.includes(q) ||
          clienteNome.includes(q)
        if (!match) return false
      }
      return true
    })
  }, [ativos, usinaFiltro, tipoFiltro, garantiaFiltro, busca])

  // Agrupamento por usina para a listagem organizada
  const ativosAgrupadosPorUsina = useMemo(() => {
    const mapa = new Map<string, { usina: UsinaCliente | null; itens: AtivoUsina[] }>()

    ativosFiltrados.forEach((ativo) => {
      const uId = ativo.usina_id || 'sem_usina'
      const existente = mapa.get(uId)
      const usinaObj = ativo.expand?.usina_id || usinas.find((u) => u.id === uId) || null

      if (existente) {
        existente.itens.push(ativo)
      } else {
        mapa.set(uId, {
          usina: usinaObj,
          itens: [ativo],
        })
      }
    })

    return Array.from(mapa.entries()).map(([usinaId, grupo]) => ({
      usinaId,
      usina: grupo.usina,
      itens: grupo.itens,
    }))
  }, [ativosFiltrados, usinas])

  // Estatísticas Rápidas
  const estatisticas = useMemo(() => {
    let vigentes = 0
    let proximas = 0
    let vencidas = 0
    let semData = 0

    ativos.forEach((a) => {
      const st = calcularStatusGarantia(a.data_fim_garantia).status
      if (st === 'vigente') vigentes++
      else if (st === 'proxima_vencimento') proximas++
      else if (st === 'vencida') vencidas++
      else semData++
    })

    return {
      total: ativos.length,
      vigentes,
      proximas,
      vencidas,
      semData,
      totalUsinasComAtivos: new Set(ativos.map((a) => a.usina_id)).size,
    }
  }, [ativos])

  const handleOpenCreate = (preselectedUsinaId?: string) => {
    setEditingItem(null)
    setFormUsinaId(
      preselectedUsinaId || (usinaFiltro !== 'todas' ? usinaFiltro : usinas[0]?.id || ''),
    )
    setFormTipo('inversor')
    setFormTipoOutroDescricao('')
    setFormFabricante('')
    setFormModelo('')
    setFormNumeroSerie('')
    setFormDataInstalacao('')
    setFormDataFimGarantia('')
    setFormStatusOperacional('operacional')
    setFormObservacoes('')
    setModalOpen(true)
  }

  const handleOpenEdit = (item: AtivoUsina) => {
    setEditingItem(item)
    setFormUsinaId(item.usina_id)
    setFormTipo(item.tipo)
    setFormTipoOutroDescricao(item.tipo_outro_descricao || '')
    setFormFabricante(item.fabricante || '')
    setFormModelo(item.modelo || '')
    setFormNumeroSerie(item.numero_serie || '')
    setFormDataInstalacao(
      item.data_instalacao ? item.data_instalacao.split(' ')[0].split('T')[0] : '',
    )
    setFormDataFimGarantia(
      item.data_fim_garantia ? item.data_fim_garantia.split(' ')[0].split('T')[0] : '',
    )
    setFormStatusOperacional(item.status_operacional || 'operacional')
    setFormObservacoes(item.observacoes || '')
    setModalOpen(true)
  }

  const handleSalvarAtivo = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formUsinaId) {
      toast.error('Selecione a usina à qual o ativo pertence.')
      return
    }
    if (!formFabricante.trim()) {
      toast.error('Informe o fabricante do equipamento.')
      return
    }
    if (!formModelo.trim()) {
      toast.error('Informe o modelo do equipamento.')
      return
    }
    if (formTipo === 'outros' && !formTipoOutroDescricao.trim()) {
      toast.error('Para o tipo "outros", especifique qual é o equipamento.')
      return
    }

    setIsSubmitting(true)
    try {
      const payload: SalvarAtivoDados = {
        usina_id: formUsinaId,
        tipo: formTipo,
        tipo_outro_descricao: formTipo === 'outros' ? formTipoOutroDescricao.trim() : undefined,
        fabricante: formFabricante.trim(),
        modelo: formModelo.trim(),
        numero_serie: formNumeroSerie.trim() || undefined,
        data_instalacao: formDataInstalacao || undefined,
        data_fim_garantia: formDataFimGarantia || undefined,
        status_operacional: formStatusOperacional,
        observacoes: formObservacoes.trim() || undefined,
        responsavel_id: user?.id,
      }

      if (editingItem) {
        await updateAtivo(editingItem.id, payload)
        toast.success(`Ativo "${payload.modelo}" atualizado com sucesso!`)
      } else {
        await createAtivo(payload)
        toast.success(`Ativo "${payload.modelo}" cadastrado com sucesso!`)
      }

      setModalOpen(false)
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao salvar ativo:', err)
      toast.error(err?.message || 'Erro ao salvar ativo. Verifique os dados e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmarExcluir = async () => {
    if (!itemParaExcluir) return
    setIsDeleting(true)
    try {
      await deleteAtivo(itemParaExcluir.id)
      toast.success(`Ativo "${itemParaExcluir.modelo}" excluído com sucesso.`)
      setModalDeleteOpen(false)
      setItemParaExcluir(null)
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao excluir ativo:', err)
      toast.error('Erro ao excluir o ativo. Tente novamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Ícone por tipo de equipamento
  const getIconeTipo = (tipo: TipoAtivo) => {
    switch (tipo) {
      case 'inversor':
        return <Cpu className="w-4 h-4 text-purple-600" />
      case 'placa_solar':
        return <Sun className="w-4 h-4 text-amber-500" />
      case 'bateria':
        return <Battery className="w-4 h-4 text-emerald-600" />
      case 'string_box':
        return <Box className="w-4 h-4 text-blue-600" />
      default:
        return <Layers className="w-4 h-4 text-slate-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com identidade Delfos Solar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#0F2038] text-[#E0A838] rounded-xl shadow-xs">
              <Cpu className="w-6 h-6 text-[#E0A838]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0F2038] tracking-tight">
                Cadastro de Ativos das Usinas
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Organização centralizada de inversores, placas, baterias e equipamentos por usina
                com acompanhamento de garantias.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 border-slate-300 hover:bg-slate-50"
            title="Atualizar lista de ativos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleOpenCreate()}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs gap-1.5 rounded-xl shadow-xs border border-slate-700"
          >
            <Plus className="w-4 h-4 text-[#E0A838]" />
            <span>+ Novo Ativo</span>
          </Button>
        </div>
      </div>

      {/* Cards de Resumo & Status de Garantia */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total de Ativos
          </span>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xl font-black text-[#0F2038]">{estatisticas.total}</span>
            <span className="text-xs font-semibold text-slate-500">
              em {estatisticas.totalUsinasComAtivos}{' '}
              {estatisticas.totalUsinasComAtivos === 1 ? 'usina' : 'usinas'}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 block">
              Garantia Vigente
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-800 mt-1">{estatisticas.vigentes}</div>
        </div>

        <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
              Vence em até 60 dias
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-1">{estatisticas.proximas}</div>
        </div>

        <div className="p-3.5 bg-rose-50/50 rounded-xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-900 block">
              Garantia Vencida
            </span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-800 mt-1">{estatisticas.vencidas}</div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          {/* Busca textual */}
          <div className="sm:col-span-1">
            <Label className="text-[11px] font-bold text-slate-600 mb-1 block">Buscar Ativo</Label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Fabricante, modelo, nº série..."
                className="pl-8 text-xs h-9"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtro por Usina */}
          <div>
            <Label className="text-[11px] font-bold text-slate-600 mb-1 block">
              Filtrar por Usina
            </Label>
            <Select value={usinaFiltro} onValueChange={setUsinaFiltro}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Todas as usinas" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="todas">Todas as usinas ({usinas.length})</SelectItem>
                {usinas.map((u) => {
                  const clienteNome = (u.expand as any)?.cliente_id?.nome
                  return (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome} {clienteNome ? `(${clienteNome})` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Tipo */}
          <div>
            <Label className="text-[11px] font-bold text-slate-600 mb-1 block">
              Tipo de Equipamento
            </Label>
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                {OPCOES_TIPO_ATIVO.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Garantia */}
          <div>
            <Label className="text-[11px] font-bold text-slate-600 mb-1 block">
              Status da Garantia
            </Label>
            <Select value={garantiaFiltro} onValueChange={setGarantiaFiltro}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="vigente">Garantia Vigente</SelectItem>
                <SelectItem value="proxima_vencimento">Próxima do Vencimento (≤60d)</SelectItem>
                <SelectItem value="vencida">Garantia Vencida</SelectItem>
                <SelectItem value="nao_informada">Não informada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(usinaFiltro !== 'todas' ||
          tipoFiltro !== 'todos' ||
          garantiaFiltro !== 'todos' ||
          busca) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">
              Mostrando <strong>{ativosFiltrados.length}</strong> de{' '}
              <strong>{ativos.length}</strong> ativos cadastrados
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setUsinaFiltro('todas')
                setTipoFiltro('todos')
                setGarantiaFiltro('todos')
                setBusca('')
              }}
              className="text-xs text-slate-500 hover:text-slate-800 h-7"
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Conteúdo Principal: Listagem agrupada/organizada por Usina */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F2038] mb-2" />
          <p className="text-sm font-semibold text-slate-700">Carregando cadastro de ativos...</p>
        </div>
      ) : ativosAgrupadosPorUsina.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#E0A838] flex items-center justify-center mx-auto shadow-2xs">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Nenhum ativo encontrado</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {busca ||
              usinaFiltro !== 'todas' ||
              tipoFiltro !== 'todos' ||
              garantiaFiltro !== 'todos'
                ? 'Nenhum ativo corresponde aos filtros selecionados. Tente ajustar os parâmetros de busca.'
                : 'Cadastre os equipamentos das usinas (inversores, módulos, baterias, string boxes) para manter o histórico de números de série e garantias.'}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => handleOpenCreate()}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#E0A838] mr-1.5" />
            Cadastrar Primeiro Ativo
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {ativosAgrupadosPorUsina.map((grupo) => {
            const usina = grupo.usina
            const clienteNome =
              (usina?.expand as any)?.cliente_id?.nome || 'Cliente não identificado'

            return (
              <div
                key={grupo.usinaId}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Cabeçalho da Usina */}
                <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-white px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#0F2038] text-[#E0A838] rounded-lg">
                      <Sun className="w-4 h-4 text-[#E0A838]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-[#0F2038]">
                          {usina?.nome || 'Usina vinculada'}
                        </h3>
                        <Badge
                          variant="outline"
                          className="bg-white text-slate-700 font-semibold text-[11px] border-slate-300"
                        >
                          {grupo.itens.length}{' '}
                          {grupo.itens.length === 1 ? 'equipamento' : 'equipamentos'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>
                          Cliente: <strong>{clienteNome}</strong>
                        </span>
                        {usina?.potencia_kwp ? (
                          <span>• Potência: {usina.potencia_kwp} kWp</span>
                        ) : null}
                        {usina?.numero_uc ? <span>• UC: {usina.numero_uc}</span> : null}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleOpenCreate(grupo.usinaId !== 'sem_usina' ? grupo.usinaId : undefined)
                    }
                    className="text-xs font-bold border-slate-300 hover:bg-slate-100 gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#0F2038]" />
                    <span>Adicionar Ativo nesta Usina</span>
                  </Button>
                </div>

                {/* Tabela/Grade de Ativos daquela Usina */}
                <div className="divide-y divide-slate-100">
                  {grupo.itens.map((ativo) => {
                    const garantiaInfo = calcularStatusGarantia(ativo.data_fim_garantia)

                    return (
                      <div
                        key={ativo.id}
                        className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        {/* Identificação do Ativo */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0 mt-0.5">
                            {getIconeTipo(ativo.tipo)}
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-sm text-[#0F2038]">
                                {ativo.fabricante} {ativo.modelo}
                              </span>
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold"
                              >
                                {getLabelTipoAtivo(ativo.tipo, ativo.tipo_outro_descricao)}
                              </Badge>

                              {ativo.status_operacional &&
                                ativo.status_operacional !== 'operacional' && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] uppercase font-bold"
                                  >
                                    {ativo.status_operacional}
                                  </Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-3 text-slate-500 text-[11px] flex-wrap">
                              {ativo.numero_serie ? (
                                <span>
                                  Nº de Série:{' '}
                                  <strong className="text-slate-700 font-mono">
                                    {ativo.numero_serie}
                                  </strong>
                                </span>
                              ) : (
                                <span className="italic text-slate-400">
                                  Nº de série não informado
                                </span>
                              )}

                              {ativo.data_instalacao && (
                                <span>
                                  Instalação: <strong>{formatDate(ativo.data_instalacao)}</strong>
                                </span>
                              )}
                            </div>

                            {ativo.observacoes && (
                              <p className="text-[11px] text-slate-600 italic bg-amber-50/50 px-2 py-0.5 rounded border border-amber-100 inline-block">
                                {ativo.observacoes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Indicador Visual Simples de Garantia */}
                        <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                          <div className="text-left md:text-right space-y-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Garantia
                            </span>
                            <div className="flex items-center gap-1.5 md:justify-end">
                              <Badge
                                variant={garantiaInfo.badgeVariant}
                                className={`text-[11px] ${garantiaInfo.badgeClasses}`}
                              >
                                {garantiaInfo.label}
                              </Badge>
                            </div>
                            {ativo.data_fim_garantia && (
                              <span className="text-[10px] text-slate-400 block">
                                Até {formatDate(ativo.data_fim_garantia)}
                              </span>
                            )}
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(ativo)}
                              className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                              title="Editar ativo"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setItemParaExcluir(ativo)
                                setModalDeleteOpen(true)
                              }}
                              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="Excluir ativo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR / EDITAR ATIVO                              */}
      {/* ======================================================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-[#0F2038]">
              <Cpu className="w-5 h-5 text-[#E0A838]" />
              <span>{editingItem ? 'Editar Ativo da Usina' : 'Novo Ativo da Usina'}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre os dados detalhados do equipamento, número de série e prazo de garantia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarAtivo} className="space-y-3.5 py-2 text-xs">
            {/* Seleção da Usina */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Usina à qual pertence *</Label>
              <Select value={formUsinaId} onValueChange={setFormUsinaId}>
                <SelectTrigger className="mt-1 text-xs">
                  <SelectValue placeholder="Selecione a usina" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {usinas.map((u) => {
                    const clienteNome = (u.expand as any)?.cliente_id?.nome
                    return (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nome} {clienteNome ? `(${clienteNome})` : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Equipamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Tipo de Equipamento *</Label>
                <Select value={formTipo} onValueChange={(val) => setFormTipo(val as TipoAtivo)}>
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_TIPO_ATIVO.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formTipo === 'outros' ? (
                <div>
                  <Label className="text-xs font-bold text-slate-700">
                    Especificar Equipamento *
                  </Label>
                  <Input
                    value={formTipoOutroDescricao}
                    onChange={(e) => setFormTipoOutroDescricao(e.target.value)}
                    placeholder="Ex: Transformador, Datalogger..."
                    className="mt-1 text-xs"
                    required
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-bold text-slate-700">Status Operacional</Label>
                  <Select
                    value={formStatusOperacional}
                    onValueChange={(val) => setFormStatusOperacional(val as StatusOperacionalAtivo)}
                  >
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operacional">Operacional</SelectItem>
                      <SelectItem value="em_alerta">Em alerta</SelectItem>
                      <SelectItem value="manutencao">Em manutenção</SelectItem>
                      <SelectItem value="desativado">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Fabricante e Modelo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Fabricante *</Label>
                <Input
                  value={formFabricante}
                  onChange={(e) => setFormFabricante(e.target.value)}
                  placeholder="Ex: Deye, Growatt, Canadian, Jinko..."
                  className="mt-1 text-xs"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Modelo *</Label>
                <Input
                  value={formModelo}
                  onChange={(e) => setFormModelo(e.target.value)}
                  placeholder="Ex: SUN-8K-G05, CS3W-450MS..."
                  className="mt-1 text-xs"
                  required
                />
              </div>
            </div>

            {/* Número de Série */}
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Número de Série (Serial Number)
              </Label>
              <Input
                value={formNumeroSerie}
                onChange={(e) => setFormNumeroSerie(e.target.value)}
                placeholder="Ex: SN-23091804294"
                className="mt-1 font-mono text-xs"
              />
            </div>

            {/* Datas: Instalação e Fim de Garantia com Seletor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Data de Instalação</Label>
                <Input
                  type="date"
                  value={formDataInstalacao}
                  onChange={(e) => setFormDataInstalacao(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Data de Fim de Garantia</Label>
                <Input
                  type="date"
                  value={formDataFimGarantia}
                  onChange={(e) => setFormDataFimGarantia(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            {/* Pré-visualização simples do status de garantia calculado */}
            {formDataFimGarantia && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 text-xs">Status previsto da garantia:</span>
                {(() => {
                  const info = calcularStatusGarantia(formDataFimGarantia)
                  return (
                    <Badge variant={info.badgeVariant} className={`text-xs ${info.badgeClasses}`}>
                      {info.label} • {info.descricao}
                    </Badge>
                  )
                })()}
              </div>
            )}

            {/* Observações */}
            <div>
              <Label className="text-xs font-bold text-slate-700">Observações Adicionais</Label>
              <textarea
                rows={2}
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                placeholder="Condições do equipamento, nota fiscal, fornecedor de compra, etc."
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
              >
                {isSubmitting
                  ? 'Salvando...'
                  : editingItem
                    ? 'Salvar Alterações'
                    : 'Cadastrar Ativo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: CONFIRMAR EXCLUSÃO                                */}
      {/* ======================================================== */}
      <Dialog open={modalDeleteOpen} onOpenChange={setModalDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700">
              <Trash2 className="w-5 h-5" />
              <span>Excluir Ativo</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {itemParaExcluir && (
                <span>
                  Tem certeza de que deseja excluir o ativo{' '}
                  <strong>
                    {itemParaExcluir.fabricante} {itemParaExcluir.modelo}
                  </strong>
                  {itemParaExcluir.numero_serie ? ` (S/N: ${itemParaExcluir.numero_serie})` : ''}?
                  Esta ação não pode ser desfeita.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={handleConfirmarExcluir}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

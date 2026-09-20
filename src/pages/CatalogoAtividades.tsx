import React, { useState, useMemo, useRef } from 'react'
import {
  Wrench,
  Plus,
  Search,
  Filter,
  DollarSign,
  Calendar,
  Layers,
  Sparkles,
  Edit2,
  Power,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Upload,
  ExternalLink,
  Users,
  Building2,
  Info,
  Droplets,
  Zap,
  Wifi,
  ShieldCheck,
  Settings,
  Cpu,
  Camera,
  RotateCcw,
  Clock,
  ArrowRightLeft,
  ChevronRight,
  Eye,
  FileCheck,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { TipoAtividadeCustomItem, CatalogoTipoExecucao } from '@/types/crm'
import { formatCurrency } from '@/lib/formatters'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

// Mapeamento de ícones técnicos por nome/slug
const ICONE_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Droplets,
  Zap,
  Wrench,
  Settings,
  Wifi,
  ShieldCheck,
  Cpu,
  Camera,
  RotateCcw,
  Clock,
  FileText,
  Users,
  Building2,
  Sparkles,
  Layers,
}

function getIconComponent(
  iconeNome?: string,
  nome?: string,
): React.ComponentType<{ className?: string }> {
  if (iconeNome && ICONE_MAP[iconeNome]) {
    return ICONE_MAP[iconeNome]
  }
  const lower = (nome || '').toLowerCase()
  if (lower.includes('limpeza') || lower.includes('lavagem') || lower.includes('placa'))
    return Droplets
  if (lower.includes('elétric') || lower.includes('reaperto') || lower.includes('cabo')) return Zap
  if (lower.includes('inversor')) return Cpu
  if (lower.includes('datalogger') || lower.includes('wifi') || lower.includes('telemetria'))
    return Wifi
  if (lower.includes('vistoria') || lower.includes('garantia') || lower.includes('auditoria'))
    return ShieldCheck
  if (lower.includes('drone') || lower.includes('termogr')) return Camera
  if (lower.includes('corretiv')) return Settings
  return Wrench
}

function getDocumentoModeloUrl(item: TipoAtividadeCustomItem): string | null {
  if (!item.documento_modelo) return null
  return pb.files.getURL(item, item.documento_modelo)
}

function formatFrequencia(meses?: number): string {
  if (meses === undefined || meses === null || meses <= 0)
    return 'Sob demanda / Conforme necessidade'
  if (meses === 1) return 'Mensal (A cada 1 mês)'
  if (meses === 6) return 'Semestral (A cada 6 meses)'
  if (meses === 12) return 'Anual (A cada 12 meses)'
  if (meses === 24) return 'A cada 24 meses (2 anos)'
  return `A cada ${meses} meses`
}

export default function CatalogoAtividades() {
  const {
    tiposAtividadesCustom,
    addTipoAtividadeCustom,
    updateTipoAtividadeCustom,
    refreshTiposAtividadesCustom,
  } = useClientes()

  // Estados de busca e filtros
  const [busca, setBusca] = useState<string>('')
  const [filtroExecucao, setFiltroExecucao] = useState<
    'todos' | 'equipe_interna' | 'fornecedor_externo'
  >('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'inativos'>('todos')

  // Modais de Cadastro / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TipoAtividadeCustomItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Campos do formulário
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valorBase, setValorBase] = useState('')
  const [frequenciaMeses, setFrequenciaMeses] = useState('')
  const [tipoExecucao, setTipoExecucao] = useState<CatalogoTipoExecucao>('equipe_interna')
  const [orientacoesTecnicas, setOrientacoesTecnicas] = useState('')
  const [linksUteis, setLinksUteis] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [formAtivo, setFormAtivo] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal de confirmação para Inativar / Reativar
  const [confirmToggleItem, setConfirmToggleItem] = useState<TipoAtividadeCustomItem | null>(null)
  const [isToggling, setIsToggling] = useState(false)

  // Modal de Detalhes Rápidos / Visualização
  const [viewDetailsItem, setViewDetailsItem] = useState<TipoAtividadeCustomItem | null>(null)

  // Abrir Modal de Criação
  const handleOpenCreate = () => {
    setEditingItem(null)
    setNome('')
    setDescricao('')
    setValorBase('')
    setFrequenciaMeses('6')
    setTipoExecucao('equipe_interna')
    setOrientacoesTecnicas('')
    setLinksUteis('')
    setSelectedFile(null)
    setSelectedFileName('')
    setFormAtivo(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsModalOpen(true)
  }

  // Abrir Modal de Edição
  const handleOpenEdit = (item: TipoAtividadeCustomItem) => {
    setEditingItem(item)
    setNome(item.nome || '')
    setDescricao(item.descricao || '')
    setValorBase(
      item.valor_base !== undefined && item.valor_base !== null ? String(item.valor_base) : '',
    )
    setFrequenciaMeses(
      item.frequencia_meses !== undefined && item.frequencia_meses !== null
        ? String(item.frequencia_meses)
        : '0',
    )
    setTipoExecucao(item.tipo_execucao || 'equipe_interna')
    setOrientacoesTecnicas(item.orientacoes_tecnicas || '')
    setLinksUteis(item.links_uteis || '')
    setSelectedFile(null)
    setSelectedFileName(item.documento_modelo || '')
    setFormAtivo(item.ativo !== false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setIsModalOpen(true)
  }

  // Validação e Envio do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) {
      toast.error('Informe o nome do serviço.')
      return
    }

    const numValor = valorBase.trim() ? parseFloat(valorBase.replace(',', '.')) : 0
    if (isNaN(numValor) || numValor < 0) {
      toast.error('Informe um valor base válido (R$).')
      return
    }

    const numFreq = frequenciaMeses.trim() ? parseInt(frequenciaMeses, 10) : 0
    if (isNaN(numFreq) || numFreq < 0) {
      toast.error('Informe uma frequência válida em meses.')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        nome: nome.trim(),
        categoria: 'manutencao' as const,
        descricao: descricao.trim(),
        valor_base: numValor,
        frequencia_meses: numFreq,
        tipo_execucao: tipoExecucao,
        orientacoes_tecnicas: orientacoesTecnicas.trim(),
        links_uteis: linksUteis.trim(),
        ativo: formAtivo,
        documento_modelo: selectedFile || null,
      }

      if (editingItem) {
        await updateTipoAtividadeCustom(editingItem.id, payload)
        toast.success(`Serviço "${nome.trim()}" atualizado com sucesso!`)
      } else {
        await addTipoAtividadeCustom(payload)
        toast.success(`Nova atividade "${nome.trim()}" cadastrada no catálogo!`)
      }

      await refreshTiposAtividadesCustom()
      setIsModalOpen(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar atividade no catálogo:', err)
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar atividade no catálogo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Alternar Ativo/Inativo com confirmação
  const handleConfirmToggle = async () => {
    if (!confirmToggleItem) return
    const novoStatus = !(confirmToggleItem.ativo !== false)
    try {
      setIsToggling(true)
      await updateTipoAtividadeCustom(confirmToggleItem.id, {
        ativo: novoStatus,
      })
      await refreshTiposAtividadesCustom()
      toast.success(
        novoStatus
          ? `Atividade "${confirmToggleItem.nome}" reativada com sucesso!`
          : `Atividade "${confirmToggleItem.nome}" inativada. Ela não aparecerá em novas ofertas, mantendo o histórico das já realizadas.`,
      )
      setConfirmToggleItem(null)
    } catch (err: unknown) {
      console.error('Erro ao alterar status da atividade:', err)
      toast.error('Não foi possível alterar o status da atividade.')
    } finally {
      setIsToggling(false)
    }
  }

  // Lista base (filtrando categoria manutenção/serviços)
  const listaBase = useMemo(() => {
    return tiposAtividadesCustom.filter(
      (t) => !t.categoria || t.categoria === 'manutencao' || t.valor_base !== undefined,
    )
  }, [tiposAtividadesCustom])

  // Contagens para os cards de métricas
  const contagens = useMemo(() => {
    const total = listaBase.length
    const ativos = listaBase.filter((i) => i.ativo !== false).length
    const inativos = listaBase.filter((i) => i.ativo === false).length
    const equipeInterna = listaBase.filter(
      (i) => (i.tipo_execucao || 'equipe_interna') === 'equipe_interna',
    ).length
    const fornecedorExterno = listaBase.filter(
      (i) => i.tipo_execucao === 'fornecedor_externo',
    ).length
    return { total, ativos, inativos, equipeInterna, fornecedorExterno }
  }, [listaBase])

  // Filtragem combinada
  const itensFiltrados = useMemo(() => {
    return listaBase.filter((item) => {
      // Filtro de Status
      if (filtroStatus === 'ativos' && item.ativo === false) return false
      if (filtroStatus === 'inativos' && item.ativo !== false) return false

      // Filtro por Tipo de Execução
      const exec = item.tipo_execucao || 'equipe_interna'
      if (filtroExecucao !== 'todos' && exec !== filtroExecucao) return false

      // Filtro por Busca de Texto
      if (!busca.trim()) return true
      const term = busca.toLowerCase().trim()
      const matchNome = (item.nome || '').toLowerCase().includes(term)
      const matchDesc = (item.descricao || '').toLowerCase().includes(term)
      const matchOri = (item.orientacoes_tecnicas || '').toLowerCase().includes(term)
      return matchNome || matchDesc || matchOri
    })
  }, [listaBase, filtroStatus, filtroExecucao, busca])

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Catálogo de Atividades de Manutenção
              </h1>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs"
              >
                {contagens.total} serviços
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Padronização técnica, valores base, frequências recomendadas e orientações para a
              equipe e fornecedores
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Atividade</span>
        </button>
      </div>

      {/* Cards de Métricas Operacionais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Ativas */}
        <div
          onClick={() => setFiltroStatus(filtroStatus === 'ativos' ? 'todos' : 'ativos')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroStatus === 'ativos'
              ? 'bg-emerald-50/80 border-emerald-400 shadow-xs ring-2 ring-emerald-500/20'
              : 'bg-white border-gray-200/90 shadow-2xs hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              Atividades Ativas
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{contagens.ativos}</div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Disponíveis em novas ofertas
          </p>
        </div>

        {/* Equipe Interna */}
        <div
          onClick={() =>
            setFiltroExecucao(filtroExecucao === 'equipe_interna' ? 'todos' : 'equipe_interna')
          }
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroExecucao === 'equipe_interna'
              ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-2 ring-blue-500/20'
              : 'bg-white border-gray-200/90 shadow-2xs hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              Equipe Interna
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1">
            {contagens.equipeInterna}
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5">Corpo técnico Delfos O&M</p>
        </div>

        {/* Fornecedor Externo */}
        <div
          onClick={() =>
            setFiltroExecucao(
              filtroExecucao === 'fornecedor_externo' ? 'todos' : 'fornecedor_externo',
            )
          }
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroExecucao === 'fornecedor_externo'
              ? 'bg-purple-50/80 border-purple-400 shadow-xs ring-2 ring-purple-500/20'
              : 'bg-white border-gray-200/90 shadow-2xs hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">
              Fornecedor Externo
            </span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700 mt-1">
            {contagens.fornecedorExterno}
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-0.5">
            Parceiros e fabricantes credenciados
          </p>
        </div>

        {/* Inativas (Histórico) */}
        <div
          onClick={() => setFiltroStatus(filtroStatus === 'inativos' ? 'todos' : 'inativos')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            filtroStatus === 'inativos'
              ? 'bg-slate-100 border-slate-400 shadow-xs ring-2 ring-slate-500/20'
              : 'bg-white border-gray-200/90 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Inativadas
            </span>
            <Power className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-700 mt-1">{contagens.inativos}</div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Histórico preservado</p>
        </div>
      </div>

      {/* Banner Informativo Delfos */}
      <div className="bg-emerald-50/90 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="text-xs text-emerald-950 space-y-1">
          <p className="font-bold text-sm text-[#166534]">
            Catálogo Integrado às Fichas de Clientes & Ordens de Serviço
          </p>
          <p className="text-emerald-800 leading-relaxed">
            As atividades ativas cadastradas neste catálogo ficam imediatamente disponíveis na
            drawer de Atividades de Manutenção da ficha do cliente e nos agendamentos de ordens de
            serviço. Serviços inativados não aparecem para novas ofertas, preservando 100% o
            histórico das já realizadas.
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Barra de Busca */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar serviço por nome, palavras-chave ou orientações técnicas..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros em Dropdown */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={filtroExecucao}
              onChange={(e) => setFiltroExecucao(e.target.value as any)}
              className="text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todos">Todos os Tipos de Execução</option>
              <option value="equipe_interna">Equipe Interna</option>
              <option value="fornecedor_externo">Fornecedor Externo</option>
            </select>
          </div>

          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as any)}
            className="text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativos">Apenas Ativos</option>
            <option value="inativos">Apenas Inativos</option>
          </select>

          <span className="text-xs text-gray-500 font-medium whitespace-nowrap pl-2 hidden sm:inline">
            Exibindo: <strong>{itensFiltrados.length}</strong>
          </span>
        </div>
      </div>

      {/* Lista de Atividades: Tabela no Desktop, Cards no Mobile */}
      {itensFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3 border border-gray-200">
            <Wrench className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Nenhuma atividade encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            {busca || filtroExecucao !== 'todos' || filtroStatus !== 'todos'
              ? 'Nenhum serviço corresponde aos filtros selecionados. Tente limpar ou alterar a busca.'
              : 'Nenhuma atividade cadastrada no catálogo. Comece adicionando um novo tipo de serviço.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeira Atividade</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Visualização em TABELA para Desktop (lg+) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-5">Serviço / Atividade</th>
                  <th className="py-3.5 px-4">Valor Base</th>
                  <th className="py-3.5 px-4">Frequência Recomendada</th>
                  <th className="py-3.5 px-4">Execução</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Documento</th>
                  <th className="py-3.5 px-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {itensFiltrados.map((item) => {
                  const Icon = getIconComponent(item.icone, item.nome)
                  const isAtivo = item.ativo !== false
                  const docUrl = getDocumentoModeloUrl(item)
                  const isFornecedor = item.tipo_execucao === 'fornecedor_externo'

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${!isAtivo ? 'bg-gray-50/50 opacity-75' : ''}`}
                    >
                      {/* Nome do Serviço com Ícone */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs"
                            style={{
                              backgroundColor: isAtivo
                                ? item.cor
                                  ? `${item.cor}18`
                                  : '#16a34a18'
                                : '#f1f5f9',
                              borderColor: isAtivo
                                ? item.cor
                                  ? `${item.cor}40`
                                  : '#16a34a40'
                                : '#e2e8f0',
                              color: isAtivo ? item.cor || '#16a34a' : '#64748b',
                            }}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 truncate">{item.nome}</span>
                              {item.is_padrao && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Padrão
                                </span>
                              )}
                            </div>
                            {item.descricao && (
                              <p className="text-xs text-gray-500 line-clamp-1 mt-0.5 max-w-md">
                                {item.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Valor Base */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-emerald-700">
                          {formatCurrency(item.valor_base)}
                        </div>
                        <span className="text-[10px] text-gray-400">referência inicial</span>
                      </td>

                      {/* Frequência Recomendada */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{formatFrequencia(item.frequencia_meses)}</span>
                        </div>
                      </td>

                      {/* Indicador de Execução (Badge) */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isFornecedor ? (
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-800 border-purple-200 font-semibold gap-1 py-1"
                          >
                            <Building2 className="w-3 h-3 text-purple-600" />
                            Fornecedor externo
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-800 border-blue-200 font-semibold gap-1 py-1"
                          >
                            <Users className="w-3 h-3 text-blue-600" />
                            Equipe interna
                          </Badge>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isAtivo ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            Inativo
                          </span>
                        )}
                      </td>

                      {/* Documento Modelo */}
                      <td className="py-4 px-4 text-center whitespace-nowrap">
                        {docUrl ? (
                          <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                            title="Abrir anexo modelo"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Modelo</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewDetailsItem(item)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ver detalhes técnicos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Editar atividade"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmToggleItem(item)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isAtivo
                                ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={isAtivo ? 'Inativar atividade' : 'Reativar atividade'}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Visualização em CARDS para Mobile / Telas Menores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
            {itensFiltrados.map((item) => {
              const Icon = getIconComponent(item.icone, item.nome)
              const isAtivo = item.ativo !== false
              const docUrl = getDocumentoModeloUrl(item)
              const isFornecedor = item.tipo_execucao === 'fornecedor_externo'

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3.5 ${
                    isAtivo ? 'border-gray-200/90' : 'border-gray-200 bg-gray-50/60 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{
                          backgroundColor: isAtivo
                            ? item.cor
                              ? `${item.cor}18`
                              : '#16a34a18'
                            : '#f1f5f9',
                          borderColor: isAtivo
                            ? item.cor
                              ? `${item.cor}40`
                              : '#16a34a40'
                            : '#e2e8f0',
                          color: isAtivo ? item.cor || '#16a34a' : '#64748b',
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm">{item.nome}</h3>
                          {item.is_padrao && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Padrão
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                            isAtivo ? 'text-emerald-700' : 'text-slate-500'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isAtivo ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {isAtivo ? 'Ativo no sistema' : 'Inativo (Histórico)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewDetailsItem(item)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmToggleItem(item)}
                        className={`p-1.5 rounded-lg ${
                          isAtivo ? 'text-gray-400 hover:text-amber-600' : 'text-emerald-600'
                        }`}
                        title={isAtivo ? 'Inativar' : 'Reativar'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {item.descricao && (
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {item.descricao}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Valor Base
                      </span>
                      <p className="font-extrabold text-emerald-700 text-sm">
                        {formatCurrency(item.valor_base)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        Frequência
                      </span>
                      <p className="font-semibold text-gray-800 text-xs truncate">
                        {formatFrequencia(item.frequencia_meses)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    {isFornecedor ? (
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-800 border-purple-200 text-xs font-semibold gap-1"
                      >
                        <Building2 className="w-3 h-3 text-purple-600" />
                        Fornecedor externo
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-800 border-blue-200 text-xs font-semibold gap-1"
                      >
                        <Users className="w-3 h-3 text-blue-600" />
                        Equipe interna
                      </Badge>
                    )}

                    {docUrl && (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Checklist / Manual</span>
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL / DIALOG: Cadastrar / Editar Atividade */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              {editingItem ? 'Editar Atividade do Catálogo' : 'Nova Atividade de Manutenção'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Preencha as informações do serviço para cadastrá-lo no catálogo padrão da Delfos
              Solar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Nome do Serviço */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Nome do Serviço *</Label>
              <Input
                type="text"
                placeholder="Ex: Limpeza e Lavagem de Placas, Troca de Inversor..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            {/* Descrição Detalhada */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Descrição Detalhada do Serviço
              </Label>
              <Textarea
                rows={2}
                placeholder="Descreva o escopo e o que está contemplado neste serviço..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            {/* Valor Base e Frequência Recomendada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                  Valor Base de Referência (R$) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 450,00"
                  value={valorBase}
                  onChange={(e) => setValorBase(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Frequência Recomendada (meses)
                </Label>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 6 para semestral, 12 para anual (0 = sob demanda)"
                  value={frequenciaMeses}
                  onChange={(e) => setFrequenciaMeses(e.target.value)}
                />
                <span className="text-[10px] text-gray-400">
                  {formatFrequencia(parseInt(frequenciaMeses || '0', 10))}
                </span>
              </div>
            </div>

            {/* Tipo de Execução: Equipe Interna vs Fornecedor Externo */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">Tipo de Execução *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    tipoExecucao === 'equipe_interna'
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoExecucao"
                    value="equipe_interna"
                    checked={tipoExecucao === 'equipe_interna'}
                    onChange={() => setTipoExecucao('equipe_interna')}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Equipe Interna
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Executado diretamente pelos técnicos e instaladores próprios da Delfos.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    tipoExecucao === 'fornecedor_externo'
                      ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipoExecucao"
                    value="fornecedor_externo"
                    checked={tipoExecucao === 'fornecedor_externo'}
                    onChange={() => setTipoExecucao('fornecedor_externo')}
                    className="mt-1 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-purple-600" />
                      Fornecedor Externo
                    </span>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Requer contratação ou assistência técnica de terceiro / credenciado.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Orientações Técnicas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Orientações Técnicas de Execução
              </Label>
              <Textarea
                rows={3}
                placeholder="Ex.: Requisitos de EPI, ferramentas necessárias, torques recomendados, cuidados com choque térmico nas placas, procedimentos de segurança..."
                value={orientacoesTecnicas}
                onChange={(e) => setOrientacoesTecnicas(e.target.value)}
              />
            </div>

            {/* Links Úteis */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">
                Links Úteis (Normas, Manuais, Vídeos, Portais de RMA)
              </Label>
              <Textarea
                rows={2}
                placeholder="Insira URLs (uma por linha ou separadas por espaço), ex.: https://delfos.com.br/normas/nbr-16274.pdf"
                value={linksUteis}
                onChange={(e) => setLinksUteis(e.target.value)}
              />
            </div>

            {/* Anexo de Documento Modelo (Checklist, Manual do Serviço) */}
            <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                Documento Modelo (Checklist, Manual ou Termo em PDF/Doc)
              </Label>
              <p className="text-[11px] text-gray-500">
                Anexe um arquivo de modelo de checklist ou manual do serviço (máx. 10MB).
              </p>

              <div className="flex items-center gap-3 mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  id="documento_modelo_upload"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) {
                      if (f.size > 10 * 1024 * 1024) {
                        toast.error('Arquivo excede o limite de 10MB.')
                        return
                      }
                      setSelectedFile(f)
                      setSelectedFileName(f.name)
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {selectedFileName ? 'Substituir arquivo' : 'Selecionar arquivo...'}
                </Button>

                {selectedFileName && (
                  <div className="flex items-center gap-1 text-xs text-gray-700 font-medium">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span className="truncate max-w-[200px]">{selectedFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null)
                        setSelectedFileName('')
                        if (fileInputRef.current) fileInputRef.current.value = ''
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Remover anexo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Ativo / Inativo */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="form_ativo_check"
                checked={formAtivo}
                onChange={(e) => setFormAtivo(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <label
                htmlFor="form_ativo_check"
                className="text-xs font-semibold text-gray-700 cursor-pointer"
              >
                Atividade ativa no sistema (disponível para novas ofertas e O.S.)
              </label>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting
                  ? 'Salvando...'
                  : editingItem
                    ? 'Salvar Alterações'
                    : 'Cadastrar Atividade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO: Inativar / Reativar */}
      <AlertDialog
        open={Boolean(confirmToggleItem)}
        onOpenChange={(open) => !open && setConfirmToggleItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              {confirmToggleItem?.ativo !== false ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Inativar atividade &quot;{confirmToggleItem?.nome}&quot;?
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Reativar atividade &quot;{confirmToggleItem?.nome}&quot;?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-500 leading-relaxed">
              {confirmToggleItem?.ativo !== false ? (
                <>
                  Ao inativar esta atividade, ela <strong>não aparecerá mais</strong> como opção nos
                  novos formulários da ficha do cliente e ordens de serviço. No entanto,{' '}
                  <strong>todo o histórico das atividades já realizadas permanecerá intacto</strong>{' '}
                  no banco de dados.
                </>
              ) : (
                <>
                  A atividade voltará a ficar disponível imediatamente para seleção nas fichas de
                  clientes e ordens de serviço.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              disabled={isToggling}
              className={
                confirmToggleItem?.ativo !== false
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }
            >
              {isToggling
                ? 'Processando...'
                : confirmToggleItem?.ativo !== false
                  ? 'Confirmar Inativação'
                  : 'Confirmar Reativação'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL: Visualizar Detalhes Técnicos e Links */}
      {viewDetailsItem && (
        <Dialog
          open={Boolean(viewDetailsItem)}
          onOpenChange={(open) => !open && setViewDetailsItem(null)}
        >
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    viewDetailsItem.tipo_execucao === 'fornecedor_externo'
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-blue-50 text-blue-800 border-blue-200'
                  }
                >
                  {viewDetailsItem.tipo_execucao === 'fornecedor_externo'
                    ? 'Fornecedor Externo'
                    : 'Equipe Interna'}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    viewDetailsItem.ativo !== false
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }
                >
                  {viewDetailsItem.ativo !== false ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold text-gray-900 pt-1">
                {viewDetailsItem.nome}
              </DialogTitle>
              {viewDetailsItem.descricao && (
                <DialogDescription className="text-xs text-gray-600 leading-relaxed">
                  {viewDetailsItem.descricao}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    Valor Base Sugerido
                  </span>
                  <p className="text-base font-extrabold text-emerald-700">
                    {formatCurrency(viewDetailsItem.valor_base)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    Frequência Recomendada
                  </span>
                  <p className="text-xs font-semibold text-gray-800 mt-1">
                    {formatFrequencia(viewDetailsItem.frequencia_meses)}
                  </p>
                </div>
              </div>

              {/* Orientações Técnicas */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                  Orientações Técnicas de Execução
                </span>
                <div className="p-3.5 rounded-xl bg-white border border-gray-200 text-xs text-gray-700 leading-relaxed whitespace-pre-line">
                  {viewDetailsItem.orientacoes_tecnicas || (
                    <span className="italic text-gray-400">
                      Nenhuma orientação técnica detalhada cadastrada.
                    </span>
                  )}
                </div>
              </div>

              {/* Links Úteis */}
              {viewDetailsItem.links_uteis && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                    Links Úteis & Referências
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    {viewDetailsItem.links_uteis
                      .split(/[\n\s]+/)
                      .filter((url) => url.startsWith('http://') || url.startsWith('https://'))
                      .map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline break-all"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span>{url}</span>
                        </a>
                      ))}
                  </div>
                </div>
              )}

              {/* Documento Modelo */}
              {viewDetailsItem.documento_modelo && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    Documento Modelo Anexado
                  </span>
                  <div>
                    <a
                      href={getDocumentoModeloUrl(viewDetailsItem) || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold transition-colors"
                    >
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <span>Baixar/Visualizar Modelo ({viewDetailsItem.documento_modelo})</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const it = viewDetailsItem
                  setViewDetailsItem(null)
                  handleOpenEdit(it)
                }}
                className="gap-1.5 text-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Serviço
              </Button>
              <Button type="button" onClick={() => setViewDetailsItem(null)} className="text-xs">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

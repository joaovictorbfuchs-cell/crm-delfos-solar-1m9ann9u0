import React, { useState, useEffect, useMemo } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useClientes } from '@/contexts/ClientesContext'
import { useToast } from '@/hooks/use-toast'
import type { Cliente, Atividade, AtividadeStatus, Fornecedor } from '@/types/crm'
import {
  Wrench,
  Plus,
  Calendar,
  DollarSign,
  Users,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  UserCheck,
  Building2,
  Phone,
  Sparkles,
  Info,
} from 'lucide-react'

export interface DrawerAtividadesManutencaoClienteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente?: Cliente | null
}

const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pendente: {
    label: 'Pendente',
    badgeClass:
      'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300',
    icon: Clock,
  },
  agendada: {
    label: 'Agendada',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
    icon: Calendar,
  },
  em_execucao: {
    label: 'Em execução',
    badgeClass:
      'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300',
    icon: PlayCircle,
  },
  concluida: {
    label: 'Concluída',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  cancelada: {
    label: 'Cancelada',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    icon: AlertCircle,
  },
}

function formatCurrency(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export const DrawerAtividadesManutencaoCliente: React.FC<
  DrawerAtividadesManutencaoClienteProps
> = ({ open, onOpenChange, cliente }) => {
  const { atividades, addAtividade, updateAtividade, fornecedores, tiposAtividadesCustom } =
    useClientes()
  const { toast } = useToast()

  // Estados locais
  const [atividadeSelecionada, setAtividadeSelecionada] = useState<Atividade | null>(null)
  const [isCriando, setIsCriando] = useState<boolean>(false)
  const [modalDesignarEquipeOpen, setModalDesignarEquipeOpen] = useState<boolean>(false)
  const [fornecedorEscolhidoId, setFornecedorEscolhidoId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Formulário de Nova Atividade
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [novoTipoNome, setNovoTipoNome] = useState<string>('')
  const [novaDescricao, setNovaDescricao] = useState<string>('')
  const [novoValor, setNovoValor] = useState<string>('')
  const [novaDataPrevista, setNovaDataPrevista] = useState<string>(todayStr)

  // Lista de tipos disponíveis (tipos cadastrados no banco)
  const tiposDisponiveis = useMemo(() => {
    const list = tiposAtividadesCustom.filter((t) => t.categoria === 'manutencao')
    if (list.length > 0) return list
    return tiposAtividadesCustom
  }, [tiposAtividadesCustom])

  // Inicializa o tipo selecionado quando a lista carregar
  useEffect(() => {
    if (tiposDisponiveis.length > 0 && !novoTipoNome) {
      setNovoTipoNome(tiposDisponiveis[0].nome)
    }
  }, [tiposDisponiveis, novoTipoNome])

  // Filtrar atividades vinculadas a este cliente que sejam de manutenção/serviços
  const atividadesDoCliente = useMemo(() => {
    if (!cliente?.id) return []
    return atividades.filter((atv) => {
      if (atv.cliente_id !== cliente.id) return false
      // Considerar atividades de manutenção, limpeza, serviços avulsos ou com valor de serviço
      const t = (atv.tipo || '').toLowerCase()
      const isManut =
        t.includes('manutencao') ||
        t.includes('limpeza') ||
        t.includes('visita_tecnica') ||
        t.includes('reaperto') ||
        t.includes('inversor') ||
        t.includes('servico') ||
        (atv.valor_servico !== undefined && atv.valor_servico > 0) ||
        Boolean(atv.fornecedor_id) ||
        Boolean(atv.equipe_nome)
      return isManut
    })
  }, [atividades, cliente?.id])

  // Manter atividade selecionada em sincronia com o estado global atualizado
  useEffect(() => {
    if (atividadeSelecionada) {
      const atualizada = atividades.find((a) => a.id === atividadeSelecionada.id)
      if (atualizada) {
        setAtividadeSelecionada(atualizada)
      }
    }
  }, [atividades, atividadeSelecionada?.id])

  // Resetar telas internas ao fechar o drawer
  useEffect(() => {
    if (!open) {
      setAtividadeSelecionada(null)
      setIsCriando(false)
      setModalDesignarEquipeOpen(false)
      setFornecedorEscolhidoId('')
    }
  }, [open])

  // Ação: Criar Nova Atividade
  const handleCriarAtividade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cliente?.id) {
      toast({
        title: 'Cliente inválido',
        description: 'Não foi possível identificar o cliente.',
        variant: 'destructive',
      })
      return
    }

    if (!novoTipoNome.trim()) {
      toast({
        title: 'Tipo obrigatório',
        description: 'Selecione o tipo de atividade.',
        variant: 'destructive',
      })
      return
    }

    if (!novaDataPrevista) {
      toast({
        title: 'Data obrigatória',
        description: 'Informe a data prevista para o serviço.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsSubmitting(true)
      const numValor = novoValor ? parseFloat(novoValor.replace(',', '.')) : 0

      const criada = await addAtividade({
        cliente_id: cliente.id,
        tipo: 'limpeza_manutencao',
        titulo: novoTipoNome.trim(),
        descricao: novaDescricao.trim(),
        data: new Date(novaDataPrevista).toISOString(),
        status: 'pendente',
        valor_servico: isNaN(numValor) ? 0 : numValor,
        autor: 'Pós-Venda Delfos',
        responsavel_nome: 'Aguardando designação',
      })

      toast({
        title: 'Atividade de Manutenção criada!',
        description: `"${criada.titulo}" foi adicionada com sucesso e já está disponível no registro geral de atividades.`,
      })

      // Limpar formulário e voltar para a listagem
      setNovaDescricao('')
      setNovoValor('')
      setNovaDataPrevista(todayStr)
      setIsCriando(false)
      // Abre direto os detalhes da atividade recém-criada para conveniência
      setAtividadeSelecionada(criada)
    } catch (err: unknown) {
      console.error('Erro ao criar atividade de manutenção:', err)
      toast({
        title: 'Erro ao criar atividade',
        description: err instanceof Error ? err.message : 'Não foi possível cadastrar a atividade.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Ação: Designar Equipe (Fornecedor)
  const handleConfirmarDesignacao = async () => {
    if (!atividadeSelecionada) return
    if (!fornecedorEscolhidoId) {
      toast({
        title: 'Selecione um fornecedor',
        description: 'Escolha um fornecedor cadastrado na lista para designar a equipe.',
        variant: 'destructive',
      })
      return
    }

    const fornecedorObj = fornecedores.find((f) => f.id === fornecedorEscolhidoId)
    const equipeNome =
      fornecedorObj?.nome_empresa ||
      fornecedorObj?.razao_social ||
      fornecedorObj?.contato_nome ||
      'Fornecedor Designado'

    try {
      setIsSubmitting(true)
      const atualizada = await updateAtividade(atividadeSelecionada.id, {
        fornecedor_id: fornecedorEscolhidoId,
        equipe_nome: equipeNome,
        responsavel_nome: equipeNome,
        status: 'agendada',
      })

      setAtividadeSelecionada(atualizada)
      setModalDesignarEquipeOpen(false)
      setFornecedorEscolhidoId('')

      toast({
        title: 'Equipe designada com sucesso!',
        description: `Equipe "${equipeNome}" vinculada e status alterado para "Agendada".`,
      })
    } catch (err: unknown) {
      console.error('Erro ao designar equipe:', err)
      toast({
        title: 'Erro ao designar equipe',
        description:
          err instanceof Error
            ? err.message
            : 'Não foi possível salvar a vinculação do fornecedor.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nomeCliente = cliente?.nome || 'Cliente'

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[92vh] max-w-4xl mx-auto flex flex-col bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          {/* Top Bar Header */}
          <DrawerHeader className="border-b bg-white dark:bg-slate-950 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <DrawerTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Atividades de Manutenção
                  </DrawerTitle>
                  <DrawerDescription className="text-xs text-slate-500 dark:text-slate-400">
                    Cliente:{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {nomeCliente}
                    </span>
                    {cliente?.cidade ? ` • ${cliente.cidade}` : ''}
                  </DrawerDescription>
                </div>
              </div>

              {!isCriando && !atividadeSelecionada && (
                <Button
                  onClick={() => setIsCriando(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-lg shadow-sm"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar atividade
                </Button>
              )}
            </div>
          </DrawerHeader>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* VISTA 1: FORMULÁRIO DE NOVA ATIVIDADE */}
            {isCriando && (
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCriando(false)}
                      className="text-slate-600 hover:text-slate-900 gap-1.5 px-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar à lista
                    </Button>
                    <span className="text-slate-300">|</span>
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">
                      Nova Atividade de Manutenção
                    </h3>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50/70 border border-emerald-200 p-3 text-xs text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <span>
                    A atividade criada será vinculada a <strong>{nomeCliente}</strong> e ficará
                    visível na timeline geral de atividades e no painel de Manutenções do CRM.
                  </span>
                </div>

                <form onSubmit={handleCriarAtividade} className="space-y-4">
                  {/* Tipo de atividade vindo da tabela de tipos do banco */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Tipo de Atividade (Tabela do Banco) *
                    </Label>
                    <Select value={novoTipoNome} onValueChange={setNovoTipoNome}>
                      <SelectTrigger className="w-full bg-slate-50/50">
                        <SelectValue placeholder="Selecione o tipo de atividade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposDisponiveis.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.nome}>
                            <div className="flex flex-col text-left py-0.5">
                              <span className="font-medium text-slate-900">{tipo.nome}</span>
                              {tipo.descricao && (
                                <span className="text-[11px] text-slate-500">{tipo.descricao}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Descrição detalhada do serviço */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Descrição do Serviço
                    </Label>
                    <Textarea
                      rows={3}
                      placeholder="Descreva o que será feito (ex.: lavagem dos módulos com água desmineralizada, inspeção de conexões CC/CA, reaperto de bornes, teste de datalogger...)"
                      value={novaDescricao}
                      onChange={(e) => setNovaDescricao(e.target.value)}
                    />
                  </div>

                  {/* Valor e Data Prevista */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                        Valor do Serviço (R$)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 450,00"
                        value={novoValor}
                        onChange={(e) => setNovoValor(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Data Prevista ou Solicitada *
                      </Label>
                      <Input
                        type="date"
                        value={novaDataPrevista}
                        onChange={(e) => setNovaDataPrevista(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCriando(false)}
                      disabled={isSubmitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isSubmitting ? 'Salvando...' : 'Salvar Atividade'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* VISTA 2: DETALHES DE UMA ATIVIDADE ESPECÍFICA */}
            {!isCriando && atividadeSelecionada && (
              <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6 animate-in fade-in duration-200">
                {/* Header de Detalhes com botão Voltar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAtividadeSelecionada(null)}
                    className="gap-1.5 text-slate-700 hover:text-slate-900 border-slate-300"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para lista
                  </Button>

                  <div className="flex items-center gap-2">
                    {(() => {
                      const st =
                        STATUS_CONFIG[atividadeSelecionada.status || 'pendente'] ||
                        STATUS_CONFIG.pendente
                      const Icon = st.icon
                      return (
                        <Badge
                          variant="outline"
                          className={`px-3 py-1 text-xs font-semibold flex items-center gap-1.5 ${st.badgeClass}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {st.label}
                        </Badge>
                      )
                    })()}
                  </div>
                </div>

                {/* Bloco principal de dados */}
                <div className="space-y-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Nome do Serviço
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {atividadeSelecionada.titulo ||
                        atividadeSelecionada.tipo ||
                        'Atividade de Manutenção'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> Data Prevista
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                        {formatDate(atividadeSelecionada.data)}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" /> Valor Cobrado
                      </span>
                      <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                        {formatCurrency(atividadeSelecionada.valor_servico)}
                      </p>
                    </div>

                    <div>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> Equipe Designada
                      </span>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1 truncate">
                        {atividadeSelecionada.equipe_nome ||
                          atividadeSelecionada.expand?.fornecedor_id?.nome_empresa ||
                          'Nenhuma equipe designada'}
                      </p>
                    </div>
                  </div>

                  {/* Descrição Detalhada */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Descrição detalhada do que será feito
                    </span>
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {atividadeSelecionada.descricao ? (
                        atividadeSelecionada.descricao
                      ) : (
                        <span className="text-slate-400 italic">
                          Nenhuma descrição detalhada informada para esta atividade.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fornecedor / Equipe Vinculada */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Fornecedor / Equipe Responsável
                        </h4>
                      </div>

                      <Button
                        type="button"
                        onClick={() => {
                          setFornecedorEscolhidoId(atividadeSelecionada.fornecedor_id || '')
                          setModalDesignarEquipeOpen(true)
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {atividadeSelecionada.fornecedor_id || atividadeSelecionada.equipe_nome
                          ? 'Alterar equipe'
                          : 'Designar equipe'}
                      </Button>
                    </div>

                    {atividadeSelecionada.fornecedor_id || atividadeSelecionada.equipe_nome ? (
                      <div className="flex items-start gap-3 p-3 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                        <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {atividadeSelecionada.equipe_nome ||
                              atividadeSelecionada.expand?.fornecedor_id?.nome_empresa}
                          </p>
                          {atividadeSelecionada.expand?.fornecedor_id?.contato_principal && (
                            <p className="text-slate-500">
                              Contato: {atividadeSelecionada.expand.fornecedor_id.contato_principal}
                            </p>
                          )}
                          {atividadeSelecionada.expand?.fornecedor_id?.telefone && (
                            <p className="text-slate-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {atividadeSelecionada.expand.fornecedor_id.telefone}
                            </p>
                          )}
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-1">
                            ✓ Fornecedor vinculado no banco de dados e atividade marcada como
                            agendada
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">
                        Esta atividade ainda não possui fornecedor/equipe designada. Clique no botão
                        acima para escolher um fornecedor cadastrado.
                      </p>
                    )}
                  </div>
                </div>

                {/* Rodapé com botão Voltar */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAtividadeSelecionada(null)}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </Button>

                  <div className="flex items-center gap-2">
                    {atividadeSelecionada.status !== 'concluida' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const atz = await updateAtividade(atividadeSelecionada.id, {
                              status: 'concluida',
                            })
                            setAtividadeSelecionada(atz)
                            toast({
                              title: 'Atividade concluída!',
                              description: 'Status atualizado para Concluída.',
                            })
                          } catch {
                            toast({
                              title: 'Erro ao atualizar',
                              variant: 'destructive',
                            })
                          }
                        }}
                        className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Marcar como Concluída
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 3: LISTA DE ATIVIDADES DE MANUTENÇÃO VINCULADAS AO CLIENTE */}
            {!isCriando && !atividadeSelecionada && (
              <div className="space-y-4">
                {atividadesDoCliente.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/50">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                      Nenhuma atividade de manutenção vinculada
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
                      Este cliente ainda não tem atividades de manutenção registradas. Clique no
                      botão abaixo para adicionar a primeira atividade.
                    </p>
                    <Button
                      onClick={() => setIsCriando(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar primeira atividade
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                      <span>{atividadesDoCliente.length} atividade(s) encontrada(s)</span>
                      <span>Clique na linha para ver os detalhes completos</span>
                    </div>

                    <div className="space-y-2.5">
                      {atividadesDoCliente.map((item) => {
                        const st =
                          STATUS_CONFIG[item.status || 'pendente'] || STATUS_CONFIG.pendente
                        const Icon = st.icon
                        const temEquipe = Boolean(item.fornecedor_id || item.equipe_nome)

                        return (
                          <div
                            key={item.id}
                            onClick={() => setAtividadeSelecionada(item)}
                            className="group p-4 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            {/* Bloco Esquerda: Nome e data */}
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors truncate">
                                  {item.titulo || item.tipo || 'Atividade de Manutenção'}
                                </h4>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  Prevista: <strong>{formatDate(item.data)}</strong>
                                </span>

                                <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                  <DollarSign className="w-3.5 h-3.5" />
                                  {formatCurrency(item.valor_servico)}
                                </span>
                              </div>
                            </div>

                            {/* Bloco Direita: Status, Indicador de Equipe e Chevron */}
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                              {/* Indicador se tem equipe designada */}
                              {temEquipe ? (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[11px] gap-1 px-2 py-0.5"
                                  title={`Equipe designada: ${item.equipe_nome || 'Fornecedor cadastrado'}`}
                                >
                                  <Users className="w-3 h-3 text-emerald-600" />
                                  Equipe designada
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-500 border-slate-200 text-[11px] gap-1 px-2 py-0.5"
                                  title="Sem equipe designada no momento"
                                >
                                  <Users className="w-3 h-3 text-slate-400" />
                                  Sem equipe
                                </Badge>
                              )}

                              {/* Status */}
                              <Badge
                                variant="outline"
                                className={`text-[11px] px-2.5 py-0.5 font-medium flex items-center gap-1 ${st.badgeClass}`}
                              >
                                <Icon className="w-3 h-3" />
                                {st.label}
                              </Badge>

                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DrawerFooter className="border-t bg-white dark:bg-slate-950 px-6 py-3 flex-shrink-0 flex sm:flex-row items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>
                As atividades salvas são sincronizadas em tempo real com a gestão de Manutenções
                O&M.
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Modal / Dialog: Seletor com Fornecedores cadastrados na tabela do banco */}
      <Dialog open={modalDesignarEquipeOpen} onOpenChange={setModalDesignarEquipeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              Designar Equipe / Fornecedor
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione um dos fornecedores cadastrados na tabela do banco para executar esta
              atividade.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Fornecedor Cadastrado *
              </Label>
              <Select value={fornecedorEscolhidoId} onValueChange={setFornecedorEscolhidoId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {fornecedores.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      Nenhum fornecedor cadastrado na tabela de fornecedores.
                    </div>
                  ) : (
                    fornecedores.map((forn: Fornecedor) => {
                      const label =
                        forn.nome_empresa || forn.razao_social || forn.contato_nome || 'Fornecedor'
                      const extra = forn.cidade ? ` • ${forn.cidade}` : ''
                      return (
                        <SelectItem key={forn.id} value={forn.id}>
                          <div className="flex flex-col text-left py-0.5">
                            <span className="font-medium text-slate-900">{label}</span>
                            <span className="text-[11px] text-slate-500">
                              {forn.especialidade
                                ? `Especialidade: ${forn.especialidade}${extra}`
                                : extra}
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <span>
                Ao confirmar a escolha do fornecedor, o vínculo será salvo no banco de dados e o
                status desta atividade mudará automaticamente para{' '}
                <strong>&ldquo;agendada&rdquo;</strong>.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalDesignarEquipeOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmarDesignacao}
              disabled={isSubmitting || !fornecedorEscolhidoId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Designação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default DrawerAtividadesManutencaoCliente

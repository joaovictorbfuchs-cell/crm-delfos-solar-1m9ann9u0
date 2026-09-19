import React, { useState, useEffect, useCallback } from 'react'
import {
  Zap,
  Plus,
  Play,
  Pause,
  Edit2,
  Trash2,
  History,
  RotateCw,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageSquare,
  FileText,
  UserCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { Automacao, SalvarAutomacaoInput } from '@/types/automacoes'
import {
  fetchAutomacoes,
  createAutomacao,
  updateAutomacao,
  toggleAtivaAutomacao,
  deleteAutomacao,
  runAutomacaoManual,
  getGatilhoDescricaoFormatada,
  getAcaoDescricaoFormatada,
  getDestinoDescricaoFormatada,
} from '@/services/automacoesService'
import { ModalFormAutomacao } from '@/components/ModalFormAutomacao'
import { ModalHistoricoAutomacao } from '@/components/ModalHistoricoAutomacao'
import { toast } from '@/hooks/use-toast'

export default function AutomacoesPage() {
  const [automacoes, setAutomacoes] = useState<Automacao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  // Modais
  const [modalFormOpen, setModalFormOpen] = useState(false)
  const [automacaoEditando, setAutomacaoEditando] = useState<Automacao | null>(null)

  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false)
  const [automacaoHistorico, setAutomacaoHistorico] = useState<Automacao | null>(null)

  const [automacaoExcluindo, setAutomacaoExcluindo] = useState<Automacao | null>(null)
  const [testandoId, setTestandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAutomacoes()
      setAutomacoes(data)
    } catch (e) {
      console.error('Erro ao carregar automações:', e)
      toast({
        title: 'Erro ao carregar automações',
        description: 'Verifique sua conexão ou permissões no sistema.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Filtragem
  const automacoesFiltradas = automacoes.filter((a) => {
    if (!busca) return true
    const term = busca.toLowerCase()
    return (
      a.nome.toLowerCase().includes(term) ||
      getGatilhoDescricaoFormatada(a).toLowerCase().includes(term) ||
      getAcaoDescricaoFormatada(a).toLowerCase().includes(term)
    )
  })

  // Handlers
  const handleToggleAtiva = async (automacao: Automacao) => {
    const novoStatus = !automacao.ativa
    try {
      // Otimista
      setAutomacoes((prev) =>
        prev.map((item) => (item.id === automacao.id ? { ...item, ativa: novoStatus } : item)),
      )
      await toggleAtivaAutomacao(automacao.id, novoStatus)
      toast({
        title: novoStatus ? 'Automação ativada' : 'Automação pausada',
        description: `A automação "${automacao.nome}" está agora ${novoStatus ? 'ativa' : 'pausada'}.`,
      })
    } catch (e) {
      // Reverter
      setAutomacoes((prev) =>
        prev.map((item) => (item.id === automacao.id ? { ...item, ativa: automacao.ativa } : item)),
      )
      toast({
        title: 'Falha ao atualizar status',
        description: 'Não foi possível alterar o estado da automação.',
        variant: 'destructive',
      })
    }
  }

  const handleSalvar = async (dados: SalvarAutomacaoInput) => {
    if (automacaoEditando) {
      await updateAutomacao(automacaoEditando.id, dados)
      toast({
        title: 'Automação atualizada',
        description: `As alterações em "${dados.nome}" foram salvas com sucesso.`,
      })
    } else {
      await createAutomacao(dados)
      toast({
        title: 'Automação criada',
        description: `A automação "${dados.nome}" foi cadastrada com sucesso.`,
      })
    }
    carregar()
  }

  const handleExcluir = async () => {
    if (!automacaoExcluindo) return
    try {
      await deleteAutomacao(automacaoExcluindo.id)
      toast({
        title: 'Automação excluída',
        description: `A automação "${automacaoExcluindo.nome}" foi removida.`,
      })
      setAutomacaoExcluindo(null)
      carregar()
    } catch (e) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a automação.',
        variant: 'destructive',
      })
    }
  }

  const handleTestarExecucao = async (automacao: Automacao) => {
    setTestandoId(automacao.id)
    try {
      const res = await runAutomacaoManual(automacao.id, undefined, true)
      if (res.ok) {
        toast({
          title: res.sucesso ? 'Teste executado com sucesso!' : 'Executado com aviso/falha',
          description:
            res.mensagem || 'Disparo manual concluído. Verifique o histórico de execuções.',
          variant: res.sucesso ? 'default' : 'destructive',
        })
      } else {
        toast({
          title: 'Falha no teste',
          description: res.mensagem || 'Não foi possível rodar o teste manual.',
          variant: 'destructive',
        })
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Falha na requisição de teste'
      toast({
        title: 'Erro na execução',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setTestandoId(null)
    }
  }

  // Ícone representativo da Ação
  const getAcaoIcon = (acao: string) => {
    switch (acao) {
      case 'enviar_whatsapp':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />
      case 'criar_atividade':
        return <FileText className="w-4 h-4 text-blue-600" />
      case 'mudar_status':
        return <UserCheck className="w-4 h-4 text-amber-600" />
      default:
        return <Sparkles className="w-4 h-4 text-purple-600" />
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header com Título e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              Automações do CRM
              <Badge
                variant="outline"
                className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[11px] font-semibold"
              >
                Sem código
              </Badge>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Crie e gerencie fluxos automáticos de WhatsApp, criação de atividades e avanço de
              funil.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregar()}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => {
              setAutomacaoEditando(null)
              setModalFormOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 h-9 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Nova Automação
          </Button>
        </div>
      </div>

      {/* Barra de Filtro e Métricas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <Input
            placeholder="Buscar por nome, gatilho ou ação..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 text-xs bg-white h-9"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700">Total:</span> {automacoes.length} automações
          <span className="text-gray-300">•</span>
          <span className="text-emerald-700 font-semibold">
            {automacoes.filter((a) => a.ativa).length} ativas
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500">
            {automacoes.filter((a) => !a.ativa).length} pausadas
          </span>
        </div>
      </div>

      {/* Lista de Automações */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-xs text-gray-500 bg-white rounded-2xl border">
          <RotateCw className="w-6 h-6 animate-spin text-emerald-600" />
          Carregando automações configuradas...
        </div>
      ) : automacoesFiltradas.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <Zap className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-sm font-bold text-gray-800">
            {busca ? 'Nenhuma automação encontrada para esta busca' : 'Nenhuma automação criada'}
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
            {busca
              ? 'Tente utilizar outros termos para refinar sua pesquisa.'
              : 'Automatize tarefas repetitivas como avisos de feedback, follow-ups de vendas e auto-leitura.'}
          </p>
          {!busca && (
            <Button
              onClick={() => {
                setAutomacaoEditando(null)
                setModalFormOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Criar Primeira Automação
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {automacoesFiltradas.map((automacao) => {
            const gatilhoDesc = getGatilhoDescricaoFormatada(automacao)
            const acaoDesc = getAcaoDescricaoFormatada(automacao)
            const destinoDesc = getDestinoDescricaoFormatada(automacao)

            return (
              <div
                key={automacao.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 bg-white ${
                  automacao.ativa
                    ? 'border-gray-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300'
                    : 'border-gray-200/60 bg-gray-50/50 opacity-80'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Informações da automação */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 tracking-tight truncate">
                        {automacao.nome}
                      </h3>

                      {automacao.ativa ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold px-2 py-0.5 gap-1 hover:bg-emerald-100">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] font-bold px-2 py-0.5 gap-1 hover:bg-gray-100">
                          <Pause className="w-3 h-3 text-gray-400" />
                          Pausada
                        </Badge>
                      )}

                      <span className="text-[11px] text-gray-400">Destino: {destinoDesc}</span>
                    </div>

                    {/* Linha com Gatilho e Ação em destaque */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      {/* Gatilho */}
                      <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <div className="p-1.5 bg-white rounded-lg shadow-2xs text-amber-600 shrink-0 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                            Quando dispara (Gatilho)
                          </span>
                          <span className="font-semibold text-gray-800 break-words">
                            {gatilhoDesc}
                          </span>
                        </div>
                      </div>

                      {/* Ação */}
                      <div className="flex items-start gap-2 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200/70">
                        <div className="p-1.5 bg-white rounded-lg shadow-2xs shrink-0 mt-0.5">
                          {getAcaoIcon(automacao.acao)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">
                            O que faz (Ação)
                          </span>
                          <span className="font-semibold text-gray-900 break-words">
                            {acaoDesc}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação na Direita */}
                  <div className="flex flex-wrap items-center justify-end gap-1.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    {/* Botão Testar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestarExecucao(automacao)}
                      disabled={testandoId === automacao.id}
                      className="text-xs h-8 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 gap-1 px-2.5"
                      title="Disparar um teste manual agora para validar o fluxo"
                    >
                      <Play
                        className={`w-3.5 h-3.5 ${testandoId === automacao.id ? 'animate-spin' : ''}`}
                      />
                      <span className="hidden sm:inline">Testar</span>
                    </Button>

                    {/* Botão Histórico */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAutomacaoHistorico(automacao)
                        setModalHistoricoOpen(true)
                      }}
                      className="text-xs h-8 gap-1.5 px-2.5 text-gray-700 hover:bg-gray-100"
                      title="Ver histórico de execuções desta automação"
                    >
                      <History className="w-3.5 h-3.5 text-gray-500" />
                      Histórico
                    </Button>

                    {/* Toggle Pausar / Ativar */}
                    <div
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg border bg-gray-50/70 h-8 cursor-pointer"
                      onClick={() => handleToggleAtiva(automacao)}
                      title={automacao.ativa ? 'Pausar automação' : 'Ativar automação'}
                    >
                      <Switch
                        checked={automacao.ativa}
                        onCheckedChange={() => handleToggleAtiva(automacao)}
                        className="scale-75 origin-left"
                      />
                      <span className="text-[11px] font-medium text-gray-600 hidden sm:inline select-none">
                        {automacao.ativa ? 'Ativa' : 'Pausada'}
                      </span>
                    </div>

                    {/* Botão Editar */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAutomacaoEditando(automacao)
                        setModalFormOpen(true)
                      }}
                      className="h-8 w-8 p-0 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50"
                      title="Editar regras da automação"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    {/* Botão Excluir */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAutomacaoExcluindo(automacao)}
                      className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Excluir automação"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Formulário (Criar / Editar) */}
      <ModalFormAutomacao
        isOpen={modalFormOpen}
        onClose={() => setModalFormOpen(false)}
        onSave={handleSalvar}
        automacaoParaEditar={automacaoEditando}
      />

      {/* Modal de Histórico */}
      <ModalHistoricoAutomacao
        isOpen={modalHistoricoOpen}
        onClose={() => {
          setModalHistoricoOpen(false)
          setAutomacaoHistorico(null)
        }}
        automacao={automacaoHistorico}
      />

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={Boolean(automacaoExcluindo)}
        onOpenChange={(open) => !open && setAutomacaoExcluindo(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <AlertDialogTitle>Excluir Automação?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-gray-600 pt-1">
              Tem certeza que deseja excluir a automação &ldquo;{automacaoExcluindo?.nome}&rdquo;?
              Esta ação removerá a regra e seu histórico de execuções.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  FileText,
  Plus,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
  Loader2,
  Check,
  Tag,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Negocio, Atividade, AtividadeTipo } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { ModalNovaAtividade } from '@/components/ModalNovaAtividade'
import {
  fetchAtividadesByNegocio,
  fetchAtividadesByCliente,
  updateAtividade,
} from '@/services/crmService'
import { toast } from 'sonner'

interface SecaoAtividadesNegocioProps {
  negocio: Negocio
  clienteNome: string
}

export const SecaoAtividadesNegocio: React.FC<SecaoAtividadesNegocioProps> = ({
  negocio,
  clienteNome,
}) => {
  const { user } = useAuth()
  const { usuarios, addAtividade } = useClientes()

  const [atividadesVinculadas, setAtividadesVinculadas] = useState<Atividade[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [modalNovaAtividadeOpen, setModalNovaAtividadeOpen] = useState(false)
  const [tipoInicialModal, setTipoInicialModal] = useState<AtividadeTipo>('contato_ligacao')

  // Form rápido de anotação
  const [textoAnotacao, setTextoAnotacao] = useState('')
  const [isSalvandoAnotacao, setIsSalvandoAnotacao] = useState(false)

  // Drawer/Modal de vinculação manual de atividades existentes do cliente
  const [modalVincularExistentesOpen, setModalVincularExistentesOpen] = useState(false)
  const [atividadesDoCliente, setAtividadesDoCliente] = useState<Atividade[]>([])
  const [isLoadingClienteAtivs, setIsLoadingClienteAtivs] = useState(false)
  const [selecionadasParaVincular, setSelecionadasParaVincular] = useState<Set<string>>(new Set())
  const [isSalvandoVinculos, setIsSalvandoVinculos] = useState(false)

  // Filtro de exibição na lista deste negócio: 'todos' | 'atividades' | 'anotacoes'
  const [abaAtiva, setAbaAtiva] = useState<'todos' | 'atividades' | 'anotacoes'>('todos')
  const [expandirNovaAnotacao, setExpandirNovaAnotacao] = useState(false)

  const carregarAtividades = async () => {
    if (!negocio.id) return
    setIsLoading(true)
    try {
      const records = await fetchAtividadesByNegocio(negocio.id)
      setAtividadesVinculadas(records)
    } catch (err) {
      console.warn('Erro ao carregar atividades do negócio:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarAtividades()
  }, [negocio.id])

  // Lista separada de atividades vs anotações
  const anotacoes = useMemo(
    () => atividadesVinculadas.filter((a) => a.tipo === 'anotacao'),
    [atividadesVinculadas],
  )
  const tarefas = useMemo(
    () => atividadesVinculadas.filter((a) => a.tipo !== 'anotacao'),
    [atividadesVinculadas],
  )

  const listaFiltrada = useMemo(() => {
    if (abaAtiva === 'anotacoes') return anotacoes
    if (abaAtiva === 'atividades') return tarefas
    return atividadesVinculadas
  }, [abaAtiva, anotacoes, tarefas, atividadesVinculadas])

  // Abrir modal de criação já contextualizada
  const handleAbrirNovaAtividade = (tipo: AtividadeTipo = 'contato_ligacao') => {
    setTipoInicialModal(tipo)
    setModalNovaAtividadeOpen(true)
  }

  // Criação rápida de anotação contextualizada (direto na ficha do negócio)
  const handleSalvarAnotacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!textoAnotacao.trim()) {
      toast.error('Digite o texto da anotação.')
      return
    }

    setIsSalvandoAnotacao(true)
    try {
      await addAtividade({
        cliente_id: negocio.cliente_id,
        negocio_id: negocio.id,
        tipo: 'anotacao',
        titulo: `Anotação • ${negocio.titulo || 'Negócio'}`,
        descricao: textoAnotacao.trim(),
        data: new Date().toISOString(),
        autor: user?.name || 'Consultor Comercial',
        responsavel_id: user?.id,
        responsavel_nome: user?.name || 'Consultor Comercial',
        status: 'concluida',
      })
      setTextoAnotacao('')
      setExpandirNovaAnotacao(false)
      toast.success('Anotação vinculada ao negócio com sucesso!')
      await carregarAtividades()
    } catch (err) {
      console.error('Erro ao adicionar anotação:', err)
      toast.error('Erro ao salvar anotação vinculada ao negócio.')
    } finally {
      setIsSalvandoAnotacao(false)
    }
  }

  // Alternar status de atividade (concluída vs pendente)
  const handleToggleConcluida = async (ativ: Atividade) => {
    const novoStatus = ativ.status === 'concluida' ? 'pendente' : 'concluida'
    try {
      await updateAtividade(ativ.id, {
        status: novoStatus,
      })
      toast.success(
        novoStatus === 'concluida' ? 'Atividade concluída!' : 'Atividade marcada como pendente.',
      )
      await carregarAtividades()
    } catch (err) {
      console.error('Erro ao alterar status da atividade:', err)
      toast.error('Não foi possível alterar o status.')
    }
  }

  // Carregar atividades gerais do cliente para o modal de vinculação manual
  const handleAbrirModalVincularExistentes = async () => {
    setModalVincularExistentesOpen(true)
    setIsLoadingClienteAtivs(true)
    setSelecionadasParaVincular(new Set())
    try {
      const records = await fetchAtividadesByCliente(negocio.cliente_id)
      // Exclui as que já estão vinculadas a este mesmo negócio
      const disponiveis = records.filter((a) => a.negocio_id !== negocio.id)
      setAtividadesDoCliente(disponiveis)
    } catch (err) {
      console.warn('Erro ao carregar atividades do cliente para vincular:', err)
      toast.error('Erro ao buscar atividades do cliente.')
    } finally {
      setIsLoadingClienteAtivs(false)
    }
  }

  const toggleSelecaoAtividade = (id: string) => {
    setSelecionadasParaVincular((prev) => {
      const novo = new Set(prev)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const handleSalvarVinculosManuais = async () => {
    if (selecionadasParaVincular.size === 0) {
      toast.info('Selecione pelo menos uma atividade para vincular.')
      return
    }

    setIsSalvandoVinculos(true)
    try {
      const ids = Array.from(selecionadasParaVincular)
      await Promise.all(
        ids.map((id) =>
          updateAtividade(id, {
            negocio_id: negocio.id,
          }),
        ),
      )
      toast.success(
        `${ids.length} ${ids.length === 1 ? 'atividade vinculada' : 'atividades vinculadas'} a este negócio com sucesso!`,
      )
      setModalVincularExistentesOpen(false)
      await carregarAtividades()
    } catch (err) {
      console.error('Erro ao vincular atividades existentes:', err)
      toast.error('Erro ao vincular atividades ao negócio.')
    } finally {
      setIsSalvandoVinculos(false)
    }
  }

  // Formatação de data/hora legível
  const formatarData = (dataIso?: string) => {
    if (!dataIso) return ''
    try {
      const d = new Date(dataIso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dataIso
    }
  }

  return (
    <div className="space-y-4 pt-3 border-t border-slate-200">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 text-amber-700 rounded-lg">
            <Tag className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Atividades & Anotações deste Negócio
            </h5>
            <p className="text-[11px] text-slate-500">
              Histórico operacional e comercial restrito a esta oportunidade.
            </p>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleAbrirModalVincularExistentes}
            className="text-xs h-7 px-2.5 text-slate-700 hover:text-amber-800 hover:border-amber-400 bg-white"
            title="Selecionar atividades existentes do cliente e vincular a este negócio"
          >
            <LinkIcon className="w-3 h-3 text-amber-600 mr-1" />
            Vincular existentes
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setExpandirNovaAnotacao((v) => !v)}
            className="text-xs h-7 px-2.5 text-slate-700 hover:text-amber-800 hover:border-amber-400 bg-white"
          >
            <FileText className="w-3 h-3 text-amber-600 mr-1" />+ Anotação
            {expandirNovaAnotacao ? (
              <ChevronUp className="w-3 h-3 ml-1" />
            ) : (
              <ChevronDown className="w-3 h-3 ml-1" />
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleAbrirNovaAtividade('contato_ligacao')}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold h-7 px-2.5"
          >
            <Plus className="w-3 h-3 text-[#E0A838] mr-1" />+ Nova Atividade
          </Button>
        </div>
      </div>

      {/* Box de Adição Rápida de Anotação (Expansível) */}
      {expandirNovaAnotacao && (
        <form
          onSubmit={handleSalvarAnotacao}
          className="p-3 bg-amber-50/60 border border-amber-200/90 rounded-xl space-y-2 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Nova anotação vinculada automaticamente a este negócio
            </Label>
            <span className="text-[10px] text-amber-800 font-medium">Ficará salva na timeline</span>
          </div>
          <Textarea
            value={textoAnotacao}
            onChange={(e) => setTextoAnotacao(e.target.value)}
            placeholder="Ex: Cliente solicitou renegociação das condições de pagamento para fechar esta semana..."
            rows={2}
            className="text-xs bg-white resize-none"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandirNovaAnotacao(false)}
              className="h-7 text-xs text-slate-600"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSalvandoAnotacao || !textoAnotacao.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-7"
            >
              {isSalvandoAnotacao ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Salvando...
                </>
              ) : (
                'Salvar Anotação'
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Alternador de Abas de Filtro */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAbaAtiva('todos')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              abaAtiva === 'todos'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({atividadesVinculadas.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('atividades')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              abaAtiva === 'atividades'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3 h-3" />
            Atividades ({tarefas.length})
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('anotacoes')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              abaAtiva === 'anotacoes'
                ? 'bg-amber-700 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3 h-3" />
            Anotações ({anotacoes.length})
          </button>
        </div>

        {atividadesVinculadas.length > 0 && (
          <span className="text-[11px] text-slate-400">
            Vinculadas por <code>negocio_id</code>
          </span>
        )}
      </div>

      {/* Lista de Registros */}
      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>Carregando atividades do negócio...</span>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="p-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
          <Clock className="w-6 h-6 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">
            {abaAtiva === 'anotacoes'
              ? 'Nenhuma anotação vinculada a este negócio'
              : abaAtiva === 'atividades'
                ? 'Nenhuma atividade vinculada a este negócio'
                : 'Nenhuma atividade ou anotação vinculada'}
          </p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
            Atividades criadas a partir desta ficha já nascem vinculadas automaticamente. Você
            também pode vincular atividades existentes do cliente.
          </p>
          <div className="flex items-center justify-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => handleAbrirNovaAtividade('contato_ligacao')}
              className="h-7 text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Criar Atividade
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setExpandirNovaAnotacao(true)}
              className="h-7 text-xs"
            >
              <FileText className="w-3 h-3 mr-1" />
              Criar Anotação
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {listaFiltrada.map((item) => {
            const isAnotacao = item.tipo === 'anotacao'
            const isConcluida = item.status === 'concluida'

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all ${
                  isAnotacao
                    ? 'bg-amber-50/40 border-amber-200/80'
                    : isConcluida
                      ? 'bg-slate-50/80 border-slate-200 opacity-90'
                      : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Botão de Conclusão para tarefas */}
                    {!isAnotacao ? (
                      <button
                        type="button"
                        onClick={() => handleToggleConcluida(item)}
                        className={`mt-0.5 shrink-0 rounded-full p-0.5 transition-colors ${
                          isConcluida
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-slate-300 hover:text-emerald-600'
                        }`}
                        title={isConcluida ? 'Marcar como pendente' : 'Marcar como concluída'}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 ${isConcluida ? 'fill-emerald-100' : ''}`}
                        />
                      </button>
                    ) : (
                      <div className="mt-0.5 p-1 bg-amber-100 text-amber-800 rounded-md shrink-0">
                        <FileText className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs font-bold text-slate-900 ${
                            isConcluida && !isAnotacao ? 'line-through text-slate-500' : ''
                          }`}
                        >
                          {item.titulo}
                        </span>

                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold px-1.5 py-0 capitalize ${
                            isAnotacao
                              ? 'bg-amber-100/70 text-amber-900 border-amber-300'
                              : isConcluida
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {isAnotacao ? 'Anotação' : item.tipo.replace('_', ' ')}
                        </Badge>

                        {item.categoria && item.categoria !== 'comercial' && (
                          <Badge
                            variant="outline"
                            className="text-[9px] font-normal px-1 py-0 bg-slate-100 text-slate-600"
                          >
                            {item.categoria}
                          </Badge>
                        )}
                      </div>

                      {item.descricao && (
                        <p className="text-xs text-slate-600 whitespace-pre-line break-words bg-white/70 p-2 rounded-lg border border-slate-100">
                          {item.descricao}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap pt-0.5">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatarData(item.data || item.created)}
                        </span>

                        {(item.responsavel_nome || item.autor) && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <User className="w-3 h-3 text-slate-400" />
                            {item.responsavel_nome || item.autor}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Dedicado para Criação de Nova Atividade (Nascendo Vinculada) */}
      <ModalNovaAtividade
        isOpen={modalNovaAtividadeOpen}
        onClose={() => setModalNovaAtividadeOpen(false)}
        initialClienteId={negocio.cliente_id}
        initialNegocioId={negocio.id}
        initialTipo={tipoInicialModal}
        onAtividadeCriada={() => {
          setModalNovaAtividadeOpen(false)
          carregarAtividades()
        }}
      />

      {/* Modal de Vinculação Manual de Atividades Existentes */}
      {modalVincularExistentesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-slate-200 shadow-xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-[#0F2038] flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-amber-600" />
                  Vincular Atividades Existentes ao Negócio
                </h4>
                <p className="text-xs text-slate-500">
                  Selecione atividades ou anotações já cadastradas de{' '}
                  <strong className="text-slate-700">{clienteNome}</strong> para atribuir a este
                  negócio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalVincularExistentesOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {isLoadingClienteAtivs ? (
              <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Buscando histórico do cliente...</span>
              </div>
            ) : atividadesDoCliente.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 space-y-1">
                <p className="font-semibold">Nenhuma outra atividade disponível para vincular.</p>
                <p className="text-[11px] text-slate-400">
                  Todas as atividades deste cliente já estão associadas a este negócio ou o cliente
                  não possui outras pendências.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                <div className="text-[11px] font-semibold text-slate-500 px-1">
                  Selecione os itens desejados ({selecionadasParaVincular.size} selecionados):
                </div>
                {atividadesDoCliente.map((ativ) => {
                  const isChecked = selecionadasParaVincular.has(ativ.id)
                  const jaTemOutroNegocio = Boolean(ativ.negocio_id)

                  return (
                    <label
                      key={ativ.id}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-amber-50/70 border-amber-300'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelecaoAtividade(ativ.id)}
                        className="mt-1 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{ativ.titulo}</span>
                          <Badge
                            variant="outline"
                            className="text-[9px] font-bold px-1.5 py-0 capitalize"
                          >
                            {ativ.tipo}
                          </Badge>
                          {jaTemOutroNegocio && (
                            <span className="text-[9px] text-amber-700 bg-amber-100 px-1 rounded">
                              Reatribuir (estava em outro negócio)
                            </span>
                          )}
                        </div>
                        {ativ.descricao && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {ativ.descricao}
                          </p>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-1">
                          {formatarData(ativ.data || ativ.created)} •{' '}
                          {ativ.responsavel_nome || ativ.autor || 'Sem responsável'}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}

            <div className="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalVincularExistentesOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isSalvandoVinculos || selecionadasParaVincular.size === 0}
                onClick={handleSalvarVinculosManuais}
                className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold"
              >
                {isSalvandoVinculos ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1 text-[#E0A838]" />
                    Vincular Selecionadas ({selecionadasParaVincular.size})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

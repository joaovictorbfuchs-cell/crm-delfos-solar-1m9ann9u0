import React, { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Plus,
  Calendar,
  Clock,
  User,
  Trash2,
  Loader2,
  MessageSquare,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import type { Atividade, UsinaCliente } from '@/types/crm'

interface BlocoAnotacoesUsinaProps {
  usina: UsinaCliente
  clienteId?: string
  clienteNome?: string
}

export const BlocoAnotacoesUsina: React.FC<BlocoAnotacoesUsinaProps> = ({
  usina,
  clienteId,
  clienteNome,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [anotacoes, setAnotacoes] = useState<Atividade[]>([])
  const [carregando, setCarregando] = useState<boolean>(true)
  const [salvando, setSalvando] = useState<boolean>(false)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  // Formulário de nova anotação
  const [textoAnotacao, setTextoAnotacao] = useState('')
  const [dataAnotacao, setDataAnotacao] = useState('')
  const [formAberto, setFormAberto] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  // Cliente herdado prioritário: prop clienteId -> usina.cliente_id -> usina.cliente
  const clienteAlvoId = clienteId || usina.cliente_id || (usina as any).cliente || ''

  // Carrega as anotações vinculadas a esta usina
  const carregarAnotacoes = useCallback(async () => {
    if (!usina?.id) return
    setCarregando(true)
    try {
      const records = await pb.collection('atividades').getFullList<Atividade>({
        filter: `usina_id = "${usina.id}" && tipo = "anotacao"`,
        sort: '-created',
        requestKey: null,
      })
      setAnotacoes(records || [])
    } catch (err) {
      console.warn('Erro ao carregar anotações da usina:', err)
    } finally {
      setCarregando(false)
    }
  }, [usina?.id])

  useEffect(() => {
    carregarAnotacoes()
  }, [carregarAnotacoes])

  // Submissão do formulário
  const handleSalvarAnotacao = async (e: React.FormEvent) => {
    e.preventDefault()
    const textoLimpo = textoAnotacao.trim()
    if (!textoLimpo) {
      setErroForm('O texto da anotação não pode ficar vazio.')
      return
    }

    setSalvando(true)
    setErroForm(null)

    try {
      const autorNome = user?.name || user?.email || 'Usuário Delfos'

      // Se informou data opcional, normaliza para ISO datetime; se vazia, não envia para atuar como histórico simples
      let dataFormatada: string | undefined = undefined
      if (dataAnotacao && dataAnotacao.trim()) {
        const iso = new Date(dataAnotacao.trim() + 'T12:00:00Z').toISOString()
        dataFormatada = iso.replace('T', ' ').replace(/\.\d{3}Z?$/, '')
      }

      const payload: Record<string, any> = {
        tipo: 'anotacao',
        titulo: 'Anotação da Usina',
        descricao: textoLimpo,
        usina_id: usina.id,
        status: 'concluida',
        autor: autorNome,
        responsavel_nome: autorNome,
      }

      if (clienteAlvoId) {
        payload.cliente_id = clienteAlvoId
        // Também envia campo cliente se existir no schema
        payload.cliente = clienteAlvoId
      }

      if (user?.id) {
        payload.responsavel_id = user.id
      }

      if (dataFormatada) {
        payload.data = dataFormatada
      }

      const criado = await pb.collection('atividades').create<Atividade>(payload)

      setAnotacoes((prev) => [criado, ...prev])
      setTextoAnotacao('')
      setDataAnotacao('')
      setFormAberto(false)

      toast({
        title: 'Anotação salva com sucesso! 📝',
        description: `Registrada na ficha da usina ${usina.nome}.`,
      })
    } catch (err: any) {
      console.error('Erro ao salvar anotação da usina:', err)
      setErroForm(err?.message || 'Falha ao salvar a anotação. Tente novamente.')
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível registrar a anotação da usina.',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Exclusão de anotação
  const handleExcluirAnotacao = async (id: string) => {
    const confirmou = window.confirm('Deseja realmente excluir esta anotação?')
    if (!confirmou) return

    setExcluindoId(id)
    try {
      await pb.collection('atividades').delete(id)
      setAnotacoes((prev) => prev.filter((a) => a.id !== id))
      toast({
        title: 'Anotação excluída',
        description: 'O registro foi removido com sucesso.',
      })
    } catch (err) {
      console.error('Erro ao excluir anotação:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: 'Não foi possível remover a anotação.',
      })
    } finally {
      setExcluindoId(null)
    }
  }

  const formatarDataExibicao = (dataIso?: string, createdIso?: string) => {
    const target = dataIso || createdIso
    if (!target) return ''
    try {
      const d = new Date(target)
      if (isNaN(d.getTime())) return target
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return target
    }
  }

  return (
    <div
      data-testid="bloco-anotacoes-usina"
      className="p-4 rounded-2xl border border-amber-300 bg-amber-50/40 shadow-xs space-y-3.5"
    >
      {/* Cabeçalho do Bloco */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 border-b border-amber-200/70 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#0F2038] text-amber-400 shadow-xs">
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#0F2038] uppercase tracking-wider">
                Anotações da Usina
              </span>
              <Badge
                variant="outline"
                className="bg-white text-amber-900 text-[11px] font-bold border-amber-300 shadow-2xs"
              >
                {anotacoes.length} {anotacoes.length === 1 ? 'anotação' : 'anotações'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Histórico operacional, observações de visitas e notas internas desta usina
              {clienteNome ? ` (${clienteNome})` : ''}
            </p>
          </div>
        </div>

        <div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setFormAberto((prev) => !prev)
              setErroForm(null)
            }}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs shadow-2xs h-8 px-3 rounded-lg flex items-center gap-1.5 transition-transform active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>{formAberto ? 'Fechar Formulário' : 'Nova Anotação'}</span>
          </Button>
        </div>
      </div>

      {/* Formulário de Nova Anotação */}
      {formAberto && (
        <form
          onSubmit={handleSalvarAnotacao}
          className="p-3.5 bg-white rounded-xl border border-amber-300 shadow-xs space-y-3 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F2038]">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Registrar Nova Anotação</span>
            </div>
            <span className="text-[10px] text-slate-500">
              Autor: <strong>{user?.name || user?.email || 'Logado'}</strong>
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 block">
              Texto da anotação <span className="text-red-500">*</span>
            </label>
            <Textarea
              rows={3}
              value={textoAnotacao}
              onChange={(e) => {
                setTextoAnotacao(e.target.value)
                if (erroForm) setErroForm(null)
              }}
              placeholder="Digite a anotação, detalhes de acesso ao padrão, histórico técnico, orientações de campo..."
              className="text-xs resize-y bg-white border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Data de Referência</span>
                <span className="text-[10px] font-normal text-slate-400">(opcional)</span>
              </label>
              <Input
                type="date"
                value={dataAnotacao}
                onChange={(e) => setDataAnotacao(e.target.value)}
                className="text-xs h-8 bg-white"
              />
              <p className="text-[10px] text-slate-400">
                Se deixar em branco, atua como histórico simples da usina.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormAberto(false)
                  setTextoAnotacao('')
                  setDataAnotacao('')
                  setErroForm(null)
                }}
                disabled={salvando}
                className="text-xs h-8"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando || !textoAnotacao.trim()}
                className="bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs h-8 px-4"
              >
                {salvando ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Anotação</span>
                )}
              </Button>
            </div>
          </div>

          {erroForm && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erroForm}</span>
            </div>
          )}
        </form>
      )}

      {/* Lista de Anotações */}
      {carregando ? (
        <div className="py-8 text-center text-xs text-amber-900 flex items-center justify-center gap-2 bg-white rounded-xl border border-dashed border-amber-300">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>Carregando anotações da usina...</span>
        </div>
      ) : anotacoes.length === 0 ? (
        <div className="py-7 text-center text-xs text-slate-500 bg-white/70 rounded-xl border border-dashed border-slate-200 space-y-1.5 p-4">
          <FileText className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="font-bold text-slate-700">Nenhuma anotação registrada para esta usina.</p>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Clique no botão acima para adicionar observações, histórico de campo ou lembretes
            técnicos sobre esta unidade geradora.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
          {anotacoes.map((item) => {
            const dataExibicao = formatarDataExibicao(item.data, item.created)
            const autorNome = item.autor || item.responsavel_nome || 'Delfos Solar'
            const isExcluindo = excluindoId === item.id

            return (
              <div
                key={item.id}
                className="p-3 bg-white hover:bg-amber-50/30 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start justify-between gap-2.5 transition-colors shadow-2xs group"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      {item.titulo || 'Anotação da Usina'}
                    </span>

                    {dataExibicao && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{dataExibicao}</span>
                      </span>
                    )}

                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{autorNome}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {item.descricao || (item as any).texto || '(sem conteúdo)'}
                  </p>
                </div>

                <div className="shrink-0 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => handleExcluirAnotacao(item.id)}
                    disabled={isExcluindo}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Excluir anotação"
                    aria-label="Excluir anotação"
                  >
                    {isExcluindo ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
export default BlocoAnotacoesUsina

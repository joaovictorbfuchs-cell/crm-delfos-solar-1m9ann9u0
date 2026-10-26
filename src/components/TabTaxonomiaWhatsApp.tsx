import React, { useState, useEffect } from 'react'
import {
  Plus,
  Edit2,
  Trash2,
  MoveUp,
  MoveDown,
  Sparkles,
  Layers,
  AlertTriangle,
  FolderTree,
  Tag,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { WhatsAppTemplateCategoria, WhatsAppTemplateEtapa } from '@/types/crm'
import { whatsappTemplateTaxonomiaService } from '@/services/whatsappTemplateTaxonomiaService'

interface TabTaxonomiaProps {
  tipo: 'categoria' | 'etapa'
  itens: Array<WhatsAppTemplateCategoria | WhatsAppTemplateEtapa>
  onRecarregar: () => Promise<void>
}

const CORES_PALETA = [
  { label: 'Esmeralda / Verde', value: 'emerald' },
  { label: 'Azul', value: 'blue' },
  { label: 'Roxo', value: 'purple' },
  { label: 'Âmbar / Amarelo', value: 'amber' },
  { label: 'Laranja', value: 'orange' },
  { label: 'Rosa / Rose', value: 'rose' },
  { label: 'Ciano', value: 'cyan' },
]

export const TabTaxonomiaWhatsApp: React.FC<TabTaxonomiaProps> = ({
  tipo,
  itens,
  onRecarregar,
}) => {
  const { toast } = useToast()
  const isCategoria = tipo === 'categoria'
  const singular = isCategoria ? 'Categoria' : 'Etapa'
  const plural = isCategoria ? 'Categorias' : 'Etapas'

  // Lista local ordenada
  const [lista, setLista] = useState<Array<WhatsAppTemplateCategoria | WhatsAppTemplateEtapa>>([])
  useEffect(() => {
    const ordenado = [...itens].sort((a, b) => (a.ordem ?? 999) - (b.ordem ?? 999))
    setLista(ordenado)
  }, [itens])

  // Modal Criar / Editar
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false)
  const [itemEditando, setItemEditando] = useState<
    WhatsAppTemplateCategoria | WhatsAppTemplateEtapa | null
  >(null)
  const [nomeForm, setNomeForm] = useState('')
  const [corForm, setCorForm] = useState('emerald')
  const [descricaoForm, setDescricaoForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Diálogo de Exclusão / Migração
  const [itemParaExcluir, setItemParaExcluir] = useState<
    WhatsAppTemplateCategoria | WhatsAppTemplateEtapa | null
  >(null)
  const [totalUso, setTotalUso] = useState<number>(0)
  const [destinoMigracao, setDestinoMigracao] = useState<string>('')
  const [checandoUso, setChecandoUso] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  const abrirCriar = () => {
    setItemEditando(null)
    setNomeForm('')
    setCorForm(isCategoria ? 'emerald' : '')
    setDescricaoForm('')
    setAtivoForm(true)
    setModalEdicaoOpen(true)
  }

  const abrirEditar = (item: WhatsAppTemplateCategoria | WhatsAppTemplateEtapa) => {
    setItemEditando(item)
    setNomeForm(item.nome)
    setCorForm(item.cor || (isCategoria ? 'emerald' : ''))
    setDescricaoForm(item.descricao || '')
    setAtivoForm(item.ativo !== false)
    setModalEdicaoOpen(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    const nomeLimpo = nomeForm.trim()
    if (!nomeLimpo) {
      toast({
        title: 'Nome obrigatório',
        description: `Informe o nome da ${singular.toLowerCase()}.`,
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      if (itemEditando) {
        const nomeAntigo = itemEditando.nome
        if (isCategoria) {
          // Renomear em cascata se o nome mudou
          if (nomeAntigo !== nomeLimpo) {
            const { templatesAtualizados } =
              await whatsappTemplateTaxonomiaService.renomearCategoriaCascata(
                itemEditando.id,
                nomeLimpo,
                nomeAntigo,
              )
            if (templatesAtualizados > 0) {
              toast({
                title: 'Modelos atualizados em cascata',
                description: `${templatesAtualizados} modelo(s) tiveram sua categoria atualizada para "${nomeLimpo}".`,
              })
            }
          }
          await whatsappTemplateTaxonomiaService.atualizarCategoria(itemEditando.id, {
            nome: nomeLimpo,
            cor: corForm,
            descricao: descricaoForm.trim(),
            ativo: ativoForm,
          })
        } else {
          if (nomeAntigo !== nomeLimpo) {
            const { templatesAtualizados } =
              await whatsappTemplateTaxonomiaService.renomearEtapaCascata(
                itemEditando.id,
                nomeLimpo,
                nomeAntigo,
              )
            if (templatesAtualizados > 0) {
              toast({
                title: 'Modelos atualizados em cascata',
                description: `${templatesAtualizados} modelo(s) tiveram sua etapa atualizada para "${nomeLimpo}".`,
              })
            }
          }
          await whatsappTemplateTaxonomiaService.atualizarEtapa(itemEditando.id, {
            nome: nomeLimpo,
            cor: corForm,
            descricao: descricaoForm.trim(),
            ativo: ativoForm,
          })
        }

        toast({
          title: `${singular} atualizada`,
          description: `Os dados da ${singular.toLowerCase()} "${nomeLimpo}" foram salvos com sucesso.`,
        })
      } else {
        // Criar novo
        const proximaOrdem = lista.length + 1
        if (isCategoria) {
          await whatsappTemplateTaxonomiaService.criarCategoria({
            nome: nomeLimpo,
            ordem: proximaOrdem,
            cor: corForm,
            descricao: descricaoForm.trim(),
            ativo: ativoForm,
          })
        } else {
          await whatsappTemplateTaxonomiaService.criarEtapa({
            nome: nomeLimpo,
            ordem: proximaOrdem,
            cor: corForm,
            descricao: descricaoForm.trim(),
            ativo: ativoForm,
          })
        }

        toast({
          title: `${singular} criada`,
          description: `A nova ${singular.toLowerCase()} "${nomeLimpo}" está disponível no sistema.`,
        })
      }

      setModalEdicaoOpen(false)
      setItemEditando(null)
      await onRecarregar()
    } catch (err: any) {
      console.error(`Erro ao salvar ${singular.toLowerCase()}:`, err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao persistir alterações.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Iniciar exclusão: checa quantos modelos usam antes de abrir diálogo
  const iniciarExclusao = async (item: WhatsAppTemplateCategoria | WhatsAppTemplateEtapa) => {
    setItemParaExcluir(item)
    setChecandoUso(true)
    setDestinoMigracao('')
    try {
      let total = 0
      if (isCategoria) {
        total = await whatsappTemplateTaxonomiaService.contarTemplatesPorCategoria(item.nome)
      } else {
        total = await whatsappTemplateTaxonomiaService.contarTemplatesPorEtapa(item.nome)
      }
      setTotalUso(total)
    } catch {
      setTotalUso(0)
    } finally {
      setChecandoUso(false)
    }
  }

  const handleConfirmarExclusao = async () => {
    if (!itemParaExcluir) return
    if (totalUso > 0 && !destinoMigracao) {
      toast({
        title: 'Destino obrigatório',
        description: `Selecione para qual ${singular.toLowerCase()} deseja mover os ${totalUso} modelo(s) em uso.`,
        variant: 'destructive',
      })
      return
    }

    setExcluindo(true)
    try {
      if (isCategoria) {
        const { templatesMigrados } = await whatsappTemplateTaxonomiaService.excluirCategoria(
          itemParaExcluir.id,
          itemParaExcluir.nome,
          destinoMigracao || undefined,
        )
        toast({
          title: 'Categoria excluída',
          description:
            templatesMigrados > 0
              ? `Categoria removida e ${templatesMigrados} modelo(s) movidos para "${destinoMigracao}".`
              : `A categoria "${itemParaExcluir.nome}" foi removida com sucesso.`,
        })
      } else {
        const { templatesMigrados } = await whatsappTemplateTaxonomiaService.excluirEtapa(
          itemParaExcluir.id,
          itemParaExcluir.nome,
          destinoMigracao || undefined,
        )
        toast({
          title: 'Etapa excluída',
          description:
            templatesMigrados > 0
              ? `Etapa removida e ${templatesMigrados} modelo(s) movidos para "${destinoMigracao}".`
              : `A etapa "${itemParaExcluir.nome}" foi removida com sucesso.`,
        })
      }

      setItemParaExcluir(null)
      await onRecarregar()
    } catch (err: any) {
      console.error(`Erro ao excluir ${singular.toLowerCase()}:`, err)
      toast({
        title: 'Não foi possível excluir',
        description: err?.message || 'Falha ao processar exclusão.',
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  // Reordenação
  const handleMover = async (index: number, direcao: 'up' | 'down') => {
    if (direcao === 'up' && index === 0) return
    if (direcao === 'down' && index === lista.length - 1) return

    const targetIndex = direcao === 'up' ? index - 1 : index + 1
    const novaLista = [...lista]
    const itemAtual = novaLista[index]
    novaLista[index] = novaLista[targetIndex]
    novaLista[targetIndex] = itemAtual

    const ordenacao = novaLista.map((it, idx) => ({ id: it.id, ordem: idx + 1 }))
    setLista(novaLista)

    try {
      if (isCategoria) {
        await whatsappTemplateTaxonomiaService.reordenarCategorias(ordenacao)
      } else {
        await whatsappTemplateTaxonomiaService.reordenarEtapas(ordenacao)
      }
      toast({
        title: 'Ordem atualizada',
        description: `A nova ordem das ${plural.toLowerCase()} foi salva.`,
      })
      await onRecarregar()
    } catch (err) {
      console.warn('Erro ao salvar reordenação:', err)
      await onRecarregar()
    }
  }

  const getBadgeCor = (cor?: string) => {
    switch (cor) {
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      case 'orange':
        return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800'
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
      case 'cyan':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800'
      default:
        return 'bg-muted text-foreground border-border'
    }
  }

  // Opções de destino para migração (exclui o item que está sendo removido)
  const opcoesDestino = lista.filter((it) => it.id !== itemParaExcluir?.id)

  return (
    <div className="space-y-4">
      {/* Topo da Aba */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-muted/30 rounded-lg border border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            {isCategoria ? <FolderTree className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
              Taxonomia de {plural}
              <Badge variant="outline" className="text-[11px] font-mono">
                {lista.length} {lista.length === 1 ? singular.toLowerCase() : plural.toLowerCase()}
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isCategoria
                ? 'Organize as áreas dos modelos de WhatsApp. Renomeações são propagadas em cascata para todos os templates.'
                : 'Defina as etapas do funil de atendimento dos modelos. Reordene para ajustar a visualização nos seletores.'}
            </p>
          </div>
        </div>

        <Button
          onClick={abrirCriar}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nova {singular}
        </Button>
      </div>

      {/* Lista de Itens com reordenação e ações */}
      {lista.length === 0 ? (
        <div className="p-8 text-center bg-card rounded-xl border border-dashed border-border text-xs text-muted-foreground">
          Nenhuma {singular.toLowerCase()} cadastrada no momento. Clique no botão acima para
          adicionar.
        </div>
      ) : (
        <div className="space-y-2">
          {lista.map((item, index) => {
            const isPrimeiro = index === 0
            const isUltimo = index === lista.length - 1

            return (
              <Card
                key={item.id}
                className="border border-border shadow-2xs hover:border-emerald-500/30 transition-colors bg-card"
              >
                <CardContent className="p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Controles de Subir / Descer */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={isPrimeiro}
                        onClick={() => handleMover(index, 'up')}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer rounded hover:bg-muted"
                        title="Subir posição"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isUltimo}
                        onClick={() => handleMover(index, 'down')}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer rounded hover:bg-muted"
                        title="Descer posição"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Pílula de ordem */}
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-mono font-bold text-muted-foreground shrink-0">
                      {index + 1}
                    </span>

                    {/* Informações da categoria / etapa */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground tracking-tight">
                          {item.nome}
                        </span>
                        {item.cor && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-medium border ${getBadgeCor(item.cor)}`}
                          >
                            {item.cor}
                          </Badge>
                        )}
                        {item.ativo === false ? (
                          <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                            Inativa
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                          >
                            Ativa
                          </Badge>
                        )}
                      </div>
                      {item.descricao && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.descricao}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirEditar(item)}
                      className="h-8 px-2.5 text-xs gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => iniciarExclusao(item)}
                      className="h-8 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar */}
      <Dialog open={modalEdicaoOpen} onOpenChange={setModalEdicaoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {itemEditando ? (
                <>
                  <Edit2 className="w-5 h-5 text-amber-500" />
                  Editar {singular}: {itemEditando.nome}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Nova {singular} de Templates
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {itemEditando
                ? `Ao alterar o nome, todos os templates vinculados a esta ${singular.toLowerCase()} serão atualizados em cascata.`
                : `Preencha o nome da nova ${singular.toLowerCase()} para disponibilizá-la nos seletores de mensagens.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="tax-nome" className="text-xs font-semibold">
                Nome da {singular} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tax-nome"
                value={nomeForm}
                onChange={(e) => setNomeForm(e.target.value)}
                placeholder={isCategoria ? 'Ex: Pós-Vendas' : 'Ex: Follow-up Fase 1'}
                className="text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-cor" className="text-xs font-semibold">
                Cor Visual (Opcional)
              </Label>
              <Select value={corForm} onValueChange={setCorForm}>
                <SelectTrigger id="tax-cor" className="text-xs">
                  <SelectValue placeholder="Selecione uma cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem_cor">Sem cor específica</SelectItem>
                  {CORES_PALETA.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-descricao" className="text-xs font-semibold">
                Descrição (Opcional)
              </Label>
              <Textarea
                id="tax-descricao"
                value={descricaoForm}
                onChange={(e) => setDescricaoForm(e.target.value)}
                rows={2}
                placeholder={`Explique o objetivo ou contexto desta ${singular.toLowerCase()}...`}
                className="text-xs"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/30">
              <div>
                <Label htmlFor="tax-ativo" className="text-xs font-medium cursor-pointer block">
                  {singular} Ativa
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Se desativada, não aparecerá nos novos cadastros mas mantém os modelos existentes.
                </span>
              </div>
              <Switch id="tax-ativo" checked={ativoForm} onCheckedChange={setAtivoForm} />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalEdicaoOpen(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {salvando
                  ? 'Salvando...'
                  : itemEditando
                    ? 'Salvar Alterações'
                    : `Criar ${singular}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão com Migração de Modelos em Uso */}
      <AlertDialog
        open={Boolean(itemParaExcluir)}
        onOpenChange={(op) => !op && setItemParaExcluir(null)}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Excluir {singular}: {itemParaExcluir?.nome}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs space-y-2">
              {checandoUso ? (
                <span>Verificando modelos vinculados a esta {singular.toLowerCase()}...</span>
              ) : totalUso > 0 ? (
                <div className="space-y-3 pt-1">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200">
                    <strong className="block font-semibold">
                      Existem {totalUso} modelo(s) usando esta {singular.toLowerCase()}!
                    </strong>
                    <span>
                      Para não deixar os modelos órfãos, você deve escolher uma{' '}
                      {singular.toLowerCase()} de destino para onde eles serão movidos antes da
                      exclusão.
                    </span>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-xs font-semibold text-foreground">
                      Mover modelos em uso para: <span className="text-destructive">*</span>
                    </Label>
                    <Select value={destinoMigracao} onValueChange={setDestinoMigracao}>
                      <SelectTrigger className="text-xs">
                        <SelectValue
                          placeholder={`Selecione a ${singular.toLowerCase()} de destino`}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {opcoesDestino.map((dest) => (
                          <SelectItem key={dest.id} value={dest.nome} className="text-xs">
                            {dest.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <span>
                  Nenhum modelo de WhatsApp utiliza atualmente esta {singular.toLowerCase()}. Tem
                  certeza de que deseja removê-la permanentemente?
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={excluindo || (totalUso > 0 && !destinoMigracao)}
              className="bg-destructive hover:bg-destructive/90 text-white font-medium"
            >
              {excluindo ? 'Processando...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default TabTaxonomiaWhatsApp

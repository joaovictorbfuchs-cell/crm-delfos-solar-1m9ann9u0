import React, { useState, useMemo } from 'react'
import {
  MessageSquare,
  Plus,
  Search,
  Copy,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Send,
  Eye,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { useClientes } from '@/contexts/ClientesContext'
import { WhatsAppTemplate } from '@/types/crm'
import {
  VARIAVEIS_WHATSAPP_SISTEMA,
  USOS_FLUXOS_WHATSAPP,
  CategoriaTemplate,
  getFluxoDoTemplate,
  extrairVariaveisTemplate,
  renderizarPreviewTemplate,
} from '@/lib/whatsappTemplatesMetadata'

interface ModalGerenciarWhatsAppTemplatesProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  isOpen?: boolean
  onClose?: () => void
}

const CATEGORIAS_FILTRO: Array<{ label: string; value: string }> = [
  { label: 'Todas as categorias', value: 'todas' },
  { label: 'Operacional', value: 'Operacional' },
  { label: 'Comercial', value: 'Comercial' },
  { label: 'Atendimento', value: 'Atendimento' },
  { label: 'Pós-Vendas', value: 'Pós-Vendas' },
  { label: 'Geral', value: 'Geral' },
]

export const ModalGerenciarWhatsAppTemplates: React.FC<ModalGerenciarWhatsAppTemplatesProps> = ({
  open: openProp,
  onOpenChange: onOpenChangeProp,
  isOpen,
  onClose,
}) => {
  // Compatibilidade com open/onOpenChange e isOpen/onClose
  const open = openProp ?? isOpen ?? false
  const handleOpenChange = (proximoEstado: boolean) => {
    if (onOpenChangeProp) {
      onOpenChangeProp(proximoEstado)
    }
    if (!proximoEstado && onClose) {
      onClose()
    }
  }

  const { toast } = useToast()
  const {
    whatsAppTemplates,
    isLoading: carregandoWhatsAppTemplates,
    addWhatsAppTemplate,
    updateWhatsAppTemplate,
    removeWhatsAppTemplate,
    refreshData,
  } = useClientes()

  // Estados de listagem e filtros
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [apenasAtivos, setApenasAtivos] = useState(false)

  // Estados de edição / criação
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false)
  const [templateEditando, setTemplateEditando] = useState<WhatsAppTemplate | null>(null)
  const [tituloForm, setTituloForm] = useState('')
  const [categoriaForm, setCategoriaForm] = useState<CategoriaTemplate>('Operacional')
  const [slugForm, setSlugForm] = useState('')
  const [conteudoForm, setConteudoForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Estados de exclusão e alerta de fluxo do sistema
  const [templateParaExcluir, setTemplateParaExcluir] = useState<WhatsAppTemplate | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Estado de pré-visualização (Preview)
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null)

  // Feedback de cópia
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  // Normalização de categoria para exibição e filtro
  const resolverCategoria = (t: WhatsAppTemplate): CategoriaTemplate => {
    if (t.categoria && t.categoria.trim()) {
      const c = t.categoria.trim()
      if (
        c === 'Operacional' ||
        c === 'Comercial' ||
        c === 'Atendimento' ||
        c === 'Pós-Vendas' ||
        c === 'Geral'
      ) {
        return c as CategoriaTemplate
      }
    }
    const fluxo = getFluxoDoTemplate(t.slug)
    if (fluxo) return fluxo.categoriaSugerida
    if (t.tipo_gatilho === 'operacional') return 'Operacional'
    if (t.tipo_gatilho === 'proposta_aprovada') return 'Comercial'
    if (t.tipo_gatilho === 'lembrete_visita') return 'Atendimento'
    if (t.tipo_gatilho === 'followup_posvenda') return 'Pós-Vendas'
    return 'Geral'
  }

  // Filtragem da lista
  const templatesFiltrados = useMemo(() => {
    return whatsAppTemplates.filter((t) => {
      const cat = resolverCategoria(t)
      if (categoriaFiltro !== 'todas' && cat !== categoriaFiltro) {
        return false
      }
      if (apenasAtivos && t.ativo === false) {
        return false
      }
      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const matchTitulo = t.titulo?.toLowerCase().includes(termo)
        const matchSlug = t.slug?.toLowerCase().includes(termo)
        const matchConteudo = t.conteudo?.toLowerCase().includes(termo)
        const matchCat = cat.toLowerCase().includes(termo)
        const fluxo = getFluxoDoTemplate(t.slug)
        const matchFluxo = fluxo?.tituloUso.toLowerCase().includes(termo)
        return Boolean(matchTitulo || matchSlug || matchConteudo || matchCat || matchFluxo)
      }
      return true
    })
  }, [whatsAppTemplates, categoriaFiltro, apenasAtivos, busca])

  // Abertura do formulário de criação
  const handleNovoTemplate = () => {
    setTemplateEditando(null)
    setTituloForm('')
    setCategoriaForm('Operacional')
    setSlugForm('')
    setConteudoForm('')
    setAtivoForm(true)
    setModalEdicaoOpen(true)
  }

  // Abertura do formulário de edição
  const handleEditarTemplate = (t: WhatsAppTemplate) => {
    setTemplateEditando(t)
    setTituloForm(t.titulo || '')
    setCategoriaForm(resolverCategoria(t))
    setSlugForm(t.slug || '')
    setConteudoForm(t.conteudo || '')
    setAtivoForm(t.ativo !== false)
    setModalEdicaoOpen(true)
  }

  // Inserção de variável no textarea de edição
  const inserirVariavelNoConteudo = (variavel: string) => {
    const placeholder = `{${variavel}}`
    setConteudoForm((prev) => {
      if (!prev) return placeholder
      return prev + ' ' + placeholder
    })
  }

  // Cópia de texto
  const handleCopiarTexto = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto)
    setCopiadoId(id)
    setTimeout(() => setCopiadoId(null), 2000)
    toast({
      title: 'Conteúdo copiado',
      description: 'O texto do template foi copiado para a área de transferência.',
    })
  }

  // Salvar criação ou edição
  const handleSalvarTemplate = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!tituloForm.trim()) {
      toast({
        title: 'Título obrigatório',
        description: 'Informe o nome/título do template de mensagem.',
        variant: 'destructive',
      })
      return
    }

    if (!conteudoForm.trim()) {
      toast({
        title: 'Conteúdo obrigatório',
        description: 'Digite a mensagem do template com as variáveis desejadas.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const variaveisDetectadas = extrairVariaveisTemplate(undefined, conteudoForm)

      if (templateEditando) {
        // Atualização de existente
        await updateWhatsAppTemplate(templateEditando.id, {
          titulo: tituloForm.trim(),
          categoria: categoriaForm,
          conteudo: conteudoForm.trim(),
          ativo: ativoForm,
          variaveis_disponiveis: variaveisDetectadas,
        })
        toast({
          title: 'Template atualizado!',
          description: `O template "${tituloForm.trim()}" foi salvo com sucesso.`,
        })
      } else {
        // Novo template
        let slugFinal = slugForm.trim()
        if (!slugFinal) {
          slugFinal = tituloForm
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
        }
        await addWhatsAppTemplate({
          titulo: tituloForm.trim(),
          slug: slugFinal,
          categoria: categoriaForm,
          conteudo: conteudoForm.trim(),
          ativo: ativoForm,
          tipo_gatilho: categoriaForm.toLowerCase(),
          variaveis_disponiveis: variaveisDetectadas,
        })
        toast({
          title: 'Template criado com sucesso!',
          description: `O novo template "${tituloForm.trim()}" já está disponível para uso.`,
        })
      }

      setModalEdicaoOpen(false)
      setTemplateEditando(null)
    } catch (err: any) {
      console.error('Erro ao salvar template de WhatsApp:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Não foi possível salvar o template. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Confirmar e executar exclusão
  const handleConfirmarExclusao = async () => {
    if (!templateParaExcluir) return
    setExcluindo(true)
    try {
      await removeWhatsAppTemplate(templateParaExcluir.id)
      toast({
        title: 'Template excluído',
        description: `O template "${templateParaExcluir.titulo}" foi removido com sucesso.`,
      })
      setTemplateParaExcluir(null)
    } catch (err: any) {
      console.error('Erro ao excluir template:', err)
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao remover template do banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setExcluindo(false)
    }
  }

  // Obter cor de badge da categoria
  const getBadgeCategoria = (categoria: string) => {
    switch (categoria) {
      case 'Operacional':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
      case 'Comercial':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      case 'Atendimento':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
      case 'Pós-Vendas':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
      default:
        return 'bg-muted text-foreground border-border'
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Cabeçalho */}
          <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  Gerenciamento de Templates de WhatsApp
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Configure os modelos de mensagens operacionais, comerciais e de atendimento com
                  variáveis dinâmicas automáticas.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshData()}
                  disabled={carregandoWhatsAppTemplates}
                  title="Atualizar lista"
                >
                  {carregandoWhatsAppTemplates ? 'Atualizando...' : 'Recarregar'}
                </Button>
                <Button
                  onClick={handleNovoTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium"
                  size="sm"
                >
                  <Plus className="w-4 h-4" />
                  Novo Template
                </Button>
              </div>
            </div>

            {/* Barra de Filtros e Busca */}
            <div className="mt-4 pt-3 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, conteúdo, variável ou uso..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                  <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                    <SelectTrigger className="h-9 w-[180px] text-xs">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS_FILTRO.map((c) => (
                        <SelectItem key={c.value} value={c.value} className="text-xs">
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pl-2 border-l border-border">
                  <Switch
                    id="filtro-ativos"
                    checked={apenasAtivos}
                    onCheckedChange={setApenasAtivos}
                  />
                  <Label
                    htmlFor="filtro-ativos"
                    className="text-xs cursor-pointer text-muted-foreground whitespace-nowrap"
                  >
                    Apenas ativos
                  </Label>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Conteúdo Principal / Listagem */}
          <ScrollArea className="flex-1 p-6 overflow-y-auto bg-muted/20">
            {carregandoWhatsAppTemplates ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Carregando templates cadastrados no CRM...</p>
              </div>
            ) : templatesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border rounded-xl bg-card p-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-base text-foreground mb-1">
                  Nenhum template encontrado
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mb-4">
                  {busca || categoriaFiltro !== 'todas' || apenasAtivos
                    ? 'Nenhum modelo corresponde aos filtros aplicados. Tente limpar os filtros ou ajustar o termo de busca.'
                    : 'Ainda não existem templates cadastrados. Comece criando um novo modelo para agilizar seus contatos.'}
                </p>
                {(busca || categoriaFiltro !== 'todas' || apenasAtivos) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBusca('')
                      setCategoriaFiltro('todas')
                      setApenasAtivos(false)
                    }}
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {templatesFiltrados.map((template) => {
                  const categoria = resolverCategoria(template)
                  const fluxo = getFluxoDoTemplate(template.slug)
                  const variaveis = extrairVariaveisTemplate(
                    template.variaveis_disponiveis,
                    template.conteudo,
                  )

                  return (
                    <Card
                      key={template.id}
                      className="border border-border shadow-sm hover:border-emerald-500/40 transition-colors bg-card"
                    >
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          {/* Coluna de Informações do Template */}
                          <div className="flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-base text-foreground tracking-tight">
                                {template.titulo}
                              </span>

                              <Badge
                                variant="outline"
                                className={`text-[11px] font-medium border ${getBadgeCategoria(
                                  categoria,
                                )}`}
                              >
                                {categoria}
                              </Badge>

                              {template.ativo === false ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-muted text-muted-foreground"
                                >
                                  Inativo
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Ativo
                                </Badge>
                              )}

                              {template.slug && (
                                <span className="text-[11px] font-mono text-muted-foreground/80 bg-muted/60 px-1.5 py-0.5 rounded">
                                  {template.slug}
                                </span>
                              )}
                            </div>

                            {/* Onde é usado no sistema */}
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-md border border-border/60">
                              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                {fluxo ? (
                                  <>
                                    <span className="font-semibold text-foreground">
                                      Usado em: {fluxo.tituloUso}
                                    </span>
                                    <span className="text-muted-foreground block text-[11px] mt-0.5">
                                      {fluxo.descricaoUso} ({fluxo.origemEnvio})
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-medium text-foreground">
                                      Template Geral / Personalizado
                                    </span>
                                    <span className="text-muted-foreground block text-[11px] mt-0.5">
                                      Disponível na central de conversas e mensagens manuais.
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Conteúdo preview/resumo */}
                            <div className="relative">
                              <div className="text-xs text-foreground bg-muted/20 border border-border rounded-lg p-3 whitespace-pre-wrap font-sans max-h-36 overflow-y-auto leading-relaxed select-text">
                                {template.conteudo}
                              </div>
                            </div>

                            {/* Variáveis Dinâmicas Identificadas */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Variáveis disponíveis neste template:
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {variaveis.length > 0 ? (
                                  variaveis.map((v) => {
                                    const info = VARIAVEIS_WHATSAPP_SISTEMA[v]
                                    return (
                                      <TooltipProvider key={v} delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge
                                              variant="outline"
                                              className="cursor-help text-xs font-mono py-0.5 px-2 bg-background hover:bg-muted text-foreground border-border/80 transition-colors flex items-center gap-1"
                                            >
                                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                {'{'}
                                              </span>
                                              <span>{v}</span>
                                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                {'}'}
                                              </span>
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-xs text-xs">
                                            <p className="font-bold text-foreground">
                                              {info?.label || `{${v}}`}
                                            </p>
                                            <p className="text-muted-foreground mt-0.5">
                                              {info?.descricao ||
                                                'Variável dinâmica substituída automaticamente no momento do envio.'}
                                            </p>
                                            {info?.exemplo && (
                                              <p className="mt-1 pt-1 border-t border-border/40 text-[11px] text-emerald-600 dark:text-emerald-400">
                                                Exemplo:{' '}
                                                <span className="font-semibold">
                                                  {info.exemplo}
                                                </span>
                                              </p>
                                            )}
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    )
                                  })
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">
                                    Nenhuma variável identificada. Você pode adicionar variáveis
                                    como{' '}
                                    <code className="text-[11px] bg-muted px-1 rounded font-mono">
                                      {'{nome_cliente}'}
                                    </code>
                                    .
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Coluna de Ações Rápidas */}
                          <div className="flex lg:flex-col items-center justify-end gap-2 border-t lg:border-t-0 lg:border-l border-border pt-3 lg:pt-0 lg:pl-4 min-w-[140px]">
                            {/* Botão de Testar / Preview */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs h-8 text-foreground gap-1.5"
                              onClick={() => setPreviewTemplate(template)}
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                              Visualizar
                            </Button>

                            {/* Botão de Copiar Texto */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-8 gap-1.5"
                              onClick={() => handleCopiarTexto(template.conteudo, template.id)}
                            >
                              {copiadoId === template.id ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600 font-medium">Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>Copiar Texto</span>
                                </>
                              )}
                            </Button>

                            {/* Botão de Editar */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full justify-start text-xs h-8 text-foreground gap-1.5 hover:bg-muted"
                              onClick={() => handleEditarTemplate(template)}
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-500" />
                              Editar
                            </Button>

                            {/* Botão de Excluir */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                              onClick={() => setTemplateParaExcluir(template)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {/* Rodapé informativo */}
          <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Total:{' '}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {templatesFiltrados.length}
                </span>{' '}
                de {whatsAppTemplates.length} templates
              </span>
              <span>•</span>
              <span>Operacionais: Lembrete Auto Leitura RGE e Notificação de OS presentes</span>
            </div>

            <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={modalEdicaoOpen} onOpenChange={setModalEdicaoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              {templateEditando ? (
                <>
                  <Edit2 className="w-5 h-5 text-amber-500" />
                  Editar Template: {templateEditando.titulo}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-emerald-600" />
                  Criar Novo Template de WhatsApp
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Preencha os dados e monte o corpo da mensagem. Clique nas variáveis disponíveis para
              inseri-las diretamente no texto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarTemplate} className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* Aviso se for template interno de fluxo */}
              {templateEditando && getFluxoDoTemplate(templateEditando.slug) && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200 mb-4">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Template vinculado a fluxo do sistema: </span>
                    {getFluxoDoTemplate(templateEditando.slug)?.tituloUso}.
                    <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                      Você pode ajustar a redação livremente, mas certifique-se de manter as
                      variáveis essenciais necessárias para o disparo correto da mensagem.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="template-titulo" className="text-xs font-semibold">
                    Nome / Título do Template <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="template-titulo"
                    placeholder="Ex: Lembrete Auto Leitura RGE"
                    value={tituloForm}
                    onChange={(e) => setTituloForm(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="template-categoria" className="text-xs font-semibold">
                    Categoria
                  </Label>
                  <Select
                    value={categoriaForm}
                    onValueChange={(val) => setCategoriaForm(val as CategoriaTemplate)}
                  >
                    <SelectTrigger id="template-categoria" className="text-sm">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="Comercial">Comercial</SelectItem>
                      <SelectItem value="Atendimento">Atendimento</SelectItem>
                      <SelectItem value="Pós-Vendas">Pós-Vendas</SelectItem>
                      <SelectItem value="Geral">Geral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1.5">
                  <Label htmlFor="template-slug" className="text-xs font-semibold">
                    Identificador (Slug)
                  </Label>
                  <Input
                    id="template-slug"
                    placeholder="ex: lembrete_auto_leitura_rge"
                    value={slugForm}
                    onChange={(e) => setSlugForm(e.target.value)}
                    disabled={Boolean(templateEditando)}
                    className="text-xs font-mono"
                  />
                  {templateEditando && (
                    <span className="text-[10px] text-muted-foreground">
                      O identificador de templates existentes é mantido para preservar as
                      integrações.
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 pt-4 sm:pt-0">
                  <Switch id="template-ativo" checked={ativoForm} onCheckedChange={setAtivoForm} />
                  <Label htmlFor="template-ativo" className="text-xs font-medium cursor-pointer">
                    Template Ativo para Envio
                  </Label>
                </div>
              </div>

              {/* Botões rápidos para inserir variáveis */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Variáveis Disponíveis (clique para inserir no texto):
                  </Label>
                </div>

                <div className="p-3 bg-muted/40 border border-border rounded-lg space-y-2">
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {Object.values(VARIAVEIS_WHATSAPP_SISTEMA).map((item) => (
                      <Button
                        key={item.nome}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs font-mono py-0 px-2 bg-card hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/50 border border-border transition-colors flex items-center gap-1"
                        onClick={() => inserirVariavelNoConteudo(item.nome)}
                        title={`${item.label}: ${item.descricao}`}
                      >
                        <Plus className="w-3 h-3 text-emerald-600" />
                        {`{${item.nome}}`}
                      </Button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Ao enviar a mensagem, o sistema substitui automaticamente cada tag pelo valor
                    correspondente do cliente ou da ordem.
                  </p>
                </div>
              </div>

              {/* Textarea do Conteúdo */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="template-conteudo" className="text-xs font-semibold">
                    Conteúdo da Mensagem <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {conteudoForm.length} caracteres
                  </span>
                </div>
                <Textarea
                  id="template-conteudo"
                  rows={7}
                  placeholder="Olá {{nome_cliente}}! Passando para informar..."
                  value={conteudoForm}
                  onChange={(e) => setConteudoForm(e.target.value)}
                  required
                  className="font-sans text-sm leading-relaxed"
                />
              </div>

              {/* Pré-visualização rápida no próprio formulário */}
              {conteudoForm.trim() && (
                <div className="space-y-1.5 pt-2">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    Como o cliente verá no WhatsApp (exemplo):
                  </Label>
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground">
                    {renderizarPreviewTemplate(conteudoForm)}
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="p-4 border-t border-border bg-card flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEdicaoOpen(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {salvando
                  ? 'Salvando...'
                  : templateEditando
                    ? 'Salvar Alterações'
                    : 'Criar Template'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PREVIEW / VISUALIZAÇÃO COM DADOS DE EXEMPLO */}
      <Dialog
        open={Boolean(previewTemplate)}
        onOpenChange={(op) => !op && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Pré-visualização do Template
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {previewTemplate?.titulo} (
                  {previewTemplate ? resolverCategoria(previewTemplate) : ''})
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4 bg-muted/10">
            {/* Balão estilo WhatsApp */}
            <div className="bg-[#E7F6E7] dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl rounded-tl-sm p-4 shadow-sm">
              <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center gap-1">
                <span>Delfos Solar</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  • Hoje às 14:30
                </span>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed select-text">
                {previewTemplate ? renderizarPreviewTemplate(previewTemplate.conteudo) : ''}
              </div>
            </div>

            {/* Variáveis preenchidas neste teste */}
            <div className="p-3 bg-card border border-border rounded-lg space-y-2">
              <span className="text-xs font-semibold text-foreground block">
                Valores de exemplo utilizados no teste:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Cliente ({'{nome_cliente}'}): </span>
                  <span className="font-medium text-foreground">Carlos Alberto Mendes</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Usina ({'{usina}'}): </span>
                  <span className="font-medium text-foreground">Usina Solar Fazenda Progresso</span>
                </div>
                <div>
                  <span className="text-muted-foreground">UC ({'{numero_uc}'}): </span>
                  <span className="font-medium text-foreground">7001458923</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Endereço ({'{endereco}'}): </span>
                  <span className="font-medium text-foreground">
                    Rua das Camélias, 350 - Erechim/RS
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Serviço ({'{tipo_servico}'}): </span>
                  <span className="font-medium text-foreground">
                    Manutenção Preventiva Semestral
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Data Agendada ({'{data_agendada}'}):{' '}
                  </span>
                  <span className="font-medium text-foreground">28/09/2026</span>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Instalador ({'{nome_instalador}'}):{' '}
                  </span>
                  <span className="font-medium text-foreground">Carlos Mendes</span>
                </div>
                <div>
                  <span className="text-muted-foreground">ID OS ({'{id_os}'}): </span>
                  <span className="font-medium text-foreground">OS-2026-089</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Proposta ({'{valor_proposta}'}): </span>
                  <span className="font-medium text-foreground">R$ 38.500,00</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data/Hora ({'{data}'}): </span>
                  <span className="font-medium text-foreground">26/09/2026 às 14:00</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Leitura ({'{data_leitura}'}): </span>
                  <span className="font-medium text-foreground">29/09/2026</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Protocolo ({'{protocolo_rge}'}): </span>
                  <span className="font-medium text-foreground">2026-RGE-9812457</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-card flex items-center justify-between">
            {previewTemplate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const texto = renderizarPreviewTemplate(previewTemplate.conteudo)
                  navigator.clipboard.writeText(texto)
                  toast({
                    title: 'Mensagem copiada',
                    description: 'O texto com variáveis preenchidas foi copiado.',
                  })
                }}
                className="text-xs gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar Mensagem Renderizada
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setPreviewTemplate(null)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Fechar Visualização
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(templateParaExcluir)}
        onOpenChange={(op) => !op && setTemplateParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Excluir template de mensagem?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                Tem certeza de que deseja excluir o template{' '}
                <strong className="text-foreground">"{templateParaExcluir?.titulo}"</strong>?
              </p>

              {templateParaExcluir && getFluxoDoTemplate(templateParaExcluir.slug) && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 mt-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold block">Atenção: Template do Sistema!</strong>
                      Este template é referenciado diretamente pelo fluxo interno de{' '}
                      <strong>{getFluxoDoTemplate(templateParaExcluir.slug)?.tituloUso}</strong>.
                      Excluí-lo fará com que o envio deste fluxo passe a utilizar a mensagem padrão
                      de fallback até que outro template seja configurado.
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
              className="bg-destructive hover:bg-destructive/90 text-white font-medium"
            >
              {excluindo ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
export default ModalGerenciarWhatsAppTemplates

import React, { useState, useMemo, useEffect } from 'react'
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
  Layers,
  Power,
  RotateCcw,
  BookOpen,
  Check,
} from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { useToast } from '@/hooks/use-toast'
import { useClientes } from '@/contexts/ClientesContext'
import { WhatsAppTemplate } from '@/types/crm'
import {
  VARIAVEIS_WHATSAPP_SISTEMA,
  USOS_FLUXOS_WHATSAPP,
  CategoriaTemplate,
  EtapaTemplate,
  CATEGORIAS_WHATSAPP_CANONICAS,
  ETAPAS_WHATSAPP_CANONICAS,
  getFluxoDoTemplate,
  extrairVariaveisTemplate,
  renderizarPreviewTemplate,
} from '@/lib/whatsappTemplatesMetadata'
import { useWhatsAppTemplateTaxonomia } from '@/hooks/useWhatsAppTemplateTaxonomia'

interface GerenciarMensagensWhatsAppProps {
  embeddedInModal?: boolean
  onClose?: () => void
}

export const CATEGORIAS_LISTA: Array<{ label: string; value: string }> = [
  { label: 'Todas as categorias', value: 'todas' },
  { label: 'Comercial', value: 'Comercial' },
  { label: 'Atendimento', value: 'Atendimento' },
  { label: 'O&M & Pós-Venda', value: 'O&M & Pós-Venda' },
  { label: 'Financeiro/Cobrança', value: 'Financeiro/Cobrança' },
  { label: 'Operacional/RGE', value: 'Operacional/RGE' },
]

export const ETAPAS_LISTA: Array<{ label: string; value: string }> = [
  { label: 'Todas as etapas', value: 'todas' },
  { label: '1º contato', value: '1º contato' },
  { label: 'Orçamento enviado', value: 'Orçamento enviado' },
  { label: 'Follow-up Fase 1', value: 'Follow-up Fase 1' },
  { label: 'Follow-up Fase 2', value: 'Follow-up Fase 2' },
  { label: 'Follow-up Fase 3', value: 'Follow-up Fase 3' },
  { label: 'Break-up', value: 'Break-up' },
  { label: 'Visita técnica', value: 'Visita técnica' },
  { label: 'Assinatura/documentos', value: 'Assinatura/documentos' },
  { label: 'Pós-instalação', value: 'Pós-instalação' },
  { label: 'Renovação O&M', value: 'Renovação O&M' },
  { label: 'Cobrança', value: 'Cobrança' },
]

export const GerenciarMensagensWhatsApp: React.FC<GerenciarMensagensWhatsAppProps> = ({
  embeddedInModal = false,
  onClose,
}) => {
  const { toast } = useToast()
  const {
    whatsAppTemplates,
    isLoading: carregandoWhatsAppTemplates,
    addWhatsAppTemplate,
    updateWhatsAppTemplate,
    removeWhatsAppTemplate,
    refreshData,
  } = useClientes()

  // Taxonomia dinâmica do banco com fallback resiliente
  const { nomesCategorias, nomesEtapas } = useWhatsAppTemplateTaxonomia()

  // Filtros e busca
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas')
  const [etapaFiltro, setEtapaFiltro] = useState('todas')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativos' | 'inativos'>('todos')
  const [origemFiltro, setOrigemFiltro] = useState<'todas' | 'base_conhecimento' | 'sistema'>(
    'todas',
  )

  // Estados de edição / criação
  const [modalEdicaoOpen, setModalEdicaoOpen] = useState(false)
  const [templateEditando, setTemplateEditando] = useState<WhatsAppTemplate | null>(null)
  const [tituloForm, setTituloForm] = useState('')
  const [categoriaForm, setCategoriaForm] = useState<CategoriaTemplate>('Comercial')
  const [etapaForm, setEtapaForm] = useState<EtapaTemplate>('1º contato')
  const [slugForm, setSlugForm] = useState('')
  const [conteudoForm, setConteudoForm] = useState('')
  const [ativoForm, setAtivoForm] = useState(true)
  const [salvando, setSalvando] = useState(false)

  // Estados de exclusão / desativação
  const [templateParaExcluir, setTemplateParaExcluir] = useState<WhatsAppTemplate | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Estado de pré-visualização (Preview)
  const [previewTemplate, setPreviewTemplate] = useState<WhatsAppTemplate | null>(null)
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

  // Normalização de categoria para exibição e filtro
  const resolverCategoria = (t: WhatsAppTemplate): string => {
    if (t.categoria && t.categoria.trim()) {
      const c = t.categoria.trim()
      // Compatibilidade legada apenas para sinônimos antigos
      if (c === 'Operacional') return 'Operacional/RGE'
      if (c === 'Pós-Vendas' || c === 'Operação e Manutenção (O&M)') return 'O&M & Pós-Venda'
      if (c === 'Financeiro') return 'Financeiro/Cobrança'
      // Retorna a categoria real (canônica ou customizada da taxonomia)
      return c
    }
    const fluxo = getFluxoDoTemplate(t.slug)
    if (fluxo) return fluxo.categoriaSugerida
    if (t.tipo_gatilho === 'operacional') return 'Operacional/RGE'
    if (t.tipo_gatilho === 'proposta_aprovada') return 'Comercial'
    if (t.tipo_gatilho === 'lembrete_visita') return 'Operacional/RGE'
    if (t.tipo_gatilho === 'followup_posvenda') return 'O&M & Pós-Venda'
    return 'Comercial'
  }

  // Normalização da etapa para exibição e filtro
  const resolverEtapa = (t: WhatsAppTemplate): string => {
    if (t.etapa && t.etapa.trim()) {
      return t.etapa.trim()
    }
    // Heurísticas de fallback pelo slug
    const slug = (t.slug || '').toLowerCase()
    if (slug.includes('visita')) return 'Visita técnica'
    if (slug.includes('leitura') || slug.includes('pos_venda') || slug.includes('30_dias')) {
      return 'Pós-instalação'
    }
    if (slug.includes('manutencao') || slug.includes('limpeza') || slug.includes('plano_anual')) {
      return 'Renovação O&M'
    }
    if (slug.includes('cobranca') || slug.includes('fatura')) return 'Cobrança'
    if (slug.includes('proposta') || slug.includes('confirmacao')) return 'Assinatura/documentos'
    if (slug.includes('fase_1')) return 'Follow-up Fase 1'
    if (slug.includes('fase_2')) return 'Follow-up Fase 2'
    if (slug.includes('fase_3')) return 'Follow-up Fase 3'
    if (slug.includes('breakup')) return 'Break-up'
    return '1º contato'
  }

  // Filtragem da lista
  const templatesFiltrados = useMemo(() => {
    return whatsAppTemplates.filter((t) => {
      const cat = resolverCategoria(t)
      const etapa = resolverEtapa(t)

      if (categoriaFiltro !== 'todas' && cat !== categoriaFiltro) {
        return false
      }
      if (etapaFiltro !== 'todas' && etapa !== etapaFiltro) {
        return false
      }
      if (statusFiltro === 'ativos' && t.ativo === false) {
        return false
      }
      if (statusFiltro === 'inativos' && t.ativo !== false) {
        return false
      }
      if (origemFiltro === 'base_conhecimento' && !t.origem_base_conhecimento) {
        return false
      }
      if (origemFiltro === 'sistema' && t.origem_base_conhecimento) {
        return false
      }

      if (busca.trim()) {
        const termo = busca.toLowerCase().trim()
        const matchTitulo = t.titulo?.toLowerCase().includes(termo)
        const matchSlug = t.slug?.toLowerCase().includes(termo)
        const matchConteudo = t.conteudo?.toLowerCase().includes(termo)
        const matchCat = cat.toLowerCase().includes(termo)
        const matchEtapa = etapa.toLowerCase().includes(termo)
        const fluxo = getFluxoDoTemplate(t.slug)
        const matchFluxo = fluxo?.tituloUso.toLowerCase().includes(termo)
        return Boolean(
          matchTitulo || matchSlug || matchConteudo || matchCat || matchEtapa || matchFluxo,
        )
      }
      return true
    })
  }, [whatsAppTemplates, categoriaFiltro, etapaFiltro, statusFiltro, origemFiltro, busca])

  // Abertura do formulário de criação
  const handleNovoTemplate = () => {
    setTemplateEditando(null)
    setTituloForm('')
    setCategoriaForm('Comercial')
    setEtapaForm('1º contato')
    setSlugForm('')
    setConteudoForm('')
    setAtivoForm(true)
    setModalEdicaoOpen(true)
  }

  // Abertura do formulário de edição
  const handleEditarTemplate = (t: WhatsAppTemplate) => {
    setTemplateEditando(t)
    setTituloForm(t.titulo || '')
    setCategoriaForm((resolverCategoria(t) as CategoriaTemplate) || 'Comercial')
    setEtapaForm((resolverEtapa(t) as EtapaTemplate) || '1º contato')
    setSlugForm(t.slug || '')
    setConteudoForm(t.conteudo || '')
    setAtivoForm(t.ativo !== false)
    setModalEdicaoOpen(true)
  }

  // Abertura de duplicação de template
  const handleDuplicarTemplate = (t: WhatsAppTemplate) => {
    setTemplateEditando(null)
    setTituloForm(`${t.titulo} (Cópia)`)
    setCategoriaForm((resolverCategoria(t) as CategoriaTemplate) || 'Comercial')
    setEtapaForm((resolverEtapa(t) as EtapaTemplate) || '1º contato')
    setSlugForm(`${t.slug || 'template'}_copia_${Date.now().toString().slice(-4)}`)
    setConteudoForm(t.conteudo || '')
    setAtivoForm(true)
    setModalEdicaoOpen(true)
  }

  // Alternar ativação/desativação rápida (desativar não é excluir)
  const handleToggleAtivo = async (t: WhatsAppTemplate) => {
    const novoStatus = t.ativo === false
    try {
      await updateWhatsAppTemplate(t.id, {
        ativo: novoStatus,
      })
      toast({
        title: novoStatus ? 'Template reativado!' : 'Template desativado',
        description: `O modelo "${t.titulo}" foi ${novoStatus ? 'reativado' : 'desativado'} com sucesso.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao alterar status',
        description: err?.message || 'Não foi possível atualizar o template.',
        variant: 'destructive',
      })
    }
  }

  // Inserção de variável no textarea de edição
  const inserirVariavelNoConteudo = (variavel: string) => {
    const placeholder = `{{${variavel}}}`
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
        await updateWhatsAppTemplate(templateEditando.id, {
          titulo: tituloForm.trim(),
          categoria: categoriaForm,
          etapa: etapaForm,
          conteudo: conteudoForm.trim(),
          ativo: ativoForm,
          variaveis_disponiveis: variaveisDetectadas,
        })
        toast({
          title: 'Template atualizado!',
          description: `O template "${tituloForm.trim()}" foi salvo com sucesso.`,
        })
      } else {
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
          etapa: etapaForm,
          conteudo: conteudoForm.trim(),
          ativo: ativoForm,
          tipo_gatilho: 'manual',
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

  // Confirmar exclusão permanente
  const handleConfirmarExclusao = async () => {
    if (!templateParaExcluir) return
    setExcluindo(true)
    try {
      await removeWhatsAppTemplate(templateParaExcluir.id)
      toast({
        title: 'Template excluído',
        description: `O template "${templateParaExcluir.titulo}" foi removido do banco.`,
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

  // Estilização das badges de categoria
  const getBadgeCategoria = (categoria: string) => {
    switch (categoria) {
      case 'Comercial':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
      case 'Atendimento':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
      case 'O&M & Pós-Venda':
        return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
      case 'Financeiro/Cobrança':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300'
      case 'Operacional/RGE':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Cabeçalho Visual (Padrão Configurações e Gestão Delfos) */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Mensagens WhatsApp</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {whatsAppTemplates.length} modelos
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Central de modelos de mensagens do WhatsApp: Comercial, Atendimento, O&M &
                Pós-Venda, Cobrança e Operacional.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshData()}
            disabled={carregandoWhatsAppTemplates}
            className="text-xs h-9 text-gray-700 hover:text-emerald-700 hover:bg-emerald-50"
          >
            <RotateCcw
              className={`w-3.5 h-3.5 mr-1.5 ${carregandoWhatsAppTemplates ? 'animate-spin' : ''}`}
            />
            {carregandoWhatsAppTemplates ? 'Carregando...' : 'Recarregar'}
          </Button>

          <Button
            onClick={handleNovoTemplate}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 shadow-xs gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Template
          </Button>

          {embeddedInModal && onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="text-xs h-9">
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros Multifacetada: Busca, Categoria, Etapa, Status, Origem */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Busca Textual */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Buscar por título, texto, variável, slug ou uso..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs sm:text-sm bg-gray-50/50"
            />
          </div>

          {/* Filtro Categoria */}
          <div className="md:col-span-4 sm:col-span-6">
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="h-9 text-xs bg-gray-50/50">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="text-xs">
                  Todas as categorias
                </SelectItem>
                {nomesCategorias.map((cNome) => (
                  <SelectItem key={cNome} value={cNome} className="text-xs">
                    {cNome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Etapa */}
          <div className="md:col-span-3 sm:col-span-6">
            <Select value={etapaFiltro} onValueChange={setEtapaFiltro}>
              <SelectTrigger className="h-9 text-xs bg-gray-50/50">
                <SelectValue placeholder="Etapa do funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas" className="text-xs">
                  Todas as etapas
                </SelectItem>
                {nomesEtapas.map((eNome) => (
                  <SelectItem key={eNome} value={eNome} className="text-xs">
                    {eNome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Linha secundária de filtros: Status, Origem e Limpeza */}
        <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-gray-100/70 p-1 rounded-lg">
              <span className="text-[11px] font-semibold text-gray-500 px-1.5">Status:</span>
              <button
                type="button"
                onClick={() => setStatusFiltro('todos')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  statusFiltro === 'todos'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setStatusFiltro('ativos')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  statusFiltro === 'ativos'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ativos
              </button>
              <button
                type="button"
                onClick={() => setStatusFiltro('inativos')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  statusFiltro === 'inativos'
                    ? 'bg-rose-600 text-white shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Inativos
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100/70 p-1 rounded-lg">
              <span className="text-[11px] font-semibold text-gray-500 px-1.5">Origem:</span>
              <button
                type="button"
                onClick={() => setOrigemFiltro('todas')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  origemFiltro === 'todas'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setOrigemFiltro('base_conhecimento')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex items-center gap-1 ${
                  origemFiltro === 'base_conhecimento'
                    ? 'bg-purple-600 text-white shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Base de Conhecimento
              </button>
              <button
                type="button"
                onClick={() => setOrigemFiltro('sistema')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  origemFiltro === 'sistema'
                    ? 'bg-white text-gray-900 shadow-2xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sistema
              </button>
            </div>
          </div>

          {(busca ||
            categoriaFiltro !== 'todas' ||
            etapaFiltro !== 'todas' ||
            statusFiltro !== 'todos' ||
            origemFiltro !== 'todas') && (
            <button
              type="button"
              onClick={() => {
                setBusca('')
                setCategoriaFiltro('todas')
                setEtapaFiltro('todas')
                setStatusFiltro('todos')
                setOrigemFiltro('todas')
              }}
              className="text-[11px] text-emerald-700 hover:underline font-semibold"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>

      {/* Grid de Templates */}
      {carregandoWhatsAppTemplates ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground bg-white border border-gray-200 rounded-xl">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium">Carregando templates cadastrados...</p>
        </div>
      ) : templatesFiltrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-white p-8">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-base text-gray-900 mb-1">Nenhum template encontrado</h3>
          <p className="text-xs text-gray-500 max-w-sm mb-4">
            Nenhum modelo corresponde aos filtros aplicados. Tente ajustar os termos de busca ou
            filtros de categoria e etapa.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setBusca('')
              setCategoriaFiltro('todas')
              setEtapaFiltro('todas')
              setStatusFiltro('todos')
              setOrigemFiltro('todas')
            }}
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templatesFiltrados.map((template) => {
            const categoria = resolverCategoria(template)
            const etapa = resolverEtapa(template)
            const fluxo = getFluxoDoTemplate(template.slug)
            const variaveis = extrairVariaveisTemplate(
              template.variaveis_disponiveis,
              template.conteudo,
            )

            return (
              <Card
                key={template.id}
                className={`border transition-all bg-white shadow-2xs hover:shadow-xs flex flex-col justify-between ${
                  template.ativo === false
                    ? 'border-gray-200 opacity-75 bg-gray-50/60'
                    : 'border-gray-200 hover:border-emerald-500/50'
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    {/* Linha Superior: Título + Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-snug">
                            {template.titulo}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {template.ativo === false ? (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200"
                          >
                            Inativo
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ativo
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Taxonomia: Categoria + Etapa + Origem */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-semibold border ${getBadgeCategoria(categoria)}`}
                      >
                        {categoria}
                      </Badge>

                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1"
                      >
                        <Layers className="w-3 h-3 text-gray-400" />
                        {etapa}
                      </Badge>

                      {template.origem_base_conhecimento && (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1"
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          Base de Conhecimento
                        </Badge>
                      )}

                      {template.slug && (
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {template.slug}
                        </span>
                      )}
                    </div>

                    {/* Informação de Fluxo Vinculado (se houver) */}
                    {fluxo && (
                      <div className="text-[11px] text-blue-900 bg-blue-50/80 border border-blue-200 rounded-md p-2 mb-2 flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold">{fluxo.tituloUso}:</strong>{' '}
                          {fluxo.descricaoUso}
                        </div>
                      </div>
                    )}

                    {/* Caixa de Texto do Conteúdo */}
                    <div className="relative rounded-lg bg-gray-50 border border-gray-200/80 p-3 text-xs text-gray-800 font-sans whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto select-text">
                      {template.conteudo}
                    </div>

                    {/* Tags Dinâmicas / Variáveis */}
                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Variáveis interpoladas:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {variaveis.length > 0 ? (
                          variaveis.map((v) => (
                            <span
                              key={v}
                              className="text-[10px] font-mono bg-white border border-gray-300 text-gray-800 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                            >
                              <span className="text-emerald-600 font-bold">{'{'}</span>
                              <span>{v}</span>
                              <span className="text-emerald-600 font-bold">{'}'}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">
                            Sem variáveis dinâmicas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra Inferior de Ações */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewTemplate(template)}
                        className="text-xs h-7 px-2.5 text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200 gap-1"
                        title="Ver mensagem com placeholders preenchidos"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopiarTexto(template.conteudo, template.id)}
                        className="text-xs h-7 px-2 gap-1 text-gray-600 hover:text-gray-900"
                        title="Copiar texto do template"
                      >
                        {copiadoId === template.id ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600 font-semibold">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copiar
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicarTemplate(template)}
                        className="text-xs h-7 px-2 gap-1 text-gray-600 hover:text-gray-900"
                        title="Duplicar modelo para criar variante"
                      >
                        <Copy className="w-3 h-3 text-purple-600" />
                        Duplicar
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Ativar / Desativar rápido (desativar não é excluir) */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleAtivo(template)}
                        className={`text-xs h-7 px-2 gap-1 ${
                          template.ativo === false
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-amber-700 hover:bg-amber-50'
                        }`}
                        title={
                          template.ativo === false
                            ? 'Reativar template'
                            : 'Desativar template (sem excluir)'
                        }
                      >
                        <Power className="w-3 h-3" />
                        {template.ativo === false ? 'Reativar' : 'Desativar'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditarTemplate(template)}
                        className="text-xs h-7 px-2.5 text-gray-700 hover:bg-gray-100 gap-1"
                      >
                        <Edit2 className="w-3 h-3 text-amber-500" />
                        Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTemplateParaExcluir(template)}
                        className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        title="Excluir template permanentemente"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

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
                  Cadastrar Novo Template de WhatsApp
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure o título, categoria, etapa do funil e corpo da mensagem com variáveis
              dinâmicas padronizadas: {'{{nome}}'}, {'{{empresa}}'}, {'{{valor}}'}, {'{{data}}'}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarTemplate} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="form-titulo" className="text-xs font-semibold">
                    Título do Template <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="form-titulo"
                    placeholder="Ex: Follow-up Fase 1 — Checagem"
                    value={tituloForm}
                    onChange={(e) => setTituloForm(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-categoria" className="text-xs font-semibold">
                    Categoria <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={categoriaForm}
                    onValueChange={(val) => setCategoriaForm(val as CategoriaTemplate)}
                  >
                    <SelectTrigger id="form-categoria" className="text-sm">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {nomesCategorias.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="form-etapa" className="text-xs font-semibold">
                    Etapa da Mensagem <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={etapaForm}
                    onValueChange={(val) => setEtapaForm(val as EtapaTemplate)}
                  >
                    <SelectTrigger id="form-etapa" className="text-sm">
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {nomesEtapas.map((et) => (
                        <SelectItem key={et} value={et}>
                          {et}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="form-slug" className="text-xs font-semibold">
                    Slug / Identificador
                  </Label>
                  <Input
                    id="form-slug"
                    placeholder="ex: followup_fase_1_checagem"
                    value={slugForm}
                    onChange={(e) => setSlugForm(e.target.value)}
                    disabled={Boolean(templateEditando)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Botões de inserção de tags padronizadas */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-gray-700">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Inserir variáveis padronizadas com 1 clique:
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {['nome', 'empresa', 'valor', 'data', 'usina', 'numero_uc', 'endereco'].map(
                    (tag) => (
                      <Button
                        key={tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inserirVariavelNoConteudo(tag)}
                        className="text-xs h-7 font-mono px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
                      >
                        +{`{{${tag}}}`}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              {/* Texto do Conteúdo */}
              <div className="space-y-1.5">
                <Label htmlFor="form-conteudo" className="text-xs font-semibold">
                  Conteúdo da Mensagem <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="form-conteudo"
                  rows={6}
                  placeholder="Olá, {{nome}}! Tudo bem? Aqui é da Delfos Solar..."
                  value={conteudoForm}
                  onChange={(e) => setConteudoForm(e.target.value)}
                  required
                  className="text-xs font-mono leading-relaxed"
                />
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <Switch id="form-ativo" checked={ativoForm} onCheckedChange={setAtivoForm} />
                <Label htmlFor="form-ativo" className="text-xs font-medium cursor-pointer">
                  Template ativo e disponível para seleção nos envios
                </Label>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border bg-card flex items-center justify-between sm:justify-between">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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

      {/* MODAL DE PREVIEW */}
      {previewTemplate && (
        <Dialog open={Boolean(previewTemplate)} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
            <DialogHeader className="p-5 pb-3 border-b bg-card">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-600" />
                Pré-visualização da Mensagem
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Exibição com os dados de simulação do cliente substituídos nas variáveis.
              </DialogDescription>
            </DialogHeader>

            <div className="p-5 space-y-3 bg-[#e5ddd5]/30">
              <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-4 space-y-2 select-text">
                <div className="flex items-center justify-between border-b pb-2 text-[11px] text-gray-500">
                  <span className="font-semibold text-gray-900">{previewTemplate.titulo}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${getBadgeCategoria(resolverCategoria(previewTemplate))}`}
                  >
                    {resolverCategoria(previewTemplate)} • {resolverEtapa(previewTemplate)}
                  </Badge>
                </div>

                <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {renderizarPreviewTemplate(previewTemplate.conteudo)}
                </div>
              </div>

              <div className="text-[11px] text-gray-500 bg-white/70 p-2.5 rounded-lg border border-gray-200">
                <strong className="text-gray-700">Variáveis interpoladas:</strong>{' '}
                {{
                  nome: 'Carlos Alberto',
                  empresa: 'Delfos Solar',
                  valor: 'R$ 38.500,00',
                  data: '26/10/2026',
                }[previewTemplate.id] || '{{nome}}, {{empresa}}, {{valor}}, {{data}}'}
              </div>
            </div>

            <DialogFooter className="p-4 border-t bg-card flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleCopiarTexto(
                    renderizarPreviewTemplate(previewTemplate.conteudo),
                    previewTemplate.id,
                  )
                }
                className="text-xs"
              >
                Copiar Texto Preenchido
              </Button>
              <Button size="sm" onClick={() => setPreviewTemplate(null)} className="text-xs">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog
        open={Boolean(templateParaExcluir)}
        onOpenChange={(aberto) => !aberto && setTemplateParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir permanentemente este template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Você está prestes a remover o template{' '}
              <strong>"{templateParaExcluir?.titulo}"</strong>. Caso deseje apenas ocultá-lo dos
              pontos de envio sem perder o histórico, utilize a opção <strong>Desativar</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExclusao}
              disabled={excluindo}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {excluindo ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default GerenciarMensagensWhatsApp

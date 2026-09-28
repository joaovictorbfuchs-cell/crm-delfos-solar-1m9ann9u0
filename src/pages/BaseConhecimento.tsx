import React, { useState, useEffect, useRef } from 'react'
import {
  BookOpen,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileText,
  FileSpreadsheet,
  Paperclip,
  TrendingUp,
  Wrench,
  HelpCircle,
  Tag,
  ChevronRight,
  FolderPlus,
  Loader2,
  Download,
  AlertCircle,
  Bot,
  Send,
  X,
  FileCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  listarCategorias,
  listarArtigos,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  criarArtigo,
  atualizarArtigo,
  excluirArtigo,
  getAnexoUrl,
  perguntarAssistenteDelfos,
  type KnowledgeCategory,
  type KnowledgeArticle,
} from '@/services/knowledgeBaseService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

export default function BaseConhecimento() {
  const { isAdmin } = useAuth()

  // Estados principais
  const [categorias, setCategorias] = useState<KnowledgeCategory[]>([])
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<KnowledgeCategory | null>(null)
  const [artigos, setArtigos] = useState<KnowledgeArticle[]>([])
  const [artigoVisualizando, setArtigoVisualizando] = useState<KnowledgeArticle | null>(null)

  // Filtros e busca
  const [termoBusca, setTermoBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [carregandoArtigos, setCarregandoArtigos] = useState(false)

  // Modais de Categoria
  const [modalCategoriaOpen, setModalCategoriaOpen] = useState(false)
  const [categoriaEditando, setCategoriaEditando] = useState<KnowledgeCategory | null>(null)
  const [catTitulo, setCatTitulo] = useState('')
  const [catDescricao, setCatDescricao] = useState('')
  const [catIcone, setCatIcone] = useState('BookOpen')
  const [salvandoCategoria, setSalvandoCategoria] = useState(false)

  // Modais de Artigo
  const [modalArtigoOpen, setModalArtigoOpen] = useState(false)
  const [artigoEditando, setArtigoEditando] = useState<KnowledgeArticle | null>(null)
  const [artTitulo, setArtTitulo] = useState('')
  const [artConteudo, setArtConteudo] = useState('')
  const [artTags, setArtTags] = useState('')
  const [artAnexos, setArtAnexos] = useState<File[]>([])
  const [salvandoArtigo, setSalvandoArtigo] = useState(false)
  const [mensagemProgresso, setMensagemProgresso] = useState<string | null>(null)

  // Carregar dados iniciais
  const carregarCategorias = async (selecionarId?: string) => {
    try {
      const cats = await listarCategorias()
      setCategorias(cats)
      if (cats.length > 0) {
        if (selecionarId) {
          const achada = cats.find((c) => c.id === selecionarId)
          setCategoriaSelecionada(achada || cats[0])
        } else if (!categoriaSelecionada) {
          setCategoriaSelecionada(cats[0])
        }
      }
    } catch (err) {
      console.error('Erro ao carregar categorias:', err)
      toast({
        title: 'Erro ao carregar categorias',
        description: 'Não foi possível carregar as categorias da base de conhecimento.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarCategorias()
  }, [])

  // Carregar artigos quando mudar categoria ou termo de busca
  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      setCarregandoArtigos(true)
      try {
        const arts = await listarArtigos({
          categoriaId: categoriaSelecionada ? categoriaSelecionada.id : undefined,
          busca: termoBusca,
        })
        if (ativo) {
          setArtigos(arts)
          // Se estava visualizando um artigo que continua na lista ou atualizado
          if (artigoVisualizando) {
            const atualizado = arts.find((a) => a.id === artigoVisualizando.id)
            setArtigoVisualizando(atualizado || arts[0] || null)
          } else if (arts.length > 0) {
            setArtigoVisualizando(arts[0])
          } else {
            setArtigoVisualizando(null)
          }
        }
      } catch (err) {
        console.error('Erro ao listar artigos:', err)
      } finally {
        if (ativo) setCarregandoArtigos(false)
      }
    }

    carregar()
    return () => {
      ativo = false
    }
  }, [categoriaSelecionada, termoBusca])

  // Helpers de ícones
  const renderIconeCategoria = (icone?: string, className = 'w-4 h-4') => {
    switch (icone) {
      case 'FileSpreadsheet':
        return <FileSpreadsheet className={className} />
      case 'TrendingUp':
        return <TrendingUp className={className} />
      case 'Wrench':
        return <Wrench className={className} />
      case 'BookOpen':
      default:
        return <BookOpen className={className} />
    }
  }

  // Ações de Categoria
  const abrirNovaCategoria = () => {
    setCategoriaEditando(null)
    setCatTitulo('')
    setCatDescricao('')
    setCatIcone('BookOpen')
    setModalCategoriaOpen(true)
  }

  const abrirEditarCategoria = (cat: KnowledgeCategory, e: React.MouseEvent) => {
    e.stopPropagation()
    setCategoriaEditando(cat)
    setCatTitulo(cat.titulo)
    setCatDescricao(cat.descricao || '')
    setCatIcone(cat.icone || 'BookOpen')
    setModalCategoriaOpen(true)
  }

  const handleSalvarCategoria = async () => {
    if (!catTitulo.trim()) {
      toast({ title: 'Título é obrigatório', variant: 'destructive' })
      return
    }

    setSalvandoCategoria(true)
    try {
      if (categoriaEditando) {
        await atualizarCategoria(categoriaEditando.id, {
          titulo: catTitulo.trim(),
          descricao: catDescricao.trim(),
          icone: catIcone,
        })
        toast({ title: 'Categoria atualizada com sucesso!' })
        await carregarCategorias(categoriaEditando.id)
      } else {
        const nova = await criarCategoria({
          titulo: catTitulo.trim(),
          descricao: catDescricao.trim(),
          icone: catIcone,
          ordem: categorias.length + 1,
        })
        toast({ title: 'Categoria criada com sucesso!' })
        await carregarCategorias(nova.id)
      }
      setModalCategoriaOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar categoria',
        description: err?.message || 'Verifique suas permissões.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoCategoria(false)
    }
  }

  const handleExcluirCategoria = async (cat: KnowledgeCategory, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Deseja realmente excluir a categoria "${cat.titulo}" e todos os seus artigos?`)) {
      return
    }

    try {
      await excluirCategoria(cat.id)
      toast({ title: 'Categoria excluída' })
      await carregarCategorias()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir categoria',
        description: err?.message || 'Não foi possível excluir a categoria.',
        variant: 'destructive',
      })
    }
  }

  // Ações de Artigo
  const abrirNovoArtigo = () => {
    if (!categoriaSelecionada) {
      toast({ title: 'Selecione uma categoria primeiro', variant: 'destructive' })
      return
    }
    setArtigoEditando(null)
    setArtTitulo('')
    setArtConteudo('')
    setArtTags('')
    setArtAnexos([])
    setMensagemProgresso(null)
    setModalArtigoOpen(true)
  }

  const abrirEditarArtigo = (artigo: KnowledgeArticle) => {
    setArtigoEditando(artigo)
    setArtTitulo(artigo.titulo)
    setArtConteudo(artigo.conteudo)
    setArtTags(artigo.tags || '')
    setArtAnexos([])
    setMensagemProgresso(null)
    setModalArtigoOpen(true)
  }

  const handleSalvarArtigo = async () => {
    if (!artTitulo.trim() || !artConteudo.trim()) {
      toast({ title: 'Título e conteúdo são obrigatórios', variant: 'destructive' })
      return
    }

    if (!categoriaSelecionada) return

    setSalvandoArtigo(true)
    try {
      if (artigoEditando) {
        await atualizarArtigo(
          artigoEditando.id,
          {
            titulo: artTitulo.trim(),
            conteudo: artConteudo.trim(),
            tags: artTags.trim(),
            novosAnexos: artAnexos.length > 0 ? artAnexos : undefined,
          },
          (msg) => setMensagemProgresso(msg),
          (aviso) => {
            toast({
              title: 'Aviso sobre anexo',
              description: aviso,
              variant: 'default',
            })
          },
        )
        toast({ title: 'Artigo atualizado com sucesso!' })
      } else {
        await criarArtigo(
          {
            categoria_id: categoriaSelecionada.id,
            titulo: artTitulo.trim(),
            conteudo: artConteudo.trim(),
            tags: artTags.trim(),
            anexos: artAnexos.length > 0 ? artAnexos : undefined,
          },
          (msg) => setMensagemProgresso(msg),
          (aviso) => {
            toast({
              title: 'Aviso sobre anexo',
              description: aviso,
              variant: 'default',
            })
          },
        )
        toast({ title: 'Artigo criado e salvo com sucesso!' })
      }

      setModalArtigoOpen(false)
      // Recarregar artigos da categoria
      try {
        const arts = await listarArtigos({
          categoriaId: categoriaSelecionada.id,
          busca: termoBusca,
        })
        setArtigos(arts)
        if (arts.length > 0) {
          const selecionado = artigoEditando
            ? arts.find((a) => a.id === artigoEditando.id) || arts[0]
            : arts[0]
          setArtigoVisualizando(selecionado)
        }
      } catch (errList) {
        console.warn('[BaseConhecimento] Erro ao recarregar artigos após salvar:', errList)
      }
      carregarCategorias(categoriaSelecionada.id).catch(() => {})
    } catch (err: any) {
      console.error('[BaseConhecimento] Erro ao salvar artigo:', err)
      toast({
        title: 'Erro ao salvar artigo',
        description:
          err?.message ||
          'Não foi possível salvar o artigo. Tente outro arquivo ou salve o artigo sem anexo.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoArtigo(false)
      setMensagemProgresso(null)
    }
  }

  const handleExcluirArtigo = async (artigo: KnowledgeArticle) => {
    if (!confirm(`Deseja excluir o artigo "${artigo.titulo}"?`)) return

    try {
      await excluirArtigo(artigo.id)
      toast({ title: 'Artigo excluído' })
      const novos = artigos.filter((a) => a.id !== artigo.id)
      setArtigos(novos)
      setArtigoVisualizando(novos[0] || null)
      if (categoriaSelecionada) carregarCategorias(categoriaSelecionada.id)
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir artigo',
        description: err?.message || 'Falha ao excluir.',
        variant: 'destructive',
      })
    }
  }

  // Adicionar arquivos ao formulário com proteção e validação
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const fileList = e.target?.files
      if (fileList && fileList.length > 0) {
        const novos = Array.from(fileList).filter((f) => f && f.name && f.size > 0)
        if (novos.length === 0) {
          toast({
            title: 'Arquivo inválido',
            description: 'O arquivo selecionado está vazio ou ilegível.',
            variant: 'destructive',
          })
        } else {
          setArtAnexos((prev) => [...prev, ...novos])
        }
      }
    } catch (err: any) {
      console.warn('[BaseConhecimento] Erro ao selecionar arquivo:', err)
      toast({
        title: 'Não foi possível carregar o arquivo',
        description: 'Tente selecionar o arquivo novamente ou escolha outro documento.',
        variant: 'destructive',
      })
    } finally {
      // Limpa o target value para permitir selecionar o mesmo arquivo novamente se necessário
      try {
        if (e.target) e.target.value = ''
      } catch {
        /* ignore */
      }
    }
  }

  const removerAnexoFila = (index: number) => {
    setArtAnexos((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] lg:h-[calc(100vh-7rem)] -mx-3 sm:-mx-6 lg:-mx-8 -my-4 overflow-hidden bg-gray-50/50">
      {/* Top Header da Base de Conhecimento */}
      <div className="h-16 border-b border-gray-200 bg-white px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight flex items-center gap-2">
              Base de Conhecimento
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <Sparkles className="w-3 h-3 text-emerald-600" /> IA Integrada
              </span>
            </h1>
            <p className="text-xs text-gray-500 hidden sm:block">
              Manuais de faturas, argumentos de vendas, suporte técnico e documentos indexados
            </p>
          </div>
        </div>

        {/* Barra de Pesquisa Global na Base */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md justify-end">
          <div className="relative w-full max-w-xs sm:max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Pesquisar nos artigos e documentos..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="pl-9 h-9 text-xs bg-gray-50 border-gray-200 focus:bg-white rounded-lg transition-colors"
            />
            {termoBusca && (
              <button
                onClick={() => setTermoBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isAdmin && (
            <Button
              onClick={abrirNovoArtigo}
              disabled={!categoriaSelecionada}
              className="h-9 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-2xs shrink-0 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Novo Artigo</span>
            </Button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal Dividido: Categorias (Esquerda) | Artigos e Leitura (Direita) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Lateral de Categorias (Desktop 280px / Mobile expansível) */}
        <aside className="w-64 sm:w-72 border-r border-gray-200 bg-white flex flex-col shrink-0 select-none">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Categorias
            </span>
            {isAdmin && (
              <button
                onClick={abrirNovaCategoria}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/60 px-2 py-1 rounded-md transition-colors"
                title="Adicionar nova categoria"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Nova</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {carregando ? (
              <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Carregando...
              </div>
            ) : categorias.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                Nenhuma categoria cadastrada.
              </div>
            ) : (
              categorias.map((cat) => {
                const isSelected = categoriaSelecionada?.id === cat.id
                return (
                  <div
                    key={cat.id}
                    onClick={() => setCategoriaSelecionada(cat)}
                    className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200 shadow-2xs'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                        }`}
                      >
                        {renderIconeCategoria(cat.icone, 'w-3.5 h-3.5')}
                      </div>
                      <div className="min-w-0">
                        <span className="truncate block leading-tight">{cat.titulo}</span>
                        {cat.descricao && (
                          <span className="text-[10px] text-gray-400 font-normal truncate block">
                            {cat.descricao}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {cat.artigos_count !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-emerald-200 text-emerald-900'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {cat.artigos_count}
                        </span>
                      )}

                      {isAdmin && (
                        <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                          <button
                            onClick={(e) => abrirEditarCategoria(cat, e)}
                            className="p-1 hover:text-emerald-700 hover:bg-emerald-100 rounded"
                            title="Editar categoria"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleExcluirCategoria(cat, e)}
                            className="p-1 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Excluir categoria"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Coluna Central: Lista de Artigos da Categoria */}
        <div className="w-72 sm:w-80 border-r border-gray-200 bg-white flex flex-col shrink-0">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-bold text-gray-800 truncate">
                {categoriaSelecionada?.titulo || 'Todos os Artigos'}
              </span>
              <span className="text-[11px] text-gray-400 font-semibold">({artigos.length})</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {carregandoArtigos ? (
              <div className="p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Carregando artigos...
              </div>
            ) : artigos.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <HelpCircle className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs text-gray-500 font-medium">Nenhum artigo encontrado</p>
                {isAdmin && categoriaSelecionada && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={abrirNovoArtigo}
                    className="text-xs border-dashed text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Criar primeiro artigo
                  </Button>
                )}
              </div>
            ) : (
              artigos.map((art) => {
                const isSelected = artigoVisualizando?.id === art.id
                const hasAnexos = art.anexos && art.anexos.length > 0
                return (
                  <div
                    key={art.id}
                    onClick={() => setArtigoVisualizando(art)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`text-xs font-bold leading-tight ${
                          isSelected ? 'text-emerald-950' : 'text-gray-900'
                        }`}
                      >
                        {art.titulo}
                      </h3>
                      {hasAnexos && (
                        <span
                          className="shrink-0 text-emerald-600"
                          title={`${art.anexos?.length} anexo(s)`}
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-1 leading-normal">
                      {art.conteudo}
                    </p>

                    <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-gray-100 text-[10px] text-gray-400">
                      <span>{art.autor_nome || 'Equipe Delfos'}</span>
                      {art.tags && (
                        <div className="flex items-center gap-1 overflow-hidden">
                          <Tag className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[100px]">{art.tags}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Leitura Detalhada do Artigo Selecionado */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-white">
          {artigoVisualizando ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Topo do Artigo com Ações */}
              <div className="border-b border-gray-200 pb-5">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 mb-2">
                  <span>{artigoVisualizando.expand?.categoria_id?.titulo || 'Artigo'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-gray-400 font-mono text-[11px]">
                    {new Date(artigoVisualizando.created).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-950 leading-tight">
                    {artigoVisualizando.titulo}
                  </h1>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirEditarArtigo(artigoVisualizando)}
                        className="h-8 text-xs border-gray-200 hover:bg-gray-50 gap-1 text-gray-700"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExcluirArtigo(artigoVisualizando)}
                        className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        title="Excluir Artigo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                {artigoVisualizando.tags && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {artigoVisualizando.tags.split(',').map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                      >
                        #{t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Corpo do Conteúdo */}
              <div className="prose prose-sm sm:prose-base max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                {artigoVisualizando.conteudo}
              </div>

              {/* Anexos e Documentos Indexados */}
              {artigoVisualizando.anexos && artigoVisualizando.anexos.length > 0 && (
                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-emerald-600" />
                    Anexos & Documentos da Base ({artigoVisualizando.anexos.length})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {artigoVisualizando.anexos
                      .filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
                      .map((filename, i) => {
                        let url = '#'
                        try {
                          url = getAnexoUrl(artigoVisualizando, filename)
                        } catch (err) {
                          console.warn('[BaseConhecimento] Erro ao obter URL do anexo:', err)
                        }
                        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(filename)
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50/60 hover:bg-gray-100/80 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-gray-800 block truncate">
                                  {filename}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  {isImg ? 'Imagem (OCR indexado)' : 'Documento (Texto indexado)'}
                                </span>
                              </div>
                            </div>

                            {url && url !== '#' && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-500 hover:text-emerald-700 rounded-lg hover:bg-white transition-colors shrink-0"
                                title="Baixar anexo"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Dica do Assistente IA */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-start gap-3">
                <Bot className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 leading-normal">
                  <span className="font-bold block mb-0.5">Assistente Inteligente Delfos:</span>
                  Este artigo e o conteúdo extraído dos anexos já estão indexados. Você pode fazer
                  perguntas sobre este conteúdo no botão flutuante no canto inferior direito a
                  qualquer momento.
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <BookOpen className="w-12 h-12 text-gray-300 stroke-[1.5] mb-2" />
              <h2 className="text-sm font-bold text-gray-600">Nenhum artigo selecionado</h2>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                Selecione um artigo na lista ao lado para ler os detalhes ou crie um novo conteúdo
                para a base de conhecimento.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CRIAR / EDITAR CATEGORIA (ADMIN)                        */}
      {/* ============================================================== */}
      <Dialog open={modalCategoriaOpen} onOpenChange={setModalCategoriaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{categoriaEditando ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            <DialogDescription>
              Organize os artigos da base em tópicos claros para a equipe e o assistente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Título da Categoria *</label>
              <Input
                placeholder="Ex: Análise de Faturas, Suporte Comercial, Suporte Técnico..."
                value={catTitulo}
                onChange={(e) => setCatTitulo(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Descrição</label>
              <Input
                placeholder="Breve resumo do conteúdo abrigado neste tópico..."
                value={catDescricao}
                onChange={(e) => setCatDescricao(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Ícone Representativo</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'BookOpen', label: 'Padrão', icon: BookOpen },
                  { id: 'FileSpreadsheet', label: 'Faturas', icon: FileSpreadsheet },
                  { id: 'TrendingUp', label: 'Comercial', icon: TrendingUp },
                  { id: 'Wrench', label: 'Técnico', icon: Wrench },
                ].map((item) => {
                  const Icon = item.icon
                  const selected = catIcone === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCatIcone(item.id)}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs gap-1 transition-all ${
                        selected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold shadow-2xs'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px]">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalCategoriaOpen(false)}
              disabled={salvandoCategoria}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvarCategoria}
              disabled={salvandoCategoria}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {salvandoCategoria && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {categoriaEditando ? 'Salvar Alterações' : 'Criar Categoria'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================== */}
      {/* MODAL: CRIAR / EDITAR ARTIGO (ADMIN) COM EXTRAÇÃO DE ANEXOS    */}
      {/* ============================================================== */}
      <Dialog open={modalArtigoOpen} onOpenChange={setModalArtigoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-2 border-b border-gray-100">
            <DialogTitle className="text-base sm:text-lg">
              {artigoEditando ? 'Editar Artigo' : 'Novo Artigo na Base de Conhecimento'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {categoriaSelecionada && (
                <span>
                  Categoria: <strong>{categoriaSelecionada.titulo}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">Título do Artigo *</label>
              <Input
                placeholder="Ex: Como interpretar os componentes TUSD e TE da RGE..."
                value={artTitulo}
                onChange={(e) => setArtTitulo(e.target.value)}
                className="text-xs font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">
                Conteúdo do Artigo (Texto Explicativo) *
              </label>
              <Textarea
                placeholder="Escreva as regras, parâmetros técnicos, argumentos comerciais ou procedimentos detalhados..."
                value={artConteudo}
                onChange={(e) => setArtConteudo(e.target.value)}
                rows={9}
                className="text-xs leading-relaxed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-800">
                Palavras-chave / Tags (separadas por vírgula)
              </label>
              <Input
                placeholder="Ex: rge, fatura, tusd, te, tarifa, inversores, garantia"
                value={artTags}
                onChange={(e) => setArtTags(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Anexos de Documentos (PDF, Word, Imagens) */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-gray-800 block">
                    Anexar Arquivos (PDF, Word, Imagens)
                  </label>
                  <span className="text-[11px] text-gray-500">
                    O sistema extrai o texto e tabelas (com Gemini Vision para imagens) para indexar
                    na IA.
                  </span>
                </div>

                <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>Selecionar arquivos</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              {artAnexos.length > 0 && (
                <div className="space-y-1.5 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="text-[11px] font-bold text-gray-600 block">
                    Novos arquivos selecionados para upload:
                  </span>
                  {artAnexos.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs"
                    >
                      <span className="truncate max-w-sm text-gray-800">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => removerAnexoFila(i)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alerta de Progresso */}
            {mensagemProgresso && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-700 shrink-0" />
                <span>{mensagemProgresso}</span>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 sm:p-6 border-t border-gray-100 bg-gray-50/50 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalArtigoOpen(false)}
              disabled={salvandoArtigo}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvarArtigo}
              disabled={salvandoArtigo}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {salvandoArtigo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {artigoEditando ? 'Salvar Artigo' : 'Publicar Artigo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

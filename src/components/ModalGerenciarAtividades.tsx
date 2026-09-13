import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CATEGORIAS_ATIVIDADES, ATIVIDADES_PADRAO } from '@/constants/atividadesTipos'
import { useClientes } from '@/contexts/ClientesContext'
import type { AtividadeCategoriaId } from '@/types/crm'
import {
  Plus,
  Trash2,
  Lock,
  Layers,
  Sparkles,
  Info,
  Loader2,
  Briefcase,
  Wrench,
  FileSpreadsheet,
} from 'lucide-react'

interface ModalGerenciarAtividadesProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ModalGerenciarAtividades: React.FC<ModalGerenciarAtividadesProps> = ({
  open,
  onOpenChange,
}) => {
  const { tiposAtividadesCustom, addTipoAtividadeCustom, removeTipoAtividadeCustom } = useClientes()

  const [activeCategoryTab, setActiveCategoryTab] = useState<AtividadeCategoriaId>('comercial')
  const [novoNome, setNovoNome] = useState('')
  const [novaCategoria, setNovaCategoria] = useState<AtividadeCategoriaId>('comercial')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim()) {
      setFormError('Por favor, informe o nome do tipo de atividade.')
      return
    }

    setFormError(null)
    setIsSubmitting(true)
    try {
      await addTipoAtividadeCustom({
        nome: novoNome.trim(),
        categoria: novaCategoria,
        descricao: novaDescricao.trim() || undefined,
      })
      // Limpa o formulário e posiciona a aba ativa na categoria criada
      setActiveCategoryTab(novaCategoria)
      setNovoNome('')
      setNovaDescricao('')
    } catch (err: unknown) {
      console.error('Erro ao cadastrar novo tipo de atividade:', err)
      setFormError(
        err instanceof Error ? err.message : 'Falha ao cadastrar novo tipo de atividade.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExcluir = async (id: string, nome: string) => {
    if (!window.confirm(`Tem certeza que deseja apagar o tipo de atividade "${nome}"?`)) {
      return
    }
    setDeletingId(id)
    try {
      await removeTipoAtividadeCustom(id)
    } catch (err) {
      console.error('Erro ao remover tipo:', err)
      alert('Não foi possível remover este tipo.')
    } finally {
      setDeletingId(null)
    }
  }

  // Filtrar tipos da categoria selecionada
  const padroesDaCategoria = ATIVIDADES_PADRAO.filter((t) => t.categoria === activeCategoryTab)
  const customizadosDaCategoria = tiposAtividadesCustom.filter(
    (t) => t.categoria === activeCategoryTab,
  )

  const currentCategoryDef = CATEGORIAS_ATIVIDADES.find((c) => c.id === activeCategoryTab)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-slate-50 via-white to-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-200">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                Gerenciar Tipos de Atividades
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                Organize as atividades do CRM em categorias. Tipos padrão são protegidos pelo
                sistema; crie novos tipos personalizados conforme a necessidade da operação solar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Formulário de Criação */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-gray-800">
                Cadastrar Novo Tipo de Atividade
              </h3>
            </div>

            <form onSubmit={handleCriar} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6 space-y-1">
                  <Label htmlFor="nome-tipo" className="text-xs font-medium text-gray-700">
                    Nome da Atividade *
                  </Label>
                  <Input
                    id="nome-tipo"
                    placeholder="Ex: Auditoria de Fatura, Vistoria com Drone..."
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="sm:col-span-6 space-y-1">
                  <Label htmlFor="categoria-tipo" className="text-xs font-medium text-gray-700">
                    Categoria *
                  </Label>
                  <select
                    id="categoria-tipo"
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value as AtividadeCategoriaId)}
                    className="w-full text-xs h-9 rounded-md border border-input bg-white px-3 py-1 text-gray-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {CATEGORIAS_ATIVIDADES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-12 space-y-1">
                  <Label htmlFor="desc-tipo" className="text-xs font-medium text-gray-700">
                    Descrição / Instrução (opcional)
                  </Label>
                  <Input
                    id="desc-tipo"
                    placeholder="Orientações breves para a equipe ao agendar essa atividade"
                    value={novaDescricao}
                    onChange={(e) => setNovaDescricao(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>
              </div>

              {formError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded-md">
                  {formError}
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !novoNome.trim()}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs gap-1.5 h-8 px-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Adicionar Atividade
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Abas das 3 Categorias */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                Atividades por Categoria
              </h4>
              <span className="text-xs text-gray-400">
                {padroesDaCategoria.length + customizadosDaCategoria.length} tipos cadastrados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-b border-gray-200 pb-3">
              {CATEGORIAS_ATIVIDADES.map((cat) => {
                const isActive = activeCategoryTab === cat.id
                const customCount = tiposAtividadesCustom.filter(
                  (t) => t.categoria === cat.id,
                ).length
                const IconComponent =
                  cat.id === 'comercial'
                    ? Briefcase
                    : cat.id === 'manutencao'
                      ? Wrench
                      : FileSpreadsheet

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryTab(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-all text-xs font-medium border ${
                      isActive
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent
                      className={`h-4 w-4 shrink-0 ${
                        isActive ? 'text-amber-600' : 'text-gray-400'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-semibold">{cat.nome}</div>
                      <div className="text-[10px] text-gray-400">
                        {customCount > 0 ? `+${customCount} personalizadas` : 'Padrão Delfos'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista de Atividades da Categoria Selecionada */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50/60 border border-blue-100 p-2.5 rounded-lg">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                Exibindo tipos de <strong>{currentCategoryDef?.nome}</strong>. Tipos padrão são
                mantidos pelo sistema para integridade dos relatórios e não podem ser apagados.
              </span>
            </div>

            {/* Tipos Personalizados da Categoria */}
            {customizadosDaCategoria.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-amber-600" />
                  Personalizadas ({customizadosDaCategoria.length})
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {customizadosDaCategoria.map((custom) => (
                    <div
                      key={custom.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/30 hover:bg-amber-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 truncate">
                              {custom.nome}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] py-0 h-4 bg-amber-100 text-amber-800 border-amber-300"
                            >
                              Personalizada
                            </Badge>
                          </div>
                          {custom.descricao && (
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {custom.descricao}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === custom.id}
                        onClick={() => handleExcluir(custom.id, custom.nome)}
                        className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                        title="Apagar tipo de atividade personalizado"
                      >
                        {deletingId === custom.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tipos Padrão do Sistema */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-gray-400" />
                Padrão do Sistema ({padroesDaCategoria.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {padroesDaCategoria.map((tipo) => {
                  const Icon = tipo.icon
                  return (
                    <div
                      key={tipo.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-1.5 rounded-md shrink-0 ${tipo.iconBg || 'bg-gray-100 text-gray-700'}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-medium text-gray-900 block truncate">
                            {tipo.tituloPadrao}
                          </span>
                          <span className="text-[10px] text-gray-400 block truncate">
                            {tipo.descricaoAjuda}
                          </span>
                        </div>
                      </div>

                      <div
                        className="p-1 text-gray-300"
                        title="Atividade padrão protegida do sistema"
                      >
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Delfos Solar CRM • Configuração de Atividades
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

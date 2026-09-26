import React, { useState, useEffect, useRef } from 'react'
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
import { CATEGORIAS_ATIVIDADES, type TipoAtividadeDef } from '@/constants/atividadesTipos'
import { toast } from 'sonner'
import { useClientes } from '@/contexts/ClientesContext'
import type {
  AtividadeCategoriaId,
  CatalogoTipoExecucao,
  TipoAtividadeCustomItem,
} from '@/types/crm'
import {
  Loader2,
  CheckCircle2,
  Users,
  Building2,
  DollarSign,
  Calendar,
  Upload,
  FileCheck,
  X,
  Palette,
  PhoneCall,
  Clock,
  Hammer,
  Droplets,
  Gauge,
  UserPlus,
  Wifi,
  ShieldCheck,
  BarChart3,
  RotateCcw,
  FileText,
  ArrowRightLeft,
  Wrench,
  UserCheck,
  Sparkles,
  Zap,
  Settings,
  Cpu,
  Camera,
  Layers,
  Briefcase,
  FileSpreadsheet,
} from 'lucide-react'

// Ícones disponíveis para seleção no tipo de atividade
export const ICONES_DISPONIVEIS: Array<{
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'Wrench', label: 'Chave', icon: Wrench },
  { id: 'Settings', label: 'Engrenagem', icon: Settings },
  { id: 'Hammer', label: 'Martelo', icon: Hammer },
  { id: 'Droplets', label: 'Limpeza / Água', icon: Droplets },
  { id: 'Zap', label: 'Eletricidade', icon: Zap },
  { id: 'ShieldCheck', label: 'Escudo / Garantia', icon: ShieldCheck },
  { id: 'Wifi', label: 'Datalogger / Wi-Fi', icon: Wifi },
  { id: 'Cpu', label: 'Inversor / Placa', icon: Cpu },
  { id: 'Camera', label: 'Drone / Imagem', icon: Camera },
  { id: 'PhoneCall', label: 'Telefone', icon: PhoneCall },
  { id: 'Users', label: 'Equipe / Reunião', icon: Users },
  { id: 'Clock', label: 'Relógio / Follow-up', icon: Clock },
  { id: 'UserPlus', label: 'Novo Contato / Indicação', icon: UserPlus },
  { id: 'UserCheck', label: 'Titularidade / Usuário', icon: UserCheck },
  { id: 'Gauge', label: 'Medidor / Leitura', icon: Gauge },
  { id: 'BarChart3', label: 'Gráfico / Solarview', icon: BarChart3 },
  { id: 'FileText', label: 'Documento / Anexo', icon: FileText },
  { id: 'ArrowRightLeft', label: 'Transferência', icon: ArrowRightLeft },
  { id: 'RotateCcw', label: 'Reativação', icon: RotateCcw },
  { id: 'Briefcase', label: 'Comercial', icon: Briefcase },
  { id: 'FileSpreadsheet', label: 'Planilha / RGE', icon: FileSpreadsheet },
  { id: 'Layers', label: 'Camadas', icon: Layers },
  { id: 'Sparkles', label: 'Especial / Personalizado', icon: Sparkles },
]

export const CORES_PALETA = [
  { hex: '#16A34A', nome: 'Verde Esmeralda' },
  { hex: '#059669', nome: 'Verde Escuro' },
  { hex: '#15803D', nome: 'Verde Floresta' },
  { hex: '#0284C7', nome: 'Azul Céu' },
  { hex: '#2563EB', nome: 'Azul Delfos' },
  { hex: '#4F46E5', nome: 'Índigo' },
  { hex: '#7C3AED', nome: 'Roxo' },
  { hex: '#8B5CF6', nome: 'Violeta' },
  { hex: '#D97706', nome: 'Âmbar / Laranja' },
  { hex: '#EA580C', nome: 'Laranja Vivo' },
  { hex: '#DC2626', nome: 'Vermelho' },
  { hex: '#475569', nome: 'Cinza Ardósia' },
]

export interface AtividadeParaEdicao {
  // Se for um item de tipos_atividades_custom existente
  customItem?: TipoAtividadeCustomItem
  // Se for uma atividade padrão de ATIVIDADES_PADRAO
  padraoDef?: TipoAtividadeDef
}

interface ModalEditarTipoAtividadeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atividadeParaEditar?: TipoAtividadeCustomItem | null
  padraoParaEditar?: TipoAtividadeDef | null
  tipoItem?: TipoAtividadeCustomItem | TipoAtividadeDef | null
  onSuccess?: () => void
}

export const ModalEditarTipoAtividade: React.FC<ModalEditarTipoAtividadeProps> = ({
  open,
  onOpenChange,
  atividadeParaEditar: atividadeParaEditarProp,
  padraoParaEditar: padraoParaEditarProp,
  tipoItem,
  onSuccess,
}) => {
  // Unifica suporte a tipoItem ou atividadeParaEditar/padraoParaEditar
  const atividadeParaEditar =
    atividadeParaEditarProp ||
    (tipoItem && 'id' in tipoItem && !('tituloPadrao' in tipoItem)
      ? (tipoItem as TipoAtividadeCustomItem)
      : null)
  const padraoParaEditar =
    padraoParaEditarProp ||
    (tipoItem && 'tituloPadrao' in tipoItem ? (tipoItem as TipoAtividadeDef) : null)
  const { updateTipoAtividadeCustom, addTipoAtividadeCustom, refreshTiposAtividadesCustom } =
    useClientes()

  const [nome, setNome] = useState('')
  const [categoria, setCategoria] = useState<AtividadeCategoriaId>('comercial')
  const [cor, setCor] = useState('#16A34A')
  const [icone, setIcone] = useState('Wrench')
  const [descricao, setDescricao] = useState('')
  const [valorBase, setValorBase] = useState('')
  const [frequenciaMeses, setFrequenciaMeses] = useState('0')
  const [tipoExecucao, setTipoExecucao] = useState<CatalogoTipoExecucao>('equipe_interna')
  const [orientacoesTecnicas, setOrientacoesTecnicas] = useState('')
  const [linksUteis, setLinksUteis] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string>('')
  const [ativo, setAtivo] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isPadraoOriginal = Boolean(padraoParaEditar) || Boolean(atividadeParaEditar?.is_padrao)

  // Ao abrir o modal, preencher os campos com os valores atuais da atividade
  useEffect(() => {
    if (!open) return

    setFormError(null)
    setFormSuccess(false)
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (atividadeParaEditar) {
      setNome(atividadeParaEditar.nome || '')
      setCategoria(atividadeParaEditar.categoria || 'comercial')
      setCor(atividadeParaEditar.cor || '#16A34A')
      setIcone(atividadeParaEditar.icone || 'Wrench')
      setDescricao(atividadeParaEditar.descricao || '')
      setValorBase(
        atividadeParaEditar.valor_base !== undefined && atividadeParaEditar.valor_base !== null
          ? String(atividadeParaEditar.valor_base)
          : '',
      )
      setFrequenciaMeses(
        atividadeParaEditar.frequencia_meses !== undefined &&
          atividadeParaEditar.frequencia_meses !== null
          ? String(atividadeParaEditar.frequencia_meses)
          : '0',
      )
      setTipoExecucao(atividadeParaEditar.tipo_execucao || 'equipe_interna')
      setOrientacoesTecnicas(atividadeParaEditar.orientacoes_tecnicas || '')
      setLinksUteis(atividadeParaEditar.links_uteis || '')
      setSelectedFileName(atividadeParaEditar.documento_modelo || '')
      setAtivo(atividadeParaEditar.ativo !== false)
    } else if (padraoParaEditar) {
      setNome(padraoParaEditar.tituloPadrao || '')
      setCategoria(padraoParaEditar.categoria || 'comercial')
      setCor(padraoParaEditar.corHex || '#16A34A')
      // Mapear o ícone pelo nome ou fallback
      const foundIcon = ICONES_DISPONIVEIS.find((i) => i.icon === padraoParaEditar.icon)
      setIcone(foundIcon ? foundIcon.id : 'Wrench')
      setDescricao(padraoParaEditar.descricaoAjuda || '')
      setValorBase('')
      setFrequenciaMeses('0')
      setTipoExecucao('equipe_interna')
      setOrientacoesTecnicas('')
      setLinksUteis('')
      setSelectedFileName('')
      setAtivo(true)
    } else {
      // Modo criação / fallback
      setNome('')
      setCategoria('comercial')
      setCor('#16A34A')
      setIcone('Wrench')
      setDescricao('')
      setValorBase('')
      setFrequenciaMeses('0')
      setTipoExecucao('equipe_interna')
      setOrientacoesTecnicas('')
      setLinksUteis('')
      setSelectedFileName('')
      setAtivo(true)
    }
  }, [open, atividadeParaEditar, padraoParaEditar])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!nome.trim()) {
      setFormError('Por favor, informe o nome do tipo de atividade.')
      return
    }

    const numValor = valorBase.trim() ? parseFloat(valorBase.replace(',', '.')) : 0
    if (isNaN(numValor) || numValor < 0) {
      setFormError('Informe um valor base de referência válido (R$).')
      return
    }

    const numFreq = frequenciaMeses.trim() ? parseInt(frequenciaMeses, 10) : 0
    if (isNaN(numFreq) || numFreq < 0) {
      setFormError('Informe uma frequência válida em meses (ou 0 para sob demanda).')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    try {
      const payload: any = {
        nome: nome.trim(),
        categoria,
        cor,
        icone,
        descricao: descricao.trim() || undefined,
        valor_base: numValor,
        frequencia_meses: numFreq,
        tipo_execucao: tipoExecucao,
        orientacoes_tecnicas: orientacoesTecnicas.trim() || undefined,
        links_uteis: linksUteis.trim() || undefined,
        ativo,
      }

      if (selectedFile) {
        payload.documento_modelo = selectedFile
      }

      if (atividadeParaEditar?.id) {
        // Registro existente em tipos_atividades_custom (padrão ou personalizada)
        await updateTipoAtividadeCustom(atividadeParaEditar.id, payload)
      } else {
        // Se estiver editando uma atividade padrão fixa do código que ainda não tinha registro em tipos_atividades_custom,
        // criamos como is_padrao: true para que ela passe a ser gerenciada no backend
        await addTipoAtividadeCustom({
          ...payload,
          is_padrao: isPadraoOriginal,
        })
      }

      await refreshTiposAtividadesCustom()
      setFormSuccess(true)
      toast.success('Tipo de atividade atualizado')

      if (onSuccess) {
        onSuccess()
      }

      setTimeout(() => {
        setFormSuccess(false)
        onOpenChange(false)
      }, 700)
    } catch (err: unknown) {
      console.error('Erro ao salvar tipo de atividade:', err)
      const errorMsg =
        err instanceof Error ? err.message : 'Falha ao salvar as alterações do tipo de atividade.'
      setFormError(errorMsg)
      toast.error('Erro ao atualizar tipo de atividade', {
        description: errorMsg,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const tituloModal =
    atividadeParaEditar || padraoParaEditar ? 'Editar Tipo de Atividade' : 'Novo Tipo de Atividade'

  const SelectedIconComponent = ICONES_DISPONIVEIS.find((i) => i.id === icone)?.icon || Wrench

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-slate-50 via-white to-amber-50/40">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl border shadow-xs"
              style={{
                backgroundColor: `${cor}15`,
                color: cor,
                borderColor: `${cor}40`,
              }}
            >
              <SelectedIconComponent className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">{tituloModal}</DialogTitle>
              <DialogDescription className="text-xs text-gray-500 mt-0.5">
                {isPadraoOriginal
                  ? 'Personalize o nome, categoria, orientações e parâmetros operacionais desta atividade padrão do sistema.'
                  : 'Configure nome, categoria, orientações técnicas e parâmetros do catálogo.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Nome da Atividade */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-nome" className="text-xs font-semibold text-gray-700">
              Nome da Atividade *
            </Label>
            <Input
              id="edit-nome"
              placeholder="Ex: Auditoria de Fatura, Vistoria Técnica In Loco..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="text-xs sm:text-sm bg-white font-medium"
              required
            />
          </div>

          {/* Categoria e Tipo de Execução */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="edit-categoria" className="text-xs font-semibold text-gray-700">
                Categoria *
              </Label>
              <select
                id="edit-categoria"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as AtividadeCategoriaId)}
                className="w-full text-xs sm:text-sm h-9 rounded-md border border-input bg-white px-3 py-1 text-gray-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                {CATEGORIAS_ATIVIDADES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Tipo de Execução</Label>
              <select
                value={tipoExecucao}
                onChange={(e) => setTipoExecucao(e.target.value as CatalogoTipoExecucao)}
                className="w-full text-xs sm:text-sm h-9 rounded-md border border-input bg-white px-3 py-1 text-gray-900 shadow-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              >
                <option value="equipe_interna">Equipe Interna (Delfos)</option>
                <option value="fornecedor_externo">Fornecedor Externo / Terceiro</option>
              </select>
            </div>
          </div>

          {/* Ícone e Cor */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            {/* Escolha do Ícone */}
            <div className="sm:col-span-7 space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <span style={{ color: cor }}>
                  <SelectedIconComponent className="w-3.5 h-3.5" />
                </span>
                Ícone Lucide
              </Label>
              <div className="grid grid-cols-8 sm:grid-cols-7 gap-1 max-h-28 overflow-y-auto p-1 bg-white rounded-lg border border-gray-200">
                {ICONES_DISPONIVEIS.map((item) => {
                  const Icon = item.icon
                  const isSelected = icone === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIcone(item.id)}
                      title={item.label}
                      className={`p-1.5 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600'
                          : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Escolha da Cor */}
            <div className="sm:col-span-5 space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                Cor de Identificação
              </Label>
              <div className="grid grid-cols-4 gap-1.5 p-1 bg-white rounded-lg border border-gray-200">
                {CORES_PALETA.map((c) => {
                  const isSelected = cor.toLowerCase() === c.hex.toLowerCase()
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setCor(c.hex)}
                      title={c.nome}
                      className={`h-6 rounded-md transition-all flex items-center justify-center ${
                        isSelected
                          ? 'ring-2 ring-offset-1 ring-gray-900 scale-105'
                          : 'hover:scale-95'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Valor Base e Frequência Recomendada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-valor"
                className="text-xs font-semibold text-gray-700 flex items-center gap-1"
              >
                <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                Valor Base Sugerido (R$)
              </Label>
              <Input
                id="edit-valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 450,00"
                value={valorBase}
                onChange={(e) => setValorBase(e.target.value)}
                className="text-xs sm:text-sm bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="edit-freq"
                className="text-xs font-semibold text-gray-700 flex items-center gap-1"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                Frequência Recomendada (meses)
              </Label>
              <Input
                id="edit-freq"
                type="number"
                min="0"
                placeholder="0 = sob demanda, 6 = semestral, 12 = anual"
                value={frequenciaMeses}
                onChange={(e) => setFrequenciaMeses(e.target.value)}
                className="text-xs sm:text-sm bg-white"
              />
            </div>
          </div>

          {/* Descrição / Instrução Breve */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-desc" className="text-xs font-semibold text-gray-700">
              Descrição / Instrução Breve
            </Label>
            <Input
              id="edit-desc"
              placeholder="Resumo exibido na lista e nos cards do CRM..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="text-xs sm:text-sm bg-white"
            />
          </div>

          {/* Orientações Técnicas */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-orientacoes" className="text-xs font-semibold text-gray-700">
              Orientações Técnicas de Execução
            </Label>
            <Textarea
              id="edit-orientacoes"
              rows={3}
              placeholder="Procedimentos técnicos, EPIs obrigatórios, cuidados com choque térmico, conferência de torques..."
              value={orientacoesTecnicas}
              onChange={(e) => setOrientacoesTecnicas(e.target.value)}
              className="text-xs bg-white resize-none"
            />
          </div>

          {/* Links Úteis */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-links" className="text-xs font-semibold text-gray-700">
              Links Úteis (Normas, Manuais, Portais de RMA)
            </Label>
            <Textarea
              id="edit-links"
              rows={2}
              placeholder="URLs úteis para a equipe (separadas por linha ou espaço)..."
              value={linksUteis}
              onChange={(e) => setLinksUteis(e.target.value)}
              className="text-xs bg-white resize-none"
            />
          </div>

          {/* Documento Modelo (Anexo) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-amber-600" />
              Documento Modelo (Checklist, Manual ou Termo em PDF/Doc)
            </Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) {
                    if (f.size > 10 * 1024 * 1024) {
                      setFormError('Arquivo excede o limite de 10MB.')
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
                className="gap-2 text-xs bg-white"
              >
                <Upload className="w-3.5 h-3.5" />
                {selectedFileName ? 'Substituir arquivo' : 'Selecionar arquivo...'}
              </Button>

              {selectedFileName && (
                <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                  <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate max-w-[220px]">{selectedFileName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setSelectedFileName('')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Remover anexo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Ativo no Sistema */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-ativo-check"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <label
              htmlFor="edit-ativo-check"
              className="text-xs font-semibold text-gray-700 cursor-pointer"
            >
              Atividade ativa no sistema (disponível para novas ofertas e agendamentos)
            </label>
          </div>

          {formError && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2.5 rounded-lg">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Atividade atualizada com sucesso!</span>
            </div>
          )}
        </form>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-gray-50 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !nome.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-2 h-9 px-5 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Salvando alterações...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Salvar Alterações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

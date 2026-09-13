import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { OSTipoServico, OSTemplate } from '@/types/crm'
import { saveOSTemplate } from '@/services/crmService'
import { useToast } from '@/hooks/use-toast'
import { FileText, Save, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react'

interface ModalTemplatesOSProps {
  isOpen: boolean
  onClose: () => void
  templates: OSTemplate[]
  onTemplateSaved: (updatedTemplate: OSTemplate) => void
}

const SERVICOS_TEMPLATES: { tipo: OSTipoServico; desc: string; iconColor: string }[] = [
  {
    tipo: 'Limpeza',
    desc: 'Instruções para lavagem técnica e desmineralizada',
    iconColor: 'text-sky-600 bg-sky-50 border-sky-200',
  },
  {
    tipo: 'Manutenção',
    desc: 'Revisão elétrica, termografia, aperto e aterramento',
    iconColor: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  {
    tipo: 'Instalação',
    desc: 'Montagem de estrutura, módulos e conexão de inversor',
    iconColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    tipo: 'Garantia',
    desc: 'Laudo de falhas, números de série e acionamento de fabricante',
    iconColor: 'text-rose-600 bg-rose-50 border-rose-200',
  },
  {
    tipo: 'Configuração de Datalogger',
    desc: 'Pareamento Wi-Fi, cadastro de portal e monitoramento',
    iconColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  },
]

export const ModalTemplatesOS: React.FC<ModalTemplatesOSProps> = ({
  isOpen,
  onClose,
  templates,
  onTemplateSaved,
}) => {
  const { toast } = useToast()
  const [selectedTipo, setSelectedTipo] = useState<OSTipoServico>('Limpeza')
  const [editingText, setEditingText] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Ao abrir ou trocar o tipo selecionado, preenche o textarea com o template correspondente
  React.useEffect(() => {
    const tmpl = templates.find((t) => t.tipo_servico === selectedTipo)
    setEditingText(tmpl?.instrucoes || '')
  }, [selectedTipo, templates, isOpen])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const saved = await saveOSTemplate(selectedTipo, editingText)
      onTemplateSaved(saved)
      toast({
        title: 'Template salvo com sucesso!',
        description: `As instruções para ${selectedTipo} foram atualizadas no banco de dados.`,
      })
    } catch (err) {
      console.error('Erro ao salvar template:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar template',
        description: 'Verifique a conexão com o servidor e tente novamente.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] p-4 sm:p-6 max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
                Templates de Instruções de OS
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-gray-500">
                Configure os passos e procedimentos padrão por tipo de serviço. Eles serão
                carregados automaticamente na execução da OS.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Seleção de Tipo de Serviço (Tabs mobile-friendly com scroll horizontal) */}
        <div className="py-3">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 block">
            Selecione o Tipo de Serviço:
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SERVICOS_TEMPLATES.map((item) => {
              const isSelected = selectedTipo === item.tipo
              const exists = templates.some(
                (t) => t.tipo_servico === item.tipo && t.instrucoes?.trim(),
              )
              return (
                <button
                  key={item.tipo}
                  type="button"
                  onClick={() => setSelectedTipo(item.tipo)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold shrink-0 transition-all flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                  }`}
                >
                  <span>{item.tipo}</span>
                  {exists && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-emerald-500'
                      }`}
                      title="Template configurado"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Editor de Texto do Template */}
        <div className="flex-1 flex flex-col gap-2 min-h-[220px]">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>
                Passo a passo para: <strong className="text-gray-900">{selectedTipo}</strong>
              </span>
            </div>
            <span className="text-[11px] text-gray-400">{editingText.length} caracteres</span>
          </div>

          <Textarea
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            placeholder={`Descreva detalhadamente o passo a passo para execução de ${selectedTipo}...\nEx: 1. Inspeção inicial\n2. Desligar disjuntor\n3. Procedimento técnico...`}
            className="flex-1 min-h-[220px] font-mono text-xs sm:text-sm bg-gray-50/70 border-gray-200 rounded-xl focus:bg-white resize-none leading-relaxed p-3.5"
          />

          <div className="flex items-center gap-2 text-[11px] text-gray-500 bg-amber-50/60 border border-amber-200/60 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Ao salvar, este modelo ficará disponível para qualquer ordem de serviço do tipo{' '}
              <strong>{selectedTipo}</strong>.
            </span>
          </div>
        </div>

        {/* Rodapé com Ações */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl h-11 px-4 text-xs sm:text-sm"
          >
            Fechar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#166534] hover:bg-[#14532d] text-white font-bold rounded-xl h-11 px-6 shadow-sm flex items-center gap-2 text-xs sm:text-sm"
          >
            {isSaving ? (
              <>Salvando no banco...</>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar Modelo de {selectedTipo}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

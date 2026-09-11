import React, { useState } from 'react'
import {
  X,
  Plus,
  FileText,
  Edit2,
  Trash2,
  Check,
  AlertCircle,
  Sparkles,
  Key,
  Globe,
  Phone,
  Info,
  ShieldCheck,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import type { WhatsAppTemplate } from '@/types/crm'

interface ModalGerenciarWhatsAppTemplatesProps {
  isOpen: boolean
  onClose: () => void
}

export const ModalGerenciarWhatsAppTemplates: React.FC<ModalGerenciarWhatsAppTemplatesProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    whatsAppTemplates,
    whatsAppConfig,
    addWhatsAppTemplate,
    updateWhatsAppTemplate,
    removeWhatsAppTemplate,
  } = useClientes()

  const [activeTab, setActiveTab] = useState<'templates' | 'gateway'>('templates')
  const [editingTemplate, setEditingTemplate] = useState<Partial<WhatsAppTemplate> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!isOpen) return null

  const handleStartCreate = () => {
    setEditingTemplate({
      titulo: '',
      slug: '',
      tipo_gatilho: 'manual',
      conteudo: '',
      ativo: true,
    })
    setFeedback(null)
  }

  const handleStartEdit = (tpl: WhatsAppTemplate) => {
    setEditingTemplate({ ...tpl })
    setFeedback(null)
  }

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTemplate || !editingTemplate.titulo || !editingTemplate.conteudo) {
      alert('Preencha título e conteúdo do template.')
      return
    }

    setIsSaving(true)
    try {
      const slugVal =
        editingTemplate.slug ||
        editingTemplate
          .titulo!.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')

      if (editingTemplate.id) {
        await updateWhatsAppTemplate(editingTemplate.id, {
          titulo: editingTemplate.titulo,
          slug: slugVal,
          tipo_gatilho: editingTemplate.tipo_gatilho,
          conteudo: editingTemplate.conteudo,
          ativo: editingTemplate.ativo !== false,
        })
        setFeedback('Template atualizado com sucesso!')
      } else {
        await addWhatsAppTemplate({
          titulo: editingTemplate.titulo,
          slug: slugVal,
          tipo_gatilho: editingTemplate.tipo_gatilho || 'manual',
          conteudo: editingTemplate.conteudo,
          ativo: true,
        })
        setFeedback('Novo template criado com sucesso!')
      }
      setEditingTemplate(null)
    } catch (err) {
      console.error('Erro ao salvar template:', err)
      alert('Erro ao salvar template.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteTemplate = async (id: string, titulo: string) => {
    if (confirm(`Tem certeza que deseja excluir o template "${titulo}"?`)) {
      try {
        await removeWhatsAppTemplate(id)
      } catch (err) {
        console.error('Erro ao deletar:', err)
        alert('Falha ao excluir template.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative z-50 w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileText className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Modelos de Mensagens & Integração WhatsApp
              </h2>
              <p className="text-xs text-gray-500">
                Personalize templates prontos com variáveis e consulte as credenciais do gateway.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de navegação dentro do modal */}
        <div className="px-5 pt-2 border-b border-gray-200 flex items-center gap-2 bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-xs font-bold border-b-2 rounded-t-md transition-colors ${
              activeTab === 'templates'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Templates de Mensagens ({whatsAppTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`px-4 py-2 text-xs font-bold border-b-2 rounded-t-md transition-colors ${
              activeTab === 'gateway'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            Configuração do Gateway & Secrets
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{feedback}</span>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              {/* Botão Novo Template */}
              {!editingTemplate && (
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs text-gray-500">
                    Modelos prontos disponíveis para seleção no envio manual e disparos automáticos.
                  </span>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Template</span>
                  </button>
                </div>
              )}

              {/* Formulário de Criação / Edição */}
              {editingTemplate && (
                <form
                  onSubmit={handleSaveTemplate}
                  className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                      {editingTemplate.id
                        ? 'Editar Template de Mensagem'
                        : 'Novo Template de Mensagem'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Título do Template <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={editingTemplate.titulo || ''}
                        onChange={(e) =>
                          setEditingTemplate((prev) => ({ ...prev, titulo: e.target.value }))
                        }
                        placeholder="Ex: Confirmação de Visita Técnica"
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Gatilho Automático
                      </label>
                      <select
                        value={editingTemplate.tipo_gatilho || 'manual'}
                        onChange={(e) =>
                          setEditingTemplate((prev) => ({ ...prev, tipo_gatilho: e.target.value }))
                        }
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                      >
                        <option value="manual">Manual (Sem disparo automático)</option>
                        <option value="proposta_aprovada">
                          Disparo: Status da Proposta = 'Aprovada'
                        </option>
                        <option value="lembrete_visita">
                          Disparo: Visita Técnica agendada para o dia seguinte
                        </option>
                        <option value="followup_posvenda">
                          Disparo: Instalação concluída há mais de 7 dias
                        </option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-700">
                        Conteúdo da Mensagem <span className="text-red-500">*</span>
                      </label>
                      <div className="text-[11px] text-gray-500">
                        Variáveis: <code>{'{{nome_cliente}}'}</code>, <code>{'{{data}}'}</code>,{' '}
                        <code>{'{{valor_proposta}}'}</code>, <code>{'{{endereco}}'}</code>
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      required
                      value={editingTemplate.conteudo || ''}
                      onChange={(e) =>
                        setEditingTemplate((prev) => ({ ...prev, conteudo: e.target.value }))
                      }
                      placeholder="Olá, {{nome_cliente}}! Sua proposta de {{valor_proposta}} foi confirmada..."
                      className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingTemplate(null)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 rounded-lg"
                    >
                      Descartar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                    >
                      {isSaving ? 'Salvando...' : 'Salvar Template'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista dos Templates Existentes */}
              <div className="space-y-3">
                {whatsAppTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 transition-all shadow-2xs space-y-2"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{tpl.titulo}</span>
                        {tpl.tipo_gatilho && tpl.tipo_gatilho !== 'manual' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {tpl.tipo_gatilho === 'proposta_aprovada'
                              ? 'Gatilho: Proposta Aprovada'
                              : tpl.tipo_gatilho === 'lembrete_visita'
                                ? 'Gatilho: Lembrete de Visita (+24h)'
                                : tpl.tipo_gatilho === 'followup_posvenda'
                                  ? 'Gatilho: Pós-Venda (+7 dias)'
                                  : tpl.tipo_gatilho}
                          </span>
                        )}
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          slug: {tpl.slug}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tpl)}
                          className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Editar template"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tpl.id, tpl.titulo)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-700 bg-gray-50/80 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap leading-relaxed">
                      {tpl.conteudo}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'gateway' && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Configuração Segura via Secrets do Backend</span>
                </div>
                <p className="leading-relaxed">
                  Conforme as diretrizes de segurança, nenhuma credencial sensível fica gravada no
                  código. Os disparos via HTTP são realizados diretamente pelo servidor Skip Cloud /
                  PocketBase, que consulta os valores abaixo armazenados em variáveis de ambiente
                  (Secrets):
                </p>
              </div>

              {/* Tabela de Secrets */}
              <div className="rounded-xl border border-gray-200 overflow-hidden text-xs">
                <div className="bg-gray-50 p-3 border-b border-gray-200 font-bold text-gray-700 uppercase tracking-wider text-[11px]">
                  Variáveis de Ambiente / Secrets
                </div>
                <div className="divide-y divide-gray-100 bg-white">
                  {/* WHATSAPP_API_URL */}
                  <div className="p-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono font-bold text-gray-900">WHATSAPP_API_URL</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          Obrigatório
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px]">
                        URL do endpoint da API de gateway de WhatsApp (ex.: Evolution API, Z-API,
                        Baileys HTTP, WppConnect).
                      </p>
                    </div>
                    <div className="text-right">
                      {whatsAppConfig?.hasApiUrl ? (
                        <span className="text-emerald-700 font-bold font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {whatsAppConfig.apiUrlPreview}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Não preenchido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* WHATSAPP_API_KEY */}
                  <div className="p-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Key className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono font-bold text-gray-900">WHATSAPP_API_KEY</span>
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.2 rounded">
                          Token / Bearer
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px]">
                        Chave de API / Token Bearer para autenticação no gateway.
                      </p>
                    </div>
                    <div className="text-right">
                      {whatsAppConfig?.hasApiKey ? (
                        <span className="text-emerald-700 font-bold font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {whatsAppConfig.apiKeyMasked}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Não preenchido
                        </span>
                      )}
                    </div>
                  </div>

                  {/* WHATSAPP_ORIGIN_NUMBER */}
                  <div className="p-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono font-bold text-gray-900">
                          WHATSAPP_ORIGIN_NUMBER
                        </span>
                        <span className="text-[10px] bg-gray-100 text-gray-700 font-bold px-1.5 py-0.2 rounded">
                          Opcional
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px]">
                        Número remetente / ID da sessão de origem da empresa Delfos Solar.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-700 font-mono text-[11px] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {whatsAppConfig?.originNumber || 'Padrão da sessão'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card explicativo de funcionamento dos disparos automáticos */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
                <div className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Regras de Disparo Automático Ativas no CRM</span>
                </div>
                <ul className="space-y-2 text-gray-600 list-disc list-inside">
                  <li>
                    <strong>Proposta Aprovada:</strong> Ao alterar o status de um orçamento solar
                    para <span className="text-emerald-700 font-semibold">"Aprovado"</span>, o hook
                    de backend dispara automaticamente o modelo de Confirmação de Proposta para o
                    WhatsApp do cliente.
                  </li>
                  <li>
                    <strong>Lembrete de Visita Técnica:</strong> O worker do cronAdd checa a cada 2
                    minutos atividades do tipo visita técnica marcadas para o dia seguinte e envia o
                    lembrete (com controle de idempotência para não reenviar).
                  </li>
                  <li>
                    <strong>Follow-up Pós-Venda:</strong> Clientes com sistema instalado há mais de
                    7 dias recebem o template de pós-venda automaticamente.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

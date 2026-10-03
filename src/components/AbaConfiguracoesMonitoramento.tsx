import React, { useState } from 'react'
import {
  FileText,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  Search,
  X,
  Sparkles,
  Link as LinkIcon,
  Video,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Settings,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ConfiguracaoMonitoramento } from '@/types/equipamentos'
import {
  deleteConfiguracaoMonitoramento,
  getPdfConfiguracaoMonitoramentoUrl,
} from '@/services/configuracoesMonitoramentoService'
import { ModalFormConfiguracaoMonitoramento } from './ModalFormConfiguracaoMonitoramento'

interface AbaConfiguracoesMonitoramentoProps {
  configuracoes: ConfiguracaoMonitoramento[]
  loading?: boolean
  onRecarregar: () => Promise<void>
}

export function AbaConfiguracoesMonitoramento({
  configuracoes,
  loading = false,
  onRecarregar,
}: AbaConfiguracoesMonitoramentoProps) {
  const [busca, setBusca] = useState<string>('')
  const [modalOpen, setModalOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<ConfiguracaoMonitoramento | null>(null)
  const [itemParaExcluir, setItemParaExcluir] = useState<ConfiguracaoMonitoramento | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const handleOpenCreate = () => {
    setEditingItem(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (item: ConfiguracaoMonitoramento) => {
    setEditingItem(item)
    setModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!itemParaExcluir) return
    try {
      setIsDeleting(true)
      await deleteConfiguracaoMonitoramento(itemParaExcluir.id)
      toast.success(`Configuração da marca "${itemParaExcluir.marca}" removida com sucesso.`)
      setItemParaExcluir(null)
      await onRecarregar()
    } catch (err) {
      console.error('Erro ao excluir configuração de monitoramento:', err)
      toast.error('Não foi possível remover a configuração.')
    } finally {
      setIsDeleting(false)
    }
  }

  const filtrados = configuracoes.filter((cfg) => {
    if (!busca.trim()) return true
    const term = busca.toLowerCase().trim()
    return (
      cfg.marca?.toLowerCase().includes(term) ||
      cfg.titulo?.toLowerCase().includes(term) ||
      cfg.instrucoes?.toLowerCase().includes(term)
    )
  })

  return (
    <div className="space-y-4">
      {/* Topo / Barra de Ações */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar configuração por marca de inversor..."
            className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Configuração</span>
          </button>
        </div>
      </div>

      {/* Lista de Configurações */}
      {loading ? (
        <div className="py-16 text-center">
          <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-500">Carregando configurações de monitoramento...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-100">
            <Settings className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-800">Nenhuma configuração encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            {busca
              ? `Nenhum procedimento encontrado para "${busca}".`
              : 'Cadastre os procedimentos de configuração de datalogger por marca de inversor (PDF ou Link).'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white text-xs font-bold rounded-xl hover:bg-[#15803D] shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Configuração</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtrados.map((item) => {
            const pdfUrl = getPdfConfiguracaoMonitoramentoUrl(item)
            const isPdf = Boolean(item.arquivo_pdf || pdfUrl)
            const isLink = Boolean(item.link_procedimento && item.link_procedimento.trim())
            const linkAcessar = isPdf ? pdfUrl : item.link_procedimento

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-2xs p-4 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Inversor {item.marca}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isPdf
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}
                    >
                      {isPdf ? (
                        <FileText className="w-3 h-3 text-emerald-700" />
                      ) : (
                        <LinkIcon className="w-3 h-3 text-blue-700" />
                      )}
                      <span>{isPdf ? 'Documento PDF' : 'Link / Vídeo'}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-gray-900 mt-2 leading-snug">
                    {item.titulo || `Configuração Datalogger - ${item.marca}`}
                  </h4>

                  {item.instrucoes && (
                    <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed line-clamp-3">
                      {item.instrucoes}
                    </p>
                  )}

                  {/* Anexo Clicável */}
                  {linkAcessar && (
                    <div className="mt-3">
                      <a
                        href={linkAcessar}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-2xs ${
                          isPdf
                            ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                        title={
                          isPdf
                            ? 'Visualizar / Baixar PDF do passo a passo'
                            : `Abrir link: ${linkAcessar}`
                        }
                      >
                        {isPdf ? (
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
                        )}
                        <span>
                          {isPdf ? 'Abrir PDF do Passo a Passo' : 'Acessar Link do Procedimento'}
                        </span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-3 mt-4 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-gray-400">
                    {item.ativo !== false ? (
                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Sugestão ativa
                      </span>
                    ) : (
                      <span className="text-gray-400">Inativo</span>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-gray-200"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemParaExcluir(item)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir configuração"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar */}
      <ModalFormConfiguracaoMonitoramento
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editingItem}
        onSalvo={async () => {
          await onRecarregar()
        }}
      />

      {/* Modal de Confirmação de Exclusão */}
      {itemParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-[2px] animate-in fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-gray-900">
                Excluir Configuração de Monitoramento?
              </h3>
              <p className="text-xs text-gray-600">
                Tem certeza que deseja remover o procedimento da marca{' '}
                <strong className="text-gray-900">{itemParaExcluir.marca}</strong>?
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setItemParaExcluir(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 border border-gray-300 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AbaConfiguracoesMonitoramento

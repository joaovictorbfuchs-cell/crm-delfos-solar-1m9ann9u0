import React from 'react'
import {
  AlertTriangle,
  GitMerge,
  ArrowRight,
  Phone,
  User,
  Building,
  CheckCircle2,
  X,
  Layers,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatWhatsAppPhone } from '@/lib/formatters'
import type { ContatoCorrespondente } from '@/services/duplicidadeContatoService'

export interface ModalAvisoDuplicidadeTelefoneProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Lista de correspondências encontradas com o mesmo número
   */
  duplicados: ContatoCorrespondente[]
  /**
   * Número que gerou a duplicidade (digitado no formulário)
   */
  numeroInformado: string
  /**
   * Nome digitado no formulário atual
   */
  nomeInformado?: string
  /**
   * Tipo da ação ('criacao' ou 'edicao')
   */
  modo?: 'criacao' | 'edicao'
  /**
   * Chamado quando o usuário escolhe Mesclar com o registro selecionado
   */
  onConfirmarMesclar: (registroEscolhido: ContatoCorrespondente) => Promise<void> | void
  /**
   * Chamado quando o usuário escolhe Continuar Mesmo Assim (salvar novo / manter como separado)
   */
  onContinuarMesmoAssim: () => Promise<void> | void
  /**
   * Indicador de processamento da mesclagem
   */
  isCarregando?: boolean
}

export const ModalAvisoDuplicidadeTelefone: React.FC<ModalAvisoDuplicidadeTelefoneProps> = ({
  isOpen,
  onClose,
  duplicados,
  numeroInformado,
  nomeInformado,
  modo = 'criacao',
  onConfirmarMesclar,
  onContinuarMesmoAssim,
  isCarregando = false,
}) => {
  const [selecionadoId, setSelecionadoId] = React.useState<string>('')

  // Pré-seleciona o primeiro registro encontrado
  React.useEffect(() => {
    if (duplicados.length > 0) {
      setSelecionadoId(duplicados[0].id)
    }
  }, [duplicados])

  const registroEscolhido = React.useMemo(() => {
    return duplicados.find((d) => d.id === selecionadoId) || duplicados[0] || null
  }, [duplicados, selecionadoId])

  if (!isOpen) return null

  const renderBadgeOrigem = (origem: ContatoCorrespondente['origem']) => {
    switch (origem) {
      case 'cliente':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            Cliente / Lead
          </span>
        )
      case 'contato_adicional':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            Contato Adicional
          </span>
        )
      case 'contato_unico':
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            Contato Centralizado
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
            Contato
          </span>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isCarregando && !open && onClose()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden border-amber-200 shadow-2xl">
        {/* Cabeçalho de Alerta Visual */}
        <div className="p-5 border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  Telefone / WhatsApp já cadastrado
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-600 mt-1 leading-relaxed">
                  O número{' '}
                  <strong className="text-gray-900 font-semibold font-mono bg-amber-100/80 px-1.5 py-0.5 rounded">
                    {formatWhatsAppPhone(numeroInformado) || numeroInformado}
                  </strong>{' '}
                  já existe em outro registro no CRM. Verifique se é a mesma pessoa antes de
                  continuar.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Corpo do Diálogo */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto text-xs">
          {/* Pergunta em destaque */}
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="font-bold text-amber-950 text-sm">É a mesma pessoa?</span>
            </div>
            <span className="text-[11px] text-amber-800 font-medium">
              Não bloqueamos seu cadastro — você decide a ação.
            </span>
          </div>

          {/* Registros Encontrados */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-700">
              Registro(s) encontrado(s) com este número ({duplicados.length}):
            </label>

            <div className="space-y-2">
              {duplicados.map((d) => {
                const isSelected =
                  registroEscolhido?.id === d.id && registroEscolhido?.origem === d.origem
                return (
                  <div
                    key={`${d.origem}_${d.id}`}
                    onClick={() => setSelecionadoId(d.id)}
                    className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                        : 'border-gray-200 bg-gray-50/60 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span className="font-bold text-sm text-gray-900 truncate">{d.nome}</span>
                          {renderBadgeOrigem(d.origem)}
                        </div>

                        {d.clienteAssociadoNome && (
                          <div className="flex items-center gap-1.5 text-gray-600 pl-5">
                            <Building className="w-3 h-3 text-gray-400 shrink-0" />
                            <span>
                              Cliente/Empresa vinculada:{' '}
                              <strong className="text-gray-800">{d.clienteAssociadoNome}</strong>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-gray-500 pl-5 pt-0.5 flex-wrap">
                          {d.telefone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" />
                              Tel: {formatWhatsAppPhone(d.telefone)}
                            </span>
                          )}
                          {d.whatsapp && (
                            <span className="flex items-center gap-1 text-emerald-700 font-medium">
                              WhatsApp: {formatWhatsAppPhone(d.whatsapp)}
                            </span>
                          )}
                          {d.email && <span className="text-gray-500">• {d.email}</span>}
                        </div>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        <input
                          type="radio"
                          name="registroDuplicado"
                          checked={isSelected}
                          onChange={() => setSelecionadoId(d.id)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Comparativo visual do que vai acontecer na mesclagem */}
          {registroEscolhido && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[11px] text-slate-700">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <GitMerge className="w-3.5 h-3.5 text-emerald-600" />
                <span>Como funciona a opção &quot;Mesclar&quot;:</span>
              </div>
              <ul className="space-y-1 list-disc list-inside text-slate-600 pl-1 leading-relaxed">
                <li>
                  Preserva os dados já cadastrados em{' '}
                  <strong className="text-slate-800">&quot;{registroEscolhido.nome}&quot;</strong>.
                </li>
                <li>Preenche campos que estiverem vazios no registro existente.</li>
                <li>
                  {modo === 'criacao'
                    ? 'Evita criar um contato duplicado — os novos dados são consolidados no registro existente.'
                    : 'Absorve e remove o contato duplicado após transferir as informações.'}
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Rodapé com as 3 opções do usuário */}
        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:justify-between items-stretch sm:items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isCarregando}
            className="text-gray-600 hover:text-gray-900 text-xs"
          >
            Cancelar edição
          </Button>

          <div className="flex items-center gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onContinuarMesmoAssim}
              disabled={isCarregando}
              className="text-xs border-gray-300 text-gray-700 hover:bg-gray-100 w-full sm:w-auto"
              title="Salvar como um registro separado, mantendo os dois contatos"
            >
              Continuar mesmo assim
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => registroEscolhido && onConfirmarMesclar(registroEscolhido)}
              disabled={isCarregando || !registroEscolhido}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs w-full sm:w-auto gap-1.5"
            >
              <GitMerge className="w-3.5 h-3.5" />
              {isCarregando ? 'Mesclando...' : 'Mesclar com registro existente'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalAvisoDuplicidadeTelefone

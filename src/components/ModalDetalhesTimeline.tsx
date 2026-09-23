import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  FileText,
  FileCheck,
  Calendar,
  User,
  Zap,
  Clock,
  Pencil,
  Check,
  X,
  ExternalLink,
  Send,
  AlertCircle,
  FileEdit,
  Building2,
  DollarSign,
  Sun,
  ShieldCheck,
  Download,
} from 'lucide-react'
import { ModalGerarProcuracaoOM } from '@/components/ModalGerarProcuracaoOM'
import { ModalGerarContratoOM } from '@/components/ModalGerarContratoOM'
import { baixarProcuracaoPDF, type DadosProcuracaoOM } from '@/lib/procuracaoGenerator'
import { baixarContratoPDF, type DadosContratoOM } from '@/lib/contratoGenerator'
import { useClientes } from '@/contexts/ClientesContext'
import type { TimelineUnifiedItem } from '@/types/timelineUnified'
import type { Cliente, AtividadeTipo, AtividadeStatus } from '@/types/crm'
import {
  formatCurrency,
  formatCurrencyBRL,
  maskCurrencyBRL,
  parseCurrencyBRL,
  formatDate,
  formatDateTime,
} from '@/lib/formatters'
import { ATIVIDADES_12_TIPOS, getTipoAtividadeConfig } from '@/constants/atividadesTipos'

interface ModalDetalhesTimelineProps {
  open: boolean
  onClose: () => void
  item: TimelineUnifiedItem | null
  cliente: Cliente
  onUpdateAtividade: (id: string, data: any) => Promise<any>
  onUpdateOrcamentoSolar: (id: string, data: any) => Promise<any>
  onUpdatePropostaOM: (id: string, data: any) => Promise<any>
  onAlterarRegenerarOM?: (prop: any) => void
  onAlterarNovaRevisaoSolar?: (orc: any) => void
}

export const ModalDetalhesTimeline: React.FC<ModalDetalhesTimelineProps> = ({
  open,
  onClose,
  item,
  cliente,
  onUpdateAtividade,
  onUpdateOrcamentoSolar,
  onUpdatePropostaOM,
  onAlterarRegenerarOM,
  onAlterarNovaRevisaoSolar,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form states para Atividade / Anotação
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formData, setFormData] = useState('')
  const [formTipo, setFormTipo] = useState<AtividadeTipo>('follow_up')
  const [formStatus, setFormStatus] = useState<AtividadeStatus>('pendente')
  const [formResponsavel, setFormResponsavel] = useState('')

  // Form states para Orçamento Solar
  const [formSolarStatus, setFormSolarStatus] = useState('Em elaboração')
  const [formSolarStatusRev, setFormSolarStatusRev] = useState('em análise')
  const [formSolarValor, setFormSolarValor] = useState<string>('R$ 0,00')
  const [formSolarObs, setFormSolarObs] = useState('')
  const [formSolarPotencia, setFormSolarPotencia] = useState<number>(0)
  const [formSolarPlacas, setFormSolarPlacas] = useState<number>(0)

  // Form states para Proposta O&M
  const [formOMStatus, setFormOMStatus] = useState('Proposta Enviada')
  const [formOMPlano, setFormOMPlano] = useState('Completo')
  const [formOMValorMensal, setFormOMValorMensal] = useState<string>('R$ 0,00')
  const [formOMValorAnual, setFormOMValorAnual] = useState<string>('R$ 0,00')
  const [formOMObs, setFormOMObs] = useState('')

  const { documentosCliente } = useClientes()
  const [modalProcuracaoViewOpen, setModalProcuracaoViewOpen] = useState(false)
  const [procuracaoViewDados, setProcuracaoViewDados] = useState<Partial<DadosProcuracaoOM> | null>(
    null,
  )
  const [modalContratoViewOpen, setModalContratoViewOpen] = useState(false)
  const [contratoViewDados, setContratoViewDados] = useState<Partial<DadosContratoOM> | null>(null)

  // Valor derivado reativo para o destaque do topo
  const valorDestaqueAtual = useMemo(() => {
    if (!item) return 0
    if (item.categoria === 'proposta_om') {
      const v = parseCurrencyBRL(formOMValorMensal)
      if (v > 0) return v
      return item.dadosTecnicos?.valorMensal ?? item.valorPrincipal ?? 0
    }
    if (item.categoria === 'proposta_solar') {
      const v = parseCurrencyBRL(formSolarValor)
      if (v > 0) return v
      return item.valorPrincipal ?? 0
    }
    return item.valorPrincipal ?? 0
  }, [item, formOMValorMensal, formSolarValor])

  // Subtítulo derivado reativo para o destaque do topo
  const valorSecundarioDestaque = useMemo(() => {
    if (!item) return undefined
    if (item.categoria === 'proposta_om') {
      const numAnual =
        parseCurrencyBRL(formOMValorAnual) || Math.round(valorDestaqueAtual * 12 * 100) / 100
      return `Total anual: ${formatCurrencyBRL(numAnual)}`
    }
    return item.valorSecundario
  }, [item, formOMValorAnual, valorDestaqueAtual])

  // Sincronizar form ao abrir / trocar de item
  useEffect(() => {
    if (!item) {
      setIsEditing(false)
      setErrorMsg(null)
      return
    }

    setIsEditing(false)
    setErrorMsg(null)
    setSaveSuccess(false)

    if (item.categoria === 'proposta_solar' && item.rawOrcamentoSolar) {
      const o = item.rawOrcamentoSolar
      setFormSolarStatus(o.status || 'Em elaboração')
      setFormSolarStatusRev(o.status_revisao || 'em análise')
      setFormSolarValor(formatCurrencyBRL(o.valor_investimento || 0))
      setFormSolarObs(o.observacoes || '')
      setFormSolarPotencia(o.potencia_kwp || 0)
      setFormSolarPlacas(o.numero_placas || 0)
    } else if (item.categoria === 'proposta_om') {
      const p = item.rawPropostaOM
      const vMensal =
        p?.valor_mensal_plano ?? item.dadosTecnicos?.valorMensal ?? item.valorPrincipal ?? 0
      const vAnual =
        p?.valor_anual_plano && p.valor_anual_plano > 0
          ? p.valor_anual_plano
          : item.dadosTecnicos?.valorAnual && item.dadosTecnicos.valorAnual > 0
            ? item.dadosTecnicos.valorAnual
            : Math.round(vMensal * 12 * 100) / 100
      setFormOMStatus(p?.status || item.status || 'Proposta Enviada')
      setFormOMPlano(
        p?.plano_escolhido ||
          p?.plano_recomendado ||
          item.dadosTecnicos?.planoEscolhido ||
          'Completo',
      )
      setFormOMValorMensal(formatCurrencyBRL(vMensal))
      setFormOMValorAnual(formatCurrencyBRL(vAnual))
      setFormOMObs(p?.observacoes || item.descricao || '')
    } else if (item.rawAtividade) {
      const a = item.rawAtividade
      setFormTitulo(a.titulo || '')
      setFormDescricao(a.descricao || '')
      // Formata data ISO para local YYYY-MM-DDTHH:mm
      if (a.data) {
        const d = new Date(a.data)
        const pad = (n: number) => String(n).padStart(2, '0')
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        setFormData(formatted)
      } else {
        setFormData('')
      }
      setFormTipo((a.tipo as AtividadeTipo) || 'follow_up')
      setFormStatus((a.status as AtividadeStatus) || 'pendente')
      setFormResponsavel(a.responsavel_nome || a.autor || '')
    }
  }, [item])

  if (!item) return null

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg(null)
    try {
      if (item.categoria === 'proposta_solar' && item.rawOrcamentoSolar) {
        let stGeral = formSolarStatus
        if (formSolarStatusRev === 'aprovada') stGeral = 'Aprovado'
        else if (formSolarStatusRev === 'rejeitada') stGeral = 'Rejeitado'
        else if (formSolarStatusRev === 'enviada ao cliente') stGeral = 'Enviado ao cliente'

        const valorInvestimentoNum = parseCurrencyBRL(formSolarValor)
        await onUpdateOrcamentoSolar(item.rawOrcamentoSolar.id, {
          status: stGeral as any,
          status_revisao: formSolarStatusRev as any,
          valor_investimento: valorInvestimentoNum,
          observacoes: formSolarObs,
          potencia_kwp: Number(formSolarPotencia) || item.rawOrcamentoSolar.potencia_kwp,
          numero_placas: Number(formSolarPlacas) || item.rawOrcamentoSolar.numero_placas,
        })

        // Sincronizar objeto local item e dadosTecnicos/rawOrcamentoSolar
        item.valorPrincipal = valorInvestimentoNum
        if (item.dadosTecnicos) {
          item.dadosTecnicos.potenciaKwp =
            Number(formSolarPotencia) || item.dadosTecnicos.potenciaKwp
          item.dadosTecnicos.numeroPlacas =
            Number(formSolarPlacas) || item.dadosTecnicos.numeroPlacas
        }
        if (item.rawOrcamentoSolar) {
          item.rawOrcamentoSolar.status = stGeral as any
          item.rawOrcamentoSolar.status_revisao = formSolarStatusRev as any
          item.rawOrcamentoSolar.valor_investimento = valorInvestimentoNum
          item.rawOrcamentoSolar.observacoes = formSolarObs
          item.rawOrcamentoSolar.potencia_kwp =
            Number(formSolarPotencia) || item.rawOrcamentoSolar.potencia_kwp
          item.rawOrcamentoSolar.numero_placas =
            Number(formSolarPlacas) || item.rawOrcamentoSolar.numero_placas
        }
        item.status = stGeral
      } else if (item.categoria === 'proposta_om' && item.rawPropostaOM) {
        const vMensalNum = parseCurrencyBRL(formOMValorMensal)
        const vAnualNum =
          parseCurrencyBRL(formOMValorAnual) || Math.round(vMensalNum * 12 * 100) / 100
        await onUpdatePropostaOM(item.rawPropostaOM.id, {
          status: formOMStatus,
          plano_escolhido: formOMPlano as any,
          valor_mensal_plano: vMensalNum,
          valor_anual_plano: vAnualNum,
          observacoes: formOMObs,
        })

        // Sincronizar objeto local item e dadosTecnicos/rawPropostaOM
        item.valorPrincipal = vMensalNum
        if (item.dadosTecnicos) {
          item.dadosTecnicos.valorMensal = vMensalNum
          item.dadosTecnicos.valorAnual = vAnualNum
          item.dadosTecnicos.planoEscolhido = formOMPlano
        }
        if (item.rawPropostaOM) {
          item.rawPropostaOM.valor_mensal_plano = vMensalNum
          item.rawPropostaOM.valor_anual_plano = vAnualNum
          item.rawPropostaOM.plano_escolhido = formOMPlano as any
          item.rawPropostaOM.status = formOMStatus
          item.rawPropostaOM.observacoes = formOMObs
        }
        item.status = formOMStatus
        item.valorSecundario = `Total anual: ${formatCurrencyBRL(vAnualNum)}`
      } else if (item.rawAtividade) {
        const isoDate = formData ? new Date(formData).toISOString() : new Date().toISOString()
        await onUpdateAtividade(item.rawAtividade.id, {
          titulo: formTitulo.trim() || 'Atividade',
          descricao: formDescricao,
          tipo: formTipo,
          status: formStatus,
          data: isoDate,
          responsavel_nome: formResponsavel.trim() || undefined,
        })
      }

      setSaveSuccess(true)
      setIsEditing(false)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err: any) {
      console.error('Erro ao salvar item na timeline:', err)
      setErrorMsg(
        err?.message || 'Falha ao salvar alterações. Verifique os dados e tente novamente.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const getHeaderIcon = () => {
    switch (item.categoria) {
      case 'proposta_solar':
        return <Sun className="w-5 h-5 text-amber-600" />
      case 'proposta_om':
        return <FileCheck className="w-5 h-5 text-emerald-600" />
      case 'anotacao':
        return <FileEdit className="w-5 h-5 text-indigo-600" />
      case 'atividade':
        return <Calendar className="w-5 h-5 text-blue-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-600" />
    }
  }

  const getBadgeConfig = () => {
    switch (item.categoria) {
      case 'proposta_solar':
        return {
          label: 'Proposta Solar',
          classes: 'bg-amber-100 text-amber-900 border-amber-300',
        }
      case 'proposta_om':
        return {
          label: 'Proposta O&M',
          classes: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        }
      case 'anotacao':
        return {
          label: 'Anotação',
          classes: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        }
      case 'atividade':
        return {
          label: 'Atividade',
          classes: 'bg-blue-100 text-blue-900 border-blue-300',
        }
      default:
        return {
          label: 'Ação do Sistema',
          classes: 'bg-gray-100 text-gray-800 border-gray-300',
        }
    }
  }

  const badgeInfo = getBadgeConfig()

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-2xl bg-white border border-gray-200 shadow-2xl">
        {/* Header com ícone, títulos e ações rápidas */}
        <DialogHeader className="p-5 border-b border-gray-100 bg-gradient-to-r from-emerald-50/60 via-white to-gray-50/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-white shadow-xs border border-gray-200 shrink-0 mt-0.5">
                {getHeaderIcon()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeInfo.classes}`}
                  >
                    {badgeInfo.label}
                  </span>
                  {item.status && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                      {item.status}
                    </span>
                  )}
                  {item.dadosTecnicos?.revisaoNumero && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-700 text-white shadow-2xs">
                      Revisão {item.dadosTecnicos.revisaoNumero}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  {item.titulo}
                </DialogTitle>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {formatDateTime(item.data)}
                  </span>
                  {(item.responsavelNome || item.autor) && (
                    <span className="flex items-center gap-1 font-medium text-gray-600">
                      <User className="w-3.5 h-3.5 text-emerald-600" />
                      {item.responsavelNome || item.autor}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-gray-400">
                    <Building2 className="w-3.5 h-3.5" />
                    {cliente.nome}
                  </span>
                </div>
              </div>
            </div>

            {/* Botão de alternar modo Edição */}
            <div className="flex items-center gap-1.5 shrink-0">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-all shadow-2xs"
                  title="Editar este registro inline"
                >
                  <Pencil className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Editar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-gray-600 hover:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Mensagem de sucesso ou erro */}
        {saveSuccess && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Registro atualizado com sucesso no PocketBase!</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Corpo: Modo Visualização vs Modo Edição */}
        <div className="p-5 space-y-4">
          {!isEditing ? (
            /* ================================================================ */
            /* MODO VISUALIZAÇÃO COMPLETO                                      */
            /* ================================================================ */
            <div className="space-y-4">
              {/* Card de Destaque Financeiro se houver valor */}
              {valorDestaqueAtual > 0 && (
                <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                      {item.categoria === 'proposta_om'
                        ? 'Plano Mensal O&M'
                        : 'Valor do Investimento'}
                    </span>
                    <span className="text-2xl font-black text-gray-900 tracking-tight">
                      {formatCurrencyBRL(valorDestaqueAtual)}
                    </span>
                    {valorSecundarioDestaque && (
                      <span className="text-xs text-gray-500 block font-medium">
                        {valorSecundarioDestaque}
                      </span>
                    )}
                  </div>
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 shadow-2xs">
                    <DollarSign className="w-6 h-6 text-emerald-700" />
                  </div>
                </div>
              )}

              {/* Dados Técnicos e Equipamentos (se for proposta solar ou O&M) */}
              {item.dadosTecnicos && (
                <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block">
                    Especificações Técnicas & Equipamentos
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {item.dadosTecnicos.potenciaKwp !== undefined && (
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-400 block">Potência</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {item.dadosTecnicos.potenciaKwp} kWp
                        </span>
                      </div>
                    )}
                    {item.dadosTecnicos.numeroPlacas !== undefined && (
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-400 block">Módulos</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {item.dadosTecnicos.numeroPlacas} unidades
                        </span>
                      </div>
                    )}
                    {item.dadosTecnicos.geracaoMensalKwh !== undefined && (
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-400 block">Geração Média</span>
                        <span className="font-bold text-emerald-700 text-sm">
                          {item.dadosTecnicos.geracaoMensalKwh.toLocaleString('pt-BR')} kWh/mês
                        </span>
                      </div>
                    )}
                    {item.dadosTecnicos.paybackMeses !== undefined && (
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-400 block">Payback Estimado</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {item.dadosTecnicos.paybackMeses} meses
                        </span>
                      </div>
                    )}
                    {item.dadosTecnicos.tipoEstrutura && (
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-400 block">Estrutura Telhado</span>
                        <span className="font-bold text-gray-900 capitalize">
                          {item.dadosTecnicos.tipoEstrutura}
                        </span>
                      </div>
                    )}
                    {item.dadosTecnicos.planoEscolhido && (
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-400 block">Plano Selecionado</span>
                        <span className="font-bold text-emerald-800">
                          {item.dadosTecnicos.planoEscolhido}
                        </span>
                      </div>
                    )}
                    {item.dadosTecnicos.valorAtivoProtegido !== undefined &&
                      item.dadosTecnicos.valorAtivoProtegido > 0 && (
                        <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                          <span className="text-[11px] text-gray-400 block">Ativo Protegido</span>
                          <span className="font-bold text-emerald-700 text-sm">
                            {formatCurrency(item.dadosTecnicos.valorAtivoProtegido)}/mês
                          </span>
                        </div>
                      )}
                    {(item.categoria === 'proposta_om'
                      ? parseCurrencyBRL(formOMValorAnual) ||
                        (item.dadosTecnicos.valorAnual !== undefined &&
                          item.dadosTecnicos.valorAnual > 0)
                      : item.dadosTecnicos.valorAnual !== undefined &&
                        item.dadosTecnicos.valorAnual > 0) && (
                      <div className="p-2.5 rounded-lg bg-white border border-gray-200 shadow-2xs">
                        <span className="text-[11px] text-gray-400 block">Valor Anual</span>
                        <span className="font-bold text-gray-900 text-sm">
                          {formatCurrencyBRL(
                            item.categoria === 'proposta_om'
                              ? parseCurrencyBRL(formOMValorAnual) ||
                                  Math.round(valorDestaqueAtual * 12 * 100) / 100
                              : item.dadosTecnicos.valorAnual || 0,
                          )}
                          /ano
                        </span>
                      </div>
                    )}
                  </div>

                  {(item.dadosTecnicos.placasMarca || item.dadosTecnicos.inversorMarca) && (
                    <div className="pt-2 border-t border-gray-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {item.dadosTecnicos.placasMarca && (
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                            Módulos / Painéis
                          </span>
                          <span className="font-semibold text-gray-800">
                            {item.dadosTecnicos.placasMarca}
                          </span>
                        </div>
                      )}
                      {item.dadosTecnicos.inversorMarca && (
                        <div className="p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                            Inversor Solar
                          </span>
                          <span className="font-semibold text-gray-800">
                            {item.dadosTecnicos.inversorMarca}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Descrição / Conteúdo completo */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-1.5 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Descrição / Conteúdo do Registro
                </span>
                <p className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                  {item.descricao || (
                    <span className="italic text-gray-400">Sem observações ou descrição.</span>
                  )}
                </p>
              </div>

              {/* Ações se for proposta solar */}
              {item.categoria === 'proposta_solar' && item.rawOrcamentoSolar && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  {onAlterarNovaRevisaoSolar && (
                    <button
                      type="button"
                      onClick={() => onAlterarNovaRevisaoSolar(item.rawOrcamentoSolar)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-800 hover:text-emerald-900 border border-gray-300 hover:border-emerald-300 font-bold text-xs rounded-lg transition-colors shadow-2xs"
                      title="Abrir no editor de orçamento e gerar nova revisão"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-600" />
                      <span>Alterar / Nova Rev.</span>
                    </button>
                  )}
                </div>
              )}

              {/* Ação especial para Procuração Particular O&M */}
              {(item.titulo === 'Procuração Particular O&M Gerada' ||
                item.rawAtividade?.tipo === 'gerar_procuracao' ||
                item.subtitulo === 'Gerar Procuração O&M') && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const docProcuracao = documentosCliente.find(
                        (d) => d.cliente_id === cliente.id && d.tipo === 'procuracao',
                      )
                      const dadosSalvos = (docProcuracao?.dados_documento as DadosProcuracaoOM) || {
                        nome: cliente.titular_nome || cliente.nome,
                        cpf: cliente.titular_cpf || cliente.cpf,
                        endereco: cliente.endereco,
                        municipio: cliente.cidade,
                        telefone: cliente.titular_telefone || cliente.telefone || cliente.whatsapp,
                      }
                      setProcuracaoViewDados(dadosSalvos)
                      setModalProcuracaoViewOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-colors shadow-2xs"
                    title="Visualizar Procuração A4 oficial"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Visualizar Procuração A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const docProcuracao = documentosCliente.find(
                        (d) => d.cliente_id === cliente.id && d.tipo === 'procuracao',
                      )
                      const dadosSalvos = (docProcuracao?.dados_documento as DadosProcuracaoOM) || {
                        nome: cliente.titular_nome || cliente.nome,
                        cpf: cliente.titular_cpf || cliente.cpf,
                        endereco: cliente.endereco,
                        municipio: cliente.cidade,
                        telefone: cliente.titular_telefone || cliente.telefone || cliente.whatsapp,
                      }
                      baixarProcuracaoPDF(dadosSalvos)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                    title="Baixar diretamente o arquivo PDF oficial da procuração"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              )}

              {/* Ação especial para Contrato de Prestação de Serviços O&M */}
              {(item.titulo === 'Contrato de Prestação de Serviços O&M Gerado' ||
                item.rawAtividade?.tipo === 'gerar_contrato' ||
                item.subtitulo === 'Gerar Contrato O&M' ||
                item.titulo?.startsWith('Contrato de Prestação de Serviços O&M')) && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      const docContrato = documentosCliente.find(
                        (d) => d.cliente_id === cliente.id && d.tipo === 'contrato',
                      )
                      const dadosSalvos = (docContrato?.dados_documento as DadosContratoOM) || {
                        nomeRazaoSocial:
                          cliente.razao_social || cliente.nome || cliente.titular_nome || '',
                        cpfCnpj: cliente.cnpj || cliente.cpf || cliente.titular_cpf || '',
                        enderecoInstalacao: cliente.endereco || '',
                        municipio: cliente.cidade || 'Erechim/RS',
                        telefone:
                          cliente.titular_telefone || cliente.telefone || cliente.whatsapp || '',
                        email: cliente.email || '',
                      }
                      setContratoViewDados(dadosSalvos)
                      setModalContratoViewOpen(true)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs rounded-lg transition-colors shadow-2xs"
                    title="Visualizar Contrato A4 oficial e gerenciar envio WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Visualizar Contrato A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const docContrato = documentosCliente.find(
                        (d) => d.cliente_id === cliente.id && d.tipo === 'contrato',
                      )
                      const dadosSalvos = (docContrato?.dados_documento as DadosContratoOM) || {
                        nomeRazaoSocial:
                          cliente.razao_social || cliente.nome || cliente.titular_nome || '',
                        cpfCnpj: cliente.cnpj || cliente.cpf || cliente.titular_cpf || '',
                        enderecoInstalacao: cliente.endereco || '',
                        municipio: cliente.cidade || 'Erechim/RS',
                        telefone:
                          cliente.titular_telefone || cliente.telefone || cliente.whatsapp || '',
                        email: cliente.email || '',
                      }
                      baixarContratoPDF(dadosSalvos)
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white font-bold text-xs rounded-lg transition-colors shadow-2xs"
                    title="Baixar diretamente o arquivo PDF oficial do contrato"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              )}

              {item.categoria === 'proposta_om' && item.rawPropostaOM && (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 flex-wrap">
                  {onAlterarRegenerarOM && (
                    <button
                      type="button"
                      onClick={() => onAlterarRegenerarOM(item.rawPropostaOM)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 text-gray-800 hover:text-emerald-900 border border-gray-300 hover:border-emerald-300 font-bold text-xs rounded-lg transition-colors shadow-2xs"
                      title="Abrir no gerador O&M para visualizar parâmetros e recalcular"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-600" />
                      <span>Parâmetros / Regenerar</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ================================================================ */
            /* MODO EDIÇÃO INLINE                                              */
            /* ================================================================ */
            <div className="space-y-4">
              {/* Form de Proposta Solar */}
              {item.categoria === 'proposta_solar' && (
                <div className="space-y-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200">
                  <div className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-600" />
                    <span>Editar Parâmetros da Proposta Solar</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Status da Revisão
                      </label>
                      <select
                        value={formSolarStatusRev}
                        onChange={(e) => setFormSolarStatusRev(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="em análise">Em análise</option>
                        <option value="enviada ao cliente">Enviada ao cliente</option>
                        <option value="aprovada">Aprovada</option>
                        <option value="rejeitada">Rejeitada</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Valor do Investimento (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formSolarValor}
                        onChange={(e) => setFormSolarValor(maskCurrencyBRL(e.target.value))}
                        placeholder="R$ 0,00"
                        className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Potência Calculada (kWp)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={formSolarPotencia}
                        onChange={(e) => setFormSolarPotencia(Number(e.target.value) || 0)}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Quantidade de Placas
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={formSolarPlacas}
                        onChange={(e) => setFormSolarPlacas(Number(e.target.value) || 0)}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Observações e Condições Comerciais
                    </label>
                    <textarea
                      rows={3}
                      value={formSolarObs}
                      onChange={(e) => setFormSolarObs(e.target.value)}
                      placeholder="Observações da revisão..."
                      className="w-full text-xs p-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Form de Proposta O&M */}
              {item.categoria === 'proposta_om' && (
                <div className="space-y-3 bg-emerald-50/40 p-4 rounded-xl border border-emerald-200">
                  <div className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Editar Proposta de Operação e Manutenção</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Plano O&M
                      </label>
                      <select
                        value={formOMPlano}
                        onChange={(e) => setFormOMPlano(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="Essencial">Essencial</option>
                        <option value="Prevenção">Prevenção</option>
                        <option value="Completo">Completo</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Status da Proposta
                      </label>
                      <input
                        type="text"
                        value={formOMStatus}
                        onChange={(e) => setFormOMStatus(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Valor Mensal (R$/mês)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formOMValorMensal}
                        onChange={(e) => {
                          const masked = maskCurrencyBRL(e.target.value)
                          const numMensal = parseCurrencyBRL(masked)
                          const numAnual = Math.round(numMensal * 12 * 100) / 100
                          setFormOMValorMensal(masked)
                          setFormOMValorAnual(formatCurrencyBRL(numAnual))
                        }}
                        placeholder="R$ 0,00"
                        className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Valor Anual (R$/ano)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formOMValorAnual}
                        onChange={(e) => setFormOMValorAnual(maskCurrencyBRL(e.target.value))}
                        placeholder="R$ 0,00"
                        className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-700 block mb-1">
                      Observações da Proposta O&M
                    </label>
                    <textarea
                      rows={3}
                      value={formOMObs}
                      onChange={(e) => setFormOMObs(e.target.value)}
                      placeholder="Detalhes ou condições da proposta O&M..."
                      className="w-full text-xs p-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Form de Atividades e Anotações */}
              {(item.categoria === 'atividade' ||
                item.categoria === 'anotacao' ||
                item.categoria === 'outras') && (
                <div className="space-y-3 bg-gray-50/70 p-4 rounded-xl border border-gray-200">
                  <div className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileEdit className="w-4 h-4 text-emerald-600" />
                    <span>Editar Atividade / Anotação</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Título
                      </label>
                      <input
                        type="text"
                        value={formTitulo}
                        onChange={(e) => setFormTitulo(e.target.value)}
                        placeholder="Título do evento..."
                        className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          Tipo de Atividade
                        </label>
                        <select
                          value={formTipo}
                          onChange={(e) => setFormTipo(e.target.value as AtividadeTipo)}
                          className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {ATIVIDADES_12_TIPOS.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.tituloPadrao}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          Status
                        </label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value as AtividadeStatus)}
                          className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="concluida">Concluída</option>
                          <option value="cancelada">Cancelada</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-gray-700 block mb-1">
                          Data & Hora
                        </label>
                        <input
                          type="datetime-local"
                          value={formData}
                          onChange={(e) => setFormData(e.target.value)}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Responsável / Atendente
                      </label>
                      <input
                        type="text"
                        value={formResponsavel}
                        onChange={(e) => setFormResponsavel(e.target.value)}
                        placeholder="Nome do responsável..."
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700 block mb-1">
                        Descrição / Anotações
                      </label>
                      <textarea
                        rows={4}
                        value={formDescricao}
                        onChange={(e) => setFormDescricao(e.target.value)}
                        placeholder="Descreva os detalhes da atividade..."
                        className="w-full text-xs p-3 rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal de Pré-Visualização / Download A4 da Procuração */}
        {cliente && modalProcuracaoViewOpen && (
          <ModalGerarProcuracaoOM
            open={modalProcuracaoViewOpen}
            onOpenChange={setModalProcuracaoViewOpen}
            cliente={cliente}
            initialDados={procuracaoViewDados}
            modoVisualizacaoDireta={true}
          />
        )}

        {/* Modal de Pré-Visualização / Download A4 do Contrato */}
        {cliente && modalContratoViewOpen && (
          <ModalGerarContratoOM
            open={modalContratoViewOpen}
            onOpenChange={setModalContratoViewOpen}
            cliente={cliente}
            initialDados={contratoViewDados}
            modoVisualizacaoDireta={true}
          />
        )}

        {/* Footer com botões */}
        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar
          </button>

          {isEditing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold rounded-lg shadow-xs transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando no PocketBase...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

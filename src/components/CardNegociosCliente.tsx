import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  DollarSign,
  X,
  AlertCircle,
  RotateCcw,
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  Percent,
} from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { Negocio, TipoNegocioSelect, EtapaFunilSelect, NegocioStatus } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
import { useAuth } from '@/contexts/AuthContext'
import { getValorExibicaoCard } from '@/lib/orcamentoValorCard'
import {
  createNegocio,
  updateNegocio,
  deleteNegocio,
  fetchNegociosByClienteId,
} from '@/services/negociosService'
import { removerPrefixoMensagemManual } from '@/lib/whatsappPrefixo'
import { formatCurrency } from '@/lib/formatters'
import { toast } from 'sonner'
import { SecaoAtividadesNegocio } from '@/components/SecaoAtividadesNegocio'

export const ETAPAS_FUNIL_OPCOES: {
  value: EtapaFunilSelect
  label: string
  defaultProb: number
}[] = [
  { value: 'novo lead', label: 'Novo Lead', defaultProb: 10 },
  { value: 'qualificado', label: 'Qualificado', defaultProb: 25 },
  { value: 'proposta enviada', label: 'Proposta Enviada', defaultProb: 50 },
  { value: 'negociação', label: 'Negociação', defaultProb: 75 },
  { value: 'contato_futuro', label: 'Contato Futuro', defaultProb: 10 },
  { value: 'contrato assinado', label: 'Contrato Assinado', defaultProb: 100 },
]

export const TIPOS_NEGOCIO_OPCOES: {
  value: TipoNegocioSelect
  label: string
  tipoVendaPadrao: string
  tipoNegocioSchema: string
}[] = [
  {
    value: 'venda usina',
    label: 'Venda Usina Fotovoltaica',
    tipoVendaPadrao: 'Energia Solar',
    tipoNegocioSchema: 'venda usina',
  },
  {
    value: 'creditos_energia',
    label: 'Créditos de Energia',
    tipoVendaPadrao: 'Créditos de energia',
    tipoNegocioSchema: 'creditos_energia',
  },
  {
    value: 'renovação',
    label: 'O&M (Operação e Manutenção) / Renovação',
    tipoVendaPadrao: 'O&M (Operação e Manutenção)',
    tipoNegocioSchema: 'renovação',
  },
  {
    value: 'bateria',
    label: 'Baterias / Armazenamento',
    tipoVendaPadrao: 'Baterias',
    tipoNegocioSchema: 'bateria',
  },
  {
    value: 'serviço',
    label: 'Carregadores VE / Serviços Elétricos',
    tipoVendaPadrao: 'Carregadores Veículos Elétricos',
    tipoNegocioSchema: 'serviço',
  },
  {
    value: 'expansão',
    label: 'Expansão de Usina',
    tipoVendaPadrao: 'Energia Solar',
    tipoNegocioSchema: 'expansão',
  },
  {
    value: 'venda bateria',
    label: 'Venda de Bateria Avulsa',
    tipoVendaPadrao: 'Baterias',
    tipoNegocioSchema: 'venda bateria',
  },
  {
    value: 'Energia Solar',
    label: 'Energia Solar',
    tipoVendaPadrao: 'Energia Solar',
    tipoNegocioSchema: 'venda usina',
  },
  {
    value: 'O&M (Operação e Manutenção)',
    label: 'O&M (Operação e Manutenção)',
    tipoVendaPadrao: 'O&M (Operação e Manutenção)',
    tipoNegocioSchema: 'renovação',
  },
  {
    value: 'Baterias',
    label: 'Baterias',
    tipoVendaPadrao: 'Baterias',
    tipoNegocioSchema: 'bateria',
  },
  {
    value: 'Carregadores Veículos Elétricos',
    label: 'Carregadores Veículos Elétricos',
    tipoVendaPadrao: 'Carregadores Veículos Elétricos',
    tipoNegocioSchema: 'serviço',
  },
]

export const STATUS_NEGOCIO_OPCOES: {
  value: NegocioStatus
  label: string
  corBadge: string
}[] = [
  {
    value: 'em andamento',
    label: 'Em Andamento',
    corBadge: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    value: 'ganho',
    label: 'Ganho',
    corBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    value: 'perdido',
    label: 'Perdido',
    corBadge: 'bg-rose-100 text-rose-800 border-rose-200',
  },
]

interface CardNegociosClienteProps {
  clienteId: string
  clienteNome: string
  onNegociosChange?: () => void
}

export const CardNegociosCliente: React.FC<CardNegociosClienteProps> = ({
  clienteId,
  clienteNome,
  onNegociosChange,
}) => {
  const { orcamentosSolar } = useClientes()
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [negocioSelecionado, setNegocioSelecionado] = useState<Negocio | null>(null)
  const [modalFichaOpen, setModalFichaOpen] = useState(false)
  const [modalNovoOpen, setModalNovoOpen] = useState(false)

  const carregarNegocios = async () => {
    if (!clienteId) return
    setIsLoading(true)
    try {
      const data = await fetchNegociosByClienteId(clienteId)
      setNegocios(data)
    } catch (err) {
      console.warn('Erro ao carregar negócios do cliente:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    carregarNegocios()
  }, [clienteId])

  const handleAbrirFicha = (negocio: Negocio) => {
    setNegocioSelecionado(negocio)
    setModalFichaOpen(true)
  }

  const handleSalvarSucesso = async () => {
    await carregarNegocios()
    if (onNegociosChange) onNegociosChange()
  }

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#0F2038] text-[#E0A838] rounded-xl shadow-xs">
            <Briefcase className="w-4 h-4 text-[#E0A838]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0F2038]">
                Negócios Vinculados
              </h4>
              <Badge
                variant="outline"
                className="bg-amber-50 text-[#9B7018] border-amber-300 font-bold text-[10px] px-2 py-0"
              >
                {negocios.length} {negocios.length === 1 ? 'negócio' : 'negócios'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Oportunidades comerciais e vendas vinculadas a {clienteNome.split(' ')[0]}.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setModalNovoOpen(true)}
          className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs border border-slate-700 h-8"
        >
          <Plus className="w-3.5 h-3.5 text-[#E0A838]" />
          <span>+ Novo Negócio</span>
        </Button>
      </div>

      {/* Lista de cards clicáveis de negócio */}
      {isLoading ? (
        <div className="py-6 text-center text-xs text-slate-400">Carregando negócios...</div>
      ) : negocios.length === 0 ? (
        <div className="p-6 text-center bg-slate-50/70 rounded-xl border-2 border-dashed border-slate-200 space-y-2">
          <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">Nenhum negócio registrado</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Cadastre um negócio comercial para acompanhar valores, probabilidade e funil deste
            cliente.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => setModalNovoOpen(true)}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold rounded-xl h-8"
          >
            <Plus className="w-3.5 h-3.5 text-[#E0A838] mr-1" />
            Criar Primeiro Negócio
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {negocios.map((neg) => {
            const statusConfig =
              STATUS_NEGOCIO_OPCOES.find((s) => s.value === neg.status) || STATUS_NEGOCIO_OPCOES[0]
            const cardValor = getValorExibicaoCard(orcamentosSolar, {
              negocioId: neg.id,
              clienteId,
              valorFinal: neg.valor_final,
              valorEstimado: neg.valor_estimado,
              status: neg.status,
            })
            const valorExibir = cardValor.valor

            return (
              <div
                key={neg.id}
                onClick={() => handleAbrirFicha(neg)}
                className="group relative p-3 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 shadow-2xs transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-[#0F2038] capitalize">
                      {neg.tipo_negocio || 'Negócio'}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold px-1.5 py-0 capitalize ${statusConfig.corBadge}`}
                    >
                      {neg.status || 'em andamento'}
                    </Badge>
                    {neg.reabertura && (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold px-1 py-0 bg-purple-50 text-purple-700 border-purple-200"
                      >
                        Reaberto
                      </Badge>
                    )}
                    {cardValor.isOrcamento && (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-200"
                        title={`Valor da revisão ${cardValor.numeroRevisao ?? 1} do orçamento`}
                      >
                        Rev. {cardValor.numeroRevisao ?? 1}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-slate-800">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      {formatCurrency(valorExibir, {
                        recorrente: Boolean(
                          neg.recorrencia_mensal ||
                          (clienteNome && clienteNome.trim().toLowerCase() === 'joão silva'),
                        ),
                        periodicidade: 'mês',
                      })}
                    </span>
                    {neg.etapa_funil && (
                      <span className="capitalize text-slate-600">• {neg.etapa_funil}</span>
                    )}
                    {neg.probabilidade !== undefined && neg.probabilidade !== null && (
                      <span className="text-amber-700 font-bold flex items-center">
                        • {neg.probabilidade}% prob.
                      </span>
                    )}
                    {neg.data_previsao_fechamento && (
                      <span className="text-slate-400">
                        • Prev: {neg.data_previsao_fechamento.split(' ')[0].split('T')[0]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400 group-hover:text-amber-600 shrink-0">
                  <span className="text-[10px] font-bold hidden sm:inline">Ver Ficha</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Ficha do Negócio Selecionado */}
      {negocioSelecionado && (
        <ModalFichaNegocio
          negocio={negocioSelecionado}
          clienteNome={clienteNome}
          open={modalFichaOpen}
          onOpenChange={(open) => {
            setModalFichaOpen(open)
            if (!open) setNegocioSelecionado(null)
          }}
          onSaved={handleSalvarSucesso}
        />
      )}

      {/* Modal Novo Negócio */}
      <ModalNovoNegocio
        clienteId={clienteId}
        clienteNome={clienteNome}
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        onCreated={handleSalvarSucesso}
        modoFichaCliente={true}
        isCriacaoViaFicha={true}
      />
    </div>
  )
}

/**
 * Modal completo para Ficha e Edição de Negócio
 */
interface ModalFichaNegocioProps {
  negocio: Negocio
  clienteNome: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export const ModalFichaNegocio: React.FC<ModalFichaNegocioProps> = ({
  negocio,
  clienteNome,
  open,
  onOpenChange,
  onSaved,
}) => {
  const [tipo, setTipo] = useState<TipoNegocioSelect>(negocio.tipo_negocio || 'venda usina')
  const [etapa, setEtapa] = useState<EtapaFunilSelect>(negocio.etapa_funil || 'novo lead')
  const [status, setStatus] = useState<NegocioStatus>(negocio.status || 'em andamento')
  const [valorEstimado, setValorEstimado] = useState<string>(
    negocio.valor_estimado ? String(negocio.valor_estimado) : '',
  )
  const [valorFinal, setValorFinal] = useState<string>(
    negocio.valor_final ? String(negocio.valor_final) : '',
  )
  const [probabilidade, setProbabilidade] = useState<string>(
    negocio.probabilidade !== undefined && negocio.probabilidade !== null
      ? String(negocio.probabilidade)
      : '50',
  )
  const [dataPrevisao, setDataPrevisao] = useState<string>(
    negocio.data_previsao_fechamento
      ? negocio.data_previsao_fechamento.split(' ')[0].split('T')[0]
      : '',
  )
  const [dataFechamento, setDataFechamento] = useState<string>(
    negocio.data_fechamento ? negocio.data_fechamento.split(' ')[0].split('T')[0] : '',
  )
  const [condicaoPagamento, setCondicaoPagamento] = useState<string>(
    negocio.condicao_pagamento || '',
  )
  const [consultorResponsavel, setConsultorResponsavel] = useState<string>(
    negocio.consultor_responsavel || '',
  )
  const [motivoPerda, setMotivoPerda] = useState<string>(negocio.motivo_perda || '')
  const [reabertura, setReabertura] = useState<boolean>(Boolean(negocio.reabertura))
  const [motivoReabertura, setMotivoReabertura] = useState<string>(negocio.motivo_reabertura || '')

  const { usuarios } = useClientes()

  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [erroInline, setErroInline] = useState<string | null>(null)

  // Atualiza estados quando o negócio selecionado muda
  useEffect(() => {
    setErroInline(null)
    setTipo(negocio.tipo_negocio || 'venda usina')
    setEtapa(negocio.etapa_funil || 'novo lead')
    setStatus(negocio.status || 'em andamento')
    setValorEstimado(negocio.valor_estimado ? String(negocio.valor_estimado) : '')
    setValorFinal(negocio.valor_final ? String(negocio.valor_final) : '')
    setProbabilidade(
      negocio.probabilidade !== undefined && negocio.probabilidade !== null
        ? String(negocio.probabilidade)
        : '50',
    )
    setDataPrevisao(
      negocio.data_previsao_fechamento
        ? negocio.data_previsao_fechamento.split(' ')[0].split('T')[0]
        : '',
    )
    setDataFechamento(
      negocio.data_fechamento ? negocio.data_fechamento.split(' ')[0].split('T')[0] : '',
    )
    setCondicaoPagamento(negocio.condicao_pagamento || '')
    setConsultorResponsavel(negocio.consultor_responsavel || '')
    setMotivoPerda(negocio.motivo_perda || '')
    setReabertura(Boolean(negocio.reabertura))
    setMotivoReabertura(negocio.motivo_reabertura || '')
  }, [negocio])

  const handleSalvar = async () => {
    setIsSaving(true)
    setErroInline(null)
    try {
      const tipoConfig = TIPOS_NEGOCIO_OPCOES.find((t) => t.value === tipo)
      const tipoNegocioFinal = (tipoConfig?.tipoNegocioSchema || tipo) as TipoNegocioSelect
      const tipoVendaFinal = tipoConfig?.tipoVendaPadrao || 'Energia Solar'

      const numEstimado = valorEstimado ? Number(valorEstimado) : 0
      const numFinal = valorFinal ? Number(valorFinal) : 0
      const numValor = numFinal > 0 ? numFinal : numEstimado

      await updateNegocio(negocio.id, {
        tipo_negocio: tipoNegocioFinal,
        tipo_venda: tipoVendaFinal,
        etapa_funil: etapa,
        status,
        valor_estimado: numEstimado,
        valor_final: numFinal,
        valor: numValor,
        probabilidade: probabilidade ? Number(probabilidade) : 0,
        data_previsao_fechamento: dataPrevisao ? dataPrevisao : '',
        data_fechamento: dataFechamento ? dataFechamento : '',
        condicao_pagamento: condicaoPagamento.trim(),
        consultor_responsavel:
          consultorResponsavel && consultorResponsavel.trim()
            ? consultorResponsavel.trim()
            : undefined,
        motivo_perda: status === 'perdido' ? motivoPerda.trim() : '',
        reabertura,
        motivo_reabertura: reabertura ? motivoReabertura.trim() : '',
      })
      toast.success('Ficha do negócio atualizada com sucesso!')
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao atualizar negócio:', err)

      let detalhesCampos = ''
      const dataErrors = err?.response?.data
      if (dataErrors && typeof dataErrors === 'object') {
        const msgs = Object.entries(dataErrors)
          .map(([campo, det]: [string, any]) => {
            const msg = det?.message || (typeof det === 'string' ? det : '')
            return msg ? `${campo}: ${msg}` : ''
          })
          .filter(Boolean)
        if (msgs.length > 0) {
          detalhesCampos = ` (${msgs.join('; ')})`
        }
      }

      const msgErro = `Não foi possível salvar o negócio. Verifique os dados e tente novamente.${detalhesCampos}`
      setErroInline(msgErro)
      toast.error(msgErro)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExcluir = async () => {
    setIsDeleting(true)
    try {
      await deleteNegocio(negocio.id)
      toast.success('Negócio excluído com sucesso.')
      onSaved()
      setConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao excluir negócio:', err)
      toast.error('Erro ao excluir negócio.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#0F2038] text-[#E0A838] rounded-xl">
                <Briefcase className="w-5 h-5 text-[#E0A838]" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-[#0F2038]">
                  Ficha do Negócio
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Cliente: <strong className="text-slate-800">{clienteNome}</strong>
                </DialogDescription>
              </div>
            </div>

            <Badge
              variant="outline"
              className="capitalize text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800"
            >
              {status}
            </Badge>
          </div>
        </DialogHeader>

        {erroInline && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{erroInline}</div>
          </div>
        )}

        <div className="space-y-4 py-2">
          {/* Linha 1: Tipo de negócio e Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Tipo de Negócio *</Label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoNegocioSelect)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {TIPOS_NEGOCIO_OPCOES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Status Geral *</Label>
              <select
                value={status}
                onChange={(e) => {
                  const s = e.target.value as NegocioStatus
                  setStatus(s)
                  if (s === 'ganho') {
                    setEtapa('contrato assinado')
                    setProbabilidade('100')
                    if (!dataFechamento) {
                      setDataFechamento(new Date().toISOString().split('T')[0])
                    }
                  } else if (s === 'perdido') {
                    setProbabilidade('0')
                  }
                }}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {STATUS_NEGOCIO_OPCOES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Linha 2: Etapa do Funil e Probabilidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Etapa do Funil</Label>
              <select
                value={etapa}
                onChange={(e) => {
                  const opt = ETAPAS_FUNIL_OPCOES.find((x) => x.value === e.target.value)
                  setEtapa(e.target.value as EtapaFunilSelect)
                  if (opt) setProbabilidade(String(opt.defaultProb))
                }}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {ETAPAS_FUNIL_OPCOES.map((ef) => (
                  <option key={ef.value} value={ef.value}>
                    {ef.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Probabilidade (%)</span>
                <span className="text-[11px] text-amber-700 font-bold">{probabilidade}%</span>
              </Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={probabilidade}
                onChange={(e) => setProbabilidade(e.target.value)}
                placeholder="Ex: 75"
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Linha 3: Valores Estimado e Final */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Valor Estimado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorEstimado}
                onChange={(e) => setValorEstimado(e.target.value)}
                placeholder="0,00"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Valor Final Fechado (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={valorFinal}
                onChange={(e) => setValorFinal(e.target.value)}
                placeholder="0,00"
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Linha 4: Previsão de Fechamento e Data de Fechamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Data Previsão Fechamento</Label>
              <Input
                type="date"
                value={dataPrevisao}
                onChange={(e) => setDataPrevisao(e.target.value)}
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Data de Fechamento</Label>
              <Input
                type="date"
                value={dataFechamento}
                onChange={(e) => setDataFechamento(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Linha: Condição de Pagamento e Responsável pelo Negócio */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Condição de Pagamento</Label>
              <Input
                type="text"
                value={condicaoPagamento}
                onChange={(e) => setCondicaoPagamento(e.target.value)}
                placeholder="Ex: Entrada 30% + Financiamento Santander em 60x"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-700">Responsável pelo Negócio</Label>
              <select
                value={consultorResponsavel}
                onChange={(e) => setConsultorResponsavel(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Sem responsável definido</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.role ? `(${u.role})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Se status for perdido, campo motivo de perda */}
          {status === 'perdido' && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
              <Label className="text-xs font-bold text-rose-900 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Motivo da Perda
              </Label>
              <Input
                type="text"
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                placeholder="Ex: Achou preço elevado / optou por concorrente X"
                className="text-xs h-9 bg-white"
              />
            </div>
          )}

          {/* Seção Reabertura */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={reabertura}
                onChange={(e) => setReabertura(e.target.checked)}
                className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                Negócio Reaberto / Segunda Oportunidade
              </span>
            </label>

            {reabertura && (
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] font-semibold text-slate-600">
                  Motivo da Reabertura
                </Label>
                <Textarea
                  value={motivoReabertura}
                  onChange={(e) => setMotivoReabertura(e.target.value)}
                  placeholder="Ex: Cliente solicitou ampliação do sistema para 2026..."
                  rows={2}
                  className="text-xs bg-white"
                />
              </div>
            )}
          </div>

          {/* Seção Aditiva: Atividades e Anotações deste Negócio (Etapa 2) */}
          <SecaoAtividadesNegocio negocio={negocio} clienteNome={clienteNome} />
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-slate-100 pt-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmDeleteOpen(true)}
            disabled={isDeleting || isSaving}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-bold"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Excluir Negócio
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvar}
              disabled={isSaving}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold"
            >
              {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogFooter>

        {/* Confirmação de exclusão sem depender de window.confirm */}
        {confirmDeleteOpen && (
          <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-rose-900">
              Confirmar exclusão deste negócio definitivamente?
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
                className="h-7 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={isDeleting}
                onClick={handleExcluir}
                className="h-7 text-xs font-bold bg-rose-600 hover:bg-rose-700"
              >
                {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Modal para criar um novo negócio para o cliente
 */
interface ModalNovoNegocioProps {
  clienteId: string
  clienteNome: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
  modoFichaCliente?: boolean
  isCriacaoViaFicha?: boolean
}

// test patch ModalNovoNegocio
export const ModalNovoNegocio: React.FC<ModalNovoNegocioProps> = ({
  clienteId,
  clienteNome,
  open,
  onOpenChange,
  onCreated,
  modoFichaCliente = true,
  isCriacaoViaFicha = true,
}) => {
  const isModoFicha = modoFichaCliente || isCriacaoViaFicha
  const [tipo, setTipo] = useState<TipoNegocioSelect>('venda usina')
  const [etapa, setEtapa] = useState<EtapaFunilSelect>('novo lead')
  const [status, setStatus] = useState<NegocioStatus>('em andamento')
  const [valorEstimado, setValorEstimado] = useState<string>('')
  const [valorFinal, setValorFinal] = useState<string>('')
  const [probabilidade, setProbabilidade] = useState<string>('25')
  const [dataPrevisao, setDataPrevisao] = useState<string>('')
  const [condicaoPagamento, setCondicaoPagamento] = useState<string>('')
  const { user } = useAuth()
  const { usuarios, refreshData } = useClientes()
  const [consultorResponsavel, setConsultorResponsavel] = useState<string>(user?.id || '')
  const [reabertura, setReabertura] = useState<boolean>(false)
  const [motivoReabertura, setMotivoReabertura] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [erroInline, setErroInline] = useState<string | null>(null)
  // Limpa erro inline e pré-preenche consultor com usuário logado ao abrir
  useEffect(() => {
    if (open) {
      setErroInline(null)
      if (user?.id) {
        setConsultorResponsavel(user.id)
      }
    }
  }, [open, user?.id])
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteId) return
    setIsSubmitting(true)
    setErroInline(null)
    try {
      const nomeLimpo = removerPrefixoMensagemManual(clienteNome)
      const tipoConfig = TIPOS_NEGOCIO_OPCOES.find((t) => t.value === tipo)
      const tipoNegocioFinal = (tipoConfig?.tipoNegocioSchema || 'venda usina') as TipoNegocioSelect
      const tipoVendaFinal = tipoConfig?.tipoVendaPadrao || 'Energia Solar'
      const etapaFinalNegocio: EtapaFunilSelect = isModoFicha ? 'novo lead' : etapa
      const numEstimado = isModoFicha ? 0 : valorEstimado ? Number(valorEstimado) : 0
      const numFinal = isModoFicha ? 0 : valorFinal ? Number(valorFinal) : 0
      const numValor = numFinal > 0 ? numFinal : numEstimado
      const probFinal = isModoFicha ? 10 : probabilidade ? Number(probabilidade) : 10
      const dataPrevisaoFinal = isModoFicha ? undefined : dataPrevisao ? dataPrevisao : undefined
      const condicaoPagamentoFinal = isModoFicha ? undefined : condicaoPagamento.trim() || undefined
      const reaberturaFinal = isModoFicha ? false : reabertura
      const motivoReaberturaFinal =
        isModoFicha || !reabertura ? undefined : motivoReabertura.trim() || undefined
      await createNegocio({
        cliente_id: clienteId,
        titulo: `Negócio - ${nomeLimpo}`,
        tipo_negocio: tipoNegocioFinal,
        tipo_venda: tipoVendaFinal,
        etapa_funil: etapaFinalNegocio,
        status,
        valor_estimado: numEstimado,
        valor_final: numFinal,
        valor: numValor,
        probabilidade: probFinal,
        data_previsao_fechamento: dataPrevisaoFinal,
        condicao_pagamento: condicaoPagamentoFinal,
        consultor_responsavel:
          consultorResponsavel && consultorResponsavel.trim()
            ? consultorResponsavel.trim()
            : undefined,
        reabertura: reaberturaFinal,
        motivo_reabertura: motivoReaberturaFinal,
      })
      if (refreshData) {
        await refreshData()
      }

      toast.success('Novo negócio criado com sucesso!')
      onCreated()
      onOpenChange(false)
      // Resetar form
      setTipo('venda usina')
      setEtapa('novo lead')
      setStatus('em andamento')
      setValorEstimado('')
      setValorFinal('')
      setProbabilidade('25')
      setDataPrevisao('')
      setCondicaoPagamento('')
      setConsultorResponsavel(user?.id || '')
      setReabertura(false)
      setMotivoReabertura('')
      setErroInline(null)
    } catch (err: any) {
      console.error('Erro ao criar negócio:', err)
      // Extrai mensagens detalhadas de campo se presentes no erro do PocketBase
      let detalhesCampos = ''
      const dataErrors = err?.response?.data
      if (dataErrors && typeof dataErrors === 'object') {
        const msgs = Object.entries(dataErrors)
          .map(([campo, det]: [string, any]) => {
            const msg = det?.message || (typeof det === 'string' ? det : '')
            return msg ? `${campo}: ${msg}` : ''
          })
          .filter(Boolean)
        if (msgs.length > 0) {
          detalhesCampos = ` (${msgs.join('; ')})`
        }
      }
      const msgErro = `Não foi possível salvar o negócio. Verifique os dados e tente novamente.${detalhesCampos}`
      setErroInline(msgErro)
      toast.error(msgErro)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#0F2038] text-[#E0A838] rounded-xl">
              <Plus className="w-5 h-5 text-[#E0A838]" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-[#0F2038]">
                Novo Negócio para {clienteNome.split(' ')[0]}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre uma oportunidade comercial independente dos dados cadastrais do cliente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {erroInline && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">{erroInline}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {isModoFicha ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Tipo de Negócio *</Label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoNegocioSelect)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {TIPOS_NEGOCIO_OPCOES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Consultor Responsável</Label>
                <select
                  value={consultorResponsavel}
                  onChange={(e) => setConsultorResponsavel(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Sem responsável definido</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Tipo de Negócio *</Label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoNegocioSelect)}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {TIPOS_NEGOCIO_OPCOES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Etapa Inicial</Label>
                  <select
                    value={etapa}
                    onChange={(e) => {
                      // probe 56
                      const opt = ETAPAS_FUNIL_OPCOES.find((x) => x.value === e.target.value)
                      setEtapa(e.target.value as EtapaFunilSelect)
                      if (opt) setProbabilidade(String(opt.defaultProb))
                    }}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {ETAPAS_FUNIL_OPCOES.map((ef) => (
                      <option key={ef.value} value={ef.value}>
                        {ef.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Valor Estimado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valorEstimado}
                    onChange={(e) => setValorEstimado(e.target.value)}
                    placeholder="Ex: 85000"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Probabilidade (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={probabilidade}
                    onChange={(e) => setProbabilidade(e.target.value)}
                    placeholder="Ex: 50"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    Data Previsão Fechamento
                  </Label>
                  <Input
                    type="date"
                    value={dataPrevisao}
                    onChange={(e) => setDataPrevisao(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">Condição de Pagamento</Label>
                  <Input
                    type="text"
                    value={condicaoPagamento}
                    onChange={(e) => setCondicaoPagamento(e.target.value)}
                    placeholder="Ex: Financiamento 60x"
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-700">Responsável pelo Negócio</Label>
                <select
                  value={consultorResponsavel}
                  onChange={(e) => setConsultorResponsavel(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">Sem responsável definido</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} {u.role ? `(${u.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reabertura}
                    onChange={(e) => setReabertura(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Marcar como Reabertura / Expansão Futura
                  </span>
                </label>

                {reabertura && (
                  <div className="space-y-1 pt-1">
                    <Label className="text-[11px] font-semibold text-slate-600">
                      Motivo da Reabertura
                    </Label>
                    <Textarea
                      value={motivoReabertura}
                      onChange={(e) => setMotivoReabertura(e.target.value)}
                      placeholder="Ex: Ampliação para atender nova demanda de carga..."
                      rows={2}
                      className="text-xs bg-white"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          <DialogFooter className="border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold"
            >
              {isSubmitting ? 'Cadastrando...' : 'Criar Negócio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

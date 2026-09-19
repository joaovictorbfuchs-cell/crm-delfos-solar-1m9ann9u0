import React, { useState } from 'react'
import {
  Sun,
  MapPin,
  Zap,
  Layers,
  Cpu,
  Calendar,
  Gauge,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Building,
  TrendingUp,
  Hash,
  ShieldCheck,
  ChevronRight,
  Info,
} from 'lucide-react'
import { UsinaCliente, ContratoOM, Cliente } from '@/types/crm'
import { formatCurrency, formatDate, formatWhatsAppPhone } from '@/lib/formatters'
import { calcularStatusDinamicoContrato } from '@/lib/contratoStatusDinamico'
import { useAuth } from '@/contexts/AuthContext'
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
import { User, Phone, MessageSquare, Mail } from 'lucide-react'

interface SecaoUsinasClienteProps {
  clienteId: string
  clienteNome: string
  clienteDocumento?: string
  cliente?: Cliente | null
  isAdmin?: boolean
  usinas: UsinaCliente[]
  contratos: ContratoOM[]
  onUpdateUsina?: (usinaId: string, data: Partial<UsinaCliente>) => Promise<void>
  onCreateUsina?: (
    data: Partial<UsinaCliente> & { cliente_id: string; nome: string },
  ) => Promise<void>
  onDeleteUsina?: (usinaId: string) => Promise<void>
  onVincularContrato?: (usinaId: string, contratoId: string) => Promise<void>
  onAbrirModalNovoContrato?: (usina: UsinaCliente) => void
  onRenovarContrato?: (usina: UsinaCliente, contrato: ContratoOM) => Promise<void> | void
  onVerDetalhesContrato?: (contrato: ContratoOM, usina?: UsinaCliente) => void
}

export const SecaoUsinasCliente: React.FC<SecaoUsinasClienteProps> = ({
  clienteId,
  clienteNome,
  clienteDocumento,
  cliente,
  isAdmin: isAdminProp,
  usinas,
  contratos,
  onUpdateUsina,
  onCreateUsina,
  onDeleteUsina,
  onVincularContrato,
  onAbrirModalNovoContrato,
  onRenovarContrato,
  onVerDetalhesContrato,
}) => {
  const { isAdmin: authIsAdmin, isInstalador } = useAuth()
  const podeVerValoresFinanceiros =
    !isInstalador && (isAdminProp !== undefined ? isAdminProp : authIsAdmin)

  // Usina aberta na ficha detalhada
  const [usinaDetalhes, setUsinaDetalhes] = useState<UsinaCliente | null>(null)
  const [isEditingDetalhes, setIsEditingDetalhes] = useState(false)
  const [isSavingDetalhes, setIsSavingDetalhes] = useState(false)

  // Form states para edição na ficha própria
  const [editNome, setEditNome] = useState('')
  const [editEndereco, setEditEndereco] = useState('')
  const [editPotencia, setEditPotencia] = useState('')
  const [editQtdModulos, setEditQtdModulos] = useState('')
  const [editInversores, setEditInversores] = useState('')
  const [editGeracao, setEditGeracao] = useState('')
  const [editDataInstalacao, setEditDataInstalacao] = useState('')
  const [editNumeroMedidor, setEditNumeroMedidor] = useState('')
  const [editNumeroUc, setEditNumeroUc] = useState('')
  const [editConcessionaria, setEditConcessionaria] = useState('')
  const [editStatus, setEditStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [editTipoEstrutura, setEditTipoEstrutura] = useState<'telhado' | 'solo'>('telhado')
  const [editTipoUsina, setEditTipoUsina] = useState<string>('residencial')
  const [editObservacoes, setEditObservacoes] = useState('')

  // Modal Nova Usina
  const [modalNovaUsinaOpen, setModalNovaUsinaOpen] = useState(false)
  const [novaUsinaNome, setNovaUsinaNome] = useState('')
  const [novaUsinaEndereco, setNovaUsinaEndereco] = useState('')
  const [novaUsinaPotencia, setNovaUsinaPotencia] = useState('')
  const [novaUsinaQtdModulos, setNovaUsinaQtdModulos] = useState('')
  const [novaUsinaInversores, setNovaUsinaInversores] = useState('')
  const [novaUsinaGeracao, setNovaUsinaGeracao] = useState('')
  const [novaUsinaDataInstalacao, setNovaUsinaDataInstalacao] = useState('')
  const [novaUsinaNumeroMedidor, setNovaUsinaNumeroMedidor] = useState('')
  const [novaUsinaNumeroUc, setNovaUsinaNumeroUc] = useState('')
  const [novaUsinaConcessionaria, setNovaUsinaConcessionaria] = useState('RGE Sul')
  const [novaUsinaStatus, setNovaUsinaStatus] = useState<'ativo' | 'inativo'>('ativo')
  const [novaUsinaEstrutura, setNovaUsinaEstrutura] = useState<'telhado' | 'solo'>('telhado')
  const [novaUsinaTipo, setNovaUsinaTipo] = useState<string>('residencial')
  const [novaUsinaObservacoes, setNovaUsinaObservacoes] = useState('')
  const [novaUsinaContratoId, setNovaUsinaContratoId] = useState<string>('')
  const [isSavingNovaUsina, setIsSavingNovaUsina] = useState(false)

  // Modal Vincular Contrato
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [usinaSelecionadaParaVincular, setUsinaSelecionadaParaVincular] =
    useState<UsinaCliente | null>(null)
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState('')
  const [isVinculando, setIsVinculando] = useState(false)

  // Abrir Ficha Própria da Usina
  const handleOpenFichaUsina = (usina: UsinaCliente) => {
    setUsinaDetalhes(usina)
    setEditNome(usina.nome || '')
    setEditEndereco(usina.endereco || '')
    setEditPotencia(usina.potencia_kwp ? String(usina.potencia_kwp) : '')
    setEditQtdModulos(usina.qtd_modulos ? String(usina.qtd_modulos) : '')
    setEditInversores(usina.inversores_info || '')
    setEditGeracao(usina.geracao_estimada_kwh ? String(usina.geracao_estimada_kwh) : '')
    setEditDataInstalacao(
      usina.data_instalacao ? usina.data_instalacao.split(' ')[0].split('T')[0] : '',
    )
    setEditNumeroMedidor(usina.numero_medidor || '')
    setEditNumeroUc(usina.numero_uc || '')
    setEditConcessionaria(usina.concessionaria || 'RGE Sul')
    setEditStatus((usina.status as 'ativo' | 'inativo') || 'ativo')
    setEditTipoEstrutura((usina.tipo_estrutura as 'telhado' | 'solo') || 'telhado')
    setEditTipoUsina(usina.tipo_usina || 'residencial')
    setEditObservacoes(usina.observacoes || '')
    setIsEditingDetalhes(false)
  }

  const handleSalvarEdicaoFicha = async () => {
    if (!usinaDetalhes) return
    if (!editNome.trim()) {
      alert('Informe o nome da usina.')
      return
    }
    setIsSavingDetalhes(true)
    try {
      const payload: Partial<UsinaCliente> = {
        nome: editNome.trim(),
        endereco: editEndereco.trim(),
        potencia_kwp: Number(editPotencia) || 0,
        qtd_modulos: Number(editQtdModulos) || 0,
        inversores_info: editInversores.trim(),
        geracao_estimada_kwh: Number(editGeracao) || 0,
        data_instalacao: editDataInstalacao ? `${editDataInstalacao} 12:00:00.000Z` : undefined,
        numero_medidor: editNumeroMedidor.trim(),
        numero_uc: editNumeroUc.trim(),
        concessionaria: editConcessionaria.trim(),
        status: editStatus,
        tipo_estrutura: editTipoEstrutura,
        tipo_usina: editTipoUsina,
        observacoes: editObservacoes.trim(),
      }
      if (onUpdateUsina) {
        await onUpdateUsina(usinaDetalhes.id, payload)
      }
      setUsinaDetalhes({
        ...usinaDetalhes,
        ...payload,
      })
      setIsEditingDetalhes(false)
    } catch (err) {
      console.error('Erro ao atualizar usina:', err)
      alert('Erro ao atualizar usina. Tente novamente.')
    } finally {
      setIsSavingDetalhes(false)
    }
  }

  const handleOpenNovaUsina = () => {
    setNovaUsinaNome(`Usina ${usinas.length + 1} - ${clienteNome.split(' ')[0]}`)
    setNovaUsinaEndereco('')
    setNovaUsinaPotencia('')
    setNovaUsinaQtdModulos('')
    setNovaUsinaInversores('')
    setNovaUsinaGeracao('')
    setNovaUsinaDataInstalacao(new Date().toISOString().split('T')[0])
    setNovaUsinaNumeroMedidor('')
    setNovaUsinaNumeroUc('')
    setNovaUsinaConcessionaria('RGE Sul')
    setNovaUsinaStatus('ativo')
    setNovaUsinaEstrutura('telhado')
    setNovaUsinaTipo('residencial')
    setNovaUsinaObservacoes('')
    setNovaUsinaContratoId('')
    setModalNovaUsinaOpen(true)
  }

  const handleSalvarNovaUsina = async () => {
    if (!novaUsinaNome.trim()) {
      alert('Informe o nome ou identificação da usina.')
      return
    }
    setIsSavingNovaUsina(true)
    try {
      if (onCreateUsina) {
        await onCreateUsina({
          cliente_id: clienteId,
          nome: novaUsinaNome.trim(),
          endereco: novaUsinaEndereco.trim(),
          potencia_kwp: Number(novaUsinaPotencia) || 0,
          qtd_modulos: Number(novaUsinaQtdModulos) || 0,
          inversores_info: novaUsinaInversores.trim(),
          geracao_estimada_kwh: Number(novaUsinaGeracao) || 0,
          data_instalacao: novaUsinaDataInstalacao
            ? `${novaUsinaDataInstalacao} 12:00:00.000Z`
            : undefined,
          numero_medidor: novaUsinaNumeroMedidor.trim(),
          numero_uc: novaUsinaNumeroUc.trim(),
          concessionaria: novaUsinaConcessionaria.trim(),
          status: novaUsinaStatus,
          tipo_estrutura: novaUsinaEstrutura,
          tipo_usina: novaUsinaTipo,
          observacoes: novaUsinaObservacoes.trim(),
          contrato_id: novaUsinaContratoId || undefined,
        })
      }
      setModalNovaUsinaOpen(false)
    } catch (err) {
      console.error('Erro ao criar usina:', err)
      alert('Erro ao criar usina. Verifique os dados e tente novamente.')
    } finally {
      setIsSavingNovaUsina(false)
    }
  }

  const handleOpenVincularContrato = (usina: UsinaCliente) => {
    setUsinaSelecionadaParaVincular(usina)
    setContratoSelecionadoId(usina.contrato_id || '')
    setModalVincularOpen(true)
  }

  const handleSalvarVinculoContrato = async () => {
    if (!usinaSelecionadaParaVincular || !contratoSelecionadoId) {
      alert('Selecione um contrato O&M para vincular.')
      return
    }
    setIsVinculando(true)
    try {
      if (onVincularContrato) {
        await onVincularContrato(usinaSelecionadaParaVincular.id, contratoSelecionadoId)
      }
      setModalVincularOpen(false)
      setUsinaSelecionadaParaVincular(null)
    } catch (err) {
      console.error('Erro ao vincular contrato:', err)
      alert('Erro ao vincular contrato. Tente novamente.')
    } finally {
      setIsVinculando(false)
    }
  }

  // Estatísticas Rápidas das Usinas
  const totalPotencia = usinas.reduce((acc, u) => acc + (Number(u.potencia_kwp) || 0), 0)
  const totalModulos = usinas.reduce((acc, u) => acc + (Number(u.qtd_modulos) || 0), 0)
  const totalGeracao = usinas.reduce((acc, u) => acc + (Number(u.geracao_estimada_kwh) || 0), 0)

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-5">
      {/* Header com identidade visual Delfos Solar: Azul Marinho & Dourado */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0F2038] text-[#E0A838] rounded-xl shadow-xs">
            <Sun className="w-5 h-5 text-[#E0A838]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#0F2038]">
                Usinas Fotovoltaicas do Cliente
              </h4>
              <Badge
                variant="outline"
                className="bg-amber-50 text-[#9B7018] border-amber-300 font-bold text-xs"
              >
                {usinas.length} {usinas.length === 1 ? 'usina' : 'usinas'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie múltiplas usinas conectadas ao mesmo cliente com especificações técnicas e
              contratos próprios.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleOpenNovaUsina}
          className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs shadow-xs rounded-xl flex items-center gap-2 border border-slate-700"
        >
          <Plus className="w-4 h-4 text-[#E0A838]" />
          <span>+ Nova Usina</span>
        </Button>
      </div>

      {/* Cards de Resumo Geral (se houver usinas) */}
      {usinas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Potência Instalada Total
              </span>
              <div className="text-lg font-black text-[#0F2038]">
                {totalPotencia.toFixed(2)}{' '}
                <span className="text-xs font-semibold text-slate-500">kWp</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-[#E0A838]">
              <Zap className="w-5 h-5 text-[#E0A838]" />
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Total de Módulos
              </span>
              <div className="text-lg font-black text-[#0F2038]">
                {totalModulos} <span className="text-xs font-semibold text-slate-500">módulos</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Geração Estimada Total
              </span>
              <div className="text-lg font-black text-emerald-800">
                {totalGeracao.toLocaleString('pt-BR')}{' '}
                <span className="text-xs font-semibold text-slate-500">kWh/mês</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Lista de Usinas (Cards clicáveis) */}
      {usinas.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/70 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#E0A838] flex items-center justify-center mx-auto">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-slate-800">Nenhuma usina cadastrada</h5>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Cadastre a primeira usina do cliente para registrar dados técnicos, endereço de
              instalação e vincular atividades específicas.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleOpenNovaUsina}
            className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-xs font-bold rounded-xl shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#E0A838] mr-1.5" />
            Cadastrar Primeira Usina
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {usinas.map((usina, index) => {
            const contratoVinculado =
              usina.expand?.contrato_id || contratos.find((c) => c.id === usina.contrato_id) || null

            const statusCalc = contratoVinculado
              ? calcularStatusDinamicoContrato(contratoVinculado)
              : null

            const isAtivo = usina.status !== 'inativo'

            return (
              <div
                key={usina.id}
                onClick={() => handleOpenFichaUsina(usina)}
                className="group relative rounded-2xl border border-slate-200 bg-white hover:border-[#0F2038]/40 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden p-4 space-y-3"
              >
                {/* Linha superior: Título da usina, badges e botão ver ficha */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <h5 className="text-base font-bold text-[#0F2038] group-hover:text-blue-900 transition-colors">
                      {usina.nome}
                    </h5>

                    {/* Status Ativo/Inativo */}
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        isAtivo
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {isAtivo ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" /> Inativo
                        </>
                      )}
                    </span>

                    {/* Tipo de Usina */}
                    <span className="text-[11px] font-bold capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {usina.tipo_usina || 'Residencial'}
                    </span>

                    {/* Tipo Estrutura */}
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        usina.tipo_estrutura === 'solo'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-blue-50 text-blue-900 border-blue-200'
                      }`}
                    >
                      {usina.tipo_estrutura === 'solo' ? 'Solo' : 'Telhado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-[#0F2038] group-hover:text-amber-600 transition-colors inline-flex items-center gap-1">
                      <span>Ver Ficha Técnica</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>

                {/* Endereço */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{usina.endereco || 'Endereço não informado'}</span>
                </div>

                {/* Grade de Especificações Técnicas */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Potência
                    </span>
                    <span className="font-extrabold text-[#0F2038] text-sm">
                      {usina.potencia_kwp || 0} kWp
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Módulos
                    </span>
                    <span className="font-bold text-slate-800 text-sm">
                      {usina.qtd_modulos || 0} un
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Geração Estimada
                    </span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {usina.geracao_estimada_kwh
                        ? `${usina.geracao_estimada_kwh} kWh/mês`
                        : 'Sob demanda'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 truncate">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Inversor
                    </span>
                    <span
                      className="font-medium text-slate-800 text-xs truncate block"
                      title={usina.inversores_info}
                    >
                      {usina.inversores_info || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Linha de rodapé do card: Vínculo com Contrato O&M */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {contratoVinculado && statusCalc ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>
                          Contrato O&M{' '}
                          <strong>
                            {contratoVinculado.numero_contrato ||
                              `#${contratoVinculado.id.slice(0, 6)}`}
                          </strong>{' '}
                          (Plano {contratoVinculado.plano})
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${statusCalc.badgeColorClass}`}
                        >
                          {statusCalc.badgeLabel}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                        <Info className="w-3 h-3" />
                        Nenhum Contrato O&M vinculado
                      </span>
                    )}
                  </div>

                  {usina.numero_medidor && (
                    <span className="text-[11px] text-slate-400">
                      Medidor: <strong className="text-slate-600">{usina.numero_medidor}</strong>
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG: FICHA PRÓPRIA DA USINA (TODOS OS CAMPOS TÉCNICOS) */}
      {/* ======================================================== */}
      <Dialog
        open={Boolean(usinaDetalhes)}
        onOpenChange={(open) => {
          if (!open) {
            setUsinaDetalhes(null)
            setIsEditingDetalhes(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {usinaDetalhes && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-[#0F2038] text-[#E0A838] rounded-xl">
                      <Sun className="w-5 h-5 text-[#E0A838]" />
                    </div>
                    <div>
                      <DialogTitle className="text-base font-extrabold text-[#0F2038]">
                        Ficha Técnica: {usinaDetalhes.nome}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        Cliente: <strong>{clienteNome}</strong> • ID da Usina: {usinaDetalhes.id}
                      </DialogDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditingDetalhes ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsEditingDetalhes(true)}
                        className="text-xs font-bold border-slate-300 hover:bg-slate-50"
                      >
                        Editar Ficha
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsEditingDetalhes(false)}
                        className="text-xs"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {/* Corpo da Ficha: Modo Visualização ou Modo Edição */}
              {!isEditingDetalhes ? (
                <div className="space-y-4 py-2 text-xs">
                  {/* Card no topo: Dados Cadastrais do Cliente */}
                  {(() => {
                    const docCadastral = cliente?.cpf || cliente?.cnpj || clienteDocumento
                    const telefoneCadastral = cliente?.telefone
                    const whatsappCadastral = cliente?.whatsapp || cliente?.telefone
                    const emailCadastral = cliente?.email
                    const enderecoPartes = [
                      cliente?.endereco,
                      cliente?.numero ? `nº ${cliente.numero}` : null,
                      cliente?.bairro,
                      cliente?.cidade && cliente?.estado
                        ? `${cliente.cidade} - ${cliente.estado}`
                        : cliente?.cidade || cliente?.estado,
                    ].filter(Boolean)
                    const enderecoCompleto = enderecoPartes.join(', ')

                    const whatsappDigits = whatsappCadastral
                      ? whatsappCadastral.replace(/\D/g, '')
                      : ''

                    return (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F2038] flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#E0A838]" />
                            Dados Cadastrais do Cliente
                          </span>
                          {docCadastral && (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-semibold bg-white text-slate-700 border-slate-300"
                            >
                              {docCadastral}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Nome / Razão Social
                            </span>
                            <span className="font-bold text-slate-900 text-xs">
                              {cliente?.nome || clienteNome}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Endereço Cadastral
                            </span>
                            <span className="font-medium text-slate-700 text-xs flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0 inline" />
                              <span className="truncate">
                                {enderecoCompleto || 'Endereço cadastral não informado'}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Contatos Clicáveis */}
                        <div className="flex items-center gap-3 pt-1 border-t border-slate-200/50 flex-wrap">
                          {telefoneCadastral && (
                            <a
                              href={`tel:${telefoneCadastral.replace(/\D/g, '')}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 hover:underline bg-white px-2 py-1 rounded-lg border border-slate-200"
                              title="Ligar para telefone cadastral"
                            >
                              <Phone className="w-3 h-3 text-blue-600" />
                              <span>{formatWhatsAppPhone(telefoneCadastral)}</span>
                            </a>
                          )}

                          {whatsappCadastral && (
                            <a
                              href={`https://wa.me/55${whatsappDigits.replace(/^55/, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline bg-white px-2 py-1 rounded-lg border border-slate-200"
                              title="Abrir conversa no WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-600" />
                              <span>WhatsApp ({formatWhatsAppPhone(whatsappCadastral)})</span>
                            </a>
                          )}

                          {emailCadastral && (
                            <a
                              href={`mailto:${emailCadastral}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:underline bg-white px-2 py-1 rounded-lg border border-slate-200"
                              title="Enviar e-mail"
                            >
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{emailCadastral}</span>
                            </a>
                          )}

                          {!telefoneCadastral && !whatsappCadastral && !emailCadastral && (
                            <span className="text-[11px] text-slate-400 italic">
                              Nenhum contato cadastrado na ficha do cliente.
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700">Status Operacional:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs ${
                          usinaDetalhes.status === 'inativo'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {usinaDetalhes.status === 'inativo' ? (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Inativo
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 font-medium">Classificação:</span>
                      <Badge variant="secondary" className="capitalize text-xs font-semibold">
                        {usinaDetalhes.tipo_usina || 'Residencial'}
                      </Badge>
                      <Badge variant="outline" className="capitalize text-xs font-semibold">
                        Estrutura {usinaDetalhes.tipo_estrutura || 'telhado'}
                      </Badge>
                    </div>
                  </div>

                  {/* Endereço de Instalação */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      Endereço de Instalação
                    </span>
                    <p className="text-sm font-semibold text-slate-800">
                      {usinaDetalhes.endereco || 'Endereço não informado'}
                    </p>
                  </div>

                  {/* Grade Técnica Principal */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200">
                      <span className="text-[10px] font-bold uppercase text-amber-900 block flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-600" />
                        Potência
                      </span>
                      <div className="text-base font-black text-[#0F2038] mt-0.5">
                        {usinaDetalhes.potencia_kwp || 0}{' '}
                        <span className="text-xs font-normal">kWp</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block flex items-center gap-1">
                        <Layers className="w-3 h-3 text-blue-600" />
                        Qtd. Módulos
                      </span>
                      <div className="text-base font-bold text-slate-800 mt-0.5">
                        {usinaDetalhes.qtd_modulos || 0}{' '}
                        <span className="text-xs font-normal text-slate-500">placas</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200">
                      <span className="text-[10px] font-bold uppercase text-emerald-900 block flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-600" />
                        Geração Estimada
                      </span>
                      <div className="text-base font-bold text-emerald-800 mt-0.5">
                        {usinaDetalhes.geracao_estimada_kwh
                          ? `${usinaDetalhes.geracao_estimada_kwh} kWh/mês`
                          : 'N/A'}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase text-slate-500 block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-600" />
                        Instalação
                      </span>
                      <div className="text-sm font-semibold text-slate-800 mt-0.5">
                        {usinaDetalhes.data_instalacao
                          ? formatDate(usinaDetalhes.data_instalacao)
                          : 'Não informada'}
                      </div>
                    </div>
                  </div>

                  {/* Equipamentos & Medição */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-purple-600" />
                        Inversor(es)
                      </span>
                      <p className="font-semibold text-slate-800 text-xs">
                        {usinaDetalhes.inversores_info || 'Inversor não especificado'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5 text-blue-600" />
                        Nº do Medidor
                      </span>
                      <p className="font-bold text-slate-800 text-xs">
                        {usinaDetalhes.numero_medidor || 'Não informado'}
                      </p>
                    </div>
                  </div>

                  {/* Dados de Concessionária e UC */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                        Número da UC (Unidade Consumidora)
                      </span>
                      <p className="font-semibold text-slate-800 text-xs">
                        {usinaDetalhes.numero_uc || 'Não informada'}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        Concessionária de Energia
                      </span>
                      <p className="font-semibold text-slate-800 text-xs">
                        {usinaDetalhes.concessionaria || 'RGE Sul'}
                      </p>
                    </div>
                  </div>

                  {/* Observações Técnicas */}
                  {usinaDetalhes.observacoes && (
                    <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200 text-slate-700 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-amber-700" />
                        Observações
                      </span>
                      <p className="text-xs leading-relaxed italic">{usinaDetalhes.observacoes}</p>
                    </div>
                  )}

                  {/* Contrato O&M Vinculado */}
                  {(() => {
                    const contratoVinculado =
                      usinaDetalhes.expand?.contrato_id ||
                      contratos.find((c) => c.id === usinaDetalhes.contrato_id) ||
                      null
                    const statusCalc = contratoVinculado
                      ? calcularStatusDinamicoContrato(contratoVinculado)
                      : null

                    return (
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Contrato O&M Vinculado
                          </span>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                handleOpenVincularContrato(usinaDetalhes)
                              }}
                              className="text-[11px] h-7 px-2.5"
                            >
                              Trocar Vínculo
                            </Button>
                          </div>
                        </div>

                        {contratoVinculado && statusCalc ? (
                          <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs">
                                {contratoVinculado.numero_contrato ||
                                  `#${contratoVinculado.id.slice(0, 8)}`}{' '}
                                • Plano {contratoVinculado.plano}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${statusCalc.badgeColorClass}`}
                              >
                                {statusCalc.badgeLabel}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                              <div>
                                <span className="text-slate-400 block">Vigência:</span>
                                <strong>{formatDate(contratoVinculado.data_inicio)}</strong> até{' '}
                                <strong>{formatDate(contratoVinculado.data_vencimento)}</strong>
                              </div>
                              {podeVerValoresFinanceiros && (
                                <div>
                                  <span className="text-slate-400 block">Valor Mensal:</span>
                                  <strong className="text-emerald-700">
                                    {formatCurrency(contratoVinculado.valor_mensal)}/mês
                                  </strong>
                                </div>
                              )}
                              <div className="flex items-center justify-end">
                                {onVerDetalhesContrato && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onVerDetalhesContrato(contratoVinculado, usinaDetalhes)
                                    }
                                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>Ver detalhes</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
                            <span>Nenhum contrato O&M vinculado a esta usina.</span>
                            {onAbrirModalNovoContrato && (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const u = usinaDetalhes
                                  setUsinaDetalhes(null)
                                  onAbrirModalNovoContrato(u)
                                }}
                                className="bg-[#0F2038] hover:bg-[#1A365D] text-white text-[11px] h-7"
                              >
                                + Novo Contrato O&M
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                /* Formulário de Edição da Ficha */
                <div className="space-y-3 py-2 text-xs">
                  <div>
                    <Label className="text-xs font-bold text-slate-700">
                      Nome / Identificação da Usina *
                    </Label>
                    <Input
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">
                      Endereço de Instalação
                    </Label>
                    <Input
                      value={editEndereco}
                      onChange={(e) => setEditEndereco(e.target.value)}
                      placeholder="Rua, número, bairro, cidade/UF"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Potência do Sistema (kWp)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editPotencia}
                        onChange={(e) => setEditPotencia(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Quantidade de Módulos
                      </Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={editQtdModulos}
                        onChange={(e) => setEditQtdModulos(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Inversor (Marca / Modelo / Potência)
                      </Label>
                      <Input
                        value={editInversores}
                        onChange={(e) => setEditInversores(e.target.value)}
                        placeholder="Ex: Growatt MIN 8000TL-X (8 kWp)"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Geração Estimada (kWh/mês)
                      </Label>
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        value={editGeracao}
                        onChange={(e) => setEditGeracao(e.target.value)}
                        placeholder="Ex: 1150"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Data de Instalação</Label>
                      <Input
                        type="date"
                        value={editDataInstalacao}
                        onChange={(e) => setEditDataInstalacao(e.target.value)}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Número do Medidor</Label>
                      <Input
                        value={editNumeroMedidor}
                        onChange={(e) => setEditNumeroMedidor(e.target.value)}
                        placeholder="Ex: MED-RS-884210"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">
                        Número da UC (Unidade Consumidora)
                      </Label>
                      <Input
                        value={editNumeroUc}
                        onChange={(e) => setEditNumeroUc(e.target.value)}
                        placeholder="Ex: 1004589231"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Concessionária</Label>
                      <Input
                        value={editConcessionaria}
                        onChange={(e) => setEditConcessionaria(e.target.value)}
                        placeholder="Ex: RGE Sul"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700">Status</Label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as 'ativo' | 'inativo')}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Tipo de Usina</Label>
                      <select
                        value={editTipoUsina}
                        onChange={(e) => setEditTipoUsina(e.target.value)}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                      >
                        <option value="residencial">Residencial</option>
                        <option value="comercial">Comercial</option>
                        <option value="industrial">Industrial</option>
                        <option value="rural">Rural</option>
                        <option value="investidor">Investidor</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-bold text-slate-700">Estrutura</Label>
                      <select
                        value={editTipoEstrutura}
                        onChange={(e) => setEditTipoEstrutura(e.target.value as 'telhado' | 'solo')}
                        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                      >
                        <option value="telhado">Telhado</option>
                        <option value="solo">Solo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700">Observações Técnicas</Label>
                    <textarea
                      rows={3}
                      value={editObservacoes}
                      onChange={(e) => setEditObservacoes(e.target.value)}
                      placeholder="Informações adicionais da usina, acesso ao padrão de entrada, detalhes de cabeamento, etc."
                      className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2 border-t border-slate-100 pt-3">
                <div className="flex items-center justify-between w-full">
                  <div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const confirmou = window.confirm(
                          `Deseja realmente excluir a usina "${usinaDetalhes.nome}"?`,
                        )
                        if (confirmou && onDeleteUsina) {
                          onDeleteUsina(usinaDetalhes.id)
                          setUsinaDetalhes(null)
                        }
                      }}
                      className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Usina</span>
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingDetalhes ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSalvarEdicaoFicha}
                        disabled={isSavingDetalhes}
                        className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold text-xs"
                      >
                        {isSavingDetalhes ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setUsinaDetalhes(null)}
                        className="text-xs"
                      >
                        Fechar Ficha
                      </Button>
                    )}
                  </div>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL: NOVA USINA (COM TODOS OS CAMPOS TÉCNICOS)          */}
      {/* ======================================================== */}
      <Dialog open={modalNovaUsinaOpen} onOpenChange={setModalNovaUsinaOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-[#0F2038]">
              <Sun className="w-5 h-5 text-[#E0A838]" />
              <span>Adicionar Nova Usina ao Cliente</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre uma nova usina vinculada a <strong>{clienteNome}</strong> com seus dados
              técnicos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-slate-700">
                Nome / Identificação da Usina *
              </Label>
              <Input
                value={novaUsinaNome}
                onChange={(e) => setNovaUsinaNome(e.target.value)}
                placeholder="Ex: Usina 2 - Comercial Passo Fundo"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Endereço de Instalação</Label>
              <Input
                value={novaUsinaEndereco}
                onChange={(e) => setNovaUsinaEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade/UF"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Potência do Sistema (kWp)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={novaUsinaPotencia}
                  onChange={(e) => setNovaUsinaPotencia(e.target.value)}
                  placeholder="Ex: 15.0"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Quantidade de Módulos</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={novaUsinaQtdModulos}
                  onChange={(e) => setNovaUsinaQtdModulos(e.target.value)}
                  placeholder="Ex: 25"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Inversor (Marca / Modelo / Potência)
                </Label>
                <Input
                  value={novaUsinaInversores}
                  onChange={(e) => setNovaUsinaInversores(e.target.value)}
                  placeholder="Ex: Deye SUN-15K-G04 (15 kWp)"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Geração Estimada (kWh/mês)
                </Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={novaUsinaGeracao}
                  onChange={(e) => setNovaUsinaGeracao(e.target.value)}
                  placeholder="Ex: 2050"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Data de Instalação</Label>
                <Input
                  type="date"
                  value={novaUsinaDataInstalacao}
                  onChange={(e) => setNovaUsinaDataInstalacao(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Número do Medidor</Label>
                <Input
                  value={novaUsinaNumeroMedidor}
                  onChange={(e) => setNovaUsinaNumeroMedidor(e.target.value)}
                  placeholder="Ex: MED-PF-991204"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">Status</Label>
                <select
                  value={novaUsinaStatus}
                  onChange={(e) => setNovaUsinaStatus(e.target.value as 'ativo' | 'inativo')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Tipo de Usina</Label>
                <select
                  value={novaUsinaTipo}
                  onChange={(e) => setNovaUsinaTipo(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                >
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="industrial">Industrial</option>
                  <option value="rural">Rural</option>
                  <option value="investidor">Investidor</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Estrutura</Label>
                <select
                  value={novaUsinaEstrutura}
                  onChange={(e) => setNovaUsinaEstrutura(e.target.value as 'telhado' | 'solo')}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
                >
                  <option value="telhado">Telhado</option>
                  <option value="solo">Solo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700">
                  Número da UC (Unidade Consumidora)
                </Label>
                <Input
                  value={novaUsinaNumeroUc}
                  onChange={(e) => setNovaUsinaNumeroUc(e.target.value)}
                  placeholder="Ex: 2008741529"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-slate-700">Concessionária</Label>
                <Input
                  value={novaUsinaConcessionaria}
                  onChange={(e) => setNovaUsinaConcessionaria(e.target.value)}
                  placeholder="Ex: RGE Sul"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">
                Vincular Contrato O&M Inicial (Opcional)
              </Label>
              <select
                value={novaUsinaContratoId}
                onChange={(e) => setNovaUsinaContratoId(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
              >
                <option value="">Sem contrato O&M vinculado</option>
                {contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero_contrato || `#${c.id.slice(0, 6)}`} — Plano {c.plano}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700">Observações Técnicas</Label>
              <textarea
                rows={2}
                value={novaUsinaObservacoes}
                onChange={(e) => setNovaUsinaObservacoes(e.target.value)}
                placeholder="Observações de acesso, padrão de entrada, particularidades da usina..."
                className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2 text-xs shadow-xs focus:border-[#0F2038] focus:outline-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalNovaUsinaOpen(false)}
              disabled={isSavingNovaUsina}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarNovaUsina}
              disabled={isSavingNovaUsina}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
            >
              {isSavingNovaUsina ? 'Salvando...' : 'Cadastrar Usina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Vincular Contrato O&M */}
      <Dialog open={modalVincularOpen} onOpenChange={setModalVincularOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#0F2038]">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span>Vincular Contrato O&M à Usina</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {usinaSelecionadaParaVincular && (
                <span>
                  Selecione o contrato para vincular à usina{' '}
                  <strong>{usinaSelecionadaParaVincular.nome}</strong>.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 text-xs">
            {contratos.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
                <p className="font-bold">Nenhum contrato O&M cadastrado para este cliente.</p>
                <p className="text-[11px]">
                  Gere um Contrato O&M oficial com os dados da usina para iniciar a cobertura
                  técnica.
                </p>
                {onAbrirModalNovoContrato && usinaSelecionadaParaVincular && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const u = usinaSelecionadaParaVincular
                      setModalVincularOpen(false)
                      onAbrirModalNovoContrato(u)
                    }}
                    className="w-full bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Gerar Novo Contrato O&M para esta Usina
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700">
                  Contratos O&M Disponíveis
                </Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contratos.map((c) => {
                    const statusCalc = calcularStatusDinamicoContrato(c)
                    const isSelected = contratoSelecionadoId === c.id
                    return (
                      <div
                        key={c.id}
                        onClick={() => setContratoSelecionadoId(c.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#0F2038] bg-slate-50 ring-1 ring-[#0F2038]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {c.numero_contrato || `Contrato #${c.id.slice(0, 8)}`}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusCalc.badgeColorClass}`}
                          >
                            {statusCalc.badgeLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-600">
                          <span>Plano {c.plano}</span>
                          {podeVerValoresFinanceiros ? (
                            <span className="font-bold text-emerald-800">
                              {formatCurrency(c.valor_mensal)}/mês
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Valores restritos</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Vigência: {formatDate(c.data_inicio)} até {formatDate(c.data_vencimento)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalVincularOpen(false)}
              disabled={isVinculando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSalvarVinculoContrato}
              disabled={isVinculando || !contratoSelecionadoId}
              className="bg-[#0F2038] hover:bg-[#1A365D] text-white font-bold"
            >
              {isVinculando ? 'Vinculando...' : 'Confirmar Vínculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

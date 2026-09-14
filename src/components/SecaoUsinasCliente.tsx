import React, { useState } from 'react'
import {
  Sun,
  MapPin,
  Zap,
  Layers,
  Cpu,
  FileCheck2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  FileText,
  Building,
} from 'lucide-react'
import { UsinaCliente, ContratoOM } from '@/types/crm'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { calcularStatusDinamicoContrato } from '@/lib/contratoStatusDinamico'
import { InlineEditField } from '@/components/InlineEditField'
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

interface SecaoUsinasClienteProps {
  clienteId: string
  clienteNome: string
  usinas: UsinaCliente[]
  contratos: ContratoOM[]
  onUpdateUsina: (usinaId: string, data: Partial<UsinaCliente>) => Promise<void>
  onCreateUsina: (
    data: Partial<UsinaCliente> & { cliente_id: string; nome: string },
  ) => Promise<void>
  onDeleteUsina: (usinaId: string) => Promise<void>
  onVincularContrato: (usinaId: string, contratoId: string) => Promise<void>
  onRenovarContrato: (contratoId: string) => Promise<void>
  onVerDetalhesContrato: (contratoId: string) => void
}

export const SecaoUsinasCliente: React.FC<SecaoUsinasClienteProps> = ({
  clienteId,
  clienteNome,
  usinas,
  contratos,
  onUpdateUsina,
  onCreateUsina,
  onDeleteUsina,
  onVincularContrato,
  onRenovarContrato,
  onVerDetalhesContrato,
}) => {
  // Modal Nova Usina
  const [modalNovaUsinaOpen, setModalNovaUsinaOpen] = useState(false)
  const [novaUsinaNome, setNovaUsinaNome] = useState('')
  const [novaUsinaEndereco, setNovaUsinaEndereco] = useState('')
  const [novaUsinaPotencia, setNovaUsinaPotencia] = useState('')
  const [novaUsinaQtdModulos, setNovaUsinaQtdModulos] = useState('')
  const [novaUsinaInversores, setNovaUsinaInversores] = useState('')
  const [novaUsinaEstrutura, setNovaUsinaEstrutura] = useState<'telhado' | 'solo'>('telhado')
  const [novaUsinaContratoId, setNovaUsinaContratoId] = useState<string>('')
  const [isSavingNovaUsina, setIsSavingNovaUsina] = useState(false)

  // Modal Vincular Contrato
  const [modalVincularOpen, setModalVincularOpen] = useState(false)
  const [usinaSelecionadaParaVincular, setUsinaSelecionadaParaVincular] =
    useState<UsinaCliente | null>(null)
  const [contratoSelecionadoId, setContratoSelecionadoId] = useState('')
  const [isVinculando, setIsVinculando] = useState(false)

  // Modal Renovar Contrato
  const [modalRenovarOpen, setModalRenovarOpen] = useState(false)
  const [contratoParaRenovar, setContratoParaRenovar] = useState<{
    usina: UsinaCliente
    contrato: ContratoOM
  } | null>(null)
  const [isRenovando, setIsRenovando] = useState(false)

  const handleOpenNovaUsina = () => {
    setNovaUsinaNome(`Usina ${usinas.length + 1} - ${clienteNome.split(' ')[0]}`)
    setNovaUsinaEndereco('')
    setNovaUsinaPotencia('')
    setNovaUsinaQtdModulos('')
    setNovaUsinaInversores('')
    setNovaUsinaEstrutura('telhado')
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
      await onCreateUsina({
        cliente_id: clienteId,
        nome: novaUsinaNome.trim(),
        endereco: novaUsinaEndereco.trim(),
        potencia_kwp: Number(novaUsinaPotencia) || 0,
        qtd_modulos: Number(novaUsinaQtdModulos) || 0,
        inversores_info: novaUsinaInversores.trim(),
        tipo_estrutura: novaUsinaEstrutura,
        contrato_id: novaUsinaContratoId || undefined,
      })
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
      await onVincularContrato(usinaSelecionadaParaVincular.id, contratoSelecionadoId)
      setModalVincularOpen(false)
      setUsinaSelecionadaParaVincular(null)
    } catch (err) {
      console.error('Erro ao vincular contrato:', err)
      alert('Erro ao vincular contrato. Tente novamente.')
    } finally {
      setIsVinculando(false)
    }
  }

  const handleConfirmarRenovacao = async () => {
    if (!contratoParaRenovar) return
    setIsRenovando(true)
    try {
      await onRenovarContrato(contratoParaRenovar.contrato.id)
      setModalRenovarOpen(false)
      setContratoParaRenovar(null)
    } catch (err) {
      console.error('Erro ao renovar contrato:', err)
      alert('Erro ao renovar contrato. Tente novamente.')
    } finally {
      setIsRenovando(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-emerald-200 shadow-xs space-y-4">
      {/* Header da seção */}
      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
            <Sun className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-2">
              <span>Usinas do Cliente</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                {usinas.length} {usinas.length === 1 ? 'usina cadastrada' : 'usinas cadastradas'}
              </span>
            </h4>
            <p className="text-[11px] text-gray-500">
              Gerencie cada usina com seus dados técnicos e o respectivo Contrato O&M vinculado.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenNovaUsina}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-transform hover:scale-[1.02]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Nova Usina</span>
        </button>
      </div>

      {/* Lista de Usinas */}
      {usinas.length === 0 ? (
        <div className="p-6 text-center bg-gray-50/70 rounded-xl border border-dashed border-gray-200 space-y-2">
          <Sun className="w-8 h-8 text-gray-300 mx-auto" />
          <p className="text-xs font-semibold text-gray-600">
            Nenhuma usina cadastrada para este cliente.
          </p>
          <p className="text-[11px] text-gray-400">
            Clique no botão acima para cadastrar a primeira usina do cliente.
          </p>
          <button
            type="button"
            onClick={handleOpenNovaUsina}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Primeira Usina</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {usinas.map((usina, index) => {
            // Achar o contrato vinculado
            const contratoVinculado =
              usina.expand?.contrato_id || contratos.find((c) => c.id === usina.contrato_id) || null

            const statusCalc = contratoVinculado
              ? calcularStatusDinamicoContrato(contratoVinculado)
              : null

            return (
              <div
                key={usina.id}
                className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden transition-all hover:border-emerald-300"
              >
                {/* Cabeçalho do Card da Usina */}
                <div className="bg-gradient-to-r from-gray-50 to-emerald-50/30 p-3.5 border-b border-gray-200 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        #{index + 1}
                      </span>
                      <InlineEditField
                        value={usina.nome}
                        displayValue={
                          <h5 className="text-sm font-bold text-gray-900 truncate hover:text-emerald-700">
                            {usina.nome}
                          </h5>
                        }
                        type="text"
                        placeholder="Nome da usina"
                        onSave={async (val) => {
                          const str = String(val).trim()
                          if (!str) throw new Error('Nome da usina não pode ficar vazio')
                          await onUpdateUsina(usina.id, { nome: str })
                        }}
                      />
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          usina.tipo_estrutura === 'solo'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                        }`}
                      >
                        {usina.tipo_estrutura === 'solo' ? 'Estrutura Solo' : 'Estrutura Telhado'}
                      </span>
                    </div>

                    {/* Endereço com edição inline */}
                    <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <InlineEditField
                        value={usina.endereco || ''}
                        displayValue={
                          <span className="truncate text-gray-700 font-medium">
                            {usina.endereco || 'Endereço não informado'}
                          </span>
                        }
                        type="text"
                        placeholder="Endereço de instalação da usina"
                        onSave={async (val) => {
                          await onUpdateUsina(usina.id, { endereco: String(val).trim() })
                        }}
                      />
                    </div>
                  </div>

                  {/* Ações da Usina (Excluir) */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const confirmou = window.confirm(
                          `Deseja realmente excluir a usina "${usina.nome}"?`,
                        )
                        if (confirmou) {
                          onDeleteUsina(usina.id)
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Excluir usina"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grid de Dados Técnicos da Usina */}
                <div className="p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-white text-xs border-b border-gray-100">
                  {/* Potência */}
                  <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-0.5">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-600" />
                      Potência
                    </div>
                    <InlineEditField
                      value={usina.potencia_kwp || 0}
                      displayValue={
                        <div className="font-extrabold text-emerald-950 text-sm">
                          {usina.potencia_kwp || 0}{' '}
                          <span className="text-xs font-semibold">kWp</span>
                        </div>
                      }
                      type="number"
                      step="0.1"
                      min={0}
                      unit="kWp"
                      onSave={async (val) => {
                        await onUpdateUsina(usina.id, { potencia_kwp: Number(val) || 0 })
                      }}
                    />
                  </div>

                  {/* Qtd Módulos */}
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Layers className="w-3 h-3 text-blue-600" />
                      Qtd. Módulos
                    </div>
                    <InlineEditField
                      value={usina.qtd_modulos || 0}
                      displayValue={
                        <div className="font-bold text-gray-900 text-sm">
                          {usina.qtd_modulos || 0}{' '}
                          <span className="text-xs font-normal text-gray-500">un</span>
                        </div>
                      }
                      type="number"
                      step="1"
                      min={0}
                      unit="un"
                      onSave={async (val) => {
                        await onUpdateUsina(usina.id, { qtd_modulos: Number(val) || 0 })
                      }}
                    />
                  </div>

                  {/* Tipo de Estrutura */}
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Building className="w-3 h-3 text-amber-600" />
                      Estrutura
                    </div>
                    <InlineEditField
                      value={usina.tipo_estrutura || 'telhado'}
                      displayValue={
                        <div className="font-bold text-gray-800 capitalize text-sm">
                          {usina.tipo_estrutura === 'solo' ? 'Solo' : 'Telhado'}
                        </div>
                      }
                      type="select"
                      options={[
                        { value: 'telhado', label: 'Telhado' },
                        { value: 'solo', label: 'Solo' },
                      ]}
                      onSave={async (val) => {
                        await onUpdateUsina(usina.id, { tipo_estrutura: val as 'solo' | 'telhado' })
                      }}
                    />
                  </div>

                  {/* Inversores */}
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 space-y-0.5">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-purple-600" />
                      Inversores
                    </div>
                    <InlineEditField
                      value={usina.inversores_info || ''}
                      displayValue={
                        <div
                          className="font-semibold text-gray-800 truncate text-xs"
                          title={usina.inversores_info}
                        >
                          {usina.inversores_info || 'Não informado'}
                        </div>
                      }
                      type="text"
                      placeholder="Marca e potência dos inversores"
                      onSave={async (val) => {
                        await onUpdateUsina(usina.id, { inversores_info: String(val).trim() })
                      }}
                    />
                  </div>
                </div>

                {/* BLOCO DO CONTRATO O&M VINCULADO */}
                <div className="p-3.5 bg-slate-50/70">
                  {contratoVinculado && statusCalc ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-2.5 shadow-xs">
                      {/* Topo do Contrato */}
                      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-gray-900 text-xs">
                            Contrato O&M{' '}
                            {contratoVinculado.numero_contrato ||
                              `#${contratoVinculado.id.slice(0, 8)}`}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Plano {contratoVinculado.plano}
                          </span>
                        </div>

                        {/* Status do Contrato calculado dinamicamente */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-md border flex items-center gap-1.5 ${statusCalc.badgeColorClass}`}
                          >
                            {statusCalc.status === 'Ativo' && (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            )}
                            {statusCalc.status === 'Próximo do vencimento' && (
                              <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            )}
                            {statusCalc.status === 'Encerrado' && (
                              <AlertTriangle className="w-3 h-3 text-gray-500" />
                            )}
                            <span>{statusCalc.badgeLabel}</span>
                            {statusCalc.diasRestantes !== null &&
                              statusCalc.status === 'Próximo do vencimento' && (
                                <span className="text-[10px] opacity-80">
                                  ({statusCalc.diasRestantes}d)
                                </span>
                              )}
                          </span>
                        </div>
                      </div>

                      {/* Dados do Contrato */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase font-medium">
                            Início:
                          </span>
                          <span className="font-semibold text-gray-800">
                            {formatDate(contratoVinculado.data_inicio)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase font-medium">
                            Término / Vigência:
                          </span>
                          <span className="font-semibold text-gray-800">
                            {formatDate(contratoVinculado.data_vencimento)}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase font-medium">
                            Valor Mensal:
                          </span>
                          <span className="font-bold text-emerald-700">
                            {formatCurrency(contratoVinculado.valor_mensal)}/mês
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-gray-400 block uppercase font-medium">
                            Valor Anual:
                          </span>
                          <span className="font-semibold text-gray-700">
                            {formatCurrency(contratoVinculado.valor_anual)}
                          </span>
                        </div>
                      </div>

                      {/* Botões de Ação do Contrato */}
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 flex-wrap">
                        {statusCalc.status === 'Encerrado' && (
                          <button
                            type="button"
                            onClick={() => {
                              setContratoParaRenovar({ usina, contrato: contratoVinculado })
                              setModalRenovarOpen(true)
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Renovar Contrato</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenVincularContrato(usina)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg text-xs font-semibold border border-gray-200 transition-colors"
                          title="Trocar contrato O&M vinculado a esta usina"
                        >
                          <Edit2 className="w-3 h-3 text-gray-500" />
                          <span>Trocar Vínculo</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onVerDetalhesContrato(contratoVinculado.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Ver detalhes</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Sem contrato O&M vinculado */
                    <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold text-amber-900 block">
                            Nenhum Contrato O&M vinculado a esta usina
                          </span>
                          <span className="text-[11px] text-amber-700">
                            Vincule um plano ativo ou existente para cobertura de manutenção e
                            garantia técnica.
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenVincularContrato(usina)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#16A34A] hover:bg-[#15803D] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        <FileCheck2 className="w-3.5 h-3.5" />
                        <span>Vincular Contrato</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: Nova Usina */}
      <Dialog open={modalNovaUsinaOpen} onOpenChange={setModalNovaUsinaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Sun className="w-5 h-5 text-emerald-600" />
              <span>Cadastrar Nova Usina</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Adicione os dados da usina para {clienteNome}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="text-xs font-bold text-gray-700">
                Nome / Identificação da Usina *
              </Label>
              <Input
                value={novaUsinaNome}
                onChange={(e) => setNovaUsinaNome(e.target.value)}
                placeholder="Ex: Usina Mercado Matriz, Usina Galpão 2"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700">Endereço de Instalação</Label>
              <Input
                value={novaUsinaEndereco}
                onChange={(e) => setNovaUsinaEndereco(e.target.value)}
                placeholder="Rua, número, bairro, cidade/UF"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-700">Potência do Sistema (kWp)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={novaUsinaPotencia}
                  onChange={(e) => setNovaUsinaPotencia(e.target.value)}
                  placeholder="Ex: 15.5"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">Qtd. de Módulos</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={novaUsinaQtdModulos}
                  onChange={(e) => setNovaUsinaQtdModulos(e.target.value)}
                  placeholder="Ex: 34"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-gray-700">Tipo de Estrutura</Label>
                <select
                  value={novaUsinaEstrutura}
                  onChange={(e) => setNovaUsinaEstrutura(e.target.value as 'telhado' | 'solo')}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="telhado">Telhado</option>
                  <option value="solo">Solo</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-gray-700">Contrato O&M Vinculado</Label>
                <select
                  value={novaUsinaContratoId}
                  onChange={(e) => setNovaUsinaContratoId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-xs shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Sem contrato O&M (avulsa)</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.numero_contrato || `#${c.id.slice(0, 6)}`} — Plano {c.plano} (
                      {formatCurrency(c.valor_mensal)}/mês)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-700">
                Marca e Potência dos Inversores
              </Label>
              <Input
                value={novaUsinaInversores}
                onChange={(e) => setNovaUsinaInversores(e.target.value)}
                placeholder="Ex: Growatt MAX 30KTL3-X LV (30 kWp)"
                className="mt-1"
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
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
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <FileCheck2 className="w-5 h-5 text-emerald-600" />
              <span>Vincular Contrato O&M à Usina</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
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
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                <p className="font-bold">Nenhum contrato O&M cadastrado para este cliente.</p>
                <p className="text-[11px]">
                  Gere uma Proposta O&M ou acesse a aba O&M para cadastrar um contrato.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-gray-700">Contratos O&M Disponíveis</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {contratos.map((c) => {
                    const statusCalc = calcularStatusDinamicoContrato(c)
                    const isSelected = contratoSelecionadoId === c.id
                    return (
                      <div
                        key={c.id}
                        onClick={() => setContratoSelecionadoId(c.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">
                            {c.numero_contrato || `Contrato #${c.id.slice(0, 8)}`}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusCalc.badgeColorClass}`}
                          >
                            {statusCalc.badgeLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-gray-600">
                          <span>Plano {c.plano}</span>
                          <span className="font-bold text-emerald-800">
                            {formatCurrency(c.valor_mensal)}/mês
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1">
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
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isVinculando ? 'Vinculando...' : 'Confirmar Vínculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Renovar Contrato */}
      <Dialog open={modalRenovarOpen} onOpenChange={setModalRenovarOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
              <Clock className="w-5 h-5 text-amber-600" />
              <span>Renovar Contrato O&M</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Estender vigência por mais 12 meses para reativar a cobertura técnica.
            </DialogDescription>
          </DialogHeader>

          {contratoParaRenovar && (
            <div className="py-2 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <div className="font-bold">Usina: {contratoParaRenovar.usina.nome}</div>
                <div>
                  Contrato:{' '}
                  {contratoParaRenovar.contrato.numero_contrato ||
                    `#${contratoParaRenovar.contrato.id.slice(0, 8)}`}
                </div>
                <div>
                  Plano: {contratoParaRenovar.contrato.plano} • Valor:{' '}
                  {formatCurrency(contratoParaRenovar.contrato.valor_mensal)}/mês
                </div>
                <div className="text-[11px] text-amber-700 pt-1">
                  O contrato passará para status <strong>Ativo</strong> com término estendido por
                  mais 12 meses a partir de hoje.
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalRenovarOpen(false)}
              disabled={isRenovando}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarRenovacao}
              disabled={isRenovando}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              {isRenovando ? 'Renovando...' : 'Confirmar Renovação (+12 meses)'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

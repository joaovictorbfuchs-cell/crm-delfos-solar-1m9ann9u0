import React, { useState } from 'react'
import {
  X,
  MapPin,
  Phone,
  Home,
  FileText,
  Calendar,
  Zap,
  Cpu,
  Layers,
  Image as ImageIcon,
  Clock,
  Wrench,
  Droplets,
  Settings,
  Mail,
  User,
  Building,
  Hash,
  Compass,
  Activity,
  Gauge,
  Sun,
  DollarSign,
  TrendingUp,
  Tag,
  Filter,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatCurrency, formatDate, getTelhadoLabel } from '@/lib/formatters'
import { StatusBadge, ProductBadge } from './StatusBadge'
import { InlineEditField } from './InlineEditField'
import { AtividadeItem } from './AtividadeItem'
import { QuickAddAtividade } from './QuickAddAtividade'
import type {
  Cliente,
  Sistema,
  ClienteStatus,
  OrigemLeadTipo,
  ProdutoTipo,
  TelhadoTipo,
  TipoAtendimento,
  NumeroFases,
} from '@/types/crm'

const PRODUTOS: ProdutoTipo[] = [
  'Energia Solar',
  'Plano de O&M',
  'Sistemas Híbridos',
  'Carregadores veiculares',
  'Manutenção avulsa',
]

const ETAPAS_STATUS: { value: ClienteStatus; label: string }[] = [
  { value: 'Novo Lead', label: '1 - Novo Lead' },
  { value: 'Levantamento', label: '2 - Levantamento' },
  { value: 'Orçamento', label: '3 - Orçamento' },
  { value: 'Negociação', label: '4 - Negociação' },
  { value: 'Fechado', label: '5 - Fechado' },
  { value: 'Contato Futuro', label: '6 - Contato Futuro' },
]

const TELHADOS: { value: TelhadoTipo; label: string }[] = [
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'metalico', label: 'Metálico' },
  { value: 'laje', label: 'Laje' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
]

const ATENDIMENTOS: { value: TipoAtendimento; label: string }[] = [
  { value: 'aéreo', label: 'Aéreo' },
  { value: 'subterrâneo', label: 'Subterrâneo' },
]

const FASES: { value: NumeroFases; label: string }[] = [
  { value: 'monofásico', label: 'Monofásico' },
  { value: 'bifásico', label: 'Bifásico' },
  { value: 'trifásico', label: 'Trifásico' },
]

type FichaTab = 'detalhes' | 'atividades' | 'anotacoes'

export const FichaClienteDrawer: React.FC = () => {
  const {
    selectedCliente,
    selectedClienteId,
    selectedSistema,
    closeFichaCliente,
    manutencoes,
    atividades,
    updateCliente,
    updateClienteStatus,
    updateSistema,
    addAtividade,
    removeAtividade,
  } = useClientes()

  const [activeTab, setActiveTab] = useState<FichaTab>('detalhes')
  const [atividadeFiltro, setAtividadeFiltro] = useState<string>('todos')

  if (!selectedClienteId || !selectedCliente) {
    return null
  }

  const handleUpdateClienteField = async (field: keyof Cliente, value: unknown) => {
    await updateCliente(selectedCliente.id, { [field]: value } as Partial<Cliente>)
  }

  const handleUpdateSistemaField = async (field: keyof Sistema, value: unknown) => {
    await updateSistema(selectedCliente.id, { [field]: value } as Partial<Sistema>)
    if (field === 'potencia_total_kwp') {
      await updateCliente(selectedCliente.id, { potencia_kwp: Number(value) || 0 })
    } else if (field === 'numero_uc') {
      await updateCliente(selectedCliente.id, { uc: String(value || '') })
    } else if (field === 'data_instalacao') {
      await updateCliente(selectedCliente.id, { data_instalacao: String(value || '') })
    } else if (field === 'tipo_telhado') {
      await updateCliente(selectedCliente.id, { telhado_tipo: value as TelhadoTipo })
    }
  }

  // Filtrar atividades do cliente e ordenar: mais recentes no topo
  const allClientAtividades = atividades
    .filter((a) => a.cliente_id === selectedCliente.id)
    .sort(
      (a, b) => new Date(b.data || b.created).getTime() - new Date(a.data || a.created).getTime(),
    )

  // Lista para aba Atividades (unificada, podendo filtrar por tipo)
  const clientAtividades = allClientAtividades.filter((a) => {
    if (atividadeFiltro === 'todos') return true
    return a.tipo === atividadeFiltro
  })

  // Lista para aba Anotações (apenas anotações)
  const clientAnotacoes = allClientAtividades.filter((a) => a.tipo === 'anotacao')

  // Manutenções do cliente
  const clientManutencoes = manutencoes
    .filter((m) => m.cliente_id === selectedCliente.id)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  const getServiceIcon = (tipo: string) => {
    switch (tipo) {
      case 'Limpeza':
        return <Droplets className="w-4 h-4 text-blue-500" />
      case 'Revisão Elétrica':
        return <Zap className="w-4 h-4 text-amber-500" />
      case 'Troca de Inversor':
        return <Settings className="w-4 h-4 text-purple-500" />
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />
    }
  }

  const potenciaExibida = selectedSistema?.potencia_total_kwp ?? selectedCliente.potencia_kwp ?? 0
  const geracaoExibida =
    selectedSistema?.geracao_media_mensal_kwh ??
    (potenciaExibida > 0 ? Math.round(potenciaExibida * 125) : 0)
  const dataInstalacaoExibida =
    selectedSistema?.data_instalacao || selectedCliente.data_instalacao || ''
  const ucExibida = selectedSistema?.numero_uc || selectedCliente.uc || ''
  const telhadoExibido = selectedSistema?.tipo_telhado || selectedCliente.telhado_tipo || 'ceramico'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={closeFichaCliente}
        aria-hidden="true"
      />

      {/* Drawer panel: 780px desktop, full screen on mobile */}
      <div className="relative z-50 w-full sm:w-[780px] max-w-full sm:max-w-[95vw] bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* Top Header unificado com dados essenciais e fechar */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0 pr-2">
            <InlineEditField
              value={selectedCliente.nome}
              displayValue={
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">
                  {selectedCliente.nome}
                </h2>
              }
              type="text"
              placeholder="Nome do cliente"
              onSave={async (val) => {
                const str = String(val).trim()
                if (!str) throw new Error('O nome não pode ficar vazio')
                await handleUpdateClienteField('nome', str)
              }}
            />
            <StatusBadge status={selectedCliente.status} />
            <InlineEditField
              value={selectedCliente.produto || 'Energia Solar'}
              displayValue={
                <ProductBadge produto={selectedCliente.produto || 'Energia Solar'} size="sm" />
              }
              type="select"
              options={PRODUTOS.map((p) => ({ value: p, label: p }))}
              onSave={async (val) => handleUpdateClienteField('produto', val as ProdutoTipo)}
            />
          </div>

          <button
            onClick={closeFichaCliente}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors shrink-0"
            title="Fechar ficha"
            aria-label="Fechar ficha do cliente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Layout Pipedrive em 2 Colunas:
            - Desktop: Flex horizontal (painel principal à esquerda 60-65%, resumo fixo à direita 35-40%)
            - Mobile: Flex vertical (empilhado)
        */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-[#F8FAF9]/70">
          {/* ================================================================ */}
          {/* COLUNA ESQUERDA: PAINEL PRINCIPAL COM ABAS (DETALHES / ATIVIDADES / ANOTAÇÕES) */}
          {/* ================================================================ */}
          <div className="flex-1 overflow-y-auto flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-gray-200/80 bg-white">
            {/* Header das Abas */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('detalhes')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'detalhes'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/50 rounded-t-md'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Detalhes
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('atividades')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 relative ${
                    activeTab === 'atividades'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/50 rounded-t-md'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Atividades
                  {allClientAtividades.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                      {allClientAtividades.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('anotacoes')}
                  className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'anotacoes'
                      ? 'border-[#16A34A] text-[#166534] bg-emerald-50/50 rounded-t-md'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  Anotações
                  {clientAnotacoes.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                      {clientAnotacoes.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Conteúdo da Aba Selecionada */}
            <div className="p-4 space-y-4 flex-1">
              {/* ======================================================== */}
              {/* ABA 1: DETALHES (DADOS CADASTRAIS + DADOS TÉCNICOS)      */}
              {/* ======================================================== */}
              {activeTab === 'detalhes' && (
                <div className="space-y-4">
                  {/* Destaque Inicial: Geração Média Mensal */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium text-emerald-100">
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-bold">
                        <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
                        Geração Média Mensal (kWh)
                      </span>
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                        Estimativa Solar
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1">
                      <InlineEditField
                        value={selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida}
                        displayValue={
                          <span className="text-2xl font-black tracking-tight text-white">
                            {(
                              selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida
                            ).toLocaleString('pt-BR')}
                          </span>
                        }
                        type="number"
                        unit="kWh/mês"
                        step="1"
                        min={0}
                        className="text-white"
                        inputClassName="text-gray-900"
                        onSave={async (val) =>
                          handleUpdateSistemaField('geracao_media_mensal_kwh', Number(val))
                        }
                      />
                      <span className="text-sm font-semibold text-emerald-100">kWh / mês</span>
                    </div>
                    <p className="text-[11px] text-emerald-100/90 pt-0.5">
                      Baseado na irradiação da região e potência instalada ({potenciaExibida} kWp).
                    </p>
                  </div>

                  {/* Seção Dados Cadastrais */}
                  <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-200/70 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        Dados Cadastrais
                      </h3>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">
                        PF / PJ
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500 w-24 shrink-0">Nome completo:</span>
                        <InlineEditField
                          value={selectedCliente.nome}
                          displayValue={
                            <span className="font-semibold text-gray-800">
                              {selectedCliente.nome}
                            </span>
                          }
                          type="text"
                          placeholder="Nome do cliente"
                          onSave={async (val) => handleUpdateClienteField('nome', String(val))}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500 w-24 shrink-0">Nome fantasia:</span>
                        <InlineEditField
                          value={selectedCliente.nome_fantasia}
                          displayValue={
                            <span className="font-medium text-gray-800">
                              {selectedCliente.nome_fantasia || 'Não informado'}
                            </span>
                          }
                          type="text"
                          placeholder="Nome comercial ou fazenda"
                          onSave={async (val) =>
                            handleUpdateClienteField('nome_fantasia', String(val))
                          }
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500 w-24 shrink-0">Razão social:</span>
                        <InlineEditField
                          value={selectedCliente.razao_social}
                          displayValue={
                            <span className="font-medium text-gray-800">
                              {selectedCliente.razao_social || 'Não informada'}
                            </span>
                          }
                          type="text"
                          placeholder="Razão social completa"
                          onSave={async (val) =>
                            handleUpdateClienteField('razao_social', String(val))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-16 shrink-0">CNPJ:</span>
                          <InlineEditField
                            value={selectedCliente.cnpj}
                            displayValue={
                              <span className="font-mono text-gray-800 text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                {selectedCliente.cnpj || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="00.000.000/0000-00"
                            onSave={async (val) => handleUpdateClienteField('cnpj', String(val))}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-12 shrink-0">CPF:</span>
                          <InlineEditField
                            value={selectedCliente.cpf}
                            displayValue={
                              <span className="font-mono text-gray-800 text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                {selectedCliente.cpf || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="000.000.000-00"
                            onSave={async (val) => handleUpdateClienteField('cpf', String(val))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-16 shrink-0">Inscr. Est.:</span>
                          <InlineEditField
                            value={selectedCliente.inscricao_estadual}
                            displayValue={
                              <span className="text-gray-800">
                                {selectedCliente.inscricao_estadual || 'Não informada'}
                              </span>
                            }
                            type="text"
                            placeholder="039/0129482 ou Isento"
                            onSave={async (val) =>
                              handleUpdateClienteField('inscricao_estadual', String(val))
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-12 shrink-0">RG:</span>
                          <InlineEditField
                            value={selectedCliente.rg}
                            displayValue={
                              <span className="text-gray-800">
                                {selectedCliente.rg || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            placeholder="RG"
                            onSave={async (val) => handleUpdateClienteField('rg', String(val))}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500 w-24 shrink-0">Nasc./Fund.:</span>
                        <InlineEditField
                          value={selectedCliente.data_nascimento_fundacao}
                          displayValue={
                            <span className="font-medium text-gray-800">
                              {selectedCliente.data_nascimento_fundacao
                                ? formatDate(selectedCliente.data_nascimento_fundacao)
                                : 'Não informada'}
                            </span>
                          }
                          type="date"
                          placeholder="DD/MM/AAAA"
                          onSave={async (val) =>
                            handleUpdateClienteField('data_nascimento_fundacao', String(val))
                          }
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500 w-24 shrink-0">Contato resp.:</span>
                        <InlineEditField
                          value={selectedCliente.contato}
                          displayValue={
                            <span className="font-medium text-gray-800">
                              {selectedCliente.contato || 'Não informado'}
                            </span>
                          }
                          type="text"
                          placeholder="Nome do responsável ou sócio"
                          onSave={async (val) => handleUpdateClienteField('contato', String(val))}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500 w-24 shrink-0">Email:</span>
                        <InlineEditField
                          value={selectedCliente.email}
                          displayValue={
                            <span className="text-emerald-700 font-medium">
                              {selectedCliente.email || 'Não informado'}
                            </span>
                          }
                          type="text"
                          placeholder="email@exemplo.com.br"
                          onSave={async (val) => handleUpdateClienteField('email', String(val))}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-gray-500 w-24 shrink-0">Telefone:</span>
                        <InlineEditField
                          value={selectedCliente.telefone}
                          displayValue={
                            <span className="font-medium text-gray-800">
                              {selectedCliente.telefone || 'Não informado'}
                            </span>
                          }
                          type="text"
                          placeholder="(00) 00000-0000"
                          onSave={async (val) => handleUpdateClienteField('telefone', String(val))}
                        />
                      </div>

                      {/* Endereço detalhado */}
                      <div className="pt-2 border-t border-gray-200/60 space-y-2">
                        <div className="flex items-center gap-2">
                          <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-24 shrink-0">Logradouro:</span>
                          <InlineEditField
                            value={selectedCliente.endereco}
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {selectedCliente.endereco || 'Não informado'}
                              </span>
                            }
                            type="text"
                            placeholder="Rua, Av..."
                            className="flex-1"
                            onSave={async (val) =>
                              handleUpdateClienteField('endereco', String(val))
                            }
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-16 shrink-0 pl-5">Número:</span>
                            <InlineEditField
                              value={selectedCliente.numero}
                              displayValue={
                                <span className="text-gray-800">
                                  {selectedCliente.numero || 'S/N'}
                                </span>
                              }
                              type="text"
                              placeholder="Nº"
                              onSave={async (val) =>
                                handleUpdateClienteField('numero', String(val))
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-16 shrink-0">Bairro:</span>
                            <InlineEditField
                              value={selectedCliente.bairro}
                              displayValue={
                                <span className="text-gray-800">
                                  {selectedCliente.bairro || 'Não inf.'}
                                </span>
                              }
                              type="text"
                              placeholder="Bairro"
                              onSave={async (val) =>
                                handleUpdateClienteField('bairro', String(val))
                              }
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-16 shrink-0 pl-5">CEP:</span>
                            <InlineEditField
                              value={selectedCliente.cep}
                              displayValue={
                                <span className="font-mono text-gray-800 text-[11px]">
                                  {selectedCliente.cep || '00000-000'}
                                </span>
                              }
                              type="text"
                              placeholder="00000-000"
                              onSave={async (val) => handleUpdateClienteField('cep', String(val))}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 w-16 shrink-0">Estado:</span>
                            <InlineEditField
                              value={
                                selectedCliente.estado ||
                                (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')
                              }
                              displayValue={
                                <span className="font-bold text-gray-800 uppercase">
                                  {selectedCliente.estado ||
                                    (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')}
                                </span>
                              }
                              type="text"
                              placeholder="RS / SC"
                              onSave={async (val) =>
                                handleUpdateClienteField('estado', String(val))
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-24 shrink-0 pl-5">Complemento:</span>
                          <InlineEditField
                            value={selectedCliente.complemento}
                            displayValue={
                              <span className="text-gray-700 italic">
                                {selectedCliente.complemento || 'Nenhum'}
                              </span>
                            }
                            type="text"
                            placeholder="Sala, bloco..."
                            className="flex-1"
                            onSave={async (val) =>
                              handleUpdateClienteField('complemento', String(val))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subseção Localização da Instalação */}
                  <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-200/70 space-y-2.5">
                    <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Localização da Instalação
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Cidade / UF:</span>
                        <InlineEditField
                          value={selectedCliente.cidade}
                          displayValue={
                            <span className="font-semibold text-gray-800">
                              {selectedCliente.cidade || 'Não informada'}
                            </span>
                          }
                          type="text"
                          placeholder="Cidade/UF"
                          onSave={async (val) => handleUpdateClienteField('cidade', String(val))}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-16 shrink-0">Latitude:</span>
                          <InlineEditField
                            value={selectedSistema?.latitude ?? 0}
                            displayValue={
                              <span className="font-mono text-gray-800 text-[11px]">
                                {selectedSistema?.latitude
                                  ? `${selectedSistema.latitude}°`
                                  : 'Não inf.'}
                              </span>
                            }
                            type="number"
                            step="0.0001"
                            unit="°"
                            placeholder="-27.6341"
                            onSave={async (val) =>
                              handleUpdateSistemaField('latitude', Number(val))
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-16 shrink-0">Longitude:</span>
                          <InlineEditField
                            value={selectedSistema?.longitude ?? 0}
                            displayValue={
                              <span className="font-mono text-gray-800 text-[11px]">
                                {selectedSistema?.longitude
                                  ? `${selectedSistema.longitude}°`
                                  : 'Não inf.'}
                              </span>
                            }
                            type="number"
                            step="0.0001"
                            unit="°"
                            placeholder="-52.2739"
                            onSave={async (val) =>
                              handleUpdateSistemaField('longitude', Number(val))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subseção Concessionária */}
                  <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-200/70 space-y-2.5">
                    <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-600" />
                      Concessionária de Energia
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Nº da UC:</span>
                        <InlineEditField
                          value={ucExibida}
                          displayValue={
                            <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">
                              {ucExibida || 'Não informada'}
                            </span>
                          }
                          type="text"
                          placeholder="Ex: 3012847561"
                          onSave={async (val) => handleUpdateSistemaField('numero_uc', String(val))}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 w-24 shrink-0">Padrão entrada:</span>
                        <InlineEditField
                          value={selectedSistema?.padrao_entrada ?? 'RIC BT Categoria A2'}
                          displayValue={
                            <span className="font-medium text-gray-800">
                              {selectedSistema?.padrao_entrada || 'Não informado'}
                            </span>
                          }
                          type="text"
                          placeholder="Ex: RIC BT Categoria A2"
                          onSave={async (val) =>
                            handleUpdateSistemaField('padrao_entrada', String(val))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-20 shrink-0">Atendimento:</span>
                          <InlineEditField
                            value={selectedSistema?.tipo_atendimento || 'aéreo'}
                            displayValue={
                              <span className="capitalize font-medium text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                                {selectedSistema?.tipo_atendimento || 'aéreo'}
                              </span>
                            }
                            type="select"
                            options={ATENDIMENTOS}
                            onSave={async (val) =>
                              handleUpdateSistemaField('tipo_atendimento', val as TipoAtendimento)
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16 shrink-0">Fases:</span>
                          <InlineEditField
                            value={selectedSistema?.numero_fases || 'trifásico'}
                            displayValue={
                              <span className="capitalize font-medium text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                                {selectedSistema?.numero_fases || 'trifásico'}
                              </span>
                            }
                            type="select"
                            options={FASES}
                            onSave={async (val) =>
                              handleUpdateSistemaField('numero_fases', val as NumeroFases)
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-20 shrink-0">Seção cabos:</span>
                          <InlineEditField
                            value={selectedSistema?.secao_cabos || '16 mm²'}
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {selectedSistema?.secao_cabos || 'Não informada'}
                              </span>
                            }
                            type="text"
                            unit="mm²"
                            placeholder="Ex: 16 mm²"
                            onSave={async (val) =>
                              handleUpdateSistemaField('secao_cabos', String(val))
                            }
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Gauge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-500 w-16 shrink-0">Disjuntor:</span>
                          <InlineEditField
                            value={selectedSistema?.amperagem_disjuntor || '40 A'}
                            displayValue={
                              <span className="font-semibold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                                {selectedSistema?.amperagem_disjuntor || 'Não inf.'}
                              </span>
                            }
                            type="text"
                            unit="A"
                            placeholder="Ex: 40 A"
                            onSave={async (val) =>
                              handleUpdateSistemaField('amperagem_disjuntor', String(val))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subseção Instalação Elétrica & Telhado */}
                  <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-200/70 space-y-2.5">
                    <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Instalação Elétrica e Telhado
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-gray-200">
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                          <Calendar className="w-3 h-3" />
                          Data Instalação
                        </div>
                        <InlineEditField
                          value={dataInstalacaoExibida}
                          displayValue={
                            <span className="font-bold text-gray-800">
                              {dataInstalacaoExibida
                                ? formatDate(dataInstalacaoExibida)
                                : 'Não definida'}
                            </span>
                          }
                          type="date"
                          placeholder="DD/MM/AAAA"
                          onSave={async (val) =>
                            handleUpdateSistemaField('data_instalacao', String(val))
                          }
                        />
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-gray-200">
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                          <Zap className="w-3 h-3 text-emerald-600" />
                          Potência Total
                        </div>
                        <InlineEditField
                          value={potenciaExibida}
                          displayValue={
                            <span className="font-black text-emerald-700 text-sm">
                              {potenciaExibida} kWp
                            </span>
                          }
                          type="number"
                          step="0.1"
                          min={0}
                          unit="kWp"
                          placeholder="0"
                          onSave={async (val) =>
                            handleUpdateSistemaField('potencia_total_kwp', Number(val))
                          }
                        />
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-gray-200">
                        <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                          <Home className="w-3 h-3" />
                          Tipo Telhado
                        </div>
                        <InlineEditField
                          value={telhadoExibido}
                          displayValue={
                            <span className="font-semibold text-gray-800 text-xs">
                              {getTelhadoLabel(telhadoExibido)}
                            </span>
                          }
                          type="select"
                          options={TELHADOS}
                          onSave={async (val) =>
                            handleUpdateSistemaField('tipo_telhado', val as TelhadoTipo)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Subseção Equipamentos (Módulos & Inversores) */}
                  <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-200/70 space-y-3">
                    <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      Equipamentos Fotovoltaicos
                    </div>

                    {/* Módulos */}
                    <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          Módulos Fotovoltaicos
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 uppercase font-semibold">
                            Qtd:
                          </span>
                          <InlineEditField
                            value={
                              selectedSistema?.quantidade_modulos ??
                              selectedSistema?.quantidade_placas ??
                              selectedCliente.placas_qtd ??
                              0
                            }
                            displayValue={
                              <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-xs">
                                {selectedSistema?.quantidade_modulos ??
                                  selectedSistema?.quantidade_placas ??
                                  selectedCliente.placas_qtd ??
                                  0}{' '}
                                un
                              </span>
                            }
                            type="number"
                            step="1"
                            min={0}
                            unit="un"
                            placeholder="0"
                            onSave={async (val) => {
                              const num = Number(val)
                              await handleUpdateSistemaField('quantidade_modulos', num)
                              await handleUpdateSistemaField('quantidade_placas', num)
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16 shrink-0">Fabricante:</span>
                          <InlineEditField
                            value={
                              selectedSistema?.fabricante_modulos ||
                              selectedSistema?.marca_placas ||
                              selectedCliente.placas_marca ||
                              'Canadian Solar'
                            }
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {selectedSistema?.fabricante_modulos ||
                                  selectedSistema?.marca_placas ||
                                  selectedCliente.placas_marca ||
                                  'Não informado'}
                              </span>
                            }
                            type="text"
                            placeholder="Canadian Solar, Trina Solar"
                            onSave={async (val) => {
                              const s = String(val)
                              await handleUpdateSistemaField('fabricante_modulos', s)
                              await handleUpdateSistemaField('marca_placas', s)
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16 shrink-0">Pot. Pico:</span>
                          <InlineEditField
                            value={selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida}
                            displayValue={
                              <span className="font-semibold text-emerald-800">
                                {selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida} kWp
                              </span>
                            }
                            type="number"
                            step="0.01"
                            min={0}
                            unit="kWp"
                            placeholder="0"
                            onSave={async (val) =>
                              handleUpdateSistemaField('potencia_pico_modulos_kwp', Number(val))
                            }
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                        <span className="text-gray-500 w-16 shrink-0">Modelo:</span>
                        <InlineEditField
                          value={selectedSistema?.modelo_modulos || 'CS3W-455MS MONOCRISTAL 455Wp'}
                          displayValue={
                            <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                              {selectedSistema?.modelo_modulos || 'CS3W-455MS MONOCRISTAL 455Wp'}
                            </span>
                          }
                          type="text"
                          placeholder="Modelo do módulo"
                          className="flex-1"
                          onSave={async (val) =>
                            handleUpdateSistemaField('modelo_modulos', String(val))
                          }
                        />
                      </div>
                    </div>

                    {/* Inversores */}
                    <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                        <span className="font-bold text-gray-800 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-purple-600" />
                          Inversor Solar
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-gray-400 uppercase font-semibold">
                            Potência:
                          </span>
                          <InlineEditField
                            value={selectedSistema?.potencia_pico_inversores_kwp ?? potenciaExibida}
                            displayValue={
                              <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded text-xs">
                                {selectedSistema?.potencia_pico_inversores_kwp ?? potenciaExibida}{' '}
                                kWp
                              </span>
                            }
                            type="number"
                            step="0.1"
                            min={0}
                            unit="kWp"
                            placeholder="0"
                            onSave={async (val) =>
                              handleUpdateSistemaField('potencia_pico_inversores_kwp', Number(val))
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16 shrink-0">Fabricante:</span>
                          <InlineEditField
                            value={
                              selectedSistema?.fabricante_inversores ||
                              selectedCliente.inversor_marca ||
                              'Fronius'
                            }
                            displayValue={
                              <span className="font-medium text-gray-800">
                                {selectedSistema?.fabricante_inversores ||
                                  selectedCliente.inversor_marca ||
                                  'Não informado'}
                              </span>
                            }
                            type="text"
                            placeholder="Fronius, Huawei, Growatt"
                            onSave={async (val) => {
                              const s = String(val)
                              await handleUpdateSistemaField('fabricante_inversores', s)
                              await handleUpdateClienteField('inversor_marca', s)
                            }}
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 w-16 shrink-0">Modelo:</span>
                          <InlineEditField
                            value={
                              selectedSistema?.modelo_inversores ||
                              selectedCliente.inversor_modelo ||
                              'Fronius Symo 12.0-3-M'
                            }
                            displayValue={
                              <span className="font-semibold text-gray-800 truncate">
                                {selectedSistema?.modelo_inversores ||
                                  selectedCliente.inversor_modelo ||
                                  'Não informado'}
                              </span>
                            }
                            type="text"
                            placeholder="Modelo do inversor"
                            className="flex-1"
                            onSave={async (val) => {
                              const s = String(val)
                              await handleUpdateSistemaField('modelo_inversores', s)
                              await handleUpdateClienteField('inversor_modelo', s)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Histórico de Manutenções */}
                  {clientManutencoes.length > 0 && (
                    <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-200/70 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                        Histórico de Manutenções ({clientManutencoes.length})
                      </h3>
                      <div className="space-y-2.5">
                        {clientManutencoes.map((m) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-lg border border-gray-200 bg-white space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                {getServiceIcon(m.tipo)}
                                <span className="font-semibold text-gray-900">{m.tipo}</span>
                              </div>
                              <StatusBadge status={m.status} />
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-2">
                              <span>{formatDate(m.data)}</span>
                              {m.tecnico && <span>• Técnico: {m.tecnico}</span>}
                            </div>
                            {m.descricao && <p className="text-gray-600">{m.descricao}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* ABA 2: ATIVIDADES (HISTÓRICO CRONOLÓGICO UNIFICADO)     */}
              {/* ======================================================== */}
              {activeTab === 'atividades' && (
                <div className="space-y-4">
                  {/* Quick-add de atividade ou anotação logo abaixo das abas */}
                  <QuickAddAtividade
                    clienteId={selectedCliente.id}
                    onAdd={addAtividade}
                    defaultMode="atividade"
                  />

                  {/* Filtro rápido por tipo de atividade */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2 gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Filter className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold">Filtrar timeline:</span>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap text-xs">
                      {[
                        { id: 'todos', label: 'Todos' },
                        { id: 'anotacao', label: 'Anotações' },
                        { id: 'ligacao', label: 'Ligações' },
                        { id: 'reuniao', label: 'Reuniões' },
                        { id: 'proposta', label: 'Propostas' },
                        { id: 'visita_tecnica', label: 'Visitas' },
                        { id: 'mudanca_estagio', label: 'Estágios' },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setAtividadeFiltro(f.id)}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                            atividadeFiltro === f.id
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista Cronológica de Atividades (mais recentes no topo) */}
                  {clientAtividades.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                      <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-600">
                        Nenhuma atividade registrada
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Use o campo acima para adicionar anotações ou agendar ligações, reuniões e
                        visitas.
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2">
                      {clientAtividades.map((atv) => (
                        <AtividadeItem key={atv.id} atividade={atv} onDelete={removeAtividade} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* ABA 3: ANOTAÇÕES (LISTA SÓ AS ANOTAÇÕES DO CLIENTE)       */}
              {/* ======================================================== */}
              {activeTab === 'anotacoes' && (
                <div className="space-y-4">
                  {/* Quick-add configurado para anotação */}
                  <QuickAddAtividade
                    clienteId={selectedCliente.id}
                    onAdd={addAtividade}
                    defaultMode="anotacao"
                  />

                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      Anotações Cadastradas ({clientAnotacoes.length})
                    </span>
                  </div>

                  {clientAnotacoes.length === 0 ? (
                    <div className="text-center py-10 px-4 bg-amber-50/30 rounded-xl border border-dashed border-amber-200">
                      <FileText className="w-8 h-8 text-amber-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-gray-700">
                        Nenhuma anotação registrada para este cliente
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Use o campo rápido acima para salvar notas, faturas e observações sobre a
                        negociação.
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2">
                      {clientAnotacoes.map((atv) => (
                        <AtividadeItem key={atv.id} atividade={atv} onDelete={removeAtividade} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ================================================================ */}
          {/* COLUNA DIREITA: PAINEL FIXO DE RESUMO (PIPEDRIVE SIDEBAR)        */}
          {/* ================================================================ */}
          <div className="w-full md:w-[280px] lg:w-[300px] shrink-0 bg-[#F8FAF9] p-4 space-y-4 overflow-y-auto border-t md:border-t-0">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              Resumo do Cliente
            </div>

            {/* Card 1: Estágio no Funil */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                Estágio no Funil
              </span>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={selectedCliente.status} />
              </div>
              <div className="pt-1">
                <InlineEditField
                  value={selectedCliente.status}
                  displayValue={
                    <span className="text-xs text-emerald-700 hover:underline font-medium cursor-pointer">
                      Alterar estágio comercial →
                    </span>
                  }
                  type="select"
                  options={ETAPAS_STATUS}
                  onSave={async (val) =>
                    updateClienteStatus(selectedCliente.id, val as ClienteStatus)
                  }
                />
              </div>
            </div>

            {/* Card 2: Valor Estimado */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <span>Valor Estimado</span>
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <InlineEditField
                value={selectedCliente.valor_estimado || 0}
                displayValue={
                  <span className="text-xl font-black text-gray-900 tracking-tight block">
                    {formatCurrency(selectedCliente.valor_estimado || 0)}
                  </span>
                }
                type="number"
                unit="R$"
                step="500"
                min={0}
                placeholder="0,00"
                onSave={async (val) => handleUpdateClienteField('valor_estimado', Number(val) || 0)}
              />
              <span className="text-[11px] text-gray-400 block">Receita potencial da proposta</span>
            </div>

            {/* Card 3: Potência do Sistema */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                <span>Potência Instalada</span>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <InlineEditField
                value={potenciaExibida}
                displayValue={
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-black text-emerald-700">{potenciaExibida}</span>
                    <span className="text-xs font-bold text-gray-500">kWp</span>
                  </div>
                }
                type="number"
                step="0.1"
                min={0}
                unit="kWp"
                placeholder="0"
                onSave={async (val) => handleUpdateSistemaField('potencia_total_kwp', Number(val))}
              />
              {geracaoExibida > 0 && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1">
                  <Sun className="w-3 h-3 text-amber-500 shrink-0" />
                  <span>{geracaoExibida.toLocaleString('pt-BR')} kWh/mês estimativa</span>
                </div>
              )}
            </div>

            {/* Card 4: Contato Rápido & Localização */}
            <div className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-xs space-y-2.5 text-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block border-b border-gray-100 pb-1.5">
                Contato & Cidade
              </span>

              {/* Nome */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Cliente:</span>
                <div className="font-semibold text-gray-800 truncate">{selectedCliente.nome}</div>
              </div>

              {/* Telefone */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Telefone:</span>
                <InlineEditField
                  value={selectedCliente.telefone}
                  displayValue={
                    <div className="flex items-center gap-1 font-medium text-gray-800">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedCliente.telefone || 'Não informado'}</span>
                    </div>
                  }
                  type="text"
                  placeholder="(00) 00000-0000"
                  onSave={async (val) => handleUpdateClienteField('telefone', String(val))}
                />
              </div>

              {/* Cidade */}
              <div className="space-y-0.5">
                <span className="text-[11px] text-gray-400">Cidade:</span>
                <InlineEditField
                  value={selectedCliente.cidade}
                  displayValue={
                    <div className="flex items-center gap-1 font-medium text-gray-800">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{selectedCliente.cidade || 'Não informada'}</span>
                    </div>
                  }
                  type="text"
                  placeholder="Cidade/UF"
                  onSave={async (val) => handleUpdateClienteField('cidade', String(val))}
                />
              </div>

              {/* Email */}
              {selectedCliente.email && (
                <div className="space-y-0.5 pt-1 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400">Email:</span>
                  <div className="flex items-center gap-1 text-emerald-700 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{selectedCliente.email}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Card 5: Atalho para Criar Atividade rápida */}
            <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200/80 space-y-2 text-xs">
              <span className="font-bold text-emerald-900 block text-xs">Ações Rápidas</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab('atividades')}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-800 transition-colors shadow-2xs text-center"
                >
                  + Atividade
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('anotacoes')}
                  className="px-2.5 py-1.5 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg text-[11px] font-semibold text-amber-800 transition-colors shadow-2xs text-center"
                >
                  + Anotação
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
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
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatDate, formatDateTime, getTelhadoLabel } from '@/lib/formatters'
import { StatusBadge, ProductBadge } from './StatusBadge'
import { InlineEditField } from './InlineEditField'
import type { Cliente, OrigemLeadTipo, ProdutoTipo, TelhadoTipo } from '@/types/crm'

const PRODUTOS: ProdutoTipo[] = [
  'Energia Solar',
  'Plano de O&M',
  'Sistemas Híbridos',
  'Carregadores veiculares',
  'Manutenção avulsa',
]

const ORIGENS: OrigemLeadTipo[] = ['Facebook', 'Instagram', 'Indicação', 'Site', 'Outro']

const TELHADOS: { value: TelhadoTipo; label: string }[] = [
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'metalico', label: 'Metálico' },
  { value: 'laje', label: 'Laje' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
]

export const FichaClienteDrawer: React.FC = () => {
  const {
    selectedCliente,
    selectedClienteId,
    closeFichaCliente,
    manutencoes,
    atividades,
    updateCliente,
  } = useClientes()

  if (!selectedClienteId || !selectedCliente) {
    return null
  }

  const handleUpdateField = async (field: keyof Cliente, value: unknown) => {
    await updateCliente(selectedCliente.id, { [field]: value } as Partial<Cliente>)
  }

  // Filter client's activities and sort by data
  const clientAtividades = atividades
    .filter((a) => a.cliente_id === selectedCliente.id)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

  // Filter client's maintenances and sort descending by date (most recent first)
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark overlay backdrop with fade */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={closeFichaCliente}
        aria-hidden="true"
      />

      {/* Drawer panel (480px on desktop, full screen on mobile) */}
      <div className="relative z-50 w-full sm:w-[480px] bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between bg-white sticky top-0 z-10">
          <div className="space-y-1.5 pr-4 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <InlineEditField
                value={selectedCliente.nome}
                displayValue={
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    {selectedCliente.nome}
                  </h2>
                }
                type="text"
                placeholder="Nome do cliente"
                onSave={async (val) => {
                  const str = String(val).trim()
                  if (!str) throw new Error('O nome não pode ficar vazio')
                  await handleUpdateField('nome', str)
                }}
              />
              <StatusBadge status={selectedCliente.status} />
              <InlineEditField
                value={selectedCliente.produto || 'Energia Solar'}
                displayValue={
                  <ProductBadge produto={selectedCliente.produto || 'Energia Solar'} size="md" />
                }
                type="select"
                options={PRODUTOS.map((p) => ({ value: p, label: p }))}
                onSave={async (val) => handleUpdateField('produto', val as ProdutoTipo)}
              />
            </div>{' '}
            <div className="flex items-center text-sm text-gray-500 gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                <InlineEditField
                  value={selectedCliente.cidade}
                  displayValue={<span>{selectedCliente.cidade || 'Sem cidade'}</span>}
                  type="text"
                  placeholder="Cidade/UF"
                  onSave={async (val) => handleUpdateField('cidade', String(val))}
                />
              </div>
              <span className="text-gray-300">•</span>
              <InlineEditField
                value={selectedCliente.potencia_kwp}
                displayValue={
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                    {selectedCliente.potencia_kwp} kWp
                  </span>
                }
                type="number"
                step="0.1"
                min={0}
                unit="kWp"
                placeholder="0"
                onSave={async (val) => handleUpdateField('potencia_kwp', Number(val))}
              />
            </div>
          </div>
          <button
            onClick={closeFichaCliente}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Fechar"
            aria-label="Fechar ficha do cliente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAF9]/50">
          {/* Seção Dados Cadastrais */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              Dados Cadastrais
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-500 min-w-[70px] shrink-0">Telefone:</span>
                <InlineEditField
                  value={selectedCliente.telefone}
                  displayValue={
                    <span className="font-medium text-gray-800">
                      {selectedCliente.telefone || 'Não informado'}
                    </span>
                  }
                  type="text"
                  placeholder="(00) 00000-0000"
                  onSave={async (val) => handleUpdateField('telefone', String(val))}
                />
              </div>

              <div className="flex items-start gap-3">
                <Home className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="text-gray-500 min-w-[70px] shrink-0">Endereço:</span>
                <InlineEditField
                  value={selectedCliente.endereco}
                  displayValue={
                    <span className="font-medium text-gray-800 break-words">
                      {selectedCliente.endereco || 'Não informado'}
                    </span>
                  }
                  type="text"
                  placeholder="Rua, número, bairro..."
                  className="flex-1"
                  onSave={async (val) => handleUpdateField('endereco', String(val))}
                />
              </div>

              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-500 min-w-[70px] shrink-0">Nº da UC:</span>
                <InlineEditField
                  value={selectedCliente.uc}
                  displayValue={
                    <span className="font-mono font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs">
                      {selectedCliente.uc || 'Não informada'}
                    </span>
                  }
                  type="text"
                  placeholder="Ex: 100234567"
                  onSave={async (val) => handleUpdateField('uc', String(val))}
                />
              </div>

              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-500 min-w-[70px] shrink-0">Origem:</span>
                <InlineEditField
                  value={selectedCliente.origem_lead || 'Outro'}
                  displayValue={
                    <span className="font-medium text-gray-800">
                      {selectedCliente.origem_lead || 'Não informada'}
                    </span>
                  }
                  type="select"
                  options={ORIGENS.map((o) => ({ value: o, label: o }))}
                  onSave={async (val) => handleUpdateField('origem_lead', val as OrigemLeadTipo)}
                />
              </div>

              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-500 min-w-[70px] shrink-0">Consumo:</span>
                <InlineEditField
                  value={selectedCliente.consumo_kwh_mes}
                  displayValue={
                    <span className="font-semibold text-emerald-800">
                      {selectedCliente.consumo_kwh_mes
                        ? `${selectedCliente.consumo_kwh_mes} kWh/mês`
                        : 'Não informado'}
                    </span>
                  }
                  type="number"
                  step="1"
                  min={0}
                  unit="kWh/mês"
                  placeholder="0"
                  onSave={async (val) => handleUpdateField('consumo_kwh_mes', Number(val))}
                />
              </div>
            </div>
          </div>
          {/* Seção Dados Técnicos do Sistema */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              Sistema Instalado
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  Instalação
                </div>
                <InlineEditField
                  value={selectedCliente.data_instalacao}
                  displayValue={
                    <span className="font-semibold text-gray-800">
                      {formatDate(selectedCliente.data_instalacao)}
                    </span>
                  }
                  type="date"
                  placeholder="DD/MM/AAAA"
                  onSave={async (val) => handleUpdateField('data_instalacao', String(val))}
                />
              </div>

              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  Potência Total
                </div>
                <InlineEditField
                  value={selectedCliente.potencia_kwp}
                  displayValue={
                    <span className="font-semibold text-emerald-800">
                      {selectedCliente.potencia_kwp} kWp
                    </span>
                  }
                  type="number"
                  step="0.1"
                  min={0}
                  unit="kWp"
                  placeholder="0"
                  onSave={async (val) => handleUpdateField('potencia_kwp', Number(val))}
                />
              </div>

              {/* Inversor: Marca e Modelo */}
              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100 col-span-1 sm:col-span-2 space-y-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-gray-400" />
                  Inversor
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 min-w-[50px]">Modelo:</span>
                    <InlineEditField
                      value={selectedCliente.inversor_modelo}
                      displayValue={
                        <span className="font-semibold text-gray-800">
                          {selectedCliente.inversor_modelo || 'Não informado'}
                        </span>
                      }
                      type="text"
                      placeholder="Ex: SUN2000-5KTL"
                      onSave={async (val) => handleUpdateField('inversor_modelo', String(val))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 min-w-[50px]">Marca:</span>
                    <InlineEditField
                      value={selectedCliente.inversor_marca}
                      displayValue={
                        <span className="text-xs text-gray-600 font-medium">
                          {selectedCliente.inversor_marca || 'Não informada'}
                        </span>
                      }
                      type="text"
                      placeholder="Ex: Huawei, Growatt, Deye"
                      onSave={async (val) => handleUpdateField('inversor_marca', String(val))}
                    />
                  </div>
                </div>
              </div>

              {/* Placas Solares: Quantidade e Marca */}
              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100 col-span-1 sm:col-span-2 space-y-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  Placas Solares
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 min-w-[70px]">Quantidade:</span>
                    <InlineEditField
                      value={selectedCliente.placas_qtd}
                      displayValue={
                        <span className="font-semibold text-gray-800">
                          {selectedCliente.placas_qtd
                            ? `${selectedCliente.placas_qtd} placas`
                            : 'Não informada'}
                        </span>
                      }
                      type="number"
                      step="1"
                      min={0}
                      unit="un"
                      placeholder="0"
                      onSave={async (val) => handleUpdateField('placas_qtd', Number(val))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 min-w-[70px]">Marca:</span>
                    <InlineEditField
                      value={selectedCliente.placas_marca}
                      displayValue={
                        <span className="text-xs text-gray-600 font-medium">
                          {selectedCliente.placas_marca || 'Não informada'}
                        </span>
                      }
                      type="text"
                      placeholder="Ex: Canadian Solar, Jinko, JA Solar"
                      onSave={async (val) => handleUpdateField('placas_marca', String(val))}
                    />
                  </div>
                </div>
              </div>

              {/* Tipo de Telhado */}
              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100 col-span-1 sm:col-span-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5">
                  <Home className="w-3.5 h-3.5 text-gray-400" />
                  Tipo de Telhado
                </div>
                <InlineEditField
                  value={selectedCliente.telhado_tipo || 'ceramico'}
                  displayValue={
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-gray-800 text-xs font-medium border border-gray-200">
                      {getTelhadoLabel(selectedCliente.telhado_tipo)}
                    </div>
                  }
                  type="select"
                  options={TELHADOS}
                  onSave={async (val) => handleUpdateField('telhado_tipo', val as TelhadoTipo)}
                />
              </div>
            </div>
          </div>

          {/* Seção Próximas Atividades */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Próximas Atividades
            </h3>
            {clientAtividades.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma atividade agendada.</p>
            ) : (
              <div className="space-y-3">
                {clientAtividades.map((atv) => (
                  <div
                    key={atv.id}
                    className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/60 flex items-start gap-3 text-sm"
                  >
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-semibold text-emerald-900 block text-xs">
                        {formatDateTime(atv.data)}
                      </span>
                      <p className="text-gray-700 text-sm">{atv.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Seção Histórico de Manutenções */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              Histórico de Manutenções
            </h3>
            {clientManutencoes.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Nenhuma manutenção registrada.</p>
            ) : (
              <div className="space-y-4">
                {clientManutencoes.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-gray-200/80 bg-white space-y-3 shadow-xs hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(m.tipo)}
                        <span className="font-semibold text-gray-900 text-sm">{m.tipo}</span>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        {formatDate(m.data)}
                      </span>
                      {m.tecnico && (
                        <span>
                          Técnico: <strong className="text-gray-700">{m.tecnico}</strong>
                        </span>
                      )}
                    </div>

                    {m.descricao && (
                      <p className="text-sm text-gray-600 leading-relaxed">{m.descricao}</p>
                    )}

                    {/* Mocked Photo Gallery for inspection records */}
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block mb-2">
                        Fotos da Ordem de Serviço
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all shadow-xs group"
                          title="Foto 1: Painéis e cabeamento"
                        >
                          <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] mt-0.5">Foto 1</span>
                        </div>
                        <div
                          className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all shadow-xs group"
                          title="Foto 2: Quadro de distribuição e inversor"
                        >
                          <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] mt-0.5">Foto 2</span>
                        </div>
                        {m.tipo === 'Revisão Elétrica' && (
                          <div
                            className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all shadow-xs group"
                            title="Foto 3: Medição de termografia"
                          >
                            <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="text-[9px] mt-0.5">Foto 3</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

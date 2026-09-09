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
  CheckCircle2,
  Clock,
  Wrench,
  Droplets,
  Settings,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatDate, formatDateTime, getTelhadoLabel } from '@/lib/formatters'
import { StatusBadge } from './StatusBadge'

export const FichaClienteDrawer: React.FC = () => {
  const { selectedCliente, selectedClienteId, closeFichaCliente, manutencoes, atividades } =
    useClientes()

  if (!selectedClienteId || !selectedCliente) {
    return null
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
          <div className="space-y-1.5 pr-4">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                {selectedCliente.nome}
              </h2>
              <StatusBadge status={selectedCliente.status} />
            </div>
            <div className="flex items-center text-sm text-gray-500 gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span>{selectedCliente.cidade}</span>
              <span className="text-gray-300">•</span>
              <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                {selectedCliente.potencia_kwp} kWp
              </span>
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
                <span className="text-gray-500 min-w-[70px]">Telefone:</span>
                <span className="font-medium text-gray-800">
                  {selectedCliente.telefone || 'Não informado'}
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Home className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span className="text-gray-500 min-w-[70px]">Endereço:</span>
                <span className="font-medium text-gray-800">
                  {selectedCliente.endereco || 'Não informado'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-500 min-w-[70px]">Nº da UC:</span>
                <span className="font-mono font-medium text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-xs">
                  {selectedCliente.uc || 'Não informada'}
                </span>
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
                <div className="font-semibold text-gray-800">
                  {formatDate(selectedCliente.data_instalacao)}
                </div>
              </div>

              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  Potência Total
                </div>
                <div className="font-semibold text-emerald-800">
                  {selectedCliente.potencia_kwp} kWp
                </div>
              </div>

              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100 col-span-1 sm:col-span-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Cpu className="w-3.5 h-3.5 text-gray-400" />
                  Inversor
                </div>
                <div className="font-semibold text-gray-800">
                  {selectedCliente.inversor_modelo ||
                    selectedCliente.inversor_marca ||
                    'Não informado'}
                </div>
                {selectedCliente.inversor_marca && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    Marca: {selectedCliente.inversor_marca}
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100 col-span-1 sm:col-span-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Layers className="w-3.5 h-3.5 text-gray-400" />
                  Placas Solares
                </div>
                <div className="font-semibold text-gray-800">
                  {selectedCliente.placas_qtd
                    ? `${selectedCliente.placas_qtd} placas`
                    : 'Quantidade não informada'}
                  {selectedCliente.placas_marca ? ` — ${selectedCliente.placas_marca}` : ''}
                </div>
              </div>

              <div className="p-3 bg-gray-50/70 rounded-lg border border-gray-100 col-span-1 sm:col-span-2">
                <div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                  <Home className="w-3.5 h-3.5 text-gray-400" />
                  Tipo de Telhado
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-gray-800 text-xs font-medium border border-gray-200">
                  {getTelhadoLabel(selectedCliente.telhado_tipo)}
                </div>
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

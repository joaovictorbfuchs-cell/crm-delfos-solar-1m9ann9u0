import React from 'react'
import {
  Search,
  CheckSquare,
  Square,
  Zap,
  MapPin,
  Phone,
  AlertCircle,
  Edit2,
  X,
  Info,
  DollarSign,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ModalDisparoFiltroPopover } from '@/components/ModalDisparoFiltroPopover'
import { formatCurrency, formatWhatsAppPhone } from '@/lib/formatters'
import type { Cliente, UsinaCliente, Sistema } from '@/types/crm'
import type { ListaEnvioRegistro } from '@/services/listasEnvioService'
import type { OrigemNumeroDestino } from '@/lib/resolverNumeroDestinoCliente'

export type SegmentoFiltro =
  | 'todos'
  | 'clientes_om'
  | 'clientes_solar'
  | 'clientes_bateria'
  | 'pos_vendas'

export interface ItemClienteMassa {
  cliente: Cliente
  usina?: UsinaCliente | Sistema
  potenciaTexto: string
  cidade: string
  telefoneAutoritativo: string
  origemNumero?: OrigemNumeroDestino
  contatoAdicionalNome?: string
  temWhatsAppValido: boolean
  numeroLimpo: string
  valorItem?: number
  origemItem?: string
  isExemploDemo?: boolean
  segmentos: SegmentoFiltro[]
}

export interface Etapa1DestinatariosProps {
  itensFiltrados: ItemClienteMassa[]
  selectedIds: string[]
  onToggleCliente: (clienteId: string) => void
  onSelectAll: () => void
  isAllSelected: boolean
  onLimparSelecao: () => void
  busca: string
  onMudarBusca: (busca: string) => void
  limiteExibicao: number
  onCarregarMais: () => void
  // Props do Filtro estilo Pipedrive
  segmentoAtivo: SegmentoFiltro
  onMudarSegmento: (seg: SegmentoFiltro) => void
  filtroWhatsApp: 'todos' | 'com_whatsapp' | 'sem_whatsapp'
  onMudarWhatsApp: (val: 'todos' | 'com_whatsapp' | 'sem_whatsapp') => void
  filtroCidade: string
  onMudarCidade: (val: string) => void
  filtroConcessionaria: string
  onMudarConcessionaria: (val: string) => void
  filtroTipoCliente: string
  onMudarTipoCliente: (val: string) => void
  filtroStatus: string
  onMudarStatus: (val: string) => void
  opcoesFiltrosExtras: {
    cidades: string[]
    concessionarias: string[]
    tiposCliente: string[]
    statusList: string[]
  }
  countSegmento: (seg: SegmentoFiltro) => number
  onLimparFiltros: () => void
  // Listas salvas
  listasSalvas: ListaEnvioRegistro[]
  listaSelecionadaId: string
  onSelecionarLista: (listaId: string) => void
  onSalvarSelecaoComoNovaLista: () => void
  onRenomearLista: (lista: ListaEnvioRegistro, novoNome: string) => Promise<void>
  onEditarFiltrosLista: (lista: ListaEnvioRegistro) => Promise<void>
  onExcluirLista: (lista: ListaEnvioRegistro) => void
  // Edição rápida de telefone
  editandoTelefoneId: string | null
  telefoneEmEdicao: string
  onIniciarEdicaoTelefone: (clienteId: string, telefoneAtual: string) => void
  onCancelarEdicaoTelefone: () => void
  onSalvarTelefoneInline: (cliente: Cliente) => void
  onMudarTelefoneEmEdicao: (val: string) => void
  // Foco do cliente para prévia
  clienteFocadoId: string | null
  onFocarCliente: (clienteId: string) => void
}

export const Etapa1Destinatarios: React.FC<Etapa1DestinatariosProps> = ({
  itensFiltrados,
  selectedIds,
  onToggleCliente,
  onSelectAll,
  isAllSelected,
  onLimparSelecao,
  busca,
  onMudarBusca,
  limiteExibicao,
  onCarregarMais,
  segmentoAtivo,
  onMudarSegmento,
  filtroWhatsApp,
  onMudarWhatsApp,
  filtroCidade,
  onMudarCidade,
  filtroConcessionaria,
  onMudarConcessionaria,
  filtroTipoCliente,
  onMudarTipoCliente,
  filtroStatus,
  onMudarStatus,
  opcoesFiltrosExtras,
  countSegmento,
  onLimparFiltros,
  listasSalvas,
  listaSelecionadaId,
  onSelecionarLista,
  onSalvarSelecaoComoNovaLista,
  onRenomearLista,
  onEditarFiltrosLista,
  onExcluirLista,
  editandoTelefoneId,
  telefoneEmEdicao,
  onIniciarEdicaoTelefone,
  onCancelarEdicaoTelefone,
  onSalvarTelefoneInline,
  onMudarTelefoneEmEdicao,
  clienteFocadoId,
  onFocarCliente,
}) => {
  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Barra de Ações Superior estilo Pipedrive: Botão Filtrar + Busca no topo + Seleção */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50/95 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botão único "Filtrar" estilo Pipedrive com popover completo */}
          <ModalDisparoFiltroPopover
            segmentoAtivo={segmentoAtivo}
            onMudarSegmento={onMudarSegmento}
            filtroWhatsApp={filtroWhatsApp}
            onMudarWhatsApp={onMudarWhatsApp}
            filtroCidade={filtroCidade}
            onMudarCidade={onMudarCidade}
            filtroConcessionaria={filtroConcessionaria}
            onMudarConcessionaria={onMudarConcessionaria}
            filtroTipoCliente={filtroTipoCliente}
            onMudarTipoCliente={onMudarTipoCliente}
            filtroStatus={filtroStatus}
            onMudarStatus={onMudarStatus}
            busca={busca}
            onMudarBusca={onMudarBusca}
            opcoesFiltrosExtras={opcoesFiltrosExtras}
            countSegmento={countSegmento}
            totalDestinatariosEncontrados={itensFiltrados.length}
            onLimparFiltros={onLimparFiltros}
            listasSalvas={listasSalvas}
            listaSelecionadaId={listaSelecionadaId}
            onSelecionarLista={onSelecionarLista}
            onSalvarSelecaoComoNovaLista={onSalvarSelecaoComoNovaLista}
            onRenomearLista={onRenomearLista}
            onEditarFiltrosLista={onEditarFiltrosLista}
            onExcluirLista={onExcluirLista}
          />

          <span className="text-xs text-gray-600 font-medium">
            <strong>{itensFiltrados.length}</strong> encontrados
          </span>
        </div>

        {/* Campo de busca rápida no topo */}
        <div className="flex-1 max-w-md relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => onMudarBusca(e.target.value)}
            placeholder="Buscar por nome, cidade ou telefone..."
            className="h-8 pl-8 pr-7 text-xs bg-white border-gray-300 rounded-lg shadow-2xs"
          />
          {busca && (
            <button
              type="button"
              onClick={() => onMudarBusca('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Botão Selecionar / Desmarcar Todos */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="h-8 text-xs font-bold text-[#0284C7] border-sky-300 hover:bg-sky-50"
          >
            {isAllSelected ? 'Desmarcar todos' : 'Selecionar todos'}
          </Button>
        </div>
      </div>

      {/* Resumo de Seleção */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <span>
          <strong className="text-gray-900">{selectedIds.length}</strong> de {itensFiltrados.length}{' '}
          destinatários selecionados
        </span>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={onLimparSelecao}
            className="text-gray-400 hover:text-gray-700 underline text-[11px]"
          >
            Limpar seleção
          </button>
        )}
      </div>

      {/* Cabeçalho das colunas da linha compacta (estilo tabela moderna) */}
      <div className="hidden sm:grid grid-cols-12 gap-3 px-3 py-2 bg-slate-100/80 rounded-lg text-[11px] font-bold uppercase tracking-wider text-slate-600 border border-slate-200 select-none">
        <div className="col-span-1 flex items-center justify-center">
          <span>Sel.</span>
        </div>
        <div className="col-span-4 flex items-center">
          <span>Nome do Cliente</span>
        </div>
        <div className="col-span-3 flex items-center">
          <span>Telefone / WhatsApp</span>
        </div>
        <div className="col-span-2 flex items-center">
          <span>Cidade</span>
        </div>
        <div className="col-span-2 flex items-center justify-end">
          <span>Potência</span>
        </div>
      </div>

      {/* Lista com Rolagem — Cada cliente em uma ÚNICA LINHA COMPACTA */}
      <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white overflow-y-auto divide-y divide-gray-100 shadow-2xs min-h-[360px]">
        {itensFiltrados.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700">Nenhum cliente neste filtro</p>
            <p>Tente selecionar outro segmento ou limpar a busca.</p>
          </div>
        ) : (
          <>
            {itensFiltrados.slice(0, limiteExibicao).map((item) => {
              const isChecked = selectedIds.includes(item.cliente.id)
              const isFocado = clienteFocadoId === item.cliente.id
              const isEditandoTel = editandoTelefoneId === item.cliente.id

              return (
                <div
                  key={item.cliente.id}
                  onClick={() => onFocarCliente(item.cliente.id)}
                  className={`px-3 py-2.5 transition-colors cursor-pointer text-xs ${
                    isChecked
                      ? 'bg-sky-50/50 hover:bg-sky-50/80'
                      : isFocado
                        ? 'bg-slate-50'
                        : 'hover:bg-slate-50/80'
                  }`}
                >
                  {/* Linha compacta: checkbox, nome, telefone, cidade, potência lado a lado */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center">
                    {/* Checkbox de seleção */}
                    <div
                      className="sm:col-span-1 flex items-center justify-start sm:justify-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCliente(item.cliente.id)
                      }}
                    >
                      <button
                        type="button"
                        aria-label={`Selecionar ${item.cliente.nome}`}
                        className="text-gray-400 hover:text-[#0284C7] transition-colors p-0.5 rounded cursor-pointer"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-[#0284C7]" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Nome do Cliente */}
                    <div
                      className="sm:col-span-4 min-w-0 flex items-center gap-1.5 flex-wrap cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleCliente(item.cliente.id)
                      }}
                    >
                      <span className="font-bold text-gray-900 truncate block">
                        {item.cliente.nome}
                      </span>
                      {item.isExemploDemo && (
                        <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.2 rounded font-bold shrink-0">
                          Demo
                        </span>
                      )}
                      {item.valorItem && item.valorItem > 0 ? (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold shrink-0 hidden md:inline-flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5" />
                          {formatCurrency(item.valorItem)}
                        </span>
                      ) : null}
                    </div>

                    {/* Telefone / WhatsApp com edição inline */}
                    <div className="sm:col-span-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                      {isEditandoTel ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={telefoneEmEdicao}
                            onChange={(e) =>
                              onMudarTelefoneEmEdicao(formatWhatsAppPhone(e.target.value))
                            }
                            placeholder="(00) 00000-0000"
                            className="h-7 text-xs bg-white flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => onSalvarTelefoneInline(item.cliente)}
                            className="h-7 px-2 text-xs bg-[#0284C7] hover:bg-[#0369a1] text-white"
                          >
                            OK
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            type="button"
                            onClick={onCancelarEdicaoTelefone}
                            className="h-7 px-1.5 text-xs text-gray-500"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
                            {item.temWhatsAppValido ? (
                              <span className="font-medium text-gray-800 truncate">
                                {item.telefoneAutoritativo}
                              </span>
                            ) : (
                              <span className="font-semibold text-rose-600 flex items-center gap-1 text-[11px]">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                Sem número
                              </span>
                            )}
                          </div>
                          {!item.isExemploDemo && (
                            <button
                              type="button"
                              onClick={() =>
                                onIniciarEdicaoTelefone(item.cliente.id, item.telefoneAutoritativo)
                              }
                              className="text-[10px] text-gray-400 hover:text-[#0284C7] p-1 rounded"
                              title="Editar telefone"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cidade */}
                    <div className="sm:col-span-2 min-w-0 flex items-center gap-1 text-gray-600">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0 hidden sm:inline" />
                      <span className="truncate">{item.cidade || '—'}</span>
                    </div>

                    {/* Potência */}
                    <div className="sm:col-span-2 min-w-0 flex items-center justify-start sm:justify-end gap-1 font-semibold text-amber-700">
                      <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="truncate">{item.potenciaTexto || '—'}</span>
                    </div>
                  </div>
                </div>
              )
            })}

            {itensFiltrados.length > limiteExibicao && (
              <div className="p-2.5 bg-slate-50 text-center border-t border-slate-200">
                <button
                  type="button"
                  onClick={onCarregarMais}
                  className="text-xs font-semibold text-[#0284C7] hover:underline py-1 px-3 rounded-lg hover:bg-sky-50 transition-colors"
                >
                  Carregar mais 50 (mostrando {limiteExibicao} de {itensFiltrados.length})
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="text-[11px] text-gray-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
        <Info className="w-4 h-4 text-[#0284C7] shrink-0 mt-0.5" />
        <span>
          O envio utiliza o número autoritativo do WhatsApp do cliente via Z-API. Selecione os
          destinatários e avance para a <strong>Etapa 2 (Mensagem)</strong>.
        </span>
      </div>
    </div>
  )
}

export default Etapa1Destinatarios

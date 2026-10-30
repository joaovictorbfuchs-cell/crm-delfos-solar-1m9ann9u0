import React, { useState, useMemo } from 'react'
import {
  Users,
  FileText,
  Clock,
  Calendar,
  Send,
  Zap,
  MapPin,
  Phone,
  AlertCircle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  DollarSign,
  Search,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { ItemClienteMassa } from './Etapa1Destinatarios'
import type { FluxoFollowUp } from '@/services/fluxosFollowUpService'

export interface Etapa4RevisaoEnvioProps {
  destinatariosSelecionados: ItemClienteMassa[]
  templateTextoEfetivo: string
  templateTitulo?: string
  tipoEnvio: 'agora' | 'agendar'
  dataHoraAgendada: string
  intervaloSegundos: number
  reenvioAtivo: boolean
  fluxoSelecionadoObj: FluxoFollowUp | null
  // Ação de envio final
  isEnviando: boolean
  onConfirmarEnvio: () => void
  onVoltarParaEtapa: (etapa: 1 | 2 | 3) => void
}

const ITENS_POR_PAGINA = 10

export const Etapa4RevisaoEnvio: React.FC<Etapa4RevisaoEnvioProps> = ({
  destinatariosSelecionados,
  templateTextoEfetivo,
  templateTitulo,
  tipoEnvio,
  dataHoraAgendada,
  intervaloSegundos,
  reenvioAtivo,
  fluxoSelecionadoObj,
  isEnviando,
  onConfirmarEnvio,
  onVoltarParaEtapa,
}) => {
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [buscaTabela, setBuscaTabela] = useState('')

  // Clientes sem WhatsApp válido
  const clientesSemWhatsApp = useMemo(() => {
    return destinatariosSelecionados.filter((d) => !d.temWhatsAppValido)
  }, [destinatariosSelecionados])

  // Filtragem da tabela por busca local
  const itensTabelaFiltrados = useMemo(() => {
    const q = buscaTabela.trim().toLowerCase()
    if (!q) return destinatariosSelecionados
    return destinatariosSelecionados.filter((item) => {
      const matchNome = item.cliente.nome?.toLowerCase().includes(q)
      const matchCidade = item.cidade?.toLowerCase().includes(q)
      const matchTel = item.telefoneAutoritativo?.includes(q)
      return matchNome || matchCidade || matchTel
    })
  }, [destinatariosSelecionados, buscaTabela])

  const totalPaginas = Math.max(1, Math.ceil(itensTabelaFiltrados.length / ITENS_POR_PAGINA))
  const paginaValida = Math.min(paginaAtual, totalPaginas)

  const itensPaginados = useMemo(() => {
    const inicio = (paginaValida - 1) * ITENS_POR_PAGINA
    return itensTabelaFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [itensTabelaFiltrados, paginaValida])

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. CARDS DE RESUMO DO DISPARO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: Destinatários */}
        <div
          onClick={() => onVoltarParaEtapa(1)}
          className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 text-[#0284C7] rounded-lg group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Destinatários
              </span>
            </div>
            <span className="text-[10px] text-sky-600 font-semibold group-hover:underline">
              Editar
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-gray-900">
              {destinatariosSelecionados.length}
            </span>
            <span className="text-xs text-gray-500">clientes selecionados</span>
          </div>
          {clientesSemWhatsApp.length > 0 && (
            <p className="text-[10px] text-rose-600 font-semibold mt-0.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {clientesSemWhatsApp.length} sem WhatsApp (serão pulados)
            </p>
          )}
        </div>

        {/* Card 2: Modelo & Mensagem */}
        <div
          onClick={() => onVoltarParaEtapa(2)}
          className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Mensagem
              </span>
            </div>
            <span className="text-[10px] text-sky-600 font-semibold group-hover:underline">
              Editar
            </span>
          </div>
          <div className="mt-2 truncate font-bold text-xs text-gray-900">
            {templateTitulo || 'Mensagem personalizada'}
          </div>
          <p className="text-[11px] text-gray-500 truncate mt-0.5 italic">
            "{templateTextoEfetivo.slice(0, 50)}..."
          </p>
        </div>

        {/* Card 3: Momento do Envio */}
        <div
          onClick={() => onVoltarParaEtapa(3)}
          className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs hover:border-sky-300 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                {tipoEnvio === 'agendar' ? (
                  <Calendar className="w-4 h-4" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Momento & Régua
              </span>
            </div>
            <span className="text-[10px] text-sky-600 font-semibold group-hover:underline">
              Editar
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-extrabold text-sm text-gray-900">
              {tipoEnvio === 'agendar' ? 'Agendado' : 'Enviar agora'}
            </span>
            <span className="text-[11px] text-gray-500">({intervaloSegundos}s intervalo)</span>
          </div>
          <p className="text-[11px] text-gray-500 truncate mt-0.5">
            {tipoEnvio === 'agendar'
              ? `Início: ${dataHoraAgendada || 'A definir'}`
              : reenvioAtivo
                ? `Follow-up: ${fluxoSelecionadoObj?.nome || 'Ativo'}`
                : 'Sem régua de follow-up'}
          </p>
        </div>
      </div>

      {/* 2. TABELA COMPLETA E PAGINADA DE TODOS OS SELECIONADOS */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-2xs overflow-hidden min-h-[300px]">
        {/* Barra superior da tabela com busca local e contagem */}
        <div className="p-3 bg-slate-50/90 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-900">
              Conferência dos Clientes Selecionados ({destinatariosSelecionados.length})
            </span>
            {itensTabelaFiltrados.length !== destinatariosSelecionados.length && (
              <span className="text-[11px] text-gray-500">
                ({itensTabelaFiltrados.length} na busca)
              </span>
            )}
          </div>

          <div className="max-w-xs relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={buscaTabela}
              onChange={(e) => {
                setBuscaTabela(e.target.value)
                setPaginaAtual(1)
              }}
              placeholder="Buscar nesta lista..."
              className="h-7 pl-8 text-xs bg-white border-gray-300 w-48 sm:w-60"
            />
          </div>
        </div>

        {/* Cabeçalho da Tabela */}
        <div className="grid grid-cols-12 gap-3 px-3 py-2 bg-slate-100/90 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200 select-none">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-4">Cliente</div>
          <div className="col-span-3">Telefone / WhatsApp</div>
          <div className="col-span-2">Cidade</div>
          <div className="col-span-2 text-right">Potência</div>
        </div>

        {/* Corpo da Tabela Paginada */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {itensPaginados.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500">
              Nenhum cliente selecionado encontrado.
            </div>
          ) : (
            itensPaginados.map((item, idx) => {
              const numeroLinha = (paginaValida - 1) * ITENS_POR_PAGINA + idx + 1
              return (
                <div
                  key={item.cliente.id}
                  className="grid grid-cols-12 gap-3 px-3 py-2.5 items-center text-xs hover:bg-slate-50 transition-colors"
                >
                  <div className="col-span-1 text-center font-mono text-gray-400 text-[11px]">
                    {numeroLinha}
                  </div>

                  <div className="col-span-4 min-w-0">
                    <span className="font-bold text-gray-900 truncate block">
                      {item.cliente.nome}
                    </span>
                    {item.valorItem && item.valorItem > 0 ? (
                      <span className="text-[10px] text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                        <DollarSign className="w-2.5 h-2.5" />
                        {formatCurrency(item.valorItem)}
                      </span>
                    ) : null}
                  </div>

                  <div className="col-span-3 min-w-0">
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
                  </div>

                  <div className="col-span-2 min-w-0 text-gray-600 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span>{item.cidade || '—'}</span>
                  </div>

                  <div className="col-span-2 min-w-0 text-right font-semibold text-amber-700 truncate flex items-center justify-end gap-1">
                    <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>{item.potenciaTexto || '—'}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé da Paginação */}
        {totalPaginas > 1 && (
          <div className="p-2.5 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span>
              Mostrando {itensPaginados.length} de {itensTabelaFiltrados.length} clientes (Página{' '}
              {paginaValida} de {totalPaginas})
            </span>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={paginaValida <= 1}
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              <span className="px-2 text-xs font-bold text-gray-800">
                {paginaValida} / {totalPaginas}
              </span>

              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={paginaValida >= totalPaginas}
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                className="h-7 px-2 text-xs"
              >
                <span className="hidden sm:inline">Próxima</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Etapa4RevisaoEnvio

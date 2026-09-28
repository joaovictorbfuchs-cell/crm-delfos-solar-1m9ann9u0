import React, { useState, useEffect } from 'react'
import {
  Cpu,
  Plus,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AtivoUsina } from '@/types/ativos'
import {
  fetchAtivosPorUsina,
  calcularStatusGarantia,
  getLabelTipoAtivo,
} from '@/services/ativosService'
import { formatDate } from '@/lib/formatters'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface AbaAtivosUsinaProps {
  usinaId: string
  usinaNome: string
}

export const AbaAtivosUsina: React.FC<AbaAtivosUsinaProps> = ({ usinaId, usinaNome }) => {
  const [ativos, setAtivos] = useState<AtivoUsina[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [expandido, setExpandido] = useState<boolean>(false)

  const carregar = async () => {
    if (!usinaId) return
    setLoading(true)
    try {
      const data = await fetchAtivosPorUsina(usinaId)
      setAtivos(data)
    } catch (err) {
      console.error('Erro ao buscar ativos na ficha da usina:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [usinaId])

  return (
    <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#0F2038] text-[#E0A838]">
            <Cpu className="w-3.5 h-3.5 text-[#E0A838]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Ativos Cadastrados
              </span>
              <Badge
                variant="outline"
                className="bg-white text-slate-700 text-[10px] font-bold border-slate-300"
              >
                {ativos.length} {ativos.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-500">
              Novo cadastro estruturado de equipamentos, números de série e garantias.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            to="/ativos"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-colors shadow-2xs"
            title="Abrir tela completa de cadastro de ativos"
          >
            <span>Gerenciar na Tela de Ativos</span>
            <ExternalLink className="w-3 h-3 text-emerald-600" />
          </Link>

          {ativos.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandido((prev) => !prev)}
              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
              title={expandido ? 'Recolher lista de ativos' : 'Expandir lista de ativos'}
            >
              {expandido ? (
                <span className="flex items-center gap-1">
                  <span>Recolher</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span>Ver {ativos.length}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 italic">Carregando ativos da usina...</p>
      ) : ativos.length === 0 ? (
        <div className="p-3 bg-white rounded-lg border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <span>Nenhum ativo individual (inversor, módulo, bateria) cadastrado nesta usina.</span>
          <Link
            to="/ativos"
            className="text-xs font-bold text-[#0F2038] hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3 text-[#E0A838]" />
            Cadastrar Ativo
          </Link>
        </div>
      ) : expandido ? (
        <div className="space-y-1.5 pt-1">
          {ativos.map((ativo) => {
            const garantia = calcularStatusGarantia(ativo.data_fim_garantia)
            return (
              <div
                key={ativo.id}
                className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between gap-2 hover:bg-slate-50/50"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900">
                      {ativo.fabricante} {ativo.modelo}
                    </span>
                    <Badge
                      variant="outline"
                      className="bg-slate-50 text-[10px] text-slate-600 border-slate-200"
                    >
                      {getLabelTipoAtivo(ativo.tipo, ativo.tipo_outro_descricao)}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                    {ativo.numero_serie && (
                      <span>
                        S/N:{' '}
                        <strong className="font-mono text-slate-700">{ativo.numero_serie}</strong>
                      </span>
                    )}
                    {ativo.data_instalacao && (
                      <span>Instalado: {formatDate(ativo.data_instalacao)}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <Badge
                    variant={garantia.badgeVariant}
                    className={`text-[10px] ${garantia.badgeClasses}`}
                  >
                    {garantia.label}
                  </Badge>
                  {ativo.data_fim_garantia && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Garantia até {formatDate(ativo.data_fim_garantia)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

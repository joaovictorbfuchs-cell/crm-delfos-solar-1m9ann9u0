import React, { useEffect, useMemo, useState } from 'react'
import {
  DollarSign,
  Navigation,
  RotateCcw,
  Sliders,
  CheckCircle,
  HelpCircle,
  Sun,
} from 'lucide-react'
import {
  estimarDistanciaDelfosCliente,
  calcularCustosAtividade,
  getConfiguracaoDeslocamento,
  saveConfiguracaoDeslocamento,
} from '@/lib/calculoDeslocamentoAtividades'
import type { UsinaCliente } from '@/types/crm'

export interface CustosDeslocamentoValues {
  valorServico: number
  valorPorPlaca?: number
  qtdModulos?: number
  cobrarDeslocamento: boolean
  distanciaKm: number
  valorKm: number
  custoDeslocamento: number
  custoPlacas: number
  custoTotal: number
}

interface SecaoCustosDeslocamentoAtividadeProps {
  // Dados do cliente/usina para cálculo automático
  enderecoCliente?: string
  cidadeCliente?: string
  usinaSelecionada?: UsinaCliente | null
  usinasDoCliente?: UsinaCliente[]

  // Dados pré-definidos do tipo da atividade
  valorBaseSugerido?: number
  valorPorPlacaSugerido?: number
  categoria?: string

  // Estado e callbacks
  onChange: (valores: CustosDeslocamentoValues) => void
  initialValues?: Partial<CustosDeslocamentoValues>
  modoCompacto?: boolean
}

export const SecaoCustosDeslocamentoAtividade: React.FC<SecaoCustosDeslocamentoAtividadeProps> = ({
  enderecoCliente,
  cidadeCliente,
  usinaSelecionada,
  usinasDoCliente = [],
  valorBaseSugerido,
  valorPorPlacaSugerido,
  categoria,
  onChange,
  initialValues,
  modoCompacto = false,
}) => {
  const config = useMemo(() => getConfiguracaoDeslocamento(), [])

  // Modulos da usina
  const modulosUsina = useMemo(() => {
    if (usinaSelecionada?.qtd_modulos) return Number(usinaSelecionada.qtd_modulos)
    if (usinasDoCliente.length > 0) {
      const soma = usinasDoCliente.reduce((acc, u) => acc + (Number(u.qtd_modulos) || 0), 0)
      if (soma > 0) return soma
    }
    return 0
  }, [usinaSelecionada, usinasDoCliente])

  // Endereço e cidade consolidados
  const cidadeEfetiva = useMemo(() => {
    if (cidadeCliente && cidadeCliente.trim()) return cidadeCliente.trim()
    if (usinaSelecionada?.cidade) return usinaSelecionada.cidade.trim()
    if (usinasDoCliente.length > 0 && usinasDoCliente[0]?.cidade) {
      return usinasDoCliente[0].cidade.trim()
    }
    return ''
  }, [cidadeCliente, usinaSelecionada, usinasDoCliente])

  const enderecoEfetivo = useMemo(() => {
    if (enderecoCliente && enderecoCliente.trim()) return enderecoCliente.trim()
    if (usinaSelecionada?.endereco) return usinaSelecionada.endereco.trim()
    return ''
  }, [enderecoCliente, usinaSelecionada])

  // Estimativa de distância inicial
  const estimativaInicial = useMemo(() => {
    return estimarDistanciaDelfosCliente(
      enderecoEfetivo || cidadeEfetiva,
      cidadeEfetiva,
      usinaSelecionada?.coordenadas,
    )
  }, [enderecoEfetivo, cidadeEfetiva, usinaSelecionada])

  // Estados dos campos editáveis
  const [valorServico, setValorServico] = useState<string>(() => {
    if (initialValues?.valorServico !== undefined) {
      return String(initialValues.valorServico)
    }
    if (valorBaseSugerido !== undefined && valorBaseSugerido > 0) {
      return String(valorBaseSugerido)
    }
    return categoria === 'manutencao' ? '250' : '0'
  })

  const [valorPorPlaca, setValorPorPlaca] = useState<string>(() => {
    if (initialValues?.valorPorPlaca !== undefined && initialValues.valorPorPlaca > 0) {
      return String(initialValues.valorPorPlaca)
    }
    if (valorPorPlacaSugerido !== undefined && valorPorPlacaSugerido > 0) {
      return String(valorPorPlacaSugerido)
    }
    return ''
  })

  const [qtdModulos, setQtdModulos] = useState<string>(() => {
    if (initialValues?.qtdModulos !== undefined && initialValues.qtdModulos > 0) {
      return String(initialValues.qtdModulos)
    }
    if (modulosUsina > 0) {
      return String(modulosUsina)
    }
    return ''
  })

  const [cobrarDeslocamento, setCobrarDeslocamento] = useState<boolean>(() => {
    if (initialValues?.cobrarDeslocamento !== undefined) {
      return initialValues.cobrarDeslocamento
    }
    return true
  })

  const [distanciaKm, setDistanciaKm] = useState<string>(() => {
    if (initialValues?.distanciaKm !== undefined && initialValues.distanciaKm > 0) {
      return String(initialValues.distanciaKm)
    }
    return String(estimativaInicial.distanciaKm || 15)
  })

  const [valorKm, setValorKm] = useState<string>(() => {
    if (initialValues?.valorKm !== undefined && initialValues.valorKm > 0) {
      return String(initialValues.valorKm)
    }
    return String(config.valorKmPadrao || 1.2)
  })

  const [infoEstimativa, setInfoEstimativa] = useState(estimativaInicial.detalhe)
  const [mostrarConfigAvancada, setMostrarConfigAvancada] = useState(false)

  // Atualizar quando mudar de usina ou cliente
  useEffect(() => {
    if (modulosUsina > 0 && (!qtdModulos || qtdModulos === '0')) {
      setQtdModulos(String(modulosUsina))
    }
  }, [modulosUsina, qtdModulos])

  // Quando o valor padrão sugerido pelo tipo mudar
  useEffect(() => {
    if (valorBaseSugerido !== undefined && valorBaseSugerido > 0) {
      setValorServico(String(valorBaseSugerido))
    }
    if (valorPorPlacaSugerido !== undefined && valorPorPlacaSugerido > 0) {
      setValorPorPlaca(String(valorPorPlacaSugerido))
    }
  }, [valorBaseSugerido, valorPorPlacaSugerido])

  // Recalcular distância automaticamente a partir do endereço
  const handleRecalcularDistancia = () => {
    const est = estimarDistanciaDelfosCliente(
      enderecoEfetivo || cidadeEfetiva,
      cidadeEfetiva,
      usinaSelecionada?.coordenadas,
    )
    setDistanciaKm(String(est.distanciaKm))
    setInfoEstimativa(est.detalhe)
  }

  // Realizar cálculos
  const numServico = Math.max(0, parseFloat(valorServico.replace(',', '.')) || 0)
  const numPlaca = Math.max(0, parseFloat(valorPorPlaca.replace(',', '.')) || 0)
  const numModulos = Math.max(0, parseInt(qtdModulos, 10) || 0)
  const numDist = Math.max(0, parseFloat(distanciaKm.replace(',', '.')) || 0)
  const numValorKm = Math.max(0, parseFloat(valorKm.replace(',', '.')) || 0)

  const resultadoCalculo = useMemo(() => {
    return calcularCustosAtividade({
      valorServico: numServico,
      valorPorPlaca: numPlaca > 0 ? numPlaca : undefined,
      qtdModulos: numModulos > 0 ? numModulos : undefined,
      cobrarDeslocamento,
      distanciaKm: numDist,
      valorKm: numValorKm,
      cobrarIdaEVolta: true,
    })
  }, [numServico, numPlaca, numModulos, cobrarDeslocamento, numDist, numValorKm])

  // Propagar dados para o componente pai
  useEffect(() => {
    onChange({
      valorServico: numServico,
      valorPorPlaca: numPlaca > 0 ? numPlaca : undefined,
      qtdModulos: numModulos > 0 ? numModulos : undefined,
      cobrarDeslocamento,
      distanciaKm: numDist,
      valorKm: numValorKm,
      custoDeslocamento: resultadoCalculo.custoDeslocamento,
      custoPlacas: resultadoCalculo.custoPlacas,
      custoTotal: resultadoCalculo.custoTotal,
    })
  }, [
    numServico,
    numPlaca,
    numModulos,
    cobrarDeslocamento,
    numDist,
    numValorKm,
    resultadoCalculo,
    onChange,
  ])

  // Salvar novo valor padrão de KM se o usuário alterar
  const handleSalvarKmPadrao = () => {
    if (numValorKm > 0) {
      saveConfiguracaoDeslocamento({ valorKmPadrao: numValorKm })
    }
  }

  return (
    <div className="rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/40 via-white to-sky-50/30 p-3.5 space-y-3.5">
      {/* Cabeçalho do Bloco */}
      <div className="flex items-center justify-between pb-2 border-b border-emerald-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">
              Custos de Serviço e Deslocamento
            </h4>
            <p className="text-[10px] text-gray-500">
              Valores editáveis com cálculo automático de deslocamento e placas
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMostrarConfigAvancada((p) => !p)}
          className="text-[11px] text-gray-500 hover:text-emerald-700 font-medium inline-flex items-center gap-1 transition-colors"
          title="Ver configurações de base e deslocamento"
        >
          <Sliders className="w-3 h-3 text-emerald-600" />
          <span>{mostrarConfigAvancada ? 'Ocultar Base' : 'Base Delfos'}</span>
        </button>
      </div>

      {/* Configuração da Base Delfos (quando expandida) */}
      {mostrarConfigAvancada && (
        <div className="p-2.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 space-y-1.5 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">Sede Delfos Solar:</span>
            <span className="text-[10px] text-gray-500">
              {config.baseCidade}/{config.baseUf}
            </span>
          </div>
          <p className="text-[11px] text-gray-600">
            {config.baseEndereco} — {config.baseCep}
          </p>
          <div className="flex items-center justify-between pt-1 text-[11px] border-t border-gray-100 text-gray-500">
            <span>Cálculo padrão: Ida e Volta (× 2)</span>
            <button
              type="button"
              onClick={handleSalvarKmPadrao}
              className="text-emerald-700 hover:underline font-semibold"
            >
              Definir R$ {numValorKm.toFixed(2)}/km como padrão
            </button>
          </div>
        </div>
      )}

      {/* Bloco 1: Campos de Custo do Serviço e Placas */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
          1. Custos de Serviço
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Valor do Serviço */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 block mb-1">
              Valor do Serviço (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-medium">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorServico}
                onChange={(e) => setValorServico(e.target.value)}
                placeholder="250,00"
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
              />
            </div>
            <span className="text-[9px] text-gray-400 block mt-0.5">
              Valor padrão pré-cadastrado
            </span>
          </div>

          {/* Valor por Placa */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 block mb-1 flex items-center gap-1">
              <span>Valor por Placa (R$)</span>
              <span className="text-[9px] text-gray-400 font-normal">(opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-medium">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorPorPlaca}
                onChange={(e) => setValorPorPlaca(e.target.value)}
                placeholder="Ex: 12,50"
                className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900"
              />
            </div>
            <span className="text-[9px] text-gray-400 block mt-0.5">
              Para lavagem / manutenção por módulo
            </span>
          </div>

          {/* Quantidade de Módulos */}
          <div>
            <label className="text-[11px] font-semibold text-gray-700 block mb-1 flex items-center justify-between">
              <span>Qtd. Módulos</span>
              {modulosUsina > 0 && (
                <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5">
                  <Sun className="w-2.5 h-2.5" /> Usina ({modulosUsina})
                </span>
              )}
            </label>
            <input
              type="number"
              min="0"
              value={qtdModulos}
              onChange={(e) => setQtdModulos(e.target.value)}
              placeholder="Ex: 32"
              className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
            />
            {numPlaca > 0 && numModulos > 0 && (
              <span className="text-[10px] text-emerald-800 font-semibold block mt-0.5">
                Subtotal placas: R${' '}
                {resultadoCalculo.custoPlacas.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bloco 2: Deslocamento */}
      <div className="space-y-2 pt-2 border-t border-emerald-100/80">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
            2. Deslocamento (Delfos → Cliente)
          </span>

          <label className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded-lg border border-gray-200 shadow-2xs hover:border-emerald-300 transition-colors">
            <input
              type="checkbox"
              checked={cobrarDeslocamento}
              onChange={(e) => setCobrarDeslocamento(e.target.checked)}
              className="w-3.5 h-3.5 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300"
            />
            <span className="text-xs font-semibold text-gray-800">Cobrar deslocamento?</span>
          </label>
        </div>

        {cobrarDeslocamento ? (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Distância em KM */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Navigation className="w-3 h-3 text-emerald-600" />
                    Distância (KM só ida)
                  </span>
                  <button
                    type="button"
                    onClick={handleRecalcularDistancia}
                    className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5 font-medium"
                    title="Recalcular distância a partir do endereço cadastrado"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    Recalcular
                  </button>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={distanciaKm}
                    onChange={(e) => setDistanciaKm(e.target.value)}
                    placeholder="35"
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                  />
                  <span className="absolute right-2.5 top-1.5 text-xs text-gray-400 font-medium">
                    km
                  </span>
                </div>
                <p className="text-[9px] text-gray-500 mt-0.5 truncate" title={infoEstimativa}>
                  {infoEstimativa}
                </p>
              </div>

              {/* Valor do KM rodado */}
              <div>
                <label className="text-[11px] font-semibold text-gray-700 block mb-1">
                  Valor do KM rodado (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-medium">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    value={valorKm}
                    onChange={(e) => setValorKm(e.target.value)}
                    placeholder="1,20"
                    className="w-full text-xs pl-8 pr-2.5 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-gray-900 font-medium"
                  />
                </div>
                <span className="text-[9px] text-gray-400 block mt-0.5">
                  Ida e volta: {resultadoCalculo.kmTotalRodado} km total (× 2)
                </span>
              </div>
            </div>

            {/* Subtotal do deslocamento */}
            <div className="p-2 rounded-lg bg-sky-50/70 border border-sky-100 text-xs text-sky-900 flex items-center justify-between">
              <span>
                Custo de Deslocamento ({resultadoCalculo.kmTotalRodado} km × R${' '}
                {numValorKm.toFixed(2)}/km):
              </span>
              <strong className="text-sky-900 font-bold">
                R${' '}
                {resultadoCalculo.custoDeslocamento.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </strong>
            </div>
          </div>
        ) : (
          <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-500 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-gray-400" />
            <span>Deslocamento isento / não cobrado para este atendimento.</span>
          </div>
        )}
      </div>

      {/* Bloco 3: Resumo e Custo Total Calculado */}
      <div className="p-3 rounded-xl bg-emerald-900 text-white shadow-sm flex items-center justify-between flex-wrap gap-2">
        <div>
          <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
            Custo Total do Serviço
          </span>
          <div className="text-[11px] text-emerald-100/90 mt-0.5 flex items-center gap-2 flex-wrap">
            <span>
              Serviço: R${' '}
              {resultadoCalculo.custoServicoEfetivo.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </span>
            {cobrarDeslocamento && (
              <>
                <span>+</span>
                <span>
                  Deslocamento: R${' '}
                  {resultadoCalculo.custoDeslocamento.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg sm:text-xl font-extrabold text-white">
            R${' '}
            {resultadoCalculo.custoTotal.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </span>
          <span className="text-[10px] text-emerald-300 block">Calculado automaticamente</span>
        </div>
      </div>
    </div>
  )
}

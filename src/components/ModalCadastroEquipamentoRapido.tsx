import React, { useState } from 'react'
import { X, Cpu, Sun, AlertCircle, RefreshCw } from 'lucide-react'
import { createEquipamento } from '@/services/equipamentosService'
import type { Equipamento, TipoEquipamento } from '@/types/equipamentos'
import { toast } from 'sonner'

export interface ModalCadastroEquipamentoRapidoProps {
  isOpen: boolean
  onClose: () => void
  tipoInicial: TipoEquipamento
  marcaInicial?: string
  modeloInicial?: string
  potenciaInicial?: number
  fornecedorNome?: string
  onEquipamentoCadastrado: (novo: Equipamento) => void
}

export function ModalCadastroEquipamentoRapido({
  isOpen,
  onClose,
  tipoInicial,
  marcaInicial = '',
  modeloInicial = '',
  potenciaInicial = 0,
  fornecedorNome = '',
  onEquipamentoCadastrado,
}: ModalCadastroEquipamentoRapidoProps) {
  const [tipo, setTipo] = useState<TipoEquipamento>(tipoInicial)
  const [marca, setMarca] = useState(marcaInicial)
  const [modelo, setModelo] = useState(modeloInicial)
  const [potenciaW, setPotenciaW] = useState<string>(
    potenciaInicial > 0 ? String(potenciaInicial) : '',
  )
  const [fornecedor, setFornecedor] = useState(fornecedorNome)
  const [garantiaAnos, setGarantiaAnos] = useState<string>(tipoInicial === 'inversor' ? '10' : '15')
  const [descricaoPadrao, setDescricaoPadrao] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Sincroniza com as props quando o modal abre
  React.useEffect(() => {
    if (isOpen) {
      setTipo(tipoInicial)
      setMarca(marcaInicial)
      setModelo(modeloInicial)
      setPotenciaW(potenciaInicial > 0 ? String(potenciaInicial) : '')
      setFornecedor(fornecedorNome)
      setGarantiaAnos(tipoInicial === 'inversor' ? '10' : '15')
      setDescricaoPadrao(
        fornecedorNome
          ? `Fornecedor: ${fornecedorNome} | ${tipoInicial === 'inversor' ? 'Inversor' : 'Módulo FV'}`
          : '',
      )
      setErrorMessage(null)
    }
  }, [isOpen, tipoInicial, marcaInicial, modeloInicial, potenciaInicial, fornecedorNome])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!marca.trim()) {
      setErrorMessage('Informe a marca do equipamento.')
      return
    }
    if (!modelo.trim()) {
      setErrorMessage('Informe o modelo do equipamento.')
      return
    }
    const potNum = Number(potenciaW)
    if (!potNum || potNum <= 0) {
      setErrorMessage(
        'Informe uma potência válida em Watts (ex: 550 para módulo, 5000 para inversor 5kW).',
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const descFinal = descricaoPadrao.trim()
        ? descricaoPadrao.trim()
        : fornecedor.trim()
          ? `Fornecedor: ${fornecedor.trim()}`
          : ''

      const criado = await createEquipamento({
        tipo,
        marca: marca.trim(),
        modelo: modelo.trim(),
        potencia_w: potNum,
        descricao_padrao: descFinal,
        garantia_anos: garantiaAnos ? Number(garantiaAnos) : null,
      })

      toast.success(
        `${tipo === 'inversor' ? 'Inversor' : 'Módulo FV'} cadastrado no banco com sucesso!`,
      )
      onEquipamentoCadastrado(criado)
      onClose()
    } catch (err: any) {
      console.error('Erro ao cadastrar equipamento rápido:', err)
      setErrorMessage(err?.message || 'Falha ao salvar no banco de dados. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/70 backdrop-blur-[2px] animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Topo */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              {tipo === 'inversor' ? <Cpu className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                Cadastrar no Banco de Equipamentos
              </h2>
              <p className="text-[11px] text-gray-500">
                Salva permanentemente para vincular aos orçamentos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Não foi possível salvar</p>
                <p className="text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Tipo de Equipamento */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Tipo de Equipamento *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTipo('modulo_fv')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  tipo === 'modulo_fv'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-1 ring-amber-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Sun
                  className={`w-4 h-4 ${tipo === 'modulo_fv' ? 'text-amber-600' : 'text-gray-400'}`}
                />
                <span>Módulo FV</span>
              </button>
              <button
                type="button"
                onClick={() => setTipo('inversor')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  tipo === 'inversor'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-1 ring-blue-500'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Cpu
                  className={`w-4 h-4 ${tipo === 'inversor' ? 'text-blue-600' : 'text-gray-400'}`}
                />
                <span>Inversor</span>
              </button>
            </div>
          </div>

          {/* Marca e Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Marca *
              </label>
              <input
                type="text"
                required
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ex: Huawei, Growatt, JA Solar"
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Modelo *
              </label>
              <input
                type="text"
                required
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ex: SUN2000-6KTL-L1, JAM66D45LB"
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Potência (W) e Garantia (anos) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Potência (W) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={potenciaW}
                  onChange={(e) => setPotenciaW(e.target.value)}
                  placeholder={tipo === 'inversor' ? 'Ex: 5000' : 'Ex: 550'}
                  className="w-full text-xs font-semibold pl-3 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-gray-400 pointer-events-none">
                  W
                </span>
              </div>
              <span className="text-[10px] text-gray-400 block mt-0.5">
                {tipo === 'inversor' ? 'Ex: 5000 W (5 kW), 7300 W' : 'Ex: 550 W, 610 W, 620 W'}
              </span>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
                Garantia (anos)
              </label>
              <input
                type="number"
                min="0"
                value={garantiaAnos}
                onChange={(e) => setGarantiaAnos(e.target.value)}
                placeholder="Ex: 10 ou 15"
                className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-gray-400 block mt-0.5">
                Tempo de garantia de fábrica
              </span>
            </div>
          </div>

          {/* Fornecedor de Origem */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Fornecedor de Origem
            </label>
            <input
              type="text"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              placeholder="Ex: MAXSUL, Fotus, Aldo Solar"
              className="w-full text-xs font-medium px-3 py-2 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Descrição Padrão */}
          <div>
            <label className="text-[11px] font-bold text-gray-700 uppercase block mb-1">
              Descrição Padrão / Observações
            </label>
            <textarea
              rows={2}
              value={descricaoPadrao}
              onChange={(e) => setDescricaoPadrao(e.target.value)}
              placeholder="Ex: Módulo bifacial N-Type com células TOPCon..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </div>

          {/* Rodapé */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 border border-gray-300 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <span>Salvar no Banco</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

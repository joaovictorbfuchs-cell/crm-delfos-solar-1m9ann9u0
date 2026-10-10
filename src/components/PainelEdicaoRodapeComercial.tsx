import React, { useState, useEffect } from 'react'
import {
  FileText,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getRodapeComercialRelatorioOS,
  setRodapeComercialRelatorioOS,
  RODAPE_COMERCIAL_PADRAO,
  RodapeComercialConfig,
} from '@/services/configuracoesService'
import { useToast } from '@/hooks/use-toast'

interface PainelEdicaoRodapeComercialProps {
  onSalvo?: (config: RodapeComercialConfig) => void
}

export const PainelEdicaoRodapeComercial: React.FC<PainelEdicaoRodapeComercialProps> = ({
  onSalvo,
}) => {
  const { toast } = useToast()
  const [loading, setLoading] = useState<boolean>(true)
  const [salvando, setSalvando] = useState<boolean>(false)
  const [config, setConfig] = useState<RodapeComercialConfig>({ ...RODAPE_COMERCIAL_PADRAO })

  useEffect(() => {
    let cancel = false
    async function carregar() {
      try {
        const dados = await getRodapeComercialRelatorioOS()
        if (!cancel) {
          setConfig(dados)
        }
      } catch (err) {
        console.warn('Erro ao carregar rodapé comercial:', err)
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    carregar()
    return () => {
      cancel = true
    }
  }, [])

  const handleSalvar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSalvando(true)
    try {
      const salvo = await setRodapeComercialRelatorioOS(config)
      setConfig(salvo)
      toast({
        title: 'Rodapé comercial atualizado!',
        description:
          'Os novos relatórios técnicos de OS gerados utilizarão este texto e chamada comercial.',
      })
      if (onSalvo) onSalvo(salvo)
    } catch (err) {
      console.error('Erro ao salvar rodapé comercial:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar',
        description: 'Não foi possível gravar na coleção de configurações.',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleRestaurarPadrao = async () => {
    setConfig({ ...RODAPE_COMERCIAL_PADRAO })
    setSalvando(true)
    try {
      const salvo = await setRodapeComercialRelatorioOS(RODAPE_COMERCIAL_PADRAO)
      setConfig(salvo)
      toast({
        title: 'Padrão restaurado!',
        description: 'Os textos do Plano Delfos de Manutenção e indicação foram redefinidos.',
      })
      if (onSalvo) onSalvo(salvo)
    } catch (err) {
      console.error('Erro ao restaurar padrão:', err)
      toast({
        variant: 'destructive',
        title: 'Falha ao restaurar padrão',
        description: 'Tente novamente.',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-emerald-50/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#166534] to-[#16A34A] text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Rodapé Comercial do Relatório Técnico de OS
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                PDF Oficial
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Personalize o texto comercial, a oferta do Plano de Manutenção e a mecânica de
              indicação exibidos no relatório
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRestaurarPadrao}
          disabled={salvando || loading}
          className="text-xs font-semibold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700"
          title="Restaurar textos padrão originais da Delfos"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Restaurar Padrão
        </Button>
      </div>

      <form onSubmit={handleSalvar} className="p-4 sm:p-5 space-y-4">
        {/* Título do Bloco Comercial */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5">
            Título Comercial / Oferta
          </label>
          <input
            type="text"
            value={config.titulo}
            onChange={(e) => setConfig({ ...config, titulo: e.target.value })}
            placeholder="Ex: Plano Delfos de Manutenção Preventiva & O&M"
            className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {/* Textarea para o Texto do Rodapé */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block">
              Texto Principal do Rodapé (Descrição do Plano / Benefícios)
            </label>
            <span className="text-[11px] text-gray-400">
              Gravado na chave rodape_comercial_relatorio_os
            </span>
          </div>
          <textarea
            rows={4}
            value={config.descricao}
            onChange={(e) => setConfig({ ...config, descricao: e.target.value })}
            placeholder="Descreva os benefícios do plano de manutenção, garantias e acompanhamento técnico..."
            className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs leading-relaxed"
          />
        </div>

        {/* Mecânica de Indicação */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Mecânica de Indicação de Clientes</span>
          </label>
          <input
            type="text"
            value={config.indicacao}
            onChange={(e) => setConfig({ ...config, indicacao: e.target.value })}
            placeholder="Ex: Indique um amigo para instalar ou revisar sua usina solar e ganhe benefícios!"
            className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {/* Linha de Contato Comercial */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700 block mb-1.5">
            Contato Comercial &amp; Canais de Atendimento
          </label>
          <input
            type="text"
            value={config.contato}
            onChange={(e) => setConfig({ ...config, contato: e.target.value })}
            placeholder="Ex: Dúvidas ou agendamentos: (54) 99129-2121 • solar@updates.delfos.eng.br"
            className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
          />
        </div>

        {/* Preview do Rodapé */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 text-xs">
          <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Pré-visualização do Bloco no PDF:</span>
          </div>
          <div className="font-bold text-gray-900">★ {config.titulo || 'Sem título'}</div>
          <div className="text-gray-700 mt-1 leading-relaxed">
            {config.descricao || 'Sem descrição'}
          </div>
          {config.indicacao && (
            <div className="text-amber-800 font-semibold mt-1">🎁 {config.indicacao}</div>
          )}
          {config.contato && <div className="text-gray-600 text-[11px] mt-1">{config.contato}</div>}
        </div>

        {/* Footer com Salvar */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">
            Atualização instantânea no backend PocketBase
          </span>
          <Button
            type="submit"
            disabled={salvando || loading}
            className="h-10 px-5 text-xs font-bold bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl shadow-xs inline-flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{salvando ? 'Salvando...' : 'Salvar Rodapé Comercial'}</span>
          </Button>
        </div>
      </form>
    </div>
  )
}

export default PainelEdicaoRodapeComercial

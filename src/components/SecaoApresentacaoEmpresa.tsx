import React, { useEffect, useState } from 'react'
import { Calendar, Zap, Compass, Headphones, MapPin } from 'lucide-react'
import { fetchInstalacoesGaleria, getFotoUrl } from '@/services/instalacoesGaleriaService'
import { USINAS_PORTFOLIO_PADRAO } from '@/lib/portfolioUsinasAssets'
import type { InstalacaoGaleria } from '@/types/instalacoesGaleria'

export interface SecaoApresentacaoEmpresaProps {
  className?: string
  /**
   * IDs das usinas selecionadas para esta proposta.
   * Se for undefined, nulo ou vazio, exibe o portfólio padrão de 6 usinas.
   */
  instalacoesSelecionadasIds?: string[]
  /**
   * Toggle de visibilidade do portfólio de usinas (Parte 2).
   * Padrão true (fallback true para orçamentos antigos).
   */
  exibirPortfolio?: boolean
}

interface UsinaCardItem {
  id: string
  titulo: string
  tipo: string
  cidade: string
  potenciaKwp: number
  foto: string
}

/**
 * Seção de Apresentação Institucional da Delfos Solar e Portfólio de Usinas.
 * Replicando exatamente a estrutura da proposta técnica-comercial impressa (A4/PDF):
 * - Parte 1: Quem Somos (H2 "A Delfos Solar", subtítulo verde, badge, 5 diferenciais com ícones)
 * - Parte 2: Portfólio (Grid 3x2 com as 6 usinas e ilustrações de portfolioUsinasAssets)
 */
export const SecaoApresentacaoEmpresa: React.FC<SecaoApresentacaoEmpresaProps> = ({
  className = '',
  instalacoesSelecionadasIds,
  exibirPortfolio = true,
}) => {
  const [usinasGaleria, setUsinasGaleria] = useState<InstalacaoGaleria[]>([])

  useEffect(() => {
    let cancel = false
    async function carregar() {
      try {
        const dados = await fetchInstalacoesGaleria()
        if (!cancel && dados && dados.length > 0) {
          setUsinasGaleria(dados)
        }
      } catch (err) {
        // Fallback silencioso para USINAS_PORTFOLIO_PADRAO
        console.warn('Usando portfólio padrão vetorial Delfos:', err)
      }
    }
    carregar()
    return () => {
      cancel = true
    }
  }, [])

  // Lista consolidada de usinas (6 itens em grid 3x2)
  const usinasExibicao = React.useMemo<UsinaCardItem[]>(() => {
    // Se o usuário selecionou usinas da galeria salva
    if (
      usinasGaleria.length > 0 &&
      instalacoesSelecionadasIds &&
      instalacoesSelecionadasIds.length > 0
    ) {
      const filtradas = usinasGaleria.filter((u) => instalacoesSelecionadasIds.includes(u.id))
      if (filtradas.length > 0) {
        return filtradas.slice(0, 6).map((u) => ({
          id: u.id,
          titulo: u.titulo || 'Usina Fotovoltaica Delfos',
          tipo: 'solar',
          cidade: u.cidade || 'Erechim / RS',
          potenciaKwp: Number(u.potencia_kwp) || 0,
          foto: getFotoUrl(u),
        }))
      }
    }

    // Padrão consolidado das 6 usinas com ilustrações Base64 oficiais
    return USINAS_PORTFOLIO_PADRAO.map((u) => ({
      id: u.id,
      titulo: u.titulo,
      tipo: u.tipo,
      cidade: u.cidade,
      potenciaKwp: u.potenciaKwp,
      foto: u.fotoBase64,
    }))
  }, [usinasGaleria, instalacoesSelecionadasIds])

  const getBadgeTipoClass = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'residencial':
        return 'bg-emerald-600/90 text-white'
      case 'comercial':
        return 'bg-[#0A539E]/90 text-white'
      case 'industrial':
        return 'bg-amber-600/90 text-white'
      case 'rural':
        return 'bg-green-700/90 text-white'
      default:
        return 'bg-emerald-600/90 text-white'
    }
  }

  return (
    <section
      id="secao-apresentacao-empresa"
      className={`bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden p-6 sm:p-8 space-y-6 ${className}`}
      aria-label="Apresentação Institucional Delfos Solar"
    >
      {/* Parte 1 — Quem Somos (Sempre renderizada) */}
      <div className="bg-white border border-slate-200 border-l-4 border-l-[#16A34A] rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span>🏢</span> INSTITUCIONAL
          </span>
          <span className="text-[11px] font-extrabold text-[#0A539E] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            DESDE 2014
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-[#0A539E] tracking-tight leading-tight m-0">
          A Delfos Solar
        </h2>
        <div className="text-sm font-bold text-[#16A34A] mt-0.5">Energia que gera retorno</div>

        <p className="mt-3 text-xs sm:text-sm text-slate-700 leading-relaxed max-w-4xl">
          A Delfos Solar é uma empresa de engenharia especializada no desenvolvimento, homologação e
          implantação de soluções de energia fotovoltaica de alto rendimento. Nossa missão é
          transformar contas de energia em ativos estratégicos de rentabilidade, segurança
          financeira e valorização patrimonial para clientes residenciais, comerciais, industriais e
          do agronegócio.
        </p>

        {/* Grid de 5 Diferenciais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-5">
          {/* Card 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0A539E] flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-extrabold text-[#0A539E] leading-tight">
                12 Anos de Atuação
              </div>
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              12 anos de atuação no mercado de energia com solidez e pioneirismo.
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0A539E] flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-extrabold text-[#0A539E] leading-tight">
                +2.500 Projetos
              </div>
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              +2.500 projetos entregues e homologados com excelência técnica.
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0A539E] flex items-center justify-center shrink-0">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-extrabold text-[#0A539E] leading-tight">
                Engenharia Própria
              </div>
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              Engenharia própria — projetos turnkey, do projeto à homologação.
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0A539E] flex items-center justify-center shrink-0">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-extrabold text-[#0A539E] leading-tight">
                Pós-Venda Ativo
              </div>
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              Pós-venda estruturado — monitoramento, manutenção e suporte técnico.
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 shadow-2xs hover:border-blue-200 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#0A539E] flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-extrabold text-[#0A539E] leading-tight">
                Atuação Regional
              </div>
            </div>
            <div className="text-[11px] text-slate-600 leading-snug">
              Atuação regional — presente nos 3 estados do Sul do Brasil.
            </div>
          </div>
        </div>
      </div>

      {/* Parte 2 — Portfólio (Controlada por exibirPortfolio) */}
      {exibirPortfolio && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#0A539E] m-0">
                Conheça algumas de nossas instalações
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Usinas projetadas, homologadas e entregues em operação nos 3 estados do Sul
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full uppercase tracking-wider">
              Projetos Reais Homologados
            </span>
          </div>

          {/* Grid 3x2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {usinasExibicao.slice(0, 6).map((u) => {
              const potTexto = u.potenciaKwp
                ? `${u.potenciaKwp.toLocaleString('pt-BR', { minimumFractionDigits: u.potenciaKwp % 1 === 0 ? 0 : 1, maximumFractionDigits: 2 })} kWp`
                : 'Turnkey'

              return (
                <div
                  key={u.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="relative w-full h-32 bg-slate-100 overflow-hidden border-b border-slate-200">
                    <img
                      src={u.foto}
                      alt={u.titulo}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span
                      className={`absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider border border-white/30 shadow-xs ${getBadgeTipoClass(u.tipo)}`}
                    >
                      {u.tipo}
                    </span>
                    <span className="absolute bottom-2 right-2 bg-[#0A539E]/95 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-full border border-white/30 shadow-xs">
                      ⚡ {potTexto}
                    </span>
                  </div>
                  <div className="p-3">
                    <div
                      className="text-xs font-extrabold text-[#0A539E] truncate mb-1"
                      title={u.titulo}
                    >
                      {u.titulo}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-slate-600 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                        {u.cidade}
                      </span>
                      <span className="font-extrabold text-[#16A34A] shrink-0">{potTexto}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

export default SecaoApresentacaoEmpresa

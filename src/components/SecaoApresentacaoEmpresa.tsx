import React, { useEffect, useState } from 'react'
import { Building2, ShieldCheck, CheckCircle2, Award, Sun, MapPin, Zap } from 'lucide-react'
import { fetchInstalacoesGaleria, getFotoUrl } from '@/services/instalacoesGaleriaService'
import type { InstalacaoGaleria } from '@/types/instalacoesGaleria'

export interface SecaoApresentacaoEmpresaProps {
  className?: string
  /**
   * IDs das usinas selecionadas para esta proposta.
   * Se for undefined, nulo ou vazio, exibe todas as usinas (fallback obrigatório).
   */
  instalacoesSelecionadasIds?: string[]
}

/**
 * Seção de Apresentação Institucional da Delfos Engenharia Solar e Portfólio de Usinas.
 * Exibida logo após a Capa da Proposta Comercial.
 */
export const SecaoApresentacaoEmpresa: React.FC<SecaoApresentacaoEmpresaProps> = ({
  className = '',
  instalacoesSelecionadasIds,
}) => {
  const [todasUsinas, setTodasUsinas] = useState<InstalacaoGaleria[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      try {
        const dados = await fetchInstalacoesGaleria()
        if (!cancel) {
          setTodasUsinas(dados || [])
        }
      } catch (err) {
        console.error('Erro ao carregar galeria de usinas:', err)
      } finally {
        if (!cancel) {
          setLoading(false)
        }
      }
    }
    carregar()
    return () => {
      cancel = true
    }
  }, [])

  // Filtragem com fallback: se o array de selecionadas estiver vazio/null/undefined, exibe todas
  const usinas = React.useMemo(() => {
    if (!instalacoesSelecionadasIds || instalacoesSelecionadasIds.length === 0) {
      return todasUsinas
    }
    const filtradas = todasUsinas.filter((u) => instalacoesSelecionadasIds.includes(u.id))
    // Fallback de segurança: se nenhuma foi encontrada pelos IDs, mantém todas
    return filtradas.length > 0 ? filtradas : todasUsinas
  }, [todasUsinas, instalacoesSelecionadasIds])

  return (
    <section
      id="secao-apresentacao-empresa"
      className={`bg-white rounded-3xl border border-gray-200/90 shadow-sm overflow-hidden transition-all ${className}`}
      aria-label="Apresentação da Empresa e Engenharia Delfos"
    >
      {/* Topo Institucional */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8">
        <div className="max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md text-emerald-100 border border-white/20">
            <Building2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="uppercase tracking-wider">
              Apresentação Institucional & Engenharia
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            Delfos Engenharia Ltda (Delfos Solar)
          </h2>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-emerald-100/90 font-medium">
            <span>
              CNPJ: <strong>21.379.952/0001-38</strong>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-300" />
              Erechim / RS
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1 text-amber-200 font-bold">
              <Award className="w-3.5 h-3.5" />
              Responsável Técnico: Eng. João Victor Bagetti Fuchs — CREA RS151894
            </span>
          </div>

          <p className="text-sm sm:text-base text-emerald-50 leading-relaxed font-normal pt-1">
            Engenharia própria especializada em projetos fotovoltaicos de alta eficiência,
            homologação completa junto à concessionária de energia e rigorosa garantia de desempenho
            com monitoramento em tempo real.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-300 shrink-0" />
              <div>
                <strong className="block text-white">Homologação Completa</strong>
                <span className="text-[11px] text-emerald-200">
                  ART emitida e aprovação na concessionária
                </span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 flex items-center gap-2.5">
              <Award className="w-5 h-5 text-amber-300 shrink-0" />
              <div>
                <strong className="block text-white">Equipamentos Tier-1</strong>
                <span className="text-[11px] text-emerald-200">
                  Líderes mundiais com até 30 anos de garantia
                </span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15 flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
              <div>
                <strong className="block text-white">Turnkey Completo</strong>
                <span className="text-[11px] text-emerald-200">
                  Do dimensionamento ao comissionamento e app
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Portfólio de Usinas Instaladas */}
      <div className="p-6 sm:p-8 space-y-4 bg-[#FBFDFB]">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-500" />
              Portfólio de Usinas Solares Instaladas
            </h3>
            <p className="text-xs text-gray-600">
              Conheça algumas das centenas de usinas fotovoltaicas projetadas, instaladas e
              homologadas pela Delfos Solar.
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Casos Reais • Rio Grande do Sul e Região
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-gray-100 animate-pulse border border-gray-200"
              />
            ))}
          </div>
        ) : usinas.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Fallback caso a galeria ainda não tenha registros no PocketBase */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="h-44 bg-[#F0FDF4] flex flex-col items-center justify-center text-[#166534]">
                <Sun className="w-12 h-12 text-[#16A34A] mb-1" />
                <span className="text-xs font-bold">Usina Residencial</span>
              </div>
              <div className="p-4 space-y-1">
                <h4 className="text-sm font-bold text-gray-900">Usina Residencial Erechim</h4>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Erechim / RS
                  </span>
                  <span className="font-bold text-emerald-700">10,5 kWp</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="h-44 bg-[#F0FDF4] flex flex-col items-center justify-center text-[#166534]">
                <Sun className="w-12 h-12 text-[#16A34A] mb-1" />
                <span className="text-xs font-bold">Usina Comercial</span>
              </div>
              <div className="p-4 space-y-1">
                <h4 className="text-sm font-bold text-gray-900">Usina Comercial Centro</h4>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Passo Fundo / RS
                  </span>
                  <span className="font-bold text-emerald-700">35,0 kWp</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
              <div className="h-44 bg-[#F0FDF4] flex flex-col items-center justify-center text-[#166534]">
                <Sun className="w-12 h-12 text-[#16A34A] mb-1" />
                <span className="text-xs font-bold">Usina Rural</span>
              </div>
              <div className="p-4 space-y-1">
                <h4 className="text-sm font-bold text-gray-900">Usina Agropecuária</h4>
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Getúlio Vargas / RS
                  </span>
                  <span className="font-bold text-emerald-700">50,0 kWp</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {usinas.map((usina) => {
              const foto = getFotoUrl(usina)
              const temFoto = !!(usina.foto || usina.foto_url)
              return (
                <div
                  key={usina.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-[#F0FDF4]">
                    {temFoto ? (
                      <img
                        src={foto}
                        alt={usina.titulo || 'Usina Solar Delfos'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.classList.add('flex', 'items-center', 'justify-center')
                            parent.innerHTML = `
                              <div class="flex flex-col items-center justify-center text-[#166534] p-4 text-center">
                                <svg class="w-10 h-10 text-[#16A34A] mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
                                <span class="text-xs font-bold">${usina.titulo || 'Usina Solar'}</span>
                              </div>
                            `
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-[#166534] p-4 text-center">
                        <Sun className="w-10 h-10 text-[#16A34A] mb-1" />
                        <span className="text-xs font-bold">
                          {usina.titulo || 'Usina Solar Delfos'}
                        </span>
                      </div>
                    )}
                    {usina.potencia_kwp ? (
                      <span className="absolute top-2.5 right-2.5 bg-emerald-900/85 backdrop-blur-xs text-white text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-white/20 shadow-xs inline-flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
                        {Number(usina.potencia_kwp).toLocaleString('pt-BR', {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 2,
                        })}{' '}
                        kWp
                      </span>
                    ) : null}
                  </div>

                  <div className="p-4 space-y-1">
                    <h4
                      className="text-sm font-bold text-gray-900 line-clamp-1"
                      title={usina.titulo}
                    >
                      {usina.titulo || 'Usina Solar Delfos'}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="flex items-center gap-1 truncate text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {usina.cidade || 'Erechim / RS'}
                      </span>
                      {usina.potencia_kwp ? (
                        <span className="font-extrabold text-[#166534] shrink-0">
                          {Number(usina.potencia_kwp).toLocaleString('pt-BR', {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 2,
                          })}{' '}
                          kWp
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700 text-[11px]">Turnkey</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default SecaoApresentacaoEmpresa

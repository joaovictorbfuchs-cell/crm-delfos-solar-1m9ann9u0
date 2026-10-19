import React, { useEffect, useState, useMemo } from 'react'
import { Printer, Share2, Check, Loader2, AlertTriangle, Camera, X, FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import logoDelfosPng from '@/assets/delfos-solar-5b5ce.png'
import { getRodapeComercialRelatorioOS } from '@/services/configuracoesService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import {
  compilarDadosRelatorioOS,
  type RelatorioOSCanonicalData,
  type FotoRegistroRelatorio,
} from '@/lib/relatorioOSCanonical'

export interface RelatorioOSConteudoProps {
  id?: string
  showHeaderActions?: boolean
  requireAuth?: boolean
}

export const RelatorioOSConteudo: React.FC<RelatorioOSConteudoProps> = ({
  id,
  showHeaderActions = true,
  requireAuth = false,
}) => {
  const navigate = useNavigate()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [os, setOs] = useState<any>(null)
  const [cliente, setCliente] = useState<any>(null)
  const [usina, setUsina] = useState<any>(null)
  const [temContratoOMAtivo, setTemContratoOMAtivo] = useState(false)
  const [fotosUrls, setFotosUrls] = useState<string[]>([])
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [fotoModal, setFotoModal] = useState<FotoRegistroRelatorio | null>(null)

  useEffect(() => {
    if (requireAuth && authLoading) return

    const currentPath = window.location.pathname + window.location.search

    if (requireAuth && (!isAuthenticated || !pb.authStore.isValid)) {
      navigate('/login', {
        state: { from: currentPath },
        replace: true,
      })
      return
    }

    let isMounted = true

    async function carregar() {
      if (!id) {
        if (isMounted) {
          setErro('Identificador da Ordem de Serviço não informado.')
          setLoading(false)
        }
        return
      }

      if (isMounted) {
        setLoading(true)
        setErro(null)
      }

      try {
        let registro: any = null
        let isAuthErrorEncountered = false

        // 1. Tenta carregar em atividades (expand cliente_id, usina_id)
        try {
          registro = await pb.collection('atividades').getOne(id, {
            expand: 'cliente_id,usina_id,responsavel_id',
          })
        } catch (err: any) {
          if (isAuthSessionError(err)) isAuthErrorEncountered = true
          registro = null
        }

        // 2. Fallback para ordens_servico se não encontrar em atividades
        if (!registro) {
          try {
            registro = await pb.collection('ordens_servico').getOne(id, {
              expand: 'cliente_id,sistema_id,responsavel_usuario_id,profissional_id',
            })
          } catch (err: any) {
            if (isAuthSessionError(err)) isAuthErrorEncountered = true
            registro = null
          }
        }

        if (!registro && isAuthErrorEncountered && requireAuth) {
          navigate('/login', {
            state: { from: currentPath },
            replace: true,
          })
          return
        }

        if (!registro) {
          if (isMounted) {
            setErro('Relatório não encontrado no sistema.')
            setLoading(false)
          }
          return
        }

        if (!isMounted) return

        setOs(registro)

        // Extrai cliente vinculado
        let cliObj =
          registro.expand?.cliente_id ||
          (registro.cliente_id
            ? await pb
                .collection('clientes')
                .getOne(registro.cliente_id)
                .catch(() => null)
            : null)
        if (isMounted) setCliente(cliObj)

        // Checa se cliente tem contrato O&M ativo
        const clienteIdFinal = cliObj?.id || registro.cliente_id
        if (clienteIdFinal) {
          try {
            const contratos = await pb.collection('contratos_om').getList(1, 10, {
              filter: `cliente_id = "${clienteIdFinal}"`,
            })
            const ativo = (contratos?.items || []).some((c: any) => {
              const st = String(c?.status || '').toLowerCase()
              const enc = String(c?.status_encerramento || '').toLowerCase()
              const encerradoOuCancelado =
                st.includes('encerrado') || st.includes('cancelado') || enc.includes('encerrado')
              return !encerradoOuCancelado
            })
            if (isMounted) setTemContratoOMAtivo(ativo)
          } catch {
            if (isMounted) setTemContratoOMAtivo(false)
          }
        } else {
          if (isMounted) setTemContratoOMAtivo(false)
        }

        // Extrai usina / sistema vinculado
        let usinaObj = registro.expand?.usina_id || registro.expand?.sistema_id || null
        if (!usinaObj && registro.usina_id) {
          usinaObj = await pb
            .collection('usinas')
            .getOne(registro.usina_id)
            .catch(() => null)
        }
        if (isMounted) setUsina(usinaObj)

        // Extrai fotos anexas
        const urls: string[] = []
        if (Array.isArray(registro.fotos) && registro.fotos.length > 0) {
          for (const f of registro.fotos) {
            if (f) {
              try {
                const u = pb.files.getURL(registro, f)
                if (u) urls.push(u)
              } catch {
                /* ignore */
              }
            }
          }
        }
        if (isMounted) setFotosUrls(urls)
      } catch (err: any) {
        if (isAuthSessionError(err) && requireAuth) {
          navigate('/login', {
            state: { from: currentPath },
            replace: true,
          })
          return
        }
        console.error('Erro ao carregar relatório da OS:', err)
        if (isMounted) {
          setErro(err?.message || 'Falha ao carregar relatório da OS.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    carregar()

    return () => {
      isMounted = false
    }
  }, [id, requireAuth, authLoading, isAuthenticated, navigate])

  // Fecha modal com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fotoModal) {
        setFotoModal(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fotoModal])

  const relatorio: RelatorioOSCanonicalData = useMemo(() => {
    return compilarDadosRelatorioOS(os, cliente, usina, fotosUrls, {
      clientePossuiContratoOMAtivo: temContratoOMAtivo,
    })
  }, [os, cliente, usina, fotosUrls, temContratoOMAtivo])

  const handleCopiarLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2500)
    } catch {
      /* ignore */
    }
  }

  const handleBaixarPdf = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#0E2A47] text-[#C9A227] flex items-center justify-center shadow-lg animate-pulse mb-4 font-black text-2xl">
          D
        </div>
        <h2 className="text-lg font-bold text-[#0E2A47]">
          Carregando Relatório de Atendimento Delfos Solar...
        </h2>
        <p className="text-xs text-[#536377] mt-1">
          Recuperando registros de execução, checklist e evidências fotográficas.
        </p>
      </div>
    )
  }

  if (erro || !os) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-[#0E2A47]">Relatório não encontrado</h2>
        <p className="text-xs text-[#536377] max-w-sm mt-1">
          {erro || 'Esta Ordem de Serviço não está disponível ou foi arquivada.'}
        </p>
      </div>
    )
  }

  return (
    <div className="relatorio-os-root min-h-screen bg-[#F7F9FC] text-[#1A2332] font-sans antialiased pb-12 print:bg-white print:p-0">
      {/* Botão flutuante Baixar PDF (dourado, pílula, oculto na impressão) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
        {showHeaderActions && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopiarLink}
            className="h-10 px-3 bg-white hover:bg-slate-50 text-[#0E2A47] border-[#DDE4EE] rounded-full shadow-md text-xs font-bold gap-1.5 cursor-pointer"
          >
            {linkCopiado ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Share2 className="w-4 h-4 text-[#0E2A47]" />
            )}
            <span className="hidden sm:inline">
              {linkCopiado ? 'Link Copiado!' : 'Compartilhar'}
            </span>
          </Button>
        )}

        <button
          type="button"
          onClick={handleBaixarPdf}
          aria-label="Baixar Relatório em PDF"
          className="inline-flex items-center gap-2 bg-[#C9A227] hover:bg-[#dbae26] text-[#0E2A47] font-bold text-sm border border-[#B38E1D] px-4 py-2.5 rounded-full cursor-pointer shadow-[0_4px_14px_rgba(201,162,39,0.4)] hover:shadow-[0_6px_18px_rgba(201,162,39,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Baixar PDF</span>
        </button>
      </div>

      {/* Container Principal do Documento */}
      <div className="max-w-[900px] mx-auto pt-6 px-4 flex flex-col gap-5 print:max-w-full print:m-0 print:p-0 print:gap-3.5">
        {/* 1. Cabeçalho Timbrado */}
        <header className="bg-[#0E2A47] text-white rounded-t-xl p-7 sm:p-8 shadow-[0_4px_16px_rgba(14,42,71,0.12)] print:rounded-t-md print:p-5 print:shadow-none print-color-exact">
          <div className="flex items-center justify-between gap-5 flex-wrap border-b border-white/15 pb-4 mb-4">
            <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
              <img
                src={logoDelfosPng}
                alt="Delfos Solar"
                className="h-12 sm:h-14 w-auto max-w-[200px] object-contain shrink-0 select-none"
              />
              <div>
                <h1 className="m-0 text-xl sm:text-[1.35rem] font-extrabold tracking-[0.04em] text-white leading-tight">
                  DELFOS ENGENHARIA SOLAR
                </h1>
                <p className="mt-1 mb-0 text-xs text-[#E2E8F0] font-medium tracking-[0.02em]">
                  Engenharia &amp; Operação de Usinas Fotovoltaicas
                </p>
              </div>
            </div>
          </div>
          <div className="text-xs text-[#C2D3E8] leading-relaxed">
            Delfos Engenharia Ltda • CNPJ 21.379.952/0001-38 • Rua Espírito Santo, 275 – Erechim/RS,
            CEP 99709-296
            <br />
            Telefone: (54) 99129-2121 • E-mail:{' '}
            <a href="mailto:solar@updates.delfos.eng.br" className="text-[#F3D372] hover:underline">
              solar@updates.delfos.eng.br
            </a>{' '}
            • Web:{' '}
            <a
              href="https://www.delfos.eng.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#F3D372] hover:underline"
            >
              www.delfos.eng.br
            </a>
          </div>
        </header>

        {/* 2. Título & Identificação do Documento */}
        <section className="bg-white border border-[#DDE4EE] border-t-4 border-t-[#0E2A47] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h2 className="m-0 mb-2.5 text-xl sm:text-[1.45rem] font-extrabold text-[#0E2A47] tracking-tight">
            Relatório de Atendimento e Condição do Sistema
          </h2>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs sm:text-[0.825rem] text-[#536377] border-t border-[#DDE4EE] pt-3">
            <span>
              <strong className="text-[#0E2A47] font-bold">Relatório nº:</strong>{' '}
              {relatorio.numeroRelatorio}
            </span>
            <span>
              <strong className="text-[#0E2A47] font-bold">OS vinculada:</strong>{' '}
              {relatorio.osCodigo}
            </span>
            <span>
              <strong className="text-[#0E2A47] font-bold">Revisão:</strong> {relatorio.revisao}
            </span>
            <span>
              <strong className="text-[#0E2A47] font-bold">Data de emissão:</strong>{' '}
              {relatorio.dataEmissao}
            </span>
          </div>
        </section>

        {/* 3. Resumo do Atendimento */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h3 className="m-0 mb-4 text-base font-bold text-[#0E2A47] flex items-center gap-2 border-b-2 border-[#EBF0F7] pb-2">
            Resumo do atendimento
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                Cliente
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.clienteNome}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                Endereço da usina
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.enderecoUsina}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                Data do atendimento
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.dataAtendimento}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                Horários (Início / Término)
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.horarioInicioTermino}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                Tipo de serviço
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.tipoServico}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                OS Vinculada
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.osCodigo}
              </span>
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                Concessionária &amp; UC
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.concessionariaUc}
              </span>
            </div>

            <div className="flex flex-col gap-0.5 sm:col-span-2">
              <span className="text-[0.75rem] uppercase tracking-wider text-[#536377] font-semibold">
                Dados do sistema gerador
              </span>
              <span className="text-[0.9375rem] font-semibold text-[#0E2A47]">
                {relatorio.dadosSistemaGerador}
              </span>
            </div>
          </div>
        </section>

        {/* 4. Badges de Status */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[240px] flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border border-[#B8E4C7] bg-[#F1F9F4] print-color-exact">
                <div
                  className="w-3.5 h-3.5 rounded-full bg-[#1B8342] shadow-[0_0_0_4px_#D0EED9] shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-[0.775rem] text-[#2C6B40] font-semibold uppercase tracking-wider">
                    Situação do atendimento
                  </div>
                  <div className="text-base font-extrabold text-[#0E5325] tracking-wide">
                    {relatorio.situacaoAtendimento}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-[240px] flex items-center gap-3.5 p-3.5 sm:p-4 rounded-xl border border-[#B8E4C7] bg-[#F1F9F4] print-color-exact">
                <div
                  className="w-3.5 h-3.5 rounded-full bg-[#1B8342] shadow-[0_0_0_4px_#D0EED9] shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <div className="text-[0.775rem] text-[#2C6B40] font-semibold uppercase tracking-wider">
                    Condição do sistema ao término
                  </div>
                  <div className="text-base font-extrabold text-[#0E5325] tracking-wide">
                    {relatorio.condicaoSistema}
                  </div>
                </div>
              </div>
            </div>

            <p className="m-0 text-xs text-[#536377] leading-snug italic">
              * Nota técnica: Situação do atendimento refere-se ao escopo da visita. Condição do
              sistema refere-se ao estado operacional observado. São avaliações independentes.
            </p>
          </div>
        </section>

        {/* 5. Serviços executados */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h3 className="m-0 mb-4 text-base font-bold text-[#0E2A47] flex items-center gap-2 border-b-2 border-[#EBF0F7] pb-2">
            Serviços executados
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm border border-[#DDE4EE] rounded-lg overflow-hidden custom-rel-table">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#0E2A47] print-color-exact">
                  <th className="text-left p-3 font-bold text-xs border-b-2 border-[#DDE4EE]">
                    Atividade
                  </th>
                  <th className="text-left p-3 font-bold text-xs border-b-2 border-[#DDE4EE]">
                    Local / Ativo
                  </th>
                  <th className="text-left p-3 font-bold text-xs border-b-2 border-[#DDE4EE]">
                    Quantidade
                  </th>
                  <th className="text-left p-3 font-bold text-xs border-b-2 border-[#DDE4EE]">
                    Situação
                  </th>
                  <th className="text-left p-3 font-bold text-xs border-b-2 border-[#DDE4EE]">
                    Evidência
                  </th>
                </tr>
              </thead>
              <tbody>
                {relatorio.servicosExecutados.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-[#DDE4EE] ${
                      idx % 2 === 1 ? 'bg-[#FAFCFE]' : 'bg-white'
                    }`}
                  >
                    <td data-label="Atividade" className="p-3 text-xs sm:text-sm font-medium">
                      {item.atividade}
                    </td>
                    <td
                      data-label="Local / Ativo"
                      className="p-3 text-xs sm:text-sm text-[#536377]"
                    >
                      {item.localAtivo}
                    </td>
                    <td data-label="Quantidade" className="p-3 text-xs sm:text-sm text-[#536377]">
                      {item.quantidade}
                    </td>
                    <td data-label="Situação" className="p-3 text-xs sm:text-sm">
                      <span className="inline-block bg-[#E8F7EE] text-[#126330] border border-[#B8E4C7] font-bold text-xs px-2 py-0.5 rounded-md whitespace-nowrap print-color-exact">
                        {item.situacao}
                      </span>
                    </td>
                    <td data-label="Evidência" className="p-3 text-xs sm:text-sm text-[#536377]">
                      {item.evidencia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sub-box: Detalhes da Limpeza */}
          <div className="mt-4 p-4 bg-[#F8FAFD] border border-[#E2E8F0] rounded-lg">
            <div className="text-xs font-bold text-[#0E2A47] uppercase tracking-wider mb-2">
              Detalhes da limpeza
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <strong className="text-[#0E2A47]">Módulos previstos / atendidos:</strong>{' '}
                <span className="text-[#536377]">{relatorio.modulosPrevistosAtendidos}</span>
              </div>
              <div>
                <strong className="text-[#0E2A47]">Método executado:</strong>{' '}
                <span className="text-[#536377]">{relatorio.metodoExecutado}</span>
              </div>
              <div>
                <strong className="text-[#0E2A47]">Manual do fabricante adotado:</strong>{' '}
                <span className="text-[#536377]">{relatorio.manualFabricante}</span>
              </div>
              <div>
                <strong className="text-[#0E2A47]">Ressalvas observadas:</strong>{' '}
                <span className="text-[#536377]">{relatorio.ressalvasObservadas}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 6. Registro Fotográfico */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h3 className="m-0 mb-1 text-base font-bold text-[#0E2A47] flex items-center gap-2 border-b-2 border-[#EBF0F7] pb-2">
            Registro fotográfico
          </h3>
          <p className="text-xs text-[#536377] mb-3 print:hidden">
            Clique em qualquer foto para visualizar os detalhes ampliados.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {relatorio.fotos.map((foto) => (
              <div
                key={foto.id}
                role="button"
                tabIndex={0}
                onClick={() => setFotoModal(foto)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setFotoModal(foto)
                  }
                }}
                className="bg-[#F4F7FA] border border-[#DDE4EE] hover:border-[#BACEDB] rounded-xl overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all flex flex-col group print:cursor-default print:border-[#D0D0D0] print:rounded-md print:hover:translate-y-0"
              >
                {foto.url ? (
                  <div className="h-40 bg-slate-900 overflow-hidden relative print:h-32">
                    <img
                      src={foto.url}
                      alt={foto.titulo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded print:hidden">
                      Ampliar 🔍
                    </span>
                  </div>
                ) : (
                  <div className="h-40 bg-linear-to-br from-[#224364] to-[#0E2A47] text-white flex flex-col items-center justify-center p-4 text-center relative print:h-32 print-color-exact">
                    <Camera className="w-8 h-8 text-[#C9A227] mb-2" />
                    <div className="text-xs font-bold leading-tight">{foto.titulo}</div>
                    <span className="absolute bottom-2 right-2 bg-black/45 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded print:hidden">
                      Ampliar 🔍
                    </span>
                  </div>
                )}
                <div className="p-3 bg-white border-t border-[#EAEFF5] text-xs text-[#536377] grow flex flex-col justify-between">
                  <div>
                    <strong className="block text-[#0E2A47] font-bold text-xs mb-0.5">
                      {foto.subtitulo}
                    </strong>
                    <p className="m-0 text-[11px] leading-tight line-clamp-2">{foto.descricao}</p>
                  </div>
                  <div className="mt-2 text-[10px] text-[#536377] font-medium">{foto.dataHora}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 7. Pendências e Recomendações */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h3 className="m-0 mb-3 text-base font-bold text-[#0E2A47] flex items-center gap-2 border-b-2 border-[#EBF0F7] pb-2">
            Pendências e recomendações
          </h3>
          {relatorio.pendenciasRecomendacoes ? (
            <div className="bg-[#F8FAFD] border border-[#DDE4EE] rounded-lg p-3.5 text-[#1A2332] text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
              {relatorio.pendenciasRecomendacoes}
            </div>
          ) : (
            <div className="bg-[#F1F9F4] border border-[#B8E4C7] rounded-lg p-3.5 text-[#0E5325] text-sm print-color-exact">
              <strong className="font-bold">✓ Conformidade técnica:</strong>{' '}
              {relatorio.conformidadeTecnica}
            </div>
          )}
          <div className="mt-3.5 text-sm font-semibold text-[#0E2A47]">
            📅 Próxima manutenção prevista:{' '}
            <strong className="font-bold">{relatorio.proximaManutencao}</strong> (semestral,
            conforme plano de manutenção).
          </div>
        </section>

        {/* 8. Conclusão Técnica */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h3 className="m-0 mb-3 text-base font-bold text-[#0E2A47] flex items-center gap-2 border-b-2 border-[#EBF0F7] pb-2">
            Conclusão técnica
          </h3>
          <p className="m-0 mb-3 text-xs sm:text-sm leading-relaxed text-[#1A2332]">
            {relatorio.conclusaoNarrativa}
          </p>

          <div className="flex flex-wrap gap-x-5 gap-y-2 bg-[#F5F8FC] border border-[#D7E2F0] rounded-lg p-3 text-xs print-color-exact">
            <div>
              <strong className="text-[#0E2A47]">Situação do serviço:</strong>{' '}
              <span>{relatorio.conclusaoSituacao}</span>
            </div>
            <div>
              <strong className="text-[#0E2A47]">• Condição no escopo avaliado:</strong>{' '}
              <span>{relatorio.conclusaoCondicao}</span>
            </div>
            <div>
              <strong className="text-[#0E2A47]">• Desempenho energético:</strong>{' '}
              <span>{relatorio.conclusaoDesempenho}</span>
            </div>
          </div>
        </section>

        {/* 9. Próximos Passos */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h3 className="m-0 mb-3 text-base font-bold text-[#0E2A47] flex items-center gap-2 border-b-2 border-[#EBF0F7] pb-2">
            Próximos passos
          </h3>
          <p className="m-0 mb-3 text-xs sm:text-sm text-[#2C3E50]">
            {relatorio.proximosPassosTexto}
          </p>

          {relatorio.exibirPlanoOM && (
            <div className="bg-[#FFFDF5] border border-[#E5D38A] rounded-xl p-5 mb-1 print-color-exact">
              <div className="text-[#5D4300] text-sm sm:text-base font-extrabold mb-2">
                {relatorio.planoOmTitulo}
              </div>
              <p className="m-0 mb-3 text-xs sm:text-sm text-[#2F2A14] leading-relaxed">
                {relatorio.planoOmTexto}
              </p>
              <div className="text-xs sm:text-sm font-bold text-[#0E2A47]">
                {relatorio.planoOmContato}
              </div>
            </div>
          )}
        </section>

        {/* 10. Recebimento do Cliente */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4">
          <h3 className="m-0 mb-3 text-base font-bold text-[#0E2A47] flex items-center gap-2 border-b-2 border-[#EBF0F7] pb-2">
            Recebimento do cliente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <span className="text-[0.75rem] uppercase font-bold text-[#536377] block mb-0.5">
                Forma e data de envio
              </span>
              <span className="text-sm font-bold text-[#0E2A47]">{relatorio.formaEDataEnvio}</span>
            </div>
            <div>
              <span className="text-[0.75rem] uppercase font-bold text-[#536377] block mb-0.5">
                Recebido por
              </span>
              <span className="text-sm font-bold text-[#0E2A47]">{relatorio.recebidoPor}</span>
            </div>
          </div>
          <p className="m-0 text-xs text-[#536377] leading-relaxed border-t border-dashed border-[#DDE4EE] pt-2.5">
            * Nota: A confirmação registra o recebimento deste documento e das recomendações nele
            descritas. Não representa certificação técnica da instalação pelo cliente.
          </p>
        </section>

        {/* 14. Rodapé Timbrado */}
        <footer className="bg-[#0E2A47] text-white rounded-b-xl p-6 sm:p-7 text-xs leading-relaxed shadow-[0_4px_16px_rgba(14,42,71,0.1)] print:rounded-b-md print:p-5 print:shadow-none print-color-exact">
          <p className="m-0 mb-1 text-[#D2DFEE]">
            <strong className="text-white">Documento oficial Delfos Solar</strong> — Atendimento
            técnico autorizado em estrita conformidade com as normas ABNT NBR 16690 e NR-10
            (Segurança em Instalações e Serviços em Eletricidade).
          </p>
          <p className="m-0 text-[#D2DFEE]">
            Central de Operação e Suporte: (54) 99129-2121 • solar@updates.delfos.eng.br • Rua
            Espírito Santo, 275 – Erechim/RS
          </p>
          <div className="border-t border-white/15 my-3" />
          <div className="flex justify-between flex-wrap gap-2 text-[#A9C2DF] font-semibold text-[11px]">
            <span>
              Relatório {relatorio.numeroRelatorio} • OS {relatorio.osCodigo} • Revisão{' '}
              {relatorio.revisao}
            </span>
            <span>Delfos Engenharia Solar © {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>

      {/* Lightbox Modal para fotos */}
      {fotoModal && (
        <div
          className="fixed inset-0 z-50 bg-[#0E2A47]/85 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setFotoModal(null)}
        >
          <div
            className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFotoModal(null)}
              aria-label="Fechar visualização"
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {fotoModal.url ? (
              <div className="max-h-[380px] bg-slate-900 overflow-hidden flex items-center justify-center">
                <img
                  src={fotoModal.url}
                  alt={fotoModal.titulo}
                  className="w-full h-auto max-h-[380px] object-contain"
                />
              </div>
            ) : (
              <div className="h-56 bg-linear-to-br from-[#163e68] to-[#0E2A47] text-white flex flex-col items-center justify-center p-6 text-center">
                <Camera className="w-12 h-12 text-[#C9A227] mb-2" />
                <h3 className="m-0 text-base font-bold text-white">{fotoModal.titulo}</h3>
                <p className="mt-1 mb-0 text-xs text-slate-300">{fotoModal.subtitulo}</p>
              </div>
            )}

            <div className="p-5">
              <h4 className="m-0 text-sm font-bold text-[#0E2A47]">{fotoModal.titulo}</h4>
              <p className="mt-1 text-xs text-[#536377] leading-relaxed">{fotoModal.descricao}</p>
              <div className="mt-3 text-[11px] font-semibold text-[#536377]">
                {fotoModal.dataHora}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RelatorioOSConteudo

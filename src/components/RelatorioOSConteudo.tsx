import React, { useEffect, useState } from 'react'
import {
  Printer,
  CheckCircle2,
  Clock,
  Zap,
  Wrench,
  Camera,
  FileCheck,
  Share2,
  Check,
  Loader2,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { getRodapeComercialRelatorioOS } from '@/services/configuracoesService'
import pb from '@/lib/pocketbase/client'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { useAuth } from '@/contexts/AuthContext'
import { normalizeChecklist } from '@/components/CalendarioExecucaoOS'
import type { OSChecklistItem } from '@/types/crm'

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
  const [rodapeComercial, setRodapeComercial] = useState<any>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)

  useEffect(() => {
    // Se a rota exige login (como /relatorio-os-preview/:id), aguardar o AuthContext finalizar o loading
    if (requireAuth && authLoading) {
      return
    }

    const currentPath = window.location.pathname + window.location.search

    // Se exige login e não está autenticado (ou token expirado / inválido), redirecionar para /login preservando state.from
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

        // 1. Tenta carregar primeiro em atividades (expand cliente_id, usina_id)
        try {
          registro = await pb.collection('atividades').getOne(id, {
            expand: 'cliente_id,usina_id,responsavel_id',
          })
        } catch (err: any) {
          if (isAuthSessionError(err)) {
            isAuthErrorEncountered = true
          }
          registro = null
        }

        // 2. Fallback para ordens_servico se não encontrar em atividades
        if (!registro) {
          try {
            registro = await pb.collection('ordens_servico').getOne(id, {
              expand: 'cliente_id,sistema_id,responsavel_usuario_id,profissional_id',
            })
          } catch (err: any) {
            if (isAuthSessionError(err)) {
              isAuthErrorEncountered = true
            }
            registro = null
          }
        }

        // Se encontrou erro de autenticação e a rota exige auth, redireciona ao login com state.from
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

        // Normalização antecipada de detalhes_execucao e checklist ANTES do setOs
        // Garante que atividades lidas diretamente do banco reflitam observações de campo e checklist padronizado
        const rawChecklist = registro.checklist
        let checklistNormalizado: OSChecklistItem[] = []
        if (Array.isArray(rawChecklist)) {
          checklistNormalizado = rawChecklist
            .filter((item) => item !== null && item !== undefined && typeof item === 'object')
            .map((item: any, idx: number) => ({
              id: item.id ? String(item.id) : `chk_${idx + 1}`,
              item: String(
                item.item || item.texto || item.descricao || item.nome || `Item ${idx + 1}`,
              ).trim(),
              concluido: Boolean(item.concluido),
            }))
        } else if (typeof rawChecklist === 'string') {
          const trimmed = rawChecklist.trim()
          if (trimmed && trimmed !== 'null' && trimmed !== 'undefined') {
            try {
              const parsed = JSON.parse(trimmed)
              if (Array.isArray(parsed)) {
                checklistNormalizado = parsed
                  .filter((item) => item !== null && item !== undefined && typeof item === 'object')
                  .map((item: any, idx: number) => ({
                    id: item.id ? String(item.id) : `chk_${idx + 1}`,
                    item: String(
                      item.item || item.texto || item.descricao || item.nome || `Item ${idx + 1}`,
                    ).trim(),
                    concluido: Boolean(item.concluido),
                  }))
              } else if (typeof parsed === 'object' && parsed !== null) {
                checklistNormalizado = Object.values(parsed)
                  .filter((item: any) => item !== null && typeof item === 'object')
                  .map((item: any, idx: number) => ({
                    id: item.id ? String(item.id) : `chk_${idx + 1}`,
                    item: String(
                      item.item || item.texto || item.descricao || item.nome || `Item ${idx + 1}`,
                    ).trim(),
                    concluido: Boolean(item.concluido),
                  }))
              }
            } catch {
              checklistNormalizado = []
            }
          }
        } else if (typeof rawChecklist === 'object' && rawChecklist !== null) {
          checklistNormalizado = Object.values(rawChecklist)
            .filter((item: any) => item !== null && typeof item === 'object')
            .map((item: any, idx: number) => ({
              id: item.id ? String(item.id) : `chk_${idx + 1}`,
              item: String(
                item.item || item.texto || item.descricao || item.nome || `Item ${idx + 1}`,
              ).trim(),
              concluido: Boolean(item.concluido),
            }))
        }

        const registroNormalizado = {
          ...registro,
          detalhes_execucao:
            registro.observacoes || registro.detalhes_execucao || registro.descricao || '',
          checklist: checklistNormalizado,
        }

        setOs(registroNormalizado)

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

        // Extrai usina / sistema vinculado
        let usinaObj = registro.expand?.usina_id || registro.expand?.sistema_id || null
        if (!usinaObj && registro.usina_id) {
          usinaObj = await pb
            .collection('usinas')
            .getOne(registro.usina_id)
            .catch(() => null)
        }
        if (isMounted) setUsina(usinaObj)

        // Carrega rodapé comercial configurável
        try {
          const rodape = await getRodapeComercialRelatorioOS()
          if (isMounted) setRodapeComercial(rodape)
        } catch {
          /* ignore */
        }
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
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    carregar()

    return () => {
      isMounted = false
    }
  }, [id, requireAuth, authLoading, isAuthenticated, navigate])

  const handleCopiarLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2500)
    } catch {
      /* ignore */
    }
  }

  const handleImprimir = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg animate-pulse mb-4">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Carregando Relatório Técnico Delfos Solar...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Recuperando registros de execução, checklist e evidências fotográficas.
        </p>
      </div>
    )
  }

  if (erro || !os) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Relatório não encontrado</h2>
        <p className="text-xs text-slate-600 max-w-sm mt-1">
          {erro || 'Esta Ordem de Serviço não está disponível ou foi arquivada.'}
        </p>
      </div>
    )
  }

  // Normalização de campos com fallbacks seguros
  const osIdCurto = os?.id ? String(os.id).slice(-6).toUpperCase() : '000000'
  const tipoServico = os?.tipo_servico || os?.titulo || 'Serviço em Campo'
  const statusStr = os?.status || (os?.concluida ? 'concluida' : 'em_andamento')
  const isConcluida =
    statusStr === 'concluida' || statusStr === 'finalizada' || Boolean(os?.concluida)

  const clienteNome = cliente?.nome || cliente?.razao_social || 'Cliente Solar'
  const clienteDoc = cliente?.cpf || cliente?.cnpj || ''
  const enderecoUsina =
    os?.endereco ||
    os?.endereco_uc ||
    usina?.endereco ||
    cliente?.endereco ||
    'Endereço a confirmar'
  const cidadeUsina = cliente?.cidade
    ? `${cliente.cidade} - ${cliente.estado || 'RS'}`
    : usina?.cidade || ''

  const concessionaria = usina?.concessionaria || cliente?.concessionaria || 'RGE Sul'
  const telhadoTipo = usina?.tipo_telhado || cliente?.telhado_tipo || '-'
  const placasMarca =
    usina?.fabricante_modulos || usina?.marca_placas || cliente?.marca_placas || '-'
  const potenciaUsina =
    usina?.potencia_total_kwp || cliente?.potencia_kwp
      ? `${usina?.potencia_total_kwp || cliente?.potencia_kwp} kWp`
      : '-'
  const placasQtd =
    usina?.quantidade_modulos || cliente?.placas_qtd
      ? `${usina?.quantidade_modulos || cliente?.placas_qtd} módulos`
      : '-'
  const inversor =
    usina?.fabricante_inversores || usina?.inversor_marca || cliente?.inversor_marca || '-'
  const uc = usina?.numero_uc || cliente?.uc || '-'

  const prestadorNome =
    os?.atribuida_a ||
    os?.responsavel_nome ||
    os?.expand?.responsavel_usuario_id?.name ||
    os?.expand?.responsavel_id?.name ||
    os?.expand?.profissional_id?.nome ||
    'Técnico Autorizado Delfos'

  // Normalização de checklist com tolerância total (string JSON, array, objeto, nulo)
  const checklistItens: OSChecklistItem[] = normalizeChecklist(os?.checklist)
  const itensConcluidosServicos = checklistItens.filter((i) => i.concluido)

  // URLs de fotos
  const fotosUrls: string[] = []
  if (Array.isArray(os?.fotos) && os.fotos.length > 0) {
    for (const f of os.fotos) {
      if (f) {
        try {
          const u = pb.files.getURL(os, f)
          if (u) fotosUrls.push(u)
        } catch {
          /* ignore */
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 print:bg-white print:p-0">
      {/* Barra de Ações Superior (Oculta na impressão) */}
      {showHeaderActions && (
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs print:hidden">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                D
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                  Delfos Solar • Relatório de Execução
                </h1>
                <p className="text-[10px] text-slate-500 font-medium">
                  OS #{osIdCurto} • Validação Técnica
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopiarLink}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                {linkCopiado ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Share2 className="w-3.5 h-3.5" />
                )}
                <span>{linkCopiado ? 'Link Copiado!' : 'Compartilhar'}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleImprimir}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / Baixar PDF</span>
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Conteúdo Principal do Relatório */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 print:p-0 print:space-y-4">
        {/* Cartão Cabeçalho Institucional */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 print:shadow-none print:border-b-2 print:border-emerald-600">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <span className="text-xl font-black text-[#0A539E] tracking-tight">
                  DELFOS SOLAR
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                  OS #{osIdCurto}
                </span>
              </div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                Engenharia &amp; Operação de Usinas Fotovoltaicas
              </p>
              <p className="text-[11px] text-slate-500">
                Delfos Engenharia Ltda • CNPJ 21.379.952/0001-38 • Rua Espírito Santo, 275 –
                Erechim/RS
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  isConcluida
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isConcluida ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span>{isConcluida ? 'Atendimento Concluído' : 'Em Andamento'}</span>
              </div>
              <p className="text-xs font-bold text-slate-700 mt-1.5">{tipoServico}</p>
            </div>
          </div>

          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Cliente
              </span>
              <strong className="text-slate-800 block truncate">{clienteNome}</strong>
              {clienteDoc && (
                <span className="text-[11px] text-slate-500 block truncate">{clienteDoc}</span>
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Localização / Usina
              </span>
              <strong className="text-slate-800 block truncate">
                {cidadeUsina || 'Erechim - RS'}
              </strong>
              <span className="text-[11px] text-slate-500 block truncate">{enderecoUsina}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Técnico Responsável
              </span>
              <strong className="text-slate-800 block truncate">{prestadorNome}</strong>
              <span className="text-[11px] text-emerald-700 font-semibold block">
                Técnico Autorizado
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Concessionária &amp; UC
              </span>
              <strong className="text-slate-800 block truncate">{concessionaria}</strong>
              <span className="text-[11px] text-slate-500 block">UC: {uc}</span>
            </div>
          </div>
        </div>

        {/* Dados Técnicos do Sistema Fotovoltaico */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Zap className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Ficha Técnica do Sistema Fotovoltaico
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Potência Nominal
              </span>
              <strong className="text-emerald-700 text-sm font-extrabold">{potenciaUsina}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Qtd. Módulos
              </span>
              <strong className="text-slate-800 text-sm font-bold">{placasQtd}</strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Marca das Placas
              </span>
              <strong className="text-slate-800 text-sm font-bold truncate block">
                {placasMarca}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Inversor(es)
              </span>
              <strong className="text-slate-800 text-sm font-bold truncate block">
                {inversor}
              </strong>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Estrutura / Telhado
              </span>
              <strong className="text-slate-800 text-sm font-bold truncate block">
                {telhadoTipo}
              </strong>
            </div>
          </div>
        </section>

        {/* Bloco de Destaque: Serviços e Procedimentos Executados no Local */}
        {checklistItens.length > 0 && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-200 bg-linear-to-b from-white to-emerald-50/20">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    Serviços e Procedimentos Executados no Local
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Procedimentos técnicos validados e concluídos pela equipe em campo
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
                {itensConcluidosServicos.length} realizado
                {itensConcluidosServicos.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {checklistItens.map((item, idx) => (
                <div
                  key={`exec_${idx}`}
                  className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                    item.concluido
                      ? 'bg-emerald-50/70 border-emerald-300 text-slate-900 shadow-2xs'
                      : 'bg-slate-50/80 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {item.concluido ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-snug break-words">{item.item}</p>
                      {item.concluido && (
                        <p className="text-[10px] font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                          <span>Serviço Realizado</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      item.concluido
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.concluido ? '✓ Realizado' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Checklist Técnico de Execução */}
        {checklistItens.length > 0 && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Checklist Técnico de Execução
                </h2>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {checklistItens.filter((i) => i.concluido).length} de {checklistItens.length}{' '}
                concluídos
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {checklistItens.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                    item.concluido
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        item.concluido ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {item.concluido ? '✓' : '–'}
                    </span>
                    <span className="font-semibold truncate">{item.item}</span>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                      item.concluido
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.concluido ? 'Concluído' : 'Pendente'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Observações da Execução */}
        {os?.detalhes_execucao && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <Wrench className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Observações Técnicas de Campo
              </h2>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-xl border border-slate-100 font-medium">
              {os.detalhes_execucao}
            </p>
          </section>
        )}

        {/* Galeria de Fotos */}
        {fotosUrls.length > 0 && (
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Registros Fotográficos de Campo
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {fotosUrls.length} {fotosUrls.length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {fotosUrls.map((url, idx) => (
                <div
                  key={idx}
                  className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs group"
                >
                  <div className="aspect-4/3 overflow-hidden bg-slate-950 flex items-center justify-center">
                    <img
                      src={url}
                      alt={`Registro #${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2.5 bg-slate-900 text-white flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400">FOTO #{idx + 1}</span>
                    <span className="text-slate-400 text-[10px]">Execução Técnica</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bloco Comercial Configurado */}
        {rodapeComercial && (rodapeComercial.titulo || rodapeComercial.descricao) && (
          <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl p-6 shadow-sm">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
                ★ Programa de Indicação Delfos Solar
              </div>
              <h3 className="text-base sm:text-lg font-black leading-tight">
                {rodapeComercial.titulo || 'Indique um amigo e ganhe benefícios'}
              </h3>
              {rodapeComercial.descricao && (
                <p className="text-xs text-emerald-100 leading-relaxed font-medium">
                  {rodapeComercial.descricao}
                </p>
              )}
              {rodapeComercial.indicacao && (
                <div className="pt-2 text-xs font-bold text-white flex items-center gap-2">
                  <span>🎁</span>
                  <span>{rodapeComercial.indicacao}</span>
                </div>
              )}
              {rodapeComercial.contato && (
                <p className="text-[11px] text-emerald-200 pt-1">{rodapeComercial.contato}</p>
              )}
            </div>
          </section>
        )}

        {/* Rodapé Oficial da Empresa */}
        <footer className="bg-white rounded-2xl p-5 border border-slate-200 text-xs text-slate-500 space-y-2 print:border-t-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <strong className="text-slate-800">Delfos Engenharia Solar</strong> • Excelência em
              Energia Fotovoltaica
            </div>
            <div className="text-[11px] text-emerald-700 font-bold">
              ✓ Documento Oficial de Atendimento
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
            <span>Rua Espírito Santo, 275 – Erechim/RS, CEP 99709-296 • (54) 99129-2121</span>
            <span>www.delfos.eng.br • solar@updates.delfos.eng.br</span>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default RelatorioOSConteudo

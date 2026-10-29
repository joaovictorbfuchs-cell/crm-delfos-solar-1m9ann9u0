import React, { useEffect, useState, useMemo } from 'react'
import {
  Printer,
  Share2,
  Check,
  Loader2,
  AlertTriangle,
  Camera,
  X,
  FileCheck,
  Mail,
  MailCheck,
  AlertCircle,
  Send,
  Download,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import logoDelfosPng from '@/assets/delfos-solar-5b5ce.png'
import {
  getRodapeComercialRelatorioOS,
  getRodapeComercialCacheSync,
} from '@/services/configuracoesService'
import { isAuthSessionError } from '@/lib/pocketbase/errors'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import {
  compilarDadosRelatorioOS,
  type RelatorioOSCanonicalData,
  type FotoRegistroRelatorio,
} from '@/lib/relatorioOSCanonical'
import { obterRelatorioOSPublico } from '@/services/relatorioOSPublicoService'
import { gerarRelatorioOSPdfBlobBase64 } from '@/components/BotaoBaixarRelatorioOSPDF'
import { enviarEmail } from '@/lib/emailService'
import { createAtividade } from '@/services/crmService'
import type { OrdemServico, Cliente, Sistema } from '@/types/crm'

const DEFAULT_EMAIL_FROM = 'Delfos Solar <solar@updates.delfos.eng.br>'

export interface RelatorioOSConteudoProps {
  id?: string
  osProp?: OrdemServico | any
  clienteProp?: Cliente | any
  sistemaProp?: Sistema | any
  showHeaderActions?: boolean
  requireAuth?: boolean
}

export const RelatorioOSConteudo: React.FC<RelatorioOSConteudoProps> = ({
  id,
  osProp,
  clienteProp,
  sistemaProp,
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
  const [equipamentosUsina, setEquipamentosUsina] = useState<any[]>([])
  const [ativosUsina, setAtivosUsina] = useState<any[]>([])
  const [temContratoOMAtivo, setTemContratoOMAtivo] = useState(false)
  const [contratoOMCliente, setContratoOMCliente] = useState<any>(null)
  const [fotosUrls, setFotosUrls] = useState<string[]>([])
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [fotoModal, setFotoModal] = useState<FotoRegistroRelatorio | null>(null)

  // Estado do modal "Enviar por e-mail"
  const [modalEmailAberto, setModalEmailAberto] = useState(false)
  const [destinatarioEmail, setDestinatarioEmail] = useState('')
  const [assuntoEmail, setAssuntoEmail] = useState('')
  const [mensagemEmail, setMensagemEmail] = useState('')
  const [enviandoEmail, setEnviandoEmail] = useState(false)
  const [emailEnviadoSucesso, setEmailEnviadoSucesso] = useState(false)

  // Estado do modal WhatsApp (PDF ou Link HTML)
  const [modalWhatsAppAberto, setModalWhatsAppAberto] = useState(false)

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
        let clienteEncontrado: any = null
        let usinaEncontrada: any = null
        let contratoOMEncontrado: any = null
        let temContratoOMAtivoFlag = false
        let eqsCarregados: any[] = []
        let atvsCarregados: any[] = []

        // 1. Tentar primeiro via serviço público resiliente
        // Isso resolve o problema de regras de acesso user-scoped da sessão (ex.: técnico João vs Daniel)
        // e carrega de imediato cliente, usina, contrato O&M e equipamentos sem N+1 queries.
        try {
          const publicRes = await obterRelatorioOSPublico(id)
          if (publicRes && publicRes.registro) {
            registro = publicRes.registro
            clienteEncontrado = publicRes.cliente || null
            usinaEncontrada = publicRes.usina || null
            contratoOMEncontrado = publicRes.contratoOM || null
            temContratoOMAtivoFlag = Boolean(publicRes.temContratoOMAtivo)
            eqsCarregados = publicRes.equipamentosUsina || []
            atvsCarregados = publicRes.ativosUsina || []
          }
        } catch (pubErr: any) {
          console.warn(
            'Busca pública por obterRelatorioOSPublico falhou, tentando fallback direto:',
            pubErr,
          )
        }

        // 2. Se o endpoint público não retornou registro, tenta carregar diretamente em atividades
        if (!registro) {
          try {
            registro = await pb.collection('atividades').getOne(id, {
              expand: 'cliente_id,usina_id,responsavel_id',
            })
          } catch (err: any) {
            if (isAuthSessionError(err)) isAuthErrorEncountered = true
            registro = null
          }
        }

        // 3. Fallback para ordens_servico se não encontrar em atividades
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

        // 4. Fallback inteligente quando o id original foi migrado ou copiado
        // (ex: link enviado com id antigo ou id de migração rastreado em registro_original_id ou chave_importacao)
        if (!registro) {
          try {
            const safeFilter = `registro_original_id = "${id}" || chave_importacao ~ "${id}"`
            // Tenta em atividades primeiro
            const atvsEncontradas = await pb.collection('atividades').getList(1, 1, {
              filter: safeFilter,
              expand: 'cliente_id,usina_id,responsavel_id',
            })
            if (atvsEncontradas.items && atvsEncontradas.items.length > 0) {
              registro = atvsEncontradas.items[0]
            }
          } catch (err: any) {
            if (isAuthSessionError(err)) isAuthErrorEncountered = true
          }
        }

        if (!registro) {
          try {
            const safeFilter = `registro_original_id = "${id}" || chave_importacao ~ "${id}"`
            // Tenta em ordens_servico como contingência
            const osEncontradas = await pb.collection('ordens_servico').getList(1, 1, {
              filter: safeFilter,
              expand: 'cliente_id,sistema_id,responsavel_usuario_id,profissional_id',
            })
            if (osEncontradas.items && osEncontradas.items.length > 0) {
              registro = osEncontradas.items[0]
            }
          } catch (err: any) {
            if (isAuthSessionError(err)) isAuthErrorEncountered = true
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
        const clienteFinal =
          clienteProp ||
          clienteEncontrado ||
          registro.expand?.cliente_id ||
          (registro.cliente_id
            ? await pb
                .collection('clientes')
                .getOne(registro.cliente_id)
                .catch(() => null)
            : null)
        if (isMounted) setCliente(clienteFinal)

        // Checa se cliente tem contrato O&M ativo
        const clienteIdFinal = clienteFinal?.id || registro.cliente_id
        if (contratoOMEncontrado !== null || temContratoOMAtivoFlag) {
          if (isMounted) {
            setTemContratoOMAtivo(temContratoOMAtivoFlag)
            setContratoOMCliente(contratoOMEncontrado)
          }
        } else if (clienteIdFinal) {
          try {
            const contratos = await pb.collection('contratos_om').getList(1, 10, {
              filter: `cliente_id = "${clienteIdFinal}"`,
            })
            const listaContratos = contratos?.items || []
            const contratoAtivo =
              listaContratos.find((c: any) => {
                const st = String(c?.status || '').toLowerCase()
                const enc = String(c?.status_encerramento || '').toLowerCase()
                const encerradoOuCancelado =
                  st.includes('encerrado') || st.includes('cancelado') || enc.includes('encerrado')
                return !encerradoOuCancelado
              }) ||
              listaContratos[0] ||
              null

            const ativo = Boolean(
              contratoAtivo &&
              !String(contratoAtivo?.status || '')
                .toLowerCase()
                .includes('encerrado') &&
              !String(contratoAtivo?.status || '')
                .toLowerCase()
                .includes('cancelado') &&
              !String(contratoAtivo?.status_encerramento || '')
                .toLowerCase()
                .includes('encerrado'),
            )
            if (isMounted) {
              setTemContratoOMAtivo(ativo)
              setContratoOMCliente(contratoAtivo)
            }
          } catch {
            if (isMounted) {
              setTemContratoOMAtivo(false)
              setContratoOMCliente(null)
            }
          }
        } else {
          if (isMounted) {
            setTemContratoOMAtivo(false)
            setContratoOMCliente(null)
          }
        }

        // Extrai usina / sistema vinculado
        let usinaObj =
          sistemaProp ||
          usinaEncontrada ||
          registro.expand?.usina_id ||
          registro.expand?.sistema_id ||
          null
        const usinaIdParaBusca =
          registro.usina_id ||
          registro.sistema_id ||
          (typeof registro.expand?.usina_id === 'string'
            ? registro.expand.usina_id
            : registro.expand?.usina_id?.id) ||
          (typeof registro.expand?.sistema_id === 'string'
            ? registro.expand.sistema_id
            : registro.expand?.sistema_id?.id) ||
          null

        if (!usinaObj && usinaIdParaBusca) {
          usinaObj = await pb
            .collection('usinas')
            .getOne(usinaIdParaBusca)
            .catch(async () => {
              return await pb
                .collection('sistemas')
                .getOne(usinaIdParaBusca)
                .catch(() => null)
            })
        }
        if (isMounted) setUsina(usinaObj)

        // Carrega equipamentos da usina vinculada (usina_equipamentos e Ativos) em paralelo
        const usinaIdFinal = usinaObj?.id || usinaIdParaBusca
        if (eqsCarregados.length > 0 || atvsCarregados.length > 0) {
          if (isMounted) {
            setEquipamentosUsina(eqsCarregados)
            setAtivosUsina(atvsCarregados)
          }
        } else if (usinaIdFinal) {
          try {
            const [eqs, atvs] = await Promise.all([
              import('@/services/usinaEquipamentosService')
                .then((m) => m.fetchEquipamentosByUsinaId(usinaIdFinal))
                .catch((e) => {
                  console.warn('Erro ao carregar usina_equipamentos no relatório:', e)
                  return []
                }),
              import('@/services/ativosService')
                .then((m) => m.fetchAtivosPorUsina(usinaIdFinal))
                .catch((e) => {
                  console.warn('Erro ao carregar ativos da usina no relatório:', e)
                  return []
                }),
            ])
            if (isMounted) {
              setEquipamentosUsina(eqs || [])
              setAtivosUsina(atvs || [])
            }
          } catch (e) {
            console.warn('Erro ao buscar equipamentos vinculados à usina:', e)
          }
        } else {
          if (isMounted) {
            setEquipamentosUsina([])
            setAtivosUsina([])
          }
        }

        // Extrai fotos anexas (fotos + foto_medidor para integridade total)
        const urls: string[] = []
        const listaNomesFotos: string[] = []
        if (Array.isArray(registro.fotos)) {
          for (const f of registro.fotos) {
            if (f && typeof f === 'string' && !listaNomesFotos.includes(f)) {
              listaNomesFotos.push(f)
            }
          }
        }
        if (registro.foto_medidor && typeof registro.foto_medidor === 'string') {
          if (!listaNomesFotos.includes(registro.foto_medidor)) {
            listaNomesFotos.push(registro.foto_medidor)
          }
        }

        for (const f of listaNomesFotos) {
          try {
            const u = pb.files.getURL(registro, f)
            if (u) urls.push(u)
          } catch {
            /* ignore */
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
  }, [id, osProp, clienteProp, sistemaProp, requireAuth, authLoading, isAuthenticated, navigate])

  // Inicializa dados passados via props imediatamente para renderização rápida
  useEffect(() => {
    if (osProp) setOs(osProp)
    if (clienteProp) setCliente(clienteProp)
    if (sistemaProp) {
      setUsina(sistemaProp)
      const uId = sistemaProp.id
      if (uId) {
        Promise.all([
          import('@/services/usinaEquipamentosService')
            .then((m) => m.fetchEquipamentosByUsinaId(uId))
            .catch(() => []),
          import('@/services/ativosService')
            .then((m) => m.fetchAtivosPorUsina(uId))
            .catch(() => []),
        ]).then(([eqs, atvs]) => {
          setEquipamentosUsina(eqs || [])
          setAtivosUsina(atvs || [])
        })
      }
    }
  }, [osProp, clienteProp, sistemaProp])

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
      contratoOM: contratoOMCliente,
      equipamentosUsina,
      ativosUsina,
    })
  }, [
    os,
    cliente,
    usina,
    fotosUrls,
    temContratoOMAtivo,
    contratoOMCliente,
    equipamentosUsina,
    ativosUsina,
  ])

  const handleCopiarLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href)
      setLinkCopiado(true)
      setTimeout(() => setLinkCopiado(false), 2500)
    } catch {
      /* ignore */
    }
  }

  const [baixandoPdf, setBaixandoPdf] = useState(false)

  const handleBaixarPdf = async () => {
    if (baixandoPdf) return
    setBaixandoPdf(true)
    toast.info('Formatando relatório em PDF A4...')
    try {
      const { baixarHTMLParaPdf } = await import('@/lib/pdfWhatsAppService')
      const { gerarHTMLRelatorioOS } = await import('@/lib/relatorioOSPdf')
      const osIdCurto = relatorio.osCodigo || 'OS'
      const safeName = String(relatorio.clienteNome || 'Cliente')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 30)
      const fileName = `Relatorio_OS_${osIdCurto}_${safeName}.pdf`

      const html = gerarHTMLRelatorioOS({
        os,
        cliente,
        contratoOM: contratoOMCliente,
        sistema: usina,
        fotosDataUrls: fotosUrls,
        equipamentosUsina,
        ativosUsina,
      })

      await baixarHTMLParaPdf(html, fileName, {
        scale: 1.5,
        imageQuality: 0.85,
        compressJsPdf: true,
        timeoutMs: 35000,
      })
      toast.success('Download do PDF concluído!')
    } catch (err: any) {
      console.warn('html2pdf falhou ao baixar diretamente, usando window.print():', err)
      window.print()
    } finally {
      setBaixandoPdf(false)
    }
  }

  // Prepara abertura do modal de envio por e-mail com defaults inteligentes
  const handleAbrirModalEmail = () => {
    const emailDestino =
      cliente?.email ||
      cliente?.titular_email ||
      clienteProp?.email ||
      clienteProp?.titular_email ||
      os?.expand?.cliente_id?.email ||
      ''
    const clienteNome = cliente?.nome || clienteProp?.nome || relatorio.clienteNome || 'Cliente'
    const osCod = relatorio.osCodigo || 'OS'

    setDestinatarioEmail(emailDestino)
    setAssuntoEmail(`Relatório de Atendimento Delfos Solar — OS ${osCod}`)

    let msgEmail =
      `Olá, ${clienteNome}!\n\n` +
      `Segue em anexo o Relatório de Atendimento e Condição do Sistema referente à Ordem de Serviço ${osCod}.\n\n` +
      `Nele você encontra o resumo das atividades executadas pela nossa equipe técnica, as evidências fotográficas e as recomendações de manutenção para garantir o máximo desempenho e segurança da sua usina solar.\n\n` +
      `Qualquer dúvida estamos à disposição!\n\n` +
      `Atenciosamente,\n` +
      `Delfos Engenharia Solar\n` +
      `contato@delfos.eng.br | (54) 99129-2121`

    if (relatorio.solicitarAvaliacaoGoogle) {
      const tit = relatorio.avaliacaoGoogleTitulo
        ? `⭐ ${relatorio.avaliacaoGoogleTitulo}`
        : '⭐ Sua opinião vale muito para nós'
      const txt = relatorio.avaliacaoGoogleTexto || ''
      const lnk = relatorio.avaliacaoGoogleLink || 'https://g.page/r/CTsVOsKTsWCTEBM/review'

      msgEmail += `\n\n${tit}\n${txt}\n${lnk}`
    }

    setMensagemEmail(msgEmail)
    setEmailEnviadoSucesso(false)
    setModalEmailAberto(true)
  }

  const validarEmail = (emailStr: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim())
  }

  const handleConfirmarEnvioEmail = async () => {
    const destinoLimpo = destinatarioEmail.trim()
    if (!destinoLimpo) {
      toast.error('Informe o e-mail do destinatário.')
      return
    }
    if (!validarEmail(destinoLimpo)) {
      toast.error('Formato de e-mail inválido. Por favor, revise o endereço.')
      return
    }
    if (!assuntoEmail.trim()) {
      toast.error('Informe o assunto do e-mail.')
      return
    }

    setEnviandoEmail(true)
    try {
      // 1. Gera o PDF do relatório oficial em Base64
      toast.info('Gerando PDF do relatório para anexo...')
      const rodapeCfg = getRodapeComercialCacheSync()
      const { base64, fileName } = await gerarRelatorioOSPdfBlobBase64({
        os,
        cliente,
        contratoOM: contratoOMCliente,
        sistema: usina,
        fotosDataUrls: fotosUrls,
        rodapeComercial: rodapeCfg,
        equipamentosUsina,
        ativosUsina,
      })

      // Extrai apenas o base64 puro (sem o prefixo data:application/pdf;base64,)
      const pureBase64 = base64.includes(',') ? base64.split(',')[1] : base64

      // 2. Constrói HTML do e-mail
      const blocoAvaliacaoEmailHtml = relatorio.solicitarAvaliacaoGoogle
        ? `
          <div style="background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #92400E;">
              ⭐ ${relatorio.avaliacaoGoogleTitulo || 'Sua opinião vale muito para nós'}
            </p>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #78350F; line-height: 1.5;">
              ${relatorio.avaliacaoGoogleTexto || ''}
            </p>
            <a href="${relatorio.avaliacaoGoogleLink || 'https://g.page/r/CTsVOsKTsWCTEBM/review'}" target="_blank" rel="noopener noreferrer" style="background-color: #D97706; color: #FFFFFF; padding: 8px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px; display: inline-block;">
              Avaliar no Google (15 segundos)
            </a>
          </div>
        `
        : ''

      const htmlCorpo = `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #1a2332;">
          <div style="background-color: #0E2A47; padding: 20px; border-radius: 8px 8px 0 0; color: #ffffff; text-align: center;">
            <h2 style="margin: 0; font-size: 18px; color: #ffffff; letter-spacing: 0.5px;">DELFOS ENGENHARIA SOLAR</h2>
            <p style="margin: 4px 0 0; font-size: 12px; color: #C2D3E8;">Relatório de Atendimento e Condição do Sistema</p>
          </div>
          <div style="background: #ffffff; border: 1px solid #dde4ee; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
            <p style="margin-top: 0; white-space: pre-line; color: #2c3e50;">${mensagemEmail.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
            <div style="margin-top: 24px; padding: 12px 16px; background-color: #f7f9fc; border-left: 4px solid #C9A227; border-radius: 4px; font-size: 12px; color: #536377;">
              <strong>Documento anexado:</strong> ${fileName}<br />
              <strong>OS Vinculada:</strong> ${relatorio.osCodigo} • <strong>Data:</strong> ${relatorio.dataAtendimento}
            </div>
            ${blocoAvaliacaoEmailHtml}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
            <p style="margin: 0; font-size: 11px; color: #8a9bb0; text-align: center;">
              Delfos Engenharia Solar • Rua Espírito Santo, 275 – Erechim/RS • (54) 99129-2121<br />
              contato@delfos.eng.br • www.delfos.eng.br
            </p>
          </div>
        </div>
      `

      // 3. Dispara envio via emailService
      const res = await enviarEmail({
        destinatario: destinoLimpo,
        assunto: assuntoEmail.trim(),
        corpoTexto: mensagemEmail,
        corpoHtml: htmlCorpo,
        from: DEFAULT_EMAIL_FROM,
        anexos: [
          {
            filename: fileName,
            content: pureBase64,
          },
        ],
      })

      if (!res.ok && !res.sucesso) {
        throw new Error(res.error || 'Falha ao enviar e-mail pelo servidor.')
      }

      // 4. Registra atividade no CRM para o histórico do cliente
      const clienteIdParaAtividade =
        cliente?.id || clienteProp?.id || os?.cliente_id || os?.expand?.cliente_id?.id
      if (clienteIdParaAtividade) {
        try {
          await createAtividade({
            cliente_id: clienteIdParaAtividade,
            tipo: 'email',
            titulo: `Relatório da OS ${relatorio.osCodigo} enviado por e-mail`,
            descricao:
              `Relatório de Atendimento enviado para ${destinoLimpo}.\n` +
              `Assunto: ${assuntoEmail.trim()}\n` +
              `Arquivo anexado: ${fileName}\n` +
              (res.id ? `ID Resend: ${res.id}` : ''),
            data_prevista: new Date().toISOString(),
            status: 'concluida',
          })
        } catch (crmErr) {
          console.warn('Não foi possível registrar atividade no CRM:', crmErr)
        }
      }

      setEmailEnviadoSucesso(true)
      toast.success(`Relatório enviado com sucesso para ${destinoLimpo}!`)
      setTimeout(() => {
        setModalEmailAberto(false)
      }, 1500)
    } catch (err: any) {
      console.error('Erro ao enviar relatório por e-mail:', err)
      toast.error(err?.message || 'Falha ao enviar e-mail. Tente novamente.')
    } finally {
      setEnviandoEmail(false)
    }
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
      {/* Barra de ações flutuante (canto superior direito com quebra responsiva e sem sobreposição, oculta na impressão) */}
      <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 flex flex-wrap items-center justify-end gap-2 max-w-[calc(100vw-1.5rem)] print:hidden">
        {showHeaderActions && null}

        {/* Botão Enviar WhatsApp (PDF ou Link HTML) */}

        {/* Botão Enviar por e-mail */}

        {/* Botão Baixar PDF */}
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
            <a href="mailto:contato@delfos.eng.br" className="text-[#F3D372] hover:underline">
              contato@delfos.eng.br
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
          </div>
        </section>

        {/* 3.1. Equipamentos da Usina (Inversores e Módulos Fotovoltaicos) */}
        {relatorio.equipamentosUsina?.temUsinaVinculada && (
          <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#EBF0F7] pb-2">
              <h3 className="m-0 text-base font-bold text-[#0E2A47] flex items-center gap-2">
                <span>Equipamentos da Usina</span>
              </h3>
            </div>

            {!relatorio.equipamentosUsina.temEquipamentos ? (
              <p className="text-xs sm:text-sm text-[#536377] italic m-0">
                Nenhum equipamento cadastrado para esta usina.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coluna Inversores */}
                <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-2.5 print:bg-white print:border-[#DDE4EE]">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0E2A47] flex items-center gap-1.5">
                      <span>⚡ Inversores</span>
                    </span>
                    <span className="text-[11px] font-bold text-[#536377] bg-white px-2 py-0.5 rounded-full border border-[#DDE4EE]">
                      {relatorio.equipamentosUsina.inversores.length}{' '}
                      {relatorio.equipamentosUsina.inversores.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {relatorio.equipamentosUsina.inversores.length > 0 ? (
                    <div className="space-y-2">
                      {relatorio.equipamentosUsina.inversores.map((inv, idx) => (
                        <div
                          key={inv.id || idx}
                          className="bg-white border border-[#DDE4EE] rounded-lg p-2.5 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-[#0E2A47] text-xs sm:text-sm">
                              {inv.quantidade > 1 ? `${inv.quantidade}x ` : ''}
                              {[inv.marca, inv.modelo].filter(Boolean).join(' ') ||
                                'Inversor Fotovoltaico'}
                            </span>
                            {inv.potencia_w && (
                              <span className="text-[11px] font-semibold text-[#1B8342] bg-[#F1F9F4] px-2 py-0.5 rounded border border-[#B8E4C7]">
                                {(inv.potencia_w / 1000).toFixed(1)} kW
                              </span>
                            )}
                          </div>
                          {inv.numero_serie && (
                            <span className="text-[11px] text-[#536377]">
                              Nº de Série:{' '}
                              <strong className="text-[#1A2332]">{inv.numero_serie}</strong>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#536377] italic m-0">Nenhum inversor cadastrado.</p>
                  )}
                </div>

                {/* Coluna Módulos Fotovoltaicos */}
                <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4 flex flex-col gap-2.5 print:bg-white print:border-[#DDE4EE]">
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#0E2A47] flex items-center gap-1.5">
                      <span>☀️ Módulos Fotovoltaicos</span>
                    </span>
                    <span className="text-[11px] font-bold text-[#536377] bg-white px-2 py-0.5 rounded-full border border-[#DDE4EE]">
                      {relatorio.equipamentosUsina.modulos.length}{' '}
                      {relatorio.equipamentosUsina.modulos.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {relatorio.equipamentosUsina.modulos.length > 0 ? (
                    <div className="space-y-2">
                      {relatorio.equipamentosUsina.modulos.map((mod, idx) => (
                        <div
                          key={mod.id || idx}
                          className="bg-white border border-[#DDE4EE] rounded-lg p-2.5 flex flex-col gap-1 text-xs"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="font-bold text-[#0E2A47] text-xs sm:text-sm">
                              {mod.quantidade > 0 ? `${mod.quantidade}x ` : ''}
                              {[mod.marca, mod.modelo].filter(Boolean).join(' ') ||
                                'Módulo Fotovoltaico'}
                            </span>
                            {mod.potencia_w && (
                              <span className="text-[11px] font-semibold text-[#1B8342] bg-[#F1F9F4] px-2 py-0.5 rounded border border-[#B8E4C7]">
                                {mod.potencia_w} W
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[#536377] italic m-0">
                      Nenhum módulo fotovoltaico cadastrado.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

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
                    <td data-label="Situação" className="p-3 text-xs sm:text-sm">
                      {item.situacao === 'Executado' ||
                      item.situacao === 'Executado integralmente' ? (
                        <span className="inline-block bg-[#E8F7EE] text-[#126330] border border-[#B8E4C7] font-bold text-xs px-2 py-0.5 rounded-md whitespace-nowrap print-color-exact">
                          Executado
                        </span>
                      ) : (
                        <span className="inline-block bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] font-bold text-xs px-2 py-0.5 rounded-md whitespace-nowrap print-color-exact">
                          Pendente
                        </span>
                      )}
                    </td>
                    <td data-label="Evidência" className="p-3 text-xs sm:text-sm text-[#536377]">
                      {item.evidencia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Registro Fotográfico — Agrupado por etapa do checklist com todas as fotos e referência por atividade */}
        <section className="bg-white border border-[#DDE4EE] rounded-xl p-6 shadow-[0_2px_8px_rgba(14,42,71,0.04)] print:shadow-none print:rounded-md print:p-4 space-y-5">
          <div className="flex items-center justify-between border-b-2 border-[#EBF0F7] pb-2 flex-wrap gap-2">
            <div>
              <h3 className="m-0 text-base font-bold text-[#0E2A47] flex items-center gap-2">
                Registro fotográfico
              </h3>
              <p className="text-xs text-[#536377] mt-0.5 mb-0 print:hidden">
                Evidências fotográficas organizadas por etapa do atendimento. Clique em qualquer
                foto para ampliar.
              </p>
            </div>
            <span className="text-xs font-bold text-[#0E2A47] bg-[#F1F5F9] px-2.5 py-1 rounded-full border border-[#DDE4EE]">
              {relatorio.fotos.length}{' '}
              {relatorio.fotos.length === 1 ? 'foto registrada' : 'fotos registradas'}
            </span>
          </div>

          {Array.isArray(relatorio.fotosPorEtapa) && relatorio.fotosPorEtapa.length > 0 ? (
            <div className="space-y-6">
              {relatorio.fotosPorEtapa.map((grupo, gIdx) => (
                <div
                  key={grupo.itemChecklistId || `grupo-${gIdx}`}
                  className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 flex-wrap gap-2">
                    <h4 className="m-0 text-xs sm:text-sm font-extrabold text-[#0E2A47] uppercase tracking-wider">
                      {grupo.itemChecklistTexto}
                    </h4>
                    <span className="text-[11px] font-bold text-[#536377] bg-white px-2 py-0.5 rounded-full border border-[#DDE4EE]">
                      {grupo.fotos.length} {grupo.fotos.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {grupo.fotos.map((foto, idx) => {
                      const fotoNumGeral = foto.numeroGlobal || idx + 1
                      return (
                        <div
                          key={foto.id || `foto-${gIdx}-${idx}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => setFotoModal(foto)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setFotoModal(foto)
                            }
                          }}
                          className="bg-white border border-[#DDE4EE] hover:border-[#BACEDB] rounded-xl overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all flex flex-col group print:cursor-default print:border-[#D0D0D0] print:rounded-md print:hover:translate-y-0 shadow-2xs"
                        >
                          {foto.url ? (
                            <div className="aspect-4/3 bg-slate-900 overflow-hidden relative print:aspect-4/3">
                              <img
                                src={foto.url}
                                alt={foto.titulo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <span className="absolute top-2 left-2 bg-[#0E2A47]/85 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                                Foto {fotoNumGeral}
                              </span>
                              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded print:hidden">
                                Ampliar 🔍
                              </span>
                            </div>
                          ) : (
                            <div className="aspect-4/3 bg-linear-to-br from-[#224364] to-[#0E2A47] text-white flex flex-col items-center justify-center p-3 text-center relative print:aspect-4/3 print-color-exact">
                              <span className="absolute top-2 left-2 bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                                Foto {fotoNumGeral}
                              </span>
                              <Camera className="w-7 h-7 text-[#C9A227] mb-1.5" />
                              <div className="text-xs font-bold leading-tight px-1">
                                {foto.titulo}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {Array.isArray(relatorio.fotosGeraisSemEtapa) &&
                relatorio.fotosGeraisSemEtapa.length > 0 && (
                  <div className="bg-[#F8FAFD] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 flex-wrap gap-2">
                      <h4 className="m-0 text-xs sm:text-sm font-extrabold text-[#0E2A47] uppercase tracking-wider">
                        Outros registros fotográficos
                      </h4>{' '}
                      <span className="text-[11px] font-bold text-[#536377] bg-white px-2 py-0.5 rounded-full border border-[#DDE4EE]">
                        {relatorio.fotosGeraisSemEtapa.length}{' '}
                        {relatorio.fotosGeraisSemEtapa.length === 1 ? 'foto' : 'fotos'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {relatorio.fotosGeraisSemEtapa.map((foto, idx) => {
                        const fotoNumGeral = foto.numeroGlobal || idx + 1
                        return (
                          <div
                            key={foto.id || `foto-geral-${idx}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setFotoModal(foto)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                setFotoModal(foto)
                              }
                            }}
                            className="bg-white border border-[#DDE4EE] hover:border-[#BACEDB] rounded-xl overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all flex flex-col group print:cursor-default print:border-[#D0D0D0] print:rounded-md print:hover:translate-y-0 shadow-2xs"
                          >
                            {foto.url ? (
                              <div className="aspect-4/3 bg-slate-900 overflow-hidden relative print:aspect-4/3">
                                <img
                                  src={foto.url}
                                  alt={foto.titulo}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <span className="absolute top-2 left-2 bg-[#0E2A47]/85 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                                  Foto {fotoNumGeral}
                                </span>
                                <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded print:hidden">
                                  Ampliar 🔍
                                </span>
                              </div>
                            ) : (
                              <div className="aspect-4/3 bg-linear-to-br from-[#224364] to-[#0E2A47] text-white flex flex-col items-center justify-center p-3 text-center relative print:aspect-4/3 print-color-exact">
                                <span className="absolute top-2 left-2 bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                                  Foto {fotoNumGeral}
                                </span>
                                <Camera className="w-7 h-7 text-[#C9A227] mb-1.5" />
                                <div className="text-xs font-bold leading-tight px-1">
                                  {foto.titulo}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {relatorio.fotos.map((foto, idx) => {
                const fotoNumGeral = foto.numeroGlobal || idx + 1
                return (
                  <div
                    key={foto.id || `foto-${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setFotoModal(foto)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setFotoModal(foto)
                      }
                    }}
                    className="bg-white border border-[#DDE4EE] hover:border-[#BACEDB] rounded-xl overflow-hidden cursor-pointer hover:-translate-y-0.5 transition-all flex flex-col group print:cursor-default print:border-[#D0D0D0] print:rounded-md print:hover:translate-y-0 shadow-2xs"
                  >
                    {foto.url ? (
                      <div className="aspect-4/3 bg-slate-900 overflow-hidden relative print:aspect-4/3">
                        <img
                          src={foto.url}
                          alt={foto.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 left-2 bg-[#0E2A47]/85 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                          Foto {fotoNumGeral}
                        </span>
                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded print:hidden">
                          Ampliar 🔍
                        </span>
                      </div>
                    ) : (
                      <div className="aspect-4/3 bg-linear-to-br from-[#224364] to-[#0E2A47] text-white flex flex-col items-center justify-center p-3 text-center relative print:aspect-4/3 print-color-exact">
                        <span className="absolute top-2 left-2 bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded">
                          Foto {fotoNumGeral}
                        </span>
                        <Camera className="w-7 h-7 text-[#C9A227] mb-1.5" />
                        <div className="text-xs font-bold leading-tight px-1">{foto.titulo}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
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
        </section>

        {/* 11. Solicitação de Avaliação no Google (Apenas quando ativo) */}
        {relatorio.solicitarAvaliacaoGoogle && (
          <section className="bg-linear-to-r from-amber-50/70 via-white to-amber-50/50 border-2 border-amber-300/80 rounded-xl p-5 sm:p-6 shadow-[0_2px_12px_rgba(201,162,39,0.12)] print:shadow-none print:rounded-md print:p-4 print-color-exact">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">⭐</span>
                  <h3 className="m-0 text-sm sm:text-base font-extrabold text-[#0E2A47] tracking-tight">
                    {relatorio.avaliacaoGoogleTitulo || 'Sua opinião vale muito para nós'}
                  </h3>
                </div>
                <p className="m-0 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  {relatorio.avaliacaoGoogleTexto ||
                    'Ficamos felizes em atender você! Se o serviço foi do seu agrado, reserve 15 segundos para avaliar nossa equipe no Google — isso é muito importante para continuarmos entregando um atendimento de qualidade.'}
                </p>
              </div>

              {relatorio.avaliacaoGoogleLink && (
                <div className="shrink-0 flex items-center">
                  <a
                    href={relatorio.avaliacaoGoogleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C9A227] hover:bg-[#b5901f] text-[#0E2A47] font-bold text-xs sm:text-sm shadow-sm transition-all hover:shadow-md cursor-pointer print:border print:border-[#B38E1D]"
                    title="Avaliar a Delfos Solar no Google (leva 15 segundos)"
                  >
                    <span>Avaliar no Google</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 14. Rodapé Timbrado */}
        <footer className="bg-[#0E2A47] text-white rounded-b-xl p-6 sm:p-7 text-xs leading-relaxed shadow-[0_4px_16px_rgba(14,42,71,0.1)] print:rounded-b-md print:p-5 print:shadow-none print-color-exact">
          <p className="m-0 mb-1 text-[#D2DFEE]">
            <strong className="text-white">Documento oficial Delfos Solar</strong> — Atendimento
            técnico autorizado em estrita conformidade com as normas ABNT NBR 16690 e NR-10
            (Segurança em Instalações e Serviços em Eletricidade).
          </p>
          <p className="m-0 text-[#D2DFEE]">
            Central de Operação e Suporte: (54) 99129-2121 • contato@delfos.eng.br • Rua Espírito
            Santo, 275 – Erechim/RS
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

      {/* Modal de Conferência e Disparo "Enviar por E-mail" */}
      <Dialog open={modalEmailAberto} onOpenChange={setModalEmailAberto}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border border-slate-200 shadow-2xl">
          {/* Header */}
          <div className="bg-[#0E2A47] text-white p-5 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#C9A227]/20 border border-[#C9A227]/40 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-[#C9A227]" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight">
                  Enviar Relatório por E-mail
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Ordem de Serviço {relatorio.osCodigo} • {relatorio.clienteNome}
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Aviso se o cliente não possui e-mail cadastrado */}
            {!cliente?.email && !cliente?.titular_email && !clienteProp?.email && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold">
                    Cliente sem e-mail cadastrado no sistema.
                  </strong>
                  <p className="mt-0.5 text-amber-800">
                    Digite o endereço de e-mail do destinatário abaixo para prosseguir com o envio.
                  </p>
                </div>
              </div>
            )}

            {/* Remetente fixo padrão */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-700 block">Remetente oficial:</span>
                <span className="text-slate-500 font-mono text-[11px]">{DEFAULT_EMAIL_FROM}</span>
              </div>
              <Badge
                variant="outline"
                className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
              >
                Resend verificado
              </Badge>
            </div>

            {/* Campo Destinatário */}
            <div className="space-y-1.5">
              <Label
                htmlFor="destinatario-email"
                className="text-xs font-semibold text-slate-800 flex items-center justify-between"
              >
                <span>E-mail do Destinatário *</span>
                {destinatarioEmail && !validarEmail(destinatarioEmail) && (
                  <span className="text-[11px] text-rose-600 font-normal">
                    Formato de e-mail inválido
                  </span>
                )}
              </Label>
              <Input
                id="destinatario-email"
                type="email"
                placeholder="exemplo@cliente.com.br"
                value={destinatarioEmail}
                onChange={(e) => setDestinatarioEmail(e.target.value)}
                disabled={enviandoEmail}
                className={`text-sm ${
                  destinatarioEmail && !validarEmail(destinatarioEmail)
                    ? 'border-rose-400 focus-visible:ring-rose-400'
                    : 'border-slate-300'
                }`}
              />
            </div>

            {/* Campo Assunto */}
            <div className="space-y-1.5">
              <Label htmlFor="assunto-email" className="text-xs font-semibold text-slate-800">
                Assunto do E-mail *
              </Label>
              <Input
                id="assunto-email"
                type="text"
                placeholder="Assunto da mensagem"
                value={assuntoEmail}
                onChange={(e) => setAssuntoEmail(e.target.value)}
                disabled={enviandoEmail}
                className="text-sm border-slate-300"
              />
            </div>

            {/* Campo Mensagem */}
            <div className="space-y-1.5">
              <Label htmlFor="mensagem-email" className="text-xs font-semibold text-slate-800">
                Mensagem Explicativa (editável)
              </Label>
              <textarea
                id="mensagem-email"
                rows={6}
                value={mensagemEmail}
                onChange={(e) => setMensagemEmail(e.target.value)}
                disabled={enviandoEmail}
                className="w-full text-xs leading-relaxed p-3 rounded-md border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-[#0E2A47] text-slate-800 resize-y"
              />
            </div>

            {/* Informação sobre o anexo */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <FileCheck className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  Relatorio_OS_{relatorio.osCodigo || 'Atendimento'}.pdf
                </p>
                <p className="text-[11px] text-slate-500">
                  Gerado automaticamente via PDF oficial com fotos e parecer técnico
                </p>
              </div>
            </div>

            {emailEnviadoSucesso && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <MailCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>E-mail enviado com sucesso e registrado no histórico do cliente!</span>
              </div>
            )}
          </div>

          {/* Rodapé com botões de ação */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalEmailAberto(false)}
              disabled={enviandoEmail}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarEnvioEmail}
              disabled={enviandoEmail || !destinatarioEmail.trim()}
              className="bg-[#0E2A47] hover:bg-[#163e68] text-white font-semibold text-xs gap-1.5"
            >
              {enviandoEmail ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando e-mail...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 text-[#C9A227]" />
                  <span>Disparar e-mail agora</span>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default RelatorioOSConteudo

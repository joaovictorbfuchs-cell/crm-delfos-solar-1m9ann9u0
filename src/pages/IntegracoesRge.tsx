import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Layers,
  Link2,
  Zap,
  Search,
  Plus,
  ArrowUpDown,
  MoreVertical,
  Eye,
  RefreshCw,
  Award,
  Key,
  FileDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Pencil,
  Upload,
  FileText,
  EyeOff,
  Users,
  Percent,
  UserPlus,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatarTempoRelativo, formatarCompetenciaRge } from '@/lib/rgeFormatters'
import { BeneficiariasView } from '@/components/BeneficiariasView'
import { ModalPercentuaisBeneficiarias } from '@/components/ModalPercentuaisBeneficiarias'
import type { VersaoBeneficiarias, SugestaoUc } from '@/components/ModalPercentuaisBeneficiarias'

export interface Credencial {
  id: string
  uc: string
  rotulo?: string
  documento?: string
  login?: string
  senha?: string
  token?: string
  token_exp?: string
  status?: string
  ultimo_login?: string
  ultimo_erro?: string
  ativo?: boolean
  cliente_id?: string
  usina_id?: string
  expand?: {
    cliente_id?: { id: string; nome: string }
    usina_id?: {
      id: string
      nome: string
      endereco?: string
      beneficiarias?: unknown
      cliente_id?: string
    }
  }
}

export interface Beneficiaria {
  id: string
  credencial_id: string
  uc: string
  rotulo?: string
  percentual?: number
  cliente_id?: string
  usina_id?: string
  ativo?: boolean
  observacao?: string
  ultimo_erro?: string
}

export interface ContaRge {
  id: string
  uc: string
  competencia: string
  tem_pdf?: boolean
  tipo?: string
  titular?: string
  consumo_kwh?: number
  nome_arquivo?: string
  created?: string
  origem?: string
  valor?: number
  vencimento?: string
  dados?: Record<string, unknown>
  cliente_id?: string
  usina_id?: string
  credencial_id?: string
  expand?: {
    cliente_id?: { id: string; nome: string }
    usina_id?: { id: string; nome: string; endereco?: string }
    credencial_id?: { id: string; login?: string; ultimo_erro?: string; status?: string }
  }
}

export function IntegracoesRgePage() {
  const [abaAtiva, setAbaAtiva] = useState<'concessionaria' | 'faturas' | 'beneficiarias'>(
    'concessionaria',
  )
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [credenciais, setCredenciais] = useState<Credencial[]>([])
  const [contas, setContas] = useState<ContaRge[]>([])
  const [erroGlobal, setErroGlobal] = useState<string | null>(null)

  // Mapas de enriquecimento (clientes e usinas para vincular quando expand não estiver presente)
  const [clientesMap, setClientesMap] = useState<Record<string, { id: string; nome: string }>>({})
  const [usinasMap, setUsinasMap] = useState<
    Record<
      string,
      { id: string; nome: string; endereco?: string; beneficiarias?: unknown; cliente_id?: string }
    >
  >({})

  // Paginação Concessionária (10 por página)
  const [paginaCredenciais, setPaginaCredenciais] = useState(1)
  const ITENS_POR_PAGINA = 10

  // Paginação Faturas (10 por página)
  const [paginaFaturas, setPaginaFaturas] = useState(1)

  // Ordenação das tabelas
  const [ordemCampoCred, setOrdemCampoCred] = useState<string>('unidade')
  const [ordemDirCred, setOrdemDirCred] = useState<'asc' | 'desc'>('asc')

  const [ordemCampoFat, setOrdemCampoFat] = useState<string>('competencia')
  const [ordemDirFat, setOrdemDirFat] = useState<'asc' | 'desc'>('desc')

  // Modais existentes mantidos
  const [modalNovaAberto, setModalNovaAberto] = useState(false)
  const [modalEditarTokenAberto, setModalEditarTokenAberto] = useState(false)
  const [modalDetalhesContaAberto, setModalDetalhesContaAberto] = useState(false)
  const [contaSelecionada, setContaSelecionada] = useState<ContaRge | null>(null)
  const [credencialEmEdicao, setCredencialEmEdicao] = useState<Credencial | null>(null)

  // Form nova credencial
  const [formUc, setFormUc] = useState('')
  const [formRotulo, setFormRotulo] = useState('')
  const [formDoc, setFormDoc] = useState('')
  const [formLogin, setFormLogin] = useState('')
  const [formSenha, setFormSenha] = useState('')
  const [formTokenEditar, setFormTokenEditar] = useState('')
  const [salvando, setSalvando] = useState(false)

  // --- Editar credencial (lápis) ---
  const [modalEditarCredAberto, setModalEditarCredAberto] = useState(false)
  const [edUc, setEdUc] = useState('')
  const [edRotulo, setEdRotulo] = useState('')
  const [edDoc, setEdDoc] = useState('')
  const [edLogin, setEdLogin] = useState('')
  const [edSenha, setEdSenha] = useState('')
  const [edAtivo, setEdAtivo] = useState(true)

  // --- Anexar conta baixada na mão ---
  const [modalAnexarAberto, setModalAnexarAberto] = useState(false)
  const [anCredId, setAnCredId] = useState<string | null>(null)
  const [anUc, setAnUc] = useState('')
  const [anCompetencia, setAnCompetencia] = useState('')
  const [anValor, setAnValor] = useState('')
  const [anVencimento, setAnVencimento] = useState('')
  const [anArquivo, setAnArquivo] = useState<File | null>(null)
  const [anEnviando, setAnEnviando] = useState(false)

  // --- Ver contas de uma UC ---
  const [modalContasUcAberto, setModalContasUcAberto] = useState(false)
  const [contasDaUc, setContasDaUc] = useState<ContaRge[]>([])
  const [carregandoContasUc, setCarregandoContasUc] = useState(false)
  const [tituloContasUc, setTituloContasUc] = useState('')

  // --- Senha: olho (revelar) e lápis (alterar) ---
  const [senhasVisiveis, setSenhasVisiveis] = useState<Record<string, string>>({})
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false)
  const [senhaCredencial, setSenhaCredencial] = useState<Credencial | null>(null)
  const [novaSenhaEdit, setNovaSenhaEdit] = useState('')

  // --- Beneficiárias ---
  const [beneficiarias, setBeneficiarias] = useState<Beneficiaria[]>([])
  const [carregandoBen, setCarregandoBen] = useState(false)
  const [buscaBen, setBuscaBen] = useState('')
  const [paginaBen, setPaginaBen] = useState(1)
  const [modalBenAberto, setModalBenAberto] = useState(false)
  const [benEmEdicao, setBenEmEdicao] = useState<Beneficiaria | null>(null)
  const [benCredencial, setBenCredencial] = useState<Credencial | null>(null)
  const [fBenUc, setFBenUc] = useState('')
  const [fBenRotulo, setFBenRotulo] = useState('')
  const [fBenPercentual, setFBenPercentual] = useState('')
  const [fBenObs, setFBenObs] = useState('')
  const [salvandoBen, setSalvandoBen] = useState(false)

  // --- Modal de percentuais (unidade geradora) ---
  const [modalPctAberto, setModalPctAberto] = useState(false)
  const [pctCred, setPctCred] = useState<Credencial | null>(null)
  const [pctBeneficiarias, setPctBeneficiarias] = useState<Beneficiaria[]>([])
  const [pctHistorico, setPctHistorico] = useState<VersaoBeneficiarias[]>([])
  const [pctSugestoes, setPctSugestoes] = useState<SugestaoUc[]>([])
  const [pctSalvando, setPctSalvando] = useState(false)
  const [pctCarregando, setPctCarregando] = useState(false)

  // Chamada autenticada para o backend
  const chamar = useCallback(
    async <T = unknown,>(path: string, options: RequestInit = {}): Promise<T> => {
      const url = `${pb.baseUrl}/backend/v1${path}`
      const headers = new Headers(options.headers || {})
      const token = pb.authStore.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
        headers.set('Content-Type', 'application/json')
      }
      const res = await fetch(url, { ...options, headers })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`)
      }
      return json as T
    },
    [],
  )

  // Carregar dados de clientes e usinas para lookup rápido
  const carregarApoio = useCallback(async () => {
    try {
      const [recsCli, recsUs] = await Promise.all([
        pb
          .collection('clientes')
          .getFullList<{ id: string; nome: string }>({
            fields: 'id,nome',
            requestKey: null,
          })
          .catch(() => []),
        pb
          .collection('usinas')
          .getFullList<{
            id: string
            nome: string
            endereco?: string
            beneficiarias?: unknown
            cliente_id?: string
            numero_uc?: string
          }>({
            fields: 'id,nome,endereco,beneficiarias,cliente_id,numero_uc',
            requestKey: null,
          })
          .catch(() => []),
      ])

      const mapC: Record<string, { id: string; nome: string }> = {}
      for (const c of recsCli) {
        mapC[c.id] = { id: c.id, nome: c.nome }
      }
      setClientesMap(mapC)

      const mapU: Record<
        string,
        {
          id: string
          nome: string
          endereco?: string
          beneficiarias?: unknown
          cliente_id?: string
        }
      > = {}
      for (const u of recsUs) {
        mapU[u.id] = {
          id: u.id,
          nome: u.nome,
          endereco: u.endereco,
          beneficiarias: u.beneficiarias,
          cliente_id: u.cliente_id,
        }
      }
      setUsinasMap(mapU)
    } catch {
      // Ignora erro secundário de apoio
    }
  }, [])

  // Carregar credenciais e contas
  const carregarDados = useCallback(async () => {
    setCarregando(true)
    setErroGlobal(null)
    try {
      const [rCred, rCont] = await Promise.all([
        chamar<{ ok: boolean; itens: Credencial[] }>('/rge/credenciais').catch((err) => {
          throw err
        }),
        chamar<{ ok: boolean; itens: ContaRge[] }>('/rge/contas-pdf').catch((err) => {
          console.warn('Erro ao carregar contas rge:', err)
          return chamar<{ ok: boolean; itens: ContaRge[] }>('/rge/contas').catch(() => ({
            ok: true,
            itens: [],
          }))
        }),
      ])

      if (rCred && rCred.itens) {
        setCredenciais(rCred.itens)
      }
      if (rCont && rCont.itens) {
        setContas(rCont.itens)
      }

      // beneficiárias (coleção pode não existir em instalações antigas)
      try {
        const rBen = await chamar<{ ok: boolean; itens: Beneficiaria[] }>('/rge/beneficiarias-uc')
        if (rBen && rBen.itens) setBeneficiarias(rBen.itens)
      } catch {
        setBeneficiarias([])
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setErroGlobal(msg)
      toast({
        title: 'Erro ao carregar dados da RGE',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }, [chamar])

  useEffect(() => {
    carregarApoio()
    carregarDados()
  }, [carregarApoio, carregarDados])

  // Ações de sincronização e download
  const handleSincronizar = async (cred: Credencial) => {
    try {
      toast({ title: 'Sincronizando com a RGE...', description: `UC ${cred.uc}` })
      const res = await chamar<{ ok: boolean; error?: string; precisa_token?: boolean }>(
        '/rge/sincronizar',
        {
          method: 'POST',
          body: JSON.stringify({ credencial_id: cred.id }),
        },
      )
      if (!res.ok) {
        throw new Error(res.error || 'Falha ao sincronizar')
      }
      toast({ title: 'Sincronizado com sucesso!' })
      await carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao sincronizar',
        description: msg,
        variant: 'destructive',
      })
      await carregarDados()
    }
  }

  const handleBaixarConta = async (cred: Credencial) => {
    try {
      toast({ title: 'Solicitando fatura em PDF...', description: `UC ${cred.uc}` })
      const res = await chamar<{ ok: boolean; base64?: string; error?: string }>(
        `/rge/conta-pdf?credencial_id=${encodeURIComponent(cred.id)}`,
      )
      if (!res.ok || !res.base64) {
        throw new Error(res.error || 'PDF indisponível')
      }
      const bin = atob(res.base64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      const blob = new Blob([bytes], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `fatura-rge-${cred.uc}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: 'Fatura baixada!' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao baixar fatura',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  const handleExcluirCredencial = async (cred: Credencial) => {
    if (!confirm(`Remover credencial da UC ${cred.uc}?`)) return
    try {
      await chamar(`/rge/credenciais?id=${encodeURIComponent(cred.id)}`, { method: 'DELETE' })
      toast({ title: 'Credencial removida' })
      await carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao remover',
        description: msg,
        variant: 'destructive',
      })
    }
  }

  // ---------- Editar credencial ----------
  const abrirEditarCredencial = (c: Credencial) => {
    setCredencialEmEdicao(c)
    setEdUc(c.uc || '')
    setEdRotulo(c.rotulo || '')
    setEdDoc(c.documento || '')
    setEdLogin(c.login || '')
    setEdSenha('')
    setEdAtivo(c.ativo !== false)
    setModalEditarCredAberto(true)
  }

  const handleSalvarEdicao = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!credencialEmEdicao) return
    if (!edUc) {
      toast({ title: 'Informe o número da UC', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      await chamar(`/rge/credenciais/${credencialEmEdicao.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          uc: edUc,
          rotulo: edRotulo,
          documento: edDoc,
          login: edLogin,
          senha: edSenha,
          ativo: edAtivo,
        }),
      })
      toast({ title: 'Credencial atualizada!' })
      setModalEditarCredAberto(false)
      setCredencialEmEdicao(null)
      await carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // ---------- Anexar conta baixada na mão ----------
  const abrirAnexarConta = (c: Credencial) => {
    setAnCredId(c.id)
    setAnUc(c.uc || '')
    const hoje = new Date()
    const mm = String(hoje.getMonth() + 1).padStart(2, '0')
    const nomes = [
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ]
    setAnCompetencia(`${hoje.getFullYear()}-${nomes[Number(mm) - 1]}`)
    setAnValor('')
    setAnVencimento('')
    setAnArquivo(null)
    setModalAnexarAberto(true)
  }

  const handleAnexarConta = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!anCompetencia) {
      toast({ title: 'Informe a competência', variant: 'destructive' })
      return
    }
    if (!anArquivo) {
      toast({ title: 'Escolha o arquivo PDF', variant: 'destructive' })
      return
    }
    setAnEnviando(true)
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => {
          const r = String(fr.result || '')
          resolve(r.slice(r.indexOf(',') + 1))
        }
        fr.onerror = () => reject(new Error('Não consegui ler o arquivo'))
        fr.readAsDataURL(anArquivo)
      })
      const res = await chamar<{ ok: boolean; conta_id?: string; error?: string }>(
        '/rge/anexar-conta',
        {
          method: 'POST',
          body: JSON.stringify({
            uc: anUc,
            competencia: anCompetencia,
            valor: anValor,
            vencimento: anVencimento,
            nome_arquivo: anArquivo.name,
            pdf_base64: b64,
            credencial_id: anCredId,
          }),
        },
      )
      if (!res.ok) throw new Error(res.error || 'Falha ao anexar')
      toast({ title: 'Conta anexada!', description: `${anUc} · ${anCompetencia}` })
      setModalAnexarAberto(false)
      await carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao anexar', description: msg, variant: 'destructive' })
    } finally {
      setAnEnviando(false)
    }
  }

  // ---------- Senha: revelar / alterar ----------
  const alternarSenha = async (c: Credencial) => {
    if (senhasVisiveis[c.id]) {
      setSenhasVisiveis((prev) => {
        const novo = { ...prev }
        delete novo[c.id]
        return novo
      })
      return
    }
    try {
      const res = await chamar<{ ok: boolean; senha?: string; error?: string }>(
        `/rge/credencial-senha?credencial_id=${encodeURIComponent(c.id)}`,
      )
      if (!res.ok) throw new Error(res.error || 'Não foi possível ler a senha')
      if (!res.senha) {
        toast({
          title: 'Esta UC ainda não tem senha',
          description: 'Clique no lápis para cadastrar.',
        })
        return
      }
      setSenhasVisiveis((prev) => ({ ...prev, [c.id]: res.senha as string }))
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao mostrar a senha', description: msg, variant: 'destructive' })
    }
  }

  const abrirEditarSenha = (c: Credencial) => {
    setSenhaCredencial(c)
    setNovaSenhaEdit('')
    setModalSenhaAberto(true)
  }

  const handleSalvarSenha = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!senhaCredencial) return
    if (!novaSenhaEdit.trim()) {
      toast({ title: 'Digite a nova senha', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      await chamar('/rge/credencial-senha', {
        method: 'POST',
        body: JSON.stringify({ credencial_id: senhaCredencial.id, senha: novaSenhaEdit }),
      })
      setSenhasVisiveis((prev) => ({ ...prev, [senhaCredencial.id]: novaSenhaEdit }))
      setModalSenhaAberto(false)
      setNovaSenhaEdit('')
      toast({
        title: 'Senha atualizada',
        description: 'O robô vai usar esta senha na próxima rodada.',
      })
      await carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao salvar a senha', description: msg, variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  // ---------- Beneficiárias ----------
  const abrirBeneficiarias = (c: Credencial) => {
    setBenCredencial(c)
    setBenEmEdicao(null)
    setFBenUc('')
    setFBenRotulo('')
    setFBenPercentual('')
    setFBenObs('')
    setModalBenAberto(true)
  }

  const editarBeneficiaria = (b: Beneficiaria) => {
    setBenEmEdicao(b)
    setFBenUc(b.uc)
    setFBenRotulo(b.rotulo || '')
    setFBenPercentual(b.percentual != null ? String(b.percentual) : '')
    setFBenObs(b.observacao || '')
  }

  const limparFormBen = () => {
    setBenEmEdicao(null)
    setFBenUc('')
    setFBenRotulo('')
    setFBenPercentual('')
    setFBenObs('')
  }

  const handleSalvarBeneficiaria = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!benCredencial) return
    if (!fBenUc.trim()) {
      toast({ title: 'Informe a UC da beneficiária', variant: 'destructive' })
      return
    }
    setSalvandoBen(true)
    try {
      await chamar('/rge/beneficiarias-uc', {
        method: 'POST',
        body: JSON.stringify({
          id: benEmEdicao?.id,
          credencial_id: benCredencial.id,
          uc: fBenUc,
          rotulo: fBenRotulo,
          percentual: fBenPercentual,
          observacao: fBenObs,
          ativo: true,
        }),
      })
      const r = await chamar<{ ok: boolean; itens: Beneficiaria[] }>('/rge/beneficiarias-uc')
      setBeneficiarias(r.itens || [])
      limparFormBen()
      toast({ title: 'Beneficiária salva' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao salvar beneficiária', description: msg, variant: 'destructive' })
    } finally {
      setSalvandoBen(false)
    }
  }

  const removerBeneficiaria = async (b: Beneficiaria) => {
    try {
      await chamar(`/rge/beneficiarias-uc?id=${encodeURIComponent(b.id)}`, { method: 'DELETE' })
      setBeneficiarias((prev) => prev.filter((x) => x.id !== b.id))
      toast({ title: 'Beneficiária removida' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao remover', description: msg, variant: 'destructive' })
    }
  }

  // ---------- Modal de percentuais (unidade geradora) ----------
  const abrirPercentuais = useCallback(
    async (c: Credencial) => {
      setPctCred(c)
      setPctBeneficiarias(beneficiarias.filter((b) => b.credencial_id === c.id))
      setPctHistorico([])
      setPctSugestoes([])
      setPctCarregando(true)
      setModalPctAberto(true)
      try {
        // Histórico de vigência da usina geradora
        if (c.usina_id) {
          const rV = await chamar<{ ok: boolean; itens: VersaoBeneficiarias[] }>(
            `/rge/beneficiarias-uc/versoes?usina_id=${encodeURIComponent(c.usina_id)}`,
          )
          setPctHistorico(rV.itens || [])
        }
        // Sugestões: UCs de usinas do MESMO cliente da geradora (outro endereço)
        const cliId = c.cliente_id || c.expand?.usina_id?.cliente_id || ''
        const sufs: SugestaoUc[] = []
        if (cliId) {
          for (const idU in usinasMap) {
            const u = usinasMap[idU]
            if (u.cliente_id !== cliId) continue
            const ucProp = (u as { numero_uc?: string }).numero_uc || ''
            if (!ucProp) continue
            if (ucProp.replace(/\D/g, '') === String(c.uc).replace(/\D/g, '')) continue
            sufs.push({
              uc: ucProp,
              nome: u.nome,
              endereco: u.endereco,
              usina_id: u.id,
              cliente_id: u.cliente_id,
            })
          }
        }
        setPctSugestoes(sufs)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        toast({
          title: 'Erro ao carregar dados do modal',
          description: msg,
          variant: 'destructive',
        })
      } finally {
        setPctCarregando(false)
      }
    },
    [beneficiarias, chamar, usinasMap],
  )

  const handleSalvarPercentuais = useCallback(
    async (payload: {
      vigencia_inicio: string
      vigencia_fim: string
      itens: {
        id?: string
        uc: string
        rotulo?: string
        percentual: number
        cliente_id?: string
        usina_id?: string
      }[]
    }) => {
      if (!pctCred) return
      setPctSalvando(true)
      try {
        await chamar('/rge/beneficiarias-uc/lote', {
          method: 'POST',
          body: JSON.stringify({ credencial_id: pctCred.id, ...payload }),
        })
        toast({ title: 'Percentuais salvos', description: 'Beneficiárias atualizadas' })
        setModalPctAberto(false)
        const [rBen] = await Promise.all([
          chamar<{ ok: boolean; itens: Beneficiaria[] }>('/rge/beneficiarias-uc'),
          carregarApoio(),
        ])
        setBeneficiarias(rBen.itens || [])
        if (pctCred.usina_id) {
          const rV = await chamar<{ ok: boolean; itens: VersaoBeneficiarias[] }>(
            `/rge/beneficiarias-uc/versoes?usina_id=${encodeURIComponent(pctCred.usina_id)}`,
          )
          setPctHistorico(rV.itens || [])
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        toast({ title: 'Erro ao salvar percentuais', description: msg, variant: 'destructive' })
      } finally {
        setPctSalvando(false)
      }
    },
    [pctCred, chamar, carregarApoio],
  )

  // ---------- Ver contas da UC ----------
  const abrirContasDaUc = async (c: Credencial) => {
    setAnCredId(c.id)
    setTituloContasUc(c.rotulo ? `${c.rotulo} · UC ${c.uc}` : `UC ${c.uc}`)
    setContasDaUc([])
    setModalContasUcAberto(true)
    setCarregandoContasUc(true)
    try {
      const res = await chamar<{ ok: boolean; itens: ContaRge[] }>(`/rge/contas-pdf?uc=${c.uc}`)
      setContasDaUc(res.itens || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao carregar contas', description: msg, variant: 'destructive' })
    } finally {
      setCarregandoContasUc(false)
    }
  }

  const abrirPdfConta = async (conta: ContaRge) => {
    try {
      const res = await chamar<{ ok: boolean; url?: string; error?: string }>(
        `/rge/url-pdf?id=${conta.id}`,
      )
      if (!res.ok || !res.url) throw new Error(res.error || 'PDF indisponível')

      // baixa com o header de autenticação e abre o arquivo local: o arquivo do
      // PocketBase exige auth e uma nova aba não manda o header
      const r = await fetch(`${pb.baseUrl}${res.url}`, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      })
      if (!r.ok) throw new Error(`HTTP ${r.status} ao buscar o PDF`)
      const blob = await r.blob()
      const objUrl = URL.createObjectURL(blob)
      window.open(objUrl, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(objUrl), 60000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao abrir o PDF', description: msg, variant: 'destructive' })
    }
  }

  const handleSalvarNova = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formUc) {
      toast({ title: 'Informe o número da UC', variant: 'destructive' })
      return
    }
    setSalvando(true)
    try {
      await chamar('/rge/credenciais', {
        method: 'POST',
        body: JSON.stringify({
          uc: formUc,
          rotulo: formRotulo,
          documento: formDoc,
          login: formLogin,
          senha: formSenha,
        }),
      })
      toast({ title: 'Credencial cadastrada!' })
      setModalNovaAberto(false)
      setFormUc('')
      setFormRotulo('')
      setFormDoc('')
      setFormLogin('')
      setFormSenha('')
      await carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleSalvarToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credencialEmEdicao) return
    setSalvando(true)
    try {
      await chamar('/rge/credenciais', {
        method: 'PATCH',
        body: JSON.stringify({
          id: credencialEmEdicao.id,
          token: formTokenEditar,
          status: 'ok',
          ultimo_erro: '',
        }),
      })
      toast({ title: 'Token atualizado com sucesso!' })
      setModalEditarTokenAberto(false)
      setCredencialEmEdicao(null)
      setFormTokenEditar('')
      await carregarDados()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Erro ao atualizar token',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Resolver dados da unidade e cliente de uma credencial
  const resolverInfoCredencial = useCallback(
    (c: Credencial) => {
      let nomeUnidade = c.rotulo || ''
      let isVinculadoCliente = false
      let clienteNome = ''
      let qtdBeneficiarias = 0

      if (c.expand?.cliente_id?.nome) {
        clienteNome = c.expand.cliente_id.nome
        isVinculadoCliente = true
      } else if (c.cliente_id && clientesMap[c.cliente_id]) {
        clienteNome = clientesMap[c.cliente_id].nome
        isVinculadoCliente = true
      }

      if (c.expand?.usina_id?.nome) {
        nomeUnidade = c.expand.usina_id.nome
        const bens = c.expand.usina_id.beneficiarias
        if (Array.isArray(bens)) qtdBeneficiarias = bens.length
      } else if (c.usina_id && usinasMap[c.usina_id]) {
        nomeUnidade = usinasMap[c.usina_id].nome
        const bens = usinasMap[c.usina_id].beneficiarias
        if (Array.isArray(bens)) qtdBeneficiarias = bens.length
        if (!isVinculadoCliente && usinasMap[c.usina_id].cliente_id) {
          const cliId = usinasMap[c.usina_id].cliente_id!
          if (clientesMap[cliId]) {
            clienteNome = clientesMap[cliId].nome
            isVinculadoCliente = true
          }
        }
      }

      const labelExibicao = clienteNome || nomeUnidade || `UC ${c.uc}`

      return {
        labelExibicao,
        isVinculadoCliente,
        qtdBeneficiarias,
      }
    },
    [clientesMap, usinasMap],
  )

  // Resolver dados de uma fatura
  const resolverInfoFatura = useCallback(
    (fat: ContaRge) => {
      const cred = fat.credencial_id
        ? credenciais.find((k) => k.id === fat.credencial_id)
        : credenciais.find((k) => k.uc === fat.uc)

      let clienteNome = ''
      let isVinculadoCliente = false
      let secundario = ''

      // Prioridade 1: cliente direto da fatura
      if (fat.expand?.cliente_id?.nome) {
        clienteNome = fat.expand.cliente_id.nome
        isVinculadoCliente = true
      } else if (fat.cliente_id && clientesMap[fat.cliente_id]) {
        clienteNome = clientesMap[fat.cliente_id].nome
        isVinculadoCliente = true
      }

      // Prioridade 2: usina da fatura
      if (fat.expand?.usina_id?.nome) {
        secundario = fat.expand.usina_id.endereco || fat.expand.usina_id.nome
      } else if (fat.usina_id && usinasMap[fat.usina_id]) {
        secundario = usinasMap[fat.usina_id].endereco || usinasMap[fat.usina_id].nome
        if (!isVinculadoCliente && usinasMap[fat.usina_id].cliente_id) {
          const cid = usinasMap[fat.usina_id].cliente_id!
          if (clientesMap[cid]) {
            clienteNome = clientesMap[cid].nome
            isVinculadoCliente = true
          }
        }
      }

      // Prioridade 3: credencial vinculada (onde a maioria dos vínculos vive)
      if (cred) {
        const infoCred = resolverInfoCredencial(cred)
        if (!clienteNome && infoCred.isVinculadoCliente) {
          clienteNome = infoCred.labelExibicao
          isVinculadoCliente = true
        } else if (!clienteNome && cred.rotulo) {
          secundario = cred.rotulo
        }
      }

      const unidadeNome = clienteNome || secundario || `UC ${fat.uc}`

      const comErro =
        cred?.status === 'erro' ||
        cred?.status === 'expirado' ||
        Boolean(cred?.ultimo_erro) ||
        fat.nome_arquivo === 'erro'

      return {
        unidadeNome,
        secundario: secundario && secundario !== unidadeNome ? secundario : '',
        isVinculadoCliente,
        comErro,
        cred,
      }
    },
    [clientesMap, usinasMap, credenciais, resolverInfoCredencial],
  )

  // (1) Métricas calculadas para os 3 cards do topo
  const metricas = useMemo(() => {
    const totalCadastradas = credenciais.length
    const pendentes = credenciais.filter(
      (c) => c.status === 'novo' || (!c.token && c.status !== 'ok'),
    ).length

    const sucesso = credenciais.filter((c) => c.status === 'ok').length
    const falhas = credenciais.filter((c) => c.status === 'erro' || c.status === 'expirado').length

    // Em dia: credenciais ok e com faturas recentes / sem pendência
    const emDia = sucesso
    // Atrasadas: credenciais com erro ou sem faturas geradas nos últimos 45 dias
    const atrasadas = falhas

    return {
      totalCadastradas,
      pendentes,
      sucesso,
      falhas,
      emDia,
      atrasadas,
    }
  }, [credenciais])

  // Filtragem e busca para Concessionária
  const credenciaisFiltradas = useMemo(() => {
    let lista = [...credenciais]
    if (busca.trim()) {
      const q = busca.toLowerCase().trim()
      lista = lista.filter((c) => {
        const info = resolverInfoCredencial(c)
        return (
          c.uc.toLowerCase().includes(q) ||
          (c.login && c.login.toLowerCase().includes(q)) ||
          info.labelExibicao.toLowerCase().includes(q) ||
          (c.status && c.status.toLowerCase().includes(q))
        )
      })
    }

    // Ordenação
    lista.sort((a, b) => {
      let va = ''
      let vb = ''
      if (ordemCampoCred === 'uc') {
        va = a.uc
        vb = b.uc
      } else if (ordemCampoCred === 'usuario') {
        va = a.login || ''
        vb = b.login || ''
      } else if (ordemCampoCred === 'status') {
        va = a.status || ''
        vb = b.status || ''
      } else if (ordemCampoCred === 'unidade') {
        va = resolverInfoCredencial(a).labelExibicao
        vb = resolverInfoCredencial(b).labelExibicao
      } else if (ordemCampoCred === 'beneficiarias') {
        const ba = resolverInfoCredencial(a).qtdBeneficiarias
        const bb = resolverInfoCredencial(b).qtdBeneficiarias
        return ordemDirCred === 'asc' ? ba - bb : bb - ba
      }
      return ordemDirCred === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })

    return lista
  }, [credenciais, busca, ordemCampoCred, ordemDirCred, resolverInfoCredencial])

  // Beneficiárias: busca, paginação e rótulo
  const resolverRotuloBen = useCallback(
    (b: Beneficiaria) => {
      if (b.rotulo) return b.rotulo
      if (b.usina_id && usinasMap[b.usina_id]) return usinasMap[b.usina_id].nome
      if (b.cliente_id && clientesMap[b.cliente_id]) return clientesMap[b.cliente_id].nome
      return `UC ${b.uc}`
    },
    [usinasMap, clientesMap],
  )

  const beneficiariasFiltradas = useMemo(() => {
    let lista = [...beneficiarias]
    if (busca.trim()) {
      const q = busca.toLowerCase().trim()
      lista = lista.filter(
        (b) => b.uc.toLowerCase().includes(q) || resolverRotuloBen(b).toLowerCase().includes(q),
      )
    }
    lista.sort((a, b) => {
      const ca = credenciais.find((k) => k.id === a.credencial_id)
      return resolverRotuloBen(a).localeCompare(resolverRotuloBen(b)) || (ca ? 0 : 0)
    })
    return lista
  }, [beneficiarias, busca, resolverRotuloBen, credenciais])

  const totalPaginasBen = Math.max(1, Math.ceil(beneficiariasFiltradas.length / ITENS_POR_PAGINA))
  const beneficiariasPaginadas = useMemo(() => {
    const inicio = (paginaBen - 1) * ITENS_POR_PAGINA
    return beneficiariasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [beneficiariasFiltradas, paginaBen])

  // Paginação Concessionária
  const totalPaginasCredenciais = Math.max(
    1,
    Math.ceil(credenciaisFiltradas.length / ITENS_POR_PAGINA),
  )
  const credenciaisPaginadas = useMemo(() => {
    const inicio = (paginaCredenciais - 1) * ITENS_POR_PAGINA
    return credenciaisFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [credenciaisFiltradas, paginaCredenciais])

  // Filtragem e busca para Faturas
  const faturasFiltradas = useMemo(() => {
    let lista = [...contas]
    if (busca.trim()) {
      const q = busca.toLowerCase().trim()
      lista = lista.filter((f) => {
        const info = resolverInfoFatura(f)
        return (
          f.uc.toLowerCase().includes(q) ||
          f.competencia.toLowerCase().includes(q) ||
          info.unidadeNome.toLowerCase().includes(q)
        )
      })
    }

    // Ordenação
    lista.sort((a, b) => {
      if (ordemCampoFat === 'competencia') {
        const ca = a.competencia || ''
        const cb = b.competencia || ''
        return ordemDirFat === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca)
      } else if (ordemCampoFat === 'uc') {
        return ordemDirFat === 'asc' ? a.uc.localeCompare(b.uc) : b.uc.localeCompare(a.uc)
      } else if (ordemCampoFat === 'unidade') {
        const ua = resolverInfoFatura(a).unidadeNome
        const ub = resolverInfoFatura(b).unidadeNome
        return ordemDirFat === 'asc' ? ua.localeCompare(ub) : ub.localeCompare(ua)
      }
      return 0
    })

    return lista
  }, [contas, busca, ordemCampoFat, ordemDirFat, resolverInfoFatura])

  // Paginação Faturas
  const totalPaginasFaturas = Math.max(1, Math.ceil(faturasFiltradas.length / ITENS_POR_PAGINA))
  const faturasPaginadas = useMemo(() => {
    const inicio = (paginaFaturas - 1) * ITENS_POR_PAGINA
    return faturasFiltradas.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [faturasFiltradas, paginaFaturas])

  // Reset de página ao buscar
  useEffect(() => {
    setPaginaCredenciais(1)
    setPaginaFaturas(1)
  }, [busca])

  const alternarOrdemCred = (campo: string) => {
    if (ordemCampoCred === campo) {
      setOrdemDirCred((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdemCampoCred(campo)
      setOrdemDirCred('asc')
    }
  }

  const alternarOrdemFat = (campo: string) => {
    if (ordemCampoFat === campo) {
      setOrdemDirFat((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setOrdemCampoFat(campo)
      setOrdemDirFat('asc')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 space-y-6 text-slate-800">
      {/* (1) Três cards de métricas no topo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cadastradas */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Cadastradas
              </span>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                {metricas.totalCadastradas}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            {metricas.pendentes} Pendentes
          </span>
        </div>

        {/* Card 2: Sucesso */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Sucesso
              </span>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                {metricas.sucesso}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            {metricas.falhas} Falhas
          </span>
        </div>

        {/* Card 3: Em Dia */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
              <Zap className="w-6 h-6 fill-amber-400 text-amber-500" />
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Em Dia
              </span>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                {metricas.emDia}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
            {String(metricas.atrasadas).padStart(2, '0')} Atrasadas
          </span>
        </div>
      </div>

      {/* (2) Barra de navegação: abas, busca e botão integrar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-8 border-b md:border-b-0 border-slate-200">
          <button
            type="button"
            onClick={() => setAbaAtiva('concessionaria')}
            className={`pb-2.5 text-xl font-bold tracking-tight transition-colors border-b-2 ${
              abaAtiva === 'concessionaria'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Gerenciar Concessionária
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('faturas')}
            className={`pb-2.5 text-xl font-bold tracking-tight transition-colors border-b-2 ${
              abaAtiva === 'faturas'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Gerenciar Faturas
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('beneficiarias')}
            className={`pb-2.5 text-xl font-bold tracking-tight transition-colors border-b-2 ${
              abaAtiva === 'beneficiarias'
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-600 border-transparent hover:text-slate-900'
            }`}
          >
            Beneficiárias
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500 rounded-lg h-10 text-sm"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              const primeira = credenciais[0]
              if (!primeira) {
                toast({
                  title: 'Cadastre uma credencial primeiro',
                  description: 'O anexo precisa estar ligado a uma UC.',
                  variant: 'destructive',
                })
                return
              }
              abrirAnexarConta(primeira)
            }}
            className="h-10 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            <span>Anexar conta</span>
          </Button>
          <Button
            onClick={() => setModalNovaAberto(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl h-9 px-4 flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Integrar Concessionária</span>
          </Button>
        </div>
      </div>

      {erroGlobal && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-center justify-between">
          <span>{erroGlobal}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={carregarDados}
            className="h-7 text-xs border-rose-300"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Tabela de Dados */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        {carregando && credenciais.length === 0 ? (
          <div className="p-12 text-center text-slate-500">Carregando dados da RGE...</div>
        ) : abaAtiva === 'concessionaria' ? (
          /* (3) Aba Gerenciar Concessionária */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3.5 pl-6 pr-2 w-10 text-slate-400">
                    <span className="sr-only">Ações</span>
                  </th>
                  <th
                    className="py-3.5 px-4 w-[130px] cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('concessionaria')}
                  >
                    <div className="flex items-center gap-1">
                      <span>CONCESSIONÁRIA</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 min-w-[220px] cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('usuario')}
                  >
                    <div className="flex items-center gap-1">
                      <span>NOME DE USUÁRIO</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4 w-[150px]">SENHA</th>
                  <th
                    className="py-3.5 px-4 w-[200px] cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('status')}
                  >
                    <div className="flex items-center gap-1">
                      <span>STATUS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 w-[230px] cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('unidade')}
                  >
                    <div className="flex items-center gap-1">
                      <span>UNIDADE</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 w-[160px] cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('uc')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nº DA UNIDADE CONSUMIDORA</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 w-[120px] cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('beneficiarias')}
                  >
                    <div className="flex items-center gap-1">
                      <span>BENEFICIÁRIAS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {credenciaisPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      Nenhuma credencial encontrada.
                    </td>
                  </tr>
                ) : (
                  credenciaisPaginadas.map((c) => {
                    const info = resolverInfoCredencial(c)
                    const isIntegrado = c.status === 'ok'
                    const tempoRel = formatarTempoRelativo(c.ultimo_login)

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pl-6 pr-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Ações da credencial"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                              <DropdownMenuItem onClick={() => abrirEditarCredencial(c)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => abrirAnexarConta(c)}>
                                <Upload className="w-4 h-4 mr-2" />
                                Anexar conta baixada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => abrirBeneficiarias(c)}>
                                <Users className="w-4 h-4 mr-2" />
                                Gerenciar beneficiárias
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleExcluirCredencial(c)}
                                className="text-rose-600 focus:text-rose-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        <td className="py-3 px-4 font-medium">
                          <a
                            href="https://servicosonline.cpfl.com.br/agencia-webapp/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            RGE
                          </a>
                        </td>

                        <td className="py-3 px-4 text-slate-700 truncate max-w-[220px]">
                          <span title={c.login || undefined}>{c.login || '-'}</span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 tracking-widest text-xs font-mono">
                              {senhasVisiveis[c.id] ? senhasVisiveis[c.id] : '••••••••'}
                            </span>
                            <button
                              type="button"
                              title={senhasVisiveis[c.id] ? 'Ocultar senha' : 'Mostrar senha'}
                              onClick={() => alternarSenha(c)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              {senhasVisiveis[c.id] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Alterar senha"
                              onClick={() => abrirEditarSenha(c)}
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col items-start gap-1.5">
                            {isIntegrado ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                Integrado
                              </span>
                            ) : c.status === 'erro' ? (
                              <span
                                title={c.ultimo_erro || 'Erro sem detalhe'}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700 cursor-help"
                              >
                                Erro
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
                                Novo
                              </span>
                            )}
                            {c.status === 'erro' && c.ultimo_erro && (
                              <span
                                title={c.ultimo_erro}
                                className="text-[10px] text-rose-600 leading-tight break-words cursor-help line-clamp-2"
                              >
                                {c.ultimo_erro}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400 whitespace-nowrap">
                              {tempoRel}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-[230px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              title={info.labelExibicao}
                              className="text-blue-600 font-medium hover:underline cursor-pointer truncate min-w-0"
                            >
                              {info.labelExibicao}
                            </span>
                            {info.isVinculadoCliente && (
                              <span title="Vinculado a cliente" className="flex-shrink-0">
                                <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                          {c.uc}
                        </td>

                        <td className="py-3 px-4 text-slate-600">
                          {info.qtdBeneficiarias > 0 ? (
                            <span className="text-blue-600 font-medium">
                              {info.qtdBeneficiarias}
                            </span>
                          ) : (
                            <span className="text-slate-500">Não há</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* Rodapé com paginação numerada (10 por página) */}
            <div className="flex items-center justify-center gap-1.5 py-4 border-t border-slate-100 bg-white">
              <Button
                variant="ghost"
                size="sm"
                disabled={paginaCredenciais <= 1}
                onClick={() => setPaginaCredenciais((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                aria-label="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPaginasCredenciais }).map((_, idx) => {
                const num = idx + 1
                const ativa = paginaCredenciais === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPaginaCredenciais(num)}
                    className={`h-8 w-8 rounded text-xs font-semibold transition-colors ${
                      ativa
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                disabled={paginaCredenciais >= totalPaginasCredenciais}
                onClick={() =>
                  setPaginaCredenciais((p) => Math.min(totalPaginasCredenciais, p + 1))
                }
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                aria-label="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : abaAtiva === 'faturas' ? (
          /* (4) Aba Gerenciar Faturas */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3.5 pl-6 pr-2 w-10 text-slate-400">
                    <span className="sr-only">Ações</span>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemFat('concessionaria')}
                  >
                    <div className="flex items-center gap-1">
                      <span>CONCESSIONÁRIA</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemFat('unidade')}
                  >
                    <div className="flex items-center gap-1">
                      <span>UNIDADE</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemFat('uc')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nº UNIDADE</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemFat('competencia')}
                  >
                    <div className="flex items-center gap-1">
                      <span>MÊS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <span>ALERTAS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <span>ORIGEM</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {faturasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      Nenhuma fatura encontrada. Sincronize uma credencial na aba Gerenciar
                      Concessionária.
                    </td>
                  </tr>
                ) : (
                  faturasPaginadas.map((fat) => {
                    const info = resolverInfoFatura(fat)
                    const mesFormatado = formatarCompetenciaRge(fat.competencia)
                    const origemTipo = (fat.origem || 'AUTOMÁTICO').toUpperCase()
                    const tempoRel = formatarTempoRelativo(fat.created)

                    return (
                      <tr key={fat.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 pl-6 pr-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label="Ações da fatura"
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setContaSelecionada(fat)
                                  setModalDetalhesContaAberto(true)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  if (fat.id) abrirPdfConta(fat)
                                  else
                                    toast({
                                      title: 'Conta sem PDF',
                                      description: 'Anexe o PDF desta conta para poder abrir.',
                                      variant: 'destructive',
                                    })
                                }}
                              >
                                <FileDown className="w-4 h-4 mr-2" />
                                Abrir PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>

                        <td className="py-3 px-4 font-semibold text-blue-600">
                          <a
                            href="https://servicosonline.cpfl.com.br/agencia-webapp/"
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            RGE
                          </a>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span
                                onClick={() => {
                                  setContaSelecionada(fat)
                                  setModalDetalhesContaAberto(true)
                                }}
                                className="text-blue-600 font-medium hover:underline cursor-pointer"
                              >
                                {info.unidadeNome}
                              </span>
                              {info.isVinculadoCliente && (
                                <span title="Vinculado a cliente">
                                  <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                            {info.secundario && (
                              <span className="text-[11px] text-slate-400 truncate max-w-[240px]">
                                {info.secundario}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{fat.uc}</td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <span>{mesFormatado}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setContaSelecionada(fat)
                                setModalDetalhesContaAberto(true)
                              }}
                              className="text-slate-400 hover:text-blue-600"
                              title="Ver detalhes da conta"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          {info.comErro ? (
                            <span className="text-[11px] font-bold text-rose-600 underline tracking-wide">
                              COM ERRO
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400 tracking-wide">
                              SEM ALERTA
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className="text-xs font-semibold text-slate-600 tracking-wide">
                              {origemTipo}
                            </span>
                            <span className="text-[11px] text-slate-400">{tempoRel}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>

            {/* Paginação Faturas (10 por página) */}
            <div className="flex items-center justify-center gap-1.5 py-4 border-t border-slate-100 bg-white">
              <Button
                variant="ghost"
                size="sm"
                disabled={paginaFaturas <= 1}
                onClick={() => setPaginaFaturas((p) => Math.max(1, p - 1))}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                aria-label="Página anterior faturas"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPaginasFaturas }).map((_, idx) => {
                const num = idx + 1
                const ativa = paginaFaturas === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPaginaFaturas(num)}
                    className={`h-8 w-8 rounded text-xs font-semibold transition-colors ${
                      ativa
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {num}
                  </button>
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                disabled={paginaFaturas >= totalPaginasFaturas}
                onClick={() => setPaginaFaturas((p) => Math.min(totalPaginasFaturas, p + 1))}
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
                aria-label="Próxima página faturas"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* (5) Aba Gestão de Beneficiárias */
          <BeneficiariasView
            credenciais={credenciais}
            beneficiarias={beneficiarias}
            clientesMap={clientesMap}
            usinasMap={usinasMap}
            busca={busca}
            setBusca={setBusca}
            carregando={carregando}
            onAdicionar={(cred) => {
              abrirBeneficiarias(cred)
            }}
            onEditar={(b) => {
              const credDona = credenciais.find((c) => c.id === b.credencial_id)
              if (credDona) setBenCredencial(credDona)
              editarBeneficiaria(b)
              setModalBenAberto(true)
            }}
            onRemover={(b) => {
              removerBeneficiaria(b)
            }}
            onAbrirPercentuais={(cred) => {
              abrirPercentuais(cred)
            }}
          />
        )}
      </div>

      {/* Modal: percentuais das beneficiárias (célula UNIDADE da geradora) */}
      <ModalPercentuaisBeneficiarias
        open={modalPctAberto}
        onOpenChange={setModalPctAberto}
        cred={pctCred}
        nomeGeradora={
          pctCred
            ? pctCred.expand?.usina_id?.nome ||
              usinasMap[pctCred.usina_id || '']?.nome ||
              pctCred.rotulo ||
              `UC ${pctCred.uc}`
            : ''
        }
        beneficiarias={pctBeneficiarias}
        historico={pctHistorico}
        sugestoes={pctSugestoes}
        salvando={pctSalvando}
        onSalvar={handleSalvarPercentuais}
      />

      {/* Modal: Integrar Concessionária */}
      <Dialog open={modalNovaAberto} onOpenChange={setModalNovaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Integrar Concessionária RGE</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarNova} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Número da Unidade Consumidora (UC) *
              </label>
              <Input
                value={formUc}
                onChange={(e) => setFormUc(e.target.value)}
                placeholder="Ex.: 20041900119"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Nome da Unidade / Apelido
              </label>
              <Input
                value={formRotulo}
                onChange={(e) => setFormRotulo(e.target.value)}
                placeholder="Ex.: Carlos Ortiz"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">CPF/CNPJ do Titular</label>
              <Input
                value={formDoc}
                onChange={(e) => setFormDoc(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">E-mail de Login</label>
                <Input
                  value={formLogin}
                  onChange={(e) => setFormLogin(e.target.value)}
                  placeholder="usuario@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Senha do Portal</label>
                <Input
                  type="password"
                  value={formSenha}
                  onChange={(e) => setFormSenha(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovaAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Credencial'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Atualizar Token da Credencial */}
      <Dialog open={modalEditarTokenAberto} onOpenChange={setModalEditarTokenAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atualizar Token da UC {credencialEmEdicao?.uc}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarToken} className="space-y-4 pt-2">
            {credencialEmEdicao?.ultimo_erro && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                <strong>Último erro:</strong> {credencialEmEdicao.ultimo_erro}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Token Bearer Atualizado
              </label>
              <textarea
                value={formTokenEditar}
                onChange={(e) => setFormTokenEditar(e.target.value)}
                rows={4}
                placeholder="Cole aqui o token do portal CPFL..."
                className="w-full text-xs font-mono p-2 border rounded-md border-slate-200"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEditarTokenAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Atualizar e Promover'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Alterar Senha */}
      <Dialog open={modalSenhaAberto} onOpenChange={setModalSenhaAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar senha do portal</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarSenha} className="space-y-4 pt-2">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
              <div>
                <strong>UC:</strong> {senhaCredencial?.uc}
              </div>
              <div>
                <strong>Login:</strong> {senhaCredencial?.login || '-'}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Nova senha</label>
              <Input
                type="text"
                value={novaSenhaEdit}
                onChange={(e) => setNovaSenhaEdit(e.target.value)}
                placeholder="Digite a senha do portal da RGE"
                autoFocus
                required
              />
            </div>
            <p className="text-[11px] text-slate-400">
              A senha fica guardada no CRM e é usada só pelo robô. Ao salvar, o status volta para
              «novo» e o robô busca as contas na próxima rodada.
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalSenhaAberto(false)}
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Beneficiárias da credencial */}
      <Dialog open={modalBenAberto} onOpenChange={setModalBenAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Beneficiárias — UC {benCredencial?.uc}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <form onSubmit={handleSalvarBeneficiaria} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nº da UC *</label>
                  <Input
                    value={fBenUc}
                    onChange={(e) => setFBenUc(e.target.value)}
                    placeholder="Ex.: 94509700157"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Nome / Apelido</label>
                  <Input
                    value={fBenRotulo}
                    onChange={(e) => setFBenRotulo(e.target.value)}
                    placeholder="Ex.: Flavio Tirello — Av Tiradentes"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Distribuição (%)</label>
                  <Input
                    value={fBenPercentual}
                    onChange={(e) => setFBenPercentual(e.target.value)}
                    placeholder="Ex.: 15"
                    inputMode="decimal"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Observação</label>
                <Input
                  value={fBenObs}
                  onChange={(e) => setFBenObs(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={salvandoBen}
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  {benEmEdicao ? 'Salvar alterações' : 'Adicionar beneficiária'}
                </Button>
                {benEmEdicao && (
                  <Button type="button" variant="outline" onClick={limparFormBen}>
                    Cancelar edição
                  </Button>
                )}
                <span className="text-[11px] text-slate-400 ml-auto">
                  O robô usa o mesmo login desta UC para baixar a conta de cada beneficiária.
                </span>
              </div>
            </form>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/60 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-3">Unidade</th>
                    <th className="py-2 px-3">Nº da UC</th>
                    <th className="py-2 px-3">Distribuição</th>
                    <th className="py-2 px-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {beneficiarias.filter((b) => b.credencial_id === benCredencial?.id).length ===
                  0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-500 text-xs">
                        Nenhuma beneficiária cadastrada para esta UC.
                      </td>
                    </tr>
                  ) : (
                    beneficiarias
                      .filter((b) => b.credencial_id === benCredencial?.id)
                      .map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3">{resolverRotuloBen(b)}</td>
                          <td className="py-2 px-3 font-mono text-xs">{b.uc}</td>
                          <td className="py-2 px-3 font-semibold text-blue-600">
                            {b.percentual != null ? `${b.percentual}%` : '—'}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => editarBeneficiaria(b)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removerBeneficiaria(b)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600"
                                title="Remover"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setModalBenAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalhes da Conta */}
      <Dialog open={modalDetalhesContaAberto} onOpenChange={setModalDetalhesContaAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Detalhes da Fatura RGE
            </DialogTitle>
          </DialogHeader>
          {contaSelecionada && (
            <div className="space-y-3 text-sm pt-2">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">UC</span>
                  <div className="font-mono font-medium">{contaSelecionada.uc}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    Competência
                  </span>
                  <div className="font-medium">
                    {formatarCompetenciaRge(contaSelecionada.competencia)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Consumo</span>
                  <div className="font-medium">
                    {contaSelecionada.consumo_kwh !== undefined
                      ? `${contaSelecionada.consumo_kwh} kWh`
                      : '-'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Arquivo</span>
                  <div className="truncate text-xs font-mono">
                    {contaSelecionada.nome_arquivo || '-'}
                  </div>
                </div>
              </div>

              {contaSelecionada.dados && (
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Dados Brutos da Sincronização
                  </span>
                  <pre className="mt-1 p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono max-h-48 overflow-auto">
                    {JSON.stringify(contaSelecionada.dados, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setModalDetalhesContaAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- Editar credencial ---------- */}
      <Dialog open={modalEditarCredAberto} onOpenChange={setModalEditarCredAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-slate-600" />
              Editar credencial
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarEdicao} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Número da UC *</label>
              <Input
                value={edUc}
                onChange={(e) => setEdUc(e.target.value)}
                placeholder="20041900119"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Nome / Apelido</label>
              <Input
                value={edRotulo}
                onChange={(e) => setEdRotulo(e.target.value)}
                placeholder="Ex.: Delfos matriz"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">CPF/CNPJ do Titular</label>
              <Input
                value={edDoc}
                onChange={(e) => setEdDoc(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">E-mail de Login</label>
                <Input
                  value={edLogin}
                  onChange={(e) => setEdLogin(e.target.value)}
                  placeholder="usuario@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Senha</label>
                <Input
                  type="password"
                  value={edSenha}
                  onChange={(e) => setEdSenha(e.target.value)}
                  placeholder="deixe em branco p/ manter"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
              <input
                type="checkbox"
                checked={edAtivo}
                onChange={(e) => setEdAtivo(e.target.checked)}
                className="rounded border-slate-300"
              />
              Credencial ativa
            </label>
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
              A senha fica guardada no CRM e só é usada pelo robô que roda no PC da Delfos. Deixar
              em branco mantém a senha atual.
            </p>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEditarCredAberto(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Anexar conta baixada na mão ---------- */}
      <Dialog open={modalAnexarAberto} onOpenChange={setModalAnexarAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-slate-600" />
              Anexar conta baixada
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAnexarConta} className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">UC</label>
              <Input
                value={anUc}
                onChange={(e) => setAnUc(e.target.value)}
                placeholder="20041900119"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Mês de referência *</label>
              <Input
                value={anCompetencia}
                onChange={(e) => setAnCompetencia(e.target.value)}
                placeholder="2026-out"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Formato: AAAA-mmm (ex.: 2026-out, 2026-set)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600">Valor (R$)</label>
                <Input
                  value={anValor}
                  onChange={(e) => setAnValor(e.target.value)}
                  placeholder="617,44"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Vencimento</label>
                <Input
                  value={anVencimento}
                  onChange={(e) => setAnVencimento(e.target.value)}
                  placeholder="21/10/2026"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Arquivo PDF *</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setAnArquivo(e.target.files?.[0] || null)}
                className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              {anArquivo && (
                <p className="text-[11px] text-slate-500 mt-1">
                  {anArquivo.name} · {(anArquivo.size / 1024).toFixed(0)} KB
                </p>
              )}
            </div>
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded p-2">
              Se já existir uma conta desta UC neste mês, ela é substituída. Assim fica uma conta
              por mês em cada UC.
            </p>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalAnexarAberto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={anEnviando}>
                {anEnviando ? 'Enviando...' : 'Anexar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ---------- Contas da UC ---------- */}
      <Dialog open={modalContasUcAberto} onOpenChange={setModalContasUcAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-600" />
              Contas de {tituloContasUc}
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 max-h-[60vh] overflow-auto">
            {carregandoContasUc ? (
              <p className="text-sm text-slate-500 py-8 text-center">Carregando...</p>
            ) : contasDaUc.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center">
                Nenhuma conta guardada para esta UC ainda.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-200">
                    <th className="py-2 font-semibold">Mês</th>
                    <th className="py-2 font-semibold">Valor</th>
                    <th className="py-2 font-semibold">Vencimento</th>
                    <th className="py-2 font-semibold">Origem</th>
                    <th className="py-2 font-semibold text-right">PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {contasDaUc.map((ct) => (
                    <tr key={ct.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="py-2 font-medium">{formatarCompetenciaRge(ct.competencia)}</td>
                      <td className="py-2">
                        {ct.valor !== undefined && ct.valor !== null
                          ? `R$ ${Number(ct.valor).toFixed(2).replace('.', ',')}`
                          : '-'}
                      </td>
                      <td className="py-2">{ct.vencimento || '-'}</td>
                      <td className="py-2">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {ct.origem || '-'}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        {ct.tem_pdf ? (
                          <Button size="sm" variant="outline" onClick={() => abrirPdfConta(ct)}>
                            <FileDown className="w-3.5 h-3.5 mr-1" />
                            Abrir
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">sem PDF</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setModalContasUcAberto(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IntegracoesRgePage

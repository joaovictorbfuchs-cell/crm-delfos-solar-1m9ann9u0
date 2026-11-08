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
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Info,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatarTempoRelativo, formatarCompetenciaRge } from '@/lib/rgeFormatters'

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
    usina_id?: { id: string; nome: string; endereco?: string; beneficiarias?: unknown }
  }
}

export interface ContaRge {
  id: string
  uc: string
  competencia: string
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
  const [abaAtiva, setAbaAtiva] = useState<'concessionaria' | 'faturas'>('concessionaria')
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
  const [formToken, setFormToken] = useState('')
  const [salvando, setSalvando] = useState(false)

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
        chamar<{ ok: boolean; itens: ContaRge[] }>('/rge/contas').catch((err) => {
          console.warn('Erro ao carregar contas rge:', err)
          return { ok: true, itens: [] }
        }),
      ])

      if (rCred && rCred.itens) {
        setCredenciais(rCred.itens)
      }
      if (rCont && rCont.itens) {
        setContas(rCont.itens)
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
          token: formToken,
        }),
      })
      toast({ title: 'Credencial cadastrada!' })
      setModalNovaAberto(false)
      setFormUc('')
      setFormRotulo('')
      setFormDoc('')
      setFormLogin('')
      setFormSenha('')
      setFormToken('')
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
          token: formToken,
          status: 'ok',
          ultimo_erro: '',
        }),
      })
      toast({ title: 'Token atualizado com sucesso!' })
      setModalEditarTokenAberto(false)
      setCredencialEmEdicao(null)
      setFormToken('')
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
      let unidadeNome = ''
      let endereco = ''

      if (fat.expand?.usina_id?.nome) {
        unidadeNome = fat.expand.usina_id.nome
        endereco = fat.expand.usina_id.endereco || ''
      } else if (fat.usina_id && usinasMap[fat.usina_id]) {
        unidadeNome = usinasMap[fat.usina_id].nome
        endereco = usinasMap[fat.usina_id].endereco || ''
      }

      if (!unidadeNome) {
        if (fat.expand?.cliente_id?.nome) {
          unidadeNome = fat.expand.cliente_id.nome
        } else if (fat.cliente_id && clientesMap[fat.cliente_id]) {
          unidadeNome = clientesMap[fat.cliente_id].nome
        }
      }

      const cred = fat.credencial_id
        ? credenciais.find((k) => k.id === fat.credencial_id)
        : credenciais.find((k) => k.uc === fat.uc)

      const comErro =
        cred?.status === 'erro' ||
        cred?.status === 'expirado' ||
        Boolean(cred?.ultimo_erro) ||
        fat.nome_arquivo === 'erro'

      const label = endereco || unidadeNome || `UC ${fat.uc}`
      return {
        unidadeNome: label,
        comErro,
        cred,
      }
    },
    [clientesMap, usinasMap, credenciais],
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
            onClick={() => setModalNovaAberto(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg h-10 px-4 flex items-center gap-1.5 shadow-sm whitespace-nowrap"
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
                  <th className="py-3.5 pl-6 pr-2 w-10 text-slate-400">
                    <span className="sr-only">Ações</span>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('concessionaria')}
                  >
                    <div className="flex items-center gap-1">
                      <span>CONCESSIONÁRIA</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('usuario')}
                  >
                    <div className="flex items-center gap-1">
                      <span>NOME DE USUÁRIO</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">SENHA</th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('status')}
                  >
                    <div className="flex items-center gap-1">
                      <span>STATUS</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('unidade')}
                  >
                    <div className="flex items-center gap-1">
                      <span>UNIDADE</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
                    onClick={() => alternarOrdemCred('uc')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Nº DA UNIDADE CONSUMIDORA</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th
                    className="py-3.5 px-4 cursor-pointer hover:text-slate-800"
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
                            <DropdownMenuContent align="start" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setCredencialEmEdicao(c)
                                  setFormToken(c.token || '')
                                  setModalEditarTokenAberto(true)
                                }}
                              >
                                <Key className="w-4 h-4 mr-2" />
                                Colar Token
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleSincronizar(c)}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Sincronizar Agora
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBaixarConta(c)}>
                                <FileDown className="w-4 h-4 mr-2" />
                                Baixar Última Conta
                              </DropdownMenuItem>
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

                        <td className="py-3 px-4 text-slate-700">{c.login || '-'}</td>

                        <td className="py-3 px-4 text-slate-400 tracking-widest text-xs font-mono">
                          ••••••••
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-col items-start gap-0.5">
                            {isIntegrado ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                Integrado
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setCredencialEmEdicao(c)
                                  setFormToken(c.token || '')
                                  setModalEditarTokenAberto(true)
                                }}
                                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                Promover
                              </button>
                            )}
                            <span className="text-[11px] text-slate-400">{tempoRel}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-blue-600 font-medium hover:underline cursor-pointer">
                              {info.labelExibicao}
                            </span>
                            {info.isVinculadoCliente && (
                              <span title="Vinculado a cliente">
                                <Award className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{c.uc}</td>

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
        ) : (
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
                      <span>Nº DA UNIDADE CONSUMIDORA</span>
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
                            <DropdownMenuContent align="start" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  setContaSelecionada(fat)
                                  setModalDetalhesContaAberto(true)
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </DropdownMenuItem>
                              {info.cred && (
                                <DropdownMenuItem onClick={() => handleBaixarConta(info.cred!)}>
                                  <FileDown className="w-4 h-4 mr-2" />
                                  Baixar PDF
                                </DropdownMenuItem>
                              )}
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
                          <span
                            onClick={() => {
                              setContaSelecionada(fat)
                              setModalDetalhesContaAberto(true)
                            }}
                            className="text-blue-600 font-medium hover:underline cursor-pointer"
                          >
                            {info.unidadeNome}
                          </span>
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
        )}
      </div>

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
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Token Bearer (Agência Web CPFL)
              </label>
              <textarea
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
                rows={3}
                placeholder="Cole o token do portal se já tiver copiado do DevTools..."
                className="w-full text-xs font-mono p-2 border rounded-md border-slate-200"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                O token é gerado ao logar em{' '}
                <a
                  href="https://servicosonline.cpfl.com.br/agencia-webapp/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  servicosonline.cpfl.com.br <ExternalLink className="w-3 h-3" />
                </a>
              </p>
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
                value={formToken}
                onChange={(e) => setFormToken(e.target.value)}
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
    </div>
  )
}

export default IntegracoesRgePage

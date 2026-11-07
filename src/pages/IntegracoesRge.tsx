import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Plug,
  Plus,
  RefreshCw,
  Download,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Server,
  Info,
} from 'lucide-react'
import pb from '@/lib/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Integração RGE / CPFL — contas de energia dentro do CRM.
 *
 * Fluxo real (validado em 07/11/2026):
 *  - A conta do portal vive no Azure AD B2C (o login por e-mail+senha da API
 *    responde LOG008). O token só nasce de um navegador.
 *  - Com o token, o backend baixa o consumo (13 meses) e o PDF da conta.
 *
 * Por isso esta tela trabalha em dois passos: cadastrar a credencial e colar
 * o token (1 clique no navegador). Depois o botão "Sincronizar" e o botão
 * "Baixar conta" funcionam sozinhos.
 */

interface Credencial {
  id: string
  uc: string
  rotulo?: string
  documento?: string
  login?: string
  tem_senha?: boolean
  tem_token?: boolean
  modo_auth?: string
  status?: string
  ultimo_login?: string
  ultimo_erro?: string
  ativo?: boolean
}

interface ContaRge {
  id: string
  uc: string
  competencia?: string
  consumo_kwh?: number
  nome_arquivo?: string
  created?: string
}

function cabecalhoAutorizacao() {
  const token = pb.authStore?.token || ''
  return token ? { Authorization: token } : {}
}

async function chamar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const base = pb.baseUrl || ''
  const resp = await fetch(base + '/backend/v1' + caminho, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...cabecalhoAutorizacao(),
      ...(opcoes.headers || {}),
    },
  })
  const texto = await resp.text()
  let dados: any = null
  try {
    dados = texto ? JSON.parse(texto) : null
  } catch {
    dados = { ok: false, error: texto.slice(0, 300) }
  }
  if (!resp.ok) {
    throw new Error(dados?.error || dados?.message || `HTTP ${resp.status}`)
  }
  return dados as T
}

function base64ParaBlob(base64: string, tipo: string) {
  const bin = window.atob(base64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}

const STATUS_INFO: Record<string, { rotulo: string; classe: string }> = {
  ok: { rotulo: 'Conectado', classe: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  novo: { rotulo: 'Sem token', classe: 'bg-amber-50 text-amber-900 border-amber-300' },
  erro: { rotulo: 'Falha', classe: 'bg-red-50 text-red-800 border-red-200' },
  expirado: { rotulo: 'Token expirado', classe: 'bg-amber-50 text-amber-900 border-amber-300' },
}

export function IntegracoesRgePage() {
  const [credenciais, setCredenciais] = useState<Credencial[]>([])
  const [contas, setContas] = useState<ContaRge[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [ocupado, setOcupado] = useState<string>('')

  const [modalAberto, setModalAberto] = useState(false)
  const [editando, setEditando] = useState<Credencial | null>(null)
  const [form, setForm] = useState({
    uc: '',
    login: '',
    senha: '',
    documento: '',
    rotulo: '',
    token: '',
  })
  const [salvando, setSalvando] = useState(false)

  const [credSelecionada, setCredSelecionada] = useState<string>('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const r = await chamar<{ ok: boolean; itens: Credencial[] }>('/rge/credenciais')
      setCredenciais(r.itens || [])
      if (!credSelecionada && r.itens?.length) setCredSelecionada(r.itens[0].id)
      const c = await chamar<{ ok: boolean; itens: ContaRge[] }>('/rge/contas')
      setContas(c.itens || [])
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar a integração')
    } finally {
      setCarregando(false)
    }
  }, [credSelecionada])

  useEffect(() => {
    void carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const contasFiltradas = useMemo(() => {
    const cred = credenciais.find((c) => c.id === credSelecionada)
    if (!cred) return contas
    return contas.filter((c) => c.uc === cred.uc)
  }, [contas, credenciais, credSelecionada])

  function abrirNovo() {
    setEditando(null)
    setForm({ uc: '', login: '', senha: '', documento: '', rotulo: '', token: '' })
    setModalAberto(true)
  }

  function abrirEdicao(cred: Credencial) {
    setEditando(cred)
    setForm({
      uc: cred.uc,
      login: cred.login || '',
      senha: '',
      documento: cred.documento || '',
      rotulo: cred.rotulo || '',
      token: '',
    })
    setModalAberto(true)
  }

  async function salvarCredencial() {
    setSalvando(true)
    setErro('')
    try {
      await chamar('/rge/credenciais', {
        method: 'POST',
        body: JSON.stringify({
          id: editando?.id,
          uc: form.uc,
          login: form.login,
          senha: form.senha || undefined,
          documento: form.documento,
          rotulo: form.rotulo,
          token: form.token || undefined,
        }),
      })
      setModalAberto(false)
      setAviso('Credencial salva.')
      await carregar()
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function sincronizar(cred: Credencial) {
    setOcupado(cred.id)
    setErro('')
    setAviso('')
    try {
      const r = await chamar<any>('/rge/sincronizar', {
        method: 'POST',
        body: JSON.stringify({ credencial_id: cred.id }),
      })
      if (!r.ok) {
        setAviso(r.precisa_token ? r.error : r.error || 'Sincronização não concluiu')
      } else {
        setAviso(
          `UC ${r.uc}: ${r.pontos} leituras de consumo baixadas (${r.competencia || 'sem competência'}).`,
        )
      }
      await carregar()
    } catch (e: any) {
      setErro(e?.message || 'Falha ao sincronizar')
    } finally {
      setOcupado('')
    }
  }

  async function baixarConta(cred: Credencial) {
    setOcupado('pdf-' + cred.id)
    setErro('')
    try {
      const r = await chamar<any>(`/rge/conta-pdf?credencial_id=${encodeURIComponent(cred.id)}`)
      if (!r.ok) {
        setAviso(r.error || 'Não foi possível baixar a conta')
        return
      }
      const blob = base64ParaBlob(r.base64, 'application/pdf')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = r.nome_arquivo || `conta-${cred.uc}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (e: any) {
      setErro(e?.message || 'Falha ao baixar a conta')
    } finally {
      setOcupado('')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white flex items-center justify-center shadow-xs">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Contas de Energia — RGE / CPFL
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-blue-50 text-blue-800 border-blue-200"
              >
                Portal da distribuidora
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Baixe a conta em PDF e o histórico de consumo direto do portal da CPFL
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void carregar()} disabled={carregando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button onClick={abrirNovo}>
            <Plus className="w-4 h-4 mr-2" />
            Nova credencial
          </Button>
        </div>
      </div>

      <div className="bg-blue-50/60 border border-blue-200/70 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-xs text-gray-700 leading-relaxed space-y-1">
          <p className="font-bold text-gray-900 text-sm">Como funciona</p>
          <p>
            A CPFL exige um <strong>token de sessão</strong> que só nasce de um navegador (a conta
            fica no login novo da CPFL, que não aceita e-mail e senha por conexão direta). Então: o
            token é gerado no portal, uma vez, e colado aqui na credencial. Depois disso,
            sincronizar e baixar a conta funcionam sozinhos — até o token expirar.
          </p>
        </div>
      </div>

      {erro && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">{erro}</p>
        </div>
      )}
      {aviso && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900">{aviso}</p>
        </div>
      )}

      <Card className="border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-gray-500" />
            Credenciais cadastradas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {carregando ? (
            <div className="p-8 flex items-center justify-center text-gray-500 text-sm gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
            </div>
          ) : credenciais.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <Plug className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-600">Nenhuma credencial cadastrada ainda.</p>
              <Button variant="outline" onClick={abrirNovo}>
                <Plus className="w-4 h-4 mr-2" /> Cadastrar a primeira
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">UC</TableHead>
                  <TableHead className="text-xs">Login</TableHead>
                  <TableHead className="text-xs">Token</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credenciais.map((cred) => {
                  const info = STATUS_INFO[cred.status || 'novo'] || STATUS_INFO.novo
                  const baixando = ocupado === 'pdf-' + cred.id
                  const sincronizando = ocupado === cred.id
                  return (
                    <TableRow key={cred.id}>
                      <TableCell className="text-xs font-semibold text-gray-900">
                        {cred.uc}
                        {cred.rotulo ? (
                          <span className="block text-[11px] font-normal text-gray-500">
                            {cred.rotulo}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs text-gray-600">
                        {cred.login || '—'}
                        {cred.tem_senha ? (
                          <span className="block text-[11px] text-gray-400">senha guardada</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-xs">
                        {cred.tem_token ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> ativo
                          </span>
                        ) : (
                          <span className="text-amber-700">nenhum</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] font-bold ${info.classe}`}>
                          {info.rotulo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void sincronizar(cred)}
                            disabled={sincronizando || baixando}
                          >
                            {sincronizando ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Sincronizar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => void baixarConta(cred)}
                            disabled={baixando || sincronizando}
                          >
                            {baixando ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Baixar conta
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirEdicao(cred)}
                            title="Editar / colar token"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="p-5 pb-3 flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-gray-900">Contas já baixadas</CardTitle>
          {credenciais.length > 0 && (
            <select
              className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white"
              value={credSelecionada}
              onChange={(ev) => setCredSelecionada(ev.target.value)}
            >
              <option value="">Todas as UCs</option>
              {credenciais.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.uc} {c.rotulo ? `— ${c.rotulo}` : ''}
                </option>
              ))}
            </select>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {contasFiltradas.length === 0 ? (
            <p className="p-6 text-xs text-gray-500 text-center">
              Nenhuma conta sincronizada ainda. Use “Sincronizar” na credencial acima.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">UC</TableHead>
                  <TableHead className="text-xs">Competência</TableHead>
                  <TableHead className="text-xs">Consumo</TableHead>
                  <TableHead className="text-xs">Sincronizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasFiltradas.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-semibold">{c.uc}</TableCell>
                    <TableCell className="text-xs">{c.competencia || '—'}</TableCell>
                    <TableCell className="text-xs">
                      {c.consumo_kwh != null ? `${c.consumo_kwh} kWh` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {c.created ? new Date(c.created).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar credencial' : 'Nova credencial'}</DialogTitle>
            <DialogDescription>
              Informe a UC e o login do portal. A senha fica guardada no servidor e nunca volta para
              a tela.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="uc" className="text-xs font-semibold">
                Número da UC *
              </Label>
              <Input
                id="uc"
                placeholder="200.419.001-19"
                value={form.uc}
                onChange={(ev) => setForm({ ...form, uc: ev.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="login" className="text-xs font-semibold">
                E-mail do portal
              </Label>
              <Input
                id="login"
                type="email"
                placeholder="cliente@email.com"
                value={form.login}
                onChange={(ev) => setForm({ ...form, login: ev.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha" className="text-xs font-semibold">
                Senha {editando ? '(deixe vazio para manter)' : ''}
              </Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={form.senha}
                onChange={(ev) => setForm({ ...form, senha: ev.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="documento" className="text-xs font-semibold">
                  CPF/CNPJ do titular
                </Label>
                <Input
                  id="documento"
                  placeholder="21.379.952/0001-38"
                  value={form.documento}
                  onChange={(ev) => setForm({ ...form, documento: ev.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rotulo" className="text-xs font-semibold">
                  Apelido
                </Label>
                <Input
                  id="rotulo"
                  placeholder="Usina principal"
                  value={form.rotulo}
                  onChange={(ev) => setForm({ ...form, rotulo: ev.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-xs font-semibold">
                Token do portal {editando?.tem_token ? '(já existe — cole para substituir)' : ''}
              </Label>
              <Input
                id="token"
                placeholder="Cole aqui o token gerado no navegador"
                value={form.token}
                onChange={(ev) => setForm({ ...form, token: ev.target.value })}
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 leading-relaxed">
              <strong>Por que o token:</strong> a CPFL guarda a conta no login novo (Azure B2C) e
              não aceita e-mail e senha por conexão direta — testado, responde “LOG008”. O token é
              gerado no portal, uma vez, e dura algumas horas. Com ele, sincronizar e baixar a conta
              funcionam sozinhos.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={() => void salvarCredencial()} disabled={salvando || !form.uc}>
              {salvando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IntegracoesRgePage

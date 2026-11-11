import React, { useEffect, useMemo, useState } from 'react'
import { Sun, Home, Search, Plus, MoreVertical, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Credencial, Beneficiaria } from '@/pages/IntegracoesRge'

export interface InfoClienteUsina {
  nome: string
  endereco?: string
}

interface BeneficiariasViewProps {
  credenciais: Credencial[]
  beneficiarias: Beneficiaria[]
  clientesMap: Record<string, InfoClienteUsina>
  usinasMap: Record<string, { nome: string; endereco?: string; cliente_id?: string }>
  busca: string
  setBusca: (v: string) => void
  carregando: boolean
  onAdicionar: (cred: Credencial) => void
  onEditar: (b: Beneficiaria) => void
  onRemover: (b: Beneficiaria) => void
  onAbrirPercentuais?: (cred: Credencial) => void
}

export interface GrupoBeneficiarias {
  cred: Credencial
  nomeCliente: string
  subtituloCliente: string
  ucGeradora: string
  percentualGeradora: number | null
  comErro: boolean
  beneficiarias: Beneficiaria[]
}

// Rótulo de uma beneficiária no layout "Cliente - endereço/apelido"
export function rotuloBeneficiaria(
  b: Beneficiaria,
  clientesMap: Record<string, InfoClienteUsina>,
  usinasMap: Record<string, { nome: string; endereco?: string; cliente_id?: string }>,
): string {
  let nomeCliente = ''
  let secundario = ''

  if (b.cliente_id && clientesMap[b.cliente_id]) nomeCliente = clientesMap[b.cliente_id].nome
  if (b.rotulo) secundario = b.rotulo
  if (!secundario && b.usina_id && usinasMap[b.usina_id]) {
    secundario = usinasMap[b.usina_id].endereco || usinasMap[b.usina_id].nome
  }
  // Se o rótulo da beneficiária já inclui hífen e parece composto (ex: "Carlos Ortiz - Filial Centro" ou "Filial Desvinculada")
  if (secundario && (!nomeCliente || secundario.includes(nomeCliente))) {
    return secundario
  }
  if (!nomeCliente && !secundario) return `UC ${b.uc}`
  if (!nomeCliente) return secundario
  if (!secundario) return nomeCliente
  return `${nomeCliente} - ${secundario}`
}

// Agrupa beneficiárias pela credencial (unidade geradora) e resolve o cliente
export function agruparBeneficiarias(
  credenciais: Credencial[],
  beneficiarias: Beneficiaria[],
  clientesMap: Record<string, InfoClienteUsina>,
  usinasMap: Record<string, { nome: string; endereco?: string; cliente_id?: string }>,
): GrupoBeneficiarias[] {
  return credenciais.map((cred) => {
    let nomeCliente = ''
    if (cred.expand?.cliente_id?.nome) {
      nomeCliente = cred.expand.cliente_id.nome
    } else if (cred.cliente_id && clientesMap[cred.cliente_id]) {
      nomeCliente = clientesMap[cred.cliente_id].nome
    } else if (cred.usina_id && usinasMap[cred.usina_id]?.cliente_id) {
      const cliId = usinasMap[cred.usina_id].cliente_id as string
      if (clientesMap[cliId]) nomeCliente = clientesMap[cliId].nome
    }

    let subtituloCliente = ''
    if (cred.expand?.usina_id) {
      subtituloCliente = cred.expand.usina_id.endereco || cred.expand.usina_id.nome
    } else if (cred.usina_id && usinasMap[cred.usina_id]) {
      subtituloCliente = usinasMap[cred.usina_id].endereco || usinasMap[cred.usina_id].nome
    }
    if (!subtituloCliente && nomeCliente) subtituloCliente = nomeCliente

    const bens = beneficiarias.filter((b) => b.credencial_id === cred.id && b.ativo !== false)

    const pctCred = (cred as { percentual?: unknown }).percentual
    const percentualGeradora = typeof pctCred === 'number' && !isNaN(pctCred) ? pctCred : null

    const comErro =
      cred.status === 'erro' || cred.status === 'expirado' || Boolean(cred.ultimo_erro)

    return {
      cred,
      nomeCliente: nomeCliente || cred.rotulo || `UC ${cred.uc}`,
      subtituloCliente,
      ucGeradora: cred.uc,
      percentualGeradora,
      comErro,
      beneficiarias: bens,
    }
  })
}

// Paginação numerada com elipses: 1 2 … 38 39 40 … 78
export function gerarPaginasVisiveis(pagina: number, total: number): Array<number | 'ellipsis'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const set = new Set<number>([1, 2, total - 1, total, pagina - 1, pagina, pagina + 1])
  const nums = [...set].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)
  const out: Array<number | 'ellipsis'> = []
  let prev = 0
  for (const n of nums) {
    if (n - prev > 1) out.push('ellipsis')
    out.push(n)
    prev = n
  }
  if (total - prev > 0 && out[out.length - 1] !== total) {
    if (total - prev > 1) out.push('ellipsis')
    out.push(total)
  }
  return out
}

function CelulaPercentual({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-slate-400">—</span>
  const laranja = pct >= 0 && pct <= 10
  return (
    <span
      className={`font-semibold ${laranja ? 'text-amber-600' : 'text-slate-700'}`}
      data-percentual={pct}
    >
      {pct}%
    </span>
  )
}

function CelulaAlertas({ comErro }: { comErro: boolean }) {
  return comErro ? (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 underline tracking-wide cursor-help"
      title="Esta unidade apresentou erro na última sincronização"
      data-testid="alerta-com-erro"
    >
      <AlertTriangle className="w-3 h-3" />
      COM ERRO
    </span>
  ) : (
    <span className="text-[11px] font-medium text-slate-400 tracking-wide">SEM ALERTA</span>
  )
}

export function BeneficiariasView({
  credenciais,
  beneficiarias,
  clientesMap,
  usinasMap,
  busca,
  setBusca,
  carregando,
  onAdicionar,
  onEditar,
  onRemover,
  onAbrirPercentuais,
}: BeneficiariasViewProps) {
  const [subAba, setSubAba] = useState<'gestao' | 'desvinculadas'>('gestao')
  const [pagina, setPagina] = useState(1)
  const ITENS_POR_PAGINA = 10

  useEffect(() => {
    setPagina(1)
  }, [busca, subAba])

  const gruposGestao = useMemo(
    () => agruparBeneficiarias(credenciais, beneficiarias, clientesMap, usinasMap),
    [credenciais, beneficiarias, clientesMap, usinasMap],
  )

  const gruposDesvinculadas = useMemo(
    () =>
      gruposGestao
        .filter((g) => {
          const temCliente = Boolean(
            g.cred.expand?.cliente_id?.nome ||
            (g.cred.cliente_id && clientesMap[g.cred.cliente_id]) ||
            (g.cred.usina_id && usinasMap[g.cred.usina_id]?.cliente_id),
          )
          return !temCliente
        })
        .map((g) => ({
          ...g,
          // Para desvinculadas, se não houver cliente na credencial, usa o rótulo da primeira beneficiária
          nomeCliente:
            g.beneficiarias.length > 0
              ? rotuloBeneficiaria(g.beneficiarias[0], clientesMap, usinasMap)
              : g.nomeCliente,
        })),
    [gruposGestao, clientesMap, usinasMap],
  )

  const gruposBase = subAba === 'gestao' ? gruposGestao : gruposDesvinculadas

  const gruposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return gruposBase
    return gruposBase.filter((g) => {
      if (g.nomeCliente.toLowerCase().includes(q)) return true
      if (g.ucGeradora.toLowerCase().includes(q)) return true
      if (g.subtituloCliente.toLowerCase().includes(q)) return true
      return g.beneficiarias.some(
        (b) =>
          b.uc.toLowerCase().includes(q) ||
          rotuloBeneficiaria(b, clientesMap, usinasMap).toLowerCase().includes(q),
      )
    })
  }, [gruposBase, busca, clientesMap, usinasMap])

  const totalPaginas = Math.max(1, Math.ceil(gruposFiltrados.length / ITENS_POR_PAGINA))
  const gruposPaginados = useMemo(() => {
    const inicio = (pagina - 1) * ITENS_POR_PAGINA
    return gruposFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA)
  }, [gruposFiltrados, pagina])

  const primeiroItem = gruposFiltrados.length === 0 ? 0 : (pagina - 1) * ITENS_POR_PAGINA + 1
  const ultimoItem = Math.min(pagina * ITENS_POR_PAGINA, gruposFiltrados.length)

  return (
    <div>
      {/* Cabeçalho da área de Beneficiárias */}
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Beneficiárias</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Confira as suas unidades geradoras e beneficiárias.
        </p>
      </div>

      {/* Sub-abas */}
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 pt-1">
        <button
          type="button"
          onClick={() => setSubAba('gestao')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            subAba === 'gestao'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          Gestão de Beneficiárias
        </button>
        <button
          type="button"
          onClick={() => setSubAba('desvinculadas')}
          className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
            subAba === 'desvinculadas'
              ? 'text-blue-600 border-blue-600'
              : 'text-slate-500 border-transparent hover:text-slate-800'
          }`}
        >
          UC Beneficiárias desvinculadas
        </button>
      </div>

      {/* Busca */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Filtre pelo nome da unidade..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-white border-slate-200 rounded-lg h-9 text-sm"
          />
        </div>
      </div>

      {/* Tabela agrupada */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider select-none">
              <th className="py-3.5 pl-6 pr-2 w-10 text-slate-400">
                <span className="sr-only">Ações</span>
              </th>
              <th className="py-3.5 px-4">UNIDADE</th>
              <th className="py-3.5 px-4">Nº DA UC</th>
              <th className="py-3.5 px-4">DISTRIBUIÇÃO</th>
              <th className="py-3.5 px-4">ALERTAS</th>
              <th className="py-3.5 px-4">CONCESSIONÁRIA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {carregando && gruposFiltrados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Carregando beneficiárias...
                </td>
              </tr>
            ) : gruposPaginados.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  Nenhuma unidade encontrada.
                </td>
              </tr>
            ) : (
              gruposPaginados.map((g) => (
                <React.Fragment key={g.cred.id}>
                  {/* Linha do cliente (UC geradora) */}
                  <tr className="bg-white hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 pl-6 pr-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          title="Adicionar unidade beneficiária"
                          aria-label="Adicionar beneficiária"
                          onClick={() => onAdicionar(g.cred)}
                          className="p-1 rounded text-blue-600 hover:bg-blue-50"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Ações da beneficiária"
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuItem onClick={() => onAdicionar(g.cred)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Adicionar beneficiária
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onRemover(g.cred as unknown as Beneficiaria)}
                              className="hidden"
                            >
                              —
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left group cursor-pointer rounded"
                        onClick={() => onAbrirPercentuais?.(g.cred)}
                        title="Definir percentuais das beneficiárias"
                      >
                        <Sun className="w-4 h-4 text-slate-500 flex-shrink-0 group-hover:text-blue-600" />
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-blue-700 group-hover:underline">
                            {g.nomeCliente}
                          </span>
                          {g.subtituloCliente && g.subtituloCliente !== g.nomeCliente && (
                            <span className="text-[11px] text-slate-400 truncate max-w-[280px]">
                              {g.subtituloCliente}
                            </span>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{g.ucGeradora}</td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        className="cursor-pointer"
                        onClick={() => onAbrirPercentuais?.(g.cred)}
                        title="Definir percentuais das beneficiárias"
                      >
                        <CelulaPercentual pct={g.percentualGeradora} />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <CelulaAlertas comErro={g.comErro} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-600">RGE</td>
                  </tr>

                  {/* Linhas das beneficiárias (indentadas) */}
                  {g.beneficiarias.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 pl-6 pr-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label="Ações da beneficiária"
                              className="p-1 ml-6 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuItem onClick={() => onEditar(b)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => onRemover(b)}
                              className="text-rose-600 focus:text-rose-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 pl-8">
                          <Home className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-slate-700">
                            {rotuloBeneficiaria(b, clientesMap, usinasMap)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600">{b.uc}</td>
                      <td className="py-3 px-4">
                        <CelulaPercentual pct={b.percentual ?? null} />
                      </td>
                      <td className="py-3 px-4">
                        <CelulaAlertas comErro={g.comErro} />
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-600">RGE</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé: Mostrando 1–10 de X itens + paginação numerada */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-white">
        <span className="text-xs text-slate-500">
          {gruposFiltrados.length === 0
            ? 'Nenhum item'
            : `Mostrando ${primeiroItem}–${ultimoItem} de ${gruposFiltrados.length} itens`}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={pagina <= 1}
            onClick={() => setPagina((p) => Math.max(1, p - 1))}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
            aria-label="Página anterior beneficiárias"
          >
            ‹
          </Button>
          {gerarPaginasVisiveis(pagina, totalPaginas).map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`e-${idx}`} className="px-1 text-xs text-slate-400 select-none">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPagina(p)}
                className={`h-8 w-8 rounded text-xs font-semibold transition-colors ${
                  pagina === p
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <Button
            variant="ghost"
            size="sm"
            disabled={pagina >= totalPaginas}
            onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
            className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900"
            aria-label="Próxima página beneficiárias"
          >
            ›
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BeneficiariasView

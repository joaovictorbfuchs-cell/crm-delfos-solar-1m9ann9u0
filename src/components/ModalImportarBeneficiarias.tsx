import React, { useRef, useState } from 'react'
import { FileSpreadsheet, Upload, CheckCircle2, AlertTriangle } from 'lucide-react'
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
import { parseSpreadsheetFile } from '@/lib/spreadsheetParser'
import {
  construirPlanoImportacao,
  normalizarUc,
  somaPercentuaisUsina,
  type BeneficiariaLike,
  type CredencialLike,
  type PlanoPreview,
  type ResumoImportacao,
} from '@/lib/importacaoBeneficiarias'

interface ModalImportarBeneficiariasProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  credenciais: CredencialLike[]
  beneficiarias: BeneficiariaLike[]
  onImportado: () => Promise<void> | void
}

type Fase = 'upload' | 'preview' | 'resumo'

function pctFmt(v: number): string {
  return `${(Math.round(v * 1000) / 10).toLocaleString('pt-BR')}%`
}

export function ModalImportarBeneficiarias({
  open,
  onOpenChange,
  credenciais,
  beneficiarias,
  onImportado,
}: ModalImportarBeneficiariasProps) {
  const inputArquivoRef = useRef<HTMLInputElement | null>(null)
  const [fase, setFase] = useState<Fase>('upload')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [plano, setPlano] = useState<PlanoPreview | null>(null)
  const [resumo, setResumo] = useState<ResumoImportacao | null>(null)
  const [importando, setImportando] = useState(false)
  const [importados, setImportados] = useState(0)
  const [totalImportar, setTotalImportar] = useState(0)

  const resetar = () => {
    setFase('upload')
    setNomeArquivo('')
    setPlano(null)
    setResumo(null)
    setImportando(false)
    setImportados(0)
    setTotalImportar(0)
    if (inputArquivoRef.current) inputArquivoRef.current.value = ''
  }

  const fechar = () => {
    onOpenChange(false)
    if (!importando) resetar()
  }

  const escolherArquivo = async (file: File | undefined) => {
    if (!file) return
    try {
      const tabela = await parseSpreadsheetFile(file)
      if (!tabela.rows.length) throw new Error('A planilha não tem linhas de dados.')
      const p = construirPlanoImportacao(tabela, credenciais, beneficiarias)
      if (p.linhasLidas === 0) {
        throw new Error(
          'Não foi possível reconhecer as linhas da planilha. Confira se a aba tem as colunas Tipo, Usina (Geradora), Unidade / Endereço, Nº da UC e Distribuição (%).',
        )
      }
      setNomeArquivo(file.name)
      setPlano(p)
      setResumo(null)
      setFase('preview')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ title: 'Erro ao ler a planilha', description: msg, variant: 'destructive' })
    }
  }

  const importar = async () => {
    if (!plano) return
    const alvos = plano.usinas.flatMap((u) =>
      u.itens.filter((i) => i.status === 'criar').map((i) => ({ usina: u, item: i })),
    )
    setTotalImportar(alvos.length)
    setImportados(0)
    setImportando(true)
    const contagem: ResumoImportacao = {
      criadas: 0,
      jaExistentes: 0,
      percentuaisAtualizados: 0,
      ignoradas: plano.ignoradas,
      duplicatas: plano.duplicatas,
      erros: 0,
      usinas: [],
      ignoradasDetalhe: plano.ignoradasDetalhe,
    }
    const novasCredenciais = new Set<string>()
    // Mapa das beneficiárias já existentes por credencial_id + UC para permitir
    // atualização de percentual na reimportação (em vez de pular silenciosamente).
    const existentesPorChave = new Map<string, BeneficiariaLike>()
    for (const b of beneficiarias) {
      const chave = `${b.credencial_id}|${normalizarUc(b.uc)}`
      if (!existentesPorChave.has(chave)) existentesPorChave.set(chave, b)
    }

    for (const u of plano.usinas) {
      const itensGravar = u.itens.filter((i) => i.status === 'criar')
      if (!itensGravar.length && !u.credencialNova) continue

      // 1. credencial da usina: localizar pela UC; se não existir, criar
      let credId = u.credencialId
      if (!credId && u.credencialNova && u.uc) {
        try {
          const resp = await fetch(`${pb.baseUrl}/backend/v1/rge/credenciais`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${pb.authStore.token}`,
            },
            body: JSON.stringify({ uc: u.uc, rotulo: u.nome }),
          })
          const json = await resp.json().catch(() => ({}))
          if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`)
          credId = String(json.id || '')
          if (credId) novasCredenciais.add(credId)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          contagem.erros += itensGravar.length
          contagem.usinas.push({
            nome: u.nome,
            uc: u.uc,
            qtd: 0,
            soma: 0,
            fechaCem: false,
            semCredencial: true,
          })
          contagem.ignoradasDetalhe.push(`Usina "${u.nome}": erro ao criar credencial — ${msg}`)
          continue
        }
      }

      const soma = somaPercentuaisUsina(u)
      contagem.usinas.push({
        nome: u.nome,
        uc: u.uc,
        qtd: u.itens.filter((i) => i.status === 'criar').length,
        soma,
        fechaCem: Math.abs(soma - 1) <= 0.005,
        semCredencial: !credId && itensGravar.length > 0,
      })

      // 2. gravar cada beneficiária (um item falho não aborta o lote)
      for (const { item } of alvos.filter((a) => a.usina === u && a.item.status === 'criar')) {
        const chaveItem = `${credId}|${item.uc}`
        const existente = credId ? existentesPorChave.get(chaveItem) : undefined
        try {
          const resp = await fetch(`${pb.baseUrl}/backend/v1/rge/beneficiarias-uc`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${pb.authStore.token}`,
            },
            body: JSON.stringify({
              credencial_id: credId,
              uc: item.uc,
              rotulo: item.rotulo,
              percentual: item.percentual,
              ativo: true,
            }),
          })
          const json = await resp.json().catch(() => ({}))
          if (!resp.ok) throw new Error(json.error || `HTTP ${resp.status}`)
          if (existente && Math.abs(existente.percentual - item.percentual) > 1e-9) {
            // Já existia com percentual diferente: atualizado na reimportação
            contagem.percentuaisAtualizados++
          } else {
            contagem.criadas++
          }
        } catch (err) {
          contagem.erros++
          const msg = err instanceof Error ? err.message : String(err)
          contagem.ignoradasDetalhe.push(
            `Usina "${u.nome}" · UC ${item.uc}: erro ao gravar — ${msg}`,
          )
        } finally {
          setImportados((n) => n + 1)
        }
      }
    }

    setResumo(contagem)
    setFase('resumo')
    setImportando(false)
    try {
      await onImportado()
    } catch {
      // recarregar dados é secundário
    }
  }

  const fecharResumo = () => {
    onOpenChange(false)
    resetar()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) fechar()
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Importar beneficiárias de planilha
          </DialogTitle>
        </DialogHeader>

        {fase === 'upload' && (
          <div className="pt-2 space-y-4">
            <p className="text-sm text-slate-600">
              Selecione a planilha XLSX ou CSV com as colunas{' '}
              <span className="font-semibold">
                Tela, Usina (Geradora), Tipo, Unidade / Endereço, Nº da UC e Distribuição (%)
              </span>
              . As linhas <span className="font-semibold">Geradora</span> definem a usina corrente;
              as <span className="font-semibold">Beneficiárias</span> seguintes são cadastradas
              nela. Linhas já cadastradas são puladas e UCs são normalizadas para apenas dígitos.
            </p>
            <input
              ref={inputArquivoRef}
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              className="hidden"
              onChange={(e) => escolherArquivo(e.target.files?.[0])}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputArquivoRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') inputArquivoRef.current?.click()
              }}
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-10 px-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
            >
              <Upload className="w-8 h-8 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">
                Clique para escolher o arquivo
              </span>
              <span className="text-xs text-slate-400">.xlsx, .xls ou .csv</span>
            </div>
          </div>
        )}

        {fase === 'preview' && plano && (
          <div className="pt-2 space-y-4">
            <p className="text-sm text-slate-600">
              Arquivo: <span className="font-semibold">{nomeArquivo}</span> — {plano.linhasLidas}{' '}
              linha(s) lida(s),{' '}
              <span className="font-semibold text-blue-700">
                {plano.itensParaImportar} beneficiária(s) serão processadas
              </span>
              {plano.jaCadastradas > 0 &&
                `, ${plano.jaCadastradas} já cadastrada(s) serão pulada(s)`}
              {plano.duplicatas > 0 && `, ${plano.duplicatas} duplicata(s) no arquivo`}
              {plano.ignoradas > 0 && `, ${plano.ignoradas} ignorada(s) (UC inválida)`}.
            </p>
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {plano.usinas.map((u, ui) => (
                <div key={ui} className="px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      {u.nome}
                      {u.uc ? (
                        <span className="text-slate-400 font-mono text-xs ml-2">{u.uc}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-slate-500">
                      {u.itens.filter((i) => i.status === 'criar').length} a criar
                      {u.credencialNova ? ' · credencial nova' : ''}
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {u.itens
                      .filter((i) => i.status === 'criar')
                      .slice(0, 4)
                      .map((i, ii) => (
                        <li key={ii} className="text-xs text-slate-500 flex justify-between gap-2">
                          <span className="truncate">
                            <span className="font-mono">{i.uc}</span> · {i.rotulo || '—'}
                          </span>
                          <span>{pctFmt(i.percentual)}</span>
                        </li>
                      ))}
                    {u.itens.filter((i) => i.status === 'criar').length > 4 && (
                      <li className="text-xs text-slate-400">
                        … mais {u.itens.filter((i) => i.status === 'criar').length - 4}
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={fechar} disabled={importando}>
                Cancelar
              </Button>
              <Button onClick={importar} disabled={importando || plano.itensParaImportar === 0}>
                {importando
                  ? `Importando… ${importados}/${totalImportar}`
                  : `Importar ${plano.itensParaImportar} beneficiária(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {fase === 'resumo' && resumo && (
          <div className="pt-2 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Importação concluída
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
              {[
                { label: 'Criadas', valor: resumo.criadas, cor: 'text-emerald-700' },
                { label: 'Já existentes', valor: resumo.jaExistentes, cor: 'text-slate-700' },
                {
                  label: 'Percentuais atualizados',
                  valor: resumo.percentuaisAtualizados,
                  cor: 'text-blue-700',
                },
                { label: 'Ignoradas', valor: resumo.ignoradas, cor: 'text-amber-600' },
                { label: 'Duplicatas', valor: resumo.duplicatas, cor: 'text-slate-500' },
                { label: 'Erros', valor: resumo.erros, cor: 'text-rose-600' },
              ].map((c) => (
                <div key={c.label} className="border border-slate-200 rounded-lg py-2.5">
                  <div className={`text-xl font-bold ${c.cor}`}>{c.valor}</div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-400">
                    {c.label}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Soma dos percentuais por usina
              </div>
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {resumo.usinas.map((u, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                  >
                    <span className="text-slate-700 truncate">
                      {u.nome}
                      {u.semCredencial && (
                        <span className="ml-2 text-[11px] font-semibold text-rose-600">
                          sem credencial — não importada
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        u.fechaCem ? 'text-emerald-700' : 'text-amber-600'
                      }`}
                    >
                      {!u.fechaCem && <AlertTriangle className="w-3.5 h-3.5" />}
                      {pctFmt(u.soma)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {resumo.ignoradasDetalhe.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Detalhes ({resumo.ignoradasDetalhe.length})
                </summary>
                <ul className="mt-1.5 space-y-1 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {resumo.ignoradasDetalhe.map((d, i) => (
                    <li key={i} className="text-xs text-slate-500">
                      • {d}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            <DialogFooter>
              <Button onClick={fecharResumo}>Concluir</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ModalImportarBeneficiarias

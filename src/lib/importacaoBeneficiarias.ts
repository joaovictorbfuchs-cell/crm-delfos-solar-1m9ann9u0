/**
 * Regras de importação de beneficiárias de usinas RGE a partir de planilha
 * (XLSX/CSV com colunas: Tela | Usina (Geradora) | Tipo | Unidade / Endereço |
 * Nº da UC | Distribuição (%)).
 *
 * Nenhum dado de planilha vive aqui: tudo é lido do arquivo no momento do upload.
 */
import type { ParsedTableData } from './spreadsheetParser'

export interface CredencialLike {
  id: string
  uc: string
  rotulo?: string
}

export interface BeneficiariaLike {
  id: string
  credencial_id: string
  uc: string
  percentual?: number
  ativo?: boolean
}

export type StatusItemPlano = 'criar' | 'ja_cadastrada' | 'sem_credencial'

export interface ItemPlanoBeneficiaria {
  uc: string
  rotulo: string
  percentual: number
  status: StatusItemPlano
}

export interface UsinaPlanoImportacao {
  nome: string
  uc: string | null
  credencialId: string | null
  credencialNova: boolean
  itens: ItemPlanoBeneficiaria[]
}

export interface PlanoPreview {
  usinas: UsinaPlanoImportacao[]
  linhasLidas: number
  itensParaImportar: number
  jaCadastradas: number
  ignoradas: number
  duplicatas: number
  ignoradasDetalhe: string[]
  avisos: string[]
}

/** Mantém apenas dígitos (remove pontos, traços, espaços e qualquer outro caractere). */
export function normalizarUc(valor: unknown): string {
  return String(valor == null ? '' : valor).replace(/\D/g, '')
}

/** Chave de comparação de rótulos/nomes: minúsculo e sem acentos. */
export function chaveRotulo(valor: unknown): string {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Aceita "0,15", "0.15" ou "15%" e devolve o decimal (0,15 = 15%).
 *
 * Regra de conversão: o valor <= 1 é uma FRAÇÃO e fica como está
 * (0.1 = 10%, 0.05 = 5%); valor > 1 é PERCENTUAL e é dividido por 100
 * (10 = 10%, 2.5 = 2.5%). Textos com sufixo "%" (ex.: "10%") são
 * tratados como percentual e divididos por 100 ("10%" = 0.10); textos
 * com vírgula decimal ("0,1") viram 0.1 e então caem na mesma regra.
 */
export function parsePercentualPlanilha(valor: unknown): number {
  const bruto = String(valor == null ? '' : valor).trim()
  if (!bruto) return 0
  const temSufixoPct = bruto.includes('%')
  const t = bruto.replace('%', '').replace(/\s/g, '')
  let n = Number(t.replace(',', '.'))
  if (isNaN(n)) {
    const m = t.match(/[\d.,]+/)
    if (!m) return 0
    n = Number(m[0].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))
  }
  if (isNaN(n)) return 0
  if (temSufixoPct) return n / 100
  if (n > 1) n = n / 100
  return n
}

const VAZIAS_UC = ['', '(nao informada)', 'nao informada', 'não informada', '-', '—', 's/n']

function ucInvalida(ucDigitos: string, bruto: string): boolean {
  if (!ucDigitos) return true
  const limpo = chaveRotulo(bruto).replace(/[\s.]+/g, '')
  return VAZIAS_UC.includes(limpo)
}

function indexesColunas(headers: string[]) {
  const chave = headers.map((h) => chaveRotulo(h))
  const achar = (teste: (c: string) => boolean, fallback: number) => {
    const i = chave.findIndex(teste)
    return i >= 0 ? i : fallback
  }
  return {
    tipo: achar((c) => /tipo/.test(c), 2),
    usina: achar((c) => /usina|geradora/.test(c), 1),
    unidade: achar((c) => /unidade|endereco/.test(c), 3),
    uc: achar((c) => /\buc\b/.test(c) || /numero da uc/.test(c), 4),
    percentual: achar((c) => /distrib|percentual|rateio/.test(c) || c.includes('%'), 5),
  }
}

/**
 * Monta o plano de importação a partir da tabela lida do arquivo, das credenciais
 * e beneficiárias já cadastradas. Regras:
 * - Linha "Geradora" troca a usina corrente (contexto das beneficiárias seguintes).
 * - UC normalizada para só dígitos; UC vazia/"(não informada)"/sem dígitos = ignorada.
 * - Duplicata no arquivo (mesma usina + UC) = mantém a primeira e conta duplicata.
 * - Já cadastrada (credencial_id + UC) = pulada como "já existente".
 * - Usina cuja geradora tem UC inválida: tenta casar a credencial pelo rótulo;
 *   sem credencial, as beneficiárias ficam "sem_credencial" e não são gravadas.
 */
export function construirPlanoImportacao(
  tabela: ParsedTableData,
  credenciais: CredencialLike[],
  beneficiarias: BeneficiariaLike[],
): PlanoPreview {
  const credPorUc = new Map<string, CredencialLike>()
  const credPorRotulo = new Map<string, CredencialLike>()
  for (const c of credenciais) {
    const uc = normalizarUc(c.uc)
    if (uc && !credPorUc.has(uc)) credPorUc.set(uc, c)
    const r = chaveRotulo(c.rotulo || '')
    if (r && !credPorRotulo.has(r)) credPorRotulo.set(r, c)
  }
  const existentes = new Set(beneficiarias.map((b) => `${b.credencial_id}|${normalizarUc(b.uc)}`))

  const col = indexesColunas(tabela.headers)
  const usinas: UsinaPlanoImportacao[] = []
  const ignoradasDetalhe: string[] = []
  const avisos: string[] = []
  const usadasNoArquivo = new Set<string>()

  let atual: UsinaPlanoImportacao | null = null
  let linhasLidas = 0
  let jaCadastradas = 0
  let ignoradas = 0
  let duplicatas = 0

  for (const row of tabela.rows) {
    const tipoBruto = chaveRotulo(row[tabela.headers[col.tipo]] || '')
    const nomeUsina = String(row[tabela.headers[col.usina]] || '').trim()
    const ucBruta = String(row[tabela.headers[col.uc]] || '').trim()
    const unidade = String(row[tabela.headers[col.unidade]] || '').trim()
    const ucDigitos = normalizarUc(ucBruta)

    if (!tipoBruto && !nomeUsina && !ucDigitos) continue
    linhasLidas++

    if (tipoBruto.startsWith('g')) {
      let credencialId: string | null = null
      let ucUsina: string | null = null
      let credencialNova = false
      if (ucDigitos && !ucInvalida(ucDigitos, ucBruta)) {
        ucUsina = ucDigitos
        const cred = credPorUc.get(ucDigitos) || null
        credencialId = cred ? cred.id : null
        credencialNova = !cred
      } else {
        const cred = credPorRotulo.get(chaveRotulo(nomeUsina)) || null
        credencialId = cred ? cred.id : null
        if (nomeUsina) {
          ignoradas++
          ignoradasDetalhe.push(
            `Geradora "${nomeUsina}": UC inválida e nenhuma credencial existente com esse nome`,
          )
        }
      }
      atual = {
        nome: nomeUsina || (ucUsina ? `UC ${ucUsina}` : 'Usina sem nome'),
        uc: ucUsina,
        credencialId,
        credencialNova,
        itens: [],
      }
      usinas.push(atual)
      continue
    }

    // Linha de beneficiária
    if (!atual) {
      ignoradas++
      ignoradasDetalhe.push(`"${unidade || ucBruta}": linha antes de qualquer usina geradora`)
      continue
    }
    if (!ucDigitos || ucInvalida(ucDigitos, ucBruta)) {
      ignoradas++
      ignoradasDetalhe.push(
        `"${unidade || atual.nome}": UC inválida ("${ucBruta || 'vazia'}") — linha ignorada`,
      )
      continue
    }
    if (atual.credencialId && existentes.has(`${atual.credencialId}|${ucDigitos}`)) {
      jaCadastradas++
      atual.itens.push({
        uc: ucDigitos,
        rotulo: unidade || atual.nome,
        percentual: parsePercentualPlanilha(row[tabela.headers[col.percentual]]),
        status: 'ja_cadastrada',
      })
      continue
    }
    const chaveArquivo = `${atual.credencialId || atual.uc || atual.nome}|${ucDigitos}`
    if (usadasNoArquivo.has(chaveArquivo)) {
      duplicatas++
      ignoradasDetalhe.push(
        `"${unidade || ucDigitos}": UC repetida na planilha para a usina ${atual.nome} — mantida a primeira`,
      )
      continue
    }
    usadasNoArquivo.add(chaveArquivo)
    atual.itens.push({
      uc: ucDigitos,
      rotulo: unidade || atual.nome,
      percentual: parsePercentualPlanilha(row[tabela.headers[col.percentual]]),
      status: atual.credencialId || atual.credencialNova ? 'criar' : 'sem_credencial',
    })
  }

  for (const u of usinas) {
    const semCred = u.itens.filter((i) => i.status === 'sem_credencial').length
    if (semCred > 0) {
      ignoradas += semCred
      avisos.push(
        `Usina "${u.nome}": ${semCred} beneficiária(s) não importada(s) por falta de credencial (UC da geradora inválida e nenhum cadastro com esse nome)`,
      )
    }
  }

  const itensParaImportar = usinas.reduce(
    (s, u) => s + u.itens.filter((i) => i.status === 'criar').length,
    0,
  )

  return {
    usinas,
    linhasLidas,
    itensParaImportar,
    jaCadastradas,
    ignoradas,
    duplicatas,
    ignoradasDetalhe,
    avisos,
  }
}

export interface ResumoUsinaImportacao {
  nome: string
  uc: string | null
  qtd: number
  soma: number
  fechaCem: boolean
  semCredencial: boolean
}

export interface ResumoImportacao {
  criadas: number
  jaExistentes: number
  percentuaisAtualizados: number
  ignoradas: number
  duplicatas: number
  erros: number
  usinas: ResumoUsinaImportacao[]
  ignoradasDetalhe: string[]
  atualizacoesDetalhe: string[]
}

export function somaPercentuaisUsina(u: UsinaPlanoImportacao): number {
  return u.itens
    .filter((i) => i.status === 'criar' || i.status === 'ja_cadastrada')
    .reduce((s, i) => s + i.percentual, 0)
}

export interface AtualizacaoPercentual {
  usina: UsinaPlanoImportacao
  item: ItemPlanoBeneficiaria
  existente: BeneficiariaLike
  /** Percentual gravado hoje (fração decimal). */
  de: number
  /** Percentual vindo da planilha (fração decimal). */
  para: number
}

/**
 * Beneficiárias já cadastradas (mesma credencial + UC) cujo percentual da
 * planilha difere do gravado — na reimportação elas são ATUALIZADAS em vez de
 * puladas, corrigindo registros gravados errados por versões anteriores.
 */
export function planoAtualizacoesPercentual(
  plano: PlanoPreview,
  beneficiarias: BeneficiariaLike[],
): AtualizacaoPercentual[] {
  const porChave = new Map<string, BeneficiariaLike>()
  for (const b of beneficiarias) {
    const chave = `${b.credencial_id}|${normalizarUc(b.uc)}`
    if (!porChave.has(chave)) porChave.set(chave, b)
  }
  const alvos: AtualizacaoPercentual[] = []
  for (const u of plano.usinas) {
    if (!u.credencialId) continue
    for (const item of u.itens) {
      if (item.status !== 'ja_cadastrada') continue
      const existente = porChave.get(`${u.credencialId}|${item.uc}`)
      if (!existente) continue
      const de = existente.percentual ?? 0
      if (Math.abs(de - item.percentual) > 1e-9) {
        alvos.push({ usina: u, item, existente, de, para: item.percentual })
      }
    }
  }
  return alvos
}

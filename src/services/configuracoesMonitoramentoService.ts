import pb from '@/lib/pocketbase/client'
import type {
  ConfiguracaoMonitoramento,
  SalvarConfiguracaoMonitoramentoDados,
  TipoProcedimentoMonitoramento,
} from '@/types/equipamentos'

/**
 * Normaliza uma string para comparação tolerante de marcas
 */
function cleanString(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Busca todas as configurações de monitoramento cadastradas
 */
export async function fetchConfiguracoesMonitoramento(
  apenasAtivos = false,
): Promise<ConfiguracaoMonitoramento[]> {
  try {
    const filter = apenasAtivos ? 'ativo = true' : ''
    const records = await pb
      .collection('configuracoes_monitoramento')
      .getFullList<ConfiguracaoMonitoramento>({
        filter: filter || undefined,
        sort: 'marca,titulo',
      })
    return records
  } catch (err) {
    console.error('Erro ao buscar configurações de monitoramento:', err)
    return []
  }
}

/**
 * Busca uma configuração por ID
 */
export async function fetchConfiguracaoMonitoramentoById(
  id: string,
): Promise<ConfiguracaoMonitoramento | null> {
  if (!id) return null
  try {
    return await pb.collection('configuracoes_monitoramento').getOne<ConfiguracaoMonitoramento>(id)
  } catch (err) {
    console.error(`Erro ao buscar configuração de monitoramento ${id}:`, err)
    return null
  }
}

/**
 * Cria um novo procedimento de configuração de monitoramento
 */
export async function createConfiguracaoMonitoramento(
  dados: SalvarConfiguracaoMonitoramentoDados,
  arquivoPdf?: File,
): Promise<ConfiguracaoMonitoramento> {
  const temPdf = Boolean(arquivoPdf)
  const temLink = Boolean(dados.link_procedimento && dados.link_procedimento.trim())
  const tipoCalculado: TipoProcedimentoMonitoramento =
    dados.tipo_procedimento || (temPdf && temLink ? 'ambos' : temPdf ? 'pdf' : 'link')

  const cleaned: Record<string, any> = {
    marca: dados.marca.trim(),
    titulo: dados.titulo ? dados.titulo.trim() : `Configuração Datalogger - ${dados.marca.trim()}`,
    tipo_procedimento: tipoCalculado,
    link_procedimento: temLink ? dados.link_procedimento!.trim() : '',
    instrucoes: dados.instrucoes ? dados.instrucoes.trim() : '',
    ativo: dados.ativo !== undefined ? Boolean(dados.ativo) : true,
  }

  if (arquivoPdf) {
    const formData = new FormData()
    Object.entries(cleaned).forEach(([k, v]) => {
      formData.append(k, String(v))
    })
    formData.append('arquivo_pdf', arquivoPdf)
    return await pb
      .collection('configuracoes_monitoramento')
      .create<ConfiguracaoMonitoramento>(formData)
  }

  return await pb
    .collection('configuracoes_monitoramento')
    .create<ConfiguracaoMonitoramento>(cleaned)
}

/**
 * Atualiza um procedimento de configuração de monitoramento
 */
export async function updateConfiguracaoMonitoramento(
  id: string,
  dados: Partial<SalvarConfiguracaoMonitoramentoDados>,
  arquivoPdf?: File,
  removerPdf?: boolean,
): Promise<ConfiguracaoMonitoramento> {
  const cleaned: Record<string, any> = {}

  if (dados.marca !== undefined) {
    cleaned.marca = dados.marca.trim()
  }
  if (dados.titulo !== undefined) {
    cleaned.titulo = dados.titulo ? dados.titulo.trim() : ''
  }
  if (dados.link_procedimento !== undefined) {
    cleaned.link_procedimento = dados.link_procedimento ? dados.link_procedimento.trim() : ''
  }
  if (dados.tipo_procedimento !== undefined) {
    cleaned.tipo_procedimento = dados.tipo_procedimento
  }
  if (dados.instrucoes !== undefined) {
    cleaned.instrucoes = dados.instrucoes ? dados.instrucoes.trim() : ''
  }
  if (dados.ativo !== undefined) {
    cleaned.ativo = Boolean(dados.ativo)
  }

  if (removerPdf && !arquivoPdf) {
    cleaned.arquivo_pdf = null
  }

  if (arquivoPdf) {
    const formData = new FormData()
    Object.entries(cleaned).forEach(([k, v]) => {
      if (v !== undefined) {
        formData.append(k, v === null ? '' : String(v))
      }
    })
    formData.append('arquivo_pdf', arquivoPdf)
    return await pb
      .collection('configuracoes_monitoramento')
      .update<ConfiguracaoMonitoramento>(id, formData)
  }

  return await pb
    .collection('configuracoes_monitoramento')
    .update<ConfiguracaoMonitoramento>(id, cleaned)
}

/**
 * Remove uma configuração de monitoramento
 */
export async function deleteConfiguracaoMonitoramento(id: string): Promise<boolean> {
  await pb.collection('configuracoes_monitoramento').delete(id)
  return true
}

/**
 * Retorna a URL pública ou do PocketBase para o PDF do procedimento
 */
export function getPdfConfiguracaoMonitoramentoUrl(cfg: ConfiguracaoMonitoramento): string | null {
  if (cfg.arquivo_pdf) {
    return pb.files.getURL(cfg, cfg.arquivo_pdf)
  }
  return null
}

/**
 * Retorna o link ou PDF dependendo de qual estiver cadastrado
 */
export interface ProcedimentoMonitoramentoAcesso {
  url: string | null
  tipo: 'pdf' | 'link' | null
  pdfUrl?: string | null
  linkUrl?: string | null
  temPdf: boolean
  temLink: boolean
  temAmbos: boolean
}

/**
 * Retorna os acessos de PDF e link cadastrados na configuração de monitoramento.
 * Suporta quando apenas um existe OU quando ambos (PDF e Link) estão cadastrados no mesmo registro.
 */
export function getProcedimentoMonitoramentoUrl(
  cfg: ConfiguracaoMonitoramento,
): ProcedimentoMonitoramentoAcesso {
  const pdfUrl = cfg.arquivo_pdf ? pb.files.getURL(cfg, cfg.arquivo_pdf) : null
  const linkUrl =
    cfg.link_procedimento && cfg.link_procedimento.trim() ? cfg.link_procedimento.trim() : null

  const temPdf = Boolean(pdfUrl)
  const temLink = Boolean(linkUrl)
  const temAmbos = temPdf && temLink

  // Compatibilidade com o formato anterior: se tiver PDF prioriza para o campo 'url'/'tipo' legado,
  // ou linkUrl se não tiver PDF.
  const urlPrincipal = pdfUrl || linkUrl || null
  const tipoPrincipal = temPdf ? 'pdf' : temLink ? 'link' : null

  return {
    url: urlPrincipal,
    tipo: tipoPrincipal,
    pdfUrl,
    linkUrl,
    temPdf,
    temLink,
    temAmbos,
  }
}

/**
 * Sugere a melhor configuração de monitoramento compatível com a marca informada
 */
export function sugerirConfiguracaoPorMarca(
  marcaBuscada: string,
  catalogo: ConfiguracaoMonitoramento[],
): ConfiguracaoMonitoramento | null {
  if (!marcaBuscada || !marcaBuscada.trim() || !catalogo || catalogo.length === 0) {
    return null
  }

  const marcaNorm = cleanString(marcaBuscada).replace(/[^a-z0-9]/g, '')
  if (!marcaNorm) return null

  // 1. Match exato normalizado
  const matchExato = catalogo.find((c) => {
    const cNorm = cleanString(c.marca).replace(/[^a-z0-9]/g, '')
    return cNorm === marcaNorm
  })
  if (matchExato) return matchExato

  // 2. Match por inclusão (ex: "Huawei Solar" contém "Huawei", ou vice-versa)
  const matchInclusao = catalogo.find((c) => {
    const cNorm = cleanString(c.marca).replace(/[^a-z0-9]/g, '')
    return cNorm.length >= 3 && (cNorm.includes(marcaNorm) || marcaNorm.includes(cNorm))
  })
  if (matchInclusao) return matchInclusao

  // 3. Match no título do procedimento
  const matchTitulo = catalogo.find((c) => {
    const tNorm = cleanString(c.titulo || '')
    return tNorm.includes(cleanString(marcaBuscada))
  })
  if (matchTitulo) return matchTitulo

  return null
}

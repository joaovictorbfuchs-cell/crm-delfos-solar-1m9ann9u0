import pb from '@/lib/pocketbase/client'

export const STORAGE_KEY_VALOR_POR_PLACA = 'delfos_valor_limpeza_por_placa'
export const VALOR_POR_PLACA_PADRAO_SISTEMA = 8.0
export const CHAVE_RODAPE_COMERCIAL_RELATORIO_OS = 'rodape_comercial_relatorio_os'
export const STORAGE_KEY_RODAPE_COMERCIAL = 'delfos_rodape_comercial_relatorio_os'

export interface RodapeComercialConfig {
  titulo: string
  descricao: string
  indicacao: string
  contato: string
}

export const RODAPE_COMERCIAL_PADRAO: RodapeComercialConfig = {
  titulo: 'Plano Delfos de Manutenção Preventiva & O&M',
  descricao:
    'Mantenha sua usina com geração máxima e segurança com nosso plano de limpeza periódica e revisão técnica. Atendimento ágil e garantia de excelência em Erechim e região.',
  indicacao:
    'Indique um amigo para instalar ou revisar sua usina solar com a Delfos e ganhe benefícios exclusivos!',
  contato:
    'Dúvidas ou agendamentos: (54) 99129-2121 • solar@updates.delfos.eng.br • www.delfos.eng.br',
}

export interface ConfiguracaoItem {
  id?: string
  chave: string
  valor?: string
  dados?: Record<string, any>
  descricao?: string
  created?: string
  updated?: string
}

/**
 * Obtém o valor por placa configurado como padrão.
 * Estratégia de resiliência:
 * 1. Tenta buscar da coleção `configuracoes` no PocketBase (chave: 'valor_limpeza_por_placa')
 * 2. Atualiza o cache local (localStorage)
 * 3. Se falhar ou estiver offline, usa o localStorage
 * 4. Fallback final: R$ 8,00
 */
export async function getValorLimpezaPorPlacaPadrao(): Promise<number> {
  // 1. Tenta recuperar do backend PocketBase
  try {
    const record = await pb
      .collection('configuracoes')
      .getFirstListItem<ConfiguracaoItem>('chave = "valor_limpeza_por_placa"')

    if (record) {
      let num = 0
      if (typeof record.dados?.valor_por_placa === 'number') {
        num = record.dados.valor_por_placa
      } else if (record.valor) {
        num = parseFloat(record.valor.replace(',', '.'))
      }

      if (num > 0) {
        try {
          localStorage.setItem(STORAGE_KEY_VALOR_POR_PLACA, num.toString())
        } catch {
          /* intentionally ignored */
        }
        return num
      }
    }
  } catch (err) {
    // Pode ocorrer se não autenticado ou falha de rede
    console.warn(
      '[configuracoesService] Falha ao ler valor_limpeza_por_placa do backend, usando cache:',
      err,
    )
  }

  // 2. Fallback para cache local no localStorage
  return getValorLimpezaPorPlacaCacheSync()
}

/**
 * Leitura síncrona do valor por placa armazenado no cache local (localStorage),
 * com fallback direto para R$ 8,00.
 */
export function getValorLimpezaPorPlacaCacheSync(): number {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_VALOR_POR_PLACA)
    if (cached) {
      const num = parseFloat(cached)
      if (!isNaN(num) && num > 0) {
        return num
      }
    }
  } catch {
    /* intentionally ignored */
  }
  return VALOR_POR_PLACA_PADRAO_SISTEMA
}

/**
 * Salva um novo valor por placa como o novo padrão durável:
 * 1. Salva imediatamente no localStorage (cache síncrono para UI instantânea)
 * 2. Persiste na coleção `configuracoes` do PocketBase (cria ou atualiza o registro)
 */
export async function setValorLimpezaPorPlacaPadrao(novoValor: number): Promise<number> {
  const valorSanitizado = Math.max(0.1, Math.round(novoValor * 100) / 100)

  // 1. Salva em cache local imediatamente
  try {
    localStorage.setItem(STORAGE_KEY_VALOR_POR_PLACA, valorSanitizado.toString())
  } catch {
    /* intentionally ignored */
  }

  // 2. Persiste no PocketBase
  try {
    let recordExistente: ConfiguracaoItem | null = null
    try {
      recordExistente = await pb
        .collection('configuracoes')
        .getFirstListItem<ConfiguracaoItem>('chave = "valor_limpeza_por_placa"')
    } catch (_) {
      recordExistente = null
    }

    const payload = {
      chave: 'valor_limpeza_por_placa',
      valor: valorSanitizado.toFixed(2),
      dados: { valor_por_placa: valorSanitizado },
      descricao: 'Valor padrão comercial cobrado por placa na limpeza avulsa (R$)',
    }

    if (recordExistente?.id) {
      await pb.collection('configuracoes').update(recordExistente.id, payload)
    } else {
      await pb.collection('configuracoes').create(payload)
    }
  } catch (err) {
    console.error('[configuracoesService] Erro ao persistir valor no PocketBase:', err)
    // Mesmo se a chamada de rede falhar, o cache local já foi atualizado
  }

  return valorSanitizado
}

/**
 * Obtém a configuração de rodapé comercial do Relatório de OS.
 * Busca no PocketBase e faz fallback para cache local ou padrão do sistema.
 */
export async function getRodapeComercialRelatorioOS(): Promise<RodapeComercialConfig> {
  try {
    const record = await pb
      .collection('configuracoes')
      .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_RODAPE_COMERCIAL_RELATORIO_OS}"`)

    if (record) {
      let config: RodapeComercialConfig | null = null
      if (record.dados && typeof record.dados === 'object') {
        config = {
          titulo: record.dados.titulo || RODAPE_COMERCIAL_PADRAO.titulo,
          descricao: record.dados.descricao || RODAPE_COMERCIAL_PADRAO.descricao,
          indicacao: record.dados.indicacao || RODAPE_COMERCIAL_PADRAO.indicacao,
          contato: record.dados.contato || RODAPE_COMERCIAL_PADRAO.contato,
        }
      } else if (record.valor) {
        try {
          const parsed = JSON.parse(record.valor)
          config = {
            titulo: parsed.titulo || RODAPE_COMERCIAL_PADRAO.titulo,
            descricao: parsed.descricao || RODAPE_COMERCIAL_PADRAO.descricao,
            indicacao: parsed.indicacao || RODAPE_COMERCIAL_PADRAO.indicacao,
            contato: parsed.contato || RODAPE_COMERCIAL_PADRAO.contato,
          }
        } catch {
          config = {
            ...RODAPE_COMERCIAL_PADRAO,
            descricao: record.valor,
          }
        }
      }

      if (config) {
        try {
          localStorage.setItem(STORAGE_KEY_RODAPE_COMERCIAL, JSON.stringify(config))
        } catch {
          /* ignore */
        }
        return config
      }
    }
  } catch (err) {
    console.warn('[configuracoesService] Falha ao ler rodape_comercial_relatorio_os:', err)
  }

  return getRodapeComercialCacheSync()
}

/**
 * Leitura síncrona do cache local de rodapé comercial.
 */
export function getRodapeComercialCacheSync(): RodapeComercialConfig {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_RODAPE_COMERCIAL)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && typeof parsed === 'object') {
        return {
          titulo: parsed.titulo || RODAPE_COMERCIAL_PADRAO.titulo,
          descricao: parsed.descricao || RODAPE_COMERCIAL_PADRAO.descricao,
          indicacao: parsed.indicacao || RODAPE_COMERCIAL_PADRAO.indicacao,
          contato: parsed.contato || RODAPE_COMERCIAL_PADRAO.contato,
        }
      }
    }
  } catch {
    /* ignore */
  }
  return { ...RODAPE_COMERCIAL_PADRAO }
}

/**
 * Salva a configuração do rodapé comercial do relatório no PocketBase e cache local.
 */
export async function setRodapeComercialRelatorioOS(
  novaConfig: Partial<RodapeComercialConfig>,
): Promise<RodapeComercialConfig> {
  const finalConfig: RodapeComercialConfig = {
    titulo: (novaConfig.titulo ?? RODAPE_COMERCIAL_PADRAO.titulo).trim(),
    descricao: (novaConfig.descricao ?? RODAPE_COMERCIAL_PADRAO.descricao).trim(),
    indicacao: (novaConfig.indicacao ?? RODAPE_COMERCIAL_PADRAO.indicacao).trim(),
    contato: (novaConfig.contato ?? RODAPE_COMERCIAL_PADRAO.contato).trim(),
  }

  try {
    localStorage.setItem(STORAGE_KEY_RODAPE_COMERCIAL, JSON.stringify(finalConfig))
  } catch {
    /* ignore */
  }

  try {
    let recordExistente: ConfiguracaoItem | null = null
    try {
      recordExistente = await pb
        .collection('configuracoes')
        .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_RODAPE_COMERCIAL_RELATORIO_OS}"`)
    } catch {
      recordExistente = null
    }

    const payload = {
      chave: CHAVE_RODAPE_COMERCIAL_RELATORIO_OS,
      valor: finalConfig.descricao,
      dados: finalConfig,
      descricao: 'Rodapé comercial e texto de indicação exibido no Relatório Técnico de OS',
    }

    if (recordExistente?.id) {
      await pb.collection('configuracoes').update(recordExistente.id, payload)
    } else {
      await pb.collection('configuracoes').create(payload)
    }
  } catch (err) {
    console.error('[configuracoesService] Erro ao persistir rodape_comercial no PocketBase:', err)
  }

  return finalConfig
}

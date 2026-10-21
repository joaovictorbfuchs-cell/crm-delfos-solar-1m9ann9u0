import pb from '@/lib/pocketbase/client'

export const STORAGE_KEY_VALOR_POR_PLACA = 'delfos_valor_limpeza_por_placa'
export const VALOR_POR_PLACA_PADRAO_SISTEMA = 8.0
export const CHAVE_RODAPE_COMERCIAL_RELATORIO_OS = 'rodape_comercial_relatorio_os'
export const STORAGE_KEY_RODAPE_COMERCIAL = 'delfos_rodape_comercial_relatorio_os'
export const STORAGE_KEY_OFERTA_LIMPEZA_MENSAGEM = 'delfos_oferta_limpeza_mensagem_padrao'
export const STORAGE_KEY_OFERTA_LIMPEZA_PERCENTUAL = 'delfos_oferta_limpeza_percentual_perda_padrao'
export const CHAVE_OFERTA_LIMPEZA_PADRAO = 'oferta_limpeza_config_padrao'
export const CHAVE_AVALIACAO_GOOGLE_PADRAO = 'avaliacao_google_config_padrao'
export const STORAGE_KEY_AVALIACAO_GOOGLE = 'delfos_avaliacao_google_config_padrao'

export const LINK_AVALIACAO_GOOGLE_PADRAO = 'https://g.page/r/CTsVOsKTsWCTEBM/review'
export const TITULO_AVALIACAO_GOOGLE_PADRAO = 'Sua opinião vale muito para nós'
export const TEXTO_AVALIACAO_GOOGLE_PADRAO =
  'Ficamos felizes em atender você! Se o serviço foi do seu agrado, reserve 15 segundos para avaliar nossa equipe no Google — isso é muito importante para continuarmos entregando um atendimento de qualidade.'

export interface AvaliacaoGoogleConfigPadrao {
  titulo: string
  texto: string
  link: string
}

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
      .getFirstListItem<ConfiguracaoItem>('chave = "valor_limpeza_por_placa"', {
        requestKey: null,
      })

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
        .getFirstListItem<ConfiguracaoItem>('chave = "valor_limpeza_por_placa"', {
          requestKey: null,
        })
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
      await pb.collection('configuracoes').update(recordExistente.id, payload, { requestKey: null })
    } else {
      try {
        await pb.collection('configuracoes').create(payload, { requestKey: null })
      } catch (createErr) {
        const itemRecente = await pb
          .collection('configuracoes')
          .getFirstListItem<ConfiguracaoItem>('chave = "valor_limpeza_por_placa"', {
            requestKey: null,
          })
        if (itemRecente?.id) {
          await pb.collection('configuracoes').update(itemRecente.id, payload, { requestKey: null })
        } else {
          throw createErr
        }
      }
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

/**
 * Obtém a configuração padrão do bloco de avaliação no Google para o Relatório de OS.
 * Busca no PocketBase ('avaliacao_google_config_padrao') -> localStorage -> fallback do sistema.
 */
export async function getAvaliacaoGoogleConfigPadrao(): Promise<AvaliacaoGoogleConfigPadrao> {
  const padrao: AvaliacaoGoogleConfigPadrao = {
    titulo: TITULO_AVALIACAO_GOOGLE_PADRAO,
    texto: TEXTO_AVALIACAO_GOOGLE_PADRAO,
    link: LINK_AVALIACAO_GOOGLE_PADRAO,
  }

  try {
    const record = await pb
      .collection('configuracoes')
      .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_AVALIACAO_GOOGLE_PADRAO}"`, {
        requestKey: null,
      })

    if (record) {
      let cfg: AvaliacaoGoogleConfigPadrao | null = null
      if (record.dados && typeof record.dados === 'object') {
        cfg = {
          titulo: String(record.dados.titulo || padrao.titulo),
          texto: String(record.dados.texto || record.valor || padrao.texto),
          link: String(record.dados.link || padrao.link),
        }
      } else if (record.valor) {
        cfg = {
          ...padrao,
          texto: record.valor,
        }
      }

      if (cfg) {
        try {
          localStorage.setItem(STORAGE_KEY_AVALIACAO_GOOGLE, JSON.stringify(cfg))
        } catch {
          /* ignore */
        }
        return cfg
      }
    }
  } catch (err) {
    console.warn('[configuracoesService] Falha ao ler avaliacao_google_config_padrao:', err)
  }

  return getAvaliacaoGoogleConfigCacheSync()
}

/**
 * Leitura síncrona do cache local de avaliação no Google.
 */
export function getAvaliacaoGoogleConfigCacheSync(): AvaliacaoGoogleConfigPadrao {
  const padrao: AvaliacaoGoogleConfigPadrao = {
    titulo: TITULO_AVALIACAO_GOOGLE_PADRAO,
    texto: TEXTO_AVALIACAO_GOOGLE_PADRAO,
    link: LINK_AVALIACAO_GOOGLE_PADRAO,
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY_AVALIACAO_GOOGLE)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && typeof parsed === 'object') {
        return {
          titulo: String(parsed.titulo || padrao.titulo),
          texto: String(parsed.texto || padrao.texto),
          link: String(parsed.link || padrao.link),
        }
      }
    }
  } catch {
    /* ignore */
  }

  return padrao
}

/**
 * Salva a configuração padrão do bloco de avaliação no Google no PocketBase e localStorage.
 */
export async function setAvaliacaoGoogleConfigPadrao(
  config: Partial<AvaliacaoGoogleConfigPadrao>,
): Promise<AvaliacaoGoogleConfigPadrao> {
  const finalConfig: AvaliacaoGoogleConfigPadrao = {
    titulo: (config.titulo ?? TITULO_AVALIACAO_GOOGLE_PADRAO).trim(),
    texto: (config.texto ?? TEXTO_AVALIACAO_GOOGLE_PADRAO).trim(),
    link: (config.link ?? LINK_AVALIACAO_GOOGLE_PADRAO).trim(),
  }

  try {
    localStorage.setItem(STORAGE_KEY_AVALIACAO_GOOGLE, JSON.stringify(finalConfig))
  } catch {
    /* ignore */
  }

  try {
    let recordExistente: ConfiguracaoItem | null = null
    try {
      recordExistente = await pb
        .collection('configuracoes')
        .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_AVALIACAO_GOOGLE_PADRAO}"`, {
          requestKey: null,
        })
    } catch {
      recordExistente = null
    }

    const payload = {
      chave: CHAVE_AVALIACAO_GOOGLE_PADRAO,
      valor: finalConfig.texto,
      dados: finalConfig,
      descricao: 'Configuração padrão de solicitação de avaliação no Google para o Relatório da OS',
    }

    if (recordExistente?.id) {
      await pb.collection('configuracoes').update(recordExistente.id, payload, { requestKey: null })
    } else {
      try {
        await pb.collection('configuracoes').create(payload, { requestKey: null })
      } catch (createErr) {
        const itemRecente = await pb
          .collection('configuracoes')
          .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_AVALIACAO_GOOGLE_PADRAO}"`, {
            requestKey: null,
          })
        if (itemRecente?.id) {
          await pb.collection('configuracoes').update(itemRecente.id, payload, { requestKey: null })
        } else {
          throw createErr
        }
      }
    }
  } catch (err) {
    console.error(
      '[configuracoesService] Erro ao persistir avaliacao_google_config_padrao no PocketBase:',
      err,
    )
    throw err
  }

  return finalConfig
}

export interface OfertaLimpezaConfigPadrao {
  mensagem: string
  percentualPerda: number
}

/**
 * Obtém o modelo de mensagem e percentual padrão para Oferta de Limpeza Avulsa.
 * Prioridade: PocketBase ('oferta_limpeza_config_padrao') -> localStorage -> fallback padrão.
 */
export async function getOfertaLimpezaConfigPadrao(
  fallbackMensagem: string,
  fallbackPercentual: number = 30,
): Promise<OfertaLimpezaConfigPadrao> {
  // 1. Tenta PocketBase
  try {
    const record = await pb
      .collection('configuracoes')
      .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_OFERTA_LIMPEZA_PADRAO}"`, {
        requestKey: null,
      })

    if (record) {
      const msg = (record.dados?.mensagem as string) || (record.valor as string) || fallbackMensagem
      const perc =
        typeof record.dados?.percentual_perda === 'number'
          ? record.dados.percentual_perda
          : fallbackPercentual

      if (msg) {
        try {
          localStorage.setItem(STORAGE_KEY_OFERTA_LIMPEZA_MENSAGEM, msg)
          localStorage.setItem(STORAGE_KEY_OFERTA_LIMPEZA_PERCENTUAL, perc.toString())
        } catch {
          /* ignore */
        }
        return { mensagem: msg, percentualPerda: perc }
      }
    }
  } catch (err) {
    console.warn(
      '[configuracoesService] Falha ao ler oferta_limpeza_config_padrao do backend:',
      err,
    )
  }

  // 2. Fallback síncrono local
  return getOfertaLimpezaConfigCacheSync(fallbackMensagem, fallbackPercentual)
}

/**
 * Leitura síncrona do cache local da configuração de oferta de limpeza.
 */
export function getOfertaLimpezaConfigCacheSync(
  fallbackMensagem: string,
  fallbackPercentual: number = 30,
): OfertaLimpezaConfigPadrao {
  let mensagem = fallbackMensagem
  let percentualPerda = fallbackPercentual

  try {
    const cachedMsg = localStorage.getItem(STORAGE_KEY_OFERTA_LIMPEZA_MENSAGEM)
    if (cachedMsg && cachedMsg.trim().length > 0) {
      mensagem = cachedMsg
    }
    const cachedPerc = localStorage.getItem(STORAGE_KEY_OFERTA_LIMPEZA_PERCENTUAL)
    if (cachedPerc) {
      const num = parseFloat(cachedPerc)
      if (!isNaN(num) && num > 0) {
        percentualPerda = num
      }
    }
  } catch {
    /* ignore */
  }

  return { mensagem, percentualPerda }
}

/**
 * Salva a mensagem e percentual de perda como novo padrão durável de oferta de limpeza.
 * Persiste imediatamente em localStorage e assincronamente no PocketBase.
 */
export async function setOfertaLimpezaConfigPadrao(config: {
  mensagem: string
  percentualPerda: number
}): Promise<OfertaLimpezaConfigPadrao> {
  const finalConfig: OfertaLimpezaConfigPadrao = {
    mensagem: config.mensagem.trim(),
    percentualPerda: Math.max(1, Math.min(100, Math.round(config.percentualPerda))),
  }

  // 1. Grava no localStorage para carregamento imediato
  try {
    localStorage.setItem(STORAGE_KEY_OFERTA_LIMPEZA_MENSAGEM, finalConfig.mensagem)
    localStorage.setItem(
      STORAGE_KEY_OFERTA_LIMPEZA_PERCENTUAL,
      finalConfig.percentualPerda.toString(),
    )
  } catch {
    /* ignore */
  }

  // 2. Persiste no PocketBase com create/update explícito e requestKey: null
  try {
    let recordExistente: ConfiguracaoItem | null = null
    try {
      recordExistente = await pb
        .collection('configuracoes')
        .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_OFERTA_LIMPEZA_PADRAO}"`, {
          requestKey: null,
        })
    } catch {
      recordExistente = null
    }

    const payload = {
      chave: CHAVE_OFERTA_LIMPEZA_PADRAO,
      valor: finalConfig.mensagem,
      dados: {
        mensagem: finalConfig.mensagem,
        percentual_perda: finalConfig.percentualPerda,
      },
      descricao: 'Modelo de mensagem e percentual padrão da oferta de limpeza avulsa',
    }

    if (recordExistente?.id) {
      await pb.collection('configuracoes').update(recordExistente.id, payload, { requestKey: null })
    } else {
      // Se não existir, tenta criar; se houver conflito de índice único concorrente, busca novamente e faz update
      try {
        await pb.collection('configuracoes').create(payload, { requestKey: null })
      } catch (createErr) {
        const itemRecente = await pb
          .collection('configuracoes')
          .getFirstListItem<ConfiguracaoItem>(`chave = "${CHAVE_OFERTA_LIMPEZA_PADRAO}"`, {
            requestKey: null,
          })
        if (itemRecente?.id) {
          await pb.collection('configuracoes').update(itemRecente.id, payload, { requestKey: null })
        } else {
          throw createErr
        }
      }
    }

    // Atualiza novamente o cache após confirmação de sucesso da persistência
    try {
      localStorage.setItem(STORAGE_KEY_OFERTA_LIMPEZA_MENSAGEM, finalConfig.mensagem)
      localStorage.setItem(
        STORAGE_KEY_OFERTA_LIMPEZA_PERCENTUAL,
        finalConfig.percentualPerda.toString(),
      )
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.error(
      '[configuracoesService] Erro ao persistir oferta_limpeza_config_padrao no PocketBase:',
      err,
    )
    throw err
  }

  return finalConfig
}

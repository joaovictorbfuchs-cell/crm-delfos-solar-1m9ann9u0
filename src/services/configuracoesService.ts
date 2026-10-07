import pb from '@/lib/pocketbase/client'

export const STORAGE_KEY_VALOR_POR_PLACA = 'delfos_valor_limpeza_por_placa'
export const VALOR_POR_PLACA_PADRAO_SISTEMA = 8.0

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

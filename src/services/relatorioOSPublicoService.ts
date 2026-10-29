// src/services/relatorioOSPublicoService.ts
/**
 * Serviço para carregamento público e resiliente de Relatórios de OS / Atividades.
 *
 * Busca via endpoint público de hook (/backend/v1/relatorio-os/public/:id) que roda
 * com privilégios de backend e isola completamente de regras user-scoped da sessão
 * do usuário logado (ex.: técnico João vs Daniel vs cliente anônimo).
 *
 * Mantém suporte transparente a:
 * - ID direto de atividades
 * - ID direto de ordens_servico
 * - Fallback por registro_original_id
 * - Fallback por chave_importacao
 * - Fallback de rede direto ao PocketBase caso o hook não responda
 */

import pb from '@/lib/pocketbase/client'
import { isAuthSessionError } from '@/lib/pocketbase/errors'

export interface RelatorioOSPublicoResponse {
  ok: boolean
  registro: any
  cliente?: any
  usina?: any
  contratoOM?: any
  temContratoOMAtivo?: boolean
  equipamentosUsina?: any[]
  ativosUsina?: any[]
  error?: string
}

/**
 * Busca os dados do relatório de OS ou Atividade de forma pública.
 * Não depende de login nem de quem é o responsável cadastrado na atividade.
 */
export async function obterRelatorioOSPublico(
  idOuChave: string,
): Promise<RelatorioOSPublicoResponse> {
  const cleanId = String(idOuChave || '').trim()
  if (!cleanId) {
    throw new Error('Identificador da Ordem de Serviço não informado.')
  }

  // 1. Tentar primeiro o endpoint de hook público (mais rápido, livre de regras user-scoped e sem N+1 queries)
  try {
    const res = await pb.send<RelatorioOSPublicoResponse>(
      `/backend/v1/relatorio-os/public/${encodeURIComponent(cleanId)}`,
      {
        method: 'GET',
      },
    )

    if (res && res.ok && res.registro) {
      return res
    }
  } catch (err: any) {
    // Se o backend retornou 404 explícito do hook com a mensagem de que não encontrou, repassar
    if (err?.status === 404) {
      // Deixar tentar o fallback client-side antes de desistir
    } else {
      console.warn('Endpoint público de relatório retornou erro, tentando fallback direto:', err)
    }
  }

  // 2. Fallback resiliente usando as coleções do PocketBase
  let registro: any = null

  // 2.1 Buscar em atividades por id direto
  try {
    registro = await pb.collection('atividades').getOne(cleanId, {
      expand: 'cliente_id,usina_id,responsavel_id',
    })
  } catch (e: any) {
    if (isAuthSessionError(e)) {
      // Ignora erro de sessão no link público
    }
  }

  // 2.2 Buscar em ordens_servico por id direto
  if (!registro) {
    try {
      registro = await pb.collection('ordens_servico').getOne(cleanId, {
        expand: 'cliente_id,sistema_id,responsavel_usuario_id,profissional_id',
      })
    } catch {
      /* intentionally ignored */
    }
  }

  // 2.3 Fallback por registro_original_id ou chave_importacao em atividades
  if (!registro) {
    try {
      const safeFilter = `registro_original_id = "${cleanId}" || chave_importacao ~ "${cleanId}"`
      const atvs = await pb.collection('atividades').getList(1, 1, {
        filter: safeFilter,
        expand: 'cliente_id,usina_id,responsavel_id',
      })
      if (atvs.items && atvs.items.length > 0) {
        registro = atvs.items[0]
      }
    } catch {
      /* intentionally ignored */
    }
  }

  // 2.4 Fallback por registro_original_id ou chave_importacao em ordens_servico
  if (!registro) {
    try {
      const safeFilter = `registro_original_id = "${cleanId}" || chave_importacao ~ "${cleanId}"`
      const osList = await pb.collection('ordens_servico').getList(1, 1, {
        filter: safeFilter,
        expand: 'cliente_id,sistema_id,responsavel_usuario_id,profissional_id',
      })
      if (osList.items && osList.items.length > 0) {
        registro = osList.items[0]
      }
    } catch {
      /* intentionally ignored */
    }
  }

  if (!registro) {
    throw new Error('Relatório não encontrado no sistema.')
  }

  // Carregar dados vinculados no modo fallback
  const clienteFinal =
    registro.expand?.cliente_id ||
    (registro.cliente_id
      ? await pb
          .collection('clientes')
          .getOne(registro.cliente_id)
          .catch(() => null)
      : null)

  const clienteIdFinal = clienteFinal?.id || registro.cliente_id
  let contratoOMCliente: any = null
  let temContratoOMAtivo = false

  if (clienteIdFinal) {
    try {
      const contratos = await pb.collection('contratos_om').getList(1, 10, {
        filter: `cliente_id = "${clienteIdFinal}"`,
      })
      const listaContratos = contratos?.items || []
      contratoOMCliente =
        listaContratos.find((c: any) => {
          const st = String(c?.status || '').toLowerCase()
          const enc = String(c?.status_encerramento || '').toLowerCase()
          return (
            !st.includes('encerrado') && !st.includes('cancelado') && !enc.includes('encerrado')
          )
        }) ||
        listaContratos[0] ||
        null

      temContratoOMAtivo = Boolean(
        contratoOMCliente &&
        !String(contratoOMCliente?.status || '')
          .toLowerCase()
          .includes('encerrado') &&
        !String(contratoOMCliente?.status || '')
          .toLowerCase()
          .includes('cancelado') &&
        !String(contratoOMCliente?.status_encerramento || '')
          .toLowerCase()
          .includes('encerrado'),
      )
    } catch {
      /* intentionally ignored */
    }
  }

  let usinaObj = registro.expand?.usina_id || registro.expand?.sistema_id || null
  const usinaId =
    registro.usina_id ||
    registro.sistema_id ||
    (typeof registro.expand?.usina_id === 'string'
      ? registro.expand.usina_id
      : registro.expand?.usina_id?.id) ||
    null

  if (!usinaObj && usinaId) {
    usinaObj = await pb
      .collection('usinas')
      .getOne(usinaId)
      .catch(async () => {
        return await pb
          .collection('sistemas')
          .getOne(usinaId)
          .catch(() => null)
      })
  }

  const usinaIdFinal = usinaObj?.id || usinaId
  let equipamentosUsina: any[] = []
  let ativosUsina: any[] = []

  if (usinaIdFinal) {
    try {
      const [eqs, atvs] = await Promise.all([
        import('@/services/usinaEquipamentosService')
          .then((m) => m.fetchEquipamentosByUsinaId(usinaIdFinal))
          .catch(() => []),
        import('@/services/ativosService')
          .then((m) => m.fetchAtivosPorUsina(usinaIdFinal))
          .catch(() => []),
      ])
      equipamentosUsina = eqs || []
      ativosUsina = atvs || []
    } catch {
      /* intentionally ignored */
    }
  }

  return {
    ok: true,
    registro,
    cliente: clienteFinal,
    usina: usinaObj,
    contratoOM: contratoOMCliente,
    temContratoOMAtivo,
    equipamentosUsina,
    ativosUsina,
  }
}

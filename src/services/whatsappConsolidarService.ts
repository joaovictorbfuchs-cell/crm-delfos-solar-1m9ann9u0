import pb from '@/lib/pocketbase/client'

export interface DuplicataInfo {
  id: string
  numero: string
  created: string
  mensagensContidas: number
  mensagensMovidas: number
  mensagensDuplicadasExcluidas: number
}

export interface GrupoDuplicadoInfo {
  chave: string
  principalId: string
  principalNumero: string
  principalCreated: string
  totalDuplicatas: number
  duplicatas: DuplicataInfo[]
  mensagensAMover: number
  mensagensDuplicadasIgnoradas: number
}

export interface ConsolidarDuplicadasResponse {
  ok: boolean
  dryRun: boolean
  totalConversasAnalisadas: number
  totalGruposDuplicados: number
  totalConversasRemovidas: number
  totalMensagensMovidas: number
  totalMensagensDuplicadasExcluidas: number
  grupos: GrupoDuplicadoInfo[]
  error?: string
}

/**
 * Executa a consolidação de conversas duplicadas do WhatsApp no backend.
 * Por padrão roda com dryRun=true (não altera nem remove nada, apenas lista).
 * Quando dryRun=false, move as mensagens das conversas duplicadas para a mais antiga e exclui as duplicatas.
 */
export async function consolidarConversasDuplicadasWhatsApp(
  dryRun: boolean = true,
): Promise<ConsolidarDuplicadasResponse> {
  return pb.send<ConsolidarDuplicadasResponse>('/backend/v1/whatsapp/consolidar-duplicadas', {
    method: 'POST',
    body: {
      dry_run: dryRun,
    },
  })
}

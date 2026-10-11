import pb from '@/lib/pocketbase/client'

export interface DetalheEnvioDiario {
  userId: string
  name: string
  email?: string
  status: string
  resendId?: string
  atrasadas?: number
  doDia?: number
  error?: string
  statusCode?: number
}

export interface ResumoEnvioDiarioResponse {
  ok: boolean
  hoje: string
  totalUsuarios: number
  enviados: number
  pulados: number
  falhas: number
  detalhes: DetalheEnvioDiario[]
  error?: string
}

/**
 * Dispara ou simula manualmente o processamento do e-mail diário de atividades.
 * @param dryRun Se true, simula sem enviar e-mails reais via Resend
 * @param userId Opcional: restringe a execução a um único ID de usuário
 */
export async function dispararEmailDiarioAtividadesManual(
  dryRun: boolean = false,
  userId?: string,
): Promise<ResumoEnvioDiarioResponse> {
  return pb.send<ResumoEnvioDiarioResponse>('/backend/v1/email-diario/executar', {
    method: 'POST',
    body: {
      dry_run: dryRun,
      user_id: userId || undefined,
    },
  })
}

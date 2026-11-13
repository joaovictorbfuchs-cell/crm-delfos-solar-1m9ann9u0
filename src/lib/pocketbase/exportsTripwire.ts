// Tripwire estático de exports críticos do PocketBase.
//
// ⚠️ NÃO REMOVER: este módulo é importado por src/main.tsx e faz parte do grafo
// compilado pelo `tsc` no pipeline de QA. Ele referencia, EM TEMPO DE COMPILAÇÃO,
// cada export crítico de client.ts / errors.ts / index.ts. Se qualquer rodada
// futura apagar um export (regressão já ocorrida 12x neste projeto), o tsc
// falha com TS2305 ("has no exported member") ANTES do build — a perda é
// detectada automaticamente pelo QA, mesmo sem testes rodando.
import type * as ClientModule from './client'
import type * as ErrorsModule from './errors'
import type * as BarrelModule from './index'
import type * as RootClientModule from '@/lib/client'
import type * as RootErrorsModule from '@/lib/errors'
import type * as ServicesErrorsModule from '@/services/errors'

// Cada campo referenciado abaixo é uma exportação OBRIGATÓRIA do módulo.
// Remover o export quebra a compilação aqui: "Module ... has no exported member".
type ClientExports = [
  (typeof ClientModule)['default'],
  (typeof ClientModule)['pb'],
  (typeof ErrorsModule)['isAuthSessionError'],
  (typeof ErrorsModule)['isAbortError'],
  (typeof ErrorsModule)['formatPbError'],
  (typeof ErrorsModule)['extractFieldErrors'],
  (typeof ErrorsModule)['getErrorMessage'],
  (typeof BarrelModule)['default'],
  (typeof BarrelModule)['pb'],
  (typeof BarrelModule)['isAuthSessionError'],
  (typeof RootClientModule)['default'],
  (typeof RootClientModule)['pb'],
  (typeof RootClientModule)['isAuthSessionError'],
  (typeof RootErrorsModule)['isAuthSessionError'],
  (typeof RootErrorsModule)['isAbortError'],
  (typeof RootErrorsModule)['formatPbError'],
  (typeof RootErrorsModule)['extractFieldErrors'],
  (typeof RootErrorsModule)['getErrorMessage'],
  (typeof ServicesErrorsModule)['isAuthSessionError'],
  (typeof ServicesErrorsModule)['isAbortError'],
  (typeof ServicesErrorsModule)['formatPbError'],
]
// Garante que o tipo seja avaliado (não otimizado) e mantém o módulo vivo no grafo.
export type ExportsTripwire = ClientExports
export const EXPORTS_TRIPWIRE_ARITY: ClientExports['length'] = 21

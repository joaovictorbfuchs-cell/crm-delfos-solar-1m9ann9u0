// Guard de tempo de build (prebuild) contra a regressão recorrente dos exports
// canônicos de src/lib/pocketbase (13+ ocorrências registradas).
//
// Por que existe: o QA da plataforma roda lint/tsc/build, mas nem sempre o tsc
// é determinístico na detecção (e o exportsGuard.test.ts nunca roda na plataforma).
// Este script roda em TODOS os builds (`prebuild`) e verifica O TEXTO dos wrappers:
// se faltar qualquer reexport canônico, o build falha com mensagem explícita.
//
// É uma verificação de TEXTO (não AST) de propósito: os wrappers são minúsculos e
// canônicos; qualquer rewrite destrutivo remove as linhas de reexport. Anexos:
// - src/lib/pocketbase/errors_impl.ts — implementação única (nunca reescrever)
// - src/lib/pocketbase/exportsTripwire.ts — trava em tempo de TIPO via tsc (main.tsx)
// - docs/causa-raiz-exports-pocketbase.md — histórico e causa raiz
import fs from 'node:fs'
import path from 'node:path'

const errorsPath = path.resolve('src/lib/pocketbase/errors.ts')
const clientPath = path.resolve('src/lib/pocketbase/client.ts')

const failures = []

const errorsSrc = fs.readFileSync(errorsPath, 'utf8')
const clientSrc = fs.readFileSync(clientPath, 'utf8')

// errors.ts precisa reexportar os 3 helpers críticos do errors_impl
for (const name of ['isAuthSessionError', 'isAbortError', 'formatPbError']) {
  const hasReexport =
    new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*'\\./errors_impl'`, 's').test(
      errorsSrc,
    ) ||
    new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(errorsSrc) ||
    new RegExp(`export\\s\\*\\sfrom\\s'\\./errors_impl'`).test(errorsSrc)
  if (!hasReexport) {
    failures.push(`src/lib/pocketbase/errors.ts: faltando reexport de '${name}' de ./errors_impl`)
  }
}

// client.ts precisa ter default export de pb + named `pb` + reexport dos helpers
if (!/export\s+default\s+pb/.test(clientSrc)) {
  failures.push("src/lib/pocketbase/client.ts: faltando 'export default pb'")
}
if (!/export\s*\{\s*pb\s*\}/.test(clientSrc)) {
  failures.push("src/lib/pocketbase/client.ts: faltando 'export { pb }'")
}
for (const name of ['isAuthSessionError', 'isAbortError', 'formatPbError']) {
  if (!new RegExp(`\\b${name}\\b`).test(clientSrc)) {
    failures.push(`src/lib/pocketbase/client.ts: faltando reexport de '${name}'`)
  }
}

// errors_impl.ts precisa definir as implementações reais (não só reexportar)
const implSrc = fs.readFileSync(path.resolve('src/lib/pocketbase/errors_impl.ts'), 'utf8')
for (const name of [
  'isAuthSessionError',
  'isAbortError',
  'formatPbError',
  'extractFieldErrors',
  'getErrorMessage',
]) {
  if (!new RegExp(`export function ${name}\\b`).test(implSrc)) {
    failures.push(`src/lib/pocketbase/errors_impl.ts: faltando 'export function ${name}'`)
  }
}

if (failures.length > 0) {
  console.error(
    '\n✗ prebuild: exports canônicos do PocketBase foram degradados (regressão recorrente):\n' +
      failures.map((f) => '  - ' + f).join('\n') +
      '\n\nCorreção: NÃO reescrever os wrappers. Apenas ACRESCENTAR as linhas de reexport:\n' +
      "  errors.ts:  export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'\n" +
      '  client.ts:  export { pb }\n' +
      "  client.ts:  export { isAuthSessionError, isAbortError, formatPbError } from './errors_impl'\n",
  )
  process.exit(1)
}

console.log(
  '✓ prebuild: exports canônicos do PocketBase íntegros (errors.ts / client.ts / errors_impl.ts)',
)

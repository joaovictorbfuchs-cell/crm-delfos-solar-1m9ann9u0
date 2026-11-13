# Causa raiz da regressão recorrente de exports do PocketBase (12 ocorrências)

## Sintoma

Em rodadas de mudança, `src/lib/pocketbase/errors.ts` perde `isAuthSessionError`
(e às vezes `isAbortError`/`formatPbError`) e `src/lib/pocketbase/client.ts` perde
o reexport de `pb` (named) e `isAuthSessionError`. Importadores quebram em runtime
com ErrorBoundary (AuthContext, ClientesContext, AtividadesCalendario, chunks lazy
como o relatório público `/relatorio-fatura/:token`) mesmo quando o build às vezes
passa.

## Causa raiz (confirmada por grep no tree quebrado, v0.0.1693 → 12ª ocorrência)

**O mecanismo é a reescrita INTEGRAL desses arquivos por rodadas que mexem em
código adjacente.** Evidências desta rodada:

1. No tree quebrado, `grep isAuthSessionError` retornou **zero arquivos definindo
   a função** — nem cópia duplicada existia. Não era merge/conflito/barrel: os
   arquivos foram regenerados "de memória" pelo agente de escrita, com a parte
   "óbvia" do arquivo (extractFieldErrors/getErrorMessage em errors.ts; só
   `new PocketBase(...)` em client.ts) e sem os exports críticos que não estavam
   em jogo naquela rodada.
2. O arquivo frágil tinha implementação + salvaguarda no MESMO arquivo: um
   rewrite "de limpeza" derruba os dois de uma vez.
3. O guard existente (`exportsGuard.test.ts`) nunca roda — o pipeline de QA da
   plataforma não executa a suíte de testes do projeto (`pnpm test` roda só 3
   arquivos; o QA do builder roda setup/lint/tsc/build, não vitest).

## O que foi feito (estrutura à prova de perda)

1. **Implementação isolada**: `src/lib/pocketbase/errors_impl.ts` agora é a
   ÚNICA cópia da implementação real de `isAuthSessionError`, `isAbortError`,
   `formatPbError`, `extractFieldErrors`, `getErrorMessage` (semântica exata
   preservada: 401/403, status/statusCode/response.status, textos de token).
2. **Wrappers minúsculos**: `errors.ts` e `client.ts` viraram wrappers de ~10
   linhas que SÓ reexportam. Arquivos tão pequenos e com responsabilidade única
   têm muito menos atrito para serem reescritos — e se forem, a superfície de
   perda é mínima e óbvia.
3. **Tripwire no pipeline de QA**: `src/lib/pocketbase/exportsTripwire.ts`
   referencia cada export crítico em tempo de TIPO (não runtime), importado por
   `src/main.tsx` — logo, dentro do grafo compilado pelo `tsc --noEmit` do QA.
   Se qualquer export sumir, o tsc falha com TS2305 ("has no exported member")
   ANTES do build. Foi exatamente assim que o QA desta rodada pegou a perda
   já presente no tree: `errors.ts` e `client.ts` estavam quebrados no início
   dela, e o tripwire acusam os 7 pontos de quebra imediatamente.
4. **Duplicatas**: nenhuma outra cópia da implementação existe no repo (grep
   `export function isAuthSessionError` → só errors_impl.ts). As salvaguardas
   `src/lib/client.ts`, `src/lib/errors.ts`, `src/services/errors.ts` e
   `src/lib/pocketbase/index.ts` são reexports (não duplicam lógica) e também
   estão cobertas pelo tripwire.

## Regra para rodadas futuras

- **NUNCA reescrever `errors.ts`/`client.ts` inteiros** — mudar só o impl
  (`errors_impl.ts`) ou acrescentar linhas.
- Se uma rodada precisa remover algum desses exports, é uma quebra de contrato:
  atualizar o tripwire junto e justificar.
- Rodar `run_qa` e conferir QA verde antes de `commit_changes` (regra existente).

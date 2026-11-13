# Causa raiz da regressão recorrente de exports do PocketBase (13→14 ocorrências)

## Sintoma

Em rodadas de mudança, `src/lib/pocketbase/errors.ts` perde `isAuthSessionError`
(e às vezes `isAbortError`/`formatPbError`) e `src/lib/pocketbase/client.ts` perde
o reexport de `pb` (named) e dos helpers. Importadores quebram em runtime com
ErrorBoundary (AuthContext, ClientesContext, AtividadesCalendario, chunks lazy
como o relatório público `/relatorio-fatura/:token`) mesmo quando o build às
vezes passa.

## Investigação completa (v0.0.1696→14ª ocorrência) — o que foi verificado

Foi feita varredura exaustiva do repositório atrás de QUALQUER mecanismo que
escreva ou regenere arquivos em `src/lib/pocketbase/`:

1. **Scripts do repo**: os únicos `fs.writeFileSync` do repo são
   `scripts/auditoria-duplicados.mjs` (escreve relatório em `docs/`),
   `scripts/exportSchema.js` (gera xlsx em tmp) e `scripts/check_collections.js`
   (gera `scripts/output_cols.txt`). **Nenhum escreve em `src/lib/pocketbase/`.**
2. **Plugin Vite** (`vite-plugin-react-uid.js`): transform em memória, sem I/O
   em disco.
3. **Hooks pb_hooks / migrations**: nenhum referencia `errors.ts`, `client.ts` ou
   caminho `lib/pocketbase` (grep no diretório `pocketbase/` inteiro → zero).
4. **`src/lib/pocketbase/index.ts`, `src/lib/errors.ts`, `src/lib/client.ts`,
   `src/services/errors.ts`**: são salvaguardas de REEXPORT (não duplicam
   lógica) — não são a fonte.
5. **errors_impl.ts**: nunca foi degradado em nenhuma ocorrência — a perda é
   sempre e apenas nos wrappers.
6. **Config da plataforma** (`.skip.config.json`): a proteção de escrita da
   plataforma é a lista `preventAI`; os wrappers NÃO estão nela. Não há CI,
   git hooks, watch, sync ou copiador de templates no repo.

### Conclusão da causa raiz

**Não existe gerador, script, transform ou processo de build do repositório que
reescreva os wrappers.** O mecanismo é a própria rodada de edição (o agente de
escrita) reescrever os arquivos "de memória" ao mexer em código adjacente:
regenera só a parte "óbvia" do arquivo (extractFieldErrors/getErrorMessage em
errors.ts; só `new PocketBase(...)` em client.ts) e perde os reexports que não
estavam em jogo naquela rodada. Como os wrappers são minúsculos, a reescrita é
barata e passa despercebida — e como `errors_impl.ts` tem a implementação, o
dano é sempre "só" nos reexports.

## Defesas em vigor (mantidas nesta rodada)

1. **Implementação isolada**: `errors_impl.ts` é a ÚNICA cópia da implementação
   real (`isAuthSessionError`, `isAbortError`, `formatPbError`,
   `extractFieldErrors`, `getErrorMessage`).
2. **Wrappers minúsculos de reexport** (`errors.ts`, `client.ts`) — nunca
   reescrever inteiros; se um export sumir, ACRESCENTAR a linha de reexport.
3. **Tripwire de tipo** (`exportsTripwire.ts`, via `main.tsx`): tsc falha com
   TS2305 se qualquer export crítico sumir. Pegou as ocorrências 12–14.
4. **NOVO — guard de TEXTO em tempo de build**:
   `scripts/check-exports-pocketbase.mjs` verifica os reexports canônicos nos
   três arquivos e falha o build com instrução de correção. Para rodar em todos
   os builds, o `package.json` (protegido, `preventAI`) precisa da linha
   adicionada MANUALMENTE pelo dono do projeto:
   `"prebuild": "node scripts/check-exports-pocketbase.mjs"`.
5. **Opcional (recomendado, requer ação do dono)**: acrescentar em
   `.skip.config.json` → `"preventAI"`:
   `"src/lib/pocketbase/errors.ts"`, `"src/lib/pocketbase/client.ts"`,
   `"src/lib/pocketbase/errors_impl.ts"` — isso impede que o próprio agente
   escreva nesses arquivos, eliminando a causa (reescrita de memória) e não
   apenas detectando o efeito. Alternativa mais branda: mover os wrappers para
   um subdiretório de baixo tráfego (ex.: `src/lib/pocketbase/core/`) e só
   reexportar de lá — reduz a chance de serem arrastados por rodadas de
   enxugamento.

## Regra para rodadas futuras

- **NUNCA reescrever `errors.ts`/`client.ts` inteiros** — mudar só o impl
  (`errors_impl.ts`) ou acrescentar linhas.
- Se uma rodada precisa remover algum desses exports, é quebra de contrato:
  atualizar o tripwire junto e justificar.
- Rodar `run_qa` e conferir QA verde antes de `commit_changes` (regra existente).

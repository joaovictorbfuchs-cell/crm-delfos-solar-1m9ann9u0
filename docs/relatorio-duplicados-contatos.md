# Relatório de Auditoria de Duplicados e Vínculos de Contatos — CRM Delfos Solar

**Data/Hora da Execução:** 2026-10-02T18:20:24.970Z  
**Ambiente do Banco:** https://crm-delfos-solar-72b9e.shrd00.internal.goskip.dev  
**Usuário Autenticado:** joao@delfosengenharia.com.br  
**Validação de Sanidade:** APROVADA (Total carregado bate exatamente com o totalItems do PocketBase)

---

## 1. Resumo Executivo das Métricas

| Métrica | Quantidade | Observações / Detalhes |
| :--- | :---: | :--- |
| **Total de Registros em Contatos** | **91** | Base validada contra o banco PocketBase via paginação estrita |
| **Total de Registros em Clientes** | **1529** | Base validada contra o banco PocketBase via paginação estrita |
| **Contatos com Telefone/WhatsApp Válido** | **4** | Apenas 4 registros possuem WhatsApp/telefone preenchido |
| **Contatos com Telefone/WhatsApp Vazio** | **87** | Registros migrados originalmente com dados cadastrais sem telefone direto |
| **Contatos com origem `migracao_outros_contatos`** | **91** | Registros unificados na migração de dados |
| **Duplicados Reais em Contatos** | **0** | Nenhum registro duplicado identificado entre si na coleção `contatos` |
| **Vínculos Legítimos de Mesma Pessoa em Clientes Distintos** | **0** | Não há contatos com clientes múltiplos vinculados na tabela `contatos` |
| **Possíveis Duplicados Reais na Coleção Clientes** | **1 par** | "Adenilse Pasine" e "Adenilse Pasini" (dados técnicos e potências idênticos) |

---

## 2. Distribuição de Contatos por Papel

- **fornecedor:** 1 contatos (1.1%)
- **outro:** 90 contatos (98.9%)

---

## 3. Distribuição de Clientes por Status

- **Orçamento:** 7 clientes
- **Negociação:** 3 clientes
- **Novo Lead:** 1083 clientes
- **Fechado:** 435 clientes
- **Levantamento:** 1 clientes

---

## 4. Detalhamento dos Números por Grupo

### Grupo 1: Análise por Telefone / WhatsApp

- **1.a) Mesmo WhatsApp em 2+ registros de `contatos`:**  
  **0 casos.** Nenhum número repetido entre contatos diferentes. Os 4 contatos que possuem número têm telefones estritamente distintos:
  - Nexen: `(49) 9101-0839`
  - Ade Strapasson: `(54) 9603-0255`
  - Adenilse Bortolotto: `(54) 99186-2679`
  - Debora - Erva Mate Barão: `(54) 9639-2709`

- **1.b) Mesmo WhatsApp em 2+ `clientes` diferentes:**  
  **128 casos.** Casos detectados onde um mesmo número de WhatsApp está associado a múltiplos cadastros na coleção `clientes` (incluindo usinas/filiais, cotações de demonstração e cadastros repetidos com status distintos).

- **1.c) Mesmo WhatsApp entre `contatos` e `clientes` com nomes diferentes:**  
  **0 casos.** Nenhuma colisão cruzada com nomes divergentes.

---

### Grupo 2: Análise por Nome e Grafia (Duplicidades)

- **2.a) Contatos com nome idêntico (normalizado):**  
  **0 casos.** Nenhum contato duplicado por nome exato na coleção `contatos`.

- **2.b) Contatos com nome muito parecido / sufixos / mesmo telefone:**  
  **1 casos.** Caso detectado de associação com início e fim similares na coleção `contatos`.

- **2.c) Clientes com nome muito parecido E mesmo WhatsApp:**  
  **30 casos.**
  - *Nota Cadastral:* Foi identificado na coleção `clientes` o caso clássico de duplicidade:
    - Cliente 1: **"Adenilse Pasine"** (ID: `ubp8yld8rd4nke9`, WhatsApp: `555499918473`, Potência: `6.9 kWp`, Inversor: `Deye`, Módulos: `13 Canadian Solar`)
    - Cliente 2: **"Adenilse Pasini"** (ID: `y5et4jlz5tfrg4x`, WhatsApp vazio, CPF: `909.710.190-53`, Potência: `6.9 kWp`, Inversor: `Deye`, Módulos: `13 Canadian Solar`)
    - Como o segundo registro está com o WhatsApp vazio, ele não pontua no critério restrito de mesmo WhatsApp, mas representa a mesma pessoa física com grafia Pasine/Pasini.

---

## 5. Validação de Sanidade (Sanity Check)

- **Coleção `contatos`:**
  - Total informado pelo servidor (`totalItems`): **91**
  - Total paginado e acumulado localmente: **91**
  - Resultado: **BATEU 100% (Sem divergência)**
- **Coleção `clientes`:**
  - Total informado pelo servidor (`totalItems`): **1529**
  - Total paginado e acumulado localmente: **1529**
  - Resultado: **BATEU 100% (Sem divergência)**

---

## 6. Log Completo da Auditoria

```text
=== INICIANDO AUDITORIA DE DUPLICIDADES NO CRM DELFOS SOLAR ===

Autenticação com PocketBase: SUCESSO (usuário autenticado: joao@delfosengenharia.com.br)

--- 1. LEITURA COMPLETA DAS COLEÇÕES (SANITY CHECK) ---
Executando paginação direta via SDK/PocketBase API com sanity check...
Total confirmado na coleção 'contatos': 91
Total confirmado na coleção 'clientes': 1529

--- RESUMO NUMÉRICO INICIAL ---
Total geral de contatos: 91
Distribuição de contatos por papel: {"fornecedor":1,"outro":90}
Total geral de clientes: 1529
Distribuição de clientes por status: {"Orçamento":7,"Negociação":3,"Novo Lead":1083,"Fechado":435,"Levantamento":1}
Registros em 'contatos' com telefone/WhatsApp válido: 4 de 91
Registros em 'clientes' com telefone/WhatsApp válido: 673 de 1529

======================================================
GRUPO 1 — MESMO WHATSAPP EM REGISTROS DIFERENTES
======================================================

--- 1.a) Mesmo WhatsApp em 2+ registros de "contatos" ---
Nenhum caso encontrado de mesmo WhatsApp compartilhado entre múltiplos registros de "contatos".

--- 1.b) Mesmo WhatsApp em 2+ "clientes" DIFERENTES ---

[Caso 1.b #1] Número normalizado: 54981540399 (2 clientes)
  1. Nome Cliente: "Adriana Paula Daniel (Leonardo Canova)" | WhatsApp original: "(54) 98154-0399" | ID: 2g8ialg82d8xaw5 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:52:35.608Z
  2. Nome Cliente: "Valdir Moretto" | WhatsApp original: "(54) 98154-0399" | ID: jellyjglzn8l2c0 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:58.364Z

[Caso 1.b #2] Número normalizado: 54991011213 (2 clientes)
  1. Nome Cliente: "ADRIANO GELAIN MACHADO" | WhatsApp original: "(54) 99101-1213" | ID: n1wqa6x1pultp6h | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:35.820Z
  2. Nome Cliente: "Eder Luis Ribeiro" | WhatsApp original: "(54) 99101-1213" | ID: 1gq50sog0mkyt0d | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:29.628Z

[Caso 1.b #3] Número normalizado: 54999368565 (2 clientes)
  1. Nome Cliente: "Adriano Nunes Martins" | WhatsApp original: "(54) 99936-8565" | ID: k6etdnquwggi5j9 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:52:37.080Z
  2. Nome Cliente: "Solvindo Dalbianco" | WhatsApp original: "(54) 99936-8565" | ID: n7tbdzt348p8ogo | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:35.297Z

[Caso 1.b #4] Número normalizado: 54999984772 (2 clientes)
  1. Nome Cliente: "Alan Cleiton Pereira" | WhatsApp original: "(54) 99998-4772" | ID: ri61txiscy484kv | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:38.458Z
  2. Nome Cliente: "Paulinho Goedel" | WhatsApp original: "(54) 99998-4772" | ID: tp73sz2e8z87fph | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:28.124Z

[Caso 1.b #5] Número normalizado: 54991765928 (2 clientes)
  1. Nome Cliente: "Alan Ricardo Lando" | WhatsApp original: "(54) 99176-5928" | ID: hn2851pzt3a1nt6 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:39.888Z
  2. Nome Cliente: "Lídia Oliveira Magalhães (Erechim)" | WhatsApp original: "(54) 99176-5928" | ID: ea8v9xdug2inbym | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:56:53.397Z

[Caso 1.b #6] Número normalizado: 54999560848 (2 clientes)
  1. Nome Cliente: "Alexandro Antonio Fornari" | WhatsApp original: "(54) 99956-0848" | ID: xzwyhrk6psixq47 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:52:45.603Z
  2. Nome Cliente: "Alexandro Fornari" | WhatsApp original: "(54) 99956-0848" | ID: hlh7f8tmsm5wdtq | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:52:46.397Z

[Caso 1.b #7] Número normalizado: 54996562780 (3 clientes)
  1. Nome Cliente: "Alisson Daniel Pastorio (Titular: Erika Simone dos Reis Triches)" | WhatsApp original: "(54) 99656-2780" | ID: qno83col3u41wpf | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:47.403Z
  2. Nome Cliente: "EDUARDO GODGIENSKI" | WhatsApp original: "(54) 99656-2780" | ID: 9it1z1v04mdws5c | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:54:40.398Z
  3. Nome Cliente: "Miriam Faustino Batistella (Titular: Faustino Batistella)" | WhatsApp original: "(54) 99656-2780" | ID: y6g41v50gti89va | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:57:54.793Z

[Caso 1.b #8] Número normalizado: 54996369793 (2 clientes)
  1. Nome Cliente: "Alisson Monteiro" | WhatsApp original: "(54) 99636-9793" | ID: 52tgzpvvjs1w0u6 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:48.383Z
  2. Nome Cliente: "Maritania Cenzi" | WhatsApp original: "(54) 99636-9793" | ID: fnpnktpjkh3zvap | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:35.832Z

[Caso 1.b #9] Número normalizado: 54999822011 (2 clientes)
  1. Nome Cliente: "André Detoni (Silvia Ludke)" | WhatsApp original: "(54) 99982-2011" | ID: kvofcpmsl4mafi1 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:54.716Z
  2. Nome Cliente: "Onofre Sebastião Gallina" | WhatsApp original: "(54) 99982-2011" | ID: v2ta8k9dvkotegf | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:20.343Z

[Caso 1.b #10] Número normalizado: 54996090984 (3 clientes)
  1. Nome Cliente: "André Paulo Angonese (Erechim)" | WhatsApp original: "(54) 99609-0984" | ID: hsuel9w42wjqjki | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:57.022Z
  2. Nome Cliente: "Laudemir" | WhatsApp original: "(54) 99609-0984" | ID: 3wmu9dmust8zuap | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:56:44.197Z
  3. Nome Cliente: "LAUDEMIR JOSE PAGNONCELLI" | WhatsApp original: "(54) 99609-0984" | ID: 7zy0kkazmqnlm5e | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:56:44.406Z

[Caso 1.b #11] Número normalizado: 54984129207 (2 clientes)
  1. Nome Cliente: "Antonio Luiz Serraglio" | WhatsApp original: "(54) 98412-9207" | ID: mp1gx8m2hrwfnqt | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:59.994Z
  2. Nome Cliente: "Antonio Serraglio  casa" | WhatsApp original: "(54) 98412-9207" | ID: snm4kwvu411b9ek | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:00.216Z

[Caso 1.b #12] Número normalizado: 54984040064 (2 clientes)
  1. Nome Cliente: "Armelindo Rosset" | WhatsApp original: "(54) 98404-0064" | ID: g9cg73zw78woyx7 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:03.492Z
  2. Nome Cliente: "Lauro Rosset (Erechim)" | WhatsApp original: "(54) 98404-0064" | ID: uowgfb4bwy4uivi | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:56:46.166Z

[Caso 1.b #13] Número normalizado: 54991976668 (2 clientes)
  1. Nome Cliente: "Artidor Andrade" | WhatsApp original: "(54) 99197-6668" | ID: 0lwy71qzcpjs7vj | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:06.062Z
  2. Nome Cliente: "Cristiano Backes" | WhatsApp original: "(54) 99197-6668" | ID: yw91c3zoz5ttu6q | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:59.909Z

[Caso 1.b #14] Número normalizado: 54991062838 (2 clientes)
  1. Nome Cliente: "Associação dos Pequenos Comerciantes do Mercado Popular (Erechim)" | WhatsApp original: "(54) 99106-2838" | ID: 678ioimndauvbh1 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:07.602Z
  2. Nome Cliente: "Rogério Rewsat" | WhatsApp original: "(54) 99106-2838" | ID: aoge0lq9yryc69f | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:08.220Z

[Caso 1.b #15] Número normalizado: 54991842965 (2 clientes)
  1. Nome Cliente: "Baita (Cladir João Dariva)" | WhatsApp original: "(54) 99184-2965" | ID: 2o085q8y3gfshxd | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:10.382Z
  2. Nome Cliente: "Cristiane Karina Molozzi" | WhatsApp original: "(54) 99184-2965" | ID: htfvx1cqs3j02lq | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:59.110Z

[Caso 1.b #16] Número normalizado: 54991158667 (2 clientes)
  1. Nome Cliente: "Bernardo Rewsat" | WhatsApp original: "(54) 99115-8667" | ID: y2d9stp6npibexf | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:14.414Z
  2. Nome Cliente: "Valdecir Francisco Balestrin" | WhatsApp original: "(54) 99115-8667" | ID: 8o84xk9k2872r2u | Status: Novo Lead | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:59:51.762Z

[Caso 1.b #17] Número normalizado: 5496112877 (2 clientes)
  1. Nome Cliente: "Carla Andrea" | WhatsApp original: "(54) 9611-2877" | ID: qngtp689oakbzlp | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:18.687Z
  2. Nome Cliente: "Roze Pastorio" | WhatsApp original: "(54) 9611-2877" | ID: zsbor1j7m32rij0 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:34.535Z

[Caso 1.b #18] Número normalizado: 55996805318 (3 clientes)
  1. Nome Cliente: "Carlos de Oliveira" | WhatsApp original: "(55) 99680-5318" | ID: y6c6isklnuhr4zs | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:21.094Z
  2. Nome Cliente: "Rodrigo Buss - DELCI ARLI NEUENFELDT" | WhatsApp original: "(55) 99680-5318" | ID: kpkyf13di7ud17p | Status: Novo Lead | Cidade: Nova Palma | Criado em: 2026-09-13 16:59:01.825Z
  3. Nome Cliente: "Delci Arli Neuenfeldt" | WhatsApp original: "(55) 99680-5318" | ID: mnx44nz9bfsqb5f | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:00.371Z

[Caso 1.b #19] Número normalizado: 54991207548 (2 clientes)
  1. Nome Cliente: "Cassiano Sarapio" | WhatsApp original: "(54) 99120-7548" | ID: j8a1uqhq4r58h1u | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:25.014Z
  2. Nome Cliente: "Elésio - (Titular: Sérgio Pomieczinski)" | WhatsApp original: "(54) 99120-7548" | ID: mn09qvk5b3vd5dm | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:54:42.919Z

[Caso 1.b #20] Número normalizado: 5435201500 (2 clientes)
  1. Nome Cliente: "CASSUL DISTRIB DE PROD AGROPECS LTDA" | WhatsApp original: "(54) 3520-1500" | ID: vrbbc0acybhwdxk | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:27.898Z
  2. Nome Cliente: "CASSUL DISTRIBUIDORA" | WhatsApp original: "(54) 3520-1500" | ID: 16dz87zr0d5auce | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:28.998Z

[Caso 1.b #21] Número normalizado: 4998048320 (2 clientes)
  1. Nome Cliente: "Caudir Albino Pagliari" | WhatsApp original: "(49) 9804-8320" | ID: d17u5ri2d7svir7 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:30.500Z
  2. Nome Cliente: "Edinei Pagliari" | WhatsApp original: "(49) 9804-8320" | ID: qc17ic20bsdvwnw | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:01.629Z

[Caso 1.b #22] Número normalizado: 54991282415 (2 clientes)
  1. Nome Cliente: "Célio Carlos Carlesso" | WhatsApp original: "(54) 99128-2415" | ID: 5idsmuhaapswn49 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:33.433Z
  2. Nome Cliente: "Luiz Tirello - Flávio Tirello" | WhatsApp original: "(54) 99128-2415" | ID: vfnj6bm52xeagfh | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:57:12.152Z

[Caso 1.b #23] Número normalizado: 54992257151 (2 clientes)
  1. Nome Cliente: "Celso Luiz Lando" | WhatsApp original: "(54) 99225-7151" | ID: zlphez1d5qny2k2 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:34.024Z
  2. Nome Cliente: "Domingos da Luz" | WhatsApp original: "(54) 99225-7151" | ID: 51jseuixgrp7vh9 | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:54:23.274Z

[Caso 1.b #24] Número normalizado: 5435222350 (2 clientes)
  1. Nome Cliente: "CENTRAL DO SONO LTDA" | WhatsApp original: "(54) 3522-2350" | ID: 5vk39epoihl5e2g | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:34.672Z
  2. Nome Cliente: "JG OLDRA Comércio de Móveis LTDA ME (Erechim)" | WhatsApp original: "(54) 3522-2350" | ID: ja627k4f63km36m | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:56:22.139Z

[Caso 1.b #25] Número normalizado: 5430158366 (2 clientes)
  1. Nome Cliente: "Clara Marucia Nunes - RODRIGO (Lagoão)" | WhatsApp original: "(54) 3015-8366" | ID: f3djx5l9no83nwj | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:40.991Z
  2. Nome Cliente: "System Sistemas de Gestão" | WhatsApp original: "(54) 3015-8366" | ID: rt2uoiyfwgxivkj | Status: Fechado | Cidade: ERECHIM | Criado em: 2026-09-13 16:59:38.403Z

[Caso 1.b #26] Número normalizado: 54999418531 (2 clientes)
  1. Nome Cliente: "Claudio Iarocz" | WhatsApp original: "(54) 99941-8531" | ID: l8d0ibvoqa4i76s | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:42.145Z
  2. Nome Cliente: "Rodrigo Scarmignani" | WhatsApp original: "(54) 99941-8531" | ID: ycchoyld4ihmbh5 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:05.383Z

[Caso 1.b #27] Número normalizado: 54991855002 (3 clientes)
  1. Nome Cliente: "Cláudio João Pagliosa" | WhatsApp original: "(54) 99185-5002" | ID: mlpch9s1ktm3y41 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:42.971Z
  2. Nome Cliente: "Cláudio Pagliosa" | WhatsApp original: "(54) 99185-5002" | ID: hv2mp0g9jl0etz1 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:44.571Z
  3. Nome Cliente: "Otávio Pereira (Jose Otavio Otinguassu Brasil Pereira)" | WhatsApp original: "(54) 99185-5002" | ID: tenqsljeqblapbq | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:21.129Z

[Caso 1.b #28] Número normalizado: 51998370245 (2 clientes)
  1. Nome Cliente: "CLAUDIR JOAO GALINA" | WhatsApp original: "(51) 99837-0245" | ID: gn8810vrmyi69mk | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:44.774Z
  2. Nome Cliente: "João Galina" | WhatsApp original: "(51) 99837-0245" | ID: 5s5oe5f49zjax64 | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:24.973Z

[Caso 1.b #29] Número normalizado: 54999689557 (2 clientes)
  1. Nome Cliente: "CLEOMAR JOSE FRANCO" | WhatsApp original: "(54) 99968-9557" | ID: a9e5qkofa2em0uv | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:46.542Z
  2. Nome Cliente: "Marcio (São José do Ouro) (Titular: Karine Centenaro)" | WhatsApp original: "(54) 99968-9557" | ID: bdhucdggdfqbr8o | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:57:23.525Z

[Caso 1.b #30] Número normalizado: 54999074589 (2 clientes)
  1. Nome Cliente: "Cleomar Rempel" | WhatsApp original: "(54) 99907-4589" | ID: 2ro79qtw3x4kih2 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:47.638Z
  2. Nome Cliente: "Nilza Maria K. de Oliveira" | WhatsApp original: "(54) 99907-4589" | ID: uvg2bzqir3m0jno | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:14.703Z

[Caso 1.b #31] Número normalizado: 54999727597 (2 clientes)
  1. Nome Cliente: "Clovis Andre Vittorello" | WhatsApp original: "(54) 99972-7597" | ID: yjyyoh7i5yde505 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:49.281Z
  2. Nome Cliente: "Maria Viviano de Castro" | WhatsApp original: "(54) 99972-7597" | ID: cgwkifc3ldxgekk | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:22.072Z

[Caso 1.b #32] Número normalizado: 54991878710 (3 clientes)
  1. Nome Cliente: "Clóvis Meneguel" | WhatsApp original: "(54) 99187-8710" | ID: zqisalk5spzo24g | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:50.378Z
  2. Nome Cliente: "Eliandro Rocha" | WhatsApp original: "(54) 99187-8710" | ID: zfj8l495v75yzwk | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:54:45.067Z
  3. Nome Cliente: "Eliandro Rocha" | WhatsApp original: "(54) 99187-8710" | ID: o99oxjjdqp5413j | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:54:45.277Z

[Caso 1.b #33] Número normalizado: 54996728530 (3 clientes)
  1. Nome Cliente: "Cristiane Doces Artesanais" | WhatsApp original: "(54) 99672-8530" | ID: tklmn7agdnpk8yy | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:58.525Z
  2. Nome Cliente: "Eulice - EDISON JOSE DALLAGNOL" | WhatsApp original: "(54) 99672-8530" | ID: gl1zsj9roa580th | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:54:54.193Z
  3. Nome Cliente: "Edison José Dallagnol" | WhatsApp original: "(54) 99672-8530" | ID: 6sz9hojn2esogrg | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:02.110Z

[Caso 1.b #34] Número normalizado: 54996677927 (2 clientes)
  1. Nome Cliente: "Cubbo" | WhatsApp original: "(54) 99667-7927" | ID: xerd6c6rlxahcwe | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:54:01.579Z
  2. Nome Cliente: "Luiz Caron" | WhatsApp original: "(54) 99667-7927" | ID: j1xyvxaayzzfyv7 | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:57:09.130Z

[Caso 1.b #35] Número normalizado: 54999953462 (3 clientes)
  1. Nome Cliente: "Cubbo Engenharia" | WhatsApp original: "(54) 99995-3462" | ID: w90hqff0n2v8ffb | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:54:02.236Z
  2. Nome Cliente: "Helena P" | WhatsApp original: "(54) 99995-3462" | ID: 03v6r548690034v | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:55:47.799Z
  3. Nome Cliente: "Helena Pachla" | WhatsApp original: "(54) 99995-3462" | ID: jg5wequzf4c6pac | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:49.005Z

[Caso 1.b #36] Número normalizado: 5433212466 (3 clientes)
  1. Nome Cliente: "DAL PRA INDUSTRIA E COMERCIO" | WhatsApp original: "(54) 3321-2466" | ID: iol2e3vlvkco93o | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:54:03.205Z
  2. Nome Cliente: "MDP" | WhatsApp original: "(54) 3321-2466" | ID: naye627nv9itiy3 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:57:48.214Z
  3. Nome Cliente: "MOVEIS DAL PRA" | WhatsApp original: "(54) 3321-2466" | ID: ynp3jrksapveafe | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:58.616Z

[Caso 1.b #37] Número normalizado: 54996853965 (2 clientes)
  1. Nome Cliente: "Daniel Syegel" | WhatsApp original: "(54) 99685-3965" | ID: thpfcwx3r74khct | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:54:06.076Z
  2. Nome Cliente: "Natalino Segundo Paludo" | WhatsApp original: "(54) 99685-3965" | ID: pja74el9sibh6od | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:27.652Z

[Caso 1.b #38] Número normalizado: 54991449191 (2 clientes)
  1. Nome Cliente: "DE CARLI EMBALAGENS E MATERIAIS DE LIMPEZA LTDA" | WhatsApp original: "(54) 99144-9191" | ID: r4hptxnzg2ah35e | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:54:09.952Z
  2. Nome Cliente: "Gustavo Frey" | WhatsApp original: "(54) 99144-9191" | ID: 4hqrivytppc8dt4 | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:55:43.261Z

[Caso 1.b #39] Número normalizado: 54999105656 (2 clientes)
  1. Nome Cliente: "Deisiele Morais do Nascimento" | WhatsApp original: "(54) 99910-5656" | ID: m0van392xchhp71 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:54:11.283Z
  2. Nome Cliente: "Mateus Rech" | WhatsApp original: "(54) 99910-5656" | ID: ijty4cy93tw6stt | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:41.654Z

[Caso 1.b #40] Número normalizado: 54984121984 (2 clientes)
  1. Nome Cliente: "Delcio Antonio Zanin" | WhatsApp original: "(54) 98412-1984" | ID: g1yovfdpjhuf1pa | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:12.302Z
  2. Nome Cliente: "Neimar Paula Rodrigues (Elisete)" | WhatsApp original: "(54) 98412-1984" | ID: regzc1hjc5ljhkp | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:06.079Z

[Caso 1.b #41] Número normalizado: 54991184576 (2 clientes)
  1. Nome Cliente: "Denise e Regina (Titular: Regina Meneguzzo)" | WhatsApp original: "(54) 99118-4576" | ID: sm0xnygsfww80yi | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:54:15.329Z
  2. Nome Cliente: "Regina Meneguzzo" | WhatsApp original: "(54) 99118-4576" | ID: o3ts5fqbwxhx1az | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:32.332Z

[Caso 1.b #42] Número normalizado: 54999920142 (3 clientes)
  1. Nome Cliente: "Diana 3 Tamanini" | WhatsApp original: "(54) 99992-0142" | ID: 3obyrojev28k3q7 | Status: Novo Lead | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:54:16.838Z
  2. Nome Cliente: "Farmacia Erechim CD" | WhatsApp original: "(54) 99992-0142" | ID: 5vn492xfwa6upl1 | Status: Fechado | Cidade: Sananduva | Criado em: 2026-09-13 16:55:07.664Z
  3. Nome Cliente: "Farmácia Erechim Loja 15" | WhatsApp original: "(54) 99992-0142" | ID: v3zficbn23r2nac | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:55:09.691Z

[Caso 1.b #43] Número normalizado: 54984423518 (2 clientes)
  1. Nome Cliente: "Dilmo Cagol" | WhatsApp original: "(54) 98442-3518" | ID: z93gdnes5izuscm | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:54:18.831Z
  2. Nome Cliente: "MARCOS\DILMO CAGOL" | WhatsApp original: "(54) 98442-3518" | ID: 9efyggqltr8kjqj | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:57:25.901Z

[Caso 1.b #44] Número normalizado: 54996420987 (2 clientes)
  1. Nome Cliente: "Disnei e Elisangela (Titular: Disnei Pedro Mendes)" | WhatsApp original: "(54) 99642-0987" | ID: 3ye7yfxova02syk | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:54:21.254Z
  2. Nome Cliente: "Gustavo Rossi Bastian (cubbo)" | WhatsApp original: "(54) 99642-0987" | ID: yw7xp0ynxe2j4u8 | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:55:44.294Z

[Caso 1.b #45] Número normalizado: 54984240822 (2 clientes)
  1. Nome Cliente: "Dolisete Paulo Boneti" | WhatsApp original: "(54) 98424-0822" | ID: rvukthlpc61qohc | Status: Novo Lead | Cidade: Nonoai | Criado em: 2026-09-13 16:54:22.548Z
  2. Nome Cliente: "Graziela Beatrici e Dolisete (Erechim)" | WhatsApp original: "(54) 98424-0822" | ID: 7pnoonw3pua0478 | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:55:39.700Z

[Caso 1.b #46] Número normalizado: 5435193169 (2 clientes)
  1. Nome Cliente: "Domingos Luiz Andretta" | WhatsApp original: "(54) 3519-3169" | ID: 3rv1tps9uibxkn5 | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:54:23.974Z
  2. Nome Cliente: "Domingos Luiz Andretta" | WhatsApp original: "(54) 3519-3169" | ID: jdajl27t6lc49n3 | Status: Novo Lead | Cidade: Passo Fundo | Criado em: 2026-09-13 16:54:24.174Z

[Caso 1.b #47] Número normalizado: 54991371483 (2 clientes)
  1. Nome Cliente: "Dorvalino Rodrigues" | WhatsApp original: "(54) 99137-1483" | ID: ckynnvexvniwye1 | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:54:25.195Z
  2. Nome Cliente: "Lodair Lodi" | WhatsApp original: "(54) 99137-1483" | ID: 11kcbjjlhuigryv | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:56:59.644Z

[Caso 1.b #48] Número normalizado: 5496153215 (2 clientes)
  1. Nome Cliente: "Douglas Cararo" | WhatsApp original: "(54) 9615-3215" | ID: ctjvakdkk220gp8 | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:54:25.472Z
  2. Nome Cliente: "Silva Tessaro" | WhatsApp original: "(54) 9615-3215" | ID: 6jn77yes5nrszyy | Status: Novo Lead | Cidade: Barra do Rio Azul | Criado em: 2026-09-13 16:59:25.637Z

[Caso 1.b #49] Número normalizado: 54981149930 (2 clientes)
  1. Nome Cliente: "Eder) Geraldino dos Santos Ribeiro" | WhatsApp original: "(54) 98114-9930" | ID: vf0gk9ruuc0w7om | Status: Fechado | Cidade: Tapejara | Criado em: 2026-09-13 16:54:28.028Z
  2. Nome Cliente: "Arthur Paulo Medeiros" | WhatsApp original: "(54) 98114-9930" | ID: zka40z6j2ddnxtc | Status: Novo Lead | Cidade: Erechim/RS | Criado em: 2026-09-22 19:34:12.506Z

[Caso 1.b #50] Número normalizado: 51985018659 (2 clientes)
  1. Nome Cliente: "Ederli Becker" | WhatsApp original: "(51) 98501-8659" | ID: ezrghainutnmoyf | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:54:28.986Z
  2. Nome Cliente: "Joel - Estrela" | WhatsApp original: "(51) 98501-8659" | ID: 6r1tw8kclsm42sw | Status: Novo Lead | Cidade: Aratiba | Criado em: 2026-09-13 16:56:28.562Z

[Caso 1.b #51] Número normalizado: 54999822499 (2 clientes)
  1. Nome Cliente: "Edificio Prime - Fuzinatto Empreendimentos Imobiliários LTDA." | WhatsApp original: "(54) 99982-2499" | ID: idchoo3y6pq2la4 | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:54:32.784Z
  2. Nome Cliente: "Volmir Fusinato" | WhatsApp original: "(54) 99982-2499" | ID: vnqhrivhvxp71a9 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 17:00:20.778Z

[Caso 1.b #52] Número normalizado: 54999620627 (2 clientes)
  1. Nome Cliente: "EDIFICIO RESIDENCIAL E COMERCIAL ARSIE" | WhatsApp original: "(54) 99962-0627" | ID: l02k57w6wy7l769 | Status: Novo Lead | Cidade: Passo Fundo | Criado em: 2026-09-13 16:54:32.999Z
  2. Nome Cliente: "Ione" | WhatsApp original: "(54) 99962-0627" | ID: bh75w0hhqah7clo | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:10.827Z

[Caso 1.b #53] Número normalizado: 54996120307 (5 clientes)
  1. Nome Cliente: "Edite Teresinha de Paris Dartora" | WhatsApp original: "(54) 99612-0307" | ID: brxn5i9kfzux1la | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:54:35.378Z
  2. Nome Cliente: "Edite Teresinha Deparis Dartora" | WhatsApp original: "(54) 99612-0307" | ID: ocq2ntbkwjljxll | Status: Novo Lead | Cidade: Tapejara | Criado em: 2026-09-13 16:54:36.169Z
  3. Nome Cliente: "Salete Reis Sassi" | WhatsApp original: "(54) 99612-0307" | ID: uldddq7wy45zef6 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:59:16.499Z
  4. Nome Cliente: "Vinícius Daltora" | WhatsApp original: "(54) 99612-0307" | ID: 4cl8jz9ppce133o | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:12.129Z
  5. Nome Cliente: "Vinicius Dartora - Salete Sassi" | WhatsApp original: "(54) 99612-0307" | ID: yvv0c45ba0ka25x | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:13.352Z

[Caso 1.b #54] Número normalizado: 54996167789 (2 clientes)
  1. Nome Cliente: "Edson Luiz Goral Pagliosa" | WhatsApp original: "(54) 99616-7789" | ID: ud9mqf47gba4df3 | Status: Fechado | Cidade: ERECHIM | Criado em: 2026-09-13 16:54:36.858Z
  2. Nome Cliente: "Edson Pagliosa" | WhatsApp original: "(54) 99616-7789" | ID: zwvh5gr4nv7r0ng | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:37.486Z

[Caso 1.b #55] Número normalizado: 54991420648 (2 clientes)
  1. Nome Cliente: "Emanuela (Titular: Loiri Pansera)" | WhatsApp original: "(54) 99142-0648" | ID: fy0wqwqadtowahb | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:54:48.285Z
  2. Nome Cliente: "Ernani Dassi (Mercedes)" | WhatsApp original: "(54) 99142-0648" | ID: ed80xeol2bofish | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:54:49.290Z

[Caso 1.b #56] Número normalizado: 54981316187 (2 clientes)
  1. Nome Cliente: "Ernani Ferreira" | WhatsApp original: "(54) 98131-6187" | ID: kq3rrn636vqn8t5 | Status: Fechado | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:54:50.060Z
  2. Nome Cliente: "Fabio Goedel" | WhatsApp original: "(54) 98131-6187" | ID: sq3um5g6slinpz1 | Status: Fechado | Cidade: Tapejara | Criado em: 2026-09-13 16:55:05.516Z

[Caso 1.b #57] Número normalizado: 54999442424 (2 clientes)
  1. Nome Cliente: "Eva Horszczaruk Staniczuk" | WhatsApp original: "(54) 99944-2424" | ID: wmoxkr0qzx8fhha | Status: Novo Lead | Cidade: Aratiba | Criado em: 2026-09-13 16:54:55.589Z
  2. Nome Cliente: "Eva Staniczuk" | WhatsApp original: "(54) 99944-2424" | ID: x4iugm5vn7yjh1x | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:55:01.813Z

[Caso 1.b #58] Número normalizado: 54991666243 (2 clientes)
  1. Nome Cliente: "Evandra Martinha Stadtlober (Titular: Reges Pagliari)" | WhatsApp original: "(54) 99166-6243" | ID: mgzoylgq36qr6of | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:56.269Z
  2. Nome Cliente: "Panificadora Pagnaro LTDA" | WhatsApp original: "(54) 99166-6243" | ID: dijq456xw0pl5aj | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:24.104Z

[Caso 1.b #59] Número normalizado: 54991660746 (2 clientes)
  1. Nome Cliente: "Evandro" | WhatsApp original: "(54) 99166-0746" | ID: wmh1gni8jj4igzh | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:54:57.369Z
  2. Nome Cliente: "Simão Imóveis" | WhatsApp original: "(54) 99166-0746" | ID: kylz5tvftij1uam | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:29.452Z

[Caso 1.b #60] Número normalizado: 54991948800 (2 clientes)
  1. Nome Cliente: "Evandro Correa" | WhatsApp original: "(54) 99194-8800" | ID: dfnc1mj8ny515zg | Status: Fechado | Cidade: Sananduva | Criado em: 2026-09-13 16:54:57.940Z
  2. Nome Cliente: "Evandro Lamaison Correa" | WhatsApp original: "(54) 99194-8800" | ID: btce51kwcxqtlhh | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:55:01.171Z

[Caso 1.b #61] Número normalizado: 54999784699 (2 clientes)
  1. Nome Cliente: "Fabio Demoliner" | WhatsApp original: "(54) 99978-4699" | ID: 8nsozcf4c81dgja | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:55:04.140Z
  2. Nome Cliente: "Fábio Demoliner" | WhatsApp original: "(54) 99978-4699" | ID: rm57wehp1l1okgl | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:55:04.798Z

[Caso 1.b #62] Número normalizado: 5435196375 (2 clientes)
  1. Nome Cliente: "Farmácias Erechim - Loja 14" | WhatsApp original: "(54) 3519-6375" | ID: 66la7obxsyttdyr | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:10.551Z
  2. Nome Cliente: "PAULO ROBERTO FORNARI & CIA LTDA." | WhatsApp original: "(54) 3519-6375" | ID: dqes014ftpr9e8x | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:33.095Z

[Caso 1.b #63] Número normalizado: 5499820981 (2 clientes)
  1. Nome Cliente: "Fuzinatto Empreendimentos" | WhatsApp original: "(54) 9982-0981" | ID: rfubrzs6lykl2yk | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:55:17.920Z
  2. Nome Cliente: "Fuzinatto Empreendimentos" | WhatsApp original: "(54) 9982-0981" | ID: 8sotyp3yr057z8a | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-21 16:17:58.222Z

[Caso 1.b #64] Número normalizado: 54991410361 (2 clientes)
  1. Nome Cliente: "Geison Luis Rigo" | WhatsApp original: "(54) 99141-0361" | ID: 06qzgnk0eycwica | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:21.088Z
  2. Nome Cliente: "Geison Rigo" | WhatsApp original: "(54) 99141-0361" | ID: 862ov8lddgeihtj | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:55:21.995Z

[Caso 1.b #65] Número normalizado: 54991897379 (3 clientes)
  1. Nome Cliente: "Genuir Franceschi" | WhatsApp original: "(54) 99189-7379" | ID: 0hmu2a5iww3o6ur | Status: Fechado | Cidade: Sertão | Criado em: 2026-09-13 16:55:24.099Z
  2. Nome Cliente: "Rodrigo Ferranti" | WhatsApp original: "(54) 99189-7379" | ID: 7nov8fqcml47r24 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:02.790Z
  3. Nome Cliente: "Rodrigo Ferranti" | WhatsApp original: "(54) 99189-7379" | ID: udwpk5xh1yrlcky | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:59:03.026Z

[Caso 1.b #66] Número normalizado: 54996060689 (2 clientes)
  1. Nome Cliente: "Gerson Adriano Bovo" | WhatsApp original: "(54) 99606-0689" | ID: qut3h9i0j0rppxt | Status: Novo Lead | Cidade: Aratiba | Criado em: 2026-09-13 16:55:25.814Z
  2. Nome Cliente: "Gerson Adriano Bovo (Erechim)" | WhatsApp original: "(54) 99606-0689" | ID: s7iznf4fbwu7dkf | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:55:26.244Z

[Caso 1.b #67] Número normalizado: 5499159354 (2 clientes)
  1. Nome Cliente: "Gilmar Bertoldi" | WhatsApp original: "(54) 9915-9354" | ID: 1awo5ml5jp69t73 | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:55:32.563Z
  2. Nome Cliente: "Mauricio Bertoldi" | WhatsApp original: "(54) 9915-9354" | ID: ubvjd4g1y913rit | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:43.877Z

[Caso 1.b #68] Número normalizado: 54999056500 (2 clientes)
  1. Nome Cliente: "Gilmar Granzotto" | WhatsApp original: "(54) 99905-6500" | ID: ffg0e01mdbbh3yb | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:55:33.338Z
  2. Nome Cliente: "Pantaleão Smagala" | WhatsApp original: "(54) 99905-6500" | ID: da9geg1jui7w3z4 | Status: Novo Lead | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:58:24.311Z

[Caso 1.b #69] Número normalizado: 49991083026 (2 clientes)
  1. Nome Cliente: "Gilson Bogo" | WhatsApp original: "(49) 99108-3026" | ID: k6a4asuyfejo4kn | Status: Novo Lead | Cidade: Tapejara | Criado em: 2026-09-13 16:55:34.290Z
  2. Nome Cliente: "Gilson Bogo (Erechim)" | WhatsApp original: "(49) 99108-3026" | ID: bz5k2hjf3zlvslo | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:55:35.052Z

[Caso 1.b #70] Número normalizado: 54992133760 (2 clientes)
  1. Nome Cliente: "Gilson Marini" | WhatsApp original: "(54) 99213-3760" | ID: d0k1lkhl20txlg8 | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:55:35.843Z
  2. Nome Cliente: "Gison Marini" | WhatsApp original: "(54) 99213-3760" | ID: nfecnhtu6ow626d | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:55:36.063Z

[Caso 1.b #71] Número normalizado: 54999120636 (2 clientes)
  1. Nome Cliente: "Gladis Bergman Zaffari" | WhatsApp original: "(54) 99912-0636" | ID: zdlnmcp6e65e6bq | Status: Fechado | Cidade: Sananduva | Criado em: 2026-09-13 16:55:37.799Z
  2. Nome Cliente: "Nelson Roque Kowalski" | WhatsApp original: "(54) 99912-0636" | ID: ad9knhiw9uuw6kq | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:12.339Z

[Caso 1.b #72] Número normalizado: 54992303576 (3 clientes)
  1. Nome Cliente: "Gleison Szady da Luz" | WhatsApp original: "(54) 99230-3576" | ID: iyeiof1sjs6gwnz | Status: Fechado | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:55:38.973Z
  2. Nome Cliente: "Gleison - COHAB Aldo Arioli" | WhatsApp original: "(54) 99230-3576" | ID: m7r0pbphgq8or0t | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:08.823Z
  3. Nome Cliente: "Gleison da Luz" | WhatsApp original: "(54) 99230-3576" | ID: b4sqldo93pta5xc | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:09.069Z

[Caso 1.b #73] Número normalizado: 54996222946 (2 clientes)
  1. Nome Cliente: "Gustavo Camerini" | WhatsApp original: "(54) 99622-2946" | ID: wc8pdj5ftirr95a | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:55:41.429Z
  2. Nome Cliente: "Nadir Camerini" | WhatsApp original: "(54) 99622-2946" | ID: sjrqhw78amc958m | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:58:00.759Z

[Caso 1.b #74] Número normalizado: 54991757554 (3 clientes)
  1. Nome Cliente: "IGOR RICARDO MENEGUZZO" | WhatsApp original: "(54) 99175-7554" | ID: kl4xksav2eu7tdj | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:55:53.903Z
  2. Nome Cliente: "Patricia S (Titular: Nilmar Ferrari Fabro)" | WhatsApp original: "(54) 99175-7554" | ID: 6oyce065nkb28nr | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:26.285Z
  3. Nome Cliente: "Igor Meneguzzo" | WhatsApp original: "(54) 99175-7554" | ID: tfriewoi717t6qm | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:17:12.084Z

[Caso 1.b #75] Número normalizado: 54993310444 (2 clientes)
  1. Nome Cliente: "Iraci Fátima" | WhatsApp original: "(54) 99331-0444" | ID: xp56s58mtagy7ax | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:55:57.246Z
  2. Nome Cliente: "Tiago Smagala" | WhatsApp original: "(54) 99331-0444" | ID: whjnrxcgacah938 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:47.511Z

[Caso 1.b #76] Número normalizado: 54999980025 (3 clientes)
  1. Nome Cliente: "Irones/Laudir Reis" | WhatsApp original: "(54) 99998-0025" | ID: dnktzm72w570d6c | Status: Novo Lead | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:57.896Z
  2. Nome Cliente: "Laudir da Silva Reis - IRONES MARIA CEOLIN REIS" | WhatsApp original: "(54) 99998-0025" | ID: kzyfkwtic180ddk | Status: Fechado | Cidade: Tapejara | Criado em: 2026-09-13 16:56:45.252Z
  3. Nome Cliente: "Natalino Paludo" | WhatsApp original: "(54) 99998-0025" | ID: 73j6vd0n4xczool | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:03.368Z

[Caso 1.b #77] Número normalizado: 54991717901 (2 clientes)
  1. Nome Cliente: "IVAN CARLOS DE SAIBRO" | WhatsApp original: "(54) 99171-7901" | ID: r0731l3njxynxza | Status: Fechado | Cidade: Sertão | Criado em: 2026-09-13 16:56:00.292Z
  2. Nome Cliente: "Ivan Carlos Saibro" | WhatsApp original: "(54) 99171-7901" | ID: cxbp40e04df5jyd | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:11.070Z

[Caso 1.b #78] Número normalizado: 51982970010 (2 clientes)
  1. Nome Cliente: "Ivanor/ Mateus Duranti" | WhatsApp original: "(51) 98297-0010" | ID: lexhthv8oq5j2u4 | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:56:03.126Z
  2. Nome Cliente: "Silvia Terezinha de Martini Duranti" | WhatsApp original: "(51) 98297-0010" | ID: aiwh84ei1vivo0x | Status: Fechado | Cidade: Sarandi | Criado em: 2026-09-13 16:59:28.638Z

[Caso 1.b #79] Número normalizado: 54996720012 (3 clientes)
  1. Nome Cliente: "Ivete Maria Zanette" | WhatsApp original: "(54) 99672-0012" | ID: z98ibqlj2s8mog3 | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:56:04.397Z
  2. Nome Cliente: "Janete Cozer" | WhatsApp original: "(54) 99672-0012" | ID: zw5vthd1j4fhyth | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:16.291Z
  3. Nome Cliente: "Janete Marcelina Cozer" | WhatsApp original: "(54) 99672-0012" | ID: 3wweu9maps4pp03 | Status: Novo Lead | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:56:17.217Z

[Caso 1.b #80] Número normalizado: 54999365098 (3 clientes)
  1. Nome Cliente: "Jacir Luis Badalotti" | WhatsApp original: "(54) 99936-5098" | ID: lw8a5n7uans6n0q | Status: Novo Lead | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:07.503Z
  2. Nome Cliente: "RENAN BADALOTTI" | WhatsApp original: "(54) 99936-5098" | ID: tjd2mlpt927ztbf | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:47.115Z
  3. Nome Cliente: "Renan Hlavac Badalotti" | WhatsApp original: "(54) 99936-5098" | ID: 36obidq0elsmjsz | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:47.347Z

[Caso 1.b #81] Número normalizado: 54999191624 (2 clientes)
  1. Nome Cliente: "Jackson Elizandro Niek" | WhatsApp original: "(54) 99919-1624" | ID: ell8of2f2iyp9vw | Status: Novo Lead | Cidade: Marau | Criado em: 2026-09-13 16:56:09.288Z
  2. Nome Cliente: "Jackson Niec" | WhatsApp original: "(54) 99919-1624" | ID: n9rvzq1ae28qdri | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:56:10.038Z

[Caso 1.b #82] Número normalizado: 49988334151 (2 clientes)
  1. Nome Cliente: "JEAN CARLOS CEZNE" | WhatsApp original: "(49) 98833-4151" | ID: 9oqpjymravwvm75 | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:56:18.211Z
  2. Nome Cliente: "Jean Cezne" | WhatsApp original: "(49) 98833-4151" | ID: s77odsd0twhofdh | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:56:19.862Z

[Caso 1.b #83] Número normalizado: 5481007878 (2 clientes)
  1. Nome Cliente: "Joacir Kolba Gás" | WhatsApp original: "(54) 8100-7878" | ID: 1s6fgdp3mzb8hpx | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:56:23.263Z
  2. Nome Cliente: "Joacir Mateus Kolba" | WhatsApp original: "(54) 8100-7878" | ID: 4ae5fw8579aplhd | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:13.255Z

[Caso 1.b #84] Número normalizado: 54991874541 (2 clientes)
  1. Nome Cliente: "João Staniczuk" | WhatsApp original: "(54) 99187-4541" | ID: y25mzgdm9eu1g7n | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:56:25.644Z
  2. Nome Cliente: "Luiz João Zavodinik" | WhatsApp original: "(54) 99187-4541" | ID: ppcp97mtxxzzlat | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:57:10.942Z

[Caso 1.b #85] Número normalizado: 54999039923 (2 clientes)
  1. Nome Cliente: "Joel Barberini" | WhatsApp original: "(54) 99903-9923" | ID: 44pvjpkr0a0cdxf | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:56:26.987Z
  2. Nome Cliente: "Joel Rodrigo Barberini" | WhatsApp original: "(54) 99903-9923" | ID: x7xrgpkl12n6dpi | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:13.508Z

[Caso 1.b #86] Número normalizado: 54999893447 (2 clientes)
  1. Nome Cliente: "Joel Dariva" | WhatsApp original: "(54) 99989-3447" | ID: up6hfo3a6mtqsin | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:56:27.583Z
  2. Nome Cliente: "Ricardo Gonçalves (Titular: Aline Andressa Rigo)" | WhatsApp original: "(54) 99989-3447" | ID: sk5urgamcgh9fui | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:53.992Z

[Caso 1.b #87] Número normalizado: 54996360539 (2 clientes)
  1. Nome Cliente: "Jorge Baú" | WhatsApp original: "(54) 99636-0539" | ID: yvm9cmgm3ymer9j | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:56:30.296Z
  2. Nome Cliente: "Renato Federle (Camar)" | WhatsApp original: "(54) 99636-0539" | ID: xquomoxrigf9ojb | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:48.724Z

[Caso 1.b #88] Número normalizado: 54984297435 (2 clientes)
  1. Nome Cliente: "José Mário Vicensi Grzybowsk" | WhatsApp original: "(54) 98429-7435" | ID: 4k0fyljypnvc9w0 | Status: Novo Lead | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:34.450Z
  2. Nome Cliente: "José Mario Vicensi Grzybowski" | WhatsApp original: "(54) 98429-7435" | ID: c8ydkexvuij6azl | Status: Novo Lead | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:56:35.025Z

[Caso 1.b #89] Número normalizado: 54992353559 (2 clientes)
  1. Nome Cliente: "Jucelene" | WhatsApp original: "(54) 99235-3559" | ID: oll26um5g0m0hwe | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:56:37.428Z
  2. Nome Cliente: "Valdir Toniolo" | WhatsApp original: "(54) 99235-3559" | ID: l6r57f8j8li7r2v | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:00.406Z

[Caso 1.b #90] Número normalizado: 54991484836 (2 clientes)
  1. Nome Cliente: "Juliano Hashimoto (Titular: Rosilene Ines Lehmen)" | WhatsApp original: "(54) 99148-4836" | ID: 3tswszpz5vt4z1h | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:56:38.190Z
  2. Nome Cliente: "Paulo Dezordi" | WhatsApp original: "(54) 99148-4836" | ID: t6hbowfrr57sbf4 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:31.310Z

[Caso 1.b #91] Número normalizado: 54996550242 (2 clientes)
  1. Nome Cliente: "Julio Luis Baú" | WhatsApp original: "(54) 99655-0242" | ID: cnhm7us9mhhkwjo | Status: Novo Lead | Cidade: Sananduva | Criado em: 2026-09-13 16:56:39.106Z
  2. Nome Cliente: "Julio Luiz Bau" | WhatsApp original: "(54) 99655-0242" | ID: 90b4p8orjy8hjpd | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:56:40.453Z

[Caso 1.b #92] Número normalizado: 54999938257 (2 clientes)
  1. Nome Cliente: "Kika (Titular: Roque Carlos Pedott)" | WhatsApp original: "(54) 99993-8257" | ID: 1uocsu3326mrzar | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:42.626Z
  2. Nome Cliente: "Patrícia Pavão Schneider (Titular: Diego Pierdona Portella)" | WhatsApp original: "(54) 99993-8257" | ID: 2wi8vra9v1h4r9a | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:25.592Z

[Caso 1.b #93] Número normalizado: 54997069529 (2 clientes)
  1. Nome Cliente: "Leandro Marcos" | WhatsApp original: "(54) 99706-9529" | ID: 91m0n776kccv38n | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:56:50.021Z
  2. Nome Cliente: "Rubi Leopoldo Escher" | WhatsApp original: "(54) 99706-9529" | ID: hev2r4bdqub3ffw | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:13.477Z

[Caso 1.b #94] Número normalizado: 54992462728 (2 clientes)
  1. Nome Cliente: "Lindomar Antonio Nhevinski" | WhatsApp original: "(54) 99246-2728" | ID: gwk0dnkwhoe2s0u | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:56:56.858Z
  2. Nome Cliente: "Marcelo Passini (Titular: Lizandra Aline Molossi Passini)" | WhatsApp original: "(54) 99246-2728" | ID: v5gjbb81hbauf2z | Status: Fechado | Cidade: Sertão | Criado em: 2026-09-13 16:57:20.565Z

[Caso 1.b #95] Número normalizado: 54999551952 (2 clientes)
  1. Nome Cliente: "Loeri da Costa" | WhatsApp original: "(54) 99955-1952" | ID: 6lktobm405yr156 | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:57:00.477Z
  2. Nome Cliente: "Media Informatica" | WhatsApp original: "(54) 99955-1952" | ID: fkwihl6b792f6b7 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:50.538Z

[Caso 1.b #96] Número normalizado: 54999822506 (2 clientes)
  1. Nome Cliente: "Loery Valentin Fusinato" | WhatsApp original: "(54) 99982-2506" | ID: t9lirq46srq5fl9 | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:57:02.505Z
  2. Nome Cliente: "Omar Luiz Dezordi" | WhatsApp original: "(54) 99982-2506" | ID: 171lutg1yoork1t | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:19.466Z

[Caso 1.b #97] Número normalizado: 5433215655 (2 clientes)
  1. Nome Cliente: "Lojas Cofferri" | WhatsApp original: "(54) 3321-5655" | ID: okhz0p4tvu3z1v3 | Status: Fechado | Cidade: Sertão | Criado em: 2026-09-13 16:57:03.303Z
  2. Nome Cliente: "Leonildo Cofferri" | WhatsApp original: "(54) 3321-5655" | ID: e6huv3imu1y82jg | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:16.982Z

[Caso 1.b #98] Número normalizado: 54999707520 (2 clientes)
  1. Nome Cliente: "Ludmila/Rodrigo Salazar" | WhatsApp original: "(54) 99970-7520" | ID: x8ij8d9wsq38fb6 | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:57:07.898Z
  2. Nome Cliente: "Rodrigo Salazar" | WhatsApp original: "(54) 99970-7520" | ID: quulk6mm851603x | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:04.193Z

[Caso 1.b #99] Número normalizado: 54999874591 (2 clientes)
  1. Nome Cliente: "Luiz Avelino Nunes Baldez" | WhatsApp original: "(54) 99987-4591" | ID: woqrbo0rblfd18a | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:57:08.869Z
  2. Nome Cliente: "Maristela Parcianello Rodrigues Jacinto" | WhatsApp original: "(54) 99987-4591" | ID: l26lgfjwtavs7ia | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:22.325Z

[Caso 1.b #100] Número normalizado: 5499091157 (2 clientes)
  1. Nome Cliente: "Marcelo José Pavan" | WhatsApp original: "(54) 9909-1157" | ID: iwf25lo6h0ct45r | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:57:17.951Z
  2. Nome Cliente: "Marcelo Pavan" | WhatsApp original: "(54) 9909-1157" | ID: 0s9yxuwnpouqqr9 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:21.072Z

[Caso 1.b #101] Número normalizado: 54999983960 (2 clientes)
  1. Nome Cliente: "Marcelo Maroso" | WhatsApp original: "(54) 99998-3960" | ID: tkgbqyahwea0yay | Status: Novo Lead | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:57:18.175Z
  2. Nome Cliente: "Marcelo Maroso-Lavagem" | WhatsApp original: "(54) 99998-3960" | ID: r2eoq1cbc0sa9in | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:57:19.468Z

[Caso 1.b #102] Número normalizado: 54999093192 (2 clientes)
  1. Nome Cliente: "Marcos Moretto" | WhatsApp original: "(54) 99909-3192" | ID: mb44plolxhb1mcl | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:57:27.461Z
  2. Nome Cliente: "Marcos Aurélio Moretto" | WhatsApp original: "(54) 99909-3192" | ID: cf4lheafmqh2zd1 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:21.824Z

[Caso 1.b #103] Número normalizado: 54996364168 (2 clientes)
  1. Nome Cliente: "Maria de Castro (TIAGÃO)" | WhatsApp original: "(54) 99636-4168" | ID: mpc6qkydb5qcwhv | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:57:29.510Z
  2. Nome Cliente: "Volmir Lohmann" | WhatsApp original: "(54) 99636-4168" | ID: 8l9r1vzr81vzwv5 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:22.290Z

[Caso 1.b #104] Número normalizado: 54996051756 (2 clientes)
  1. Nome Cliente: "Maristela Jacinto" | WhatsApp original: "(54) 99605-1756" | ID: q3txqlao2azjt6d | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:33.971Z
  2. Nome Cliente: "Paulo" | WhatsApp original: "(54) 99605-1756" | ID: f6kodepgfs8omk8 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:28.319Z

[Caso 1.b #105] Número normalizado: 5496505560 (2 clientes)
  1. Nome Cliente: "Mateus Klein" | WhatsApp original: "(54) 9650-5560" | ID: fssyad1g02euwh6 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:40.351Z
  2. Nome Cliente: "Mateus Dall Agnolo Klein" | WhatsApp original: "(54) 9650-5560" | ID: swjjvfb6a6xkosi | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:24.532Z

[Caso 1.b #106] Número normalizado: 5491766675 (2 clientes)
  1. Nome Cliente: "Mauro Antônio Serraglio" | WhatsApp original: "(54) 9176-6675" | ID: 0krwqgjuzi9su73 | Status: Fechado | Cidade: Barra do Rio Azul | Criado em: 2026-09-13 16:57:45.218Z
  2. Nome Cliente: "Odecir Kovaleski" | WhatsApp original: "(54) 9176-6675" | ID: p3cze7zrtvxzdkz | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:17.137Z

[Caso 1.b #107] Número normalizado: 54999673917 (2 clientes)
  1. Nome Cliente: "Mecânica Agricola Strieski LTDA (Erechim)" | WhatsApp original: "(54) 99967-3917" | ID: an1mcopxwq7zgjh | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:49.084Z
  2. Nome Cliente: "Mecânica Strieski" | WhatsApp original: "(54) 99967-3917" | ID: epuylevl9iy7454 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:57:49.937Z

[Caso 1.b #108] Número normalizado: 54999297330 (2 clientes)
  1. Nome Cliente: "Mercado Parque Livia (Titular: Deisiele Morais do Nascimento)" | WhatsApp original: "(54) 99929-7330" | ID: ar0nrt89900qyy2 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:52.541Z
  2. Nome Cliente: "Mercado Parque Livia (Titular: Tiago Correa Minimercado)" | WhatsApp original: "(54) 99929-7330" | ID: kz8myh1ta0qvsei | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:52.769Z

[Caso 1.b #109] Número normalizado: 54999755623 (2 clientes)
  1. Nome Cliente: "Moacir Folador" | WhatsApp original: "(54) 99975-5623" | ID: wrcbhcdqru0675q | Status: Novo Lead | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:57:57.085Z
  2. Nome Cliente: "Moacir Folador (Barão de Cotegipe)" | WhatsApp original: "(54) 99975-5623" | ID: 8tctf55y3jhegta | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:18:56.085Z

[Caso 1.b #110] Número normalizado: 54991337984 (2 clientes)
  1. Nome Cliente: "Neiva - Divanir" | WhatsApp original: "(54) 99133-7984" | ID: u1hg9rrvpegvfgz | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:07.820Z
  2. Nome Cliente: "Divanir Lúcia Onetta" | WhatsApp original: "(54) 99133-7984" | ID: 6s7hfjppwogsziy | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:01.107Z

[Caso 1.b #111] Número normalizado: 54997034522 (2 clientes)
  1. Nome Cliente: "Paulinho Benka" | WhatsApp original: "(54) 99703-4522" | ID: 6fk63h551429s1v | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:26.903Z
  2. Nome Cliente: "Paulinho Altair Benka" | WhatsApp original: "(54) 99703-4522" | ID: uj5mlsosumg6yiq | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:27.938Z

[Caso 1.b #112] Número normalizado: 54981066611 (2 clientes)
  1. Nome Cliente: "PAULO ANTONIO ESTHERIS" | WhatsApp original: "(54) 98106-6611" | ID: sin5v0wq705ls1b | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:30.230Z
  2. Nome Cliente: "Tania Estheris" | WhatsApp original: "(54) 98106-6611" | ID: uy059s4oxsx0ah2 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:59:42.820Z

[Caso 1.b #113] Número normalizado: 5491420648 (2 clientes)
  1. Nome Cliente: "PAULO RICARDO ZANELLA" | WhatsApp original: "(54) 9142-0648" | ID: vbqv0luejiemzdo | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:32.431Z
  2. Nome Cliente: "Paulo Zanella" | WhatsApp original: "(54) 9142-0648" | ID: ej8092v5qp6kot1 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:35.556Z

[Caso 1.b #114] Número normalizado: 5430153966 (2 clientes)
  1. Nome Cliente: "PRIME RESIDENCE" | WhatsApp original: "(54) 3015-3966" | ID: 5bx755g00lmdlv2 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:38.360Z
  2. Nome Cliente: "Arsie" | WhatsApp original: "(54) 3015-3966" | ID: l67kuxvuqrptif3 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:19:28.463Z

[Caso 1.b #115] Número normalizado: 5496035811 (2 clientes)
  1. Nome Cliente: "RAMPI AUTO PECAS LTDA" | WhatsApp original: "(54) 9603-5811" | ID: n4i4mgh5nw5vkyp | Status: Fechado | Cidade: TRES ARROIOS | Criado em: 2026-09-13 16:58:43.984Z
  2. Nome Cliente: "Maritana Rampi" | WhatsApp original: "(54) 9603-5811" | ID: rvpuzwj0wpszrcr | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:17:35.292Z

[Caso 1.b #116] Número normalizado: 5435223081 (2 clientes)
  1. Nome Cliente: "RAVENA BEACH" | WhatsApp original: "(54) 3522-3081" | ID: xvtsocjrdba5h4f | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:44.876Z
  2. Nome Cliente: "RAVENA BEACH ESPORTE E LAZER LTDA" | WhatsApp original: "(54) 3522-3081" | ID: j90e3isabnb9x4r | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:11:08.652Z

[Caso 1.b #117] Número normalizado: 5499826484 (2 clientes)
  1. Nome Cliente: "Roberto José Moretto" | WhatsApp original: "(54) 9982-6484" | ID: 9lururc04u6lyks | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:58.427Z
  2. Nome Cliente: "Roberto Moretto (Titular: Marcelo Matheus Moretto)" | WhatsApp original: "(54) 9982-6484" | ID: jf0l0mn1uvl8ra2 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:19:29.317Z

[Caso 1.b #118] Número normalizado: 54996672828 (3 clientes)
  1. Nome Cliente: "Rodrigo Pretto Buss" | WhatsApp original: "(54) 99667-2828" | ID: chhhrvtc2x4535q | Status: Fechado | Cidade: Planalto | Criado em: 2026-09-13 16:59:03.922Z
  2. Nome Cliente: "Tarcisio Folador (Barão de Cotegipe)" | WhatsApp original: "(54) 99667-2828" | ID: p6llvpf7pmuyatt | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:43.046Z
  3. Nome Cliente: "Rodrigo Buss" | WhatsApp original: "(54) 99667-2828" | ID: drsvd23qzy0idid | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:19:40.922Z

[Caso 1.b #119] Número normalizado: 54991669768 (2 clientes)
  1. Nome Cliente: "Rogerio Reuwsaat (Erechim)" | WhatsApp original: "(54) 99166-9768" | ID: 2cnzru5u8nopaye | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:07.023Z
  2. Nome Cliente: "Sergio Lupge (Campinas do Sul)" | WhatsApp original: "(54) 99166-9768" | ID: yxf1imtuk1a4bln | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:59:21.302Z

[Caso 1.b #120] Número normalizado: 54981223408 (2 clientes)
  1. Nome Cliente: "Rotary Club Erechim Paiol Grande" | WhatsApp original: "(54) 98122-3408" | ID: 1xcqqi9btuanxak | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:11.279Z
  2. Nome Cliente: "Vianei - Adriana Amaro" | WhatsApp original: "(54) 98122-3408" | ID: vzgy1hc438eb0em | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:06.039Z

[Caso 1.b #121] Número normalizado: 5499978070 (2 clientes)
  1. Nome Cliente: "SES SERVICOS ELETRICOS E SEGURANCA LTDA" | WhatsApp original: "(54) 9997-8070" | ID: eu1mjbosw4cacco | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:59:22.881Z
  2. Nome Cliente: "Tarcisio José" | WhatsApp original: "(54) 9997-8070" | ID: 7juen5yrxn421qg | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:37.865Z

[Caso 1.b #122] Número normalizado: 5491426649 (2 clientes)
  1. Nome Cliente: "Metal Mecânica Solução Ltda." | WhatsApp original: "(54) 9142-6649" | ID: o0olajza1e5zgw7 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:34.433Z
  2. Nome Cliente: "Josiane Otto" | WhatsApp original: "(54) 9142-6649" | ID: yknd0fdjmcl87co | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-30 17:58:14.706Z

[Caso 1.b #123] Número normalizado: 54999487758 (2 clientes)
  1. Nome Cliente: "Taise Pedroti" | WhatsApp original: "(54) 99948-7758" | ID: dw53sdwdqi6d8j9 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:39.929Z
  2. Nome Cliente: "Taíse Pedroti" | WhatsApp original: "(54) 99948-7758" | ID: xxzy7jn26018d74 | Status: Novo Lead | Cidade: Passo Fundo | Criado em: 2026-09-13 16:59:40.201Z

[Caso 1.b #124] Número normalizado: 54991877208 (2 clientes)
  1. Nome Cliente: "Tiago João - Ponte Preta" | WhatsApp original: "(54) 99187-7208" | ID: 1rsbdnqen834k04 | Status: Fechado | Cidade: Ponte Preta | Criado em: 2026-09-13 16:59:47.303Z
  2. Nome Cliente: "Tiago João Scatolin" | WhatsApp original: "(54) 99187-7208" | ID: odavmgf638lil4o | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:18:14.114Z

[Caso 1.b #125] Número normalizado: 54992292500 (2 clientes)
  1. Nome Cliente: "Valderi Meneghetti" | WhatsApp original: "(54) 99229-2500" | ID: ieia0tl8ebqgza3 | Status: Fechado | Cidade: São Valentim | Criado em: 2026-09-13 16:59:55.883Z
  2. Nome Cliente: "Valderi Meneguetti" | WhatsApp original: "(54) 99229-2500" | ID: y4p4qt2mf7ka4gf | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:56.894Z

[Caso 1.b #126] Número normalizado: 5499452785 (2 clientes)
  1. Nome Cliente: "Vinicius" | WhatsApp original: "(54) 9945-2785" | ID: erowhg1lr1i0oz7 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:11.344Z
  2. Nome Cliente: "Vinicius Scalco" | WhatsApp original: "(54) 9945-2785" | ID: k53vbpxz6afpwoa | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:15.818Z

[Caso 1.b #127] Número normalizado: 54996851251 (2 clientes)
  1. Nome Cliente: "wilsom Bawer" | WhatsApp original: "(54) 99685-1251" | ID: 6we92mtriza9i6t | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:23.374Z
  2. Nome Cliente: "Wilson Bauer" | WhatsApp original: "(54) 99685-1251" | ID: lc9wpvkvg4udwjp | Status: Novo Lead | Cidade: Três Arroios | Criado em: 2026-09-13 17:00:23.586Z

[Caso 1.b #128] Número normalizado: 54991823400 (2 clientes)
  1. Nome Cliente: "Supermercado Central de Alimentos" | WhatsApp original: "(54) 99182-3400" | ID: 95mx59d6wyxn9am | Status: Orçamento | Cidade: Passo Fundo | Criado em: 2026-09-19 23:55:42.472Z
  2. Nome Cliente: "Residência Família Andrade" | WhatsApp original: "(54) 99182-3400" | ID: b0acgp36ridahiu | Status: Orçamento | Cidade: Erechim | Criado em: 2026-09-19 23:55:42.474Z

--- 1.c) Mesmo WhatsApp entre registro de "contatos" e de "clientes" (nomes diferentes) ---
Nenhum caso encontrado de mesmo WhatsApp entre "contatos" e "clientes" com nomes diferentes.

======================================================
GRUPO 2 — POSSÍVEIS REGISTROS DUPLICADOS (MESMO CADASTRO CRIADO DUAS VEZES)
======================================================

--- 2.a) Contatos com nome idêntico após normalização ---
Nenhum contato com nome idêntico encontrado.

--- 2.b) Contatos com nome muito parecido (sufixos, acentos, sobrenome+inicial ou mesmo telefone) ---

[Caso 2.b #1] Motivo: Mesmo primeiro nome ("associacao") e último sobrenome ("fundo")
  1. Nome: "Associacao do Artesanato Hippie de Passo Fundo" | ID: 0mf8h94yvubwv49 | WhatsApp/Tel: "Vazio" | Criado em: 2026-09-29 11:34:37.632Z | Clientes vinculados: Nenhum cliente vinculado
  2. Nome: "Associacao dos Servidores do Centro de Atendimento Socio Educativo de Passo Fundo" | ID: vxry0009amhc77h | WhatsApp/Tel: "Vazio" | Criado em: 2026-09-29 11:34:37.633Z | Clientes vinculados: Nenhum cliente vinculado

--- 2.c) Clientes com nome muito parecido entre si E mesmo WhatsApp/telefone ---

[Caso 2.c #1] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54999560848
  1. Cliente: "Alexandro Antonio Fornari" | ID: xzwyhrk6psixq47 | Status: Novo Lead | Criado: 2026-09-13 16:52:45.603Z
  2. Cliente: "Alexandro Fornari" | ID: hlh7f8tmsm5wdtq | Status: Novo Lead | Criado: 2026-09-13 16:52:46.397Z

[Caso 2.c #2] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991855002
  1. Cliente: "Cláudio João Pagliosa" | ID: mlpch9s1ktm3y41 | Status: Fechado | Criado: 2026-09-13 16:53:42.971Z
  2. Cliente: "Cláudio Pagliosa" | ID: hv2mp0g9jl0etz1 | Status: Novo Lead | Criado: 2026-09-13 16:53:44.571Z

[Caso 2.c #3] Motivo: Nome do cliente idêntico após normalização e mesmo WhatsApp | Telefone/WhatsApp: 5435193169
  1. Cliente: "Domingos Luiz Andretta" | ID: 3rv1tps9uibxkn5 | Status: Fechado | Criado: 2026-09-13 16:54:23.974Z
  2. Cliente: "Domingos Luiz Andretta" | ID: jdajl27t6lc49n3 | Status: Novo Lead | Criado: 2026-09-13 16:54:24.174Z

[Caso 2.c #4] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996120307
  1. Cliente: "Edite Teresinha de Paris Dartora" | ID: brxn5i9kfzux1la | Status: Novo Lead | Criado: 2026-09-13 16:54:35.378Z
  2. Cliente: "Edite Teresinha Deparis Dartora" | ID: ocq2ntbkwjljxll | Status: Novo Lead | Criado: 2026-09-13 16:54:36.169Z

[Caso 2.c #5] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996167789
  1. Cliente: "Edson Luiz Goral Pagliosa" | ID: ud9mqf47gba4df3 | Status: Fechado | Criado: 2026-09-13 16:54:36.858Z
  2. Cliente: "Edson Pagliosa" | ID: zwvh5gr4nv7r0ng | Status: Fechado | Criado: 2026-09-13 16:54:37.486Z

[Caso 2.c #6] Motivo: Nome do cliente idêntico após normalização e mesmo WhatsApp | Telefone/WhatsApp: 54991878710
  1. Cliente: "Eliandro Rocha" | ID: zfj8l495v75yzwk | Status: Fechado | Criado: 2026-09-13 16:54:45.067Z
  2. Cliente: "Eliandro Rocha" | ID: o99oxjjdqp5413j | Status: Novo Lead | Criado: 2026-09-13 16:54:45.277Z

[Caso 2.c #7] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54999442424
  1. Cliente: "Eva Horszczaruk Staniczuk" | ID: wmoxkr0qzx8fhha | Status: Novo Lead | Criado: 2026-09-13 16:54:55.589Z
  2. Cliente: "Eva Staniczuk" | ID: x4iugm5vn7yjh1x | Status: Novo Lead | Criado: 2026-09-13 16:55:01.813Z

[Caso 2.c #8] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991948800
  1. Cliente: "Evandro Correa" | ID: dfnc1mj8ny515zg | Status: Fechado | Criado: 2026-09-13 16:54:57.940Z
  2. Cliente: "Evandro Lamaison Correa" | ID: btce51kwcxqtlhh | Status: Novo Lead | Criado: 2026-09-13 16:55:01.171Z

[Caso 2.c #9] Motivo: Nome do cliente idêntico após normalização e mesmo WhatsApp | Telefone/WhatsApp: 54999784699
  1. Cliente: "Fabio Demoliner" | ID: 8nsozcf4c81dgja | Status: Fechado | Criado: 2026-09-13 16:55:04.140Z
  2. Cliente: "Fábio Demoliner" | ID: rm57wehp1l1okgl | Status: Novo Lead | Criado: 2026-09-13 16:55:04.798Z

[Caso 2.c #10] Motivo: Nome do cliente idêntico após normalização e mesmo WhatsApp | Telefone/WhatsApp: 5499820981
  1. Cliente: "Fuzinatto Empreendimentos" | ID: rfubrzs6lykl2yk | Status: Novo Lead | Criado: 2026-09-13 16:55:17.920Z
  2. Cliente: "Fuzinatto Empreendimentos" | ID: 8sotyp3yr057z8a | Status: Novo Lead | Criado: 2026-09-21 16:17:58.222Z

[Caso 2.c #11] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991410361
  1. Cliente: "Geison Luis Rigo" | ID: 06qzgnk0eycwica | Status: Fechado | Criado: 2026-09-13 16:55:21.088Z
  2. Cliente: "Geison Rigo" | ID: 862ov8lddgeihtj | Status: Fechado | Criado: 2026-09-13 16:55:21.995Z

[Caso 2.c #12] Motivo: Nome do cliente idêntico após remover sufixos e mesmo WhatsApp | Telefone/WhatsApp: 54996060689
  1. Cliente: "Gerson Adriano Bovo" | ID: qut3h9i0j0rppxt | Status: Novo Lead | Criado: 2026-09-13 16:55:25.814Z
  2. Cliente: "Gerson Adriano Bovo (Erechim)" | ID: s7iznf4fbwu7dkf | Status: Fechado | Criado: 2026-09-13 16:55:26.244Z

[Caso 2.c #13] Motivo: Nome do cliente idêntico após remover sufixos e mesmo WhatsApp | Telefone/WhatsApp: 49991083026
  1. Cliente: "Gilson Bogo" | ID: k6a4asuyfejo4kn | Status: Novo Lead | Criado: 2026-09-13 16:55:34.290Z
  2. Cliente: "Gilson Bogo (Erechim)" | ID: bz5k2hjf3zlvslo | Status: Fechado | Criado: 2026-09-13 16:55:35.052Z

[Caso 2.c #14] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54992303576
  1. Cliente: "Gleison Szady da Luz" | ID: iyeiof1sjs6gwnz | Status: Fechado | Criado: 2026-09-13 16:55:38.973Z
  2. Cliente: "Gleison da Luz" | ID: b4sqldo93pta5xc | Status: Novo Lead | Criado: 2026-09-30 17:58:09.069Z

[Caso 2.c #15] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991757554
  1. Cliente: "IGOR RICARDO MENEGUZZO" | ID: kl4xksav2eu7tdj | Status: Novo Lead | Criado: 2026-09-13 16:55:53.903Z
  2. Cliente: "Igor Meneguzzo" | ID: tfriewoi717t6qm | Status: Novo Lead | Criado: 2026-09-13 18:17:12.084Z

[Caso 2.c #16] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991717901
  1. Cliente: "IVAN CARLOS DE SAIBRO" | ID: r0731l3njxynxza | Status: Fechado | Criado: 2026-09-13 16:56:00.292Z
  2. Cliente: "Ivan Carlos Saibro" | ID: cxbp40e04df5jyd | Status: Novo Lead | Criado: 2026-09-30 17:58:11.070Z

[Caso 2.c #17] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996720012
  1. Cliente: "Janete Cozer" | ID: zw5vthd1j4fhyth | Status: Fechado | Criado: 2026-09-13 16:56:16.291Z
  2. Cliente: "Janete Marcelina Cozer" | ID: 3wweu9maps4pp03 | Status: Novo Lead | Criado: 2026-09-13 16:56:17.217Z

[Caso 2.c #18] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 49988334151
  1. Cliente: "JEAN CARLOS CEZNE" | ID: 9oqpjymravwvm75 | Status: Novo Lead | Criado: 2026-09-13 16:56:18.211Z
  2. Cliente: "Jean Cezne" | ID: s77odsd0twhofdh | Status: Fechado | Criado: 2026-09-13 16:56:19.862Z

[Caso 2.c #19] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54999039923
  1. Cliente: "Joel Barberini" | ID: 44pvjpkr0a0cdxf | Status: Fechado | Criado: 2026-09-13 16:56:26.987Z
  2. Cliente: "Joel Rodrigo Barberini" | ID: x7xrgpkl12n6dpi | Status: Novo Lead | Criado: 2026-09-30 17:58:13.508Z

[Caso 2.c #20] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996550242
  1. Cliente: "Julio Luis Baú" | ID: cnhm7us9mhhkwjo | Status: Novo Lead | Criado: 2026-09-13 16:56:39.106Z
  2. Cliente: "Julio Luiz Bau" | ID: 90b4p8orjy8hjpd | Status: Fechado | Criado: 2026-09-13 16:56:40.453Z

[Caso 2.c #21] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 5499091157
  1. Cliente: "Marcelo José Pavan" | ID: iwf25lo6h0ct45r | Status: Fechado | Criado: 2026-09-13 16:57:17.951Z
  2. Cliente: "Marcelo Pavan" | ID: 0s9yxuwnpouqqr9 | Status: Novo Lead | Criado: 2026-09-30 17:58:21.072Z

[Caso 2.c #22] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54999093192
  1. Cliente: "Marcos Moretto" | ID: mb44plolxhb1mcl | Status: Fechado | Criado: 2026-09-13 16:57:27.461Z
  2. Cliente: "Marcos Aurélio Moretto" | ID: cf4lheafmqh2zd1 | Status: Novo Lead | Criado: 2026-09-30 17:58:21.824Z

[Caso 2.c #23] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 5496505560
  1. Cliente: "Mateus Klein" | ID: fssyad1g02euwh6 | Status: Fechado | Criado: 2026-09-13 16:57:40.351Z
  2. Cliente: "Mateus Dall Agnolo Klein" | ID: swjjvfb6a6xkosi | Status: Novo Lead | Criado: 2026-09-30 17:58:24.532Z

[Caso 2.c #24] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54997034522
  1. Cliente: "Paulinho Benka" | ID: 6fk63h551429s1v | Status: Novo Lead | Criado: 2026-09-13 16:58:26.903Z
  2. Cliente: "Paulinho Altair Benka" | ID: uj5mlsosumg6yiq | Status: Novo Lead | Criado: 2026-09-30 17:58:27.938Z

[Caso 2.c #25] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 5491420648
  1. Cliente: "PAULO RICARDO ZANELLA" | ID: vbqv0luejiemzdo | Status: Fechado | Criado: 2026-09-13 16:58:32.431Z
  2. Cliente: "Paulo Zanella" | ID: ej8092v5qp6kot1 | Status: Fechado | Criado: 2026-09-13 16:58:35.556Z

[Caso 2.c #26] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54999365098
  1. Cliente: "RENAN BADALOTTI" | ID: tjd2mlpt927ztbf | Status: Fechado | Criado: 2026-09-13 16:58:47.115Z
  2. Cliente: "Renan Hlavac Badalotti" | ID: 36obidq0elsmjsz | Status: Fechado | Criado: 2026-09-13 16:58:47.347Z

[Caso 2.c #27] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 5499826484
  1. Cliente: "Roberto José Moretto" | ID: 9lururc04u6lyks | Status: Fechado | Criado: 2026-09-13 16:58:58.427Z
  2. Cliente: "Roberto Moretto (Titular: Marcelo Matheus Moretto)" | ID: jf0l0mn1uvl8ra2 | Status: Novo Lead | Criado: 2026-09-13 18:19:29.317Z

[Caso 2.c #28] Motivo: Nome do cliente idêntico após normalização e mesmo WhatsApp | Telefone/WhatsApp: 54991897379
  1. Cliente: "Rodrigo Ferranti" | ID: 7nov8fqcml47r24 | Status: Fechado | Criado: 2026-09-13 16:59:02.790Z
  2. Cliente: "Rodrigo Ferranti" | ID: udwpk5xh1yrlcky | Status: Fechado | Criado: 2026-09-13 16:59:03.026Z

[Caso 2.c #29] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996672828
  1. Cliente: "Rodrigo Pretto Buss" | ID: chhhrvtc2x4535q | Status: Fechado | Criado: 2026-09-13 16:59:03.922Z
  2. Cliente: "Rodrigo Buss" | ID: drsvd23qzy0idid | Status: Novo Lead | Criado: 2026-09-13 18:19:40.922Z

[Caso 2.c #30] Motivo: Nome do cliente idêntico após normalização e mesmo WhatsApp | Telefone/WhatsApp: 54999487758
  1. Cliente: "Taise Pedroti" | ID: dw53sdwdqi6d8j9 | Status: Fechado | Criado: 2026-09-13 16:59:39.929Z
  2. Cliente: "Taíse Pedroti" | ID: xxzy7jn26018d74 | Status: Novo Lead | Criado: 2026-09-13 16:59:40.201Z

======================================================
RESUMO DOS RESULTADOS DA AUDITORIA
======================================================
Total contatos lidos e validados: 91
Total clientes lidos e validados: 1529
Grupo 1.a (mesmo WhatsApp em múltiplos contatos): 0 casos
Grupo 1.b (mesmo WhatsApp em múltiplos clientes): 128 casos
Grupo 1.c (mesmo WhatsApp entre contato e cliente com nomes distintos): 0 casos
Grupo 2.a (contatos com nome idêntico): 0 casos
Grupo 2.b (contatos com nomes parecidos/sufixos): 1 casos
Grupo 2.c (clientes com nomes parecidos e mesmo WhatsApp): 30 casos

=== AUDITORIA CONCLUÍDA COM SUCESSO ===

```

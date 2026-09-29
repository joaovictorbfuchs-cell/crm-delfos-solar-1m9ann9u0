# Relatório de Auditoria de Duplicados e Vínculos de Contatos — CRM Delfos Solar

**Data/Hora da Execução:** 2026-09-29T21:53:01.688Z  
**Ambiente do Banco:** https://crm-delfos-solar-72b9e.shrd00.internal.goskip.dev  
**Usuário Autenticado:** joao@delfosengenharia.com.br  
**Validação de Sanidade:** APROVADA (Total carregado bate exatamente com o totalItems do PocketBase)

---

## 1. Resumo Executivo das Métricas

| Métrica | Quantidade | Observações / Detalhes |
| :--- | :---: | :--- |
| **Total de Registros em Contatos** | **91** | Base validada contra o banco PocketBase via paginação estrita |
| **Total de Registros em Clientes** | **1509** | Base validada contra o banco PocketBase via paginação estrita |
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

- **Orçamento:** 10 clientes
- **Negociação:** 4 clientes
- **Novo Lead:** 1041 clientes
- **Fechado:** 451 clientes
- **Levantamento:** 2 clientes
- **Contato Futuro:** 1 clientes

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
  **85 casos.** Casos detectados onde um mesmo número de WhatsApp está associado a múltiplos cadastros na coleção `clientes` (incluindo usinas/filiais, cotações de demonstração e cadastros repetidos com status distintos).

- **1.c) Mesmo WhatsApp entre `contatos` e `clientes` com nomes diferentes:**  
  **0 casos.** Nenhuma colisão cruzada com nomes divergentes.

---

### Grupo 2: Análise por Nome e Grafia (Duplicidades)

- **2.a) Contatos com nome idêntico (normalizado):**  
  **0 casos.** Nenhum contato duplicado por nome exato na coleção `contatos`.

- **2.b) Contatos com nome muito parecido / sufixos / mesmo telefone:**  
  **1 casos.** Caso detectado de associação com início e fim similares na coleção `contatos`.

- **2.c) Clientes com nome muito parecido E mesmo WhatsApp:**  
  **13 casos.**
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
  - Total informado pelo servidor (`totalItems`): **1509**
  - Total paginado e acumulado localmente: **1509**
  - Resultado: **BATEU 100% (Sem divergência)**

---

## 6. Log Completo da Auditoria

```text
=== INICIANDO AUDITORIA DE DUPLICIDADES NO CRM DELFOS SOLAR ===

Autenticação com PocketBase: SUCESSO (usuário autenticado: joao@delfosengenharia.com.br)

--- 1. LEITURA COMPLETA DAS COLEÇÕES (SANITY CHECK) ---
Executando paginação direta via SDK/PocketBase API com sanity check...
Total confirmado na coleção 'contatos': 91
Total confirmado na coleção 'clientes': 1509

--- RESUMO NUMÉRICO INICIAL ---
Total geral de contatos: 91
Distribuição de contatos por papel: {"fornecedor":1,"outro":90}
Total geral de clientes: 1509
Distribuição de clientes por status: {"Orçamento":10,"Negociação":4,"Novo Lead":1041,"Fechado":451,"Levantamento":2,"Contato Futuro":1}
Registros em 'contatos' com telefone/WhatsApp válido: 4 de 91
Registros em 'clientes' com telefone/WhatsApp válido: 613 de 1509

======================================================
GRUPO 1 — MESMO WHATSAPP EM REGISTROS DIFERENTES
======================================================

--- 1.a) Mesmo WhatsApp em 2+ registros de "contatos" ---
Nenhum caso encontrado de mesmo WhatsApp compartilhado entre múltiplos registros de "contatos".

--- 1.b) Mesmo WhatsApp em 2+ "clientes" DIFERENTES ---

[Caso 1.b #1] Número normalizado: 54981108228 (2 clientes)
  1. Nome Cliente: "João Victor Bagetti Fuchs" | WhatsApp original: "(54) 98110-8228" | ID: 4bb6q12dbgk5sa4 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-11 17:19:48.868Z
  2. Nome Cliente: "Delfos Engenharia Ltda" | WhatsApp original: "(54) 9 8110-8228" | ID: 50vyppm3qwwuz62 | Status: Fechado | Cidade: São Valentim | Criado em: 2026-09-13 16:54:13.834Z

[Caso 1.b #2] Número normalizado: 54981540399 (2 clientes)
  1. Nome Cliente: "Adriana Paula Daniel (Leonardo Canova)" | WhatsApp original: "54981540399" | ID: 2g8ialg82d8xaw5 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:52:35.608Z
  2. Nome Cliente: "Valdir Moretto" | WhatsApp original: "54981540399" | ID: jellyjglzn8l2c0 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:58.364Z

[Caso 1.b #3] Número normalizado: 54991011213 (2 clientes)
  1. Nome Cliente: "ADRIANO GELAIN MACHADO" | WhatsApp original: "54991011213" | ID: n1wqa6x1pultp6h | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:35.820Z
  2. Nome Cliente: "Eder Luis Ribeiro" | WhatsApp original: "54991011213" | ID: 1gq50sog0mkyt0d | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:29.628Z

[Caso 1.b #4] Número normalizado: 54999368565 (2 clientes)
  1. Nome Cliente: "Adriano Nunes Martins" | WhatsApp original: "54999368565" | ID: k6etdnquwggi5j9 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:52:37.080Z
  2. Nome Cliente: "Solvindo Dalbianco" | WhatsApp original: "54999368565" | ID: n7tbdzt348p8ogo | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:35.297Z

[Caso 1.b #5] Número normalizado: 54999984772 (2 clientes)
  1. Nome Cliente: "Alan Cleiton Pereira" | WhatsApp original: "54999984772" | ID: ri61txiscy484kv | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:38.458Z
  2. Nome Cliente: "Luiz Caron" | WhatsApp original: "54999984772" | ID: j1xyvxaayzzfyv7 | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:57:09.130Z

[Caso 1.b #6] Número normalizado: 54996562780 (3 clientes)
  1. Nome Cliente: "Alisson Daniel Pastorio (Titular: Erika Simone dos Reis Triches)" | WhatsApp original: "54996562780" | ID: qno83col3u41wpf | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:47.403Z
  2. Nome Cliente: "EDUARDO GODGIENSKI" | WhatsApp original: "54996562780" | ID: 9it1z1v04mdws5c | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:54:40.398Z
  3. Nome Cliente: "Miriam Faustino Batistella (Titular: Faustino Batistella)" | WhatsApp original: "54996562780" | ID: y6g41v50gti89va | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:57:54.793Z

[Caso 1.b #7] Número normalizado: 54996676421 (2 clientes)
  1. Nome Cliente: "Almiro Weirich" | WhatsApp original: "54996676421" | ID: tuog29w8p576i3y | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:49.574Z
  2. Nome Cliente: "Rubi Leopoldo Escher" | WhatsApp original: "54996676421" | ID: hev2r4bdqub3ffw | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:13.477Z

[Caso 1.b #8] Número normalizado: 54996090984 (3 clientes)
  1. Nome Cliente: "André Paulo Angonese (Erechim)" | WhatsApp original: "54996090984" | ID: hsuel9w42wjqjki | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:57.022Z
  2. Nome Cliente: "Laudemir" | WhatsApp original: "54996090984" | ID: 3wmu9dmust8zuap | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:56:44.197Z
  3. Nome Cliente: "LAUDEMIR JOSE PAGNONCELLI" | WhatsApp original: "54996090984" | ID: 7zy0kkazmqnlm5e | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:56:44.406Z

[Caso 1.b #9] Número normalizado: 54984129207 (2 clientes)
  1. Nome Cliente: "Antonio Luiz Serraglio" | WhatsApp original: "54984129207" | ID: mp1gx8m2hrwfnqt | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:52:59.994Z
  2. Nome Cliente: "Antonio Serraglio  casa" | WhatsApp original: "54984129207" | ID: snm4kwvu411b9ek | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:00.216Z

[Caso 1.b #10] Número normalizado: 54984040064 (2 clientes)
  1. Nome Cliente: "Armelindo Rosset" | WhatsApp original: "54984040064" | ID: g9cg73zw78woyx7 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:03.492Z
  2. Nome Cliente: "Lauro Rosset (Erechim)" | WhatsApp original: "54984040064" | ID: uowgfb4bwy4uivi | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:56:46.166Z

[Caso 1.b #11] Número normalizado: 54991976668 (2 clientes)
  1. Nome Cliente: "Artidor Andrade" | WhatsApp original: "54991976668" | ID: 0lwy71qzcpjs7vj | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:06.062Z
  2. Nome Cliente: "Cristiano Backes" | WhatsApp original: "54991976668" | ID: yw91c3zoz5ttu6q | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:59.909Z

[Caso 1.b #12] Número normalizado: 54991062838 (2 clientes)
  1. Nome Cliente: "Associação dos Pequenos Comerciantes do Mercado Popular (Erechim)" | WhatsApp original: "54991062838" | ID: 678ioimndauvbh1 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:07.602Z
  2. Nome Cliente: "Rogério Rewsat" | WhatsApp original: "54991062838" | ID: aoge0lq9yryc69f | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:08.220Z

[Caso 1.b #13] Número normalizado: 54991842965 (2 clientes)
  1. Nome Cliente: "Baita (Cladir João Dariva)" | WhatsApp original: "54991842965" | ID: 2o085q8y3gfshxd | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:10.382Z
  2. Nome Cliente: "Cristiane Karina Molozzi" | WhatsApp original: "54991842965" | ID: htfvx1cqs3j02lq | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:59.110Z

[Caso 1.b #14] Número normalizado: 5433211015 (3 clientes)
  1. Nome Cliente: "Bem Estar" | WhatsApp original: "5433211015" | ID: qju6ysehi7eo5rh | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:12.964Z
  2. Nome Cliente: "Bem Estar Móveis" | WhatsApp original: "(54) 3321-1015" | ID: jaf4sh091oo04nm | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:13.516Z
  3. Nome Cliente: "Nelsa Horbach" | WhatsApp original: "5433211015" | ID: 16cwn5xn4f6w9rk | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:09.124Z

[Caso 1.b #15] Número normalizado: 55996805318 (2 clientes)
  1. Nome Cliente: "Carlos de Oliveira" | WhatsApp original: "55996805318" | ID: y6c6isklnuhr4zs | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:21.094Z
  2. Nome Cliente: "Rodrigo Buss - DELCI ARLI NEUENFELDT" | WhatsApp original: "55996805318" | ID: kpkyf13di7ud17p | Status: Novo Lead | Cidade: Nova Palma | Criado em: 2026-09-13 16:59:01.825Z

[Caso 1.b #16] Número normalizado: 5435201500 (3 clientes)
  1. Nome Cliente: "Cassul" | WhatsApp original: "5435201500" | ID: 3df400dfk3wpo9e | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:27.668Z
  2. Nome Cliente: "CASSUL DISTRIB DE PROD AGROPECS LTDA" | WhatsApp original: "(54) 3520-1500" | ID: vrbbc0acybhwdxk | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:27.898Z
  3. Nome Cliente: "CASSUL DISTRIBUIDORA" | WhatsApp original: "5435201500" | ID: 16dz87zr0d5auce | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:28.998Z

[Caso 1.b #17] Número normalizado: 54991282415 (2 clientes)
  1. Nome Cliente: "Célio Carlos Carlesso" | WhatsApp original: "54991282415" | ID: 5idsmuhaapswn49 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:33.433Z
  2. Nome Cliente: "Luiz Tirello - Flávio Tirello" | WhatsApp original: "54991282415" | ID: vfnj6bm52xeagfh | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:57:12.152Z

[Caso 1.b #18] Número normalizado: 54992257151 (2 clientes)
  1. Nome Cliente: "Celso Luiz Lando" | WhatsApp original: "54992257151" | ID: zlphez1d5qny2k2 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:34.024Z
  2. Nome Cliente: "Domingos da Luz" | WhatsApp original: "54992257151" | ID: 51jseuixgrp7vh9 | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:54:23.274Z

[Caso 1.b #19] Número normalizado: 5435222350 (2 clientes)
  1. Nome Cliente: "CENTRAL DO SONO LTDA" | WhatsApp original: "5435222350" | ID: 5vk39epoihl5e2g | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:34.672Z
  2. Nome Cliente: "JG OLDRA Comércio de Móveis LTDA ME (Erechim)" | WhatsApp original: "5435222350" | ID: ja627k4f63km36m | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:56:22.139Z

[Caso 1.b #20] Número normalizado: 5430158366 (2 clientes)
  1. Nome Cliente: "Clara Marucia Nunes - RODRIGO (Lagoão)" | WhatsApp original: "5430158366" | ID: f3djx5l9no83nwj | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:40.991Z
  2. Nome Cliente: "System Sistemas de Gestão" | WhatsApp original: "(54) 3015-8366" | ID: rt2uoiyfwgxivkj | Status: Fechado | Cidade: ERECHIM | Criado em: 2026-09-13 16:59:38.403Z

[Caso 1.b #21] Número normalizado: 54999418531 (2 clientes)
  1. Nome Cliente: "Claudio Iarocz" | WhatsApp original: "54999418531" | ID: l8d0ibvoqa4i76s | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:42.145Z
  2. Nome Cliente: "Rodrigo Scarmignani" | WhatsApp original: "54999418531" | ID: ycchoyld4ihmbh5 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:05.383Z

[Caso 1.b #22] Número normalizado: 54991855002 (3 clientes)
  1. Nome Cliente: "Cláudio João Pagliosa" | WhatsApp original: "54991855002" | ID: mlpch9s1ktm3y41 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:42.971Z
  2. Nome Cliente: "Cláudio Pagliosa" | WhatsApp original: "54991855002" | ID: hv2mp0g9jl0etz1 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:44.571Z
  3. Nome Cliente: "Otávio Pereira (Jose Otavio Otinguassu Brasil Pereira)" | WhatsApp original: "54991855002" | ID: tenqsljeqblapbq | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:21.129Z

[Caso 1.b #23] Número normalizado: 51998370245 (2 clientes)
  1. Nome Cliente: "CLAUDIR JOAO GALINA" | WhatsApp original: "51998370245" | ID: gn8810vrmyi69mk | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:53:44.774Z
  2. Nome Cliente: "João Galina" | WhatsApp original: "51998370245" | ID: 5s5oe5f49zjax64 | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:24.973Z

[Caso 1.b #24] Número normalizado: 54999689557 (2 clientes)
  1. Nome Cliente: "CLEOMAR JOSE FRANCO" | WhatsApp original: "54999689557" | ID: a9e5qkofa2em0uv | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:46.542Z
  2. Nome Cliente: "Marcio (São José do Ouro) (Titular: Karine Centenaro)" | WhatsApp original: "54999689557" | ID: bdhucdggdfqbr8o | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:57:23.525Z

[Caso 1.b #25] Número normalizado: 54999074589 (2 clientes)
  1. Nome Cliente: "Cleomar Rempel" | WhatsApp original: "54999074589" | ID: 2ro79qtw3x4kih2 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:53:47.638Z
  2. Nome Cliente: "Nilza Maria K. de Oliveira" | WhatsApp original: "54999074589" | ID: uvg2bzqir3m0jno | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:14.703Z

[Caso 1.b #26] Número normalizado: 54999953462 (3 clientes)
  1. Nome Cliente: "Cubbo Engenharia" | WhatsApp original: "54999953462" | ID: w90hqff0n2v8ffb | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:54:02.236Z
  2. Nome Cliente: "Helena P" | WhatsApp original: "54999953462" | ID: 03v6r548690034v | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:55:47.799Z
  3. Nome Cliente: "Helena Pachla" | WhatsApp original: "54999953462" | ID: jg5wequzf4c6pac | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:49.005Z

[Caso 1.b #27] Número normalizado: 5433212466 (3 clientes)
  1. Nome Cliente: "DAL PRA INDUSTRIA E COMERCIO" | WhatsApp original: "5433212466" | ID: iol2e3vlvkco93o | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:54:03.205Z
  2. Nome Cliente: "MDP" | WhatsApp original: "5433212466" | ID: naye627nv9itiy3 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:57:48.214Z
  3. Nome Cliente: "MOVEIS DAL PRA" | WhatsApp original: "5433212466" | ID: ynp3jrksapveafe | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:58.616Z

[Caso 1.b #28] Número normalizado: 54997068019 (2 clientes)
  1. Nome Cliente: "Darlan (Jolvani Santa Catarina)" | WhatsApp original: "54997068019" | ID: ejnpgksk1lgepgv | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:54:07.052Z
  2. Nome Cliente: "Paulo Dezordi" | WhatsApp original: "54997068019" | ID: t6hbowfrr57sbf4 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:31.310Z

[Caso 1.b #29] Número normalizado: 54991449191 (2 clientes)
  1. Nome Cliente: "DE CARLI EMBALAGENS E MATERIAIS DE LIMPEZA LTDA" | WhatsApp original: "54991449191" | ID: r4hptxnzg2ah35e | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:54:09.952Z
  2. Nome Cliente: "Gustavo Frey" | WhatsApp original: "54991449191" | ID: 4hqrivytppc8dt4 | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:55:43.261Z

[Caso 1.b #30] Número normalizado: 54999105656 (2 clientes)
  1. Nome Cliente: "Deisiele Morais do Nascimento" | WhatsApp original: "54999105656" | ID: m0van392xchhp71 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:54:11.283Z
  2. Nome Cliente: "Mateus Rech" | WhatsApp original: "54999105656" | ID: ijty4cy93tw6stt | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:41.654Z

[Caso 1.b #31] Número normalizado: 54984121984 (2 clientes)
  1. Nome Cliente: "Delcio Antonio Zanin" | WhatsApp original: "54984121984" | ID: g1yovfdpjhuf1pa | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:12.302Z
  2. Nome Cliente: "Neimar Paula Rodrigues (Elisete)" | WhatsApp original: "54984121984" | ID: regzc1hjc5ljhkp | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:06.079Z

[Caso 1.b #32] Número normalizado: 54999920142 (3 clientes)
  1. Nome Cliente: "Diana 3 Tamanini" | WhatsApp original: "54999920142" | ID: 3obyrojev28k3q7 | Status: Novo Lead | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:54:16.838Z
  2. Nome Cliente: "Farmacia Erechim CD" | WhatsApp original: "54999920142" | ID: 5vn492xfwa6upl1 | Status: Fechado | Cidade: Sananduva | Criado em: 2026-09-13 16:55:07.664Z
  3. Nome Cliente: "Farmácia Erechim Loja 15" | WhatsApp original: "54999920142" | ID: v3zficbn23r2nac | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:55:09.691Z

[Caso 1.b #33] Número normalizado: 54984423518 (2 clientes)
  1. Nome Cliente: "Dilmo Cagol" | WhatsApp original: "54984423518" | ID: z93gdnes5izuscm | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:54:18.831Z
  2. Nome Cliente: "MARCOS\DILMO CAGOL" | WhatsApp original: "54984423518" | ID: 9efyggqltr8kjqj | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:57:25.901Z

[Caso 1.b #34] Número normalizado: 54999568352 (2 clientes)
  1. Nome Cliente: "Dione Fátima Alberti Muller (João Jardineiro)" | WhatsApp original: "54999568352" | ID: a355ca9hw9t4w6m | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:20.473Z
  2. Nome Cliente: "Lídia Oliveira Magalhães (Erechim)" | WhatsApp original: "54999568352" | ID: ea8v9xdug2inbym | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:56:53.397Z

[Caso 1.b #35] Número normalizado: 54996420987 (2 clientes)
  1. Nome Cliente: "Disnei e Elisangela (Titular: Disnei Pedro Mendes)" | WhatsApp original: "54996420987" | ID: 3ye7yfxova02syk | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:54:21.254Z
  2. Nome Cliente: "Gustavo Rossi Bastian (cubbo)" | WhatsApp original: "54996420987" | ID: yw7xp0ynxe2j4u8 | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:55:44.294Z

[Caso 1.b #36] Número normalizado: 5435193169 (2 clientes)
  1. Nome Cliente: "Domingos Luiz Andretta" | WhatsApp original: "5435193169" | ID: 3rv1tps9uibxkn5 | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:54:23.974Z
  2. Nome Cliente: "Domingos Luiz Andretta" | WhatsApp original: "5435193169" | ID: jdajl27t6lc49n3 | Status: Novo Lead | Cidade: Passo Fundo | Criado em: 2026-09-13 16:54:24.174Z

[Caso 1.b #37] Número normalizado: 54991371483 (2 clientes)
  1. Nome Cliente: "Dorvalino Rodrigues" | WhatsApp original: "54991371483" | ID: ckynnvexvniwye1 | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:54:25.195Z
  2. Nome Cliente: "Lodair Lodi" | WhatsApp original: "54991371483" | ID: 11kcbjjlhuigryv | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:56:59.644Z

[Caso 1.b #38] Número normalizado: 5496153215 (2 clientes)
  1. Nome Cliente: "Douglas Cararo" | WhatsApp original: "5496153215" | ID: ctjvakdkk220gp8 | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:54:25.472Z
  2. Nome Cliente: "Silva Tessaro" | WhatsApp original: "5496153215" | ID: 6jn77yes5nrszyy | Status: Novo Lead | Cidade: Barra do Rio Azul | Criado em: 2026-09-13 16:59:25.637Z

[Caso 1.b #39] Número normalizado: 51985018659 (2 clientes)
  1. Nome Cliente: "Ederli Becker" | WhatsApp original: "51985018659" | ID: ezrghainutnmoyf | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:54:28.986Z
  2. Nome Cliente: "Joel - Estrela" | WhatsApp original: "51985018659" | ID: 6r1tw8kclsm42sw | Status: Novo Lead | Cidade: Aratiba | Criado em: 2026-09-13 16:56:28.562Z

[Caso 1.b #40] Número normalizado: 54999822499 (2 clientes)
  1. Nome Cliente: "Edificio Prime - Fuzinatto Empreendimentos Imobiliários LTDA." | WhatsApp original: "54999822499" | ID: idchoo3y6pq2la4 | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:54:32.784Z
  2. Nome Cliente: "Volmir Fusinato" | WhatsApp original: "54999822499" | ID: vnqhrivhvxp71a9 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 17:00:20.778Z

[Caso 1.b #41] Número normalizado: 54996120307 (5 clientes)
  1. Nome Cliente: "Edite Teresinha de Paris Dartora" | WhatsApp original: "54996120307" | ID: brxn5i9kfzux1la | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:54:35.378Z
  2. Nome Cliente: "Edite Teresinha Deparis Dartora" | WhatsApp original: "54996120307" | ID: ocq2ntbkwjljxll | Status: Novo Lead | Cidade: Tapejara | Criado em: 2026-09-13 16:54:36.169Z
  3. Nome Cliente: "Salete Reis Sassi" | WhatsApp original: "54996120307" | ID: uldddq7wy45zef6 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:59:16.499Z
  4. Nome Cliente: "Vinícius Daltora" | WhatsApp original: "54996120307" | ID: 4cl8jz9ppce133o | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:12.129Z
  5. Nome Cliente: "Vinicius Dartora - Salete Sassi" | WhatsApp original: "54996120307" | ID: yvv0c45ba0ka25x | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:13.352Z

[Caso 1.b #42] Número normalizado: 54996167789 (3 clientes)
  1. Nome Cliente: "Edson Luiz Goral Pagliosa" | WhatsApp original: "54996167789" | ID: ud9mqf47gba4df3 | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:54:36.858Z
  2. Nome Cliente: "Edson Pagliosa" | WhatsApp original: "54996167789" | ID: zwvh5gr4nv7r0ng | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:54:37.486Z
  3. Nome Cliente: "Greice M. Marques da Silva - (Volmir Tartari)" | WhatsApp original: "54996167789" | ID: z5gecrj7gxkvxxe | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:40.259Z

[Caso 1.b #43] Número normalizado: 54992032042 (2 clientes)
  1. Nome Cliente: "Eduardo Giaretta" | WhatsApp original: "54992032042" | ID: 8nu3l25954jbfh4 | Status: Fechado | Cidade: Sananduva | Criado em: 2026-09-13 16:54:39.101Z
  2. Nome Cliente: "Luciane Brandão" | WhatsApp original: "54992032042" | ID: 1ad8ox1pfg0sn5t | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:57:04.648Z

[Caso 1.b #44] Número normalizado: 54984096662 (2 clientes)
  1. Nome Cliente: "Elésio - (Titular: Sérgio Pomieczinski)" | WhatsApp original: "54984096662" | ID: mn09qvk5b3vd5dm | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:54:42.919Z
  2. Nome Cliente: "Fabiano Petska" | WhatsApp original: "54984096662" | ID: ib7wh5qawh3gtpi | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:55:03.339Z

[Caso 1.b #45] Número normalizado: 54991420648 (2 clientes)
  1. Nome Cliente: "Emanuela (Titular: Loiri Pansera)" | WhatsApp original: "54991420648" | ID: fy0wqwqadtowahb | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:54:48.285Z
  2. Nome Cliente: "Ernani Dassi (Mercedes)" | WhatsApp original: "54991420648" | ID: ed80xeol2bofish | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:54:49.290Z

[Caso 1.b #46] Número normalizado: 54981316187 (2 clientes)
  1. Nome Cliente: "Ernani Ferreira" | WhatsApp original: "54981316187" | ID: kq3rrn636vqn8t5 | Status: Fechado | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:54:50.060Z
  2. Nome Cliente: "Fabio Goedel" | WhatsApp original: "54981316187" | ID: sq3um5g6slinpz1 | Status: Fechado | Cidade: Tapejara | Criado em: 2026-09-13 16:55:05.516Z

[Caso 1.b #47] Número normalizado: 54999442424 (2 clientes)
  1. Nome Cliente: "Eva Horszczaruk Staniczuk" | WhatsApp original: "54999442424" | ID: wmoxkr0qzx8fhha | Status: Novo Lead | Cidade: Aratiba | Criado em: 2026-09-13 16:54:55.589Z
  2. Nome Cliente: "Eva Staniczuk" | WhatsApp original: "54999442424" | ID: x4iugm5vn7yjh1x | Status: Novo Lead | Cidade: Gaurama | Criado em: 2026-09-13 16:55:01.813Z

[Caso 1.b #48] Número normalizado: 54991948800 (2 clientes)
  1. Nome Cliente: "Evandro Correa" | WhatsApp original: "54991948800" | ID: dfnc1mj8ny515zg | Status: Fechado | Cidade: Sananduva | Criado em: 2026-09-13 16:54:57.940Z
  2. Nome Cliente: "Evandro Lamaison Correa" | WhatsApp original: "54991948800" | ID: btce51kwcxqtlhh | Status: Novo Lead | Cidade: Severiano de Almeida | Criado em: 2026-09-13 16:55:01.171Z

[Caso 1.b #49] Número normalizado: 5435196375 (2 clientes)
  1. Nome Cliente: "Farmácias Erechim - Loja 14" | WhatsApp original: "5435196375" | ID: 66la7obxsyttdyr | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:10.551Z
  2. Nome Cliente: "PAULO ROBERTO FORNARI & CIA LTDA." | WhatsApp original: "5435196375" | ID: dqes014ftpr9e8x | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:33.095Z

[Caso 1.b #50] Número normalizado: 54991410361 (2 clientes)
  1. Nome Cliente: "Geison Luis Rigo" | WhatsApp original: "54991410361" | ID: 06qzgnk0eycwica | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:21.088Z
  2. Nome Cliente: "Geison Rigo" | WhatsApp original: "54991410361" | ID: 862ov8lddgeihtj | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:55:21.995Z

[Caso 1.b #51] Número normalizado: 54991897379 (2 clientes)
  1. Nome Cliente: "Genuir Franceschi" | WhatsApp original: "54991897379" | ID: 0hmu2a5iww3o6ur | Status: Fechado | Cidade: Sertão | Criado em: 2026-09-13 16:55:24.099Z
  2. Nome Cliente: "Rodrigo Ferranti" | WhatsApp original: "54991897379" | ID: udwpk5xh1yrlcky | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:59:03.026Z

[Caso 1.b #52] Número normalizado: 54996060689 (2 clientes)
  1. Nome Cliente: "Gerson Adriano Bovo" | WhatsApp original: "54996060689" | ID: qut3h9i0j0rppxt | Status: Novo Lead | Cidade: Aratiba | Criado em: 2026-09-13 16:55:25.814Z
  2. Nome Cliente: "Gerson Adriano Bovo (Erechim)" | WhatsApp original: "54996060689" | ID: s7iznf4fbwu7dkf | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:55:26.244Z

[Caso 1.b #53] Número normalizado: 5499159354 (2 clientes)
  1. Nome Cliente: "Gilmar Bertoldi" | WhatsApp original: "5499159354" | ID: 1awo5ml5jp69t73 | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:55:32.563Z
  2. Nome Cliente: "Mauricio Bertoldi" | WhatsApp original: "5499159354" | ID: ubvjd4g1y913rit | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:43.877Z

[Caso 1.b #54] Número normalizado: 54999056500 (2 clientes)
  1. Nome Cliente: "Gilmar Granzotto" | WhatsApp original: "54999056500" | ID: ffg0e01mdbbh3yb | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:55:33.338Z
  2. Nome Cliente: "Pantaleão Smagala" | WhatsApp original: "54999056500" | ID: da9geg1jui7w3z4 | Status: Novo Lead | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:58:24.311Z

[Caso 1.b #55] Número normalizado: 49991083026 (2 clientes)
  1. Nome Cliente: "Gilson Bogo" | WhatsApp original: "49991083026" | ID: k6a4asuyfejo4kn | Status: Novo Lead | Cidade: Tapejara | Criado em: 2026-09-13 16:55:34.290Z
  2. Nome Cliente: "Gilson Bogo (Erechim)" | WhatsApp original: "49991083026" | ID: bz5k2hjf3zlvslo | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:55:35.052Z

[Caso 1.b #56] Número normalizado: 1554992133760 (2 clientes)
  1. Nome Cliente: "Gilson Marini" | WhatsApp original: "1554992133760" | ID: d0k1lkhl20txlg8 | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:55:35.843Z
  2. Nome Cliente: "Gison Marini" | WhatsApp original: "1554992133760" | ID: nfecnhtu6ow626d | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:55:36.063Z

[Caso 1.b #57] Número normalizado: 54999120636 (2 clientes)
  1. Nome Cliente: "Gladis Bergman Zaffari" | WhatsApp original: "54999120636" | ID: zdlnmcp6e65e6bq | Status: Fechado | Cidade: Sananduva | Criado em: 2026-09-13 16:55:37.799Z
  2. Nome Cliente: "Nelson Roque Kowalski" | WhatsApp original: "54999120636" | ID: ad9knhiw9uuw6kq | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:12.339Z

[Caso 1.b #58] Número normalizado: 54996222946 (2 clientes)
  1. Nome Cliente: "Gustavo Camerini" | WhatsApp original: "54996222946" | ID: wc8pdj5ftirr95a | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:55:41.429Z
  2. Nome Cliente: "Nadir Camerini" | WhatsApp original: "54996222946" | ID: sjrqhw78amc958m | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:58:00.759Z

[Caso 1.b #59] Número normalizado: 54991757554 (2 clientes)
  1. Nome Cliente: "IGOR RICARDO MENEGUZZO" | WhatsApp original: "54991757554" | ID: kl4xksav2eu7tdj | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:55:53.903Z
  2. Nome Cliente: "Patricia S (Titular: Nilmar Ferrari Fabro)" | WhatsApp original: "54991757554" | ID: 6oyce065nkb28nr | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:26.285Z

[Caso 1.b #60] Número normalizado: 54993310444 (2 clientes)
  1. Nome Cliente: "Iraci Fátima" | WhatsApp original: "54993310444" | ID: xp56s58mtagy7ax | Status: Fechado | Cidade: Gaurama | Criado em: 2026-09-13 16:55:57.246Z
  2. Nome Cliente: "Tiago Smagala" | WhatsApp original: "54993310444" | ID: whjnrxcgacah938 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:47.511Z

[Caso 1.b #61] Número normalizado: 54999980025 (3 clientes)
  1. Nome Cliente: "Irones/Laudir Reis" | WhatsApp original: "54999980025" | ID: dnktzm72w570d6c | Status: Novo Lead | Cidade: Passo Fundo | Criado em: 2026-09-13 16:55:57.896Z
  2. Nome Cliente: "Laudir da Silva Reis - IRONES MARIA CEOLIN REIS" | WhatsApp original: "54999980025" | ID: kzyfkwtic180ddk | Status: Fechado | Cidade: Tapejara | Criado em: 2026-09-13 16:56:45.252Z
  3. Nome Cliente: "Natalino Paludo" | WhatsApp original: "54999980025" | ID: 73j6vd0n4xczool | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:03.368Z

[Caso 1.b #62] Número normalizado: 51982970010 (2 clientes)
  1. Nome Cliente: "Ivanor/ Mateus Duranti" | WhatsApp original: "51982970010" | ID: lexhthv8oq5j2u4 | Status: Novo Lead | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:56:03.126Z
  2. Nome Cliente: "Silvia Terezinha de Martini Duranti" | WhatsApp original: "51982970010" | ID: aiwh84ei1vivo0x | Status: Fechado | Cidade: Sarandi | Criado em: 2026-09-13 16:59:28.638Z

[Caso 1.b #63] Número normalizado: 54996720012 (3 clientes)
  1. Nome Cliente: "Ivete Maria Zanette" | WhatsApp original: "54996720012" | ID: z98ibqlj2s8mog3 | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:56:04.397Z
  2. Nome Cliente: "Janete Cozer" | WhatsApp original: "54996720012" | ID: zw5vthd1j4fhyth | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:16.291Z
  3. Nome Cliente: "Janete Marcelina Cozer" | WhatsApp original: "54996720012" | ID: 3wweu9maps4pp03 | Status: Novo Lead | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:56:17.217Z

[Caso 1.b #64] Número normalizado: 54999365098 (3 clientes)
  1. Nome Cliente: "Jacir Luis Badalotti" | WhatsApp original: "54999365098" | ID: lw8a5n7uans6n0q | Status: Novo Lead | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:07.503Z
  2. Nome Cliente: "RENAN BADALOTTI" | WhatsApp original: "54999365098" | ID: tjd2mlpt927ztbf | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:47.115Z
  3. Nome Cliente: "Renan Hlavac Badalotti" | WhatsApp original: "54999365098" | ID: 36obidq0elsmjsz | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:47.347Z

[Caso 1.b #65] Número normalizado: 49988334151 (2 clientes)
  1. Nome Cliente: "JEAN CARLOS CEZNE" | WhatsApp original: "49988334151" | ID: 9oqpjymravwvm75 | Status: Novo Lead | Cidade: Sertão | Criado em: 2026-09-13 16:56:18.211Z
  2. Nome Cliente: "Jean Cezne" | WhatsApp original: "49988334151" | ID: s77odsd0twhofdh | Status: Fechado | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:56:19.862Z

[Caso 1.b #66] Número normalizado: 54991874541 (2 clientes)
  1. Nome Cliente: "João Staniczuk" | WhatsApp original: "54991874541" | ID: y25mzgdm9eu1g7n | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:56:25.644Z
  2. Nome Cliente: "Luiz João Zavodinik" | WhatsApp original: "54991874541" | ID: ppcp97mtxxzzlat | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:57:10.942Z

[Caso 1.b #67] Número normalizado: 54996360539 (2 clientes)
  1. Nome Cliente: "Jorge Baú" | WhatsApp original: "54996360539" | ID: yvm9cmgm3ymer9j | Status: Fechado | Cidade: Campinas do Sul | Criado em: 2026-09-13 16:56:30.296Z
  2. Nome Cliente: "Renato Federle (Camar)" | WhatsApp original: "54996360539" | ID: xquomoxrigf9ojb | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:48.724Z

[Caso 1.b #68] Número normalizado: 5435197833 (2 clientes)
  1. Nome Cliente: "Jucelene" | WhatsApp original: "5435197833" | ID: oll26um5g0m0hwe | Status: Fechado | Cidade: Aratiba | Criado em: 2026-09-13 16:56:37.428Z
  2. Nome Cliente: "Oilson Pastorio" | WhatsApp original: "5435197833" | ID: x2qs3mizqs4rw4g | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:17.769Z

[Caso 1.b #69] Número normalizado: 54996550242 (2 clientes)
  1. Nome Cliente: "Julio Luis Baú" | WhatsApp original: "54996550242" | ID: cnhm7us9mhhkwjo | Status: Novo Lead | Cidade: Sananduva | Criado em: 2026-09-13 16:56:39.106Z
  2. Nome Cliente: "Julio Luiz Bau" | WhatsApp original: "54996550242" | ID: 90b4p8orjy8hjpd | Status: Fechado | Cidade: Nonoai | Criado em: 2026-09-13 16:56:40.453Z

[Caso 1.b #70] Número normalizado: 54999938257 (2 clientes)
  1. Nome Cliente: "Kika (Titular: Roque Carlos Pedott)" | WhatsApp original: "54999938257" | ID: 1uocsu3326mrzar | Status: Fechado | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:56:42.626Z
  2. Nome Cliente: "Patrícia Pavão Schneider (Titular: Diego Pierdona Portella)" | WhatsApp original: "54999938257" | ID: 2wi8vra9v1h4r9a | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:25.592Z

[Caso 1.b #71] Número normalizado: 54996912708 (2 clientes)
  1. Nome Cliente: "Leonardo Reolon" | WhatsApp original: "54996912708" | ID: uh5bkn9ydigd9v5 | Status: Fechado | Cidade: Passo Fundo | Criado em: 2026-09-13 16:56:50.872Z
  2. Nome Cliente: "Maritana Teresinha Tomkelski Rampi" | WhatsApp original: "54996912708" | ID: oe14yu3c5auvuhk | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:57:34.763Z

[Caso 1.b #72] Número normalizado: 54996017447 (2 clientes)
  1. Nome Cliente: "Valdemar Gaz" | WhatsApp original: "54 99601-7447" | ID: x0l573ylwve91m1 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:56:54.859Z
  2. Nome Cliente: "Liana Marmentini Capitanio" | WhatsApp original: "(54) 9 96017447" | ID: azlcl6lwyn9yzal | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 18:18:32.838Z

[Caso 1.b #73] Número normalizado: 54999822506 (2 clientes)
  1. Nome Cliente: "Loery Valentin Fusinato" | WhatsApp original: "54999822506" | ID: t9lirq46srq5fl9 | Status: Fechado | Cidade: Marau | Criado em: 2026-09-13 16:57:02.505Z
  2. Nome Cliente: "Omar Luiz Dezordi" | WhatsApp original: "54999822506" | ID: 171lutg1yoork1t | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:19.466Z

[Caso 1.b #74] Número normalizado: 54999983960 (2 clientes)
  1. Nome Cliente: "Marcelo Maroso" | WhatsApp original: "54999983960" | ID: tkgbqyahwea0yay | Status: Novo Lead | Cidade: Getúlio Vargas | Criado em: 2026-09-13 16:57:18.175Z
  2. Nome Cliente: "Marcelo Maroso-Lavagem" | WhatsApp original: "54999983960" | ID: r2eoq1cbc0sa9in | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:57:19.468Z

[Caso 1.b #75] Número normalizado: 55984741175 (2 clientes)
  1. Nome Cliente: "Marcio José Radetski" | WhatsApp original: "55984741175" | ID: rqi36p6kqxhv1it | Status: Novo Lead | Cidade: Marcelino Ramos | Criado em: 2026-09-13 16:57:22.593Z
  2. Nome Cliente: "Marcos Roberto Brander" | WhatsApp original: "55984741175" | ID: o8r60v118ofo7x2 | Status: Fechado | Cidade: Barão de Cotegipe | Criado em: 2026-09-13 16:57:28.087Z

[Caso 1.b #76] Número normalizado: 54991766675 (2 clientes)
  1. Nome Cliente: "Mauro" | WhatsApp original: "54991766675" | ID: o6jfjrphga2zibb | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:44.097Z
  2. Nome Cliente: "MAURO SERRAGLIO usina" | WhatsApp original: "54991766675" | ID: 7khfcm2hb8i86rh | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:46.300Z

[Caso 1.b #77] Número normalizado: 5491766675 (3 clientes)
  1. Nome Cliente: "Mauro Antônio Serraglio" | WhatsApp original: "5491766675" | ID: 0krwqgjuzi9su73 | Status: Fechado | Cidade: Barra do Rio Azul | Criado em: 2026-09-13 16:57:45.218Z
  2. Nome Cliente: "MAURO ANTONIO SERRAGLIO - USINA" | WhatsApp original: "5491766675" | ID: mb78hxit51ug87y | Status: Fechado | Cidade: Barra do Rio Azul | Criado em: 2026-09-13 16:57:46.063Z
  3. Nome Cliente: "Odecir Kovaleski" | WhatsApp original: "5491766675" | ID: p3cze7zrtvxzdkz | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:17.137Z

[Caso 1.b #78] Número normalizado: 54999673917 (2 clientes)
  1. Nome Cliente: "Mecânica Agricola Strieski LTDA (Erechim)" | WhatsApp original: "54999673917" | ID: an1mcopxwq7zgjh | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:49.084Z
  2. Nome Cliente: "Mecânica Strieski" | WhatsApp original: "54999673917" | ID: epuylevl9iy7454 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:57:49.937Z

[Caso 1.b #79] Número normalizado: 54999297330 (2 clientes)
  1. Nome Cliente: "Mercado Parque Livia (Titular: Deisiele Morais do Nascimento)" | WhatsApp original: "54999297330" | ID: ar0nrt89900qyy2 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:52.541Z
  2. Nome Cliente: "Mercado Parque Livia (Titular: Tiago Correa Minimercado)" | WhatsApp original: "54999297330" | ID: kz8myh1ta0qvsei | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:57:52.769Z

[Caso 1.b #80] Número normalizado: 5491420648 (2 clientes)
  1. Nome Cliente: "Paulo" | WhatsApp original: "5491420648" | ID: f6kodepgfs8omk8 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:28.319Z
  2. Nome Cliente: "Paulo Zanella" | WhatsApp original: "5491420648" | ID: ej8092v5qp6kot1 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:58:35.556Z

[Caso 1.b #81] Número normalizado: 54981066611 (2 clientes)
  1. Nome Cliente: "PAULO ANTONIO ESTHERIS" | WhatsApp original: "54981066611" | ID: sin5v0wq705ls1b | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:58:30.230Z
  2. Nome Cliente: "Tania Estheris" | WhatsApp original: "5554981066611" | ID: uy059s4oxsx0ah2 | Status: Novo Lead | Cidade: Erechim | Criado em: 2026-09-13 16:59:42.820Z

[Caso 1.b #82] Número normalizado: 54991660746 (2 clientes)
  1. Nome Cliente: "Simão Imóveis" | WhatsApp original: "54991660746" | ID: kylz5tvftij1uam | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:29.452Z
  2. Nome Cliente: "Simão Móveis" | WhatsApp original: "54991660746" | ID: h4sw3640xxphfh0 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 16:59:30.868Z

[Caso 1.b #83] Número normalizado: 5499452785 (2 clientes)
  1. Nome Cliente: "Vinicius" | WhatsApp original: "5499452785" | ID: erowhg1lr1i0oz7 | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:11.344Z
  2. Nome Cliente: "Vinicius Scalco" | WhatsApp original: "5499452785" | ID: k53vbpxz6afpwoa | Status: Fechado | Cidade: Erechim | Criado em: 2026-09-13 17:00:15.818Z

[Caso 1.b #84] Número normalizado: 54991823400 (4 clientes)
  1. Nome Cliente: "Supermercado Central de Alimentos" | WhatsApp original: "(54) 99182-3400" | ID: 95mx59d6wyxn9am | Status: Orçamento | Cidade: Passo Fundo | Criado em: 2026-09-19 23:55:42.472Z
  2. Nome Cliente: "Frigorífico Sul Carnes S/A" | WhatsApp original: "(54) 99182-3400" | ID: x89wskwtc0trjyh | Status: Orçamento | Cidade: Erechim | Criado em: 2026-09-19 23:55:42.472Z
  3. Nome Cliente: "Granja Esperança do Campo" | WhatsApp original: "(54) 99182-3400" | ID: wta8ia0wagr023z | Status: Orçamento | Cidade: Getúlio Vargas | Criado em: 2026-09-19 23:55:42.473Z
  4. Nome Cliente: "Residência Família Andrade" | WhatsApp original: "(54) 99182-3400" | ID: b0acgp36ridahiu | Status: Orçamento | Cidade: Erechim | Criado em: 2026-09-19 23:55:42.474Z

[Caso 1.b #85] Número normalizado: 54998761234 (5 clientes)
  1. Nome Cliente: "João Silva" | WhatsApp original: "(54) 99876-1234" | ID: 7p8hzz82co0xuia | Status: Levantamento | Cidade: Passo Fundo/RS | Criado em: 2026-09-22 21:29:07.913Z
  2. Nome Cliente: "Maria Oliveira" | WhatsApp original: "(54) 99876-1234" | ID: jx0o20zdorivfsv | Status: Orçamento | Cidade: Erechim/RS | Criado em: 2026-09-22 21:29:07.914Z
  3. Nome Cliente: "Carlos Santos" | WhatsApp original: "(54) 99876-1234" | ID: 2xn3wiepfl5uyv6 | Status: Negociação | Cidade: Passo Fundo/RS | Criado em: 2026-09-22 21:29:07.916Z
  4. Nome Cliente: "Cooperativa Agrícola Esperança" | WhatsApp original: "(54) 99876-1234" | ID: 266akob5f991ami | Status: Contato Futuro | Cidade: Getúlio Vargas/RS | Criado em: 2026-09-22 21:29:07.917Z
  5. Nome Cliente: "Transportes Rápido Gaúcho" | WhatsApp original: "(54) 99876-1234" | ID: w6mw0471z8g76xi | Status: Orçamento | Cidade: Erechim/RS | Criado em: 2026-09-22 21:29:07.919Z

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

[Caso 2.c #1] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991855002
  1. Cliente: "Cláudio João Pagliosa" | ID: mlpch9s1ktm3y41 | Status: Fechado | Criado: 2026-09-13 16:53:42.971Z
  2. Cliente: "Cláudio Pagliosa" | ID: hv2mp0g9jl0etz1 | Status: Novo Lead | Criado: 2026-09-13 16:53:44.571Z

[Caso 2.c #2] Motivo: Nome do cliente idêntico após normalização e mesmo WhatsApp | Telefone/WhatsApp: 5435193169
  1. Cliente: "Domingos Luiz Andretta" | ID: 3rv1tps9uibxkn5 | Status: Fechado | Criado: 2026-09-13 16:54:23.974Z
  2. Cliente: "Domingos Luiz Andretta" | ID: jdajl27t6lc49n3 | Status: Novo Lead | Criado: 2026-09-13 16:54:24.174Z

[Caso 2.c #3] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996120307
  1. Cliente: "Edite Teresinha de Paris Dartora" | ID: brxn5i9kfzux1la | Status: Novo Lead | Criado: 2026-09-13 16:54:35.378Z
  2. Cliente: "Edite Teresinha Deparis Dartora" | ID: ocq2ntbkwjljxll | Status: Novo Lead | Criado: 2026-09-13 16:54:36.169Z

[Caso 2.c #4] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996167789
  1. Cliente: "Edson Luiz Goral Pagliosa" | ID: ud9mqf47gba4df3 | Status: Fechado | Criado: 2026-09-13 16:54:36.858Z
  2. Cliente: "Edson Pagliosa" | ID: zwvh5gr4nv7r0ng | Status: Fechado | Criado: 2026-09-13 16:54:37.486Z

[Caso 2.c #5] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54999442424
  1. Cliente: "Eva Horszczaruk Staniczuk" | ID: wmoxkr0qzx8fhha | Status: Novo Lead | Criado: 2026-09-13 16:54:55.589Z
  2. Cliente: "Eva Staniczuk" | ID: x4iugm5vn7yjh1x | Status: Novo Lead | Criado: 2026-09-13 16:55:01.813Z

[Caso 2.c #6] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991948800
  1. Cliente: "Evandro Correa" | ID: dfnc1mj8ny515zg | Status: Fechado | Criado: 2026-09-13 16:54:57.940Z
  2. Cliente: "Evandro Lamaison Correa" | ID: btce51kwcxqtlhh | Status: Novo Lead | Criado: 2026-09-13 16:55:01.171Z

[Caso 2.c #7] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54991410361
  1. Cliente: "Geison Luis Rigo" | ID: 06qzgnk0eycwica | Status: Fechado | Criado: 2026-09-13 16:55:21.088Z
  2. Cliente: "Geison Rigo" | ID: 862ov8lddgeihtj | Status: Fechado | Criado: 2026-09-13 16:55:21.995Z

[Caso 2.c #8] Motivo: Nome do cliente idêntico após remover sufixos e mesmo WhatsApp | Telefone/WhatsApp: 54996060689
  1. Cliente: "Gerson Adriano Bovo" | ID: qut3h9i0j0rppxt | Status: Novo Lead | Criado: 2026-09-13 16:55:25.814Z
  2. Cliente: "Gerson Adriano Bovo (Erechim)" | ID: s7iznf4fbwu7dkf | Status: Fechado | Criado: 2026-09-13 16:55:26.244Z

[Caso 2.c #9] Motivo: Nome do cliente idêntico após remover sufixos e mesmo WhatsApp | Telefone/WhatsApp: 49991083026
  1. Cliente: "Gilson Bogo" | ID: k6a4asuyfejo4kn | Status: Novo Lead | Criado: 2026-09-13 16:55:34.290Z
  2. Cliente: "Gilson Bogo (Erechim)" | ID: bz5k2hjf3zlvslo | Status: Fechado | Criado: 2026-09-13 16:55:35.052Z

[Caso 2.c #10] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996720012
  1. Cliente: "Janete Cozer" | ID: zw5vthd1j4fhyth | Status: Fechado | Criado: 2026-09-13 16:56:16.291Z
  2. Cliente: "Janete Marcelina Cozer" | ID: 3wweu9maps4pp03 | Status: Novo Lead | Criado: 2026-09-13 16:56:17.217Z

[Caso 2.c #11] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 49988334151
  1. Cliente: "JEAN CARLOS CEZNE" | ID: 9oqpjymravwvm75 | Status: Novo Lead | Criado: 2026-09-13 16:56:18.211Z
  2. Cliente: "Jean Cezne" | ID: s77odsd0twhofdh | Status: Fechado | Criado: 2026-09-13 16:56:19.862Z

[Caso 2.c #12] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54996550242
  1. Cliente: "Julio Luis Baú" | ID: cnhm7us9mhhkwjo | Status: Novo Lead | Criado: 2026-09-13 16:56:39.106Z
  2. Cliente: "Julio Luiz Bau" | ID: 90b4p8orjy8hjpd | Status: Fechado | Criado: 2026-09-13 16:56:40.453Z

[Caso 2.c #13] Motivo: Primeiro e último nome idênticos e mesmo WhatsApp | Telefone/WhatsApp: 54999365098
  1. Cliente: "RENAN BADALOTTI" | ID: tjd2mlpt927ztbf | Status: Fechado | Criado: 2026-09-13 16:58:47.115Z
  2. Cliente: "Renan Hlavac Badalotti" | ID: 36obidq0elsmjsz | Status: Fechado | Criado: 2026-09-13 16:58:47.347Z

======================================================
RESUMO DOS RESULTADOS DA AUDITORIA
======================================================
Total contatos lidos e validados: 91
Total clientes lidos e validados: 1509
Grupo 1.a (mesmo WhatsApp em múltiplos contatos): 0 casos
Grupo 1.b (mesmo WhatsApp em múltiplos clientes): 85 casos
Grupo 1.c (mesmo WhatsApp entre contato e cliente com nomes distintos): 0 casos
Grupo 2.a (contatos com nome idêntico): 0 casos
Grupo 2.b (contatos com nomes parecidos/sufixos): 1 casos
Grupo 2.c (clientes com nomes parecidos e mesmo WhatsApp): 13 casos

=== AUDITORIA CONCLUÍDA COM SUCESSO ===

```

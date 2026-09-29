import PocketBase from 'pocketbase'
import fs from 'fs'
import path from 'path'

// Função auxiliar para carregar variáveis do .env caso não estejam no process.env
function loadEnvFile() {
  const envPath = path.resolve('.env')
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8')
      const lines = content.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    } catch {
      // Ignora erro ao ler .env
    }
  }
}

loadEnvFile()

// Credenciais e URL obtidas via ambiente (com suporte a nomes comuns)
const pbUrl =
  process.env.VITE_POCKETBASE_URL ||
  process.env.PB_URL ||
  process.env.POCKETBASE_URL ||
  'https://crm-delfos-solar-72b9e.shrd00.internal.goskip.dev'

const authEmail =
  process.env.PB_USER_EMAIL ||
  process.env.PB_ADMIN_EMAIL ||
  process.env.POCKETBASE_USER ||
  process.env.POCKETBASE_EMAIL ||
  process.env.PB_AUTH_EMAIL

const authPassword =
  process.env.PB_USER_PASSWORD ||
  process.env.PB_ADMIN_PASSWORD ||
  process.env.POCKETBASE_PASS ||
  process.env.POCKETBASE_PASSWORD ||
  process.env.PB_AUTH_PASSWORD

// Normalização de telefone/whatsapp
export function normalizePhone(raw) {
  if (!raw) return ''
  let digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  // Ignora sequências de zeros como 00000000000
  if (/^0+$/.test(digits)) return ''

  // Trata prefixo '0' no início (ex: DDD com 0: 054 -> 54)
  while (digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  // Trata prefixo internacional Brasil '55' no início se tiver tamanho suficiente (ex: 55 + DDD(2) + num(8 ou 9))
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2)
  }

  return digits
}

// Normalização de nome para comparação exata/idêntica
export function normalizeName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9\s]/g, ' ') // remove pontuação
    .replace(/\s+/g, ' ')
    .trim()
}

// Limpeza de sufixos/tags comuns em nomes no CRM
export function cleanNameSuffixes(name) {
  if (!name) return ''
  return name
    .replace(/\(usina\)/gi, '')
    .replace(/\(secund[aá]rio google\)/gi, '')
    .replace(/\(google\)/gi, '')
    .replace(/\(pipedrive\)/gi, '')
    .replace(/\(conta azul\)/gi, '')
    .replace(/\(erechim\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Busca com paginação garantida e validação estrita de contagem do PocketBase.
 * Compara o total de registros retornados com serverTotalItems.
 * Se houver divergência, ou se o número for suspeitamente baixo em uma coleção existente, aborta com erro explícito.
 */
async function fetchAllWithSanityCheck(pb, collectionName, minExpected = 1) {
  // 1. Pergunta ao servidor o total oficial através de perPage=1
  const meta = await pb.collection(collectionName).getList(1, 1, {
    requestKey: null,
  })
  const serverTotalItems = meta.totalItems

  if (serverTotalItems < minExpected) {
    throw new Error(
      `[SANITY CHECK FALHOU] A coleção '${collectionName}' retornou ${serverTotalItems} itens no servidor, abaixo do mínimo esperado (${minExpected}). Possível perda de dados ou ambiente incorreto!`,
    )
  }

  // 2. Paginação iterativa com perPage=200 para carregar todos os registros com segurança
  const pageSize = 200
  let page = 1
  const records = []

  while (true) {
    const res = await pb.collection(collectionName).getList(page, pageSize, {
      requestKey: null,
      sort: 'created',
    })
    records.push(...res.items)
    if (page >= res.totalPages || res.items.length === 0) {
      break
    }
    page++
  }

  // 3. Validação de integridade entre quantidade carregada e total do servidor
  if (records.length !== serverTotalItems) {
    throw new Error(
      `[SANITY CHECK FALHOU] Divergência na contagem de '${collectionName}': carregados localmente ${records.length} registros, mas o servidor relata totalItems = ${serverTotalItems}. Abortando para evitar dados incompletos!`,
    )
  }

  return { records, totalItems: serverTotalItems }
}

export async function runAuditoria(customEnv = {}) {
  const output = []
  const log = (...args) => {
    console.log(...args)
    output.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
  }

  log('=== INICIANDO AUDITORIA DE DUPLICIDADES NO CRM DELFOS SOLAR ===\n')

  const email = customEnv.email || authEmail
  const password = customEnv.password || authPassword
  const url = customEnv.url || pbUrl

  if (!email || !password) {
    const msg =
      '[ERRO DE SEGURANÇA] Credenciais do PocketBase não definidas! ' +
      'Por favor, defina PB_USER_EMAIL e PB_USER_PASSWORD no arquivo .env ou no ambiente antes de executar a auditoria.'
    log(msg)
    throw new Error(msg)
  }

  const pb = new PocketBase(url)
  pb.autoCancellation(false)

  // Autenticação com credencial segura
  try {
    await pb.collection('users').authWithPassword(email, password)
    log(`Autenticação com PocketBase: SUCESSO (usuário autenticado: ${email})`)
  } catch (err) {
    const msg = `FALHA na autenticação PocketBase com usuário '${email}': ${err.message}`
    log(msg)
    throw new Error(msg)
  }

  // 1. Leitura Completa com Paginação e Verificação de Sanidade
  log('\n--- 1. LEITURA COMPLETA DAS COLEÇÕES (SANITY CHECK) ---')

  // No Delfos Solar, contatos possui centenas de registros (migrados do funil/outros contatos)
  // e clientes também possui centenas de registros.
  const contatosResult = await fetchAllWithSanityCheck(pb, 'contatos', 10)
  const clientesResult = await fetchAllWithSanityCheck(pb, 'clientes', 10)

  const contatos = contatosResult.records
  const clientes = clientesResult.records

  log(
    `Total confirmado na coleção 'contatos': ${contatos.length} (validado com o servidor: ${contatosResult.totalItems})`,
  )
  log(
    `Total confirmado na coleção 'clientes': ${clientes.length} (validado com o servidor: ${clientesResult.totalItems})`,
  )

  // Resumo de contatos por papel
  const papelCount = {}
  contatos.forEach((c) => {
    const papel = c.papel || 'não definido'
    papelCount[papel] = (papelCount[papel] || 0) + 1
  })

  // Resumo de clientes por status
  const statusClientesCount = {}
  clientes.forEach((c) => {
    const st = c.status || 'sem status'
    statusClientesCount[st] = (statusClientesCount[st] || 0) + 1
  })

  log('\n--- RESUMO NUMÉRICO INICIAL ---')
  log(`Total geral de contatos: ${contatos.length}`)
  log('Distribuição de contatos por papel:', papelCount)
  log(`Total geral de clientes: ${clientes.length}`)
  log('Distribuição de clientes por status:', statusClientesCount)

  // Mapa de clientes por ID para resolução rápida de nomes de clientes vinculados
  const clienteMap = new Map()
  clientes.forEach((c) => clienteMap.set(c.id, c))

  // 2. Análise dos números de WhatsApp / Telefone
  const contatosComNumero = contatos.map((c) => {
    const rawNum = (c.whatsapp || '').trim() || (c.telefone || '').trim()
    const norm = normalizePhone(rawNum)
    return {
      ...c,
      rawNum,
      normPhone: norm,
      normName: normalizeName(c.nome),
      cleanNameNorm: normalizeName(cleanNameSuffixes(c.nome)),
    }
  })

  const clientesComNumero = clientes.map((c) => {
    const rawNum = (c.whatsapp || '').trim() || (c.telefone || '').trim()
    const norm = normalizePhone(rawNum)
    return {
      ...c,
      rawNum,
      normPhone: norm,
      normName: normalizeName(c.nome),
      cleanNameNorm: normalizeName(cleanNameSuffixes(c.nome)),
    }
  })

  const contatosComNumeroValido = contatosComNumero.filter((c) => c.normPhone.length >= 8)
  const clientesComNumeroValido = clientesComNumero.filter((c) => c.normPhone.length >= 8)

  log(
    `Registros em 'contatos' com telefone/WhatsApp válido: ${contatosComNumeroValido.length} de ${contatos.length}`,
  )
  log(
    `Registros em 'clientes' com telefone/WhatsApp válido: ${clientesComNumeroValido.length} de ${clientes.length}`,
  )

  // Helper para resolver nomes de clientes vinculados a um contato
  const resolverClientesVinculados = (contato) => {
    const ids = Array.isArray(contato.clientes_vinculados) ? contato.clientes_vinculados : []
    if (ids.length === 0) return 'Nenhum cliente vinculado'
    return ids
      .map((id) => {
        const cli = clienteMap.get(id)
        return cli ? `${cli.nome} (ID: ${id})` : `ID Desconhecido: ${id}`
      })
      .join('; ')
  }

  // ==========================================
  // GRUPO 1 — MESMO WHATSAPP EM REGISTROS DIFERENTES
  // ==========================================
  log('\n======================================================')
  log('GRUPO 1 — MESMO WHATSAPP EM REGISTROS DIFERENTES')
  log('======================================================')

  // a) Mesmo WhatsApp em 2+ registros de "contatos"
  log('\n--- 1.a) Mesmo WhatsApp em 2+ registros de "contatos" ---')
  const contatosPorNumero = new Map()
  contatosComNumeroValido.forEach((c) => {
    if (!contatosPorNumero.has(c.normPhone)) contatosPorNumero.set(c.normPhone, [])
    contatosPorNumero.get(c.normPhone).push(c)
  })

  let count1a = 0
  for (const [phone, list] of contatosPorNumero.entries()) {
    if (list.length >= 2) {
      count1a++
      log(`\n[Caso 1.a #${count1a}] Número normalizado: ${phone} (${list.length} contatos)`)
      list.forEach((item, idx) => {
        log(
          `  ${idx + 1}. Nome: "${item.nome}" | WhatsApp original: "${item.whatsapp || item.telefone}" | ID: ${item.id} | Papel: ${item.papel} | Origem: ${item.origem_registro || 'N/D'} | Criado em: ${item.created} | Clientes vinculados: ${resolverClientesVinculados(item)}`,
        )
      })
    }
  }
  if (count1a === 0) {
    log(
      'Nenhum caso encontrado de mesmo WhatsApp compartilhado entre múltiplos registros de "contatos".',
    )
  }

  // b) Mesmo WhatsApp em 2+ "clientes" DIFERENTES
  log('\n--- 1.b) Mesmo WhatsApp em 2+ "clientes" DIFERENTES ---')
  const clientesPorNumero = new Map()
  clientesComNumeroValido.forEach((c) => {
    if (!clientesPorNumero.has(c.normPhone)) clientesPorNumero.set(c.normPhone, [])
    clientesPorNumero.get(c.normPhone).push(c)
  })

  let count1b = 0
  for (const [phone, list] of clientesPorNumero.entries()) {
    if (list.length >= 2) {
      count1b++
      log(`\n[Caso 1.b #${count1b}] Número normalizado: ${phone} (${list.length} clientes)`)
      list.forEach((item, idx) => {
        log(
          `  ${idx + 1}. Nome Cliente: "${item.nome}" | WhatsApp original: "${item.whatsapp || item.telefone}" | ID: ${item.id} | Status: ${item.status} | Cidade: ${item.cidade || 'N/D'} | Criado em: ${item.created}`,
        )
      })
    }
  }
  if (count1b === 0) {
    log(
      'Nenhum caso encontrado de mesmo WhatsApp compartilhado entre múltiplos registros de "clientes".',
    )
  }

  // c) Mesmo WhatsApp entre um registro de "contatos" e um de "clientes" com nomes diferentes
  log(
    '\n--- 1.c) Mesmo WhatsApp entre registro de "contatos" e de "clientes" (nomes diferentes) ---',
  )
  let count1c = 0
  for (const [phone, cList] of contatosPorNumero.entries()) {
    if (clientesPorNumero.has(phone)) {
      const cliList = clientesPorNumero.get(phone)
      for (const contato of cList) {
        for (const cliente of cliList) {
          // Checa se os nomes são diferentes
          if (
            contato.cleanNameNorm !== cliente.cleanNameNorm &&
            contato.normName !== cliente.normName
          ) {
            count1c++
            log(`\n[Caso 1.c #${count1c}] Número normalizado: ${phone}`)
            log(
              `  -> Contato: "${contato.nome}" (ID: ${contato.id}, Papel: ${contato.papel}, Criado: ${contato.created}, Clientes vinculados: ${resolverClientesVinculados(contato)})`,
            )
            log(
              `  -> Cliente: "${cliente.nome}" (ID: ${cliente.id}, Status: ${cliente.status}, Criado: ${cliente.created})`,
            )
          }
        }
      }
    }
  }
  if (count1c === 0) {
    log(
      'Nenhum caso encontrado de mesmo WhatsApp entre "contatos" e "clientes" com nomes diferentes.',
    )
  }

  // ==========================================
  // GRUPO 2 — POSSÍVEIS REGISTROS DUPLICADOS
  // ==========================================
  log('\n======================================================')
  log('GRUPO 2 — POSSÍVEIS REGISTROS DUPLICADOS (MESMO CADASTRO CRIADO DUAS VEZES)')
  log('======================================================')

  // a) Contatos com nome idêntico após normalização
  log('\n--- 2.a) Contatos com nome idêntico após normalização ---')
  const contatosPorNomeNorm = new Map()
  contatos.forEach((c) => {
    const norm = normalizeName(c.nome)
    if (!norm) return
    if (!contatosPorNomeNorm.has(norm)) contatosPorNomeNorm.set(norm, [])
    contatosPorNomeNorm.get(norm).push(c)
  })

  let count2a = 0
  for (const [normName, list] of contatosPorNomeNorm.entries()) {
    if (list.length >= 2) {
      count2a++
      log(`\n[Caso 2.a #${count2a}] Nome normalizado: "${normName}" (${list.length} registros)`)
      list.forEach((item, idx) => {
        log(
          `  ${idx + 1}. Nome: "${item.nome}" | ID: ${item.id} | WhatsApp/Tel: "${item.whatsapp || item.telefone || 'Vazio'}" | Papel: ${item.papel} | Criado em: ${item.created} | Clientes vinculados: ${resolverClientesVinculados(item)}`,
        )
      })
    }
  }
  if (count2a === 0) {
    log('Nenhum contato com nome idêntico encontrado.')
  }

  // b) Contatos com nome muito parecido (mesmo sobrenome + inicial, ou diferença de acento/sufixo/tag) e/ou mesmo telefone/whatsapp
  log(
    '\n--- 2.b) Contatos com nome muito parecido (sufixos, acentos, sobrenome+inicial ou mesmo telefone) ---',
  )
  let count2b = 0
  for (let i = 0; i < contatosComNumero.length; i++) {
    for (let j = i + 1; j < contatosComNumero.length; j++) {
      const c1 = contatosComNumero[i]
      const c2 = contatosComNumero[j]

      // Se já foi reportado no 2.a (nomes idênticos), pula
      if (c1.normName === c2.normName) continue

      let isSimilar = false
      let motivo = ''

      // Critério 1: Mesmo nome limpando sufixos "(usina)", "(secundário google)", etc.
      if (c1.cleanNameNorm && c1.cleanNameNorm === c2.cleanNameNorm) {
        isSimilar = true
        motivo = 'Nome idêntico após remoção de sufixos/tags'
      }

      // Critério 2: Mesmo telefone/whatsapp válido com nomes ligeiramente diferentes
      if (!isSimilar && c1.normPhone && c2.normPhone && c1.normPhone === c2.normPhone) {
        isSimilar = true
        motivo = `Mesmo telefone/WhatsApp (${c1.normPhone}) com grafias diferentes`
      }

      // Critério 3: Mesmo primeiro nome e mesmo último sobrenome (com 2+ palavras)
      if (!isSimilar) {
        const parts1 = c1.normName.split(' ').filter(Boolean)
        const parts2 = c2.normName.split(' ').filter(Boolean)
        if (parts1.length >= 2 && parts2.length >= 2) {
          const first1 = parts1[0]
          const first2 = parts2[0]
          const last1 = parts1[parts1.length - 1]
          const last2 = parts2[parts2.length - 1]
          if (
            first1 === first2 &&
            last1 === last2 &&
            (parts1.length !== parts2.length || parts1.join(' ') !== parts2.join(' '))
          ) {
            // Se tiverem mesmo telefone ou um deles tiver telefone vazio
            if (
              (c1.normPhone && c2.normPhone && c1.normPhone === c2.normPhone) ||
              !c1.normPhone ||
              !c2.normPhone
            ) {
              isSimilar = true
              motivo = `Mesmo primeiro nome ("${first1}") e último sobrenome ("${last1}")`
            }
          }
        }
      }

      if (isSimilar) {
        count2b++
        log(`\n[Caso 2.b #${count2b}] Motivo: ${motivo}`)
        log(
          `  1. Nome: "${c1.nome}" | ID: ${c1.id} | WhatsApp/Tel: "${c1.whatsapp || c1.telefone || 'Vazio'}" | Criado em: ${c1.created} | Clientes vinculados: ${resolverClientesVinculados(c1)}`,
        )
        log(
          `  2. Nome: "${c2.nome}" | ID: ${c2.id} | WhatsApp/Tel: "${c2.whatsapp || c2.telefone || 'Vazio'}" | Criado em: ${c2.created} | Clientes vinculados: ${resolverClientesVinculados(c2)}`,
        )
      }
    }
  }
  if (count2b === 0) {
    log('Nenhum contato com nome muito parecido encontrado fora dos já listados.')
  }

  // c) Clientes com nome muito parecido entre si E mesmo whatsapp/telefone
  log('\n--- 2.c) Clientes com nome muito parecido entre si E mesmo WhatsApp/telefone ---')
  let count2c = 0
  for (let i = 0; i < clientesComNumero.length; i++) {
    for (let j = i + 1; j < clientesComNumero.length; j++) {
      const cli1 = clientesComNumero[i]
      const cli2 = clientesComNumero[j]

      // Devem ter mesmo whatsapp/telefone válido
      if (!cli1.normPhone || !cli2.normPhone || cli1.normPhone !== cli2.normPhone) {
        continue
      }

      // Devem ter nomes muito parecidos ou idênticos
      let isSimilar = false
      let motivo = ''

      if (cli1.normName === cli2.normName) {
        isSimilar = true
        motivo = 'Nome do cliente idêntico após normalização e mesmo WhatsApp'
      } else if (cli1.cleanNameNorm === cli2.cleanNameNorm) {
        isSimilar = true
        motivo = 'Nome do cliente idêntico após remover sufixos e mesmo WhatsApp'
      } else {
        const p1 = cli1.normName.split(' ').filter(Boolean)
        const p2 = cli2.normName.split(' ').filter(Boolean)
        if (
          p1.length >= 2 &&
          p2.length >= 2 &&
          p1[0] === p2[0] &&
          p1[p1.length - 1] === p2[p2.length - 1]
        ) {
          isSimilar = true
          motivo = 'Primeiro e último nome idênticos e mesmo WhatsApp'
        }
      }

      if (isSimilar) {
        count2c++
        log(`\n[Caso 2.c #${count2c}] Motivo: ${motivo} | Telefone/WhatsApp: ${cli1.normPhone}`)
        log(
          `  1. Cliente: "${cli1.nome}" | ID: ${cli1.id} | Status: ${cli1.status} | Criado: ${cli1.created}`,
        )
        log(
          `  2. Cliente: "${cli2.nome}" | ID: ${cli2.id} | Status: ${cli2.status} | Criado: ${cli2.created}`,
        )
      }
    }
  }
  if (count2c === 0) {
    log('Nenhum par de clientes com nome muito parecido E mesmo WhatsApp encontrado.')
  }

  log('\n======================================================')
  log('RESUMO DOS RESULTADOS DA AUDITORIA')
  log('======================================================')
  log(`Total contatos lidos e validados: ${contatos.length}`)
  log(`Total clientes lidos e validados: ${clientes.length}`)
  log(`Grupo 1.a (mesmo WhatsApp em múltiplos contatos): ${count1a} casos`)
  log(`Grupo 1.b (mesmo WhatsApp em múltiplos clientes): ${count1b} casos`)
  log(`Grupo 1.c (mesmo WhatsApp entre contato e cliente com nomes distintos): ${count1c} casos`)
  log(`Grupo 2.a (contatos com nome idêntico): ${count2a} casos`)
  log(`Grupo 2.b (contatos com nomes parecidos/sufixos): ${count2b} casos`)
  log(`Grupo 2.c (clientes com nomes parecidos e mesmo WhatsApp): ${count2c} casos`)
  log('\n=== AUDITORIA CONCLUÍDA COM SUCESSO ===\n')

  return {
    output: output.join('\n'),
    stats: {
      totalContatos: contatos.length,
      totalClientes: clientes.length,
      contatosComNumeroValido: contatosComNumeroValido.length,
      clientesComNumeroValido: clientesComNumeroValido.length,
      papelCount,
      statusClientesCount,
      count1a,
      count1b,
      count1c,
      count2a,
      count2b,
      count2c,
    },
  }
}

// Execução direta via `node scripts/auditoria-duplicados.mjs`
if (process.argv[1] && process.argv[1].endsWith('auditoria-duplicados.mjs')) {
  runAuditoria().catch((err) => {
    console.error('ERRO FATAL NA AUDITORIA:', err.message)
    process.exit(1)
  })
}

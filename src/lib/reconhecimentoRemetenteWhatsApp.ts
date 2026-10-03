/**
 * Módulo de normalização e casamento flexível de telefones WhatsApp para o CRM Delfos Solar.
 *
 * Regras:
 * 1. Normalização: recebe o número cru (com máscaras, parênteses, espaços, hífens, prefixo +55 ou outros DDIs)
 *    e extrai os dígitos essenciais (DDD + número local de 8 ou 9 dígitos no Brasil).
 * 2. Casamento com tolerância ao 9º dígito: dois números são o mesmo contato quando, após normalização,
 *    diferem apenas pela variação do nono dígito do celular (mesmo DDD + mesmos 8 dígitos finais).
 *    Exemplo: (54) 3231-0000 vs (54) 93231-0000 -> compatíveis nos dois sentidos.
 * 3. Prioridade exata: se algum contato bate 100% igual (mesmos dígitos normalizados), ele tem precedência
 *    sobre correspondências tolerantes de 9º dígito.
 * 4. Ambiguidade: quando há múltiplos contatos compatíveis sem um exato único, sinalizar ambiguidade
 *    para o atendente escolher em qual conversa registrar/vincular.
 */

// Lista de DDDs válidos no Brasil (ANATEL)
export const DDD_VALIDOS_BRASIL = new Set([
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '21',
  '22',
  '24',
  '27',
  '28',
  '31',
  '32',
  '33',
  '34',
  '35',
  '37',
  '38',
  '41',
  '42',
  '43',
  '44',
  '45',
  '46',
  '47',
  '48',
  '49',
  '51',
  '53',
  '54',
  '55',
  '61',
  '62',
  '63',
  '64',
  '65',
  '66',
  '67',
  '68',
  '69',
  '71',
  '73',
  '74',
  '75',
  '77',
  '79',
  '81',
  '82',
  '83',
  '84',
  '85',
  '86',
  '87',
  '88',
  '89',
  '91',
  '92',
  '93',
  '94',
  '95',
  '96',
  '97',
  '98',
  '99',
])

export interface TelefoneNormalizado {
  /** Dígitos essenciais sem DDI, sem caracteres não-numéricos (geralmente 10 ou 11 dígitos no Brasil, ou dígitos internacionais se outro país) */
  digitosEssenciais: string
  /** DDD se detectado no padrão brasileiro (2 dígitos), ex: '54' */
  ddd?: string
  /** 8 dígitos finais (chave de comparação tolerante com nono dígito) */
  ultimos8: string
  /** Se possui 9 dígitos no número local (celular moderno) */
  temNonoDigito: boolean
  /** Código de país se detectado (ex: '55') */
  ddi?: string
  /** Representação canônica padrão E.164 brasileira (55 + digitosEssenciais) ou internacional */
  e164: string
}

/**
 * Normaliza um número de telefone cru (WhatsApp webhook, cadastro, inputs com máscaras)
 * extraindo os dígitos essenciais e removendo máscaras, parênteses, hífens, espaços e código de país (+55/55).
 *
 * Exemplos:
 * "+55 (54) 93231-0000" -> "54932310000"
 * "(54) 3231-0000" -> "5432310000"
 * "555432310000" -> "5432310000"
 * "54932310000@c.us" -> "54932310000"
 */
export function normalizarNumeroWhatsApp(raw: string | undefined | null): string {
  if (!raw || typeof raw !== 'string') return ''

  // Remover sufixos de JID do WhatsApp como @c.us, @s.whatsapp.net, :1@s.whatsapp.net
  let limpo = raw.split('@')[0].split(':')[0].trim()

  // Extrair apenas dígitos
  let digits = limpo.replace(/\D/g, '')
  if (!digits) return ''

  // Remover zeros à esquerda de discagem (ex: 054991234567 -> 54991234567, 0055... -> 55...)
  while (digits.startsWith('00')) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    const semZero = digits.slice(1)
    const possivelDdd = semZero.slice(0, 2)
    if (DDD_VALIDOS_BRASIL.has(possivelDdd)) {
      digits = semZero
    }
  }

  // Remove prefixos discagem de operadora brasileira (ex: 021, 014, 015, 041, 031) se o tamanho ficar 10 ou 11
  const prefixesCSP = ['014', '015', '021', '031', '041', '043', '012', '023']
  for (let p = 0; p < prefixesCSP.length; p++) {
    const pref = prefixesCSP[p]
    if (digits.startsWith(pref) && digits.length >= pref.length + 10) {
      const resto = digits.slice(pref.length)
      const possivelDdd = resto.slice(0, 2)
      if (DDD_VALIDOS_BRASIL.has(possivelDdd) && (resto.length === 10 || resto.length === 11)) {
        digits = resto
        break
      }
    }
  }

  // Se tiver DDI do Brasil 55 no início (12 ou 13 dígitos totais, ou 14 com prefixo)
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    const sem55 = digits.slice(2)
    const ddd = sem55.slice(0, 2)
    if (DDD_VALIDOS_BRASIL.has(ddd)) {
      digits = sem55
    }
  }

  // Tratar DDD duplicado (ex: 5454999999999 -> 13 dígitos onde DDD 54 repete)
  if (digits.length === 12 || digits.length === 13) {
    const ddd1 = digits.slice(0, 2)
    const ddd2 = digits.slice(2, 4)
    if (ddd1 === ddd2 && DDD_VALIDOS_BRASIL.has(ddd1)) {
      const candidato = digits.slice(2)
      if (candidato.length === 10 || candidato.length === 11) {
        digits = candidato
      }
    }
  }

  // Tratar número local sem DDD (8 ou 9 dígitos): assume DDD 54 (região padrão Delfos Solar / RS)
  if (digits.length === 8 || digits.length === 9) {
    digits = `54${digits}`
  }

  return digits
}

/**
 * Decompõe um número normalizado em seus componentes (DDD, últimos 8 dígitos, se tem 9º dígito).
 */
export function decomporTelefone(raw: string | undefined | null): TelefoneNormalizado | null {
  const essenciais = normalizarNumeroWhatsApp(raw)
  if (!essenciais || essenciais.length < 8) return null

  // Se for número padrão Brasil (10 ou 11 dígitos com DDD válido)
  if (essenciais.length === 10 || essenciais.length === 11) {
    const ddd = essenciais.slice(0, 2)
    const numLocal = essenciais.slice(2)
    const ultimos8 = numLocal.slice(-8)
    const temNonoDigito = numLocal.length === 9

    return {
      digitosEssenciais: essenciais,
      ddd,
      ultimos8,
      temNonoDigito,
      ddi: '55',
      e164: `55${essenciais}`,
    }
  }

  // Fallback para outros tamanhos/internacional
  const ultimos8 = essenciais.slice(-8)
  return {
    digitosEssenciais: essenciais,
    ultimos8,
    temNonoDigito: false,
    e164: essenciais.startsWith('55') ? essenciais : `55${essenciais}`,
  }
}

export type TipoCasamentoTelefone = 'exato' | 'tolerante_nono_digito' | 'nenhum'

/**
 * Compara dois telefones considerando:
 * 1. 'exato': se os dígitos essenciais normalizados forem 100% idênticos.
 * 2. 'tolerante_nono_digito': se tiverem o mesmo DDD e os mesmos 8 dígitos finais (um com 9 dígitos locais e o outro com 8).
 * 3. 'nenhum': se não forem compatíveis.
 *
 * Funciona nos dois sentidos (8 vs 9 e 9 vs 8).
 */
export function compararTelefonesFlexivel(
  telA: string | undefined | null,
  telB: string | undefined | null,
): TipoCasamentoTelefone {
  const normA = decomporTelefone(telA)
  const normB = decomporTelefone(telB)

  if (!normA || !normB) return 'nenhum'

  // Casamento exato por completo
  if (normA.digitosEssenciais === normB.digitosEssenciais) {
    return 'exato'
  }

  // Casamento com tolerância ao 9º dígito
  // Devem possuir os mesmos 8 dígitos finais
  if (normA.ultimos8 !== normB.ultimos8) {
    return 'nenhum'
  }

  // Se ambos têm DDD identificado, o DDD deve ser o mesmo
  if (normA.ddd && normB.ddd) {
    if (normA.ddd !== normB.ddd) return 'nenhum'
  }

  // Um deles tem 10 dígitos (DDD + 8) e o outro tem 11 dígitos (DDD + 9), ou
  // se um tem 9º dígito e o outro não
  const lenA = normA.digitosEssenciais.length
  const lenB = normB.digitosEssenciais.length
  if (Math.abs(lenA - lenB) === 1) {
    return 'tolerante_nono_digito'
  }

  return 'nenhum'
}

export interface CandidatoContatoCasamento {
  /** ID do cliente titular/pai */
  clienteId: string
  /** Nome do cliente titular/pai */
  clienteNome: string
  /** Onde o número foi encontrado */
  origem:
    | 'cliente_whatsapp'
    | 'cliente_telefone'
    | 'contato_adicional'
    | 'outro_contato'
    | 'contato_direto'
  /** Nome do contato (se for adicional, ex: Rodrigo Becker; se for cliente, nome do cliente) */
  contatoNome: string
  /** Papel do contato adicional (ex: 'principal', 'financeiro', 'responsavel') */
  papel?: string
  /** ID do contato adicional, se houver */
  contatoAdicionalId?: string
  /** Número bruto registrado */
  numeroCadastrado: string
  /** Número normalizado essencial */
  numeroNormalizado: string
  /** Tipo de casamento */
  tipoMatch: 'exato' | 'tolerante_nono_digito'
  /** Detalhe para exibição ao usuário */
  detalhe?: string
}

export interface ResultadoCasamentoRemetente {
  /** Tipo do melhor match encontrado */
  status: 'exato_unico' | 'ambiguo' | 'nenhum'
  /** Se encontrou um match com prioridade máxima (exato ou tolerante sem ambiguidade) */
  contatoPrincipal?: CandidatoContatoCasamento
  /** Lista de todos os contatos compatíveis encontrados */
  candidatosCompativeis: CandidatoContatoCasamento[]
  /** Número recebido normalizado */
  numeroRecebidoNormalizado: string
}

export interface EntidadeClienteParaCasamento {
  id: string
  nome?: string
  razao_social?: string
  whatsapp?: string
  telefone?: string
  telefone_secundario?: string
  titular_telefone?: string
}

export interface EntidadeContatoAdicionalParaCasamento {
  id: string
  cliente?: string
  cliente_id?: string
  nome?: string
  telefone?: string
  whatsapp?: string
  papel?: string
  is_whatsapp?: boolean
  is_principal?: boolean
}

/**
 * Busca e casa um número de WhatsApp recebido contra a base de clientes e contatos adicionais.
 *
 * Prioridades:
 * 1. Contato com match EXATO (números normalizados idênticos). Se houver pelo menos um exato,
 *    os exatos têm prioridade sobre qualquer tolerante.
 *    Se houver exatamente 1 exato -> retorna status 'exato_unico'.
 * 2. Se houver múltiplos exatos -> status 'ambiguo'.
 * 3. Se não houver nenhum exato mas houver 1 ou mais compatíveis com tolerância ao 9º dígito:
 *    - Se houver 1 tolerante -> status 'exato_unico' (pois não há ambiguidade e o casamento é aceito com tolerância).
 *    - Se houver mais de 1 tolerante compatível -> status 'ambiguo' (mostra lista para escolha).
 * 4. Se não houver nenhum compatível -> status 'nenhum'.
 */
export function casarRemetenteComContatos(
  numeroRecebido: string | undefined | null,
  clientes: EntidadeClienteParaCasamento[],
  contatosAdicionais: EntidadeContatoAdicionalParaCasamento[] = [],
): ResultadoCasamentoRemetente {
  const normRecebido = normalizarNumeroWhatsApp(numeroRecebido)
  if (!normRecebido) {
    return {
      status: 'nenhum',
      candidatosCompativeis: [],
      numeroRecebidoNormalizado: '',
    }
  }

  const candidatos: CandidatoContatoCasamento[] = []
  const chavesVistas = new Set<string>()

  const registrarCandidato = (cand: CandidatoContatoCasamento) => {
    // Chave única para evitar duplicatas do mesmo cliente com o mesmo número
    const chave = `${cand.clienteId}_${cand.numeroNormalizado}_${cand.origem}`
    if (chavesVistas.has(chave)) return
    chavesVistas.add(chave)
    candidatos.push(cand)
  }

  // 1. Varrer clientes principais (whatsapp, telefone, telefone_secundario, titular_telefone)
  for (const cli of clientes) {
    if (!cli || !cli.id) continue
    const nomeCli = cli.nome || cli.razao_social || 'Cliente sem nome'

    // Campo WhatsApp do cliente
    if (cli.whatsapp) {
      const match = compararTelefonesFlexivel(normRecebido, cli.whatsapp)
      if (match !== 'nenhum') {
        registrarCandidato({
          clienteId: cli.id,
          clienteNome: nomeCli,
          origem: 'cliente_whatsapp',
          contatoNome: nomeCli,
          numeroCadastrado: cli.whatsapp,
          numeroNormalizado: normalizarNumeroWhatsApp(cli.whatsapp),
          tipoMatch: match,
          detalhe: 'WhatsApp cadastrado do cliente',
        })
      }
    }

    // Campo Telefone do cliente
    if (cli.telefone) {
      const match = compararTelefonesFlexivel(normRecebido, cli.telefone)
      if (match !== 'nenhum') {
        registrarCandidato({
          clienteId: cli.id,
          clienteNome: nomeCli,
          origem: 'cliente_telefone',
          contatoNome: nomeCli,
          numeroCadastrado: cli.telefone,
          numeroNormalizado: normalizarNumeroWhatsApp(cli.telefone),
          tipoMatch: match,
          detalhe: 'Telefone comercial/fixo do cliente',
        })
      }
    }

    // Telefone secundário
    if (cli.telefone_secundario) {
      const match = compararTelefonesFlexivel(normRecebido, cli.telefone_secundario)
      if (match !== 'nenhum') {
        registrarCandidato({
          clienteId: cli.id,
          clienteNome: nomeCli,
          origem: 'cliente_telefone',
          contatoNome: nomeCli,
          numeroCadastrado: cli.telefone_secundario,
          numeroNormalizado: normalizarNumeroWhatsApp(cli.telefone_secundario),
          tipoMatch: match,
          detalhe: 'Telefone secundário do cliente',
        })
      }
    }

    // Telefone titular
    if (cli.titular_telefone) {
      const match = compararTelefonesFlexivel(normRecebido, cli.titular_telefone)
      if (match !== 'nenhum') {
        registrarCandidato({
          clienteId: cli.id,
          clienteNome: nomeCli,
          origem: 'cliente_telefone',
          contatoNome: nomeCli,
          numeroCadastrado: cli.titular_telefone,
          numeroNormalizado: normalizarNumeroWhatsApp(cli.titular_telefone),
          tipoMatch: match,
          detalhe: 'Telefone do titular da conta',
        })
      }
    }
  }

  // 2. Varrer contatos adicionais
  // Mapa de clientes para obter nome rápido
  const clientesMap = new Map<string, EntidadeClienteParaCasamento>()
  for (const c of clientes) {
    if (c?.id) clientesMap.set(c.id, c)
  }

  for (const ca of contatosAdicionais) {
    if (!ca) continue
    const cliId = ca.cliente || ca.cliente_id
    if (!cliId) continue

    const cliPai = clientesMap.get(cliId)
    const nomeCli = cliPai?.nome || cliPai?.razao_social || 'Cliente'
    const nomeContato = ca.nome || 'Contato Adicional'
    const tel = ca.telefone || ca.whatsapp

    if (!tel) continue

    const match = compararTelefonesFlexivel(normRecebido, tel)
    if (match !== 'nenhum') {
      registrarCandidato({
        clienteId: cliId,
        clienteNome: nomeCli,
        origem: 'contato_adicional',
        contatoNome: nomeContato,
        papel: ca.papel || (ca.is_principal ? 'principal' : undefined),
        contatoAdicionalId: ca.id,
        numeroCadastrado: tel,
        numeroNormalizado: normalizarNumeroWhatsApp(tel),
        tipoMatch: match,
        detalhe: `Contato adicional: ${nomeContato}${ca.papel ? ` (${ca.papel})` : ''}`,
      })
    }
  }

  if (candidatos.length === 0) {
    return {
      status: 'nenhum',
      candidatosCompativeis: [],
      numeroRecebidoNormalizado: normRecebido,
    }
  }

  // Separar exatos de tolerantes
  const exatos = candidatos.filter((c) => c.tipoMatch === 'exato')

  // Se houver exatos, eles têm prioridade absoluta
  if (exatos.length > 0) {
    // Agrupar por cliente para ver se múltiplos exatos são na verdade o mesmo cliente
    const clientesExatosUnicos = Array.from(new Set(exatos.map((e) => e.clienteId)))
    if (clientesExatosUnicos.length === 1) {
      return {
        status: 'exato_unico',
        contatoPrincipal: exatos[0],
        candidatosCompativeis: exatos,
        numeroRecebidoNormalizado: normRecebido,
      }
    }
    // Múltiplos clientes distintos batem exatamente com o mesmo número
    return {
      status: 'ambiguo',
      candidatosCompativeis: exatos,
      numeroRecebidoNormalizado: normRecebido,
    }
  }

  // Não houve match exato, mas houve compatíveis com 9º dígito
  const clientesTolerantesUnicos = Array.from(new Set(candidatos.map((c) => c.clienteId)))
  if (clientesTolerantesUnicos.length === 1) {
    return {
      status: 'exato_unico',
      contatoPrincipal: candidatos[0],
      candidatosCompativeis: candidatos,
      numeroRecebidoNormalizado: normRecebido,
    }
  }

  // Mais de um cliente compatível com 9º dígito -> ambiguidade!
  return {
    status: 'ambiguo',
    candidatosCompativeis: candidatos,
    numeroRecebidoNormalizado: normRecebido,
  }
}

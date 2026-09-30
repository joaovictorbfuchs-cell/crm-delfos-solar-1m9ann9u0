import pb from '@/lib/pocketbase/client'
import type { Cliente, ContatoAdicional, ContatoUnico } from '@/types/crm'
import { cleanPhoneDigits } from '@/lib/formatters'
import {
  normalizarDigitosComparacao,
  verificarTelefonesIguais,
} from '@/services/importacaoCsvContatosService'
import { updateCliente, mesclarClientes as mesclarClientesCRM } from '@/services/crmService'
import { updateContatoUnico, deleteContatoUnico } from '@/services/contatosService'

export interface ContatoCorrespondente {
  id: string
  nome: string
  origem: 'cliente' | 'contato_adicional' | 'contato_unico' | 'outro_contato'
  telefone?: string
  whatsapp?: string
  email?: string
  clienteAssociadoNome?: string
  clienteAssociadoId?: string
  campoCorrespondente: 'telefone' | 'whatsapp' | 'ambos'
  numeroEncontrado: string
  rawRecord: Cliente | ContatoAdicional | ContatoUnico | any
}

export interface VerificarDuplicidadeTelefoneParams {
  telefone?: string | null
  whatsapp?: string | null
  /**
   * ID do registro atual sendo editado, para ignorar self-match.
   * Se for criação, passar undefined ou vazio.
   */
  ignorarId?: string | null
  /**
   * Tipo do registro sendo ignorado (para evitar conflito de IDs entre coleções distintas).
   */
  ignorarOrigem?: 'cliente' | 'contato_adicional' | 'contato_unico' | 'outro_contato'
  /**
   * Base de clientes em memória (se disponível, para checagem instantânea sem latência de rede).
   */
  clientesPrecarregados?: Cliente[]
  /**
   * Contatos adicionais em memória (se disponível).
   */
  contatosAdicionaisPrecarregados?: ContatoAdicional[]
  /**
   * Contatos únicos em memória (se disponível).
   */
  contatosUnicosPrecarregados?: ContatoUnico[]
}

/**
 * Normaliza apenas dígitos de telefone para comparação de duplicidade.
 * Reutiliza normalizarDigitosComparacao do importacaoCsvContatosService.
 */
export function normalizarTelefoneDelfos(tel?: string | null): string {
  return normalizarDigitosComparacao(tel)
}

/**
 * Verifica se dois números são equivalentes no contexto do Delfos Solar.
 */
export function saoTelefonesEquivalentes(telA?: string | null, telB?: string | null): boolean {
  return verificarTelefonesIguais(telA, telB)
}

/**
 * Busca registros existentes que possuam o mesmo Telefone ou WhatsApp informado.
 * Varre em memória (clientes, contatos_adicionais e contatos) e, se necessário/desejado,
 * consulta o PocketBase para garantir cobertura completa.
 */
export async function detectarDuplicidadeTelefone(
  params: VerificarDuplicidadeTelefoneParams,
): Promise<ContatoCorrespondente[]> {
  const {
    telefone,
    whatsapp,
    ignorarId,
    ignorarOrigem,
    clientesPrecarregados,
    contatosAdicionaisPrecarregados,
    contatosUnicosPrecarregados,
  } = params

  const normTel = normalizarTelefoneDelfos(telefone)
  const normWpp = normalizarTelefoneDelfos(whatsapp)

  if (!normTel && !normWpp) {
    return []
  }

  // 1. Obter listas (usar pré-carregadas se houver ou buscar via PB com fallback defensivo)
  let clientes: Cliente[] = clientesPrecarregados || []
  let contatosAdicionais: ContatoAdicional[] = contatosAdicionaisPrecarregados || []
  let contatosUnicos: ContatoUnico[] = contatosUnicosPrecarregados || []

  const precisamBuscar =
    !clientesPrecarregados ||
    clientesPrecarregados.length === 0 ||
    !contatosAdicionaisPrecarregados ||
    !contatosUnicosPrecarregados

  if (precisamBuscar) {
    try {
      const [resClientes, resContatosAdic, resContatosUnicos] = await Promise.allSettled([
        clientes.length > 0
          ? Promise.resolve(clientes)
          : pb.collection('clientes').getFullList<Cliente>({
              fields: 'id,nome,telefone,whatsapp,email,empresa,cidade,status',
              requestKey: null,
            }),
        contatosAdicionais.length > 0
          ? Promise.resolve(contatosAdicionais)
          : pb.collection('contatos_adicionais').getFullList<ContatoAdicional>({
              fields: 'id,nome,telefone,is_whatsapp,email,cliente,cargo,papel',
              requestKey: null,
            }),
        contatosUnicos.length > 0
          ? Promise.resolve(contatosUnicos)
          : pb.collection('contatos').getFullList<ContatoUnico>({
              fields: 'id,nome,telefone,whatsapp,email,clientes_vinculados,papel',
              requestKey: null,
            }),
      ])

      if (resClientes.status === 'fulfilled') {
        clientes = resClientes.value
      }
      if (resContatosAdic.status === 'fulfilled') {
        contatosAdicionais = resContatosAdic.value
      }
      if (resContatosUnicos.status === 'fulfilled') {
        contatosUnicos = resContatosUnicos.value
      }
    } catch (err) {
      console.warn('Erro ao carregar fontes remotas para checagem de duplicidade:', err)
    }
  }

  // Mapa de nomes de clientes para enriquecer contato_adicional e contatos
  const clienteNomeMap = new Map<string, string>()
  for (const c of clientes) {
    clienteNomeMap.set(c.id, c.nome)
  }

  const correspondencias: ContatoCorrespondente[] = []
  const idsJaIncluidos = new Set<string>()

  // Helper de correspondência de número
  const testarNumero = (
    candidatoTel?: string | null,
    candidatoWpp?: string | null,
  ): { match: boolean; campo: 'telefone' | 'whatsapp' | 'ambos'; numero: string } => {
    let matchTel = false
    let matchWpp = false
    let numeroEncontrado = ''

    if (normTel) {
      if (saoTelefonesEquivalentes(normTel, candidatoTel)) {
        matchTel = true
        numeroEncontrado = candidatoTel || ''
      } else if (saoTelefonesEquivalentes(normTel, candidatoWpp)) {
        matchWpp = true
        numeroEncontrado = candidatoWpp || ''
      }
    }

    if (normWpp) {
      if (saoTelefonesEquivalentes(normWpp, candidatoWpp)) {
        matchWpp = true
        numeroEncontrado = candidatoWpp || ''
      } else if (saoTelefonesEquivalentes(normWpp, candidatoTel)) {
        matchTel = true
        numeroEncontrado = candidatoTel || ''
      }
    }

    if (matchTel && matchWpp) {
      return { match: true, campo: 'ambos', numero: numeroEncontrado }
    }
    if (matchTel) {
      return { match: true, campo: 'telefone', numero: numeroEncontrado }
    }
    if (matchWpp) {
      return { match: true, campo: 'whatsapp', numero: numeroEncontrado }
    }
    return { match: false, campo: 'telefone', numero: '' }
  }

  // 1. Checar clientes
  for (const cli of clientes) {
    if (ignorarId && cli.id === ignorarId && (!ignorarOrigem || ignorarOrigem === 'cliente')) {
      continue
    }

    const res = testarNumero(cli.telefone, cli.whatsapp)
    if (res.match) {
      const key = `cli_${cli.id}`
      if (!idsJaIncluidos.has(key)) {
        idsJaIncluidos.add(key)
        correspondencias.push({
          id: cli.id,
          nome: cli.nome,
          origem: 'cliente',
          telefone: cli.telefone,
          whatsapp: cli.whatsapp,
          email: cli.email,
          clienteAssociadoNome:
            (cli as any).razao_social || (cli as any).nome_fantasia || undefined,
          clienteAssociadoId: cli.id,
          campoCorrespondente: res.campo,
          numeroEncontrado: res.numero,
          rawRecord: cli,
        })
      }
    }
  }

  // 2. Checar contatos adicionais
  for (const ca of contatosAdicionais) {
    if (
      ignorarId &&
      ca.id === ignorarId &&
      (!ignorarOrigem || ignorarOrigem === 'contato_adicional')
    ) {
      continue
    }

    const caTel = ca.telefone
    const caWpp = ca.is_whatsapp ? ca.telefone : undefined
    const res = testarNumero(caTel, caWpp)

    if (res.match) {
      const key = `ca_${ca.id}`
      if (!idsJaIncluidos.has(key)) {
        idsJaIncluidos.add(key)
        const cliNome = ca.cliente ? clienteNomeMap.get(ca.cliente) : undefined
        correspondencias.push({
          id: ca.id,
          nome: ca.nome,
          origem: 'contato_adicional',
          telefone: ca.telefone,
          whatsapp: ca.is_whatsapp ? ca.telefone : undefined,
          email: ca.email,
          clienteAssociadoNome: cliNome,
          clienteAssociadoId: ca.cliente,
          campoCorrespondente: res.campo,
          numeroEncontrado: res.numero,
          rawRecord: ca,
        })
      }
    }
  }

  // 3. Checar contatos únicos
  for (const cu of contatosUnicos) {
    if (ignorarId && cu.id === ignorarId && (!ignorarOrigem || ignorarOrigem === 'contato_unico')) {
      continue
    }
    // Evita duplicar se já foi pego como cliente virtual cli_xxx
    if (cu.id.startsWith('cli_')) {
      const realCliId = cu.id.replace('cli_', '')
      if (idsJaIncluidos.has(`cli_${realCliId}`)) continue
    }
    if (cu.id.startsWith('ca_')) {
      const realCaId = cu.id.replace('ca_', '')
      if (idsJaIncluidos.has(`ca_${realCaId}`)) continue
    }

    const res = testarNumero(cu.telefone, cu.whatsapp)
    if (res.match) {
      const key = `cu_${cu.id}`
      if (!idsJaIncluidos.has(key)) {
        idsJaIncluidos.add(key)
        const primeiroCliVinculado =
          Array.isArray(cu.clientes_vinculados) && cu.clientes_vinculados.length > 0
            ? cu.clientes_vinculados[0]
            : undefined
        const cliNome = primeiroCliVinculado ? clienteNomeMap.get(primeiroCliVinculado) : undefined

        correspondencias.push({
          id: cu.id,
          nome: cu.nome,
          origem: 'contato_unico',
          telefone: cu.telefone,
          whatsapp: cu.whatsapp,
          email: cu.email,
          clienteAssociadoNome: cliNome,
          clienteAssociadoId: primeiroCliVinculado,
          campoCorrespondente: res.campo,
          numeroEncontrado: res.numero,
          rawRecord: cu,
        })
      }
    }
  }

  return correspondencias
}

/**
 * Mescla dados preservando os do destino existente e preenchendo vazios com os da origem.
 * Regra: Quando ambos têm valor e divergem, mantém o do registro existente.
 */
export function fundirRegistrosComPrioridadeDestino<T extends Record<string, any>>(
  destino: T,
  origem: Partial<T>,
): T {
  const resultado = { ...destino }

  for (const key of Object.keys(origem) as Array<keyof T>) {
    const valDestino = destino[key]
    const valOrigem = origem[key]

    const destinoVazio =
      valDestino === undefined ||
      valDestino === null ||
      (typeof valDestino === 'string' && valDestino.trim() === '') ||
      (Array.isArray(valDestino) && valDestino.length === 0)

    const origemPreenchida =
      valOrigem !== undefined &&
      valOrigem !== null &&
      (typeof valOrigem === 'string' ? valOrigem.trim() !== '' : true)

    if (destinoVazio && origemPreenchida) {
      resultado[key] = valOrigem as any
    }
  }

  // Preservar observações com nota de auditoria aditiva se houver observação na origem
  const obsOrigemRaw = (origem as Record<string, unknown>).observacoes
  const obsDestinoRaw = (destino as Record<string, unknown>).observacoes
  if (obsOrigemRaw && typeof obsOrigemRaw === 'string' && obsOrigemRaw.trim() !== '') {
    const obsDestino = typeof obsDestinoRaw === 'string' ? obsDestinoRaw.trim() : ''
    const obsOrigem = obsOrigemRaw.trim()

    if (obsDestino && !obsDestino.includes(obsOrigem)) {
      ;(resultado as Record<string, unknown>).observacoes =
        `${obsDestino}\n\n[Histórico mesclado]: ${obsOrigem}`
    } else if (!obsDestino) {
      ;(resultado as Record<string, unknown>).observacoes = obsOrigem
    }
  }

  return resultado
}

export interface ExecutarMesclagemDuplicadoOptions {
  /**
   * Registro existente de destino com o qual estamos mesclando.
   */
  registroDestino: ContatoCorrespondente
  /**
   * Dados que estavam sendo criados/editados pelo usuário.
   */
  dadosNovos: {
    nome?: string
    telefone?: string
    whatsapp?: string
    email?: string
    cargo?: string
    observacoes?: string
    cidade?: string
    estado?: string
    endereco?: string
    numero?: string
    bairro?: string
    cep?: string
    cpf?: string
    cnpj?: string
    tipo_pessoa?: any
    [key: string]: any
  }
  /**
   * Se o fluxo estava em modo "edição" de um registro existente (que agora será absorvido/excluído).
   * Se for criação de novo contato, idOrigemEdicao é undefined.
   */
  idOrigemEdicao?: string
  origemEdicaoTipo?: 'cliente' | 'contato_adicional' | 'contato_unico'
}

/**
 * Executa a mesclagem conforme os Requisitos 3 e 4:
 * 1. Preserva os dados do registro existente de destino.
 * 2. Preenche campos vazios do destino com os novos dados fornecidos.
 * 3. Se era edição de registro pré-existente, absorve/exclui o registro duplicado antigo.
 */
export async function executarMesclagemDuplicado(
  options: ExecutarMesclagemDuplicadoOptions,
): Promise<{ destinoAtualizado: any; excluidoOrigemId?: string }> {
  const { registroDestino, dadosNovos, idOrigemEdicao, origemEdicaoTipo } = options

  // Caso 1: Destino é um Cliente da base viva
  if (registroDestino.origem === 'cliente') {
    const clienteExistente = registroDestino.rawRecord as Cliente

    // Preenche campos vazios do cliente existente com os dados novos
    const camposAtualizar: Partial<Cliente> = {}
    const camposTestaveis: Array<keyof Cliente> = [
      'telefone',
      'whatsapp',
      'email',
      'cidade',
      'estado',
      'endereco',
      'numero',
      'bairro',
      'cep',
      'cpf',
      'cnpj',
      'tipo_pessoa',
      'contato_principal',
      'contato',
    ]

    for (const k of camposTestaveis) {
      const vExistente = clienteExistente[k]
      const vNovo = dadosNovos[k]
      const isVazio =
        vExistente === undefined ||
        vExistente === null ||
        (typeof vExistente === 'string' && String(vExistente).trim() === '')

      if (isVazio && vNovo !== undefined && vNovo !== null && String(vNovo).trim() !== '') {
        ;(camposAtualizar as any)[k] = vNovo
      }
    }

    // Se destino não tinha telefone e novo tinha, preenche; o mesmo para whatsapp
    if (!clienteExistente.telefone && (dadosNovos.telefone || dadosNovos.whatsapp)) {
      camposAtualizar.telefone = dadosNovos.telefone || dadosNovos.whatsapp
    }
    if (!clienteExistente.whatsapp && (dadosNovos.whatsapp || dadosNovos.telefone)) {
      camposAtualizar.whatsapp = dadosNovos.whatsapp || dadosNovos.telefone
    }

    // Fusão de observações
    if (dadosNovos.observacoes && typeof dadosNovos.observacoes === 'string') {
      const obsDest = clienteExistente.observacoes || ''
      const obsNova = dadosNovos.observacoes.trim()
      if (obsNova && !obsDest.includes(obsNova)) {
        camposAtualizar.observacoes = obsDest
          ? `${obsDest}\n\n[Histórico mesclado]: ${obsNova}`
          : obsNova
      }
    }

    // Atualiza cliente destino
    let clienteAtualizado: Cliente = clienteExistente
    if (Object.keys(camposAtualizar).length > 0) {
      clienteAtualizado = await updateCliente(clienteExistente.id, camposAtualizar)
    }

    // Se estava editando outro cliente e mesclou com este, usa mesclarClientesCRM para transferir tudo
    let excluidoId: string | undefined
    if (idOrigemEdicao && idOrigemEdicao !== clienteExistente.id) {
      if (origemEdicaoTipo === 'cliente') {
        clienteAtualizado = await mesclarClientesCRM({
          clienteMestreId: clienteExistente.id,
          clienteSecundarioId: idOrigemEdicao,
          camposSobrescritos: camposAtualizar,
        })
        excluidoId = idOrigemEdicao
      } else if (origemEdicaoTipo === 'contato_adicional') {
        try {
          await pb.collection('contatos_adicionais').delete(idOrigemEdicao)
          excluidoId = idOrigemEdicao
        } catch (e) {
          console.warn('Falha ao excluir contato_adicional antigo na mesclagem:', e)
        }
      } else if (origemEdicaoTipo === 'contato_unico') {
        try {
          await deleteContatoUnico(idOrigemEdicao)
          excluidoId = idOrigemEdicao
        } catch (e) {
          console.warn('Falha ao excluir contato único antigo na mesclagem:', e)
        }
      }
    }

    return { destinoAtualizado: clienteAtualizado, excluidoOrigemId: excluidoId }
  }

  // Caso 2: Destino é um Contato Adicional
  if (registroDestino.origem === 'contato_adicional') {
    const caExistente = registroDestino.rawRecord as ContatoAdicional
    const camposAtualizar: Partial<ContatoAdicional> = {}

    if (!caExistente.telefone && (dadosNovos.telefone || dadosNovos.whatsapp)) {
      camposAtualizar.telefone = dadosNovos.telefone || dadosNovos.whatsapp
    }
    if (!caExistente.email && dadosNovos.email) {
      camposAtualizar.email = dadosNovos.email
    }
    if (!caExistente.cargo && dadosNovos.cargo) {
      camposAtualizar.cargo = dadosNovos.cargo
    }

    let caAtualizado = caExistente
    if (Object.keys(camposAtualizar).length > 0) {
      caAtualizado = await pb
        .collection('contatos_adicionais')
        .update<ContatoAdicional>(caExistente.id, camposAtualizar)
    }

    let excluidoId: string | undefined
    if (idOrigemEdicao && idOrigemEdicao !== caExistente.id) {
      if (origemEdicaoTipo === 'contato_adicional') {
        try {
          await pb.collection('contatos_adicionais').delete(idOrigemEdicao)
          excluidoId = idOrigemEdicao
        } catch (e) {
          console.warn('Falha ao remover contato adicional antigo:', e)
        }
      }
    }

    return { destinoAtualizado: caAtualizado, excluidoOrigemId: excluidoId }
  }

  // Caso 3: Destino é Contato Único da área centralizada
  const cuExistente = registroDestino.rawRecord as ContatoUnico
  const camposAtualizar: Partial<ContatoUnico> = {}

  if (!cuExistente.telefone && dadosNovos.telefone) {
    camposAtualizar.telefone = dadosNovos.telefone
  }
  if (!cuExistente.whatsapp && dadosNovos.whatsapp) {
    camposAtualizar.whatsapp = dadosNovos.whatsapp
  }
  if (!cuExistente.email && dadosNovos.email) {
    camposAtualizar.email = dadosNovos.email
  }
  if (!cuExistente.cargo && dadosNovos.cargo) {
    camposAtualizar.cargo = dadosNovos.cargo
  }
  if (dadosNovos.observacoes && typeof dadosNovos.observacoes === 'string') {
    const obsDest = cuExistente.observacoes || ''
    const obsNova = dadosNovos.observacoes.trim()
    if (obsNova && !obsDest.includes(obsNova)) {
      camposAtualizar.observacoes = obsDest
        ? `${obsDest}\n\n[Histórico mesclado]: ${obsNova}`
        : obsNova
    }
  }

  let cuAtualizado = cuExistente
  if (Object.keys(camposAtualizar).length > 0) {
    cuAtualizado = await updateContatoUnico(cuExistente.id, camposAtualizar)
  }

  let excluidoId: string | undefined
  if (idOrigemEdicao && idOrigemEdicao !== cuExistente.id) {
    if (origemEdicaoTipo === 'contato_unico') {
      try {
        await deleteContatoUnico(idOrigemEdicao)
        excluidoId = idOrigemEdicao
      } catch (e) {
        console.warn('Falha ao remover contato único antigo:', e)
      }
    }
  }

  return { destinoAtualizado: cuAtualizado, excluidoOrigemId: excluidoId }
}

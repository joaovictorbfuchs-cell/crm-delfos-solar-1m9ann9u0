import pb from '@/lib/pocketbase/client'
import type { ModeloEmailRGE, EmailRGEItem } from '@/types/crm'

export const MODELO_SOLICITAR_CONTAS_NOME = 'Solicitar contas RGE'
export const MODELO_TROCA_TITULARIDADE_NOME = 'Troca de titularidade'
export const MODELO_TRANSFERENCIA_CREDITOS_NOME =
  'Transferência de créditos entre unidades consumidoras'

export const TEXTO_SOLICITAR_CONTAS_DEFAULT = `Prezados,

Venho por meio deste solicitar o envio das faturas/contas de energia elétrica dos últimos 5 (cinco) anos, referentes à Unidade Consumidora de número [número da UC], localizada em [endereço da UC].

Os dados do titular/consumidor são:
Nome: [nome do cliente]
CPF/CNPJ: [CPF/CNPJ]
Endereço: [endereço da UC]

Segue em anexo a procuração/autorização e demais documentos necessários para a solicitação.

Desde já, agradeço a atenção e coloco-me à disposição para quaisquer esclarecimentos.

Atenciosamente,
[nome do responsável]
[cargo do responsável]
Delfos Engenharia Ltda
[telefone Delfos] | [email Delfos]
www.delfosengenharia.com.br`

export const TEXTO_TROCA_TITULARIDADE_DEFAULT = `Prezados,

Solicitamos por meio deste o procedimento de Troca de Titularidade referente à Unidade Consumidora de número [número da UC], situada em [endereço da UC].

Dados do novo titular:
Nome: [nome do cliente]
CPF/CNPJ: [CPF/CNPJ]
Endereço da UC: [endereço da UC]

Seguem em anexo os documentos comprobatórios de posse/propriedade, documento de identificação com foto do titular e termo/procuração assinado.

Solicitamos a confirmação do protocolo de recebimento e o prazo estimado para conclusão.

Atenciosamente,
[nome do responsável]
[cargo do responsável]
Delfos Engenharia Ltda
[telefone Delfos] | [email Delfos]
www.delfosengenharia.com.br`

export const TEXTO_TRANSFERENCIA_CREDITOS_DEFAULT = `Prezados,

Venho por meio deste solicitar a Transferência de Créditos de Energia Solar entre unidades consumidoras vinculadas ao mesmo titular/grupo de rateio, conforme resolução normativa aplicável.

Unidade Geradora / Origem: [número da UC]
Endereço da Geradora: [endereço da UC]
Titular: [nome do cliente] (CPF/CNPJ: [CPF/CNPJ])

Seguem em anexo a tabela de rateio/compensação com as UCs beneficiárias, percentuais de crédito e procuração autorizativa.

Ficamos à disposição para quaisquer esclarecimentos técnicos adicionais.

Atenciosamente,
[nome do responsável]
[cargo do responsável]
Delfos Engenharia Ltda
[telefone Delfos] | [email Delfos]
www.delfosengenharia.com.br`

export const EMAIL_DESTINO_PADRAO = 'joao@delfosengenharia.com.br'

export const MODELOS_INICIAIS_FALLBACK: Array<
  Omit<ModeloEmailRGE, 'id' | 'collectionId' | 'collectionName' | 'created' | 'updated'>
> = [
  {
    nome: MODELO_SOLICITAR_CONTAS_NOME,
    tipo: 'solicitar_contas_rge',
    assunto: 'Solicitação de faturas de energia — UC [número da UC] — [nome do cliente]',
    texto: TEXTO_SOLICITAR_CONTAS_DEFAULT,
    email_destino: EMAIL_DESTINO_PADRAO,
    is_padrao: true,
    ordem: 1,
  },
  {
    nome: MODELO_TROCA_TITULARIDADE_NOME,
    tipo: 'troca_titularidade',
    assunto: 'Troca de Titularidade — UC [número da UC] — [nome do cliente]',
    texto: TEXTO_TROCA_TITULARIDADE_DEFAULT,
    email_destino: EMAIL_DESTINO_PADRAO,
    is_padrao: true,
    ordem: 2,
  },
  {
    nome: MODELO_TRANSFERENCIA_CREDITOS_NOME,
    tipo: 'transferencia_creditos',
    assunto:
      'Transferência de Créditos entre Unidades Consumidoras — UC [número da UC] — [nome do cliente]',
    texto: TEXTO_TRANSFERENCIA_CREDITOS_DEFAULT,
    email_destino: EMAIL_DESTINO_PADRAO,
    is_padrao: true,
    ordem: 3,
  },
]

export const EMAILS_INICIAIS_FALLBACK: Array<
  Omit<EmailRGEItem, 'id' | 'collectionId' | 'collectionName' | 'created' | 'updated'>
> = [
  {
    email: 'joao@delfosengenharia.com.br',
    rotulo: 'João (Delfos Solar)',
    descricao: 'E-mail interno responsável pelos processos da concessionária',
    is_padrao: true,
  },
  {
    email: 'atendimentocomercialrge@cpfl.com.br',
    rotulo: 'Atendimento Comercial RGE / CPFL',
    descricao: 'Canal oficial de atendimento de faturamento da RGE',
    is_padrao: false,
  },
  {
    email: 'delfos.usinas@gmail.com',
    rotulo: 'Delfos Usinas (Geral)',
    descricao: 'Caixa de entrada geral de usinas e projetos',
    is_padrao: false,
  },
]

// =============================================================
// CRUD de Modelos de E-mail RGE
// =============================================================

export async function listarModelosEmailRGE(): Promise<ModeloEmailRGE[]> {
  try {
    const records = await pb.collection('modelos_email_rge').getFullList<ModeloEmailRGE>({
      sort: 'ordem,created',
      requestKey: null,
    })

    if (records && records.length > 0) {
      // Deduplicação defensiva por nome (mantém o mais recente / atualizado se houver duplicata de nome)
      const mapa = new Map<string, ModeloEmailRGE>()
      for (const rec of records) {
        const key = rec.nome?.trim().toLowerCase()
        if (key && !mapa.has(key)) {
          mapa.set(key, rec)
        }
      }
      return Array.from(mapa.values())
    }
  } catch (err) {
    console.warn('Falha ao listar modelos_email_rge do banco; aplicando fallback:', err)
  }

  // Fallback em memória se a coleção estiver vazia ou offline
  return MODELOS_INICIAIS_FALLBACK.map((m, idx) => ({
    ...m,
    id: `fallback-modelo-${idx}`,
    collectionId: 'modelos_email_rge',
    collectionName: 'modelos_email_rge',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  })) as ModeloEmailRGE[]
}

export async function criarModeloEmailRGE(dados: {
  nome: string
  tipo?: string
  assunto?: string
  texto: string
  email_destino?: string
  is_padrao?: boolean
  ordem?: number
}): Promise<ModeloEmailRGE> {
  const payload = {
    nome: dados.nome.trim(),
    tipo: dados.tipo?.trim() || 'personalizado',
    assunto: dados.assunto?.trim() || `[Email RGE] ${dados.nome.trim()} — UC [número da UC]`,
    texto: dados.texto.trim(),
    email_destino: dados.email_destino?.trim() || EMAIL_DESTINO_PADRAO,
    is_padrao: Boolean(dados.is_padrao),
    ordem: typeof dados.ordem === 'number' ? dados.ordem : 99,
  }

  return pb.collection('modelos_email_rge').create<ModeloEmailRGE>(payload)
}

export async function atualizarModeloEmailRGE(
  id: string,
  dados: Partial<{
    nome: string
    tipo: string
    assunto: string
    texto: string
    email_destino: string
    is_padrao: boolean
    ordem: number
  }>,
): Promise<ModeloEmailRGE> {
  return pb.collection('modelos_email_rge').update<ModeloEmailRGE>(id, dados)
}

export async function excluirModeloEmailRGE(id: string): Promise<boolean> {
  await pb.collection('modelos_email_rge').delete(id)
  return true
}

// =============================================================
// CRUD da Lista de E-mails RGE (Gerenciável)
// =============================================================

export async function listarEmailsRGE(): Promise<EmailRGEItem[]> {
  try {
    const records = await pb.collection('emails_rge').getFullList<EmailRGEItem>({
      sort: '-is_padrao,rotulo,email',
      requestKey: null,
    })

    if (records && records.length > 0) {
      // Deduplicação defensiva por email
      const mapa = new Map<string, EmailRGEItem>()
      for (const rec of records) {
        const key = rec.email?.trim().toLowerCase()
        if (key && !mapa.has(key)) {
          mapa.set(key, rec)
        }
      }
      return Array.from(mapa.values())
    }
  } catch (err) {
    console.warn('Falha ao listar emails_rge do banco; aplicando fallback:', err)
  }

  return EMAILS_INICIAIS_FALLBACK.map((e, idx) => ({
    ...e,
    id: `fallback-email-${idx}`,
    collectionId: 'emails_rge',
    collectionName: 'emails_rge',
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  })) as EmailRGEItem[]
}

export async function salvarEmailRGE(dados: {
  email: string
  rotulo?: string
  descricao?: string
  is_padrao?: boolean
}): Promise<EmailRGEItem> {
  const emailNorm = dados.email.trim().toLowerCase()
  const payload = {
    email: emailNorm,
    rotulo: dados.rotulo?.trim() || emailNorm,
    descricao: dados.descricao?.trim() || '',
    is_padrao: Boolean(dados.is_padrao),
  }

  // Se já existir esse e-mail salvo, faz update
  try {
    const existing = await pb.collection('emails_rge').getFullList<EmailRGEItem>({
      filter: `email = '${emailNorm.replace(/'/g, "\\'")}'`,
      limit: 1,
      requestKey: null,
    })

    if (existing && existing.length > 0) {
      return pb.collection('emails_rge').update<EmailRGEItem>(existing[0].id, payload)
    }
  } catch {
    /* intentionally ignored */
  }

  return pb.collection('emails_rge').create<EmailRGEItem>(payload)
}

export async function excluirEmailRGE(id: string): Promise<boolean> {
  await pb.collection('emails_rge').delete(id)
  return true
}

export async function restaurarModelosIniciaisRGE(): Promise<ModeloEmailRGE[]> {
  for (const m of MODELOS_INICIAIS_FALLBACK) {
    try {
      const existing = await pb.collection('modelos_email_rge').getFullList<ModeloEmailRGE>({
        filter: `nome = '${m.nome.replace(/'/g, "\\'")}'`,
        limit: 1,
        requestKey: null,
      })

      if (existing && existing.length > 0) {
        await pb.collection('modelos_email_rge').update(existing[0].id, {
          assunto: m.assunto,
          texto: m.texto,
          email_destino: m.email_destino,
          tipo: m.tipo,
        })
      } else {
        await pb.collection('modelos_email_rge').create(m)
      }
    } catch (e) {
      console.warn(`Erro ao restaurar modelo inicial ${m.nome}:`, e)
    }
  }

  return listarModelosEmailRGE()
}

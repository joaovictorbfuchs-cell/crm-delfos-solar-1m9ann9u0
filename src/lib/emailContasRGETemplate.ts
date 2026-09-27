import pb from '@/lib/pocketbase/client'

export interface TemplateContasRGEParams {
  numeroUc: string
  enderecoUc: string
  nomeCliente: string
  documentoCliente: string
  nomeResponsavel: string
  cargoResponsavel?: string
  telefoneDelfos?: string
  emailDelfos?: string
}

export const EMAIL_RGE_PADRAO = 'atendimentocomercialrge@cpfl.com.br'
export const DELFOS_TELEFONE_PADRAO = '(54) 99646-8910'
export const DELFOS_EMAIL_PADRAO = 'delfos.usinas@gmail.com'

export const RGE_TEMPLATE_SLUG = 'email_solicitar_contas_rge'

export const ASSUNTO_RGE_ORIGINAL =
  'Solicitação de faturas de energia — UC [número da UC] — [nome do cliente]'

export const CORPO_TEXTO_RGE_ORIGINAL = `Prezados,

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

export interface RGETemplatePlaceholderInfo {
  tag: string
  label: string
  exemplo: string
}

export const RGE_PLACEHOLDERS: RGETemplatePlaceholderInfo[] = [
  { tag: '[número da UC]', label: 'Número da UC', exemplo: '1009845231' },
  { tag: '[nome do cliente]', label: 'Nome do Cliente', exemplo: 'João Silva' },
  { tag: '[CPF/CNPJ]', label: 'CPF ou CNPJ', exemplo: '123.456.789-00' },
  { tag: '[endereço da UC]', label: 'Endereço da UC', exemplo: 'Rua das Flores, 123, Erechim/RS' },
  { tag: '[nome do responsável]', label: 'Nome do Responsável', exemplo: 'Daniel Rotava' },
  {
    tag: '[cargo do responsável]',
    label: 'Cargo do Responsável',
    exemplo: 'Engenheiro Responsável',
  },
  { tag: '[telefone Delfos]', label: 'Telefone da Delfos', exemplo: '(54) 99646-8910' },
  { tag: '[email Delfos]', label: 'E-mail da Delfos', exemplo: 'delfos.usinas@gmail.com' },
]

/**
 * Substitui os placeholders [tag] ou {{tag}} pelos valores resolvidos da solicitação
 */
export function resolverPlaceholdersContasRGE(
  template: string,
  params: TemplateContasRGEParams,
): string {
  if (!template) return ''

  const uc = params.numeroUc ? params.numeroUc.trim() : '_____'
  const endereco = params.enderecoUc ? params.enderecoUc.trim() : '_____'
  const nome = params.nomeCliente ? params.nomeCliente.trim() : '_____'
  const documento = params.documentoCliente ? params.documentoCliente.trim() : '_____'
  const responsavel = params.nomeResponsavel ? params.nomeResponsavel.trim() : 'Delfos Engenharia'
  const cargo = params.cargoResponsavel ? params.cargoResponsavel.trim() : 'Responsável Técnico'
  const telefone = params.telefoneDelfos ? params.telefoneDelfos.trim() : DELFOS_TELEFONE_PADRAO
  const email = params.emailDelfos ? params.emailDelfos.trim() : DELFOS_EMAIL_PADRAO

  let texto = template

  // Suporte a placeholders colchetes [placeholder] e chaves duplas {{placeholder}}
  const mapa: Array<{ padroes: RegExp[]; valor: string }> = [
    {
      padroes: [
        /\[número da uc\]/gi,
        /\[numero da uc\]/gi,
        /\[uc\]/gi,
        /\{\{\s*numero_uc\s*\}\}/gi,
        /\{\{\s*número da uc\s*\}\}/gi,
      ],
      valor: uc,
    },
    {
      padroes: [
        /\[nome do cliente\]/gi,
        /\[cliente\]/gi,
        /\{\{\s*nome_cliente\s*\}\}/gi,
        /\{\{\s*nome\s*\}\}/gi,
      ],
      valor: nome,
    },
    {
      padroes: [
        /\[cpf\/cnpj\]/gi,
        /\[documento do titular\]/gi,
        /\[documento\]/gi,
        /\[cpf\]/gi,
        /\[cnpj\]/gi,
        /\{\{\s*documento\s*\}\}/gi,
        /\{\{\s*cpf_cnpj\s*\}\}/gi,
      ],
      valor: documento,
    },
    {
      padroes: [
        /\[endereço da uc\]/gi,
        /\[endereco da uc\]/gi,
        /\[endereço\]/gi,
        /\[endereco\]/gi,
        /\{\{\s*endereco_uc\s*\}\}/gi,
        /\{\{\s*endereco\s*\}\}/gi,
      ],
      valor: endereco,
    },
    {
      padroes: [
        /\[nome do responsável\]/gi,
        /\[nome do responsavel\]/gi,
        /\[responsável\]/gi,
        /\[responsavel\]/gi,
        /\{\{\s*responsavel\s*\}\}/gi,
        /\{\{\s*nome_responsavel\s*\}\}/gi,
      ],
      valor: responsavel,
    },
    {
      padroes: [
        /\[cargo do responsável\]/gi,
        /\[cargo do responsavel\]/gi,
        /\[cargo\]/gi,
        /\{\{\s*cargo\s*\}\}/gi,
        /\{\{\s*cargo_responsavel\s*\}\}/gi,
      ],
      valor: cargo,
    },
    {
      padroes: [
        /\[telefone delfos\]/gi,
        /\{\{\s*telefone_delfos\s*\}\}/gi,
        /\{\{\s*telefone\s*\}\}/gi,
      ],
      valor: telefone,
    },
    {
      padroes: [
        /\[email delfos\]/gi,
        /\[e-mail delfos\]/gi,
        /\{\{\s*email_delfos\s*\}\}/gi,
        /\{\{\s*email\s*\}\}/gi,
      ],
      valor: email,
    },
  ]

  for (const item of mapa) {
    for (const regex of item.padroes) {
      texto = texto.replace(regex, item.valor)
    }
  }

  return texto
}

/**
 * Gera o assunto padrão exigido pela concessionária
 */
export function gerarAssuntoContasRGE(
  numeroUc: string,
  nomeCliente: string,
  assuntoTemplate?: string,
): string {
  const ucFormatada = numeroUc ? numeroUc.trim() : 'UC'
  const clienteFormatado = nomeCliente ? nomeCliente.trim() : 'Cliente'

  const templateBase = assuntoTemplate || ASSUNTO_RGE_ORIGINAL
  return resolverPlaceholdersContasRGE(templateBase, {
    numeroUc: ucFormatada,
    enderecoUc: '',
    nomeCliente: clienteFormatado,
    documentoCliente: '',
    nomeResponsavel: '',
  })
}

/**
 * Converte texto simples do corpo da mensagem com quebras de linha em HTML com estilo profissional
 */
export function converterTextoEmHtmlContasRGE(
  textoCorpo: string,
  responsavelNome: string,
  responsavelCargo: string,
  telefoneDelfos = DELFOS_TELEFONE_PADRAO,
  emailDelfos = DELFOS_EMAIL_PADRAO,
): string {
  // Se o texto já for um documento HTML completo, retorna ele diretamente
  if (
    textoCorpo.includes('<html') ||
    textoCorpo.includes('<body') ||
    textoCorpo.includes('<!DOCTYPE')
  ) {
    return textoCorpo
  }

  // Se já tiver tags HTML formatadas como divs/parágrafos, envelopa na casca estilizada
  const temTagsHtml = /<(p|div|br|span|strong|table|h[1-6])/i.test(textoCorpo)

  let corpoConteudoHtml = ''
  if (temTagsHtml) {
    corpoConteudoHtml = textoCorpo
  } else {
    // Quebra parágrafos por linhas duplas ou simples
    const blocos = textoCorpo.split(/\n{2,}/)
    corpoConteudoHtml = blocos
      .map((bloco) => {
        const linhas = bloco
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .join('<br>')
        return `<p style="margin: 0 0 16px 0; line-height: 1.6;">${linhas}</p>`
      })
      .join('\n')
  }

  const responsavel = responsavelNome ? responsavelNome.trim() : 'Delfos Engenharia'
  const cargo = responsavelCargo ? responsavelCargo.trim() : 'Responsável Técnico'
  const tel = telefoneDelfos ? telefoneDelfos.trim() : DELFOS_TELEFONE_PADRAO
  const mail = emailDelfos ? emailDelfos.trim() : DELFOS_EMAIL_PADRAO

  // Verifica se o texto já incluiu assinatura própria
  const jaTemAssinatura =
    /delfos engenharia/i.test(textoCorpo) || /atenciosamente/i.test(textoCorpo)

  const blocoAssinatura = jaTemAssinatura
    ? ''
    : `
    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; color: #374151;">
      <p style="margin: 2px 0;">Atenciosamente,</p>
      <p style="margin: 4px 0; font-weight: bold; color: #111827;">${responsavel}</p>
      <p style="margin: 2px 0; color: #4b5563;">${cargo}</p>
      <p style="margin: 2px 0; font-weight: 600; color: #0284c7;">Delfos Engenharia Ltda</p>
      <p style="margin: 2px 0; color: #6b7280; font-size: 13px;">${tel} | ${mail}</p>
      <p style="margin: 4px 0;">
        <a href="https://www.delfosengenharia.com.br" style="color: #0284c7; text-decoration: none; font-size: 13px;">www.delfosengenharia.com.br</a>
      </p>
    </div>`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Solicitação de Faturas de Energia</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; margin: 0; padding: 24px; background-color: #f9fafb;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
    ${corpoConteudoHtml}
    ${blocoAssinatura}
  </div>
</body>
</html>`
}

/**
 * Gera o corpo HTML no padrão exato solicitado pelo usuário
 */
export function gerarCorpoHtmlContasRGE(
  params: TemplateContasRGEParams,
  corpoCustomizadoTemplate?: string,
): string {
  const uc = params.numeroUc ? params.numeroUc.trim() : '_____'
  const endereco = params.enderecoUc ? params.enderecoUc.trim() : '_____'
  const nome = params.nomeCliente ? params.nomeCliente.trim() : '_____'
  const documento = params.documentoCliente ? params.documentoCliente.trim() : '_____'
  const responsavel = params.nomeResponsavel ? params.nomeResponsavel.trim() : 'Delfos Engenharia'
  const cargo = params.cargoResponsavel ? params.cargoResponsavel.trim() : 'Responsável Técnico'
  const telefone = params.telefoneDelfos ? params.telefoneDelfos.trim() : DELFOS_TELEFONE_PADRAO
  const email = params.emailDelfos ? params.emailDelfos.trim() : DELFOS_EMAIL_PADRAO

  // Se um template de texto customizado foi fornecido, resolve os placeholders e converte em HTML
  if (corpoCustomizadoTemplate) {
    const textoResolvido = resolverPlaceholdersContasRGE(corpoCustomizadoTemplate, params)
    return converterTextoEmHtmlContasRGE(textoResolvido, responsavel, cargo, telefone, email)
  }

  // Template HTML fixo original
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Solicitação de Faturas de Energia</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937; margin: 0; padding: 24px; background-color: #f9fafb;">
  <div style="max-width: 620px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
    <p style="margin-top: 0; margin-bottom: 16px;">Prezados,</p>

    <p style="margin-bottom: 16px;">
      Venho por meio deste solicitar o envio das faturas/contas de energia elétrica dos últimos 5 (cinco) anos, referentes à Unidade Consumidora de número <strong>${uc}</strong>, localizada em <strong>${endereco}</strong>.
    </p>

    <p style="margin-bottom: 8px;">Os dados do titular/consumidor são:</p>
    <div style="background-color: #f3f4f6; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px;">
      <p style="margin: 4px 0;"><strong>Nome:</strong> ${nome}</p>
      <p style="margin: 4px 0;"><strong>CPF/CNPJ:</strong> ${documento}</p>
      <p style="margin: 4px 0;"><strong>Endereço:</strong> ${endereco}</p>
    </div>

    <p style="margin-bottom: 16px;">
      Segue em anexo a procuração/autorização e demais documentos necessários para a solicitação.
    </p>

    <p style="margin-bottom: 24px;">
      Desde já, agradeço a atenção e coloco-me à disposição para quaisquer esclarecimentos.
    </p>

    <div style="border-top: 1px solid #e5e7eb; padding-top: 16px; margin-top: 24px; color: #374151;">
      <p style="margin: 2px 0;">Atenciosamente,</p>
      <p style="margin: 4px 0; font-weight: bold; color: #111827;">${responsavel}</p>
      <p style="margin: 2px 0; color: #4b5563;">${cargo}</p>
      <p style="margin: 2px 0; font-weight: 600; color: #0284c7;">Delfos Engenharia Ltda</p>
      <p style="margin: 2px 0; color: #6b7280; font-size: 13px;">${telefone} | ${email}</p>
      <p style="margin: 4px 0;">
        <a href="https://www.delfosengenharia.com.br" style="color: #0284c7; text-decoration: none; font-size: 13px;">www.delfosengenharia.com.br</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Converte arquivo do navegador (File) para base64 limpo (sem cabeçalho data:...)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove o prefixo data:*/*;base64,
      const base64Clean = result.split(',')[1] || result
      resolve(base64Clean)
    }
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })
}

// -------------------------------------------------------------
// Persistência do Template Padrão no PocketBase (whatsapp_templates)
// -------------------------------------------------------------

export interface TemplatePadraoContasRGE {
  id?: string
  assunto: string
  corpo: string
  isCustomizado: boolean
  updated?: string
}

/**
 * Busca a mensagem padrão configurada no PocketBase.
 * Se não existir registro no banco ou der erro, retorna o template oficial do código.
 */
export async function carregarTemplatePadraoContasRGE(): Promise<TemplatePadraoContasRGE> {
  try {
    const records = await pb.collection('whatsapp_templates').getFullList({
      filter: `slug = '${RGE_TEMPLATE_SLUG}'`,
      limit: 1,
      requestKey: null,
    })

    if (records && records.length > 0) {
      const r = records[0]
      const assuntoSalvo = r.titulo || ASSUNTO_RGE_ORIGINAL
      const corpoSalvo = r.conteudo || CORPO_TEXTO_RGE_ORIGINAL
      const isCustom =
        assuntoSalvo.trim() !== ASSUNTO_RGE_ORIGINAL.trim() ||
        corpoSalvo.trim() !== CORPO_TEXTO_RGE_ORIGINAL.trim()

      return {
        id: r.id,
        assunto: assuntoSalvo,
        corpo: corpoSalvo,
        isCustomizado: isCustom,
        updated: r.updated,
      }
    }
  } catch (err) {
    console.warn('Não foi possível carregar template do banco; usando padrão do código:', err)
  }

  return {
    assunto: ASSUNTO_RGE_ORIGINAL,
    corpo: CORPO_TEXTO_RGE_ORIGINAL,
    isCustomizado: false,
  }
}

/**
 * Salva a nova mensagem padrão (assunto e corpo com placeholders) no PocketBase.
 */
export async function salvarTemplatePadraoContasRGE(
  assunto: string,
  corpo: string,
): Promise<TemplatePadraoContasRGE> {
  const dados = {
    titulo: assunto.trim() || ASSUNTO_RGE_ORIGINAL,
    slug: RGE_TEMPLATE_SLUG,
    conteudo: corpo.trim() || CORPO_TEXTO_RGE_ORIGINAL,
    tipo_gatilho: 'email_concessionaria',
    categoria: 'Concessionária / RGE',
    ativo: true,
    variaveis_disponiveis: RGE_PLACEHOLDERS.map((p) => p.tag.replace(/[[\]]/g, '')),
  }

  try {
    const records = await pb.collection('whatsapp_templates').getFullList({
      filter: `slug = '${RGE_TEMPLATE_SLUG}'`,
      limit: 1,
      requestKey: null,
    })

    if (records && records.length > 0) {
      const updatedRec = await pb.collection('whatsapp_templates').update(records[0].id, dados)
      return {
        id: updatedRec.id,
        assunto: updatedRec.titulo,
        corpo: updatedRec.conteudo,
        isCustomizado: true,
        updated: updatedRec.updated,
      }
    } else {
      const createdRec = await pb.collection('whatsapp_templates').create(dados)
      return {
        id: createdRec.id,
        assunto: createdRec.titulo,
        corpo: createdRec.conteudo,
        isCustomizado: true,
        updated: createdRec.updated,
      }
    }
  } catch (err) {
    console.error('Erro ao salvar template padrão RGE no PocketBase:', err)
    throw err
  }
}

/**
 * Restaura a mensagem original do código no PocketBase
 */
export async function restaurarTemplatePadraoContasRGE(): Promise<TemplatePadraoContasRGE> {
  try {
    const records = await pb.collection('whatsapp_templates').getFullList({
      filter: `slug = '${RGE_TEMPLATE_SLUG}'`,
      limit: 1,
      requestKey: null,
    })

    if (records && records.length > 0) {
      const updatedRec = await pb.collection('whatsapp_templates').update(records[0].id, {
        titulo: ASSUNTO_RGE_ORIGINAL,
        conteudo: CORPO_TEXTO_RGE_ORIGINAL,
        ativo: true,
      })
      return {
        id: updatedRec.id,
        assunto: ASSUNTO_RGE_ORIGINAL,
        corpo: CORPO_TEXTO_RGE_ORIGINAL,
        isCustomizado: false,
        updated: updatedRec.updated,
      }
    }
  } catch (err) {
    console.warn('Erro ao restaurar template no banco:', err)
  }

  return {
    assunto: ASSUNTO_RGE_ORIGINAL,
    corpo: CORPO_TEXTO_RGE_ORIGINAL,
    isCustomizado: false,
  }
}

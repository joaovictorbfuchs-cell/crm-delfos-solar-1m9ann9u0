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

export const EMAIL_RGE_PADRAO = 'atendimento-rs@cpfl.com.br'
export const DELFOS_TELEFONE_PADRAO = '(54) 99646-8910'
export const DELFOS_EMAIL_PADRAO = 'delfos.usinas@gmail.com'

/**
 * Gera o assunto padrão exigido pela concessionária:
 * Solicitação de faturas de energia — UC [número da UC] — [nome do cliente]
 */
export function gerarAssuntoContasRGE(numeroUc: string, nomeCliente: string): string {
  const ucFormatada = numeroUc ? numeroUc.trim() : 'UC'
  const clienteFormatado = nomeCliente ? nomeCliente.trim() : 'Cliente'
  return `Solicitação de faturas de energia — UC ${ucFormatada} — ${clienteFormatado}`
}

/**
 * Gera o corpo HTML no padrão exato solicitado pelo usuário
 */
export function gerarCorpoHtmlContasRGE(params: TemplateContasRGEParams): string {
  const uc = params.numeroUc ? params.numeroUc.trim() : '_____'
  const endereco = params.enderecoUc ? params.enderecoUc.trim() : '_____'
  const nome = params.nomeCliente ? params.nomeCliente.trim() : '_____'
  const documento = params.documentoCliente ? params.documentoCliente.trim() : '_____'
  const responsavel = params.nomeResponsavel ? params.nomeResponsavel.trim() : 'Delfos Engenharia'
  const cargo = params.cargoResponsavel ? params.cargoResponsavel.trim() : 'Responsável Técnico'
  const telefone = params.telefoneDelfos ? params.telefoneDelfos.trim() : DELFOS_TELEFONE_PADRAO
  const email = params.emailDelfos ? params.emailDelfos.trim() : DELFOS_EMAIL_PADRAO

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

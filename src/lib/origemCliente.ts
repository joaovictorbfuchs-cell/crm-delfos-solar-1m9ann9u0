import { Cliente } from '@/types/crm'

export type OrigemClienteTipo =
  | 'conta_azul'
  | 'pipedrive'
  | 'pipedrive_conta_azul'
  | 'planilha'
  | 'instagram'
  | 'indicacao'
  | 'google'
  | 'whatsapp'
  | 'facebook'
  | 'site'
  | 'manual'

export interface OrigemClienteInfo {
  tipo: OrigemClienteTipo
  label: string
  sublabel?: string
  badgeVariant:
    | 'conta_azul'
    | 'pipedrive'
    | 'mesclado'
    | 'planilha'
    | 'instagram'
    | 'indicacao'
    | 'google'
    | 'whatsapp'
    | 'facebook'
    | 'site'
    | 'manual'
  iconeCor: string
}

/**
 * Determina com precisão a origem do cliente a partir de:
 * 1. `dados_importados.origem_integracao` (ex.: "Pipedrive + Conta Azul (Mesclado)")
 * 2. `como_conheceu` (ex.: "Conta Azul", "Pipedrive", "Planilha")
 * 3. `observacoes` (ex.: "Importado de: Conta Azul", "Importado do Pipedrive CRM", "Importado via Planilha")
 * 4. `dados_importados` (se tiver chaves do Conta Azul ou Pipedrive)
 * 5. `origem_lead` (ex.: "Conta Azul", "Pipedrive", "Planilha")
 * 6. Caso contrário -> "Cadastro Manual"
 */
export function identificarOrigemCliente(
  cliente: Partial<Cliente> | null | undefined,
): OrigemClienteInfo {
  if (!cliente) {
    return {
      tipo: 'manual',
      label: 'Manual',
      badgeVariant: 'manual',
      iconeCor: 'text-gray-500',
    }
  }

  const comoConheceu = (cliente.como_conheceu || '').toLowerCase()
  const observacoes = (cliente.observacoes || '').toLowerCase()
  const origemLead = (cliente.origem_lead || '').toLowerCase()
  const dadosImportados = cliente.dados_importados

  let dadosOrigemIntegracao = ''
  let temDadosImportados = false
  let chavesImportadas: string[] = []

  if (dadosImportados && typeof dadosImportados === 'object') {
    temDadosImportados = Object.keys(dadosImportados).length > 0
    chavesImportadas = Object.keys(dadosImportados)
    if (typeof (dadosImportados as any).origem_integracao === 'string') {
      dadosOrigemIntegracao = (dadosImportados as any).origem_integracao.toLowerCase()
    }
  }

  // 1. Caso Mesclado (Pipedrive + Conta Azul)
  if (
    dadosOrigemIntegracao.includes('mesclado') ||
    (observacoes.includes('pipedrive') &&
      (observacoes.includes('conta azul') || comoConheceu.includes('conta azul'))) ||
    (comoConheceu.includes('pipedrive') && comoConheceu.includes('conta azul'))
  ) {
    return {
      tipo: 'pipedrive_conta_azul',
      label: 'Pipedrive + Conta Azul',
      sublabel: 'Mesclado',
      badgeVariant: 'mesclado',
      iconeCor: 'text-purple-600',
    }
  }

  // 2. Conta Azul
  if (
    dadosOrigemIntegracao.includes('conta azul') ||
    comoConheceu.includes('conta azul') ||
    observacoes.includes('conta azul') ||
    origemLead === 'conta azul' ||
    chavesImportadas.some((k) => {
      const kl = k.toLowerCase()
      return kl.includes('conta azul') || kl === 'data de cadastro' || kl === 'razão social / nome'
    })
  ) {
    return {
      tipo: 'conta_azul',
      label: 'Conta Azul',
      sublabel: 'Importado',
      badgeVariant: 'conta_azul',
      iconeCor: 'text-blue-600',
    }
  }

  // 3. Pipedrive
  if (
    dadosOrigemIntegracao.includes('pipedrive') ||
    comoConheceu.includes('pipedrive') ||
    observacoes.includes('pipedrive') ||
    origemLead === 'pipedrive' ||
    chavesImportadas.some((k) => {
      const kl = k.toLowerCase()
      return (
        kl.includes('pipedrive') ||
        kl.includes('próxima atividade em') ||
        kl.includes('de endereço')
      )
    })
  ) {
    return {
      tipo: 'pipedrive',
      label: 'Pipedrive',
      sublabel: 'CRM',
      badgeVariant: 'pipedrive',
      iconeCor: 'text-emerald-700',
    }
  }

  // 4. Planilha genérica
  if (
    comoConheceu.includes('planilha') ||
    observacoes.includes('planilha') ||
    origemLead === 'planilha' ||
    temDadosImportados
  ) {
    return {
      tipo: 'planilha',
      label: 'Planilha',
      sublabel: 'Excel / CSV',
      badgeVariant: 'planilha',
      iconeCor: 'text-teal-600',
    }
  }

  // 5. Canais diretos de Marketing / Vendas (Instagram, Indicação, Google, WhatsApp, Facebook, Site)
  if (origemLead === 'instagram' || comoConheceu.includes('instagram')) {
    return {
      tipo: 'instagram',
      label: 'Instagram',
      sublabel: 'Canal',
      badgeVariant: 'instagram',
      iconeCor: 'text-pink-600',
    }
  }

  if (
    origemLead === 'indicação' ||
    origemLead === 'indicacao' ||
    comoConheceu.includes('indicação') ||
    comoConheceu.includes('indicacao')
  ) {
    return {
      tipo: 'indicacao',
      label: 'Indicação',
      sublabel: 'Canal',
      badgeVariant: 'indicacao',
      iconeCor: 'text-emerald-700',
    }
  }

  if (origemLead === 'google' || comoConheceu.includes('google')) {
    return {
      tipo: 'google',
      label: 'Google',
      sublabel: 'Canal',
      badgeVariant: 'google',
      iconeCor: 'text-blue-600',
    }
  }

  if (origemLead === 'whatsapp' || comoConheceu.includes('whatsapp')) {
    return {
      tipo: 'whatsapp',
      label: 'WhatsApp',
      sublabel: 'Canal',
      badgeVariant: 'whatsapp',
      iconeCor: 'text-emerald-800',
    }
  }

  if (origemLead === 'facebook' || comoConheceu.includes('facebook')) {
    return {
      tipo: 'facebook',
      label: 'Facebook',
      sublabel: 'Canal',
      badgeVariant: 'facebook',
      iconeCor: 'text-blue-700',
    }
  }

  if (origemLead === 'site' || comoConheceu.includes('site')) {
    return {
      tipo: 'site',
      label: 'Site',
      sublabel: 'Canal',
      badgeVariant: 'site',
      iconeCor: 'text-sky-600',
    }
  }

  // 6. Cadastro Manual / Direto
  return {
    tipo: 'manual',
    label: 'Manual',
    sublabel:
      cliente.origem_lead && (cliente.origem_lead as string).toLowerCase() !== 'outro'
        ? cliente.origem_lead
        : 'Cadastro no CRM',
    badgeVariant: 'manual',
    iconeCor: 'text-gray-500',
  }
}

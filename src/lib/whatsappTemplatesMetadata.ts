/**
 * Definições oficiais e metadados das variáveis e templates de WhatsApp do CRM Delfos Solar.
 *
 * Mapeia apenas as variáveis reais que os hooks e serviços do CRM realmente substituem:
 * - Operacional (Auto Leitura RGE): {nome_cliente}, {usina}, {numero_uc}, {endereco} (e campos opcionais da atividade)
 * - Operacional (Notificação de OS): {nome_cliente}, {tipo_servico}, {endereco}, {data_agendada}, {nome_instalador}, {id_os}
 * - Comercial (Confirmação de Proposta): {nome_cliente}, {valor_proposta}, {endereco}, {data}
 * - Atendimento (Lembrete de Visita): {nome_cliente}, {data}, {endereco}
 * - Pós-Vendas (Follow-up): {nome_cliente}, {endereco}, {data}
 */

export interface VariavelTemplateInfo {
  nome: string
  label: string
  descricao: string
  exemplo: string
}

export const VARIAVEIS_WHATSAPP_SISTEMA: Record<string, VariavelTemplateInfo> = {
  nome_cliente: {
    nome: 'nome_cliente',
    label: 'Nome do Cliente',
    descricao: 'Nome completo ou razão social do cliente vinculado.',
    exemplo: 'Carlos Alberto Mendes',
  },
  usina: {
    nome: 'usina',
    label: 'Nome da Usina',
    descricao: 'Nome da usina ou unidade fotovoltaica do cliente.',
    exemplo: 'Usina Solar Fazenda Progresso',
  },
  numero_uc: {
    nome: 'numero_uc',
    label: 'Número da Instalação / UC',
    descricao: 'Código da Unidade Consumidora na concessionária (RGE).',
    exemplo: '7001458923',
  },
  endereco: {
    nome: 'endereco',
    label: 'Endereço Completo',
    descricao: 'Logradouro, número, bairro e cidade da instalação/imóvel.',
    exemplo: 'Rua das Camélias, 350 - Erechim/RS',
  },
  tipo_servico: {
    nome: 'tipo_servico',
    label: 'Tipo de Serviço (OS)',
    descricao: 'Descrição do tipo de ordem de serviço agendada.',
    exemplo: 'Manutenção Preventiva Semestral',
  },
  data_agendada: {
    nome: 'data_agendada',
    label: 'Data Agendada',
    descricao: 'Data prevista para execução da OS em campo (DD/MM/AAAA).',
    exemplo: '28/09/2026',
  },
  nome_instalador: {
    nome: 'nome_instalador',
    label: 'Nome do Instalador / Técnico',
    descricao: 'Nome do profissional técnico responsável pela ordem.',
    exemplo: 'Carlos Mendes',
  },
  id_os: {
    nome: 'id_os',
    label: 'ID da Ordem de Serviço',
    descricao: 'Identificador único do registro da OS no CRM.',
    exemplo: 'OS-2026-089',
  },
  valor_proposta: {
    nome: 'valor_proposta',
    label: 'Valor da Proposta',
    descricao: 'Investimento total formatado em moeda brasileira.',
    exemplo: 'R$ 38.500,00',
  },
  data: {
    nome: 'data',
    label: 'Data do Evento / Envio',
    descricao: 'Data de realização da visita ou data atual formatada.',
    exemplo: '26/09/2026 às 14:00',
  },
  // Variáveis adicionais de apoio operacional e orçamentos
  data_leitura: {
    nome: 'data_leitura',
    label: 'Data da Leitura RGE',
    descricao: 'Data programada pela distribuidora para leitura do medidor.',
    exemplo: '29/09/2026',
  },
  protocolo_rge: {
    nome: 'protocolo_rge',
    label: 'Protocolo RGE',
    descricao: 'Código de protocolo gerado junto à distribuidora de energia.',
    exemplo: '2026-RGE-9812457',
  },
  responsavel: {
    nome: 'responsavel',
    label: 'Responsável',
    descricao: 'Nome do atendente, consultor ou responsável interno.',
    exemplo: 'João Victor',
  },
  titulo: {
    nome: 'titulo',
    label: 'Título da Atividade',
    descricao: 'Título ou assunto da atividade vinculada.',
    exemplo: 'Auto Leitura RGE - Ciclo Setembro/2026',
  },
}

export type CategoriaTemplate = 'Operacional' | 'Comercial' | 'Atendimento' | 'Pós-Vendas' | 'Geral'

export interface UsoFluxoInfo {
  identificador: string
  tituloUso: string
  descricaoUso: string
  tipoFluxo: 'sistema_bloqueado' | 'personalizavel'
  origemEnvio: 'Manual & Automático' | 'Disparo Automático' | 'Envio Manual'
  categoriaSugerida: CategoriaTemplate
  slugPadrao: string
  variaveisRecomendadas: string[]
}

/**
 * Mapeamento dos usos e fluxos internos que dependem de templates de WhatsApp.
 */
export const USOS_FLUXOS_WHATSAPP: Record<string, UsoFluxoInfo> = {
  lembrete_auto_leitura_rge: {
    identificador: 'lembrete_auto_leitura_rge',
    tituloUso: 'Lembrete de Auto Leitura RGE',
    descricaoUso:
      'Utilizado no botão "Enviar lembrete WhatsApp" do modal e listagem de Auto Leitura RGE e no webhook operacional.',
    tipoFluxo: 'sistema_bloqueado',
    origemEnvio: 'Envio Manual',
    categoriaSugerida: 'Operacional',
    slugPadrao: 'lembrete_auto_leitura_rge',
    variaveisRecomendadas: ['nome_cliente', 'usina', 'numero_uc', 'endereco', 'data_leitura'],
  },
  os_atribuida_instalador: {
    identificador: 'os_atribuida_instalador',
    tituloUso: 'Notificação de OS para Técnico',
    descricaoUso:
      'Utilizado no botão "Enviar OS por WhatsApp" e nos disparos automáticos ao atribuir instalador à Ordem de Serviço.',
    tipoFluxo: 'sistema_bloqueado',
    origemEnvio: 'Manual & Automático',
    categoriaSugerida: 'Operacional',
    slugPadrao: 'os_atribuida_instalador',
    variaveisRecomendadas: [
      'nome_cliente',
      'tipo_servico',
      'endereco',
      'data_agendada',
      'nome_instalador',
      'id_os',
    ],
  },
  confirmacao_proposta: {
    identificador: 'confirmacao_proposta',
    tituloUso: 'Confirmação de Proposta',
    descricaoUso:
      'Disparado automaticamente pelo hook de backend quando o status do orçamento solar é alterado para "Aprovado".',
    tipoFluxo: 'sistema_bloqueado',
    origemEnvio: 'Disparo Automático',
    categoriaSugerida: 'Comercial',
    slugPadrao: 'confirmacao_proposta',
    variaveisRecomendadas: ['nome_cliente', 'valor_proposta', 'endereco', 'data'],
  },
  lembrete_visita_tecnica: {
    identificador: 'lembrete_visita_tecnica',
    tituloUso: 'Lembrete de Visita Técnica',
    descricaoUso:
      'Disparado pelo cron a cada 2 minutos checando visitas técnicas agendadas para o dia seguinte (+24h).',
    tipoFluxo: 'sistema_bloqueado',
    origemEnvio: 'Disparo Automático',
    categoriaSugerida: 'Atendimento',
    slugPadrao: 'lembrete_visita_tecnica',
    variaveisRecomendadas: ['nome_cliente', 'data', 'endereco'],
  },
  followup_pos_venda: {
    identificador: 'followup_pos_venda',
    tituloUso: 'Follow-up de Pós-Venda',
    descricaoUso:
      'Disparado pelo worker de automação para clientes com instalação concluída há mais de 7 dias.',
    tipoFluxo: 'sistema_bloqueado',
    origemEnvio: 'Disparo Automático',
    categoriaSugerida: 'Pós-Vendas',
    slugPadrao: 'followup_pos_venda',
    variaveisRecomendadas: ['nome_cliente', 'endereco', 'data'],
  },
}

/**
 * Identifica o uso e dependência do sistema pelo slug ou id do template
 */
export function getFluxoDoTemplate(slug?: string | null): UsoFluxoInfo | null {
  if (!slug) return null
  const slugNormalizado = slug.toLowerCase().trim()
  if (USOS_FLUXOS_WHATSAPP[slugNormalizado]) {
    return USOS_FLUXOS_WHATSAPP[slugNormalizado]
  }
  // Correspondência parcial
  if (slugNormalizado.includes('auto_leitura') || slugNormalizado.includes('autoleitura')) {
    return USOS_FLUXOS_WHATSAPP['lembrete_auto_leitura_rge']
  }
  if (slugNormalizado.includes('os_atribuida') || slugNormalizado.includes('notificacao_os')) {
    return USOS_FLUXOS_WHATSAPP['os_atribuida_instalador']
  }
  if (slugNormalizado.includes('proposta') || slugNormalizado.includes('confirmacao')) {
    return USOS_FLUXOS_WHATSAPP['confirmacao_proposta']
  }
  if (slugNormalizado.includes('visita')) {
    return USOS_FLUXOS_WHATSAPP['lembrete_visita_tecnica']
  }
  if (slugNormalizado.includes('followup') || slugNormalizado.includes('pos_venda')) {
    return USOS_FLUXOS_WHATSAPP['followup_pos_venda']
  }
  return null
}

/**
 * Extrai lista de variáveis disponíveis a partir de variaveis_disponiveis (seja array ou json string)
 * ou detectando do próprio conteúdo textual {{variavel}} ou {variavel}
 */
export function extrairVariaveisTemplate(
  variaveisDisponiveis?: string[] | string | null,
  conteudo?: string,
): string[] {
  const result = new Set<string>()

  // 1. Processar variaveis_disponiveis se fornecido
  if (Array.isArray(variaveisDisponiveis)) {
    variaveisDisponiveis.forEach((v) => {
      if (typeof v === 'string' && v.trim()) result.add(v.trim())
    })
  } else if (typeof variaveisDisponiveis === 'string' && variaveisDisponiveis.trim()) {
    try {
      const parsed = JSON.parse(variaveisDisponiveis)
      if (Array.isArray(parsed)) {
        parsed.forEach((v) => {
          if (typeof v === 'string' && v.trim()) result.add(v.trim())
        })
      }
    } catch (_) {
      // Se for string separada por vírgula
      variaveisDisponiveis.split(',').forEach((v) => {
        const t = v.trim()
        if (t) result.add(t)
      })
    }
  }

  // 2. Extrair variáveis presentes no conteúdo: {{chave}} ou {chave}
  if (conteudo) {
    const regex = /\{+([a-zA-Z0-9_]+)\}+/g
    let match: RegExpExecArray | null
    while ((match = regex.exec(conteudo)) !== null) {
      if (match[1]) {
        result.add(match[1].trim())
      }
    }
  }

  return Array.from(result)
}

/**
 * Renderiza um preview de mensagem substituindo variáveis {chave} ou {{chave}}
 * por valores de exemplo reais e bem formatados do CRM Delfos Solar.
 */
export function renderizarPreviewTemplate(
  conteudo: string,
  valoresExemploCustom?: Record<string, string>,
): string {
  if (!conteudo) return ''

  let resultado = conteudo

  // Mesclar com defaults conhecidos
  const valores: Record<string, string> = {
    nome_cliente: 'Carlos Alberto Mendes',
    usina: 'Usina Solar Fazenda Progresso',
    numero_uc: '7001458923',
    endereco: 'Rua das Camélias, 350 - Centro, Erechim/RS',
    tipo_servico: 'Manutenção Preventiva Semestral',
    data_agendada: '28/09/2026',
    nome_instalador: 'Carlos Mendes',
    id_os: 'OS-2026-089',
    valor_proposta: 'R$ 38.500,00',
    data: '26/09/2026 às 14:00',
    data_leitura: '29/09/2026',
    protocolo_rge: '2026-RGE-9812457',
    responsavel: 'João Victor',
    titulo: 'Auto Leitura RGE - Ciclo Setembro/2026',
    cliente_nome: 'Carlos Alberto Mendes',
    empresa_nome: 'Delfos Solar',
    ...valoresExemploCustom,
  }

  Object.entries(valores).forEach(([chave, val]) => {
    resultado = resultado.replace(new RegExp(`\\{\\{${chave}\\}\\}`, 'gi'), val)
    resultado = resultado.replace(new RegExp(`\\{${chave}\\}`, 'gi'), val)
  })

  // Se restaram placeholders desconhecidos {algo} ou {{algo}}, preencher amigavelmente
  resultado = resultado.replace(/\{+([a-zA-Z0-9_]+)\}+/g, '[$1]')

  return resultado
}

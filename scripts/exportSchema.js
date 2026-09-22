import fs from 'fs'
import path from 'path'
import { buildXlsx } from './xlsxBuilder.js'

// Carrega o schema estruturado do PocketBase
const schemaPath = path.resolve('src/lib/pocketbase/schema.json')
const rawSchema = fs.readFileSync(schemaPath, 'utf8')
const schema = JSON.parse(rawSchema)

const collections = schema.collections || []

// Descrições amigáveis e claras para cada coleção do CRM Delfos Solar
const COLLECTION_DESCRIPTIONS = {
  users:
    'Usuários do sistema com autenticação, perfis (admin/instalador), telefone e status de atividade.',
  clientes:
    'Cadastro central de leads e clientes (PF/PJ), status no funil solar, dados de consumo, endereço e contatos.',
  manutencoes:
    'Histórico e agendamentos de manutenções preventivas e corretivas, limpeza e revisão elétrica.',
  atividades:
    'Linha do tempo de interações, ligações, reuniões, visitas técnicas, follow-ups e auto-leituras da distribuidora.',
  sistemas:
    'Especificações técnicas das usinas instaladas: inversores, módulos fotovoltaicos, padrão de entrada e telhado.',
  profissionais:
    'Equipe técnica interna e parceiros instaladores com especialidades (elétrica, instalação, almoxarifado).',
  projetos: 'Gestão de etapas de engenharia, compras e instalação dos projetos fotovoltaicos.',
  projeto_eventos:
    'Histórico de transições de etapas e registros de eventos dos projetos de engenharia.',
  contratos_om:
    'Contratos de Operação e Manutenção (O&M), planos (Essencial, Prevenção, Completo), vigência e valores.',
  anomalias_om:
    'Registro de falhas técnicas, alertas e anomalias identificadas nas usinas monitoradas.',
  servicos_adicionais_om:
    'Serviços complementares aos contratos de O&M (termografia, testes de inversor, manutenções).',
  timeline_om:
    'Histórico cronológico unificado de atendimentos, anomalias e vistorias de O&M do cliente.',
  propostas_om:
    'Propostas comerciais de contratos de Operação e Manutenção com cálculo de perdas e valores.',
  orcamentos_solar:
    'Dimensionamento fotovoltaico, composição detalhada de custos, financiamento e propostas comerciais solares.',
  whatsapp_templates:
    'Modelos de mensagens e notificações automáticas padronizadas para envio via WhatsApp.',
  whatsapp_mensagens:
    'Fila e histórico de mensagens enviadas e recebidas via gateway WhatsApp (Z-API/Evolution).',
  whatsapp_conversas:
    'Sessões de atendimento e chats do WhatsApp vinculados a clientes e atendentes.',
  outros_contatos: 'Contatos adicionais avulsos (fornecedores, parceiros, terceiros) do WhatsApp.',
  fornecedores:
    'Cadastro de distribuidores de equipamentos solares, fabricantes e parceiros comerciais.',
  fornecedores_orcamentos:
    'Cotações de kits fotovoltaicos e orçamentos recebidos de fornecedores com arquivos e itens.',
  atividades_setor: 'Categorização de setores operacionais para agrupamento de atividades.',
  servicos_avulsos:
    'Registro e faturamento de serviços técnicos avulsos prestados fora de contrato.',
  transferencias_creditos:
    'Solicitações e homologação de transferências de créditos de energia solar entre UCs.',
  documentos_cliente:
    'Contratos, procurações, anexos de homologação da concessionária e controle de assinaturas.',
  tipos_atividades_custom:
    'Catálogo configurável de tipos de atividades do CRM, com categoria, ícone e frequências.',
  os_templates: 'Modelos padronizados de instruções e checklists para Ordens de Serviço (OS).',
  ordens_servico:
    'Ordens de serviço de campo com checklists técnicos, fotos de execução e atribuição a profissionais.',
  monitoramento_marcas:
    'Parâmetros de integração e padrões de acesso para marcas de inversores e portais de monitoramento.',
  cliente_inversores:
    'Múltiplos inversores instalados por cliente com números de série e credenciais de monitoramento.',
  usinas:
    'Usinas fotovoltaicas cadastradas por cliente com geolocalização, dados da UC e vínculo contratual.',
  contatos_adicionais: 'Contatos secundários de clientes (cônjuges, sócios, gerentes, contadores).',
  instalacoes_galeria:
    'Galeria fotográfica de instalações e usinas realizadas pela Delfos Solar para uso em propostas.',
  projecao_tarifaria:
    'Série histórica e premissas de projeção tarifária (Fio B, FS, inflação energética a 25 anos).',
  equipamentos:
    'Catálogo de inversores e módulos fotovoltaicos homologados com fichas técnicas e garantias.',
  parametros_tarifarios:
    'Parâmetros anuais de tarifas homologadas pela distribuidora (RGE/outras) para simulações.',
  automacoes:
    'Regras de automação de processos internos (gatilhos de mudança de status, lembretes e envios).',
  automacoes_execucoes:
    'Log de execuções das regras automáticas com resultados de sucesso ou falha.',
  notificacoes_internas:
    'Notificações do sistema para a equipe sobre prazos, atividades atrasadas e lembretes.',
}

export function generateSchemaWorkbookData() {
  // 1. Aba "Resumo"
  // Colunas: N° | Coleção | Tipo | Descrição | Qtd. de Campos | Chaves Estrangeiras (FKs) | Índices
  const resumoHeaders = [
    'N°',
    'Coleção',
    'Tipo PocketBase',
    'Descrição Funcional',
    'Qtd. Campos',
    'Qtd. Relações (FKs)',
    'Regras de Acesso (RLS)',
  ]

  const resumoRows = [resumoHeaders]

  // 2. Aba "Campos"
  // Colunas: Coleção | Campo | Tipo | Obrigatório | Opções / Valores | Relação / FK | Regras / Triggers | Nota
  const camposHeaders = [
    'Coleção',
    'Nome do Campo',
    'Tipo de Dado',
    'Obrigatório',
    'Opções / Valores (Select)',
    'Relação / FK (Coleção Destino)',
    'Triggers / Configurações',
    'Nota',
  ]
  const camposRows = [camposHeaders]

  // 3. Aba "Chaves Estrangeiras"
  // Colunas: Coleção de Origem | Campo FK | Coleção de Destino | Obrigatório | Cascade Delete | Descrição do Vínculo
  const fksHeaders = [
    'Coleção de Origem',
    'Campo FK',
    'Coleção Referenciada (Destino)',
    'Obrigatório',
    'Cascade Delete',
    'Finalidade da Relação',
  ]
  const fksRows = [fksHeaders]

  let totalCamposGeral = 0
  let totalFKsGeral = 0

  collections.forEach((col, cIdx) => {
    const colName = col.name
    const colType = col.type || 'base'
    const desc = COLLECTION_DESCRIPTIONS[colName] || 'Coleção de dados do sistema.'
    const fields = col.fields || []

    let fkCount = 0

    fields.forEach((field) => {
      totalCamposGeral++
      const fName = field.name
      const fType = field.type
      const isReq = field.required ? 'Sim' : 'Não'

      let opcoes = ''
      if (fType === 'select' && Array.isArray(field.selectValues)) {
        opcoes = field.selectValues.join(' | ')
      } else if (fType === 'bool') {
        opcoes = 'true / false'
      }

      let fkDestino = ''
      if (fType === 'relation') {
        fkCount++
        totalFKsGeral++
        // Pega collectionRef ou collectionId
        fkDestino =
          field.collectionRef ||
          (field.collectionId === '_pb_users_auth_' ? 'users' : field.collectionId) ||
          ''
      }

      let triggers = ''
      if (fType === 'autodate' && Array.isArray(field.autodateTriggers)) {
        triggers = field.autodateTriggers.join(', ')
      } else if (field.system) {
        triggers = 'Campo do Sistema'
      }

      let nota = ''
      if (field.system) {
        nota = 'Gerenciado internamente pelo PocketBase'
      } else if (fName === 'id') {
        nota = 'Identificador único alfanumérico de 15 caracteres'
      } else if (fType === 'json') {
        nota = 'Estrutura JSON livre'
      } else if (fType === 'file') {
        nota = 'Armazenamento de arquivo / mídia anexada'
      }

      camposRows.push([colName, fName, fType, isReq, opcoes, fkDestino, triggers, nota])

      // Se for FK, adiciona na aba de Chaves Estrangeiras
      if (fType === 'relation') {
        let finalidade = `Relaciona o registro de ${colName} com ${fkDestino}`
        if (colName === 'clientes' && fName === 'responsavel_id') {
          finalidade = 'Usuário responsável pelo cliente no funil comercial'
        } else if (fName === 'cliente_id' || fName === 'cliente') {
          finalidade = 'Vínculo do registro ao cliente proprietário'
        } else if (fName === 'contrato_id') {
          finalidade = 'Vínculo do serviço ou anomalia ao contrato de O&M vigente'
        } else if (fName === 'usina_id') {
          finalidade = 'Vínculo da atividade à usina fotovoltaica correspondente'
        } else if (fName === 'profissional_id' || fName === 'tecnico_id') {
          finalidade = 'Profissional ou técnico encarregado pela execução do serviço'
        } else if (fName === 'fornecedor_id') {
          finalidade = 'Fornecedor ou distribuidor solar associado'
        } else if (fName === 'revisao_de') {
          finalidade = 'Orçamento pai para versionamento de revisões comerciais'
        }

        fksRows.push([
          colName,
          fName,
          fkDestino,
          isReq,
          field.cascadeDelete ? 'Sim' : 'Não',
          finalidade,
        ])
      }
    })

    const rlsDesc = col.apiRules ? 'Regras RLS configuradas (autenticado)' : 'Acesso superusuário'

    resumoRows.push([cIdx + 1, colName, colType, desc, fields.length, fkCount, rlsDesc])
  })

  // Linha de totalizadores na aba Resumo
  resumoRows.push([
    '',
    `TOTAL: ${collections.length} coleções`,
    '',
    '',
    totalCamposGeral,
    totalFKsGeral,
    '',
  ])

  return [
    {
      name: 'Resumo',
      rows: resumoRows,
      colWidths: [8, 26, 18, 55, 14, 20, 30],
    },
    {
      name: 'Campos',
      rows: camposRows,
      colWidths: [24, 28, 16, 14, 45, 24, 24, 35],
    },
    {
      name: 'Chaves Estrangeiras',
      rows: fksRows,
      colWidths: [26, 26, 28, 14, 16, 50],
    },
  ]
}

export function exportSchemaToPublic() {
  console.log(`Iniciando exportação do schema (${collections.length} coleções)...`)
  const sheets = generateSchemaWorkbookData()
  const xlsxBuffer = buildXlsx(sheets)

  const publicDir = path.resolve('public')
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
  }

  const outputPath = path.join(publicDir, 'schema-delfos-solar.xlsx')
  fs.writeFileSync(outputPath, xlsxBuffer)

  console.log(` Planilha de schema gerada com sucesso em: ${outputPath}`)
  console.log(` Tamanho do arquivo: ${(xlsxBuffer.length / 1024).toFixed(2)} KB`)
  console.log(
    ` Abas geradas: ${sheets.map((s) => `"${s.name}" (${s.rows.length - 1} registros)`).join(', ')}`,
  )
}

// Execução direta via node scripts/exportSchema.js
if (process.argv[1] && process.argv[1].endsWith('exportSchema.js')) {
  exportSchemaToPublic()
}

import { identificarOrigemCliente } from './origemCliente'
import { Cliente } from '@/types/crm'

export function runOrigemClienteTests(): boolean {
  console.log('[TEST] Executando testes de identificação de origem de clientes...')

  // Teste 1: Cliente Mesclado (Pipedrive + Conta Azul)
  const clienteMesclado: Partial<Cliente> = {
    nome: 'Clanel',
    dados_importados: {
      origem_integracao: 'Pipedrive + Conta Azul (Mesclado)',
      data_atualizacao_pipedrive: '13/09/2026',
    },
    observacoes: '[Atualizado via Pipedrive em 13/09/2026]: Clanel (Erechim)',
    origem_lead: 'Instagram',
  }
  const infoMesclado = identificarOrigemCliente(clienteMesclado)
  if (infoMesclado.tipo !== 'pipedrive_conta_azul') {
    throw new Error(
      `Falha no teste mesclado: esperado pipedrive_conta_azul, obteve ${infoMesclado.tipo}`,
    )
  }

  // Teste 2: Cliente Conta Azul direto (como_conheceu)
  const clienteContaAzul: Partial<Cliente> = {
    nome: 'Ademar Fiorini',
    como_conheceu: 'Conta Azul',
    origem_lead: 'Outro',
    observacoes: 'Importado de: Conta Azul em 13/09/2026',
  }
  const infoContaAzul = identificarOrigemCliente(clienteContaAzul)
  if (infoContaAzul.tipo !== 'conta_azul') {
    throw new Error(`Falha no teste conta azul: esperado conta_azul, obteve ${infoContaAzul.tipo}`)
  }

  // Teste 3: Cliente Pipedrive direto (como_conheceu / observacoes)
  const clientePipedrive: Partial<Cliente> = {
    nome: 'Luiz Acorsi',
    como_conheceu: 'Pipedrive',
    origem_lead: 'Outro',
    observacoes: 'Importado do Pipedrive CRM como Possível Cliente / Lead em 13/09/2026',
  }
  const infoPipedrive = identificarOrigemCliente(clientePipedrive)
  if (infoPipedrive.tipo !== 'pipedrive') {
    throw new Error(`Falha no teste pipedrive: esperado pipedrive, obteve ${infoPipedrive.tipo}`)
  }

  // Teste 4: Cliente Planilha genérica
  const clientePlanilha: Partial<Cliente> = {
    nome: 'José Solar',
    como_conheceu: 'Planilha Excel',
    origem_lead: 'Outro',
  }
  const infoPlanilha = identificarOrigemCliente(clientePlanilha)
  if (infoPlanilha.tipo !== 'planilha') {
    throw new Error(`Falha no teste planilha: esperado planilha, obteve ${infoPlanilha.tipo}`)
  }

  // Teste 5: Cliente Manual / CRM direto
  const clienteManual: Partial<Cliente> = {
    nome: 'Maria Santos',
    origem_lead: 'Outro',
    como_conheceu: '',
    observacoes: '',
  }
  const infoManual = identificarOrigemCliente(clienteManual)
  if (infoManual.tipo !== 'manual') {
    throw new Error(`Falha no teste manual: esperado manual, obteve ${infoManual.tipo}`)
  }

  // Teste 5.1: Cliente com canal Indicação
  const clienteIndicacao: Partial<Cliente> = {
    nome: 'Carlos Mendes',
    origem_lead: 'Indicação',
  }
  const infoIndicacao = identificarOrigemCliente(clienteIndicacao)
  if (infoIndicacao.tipo !== 'indicacao') {
    throw new Error(`Falha no teste indicação: esperado indicacao, obteve ${infoIndicacao.tipo}`)
  }

  // Teste 6: Ordenação alfabética com acentuação pt-BR
  const nomes = ['Álvaro Silva', 'Ademar Fiorini', 'Ana Paula', 'Émerson Costa', 'Bruno Souza']
  const ordenados = [...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
  if (
    ordenados[0] !== 'Ademar Fiorini' ||
    ordenados[1] !== 'Álvaro Silva' ||
    ordenados[2] !== 'Ana Paula'
  ) {
    throw new Error(`Falha na ordenação alfabética: obteve ${ordenados.join(', ')}`)
  }

  console.log('[TEST] Todos os testes de origem e ordenação passaram com sucesso!')
  return true
}

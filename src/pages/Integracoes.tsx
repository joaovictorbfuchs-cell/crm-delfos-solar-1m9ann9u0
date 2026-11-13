import React from 'react'
import { Link } from 'react-router-dom'
import { Plug, Layers, KeyRound, Clock, Sparkles, Server, Zap, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface IntegracaoCardInfo {
  id: string
  titulo: string
  categoria: string
  descricao: string
  exemplos: string
  icone: React.ElementType
  corIcone: string
  bgIcone: string
  status: 'em_breve' | 'planejado'
  detalhesCampos: string[]
}

const INTEGRACOES_FUTURAS: IntegracaoCardInfo[] = [
  {
    id: 'inversores',
    titulo: 'APIs de Monitoramento de Inversores',
    categoria: 'Telemetria & Geração Solar',
    descricao:
      'Coleta automatizada de telemetria em tempo real, status de conectividade, alarmes de falha e histórico de geração diária/mensal direto dos servidores dos fabricantes.',
    exemplos:
      'SolarEdge, Fronius, Huawei (FusionSolar), Growatt (ShinePhone), Deye, Sungrow, GoodWe.',
    icone: Zap,
    corIcone: 'text-amber-600',
    bgIcone: 'bg-amber-50 border-amber-200',
    status: 'em_breve',
    detalhesCampos: [
      'Chave de API / Token de Acesso',
      'URL base do portal (OpenAPI)',
      'Frequência de sincronização (minutos)',
    ],
  },
  {
    id: 'concessionarias',
    titulo: 'Portais de Concessionárias (CPFL / RGE)',
    categoria: 'Distribuição & Créditos de Energia',
    descricao:
      'Sincronização com os portais de atendimento das distribuidoras para leitura de faturas, acompanhamento de protocolos de homologação, histórico de compensação e saldo de créditos de GD.',
    exemplos: 'RGE Sul, CPFL Paulista, CPFL Piratininga, CPFL Santa Cruz.',
    icone: Server,
    corIcone: 'text-blue-600',
    bgIcone: 'bg-blue-50 border-blue-200',
    status: 'em_breve',
    detalhesCampos: [
      'Credenciais de acesso ao portal (usuário/senha)',
      'Código da instalação / Unidade Consumidora (UC)',
      'Download automático de segunda via em PDF',
    ],
  },
  {
    id: 'erp',
    titulo: 'Sistemas de Gestão & ERP',
    categoria: 'Faturamento & Gestão Empresarial',
    descricao:
      'Sincronização bidirecional de ordens de serviço, emissão de notas fiscais de serviço (NFS-e), contas a pagar/receber e conciliação bancária dos planos O&M e obras solares.',
    exemplos: 'Conta Azul, Omie, Bling, Tiny ERP, TOTVS.',
    icone: Layers,
    corIcone: 'text-emerald-600',
    bgIcone: 'bg-emerald-50 border-emerald-200',
    status: 'em_breve',
    detalhesCampos: [
      'API Token / Webhooks de eventos',
      'Mapeamento de plano de contas',
      'Sincronização automática de recebíveis e boletos',
    ],
  },
]

export function IntegracoesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-xs">
            <Plug className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Integrações
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200"
              >
                Hub de Conectividade
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Conectores externos planejados para portais de inversores, concessionárias e ERP
            </p>
          </div>
        </div>
      </div>

      {/* Alerta de status explicativo */}

      {/* Integração disponível: contas de energia RGE/CPFL */}
      <Card className="border border-blue-200 rounded-2xl shadow-xs bg-gradient-to-r from-blue-50/70 to-white overflow-hidden">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-gray-900">Contas de Energia — RGE / CPFL</h2>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200"
                >
                  Disponível
                </Badge>
              </div>
            </div>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/integracoes/rge">
              Abrir contas de energia
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Cards de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {INTEGRACOES_FUTURAS.map((item) => {
          const Icon = item.icone
          return (
            <Card
              key={item.id}
              className="flex flex-col border border-gray-200/90 rounded-2xl shadow-xs hover:shadow-md transition-shadow bg-white overflow-hidden"
            ></Card>
          )
        })}
      </div>
    </div>
  )
}

export default IntegracoesPage

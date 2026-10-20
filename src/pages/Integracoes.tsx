import React from 'react'
import { Plug, Layers, KeyRound, Clock, Sparkles, Server, Zap } from 'lucide-react'
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
                Central de Integrações
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
      <div className="bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/40 border border-blue-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h2 className="font-bold text-gray-900 text-sm">
              Módulo de Integrações Externas em Preparação
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Esta área está estruturada para receber as credenciais e parâmetros das conexões
              diretas do sistema Delfos. Nenhuma chave secreta foi configurada ainda. Os conectores
              serão ativados gradualmente conforme as APIs forem validadas pela engenharia.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Integrações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {INTEGRACOES_FUTURAS.map((item) => {
          const Icon = item.icone
          return (
            <Card
              key={item.id}
              className="flex flex-col border border-gray-200/90 rounded-2xl shadow-xs hover:shadow-md transition-shadow bg-white overflow-hidden"
            >
              <CardHeader className="p-5 pb-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-xl ${item.bgIcone} flex items-center justify-center shrink-0 border`}
                  >
                    <Icon className={`w-5 h-5 ${item.corIcone}`} />
                  </div>
                  <Badge
                    variant="outline"
                    className="inline-flex items-center gap-1 text-[11px] font-bold py-0.5 px-2 bg-amber-50 text-amber-900 border-amber-300"
                  >
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Em breve</span>
                  </Badge>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    {item.categoria}
                  </span>
                  <CardTitle className="text-base font-bold text-gray-900 mt-0.5 leading-snug">
                    {item.titulo}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-gray-600 leading-relaxed">
                  {item.descricao}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-gray-700 block">
                      Exemplos atendidos:
                    </span>
                    <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                      {item.exemplos}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-gray-700 block">
                      Espaço reservado para:
                    </span>
                    <ul className="space-y-1 text-[11px] text-gray-500">
                      {item.detalhesCampos.map((campo, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <KeyRound className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{campo}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled
                    className="w-full text-xs font-semibold h-9 rounded-xl border-dashed border-gray-300 text-gray-400 cursor-not-allowed"
                  >
                    Configurar Conexão (Em breve)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default IntegracoesPage

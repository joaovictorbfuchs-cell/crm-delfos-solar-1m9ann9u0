import React from 'react'
import {
  Wallet,
  TrendingUp,
  Receipt,
  ShieldCheck,
  DollarSign,
  Clock,
  Sparkles,
  BarChart3,
  CreditCard,
  Building2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function FinanceiroPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-700 to-emerald-500 text-white flex items-center justify-center shadow-xs">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Gestão Financeira
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border-emerald-200"
              >
                Módulo em Estruturação
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Visão consolidada de receitas de serviços em campo, mensalidades O&M e cobranças
              futuras
            </p>
          </div>
        </div>
      </div>

      {/* Banner Informativo */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-slate-50 to-blue-50/40 border border-emerald-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h2 className="font-bold text-gray-900 text-sm">
              Ambiente Financeiro Reservado para o CRM Delfos Solar
            </h2>
            <p className="text-gray-600 leading-relaxed">
              Esta área integrará em breve o fluxo de faturamento das ordens de serviço executadas,
              faturamento recorrente dos contratos O&M (planos Essencial, Performance e Total) e
              conciliação de pagamentos com emissores de boletos/PIX.
            </p>
          </div>
        </div>
      </div>

      {/* Cards de Métricas com Placeholders Elegantes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-gray-200/80 shadow-2xs bg-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Receita Recorrente (MRR)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-gray-900 tracking-tight">R$ --,--</span>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Contratos O&M ativos</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200/80 shadow-2xs bg-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Serviços Avulsos (Mês)
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-gray-900 tracking-tight">R$ --,--</span>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Limpezas e manutenções avulsas</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200/80 shadow-2xs bg-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Cobranças Pendentes
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-gray-900 tracking-tight">--</span>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Boletos / faturas em aberto</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200/80 shadow-2xs bg-white">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Inadimplência
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-black text-gray-900 tracking-tight">0,0%</span>
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Controle de recebimentos</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocos de Demonstração de Estrutura */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="rounded-2xl border border-gray-200/80 shadow-xs bg-white">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Faturamento dos Planos O&M</span>
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] bg-slate-50 text-slate-600 border-slate-200"
              >
                Em breve
              </Badge>
            </div>
            <CardDescription className="text-xs text-gray-500">
              Fluxo automático de geração de faturas a partir dos contratos vigentes da carteira
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center space-y-2 bg-gray-50/50">
              <Building2 className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-700">
                Tabela de Faturamento por Cliente
              </p>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                Lista consolidada de contratos O&M por periodicidade (mensal, trimestral, semestral,
                anual) com link direto para emissão de cobrança.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-gray-200/80 shadow-xs bg-white">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-blue-600" />
                <span>Cobrança de Serviços de Campo</span>
              </CardTitle>
              <Badge
                variant="outline"
                className="text-[10px] bg-slate-50 text-slate-600 border-slate-200"
              >
                Em breve
              </Badge>
            </div>
            <CardDescription className="text-xs text-gray-500">
              Transformação das OSs finalizadas em ordens de cobrança com valor base e taxa de
              placas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0 space-y-3">
            <div className="border border-dashed border-gray-200 rounded-xl p-6 text-center space-y-2 bg-gray-50/50">
              <DollarSign className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-700">
                Ordens de Serviço Prontas para Faturar
              </p>
              <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                Espaço para visualização das OS concluídas pelos técnicos/instaladores com
                conferência de fotos, checklist e emissão de recibo ao cliente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FinanceiroPage

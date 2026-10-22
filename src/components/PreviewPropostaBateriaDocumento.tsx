import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BatteryCharging, Zap, ShieldCheck, CheckCircle2, Building2 } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import type { DadosDocumentoBateria } from '@/lib/propostaBateriaGenerator'

interface PreviewPropostaBateriaDocumentoProps {
  dados: DadosDocumentoBateria
}

export const PreviewPropostaBateriaDocumento: React.FC<PreviewPropostaBateriaDocumentoProps> = ({
  dados,
}) => {
  return (
    <div className="mx-auto max-w-4xl bg-white text-slate-900 border rounded-lg shadow-sm p-6 sm:p-10 text-sm leading-relaxed">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-slate-900 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-700 tracking-tight">DELFOS</span>
            <span className="text-2xl font-light text-slate-600">ENGENHARIA</span>
          </div>
          <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mt-0.5">
            Sistemas de Armazenamento de Energia &amp; Baterias
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Rua Espírito Santo, 275 — Erechim/RS • updates.delfos.eng.br
          </p>
        </div>

        <div className="text-left sm:text-right">
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold uppercase text-[11px] px-2.5 py-0.5"
          >
            Proposta Comercial
          </Badge>
          <div className="font-extrabold text-base text-slate-900 mt-1">{dados.numeroProposta}</div>
          <div className="text-xs text-slate-500">
            Emissão: {dados.dataOrcamento} • Válida até: {dados.dataValidade}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Consultor: <strong className="text-slate-800">{dados.autor}</strong>
          </div>
        </div>
      </div>

      {/* Dados do Cliente */}
      <Card className="p-4 my-6 bg-slate-50 border-slate-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Cliente / Razão Social
            </div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{dados.clienteNome}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Documento
            </div>
            <div className="font-medium text-slate-800 mt-0.5">{dados.clienteDocumento}</div>
          </div>
          <div>
            <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
              Local / Contato
            </div>
            <div className="font-medium text-slate-800 mt-0.5">
              {dados.clienteCidade} • {dados.clienteTelefone}
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs de Dimensionamento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-black text-2xl">
            <BatteryCharging className="h-6 w-6" />
            <span>{dados.capacidadeKwh} kWh</span>
          </div>
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mt-1">
            Capacidade Nominal
          </div>
          <div className="text-[10px] text-emerald-800 mt-0.5">
            {dados.capacidadeUtilKwh} kWh úteis ({dados.profundidadeDescargaDod}% DOD)
          </div>
        </div>

        <div className="rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-black text-2xl">
            <Zap className="h-6 w-6" />
            <span>{dados.autonomiaHoras}h</span>
          </div>
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mt-1">
            Autonomia Estimada
          </div>
          <div className="text-[10px] text-emerald-800 mt-0.5">
            Consumo crítico: {dados.consumoCriticoKwhDia} kWh/dia
          </div>
        </div>

        <div className="rounded-lg p-4 bg-gradient-to-br from-emerald-50 to-green-100 border border-emerald-200 text-center">
          <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-black text-2xl">
            <ShieldCheck className="h-6 w-6" />
            <span>{dados.potenciaInversorKw} kW</span>
          </div>
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide mt-1">
            Potência do Inversor
          </div>
          <div className="text-[10px] text-emerald-800 mt-0.5">
            Tensão do Banco: {dados.tensaoBancoV}V
          </div>
        </div>
      </div>

      {/* Aplicação & Tecnologia */}
      <div className="space-y-4 mb-6">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-1.5">
          <span className="w-1.5 h-3.5 bg-emerald-600 rounded-sm" />
          Aplicação &amp; Tecnologia de Armazenamento
        </h4>
        <div className="p-4 bg-slate-50 border rounded-lg">
          <div className="font-bold text-emerald-800 text-sm">
            {dados.tipoAplicacao === 'backup' &&
              'Backup / No-Break (Segurança Energética contra Quedas)'}
            {dados.tipoAplicacao === 'peak_shaving' &&
              'Peak Shaving (Redução de Ponta / Tarifa de Horário de Pico)'}
            {dados.tipoAplicacao === 'autoconsumo' && 'Maximização de Autoconsumo Solar'}
            {dados.tipoAplicacao === 'off_grid' && 'Sistema Isolado / Off-Grid (100% Autônomo)'}
            {!['backup', 'peak_shaving', 'autoconsumo', 'off_grid'].includes(dados.tipoAplicacao) &&
              dados.tipoAplicacao}
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Tecnologia de células <strong>{dados.tipoBateria}</strong> com durabilidade superior a{' '}
            <strong>{dados.ciclosVidaEstimados} ciclos</strong> (equivalente a 15+ anos com uso
            diário), alta estabilidade térmica e sistema de gerenciamento de bateria (BMS)
            inteligente com comunicação CAN/RS485.
          </p>
        </div>
      </div>

      {/* Equipamentos */}
      <div className="space-y-4 mb-6">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-1.5">
          <span className="w-1.5 h-3.5 bg-emerald-600 rounded-sm" />
          Equipamentos Homologados
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 bg-slate-50 border rounded-lg">
            <div className="text-[10px] font-bold text-slate-500 uppercase">
              Módulos de Baterias
            </div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{dados.marcaBateria}</div>
            <div className="text-xs text-slate-700 mt-0.5">{dados.modeloBateria}</div>
            <div className="text-xs font-medium text-emerald-700 mt-1">
              Quantidade: {dados.quantidadeBaterias} unidade(s)
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border rounded-lg">
            <div className="text-[10px] font-bold text-slate-500 uppercase">
              Inversor / Carregador Híbrido
            </div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {dados.marcaInversorCarregador}
            </div>
            <div className="text-xs text-slate-700 mt-0.5">{dados.modeloInversorCarregador}</div>
            <div className="text-xs font-medium text-emerald-700 mt-1">
              Potência nominal: {dados.potenciaInversorKw} kW
            </div>
          </div>
        </div>
      </div>

      {/* Garantias */}
      <div className="space-y-4 mb-6">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b pb-1.5">
          <span className="w-1.5 h-3.5 bg-emerald-600 rounded-sm" />
          Prazos e Garantias
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border rounded-lg flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-700">Garantia Baterias</div>
              <div className="font-bold text-slate-900">
                {dados.garantiaBateriasAnos} anos de fábrica
              </div>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border rounded-lg flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-700">Garantia Inversor</div>
              <div className="font-bold text-slate-900">
                {dados.garantiaInversorAnos} anos de fábrica
              </div>
            </div>
          </div>
          <div className="p-3 bg-slate-50 border rounded-lg flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-700">Instalação e Engenharia</div>
              <div className="font-bold text-slate-900">
                {dados.garantiaInstalacaoAnos} ano Delfos Engenharia
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caixa de Investimento */}
      <div className="bg-slate-900 text-white rounded-xl p-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
            Investimento Turnkey Total
          </div>
          <div className="text-3xl font-black text-emerald-400 mt-0.5">
            {formatCurrency(dados.valorInvestimento)}
          </div>
          <div className="text-xs text-slate-300 mt-1 max-w-md">
            Inclui equipamentos, cabos de bateria de alta corrente, quadro de transferência
            automática/manual (ATS), proteções contra surto (DPS), montagem e parametrização.
          </div>
        </div>

        <div className="text-left sm:text-right text-xs max-w-sm">
          <div className="font-bold text-slate-300 uppercase tracking-wide text-[10px]">
            Condições Comerciais
          </div>
          <p className="text-slate-100 mt-1">{dados.condicoesPagamento}</p>
          {dados.parcelaFinanciamento > 0 && (
            <div className="mt-2 text-emerald-300 font-semibold">
              Ou em {dados.parcelasFinanciamento}x de {formatCurrency(dados.parcelaFinanciamento)}{' '}
              via financiamento bancário
            </div>
          )}
        </div>
      </div>

      {dados.observacoes && (
        <div className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-600 mb-6">
          <strong className="text-slate-800">Observações adicionais:</strong> {dados.observacoes}
        </div>
      )}

      {/* Rodapé institucional */}
      <div className="pt-4 border-t flex flex-col sm:flex-row justify-between items-center text-[11px] text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          <span>DELFOS ENGENHARIA SOLAR LTDA • CNPJ 38.307.728/0001-35</span>
        </div>
        <div>Proposta {dados.numeroProposta}</div>
      </div>
    </div>
  )
}

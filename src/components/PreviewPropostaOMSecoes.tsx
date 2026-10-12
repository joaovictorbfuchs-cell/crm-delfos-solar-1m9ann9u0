// Componente de pré-visualização das seções da Proposta O&M diretamente no DOM (sem iframe srcDoc).
// Segue o padrão de PreviewPropostaSecoes, permitindo visualizar com clareza o documento oficial:
// Cabeçalho institucional Delfos, Dados do Cliente, Dados Técnicos da Usina, Cenários de Exposição
// Financeira, Tabela Comparativa dos 3 Planos (Essencial, Prevenção, Completo), Condições Gerais e Observações.
import React, { useState } from 'react'
import type { PropostaPDFInput } from '@/lib/propostaOMGenerator'
import { DADOS_EMPRESA_DELFOS } from '@/lib/propostaOMGenerator'
import { formatCurrency } from '@/lib/formatters'
import logoDelfosCorreta from '@/assets/delfos-solar-1368d.png'
import {
  Layers,
  MousePointerClick,
  Check,
  ShieldAlert,
  Award,
  FileText,
  Phone,
  Globe,
  MapPin,
} from 'lucide-react'

export interface PreviewPropostaOMSecoesProps {
  propostaData: PropostaPDFInput
  observacoesAdicionais?: string
  onSelectSecao?: (secaoId: string) => void
}

export const PreviewPropostaOMSecoes: React.FC<PreviewPropostaOMSecoesProps> = ({
  propostaData,
  observacoesAdicionais,
  onSelectSecao,
}) => {
  const [secaoAtiva, setSecaoAtiva] = useState<string | null>(null)

  const { cliente, tecnico, parametros, calculos } = propostaData

  const handleSelect = (secaoId: string) => {
    setSecaoAtiva(secaoId)
    onSelectSecao?.(secaoId)
  }

  const formatBRL = (val: number) => formatCurrency(val || 0)

  const dataFormatada = propostaData.dataEmissao
    ? new Date(propostaData.dataEmissao).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR')

  const secoes = [
    { id: 'titulo-proposta', nome: 'Título & Logo', targetId: 'preview-om-cabecalho' },
    { id: 'dados-cliente-usina', nome: 'Cliente & Usina', targetId: 'preview-om-cliente-usina' },
    { id: 'cenarios-exposicao', nome: 'Cenários de Exposição', targetId: 'preview-om-cenarios' },
    { id: 'comparativo-planos', nome: 'Comparativo de Planos', targetId: 'preview-om-planos' },
    { id: 'condicoes-gerais', nome: 'Condições & Validade', targetId: 'preview-om-condicoes' },
  ]

  const itensTabela = [
    {
      escopo: 'Monitoramento diário da geração em horários comerciais',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Sim',
    },
    {
      escopo: 'Relatório mensal analítico de desempenho e compensação',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Sim',
    },
    {
      escopo: 'Suporte técnico especializado direto com engenharia',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Ilimitado VIP',
    },
    {
      escopo: 'Intermediação e suporte com a concessionária (RGE)',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Prioritário',
    },
    {
      escopo: 'Configuração e suporte remoto ao datalogger/Wi-Fi',
      essencial: '✓ Sim',
      prevencao: '✓ Sim',
      completo: '✓ Sim',
    },
    {
      escopo: 'Inspeção preventiva anual in loco e ensaios elétricos',
      essencial: 'Sob demanda',
      prevencao: '✓ 1x ao ano',
      completo: '✓ 1x ao ano',
    },
    {
      escopo: 'Reaperto de conexões, quadros e integridade dos grampos',
      essencial: '—',
      prevencao: '✓ Incluso',
      completo: '✓ Incluso',
    },
    {
      escopo: 'Verificação de desempenho, detecção de sombreamento e falhas',
      essencial: '—',
      prevencao: '✓ Anual',
      completo: '✓ Semestral',
    },
    {
      escopo: 'Limpeza técnica dos módulos solares com produto homologado',
      essencial: 'Avulso',
      prevencao: '✓ 1x ao ano',
      completo: '✓ 2x ao ano',
    },
  ]

  return (
    <div
      id="container-preview-proposta-om-secoes"
      data-testid="preview-proposta-om-secoes"
      className="w-full space-y-4"
    >
      {/* Barra de navegação rápida por seções */}
      <div className="bg-white border border-emerald-200/80 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Seções do Documento da Proposta O&M:</span>
          <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
            Visualização fiel pronta para geração do PDF oficial
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {secoes.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                handleSelect(s.id)
                const el = document.getElementById(s.targetId)
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                }
              }}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                secaoAtiva === s.id
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {secaoAtiva === s.id ? (
                <Check className="w-3 h-3 text-white" />
              ) : (
                <MousePointerClick className="w-3 h-3 text-slate-400" />
              )}
              <span>{s.nome}</span>
            </button>
          ))}
        </div>
      </div>

      {/* DOCUMENTO: PÁGINA EMULADA ESTILO A4 */}
      <div className="bg-white border border-gray-300 rounded-2xl shadow-md p-6 sm:p-8 space-y-6 max-w-4xl mx-auto text-gray-900 font-sans">
        {/* Cabeçalho com Logo correta da Delfos ao lado do Título */}
        <div
          id="preview-om-cabecalho"
          onClick={() => handleSelect('titulo-proposta')}
          className={`cursor-pointer transition-all bg-emerald-50/70 border border-emerald-200 border-l-4 border-l-emerald-600 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            secaoAtiva === 'titulo-proposta' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
          }`}
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            {/* Logo correta da Delfos ("delfos solar" colorida listrada) ao lado do título */}
            <img
              src={logoDelfosCorreta}
              alt="Delfos Solar"
              className="h-12 w-auto max-w-[140px] object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-emerald-950 uppercase tracking-tight leading-snug">
                Proposta de Gestão e Manutenção de Usinas (O&amp;M)
              </h1>
              <p className="text-xs text-emerald-800 font-medium mt-0.5">
                Prevenção ativa, aumento de geração e proteção integral do seu investimento solar
                fotovoltaico
              </p>
            </div>
          </div>
          <div className="px-3 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-800 shrink-0 shadow-2xs self-start sm:self-center">
            Emissão: {dataFormatada}
          </div>
        </div>

        {/* 2. Dados do Cliente & Dados Técnicos da Usina */}
        <div
          id="preview-om-cliente-usina"
          onClick={() => handleSelect('dados-cliente-usina')}
          className={`cursor-pointer transition-all grid grid-cols-1 md:grid-cols-2 gap-4 ${
            secaoAtiva === 'dados-cliente-usina'
              ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-xl p-2'
              : ''
          }`}
        >
          {/* Card Cliente */}
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                1. Dados do Cliente
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                Cadastrado
              </span>
            </div>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Nome / Razão:</span>
                <span className="font-bold text-gray-900 text-right">{cliente.nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">CPF / CNPJ:</span>
                <span className="font-semibold text-gray-800">
                  {cliente.cpfOuCnpj || 'Não informado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Município:</span>
                <span className="font-semibold text-gray-800">
                  {cliente.municipio || 'Erechim / RS'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Endereço:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {cliente.endereco || 'Endereço da usina'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Telefone:</span>
                <span className="font-semibold text-gray-800">
                  {cliente.telefone || '(54) 99129-2121'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">E-mail:</span>
                <span className="font-semibold text-gray-800 text-right">
                  {cliente.email || 'contato@cliente.com'}
                </span>
              </div>
            </div>
          </div>

          {/* Card Técnico da Usina */}
          <div className="bg-slate-50 border border-gray-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-600" />
                2. Dados Técnicos da Usina
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                Sistema Ativo
              </span>
            </div>
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Potência Instalada:</span>
                <span className="font-extrabold text-emerald-700">
                  {tecnico.potenciaKwp > 0
                    ? `${tecnico.potenciaKwp.toLocaleString('pt-BR')} kWp`
                    : '5,00 kWp'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Geração Estimada:</span>
                <span className="font-bold text-gray-900">
                  {tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh/mês
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Inversor(es):</span>
                <span className="font-semibold text-gray-800 text-right">
                  {tecnico.marcaInversores || 'Inversores homologados'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Módulos:</span>
                <span className="font-semibold text-gray-800">
                  {tecnico.numeroModulos ? `${tecnico.numeroModulos} unidades` : 'Conforme projeto'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Tipo de Instalação:</span>
                <span className="font-semibold text-gray-800">
                  {tecnico.tipoInstalacao || 'Telhado'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-medium">Tarifa Base (RGE):</span>
                <span className="font-extrabold text-emerald-700">
                  {formatBRL(parametros.valorKwh)} / kWh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Cenários de Exposição Financeira */}
        <div
          id="preview-om-cenarios"
          onClick={() => handleSelect('cenarios-exposicao')}
          className={`cursor-pointer transition-all bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 ${
            secaoAtiva === 'cenarios-exposicao' ? 'ring-2 ring-amber-500 ring-offset-2' : ''
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-amber-950 font-extrabold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cenários de Exposição Financeira sem O&amp;M Especializado</span>
            </div>
            <div className="text-[11px] font-bold text-amber-800 bg-white/80 px-2.5 py-0.5 rounded border border-amber-300">
              Produção mensal: {tecnico.geracaoMediaKwh.toLocaleString('pt-BR')} kWh ×{' '}
              {formatBRL(parametros.valorKwh)}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white border border-emerald-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-emerald-800 uppercase leading-tight min-h-[22px]">
                Ativo Protegido (Mês)
              </div>
              <div className="text-base font-black text-emerald-700 mt-1">
                {formatBRL(calculos.valorAtivoProtegido)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Geração integral</div>
            </div>

            <div className="bg-white border border-amber-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-amber-900 uppercase leading-tight min-h-[22px]">
                Perda 15% / ano (Sujidade)
              </div>
              <div className="text-base font-black text-amber-600 mt-1">
                {formatBRL(calculos.perda15Ano)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Poeira acumulada</div>
            </div>

            <div className="bg-white border border-orange-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-orange-900 uppercase leading-tight min-h-[22px]">
                Perda 20% / ano (Sem Preventiva)
              </div>
              <div className="text-base font-black text-orange-600 mt-1">
                {formatBRL(calculos.perda20Ano)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Degradação térmica</div>
            </div>

            <div className="bg-white border border-rose-200 rounded-xl p-3 shadow-2xs">
              <div className="text-[10px] font-bold text-rose-900 uppercase leading-tight min-h-[22px]">
                Prejuízo 30 dias (Inversor Parado)
              </div>
              <div className="text-base font-black text-rose-600 mt-1">
                {formatBRL(calculos.prejuizo30Dias)}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Falha sem alerta</div>
            </div>
          </div>

          <div className="text-[11px] text-amber-900 bg-white/70 border border-amber-200 rounded-lg p-2.5">
            * Prejuízo por 20 dias de falha ou inversor desarmado sem alerta de monitoramento:{' '}
            <strong className="text-amber-950">{formatBRL(calculos.prejuizo20Dias)}</strong>. Um
            plano de O&amp;M se paga integralmente ao evitar apenas alguns dias de perda de geração
            ao ano.
          </div>
        </div>

        {/* 4. Comparativo Completo dos 3 Planos — Cards de Planos (idênticos à seção de parâmetros) */}
        <div
          id="preview-om-planos"
          onClick={() => handleSelect('comparativo-planos')}
          className={`cursor-pointer transition-all space-y-4 ${
            secaoAtiva === 'comparativo-planos'
              ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-xl p-2'
              : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
              3. Comparativo de Planos de Gestão e Manutenção
            </h2>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              3 Modalidades Inclusas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Card 1: Plano Essencial */}
            <div className="p-4 rounded-2xl border border-gray-200/90 bg-white shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 tracking-tight">
                  Plano Essencial
                </div>
                <div className="text-2xl font-extrabold text-[#0D7A3E] mt-1.5 tracking-tight">
                  R$ 49,90<span className="text-base font-bold">/mês</span>
                </div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">
                  Faturamento Anual: R$ 598,80/ano
                </div>
                <ul className="text-xs text-gray-600 mt-3.5 space-y-2">
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Monitoramento comercial</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Relatório mensal analítico</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Suporte técnico e RGE</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 2: Plano Prevenção */}
            <div className="p-4 rounded-2xl border border-gray-200/90 bg-white shadow-xs flex flex-col justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900 tracking-tight">
                  Plano Prevenção
                </div>
                <div className="text-2xl font-extrabold text-[#0D7A3E] mt-1.5 tracking-tight">
                  R$ 74,90<span className="text-base font-bold">/mês</span>
                </div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">
                  Faturamento Anual: R$ 898,80/ano
                </div>
                <ul className="text-xs text-gray-600 mt-3.5 space-y-2">
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Tudo do plano Essencial</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>1x Inspeção preventiva anual</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>1x Limpeza de placas anual</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Reaperto geral de conexões</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 3: Plano Completo (Destacado com RECOMENDADO DELFOS) */}
            <div className="p-4 rounded-2xl border-2 border-[#16A34A] bg-white shadow-xs relative flex flex-col justify-between">
              {/* Badge RECOMENDADO DELFOS no topo direito */}
              <span className="absolute -top-3.5 right-6 bg-[#047857] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                RECOMENDADO DELFOS
              </span>
              <div>
                <div className="text-sm font-bold text-gray-900 tracking-tight">Plano Completo</div>
                <div className="text-2xl font-extrabold text-[#0D7A3E] mt-1.5 tracking-tight">
                  R$ 99,90<span className="text-base font-bold">/mês</span>
                </div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">
                  Faturamento Anual: R$ 1.198,80/ano
                </div>
                <ul className="text-xs text-gray-600 mt-3.5 space-y-2">
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Tudo do plano Prevenção</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>2x Limpezas de placas ao ano</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Verificação semestral de anomalias</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-gray-400 select-none">•</span>
                    <span>Suporte técnico limitado VIP</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Condições Gerais e Observações */}
        <div
          id="preview-om-condicoes"
          onClick={() => handleSelect('condicoes-gerais')}
          className={`cursor-pointer transition-all space-y-3 ${
            secaoAtiva === 'condicoes-gerais'
              ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-xl p-2'
              : ''
          }`}
        >
          <div className="bg-slate-50 border border-gray-200 border-l-4 border-l-emerald-600 rounded-xl p-4 text-xs space-y-1.5 text-gray-700">
            <div className="font-bold text-gray-900 uppercase text-[11px] mb-1">
              Condições Gerais e Vigência:
            </div>
            <p>
              • <strong>Escolha flexível:</strong> O cliente escolhe livremente a modalidade mais
              adequada após a apresentação dos cenários de proteção.
            </p>
            <p>
              • <strong>Vigência contratual:</strong> 12 meses renováveis, garantindo atendimento
              contínuo, preventivo e laudos periódicos da usina.
            </p>
            <p>
              • <strong>Forma de pagamento:</strong> Mensalidades via boleto bancário ou PIX
              corporativo Delfos Engenharia.
            </p>
            <p>
              • <strong>Equipe técnica qualificada:</strong> Técnicos certificados NR-10 e NR-35 com
              equipamentos e instrumentos calibrados.
            </p>
            <p>
              • <strong>Garantia de segurança:</strong> Produtos específicos e homologados,
              preservando as garantias dos fabricantes de inversores e painéis.
            </p>
          </div>

          {observacoesAdicionais && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
              <span className="font-bold block mb-1">Observações Complementares da Proposta:</span>
              <p className="text-emerald-900">{observacoesAdicionais}</p>
            </div>
          )}

          {/* Rodapé da Proposta conforme imagem de referência:
              Faixa cinza clara com as informações centralizadas em duas linhas:
              Linha 1: logo pequena + "Delfos Engenharia Solar | CNPJ 21.379.952/0001-38 • (54) 99129-2121 • www.delfos.eng.br" (com ícones)
              Linha 2: "Rua Espírito Santo, 275 – Centro, Erechim/RS" (com ícone de localização)
              Abaixo: "Proposta válida por 5 dias." em verde escuro */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="bg-[#f3f4f6] border border-gray-200/80 rounded-xl py-3 px-4 flex flex-col items-center justify-center text-center space-y-1 text-slate-700">
              {/* Linha 1 */}
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] sm:text-xs">
                <img
                  src={logoDelfosCorreta}
                  alt="Delfos"
                  className="h-4 w-auto object-contain inline-block"
                />
                <span className="font-extrabold text-slate-900">Delfos Engenharia Solar</span>
                <span className="text-slate-400">|</span>
                <span className="font-bold text-slate-800">CNPJ 21.379.952/0001-38</span>
                <span className="text-emerald-600 font-bold">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>(54) 99129-2121</span>
                </span>
                <span className="text-emerald-600 font-bold">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <Globe className="w-3 h-3 text-emerald-600" />
                  <span>www.delfos.eng.br</span>
                </span>
              </div>

              {/* Linha 2 */}
              <div className="flex items-center justify-center gap-1 text-[11px] text-slate-600">
                <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Rua Espírito Santo, 275 – Centro, Erechim/RS</span>
              </div>

              {/* Linha 3: Proposta válida por 5 dias. (Verde escuro de destaque) */}
              <div className="pt-1 text-[11px] font-bold text-[#0D7A3E]">
                Proposta válida por 5 dias.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewPropostaOMSecoes

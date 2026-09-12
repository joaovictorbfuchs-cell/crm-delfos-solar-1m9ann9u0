import React, { useMemo, useState } from 'react'
import {
  Clock,
  Sun,
  FileCheck,
  Calendar,
  FileText,
  MessageSquare,
  HardHat,
  Droplets,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle2,
  Clock3,
  XCircle,
  ExternalLink,
  Pencil,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import type { TimelineUnifiedItem, TimelineFilterTipo } from '@/types/timelineUnified'
import type { Cliente, Atividade, OrcamentoSolar, PropostaOM } from '@/types/crm'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/formatters'
import { getTipoAtividadeConfig } from '@/constants/atividadesTipos'

interface LinhaDoTempoUnificadaProps {
  cliente: Cliente
  atividades: Atividade[]
  orcamentosSolar: OrcamentoSolar[]
  propostasOM: PropostaOM[]
  onItemClick: (item: TimelineUnifiedItem) => void
  onToggleAtividadeStatus?: (id: string, current: string) => Promise<void>
  onNovaAtividadeClick?: () => void
  onNovoOrcamentoSolarClick?: () => void
  onNovaPropostaOMClick?: () => void
}

export const LinhaDoTempoUnificada: React.FC<LinhaDoTempoUnificadaProps> = ({
  cliente,
  atividades,
  orcamentosSolar,
  propostasOM,
  onItemClick,
  onToggleAtividadeStatus,
  onNovaAtividadeClick,
  onNovoOrcamentoSolarClick,
  onNovaPropostaOMClick,
}) => {
  const [activeFilter, setActiveFilter] = useState<TimelineFilterTipo>('todas')

  // Agrega todos os eventos das coleções existentes em uma única linha cronológica
  const todosEventos = useMemo<TimelineUnifiedItem[]>(() => {
    const items: TimelineUnifiedItem[] = []

    // 1. Propostas Solares (e suas revisões)
    for (const orc of orcamentosSolar) {
      if (orc.cliente_id !== cliente.id) continue
      const revNum = orc.numero_revisao || 1
      const revStatus = orc.status_revisao || 'em análise'
      const dataIso = orc.data_orcamento || orc.created

      let statusVar: TimelineUnifiedItem['statusVariant'] = 'warning'
      if (revStatus === 'aprovada') statusVar = 'success'
      else if (revStatus === 'rejeitada') statusVar = 'danger'
      else if (revStatus === 'enviada ao cliente') statusVar = 'info'

      const equipParts: string[] = []
      if (orc.potencia_kwp) equipParts.push(`${orc.potencia_kwp.toFixed(2)} kWp`)
      if (orc.numero_placas) equipParts.push(`${orc.numero_placas} placas`)
      if (orc.geracao_mensal_kwh) equipParts.push(`${orc.geracao_mensal_kwh} kWh/mês`)
      if (orc.marca_painel) equipParts.push(`Módulos ${orc.marca_painel}`)
      if (orc.marca_inversor) equipParts.push(`Inv: ${orc.marca_inversor}`)

      const equipDesc = equipParts.join(' • ')

      items.push({
        id: `solar-${orc.id}`,
        categoria: 'proposta_solar',
        tipoFiltro: 'propostas',
        titulo: `Proposta Solar Fotovoltaica — Revisão ${revNum}`,
        subtitulo: equipDesc || 'Dimensionamento Fotovoltaico',
        descricao:
          orc.observacoes ||
          `Orçamento solar elaborado para ${cliente.nome}. Potência calculada de ${orc.potencia_kwp?.toFixed(2)} kWp (${orc.numero_placas || 0} placas) com geração estimada de ${orc.geracao_mensal_kwh ? `${orc.geracao_mensal_kwh} kWh/mês` : 'alto rendimento'}.`,
        data: dataIso,
        autor: orc.autor || 'Delfos Solar',
        responsavelNome: orc.autor || 'Engenharia Solar Delfos',
        status: revStatus,
        statusVariant: statusVar,
        valorPrincipal: orc.valor_investimento,
        valorSecundario: orc.geracao_mensal_kwh
          ? `${orc.geracao_mensal_kwh} kWh/mês estimados`
          : undefined,
        dadosTecnicos: {
          potenciaKwp: orc.potencia_kwp,
          numeroPlacas: orc.numero_placas,
          placasMarca: orc.marca_painel,
          inversorMarca: orc.marca_inversor,
          geracaoMensalKwh: orc.geracao_mensal_kwh,
          paybackMeses: orc.payback_anos ? Math.round(orc.payback_anos * 12) : undefined,
          tipoEstrutura: orc.tipo_estrutura,
          revisaoNumero: revNum,
        },
        rawOrcamentoSolar: orc,
      })
    }

    // 2. Propostas O&M
    for (const prop of propostasOM) {
      if (prop.cliente_id !== cliente.id) continue
      const dataIso = prop.data_proposta || prop.created
      const planoNome = prop.plano_escolhido || prop.plano_recomendado || 'Completo'

      let statusVar: TimelineUnifiedItem['statusVariant'] = 'info'
      if (prop.status === 'Aceita' || prop.status === 'Fechado') statusVar = 'success'
      else if (prop.status === 'Recusada') statusVar = 'danger'

      const equipDesc = [
        prop.potencia_kwp ? `${prop.potencia_kwp} kWp` : '',
        prop.tipo_instalacao ? prop.tipo_instalacao : '',
        prop.marca_inversores ? `Inv: ${prop.marca_inversores}` : '',
      ]
        .filter(Boolean)
        .join(' • ')

      items.push({
        id: `om-${prop.id}`,
        categoria: 'proposta_om',
        tipoFiltro: 'propostas',
        titulo: `Proposta O&M: Plano ${planoNome}`,
        subtitulo: equipDesc || 'Operação & Manutenção Preventiva',
        descricao:
          prop.observacoes ||
          `Proposta formal de gestão e manutenção continuada para sistema solar de ${prop.potencia_kwp || 0} kWp. Inclui vistorias técnicas periódicas e lavagem de módulos.`,
        data: dataIso,
        autor: prop.autor || 'Equipe O&M Delfos',
        responsavelNome: prop.autor || 'Equipe O&M Delfos',
        status: prop.status || 'Proposta Enviada',
        statusVariant: statusVar,
        valorPrincipal: prop.valor_mensal_plano,
        valorSecundario: prop.valor_ativo_protegido
          ? `Ativo protegido: ${formatCurrency(prop.valor_ativo_protegido)}/mês`
          : undefined,
        dadosTecnicos: {
          potenciaKwp: prop.potencia_kwp,
          numeroPlacas: prop.numero_modulos,
          planoEscolhido: planoNome,
          inversorMarca: prop.marca_inversores,
          geracaoMensalKwh: prop.geracao_mensal_kwh,
          tipoEstrutura: prop.tipo_instalacao,
        },
        rawPropostaOM: prop,
      })
    }

    // 3. Atividades & Anotações
    for (const atv of atividades) {
      if (atv.cliente_id !== cliente.id) continue
      const dataIso = atv.data || atv.created
      const isAnotacao = atv.tipo === 'anotacao'
      const isOutras = atv.tipo === 'mudanca_estagio' || (atv.tipo as string) === 'outro'

      let cat: TimelineUnifiedItem['categoria'] = 'atividade'
      let filtro: TimelineUnifiedItem['tipoFiltro'] = 'atividades'

      if (isAnotacao) {
        cat = 'anotacao'
        filtro = 'outras'
      } else if (isOutras) {
        cat = 'outras'
        filtro = 'outras'
      }

      let statusVar: TimelineUnifiedItem['statusVariant'] = 'info'
      if (atv.status === 'concluida') statusVar = 'success'
      else if (atv.status === 'cancelada') statusVar = 'danger'
      else if (atv.status === 'pendente') statusVar = 'warning'

      const configTipo = getTipoAtividadeConfig(atv.tipo)

      items.push({
        id: `atv-${atv.id}`,
        categoria: cat,
        tipoFiltro: filtro,
        titulo: atv.titulo || configTipo.tituloPadrao,
        subtitulo: configTipo.tituloPadrao,
        descricao: atv.descricao || undefined,
        data: dataIso,
        autor: atv.autor || atv.responsavel_nome,
        responsavelNome: atv.responsavel_nome || atv.autor,
        status: isAnotacao ? 'Anotação' : atv.status,
        statusVariant: statusVar,
        rawAtividade: atv,
      })
    }

    // Ordenação estritamente cronológica: mais recente primeiro
    return items.sort((a, b) => {
      const timeA = new Date(a.data).getTime()
      const timeB = new Date(b.data).getTime()
      return timeB - timeA
    })
  }, [cliente.id, cliente.nome, orcamentosSolar, propostasOM, atividades])

  // Contagens para os chips de filtro
  const counts = useMemo(() => {
    let atvCount = 0
    let propCount = 0
    let outrasCount = 0

    for (const item of todosEventos) {
      if (item.tipoFiltro === 'atividades') atvCount++
      else if (item.tipoFiltro === 'propostas') propCount++
      else if (item.tipoFiltro === 'outras') outrasCount++
    }

    return {
      todas: todosEventos.length,
      atividades: atvCount,
      propostas: propCount,
      outras: outrasCount,
    }
  }, [todosEventos])

  // Filtragem dos eventos de acordo com o chip selecionado
  const eventosFiltrados = useMemo(() => {
    if (activeFilter === 'todas') return todosEventos
    return todosEventos.filter((i) => i.tipoFiltro === activeFilter)
  }, [todosEventos, activeFilter])

  const renderIcon = (item: TimelineUnifiedItem) => {
    switch (item.categoria) {
      case 'proposta_solar':
        return (
          <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs group-hover:scale-105 transition-transform">
            <Sun className="w-4 h-4 text-amber-600" />
          </div>
        )
      case 'proposta_om':
        return (
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs group-hover:scale-105 transition-transform">
            <FileCheck className="w-4 h-4 text-emerald-700" />
          </div>
        )
      case 'anotacao':
        return (
          <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-2xs group-hover:scale-105 transition-transform">
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
        )
      case 'atividade':
        return (
          <div className="p-2 rounded-xl bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs group-hover:scale-105 transition-transform">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
        )
      default:
        return (
          <div className="p-2 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 shadow-2xs group-hover:scale-105 transition-transform">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
        )
    }
  }

  const renderCategoryBadge = (item: TimelineUnifiedItem) => {
    switch (item.categoria) {
      case 'proposta_solar':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
            Proposta Solar
          </span>
        )
      case 'proposta_om':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200">
            Proposta O&M
          </span>
        )
      case 'anotacao':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
            Anotação
          </span>
        )
      case 'atividade':
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
            Atividade
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
            Outras Ações
          </span>
        )
    }
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Cabeçalho com Filtros por Tipo */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Clock className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span>Linha do Tempo Unificada</span>
                <span className="text-[11px] font-normal text-gray-400">
                  ({eventosFiltrados.length} de {todosEventos.length})
                </span>
              </h3>
              <p className="text-[11px] text-gray-500">
                Ordem cronológica (mais recente primeiro): propostas solares, O&M, atividades e
                anotações.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {onNovoOrcamentoSolarClick && (
              <button
                type="button"
                onClick={onNovoOrcamentoSolarClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                title="Criar novo orçamento solar ou nova revisão"
              >
                <Sun className="w-3.5 h-3.5 text-white" />
                <span>+ Novo Orçamento</span>
              </button>
            )}

            {onNovaPropostaOMClick && (
              <button
                type="button"
                onClick={onNovaPropostaOMClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                title="Criar nova proposta de O&M"
              >
                <FileCheck className="w-3.5 h-3.5 text-white" />
                <span>+ Proposta O&M</span>
              </button>
            )}

            {onNovaAtividadeClick && (
              <button
                type="button"
                onClick={onNovaAtividadeClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-bold transition-colors"
                title="Registrar nova atividade ou follow-up"
              >
                <Calendar className="w-3.5 h-3.5 text-gray-600" />
                <span>+ Atividade</span>
              </button>
            )}
          </div>
        </div>

        {/* Resumo rápido de propostas solares quando houver */}
        {counts.propostas > 0 && (
          <div className="flex items-center gap-2 pt-1 border-t border-gray-100 text-[11px] text-gray-600 flex-wrap">
            <span className="font-semibold text-gray-700 flex items-center gap-1">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Revisões de Proposta Solar:
            </span>
            {todosEventos
              .filter((ev) => ev.categoria === 'proposta_solar')
              .map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => onItemClick(ev)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-semibold transition-colors text-[11px]"
                  title={`Ver detalhes da Revisão ${ev.dadosTecnicos?.revisaoNumero || 1}`}
                >
                  <span className="font-bold">Rev. {ev.dadosTecnicos?.revisaoNumero || 1}:</span>
                  <span>{formatCurrency(ev.valorPrincipal || 0)}</span>
                  <span
                    className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-bold ${
                      ev.statusVariant === 'success'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ev.statusVariant === 'danger'
                          ? 'bg-red-100 text-red-800'
                          : ev.statusVariant === 'warning'
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {ev.status}
                  </span>
                </button>
              ))}
          </div>
        )}

        {/* Chips de Filtro */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setActiveFilter('todas')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'todas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <span>Todas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'todas'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.todas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('atividades')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'atividades'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Atividades</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'atividades'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.atividades}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('propostas')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'propostas'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Propostas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'propostas'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.propostas}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('outras')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeFilter === 'outras'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Outras Ações</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'outras'
                  ? 'bg-emerald-900/60 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {counts.outras}
            </span>
          </button>
        </div>
      </div>

      {/* Lista da Linha do Tempo */}
      {eventosFiltrados.length === 0 ? (
        <div className="text-center py-12 px-4 bg-gray-50/60 rounded-2xl border border-dashed border-gray-200">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">
            Nenhum evento encontrado para o filtro "{activeFilter}".
          </p>
          <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto">
            Alterne o filtro acima para "Todas" ou registre uma nova atividade/proposta.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {eventosFiltrados.map((item) => {
            const hasValor = item.valorPrincipal !== undefined && item.valorPrincipal > 0
            const isAtividade = item.rawAtividade && item.categoria === 'atividade'
            const isConcluida = item.rawAtividade?.status === 'concluida'

            return (
              <div
                key={item.id}
                onClick={() => onItemClick(item)}
                className={`group relative flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer text-xs ${
                  item.categoria === 'proposta_solar'
                    ? 'bg-gradient-to-r from-amber-50/60 via-white to-amber-50/20 border-amber-200/90 hover:border-amber-400 hover:shadow-xs'
                    : item.categoria === 'proposta_om'
                      ? 'bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/20 border-emerald-200/90 hover:border-emerald-400 hover:shadow-xs'
                      : item.categoria === 'anotacao'
                        ? 'bg-gradient-to-r from-indigo-50/40 via-white to-indigo-50/10 border-indigo-200/90 hover:border-indigo-400 hover:shadow-xs'
                        : 'bg-white border-gray-200 hover:border-emerald-400 hover:shadow-xs'
                }`}
              >
                {/* Ícone por tipo */}
                <div className="shrink-0 mt-0.5">{renderIcon(item)}</div>

                {/* Conteúdo do Registro */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderCategoryBadge(item)}

                      {item.dadosTecnicos?.revisaoNumero && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-emerald-700 text-white">
                          Rev. {item.dadosTecnicos.revisaoNumero}
                        </span>
                      )}

                      {item.status && item.categoria !== 'anotacao' && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                            item.statusVariant === 'success'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : item.statusVariant === 'danger'
                                ? 'bg-red-100 text-red-800 border-red-300'
                                : item.statusVariant === 'warning'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                          }`}
                        >
                          {item.status}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                      <Clock3 className="w-3 h-3 text-gray-400" />
                      <span>{formatDateTime(item.data)}</span>
                    </div>
                  </div>

                  {/* Título e Subtítulo */}
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm group-hover:text-emerald-800 transition-colors">
                      {item.titulo}
                    </h4>
                    {item.subtitulo && (
                      <p className="text-[11px] text-gray-500 font-medium">{item.subtitulo}</p>
                    )}
                  </div>

                  {/* Descrição resumida */}
                  {item.descricao && (
                    <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed pt-0.5">
                      {item.descricao}
                    </p>
                  )}

                  {/* Rodapé do card: autor, valor financeiro e botão de detalhes */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100/90 text-[11px] flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-gray-500">
                      {(item.responsavelNome || item.autor) && (
                        <span className="font-medium">
                          Por:{' '}
                          <strong className="text-gray-700">
                            {item.responsavelNome || item.autor}
                          </strong>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {hasValor && (
                        <div className="text-right">
                          <span className="font-black text-gray-900 text-xs sm:text-sm">
                            {formatCurrency(item.valorPrincipal!)}
                          </span>
                          {item.categoria === 'proposta_om' && (
                            <span className="text-[10px] text-gray-400 block font-normal">
                              /mês
                            </span>
                          )}
                        </div>
                      )}

                      {/* Botão de abrir detalhes com efeito hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onItemClick(item)
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3 h-3 text-emerald-600" />
                        <span>Detalhes / Editar</span>
                        <ChevronRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

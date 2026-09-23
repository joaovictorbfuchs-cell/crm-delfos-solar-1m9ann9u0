import React, { useState, useMemo } from 'react'
import {
  Sun,
  Cpu,
  CheckCircle2,
  PlusCircle,
  Sparkles,
  AlertTriangle,
  Building2,
  Hash,
  Zap,
  Info,
} from 'lucide-react'
import type { Equipamento, TipoEquipamento } from '@/types/equipamentos'
import type { FornecedorOrcamento } from '@/types/crm'
import { formatarPotenciaEquipamento } from '@/services/equipamentosService'
import { ModalCadastroEquipamentoRapido } from './ModalCadastroEquipamentoRapido'

export interface DadosEquipamentosAplicados {
  marcaPainel: string
  potenciaPlacaWp: number
  numeroPlacas: number
  marcaInversor: string
  quantidadeInversores: number
  fotoModuloUrl?: string
  fotoInversorUrl?: string
  garantiaModulosFabricacaoAnos?: number
  garantiaInversorAnos?: number
}

export interface SecaoEquipamentosFornecedorSelecionadoProps {
  fornecedorOrcamento: FornecedorOrcamento | null
  equipamentos: Equipamento[]
  onEquipamentoCadastrado?: (novo: Equipamento) => void
  onAplicarEquipamentos: (dados: DadosEquipamentosAplicados) => void
  equipamentosAtuaisProposta?: {
    marcaPainel?: string
    potenciaPlacaWp?: number
    numeroPlacas?: number
    marcaInversor?: string
    quantidadeInversores?: number
  }
}

// Helpers de extração heurística de marca, potência e modelo a partir da descrição
const MARCAS_MODULOS_CONHECIDAS = [
  'RONMA',
  'LUXEN',
  'ERA',
  'Canadian Solar',
  'JA Solar',
  'Jinko',
  'Trina',
  'Longi',
  'Risen',
  'Osda',
  'BYD',
  'Ahn-Solar',
  'Dah Solar',
  'Talesun',
  'Suntech',
  'GCL',
  'Leapton',
  'Astronergy',
  'Chint',
  'WEG',
]

const MARCAS_INVERSORES_CONHECIDAS = [
  'SOFAR',
  'TSUNESS',
  'DEYE',
  'GROWATT',
  'HUAWEI',
  'SOLIS',
  'SUNGROW',
  'FRONIUS',
  'GOODWE',
  'HOYMILES',
  'SAJ',
  'WEG',
  'APSYSTEMS',
  'ABB',
  'SMA',
  'CHINT',
  'KEHUA',
]

function extrairInfoModulo(desc: string, qtd: number) {
  const limpa = (desc || '').trim()

  // Extrair potência em Wp: ex "610W", "625W", "620 W", "550 Wp"
  let potenciaWp = 0
  const matchW = limpa.match(/(\d{3,4})\s*W(?:p|\b)/i)
  if (matchW && matchW[1]) {
    const num = parseInt(matchW[1], 10)
    if (num >= 200 && num <= 900) {
      potenciaWp = num
    }
  }

  // Detectar marca
  let marca = ''
  for (const m of MARCAS_MODULOS_CONHECIDAS) {
    const regex = new RegExp(`\\b${m}\\b`, 'i')
    if (regex.test(limpa)) {
      marca = m.toUpperCase()
      break
    }
  }

  // Se não achou na lista conhecida, tenta extrair a primeira palavra que não seja código numérico
  if (!marca) {
    const tokens = limpa.replace(/^\d+\s+/, '').split(/\s+/)
    if (tokens[0] && tokens[0].length >= 3) {
      marca = tokens[0].toUpperCase()
    } else {
      marca = 'Módulo FV'
    }
  }

  // Modelo: descrição sem o código do item inicial se houver (ex: "18197 RONMA 610W..." => modelo limpo)
  const modelo = limpa.replace(/^\d+\s+/, '').trim() || limpa

  return {
    marca,
    modelo,
    potenciaWp,
    quantidade: Math.max(1, qtd || 1),
    descricaoOriginal: limpa,
  }
}

function extrairInfoInversor(desc: string, qtd: number) {
  const limpa = (desc || '').trim()

  // Extrair potência: pode vir em kW ("10KW", "2.5 kW", "2.5kW", "7.3KTLM", "2.25 kW") ou W ("5000W")
  let potenciaW = 0
  const matchKw = limpa.match(/(\d+(?:[.,]\d+)?)\s*k(?:w|tlm)?\b/i)
  if (matchKw && matchKw[1]) {
    const kw = parseFloat(matchKw[1].replace(',', '.'))
    if (kw > 0 && kw < 200) {
      potenciaW = Math.round(kw * 1000)
    }
  }

  if (potenciaW === 0) {
    // Tenta em W
    const matchW = limpa.match(/(\d{3,5})\s*W\b/i)
    if (matchW && matchW[1]) {
      const w = parseInt(matchW[1], 10)
      if (w >= 1000 && w <= 200000) {
        potenciaW = w
      }
    }
  }

  // Detectar marca
  let marca = ''
  for (const m of MARCAS_INVERSORES_CONHECIDAS) {
    const regex = new RegExp(`\\b${m}\\b`, 'i')
    if (regex.test(limpa)) {
      marca = m.toUpperCase()
      break
    }
  }

  if (!marca) {
    const tokens = limpa.replace(/^\d+\s+/, '').split(/\s+/)
    if (tokens[0] && tokens[0].length >= 3) {
      marca = tokens[0].toUpperCase()
    } else {
      marca = 'Inversor'
    }
  }

  const modelo = limpa.replace(/^\d+\s+/, '').trim() || limpa

  return {
    marca,
    modelo,
    potenciaW,
    quantidade: Math.max(1, qtd || 1),
    descricaoOriginal: limpa,
  }
}

function normalizar(str: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function SecaoEquipamentosFornecedorSelecionado({
  fornecedorOrcamento,
  equipamentos,
  onEquipamentoCadastrado,
  onAplicarEquipamentos,
  equipamentosAtuaisProposta,
}: SecaoEquipamentosFornecedorSelecionadoProps) {
  const [modalCadastro, setModalCadastro] = useState<{
    isOpen: boolean
    tipo: TipoEquipamento
    marca: string
    modelo: string
    potenciaW: number
  }>({
    isOpen: false,
    tipo: 'modulo_fv',
    marca: '',
    modelo: '',
    potenciaW: 0,
  })

  // Dados do Módulo extraído do fornecedor
  const itemModuloOriginal = fornecedorOrcamento?.modulos?.[0]
  const infoModulo = useMemo(() => {
    if (!itemModuloOriginal || !itemModuloOriginal.descricao) return null
    return extrairInfoModulo(itemModuloOriginal.descricao, itemModuloOriginal.quantidade)
  }, [itemModuloOriginal])

  // Dados do Inversor extraído do fornecedor
  const itemInversorOriginal = fornecedorOrcamento?.inversores?.[0]
  const infoInversor = useMemo(() => {
    if (!itemInversorOriginal || !itemInversorOriginal.descricao) return null
    return extrairInfoInversor(itemInversorOriginal.descricao, itemInversorOriginal.quantidade)
  }, [itemInversorOriginal])

  // Checar se o módulo já existe no banco de equipamentos
  const moduloEncontrado = useMemo<Equipamento | null>(() => {
    if (!infoModulo) return null
    const modulosBanco = equipamentos.filter((e) => e.tipo === 'modulo_fv')

    // 1. Tentar por marca + modelo ou equivalência forte
    const marcaNorm = normalizar(infoModulo.marca)
    const modeloNorm = normalizar(infoModulo.modelo)

    for (const eq of modulosBanco) {
      const eqMarca = normalizar(eq.marca)
      const eqModelo = normalizar(eq.modelo)

      if ((eqMarca && marcaNorm.includes(eqMarca)) || (marcaNorm && eqMarca.includes(marcaNorm))) {
        // Se a potência bater ou modelo bater
        if (infoModulo.potenciaWp > 0 && eq.potencia_w === infoModulo.potenciaWp) {
          return eq
        }
        if (eqModelo && (modeloNorm.includes(eqModelo) || eqModelo.includes(modeloNorm))) {
          return eq
        }
      }
    }

    // 2. Tentar por potência exata se só tiver um
    if (infoModulo.potenciaWp > 0) {
      const porPot = modulosBanco.filter((e) => e.potencia_w === infoModulo.potenciaWp)
      if (porPot.length === 1 && marcaNorm && normalizar(porPot[0].marca).includes(marcaNorm)) {
        return porPot[0]
      }
    }

    return null
  }, [infoModulo, equipamentos])

  // Checar se o inversor já existe no banco de equipamentos
  const inversorEncontrado = useMemo<Equipamento | null>(() => {
    if (!infoInversor) return null
    const inversoresBanco = equipamentos.filter((e) => e.tipo === 'inversor')

    const marcaNorm = normalizar(infoInversor.marca)
    const modeloNorm = normalizar(infoInversor.modelo)

    for (const eq of inversoresBanco) {
      const eqMarca = normalizar(eq.marca)
      const eqModelo = normalizar(eq.modelo)

      if ((eqMarca && marcaNorm.includes(eqMarca)) || (marcaNorm && eqMarca.includes(marcaNorm))) {
        if (infoInversor.potenciaW > 0 && Math.abs(eq.potencia_w - infoInversor.potenciaW) < 100) {
          return eq
        }
        if (eqModelo && (modeloNorm.includes(eqModelo) || eqModelo.includes(modeloNorm))) {
          return eq
        }
      }
    }

    return null
  }, [infoInversor, equipamentos])

  // Verificar se os equipamentos atuais da proposta batem com os do fornecedor
  const jaAplicadoNaProposta = useMemo(() => {
    if (!equipamentosAtuaisProposta || !infoModulo) return false
    const marcaModuloBate =
      equipamentosAtuaisProposta.marcaPainel &&
      equipamentosAtuaisProposta.marcaPainel.includes(infoModulo.marca)
    const qtdModuloBate = equipamentosAtuaisProposta.numeroPlacas === infoModulo.quantidade
    return Boolean(marcaModuloBate && qtdModuloBate)
  }, [equipamentosAtuaisProposta, infoModulo])

  const handleAplicar = () => {
    if (!infoModulo && !infoInversor) return

    // Descrições formatadas para proposta comercial
    const marcaPainelFormatada = moduloEncontrado
      ? `${moduloEncontrado.marca} ${moduloEncontrado.modelo}${moduloEncontrado.potencia_w ? ` ${moduloEncontrado.potencia_w}W` : ''}`
      : infoModulo
        ? infoModulo.descricaoOriginal
        : ''

    const marcaInversorFormatada = inversorEncontrado
      ? `${inversorEncontrado.marca} ${inversorEncontrado.modelo}`
      : infoInversor
        ? infoInversor.descricaoOriginal
        : ''

    onAplicarEquipamentos({
      marcaPainel: marcaPainelFormatada,
      potenciaPlacaWp: moduloEncontrado?.potencia_w || infoModulo?.potenciaWp || 550,
      numeroPlacas: infoModulo?.quantidade || 10,
      marcaInversor: marcaInversorFormatada,
      quantidadeInversores: infoInversor?.quantidade || 1,
      garantiaModulosFabricacaoAnos: moduloEncontrado?.garantia_anos || undefined,
      garantiaInversorAnos: inversorEncontrado?.garantia_anos || undefined,
    })
  }

  // 1. Caso sem fornecedor selecionado: banner âmbar claro com instrução
  if (!fornecedorOrcamento) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 shadow-xs animate-in fade-in duration-200">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-150 text-amber-900 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
              Equipamentos do Fornecedor Selecionado
            </h4>
            <p className="text-xs text-amber-900 leading-relaxed">
              Nenhuma cotação de fornecedor foi vinculada a este orçamento ainda. Para alimentar os
              módulos e inversores da proposta comercial, selecione uma cotação na seção{' '}
              <strong>"Orçamentos de Fornecedores Cadastrados / Extraídos"</strong> logo abaixo ou
              faça upload do PDF/imagem do distribuidor.
            </p>
            <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
              <Info className="w-3.5 h-3.5 text-amber-700" />
              <span>
                O vínculo do fornecedor é obrigatório para salvar e gerar a proposta final.
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const nomeFornecedor = fornecedorOrcamento.nome_fornecedor || 'Fornecedor'

  return (
    <div className="bg-white rounded-xl border border-emerald-300 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Topo do Bloco: Fornecedor Selecionado e Ação Rápida */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Fornecedor Vinculado
              </span>
              {fornecedorOrcamento.numero_revisao && (
                <span className="text-[10px] font-bold text-gray-500">
                  Cotação: #{fornecedorOrcamento.numero_revisao}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-gray-900 mt-0.5">{nomeFornecedor}</h3>
          </div>
        </div>

        {/* Botão de Usar Equipamentos na Proposta */}
        <button
          type="button"
          onClick={handleAplicar}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
            jaAplicadoNaProposta
              ? 'bg-emerald-700 text-white hover:bg-emerald-800 ring-2 ring-emerald-500/30'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
          title="Grava marca, modelo, potência e quantidade no orçamento e nos geradores de PDF/Word"
        >
          {jaAplicadoNaProposta ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>Equipamentos Aplicados na Proposta</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Usar estes equipamentos na proposta</span>
            </>
          )}
        </button>
      </div>

      {/* Cards dos 2 Equipamentos: Módulo FV e Inversor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Card 1: Módulo Fotovoltaico */}
        <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Módulo Fotovoltaico
                </span>
              </div>

              {/* Tag Já cadastrado ou Botão Cadastrar */}
              {moduloEncontrado ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Já cadastrado (#{moduloEncontrado.id.slice(0, 6)})</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModalCadastro({
                      isOpen: true,
                      tipo: 'modulo_fv',
                      marca: infoModulo?.marca || '',
                      modelo: infoModulo?.modelo || infoModulo?.descricaoOriginal || '',
                      potenciaW: infoModulo?.potenciaWp || 550,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-emerald-800 border border-emerald-400 hover:bg-emerald-50 transition-colors shadow-2xs"
                  title="Cadastrar este módulo no banco permanente de equipamentos"
                >
                  <PlusCircle className="w-3 h-3 text-emerald-600" />
                  <span>Cadastrar no Banco</span>
                </button>
              )}
            </div>

            {/* Descrição Original do Fornecedor (Não Editável) */}
            <div className="p-2.5 rounded-lg bg-white border border-gray-200/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">
                Descrição extraída da cotação
              </span>
              <p className="text-xs font-semibold text-gray-900 break-words">
                {infoModulo?.descricaoOriginal || (
                  <span className="text-gray-400 italic">Módulo não discriminado na cotação</span>
                )}
              </p>
            </div>

            {/* Metadados extraídos (Não Editáveis Manualmente) */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Marca</span>
                <span className="text-xs font-bold text-gray-800">
                  {moduloEncontrado?.marca || infoModulo?.marca || '—'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Potência
                </span>
                <span className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-0.5">
                  <Zap className="w-3 h-3 text-emerald-500" />
                  {infoModulo?.potenciaWp ? `${infoModulo.potenciaWp} Wp` : '550 Wp'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Quantidade
                </span>
                <span className="text-xs font-black text-gray-900 flex items-center justify-center gap-0.5">
                  <Hash className="w-3 h-3 text-gray-400" />
                  {infoModulo?.quantidade || 0} un
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 flex items-center justify-between border-t border-gray-200/60 pt-2">
            <span>Extraído automaticamente da cotação</span>
            {moduloEncontrado?.garantia_anos && (
              <span className="text-emerald-700 font-semibold">
                Garantia fábrica: {moduloEncontrado.garantia_anos} anos
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Inversor */}
        <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-white hover:border-blue-300 transition-all flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Inversor Fotovoltaico
                </span>
              </div>

              {/* Tag Já cadastrado ou Botão Cadastrar */}
              {inversorEncontrado ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Já cadastrado (#{inversorEncontrado.id.slice(0, 6)})</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setModalCadastro({
                      isOpen: true,
                      tipo: 'inversor',
                      marca: infoInversor?.marca || '',
                      modelo: infoInversor?.modelo || infoInversor?.descricaoOriginal || '',
                      potenciaW: infoInversor?.potenciaW || 5000,
                    })
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-emerald-800 border border-emerald-400 hover:bg-emerald-50 transition-colors shadow-2xs"
                  title="Cadastrar este inversor no banco permanente de equipamentos"
                >
                  <PlusCircle className="w-3 h-3 text-emerald-600" />
                  <span>Cadastrar no Banco</span>
                </button>
              )}
            </div>

            {/* Descrição Original do Fornecedor (Não Editável) */}
            <div className="p-2.5 rounded-lg bg-white border border-gray-200/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase block mb-0.5">
                Descrição extraída da cotação
              </span>
              <p className="text-xs font-semibold text-gray-900 break-words">
                {infoInversor?.descricaoOriginal || (
                  <span className="text-gray-400 italic">Inversor não discriminado na cotação</span>
                )}
              </p>
            </div>

            {/* Metadados extraídos (Não Editáveis Manualmente) */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Marca</span>
                <span className="text-xs font-bold text-gray-800">
                  {inversorEncontrado?.marca || infoInversor?.marca || '—'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Potência
                </span>
                <span className="text-xs font-bold text-blue-700 flex items-center justify-center gap-0.5">
                  <Zap className="w-3 h-3 text-blue-500" />
                  {infoInversor?.potenciaW
                    ? formatarPotenciaEquipamento(infoInversor.potenciaW)
                    : '5 kW'}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase block">
                  Quantidade
                </span>
                <span className="text-xs font-black text-gray-900 flex items-center justify-center gap-0.5">
                  <Hash className="w-3 h-3 text-gray-400" />
                  {infoInversor?.quantidade || 0} un
                </span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 flex items-center justify-between border-t border-gray-200/60 pt-2">
            <span>Extraído automaticamente da cotação</span>
            {inversorEncontrado?.garantia_anos && (
              <span className="text-blue-700 font-semibold">
                Garantia fábrica: {inversorEncontrado.garantia_anos} anos
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Cadastro Rápido de Equipamento */}
      <ModalCadastroEquipamentoRapido
        isOpen={modalCadastro.isOpen}
        onClose={() => setModalCadastro((prev) => ({ ...prev, isOpen: false }))}
        tipoInicial={modalCadastro.tipo}
        marcaInicial={modalCadastro.marca}
        modeloInicial={modalCadastro.modelo}
        potenciaInicial={modalCadastro.potenciaW}
        fornecedorNome={nomeFornecedor}
        onEquipamentoCadastrado={(novo) => {
          onEquipamentoCadastrado?.(novo)
        }}
      />
    </div>
  )
}

export default SecaoEquipamentosFornecedorSelecionado

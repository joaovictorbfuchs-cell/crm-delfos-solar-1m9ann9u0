import React, { useRef, useState, useEffect } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Cpu,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  MapPin,
  RotateCcw,
  Sparkles,
  UploadCloud,
  User,
  Zap,
  Sun,
  Plus,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import {
  extrairDadosDocumento,
  type DocumentoExtraidoData,
} from '@/services/documentExtractionService'
import { fetchEquipamentos } from '@/services/equipamentosService'
import { vincularEquipamentoUsina } from '@/services/usinaEquipamentosService'
import { sincronizarUsinaComCliente } from '@/services/crmService'
import { ModalCadastroEquipamentoRapido } from '@/components/ModalCadastroEquipamentoRapido'
import type { Equipamento, TipoEquipamento } from '@/types/equipamentos'
import type { UsinaCliente } from '@/types/crm'

export interface ModalImportarDocumentoUsinaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  usina: UsinaCliente
  clienteNome: string
  onApplyImport: (
    updates: Partial<UsinaCliente>,
    resumoCampos: string[],
    modo?: 'adicionar' | 'sobrescrever',
  ) => Promise<void>
}

interface CampoExtraidoUsina {
  id: string
  chaveUsina: keyof UsinaCliente
  categoria: 'tecnico' | 'consumo' | 'endereco' | 'titular'
  label: string
  valorFormatado: string
  valorBruto: unknown
  valorAtual?: string | null
  jaPreenchido: boolean
  diferente: boolean
}

function formatTamanhoArquivo(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getIconeArquivo(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return <FileText className="w-5 h-5 text-rose-600" />
  if (['xlsx', 'xls', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return <ImageIcon className="w-5 h-5 text-blue-600" />
  }
  return <FileText className="w-5 h-5 text-slate-600" />
}

export const ModalImportarDocumentoUsina: React.FC<ModalImportarDocumentoUsinaProps> = ({
  open,
  onOpenChange,
  usina,
  clienteNome,
  onApplyImport,
}) => {
  const { toast } = useToast()
  const inputArquivoRef = useRef<HTMLInputElement>(null)

  const [arquivo, setArquivo] = useState<File | null>(null)
  const [isArrastando, setIsArrastando] = useState(false)
  const [isAnalisando, setIsAnalisando] = useState(false)
  const [progressoTexto, setProgressoTexto] = useState('')
  const [mensagemErro, setMensagemErro] = useState<string | null>(null)

  const [camposExtraidos, setCamposExtraidos] = useState<CampoExtraidoUsina[]>([])
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({})
  const [isSalvando, setIsSalvando] = useState(false)

  // Modo de importação: 'adicionar' vs 'sobrescrever'
  // Regra: "Adicionar" deve ser a opção padrão quando a usina já tiver documentos/dados.
  const [modoImportacao, setModoImportacao] = useState<'adicionar' | 'sobrescrever'>('adicionar')

  useEffect(() => {
    if (open) {
      // Se a usina já tem inversores_info, potência, módulos ou documentos, padronizar 'adicionar'
      const jaTemDadosOuDocs = Boolean(
        (usina.documentos_usina && usina.documentos_usina.length > 0) ||
        usina.datasheet_inversor_url ||
        usina.datasheet_modulo_url ||
        (usina.inversores_info && usina.inversores_info.trim().length > 0) ||
        (usina.potencia_kwp && usina.potencia_kwp > 0),
      )
      setModoImportacao(jaTemDadosOuDocs ? 'adicionar' : 'sobrescrever')
    }
  }, [open, usina])

  // Estado dos equipamentos extraídos e detecção no catálogo
  const [catalogoEquipamentos, setCatalogoEquipamentos] = useState<Equipamento[]>([])
  const [sugestaoModulo, setSugestaoModulo] = useState<{
    fabricante: string
    modelo: string
    potenciaW: number
    existente: Equipamento | null
  } | null>(null)
  const [sugestaoInversor, setSugestaoInversor] = useState<{
    fabricante: string
    modelo: string
    potenciaW: number
    existente: Equipamento | null
  } | null>(null)

  // Modais de cadastro rápido quando o usuário quiser criar na hora
  const [modalCriarRapido, setModalCriarRapido] = useState<{
    aberto: boolean
    tipo: TipoEquipamento
    fabricante: string
    modelo: string
    potenciaW: number
  }>({
    aberto: false,
    tipo: 'inversor',
    fabricante: '',
    modelo: '',
    potenciaW: 0,
  })

  // Carregar catálogo de equipamentos para comparação inteligente
  useEffect(() => {
    if (open) {
      fetchEquipamentos().then(setCatalogoEquipamentos).catch(console.error)
    }
  }, [open])

  const resetarEstado = () => {
    setArquivo(null)
    setIsArrastando(false)
    setIsAnalisando(false)
    setProgressoTexto('')
    setMensagemErro(null)
    setCamposExtraidos([])
    setSelecionados({})
    setIsSalvando(false)
    setSugestaoModulo(null)
    setSugestaoInversor(null)
  }

  const handleFechar = () => {
    resetarEstado()
    onOpenChange(false)
  }

  const mapearDadosParaCamposUsina = (
    data: DocumentoExtraidoData,
    usinaAtual: UsinaCliente,
  ): CampoExtraidoUsina[] => {
    const lista: CampoExtraidoUsina[] = []

    const tec = data.dados_tecnicos || {}
    const cons = data.consumo || {}
    const end = data.endereco || {}
    const cad = data.dados_cadastrais || {}

    // 1. DADOS TÉCNICOS DA USINA
    if (tec.potencia_kwp !== null && tec.potencia_kwp !== undefined) {
      const valAtual = usinaAtual.potencia_kwp
      lista.push({
        id: 'potencia_kwp',
        chaveUsina: 'potencia_kwp',
        categoria: 'tecnico',
        label: 'Potência Instalada (kWp)',
        valorFormatado: `${tec.potencia_kwp} kWp`,
        valorBruto: Number(tec.potencia_kwp),
        valorAtual: valAtual ? `${valAtual} kWp` : null,
        jaPreenchido: Boolean(valAtual && valAtual > 0),
        diferente: valAtual !== tec.potencia_kwp,
      })
    }

    if (tec.numero_modulos !== null && tec.numero_modulos !== undefined) {
      const valAtual = usinaAtual.qtd_modulos ?? usinaAtual.quantidade_placas
      lista.push({
        id: 'qtd_modulos',
        chaveUsina: 'qtd_modulos',
        categoria: 'tecnico',
        label: 'Quantidade de Módulos',
        valorFormatado: `${tec.numero_modulos} módulos`,
        valorBruto: Number(tec.numero_modulos),
        valorAtual: valAtual ? `${valAtual} módulos` : null,
        jaPreenchido: Boolean(valAtual && valAtual > 0),
        diferente: valAtual !== tec.numero_modulos,
      })
    }

    if (tec.fabricante_modulos) {
      const valAtual = usinaAtual.fabricante_modulos || usinaAtual.marca_placas
      lista.push({
        id: 'fabricante_modulos',
        chaveUsina: 'fabricante_modulos',
        categoria: 'tecnico',
        label: 'Fabricante dos Módulos',
        valorFormatado: tec.fabricante_modulos,
        valorBruto: tec.fabricante_modulos,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== tec.fabricante_modulos.trim(),
      })
    }

    if (tec.modelo_modulos) {
      const valAtual = usinaAtual.modelo_modulos
      lista.push({
        id: 'modelo_modulos',
        chaveUsina: 'modelo_modulos',
        categoria: 'tecnico',
        label: 'Modelo dos Módulos',
        valorFormatado: tec.modelo_modulos,
        valorBruto: tec.modelo_modulos,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== tec.modelo_modulos.trim(),
      })
    }

    if (tec.fabricante_inversores) {
      const valAtual = usinaAtual.fabricante_inversores
      lista.push({
        id: 'fabricante_inversores',
        chaveUsina: 'fabricante_inversores',
        categoria: 'tecnico',
        label: 'Fabricante do Inversor',
        valorFormatado: tec.fabricante_inversores,
        valorBruto: tec.fabricante_inversores,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== tec.fabricante_inversores.trim(),
      })
    }

    if (tec.modelo_inversores) {
      const valAtual = usinaAtual.modelo_inversores
      lista.push({
        id: 'modelo_inversores',
        chaveUsina: 'modelo_inversores',
        categoria: 'tecnico',
        label: 'Modelo do Inversor',
        valorFormatado: tec.modelo_inversores,
        valorBruto: tec.modelo_inversores,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== tec.modelo_inversores.trim(),
      })
    }

    if (tec.fabricante_inversores || tec.modelo_inversores) {
      const combinada = [tec.fabricante_inversores, tec.modelo_inversores].filter(Boolean).join(' ')
      const valAtual = usinaAtual.inversores_info
      lista.push({
        id: 'inversores_info',
        chaveUsina: 'inversores_info',
        categoria: 'tecnico',
        label: 'Informações do Inversor (Geral)',
        valorFormatado: combinada,
        valorBruto: combinada,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== combinada.trim(),
      })
    }

    if (tec.geracao_mensal_kwh !== null && tec.geracao_mensal_kwh !== undefined) {
      const valAtual = usinaAtual.geracao_estimada_kwh ?? usinaAtual.geracao_media_mensal_kwh
      lista.push({
        id: 'geracao_estimada_kwh',
        chaveUsina: 'geracao_estimada_kwh',
        categoria: 'tecnico',
        label: 'Geração Estimada (kWh/mês)',
        valorFormatado: `${tec.geracao_mensal_kwh} kWh/mês`,
        valorBruto: Number(tec.geracao_mensal_kwh),
        valorAtual: valAtual ? `${valAtual} kWh/mês` : null,
        jaPreenchido: Boolean(valAtual && valAtual > 0),
        diferente: valAtual !== tec.geracao_mensal_kwh,
      })
    }

    if (tec.tipo_telhado) {
      const valAtual = usinaAtual.tipo_telhado
      lista.push({
        id: 'tipo_telhado',
        chaveUsina: 'tipo_telhado',
        categoria: 'tecnico',
        label: 'Tipo de Telhado',
        valorFormatado: tec.tipo_telhado,
        valorBruto: tec.tipo_telhado,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual),
        diferente: valAtual !== tec.tipo_telhado,
      })
    }

    if (tec.padrao_entrada) {
      const valAtual = usinaAtual.padrao_entrada
      lista.push({
        id: 'padrao_entrada',
        chaveUsina: 'padrao_entrada',
        categoria: 'tecnico',
        label: 'Padrão de Entrada',
        valorFormatado: tec.padrao_entrada,
        valorBruto: tec.padrao_entrada,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== tec.padrao_entrada.trim(),
      })
    }

    if (tec.tipo_atendimento) {
      const valAtual = usinaAtual.tipo_atendimento
      lista.push({
        id: 'tipo_atendimento',
        chaveUsina: 'tipo_atendimento',
        categoria: 'tecnico',
        label: 'Tipo de Atendimento',
        valorFormatado: tec.tipo_atendimento,
        valorBruto: tec.tipo_atendimento,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual),
        diferente: valAtual !== tec.tipo_atendimento,
      })
    }

    if (tec.numero_fases) {
      const valAtual = usinaAtual.numero_fases
      lista.push({
        id: 'numero_fases',
        chaveUsina: 'numero_fases',
        categoria: 'tecnico',
        label: 'Número de Fases',
        valorFormatado: tec.numero_fases,
        valorBruto: tec.numero_fases,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual),
        diferente: valAtual !== tec.numero_fases,
      })
    }

    // 2. CONSUMO E CONCESSIONÁRIA
    if (cons.uc) {
      const valAtual = usinaAtual.numero_uc
      lista.push({
        id: 'numero_uc',
        chaveUsina: 'numero_uc',
        categoria: 'consumo',
        label: 'Unidade Consumidora (UC)',
        valorFormatado: cons.uc,
        valorBruto: cons.uc,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== cons.uc.trim(),
      })
    }

    if (cons.concessionaria) {
      const valAtual = usinaAtual.concessionaria
      lista.push({
        id: 'concessionaria',
        chaveUsina: 'concessionaria',
        categoria: 'consumo',
        label: 'Concessionária de Energia',
        valorFormatado: cons.concessionaria,
        valorBruto: cons.concessionaria,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== cons.concessionaria.trim(),
      })
    }

    if (cons.classe_consumo) {
      const valAtual = usinaAtual.classe_consumo
      lista.push({
        id: 'classe_consumo',
        chaveUsina: 'classe_consumo',
        categoria: 'consumo',
        label: 'Classe de Consumo',
        valorFormatado: cons.classe_consumo,
        valorBruto: cons.classe_consumo,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== cons.classe_consumo.trim(),
      })
    }

    if (cons.tarifa !== null && cons.tarifa !== undefined) {
      const valAtual = usinaAtual.tarifa
      lista.push({
        id: 'tarifa',
        chaveUsina: 'tarifa',
        categoria: 'consumo',
        label: 'Tarifa de Energia (R$/kWh)',
        valorFormatado: `R$ ${Number(cons.tarifa).toFixed(4)}`,
        valorBruto: Number(cons.tarifa),
        valorAtual: valAtual ? `R$ ${Number(valAtual).toFixed(4)}` : null,
        jaPreenchido: Boolean(valAtual && valAtual > 0),
        diferente: valAtual !== cons.tarifa,
      })
    }

    if (cons.consumo_kwh_mes !== null && cons.consumo_kwh_mes !== undefined) {
      const valAtual = usinaAtual.consumo_kwh_mes ?? usinaAtual.consumo_medio
      lista.push({
        id: 'consumo_kwh_mes',
        chaveUsina: 'consumo_kwh_mes',
        categoria: 'consumo',
        label: 'Consumo Médio Mensal (kWh/mês)',
        valorFormatado: `${cons.consumo_kwh_mes} kWh/mês`,
        valorBruto: Number(cons.consumo_kwh_mes),
        valorAtual: valAtual ? `${valAtual} kWh/mês` : null,
        jaPreenchido: Boolean(valAtual && valAtual > 0),
        diferente: valAtual !== cons.consumo_kwh_mes,
      })
    }

    // 3. ENDEREÇO DA USINA
    if (end.endereco) {
      const valAtual = usinaAtual.endereco
      lista.push({
        id: 'endereco',
        chaveUsina: 'endereco',
        categoria: 'endereco',
        label: 'Endereço (Logradouro)',
        valorFormatado: end.endereco,
        valorBruto: end.endereco,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== end.endereco.trim(),
      })
    }

    if (end.numero) {
      const valAtual = usinaAtual.numero
      lista.push({
        id: 'numero',
        chaveUsina: 'numero',
        categoria: 'endereco',
        label: 'Número',
        valorFormatado: end.numero,
        valorBruto: end.numero,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== end.numero.trim(),
      })
    }

    if (end.complemento) {
      const valAtual = usinaAtual.complemento
      lista.push({
        id: 'complemento',
        chaveUsina: 'complemento',
        categoria: 'endereco',
        label: 'Complemento',
        valorFormatado: end.complemento,
        valorBruto: end.complemento,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== end.complemento.trim(),
      })
    }

    if (end.bairro) {
      const valAtual = usinaAtual.bairro
      lista.push({
        id: 'bairro',
        chaveUsina: 'bairro',
        categoria: 'endereco',
        label: 'Bairro',
        valorFormatado: end.bairro,
        valorBruto: end.bairro,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== end.bairro.trim(),
      })
    }

    if (end.cidade) {
      const valAtual = usinaAtual.cidade
      lista.push({
        id: 'cidade',
        chaveUsina: 'cidade',
        categoria: 'endereco',
        label: 'Cidade',
        valorFormatado: end.cidade,
        valorBruto: end.cidade,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== end.cidade.trim(),
      })
    }

    if (end.estado) {
      const valAtual = usinaAtual.estado
      lista.push({
        id: 'estado',
        chaveUsina: 'estado',
        categoria: 'endereco',
        label: 'Estado (UF)',
        valorFormatado: end.estado,
        valorBruto: end.estado,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== end.estado.trim(),
      })
    }

    if (end.cep) {
      const valAtual = usinaAtual.cep
      lista.push({
        id: 'cep',
        chaveUsina: 'cep',
        categoria: 'endereco',
        label: 'CEP',
        valorFormatado: end.cep,
        valorBruto: end.cep,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== end.cep.trim(),
      })
    }

    if (end.latitude !== null && end.latitude !== undefined && !isNaN(Number(end.latitude))) {
      const valAtual = usinaAtual.latitude
      const numLat = Number(end.latitude)
      lista.push({
        id: 'latitude',
        chaveUsina: 'latitude',
        categoria: 'endereco',
        label: 'Latitude (GPS)',
        valorFormatado: String(numLat),
        valorBruto: numLat,
        valorAtual: valAtual ? String(valAtual) : null,
        jaPreenchido: Boolean(valAtual && Number(valAtual) !== 0),
        diferente: valAtual !== numLat,
      })
    }

    if (end.longitude !== null && end.longitude !== undefined && !isNaN(Number(end.longitude))) {
      const valAtual = usinaAtual.longitude
      const numLng = Number(end.longitude)
      lista.push({
        id: 'longitude',
        chaveUsina: 'longitude',
        categoria: 'endereco',
        label: 'Longitude (GPS)',
        valorFormatado: String(numLng),
        valorBruto: numLng,
        valorAtual: valAtual ? String(valAtual) : null,
        jaPreenchido: Boolean(valAtual && Number(valAtual) !== 0),
        diferente: valAtual !== numLng,
      })
    }

    // 4. TITULAR / RESPONSÁVEL DA USINA
    if (cad.nome) {
      const valAtual = usinaAtual.titular_nome
      lista.push({
        id: 'titular_nome',
        chaveUsina: 'titular_nome',
        categoria: 'titular',
        label: 'Nome do Titular',
        valorFormatado: cad.nome,
        valorBruto: cad.nome,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== cad.nome.trim(),
      })
    }

    if (cad.cpf_cnpj) {
      const valAtual = usinaAtual.titular_cpf
      lista.push({
        id: 'titular_cpf',
        chaveUsina: 'titular_cpf',
        categoria: 'titular',
        label: 'CPF / CNPJ do Titular',
        valorFormatado: cad.cpf_cnpj,
        valorBruto: cad.cpf_cnpj,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== cad.cpf_cnpj.trim(),
      })
    }

    if (cad.telefone) {
      const valAtual = usinaAtual.titular_telefone
      lista.push({
        id: 'titular_telefone',
        chaveUsina: 'titular_telefone',
        categoria: 'titular',
        label: 'Telefone do Titular',
        valorFormatado: cad.telefone,
        valorBruto: cad.telefone,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== cad.telefone.trim(),
      })
    }

    if (cad.email) {
      const valAtual = usinaAtual.titular_email
      lista.push({
        id: 'titular_email',
        chaveUsina: 'titular_email',
        categoria: 'titular',
        label: 'E-mail do Titular',
        valorFormatado: cad.email,
        valorBruto: cad.email,
        valorAtual: valAtual || null,
        jaPreenchido: Boolean(valAtual?.trim()),
        diferente: valAtual?.trim() !== cad.email.trim(),
      })
    }

    return lista
  }

  const processarArquivo = async (file: File) => {
    setArquivo(file)
    setMensagemErro(null)
    setIsAnalisando(true)
    setProgressoTexto('Preparando documento e analisando conteúdo...')

    try {
      const res = await extrairDadosDocumento(file, {
        onProgress: (msg) => setProgressoTexto(msg),
      })

      if (!res.ok || !res.data) {
        setMensagemErro(
          res.message ||
            'Não foi possível extrair dados legíveis deste documento. Verifique se o arquivo possui texto nítido ou envie o PDF original.',
        )
        setCamposExtraidos([])
        return
      }

      const lista = mapearDadosParaCamposUsina(res.data, usina)

      if (lista.length === 0) {
        setMensagemErro(
          'O documento foi lido, mas nenhum dado técnico, de consumo, endereço ou titular correspondente à ficha da usina foi identificado. Nada foi inventado pelo sistema.',
        )
        setCamposExtraidos([])
        return
      }

      setCamposExtraidos(lista)
      // Selecionar todos os campos por padrão para conferência
      const selecaoInicial: Record<string, boolean> = {}
      lista.forEach((c) => {
        selecaoInicial[c.id] = true
      })
      setSelecionados(selecaoInicial)

      // Identificação inteligente de equipamentos extraídos no catálogo
      const tec = res.data.dados_tecnicos || {}
      const normalizar = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()

      // Verificar Módulo
      if (tec.fabricante_modulos || tec.modelo_modulos) {
        const fab = (tec.fabricante_modulos || '').trim()
        const mod = (tec.modelo_modulos || '').trim()
        const potCalc =
          tec.potencia_kwp && tec.numero_modulos
            ? Math.round((tec.potencia_kwp * 1000) / tec.numero_modulos)
            : 0

        const achado = catalogoEquipamentos.find((eq) => {
          if (eq.tipo !== 'modulo_fv') return false
          const eqFab = normalizar(eq.marca)
          const eqMod = normalizar(eq.modelo)
          const targetFab = normalizar(fab)
          const targetMod = normalizar(mod)
          return (
            (targetFab && eqFab.includes(targetFab)) ||
            (targetMod && eqMod.includes(targetMod)) ||
            (targetMod && targetMod.includes(eqMod))
          )
        })

        setSugestaoModulo({
          fabricante: fab,
          modelo: mod,
          potenciaW: potCalc,
          existente: achado || null,
        })
      } else {
        setSugestaoModulo(null)
      }

      // Verificar Inversor
      if (tec.fabricante_inversores || tec.modelo_inversores) {
        const fab = (tec.fabricante_inversores || '').trim()
        const mod = (tec.modelo_inversores || '').trim()
        const potW = tec.potencia_kwp ? Math.round(tec.potencia_kwp * 1000) : 5000

        const achado = catalogoEquipamentos.find((eq) => {
          if (eq.tipo !== 'inversor') return false
          const eqFab = normalizar(eq.marca)
          const eqMod = normalizar(eq.modelo)
          const targetFab = normalizar(fab)
          const targetMod = normalizar(mod)
          return (
            (targetFab && eqFab.includes(targetFab)) ||
            (targetMod && eqMod.includes(targetMod)) ||
            (targetMod && targetMod.includes(eqMod))
          )
        })

        setSugestaoInversor({
          fabricante: fab,
          modelo: mod,
          potenciaW: potW,
          existente: achado || null,
        })
      } else {
        setSugestaoInversor(null)
      }
    } catch (err: unknown) {
      console.error('[ModalImportarDocumentoUsina] Erro ao extrair:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao processar o documento.'
      setMensagemErro(msg)
      toast({
        title: 'Erro na extração',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsAnalisando(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsArrastando(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processarArquivo(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processarArquivo(e.target.files[0])
    }
  }

  const toggleCampo = (id: string) => {
    setSelecionados((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  const toggleCategoria = (categoria: CampoExtraidoUsina['categoria'], forcar?: boolean) => {
    const itens = camposExtraidos.filter((c) => c.categoria === categoria)
    const todosMarcados = itens.every((c) => selecionados[c.id])
    const novoValor = forcar !== undefined ? forcar : !todosMarcados
    setSelecionados((prev) => {
      const next = { ...prev }
      itens.forEach((c) => {
        next[c.id] = novoValor
      })
      return next
    })
  }

  const handleConfirmarImportacao = async () => {
    const escolhidos = camposExtraidos.filter((c) => selecionados[c.id])
    if (escolhidos.length === 0) {
      toast({
        title: 'Nenhum campo selecionado',
        description: 'Selecione ao menos um campo para aplicar na ficha da usina.',
        variant: 'destructive',
      })
      return
    }

    setIsSalvando(true)
    try {
      const updates: Partial<UsinaCliente> = {}
      const resumo: string[] = []

      // Converter arquivo para data URL permanente caso haja arquivo anexado
      let novoDocItem: import('@/types/crm').DocumentoUsinaItem | null = null
      if (arquivo) {
        let fileDataUrl = ''
        try {
          fileDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = (e) => reject(e)
            reader.readAsDataURL(arquivo)
          })
        } catch (e) {
          console.warn('[ModalImportarDocumentoUsina] Erro ao ler base64 do arquivo:', e)
        }

        // Categoria inferida
        let categoriaInferida:
          | 'projeto'
          | 'datasheet_inversor'
          | 'datasheet_modulo'
          | 'memorial'
          | 'fatura'
          | 'outro' = 'projeto'
        const lowerName = arquivo.name.toLowerCase()
        if (lowerName.includes('inversor') || lowerName.includes('inverter')) {
          categoriaInferida = 'datasheet_inversor'
        } else if (
          lowerName.includes('modulo') ||
          lowerName.includes('módulo') ||
          lowerName.includes('painel') ||
          lowerName.includes('placa')
        ) {
          categoriaInferida = 'datasheet_modulo'
        } else if (
          lowerName.includes('conta') ||
          lowerName.includes('fatura') ||
          lowerName.includes('rge') ||
          lowerName.includes('cpfl')
        ) {
          categoriaInferida = 'fatura'
        } else if (lowerName.includes('memorial') || lowerName.includes('art')) {
          categoriaInferida = 'memorial'
        }

        novoDocItem = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          nome_arquivo: arquivo.name,
          categoria: categoriaInferida,
          url: fileDataUrl || '',
          tamanho: arquivo.size,
          tipo_mime: arquivo.type || 'application/pdf',
          criado_em: new Date().toISOString(),
          origem: 'upload',
          observacoes:
            modoImportacao === 'adicionar'
              ? 'Adicionado à usina (ampliação/equipamento adicional)'
              : 'Importado por upload (substituição)',
        }
      }

      if (modoImportacao === 'adicionar') {
        // MODO ADICIONAR: Concatena à lista de documentos_usina e soma/anexa campos de texto e equipamentos
        const docsExistentes = Array.isArray(usina.documentos_usina)
          ? [...usina.documentos_usina]
          : []
        if (novoDocItem) {
          docsExistentes.push(novoDocItem)
        }
        updates.documentos_usina = docsExistentes

        escolhidos.forEach((item) => {
          resumo.push(`${item.label}: ${item.valorFormatado}`)

          // Regras especiais de concatenação / soma no modo adicionar:
          if (item.chaveUsina === 'inversores_info') {
            const atual = (usina.inversores_info || '').trim()
            const novoVal = String(item.valorBruto || '').trim()
            if (atual && novoVal && !atual.toLowerCase().includes(novoVal.toLowerCase())) {
              updates.inversores_info = `${atual} + ${novoVal} (Ampliação)`
            } else if (!atual) {
              updates.inversores_info = novoVal
            }
          } else if (item.chaveUsina === 'potencia_kwp') {
            const atual = Number(usina.potencia_kwp) || 0
            const novoVal = Number(item.valorBruto) || 0
            // Se já tem potência e veio um valor, somar
            if (atual > 0 && novoVal > 0) {
              updates.potencia_kwp = Number((atual + novoVal).toFixed(2))
            } else if (novoVal > 0) {
              updates.potencia_kwp = novoVal
            }
          } else if (item.chaveUsina === 'qtd_modulos') {
            const atual = Number(usina.qtd_modulos ?? usina.quantidade_placas) || 0
            const novoVal = Number(item.valorBruto) || 0
            if (atual > 0 && novoVal > 0) {
              updates.qtd_modulos = atual + novoVal
              updates.quantidade_placas = atual + novoVal
            } else if (novoVal > 0) {
              updates.qtd_modulos = novoVal
              updates.quantidade_placas = novoVal
            }
          } else if (item.chaveUsina === 'geracao_estimada_kwh') {
            const atual = Number(usina.geracao_estimada_kwh ?? usina.geracao_media_mensal_kwh) || 0
            const novoVal = Number(item.valorBruto) || 0
            if (atual > 0 && novoVal > 0) {
              updates.geracao_estimada_kwh = atual + novoVal
              updates.geracao_media_mensal_kwh = atual + novoVal
            } else if (novoVal > 0) {
              updates.geracao_estimada_kwh = novoVal
              updates.geracao_media_mensal_kwh = novoVal
            }
          } else {
            // Demais campos (ex: endereço, concessionária, titular, modelo de módulo):
            // se o campo na usina estiver vazio, preenche; se já tiver valor, mantém o existente ou atualiza caso não preenchido
            const valAtual = (usina as Record<string, unknown>)[item.chaveUsina]
            if (valAtual === undefined || valAtual === null || valAtual === '') {
              ;(updates as Record<string, unknown>)[item.chaveUsina] = item.valorBruto
            }
          }
        })
      } else {
        // MODO SOBRESCREVER: Comportamento padrão de substituição
        const docsExistentes = novoDocItem ? [novoDocItem] : usina.documentos_usina || []
        updates.documentos_usina = docsExistentes

        escolhidos.forEach((item) => {
          resumo.push(`${item.label}: ${item.valorFormatado}`)
          ;(updates as Record<string, unknown>)[item.chaveUsina] = item.valorBruto

          // Campos complementares retrocompatíveis
          if (item.chaveUsina === 'fabricante_modulos') {
            updates.marca_placas = String(item.valorBruto)
          }
          if (item.chaveUsina === 'qtd_modulos') {
            updates.quantidade_placas = Number(item.valorBruto)
          }
          if (item.chaveUsina === 'geracao_estimada_kwh') {
            updates.geracao_media_mensal_kwh = Number(item.valorBruto)
          }
          if (item.chaveUsina === 'consumo_kwh_mes') {
            updates.consumo_medio = Number(item.valorBruto)
          }
        })
      }

      await onApplyImport(updates, resumo, modoImportacao)

      // Propagar cidade, latitude, longitude e endereço para o cliente vinculado caso haja cliente_id
      if (usina.cliente_id) {
        try {
          await sincronizarUsinaComCliente(
            usina.cliente_id,
            {
              cidade: (updates.cidade as string) || usina.cidade,
              latitude: (updates.latitude as number) ?? usina.latitude,
              longitude: (updates.longitude as number) ?? usina.longitude,
              usina_endereco: (updates.endereco as string) || usina.endereco,
              endereco: (updates.endereco as string) || usina.endereco,
            },
            { isUsinaPrincipal: true },
          )
        } catch (syncErr) {
          console.warn(
            '[ModalImportarDocumentoUsina] Erro ao sincronizar dados com cliente:',
            syncErr,
          )
        }
      }

      // Se houver equipamentos existentes correspondentes, vincular como ativo da usina automaticamente
      // Verificando antes se já existe vínculo (usina_id + equipamento_id) e atualizando em vez de duplicar
      if (sugestaoModulo?.existente) {
        try {
          const qtd = updates.qtd_modulos ?? usina.qtd_modulos ?? 1
          await vincularEquipamentoUsina({
            usina_id: usina.id,
            equipamento_id: sugestaoModulo.existente.id,
            quantidade: Number(qtd),
            observacoes: 'Importado via documento técnico',
          })
        } catch (e) {
          console.warn('Erro ao auto-vincular módulo como ativo:', e)
        }
      }
      if (sugestaoInversor?.existente) {
        try {
          await vincularEquipamentoUsina({
            usina_id: usina.id,
            equipamento_id: sugestaoInversor.existente.id,
            quantidade: 1,
            observacoes: 'Importado via documento técnico',
          })
        } catch (e) {
          console.warn('Erro ao auto-vincular inversor como ativo:', e)
        }
      }

      toast({
        title: 'Ficha da usina atualizada!',
        description: `${escolhidos.length} campos importados do documento com sucesso.`,
      })

      handleFechar()
    } catch (err: unknown) {
      console.error('[ModalImportarDocumentoUsina] Erro ao salvar:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados na ficha da usina.'
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSalvando(false)
    }
  }

  const totalSelecionados = camposExtraidos.filter((c) => selecionados[c.id]).length
  const temDocsOuDadosExistentes = Boolean(
    (usina.documentos_usina && usina.documentos_usina.length > 0) ||
    usina.datasheet_inversor_url ||
    usina.datasheet_modulo_url ||
    (usina.inversores_info && usina.inversores_info.trim().length > 0) ||
    (usina.potencia_kwp && usina.potencia_kwp > 0),
  )

  const itensTecnicos = camposExtraidos.filter((c) => c.categoria === 'tecnico')
  const itensConsumo = camposExtraidos.filter((c) => c.categoria === 'consumo')
  const itensEndereco = camposExtraidos.filter((c) => c.categoria === 'endereco')
  const itensTitular = camposExtraidos.filter((c) => c.categoria === 'titular')

  return (
    <Dialog open={open} onOpenChange={(val) => (!val ? handleFechar() : onOpenChange(val))}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <UploadCloud className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <DialogTitle className="text-base font-extrabold text-[#0F2038]">
                Importar Dados da Usina por Documento
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Usina: <strong>{usina.nome}</strong> • Cliente: <strong>{clienteNome}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* 1. Área de Upload se ainda não há dados extraídos */}
          {!camposExtraidos.length && !isAnalisando && (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsArrastando(true)
              }}
              onDragLeave={() => setIsArrastando(false)}
              onDrop={handleDrop}
              onClick={() => inputArquivoRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
                isArrastando
                  ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
                  : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/30 bg-slate-50/60'
              }`}
            >
              <input
                ref={inputArquivoRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">
                    Selecione o documento técnico da usina
                  </p>
                  <p className="text-xs text-slate-500">
                    Arraste ou clique para anexar projeto da usina, memorial descritivo, ART, conta
                    de luz da UC ou planilha técnica.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Formatos aceitos: <strong>PDF</strong>, <strong>Imagens (JPG/PNG)</strong> e{' '}
                    <strong>Excel (.xlsx / .csv)</strong>
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-600 font-medium">
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" /> Potência e Inversores
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-500" /> Fabricante e Módulos
                  </span>
                  <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md shadow-2xs flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" /> Endereço e UC da Usina
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 2. Loading durante a análise */}
          {isAnalisando && (
            <div className="p-8 sm:p-10 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white text-center space-y-3.5 animate-in fade-in duration-200">
              <div className="relative w-12 h-12 mx-auto">
                <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
                <Sparkles className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  {progressoTexto || 'Lendo e analisando documento técnico...'}
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  A IA nativa está identificando exclusivamente os dados que constam no arquivo, sem
                  inventar nenhuma informação.
                </p>
              </div>
              {arquivo && (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs">
                  {getIconeArquivo(arquivo.name)}
                  <span className="truncate max-w-[220px]">{arquivo.name}</span>
                  <span className="text-[10px] text-slate-400">
                    ({formatTamanhoArquivo(arquivo.size)})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Mensagem de Erro / Aviso */}
          {mensagemErro && !isAnalisando && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <span className="font-bold">Aviso na leitura do documento:</span>
                  <p className="text-amber-800">{mensagemErro}</p>
                </div>
              </div>
              <div className="pt-1 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMensagemErro(null)
                    setArquivo(null)
                    inputArquivoRef.current?.click()
                  }}
                  className="text-xs bg-white border-amber-300 hover:bg-amber-100 text-amber-900 gap-1.5"
                >
                  <RotateCcw className="w-3 h-3" />
                  Tentar outro documento
                </Button>
              </div>
            </div>
          )}

          {/* 3. RESUMO DOS DADOS ENCONTRADOS ANTES DE SALVAR */}
          {camposExtraidos.length > 0 && !isAnalisando && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Card com arquivo analisado */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-2xs">
                    {arquivo ? (
                      getIconeArquivo(arquivo.name)
                    ) : (
                      <FileText className="w-5 h-5 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{arquivo?.name}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                        Documento Lido
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {arquivo && formatTamanhoArquivo(arquivo.size)} • {camposExtraidos.length}{' '}
                      campos técnicos identificados no documento
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCamposExtraidos([])
                    setArquivo(null)
                    setSelecionados({})
                  }}
                  className="text-xs gap-1 h-8"
                >
                  <RotateCcw className="w-3 h-3" />
                  Trocar arquivo
                </Button>
              </div>

              {/* Banner informativo de conferência */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-xs">
                    Confira o resumo dos dados encontrados antes de salvar
                  </p>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Apenas os campos marcados serão salvos na ficha da usina{' '}
                    <strong>{usina.nome}</strong>. Campos não encontrados no documento não são
                    inventados e permanecem em branco para preenchimento manual.
                  </p>
                </div>
              </div>

              {/* OPÇÃO DE IMPORTAÇÃO: ADICIONAR AOS EXISTENTES vs SOBRESCREVER */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#0F2038] flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#E0A838]" />
                    Modo de Importação na Usina
                  </span>
                  {temDocsOuDadosExistentes && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300">
                      Usina já possui equipamentos/documentos cadastrados
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Opção 1: Adicionar aos existentes */}
                  <div
                    onClick={() => setModoImportacao('adicionar')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      modoImportacao === 'adicionar'
                        ? 'border-emerald-600 bg-emerald-50/80 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        id="modo_adicionar"
                        name="modo_importacao"
                        checked={modoImportacao === 'adicionar'}
                        onChange={() => setModoImportacao('adicionar')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div className="space-y-1">
                        <label
                          htmlFor="modo_adicionar"
                          className="font-bold text-xs text-slate-900 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>Adicionar aos existentes</span>
                          <span className="text-[10px] font-bold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded">
                            Recomendado
                          </span>
                        </label>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Soma o novo documento à lista sem apagar nada. Anexa informações de novos
                          inversores (ex: ampliação) e soma potências/módulos quando aplicável.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Opção 2: Sobrescrever */}
                  <div
                    onClick={() => setModoImportacao('sobrescrever')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      modoImportacao === 'sobrescrever'
                        ? 'border-[#0F2038] bg-slate-100 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        id="modo_sobrescrever"
                        name="modo_importacao"
                        checked={modoImportacao === 'sobrescrever'}
                        onChange={() => setModoImportacao('sobrescrever')}
                        className="mt-0.5 text-[#0F2038] focus:ring-slate-500"
                      />
                      <div className="space-y-1">
                        <label
                          htmlFor="modo_sobrescrever"
                          className="font-bold text-xs text-slate-900 cursor-pointer"
                        >
                          Sobrescrever ficha e documento
                        </label>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Substitui os campos da usina e define este arquivo como o documento
                          técnico atual da usina.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contador de Seleção */}
              <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                <span>Marque ou desmarque os campos que deseja gravar na ficha:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {totalSelecionados} de {camposExtraidos.length} selecionados
                </span>
              </div>

              {/* Card de Gestão de Equipamentos como Ativos Identificados no Documento */}
              {(sugestaoModulo || sugestaoInversor) && (
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-300 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-xs text-emerald-950">
                        Equipamentos Identificados para Ativos da Usina
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      Catálogo de Ativos
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-900 leading-relaxed">
                    Os equipamentos abaixo foram encontrados no documento. Se já existirem no
                    catálogo, serão vinculados automaticamente como ativos da usina ao salvar. Caso
                    ainda não existam, você pode cadastrá-los na hora com 1 clique:
                  </p>

                  <div className="space-y-2 pt-1">
                    {/* Módulo Fotovoltaico */}
                    {sugestaoModulo && (
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-800 text-xs block truncate">
                              Módulo: {sugestaoModulo.fabricante || 'Fabricante não inf.'}{' '}
                              {sugestaoModulo.modelo || ''}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {sugestaoModulo.existente ? (
                                <span className="text-emerald-700 font-semibold">
                                  ✓ Encontrado no catálogo ({sugestaoModulo.existente.marca}{' '}
                                  {sugestaoModulo.existente.modelo}) — será vinculado como ativo
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold">
                                  Ainda não cadastrado no catálogo de equipamentos
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {!sugestaoModulo.existente && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalCriarRapido({
                                aberto: true,
                                tipo: 'modulo_fv',
                                fabricante: sugestaoModulo.fabricante,
                                modelo: sugestaoModulo.modelo,
                                potenciaW: sugestaoModulo.potenciaW || 550,
                              })
                            }
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Cadastrar Módulo na Hora</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Inversor */}
                    {sugestaoInversor && (
                      <div className="p-2.5 bg-white rounded-lg border border-emerald-200 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Cpu className="w-4 h-4 text-blue-600 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-slate-800 text-xs block truncate">
                              Inversor: {sugestaoInversor.fabricante || 'Fabricante não inf.'}{' '}
                              {sugestaoInversor.modelo || ''}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {sugestaoInversor.existente ? (
                                <span className="text-emerald-700 font-semibold">
                                  ✓ Encontrado no catálogo ({sugestaoInversor.existente.marca}{' '}
                                  {sugestaoInversor.existente.modelo}) — será vinculado como ativo
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold">
                                  Ainda não cadastrado no catálogo de equipamentos
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {!sugestaoInversor.existente && (
                          <button
                            type="button"
                            onClick={() =>
                              setModalCriarRapido({
                                aberto: true,
                                tipo: 'inversor',
                                fabricante: sugestaoInversor.fabricante,
                                modelo: sugestaoInversor.modelo,
                                potenciaW: sugestaoInversor.potenciaW || 5000,
                              })
                            }
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-2xs shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Cadastrar Inversor na Hora</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Categorias de Resumo */}
              <div className="space-y-3">
                {' '}
                {/* 1. Dados Técnicos */}
                {itensTecnicos.length > 0 && (
                  <CardCategoriaUsina
                    titulo="Dados Técnicos da Usina"
                    icone={<Zap className="w-4 h-4 text-amber-500" />}
                    itens={itensTecnicos}
                    selecionados={selecionados}
                    onToggleCampo={toggleCampo}
                    onToggleCategoria={(forcar) => toggleCategoria('tecnico', forcar)}
                  />
                )}
                {/* 2. Consumo e Concessionária */}
                {itensConsumo.length > 0 && (
                  <CardCategoriaUsina
                    titulo="Concessionária e Consumo"
                    icone={<Cpu className="w-4 h-4 text-purple-600" />}
                    itens={itensConsumo}
                    selecionados={selecionados}
                    onToggleCampo={toggleCampo}
                    onToggleCategoria={(forcar) => toggleCategoria('consumo', forcar)}
                  />
                )}
                {/* 3. Endereço da Usina */}
                {itensEndereco.length > 0 && (
                  <CardCategoriaUsina
                    titulo="Localização da Usina"
                    icone={<MapPin className="w-4 h-4 text-emerald-600" />}
                    itens={itensEndereco}
                    selecionados={selecionados}
                    onToggleCampo={toggleCampo}
                    onToggleCategoria={(forcar) => toggleCategoria('endereco', forcar)}
                  />
                )}
                {/* 4. Titular da Usina */}
                {itensTitular.length > 0 && (
                  <CardCategoriaUsina
                    titulo="Titular / Responsável da Usina"
                    icone={<User className="w-4 h-4 text-blue-600" />}
                    itens={itensTitular}
                    selecionados={selecionados}
                    onToggleCampo={toggleCampo}
                    onToggleCategoria={(forcar) => toggleCategoria('titular', forcar)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex items-center justify-between sm:justify-between w-full">
          <Button
            type="button"
            variant="outline"
            disabled={isSalvando}
            onClick={handleFechar}
            className="text-xs"
          >
            Cancelar
          </Button>

          {camposExtraidos.length > 0 && !isAnalisando && (
            <Button
              type="button"
              disabled={isSalvando || totalSelecionados === 0}
              onClick={handleConfirmarImportacao}
              className="bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-bold gap-1.5"
            >
              {isSalvando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando na Ficha...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmar e Salvar na Usina ({totalSelecionados})</span>
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Modal de cadastro rápido na hora da importação */}
      {modalCriarRapido.aberto && (
        <ModalCadastroEquipamentoRapido
          isOpen={modalCriarRapido.aberto}
          onClose={() => setModalCriarRapido((prev) => ({ ...prev, aberto: false }))}
          tipoInicial={modalCriarRapido.tipo}
          marcaInicial={modalCriarRapido.fabricante}
          modeloInicial={modalCriarRapido.modelo}
          potenciaInicial={modalCriarRapido.potenciaW}
          onEquipamentoCadastrado={async (novo) => {
            // Atualiza catálogo local e estado de sugestão
            const atualizados = await fetchEquipamentos()
            setCatalogoEquipamentos(atualizados)
            if (novo.tipo === 'modulo_fv') {
              setSugestaoModulo((prev) => (prev ? { ...prev, existente: novo } : null))
            } else if (novo.tipo === 'inversor') {
              setSugestaoInversor((prev) => (prev ? { ...prev, existente: novo } : null))
            }
            // Auto vincula imediatamente à usina como ativo
            try {
              await vincularEquipamentoUsina({
                usina_id: usina.id,
                equipamento_id: novo.id,
                quantidade: 1,
                observacoes: 'Cadastrado e vinculado durante importação do documento',
              })
              toast({
                title: 'Equipamento cadastrado e vinculado!',
                description: `${novo.marca} ${novo.modelo} foi salvo no catálogo e vinculado como ativo da usina.`,
              })
            } catch (err) {
              console.warn('Erro ao auto-vincular ativo recém criado:', err)
            }
          }}
        />
      )}
    </Dialog>
  )
}

interface CardCategoriaUsinaProps {
  titulo: string
  icone: React.ReactNode
  itens: CampoExtraidoUsina[]
  selecionados: Record<string, boolean>
  onToggleCampo: (id: string) => void
  onToggleCategoria: (forcar?: boolean) => void
}

const CardCategoriaUsina: React.FC<CardCategoriaUsinaProps> = ({
  titulo,
  icone,
  itens,
  selecionados,
  onToggleCampo,
  onToggleCategoria,
}) => {
  const todosMarcados = itens.every((i) => selecionados[i.id])
  const qtdMarcados = itens.filter((i) => selecionados[i.id]).length

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {icone}
          <span className="font-bold text-xs text-slate-800">{titulo}</span>
          <span className="text-[10px] text-slate-400 font-semibold">
            ({qtdMarcados}/{itens.length})
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleCategoria(!todosMarcados)}
          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {itens.map((item) => {
          const isMarcado = Boolean(selecionados[item.id])

          return (
            <div
              key={item.id}
              onClick={() => onToggleCampo(item.id)}
              className={`p-2.5 flex items-start gap-3 cursor-pointer transition-colors ${
                isMarcado
                  ? 'bg-emerald-50/20 hover:bg-emerald-50/30'
                  : 'hover:bg-slate-50 opacity-60'
              }`}
            >
              <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isMarcado}
                  onCheckedChange={() => onToggleCampo(item.id)}
                  aria-label={`Selecionar ${item.label}`}
                />
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {item.label}
                  </span>
                  <span className="font-bold text-slate-900 break-words">
                    {item.valorFormatado}
                  </span>
                </div>

                <div className="text-[11px]">
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    Valor atual na usina:
                  </span>
                  {item.jaPreenchido ? (
                    <span className="text-slate-600 italic">
                      {item.valorAtual}
                      {item.diferente && (
                        <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1 py-0.2 rounded border border-amber-200 not-italic">
                          será atualizado
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">Vazio (será preenchido)</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ModalImportarDocumentoUsina

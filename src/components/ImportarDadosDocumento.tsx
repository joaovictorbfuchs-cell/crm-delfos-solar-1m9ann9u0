import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Info,
  Check,
  Zap,
  MapPin,
  User,
  Activity,
  Layers,
  FileCheck,
} from 'lucide-react'
import {
  extrairDadosDocumento,
  type DocumentoExtraidoData,
  type ExtractDocumentResult,
} from '@/services/documentExtractionService'
import type { Cliente, Sistema, TelhadoTipo, TipoAtendimento, NumeroFases } from '@/types/crm'
import { toast } from '@/hooks/use-toast'

interface ImportarDadosDocumentoProps {
  cliente: Cliente
  sistema: Sistema | null
  onApplyImport: (applied: {
    clienteUpdates: Partial<Cliente>
    sistemaUpdates: Partial<Sistema>
    fileName: string
    resumoCampos: string[]
  }) => Promise<void>
  onClose?: () => void
}

type CategoriaId = 'dados_cadastrais' | 'endereco' | 'dados_tecnicos' | 'consumo'

interface ExtractedFieldItem {
  id: string
  categoria: CategoriaId
  label: string
  targetKey: string
  targetEntity: 'cliente' | 'sistema'
  extractedValue: string | number
  currentValue: string | number | null | undefined
  isAlreadyFilled: boolean
  isDifferent: boolean
}

export const ImportarDadosDocumento: React.FC<ImportarDadosDocumentoProps> = ({
  cliente,
  sistema,
  onApplyImport,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [extractionResult, setExtractionResult] = useState<ExtractDocumentResult | null>(null)
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Utilitário de formatação de tamanho de arquivo
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Ícone pelo tipo do arquivo
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return <ImageIcon className="w-5 h-5 text-emerald-600" />
    }
    if (['xlsx', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />
    }
    return <FileText className="w-5 h-5 text-blue-600" />
  }

  // Constrói lista de campos extraídos normalizados para a interface de revisão
  const buildFieldItems = (data: DocumentoExtraidoData): ExtractedFieldItem[] => {
    const items: ExtractedFieldItem[] = []

    // 1. Dados Cadastrais
    const cad = data.dados_cadastrais || {}
    if (cad.nome) {
      items.push({
        id: 'nome',
        categoria: 'dados_cadastrais',
        label: 'Nome Completo',
        targetKey: 'nome',
        targetEntity: 'cliente',
        extractedValue: cad.nome,
        currentValue: cliente.nome,
        isAlreadyFilled: Boolean(cliente.nome?.trim()),
        isDifferent: cliente.nome?.trim() !== cad.nome.trim(),
      })
    }
    if (cad.cpf_cnpj) {
      const isCnpj = cad.cpf_cnpj.replace(/\D/g, '').length > 11
      const key = isCnpj ? 'cnpj' : 'cpf'
      const curVal = isCnpj ? cliente.cnpj : cliente.cpf
      items.push({
        id: key,
        categoria: 'dados_cadastrais',
        label: isCnpj ? 'CNPJ' : 'CPF',
        targetKey: key,
        targetEntity: 'cliente',
        extractedValue: cad.cpf_cnpj,
        currentValue: curVal,
        isAlreadyFilled: Boolean(curVal?.trim()),
        isDifferent: curVal?.trim() !== cad.cpf_cnpj.trim(),
      })
    }
    if (cad.rg) {
      items.push({
        id: 'rg',
        categoria: 'dados_cadastrais',
        label: 'RG',
        targetKey: 'rg',
        targetEntity: 'cliente',
        extractedValue: cad.rg,
        currentValue: cliente.rg,
        isAlreadyFilled: Boolean(cliente.rg?.trim()),
        isDifferent: cliente.rg?.trim() !== cad.rg.trim(),
      })
    }
    if (cad.data_nascimento) {
      items.push({
        id: 'data_nascimento_fundacao',
        categoria: 'dados_cadastrais',
        label: 'Data de Nascimento / Fundação',
        targetKey: 'data_nascimento_fundacao',
        targetEntity: 'cliente',
        extractedValue: cad.data_nascimento,
        currentValue: cliente.data_nascimento_fundacao,
        isAlreadyFilled: Boolean(cliente.data_nascimento_fundacao?.trim()),
        isDifferent: cliente.data_nascimento_fundacao?.trim() !== cad.data_nascimento.trim(),
      })
    }
    if (cad.telefone) {
      items.push({
        id: 'telefone',
        categoria: 'dados_cadastrais',
        label: 'Telefone',
        targetKey: 'telefone',
        targetEntity: 'cliente',
        extractedValue: cad.telefone,
        currentValue: cliente.telefone,
        isAlreadyFilled: Boolean(cliente.telefone?.trim()),
        isDifferent: cliente.telefone?.trim() !== cad.telefone.trim(),
      })
    }
    if (cad.email) {
      items.push({
        id: 'email',
        categoria: 'dados_cadastrais',
        label: 'Email',
        targetKey: 'email',
        targetEntity: 'cliente',
        extractedValue: cad.email,
        currentValue: cliente.email,
        isAlreadyFilled: Boolean(cliente.email?.trim()),
        isDifferent: cliente.email?.trim() !== cad.email.trim(),
      })
    }

    // 2. Endereço
    const end = data.endereco || {}
    if (end.endereco) {
      items.push({
        id: 'endereco',
        categoria: 'endereco',
        label: 'Logradouro / Endereço',
        targetKey: 'endereco',
        targetEntity: 'cliente',
        extractedValue: end.endereco,
        currentValue: cliente.endereco,
        isAlreadyFilled: Boolean(cliente.endereco?.trim()),
        isDifferent: cliente.endereco?.trim() !== end.endereco.trim(),
      })
    }
    if (end.numero) {
      items.push({
        id: 'numero',
        categoria: 'endereco',
        label: 'Número',
        targetKey: 'numero',
        targetEntity: 'cliente',
        extractedValue: end.numero,
        currentValue: cliente.numero,
        isAlreadyFilled: Boolean(cliente.numero?.trim()),
        isDifferent: cliente.numero?.trim() !== end.numero.trim(),
      })
    }
    if (end.bairro) {
      items.push({
        id: 'bairro',
        categoria: 'endereco',
        label: 'Bairro',
        targetKey: 'bairro',
        targetEntity: 'cliente',
        extractedValue: end.bairro,
        currentValue: cliente.bairro,
        isAlreadyFilled: Boolean(cliente.bairro?.trim()),
        isDifferent: cliente.bairro?.trim() !== end.bairro.trim(),
      })
    }
    if (end.cidade) {
      items.push({
        id: 'cidade',
        categoria: 'endereco',
        label: 'Cidade',
        targetKey: 'cidade',
        targetEntity: 'cliente',
        extractedValue: end.cidade,
        currentValue: cliente.cidade,
        isAlreadyFilled: Boolean(cliente.cidade?.trim()),
        isDifferent: cliente.cidade?.trim() !== end.cidade.trim(),
      })
    }
    if (end.estado) {
      items.push({
        id: 'estado',
        categoria: 'endereco',
        label: 'Estado (UF)',
        targetKey: 'estado',
        targetEntity: 'cliente',
        extractedValue: end.estado,
        currentValue: cliente.estado,
        isAlreadyFilled: Boolean(cliente.estado?.trim()),
        isDifferent: cliente.estado?.trim() !== end.estado.trim(),
      })
    }
    if (end.cep) {
      items.push({
        id: 'cep',
        categoria: 'endereco',
        label: 'CEP',
        targetKey: 'cep',
        targetEntity: 'cliente',
        extractedValue: end.cep,
        currentValue: cliente.cep,
        isAlreadyFilled: Boolean(cliente.cep?.trim()),
        isDifferent: cliente.cep?.trim() !== end.cep.trim(),
      })
    }
    if (end.complemento) {
      items.push({
        id: 'complemento',
        categoria: 'endereco',
        label: 'Complemento',
        targetKey: 'complemento',
        targetEntity: 'cliente',
        extractedValue: end.complemento,
        currentValue: cliente.complemento,
        isAlreadyFilled: Boolean(cliente.complemento?.trim()),
        isDifferent: cliente.complemento?.trim() !== end.complemento.trim(),
      })
    }

    // 3. Dados Técnicos
    const tec = data.dados_tecnicos || {}
    if (tec.potencia_kwp !== null && tec.potencia_kwp !== undefined) {
      const curPot = sistema?.potencia_total_kwp ?? cliente.potencia_kwp
      items.push({
        id: 'potencia_kwp',
        categoria: 'dados_tecnicos',
        label: 'Potência Total (kWp)',
        targetKey: 'potencia_total_kwp',
        targetEntity: 'sistema',
        extractedValue: tec.potencia_kwp,
        currentValue: curPot ? `${curPot} kWp` : null,
        isAlreadyFilled: Boolean(curPot && curPot > 0),
        isDifferent: curPot !== tec.potencia_kwp,
      })
    }
    if (tec.numero_modulos !== null && tec.numero_modulos !== undefined) {
      const curMod = sistema?.quantidade_modulos ?? cliente.placas_qtd
      items.push({
        id: 'quantidade_modulos',
        categoria: 'dados_tecnicos',
        label: 'Quantidade de Módulos (Placas)',
        targetKey: 'quantidade_modulos',
        targetEntity: 'sistema',
        extractedValue: tec.numero_modulos,
        currentValue: curMod ? `${curMod} un` : null,
        isAlreadyFilled: Boolean(curMod && curMod > 0),
        isDifferent: curMod !== tec.numero_modulos,
      })
    }
    if (tec.fabricante_modulos) {
      const curFab = sistema?.fabricante_modulos ?? cliente.placas_marca
      items.push({
        id: 'fabricante_modulos',
        categoria: 'dados_tecnicos',
        label: 'Fabricante de Módulos',
        targetKey: 'fabricante_modulos',
        targetEntity: 'sistema',
        extractedValue: tec.fabricante_modulos,
        currentValue: curFab,
        isAlreadyFilled: Boolean(curFab?.trim()),
        isDifferent: curFab?.trim() !== tec.fabricante_modulos.trim(),
      })
    }
    if (tec.modelo_modulos) {
      const curModM = sistema?.modelo_modulos
      items.push({
        id: 'modelo_modulos',
        categoria: 'dados_tecnicos',
        label: 'Modelo de Módulos',
        targetKey: 'modelo_modulos',
        targetEntity: 'sistema',
        extractedValue: tec.modelo_modulos,
        currentValue: curModM,
        isAlreadyFilled: Boolean(curModM?.trim()),
        isDifferent: curModM?.trim() !== tec.modelo_modulos.trim(),
      })
    }
    if (tec.fabricante_inversores) {
      const curInv = sistema?.fabricante_inversores ?? cliente.inversor_marca
      items.push({
        id: 'fabricante_inversores',
        categoria: 'dados_tecnicos',
        label: 'Fabricante de Inversor',
        targetKey: 'fabricante_inversores',
        targetEntity: 'sistema',
        extractedValue: tec.fabricante_inversores,
        currentValue: curInv,
        isAlreadyFilled: Boolean(curInv?.trim()),
        isDifferent: curInv?.trim() !== tec.fabricante_inversores.trim(),
      })
    }
    if (tec.modelo_inversores) {
      const curModInv = sistema?.modelo_inversores ?? cliente.inversor_modelo
      items.push({
        id: 'modelo_inversores',
        categoria: 'dados_tecnicos',
        label: 'Modelo de Inversor',
        targetKey: 'modelo_inversores',
        targetEntity: 'sistema',
        extractedValue: tec.modelo_inversores,
        currentValue: curModInv,
        isAlreadyFilled: Boolean(curModInv?.trim()),
        isDifferent: curModInv?.trim() !== tec.modelo_inversores.trim(),
      })
    }
    if (tec.tipo_telhado) {
      const curTel = sistema?.tipo_telhado ?? cliente.telhado_tipo
      items.push({
        id: 'tipo_telhado',
        categoria: 'dados_tecnicos',
        label: 'Tipo de Telhado',
        targetKey: 'tipo_telhado',
        targetEntity: 'sistema',
        extractedValue: tec.tipo_telhado,
        currentValue: curTel,
        isAlreadyFilled: Boolean(curTel),
        isDifferent: curTel !== tec.tipo_telhado,
      })
    }
    if (tec.padrao_entrada) {
      items.push({
        id: 'padrao_entrada',
        categoria: 'dados_tecnicos',
        label: 'Padrão de Entrada',
        targetKey: 'padrao_entrada',
        targetEntity: 'sistema',
        extractedValue: tec.padrao_entrada,
        currentValue: sistema?.padrao_entrada,
        isAlreadyFilled: Boolean(sistema?.padrao_entrada?.trim()),
        isDifferent: sistema?.padrao_entrada?.trim() !== tec.padrao_entrada.trim(),
      })
    }
    if (tec.tipo_atendimento) {
      items.push({
        id: 'tipo_atendimento',
        categoria: 'dados_tecnicos',
        label: 'Tipo de Atendimento',
        targetKey: 'tipo_atendimento',
        targetEntity: 'sistema',
        extractedValue: tec.tipo_atendimento,
        currentValue: sistema?.tipo_atendimento,
        isAlreadyFilled: Boolean(sistema?.tipo_atendimento),
        isDifferent: sistema?.tipo_atendimento !== tec.tipo_atendimento,
      })
    }
    if (tec.numero_fases) {
      items.push({
        id: 'numero_fases',
        categoria: 'dados_tecnicos',
        label: 'Número de Fases',
        targetKey: 'numero_fases',
        targetEntity: 'sistema',
        extractedValue: tec.numero_fases,
        currentValue: sistema?.numero_fases,
        isAlreadyFilled: Boolean(sistema?.numero_fases),
        isDifferent: sistema?.numero_fases !== tec.numero_fases,
      })
    }
    if (tec.geracao_mensal_kwh !== null && tec.geracao_mensal_kwh !== undefined) {
      const curGer = sistema?.geracao_media_mensal_kwh
      items.push({
        id: 'geracao_media_mensal_kwh',
        categoria: 'dados_tecnicos',
        label: 'Geração Mensal Estimada (kWh)',
        targetKey: 'geracao_media_mensal_kwh',
        targetEntity: 'sistema',
        extractedValue: tec.geracao_mensal_kwh,
        currentValue: curGer ? `${curGer} kWh` : null,
        isAlreadyFilled: Boolean(curGer && curGer > 0),
        isDifferent: curGer !== tec.geracao_mensal_kwh,
      })
    }

    // 4. Consumo & Concessionária
    const con = data.consumo || {}
    if (con.uc) {
      const curUc = sistema?.numero_uc ?? cliente.uc
      items.push({
        id: 'uc',
        categoria: 'consumo',
        label: 'Unidade Consumidora (UC)',
        targetKey: 'uc',
        targetEntity: 'cliente',
        extractedValue: con.uc,
        currentValue: curUc,
        isAlreadyFilled: Boolean(curUc?.trim()),
        isDifferent: curUc?.trim() !== con.uc.trim(),
      })
    }
    if (con.consumo_kwh_mes !== null && con.consumo_kwh_mes !== undefined) {
      const curCons = cliente.consumo_kwh_mes
      items.push({
        id: 'consumo_kwh_mes',
        categoria: 'consumo',
        label: 'Consumo Médio (kWh/mês)',
        targetKey: 'consumo_kwh_mes',
        targetEntity: 'cliente',
        extractedValue: con.consumo_kwh_mes,
        currentValue: curCons ? `${curCons} kWh` : null,
        isAlreadyFilled: Boolean(curCons && curCons > 0),
        isDifferent: curCons !== con.consumo_kwh_mes,
      })
    }
    if (con.tarifa !== null && con.tarifa !== undefined) {
      const curTar = cliente.tarifa ?? sistema?.tarifa
      items.push({
        id: 'tarifa',
        categoria: 'consumo',
        label: 'Valor da Tarifa (R$/kWh)',
        targetKey: 'tarifa',
        targetEntity: 'cliente',
        extractedValue: con.tarifa,
        currentValue: curTar ? `R$ ${Number(curTar).toFixed(2)}` : null,
        isAlreadyFilled: Boolean(curTar && curTar > 0),
        isDifferent: curTar !== con.tarifa,
      })
    }
    if (con.classe_consumo) {
      const curCla = cliente.classe_consumo ?? sistema?.classe_consumo
      items.push({
        id: 'classe_consumo',
        categoria: 'consumo',
        label: 'Classe de Consumo',
        targetKey: 'classe_consumo',
        targetEntity: 'cliente',
        extractedValue: con.classe_consumo,
        currentValue: curCla,
        isAlreadyFilled: Boolean(curCla?.trim()),
        isDifferent: curCla?.trim() !== con.classe_consumo.trim(),
      })
    }
    if (con.concessionaria) {
      const curConc = cliente.concessionaria ?? sistema?.concessionaria
      items.push({
        id: 'concessionaria',
        categoria: 'consumo',
        label: 'Concessionária de Energia',
        targetKey: 'concessionaria',
        targetEntity: 'cliente',
        extractedValue: con.concessionaria,
        currentValue: curConc,
        isAlreadyFilled: Boolean(curConc?.trim()),
        isDifferent: curConc?.trim() !== con.concessionaria.trim(),
      })
    }

    return items
  }

  // Executa o processo de upload e análise com o agente
  const handleProcessFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setErrorMessage(null)
    setIsAnalyzing(true)
    setExtractionResult(null)

    try {
      const res = await extrairDadosDocumento(selectedFile)

      if (!res.ok || !res.data) {
        setErrorMessage(
          res.message ||
            'Não foi possível identificar dados estruturados neste documento. Tente outro arquivo mais nítido ou no formato PDF/XLSX/DOCX.',
        )
        setExtractionResult(null)
        return
      }

      setExtractionResult(res)

      // Marcar checkboxes inicialmente: todos os campos identificados são selecionados por padrão
      const fieldItems = buildFieldItems(res.data)
      const initialSelection: Record<string, boolean> = {}
      fieldItems.forEach((item) => {
        initialSelection[item.id] = true
      })
      setSelectedFields(initialSelection)

      if (fieldItems.length === 0) {
        setErrorMessage('Nenhum dado relevante para o cliente foi encontrado no documento.')
      }
    } catch (err: unknown) {
      console.error('Erro na extração de documento:', err)
      const msg = err instanceof Error ? err.message : 'Falha na conexão com o serviço de extração.'
      setErrorMessage(`Erro ao analisar documento: ${msg}`)
      toast({
        title: 'Erro na análise do documento',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0])
    }
  }

  const toggleSelectAll = (categoryItems: ExtractedFieldItem[], forceValue?: boolean) => {
    setSelectedFields((prev) => {
      const next = { ...prev }
      const shouldSelect =
        forceValue !== undefined ? forceValue : !categoryItems.every((item) => prev[item.id])

      categoryItems.forEach((item) => {
        next[item.id] = shouldSelect
      })
      return next
    })
  }

  const toggleField = (id: string) => {
    setSelectedFields((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Aplica os dados selecionados ao cliente e ao sistema
  const handleImportSelected = async () => {
    if (!extractionResult?.data || !file) return

    const fieldItems = buildFieldItems(extractionResult.data)
    const selectedItems = fieldItems.filter((item) => selectedFields[item.id])

    if (selectedItems.length === 0) {
      toast({
        title: 'Nenhum campo selecionado',
        description: 'Selecione ao menos um campo para realizar a importação.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)

    try {
      const clienteUpdates: Partial<Cliente> = {}
      const sistemaUpdates: Partial<Sistema> = {}
      const resumoCampos: string[] = []

      selectedItems.forEach((item) => {
        resumoCampos.push(`${item.label}: ${item.extractedValue}`)

        if (item.targetEntity === 'cliente') {
          // Tipagem segura para campos de cliente
          if (item.targetKey === 'nome') clienteUpdates.nome = String(item.extractedValue)
          else if (item.targetKey === 'cnpj') clienteUpdates.cnpj = String(item.extractedValue)
          else if (item.targetKey === 'cpf') clienteUpdates.cpf = String(item.extractedValue)
          else if (item.targetKey === 'rg') clienteUpdates.rg = String(item.extractedValue)
          else if (item.targetKey === 'data_nascimento_fundacao') {
            clienteUpdates.data_nascimento_fundacao = String(item.extractedValue)
          } else if (item.targetKey === 'telefone')
            clienteUpdates.telefone = String(item.extractedValue)
          else if (item.targetKey === 'email') clienteUpdates.email = String(item.extractedValue)
          else if (item.targetKey === 'endereco')
            clienteUpdates.endereco = String(item.extractedValue)
          else if (item.targetKey === 'numero') clienteUpdates.numero = String(item.extractedValue)
          else if (item.targetKey === 'bairro') clienteUpdates.bairro = String(item.extractedValue)
          else if (item.targetKey === 'cidade') clienteUpdates.cidade = String(item.extractedValue)
          else if (item.targetKey === 'estado') clienteUpdates.estado = String(item.extractedValue)
          else if (item.targetKey === 'cep') clienteUpdates.cep = String(item.extractedValue)
          else if (item.targetKey === 'complemento')
            clienteUpdates.complemento = String(item.extractedValue)
          else if (item.targetKey === 'uc') {
            clienteUpdates.uc = String(item.extractedValue)
            // Também sincroniza com sistema se aplicável
            sistemaUpdates.numero_uc = String(item.extractedValue)
          } else if (item.targetKey === 'consumo_kwh_mes') {
            clienteUpdates.consumo_kwh_mes = Number(item.extractedValue)
          } else if (item.targetKey === 'tarifa') {
            clienteUpdates.tarifa = Number(item.extractedValue)
            sistemaUpdates.tarifa = Number(item.extractedValue)
          } else if (item.targetKey === 'classe_consumo') {
            clienteUpdates.classe_consumo = String(item.extractedValue)
            sistemaUpdates.classe_consumo = String(item.extractedValue)
          } else if (item.targetKey === 'concessionaria') {
            clienteUpdates.concessionaria = String(item.extractedValue)
            sistemaUpdates.concessionaria = String(item.extractedValue)
          }
        } else if (item.targetEntity === 'sistema') {
          // Tipagem segura para campos de sistema
          if (item.targetKey === 'potencia_total_kwp') {
            const num = Number(item.extractedValue)
            sistemaUpdates.potencia_total_kwp = num
            sistemaUpdates.potencia_pico_modulos_kwp = num
            sistemaUpdates.potencia_pico_inversores_kwp = num
            clienteUpdates.potencia_kwp = num
          } else if (item.targetKey === 'quantidade_modulos') {
            const num = Number(item.extractedValue)
            sistemaUpdates.quantidade_modulos = num
            sistemaUpdates.quantidade_placas = num
            clienteUpdates.placas_qtd = num
          } else if (item.targetKey === 'fabricante_modulos') {
            const str = String(item.extractedValue)
            sistemaUpdates.fabricante_modulos = str
            sistemaUpdates.marca_placas = str
            clienteUpdates.placas_marca = str
          } else if (item.targetKey === 'modelo_modulos') {
            sistemaUpdates.modelo_modulos = String(item.extractedValue)
          } else if (item.targetKey === 'fabricante_inversores') {
            const str = String(item.extractedValue)
            sistemaUpdates.fabricante_inversores = str
            clienteUpdates.inversor_marca = str
          } else if (item.targetKey === 'modelo_inversores') {
            const str = String(item.extractedValue)
            sistemaUpdates.modelo_inversores = str
            clienteUpdates.inversor_modelo = str
          } else if (item.targetKey === 'tipo_telhado') {
            const val = item.extractedValue as TelhadoTipo
            sistemaUpdates.tipo_telhado = val
            clienteUpdates.telhado_tipo = val
          } else if (item.targetKey === 'padrao_entrada') {
            sistemaUpdates.padrao_entrada = String(item.extractedValue)
          } else if (item.targetKey === 'tipo_atendimento') {
            sistemaUpdates.tipo_atendimento = item.extractedValue as TipoAtendimento
          } else if (item.targetKey === 'numero_fases') {
            sistemaUpdates.numero_fases = item.extractedValue as NumeroFases
          } else if (item.targetKey === 'geracao_media_mensal_kwh') {
            sistemaUpdates.geracao_media_mensal_kwh = Number(item.extractedValue)
          }
        }
      })

      await onApplyImport({
        clienteUpdates,
        sistemaUpdates,
        fileName: file.name,
        resumoCampos,
      })

      toast({
        title: 'Dados importados com sucesso!',
        description: `${selectedItems.length} campos foram atualizados no cliente a partir do documento "${file.name}".`,
      })

      // Resetar estado
      setFile(null)
      setExtractionResult(null)
      setSelectedFields({})
      if (onClose) onClose()
    } catch (err: unknown) {
      console.error('Erro ao salvar dados importados:', err)
      const msg = err instanceof Error ? err.message : 'Falha ao gravar alterações no banco'
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const allItems = extractionResult?.data ? buildFieldItems(extractionResult.data) : []
  const cadItems = allItems.filter((i) => i.categoria === 'dados_cadastrais')
  const endItems = allItems.filter((i) => i.categoria === 'endereco')
  const tecItems = allItems.filter((i) => i.categoria === 'dados_tecnicos')
  const conItems = allItems.filter((i) => i.categoria === 'consumo')

  const totalSelectedCount = allItems.filter((i) => selectedFields[i.id]).length

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-xs p-4 sm:p-5 space-y-4">
      {/* Cabeçalho da Seção */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              Importar dados por documento
              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                IA Nativa
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Faça upload de contas de luz, CNH/RG ou planilhas para preenchimento automático
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-gray-400 hover:text-gray-700 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Fechar
          </button>
        )}
      </div>

      {/* 1. Área de Upload (quando não há resultado em análise ou para trocar arquivo) */}
      {!extractionResult && !isAnalyzing && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
              : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/20 bg-gray-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shadow-xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-800">
                Arraste um documento aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500">
                Formatos aceitos: <strong>PDF</strong>, <strong>Word (.docx)</strong>,{' '}
                <strong>Excel (.xlsx / .csv)</strong> e <strong>Imagens (JPG / PNG)</strong>
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-gray-600 font-medium">
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-md shadow-2xs flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" /> Conta de Luz (RGE, CPFL, Celesc...)
              </span>
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-md shadow-2xs flex items-center gap-1">
                <User className="w-3 h-3 text-blue-500" /> CNH / RG / Identidade
              </span>
              <span className="px-2 py-0.5 bg-white border border-gray-200 rounded-md shadow-2xs flex items-center gap-1">
                <FileSpreadsheet className="w-3 h-3 text-emerald-600" /> Planilha Solar / Orçamento
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Estado de Loading durante a análise */}
      {isAnalyzing && (
        <div className="p-8 sm:p-10 rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white text-center space-y-3.5 animate-in fade-in duration-200">
          <div className="relative w-12 h-12 mx-auto">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <Sparkles className="w-5 h-5 text-amber-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-gray-900">Analisando documento...</h4>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              O agente de IA está extraindo dados cadastrais, endereço da instalação, dados técnicos
              e histórico de consumo de energia.
            </p>
          </div>
          {file && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-2xs">
              {getFileIcon(file.name)}
              <span className="truncate max-w-[200px]">{file.name}</span>
              <span className="text-[10px] text-gray-400">({formatFileSize(file.size)})</span>
            </div>
          )}
        </div>
      )}

      {/* Mensagem de Erro com botão de tentar novamente */}
      {errorMessage && !isAnalyzing && (
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 space-y-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="font-bold">Aviso na extração:</span>
              <p className="text-amber-800">{errorMessage}</p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null)
                setFile(null)
                fileInputRef.current?.click()
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              Tentar outro documento
            </button>
          </div>
        </div>
      )}

      {/* 3. Tela de Revisão dos Dados Encontrados */}
      {extractionResult && extractionResult.data && !isAnalyzing && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Card com Preview do Arquivo Enviado */}
          <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white rounded-lg border border-gray-200 shadow-2xs">
                {file ? getFileIcon(file.name) : <FileText className="w-5 h-5 text-emerald-600" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-gray-900">{file?.name}</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold uppercase">
                    Analisado
                  </span>
                </div>
                <div className="text-[11px] text-gray-500">
                  {file && formatFileSize(file.size)} • {allItems.length} campos identificados
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setExtractionResult(null)
                setFile(null)
                setSelectedFields({})
              }}
              className="text-xs font-semibold text-gray-600 hover:text-gray-900 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Trocar arquivo
            </button>
          </div>

          <div className="text-xs text-gray-600 flex items-center justify-between">
            <span>
              Marque os campos que deseja importar para a ficha. Campos com destaque verde já
              possuem valor cadastrado.
            </span>
            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {totalSelectedCount} de {allItems.length} selecionados
            </span>
          </div>

          {/* Categorias em Cards */}
          <div className="space-y-3">
            {/* Categoria 1: Dados Cadastrais */}
            {cadItems.length > 0 && (
              <CategoriaCard
                titulo="Dados Cadastrais"
                icon={<User className="w-4 h-4 text-blue-600" />}
                items={cadItems}
                selectedFields={selectedFields}
                onToggleField={toggleField}
                onToggleSelectAll={(force) => toggleSelectAll(cadItems, force)}
              />
            )}

            {/* Categoria 2: Endereço */}
            {endItems.length > 0 && (
              <CategoriaCard
                titulo="Endereço"
                icon={<MapPin className="w-4 h-4 text-emerald-600" />}
                items={endItems}
                selectedFields={selectedFields}
                onToggleField={toggleField}
                onToggleSelectAll={(force) => toggleSelectAll(endItems, force)}
              />
            )}

            {/* Categoria 3: Dados Técnicos */}
            {tecItems.length > 0 && (
              <CategoriaCard
                titulo="Dados Técnicos"
                icon={<Zap className="w-4 h-4 text-amber-600" />}
                items={tecItems}
                selectedFields={selectedFields}
                onToggleField={toggleField}
                onToggleSelectAll={(force) => toggleSelectAll(tecItems, force)}
              />
            )}

            {/* Categoria 4: Consumo & Concessionária */}
            {conItems.length > 0 && (
              <CategoriaCard
                titulo="Consumo"
                icon={<Activity className="w-4 h-4 text-purple-600" />}
                items={conItems}
                selectedFields={selectedFields}
                onToggleField={toggleField}
                onToggleSelectAll={(force) => toggleSelectAll(conItems, force)}
              />
            )}
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center justify-between flex-wrap gap-2 border-t border-gray-100">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setExtractionResult(null)
                setFile(null)
                if (onClose) onClose()
              }}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={isSaving || totalSelectedCount === 0}
              onClick={handleImportSelected}
              className="px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importando e salvando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Importar dados selecionados ({totalSelectedCount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Subcomponente para renderizar cada categoria em card estruturado com checkboxes e badges
 */
interface CategoriaCardProps {
  titulo: string
  icon: React.ReactNode
  items: ExtractedFieldItem[]
  selectedFields: Record<string, boolean>
  onToggleField: (id: string) => void
  onToggleSelectAll: (force?: boolean) => void
}

const CategoriaCard: React.FC<CategoriaCardProps> = ({
  titulo,
  icon,
  items,
  selectedFields,
  onToggleField,
  onToggleSelectAll,
}) => {
  const allSelected = items.every((i) => selectedFields[i.id])
  const selectedCount = items.filter((i) => selectedFields[i.id]).length

  return (
    <div className="rounded-xl border border-gray-200/90 bg-white shadow-2xs overflow-hidden">
      {/* Cabeçalho do Card da Categoria */}
      <div className="bg-gray-50/80 px-4 py-2.5 border-b border-gray-200/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">{titulo}</span>
          <span className="text-[10px] bg-gray-200/70 text-gray-700 px-2 py-0.5 rounded-full font-semibold">
            {selectedCount}/{items.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onToggleSelectAll(!allSelected)}
          className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
      </div>

      {/* Lista de Campos Extraídos */}
      <div className="p-3 divide-y divide-gray-100">
        {items.map((item) => {
          const isChecked = Boolean(selectedFields[item.id])
          return (
            <div
              key={item.id}
              onClick={() => onToggleField(item.id)}
              className={`py-2 px-2.5 rounded-lg flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                isChecked
                  ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                  : 'hover:bg-gray-50 opacity-75'
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleField(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer h-4 w-4"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800">{item.label}</span>
                    {item.isAlreadyFilled && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-200 flex items-center gap-1">
                        <ShieldAlert className="w-2.5 h-2.5" />
                        campo já preenchido
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                    <div className="text-emerald-950 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-300 text-xs">
                      {String(item.extractedValue)}
                    </div>

                    {item.isAlreadyFilled && item.currentValue && (
                      <div className="text-gray-500 text-[11px] flex items-center gap-1">
                        <span>Atual:</span>
                        <span className="line-through text-gray-400 font-medium">
                          {String(item.currentValue)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isChecked ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {isChecked ? (item.isAlreadyFilled ? 'Sobrescrever' : 'Importar') : 'Ignorar'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

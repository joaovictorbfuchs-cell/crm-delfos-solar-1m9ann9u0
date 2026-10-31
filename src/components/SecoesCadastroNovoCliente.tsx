import React, { useRef, useState } from 'react'
import {
  FileText,
  Upload,
  Loader2,
  Sparkles,
  Building2,
  MapPin,
  Phone,
  Zap,
  RotateCw,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { formatarCNPJ } from '@/lib/orcamentoParser'
import {
  consultarCNPJReceita,
  type CnpjDataNormalized,
  limparCNPJ,
} from '@/services/cnpjLookupService'
import { extrairDadosDocumento } from '@/services/documentExtractionService'

export interface DadosCadastroNovoCliente {
  // (a) Dados cadastrais
  nome: string // Nome completo / Razão social
  nome_fantasia: string
  razao_social: string
  cnpj_cpf: string
  rg_ie: string // RG ou Inscrição Estadual
  rg: string
  inscricao_estadual: string
  endereco: string // Rua / Logradouro
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string // UF
  cep: string

  // (b) Contato
  telefone: string
  whatsapp: string
  email: string

  // (c) Dados de energia
  concessionaria: string
  uc: string // Número da UC / instalação
  consumo_kwh_mes: string // Média de consumo mensal em kWh
  tipo_fornecimento: string // Tipo de ligação (monofásico, bifásico, trifásico)
  potencia_kwp: string // Potência instalada ou estimada
}

export const DADOS_NOVO_CLIENTE_INICIAIS: DadosCadastroNovoCliente = {
  nome: '',
  nome_fantasia: '',
  razao_social: '',
  cnpj_cpf: '',
  rg_ie: '',
  rg: '',
  inscricao_estadual: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: 'Erechim',
  estado: 'RS',
  cep: '',
  telefone: '',
  whatsapp: '',
  email: '',
  concessionaria: 'RGE',
  uc: '',
  consumo_kwh_mes: '',
  tipo_fornecimento: 'trifásico',
  potencia_kwp: '',
}

interface SecoesCadastroNovoClienteProps {
  dados: DadosCadastroNovoCliente
  onChange: (novosDados: DadosCadastroNovoCliente) => void
  disabled?: boolean
}

export const SecoesCadastroNovoCliente: React.FC<SecoesCadastroNovoClienteProps> = ({
  dados,
  onChange,
  disabled = false,
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados da busca CNPJ
  const [isCnpjLoading, setIsCnpjLoading] = useState(false)
  const [cnpjStatusMsg, setCnpjStatusMsg] = useState<string | null>(null)
  const [cnpjConflitos, setCnpjConflitos] = useState<
    { campo: string; label: string; valorAtual: string; valorReceita: string }[]
  >([])
  const [dadosReceitaPendente, setDadosReceitaPendente] = useState<CnpjDataNormalized | null>(null)

  // Estados da extração de conta de energia
  const [isFaturaLoading, setIsFaturaLoading] = useState(false)
  const [faturaProgressMsg, setFaturaProgressMsg] = useState<string | null>(null)
  const [faturaStatusMsg, setFaturaStatusMsg] = useState<string | null>(null)

  const updateField = <K extends keyof DadosCadastroNovoCliente>(
    field: K,
    val: DadosCadastroNovoCliente[K],
  ) => {
    const next = { ...dados, [field]: val }

    // Se usuário alterou o consumo e não definiu potência manual, estima potência aproximada
    if (field === 'consumo_kwh_mes') {
      const consumoNum = Number(val)
      if (consumoNum > 0 && (!dados.potencia_kwp || dados.potencia_kwp === '0')) {
        next.potencia_kwp = (consumoNum / 120).toFixed(2)
      }
    }

    onChange(next)
  }

  // Aplicação de dados da Receita Federal
  const aplicarDadosReceita = (d: CnpjDataNormalized, sobrescrever = false) => {
    const next = { ...dados }
    const nomePrincipal = d.nome_fantasia || d.razao_social || ''

    if (sobrescrever || !next.nome) next.nome = nomePrincipal || next.nome
    if (sobrescrever || !next.razao_social) next.razao_social = d.razao_social || next.razao_social
    if (sobrescrever || !next.nome_fantasia)
      next.nome_fantasia = d.nome_fantasia || next.nome_fantasia
    if (sobrescrever || !next.endereco) next.endereco = d.logradouro || next.endereco
    if (sobrescrever || !next.numero) next.numero = d.numero || next.numero
    if (sobrescrever || !next.complemento) next.complemento = d.complemento || next.complemento
    if (sobrescrever || !next.bairro) next.bairro = d.bairro || next.bairro
    if (sobrescrever || !next.cidade) next.cidade = d.municipio || next.cidade
    if (sobrescrever || !next.estado) next.estado = d.uf || next.estado
    if (sobrescrever || !next.cep) next.cep = d.cep || next.cep
    if (d.telefone && (sobrescrever || !next.telefone)) {
      next.telefone = d.telefone
      if (!next.whatsapp || sobrescrever) next.whatsapp = d.telefone
    }
    if (d.email && (sobrescrever || !next.email)) next.email = d.email

    onChange(next)
    setCnpjConflitos([])
    setDadosReceitaPendente(null)
    setCnpjStatusMsg(`Dados de ${d.razao_social || nomePrincipal} preenchidos com sucesso!`)

    toast({
      title: 'Dados preenchidos pela BrasilAPI!',
      description: `${d.razao_social || nomePrincipal} localizado na Receita Federal.`,
    })
  }

  // Disparo de busca de CNPJ
  const handleConsultarCnpj = async (forcarSobrescrita = false) => {
    const raw = limparCNPJ(dados.cnpj_cpf)
    if (raw.length !== 14) return

    setIsCnpjLoading(true)
    setCnpjStatusMsg('Consultando BrasilAPI...')
    try {
      const res = await consultarCNPJReceita(raw)
      if (res.success && res.data) {
        const d = res.data

        if (forcarSobrescrita) {
          aplicarDadosReceita(d, true)
          return
        }

        // Verifica divergências com campos já preenchidos pelo usuário
        const conflitos: {
          campo: string
          label: string
          valorAtual: string
          valorReceita: string
        }[] = []
        const nomePrincipal = d.nome_fantasia || d.razao_social

        if (
          dados.nome.trim() &&
          nomePrincipal &&
          dados.nome.trim().toLowerCase() !== nomePrincipal.toLowerCase()
        ) {
          conflitos.push({
            campo: 'nome',
            label: 'Razão Social / Nome',
            valorAtual: dados.nome,
            valorReceita: nomePrincipal,
          })
        }
        if (
          dados.endereco.trim() &&
          d.logradouro &&
          dados.endereco.trim().toLowerCase() !== d.logradouro.toLowerCase()
        ) {
          conflitos.push({
            campo: 'endereco',
            label: 'Endereço',
            valorAtual: dados.endereco,
            valorReceita: d.logradouro,
          })
        }
        if (
          dados.cidade.trim() &&
          d.municipio &&
          dados.cidade.trim().toLowerCase() !== d.municipio.toLowerCase()
        ) {
          conflitos.push({
            campo: 'cidade',
            label: 'Cidade',
            valorAtual: dados.cidade,
            valorReceita: d.municipio,
          })
        }
        if (dados.cep.trim() && d.cep && limparCNPJ(dados.cep) !== limparCNPJ(d.cep)) {
          conflitos.push({
            campo: 'cep',
            label: 'CEP',
            valorAtual: dados.cep,
            valorReceita: d.cep,
          })
        }

        if (conflitos.length > 0) {
          setCnpjConflitos(conflitos)
          setDadosReceitaPendente(d)
          // Aplica campos que estão em branco sem sobrescrever os preenchidos
          aplicarDadosReceita(d, false)
        } else {
          aplicarDadosReceita(d, true)
        }
      } else if (res.notFound) {
        setCnpjStatusMsg('CNPJ não encontrado na Receita Federal.')
      } else {
        setCnpjStatusMsg(res.error || 'Não foi possível consultar os dados do CNPJ.')
      }
    } catch (err) {
      console.warn('[SecoesCadastroNovoCliente] Erro na consulta de CNPJ:', err)
      setCnpjStatusMsg('Falha ao consultar CNPJ. Preenchimento manual disponível.')
    } finally {
      setIsCnpjLoading(false)
    }
  }

  // Ao digitar ou colar CNPJ
  const handleCnpjChange = (rawVal: string) => {
    const digitos = rawVal.replace(/\D/g, '')
    // Se for 14 dígitos, formata como CNPJ; se 11, formata como CPF ou deixa editável
    let formatado = rawVal
    if (digitos.length <= 14 && digitos.length > 11) {
      formatado = formatarCNPJ(digitos)
    }
    updateField('cnpj_cpf', formatado)

    if (cnpjConflitos.length > 0) setCnpjConflitos([])
    if (cnpjStatusMsg) setCnpjStatusMsg(null)

    // Se completou 14 dígitos válidos agora, dispara a busca automática
    if (digitos.length === 14) {
      setTimeout(() => {
        handleConsultarCnpj(false)
      }, 100)
    }
  }

  // Importar pela conta de energia (reutilizando extrairDadosDocumento existente)
  const handleArquivoFatura = async (file: File) => {
    setIsFaturaLoading(true)
    setFaturaProgressMsg('Lendo arquivo da fatura...')
    setFaturaStatusMsg(null)

    try {
      const res = await extrairDadosDocumento(file, {
        onProgress: (msg) => setFaturaProgressMsg(msg),
      })

      if (res.ok && res.data) {
        const d = res.data
        const next = { ...dados }

        // Dados de energia extraídos pela IA
        if (d.consumo) {
          if (d.consumo.concessionaria) {
            next.concessionaria = d.consumo.concessionaria
          }
          if (d.consumo.uc) {
            next.uc = d.consumo.uc
          }
          if (d.consumo.consumo_kwh_mes !== null && d.consumo.consumo_kwh_mes !== undefined) {
            next.consumo_kwh_mes = String(Math.round(d.consumo.consumo_kwh_mes))
            // Estima potência se não tiver
            if (!next.potencia_kwp) {
              next.potencia_kwp = (d.consumo.consumo_kwh_mes / 120).toFixed(2)
            }
          }
        }

        // Tipo de ligação / fases extraído dos dados técnicos
        if (d.dados_tecnicos?.numero_fases) {
          next.tipo_fornecimento = d.dados_tecnicos.numero_fases
        }
        if (d.dados_tecnicos?.potencia_kwp) {
          next.potencia_kwp = String(d.dados_tecnicos.potencia_kwp)
        }

        // Se a fatura também tiver nome ou endereço e estiverem vazios no formulário, preenche
        if (d.dados_cadastrais?.nome && !next.nome) {
          next.nome = d.dados_cadastrais.nome
        }
        if (d.dados_cadastrais?.cpf_cnpj && !next.cnpj_cpf) {
          next.cnpj_cpf = d.dados_cadastrais.cpf_cnpj
        }
        if (d.endereco?.endereco && !next.endereco) {
          next.endereco = d.endereco.endereco
        }
        if (d.endereco?.numero && !next.numero) {
          next.numero = d.endereco.numero
        }
        if (d.endereco?.bairro && !next.bairro) {
          next.bairro = d.endereco.bairro
        }
        if (d.endereco?.cidade && !next.cidade) {
          next.cidade = d.endereco.cidade
        }
        if (d.endereco?.estado && !next.estado) {
          next.estado = d.endereco.estado
        }
        if (d.endereco?.cep && !next.cep) {
          next.cep = d.endereco.cep
        }

        onChange(next)
        setFaturaStatusMsg('Fatura lida com sucesso! Dados de energia preenchidos.')

        toast({
          title: 'Conta de energia extraída!',
          description: `UC ${next.uc || 'identificada'} • ${next.concessionaria} • ${next.consumo_kwh_mes ? `${next.consumo_kwh_mes} kWh/mês` : ''}`,
        })
      } else {
        setFaturaStatusMsg(
          res.message ||
            'Não foi possível ler a fatura automaticamente. Preencha os campos abaixo.',
        )
      }
    } catch (err: unknown) {
      console.warn('[SecoesCadastroNovoCliente] Erro na extração da fatura:', err)
      setFaturaStatusMsg(
        err instanceof Error
          ? err.message
          : 'Erro ao processar fatura de energia. Você pode preencher manualmente.',
      )
    } finally {
      setIsFaturaLoading(false)
      setFaturaProgressMsg(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const rawDigitsCnpj = limparCNPJ(dados.cnpj_cpf)
  const isCnpjValido = rawDigitsCnpj.length === 14

  return (
    <div className="space-y-4 pt-1 animate-in fade-in duration-150">
      {/* BANNER ATALHO: IMPORTAR PELA CONTA DE ENERGIA */}
      <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600 text-white rounded-lg shadow-xs">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-xs font-bold text-emerald-950 block">
              Importar dados pela Conta de Energia
            </span>
            <span className="text-[11px] text-emerald-800/80">
              Anexe PDF ou foto da fatura (RGE, CPFL, Celesc, etc.) para preenchimento via IA.
            </span>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleArquivoFatura(f)
          }}
          disabled={disabled || isFaturaLoading}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isFaturaLoading}
          className="h-8.5 px-3 text-xs font-bold bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:text-emerald-900 shrink-0 shadow-2xs"
        >
          {isFaturaLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5 text-emerald-700" />
              <span>{faturaProgressMsg || 'Analisando fatura...'}</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5 mr-1.5 text-emerald-700" />
              <span>Anexar Conta de Luz (PDF/Foto)</span>
            </>
          )}
        </Button>
      </div>

      {faturaStatusMsg && (
        <div
          className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            faturaStatusMsg.includes('sucesso')
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}
        >
          {faturaStatusMsg.includes('sucesso') ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>{faturaStatusMsg}</span>
        </div>
      )}

      {/* BANNER DE CONFLITO DA BRASILAPI / RECEITA FEDERAL */}
      {cnpjConflitos.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">
              A Receita Federal retornou dados diferentes dos já digitados ({cnpjConflitos.length}{' '}
              campos divergentes):
            </span>
          </div>

          <div className="bg-white/80 rounded-lg p-2 border border-amber-200 divide-y divide-amber-100 max-h-36 overflow-y-auto">
            {cnpjConflitos.map((c) => (
              <div key={c.campo} className="py-1 text-[11px] grid grid-cols-1 sm:grid-cols-3 gap-1">
                <span className="font-semibold text-slate-700">{c.label}:</span>
                <span className="text-slate-500 line-through truncate" title={c.valorAtual}>
                  Seu dado: {c.valorAtual || '(vazio)'}
                </span>
                <span
                  className="text-emerald-800 font-medium truncate sm:text-right"
                  title={c.valorReceita}
                >
                  Receita: {c.valorReceita}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setCnpjConflitos([])
                setDadosReceitaPendente(null)
              }}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg font-semibold text-[11px] transition-colors"
            >
              Manter meus dados
            </button>
            <button
              type="button"
              onClick={() => {
                if (dadosReceitaPendente) aplicarDadosReceita(dadosReceitaPendente, true)
              }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Usar dados da Receita
            </button>
          </div>
        </div>
      )}

      {/* SEÇÃO (A): DADOS CADASTRAIS */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            (a) Dados Cadastrais do Cliente
          </span>
          {isCnpjLoading && (
            <span className="text-[11px] font-medium text-emerald-700 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Buscando na BrasilAPI...
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* CNPJ / CPF com busca automática */}
          <div className="space-y-1 sm:col-span-1">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] font-bold text-slate-700">CNPJ / CPF *</Label>
              {isCnpjValido && !isCnpjLoading && (
                <button
                  type="button"
                  onClick={() => handleConsultarCnpj(true)}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-1"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Consultar BrasilAPI</span>
                </button>
              )}
            </div>
            <div className="relative">
              <Input
                type="text"
                value={dados.cnpj_cpf}
                onChange={(e) => handleCnpjChange(e.target.value)}
                onBlur={() => {
                  if (isCnpjValido && !isCnpjLoading && !dados.razao_social) {
                    handleConsultarCnpj(false)
                  }
                }}
                placeholder="00.000.000/0000-00 ou CPF"
                className="text-xs h-9 bg-white font-mono pr-8"
                disabled={disabled}
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                {isCnpjLoading ? (
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                ) : isCnpjValido ? (
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                ) : null}
              </div>
            </div>
            {cnpjStatusMsg && <p className="text-[10px] text-slate-500 pt-0.5">{cnpjStatusMsg}</p>}
          </div>

          {/* RG / Inscrição Estadual */}
          <div className="space-y-1 sm:col-span-1">
            <Label className="text-[11px] font-bold text-slate-700">
              RG / Inscrição Estadual (IE)
            </Label>
            <Input
              type="text"
              value={dados.rg_ie || dados.rg || dados.inscricao_estadual}
              onChange={(e) => {
                const val = e.target.value
                updateField('rg_ie', val)
                updateField('rg', val)
                updateField('inscricao_estadual', val)
              }}
              placeholder="Ex: 123456789 ou Isento"
              className="text-xs h-9 bg-white"
              disabled={disabled}
            />
          </div>

          {/* Razão Social / Nome Completo */}
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[11px] font-bold text-slate-700">
              Razão Social / Nome Completo *
            </Label>
            <Input
              type="text"
              value={dados.nome}
              onChange={(e) => {
                const val = e.target.value
                updateField('nome', val)
                if (!dados.razao_social) updateField('razao_social', val)
              }}
              placeholder="Ex: Empresa Solar Ltda ou Carlos Eduardo Silveira"
              className="text-xs h-9 bg-white font-medium"
              required
              disabled={disabled}
            />
          </div>

          {/* Nome Fantasia */}
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[11px] font-bold text-slate-700">
              Nome Fantasia (se houver)
            </Label>
            <Input
              type="text"
              value={dados.nome_fantasia}
              onChange={(e) => updateField('nome_fantasia', e.target.value)}
              placeholder="Ex: Delfos Engenharia"
              className="text-xs h-9 bg-white"
              disabled={disabled}
            />
          </div>
        </div>

        {/* Endereço Completo */}
        <div className="pt-1 space-y-2 border-t border-slate-200/60">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-emerald-600" />
            Endereço Completo
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            {/* Rua */}
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-[11px] text-slate-600">Rua / Logradouro</Label>
              <Input
                type="text"
                value={dados.endereco}
                onChange={(e) => updateField('endereco', e.target.value)}
                placeholder="Ex: Rua Espírito Santo"
                className="text-xs h-9 bg-white"
                disabled={disabled}
              />
            </div>

            {/* Número */}
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-[11px] text-slate-600">Número</Label>
              <Input
                type="text"
                value={dados.numero}
                onChange={(e) => updateField('numero', e.target.value)}
                placeholder="275"
                className="text-xs h-9 bg-white"
                disabled={disabled}
              />
            </div>

            {/* Complemento */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[11px] text-slate-600">Complemento</Label>
              <Input
                type="text"
                value={dados.complemento}
                onChange={(e) => updateField('complemento', e.target.value)}
                placeholder="Sala 101, Galpão A..."
                className="text-xs h-9 bg-white"
                disabled={disabled}
              />
            </div>

            {/* Bairro */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[11px] text-slate-600">Bairro</Label>
              <Input
                type="text"
                value={dados.bairro}
                onChange={(e) => updateField('bairro', e.target.value)}
                placeholder="Centro"
                className="text-xs h-9 bg-white"
                disabled={disabled}
              />
            </div>

            {/* Cidade */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-[11px] text-slate-600">Cidade</Label>
              <Input
                type="text"
                value={dados.cidade}
                onChange={(e) => updateField('cidade', e.target.value)}
                placeholder="Erechim"
                className="text-xs h-9 bg-white"
                disabled={disabled}
              />
            </div>

            {/* UF */}
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-[11px] text-slate-600">UF</Label>
              <Input
                type="text"
                maxLength={2}
                value={dados.estado}
                onChange={(e) => updateField('estado', e.target.value.toUpperCase())}
                placeholder="RS"
                className="text-xs h-9 bg-white uppercase font-mono"
                disabled={disabled}
              />
            </div>

            {/* CEP */}
            <div className="space-y-1 sm:col-span-1">
              <Label className="text-[11px] text-slate-600">CEP</Label>
              <Input
                type="text"
                value={dados.cep}
                onChange={(e) => updateField('cep', e.target.value)}
                placeholder="99709-296"
                className="text-xs h-9 bg-white font-mono"
                disabled={disabled}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO (B): CONTATO */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="border-b border-slate-200 pb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            (b) Contato
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Telefone */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">
              Telefone Fixo / Celular *
            </Label>
            <Input
              type="text"
              value={dados.telefone}
              onChange={(e) => {
                const formatted = formatWhatsAppPhone(e.target.value)
                updateField('telefone', formatted)
                if (!dados.whatsapp) updateField('whatsapp', formatted)
              }}
              placeholder="(54) 3522-0000"
              className="text-xs h-9 bg-white"
              required
              disabled={disabled}
            />
          </div>

          {/* WhatsApp */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">WhatsApp</Label>
            <Input
              type="text"
              value={dados.whatsapp}
              onChange={(e) => updateField('whatsapp', formatWhatsAppPhone(e.target.value))}
              placeholder="(54) 99999-0000"
              className="text-xs h-9 bg-white"
              disabled={disabled}
            />
          </div>

          {/* E-mail */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">E-mail</Label>
            <Input
              type="email"
              value={dados.email}
              onChange={(e) => updateField('email', e.target.value.toLowerCase())}
              placeholder="cliente@email.com.br"
              className="text-xs h-9 bg-white"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO (C): DADOS DE ENERGIA */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            (c) Dados de Energia da Instalação
          </span>
          <span className="text-[10px] text-slate-500">
            Alimenta a ficha técnica e o dimensionamento da usina
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* Concessionária */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">Concessionária</Label>
            <Input
              type="text"
              value={dados.concessionaria}
              onChange={(e) => updateField('concessionaria', e.target.value)}
              placeholder="RGE, CPFL, Celesc, Copel..."
              className="text-xs h-9 bg-white"
              disabled={disabled}
            />
          </div>

          {/* Unidade Consumidora (UC) */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">
              Nº Unidade Consumidora / Instalação (UC)
            </Label>
            <Input
              type="text"
              value={dados.uc}
              onChange={(e) => updateField('uc', e.target.value)}
              placeholder="Ex: 200.419.001-19"
              className="text-xs h-9 bg-white font-mono"
              disabled={disabled}
            />
          </div>

          {/* Média de Consumo Mensal em kWh */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">
              Média de Consumo Mensal (kWh)
            </Label>
            <Input
              type="number"
              min="0"
              step="1"
              value={dados.consumo_kwh_mes}
              onChange={(e) => updateField('consumo_kwh_mes', e.target.value)}
              placeholder="Ex: 850"
              className="text-xs h-9 bg-white"
              disabled={disabled}
            />
          </div>

          {/* Tipo de Ligação (Monofásico, Bifásico, Trifásico) */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-slate-700">Tipo de Ligação</Label>
            <select
              value={dados.tipo_fornecimento}
              onChange={(e) => updateField('tipo_fornecimento', e.target.value)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 h-9"
              disabled={disabled}
            >
              <option value="monofásico">Monofásico</option>
              <option value="bifásico">Bifásico</option>
              <option value="trifásico">Trifásico</option>
            </select>
          </div>

          {/* Potência Instalada ou Estimada */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <Label className="text-[11px] font-bold text-slate-700">
              Potência Instalada / Estimada (kWp)
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={dados.potencia_kwp}
              onChange={(e) => updateField('potencia_kwp', e.target.value)}
              placeholder="Ex: 7.08"
              className="text-xs h-9 bg-white"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

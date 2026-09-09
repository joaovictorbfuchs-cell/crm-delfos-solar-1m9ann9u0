import React from 'react'
import {
  X,
  MapPin,
  Phone,
  Home,
  FileText,
  Calendar,
  Zap,
  Cpu,
  Layers,
  Image as ImageIcon,
  Clock,
  Wrench,
  Droplets,
  Settings,
  Mail,
  User,
  Building,
  Hash,
  Compass,
  Activity,
  Gauge,
  Sun,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { formatDate, formatDateTime, getTelhadoLabel } from '@/lib/formatters'
import { StatusBadge, ProductBadge } from './StatusBadge'
import { InlineEditField } from './InlineEditField'
import type {
  Cliente,
  Sistema,
  OrigemLeadTipo,
  ProdutoTipo,
  TelhadoTipo,
  TipoAtendimento,
  NumeroFases,
} from '@/types/crm'

const PRODUTOS: ProdutoTipo[] = [
  'Energia Solar',
  'Plano de O&M',
  'Sistemas Híbridos',
  'Carregadores veiculares',
  'Manutenção avulsa',
]

const ORIGENS: OrigemLeadTipo[] = ['Facebook', 'Instagram', 'Indicação', 'Site', 'Outro']

const TELHADOS: { value: TelhadoTipo; label: string }[] = [
  { value: 'ceramico', label: 'Cerâmico' },
  { value: 'metalico', label: 'Metálico' },
  { value: 'laje', label: 'Laje' },
  { value: 'fibrocimento', label: 'Fibrocimento' },
]

const ATENDIMENTOS: { value: TipoAtendimento; label: string }[] = [
  { value: 'aéreo', label: 'Aéreo' },
  { value: 'subterrâneo', label: 'Subterrâneo' },
]

const FASES: { value: NumeroFases; label: string }[] = [
  { value: 'monofásico', label: 'Monofásico' },
  { value: 'bifásico', label: 'Bifásico' },
  { value: 'trifásico', label: 'Trifásico' },
]

export const FichaClienteDrawer: React.FC = () => {
  const {
    selectedCliente,
    selectedClienteId,
    selectedSistema,
    closeFichaCliente,
    manutencoes,
    atividades,
    updateCliente,
    updateSistema,
  } = useClientes()

  if (!selectedClienteId || !selectedCliente) {
    return null
  }

  const handleUpdateClienteField = async (field: keyof Cliente, value: unknown) => {
    await updateCliente(selectedCliente.id, { [field]: value } as Partial<Cliente>)
  }

  const handleUpdateSistemaField = async (field: keyof Sistema, value: unknown) => {
    await updateSistema(selectedCliente.id, { [field]: value } as Partial<Sistema>)
    // Se for potência, data de instalação, telhado ou UC, sincronizar também em clientes para manter consistência
    if (field === 'potencia_total_kwp') {
      await updateCliente(selectedCliente.id, { potencia_kwp: Number(value) || 0 })
    } else if (field === 'numero_uc') {
      await updateCliente(selectedCliente.id, { uc: String(value || '') })
    } else if (field === 'data_instalacao') {
      await updateCliente(selectedCliente.id, { data_instalacao: String(value || '') })
    } else if (field === 'tipo_telhado') {
      await updateCliente(selectedCliente.id, { telhado_tipo: value as TelhadoTipo })
    }
  }

  // Filter client's activities and sort by data
  const clientAtividades = atividades
    .filter((a) => a.cliente_id === selectedCliente.id)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

  // Filter client's maintenances and sort descending by date (most recent first)
  const clientManutencoes = manutencoes
    .filter((m) => m.cliente_id === selectedCliente.id)
    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  const getServiceIcon = (tipo: string) => {
    switch (tipo) {
      case 'Limpeza':
        return <Droplets className="w-4 h-4 text-blue-500" />
      case 'Revisão Elétrica':
        return <Zap className="w-4 h-4 text-amber-500" />
      case 'Troca de Inversor':
        return <Settings className="w-4 h-4 text-purple-500" />
      default:
        return <Wrench className="w-4 h-4 text-gray-500" />
    }
  }

  // Fallbacks para campos do sistema a partir de clientes se sistema ainda estiver preenchendo
  const potenciaExibida = selectedSistema?.potencia_total_kwp ?? selectedCliente.potencia_kwp ?? 0
  const geracaoExibida =
    selectedSistema?.geracao_media_mensal_kwh ??
    (potenciaExibida > 0 ? Math.round(potenciaExibida * 125) : 0)
  const dataInstalacaoExibida =
    selectedSistema?.data_instalacao || selectedCliente.data_instalacao || ''
  const ucExibida = selectedSistema?.numero_uc || selectedCliente.uc || ''
  const telhadoExibido = selectedSistema?.tipo_telhado || selectedCliente.telhado_tipo || 'ceramico'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Dark overlay backdrop with fade */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={closeFichaCliente}
        aria-hidden="true"
      />

      {/* Drawer panel (780px / max 90vw on desktop, full screen on mobile) */}
      <div className="relative z-50 w-full sm:w-[780px] max-w-full sm:max-w-[90vw] bg-white h-full shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-250 ease-out">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between bg-white sticky top-0 z-20">
          <div className="space-y-1.5 pr-3 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <InlineEditField
                value={selectedCliente.nome}
                displayValue={
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                    {selectedCliente.nome}
                  </h2>
                }
                type="text"
                placeholder="Nome do cliente"
                onSave={async (val) => {
                  const str = String(val).trim()
                  if (!str) throw new Error('O nome não pode ficar vazio')
                  await handleUpdateClienteField('nome', str)
                }}
              />
              <StatusBadge status={selectedCliente.status} />
              <InlineEditField
                value={selectedCliente.produto || 'Energia Solar'}
                displayValue={
                  <ProductBadge produto={selectedCliente.produto || 'Energia Solar'} size="md" />
                }
                type="select"
                options={PRODUTOS.map((p) => ({ value: p, label: p }))}
                onSave={async (val) => handleUpdateClienteField('produto', val as ProdutoTipo)}
              />
            </div>

            <div className="flex items-center text-xs text-gray-500 gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <InlineEditField
                  value={selectedCliente.cidade}
                  displayValue={<span>{selectedCliente.cidade || 'Sem cidade'}</span>}
                  type="text"
                  placeholder="Cidade/UF"
                  onSave={async (val) => handleUpdateClienteField('cidade', String(val))}
                />
              </div>
              <span className="text-gray-300">•</span>
              <InlineEditField
                value={potenciaExibida}
                displayValue={
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                    {potenciaExibida} kWp
                  </span>
                }
                type="number"
                step="0.1"
                min={0}
                unit="kWp"
                placeholder="0"
                onSave={async (val) => handleUpdateSistemaField('potencia_total_kwp', Number(val))}
              />
              {geracaoExibida > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    {geracaoExibida} kWh/mês
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={closeFichaCliente}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Fechar"
            aria-label="Fechar ficha do cliente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F8FAF9]/60">
          {/* ======================================================== */}
          {/* SEÇÃO 1: DADOS CADASTRAIS                                */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                Dados Cadastrais
              </h3>
              <span className="text-[10px] uppercase font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                Pessoa Física / Jurídica
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              {/* Nome do Cliente */}
              <div className="flex items-center gap-2.5">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-28 shrink-0">Nome do cliente:</span>
                <InlineEditField
                  value={selectedCliente.nome}
                  displayValue={
                    <span className="font-semibold text-gray-800">{selectedCliente.nome}</span>
                  }
                  type="text"
                  placeholder="Nome do cliente"
                  onSave={async (val) => handleUpdateClienteField('nome', String(val))}
                />
              </div>

              {/* Nome Fantasia */}
              <div className="flex items-center gap-2.5">
                <Building className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-28 shrink-0">Nome fantasia:</span>
                <InlineEditField
                  value={selectedCliente.nome_fantasia}
                  displayValue={
                    <span className="font-medium text-gray-800">
                      {selectedCliente.nome_fantasia || 'Não informado'}
                    </span>
                  }
                  type="text"
                  placeholder="Nome comercial ou da fazenda"
                  onSave={async (val) => handleUpdateClienteField('nome_fantasia', String(val))}
                />
              </div>

              {/* Razão Social */}
              <div className="flex items-center gap-2.5">
                <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-28 shrink-0">Razão social:</span>
                <InlineEditField
                  value={selectedCliente.razao_social}
                  displayValue={
                    <span className="font-medium text-gray-800">
                      {selectedCliente.razao_social || 'Não informada'}
                    </span>
                  }
                  type="text"
                  placeholder="Razão social completa"
                  onSave={async (val) => handleUpdateClienteField('razao_social', String(val))}
                />
              </div>

              {/* CNPJ e CPF em grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 w-16 shrink-0">CNPJ:</span>
                  <InlineEditField
                    value={selectedCliente.cnpj}
                    displayValue={
                      <span className="font-mono text-gray-800 bg-gray-50 px-1.5 py-0.5 rounded text-[11px] border border-gray-100">
                        {selectedCliente.cnpj || 'Não informado'}
                      </span>
                    }
                    type="text"
                    placeholder="00.000.000/0000-00"
                    onSave={async (val) => handleUpdateClienteField('cnpj', String(val))}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 w-12 shrink-0">CPF:</span>
                  <InlineEditField
                    value={selectedCliente.cpf}
                    displayValue={
                      <span className="font-mono text-gray-800 bg-gray-50 px-1.5 py-0.5 rounded text-[11px] border border-gray-100">
                        {selectedCliente.cpf || 'Não informado'}
                      </span>
                    }
                    type="text"
                    placeholder="000.000.000-00"
                    onSave={async (val) => handleUpdateClienteField('cpf', String(val))}
                  />
                </div>
              </div>

              {/* Inscrição Estadual e RG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 w-16 shrink-0">Inscr. Est.:</span>
                  <InlineEditField
                    value={selectedCliente.inscricao_estadual}
                    displayValue={
                      <span className="text-gray-800">
                        {selectedCliente.inscricao_estadual || 'Não informada'}
                      </span>
                    }
                    type="text"
                    placeholder="Ex: 039/0129482 ou Isento"
                    onSave={async (val) =>
                      handleUpdateClienteField('inscricao_estadual', String(val))
                    }
                  />
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 w-12 shrink-0">RG:</span>
                  <InlineEditField
                    value={selectedCliente.rg}
                    displayValue={
                      <span className="text-gray-800">{selectedCliente.rg || 'Não informado'}</span>
                    }
                    type="text"
                    placeholder="Número do RG"
                    onSave={async (val) => handleUpdateClienteField('rg', String(val))}
                  />
                </div>
              </div>

              {/* Data de Nascimento ou Fundação */}
              <div className="flex items-center gap-2.5 pt-1 border-t border-gray-50">
                <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-28 shrink-0">Nasc./Fundação:</span>
                <InlineEditField
                  value={selectedCliente.data_nascimento_fundacao}
                  displayValue={
                    <span className="font-medium text-gray-800">
                      {selectedCliente.data_nascimento_fundacao
                        ? formatDate(selectedCliente.data_nascimento_fundacao)
                        : 'Não informada'}
                    </span>
                  }
                  type="date"
                  placeholder="DD/MM/AAAA"
                  onSave={async (val) =>
                    handleUpdateClienteField('data_nascimento_fundacao', String(val))
                  }
                />
              </div>

              {/* Contato Principal */}
              <div className="flex items-center gap-2.5">
                <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-28 shrink-0">Contato:</span>
                <InlineEditField
                  value={selectedCliente.contato}
                  displayValue={
                    <span className="font-medium text-gray-800">
                      {selectedCliente.contato || 'Não informado'}
                    </span>
                  }
                  type="text"
                  placeholder="Nome do responsável ou sócio"
                  onSave={async (val) => handleUpdateClienteField('contato', String(val))}
                />
              </div>

              {/* Email */}
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-28 shrink-0">Email:</span>
                <InlineEditField
                  value={selectedCliente.email}
                  displayValue={
                    <span className="text-emerald-700 font-medium">
                      {selectedCliente.email || 'Não informado'}
                    </span>
                  }
                  type="text"
                  placeholder="email@exemplo.com.br"
                  onSave={async (val) => handleUpdateClienteField('email', String(val))}
                />
              </div>

              {/* Telefone */}
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="text-gray-500 w-28 shrink-0">Telefone:</span>
                <InlineEditField
                  value={selectedCliente.telefone}
                  displayValue={
                    <span className="font-medium text-gray-800">
                      {selectedCliente.telefone || 'Não informado'}
                    </span>
                  }
                  type="text"
                  placeholder="(00) 00000-0000"
                  onSave={async (val) => handleUpdateClienteField('telefone', String(val))}
                />
              </div>

              {/* Endereço Detalhado: CEP, Estado, Bairro, Número, Complemento */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                  Endereço Cadastral
                </span>

                <div className="flex items-center gap-2.5">
                  <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-gray-500 w-28 shrink-0">Logradouro:</span>
                  <InlineEditField
                    value={selectedCliente.endereco}
                    displayValue={
                      <span className="font-medium text-gray-800">
                        {selectedCliente.endereco || 'Não informado'}
                      </span>
                    }
                    type="text"
                    placeholder="Rua, Avenida, Rodovia..."
                    className="flex-1"
                    onSave={async (val) => handleUpdateClienteField('endereco', String(val))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0 pl-5">Número:</span>
                    <InlineEditField
                      value={selectedCliente.numero}
                      displayValue={
                        <span className="text-gray-800">{selectedCliente.numero || 'S/N'}</span>
                      }
                      type="text"
                      placeholder="Nº"
                      onSave={async (val) => handleUpdateClienteField('numero', String(val))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Bairro:</span>
                    <InlineEditField
                      value={selectedCliente.bairro}
                      displayValue={
                        <span className="text-gray-800">
                          {selectedCliente.bairro || 'Não inf.'}
                        </span>
                      }
                      type="text"
                      placeholder="Bairro"
                      onSave={async (val) => handleUpdateClienteField('bairro', String(val))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0 pl-5">CEP:</span>
                    <InlineEditField
                      value={selectedCliente.cep}
                      displayValue={
                        <span className="font-mono text-gray-800 text-[11px]">
                          {selectedCliente.cep || '00000-000'}
                        </span>
                      }
                      type="text"
                      placeholder="00000-000"
                      onSave={async (val) => handleUpdateClienteField('cep', String(val))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Estado:</span>
                    <InlineEditField
                      value={
                        selectedCliente.estado ||
                        (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')
                      }
                      displayValue={
                        <span className="font-bold text-gray-800 uppercase">
                          {selectedCliente.estado ||
                            (selectedCliente.cidade?.includes('/SC') ? 'SC' : 'RS')}
                        </span>
                      }
                      type="text"
                      placeholder="RS / SC"
                      onSave={async (val) => handleUpdateClienteField('estado', String(val))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-gray-500 w-28 shrink-0 pl-5">Complemento:</span>
                  <InlineEditField
                    value={selectedCliente.complemento}
                    displayValue={
                      <span className="text-gray-700 italic">
                        {selectedCliente.complemento || 'Nenhum'}
                      </span>
                    }
                    type="text"
                    placeholder="Sala, bloco, pavilhão..."
                    className="flex-1"
                    onSave={async (val) => handleUpdateClienteField('complemento', String(val))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SEÇÃO 2: DADOS TÉCNICOS DO SISTEMA                       */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                Dados Técnicos do Sistema
              </h3>
              <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Instalação Fotovoltaica
              </span>
            </div>

            {/* DESTAQUE SOLICITADO PELO USUÁRIO: Geração Média Mensal NO INÍCIO */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm space-y-1">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-100">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-bold">
                  <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
                  Geração Média Mensal (kWh)
                </span>
                <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded backdrop-blur-xs">
                  Estimativa de Produção
                </span>
              </div>
              <div className="flex items-baseline gap-2 pt-1">
                <InlineEditField
                  value={selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida}
                  displayValue={
                    <span className="text-2xl font-black tracking-tight text-white">
                      {(selectedSistema?.geracao_media_mensal_kwh ?? geracaoExibida).toLocaleString(
                        'pt-BR',
                      )}
                    </span>
                  }
                  type="number"
                  unit="kWh/mês"
                  step="1"
                  min={0}
                  className="text-white"
                  inputClassName="text-gray-900"
                  onSave={async (val) =>
                    handleUpdateSistemaField('geracao_media_mensal_kwh', Number(val))
                  }
                />
                <span className="text-sm font-semibold text-emerald-100">kWh / mês</span>
              </div>
              <p className="text-[11px] text-emerald-100/90 pt-0.5">
                Produção solar calculada com base na irradiação da região e potência instalada (
                {potenciaExibida} kWp).
              </p>
            </div>

            {/* SUBSEÇÃO 1: LOCALIZAÇÃO */}
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/60 space-y-2.5">
              <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                Localização da Instalação
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Cidade / UF:</span>
                  <InlineEditField
                    value={selectedCliente.cidade}
                    displayValue={
                      <span className="font-semibold text-gray-800">
                        {selectedCliente.cidade || 'Não informada'}
                      </span>
                    }
                    type="text"
                    placeholder="Cidade/UF"
                    onSave={async (val) => handleUpdateClienteField('cidade', String(val))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-24 shrink-0">Endereço compl.:</span>
                  <span className="text-gray-700 truncate">
                    {[
                      selectedCliente.endereco,
                      selectedCliente.numero ? `nº ${selectedCliente.numero}` : null,
                      selectedCliente.bairro,
                      selectedCliente.complemento,
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Mesmo do cadastro'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-16 shrink-0">Latitude:</span>
                    <InlineEditField
                      value={selectedSistema?.latitude ?? 0}
                      displayValue={
                        <span className="font-mono text-gray-800 text-[11px]">
                          {selectedSistema?.latitude
                            ? `${selectedSistema.latitude}°`
                            : 'Não informada'}
                        </span>
                      }
                      type="number"
                      step="0.0001"
                      unit="°"
                      placeholder="-27.6341"
                      onSave={async (val) => handleUpdateSistemaField('latitude', Number(val))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Compass className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-16 shrink-0">Longitude:</span>
                    <InlineEditField
                      value={selectedSistema?.longitude ?? 0}
                      displayValue={
                        <span className="font-mono text-gray-800 text-[11px]">
                          {selectedSistema?.longitude
                            ? `${selectedSistema.longitude}°`
                            : 'Não informada'}
                        </span>
                      }
                      type="number"
                      step="0.0001"
                      unit="°"
                      placeholder="-52.2739"
                      onSave={async (val) => handleUpdateSistemaField('longitude', Number(val))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SUBSEÇÃO 2: CONCESSIONÁRIA */}
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/60 space-y-2.5">
              <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Concessionária de Energia
              </div>

              <div className="space-y-2 text-xs">
                {/* Número da UC */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Nº da UC:</span>
                  <InlineEditField
                    value={ucExibida}
                    displayValue={
                      <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 text-xs">
                        {ucExibida || 'Não informada'}
                      </span>
                    }
                    type="text"
                    placeholder="Ex: 3012847561"
                    onSave={async (val) => handleUpdateSistemaField('numero_uc', String(val))}
                  />
                </div>

                {/* Padrão de entrada da concessionária */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Padrão de entrada:</span>
                  <InlineEditField
                    value={selectedSistema?.padrao_entrada ?? 'RIC BT Categoria A2'}
                    displayValue={
                      <span className="font-medium text-gray-800">
                        {selectedSistema?.padrao_entrada || 'Não informado'}
                      </span>
                    }
                    type="text"
                    placeholder="Ex: RIC BT Categoria A2"
                    onSave={async (val) => handleUpdateSistemaField('padrao_entrada', String(val))}
                  />
                </div>

                {/* Tipo de atendimento & Número de fases */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20 shrink-0">Atendimento:</span>
                    <InlineEditField
                      value={selectedSistema?.tipo_atendimento || 'aéreo'}
                      displayValue={
                        <span className="capitalize font-medium text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {selectedSistema?.tipo_atendimento || 'aéreo'}
                        </span>
                      }
                      type="select"
                      options={ATENDIMENTOS}
                      onSave={async (val) =>
                        handleUpdateSistemaField('tipo_atendimento', val as TipoAtendimento)
                      }
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Fases:</span>
                    <InlineEditField
                      value={selectedSistema?.numero_fases || 'trifásico'}
                      displayValue={
                        <span className="capitalize font-medium text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {selectedSistema?.numero_fases || 'trifásico'}
                        </span>
                      }
                      type="select"
                      options={FASES}
                      onSave={async (val) =>
                        handleUpdateSistemaField('numero_fases', val as NumeroFases)
                      }
                    />
                  </div>
                </div>

                {/* Seção cabos, Tipo da caixa & Amperagem disjuntor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gray-200/60">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-20 shrink-0">Seção cabos:</span>
                    <InlineEditField
                      value={selectedSistema?.secao_cabos || '16 mm²'}
                      displayValue={
                        <span className="font-medium text-gray-800">
                          {selectedSistema?.secao_cabos || 'Não informada'}
                        </span>
                      }
                      type="text"
                      unit="mm²"
                      placeholder="Ex: 16 mm²"
                      onSave={async (val) => handleUpdateSistemaField('secao_cabos', String(val))}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500 w-16 shrink-0">Disjuntor:</span>
                    <InlineEditField
                      value={selectedSistema?.amperagem_disjuntor || '40 A'}
                      displayValue={
                        <span className="font-semibold text-gray-800 bg-white px-2 py-0.5 rounded border border-gray-200">
                          {selectedSistema?.amperagem_disjuntor || 'Não inf.'}
                        </span>
                      }
                      type="text"
                      unit="A"
                      placeholder="Ex: 40 A"
                      onSave={async (val) =>
                        handleUpdateSistemaField('amperagem_disjuntor', String(val))
                      }
                    />
                  </div>
                </div>

                {/* Tipo da caixa de medição */}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-28 shrink-0">Caixa medição:</span>
                  <InlineEditField
                    value={
                      selectedSistema?.tipo_caixa_medicao || 'caixa de medição instalada em poste'
                    }
                    displayValue={
                      <span className="text-gray-800">
                        {selectedSistema?.tipo_caixa_medicao || 'Não informado'}
                      </span>
                    }
                    type="text"
                    placeholder="Ex: caixa de medição instalada em poste"
                    className="flex-1"
                    onSave={async (val) =>
                      handleUpdateSistemaField('tipo_caixa_medicao', String(val))
                    }
                  />
                </div>
              </div>
            </div>

            {/* SUBSEÇÃO 3: INSTALAÇÃO ELÉTRICA */}
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/60 space-y-2.5">
              <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                Instalação Elétrica e Estrutura
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Data de Instalação */}
                <div className="p-2.5 bg-white rounded-lg border border-gray-200/70">
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                    <Calendar className="w-3 h-3" />
                    Data Instalação
                  </div>
                  <InlineEditField
                    value={dataInstalacaoExibida}
                    displayValue={
                      <span className="font-bold text-gray-800">
                        {dataInstalacaoExibida ? formatDate(dataInstalacaoExibida) : 'Não definida'}
                      </span>
                    }
                    type="date"
                    placeholder="DD/MM/AAAA"
                    onSave={async (val) => handleUpdateSistemaField('data_instalacao', String(val))}
                  />
                </div>

                {/* Potência Total kWp */}
                <div className="p-2.5 bg-white rounded-lg border border-gray-200/70">
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                    <Zap className="w-3 h-3 text-emerald-600" />
                    Potência Total
                  </div>
                  <InlineEditField
                    value={potenciaExibida}
                    displayValue={
                      <span className="font-black text-emerald-700 text-sm">
                        {potenciaExibida} kWp
                      </span>
                    }
                    type="number"
                    step="0.1"
                    min={0}
                    unit="kWp"
                    placeholder="0"
                    onSave={async (val) =>
                      handleUpdateSistemaField('potencia_total_kwp', Number(val))
                    }
                  />
                </div>

                {/* Tipo de Telhado */}
                <div className="p-2.5 bg-white rounded-lg border border-gray-200/70">
                  <div className="text-[10px] text-gray-400 flex items-center gap-1 mb-1 uppercase font-semibold">
                    <Home className="w-3 h-3" />
                    Tipo Telhado
                  </div>
                  <InlineEditField
                    value={telhadoExibido}
                    displayValue={
                      <span className="font-semibold text-gray-800 text-xs">
                        {getTelhadoLabel(telhadoExibido)}
                      </span>
                    }
                    type="select"
                    options={TELHADOS}
                    onSave={async (val) =>
                      handleUpdateSistemaField('tipo_telhado', val as TelhadoTipo)
                    }
                  />
                </div>
              </div>
            </div>

            {/* SUBSEÇÃO 4: EQUIPAMENTOS */}
            <div className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200/60 space-y-3">
              <div className="text-[11px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                Equipamentos Fotovoltaicos
              </div>

              {/* Módulos / Placas Solares */}
              <div className="p-3 bg-white rounded-lg border border-gray-200/70 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    Módulos Fotovoltaicos
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">Qtd:</span>
                    <InlineEditField
                      value={
                        selectedSistema?.quantidade_modulos ??
                        selectedSistema?.quantidade_placas ??
                        selectedCliente.placas_qtd ??
                        0
                      }
                      displayValue={
                        <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded text-xs">
                          {selectedSistema?.quantidade_modulos ??
                            selectedSistema?.quantidade_placas ??
                            selectedCliente.placas_qtd ??
                            0}{' '}
                          módulos
                        </span>
                      }
                      type="number"
                      step="1"
                      min={0}
                      unit="un"
                      placeholder="0"
                      onSave={async (val) => {
                        const num = Number(val)
                        await handleUpdateSistemaField('quantidade_modulos', num)
                        await handleUpdateSistemaField('quantidade_placas', num)
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Fabricante:</span>
                    <InlineEditField
                      value={
                        selectedSistema?.fabricante_modulos ||
                        selectedSistema?.marca_placas ||
                        selectedCliente.placas_marca ||
                        'Canadian Solar'
                      }
                      displayValue={
                        <span className="font-medium text-gray-800">
                          {selectedSistema?.fabricante_modulos ||
                            selectedSistema?.marca_placas ||
                            selectedCliente.placas_marca ||
                            'Não informado'}
                        </span>
                      }
                      type="text"
                      placeholder="Ex: Canadian Solar, Trina Solar"
                      onSave={async (val) => {
                        const s = String(val)
                        await handleUpdateSistemaField('fabricante_modulos', s)
                        await handleUpdateSistemaField('marca_placas', s)
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Pot. Pico:</span>
                    <InlineEditField
                      value={selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida}
                      displayValue={
                        <span className="font-semibold text-emerald-800">
                          {selectedSistema?.potencia_pico_modulos_kwp ?? potenciaExibida} kWp
                        </span>
                      }
                      type="number"
                      step="0.01"
                      min={0}
                      unit="kWp"
                      placeholder="0"
                      onSave={async (val) =>
                        handleUpdateSistemaField('potencia_pico_modulos_kwp', Number(val))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-gray-50">
                  <span className="text-gray-500 w-16 shrink-0">Modelo:</span>
                  <InlineEditField
                    value={selectedSistema?.modelo_modulos || 'CS3W-455MS MONOCRISTAL INO 455Wp'}
                    displayValue={
                      <span className="font-mono text-gray-800 text-[11px] bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {selectedSistema?.modelo_modulos || 'CS3W-455MS MONOCRISTAL INO 455Wp'}
                      </span>
                    }
                    type="text"
                    placeholder="Ex: CS3W-455MS MONOCRISTAL INO 455Wp"
                    className="flex-1"
                    onSave={async (val) => handleUpdateSistemaField('modelo_modulos', String(val))}
                  />
                </div>
              </div>

              {/* Inversores */}
              <div className="p-3 bg-white rounded-lg border border-gray-200/70 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <span className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-600" />
                    Inversores
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold">
                      Potência:
                    </span>
                    <InlineEditField
                      value={selectedSistema?.potencia_pico_inversores_kwp ?? potenciaExibida}
                      displayValue={
                        <span className="font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded text-xs">
                          {selectedSistema?.potencia_pico_inversores_kwp ?? potenciaExibida} kWp
                        </span>
                      }
                      type="number"
                      step="0.1"
                      min={0}
                      unit="kWp"
                      placeholder="0"
                      onSave={async (val) =>
                        handleUpdateSistemaField('potencia_pico_inversores_kwp', Number(val))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Fabricante:</span>
                    <InlineEditField
                      value={
                        selectedSistema?.fabricante_inversores ||
                        selectedCliente.inversor_marca ||
                        'Fronius'
                      }
                      displayValue={
                        <span className="font-medium text-gray-800">
                          {selectedSistema?.fabricante_inversores ||
                            selectedCliente.inversor_marca ||
                            'Não informado'}
                        </span>
                      }
                      type="text"
                      placeholder="Ex: Fronius, Huawei, Growatt, SMA"
                      onSave={async (val) => {
                        const s = String(val)
                        await handleUpdateSistemaField('fabricante_inversores', s)
                        await handleUpdateClienteField('inversor_marca', s)
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-16 shrink-0">Modelo:</span>
                    <InlineEditField
                      value={
                        selectedSistema?.modelo_inversores ||
                        selectedCliente.inversor_modelo ||
                        'Fronius Symo 12.0-3-M'
                      }
                      displayValue={
                        <span className="font-semibold text-gray-800 truncate">
                          {selectedSistema?.modelo_inversores ||
                            selectedCliente.inversor_modelo ||
                            'Não informado'}
                        </span>
                      }
                      type="text"
                      placeholder="Ex: Fronius Symo 12.0-3-M"
                      className="flex-1"
                      onSave={async (val) => {
                        const s = String(val)
                        await handleUpdateSistemaField('modelo_inversores', s)
                        await handleUpdateClienteField('inversor_modelo', s)
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SEÇÃO 3: PRÓXIMAS ATIVIDADES                             */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Próximas Atividades
            </h3>
            {clientAtividades.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Nenhuma atividade agendada.</p>
            ) : (
              <div className="space-y-2.5">
                {clientAtividades.map((atv) => (
                  <div
                    key={atv.id}
                    className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100/60 flex items-start gap-3 text-xs"
                  >
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-md shrink-0 mt-0.5">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-semibold text-emerald-900 block text-xs">
                        {formatDateTime(atv.data)}
                      </span>
                      <p className="text-gray-700 text-xs">{atv.descricao}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* SEÇÃO 4: HISTÓRICO DE MANUTENÇÕES                         */}
          {/* ======================================================== */}
          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5 text-emerald-600" />
              Histórico de Manutenções
            </h3>
            {clientManutencoes.length === 0 ? (
              <p className="text-xs text-gray-500 italic">Nenhuma manutenção registrada.</p>
            ) : (
              <div className="space-y-3.5">
                {clientManutencoes.map((m) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl border border-gray-200/80 bg-white space-y-2.5 shadow-xs hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {getServiceIcon(m.tipo)}
                        <span className="font-semibold text-gray-900 text-xs">{m.tipo}</span>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span className="font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                        {formatDate(m.data)}
                      </span>
                      {m.tecnico && (
                        <span>
                          Técnico: <strong className="text-gray-700">{m.tecnico}</strong>
                        </span>
                      )}
                    </div>

                    {m.descricao && (
                      <p className="text-xs text-gray-600 leading-relaxed">{m.descricao}</p>
                    )}

                    {/* Mocked Photo Gallery for inspection records */}
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block mb-2">
                        Fotos da Ordem de Serviço
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all shadow-xs group"
                          title="Foto 1: Painéis e cabeamento"
                        >
                          <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] mt-0.5">Foto 1</span>
                        </div>
                        <div
                          className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all shadow-xs group"
                          title="Foto 2: Quadro de distribuição e inversor"
                        >
                          <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] mt-0.5">Foto 2</span>
                        </div>
                        {m.tipo === 'Revisão Elétrica' && (
                          <div
                            className="w-14 h-14 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-600 cursor-pointer transition-all shadow-xs group"
                            title="Foto 3: Medição de termografia"
                          >
                            <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-[8px] mt-0.5">Foto 3</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

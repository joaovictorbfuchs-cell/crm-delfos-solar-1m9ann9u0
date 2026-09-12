import React, { useState, useMemo } from 'react'
import {
  Search,
  Eye,
  MapPin,
  Zap,
  Users,
  Loader2,
  MessageSquare,
  Plus,
  Building2,
  User,
} from 'lucide-react'
import { useClientes } from '@/contexts/ClientesContext'
import { StatusBadge, ProductBadge } from '@/components/StatusBadge'
import { formatCurrency } from '@/lib/formatters'
import {
  ModalCadastroClienteFornecedor,
  DadosCadastroForm,
} from '@/components/ModalCadastroClienteFornecedor'

export default function Clientes() {
  const { clientes, isLoading, openFichaCliente, addCliente } = useClientes()
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalNovoOpen, setIsModalNovoOpen] = useState(false)

  const filteredClientes = useMemo(() => {
    if (!searchTerm.trim()) return clientes
    const lower = searchTerm.toLowerCase()
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(lower) ||
        (c.razao_social && c.razao_social.toLowerCase().includes(lower)) ||
        (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(lower)) ||
        (c.cnpj && c.cnpj.includes(searchTerm)) ||
        (c.cpf && c.cpf.includes(searchTerm)) ||
        (c.cidade && c.cidade.toLowerCase().includes(lower)) ||
        (c.uc && c.uc.includes(lower)),
    )
  }, [clientes, searchTerm])

  const handleSalvarCliente = async (dados: DadosCadastroForm) => {
    await addCliente({
      nome: dados.nome,
      tipo_pessoa: dados.tipo_pessoa,
      razao_social: dados.razao_social,
      nome_fantasia: dados.nome_fantasia,
      cpf: dados.cpf,
      cnpj: dados.cnpj,
      situacao_cadastral: dados.situacao_cadastral,
      cnae_principal: dados.cnae_principal,
      data_abertura: dados.data_abertura,
      telefone: dados.telefone,
      telefone_secundario: dados.telefone_secundario,
      whatsapp: dados.telefone,
      email: dados.email,
      contato_principal: dados.contato_principal,
      contato: dados.contato_principal,
      atividade_principal: dados.atividade_principal,
      como_conheceu: dados.como_conheceu,
      origem_lead:
        dados.como_conheceu === 'Redes Sociais'
          ? 'Instagram'
          : (dados.como_conheceu as any) || 'Indicação',
      observacoes: dados.observacoes,
      endereco: dados.endereco || '',
      numero: dados.numero,
      complemento: dados.complemento,
      bairro: dados.bairro,
      cidade: dados.cidade || 'Erechim',
      estado: dados.estado || 'RS',
      cep: dados.cep,
      uc: '',
      potencia_kwp: 5.5,
      valor_estimado: 25000,
      status: 'Novo Lead',
      produto: 'Energia Solar',
      telhado_tipo: 'ceramico',
      inversor_marca: 'Deye',
      inversor_modelo: 'SUN-5K-SG01LP1',
      placas_qtd: 10,
      placas_marca: 'Canadian Solar',
      data_instalacao: new Date().toISOString().split('T')[0],
    })
  }

  if (isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#16A34A]" />
        <p className="text-sm">Carregando base de clientes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Search & Adicionar Novo em Destaque */}
      <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Base de Clientes
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              {filteredClientes.length} clientes
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Total de {clientes.length} clientes cadastrados na região norte do RS e oeste de SC (PF
            e PJ)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input with instant filter */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nome, CPF/CNPJ ou cidade..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Botão Adicionar Novo em Destaque no Topo */}
          <button
            type="button"
            onClick={() => setIsModalNovoOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#16A34A] hover:bg-[#15803D] active:scale-[0.98] text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Adicionar Novo</span>
          </button>
        </div>
      </div>

      {/* Table / Cards */}
      {filteredClientes.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
          <p className="text-sm">Nenhum cliente encontrado para "{searchTerm}".</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAF9] border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Nome do Cliente</th>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">Cidade</th>
                  <th className="py-3.5 px-4">Potência</th>
                  <th className="py-3.5 px-4">Valor Estimado</th>
                  <th className="py-3.5 px-4">Status Comercial</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClientes.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => openFichaCliente(c.id)}
                    className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                          {c.nome}
                        </span>
                        {c.tipo_pessoa === 'juridica' || c.cnpj ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            <Building2 className="w-2.5 h-2.5" /> PJ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                            <User className="w-2.5 h-2.5" /> PF
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                        {c.cnpj && (
                          <span className="text-gray-600 font-medium">CNPJ: {c.cnpj}</span>
                        )}
                        {c.cpf && <span className="text-gray-600 font-medium">CPF: {c.cpf}</span>}
                        {c.whatsapp ? (
                          <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            {c.whatsapp}
                          </span>
                        ) : c.telefone ? (
                          <span>{c.telefone}</span>
                        ) : null}
                        {c.uc && <span>• UC: {c.uc}</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <ProductBadge produto={c.produto || 'Energia Solar'} />
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{c.cidade}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-xs">
                        <Zap className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{c.potencia_kwp} kWp</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-800 font-medium whitespace-nowrap">
                      {formatCurrency(c.valor_estimado)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openFichaCliente(c.id, 'whatsapp')
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 rounded-lg transition-colors border border-emerald-300"
                          title="Abrir WhatsApp do cliente"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openFichaCliente(c.id)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                          title="Ver Ficha Técnica Completa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Ficha
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredClientes.map((c) => (
              <div
                key={c.id}
                onClick={() => openFichaCliente(c.id)}
                className="bg-white rounded-xl p-4 border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-gray-900 text-sm">{c.nome}</h4>
                      {c.tipo_pessoa === 'juridica' || c.cnpj ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          PJ
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          PF
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      {c.cnpj ? `CNPJ: ${c.cnpj}` : c.cpf ? `CPF: ${c.cpf}` : `UC: ${c.uc || '-'}`}
                    </p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{c.cidade}</span>
                  </div>
                  <div className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                    {c.potencia_kwp} kWp
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="font-bold text-gray-900 text-sm">
                    {formatCurrency(c.valor_estimado)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openFichaCliente(c.id)
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Ficha
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal de Cadastro Unificado PF/PJ com Consulta CNPJ */}
      <ModalCadastroClienteFornecedor
        isOpen={isModalNovoOpen}
        onClose={() => setIsModalNovoOpen(false)}
        tipoEntidade="cliente"
        onSubmit={handleSalvarCliente}
      />
    </div>
  )
}

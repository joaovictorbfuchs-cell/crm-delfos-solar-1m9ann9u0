import React, { useState } from 'react'
import {
  Users,
  User,
  Plus,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  Loader2,
  Check,
  X,
  UserCheck,
  Pencil,
} from 'lucide-react'
import { Cliente, ContatoAdicional } from '@/types/crm'
import { useClientes } from '@/contexts/ClientesContext'
import { formatWhatsAppPhone } from '@/lib/formatters'
import { toast } from 'sonner'
import {
  detectarDuplicidadeTelefone,
  executarMesclagemDuplicado,
  type ContatoCorrespondente,
} from '@/services/duplicidadeContatoService'
import { ModalAvisoDuplicidadeTelefone } from './ModalAvisoDuplicidadeTelefone'
import { Star, Search, UserPlus, AlertTriangle, Activity, Layers, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  contarVinculosCliente,
  converterClienteEmContatoAdicional,
  type VinculosClienteSumario,
} from '@/services/crmService'

interface SecaoContatosAdicionaisProps {
  cliente: Cliente
}

interface PessoaBuscada {
  id: string
  origem: 'cliente' | 'contato_adicional' | 'contato_global'
  nome: string
  documento?: string
  telefone?: string
  email?: string
  cidade?: string
  clientePaiNome?: string
  clientePaiId?: string
}

export const SecaoContatosAdicionais: React.FC<SecaoContatosAdicionaisProps> = ({ cliente }) => {
  const {
    clientes,
    contatosAdicionais,
    addContatoAdicional,
    updateContatoAdicional,
    definirContatoPrincipal,
    removeContatoAdicional,
    updateCliente,
    refreshClientes,
    refreshContatosAdicionais,
  } = useClientes()

  const [isAdding, setIsAdding] = useState(false)
  const [abaAdicionar, setAbaAdicionar] = useState<'novo' | 'buscar'>('novo')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [settingPrincipalId, setSettingPrincipalId] = useState<string | null>(null)

  // Duplicidade de Telefone/WhatsApp
  const [duplicadosEncontrados, setDuplicadosEncontrados] = useState<ContatoCorrespondente[]>([])
  const [modalDuplicidadeAberto, setModalDuplicidadeAberto] = useState(false)
  const [isMesclando, setIsMesclando] = useState(false)

  // Busca de pessoa existente
  const [termoBuscaPessoa, setTermoBuscaPessoa] = useState('')
  const [pessoaSelecionada, setPessoaSelecionada] = useState<PessoaBuscada | null>(null)
  const [sumarioVinculosPessoa, setSumarioVinculosPessoa] = useState<VinculosClienteSumario | null>(
    null,
  )
  const [carregandoVinculos, setCarregandoVinculos] = useState(false)
  const [modalConfirmarConversaoAberto, setModalConfirmarConversaoAberto] = useState(false)
  const [isConvertendoPessoa, setIsConvertendoPessoa] = useState(false)

  // Form state para novo contato
  const [nome, setNome] = useState('')
  const [cargo, setCargo] = useState('')
  const [papel, setPapel] = useState<
    'principal' | 'financeiro' | 'tecnico' | 'responsavel' | 'outro'
  >('outro')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [isWhatsapp, setIsWhatsapp] = useState(false)
  const [isPrincipal, setIsPrincipal] = useState(false)

  // Estado para Edição do Titular do Cadastro
  const [modalEditarTitularAberto, setModalEditarTitularAberto] = useState(false)
  const [isSavingTitular, setIsSavingTitular] = useState(false)
  const [titularFormNome, setTitularFormNome] = useState('')
  const [titularFormCargo, setTitularFormCargo] = useState('')
  const [titularFormTelefone, setTitularFormTelefone] = useState('')
  const [titularFormWhatsapp, setTitularFormWhatsapp] = useState('')
  const [titularFormEmail, setTitularFormEmail] = useState('')

  // Estado para Edição de Contato Adicional
  const [modalEditarAdicionalAberto, setModalEditarAdicionalAberto] = useState(false)
  const [contatoAdicionalEditando, setContatoAdicionalEditando] = useState<ContatoAdicional | null>(
    null,
  )
  const [isSavingAdicional, setIsSavingAdicional] = useState(false)
  const [adicionalFormNome, setAdicionalFormNome] = useState('')
  const [adicionalFormCargo, setAdicionalFormCargo] = useState('')
  const [adicionalFormPapel, setAdicionalFormPapel] = useState<
    'principal' | 'financeiro' | 'tecnico' | 'responsavel' | 'outro'
  >('outro')
  const [adicionalFormTelefone, setAdicionalFormTelefone] = useState('')
  const [adicionalFormEmail, setAdicionalFormEmail] = useState('')
  const [adicionalFormIsWhatsapp, setAdicionalFormIsWhatsapp] = useState(false)
  const [adicionalFormIsPrincipal, setAdicionalFormIsPrincipal] = useState(false)

  // Filtrar contatos adicionais vinculados ao cliente
  const contatosDoCliente = contatosAdicionais.filter((c) => c.cliente === cliente.id)

  const handleResetForm = () => {
    setNome('')
    setCargo('')
    setPapel('outro')
    setTelefone('')
    setEmail('')
    setIsWhatsapp(false)
    setIsPrincipal(false)
    setIsAdding(false)
    setAbaAdicionar('novo')
    setTermoBuscaPessoa('')
    setPessoaSelecionada(null)
  }

  // Identificar quem é o contato principal atual
  // Se houver algum contato_adicional com is_principal = true ou papel = 'principal', ele é o principal
  // Caso contrário, o contato direto do cliente é o principal
  const contatoAdicionalPrincipal = contatosDoCliente.find(
    (c) => Boolean(c.is_principal) || c.papel === 'principal',
  )
  const contatoDiretoEhPrincipal = !contatoAdicionalPrincipal

  const handleDefinirComoPrincipal = async (contatoAdicionalId: string | null) => {
    setSettingPrincipalId(contatoAdicionalId || 'direto')
    try {
      await definirContatoPrincipal({
        clienteId: cliente.id,
        contatoAdicionalId,
      })
      toast.success(
        contatoAdicionalId
          ? 'Contato adicional definido como Contato Principal!'
          : 'Contato direto do cliente restaurado como Contato Principal!',
      )
      await refreshContatosAdicionais()
    } catch (err) {
      console.error('Erro ao definir contato principal:', err)
      toast.error('Erro ao definir contato principal')
    } finally {
      setSettingPrincipalId(null)
    }
  }

  // Candidatos na busca de pessoa já cadastrada
  const pessoasEncontradas = React.useMemo<PessoaBuscada[]>(() => {
    const termo = termoBuscaPessoa.trim().toLowerCase()
    if (!termo || termo.length < 2) return []

    const resultados: PessoaBuscada[] = []

    // 1. Clientes (exceto o próprio cliente atual)
    for (const c of clientes) {
      if (c.id === cliente.id) continue
      const nomeC = (c.nome || '').toLowerCase()
      const docC = (c.cpf || c.cnpj || '').replace(/\D/g, '')
      const telC = (c.whatsapp || c.telefone || '').replace(/\D/g, '')
      const emailC = (c.email || '').toLowerCase()
      const termoDigitos = termo.replace(/\D/g, '')

      if (
        nomeC.includes(termo) ||
        emailC.includes(termo) ||
        (termoDigitos && (docC.includes(termoDigitos) || telC.includes(termoDigitos)))
      ) {
        resultados.push({
          id: c.id,
          origem: 'cliente',
          nome: c.nome,
          documento: c.cpf || c.cnpj || undefined,
          telefone: c.whatsapp || c.telefone || undefined,
          email: c.email || undefined,
          cidade: c.cidade ? `${c.cidade}${c.estado ? ` - ${c.estado}` : ''}` : undefined,
        })
      }
    }

    // 2. Contatos adicionais de outros clientes
    for (const ca of contatosAdicionais) {
      if (ca.cliente === cliente.id) continue
      const nomeCA = (ca.nome || '').toLowerCase()
      const telCA = (ca.telefone || '').replace(/\D/g, '')
      const emailCA = (ca.email || '').toLowerCase()
      const termoDigitos = termo.replace(/\D/g, '')

      if (
        nomeCA.includes(termo) ||
        emailCA.includes(termo) ||
        (termoDigitos && telCA.includes(termoDigitos))
      ) {
        const clientePai = clientes.find((cli) => cli.id === ca.cliente)
        resultados.push({
          id: ca.id,
          origem: 'contato_adicional',
          nome: ca.nome,
          telefone: ca.telefone || undefined,
          email: ca.email || undefined,
          clientePaiNome: clientePai?.nome,
          clientePaiId: ca.cliente,
        })
      }
    }

    return resultados.slice(0, 30)
  }, [clientes, contatosAdicionais, cliente.id, termoBuscaPessoa])

  const handleSelecionarPessoaParaInclusao = async (pessoa: PessoaBuscada) => {
    setPessoaSelecionada(pessoa)

    if (pessoa.origem === 'cliente') {
      // Se for cliente independente, abre o modal de confirmação com sumário de vínculos
      setCarregandoVinculos(true)
      setModalConfirmarConversaoAberto(true)
      try {
        const sumario = await contarVinculosCliente(pessoa.id)
        setSumarioVinculosPessoa(sumario)
      } catch (e) {
        console.error('Erro ao contar vínculos da pessoa:', e)
      } finally {
        setCarregandoVinculos(false)
      }
    } else {
      // Se for apenas contato adicional de outro cliente, cria uma cópia como contato adicional deste
      setIsSaving(true)
      try {
        await addContatoAdicional({
          cliente: cliente.id,
          nome: pessoa.nome,
          cargo: 'Contato Adicional',
          papel: 'outro',
          telefone: pessoa.telefone,
          email: pessoa.email,
          is_whatsapp: true,
        })
        toast.success(`Contato "${pessoa.nome}" vinculado com sucesso!`)
        handleResetForm()
      } catch (err) {
        console.error('Erro ao vincular contato existente:', err)
        toast.error('Erro ao adicionar contato')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleConfirmarConversaoPessoaCliente = async () => {
    if (!pessoaSelecionada || pessoaSelecionada.origem !== 'cliente') return

    setIsConvertendoPessoa(true)
    try {
      await converterClienteEmContatoAdicional({
        clientePrincipalId: cliente.id,
        clienteConvertidoId: pessoaSelecionada.id,
        papel: 'outro',
        cargo: 'Contato Adicional',
        is_whatsapp: true,
      })

      toast.success(
        `Cliente "${pessoaSelecionada.nome}" convertido em contato adicional com sucesso! Todos os vínculos foram transferidos.`,
      )
      setModalConfirmarConversaoAberto(false)
      handleResetForm()
      await Promise.all([refreshClientes(), refreshContatosAdicionais()])
    } catch (err) {
      console.error('Erro na conversão do cliente em contato adicional:', err)
      toast.error('Falha ao converter cadastro.')
    } finally {
      setIsConvertendoPessoa(false)
    }
  }

  const persistirContatoAdicional = async (ignorarChecagemDuplicados = false) => {
    if (!nome.trim()) {
      toast.error('Informe o nome do contato')
      return
    }

    if (!ignorarChecagemDuplicados && telefone.trim()) {
      const duplicados = await detectarDuplicidadeTelefone({
        telefone: telefone.trim(),
        whatsapp: isWhatsapp ? telefone.trim() : undefined,
        ignorarOrigem: 'contato_adicional',
        contatosAdicionaisPrecarregados: contatosAdicionais,
      })

      if (duplicados.length > 0) {
        setDuplicadosEncontrados(duplicados)
        setModalDuplicidadeAberto(true)
        return
      }
    }

    setIsSaving(true)
    try {
      await addContatoAdicional({
        cliente: cliente.id,
        nome: nome.trim(),
        cargo: cargo.trim() || undefined,
        papel: isPrincipal ? 'principal' : papel,
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        is_whatsapp: isWhatsapp,
        is_principal: isPrincipal,
      })

      if (isPrincipal) {
        await definirContatoPrincipal({
          clienteId: cliente.id,
          contatoAdicionalId: null, // o addContatoAdicional já cuidará, mas garantimos sincronia
        })
      }

      toast.success('Contato adicional cadastrado com sucesso!')
      handleResetForm()
    } catch (err) {
      console.error('Erro ao adicionar contato adicional:', err)
      toast.error('Erro ao cadastrar contato adicional')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSalvarNovoContato = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    await persistirContatoAdicional(false)
  }

  const handleExcluirContato = async (id: string, nomeContato: string) => {
    if (!window.confirm(`Deseja realmente remover o contato adicional "${nomeContato}"?`)) {
      return
    }

    setDeletingId(id)
    try {
      await removeContatoAdicional(id)
      toast.success(`Contato "${nomeContato}" removido com sucesso.`)
    } catch (err) {
      console.error('Erro ao excluir contato adicional:', err)
      toast.error('Erro ao excluir contato adicional')
    } finally {
      setDeletingId(null)
    }
  }

  // Contato Principal deduzido dos dados já cadastrados do cliente
  const contatoPrincipalNome =
    cliente.contato_principal?.trim() ||
    cliente.contato?.trim() ||
    cliente.nome?.trim() ||
    'Contato Principal'

  // Se cliente for PJ e tiver contato específico, podemos inferir o cargo ou usar o texto
  const contatoPrincipalCargo =
    cliente.contato && cliente.contato !== cliente.nome
      ? 'Responsável / Contato Direto'
      : cliente.tipo_pessoa === 'juridica'
        ? 'Representante Legal / Titular'
        : 'Titular / Proprietário'

  const contatoPrincipalTelefone = cliente.whatsapp || cliente.telefone || 'Não informado'
  const contatoPrincipalEmail = cliente.email || 'Não informado'

  // Abertura do modal de edição do Titular
  const handleAbrirEditarTitular = () => {
    setTitularFormNome(cliente.titular_nome || cliente.nome || '')
    setTitularFormCargo(
      cliente.contato && cliente.contato !== cliente.nome
        ? cliente.contato
        : cliente.tipo_pessoa === 'juridica'
          ? 'Representante Legal / Titular'
          : 'Titular / Proprietário',
    )
    setTitularFormTelefone(cliente.telefone || '')
    setTitularFormWhatsapp(cliente.whatsapp || '')
    setTitularFormEmail(cliente.email || cliente.titular_email || '')
    setModalEditarTitularAberto(true)
  }

  const handleSalvarEdicaoTitular = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!titularFormNome.trim()) {
      toast.error('Informe o nome do titular')
      return
    }

    setIsSavingTitular(true)
    try {
      const updates: Partial<Cliente> = {
        nome: titularFormNome.trim(),
        titular_nome: titularFormNome.trim(),
        contato: titularFormCargo.trim() || undefined,
        contato_principal: titularFormNome.trim(),
        telefone: titularFormTelefone.trim() || undefined,
        titular_telefone: titularFormTelefone.trim() || undefined,
        whatsapp: titularFormWhatsapp.trim() || undefined,
        email: titularFormEmail.trim() || undefined,
        titular_email: titularFormEmail.trim() || undefined,
      }

      await updateCliente(cliente.id, updates)
      await refreshClientes()
      toast.success('Dados do titular atualizados com sucesso!')
      setModalEditarTitularAberto(false)
    } catch (err) {
      console.error('Erro ao atualizar dados do titular:', err)
      toast.error('Erro ao salvar dados do titular')
    } finally {
      setIsSavingTitular(false)
    }
  }

  // Abertura do modal de edição do Contato Adicional
  const handleAbrirEditarAdicional = (contato: ContatoAdicional) => {
    setContatoAdicionalEditando(contato)
    setAdicionalFormNome(contato.nome || '')
    setAdicionalFormCargo(contato.cargo || '')
    const papelVal = (contato.papel as any) || 'outro'
    setAdicionalFormPapel(
      ['principal', 'financeiro', 'tecnico', 'responsavel', 'outro'].includes(papelVal)
        ? papelVal
        : 'outro',
    )
    setAdicionalFormTelefone(contato.telefone || '')
    setAdicionalFormEmail(contato.email || '')
    setAdicionalFormIsWhatsapp(Boolean(contato.is_whatsapp))
    setAdicionalFormIsPrincipal(Boolean(contato.is_principal) || contato.papel === 'principal')
    setModalEditarAdicionalAberto(true)
  }

  const handleSalvarEdicaoAdicional = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!contatoAdicionalEditando) return
    if (!adicionalFormNome.trim()) {
      toast.error('Informe o nome do contato')
      return
    }

    setIsSavingAdicional(true)
    try {
      await updateContatoAdicional(contatoAdicionalEditando.id, {
        nome: adicionalFormNome.trim(),
        cargo: adicionalFormCargo.trim() || undefined,
        papel: adicionalFormIsPrincipal ? 'principal' : adicionalFormPapel,
        telefone: adicionalFormTelefone.trim() || undefined,
        email: adicionalFormEmail.trim() || undefined,
        is_whatsapp: adicionalFormIsWhatsapp,
        is_principal: adicionalFormIsPrincipal,
      })

      if (adicionalFormIsPrincipal) {
        await definirContatoPrincipal({
          clienteId: cliente.id,
          contatoAdicionalId: contatoAdicionalEditando.id,
        })
      }

      await refreshContatosAdicionais()
      toast.success('Contato adicional atualizado com sucesso!')
      setModalEditarAdicionalAberto(false)
      setContatoAdicionalEditando(null)
    } catch (err) {
      console.error('Erro ao atualizar contato adicional:', err)
      toast.error('Erro ao salvar dados do contato adicional')
    } finally {
      setIsSavingAdicional(false)
    }
  }

  return (
    <>
      {/* Modal de confirmação ao converter um cliente existente em contato adicional */}
      <Dialog
        open={modalConfirmarConversaoAberto}
        onOpenChange={(open) =>
          !isConvertendoPessoa && !open && setModalConfirmarConversaoAberto(false)
        }
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900">
              Converter cliente em contato adicional?
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              A pessoa <strong>{pessoaSelecionada?.nome}</strong> já está cadastrada como um cliente
              independente no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 space-y-1">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                O cadastro de cliente será excluído
              </p>
              <p className="text-[11px] text-amber-800">
                Ao confirmar, o cadastro de <strong>{pessoaSelecionada?.nome}</strong> será
                transferido e passará a constar apenas como contato adicional de{' '}
                <strong>{cliente.nome}</strong>.
              </p>
            </div>

            {/* Sumário do que será transferido */}
            <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-gray-50/50">
              <div className="font-bold text-gray-800 flex items-center gap-1.5 text-xs">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                Vínculos que serão transferidos para {cliente.nome}:
              </div>
              {carregandoVinculos ? (
                <div className="text-gray-400 py-1 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Calculando vínculos...
                </div>
              ) : sumarioVinculosPessoa ? (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-white p-2 rounded border border-gray-100">
                    <span className="text-gray-500 block">Negócios:</span>
                    <strong className="text-gray-900 text-sm">
                      {sumarioVinculosPessoa.negocios}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-100">
                    <span className="text-gray-500 block">Atividades:</span>
                    <strong className="text-gray-900 text-sm">
                      {sumarioVinculosPessoa.atividades}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-100">
                    <span className="text-gray-500 block">Usinas:</span>
                    <strong className="text-gray-900 text-sm">
                      {sumarioVinculosPessoa.usinas}
                    </strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-gray-100">
                    <span className="text-gray-500 block">Orçamentos:</span>
                    <strong className="text-gray-900 text-sm">
                      {sumarioVinculosPessoa.orcamentos}
                    </strong>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isConvertendoPessoa}
              onClick={() => setModalConfirmarConversaoAberto(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isConvertendoPessoa}
              onClick={handleConfirmarConversaoPessoaCliente}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isConvertendoPessoa ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Transferindo e convertendo...
                </>
              ) : (
                'Confirmar e Converter em Contato'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ModalAvisoDuplicidadeTelefone
        isOpen={modalDuplicidadeAberto}
        onClose={() => setModalDuplicidadeAberto(false)}
        duplicados={duplicadosEncontrados}
        numeroInformado={telefone}
        nomeInformado={nome}
        modo="criacao"
        onConfirmarMesclar={async (destino) => {
          setIsMesclando(true)
          try {
            await executarMesclagemDuplicado({
              registroDestino: destino,
              dadosNovos: {
                nome: nome.trim(),
                telefone: telefone.trim() || undefined,
                whatsapp: isWhatsapp ? telefone.trim() : undefined,
                email: email.trim() || undefined,
                cargo: cargo.trim() || undefined,
              },
            })
            toast.success(`Contato mesclado com sucesso em "${destino.nome}"!`)
            setModalDuplicidadeAberto(false)
            handleResetForm()
          } catch (err) {
            console.error('Erro ao mesclar contato adicional:', err)
            toast.error('Não foi possível mesclar os contatos.')
          } finally {
            setIsMesclando(false)
          }
        }}
        onContinuarMesmoAssim={async () => {
          setModalDuplicidadeAberto(false)
          await persistirContatoAdicional(true)
        }}
        isCarregando={isMesclando}
      />

      {/* Modal de Edição dos Dados do Titular do Cadastro */}
      <Dialog
        open={modalEditarTitularAberto}
        onOpenChange={(open) => !isSavingTitular && setModalEditarTitularAberto(open)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <UserCheck className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900">
              Editar Titular do Cadastro
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Atualize as informações de contato do titular do cadastro. As alterações serão salvas
              diretamente no registro do cliente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicaoTitular} className="space-y-3 py-2 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                Nome completo *
              </label>
              <input
                type="text"
                required
                value={titularFormNome}
                onChange={(e) => setTitularFormNome(e.target.value)}
                placeholder="Ex: João da Silva"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                Cargo / Descrição do Contato
              </label>
              <input
                type="text"
                value={titularFormCargo}
                onChange={(e) => setTitularFormCargo(e.target.value)}
                placeholder="Ex: Titular / Proprietário, Sócio-Administrador"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Telefone Principal
                </label>
                <input
                  type="text"
                  value={titularFormTelefone}
                  onChange={(e) => setTitularFormTelefone(formatWhatsAppPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  WhatsApp (independente)
                </label>
                <input
                  type="text"
                  value={titularFormWhatsapp}
                  onChange={(e) => setTitularFormWhatsapp(formatWhatsAppPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">E-mail</label>
              <input
                type="email"
                value={titularFormEmail}
                onChange={(e) => setTitularFormEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingTitular}
                onClick={() => setModalEditarTitularAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingTitular || !titularFormNome.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSavingTitular ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Contato Adicional */}
      <Dialog
        open={modalEditarAdicionalAberto}
        onOpenChange={(open) => !isSavingAdicional && setModalEditarAdicionalAberto(open)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <User className="w-5 h-5" />
            </div>
            <DialogTitle className="text-base font-bold text-gray-900">
              Editar Contato Adicional
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-600">
              Atualize as informações do contato adicional vinculado a {cliente.nome}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicaoAdicional} className="space-y-3 py-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Nome completo *
                </label>
                <input
                  type="text"
                  required
                  value={adicionalFormNome}
                  onChange={(e) => setAdicionalFormNome(e.target.value)}
                  placeholder="Ex: Maria Pereira"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Papel do contato
                </label>
                <select
                  value={adicionalFormPapel}
                  onChange={(e) => setAdicionalFormPapel(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="principal">Principal</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="tecnico">Técnico</option>
                  <option value="responsavel">Responsável</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Cargo / Descrição
                </label>
                <input
                  type="text"
                  value={adicionalFormCargo}
                  onChange={(e) => setAdicionalFormCargo(e.target.value)}
                  placeholder="Ex: Gerente Financeiro, Sócio"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  Telefone / Celular
                </label>
                <input
                  type="text"
                  value={adicionalFormTelefone}
                  onChange={(e) => setAdicionalFormTelefone(formatWhatsAppPhone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={adicionalFormEmail}
                  onChange={(e) => setAdicionalFormEmail(e.target.value)}
                  placeholder="contato@empresa.com.br"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2 pt-1 flex flex-col sm:flex-row gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adicionalFormIsWhatsapp}
                    onChange={(e) => setAdicionalFormIsWhatsapp(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span>Este número é WhatsApp de contato</span>
                </label>

                <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={adicionalFormIsPrincipal}
                    onChange={(e) => setAdicionalFormIsPrincipal(e.target.checked)}
                    className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-emerald-900 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                    Contato Principal
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingAdicional}
                onClick={() => setModalEditarAdicionalAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingAdicional || !adicionalFormNome.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSavingAdicional ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div
        data-testid="secao-contatos-adicionais"
        className="bg-white rounded-xl p-4 border border-emerald-200/90 shadow-xs space-y-3.5"
      >
        {/* Cabeçalho da Seção */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                Contatos e Contato Principal
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  {1 + contatosDoCliente.length}
                </span>
              </h4>
              <p className="text-[10px] text-gray-500">
                Pessoas de contato vinculadas a este cliente. O contato principal é o destinatário
                padrão dos envios de WhatsApp.
              </p>
            </div>
          </div>

          {!isAdding && (
            <button
              type="button"
              onClick={() => {
                setIsAdding(true)
                setAbaAdicionar('novo')
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar contato</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {/* Card Contato Direto do Cliente */}
          <div
            className={`border rounded-lg p-3 transition-all ${
              contatoDiretoEhPrincipal
                ? 'bg-linear-to-r from-emerald-50/90 via-emerald-50/40 to-white border-emerald-300 ring-1 ring-emerald-500/20'
                : 'bg-gray-50/60 border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    contatoDiretoEhPrincipal
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                </span>
                <span className="text-xs font-bold text-gray-900">{contatoPrincipalNome}</span>
                {contatoDiretoEhPrincipal ? (
                  <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                    <Star className="w-3 h-3 fill-white text-white" />
                    Contato Principal
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-medium tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                    Titular do Cadastro
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Botão Editar Titular */}
                <button
                  type="button"
                  onClick={handleAbrirEditarTitular}
                  className="text-[11px] font-semibold text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 border border-gray-200 hover:border-emerald-300"
                  title="Editar dados do titular do cadastro"
                >
                  <Pencil className="w-3 h-3 text-gray-500 hover:text-emerald-600" />
                  <span>Editar</span>
                </button>

                {!contatoDiretoEhPrincipal && (
                  <button
                    type="button"
                    onClick={() => handleDefinirComoPrincipal(null)}
                    disabled={settingPrincipalId === 'direto'}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 border border-emerald-200"
                    title="Tornar este o contato principal para envios de WhatsApp"
                  >
                    {settingPrincipalId === 'direto' ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Star className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>Definir como Contato Principal</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 pt-1 border-t border-gray-200/50">
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-gray-500">Cargo:</span>
                <span className="font-medium text-gray-800 truncate" title={contatoPrincipalCargo}>
                  {contatoPrincipalCargo}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-gray-500">Tel:</span>
                <span className="font-medium text-gray-800 truncate">
                  {contatoPrincipalTelefone}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-gray-500">E-mail:</span>
                <span className="font-medium text-gray-800 truncate" title={contatoPrincipalEmail}>
                  {contatoPrincipalEmail}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Contatos Adicionais */}
          {contatosDoCliente.map((contato) => {
            const ehPrincipal = Boolean(contato.is_principal) || contato.papel === 'principal'

            return (
              <div
                key={contato.id}
                data-testid={`contato-adicional-${contato.id}`}
                className={`group border rounded-lg p-3 transition-colors ${
                  ehPrincipal
                    ? 'bg-linear-to-r from-emerald-50/90 via-emerald-50/40 to-white border-emerald-300 ring-1 ring-emerald-500/20'
                    : 'bg-gray-50/70 hover:bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                        ehPrincipal ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      <User className="w-3 h-3" />
                    </span>
                    <span className="text-xs font-bold text-gray-900">{contato.nome}</span>

                    {ehPrincipal ? (
                      <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white text-white" />
                        Contato Principal
                      </span>
                    ) : (
                      contato.papel && (
                        <span className="text-[10px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {contato.papel}
                        </span>
                      )
                    )}

                    {contato.cargo && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                        {contato.cargo}
                      </span>
                    )}

                    {contato.is_whatsapp && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 flex items-center gap-1">
                        WhatsApp
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Botão Editar Contato Adicional */}
                    <button
                      type="button"
                      onClick={() => handleAbrirEditarAdicional(contato)}
                      className="text-[11px] font-semibold text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 border border-gray-200 hover:border-emerald-300"
                      title="Editar dados deste contato adicional"
                    >
                      <Pencil className="w-3 h-3 text-gray-500 hover:text-emerald-600" />
                      <span>Editar</span>
                    </button>

                    {!ehPrincipal && (
                      <button
                        type="button"
                        onClick={() => handleDefinirComoPrincipal(contato.id)}
                        disabled={settingPrincipalId === contato.id}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors inline-flex items-center gap-1 border border-emerald-200"
                        title="Tornar este o contato principal para envios de WhatsApp"
                      >
                        {settingPrincipalId === contato.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Star className="w-3 h-3 text-emerald-600" />
                        )}
                        <span>Definir como Principal</span>
                      </button>
                    )}

                    {/* Botão de Excluir Contato Adicional */}
                    <button
                      type="button"
                      onClick={() => handleExcluirContato(contato.id, contato.nome)}
                      disabled={deletingId === contato.id}
                      title="Remover contato adicional"
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deletingId === contato.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 pt-1 border-t border-gray-200/60">
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500">Cargo:</span>
                    <span className="font-medium text-gray-800 truncate">
                      {contato.cargo || 'Não informado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500">Tel:</span>
                    <span className="font-medium text-gray-800 truncate">
                      {contato.telefone || 'Não informado'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-500">E-mail:</span>
                    <span className="font-medium text-gray-800 truncate" title={contato.email}>
                      {contato.email || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Painel de Adicionar Contato com Abas: Novo vs Buscar Pessoa */}
          {isAdding && (
            <div className="p-3 bg-emerald-50/50 border border-emerald-300 rounded-lg space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-1 border-b border-emerald-200/60">
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-emerald-200">
                  <button
                    type="button"
                    onClick={() => setAbaAdicionar('novo')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      abaAdicionar === 'novo'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Novo contato
                  </button>
                  <button
                    type="button"
                    onClick={() => setAbaAdicionar('buscar')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1 ${
                      abaAdicionar === 'buscar'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Search className="w-3 h-3" />
                    Buscar pessoa já cadastrada
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-gray-400 hover:text-gray-600 p-0.5"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Aba 1: Novo contato */}
              {abaAdicionar === 'novo' && (
                <form onSubmit={handleSalvarNovoContato} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Nome completo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Papel do contato
                      </label>
                      <select
                        value={papel}
                        onChange={(e) => setPapel(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        <option value="principal">Principal</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="tecnico">Técnico</option>
                        <option value="responsavel">Responsável</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Cargo / Descrição
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Gerente Financeiro, Sócio"
                        value={cargo}
                        onChange={(e) => setCargo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        Telefone / Celular
                      </label>
                      <input
                        type="text"
                        placeholder="(00) 00000-0000"
                        value={telefone}
                        onChange={(e) => setTelefone(formatWhatsAppPhone(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">
                        E-mail
                      </label>
                      <input
                        type="email"
                        placeholder="contato@empresa.com.br"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="sm:col-span-2 pt-1 flex flex-col sm:flex-row gap-3">
                      <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isWhatsapp}
                          onChange={(e) => setIsWhatsapp(e.target.checked)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <span>Este número é WhatsApp de contato</span>
                      </label>

                      <label className="inline-flex items-center gap-2 text-xs text-gray-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isPrincipal}
                          onChange={(e) => setIsPrincipal(e.target.checked)}
                          className="w-3.5 h-3.5 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                        />
                        <span className="font-semibold text-emerald-900 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                          Definir já como Contato Principal
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-emerald-200/60">
                    <button
                      type="button"
                      onClick={handleResetForm}
                      disabled={isSaving}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving || !nome.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar contato</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Aba 2: Buscar pessoa já cadastrada */}
              {abaAdicionar === 'buscar' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por nome, telefone, WhatsApp, e-mail ou CPF/CNPJ..."
                      value={termoBuscaPessoa}
                      onChange={(e) => setTermoBuscaPessoa(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      autoFocus
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100">
                    {termoBuscaPessoa.trim().length < 2 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        Digite pelo menos 2 caracteres para pesquisar pessoas ou clientes
                        cadastrados.
                      </div>
                    ) : pessoasEncontradas.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        Nenhuma pessoa encontrada com o termo "{termoBuscaPessoa}".
                      </div>
                    ) : (
                      pessoasEncontradas.map((p) => (
                        <div
                          key={`${p.origem}-${p.id}`}
                          className="p-2.5 hover:bg-emerald-50/60 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">{p.nome}</span>
                              {p.origem === 'cliente' ? (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                  Cliente Independente
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                                  Contato de: {p.clientePaiNome || 'Outro cliente'}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 flex items-center gap-2 flex-wrap">
                              {p.telefone && <span>Tel: {formatWhatsAppPhone(p.telefone)}</span>}
                              {p.email && <span>E-mail: {p.email}</span>}
                              {p.documento && <span>Doc: {p.documento}</span>}
                              {p.cidade && <span>Local: {p.cidade}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelecionarPessoaParaInclusao(p)}
                            disabled={isSaving}
                            className="shrink-0 px-2.5 py-1 text-xs font-bold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                          >
                            {p.origem === 'cliente' ? 'Converter em Contato' : 'Vincular'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
export default SecaoContatosAdicionais

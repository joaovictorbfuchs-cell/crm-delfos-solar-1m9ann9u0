import React, { useEffect, useState } from 'react'
import { FileText, ExternalLink, Search } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import type { Equipamento, TipoEquipamento } from '@/types/equipamentos'
import {
  fetchEquipamentos,
  getDatasheetEquipamentoUrl,
  encontrarEquipamentoCorrespondente,
} from '@/services/equipamentosService'

// Cache em memória compartilhado por toda a sessão da aplicação
let catalogoCache: Equipamento[] | null = null
let catalogoPromise: Promise<Equipamento[]> | null = null

export async function getCachedEquipamentos(): Promise<Equipamento[]> {
  if (catalogoCache) return catalogoCache
  if (!catalogoPromise) {
    catalogoPromise = fetchEquipamentos()
      .then((records) => {
        catalogoCache = records
        return records
      })
      .catch((err) => {
        console.warn('Erro ao carregar catálogo de equipamentos para datasheet:', err)
        return []
      })
      .finally(() => {
        catalogoPromise = null
      })
  }
  return catalogoPromise
}

export function invalidarCacheEquipamentos() {
  catalogoCache = null
}

interface DatasheetBadgeProps {
  marca?: string
  modelo?: string
  tipo?: TipoEquipamento
  catalogo?: Equipamento[]
  className?: string
  /**
   * Se true, exibe o link discreto "Buscar datasheet" quando não houver correspondência com PDF.
   * Padrão: true
   */
  mostrarLinkBusca?: boolean
}

export const DatasheetBadge: React.FC<DatasheetBadgeProps> = ({
  marca,
  modelo,
  tipo,
  catalogo,
  className = '',
  mostrarLinkBusca = true,
}) => {
  const [equipamentoComDatasheet, setEquipamentoComDatasheet] = useState<Equipamento | null>(null)
  const [carregando, setCarregando] = useState<boolean>(false)

  const marcaNorm = (marca || '').trim()
  const modeloNorm = (modelo || '').trim()

  useEffect(() => {
    let cancelado = false

    if (!marcaNorm && !modeloNorm) {
      setEquipamentoComDatasheet(null)
      return
    }

    const resolver = (lista: Equipamento[]) => {
      if (cancelado) return
      const achado = encontrarEquipamentoCorrespondente(lista, {
        marca: marcaNorm,
        modelo: modeloNorm,
        tipo,
        apenasComDatasheet: true,
      })
      setEquipamentoComDatasheet(achado)
      setCarregando(false)
    }

    if (catalogo && catalogo.length > 0) {
      resolver(catalogo)
    } else {
      setCarregando(true)
      getCachedEquipamentos()
        .then(resolver)
        .catch(() => {
          if (!cancelado) setCarregando(false)
        })
    }

    return () => {
      cancelado = true
    }
  }, [marcaNorm, modeloNorm, tipo, catalogo])

  // Se encontrou equipamento com datasheet_pdf preenchido
  if (equipamentoComDatasheet && equipamentoComDatasheet.datasheet_pdf) {
    // Obter URL via helper ou pb.files.getURL direto
    const url =
      getDatasheetEquipamentoUrl(equipamentoComDatasheet) ||
      pb.files.getURL(equipamentoComDatasheet, equipamentoComDatasheet.datasheet_pdf)

    if (url) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 transition-colors shrink-0 shadow-2xs ${className}`}
          title={`Abrir Datasheet PDF oficial (${equipamentoComDatasheet.marca} ${equipamentoComDatasheet.modelo})`}
        >
          <FileText className="w-3 h-3 text-emerald-600" />
          <span>Datasheet</span>
          <ExternalLink className="w-2.5 h-2.5 text-emerald-600 ml-0.5" />
        </a>
      )
    }
  }

  // Se está carregando assincronamente ou não há dados de busca
  if (carregando || (!marcaNorm && !modeloNorm)) {
    return null
  }

  // Se NÃO encontrar com datasheet, mostrar link discreto "Buscar datasheet"
  if (mostrarLinkBusca) {
    const termoBusca = encodeURIComponent(marcaNorm || modeloNorm)
    return (
      <a
        href={`/equipamentos?busca=${termoBusca}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-700 hover:underline px-1.5 py-0.5 rounded transition-colors shrink-0 ${className}`}
        title={`Buscar datasheet de "${marcaNorm || modeloNorm}" no catálogo de equipamentos`}
      >
        <Search className="w-2.5 h-2.5 text-slate-400" />
        <span>Buscar datasheet</span>
      </a>
    )
  }

  return null
}

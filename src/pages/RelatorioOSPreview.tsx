import React from 'react'
import { useParams } from 'react-router-dom'
import { RelatorioOSConteudo } from '@/components/RelatorioOSConteudo'

export const RelatorioOSPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return <RelatorioOSConteudo id={id} showHeaderActions={true} />
}

export default RelatorioOSPreview

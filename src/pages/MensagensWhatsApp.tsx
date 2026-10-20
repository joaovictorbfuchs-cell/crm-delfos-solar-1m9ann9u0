import React from 'react'
import { Layout } from '@/components/Layout'
import { GerenciarMensagensWhatsApp } from '@/components/GerenciarMensagensWhatsApp'

export const MensagensWhatsApp: React.FC = () => {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-4 px-2 sm:px-4">
        <GerenciarMensagensWhatsApp />
      </div>
    </Layout>
  )
}

export default MensagensWhatsApp

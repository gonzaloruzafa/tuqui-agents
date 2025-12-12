import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Tuqui Agents - Asistentes IA para empresas',
  description: 'Agentes de IA entrenados con tu documentación, conectados a tus sistemas.',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}

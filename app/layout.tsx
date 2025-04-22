import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Manganime',
  description: 'Your ultimate anime and manga streaming platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <SupabaseAuthProvider>
          {children}
          <Toaster richColors position="top-right" theme="dark" />
        </SupabaseAuthProvider>
      </body>
    </html>
  )
}

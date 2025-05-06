import './globals.css'
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { NextAuthProvider } from '@/providers/auth-provider'
import { SupabaseAuthProvider } from '@/components/supabase-auth-provider'
import { UnifiedAuthProvider } from '@/components/unified-auth-provider'
import { MaintenanceRunner } from '@/components/maintenance-runner'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
})

// Initialize SQL functions asynchronously
const initializeSQLFunctions = async () => {
  try {
    console.log("Initializing SQL helper functions...")
    const response = await fetch('/api/setup/create-sql-functions')
    const result = await response.json()
    
    if (result.success) {
      console.log("SQL functions initialized successfully")
    } else {
      console.error("Failed to initialize SQL functions:", result.message)
    }
  } catch (error) {
    console.error("Error initializing SQL functions:", error)
  }
}

// Don't wait for this to complete - run in background
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setTimeout(() => {
    initializeSQLFunctions()
  }, 2000) // Delay by 2 seconds to let the app start first
}

export const metadata: Metadata = {
  title: 'MangAnime',
  description: 'Explore anime and manga content',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <NextAuthProvider>
          <SupabaseAuthProvider>
            <UnifiedAuthProvider>
              <MaintenanceRunner />
              {children}
              <Toaster richColors position="top-right" theme="dark" />
            </UnifiedAuthProvider>
          </SupabaseAuthProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}

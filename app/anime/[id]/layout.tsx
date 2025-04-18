import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"

export default function AnimeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-black text-white">
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  )
}

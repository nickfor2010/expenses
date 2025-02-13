import "@/styles/globals.css"
import { Inter } from "next/font/google"
import Providers from "@/components/Providers"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Expense Tracker",
  description: "A simple expense tracking application",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}



import './globals.css'
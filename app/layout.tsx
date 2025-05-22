import type React from "react"
export const metadata = {
  title: "Chrome Summarizer Extension API",
  description: "API for the Chrome Summarizer Extension",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


import './globals.css'
import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

export const metadata: Metadata = {
  title: 'LRC Editor — Play Leaf',
  description: 'Whisper JSON → LRC 변환 + 싱크 편집 도구',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${dmSans.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}

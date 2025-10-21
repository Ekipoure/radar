import type { Metadata } from 'next'
import { Vazirmatn } from 'next/font/google'
import './globals.css'

const vazirmatn = Vazirmatn({ 
  subsets: ['arabic', 'latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-vazirmatn'
})

export const metadata: Metadata = {
  title: 'رادار مانیتورینگ - سیستم نظارت بر سرورها',
  description: 'سیستم پیشرفته نظارت بر سرورها با قابلیت بررسی ping، HTTP، HTTPS و TCP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3B82F6" />
      </head>
      <body className={`${vazirmatn.className} font-sans`}>
        {children}
      </body>
    </html>
  )
}

import './globals.css'

export const metadata = {
  title: 'TagOption — Trading Made Easy, Trade Smart',
  description: 'Trade 100+ assets worldwide with lightning execution and up to 95% returns.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

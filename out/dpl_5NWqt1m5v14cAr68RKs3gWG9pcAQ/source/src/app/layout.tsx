import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Credit Dashboard',
  description: 'Katie & Stephen — card credits, trips, and hotel stacking',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;1,9..144,300&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --canvas: #F5F1EA;
            --ink:    #1C1917;
            --ox:     #6B1A1A;
            --terra:  #B85C38;
            --sand:   #D4C5A9;
            --bark:   #8B7355;
          }
          body {
            font-family: 'Inter', system-ui, sans-serif;
            background: var(--canvas);
            color: var(--ink);
            min-height: 100vh;
          }
          .fr { font-family: 'Fraunces', Georgia, serif; font-weight: 300; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  )
}

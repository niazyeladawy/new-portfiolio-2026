import type { Metadata } from 'next';
import { Inter, Anton } from 'next/font/google';
import './globals.css';
import Nav from './components/Nav';

/*
  Inter carries every piece of running text: 400 for copy, 700 for buttons
  and labels. Exposed as a variable rather than a className so globals.css
  stays the single place --font-body is assembled.
*/
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

/*
  Fallback behind the self-hosted Veneer in --font-display — it should never
  paint, but it keeps a failed font load from reflowing the page: one weight,
  the same tight uppercase caps at display size.
*/
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Niazy Eladawy — Senior Frontend Developer',
  description:
    'I craft immersive web experiences and scalable web applications using React, Next.js, Vue.js, Nuxt.js, and Three.js.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${anton.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}

import { Libre_Franklin } from 'next/font/google';
import './globals.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Analytics } from '@vercel/analytics/next';

const libreFranklin = Libre_Franklin({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  gsap.registerPlugin(ScrollTrigger)
  return (
    <html lang="en">
      <body className={libreFranklin.className}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
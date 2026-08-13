import type { Metadata } from 'next';
import { Inter, Bebas_Neue } from 'next/font/google';
import './globals.css';
import Nav from './components/Nav';

/*
  Bebas Neue, the display face — it stands where Veneer did, a licensed face
  that could not ship in the repo. next/font/google self-hosts it: the file is
  emitted with the build, fingerprinted, served from our own origin and
  preloaded in the head, so no request ever reaches Google and the face is in
  flight with the document rather than discovered once the CSS is parsed.

  weight: '400' because that is the whole family — Bebas Neue is one weight on
  Google Fonts, no variable file and no other cut. --weight-display in
  globals.css is set to match; asking for anything else there would resolve
  back to this one anyway.

  display: 'block' because the name is set at 18.5vw. A swap at that size is
  the whole panel relaying itself under the reader; better to hold the line
  blank for the block period, which the preload keeps short.
*/
const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas-neue',
  display: 'block',
});

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
    <html lang="en" className={`${inter.variable} ${bebasNeue.variable}`}>
      <body>
        {/*
          Every split heading is served hidden so it cannot show itself at
          rest before the script parks it below its line — see SplitWords and
          .splitted__word.is-parked. The class comes off on mount; with no
          script to mount, this is what puts the words back.
        */}
        <noscript>
          <style>{`.splitted__word.is-parked { visibility: visible; }`}</style>
        </noscript>

        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <Nav />
        <main id="main">{children}</main>
      </body>
    </html>
  );
}

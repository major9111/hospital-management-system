import type { Metadata } from 'next';
import { Source_Serif_4, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const display = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});
const body = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Hospital Network Console',
  description: 'Staff and patient console for the hospital network',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}

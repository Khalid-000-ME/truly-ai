import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Unbounded } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
});

const spaceGrotesk = Space_Grotesk({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-space-grotesk',
});

const unbounded = Unbounded({
  weight: ['200', '300', '400', '500', '600', '700', '800', '900'],
  subsets: ['latin'],
  variable: '--font-unbounded',
});

export const metadata: Metadata = {
  title: "TrulyAI - Fact Checking Assistant",
  description: "Validate claims using AI-powered analysis of text, images, videos, and audio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${ibmPlexMono.variable} ${spaceGrotesk.variable} ${unbounded.variable} font-space-grotesk antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

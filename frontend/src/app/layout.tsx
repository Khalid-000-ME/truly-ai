import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Unbounded, Instrument_Serif, Inter } from "next/font/google";
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

const instrumentSerif = Instrument_Serif({
  weight: ['400'],
  subsets: ['latin'],
  variable: '--font-instrument-serif',
});

const inter = Inter({
  weight: ['300', '400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "TrulyAI - Advanced Fact-Checking & Misinformation Detection Platform",
  description: "Combat misinformation with AI-powered multimodal analysis. Verify claims through comprehensive analysis of text, images, videos, and audio content with transparent credibility scoring.",
  keywords: ["fact-checking", "misinformation detection", "AI analysis", "multimodal", "credibility scoring", "social media verification"],
  authors: [{ name: "TrulyAI Team" }],
  creator: "TrulyAI",
  publisher: "TrulyAI",
  robots: "index, follow",
  openGraph: {
    type: "website",
    title: "TrulyAI - Advanced Fact-Checking Platform",
    description: "Combat misinformation with AI-powered multimodal analysis and transparent credibility scoring.",
    siteName: "TrulyAI",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "TrulyAI Logo - Fact-Checking Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TrulyAI - Advanced Fact-Checking Platform",
    description: "Combat misinformation with AI-powered multimodal analysis and transparent credibility scoring.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
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
        className={`${ibmPlexMono.variable} ${spaceGrotesk.variable} ${unbounded.variable} ${instrumentSerif.variable} ${inter.variable} font-space-grotesk antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

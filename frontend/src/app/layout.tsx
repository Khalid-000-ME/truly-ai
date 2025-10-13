import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-mono',
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
      <body
        className={`${ibmPlexMono.variable} font-mono antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

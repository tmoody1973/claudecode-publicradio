import type { Metadata, Viewport } from "next";
import { Archivo_Black, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatDock } from "@/components/chat/chat-dock";

const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-head",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Claude Code for Public Media",
    template: "%s — Claude Code for Public Media",
  },
  description:
    "A 6-hour Claude Code course, translated for public radio and public television. 10 modules, 50 station use cases, and an AI assistant that knows all of it.",
  openGraph: {
    title: "Claude Code for Public Media",
    description:
      "A 6-hour Claude Code course, translated for public radio and public television. 10 modules, 50 station use cases.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never trap pinch-zoom. Accessibility floor.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff7e8" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1815" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivoBlack.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh flex flex-col antialiased">
        <Providers>
          <a href="#main" className="skip-link">
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <ChatDock />
        </Providers>
      </body>
    </html>
  );
}

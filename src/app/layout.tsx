import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: { default: "Sharefetch", template: "%s · Sharefetch" },
  description:
    "Publish your desktop stack as a living fetch card. Embed the SVG anywhere.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${plexMono.variable} ${plexSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-8">
          {children}
        </main>
        <footer className="rule chrome text-muted text-xs">
          <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between gap-4">
            <span>sharefetch · a fetch is a claim about a stack; verify yours.</span>
            <a href="/explore" className="hover:text-fg">
              explore
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}

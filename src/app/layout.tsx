import type { Metadata } from "next";
import { Playfair_Display, Source_Sans_3, Geist_Mono } from "next/font/google";
import Link from "next/link";
import AuthSessionProvider from "@/components/session-provider";
import { NavBar } from "@/components/nav-bar";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Habuild Giveaway Grader",
  description:
    "Grade and rank giveaway competition posts from the Habuild Facebook community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${sourceSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthSessionProvider>
          <header className="relative bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-800 text-white shadow-lg overflow-hidden">
            {/* Subtle decorative circles */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl" />
              <div className="absolute -top-5 right-20 w-32 h-32 bg-blue-400/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 right-1/3 w-24 h-24 bg-teal-400/10 rounded-full blur-xl" />
            </div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
              <Link href="/" className="text-2xl font-heading font-black tracking-tight drop-shadow-sm">
                Habuild Giveaway Grader
              </Link>
              <NavBar />
            </div>
          </header>
          <main className="relative flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            {children}
          </main>
          {/* Soothing bottom wave decoration */}
          <footer className="relative mt-auto">
            <svg className="w-full h-16 text-slate-100" viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              <path d="M0 32C240 48 480 16 720 32C960 48 1200 16 1440 32V64H0V32Z" fill="currentColor" />
            </svg>
            <div className="bg-slate-100 text-center py-4 text-sm text-muted-foreground font-bold">
              Habuild Giveaway Grader
            </div>
          </footer>
        </AuthSessionProvider>
      </body>
    </html>
  );
}

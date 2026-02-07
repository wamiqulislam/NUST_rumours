import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Campus Rumors | Anonymous Truth Discovery",
  description: "A decentralized platform for anonymous campus rumors with credibility-weighted voting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen`}
      >
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🔮</span>
              <span className="font-bold text-xl bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Campus Rumors
              </span>
            </Link>

            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="text-gray-400 hover:text-white transition-colors px-3 py-2"
              >
                Feed
              </Link>
              <Link 
                href="/submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 
                         hover:from-purple-500 hover:to-pink-500
                         rounded-lg font-medium transition-all"
              >
                + Submit Rumor
              </Link>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="pt-20 pb-12 min-h-screen">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-8 text-center text-gray-500 text-sm">
          <p>🔒 100% Anonymous • No Central Authority • Truth Through Consensus</p>
          <p className="mt-2 text-gray-600">
            Your votes are weighted by credibility. Honest participation builds trust.
          </p>
        </footer>
      </body>
    </html>
  );
}

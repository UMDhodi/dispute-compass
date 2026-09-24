import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap", // Efficiency: font-display: swap for faster perceived load
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DisputeCompass — Understand Your Legal Rights",
  description:
    "AI-powered legal document analysis, contract comparison, dispute navigation, and lawyer-ready brief generation. Understand your rights, navigate your options.",
  keywords: ["legal", "contract", "dispute", "AI", "document analysis", "tenant rights", "consumer rights"],
  authors: [{ name: "DisputeCompass" }],
  openGraph: {
    title: "DisputeCompass — Understand Your Legal Rights",
    description: "AI-powered legal document analysis and dispute navigation",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Accessibility: viewport must not restrict user zoom */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0e9384" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        style={{ background: "var(--background)" }}
      >
        {/* Skip-to-main-content link — keyboard / screen-reader accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
          style={{ background: "var(--brand-500)" }}
        >
          Skip to main content
        </a>

        <Navbar />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

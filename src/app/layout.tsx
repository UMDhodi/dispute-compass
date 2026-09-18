import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
        style={{ background: "var(--background)" }}
      >
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { allGoogleFonts } from "@/lib/fonts";
import SessionProvider from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "Paperbacks.AI - AI-Powered Book Cover Generator",
  description: "Create professional paperback book covers with AI assistance. Perfect spine calculations, customizable layouts, and print-ready exports for KDP and print-on-demand services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate combined font class names for all Google Fonts
  const googleFontClasses = allGoogleFonts.map(font => font.className).join(' ');

  return (
    <html lang="en" className="h-full">
      <body
        className={`${googleFontClasses} antialiased flex flex-col min-h-full`}
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        <SessionProvider>
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}

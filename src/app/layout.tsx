import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ClinReason — Zolentix",
  description: "Multilingual clinical reasoning engine. Differential diagnosis, triage, and medication-safety support.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import {
  Activity,
  LayoutDashboard,
  User,
  Heart,
  BarChart3,
  FileText,
  BookOpen,
  Bell,
  Settings,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SidebarNav } from "./sidebar-nav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ClinReason — Zolentix",
  description: "Multilingual clinical reasoning engine. Differential diagnosis, triage, and medication-safety support.",
};

const NAV_ITEMS: { icon: string; label: string; target: string; active?: boolean }[] = [
  { icon: "LayoutDashboard", label: "Dashboard", target: "top", active: true },
  { icon: "User", label: "Patient", target: "section-input" },
  { icon: "Heart", label: "Anatomy", target: "section-anatomy" },
  { icon: "BarChart3", label: "Results", target: "section-results" },
  { icon: "FileText", label: "Assessment", target: "section-assessment" },
  { icon: "BookOpen", label: "Red Flags", target: "section-redflags" },
];

const BOTTOM_NAV: { icon: string; label: string; target: string }[] = [
  { icon: "Bell", label: "Actions", target: "section-actions" },
  { icon: "Settings", label: "Settings", target: "top" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased text-slate-100 min-h-screen`}>
        <div className="flex min-h-screen">
          {/* ── Sidebar ── */}
          <SidebarNav navItems={NAV_ITEMS} bottomNav={BOTTOM_NAV} />

          {/* ── Main area ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Top header */}
            <header className="h-[52px] shrink-0 border-b border-white/[0.04] bg-[#04070e]/70 backdrop-blur-xl flex items-center justify-between px-6 no-print">
              <div className="flex items-center gap-4">
                <h1 className="text-[15px] font-semibold text-white tracking-tight">ClinReason</h1>
                <div className="h-4 w-px bg-white/[0.08]" />
                <span className="text-[9px] text-emerald-400/60 font-semibold uppercase tracking-[0.15em] border border-emerald-500/15 rounded-full px-2.5 py-[3px] bg-emerald-500/[0.04]">
                  Clinical Decision Support
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search conditions, drugs, ICD-10…"
                    className="w-56 h-[30px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 pl-7 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/25 focus:bg-white/[0.05] transition-all"
                    readOnly
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                </div>
                <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/15 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-emerald-400">Z</span>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-6" id="top">
              {children}
            </main>

            <footer className="h-7 shrink-0 border-t border-white/[0.03] bg-[#04070e]/50 flex items-center justify-between px-6 no-print">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-[5px] h-[5px] rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-slate-500 font-medium">System Online</span>
                </div>
                <span className="text-[9px] text-slate-700">·</span>
                <span className="text-[9px] text-slate-600">v2.0 — Deterministic Engine · Demo KB · Not a diagnostic device</span>
              </div>
              <span className="text-[9px] text-slate-600">Built by <span className="text-slate-500">Zolentix</span></span>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}

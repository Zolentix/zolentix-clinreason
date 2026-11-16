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

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ClinReason — Zolentix",
  description: "Multilingual clinical reasoning engine. Differential diagnosis, triage, and medication-safety support.",
};

const NAV_ITEMS: { icon: LucideIcon; label: string; active?: boolean }[] = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: User, label: "Patient" },
  { icon: Heart, label: "Anatomy" },
  { icon: BarChart3, label: "Analytics" },
  { icon: FileText, label: "Reports" },
  { icon: BookOpen, label: "Knowledge Base" },
];

const BOTTOM_NAV: { icon: LucideIcon; label: string }[] = [
  { icon: Bell, label: "Notifications" },
  { icon: Settings, label: "Settings" },
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
          <aside className="w-[60px] shrink-0 bg-[#04070e] border-r border-white/[0.04] flex flex-col items-center py-5 gap-1.5 no-print">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
              <Activity className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
            </div>

            {NAV_ITEMS.map((item) => (
              <SidebarIcon key={item.label} Icon={item.icon} tooltip={item.label} active={item.active} />
            ))}

            <div className="mt-auto flex flex-col items-center gap-1.5">
              {BOTTOM_NAV.map((item) => (
                <SidebarIcon key={item.label} Icon={item.icon} tooltip={item.label} />
              ))}
            </div>
          </aside>

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

            <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-6">
              {children}
            </main>

            <footer className="h-7 shrink-0 border-t border-white/[0.03] bg-[#04070e]/50 flex items-center justify-between px-6 no-print">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-[5px] h-[5px] rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] text-slate-500 font-medium">System Online</span>
                </div>
                <span className="text-[9px] text-slate-700">·</span>
                <span className="text-[9px] text-slate-600">v2.0 — Gemini-Powered · Demo KB · Not a diagnostic device</span>
              </div>
              <span className="text-[9px] text-slate-600">Built by <span className="text-slate-500">Zolentix</span></span>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}

function SidebarIcon({ Icon, active, tooltip }: { Icon: LucideIcon; active?: boolean; tooltip: string }) {
  return (
    <div
      title={tooltip}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative cursor-default ${
        active
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-emerald-400 rounded-r" />}
    </div>
  );
}

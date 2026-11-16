'use client';

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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useCallback } from "react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, User, Heart, BarChart3, FileText, BookOpen, Bell, Settings,
};

type NavItem = { icon: string; label: string; target: string; active?: boolean };

export function SidebarNav({ navItems, bottomNav }: { navItems: NavItem[]; bottomNav: NavItem[] }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const scrollTo = useCallback((target: string, idx: number) => {
    setActiveIdx(idx);
    if (target === 'top') {
      document.getElementById('top')?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <aside className="w-[60px] shrink-0 bg-[#04070e] border-r border-white/[0.04] flex flex-col items-center py-5 gap-1.5 no-print">
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-8 shadow-lg shadow-emerald-500/20">
        <Activity className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
      </div>

      {navItems.map((item, i) => {
        const Icon = ICON_MAP[item.icon];
        if (!Icon) return null;
        return (
          <button key={item.label} title={item.label} onClick={() => scrollTo(item.target, i)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative cursor-pointer ${
              activeIdx === i
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]'
            }`}>
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            {activeIdx === i && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-emerald-400 rounded-r" />}
          </button>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1.5">
        {bottomNav.map((item) => {
          const Icon = ICON_MAP[item.icon];
          if (!Icon) return null;
          return (
            <button key={item.label} title={item.label} onClick={() => scrollTo(item.target, -1)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-slate-600 hover:text-slate-400 hover:bg-white/[0.03] cursor-pointer">
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}

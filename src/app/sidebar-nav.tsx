'use client';

import {
  Activity, LayoutDashboard, User, Heart, BarChart3,
  FileText, BookOpen, Settings, Search, Pill,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard, User, Heart, BarChart3, FileText, BookOpen, Settings, Search, Pill,
};

export type ViewId = 'dashboard' | 'patient' | 'anatomy' | 'analysis' | 'assessment' | 'search' | 'tracking' | 'settings';

type NavDef = { icon: string; label: string; view: ViewId };

const MAIN_NAV: NavDef[] = [
  { icon: 'LayoutDashboard', label: 'Dashboard', view: 'dashboard' },
  { icon: 'User',            label: 'Patient',   view: 'patient' },
  { icon: 'Heart',           label: 'Anatomy',   view: 'anatomy' },
  { icon: 'BarChart3',       label: 'Analysis',  view: 'analysis' },
  { icon: 'FileText',        label: 'Assessment', view: 'assessment' },
  { icon: 'Search',          label: 'Knowledge', view: 'search' },
];

const BOTTOM_NAV: NavDef[] = [
  { icon: 'Pill',     label: 'Tracking', view: 'tracking' },
  { icon: 'Settings', label: 'Settings', view: 'settings' },
];

export function SidebarNav({ activeView, onViewChange }: { activeView: ViewId; onViewChange: (v: ViewId) => void }) {
  return (
    <aside className="w-[60px] shrink-0 bg-[#04070e] border-r border-white/[0.04] flex flex-col items-center py-5 gap-1.5 no-print">
      <button className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20 cursor-pointer"
        onClick={() => onViewChange('dashboard')}>
        <Activity className="w-[18px] h-[18px] text-white" strokeWidth={2.5} />
      </button>

      {MAIN_NAV.map((item) => {
        const Icon = ICON_MAP[item.icon];
        if (!Icon) return null;
        const active = activeView === item.view;
        return (
          <button key={item.view} title={item.label} onClick={() => onViewChange(item.view)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative cursor-pointer ${
              active ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]'
            }`}>
            <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-emerald-400 rounded-r" />}
          </button>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1.5">
        {BOTTOM_NAV.map((item) => {
          const Icon = ICON_MAP[item.icon];
          if (!Icon) return null;
          const active = activeView === item.view;
          return (
            <button key={item.view} title={item.label} onClick={() => onViewChange(item.view)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all relative cursor-pointer ${
                active ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.03]'
              }`}>
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
              {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-emerald-400 rounded-r" />}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

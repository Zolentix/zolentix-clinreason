'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { ClinReport, Lang } from '@/lib/types';
import { t } from '@/lib/i18n/strings';
import { SAMPLE_CASES } from '@/lib/ai/samples';
import { SidebarNav, type ViewId } from './sidebar-nav';
import AIChat from '@/components/AIChat';
import { Activity, Search, ArrowRight, Heart, Brain, Stethoscope, Shield, AlertTriangle, Pill, TrendingUp, Clipboard, ChevronRight, BarChart3 } from 'lucide-react';

const AnatomyViewer3D = dynamic(() => import('@/components/AnatomyViewer3D'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-[#060d18] rounded-xl">
    <div className="text-center">
      <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
      <p className="text-xs text-white/40">Loading 3D Anatomy Engine...</p>
    </div>
  </div>
)});

type Stage = 'idle' | 'running' | 'done' | 'error';
type ResultTab = 'overview' | 'differential' | 'medsafety' | 'assessment';

/* ------------------------------------------------------------------ */
/*  Shared UI Components                                               */
/* ------------------------------------------------------------------ */
function Panel({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`bg-[#070e1a]/60 border border-white/[0.06] rounded-xl backdrop-blur-sm ${className || ''}`} style={style}>{children}</div>;
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <Panel className="p-4 flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">{label}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
      {sub && <span className="text-[10px] text-white/40">{sub}</span>}
    </Panel>
  );
}

function SectionTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">{icon}</div>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {sub && <p className="text-[10px] text-white/40">{sub}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function Home() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [caseText, setCaseText] = useState('');
  const [selectedLang, setSelectedLang] = useState<Lang | 'auto'>('auto');
  const [uiLang, setUiLang] = useState<Lang>('en');
  const [stage, setStage] = useState<Stage>('idle');
  const [report, setReport] = useState<ClinReport | null>(null);
  const [baseReport, setBaseReport] = useState<ClinReport | null>(null);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(false);
  const [resultTab, setResultTab] = useState<ResultTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');

  async function handleAnalyse(text?: string) {
    const finalText = text || caseText;
    if (!finalText.trim()) return;
    setCaseText(finalText);
    setStage('running'); setReport(null); setBaseReport(null); setError('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseText: finalText, lang: selectedLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setReport(data as ClinReport);
      setBaseReport(data as ClinReport);
      setUiLang(data.lang);
      setStage('done');
      setActiveView('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStage('error');
    }
  }

  async function handleSwitchLang(lang: Lang) {
    if (!baseReport || switching) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/localise', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report: baseReport, lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data as ClinReport);
      setUiLang(lang);
    } catch {} finally { setSwitching(false); }
  }

  function handleHeaderSearch() {
    if (headerSearch.trim()) {
      setSearchQuery(headerSearch);
      setActiveView('search');
    }
  }

  return (
    <div className="flex min-h-screen">
      <SidebarNav activeView={activeView} onViewChange={setActiveView} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[52px] shrink-0 border-b border-white/[0.04] bg-[#04070e]/70 backdrop-blur-xl flex items-center justify-between px-6 no-print">
          <div className="flex items-center gap-4">
            <h1 className="text-[15px] font-semibold text-white tracking-tight cursor-pointer" onClick={() => setActiveView('dashboard')}>ClinReason</h1>
            <div className="h-4 w-px bg-white/[0.08]" />
            <span className="text-[9px] text-emerald-400/60 font-semibold uppercase tracking-[0.15em] border border-emerald-500/15 rounded-full px-2.5 py-[3px] bg-emerald-500/[0.04]">
              Clinical Decision Support
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input type="text" value={headerSearch} onChange={e => setHeaderSearch(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleHeaderSearch(); }}
                placeholder="Search conditions, drugs, ICD-10…"
                className="w-56 h-[30px] bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 pl-7 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-emerald-500/25 focus:bg-white/[0.05] transition-all" />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
            </div>
            <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/15 flex items-center justify-center">
              <span className="text-[10px] font-bold text-emerald-400">Z</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5 lg:p-6">
          {activeView === 'dashboard' && <DashboardView onNavigate={setActiveView} report={report} stage={stage} />}
          {activeView === 'patient' && <PatientView caseText={caseText} setCaseText={setCaseText} selectedLang={selectedLang} setSelectedLang={setSelectedLang} onAnalyse={handleAnalyse} stage={stage} />}
          {activeView === 'anatomy' && <AnatomyViewWrapper />}
          {activeView === 'analysis' && <AnalysisView report={report} stage={stage} error={error} resultTab={resultTab} setResultTab={setResultTab} uiLang={uiLang} onSwitchLang={handleSwitchLang} switching={switching} />}
          {activeView === 'assessment' && <AssessmentView report={report} />}
          {activeView === 'search' && <SearchView initialQuery={searchQuery} />}
          {activeView === 'tracking' && <TrackingView />}
          {activeView === 'settings' && <SettingsView />}
        </main>

        <footer className="h-7 shrink-0 border-t border-white/[0.03] bg-[#04070e]/50 flex items-center justify-between px-6 no-print">
          <div className="flex items-center gap-2.5">
            <div className="w-[5px] h-[5px] rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-slate-500 font-medium">System Online</span>
            <span className="text-[9px] text-slate-700">·</span>
            <span className="text-[9px] text-slate-600">v3.0 — 3D Anatomy · 120 Conditions · 155 Interactions · Deterministic Engine</span>
          </div>
          <span className="text-[9px] text-slate-600">Built by <span className="text-slate-500">Zolentix</span></span>
        </footer>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  DASHBOARD VIEW                                                     */
/* ================================================================== */
function DashboardView({ onNavigate, report, stage }: { onNavigate: (v: ViewId) => void; report: ClinReport | null; stage: Stage }) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/[0.07] to-cyan-500/[0.04] border border-emerald-500/10 p-8">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ClinReason Engine</h1>
              <p className="text-[11px] text-white/50">Deterministic Clinical Reasoning · No API Dependencies</p>
            </div>
          </div>
          <p className="text-sm text-white/60 max-w-lg mb-6">
            Differential diagnosis, red flag triage, drug interaction screening, and multilingual support — all running locally with a comprehensive medical knowledge base.
          </p>
          <div className="flex gap-3">
            <button onClick={() => onNavigate('patient')} className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-sm font-semibold text-white transition-all flex items-center gap-2">
              <Stethoscope className="w-4 h-4" /> New Assessment <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onNavigate('anatomy')} className="px-5 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-sm font-medium text-white/80 transition-all flex items-center gap-2">
              <Heart className="w-4 h-4" /> 3D Anatomy Explorer
            </button>
          </div>
        </div>
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Conditions" value="120" sub="Across 15 body systems" color="text-emerald-400" />
        <StatCard label="Drug Interactions" value="155" sub="Severity-graded pairs" color="text-amber-400" />
        <StatCard label="Red Flag Rules" value="53" sub="Emergency detection" color="text-red-400" />
        <StatCard label="Drug Names" value="170+" sub="NLP recognition" color="text-cyan-400" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: <Brain className="w-5 h-5" />, title: 'AI Patient Intake', desc: 'Guided conversational assessment with AI-powered clinical reasoning', view: 'patient' as ViewId, color: 'from-violet-500/10 to-purple-500/10 border-violet-500/10' },
          { icon: <Heart className="w-5 h-5" />, title: '3D Anatomy Explorer', desc: '150+ structures, 6 system layers, interactive rotation and zoom', view: 'anatomy' as ViewId, color: 'from-rose-500/10 to-pink-500/10 border-rose-500/10' },
          { icon: <Search className="w-5 h-5" />, title: 'Knowledge Base', desc: 'Search conditions, drugs, ICD-10 codes, and clinical guidelines', view: 'search' as ViewId, color: 'from-cyan-500/10 to-teal-500/10 border-cyan-500/10' },
        ].map(item => (
          <button key={item.title} onClick={() => onNavigate(item.view)}
            className={`p-5 rounded-xl bg-gradient-to-br ${item.color} border text-left hover:scale-[1.02] transition-all group`}>
            <div className="text-white/70 mb-2 group-hover:text-white/90 transition-colors">{item.icon}</div>
            <h3 className="text-sm font-semibold text-white mb-1">{item.title}</h3>
            <p className="text-[11px] text-white/40 leading-relaxed">{item.desc}</p>
          </button>
        ))}
      </div>

      {/* Engine capabilities */}
      <Panel className="p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Engine Capabilities</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Differential Diagnosis', desc: 'Score-based ranking across 120 conditions' },
            { label: 'Red Flag Detection', desc: '53 rule-based emergency patterns' },
            { label: 'Drug Safety', desc: '155 interaction pairs with severity grading' },
            { label: 'NLP Intake', desc: 'Regex parsing: vitals, drugs, symptoms, history' },
            { label: 'Multilingual', desc: 'English, French, Italian translation engine' },
            { label: '15 Body Systems', desc: 'Cardiac to ophthalmological coverage' },
            { label: 'ICD-10 Coding', desc: 'Automatic classification codes' },
            { label: 'Clinical Guidelines', desc: 'ESC, BTS, NICE, KDIGO references' },
            { label: 'Zero API Calls', desc: 'Fully deterministic, offline-capable' },
          ].map(cap => (
            <div key={cap.label} className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[11px] font-semibold text-white/80 mb-0.5">{cap.label}</div>
              <div className="text-[10px] text-white/35">{cap.desc}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Recent results */}
      {report && stage === 'done' && (
        <Panel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Last Analysis Result</h3>
            <button onClick={() => onNavigate('analysis')} className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
              View Full Results <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-white/[0.02] rounded-lg"><span className="text-[10px] text-white/30 block">Red Flags</span><span className="text-lg font-bold text-red-400">{report.redFlags.length}</span></div>
            <div className="p-3 bg-white/[0.02] rounded-lg"><span className="text-[10px] text-white/30 block">Differentials</span><span className="text-lg font-bold text-emerald-400">{report.differential.length}</span></div>
            <div className="p-3 bg-white/[0.02] rounded-lg"><span className="text-[10px] text-white/30 block">Drug Alerts</span><span className="text-lg font-bold text-amber-400">{report.medSafety.length}</span></div>
            <div className="p-3 bg-white/[0.02] rounded-lg"><span className="text-[10px] text-white/30 block">Top Confidence</span><span className="text-lg font-bold text-cyan-400">{report.differential[0] ? `${Math.round(report.differential[0].confidence * 100)}%` : '—'}</span></div>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ================================================================== */
/*  PATIENT VIEW                                                       */
/* ================================================================== */
function PatientView({ caseText, setCaseText, selectedLang, setSelectedLang, onAnalyse, stage }: {
  caseText: string; setCaseText: (s: string) => void;
  selectedLang: Lang | 'auto'; setSelectedLang: (l: Lang | 'auto') => void;
  onAnalyse: (text?: string) => void; stage: Stage;
}) {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SectionTitle icon={<Stethoscope className="w-4 h-4" />} title="Patient Presentation" sub="AI-guided intake or manual case entry" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* AI Chat */}
        <div className="h-[600px]">
          <AIChat onCaseReady={(text) => onAnalyse(text)} />
        </div>

        {/* Manual Entry */}
        <div className="space-y-4">
          <Panel className="p-5">
            <h3 className="text-xs font-semibold text-white/70 mb-3 uppercase tracking-wider">Manual Case Entry</h3>
            <textarea value={caseText} onChange={e => setCaseText(e.target.value)}
              placeholder="e.g. 58-year-old man, 2 hours of central chest pain radiating to the left arm, sweating and short of breath. History of smoking and high cholesterol. Takes simvastatin."
              className="w-full h-40 bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-xs text-white/80 resize-none outline-none focus:border-emerald-500/30 placeholder:text-white/20" />

            <div className="flex items-center gap-3 mt-3">
              <span className="text-[10px] text-white/30 font-semibold uppercase">Lang</span>
              {(['auto','en','fr','it'] as const).map(l => (
                <button key={l} onClick={() => setSelectedLang(l)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${
                    selectedLang === l ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-white/30 hover:text-white/50'
                  }`}>{l.toUpperCase()}</button>
              ))}
            </div>

            <button onClick={() => onAnalyse()} disabled={!caseText.trim() || stage === 'running'}
              className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40 rounded-lg text-sm font-semibold text-white transition-all flex items-center justify-center gap-2">
              {stage === 'running' ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analysing...</>
              ) : (
                <><Activity className="w-4 h-4" /> Analyse</>
              )}
            </button>
          </Panel>

          {/* Quick Load Samples */}
          <Panel className="p-5">
            <h3 className="text-xs font-semibold text-white/70 mb-3 uppercase tracking-wider">Sample Cases</h3>
            <div className="space-y-2">
              {SAMPLE_CASES.map((s, i) => (
                <button key={i} onClick={() => setCaseText(s.text)}
                  className="w-full text-left px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all group">
                  <div className="text-[11px] font-medium text-white/70 group-hover:text-white/90">{typeof s.label === 'string' ? s.label : s.label.en}</div>
                  <div className="text-[10px] text-white/30 mt-0.5 truncate">{s.text.slice(0, 80)}…</div>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ANATOMY VIEW                                                       */
/* ================================================================== */
function AnatomyViewWrapper() {
  const [selectedInfo, setSelectedInfo] = useState<{ region: string; info: string } | null>(null);
  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <SectionTitle icon={<Heart className="w-4 h-4" />} title="3D Anatomy Explorer"
        sub="Interactive multi-layer anatomical model · Rotate, zoom, toggle systems" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <Panel className="overflow-hidden" style={{ height: '70vh', minHeight: 500 }}>
          <AnatomyViewer3D onSelectRegion={(region, info) => setSelectedInfo({ region, info })} className="w-full h-full" />
        </Panel>
        <div className="space-y-3">
          <Panel className="p-4">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Controls</h3>
            <ul className="text-[10px] text-white/40 space-y-1.5">
              <li><span className="text-white/60">Left drag</span> — Rotate</li>
              <li><span className="text-white/60">Scroll</span> — Zoom in/out</li>
              <li><span className="text-white/60">Click structure</span> — View details</li>
              <li><span className="text-white/60">Layer toggles</span> — Show/hide systems</li>
              <li><span className="text-white/60">Camera presets</span> — Front, back, side, top</li>
            </ul>
          </Panel>
          {selectedInfo && (
            <Panel className="p-4">
              <h3 className="text-xs font-semibold text-emerald-400/80 mb-2">Selected Structure</h3>
              <p className="text-[11px] text-white/80 leading-relaxed mb-2">{selectedInfo.info}</p>
              <span className="text-[10px] text-emerald-400/60 px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/10">
                Region: {selectedInfo.region.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </Panel>
          )}
          <Panel className="p-4">
            <h3 className="text-xs font-semibold text-white/70 mb-2">Systems</h3>
            <div className="space-y-1.5 text-[10px]">
              {[
                { label: 'Surface', desc: '18 body shapes', color: '#deb896' },
                { label: 'Skeletal', desc: '50+ bones & vertebrae', color: '#f5f0e0' },
                { label: 'Organs', desc: '24 internal organs', color: '#e05577' },
                { label: 'Muscular', desc: '24 muscle groups', color: '#cc3344' },
                { label: 'Vascular', desc: '14 arteries & veins', color: '#cc2200' },
                { label: 'Nervous', desc: '21 nerve pathways', color: '#ffd700' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-white/50">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-white/70 font-medium">{s.label}</span>
                  <span className="text-white/30">— {s.desc}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ANALYSIS VIEW                                                      */
/* ================================================================== */
function AnalysisView({ report, stage, error, resultTab, setResultTab, uiLang, onSwitchLang, switching }: {
  report: ClinReport | null; stage: Stage; error: string;
  resultTab: ResultTab; setResultTab: (t: ResultTab) => void;
  uiLang: Lang; onSwitchLang: (l: Lang) => void; switching: boolean;
}) {
  if (stage === 'idle') return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
        <Stethoscope className="w-8 h-8 text-emerald-400/50" />
      </div>
      <h2 className="text-lg font-semibold text-white/60 mb-2">No Analysis Yet</h2>
      <p className="text-sm text-white/30">Go to the Patient view to submit a clinical case for analysis.</p>
    </div>
  );

  if (stage === 'running') return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-white/50">Running differential diagnosis engine...</p>
    </div>
  );

  if (stage === 'error') return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <AlertTriangle className="w-10 h-10 text-red-400/60 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-red-400/80 mb-2">Analysis Error</h2>
      <p className="text-sm text-white/40">{error}</p>
    </div>
  );

  if (!report) return null;

  const riskScore = Math.min(100, report.redFlags.length * 25 + report.medSafety.length * 15 + (report.differential[0]?.confidence ?? 0) * 50);
  const riskLevel = riskScore >= 75 ? 'HIGH RISK' : riskScore >= 40 ? 'MODERATE RISK' : 'LOW RISK';
  const riskColor = riskScore >= 75 ? 'text-red-400' : riskScore >= 40 ? 'text-amber-400' : 'text-emerald-400';
  const emergencies = report.redFlags.filter(f => f.severity === 'emergency').length;
  const urgent = report.redFlags.filter(f => f.severity === 'urgent').length;

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <SectionTitle icon={<BarChart3 className="w-4 h-4" />} title="Analysis Results" sub={`${report.differential.length} differentials · ${report.lang.toUpperCase()}`} />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Red Flags" value={report.redFlags.length} color="text-red-400" />
        <StatCard label="Differentials" value={report.differential.length} color="text-emerald-400" />
        <StatCard label="Med Alerts" value={report.medSafety.length} color="text-amber-400" />
        <StatCard label="Top Confidence" value={report.differential[0] ? `${Math.round(report.differential[0].confidence * 100)}%` : '—'} color="text-cyan-400" />
      </div>

      {/* Tabs + Language */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['overview','differential','medsafety','assessment'] as ResultTab[]).map(tab => (
            <button key={tab} onClick={() => setResultTab(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                resultTab === tab ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'text-white/40 hover:text-white/60'
              }`}>{tab === 'medsafety' ? 'Med Safety' : tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">Switch Language</span>
          {(['en','fr','it'] as Lang[]).map(l => (
            <button key={l} onClick={() => onSwitchLang(l)} disabled={switching}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                uiLang === l ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/30 hover:text-white/50'
              }`}>{l.toUpperCase()}</button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <Panel className="p-5 min-h-[300px]">
        {resultTab === 'overview' && (
          <div className="space-y-5">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-white/[0.06]" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className={riskColor} strokeWidth="3"
                    strokeDasharray={`${riskScore} ${100 - riskScore}`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg font-bold ${riskColor}`}>{Math.round(riskScore)}</span>
                </div>
              </div>
              <div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${riskColor} mb-1`}>{riskLevel}</div>
                <div className="text-sm text-white/70">Risk Assessment</div>
                <div className="flex gap-4 mt-2 text-[10px] text-white/40">
                  <span><span className="text-red-400 font-bold">{emergencies}</span> Emergencies</span>
                  <span><span className="text-amber-400 font-bold">{urgent}</span> Urgent</span>
                  <span><span className="text-cyan-400 font-bold">{report.medSafety.length}</span> Drug Alerts</span>
                </div>
              </div>
            </div>
            {report.redFlags.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-white/60 mb-2">Emergency / Urgent Flags</h4>
                {report.redFlags.map((f, i) => (
                  <div key={i} className="p-3 bg-red-500/[0.04] border border-red-500/10 rounded-lg mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${f.severity === 'emergency' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{f.severity}</span>
                      <span className="text-xs font-medium text-white/80">{f.pattern}</span>
                    </div>
                    <p className="text-[10px] text-white/40">{f.why}</p>
                    {f.action && <p className="text-[10px] text-emerald-400/60 mt-1">{f.action}</p>}
                  </div>
                ))}
              </div>
            )}
            {report.redFlags.length === 0 && <p className="text-xs text-white/30 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-400/40" /> No emergency pattern detected</p>}

            <div>
              <h4 className="text-xs font-semibold text-white/60 mb-2">Differential Diagnosis</h4>
              {report.differential.slice(0, 3).map((d, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-bold text-white/30 w-5">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white/80">{d.condition}</span>
                      <span className="text-[10px] font-bold text-emerald-400">{Math.round(d.confidence * 100)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/[0.04] rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${d.confidence * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {resultTab === 'differential' && (
          <div className="space-y-3">
            <div className="text-[10px] text-white/30 mb-3">Top {report.differential.length} differential diagnoses, ranked by feature matching score</div>
            {report.differential.map((d, i) => (
              <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold text-white/90">{d.condition}</span>
                    {d.icd10 && <span className="text-[10px] text-white/30 ml-2">{d.icd10}</span>}
                  </div>
                  <span className="text-sm font-bold text-emerald-400">{Math.round(d.confidence * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.04] rounded-full mb-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: `${d.confidence * 100}%` }} />
                </div>
                <p className="text-[11px] text-white/50 leading-relaxed mb-2">{d.rationale}</p>
                {d.supporting.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {d.supporting.map((s, si) => <span key={si} className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/10">{s}</span>)}
                  </div>
                )}
                {d.opposing.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {d.opposing.map((o, oi) => <span key={oi} className="text-[9px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400/70 border border-red-500/10">{o}</span>)}
                  </div>
                )}
                <div className="text-[10px] text-cyan-400/60 mt-2">Next step: {d.nextStep}</div>
                {d.citations?.map((c, ci) => <div key={ci} className="text-[9px] text-white/25 mt-1">📖 {c.source} — {c.note}</div>)}
              </div>
            ))}
          </div>
        )}

        {resultTab === 'medsafety' && (
          <div className="space-y-3">
            {report.medSafety.length === 0 ? (
              <div className="text-center py-10">
                <Shield className="w-10 h-10 text-emerald-400/30 mx-auto mb-3" />
                <p className="text-sm text-white/40">No medication safety issues identified</p>
                <p className="text-[10px] text-white/20 mt-1">Add medications to the patient description to check for interactions</p>
              </div>
            ) : (
              report.medSafety.map((m, i) => (
                <div key={i} className={`p-4 rounded-lg border ${m.severity === 'severe' ? 'bg-red-500/[0.04] border-red-500/10' : m.severity === 'moderate' ? 'bg-amber-500/[0.04] border-amber-500/10' : 'bg-cyan-500/[0.04] border-cyan-500/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${m.severity === 'severe' ? 'bg-red-500/20 text-red-400' : m.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{m.severity}</span>
                    <span className="text-[10px] text-white/40">{m.kind.replace(/_/g, ' ')}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white/80 mb-1">{m.drugs.join(' + ')}</h4>
                  <p className="text-[11px] text-white/50 leading-relaxed">{m.explanation}</p>
                  {m.recommendation && <p className="text-[10px] text-emerald-400/60 mt-2">💡 {m.recommendation}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {resultTab === 'assessment' && <AssessmentContent report={report} />}
      </Panel>
    </div>
  );
}

function AssessmentContent({ report }: { report: ClinReport }) {
  const riskScore = Math.min(100, report.redFlags.length * 25 + report.medSafety.length * 15 + (report.differential[0]?.confidence ?? 0) * 50);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-white/[0.02] rounded-lg"><span className="text-[10px] text-white/30 block mb-1">Risk Score</span><span className="text-2xl font-bold text-emerald-400">{Math.round(riskScore)}/100</span></div>
        <div className="p-3 bg-white/[0.02] rounded-lg"><span className="text-[10px] text-white/30 block mb-1">Systems Involved</span><span className="text-2xl font-bold text-cyan-400">{new Set(report.differential.map(d => (d as any).system).filter(Boolean)).size}</span></div>
        <div className="p-3 bg-white/[0.02] rounded-lg"><span className="text-[10px] text-white/30 block mb-1">Drugs Flagged</span><span className="text-2xl font-bold text-amber-400">{report.medSafety.length}</span></div>
      </div>
      <div>
        <h4 className="text-xs font-semibold text-white/60 mb-2">Recommended Next Steps</h4>
        <ul className="space-y-2">
          {report.differential.slice(0, 3).map((d, i) => (
            <li key={i} className="flex gap-2 text-[11px]">
              <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
              <div>
                <span className="text-white/70 font-medium">{d.condition}:</span>{' '}
                <span className="text-white/40">{d.nextStep}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div className="text-[10px] text-white/20 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
        ⚠️ This is a clinical decision support tool for educational purposes. It does not replace clinical judgement. Always correlate with the full clinical picture.
      </div>
    </div>
  );
}

/* ================================================================== */
/*  ASSESSMENT VIEW (standalone)                                       */
/* ================================================================== */
function AssessmentView({ report }: { report: ClinReport | null }) {
  if (!report) return (
    <div className="max-w-4xl mx-auto text-center py-20">
      <Clipboard className="w-10 h-10 text-white/20 mx-auto mb-3" />
      <h2 className="text-lg font-semibold text-white/50 mb-2">No Assessment Available</h2>
      <p className="text-sm text-white/30">Run an analysis first to see the clinical assessment.</p>
    </div>
  );
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SectionTitle icon={<Clipboard className="w-4 h-4" />} title="Clinical Assessment" sub="Comprehensive risk evaluation" />
      <Panel className="p-6"><AssessmentContent report={report} /></Panel>
    </div>
  );
}

/* ================================================================== */
/*  SEARCH / KNOWLEDGE VIEW                                            */
/* ================================================================== */
function SearchView({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<any[]>([]);
  const [conditionsData, setConditionsData] = useState<any[]>([]);
  const [interactionsData, setInteractionsData] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const [cRes, iRes] = await Promise.all([
          fetch('/api/knowledge/conditions').then(r => r.ok ? r.json() : []).catch(() => []),
          fetch('/api/knowledge/interactions').then(r => r.ok ? r.json() : []).catch(() => []),
        ]);
        if (cancelled) return;
        setConditionsData(Array.isArray(cRes) ? cRes : []);
        setInteractionsData(Array.isArray(iRes) ? iRes : []);
        setLoaded(true);
      } catch { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(() => {
    if (!query.trim()) { setResults([]); return; }
    const q = query.toLowerCase();
    const found: any[] = [];
    for (const c of conditionsData) {
      if (c.name?.toLowerCase().includes(q) || c.icd10?.toLowerCase().includes(q) || c.system?.toLowerCase().includes(q)
        || c.typicalFeatures?.some((f: string) => f.toLowerCase().includes(q))) {
        found.push({ type: 'condition', ...c });
      }
    }
    for (const ix of interactionsData) {
      if (ix.pair?.toLowerCase().includes(q) || ix.drug1?.toLowerCase().includes(q) || ix.drug2?.toLowerCase().includes(q)) {
        found.push({ type: 'interaction', ...ix });
      }
    }
    setResults(found.slice(0, 20));
  }, [query, conditionsData, interactionsData]);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <SectionTitle icon={<Search className="w-4 h-4" />} title="Knowledge Base" sub="Search 120 conditions, 155 drug interactions, ICD-10 codes" />

      <div className="flex gap-2">
        <input value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="Search conditions, drugs, ICD-10 codes..."
          className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-sm text-white/80 outline-none focus:border-emerald-500/30 placeholder:text-white/20" />
        <button onClick={handleSearch}
          className="px-5 py-3 bg-emerald-500/80 hover:bg-emerald-500 rounded-lg text-sm font-medium text-white transition-all">
          Search
        </button>
      </div>

      <div className="text-[10px] text-white/30">
        Try: "chest pain", "warfarin", "I21", "cardiac", "STEMI"
      </div>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r, i) => (
            <Panel key={i} className="p-4">
              {r.type === 'condition' ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-white/80">{r.name}</span>
                    {r.icd10 && <span className="text-[9px] text-white/30 bg-white/[0.04] px-1.5 py-0.5 rounded">{r.icd10}</span>}
                    <span className="text-[9px] text-emerald-400/50 bg-emerald-500/10 px-1.5 py-0.5 rounded">{r.system}</span>
                  </div>
                  {r.typicalFeatures && <p className="text-[10px] text-white/40 mt-1">Features: {r.typicalFeatures.slice(0, 5).join(', ')}</p>}
                  {r.riskFactors && r.riskFactors.length > 0 && <p className="text-[10px] text-white/30 mt-0.5">Risk factors: {r.riskFactors.join(', ')}</p>}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${r.severity === 'severe' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{r.severity}</span>
                    <span className="text-xs font-semibold text-white/80">{r.pair || `${r.drug1} + ${r.drug2}`}</span>
                  </div>
                  {r.detail && <p className="text-[10px] text-white/40 mt-1">{r.detail}</p>}
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      {results.length === 0 && query && loaded && (
        <div className="text-center py-10 text-sm text-white/30">No results found for "{query}"</div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  TRACKING VIEW                                                      */
/* ================================================================== */
function TrackingView() {
  const [meds, setMeds] = useState<{ name: string; dose: string; time: string }[]>([
    { name: 'Aspirin', dose: '75mg', time: '08:00' },
    { name: 'Simvastatin', dose: '40mg', time: '22:00' },
  ]);
  const [newMed, setNewMed] = useState({ name: '', dose: '', time: '' });
  const [meals, setMeals] = useState<{ desc: string; time: string; cal: string }[]>([]);
  const [newMeal, setNewMeal] = useState({ desc: '', time: '', cal: '' });
  const [exercise, setExercise] = useState<{ type: string; duration: string; date: string }[]>([]);
  const [newEx, setNewEx] = useState({ type: '', duration: '', date: '' });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <SectionTitle icon={<TrendingUp className="w-4 h-4" />} title="Health Tracking" sub="Medication, nutrition, and exercise logging" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Medications */}
        <Panel className="p-4">
          <h3 className="text-xs font-semibold text-white/70 mb-3 flex items-center gap-2"><Pill className="w-3.5 h-3.5 text-cyan-400" /> Medications</h3>
          <div className="space-y-2 mb-3">
            {meds.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg text-[11px]">
                <div><span className="text-white/70 font-medium">{m.name}</span> <span className="text-white/30">{m.dose}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-white/20">{m.time}</span>
                  <button onClick={() => setMeds(prev => prev.filter((_, j) => j !== i))} className="text-red-400/40 hover:text-red-400 text-[10px]">✕</button>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <input placeholder="Drug name" value={newMed.name} onChange={e => setNewMed(p => ({...p, name: e.target.value}))} className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none focus:border-emerald-500/30" />
            <div className="flex gap-1.5">
              <input placeholder="Dose" value={newMed.dose} onChange={e => setNewMed(p => ({...p, dose: e.target.value}))} className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none" />
              <input placeholder="Time" value={newMed.time} onChange={e => setNewMed(p => ({...p, time: e.target.value}))} className="w-16 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none" />
            </div>
            <button onClick={() => { if(newMed.name) { setMeds(p => [...p, newMed]); setNewMed({name:'',dose:'',time:''}); } }}
              className="w-full py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-medium transition-all">+ Add</button>
          </div>
        </Panel>

        {/* Nutrition */}
        <Panel className="p-4">
          <h3 className="text-xs font-semibold text-white/70 mb-3 flex items-center gap-2">🍽️ Nutrition</h3>
          <div className="space-y-2 mb-3">
            {meals.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg text-[11px]">
                <div><span className="text-white/70">{m.desc}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-white/20">{m.cal} kcal</span>
                  <button onClick={() => setMeals(prev => prev.filter((_, j) => j !== i))} className="text-red-400/40 hover:text-red-400 text-[10px]">✕</button>
                </div>
              </div>
            ))}
            {meals.length === 0 && <p className="text-[10px] text-white/20 text-center py-3">No meals logged</p>}
          </div>
          <div className="space-y-1.5">
            <input placeholder="Meal description" value={newMeal.desc} onChange={e => setNewMeal(p => ({...p, desc: e.target.value}))} className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none focus:border-emerald-500/30" />
            <div className="flex gap-1.5">
              <input placeholder="Calories" value={newMeal.cal} onChange={e => setNewMeal(p => ({...p, cal: e.target.value}))} className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none" />
              <input placeholder="Time" value={newMeal.time} onChange={e => setNewMeal(p => ({...p, time: e.target.value}))} className="w-16 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none" />
            </div>
            <button onClick={() => { if(newMeal.desc) { setMeals(p => [...p, newMeal]); setNewMeal({desc:'',time:'',cal:''}); } }}
              className="w-full py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-medium transition-all">+ Add</button>
          </div>
        </Panel>

        {/* Exercise */}
        <Panel className="p-4">
          <h3 className="text-xs font-semibold text-white/70 mb-3 flex items-center gap-2">🏃 Exercise</h3>
          <div className="space-y-2 mb-3">
            {exercise.map((e, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg text-[11px]">
                <div><span className="text-white/70">{e.type}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-white/20">{e.duration}</span>
                  <button onClick={() => setExercise(prev => prev.filter((_, j) => j !== i))} className="text-red-400/40 hover:text-red-400 text-[10px]">✕</button>
                </div>
              </div>
            ))}
            {exercise.length === 0 && <p className="text-[10px] text-white/20 text-center py-3">No exercise logged</p>}
          </div>
          <div className="space-y-1.5">
            <input placeholder="Activity type" value={newEx.type} onChange={e => setNewEx(p => ({...p, type: e.target.value}))} className="w-full bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none focus:border-emerald-500/30" />
            <div className="flex gap-1.5">
              <input placeholder="Duration" value={newEx.duration} onChange={e => setNewEx(p => ({...p, duration: e.target.value}))} className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none" />
              <input placeholder="Date" value={newEx.date} onChange={e => setNewEx(p => ({...p, date: e.target.value}))} className="w-20 bg-white/[0.03] border border-white/[0.06] rounded px-2 py-1.5 text-[10px] text-white/70 outline-none" />
            </div>
            <button onClick={() => { if(newEx.type) { setExercise(p => [...p, newEx]); setNewEx({type:'',duration:'',date:''}); } }}
              className="w-full py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 rounded text-[10px] text-emerald-400 font-medium transition-all">+ Add</button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  SETTINGS VIEW                                                      */
/* ================================================================== */
function SettingsView() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <SectionTitle icon={<Activity className="w-4 h-4" />} title="Settings" sub="Application configuration" />
      <Panel className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
            <div><div className="text-xs font-medium text-white/70">Engine Mode</div><div className="text-[10px] text-white/30">Fully deterministic — no external API calls</div></div>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Offline</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
            <div><div className="text-xs font-medium text-white/70">Knowledge Base</div><div className="text-[10px] text-white/30">120 conditions · 155 interactions · 53 red flags</div></div>
            <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">v3.0</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
            <div><div className="text-xs font-medium text-white/70">3D Anatomy</div><div className="text-[10px] text-white/30">150+ structures · 6 system layers · Three.js WebGL</div></div>
            <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">Active</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg">
            <div><div className="text-xs font-medium text-white/70">Languages</div><div className="text-[10px] text-white/30">English, French, Italian</div></div>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">3 langs</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

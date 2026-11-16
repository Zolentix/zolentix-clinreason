'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ClinReport, Lang } from '@/lib/types';
import { t } from '@/lib/i18n/strings';
import { SAMPLE_CASES } from '@/lib/ai/samples';

type Stage = 'idle' | 'intake' | 'redflags' | 'differential' | 'medsafety' | 'localise' | 'done' | 'error';
type ResultTab = 'overview' | 'differential' | 'medsafety' | 'assessment';

const BODY_REGIONS = [
  { id: 'head', label: 'Head / Cranial', cx: 120, cy: 35, rx: 22, ry: 26 },
  { id: 'neck', label: 'Neck / Cervical', cx: 120, cy: 72, rx: 10, ry: 8 },
  { id: 'chest', label: 'Chest / Thorax', cx: 120, cy: 105, rx: 35, ry: 28 },
  { id: 'abdomen', label: 'Abdomen', cx: 120, cy: 148, rx: 30, ry: 22 },
  { id: 'left-arm', label: 'Left Arm', cx: 72, cy: 120, rx: 12, ry: 45 },
  { id: 'right-arm', label: 'Right Arm', cx: 168, cy: 120, rx: 12, ry: 45 },
  { id: 'left-leg', label: 'Left Leg', cx: 105, cy: 230, rx: 14, ry: 55 },
  { id: 'right-leg', label: 'Right Leg', cx: 135, cy: 230, rx: 14, ry: 55 },
] as const;

export default function Home() {
  const [caseText, setCaseText] = useState('');
  const [selectedLang, setSelectedLang] = useState<Lang | 'auto'>('auto');
  const [uiLang, setUiLang] = useState<Lang>('en');
  const [stage, setStage] = useState<Stage>('idle');
  const [report, setReport] = useState<ClinReport | null>(null);
  const [baseReport, setBaseReport] = useState<ClinReport | null>(null);
  const [error, setError] = useState('');
  const [switching, setSwitching] = useState(false);
  const [activeRegions, setActiveRegions] = useState<Set<string>>(new Set());
  const [resultTab, setResultTab] = useState<ResultTab>('overview');
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (!startTime) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [startTime]);

  const toggleRegion = useCallback((id: string) => {
    setActiveRegions(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }, []);

  async function handleAnalyse() {
    if (!caseText.trim()) return;
    setStage('intake'); setReport(null); setBaseReport(null); setError('');
    setStartTime(Date.now()); setElapsed(0);

    let fullText = caseText;
    if (activeRegions.size > 0) {
      const names = Array.from(activeRegions).map(id => BODY_REGIONS.find(b => b.id === id)?.label ?? id);
      fullText += `\nPain locations: ${names.join(', ')}`;
    }

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseText: fullText, lang: selectedLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setReport(data as ClinReport);
      setBaseReport(data as ClinReport);
      setUiLang(data.lang);
      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStage('error');
    }
    setStartTime(null);
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
    } catch { /* keep current */ }
    setSwitching(false);
  }

  const isLoading = !['idle', 'done', 'error'].includes(stage);
  const stats = {
    flags: report?.redFlags.length ?? 0,
    dx: report?.differential.length ?? 0,
    meds: report?.medSafety.length ?? 0,
    conf: report?.differential[0] ? Math.round(report.differential[0].confidence * 100) : 0,
  };

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* ═══ Stats Row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Red Flags" value={stage === 'done' ? String(stats.flags) : '—'} color={stats.flags > 0 ? 'red' : 'emerald'}
          icon={<path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />} />
        <StatCard label="Differentials" value={stage === 'done' ? String(stats.dx) : '—'} color="blue"
          icon={<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />} />
        <StatCard label="Med Alerts" value={stage === 'done' ? String(stats.meds) : '—'} color={stats.meds > 0 ? 'amber' : 'emerald'}
          icon={<path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />} />
        <StatCard label="Top Confidence" value={stage === 'done' ? `${stats.conf}%` : '—%'} color="emerald"
          icon={<path d="M13 10V3L4 14h7v7l9-11h-7z" />} />
      </div>

      {/* ═══ Pipeline Progress ═══ */}
      {isLoading && <PipelineBar stage={stage} elapsed={elapsed} />}

      {/* ═══ Main Grid ═══ */}
      <div className="grid grid-cols-12 gap-5">
        {/* ── Left Column ── */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <Panel title="Patient Presentation" iconPath="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z">
            <textarea
              className="w-full h-32 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/25 resize-none transition-all"
              placeholder={t(uiLang, 'inputPlaceholder')}
              value={caseText} onChange={e => setCaseText(e.target.value)} disabled={isLoading}
            />
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold">Lang</span>
              {(['auto','en','fr','it'] as const).map(l => (
                <button key={l} onClick={() => setSelectedLang(l)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                    selectedLang === l ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}>{l === 'auto' ? 'AUTO' : l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={handleAnalyse} disabled={isLoading || !caseText.trim()}
              className="w-full mt-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-semibold text-sm transition-all btn-glow shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/25 disabled:shadow-none">
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t(uiLang, 'analysing')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {t(uiLang, 'analyseBtn')}
                </span>
              )}
            </button>
            <div className="mt-3">
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Quick Load</p>
              {SAMPLE_CASES.map(sc => (
                <button key={sc.id} onClick={() => setCaseText(sc.text)} disabled={isLoading}
                  className="w-full text-left px-3 py-1.5 mb-1 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[11px] text-slate-400 hover:bg-white/[0.05] hover:border-white/[0.1] hover:text-slate-200 transition-all disabled:opacity-30 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-emerald-500/50 shrink-0" />
                  {sc.label[uiLang]}
                </button>
              ))}
            </div>
          </Panel>

          {/* ── Body Map ── */}
          <Panel title="Pain Localisation" iconPath="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z">
            <div className="flex justify-center py-2">
              <svg viewBox="0 0 240 310" className="w-full max-w-[220px] h-auto">
                <defs>
                  <radialGradient id="bodyGlow" cx="50%" cy="40%" r="50%">
                    <stop offset="0%" stopColor="rgba(16,185,129,0.06)" />
                    <stop offset="100%" stopColor="transparent" />
                  </radialGradient>
                </defs>
                <ellipse cx="120" cy="150" rx="90" ry="140" fill="url(#bodyGlow)" />
                {/* Human silhouette outline */}
                <path d="M120,8 C132,8 142,18 142,32 C142,46 132,56 120,56 C108,56 98,46 98,32 C98,18 108,8 120,8 Z" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <path d="M108,56 L104,65 L80,72 L58,100 L48,142 L56,145 L70,108 L82,90 L86,170 L80,172 L78,240 L72,285 L92,285 L97,240 L104,195 L120,186 L136,195 L143,240 L148,285 L168,285 L162,240 L160,172 L154,170 L158,90 L170,108 L184,145 L192,142 L182,100 L160,72 L136,65 L132,56" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                {/* Clickable zones */}
                {BODY_REGIONS.map(r => (
                  <ellipse key={r.id} cx={r.cx} cy={r.cy} rx={r.rx} ry={r.ry} rx2="4"
                    className={`body-zone ${activeRegions.has(r.id) ? 'active' : ''}`}
                    onClick={() => toggleRegion(r.id)} />
                ))}
                {/* Labels */}
                {BODY_REGIONS.map(r => (
                  <text key={`t-${r.id}`} x={r.cx} y={r.cy + 1} textAnchor="middle" dominantBaseline="central"
                    className="pointer-events-none select-none"
                    fill={activeRegions.has(r.id) ? 'rgba(52,211,153,0.95)' : 'rgba(255,255,255,0.25)'}
                    fontSize="8" fontWeight="600">{r.label.split(' / ')[0]}</text>
                ))}
              </svg>
            </div>
            <p className="text-[9px] text-center text-slate-600 -mt-1">Click body regions to indicate pain areas</p>
            {activeRegions.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {Array.from(activeRegions).map(id => {
                  const r = BODY_REGIONS.find(b => b.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-[10px] text-emerald-400">
                      {r?.label}
                      <button onClick={() => toggleRegion(id)} className="hover:text-white">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* ── Actions (post-analysis) ── */}
          {stage === 'done' && (
            <Panel title="Actions" iconPath="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4">
              <div className="grid grid-cols-3 gap-2">
                <ActionBtn label="Print" onClick={() => window.print()}
                  icon={<path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />} />
                <ActionBtn label="Export" onClick={() => {
                  if (!report) return;
                  const b = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                  const u = URL.createObjectURL(b); const a = document.createElement('a');
                  a.href = u; a.download = 'clinreason-report.json'; a.click(); URL.revokeObjectURL(u);
                }} icon={<path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />} />
                <ActionBtn label="Share" onClick={() => {}}
                  icon={<path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />} />
              </div>
            </Panel>
          )}
        </div>

        {/* ── Right Column ── */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {stage === 'error' && (
            <div className="panel p-5 animate-fade-in-up border-red-500/20 bg-red-500/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-300">Analysis Failed</p>
                  <p className="text-xs text-red-400/60 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          )}

          {stage === 'idle' && <IdleState />}

          {report && stage === 'done' && (
            <div className="space-y-4 animate-fade-in-up">
              {/* Tabs */}
              <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.05]">
                {([
                  { key: 'overview' as ResultTab, label: 'Overview' },
                  { key: 'differential' as ResultTab, label: 'Differential' },
                  { key: 'medsafety' as ResultTab, label: 'Med Safety' },
                  { key: 'assessment' as ResultTab, label: 'Assessment' },
                ]).map(tb => (
                  <button key={tb.key} onClick={() => setResultTab(tb.key)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                      resultTab === tb.key
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300 border border-transparent'
                    }`}>{tb.label}</button>
                ))}
              </div>

              {/* Lang switcher */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-widest text-slate-600 font-semibold">{t(uiLang, 'switchLang')}</span>
                  {(['en','fr','it'] as Lang[]).map(l => (
                    <button key={l} onClick={() => handleSwitchLang(l)} disabled={switching}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                        uiLang === l ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/25' : 'text-slate-500 border border-transparent'
                      } ${switching ? 'opacity-40' : ''}`}>{l.toUpperCase()}</button>
                  ))}
                  {switching && <span className="text-[9px] text-emerald-400/60 animate-pulse">Translating…</span>}
                </div>
                <span className="text-[9px] text-slate-600">{report.differential.length} dx · {report.medSafety.length} alerts</span>
              </div>

              {resultTab === 'overview' && <OverviewTab report={report} lang={uiLang} />}
              {resultTab === 'differential' && <DiffTab report={report} lang={uiLang} />}
              {resultTab === 'medsafety' && <MedTab report={report} lang={uiLang} />}
              {resultTab === 'assessment' && <AssessTab report={report} lang={uiLang} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ReactNode }) {
  const cls = color === 'red' ? 'stat-red' : color === 'amber' ? 'stat-amber' : color === 'blue' ? 'stat-blue' : 'stat-emerald';
  const textCls = color === 'red' ? 'text-red-400' : color === 'amber' ? 'text-amber-400' : color === 'blue' ? 'text-blue-400' : 'text-emerald-400';
  return (
    <div className={`panel p-3.5 ${cls}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</span>
        <svg className={`w-4 h-4 ${textCls} opacity-50`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">{icon}</svg>
      </div>
      <p className={`text-2xl font-bold ${textCls} tracking-tight`}>{value}</p>
    </div>
  );
}

function Panel({ title, iconPath, children }: { title: string; iconPath: string; children: React.ReactNode }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-emerald-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d={iconPath} /></svg>
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ActionBtn({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-slate-400 hover:text-white hover:border-white/[0.12] transition-all">
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">{icon}</svg>
      {label}
    </button>
  );
}

function PipelineBar({ stage, elapsed }: { stage: Stage; elapsed: number }) {
  const steps = [
    { key: 'intake', label: 'Parsing' },
    { key: 'redflags', label: 'Red Flags' },
    { key: 'differential', label: 'Differential' },
    { key: 'medsafety', label: 'Med Safety' },
    { key: 'localise', label: 'Finalising' },
  ];
  const idx = steps.findIndex(s => s.key === stage);
  return (
    <div className="panel p-4 animate-fade-in-up">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-emerald-400/70 font-semibold">AI Pipeline Active</span>
        <span className="text-[10px] text-slate-500 font-mono">{elapsed}s</span>
      </div>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-full h-1 rounded-full transition-all duration-500 ${
                done ? 'bg-emerald-500' : active ? 'bg-emerald-500/50 shimmer-bg' : 'bg-white/[0.05]'
              }`} />
              <div className="flex items-center gap-1">
                {done && <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>}
                {active && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                <span className={`text-[9px] font-medium ${active ? 'text-emerald-300' : done ? 'text-slate-500' : 'text-slate-600'}`}>{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className="panel p-8 flex flex-col items-center justify-center min-h-[400px] text-center glow-border">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/15 flex items-center justify-center mb-5 animate-float">
        <svg className="w-7 h-7 text-emerald-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">Clinical Reasoning Engine</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed mb-6">
        Enter a patient presentation on the left to run the full AI-powered clinical pipeline — differential diagnosis, red flag triage, medication safety, and multilingual reporting.
      </p>
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
        {[
          { icon: '🔬', title: 'Differential', desc: 'Ranked diagnoses' },
          { icon: '🚨', title: 'Red Flags', desc: 'Triage screening' },
          { icon: '💊', title: 'Med Safety', desc: 'Drug interactions' },
        ].map(f => (
          <div key={f.title} className="text-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            <span className="text-lg">{f.icon}</span>
            <p className="text-[11px] font-semibold text-slate-300 mt-1">{f.title}</p>
            <p className="text-[9px] text-slate-500 mt-0.5">{f.desc}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-6 text-[10px] text-slate-600">
        <span>EN / FR / IT</span>
        <span>·</span>
        <span>ICD-10 Codes</span>
        <span>·</span>
        <span>Evidence-Based</span>
        <span>·</span>
        <span>40+ Conditions</span>
      </div>
    </div>
  );
}

/* ─── Overview Tab ─── */
function OverviewTab({ report, lang }: { report: ClinReport; lang: Lang }) {
  return (
    <div className="space-y-4">
      {/* Risk Score */}
      <div className="panel p-4 glow-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Risk Assessment</h3>
          <RiskBadge flags={report.redFlags.length} meds={report.medSafety.length} />
        </div>
        <div className="flex items-center gap-5">
          <RiskRing value={report.redFlags.length > 0 ? 85 : report.medSafety.length > 0 ? 55 : 20} />
          <div className="flex-1 grid grid-cols-3 gap-3">
            <MiniStat label="Emergencies" value={report.redFlags.filter(r => r.severity === 'emergency').length} color="red" />
            <MiniStat label="Urgent" value={report.redFlags.filter(r => r.severity === 'urgent').length} color="amber" />
            <MiniStat label="Drug Alerts" value={report.medSafety.length} color="blue" />
          </div>
        </div>
      </div>

      {/* Red Flags */}
      <div className="panel p-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">{t(lang, 'redFlagsTitle')}</h3>
        {report.redFlags.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/[0.04] border border-emerald-500/15">
            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>
            <span className="text-[12px] text-emerald-300">{t(lang, 'noRedFlags')}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {report.redFlags.map((rf, i) => (
              <div key={i} className={`rounded-xl border px-4 py-3 transition-all hover:translate-x-0.5 ${
                rf.severity === 'emergency' ? 'bg-red-500/[0.04] border-red-500/20' : 'bg-amber-500/[0.04] border-amber-500/20'
              }`} style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                    rf.severity === 'emergency' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>{t(lang, rf.severity)}</span>
                  <span className="text-[13px] font-semibold text-white">{rf.pattern}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">{rf.why}</p>
                <p className="text-[11px] text-slate-200 mt-1 font-medium">{rf.action}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top 3 Differentials Preview */}
      <div className="panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t(lang, 'differentialTitle')}</h3>
          <span className="text-[9px] text-slate-600">Top 3 shown</span>
        </div>
        <div className="space-y-2">
          {report.differential.slice(0, 3).map((d, i) => (
            <DxCard key={i} item={d} rank={i + 1} lang={lang} compact />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Differential Tab ─── */
function DiffTab({ report, lang }: { report: ClinReport; lang: Lang }) {
  return (
    <div className="space-y-3">
      {report.differential.map((d, i) => (
        <DxCard key={i} item={d} rank={i + 1} lang={lang} />
      ))}
    </div>
  );
}

function DxCard({ item, rank, lang, compact }: { item: ClinReport['differential'][number]; rank: number; lang: Lang; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(item.confidence * 100);
  const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-500' : 'bg-blue-500';

  return (
    <div className="panel p-4 hover:border-white/[0.1] transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/8 w-6 h-6 rounded-lg flex items-center justify-center">
            {rank}
          </span>
          <div>
            <h4 className="text-[13px] font-semibold text-white">{item.condition}</h4>
            {item.icd10 && <span className="text-[9px] text-slate-500 font-mono">{item.icd10}</span>}
          </div>
        </div>
        <span className="text-sm font-bold text-emerald-300 font-mono">{pct}%</span>
      </div>

      <div className="w-full h-1 bg-white/[0.04] rounded-full mb-3">
        <div className={`h-full ${barColor} rounded-full confidence-bar`} style={{ width: `${pct}%` }} />
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[9px] font-semibold text-emerald-400/80 uppercase tracking-wider mb-1">{t(lang, 'supporting')}</p>
              <ul className="space-y-0.5">
                {item.supporting.map((s, i) => (
                  <li key={i} className="text-[11px] text-slate-300 flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-px text-[10px]">+</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{t(lang, 'opposing')}</p>
              <ul className="space-y-0.5">
                {item.opposing.map((o, i) => (
                  <li key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                    <span className="text-slate-500 mt-px text-[10px]">−</span>{o}
                  </li>
                ))}
                {item.opposing.length === 0 && <li className="text-[10px] text-slate-600 italic">None identified</li>}
              </ul>
            </div>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{item.rationale}</p>
          <p className="text-[11px] text-emerald-400">
            <span className="font-semibold">{t(lang, 'nextStep')}:</span> {item.nextStep}
          </p>
          {item.citations.length > 0 && (
            <div className="mt-2">
              <button onClick={() => setOpen(!open)} className="text-[10px] text-slate-500 hover:text-slate-400 transition-colors">
                {t(lang, 'citations')} ({item.citations.length}) {open ? '▾' : '▸'}
              </button>
              {open && (
                <ul className="mt-1 space-y-0.5 animate-fade-in">
                  {item.citations.map((c, i) => (
                    <li key={i} className="text-[10px] text-slate-500"><span className="font-medium">{c.source}</span> — {c.note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {compact && (
        <p className="text-[11px] text-slate-400 line-clamp-2">{item.rationale}</p>
      )}
    </div>
  );
}

/* ─── Med Safety Tab ─── */
function MedTab({ report, lang }: { report: ClinReport; lang: Lang }) {
  if (report.medSafety.length === 0) {
    return (
      <div className="panel p-6 text-center">
        <svg className="w-8 h-8 text-emerald-400/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="text-sm text-slate-400">No medication safety issues identified</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {report.medSafety.map((m, i) => <MedCard key={i} item={m} lang={lang} />)}
    </div>
  );
}

function MedCard({ item, lang }: { item: ClinReport['medSafety'][number]; lang: Lang }) {
  const sc: Record<string, string> = {
    severe: 'bg-red-500/15 text-red-300 border-red-500/20',
    moderate: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
    mild: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  };
  const kl: Record<string, string> = {
    interaction: 'Drug Interaction', contraindication: 'Contraindication',
    dosing: 'Dosing Concern', duplication: 'Duplication',
  };

  return (
    <div className="panel p-4 hover:border-white/[0.1] transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${sc[item.severity]}`}>{t(lang, item.severity)}</span>
        <span className="text-[10px] text-slate-500">{kl[item.kind]}</span>
      </div>
      <p className="text-[12px] text-white font-medium mb-1">{item.drugs.join(' + ')}</p>
      <p className="text-[11px] text-slate-300 leading-relaxed mb-1.5">{item.explanation}</p>
      <p className="text-[11px] text-emerald-400">
        <span className="font-semibold">{t(lang, 'recommendation')}:</span> {item.recommendation}
      </p>
      {item.citations.length > 0 && (
        <p className="text-[9px] text-slate-600 mt-1.5">{item.citations.map(c => c.source).join(' · ')}</p>
      )}
    </div>
  );
}

/* ─── Assessment Tab ─── */
function AssessTab({ report, lang }: { report: ClinReport; lang: Lang }) {
  return (
    <div className="space-y-4">
      <div className="panel p-5 glow-border">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">{t(lang, 'overallNote')}</h3>
        <p className="text-[13px] text-slate-200 leading-relaxed">{report.overallNote}</p>
      </div>

      <div className="panel p-4">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Clinical Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Patient</p>
            <p className="text-[12px] text-slate-300">
              {report.case.age ? `${report.case.age}y` : '?'} {report.case.sex ?? 'unknown'}
            </p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Chief Complaint</p>
            <p className="text-[12px] text-slate-300 line-clamp-2">{report.case.presentingComplaint}</p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Medications</p>
            <p className="text-[12px] text-slate-300">{report.case.medications.length > 0 ? report.case.medications.map(m => m.name).join(', ') : 'None reported'}</p>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Allergies</p>
            <p className="text-[12px] text-slate-300">{report.case.allergies.length > 0 ? report.case.allergies.join(', ') : 'NKDA'}</p>
          </div>
        </div>
      </div>

      {report.case.vitals && (
        <div className="panel p-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">Vitals Dashboard</h3>
          <div className="grid grid-cols-5 gap-2">
            <VitalRing label="HR" value={report.case.vitals.hr} unit="bpm" max={180} color="#10b981" normal={[60, 100]} />
            <VitalRing label="SpO₂" value={report.case.vitals.spo2} unit="%" max={100} color="#3b82f6" normal={[95, 100]} />
            <VitalRing label="Temp" value={report.case.vitals.temp} unit="°C" max={42} color="#f59e0b" normal={[36.1, 37.2]} />
            <VitalRing label="RR" value={report.case.vitals.rr} unit="/min" max={40} color="#8b5cf6" normal={[12, 20]} />
            <div className="flex flex-col items-center justify-center">
              <span className="text-[9px] text-slate-500 font-semibold uppercase mb-1">BP</span>
              <span className="text-sm font-bold text-white">{report.case.vitals.bp ?? '—'}</span>
              <span className="text-[8px] text-slate-600">mmHg</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-slate-600 text-center italic">{t(lang, 'disclaimer')}</p>
    </div>
  );
}

/* ─── Helper components ─── */

function RiskBadge({ flags, meds }: { flags: number; meds: number }) {
  const level = flags > 0 ? 'HIGH' : meds > 0 ? 'MODERATE' : 'LOW';
  const cls = flags > 0 ? 'bg-red-500/15 text-red-300 border-red-500/25' : meds > 0 ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25';
  return <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${cls}`}>{level} RISK</span>;
}

function RiskRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 38;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 70 ? '#ef4444' : value >= 40 ? '#f59e0b' : '#10b981';
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="38" className="ring-track" />
        <circle cx="50" cy="50" r="38" className="ring-value" stroke={color}
          strokeDasharray={circumference} strokeDashoffset={offset} style={{ animation: 'ringDraw 1.2s ease-out both' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-white">{value}</span>
        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  const tc = color === 'red' ? 'text-red-400' : color === 'amber' ? 'text-amber-400' : 'text-blue-400';
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${tc}`}>{value}</p>
      <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function VitalRing({ label, value, unit, max, color, normal }: {
  label: string; value?: number; unit: string; max: number; color: string; normal: [number, number];
}) {
  if (value == null) return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] text-slate-500 font-semibold uppercase mb-1">{label}</span>
      <span className="text-sm text-slate-600">—</span>
    </div>
  );
  const circ = 2 * Math.PI * 22;
  const pct = Math.min(value / max, 1);
  const offset = circ - pct * circ;
  const inRange = value >= normal[0] && value <= normal[1];
  const ringColor = inRange ? color : '#ef4444';

  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] text-slate-500 font-semibold uppercase mb-1">{label}</span>
      <div className="relative w-14 h-14">
        <svg viewBox="0 0 56 56" className="w-full h-full">
          <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={ringColor} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', animation: 'ringDraw 1s ease-out both' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold text-white">{value}</span>
        </div>
      </div>
      <span className="text-[8px] text-slate-600 mt-0.5">{unit}</span>
    </div>
  );
}

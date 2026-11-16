'use client';

import { useState, useCallback, useMemo } from 'react';

export type AnatomySystem = 'surface' | 'skeletal' | 'organs' | 'vascular' | 'nervous' | 'muscular';

export interface BodyMapProps {
  activeRegions: Set<string>;
  onToggleRegion: (id: string) => void;
  highlightedSystems?: string[];
}

const SYSTEMS: { id: AnatomySystem; label: string; color: string; glow: string }[] = [
  { id: 'surface', label: 'Surface', color: '#94a3b8', glow: 'rgba(148,163,184,0.3)' },
  { id: 'skeletal', label: 'Skeletal', color: '#e2e8f0', glow: 'rgba(226,232,240,0.3)' },
  { id: 'organs', label: 'Organs', color: '#f59e0b', glow: 'rgba(245,158,11,0.25)' },
  { id: 'vascular', label: 'Vascular', color: '#ef4444', glow: 'rgba(239,68,68,0.25)' },
  { id: 'nervous', label: 'Nervous', color: '#a78bfa', glow: 'rgba(167,139,250,0.25)' },
  { id: 'muscular', label: 'Muscular', color: '#dc2626', glow: 'rgba(220,38,38,0.2)' },
];

interface Region {
  id: string;
  label: string;
  path: string;
  systems: string[];
}

const REGIONS: Region[] = [
  { id: 'head', label: 'Head / Cranial', systems: ['neuro', 'ENT', 'ophthalmological'],
    path: 'M100,12 C117,12 130,26 130,44 C130,62 117,75 100,75 C83,75 70,62 70,44 C70,26 83,12 100,12 Z' },
  { id: 'neck', label: 'Neck / Cervical', systems: ['endocrine', 'respiratory', 'vascular'],
    path: 'M88,75 L112,75 L110,92 L90,92 Z' },
  { id: 'chest', label: 'Thorax', systems: ['cardiac', 'respiratory'],
    path: 'M60,95 C60,95 70,90 100,90 C130,90 140,95 140,95 L138,168 C130,172 100,175 100,175 C100,175 70,172 62,168 Z' },
  { id: 'abdomen', label: 'Abdomen', systems: ['GI', 'renal'],
    path: 'M62,168 C70,172 100,175 100,175 C100,175 130,172 138,168 L135,238 C128,242 100,245 100,245 C100,245 72,242 65,238 Z' },
  { id: 'pelvis', label: 'Pelvis', systems: ['renal', 'obstetric', 'GI'],
    path: 'M65,238 C72,242 100,245 100,245 C100,245 128,242 135,238 L130,270 L70,270 Z' },
  { id: 'left-arm', label: 'Left Upper Limb', systems: ['musculoskeletal', 'vascular'],
    path: 'M58,96 L38,96 C32,108 24,140 20,170 L16,210 L24,260 L34,260 L30,210 L34,170 C38,140 48,108 58,98 Z' },
  { id: 'right-arm', label: 'Right Upper Limb', systems: ['musculoskeletal', 'vascular'],
    path: 'M142,96 L162,96 C168,108 176,140 180,170 L184,210 L176,260 L166,260 L170,210 L166,170 C162,140 152,108 142,98 Z' },
  { id: 'left-leg', label: 'Left Lower Limb', systems: ['musculoskeletal', 'vascular'],
    path: 'M70,270 L84,270 L90,340 L92,400 L76,400 L72,340 Z' },
  { id: 'right-leg', label: 'Right Lower Limb', systems: ['musculoskeletal', 'vascular'],
    path: 'M116,270 L130,270 L128,340 L124,400 L108,400 L110,340 Z' },
  { id: 'back', label: 'Back / Spinal', systems: ['musculoskeletal', 'neuro'],
    path: 'M95,80 L105,80 L105,265 L95,265 Z' },
];

export default function BodyMap({ activeRegions, onToggleRegion, highlightedSystems }: BodyMapProps) {
  const [activeSystems, setActiveSystems] = useState<Set<AnatomySystem>>(new Set(['surface', 'organs']));
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredOrgan, setHoveredOrgan] = useState<string | null>(null);

  const toggleSystem = useCallback((sys: AnatomySystem) => {
    setActiveSystems(prev => {
      const next = new Set(prev);
      if (next.has(sys)) next.delete(sys); else next.add(sys);
      return next;
    });
  }, []);

  const isHighlighted = useCallback((regionId: string) => {
    if (highlightedSystems && highlightedSystems.length > 0) {
      const r = REGIONS.find(rg => rg.id === regionId);
      return r ? r.systems.some(s => highlightedSystems.includes(s)) : false;
    }
    return false;
  }, [highlightedSystems]);

  return (
    <div className="body-map-container">
      {/* System toggles */}
      <div className="flex flex-wrap gap-1 mb-3">
        {SYSTEMS.map(sys => (
          <button key={sys.id} onClick={() => toggleSystem(sys.id)}
            className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all border ${
              activeSystems.has(sys.id)
                ? 'border-current bg-current/10'
                : 'border-white/[0.06] text-slate-600 hover:text-slate-400'
            }`}
            style={activeSystems.has(sys.id) ? { color: sys.color, borderColor: `${sys.color}44`, backgroundColor: `${sys.color}12` } : {}}>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeSystems.has(sys.id) ? sys.color : 'transparent', border: `1px solid ${activeSystems.has(sys.id) ? sys.color : '#475569'}` }} />
              {sys.label}
            </span>
          </button>
        ))}
      </div>

      {/* SVG Canvas */}
      <div className="relative flex justify-center">
        <svg viewBox="0 0 200 420" className="w-full max-w-[280px] h-auto" style={{ filter: 'drop-shadow(0 0 20px rgba(16,185,129,0.05))' }}>
          <defs>
            <radialGradient id="bg-glow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="rgba(16,185,129,0.04)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="organ-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="nerve-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="artery-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="vein-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="bone-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>

          {/* Background glow */}
          <ellipse cx="100" cy="200" rx="90" ry="190" fill="url(#bg-glow)" />

          {/* ═══ SURFACE OUTLINE ═══ */}
          {activeSystems.has('surface') && (
            <g className="animate-fade-in" opacity="0.9">
              <path d={`
                M100,10 C118,10 132,24 132,44 C132,58 124,68 116,74
                L114,76 C116,78 118,80 118,82 L118,86
                C132,88 152,94 160,96 L168,100 C176,106 182,120 186,140
                L190,168 C192,178 188,186 180,186 L174,184
                L170,168 C168,150 160,128 154,116
                L148,108 L144,170 L140,230 L136,260
                L132,300 L128,340 L126,380 L124,395 L122,400
                C120,406 110,410 108,410 L92,410 C90,410 80,406 78,400
                L76,395 L74,380 L72,340 L68,300
                L64,260 L60,230 L56,170 L52,108
                L46,116 C40,128 32,150 30,168
                L26,184 L20,186 C12,186 8,178 10,168
                L14,140 C18,120 24,106 32,100 L40,96
                C48,94 68,88 82,86
                L82,82 C82,80 84,78 86,76
                L84,74 C76,68 68,58 68,44
                C68,24 82,10 100,10 Z
              `} fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="0.8" />
              {/* Collarbone hints */}
              <path d="M82,88 Q100,84 118,88" fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="0.5" />
              {/* Navel */}
              <circle cx="100" cy="210" r="1.5" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="0.5" />
              {/* Hip lines */}
              <path d="M68,250 Q100,260 132,250" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.5" />
            </g>
          )}

          {/* ═══ SKELETAL SYSTEM ═══ */}
          {activeSystems.has('skeletal') && (
            <g className="animate-fade-in" opacity="0.85">
              {/* Skull */}
              <ellipse cx="100" cy="38" rx="22" ry="26" fill="none" stroke="url(#bone-grad)" strokeWidth="0.8" opacity="0.7" />
              <path d="M82,48 Q100,56 118,48" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.5" />
              {/* Eye sockets */}
              <ellipse cx="90" cy="36" rx="6" ry="4" fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity="0.4" />
              <ellipse cx="110" cy="36" rx="6" ry="4" fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity="0.4" />
              {/* Nasal */}
              <path d="M98,42 L100,48 L102,42" fill="none" stroke="#94a3b8" strokeWidth="0.3" opacity="0.4" />
              {/* Jaw */}
              <path d="M80,48 Q82,60 100,64 Q118,60 120,48" fill="none" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.5" />

              {/* Cervical spine */}
              {[70, 74, 78, 82, 86].map(y => (
                <rect key={`c${y}`} x="97" y={y} width="6" height="3" rx="1" fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity="0.5" />
              ))}

              {/* Clavicles */}
              <path d="M100,90 Q80,86 62,92" fill="none" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.6" />
              <path d="M100,90 Q120,86 138,92" fill="none" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.6" />

              {/* Scapulae hints */}
              <path d="M64,94 L60,120 L76,114" fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity="0.3" />
              <path d="M136,94 L140,120 L124,114" fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity="0.3" />

              {/* Ribcage */}
              {[98, 106, 114, 122, 130, 138, 146, 154, 160, 165, 169, 172].map((y, i) => {
                const w = i < 7 ? 30 + i * 1.5 : 42 - (i - 7) * 3;
                return (
                  <path key={`rib${y}`} d={`M${100 - w},${y} Q100,${y + 4} ${100 + w},${y}`}
                    fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity={0.35 - i * 0.015} />
                );
              })}

              {/* Sternum */}
              <line x1="100" y1="90" x2="100" y2="165" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.5" />

              {/* Thoracic + Lumbar spine */}
              {Array.from({ length: 17 }, (_, i) => 92 + i * 10).map(y => (
                <rect key={`v${y}`} x="97" y={y} width="6" height="6" rx="1.5" fill="none" stroke="#94a3b8" strokeWidth="0.35" opacity="0.4" />
              ))}

              {/* Pelvis */}
              <path d="M68,248 Q72,230 100,228 Q128,230 132,248" fill="none" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.5" />
              <path d="M72,248 Q100,268 128,248" fill="none" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.4" />
              {/* Sacrum */}
              <path d="M94,258 L100,272 L106,258" fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />

              {/* Humerus L */}
              <line x1="54" y1="98" x2="38" y2="170" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.5" />
              {/* Radius/Ulna L */}
              <line x1="38" y1="172" x2="26" y2="240" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />
              <line x1="38" y1="172" x2="30" y2="240" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />

              {/* Humerus R */}
              <line x1="146" y1="98" x2="162" y2="170" stroke="#cbd5e1" strokeWidth="0.8" opacity="0.5" />
              {/* Radius/Ulna R */}
              <line x1="162" y1="172" x2="174" y2="240" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />
              <line x1="162" y1="172" x2="170" y2="240" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />

              {/* Femur L */}
              <line x1="84" y1="265" x2="82" y2="340" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
              {/* Tibia/Fibula L */}
              <line x1="82" y1="345" x2="80" y2="400" stroke="#94a3b8" strokeWidth="0.6" opacity="0.4" />
              <line x1="82" y1="345" x2="84" y2="400" stroke="#94a3b8" strokeWidth="0.5" opacity="0.35" />
              {/* Patella L */}
              <circle cx="82" cy="342" r="4" fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />

              {/* Femur R */}
              <line x1="116" y1="265" x2="118" y2="340" stroke="#cbd5e1" strokeWidth="1" opacity="0.5" />
              {/* Tibia/Fibula R */}
              <line x1="118" y1="345" x2="120" y2="400" stroke="#94a3b8" strokeWidth="0.6" opacity="0.4" />
              <line x1="118" y1="345" x2="116" y2="400" stroke="#94a3b8" strokeWidth="0.5" opacity="0.35" />
              {/* Patella R */}
              <circle cx="118" cy="342" r="4" fill="none" stroke="#94a3b8" strokeWidth="0.5" opacity="0.4" />
            </g>
          )}

          {/* ═══ ORGAN SYSTEM ═══ */}
          {activeSystems.has('organs') && (
            <g className="animate-fade-in" filter="url(#organ-glow)">
              {/* Brain */}
              <ellipse cx="100" cy="32" rx="16" ry="14" fill="rgba(251,191,36,0.08)" stroke="#fbbf24" strokeWidth="0.6" opacity="0.7"
                onMouseEnter={() => setHoveredOrgan('Brain')} onMouseLeave={() => setHoveredOrgan(null)} />
              <path d="M86,32 Q100,24 114,32" fill="none" stroke="#fbbf24" strokeWidth="0.3" opacity="0.4" />
              <path d="M100,20 L100,46" fill="none" stroke="#fbbf24" strokeWidth="0.3" opacity="0.3" />

              {/* Thyroid */}
              <path d="M94,80 Q100,84 106,80 Q104,76 100,78 Q96,76 94,80" fill="rgba(251,191,36,0.1)" stroke="#fbbf24" strokeWidth="0.4" opacity="0.6"
                onMouseEnter={() => setHoveredOrgan('Thyroid')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Lungs */}
              <path d="M72,100 C70,102 66,118 66,135 C66,152 72,162 80,164 C86,164 92,158 94,148 L94,104 Z"
                fill="rgba(56,189,248,0.06)" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6"
                onMouseEnter={() => setHoveredOrgan('Left Lung')} onMouseLeave={() => setHoveredOrgan(null)} />
              <path d="M128,100 C130,102 134,118 134,135 C134,152 128,162 120,164 C114,164 108,158 106,148 L106,104 Z"
                fill="rgba(56,189,248,0.06)" stroke="#38bdf8" strokeWidth="0.6" opacity="0.6"
                onMouseEnter={() => setHoveredOrgan('Right Lung')} onMouseLeave={() => setHoveredOrgan(null)} />
              {/* Bronchi */}
              <path d="M100,96 L94,104 M100,96 L106,104" fill="none" stroke="#38bdf8" strokeWidth="0.3" opacity="0.4" />
              {/* Trachea */}
              <line x1="100" y1="82" x2="100" y2="96" stroke="#38bdf8" strokeWidth="0.5" opacity="0.4" />

              {/* Heart */}
              <path d="M96,118 C88,112 82,118 82,126 C82,138 96,148 100,152 C104,148 118,138 118,126 C118,118 112,112 104,118 L100,124 Z"
                fill="rgba(239,68,68,0.1)" stroke="#ef4444" strokeWidth="0.7" opacity="0.8"
                onMouseEnter={() => setHoveredOrgan('Heart')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Liver */}
              <path d="M76,172 C72,172 68,178 70,188 C72,196 82,200 96,198 L112,194 C118,192 122,186 120,180 C118,174 110,170 100,172 Z"
                fill="rgba(251,146,60,0.08)" stroke="#fb923c" strokeWidth="0.5" opacity="0.6"
                onMouseEnter={() => setHoveredOrgan('Liver')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Stomach */}
              <path d="M106,178 C114,180 118,190 114,200 C110,210 102,212 96,208 C90,204 88,196 92,188 C94,182 100,178 106,178"
                fill="rgba(251,191,36,0.06)" stroke="#fbbf24" strokeWidth="0.5" opacity="0.55"
                onMouseEnter={() => setHoveredOrgan('Stomach')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Spleen */}
              <ellipse cx="130" cy="186" rx="8" ry="10" fill="rgba(168,85,247,0.06)" stroke="#a855f7" strokeWidth="0.4" opacity="0.5"
                onMouseEnter={() => setHoveredOrgan('Spleen')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Gallbladder */}
              <ellipse cx="82" cy="192" rx="3" ry="5" fill="rgba(34,197,94,0.08)" stroke="#22c55e" strokeWidth="0.4" opacity="0.5"
                onMouseEnter={() => setHoveredOrgan('Gallbladder')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Pancreas */}
              <path d="M82,200 Q100,196 118,200" fill="none" stroke="#fbbf24" strokeWidth="0.5" opacity="0.4"
                onMouseEnter={() => setHoveredOrgan('Pancreas')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Kidneys */}
              <ellipse cx="76" cy="202" rx="6" ry="10" fill="rgba(239,68,68,0.06)" stroke="#f87171" strokeWidth="0.5" opacity="0.55" transform="rotate(-10 76 202)"
                onMouseEnter={() => setHoveredOrgan('Left Kidney')} onMouseLeave={() => setHoveredOrgan(null)} />
              <ellipse cx="124" cy="202" rx="6" ry="10" fill="rgba(239,68,68,0.06)" stroke="#f87171" strokeWidth="0.5" opacity="0.55" transform="rotate(10 124 202)"
                onMouseEnter={() => setHoveredOrgan('Right Kidney')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Small intestine */}
              <path d="M88,212 Q92,218 96,214 Q100,210 104,216 Q108,220 112,216 Q108,224 104,220 Q100,228 96,224 Q92,228 88,224 Q92,220 88,212"
                fill="rgba(251,191,36,0.04)" stroke="#fbbf24" strokeWidth="0.35" opacity="0.4"
                onMouseEnter={() => setHoveredOrgan('Small Intestine')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Large intestine */}
              <path d="M74,198 L74,232 Q74,238 80,238 L120,238 Q126,238 126,232 L126,198"
                fill="none" stroke="#fb923c" strokeWidth="0.5" opacity="0.35"
                onMouseEnter={() => setHoveredOrgan('Large Intestine')} onMouseLeave={() => setHoveredOrgan(null)} />
              <path d="M74,198 L74,208" fill="none" stroke="#fb923c" strokeWidth="0.6" opacity="0.4" />
              <path d="M126,198 L126,208" fill="none" stroke="#fb923c" strokeWidth="0.6" opacity="0.4" />

              {/* Bladder */}
              <ellipse cx="100" cy="254" rx="10" ry="8" fill="rgba(56,189,248,0.06)" stroke="#38bdf8" strokeWidth="0.5" opacity="0.5"
                onMouseEnter={() => setHoveredOrgan('Bladder')} onMouseLeave={() => setHoveredOrgan(null)} />

              {/* Appendix */}
              <path d="M78,232 Q76,238 72,240" fill="none" stroke="#fb923c" strokeWidth="0.4" opacity="0.35"
                onMouseEnter={() => setHoveredOrgan('Appendix')} onMouseLeave={() => setHoveredOrgan(null)} />
            </g>
          )}

          {/* ═══ VASCULAR SYSTEM ═══ */}
          {activeSystems.has('vascular') && (
            <g className="animate-fade-in" opacity="0.75">
              {/* Aortic arch */}
              <path d="M100,130 C100,118 95,108 100,100 Q108,94 115,100 L115,130"
                fill="none" stroke="url(#artery-grad)" strokeWidth="1.2" opacity="0.7" />
              {/* Descending aorta */}
              <line x1="100" y1="130" x2="100" y2="260" stroke="#ef4444" strokeWidth="1" opacity="0.5" />
              {/* Carotid arteries */}
              <line x1="95" y1="100" x2="92" y2="74" stroke="#ef4444" strokeWidth="0.6" opacity="0.5" />
              <line x1="105" y1="100" x2="108" y2="74" stroke="#ef4444" strokeWidth="0.6" opacity="0.5" />
              {/* Subclavian arteries */}
              <path d="M95,104 Q80,100 60,98" fill="none" stroke="#ef4444" strokeWidth="0.6" opacity="0.45" />
              <path d="M105,104 Q120,100 140,98" fill="none" stroke="#ef4444" strokeWidth="0.6" opacity="0.45" />
              {/* Brachial arteries */}
              <line x1="54" y1="100" x2="36" y2="180" stroke="#ef4444" strokeWidth="0.4" opacity="0.35" />
              <line x1="146" y1="100" x2="164" y2="180" stroke="#ef4444" strokeWidth="0.4" opacity="0.35" />
              {/* Iliac arteries */}
              <path d="M100,256 Q92,260 86,266" fill="none" stroke="#ef4444" strokeWidth="0.6" opacity="0.45" />
              <path d="M100,256 Q108,260 114,266" fill="none" stroke="#ef4444" strokeWidth="0.6" opacity="0.45" />
              {/* Femoral arteries */}
              <line x1="84" y1="268" x2="82" y2="340" stroke="#ef4444" strokeWidth="0.5" opacity="0.35" />
              <line x1="116" y1="268" x2="118" y2="340" stroke="#ef4444" strokeWidth="0.5" opacity="0.35" />

              {/* Veins - IVC / SVC */}
              <line x1="104" y1="130" x2="104" y2="74" stroke="url(#vein-grad)" strokeWidth="0.8" opacity="0.4" />
              <line x1="104" y1="130" x2="104" y2="260" stroke="#3b82f6" strokeWidth="0.8" opacity="0.35" />
              {/* Jugular veins */}
              <line x1="94" y1="74" x2="92" y2="86" stroke="#3b82f6" strokeWidth="0.4" opacity="0.3" />
              <line x1="106" y1="74" x2="108" y2="86" stroke="#3b82f6" strokeWidth="0.4" opacity="0.3" />
            </g>
          )}

          {/* ═══ NERVOUS SYSTEM ═══ */}
          {activeSystems.has('nervous') && (
            <g className="animate-fade-in" filter="url(#nerve-glow)" opacity="0.8">
              {/* Brain (nervous view) */}
              <ellipse cx="100" cy="32" rx="16" ry="14" fill="rgba(167,139,250,0.08)" stroke="#a78bfa" strokeWidth="0.8" opacity="0.7" />
              <path d="M86,28 Q92,22 100,22 Q108,22 114,28" fill="none" stroke="#a78bfa" strokeWidth="0.4" opacity="0.5" />
              <path d="M88,36 Q94,32 100,36 Q106,32 112,36" fill="none" stroke="#a78bfa" strokeWidth="0.3" opacity="0.4" />
              {/* Brain stem */}
              <line x1="100" y1="46" x2="100" y2="70" stroke="#a78bfa" strokeWidth="0.8" opacity="0.6" />
              {/* Spinal cord */}
              <line x1="100" y1="70" x2="100" y2="266" stroke="#a78bfa" strokeWidth="0.8" opacity="0.5" strokeDasharray="none" />
              {/* Brachial plexus */}
              <path d="M100,92 Q88,96 62,100" fill="none" stroke="#c4b5fd" strokeWidth="0.5" opacity="0.4" />
              <path d="M100,92 Q112,96 138,100" fill="none" stroke="#c4b5fd" strokeWidth="0.5" opacity="0.4" />
              {/* Intercostal nerves */}
              {[104, 118, 132, 148].map(y => (
                <g key={`nerve${y}`}>
                  <path d={`M100,${y} Q85,${y + 2} 70,${y}`} fill="none" stroke="#c4b5fd" strokeWidth="0.3" opacity="0.25" />
                  <path d={`M100,${y} Q115,${y + 2} 130,${y}`} fill="none" stroke="#c4b5fd" strokeWidth="0.3" opacity="0.25" />
                </g>
              ))}
              {/* Lumbar plexus */}
              <path d="M100,230 Q90,240 84,256" fill="none" stroke="#c4b5fd" strokeWidth="0.4" opacity="0.35" />
              <path d="M100,230 Q110,240 116,256" fill="none" stroke="#c4b5fd" strokeWidth="0.4" opacity="0.35" />
              {/* Sciatic nerves */}
              <line x1="86" y1="266" x2="82" y2="380" stroke="#c4b5fd" strokeWidth="0.5" opacity="0.3" />
              <line x1="114" y1="266" x2="118" y2="380" stroke="#c4b5fd" strokeWidth="0.5" opacity="0.3" />
              {/* Arm nerves */}
              <line x1="56" y1="102" x2="30" y2="230" stroke="#c4b5fd" strokeWidth="0.3" opacity="0.25" />
              <line x1="144" y1="102" x2="170" y2="230" stroke="#c4b5fd" strokeWidth="0.3" opacity="0.25" />
            </g>
          )}

          {/* ═══ MUSCULAR SYSTEM ═══ */}
          {activeSystems.has('muscular') && (
            <g className="animate-fade-in" opacity="0.6">
              {/* Pectorals */}
              <path d="M80,96 Q100,94 100,96 L98,116 Q90,118 80,112 Z" fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth="0.5" opacity="0.5" />
              <path d="M120,96 Q100,94 100,96 L102,116 Q110,118 120,112 Z" fill="rgba(220,38,38,0.06)" stroke="#dc2626" strokeWidth="0.5" opacity="0.5" />
              {/* Deltoids */}
              <path d="M60,94 Q52,96 50,106 L56,110 Q62,100 66,96 Z" fill="rgba(220,38,38,0.05)" stroke="#dc2626" strokeWidth="0.4" opacity="0.45" />
              <path d="M140,94 Q148,96 150,106 L144,110 Q138,100 134,96 Z" fill="rgba(220,38,38,0.05)" stroke="#dc2626" strokeWidth="0.4" opacity="0.45" />
              {/* Biceps */}
              <ellipse cx="48" cy="130" rx="6" ry="18" fill="rgba(220,38,38,0.04)" stroke="#dc2626" strokeWidth="0.4" opacity="0.4" transform="rotate(-10 48 130)" />
              <ellipse cx="152" cy="130" rx="6" ry="18" fill="rgba(220,38,38,0.04)" stroke="#dc2626" strokeWidth="0.4" opacity="0.4" transform="rotate(10 152 130)" />
              {/* Abs (rectus abdominis) */}
              {[172, 186, 200, 214, 228].map(y => (
                <g key={`abs${y}`}>
                  <rect x="92" y={y} width="7" height="11" rx="1.5" fill="rgba(220,38,38,0.04)" stroke="#dc2626" strokeWidth="0.3" opacity="0.35" />
                  <rect x="101" y={y} width="7" height="11" rx="1.5" fill="rgba(220,38,38,0.04)" stroke="#dc2626" strokeWidth="0.3" opacity="0.35" />
                </g>
              ))}
              {/* Obliques */}
              <path d="M78,176 L90,174 L88,240 L76,238 Z" fill="rgba(220,38,38,0.03)" stroke="#dc2626" strokeWidth="0.3" opacity="0.3" />
              <path d="M122,176 L110,174 L112,240 L124,238 Z" fill="rgba(220,38,38,0.03)" stroke="#dc2626" strokeWidth="0.3" opacity="0.3" />
              {/* Quadriceps */}
              <ellipse cx="82" cy="300" rx="9" ry="28" fill="rgba(220,38,38,0.04)" stroke="#dc2626" strokeWidth="0.4" opacity="0.4" />
              <ellipse cx="118" cy="300" rx="9" ry="28" fill="rgba(220,38,38,0.04)" stroke="#dc2626" strokeWidth="0.4" opacity="0.4" />
              {/* Calves */}
              <ellipse cx="82" cy="365" rx="6" ry="18" fill="rgba(220,38,38,0.03)" stroke="#dc2626" strokeWidth="0.3" opacity="0.35" />
              <ellipse cx="118" cy="365" rx="6" ry="18" fill="rgba(220,38,38,0.03)" stroke="#dc2626" strokeWidth="0.3" opacity="0.35" />
              {/* Trapezius hint */}
              <path d="M86,76 Q100,82 114,76" fill="none" stroke="#dc2626" strokeWidth="0.4" opacity="0.3" />
            </g>
          )}

          {/* ═══ INTERACTIVE REGION OVERLAYS ═══ */}
          {REGIONS.map(r => (
            <path key={r.id} d={r.path}
              fill={activeRegions.has(r.id) ? 'rgba(16,185,129,0.12)' : hoveredRegion === r.id ? 'rgba(16,185,129,0.06)' : 'transparent'}
              stroke={activeRegions.has(r.id) ? 'rgba(16,185,129,0.5)' : hoveredRegion === r.id ? 'rgba(16,185,129,0.25)' : 'transparent'}
              strokeWidth="1"
              className="cursor-pointer transition-all duration-200"
              style={isHighlighted(r.id) ? { fill: 'rgba(245,158,11,0.1)', stroke: 'rgba(245,158,11,0.4)' } : {}}
              onMouseEnter={() => setHoveredRegion(r.id)}
              onMouseLeave={() => setHoveredRegion(null)}
              onClick={() => onToggleRegion(r.id)}
            />
          ))}

          {/* Region label tooltip */}
          {hoveredRegion && (() => {
            const r = REGIONS.find(rg => rg.id === hoveredRegion);
            if (!r) return null;
            const pts = r.path.match(/[\d.]+/g)?.map(Number) || [];
            const cx = pts.length > 0 ? pts.filter((_, i) => i % 2 === 0).reduce((a, b) => a + b, 0) / (pts.length / 2) : 100;
            const cy = pts.length > 1 ? Math.min(...pts.filter((_, i) => i % 2 === 1)) - 8 : 50;
            return (
              <g>
                <rect x={cx - 30} y={cy - 10} width="60" height="14" rx="3" fill="rgba(0,0,0,0.8)" stroke="rgba(16,185,129,0.3)" strokeWidth="0.5" />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#10b981" fontSize="7" fontWeight="600" className="pointer-events-none select-none">
                  {r.label}
                </text>
              </g>
            );
          })()}

          {/* Organ label tooltip */}
          {hoveredOrgan && (
            <g>
              <rect x="55" y="2" width="90" height="12" rx="3" fill="rgba(0,0,0,0.85)" stroke="rgba(251,191,36,0.3)" strokeWidth="0.5" />
              <text x="100" y="8" textAnchor="middle" dominantBaseline="central" fill="#fbbf24" fontSize="6.5" fontWeight="600" className="pointer-events-none select-none">
                {hoveredOrgan}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Active regions chips */}
      {activeRegions.size > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {Array.from(activeRegions).map(id => {
            const r = REGIONS.find(rg => rg.id === id);
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-[10px] text-emerald-400 font-medium">
                {r?.label ?? id}
                <button onClick={() => onToggleRegion(id)} className="hover:text-white transition-colors ml-0.5">×</button>
              </span>
            );
          })}
        </div>
      )}

      <p className="text-[8px] text-center text-slate-600 mt-2">Toggle body systems above · Click regions to indicate pain areas</p>
    </div>
  );
}

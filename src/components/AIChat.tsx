'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

type Message = { role: 'ai' | 'user'; text: string; options?: string[] };

type ChatStage = 'greeting' | 'complaint' | 'duration' | 'severity' | 'radiation' | 'vitals' | 'history' | 'meds' | 'allergies' | 'risks' | 'ready';

interface AIChatProps {
  onCaseReady: (caseText: string) => void;
  className?: string;
}

const SYMPTOM_CHIPS = [
  'Chest pain', 'Headache', 'Abdominal pain', 'Shortness of breath',
  'Dizziness', 'Back pain', 'Cough', 'Fever', 'Nausea / Vomiting',
  'Palpitations', 'Weakness', 'Rash', 'Joint pain', 'Confusion',
  'Visual disturbance', 'Swelling', 'Bleeding', 'Seizure',
];

const DURATION_OPTIONS = ['< 1 hour', '1–6 hours', '6–24 hours', '1–3 days', '> 1 week'];
const SEVERITY_OPTIONS = ['Mild (1–3/10)', 'Moderate (4–6/10)', 'Severe (7–9/10)', 'Worst ever (10/10)'];
const RADIATION_OPTIONS = ['Left arm', 'Right arm', 'Jaw', 'Back', 'Neck', 'Shoulder', 'No radiation'];
const HISTORY_OPTIONS = ['Hypertension', 'Diabetes', 'Asthma / COPD', 'Heart disease', 'Atrial fibrillation', 'DVT / PE', 'Cancer', 'None significant'];
const RISK_OPTIONS = ['Smoking', 'Obesity', 'Alcohol', 'Immobility', 'Recent surgery', 'Pregnancy', 'Oral contraceptive', 'Family history', 'None'];

const COMMON_DRUGS = [
  'Aspirin', 'Warfarin', 'Metformin', 'Lisinopril', 'Omeprazole',
  'Simvastatin', 'Amlodipine', 'Ibuprofen', 'Paracetamol', 'Levothyroxine',
  'Bisoprolol', 'Salbutamol inhaler', 'Insulin', 'Clopidogrel', 'Prednisolone',
];

export default function AIChat({ onCaseReady, className }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', text: "Hello, I'm ClinReason AI. I'll guide you through a clinical assessment. What is the patient's main complaint today?", options: SYMPTOM_CHIPS.slice(0, 9) },
  ]);
  const [stage, setStage] = useState<ChatStage>('complaint');
  const [input, setInput] = useState('');
  const [caseData, setCaseData] = useState({
    age: '', sex: '', complaint: '', duration: '', severity: '', radiation: '',
    vitals: '', history: [] as string[], meds: [] as string[], allergies: '', risks: [] as string[],
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addAI = useCallback((text: string, options?: string[]) => {
    setMessages(prev => [...prev, { role: 'ai', text, options }]);
  }, []);

  const addUser = useCallback((text: string) => {
    setMessages(prev => [...prev, { role: 'user', text }]);
  }, []);

  const advanceStage = useCallback((userText: string) => {
    addUser(userText);

    switch (stage) {
      case 'complaint':
        setCaseData(d => ({ ...d, complaint: userText }));
        setStage('duration');
        setTimeout(() => addAI(`"${userText}" noted. How long has this been going on?`, DURATION_OPTIONS), 400);
        break;
      case 'duration':
        setCaseData(d => ({ ...d, duration: userText }));
        setStage('severity');
        setTimeout(() => addAI('How severe is it on a scale of 1 to 10?', SEVERITY_OPTIONS), 400);
        break;
      case 'severity':
        setCaseData(d => ({ ...d, severity: userText }));
        setStage('radiation');
        setTimeout(() => addAI('Does the symptom radiate or spread anywhere?', RADIATION_OPTIONS), 400);
        break;
      case 'radiation':
        setCaseData(d => ({ ...d, radiation: userText }));
        setStage('vitals');
        setTimeout(() => addAI('Do you have any vital signs? (e.g. BP 130/85, HR 92, Temp 37.5) Type them or skip.'), 400);
        break;
      case 'vitals':
        setCaseData(d => ({ ...d, vitals: userText }));
        setStage('history');
        setTimeout(() => addAI('Any relevant past medical history? Select all that apply, then type "done" or click another option.', HISTORY_OPTIONS), 400);
        break;
      case 'history':
        if (userText.toLowerCase() === 'done' || userText === 'None significant') {
          setStage('meds');
          setTimeout(() => addAI('What medications is the patient currently taking?', COMMON_DRUGS.slice(0, 8)), 400);
        } else {
          setCaseData(d => ({ ...d, history: [...d.history, userText] }));
          setTimeout(() => addAI(`Added: ${userText}. Any more? Select or type "done".`, HISTORY_OPTIONS.filter(h => h !== userText)), 300);
        }
        break;
      case 'meds':
        if (userText.toLowerCase() === 'done' || userText.toLowerCase() === 'none') {
          setStage('allergies');
          setTimeout(() => addAI('Any known drug allergies?'), 400);
        } else {
          setCaseData(d => ({ ...d, meds: [...d.meds, userText] }));
          setTimeout(() => addAI(`Added: ${userText}. Any more? Type drug name or "done".`, COMMON_DRUGS.filter(d => d !== userText).slice(0, 6)), 300);
        }
        break;
      case 'allergies':
        setCaseData(d => ({ ...d, allergies: userText }));
        setStage('risks');
        setTimeout(() => addAI('Any risk factors? Select all that apply, then "done".', RISK_OPTIONS), 400);
        break;
      case 'risks':
        if (userText.toLowerCase() === 'done' || userText === 'None') {
          setStage('ready');
          setTimeout(() => {
            addAI("Thank you. I've built the clinical case. Ready to run the differential diagnosis engine?", ['🔬 Run Analysis', 'Add more details']);
          }, 400);
        } else {
          setCaseData(d => ({ ...d, risks: [...d.risks, userText] }));
          setTimeout(() => addAI(`Added: ${userText}. More? Select or "done".`, RISK_OPTIONS.filter(r => r !== userText)), 300);
        }
        break;
      case 'ready':
        if (userText === '🔬 Run Analysis' || userText.toLowerCase().includes('run') || userText.toLowerCase().includes('analys')) {
          buildAndSubmit();
        } else {
          setStage('vitals');
          setTimeout(() => addAI('What else would you like to add? You can provide vitals, additional symptoms, or history.'), 300);
        }
        break;
    }
  }, [stage, addAI, addUser, caseData]);

  const buildAndSubmit = useCallback(() => {
    const d = caseData;
    const parts: string[] = [];
    if (d.age || d.sex) parts.push(`${d.age || ''}${d.sex ? (d.age ? '-year-old ' : '') + d.sex : ''}`);
    parts.push(`presenting with ${d.complaint} for ${d.duration || 'unspecified duration'}.`);
    if (d.severity) parts.push(`Severity: ${d.severity}.`);
    if (d.radiation && d.radiation !== 'No radiation') parts.push(`Radiating to ${d.radiation.toLowerCase()}.`);
    if (d.vitals && d.vitals.toLowerCase() !== 'skip') parts.push(`Vitals: ${d.vitals}.`);
    if (d.history.length) parts.push(`History of ${d.history.join(', ')}.`);
    if (d.meds.length) parts.push(`Currently taking ${d.meds.join(', ')}.`);
    if (d.allergies && d.allergies.toLowerCase() !== 'nkda' && d.allergies.toLowerCase() !== 'none') parts.push(`Allergic to ${d.allergies}.`);
    if (d.risks.length) parts.push(`Risk factors: ${d.risks.join(', ')}.`);
    const caseText = parts.join(' ');
    addAI(`Case built: "${caseText.slice(0, 120)}..." Running analysis now...`);
    onCaseReady(caseText);
  }, [caseData, addAI, onCaseReady]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    advanceStage(text);
  };

  const handleChip = (text: string) => {
    advanceStage(text);
  };

  const handlePaste = useCallback((caseText: string) => {
    addUser(caseText);
    addAI('Full case received. Running analysis...');
    onCaseReady(caseText);
  }, [addAI, addUser, onCaseReady]);

  return (
    <div className={`flex flex-col h-full bg-[#070e1a]/50 rounded-xl border border-white/[0.06] ${className || ''}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-semibold text-white/90">ClinReason AI</div>
          <div className="text-[10px] text-white/40">Guided Clinical Assessment</div>
        </div>
        <button onClick={() => { setMessages([{ role:'ai', text:"Hello, I'm ClinReason AI. I'll guide you through a clinical assessment. What is the patient's main complaint today?", options: SYMPTOM_CHIPS.slice(0,9) }]); setStage('complaint'); setCaseData({age:'',sex:'',complaint:'',duration:'',severity:'',radiation:'',vitals:'',history:[],meds:[],allergies:'',risks:[]}); }}
          className="ml-auto text-[10px] text-white/30 hover:text-white/60 px-2 py-1 rounded border border-white/5 hover:border-white/10 transition-all">
          Reset
        </button>
      </div>

      {/* Quick age/sex bar */}
      <div className="px-4 py-2 border-b border-white/[0.04] flex items-center gap-2 text-[11px]">
        <input type="number" placeholder="Age" value={caseData.age} onChange={e => setCaseData(d => ({...d, age: e.target.value}))}
          className="w-14 bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/80 outline-none focus:border-emerald-500/30" />
        <select value={caseData.sex} onChange={e => setCaseData(d => ({...d, sex: e.target.value}))}
          className="bg-white/[0.04] border border-white/[0.08] rounded px-2 py-1 text-white/80 outline-none focus:border-emerald-500/30">
          <option value="">Sex</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <span className="text-white/20 ml-auto">or</span>
        <button onClick={() => { const t = prompt('Paste full clinical case:'); if(t) handlePaste(t); }}
          className="text-emerald-400/70 hover:text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 hover:border-emerald-500/30 transition-all">
          Paste Full Case
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${
              msg.role === 'ai'
                ? 'bg-white/[0.04] border border-white/[0.06] rounded-xl rounded-tl-sm'
                : 'bg-emerald-500/15 border border-emerald-500/20 rounded-xl rounded-tr-sm'
            } px-3 py-2`}>
              <p className="text-[12px] leading-relaxed text-white/80">{msg.text}</p>
              {msg.options && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {msg.options.map(opt => (
                    <button key={opt} onClick={() => handleChip(opt)}
                      className="px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/60 hover:text-white hover:bg-white/[0.1] hover:border-white/15 transition-all">
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Type your response..."
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white/80 outline-none focus:border-emerald-500/30 placeholder:text-white/25" />
          <button onClick={handleSend}
            className="px-4 py-2 bg-emerald-500/80 hover:bg-emerald-500 rounded-lg text-xs font-medium text-white transition-all">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

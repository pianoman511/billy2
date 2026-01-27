
import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, 
  Mic2, 
  MessageSquare, 
  ScanLine, 
  Pill,
  Menu,
  X,
  AlarmClock,
  Volume2,
  Maximize,
  Minimize
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AppFeature, Medication } from './types.ts';
import ObjectRecognition from './features/ObjectRecognition.tsx';
import SpeechToText from './features/SpeechToText.tsx';
import TextToSpeech from './features/TextToSpeech.tsx';
import OCRScanner from './features/OCRScanner.tsx';
import MedicinePlanner from './features/MedicinePlanner.tsx';
import AccessibleButton from './components/AccessibleButton.tsx';
import { decode, decodeAudioData } from './services/audio.ts';

const CORE_FEATURES = [
  { id: AppFeature.OBJECT_RECOGNITION, label: 'Vision', icon: <Eye size={22} /> },
  { id: AppFeature.SPEECH_TO_TEXT, label: 'Captions', icon: <Mic2 size={22} /> },
  { id: AppFeature.TEXT_TO_SPEECH, label: 'Voice', icon: <MessageSquare size={22} /> },
  { id: AppFeature.OCR_SCANNER, label: 'Read', icon: <ScanLine size={22} /> },
  { id: AppFeature.MEDICINE_PLANNER, label: 'Meds', icon: <Pill size={22} /> },
];

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<AppFeature>(AppFeature.OBJECT_RECOGNITION);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Medication | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const triggeredMedsRef = useRef<Set<string>>(new Set());
  
  const alarmAudioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (alarmAudioCtxRef.current) {
      alarmAudioCtxRef.current.close().catch(() => {});
      alarmAudioCtxRef.current = null;
    }
  };

  const playAlarmSound = () => {
    stopAlarmSound();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    alarmAudioCtxRef.current = ctx;

    const playBeep = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    };

    alarmIntervalRef.current = window.setInterval(playBeep, 1000);
  };

  const speakAlarmMessage = async (med: Medication) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const prompt = `Reminder for ${med.patientName}. It is time for ${med.name}. Dosage: ${med.dosage}.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decoded = await decodeAudioData(decode(audioData), context, 24000, 1);
        const source = context.createBufferSource();
        source.buffer = decoded;
        source.connect(context.destination);
        source.start();
      }
    } catch (e) {
      console.error("Alarm speech error", e);
    }
  };

  useEffect(() => {
    const monitorInterval = setInterval(() => {
      const now = new Date();
      const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const saved = localStorage.getItem('assistme_meds');
      if (saved) {
        const meds: Medication[] = JSON.parse(saved);
        const dueMed = meds.find(m => m.time === currentHHmm);
        if (dueMed) {
          const triggerId = `${dueMed.id}-${currentHHmm}`;
          if (!triggeredMedsRef.current.has(triggerId)) {
            setActiveAlarm(dueMed);
            triggeredMedsRef.current.add(triggerId);
            playAlarmSound();
            speakAlarmMessage(dueMed);
          }
        }
      }
    }, 10000);
    return () => {
      clearInterval(monitorInterval);
      stopAlarmSound();
    };
  }, []);

  const handleAlarmAcknowledge = () => {
    stopAlarmSound();
    setActiveAlarm(null);
  };

  const renderFeature = () => {
    switch (activeFeature) {
      case AppFeature.OBJECT_RECOGNITION: return <ObjectRecognition />;
      case AppFeature.SPEECH_TO_TEXT: return <SpeechToText />;
      case AppFeature.TEXT_TO_SPEECH: return <TextToSpeech />;
      case AppFeature.OCR_SCANNER: return <OCRScanner />;
      case AppFeature.MEDICINE_PLANNER: return <MedicinePlanner />;
      default: return <ObjectRecognition />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-roboto">
      <header className="px-6 py-5 flex justify-between items-center bg-white shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Logo_Sagrada_Familia.svg/200px-Logo_Sagrada_Familia.svg.png" 
            alt="Assistme Logo" 
            className="w-12 h-12 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "https://www.mdsf.edu.ph/wp-content/uploads/2017/05/imageedit_1_6485528666.png";
            }}
          />
          <div className="flex flex-col">
            <h1 className="text-2xl font-black tracking-tighter text-stone-900 leading-none">Assistme</h1>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mt-1">By 12-Einstein</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-3 rounded-full hover:bg-stone-50 transition-colors"
          aria-label="Menu"
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8 mb-28">
        {renderFeature()}
      </main>

      {activeAlarm && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <div className="w-full max-w-sm flex flex-col gap-6 animate-in zoom-in">
            <div className="flex justify-center">
              <div className="bg-amber-100 text-amber-600 p-8 rounded-full shadow-inner">
                <AlarmClock size={64} className="animate-pulse" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-stone-900 tracking-tight">Medicine Time</h2>
              <p className="text-lg text-stone-400 font-medium">It's {activeAlarm.time}</p>
            </div>
            <div className="bg-stone-50 p-6 rounded-2xl shadow-sm">
              <p className="text-2xl font-bold text-stone-900">{activeAlarm.name}</p>
              <p className="text-amber-600 font-bold uppercase tracking-wider text-sm">{activeAlarm.dosage}</p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <AccessibleButton onClick={handleAlarmAcknowledge} variant="primary" className="py-6 text-xl">
                I've taken it
              </AccessibleButton>
              <button onClick={() => speakAlarmMessage(activeAlarm)} className="text-stone-400 font-bold hover:text-stone-600 flex items-center justify-center gap-2 py-2">
                <Volume2 size={20} /> Hear again
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.03)] border-t border-stone-100 px-2 py-4 flex justify-around items-center z-40">
        {CORE_FEATURES.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setActiveFeature(f.id);
              setIsMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
              activeFeature === f.id ? 'text-amber-600 scale-105' : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {f.icon}
            <span className="text-[10px] font-black uppercase tracking-widest">{f.label}</span>
            {activeFeature === f.id && <div className="w-1 h-1 rounded-full bg-amber-600 mt-0.5"></div>}
          </button>
        ))}
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-stone-900/20 backdrop-blur-sm animate-in fade-in" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl flex flex-col animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-stone-50 flex justify-between items-center bg-stone-50/50">
              <h2 className="text-xs font-black text-stone-400 uppercase tracking-[0.3em]">Menu</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="px-4 py-6 space-y-2 flex-1">
              {CORE_FEATURES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setActiveFeature(f.id); setIsMenuOpen(false); }}
                  className={`w-full flex items-center gap-5 p-5 rounded-2xl text-lg font-black transition-all ${
                    activeFeature === f.id ? 'bg-amber-100 text-amber-800' : 'bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <div className={`${activeFeature === f.id ? 'text-amber-600' : 'text-stone-400'}`}>{f.icon}</div>
                  {f.label}
                </button>
              ))}
              <div className="pt-6 border-t border-stone-50 mt-6">
                <button
                  onClick={() => { toggleFullscreen(); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-5 p-5 rounded-2xl text-lg font-black bg-white text-stone-500 hover:bg-stone-50"
                >
                  {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                  {isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                </button>
              </div>
            </div>
            <div className="p-10 border-t border-stone-50 bg-stone-50/30">
               <p className="text-[11px] font-black text-stone-300 uppercase tracking-[0.4em] text-center">Assistme v2.0</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

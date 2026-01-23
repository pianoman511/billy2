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
import { AppFeature, Medication } from './types';
import ObjectRecognition from './features/ObjectRecognition';
import SpeechToText from './features/SpeechToText';
import TextToSpeech from './features/TextToSpeech';
import OCRScanner from './features/OCRScanner';
import MedicinePlanner from './features/MedicinePlanner';
import AccessibleButton from './components/AccessibleButton';
import { decode, decodeAudioData } from './services/audio';

const App: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<AppFeature>(AppFeature.OBJECT_RECOGNITION);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Medication | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const triggeredMedsRef = useRef<Set<string>>(new Set());
  
  const alarmAudioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  const features = [
    { id: AppFeature.OBJECT_RECOGNITION, label: 'Vision', icon: <Eye size={22} /> },
    { id: AppFeature.SPEECH_TO_TEXT, label: 'Captions', icon: <Mic2 size={22} /> },
    { id: AppFeature.TEXT_TO_SPEECH, label: 'Voice', icon: <MessageSquare size={22} /> },
    { id: AppFeature.OCR_SCANNER, label: 'Read', icon: <ScanLine size={22} /> },
    { id: AppFeature.MEDICINE_PLANNER, label: 'Meds', icon: <Pill size={22} /> },
  ];

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      window.clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (alarmAudioCtxRef.current) {
      alarmAudioCtxRef.current.close();
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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Medication Reminder. Time for ${med.name}. Dosage: ${med.dosage}.`;
      
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
        <div className="flex items-center gap-2">
           <h1 className="text-xl font-black tracking-tight text-stone-900">assistme</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-full hover:bg-stone-50 transition-colors"
          aria-label="Menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8 mb-28">
        {renderFeature()}
      </main>

      {activeAlarm && (
        <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-full max-w-sm flex flex-col gap-6 scale-up animate-in zoom-in duration-300">
            <div className="flex justify-center">
              <div className="bg-amber-100 text-amber-600 p-8 rounded-full shadow-inner">
                <AlarmClock size={64} className="animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-stone-900 tracking-tight">Medicine Reminder</h2>
              <p className="text-lg text-stone-400 font-medium">It's scheduled for {activeAlarm.time}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm space-y-2">
              <p className="text-2xl font-bold text-stone-900">{activeAlarm.name}</p>
              <p className="text-amber-600 font-bold uppercase tracking-wider text-sm">{activeAlarm.dosage}</p>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <AccessibleButton onClick={handleAlarmAcknowledge} variant="primary" className="py-6 text-xl">
                I've taken it
              </AccessibleButton>
              <button 
                onClick={() => speakAlarmMessage(activeAlarm)}
                className="text-stone-400 font-bold hover:text-stone-600 flex items-center justify-center gap-2 py-2 transition-colors"
              >
                <Volume2 size={20} /> Read instructions again
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md px-2 py-4 flex justify-around items-center z-40 border-t border-stone-100 shadow-[0_-5px_20px_rgba(0,0,0,0.02)]">
        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setActiveFeature(f.id);
              setIsMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
              activeFeature === f.id 
                ? 'text-amber-600' 
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {f.icon}
            <span className="text-[10px] font-bold uppercase tracking-widest">{f.label}</span>
            {activeFeature === f.id && <div className="w-1 h-1 rounded-full bg-amber-600 mt-0.5"></div>}
          </button>
        ))}
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-stone-900/10 backdrop-blur-sm animate-in fade-in" onClick={() => setIsMenuOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col gap-4 animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-50 flex justify-between items-center">
              <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">Navigation</h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-3 py-2 space-y-1">
              {features.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFeature(f.id);
                    setIsMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-base font-bold transition-all ${
                    activeFeature === f.id 
                      ? 'bg-amber-50 text-amber-700' 
                      : 'bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
              
              <div className="pt-4 border-t border-stone-50 mt-4">
                <button
                  onClick={() => {
                    toggleFullscreen();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl text-base font-bold transition-all bg-white text-stone-600 hover:bg-stone-50"
                >
                  {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                  {isFullscreen ? 'Exit Full Screen' : 'Go Full Screen'}
                </button>
              </div>
            </div>
            <div className="mt-auto p-8 border-t border-stone-50">
               <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest text-center">v1.5 Minimal</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
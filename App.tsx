
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
  Volume2
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
  const triggeredMedsRef = useRef<Set<string>>(new Set());
  
  const alarmAudioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<number | null>(null);

  const features = [
    { id: AppFeature.OBJECT_RECOGNITION, label: 'Identify Objects', icon: <Eye size={24} /> },
    { id: AppFeature.SPEECH_TO_TEXT, label: 'Voice Captions', icon: <Mic2 size={24} /> },
    { id: AppFeature.TEXT_TO_SPEECH, label: 'Talk for Me', icon: <MessageSquare size={24} /> },
    { id: AppFeature.OCR_SCANNER, label: 'Read Text', icon: <ScanLine size={24} /> },
    { id: AppFeature.MEDICINE_PLANNER, label: 'Medicine Help', icon: <Pill size={24} /> },
  ];

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
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    };

    alarmIntervalRef.current = window.setInterval(playBeep, 800);
  };

  const speakAlarmMessage = async (med: Medication) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Attention! It is time for ${med.patientName} to take their medicine: ${med.name}. The dosage is ${med.dosage}. Please take it now.`;
      
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
    }, 5000);

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
    <div className="min-h-screen bg-yellow-50 flex flex-col">
      <header className="bg-yellow-400 p-4 flex justify-between items-center border-b-4 border-yellow-500 sticky top-0 z-50 shadow-md">
        <h1 className="text-xl font-black text-black tracking-tighter uppercase italic">Assistme</h1>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 rounded-xl bg-white border-2 border-black active:scale-95 transition-transform shadow-md"
          aria-label="Menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 mb-24">
        {renderFeature()}
      </main>

      {activeAlarm && (
        <div className="fixed inset-0 z-[100] bg-yellow-400 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-12 rounded-[3rem] border-[10px] border-black shadow-[15px_15px_0_0_rgba(0,0,0,1)] w-full max-w-2xl flex flex-col gap-8 animate-bounce-slow">
            <div className="flex justify-center">
              <div className="bg-red-500 text-white p-6 rounded-full animate-pulse shadow-lg">
                <AlarmClock size={80} className="animate-wiggle" />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <h2 className="text-5xl font-black uppercase tracking-tighter italic text-red-600">Time for Medicine!</h2>
              <p className="text-3xl font-bold text-slate-500 italic">{activeAlarm.time}</p>
            </div>

            <div className="bg-yellow-100 p-8 rounded-3xl border-4 border-yellow-300">
              <p className="text-4xl font-black text-slate-900 uppercase mb-2">{activeAlarm.name}</p>
              <p className="text-2xl font-bold text-slate-600">Patient: {activeAlarm.patientName}</p>
              <p className="text-3xl font-black text-yellow-700 mt-4">Dosage: {activeAlarm.dosage}</p>
            </div>

            <div className="flex flex-col gap-4">
              <AccessibleButton 
                onClick={handleAlarmAcknowledge} 
                variant="success"
                className="py-8 text-4xl shadow-[0_10px_0_0_rgba(21,128,61,1)]"
              >
                I TOOK IT
              </AccessibleButton>
              
              <button 
                onClick={() => speakAlarmMessage(activeAlarm)}
                className="flex items-center justify-center gap-2 text-xl font-black text-slate-400 uppercase hover:text-black transition-colors"
              >
                <Volume2 size={32} /> Hear Instructions Again
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-yellow-400 p-2 flex justify-around items-center z-40 overflow-x-auto gap-2 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
        {features.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setActiveFeature(f.id);
              setIsMenuOpen(false);
            }}
            className={`flex flex-col items-center gap-1 min-w-[60px] p-2 rounded-xl transition-all ${
              activeFeature === f.id 
                ? 'bg-yellow-400 text-black scale-105 border-2 border-yellow-600 shadow-md' 
                : 'text-slate-500 hover:bg-yellow-50'
            }`}
          >
            {f.icon}
            <span className="text-[9px] font-black uppercase whitespace-nowrap tracking-tighter">{f.id}</span>
          </button>
        ))}
      </nav>

      {isMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-yellow-400 flex flex-col p-6 gap-4 animate-in slide-in-from-right duration-300">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-black italic uppercase tracking-tighter">Tools</h2>
            <button onClick={() => setIsMenuOpen(false)} className="p-3 bg-white border-2 border-black rounded-xl shadow-xl">
              <X size={32} />
            </button>
          </div>
          {features.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setActiveFeature(f.id);
                setIsMenuOpen(false);
              }}
              className={`flex items-center gap-4 p-5 rounded-xl text-xl font-black transition-all border-4 ${
                activeFeature === f.id ? 'bg-black text-white border-black' : 'bg-white text-black border-transparent shadow-xl'
              }`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
          <div className="mt-auto text-center p-4 bg-yellow-300 rounded-3xl border-2 border-yellow-500">
            <p className="text-sm font-black text-yellow-900 opacity-60 uppercase tracking-widest">Assistme v1.4</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        .animate-bounce-slow { animation: bounce-slow 4s infinite ease-in-out; }
        .animate-wiggle { animation: wiggle 0.2s infinite ease-in-out; }
      `}</style>
    </div>
  );
};

export default App;

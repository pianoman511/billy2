
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { BellRing, MicOff, History, TriangleAlert } from 'lucide-react';
import AccessibleButton from '../components/AccessibleButton';
import { encode } from '../services/audio';

const SoundAlerts: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState<{id: number, text: string}[]>([]);
  const [alertHistory, setAlertHistory] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const alertIdCounter = useRef(0);

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.warn("Error closing session", e);
      }
      sessionRef.current = null;
    }
    setIsListening(false);
  };

  useEffect(() => {
    return () => cleanup();
  }, []);

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputCtx;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are an environmental sound monitoring system for the hearing impaired. Monitor for important sounds: alarms, sirens, doorbells, knocks, baby crying, dog barking, phone ringing, or smoke detectors. When you detect one, respond with ONLY a short text alert in square brackets, e.g., [ALARM DETECTED]. DO NOT respond with regular conversational speech or transcription.'
        },
        callbacks: {
          onopen: () => {
            setIsListening(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(s => {
                if (s && typeof s.sendRealtimeInput === 'function') {
                  s.sendRealtimeInput({ media: pcmBlob });
                }
              }).catch(err => console.error("Error sending audio", err));
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const parts = msg.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                if (part.text && part.text.includes('[')) {
                  const alert = part.text.trim();
                  const newId = alertIdCounter.current++;
                  
                  setSoundAlerts(prev => [{id: newId, text: alert}, ...prev].slice(0, 3));
                  setAlertHistory(h => [alert, ...h].slice(0, 10));

                  // Auto-remove alert after 6 seconds
                  setTimeout(() => {
                    setSoundAlerts(prev => prev.filter(a => a.id !== newId));
                  }, 6000);
                }
              }
            }
          },
          onerror: (e) => {
            console.error("Gemini Sound Monitoring Error", e);
            cleanup();
          },
          onclose: () => {
            cleanup();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start sound monitoring", err);
      cleanup();
    }
  };

  const stopListening = () => cleanup();

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Visual Indicator of Activity */}
      <div className="bg-yellow-200 p-6 rounded-3xl border-4 border-yellow-400 flex flex-col items-center gap-4 text-center">
        {isListening ? (
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center text-white">
              <BellRing size={40} className="animate-bounce" />
            </div>
            <p className="text-xl font-black text-yellow-800 uppercase italic">Listening for sounds...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-50">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center text-slate-500">
              <MicOff size={40} />
            </div>
            <p className="text-xl font-black text-slate-500 uppercase italic">Monitoring Stopped</p>
          </div>
        )}
      </div>

      {/* Main Alert Display Area */}
      <div className={`min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 rounded-[3rem] border-8 transition-all duration-500 shadow-2xl ${soundAlerts.length > 0 ? 'bg-red-500 border-red-700 scale-100' : 'bg-white border-yellow-200'}`}>
        {soundAlerts.length > 0 ? (
          soundAlerts.map(alert => (
            <div key={alert.id} className="flex flex-col items-center text-center animate-in zoom-in duration-300">
              <TriangleAlert size={100} className="text-white mb-4 drop-shadow-lg" />
              <div className="text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-md leading-none">
                {alert.text.replace(/[\[\]]/g, '')}
              </div>
              <p className="text-red-100 font-bold mt-2 text-xl">Detected Now!</p>
            </div>
          ))
        ) : (
          <div className="text-center">
            <p className="text-2xl font-black text-slate-300 uppercase italic tracking-widest">Environment Quiet</p>
            <p className="text-slate-400 font-bold">Waiting for important noises...</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <AccessibleButton 
          onClick={isListening ? stopListening : startListening}
          variant={isListening ? 'danger' : 'primary'}
          className="w-full py-6"
        >
          {isListening ? <MicOff size={32} /> : <BellRing size={32} />}
          {isListening ? 'Stop Monitoring' : 'Start Monitoring'}
        </AccessibleButton>

        {alertHistory.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            <h4 className="text-lg font-black flex items-center gap-2 text-slate-500 uppercase">
              <History size={20} /> Alert History
            </h4>
            <div className="grid grid-cols-1 gap-2">
              {alertHistory.map((text, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border-2 border-yellow-200 text-lg font-bold text-slate-600 shadow-sm flex justify-between">
                  <span>{text}</span>
                  <span className="text-sm opacity-50">Just now</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoundAlerts;

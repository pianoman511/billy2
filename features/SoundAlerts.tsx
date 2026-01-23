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
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'Monitor environmental sounds. If you hear a doorbell, knock, alarm, siren, baby cry, or dog bark, respond with exactly ONE short tag in brackets like [ALARM]. Otherwise, remain silent.'
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
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(s => {
                s.sendRealtimeInput({ media: pcmBlob });
              }).catch(() => {});
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

                  setTimeout(() => {
                    setSoundAlerts(prev => prev.filter(a => a.id !== newId));
                  }, 6000);
                }
              }
            }
          },
          onerror: () => cleanup(),
          onclose: () => cleanup()
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      cleanup();
    }
  };

  const stopListening = () => cleanup();

  return (
    <div className="flex flex-col gap-6 p-4">
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

      <div className={`min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 rounded-[3rem] border-8 transition-all duration-500 shadow-2xl ${soundAlerts.length > 0 ? 'bg-red-500 border-red-700' : 'bg-white border-yellow-200'}`}>
        {soundAlerts.length > 0 ? (
          soundAlerts.map(alert => (
            <div key={alert.id} className="flex flex-col items-center text-center animate-in zoom-in">
              <TriangleAlert size={100} className="text-white mb-4" />
              <div className="text-6xl font-black text-white uppercase italic tracking-tighter drop-shadow-md">
                {alert.text.replace(/[\[\]]/g, '')}
              </div>
            </div>
          ))
        ) : (
          <p className="text-2xl font-black text-slate-300 uppercase italic">Environment Quiet</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <AccessibleButton onClick={isListening ? stopListening : startListening} variant={isListening ? 'danger' : 'primary'}>
          {isListening ? <MicOff size={32} /> : <BellRing size={32} />}
          {isListening ? 'Stop Monitoring' : 'Start Monitoring'}
        </AccessibleButton>
      </div>
    </div>
  );
};

export default SoundAlerts;
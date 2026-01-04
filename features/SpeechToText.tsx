
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Type, History } from 'lucide-react';
import AccessibleButton from '../components/AccessibleButton';
import { encode } from '../services/audio';

const SpeechToText: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

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
          inputAudioTranscription: {},
          systemInstruction: 'You are a professional live transcription assistant. Your only job is to accurately transcribe spoken words into text in real-time. Do not add commentary or environmental descriptions.'
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
            if (msg.serverContent?.inputTranscription?.text) {
              setTranscription(prev => prev + ' ' + msg.serverContent!.inputTranscription!.text);
            }

            if (msg.serverContent?.turnComplete) {
              setTranscription(prev => {
                const trimmed = prev.trim();
                if (trimmed) {
                  setHistory(h => [trimmed, ...h].slice(0, 5));
                }
                return '';
              });
            }
          },
          onerror: (e) => {
            console.error("Gemini Live Error", e);
            cleanup();
          },
          onclose: () => {
            cleanup();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start STT", err);
      cleanup();
    }
  };

  const stopListening = () => {
    cleanup();
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="bg-yellow-100 p-8 rounded-3xl border-4 border-yellow-400 min-h-[300px] flex flex-col justify-between shadow-inner">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-black text-yellow-700 flex items-center gap-2">
            <Type size={28} /> SPEECH TO TEXT
          </h3>
          {isListening && (
            <div className="flex gap-2 items-center bg-white px-3 py-1 rounded-full border-2 border-yellow-500">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div> 
              <span className="text-red-500 text-sm font-black uppercase">Live</span>
            </div>
          )}
        </div>
        
        <p className="text-2xl font-bold leading-relaxed text-slate-800 italic">
          {transcription || (isListening ? "Listening for speech..." : "Press start to begin transcribing.")}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <AccessibleButton 
          onClick={isListening ? stopListening : startListening}
          variant={isListening ? 'danger' : 'primary'}
          className="w-full"
        >
          {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </AccessibleButton>

        {history.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            <h4 className="text-lg font-black flex items-center gap-2 text-slate-500 uppercase">
              <History size={20} /> Past Transcripts
            </h4>
            {history.map((text, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border-2 border-yellow-200 text-lg text-slate-600 shadow-sm">
                {text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeechToText;

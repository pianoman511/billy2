
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { Mic, MicOff, Type, Eraser } from 'lucide-react';
import AccessibleButton from '../components/AccessibleButton';
import { encode } from '../services/audio';

const SpeechToText: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new transcription arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcription]);

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
          inputAudioTranscription: {},
          systemInstruction: 'You are a high-speed verbatim transcription tool. Your ONLY task is to output exactly what you hear in real-time. DO NOT wait for long pauses. DO NOT summarize. DO NOT talk back. Just provide the text as fast as possible.'
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
                // PCM conversion according to Gemini guidelines
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(s => {
                s.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription?.text) {
              const newText = msg.serverContent.inputTranscription.text;
              setTranscription(prev => {
                const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
                return prev + separator + newText;
              });
            }
          },
          onerror: (e) => {
            console.error(e);
            cleanup();
          },
          onclose: () => {
            cleanup();
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      cleanup();
    }
  };

  const stopListening = () => {
    cleanup();
  };

  const clearText = () => {
    setTranscription('');
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div 
        className="bg-yellow-100 p-8 rounded-[3rem] border-8 border-yellow-400 h-[500px] flex flex-col shadow-inner relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-3xl font-black text-yellow-700 flex items-center gap-2 uppercase tracking-tighter">
            <Type size={40} /> LIVE CAPTIONS
          </h3>
          {isListening && (
            <div className="flex items-center gap-3 bg-white px-6 py-2 rounded-full border-4 border-red-500 animate-pulse">
              <div className="w-5 h-5 bg-red-600 rounded-full"></div>
              <span className="text-red-600 font-black text-xl uppercase">Live</span>
            </div>
          )}
        </div>
        
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto pr-4 custom-scrollbar scroll-smooth"
        >
          <p className="text-3xl font-black leading-tight text-slate-800 break-words drop-shadow-sm">
            {transcription || (isListening ? "Waiting for speech..." : "Press START to begin.")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AccessibleButton 
          onClick={isListening ? stopListening : startListening}
          variant={isListening ? 'danger' : 'primary'}
          className="w-full py-12"
        >
          {isListening ? <MicOff size={56} /> : <Mic size={56} />}
          <span className="text-3xl">{isListening ? 'STOP' : 'START'}</span>
        </AccessibleButton>

        <AccessibleButton 
          onClick={clearText}
          variant="secondary"
          className="w-full py-12 border-slate-300"
          disabled={!transcription}
        >
          <Eraser size={56} />
          <span className="text-3xl">CLEAR</span>
        </AccessibleButton>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #fefce8;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #facc15;
          border-radius: 20px;
          border: 5px solid #fefce8;
        }
      `}</style>
    </div>
  );
};

export default SpeechToText;

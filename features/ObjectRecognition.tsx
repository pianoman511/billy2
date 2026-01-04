
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Volume2, Info } from 'lucide-react';
import CameraModule from '../components/CameraModule';
import AccessibleButton from '../components/AccessibleButton';

const ObjectRecognition: React.FC = () => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const identifyObjects = async (base64: string) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            { text: "List the primary objects you see in this image. Keep it brief and clear for someone with visual impairment." }
          ]
        },
      });
      setResult(response.text || "I couldn't identify anything. Please try again.");
    } catch (error) {
      console.error(error);
      setResult("Error identifying objects.");
    } finally {
      setLoading(false);
    }
  };

  const speakResult = async () => {
    if (!result) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `I see: ${result}` }] }],
        config: {
          responseModalities: ['AUDIO' as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const { decode, decodeAudioData } = await import('../services/audio');
        const context = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        const decoded = await decodeAudioData(decode(audioData), context, 24000, 1);
        const source = context.createBufferSource();
        source.buffer = decoded;
        source.connect(context.destination);
        source.start();
      }
    } catch (e) {
      console.error("Speech error", e);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="bg-yellow-200 p-6 rounded-3xl border-4 border-yellow-400 flex items-start gap-4">
        <Info className="text-yellow-800 shrink-0" size={32} />
        <p className="text-xl font-semibold">Point your camera at something and I'll tell you what it is.</p>
      </div>

      <CameraModule 
        onCapture={identifyObjects} 
        isLoading={loading} 
        buttonText="Identify Objects" 
      />

      {result && (
        <div className="bg-white p-8 rounded-3xl border-8 border-yellow-400 shadow-2xl flex flex-col gap-6 animate-bounce-in">
          <h3 className="text-3xl font-black uppercase tracking-widest text-yellow-600">I Detected:</h3>
          <p className="text-4xl font-bold text-slate-800 leading-tight">{result}</p>
          
          <AccessibleButton onClick={speakResult} variant="secondary">
            <Volume2 size={40} />
            Read Out Loud
          </AccessibleButton>
        </div>
      )}
    </div>
  );
};

export default ObjectRecognition;

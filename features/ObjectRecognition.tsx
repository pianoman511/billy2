
import React, { useState } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { Volume2, Info, RefreshCw } from 'lucide-react';
import CameraModule from '../components/CameraModule';
import AccessibleButton from '../components/AccessibleButton';
import { decode, decodeAudioData } from '../services/audio';

const ObjectRecognition: React.FC = () => {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const identifyObjects = async (base64: string) => {
    setLoading(true);
    setResult(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            { text: "Identify the main objects in this image. Output a very short list of the most prominent items only. Example: 'A blue coffee mug and a pair of glasses'." }
          ]
        },
      });
      setResult(response.text || "No objects identified.");
    } catch (error) {
      console.error("Gemini Detection Error:", error);
      setResult("Error identifying objects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const speakResult = async () => {
    if (!result || isSpeaking) return;
    
    setIsSpeaking(true);
    const textToSpeak = `I see: ${result}`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
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
        source.onended = () => {
          setIsSpeaking(false);
          context.close();
        };
        source.start();
      } else {
        setIsSpeaking(false);
      }
    } catch (e) {
      console.error("Object TTS Error:", e);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="bg-yellow-200 p-8 rounded-3xl border-4 border-yellow-400 flex items-start gap-4">
        <Info className="text-yellow-800 shrink-0" size={40} />
        <p className="text-2xl font-black leading-tight">Point your camera at an object and tap IDENTIFY below.</p>
      </div>

      <CameraModule 
        onCapture={identifyObjects} 
        isLoading={loading} 
        buttonText="Identify Objects" 
      />

      {result && (
        <div className="bg-white p-10 rounded-[3rem] border-8 border-yellow-400 shadow-2xl flex flex-col gap-8 animate-fade-in">
          <h3 className="text-2xl font-black uppercase text-yellow-600 tracking-widest">I Detected:</h3>
          <p className="text-5xl font-black text-slate-800 leading-tight">{result}</p>
          
          <AccessibleButton 
            onClick={speakResult} 
            variant="secondary" 
            disabled={isSpeaking}
            className="py-10"
          >
            {isSpeaking ? <RefreshCw className="animate-spin" size={48} /> : <Volume2 size={48} />}
            <span className="text-3xl">{isSpeaking ? 'SPEAKING...' : 'READ OUT LOUD'}</span>
          </AccessibleButton>
        </div>
      )}
    </div>
  );
};

export default ObjectRecognition;

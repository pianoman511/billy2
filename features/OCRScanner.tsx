
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Volume2, FileSearch } from 'lucide-react';
import CameraModule from '../components/CameraModule';
import AccessibleButton from '../components/AccessibleButton';
import { decode, decodeAudioData } from '../services/audio';

const OCRScanner: React.FC = () => {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scanText = async (base64: string) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            { text: "Extract all the text written in this image exactly. If there is no text, say 'No text found'." }
          ]
        },
      });
      setText(response.text || "No text found.");
    } catch (error) {
      console.error(error);
      setText("Error scanning text.");
    } finally {
      setLoading(false);
    }
  };

  const speakText = async () => {
    if (!text) return;
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: ['AUDIO' as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
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
      console.error("Speech error", e);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="bg-yellow-200 p-6 rounded-3xl border-4 border-yellow-400 flex items-start gap-4">
        <FileSearch className="text-yellow-800 shrink-0" size={32} />
        <p className="text-xl font-semibold">Hold your camera over any text (books, signs, menus) and I'll read it for you.</p>
      </div>

      <CameraModule 
        onCapture={scanText} 
        isLoading={loading} 
        buttonText="Read Document" 
      />

      {text && (
        <div className="bg-white p-8 rounded-3xl border-8 border-yellow-400 shadow-2xl flex flex-col gap-6">
          <h3 className="text-2xl font-black uppercase text-yellow-600">Text Found:</h3>
          <div className="max-h-64 overflow-y-auto p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
            <p className="text-3xl font-bold text-slate-800 whitespace-pre-wrap">{text}</p>
          </div>
          
          <AccessibleButton onClick={speakText} variant="secondary">
            <Volume2 size={40} />
            Hear Document
          </AccessibleButton>
        </div>
      )}
    </div>
  );
};

export default OCRScanner;

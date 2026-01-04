
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Volume2, PlayCircle, Eraser } from 'lucide-react';
import AccessibleButton from '../components/AccessibleButton';
import { decode, decodeAudioData } from '../services/audio';

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSpeak = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: ['AUDIO' as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex flex-col gap-4">
        <label className="text-3xl font-black text-yellow-800 uppercase tracking-tight">Type something here:</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type what you want me to say..."
          className="w-full h-64 p-8 text-3xl font-bold rounded-3xl border-8 border-yellow-400 focus:outline-none focus:ring-8 focus:ring-yellow-300 shadow-inner bg-yellow-50"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AccessibleButton onClick={handleSpeak} disabled={loading || !text.trim()}>
          {loading ? <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-black" /> : <PlayCircle size={40} />}
          Speak Text
        </AccessibleButton>
        <AccessibleButton onClick={() => setText('')} variant="secondary" disabled={!text}>
          <Eraser size={40} />
          Clear Everything
        </AccessibleButton>
      </div>

      <div className="bg-white p-8 rounded-3xl border-4 border-yellow-200">
        <h4 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Volume2 className="text-yellow-600" /> QUICK PHRASES
        </h4>
        <div className="flex flex-wrap gap-4">
          {["Hello", "I need help", "Thank you", "Where am I?", "I am hungry", "I am thirsty"].map(phrase => (
            <button
              key={phrase}
              onClick={() => setText(phrase)}
              className="px-6 py-4 bg-yellow-100 border-2 border-yellow-300 rounded-2xl text-xl font-bold hover:bg-yellow-200 transition-colors"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;

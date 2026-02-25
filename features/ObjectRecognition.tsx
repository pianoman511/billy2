
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Volume2, Info, RefreshCw, Eye } from 'lucide-react';
import CameraModule from '../components/CameraModule.tsx';
import AccessibleButton from '../components/AccessibleButton.tsx';

interface ObjectRecognitionProps {
  lang?: 'en' | 'tl';
}

const ObjectRecognition: React.FC<ObjectRecognitionProps> = ({ lang = 'en' }) => {
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
    if (!result) return;
    
    setIsSpeaking(true);
    window.speechSynthesis.cancel();
    
    let textToSpeak = `I see: ${result}`;
    
    if (lang === 'tl') {
      try {
        const aiTranslate = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const translationRes = await aiTranslate.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Translate the following short description of objects into natural Tagalog: "${result}". Output only the translation.`,
        });
        textToSpeak = `Nakikita ko ang: ${translationRes.text || result}`;
      } catch (err) {
        console.error("Translation error", err);
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'tl' ? 'tl-PH' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="bg-white p-5 rounded-2xl shadow-sm flex items-center gap-4">
        <div className="bg-amber-100 p-3 rounded-full text-amber-600">
           <Eye size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-stone-900 uppercase tracking-tight">Vision Tool</h2>
          <p className="text-sm font-medium text-stone-400">Point the camera at something.</p>
        </div>
      </div>

      <div className="w-full">
        <CameraModule 
          onCapture={identifyObjects} 
          isLoading={loading} 
          buttonText="Identify" 
        />
      </div>

      {result && (
        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 text-amber-600">
            <Info size={20} />
            <h3 className="text-xs font-black uppercase tracking-widest">Analysis Result</h3>
          </div>
          <p className="text-2xl font-bold text-stone-800 leading-tight">
            {result}
          </p>
          
          <AccessibleButton 
            onClick={speakResult} 
            variant="secondary" 
            disabled={isSpeaking}
            className="w-full py-5"
          >
            {isSpeaking ? <RefreshCw className="animate-spin" size={24} /> : <Volume2 size={24} />}
            <span className="text-lg font-bold uppercase tracking-widest">{isSpeaking ? 'Speaking...' : 'Listen'}</span>
          </AccessibleButton>
        </div>
      )}
    </div>
  );
};

export default ObjectRecognition;

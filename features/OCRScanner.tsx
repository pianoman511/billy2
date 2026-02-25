
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Volume2, RefreshCw, Type, PlayCircle } from 'lucide-react';
import CameraModule from '../components/CameraModule';
import AccessibleButton from '../components/AccessibleButton';

interface OCRScannerProps {
  lang?: 'en' | 'tl';
}

const OCRScanner: React.FC<OCRScannerProps> = ({ lang = 'en' }) => {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const scanText = async (base64: string) => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
      setText("Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const speakText = async () => {
    if (!text) return;
    setIsSpeaking(true);
    window.speechSynthesis.cancel();
    
    let textToSpeak = text.trim();
    if (lang === 'tl' && textToSpeak !== "No text found.") {
       try {
        const aiTranslate = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const translationRes = await aiTranslate.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Translate the following text into Tagalog: "${textToSpeak}". Output only the translation.`,
        });
        textToSpeak = translationRes.text || textToSpeak;
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 text-stone-400 px-2">
        <Type size={18} />
        <p className="text-sm font-medium">Position text in view to scan and read it aloud.</p>
      </div>

      <CameraModule 
        onCapture={scanText} 
        isLoading={loading} 
        buttonText="Read Text" 
      />

      {text && (
        <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-stone-300 uppercase tracking-widest">Transcription</h3>
            <div className="max-h-64 overflow-y-auto bg-stone-50 p-5 rounded-xl">
              <p className="text-xl font-bold text-stone-800 leading-relaxed whitespace-pre-wrap italic">{text}</p>
            </div>
          </div>
          
          <AccessibleButton onClick={speakText} variant="secondary" disabled={isSpeaking} className="py-5">
            {isSpeaking ? <RefreshCw className="animate-spin" size={24} /> : <PlayCircle size={24} />}
            <span className="text-lg font-bold uppercase tracking-widest">{isSpeaking ? 'Reading...' : 'Speak Text'}</span>
          </AccessibleButton>
        </div>
      )}
    </div>
  );
};

export default OCRScanner;

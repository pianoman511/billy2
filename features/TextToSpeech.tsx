
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Volume2, PlayCircle, Eraser, RefreshCw } from 'lucide-react';
import AccessibleButton from '../components/AccessibleButton';

interface TextToSpeechProps {
  lang?: 'en' | 'tl';
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ lang = 'en' }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSpeak = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    window.speechSynthesis.cancel();
    
    let textToSpeak = text.trim();
    if (lang === 'tl') {
      try {
        const aiTranslate = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const translationRes = await aiTranslate.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Translate the following text into natural sounding Tagalog: "${textToSpeak}". Output only the translation.`,
        });
        textToSpeak = translationRes.text || textToSpeak;
      } catch (err) {
        console.error("Translation error", err);
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = lang === 'tl' ? 'tl-PH' : 'en-US';
    utterance.rate = 0.95;
    utterance.onend = () => setLoading(false);
    utterance.onerror = () => setLoading(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const PHRASES = [
    { category: "Basics", items: [
      { en: "Hello", tl: "Kamusta" },
      { en: "Thank you", tl: "Salamat" },
      { en: "Yes", tl: "Oo" },
      { en: "No", tl: "Hindi" },
      { en: "Please", tl: "Pakiusap" },
      { en: "Excuse me", tl: "Makikiraan po" },
    ]},
    { category: "Daily Needs", items: [
      { en: "I am hungry", tl: "Gutom na ako" },
      { en: "I am thirsty", tl: "Nauuhaw ako" },
      { en: "Where is the bathroom?", tl: "Nasaan ang banyo?" },
      { en: "I need to rest", tl: "Kailangan kong magpahinga" },
      { en: "Please wait", tl: "Sandali lang po" },
    ]},
    { category: "Safety", items: [
      { en: "I need help", tl: "Kailangan ko ng tulong" },
      { en: "I am lost", tl: "Nawawala ako" },
      { en: "Call my family", tl: "Tawagan ang pamilya ko" },
      { en: "I feel unwell", tl: "Masama ang pakiramdam ko" },
      { en: "EMERGENCY!", tl: "EMERGENCY!" },
    ]},
    { category: "Greetings", items: [
      { en: "Good morning", tl: "Magandang umaga" },
      { en: "Good afternoon", tl: "Magandang hapon" },
      { en: "Good evening", tl: "Magandang gabi" },
      { en: "Goodbye", tl: "Paalam" },
    ]}
  ];

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
          {loading ? <RefreshCw className="animate-spin" size={40} /> : <PlayCircle size={40} />}
          {loading ? 'Thinking...' : 'Speak Text'}
        </AccessibleButton>
        <AccessibleButton onClick={() => { setText(''); window.speechSynthesis.cancel(); }} variant="secondary" disabled={!text}>
          <Eraser size={40} />
          Clear Everything
        </AccessibleButton>
      </div>

      <div className="bg-white p-8 rounded-3xl border-4 border-yellow-200">
        <h4 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Volume2 className="text-yellow-600" /> QUICK PHRASES
        </h4>
        
        <div className="space-y-8">
          {PHRASES.map(group => (
            <div key={group.category}>
              <h5 className="text-sm font-black text-stone-400 uppercase tracking-[0.2em] mb-3">{group.category}</h5>
              <div className="flex flex-wrap gap-3">
                {group.items.map(phraseObj => (
                  <button
                    key={phraseObj.en}
                    onClick={() => setText(lang === 'tl' ? phraseObj.tl : phraseObj.en)}
                    className="px-6 py-4 bg-yellow-50 border-2 border-yellow-200 rounded-2xl text-xl font-bold hover:bg-yellow-100 transition-colors active:scale-95 text-stone-700"
                  >
                    {lang === 'tl' ? phraseObj.tl : phraseObj.en}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;

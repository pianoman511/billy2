import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, CameraOff, FlipHorizontal } from 'lucide-react';
import AccessibleButton from './AccessibleButton.tsx';

interface CameraModuleProps {
  onCapture: (base64Image: string) => void;
  isLoading: boolean;
  buttonText: string;
  className?: string;
}

const CameraModule: React.FC<CameraModuleProps> = ({ onCapture, isLoading, buttonText, className = "" }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      if (!isActive) return;
      try {
        // Request portrait-oriented dimensions
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode,
            width: { ideal: 720 },
            height: { ideal: 1280 }
          } 
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setHasPermission(true);
      } catch (err) {
        setHasPermission(false);
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isActive, facingMode]);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    onCapture(base64);
  };

  if (hasPermission === false) {
    return (
      <div className="p-8 text-center bg-stone-100 rounded-2xl border border-stone-200">
        <h2 className="text-xl font-bold text-stone-800 mb-2 uppercase">Camera Disabled</h2>
        <p className="text-stone-500 font-medium">Please allow camera access in settings.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 items-center w-full ${className}`}>
      {/* Changed aspect-video to aspect-[3/4] for Portrait Mode */}
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-stone-900 shadow-lg transition-all duration-300">
        {isActive ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-500 p-8 text-center bg-stone-100">
            <CameraOff size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold uppercase tracking-tighter">Camera Off</p>
          </div>
        )}
        
        {isLoading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
               <RefreshCw className="animate-spin text-amber-500" size={40} />
               <span className="text-stone-900 text-sm font-black uppercase tracking-widest">Analyzing...</span>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="grid grid-cols-2 gap-3 w-full">
        <AccessibleButton onClick={() => setIsActive(!isActive)} variant={isActive ? 'danger' : 'success'} className="py-4">
          {isActive ? <CameraOff size={24} /> : <Camera size={24} />}
          <span className="text-base uppercase">Off</span>
        </AccessibleButton>
        <AccessibleButton onClick={() => setFacingMode(p => p === 'environment' ? 'user' : 'environment')} variant="secondary" className="py-4" disabled={!isActive}>
          <FlipHorizontal size={24} />
          <span className="text-base uppercase">Flip</span>
        </AccessibleButton>
      </div>

      <AccessibleButton onClick={handleCapture} disabled={isLoading || !isActive} className="w-full py-6 shadow-sm active:translate-y-1">
        {isLoading ? <RefreshCw className="animate-spin" size={32} /> : <Camera size={32} />}
        <span className="text-xl">{buttonText}</span>
      </AccessibleButton>
    </div>
  );
};

export default CameraModule;
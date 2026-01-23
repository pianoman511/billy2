import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, CameraOff, FlipHorizontal } from 'lucide-react';
import AccessibleButton from './AccessibleButton.tsx';

interface CameraModuleProps {
  onCapture: (base64Image: string) => void;
  isLoading: boolean;
  buttonText: string;
}

const CameraModule: React.FC<CameraModuleProps> = ({ onCapture, isLoading, buttonText }) => {
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
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
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
      <div className="p-8 text-center bg-stone-100 rounded-2xl">
        <h2 className="text-xl font-bold text-stone-800 mb-2">Camera access denied</h2>
        <p className="text-stone-500">Enable camera permissions to use vision tools.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 items-center w-full">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-stone-900 shadow-lg">
        {isActive ? (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-600 p-8 text-center">
            <CameraOff size={48} className="mb-4 opacity-30" />
            <p className="text-lg font-bold">Standby</p>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-amber-400"></div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      <div className="grid grid-cols-2 gap-3 w-full">
        <AccessibleButton onClick={() => setIsActive(!isActive)} variant={isActive ? 'danger' : 'success'} className="py-3">
          {isActive ? <CameraOff size={20} /> : <Camera size={20} />}
          <span className="text-sm font-bold uppercase tracking-wider">{isActive ? 'Off' : 'On'}</span>
        </AccessibleButton>
        <AccessibleButton onClick={() => setFacingMode(p => p === 'environment' ? 'user' : 'environment')} variant="secondary" className="py-3" disabled={!isActive}>
          <FlipHorizontal size={20} />
          <span className="text-sm font-bold uppercase tracking-wider">Flip</span>
        </AccessibleButton>
      </div>
      <AccessibleButton onClick={handleCapture} disabled={isLoading || !isActive} className="w-full py-6">
        {isLoading ? <RefreshCw className="animate-spin" size={24} /> : <Camera size={24} />}
        <span className="text-xl">{buttonText}</span>
      </AccessibleButton>
    </div>
  );
};

export default CameraModule;
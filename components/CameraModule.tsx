
import React, { useRef, useEffect, useState } from 'react';
import { Camera, RefreshCw, CameraOff, FlipHorizontal } from 'lucide-react';
import AccessibleButton from './AccessibleButton';

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
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: facingMode } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasPermission(true);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasPermission(false);
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
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

  const toggleCamera = () => {
    setIsActive(!isActive);
  };

  const flipCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  if (hasPermission === false) {
    return (
      <div className="p-8 text-center bg-red-100 rounded-3xl border-4 border-red-500">
        <h2 className="text-3xl font-bold mb-4">Camera access denied</h2>
        <p className="text-xl">Please enable camera permissions in your browser settings to use this feature.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 items-center w-full">
      <div className="relative w-full max-w-2xl aspect-video rounded-3xl overflow-hidden border-8 border-yellow-400 bg-black">
        {isActive ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-yellow-400 p-8 text-center">
            <CameraOff size={80} className="mb-4 opacity-50" />
            <p className="text-2xl font-bold">Camera is Off</p>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-8 border-yellow-400"></div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        <AccessibleButton 
          onClick={toggleCamera} 
          variant={isActive ? 'danger' : 'success'}
          className="w-full"
        >
          {isActive ? <CameraOff size={32} /> : <Camera size={32} />}
          {isActive ? 'Stop Camera' : 'Start Camera'}
        </AccessibleButton>
        
        <AccessibleButton 
          onClick={flipCamera} 
          variant="secondary"
          className="w-full"
          disabled={!isActive}
        >
          <FlipHorizontal size={32} />
          Flip Camera
        </AccessibleButton>
      </div>

      <AccessibleButton 
        onClick={handleCapture} 
        disabled={isLoading || !isActive}
        className="w-full max-w-2xl"
      >
        {isLoading ? <RefreshCw className="animate-spin" size={40} /> : <Camera size={40} />}
        {buttonText}
      </AccessibleButton>
    </div>
  );
};

export default CameraModule;

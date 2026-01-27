
import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, FlipHorizontal, ZoomIn, ZoomOut } from 'lucide-react';
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
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [zoom, setZoom] = useState<number>(1);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const [canZoom, setCanZoom] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      if (!isActive) return;
      try {
        // Request MAX resolution for better OCR accuracy
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode,
            width: { ideal: 4096 },
            height: { ideal: 4096 }
          } 
        });
        
        if (videoRef.current) videoRef.current.srcObject = stream;
        
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        
        // Detect and initialize zoom capabilities
        const capabilities = track.getCapabilities() as any;
        if (capabilities && capabilities.zoom) {
          setCanZoom(true);
          const min = capabilities.zoom.min || 1;
          const max = capabilities.zoom.max || 1;
          const step = capabilities.zoom.step || 0.1;
          
          setZoomRange({ min, max, step });
          // Ensure we start at the minimum zoom (NOT zoomed in)
          setZoom(min);
          await track.applyConstraints({ advanced: [{ zoom: min }] as any });
        } else {
          setCanZoom(false);
          setZoom(1);
        }

        setHasPermission(true);
      } catch (err) {
        console.error("Camera error:", err);
        setHasPermission(false);
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [isActive, facingMode]);

  const applyZoom = async (newZoom: number) => {
    if (!trackRef.current || !canZoom) return;
    try {
      const clampedZoom = Math.min(Math.max(newZoom, zoomRange.min), zoomRange.max);
      await trackRef.current.applyConstraints({
        advanced: [{ zoom: clampedZoom }] as any
      });
      setZoom(clampedZoom);
    } catch (err) {
      console.error("Failed to apply zoom:", err);
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !isActive) return;
    const context = canvasRef.current.getContext('2d');
    if (!context) return;
    
    // Capture at the video's actual resolution
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.95).split(',')[1];
    onCapture(base64);
  };

  if (hasPermission === false) {
    return (
      <div className="p-8 text-center bg-stone-100 rounded-2xl border border-stone-200">
        <h2 className="text-xl font-bold text-stone-800 mb-2 uppercase tracking-tight">Camera Disabled</h2>
        <p className="text-stone-500 font-medium">Enable camera access in settings to use vision tools.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 items-center w-full ${className}`}>
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-stone-900 shadow-xl border-4 border-white transition-all duration-300">
        {isActive ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 p-8 text-center bg-stone-100">
            <CameraOff size={48} className="mb-4 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest">Camera Inactive</p>
          </div>
        )}
        
        {/* Status Overlay */}
        {isActive && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
              HD Mode
            </div>
            {canZoom && (
              <div className="bg-amber-500/80 backdrop-blur-md px-3 py-1 rounded-lg text-stone-900 text-[10px] font-black uppercase tracking-widest shadow-sm">
                {zoom.toFixed(1)}x
              </div>
            )}
            {isLoading && (
               <div className="bg-white px-3 py-1 rounded-lg text-stone-900 text-[10px] font-black uppercase tracking-widest animate-pulse">
                Analyzing...
              </div>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Control Panel */}
      <div className="w-full flex flex-col gap-3">
        {isActive && canZoom && (
          <div className="grid grid-cols-2 gap-3 w-full">
            <AccessibleButton 
              onClick={() => applyZoom(zoom - (zoomRange.step * 8))} 
              variant="secondary" 
              className="py-6 border-2 border-stone-200"
              disabled={zoom <= zoomRange.min}
            >
              <ZoomOut size={32} />
              <span className="text-base uppercase font-black">Zoom Out</span>
            </AccessibleButton>
            <AccessibleButton 
              onClick={() => applyZoom(zoom + (zoomRange.step * 8))} 
              variant="secondary" 
              className="py-6 border-2 border-stone-200"
              disabled={zoom >= zoomRange.max}
            >
              <ZoomIn size={32} />
              <span className="text-base uppercase font-black">Zoom In</span>
            </AccessibleButton>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 w-full">
          <AccessibleButton onClick={() => setIsActive(!isActive)} variant={isActive ? 'danger' : 'success'} className="py-4">
            {isActive ? <CameraOff size={24} /> : <Camera size={24} />}
            <span className="text-sm font-black uppercase tracking-widest">{isActive ? 'Turn Off' : 'Turn On'}</span>
          </AccessibleButton>
          <AccessibleButton onClick={() => setFacingMode(p => p === 'environment' ? 'user' : 'environment')} variant="secondary" className="py-4" disabled={!isActive}>
            <FlipHorizontal size={24} />
            <span className="text-sm font-black uppercase tracking-widest">Switch</span>
          </AccessibleButton>
        </div>

        <AccessibleButton 
          onClick={handleCapture} 
          disabled={isLoading || !isActive} 
          className={`w-full py-10 shadow-lg active:translate-y-1 rounded-[2rem] transition-colors ${isLoading ? 'bg-stone-300 border-b-8 border-stone-400' : 'bg-amber-400 border-b-8 border-amber-600 hover:bg-amber-300'}`}
        >
          <Camera size={48} className={isLoading ? 'opacity-30' : ''} />
          <span className="text-3xl font-black uppercase tracking-tighter">
            {isLoading ? 'WORKING...' : buttonText}
          </span>
        </AccessibleButton>
      </div>
    </div>
  );
};

export default CameraModule;

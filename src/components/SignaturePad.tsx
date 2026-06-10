import { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check } from 'lucide-react';

interface SignaturePadProps {
  label: string;
  onChange: (base64: string) => void;
  placeholderText?: string;
}

export default function SignaturePad({ label, onChange, placeholderText = 'เซ็นชื่อที่นี่ (Sign Here)' }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas resolution for crisp lines
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Default styling
    ctx.strokeStyle = '#1e293b'; // slate-800
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let lastWidth = 0;
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      const currentWidth = Math.floor(rect?.width || 300);
      if (currentWidth === lastWidth) return;
      lastWidth = currentWidth;
      
      canvas.width = currentWidth;
      canvas.height = 140;
      
      // Keep brush properties after resize
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    // Support both Touch and Mouse coordinates
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    // Save image to callback on stroke end
    saveSignature();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange('');
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  return (
    <div className="w-full flex flex-col space-y-1.5" id={`sig-container-${label.replace(/\s+/g, '-').toLowerCase()}`}>
      <label className="text-sm font-medium text-slate-700 block">{label}</label>
      
      <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 overflow-hidden h-36">
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 select-none text-xs font-mono">
            {placeholderText}
          </div>
        )}
        
        <canvas
          id={`canvas-${label.replace(/\s+/g, '-').toLowerCase()}`}
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        />

        <div className="absolute bottom-2 right-2 flex space-x-1">
          <button
            type="button"
            id={`btn-clear-${label.replace(/\s+/g, '-').toLowerCase()}`}
            onClick={clearCanvas}
            className="p-1 text-slate-500 hover:text-rose-600 bg-white rounded-full border border-slate-200 shadow-sm transition hover:bg-slate-100 cursor-pointer"
            title="ล้างลายเซ็น"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

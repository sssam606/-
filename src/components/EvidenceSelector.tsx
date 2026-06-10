import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, AlertTriangle } from 'lucide-react';

interface EvidenceSelectorProps {
  onChange: (base64: string) => void;
}

export default function EvidenceSelector({ onChange }: EvidenceSelectorProps) {
  const [preview, setPreview] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compress image to a sensible size (e.g. max width 500px, 0.7 JPEG compression)
  const compressImage = (src: string, callback: (compressed: string) => void) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const maxDim = 500;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        callback(compressedBase64);
      } else {
        callback(src);
      }
    };
    img.src = src;
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      compressImage(dataUrl, (compressed) => {
        setPreview(compressed);
        onChange(compressed);
      });
    };
    reader.readAsDataURL(file);
  };

  const onDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const startCamera = async () => {
    try {
      setCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Error viewing camera: ', err);
      // Fallback
      alert('ไม่สามารถเปิดใช้งานกล้องวิดีโอได้โดยตรงผ่านเว็บ (เนื่องจากความปลอดภัยของเบราว์เซอร์) แนะนำให้กดปุ่ม "อัปโหลด" แล้วเลือกตัวเลือก "กล้องถ่ายรูป" ของมือถือโดยตรงแทน ซึ่งจะใช้งานได้ 100%');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(-1, 1); // Flip horizontal if front camera, but standard facingMode is environment.
        // Draw the image
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        compressImage(dataUrl, (compressed) => {
          setPreview(compressed);
          onChange(compressed);
          stopCamera();
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deletePhoto = () => {
    setPreview('');
    onChange('');
    stopCamera();
  };

  return (
    <div className="w-full flex flex-col space-y-1.5" id="evidence-selector-wrapper">
      <label className="text-sm font-medium text-slate-700 block">แนบหลักฐาน (Evidence Photo)</label>
      
      {!preview && !cameraActive && (
        <label
          htmlFor="evidence-file-input"
          onDragEnter={onDrag}
          onDragOver={onDrag}
          onDragLeave={onDrag}
          onDrop={onDrop}
          className={`h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-2 p-4 cursor-pointer transition ${
            dragActive
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:border-slate-400'
          }`}
          id="evidence-drop-zone"
        >
          <Upload className="w-8 h-8 text-slate-400" />
          <div className="text-center">
            <span className="text-sm font-semibold text-blue-600">คลิกเพื่ออัปโหลด</span>
            <span className="text-sm text-slate-500"> หรือลากรูปภาพหลักฐานมาวางที่นี่</span>
          </div>
          <span className="text-xs text-slate-400">รองรับไฟล์ GIF, PNG, JPG (ระบบย่อขนาดไฟล์อัตโนมัติ)</span>
          
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              startCamera();
            }}
            className="mt-2 flex items-center space-x-1.5 px-3 py-1 bg-white text-blue-600 rounded-lg border border-blue-200 text-xs font-semibold shadow-sm hover:bg-blue-50 active:bg-blue-100 cursor-pointer transition select-none"
            id="btn-active-camera"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>จับภาพผ่านกล้อง (Camera)</span>
          </button>
        </label>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelectChange}
        accept="image/*"
        className="hidden"
        id="evidence-file-input"
      />

      {cameraActive && (
        <div className="relative rounded-lg bg-black overflow-hidden h-60 flex flex-col items-center justify-center group" id="camera-viewer">
          <video
            ref={videoRef}
            className="w-full h-full object-cover select-none pointer-events-none"
            playsInline
            muted
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3 z-10">
            <button
              type="button"
              onClick={capturePhoto}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-md border border-blue-500 hover:bg-blue-700 transition cursor-pointer"
              id="btn-capture"
            >
              ถ่ายรูป (Capture)
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold shadow-md border border-slate-700 hover:bg-slate-900 transition cursor-pointer"
              id="btn-cancel-camera"
            >
              ยกเลิก (Cancel)
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="relative border border-slate-300 rounded-lg bg-slate-50 overflow-hidden h-44 flex items-center justify-center p-2 group" id="evidence-preview-container">
          <img
            src={preview}
            alt="Evidence Infraction Preview"
            className="max-h-full max-w-full rounded object-contain shadow-sm"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-2 right-2 flex space-x-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition duration-150">
            <button
              type="button"
              onClick={deletePhoto}
              className="p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow shadow-slate-400 cursor-pointer transition"
              id="btn-delete-evidence"
              title="ลบหลักฐาน"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
